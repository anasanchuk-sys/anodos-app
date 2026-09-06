(function(scope){
  'use strict';
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function analyze(records,{read,progress,budgetMs=60000}){
    const config=scope.ANODOS_CONTRACT_REVIEW_CONFIG,crypt=scope.AnodosReviewCrypto;
    if(!scope.crypto?.subtle||!crypt||!config.macPublicKey)throw new Error('Оновіть сторінку Anodos для захищеної перевірки.');
    const started=performance.now(),budget=Math.max(1,Math.min(60000,budgetMs)),deadline=new AbortController();
    const timeout=()=>Object.assign(new Error('За хвилину не вдалося завершити повну перевірку. Неповний висновок не сформовано; вже завантажені оригінали залишились в архіві Anodos.'),{code:'review_deadline'});
    const timer=setTimeout(()=>deadline.abort(timeout()),budget);
    let client,capability='',completed=false;
    const remaining=()=>Math.max(0,Math.floor(budget-(performance.now()-started)));
    const check=()=>{if(!completed&&(deadline.signal.aborted||remaining()<=0))throw timeout();};
    const within=promise=>new Promise((resolve,reject)=>{
      const abort=()=>reject(timeout());deadline.signal.addEventListener('abort',abort,{once:true});if(deadline.signal.aborted)abort();
      Promise.resolve(promise).then(value=>{try{check();resolve(value);}catch(e){reject(e);}},reject).finally(()=>deadline.signal.removeEventListener('abort',abort));
    });
    async function call(input,{cleanup=false}={}){
      if(!cleanup)check();
      const request=await client.request({...input,...(capability?{capability}:{})});
      for(let attempt=0;attempt<(cleanup?1:3);attempt++){
        if(!cleanup)check();
        const controller=new AbortController(),rpcTimer=setTimeout(()=>controller.abort(),cleanup?2000:completed?10000:Math.min(10000,remaining()));
        const abort=()=>controller.abort();if(!cleanup&&!completed)deadline.signal.addEventListener('abort',abort,{once:true});
        try{
          const response=await fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
          const envelope=await response.json();if(!cleanup)check();
          if(!response.ok){if(!cleanup&&[502,503,504].includes(response.status)&&attempt<2){await (completed?pause(500):within(pause(500)));continue;}throw Object.assign(new Error(envelope.error||'Сервіс Anodos недоступний.'),{final:true});}
          const result=await client.response(envelope,request);
          if(!result.ok)throw Object.assign(new Error(result.error||'Перевірку не завершено.'),{final:true});return result.value;
        }catch(e){if(!cleanup)check();if(cleanup||e.final||attempt===2)throw e.name==='AbortError'?new Error('Mac Anodos не відповідає. Оригінали, які вже надійшли, залишились в архіві.'):e;await (completed?pause(500):within(pause(500)));}finally{clearTimeout(rpcTimer);deadline.signal.removeEventListener('abort',abort);}
      }
    }
    try{
      client=await within(crypt.client(config.macPublicKey,config.macKeyId));
      progress('Підключаю локальну модель Anodos через зашифрований канал…');
      const opened=await within(call({op:'open',budgetMs:remaining(),privacyVersion:config.privacyVersion,files:records.map(r=>({name:r.name,size:r.file.size}))}));capability=opened.capability;
      for(let index=0;index<records.length;index++){
        const record=records[index];
        for(let offset=0;offset<record.file.size;offset+=opened.chunkSize){
          progress(`Зберігаю оригінал ${index+1} з ${records.length}: ${Math.floor(offset/record.file.size*100)}%`);
          const chunk=new Uint8Array(await within(record.file.slice(offset,offset+opened.chunkSize).arrayBuffer()));
          await within(call({op:'upload',index,offset,data:crypt.b64(chunk)}));
        }
        record.readStatus='Оригінал збережено в Anodos';
      }
      const documents=[];
      for(const record of records){
        progress('Оригінали збережено. Читаю: '+record.name);record.requireCompleteReading=true;
        const extracted=await within(read(record));record.text=extracted.text;record.readStatus=extracted.status;
        if(!record.text?.trim())throw new Error('Не вдалося прочитати «'+record.name+'». Оригінали залишились в архіві Anodos; перевірку всього пакета зупинено.');
        documents.push({name:record.name,text:record.text,...Object.fromEntries(['hasUnresolvedRevisions','hasComments','ocrPages','ocrConfidence','extractionWarnings'].map(k=>[k,record[k]||extracted[k]||false]))});
      }
      await within(call({op:'submit',budgetMs:remaining(),payload:{documents,checklist_version:scope.AnodosPropertyReview.version}}));
      let payload;
      while(remaining()>0){
        const state=await within(call({op:'status'}));progress(state.progress?.message||'Перевіряю договір на сервері Anodos…');
        if(state.state==='done'){payload=state.result;break;}
        if(state.state==='error'||state.state==='cancelled')throw new Error(state.error||'Перевірку зупинено.');
        await within(pause(Math.min(500,remaining())));
      }
      if(!payload)throw timeout();
      const result=scope.AnodosLocalReviewResult.normalize(payload,documents);
      result.statuses=records.map(r=>r.name+': '+r.readStatus);result.sourceFiles=records.map(r=>r.name);
      let blob,saved=false;
      async function pdf(){
        if(!blob)blob=await scope.AnodosPropertyReviewReport.createBlob(result);check();
        if(!saved){await call({op:'pdf',data:crypt.b64(new Uint8Array(await blob.arrayBuffer()))});check();saved=true;}
        return blob;
      }
      const session={result,async download(){const value=await pdf();const url=URL.createObjectURL(value),a=document.createElement('a');a.href=url;a.download='BRITMARK_перевірка_договору.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);return {filename:a.download};}};
      if(!result.blocked){progress('Результат збережено. Формую й зберігаю PDF BRITMARK…');try{await within(pdf());}catch(e){check();result.reviewWarnings.push('PDF ще не збережено в архіві. Натисніть «Завантажити PDF», щоб повторити; оригінали та результат вже збережені.');}}
      check();result.elapsedMs=Math.round(performance.now()-started);completed=true;
      return session;
    }catch(e){if(capability)void call({op:'cancel'},{cleanup:true}).catch(()=>{});throw e;}finally{clearTimeout(timer);}
  }
  scope.AnodosMacReview=Object.freeze({analyze});
})(window);
