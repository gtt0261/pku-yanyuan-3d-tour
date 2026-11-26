(() => {
  'use strict';
  const by=id=>document.getElementById(id),canvas=by('world'),stage=by('viewport');
  const loading=by('loading');let toastTimer;
  if(location.protocol==='file:')by('source-download').hidden=true;
  function message(msg){const t=by('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300);}
  function fullscreen(){
    if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});return;}
    if(document.body.classList.contains('immersive')){document.body.classList.remove('immersive');return;}
    if(!document.documentElement.requestFullscreen){document.body.classList.add('immersive');message('按 Esc 或双击场景退出沉浸视图');return;}
    document.documentElement.requestFullscreen().catch(()=>{document.body.classList.add('immersive');message('双击场景退出沉浸视图');});
  }
  by('full-btn').onclick=fullscreen;canvas.ondblclick=()=>{if(document.body.classList.contains('immersive'))document.body.classList.remove('immersive');};
  by('help-btn').onclick=()=>by('help').showModal();
  for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
  for(const d of document.querySelectorAll('dialog'))d.onclick=e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.hidden=false;loading.textContent='显卡连接已中断，正在恢复场景…';});
  canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
  function start(){
    if(!window.THREE||!window.CAMPUS_DATA||!window.CampusArt)throw Error('校园资源未完整载入，请保留网页旁的所有文件后重新打开。');
    const T=THREE,a=CAMPUS_DATA.anchors;
    T.ColorManagement.legacyMode=false;
    let renderer;
    try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});}
    catch{throw Error('当前浏览器无法启动 WebGL。请开启浏览器的图形加速后重新打开，或使用支持 WebGL 的浏览器。');}
    renderer.outputEncoding=T.sRGBEncoding;renderer.setClearColor(0xc5cfbc);renderer.info.autoReset=true;
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.14,3800);camera.rotation.order='YXZ';
    const world=CampusWorld.create(scene,CAMPUS_DATA,window.VENUE_DIRECTORY),atmosphere=CampusSkyWater(renderer,scene,camera,world);
    const state={x:a.lakeView[0],z:a.lakeView[1],yaw:0,pitch:0,bike:false,night:false,mode:'free',quality:'high'};
    const stops=[
      {id:'lake',name:'未名湖',en:'Weiming Lake',district:'湖区',target:a.lake,spot:a.lakeView,aim:[a.tower[0],12,a.tower[1]],offset:-.105},
      {id:'tower',name:'博雅塔',en:'Boya Pagoda',district:'湖区东南岸',target:a.tower,spot:[a.tower[0]+25,a.tower[1]+41],aim:[a.tower[0],16,a.tower[1]],offset:-.015},
      {id:'gate',name:'西校门',en:'West Gate',district:'校友门',aliases:['西门','北大西门','校友门'],target:a.westGate,spot:[a.westGate[0]-28,a.westGate[1]-3],aim:[a.westGate[0],3.1,a.westGate[1]],offset:-.025},
      {id:'library',name:'图书馆',en:'University Library',district:'图书馆东侧',aliases:['北京大学图书馆','北大图书馆'],target:a.library,spot:[world.lb.right+39,a.library[1]-14],aim:[world.lb.right-17,12,a.library[1]+1],offset:0,fov:52}
    ];
    let selected='',lastLabel=null,dayTime=0,speed=0,actualSpeed=0,bob=0,screenStick=[0,0],frameTotal=0,frameStart=0,lastAtlas=-1,lastHUD=-1;
    const keyboard=new Set(),rider=world.rideModel;
    scene.add(rider);rider.visible=false;
    function pressed(id,value){by(id).setAttribute('aria-pressed',String(value));}
    function label(info){
      if(lastLabel===info)return;lastLabel=info;by('current-name').textContent=info.name;by('current-en').textContent=info.en;by('district').textContent=info.district;
      if(state.mode==='free'){camera.fov=Math.max(camera.aspect<1.12?52:38,info.fov||0);camera.updateProjectionMatrix();}
      by('current-name').classList.toggle('long-name',info.name.length>8);
      for(const button of by('postcards').children){const active=button.dataset.id===info.id;button.setAttribute('aria-pressed',String(active));button.querySelector('.card-arrow').innerHTML=icon(active?'check':'out');}
    }
    function align(spot,aim,offset=0){
      const p=world.safe(...spot);state.x=p[0];state.z=p[1];state.yaw=Math.atan2(aim[0]-p[0],p[1]-aim[2])+offset;
      state.pitch=Math.atan2(aim[1]-(state.bike?1.54:1.86),Math.hypot(aim[0]-p[0],aim[2]-p[1]));speed=0;bob=0;
    }
    function visit(stop){if(state.mode==='tour')endTour(false);align(stop.spot,stop.aim,stop.offset);selected=stop.id;label(stop);applyPose();atlas?.draw();}
    function setNight(v){state.night=v;pressed('day',!v);pressed('night',v);document.body.dataset.time=v?'night':'day';atmosphere.setNight(v);}
    function ride(value,notify=true){
      if(state.mode==='tour')endTour(true);if(state.bike===value)return;
      if(value){const parked=world.takeBike(state.x,state.z);if(!parked){message('附近暂时没有停放的单车');return;}[state.x,state.z]=world.safe(parked[0],parked[1]);}
      else world.leaveBike(state.x,state.z,state.yaw);
      state.bike=value;speed=actualSpeed=0;rider.visible=value;pressed('walk',!value);pressed('bike',value);
      by('mode-label').textContent=value?'自由骑行':'自由探索';by('ride-speed').hidden=!value;by('ride-speed').textContent='0 km/h';
      if(notify)message(value?'已在最近的取车点上车 · 按 E 还车':'单车已停在身旁，继续步行');applyPose();atlas.draw();
    }
    by('day').onclick=()=>setNight(false);by('night').onclick=()=>setNight(true);
    by('walk').onclick=()=>ride(false);by('bike').onclick=()=>ride(true);
    for(const s of stops){const b=document.createElement('button');b.className='postcard';b.dataset.id=s.id;b.title='前往'+s.name;
      const c=document.createElement('canvas');c.className='card-art';c.setAttribute('aria-hidden','true');paintPostcard(c,s.id);
      const words=document.createElement('span'),title=document.createElement('strong'),en=document.createElement('small');title.textContent=s.name;en.textContent=s.en;en.lang='en';words.append(title,en);
      const ar=document.createElement('i');ar.dataset.icon='out';ar.className='card-arrow';ar.innerHTML=icon('out');b.append(c,words,ar);b.onclick=()=>visit(s);by('postcards').append(b);}
    let atlas;
    const translations={academic:['教学科研区','ACADEMIC BUILDING'],office:['办公区','ADMINISTRATION'],residence:['生活区','CAMPUS RESIDENCES'],dining:['生活区','CAMPUS DINING'],sport:['体育区','SPORTS GROUNDS'],culture:['文化区','CAMPUS LANDMARK'],service:['校园服务','CAMPUS SERVICES'],road:['燕园步道','CAMPUS WALK'],other:['校园建筑','CAMPUS BUILDING']};
    function toVenue(row){
      if(row.stop){visit(row.stop);return;}if(state.mode==='tour')endTour(false);
      const [x,z]=row.point;
      if(row.exact){state.x=x;state.z=z;state.pitch=.01;speed=0;}
      else{
        const bb=row.feature?CampusWorld.bounds(row.feature.ring):{left:x-3,right:x+3,top:z-3,bottom:z+3};
        const choices=[[bb.right+8,z],[x,bb.bottom+9],[bb.left-9,z],[x,bb.top-8]].map(p=>world.safe(...p,45));
        const best=choices.find(p=>world.road(...p,4))||choices.sort((p,q)=>Math.hypot(p[0]-x,p[1]-z)-Math.hypot(q[0]-x,q[1]-z))[0];
        align(best,[x,Math.max(2.5,Math.min(9,(row.feature?.renderHeight||8)*.4)),z]);
      }
      const tr=translations[row.kind]||translations.other;selected={name:row.name,en:tr[1],district:tr[0],from:[state.x,state.z]};label(selected);applyPose();atlas.draw();
    }
    atlas=CampusAtlas(world,stops,toVenue,()=>({x:state.mode==='tour'?camera.position.x:state.x,z:state.mode==='tour'?camera.position.z:state.z,yaw:state.mode==='tour'?-camera.rotation.y:state.yaw}));
    function applyPose(){
      const h=world.groundLevel(state.x,state.z)+(state.bike?1.54:1.86),walkBob=state.bike?0:Math.sin(bob)*Math.min(1,Math.abs(speed)/4)*.023;
      camera.position.set(state.x,h+walkBob,state.z);camera.rotation.set(state.pitch,-state.yaw,0,'YXZ');
      rider.visible=state.bike;rider.position.set(state.x+Math.sin(state.yaw)*.42,h-1.54,state.z-Math.cos(state.yaw)*.42);rider.rotation.y=Math.PI-state.yaw;
    }
    function freeStep(dt){
      const fromX=state.x,fromZ=state.z;
      if(keyboard.has('ArrowLeft'))state.yaw-=dt*1.28;if(keyboard.has('ArrowRight'))state.yaw+=dt*1.28;
      let side=(+keyboard.has('KeyD')-+keyboard.has('KeyA'))+screenStick[0],ahead=(+(keyboard.has('KeyW')||keyboard.has('ArrowUp'))-+(keyboard.has('KeyS')||keyboard.has('ArrowDown')))-screenStick[1];
      const len=Math.hypot(side,ahead);if(len>1){side/=len;ahead/=len;}
      const shift=keyboard.has('ShiftLeft')||keyboard.has('ShiftRight'),v=state.bike?(shift?10:6.8):(shift?4.1:2.25);
      speed+=((len>.01?v:0)-speed)*Math.min(1,dt*(state.bike?4:12));bob+=dt*speed*2.1;
      if(len>.01){
        const dx=(Math.sin(state.yaw)*ahead+Math.cos(state.yaw)*side)*speed*dt,dz=(-Math.cos(state.yaw)*ahead+Math.sin(state.yaw)*side)*speed*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.45));
        for(let i=0;i<steps;i++){
          if(world.walkable(state.x+dx/steps,state.z)&&world.walkable(state.x+dx/steps+Math.sign(dx)*.21,state.z))state.x+=dx/steps;
          if(world.walkable(state.x,state.z+dz/steps)&&world.walkable(state.x,state.z+dz/steps+Math.sign(dz)*.21))state.z+=dz/steps;
        }
      }actualSpeed=dt>0?Math.hypot(state.x-fromX,state.z-fromZ)/dt:0;applyPose();
    }
    function nearby(){
      if(typeof selected==='object'&&Math.hypot(state.x-selected.from[0],state.z-selected.from[1])<32)return label(selected);
      const candidate=stops.find(s=>s.id===selected),dist=s=>Math.hypot(s.spot[0]-state.x,s.spot[1]-state.z);
      if(candidate&&dist(candidate)<40)return label(candidate);
      const close=stops.filter(s=>dist(s)<25).sort((u,v)=>dist(u)-dist(v))[0];if(close){selected=close.id;return label(close);}
      const street=world.road(state.x,state.z);
      const info=world.data.paths.find(p=>p.name&&p.kind===street?.kind&&p.points.some(q=>Math.hypot(q[0]-state.x,q[1]-state.z)<11));
      if(lastLabel?.id==='walking'&&lastLabel.name===(info?.name||'燕园步道'))return;
      label({id:'walking',name:info?.name||'燕园步道',en:'YANYUAN CAMPUS',district:state.bike?'骑行中':'步行中'});
    }
    let tourStart=0,previousPose=null;
    const wp=(xz,y,dx=0,dz=0)=>new T.Vector3(xz[0]+dx,y,xz[1]+dz),g=a.westGate,l=a.library,t=a.tower,v=a.lakeView;
    const views=[wp(g,6,-28,-2),wp(g,27,13,55),wp(l,82,-158,80),wp(l,62,54,65),wp(t,62,69,63),wp(t,48,-35,-73),wp(v,13,56,-15),wp(v,1.86)];
    const looks=[wp(g,3),wp(g,4,26,9),wp(l,13,-33,0),wp(l,12),wp(t,19),wp(t,20),wp(t,15),wp(t,12)];
    const curve=new T.CatmullRomCurve3(views,false,'centripetal'),lookCurve=new T.CatmullRomCurve3(looks,false,'centripetal');
    function tourUI(on){
      by('tour').querySelector('i').innerHTML=icon(on?'stop':'play');by('tour').querySelector('span').textContent=on?'结束导览':'自动导览';
      by('tour').querySelector('small').textContent='15s';by('tour').setAttribute('aria-pressed',String(on));by('tour-progress').hidden=!on;
      by('mode-label').textContent=on?'自动导览':state.bike?'自由骑行':'自由探索';by('ride-speed').hidden=on||!state.bike;
    }
    function beginTour(){
      if(state.mode==='tour'){endTour(true);return;}previousPose={x:state.x,z:state.z,yaw:state.yaw,pitch:state.pitch};state.mode='tour';rider.visible=false;
      keyboard.clear();screenStick=[0,0];tourStart=performance.now();tourUI(true);tourFrame(tourStart);
    }
    function endTour(restore){
      if(state.mode!=='tour')return;state.mode='free';tourUI(false);speed=0;
      if(restore&&previousPose)Object.assign(state,previousPose);else {align(stops[0].spot,stops[0].aim,stops[0].offset);selected='lake';}
      applyPose();nearby();atlas.draw();
    }
    const pos=new T.Vector3(),aim=new T.Vector3();
    function tourFrame(now){
      const u=Math.min(1,Math.max(0,(now-tourStart)/15000));if(u===1){endTour(false);return;}
      const f=u*u*(3-2*u);curve.getPoint(f,pos);lookCurve.getPoint(f,aim);camera.position.copy(pos);camera.lookAt(aim);
      const stop=stops[f<.235?2:f<.54?3:f<.83?1:0];label(stop);by('tour-progress').firstElementChild.style.width=(u*100)+'%';by('tour').querySelector('small').textContent=Math.ceil(15*(1-u))+'s';
    }
    by('tour').onclick=beginTour;
    function setQuality(q){
      state.quality=q;const rect=stage.getBoundingClientRect(),width=Math.max(2,Math.round(rect.width)),height=Math.max(2,Math.round(rect.height)),dpr=window.devicePixelRatio||1;
      renderer.setPixelRatio(q==='high'?Math.min(dpr,1.6):q==='medium'?Math.min(dpr,1.05):Math.min(dpr,.72));renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.fov=Math.max(camera.aspect<1.12?52:38,state.mode==='free'&&lastLabel?.fov||0);camera.updateProjectionMatrix();atmosphere.resize(q,width,height);world.setQuality(q);by('quality').value=q;
    }
    by('quality').onchange=e=>setQuality(e.target.value);new ResizeObserver(()=>setQuality(state.quality)).observe(stage);
    const bindings=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight']);
    window.addEventListener('keydown',e=>{
      if(document.querySelector('dialog[open]')||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
      if(e.code==='Escape'){if(state.mode==='tour')endTour(true);document.body.classList.remove('immersive');return;}
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.code==='KeyE'&&!e.repeat){e.preventDefault();ride(!state.bike);return;}
      if(bindings.has(e.code)){e.preventDefault();if(state.mode==='tour')endTour(true);keyboard.add(e.code);}
    });
    window.addEventListener('keyup',e=>keyboard.delete(e.code));window.addEventListener('blur',()=>{keyboard.clear();screenStick=[0,0];});
    let drag=null;
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;
      if(state.mode==='tour')endTour(true);canvas.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;
      state.yaw-=(e.clientX-drag.x)*.0042;state.pitch=Math.max(-1.18,Math.min(1.28,state.pitch+(e.clientY-drag.y)*.0034));drag.x=e.clientX;drag.y=e.clientY;});
    canvas.addEventListener('lostpointercapture',()=>drag=null);
    const pad=by('touch-pad');let activeStick=null;
    function stick(e){const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,lim=r.width*.32,k=Math.max(lim,Math.hypot(dx,dy));
      screenStick=[dx/k,dy/k];pad.firstElementChild.style.transform='translate('+screenStick[0]*lim+'px,'+screenStick[1]*lim+'px)';}
    pad.onpointerdown=e=>{if(activeStick!==null)return;if(state.mode==='tour')endTour(true);activeStick=e.pointerId;pad.setPointerCapture(activeStick);stick(e);};
    pad.onpointermove=e=>{if(e.pointerId===activeStick)stick(e);};pad.onlostpointercapture=()=>{activeStick=null;screenStick=[0,0];pad.firstElementChild.style.transform='';};
    for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{keyboard.clear();});
    const compass=by('compass-row'),ticks=[];
    for(let i=-8;i<=8;i++){const s=document.createElement('span');ticks.push(s);compass.append(s);}
    function compassAt(radians){const degrees=((radians*180/Math.PI)%360+360)%360,step=7.5,first=Math.round(degrees/step),names=['N','NE','E','SE','S','SW','W','NW'];
      ticks.forEach((el,i)=>{const tick=first+i-8,v=((tick*step%360)+360)%360;el.style.left=(50+(tick*step-degrees)*.93)+'%';el.textContent=v%45===0?names[v/45]:'';el.className=v%45===0?'':'minor';});}
    let last=0;
    function loop(now){
      requestAnimationFrame(loop);if(document.hidden||renderer.getContext().isContextLost())return;
      if(!frameStart)frameStart=now;const dt=last?Math.min(.075,(now-last)/1000):0;last=now;
      if(state.mode==='tour')tourFrame(now);else if(!document.querySelector('dialog[open]'))freeStep(dt);dayTime+=dt;
      atmosphere.render(dayTime);frameTotal++;
      if(now-frameStart>=700){by('fps').textContent=String(Math.round(frameTotal*1000/(now-frameStart)));frameTotal=0;frameStart=now;}
      if(now-lastHUD>85){compassAt(state.mode==='tour'?-camera.rotation.y:state.yaw);if(state.mode==='free'){nearby();if(state.bike)by('ride-speed').textContent=Math.round(actualSpeed*3.6)+' km/h';}lastHUD=now;}
      if(now-lastAtlas>180){atlas.draw();lastAtlas=now;}
    }
    let hiddenSince=0;
    document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenSince=performance.now();keyboard.clear();screenStick=[0,0];}else{if(hiddenSince&&state.mode==='tour')tourStart+=performance.now()-hiddenSince;hiddenSince=0;frameStart=0;frameTotal=0;last=0;}});
    setQuality(matchMedia('(pointer:coarse)').matches?'medium':'high');setNight(false);visit(stops[0]);loading.hidden=true;
    // Expose read-only measurements for the portable smoke test and graphics diagnostics.
    window.campusStatus=()=>({mode:state.mode,bike:state.bike,night:state.night,quality:state.quality,position:[state.x,state.z],yaw:state.yaw,pitch:state.pitch,
      camera:camera.position.toArray(),mirror:atmosphere.mirror.position.toArray(),waterY:CampusWorld.waterY,buildings:world.buildings.length,venues:atlas.rows.length,parkedBikes:world.parked.length,
      drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,towerEmission:Math.max(0,...world.tower.children.map(m=>m.material.emissiveIntensity||0).filter((v,i)=>world.tower.children[i].material.emissive?.getHex()>0))});
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(async()=>{try{await CampusFlora.prepare();start();}catch(e){console.error(e);loading.hidden=false;loading.textContent=e.message||'三维场景未能载入，请刷新后重试。';}});
})();
