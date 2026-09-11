import {readQualityFile} from './contract-quality-reader.mjs?v=2';
import {qualityPdfBlob} from './contract-quality-report.mjs?v=2';
const endpoint='https://anodos-contract-quality.mesquite-wishbone.workers.dev';
const $=id=>document.getElementById(id),escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let files=[],job=null,result=null,busy=false,available=false,pollTimer,run=0;
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
function error(message){$('error').textContent=message;$('error').hidden=false;}
function progress(title,detail=''){$('progress').hidden=false;$('progress-title').textContent=title;$('progress-detail').textContent=detail;}
async function api(path,{method='GET',json,bytes,token=job?.token}={}){
 const r=await fetch(endpoint+path,{method,cache:'no-store',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(json):bytes,signal:AbortSignal.timeout(90000)});
 const v=await r.json();if(!r.ok)throw new Error(v.error||'Сервіс тимчасово недоступний.');return v;
}
function list(){$('file-list').innerHTML=files.map((f,i)=>`<li><span>${escape(f.name)}<br><small>${(f.size/1048576).toFixed(2)} МБ</small></span><button type="button" data-remove="${i}" aria-label="Прибрати ${escape(f.name)}">×</button></li>`).join('');}
function add(items){if(busy)return;const next=[...files,...items];if(next.length>8){error('Додайте не більше 8 файлів.');return;}if(next.some(f=>f.size<1||f.size>20*1048576)||next.reduce((n,f)=>n+f.size,0)>60*1048576){error('Кожен файл має бути непорожнім, до 20 МБ; увесь пакет до 60 МБ.');return;}if(new Set(next.map(f=>f.name)).size!==next.length){error('Файли мають однакову назву. Перейменуйте їх перед завантаженням.');return;}files=next;$('error').hidden=true;list();}
$('files').addEventListener('change',e=>{add([...e.target.files]);e.target.value='';});
$('file-list').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b&&!busy){files.splice(Number(b.dataset.remove),1);list();}});
for(const event of ['dragover','dragenter'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('dropzone').classList.add('drag');});
$('dropzone').addEventListener('dragleave',()=>$('dropzone').classList.remove('drag'));
$('dropzone').addEventListener('drop',e=>{e.preventDefault();$('dropzone').classList.remove('drag');add([...e.dataTransfer.files]);});
function recovery(){location.hash='review='+job.id+'.'+job.token;$('recovery').hidden=false;}
function setBusy(value){busy=value;$('submit').disabled=value||!available;$('files').disabled=value;}
function render(r){
 result=r;$('empty').hidden=true;$('result').hidden=false;$('result-panel').classList.add('has-result');
 const section=(title,checks,kind)=>!checks?.length||r.blocked?'':`<section class="report-section"><h3>${escape(title)}<span class="count">${checks.length}</span></h3>${checks.map((c,i)=>`<article class="finding"><h4>${i+1}. ${escape(c.title)}</h4><p>${escape(c.assessment)}</p>${c.impact?`<p>${escape(c.impact)}</p>`:''}${c.recommendation?`<p class="recommendation"><strong>Що погодити:</strong> ${escape(c.recommendation)}</p>`:''}${c.evidence?`<details class="evidence"><summary>Фрагмент договору</summary>${c.evidence.fragments.map(f=>`<blockquote><small>${escape([f.file_name,f.page?'с. '+f.page:'',f.clause?'п. '+f.clause:''].filter(Boolean).join(', '))}</small>${escape(f.quote)}</blockquote>`).join('')}</details>`:''}</article>`).join('')}</section>`;
 $('result').innerHTML=`<span class="eyebrow">ВАША ОЦІНКА</span><h2>${escape(r.verdict)}</h2><p>${escape(r.summary)}</p><div class="result-actions"><button class="download" id="download-pdf" type="button">Скачати PDF ↓</button></div><p class="scope">${escape(r.scope)}</p>${section('Що варто покращити',r.issues,'change')}${section('Що вже працює на вашу користь',r.strengths,'good')}${section('Що потрібно уточнити',r.unknown,'unclear')}${r.warnings?.length?`<section class="report-section"><h3>Межі перевірки</h3>${r.warnings.map(w=>`<p class="hint">${escape(w)}</p>`).join('')}</section>`:''}<p class="hint" style="margin-top:22px">Автоматична оцінка може містити пропуски. Перед погодженням змін звірте рекомендації з оригіналом і страховим фахівцем.</p>`;
 $('download-pdf').addEventListener('click',async e=>{e.target.disabled=true;try{const blob=await qualityPdfBlob(result),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BRITMARK_оцінка_договору.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(err){error(err.message);}finally{e.target.disabled=false;}});
}
async function poll(generation=run){
 if(generation!==run||!job)return;
 try{const s=await api('/jobs/'+job.id);if(generation!==run)return;
  if(s.status==='completed'){const report=await api('/jobs/'+job.id+'/result');if(generation!==run)return;render(report);$('progress').hidden=true;setBusy(false);return;}
  if(s.status==='failed'){throw new Error(s.error||'Аналіз не завершено.');}
  if(s.status==='uploading'){setBusy(false);$('progress').hidden=true;error('Завантаження не було завершено. Почніть нову перевірку з повним пакетом файлів.');return;}
  const detail=s.progress?.total>1?`Опрацьовано ${s.progress.completed} із ${s.progress.total} частин повного пакета. Результати об’єднаємо в один звіт. `:'';
  progress(s.status==='queued'?'Продовжуємо перевірку':'Читаємо та оцінюємо умови',detail+'Перевірка триває у хмарі. Ви можете повернутися за приватним посиланням.');
  pollTimer=setTimeout(()=>poll(generation),5000);
 }catch(e){if(generation!==run)return;$('progress').hidden=true;setBusy(false);error(e.message+' Якщо з’єднання перервалося, відкрийте збережене посилання ще раз.');}
}
$('review-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;if(!files.length){error('Спочатку додайте договір.');return;}if(!$('consent').checked){error('Підтвердьте обробку документів.');return;}
 setBusy(true);$('error').hidden=true;$('result').hidden=true;$('empty').hidden=false;clearTimeout(pollTimer);run++;const generation=run;
 try{
  const docs=[],manifest=[];
  for(const f of files){progress('Читаємо '+f.name,'Залишайте сторінку відкритою під час розпізнавання та завантаження. Скановані документи потребують більше часу.');docs.push(await readQualityFile(f));manifest.push({name:f.name,size:f.size,sha256:await sha(await f.arrayBuffer())});}
  if(docs.reduce((n,d)=>n+d.text.length,0)>4000000)throw new Error('Пакет перевищує 4 мільйони символів. Розділіть незалежні договори на окремі перевірки; текст не обрізано.');
  job=await api('/jobs',{method:'POST',json:{files:manifest,consent:'cloud-and-britmark-archive-v1'},token:null});
  for(let i=0;i<files.length;i++){const file=files[i];for(let start=0,j=0;start<file.size;start+=job.chunkSize,j++){progress('Зберігаємо '+file.name,Math.round(start/file.size*100)+'%');const bytes=await file.slice(start,start+job.chunkSize).arrayBuffer();await api('/jobs/'+job.id+'/chunks/'+i+'/'+j,{method:'PUT',bytes});}}
  await api('/jobs/'+job.id+'/submit',{method:'POST',json:{documents:docs}});recovery();await poll(generation);
 }catch(e){setBusy(false);$('progress').hidden=true;error(e.message||'Не вдалося виконати перевірку.');}
});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-link').textContent='Посилання скопійовано';}catch{error('Не вдалося скопіювати. Збережіть адресу цієї сторінки з адресного рядка.');}});
$('new-review').addEventListener('click',()=>{run++;clearTimeout(pollTimer);job=null;result=null;files=[];list();setBusy(false);history.replaceState(null,'',location.pathname);$('result').hidden=true;$('empty').hidden=false;$('result-panel').classList.remove('has-result');$('recovery').hidden=true;$('progress').hidden=true;$('error').hidden=true;});
const saved=location.hash.match(/^#review=([a-f0-9-]{36})\.([a-f0-9-]{72})$/);if(saved){job={id:saved[1],token:saved[2]};$('recovery').hidden=false;setBusy(true);poll();}

setBusy(busy);fetch(endpoint+"/health",{cache:"no-store",signal:AbortSignal.timeout(15000)}).then(r=>r.json()).then(h=>{available=h.ok&&h.configured;setBusy(busy);if(!available)error("Сервіс готується до запуску. Завантаження поки недоступне.");}).catch(()=>{error("Сервіс поки недоступний. Документи не передано.");});
