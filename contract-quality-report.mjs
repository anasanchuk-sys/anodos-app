const ink='#16324f',muted='#526579',green='#256b56';
const clean=x=>String(x||'').replace(/[\u2010-\u2015]/g,'-');
const headerText=x=>clean(x).replace(/\d+(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?/g,value=>value.replace(/[ \u202f]/g,'\u00a0')).replace(/(\d)[ ]+(%|грн\.?|USD|EUR)/g,'$1\u00a0$2');
function policyHeader(result){
 const labels={policyholder:'Страхувальник',insurer:'Страховик',beneficiary:'Вигодонабувач',period:'Період дії',sumInsured:'Страхова сума',rate:'Тариф',deductible:'Франшиза'};
 const cell=key=>{const f=result.policyDetails?.fields?.[key],known=['found','conflict'].includes(f?.status)&&f.value;return {stack:[{text:labels[key],fontSize:8,color:muted,margin:[0,0,0,4]},{text:known?headerText(f.value):f?.status==='not_found'?'Не встановлено за наданими документами':'Не вдалося надійно визначити',fontSize:10,bold:Boolean(known),color:f?.status==='conflict'?'#996128':ink,lineHeight:1.15}],margin:[10,8,10,8]};};
 return {table:{widths:['*','*'],dontBreakRows:true,body:[['policyholder','insurer'],['beneficiary','period'],['sumInsured','rate']].map(row=>row.map(cell)).concat([[{...cell('deductible'),colSpan:2},{}]])},layout:{hLineWidth:()=>0.5,vLineWidth:()=>0,hLineColor:()=>'#dce5eb',fillColor:()=>'#f3f6f8',paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0},margin:[0,0,0,20]};
}
export function buildQualityPdf(result,{britmark,anodos}){
 const content=[{image:'britmark',width:138,margin:[0,0,0,20]},
  {text:'ОЦІНКА СТРАХОВОГО ДОГОВОРУ',color:muted,fontSize:9,bold:true,characterSpacing:1.2,margin:[0,0,0,10]},
  ...(!result.blocked?[policyHeader(result)]:[]),
  {text:clean(result.verdict),fontSize:23,bold:true,color:ink,margin:[0,0,0,12]},
  {text:clean(result.summary),fontSize:11,lineHeight:1.3,margin:[0,0,0,15]},
  {text:new Date(result.createdAt).toLocaleDateString('uk-UA')+' · Файлів у перевірці: '+(result.sourceFiles?.length||0)+'. '+clean(result.scope),fontSize:9,color:muted,margin:[0,0,0,10]},
  {text:'Висновок сформовано автоматично за завантаженими документами. Він може містити пропуски. Перед зміною договору звірте рекомендації з оригіналом і погодьте їх зі страховим фахівцем. Запропоновані розширення можуть вплинути на премію.',fontSize:8,color:muted,lineHeight:1.2,margin:[0,0,0,14]}];
 function section(title,checks,kind){if(!checks?.length||result.blocked)return;checks.forEach((c,i)=>{
  const blocks=[{text:(i+1)+'. '+clean(c.title),fontSize:12,bold:true,color:kind==='good'?green:ink,margin:[0,0,0,6]},
   {text:clean(c.assessment),lineHeight:1.22,margin:[0,0,0,6]}];
  if(c.impact)blocks.push({text:clean(c.impact),lineHeight:1.22,margin:[0,0,0,6]});
  if(c.recommendation)blocks.push({text:'Що погодити: '+clean(c.recommendation),color:green,bold:true,lineHeight:1.22,margin:[0,2,0,7]});
  const introduction=blocks.splice(0,2);if(i===0)introduction.unshift({text:title,fontSize:14,bold:true,color:ink,margin:[0,14,0,10]});
  blocks.unshift({unbreakable:true,stack:introduction});
  content.push({stack:blocks,margin:[0,0,0,13],id:'check-'+c.id});
 });}
 section('Що варто покращити',result.issues,'change');section('Що вже працює на вашу користь',result.strengths,'good');section('Встановлені умови',result.observations,'info');if(result.unknown?.length&&!result.blocked){result.unknown.forEach((c,i)=>content.push({stack:[{unbreakable:true,stack:[...(i===0?[{text:'Що потрібно уточнити',fontSize:14,bold:true,margin:[0,14,0,8]}]:[]),{text:clean(c.title),bold:true},{text:clean(c.assessment),margin:[0,3,0,0]}]}],fontSize:9,lineHeight:1.2,margin:[0,0,0,9],id:'check-'+c.id}));}
 if(result.warnings?.length)content.push({text:result.warnings.map(clean).join('\n'),fontSize:9,color:muted,lineHeight:1.2,margin:[0,8,0,0]});
 return {pageSize:'A4',pageMargins:[44,38,44,64],defaultStyle:{font:'Roboto',fontSize:10,color:ink},info:{title:'BRITMARK - оцінка страхового договору',author:'BRITMARK / Anodos'},
  images:{britmark,anodos},background:()=>({image:'anodos',width:29,opacity:0.1,absolutePosition:{x:283,y:792}}),
  footer:(page,pages)=>({columns:[{text:'BRITMARK',color:muted,fontSize:8},{text:page+' / '+pages,color:muted,fontSize:8,alignment:'right'}],margin:[44,23,44,0]}),
  pageBreakBefore:node=>String(node.id||'').startsWith('check-')&&node.pageNumbers?.length>1&&node.startPosition?.top>40,content};
}
export async function qualityPdfBlob(result){
 const load=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Логотип не завантажився.');const bytes=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(s);};
 return globalThis.pdfMake.createPdf(buildQualityPdf(result,{britmark:await load('./assets/britmark-logo.png'),anodos:await load('./assets/icon-192.png')})).getBlob();
}
