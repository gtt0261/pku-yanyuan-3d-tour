window.CampusAtlas = function(world,stops,teleport,pose) {
  const d=world.data,by=id=>document.getElementById(id),atlas=by('atlas'),map=by('atlas-map'),mini=by('minimap');
  const types={all:'全部',academic:'教学科研',office:'办公',dining:'餐饮',residence:'宿舍',culture:'文化',sport:'体育',service:'服务',other:'其他'};
  const rows=[],source=window.VENUE_DIRECTORY?.venues||[],extrasById=new Map(),kinds=new Set(Object.keys(types));
  function add(r){r.kind=kinds.has(r.kind)?r.kind:'other';r.aliases=[...new Set((r.aliases||[]).filter(Boolean))];rows.push(r);return r;}
  function pointIn(f){const b=CampusWorld.bounds(f.ring);return[(b.left+b.right)/2,(b.top+b.bottom)/2];}
  function numPt(v){return Number.isFinite(v.x)&&Number.isFinite(v.z);}
  for(const s of stops)add({name:s.name,id:s.id,kind:'culture',aliases:[s.en,...(s.aliases||[])],point:s.target,stop:s});
  for(const v of source){if(v.osmId){if(!extrasById.has(v.osmId))extrasById.set(v.osmId,[]);extrasById.get(v.osmId).push(v);}}
  const landmarkIds=new Set(['w226703926','w240825562','r3249649']);
  for(const b of world.buildings){
    if(landmarkIds.has(b.id))continue;
    const official=(extrasById.get(b.id)||[]).sort((a,b)=>Number(!!a.poi)-Number(!!b.poi)),v=official[0],named=v?.name||b.name;
    const center=pointIn(b);
    add({id:b.id,name:named||('未标名建筑 · '+b.id),kind:v?.kind||b.kind,feature:b,anonymous:!named,point:center,
      aliases:[b.name,...official.flatMap(e=>[e.name,...(e.aliases||[])])]});
    for(const e of official.slice(1)){if(e.name!==named)add({id:b.id+'-'+e.name,name:e.name,kind:e.kind,point:numPt(e)?[e.x,e.z]:center,feature:b,aliases:e.aliases||[]});}
  }
  for(const v of source){
    if(v.osmId&&world.byId.has(v.osmId)||rows.some(r=>r.name===v.name||r.aliases.includes(v.name)))continue;
    add({id:v.name,name:v.name,kind:v.kind,aliases:v.aliases||[],point:numPt(v)?[v.x,v.z]:null});
  }
  for(const f of d.facilities||[]){
    if(rows.some(r=>r.name===f.name||r.aliases.includes(f.name)))continue;
    add({id:f.id,name:f.name,kind:f.kind,point:f.point,feature:world.byId.get(f.buildingId),aliases:[]});
  }
  const collator=new Intl.Collator('zh-Hans-CN',{numeric:true});
  rows.sort((a,b)=>Number(!!b.stop)-Number(!!a.stop)||Number(!!a.anonymous)-Number(!!b.anonymous)||collator.compare(a.name,b.name));
  function makeMap(){
    const bb=world.box,pad=28,w=bb.right-bb.left+pad*2,h=bb.bottom-bb.top+pad*2,left=bb.left-pad,top=bb.top-pad;
    const tex=document.createElement('canvas'),scale=1800/Math.max(w,h);tex.width=Math.ceil(w*scale);tex.height=Math.ceil(h*scale);
    const q=tex.getContext('2d');q.fillStyle='#e3e4d1';q.fillRect(0,0,tex.width,tex.height);q.setTransform(scale,0,0,scale,-left*scale,-top*scale);
    function ring(r){q.moveTo(...r[0]);for(let i=1;i<r.length;i++)q.lineTo(...r[i]);q.closePath();}
    function polygon(f,fill,stroke,sw=1){q.beginPath();ring(f.ring);for(const h of f.holes||[])ring(h);q.fillStyle=fill;q.fill('evenodd');if(stroke){q.strokeStyle=stroke;q.lineWidth=sw;q.stroke();}}
    polygon({ring:d.boundary},'#eae9d6','#929c85',1.3);
    for(const f of d.green)polygon(f,f.kind==='track'?'#ceb495':'#c8cfb0');
    for(const f of d.water)polygon(f,'#91b5ad','#769d96',.8);
    q.lineCap='round';q.lineJoin='round';
    for(const path of d.paths){q.beginPath();q.moveTo(...path.points[0]);for(const p of path.points.slice(1))q.lineTo(...p);q.lineWidth=(path.width||3)+1.2;q.strokeStyle='#c9c6ae';q.stroke();q.strokeStyle='#f9f4dd';q.lineWidth=path.width||3;q.stroke();}
    for(const f of world.buildings)polygon(f,'#c4b99f','#a69c87',.65);
    return {image:tex,left,top,w,h};
  }
  const painted=makeMap();let transform,filter='all',highlight=null;
  function drawMap(canvas,local){
    const state=pose(),rect=canvas.getBoundingClientRect();if(rect.width===0||rect.height===0)return;
    const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(rect.width*dpr),ch=Math.round(rect.height*dpr);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    const q=canvas.getContext('2d'),scale=local?cw/235:Math.min((cw-21*dpr)/painted.w,(ch-17*dpr)/painted.h);
    const cx=local?state.x:(painted.left+painted.w/2),cz=local?state.z:(painted.top+painted.h/2);
    const sx=x=>(x-cx)*scale+cw/2,sy=z=>(z-cz)*scale+ch/2;
    if(!local)transform={cx,cz,cw,ch,scale};
    q.clearRect(0,0,cw,ch);q.fillStyle='#e3e4d1';q.fillRect(0,0,cw,ch);q.drawImage(painted.image,sx(painted.left),sy(painted.top),painted.w*scale,painted.h*scale);
    const px=sx(state.x),py=sy(state.z),a=state.yaw-Math.PI/2;
    q.beginPath();q.moveTo(px,py);q.arc(px,py,(local?24:17)*dpr,a-.55,a+.55);q.closePath();q.fillStyle='#a748383b';q.fill();
    if(!local)for(const stop of stops){
      const x=sx(stop.target[0]),y=sy(stop.target[1]);q.beginPath();q.arc(x,y,3*dpr,0,Math.PI*2);q.fillStyle='#526957';q.fill();
      q.font='600 '+Math.round(dpr*10)+'px "Microsoft YaHei",sans-serif';q.lineWidth=3*dpr;q.strokeStyle='#f7f4de';q.strokeText(stop.name,x+5*dpr,y-4*dpr);q.fillStyle='#3d4e3d';q.fillText(stop.name,x+5*dpr,y-4*dpr);
    }
    if(!local&&highlight?.point){const x=sx(highlight.point[0]),y=sy(highlight.point[1]);q.strokeStyle='#98402f';q.lineWidth=2*dpr;q.beginPath();q.arc(x,y,7*dpr,0,Math.PI*2);q.stroke();}
    q.save();q.translate(px,py);q.rotate(state.yaw);q.beginPath();q.moveTo(0,-6*dpr);q.lineTo(4.5*dpr,4.5*dpr);q.lineTo(0,2.6*dpr);q.lineTo(-4.5*dpr,4.5*dpr);q.closePath();q.lineWidth=2*dpr;q.strokeStyle='#fff9e6';q.stroke();q.fillStyle='#a44635';q.fill();q.restore();
  }
  function choose(row){
    if(!row.point)return;atlas.close();teleport(row);
  }
  const norm=s=>String(s??'').toLowerCase().replace(/\s|[·（）()\-]/g,'');
  function populate(){
    const term=norm(by('search').value),list=by('venue-list');list.replaceChildren();
    const matches=rows.filter(r=>(filter==='all'||r.kind===filter)&&(!term||[r.name,types[r.kind],...(r.kind==='dining'?['食堂','餐厅']:r.kind==='residence'?['寝室','宿舍']:[]),...r.aliases].some(s=>norm(s).includes(term))));
    by('results-head').textContent=matches.length+' 个地点';const fragment=document.createDocumentFragment();
    for(const r of matches){const button=document.createElement('button');button.className='venue';button.disabled=!r.point;
      const name=document.createElement('span');name.textContent=r.name;const kind=document.createElement('small');kind.textContent=r.point?types[r.kind]:'位置待核';
      const arrow=document.createElement('i');arrow.dataset.icon='out';if(r.point)arrow.innerHTML=icon('out');button.append(name,kind,arrow);
      button.onclick=()=>choose(r);button.onmouseenter=button.onfocus=()=>{highlight=r;drawMap(map,false);};fragment.append(button);}
    if(!matches.length){const p=document.createElement('p');p.className='empty';p.textContent='没有匹配地点。可试试楼号、别名或更换类别。';fragment.append(p);}list.append(fragment);list.scrollTop=0;
  }
  for(const key of Object.keys(types)){const b=document.createElement('button');b.textContent=types[key];b.dataset.filter=key;
    b.setAttribute('aria-pressed',String(key==='all'));b.onclick=()=>{filter=key;for(const c of by('filters').children)c.setAttribute('aria-pressed',String(c===b));populate();};by('filters').append(b);}
  by('search').oninput=populate;
  map.onclick=e=>{
    if(!transform)return;const r=map.getBoundingClientRect(),{cx,cz,cw,ch,scale}=transform,x=cx+((e.clientX-r.left)*cw/r.width-cw/2)/scale,z=cz+((e.clientY-r.top)*ch/r.height-ch/2)/scale;
    const hit=rows.find(o=>o.feature&&CampusWorld.contains(x,z,o.feature))||rows.filter(o=>o.point&&Math.hypot(o.point[0]-x,o.point[1]-z)<16).sort((a,b)=>Math.hypot(a.point[0]-x,a.point[1]-z)-Math.hypot(b.point[0]-x,b.point[1]-z))[0];
    if(hit)choose(hit);else if(world.walkable(x,z)){atlas.close();teleport({point:[x,z],name:'校园步道',kind:'road',exact:true});}
  };
  function open(){highlight=null;atlas.showModal();populate();requestAnimationFrame(()=>drawMap(map,false));}
  by('minimap-btn').onclick=open;by('directory-btn').onclick=open;
  by('map-credit').textContent=d.buildings.length+' 个公开建筑轮廓 · '+world.buildings.filter(b=>b.approximate).length+' 个校图补绘体量';
  new ResizeObserver(()=>{if(atlas.open)drawMap(map,false);drawMap(mini,true);}).observe(by('viewport'));
  return {draw(){drawMap(mini,true);if(atlas.open)drawMap(map,false);},rows,open};
};
