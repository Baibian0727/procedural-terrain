// 1.7.1 的公开 beginUndoGroup 丢失跨层归属；使用宿主自己的批量事务与原生撤销栈。
// 不替换宿主方法、不拦截 Ctrl+Z、不另建撤销栈。版本不匹配时禁止落笔。
let hostBridge=null,hostReady=null,liveCanvas=null,hostEpoch=0;
async function loadHostBridge(ctx){
  let version=ctx.editor.version();
  // 宿主异步读取版本号，首次启动可能暂时为空。
  for(let n=0;!version&&n<100;n++){await new Promise(resolve=>setTimeout(resolve,50));version=ctx.editor.version();}
  if(version!=='1.7.1')return Promise.reject(Error(`本修正版只核对了 Maker Studio 1.7.1，当前为 ${version}；已停止绘图以免损坏撤销。`));
  const script=[...document.querySelectorAll('script[type="module"][src]')].find(s=>/\/index-Bhx3F5kX\.js(?:\?|$)/.test(s.src));
  if(!script)return Promise.reject(Error('无法识别 1.7.1 的运行模块，已停止绘图。'));
  return Promise.all([
    import(new URL('./editor-store-CEa4Ej4i.js',script.src).href),
    import(new URL('./tile-renderer-D1N3vScA.js',script.src).href)
  ]).then(([store,renderer])=>{
    if(typeof store.u?.getState().applyTileChangesBatch!=='function'||typeof renderer.l!=='function')throw Error('当前宿主缺少所需跨层事务或图块缓存。');
    return {store:store.u,renderer};
  });
}
function nativeTransaction(mapId,changes,label){
  if(!hostBridge)throw Error('宿主兼容模块尚未准备好，请稍后落笔。');
  const store=hostBridge.store,before=store.getState().maps[mapId];
  if(!before)throw Error('当前地图已关闭');
  const groups=new Map();
  for(const c of changes){if(!groups.has(c.layer))groups.set(c.layer,new Map());groups.get(c.layer).set(`${c.x},${c.y}`,c.value);}
  try{
    store.getState().applyTileChangesBatch(mapId,[...groups].map(([layerIndex,tiles])=>({layerIndex,changes:tiles,skipBrushProperties:true})),label);
  }catch(error){
    // 同步事务失败时恢复原生数据、属性和两条历史栈，不制造额外撤销步骤。
    store.setState(state=>({maps:{...state.maps,[mapId]:before}}));
    throw Error(`提交失败，已恢复这一笔之前的地图及撤销记录：${error.message}`);
  }
}
function livePreview(){
  const target=stroke||(mode!=='idle'?hover:null);
  if(!target||ctxRef?.editor.activeMapId()!==target.mapId){if(liveCanvas)liveCanvas.style.display='none';return;}
  const surface=mapSurfaces.get(target.mapId);
  if(!surface?.canvas.isConnected){if(liveCanvas)liveCanvas.style.display='none';return;}
  if(!liveCanvas){
    liveCanvas=document.createElement('canvas');liveCanvas.dataset.mimiLivePreview='true';
    Object.assign(liveCanvas.style,{position:'fixed',pointerEvents:'none',zIndex:'100',margin:'0',border:'0'});
    document.body.appendChild(liveCanvas);
  }
  const rect=surface.canvas.getBoundingClientRect();
  liveCanvas.dataset.previewState=stroke?'stroke':'hover';
  Object.assign(liveCanvas.style,{display:'block',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
  if(liveCanvas.width!==surface.canvas.width)liveCanvas.width=surface.canvas.width;
  if(liveCanvas.height!==surface.canvas.height)liveCanvas.height=surface.canvas.height;
  const drawing=liveCanvas.getContext('2d');
  drawing.setTransform(1,0,0,1,0,0);drawing.clearRect(0,0,liveCanvas.width,liveCanvas.height);
  drawing.setTransform(surface.transform);drawing.save();
  try{
    if(stroke){if(stroke.plan)renderMountain(drawing,surface.info);else renderGrassPreview(drawing,surface.info);}
    else{
      const map=ctxRef.map.info(target.mapId);
      if(map)renderMask(drawing,surface.info,mode==='sample'?[hover]:footprint(hover,diameter,shape,map),'rgba(170,250,200,0.15)',mode==='sample'?'#5ebeff':'#c8ffdc');
    }
  }
  finally{drawing.restore();}
}
function disposeLivePreview(){hostEpoch++;liveCanvas?.remove();liveCanvas=null;hostBridge=null;}

// Map042 实际样本：实心岩面在第一层，轮廓在第二层。高度与绘图层分开。
const OUTER=new Set([1168,1169,1170,1176,1178,1184,1185,1186]);
const CORNERS=new Set([1192,1193,1200,1201]);
const EDGES=new Set([...OUTER,...CORNERS]);
const LEFT=new Set([1168,1176,1184]);
const RIGHT=new Set([1170,1178,1186]);
const key=(x,y)=>`${x},${y}`,xy=k=>k.split(',').map(Number);
const neighbors=[[0,-1],[1,0],[0,1],[-1,0]];
const grass=id=>id>=385&&id<=389;

function raster(footprint,width,height){
  const tiles=new Map(),errors=new Map();
  // Beyond the map edge, continue the occupied boundary tile rather than
  // inventing a cliff wall where the visible map is cut off.
  const has=(x,y)=>footprint.has(key(Math.max(0,Math.min(width-1,x)),Math.max(0,Math.min(height-1,y))));
  for(const k of footprint){
    const [x,y]=xy(k),n=has(x,y-1),e=has(x+1,y),s=has(x,y+1),w=has(x-1,y);
    const issue=message=>errors.set(k,{x,y,message});
    if(x<0||y<0||x>=width||y>=height)issue('山体超出地图');
    if((!n&&!s)||(!e&&!w))issue('此处过窄，无法同时收住两侧边缘，请加宽');
    let id=1177;
    if(!n)id=!w?1168:!e?1170:1169;
    else if(!s)id=!w?1184:!e?1186:1185;
    else if(!w)id=1176;
    else if(!e)id=1178;
    else{
      const missing=[[x-1,y-1,1201],[x+1,y-1,1200],[x-1,y+1,1193],[x+1,y+1,1192]].filter(([a,b])=>!has(a,b));
      if(missing.length>1)issue('此处有多个内角挤在一格，请加宽');
      if(missing.length)id=missing[0][2];
    }
    tiles.set(k,{x,y,id,outer:OUTER.has(id)});
  }
  return {footprint,tiles,errors};
}

function combine(levels,width,height){
  const rasters=levels.map(cells=>raster(cells,width,height));
  const lower=rasters[0]||raster(new Set(),width,height);
  const errors=new Map(rasters.flatMap(r=>[...r.errors])),tiles=new Map();
  for(const [k,t] of lower.tiles){
    let rock=!t.outer;
    // Map042 (18,35)=1192，紧接的(18,36)=1178下面仍是1177。
    // 凹口垂直侧沿延续内角下方的岩面，到下角才收住。
    if(t.id===1178||t.id===1176){
      let y=t.y-1;
      while(lower.tiles.get(key(t.x,y))?.id===t.id)y--;
      if(lower.tiles.get(key(t.x,y))?.id===(t.id===1178?1192:1193))rock=true;
    }
    tiles.set(k,{...t,rock,edge:t.id===1177?0:t.id});
  }
  for(let level=1;level<rasters.length;level++)for(const [k,t] of rasters[level].tiles){
    // 每一级高台只在紧邻的下一级纯岩面内叠放；绘图层始终只有0/1。
    if(rasters[level-1].tiles.get(k)?.id!==1177)errors.set(k,{x:t.x,y:t.y,message:'高台要画在当前台面内部，不能压住下一级边缘'});
    tiles.set(k,{...t,rock:true,edge:t.id===1177?0:t.id});
  }
  return {levels,tiles,errors,footprint:lower.footprint};
}

function components(cells){
  const unseen=new Set(cells),out=[];
  while(unseen.size){
    const stack=[unseen.values().next().value],component=new Set();unseen.delete(stack[0]);
    while(stack.length){const k=stack.pop();component.add(k);const [x,y]=xy(k);
      for(const [a,b] of neighbors){const p=key(x+a,y+b);if(unseen.delete(p))stack.push(p);}}
    out.push(component);
  }
  return out;
}

function borderStartDepth(snapshot,y){
  const {width,read}=snapshot;
  const candidate=x=>{const a=read(0,x,y),b=read(1,x,y);
    return (a===1177&&(b===0||EDGES.has(b)))||(grass(a)&&OUTER.has(b));
  };
  if(!candidate(0))return 0;
  let balance=0,x=0;
  for(;x<width&&candidate(x);x++){
    const id=read(1,x,y);
    if(LEFT.has(id))balance++;
    if(RIGHT.has(id))balance--;
  }
  return x===width?1:Math.max(1,-balance);
}

function readRecognized(snapshot){
  const {width,height,read}=snapshot,candidates=new Set(),foreign=new Set();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=read(0,x,y),b=read(1,x,y),k=key(x,y);
    if((a===1177&&(b===0||EDGES.has(b)))||(grass(a)&&OUTER.has(b)))candidates.add(k);
    else if((a>=1168&&a<=1201)||(b>=1168&&b<=1201))foreign.add(k);
  }
  let levels=[new Set()],accepted=new Set();
  for(const component of components(candidates)){
    const points=[...component].map(xy),x0=Math.min(...points.map(p=>p[0])),x1=Math.max(...points.map(p=>p[0]));
    const y0=Math.min(...points.map(p=>p[1])),y1=Math.max(...points.map(p=>p[1]));
    const depth=new Map();let valid=true,max=0;
    // 岩壁的左侧块使高度+1，右侧块使高度-1；左边贴地图边界时从开放高度开始。
    // 这能分开紧贴的任意多圈轮廓，不依赖单独存储高度元数据。
    for(let y=y0;y<=y1;y++){
      let h=x0===0?borderStartDepth(snapshot,y):0;
      for(let x=x0;x<=x1;x++){
        const k=key(x,y),id=read(1,x,y),inside=component.has(k);
        if(inside&&LEFT.has(id))h++;
        if(inside){if(h<1)valid=false;depth.set(k,h);max=Math.max(max,h);}
        else if(h!==0)valid=false;
        if(inside&&RIGHT.has(id))h--;
        if(h<0)valid=false;
      }
      if(h!==0&&!(x1===width-1&&component.has(key(width-1,y))))valid=false;
    }
    const local=Array.from({length:max},(_,i)=>new Set([...depth].filter(([,h])=>h>i).map(([k])=>k)));
    const rendered=valid?combine(local,width,height):{tiles:new Map(),errors:new Map()};
    const exact=valid&&!rendered.errors.size&&rendered.tiles.size===component.size&&[...rendered.tiles].every(([k,t])=>{
      const [x,y]=xy(k),visible=read(1,x,y);
      // Map042 手工山峦有4格内凹转角使用1169接平顶；允许读取并保留该画法。
      return (t.rock?read(0,x,y)===1177:grass(read(0,x,y)))&&
        (visible===t.edge||(t.rock&&t.edge===1201&&visible===1169));
    });
    for(const k of component)(exact?accepted:foreign).add(k);
    if(exact)for(let i=0;i<local.length;i++){levels[i]??=new Set();for(const k of local[i])levels[i].add(k);}
  }
  return {levels,accepted,foreign};
}

// 两块已有岩体跨过地面相接时，仅重算笔刷与接缝周围的可见外轮廓。
// 旧岩体可能含下挖坑；远处的坑壁/坑底必须保持原图块，不参与整图重绘。
function planConnection(snapshot,brush,old,ground){
  const {width,height,read}=snapshot,existing=new Set();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=read(0,x,y),b=read(1,x,y);
    if((a===1177&&(b===0||EDGES.has(b)))||(grass(a)&&OUTER.has(b)))existing.add(key(x,y));
  }
  const touched=components(existing).filter(component=>[...brush].some(k=>{
    if(!component.has(k))return false;
    const [x,y]=xy(k);return grass(read(0,x,y))&&OUTER.has(read(1,x,y));
  }));
  if(!touched.length||!touched.some(component=>[...component].some(k=>old.foreign.has(k))))return null;
  // 只从地图外侧可达的地面向外延伸；坑底虽然也是草地，却不是连接通道。
  const exterior=new Set(),queue=[];
  for(let y=0;y<height;y++)for(const x of [0,width-1]){const k=key(x,y);if(!existing.has(k)&&!exterior.has(k)){exterior.add(k);queue.push([x,y]);}}
  for(let x=0;x<width;x++)for(const y of [0,height-1]){const k=key(x,y);if(!existing.has(k)&&!exterior.has(k)){exterior.add(k);queue.push([x,y]);}}
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of neighbors){
    const nx=x+dx,ny=y+dy,k=key(nx,ny);
    if(nx<0||ny<0||nx>=width||ny>=height||existing.has(k)||exterior.has(k))continue;
    exterior.add(k);queue.push([nx,ny]);
  }}
  if(![...brush].some(k=>exterior.has(k)))return null;
  const footprint=new Set([...existing,...brush]),result=combine([footprint],width,height);
  const affected=new Set();
  for(const k of brush){const [x,y]=xy(k);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)affected.add(key(x+dx,y+dy));}
  const conflicts=new Map(),changes=[],renderCells=new Map();
  const oldOuter=k=>{const [x,y]=xy(k);return grass(read(0,x,y))&&OUTER.has(read(1,x,y));};
  for(const [k,error] of result.errors)if(affected.has(k)&&(brush.has(k)||oldOuter(k)))conflicts.set(k,error);
  for(const k of brush){const [x,y]=xy(k);if(x<0||y<0||x>=width||y>=height)conflicts.set(k,{x,y,message:'连接笔迹超出地图'});}
  for(const k of affected){
    if(!footprint.has(k))continue;
    const [x,y]=xy(k);if(x<0||y<0||x>=width||y>=height)continue;
    if(!brush.has(k)&&!oldOuter(k))continue;
    // 岩面上的轮廓属于已画好的高台或坑壁；连接底座不能擦掉它们。
    if(read(0,x,y)===1177&&read(1,x,y)!==0)continue;
    const target=result.tiles.get(k);if(!target)continue;
    const before=[read(0,x,y),read(1,x,y)];
    const base=target.rock?1177:grass(before[0])?before[0]:ground;
    const after=[base,target.edge];
    if(before[0]===after[0]&&before[1]===after[1])continue;
    if((!existing.has(k)&&(!grass(before[0])||before[1]!==0))||
       (existing.has(k)&&before[1]!==0&&!EDGES.has(before[1]))){
      conflicts.set(k,{x,y,message:'连接处有不属于岩体的图块'});continue;
    }
    if(read(2,x,y)!==0||snapshot.blocked?.has(k)||snapshot.events?.has(k)){
      conflicts.set(k,{x,y,message:'物件或事件占用，不能覆盖'});continue;
    }
    renderCells.set(k,{x,y,base,edge:after[1]});
    for(let layer=0;layer<2;layer++)if(before[layer]!==after[layer])changes.push({layer,x,y,old:before[layer],value:after[layer]});
  }
  return {levels:old.levels,tiles:result.tiles,footprint,changes,renderCells,conflicts,ground,operation:'add',level:1,connection:true};
}

function plan(snapshot,brush,operation,ground=385,level=1,anchor=null){
  const {width,height,read}=snapshot,old=snapshot.recognized||readRecognized(snapshot);
  if(operation==='add'&&level===1){const bridge=planConnection(snapshot,brush,old,ground);if(bridge)return bridge;}
  const levels=old.levels.map(s=>new Set(s));
  if(level==='raise'||level==='lower'){
    const landing=anchor?key(anchor.x,anchor.y):brush.values().next().value;
    const height=old.levels.reduce((count,s)=>count+Number(s.has(landing)),0);
    const minimum=level==='raise'?1:2;
    level=height>=minimum?(operation==='erase'?height:height+1):0;
  }
  if(!Number.isInteger(level)||level<1)return {levels:old.levels,tiles:new Map(),footprint:old.levels[0],changes:[],renderCells:new Map(),conflicts:new Map([['landing',{x:anchor?.x,y:anchor?.y,message:'请在高台内部落笔'}]]),ground,operation,level};
  while(levels.length<level)levels.push(new Set());
  const selected=levels[level-1];
  for(const k of brush){if(operation==='erase')selected.delete(k);else selected.add(k);}
  while(levels.length>1&&!levels.at(-1).size)levels.pop();
  const next=combine(levels,width,height),previous=combine(old.levels,width,height);
  const conflicts=new Map(next.errors),changes=[],renderCells=new Map();
  const relevant=new Set([...old.accepted,...next.footprint]);
  for(const k of relevant){
    const [x,y]=xy(k);if(x<0||y<0||x>=width||y>=height)continue;
    const before=[read(0,x,y),read(1,x,y)],target=next.tiles.get(k);
    const base=target?.rock?1177:grass(before[0])?before[0]:ground;
    let edge=target?.edge||0;
    // 轮廓形状不变时，不改写 Map042 人工接缝使用的1169。
    if(edge===1201&&before[1]===1169&&previous.tiles.get(k)?.edge===1201)edge=1169;
    const after=[base,edge];
    if(before[0]===after[0]&&before[1]===after[1])continue;
    if(!old.accepted.has(k)&&(old.foreign.has(k)||(!grass(before[0])&&before[0]!==0)||before[1]!==0)){
      conflicts.set(k,{x,y,message:'原有地形不符合此山体模板，不能覆盖'});continue;
    }
    if(read(2,x,y)!==0||snapshot.blocked?.has(k)||snapshot.events?.has(k)){
      conflicts.set(k,{x,y,message:'物件或事件占用，不能覆盖'});continue;
    }
    renderCells.set(k,{x,y,base,edge:after[1]});
    for(let layer=0;layer<2;layer++)if(before[layer]!==after[layer])changes.push({layer,x,y,old:before[layer],value:after[layer]});
  }
  if(operation==='erase')for(const k of brush)if(old.foreign.has(k)){
    const [x,y]=xy(k);conflicts.set(k,{x,y,message:'此处不是受支持的单双层山体，请保留原地形'});
  }
  if(level>1&&operation==='add'&&anchor&&read(1,anchor.x,anchor.y)!==0)
    conflicts.set(key(anchor.x,anchor.y),{x:anchor.x,y:anchor.y,message:'请在岩壁围成的平坦台面内落笔，不能从边缘起笔'});
  return {...next,previous,changes,renderCells,conflicts,ground,operation,level};
}
const Mountain={raster,combine,readRecognized,plan,borderStartDepth,key,xy,OUTER,EDGES};


// Map042 Outside terrain additions. Changes are plans only; the host commits them
// as one native cross-layer transaction after the preview has been validated.
function createFeatures(Mountain){
const FKEY=(x,y)=>`${x},${y}`;
const FXY=k=>k.split(',').map(Number);
const FGRASS=id=>id>=385&&id<=389;
const WATER=new Set([1088,1089,1090,1092,1096,1097,1098,1104,1106]);
const WATER_BANK=new Set([1233,1234]);

function heightAt(snapshot,x,y){
  let height=Mountain.borderStartDepth(snapshot,y);
  for(let col=0;col<=x;col++){
    const edge=snapshot.read(1,col,y);
    if(Mountain.EDGES.has(edge)&&[1168,1176,1184].includes(edge))height++;
    if([1170,1178,1186].includes(edge))height--;
  }
  return Math.max(0,height);
}
function outsideGround(snapshot,x,y,fallback){
  let height=Mountain.borderStartDepth(snapshot,y),last=fallback,entrance=fallback;
  for(let col=0;col<=x;col++){
    const edge=snapshot.read(1,col,y),base=snapshot.read(0,col,y);
    if(height===0&&FGRASS(base)&&edge===0)last=base;
    if([1168,1176,1184].includes(edge)){
      if(height===0)entrance=last;
      height++;
    }
    if([1170,1178,1186].includes(edge))height--;
  }
  return entrance;
}
function conflict(map,x,y,message){map.set(FKEY(x,y),{x,y,message});}
function occupied(snapshot,x,y){
  const k=FKEY(x,y);
  return snapshot.read(2,x,y)!==0||snapshot.blocked?.has(k)||snapshot.events?.has(k);
}
function emptyPlan(snapshot,brush,label){
  return {changes:[],renderCells:new Map(),conflicts:new Map(),footprint:brush,
          level:0,feature:label};
}

function planDig(snapshot,brush,ground,origin){
  const {width,height,read}=snapshot,p=emptyPlan(snapshot,brush,'下挖一层');
  const anchor=origin||FXY(brush.values().next().value||'0,0').reduce((o,n,i)=>(o[i?'y':'x']=n,o),{});
  const x0=anchor.x,y0=anchor.y;
  if(x0<0||y0<0||x0>=width||y0>=height){conflict(p.conflicts,x0,y0,'请在平坦岩面内起笔');return p;}
  const currentHeight=heightAt(snapshot,x0,y0);
  p.level=currentHeight-1;
  if(currentHeight<1||read(0,x0,y0)!==1177||read(1,x0,y0)!==0){
    conflict(p.conflicts,x0,y0,'请在岩壁围成的平坦岩面内起笔；已有坑底可再下挖一层');return p;
  }
  const floor=currentHeight===1?outsideGround(snapshot,x0,y0,ground):1177;
  p.ground=floor;
  const has=(x,y)=>brush.has(FKEY(x,y));
  for(const k of brush){
    const [x,y]=FXY(k);
    if(x<0||y<0||x>=width||y>=height){conflict(p.conflicts,x,y,'下挖超出地图');continue;}
    if(read(0,x,y)!==1177||read(1,x,y)!==0||heightAt(snapshot,x,y)!==currentHeight){
      conflict(p.conflicts,x,y,'下挖笔迹必须留在同一级平坦岩面内');continue;
    }
    if(occupied(snapshot,x,y)){conflict(p.conflicts,x,y,'事件或第三层物件占用，不能下挖');continue;}
    const n=has(x,y-1),e=has(x+1,y),s=has(x,y+1),w=has(x-1,y);
    if((!n&&!s)||(!e&&!w)){conflict(p.conflicts,x,y,'坑至少宽、高各三格，才能围出内壁');continue;}
    let edge=0,base=floor;
    if(!n){edge=!w?1192:!e?1193:1185;}
    else if(!s){edge=floor===1177?1169:1200;base=1177;}
    else if(!w)edge=1178;
    else if(!e){edge=1176;if(floor!==1177&&!has(x,y+2))base=1177;}
    else{
      // The one documented pit motif is axis-aligned. A diagonal cavity needs
      // different corner artwork, so stop instead of inventing a tile.
      const gaps=[[x-1,y-1],[x+1,y-1],[x-1,y+1],[x+1,y+1]].filter(([a,b])=>!has(a,b));
      if(gaps.length)conflict(p.conflicts,x,y,'此凹角的下挖图块尚未在 Map042 验证，请改用方形画笔');
    }
    if(base===read(0,x,y)&&edge===read(1,x,y))continue;
    p.renderCells.set(k,{x,y,base,edge});
    for(const [layer,value] of [[0,base],[1,edge]]){
      const old=read(layer,x,y);if(old!==value)p.changes.push({layer,x,y,old,value});
    }
  }
  return p;
}

const isWater=(snapshot,x,y)=>WATER.has(snapshot.read(0,x,y))&&snapshot.read(1,x,y)===0;
function exteriorGround(snapshot){
  const {width,height,read}=snapshot,reachable=new Set(),queue=[];
  const open=(x,y)=>read(0,x,y)!==1177&&!Mountain.EDGES.has(read(1,x,y));
  const push=(x,y)=>{const k=FKEY(x,y);if(x>=0&&y>=0&&x<width&&y<height&&!reachable.has(k)&&open(x,y)){
    reachable.add(k);queue.push([x,y]);
  }};
  for(let x=0;x<width;x++){push(x,0);push(x,height-1);}
  for(let y=0;y<height;y++){push(0,y);push(width-1,y);}
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])push(x+dx,y+dy);
  }
  return reachable;
}
function nearbyGround(snapshot,brush,fallback){
  const queue=[...brush].map(FXY),seen=new Set(brush);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];
    if(x<0||y<0||x>=snapshot.width||y>=snapshot.height)continue;
    const base=snapshot.read(0,x,y);
    if(FGRASS(base)&&snapshot.read(1,x,y)===0)return base;
    for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){
      const nx=x+dx,ny=y+dy,k=FKEY(nx,ny);
      if(nx>=0&&ny>=0&&nx<snapshot.width&&ny<snapshot.height&&!seen.has(k)){
        seen.add(k);queue.push([nx,ny]);
      }
    }
  }
  return fallback;
}
function waterTile(has,x,y){
  const n=has(x,y-1),e=has(x+1,y),s=has(x,y+1),w=has(x-1,y);
  if(!n)return !w?1088:!e?1090:1089;
  if(!w)return has(x-1,y-1)?1092:1096;
  if(!e)return 1098;
  if(!has(x+1,y-1))return 1106;
  if(!has(x-1,y-1))return 1104;
  return 1097;
}
function planWater(snapshot,brush,ground,erase=false){
  const {width,height,read}=snapshot,p=emptyPlan(snapshot,brush,erase?'擦除水坑':'绘制水坑');
  ground=nearbyGround(snapshot,brush,ground);p.ground=ground;
  const outside=exteriorGround(snapshot);
  const old=new Set();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(isWater(snapshot,x,y))old.add(FKEY(x,y));
  const next=new Set(old);
  for(const k of brush){if(erase)next.delete(k);else next.add(k);}
  const has=(x,y)=>next.has(FKEY(x,y));
  const oldHas=(x,y)=>old.has(FKEY(x,y));
  const adjacent=new Set();
  for(const k of brush){const [x,y]=FXY(k);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)adjacent.add(FKEY(x+dx,y+dy));}
  const proposed=new Map();
  for(const k of adjacent){
    const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height)continue;
    if(has(x,y))proposed.set(k,waterTile(has,x,y));
  }
  // A shoreline row sits just south of the water footprint, on ordinary grass.
  for(const k of adjacent){
    const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height||has(x,y))continue;
    if(has(x,y-1))proposed.set(k,has(x+1,y)?1234:1233);
  }
  // The stepped lower-left corner in Map042 has one extra shoreline cap.
  for(const k of adjacent){
    const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height||has(x,y)||proposed.has(k))continue;
    if(has(x+1,y-1)&&!has(x+1,y)&&!has(x,y-1)&&has(x,y-2))proposed.set(k,1233);
  }
  for(const k of adjacent){
    const [x,y]=FXY(k),before=read(0,x,y),oldWater=oldHas(x,y),oldBank=WATER_BANK.has(before)&&read(1,x,y)===0;
    if(!brush.has(k)&&!oldWater&&!oldBank&&!proposed.has(k))continue;
    const target=proposed.get(k);
    if(target===undefined&&!oldWater&&!oldBank)continue;
    if(occupied(snapshot,x,y)){conflict(p.conflicts,x,y,'事件或第三层物件占用，不能画水坑');continue;}
    if(read(1,x,y)!==0){conflict(p.conflicts,x,y,'水坑只允许画在普通草地，不能压住第二层图块');continue;}
    if(!FGRASS(before)&&!oldWater&&!oldBank){
      conflict(p.conflicts,x,y,'水坑只允许画在普通草地，不能覆盖山体或其他地形');continue;
    }
    const value=target??ground;
    if(before===value)continue;
    p.renderCells.set(k,{x,y,base:value,edge:0});
    p.changes.push({layer:0,x,y,old:before,value});
  }
  // Attempting to paint over incompatible terrain is a whole-stroke failure.
  for(const k of brush){const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height)conflict(p.conflicts,x,y,'水坑超出地图');}
  for(const k of brush)if(!outside.has(k)){
    const [x,y]=FXY(k);conflict(p.conflicts,x,y,'水坑只画在山体外的普通草地，不能画进下挖坑底');
  }
  return p;
}
function planExpand(snapshot,brush,ground,origin){
  const {width,height,read}=snapshot,p=emptyPlan(snapshot,brush,'扩展高台');
  const first=brush.values().next().value;
  const [fx,fy]=first?FXY(first):[-1,-1],anchor=origin||{x:fx,y:fy};
  const {x:ax,y:ay}=anchor,ak=FKEY(ax,ay);
  if(ax<0||ay<0||ax>=width||ay>=height){conflict(p.conflicts,ax,ay,'请在已有高台的平坦岩面内起笔');return p;}
  const level=heightAt(snapshot,ax,ay);p.level=level;p.feature=`扩展第 ${level} 级高台`;
  if(level<2||read(0,ax,ay)!==1177||read(1,ax,ay)!==0){
    conflict(p.conflicts,ax,ay,'请在已有高台的平坦岩面内起笔');return p;
  }
  const recognized=snapshot.recognized||Mountain.readRecognized(snapshot);
  if(recognized.accepted.has(ak)){
    const targetLevel=recognized.levels.reduce((n,c)=>n+Number(c.has(ak)),0);
    if(targetLevel!==level){conflict(p.conflicts,ax,ay,'此高台的层级无法可靠识别');return p;}
    const planned=Mountain.plan({...snapshot,recognized},brush,'add',ground,level,null);
    planned.feature=p.feature;
    for(const c of planned.conflicts.values())if(c.message==='高台要画在当前台面内部，不能压住下一级边缘')
      c.message='请先扩宽下一级平坦岩面，再扩展这一层';
    return planned;
  }
  // 手绘/已下挖的山体可能不能按完整模板回读。只在起笔台面的外沿
  // 重算局部接缝，不触碰被包围的坑、其他高度的墙和远处图块。
  const cache=new Map(),at=(x,y)=>{
    const k=FKEY(x,y);if(!cache.has(k))cache.set(k,heightAt(snapshot,x,y)+Number([1170,1178,1186].includes(read(1,x,y))));return cache.get(k);
  };
  const old=new Set(),stack=[ak];old.add(ak);
  for(let i=0;i<stack.length;i++){
    const [x,y]=FXY(stack[i]);
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
      const nx=x+dx,ny=y+dy,k=FKEY(nx,ny);
      if(nx<0||ny<0||nx>=width||ny>=height||old.has(k)||read(0,nx,ny)!==1177||at(nx,ny)<level)continue;
      old.add(k);stack.push(k);
    }
  }
  const exterior=new Set(),queue=[];
  const visit=(x,y)=>{const k=FKEY(x,y);if(x>=0&&y>=0&&x<width&&y<height&&!old.has(k)&&!exterior.has(k)){
    exterior.add(k);queue.push(k);
  }};
  for(let x=0;x<width;x++){visit(x,0);visit(x,height-1);}
  for(let y=0;y<height;y++){visit(0,y);visit(width-1,y);}
  for(let i=0;i<queue.length;i++){
    const [x,y]=FXY(queue[i]);for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])visit(x+dx,y+dy);
  }
  for(const k of brush){
    const [x,y]=FXY(k);
    if(x<0||y<0||x>=width||y>=height){conflict(p.conflicts,x,y,'扩展超出地图');continue;}
    if(occupied(snapshot,x,y)){conflict(p.conflicts,x,y,'事件或第三层物件占用，不能扩展');continue;}
    if(old.has(k)){
      if(at(x,y)>level)conflict(p.conflicts,x,y,'不能覆盖更高一级的岩壁或台面');
      continue;
    }
    if(!exterior.has(k)){conflict(p.conflicts,x,y,'不能用扩展高台填平下挖坑');continue;}
    if(read(0,x,y)!==1177||read(1,x,y)!==0||at(x,y)!==level-1)
      conflict(p.conflicts,x,y,'请先扩宽下一级平坦岩面，再扩展这一层');
  }
  if(p.conflicts.size)return p;
  const footprint=new Set([...old,...brush]);
  const rendered=Mountain.raster(footprint,width,height),affected=new Set();
  for(const k of brush){
    const [x,y]=FXY(k);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)affected.add(FKEY(x+dx,y+dy));
  }
  for(const [k,c] of rendered.errors)if(affected.has(k))p.conflicts.set(k,c);
  for(const k of affected){
    if(!footprint.has(k))continue;
    const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height)continue;
    const before=read(1,x,y),target=rendered.tiles.get(k)?.id;
    if(target===undefined)continue;
    const edge=target===1177?0:target;
    if(old.has(k)&&at(x,y)>level)continue;
    if(old.has(k)&&before!==0&&!Mountain.EDGES.has(before)){
      conflict(p.conflicts,x,y,'已有岩壁图块不属于已验证模板，不能覆盖');continue;
    }
    if(old.has(k)&&before!==edge){
      const touchesOutside=[[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>exterior.has(FKEY(x+dx,y+dy)));
      if(!touchesOutside){conflict(p.conflicts,x,y,'扩展会改变内部坑壁或相邻高台，请缩小笔迹');continue;}
    }
    if(occupied(snapshot,x,y)){conflict(p.conflicts,x,y,'事件或第三层物件占用，不能扩展');continue;}
    const base=1177;
    if(read(0,x,y)===base&&before===edge)continue;
    p.renderCells.set(k,{x,y,base,edge});
    if(read(0,x,y)!==base)p.changes.push({layer:0,x,y,old:read(0,x,y),value:base});
    if(before!==edge)p.changes.push({layer:1,x,y,old:before,value:edge});
  }
  return p;
}
return {planDig,planWater,planExpand,heightAt,outsideGround,WATER,WATER_BANK};
}

const Features=createFeatures(Mountain);
// Outside road and fence tools. Plans are preview-only until the host commits
// the complete change list through its native undo transaction.
function createSurfaceTools(){
  const key=(x,y)=>`${x},${y}`;
  const xy=k=>k.split(',').map(Number);
  const grass=id=>id>=385&&id<=389;
  const sandIds=new Set([537,538,539,540,542,545,546,547,553,554,555,556,558]);
  const roadOffsets={brown:-56,yellow:0,gray:56,city:112};
  const roadStyles=Object.fromEntries(Object.entries(roadOffsets).map(([name,offset])=>[name,new Set([...sandIds].map(id=>id+offset))]));
  const cityTransitions=new Set([699,700,707,708]);
  const roadIds=new Set([...Object.values(roadStyles).flatMap(set=>[...set]),...cityTransitions]);
  const fenceIds=new Set([1656,1657,1658,1659,1660,1661,1662,1663,1664,1665,1666,
    1672,1673,1674,1675,1676,1677,1678,1679,1680,1681,1682]);
  const fenceArtwork=id=>id>=1656&&id<=1697;
  const fenceGround=id=>grass(id)||roadIds.has(id)||[1232,1233,1234].includes(id);
  const inside=(s,x,y)=>x>=0&&y>=0&&x<s.width&&y<s.height;
  const read=(s,z,x,y)=>inside(s,x,y)?s.read(z,x,y):0;
  const occupied=(s,x,y)=>read(s,2,x,y)!==0||s.blocked?.has(key(x,y))||s.events?.has(key(x,y));
  const plan=(brush,feature)=>({changes:[],renderCells:new Map(),conflicts:new Map(),footprint:brush,feature,level:0});
  const conflict=(p,x,y,message)=>p.conflicts.set(key(x,y),{x,y,message});
  const around=(brush,radius=1)=>{
    const result=new Set();
    for(const k of brush){const [x,y]=xy(k);
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)result.add(key(x+dx,y+dy));
    }
    return result;
  };
  const maskFrom=(s,z,predicate)=>{
    const set=new Set();
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)if(predicate(read(s,z,x,y)))set.add(key(x,y));
    return set;
  };
  const atBoundary=(set,s,x,y)=>set.has(key(Math.min(s.width-1,Math.max(0,x)),Math.min(s.height-1,Math.max(0,y))));

  function sandTile(set,s,x,y){
    const has=(a,b)=>atBoundary(set,s,a,b);
    const n=has(x,y-1),e=has(x+1,y),south=has(x,y+1),w=has(x-1,y);
    if((!n&&!south)||(!e&&!w))return {error:'沙地过窄；请至少画出两格宽的连续区域'};
    if(!n)return {id:!w?537:!e?539:538};
    if(!south)return {id:!w?553:!e?555:554};
    if(!w)return {id:545};
    if(!e)return {id:547};
    const holes=[[-1,-1,558],[1,-1,556],[-1,1,542],[1,1,540]].filter(([dx,dy])=>!has(x+dx,y+dy));
    if(holes.length>1)return {error:'此格有多个内凹角，Map023 没有对应的已验证拼法；请加宽沙地'};
    return {id:holes[0]?.[2]??546};
  }
  function nearbyGrass(s,x,y,fallback){
    const seen=new Set([key(x,y)]),queue=[[x,y]];
    for(let i=0;i<queue.length&&i<256;i++){
      const [cx,cy]=queue[i],base=read(s,0,cx,cy);
      if(grass(base)&&read(s,1,cx,cy)===0)return base;
      for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){
        const nx=cx+dx,ny=cy+dy,k=key(nx,ny);
        if(inside(s,nx,ny)&&!seen.has(k)){seen.add(k);queue.push([nx,ny]);}
      }
    }
    return grass(fallback)?fallback:385;
  }
  const roadSignature=(set,s,x,y)=>{
    let bits='';for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)bits+=atBoundary(set,s,x+dx,y+dy)?'1':'0';
    return bits;
  };
  function planSand(s,brush,ground=385,erase=false,style='yellow'){
    const p=plan(brush,erase?'擦除道路':'绘制道路');
    const styleIds=roadStyles[style];
    if(!styleIds)throw Error(`未知道路样式：${style}`);
    const offset=roadOffsets[style],isCity=style==='city';
    const old=maskFrom(s,0,id=>styleIds.has(id)||(isCity&&cityTransitions.has(id))),next=new Set(old);
    for(const k of brush){
      const [x,y]=xy(k),special=isCity&&cityTransitions.has(read(s,0,x,y));
      if(erase&&!special)next.delete(k);
      else if(!erase)next.add(k);
    }
    const affected=around(brush);
    for(const k of brush){const [x,y]=xy(k);
      if(!inside(s,x,y)){conflict(p,x,y,'沙地超出地图');continue;}
      const base=read(s,0,x,y);
      if(erase&&isCity&&cityTransitions.has(base))conflict(p,x,y,'此处是城市道路特殊缺口，暂不支持自动擦除');
      if(!erase&&!grass(base)&&!styleIds.has(base)&&!(isCity&&cityTransitions.has(base)))conflict(p,x,y,'道路只能画在普通草地或同一样式的道路上');
    }
    for(const k of affected){const [x,y]=xy(k);
      if(!inside(s,x,y)||(!old.has(k)&&!next.has(k)))continue;
      const base=read(s,0,x,y);
      if(isCity&&cityTransitions.has(base))continue;
      const unchanged=old.has(k)&&next.has(k)&&roadSignature(old,s,x,y)===roadSignature(next,s,x,y);
      const picked=next.has(k)?unchanged?{id:base}:sandTile(next,s,x,y):{id:nearbyGrass(s,x,y,ground)};
      if(picked.error){conflict(p,x,y,picked.error);continue;}
      const value=next.has(k)&&!unchanged?picked.id+offset:picked.id;
      if(value===base)continue;
      if(read(s,1,x,y)!==0||occupied(s,x,y)){
        conflict(p,x,y,'沙地修改处有第二、第三层图块或事件；请先清理该格');continue;
      }
      p.changes.push({layer:0,x,y,old:base,value});
      p.renderCells.set(k,{x,y,base:value,edge:0});
    }
    return p;
  }

  // East is the inside of a vertical section for 1664; west for 1665.
  const eastSide=new Set([1656,1658,1660,1663,1664,1666,1672,1674,1676,1679]);
  const westSide=new Set([1657,1659,1661,1662,1665,1673,1675,1677,1678]);
  const sideFromId=id=>eastSide.has(id)?'east':westSide.has(id)?'west':null;
  const sig=(set,x,y)=>[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>set.has(key(x+dx,y+dy)));
  const sigText=a=>a.map(Boolean).join('');
  function directedSides(path,insideSide){
    const sides=new Map(),errors=new Set();
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i];
      if(a.x!==b.x||Math.abs(a.y-b.y)!==1)continue;
      const side=(b.y<a.y)===(insideSide==='right')?'east':'west';
      for(const c of [a,b]){const k=key(c.x,c.y),old=sides.get(k);
        if(old&&old!==side)errors.add(k);
        sides.set(k,side);
      }
    }
    return {sides,errors};
  }
  function fenceTile(s,old,next,x,y,pathSide){
    const k=key(x,y),[n,e,south,w]=sig(next,x,y),degree=Number(n)+Number(e)+Number(south)+Number(w);
    if(degree>3)return {error:'此处四向交叉没有已验证的图块，请分开绘制'};
    const oldId=read(s,1,x,y);
    if(old.has(k)&&sigText(sig(old,x,y))===sigText([n,e,south,w]))return {id:oldId};
    const own=sideFromId(oldId);
    const neighborSide=()=>{
      for(const yy of [y-1,y+1]){
        const nk=key(x,yy);
        if(!next.has(nk))continue;
        const found=sideFromId(read(s,1,x,yy))||pathSide.get(nk);
        if(found)return found;
      }
      return null;
    };
    const side=own||pathSide.get(k)||neighborSide()||'east';
    // Map042 (36,62)=1675: north-facing vertical end overlaps an east-west
    // fence on layer 2. Map007 (30,22)=1676 is the mirrored east-side piece.
    if(n&&e&&w&&!south)return {id:side==='east'?1676:1675};
    // Map083 (17,49)=1659, Map007 (30,16)=1660 (left end hidden by a building).
    if(!n&&e&&w&&south)return {id:side==='east'?1660:1659};
    // Map039/040 (7,11)=1666 branches east from the east-facing vertical line.
    if(n&&e&&south&&!w&&side==='east')return {id:1666};
    if(degree>2)return {error:'此三向接点尚无已验证的图块，请调整连接方向'};
    if(n&&south)return {id:side==='east'?1664:1665};
    if(e&&w)return {id:1681};
    if(e&&south)return {id:side==='east'?1658:1662};
    if(south&&w)return {id:side==='east'?1663:1661};
    if(n&&e)return {id:side==='east'?1674:1678};
    if(n&&w)return {id:side==='east'?1679:1677};
    if(south)return {id:side==='east'?1656:1657};
    if(n)return {id:side==='east'?1672:1673};
    if(e)return {id:x===0?1681:1680};
    if(w)return {id:x===s.width-1?1681:1682};
    return {id:1681};
  }
  function planFence(s,brush,path=[],insideSide='right',erase=false){
    const p=plan(brush,erase?'擦除栅栏':'绘制栅栏');
    const old=maskFrom(s,1,fenceArtwork),next=new Set(old),direction=directedSides(path,insideSide);
    for(const k of brush){if(erase)next.delete(k);else next.add(k);}
    for(const k of direction.errors){const [x,y]=xy(k);conflict(p,x,y,'笔画在这里折返，栅栏内侧方向不一致');}
    const affected=around(brush);
    for(const k of brush){const [x,y]=xy(k);
      if(!inside(s,x,y)){conflict(p,x,y,'栅栏超出地图');continue;}
      if(erase)continue;
      const base=read(s,0,x,y),top=read(s,1,x,y);
      if(fenceArtwork(top))continue; // Existing Map028 fences may sit under a third-layer tree.
      if(!fenceGround(base))conflict(p,x,y,'栅栏目前只支持草地、沙地和水岸地面');
      if(top!==0&&!fenceArtwork(top))conflict(p,x,y,'第二层已有其他图块，不能覆盖');
      if(occupied(s,x,y))conflict(p,x,y,'第三层图块或事件占用，不能画栅栏');
    }
    for(const k of affected){const [x,y]=xy(k);
      if(!inside(s,x,y)||(!old.has(k)&&!next.has(k)))continue;
      const before=read(s,1,x,y),selected=next.has(k)?fenceTile(s,old,next,x,y,direction.sides):{id:0};
      if(selected.error){conflict(p,x,y,selected.error);continue;}
      const value=selected.id;
      if(value===before)continue;
      if(!fenceGround(read(s,0,x,y))||occupied(s,x,y)){
        conflict(p,x,y,'栅栏接缝处地面或上层被其他图块占用');continue;
      }
      p.changes.push({layer:1,x,y,old:before,value});
      // Draw ground first to clear the old fence during a held-stroke preview.
      p.renderCells.set(k,{x,y,base:read(s,0,x,y),edge:value});
    }
    return p;
  }
  return {planSand,planFence,sandTile,sandIds,roadStyles,roadIds,cityTransitions,fenceIds,fenceArtwork};
}

const Surface=createSurfaceTools();

// 山体使用真实图块重建高度范围，撤销、重做和重新打开地图后不依赖隐藏缓存。
let terrain = "grass";
const terrainNames = { grass: "草地", mountain: "单层山体", upper: "叠加高台", erase: "擦除底座", eraseUpper: "擦除高台", expand: "扩展高台", dig: "下挖一层", water: "绘制水坑", eraseWater: "擦除水坑", sand: "绘制道路", eraseSand: "擦除道路", fence: "绘制栅栏", eraseFence: "擦除栅栏" };
const atlasCache=new Map();
function requestAtlas(id){
  if(!hostBridge)return;
  const mapId=ctxRef.editor.activeMapId(),atlas=hostBridge.renderer.l(mapId);
  if(atlas?.tilesetBitmap)atlasCache.set(id,{image:atlas.tilesetBitmap,columns:atlas.tilesetColumns});
}
function previewTile(drawing,info,atlas,id,x,y){
  if(id<384)return;
  const n=id-384,size=info.tileSize;
  drawing.drawImage(atlas,n%(atlas.width/32)*32,Math.floor(n/(atlas.width/32))*32,32,32,x*size-info.viewportX,y*size-info.viewportY,size,size);
}
function renderGrassPreview(drawing,info){
  const atlas=atlasCache.get(stroke.tilesetId)?.image;
  if(!atlas){renderMask(drawing,info,stroke.cells.values(),'rgba(90,225,140,0.38)');return;}
  drawing.globalAlpha=1;drawing.imageSmoothingEnabled=false;
  for(const c of stroke.cells.values())previewTile(drawing,info,atlas,stroke.tileId,c.x,c.y);
}
function mountainSnapshot(mapId) {
  const map = ctxRef.map.info(mapId);
  const atlas = ctxRef.tileset?.info(map.tilesetId);
  if (!atlas || !/^Outside(?:\.png)?$/i.test(atlas.tilesetName)) throw Error("山体工具目前只支持 Outside 图块组。");
  const layers = ctxRef.map.layers(mapId);
  if (![0,1,2].every(z => layers.some(l => l.index === z && l.kind === "native" && (z === 2 || l.visible))))
    throw Error("请显示第一、第二原生图层后绘制山体。");
  if (typeof ctxRef.events?.list !== "function") throw Error("编辑器未提供事件查询接口，不能检查占用位置。");
  const area=map.width*map.height, arrays=new Map(), blocked=new Set();
  for (const layer of layers.filter(l => l.kind === "native" || l.kind === "extended")) {
    const data=new Int32Array(area); arrays.set(layer.index,data);
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++) {
      const id=ctxRef.map.readTile(mapId,layer.index,x,y);data[y*map.width+x]=id;
      if(layer.index>=2&&id!==0)blocked.add(Mountain.key(x,y));
    }
  }
  return {width:map.width,height:map.height,arrays,blocked,
    events:new Set(ctxRef.events.list(mapId).map(e=>Mountain.key(e.x,e.y))),
    read:(z,x,y)=>arrays.get(z)?.[y*map.width+x] || 0};
}
function sameMountainSnapshot(a,b) {
  if(a.arrays.size!==b.arrays.size||a.events.size!==b.events.size)return false;
  if([...a.events].some(k=>!b.events.has(k)))return false;
  for(const [z,data] of a.arrays) {
    const other=b.arrays.get(z);
    if(!other||data.length!==other.length||data.some((id,i)=>id!==other[i]))return false;
  }
  return true;
}
function prepareMountainStroke(pending) {
  if(!hostBridge)throw Error("宿主模块尚未准备好，请稍后落笔。");
  pending.terrain=terrain;
  requestAtlas(pending.tilesetId);
  if(!atlasCache.get(pending.tilesetId)?.image)throw Error("当前地图图块尚未加载，请等待地图显示后再落笔。");
  if(terrain==="grass")return;
  pending.snapshot=mountainSnapshot(pending.mapId);
  if(!["sand","eraseSand","fence","eraseFence"].includes(terrain)) pending.snapshot.recognized=Mountain.readRecognized(pending.snapshot);
  // 仅使用 Outside 的普通草地，避免回填到建筑或调色板透明格。
  pending.ground=grassTileId>=385&&grassTileId<=389?grassTileId:385;
}
function updateMountainPreview() {
  if(stroke.terrain==="grass")return;
  if(stroke.terrain==="sand"||stroke.terrain==="eraseSand") { stroke.plan=Surface.planSand(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.terrain==="eraseSand",stroke.roadStyle); return; }
  if(stroke.terrain==="fence"||stroke.terrain==="eraseFence") { stroke.plan=Surface.planFence(stroke.snapshot,new Set(stroke.cells.keys()),stroke.path,stroke.insideSide,stroke.terrain==="eraseFence"); return; }
  if(stroke.terrain==="expand") { stroke.plan=Features.planExpand(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.origin); return; }
  if(stroke.terrain==="dig") { stroke.plan=Features.planDig(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.origin); return; }
  if(stroke.terrain==="water"||stroke.terrain==="eraseWater") { stroke.plan=Features.planWater(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.terrain==="eraseWater"); return; }
  stroke.plan=Mountain.plan(stroke.snapshot,new Set(stroke.cells.keys()),stroke.terrain.startsWith('erase')?'erase':'add',stroke.ground,
    stroke.terrain==='upper'?'raise':stroke.terrain==='eraseUpper'?'lower':1,stroke.origin);
}
function mountainStrokeStatus() {
  const p=stroke.plan;
  if(p.conflicts.size)return `红色 ${p.conflicts.size} 格不能绘制：${p.conflicts.values().next().value.message}。\n松开将取消整笔；可继续加宽或按 Esc 取消。`;
  return `${p.feature|| (p.connection?"连接同高度山体":`第 ${p.level} 级高度`)} · 实时图块预览 ${stroke.cells.size} 格 · 修改 ${new Set(p.changes.map(c=>Mountain.key(c.x,c.y))).size} 格\n松开提交整笔 / Esc 取消`;
}
function commitMountain(pending) {
  const plan=pending.plan;
  if(plan.conflicts.size){status(`未落笔：${plan.conflicts.values().next().value.message}。`);return;}
  if(!sameMountainSnapshot(pending.snapshot,mountainSnapshot(pending.mapId))) {
    status("预览期间地图或事件已改变，这一笔已取消，请重新绘制。");return;
  }
  if(!plan.changes.length){status("没有需要修改的格子。");return;}
  const label=plan.feature|| (plan.connection?"连接山体":terrainNames[pending.terrain]);
  nativeTransaction(pending.mapId,plan.changes,label);
  status(`${label}完成 · ${new Set(plan.changes.map(c=>Mountain.key(c.x,c.y))).size} 格 · Ctrl+Z 撤销整笔`);
  redraw();
}
function renderMountain(drawing,info) {
  const p=stroke.plan;
  const atlas=atlasCache.get(stroke.tilesetId)?.image;
  drawing.globalAlpha=1;drawing.imageSmoothingEnabled=false;
  if(atlas)for(const c of p.renderCells.values()){
    previewTile(drawing,info,atlas,c.base,c.x,c.y);
    previewTile(drawing,info,atlas,c.edge,c.x,c.y);
  }
  else renderMask(drawing,info,p.renderCells.values(),'rgba(90,225,140,0.38)');
  renderMask(drawing,info,p.conflicts.values(),"rgba(255,55,70,0.6)","#ff7181");
}

/** Procedural Terrain / 程序化地形 v1.0.0 — Pokémon Essentials 原生 Outside 图块组程序化地形工具。 */
const MOD_ID = "com.mimi.procedural-terrain";
const PANEL_ID = `${MOD_ID}.panel`;
const MAX_DIAMETER = 31;
let ctxRef = null, panelRefs = null, inputCleanup = null;
let mode = "idle", hover = null, stroke = null, escapeBinding = null;
let grassTileId = 384, targetLayerIndex = null, sampledTileset = null;
let diameter = 1, shape = "circle", insideSide = "right", roadStyle = "yellow", notice = "先在纯草地上取样。";
const roadStyleNames = { brown: "棕色沙土", yellow: "浅黄沙地", gray: "灰色砂砾", city: "浅灰城市道路" };
const mapSurfaces = new Map(), offsetCache = new Map();

function redraw() { livePreview(); ctxRef?.editor.requestRedraw(); }
function status(message) {
  if (message !== undefined) notice = message;
  if (!panelRefs) return;
  panelRefs.mode.textContent = mode === "idle" ? "已停止" : mode === "sample" ? "点击地图取样" : `${terrainNames[terrain]}画笔已启用`;
  panelRefs.mode.dataset.mode = mode;
  panelRefs.paint.textContent = mode === "paint" ? "停止绘画" : "启用当前画笔";
  panelRefs.paint.dataset.enabled = String(mode === "paint");
  panelRefs.paint.setAttribute("aria-pressed",String(mode === "paint"));
  panelRefs.status.textContent = stroke
    ? (stroke.plan ? mountainStrokeStatus() : `预览 ${stroke.cells.size} 格 · 松开提交 / Esc 取消`)
    : notice;
  panelRefs.target.textContent = terrain === "water" || terrain === "eraseWater" ? "第一层画水面与岸线；只允许普通草地" : terrain === "sand" || terrain === "eraseSand" ? `第一层道路 · ${roadStyleNames[roadStyle]}；同样式自动接边` : terrain === "fence" || terrain === "eraseFence" ? "第二层栅栏；沿笔迹方向判断内侧" : terrain !== "grass" ? "第一层填岩面 · 第二层画轮廓" : `图块 ${grassTileId} · ${targetLayerIndex === null ? "当前图层" : `第 ${targetLayerIndex + 1} 层`}`;
}
function report(error) {
  cancelStroke();
  mode = "idle";
  ctxRef.log.error(error);
  const text = `绘制已停止：${error?.message || String(error)}`;
  status(text);
  ctxRef.ui.showToast({ message: text, level: "error", durationMs: 0 });
}

function brushOffsets(size, form) {
  const key = `${size}:${form}`;
  if (offsetCache.has(key)) return offsetCache.get(key);
  const cells = [], start = -Math.floor((size - 1) / 2), center = (size - 1) / 2;
  // 偶数直径的几何中心位于格子交点，向右/下多半格；预览与落图共用此规则。
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (form === "square" || (x - center) ** 2 + (y - center) ** 2 <= (size / 2) ** 2) {
      cells.push({ x: x + start, y: y + start });
    }
  }
  offsetCache.set(key, cells);
  return cells;
}
function footprint(point, size, form, map) {
  return brushOffsets(size, form).map(o => ({ x: point.x + o.x, y: point.y + o.y }))
    .filter(c => c.x >= 0 && c.y >= 0 && c.x < map.width && c.y < map.height);
}
function lineCells(a, b) {
  const cells = [];
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - x), dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === b.x && y === b.y) return cells;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}
function cancelStroke(message) {
  stroke = null;
  escapeBinding?.dispose();
  escapeBinding = null;
  status(message);
  redraw();
}
function beginStroke(point, pointerId) {
  cancelStroke();
  if(!hostBridge){status("兼容模块尚未准备好，请稍后落笔。");return;}
  const map = ctxRef.map.info(point.mapId);
  const layer = targetLayerIndex ?? ctxRef.editor.activeLayerIndex();
  if (terrain === "grass" && !ctxRef.map.layers(point.mapId).some(l => l.index === layer && l.visible && (l.kind === "native" || l.kind === "extended"))) {
    throw Error("目标图层不可用，请重新取样。");
  }
  if (terrain === "grass" && sampledTileset !== null && map.tilesetId !== sampledTileset) throw Error("当前地图图块组已改变，请重新取样。");
  stroke = { mapId: point.mapId, layer, tileId: grassTileId, size: ["fence","eraseFence"].includes(terrain)?1:diameter, form: shape, insideSide, roadStyle, path: [],
    width: map.width, height: map.height, tilesetId: map.tilesetId,
    pointerId, origin: point, cells: new Map(), last: null };
  prepareMountainStroke(stroke);
  // 只在拖动预览期间占用 Esc，防止宿主快捷键先截获；结束后立即归还。
  escapeBinding = ctxRef.ui.registerShortcut("Escape", () => cancelStroke("已取消这一笔，可以继续绘制。"));
  extendStroke(point);
}
function extendStroke(point) {
  if (!stroke || stroke.mapId !== point.mapId) return;
  const isFence = stroke.terrain === "fence" || stroke.terrain === "eraseFence";
  const addFence = c => {
    const last=stroke.path.at(-1);
    if(last?.x===c.x&&last?.y===c.y)return;
    stroke.path.push(c);
    stroke.cells.set(`${c.x},${c.y}`,c);
  };
  for(const center of lineCells(stroke.last || point,point)){
    if(isFence){
      const last=stroke.path.at(-1);
      if(last && last.x!==center.x && last.y!==center.y)addFence({x:center.x,y:last.y});
      addFence({x:center.x,y:center.y});
    } else for(const c of footprint(center,stroke.size,stroke.form,stroke))stroke.cells.set(`${c.x},${c.y}`,c);
  }
  stroke.last=point;
  updateMountainPreview();
  status();redraw();
}
function commitStroke() {
  if (!stroke) return;
  const pending = stroke;
  cancelStroke();
  const map = ctxRef.map.info(pending.mapId);
  if (ctxRef.editor.activeMapId() !== pending.mapId || !map || map.width !== pending.width ||
      map.height !== pending.height || map.tilesetId !== pending.tilesetId) {
    status("地图已改变，这一笔已取消。"); return;
  }
  if (pending.terrain !== "grass") { commitMountain(pending); return; }
  if (!ctxRef.map.layers(pending.mapId).some(l => l.index === pending.layer && l.visible)) {
    status("目标图层已改变，这一笔已取消。"); return;
  }
  const changes = [...pending.cells.values()].map(c => ({ ...c,
    old: ctxRef.map.readTile(pending.mapId, pending.layer, c.x, c.y) }))
    .filter(c => c.old !== pending.tileId);
  if (!changes.length) { status("这些格子已经是所选图块，没有新增修改。"); return; }
  nativeTransaction(pending.mapId,changes.map(c=>({...c,layer:pending.layer,value:pending.tileId})),"程序化草地");
  status(`已写入 ${changes.length} 格 · Ctrl+Z 撤销整笔`);
  redraw();
}

// V0.1.4 经用户确认可用的定位路径：overlay 画布 + pointermove，不依赖 hover.changed。
function sameRect(a, b) {
  return ["left", "top", "width", "height"].every(k => Math.abs(a[k] - b[k]) < 1);
}
function surfacePoint(surface, ev) {
  const canvas = surface.canvas;
  if (!canvas.isConnected) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) return null;
  if (ev.clientX < rect.left || ev.clientY < rect.top ||
      ev.clientX >= rect.left + rect.width || ev.clientY >= rect.top + rect.height) return null;
  const bx = (ev.clientX - rect.left) * canvas.width / rect.width;
  const by = (ev.clientY - rect.top) * canvas.height / rect.height;
  const { a, b, c, d, e, f } = surface.transform;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const px = (d * (bx - e) - c * (by - f)) / det;
  const py = (-b * (bx - e) + a * (by - f)) / det;
  const info = surface.info;
  if (!(info.zoom > 0) || !(info.tileSize > 0)) return null;
  // Maker Studio 1.7.1 实际接口：tileSize 已是 32 * zoom，viewport 是同一像素坐标系。
  // 上面只撤销 Canvas 变换；这里不能再除一次 zoom。
  const x = Math.floor((px + info.viewportX) / info.tileSize);
  const y = Math.floor((py + info.viewportY) / info.tileSize);
  const map = ctxRef.map.info(info.mapId);
  if (!map || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return { mapId: info.mapId, x, y };
}
function mapPointer(ev) {
  const surface = mapSurfaces.get(ctxRef.editor.activeMapId());
  if (!surface) return null;
  const path = ev.composedPath ? ev.composedPath() : [ev.target];
  const targetCanvas = path.find(el => el?.tagName === "CANVAS");
  if (!targetCanvas) return null;
  if (targetCanvas !== surface.canvas &&
      !sameRect(targetCanvas.getBoundingClientRect(), surface.canvas.getBoundingClientRect())) return null;
  return surfacePoint(surface, ev);
}
function ownEvent(ev) {
  if (ev.cancelable) ev.preventDefault();
  ev.stopImmediatePropagation();
}
function sampleAt(point) {
  cancelStroke();
  const layers = ctxRef.map.layers(point.mapId)
    .filter(l => l.visible && (l.kind === "native" || l.kind === "extended")).sort((a, b) => b.index - a.index);
  for (const l of layers) {
    const id = ctxRef.map.readTile(point.mapId, l.index, point.x, point.y);
    if (!id) continue;
    // 本阶段是普通草地图块画笔；自动元件需要另行实现邻接重算。
    if (id < 384) { status("这里是自动元件，请选择普通草地图块取样。"); return; }
    terrain = "grass"; if (panelRefs) panelRefs.syncTerrain();
    grassTileId = id; targetLayerIndex = l.index;
    sampledTileset = ctxRef.map.info(point.mapId).tilesetId;
    mode = "paint";
    if (panelRefs) panelRefs.tile.value = String(id);
    status("取样成功。拖动预览，松开落笔。"); redraw(); return;
  }
  status("这一格没有可取样图块，请点击纯草地。");
}

function renderMask(drawing, info, cells, fill, outline) {
  const unit = info.tileSize;
  const list = [...cells], keys = outline ? new Set(list.map(c => `${c.x},${c.y}`)) : null;
  drawing.fillStyle = fill;
  drawing.strokeStyle = outline || fill;
  drawing.lineWidth = 1.5;
  if (outline) drawing.beginPath();
  for (const c of list) {
    const x = c.x * info.tileSize - info.viewportX;
    const y = c.y * info.tileSize - info.viewportY;
    drawing.fillRect(x, y, unit, unit);
    if (!outline) continue;
    if (!keys.has(`${c.x - 1},${c.y}`)) { drawing.moveTo(x, y); drawing.lineTo(x, y + unit); }
    if (!keys.has(`${c.x + 1},${c.y}`)) { drawing.moveTo(x + unit, y); drawing.lineTo(x + unit, y + unit); }
    if (!keys.has(`${c.x},${c.y - 1}`)) { drawing.moveTo(x, y); drawing.lineTo(x + unit, y); }
    if (!keys.has(`${c.x},${c.y + 1}`)) { drawing.moveTo(x, y + unit); drawing.lineTo(x + unit, y + unit); }
  }
  if (outline) drawing.stroke();
}
function renderOverlay(drawing,info){
  mapSurfaces.set(info.mapId,{canvas:drawing.canvas,transform:drawing.getTransform(),info:{...info}});
  const activeInfo=ctxRef.map.info(info.mapId);if(activeInfo)requestAtlas(activeInfo.tilesetId);
  livePreview();
}
function renderPanel(host) {
  const root = document.createElement("div");
  root.className = "mimi-pg-root";
  root.innerHTML = `<style>
    .mimi-pg-root{padding:14px;font:13px/1.6 sans-serif;color:var(--text-primary,#e7e9ee)}
    .mimi-pg-root h3{margin:0 0 10px;font-size:15px}
    .mimi-pg-root .type-title{margin:13px 0 6px;color:var(--text-secondary,#b7c1d1);font-size:12px}
    .mimi-pg-root .type-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:13px}
    .mimi-pg-root .type-row button{width:100%;min-width:0;margin:0;padding:7px 3px;background:#263d33;color:#e8f4ea;border:1px solid #496b57;border-radius:5px;font-weight:600}
    .mimi-pg-root .type-row button[data-selected="true"]{background:#4a805d;color:#fff;border-color:#95d3a5;box-shadow:inset 0 0 0 1px #a5e9b256}
    .mimi-pg-root .type-row button:hover{background:#39694d}
    .mimi-pg-root .type-divider{height:1px;background:var(--border,#505563);margin-bottom:11px;opacity:.65}
    .mimi-pg-root label{display:grid;grid-template-columns:minmax(76px,1fr) minmax(135px,1.5fr);align-items:center;gap:9px;margin:11px 0}
    .mimi-pg-root input,.mimi-pg-root select{box-sizing:border-box;width:100%;min-width:0;padding:6px;background:#263d33;color:#e8f4ea;border:1px solid #496b57;border-radius:5px;font:inherit}
    .mimi-pg-root select option{background:#263d33;color:#e8f4ea}
    .mimi-pg-root button{width:100%;padding:8px;margin:5px 0;background:var(--bg-tertiary,#303746);color:inherit;border:1px solid var(--border,#505563);border-radius:5px;cursor:pointer}
    .mimi-pg-root button.primary{background:var(--accent,#5368df);color:var(--accent-text,#fff)}
    .mimi-pg-root button.primary[data-enabled="true"]{background:#98545b;border-color:#bd737b;color:#fff}
    .mimi-pg-root .note{color:var(--text-secondary,#aeb8c8);margin:8px 0}
    .mimi-pg-root .state{padding:8px;border-radius:5px;background:var(--bg-secondary,#202934)}
    .mimi-pg-root .state[data-mode=paint]{border-left:3px solid #69da9b}
    .mimi-pg-root .status{min-height:48px;margin-top:12px;white-space:pre-wrap}
    </style><h3>Procedural Terrain · 程序化地形 · v1.0.0</h3>
    <div class="state" data-ref="mode"></div>
    <div class="type-title">类型选择</div>
    <div class="type-row" role="group" aria-label="类型选择">
      <button type="button" data-type="grass">草地</button>
      <button type="button" data-type="mountain">山体</button>
      <button type="button" data-type="water">水坑</button>
      <button type="button" data-type="sand">道路</button>
      <button type="button" data-type="fence">栅栏</button>
    </div>
    <div class="type-divider"></div>
    <label>绘制方式<select data-ref="terrain" aria-label="绘制方式"></select></label>
    <label data-ref="style-row">样式<select data-ref="style" aria-label="道路样式"><option value="brown">棕色沙土</option><option value="yellow">浅黄沙地</option><option value="gray">灰色砂砾</option><option value="city">浅灰城市道路</option></select></label>
    <label>笔刷直径（格）<input data-ref="size" type="number" min="1" max="31" step="1" value="${diameter}"></label>
    <label>笔刷形状<select data-ref="shape"><option value="circle">圆形</option><option value="square">方形</option></select></label>
    <label data-ref="inside-row">栅栏内侧<select data-ref="inside"><option value="right">沿笔迹右侧</option><option value="left">沿笔迹左侧</option></select></label>
    <label data-ref="tile-row"><span data-ref="tile-label">草地图块 ID</span><input data-ref="tile" type="number" min="384" max="32767" step="1" value="${grassTileId}"></label>
    <div class="note" data-ref="target"></div>
    <button data-ref="sample">取样草地</button>
    <button class="primary" data-ref="paint" aria-pressed="false">启用当前画笔</button>
    <div class="note">按下即显示实际图块，拖动连续更新<br>道路根据邻格自动接边，建议至少 3 格宽<br>栅栏始终 1 格宽；顺时针围边选“右侧”<br>叠加高台升一级；扩展高台保持原高度<br>下挖从平坦岩面起笔；水坑只在普通草地绘制<br>红色：冲突，松开取消整笔<br>松开：提交整笔　Esc：取消预览<br>Ctrl+Z：撤销已提交的一笔</div>
    <div class="status" data-ref="status" role="status"></div>`;
  host.appendChild(root);
  const refs = { root };
  for (const name of ["mode", "terrain", "style-row", "style", "size", "shape", "inside-row", "inside", "tile-row", "tile-label", "tile", "target", "sample", "paint", "status"]) refs[name] = root.querySelector(`[data-ref="${name}"]`);
  refs.types = [...root.querySelectorAll("[data-type]")];
  const categoryFor = value => value === "grass" ? "grass" : value === "water" || value === "eraseWater" ? "water" :
    value === "sand" || value === "eraseSand" ? "sand" : value === "fence" || value === "eraseFence" ? "fence" : "mountain";
  const choices = {
    grass: [["grass", "绘制草地"]],
    mountain: [["mountain", "单层山体"], ["upper", "叠加高台"], ["expand", "扩展高台"],
      ["dig", "下挖一层"], ["eraseUpper", "擦除高台"], ["erase", "擦除底座"]],
    water: [["water", "绘制水坑"], ["eraseWater", "擦除水坑"]],
    sand: [["sand", "绘制道路"], ["eraseSand", "擦除道路"]],
    fence: [["fence", "绘制栅栏"], ["eraseFence", "擦除栅栏"]]
  };
  const remembered = { grass: "grass", mountain: "mountain", water: "water", sand: "sand", fence: "fence" };
  remembered[categoryFor(terrain)] = terrain;
  refs.syncTerrain = () => {
    const category = categoryFor(terrain);
    for (const button of refs.types) {
      const selected = button.dataset.type === category;
      button.dataset.selected = String(selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    refs.terrain.replaceChildren(...choices[category].map(([value, name]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = name; return option;
    }));
    refs.terrain.value = terrain;
    const isFence = category === "fence";
    refs["style-row"].style.display = category === "sand" ? "grid" : "none";
    refs["inside-row"].style.display = isFence ? "grid" : "none";
    refs.size.closest("label").style.display = isFence ? "none" : "grid";
    refs.shape.closest("label").style.display = isFence ? "none" : "grid";
    refs["tile-row"].style.display = isFence ? "none" : "grid";
    refs.sample.style.display = isFence ? "none" : "block";
    refs["tile-label"].textContent = category === "sand" ? "擦除回填 ID" : "草地图块 ID";
    remembered[category] = terrain;
  };
  const applyTerrainSettings = () => {
    if (terrain !== "grass" && terrain !== "fence" && terrain !== "eraseFence" && diameter < 3) { diameter = 5; refs.size.value = String(diameter); }
    if (terrain === "dig") { shape = "square"; refs.shape.value = "square"; }
  };
  refs.shape.value = shape;
  refs.inside.value = insideSide;
  refs.style.value = roadStyle;
  refs.syncTerrain();
  panelRefs = refs;
  const handlers = [];
  const listen = (el, event, fn) => { el.addEventListener(event, fn); handlers.push(() => el.removeEventListener(event, fn)); };
  for (const button of refs.types) listen(button, "click", () => {
    cancelStroke();
    terrain = remembered[button.dataset.type];
    refs.syncTerrain(); applyTerrainSettings();
    status(terrain === "grass" ? "草地画笔。" : "Outside 地形画笔；按下看图块，松开提交。"); redraw();
  });
  listen(refs.terrain, "change", () => {
    cancelStroke(); terrain = refs.terrain.value;
    refs.syncTerrain(); applyTerrainSettings();
    status(terrain === "grass" ? "草地画笔。" : "Outside 地形画笔；按下看图块，松开提交。"); redraw();
  });
  const updateSize = normalize => {
    cancelStroke();
    const number = Number(refs.size.value);
    diameter = Number.isFinite(number) && number >= 1 ? Math.min(MAX_DIAMETER, Math.round(number)) : diameter;
    if (normalize || refs.size.value !== "") refs.size.value = String(diameter);
    status(`笔刷直径 ${diameter} 格。`); redraw();
  };
  listen(refs.size, "input", () => updateSize(false));
  listen(refs.size, "change", () => updateSize(true));
  listen(refs.shape, "change", () => { cancelStroke(); shape = refs.shape.value === "square" ? "square" : "circle"; status(); redraw(); });
  listen(refs.style, "change", () => { cancelStroke(); roadStyle = refs.style.value; status(`已选择道路样式：${refs.style.selectedOptions[0].textContent}。`); redraw(); });
  listen(refs.inside, "change", () => { cancelStroke(); insideSide = refs.inside.value === "left" ? "left" : "right"; status("已设置栅栏内侧方向。"); redraw(); });
  const updateTile = normalize => {
    cancelStroke();
    const id = Number(refs.tile.value);
    if (Number.isInteger(id) && id >= 384 && id <= 32767) { grassTileId = id; sampledTileset = null; }
    if (normalize) refs.tile.value = String(grassTileId);
    status(); redraw();
  };
  listen(refs.tile, "input", () => updateTile(false));
  listen(refs.tile, "change", () => updateTile(true));
  listen(refs.sample, "click", () => { cancelStroke(); mode = "sample"; status("请点击地图上的纯草地。"); redraw(); });
  listen(refs.paint, "click", () => {
    cancelStroke();
    if (mode === "paint") { mode = "idle"; hover = null; status("已停止，恢复编辑器原生画笔。"); }
    else { mode = "paint"; targetLayerIndex ??= ctxRef.editor.activeLayerIndex(); status("按下即预览，松开提交整笔。"); }
    redraw();
  });
  status();
  return () => {
    handlers.forEach(fn => fn());
    if (panelRefs === refs) { cancelStroke(); mode = "idle"; hover = null; panelRefs = null; redraw(); }
    root.remove();
  };
}

export function activate(ctx) {
  ctxRef = ctx;
  const activation=++hostEpoch;
  hostReady=loadHostBridge(ctx).then(bridge=>{if(activation!==hostEpoch||ctxRef!==ctx)return;hostBridge=bridge;const info=ctx.map.info(ctx.editor.activeMapId());if(info)requestAtlas(info.tilesetId);status("已就绪：原生跨层撤销＋即时图块预览。");redraw();}).catch(error=>{if(activation===hostEpoch&&ctxRef===ctx)report(error);});
  const activeInfo=ctx.map.info(ctx.editor.activeMapId());if(activeInfo)requestAtlas(activeInfo.tilesetId);
  ctx.ui.registerOverlay({ id: `${MOD_ID}.input-surface`, zOrder: 10, render: renderOverlay });
  const onDown = ev => {
    if (mode === "idle" || ev.button !== 0 || ev.isPrimary === false || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const point = mapPointer(ev);
    if (!point) return;
    ownEvent(ev); hover = point;
    try { if (mode === "sample") sampleAt(point); else beginStroke(point, ev.pointerId); }
    catch (error) { report(error); }
  };
  const onMove = ev => {
    if (mode === "idle" || (stroke && ev.pointerId !== stroke.pointerId)) return;
    if (stroke && ((ev.buttons & 1) === 0 || ctx.editor.activeMapId() !== stroke.mapId)) cancelStroke("操作已中断，预览已取消。");
    const point = mapPointer(ev);
    if (stroke) {
      if (!point) stroke.last = null;
      else { ownEvent(ev); try { extendStroke(point); } catch (error) { report(error); } }
    }
    hover = point; redraw();
  };
  const onUp = ev => {
    if (!stroke || ev.pointerId !== stroke.pointerId || (ev.type === "pointerup" && ev.button !== 0)) return;
    if (ev.type === "pointercancel") { cancelStroke("操作已中断，预览已取消。"); return; }
    try {
      const point = mapPointer(ev);
      if (point?.mapId === stroke.mapId) { ownEvent(ev); extendStroke(point); }
      commitStroke();
    } catch (error) { report(error); }
  };
  const onBlur = () => { if (stroke) cancelStroke("窗口失焦，预览已取消。"); hover = null; redraw(); };
  const onKey = ev => {
    if (ev.key !== "Escape" || !stroke) return;
    ownEvent(ev); cancelStroke("已取消这一笔，可以继续绘制。");
  };
  const onVisibility = () => { if (document.hidden) onBlur(); };
  const listeners = [["pointerdown", onDown], ["pointermove", onMove], ["pointerup", onUp],
    ["pointercancel", onUp], ["blur", onBlur], ["resize", onBlur], ["keydown", onKey]];
  for (const [event, fn] of listeners) window.addEventListener(event, fn, true);
  document.addEventListener("visibilitychange", onVisibility);
  const subscriptions = [
    ctx.bus.on("map.unloaded", e => { if (stroke?.mapId === e.mapId) cancelStroke("地图已关闭，预览已取消。"); mapSurfaces.delete(e.mapId); }),
    ctx.bus.on("viewport.changed", e => { if (stroke?.mapId === e.mapId) cancelStroke("视口已改变，预览已取消。"); hover = null; mapSurfaces.delete(e.mapId); redraw(); }),
    ctx.bus.on("save.before", () => { if (stroke) cancelStroke("保存前已取消尚未提交的预览。"); }),
    ctx.bus.on("tool.activated", () => { cancelStroke(); mode = "idle"; hover = null; status("已切换到编辑器工具。"); redraw(); })
  ];
  inputCleanup = () => {
    cancelStroke();
    for (const [event, fn] of listeners) window.removeEventListener(event, fn, true);
    document.removeEventListener("visibilitychange", onVisibility);
    subscriptions.forEach(s => s.dispose()); mapSurfaces.clear(); inputCleanup = null;
  };
  ctx.lifecycle.onDeactivate(() => inputCleanup?.());
  ctx.ui.registerContextMenuItem({ context: "map-tile", label: "程序化地形：取样此格为草地",
    handler(e) { if (e.mapId != null && e.tileX != null && e.tileY != null) sampleAt({ mapId: e.mapId, x: e.tileX, y: e.tileY }); }
  });
  ctx.ui.registerPanel({ id: PANEL_ID, title: "Procedural Terrain / 程序化地形", defaultPosition: "left", defaultSize: { width: 330, height: 680 }, render: renderPanel });
  ctx.ui.openPanel(PANEL_ID); redraw();
}
export function deactivate() {
  inputCleanup?.(); mode = "idle"; hover = null; panelRefs = null; ctxRef = null; atlasCache.clear(); disposeLivePreview();
}
