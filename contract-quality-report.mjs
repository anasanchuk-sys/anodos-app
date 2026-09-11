const ink='#16324f',muted='#526579',green='#256b56';
const clean=x=>String(x||'').replace(/[\u2010-\u2015]/g,'-');
function quotation(c){return (c.evidence?.fragments||[]).map(f=>[f.file_name,f.page?'с. '+f.page:'',f.clause?'п. '+f.clause:''].filter(Boolean).join(', ')+': «'+clean(f.quote).slice(0,380)+(clean(f.quote).length>380?'…':'')+'»').join('\n');}
export function buildQualityPdf(result,{britmark,anodos}){
 const content=[{image:'britmark',width:138,margin:[0,0,0,27]},
  {text:'ОЦІНКА СТРАХОВОГО ДОГОВОРУ',color:muted,fontSize:9,bold:true,characterSpacing:1.2,margin:[0,0,0,10]},
  {text:clean(result.verdict),fontSize:23,bold:true,color:ink,margin:[0,0,0,12]},
  {text:clean(result.summary),fontSize:11,lineHeight:1.3,margin:[0,0,0,15]},
  {text:result.sourceFiles.map(clean).join('\n'),fontSize:9,color:muted,margin:[0,0,0,5]},
  {text:new Date(result.createdAt).toLocaleDateString('uk-UA')+' · '+clean(result.scope),fontSize:9,color:muted,margin:[0,0,0,18]}];
 function section(title,checks,kind){if(!checks?.length||result.blocked)return;content.push({text:title,fontSize:14,bold:true,color:ink,margin:[0,14,0,10],headlineLevel:1});checks.forEach((c,i)=>{
  const blocks=[{text:(i+1)+'. '+clean(c.title),fontSize:12,bold:true,color:kind==='good'?green:ink,margin:[0,0,0,6]},
   {text:clean(c.assessment),lineHeight:1.22,margin:[0,0,0,6]}];
  if(c.impact)blocks.push({text:clean(c.impact),lineHeight:1.22,margin:[0,0,0,6]});
  if(c.recommendation)blocks.push({text:'Що погодити: '+clean(c.recommendation),color:green,bold:true,lineHeight:1.22,margin:[0,2,0,7]});
  if(c.evidence)blocks.push({text:quotation(c),fontSize:8,color:muted,lineHeight:1.1,margin:[0,0,0,6]});
  content.push({stack:blocks,margin:[0,0,0,13],id:'check-'+c.id});
 });}
 section('Що варто покращити',result.issues,'change');section('Що вже працює на вашу користь',result.strengths,'good');if(result.unknown?.length&&!result.blocked){content.push({text:'Що потрібно уточнити',fontSize:14,bold:true,margin:[0,14,0,8],headlineLevel:1});for(const c of result.unknown)content.push({stack:[{text:clean(c.title),bold:true},{text:clean(c.assessment),margin:[0,3,0,0]},...(c.evidence?[{text:quotation(c),color:muted,fontSize:8,margin:[0,4,0,0]}]:[])],fontSize:9,lineHeight:1.2,margin:[0,0,0,9],id:'check-'+c.id});}
 if(result.warnings?.length)content.push({text:result.warnings.map(clean).join('\n'),fontSize:9,color:muted,lineHeight:1.2,margin:[0,8,0,12]});
 content.push({text:'Висновок сформовано автоматично за завантаженими документами. Він може містити пропуски. Перед зміною договору звірте рекомендації з оригіналом і погодьте їх зі страховим фахівцем. Запропоновані розширення можуть вплинути на премію.',fontSize:8,color:muted,lineHeight:1.2,margin:[0,12,0,0]});
 return {pageSize:'A4',pageMargins:[44,38,44,64],defaultStyle:{font:'Roboto',fontSize:10,color:ink},info:{title:'BRITMARK - оцінка страхового договору',author:'BRITMARK / Anodos'},
  images:{britmark,anodos},background:()=>({image:'anodos',width:29,opacity:0.1,absolutePosition:{x:283,y:792}}),
  footer:(page,pages)=>({columns:[{text:'BRITMARK',color:muted,fontSize:8},{text:page+' / '+pages,color:muted,fontSize:8,alignment:'right'}],margin:[44,23,44,0]}),
  pageBreakBefore:(node,following)=>(node.headlineLevel===1&&((following?.length??following?.getFollowingNodesOnPage?.().length)===0||node.startPosition?.top>610))||(String(node.id||'').startsWith('check-')&&node.pageNumbers?.length>1&&node.startPosition?.top>40),content};
}
export async function qualityPdfBlob(result){
 const load=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Логотип не завантажився.');const bytes=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(s);};
 return globalThis.pdfMake.createPdf(buildQualityPdf(result,{britmark:await load('./assets/britmark-logo.png'),anodos:await load('./assets/icon-192.png')})).getBlob();
}
