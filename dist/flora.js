/* Original tree silhouettes and foliage. The atlas is painted once at startup. */
window.CampusFlora = (() => {
  let photographicAtlas=null;
  async function prepare(){
    const asset=window.CAMPUS_VEGETATION;if(!asset?.url)return;
    const image=new Image();image.src=asset.url;
    try { await image.decode();photographicAtlas=image; } catch { photographicAtlas=null; }
  }
  function random(seed) {
    return () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function paintTree(ctx, type, seed) {
    const r=random(seed), forks=[], leafGroups=[];
    const pine=type===3, willow=type===0, yellow=type===2;
    const ink=pine?'#514f40':'#665947';
    function limb(x,y,length,angle,thickness,depth) {
      const bend=(r()-.5)*.28, midX=x+Math.cos(angle+bend)*length*.55,midY=y+Math.sin(angle+bend)*length*.55;
      const ex=midX+Math.cos(angle-bend)*length*.45,ey=midY+Math.sin(angle-bend)*length*.45;
      forks.push([x,y,midX,midY,ex,ey,thickness]);
      if(depth<2)leafGroups.push([ex,ey,depth]);
      if(depth===0)return;
      const split=willow?.53:pine?.60:.50;
      limb(ex,ey,length*(.64+r()*.10),angle-split*(.55+r()*.75),thickness*.64,depth-1);
      limb(ex,ey,length*(.65+r()*.11),angle+split*(.55+r()*.75),thickness*.63,depth-1);
      if(depth>1&&depth<5&&r()<.5)limb(midX,midY,length*.72,angle+(r()>.5?1:-1)*.70,thickness*.52,depth-1);
    }
    if(pine) {
      forks.push([253,493,247,277,254,89,10]);
      for(let i=0;i<17;i++){const h=i/17,y=412-h*301,sgn=i%2?-1:1,reach=(1-h*.63)*(103+r()*52);limb(251,y,reach*.67,sgn===1?-.20:-2.92,6-h*3,3);}
      leafGroups.push([255,89,1],[254,101,1]);
    } else {
      limb(254,494,willow?95:104,-1.59,willow?14:17,5);
      limb(252,428,willow?94:90,-2.23,10,4);limb(256,437,91,-.90,10,4);
    }
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [x,y,mx,my,ex,ey,w] of forks) {
      ctx.strokeStyle=ink;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
      if(w>3){ctx.lineWidth=w*.19;ctx.strokeStyle='#a28e6c';ctx.beginPath();ctx.moveTo(x-w*.24,y);ctx.quadraticCurveTo(mx-w*.15,my,ex,ey);ctx.stroke();}
    }
    const shades=willow?['#3c5945','#536e4c','#6b854e','#87a259','#a3b968','#b5c878']:
      yellow?['#4c6144','#68804d','#8e9c4d','#adae51','#bdba61','#cfcb75']:
      pine?['#294940','#35584a','#496b56','#5a7960','#738967','#91a37a']:
      ['#375444','#486846','#5e8050','#769653','#91aa61','#a2b873'];
    leafGroups.sort((a,b)=>a[1]-b[1]);
    if(willow){
      for(const [x,y] of leafGroups){
        const spread=20+r()*27;
        for(let j=0;j<12;j++){
          const x0=x+(r()-.5)*spread,y0=y+(r()-.5)*13,length=20+r()*64,droop=(r()-.6)*20;
          ctx.strokeStyle=shades[Math.floor(r()*4)];ctx.lineWidth=.8+r()*.8;
          ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(x0+droop*1.1,y0+length*.42,x0+droop*.6,y0+length);ctx.stroke();
          for(let k=0;k<length;k+=2.7+r()*3){
            const u=k/length,px=x0+droop*Math.sin(u*2.45), py=y0+k;
            const shade=Math.min(5,Math.max(0,Math.floor(1.6+r()*3.1+(250-x0)/195-u*.6)));
            ctx.fillStyle=shades[shade];ctx.beginPath();ctx.ellipse(px+(r()-.5)*4,py,1.15+r(),2.4+r()*2.3,(r()-.5)*1.25,0,Math.PI*2);ctx.fill();
          }
        }
      }
    } else {
      for(const [x,y,depth] of leafGroups){
        const rad=pine?11+r()*12:14+r()*15,ry=rad*(pine?.47:.79);
        for(let i=0;i<(pine?100:91);i++){
          const a=r()*Math.PI*2,d=Math.sqrt(r()), ox=Math.cos(a)*rad*d,oy=Math.sin(a)*ry*d;
          let light=1.8-ox/rad*.95-oy/ry*1.15+(r()-.5)*2.9+(250-x)*.004;
          if(depth===1)light+=.25;
          ctx.fillStyle=shades[Math.min(5,Math.max(0,Math.round(light)))];
          ctx.beginPath();ctx.ellipse(x+ox,y+oy,pine?2+r()*3.2:1.8+r()*4.5,pine?.9+r()*1.8:1.25+r()*3.5,-.44+r()*.8,0,Math.PI*2);ctx.fill();
        }
      }
    }
  }
  function create(trees){
    let atlas=photographicAtlas;
    if(!atlas){const S=512;atlas=document.createElement('canvas');atlas.width=S*4;atlas.height=S;const ctx=atlas.getContext('2d');
      for(let t=0;t<4;t++){ctx.save();ctx.beginPath();ctx.rect(t*S,0,S,S);ctx.clip();ctx.translate(t*S,0);paintTree(ctx,t,81+t*719);ctx.restore();}}
    const texture=new THREE.Texture(atlas);texture.needsUpdate=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    const geometry=new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
    const descriptors=[], sizes=[];
    for(const t of trees){descriptors.push(t.x,t.z,t.type,t.tint);sizes.push(photographicAtlas?t.h*window.CAMPUS_VEGETATION.aspects[t.type]*(t.w/t.h):t.w,t.h,t.groundY||0);}
    geometry.setAttribute('tree',new THREE.InstancedBufferAttribute(new Float32Array(descriptors),4));
    geometry.setAttribute('size',new THREE.InstancedBufferAttribute(new Float32Array(sizes),3));geometry.instanceCount=trees.length;
    const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{sheet:{value:texture},night:{value:0},clock:{value:0}},
      vertexShader:`
        attribute vec4 tree;attribute vec3 size;uniform float clock;varying vec2 vUv;varying float shade;varying float dist;
        void main(){vec2 delta=cameraPosition.xz-tree.xy;vec2 right=normalize(vec2(delta.y,-delta.x)+vec2(.0001,0.));
        float sway=sin(clock*.77+tree.x*.038+tree.y*.017)*.075*uv.y*uv.y;
        vec3 w=vec3(tree.x,size.z-.12,tree.y);w.xz+=right*position.x*size.x;w.x+=sway;w.y+=position.y*size.y;
        vec4 mv=viewMatrix*vec4(w,1.);gl_Position=projectionMatrix*mv;float side=tree.w<.994?1.-uv.x:uv.x;
        vUv=vec2((tree.z+.002+side*.996)/4.,.002+uv.y*.996);
        shade=tree.w;dist=length(mv.xyz);}`,
      fragmentShader:`
        uniform sampler2D sheet;uniform float night;varying vec2 vUv;varying float shade;varying float dist;
        void main(){vec4 leaf=texture2D(sheet,vUv);if(leaf.a<.23)discard;
        vec3 c=leaf.rgb*shade;vec3 dusk=c*vec3(.27,.37,.52);
        c=mix(c,dusk,night);float fog=1.-exp(-dist*dist*.00000135);
        c=mix(c,mix(vec3(.77,.81,.72),vec3(.17,.22,.30),night),fog);
        gl_FragColor=vec4(pow(max(c,vec3(.001)),vec3(2.2)),1.);
        #include <encodings_fragment>
        }`});
    const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.name='燕园乔木';
    return {mesh,material,total:trees.length};
  }
  // The lakeside willow has real branches and two-sided leaves close enough to walk underneath.
  function lakesideWillow(origin,yaw){
    const r=random(6307),positions=[],colors=[],forward=[Math.sin(yaw),-Math.cos(yaw)],right=[Math.cos(yaw),Math.sin(yaw)];
    const point=(s,h,f)=>new THREE.Vector3(origin[0]+right[0]*s+forward[0]*f,h,origin[1]+right[1]*s+forward[1]*f);
    function face(a,b,c,color){positions.push(...a.toArray(),...b.toArray(),...c.toArray());for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);}
    const col=hex=>new THREE.Color(hex),wood=col('#695d47'),twig=col('#827d4e');
    function branch(a,b,r0,r1,color,sides){
      const axis=b.clone().sub(a).normalize(),u=new THREE.Vector3(0,0,1).cross(axis).normalize(),v=axis.clone().cross(u);
      for(let i=0;i<sides;i++){
        const p=i*2*Math.PI/sides,n=(i+1)*2*Math.PI/sides;
        const k=u.clone().multiplyScalar(Math.cos(p)).addScaledVector(v,Math.sin(p)),l=u.clone().multiplyScalar(Math.cos(n)).addScaledVector(v,Math.sin(n));
        const p0=a.clone().addScaledVector(k,r0),p1=a.clone().addScaledVector(l,r0),q0=b.clone().addScaledVector(k,r1),q1=b.clone().addScaledVector(l,r1);
        face(p0,p1,q1,color);face(p0,q1,q0,color);
      }
    }
    const shades=['#557645','#678746','#7b994c','#a1ad59','#bdbe6b','#829c5b','#8ba85b'].map(col),base=point(-7.9,0,-1.1),joint=point(-7.6,3.55,.9),crown=point(-6.3,5.6,3.5);
    branch(base,joint,.43,.24,wood,8);branch(joint,crown,.26,.15,wood,7);
    for(let arm=0;arm<13;arm++){
      const endS=-6.6+r()*5.8,endF=4.4+r()*5.0,endH=4.9+r()*2.1;
      const elbow=point((-6.3+endS)*.5-.3,6+r()*.9,(3.5+endF)*.5);
      const tip=point(endS,endH,endF);branch(crown,elbow,.081,.047,wood,5);branch(elbow,tip,.047,.014,twig,4);
      for(let j=0;j<9;j++){
        const start=elbow.clone().lerp(tip,.26+r()*.74),side=r()>.5?1:-1,reach=(.18+r()*.72)*side;
        start.x+=right[0]*reach;start.z+=right[1]*reach;start.y+=r()*.57-.26;
        const length=.62+r()*1.98,curvature=.18+r()*.22,sway=(r()-.45)*.78,stemColor=shades[Math.floor(r()*3)];
        let previous=start;
        for(let k=1;k<=15;k++){const u=k/15,drift=Math.sin(u*2.9)*curvature+u*sway;
          const p=start.clone();p.x+=right[0]*drift+forward[0]*u*.20;p.z+=right[1]*drift+forward[1]*u*.20;p.y-=length*u;
          branch(previous,p,.008*(1-u*.68),.007*(1-u*.68),stemColor,3);previous=p;
          for(const sign of [-1,1]){if(r()<.16)continue;const len=.084+r()*.102,wid=.0045+r()*.011;
            const vx=right[0]*sign*(.33+r()*.37)+forward[0]*(r()-.5)*.55,vz=right[1]*sign*(.33+r()*.37)+forward[1]*(r()-.5)*.55;
            const end=p.clone().add(new THREE.Vector3(vx*len,-len*(.73+r()*.34),vz*len)),mid=p.clone().lerp(end,.5);
            const m0=mid.clone().add(new THREE.Vector3(right[0]*wid,.007,right[1]*wid)),m1=mid.clone().add(new THREE.Vector3(-right[0]*wid,.002,-right[1]*wid));
            const shade=shades[Math.min(6,Math.floor(r()*6+(1-u)*.9))];face(p,m0,end,shade);face(p,end,m1,shade);
          }
        }
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));mesh.name='湖畔垂柳';return mesh;
  }
  return {random,create,lakesideWillow,prepare};
})();
