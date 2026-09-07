(function(scope){
  'use strict';
  const text=v=>String(v??'').replace(/[\u2010-\u2015]/g,'-');
  const date=v=>new Date(v).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv'});
  const url=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:undefined;}catch{return undefined;}};
  function buildDefinition(report){
    if(report?.version!=='anodos-osint-pilot-v1'||report.qualityChecked!==true||!Array.isArray(report.findings)||!report.findings.length)throw new Error('Немає перевіреного результату для PDF.');
    const content=[{text:'ANODOS / OSINT',color:'#5a718b',fontSize:10,bold:true,characterSpacing:1.4},{text:text(report.name),fontSize:27,bold:true,color:'#19344f',margin:[0,18,0,8]},{text:'Попередній аналіз компанії',fontSize:15,margin:[0,0,0,8]},{text:'Сформовано: '+date(report.createdAt),style:'small'},{text:`${report.sources.length} прочитаних джерел | ${report.findings.length} висновків із цитатами`,style:'small',margin:[0,4,0,20]},{text:'Межі дослідження',style:'h2'},{text:text(report.coverage),margin:[0,0,0,9]},{ul:report.limitations.map(text),style:'small',margin:[0,0,0,14]}];
    for(const [id,title]of report.sections){
      const rows=report.findings.filter(f=>f.section===id);content.push({text:text(title),style:'h2'});
      if(!rows.length)content.push({text:'У прочитаних фрагментах недостатньо підтверджень.',color:'#78653c',italics:true,margin:[0,0,0,10]});
      rows.forEach((f,i)=>{
        content.push({text:[{text:`${i+1}. `,bold:true},text(f.statement)],margin:[0,5,0,4]});
        content.push({text:f.status==='inference'?'Аналітичне припущення - потребує перевірки':'Твердження джерела - не незалежна перевірка',fontSize:8.5,color:f.status==='inference'?'#82601d':'#496981',margin:[0,0,0,5]});
        content.push({text:f.timeNote||'Дата актуальності відомостей не встановлена.',fontSize:8.5,color:'#78653c',margin:[0,0,0,5]});
        for(const e of f.evidence){const s=report.sources.find(s=>s.id===e.sourceId);if(e.quote)content.push({text:`[${e.sourceId}] «${text(e.quote)}${e.shortened?'…':''}»`,fontSize:9,color:'#495469',margin:[12,2,0,3]});if(s)content.push({text:`[${e.sourceId}] ${text(s.title)}`,link:url(s.url),fontSize:8.5,color:'#2a6285',margin:[12,0,0,9]});}
      });
    }
    content.push({text:'Що залишилося перевірити',style:'h2'},{ul:report.gaps.length?report.gaps.map(text):['Повноту структури, актуальність власників і прав на активи за первинними документами.']});
    if(report.rejectedClaims)content.push({text:`Не включено тверджень після контролю цитат і змісту: ${report.rejectedClaims}.`,style:'small',margin:[0,12,0,0]});
    content.push({text:'Джерела та дата отримання',style:'h2'});
    for(const s of report.sources){content.push({text:`[${s.id}] ${text(s.title)}`,bold:true,margin:[0,10,0,3]},{text:text(s.url),link:url(s.url),fontSize:8.5,color:'#2a6285',margin:[0,0,0,3]},{text:`Отримано: ${date(s.retrievedAt)}. ${s.partial?'Прочитано частково через межі пілота.':'Для аналізу відібрано фрагменти тексту.'}`,style:'small'});}
    if(report.unavailable.length){content.push({text:'Джерела, які не вдалося прочитати',style:'h2'});for(const s of report.unavailable)content.push({text:text(s.url),link:url(s.url),fontSize:8.5,color:'#2a6285',margin:[0,7,0,2]},{text:text(s.reason),style:'small'});}
    return {pageSize:'A4',pageMargins:[43,44,43,44],defaultStyle:{font:'Roboto',fontSize:10.5,lineHeight:1.2,color:'#24324a'},info:{title:'Anodos OSINT - '+text(report.name),author:'Anodos',subject:'Попередній аналіз відкритих джерел'},styles:{h2:{fontSize:15,bold:true,color:'#19344f',margin:[0,19,0,9]},small:{fontSize:8.5,color:'#58667a'}},footer:(current,total)=>({columns:[{text:'ANODOS | Попередній OSINT-звіт',alignment:'left'},{text:`${current} / ${total}`,alignment:'right'}],margin:[43,15,43,0],fontSize:8,color:'#66778c'}),pageBreakBefore:node=>node.style==='h2'&&node.pageNumbers.length===1&&node.startPosition?.verticalRatio>.83,content};
  }
  async function blob(report){if(!scope.pdfMake)throw new Error('Не вдалося завантажити модуль PDF. Оновіть сторінку.');return scope.pdfMake.createPdf(buildDefinition(report)).getBlob();}
  scope.AnodosOsintReport=Object.freeze({buildDefinition,blob});
})(globalThis);
