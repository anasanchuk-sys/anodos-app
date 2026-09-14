// Preserve the relationship between PDF table headings and merged cells.
// Geometry supplements the original text; it never replaces unreadable text.
const tolerance=1.2;
const identity=()=>[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
const clusters=values=>values.sort((a,b)=>a-b).reduce((out,x)=>{const last=out.at(-1);if(last&&Math.abs(last.at(-1)-x)<=tolerance)last.push(x);else out.push([x]);return out;},[]).map(xs=>xs.reduce((a,b)=>a+b,0)/xs.length);
const overlap=(a,b,c,d)=>Math.min(b,d)>=Math.max(a,c)-tolerance;

export function pdfTableLines(list,OPS){
 const lines=[],stack=[];let transform=identity();
 const line=(x0,y0,x1,y1)=>{
  const [x,y]=point(transform,x0,y0),[xx,yy]=point(transform,x1,y1);
  if(Math.abs(x-xx)<=tolerance&&Math.abs(y-yy)>8)lines.push({axis:'v',at:(x+xx)/2,start:Math.min(y,yy),end:Math.max(y,yy)});
  else if(Math.abs(y-yy)<=tolerance&&Math.abs(x-xx)>8)lines.push({axis:'h',at:(y+yy)/2,start:Math.min(x,xx),end:Math.max(x,xx)});
 };
 for(let i=0;i<(list?.fnArray?.length||0);i++){
  const op=list.fnArray[i],args=list.argsArray[i];
  if(op===OPS.save){stack.push([...transform]);continue;}
  if(op===OPS.restore){transform=stack.pop()||identity();continue;}
  if(op===OPS.transform){transform=multiply(transform,args);continue;}
  if(op!==OPS.constructPath||!Array.isArray(args)||typeof args[0]!=='number')continue;
  const paint=args[0],paths=args[1];
  if(![OPS.stroke,OPS.closeStroke,OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(paint))continue;
  for(const path of paths||[]){
   const points=[];let valid=true;
   for(let p=0;p<path.length;){const command=path[p++];if(command===0||command===1)points.push([path[p++],path[p++]]);else if(command!==4){valid=false;break;}}
   if(!valid||points.length<2)continue;
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
   // Word commonly paints borders as thin filled rectangles. Large filled
   // backgrounds, clipping paths and curved glyph outlines are not borders.
   if(right-left<=1.5&&top-bottom>8)line((left+right)/2,bottom,(left+right)/2,top);
   else if(top-bottom<=1.5&&right-left>8)line(left,(bottom+top)/2,right,(bottom+top)/2);
   else if([OPS.stroke,OPS.closeStroke].includes(paint))for(let p=1;p<points.length;p++)line(...points[p-1],...points[p]);
  }
 }
 const unique=new Map();for(const l of lines)unique.set([l.axis,l.at,l.start,l.end].map(x=>typeof x==='number'?Math.round(x*2)/2:x).join(':'),l);
 return [...unique.values()].slice(0,2000);
}

function touching(a,b){
 if(a.axis===b.axis)return Math.abs(a.at-b.at)<=tolerance&&overlap(a.start,a.end,b.start,b.end);
 const h=a.axis==='h'?a:b,v=a.axis==='v'?a:b;
 return v.at>=h.start-tolerance&&v.at<=h.end+tolerance&&h.at>=v.start-tolerance&&h.at<=v.end+tolerance;
}
const joinText=items=>{
 const rows=[];for(const item of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){let row=rows.find(r=>Math.abs(r.y-item.y)<2.2);if(!row){row={y:item.y,items:[]};rows.push(row);}row.items.push(item);}
 return rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join(' ').replace(/\s+/g,' ').trim();
};

export function pdfTableText(content,list,OPS){
 const lines=pdfTableLines(list,OPS),parent=lines.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i])),union=(a,b)=>{parent[find(a)]=find(b);};
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++)if(touching(lines[i],lines[j]))union(i,j);
 const groups=new Map();lines.forEach((line,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(line);});
 const textItems=(content?.items||[]).filter(i=>i.str?.trim()&&i.transform).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5],cx:i.transform[4]+Math.max(0,i.width||0)/2,cy:i.transform[5]+Math.abs(i.height||0)*0.3}));
 const tables=[];
 for(const group of groups.values()){
  const vertical=group.filter(l=>l.axis==='v'),horizontal=group.filter(l=>l.axis==='h');
  const xs=clusters(vertical.map(l=>l.at)),ys=clusters(horizontal.map(l=>l.at)).reverse();
  if(xs.length<3||ys.length<3||xs.length>35||ys.length>100||xs.at(-1)-xs[0]<120)continue;
  const cols=xs.length-1,rows=ys.length-1,cells=Array.from({length:cols*rows},(_,i)=>i),root=i=>cells[i]===i?i:(cells[i]=root(cells[i])),merge=(a,b)=>{cells[root(a)]=root(b);};
  const boundary=(axis,at,position)=>group.some(l=>l.axis===axis&&Math.abs(l.at-at)<=tolerance&&position>=l.start-tolerance&&position<=l.end+tolerance);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   if(c+1<cols&&!boundary('v',xs[c+1],(ys[r]+ys[r+1])/2))merge(r*cols+c,r*cols+c+1);
   if(r+1<rows&&!boundary('h',ys[r+1],(xs[c]+xs[c+1])/2))merge(r*cols+c,(r+1)*cols+c);
  }
  const regions=new Map();for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const id=root(r*cols+c);if(!regions.has(id))regions.set(id,{positions:[],items:[]});regions.get(id).positions.push([r,c]);}
  for(const item of textItems){const c=xs.findIndex((x,i)=>i<cols&&item.cx>x&&item.cx<xs[i+1]),r=ys.findIndex((y,i)=>i<rows&&item.cy<y&&item.cy>ys[i+1]);if(c>=0&&r>=0)regions.get(root(r*cols+c)).items.push(item);}
  for(const cell of regions.values()){cell.text=joinText(cell.items);cell.minRow=Math.min(...cell.positions.map(p=>p[0]));cell.maxRow=Math.max(...cell.positions.map(p=>p[0]));cell.minCol=Math.min(...cell.positions.map(p=>p[1]));cell.maxCol=Math.max(...cell.positions.map(p=>p[1]));}
  // Incomplete borders can produce nonrectangular regions. Do not infer
  // merged cells from an irregular grid.
  if([...regions.values()].some(c=>c.positions.length!==(c.maxRow-c.minRow+1)*(c.maxCol-c.minCol+1)))continue;
  const at=(r,c)=>regions.get(root(r*cols+c));
  // Only regular heading rows with explicit insurance financial columns.
  // Irregular forms keep their untouched text instead of guessed headings.
  let header=-1;
  for(let r=0;r<Math.min(rows-1,6);r++){const row=[...new Set(Array.from({length:cols},(_,c)=>at(r,c)))];if(row.filter(c=>/франшиз|тариф|страхов[а-яіїєґ\s]{0,8}сум/iu.test(c.text)).length>=2&&row.every(c=>c.maxRow===r)){header=r;break;}}
  if(header<0)continue;
  const headings=Array.from({length:cols},(_,c)=>at(header,c).text),output=[];
  for(let r=header+1;r<rows;r++){
   // A different horizontal cell layout starts a new subtable (for example
   // the premium schedule below the cover table). Never carry labels over it.
   if(Array.from({length:cols},(_,c)=>at(r,c)).some((cell,c)=>cell.minCol!==at(header,c).minCol||cell.maxCol!==at(header,c).maxCol))break;
   const values=[];for(let c=0;c<cols;c++){
    const cell=at(r,c),heading=headings[c];if(c!==cell.minCol||!heading||!cell.text||cell.minRow<=header)continue;
    if(!/^(?:№|номер)$|тип об|страхов|франшиз|тариф|територ/iu.test(heading))continue;
    if(cell.text.length>600)continue;
    values.push(heading+': '+cell.text+(cell.maxRow>cell.minRow?' [спільна комірка для кількох рядків]':''));
   }
   if(values.length>=3)output.push('Рядок таблиці PDF | '+values.join(' | '));
  }
  if(output.length)tables.push({top:ys[0],text:output.join('\n')});
 }
 return tables.sort((a,b)=>b.top-a.top).map(t=>'[Координатне читання таблиці PDF: спільні комірки повторено в рядках, які вони охоплюють]\n'+t.text).join('\n');
}
