(function(scope){
  'use strict';
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const hash=async bytes=>Array.from(new Uint8Array(await scope.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const accepts=name=>/\.(docx?|docm|rtf|odt|pdf|xlsx?|xlsm|ods|txt|md|csv|tsv|json|xml|html?|png|jpe?g|tiff?|bmp|webp)$/i.test(name);
  function parseLocation(){const m=scope.location?.hash.match(/^#contract-review\/([a-f0-9]{32})\/([a-f0-9]{64})$/);return m?{id:m[1],secret:m[2]}:null;}
  function recoveryURL(key){return scope.location.origin+scope.location.pathname+'#contract-review/'+key.id+'/'+key.secret;}
  async function transport(key,options){
    const config=scope.ANODOS_CONTRACT_REVIEW_CONFIG||{},crypt=scope.AnodosReviewCrypto;let client=null;
    if(!crypt||!scope.crypto?.subtle)throw new Error('Для перевірки відкрийте Anodos через HTTPS або локальну сторінку Mac.');
    async function rpc(input){
      if(options.transport)return options.transport({...input,...key,mode:'server'});
      for(let attempt=0;attempt<4;attempt++){
        try{
          if(!client){client=await crypt.client(config.macPublicKey,config.macKeyId);if(!['open','resume'].includes(input.op))await send({op:'resume'});}
          return await send(input);
        }catch(e){client=null;if(e.final||attempt===3)throw e;await pause(1000);}
      }
    }
    async function send(input){
      const request=await client.request({...input,...key,mode:'server'}),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
        const envelope=await response.json();if(!response.ok)throw new Error('Mac Anodos тимчасово не відповідає. Скористайтеся приватним посиланням пізніше.');
        const reply=await client.response(envelope,request);if(!reply.ok)throw Object.assign(new Error(reply.error||'Не вдалося обробити запит.'),{final:true});return reply.value;
      }finally{clearTimeout(timer);}
    }
    return rpc;
  }
  async function run(records,options={}){
    const progress=options.progress||(()=>{}),crypt=scope.AnodosReviewCrypto;
    const key=options.key||{id:crypt.hex(16),secret:crypt.hex(32)},url=recoveryURL(key);
    options.onRecovery?.({key,url,accepted:false});
    const call=await transport(key,options);let state;
    if(options.key){state=await call({op:'resume'});if(state.state==='error'&&options.retry)state=await call({op:'retry'});}
    else{
      progress('Готую контрольні суми оригіналів. Текст читатиметься на Mac Anodos.');
      const files=[];for(const r of records){if(!accepts(r.name))throw new Error('Формат «'+r.name+'» ще не підтримується. Використайте Word, PDF, таблицю, текст або зображення.');files.push({name:r.name,size:r.file.size,sha256:await hash(await r.file.arrayBuffer())});}
      state=await call({op:'open',privacyVersion:'anodos-mac-encrypted-v1',files});
    }
    if(state.state==='uploading'){
      if(!records.length)throw new Error('Завантаження оригіналів ще не завершене. Повторно виберіть ті самі файли й натисніть «Продовжити перевірку».');
      for(let i=0;i<state.files.length;i++){
        const expected=state.files[i],record=records.find(r=>r.name===expected.name);
        if(!record||record.file.size!==expected.size||await hash(await record.file.arrayBuffer())!==expected.sha256)throw new Error('Для продовження потрібен той самий оригінал: '+expected.name);
        // Re-send the final block if its acknowledgement was lost before publication.
        let offset=expected.offset===expected.size?Math.floor((expected.size-1)/state.chunkSize)*state.chunkSize:expected.offset;
        while(offset<record.file.size){progress('Зберігаю оригінал '+(i+1)+' з '+state.files.length+': '+Math.floor(offset/record.file.size*100)+'%');const bytes=new Uint8Array(await record.file.slice(offset,offset+state.chunkSize).arrayBuffer());const reply=await call({op:'upload',index:i,offset,data:crypt.b64(bytes)});if(reply.offset<=offset)throw new Error('Не вдалося продовжити завантаження.');offset=reply.offset;}
        record.readStatus='Оригінал збережено на Mac Anodos';
      }
      state=await call({op:'enqueue'});
    }
    options.onRecovery?.({key,url,accepted:true});
    const started=Date.now();
    while(state.state!=='done'){
      if(state.state==='error')throw new Error(state.error||'Обробку зупинено. Оригінали збережені.');
      progress((state.progress?.message||'Перевірка триває на Mac Anodos.')+' Можна закрити вкладку та повернутися за приватним посиланням.');
      if(Date.now()-started>15*60*1000)throw new Error('Очікування у вкладці завершено. Перевірка не скасована. Поверніться за приватним посиланням пізніше.');
      await pause(options.pollMs||1500);state=await call({op:'status'});
    }
    let blob;
    async function getPdf(){
      if(blob)return blob;const chunks=[];let offset=0;
      while(offset<state.pdf.size){const part=await call({op:'download',offset});const bytes=crypt.bytes(part.data);if(part.offset!==offset+bytes.length||!bytes.length)throw new Error('PDF завантажився не повністю. Повторіть.');chunks.push(bytes);offset=part.offset;}
      const value=new Blob(chunks,{type:'application/pdf'});if(value.size!==state.pdf.size||await hash(await value.arrayBuffer())!==state.pdf.sha256)throw new Error('PDF не пройшов контроль цілісності. Повторіть завантаження.');blob=value;return blob;
    }
    return {result:state.result,key,recoveryURL:url,getPdf,async download(){const value=await getPdf(),link=document.createElement('a'),objectURL=URL.createObjectURL(value);link.href=objectURL;link.download='BRITMARK_перевірка_договору.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),5000);return {filename:link.download};}};
  }
  scope.AnodosMacWorkflow=Object.freeze({analyze:run,resume:(key,options={})=>run(options.records||[],{...options,key}),parseLocation,recoveryURL,accepts});
})(typeof window!=='undefined'?window:globalThis);
