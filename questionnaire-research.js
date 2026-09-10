(function(scope) {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={found:'Знайдено у джерелі',unknown:'Потрібно уточнити',conflict:'Суперечливі дані',user:'Внесено вами'};
  const safeURL=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  function apply(template,research) {
    if(research.subject!==template.subject||research.profileId!==template.profileId||!Array.isArray(research.answers)||!Array.isArray(research.sources))throw new Error('Отримано результат для іншого опитувальника. Повторіть пошук.');
    const answers=new Map(research.answers.map(a=>[a.id,a]));
    for(const section of template.sections)for(const q of section.questions){
      const a=answers.get(q.id);
      q.answer=typeof a?.value==='string'?a.value:'';q.answerStatus=labels[a?.status]?a.status:'unknown';
      q.selectedOptions=(a?.selectedOptions||[]).filter(o=>q.options?.includes(o));q.evidence=a?.evidence||[];q.answerNote=a?.note||'';
    }
    template.research=research;return template;
  }
  function render(result) {
    if(!result.research)return '';
    const research=result.research;
    const questions=result.sections.flatMap(s=>s.questions);
    const found=questions.filter(q=>q.answerStatus==='found').length,user=questions.filter(q=>q.answerStatus==='user'&&q.answer).length;
    return `<div class="questionnaire-research-review">
      <p class="questionnaire-research-summary" data-questionnaire-summary>${found ? `${found} з ${questions.length} полів містять знайдені відомості${user?`; ${user} доповнено вами`:''}. Перевірте їх та уточніть решту.` : 'Заповнення не вдалося: у прочитаних джерелах немає відповідей для цього об’єкта. Нижче залишилася форма для ручного заповнення. Уточніть адресу або додайте назву будівлі й повторіть пошук.'}</p>
      <p><strong>Адреса:</strong> ${escape(research.address)}</p>
      ${research.warnings?.length?`<details><summary>Обмеження пошуку (${research.warnings.length})</summary><ul>${research.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}
      ${result.sections.map(s=>`<section class="questionnaire-research-section"><h3>${escape(s.title)}</h3>${s.questions.map(q=>`
        <div class="questionnaire-research-field">
          <label for="answer-${q.id}">${escape(q.text)}</label>
          <span class="questionnaire-research-badge" data-answer-badge="${q.id}" data-status="${q.answerStatus}">${labels[q.answerStatus]}</span>
          ${q.options?`<div class="questionnaire-research-options">${q.options.map((o,i)=>`<label><input type="${q.kind==='multiChoice'?'checkbox':'radio'}" name="option-${q.id}" data-questionnaire-option="${q.id}" value="${escape(o)}" ${q.selectedOptions?.includes(o)?'checked':''}> ${escape(o)}</label>`).join('')}</div>`:''}
          <textarea id="answer-${q.id}" data-questionnaire-answer="${q.id}" maxlength="700" rows="2" placeholder="Потрібно уточнити">${escape(q.answer)}</textarea>
          <small>${escape(q.answerNote)}</small>
          ${q.evidence?.length?`<details><summary>Підтвердження та джерело</summary>${q.evidence.map(e=>{const source=research.sources.find(s=>s.id===e.sourceId);return `<blockquote>${escape(e.quote)}</blockquote><p>${escape(e.addressQuote)}</p><a href="${escape(safeURL(source?.url))}" target="_blank" rel="noopener noreferrer">[${escape(e.sourceId)}] ${escape(source?.title||'Джерело')}</a>`;}).join('')}</details>`:''}
        </div>`).join('')}</section>`).join('')}
      <details class="questionnaire-research-sources"><summary>Усі джерела (${research.sources.length}) та межі пошуку</summary><p>${escape(research.scope)}</p><p>Дата пошуку: ${escape(new Date(research.researchedAt).toLocaleString('uk-UA'))}</p><ol>${research.sources.map(s=>`<li><a href="${escape(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">[${escape(s.id)}] ${escape(s.title)}</a></li>`).join('')}</ol></details>
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
    const note=target.closest?.('.questionnaire-research-field')?.querySelector('small');if(note)note.textContent=q.answerNote;
    const badge=document.querySelector(`[data-answer-badge="${id}"]`);if(badge){badge.textContent=labels.user;badge.dataset.status='user';}
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
    const opened=await requestWith(client,{op:'open',kind:'questionnaire',password});password='';
    if(own!==revision){await requestWith(client,{op:'close',capability:opened.capability},{cleanup:true}).catch(()=>{});return;}
    if(!opened.capability||!Number.isFinite(opened.expiresAt))throw new Error('Не вдалося підтвердити доступ Anodos Pro.');
    transport=client;capability=opened.capability;expiresAt=opened.expiresAt;
  }
  async function research(payload,{signal,progress=()=>{}}={}) {
    if(!authorized())throw new Error('Введіть пароль Anodos Pro для автоматичного заповнення.');
    const client=transport,cap=capability,controller=new AbortController();activeController=controller;
    const signals=[controller.signal,AbortSignal.timeout(15*60*1000)];if(signal)signals.push(signal);
    const combined=AbortSignal.any(signals),started=Date.now();
    const call=input=>requestWith(client,{...input,capability:cap},{signal:combined});
    try{
      progress('Підключаю сервіс заповнення Anodos...');
      await call({op:'research',privacyVersion:'anodos-questionnaire-web-v1',payload});
      while(true){
        combined.throwIfAborted();const state=await call({op:'status'});
        if(state.state==='done')return state.result;
        if(['error','cancelled','closed','expired'].includes(state.state))throw new Error(state.error||'Заповнення зупинено.');
        progress((state.progress?.message||'Шукаю відомості...')+(Date.now()-started>60000?' Пошук і заповнення тривають, залиште вкладку відкритою.':''));
        await new Promise((resolve,reject)=>{const end=()=>{clearTimeout(timer);combined.removeEventListener('abort',abort);};const abort=()=>{end();reject(combined.reason);};const timer=setTimeout(()=>{end();resolve();},1500);combined.addEventListener('abort',abort,{once:true});if(combined.aborted)abort();});
      }
    }catch(e){
      await requestWith(client,{op:'cancel',capability:cap},{cleanup:true}).catch(()=>{});
      if(combined.aborted)throw new Error(signal?.aborted||controller.signal.aborted?'Заповнення скасовано.':'Заповнення перевищило час очікування.');throw e;
    }finally{if(activeController===controller)activeController=null;}
  }
  scope.AnodosQuestionnaireResearch=Object.freeze({research,apply,render,edit,unlock,lock,authorized});
})(window);
