const STORAGE='anodos-contract-quality-access-v1';
const $=id=>document.getElementById(id);
const randomToken=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function createQualityAccess({endpoint,onUnlock,onLock}){
 let session=null,pending=null,timer=null,deadline=0;
 const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'null');}catch{return null;}};
 function write(value){try{value?localStorage.setItem(STORAGE,JSON.stringify(value)):localStorage.removeItem(STORAGE);}catch{}}
 function message(text){$('access-error').textContent=text;$('access-error').hidden=!text;}
 function lock(text=''){
  session=null;deadline=0;clearInterval(timer);write(null);
  $('quality-workspace').hidden=true;$('access-session').hidden=true;$('access-gate').hidden=false;
  $('access-password').value='';message(text);onLock();
 }
 function ensure(){if(!session||performance.now()>=deadline){lock('60 хвилин доступу минули. Введіть новий одноразовий пароль або пароль Anodos Pro.');throw new Error('Час доступу завершився.');}return session.token;}
 async function request(path,{token,password}={}){
  const r=await fetch(endpoint+path,{method:password!==undefined||path==='/access/close'?'POST':'GET',cache:'no-store',headers:{...(token?{'X-Anodos-Access':token}:{}),...(password!==undefined?{'Content-Type':'application/json'}:{})},body:password!==undefined?JSON.stringify({password,token}):undefined,signal:AbortSignal.timeout(20000)});
  const value=await r.json();if(!r.ok)throw Object.assign(new Error(value.error||'Не вдалося перевірити доступ.'),{status:r.status});return value;
 }
 function tick(){
  if(!session)return;const seconds=Math.max(0,Math.ceil((deadline-performance.now())/1000));
  if(!seconds){lock('60 хвилин доступу минули. Введіть новий одноразовий пароль або пароль Anodos Pro.');return;}
  $('access-clock').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 }
 function accept(value,token){
  session={token,expiresAt:value.expiresAt,kind:value.kind};deadline=performance.now()+Math.max(0,value.expiresAt-value.serverTime);write(session);
  $('access-gate').hidden=true;$('access-session').hidden=false;$('quality-workspace').hidden=false;$('access-password').value='';message('');
  clearInterval(timer);timer=setInterval(tick,1000);tick();onUnlock();
 }
 async function verify(){
  const token=ensure();try{const value=await request('/access/session',{token});if(session?.token!==token)throw new Error('Сеанс завершено.');deadline=Math.min(deadline,performance.now()+Math.max(0,value.expiresAt-value.serverTime));return value;}catch(e){if(e.status===401)lock(e.message);throw e;}
 }
 $('access-form').addEventListener('submit',async event=>{
  event.preventDefault();const password=$('access-password').value.trim();if(!password)return;
  $('access-submit').disabled=true;message('');pending||=randomToken();write({token:pending,pending:true});
  try{const value=await request('/access/open',{password,token:pending});const token=pending;pending=null;accept(value,token);}
  catch(e){if(e.status&&e.status<500){pending=null;write(null);}message(e.message||'Не вдалося відкрити доступ. Спробуйте ще раз.');}
  finally{$('access-submit').disabled=false;$('access-password').value='';}
 });
 $('access-lock').addEventListener('click',async()=>{
  $('access-lock').disabled=true;
  try{await request('/access/close',{token:ensure()});lock();}
  catch(e){if(e.status===401)lock(e.message);else{$('error').textContent='Не вдалося завершити сеанс. Спробуйте ще раз.';$('error').hidden=false;}}
  finally{$('access-lock').disabled=false;}
 });
 window.addEventListener('storage',event=>{if(event.key===STORAGE&&session&&read()?.token!==session.token)lock('Сеанс завершено в іншій вкладці.');});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session){tick();if(session)void verify().catch(()=>{});}});
 return {ensure,verify,lock,async start(){
  const saved=read();if(!saved?.token)return;
  try{const value=await request('/access/session',{token:saved.token});accept(value,saved.token);}catch(e){if(e.status===401)write(null);message(e.message);}
 }};
}
