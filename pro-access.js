(function(scope){
  'use strict';
  const key='anodos-pro-access-v1',config=scope.ANODOS_CONTRACT_REVIEW_CONFIG;
  let grant=null,client=null,verified=false,pending=null,revision=0,timer=null;
  try{const saved=JSON.parse(sessionStorage.getItem(key));if(saved?.keyId===config?.macKeyId&&/^[a-f0-9]{64}$/.test(saved.token)&&saved.expiresAt>Date.now())grant=saved;else sessionStorage.removeItem(key);}catch{}
  function authorized(){return Boolean(verified&&grant&&grant.expiresAt>Date.now());}
  function notify(){scope.dispatchEvent(new CustomEvent('anodos:pro-access',{detail:{authorized:authorized()}}));}
  function clear(){grant=null;client=null;verified=false;clearTimeout(timer);try{sessionStorage.removeItem(key);}catch{}notify();}
  async function rpc(transport,input){
    const envelope=await transport.request(input);
    const response=await fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||'Сервіс Anodos зараз недоступний. Спробуйте пізніше.');
    const result=await transport.response(body,envelope);
    if(!result.ok)throw new Error(result.error||'Не вдалося підтвердити доступ Anodos Pro.');
    return result.value;
  }
  async function open(credentials){
    const own=++revision;
    if(!scope.crypto?.subtle||!scope.AnodosReviewCrypto||!config?.macPublicKey)throw new Error('Відкрийте Anodos через HTTPS і оновіть сторінку.');
    const transport=await scope.AnodosReviewCrypto.client(config.macPublicKey,config.macKeyId);
    let result;
    try{result=await rpc(transport,{op:'open',kind:'pro',...credentials});}finally{delete credentials.password;}
    if(!/^[a-f0-9]{64}$/.test(result?.token)||!Number.isFinite(result.expiresAt)||result.expiresAt<=Date.now())throw new Error('Не вдалося підтвердити доступ Anodos Pro.');
    if(own!==revision){void rpc(transport,{op:'close'}).catch(()=>{});return;}
    client=transport;grant={token:result.token,expiresAt:result.expiresAt,keyId:config.macKeyId};verified=true;
    try{sessionStorage.setItem(key,JSON.stringify(grant));}catch{}
    clearTimeout(timer);timer=setTimeout(()=>{++revision;clear();},Math.max(1,grant.expiresAt-Date.now()));notify();
  }
  async function login(password){try{await open({password});}catch(error){clear();throw error;}finally{password='';}}
  function ready(){
    if(authorized()||!grant)return Promise.resolve();
    if(!pending)pending=open({proAccess:grant.token}).catch(()=>{clear();}).finally(()=>{pending=null;});
    return pending;
  }
  async function token(){await ready();if(!authorized())throw new Error('Введіть пароль Anodos Pro.');return grant.token;}
  function logout(){const previous=client;++revision;clear();if(previous)void rpc(previous,{op:'close'}).catch(()=>{});}
  scope.AnodosProAccess=Object.freeze({authorized,ready,token,login,logout});

  const form=document.getElementById('anodosProAccessForm'),status=document.getElementById('anodosProAccessStatus'),error=document.getElementById('anodosProAccessError');
  function update(){
    const open=authorized();
    if(form)form.hidden=open;
    const unlocked=document.getElementById('anodosProUnlocked');if(unlocked)unlocked.hidden=!open;
    if(open&&error){error.textContent='';error.hidden=true;}
  }
  scope.addEventListener('anodos:pro-access',update);
  form?.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('button'),field=form.elements.password;if(button.disabled||!form.reportValidity())return;
    const password=field.value;field.value='';button.disabled=true;status.hidden=false;error.hidden=true;
    try{await login(password);}catch(e){error.textContent=e.message;error.hidden=false;field.focus();}finally{button.disabled=false;status.hidden=true;update();}
  });
  document.querySelector('[data-pro-logout]')?.addEventListener('click',()=>{logout();form?.elements.password.focus();});
  update();void ready();
})(window);
