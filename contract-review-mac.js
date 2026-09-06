(function(scope){
  'use strict';
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function analyze(records,{read,progress}){
    const config=scope.ANODOS_CONTRACT_REVIEW_CONFIG,crypt=scope.AnodosReviewCrypto;
    if(!scope.crypto?.subtle||!crypt||!config.macPublicKey)throw new Error('Оновіть сторінку Anodos для захищеної перевірки.');
    const client=await crypt.client(config.macPublicKey,config.macKeyId);let capability='';
    async function call(input){
      const request=await client.request({...input,...(capability?{capability}:{})});
      for(let attempt=0;attempt<3;attempt++){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
        try{
          const response=await fetch(config.endpoint+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
          const envelope=await response.json();
          if(!response.ok){if([502,503,504].includes(response.status)&&attempt<2){await pause(1500);continue;}throw Object.assign(new Error(envelope.error||'Сервіс Anodos недоступний.'),{final:true});}
          const result=await client.response(envelope,request);
          if(!result.ok)throw Object.assign(new Error(result.error||'Перевірку не завершено.'),{final:true});return result.value;
        }catch(e){if(e.final||attempt===2)throw e.name==='AbortError'?new Error('Mac Anodos не відповідає. Оригінали, які вже надійшли, залишились в архіві.'):e;await pause(1500);}finally{clearTimeout(timer);}
      }
    }
    let submitted=false;
    try{
      progress('Підключаю локальну модель Anodos через зашифрований канал…');
      const opened=await call({op:'open',privacyVersion:config.privacyVersion,files:records.map(r=>({name:r.name,size:r.file.size}))});capability=opened.capability;
      for(let index=0;index<records.length;index++){
        const record=records[index];
        for(let offset=0;offset<record.file.size;offset+=opened.chunkSize){
          progress(`Зберігаю оригінал ${index+1} з ${records.length}: ${Math.floor(offset/record.file.size*100)}%`);
          const chunk=new Uint8Array(await record.file.slice(offset,offset+opened.chunkSize).arrayBuffer());
          await call({op:'upload',index,offset,data:crypt.b64(chunk)});
        }
        record.readStatus='Оригінал збережено в Anodos';
      }
      const documents=[];
      for(const record of records){
        progress('Оригінали збережено. Читаю: '+record.name);record.requireCompleteReading=true;
        const extracted=await read(record);record.text=extracted.text;record.readStatus=extracted.status;
        if(!record.text?.trim())throw new Error('Не вдалося прочитати «'+record.name+'». Оригінали залишились в архіві Anodos; перевірку всього пакета зупинено.');
        documents.push({name:record.name,text:record.text,...Object.fromEntries(['hasUnresolvedRevisions','hasComments','ocrPages','ocrConfidence','extractionWarnings'].map(k=>[k,record[k]||extracted[k]||false]))});
      }
      await call({op:'submit',payload:{documents,checklist_version:scope.AnodosPropertyReview.version}});submitted=true;
      const deadline=Date.now()+3650000;let payload;
      while(Date.now()<deadline){
        const state=await call({op:'status'});progress(state.progress?.message||'Перевіряю договір на сервері Anodos…');
        if(state.state==='done'){payload=state.result;break;}
        if(state.state==='error'||state.state==='cancelled')throw new Error(state.error||'Перевірку зупинено.');
        await pause(3000);
      }
      if(!payload)throw new Error('Перевірка перевищила годину. Зверніться до Anodos; оригінали збережені.');
      const result=scope.AnodosLocalReviewResult.normalize(payload,documents);
      result.statuses=records.map(r=>r.name+': '+r.readStatus);result.sourceFiles=records.map(r=>r.name);
      let blob,saved=false;
      async function pdf(){
        if(!blob)blob=await scope.AnodosPropertyReviewReport.createBlob(result);
        if(!saved){await call({op:'pdf',data:crypt.b64(new Uint8Array(await blob.arrayBuffer()))});saved=true;}
        return blob;
      }
      const session={result,async download(){const value=await pdf();const url=URL.createObjectURL(value),a=document.createElement('a');a.href=url;a.download='BRITMARK_перевірка_договору.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);return {filename:a.download};}};
      if(!result.blocked){progress('Результат збережено. Формую й зберігаю PDF BRITMARK…');try{await pdf();}catch{result.reviewWarnings.push('PDF ще не збережено в архіві. Натисніть «Завантажити PDF», щоб повторити; оригінали та результат вже збережені.');}}
      return session;
    }catch(e){if(capability&&!submitted)await call({op:'cancel'}).catch(()=>{});throw e;}
  }
  scope.AnodosMacReview=Object.freeze({analyze});
})(window);
