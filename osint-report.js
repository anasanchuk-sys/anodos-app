(function(scope){
  'use strict';
  const text=v=>String(v??'').replace(/[\u2010-\u2015]/g,'-');
  const date=v=>new Date(v).toLocaleString('uk-UA',{timeZone:'Europe/Kyiv'});
  const url=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:undefined;}catch{return undefined;}};
  // Questions are not audited factual findings. Do not let a question presuppose
  // wrongdoing when primary registry checks are outside this pilot's scope.
  const gaps=report=>[...new Set((report.gaps||[]).map(g=>/криміналь|справ|проваджен|санкці|порушен|ухиленн|арешт|відмиван|фіктивн/i.test(g)?'Судові провадження та санкції: потрібна окрема перевірка первинних реєстрів. У цьому пілоті її не виконано.':text(g)))];
  const assetGroups=report=>[
    ['owner_candidate','Майно, власність на яке зазначена у джерелах'],
    ['rights_check','Майно з невстановленим правом власності'],
    ['other_interest','Оренда та експлуатація: окремий страховий інтерес'],
    ['planned','Заплановані об’єкти та будівництво'],
    ['condition_check','Пошкоджені об’єкти: потрібна перевірка стану'],
    ['historical','Історичні відомості: підтвердити наявність сьогодні'],
    ['excluded','Продане або вибуле майно']
  ].map(([id,title])=>({id,title,items:report.findings.filter(f=>f.asset?.lane===id)})).filter(group=>group.items.length);
  const assetFields=a=>[
    ['Тип',a.categoryLabel+(a.scope==='group'?' | Сукупність майна, можливий перетин з окремими об’єктами':' | Окремий об’єкт')],
    ['Локація',a.location||'Не встановлена'],['Юридичний власник',a.owner||'Не встановлений'],
    ['Оператор',a.operator||'Не встановлений'],['Право на майно',a.relationLabel],['Стан',a.stateLabel],
    ...(a.characteristics?[['Масштаб / характеристики',a.characteristics]]:[])
  ];
  function buildDefinition(report){
    if(report?.version!=='anodos-osint-pilot-v1'||report.qualityChecked!==true||!Array.isArray(report.findings)||!report.findings.length)throw new Error('Немає перевіреного результату для PDF.');
    const focused=report.focus==='insurable-assets-v1',assets=report.findings.filter(f=>f.asset);
    const content=[{text:'ANODOS PRO / OSINT',color:'#5a718b',fontSize:10,bold:true,characterSpacing:1.4},{text:text(report.name),fontSize:27,bold:true,color:'#19344f',margin:[0,18,0,8]},{text:focused?'Активи для страхування':'Попередній аналіз компанії',fontSize:15,margin:[0,0,0,8]},{text:'Сформовано: '+date(report.createdAt),style:'small'},{text:focused?`Позицій майна: ${assets.length} | Із заявленою власністю: ${assets.filter(f=>f.asset.lane==='owner_candidate').length} | Джерел: ${report.sources.length}`:`${report.sources.length} прочитаних джерел | ${report.findings.length} висновків із цитатами`,style:'small',margin:[0,4,0,12]}];
    if(focused){
      content.push({text:'Попередній перелік для розмови з бізнесом. Права, актуальний стан і можливість страхування потребують перевірки. Кількість позицій не є кількістю об’єктів: портфелі та їх складові можуть перетинатися.',style:'small',margin:[0,0,0,10]});
      if(!assets.length)content.push({text:'У прочитаних джерелах не знайдено достатньо підтверджених даних для реєстру майна. Це не означає відсутність активів. Потрібні перелік майна та документи від бізнесу.',margin:[0,8,0,12]});
      for(const group of assetGroups(report)){
        content.push({text:group.title,style:'h2'});
        for(const f of group.items){
          const a=f.asset,stack=[{text:text(a.name),bold:true,fontSize:12,color:'#19344f',margin:[0,6,0,5]},{text:text(f.statement),margin:[0,0,0,6]}];
          for(const [label,value] of assetFields(a))stack.push({text:[{text:label+': ',bold:true},text(value)],fontSize:9.5,margin:[0,0,0,3]});
          stack.push({text:text(f.timeNote),style:'small',margin:[0,3,0,5]});
          stack.push({text:[{text:'Напрям страхування: ',bold:true},text(a.insuranceOption)],margin:[0,4,0,4]},{text:text(a.insuranceBasis),style:'small'});
          if(!a.insuranceCandidate)stack.push({text:'Не включено до поточних кандидатів. Спочатку підтвердити наявність, право і стан об’єкта.',fontSize:9,color:'#78653c',margin:[0,4,0,3]});
          stack.push({text:'Що запросити для пропозиції',bold:true,fontSize:9.5,margin:[0,8,0,3]},{ul:a.questions.map(text),fontSize:9,margin:[0,0,0,5]});
          for(const e of f.evidence){const source=report.sources.find(s=>s.id===e.sourceId);if(e.quote)stack.push({text:`[${e.sourceId}] «${text(e.quote)}${e.shortened?'…':''}»`,fontSize:8.5,color:'#495469',margin:[0,3,0,3]});if(source)stack.push({text:`[${source.id}] ${text(source.title)}`,link:url(source.url),fontSize:8,color:'#2a6285'});}
          content.push({stack,unbreakable:true,margin:[0,0,0,12]});
        }
      }
      if(report.findings.some(f=>!f.asset))content.push({text:'Контекст бізнесу та юридичні особи',style:'h2',pageBreak:assets.length?'before':undefined});
    }
    if(!focused)content.push({text:'Межі дослідження',style:'h2'},{text:text(report.coverage),margin:[0,0,0,9]},{ul:report.limitations.map(text),style:'small',margin:[0,0,0,14]});
    for(const [id,title]of report.sections){
      if(focused&&id==='assets')continue;
      const rows=report.findings.filter(f=>f.section===id);if(focused&&!rows.length)continue;content.push({text:text(title),style:'h2'});
      if(!rows.length)content.push({text:'У прочитаних фрагментах недостатньо підтверджень.',color:'#78653c',italics:true,margin:[0,0,0,10]});
      rows.forEach((f,i)=>{
        const start=content.length;
        content.push({text:[{text:`${i+1}. `,bold:true},text(f.statement)],margin:[0,5,0,4]});
        content.push({text:f.status==='inference'?'Аналітичне припущення - потребує перевірки':'Твердження джерела - не незалежна перевірка',fontSize:8.5,color:f.status==='inference'?'#82601d':'#496981',margin:[0,0,0,5]});
        content.push({text:f.timeNote||'Дата актуальності відомостей не встановлена.',fontSize:8.5,color:'#78653c',margin:[0,0,0,5]});
        for(const e of f.evidence){const s=report.sources.find(s=>s.id===e.sourceId);if(e.quote)content.push({text:`[${e.sourceId}] «${text(e.quote)}${e.shortened?'…':''}»`,fontSize:9,color:'#495469',margin:[12,2,0,3]});if(s)content.push({text:`[${e.sourceId}] ${text(s.title)}`,link:url(s.url),fontSize:8.5,color:'#2a6285',margin:[12,0,0,9]});}
        content.push({stack:content.splice(start),unbreakable:true});
      });
    }
    content.push({text:'Що залишилося перевірити',style:'h2'},{ul:gaps(report).length?gaps(report):['Повноту структури, актуальність власників і прав на активи за первинними документами.']});
    if(report.rejectedClaims)content.push({text:`Не включено тверджень після контролю цитат і змісту: ${report.rejectedClaims}.`,style:'small',margin:[0,12,0,0]});
    if(focused)content.push({text:'Межі дослідження',style:'h2'},{text:text(report.coverage),margin:[0,0,0,9]},{ul:report.limitations.map(text),style:'small',margin:[0,0,0,14]});
    content.push({text:'Джерела та дата отримання',style:'h2'});
    for(const s of report.sources){content.push({unbreakable:true,stack:[{text:`[${s.id}] ${text(s.title)}`,bold:true,margin:[0,10,0,3]},{text:text(s.url),link:url(s.url),fontSize:8.5,color:'#2a6285',margin:[0,0,0,3]},{text:`Отримано: ${date(s.retrievedAt)}. ${s.partial?'Прочитано частково через межі пілота.':'Для аналізу відібрано фрагменти тексту.'}`,style:'small'}]});}
    if(report.unavailable.length){content.push({text:'Джерела, які не вдалося прочитати',style:'h2'});for(const s of report.unavailable)content.push({unbreakable:true,stack:[{text:text(s.url),link:url(s.url),fontSize:8.5,color:'#2a6285',margin:[0,7,0,2]},{text:text(s.reason),style:'small'}]});}
    return {pageSize:'A4',pageMargins:[43,44,43,44],defaultStyle:{font:'Roboto',fontSize:10.5,lineHeight:1.2,color:'#24324a'},info:{title:'Anodos OSINT - '+text(report.name),author:'Anodos',subject:'Попередній аналіз відкритих джерел'},styles:{h2:{fontSize:15,bold:true,color:'#19344f',margin:[0,19,0,9]},small:{fontSize:8.5,color:'#58667a'}},footer:(current,total)=>({columns:[{text:'ANODOS | Попередній OSINT-звіт',alignment:'left'},{text:`${current} / ${total}`,alignment:'right'}],margin:[43,15,43,0],fontSize:8,color:'#66778c'}),pageBreakBefore:node=>node.style==='h2'&&node.pageNumbers.length===1&&node.startPosition?.verticalRatio>.83,content};
  }
  async function blob(report){if(!scope.pdfMake)throw new Error('Не вдалося завантажити модуль PDF. Оновіть сторінку.');return scope.pdfMake.createPdf(buildDefinition(report)).getBlob();}
  scope.AnodosOsintReport=Object.freeze({buildDefinition,blob,gaps,assetGroups,assetFields});
})(globalThis);
