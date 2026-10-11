const ROAD_TEACHING_ROLES = [
 ['ground','背景地面',385,0],['center','路面中心',546,0],
 ['nw','左上外角',537,0],['n','上边',538,0],['ne','右上外角',539,0],
 ['w','左边',545,0],['e','右边',547,0],['sw','左下外角',553,0],['s','下边',554,0],['se','右下外角',555,0],
 ['inNW','内角 · 缺左上',558,0],['inNE','内角 · 缺右上',556,0],['inSW','内角 · 缺左下',542,0],['inSE','内角 · 缺右下',540,0]
];
const PINE_TEACHING_ROLES = [
 ['ground','背景地面',385,0],
 ['capL','树冠顶 · 左',804,2],['capR','树冠顶 · 右',805,2],
 ['singleMidL','单棵树身 · 左',812,1],['singleMidR','单棵树身 · 右',813,1],
 ['singleFootL','单棵树底 · 左',820,1],['singleFootR','单棵树底 · 右',821,1],
 ['midAL','连片树身 A · 左',808,0],['midAR','连片树身 A · 右',809,0],
 ['midBL','连片树身 B · 左',810,0],['midBR','连片树身 B · 右',811,0],
 ['joinAL','上下连接 A · 左',800,0],['joinAR','上下连接 A · 右',801,0],
 ['joinBL','上下连接 B · 左',802,0],['joinBR','上下连接 B · 右',803,0],
 ['footAL','连片树底 A · 左',816,0],['footAR','连片树底 A · 右',817,0],
 ['footBL','连片树底 B · 左',818,0],['footBR','连片树底 B · 右',819,0]
];
const ROUND_TEACHING_ROLES = [
 ['ground','背景地面',386,0],
 ['capTip','树冠尖顶',849,2],
 ['capL','树冠下沿 · 左',856,2],['capM','树冠下沿 · 中',857,2],['capR','树冠下沿 · 右',858,2],
 ['bodyUL','连片树身上排 · 左',864,0],['bodyUM','连片树身上排 · 中',865,0],['bodyUR','连片树身上排 · 右',866,0],
 ['bodyDL','连片树身下排 · 左',872,0],['bodyDM','连片树身下排 · 中',873,0],['bodyDR','连片树身下排 · 右',874,0],
 ['footUL','树底上排 · 左',880,0],['footUM','树底上排 · 中',881,0],['footUR','树底上排 · 右',882,0],
 ['footDL','树底下排 · 左',888,0],['footDM','树底下排 · 中',889,0],['footDR','树底下排 · 右',890,0]
];
const MULTI_TEACHING_ROLES = [
 ['ground','背景地面',385,0],['rock','岩石台面 / 岩壁底图',1177,0],
 ['nw','左上外角',1168,1],['n','上沿 / 内凹顶缘',1169,1],['ne','右上外角',1170,1],
 ['w','左侧岩壁',1176,1],['e','右侧岩壁',1178,1],
 ['sw','左下外角',1184,1],['s','下侧岩壁',1185,1],['se','右下外角',1186,1],
 ['inSW','内角 · 缺左下',1193,1],['inSE','内角 · 缺右下',1192,1]
];
const GRASS_MULTI_TEACHING_ROLES=MULTI_TEACHING_ROLES.map(([key,name,id,z])=>[key,key==='rock'?'草地台面 / 岩壁底图':key==='n'?'草地上沿 / 内凹顶缘':name,key==='rock'?388:key==='n'?1233:id,z]);
const multiTeaching=kind=>kind==='multi-mountain'||kind==='grass-multi-mountain';
const singleTeaching=kind=>kind==='single-mountain'||kind==='grass-single-mountain';
const mountainTeaching=kind=>singleTeaching(kind)||multiTeaching(kind);
const TEACHING_TYPES = [['single-mountain','山体（单层 / 高台 / 下挖）'],['grass-single-mountain','草地山体（单层 / 高台 / 下挖）'],['multi-mountain','多层山体'],['grass-multi-mountain','草地多层山体'],['road','道路'],['pine-forest','森林 · 高松林'],['round-forest','森林 · 圆冠林']];
function teachingRoles(kind='single-mountain') {
 if(kind==='single-mountain')return TEACHING_ROLES;
 if(kind==='grass-single-mountain')return GRASS_SINGLE_TEACHING_ROLES;
 if(kind==='road')return ROAD_TEACHING_ROLES;
 if(kind==='pine-forest')return PINE_TEACHING_ROLES;
 if(kind==='round-forest')return ROUND_TEACHING_ROLES;
 if(kind==='multi-mountain')return MULTI_TEACHING_ROLES;
 if(kind==='grass-multi-mountain')return GRASS_MULTI_TEACHING_ROLES;
 throw Error('未知教学类型');
}
const teachingStorage = kind => kind==='single-mountain'?'single-mountain-teaching-v1:':`${kind}-teaching-v1:`;
const teachingId=()=>globalThis.crypto?.randomUUID?.()||`teaching-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function teachingLibraryKey(kind,project,atlas){
  return teachingStorage(kind)+encodeURIComponent(project)+'|'+atlas.tilesetId+'|'+atlas.fingerprint+'|profiles-v2';
}
async function readTeachingLibrary(ctx,kind,project,atlas,legacyHash){
  const key=teachingLibraryKey(kind,project,atlas);
  const raw=await teachingTimeout(ctx.storage.get(key,null),'读取教学式样列表');
  if(raw){
    if(raw.version!==2||!Array.isArray(raw.entries))throw Error('教学式样列表格式无效；原数据未修改');
    const ids=new Set(),entries=raw.entries.map(entry=>{
      if(typeof entry?.id!=='string'||!entry.id||ids.has(entry.id))throw Error('教学式样编号重复或无效；原数据未修改');
      ids.add(entry.id);
      return {id:entry.id,profile:validateTeachingProfile(entry.profile,atlas,kind)};
    });
    return {key,library:{version:2,selectedId:ids.has(raw.selectedId)?raw.selectedId:entries[0]?.id||null,entries},migrated:false};
  }
  const prefix=teachingStorage(kind)+encodeURIComponent(project)+'|'+atlas.tilesetId+'|';
  let saved=await teachingTimeout(ctx.storage.get(prefix+atlas.fingerprint,null),'读取旧教学档案'),migrated=false;
  if(!saved&&legacyHash){
    saved=await teachingTimeout(ctx.storage.get(prefix+legacyHash,null),'读取旧教学档案');
    if(saved){saved=validateTeachingProfile(saved,{...atlas,fingerprint:legacyHash},kind);saved.atlas=atlas;migrated=true;}
  }
  const entries=saved?[{id:'legacy',profile:validateTeachingProfile(saved,atlas,kind)}]:[];
  return {key,library:{version:2,selectedId:entries[0]?.id||null,entries},migrated};
}
const teachingTypeName = kind => TEACHING_TYPES.find(([k])=>k===kind)?.[1]||kind;
const teachingLayer = (kind,role) => singleTeaching(kind)?(role==='ground'||role==='rock'?0:1):teachingRoles(kind).find(([k])=>k===role)?.[3]??0;
const placedLayer = (profile,role) => profile.roles[role]?.layer ?? teachingLayer(profile.kind,role);
const relocatedTeaching = profile => teachingRoles(profile.kind).some(([role])=>placedLayer(profile,role)!==teachingLayer(profile.kind,role));
function teachingGrounds(profile,snapshot={}){
 const ground=profile.roles.ground.tile,grounds=new Set(ground===null?[]:[ground]);
 if(/^Outside(?:\.png)?$/i.test(profile.atlas.tilesetName)&&(ground===null||(ground>=385&&ground<=389)))for(let id=385;id<=389;id++)grounds.add(id);
 if(ground===null&&Number.isInteger(snapshot.fallbackGround)&&snapshot.fallbackGround>=384)grounds.add(snapshot.fallbackGround);
 return grounds;
}
function missingTeachingMessage(profile,keys){
 const names=[...new Set(keys)].map(key=>teachingRoles(profile.kind).find(([role])=>role===key)?.[1]||key);
 return `教学缺少“${names.join('、')}”映射，跳过此格`;
}
function multiTeachingLayout(profile,shape,engines){
 const count=profile.previewLayers??2,isGrass=profile.kind==='grass-multi-mountain';
 const width=22+2*(count-1),height=18+count-1,top=new Set();
 for(const k of teachingMask(shape)){const[x,y]=k.split(',').map(Number);top.add(`${x+(shape==='border'?0:count-1)},${y}`);}
 const plan=engines.MultiMountain.geometry(top,width,height,count,isGrass),cells=[];
 if(plan.errors.size)throw Error('多层山体教学范例存在不支持的边角');
 const byId=new Map(teachingRoles(profile.kind).map(([role,,id])=>[id,role]));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=plan.cells.get(`${x},${y}`),role=t?(t.edge?byId.get(t.edge):'rock'):'ground';
  if(!role)throw Error('未知多层山体边角');
  const entry=profile.roles[role],auto=t&&(isGrass||t.solid)?'rock':'ground';
  const baseRole=materialRole(role)?role:entry.base==='auto'?auto:entry.base;
  const baseId=typeof baseRole==='number'?baseRole:profile.roles[baseRole].tile;
  cells.push({x,y,role,baseRole,baseId,edgeId:materialRole(role)?0:entry.tile,
   layerRoles:[typeof baseRole==='string'?baseRole:null,materialRole(role)?null:role,null],
   referenceBase:t?(isGrass?388:t.solid?1177:385):385,referenceEdge:t?.edge||0});
 }
 return {width,height,cells};
}
function extraTeachingLayout(profile,shape,engines) {
 const width=22,height=18,kind=profile.kind,roles=teachingRoles(kind),cells=[];
 const ground=Array(width*height).fill(kind==='round-forest'?386:385),arrays=new Map([[0,ground],[1,Array(width*height).fill(0)],[2,Array(width*height).fill(0)]]);
 const s={width,height,arrays,events:new Set(),blocked:new Set(),read:(z,x,y)=>x>=0&&y>=0&&x<width&&y<height?arrays.get(z)?.[y*width+x]||0:0};
 let plan;
 if(kind==='road')plan=engines.Surface.planSand(s,teachingMask(shape,width,height),385,false,'yellow');
 else {
  const sites=new Set(),add=(x,y)=>sites.add(`${x},${y}`);
  if(kind==='round-forest'){
   add(2,2); // Map099's isolated tree: crown at y=2, foot immediately at y=4.
   for(let y=2;y<=10;y+=2)for(let x=8;x<=17;x+=3){
    if(shape==='lesson'&&x>8&&x<17&&y>2&&y<10)continue;
    if(shape==='notch'&&x>=11&&x<=14&&y<=6)continue;
    if(shape==='stairs'&&x<8+Math.floor((y-2)/4)*3)continue;
    add(x,y);
   }
   if(shape==='border'){sites.clear();for(let y=2;y<=10;y+=2)for(let x=0;x<=12;x+=3)add(x,y);}
   plan=engines.RoundForest.plan(s,sites,{x:2,y:2},386,false);
  }else{
   add(2,2); // One isolated tree alongside a ring demonstrates every role.
   for(let y=2;y<=12;y+=2)for(let x=8;x<=18;x+=2){
    if(shape==='lesson'&&x>8&&x<18&&y>2&&y<12)continue;
    if(shape==='notch'&&x>=12&&x<=14&&y<=8)continue;
    if(shape==='stairs'&&x<8+Math.floor((y-2)/4)*2)continue;
    add(x,y);
   }
   if(shape==='border'){sites.clear();for(let y=2;y<=12;y+=2)for(let x=0;x<=12;x+=2)add(x,y);}
   plan=engines.Forest.plan(s,sites,{x:2,y:2},385,false);
  }
 }
 if(plan.conflicts.size)throw Error('教学范例存在不支持的位置');
 for(const c of plan.changes)arrays.get(c.layer)[c.y*width+c.x]=c.value;
 const roleOf=(z,id)=>roles.find(([, ,tile,layer])=>tile===id&&layer===z)?.[0];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const ids=[0,1,2].map(z=>arrays.get(z)[y*width+x]),roleKeys=ids.map((id,z)=>roleOf(z,id));
  const mapped=ids.map((id,z)=>id===0?0:profile.roles[roleKeys[z]]?.tile??null);
  cells.push({x,y,role:roleKeys[2]||roleKeys[1]||roleKeys[0],layerRoles:roleKeys,baseId:mapped[0],edgeId:mapped[1],topId:mapped[2],referenceBase:ids[0],referenceEdge:ids[1],referenceTop:ids[2]});
 }
 return {width,height,cells};
}

// Teaching is isolated from map writes. The existing single-mountain topology is
// injected; only its semantic roles are translated to the taught tileset.
const TEACHING_ROLES = [
  ['ground', '背景草地', 385], ['rock', '山顶岩面', 1177],
  ['nw', '左上外角', 1168], ['n', '上沿', 1169], ['ne', '右上外角', 1170],
  ['w', '左岩壁', 1176], ['e', '右岩壁', 1178],
  ['sw', '左下外角', 1184], ['s', '下岩壁', 1185], ['se', '右下外角', 1186],
  ['inNW', '内角 · 缺左上', 1201], ['inNE', '内角 · 缺右上', 1200],
  ['inSW', '内角 · 缺左下', 1193], ['inSE', '内角 · 缺右下', 1192]
];
const GRASS_SINGLE_TEACHING_ROLES=TEACHING_ROLES.map(([key,name,id])=>[key,key==='rock'?'山顶草面':key==='n'?'草面上沿':name,key==='rock'?388:['n','inNW','inNE'].includes(key)?1313:id]);
const MOUNTAIN_OPERATION_SHAPES=[['raised','叠加高台'],['expanded','扩展高台'],['digGround','一层下挖一层 · 地面坑底'],['digRock','二层下挖一层 · 台面坑底'],['digThrough','二层下挖两层 · 地面坑底']];
const TEACHING_SHAPES = [
  ['lesson', '标准范例'], ['rectangle', '长方形'], ['stairs', '阶梯形'],
  ['notch', '内凹形'], ['border', '贴左边界']
];
const TEACHING_REFERENCE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAACCAAAAAgCAYAAADJuZuxAAAeQElEQVR4nO2dIXQjR7aGNe8sMHTQeplYBBUmMwVFywYqaL3Mi54fWgdFQXHQc9AOdNAKDtSimI1YDL1M7JlloNm8c9R1e7b/1tWt6q7u6m79H/FRq7qq7q3q6pas/683N9uHT6OELLYv+7/j6UXh+O4pOy7g+xp4HoL1fDn/y5tRB/jX/U/7cXh+3h18/7/f/aMT/WyK725/2Me/e3zcvx6fnxXe33183f+dTSeF4y+7LF8X4/H+72QyrjVftPxbSD+wv8J4Pi+8/vHu+zeH4h89bQ+fD/lAQuPXrhOJX+rR8K0f69Ouc6tdHBccdzxeYjo7eHh+ceY1/tun56Pj0Pn55/o9X8wL/dPab3v8U7X/7vhl1ThzF/4Y5vHOjaf8zcvDOiLvVz3/4jxbb1Jx9+J3nZBmWRjDMN5lE/X8+GWZnI9uuu/GxwPavAwz/qHlv695t/Ig8d9eHP+8MnT+OP77oD/X1OVy+cX+c8Hq4bZwfPVuvf+7mE/3fzePT9nx6+XR+uQ8LIfHt8/Z8+5sMqnU7urqbv/3w/r3NyFxjmZwoW/dhYTH8X1gcfu28Fr6Kf3W0Mpt7t4fPsHqlxKP5OV/tr/s4356ydaB6UW2Xsjr13WWx76O/9my2G+MT15rbO9veh3/7Ob+aH/Wz9nz93iT1Xsq83+3yPI1cTd2meenEr/MC47/aY9/av53lvb7b7n/xWa7PZxfWadxHcd1vmnk/oL3D+kXMptl98HYyPojjN+/2/9drK4Kx6WfgpU3ic/3OrPqCR0f6zzMv7Uu+NYjlNaP1cP+7+7tdeG43P+EZ/ng6Bh/VL6fc5+LQ1nd3XR7/t9WXBeVz9m781lYvjn/OzH/1XnvO/+t92W+GOXOXrI45tOsn49Px/8/g+VeL56i9GNkfJ9mvS/XAeb71oVj/V9OWCxnB8tVPf+/jvaaEEIIIYQQQgghhBBCCCGEEEIIIcSDN7EdEC7Os19CvHz0+4XWdVGoW6KqE4J2PvLNTbsKnJ+v/1bItyhzp/PDCu2nx20lhTg6JlgOC9p5qR0QNOcDRMuLNl+0X+7g+4+bx+Jxoz+iREcFet4fp0DWHBAk/rw85AEV+Ki8twhV2Eu9lpLcV9GP/bTex3Kaw4HmhGA5UYgDQuzrD/Ok/SKsqetfHBuEq+XiYLm2xz+UpuffZna4Hl+FViwHBASdC9DhwML3/Nn0pdcOCKicRmW1VR7p2/lWeV/67gDgq7wX6IDQjfz3fd7Vzcd0RAeEdkak31zef/XpmGJJU3ALUl5ThlnHNaUY1ivlPtz8VmlccyeEvIE4ilhTIaspXCMpXgV0hPj6ffa5HNGUcH0Zf0t5JmjP1/j8LYrWvsTvq1iVOHPllzghDHT+o/MBjr84Xgw1flS+c/xPe/xTMxQHhNzxAJS4K3HWCLxPNKXA19pTnXnAQWgk979Ijgi5Awsov7X7Gjr/aM4BVty+jkXa+b55tUAnAN/6BSsvpTyCElzug6bzga/jAZQb3Pz3/H4By2nPo/lzF+f/wXHRxi32/Bded4cdYD4PZMXvSyqehw4Iu+fj/7AeT87CHBA0fOd54Hln4+VBBwTE9/9yGr7n0wGBEEIIIYQQQgghhBBCCCGEEEIIIbX5Q1tOB6HlBVQQW8p1RFMOhzop1EUcCCaj44pn4aP7ZZaUw/6ewy+HsL6fR5nTAsZt5UHOEwX1P7e/Jv2FbFXnA2GzLv6S0FJQW4gDgeQHHQmwnOaEII4H6IQQ6nzgi6ZEtxwF8LyH9Sbrzybrz3wxP9qe1K/Vh+1jeUTLh3WehnYd1r3+1spebjhfm2p/5Nq3rn90+Ghq/LGc9FfixOsVHRzqtq/F8+TS4et0ENsZ4VGr5qI4TsE+Ep7nH78LVUeGNbZy2VJMW+/Xrb9r58dyRLAU6aLk9lWkNzX+ddHyEzv+1PQt/6cSf1ukjj91+0NBHAFW16AEcoiyRBQn2h7CgqZkspTfFnK+/L3cZv1Gxb+FlC85IVjK17wjfspYU/FqtaOVV/pp5QEVcIIo4lcP/Rr/1VVxT/dXp+jDvUit52lRRPcv/puC4tn6/itX5DmHgJITQs/nPzofqNW4fJWU8D2P/wyVnCc+/tr1fqrjT+Igim9U7IYqv/F4LAU+1id/pV/YT3QksO5vsdAU7Hg/tJwQEO1+aintLQW+r0LfiqtqHJbyuzKByu3Bz//b+7C8VVSSc/63O/9zJ4qOOB8kZ1dx/hrnSZ7lOUxzgB7B8eD/P3ieTwcEQgghhBBCCCGEEEIIIYQQQgghhKRzQJBfcuMvu/EX3lWdD7Q9vfF46F7gi2VTms/D/HydOQos58f3OhIlMCqbtbim82I5VBJLnOgAsFT2XJK95jE/346+/tQFJwRBU1T7Kv5DnQ9EOY1KfcuhoC5Yr9aO5QAR6nzg+770BxX0oQ4EddvXnBBCSX39pWpfc0CINf7yWnN6kHi19UdzGok1/0SJgUosVGjEdj4YOrGUr3UdBU6NWI4IdWlb+SztiUOBOBacKn3Pf12nidTK+9TzsSvxdxVU2Icq9ZuipPxX0PbmxT1US3vTG4omVNhpijBUwGiKp9p59tzTu1QeFayhilbfeq3yBqW9f1H53PPxL+VhMSvEvZzMCs/Xr7Bncd/jRyU37gGPnz9EmfTa9PzHeq15XXP+o/OB9+eogcSvxZts/EOJNP7a523fevoaf93vDU79+weMf7u9P7hOhzrX+BJLge+LFsfnvdaL8c9m4BgSCuzhjkp5XycEjfx9+QuORb7OA7EoOUm4fmX+qmWs+DTld+m5oqE4F1eL05j/Ls7NgzZSFeH8z/La0/nfFK8XWdwS/vjs+P338WlXOI8chw4IhBBCCCGEEEIIIYQQQgghhBBCCEnngCBYzgaxnQ8QUfhaSvC2nA/+df9TQfGxmB5vF5XPqGTG13gcnSA0ZwhUPmO7olDumhMCKrHF+QCV/TL+muLfmh9NORZUxddhQeLF+OR4VUeAqohiXZB+N9UPzDPmyRqP1NefkLr9WOA89HUcsdYfnFfx5t/MS1lwqsqD2Ht+v7h16cK6XzPdUZA8Nu2EEHv8yWnkXxwCEC0Orf+p49fqRSeEEpG6kTr+1O37Iop83FP+cpQd74oTwuL2beH16uqucFz2sMY41PpAcYZYe+CisiXfs9X1awT9wv6be24Dsmf4+OPWTwlrKVR9FayWgjZwL/LduXuODdy6eajjL+OZ58WRK1sHHr+l7JXXjc1/B+Ytj0OIPP9FH+mrgB9a/Na3j62Nf6L1bxKo5B9a/LOGnA6G5oxgxSPOB5rTjazTmiJbU9z77mFfFWsvdOyXFgfefz6ffx/FCQGdJDTHoM9ODIeVvqYCH5wQtPKqs5DneGG5UjtV++/Q5hHmzcpXKKu7m9Oe/xD/6rboCFIVzv9+zP+2EUeD3ctxBwc6H4RBBwRCCCGEEEIIIYQQQgghhBBCCCGEpHdAiI2v8wEq3VMp34Wfr/+WOR8oP/TS9mzXlM+heULlMzpDYHvYrrxGJTXmr20nBFGuXy0XR8cZFf9Xt8tK80rKae0gqLCv63yg1S9728t4PG4eC8exv7EcB2LH03T7lmMEkvr6E1K3Xzf/Mg8FXEe09U/wXX98nRC6wsX5RS0noL7gu+d3bOUrKoutvdY1JTKeZ9XrW0/T7be9t3zXxl+Q5aQr+Wibvubft99W/1PHb9UbGmcoqeNP3b43mnJRjgcq1WMjDgyXs68+HVKY5Hv0eiq/BVGkaEpvS4GmKVukH5ay3NdZ4k8P2efoXPmqKVDxeKw9xPG80PqhvMQhcf3f1T/e+Ch/N+IENpDx9907fXZzX9jjeijxS1yW8v3Z3Ugbm//W+iflI89//NSmKZzXz9tBxr92CVhODmvhWxt/Xxoaf4lfU7o3Pv6+tDz+I8MhBPM0NOcD3/jPx0WFfqhiW3O4CSW2Yty3X5YjQeWva8GRwFKu431UVTYHKp6rKqStfnqD5ZVxwbgtR4FS/W+L68DEfYCS9V9jcZX9H4Tz//lgXjYPm6P5kzyr48L5n3T+v+J9vy7yfZTmQBlIaw4H42bu6+r8TwQdEAghhBBCCCGEEEIIIYQQQgghhBAyHAeEqs4HqRwPrPZx73PZ2xyP+yqfNWU+tiflZA91zKu1p7yGtCMK5G9nzTghjOfz/d/d42NByW6Nu+Z8gKBSHI9XdRJAJwQtrtB6NCW/KM6lf/gayyGxHBI0tH6HOhTUxVLwd+X663r7vuB1Ja+19a/q+tO1+RfqdHAqzgihe38vjB9+ivI//yEnVKfute7QfgCK52E56/1U7U9HL14KdMnr5iVS3gNJvfe7lYem409N1/MvyDyOnefU8TcVV1/iT93+5fIL5yhQ3JtdEAWHlPNV7Dfdz5KCXBSX16OC8traE1nAcr5Kb+21phhFZYyVV9X5wAIVqFX3AvfdY9y3PKA5IaDybbxxe+HeDmv8N3fvCw4PmhJne38z0PhvDjohmMr3yPNfU9rm/dTmdaT5rzkhqMr3gcWPSvi2xz/1+ifx4/Xf1vh3JX5fJ4Sq7/cdjG+7deumOOCs74LqQyV8qIJXcx7A8lY5XwcBy1GhdF9bOkeguXPcmWX3m1C0PGn9DnYSwOOG44DmYODrYGT2C8F+Ksp47Eeos5Lm+CHszrP1YTx266H7/mGzetj/5fxX5r98/+X+Sh61vKPjBOd/u/Mfyec9PgfUdTLA70UjOSJ0zvFgfHE0r/V8euJDBwRCCCGEEEIIIYQQQgghhBBCCCGE9N8Boa7zga/jgaZ8r8vP15miQXM+EFChbPUD82I5AGh7wseKX9qfTYu/ofl21IwTgqXgD3U+wPxv1tkvrGTcJD7NGQCV9JqC2nJCMJm6X+w5BwgNnPe+zgf4fqgTgun04Kk8r6pE19rH45Xz35HrL3X7GphnmUfWOhy6/vmuP+KIIP0KnX+x7gbiZIDOBuhwcGrOB0Jd5wPBUhBXVRjHqjdV+77tWgr0pmha+Szxi1OB5gRxqvQl/005BKR2fkjtnJE6/rbbv7z/av+55DPjo8qyfI94p4y8nBXP/3DzWzuOCKCgLilNRseV39pxQVNwW0pvqz3pNypiSgp2VzyY0L28XfmzndtbdBx2fn7eaNfM3uFAvgfqwMff3IN04PEj1p7PnztY0bkO2jX3Kg+ct1Xnv8TtreQeWPyNj3/H17/Gx7/j8RPPdDrng3zdVdZ19Xy3jmvrsqXgxXp826vqfCDHVacdBVTEr97dhzkhKHFbCuaNoZRerK6K5TTnBE/FtW+/1PoFo/68385xAOuR55BgxbflHOFABfjKOSiFcrrzf13Io+aEkMP5n2T+owNI/jlIc0Kq64SA9aRyRIj9/eT4eH34uasrDkp0QCCEEEIIIYQQQgghhBBCCCGEEEJI/x0QEFTGag4JVRW3WN+XFfv53eLPe4XMfDKvdL6lBMbj2t7v1nlau1Z5TXGt7cH+7SyuE4KljNecD6y8Wk4a6IggXED8moJfU1rHQvol/dQcDOS45oRQ1/mgrnNBrPPR8cBySPBuL/H111b7dfOP/Tg3pZ4vta5Tbf2x5pXW/7hXp+1scGrOB7EQZbUTshIjT3QAiIvkc+rWL3I8T4SkdDzQ9oS3EEUHKm8uRy05IoCCEhUmqBzKFdieWA4QVjmtPauflRXMkZidvS283m7fH33/aRSosIvF0Md/fOLxK0K80p63oYDiOvb6t0LrkorXs7cicaDxa9Qe/56sf42Nf0/iJ8dZP2+L14Osn4ajjYAONoivYtdShPti7Y1u1a858wiqQtzVvx3dF6635aR43ZUUx4EOBKqS3Smo89dG/JZDgtaOdznY295X+V9ycAjsTw7EpymSS444cp+5Plwt5/8kyIkGld+c/92Y/8jZOFvvX3frdhwMtO+tmqq3LmO/eiWPXYUOCIQQQgghhBBCCCGEEEIIIYQQQggZjgOCKGFRQTudh0kefZ0PRnWdDxbVnA+s/mgK4snkcPnQvdSxfU2JvFjODvZTlPOa4ryuE8Lu8bFQLyLtY/7r7nmP5eT1Zl38ZbqmvNfeL8U1Pzxvfrz7fp+v725/gL1rDzsW4GtNAW6Nl+UMMJsWf2GI2dTqR5pqfwTtq04IU79f3Ld9/XWtfSv/km9r/fuo7G3Z9PoT6kxCvW6/lNWi8E+9p/qpMfT8b9wyszAWBFnWMH5c7kLf18ohvucla3/sl2dyPI9Du77aiqvqHqKhe6jG5nL5ReG5X1OkWIotVIaLEljbwx7RzqvarzxvTpEkcX5Y/96Mg4QnqHhNzSvsYTvU8Zc4z5a3hXLb+5uTiF/inN1kytSurn+orGx6/YvFqcff1/WvbYYe//Qie9B6eknrPFQZWU9BSY/Xp7buomNAydHErev5de32Ope9zWM7GuTrBsSV368UxxZt/cJ1CMuV9nB/O/NTHMvXep57uVvOBRql+6ShtMbXlcsZzgwm2n3AM1/eimT3vLC4PbxOcf4b89/lbXPnnG4WnP9dnv/iTPH0UvyCSMqLM4jqFBXbEUGrNxVjv36I043mMIEOIKmhAwIhhBBCCCGEEEIIIYQQQgghhBBC+u+AoDkfoILWUu5azgf4WvYY/ybQ+eBiXE/Cg+3Hir9q+6I09iWPH5TITYFKf8TKBzoY4J71loJcyku+rPhVBX5L+DoRWFSd56nb921HHCf+vfjlU8rrL/X175t/uQ6tcdGcD7qy/rR9PfaVtpW4vgr0tuibEln6K04FoQr0vue/bvy+ecD6xRFCO26dZ9WP+J7XVvt5+cjOB6mvv1Ttd2W9iR1/W3GhEiZUCWsp5xpTwMKe99oeuaGKldXV3UEllbZ3rNQv5+Eeqhpmv0WRJPlTtvZUkX4E7r3+Os7KP7lwp5Pj+Xt6fiqcF4xnvoRc2XNi4y9x54qcE4tfUy6pCi/P+R97/cPj5vpn5EviDGYg8SOiVJPW6o5/19c/S6Fn1tvz+FM7HYSWv7z/6qAzk++e4B9ufgtyOtLmP16P2K6Gdt2XHG6kHuh/7ojgqfTPHQeU+lBBrDnyWOsVxq3lp5zXmZfyWO2/Qd37NWI5HVjl66Ldz71R+qspkTn/Mzj/j89Ha572df5r61H+vCDPS6GOCLGdEZpiHPYFLD5PaXeNrjkfCHRAIIQQQgghhBBCCCGEEEIIIYQQQkh7Dgjyi5Smf0lhKWgtxTq+rymHc+Xtu7D+oYJeEEWvpuzF9rV66sav4dt+LL6dfb3/5ew/t79G3evTVxkv46Apt6vmUUPbiz5WfVUdBar2w1K8y/tdbz+U1Ndf2+1rDiNa/pte/2JBp4NhKHFRed1Wv7oWf2qY/1GQY4DlJGC9X/e81O33/fprq33tdq+1/yJOXA3fP0Pjt/qlxfnHwH5pirzVZHlUuRqKpoQVxdoP879+iqH4y3HKzo322lOhUlKqOEWmpVzBPWVRyVl5z2MlrtRKYKtc68rfUxt/3JP31OJXjAC8nRCgX5Zy3wLLaU4Csv5t55AvA8v5YDnJ3l+77vcmftlj2vP6lzgF+T5V/nrH39P1D+MXTn79r4g4GaCzAToc+Dof4PMVKvTFMUBbD7H85ahYX+XnI6Dqcx2SX8+y/mMBdD7QnBA8y+F6FYp2nuWA4Ivsuf66O+4MMVL2lo+txK47/3KHi4qozkbidKEB/ZO8xoLz/zTmv8wzqT/0PMuxpavzX3VmqeqI0DVnhKrfv537OR503flAoAMCIYQQQgghhBBCCCGEEEIIIYQQQuI7IIQ6HbTljKCBylpUCFvv+yr5Z+Pib02sPdQ36+1BpW9s5X3T8Ut5icfaix2V+7FAJbbkH/P7uHk8eJ6Uqxo/jndT8f949/3+F8Lf3f6Q/XL4sRiPL7H6oynkfZ0PUrUvjOfzg/nty/XXePuGxGjrJBOzaZz1L5S6609T69HQ8N3zuy0Fbtucevyp6Vr+N27ZXHT7B8SdR/LY9fFP1b7mKKE5jjQ17+vGbzkfaHF+OYqjzECFRiyFECprUVFVeW9MX3LFdDG/ltLG2pO+7h6+ZrlAhe6vb/++fy7/+v1Pn4KcEALbq6zwtdr3VKxInN6cyPifavzoiCFKLssJoa31T9Y9qS90/UPnA9UBJNAJoTPx37496oSA17/1fWlVJ4iur3+a84GA+Rjq+t/U9+SWs4Gv8wE6AmgOINZzkrzG61EcEdAJQVO6avW3BjjrjJT1DhXKlnNPU1h50tYfVBzjuj0ufo1aUoBrSm3t/ms5GDQ1/ywHBa2fpvIb6ivd99xf7frn/I9D3+e/Wr/n50u1Hs/2U81/DSzv64iAz9Mj63miJWdPi53xvNx3xwOEDgiEEEIIIYQQQgghhBBCCCGEEEIIqc2bm+1DYY8mwfqlbizng2sQpp67X3xYe6EjqPRFhS7uSS58Of/Lm2POB6KgtfaiF7Q902Mrn2PFH1q/pnwWpbTkKz9PlMhOia4p0HPFv5znlP9W/q1x0PIv8YSOCyqxpd3YinwrH/lxpV1f5TfWh/Va71v1Jmsf8qzl+9+Pvxxc/7p2/TXV/sPd2iv/Vdc/rf3Q66/u+qNxcR+2t1YoqR2CrPZvL1re+wq4eyn2y1Kca8rgU8dSGvsq0vua/1jxW9ARYRQ1v6nXn9Q8jS56eb3Fuh6/GR/+/IVcLr/IFHoPt4XjqGiKpXz13Su+tOfs1d3+74f175WctiTOXFkLe8mL8tLaY9RX6VL1uNae1k9RCPvmJXdC8FWwILEU+BUVr4LlfPCnh799+s9yr+ts/gx1/HeL4vWCyujt/c2g45/d3B99PpfXpXm/yda5ttY/VJKiotBa/3CcUcnl+3lo/bztRfz5fQHmucxvVO6Fxt/X9c9yPtBQr4Oexd+080Fdttv7pM9Ps9lNYbzzvdcFUPSu3P2xqX5pYF6wvPW+VV8sVstbr73YrfmI6456/aHiWtoD5bVFqvlngnFo8SrXv+86qM5/WMfw/heLwcx/9/yhrdtdnf/B863q8ab6U3P+V8VyDrHA54vg5wxPtLxMan6x09XnCt//P9ABgRBCCCGEEEIIIYQQQgghhBBCCCG1+UPVX1Y09cuLUOcDQZS0qASOhSh9ReGr7U3ftvOBb/yW4rjuXvXa3uuash+V6PIalf8WmgLbUpxbefCNX9uLvi6YD1H0ixOCpfjXyllU7X/X2kc0p4muXH9daV/LP65/vmjXoeZIor0fa/3pitNBbGeEqu0bAtzG917vi7K86fjrIj+kFcW0pjyWPKNSve/5rxu/L1be6jpM9O38uo4Sfbn+UrefmtTxi3L+cpbtIWwpp1DBWhWsB+vDPcGjOx+UOpSNwwaUUeZ5NSntESp7nvue5/p3OcritPKEjgG5I4JSvqRY8VSsNqVo0RwPNFTng4GN/8Y5rqFCXnU+GFz8NwUnBHQ+wOf3XKHl5jOuN02tf9qe2gj2B687zflAixeP58o593f17r4X8aPir+rnPKxn/dzt9S+W0lHyVXIGGXU7/q47HiDoYBLrucn3OepO+wAh66bbU13W0ab617SCuy1l/0jbsx2Uytb66w0qozXFtPI69fzL12/ffguBSvLgfLvnG3lu0OKIxVDmP+Yrf06D+0FX5n8Ozi/tObbucav9lud/XSyHfgvVgSCy5WTd2T/t+PNE1f8/0AGBEEIIIYQQQgghhBBCCCGEEEIIIc05IKSmqiIWy2l7hmt8t/hzpjgfnR3da3w2nRxU4DflfOCrYJb35e9mva20d7z8lXhSOQH4OlDIcd/+WnvMy1/LScE3fkuhH+qEEMuRwBon7X2rH6nbj+140NT1l7r90jw1nANk/dPKhV5/fVl/LDRlj6XwSd++3y9FUyt/U++Fnjr+1DD/hwl1AKjrGND38/t6/TXVvuSz6w4kseOXuL8JdAZYTWDPcadgQkUTKquqotWr7YH+w/yvn/5TeRPqiKAquDVFpyjCQelj7WWP7eBxeY3HS8pvT6VpXWW65oggeCtjG9q7M9TxQOPUx//U4sfncVRujTfZuiPrn+bAEnv9Q6Wl7/qX77HtnC5Gbk9yy/lAwOPojIHtdSV+VIyK08W1my9PL7sonwPRYSDYGaCnSn/NEaEr63/XFYoasZ+XQtuVPdnF6WWsOB/gOuyrqPbdqx6P11VsW+dr7Vr91dDylOfROSE8v50dnL+WYli9jtz3MiNxHJTX1p7zsn66l6nmXw72s6LyW/KkrRuW09EYnA98nXhOff6recqdp7L78PP5Lu7893VCwHKC8Vx89nJ4vr1ePFUqV2pX+pN4/semrjNCKqY9fY6o+v8HOiAQQgghhBBCCCGEEEIIIYQQQgghZFSX/weTk42FLpDU/gAAAABJRU5ErkJggg==';
const TEACHING_REFERENCE_IDS = [...new Set([...TEACHING_ROLES,...GRASS_SINGLE_TEACHING_ROLES,...ROAD_TEACHING_ROLES,...PINE_TEACHING_ROLES,...ROUND_TEACHING_ROLES,...MULTI_TEACHING_ROLES,...GRASS_MULTI_TEACHING_ROLES].map(r=>r[2]))];
const TEACHING_STORAGE = 'single-mountain-teaching-v1:';
const roleById = new Map(TEACHING_ROLES.map(([key,,id]) => [id,key]));
const cloneTeaching = value => JSON.parse(JSON.stringify(value));
const materialRole = role => role === 'ground' || role === 'rock';

function teachingMask(shape, width=22, height=18) {
  if (!TEACHING_SHAPES.some(([id]) => id === shape)) throw Error('未知预览形状');
  const mask = new Set();
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    let inside = x>=3 && x<=18 && y>=3 && y<=14;
    if (shape==='lesson') inside &&= !((x<6||x>15)&&(y<6||y>11));
    if (shape==='stairs') inside = y>=3&&y<=14&&x>=3+Math.max(0,Math.floor((y-5)/3))*2&&x<=13+Math.min(3,Math.floor((y-3)/3))*2;
    if (shape==='notch') inside &&= !(x>=9&&x<=12&&y<=9);
    if (shape==='border') inside = x<=15&&y>=3&&y<=14&&!(x>=12&&y>=10);
    if (inside) mask.add(`${x},${y}`);
  }
  return mask;
}

function newTeachingProfile(atlas,kind='single-mountain') {
  return {schema:1, kind, ...(multiTeaching(kind)?{previewLayers:2}:{}),name:kind==='single-mountain'?'我的单层山体':`我的${teachingTypeName(kind)}`, atlas:cloneTeaching(atlas),
    roles:Object.fromEntries(teachingRoles(kind).map(([key]) => [key,{tile:null,base:'auto',layer:teachingLayer(kind,key)}]))};
}

function validateTeachingProfile(value, atlas, expectedKind=value?.kind) {
  if (!value || value.schema!==1 || value.kind!==expectedKind || !TEACHING_TYPES.some(([kind])=>kind===value.kind) || !value.roles) throw Error('教学档案类型与当前窗口不同');
  if (!value.atlas || value.atlas.fingerprint!==atlas.fingerprint || value.atlas.width!==atlas.width || value.atlas.height!==atlas.height) throw Error('档案的图块图片与当前图块集不同，请先切换到对应图块集');
  if (typeof value.name!=='string' || value.name.length>80) throw Error('档案名称需在 80 字以内');
  const max=384+atlas.width/32*(atlas.height/32)-1;
  const validTile=(id,empty)=>Number.isInteger(id)&&((empty&&id===0)||(id>=384&&id<=max));
  const profile=newTeachingProfile(atlas,value.kind); profile.name=value.name;
  if(multiTeaching(value.kind)){const count=value.previewLayers??2;if(!Number.isSafeInteger(count)||count<2||count>99)throw Error('预览层数请填 2～99 的整数');profile.previewLayers=count;}
  for(const [key] of teachingRoles(value.kind)){
    const entry=value.roles[key];
    if(!entry)throw Error(`“${key}”的图块编号无效`);
    const layer=entry.layer===undefined?teachingLayer(value.kind,key):entry.layer;
    if(!Number.isSafeInteger(layer)||layer<0||layer>255)throw Error(`“${key}”的图层编号无效`);
    if(!(entry.tile===null||validTile(entry.tile,layer>0))) throw Error(`“${key}”的图块编号无效`);
    if(!(['auto','ground','rock'].includes(entry.base)||validTile(entry.base,false))) throw Error(`“${key}”的底图设置无效`);
    profile.roles[key]={tile:entry.tile,base:!mountainTeaching(value.kind)||materialRole(key)?'auto':entry.base,layer};
  }
  return profile;
}

function teachingProgress(profile) {
  return teachingRoles(profile.kind).filter(([key]) => profile.roles[key].tile!==null).length;
}

function teachingLayout(profile, shape, layout, engines={}) {
  if(multiTeaching(profile.kind))return multiTeachingLayout(profile,shape,engines);
  if(!singleTeaching(profile.kind))return extraTeachingLayout(profile,shape,engines);
  const width=22,height=18,cells=[];
  let plan;
  if(shape.startsWith('dig')){
    const arrays=new Map([0,1,2].map(z=>[z,new Int32Array(width*height).fill(z===0?385:0)]));
    const s={width,height,arrays,events:new Set(),blocked:new Set(),read:(z,x,y)=>x>=0&&y>=0&&x<width&&y<height?arrays.get(z)[y*width+x]:0};
    const rect=(a,b,c,d)=>{const out=new Set();for(let y=b;y<=d;y++)for(let x=a;x<=c;x++)out.add(`${x},${y}`);return out;};
    const apply=p=>{if(p.conflicts.size)throw Error('下挖教学范例生成失败');for(const c of p.changes)arrays.get(c.layer)[c.y*width+c.x]=c.value;};
    apply(engines.Mountain.plan(s,rect(1,1,20,16),'add',385,1,{x:10,y:8}));
    if(shape!=='digGround')apply(engines.Mountain.plan(s,rect(3,3,18,14),'add',385,'raise',{x:10,y:8}));
    apply(engines.Features.planDig(s,rect(6,5,15,12),385,{x:10,y:8}));
    if(shape==='digThrough')apply(engines.Features.planDig(s,rect(8,7,13,10),385,{x:10,y:8}));
    const tiles=new Map();for(let y=0;y<height;y++)for(let x=0;x<width;x++){const base=s.read(0,x,y),edge=s.read(1,x,y);if(base===1177||edge)tiles.set(`${x},${y}`,{x,y,id:edge||1177,edge,rock:base===1177});}
    plan={tiles,errors:new Map()};
  }else if(shape==='raised'||shape==='expanded'){
    const base=new Set(),upper=new Set();
    for(let y=2;y<=15;y++)for(let x=2;x<=19;x++)base.add(`${x},${y}`);
    for(let y=5;y<=12;y++)for(let x=6;x<=(shape==='expanded'?17:14);x++)upper.add(`${x},${y}`);
    plan=engines.Mountain.combine([base,upper],width,height);
  }else plan=layout(teachingMask(shape,width,height),width,height);
  if(plan.errors.size) throw Error('教学形状包含无法生成的地形');
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const t=plan.tiles.get(`${x},${y}`), role=t?roleById.get(t.id):'ground';
    if(!role) throw Error(`未识别的山体角色 ${t.id}`);
    const entry=profile.roles[role], auto=t?.rock?'rock':'ground';
    const grassStyle=profile.kind==='grass-single-mountain',referenceRole=teachingRoles(profile.kind).find(([k])=>k===role);
    const baseRole=materialRole(role)?role:entry.base==='auto'?auto:entry.base;
    const baseId=typeof baseRole==='number'?baseRole:profile.roles[baseRole].tile;
    cells.push({x,y,role,baseRole,baseId,edgeId:materialRole(role)?0:entry.tile,
      referenceBase:t?.rock?(grassStyle?388:1177):385, referenceEdge:materialRole(role)?0:referenceRole[2]});
  }
  return {width,height,cells};
}

async function teachingTimeout(promise, stage) {
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`${stage}超时，请点击“重新加载”重试`)),15000);})]);}
  finally{clearTimeout(timer);}
}

async function loadTeachingImage(ctx, tilesetId, nativeLoader) {
  // Maker Studio 1.7.1's SDK reads atlas.canvas although its renderer returns
  // tilesetBitmap. Keep the public route first, then use the versioned bridge.
  let url=null,owned=false;
  try{url=await teachingTimeout(Promise.resolve().then(()=>ctx.tileset.getImageBlobUrl(tilesetId)),'读取图块');}catch(error){if(!nativeLoader)throw error;}
  try{
    if(!url){
      if(!nativeLoader)throw Error('取图接口返回空值，且当前宿主没有可用的图块兼容接口');
      const source=await teachingTimeout(nativeLoader(tilesetId),'读取原生图块');
      let blob;
      if(source instanceof Blob){blob=source;}
      else{
        if(!source||!source.width||!source.height)throw Error('原生图块图片为空，请确认该图块集图片存在');
        const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
        canvas.getContext('2d').drawImage(source,0,0);
        blob=await teachingTimeout(new Promise(resolve=>canvas.toBlob(resolve,'image/png')),'转换图块');
      }
      if(!blob)throw Error('无法将原生图块转换为预览图片');
      url=URL.createObjectURL(blob);owned=true;
    }
    const response=await teachingTimeout(fetch(url),'读取图块图片');if(!response.ok)throw Error('图块图片读取失败');
    const bytes=await teachingTimeout(response.arrayBuffer(),'读取图块数据');
    const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');
    const legacyHash=await digest(bytes);
    const image=new Image();image.src=url;await teachingTimeout(image.decode(),'解码图块');
    const pixels=document.createElement('canvas');pixels.width=image.naturalWidth;pixels.height=image.naturalHeight;
    const drawing=pixels.getContext('2d');drawing.drawImage(image,0,0);
    const hash=`${pixels.width}x${pixels.height}:`+await digest(drawing.getImageData(0,0,pixels.width,pixels.height).data);
    return {image,hash,legacyHash};
  }finally{if(owned)URL.revokeObjectURL(url);}
}

function createTileTeaching(ctx, layout, beforeOpen=()=>{}, nativeLoader=null, onSaved=()=>{}, engines={}) {
  const id='com.mimi.procedural-terrain.tile-teaching', drafts=new Map(), disposers=new Set();
  let registered=false;
  const register=()=>{
    if(registered)return; registered=true;
    ctx.ui.registerPanel({id,title:'图块教学',defaultPosition:'float',showInMenu:false,
      defaultSize:{width:1180,height:790},render:renderTeaching});
  };
  function renderTeaching(host,kind='single-mountain') {
    const TEACHING_ROLES=teachingRoles(kind),simple=!mountainTeaching(kind);
    const materialRole=role=>simple||role==='ground'||role==='rock';
    const makeProfile=atlas=>newTeachingProfile(atlas,kind),checkProfile=(value,atlas)=>validateTeachingProfile(value,atlas,kind);
    let replacement=null;
    const root=document.createElement('div'); root.className='mimi-teach';
    root.innerHTML=`<style>
      .mimi-teach{box-sizing:border-box;padding:16px;font:13px/1.5 sans-serif;color:var(--text-primary,#e5e9f0);height:100%;overflow:auto;background:var(--bg-primary,#191d28)}
      .mimi-teach *{box-sizing:border-box}.mimi-teach h2{margin:0;font-size:18px}.mimi-teach h3{margin:0 0 8px;font-size:14px}
      .mimi-teach button,.mimi-teach select,.mimi-teach input,.mimi-teach textarea{font:inherit;color:inherit;border:1px solid var(--border,#465266);border-radius:5px;background:var(--bg-secondary,#252d3b);padding:7px;min-width:0}
      .mimi-teach button{cursor:pointer}.mimi-teach button:hover{border-color:#80caa1}.mimi-teach button:disabled{opacity:.45;cursor:default}
      .mimi-teach [aria-pressed=true]{background:#315c49;border-color:#8cdaad}.mimi-teach .mt-primary{background:#386f50;border-color:#70b48b;color:white}
      .mimi-teach .mt-top,.mimi-teach .mt-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.mimi-teach .mt-top label{display:flex;gap:7px;align-items:center}
      .mimi-teach .mt-hint{color:var(--text-secondary,#aab9cb);font-size:12px;margin:5px 0 12px}.mimi-teach .mt-columns{display:grid;grid-template-columns:270px minmax(370px,1fr) 218px;gap:14px;min-width:900px}
      .mimi-teach .mt-card{border:1px solid var(--border,#384256);border-radius:8px;background:var(--bg-secondary,#202735);padding:10px;min-width:0}
      .mimi-teach .mt-palette-scroll{height:430px;overflow:auto;background:#101720;position:relative}.mimi-teach canvas{display:block;image-rendering:pixelated;max-width:none;touch-action:manipulation}
      .mimi-teach [data-mt=palette]{cursor:crosshair}.mimi-teach .mt-view{overflow:auto;background:#18282b;border-radius:5px;margin:8px 0;min-height:290px;display:grid;align-items:start;justify-items:center}
      .mimi-teach [data-mt=preview]{width:100%;max-width:396px;height:auto;cursor:crosshair}.mimi-teach .mt-role-list{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:10px}
      .mimi-teach .mt-role-list button{text-align:left;padding:5px;font-size:12px}.mimi-teach [data-mt=roleTitle]{color:#a8edc2;margin-bottom:8px}.mimi-teach .mt-field{display:grid;gap:5px;margin:10px 0}
      .mimi-teach .mt-inline{display:flex;gap:5px}.mimi-teach .mt-inline>*{flex:1}.mimi-teach .mt-readout{padding:9px;background:#18212a;border-radius:6px;margin:9px 0;white-space:pre-line;color:#d4e0ec}
      .mimi-teach .mt-status{min-height:40px;margin:10px 0 0;padding:9px;border-left:3px solid #6fb78e;background:var(--bg-secondary,#202735);white-space:pre-wrap}
      .mimi-teach .mt-status[data-error=true]{border-color:#ec8888}.mimi-teach .mt-json{margin-top:10px}.mimi-teach .mt-json textarea{width:100%;height:145px;font-family:monospace}.mimi-teach .mt-progress{margin-left:auto;color:#b9e6cc}
    </style>
    <div class="mt-top"><h2>图块教学</h2><select data-mt="kind" aria-label="教学类型"></select><span class="mt-progress" data-mt="progress"></span></div>
    <p class="mt-hint">点选范例中的位置，再从左侧选择图块。同类位置一起更新，点击一次“整体保存教学”即可试画；缺失映射的格子标红跳过，其余正常绘制。多层山体、草地多层山体分别保存，一套映射用于不同层数。</p>
    <div class="mt-status" data-mt="status" role="status" style="margin:0 0 12px">正在读取图块集…</div>
     <div class="mt-top"><label>图块集 <select data-mt="tileset" aria-label="教学图块集"></select></label><button data-mt="retry">重新加载</button><label>教学式样 <select data-mt="profileSelect" aria-label="已保存的教学式样"></select></label><label>名称 <input data-mt="name" maxlength="80" aria-label="当前教学式样名称"></label><button data-mt="example">载入 Outside 示例</button><button data-mt="new">新增教学</button></div>
    <div class="mt-columns">
      <section class="mt-card"><h3>① 选择自己的图块</h3><p class="mt-hint">当前项：<span data-mt="assignment"></span></p><div class="mt-palette-scroll"><canvas data-mt="palette" aria-label="图块素材" tabindex="0"></canvas></div><div class="mt-inline" style="margin-top:8px"><input data-mt="tileId" type="number" min="384" step="1" placeholder="图块 ID" aria-label="填写图块 ID"><button data-mt="assign">填入</button></div><p class="mt-hint">第一版使用普通 32×32 图块；自动元件暂不参与教学。</p></section>
      <section class="mt-card"><h3>② 填写与预览</h3><div class="mt-inline"><select data-mt="shape" aria-label="预览形状"></select><select data-mt="viewLayer" aria-label="预览图层"><option value="both">合成图层</option><option value="base">仅图层 1</option><option value="edge">仅图层 2</option></select></div><div class="mt-view"><canvas data-mt="preview" width="528" height="432" aria-label="图块教学预览"></canvas></div><label><input data-mt="guide" type="checkbox" checked> 未填写处显示半透明范例</label><label style="display:block"><input data-mt="selection" type="checkbox" checked> 显示红色选中框</label><div class="mt-role-list" data-mt="roles"></div></section>
      <section class="mt-card"><h3>③ 当前填写位置</h3><strong data-mt="roleTitle"></strong><p class="mt-hint" data-mt="roleHint"></p><div class="mt-field"><label>绘制图层</label><select data-mt="targetLayer" aria-label="该图块的绘制图层"></select></div><div class="mt-field" data-mt="partRow"><label>编辑内容</label><select data-mt="editPart" aria-label="编辑主图块或底图"><option value="tile">当前图块</option><option value="underlay">下方底图</option></select></div><div class="mt-readout" data-mt="readout"></div><div class="mt-field"><button data-mt="auto">底图跟随范例规则</button><button data-mt="empty">当前图层留空</button><button data-mt="clear">清除当前填写</button><button data-mt="next">下一个未填写项</button></div><p class="mt-hint">${kind==='pine-forest'?'范例包含单棵、连片和洞口。A / B 是连片树身的交替样式；逐项点击可查看对应位置。':kind==='round-forest'?'左侧单棵树的树冠下方直接接树底；右侧连片树才使用树身。范例同时展示独立、接续和开口。':'内角的方向表示缺口在哪一侧。点击范例可查看该格，不必凭名称猜测。'}</p><div class="mt-field"><button class="mt-primary" data-mt="save">整体保存教学</button><button data-mt="jsonToggle">导入 / 导出 JSON</button></div><div class="mt-hint" data-mt="dirty"></div></section>
    </div>
    <div class="mt-json" data-mt="jsonArea" hidden><textarea data-mt="json" aria-label="教学 JSON" placeholder="可粘贴教学档案 JSON"></textarea><div class="mt-actions"><button data-mt="export">生成 JSON</button><button data-mt="exportFile">导出到 Mod 文件夹</button><button data-mt="import">导入此 JSON</button></div></div>
    `;
    host.appendChild(root);
    const layerField=document.createElement('label');layerField.className='mt-top';layerField.style.display=multiTeaching(kind)?'flex':'none';
    layerField.innerHTML='预览层数 <input data-mt="previewLayers" aria-label="多层山体预览层数" type="number" min="2" max="99" step="1" value="2" style="width:90px"><span class="mt-hint">改变预览层数检查接缝；实际绘制使用主面板层数。</span>';
    root.querySelector('.mt-view').before(layerField);
    const refs=Object.fromEntries([...root.querySelectorAll('[data-mt]')].map(el=>[el.dataset.mt,el]));
    let alive=true,token=0,profile=null,library={version:2,selectedId:null,entries:[]},activeId=null,atlasImage=null,atlas=null,storageKey=null,role=kind==='round-forest'?'capTip':'ground',selectedCell=null,selectedTile=null,dirty=false,busy=false,saveBusy=false;
    const reference=new Image();reference.src=TEACHING_REFERENCE;reference.onload=()=>{if(alive&&profile)paint();};
    const message=(text,error=false)=>{if(!alive)return;refs.status.textContent=text;refs.status.dataset.error=String(error);};
    const listeners=[];
    const listen=(element,event,fn)=>{element.addEventListener(event,fn);listeners.push(()=>element.removeEventListener(event,fn));};
    const activeEntry=()=>profile.roles[role];
    const remember=()=>{if(profile&&storageKey)drafts.set(storageKey,{library:cloneTeaching(library),activeId,profile:cloneTeaching(profile),dirty});};
    const changed=()=>{dirty=true;remember();sync();};
    const busyUI=()=>{for(const el of root.querySelectorAll('button,input,select,textarea'))el.disabled=busy;};
    function drawTile(drawing,image,id,x,y,size,ref=false,alpha=1){
      if(id===0||id===null||!image?.complete||!image.naturalWidth)return;
      const columns=ref?TEACHING_REFERENCE_IDS.length:image.naturalWidth/32;
      const index=ref?TEACHING_REFERENCE_IDS.indexOf(id):id-384;
      if(index<0)return;
      drawing.save();drawing.globalAlpha=alpha;
      drawing.drawImage(image,(index%columns)*32,Math.floor(index/columns)*32,32,32,x,y,size,size);drawing.restore();
    }
    function physicalPieces(cell){
      const ids=[cell.baseId,cell.edgeId,cell.topId],refs=[cell.referenceBase,cell.referenceEdge,cell.referenceTop];
      const roles=cell.layerRoles||[typeof cell.baseRole==='string'?cell.baseRole:cell.role==='rock'?'rock':'ground',materialRole(cell.role)?null:cell.role,null];
      const pieces=[];
      for(let z=0;z<3;z++){
        const name=roles[z]||(z===0&&cell.baseRole!==undefined?'ground':null);
        if(!name||ids[z]===0&&refs[z]===0)continue;
        pieces.push({role:name,layer:placedLayer(profile,name),id:ids[z],reference:refs[z]});
      }
      return pieces.sort((a,b)=>a.layer-b.layer);
    }
    function paint(){
      if(!profile||!atlasImage)return;
      const generated=teachingLayout(profile,refs.shape.value,layout,engines), layer=refs.viewLayer.value,guide=refs.guide.checked;
      const pixelWidth=generated.width*24,pixelHeight=generated.height*24;
      if(refs.preview.width!==pixelWidth)refs.preview.width=pixelWidth;if(refs.preview.height!==pixelHeight)refs.preview.height=pixelHeight;
      const drawing=refs.preview.getContext('2d');drawing.imageSmoothingEnabled=false;drawing.clearRect(0,0,pixelWidth,pixelHeight);drawing.fillStyle='#26393b';drawing.fillRect(0,0,pixelWidth,pixelHeight);
      const shown=layer==='both'?null:layer==='base'?0:layer==='edge'?1:layer==='top'?2:Number(layer.slice(6));
      for(const cell of generated.cells)for(const piece of physicalPieces(cell)){
        if(shown!==null&&piece.layer!==shown)continue;
        const x=cell.x*24,y=cell.y*24;
        if(piece.id!==null&&piece.id!==undefined)drawTile(drawing,atlasImage,piece.id,x,y,24);
        else if(guide)drawTile(drawing,reference,piece.reference,x,y,24,true,.4);
      }
      if(refs.selection.checked){
        // One outline around connected matching cells: no per-tile vertical
        // stripes obscuring a continuous cliff wall.
        const selected=generated.cells.filter(c=>c.role===role||c.layerRoles?.includes(role)),keys=new Set(selected.map(c=>`${c.x},${c.y}`));
        drawing.strokeStyle='#ff0000';drawing.lineWidth=3;drawing.beginPath();
        for(const c of selected){const x=c.x*24,y=c.y*24;
          if(!keys.has(`${c.x},${c.y-1}`)){drawing.moveTo(x,y+1.5);drawing.lineTo(x+24,y+1.5);}
          if(!keys.has(`${c.x},${c.y+1}`)){drawing.moveTo(x,y+22.5);drawing.lineTo(x+24,y+22.5);}
          if(!keys.has(`${c.x-1},${c.y}`)){drawing.moveTo(x+1.5,y);drawing.lineTo(x+1.5,y+24);}
          if(!keys.has(`${c.x+1},${c.y}`)){drawing.moveTo(x+22.5,y);drawing.lineTo(x+22.5,y+24);}
        }
        drawing.stroke();
        if(selectedCell){drawing.lineWidth=4;drawing.strokeRect(selectedCell.x*24+2,selectedCell.y*24+2,20,20);}
      }
      const palette=refs.palette.getContext('2d');palette.imageSmoothingEnabled=false;palette.clearRect(0,0,refs.palette.width,refs.palette.height);palette.drawImage(atlasImage,0,0);
      if(selectedTile>=384){const n=selectedTile-384,x=n%(atlas.width/32)*32,y=Math.floor(n/(atlas.width/32))*32;palette.fillStyle='rgba(255,0,0,.15)';palette.fillRect(x,y,32,32);palette.strokeStyle='#ff0000';palette.lineWidth=3;palette.strokeRect(x+1.5,y+1.5,29,29);}
    }
    function sync(){
      if(!profile)return;busyUI();
      const options=library.entries.map(entry=>new Option(entry.id===activeId?profile.name:entry.profile.name,entry.id));
      if(!library.entries.some(entry=>entry.id===activeId))options.push(new Option(`${profile.name}（未保存）`,activeId));
      refs.profileSelect.replaceChildren(...options);refs.profileSelect.value=activeId;refs.profileSelect.disabled=busy||saveBusy;
      const material=materialRole(role),entry=activeEntry(),title=TEACHING_ROLES.find(([key])=>key===role)[1];
      const available=[...new Set([0,1,2,entry.layer,...(ctx.map.layers(ctx.editor.activeMapId())||[]).map(layer=>layer.index)])].filter(Number.isSafeInteger).sort((a,b)=>a-b);
      refs.targetLayer.replaceChildren(...available.map(z=>new Option(`图层 ${z+1}`,String(z))));
      refs.targetLayer.value=String(entry.layer);refs.targetLayer.disabled=busy;
      refs.partRow.style.display=simple||material?'none':'grid';refs.editPart.disabled=busy||simple||material;
      refs.name.value=profile.name;refs.roleTitle.textContent=title;
      if(multiTeaching(kind))refs.previewLayers.value=String(profile.previewLayers??2);
      refs.roleHint.textContent=`该位置将画在图层 ${entry.layer+1}。${kind==='pine-forest'?'高松林保持示例的树位尺寸。':kind==='round-forest'?'单棵圆冠树冠顶直接接树底。':mountainTeaching(kind)?'岩壁下方底图可单独指定。':'同类位置一起更新。'}`;
      refs.assignment.textContent=`${title} / 图层 ${entry.layer+1}`;
      const tileText=id=>id===null?'未填写':id===0?'透明 / 留空':`ID ${id}`;
      const baseText=entry.base==='auto'?'自动：按范例使用背景 / 岩面':entry.base==='ground'?'使用背景草地':entry.base==='rock'?'使用山顶岩面':tileText(entry.base);
      refs.readout.textContent=material?`图层 ${entry.layer+1}：${tileText(entry.tile)}`:`图层 ${entry.layer+1}：${tileText(entry.tile)}\n下方底图：${baseText}`;
      refs.auto.disabled=busy||material;refs.empty.disabled=busy||entry.layer===0;refs.empty.textContent=`图层 ${entry.layer+1} 留空`;
      refs.save.disabled=busy||saveBusy;
      refs.example.disabled=busy||!/^Outside(?:\.|$)/i.test(atlas.tilesetName);
      refs.progress.textContent=`已填写 ${teachingProgress(profile)} / ${TEACHING_ROLES.length}`;
      refs.dirty.textContent=dirty?'有未保存的教学修改':'当前教学已保存或尚未修改';
      for(const button of refs.roles.children){button.setAttribute('aria-pressed',String(button.dataset.role===role));const [key,name]=TEACHING_ROLES.find(([key])=>key===button.dataset.role);button.textContent=`${profile.roles[key].tile===null?'○':'✓'} ${name}`;}
      const current=material||refs.editPart.value==='tile'?entry.tile:typeof entry.base==='number'?entry.base:null;
      selectedTile=current;refs.tileId.value=current>=384?String(current):'';
      paint();
    }
    function selectRole(next,cell=null){
      role=next;selectedCell=cell;refs.editPart.value='tile';sync();
      if(selectedTile>=384){const n=selectedTile-384,scroll=refs.palette.parentElement;scroll.scrollTop=Math.max(0,Math.floor(n/(atlas.width/32))*32-scroll.clientHeight/2+16);scroll.scrollLeft=Math.max(0,n%(atlas.width/32)*32-scroll.clientWidth/2+16);}
    }
    function assignTile(id){
      if(busy||!profile)return;
      const max=384+atlas.width/32*(atlas.height/32)-1;
      if(!Number.isInteger(id)||id<384||id>max){message(`请选取有效普通图块（384～${max}）。`,true);return;}
      const entry=activeEntry();
      if(materialRole(role)||refs.editPart.value==='tile')entry.tile=id;else entry.base=id;
      changed();message(`已填入 ID ${id}；所有同类位置已更新。`);
    }
    async function loadTileset(tilesetId){
      remember();const current=++token;busy=true;busyUI();profile=null;atlasImage=null;atlas=null;message('正在读取图块图片和已保存的教学…');
      refs.preview.getContext('2d').clearRect(0,0,528,432);refs.palette.width=1;refs.palette.height=1;
      try{
        const info=ctx.tileset.info(tilesetId);if(!info)throw Error('找不到图块集信息');
        const {image,hash,legacyHash}=await loadTeachingImage(ctx,tilesetId,nativeLoader);
        if(image.naturalWidth%32||image.naturalHeight%32||!image.naturalWidth||!image.naturalHeight)throw Error('第一版要求图块图片宽高为 32 像素的整数倍');
        const nextAtlas={tilesetId,tilesetName:info.tilesetName||info.name||String(tilesetId),width:image.naturalWidth,height:image.naturalHeight,fingerprint:hash};
        const project=ctx.editor.gameRoot?.()||'unknown-project';
        const loaded=await readTeachingLibrary(ctx,kind,project,nextAtlas,legacyHash);
        if(!alive||current!==token)return;
        atlas=nextAtlas;atlasImage=image;storageKey=loaded.key;
        for(const option of [...refs.viewLayer.options])if(option.value.startsWith('layer:'))option.remove();
        for(const layer of ctx.map.layers(ctx.editor.activeMapId())||[])if(layer.index>=3)refs.viewLayer.add(new Option(`仅图层 ${layer.index+1}`,`layer:${layer.index}`));
        const draft=drafts.get(storageKey);
        library=draft?.library||loaded.library;
        activeId=draft?.activeId||library.selectedId||library.entries[0]?.id||teachingId();
        let warning='';
        try{profile=checkProfile(draft?.profile||library.entries.find(entry=>entry.id===activeId)?.profile||makeProfile(atlas),atlas);dirty=Boolean(draft?.dirty);}
        catch(error){profile=makeProfile(atlas);activeId=teachingId();dirty=false;warning=`教学档案无法读取：${error.message}。`;}
        refs.palette.width=atlas.width;refs.palette.height=atlas.height;refs.palette.style.width=`${atlas.width}px`;refs.palette.style.height=`${atlas.height}px`;
        busy=false;role=kind==='round-forest'?'capTip':'ground';selectedCell=null;refs.editPart.value='tile';sync();
        message(warning||(library.entries.length||draft?'已恢复教学；可从“教学式样”切换，也可新增。':kind==='round-forest'?'半透明树形是待填写位置；点击树冠或树底，再从左侧选取相应图块。':'先点“背景草地”，再从左侧图块集选取素材。也可载入 Outside 示例熟悉操作。'),Boolean(warning));
      }catch(error){if(alive&&current===token){busy=false;for(const el of root.querySelectorAll('button,input,select,textarea'))el.disabled=true;refs.tileset.disabled=false;refs.retry.disabled=false;refs.kind.disabled=false;message(error.message,true);}}
    }
    for(const [value,name] of [...TEACHING_SHAPES,...(singleTeaching(kind)?MOUNTAIN_OPERATION_SHAPES:[])]){const option=new Option(name,value);refs.shape.add(option);}
    for(const [key,name] of TEACHING_ROLES){const button=document.createElement('button');button.dataset.role=key;button.textContent=name;listen(button,'click',()=>selectRole(key));refs.roles.appendChild(button);}
    listen(refs.tileset,'change',()=>loadTileset(Number(refs.tileset.value)));
    listen(refs.retry,'click',()=>loadTileset(Number(refs.tileset.value)));
    listen(refs.palette,'click',event=>{if(busy||!atlas||!profile)return;const rect=refs.palette.getBoundingClientRect();const x=Math.floor((event.clientX-rect.left)*refs.palette.width/rect.width/32),y=Math.floor((event.clientY-rect.top)*refs.palette.height/rect.height/32);assignTile(384+y*(atlas.width/32)+x);});
    listen(refs.preview,'click',event=>{if(!profile||busy)return;const rect=refs.preview.getBoundingClientRect(),generated=teachingLayout(profile,refs.shape.value,layout,engines);const x=Math.floor((event.clientX-rect.left)/rect.width*generated.width),y=Math.floor((event.clientY-rect.top)/rect.height*generated.height);const cell=generated.cells.find(c=>c.x===x&&c.y===y);if(cell){const view=refs.viewLayer.value,layer=view==='both'?null:view==='base'?0:view==='edge'?1:view==='top'?2:Number(view.slice(6));const pieces=physicalPieces(cell).filter(piece=>layer===null||piece.layer===layer);selectRole(pieces.at(-1)?.role||cell.role,{x,y});}});
    listen(refs.previewLayers,'input',()=>{if(!profile||!multiTeaching(kind))return;const count=Number(refs.previewLayers.value);if(!Number.isSafeInteger(count)||count<2||count>99){message('预览层数请填 2～99 的整数。',true);return;}profile.previewLayers=count;selectedCell=null;changed();message(`当前预览 ${count} 层；教学映射共用于所有层数。`);});
    listen(refs.assign,'click',()=>assignTile(Number(refs.tileId.value)));
    listen(refs.tileId,'keydown',event=>{if(event.key==='Enter')assignTile(Number(refs.tileId.value));});
    listen(refs.name,'input',()=>{if(profile){profile.name=refs.name.value;dirty=true;remember();refs.dirty.textContent='有未保存的教学修改';refs.profileSelect.selectedOptions[0].textContent=profile.name+(library.entries.some(e=>e.id===activeId)?'':'（未保存）');}});
    listen(refs.profileSelect,'change',async()=>{const next=refs.profileSelect.value,key=storageKey;if(next===activeId)return;
      if(dirty){const ok=await ctx.ui.showConfirmDialog({title:'切换教学式样',message:'当前式样有未保存的修改。放弃修改并切换？'});if(!ok||!alive||storageKey!==key){refs.profileSelect.value=activeId;return;}}
      const entry=library.entries.find(item=>item.id===next);if(!entry){refs.profileSelect.value=activeId;return;}
      activeId=entry.id;profile=cloneTeaching(entry.profile);dirty=false;role=kind==='round-forest'?'capTip':'ground';selectedCell=null;remember();sync();message(`已切换到“${profile.name}”。`);
    });
    listen(refs.targetLayer,'change',()=>{activeEntry().layer=Number(refs.targetLayer.value);changed();message(`“${TEACHING_ROLES.find(([key])=>key===role)[1]}”将画在图层 ${activeEntry().layer+1}。`);});
    listen(refs.editPart,'change',sync);
    listen(refs.shape,'change',()=>{selectedCell=null;paint();});listen(refs.viewLayer,'change',paint);listen(refs.guide,'change',paint);listen(refs.selection,'change',paint);
    listen(refs.auto,'click',()=>{activeEntry().base='auto';changed();});
    listen(refs.empty,'click',()=>{activeEntry().tile=0;changed();});
    listen(refs.clear,'click',()=>{if(materialRole(role)||refs.editPart.value==='tile')activeEntry().tile=null;else activeEntry().base='auto';changed();});
    listen(refs.next,'click',()=>{const start=TEACHING_ROLES.findIndex(([key])=>key===role);for(let i=1;i<=TEACHING_ROLES.length;i++){const key=TEACHING_ROLES[(start+i)%TEACHING_ROLES.length][0];if(profile.roles[key].tile===null){selectRole(key);return;}}message('全部位置已经填写，可切换预览形状检查。');});
    listen(refs.example,'click',()=>{if(!/^Outside(?:\.|$)/i.test(atlas.tilesetName))return;profile=makeProfile(atlas);profile.name=`Outside ${teachingTypeName(kind)}示例`;for(const [key,,tile] of TEACHING_ROLES)profile.roles[key].tile=tile;try{profile=checkProfile(profile,atlas);changed();message('已载入 Outside 示例；可点任意位置重新教学。');}catch(error){message(error.message,true);}});
    listen(refs.new,'click',async()=>{const key=storageKey;if(dirty){const ok=await ctx.ui.showConfirmDialog({title:'新增教学',message:'当前式样有未保存的修改。放弃修改并新增空白式样？已保存的式样会保留。'});if(!ok||!alive||storageKey!==key)return;}
      activeId=teachingId();profile=makeProfile(atlas);profile.name=`新教学 ${library.entries.length+1}`;role=kind==='round-forest'?'capTip':'ground';selectedCell=null;dirty=true;remember();sync();message('已新增独立的空白教学；填写名称和图块后点击“整体保存教学”。');});
    listen(refs.save,'click',async()=>{
      if(!profile||saveBusy)return;const snapshot=cloneTeaching(profile),key=storageKey,id=activeId;
      snapshot.name=snapshot.name.trim();if(!snapshot.name){message('请先填写教学式样名称。',true);return;}
      if(library.entries.some(entry=>entry.id!==id&&entry.profile.name.trim().toLocaleLowerCase()===snapshot.name.toLocaleLowerCase())){message('已有同名教学式样，请换一个名称。',true);return;}
      const next=cloneTeaching(library),existing=next.entries.findIndex(entry=>entry.id===id);
      if(existing>=0)next.entries[existing].profile=snapshot;else next.entries.push({id,profile:snapshot});
      next.selectedId=id;saveBusy=true;sync();
      try{await ctx.storage.set(key,next);onSaved(snapshot);if(alive&&storageKey===key){library=next;dirty=JSON.stringify(profile)!==JSON.stringify(snapshot);remember();message(teachingProgress(snapshot)===TEACHING_ROLES.length?'教学式样已保存。可在教学窗口和画笔下拉中选择。':'教学式样已保存；用到缺失映射的格子标红跳过。');}}
      catch(error){message(`保存失败：${error.message}`,true);}finally{saveBusy=false;if(alive&&profile)sync();}
    });
    listen(refs.jsonToggle,'click',()=>{refs.jsonArea.hidden=!refs.jsonArea.hidden;});
    listen(refs.export,'click',()=>{refs.json.value=JSON.stringify(profile,null,2);message('已生成 JSON，可复制备份，也可导出到 Mod 文件夹。');});
    listen(refs.exportFile,'click',async()=>{const snapshot=cloneTeaching(profile);try{await ctx.fs.mkdir('teaching-profiles');const file=`teaching-profiles/${kind}-${snapshot.atlas.tilesetId}-${activeId}.json`;await ctx.fs.writeModFile(file,JSON.stringify(snapshot,null,2));message(`已导出到 Mod 文件夹：${file}`);}catch(error){message(`导出失败：${error.message}；可使用“生成 JSON”复制备份。`,true);}});
    listen(refs.import,'click',()=>{try{const candidate=checkProfile(JSON.parse(refs.json.value),atlas);activeId=teachingId();profile=candidate;changed();message('已作为新式样导入，请检查预览后保存教学。');}catch(error){message(`导入失败：${error.message}`,true);}});
    const dispose=()=>{if(!alive){replacement?.();return;}remember();alive=false;++token;listeners.forEach(fn=>fn());reference.onload=null;root.remove();disposers.delete(dispose);};
    disposers.add(dispose);
    for(const [value,title] of TEACHING_TYPES)refs.kind.add(new Option(title,value));refs.kind.value=kind;
    refs.viewLayer.add(new Option('仅图层 3','top'));
    listen(refs.kind,'change',()=>{const next=refs.kind.value;dispose();replacement=renderTeaching(host,next);});
    try{
      const sets=ctx.tileset.list();for(const set of sets)refs.tileset.add(new Option(`${set.name||set.tilesetName} (${set.id})`,String(set.id)));
      const active=ctx.map.info(ctx.editor.activeMapId())?.tilesetId||ctx.tileset.currentId?.()||sets[0]?.id;
      if(!sets.length)throw Error('请先打开项目，再进入图块教学。');
      refs.tileset.value=String(sets.some(s=>s.id===active)?active:sets[0].id);loadTileset(Number(refs.tileset.value));
    }catch(error){busy=true;busyUI();message(error.message,true);}
    return dispose;
  }
  return {open(){beforeOpen();register();ctx.ui.openPanel(id);},dispose(){for(const fn of [...disposers])fn();drafts.clear();}};
}

// Single-level, profile-driven drawing. No tileset IDs are emitted by the
// topology engine: every output tile is resolved through the saved profile.
function createTaughtMountain(profile, topology, snapshot) {
  const {width,height,read}=snapshot,ground=profile.roles.ground.tile,rock=profile.roles.rock.tile;
  const key=(x,y)=>`${x},${y}`;
  const grounds=teachingGrounds(profile,snapshot);
  function resolve(tile){
    const role=roleById.get(tile.id),entry=profile.roles[role];
    if(!entry)throw Error('教学样式缺少当前边角');
    const baseRole=materialRole(role)?role:entry.base==='auto'?(tile.rock?'rock':'ground'):entry.base;
    const missing=[];if(typeof baseRole!=='number'&&profile.roles[baseRole].tile===null)missing.push(baseRole);if(!materialRole(role)&&entry.tile===null)missing.push(role);
    return {base:typeof baseRole==='number'?baseRole:profile.roles[baseRole].tile,edge:materialRole(role)?0:entry.tile,baseRole,missing};
  }
  const possible=new Set();
  if(rock!==ground)possible.add(`${rock},0`);
  for(const [role] of TEACHING_ROLES){
    if(materialRole(role))continue;
    const entry=profile.roles[role];
    const bases=entry.base==='auto'?[...grounds,rock]:entry.base==='ground'?[...grounds]:entry.base==='rock'?[rock]:[entry.base];
    for(const base of bases)if(!(grounds.has(base)&&entry.tile===0))possible.add(`${base},${entry.tile}`);
  }
  const candidates=new Set();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(possible.has(`${read(0,x,y)},${read(1,x,y)}`))candidates.add(key(x,y));
  const unseen=new Set(candidates),accepted=new Set();
  while(unseen.size){
    const first=unseen.values().next().value,component=new Set(),queue=[first];unseen.delete(first);
    for(let i=0;i<queue.length;i++){
      const k=queue[i],[x,y]=k.split(',').map(Number);component.add(k);
      for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const n=key(x+dx,y+dy);if(unseen.delete(n))queue.push(n);}
    }
    const rendered=topology(component,width,height);
    if(rendered.errors.size)continue;
    const exact=[...rendered.tiles].every(([,tile])=>{
      const target=resolve(tile),base=read(0,tile.x,tile.y);
      return (base===target.base||(target.baseRole==='ground'&&grounds.has(base)))&&read(1,tile.x,tile.y)===target.edge;
    });
    if(exact)for(const k of component)accepted.add(k);
  }
  return {accepted,plan(brush){
    const footprint=new Set([...accepted,...brush]),result=topology(footprint,width,height);
    const conflicts=new Map(result.errors),changes=[],renderCells=new Map();
    for(const [k,tile] of result.tiles){
      const {x,y}=tile;if(x<0||y<0||x>=width||y>=height)continue;
      const target=resolve(tile),before=[read(0,x,y),read(1,x,y)];
      if(target.missing.length){conflicts.set(k,{x,y,message:missingTeachingMessage(profile,target.missing)});continue;}
      // Preserve equivalent grass variants already under a border.
      const base=target.baseRole==='ground'&&grounds.has(before[0])?before[0]:target.base,edge=target.edge;
      if(before[0]===base&&before[1]===edge)continue;
      if(!accepted.has(k)&&((before[0]!==0&&!grounds.has(before[0]))||before[1]!==0)){
        conflicts.set(k,{x,y,message:'该格不是当前样式的背景或山体，跳过'});continue;
      }
      if(read(2,x,y)!==0||snapshot.blocked?.has(k)||snapshot.events?.has(k)){
        conflicts.set(k,{x,y,message:'该格有物件或事件，跳过'});continue;
      }
      renderCells.set(k,{x,y,base,edge});
      for(let layer=0;layer<2;layer++){const value=layer===0?base:edge;if(before[layer]!==value)changes.push({layer,x,y,old:before[layer],value});}
    }
    return {changes,renderCells,conflicts,footprint,level:1,feature:`单层山体 · ${profile.name||'教学样式'}`};
  }};
}


// Translate only known semantic tiles to the existing, tested geometry engines.
// Foreign artwork remains an obstacle, even when its numeric ID happens to be
// an Outside reference ID. All changes return to the original snapshot IDs.
function multiPlatformProfile(source){
 const profile=cloneTeaching(source);profile.kind=source.kind==='grass-multi-mountain'?'grass-single-mountain':'single-mountain';
 // Continuous cliff teaching explicitly uses the top cap for both upper
 // concave corners. Retain that taught convention for the terrace outline.
 profile.roles.inNW=cloneTeaching(source.roles.n);profile.roles.inNE=cloneTeaching(source.roles.n);
 return profile;
}
function createTaughtTerrain(profile,snapshot,engines,terrain,count=2,foundations=[]) {
 if(multiTeaching(profile.kind)&&!['multi','grassMulti'].includes(terrain))profile=multiPlatformProfile(profile);
 // Grass mountain roles have their own visible artwork, but use the same
 // distinct semantic IDs internally (several defaults share a grass cap).
 const roles=singleTeaching(profile.kind)?TEACHING_ROLES:teachingRoles(profile.kind);
 const grassSingle=profile.kind==='grass-single-mountain';
 const operation=({grassMountain:'mountain',grassUpper:'upper',grassExpand:'expand',grassDig:'dig',grassErase:'erase',grassEraseUpper:'eraseUpper'})[terrain]||terrain;
 const {width,height,read}=snapshot,ground=profile.roles.ground.tile;
 const grounds=teachingGrounds(profile,snapshot);
 const surfaces=new Set([profile.roles.rock?.tile]);
 const forward=[new Map(),new Map(),new Map()],reverse=[new Map(),new Map(),new Map()];
 for(const [role,,canonical] of roles){const z=teachingLayer(profile.kind,role),tile=profile.roles[role].tile;forward[z].set(canonical,tile);if(tile!==null&&tile!==0&&!reverse[z].has(tile))reverse[z].set(tile,canonical);}
 if(singleTeaching(profile.kind))for(const source of foundations){
  for(const id of teachingGrounds(source,snapshot))grounds.add(id);surfaces.add(source.roles.rock.tile);
  for(const [role,,canonical]of TEACHING_ROLES){const e=source.roles[role];if(e?.tile>0){const z=materialRole(role)?0:1;if(!reverse[z].has(e.tile))reverse[z].set(e.tile,canonical);}}
 }
 const arrays=new Map();
 for(const [z,data] of snapshot.arrays){
  if(z>2){arrays.set(z,data);continue;}
  arrays.set(z,Int32Array.from(data,id=>id===0?0:z===0&&profile.kind==='grass-multi-mountain'&&id===profile.roles.rock.tile?388:z===0&&grounds.has(id)?(singleTeaching(profile.kind)&&id>=385&&id<=389?id:385):reverse[z].get(id)??(-id-1)));
 }
 const proxy={...snapshot,arrays,read:(z,x,y)=>x>=0&&y>=0&&x<width&&y<height?arrays.get(z)?.[y*width+x]||0:0},unresolvedSource=new Map();
 if(singleTeaching(profile.kind)){
  if(grassSingle){
   // Infer raised grass from its surrounding walls, even when the user gives
   // background and raised grass the same tile. Outside grass stays ground.
   const left=new Set([1168,1176,1184]),right=new Set([1170,1178,1186]);
   for(let y=0;y<height;y++){
    let balance=0;for(let x=0;x<width;x++){const e=proxy.read(1,x,y);if(left.has(e))balance++;if(right.has(e))balance--;}
    let depth=Math.max(0,-balance);
    for(let x=0;x<width;x++){
     const edge=proxy.read(1,x,y),north=proxy.read(1,x,y-1);if(left.has(edge))depth++;
     const inner=(edge===1169&&(left.has(north)||right.has(north)))||(edge===1178&&north===1192)||(edge===1176&&north===1193);
     if(surfaces.has(read(0,x,y))){
      const raised=depth>0&&(!engines.Mountain.OUTER.has(edge)||depth>1||inner);
      const actual=read(0,x,y);arrays.get(0)[y*width+x]=raised?1177:grounds.has(actual)&&actual>=385&&actual<=389?actual:385;
     }
     if(right.has(edge))depth--;
    }
   }
   proxy.allowGrassCap=true;
  }
  const partial=roles.some(([role])=>profile.roles[role].tile===null);
  if(partial){
   // Missing top/bottom pieces do not erase height information supplied by
   // the two known side walls. This is recognition only, never a map fill.
   const candidates=new Set(),left=new Set([1168,1176,1184]),right=new Set([1170,1178,1186]);
   for(let y=0;y<height;y++){
    const row=[];let depth=0;
    for(let x=0;x<width;x++){
     const edge=proxy.read(1,x,y);if(left.has(edge))depth++;
     if(depth>0)row.push(`${x},${y}`);
     if(right.has(edge))depth--;
    }
    if(depth===0)for(const k of row)candidates.add(k);
   }
   proxy.mountainCandidates=candidates;
  }
  // A literal custom underlay may differ from both the taught background and
  // rock. Admit that candidate only when it matches its saved edge role; the
  // topology recognizer then checks the complete cell against the saved data.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const edge=proxy.read(1,x,y),role=roleById.get(edge),entry=profile.roles[role];
   if(entry&&typeof entry.base==='number'&&read(0,x,y)===entry.base)arrays.get(0)[y*width+x]=engines.Mountain.OUTER.has(edge)?385:1177;
  }
  proxy.matchesMountainTile=(x,y,t)=>{
   const role=roleById.get(t.id),entry=profile.roles[role];if(!entry)return false;
   const baseRole=materialRole(role)?role:entry.base==='auto'?(t.rock?'rock':'ground'):entry.base;
   const base=typeof baseRole==='number'?baseRole:profile.roles[baseRole].tile;
   if(entry.tile===null&&!materialRole(role)&&read(1,x,y)!==0)unresolvedSource.set(`${x},${y}`,role);
   return (read(0,x,y)===base||(baseRole==='ground'&&grounds.has(read(0,x,y))))&&(entry.tile===null&&!materialRole(role)||read(1,x,y)===(materialRole(role)?0:entry.tile));
  };
  proxy.recognized=engines.Mountain.readRecognized(proxy);
 }
 else if(multiTeaching(profile.kind)){
  const isGrass=profile.kind==='grass-multi-mountain',byId=new Map(roles.map(([role,,id])=>[id,role]));
  proxy.matchesMultiTile=(x,y,t)=>{
   const role=t.edge?byId.get(t.edge):'rock',entry=profile.roles[role];if(!entry)return false;
   const baseRole=materialRole(role)?role:entry.base==='auto'?(isGrass||t.solid?'rock':'ground'):entry.base;
   const base=typeof baseRole==='number'?baseRole:profile.roles[baseRole].tile;
   // Expansion preserves the original underlay of an unchanged wall. A later
   // reconstruction can classify that same wall as sitting over rock instead
   // of background (or vice versa). Both taught materials are valid for auto
   // wall underlays; explicit user overrides and the wall shape stay exact.
   const priorAutoBase=!isGrass&&t.edge&&entry.base==='auto'&&(grounds.has(read(0,x,y))||read(0,x,y)===profile.roles.rock.tile);
   return (priorAutoBase||read(0,x,y)===base||(baseRole==='ground'&&grounds.has(read(0,x,y))))&&read(1,x,y)===(t.edge?entry.tile:0);
  };
  proxy.multiRecognized=engines.MultiMountain.recognize(proxy,count,isGrass);
 }
 else if(profile.kind==='pine-forest')proxy.forestRecognized=engines.Forest.recognize(proxy);
 else if(profile.kind==='round-forest')proxy.roundRecognized=engines.RoundForest.recognize(proxy);
 const literal=(id,z,x,y)=>{
  if(id===proxy.read(z,x,y))return read(z,x,y);
  if(id===0)return 0;
  if(z===0&&id>=385&&id<=389&&(id===385||!forward[0].has(id)))return singleTeaching(profile.kind)&&grounds.has(id)?id:grounds.has(read(0,x,y))?read(0,x,y):ground;
  if(id<0)return -id-1;
  const value=forward[z]?.get(id);if(value===undefined)throw Error(`教学缺少图层 ${z+1} 的图块角色 ${id}`);return value;
 };
 return {levels:proxy.recognized?.levels,plan(brush,origin){
  let raw;
  if(multiTeaching(profile.kind))raw=engines.MultiMountain.plan(proxy,brush,385,count,profile.kind==='grass-multi-mountain');
  else if(profile.kind==='road')raw=engines.Surface.planSand(proxy,brush,385,terrain==='eraseSand','yellow');
  else if(profile.kind==='pine-forest')raw=engines.Forest.plan(proxy,brush,origin,385,terrain==='eraseForestPine');
  else if(profile.kind==='round-forest')raw=engines.RoundForest.plan(proxy,brush,origin,385,terrain==='eraseForestRound');
  else if(operation==='expand')raw=engines.Features.planExpand(proxy,brush,385,origin);
  else if(operation==='dig')raw=engines.Features.planDig(proxy,brush,385,origin);
  else raw=engines.Mountain.plan(proxy,brush,operation.startsWith('erase')?'erase':'add',385,operation==='upper'?'raise':operation==='eraseUpper'?'lower':1,origin);
  const changes=[],renderCells=new Map();
  // Build each affected cell from the complete canonical plan, translating all
  // layers together so forest previews and native undo share one final result.
  const touched=new Map();
  for(const c of raw.changes){const k=`${c.x},${c.y}`;if(!touched.has(k))touched.set(k,{x:c.x,y:c.y,ids:[0,1,2].map(z=>proxy.read(z,c.x,c.y))});touched.get(k).ids[c.layer]=c.value;}
  for(const [k,c] of touched){
   const values=c.ids.map((id,z)=>literal(id,z,c.x,c.y));
   if(mountainTeaching(profile.kind)&&c.ids[1]!==0){
    const role=roles.find(([, ,id])=>id===c.ids[1])?.[0],entry=profile.roles[role];
    if(entry){const base=entry.base==='auto'?(profile.kind==='grass-multi-mountain'||c.ids[0]===1177?'rock':'ground'):entry.base;values[0]=typeof base==='number'?base:base==='ground'&&entry.base==='auto'&&grounds.has(values[0])?values[0]:base==='ground'&&grounds.has(read(0,c.x,c.y))?read(0,c.x,c.y):profile.roles[base].tile;values[1]=entry.tile;}
   }
   const missing=[];
   if(unresolvedSource.has(k)&&values.some((value,z)=>value!==read(z,c.x,c.y)))missing.push(unresolvedSource.get(k));
   for(let z=0;z<3;z++)if(values[z]===null||values[z]===undefined){
    let role=roles.find(([key,,id])=>id===c.ids[z]&&teachingLayer(profile.kind,key)===z)?.[0];
    if(z===0&&mountainTeaching(profile.kind)&&c.ids[1]!==0){const edgeRole=roles.find(([, ,id])=>id===c.ids[1])?.[0],base=profile.roles[edgeRole]?.base;if(typeof base==='string'&&base!=='auto')role=base;}
    missing.push(role||'ground');
   }
   if(missing.length){raw.conflicts.set(k,{x:c.x,y:c.y,message:missingTeachingMessage(profile,missing)});continue;}
   renderCells.set(k,{x:c.x,y:c.y,base:values[0],edge:values[1],top:values[2]});
   for(let z=0;z<3;z++)if(values[z]!==read(z,c.x,c.y))changes.push({layer:z,x:c.x,y:c.y,old:read(z,c.x,c.y),value:values[z]});
  }
  return {...raw,changes,renderCells,canonicalCells:new Map([...touched].map(([key,cell])=>[key,cell.ids])),feature:`${multiTeaching(profile.kind)?`${count} 层 `:''}${terrainNames[terrain]} · ${profile.name}`};
 }};
}

// Geometry stays in the three canonical layers. This adapter places each
// taught role onto its saved physical map layer after topology is resolved.
function createLayeredTaughtTerrain(profile,snapshot,engines,terrain,count=2,foundations=[]) {
 const {width,height}=snapshot,area=width*height,roles=singleTeaching(profile.kind)?TEACHING_ROLES:teachingRoles(profile.kind);
 const arrays=new Map([...snapshot.arrays].map(([z,data])=>[z,Int32Array.from(data)]));
 for(let z=0;z<3;z++)if(!arrays.has(z))arrays.set(z,new Int32Array(area));
 const matches=new Map(),foreignUpper=new Set(),key=(x,y)=>`${x},${y}`;
 const roleFor=(z,id)=>z===0&&id>=385&&id<=389?'ground':roles.find(([name,,canonical])=>teachingLayer(profile.kind,name)===z&&canonical===id)?.[0];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=y*width+x,k=key(x,y),found=[];
  for(const [name] of roles){const entry=profile.roles[name];if(entry?.tile>0&&snapshot.read(entry.layer,x,y)===entry.tile)found.push(name);}
  matches.set(k,found);
  for(const [z,data] of snapshot.arrays)if(z>=2&&data[offset]!==0&&!found.some(name=>placedLayer(profile,name)===z))foreignUpper.add(k);
  for(const name of found){
   const layer=placedLayer(profile,name),canonical=teachingLayer(profile.kind,name);
   if(layer===canonical)continue;
   arrays.get(layer)[offset]=layer===0?(profile.roles.ground.tile||snapshot.fallbackGround||385):0;
  }
  for(const name of found){
   const canonical=teachingLayer(profile.kind,name),entry=profile.roles[name];
   if(name==='ground'&&found.some(other=>other!=='ground'&&teachingLayer(profile.kind,other)===0))continue;
   arrays.get(canonical)[offset]=entry.tile;
  }
 }
 const virtual={...snapshot,arrays,blocked:foreignUpper,
  read:(z,x,y)=>x>=0&&y>=0&&x<width&&y<height?arrays.get(z)?.[y*width+x]||0:0};
 const model=createTaughtTerrain(profile,virtual,engines,terrain,count,foundations);
 return {levels:model.levels,plan(brush,origin){
  const raw=model.plan(brush,origin),changes=[],renderCells=new Map(),conflicts=new Map(raw.conflicts);
  for(const [k,ids] of raw.canonicalCells||[]){
   if(conflicts.has(k))continue;
   const [x,y]=k.split(',').map(Number),base=raw.renderCells.get(k);
   if(!base)continue;
   const original=new Map([...snapshot.arrays].map(([z])=>[z,snapshot.read(z,x,y)]));
   const desired=new Map(original);
   for(const name of matches.get(k)||[])if(name!=='ground')desired.set(placedLayer(profile,name),0);
   const placed=new Map(),values=[base.base,base.edge,base.top];
   let problem='';
   for(let z=0;z<3;z++){
    const id=ids[z],name=roleFor(z,id);if(!name||id===0||id<0)continue;
    const value=values[z],target=placedLayer(profile,name);
    if(value===null||value===undefined){problem=`教学缺少“${name}”映射`;break;}
    if(!snapshot.arrays.has(target)){problem=`图层 ${target+1} 在当前地图不存在`;break;}
    const prior=placed.get(target);
    if(prior&&prior.name!=='ground'&&name!=='ground'&&prior.value!==value){problem=`图层 ${target+1} 同一格需要两个不同图块`;break;}
    if(!prior||prior.name==='ground'||name!=='ground')placed.set(target,{name,value});
   }
   if(!problem)for(const [target,{name,value}] of placed){
    const current=desired.get(target);
    if(current!==0&&current!==value&&current!==original.get(target)&&name!=='ground'){problem=`图层 ${target+1} 已有其他图块`;break;}
    const source=original.get(target),owned=(matches.get(k)||[]).some(role=>placedLayer(profile,role)===target);
    if(source!==0&&source!==value&&!owned&&!(target===0&&source>=385&&source<=389)&&name!=='ground'){
     problem=`图层 ${target+1} 已有其他图块`;break;
    }
    desired.set(target,value);
   }
   if(problem){conflicts.set(k,{x,y,message:`${problem}，跳过此格`});continue;}
   for(const [z,value] of desired)if(value!==original.get(z))changes.push({layer:z,x,y,old:original.get(z),value});
   renderCells.set(k,{x,y,layers:desired});
  }
  return {...raw,changes,renderCells,conflicts};
 }};
}

let taughtChoice='default',taughtProfile=null,taughtContext='',taughtLoading=false,taughtError='',taughtEpoch=0;
let taughtProfiles={},taughtErrors={},taughtChoices={};
const platformTeachingTerrain=()=>['upper','expand','eraseUpper','grassUpper','grassExpand','grassEraseUpper'].includes(terrain);
const companionMultiKind=kind=>kind==='grass-single-mountain'?'grass-multi-mountain':kind==='single-mountain'?'multi-mountain':null;
function currentTeachingKind(){
 if(terrain==='multi')return 'multi-mountain';
 if(terrain==='grassMulti')return 'grass-multi-mountain';
 if(['mountain','upper','expand','dig','erase','eraseUpper'].includes(terrain))return 'single-mountain';
 if(['grassMountain','grassUpper','grassExpand','grassDig','grassErase','grassEraseUpper'].includes(terrain))return 'grass-single-mountain';
 if(['sand','eraseSand'].includes(terrain))return 'road';
 if(['forestPine','eraseForestPine'].includes(terrain))return 'pine-forest';
 if(['forestRound','eraseForestRound'].includes(terrain))return 'round-forest';
 return null;
}
function taughtContextKey(){
 if(!ctxRef)return '';
 const map=ctxRef.map.info(ctxRef.editor.activeMapId());
 return map?`${ctxRef.editor.gameRoot?.()||''}|${map.id??ctxRef.editor.activeMapId()}|${map.tilesetId}`:'';
}
async function loadNativeTeachingImage(id){
 const info=ctxRef.tileset.info(id),gameRoot=ctxRef.editor.gameRoot();
 if(!info||!gameRoot)throw Error('请先打开游戏项目');
 const invoke=window.__TAURI__?.core?.invoke;
 if(invoke){const bytes=await invoke('get_tileset_image',{gameRoot,tilesetName:info.tilesetName});if(!bytes?.length)throw Error('图块图片为空，请检查素材文件');return new Blob([new Uint8Array(bytes)],{type:'image/png'});}
 await hostReady;if(!hostBridge||typeof hostBridge.renderer.h!=='function')throw Error('Maker Studio 1.7.1 图块兼容接口尚未就绪');
 return hostBridge.renderer.h(gameRoot,info.tilesetName);
}
function syncTaughtStyles(){
  const kind=currentTeachingKind();
  const companion=companionMultiKind(kind),canMulti=Boolean(platformTeachingTerrain()&&companion);
  const primary=taughtProfiles[kind]||[],multi=canMulti?taughtProfiles[companion]||[]:[];
  const inherited=taughtChoices[companion]?.startsWith('saved:')?`multi-${taughtChoices[companion]}`:null;
  taughtChoice=taughtChoices[kind]||(canMulti&&inherited?inherited:'default');
  if(taughtChoice==='saved')taughtChoice=primary.length?`saved:${primary[0].id}`:'default';
  if(taughtChoice==='multi-saved')taughtChoice=canMulti&&multi.length?`multi-saved:${multi[0].id}`:'default';
  let selected=taughtChoice.startsWith('multi-saved:')&&canMulti?multi.find(item=>item.id===taughtChoice.slice(12)):
    taughtChoice.startsWith('saved:')?primary.find(item=>item.id===taughtChoice.slice(6)):null;
  if(taughtChoice!=='default'&&!selected&&!taughtLoading){taughtChoice='default';taughtChoices[kind]='default';}
  taughtProfile=selected?.profile||null;taughtError=taughtErrors[taughtChoice.startsWith('multi-saved:')?companion:kind]||'';
  if(!panelRefs?.taughtStyle)return;
  const select=panelRefs.taughtStyle,options=[new Option(kind==='grass-single-mountain'?'默认草地山体':kind==='grass-multi-mountain'?'默认草地多层山体':kind==='multi-mountain'?'默认多层山体':kind==='single-mountain'?'默认岩山（原样式）':kind==='road'?'默认道路（下方选择颜色）':kind==='round-forest'?'默认圆冠林':'默认高松林','default')];
  const count=taughtProfile?teachingRoles(taughtProfile.kind).length:kind?teachingRoles(kind).length:0;
  const label=p=>{const count=teachingRoles(p.kind).length;return (p.name||'已保存教学')+(teachingProgress(p)===count?'':`（已填 ${teachingProgress(p)}/${count}）`);};
  for(const entry of primary)options.push(new Option(label(entry.profile),`saved:${entry.id}`));
  for(const entry of multi)options.push(new Option(label(entry.profile)+' · 沿用多层样式',`multi-saved:${entry.id}`));
  if(taughtLoading&&taughtChoice!=='default'&&!selected){const option=new Option('正在读取教学式样…',taughtChoice);option.disabled=true;options.push(option);}
 select.replaceChildren(...options);select.value=taughtChoice;select.disabled=taughtLoading;
 panelRefs.taughtRefresh.disabled=taughtLoading;
  panelRefs.taughtHint.textContent=taughtLoading?'正在读取已保存的教学…':taughtError?`读取失败：${taughtError}`:taughtProfile?teachingProgress(taughtProfile)===count?(taughtChoice.startsWith('multi-saved:')?'沿用多层教学的台面和岩壁，用于顶部叠加、扩展及擦除高台。':singleTeaching(kind)?'本套教学共用于单层、叠加、扩展、下挖及擦除；按落笔位置判断当前高度。':'整套教学已载入，选择后启用画笔。'):'未填完也可启用：用到缺失映射的格子标红跳过，其余正常绘制。':'尚无已保存教学；请先在图块教学窗口填写并整体保存。';
 panelRefs.taughtRow.style.display=kind?'block':'none';
 if(kind){
  const needGroundSample=taughtChoice!=='default'&&taughtProfile?.roles.ground.tile===null;
  panelRefs['tile-row'].style.display=needGroundSample?'grid':taughtChoice!=='default'||kind==='pine-forest'||kind==='round-forest'?'none':'grid';
  panelRefs.sample.style.display=needGroundSample?'block':taughtChoice!=='default'||kind==='pine-forest'||kind==='round-forest'?'none':'block';
 }
 panelRefs['style-row'].style.display=kind==='road'&&taughtChoice==='default'?'grid':'none';
}
async function refreshTaughtStyles(force=false){
 const context=taughtContextKey();if(!force&&context===taughtContext)return;
 taughtContext=context;const epoch=++taughtEpoch,ctx=ctxRef;
 taughtProfiles={};taughtErrors={};
 if(taughtChoice!=='default'){cancelStroke();mode='idle';hover=null;status();redraw();}
 if(!context||!ctx.storage?.get||!ctx.tileset?.getImageBlobUrl||!ctx.editor.gameRoot?.()){taughtLoading=false;syncTaughtStyles();return;}
 taughtLoading=true;syncTaughtStyles();
 try{
  const map=ctx.map.info(ctx.editor.activeMapId()),info=ctx.tileset.info(map.tilesetId);
  const {image,hash,legacyHash}=await loadTeachingImage(ctx,map.tilesetId,loadNativeTeachingImage);
  const atlas={tilesetId:map.tilesetId,tilesetName:info.tilesetName,width:image.naturalWidth,height:image.naturalHeight,fingerprint:hash};
   const loaded={},errors={};
   await Promise.all(TEACHING_TYPES.map(async([kind])=>{try{
    const result=await readTeachingLibrary(ctx,kind,ctx.editor.gameRoot(),atlas,legacyHash);
    loaded[kind]=result.library.entries;
   }catch(error){errors[kind]=error.message;}}));
  if(epoch===taughtEpoch&&ctx===ctxRef){taughtProfiles=loaded;taughtErrors=errors;}
 }catch(error){if(epoch===taughtEpoch&&ctx===ctxRef)for(const[kind]of TEACHING_TYPES)taughtErrors[kind]=error.message;}
 finally{if(epoch===taughtEpoch&&ctx===ctxRef){taughtLoading=false;syncTaughtStyles();}}
}
function selectTaughtStyle(value){
  cancelStroke();taughtChoice=value.startsWith('multi-saved:')&&platformTeachingTerrain()?value:value.startsWith('saved:')?value:'default';taughtChoices[currentTeachingKind()]=taughtChoice;mode='idle';hover=null;
 syncTaughtStyles();status(taughtChoice!=='default'?`已选择 ${taughtProfile?.name||'教学样式'}；启用画笔后绘制。`:'已选择默认样式。');redraw();
}
function disposeTaughtStyles(){++taughtEpoch;taughtChoice='default';taughtProfile=null;taughtProfiles={};taughtErrors={};taughtChoices={};taughtContext='';taughtLoading=false;taughtError='';}

let tileTeaching=null;
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
    if(snapshot.mountainCandidates?.has(k)||(a===1177&&(b===0||EDGES.has(b)))||(grass(a)&&OUTER.has(b)))candidates.add(k);
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
      if(snapshot.matchesMountainTile)return snapshot.matchesMountainTile(x,y,t);
      return (t.rock?read(0,x,y)===1177:grass(read(0,x,y)))&&
        (visible===t.edge||(t.rock&&t.edge===1201&&visible===1169)||(snapshot.allowGrassCap&&t.edge===1200&&visible===1169));
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
    // Continuous cliff bases do not fit combine()'s nested terrace template.
    // Their flat tops still carry height through the surrounding side walls.
    if(height<minimum&&anchor)return Features.planPlatform(snapshot,brush,ground,anchor,level==='lower');
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

function surfaceLevels(snapshot){
  const {width,height,read}=snapshot,ids=new Int32Array(width*height).fill(-1),raw=new Int32Array(width*height),regions=[];
  const inside=(x,y)=>x>=0&&y>=0&&x<width&&y<height;
  for(let y=0;y<height;y++){
    let h=Mountain.borderStartDepth(snapshot,y);
    for(let x=0;x<width;x++){
      const e=read(1,x,y);if([1168,1176,1184].includes(e))h++;
      raw[y*width+x]=Math.max(0,h);if([1170,1178,1186].includes(e))h--;
    }
  }
  const flat=(x,y)=>inside(x,y)&&read(1,x,y)===0&&(read(0,x,y)===1177||FGRASS(read(0,x,y)));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;if(ids[i]!==-1||!flat(x,y))continue;
    const id=regions.length,queue=[i];ids[i]=id;let level=0;
    for(let j=0;j<queue.length;j++){
      const p=queue[j],cx=p%width,cy=Math.floor(p/width);level=Math.max(level,raw[p]);
      for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=cx+dx,ny=cy+dy,ni=ny*width+nx;if(flat(nx,ny)&&ids[ni]===-1){ids[ni]=id;queue.push(ni);}}
    }
    regions.push({level,raw:level});
  }
  const pairs=[],region=(x,y)=>inside(x,y)?ids[y*width+x]:-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const e=read(1,x,y);let a,b;
    if(e===1176){a=region(x-1,y);b=region(x+1,y);}
    else if(e===1178){a=region(x+1,y);b=region(x-1,y);}
    else if([1169,1200,1201,1233].includes(e)){a=region(x,y-1);b=region(x,y+1);}
    else if(e===1185){a=region(x,y+1);b=region(x,y-1);}
    if(a>=0&&b>=0&&a!==b)pairs.push([a,b]);
  }
  // The full flat region supplies the height of a continuous cliff top. A
  // terrace near its back edge may hide some side walls; adjacent floor
  // relations recover its additional level without requiring a stored height.
  for(let pass=0;pass<regions.length;pass++){
    let changed=false;for(const [lo,hi]of pairs){const l=regions[lo],h=regions[hi],nextH=Math.max(h.level,l.level+1),nextL=Math.max(l.level,nextH-1);if(nextH!==h.level||nextL!==l.level)changed=true;h.level=nextH;l.level=nextL;}
    if(!changed)break;
    if(pass===regions.length-1)for(const r of regions)r.level=r.raw;
  }
  return (x,y)=>{
    if(!inside(x,y))return 0;const id=region(x,y);if(id>=0)return regions[id].level;
    let best=raw[y*width+x];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const r=region(x+dx,y+dy);if(r>=0)best=Math.max(best,regions[r].level);}return best;
  };
}
function planPlatform(snapshot,brush,ground,origin,erase=false){
  const {width,height,read}=snapshot,p=emptyPlan(snapshot,brush,erase?'擦除高台':'叠加高台');
  const {x:ax,y:ay}=origin,inside=(x,y)=>x>=0&&y>=0&&x<width&&y<height;
  const at=surfaceLevels(snapshot),current=inside(ax,ay)?at(ax,ay):0;
  p.level=erase?current:current+1;
  if(current<(erase?2:1)||read(0,ax,ay)!==1177||read(1,ax,ay)!==0){
    conflict(p.conflicts,ax,ay,'请在岩壁围成的平坦台面内起笔');return p;
  }
  const existing=new Set();
  if(erase){
    const queue=[FKEY(ax,ay)];existing.add(queue[0]);
    for(let i=0;i<queue.length;i++){
      const [x,y]=FXY(queue[i]);for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
        const nx=x+dx,ny=y+dy,k=FKEY(nx,ny);
        if(inside(nx,ny)&&!existing.has(k)&&read(0,nx,ny)===1177&&at(nx,ny)>=current&&(read(1,nx,ny)===0||Mountain.EDGES.has(read(1,nx,ny)))){existing.add(k);queue.push(k);}
      }
    }
    const hasParent=[...existing].some(k=>{const [x,y]=FXY(k);return [[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>inside(x+dx,y+dy)&&!existing.has(FKEY(x+dx,y+dy))&&read(0,x+dx,y+dy)===1177&&read(1,x+dx,y+dy)===0&&at(x+dx,y+dy)===current-1);});
    if(!hasParent){conflict(p.conflicts,ax,ay,'此处是多层山体底座，未找到可单独擦除的上层高台');return p;}
  }
  const next=erase?new Set([...existing].filter(k=>!brush.has(k))):new Set(brush);
  const rendered=Mountain.raster(next,width,height);
  for(const [k,c]of rendered.errors)p.conflicts.set(k,c);
  for(const k of erase?existing:brush){
    const [x,y]=FXY(k);if(!inside(x,y)){conflict(p.conflicts,x,y,'高台超出地图');continue;}
    const edge=read(1,x,y),base=read(0,x,y);
    if(occupied(snapshot,x,y)){conflict(p.conflicts,x,y,'物件或事件占用，跳过这格');continue;}
    if(base!==1177||(erase?at(x,y)!==current:(edge!==0||at(x,y)!==current))){
      conflict(p.conflicts,x,y,erase?'不能擦除更高一级台面或底层岩壁':'高台要画在同一级平坦台面内，跳过边缘格');continue;
    }
    const tile=rendered.tiles.get(k),target=tile&&tile.id!==1177?tile.id:0;
    if(edge===target)continue;
    p.renderCells.set(k,{x,y,base:1177,edge:target});p.changes.push({layer:1,x,y,old:edge,value:target});
  }
  return p;
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
  // Shore tiles belong to the pond footprint. Only adopt banks connected to
  // existing water, so nearby standalone cliff/shore artwork stays untouched.
  const connected=[...old];
  for(let i=0;i<connected.length;i++){
    const [x,y]=FXY(connected[i]);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx,ny=y+dy,k=FKEY(nx,ny);
      if(nx<0||ny<0||nx>=width||ny>=height||old.has(k))continue;
      if(WATER_BANK.has(read(0,nx,ny))&&read(1,nx,ny)===0){old.add(k);connected.push(k);}
    }
  }
  const next=new Set(old);
  for(const k of brush){const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height)continue;if(erase)next.delete(k);else next.add(k);}
  const has=(x,y)=>next.has(FKEY(x,y));
  // Reserve the bottom row INSIDE the footprint for its shoreline. Rendering
  // never creates a new tile outside the old footprint plus this stroke.
  const wet=(x,y)=>has(x,y)&&has(x,y+1);
  const oldHas=(x,y)=>old.has(FKEY(x,y));
  const adjacent=new Set();
  for(const k of brush){const [x,y]=FXY(k);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)adjacent.add(FKEY(x+dx,y+dy));}
  const proposed=new Map();
  for(const k of adjacent){
    const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height)continue;
    if(has(x,y))proposed.set(k,wet(x,y)?waterTile(wet,x,y):(wet(x+1,y)?1234:1233));
  }
  for(const k of adjacent){
    const [x,y]=FXY(k);if(x<0||y<0||x>=width||y>=height)continue;
    const before=read(0,x,y),oldWater=oldHas(x,y),oldBank=oldWater&&WATER_BANK.has(before);
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
  // Report incompatible cells; the shared commit path skips just those cells.
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
  const recognized=snapshot.recognized||Mountain.readRecognized(snapshot);
  const localHeight=recognized.accepted.has(ak)?null:surfaceLevels(snapshot);
  const level=localHeight?localHeight(ax,ay):heightAt(snapshot,ax,ay);p.level=level;p.feature=`扩展第 ${level} 级高台`;
  if(level<2||read(0,ax,ay)!==1177||read(1,ax,ay)!==0){
    conflict(p.conflicts,ax,ay,'请在已有高台的平坦岩面内起笔');return p;
  }
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
    const k=FKEY(x,y);if(!cache.has(k))cache.set(k,localHeight?localHeight(x,y):heightAt(snapshot,x,y)+Number([1170,1178,1186].includes(read(1,x,y))));return cache.get(k);
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
return {planPlatform,planDig,planWater,planExpand,heightAt,outsideGround,WATER,WATER_BANK};
}

const Features=createFeatures(Mountain);
function createGrassMountain(Mountain,Features){
  const key=(x,y)=>`${x},${y}`;
  const topTile=388,capTile=1313;
  function prepare(snapshot){
    const {width,height}=snapshot,read=snapshot.read.bind(snapshot),top=new Set();
    const left=new Set([1168,1176,1184]),right=new Set([1170,1178,1186]);
    const outer=new Set([...Mountain.OUTER,capTile]);
    for(let y=0;y<height;y++){
      let balance=0;
      for(let x=0;x<width;x++){
        const edge=read(1,x,y);
        if(left.has(edge))balance++;
        if(right.has(edge))balance--;
      }
      let depth=Math.max(0,-balance);
      for(let x=0;x<width;x++){
        const edge=read(1,x,y);
        if(left.has(edge))depth++;
        const north=read(1,x,y-1);
        const inner= (edge===capTile&&(left.has(north)||right.has(north)))||
          (edge===1178&&north===1192)||(edge===1176&&north===1193);
        if(read(0,x,y)===topTile&&depth>0&&(!outer.has(edge)||depth>1||inner))top.add(key(x,y));
        if(right.has(edge))depth--;
      }
    }
    const virtual={...snapshot,allowGrassCap:true,read(z,x,y){
      const value=read(z,x,y);
      if(z===0&&top.has(key(x,y)))return 1177;
      if(z===0&&value===1177)return 20000; // Keep rock mountains separate.
      if(z===1&&value===capTile)return 1169;
      return value;
    }};
    virtual.recognized=Mountain.readRecognized(virtual);
    return {virtual,top};
  }
  function project(snapshot,plan,brush){
    const changes=[],renderCells=new Map();
    // Map042 的草面斜坡把内凹的左上角 1201 也画成草面顶缘 1313。
    // 保留 Mountain 的几何规则，只在最终图块投影时换成手绘样例的图块。
    const cap=id=>id===1169||id===1200||id===1201?capTile:id;
    for(const [k,c] of plan.renderCells){
      const base=c.base===1177?topTile:c.base,edge=cap(c.edge);
      renderCells.set(k,{x:c.x,y:c.y,base,edge});
      for(const [layer,value] of [[0,base],[1,edge]]){
        const old=snapshot.read(layer,c.x,c.y);
        if(old!==value)changes.push({layer,x:c.x,y:c.y,old,value});
      }
    }
    // 旧版已保存的草地山地角块可在原位补一笔修复，无须擦掉整座山。
    // 只处理笔刷实际触及且本次几何仍判定为内角的格，避免改动别处。
    if(brush&&!plan.conflicts.size)for(const k of brush){
      if(renderCells.has(k)||plan.tiles?.get(k)?.edge!==1201)continue;
      const [x,y]=k.split(',').map(Number);
      if(snapshot.read(0,x,y)!==topTile||snapshot.read(1,x,y)!==1201)continue;
      renderCells.set(k,{x,y,base:topTile,edge:capTile});
      changes.push({layer:1,x,y,old:1201,value:capTile});
    }
    return {...plan,changes,renderCells,feature:plan.feature?.replace('山体','草地山地')};
  }
  function context(snapshot){return snapshot.grassContext||prepare(snapshot);}
  function plan(snapshot,brush,operation,ground=385,level=1,anchor=null){
    return project(snapshot,Mountain.plan(context(snapshot).virtual,brush,operation,ground,level,anchor),brush);
  }
  function planExpand(snapshot,brush,ground,origin){
    return project(snapshot,Features.planExpand(context(snapshot).virtual,brush,ground,origin));
  }
  function planDig(snapshot,brush,ground,origin){
    return project(snapshot,Features.planDig(context(snapshot).virtual,brush,ground,origin));
  }
  return {prepare,plan,planExpand,planDig,topTile,capTile};
}

const GrassMountain=createGrassMountain(Mountain,Features);
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
    const requested=new Set();
    for(const k of brush){
      const [x,y]=xy(k);
      if(!inside(s,x,y))continue;
      requested.add(k);
      // Keep the original brush topology even where a higher layer blocks a
      // write: the red cell stays untouched and neighbors do not close its gap.
      if(!erase&&(read(s,1,x,y)!==0||read(s,2,x,y)!==0||s.blocked?.has(k))){
        conflict(p,x,y,'该格有第二层或更高图层的图块，跳过');
      }
      const special=isCity&&cityTransitions.has(read(s,0,x,y));
      if(erase&&!special)next.delete(k);
      else if(!erase)next.add(k);
    }
    const affected=around(requested);
    for(const k of requested){const [x,y]=xy(k);
      const base=read(s,0,x,y);
      if(erase&&isCity&&cityTransitions.has(base))conflict(p,x,y,'此处是城市道路特殊缺口，暂不支持自动擦除');
    }
    for(const k of affected){const [x,y]=xy(k);
      if(!inside(s,x,y)||(!old.has(k)&&!next.has(k)))continue;
      const base=read(s,0,x,y);
      if(erase&&isCity&&cityTransitions.has(base))continue;
      const unchanged=old.has(k)&&next.has(k)&&!requested.has(k)&&roadSignature(old,s,x,y)===roadSignature(next,s,x,y);
      const picked=next.has(k)?unchanged?{id:base}:sandTile(next,s,x,y):{id:nearbyGrass(s,x,y,ground)};
      if(picked.error){conflict(p,x,y,picked.error);continue;}
      const value=next.has(k)&&!unchanged?picked.id+offset:picked.id;
      if(value===base)continue;
      if(read(s,1,x,y)!==0||read(s,2,x,y)!==0||s.blocked?.has(k)){
        conflict(p,x,y,'该格有第二层或更高图层的图块，跳过');continue;
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
function createMultiMountain(){
 const key=(x,y)=>`${x},${y}`,xy=k=>k.split(',').map(Number);
 const left=new Set([1168,1176,1184]),right=new Set([1170,1178,1186]);
 const wall=new Set([1168,1169,1170,1176,1178,1184,1185,1186,1192,1193,1200,1201,1233]);
 const grass=id=>id>=384&&id<=389;
 function geometry(top,width,height,count,isGrass){
  const cells=new Map(),errors=new Map(),rows=Array.from({length:height},()=>Array(width+1).fill(0));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)rows[y][x+1]=rows[y][x]+Number(top.has(key(x,y)));
  const rightEdge=rows.map(row=>{for(let x=width-1;x>=0;x--)if(row[x+1]>row[x])return x;return -1;});
  const rightGrowthStart=rightEdge.map((right,y)=>{
   if(right<0)return -1;
   let start=y;
   while(start>0&&rightEdge[start-1]===right)start--;
   return start;
  });
  const gentleRightGrowth=y=>y>0&&rightEdge[y]>rightEdge[y-1]&&rightEdge[y]-rightEdge[y-1]<=2;
  for(let d=count-1;d>=0;d--){
   const has=(x,y)=>{
    const row=rows[Math.max(0,Math.min(height-1,y-d))];
    const a=Math.max(0,Math.min(width-1,x-d)),b=Math.max(0,Math.min(width-1,x+d));
    return row[b+1]>row[a];
   };
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(!has(x,y))continue;
    const n=has(x,y-1),e=has(x+1,y),s=has(x,y+1),w=has(x-1,y),k=key(x,y);
    let edge=0;
    if((!n&&!s)||(!e&&!w))errors.set(k,{x,y,message:'这格过窄，留给手工调整'});
    if(!n)edge=!w?1168:!e?1170:1169;
    else if(!s)edge=!w?1184:!e?1186:1185;
    else if(!w)edge=1176;
    else if(!e)edge=1178;
    else{
     const missing=[[x-1,y-1,1169],[x+1,y-1,1169],[x-1,y+1,1193],[x+1,y+1,1192]].filter(([a,b])=>!has(a,b));
     if(missing.length>1)errors.set(k,{x,y,message:'多个转角挤在同一格，留给手工调整'});
     if(missing.length)edge=missing[0][2];
    }
    if(isGrass&&edge===1169)edge=1233;
    const under=cells.get(k);
    const right=rightEdge[y],before=y>0?rightEdge[y-1]:-1;
    const advancing=gentleRightGrowth(y);
    const rightStart=rightGrowthStart[y];
    // 新台面向右拐出的头一两格，透明岩壁后仍是草地。
    // 下一级紧贴该拐角的侧面也延续草地，直到岩壁真正叠在旧岩面上。
    // 左上外角的透明部分面向山体外侧，即使下层外角与其重叠也必须露出草地。
    const openCorner=edge===1168||(under&&edge!==0&&right>=0&&(
      (top.has(k)&&advancing&&x>before)||
      (!top.has(k)&&(edge===1170||edge===1178)&&x===right+1&&gentleRightGrowth(rightStart)&&y-rightStart<=count-1)
    ));
    cells.set(k,{x,y,edge,solid:edge===0||!!under&&!openCorner,openCorner:!!openCorner,grass:isGrass});
   }
  }
  return {cells,errors};
 }
 function components(mask){
  const todo=new Set(mask),out=[];
  while(todo.size){const start=todo.values().next().value,part=new Set([start]),queue=[start];todo.delete(start);
   for(let i=0;i<queue.length;i++){const [x,y]=xy(queue[i]);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=key(x+dx,y+dy);if(todo.delete(k)){part.add(k);queue.push(k);}}}
   out.push(part);
  }
  return out;
 }
 function recognize(snapshot,count,isGrass){
  const {width,height,read}=snapshot,mask=new Set();
  for(let y=0;y<height;y++){
   let first=0;for(let x=0;x<width;x++)if(wall.has(read(1,x,y))){first=read(1,x,y);break;}
   let inside=!!first&&!left.has(first);
   for(let x=0;x<width;x++){const e=read(1,x,y);if(left.has(e))inside=true;if(inside||wall.has(e))mask.add(key(x,y));if(right.has(e))inside=false;}
  }
  const found=[];
  for(const occupied of components(mask)){
   const openBottom=[...occupied].some(k=>{const [x,y]=xy(k);return y===height-1&&![1184,1185,1186,1192,1193].includes(read(1,x,y));});
   const has=(x,y)=>{if(y>=height)return openBottom;return occupied.has(key(Math.max(0,Math.min(width-1,x)),Math.max(0,y)));};
   const top=new Set();
   for(const k of occupied){const [x,y]=xy(k);let fits=true;
    for(let d=1;fits&&d<count;d++)for(let dx=-d;dx<=d;dx++)if(!has(x+dx,y+d)){fits=false;break;}
    if(fits)top.add(k);
   }
   // 膨胀后反推台面会填平内凹转角；可见的台面侧壁用于还原这些缺口。
   for(let pass=0;pass<count;pass++){
    const preview=geometry(top,width,height,count,isGrass),remove=new Set();
    for(const [k,t] of preview.cells){if(!top.has(k)||t.edge===read(1,t.x,t.y))continue;
     const actual=read(1,t.x,t.y);
     if(actual===1178)remove.add(key(t.x+1,t.y));
     if(actual===1176)remove.add(key(t.x-1,t.y));
     if(actual===1185)remove.add(key(t.x,t.y+1));
    }
    let changed=false;for(const k of remove)if(top.delete(k))changed=true;
    if(!changed)break;
   }
   if(!top.size)continue;
   const rendered=geometry(top,width,height,count,isGrass);
   if(rendered.errors.size||rendered.cells.size!==occupied.size)continue;
   let valid=true;
   for(const [k,t] of rendered.cells){const actual=read(1,t.x,t.y),base=read(0,t.x,t.y);
    if(snapshot.matchesMultiTile){if(!snapshot.matchesMultiTile(t.x,t.y,t)){valid=false;break;}continue;}
    // 两个岩面手绘样例在内凹顶缘省略一格 1169，台面仍为岩面。
    const capAlias=!isGrass&&t.edge===1169&&actual===0&&base===1177;
    if(actual!==t.edge&&!capAlias){valid=false;break;}
    if(t.edge===0&&(isGrass?!grass(base):base!==1177)){valid=false;break;}
   }
   if(valid)found.push({top,occupied});
  }
  return found;
 }
 function plan(snapshot,brush,ground,count,isGrass){
  const {width,height,read}=snapshot;
  const result={changes:[],renderCells:new Map(),conflicts:new Map(),feature:`${count} 层${isGrass?'草地':''}山体`,level:count,footprint:brush};
  if(!Number.isSafeInteger(count)||count<2||count>width+height){result.conflicts.set('layers',{x:0,y:0,message:`层数请填 2～${width+height} 的整数`});return result;}
  const recognized=snapshot.multiRecognized||recognize(snapshot,count,isGrass);
  const touched=recognized.filter(c=>[...brush].some(k=>{const [x,y]=xy(k);return c.occupied.has(k)||[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>c.top.has(key(x+a,y+b)));}));
  const top=new Set(brush),owned=new Set();
  for(const c of touched){for(const k of c.top)top.add(k);for(const k of c.occupied)owned.add(k);}
  const rendered=geometry(top,width,height,count,isGrass);
  for(const [k,c] of rendered.errors)result.conflicts.set(k,c);
  for(const [k,t] of rendered.cells){
   const base=read(0,t.x,t.y),edge=read(1,t.x,t.y);
   if(read(2,t.x,t.y)!==0||snapshot.blocked?.has(k)||snapshot.events?.has(k)||(!owned.has(k)&&(!grass(base)||edge!==0))){
    result.conflicts.set(k,{x:t.x,y:t.y,message:'已有地形或物件占用；跳过这格'});continue;
   }
   // 保留原样例未改变的边界和基底；新格按层级铺草面或岩面。
   const same=owned.has(k)&&edge===t.edge&&!(t.openCorner&&base===1177);
   const nextBase=same?base:isGrass?388:t.solid?1177:grass(base)?base:ground;
   const nextEdge=same?edge:t.edge;
   if(base===nextBase&&edge===nextEdge)continue;
   result.renderCells.set(k,{x:t.x,y:t.y,base:nextBase,edge:nextEdge});
   for(const [layer,old,value] of [[0,base,nextBase],[1,edge,nextEdge]])if(old!==value)result.changes.push({layer,x:t.x,y:t.y,old,value});
  }
  result.top=top;
  return result;
 }
 return {geometry,recognize,plan};
}

const MultiMountain=createMultiMountain();
let multiLayers=2;
const isMultiTerrain=t=>t==="multi"||t==="grassMulti";

// 山体使用真实图块重建高度范围，撤销、重做和重新打开地图后不依赖隐藏缓存。
let terrain = "grass";
// Outside 高松：把一棵树视作宽 2 格、相邻树行相隔 2 格的树位。
// 树位的可见图块横跨 3 行；上下相接时，中间那行改用连片林体图块。
function createForest() {
  const key = (x, y) => `${x},${y}`;
  const xy = value => value.split(',').map(Number);
  const grass = id => id >= 385 && id <= 389;
  const middle = id => id >= 808 && id <= 811;
  const inner = id => id >= 800 && id <= 803;
  const bottom = id => id >= 816 && id <= 819;
  const inside = (s, x, y) => x >= 0 && y >= 0 && x < s.width && y < s.height;
  const read = (s, z, x, y) => inside(s, x, y) ? s.read(z, x, y) : 0;
  const pairClass = (s, z, x, y, predicate) =>
    predicate(read(s, z, x, y)) && (x + 1 >= s.width || predicate(read(s, z, x + 1, y)));

  function recognize(s) {
    const sites = new Map(), owned = [new Set(), new Set(), new Set()];
    const own = (z, x, y) => { if (inside(s, x, y)) owned[z].add(key(x, y)); };
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      if (read(s, 2, x, y) !== 804 || (x + 1 < s.width && read(s, 2, x + 1, y) !== 805)) continue;
      const forest = y + 1 < s.height && pairClass(s, 0, x, y + 1, middle) &&
        (y + 2 >= s.height || pairClass(s, 0, x, y + 2, inner) || pairClass(s, 0, x, y + 2, bottom));
      const single = (y + 1 >= s.height || (read(s, 1, x, y + 1) === 812 &&
        (x + 1 >= s.width || read(s, 1, x + 1, y + 1) === 813))) &&
        (y + 2 >= s.height || (read(s, 1, x, y + 2) === 820 &&
        (x + 1 >= s.width || read(s, 1, x + 1, y + 2) === 821)));
      if (!forest && !single) continue;
      own(2, x, y); own(2, x + 1, y);
      if (single) {
        sites.set(key(x, y), { x, y });
        for (const yy of [y + 1, y + 2]) { own(1, x, yy); own(1, x + 1, yy); }
        continue;
      }
      let cy = y;
      while (cy + 1 < s.height && pairClass(s, 0, x, cy + 1, middle)) {
        const lowerInner = pairClass(s, 0, x, cy + 2, inner);
        const lowerBottom = pairClass(s, 0, x, cy + 2, bottom);
        const clipped = cy + 2 >= s.height;
        if (!lowerInner && !lowerBottom && !clipped) break;
        sites.set(key(x, cy), { x, y: cy });
        for (const yy of [cy + 1, cy + 2]) { own(0, x, yy); own(0, x + 1, yy); }
        if (lowerBottom || clipped) break;
        cy += 2;
      }
    }
    return { sites, owned };
  }

  const touches = (a, b) => a !== b && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2;
  const crowded = (sites, site) => [...sites.values()].some(other => touches(other, site));
  const overlaps = (a, b) => a !== b && a.x <= b.x + 1 && b.x <= a.x + 1 &&
    a.y <= b.y + 2 && b.y <= a.y + 2 && !(a.x === b.x && Math.abs(a.y - b.y) === 2);
  const pairIds = (s, z, x, y) => [read(s, z, x, y), read(s, z, x + 1, y)];

  function nearbyGrass(s, x, y, fallback) {
    for (let radius = 1; radius <= 20; radius++) for (let dy = -radius; dy <= radius; dy++) {
      const dx = radius - Math.abs(dy);
      for (const xx of dx ? [x - dx, x + dx] : [x]) {
        const id = read(s, 0, xx, y + dy);
        if (grass(id)) return id;
      }
    }
    return grass(fallback) ? fallback : 385;
  }

  function plan(s, brush, origin, ground = 385, erase = false) {
    const p = { changes: [], renderCells: new Map(), conflicts: new Map(), footprint: brush,
      feature: erase ? '擦除高松林' : '绘制高松林', level: 0 };
    const original = s.forestRecognized || recognize(s);
    const oldSites = original.sites, sites = new Map(oldSites);
    const conflict = (x, y, message) => p.conflicts.set(key(x, y), { x, y, message });
    const cursor = [...brush].map(xy);
    const oldList = [...oldSites.values()];
    const covered = (z, x, y) => original.owned[z].has(key(x, y));
    const obstacle = (x, y) => {
      if (!inside(s, x, y)) return false; // 图纸边缘直接裁切树的可见部分。
      if (s.events?.has(key(x, y))) return true;
      if ([...s.arrays].some(([z, data]) => z >= 3 && data[y * s.width + x])) return true;
      return (!grass(read(s, 0, x, y)) && !covered(0, x, y)) ||
        (read(s, 1, x, y) !== 0 && !covered(1, x, y)) ||
        (read(s, 2, x, y) !== 0 && !covered(2, x, y));
    };

    if (erase) {
      // 对每一格笔刷，选择该位置正下方最接近树冠中行的树位。
      const removed = new Set();
      for (const [x, y] of cursor) {
        const candidates = oldList.filter(site => x >= site.x && x <= site.x + 1 &&
          y >= site.y && y <= site.y + 2);
        candidates.sort((a, b) => Math.abs(y - (a.y + 1)) - Math.abs(y - (b.y + 1)) || b.y - a.y);
        const chosen = candidates[0];
        if (!chosen) continue;
        if ([chosen.y, chosen.y + 1, chosen.y + 2].some(yy =>
          [chosen.x, chosen.x + 1].some(xx => inside(s, xx, yy) && s.events?.has(key(xx, yy))))) {
          conflict(x, y, '树位上有事件，不能擦除'); continue;
        }
        removed.add(key(chosen.x, chosen.y));
      }
      for (const k of removed) sites.delete(k);
    } else {
      const near = oldList.map(site => ({ site,
        distance: Math.max(0, site.x - origin.x, origin.x - site.x - 1) +
          Math.max(0, site.y - origin.y, origin.y - site.y - 2) }))
        .sort((a, b) => a.distance - b.distance)[0];
      const ax = near?.distance <= 2 ? near.site.x : origin.x;
      const ay = near?.distance <= 2 ? near.site.y : origin.y;
      const wanted = new Map();
      for (const [x, y] of cursor) {
        const sx = ax + 2 * Math.floor((x - ax) / 2);
        const sy = ay + 2 * Math.floor((y - ay) / 2);
        if (sx >= 0 && sy >= 0 && sx < s.width && sy < s.height)
          wanted.set(key(sx, sy), { x: sx, y: sy });
      }
      for (const site of wanted.values()) {
        const k = key(site.x, site.y);
        if (sites.has(k)) continue;
        if ([...sites.values()].some(other => overlaps(site, other))) {
          conflict(site.x, site.y, '这里与已有高松的树位错开一格，请沿原有树位继续画'); continue;
        }
        let blocked = false;
        for (let yy = site.y; yy <= site.y + 2; yy++) for (let xx = site.x; xx <= site.x + 1; xx++) {
          if (obstacle(xx, yy)) { blocked = true; conflict(xx, yy, '这里已有其他地形、树木或事件'); }
        }
        if (!blocked) sites.set(k, site);
      }
    }

    const desired = [new Map(), new Map(), new Map()], variants = new Map();
    const ordered = [...sites.values()].sort((a, b) => a.y - b.y || a.x - b.x);
    const put = (z, x, y, id) => { if (inside(s, x, y)) desired[z].set(key(x, y), id); };
    const putPair = (z, x, y, fresh, kind) => {
      const old = pairIds(s, z, x, y);
      const useOld = kind && old[0] && kind(old[0]) &&
        (x + 1 >= s.width || kind(old[1]));
      put(z, x, y, useOld ? old[0] : fresh[0]);
      put(z, x + 1, y, useOld ? old[1] : fresh[1]);
    };
    for (const site of ordered) {
      const k = key(site.x, site.y), forest = crowded(sites, site);
      const existing = pairIds(s, 0, site.x, site.y + 1);
      let variant;
      if (middle(existing[0])) variant = existing[0] >= 810 ? 1 : 0;
      else if (variants.has(key(site.x, site.y - 2))) variant = variants.get(key(site.x, site.y - 2));
      else if (variants.has(key(site.x - 2, site.y))) variant = 1 - variants.get(key(site.x - 2, site.y));
      else variant = 0;
      variants.set(k, variant);
      if (!sites.has(key(site.x, site.y - 2))) putPair(2, site.x, site.y, [804, 805], id => id === 804 || id === 805);
      if (forest) {
        putPair(0, site.x, site.y + 1, variant ? [810, 811] : [808, 809], middle);
        const continues = sites.has(key(site.x, site.y + 2));
        const formerLower = read(s, 0, site.x, site.y + 2);
        const lowerVariant = continues && bottom(formerLower) ? (formerLower >= 818 ? 1 : 0) :
          !continues && inner(formerLower) ? (formerLower >= 802 ? 1 : 0) : variant;
        putPair(0, site.x, site.y + 2,
          continues ? lowerVariant ? [802, 803] : [800, 801] : lowerVariant ? [818, 819] : [816, 817],
          continues ? inner : bottom);
      } else {
        putPair(1, site.x, site.y + 1, [812, 813], id => id === 812 || id === 813);
        putPair(1, site.x, site.y + 2, [820, 821], id => id === 820 || id === 821);
      }
    }

    for (let z = 0; z < 3; z++) {
      const affected = new Set([...original.owned[z], ...desired[z].keys()]);
      for (const k of affected) {
        const [x, y] = xy(k), before = read(s, z, x, y);
        const value = desired[z].has(k) ? desired[z].get(k) : z === 0 ? nearbyGrass(s, x, y, ground) : 0;
        if (before === value) continue;
        if (s.events?.has(k)) { conflict(x, y, '此处有事件，不能修改高松'); continue; }
        if (!original.owned[z].has(k) && ((z === 0 && !grass(before)) || (z > 0 && before !== 0))) {
          conflict(x, y, '此处已有其他图块，不能覆盖'); continue;
        }
        p.changes.push({ layer: z, x, y, old: before, value });
      }
    }
    for (const change of p.changes) {
      const k = key(change.x, change.y), x = change.x, y = change.y;
      if (p.conflicts.has(k)) continue;
      p.renderCells.set(k, { x, y,
        base: desired[0].get(k) ?? (original.owned[0].has(k) ? nearbyGrass(s, x, y, ground) : read(s, 0, x, y)),
        edge: desired[1].get(k) ?? (original.owned[1].has(k) ? 0 : read(s, 1, x, y)),
        top: desired[2].get(k) ?? (original.owned[2].has(k) ? 0 : read(s, 2, x, y)) });
    }
    return p;
  }

  return { recognize, plan };
}

const Forest=createForest();

// Map099 圆冠林：树位宽 3 格，纵向每 2 格接续；冠顶两行在第三层。
// 单棵的冠顶直接接第一层树底；只有继续向下接树时，中间才改用树身。
function createRoundForest() {
  const key = (x, y) => `${x},${y}`;
  const xy = value => value.split(',').map(Number);
  const grass = id => id >= 385 && id <= 389;
  const inside = (s, x, y) => x >= 0 && y >= 0 && x < s.width && y < s.height;
  const read = (s, z, x, y) => inside(s, x, y) ? s.read(z, x, y) : 0;
  const cap = [[0, 1, 849], [1, 0, 856], [1, 1, 857], [1, 2, 858]];
  const body = [[2, [864, 865, 866]], [3, [872, 873, 874]]];
  const foot = [[2, [880, 881, 882]], [3, [888, 889, 890]]];
  const match = (s, z, x, y, values) => values.every((id, dx) =>
    !inside(s, x + dx, y) || read(s, z, x + dx, y) === id);
  const hasVisible = (s, x, y, cells) => cells.some(([dy, dx]) => inside(s, x + dx, y + dy));
  const capMatches = (s, x, y) => hasVisible(s, x, y, cap) &&
    cap.every(([dy, dx, id]) => !inside(s, x + dx, y + dy) || read(s, 2, x + dx, y + dy) === id);
  const rowsMatch = (s, x, y, rows) => hasVisible(s, x, y, rows.flatMap(([dy])=>[0,1,2].map(dx=>[dy,dx]))) &&
    rows.every(([dy, values]) => match(s, 0, x, y + dy, values));

  function recognize(s) {
    const sites = new Map(), owned = [new Set(), new Set(), new Set()];
    const own = (z, x, y) => { if (inside(s, x, y)) owned[z].add(key(x, y)); };
    const ownRows = (x, y, rows) => {
      for (const [dy] of rows) for (let dx = 0; dx < 3; dx++) own(0, x + dx, y + dy);
    };
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      if (!capMatches(s, x, y)) continue;
      let cy = y, count = 0;
      while (cy < s.height) {
        if (rowsMatch(s, x, cy, foot)) {
          sites.set(key(x, cy), { x, y: cy });ownRows(x, cy, foot);count++;break;
        }
        if (!rowsMatch(s, x, cy, body)) break;
        sites.set(key(x, cy), { x, y: cy });ownRows(x, cy, body);count++;
        cy += 2;
      }
      if (count) for (const [dy, dx] of cap) own(2, x + dx, y + dy);
    }
    return { sites, owned };
  }

  function nearbyGrass(s, x, y, fallback) {
    for (let radius = 1; radius <= 20; radius++) for (let dy = -radius; dy <= radius; dy++) {
      const dx = radius - Math.abs(dy);
      for (const xx of dx ? [x - dx, x + dx] : [x]) {
        const id = read(s, 0, xx, y + dy);
        if (grass(id)) return id;
      }
    }
    return grass(fallback) ? fallback : 385;
  }

  function plan(s, brush, origin, ground = 385, erase = false) {
    const p = { changes: [], renderCells: new Map(), conflicts: new Map(), footprint: brush,
      feature: erase ? '擦除圆冠林' : '绘制圆冠林', level: 0 };
    const original = s.roundRecognized || recognize(s);
    const oldSites = original.sites, sites = new Map(oldSites);
    const oldList = [...oldSites.values()], cursor = [...brush].map(xy);
    const conflict = (x, y, message) => p.conflicts.set(key(x, y), { x, y, message });
    const covered = (z, x, y) => original.owned[z].has(key(x, y));
    const obstacle = (x, y) => {
      if (!inside(s, x, y)) return false;
      if (s.events?.has(key(x, y))) return true;
      if ([...s.arrays].some(([z, data]) => z >= 3 && data[y * s.width + x])) return true;
      return (!grass(read(s, 0, x, y)) && !covered(0, x, y)) ||
        (read(s, 1, x, y) !== 0 && !covered(1, x, y)) ||
        (read(s, 2, x, y) !== 0 && !covered(2, x, y));
    };
    const overlaps = (a, b) => {
      if (a.x > b.x + 2 || b.x > a.x + 2 || Math.abs(a.y - b.y) >= 6) return false;
      if (a.x === b.x) {
        const distance = Math.abs(a.y - b.y);
        if (distance === 2 || (distance === 4 && sites.has(key(a.x, (a.y + b.y) / 2)))) return false;
      }
      return true;
    };

    if (erase) {
      const removed = new Set();
      for (const [x, y] of cursor) {
        const candidates = oldList.filter(site => x >= site.x && x <= site.x + 2 &&
          y >= site.y && y <= site.y + 3);
        candidates.sort((a, b) =>
          Number(y >= b.y + 2 && y <= b.y + 3) - Number(y >= a.y + 2 && y <= a.y + 3) ||
          Math.abs(y - (a.y + 2.5)) - Math.abs(y - (b.y + 2.5)) || b.y - a.y);
        const chosen = candidates[0];
        if (!chosen) continue;
        let event = false;
        for (let yy = chosen.y; yy <= chosen.y + 3; yy++) for (let xx = chosen.x; xx <= chosen.x + 2; xx++)
          if (inside(s, xx, yy) && s.events?.has(key(xx, yy))) event = true;
        if (event) { conflict(x, y, '树位上有事件，不能擦除'); continue; }
        removed.add(key(chosen.x, chosen.y));
      }
      for (const k of removed) sites.delete(k);
    } else {
      // x 列每三格接合；y 列各自按两格接合，允许相邻列错开一格形成阶梯。
      const near = oldList.map(site => ({ site,
          distance: Math.max(0, site.x - origin.x, origin.x - site.x - 2) +
          Math.max(0, site.y - origin.y, origin.y - site.y - 3) }))
        .sort((a, b) => a.distance - b.distance)[0];
      const ax = near?.distance <= 3 ? near.site.x : origin.x;
      const columns = new Map();
      for (const [x, y] of cursor) {
        const sx = ax + 3 * Math.floor((x - ax) / 3);
        if (sx < 0 || sx >= s.width) continue;
        if (!columns.has(sx)) columns.set(sx, []);
        columns.get(sx).push(y);
      }
      const wanted = new Map();
      for (const [sx, ys] of columns) {
        const ymin = Math.min(...ys);
        const oldColumn = oldList.filter(site => site.x === sx);
        const sameColumn = oldColumn.map(site => ({ site, distance: Math.max(0, site.y - ymin, ymin - site.y - 3) }))
          .sort((a, b) => a.distance - b.distance)[0];
        const ay = sameColumn?.distance <= 1 ? sameColumn.site.y : ymin;
        const down = oldColumn.find(site => !oldSites.has(key(sx, site.y + 2)) && ys.includes(site.y + 4));
        const up = oldColumn.find(site => !oldSites.has(key(sx, site.y - 2)) && ys.includes(site.y - 1));
        for (const y of ys) {
          const owner = oldColumn.filter(site => y >= site.y && y <= site.y + 3)
            .sort((a, b) => Number(y >= b.y + 2 && y <= b.y + 3) - Number(y >= a.y + 2 && y <= a.y + 3) ||
              Math.abs(y - (a.y + 2.5)) - Math.abs(y - (b.y + 2.5)))[0];
          const sy = owner ? owner.y : down && y >= down.y + 4 ?
            down.y + 2 + 2 * Math.floor((y - down.y - 4) / 2) : up && y < up.y ?
            up.y - 2 - 2 * Math.floor((up.y - 1 - y) / 2) :
            ay + 2 * Math.floor((y - ay) / 2);
          if (sy >= 0 && sy < s.height) wanted.set(key(sx, sy), { x: sx, y: sy });
        }
      }
      for (const site of wanted.values()) {
        const k = key(site.x, site.y);
        if (sites.has(k)) continue;
        if ([...sites.values()].some(other => overlaps(site, other))) {
          conflict(site.x, site.y, '这里与已有圆冠树错位，请沿现有树位继续画'); continue;
        }
        let blocked = false;
        for (let yy = site.y; yy <= site.y + 3; yy++) for (let xx = site.x; xx <= site.x + 2; xx++)
          if (obstacle(xx, yy)) { blocked = true; conflict(xx, yy, '这里已有其他地形、树木或事件'); }
        if (blocked || !hasVisible(s, site.x, site.y, cap)) continue;
        sites.set(k, site);
      }
    }

    const desired = [new Map(), new Map(), new Map()];
    const put = (z, x, y, id) => { if (inside(s, x, y)) desired[z].set(key(x, y), id); };
    for (const site of sites.values()) {
      if (!sites.has(key(site.x, site.y - 2)))
        for (const [dy, dx, id] of cap) put(2, site.x + dx, site.y + dy, id);
      const lower = sites.has(key(site.x, site.y + 2));
      for (const [dy, ids] of lower ? body : foot)
        for (let dx = 0; dx < 3; dx++) put(0, site.x + dx, site.y + dy, ids[dx]);
    }
    for (let z = 0; z < 3; z++) {
      for (const k of new Set([...original.owned[z], ...desired[z].keys()])) {
        const [x, y] = xy(k), before = read(s, z, x, y);
        const value = desired[z].has(k) ? desired[z].get(k) : z === 0 ? nearbyGrass(s, x, y, ground) : 0;
        if (before === value) continue;
        if (s.events?.has(k)) { conflict(x, y, '此处有事件，不能修改圆冠林'); continue; }
        if (!covered(z, x, y) && ((z === 0 && !grass(before)) || (z > 0 && before !== 0))) {
          conflict(x, y, '此处已有其他图块，不能覆盖'); continue;
        }
        p.changes.push({ layer: z, x, y, old: before, value });
      }
    }
    for (const change of p.changes) {
      const k = key(change.x, change.y), x = change.x, y = change.y;
      if (p.conflicts.has(k)) continue;
      p.renderCells.set(k, { x, y,
        base: desired[0].get(k) ?? (covered(0, x, y) ? nearbyGrass(s, x, y, ground) : read(s, 0, x, y)),
        edge: read(s, 1, x, y),
        top: desired[2].get(k) ?? (covered(2, x, y) ? 0 : read(s, 2, x, y)) });
    }
    return p;
  }

  return { recognize, plan };
}

const RoundForest=createRoundForest();

const terrainNames = { multi: "多层山体", grassMulti: "草地多层山地", grass: "草地", mountain: "单层山体", upper: "叠加高台", erase: "擦除底座", eraseUpper: "擦除高台", expand: "扩展高台", dig: "下挖一层", grassMountain: "单层草地山地", grassUpper: "草地山地叠加高台", grassExpand: "草地山地扩展高台", grassDig: "草地山地下挖一层", grassEraseUpper: "草地山地擦除高台", grassErase: "草地山地擦除底座", water: "绘制水坑", eraseWater: "擦除水坑", sand: "绘制道路", eraseSand: "擦除道路", fence: "绘制栅栏", eraseFence: "擦除栅栏", forestPine: "绘制高松林", eraseForestPine: "擦除高松林", forestRound: "绘制圆冠林", eraseForestRound: "擦除圆冠林" };
const isGrassMountainTerrain=t=>["grassMountain","grassUpper","grassExpand","grassDig","grassEraseUpper","grassErase"].includes(t);
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
function mountainSnapshot(mapId, taught = false) {
  const map = ctxRef.map.info(mapId);
  const atlas = ctxRef.tileset?.info(map.tilesetId);
  if (!atlas || (!taught && !/^Outside(?:\.png)?$/i.test(atlas.tilesetName))) throw Error("默认山体工具只支持 Outside；其他图块集请选择已保存的教学样式。");
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
  return {width:map.width,height:map.height,arrays,blocked,fallbackGround:grassTileId>=384?grassTileId:null,
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
  if(currentTeachingKind()&&taughtChoice!=='default'){
    if(taughtLoading||taughtContext!==taughtContextKey())throw Error('教学样式正在加载，请稍后再落笔');
    if(!taughtProfile)throw Error(taughtError||'当前图块集没有可用的教学样式，请刷新或先保存教学');
    pending.taughtProfile=cloneTeaching(taughtProfile);
  }
  pending.snapshot=mountainSnapshot(pending.mapId,Boolean(pending.taughtProfile));
  if(pending.taughtProfile){
    if(isMultiTerrain(terrain)&&(!Number.isSafeInteger(multiLayers)||multiLayers<2||multiLayers>pending.snapshot.width+pending.snapshot.height))throw Error(`山体层数请填 2～${pending.snapshot.width+pending.snapshot.height} 的整数。`);
    pending.multiLayers=multiLayers;
    const companionKind=companionMultiKind(currentTeachingKind()),companionEntries=taughtProfiles[companionKind]||[];
    const companionId=taughtChoices[companionKind]?.startsWith('saved:')?taughtChoices[companionKind].slice(6):null;
    const companion=taughtChoice.startsWith('multi-saved:')?taughtProfile:
      (companionEntries.find(entry=>entry.id===companionId)||companionEntries[0])?.profile;
    const engines={Mountain,Surface,Forest,RoundForest,Features,MultiMountain},relocated=relocatedTeaching(pending.taughtProfile);
    const mapped=relocated?createLayeredTaughtTerrain(pending.taughtProfile,pending.snapshot,engines,terrain,multiLayers,companion?[companion]:[]):createTaughtTerrain(pending.taughtProfile,pending.snapshot,engines,terrain,multiLayers,companion?[companion]:[]);
    pending.taughtModel=!relocated&&terrain==='mountain'&&(mapped.levels?.length||0)<=1?createTaughtMountain(pending.taughtProfile,(mask,w,h)=>combine([mask],w,h),pending.snapshot):mapped;
    pending.ground=pending.taughtProfile.roles.ground.tile;return;
  }
  pending.multiLayers=multiLayers;
  if(terrain==="forestPine"||terrain==="eraseForestPine") pending.snapshot.forestRecognized=Forest.recognize(pending.snapshot);
  else if(terrain==="forestRound"||terrain==="eraseForestRound") pending.snapshot.roundRecognized=RoundForest.recognize(pending.snapshot);
  else if(isMultiTerrain(terrain)) {
    const limit=pending.snapshot.width+pending.snapshot.height;
    if(!Number.isSafeInteger(multiLayers)||multiLayers<2||multiLayers>limit)throw Error(`山体层数请填 2～${limit} 的整数。`);
    pending.snapshot.multiRecognized=MultiMountain.recognize(pending.snapshot,multiLayers,terrain==="grassMulti");
  }
  else if(isGrassMountainTerrain(terrain)) pending.snapshot.grassContext=GrassMountain.prepare(pending.snapshot);
  else if(!["sand","eraseSand","fence","eraseFence"].includes(terrain)) pending.snapshot.recognized=Mountain.readRecognized(pending.snapshot);
  // 仅使用 Outside 的普通草地，避免回填到建筑或调色板透明格。
  pending.ground=grassTileId>=385&&grassTileId<=389?grassTileId:385;
}
function updateMountainPreview() {
  if(stroke.terrain==="grass")return;
  if(stroke.taughtModel){stroke.plan=stroke.taughtModel.plan(new Set(stroke.cells.keys()),stroke.origin);return;}
  if(stroke.terrain==="forestPine"||stroke.terrain==="eraseForestPine") { stroke.plan=Forest.plan(stroke.snapshot,new Set(stroke.cells.keys()),stroke.origin,stroke.ground,stroke.terrain==="eraseForestPine"); return; }
  if(stroke.terrain==="forestRound"||stroke.terrain==="eraseForestRound") { stroke.plan=RoundForest.plan(stroke.snapshot,new Set(stroke.cells.keys()),stroke.origin,stroke.ground,stroke.terrain==="eraseForestRound"); return; }
  if(isMultiTerrain(stroke.terrain)){stroke.plan=MultiMountain.plan(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.multiLayers,stroke.terrain==="grassMulti");return;}
  if(stroke.terrain==="sand"||stroke.terrain==="eraseSand") { stroke.plan=Surface.planSand(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.terrain==="eraseSand",stroke.roadStyle); return; }
  if(stroke.terrain==="fence"||stroke.terrain==="eraseFence") { stroke.plan=Surface.planFence(stroke.snapshot,new Set(stroke.cells.keys()),stroke.path,stroke.insideSide,stroke.terrain==="eraseFence"); return; }
  if(isGrassMountainTerrain(stroke.terrain)) { const cells=new Set(stroke.cells.keys());
    if(stroke.terrain==="grassExpand") stroke.plan=GrassMountain.planExpand(stroke.snapshot,cells,stroke.ground,stroke.origin);
    else if(stroke.terrain==="grassDig") stroke.plan=GrassMountain.planDig(stroke.snapshot,cells,stroke.ground,stroke.origin);
    else stroke.plan=GrassMountain.plan(stroke.snapshot,cells,stroke.terrain==="grassErase"||stroke.terrain==="grassEraseUpper"?"erase":"add",stroke.ground,stroke.terrain==="grassUpper"?"raise":stroke.terrain==="grassEraseUpper"?"lower":1,stroke.origin);
    return; }
  if(stroke.terrain==="expand") { stroke.plan=Features.planExpand(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.origin); return; }
  if(stroke.terrain==="dig") { stroke.plan=Features.planDig(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.origin); return; }
  if(stroke.terrain==="water"||stroke.terrain==="eraseWater") { stroke.plan=Features.planWater(stroke.snapshot,new Set(stroke.cells.keys()),stroke.ground,stroke.terrain==="eraseWater"); return; }
  stroke.plan=Mountain.plan(stroke.snapshot,new Set(stroke.cells.keys()),stroke.terrain.startsWith('erase')?'erase':'add',stroke.ground,
    stroke.terrain==='upper'?'raise':stroke.terrain==='eraseUpper'?'lower':1,stroke.origin);
}
function drawableChanges(plan) {
  return plan.changes.filter(c => !plan.conflicts.has(Mountain.key(c.x,c.y)));
}
function mountainStrokeStatus() {
  const p=stroke.plan,valid=drawableChanges(p);
  const count=new Set(valid.map(c=>Mountain.key(c.x,c.y))).size;
  if(p.conflicts.size)return `红色 ${p.conflicts.size} 格跳过：${p.conflicts.values().next().value.message}。\n${count?`松开绘制其余 ${count} 格，不补边、不封口；Esc 取消。`:'没有可画格；可继续移动或按 Esc 取消。'}`;
  return `${p.feature|| (p.connection?"连接同高度山体":`第 ${p.level} 级高度`)} · 实时图块预览 ${stroke.cells.size} 格 · 修改 ${count} 格\n松开提交整笔 / Esc 取消`;
}
function commitMountain(pending) {
  const plan=pending.plan;
  if(!sameMountainSnapshot(pending.snapshot,mountainSnapshot(pending.mapId,Boolean(pending.taughtProfile)))) {
    status("预览期间地图或事件已改变，这一笔已取消，请重新绘制。");return;
  }
  const changes=drawableChanges(plan);
  if(!changes.length){status(plan.conflicts.size?"红色区域已跳过；没有其余可画格。":"没有需要修改的格子。");return;}
  const label=plan.feature|| (plan.connection?"连接山体":terrainNames[pending.terrain]);
  nativeTransaction(pending.mapId,changes,label);
  status(`${label}完成 · ${new Set(changes.map(c=>Mountain.key(c.x,c.y))).size} 格已绘制 · ${plan.conflicts.size} 格跳过 · Ctrl+Z 撤销整笔`);
  redraw();
}
function renderMountain(drawing,info) {
  const p=stroke.plan;
  const atlas=atlasCache.get(stroke.tilesetId)?.image;
  const drawable=[...p.renderCells].filter(([k])=>!p.conflicts.has(k)).map(([,c])=>c);
  drawing.globalAlpha=1;drawing.imageSmoothingEnabled=false;
  if(atlas)for(const c of drawable){
    if(c.layers){for(const [,id] of [...c.layers].sort(([a],[b])=>a-b))previewTile(drawing,info,atlas,id,c.x,c.y);continue;}
    previewTile(drawing,info,atlas,c.base,c.x,c.y);
    previewTile(drawing,info,atlas,c.edge,c.x,c.y);
    if(c.top!==undefined)previewTile(drawing,info,atlas,c.top,c.x,c.y);
  }
  else renderMask(drawing,info,drawable,'rgba(90,225,140,0.38)');
  renderMask(drawing,info,p.conflicts.values(),"rgba(255,55,70,0.6)","#ff7181");
}

/** 程序化绘图 v0.5.8 — Map099 圆冠林。 */
const MOD_ID = "com.mimi.procedural-terrain";
const PANEL_ID = `${MOD_ID}.panel`;
const MAX_DIAMETER = 31;
let ctxRef = null, panelRefs = null, inputCleanup = null;
let mode = "idle", hover = null, stroke = null, escapeBinding = null;
let grassTileId = 384, targetLayerIndex = null, sampledTileset = null;
let diameter = 1, shape = "circle", insideSide = "right", roadStyle = "yellow", orthogonalMode = false, notice = "先在纯草地上取样。";
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
  panelRefs.orthogonal.textContent = orthogonalMode ? "正交绘图：开启" : "正交绘图：关闭";
  panelRefs.orthogonal.dataset.enabled = String(orthogonalMode);
  panelRefs.orthogonal.setAttribute("aria-pressed", String(orthogonalMode));
  const axis = stroke?.ortho?.axis;
  const direction = stroke?.ortho ? `\n正交：${axis === "x" ? "水平锁定" : axis === "y" ? "垂直锁定" : "等待方向（移动两格）"}` : "";
  panelRefs.status.textContent = stroke
    ? (stroke.plan ? mountainStrokeStatus() : `预览 ${stroke.cells.size} 格 · 松开提交 / Esc 取消`) + direction
    : notice;
  panelRefs.target.textContent = currentTeachingKind() && taughtChoice !== "default" ? `教学样式：${taughtProfile?.name || "加载中"} · ${terrainNames[terrain]}` : isMultiTerrain(terrain) ? `${multiLayers} 层连续岩壁 · 画笔画台面，岩壁向两侧及下方延伸；地图边缘自动裁切` : terrain === "forestRound" || terrain === "eraseForestRound" ? "Outside 圆冠树；三格宽，纵向两格接续，单棵与开口树群可继续画" : terrain === "forestPine" || terrain === "eraseForestPine" ? "Outside 高松树；单棵与连片树群自动接合，擦除可打通洞口" : terrain === "water" || terrain === "eraseWater" ? "第一层画水面与岸线；只允许普通草地" : terrain === "sand" || terrain === "eraseSand" ? `第一层道路 · ${roadStyleNames[roadStyle]}；同样式自动接边` : terrain === "fence" || terrain === "eraseFence" ? "第二层栅栏；沿笔迹方向判断内侧" : isGrassMountainTerrain(terrain) ? "第一层草面 388 · 第二层岩壁；草地山地独立绘制" : terrain !== "grass" ? "第一层填岩面 · 第二层画轮廓" : `图块 ${grassTileId} · ${targetLayerIndex === null ? "当前图层" : `第 ${targetLayerIndex + 1} 层`}`;
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
function orthogonalPoint(pending, point, shiftHeld) {
  if (!shiftHeld && !orthogonalMode) { pending.ortho = null; return point; }
  if (!pending.ortho) pending.ortho = { anchor: pending.last || pending.origin, axis: null };
  const {anchor}=pending.ortho;
  const dx=point.x-anchor.x,dy=point.y-anchor.y;
  // 等鼠标离起点至少两格再选轴，避免最初一格的手抖锁错方向。
  if (!pending.ortho.axis && Math.max(Math.abs(dx),Math.abs(dy)) >= 2)
    pending.ortho.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
  if (!pending.ortho.axis) return pending.last || anchor;
  return pending.ortho.axis === "x"
    ? { ...point, y: anchor.y }
    : { ...point, x: anchor.x };
}
function cancelStroke(message) {
  stroke = null;
  escapeBinding?.dispose();
  escapeBinding = null;
  status(message);
  redraw();
}
function beginStroke(point, pointerId, shiftHeld = false) {
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
  extendStroke(point, shiftHeld);
}
function extendStroke(point, shiftHeld = false) {
  if (!stroke || stroke.mapId !== point.mapId) return;
  const target=orthogonalPoint(stroke,point,shiftHeld);
  const isFence = stroke.terrain === "fence" || stroke.terrain === "eraseFence";
  const addFence = c => {
    const last=stroke.path.at(-1);
    if(last?.x===c.x&&last?.y===c.y)return;
    stroke.path.push(c);
    stroke.cells.set(`${c.x},${c.y}`,c);
  };
  for(const center of lineCells(stroke.last || target,target)){
    if(isFence){
      const last=stroke.path.at(-1);
      if(last && last.x!==center.x && last.y!==center.y)addFence({x:center.x,y:last.y});
      addFence({x:center.x,y:center.y});
    } else for(const c of footprint(center,stroke.size,stroke.form,stroke))stroke.cells.set(`${c.x},${c.y}`,c);
  }
  stroke.last=target;
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
  if(taughtContextKey()!==taughtContext)void refreshTaughtStyles();
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
    .mimi-pg-root button[data-ref="orthogonal"][data-enabled="true"]{background:#315c49;border-color:#77c79a;color:#fff}
    .mimi-pg-root .note{color:var(--text-secondary,#aeb8c8);margin:8px 0}
    .mimi-pg-root .state{padding:8px;border-radius:5px;background:var(--bg-secondary,#202934)}
    .mimi-pg-root .state[data-mode=paint]{border-left:3px solid #69da9b}
    .mimi-pg-root .status{min-height:48px;margin-top:12px;white-space:pre-wrap}
    </style><h3>程序化绘图 · v1.1.0</h3>
    <button type="button" data-ref="teaching">图块教学 · 山体 / 草地山体 / 道路 / 森林</button>
    <div class="state" data-ref="mode"></div>
    <div class="type-title">类型选择</div>
    <div class="type-row" role="group" aria-label="类型选择">
      <button type="button" data-type="grass">草地</button>
      <button type="button" data-type="mountain">山体</button>
      <button type="button" data-type="grassMountain">草地山地</button>
      <button type="button" data-type="water">水坑</button>
      <button type="button" data-type="sand">道路</button>
      <button type="button" data-type="fence">栅栏</button>
      <button type="button" data-type="forest">森林</button>
    </div>
    <div class="type-divider"></div>
    <label>绘制方式<select data-ref="terrain" aria-label="绘制方式"></select></label>
    <div data-ref="taught-row" style="display:none"><label>教学样式<select data-ref="taught-style" aria-label="教学样式"><option value="default">默认岩山（原样式）</option></select></label><button type="button" data-ref="taught-refresh">刷新教学样式</button><div class="note" data-ref="taught-hint"></div></div>
    <label data-ref="layers-row">山体层数<input data-ref="layers" aria-label="山体层数" type="number" min="2" step="1" value="${multiLayers}"></label>
    <label data-ref="style-row">样式<select data-ref="style" aria-label="道路样式"><option value="brown">棕色沙土</option><option value="yellow">浅黄沙地</option><option value="gray">灰色砂砾</option><option value="city">浅灰城市道路</option></select></label>
    <label>笔刷直径（格）<input data-ref="size" type="number" min="1" max="31" step="1" value="${diameter}"></label>
    <label>笔刷形状<select data-ref="shape"><option value="circle">圆形</option><option value="square">方形</option></select></label>
    <label data-ref="inside-row">栅栏内侧<select data-ref="inside"><option value="right">沿笔迹右侧</option><option value="left">沿笔迹左侧</option></select></label>
    <label data-ref="tile-row"><span data-ref="tile-label">草地图块 ID</span><input data-ref="tile" type="number" min="384" max="32767" step="1" value="${grassTileId}"></label>
    <div class="note" data-ref="target"></div>
    <button data-ref="sample">取样草地</button>
    <button type="button" data-ref="orthogonal" aria-pressed="false">正交绘图：关闭</button>
    <button class="primary" data-ref="paint" aria-pressed="false">启用当前画笔</button>
    <div class="note">按下即显示实际图块，拖动连续更新<br>正交按钮开启后无需按键；关闭时可按住 Shift 临时正交<br>移动两格后锁定水平或垂直方向<br>道路根据邻格自动接边，建议至少 3 格宽<br>栅栏始终 1 格宽；顺时针围边选“右侧”<br>森林可选高松林或圆冠林，支持接续与擦除<br>叠加高台升一级；扩展高台保持原高度<br>下挖从平坦岩面起笔；水坑只在普通草地绘制<br>红色：跳过该格，其余照常绘制<br>松开：提交整笔　Esc：取消预览<br>Ctrl+Z：撤销已提交的一笔</div>
    <div class="status" data-ref="status" role="status"></div>`;
  host.appendChild(root);
  const refs = { root };
  refs.taughtRow=root.querySelector('[data-ref="taught-row"]');refs.taughtStyle=root.querySelector('[data-ref="taught-style"]');refs.taughtRefresh=root.querySelector('[data-ref="taught-refresh"]');refs.taughtHint=root.querySelector('[data-ref="taught-hint"]');
  for (const name of ["mode", "terrain", "layers-row", "layers", "style-row", "style", "size", "shape", "inside-row", "inside", "tile-row", "tile-label", "tile", "target", "sample", "orthogonal", "paint", "status"]) refs[name] = root.querySelector(`[data-ref="${name}"]`);
  refs.types = [...root.querySelectorAll("[data-type]")];
  const categoryFor = value => value === "grass" ? "grass" : value === "water" || value === "eraseWater" ? "water" :
    value === "sand" || value === "eraseSand" ? "sand" : value === "fence" || value === "eraseFence" ? "fence" :
    ["forestPine", "eraseForestPine", "forestRound", "eraseForestRound"].includes(value) ? "forest" :
    ["grassMulti", "grassMountain", "grassUpper", "grassExpand", "grassDig", "grassEraseUpper", "grassErase"].includes(value) ? "grassMountain" : "mountain";
  const choices = {
    grass: [["grass", "绘制草地"]],
    mountain: [["mountain", "单层山体"], ["multi", "多层山体"], ["upper", "叠加高台"], ["expand", "扩展高台"],
      ["dig", "下挖一层"], ["eraseUpper", "擦除高台"], ["erase", "擦除底座"]],
    grassMountain: [["grassMountain", "单层草地山地"], ["grassMulti", "多层山体"], ["grassUpper", "叠加高台"], ["grassExpand", "扩展高台"],
      ["grassDig", "下挖一层"], ["grassEraseUpper", "擦除高台"], ["grassErase", "擦除底座"]],
    water: [["water", "绘制水坑"], ["eraseWater", "擦除水坑"]],
    sand: [["sand", "绘制道路"], ["eraseSand", "擦除道路"]],
    fence: [["fence", "绘制栅栏"], ["eraseFence", "擦除栅栏"]],
    forest: [["forestPine", "绘制高松林"], ["eraseForestPine", "擦除高松林"],
      ["forestRound", "绘制圆冠林"], ["eraseForestRound", "擦除圆冠林"]]
  };
  const remembered = { grass: "grass", mountain: "mountain", grassMountain: "grassMountain", water: "water", sand: "sand", fence: "fence", forest: "forestPine" };
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
    refs["layers-row"].style.display = isMultiTerrain(terrain) ? "grid" : "none";
    refs["style-row"].style.display = category === "sand" ? "grid" : "none";
    refs["inside-row"].style.display = isFence ? "grid" : "none";
    refs.size.closest("label").style.display = isFence ? "none" : "grid";
    refs.shape.closest("label").style.display = isFence ? "none" : "grid";
    refs["tile-row"].style.display = isFence || category === "forest" ? "none" : "grid";
    refs.sample.style.display = isFence || category === "forest" ? "none" : "block";
    refs["tile-label"].textContent = category === "sand" ? "擦除回填 ID" : "草地图块 ID";
    remembered[category] = terrain;
    if(panelRefs===refs)syncTaughtStyles();
  };
  const applyTerrainSettings = () => {
    if (terrain !== "grass" && terrain !== "fence" && terrain !== "eraseFence" && diameter < 3) { diameter = 5; refs.size.value = String(diameter); }
    if (terrain === "dig" || terrain === "grassDig") { shape = "square"; refs.shape.value = "square"; }
  };
  refs.shape.value = shape;
  refs.inside.value = insideSide;
  refs.style.value = roadStyle;
  refs.syncTerrain();
  panelRefs = refs;
  syncTaughtStyles();
  const handlers = [];
  const listen = (el, event, fn) => { el.addEventListener(event, fn); handlers.push(() => el.removeEventListener(event, fn)); };
  listen(refs.taughtStyle,'change',()=>{selectTaughtStyle(refs.taughtStyle.value);syncTaughtStyles();});
  listen(refs.taughtRefresh,'click',()=>{void refreshTaughtStyles(true);});
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
  listen(refs.layers, "input", () => {
    cancelStroke();multiLayers=Number(refs.layers.value);
    status(Number.isSafeInteger(multiLayers)&&multiLayers>=2 ? `连续岩壁设为 ${multiLayers} 层。` : "山体层数请填不小于 2 的整数。");redraw();
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
  listen(refs.orthogonal, "click", () => {
    cancelStroke(); orthogonalMode = !orthogonalMode;
    status(orthogonalMode ? "正交绘图已开启：落笔后沿水平或垂直方向绘制。" : "正交绘图已关闭；按住 Shift 可临时正交绘图。");
    redraw();
  });
  listen(refs.paint, "click", () => {
    cancelStroke();
    if (mode === "paint") { mode = "idle"; hover = null; status("已停止，恢复编辑器原生画笔。"); }
    else { mode = "paint"; targetLayerIndex ??= ctxRef.editor.activeLayerIndex(); status("按下即预览，松开提交整笔。"); }
    redraw();
  });
  listen(root.querySelector('[data-ref="teaching"]'), "click", () => tileTeaching.open());
  status();
  return () => {
    handlers.forEach(fn => fn());
    if (panelRefs === refs) { cancelStroke(); mode = "idle"; hover = null; panelRefs = null; redraw(); }
    root.remove();
  };
}

export function activate(ctx) {
  ctxRef = ctx;
  tileTeaching=createTileTeaching(ctx,(mask,width,height)=>combine([mask],width,height),()=>{cancelStroke();mode="idle";hover=null;status("已进入图块教学，地图画笔已停止。");redraw();},loadNativeTeachingImage,()=>{void refreshTaughtStyles(true);},{Mountain,Surface,Forest,RoundForest,Features,MultiMountain});
  const activation=++hostEpoch;
  hostReady=loadHostBridge(ctx).then(bridge=>{if(activation!==hostEpoch||ctxRef!==ctx)return;hostBridge=bridge;const info=ctx.map.info(ctx.editor.activeMapId());if(info)requestAtlas(info.tilesetId);status("已就绪：原生跨层撤销＋即时图块预览。");redraw();}).catch(error=>{if(activation===hostEpoch&&ctxRef===ctx)report(error);});
  const activeInfo=ctx.map.info(ctx.editor.activeMapId());if(activeInfo)requestAtlas(activeInfo.tilesetId);
  ctx.ui.registerOverlay({ id: `${MOD_ID}.input-surface`, zOrder: 10, render: renderOverlay });
  const onDown = ev => {
    if (mode === "idle" || ev.button !== 0 || ev.isPrimary === false || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const point = mapPointer(ev);
    if (!point) return;
    ownEvent(ev); hover = point;
    try { if (mode === "sample") sampleAt(point); else beginStroke(point, ev.pointerId, ev.shiftKey); }
    catch (error) { report(error); }
  };
  const onMove = ev => {
    if (mode === "idle" || (stroke && ev.pointerId !== stroke.pointerId)) return;
    if (stroke && ((ev.buttons & 1) === 0 || ctx.editor.activeMapId() !== stroke.mapId)) cancelStroke("操作已中断，预览已取消。");
    const point = mapPointer(ev);
    if (stroke) {
      if (!point) { stroke.last = null; stroke.ortho = null; }
      else { ownEvent(ev); try { extendStroke(point, ev.shiftKey); } catch (error) { report(error); } }
    }
    hover = point; redraw();
  };
  const onUp = ev => {
    if (!stroke || ev.pointerId !== stroke.pointerId || (ev.type === "pointerup" && ev.button !== 0)) return;
    if (ev.type === "pointercancel") { cancelStroke("操作已中断，预览已取消。"); return; }
    try {
      const point = mapPointer(ev);
      if (point?.mapId === stroke.mapId) { ownEvent(ev); extendStroke(point, ev.shiftKey); }
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
  ctx.ui.registerContextMenuItem({ context: "map-tile", label: "程序化绘图：取样此格为草地",
    handler(e) { if (e.mapId != null && e.tileX != null && e.tileY != null) sampleAt({ mapId: e.mapId, x: e.tileX, y: e.tileY }); }
  });
  ctx.ui.registerPanel({ id: PANEL_ID, title: "程序化绘图", defaultPosition: "left", defaultSize: { width: 330, height: 680 }, render: renderPanel });
  ctx.ui.openPanel(PANEL_ID); redraw();void refreshTaughtStyles(true);
}
export function deactivate() {
  tileTeaching?.dispose();tileTeaching=null;disposeTaughtStyles();
  inputCleanup?.(); mode = "idle"; hover = null; panelRefs = null; ctxRef = null; atlasCache.clear(); disposeLivePreview();
}

