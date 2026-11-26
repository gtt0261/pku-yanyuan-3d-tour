/* Campus coordinates are metres, east +X and south +Z. */
window.CampusWorld = (() => {
  const T=THREE, tau=Math.PI*2, waterY=.03;
  const A=window.CAMPUS_DATA?.anchors;
  function bounds(ring){
    const xs=ring.map(p=>p[0]), zs=ring.map(p=>p[1]);
    return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...zs),bottom:Math.max(...zs)};
  }
  function inside(x,z,ring){
    let hit=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function contains(x,z,f){return inside(x,z,f.ring)&&!(f.holes||[]).some(h=>inside(x,z,h));}
  function segment(x,z,a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
  }
  function spatial(items,boxMaker) {
    const bins=new Map(),step=40,idx=n=>Math.floor(n/step);
    for(const item of items){
      const box=boxMaker(item);
      for(let i=idx(box.left);i<=idx(box.right);i++)for(let j=idx(box.top);j<=idx(box.bottom);j++){
        const k=i+','+j;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(item);
      }
    }
    return (x,z)=>bins.get(idx(x)+','+idx(z))||[];
  }
  function coordinates(shape){return [shape.ring,...(shape.holes||[])].map(r=>r.map(p=>new T.Vector2(p[0],-p[1])));}
  function planar(shape){
    const rings=coordinates(shape),s=new T.Shape(rings[0]);
    for(const h of rings.slice(1))s.holes.push(new T.Path(h));
    const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);return g;
  }
  function addBoxInstances(scene,items,geometry,material){
    if(!items.length)return null;
    const m=new T.InstancedMesh(geometry,material,items.length),o=new T.Object3D();
    items.forEach((v,i)=>{o.position.set(v[0],v[1],v[2]);o.scale.set(v[3],v[4],v[5]);o.rotation.set(v[7]||0,v[6]||0,v[8]||0);o.updateMatrix();m.setMatrixAt(i,o.matrix);if(v[9]!=null)m.setColorAt(i,new T.Color(v[9]));});
    m.computeBoundingSphere?.();scene.add(m);return m;
  }
  function createGeometry(data){
    if(!data.p.length)return new T.BufferGeometry();
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.p,3));g.setAttribute('color',new T.Float32BufferAttribute(data.c,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.computeVertexNormals();g.computeBoundingSphere();return g;
  }
  function tri(data,pts,uvs,color){
    for(let i=0;i<3;i++){data.p.push(...pts[i]);data.uv.push(...uvs[i]);data.c.push(color.r,color.g,color.b);}
  }
  function addRoof(data,f,height,color){
    const rings=coordinates(f),flat=rings.flat(),indices=T.ShapeUtils.triangulateShape(rings[0],rings.slice(1));
    for(const face of indices){const q=face.map(i=>flat[i]);tri(data,q.map(v=>[v.x,height,-v.y]),q.map(v=>[v.x*.25,v.y*.25]),color);}
  }
  function pitchedRoof(data,b,eave,top,color){
    const rings=[b.ring,...(b.holes||[])],edges=rings.flatMap(r=>r.map((p,i)=>[p,r[(i+1)%r.length]]));
    const coords=coordinates(b),flat=coords.flat(),faces=T.ShapeUtils.triangulateShape(coords[0],coords.slice(1));
    const bb=bounds(b.ring),short=Math.min(bb.right-bb.left,bb.bottom-bb.top),rise=top-eave;
    const steps=Math.min(11,Math.max(3,Math.ceil(Math.hypot(bb.right-bb.left,bb.bottom-bb.top)/5)));
    function sample(u,v,a,b,c){
      const x=a.x+(b.x-a.x)*u+(c.x-a.x)*v,z=-(a.y+(b.y-a.y)*u+(c.y-a.y)*v);
      let edgeDist=Infinity;for(const [p,q] of edges)edgeDist=Math.min(edgeDist,segment(x,z,p,q));
      return [x,eave+rise*Math.pow(Math.min(1,edgeDist/Math.max(1,short*.42)),1.17),z];
    }
    function panel(a,b,c){tri(data,[a,b,c],[a,b,c].map(v=>[v[0]*.135,v[2]*.135]),color);}
    for(const f of faces){const [a,b,c]=f.map(i=>flat[i]),rows=[];
      for(let i=0;i<=steps;i++){const row=[];for(let j=0;j<=steps-i;j++)row.push(sample(i/steps,j/steps,a,b,c));rows.push(row);}
      for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){panel(rows[i][j],rows[i+1][j],rows[i][j+1]);if(j<steps-i-1)panel(rows[i+1][j],rows[i+1][j+1],rows[i][j+1]);}
    }
  }
  function tileTexture(){
    const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),r=CampusFlora.random(571);
    q.fillStyle='#e1e1dc';q.fillRect(0,0,128,128);
    for(let x=0;x<128;x+=6.4){q.fillStyle='#ababaa';q.fillRect(x,0,1.7,128);q.fillStyle='#f7f6ee';q.fillRect(x+1.8,0,1.6,128);
      for(let y=r()*9;y<128;y+=9){q.fillStyle='#8e918f88';q.fillRect(x,y,6.4,1.1);}}
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;
  }
  function facadeTexture(night,emission=false,heritage=false){
    const c=document.createElement('canvas');c.width=256;c.height=128;const q=c.getContext('2d'),r=CampusFlora.random(51);
    q.fillStyle=emission?'#000':'#e8e1d4';q.fillRect(0,0,256,128);
    for(let row=0;row<2;row++)for(let col=0;col<4;col++){
      const x=col*64,y=row*64,lit=(row*5+col*3)%7<4;
      if(!emission){
        for(let i=0;i<4;i++){q.fillStyle='rgba(118,95,75,.17)';q.fillRect(x,y+i*15,64,1);}
        q.fillStyle='#b2a594';q.fillRect(x+7,y+10,49,40);q.fillStyle='#f1e9d5';q.fillRect(x+8,y+47,49,3);
      }
      const grd=q.createLinearGradient(0,y+10,0,y+49);grd.addColorStop(0,night&&lit?'#e2ab65':emission?'#000':'#849899');grd.addColorStop(1,night&&lit?'#ffdda1':emission?'#000':'#586d70');
      q.fillStyle=grd;q.fillRect(x+10,y+12,43,32);q.fillStyle=emission?'#000':'#cbc5b7';q.fillRect(x+30,y+12,2,32);q.fillRect(x+10,y+21,43,2);
      if(heritage){
        q.strokeStyle=emission?'#000':'#62483f';q.lineWidth=2.3;q.strokeRect(x+10,y+12,43,32);
        q.fillStyle=emission?'#000':'#715248';for(let k=1;k<=4;k++)q.fillRect(x+10+k*8.45,y+12,1.6,33);
        for(let k=1;k<3;k++)q.fillRect(x+10,y+12+k*10.8,43,1.5);
        q.fillStyle=emission?'#000':'#a68c70';q.fillRect(x+5,y+47,51,2.3);
      }
    }
    if(!emission)for(let i=0;i<2600;i++){q.fillStyle=r()>.5?'#64583f0b':'#ffffff0d';q.fillRect(r()*256,r()*128,1+r()*2,1);}
    const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.encoding=T.sRGBEncoding;tex.anisotropy=4;return tex;
  }
  function create(scene,data,extras){
    const boundary=data.boundary,box=bounds(boundary),rand=CampusFlora.random(73511);
    // PKU records the tower on a low hill. Its profile is an approximation, with a level foundation.
    function hill(x,z){const u=Math.max(0,Math.min(1,(Math.hypot((x-A.tower[0])*.94,z-A.tower[1])-7)/28));return 3.35*(1-u*u*(3-2*u));}
    const buildings=data.buildings.map(b=>({...b})),byId=new Map(buildings.map(b=>[b.id,b]));
    for(const v of extras?.venues||[]){
      if(v.osmId&&byId.has(v.osmId)){const b=byId.get(v.osmId);if(!v.poi){if(!b.name)b.name=v.name;if(v.kind)b.kind=v.kind;}continue;}
      if(!v.model||!Number.isFinite(v.x)||!Number.isFinite(v.z))continue;
      const {width,depth,angle=0}=v.model;if(!(width>0&&depth>0)||buildings.some(b=>contains(v.x,v.z,b)))continue;
      const rad=angle*Math.PI/180,ring=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>[v.x+i*width/2*Math.cos(rad)-j*depth/2*Math.sin(rad),v.z+i*width/2*Math.sin(rad)+j*depth/2*Math.cos(rad)]);
      const b={id:'venue-'+v.name,name:v.name,kind:v.kind,ring,height:v.model.height,roof:'gabled',approximate:true};buildings.push(b);byId.set(b.id,b);
    }
    const specialIds=new Set(['w226703926','w240825562','w272349096']);
    const allWater=data.water,positionIndex=spatial(buildings,f=>bounds(f.ring)),waterIndex=spatial(allWater,f=>bounds(f.ring));
    const lines=[];
    for(const path of data.paths)for(let i=1;i<path.points.length;i++)lines.push({a:path.points[i-1],b:path.points[i],w:path.width||3,bridge:!!path.bridge,kind:path.kind});
    const lineIndex=spatial(lines,v=>({left:Math.min(v.a[0],v.b[0])-v.w-3,right:Math.max(v.a[0],v.b[0])+v.w+3,top:Math.min(v.a[1],v.b[1])-v.w-3,bottom:Math.max(v.a[1],v.b[1])+v.w+3}));
    const wet=(x,z)=>waterIndex(x,z).some(f=>contains(x,z,f));
    const road=(x,z,extra=0)=>lineIndex(x,z).find(v=>segment(x,z,v.a,v.b)<v.w*.5+extra);
    const blocked=(x,z)=>positionIndex(x,z).find(f=>!['w226703926','w272349096'].includes(f.id)&&contains(x,z,f));
    const playArea=(x,z)=>inside(x,z,boundary)||Math.hypot(x-A.westGate[0],z-A.westGate[1])<34;
    function walkable(x,z){
      if(!playArea(x,z)||blocked(x,z))return false;
      return !wet(x,z)||lineIndex(x,z).some(v=>v.bridge&&segment(x,z,v.a,v.b)<v.w*.52)||data.surfaces?.some(f=>contains(x,z,f));
    }
    function safe(x,z,radius=110){
      if(walkable(x,z))return [x,z];
      for(let d=1;d<=radius;d+=2)for(let i=0;i<32;i++){const a=i*tau/32,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;if(walkable(px,pz))return[px,pz];}
      return A.lakeView.slice();
    }
    const walls={p:[],uv:[],c:[]},oldWalls={p:[],uv:[],c:[]},tiles={p:[],uv:[],c:[]},roofs={p:[],uv:[],c:[]},trim={p:[],uv:[],c:[]};
    const palette={academic:['#d4beb2','#efe1c7','#c5b5a4'],office:['#e7d5bc','#d3c1af'],dining:['#d8b398','#e2ccb0'],residence:['#d3a58d','#d4b59a','#dbba9e'],culture:['#e1cdb1','#c7aa93'],sport:['#cbcac1','#d8c9b2'],service:['#cfbea4'],other:['#d2bfa6','#ccad95','#ded5bf']};
    const zeroUV=[[0,0],[1,0],[1,1]],roofBoxes=[];
    for(const b of buildings){
      if(specialIds.has(b.id))continue;
      const bb=bounds(b.ring),dim=Math.min(bb.right-bb.left,bb.bottom-bb.top);
      const defaults={residence:5,academic:4,office:4,dining:2,sport:3,culture:2,other:dim<9?1:3};
      const old=/静园|临湖轩|斋$|燕南园|朗润园|南北阁|贝公楼|慈济寺|第一体育馆|办公楼$/.test(b.name)||b.roof==='hipped-and-gabled';
      const height=b.id==='r3249649'?10.2:Math.max(2.5,Math.min(95,Number(b.height)||((Number(b.levels)||(old?2:defaults[b.kind]||3))*3.35)));
      b.renderHeight=height;
      const choices=palette[b.kind]||palette.other,c=new T.Color(b.wallColor||choices[Math.floor(rand()*choices.length)]),roof=new T.Color(b.roofColor||(old?'#53645c':rand()>.6?'#827d74':'#777e77'));
      const pitched=b.id!=='r3249649'&&(old||b.roof&&b.roof!=='flat');
      const eave=pitched?height-Math.min(dim*.20,6,height*.34):height;
      const base=dim<8||b.kind==='ruins'?.18:.70,wallColor=old&&!b.wallColor?new T.Color('#e5d7c2'):c,wallBatch=old?oldWalls:walls;
      for(const ring of [b.ring,...(b.holes||[])]){
        for(let j=0;j<ring.length;j++){
          const p=ring[j],q=ring[(j+1)%ring.length],len=Math.hypot(q[0]-p[0],q[1]-p[1]);if(len<.04)continue;
          const u=Math.max(.25,Math.round(len/3.35)/4),v=Math.max(.5,(eave-base)/6.7);
          const a=[p[0],base,p[1]],bb=[q[0],base,q[1]],c1=[q[0],eave,q[1]],d=[p[0],eave,p[1]];
          tri(wallBatch,[a,bb,c1],[[0,0],[u,0],[u,v]],wallColor);tri(wallBatch,[a,c1,d],[[0,0],[u,v],[0,v]],wallColor);
          const aa=[p[0],-.12,p[1]],bbb=[q[0],-.12,q[1]],basalt=new T.Color('#868a7c');
          tri(trim,[aa,bbb,bb],zeroUV,basalt);tri(trim,[aa,bb,a],zeroUV,basalt);
        }
      }
      if(pitched)pitchedRoof(tiles,b,eave,height,new T.Color(b.roofColor||'#636d6a'));else addRoof(roofs,b,height,roof);
      if(!pitched&&dim>18&&b.id!=='r3249649'){
        const x=(bb.left+bb.right)/2,z=(bb.top+bb.bottom)/2;if(contains(x,z,b))roofBoxes.push([x,height+.65,z,3.2,1.3,2.5,0,0,0,'#b4b4a3']);
      }
    }
    const dayWindows=facadeTexture(false),nightWindows=facadeTexture(true),glow=facadeTexture(true,true);
    const facade=new T.MeshLambertMaterial({map:dayWindows,vertexColors:true,side:T.DoubleSide,emissive:0xffffff,emissiveMap:glow,emissiveIntensity:0});
    const oldDay=facadeTexture(false,false,true),oldNight=facadeTexture(true,false,true),oldFacade=facade.clone();oldFacade.map=oldDay;oldFacade.emissiveMap=facadeTexture(true,true,true);
    scene.add(new T.Mesh(createGeometry(oldWalls),oldFacade),new T.Mesh(createGeometry(tiles),new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,map:tileTexture()})));
    scene.add(new T.Mesh(createGeometry(walls),facade));const roofMat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
    scene.add(new T.Mesh(createGeometry(roofs),roofMat),new T.Mesh(createGeometry(trim),roofMat));addBoxInstances(scene,roofBoxes,new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial());
    const art=window.CampusArt,tower=art.tower();tower.position.set(A.tower[0],hill(...A.tower)-.08,A.tower[1]);scene.add(tower);
    function landmark(object,position,rotation=0){object.position.set(position[0],-.08,position[1]);object.rotation.y=rotation;scene.add(object);return object;}
    landmark(art.gate(),A.westGate,-Math.PI*.53);landmark(art.pavilion(),A.pavilion,.15);
    const lb=bounds(byId.get('r3249649').ring);landmark(art.library(),[lb.right-27.5,A.library[1]],Math.PI*.50);
    const bikeLocations=[...data.bikeParking,A.lakeView.map((v,i)=>v+(i===0?-7:5)),[A.westGate[0]+14,A.westGate[1]+12]];
    const shared=art.bicycle(),bikeGeo=shared.children[0],parked=[];
    for(const [x,z] of bikeLocations){for(let i=0;i<3;i++){const p=safe(x+i*.82,z,12);if(Math.hypot(p[0]-x,p[1]-z)<9)parked.push([p[0],p[1],.3+(i%2)*.06]);}}
    const bikes=new T.InstancedMesh(bikeGeo.geometry,bikeGeo.material,Math.max(1,parked.length)),dummy=new T.Object3D();
    bikes.count=0;bikes.frustumCulled=false;scene.add(bikes);
    let bikeCenter=[Infinity,Infinity],bikeTier='';
    function takeBike(x,z){if(!parked.length)return null;let nearest=0;
      for(let i=1;i<parked.length;i++)if(Math.hypot(parked[i][0]-x,parked[i][1]-z)<Math.hypot(parked[nearest][0]-x,parked[nearest][1]-z))nearest=i;
      bikeCenter=[Infinity,Infinity];return parked.splice(nearest,1)[0];}
    function leaveBike(x,z,yaw){const p=safe(x+.66*Math.cos(yaw),z+.66*Math.sin(yaw),5);parked.push([p[0],p[1],Math.PI-yaw]);bikeCenter=[Infinity,Infinity];}
    function updateNearby(x,z,level){if(bikeTier===level&&Math.hypot(x-bikeCenter[0],z-bikeCenter[1])<6)return;
      bikeTier=level;bikeCenter=[x,z];let n=0;const limit=level==='low'?48:level==='medium'?70:98;
      for(const [bx,bz,a] of parked)if(Math.hypot(x-bx,z-bz)<limit){dummy.position.set(bx,hill(bx,bz)-.04,bz);dummy.rotation.y=a;dummy.updateMatrix();bikes.setMatrixAt(n++,dummy.matrix);}
      bikes.count=n;bikes.instanceMatrix.needsUpdate=true;}
    const trees=[],clearShots=[
      [A.lakeView,A.tower,6],[A.northLakeView,A.tower,5],[[A.tower[0]-42,A.tower[1]+24],A.tower,5],
      [[A.westGate[0]-29,A.westGate[1]-3],A.westGate,8],[[lb.right+39,A.library[1]-14],[lb.right-12,A.library[1]],19]
    ];
    const sportsIndex=spatial(data.green.filter(f=>['track','pitch'].includes(f.kind)),f=>bounds(f.ring));
    const treeAt=(x,z,h,type)=>{
      if(!playArea(x,z)||wet(x,z)||blocked(x,z)||road(x,z,.55)||sportsIndex(x,z).some(f=>contains(x,z,f))||clearShots.some(([a,b,w])=>segment(x,z,a,b)<w)||Math.hypot(x-A.tower[0],z-A.tower[1])<11)return;
      trees.push({x,z,h,w:h*(type===3?.85:1.13)*(rand()*.18+.93),type,tint:.87+rand()*.25});
    };
    const view=A.lakeView,target=A.tower,dx=target[0]-view[0],dz=target[1]-view[1],ln=Math.hypot(dx,dz),fx=dx/ln,fz=dz/ln,rx=-fz,rz=fx;
    // The real eastern bank screens the tower's lower storey in views from the island.
    for(const [towardsLake,side,height,type] of [[13,-16,12,1],[21,-8,10,1],[28,-1,8.8,0],[20,4,7.8,1],[16,11,11,1],[25,18,13,0],[-15,17,16,1]]){
      const x=target[0]-fx*towardsLake+rx*side,z=target[1]-fz*towardsLake+rz*side;
      if(!wet(x,z)&&!blocked(x,z)&&!road(x,z,.55))trees.push({x,z,h:height,w:height*1.08,type,tint:.88+rand()*.10});
    }
    // A pair of lakeside willows frames the view from the eastern tip of the island.
    for(const side of [-1,1]){const x=view[0]+rx*side*6.5-fx*1.8,z=view[1]+rz*side*6.5-fz*1.8;if(!wet(x,z)&&!blocked(x,z))trees.push({x,z,h:13+side,w:17,type:0,tint:1.02});}
    for(const f of allWater)for(const ring of [f.ring,...(f.holes||[])])for(let i=0;i<ring.length;i++){
      const p=ring[i],q=ring[(i+1)%ring.length],n=Math.max(1,Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/9));
      for(let j=0;j<n;j++){
        const t=(j+.5)/n;for(let k=0;k<3;k++){const a=rand()*tau,d=3+rand()*14;treeAt(p[0]+(q[0]-p[0])*t+Math.cos(a)*d,p[1]+(q[1]-p[1])*t+Math.sin(a)*d,7+rand()*10,rand()<.36?0:Math.floor(1+rand()*3));}
      }
    }
    for(let i=0;i<5100;i++)treeAt(box.left+rand()*(box.right-box.left),box.top+rand()*(box.bottom-box.top),6+rand()*12,rand()>.78?2:rand()>.65?3:1);
    for(const tr of trees)tr.groundY=hill(tr.x,tr.z);
    const flora=CampusFlora.create(trees);scene.add(flora.mesh);
    scene.add(CampusFlora.lakesideWillow(A.lakeView,Math.atan2(dx,-dz)-.105));
    const c=document.createElement('canvas');c.width=c.height=2048;const ctx=c.getContext('2d');
    const groundBox={left:box.left-44,right:box.right+44,top:box.top-40,bottom:box.bottom+40},gw=groundBox.right-groundBox.left,gh=groundBox.bottom-groundBox.top;
    ctx.fillStyle='#a1aa7e';ctx.fillRect(0,0,c.width,c.height);ctx.setTransform(c.width/gw,0,0,c.height/gh,-groundBox.left*c.width/gw,-groundBox.top*c.height/gh);
    function trace(ring){ctx.moveTo(...ring[0]);for(const [x,z] of ring.slice(1))ctx.lineTo(x,z);ctx.closePath();}
    for(const f of data.green){ctx.beginPath();trace(f.ring);for(const h of f.holes||[])trace(h);ctx.fillStyle=({track:'#ae7965',pitch:'#84a06c',forest:'#83976c',wood:'#84956d',grass:'#a6ac7a'})[f.kind]||'#9ca77a';ctx.fill('evenodd');}
    for(let j=0;j<56000;j++){ctx.fillStyle=j%3?'#52664211':'#e6d6a51c';const x=groundBox.left+rand()*gw,z=groundBox.top+rand()*gh;ctx.fillRect(x,z,rand()*3+.5,rand()*2+.4);}
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const path of data.paths){ctx.beginPath();ctx.moveTo(...path.points[0]);for(const p of path.points.slice(1))ctx.lineTo(...p);
      ctx.lineWidth=(path.width||3)+.8;ctx.strokeStyle='#9a967f';ctx.stroke();ctx.lineWidth=path.width||3;
      ctx.strokeStyle=['footway','path','steps','pedestrian','cycleway'].includes(path.kind)?'#d2c6a6':'#b3b0a3';ctx.stroke();}
    for(const b of buildings){ctx.beginPath();trace(b.ring.map(([x,z])=>[x+2,z+2]));ctx.fillStyle='#505b4b42';ctx.fill();}
    for(const tr of trees){ctx.beginPath();ctx.ellipse(tr.x+tr.h*.17,tr.z+tr.h*.13,tr.h*.28,tr.h*.17,.6,0,tau);ctx.fillStyle='#3a4c3d33';ctx.fill();}
    const groundTex=new T.CanvasTexture(c);groundTex.encoding=T.sRGBEncoding;groundTex.anisotropy=8;
    const groundMat=new T.MeshLambertMaterial({map:groundTex,color:0xf4eddb});
    const ground=new T.Mesh(new T.PlaneGeometry(gw,gh),groundMat);ground.rotation.x=-Math.PI/2;ground.position.set((groundBox.left+groundBox.right)/2,-.12,(groundBox.top+groundBox.bottom)/2);scene.add(ground);
    const tile=document.createElement('canvas');tile.width=tile.height=256;const paving=tile.getContext('2d');paving.fillStyle='#9a9b90';paving.fillRect(0,0,256,256);
    for(let j=0;j<8;j++)for(let i=-1;i<4;i++){const tone=175+Math.floor(rand()*17);paving.fillStyle='rgb('+tone+','+(tone+1)+','+(tone-3)+')';paving.fillRect(i*64+(j%2)*32+1,j*32+1,62.8,30.8);}
    for(let i=0;i<10500;i++){paving.fillStyle=i%2?'#595f5713':'#fffff71e';paving.fillRect(rand()*256,rand()*256,rand()*1.8+.4,rand()*1.1+.4);}
    function forecourt(x,z,w,d,angle){
      const tex=new T.CanvasTexture(tile);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(w/4.6,d/4.6);tex.encoding=T.sRGBEncoding;tex.anisotropy=8;
      const geo=new T.PlaneGeometry(w,d);geo.rotateX(-Math.PI/2);const m=new T.Mesh(geo,new T.MeshLambertMaterial({map:tex}));m.position.set(x,-.055,z);m.rotation.y=angle;scene.add(m);
    }
    forecourt(A.westGate[0]-8.5,A.westGate[1],52,23,-.075);forecourt(lb.right+6,A.library[1]-1,44,73,-.04);
    const hillGeo=new T.PlaneGeometry(77,77,40,40);hillGeo.rotateX(-Math.PI/2);const hp=hillGeo.attributes.position,hu=hillGeo.attributes.uv;
    for(let i=0;i<hp.count;i++){const x=A.tower[0]+hp.getX(i),z=A.tower[1]+hp.getZ(i);hp.setXYZ(i,x,hill(x,z)-.117,z);hu.setXY(i,(x-groundBox.left)/gw,1-(z-groundBox.top)/gh);}
    hillGeo.computeVertexNormals();hillGeo.computeBoundingSphere();scene.add(new T.Mesh(hillGeo,groundMat));
    const outer=new T.Mesh(new T.PlaneGeometry(8300,8300),new T.MeshLambertMaterial({color:0x8f9c7b}));outer.rotation.x=-Math.PI/2;outer.position.y=-.58;scene.add(outer);
    const rocks=[],grass=[],shoreColors=['#929486','#aaa695','#aaa68d','#879084','#777f73'];
    for(const w of allWater)for(const ring of [w.ring,...(w.holes||[])])for(let i=0;i<ring.length;i++){
      const p=ring[i],q=ring[(i+1)%ring.length],len=Math.hypot(q[0]-p[0],q[1]-p[1]),count=Math.max(1,Math.floor(len/2.0));
      for(let j=0;j<count;j++){const u=(j+rand()*.7)/count,x=p[0]*(1-u)+q[0]*u,z=p[1]*(1-u)+q[1]*u,sz=.5+rand()*1.25;
        rocks.push([x,.03+rand()*.15,z,sz,sz*(.24+rand()*.35),sz*(.5+rand()*.65),rand()*tau,rand()*.18,rand()*.1,shoreColors[Math.floor(rand()*shoreColors.length)]]);
        if(rand()<.46)for(let k=0;k<5;k++){const h=.45+rand()*.5;grass.push([x+(rand()-.5)*1.4,h*.38,z+(rand()-.5)*1.4,.065,h,.065,rand()*tau,rand()*.24-.12,rand()*.27-.13,rand()>.5?'#8d9a60':'#adb071']);}
      }
    }
    addBoxInstances(scene,rocks,new T.DodecahedronGeometry(1,0),new T.MeshLambertMaterial({flatShading:true}));
    addBoxInstances(scene,grass,new T.ConeGeometry(1,1,3),new T.MeshLambertMaterial({side:T.DoubleSide}));
    for(const s of data.surfaces||[]){const m=new T.Mesh(planar(s),new T.MeshLambertMaterial({color:0xb6b3a0,side:T.DoubleSide}));m.position.y=.52;scene.add(m);}
    const deck=[],rails=[];
    for(const seg of lines.filter(v=>v.bridge)){const x=(seg.a[0]+seg.b[0])/2,z=(seg.a[1]+seg.b[1])/2,dx=seg.b[0]-seg.a[0],dz=seg.b[1]-seg.a[1],n=Math.hypot(dx,dz),a=Math.atan2(dx,dz);if(n<.1)continue;
      deck.push([x,.27,z,seg.w,.5,n,a]);for(const sign of [-1,1]){
        const ox=dz/n*seg.w*.48*sign,oz=-dx/n*seg.w*.48*sign;
        rails.push([x+ox,1.28,z+oz,.13,.15,n,a]);
        for(let d=0;d<n;d+=2.5)rails.push([seg.a[0]+dx*d/n+ox,.89,seg.a[1]+dz*d/n+oz,.2,.95,.2,a]);
      }}
    addBoxInstances(scene,deck,new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0xb9b6a2}));
    addBoxInstances(scene,rails,new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0xc6c3af}));
    const posts=[],lights=[];
    for(const s of lines){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],n=Math.hypot(dx,dz);if(n<19)continue;
      for(let d=12;d<n;d+=31){const x=s.a[0]+dx*d/n+dz/n*(s.w/2+.65),z=s.a[1]+dz*d/n-dx/n*(s.w/2+.65);
        if(wet(x,z)||blocked(x,z)||segment(x,z,A.lakeView,A.tower)<7)continue;const base=hill(x,z);posts.push([x,base+1.80,z,.075,3.8,.075,0]);lights.push([x,base+3.76,z,.24,.32,.24,0]);}}
    addBoxInstances(scene,posts,new T.CylinderGeometry(1,1,1,6),new T.MeshLambertMaterial({color:0x555a4e}));
    const lamps=new T.MeshStandardMaterial({color:0xdbd5b7,emissive:0xffc477,emissiveIntensity:0});addBoxInstances(scene,lights,new T.SphereGeometry(1,8,6),lamps);
    const rideModel=art.bicycle();
    return {data,box,buildings,byId,walkable,safe,wet,blocked,road,flora,tower,towerPos:A.tower,lb,parked,rideModel,updateNearby,takeBike,leaveBike,
      setNight(value){facade.map=value?nightWindows:dayWindows;oldFacade.map=value?oldNight:oldDay;oldFacade.emissiveIntensity=facade.emissiveIntensity=value?.63:0;lamps.emissiveIntensity=value?1.7:0;tower.userData.setNight(Boolean(value));flora.material.uniforms.night.value=value?1:0;},
      setQuality(level){flora.mesh.geometry.instanceCount=level==='low'?Math.max(1,Math.floor(flora.total*.72)):flora.total;},
      groundLevel(x,z){return wet(x,z)&&walkable(x,z)?.52:hill(x,z);}};
  }
  return {create,inside,contains,bounds,segment,planar,waterY};
})();
