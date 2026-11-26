/* One mirrored camera and one render target serve all coplanar campus ponds. */
window.CampusSkyWater = function(renderer,scene,camera,world) {
  const T=THREE,h=CampusWorld.waterY,night={value:0},time={value:0};
  const ambient=new T.HemisphereLight(0xe2ecf4,0x949971,1.12),sun=new T.DirectionalLight(0xffedce,1.22);
  sun.position.set(332,372,-43);scene.add(ambient,sun);
  const skyTexture=new T.Texture(),skyReady={value:0},photo=new Image();
  photo.onload=()=>{skyTexture.image=photo;skyTexture.wrapS=T.RepeatWrapping;skyTexture.minFilter=T.LinearFilter;skyTexture.generateMipmaps=false;skyTexture.needsUpdate=true;skyReady.value=1;};
  photo.src=window.CAMPUS_DAY_SKY;
  const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{night,clock:time,skyReady,skyTexture:{value:skyTexture}},
    vertexShader:`varying vec3 direction;void main(){direction=position;vec3 p=cameraPosition+position;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);gl_Position.z=gl_Position.w*.99999;}`,
    fragmentShader:`
      varying vec3 direction;uniform float night,clock,skyReady;uniform sampler2D skyTexture;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec3 d=normalize(direction);float alt=max(d.y,0.);
      float skyU=fract(atan(d.z,d.x)/6.2831853+.615);float skyV=clamp(asin(clamp(d.y,0.,1.))*0.6366198,.002,.998);
      vec3 photographed=texture2D(skyTexture,vec2(skyU,skyV)).rgb;
      photographed=mix(photographed,vec3(.825,.873,.852),.22*(1.-smoothstep(.008,.23,d.y)));
      vec3 color=mix(mix(vec3(.86,.89,.84),vec3(.42,.67,.81),sqrt(alt)),photographed,skyReady);
      if(night>.5){
        float clouds=smoothstep(.46,.94,photographed.r)*skyReady;
        color=mix(vec3(.17,.218,.299),vec3(.033,.058,.128),pow(smoothstep(0.,.66,alt),.55));
        color+=vec3(.077,.08,.095)*clouds;
        vec2 suv=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*226.,cell=floor(suv),spos=fract(suv)-vec2(hash(cell+.3),hash(cell+24.1));
        float star=step(.983,hash(cell))*(1.-smoothstep(.028,.18,length(spos)))*smoothstep(.035,.22,d.y)*(1.-clouds*.86);color+=vec3(.64,.69,.74)*star;
        float md=dot(d,normalize(vec3(.88,.265,.11)));color+=vec3(.08,.11,.17)*pow(max(md,0.),160.);
        color=mix(color,vec3(.96,.935,.803),smoothstep(.99973,.99986,md));
      }
      gl_FragColor=vec4(pow(max(color,0.),vec3(2.2)),1.);
      #include <encodings_fragment>
      }`});
  const sky=new T.Mesh(new T.SphereGeometry(3100,36,18),skyMat);sky.frustumCulled=false;sky.renderOrder=-1000;scene.add(sky);
  const mirror=new T.PerspectiveCamera(),target=new T.WebGLRenderTarget(640,360,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,stencilBuffer:false});
  target.texture.generateMipmaps=false;
  const projective=new T.Matrix4(),bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const waveSize=128,wavePixels=new Uint8Array(waveSize*waveSize*4),random=CampusFlora.random(703),spectrum=[];
  for(let j=0;j<20;j++){const k=2+Math.floor(random()*16),l=Math.round(k*(random()-.4)*1.45);spectrum.push([k,l,random()*Math.PI*2,(.25+random())/Math.sqrt(k)]);}
  for(let z=0;z<waveSize;z++)for(let x=0;x<waveSize;x++){
    let gx=0,gz=0;for(const [k,l,phase,amp] of spectrum){const s=amp*Math.cos((k*x+l*z)*2*Math.PI/waveSize+phase);gx+=s*k/16;gz+=s*l/16;}
    const i=4*(z*waveSize+x);wavePixels[i]=128+Math.round(Math.max(-1,Math.min(1,gx)) * 122);wavePixels[i+1]=128+Math.round(Math.max(-1,Math.min(1,gz)) * 122);wavePixels[i+2]=128;wavePixels[i+3]=255;
  }
  const waves=new T.DataTexture(wavePixels,waveSize,waveSize);waves.wrapS=waves.wrapT=T.RepeatWrapping;waves.generateMipmaps=true;waves.minFilter=T.LinearMipmapLinearFilter;waves.magFilter=T.LinearFilter;waves.needsUpdate=true;
  const surfaceMat=new T.ShaderMaterial({uniforms:{reflected:{value:target.texture},waveMap:{value:waves},mirrorProjection:{value:projective},clock:time,night},
    vertexShader:`uniform mat4 mirrorProjection;varying vec4 projected;varying vec3 worldPos;
      void main(){vec4 wp=modelMatrix*vec4(position,1.);worldPos=wp.xyz;projected=mirrorProjection*wp;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`
      uniform sampler2D reflected,waveMap;uniform float clock,night;varying vec4 projected;varying vec3 worldPos;
      void main(){vec2 p=worldPos.xz;vec3 eye=cameraPosition-worldPos;float distanceToEye=length(eye);vec3 viewDir=normalize(eye);
      float t=clock,l=sin(dot(p,vec2(.13,.095))+t*.32),q=sin(dot(p,vec2(-.08,.24))-t*.5);
      float a=sin(dot(p,vec2(.83,.29))+l*1.3+t*.92),b=sin(dot(p,vec2(-.34,1.45))+2.*q-t*1.26);
      float fine=1.-smoothstep(55.,220.,distanceToEye);
      float c=sin(dot(p,vec2(1.86,2.74))+1.7*a+t*1.53)*fine;
      vec2 s1=texture2D(waveMap,p*.041+vec2(t*.009,t*.003)).rg*2.-1.;
      vec2 s2=texture2D(waveMap,mat2(.81,.58,-.58,.81)*p*.111-vec2(t*.004,t*.008)).rg*2.-1.;
      vec3 normal=normalize(vec3(a*.024+b*.009+c*.008+s1.x*.052+s2.x*.031,1.,b*.022-l*.012+c*.007+s1.y*.063+s2.y*.038));
      vec2 uv=projected.xy/projected.w;float strength=.076/(1.+distanceToEye*.003);
      vec2 waveRight=normalize(vec2(viewMatrix[0][0],viewMatrix[2][0])+vec2(.00001,0.));
      uv+=vec2(dot(normal.xz,waveRight),dot(normal.xz,vec2(-waveRight.y,waveRight.x))*1.8)*strength;vec3 mirror=texture2D(reflected,clamp(uv,.002,.998)).rgb;
      float fres=pow(1.-clamp(dot(viewDir,normal),0.,1.),3.);vec3 base=mix(vec3(.042,.195,.173),vec3(.009,.026,.045),night);
      vec3 col=mix(base,mirror,mix(.29,.81,fres));float ripple=smoothstep(.62,1.,.52*a+.30*b+.18*c);
      col+=mix(vec3(.027,.052,.043),vec3(.003,.008,.014),night)*ripple*(.32+.68*fine);
      float crest=smoothstep(.38,.84,s1.x*.6+s2.y*.55)*(.35+.65*fine);
      col+=mix(vec3(.085,.134,.116),vec3(.008,.019,.026),night)*crest;
      vec3 lightDirection=normalize(mix(vec3(.664,.744,-.086),vec3(.88,.265,.11),night));
      float gleam=pow(max(0.,dot(reflect(-lightDirection,normal),viewDir)),95.);col+=mix(vec3(.52,.42,.21),vec3(.22,.26,.31),night)*gleam;
      gl_FragColor=vec4(col,1.);
      #include <encodings_fragment>
      }`});
  const waters=new T.Group();waters.name='十三处校园水面';
  for(const f of world.data.water){const mesh=new T.Mesh(CampusWorld.planar(f),surfaceMat);mesh.position.y=h;waters.add(mesh);}scene.add(waters);
  const up=new T.Vector3(),forward=new T.Vector3(),mirrorLook=new T.Vector3(),lastPos=new T.Vector3(Infinity,Infinity,Infinity),lastQuat=new T.Quaternion();
  const clip=[new T.Plane(new T.Vector3(0,1,0),-h+.015)];let lastMirror=-10,quality='high',dirty=true;
  function render(now){
    time.value=now;world.flora.material.uniforms.clock.value=now;world.updateNearby(camera.position.x,camera.position.z,quality);
    camera.updateMatrixWorld();
    const near=world.data.water.some(f=>{
      const bb=f.renderBounds||(f.renderBounds=CampusWorld.bounds(f.ring));return camera.position.x>bb.left-330&&camera.position.x<bb.right+330&&camera.position.z>bb.top-330&&camera.position.z<bb.bottom+330;
    });
    const moved=lastPos.distanceToSquared(camera.position)>.003||1-Math.abs(lastQuat.dot(camera.quaternion))>.0000004;
    if(near&&(dirty||moved||now-lastMirror>(quality==='high'?.09:quality==='medium'?.15:.24))){
      mirror.position.copy(camera.position);mirror.position.y=2*h-camera.position.y;
      camera.getWorldDirection(forward);forward.y*=-1;
      up.set(0,1,0).applyQuaternion(camera.quaternion);up.y*=-1;mirror.up.copy(up);
      mirrorLook.copy(mirror.position).add(forward);mirror.lookAt(mirrorLook);
      mirror.projectionMatrix.copy(camera.projectionMatrix);mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);mirror.updateMatrixWorld();
      projective.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
      waters.visible=false;const previous=renderer.clippingPlanes,previousTarget=renderer.getRenderTarget();
      renderer.clippingPlanes=clip;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,mirror);
      renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=previous;waters.visible=true;
      lastPos.copy(camera.position);lastQuat.copy(camera.quaternion);lastMirror=now;dirty=false;
    }
    renderer.render(scene,camera);
  }
  return {render,waterGroup:waters,mirror,projective,
    resize(level,width,height){quality=level;const factor=level==='high'?.82:level==='medium'?.55:.31,max=level==='high'?1320:level==='medium'?840:450;
      const w=Math.max(140,Math.min(max,Math.floor(width*factor)));target.setSize(w,Math.max(96,Math.round(w*height/width)));dirty=true;},
    setNight(v){night.value=v?1:0;ambient.color.set(v?0xadbfec:0xe2ecf4);ambient.groundColor.set(v?0x334456:0x949971);ambient.intensity=v?.34:1.12;
      sun.color.set(v?0x9ab7ea:0xffedce);sun.position.set(v?440:332,v?132:372,v?55:-43);sun.intensity=v?.31:1.22;scene.fog=new T.FogExp2(v?0x2b394c:0xc9d4c7,v?.00166:.00116);world.setNight(v);dirty=true;}
  };
};
