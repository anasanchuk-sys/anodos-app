(function (scope) {
  'use strict';
  const fields = [
    ['insurer', 'Страховик'], ['insured', 'Страхувальник'], ['product', 'Вид страхування'],
    ['object', 'Об’єкт страхування'], ['territory', 'Територія'], ['period', 'Строк страхування'],
    ['sumInsured', 'Страхова сума'], ['coverage', 'Покриття'], ['exclusions', 'Виключення'],
    ['deductible', 'Франшиза'], ['premium', 'Страхова премія'], ['rate', 'Тариф'],
    ['limits', 'Ліміти'], ['paymentTerms', 'Порядок оплати'], ['validity', 'Чинність пропозиції'],
    ['subjectivities', 'Умови та застереження']
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const empty = () => ({clientName:'',title:'Котирування страхування',pasted:'',files:[],documents:[],intakeWarnings:[],warnings:[],report:null});
  let state=empty(),host=null,readDocument=null,transport=null,capability='',expiresAt=0,expiryTimer=null,busy=false,receiving=false,status='',error='',generation=0,confirmed=false;
  const attached=new WeakSet();
  let dragAttached=false;
  let requestQueue=Promise.resolve();
  function authorized(){return Boolean(transport&&capability&&Date.now()<expiresAt);}
  function active(){return host?.isConnected && host.querySelector('[data-quotation-root]');}
  function update(){if(active())render();}
  function locked(){clearTimeout(expiryTimer);expiryTimer=null;transport=null;capability='';expiresAt=0;state=empty();confirmed=false;busy=false;receiving=false;status='';error='';generation++;}
  function leave(){if(!transport&&!busy&&!state.files.length&&!state.pasted&&!state.report)return;const prior=transport,cap=capability;locked();if(prior&&cap)void rpcWith(prior,{op:'close',capability:cap}).catch(()=>{});}
  async function rpcWith(client,input){
    const work=async()=>{
      const envelope=await client.request(input);
      for(let attempt=0;attempt<2;attempt++){
        try{
          const config=scope.ANODOS_CONTRACT_REVIEW_CONFIG;
          const response=await scope.fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
          if(!response.ok){const value=await response.json().catch(()=>({}));throw new Error(value.error||'Сервіс Anodos зараз недоступний. Повторіть пізніше.');}
          const value=await client.response(await response.json(),envelope);
          if(!value.ok)throw new Error(value.error||'Не вдалося виконати запит.');
          return value.value;
        }catch(e){if(attempt||!['TypeError','TimeoutError'].includes(e.name))throw e;}
      }
    };
    const result=requestQueue.then(work,work);requestQueue=result.catch(()=>{});return result;
  }
  async function rpc(input){if(!authorized())throw new Error('Час доступу минув. Введіть пароль ще раз.');return rpcWith(transport,{...input,capability});}
  async function unlock(password){
    if(busy)return;const own=++generation;busy=true;error='';status='Перевіряю пароль';update();
    try{
      const config=scope.ANODOS_CONTRACT_REVIEW_CONFIG;
      if(!scope.crypto?.subtle||!config?.macPublicKey||!scope.AnodosReviewCrypto)throw new Error('Відкрийте Anodos через HTTPS і оновіть сторінку.');
      const client=await scope.AnodosReviewCrypto.client(config.macPublicKey,config.macKeyId);
      const opened=await rpcWith(client,{op:'open',kind:'quotation',password});
      if(own!==generation)return;
      if(!opened?.capability)throw new Error('Не вдалося підтвердити приватний доступ.');
      transport=client;capability=opened.capability;expiresAt=Number(opened.expiresAt)||Date.now()+55*60000;status='';
      expiryTimer=setTimeout(()=>{leave();if(active())render();},Math.max(1,expiresAt-Date.now()));
    }catch(e){if(own===generation)error=e.message;}
    finally{password='';if(own===generation){busy=false;update();host?.querySelector(authorized()?'#quotationClient':'#quotationPassword')?.focus();}}
  }
  function readInputs(){
    for(const [id,key]of [['quotationClient','clientName'],['quotationTitle','title'],['quotationPasted','pasted']]){
      const node=host?.querySelector('#'+id);if(node)state[key]=node.value;
    }
  }
  function addFiles(files,{warnings=[],fromDrop=false}={}){
    if(!authorized()||busy)return;readInputs();error='';
    const incoming=Array.from(files||[]),reader=scope.AnodosQuotationMailReader;
    try{
      if(!incoming.length)throw new Error('Outlook не передав вміст листа. Збережіть лист як EML і додайте створений файл.');
      for(const file of incoming){if(!reader?.accepts(file.name))throw new Error(`${file.name}: збережіть лист як EML або PDF.`);if(file.size>20*1024**2)throw new Error('Один файл може мати розмір до 20 МБ.');}
      const next=[...state.files];for(const file of incoming)if(!next.includes(file))next.push(file);
      if(next.length>12||next.reduce((n,f)=>n+f.size,0)>60*1024**2)throw new Error('Додайте до 12 файлів загальним розміром до 60 МБ.');
      state.files=next;state.report=null;confirmed=false;state.intakeWarnings=[...state.intakeWarnings,...warnings];state.warnings=[...state.intakeWarnings];status=fromDrop?`Файли з Outlook додано: ${incoming.length}. Можна збирати котирування.`:'';
    }catch(e){error=e.message;status='';}
    update();
  }
  async function receiveDrop(dataTransfer){
    if(!authorized()||busy)return;readInputs();const own=++generation;
    try{
      // Capture every native item now, while the drop event still owns access.
      const snapshot=scope.AnodosQuotationDrop.capture(dataTransfer);
      receiving=true;busy=true;error='';status='Отримую листи з Outlook';update();
      const result=await scope.AnodosQuotationDrop.resolve(snapshot);
      if(own!==generation||!authorized())return;
      receiving=false;busy=false;addFiles(result.files,{warnings:result.warnings,fromDrop:true});
    }catch(e){if(own===generation){error=e.message;status='';}}
    finally{if(own===generation){receiving=false;busy=false;update();}}
  }
  function handleDrag(event){
    if(!active())return;
    const target=event.target?.nodeType===3?event.target.parentElement:event.target;
    const inZone=target?.closest?.('[data-quotation-dropzone]');
    const types=Array.from(event.dataTransfer?.types||[]).map(value=>String(value).toLowerCase());
    const fileDrag=types.some(type=>type==='files'||type.includes('message')||type.includes('outlook')||type.includes('uri-list'))||Array.from(event.dataTransfer?.items||[]).some(item=>item.kind==='file');
    // Preserve ordinary text editing while accepting native mail/file drops
    // across the whole tool, including its margins and the file input itself.
    if(!fileDrag&&!inZone&&target?.closest?.('textarea,input:not([type=file]),[contenteditable=true]'))return;
    event.preventDefault();event.stopPropagation();
    const zone=host.querySelector('[data-quotation-dropzone]');
    if(event.type==='dragleave'){if(!event.relatedTarget)zone?.classList.remove('quotation-dropzone-active');return;}
    if(event.type==='drop'){
      zone?.classList.remove('quotation-dropzone-active');
      if(!authorized()){error='Спочатку введіть пароль, потім перетягніть листи з Outlook.';update();return;}
      void receiveDrop(event.dataTransfer);return;
    }
    if(authorized()&&!busy)zone?.classList.add('quotation-dropzone-active');
    try{if(event.dataTransfer)event.dataTransfer.dropEffect=authorized()&&!busy?'copy':'none';}catch{/* Some embedded browsers expose a read-only dropEffect. */}
  }
  async function analyze(){
    if(busy||!authorized())return;readInputs();
    if(!state.files.length&&!state.pasted.trim()){error='Додайте листи страховиків або вставте текст умов.';update();return;}
    const own=++generation;busy=true;confirmed=false;state.report=null;error='';status='Читаю листи та вкладення';update();
    try{
      const sources=state.files.length?await scope.AnodosQuotationMailReader.readFiles(state.files,{readDocument,onProgress:value=>{if(own===generation){status=typeof value==='string'?value:value?.name?`Читаю ${Math.min(value.total,value.index+(value.status==='complete'?0:1))} з ${value.total}: ${value.name}`:'Читаю документи';update();}}}):{documents:[],warnings:[]};
      if(own!==generation)return;
      if(state.pasted.trim())sources.documents.push({id:'pasted-conditions',name:'Вставлені умови страховиків',text:state.pasted.trim()});
      if(sources.documents.reduce((n,d)=>n+d.text.length,0)>180000)throw new Error('Листи містять забагато тексту. Розділіть пакет на кілька котирувань.');
      state.documents=sources.documents;state.warnings=[...state.intakeWarnings,...(sources.warnings||[])];
      status='Зіставляю умови страховиків';update();
      await rpc({op:'analyze',documents:state.documents,clientName:state.clientName,title:state.title});
      const deadline=Date.now()+11*60*1000;
      while(own===generation){
        if(Date.now()>deadline)throw new Error('Обробка триває довше очікуваного. Повторіть спробу з меншим пакетом листів.');
        const result=await rpc({op:'status'});if(own!==generation)return;
        if(result.state==='done'){
          if(!Array.isArray(result.result?.offers)||!result.result.offers.length)throw new Error('Не вдалося визначити пропозиції. Перевірте, чи містять листи умови страхування.');
          state.report={...result.result,clientName:state.clientName,title:state.title,documents:state.documents};
          state.report.offers.forEach(o=>{o.selected=true;o.fields=o.fields||{};});
          state.warnings=[...state.warnings,...(result.result.warnings||[])];status='Умови зібрано. Перевірте таблицю та завантажте PDF.';break;
        }
        if(['error','cancelled','closed'].includes(result.state))throw new Error(result.error||'Обробку зупинено.');
        status=result.progress?.message||'Зіставляю умови страховиків';update();await new Promise(resolve=>setTimeout(resolve,2200));
      }
    }catch(e){if(own===generation){error=e.message;status='';}}
    finally{if(own===generation){busy=false;update();}}
  }
  async function cancel(){
    if(!busy||!authorized())return;const onlyReceiving=receiving;++generation;busy=false;receiving=false;status='Обробку зупинено';update();
    if(onlyReceiving)return;
    try{await rpc({op:'cancel'});}catch(e){error=e.message;update();}
  }
  function reportData(){
    const offers=state.report?.offers.filter(o=>o.selected!==false)||[];
    if(!offers.length)throw new Error('Оберіть хоча б одну пропозицію для PDF.');
    return {...state.report,clientName:state.clientName,title:state.title,offers};
  }
  async function download(){
    if(busy||!authorized()||!state.report||!confirmed)return;
    const own=generation;busy=true;error='';status='Створюю PDF';update();
    try{
      const report=reportData();await rpc({op:'status'});if(own!==generation)return;
      const blob=await scope.AnodosQuotationReport.createBlob(report);if(own!==generation||!authorized())return;
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=scope.AnodosQuotationReport.filenameFor(report);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status='PDF котирування завантажено.';
    }
    catch(e){if(own===generation){error=e.message;status='';}}
    finally{if(own===generation){busy=false;update();}}
  }
  function evidence(offer,key){
    const rows=offer.evidence?.[key]||[];if(!rows.length)return '';
    return `<details class="quotation-evidence"><summary>У листі страховика</summary>${rows.map(e=>`<p><strong>${esc(state.documents.find(d=>d.id===e.sourceId)?.name||e.sourceId)}</strong></p><blockquote>${esc(e.quote)}</blockquote>`).join('')}</details>`;
  }
  function resultHtml(){
    if(!state.report)return '';
    return `<section class="quotation-results" aria-labelledby="quotationResultTitle"><div class="quotation-section-head"><div><p class="eyebrow">Котирування</p><h2 id="quotationResultTitle">Умови страховиків</h2></div><span>${state.report.offers.length} пропозиції</span></div>
      <p class="quotation-hint">Виправте поля за потреби. Порожні умови в PDF будуть позначені «Не зазначено».</p>
      ${state.report.offers.map((offer,index)=>`<article class="quotation-offer"><header><h3>${esc(offer.fields.insurer||`Пропозиція ${index+1}`)}</h3><label class="quotation-check"><input type="checkbox" data-quotation-select="${index}" ${offer.selected!==false?'checked':''} ${busy?'disabled':''}/> Додати до PDF</label></header>
        <div class="quotation-fields">${fields.map(([key,label])=>`<div class="quotation-field"><label for="quotation-${index}-${key}">${label}</label><textarea id="quotation-${index}-${key}" data-quotation-field="${key}" data-offer="${index}" rows="${['coverage','exclusions','subjectivities','limits'].includes(key)?4:2}" maxlength="16000" ${busy?'disabled':''} placeholder="Не зазначено">${esc(offer.fields[key])}</textarea>${evidence(offer,key)}</div>`).join('')}</div></article>`).join('')}
      <div class="quotation-download"><label class="quotation-check"><input type="checkbox" data-quotation-confirm ${confirmed?'checked':''} ${busy?'disabled':''}/> Умови перевірено, PDF можна сформувати</label><button class="primary-action" type="button" data-quotation-download ${busy||!confirmed?'disabled':''}>Завантажити котирування PDF</button></div></section>`;
  }
  function render(){
    if(!host)return;const access=authorized();
    host.innerHTML=`<section class="quotation-workspace" data-quotation-root aria-labelledby="quotationWritingTitle"><header class="contract-review-head"><button class="module-back" type="button" data-route="home" aria-label="Назад до страхування">←</button><div><p class="eyebrow">Приватний інструмент</p><h1 id="quotationWritingTitle">Написання котирувань</h1></div>${access?'<button class="secondary-action quotation-lock" type="button" data-quotation-lock>Заблокувати</button>':''}</header>
      ${!access?`<section class="quotation-gate"><h2>Вхід за паролем</h2><p>Цей інструмент є приватним і не призначений для публічного користування.</p><form data-quotation-access><label for="quotationPassword">Пароль</label><input id="quotationPassword" type="password" autocomplete="current-password" required maxlength="256" ${busy?'disabled':''}/><button class="primary-action" type="submit" ${busy?'disabled':''}>Відкрити інструмент</button></form></section>`:
      `<form class="quotation-intake" data-quotation-intake><div class="quotation-section-head"><div><h2>Листи з умовами страхування</h2><p>Додайте пропозиції страховиків. Anodos збере їх в одне котирування.</p></div></div>
      <div class="quotation-fields"><label>Клієнт<input id="quotationClient" maxlength="200" value="${esc(state.clientName)}" placeholder="Назва компанії або клієнта" ${busy?'disabled':''}/></label><label>Назва котирування<input id="quotationTitle" maxlength="200" value="${esc(state.title)}" ${busy?'disabled':''}/></label></div>
      <label class="quotation-dropzone" data-quotation-dropzone><strong>Перетягніть листи безпосередньо з Outlook сюди</strong><span>Один або кілька листів зі списку повідомлень. Або виберіть збережені файли.</span><small>До 12 файлів, 20 МБ кожен. EML, PDF, DOCX, XLSX, TXT, HTML, RTF або зображення.</small><input id="quotationFiles" aria-label="Вибрати листи та вкладення" type="file" multiple accept=".eml,.pdf,.docx,.xlsx,.txt,.html,.htm,.rtf,.png,.jpg,.jpeg,.webp" ${busy?'disabled':''}/></label>
      ${error?`<p class="quotation-error" role="alert">${esc(error)}</p>`:''}${status?`<p class="quotation-status" role="status">${esc(status)}</p>`:''}
      <p class="quotation-hint">Якщо браузер передає лише посилання, збережіть лист з Outlook як EML або перетягніть його спочатку на робочий стіл, а потім сюди.</p>
      ${state.files.length?`<ul class="quotation-files">${state.files.map((file,i)=>`<li><span>${esc(file.name)} <small>${(file.size/1024/1024).toFixed(2)} МБ</small></span><button type="button" class="secondary-action" data-quotation-remove="${i}" ${busy?'disabled':''} aria-label="Видалити ${esc(file.name)}">×</button></li>`).join('')}</ul>`:''}
      <details ${state.pasted?'open':''}><summary>Або вставте текст листа</summary><label class="quotation-pasted">Умови страховиків<textarea id="quotationPasted" rows="7" maxlength="100000" ${busy?'disabled':''} placeholder="Вставте лист разом із назвою страховика та його умовами">${esc(state.pasted)}</textarea></label></details>
      <p class="quotation-hint">Текст листів передається захищеним з’єднанням до приватного сервісу Anodos для обробки. У цьому інструменті листи не зберігаються в архіві.</p>
      <div class="quotation-actions"><button class="primary-action" type="submit" ${busy?'disabled':''}>${state.report?'Оновити котирування':'Зібрати котирування'}</button>${busy?'<button class="secondary-action" type="button" data-quotation-cancel>Скасувати</button>':''}</div></form>`}
      ${!access&&error?`<p class="quotation-error" role="alert">${esc(error)}</p>`:''}${!access&&status?`<p class="quotation-status" role="status">${esc(status)}</p>`:''}
      ${access&&state.warnings.length?`<details class="quotation-warnings" open><summary>Потребує уваги</summary><ul>${[...new Set(state.warnings)].map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`:''}
      ${access?resultHtml():''}</section>`;
  }
  function mount(element,options={}){
    host=element;readDocument=options.readDocument;
    if(!attached.has(element)){
      attached.add(element);
      element.addEventListener('submit',event=>{
        if(event.target.matches('[data-quotation-access]')){event.preventDefault();const password=element.querySelector('#quotationPassword').value;void unlock(password);}
        if(event.target.matches('[data-quotation-intake]')){event.preventDefault();void analyze();}
      });
      element.addEventListener('change',event=>{
        if(event.target.id==='quotationFiles'){addFiles(event.target.files);return;}
        if(event.target.matches('[data-quotation-select]')&&authorized()){state.report.offers[Number(event.target.dataset.quotationSelect)].selected=event.target.checked;confirmed=false;update();}
        if(event.target.matches('[data-quotation-confirm]')&&authorized()){confirmed=event.target.checked;update();}
      });
      element.addEventListener('input',event=>{
        if(!authorized()||busy)return;
        if(event.target.matches('[data-quotation-field]')){state.report.offers[Number(event.target.dataset.offer)].fields[event.target.dataset.quotationField]=event.target.value;confirmed=false;const checkbox=element.querySelector('[data-quotation-confirm]');if(checkbox)checkbox.checked=false;const button=element.querySelector('[data-quotation-download]');if(button)button.disabled=true;}
        else if(['quotationClient','quotationTitle','quotationPasted'].includes(event.target.id)){readInputs();if(event.target.id==='quotationPasted'&&state.report){state.report=null;confirmed=false;update();}}
      });
      element.addEventListener('click',event=>{
        if(event.target.closest('[data-quotation-lock]')){leave();render();return;}
        if(event.target.closest('[data-quotation-cancel]')){void cancel();return;}
        if(event.target.closest('[data-quotation-download]')){void download();return;}
        const button=event.target.closest('[data-quotation-remove]');if(button&&authorized()&&!busy){readInputs();state.files.splice(Number(button.dataset.quotationRemove),1);if(!state.files.length){state.intakeWarnings=[];state.warnings=[];}state.report=null;confirmed=false;status='';update();}
      });
    }
    if(!dragAttached){dragAttached=true;for(const name of ['dragenter','dragover','dragleave','drop'])(scope.document||element).addEventListener(name,handleDrag,true);}
    if(transport&&!authorized())locked();render();
  }
  scope.addEventListener?.('pagehide',()=>{locked();if(active())render();});
  scope.addEventListener?.('pageshow',event=>{if(event.persisted){locked();if(active())render();}});
  scope.AnodosQuotationWriting=Object.freeze({mount,leave});
})(globalThis);
