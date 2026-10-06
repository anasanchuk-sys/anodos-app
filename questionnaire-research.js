(function(scope) {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={found:'Підтверджено джерелом',partial:'[!] Частково підтверджено',unknown:'[?] Потрібно уточнити',conflict:'[!] Суперечливі дані',user:'Внесено вами'};
  const safeURL=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  function apply(template,research) {
    if(research.template){
      const supplied=research.template;
      if(supplied.subject!==template.subject||supplied.profileId!==research.profileId||!Array.isArray(supplied.sections)||!supplied.sections.length||supplied.templateFingerprint!==research.templateFingerprint)throw new Error('Не вдалося перевірити шаблон дослідження.');
      template=JSON.parse(JSON.stringify(supplied));
    }
    if(research.subject!==template.subject||research.profileId!==template.profileId||!Array.isArray(research.answers)||!Array.isArray(research.sources))throw new Error('Отримано результат для іншого опитувальника. Повторіть пошук.');
    const questions=template.sections.flatMap(s=>s.questions);
    const ids=new Set(questions.map(q=>q.id));
    const answers=new Map(research.answers.map(a=>[a.id,a]));
    if(ids.size!==questions.length||answers.size!==research.answers.length||answers.size!==ids.size||[...answers.keys()].some(id=>!ids.has(id)))throw new Error('Перелік відповідей не відповідає повному шаблону. Питання не скорочено.');
    for(const section of template.sections)for(const q of section.questions){
      const a=answers.get(q.id);
      q.answer=typeof a?.value==='string'?a.value:'';q.answerStatus=labels[a?.status]?a.status:'unknown';
      q.selectedOptions=(a?.selectedOptions||[]).filter(o=>q.options?.includes(o));q.evidence=a?.evidence||[];q.answerNote=a?.note||'';q.claims=a?.claims||[];
    }
    template.research=research;return template;
  }
  function render(result) {
    if(!result.research)return '';
    const research=result.research,questions=result.sections.flatMap(s=>s.questions),coverage=research.coverage;
    const found=questions.filter(q=>q.answerStatus==='found').length;
    const sourceButtons=evidence=>[...new Set((evidence||[]).map(e=>e.sourceId))].map((id,i)=>{const source=research.sources.find(s=>s.id===id),url=safeURL(source?.url);return url?`<a class="questionnaire-source-button" href="${escape(url)}" target="_blank" rel="noopener noreferrer" title="${escape(source.title)}">Джерело${i?' '+(i+1):''}</a>`:'';}).join(' ');
    const field=q=>{
      const claims=q.answerStatus==='user'?(q.answer?[{value:q.answer,evidence:[]}]:[]):q.claims?.length?q.claims:q.answer&&q.evidence?.length?[{value:q.answer,evidence:q.evidence}]:[];
      const editor=`<textarea id="answer-${q.id}" data-questionnaire-answer="${q.id}" maxlength="3500" rows="3" aria-label="${escape(q.text)}" placeholder="Потрібно уточнити">${escape(q.answer)}</textarea>`;
      return `<div class="questionnaire-research-field" data-completion-status="${escape(q.answerStatus)}">
        <label for="answer-${q.id}">${escape(q.text)}</label>
        <span class="questionnaire-research-badge" data-answer-badge="${q.id}" data-status="${q.answerStatus}">${labels[q.answerStatus]}</span>
        ${q.options?`<div class="questionnaire-research-options">${q.options.map(o=>`<label><input type="${q.kind==='multiChoice'?'checkbox':'radio'}" name="option-${q.id}" data-questionnaire-option="${q.id}" value="${escape(o)}" ${q.selectedOptions?.includes(o)?'checked':''}> ${escape(o)}</label>`).join('')}</div>`:''}
        ${claims.map(c=>`<div class="questionnaire-research-claim"><p>${escape(c.value)}</p><div>${sourceButtons(c.evidence)}</div></div>`).join('')}
        ${claims.length?`<details class="questionnaire-answer-editor"><summary>Редагувати відповідь</summary>${editor}</details>`:editor}
        <small class="questionnaire-missing-note">${escape(q.answerNote)}</small>
        ${q.evidence?.length?`<details><summary>Перевірити цитати</summary>${q.evidence.map(e=>`<blockquote>${escape(e.quote)}</blockquote>${sourceButtons([e])}`).join('')}</details>`:''}
      </div>`;
    };
    return `<div class="questionnaire-research-review">
      <p class="questionnaire-research-summary" data-questionnaire-summary>${coverage?`Підтверджені факти: ${coverage.withEvidence} із ${coverage.total} питань (${coverage.percent}%). Повні відповіді: ${coverage.complete} (${coverage.completePercent}%). Усі ${coverage.total} питань шаблону збережено.`:found?`${found} з ${questions.length} полів містять знайдені відомості. Перевірте їх та уточніть решту.`:'Заповнення не вдалося: у прочитаних джерелах немає відповідей для цього об’єкта. Нижче залишилася форма для ручного заповнення.'}</p>
      ${coverage?`<p class="questionnaire-completion-legend">[?] Потрібна відповідь: ${coverage.missing}. [!] Часткові відповіді: ${coverage.partial}. [!] Суперечності: ${coverage.conflicts}. ${coverage.targetReached?'Ціль 80% повних відповідей досягнуто.':'Цілі 80% повних відповідей ще не досягнуто.'}</p>`:''}
      ${research.quality?.state==='draft'?'<p role="alert" class="questionnaire-missing-note">Попередня добірка доказів. Редакційну перевірку не завершено; перевірте відповіді перед використанням.</p>':''}
      ${research.objectName?`<p><strong>Об’єкт:</strong> ${escape(research.objectName)}</p>`:''}
      <p><strong>Адреса:</strong> ${escape(research.address)}</p>
      ${research.entities?.length?`<details class="questionnaire-related-entities"><summary>Знайдені юридичні особи та ЄДРПОУ (${research.entities.length})</summary><p>Роль у структурі об’єкта не підтверджує статус заявника на страхування.</p>${research.entities.map(e=>`<article><p><strong>${escape(e.name)}</strong> - ЄДРПОУ ${escape(e.edrpou)}. ${escape(e.roleLabel)}</p>${sourceButtons(e.evidence)}</article>`).join('')}</details>`:''}
      ${result.sections.map(s=>`<section class="questionnaire-research-section"><h3>${escape(s.title)}</h3>${s.questions.map(field).join('')}</section>`).join('')}
      ${research.warnings?.length?`<details><summary>Обмеження пошуку (${research.warnings.length})</summary><ul>${research.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}
      <details class="questionnaire-research-sources"><summary>Джерела (${research.sources.length}) та межі пошуку</summary><p>${escape(research.scope)}</p><p>Дата пошуку: ${escape(new Date(research.researchedAt).toLocaleString('uk-UA'))}</p><ol>${research.sources.map(s=>`<li><a href="${escape(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">[${escape(s.id)}] ${escape(s.title)}</a></li>`).join('')}</ol></details>
    </div>`;
  }
  function edit(result,target) {
    const id=target.dataset.questionnaireAnswer||target.dataset.questionnaireOption;
    if(!id||!result?.research)return;
    const q=result.sections.flatMap(s=>s.questions).find(q=>q.id===id);if(!q)return;
    if(target.dataset.questionnaireOption){
      q.selectedOptions=q.kind==='multiChoice'?[...new Set([...(q.selectedOptions||[]).filter(o=>o!==target.value),...(target.checked?[target.value]:[])])]:[target.value];
      q.answer=q.selectedOptions.join('; ');
      const field=document.getElementById('answer-'+id);if(field)field.value=q.answer;
    }else {q.answer=target.value;q.selectedOptions=[];document.querySelectorAll(`[data-questionnaire-option="${id}"]`).forEach(el=>{el.checked=false;});}
    q.answerStatus='user';
    q.answerNote='Відредаговано вами. Джерела стосуються початково знайдених даних.';
    target.closest?.('.questionnaire-research-field')?.querySelectorAll?.('.questionnaire-research-claim').forEach(el=>{el.hidden=true;});
    const note=target.closest?.('.questionnaire-research-field')?.querySelector('small');if(note)note.textContent=q.answerNote;
    const badge=document.querySelector(`[data-answer-badge="${id}"]`);if(badge){badge.textContent=labels.user;badge.dataset.status='user';}const container=target.closest?.('.questionnaire-research-field');if(container)container.dataset.completionStatus='user';
    const summary=document.querySelector('[data-questionnaire-summary]');if(summary)summary.textContent='Зміни внесено. Завантажений DOCX міститиме відредаговані відповіді; початкові джерела залишаться для порівняння.';
  }
  let transport=null,capability='',expiresAt=0,revision=0,activeController=null,queue=Promise.resolve();
  const authorized=()=>Boolean(transport&&capability&&Date.now()<expiresAt);
  function requestWith(client,input,{signal,cleanup=false}={}) {
    const run=async()=>{
      const request=await client.request(input);
      for(let attempt=0;attempt<2;attempt++){
        try{
          const timeout=AbortSignal.timeout(cleanup?3000:20000);
          const r=await fetch(scope.ANODOS_CONTRACT_REVIEW_CONFIG.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:signal?AbortSignal.any([signal,timeout]):timeout});
          const envelope=await r.json();if(!r.ok)throw new Error(envelope.error||'Сервіс Anodos зараз недоступний.');
          const result=await client.response(envelope,request);if(!result.ok)throw Object.assign(new Error(result.error||'Не вдалося виконати запит.'),{final:true});return result.value;
        }catch(e){signal?.throwIfAborted();if(attempt||e.final||cleanup)throw e;}
      }
    };
    const pending=queue.then(run,run);queue=pending.catch(()=>{});return pending;
  }
  function lock(){
    ++revision;activeController?.abort();activeController=null;
    const client=transport,cap=capability;transport=null;capability='';expiresAt=0;
    if(client&&cap)void requestWith(client,{op:'close',capability:cap},{cleanup:true}).catch(()=>{});
  }
  async function unlock(password){
    const own=++revision;
    if(scope.location?.protocol==='file:')throw new Error('Відкрийте вебверсію https://anodos.com.ua/ для доступу до Anodos Pro.');
    const config=scope.ANODOS_CONTRACT_REVIEW_CONFIG,crypt=scope.AnodosReviewCrypto;
    if(!scope.crypto?.subtle||!crypt||!config?.macPublicKey)throw new Error('Оновіть Anodos для заповнення опитувальника.');
    const client=await crypt.client(config.macPublicKey,config.macKeyId);
    const credentials=password?{password}:{proAccess:await scope.AnodosProAccess.token()};
    const opened=await requestWith(client,{op:'open',kind:'questionnaire',...credentials});password='';delete credentials.password;
    if(own!==revision){await requestWith(client,{op:'close',capability:opened.capability},{cleanup:true}).catch(()=>{});return;}
    if(!opened.capability||!Number.isFinite(opened.expiresAt))throw new Error('Не вдалося підтвердити доступ Anodos Pro.');
    transport=client;capability=opened.capability;expiresAt=opened.expiresAt;
  }
  async function runJob(op,privacyVersion,payload,{signal,progress=()=>{}}={}) {
    const designing=op==='design';
    if(!authorized())throw new Error(designing?'Увійдіть в Anodos Pro для експертної генерації.':'Введіть пароль Anodos Pro для автоматичного заповнення.');
    const client=transport,cap=capability,controller=new AbortController();activeController=controller;
    const signals=[controller.signal,AbortSignal.timeout(32*60*1000)];if(signal)signals.push(signal);
    const combined=AbortSignal.any(signals),started=Date.now();
    const call=input=>requestWith(client,{...input,capability:cap},{signal:combined});
    try{
      progress(designing?'Підключаю експертне проєктування Anodos...':'Підключаю сервіс заповнення Anodos...');
      await call({op,privacyVersion,payload});
      while(true){
        combined.throwIfAborted();const state=await call({op:'status'});
        if(state.state==='done')return state.result;
        if(['error','cancelled','closed','expired'].includes(state.state))throw new Error(state.error||(designing?'Підготовку опитувальника зупинено.':'Заповнення зупинено.'));
        progress((state.progress?.message||(designing?'Проєктую опитувальник...':'Шукаю відомості...'))+(Date.now()-started>60000?(designing?' Перевірка структури триває, залиште вкладку відкритою.':' Пошук і заповнення тривають, залиште вкладку відкритою.') :''));
        await new Promise((resolve,reject)=>{const end=()=>{clearTimeout(timer);combined.removeEventListener('abort',abort);};const abort=()=>{end();reject(combined.reason);};const timer=setTimeout(()=>{end();resolve();},1500);combined.addEventListener('abort',abort,{once:true});if(combined.aborted)abort();});
      }
    }catch(e){
      await requestWith(client,{op:'cancel',capability:cap},{cleanup:true}).catch(()=>{});
      if(combined.aborted)throw new Error(signal?.aborted||controller.signal.aborted?(designing?'Підготовку опитувальника скасовано.':'Заповнення скасовано.'):(designing?'Підготовка перевищила час очікування.':'Заповнення перевищило час очікування.'));throw e;
    }finally{if(activeController===controller)activeController=null;}
  }
  const research=(payload,options)=>runJob('research','anodos-questionnaire-web-v2',payload,options);
  const design=(payload,options)=>runJob('design','anodos-questionnaire-design-v1',payload,options);
  scope.AnodosQuestionnaireResearch=Object.freeze({research,design,apply,render,edit,unlock,lock,authorized});
})(window);
