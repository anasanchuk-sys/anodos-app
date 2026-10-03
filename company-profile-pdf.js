(function(scope){
  'use strict';
  const text=v=>String(v??'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
  const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
  const refs=f=>[...new Set(f.evidence.map(e=>e.sourceId))];
  function select(report){
    if(report?.qualityChecked!==true||report?.focus!=='company-profile-a4-v1'||!Array.isArray(report.findings)||!report.findings.length)throw new Error('Немає завершеної аналітики для PDF.');
    const sources=new Map((report.sources||[]).filter(s=>safe(s.url)).map(s=>[s.id,s]));
    const findings=report.findings.filter(f=>f.evidence?.length&&f.evidence.every(e=>sources.has(e.sourceId)));
    if(!findings.some(f=>['business','structure'].includes(f.section)))throw new Error('Недостатньо джерел для ідентифікації компанії.');
    const chosen=[],blocks=[];let budget=3300;
    const take=(id,count=1)=>{const rows=[];for(const f of findings.filter(f=>f.section===id).slice(0,count)){if(text(f.statement).length>budget)continue;rows.push(f);chosen.push(f);budget-=text(f.statement).length;}return rows;};
    blocks.push({id:'business',title:'Хто це і чим займається',rows:take('business')});
    for(const [id,title]of [['structure','Юридична особа та структура'],['owners','Власники та керівництво'],['finance','Масштаб і фінансові активи']])blocks.push({id,title,rows:take(id)});
    const assets=findings.filter(f=>f.asset).slice(0,4);chosen.push(...assets);
    for(const [id,title]of [['relations','Географія та ринки'],['risks','Ризики та невизначеність'],['conclusions','Аналітичний висновок']])blocks.push({id,title,rows:take(id)});
    const ids=new Set(chosen.flatMap(refs));
    return {blocks,assets,sources:[...sources.values()].filter(s=>ids.has(s.id)),omitted:findings.length-chosen.length};
  }
  function definition(report,size=9.5){
    const selected=select(report),blue='#226B9B';
    const missing='У прочитаних джерелах недостатньо підтверджених відомостей.';
    const claim=f=>({text:[{text:f.status==='inference'?'Аналітичне припущення: ':'',bold:true},text(f.statement),{text:' ['+refs(f).join(', ')+']',color:blue},{text:f.sourceYear?' (дані '+f.sourceYear+' р.)':' (актуальність не встановлена)',color:'#627185',fontSize:size-1}],margin:[0,0,0,4]});
    const heading=title=>({text:title.toUpperCase(),fontSize:size,bold:true,color:blue,margin:[0,9,0,4]});
    const content=[{columns:[{text:'ПРОФІЛЬ КОМПАНІЇ',color:blue,bold:true},{text:new Date(report.createdAt).toLocaleDateString('uk-UA',{timeZone:'Europe/Kyiv'}),alignment:'right',color:'#627185'}],fontSize:8},
      {text:text(report.name),fontSize:22,bold:true,color:'#142F50',margin:[0,10,0,4]},
      {text:'Діяльність, активи та географія',fontSize:12,color:'#142F50',margin:[0,0,0,9]},
      {canvas:[{type:'line',x1:0,y1:0,x2:521.28,y2:0,lineWidth:1.5,lineColor:blue}]}];
    if(!selected.blocks[0].rows.length)content.push({text:'Частковий профіль: юридичну особу підтверджено; опис діяльності потребує уточнення.',fontSize:9,color:'#7A561E',margin:[0,7,0,0]});
    for(const b of selected.blocks.slice(0,4)){content.push(heading(b.title),...(b.rows.length?b.rows.map(claim):[{text:missing,color:'#627185'}]));}
    content.push(heading('Активи та місця діяльності'));
    if(selected.assets.length){
      const rows=[[{text:'Об’єкт / локація',bold:true},{text:'Локація, право та стан за джерелом',bold:true}]];
      for(const f of selected.assets){const a=f.asset;rows.push([{text:text(a.name),bold:true},{text:[text(a.address?.status==='exact'?a.address.text:a.location||'Локацію не встановлено')+'. ',text(a.relationLabel||'Право на майно не встановлено')+'. ',text(a.stateLabel||'Стан не встановлено')+'. ',{text:'['+refs(f).join(', ')+']'+(f.sourceYear?' · '+f.sourceYear:' · дата не встановлена'),color:blue}]}]);}
      content.push({table:{headerRows:1,widths:[145,'*'],body:rows},fontSize:size-0.3,layout:{hLineWidth:()=>0.4,vLineWidth:()=>0,hLineColor:()=> '#D9E2EB',fillColor:i=>i===0?'#F0F5F9':null,paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>5,paddingBottom:()=>5}});
    }else content.push({text:'Конкретні активи та локації не підтверджені. Це не означає відсутність майна.',color:'#627185'});
    for(const b of selected.blocks.slice(4)){content.push(heading(b.title),...(b.rows.length?b.rows.map(claim):[{text:missing,color:'#627185'}]));}
    content.push({text:'Межі: відомості джерел, не незалежний аудит. Бренд, проєкт або адреса не доводять власності. Балансові активи не дорівнюють вартості нерухомості. Перелік вибірковий; портфелі й окремі об’єкти не підсумовуються.'+(selected.omitted?' Стислий відбір: '+selected.omitted+' інших висновків доступні на сторінці дослідження.':'')+(report.unavailable?.length?' Частина джерел недоступна.':''),fontSize:7.5,color:'#627185',margin:[0,10,0,5]});
    content.push({text:'ДЖЕРЕЛА',fontSize:7.5,bold:true,color:blue,margin:[0,3,0,3]});
    for(const s of selected.sources)content.push({text:'['+s.id+'] '+text(s.title).slice(0,100)+' · '+new URL(s.url).hostname,link:safe(s.url),fontSize:7.2,color:blue,margin:[0,0,0,2]});
    return {pageSize:'A4',pageMargins:[37,30,37,61],defaultStyle:{font:'Roboto',fontSize:size,lineHeight:1.1,color:'#243345'},info:{title:text(report.name)+' | Аналітика компанії',author:'Ανοδος'},footer:{svg:scope.AnodosProfileWordmark,width:61,alignment:'center',margin:[0,14,0,0]},content};
  }
  function setup(){
    if(!scope.pdfMake||!scope.AnodosProfileWordmark)throw new Error('Не вдалося завантажити PDF або шрифт. Оновіть сторінку.');

  }
  async function generate(report){
    setup();
    // Ask the actual PDF layout engine. Never return a silently overflowing page.
    for(const size of [10,9.5,9,8.5]){
      const pdf=scope.pdfMake.createPdf(definition(report,size));
      const document=await pdf.pdfDocumentPromise;
      if(document._pdfMakePages?.length===1)return pdf;
      document.end();
    }
    throw new Error('Аналітика не вмістилася на одну читабельну сторінку. Спробуйте точнішу юридичну особу замість групи.');
  }
  scope.AnodosCompanyProfile=Object.freeze({select,definition,generate,blob:async report=>(await generate(report)).getBlob(),buffer:async report=>(await generate(report)).getBuffer()});
})(globalThis);
