(function(){
  'use strict';
  const $=id=>document.getElementById(id),config=globalThis.ANODOS_CONTRACT_REVIEW_CONFIG,crypt=globalThis.AnodosReviewCrypto;
  let transport=null,capability='',busy=false,result=null,generation=0,expiryTimer;
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node;};
  const showError=error=>{$('error').textContent=error.message||'Не вдалося завершити пошук.';$('error').hidden=false;};
  function setBusy(value,message=''){busy=value;for(const id of ['search','person-name','company-name','website','consent'])$(id).disabled=value;$('status-box').hidden=!message;$('status-text').textContent=message;$('cancel').disabled=false;}
  async function client(){
    if(!crypt||!config?.macPublicKey||!globalThis.crypto?.subtle)throw new Error('Оновіть сторінку в сучасному браузері з HTTPS.');
    const secure=await crypt.client(config.macPublicKey,config.macKeyId);
    let queue=Promise.resolve();
    return {rpc(input){
      const payload={...input,...(capability?{capability}:{})};
      const task=queue.catch(()=>{}).then(async()=>{
      const request=await secure.request(payload);
      for(let attempt=0;attempt<3;attempt++){
        let response;
        try{response=await fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(30000),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});}
        catch(error){if(attempt===2)throw new Error('Немає зв’язку із сервісом Anodos. Спробуйте пізніше.');continue;}
        if(!response.ok){if(attempt<2&&[429,502,503,504].includes(response.status)){await new Promise(r=>setTimeout(r,1000*(attempt+1)));continue;}throw new Error('Сервер Anodos зараз недоступний. Спробуйте пізніше.');}
        const reply=await secure.response(await response.json(),request);if(!reply.ok)throw new Error(reply.error||'Запит не виконано.');return reply.value;
      }
      });queue=task;return task;
    }};
  }
  function sourceLink(source){const link=el('a',source.title||source.url);try{const url=new URL(source.url);if(url.protocol!=='https:')throw new Error();link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';}catch{link.removeAttribute('href');}return link;}
  function render(report){
    result=report;$('result').hidden=false;$('result-title').textContent=report.name+' · '+report.company;
    $('result-meta').textContent=`${report.sources.length} прочитаних джерел · ${report.pagesAttempted} спроб читання · ${new Date(report.createdAt).toLocaleString('uk-UA')}`;
    $('result-summary').textContent=report.summary;const content=$('report-content');content.replaceChildren();
    for(const [type,association,title,empty]of [['phone','person','Телефони людини','Діловий телефон людини не підтверджено.'],['email','person','Ділова електронна пошта','Діловий email людини не підтверджено.'],['phone','company','Загальні телефони компанії','Загальний телефон компанії не підтверджено.']]){
      content.append(el('h3',title));const rows=report.contacts.filter(r=>r.type===type&&r.association===association);
      if(!rows.length){content.append(el('p',empty,'empty-contact'));continue;}
      for(const row of rows){
        const card=el('article',undefined,'contact-card '+(association==='person'&&type==='phone'?'person-phone':'')),line=el('div',undefined,'contact-line');
        const value=el('a',row.value,'contact-value');if(type==='phone'&&/^\+[1-9]\d{7,14}$/.test(row.value))value.href='tel:'+row.value;else if(type==='email'&&/^[^\s<>]+@[^\s<>]+$/.test(row.value))value.href='mailto:'+encodeURIComponent(row.value);
        const copy=el('button','Копіювати','text-button');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(row.value);copy.textContent='Скопійовано';}catch{copy.textContent='Виділіть номер';}});line.append(value,copy);
        card.append(line,el('p',row.label,'contact-kind'),el('p',row.dateNote,row.freshness==='historical'?'hint historical':'hint'));
        for(const evidence of row.evidence){const source=report.sources.find(s=>s.id===evidence.sourceId);if(!source)continue;card.append(el('blockquote',evidence.quote),sourceLink(source));if(evidence.publishedAt)card.append(el('p','Дата публікації: '+new Date(evidence.publishedAt).toLocaleDateString('uk-UA'),'hint'));}
        content.append(card);
      }
    }
    const details=el('details');details.append(el('summary','Джерела та межі пошуку'),el('p',report.coverage,'hint'));
    for(const gap of report.gaps)details.append(el('p',gap,'hint'));
    for(const source of report.sources){const p=el('p',undefined,'contact-source');p.append(el('span',source.id+' · '),sourceLink(source));if(source.partial)p.append(el('span',' · прочитано частково'));details.append(p);}
    for(const failed of report.unavailable)details.append(el('p',failed.url+' · '+failed.reason,'contact-source'));
    const failedSearches=report.searches.filter(s=>s.status==='unavailable').length;if(failedSearches)details.append(el('p',`Не дали доступних результатів: ${failedSearches} з ${report.searches.length} пошукових запитів.`,'hint'));
    content.append(details);
  }
  function lock(){generation++;clearTimeout(expiryTimer);transport=null;capability='';result=null;$('access-password').value='';$('private-tool').hidden=true;$('access-gate').hidden=false;$('result').hidden=true;$('report-content').replaceChildren();$('person-name').value='';$('company-name').value='';$('website').value='';$('consent').checked=false;$('error').hidden=true;setBusy(false);}
  $('access-form').addEventListener('submit',async event=>{
    event.preventDefault();if($('access-submit').disabled||!$('access-form').reportValidity())return;
    $('access-submit').disabled=true;$('access-error').hidden=true;$('access-status').hidden=false;$('access-status').textContent='Перевіряю пароль';const current=++generation;
    try{const t=await client(),reply=await t.rpc({op:'open',kind:'contacts',password:$('access-password').value});if(current!==generation)return;transport=t;capability=reply.capability;$('access-password').value='';$('access-gate').hidden=true;$('private-tool').hidden=false;$('person-name').focus();expiryTimer=setTimeout(()=>{void transport?.rpc({op:'close'}).catch(()=>{});lock();$('access-error').textContent='Сеанс завершився. Введіть пароль знову.';$('access-error').hidden=false;},Math.max(1,reply.expiresAt-Date.now()));}
    catch(error){if(current===generation){$('access-error').textContent=error.message;$('access-error').hidden=false;}}
    finally{$('access-submit').disabled=false;$('access-status').hidden=true;$('access-password').value='';}
  });
  $('search-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!transport||!$('search-form').reportValidity())return;
    const current=++generation;$('error').hidden=true;$('result').hidden=true;result=null;
    try{
      setBusy(true,'Починаю пошук ділових контактів');
      await transport.rpc({op:'search',name:$('person-name').value,company:$('company-name').value,website:$('website').value.trim(),privacyVersion:'anodos-business-contacts-v1'});
      const deadline=Date.now()+300000;
      while(current===generation){
        if(Date.now()>deadline)throw new Error('Час очікування вичерпано. Спробуйте пошук ще раз.');
        const state=await transport.rpc({op:'status'});if(current!==generation)return;
        if(state.state==='done'){render(state.result);setBusy(false);return;}
        if(['error','cancelled','closed','expired'].includes(state.state))throw new Error(state.error||'Пошук зупинено.');
        setBusy(true,state.progress?.message||'Шукаю та перевіряю контакти');await new Promise(r=>setTimeout(r,1800));
      }
    }catch(error){if(current===generation){setBusy(false);showError(error);}}
  });
  $('cancel').addEventListener('click',async()=>{if(!transport)return;$('cancel').disabled=true;try{await transport.rpc({op:'cancel'});}catch(error){showError(error);}$('cancel').disabled=false;});
  $('lock').addEventListener('click',()=>{void transport?.rpc({op:'close'}).catch(()=>{});lock();$('access-password').focus();});
  $('download').addEventListener('click',()=>{
    if(!result)return;const lines=[`Пошук контактів ДМів - Anodos Pro`,result.name+' · '+result.company,new Date(result.createdAt).toLocaleString('uk-UA'),'',result.summary];
    for(const row of result.contacts){lines.push('',row.value+' - '+row.label,row.dateNote);for(const evidence of row.evidence){const source=result.sources.find(s=>s.id===evidence.sourceId);lines.push(evidence.quote,source?.url||'');}}
    lines.push('',result.coverage,...result.gaps);const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'})),a=el('a');a.href=url;a.download='Anodos_contacts_'+result.name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.addEventListener('pagehide',()=>{void transport?.rpc({op:'close'}).catch(()=>{});lock();});window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();
