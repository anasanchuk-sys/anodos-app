(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=globalThis.ANODOS_CONTRACT_REVIEW_CONFIG,crypt=globalThis.AnodosReviewCrypto,key='anodos-osint-session-v1';
  let transport=null,capability='',polling=false,busy=false,result=null,selected='',generation=0,accessPassword='';
  const showError=e=>{$('error').textContent=e.message||String(e);$('error').hidden=false;};
  function setBusy(value,message){busy=value;$('search').disabled=value;$('website-run').disabled=value;$('research').disabled=value||!selected;$('query').disabled=value;$('status-box').hidden=!message;$('status-text').textContent=message||'';$('cancel').hidden=!value;$('reset-session').hidden=value||(!transport&&!$('error').textContent);}
  function save(value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}}
  async function client(saved){
    if(!crypto?.subtle||!crypt||!config?.macPublicKey)throw new Error('Оновіть сторінку у сучасному браузері з HTTPS.');
    let data=saved;
    if(!data){
      const secret=crypto.getRandomValues(new Uint8Array(32));const rsa=await crypto.subtle.importKey('jwk',config.macPublicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
      data={sid:crypt.hex(16),secret:crypt.b64(secret),wrapped:crypt.b64(new Uint8Array(await crypto.subtle.encrypt({name:'RSA-OAEP'},rsa,secret))),created:Date.now(),keyId:config.macKeyId};
    }
    const pair=await crypt.keys(crypt.bytes(data.secret));
    return {data,async rpc(input){
      const envelope=await crypt.seal(pair.request,{...input,...(capability?{capability}:{})},{v:crypt.version,keyId:data.keyId,sid:data.sid,rid:crypt.hex(16),wrapped:data.wrapped},'request');
      // Retry the exact envelope after a lost acknowledgement: server replay cache
      // makes mutations idempotent, including starting a paid/resource-limited job.
      let last;
      for(let attempt=0;attempt<3;attempt++){
        try{
          const response=await fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),signal:AbortSignal.timeout(30000),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
          if(!response.ok){const body=await response.json().catch(()=>({}));const err=new Error(body.error||'Сервер Anodos зараз недоступний. Спробуйте пізніше.');err.retry=[429,502,503,504].includes(response.status);throw err;}
          const reply=await response.json();if(reply.sid!==data.sid||reply.rid!==envelope.rid||reply.keyId!==data.keyId)throw new Error('Невідповідна захищена відповідь.');
          const decoded=await crypt.open(pair.response,reply,'response');if(!decoded.ok)throw new Error(decoded.error||'Запит не виконано.');return decoded.value;
        }catch(e){last=e;if(attempt===2||(!e.retry&&!['TimeoutError','TypeError'].includes(e.name)))throw e;await new Promise(r=>setTimeout(r,1500*(attempt+1)));}
      }throw last;
    }};
  }
  async function connect(){
    if(transport)return;
    if(!accessPassword)throw new Error('Введіть пароль для доступу до інструмента.');
    const t=await client();const opened=await t.rpc({op:'open',kind:'osint',privacyVersion:'anodos-osint-public-v1',password:accessPassword});capability=opened.capability;transport=t;save({...t.data,capability,query:$('query').value});
  }
  function check(){if(!$('consent').checked){$('consent').reportValidity();return false;}if(!$('query').reportValidity())return false;return true;}
  const el=(tag,content,cls)=>{const node=document.createElement(tag);if(content!==undefined)node.textContent=String(content).replace(/[\u2010-\u2015]/g,'-');if(cls)node.className=cls;return node;};
  function candidates(rows){
    $('candidates').replaceChildren();$('selection').hidden=false;selected='';
    if(!rows.length){$('candidates').append(el('p','Назву не знайдено у джерелі пошуку. Додайте сайт компанії або уточніть назву.','hint'));$('website-details').open=true;}
    rows.forEach(row=>{
      const label=el('label',undefined,'candidate'),radio=el('input'),copy=el('span');radio.type='radio';radio.name='candidate';radio.value=row.id;
      radio.addEventListener('change',()=>{selected=row.id;$('research').disabled=busy;});
      copy.append(el('strong',row.name),el('small',row.description));const link=el('a','Відкрити джерело');link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';copy.append(link);label.append(radio,copy);$('candidates').append(label);
    });$('research').disabled=true;
  }
  function renderReport(report){
    if(report.qualityChecked!==true)throw new Error('Звіт ще не пройшов контроль змісту. Почніть нове дослідження після оновлення сервісу.');
    report={...report,gaps:AnodosOsintReport.gaps(report)};
    result=report;$('result').hidden=false;$('selection').hidden=true;$('result-title').textContent=report.name;$('result-meta').textContent=`${report.sources.length} джерел · ${report.findings.length} висновків із цитатами · ${new Date(report.createdAt).toLocaleDateString('uk-UA')}`;
    const content=$('report-content');content.replaceChildren();content.append(el('p','Попередній аналіз. Наявність цитати підтверджує текст джерела; висновки й актуальність відомостей потребують перевірки.','hint'));
    for(const [id,title]of report.sections){content.append(el('h3',title));const rows=report.findings.filter(f=>f.section===id);if(!rows.length)content.append(el('p','Недостатньо підтверджених відомостей.','hint'));
      rows.forEach(f=>{const box=el('article',undefined,'finding');box.append(el('span',f.status==='inference'?'Аналітичне припущення':'Твердження джерела',f.status==='inference'?'label inference':'label'),el('p',f.statement),el('p',f.timeNote||'Дата актуальності відомостей не встановлена.','hint'));const details=el('details');details.append(el('summary','Цитати та джерела'));f.evidence.forEach(e=>{const s=report.sources.find(s=>s.id===e.sourceId);if(e.quote)details.append(el('blockquote',e.quote+(e.shortened?'…':'')));if(s){const a=el('a',`[${s.id}] ${s.title}`);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}});box.append(details);content.append(box);});
    }
    content.append(el('h3','Що залишилося перевірити'));const gaps=el('ul');report.gaps.forEach(g=>gaps.append(el('li',g)));content.append(gaps);
    const info=el('details');info.append(el('summary','Межі дослідження та недоступні джерела'),el('p',report.coverage,'hint'));report.unavailable.forEach(s=>info.append(el('p',`${s.url}: ${s.reason}`,'hint')));content.append(info);
    if(transport)save({...transport.data,capability,query:$('query').value,report});
  }
  async function poll(){
    if(polling)return;polling=true;const own=generation;
    try{while(own===generation){const state=await transport.rpc({op:'status'});if(own!==generation)return;
      if(state.state==='done'){setBusy(false,'Дослідження завершено. PDF готовий до завантаження.');renderReport(state.result);return;}
      if(state.state==='selection'){setBusy(false,'');candidates(state.candidates||[]);return;}
      if(['error','cancelled'].includes(state.state)){setBusy(false,'');throw new Error(state.error||'Дослідження зупинено.');}
      if(state.state==='ready'){setBusy(false,'');return;}
      setBusy(true,state.progress?.message||'Дослідження триває');await new Promise(r=>setTimeout(r,4000));
    }}catch(e){setBusy(false,'');showError(e);}finally{polling=false;}
  }
  $('search-form').addEventListener('submit',async event=>{event.preventDefault();if(busy||!check())return;if(result){transport=null;capability='';result=null;sessionStorage.removeItem(key);}$('error').hidden=true;$('selection').hidden=true;$('result').hidden=true;try{setBusy(true,'Підключаюся до сервісу Anodos');await connect();await transport.rpc({op:'search',query:$('query').value});await poll();}catch(e){setBusy(false,'');showError(e);}});
  async function start(id){if(busy||!check())return;$('error').hidden=true;try{const website=$('website').value.trim();if(website&&!/^https:\/\//i.test(website))throw new Error('Вкажіть HTTPS-адресу сайту.');if(id==='website'&&!website)throw new Error('Додайте сайт компанії.');setBusy(true,'Готую дослідження');await connect();await transport.rpc({op:'research',candidateId:id,website,name:$('query').value});await poll();}catch(e){setBusy(false,'');showError(e);}}
  $('research').addEventListener('click',()=>start(selected));$('website-run').addEventListener('click',()=>start('website'));
  $('cancel').addEventListener('click',async()=>{try{await transport.rpc({op:'cancel'});}catch(e){showError(e);}});
  $('download').addEventListener('click',async()=>{const button=$('download');button.disabled=true;try{const blob=await AnodosOsintReport.blob(result),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=`Anodos_OSINT_${result.name.replace(/[^\p{L}\p{N} _.-]/gu,'_').slice(0,80)}.pdf`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){showError(e);}finally{button.disabled=false;}});
  function reset(){generation++;transport=null;capability='';result=null;selected='';sessionStorage.removeItem(key);$('result').hidden=true;$('selection').hidden=true;$('error').hidden=true;$('error').textContent='';setBusy(false,'');$('query').focus();}
  $('new-search').addEventListener('click',reset);$('reset-session').addEventListener('click',reset);
  $('access-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('access-submit');if(button.disabled||!$('access-form').reportValidity())return;
    button.disabled=true;$('access-error').hidden=true;$('access-status').hidden=false;$('access-status').textContent='Перевіряю пароль';
    const password=$('access-password').value;let saved;try{saved=JSON.parse(sessionStorage.getItem(key));}catch{}
    if(saved&&(Date.now()-saved.created>4*3600000||saved.keyId!==config?.macKeyId))saved=null;
    try{
      capability=saved?.capability||'';const t=await client(saved);
      const opened=await t.rpc({op:'open',kind:'osint',privacyVersion:'anodos-osint-public-v1',password});
      transport=t;capability=opened.capability;accessPassword=password;$('access-password').value='';
      $('query').value=saved?.query||'';save({...t.data,capability,query:$('query').value,...(saved?.report?{report:saved.report}:{})});
      $('access-gate').hidden=true;$('private-tool').hidden=false;$('query').focus();
      if(saved?.report){try{renderReport(saved.report);}catch(e){sessionStorage.removeItem(key);showError(e);}}
      else if(saved){setBusy(true,'Відновлюю стан дослідження');await poll();}
    }catch(e){transport=null;capability='';accessPassword='';$('access-error').textContent=e.message||'Не вдалося перевірити пароль.';$('access-error').hidden=false;$('access-password').select();}
    finally{button.disabled=false;$('access-status').hidden=true;}
  });
  // A restored browser-history page must show the gate again, including cached reports.
  window.addEventListener('pagehide',()=>{accessPassword='';$('access-password').value='';$('private-tool').hidden=true;$('access-gate').hidden=false;});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();
