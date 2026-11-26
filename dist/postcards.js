/* Four original, seeded travel prints drawn entirely in the browser. */
(function () {
  'use strict';
  const W = 300, H = 200, scale = 1.5, tau = Math.PI * 2;
  function random(seed) {
    return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function polygon(c, points, fill, stroke, width = .6) {
    c.beginPath(); c.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) c.lineTo(points[i][0],points[i][1]);
    c.closePath(); if(fill){c.fillStyle=fill;c.fill();}
    if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function line(c,x1,y1,x2,y2,ink,w=.65) {
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=ink;c.lineWidth=w;c.stroke();
  }
  function rect(c,x,y,w,h,ink){c.fillStyle=ink;c.fillRect(x,y,w,h);}
  function circle(c,x,y,r,ink){c.beginPath();c.arc(x,y,r,0,tau);c.fillStyle=ink;c.fill();}
  function stroke(c,points,ink,w=.8) {
    c.beginPath();c.moveTo(...points[0]);
    for(let i=1;i<points.length;i++) c.lineTo(...points[i]);
    c.lineWidth=w;c.strokeStyle=ink;c.stroke();
  }
  function sky(c,top,bottom,h=150){
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);
    rect(c,0,0,W,H,g);
  }
  function clouds(c,r,y,ink,count) {
    c.save();c.globalAlpha=.64;
    for(let k=0;k<count;k++){
      const x=r()*W, yy=y+r()*40, w=12+r()*42;
      c.beginPath();c.moveTo(x-w*.55,yy);
      c.bezierCurveTo(x-w*.21,yy+1,x-w*.24,yy-3,x-w*.04,yy-2.2);
      c.bezierCurveTo(x+w*.12,yy-6,x+w*.24,yy-2.4,x+w*.33,yy-1.4);
      c.lineTo(x+w*.69,yy-.9);c.bezierCurveTo(x+w*.35,yy+1.7,x,yy+1.6,x-w*.55,yy);
      c.fillStyle=ink;c.fill();
      if(k%2===0)line(c,x+w*.12,yy+2.5,x+w*.89,yy+2.2,ink,.45);
    }
    c.restore();
  }
  function mountains(c,r,base,amplitude,colors) {
    for(let k=0;k<colors.length;k++){
      const pts=[[-8,H]], shifts=[r()*8,r()*10,r()*9]; let last;
      for(let x=-8;x<=W+9;x+=7){
        const a=(Math.sin(x*.027+shifts[0]) + .52*Math.sin(x*.063+shifts[1]) + .25*Math.cos(x*.136+shifts[2]));
        const y=base+k*9+a*amplitude/(1+k*.17)+(r()-.5)*2.4;
        pts.push([x,y]); last=y;
      }
      pts.push([W+10,last],[W+10,H]);polygon(c,pts,colors[k]);
    }
  }
  function pine(c,r,x,y,h,ink,light) {
    polygon(c,[[x-.035*h,y],[x+.039*h,y],[x+.011*h,y-h*.89],[x-.007*h,y-h]],ink);
    const lean=(r()-.5)*.13*h;
    for(let i=0;i<8;i++){
      const f=i/8, yy=y-h*(.95-.70*f), span=h*(.055+.20*f), dx=lean*(1-f);
      const a=x+dx-span*(.83+r()*.3), b=x+dx+span*(.75+r()*.4);
      polygon(c,[[x+dx,yy-h*.14],[x+dx+span*.16,yy-h*.038],[b-span*.21,yy+h*.038],
        [b,yy+h*.058],[b-span*.26,yy+h*.070],[b-span*.18,yy+h*.084],[x+dx+span*.10,yy+h*.057],
        [x+dx-span*.29,yy+h*.066],[a+span*.17,yy+h*.079],[a,yy+h*.06],[a+span*.33,yy+h*.03]],ink);
      if(light&&i%2===0)stroke(c,[[a+span*.08,yy+h*.057],[x+dx-span*.30,yy+h*.025],[x+dx,yy-h*.035]],light,.65);
    }
  }
  function broadleaf(c,r,x,y,h,shadow,leaf,lit) {
    const rad=h*.30, cy=y-h*.64, points=[];
    line(c,x,y,x+.05*h,cy,shadow,Math.max(.9,.048*h));
    line(c,x,y-h*.20,x-rad*.58,cy+.02*h,shadow,Math.max(.65,.024*h));
    for(let i=0;i<30;i++){
      const a=i*tau/30, rr=rad*(.86+.15*r()+.09*Math.cos(a*5));
      points.push([x+Math.cos(a)*rr,cy+Math.sin(a)*rr*1.12]);
    }
    polygon(c,points,leaf);
    c.save();c.clip();
    c.beginPath();c.moveTo(x-rad*1.2,cy+rad*.15);
    c.bezierCurveTo(x-rad*.29,cy+rad*.70,x-rad*.16,cy-rad*.11,x+rad*.24,cy+rad*.07);
    c.bezierCurveTo(x+rad*.70,cy+rad*.18,x+rad*.77,cy-rad*.20,x+rad*1.1,cy-rad*.26);
    c.lineTo(x+rad*1.3,cy+rad*1.6);c.lineTo(x-rad*1.3,cy+rad*1.6);c.closePath();c.fillStyle=shadow;c.fill();
    if(lit)for(let i=0;i<Math.ceil(h*.28);i++){
      const xx=x-rad+2*rad*r(),yy=cy-rad+rad*1.06*r();
      line(c,xx,yy,xx+rad*.16,yy-rad*.05,lit,.48);
    }
    c.restore();
  }
  function willows(c,r,x,y,h,mirror) {
    c.save();c.translate(x,y);c.scale(mirror? -1:1,1);
    const wood='#374c3e', deep='#526847',leaf='#839356',sun='#b3b86a';
    c.beginPath();c.moveTo(-.029*h,0);c.bezierCurveTo(.045*h,-.20*h,-.025*h,-.38*h,.13*h,-.57*h);
    c.bezierCurveTo(.20*h,-.66*h,.36*h,-.72*h,.37*h,-.74*h);
    c.bezierCurveTo(.12*h,-.68*h,.07*h,-.55*h,.01*h,-.49*h);
    c.bezierCurveTo(-.017*h,-.61*h,-.06*h,-.73*h,-.15*h,-.80*h);
    c.bezierCurveTo(-.072*h,-.64*h,-.051*h,-.51*h,-.058*h,-.34*h);
    c.lineTo(-.083*h,0);c.closePath();c.fillStyle=wood;c.fill();
    for(let i=0;i<12;i++){
      const xx=h*(-.23+i*.062),yy=-h*(.78+.052*Math.sin(1+i*.55)),span=h*(.050+.033*r());
      c.beginPath();c.moveTo(xx-span,yy+.07*h);
      c.quadraticCurveTo(xx-span,yy-.10*h,xx+span*.22,yy-.065*h);
      c.quadraticCurveTo(xx+span*1.2,yy-.038*h,xx+span,yy+.10*h);
      c.quadraticCurveTo(xx+span*.21,yy+.039*h,xx-span,yy+.07*h);
      c.fillStyle=i%3===0?'#86965d':i%3===1?'#758955':'#647e50';c.fill();
    }
    for(let k=0;k<39;k++){
      const dir=(r()-.30), s=dir>.12?1:-1, ex=dir*h*.76, reach=r()*.28*h;
      const sy=-h*(.72+r()*.16),ey=sy+h*(.13+r()*.40);
      c.beginPath();c.moveTo(0,-h*.50);c.quadraticCurveTo(ex*.61,sy-h*.075,ex,sy);
      c.strokeStyle=wood;c.lineWidth=.52+r()*.59;c.stroke();
      c.beginPath();c.moveTo(ex,sy);c.quadraticCurveTo(ex+s*reach*.21,(sy+ey)*.52,ex+s*reach*.08,ey);
      c.strokeStyle=k%4===0?deep:leaf;c.lineWidth=.48+r()*.52;c.stroke();
      for(let j=0;j<9;j++){
        const t=(j+.35)/9, yy=sy+(ey-sy)*t,xx=ex+s*reach*.14*Math.sin(t*Math.PI*.8);
        const sz=h*(.018+.016*r())*(1-t*.55);
        polygon(c,[[xx,yy],[xx+s*sz*.60,yy+sz*.34],[xx+s*sz*.21,yy+sz]],k%3===0?sun:leaf);
      }
    }
    c.restore();
  }
  function grove(c,r,base,range,palette,n) {
    for(let i=0;i<n;i++){
      const x=(i+.3+r()*.5)*W/n,h=range[0]+r()*(range[1]-range[0]),y=base+(r()-.5)*3;
      if(r()<.16) pine(c,r,x,y,h,palette[0],palette[2]);
      else broadleaf(c,r,x,y,h,palette[0],palette[1+(i%2)],palette[3]);
    }
  }
  function boya(c,x,foot,h,autumn){
    c.save();c.translate(x,foot);c.scale(h/100,h/100);
    const side=autumn?'#8b7864':'#777768',front=autumn?'#c1ad8c':'#afa68b';
    const sun=autumn?'#dfc4a0':'#cfbe9a',eave=autumn?'#514f43':'#4e5951';
    for (const [yy,r] of [[0,14.4],[-2.0,13.6],[-4.2,12.8],[-5.5,13.8],[-8.1,12.9]]){
      polygon(c,[[-r,yy],[-r,yy-1.25],[-r*.38,yy-1.6],[r*.65,yy-1.4],[r,yy-1.0],[r,yy]],side);
      line(c,-r,yy-1.1,r,yy-1.12,sun,.48);
    }
    polygon(c,[[-11.7,-9],[-11.1,-27.7],[3.6,-28.2],[3.6,-9]],front);
    polygon(c,[[3.6,-9],[3.6,-28.2],[11.2,-27.6],[11.7,-9]],side);
    for(let row=0;row<3;row++)for(let i=0;i<9;i++){
      const xx=-10+i*2.50+(row%2)*.45,yy=-8.5-row*.91;
      polygon(c,[[xx-1.20,yy],[xx,yy-1.45],[xx+1.07,yy],[xx,yy+.22]],i<5?sun:front);
    }
    c.fillStyle=eave;c.beginPath();c.moveTo(-5.5,-11.4);c.lineTo(-5.5,-17.9);
    c.arc(-3.6,-17.9,1.9,Math.PI,0);c.lineTo(-1.7,-11.4);c.fill();
    line(c,-3.6,-11.5,-3.6,-18.2,front,.30);rect(c,5.6,-20.2,2.4,4.9,eave);
    for(const xx of [6.1,7.2])line(c,xx,-19.9,xx,-15.5,front,.26);
    let yy=-28.0;
    for(let i=0;i<13;i++){
      const t=i/12,body=11.4-1.3*t-.63*t*t,r=body+3.65-.35*t,gap=5.62-i*.086;
      if(i<12){
        polygon(c,[[-body,yy],[-body+.11,yy-gap+.5],[body*.24,yy-gap],[body*.28,yy]],front);
        polygon(c,[[body*.28,yy],[body*.24,yy-gap],[body-.1,yy-gap+.5],[body,yy]],side);
        if(i%2===0)rect(c,-body*.2,yy-gap*.77,.75,gap*.29,eave);
      }
      for(let k=0;k<6;k++){const xx=-body+k*body*.40;rect(c,xx,yy+.30,1.24,1.36,side);}
      polygon(c,[[-r,yy-.54],[-r+.65,yy+.62],[-1,yy+1.76],[r-.46,yy+.60],[r,yy-.54],
        [body*.54,yy-1.23],[-body*.37,yy-1.40],[-body*.71,yy-1.22]],eave);
      stroke(c,[[-r,yy-.54],[-body*.49,yy-.16],[1,yy+.22],[r-.3,yy-.54]],sun,.72);
      if(i<12)yy-=gap;
    }
    c.beginPath();c.moveTo(-12.8,yy-.57);c.quadraticCurveTo(-5.2,yy-1.55,-.7,-97.02);
    c.lineTo(.65,-97.02);c.quadraticCurveTo(5.8,yy-1.38,12.8,yy-.57);
    c.quadraticCurveTo(0,yy+.26,-12.8,yy-.57);c.closePath();c.fillStyle=autumn?'#ac9273':'#9c9379';c.fill();
    for(const xx of [-10,-6,-2,2,6,10]){
      c.beginPath();c.moveTo(xx,yy-.80);c.quadraticCurveTo(xx*.37,yy-2.76,0,-97.0);
      c.strokeStyle=xx<0?sun:side;c.lineWidth=.43;c.stroke();
    }
    line(c,0,-96.9,0,-99.25,eave,.64);circle(c,0,-97.8,.70,sun);c.restore();
  }
  function lakeReflection(c,r,waterY) {
    const backing=document.createElement('canvas');
    backing.width=c.canvas.width;backing.height=c.canvas.height;
    backing.getContext('2d').drawImage(c.canvas,0,0);
    const g=c.createLinearGradient(0,waterY,0,H);g.addColorStop(0,'#78a798');g.addColorStop(.49,'#84b6ac');g.addColorStop(1,'#507e77');
    rect(c,0,waterY,W,H-waterY,g);
    c.save();c.globalAlpha=.42;
    for(let y=0;y<H-waterY;y+=1.4){
      const shift=(Math.sin(y*1.81)+Math.sin(y*.41))*(.16+y*.018);
      c.drawImage(backing,0,(waterY-y*1.08-1.6)*scale,W*scale,1.7*scale,shift,waterY+y,W,1.65);
    }
    c.restore();
    for(let i=0;i<350;i++){
      const t=r(), x=r()*W, yy=waterY+t*(H-waterY),w=(1.8+9.8*r())*(.40+1.05*t);
      line(c,x,yy,x+w,yy+(r()-.5)*.45,i%4===0?'#c5d5ae':i%4===1?'#507f73':'#a7c6af',t*.46+.27);
    }
  }
  function lake(c,r) {
    sky(c,'#83b2af','#e3d9ad',148);circle(c,227,42,14,'#f2ddb0');
    clouds(c,r,23,'#eee4c2',9);mountains(c,r,88,6.2,['#a6bba3','#92a88d']);
    grove(c,r,114,[10,25],['#6d8873','#879878','#789279','#afad85'],31);
    boya(c,192,115,80,false);
    grove(c,r,124,[9,22],['#476e5a','#688868','#597e62','#9b9e71'],42);
    polygon(c,[[-1,123],[32,123],[59,119],[86,120],[114,121],[151,118],[185,119],[210,122],[244,118],[277,119],[301,114],[301,130],[-1,130]],'#537665');
    stroke(c,[[0,125],[39,124],[67,122],[102,123],[141,122],[166,121],[199,122],[225,125],[262,121],[300,119]],'#d4c490',.94);
    lakeReflection(c,r,128);
    polygon(c,[[-2,146],[14,149],[27,150],[37,155],[52,160],[40,163],[17,161],[-2,164]],'#596b54');
    polygon(c,[[0,146],[15,148],[26,150],[36,154],[25,153],[15,151],[0,152]],'#a39f74');
    willows(c,r,5,150,99,false);
    pine(c,r,295,149,51,'#385c50','#728c63');
    polygon(c,[[0,194],[13,188],[28,187],[46,184],[51,186],[60,191],[73,193],[89,200],[0,200]],'#3f6050');
    polygon(c,[[0,190],[15,184],[28,185],[32,188],[19,191]],'#8e9774');
    polygon(c,[[23,188],[33,182],[43,182],[50,186],[45,188]],'#a6aa82');
    for(let i=0;i<29;i++){
      const x=r()*69,y=193+r()*8-3*Math.sin(x*.10),h=3+r()*11;
      stroke(c,[[x,y],[x+(r()-.5)*2,y-h*.47],[x+(r()-.5)*7,y-h]],i%3?'#567653':'#8f9f6b',.8);
    }
  }
  function tower(c,r) {
    sky(c,'#dcad82','#f3d4a0',175);circle(c,202,53,28,'#f3d397');clouds(c,r,18,'#f4d9ac',10);
    mountains(c,r,125,6.4,['#c2ab88','#a69d7a']);
    grove(c,r,151,[13,37],['#788368','#93a07a','#a9aa77','#beb784'],44);
    grove(c,r,162,[13,31],['#687556','#869066','#9a9866','#afaa78'],22);
    boya(c,150,178,157,true);
    polygon(c,[[0,168],[32,162],[56,164],[72,167],[90,164],[119,172],[147,173],[169,172],[191,165],[228,162],[256,162],[282,159],[300,160],[300,200],[0,200]],'#7b8461');
    polygon(c,[[0,181],[43,168],[74,171],[104,175],[141,177],[161,176],[183,172],[205,171],[233,165],[300,164],[300,201],[0,201]],'#687858');
    for(const x of [8,31,51,247,269,297]){
      const h=x<70?42+r()*39:45+r()*32;
      broadleaf(c,r,x,173+r()*6,h,'#586747',x%3?'#b69151':'#a77648','#e1b775');
    }
    pine(c,r,-1,186,112,'#304e40','#68805a');pine(c,r,282,179,64,'#375442','#71865d');
    pine(c,r,306,182,125,'#2f4c3f','#637c59');
    polygon(c,[[0,199],[0,187],[28,182],[53,184],[78,181],[103,185],[127,184],[139,181],[155,183],[186,178],[219,182],[243,177],[271,181],[301,178],[301,201]],'#4d674e');
    for(let i=0;i<86;i++){const x=r()*300,yy=185+r()*17;line(c,x,yy,x+2+r()*5,yy-1.4,i%4===0?'#b7aa74':'#7e8c61',.62);}
  }
  function roof(c,left,right,eave,rise,inset,flick,tiles,rib,shade) {
    const n=Math.max(14,Math.round((right-left)/3.3));
    const at=(u,t)=>{
      const x=left+(right-left)*u;
      return [x+(inset*(1-2*u))*t,eave-rise*(.23*t+.77*t*t)-flick*(2*u-1)**4*(1-t)**2];
    };
    const bottom=[];
    for(let i=0;i<=n;i++)bottom.push(at(i/n,0));
    const shadow=bottom.map(([x,y])=>[x,y+2.7]);
    polygon(c,[...bottom,...shadow.reverse()],shade);
    for(let i=0;i<n;i++){
      const a=i/n,b=(i+1)/n,points=[];
      for(let k=0;k<=6;k++)points.push(at(a,k/6));
      for(let k=6;k>=0;k--)points.push(at(b,k/6));
      polygon(c,points,tiles[i%tiles.length]);
      const run=[];for(let k=0;k<=7;k++)run.push(at(a,k/7));
      stroke(c,run,rib,i%5===0?.68:.35);
    }
    stroke(c,bottom,rib,1.05);
    if(right-left-2*inset>1){
      const a=at(0,1),b=at(1,1);line(c,a[0],a[1],b[0],b[1],shade,2.45);
      line(c,a[0],a[1]-.92,b[0],b[1]-.92,rib,.80);
      for(const sign of [-1,1]){
        const x=sign<0?a[0]:b[0],yy=a[1];
        polygon(c,[[x-sign*.7,yy+.5],[x+sign*1.1,yy-.4],[x+sign*3.5,yy-3.5],[x+sign*2.2,yy-4.4],[x-sign*.1,yy-3.1],[x-sign*.8,yy-1.1]],shade);
      }
    }else circle(c,(left+right)/2,eave-rise-1.1,1.7,shade);
  }
  function stoneLion(c,x,y,k,mirror){
    c.save();c.translate(x,y);c.scale(mirror?-k:k,k);
    const dark='#79796a', stone='#b6b19a',light='#d5c9a9';
    polygon(c,[[-6,0],[6,0],[6,-2],[4.5,-2.7],[4.5,-7],[5.5,-7],[5.5,-8.2],[-5,-8.2],[-5,-7],[-4.1,-7],[-4.1,-2.7],[-6,-2]],stone,dark,.61);
    rect(c,-5,-7.9,10,.75,light);rect(c,-4,-2.6,8,.60,dark);
    polygon(c,[[-4.5,-8.2],[-4.1,-10.2],[-3,-13],[-1.5,-14.2],[-2.2,-15.7],[-1.6,-18.1],[.1,-18.6],
      [1.5,-18.2],[2.6,-18.4],[3.5,-17],[3.3,-16.4],[4.6,-15.7],[4.4,-14.7],[3.1,-14.3],
      [2.5,-12.0],[2.8,-9.8],[3.8,-9.3],[3.8,-8.3],[1.4,-8.3],[.4,-11],[-.6,-9.1],[-.1,-8.2]],stone,dark,.67);
    stroke(c,[[-2.6,-13.7],[-1.9,-15.5],[-.7,-16.8],[.1,-17.6],[1.8,-17.2]],light,.86);
    circle(c,2.1,-16.4,.38,dark);c.restore();
  }
  function gate(c,r) {
    sky(c,'#b5c3a7','#e6d5ab',150);clouds(c,r,12,'#f0e4c5',7);
    polygon(c,[[0,106],[51,103],[97,107],[165,106],[237,102],[300,103],[300,147],[0,147]],'#81977b');
    grove(c,r,106,[29,61],['#789372','#8e9d73','#8eaa85','#b8b386'],28);
    grove(c,r,126,[33,72],['#4f745c','#658761','#75916d','#a2ae7d'],22);
    pine(c,r,22,133,100,'#3e6958','#759575');pine(c,r,275,129,85,'#416956','#789477');
    polygon(c,[[0,144],[300,139],[300,200],[0,200]],'#c7b494');
    for(let i=-4;i<10;i++){
      const x=14+i*55;line(c,155+(x-155)*.27,142,x,200,'#a59b7f',.74);
    }
    for(const y of [149,156,166,179,195])line(c,0,y,300,y-2.3,'#aa9e82',.65);
    for(let i=0;i<70;i++){
      const x=r()*300,y=151+r()*51;line(c,x,y,x+1.5+r()*8,y-.3,'#d9c5a0',.47);
    }
    polygon(c,[[0,110],[47,108],[47,143],[0,147]],'#a46750');
    polygon(c,[[251,110],[300,106],[300,140],[251,144]],'#a7664d');
    polygon(c,[[0,109],[48,104],[49,109],[0,114]],'#626e61');
    polygon(c,[[250,109],[300,104],[300,110],[250,114]],'#606e61');
    for(const s of [-1,1]){
      const x=s<0?37:225,w=37;
      rect(c,x,96,w,47,'#97513f');rect(c,x-.4,127,w+.9,16.4,'#a4a491');
      rect(c,x-.8,126,w+1.6,2.2,'#d0c8ae');rect(c,x+1.7,98,w-3.4,26.3,'#515a4d');
      c.save();c.beginPath();c.rect(x+2,98,w-4,26.2);c.clip();
      for(let k=-25;k<w+28;k+=4.1){
        line(c,x+k,97,x+k+28,125,'#a96953',.83);line(c,x+k,125,x+k+28,97,'#b17b61',.78);
      }
      c.restore();
      for(const t of [.05,.36,.65,.95])rect(c,x+t*w,97.1,1.35,28.4,'#ac614c');
      const xx=s<0?77:215,sgn=-s;
      polygon(c,[[xx,95],[xx+sgn*9,98],[xx+sgn*9,139],[xx,142]],'#914c3c');
      for(let j=0;j<5;j++)for(let k=0;k<3;k++)circle(c,xx+sgn*(1.5+k*2.6),100+j*8.5,.48,'#d7b275');
    }
    polygon(c,[[94,142],[104,127],[111,122],[115,122],[118,142]],'#baa98b');
    polygon(c,[[131,142],[144,118],[154,117],[171,142]],'#b5a688');
    polygon(c,[[183,142],[186,123],[191,122],[205,140]],'#bba98a');
    for(const x of [36.5,76,118.3,182.7,224.2,263]){
      rect(c,x-2.55,88,5.35,53,'#884b3c');rect(c,x-2.1,88,2.49,52,'#bd7357');
      rect(c,x-3.34,139.8,6.67,3.2,'#b9b49c');
    }
    polygon(c,[[29,84],[269,84],[266,94],[33,95]],'#a15c48');
    rect(c,32,82,235,8.45,'#507c72');rect(c,32,82,235,.84,'#c7b588');rect(c,32,89.4,235,.80,'#dbbd8d');
    for(let j=0;j<5;j++){
      const x=32+j*47;rect(c,x+1,83.2,45,5.51,'#4a6578');
      stroke(c,[[x+1,83.5],[x+9,83.5],[x+14,86],[x+8,88.5],[x+1,88.5]],'#d7bd83',.56);
      stroke(c,[[x+46,83.5],[x+38,83.5],[x+33,86],[x+39,88.5],[x+46,88.5]],'#d7bd83',.56);
      for(let k=0;k<4;k++)circle(c,x+19+k*2.6,86,.86,k%2?'#d0bc86':'#83a696');
    }
    for(let i=0;i<50;i++)rect(c,26+i*5.1,81.1,1.78,1.26,i%3?'#789783':'#a8644c');
    roof(c,19,281,80.5,24.3,27,3.0,['#70796f','#747a71','#818579','#85887b'],'#a8a999','#515f55');
    polygon(c,[[131,84],[169,83.9],[169.2,95.3],[131.1,95.4]],'#bea05d','#695b3c',.66);
    rect(c,132.8,85.35,34.8,8.52,'#334956');
    line(c,134.1,86.4,166.5,86.4,'#c6b580',.39);line(c,134.1,92.7,166.5,92.7,'#c6b580',.39);
    for (let j=0;j<4;j++) {
      const left=26-j*2.6, right=264+j*2.6, yy=143+j*1.9;
      polygon(c,[[left,yy],[right,yy-1.3],[right+1.7,yy+.3],[left-1.7,yy+1.7]],j%2?'#bab19a':'#e0cfad');
    }
    stoneLion(c,61,154,1.05,false);stoneLion(c,240,153,1.04,true);
    broadleaf(c,r,-3,147,90,'#46664f','#647d57','#9b9d68');broadleaf(c,r,307,143,74,'#476751','#66835b','#a5a86e');
    for(let i=0;i<17;i++){
      const x=3+r()*38+(i%2?252:0),y=165+r()*34;
      line(c,x,y,x+1.7+r()*3,y-1.2,'#a7936d',.75);
    }
  }
  function library(c,r){
    sky(c,'#86a6ac','#d6d6b9',146);circle(c,62,48,15,'#ebd7a7');clouds(c,r,14,'#e1e1c9',9);
    mountains(c,r,104,4.3,['#a9b5a0','#95a591']);
    grove(c,r,134,[15,41],['#698877','#809781','#879d82','#b0b48b'],30);
    polygon(c,[[0,143],[300,143],[300,201],[0,201]],'#baae94');
    for (let i=-2;i<10;i++){
      const x=i*43;line(c,147+(x-147)*.25,142,x,201,'#a09884',.57);
    }
    for(const y of [152,166,181,198])line(c,0,y+1,300,y-1.1,'#a79c84',.7);
    function block(x,y,w,h,n,rows,side){
      const base=y+h;
      polygon(c,[[x,y],[x+w,y],[x+w+side,y-3.4],[x+w+side,base-3.4],[x+w,base],[x,base]],'#a0a18d');
      rect(c,x,y,w,h,'#d1d0b9');rect(c,x,y+1.6,w,2.7,'#929686');
      const pitch=(h-7)/rows;
      for(let row=0;row<rows;row++){
        const yy=y+5.2+row*pitch;
        for(let j=0;j<n;j++){
          const xx=x+(j+.18)*w/n,ww=w/n*.60,hh=pitch*.66;
          rect(c,xx-.45,yy-.5,ww+.85,hh+1.08,'#a9a68c');
          rect(c,xx,yy,ww,hh,(j+row)%5===0?'#81958c':'#6a8681');
          rect(c,xx,yy,ww,hh*.30,'#8faaa0');line(c,xx+ww*.51,yy,xx+ww*.51,yy+hh,'#c6bd9d',.55);
          line(c,xx,yy+hh*.38,xx+ww,yy+hh*.38,'#c3bc9e',.54);
        }
        line(c,x-.5,yy+pitch*.82,x+w+.5,yy+pitch*.82,'#e0d1ae',.80);
      }
      for(let j=1;j<n;j++)line(c,x+j*w/n, y+2.15,x+j*w/n,base-1,'#bcb498',.68);
      line(c,x,base-1,x+w,base-1,'#a89c82',1.05);
    }
    const tiles=['#62746c','#647a73','#708176','#778478'];
    block(13,128,24,17,3,1,3);block(263,128,24,17,3,1,3);
    roof(c,10,40,128.7,9.8,14.6,1.5,tiles,'#97a28b','#52675d');roof(c,260,290,128.7,9.8,14.6,1.5,tiles,'#97a28c','#52675d');
    block(32,113,49,32,6,3,4);block(220,113,48,32,6,3,4);
    block(57,94,185,53,12,4,4);
    block(79,81,141,66,10,5,5);
    rect(c,111,90,77,55,'#617e83');
    for(let row=0;row<5;row++){
      const yy=91+row*10.1;
      for(let col=0;col<4;col++){
        const xx=112.3+col*18.6;
        rect(c,xx,yy,17.4,6.6,row%3?'#799aa1':'#91a9a8');
        for(let k=1;k<5;k++)line(c,xx+k*3.46,yy,xx+k*3.46,yy+6.9,'#4e6870',.59);
        line(c,xx,yy+4.0,xx+17.3,yy+4.0,'#526e72',.61);
        rect(c,xx-.3,yy+6.75,18.1,2.0,'#8e9991');
      }
    }
    block(69,94,42,52,3,4,4);block(188,94,42,52,3,4,4);
    rect(c,71.3,83.7,157,8.3,'#667970');
    for(let k=0;k<9;k++){
      const xx=71.1+k*19.5;rect(c,xx,83.6,1.38,9.4,'#d6d4b7');
      if(k<8)stroke(c,[[xx+1.3,89.8],[xx+9.7,84.1],[xx+18.4,89.8]],'#c6c9ae',.67);
    }
    line(c,69.4,92.1,230.0,92.1,'#d1ceb0',1.15);
    roof(c,61,240,83.6,19.8,26,3.40,tiles,'#a1ab93','#50695f');
    rect(c,137.8,86.2,25,3.41,'#4f625e');
    c.beginPath();c.moveTo(126.4,137.1);c.bezierCurveTo(135,125.6,164,125.6,173,137.1);
    c.lineTo(170.5,138.6);c.bezierCurveTo(160,130.7,140,130.7,128,138.7);c.closePath();c.fillStyle='#485f65';c.fill();
    c.beginPath();c.moveTo(128.0,136.3);c.bezierCurveTo(139,127.8,162,127.8,171.5,136.2);c.strokeStyle='#96a59d';c.lineWidth=.74;c.stroke();
    for(const xx of [128.1,170.6])line(c,xx,136.6,xx,145.7,'#788985',1.12);
    for(let j=0;j<6;j++){
      const y=147+j*1.55,left=93-j*2.7,right=207+j*2.7;
      polygon(c,[[left,y],[right,y-.6],[right+2.1,y+.5],[left-2.1,y+1.34]],j%2?'#bfc0aa':'#d8d3b5');
      line(c,left,y+1.35,right+1.5,y+.65,'#a2a38d',.4);
    }
    for(const xx of [91,209]){rect(c,xx-2.0,147.5,4.1,5.4,'#b8b8a0');rect(c,xx-1.75,145.8,3.5,1.7,'#697971');}
    for(const x of [2,18,35,272,289,306]){
      broadleaf(c,r,x,150+r()*5,43+r()*18,'#566e57',x%3?'#929255':'#b69a5c','#c6b47b');
    }
    polygon(c,[[0,166],[46,162],[76,164],[54,173],[0,185]],'#6c825d');
    polygon(c,[[233,165],[266,162],[300,166],[300,180],[250,173]],'#748761');
    for(let i=0;i<50;i++){
      const isLeft=i%2===0,xx=isLeft?r()*48:260+r()*41,yy=166+r()*9;
      line(c,xx,yy,xx+2.7,yy-1,'#a2a673',.65);
    }
  }
  function paintPostcard(canvas,id){
    const prints={lake:[lake,12647],tower:[tower,51203],gate:[gate,88047],library:[library,734359]};
    if(!Object.prototype.hasOwnProperty.call(prints,id)) return false;
    canvas.width=W*scale;canvas.height=H*scale;
    const c=canvas.getContext('2d',{willReadFrequently:true});
    if(!c) return false;
    const [draw,seed]=prints[id], r=random(seed);
    c.setTransform(scale,0,0,scale,0,0);c.lineJoin='round';c.lineCap='round';draw(c,r);
    c.setTransform(1,0,0,1,0,0);
    const pixels=c.getImageData(0,0,canvas.width,canvas.height), data=pixels.data;
    for(let i=0;i<data.length;i+=4){
      const ink=(r()+r()-1)*10;
      data[i]+=ink;data[i+1]+=ink*.93;data[i+2]+=ink*.79;
    }
    c.putImageData(pixels,0,0);
    return true;
  }
  window.paintPostcard=paintPostcard;
})();
