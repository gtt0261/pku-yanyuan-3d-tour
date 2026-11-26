/* Original procedural landmarks. All dimensions are metres, with the public facade facing +Z. */
(function () {
  'use strict';
  const T = THREE, TAU = Math.PI * 2, up = new T.Vector3(0, 1, 0);
  const paint = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: T.DoubleSide });
  const cube = new T.BoxGeometry(1, 1, 1);
  const sphere = new T.SphereGeometry(1, 10, 7);
  const bead = new T.SphereGeometry(1, 6, 4);
  const rods = new Map(), paints = new Map();
  const v = (x, y, z) => [x, y, z];
  const vec = a => new T.Vector3(...a);
  const fade = (a, b, f) => a + (b - a) * f;
  const mix = (a, b, f) => a.map((x, i) => fade(x, b[i], f));
  function colour(hex) {
    if (!paints.has(hex)) paints.set(hex, new T.Color(hex));
    return paints.get(hex);
  }
  function rod(sides) {
    if (!rods.has(sides)) rods.set(sides, new T.CylinderGeometry(1, 1, 1, sides));
    return rods.get(sides);
  }

  // Pack all fixed components of a material into one mesh, including the little brackets and tiles.
  class Parts {
    constructor(name) { this.name = name; this.batches = new Map(); }
    batch(material) {
      if (!this.batches.has(material)) this.batches.set(material, { p: [], n: [], c: [], uv: [], idx: [] });
      return this.batches.get(material);
    }
    add(shape, pos, scale, col, rotation, material = paint) {
      const b = this.batch(material), first = b.p.length / 3, rgb = colour(col);
      const q = rotation || new T.Quaternion();
      const m = new T.Matrix4().compose(vec(pos), q, vec(scale)), normal = new T.Matrix3().getNormalMatrix(m);
      const pp = shape.attributes.position, nn = shape.attributes.normal, uv = shape.attributes.uv;
      const point = new T.Vector3();
      for (let i = 0; i < pp.count; i++) {
        point.fromBufferAttribute(pp, i).applyMatrix4(m); b.p.push(point.x, point.y, point.z);
        point.fromBufferAttribute(nn, i).applyNormalMatrix(normal); b.n.push(point.x, point.y, point.z);
        b.c.push(rgb.r, rgb.g, rgb.b); b.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
      const index = shape.index;
      for (let i = 0, n = index ? index.count : pp.count; i < n; i++) b.idx.push(first + (index ? index.getX(i) : i));
    }
    quad(a, b, c, d, hex, mat = paint, uv = [0, 0, 1, 1]) {
      const batch = this.batch(mat), first = batch.p.length / 3, rgb = colour(hex);
      const n = vec(b).sub(vec(a)).cross(vec(d).sub(vec(a))).normalize();
      for (const p of [a, b, c, d]) {
        batch.p.push(...p); batch.n.push(n.x, n.y, n.z); batch.c.push(rgb.r, rgb.g, rgb.b);
      }
      batch.uv.push(uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]);
      batch.idx.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
    box(x, y, z, w, h, d, col, angle = 0, mat = paint) {
      this.add(cube, [x, y, z], [w, h, d], col, new T.Quaternion().setFromAxisAngle(up, angle), mat);
    }
    ball(x, y, z, a, b, c, col) { this.add(sphere, [x, y, z], [a, b, c], col); }
    beam(a, b, radius, col, sides = 8, mat = paint) {
      const dir = vec(b).sub(vec(a)), len = dir.length();
      if (len < 0.0001) return;
      const angle = new T.Quaternion().setFromUnitVectors(up, dir.divideScalar(len));
      this.add(rod(sides), mix(a, b, 0.5), [radius, len, radius], col, angle, mat);
    }
    finish() {
      const group = new T.Group(); group.name = this.name;
      for (const [mat, b] of this.batches) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
        g.setAttribute('color', new T.Float32BufferAttribute(b.c, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
        g.setIndex(b.idx); g.computeBoundingSphere();
        const obj = new T.Mesh(g, mat); obj.castShadow = true; obj.receiveShadow = true;
        group.add(obj);
      }
      return group;
    }
  }

  function octPoint(side, t, r, y, turn = 0, sides = 8) {
    const a = TAU * (side - 0.5) / sides + turn, b = a + TAU / sides;
    return [r * fade(Math.sin(a), Math.sin(b), t), y, r * fade(Math.cos(a), Math.cos(b), t)];
  }
  // Ring entries specify radius, baseline, corner rise, and the finish of the surface above them.
  function rings(p, levels, mat = paint, segments = 3, sides = 8) {
    for (let h = 1; h < levels.length; h++) {
      const lo = levels[h - 1], hi = levels[h];
      const rim = (row, face, f) => octPoint(face, f, row[0], row[1] + row[2] * (2 * f - 1) ** 4, 0, sides);
      for (let face = 0; face < sides; face++) for (let j = 0; j < segments; j++) {
        const a = j / segments, b = (j + 1) / segments;
        p.quad(rim(lo, face, a), rim(lo, face, b), rim(hi, face, b), rim(hi, face, a), lo[3], mat,
          [(face + a) * lo[0] * 0.40, lo[1] / 0.95, (face + b) * lo[0] * 0.40, hi[1] / 0.95]);
      }
    }
  }
  function tileTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const c = canvas.getContext('2d'); c.fillStyle = '#c6c0b5'; c.fillRect(0, 0, 256, 128);
    for (let row = 0; row < 8; row++) for (let i = -1; i < 6; i++) {
      const shade = 225 + ((row * 13 + (i + 3) * 17) % 23);
      c.fillStyle = 'rgb(' + [shade, shade - 2, shade - 5].join(',') + ')';
      c.fillRect(i * 64 + (row % 2) * 32 + 1, row * 16 + 1, 62, 14.7);
      c.fillStyle = 'rgba(255,255,249,.26)'; c.fillRect(i * 64 + (row % 2) * 32 + 1, row * 16 + 1, 62, 1);
    }
    const texture = new T.CanvasTexture(canvas); texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.encoding = T.sRGBEncoding; return texture;
  }
  function arch(p, face, z, y, w, h, trim, fill, faceMat, trimMat) {
    const angle = face * Math.PI / 4, s = Math.sin(angle), c = Math.cos(angle);
    const at = (x, yy, dz = 0) => [s * (z + dz) + c * x, yy, c * (z + dz) - s * x];
    const top = y + h - w / 2, line = [[-w / 2, y], [-w / 2, top]];
    const surround = [[-w / 2 - trim, y], [-w / 2 - trim, top]];
    for (let i = 1; i <= 10; i++) {
      const a = Math.PI - i * Math.PI / 10;
      line.push([Math.cos(a) * w / 2, top + Math.sin(a) * w / 2]);
      surround.push([Math.cos(a) * (w / 2 + trim), top + Math.sin(a) * (w / 2 + trim)]);
    }
    line.push([w / 2, y]); surround.push([w / 2 + trim, y]);
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      p.quad(at(...b), at(...a), at(0, y + h * 0.5), at(0, y + h * 0.49), fill, faceMat);
      p.quad(at(...a, 0.015), at(...b, 0.015), at(...surround[i], 0.045), at(...surround[i - 1], 0.045),
        i % 2 ? 0xaaa18c : 0xc1b59b, trimMat);
    }
    p.quad(at(-w/2,y), at(w/2,y), at(0,y+h*.50), at(0,y+h*.49), fill, faceMat);
  }
  function tower() {
    const p = new Parts('博雅塔'), wall = paint.clone(), light = paint.clone(), glass = paint.clone();
    wall.map = tileTexture();
    const stone = 0xa6a398, shade = 0x817e71, body = 0xb5a792, cutStone = 0xc1b7a0;
    const underside = 0x595b54, tile = 0x77786e, ridge = 0xa6a394;
    p.box(0, .17, 0, 10.8, .34, 10.8, stone);
    p.box(0, .43, 0, 10.24, .18, 10.24, shade);

    // The square platform bears a double waisted pedestal and three rows of upward lotus petals.
    rings(p, [[5.12,.52,0,stone],[5.13,.80,0,cutStone],[4.92,.96,0,shade],
      [4.73,1.12,0,stone],[4.73,1.58,0,body],[5.00,1.78,0,cutStone],[5.06,1.91,0,shade],
      [4.85,2.05,0,stone],[4.70,2.19,0,body],[4.70,2.57,0,shade],[4.95,2.78,0,cutStone],
      [5.03,2.92,0,shade],[4.76,3.06,0,stone],[4.53,3.18,0,body],[4.22,4.40,0,body]],wall,2);
    for(let side=0;side<8;side++) for(let row=0;row<3;row++) for(let k=0;k<6;k++){
      const t=(k+.5+(row%2)*.20)/6, r=4.70-row*.13, y=3.02+row*.37;
      const a=octPoint(side,t-.070,r,y+.12), b=octPoint(side,t+.070,r,y+.12);
      const foot=octPoint(side,t,r+.09,y-.07), crest=octPoint(side,t,r-.02,y+.46);
      const fold=octPoint(side,t,r+.15,y+.15);
      p.quad(foot,b,crest,fold,cutStone); p.quad(foot,fold,crest,a,0x9d9788);
    }
    rings(p,[[4.23,4.37,0,body],[4.15,8.91,0,body],[4.15,9.48,0,body]],wall,2);
    rings(p,[[4.28,4.30,0,stone],[4.28,4.48,0,cutStone],[4.22,4.55,0,body]],paint,1);
    for(let side=0;side<8;side++){
      const angle=side*Math.PI/4, normal=[Math.sin(angle),Math.cos(angle)];
      const at=(x,y,d)=>[normal[0]*d+normal[1]*x,y,normal[1]*d-normal[0]*x];
      const windowSide=side%2===1, z=3.913, y=windowSide?5.37:4.48, w=windowSide?1.25:1.43, h=windowSide?2.47:3.49;
      arch(p,side,z,y,w,h,.18,windowSide?0x504d41:0x594d40,glass,paint);
      if(windowSide){
        const top=y+h-w/2;
        for(let i=-2;i<=2;i++){
          const xx=i*w*.162, yy=top+Math.sqrt(w*w/4-xx*xx);
          p.beam(at(xx,y+.03,z+.022),at(xx,yy-.07,z+.022),.026,stone,5);
        }
        for(let j=1;j<=4;j++) p.beam(at(-w*.46,y+j*.38,z+.025),at(w*.46,y+j*.38,z+.025),.024,cutStone,5);
      } else {
        p.beam(at(0,y+.02,z+.03),at(0,y+h-.10,z+.03),.026,shade,4);
        for(let row=0;row<3;row++)for(let col=0;col<4;col++){
          const pos=at((col-1.5)*.31,y+.35+row*.53,z+.047);p.add(bead,pos,[.035,.035,.035],0xac9673);
        }
      }
      const pillar=octPoint(side,0,4.19,4.50), top=octPoint(side,0,4.14,9.12);
      p.beam(pillar,top,.11,0xb7ad98,7);
    }

    // The upper mass is nearly cylindrical. The thirteenth eave carries a full pavilion roof.
    let y=10.36;
    const radius=t=>4.22-.48*t-.23*t*t;
    for(let i=0;i<13;i++){
      const t=i/12,r=radius(t), e=r+1.35-.13*t, next=y+2.08-.032*i;
      rings(p,[[r,y-.89,0,shade],[r+.11,y-.77,0,cutStone],[r+.12,y-.67,0,shade],
        [r+.34,y-.53,.02,stone],[r+.34,y-.42,.02,underside],[e-.32,y-.21,.12,shade],
        [e,y-.02,.20,underside],[e,y+.06,.20,ridge]],paint,4);
      rings(p,[[e,y+.06,.20,cutStone],[e-.12,y+.14,.18,ridge],[e-.25,y+.17,.13,ridge]],light,4);
      if(i<12){
        rings(p,[[e-.25,y+.17,.13,tile],[r+.42,y+.29,.035,ridge],[r-.02,y+.51,0,tile]],paint,4);
        rings(p,[[r-.02,y+.46,0,body],[radius((i+1)/12),next-.73,0,body]],wall,2);
      }
      for(let side=0;side<8;side++){
        const a=side*Math.PI/4, dot=(s,h,rr)=>octPoint(side,s,rr,h);
        for(const u of [.16,.49,.82]){
          const below=dot(u,y-.71,r+.10), upper=dot(u,y-.47,r+.33);
          p.box(...below,.37,.21,.57,0x968e78,a);
          p.box(...upper,.82,.18,.64,0xaaa18a,a);
          const arm=dot(u,y-.31,r+.70);p.box(...arm,.30,.19,.88,0x817e6d,a);
        }
        if(i<12 && (i+side)%3===0){
          const pos=dot(.5,y+.76,r+.01);p.box(...pos,.22,.42,.065,0x5f5a48,a,glass);
        }
      }
      if(i<12)y=next;
    }
    const roof=[[4.73,y+.075,.20,tile],[4.29,33.58,.12,0x988f77],[3.39,33.77,.05,0x9d9177],
      [2.42,34.12,.02,0xa08e73],[1.59,34.62,0,0xa78e70],[.88,35.23,0,0xa18c70],
      [.34,36.00,0,0xb39d7f]];
    rings(p,roof,light,5);
    for(let side=0;side<8;side++)for(let j=0;j<13;j++){
      const u=j/13,bend=(2*u-1)**4;
      for(let k=1;k<roof.length;k++) {
        const lo=roof[k-1], hi=roof[k], rr=j===0?.047:.020;
        const point=(row,t)=>octPoint(side,t,row[0],row[1]+row[2]*bend+rr);
        p.quad(point(lo,u),point(lo,u+.015),point(hi,u+.015),point(hi,u),j===0?0xb5a78c:0xb0a184);
      }
      if(j===0) for(let k=1;k<4;k++){
        const rr=4.24-k*.40, yy=33.60+k*.15, pos=octPoint(side,0,rr,yy);
        p.add(bead,[pos[0],yy,pos[2]],[.087,.135,.087],0x817d69);
      }
    }
    rings(p,[[.43,35.95,0,cutStone],[.39,36.14,0,ridge],[.31,36.25,0,shade],
      [.34,36.39,0,cutStone],[.27,36.63,0,stone],[.13,36.70,0,shade],[.035,37,0,stone]],light,2);
    const g=p.finish();
    g.userData.setNight=on=>{
      wall.emissive.setHex(on?0x93603a:0); wall.emissiveIntensity=on?.49:0;
      light.emissive.setHex(on?0xffa957:0); light.emissiveIntensity=on?.88:0;
      glass.emissive.setHex(on?0xe5a45f:0); glass.emissiveIntensity=on?.55:0;
    };
    g.userData.setNight(false); return g;
  }

  function plaque(p, text, x, y, z, w, h, lightBackground = false) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = lightBackground ? '#ddd2bb' : '#273d51'; c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = lightBackground ? '#ac9e83' : '#bea66c'; c.lineWidth = 4;
    c.strokeRect(10, 10, 1004, 236); c.lineWidth = 1.8; c.strokeRect(18, 18, 988, 220);
    c.font = (text.length > 5 ? 'bold 123px' : 'bold 164px') + ' KaiTi, STKaiti, "Noto Serif SC", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = lightBackground ? '#59493f' : '#e6c783';
    [...text].forEach((char, i) => c.fillText(char, 94 + (i + .5) * (836 / text.length), 136));
    const texture = new T.CanvasTexture(canvas); texture.encoding = T.sRGBEncoding;
    const m = new T.MeshStandardMaterial({ map: texture, roughness: .88, vertexColors: true, side: T.DoubleSide });
    p.quad([x - w/2, y - h/2, z], [x + w/2, y - h/2, z], [x + w/2, y + h/2, z], [x - w/2, y + h/2, z], 0xffffff, m);
  }

  // A concave tile run rises to the ridge. Narrow raised courses follow that same curved surface.
  function hipRoof(p, x, y, z, w, d, rise, ridge, corner, tiles, rib, spacing) {
    const corners = [[-w/2, d/2],[w/2,d/2],[w/2,-d/2],[-w/2,-d/2]];
    const ridgeEnds = [[-ridge/2,0],[ridge/2,0],[ridge/2,0],[-ridge/2,0]];
    for (let face = 0; face < 4; face++) {
      const i = face, j = (face+1) % 4;
      const n = Math.max(4, Math.ceil((face % 2 ? d : w) / spacing));
      const at = (s, t, lift = 0) => {
        const e = mix(corners[i], corners[j], s), peak = mix(ridgeEnds[i], ridgeEnds[j], s);
        return [x + fade(e[0],peak[0],t), y + rise * (.19 * t + .81 * t * t) +
          corner * (2 * s - 1) ** 4 * (1 - t) ** 2 + lift, z + fade(e[1], peak[1], t)];
      };
      for (let k = 0; k < n; k++) {
        const a = k / n, b = (k+1) / n;
        const bottomA = at(a,0,-.19), bottomB = at(b,0,-.19);
        p.quad(bottomA,bottomB,at(b,0),at(a,0),rib);
        for (let row = 0; row < 4; row++) {
          const t = row / 4, t2 = Math.min(.9994,(row+1) / 4), c = a + (b-a) * .15;
          p.quad(at(a,t,.018),at(c,t,.041),at(c,t2,.041),at(a,t2,.018),rib);
          p.quad(at(a,t),at(b,t),at(b,t2),at(a,t2),tiles[(k + 3 * face) % tiles.length]);
        }
      }
      for (let k = 0; k < 5; k++) p.beam(at(0,k/5,.064),at(0,(k+1)/5,.064),Math.max(.095,spacing*.21),rib,7);
    }
    if (ridge > .1) {
      p.beam([x-ridge/2, y+rise+.09,z],[x+ridge/2,y+rise+.09,z],Math.max(.14,spacing*.36),rib);
      for (const s of [-1,1]) {
        p.beam([x+s*ridge/2,y+rise+.09,z],[x+s*(ridge/2+.22),y+rise+.42,z],Math.max(.12,spacing*.21),rib);
      }
    }
  }
  function lion(p, x, z, k) {
    const col = 0xbab2a0, light = 0xcac2af, shadow = 0x817f73;
    const b = (dx,y,dz,w,h,d,c) => p.box(x+dx*k,y*k,z+dz*k,w*k,h*k,d*k,c);
    const s = (dx,y,dz,a,h,d,c) => p.ball(x+dx*k,y*k,z+dz*k,a*k,h*k,d*k,c);
    b(0,.13,0,1.13,.26,1.42,shadow); b(0,.56,0,.95,.61,1.18,col); b(0,.93,0,1.15,.16,1.43,light);
    s(0,1.43,-.13,.46,.48,.49,col); s(0,1.71,.13,.36,.52,.39,col);
    s(0,2.08,.17,.42,.42,.39,col); s(0,1.97,.48,.29,.17,.21,light);
    for (const side of [-1,1]) {
      s(side*.23,1.27,.30,.12,.26,.15,col); s(side*.23,1.08,.40,.16,.10,.23,light);
      s(side*.35,2.29,.08,.13,.15,.13,light); s(side*.165,2.13,.48,.055,.055,.055,shadow);
    }
    for (let i=0;i<10;i++) {const a=i*TAU/10;s(.36*Math.sin(a),2.16+.20*Math.cos(a),.02,.15,.16,.13,light);}
  }
  let paintedTimber;
  function beamPainting() {
    if(paintedTimber)return paintedTimber;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
    const c=canvas.getContext('2d'), gold='#d6bc74', cream='#e8dbad';
    c.fillStyle='#32646c';c.fillRect(0,0,512,80);
    c.fillStyle='#314f7c';c.fillRect(0,8,512,63);
    for(const y of [2,7,68,75]){c.fillStyle=y%2?cream:gold;c.fillRect(0,y,512,2);}
    function stroke(points,col,width){
      c.beginPath();c.moveTo(...points[0]);for(const pt of points.slice(1))c.lineTo(...pt);c.strokeStyle=col;c.lineWidth=width;c.stroke();
    }
    for(const x of [0,512]){
      const sign=x===0?1:-1;
      stroke([[x+sign*4,12],[x+sign*46,12],[x+sign*78,39],[x+sign*46,66],[x+sign*4,66]],'#79a597',8);
      stroke([[x+sign*5,12],[x+sign*46,12],[x+sign*78,39],[x+sign*46,66],[x+sign*5,66]],gold,2);
      for(let j=0;j<4;j++){
        c.beginPath();c.arc(x+sign*(95+j*18),39,17-j*.8,0,Math.PI*2);
        c.strokeStyle=j%2?'#7fb5ab':gold;c.lineWidth=2;c.stroke();
      }
      stroke([[x+sign*125,10],[x+sign*166,10],[x+sign*188,22],[x+sign*206,22]],cream,2);
      stroke([[x+sign*125,70],[x+sign*166,70],[x+sign*188,58],[x+sign*206,58]],cream,2);
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,x=256+17*Math.cos(a),y=40+12*Math.sin(a);
      c.beginPath();c.ellipse(x,y,12,6,a,0,Math.PI*2);c.fillStyle=i%2?'#9fb99c':'#82a19a';c.fill();
      c.lineWidth=1.8;c.strokeStyle=gold;c.stroke();
    }
    c.fillStyle=cream;c.fillRect(252,36,8,8);
    const map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;
    paintedTimber=new T.MeshStandardMaterial({map,roughness:.83,vertexColors:true,side:T.DoubleSide});
    return paintedTimber;
  }
  function crossLattice(p,at,halfWidth,low,high,gap,color) {
    const h=high-low;
    for(const slope of [-1,1])for(let k=-halfWidth-h;k<halfWidth+h;k+=gap){
      const lo=Math.max(-halfWidth,slope>0?k:k-h),hi=Math.min(halfWidth,slope>0?k+h:k);
      if(hi-lo<.03)continue;
      const aa=low+slope*(lo-k),bb=low+slope*(hi-k),thick=.026;
      p.quad(at(lo,aa),at(hi,bb),at(hi,bb+thick),at(lo,aa+thick),color);
    }
  }
  function gate() {
    const p=new Parts('西校门'), red=0x9b4437, dark=0x753b32, jade=0x438076, cream=0xccbc90;
    const sill=0xa7a79c, trim=0x83877c;
    p.box(0,.115,0,21.6,.23,5.85,0xb2b0a1);
    for(let i=0;i<3;i++)p.box(0,.045*(i+1),3.29-i*.22,15.08,.09*(i+1),.32,0xbebcaf);
    for(const x of [-9.85,-6.42,-2.18,2.18,6.42,9.85])for(const z of [-1.83,1.81]){
      p.beam([x,.23,z],[x,.52,z],.325,sill,12);p.beam([x,.49,z],[x,4.64,z],.225,red,12);
      p.box(x,4.28,z,.64,.24,.72,jade);p.box(x,4.55,z,.79,.20,.84,cream);
    }
    for(const s of [-1,1]){
      const cx=s*8.17;
      p.box(cx,1.01,0,3.44,1.60,3.68,0x9b9c91);p.box(cx,1.86,0,3.53,.18,3.81,0xc9c6b7);
      p.box(cx,3.01,0,3.36,2.30,3.42,dark);
      for(const face of [-1,1]){
        const at=(xx,yy)=>[cx+xx,yy,face*1.774];
        p.quad(at(-1.54,2.04),at(1.54,2.04),at(1.54,4.08),at(-1.54,4.08),0x484c43);
        crossLattice(p,(x,y)=>[cx+x,y,face*1.788],1.52,2.08,4.03,.20,0xb36a55);
        for(const xx of [-1.60,-.54,.54,1.60])p.box(cx+xx,3.05,face*1.80,.12,2.27,.15,red);
        for(const yy of [1.96,4.12])p.box(cx,yy,face*1.80,3.33,.13,.14,red);
      }
      p.box(s*10.54,1.04,0,1.33,2.01,.72,0x9b9b8e);
      hipRoof(p,s*10.54,2.07,0,1.55,1.04,.28,.91,.04,[0x777b73],0x93968c,.27);
      const angle=-s*.98, ca=Math.cos(angle),sa=Math.sin(angle);
      const hinge=s*6.08, map=(xx,yy,zz)=>[hinge+ca*xx+sa*zz,yy,-.92-sa*xx+ca*zz];
      const leaf=pnt=>map(s*pnt,2.01,0);
      p.box(...leaf(-.84),1.68,3.48,.15,red,angle);
      for(let k=0;k<5;k++)for(let j=0;j<5;j++){
        const pt=map(s*(-.20-k*.30),.62+.62*j,.094);p.add(bead,pt,[.040,.040,.045],0xbca36c);
      }
      p.box(s*2.39,2.01,-.94,.22,3.49,1.68,dark);
      lion(p,s*6.35,4.14,1.05);
    }
    for(const s of [-1,1]){
      p.box(0,4.61,s*1.84,20.28,.69,.49,red);
      p.box(0,4.99,s*1.93,20.60,.25,.57,jade);
      for(const [a,b] of [[-9.88,-6.45],[-6.38,-2.23],[-2.14,2.14],[2.23,6.38],[6.45,9.88]]){
        p.quad([a,4.40,s*2.10],[b,4.40,s*2.10],[b,4.92,s*2.10],[a,4.92,s*2.10],0xffffff,beamPainting());
      }
      for(let i=0;i<61;i++){
        const x=-10.2+i*.34;
        p.beam([x,5.06,s*2.08],[x,5.15,s*2.97],.079,i%3?0x416d61:0x9c4e3c,8);
      }
    }
    p.box(0,5.07,0,20.33,.20,4.44,0x6d5648);
    hipRoof(p,0,5.19,0,22.24,6.34,2.19,17.33,.22,[0x798078,0x707870,0x898d82],0xa0a195,.240);
    p.box(0,4.45,2.27,3.35,1.04,.13,0xbc9757);
    plaque(p,'北京大学',0,4.45,2.341,3.26,.97);
    return p.finish();
  }

  function windowMaterial() {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const c = canvas.getContext('2d'), g = c.createLinearGradient(0,0,30,128);
    g.addColorStop(0,'#90acb7'); g.addColorStop(.47,'#648898'); g.addColorStop(.49,'#536e77'); g.addColorStop(1,'#3e5358');
    c.fillStyle=g; c.fillRect(0,0,128,128);
    c.strokeStyle='#465c64'; c.lineWidth=7; c.strokeRect(1,1,126,126);
    c.fillStyle='#56686b'; c.fillRect(0,32,128,3); c.fillRect(62,0,3,128);
    c.fillStyle='#9faeae'; c.fillRect(1,35,126,1);c.fillRect(65,1,1,127);
    const texture = new T.CanvasTexture(canvas); texture.encoding = T.sRGBEncoding;
    return new T.MeshStandardMaterial({map:texture,roughness:.54,vertexColors:true,side:T.DoubleSide});
  }
  function library() {
    const p = new Parts('北京大学图书馆'), windows = windowMaterial();
    const limestone=0xc9cbc0, light=0xdadbd1, shadow=0xa2a59a, teal=0x959d92;
    const tile=[0x62736c,0x66746d,0x718077,0x748079], tileEdge=0x92998a;
    function facade(x,z,w,d,top,floors,columns) {
      p.box(x,top/2,z,w,top,d,limestone);
      p.box(x,.61,z,w+.3,1.22,d+.3,shadow);
      const corners = [[x-w/2,z+d/2],[x+w/2,z+d/2],[x+w/2,z-d/2],[x-w/2,z-d/2]];
      const height = (top-2.65)/floors;
      for(let f=0;f<4;f++) {
        const a=corners[f], b=corners[(f+1)%4], n=f%2 ? Math.max(3,Math.round(columns*d/w)) : columns;
        const dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz);
        const at=(s,y,dist) => [a[0]+dx*s - dz/len*dist,y,a[1]+dz*s + dx/len*dist];
        for(let col=0;col<n;col++){
          const left=(col+.19)/n,right=(col+.81)/n;
          for(let row=0;row<floors;row++){
            const bottom=1.22+row*height,upper=bottom+height*.73;
            p.quad(at(left,bottom,.035),at(right,bottom,.035),at(right,upper,.035),at(left,upper,.035),
              (col+row*2)%5===0 ? 0xe8dfc9 : 0xffffff,windows);
          }
          if(col) {
            const mid=at(col/n,top/2+.05,.03);
            p.box(...mid,f%2?.24:.42,top-.42,f%2?.42:.24,light);
          }
        }
      }
      for (let i=0;i<floors;i++) p.box(x,1.13+i*height,z,w+.28,.15,d+.28,light);
      p.box(x,top-.51,z,w+.68,.36,d+.62,light); p.box(x,top-.12,z,w+.80,.26,d+.80,teal);
    }
    // The east building has a 100 m main block and two smaller pyramidal halls on its 122 m frontage.
    facade(0,-13,99.4,28.2,17.6,4,13);
    facade(0,-6.3,58.4,29.4,21.6,5,8);
    for(const s of [-1,1]) {
      facade(s*26.0,6.0,22.2,24.1,18.3,4,3);
      facade(s*43.15,-2.7,11.8,19.8,13.0,3,2);
      p.box(s*48.5,2.89,-.45,8.4,5.78,5.7,0xb9b9ab,s*.36);
      p.box(s*48.5,5.87,-.45,8.8,.34,6.1,0x8e9489,s*.36);
      facade(s*53.45,1.25,12.7,14.75,7.55,2,3);
      hipRoof(p,s*53.45,7.56,1.25,15.10,16.7,3.65,0,.45,tile,tileEdge,.43);
    }
    const darkStone=0x777b76, grayStone=0x929b98, frame=0x324f57;
    for(let row=0;row<5;row++) {
      const y=1.05+row*3.95;
      for(let bay=-2;bay<2;bay++){
        const x0=bay*7.5+.31,x1=(bay+1)*7.5-.31;
        p.quad([x0,y,9.68],[x1,y,9.68],[x1,y+2.77,9.68],[x0,y+2.77,9.68],0xd7e3e4,windows);
        p.box((x0+x1)/2,y+2.85,10.10,x1-x0+.36,.30,1.16,darkStone);
        p.box((x0+x1)/2,y+3.26,10.32,x1-x0+.45,.80,.50,grayStone);
        for(let col=1;col<6;col++)p.box(x0+(x1-x0)*col/6,y+1.39,9.76,.076,2.76,.13,frame);
        p.box((x0+x1)/2,y+1.88,9.78,x1-x0,.073,.13,frame);
      }
    }
    for(let j=-2;j<=2;j++)p.box(j*7.5,10.58,10.19,.63,20.35,1.03,0x818981);
    // The upper open arcade, cantilevered gray-tile roof and bowed entrance canopy define the east elevation.
    for(let j=-4;j<=4;j++){
      const x=j*7.5;
      p.box(x,21.16,10.88,.48,4.45,.56,light);
      if(j<4)for(const sign of [-1,1]){
        p.beam([x+3.75,22.81,10.91],[x+3.75+sign*3.35,20.30,10.91],.11,limestone,4);
      }
      p.beam([x,21.28,10.95],[x,23.11,13.30],.13,light,5);
    }
    p.box(0,23.02,-6.1,67.75,.44,36.15,light);
    hipRoof(p,0,23.19,-6.10,74.5,41.85,4.25,51.5,1.13,tile,tileEdge,.37);
    p.box(0,21.15,11.18,8.0,1.34,.16,0x7e7c6b);
    plaque(p,'北京大学图书馆',0,21.15,11.268,7.8,1.23);
    for(let i=0;i<5;i++) {
      const a=-7.65+i*3.06,b=a+2.92;
      p.quad([a,1.09,12.39],[b,1.09,12.39],[b,4.16,12.39],[a,4.16,12.39],0xb3c6c4,windows);
      p.box(a,2.62,12.48,.11,3.08,.14,frame);
    }
    p.box(0,1.03,16.80,33.8,.18,8.88,light);
    function canopy(u,z){
      return [u*8.20,4.52+1.90*(1-u*u)+(z-15)*.062,z];
    }
    for(let i=0;i<14;i++){
      const a=-1+i/7,b=a+1/7;
      p.quad(canopy(a,12.55),canopy(b,12.55),canopy(b,21.16),canopy(a,21.16),
        [0x607b80,0x69888b,0x849896][i%3]);
      for(const z of [12.55,15.35,18.22,21.16])p.beam(canopy(a,z),canopy(b,z),.105,frame,6);
      p.beam(canopy(a,12.55),canopy(a,21.16),.051,0x95a3a0,5);
    }
    p.beam(canopy(1,12.55),canopy(1,21.16),.061,frame,6);
    for(const s of [-1,1]){
      p.beam([s*7.68,1.09,20.1],[s*7.68,4.94,20.1],.18,0x9ca5a0,12);
      p.box(s*20.22,1.0,23.6,1.82,2,1.90,limestone);
      p.box(s*20.22,2.22,23.6,1.51,.44,1.59,0x616d67);
    }
    for(let i=0;i<7;i++){
      const depth=6.30-i*.74;
      p.box(0,(i+1)*.080,21.18+depth/2,40.10,(i+1)*.16,depth,i%2?light:0xc9c8ba);
    }
    return p.finish();
  }

  function pavilion() {
    const p=new Parts('鲁斯亭'), stone=0xa8a79a, red=0xab5140, jade=0x47785f, dark=0x686a60, ochre=0xc2aa77;
    rings(p,[[5.88,0,0,stone],[5.88,.23,0,0xaaa28f],[5.74,.28,0,stone],[5.66,1.28,0,0xc0b49a],
      [5.84,1.41,0,0xc2b69d],[5.84,1.52,0,0xb6ac96],[.01,1.52,0,stone]],paint,1);
    for(let i=0;i<6;i++) {
      const depth=(6-i)*.30+.17;
      p.box(0,(i+1)*.113,5.0+depth/2,2.25,(i+1)*.226,depth,stone);
    }
    rings(p,[[4.20,1.52,0,0xa19f8e],[4.20,2.23,0,0x9e9b89],[4.20,2.33,0,0x703f37],
      [4.20,4.43,0,0x775245]],paint,1);
    for(let side=0;side<8;side++){
      const a=octPoint(side,0,4.95,1.50), b=octPoint(side,1,4.95,1.50);
      const at=(t,y,r=4.95)=>octPoint(side,t,r,y);
      p.beam(a,[a[0],4.88,a[2]],.165,red,10);
      p.beam(at(0,4.55),at(1,4.55),.125,jade,6); p.beam(at(0,4.72),at(1,4.72),.17,red,6);
      p.quad(at(.02,4.45,5.04),at(.98,4.45,5.04),at(.98,4.86,5.04),at(.02,4.86,5.04),0xffffff,beamPainting());
      for (const t of [.13,.50,.87]) {
        p.beam(at(t,4.48),at(t,4.78,5.26),.105,ochre,5);
        p.beam(at(t-.06,4.69,5.19),at(t+.06,4.69,5.19),.085,jade,5);
      }
      if(side!==0) {
        p.beam(at(.03,2.23),at(.97,2.23),.075,red);
        p.beam(at(.03,1.73),at(.97,1.73),.055,jade);
        for(let j=0;j<7;j++){
          const t=.035+j*.134;
          p.beam(at(t,1.76),at(t+.13,2.22),.035,jade,5);
          p.beam(at(t,2.22),at(t+.13,1.76),.035,jade,5);
        }
      }
      const r=4.23, lower=side===0?1.53:2.32;
      p.quad(at(.07,lower,r),at(.93,lower,r),at(.93,4.35,r),at(.07,4.35,r),0x527b62);
      for(let j=0;j<4;j++){
        const l=.09+j*.204, rr=l+.183;
        p.quad(at(l,2.91,r+.026),at(rr,2.91,r+.026),at(rr,4.12,r+.026),at(l,4.12,r+.026),0x9baaa0);
        p.beam(at(l,lower,r+.042),at(l,4.20,r+.042),.043,jade,6);
        for(const yy of [3.00,3.58,4.09])p.beam(at(l,yy,r+.044),at(rr,yy,r+.044),.026,jade,4);
        p.beam(at(l,3.63,r+.050),at(rr,4.04,r+.050),.023,jade,4);
        p.beam(at(l,4.04,r+.050),at(rr,3.63,r+.050),.023,jade,4);
        if(side===0)p.quad(at(l+.015,1.72,r+.031),at(rr-.015,1.72,r+.031),
          at(rr-.015,2.62,r+.031),at(l+.015,2.62,r+.031),0x548363);
      }
      for(const yy of [lower+.06,2.82,4.21])p.beam(at(.065,yy,r+.041),at(.935,yy,r+.041),.057,jade,5);
      p.beam(at(0,1.52,r),at(0,4.56,r),.12,red,8);
      p.beam(a,b,.05,stone,5);
    }
    const levels=[[4.75,4.48,0,0x76463a],[5.65,4.75,.27,0x555b50],[6.18,4.80,.49,0x85847b],
      [6.19,4.98,.50,0x777a72],[5.15,5.15,.32,0x71756e],[3.87,5.55,.15,0x74786e],
      [2.78,6.05,.055,0x777c73],[1.65,6.91,.015,0x818177],[.70,7.95,0,0x888779],
      [.32,8.08,0,0x9b9071]];
    rings(p,levels,paint,5);
    for(let side=0;side<8;side++) for(let j=0;j<15;j++) {
      const t=j/15, bend=(2*t-1)**4;
      for(let k=4;k<levels.length-1;k++) {
        const lo=levels[k-1], hi=levels[k], a=octPoint(side,t,lo[0],lo[1]+lo[2]*bend+.035);
        const b=octPoint(side,t,hi[0],hi[1]+hi[2]*bend+.035);
        if(j===0)p.beam(a,b,.102,0xa8a598,6);
        else {
          const left=octPoint(side,t-.012,lo[0],a[1]-.023), right=octPoint(side,t+.012,lo[0],a[1]-.023);
          const topLeft=octPoint(side,t-.012,hi[0],b[1]-.023),topRight=octPoint(side,t+.012,hi[0],b[1]-.023);
          p.quad(left,a,b,topLeft,0x9b9d91);p.quad(a,right,topRight,b,0x868b7e);
        }
      }
      if(j===0)for(let k=0;k<3;k++)p.add(bead,octPoint(side,0,5.68-.37*k,5.59+k*.014),
        [.095,.125,.090],0x8a897b);
    }
    rings(p,[[.38,7.92,0,dark],[.35,8.17,0,stone],[.44,8.26,0,0xa5a18f],
      [.35,8.41,0,0xa9a591],[.37,8.64,0,0xb1ad9b],[.25,8.81,0,stone],[.11,8.90,0,dark],
      [.035,9.18,0,dark]],paint,2);
    return p.finish();
  }

  function bicycle() {
    const p=new Parts('共享单车'), gold=0xe8a62d, bright=0xf1bc47, black=0x303b3b, silver=0xa9b8b1, steel=0x60716c;
    const wheelY=.36, back=-.55, front=.55, pedal=[0,.32,-.11], saddle=[0,.76,-.25], neck=[0,.82,.40];
    const axle = new T.Quaternion().setFromAxisAngle(up,Math.PI/2);
    for(const z of [back,front]) {
      const c=[0,wheelY,z];
      for(const [radius,gauge,colour] of [[.328,.032,black],[.303,.014,silver]]) {
        const ring=new T.TorusGeometry(radius,gauge,6,28); p.add(ring,c,[1,1,1],colour,axle);
      }
      p.beam([-.061,wheelY,z],[.061,wheelY,z],.032,steel);
      for(let i=0;i<16;i++){
        const a=TAU*i/16;
        p.beam([i%2?.035:-.035,wheelY,z],[0,wheelY+.295*Math.cos(a),z+.295*Math.sin(a)],.0049,silver,4);
      }
      for(let i=0;i<9;i++){
        const a=-1.38+i*.27,b=a+.27;
        const mud=(t,x)=>[x,wheelY+.371*Math.cos(t),z+.371*Math.sin(t)];
        p.quad(mud(a,-.037),mud(a,.037),mud(b,.037),mud(b,-.037),z===back?gold:steel);
      }
    }
    for(const side of [-1,1]) {
      const rear=[side*.052,wheelY,back], fork=[side*.050,wheelY,front];
      p.beam(rear,[side*.034,.71,-.24],.020,gold); p.beam(rear,[side*.03,.33,-.11],.019,gold);
      p.beam(fork,[side*.039,.72,.415],.021,bright);
      p.beam([side*.035,.33,-.11],[side*.103,.33+side*.085,-.11+side*.05],.013,steel);
      p.box(side*.113,.33+side*.085,-.11+side*.05,.084,.024,.066,black);
    }
    p.beam(pedal,saddle,.035,gold);
    p.beam(pedal,[0,.40,.17],.049,gold); p.beam([0,.40,.17],neck,.047,gold);
    p.beam([0,.55,-.19],[0,.50,.20],.024,bright); p.beam([0,.50,.20],[0,.79,.38],.026,bright);
    p.beam([0,.71,.425],[0,.91,.372],.032,gold);
    p.beam([0,.90,.372],[0,1.01,.389],.020,silver);
    p.beam(saddle,[0,.87,-.285],.022,steel); p.ball(0,.89,-.29,.101,.037,.147,black);
    for(const side of [-1,1]) {
      p.beam([0,1.01,.389],[side*.139,1.044,.383],.016,steel);
      p.beam([side*.139,1.044,.383],[side*.232,1.033,.302],.021,black);
      p.beam([side*.151,1.022,.378],[side*.209,1.004,.328],.009,silver);
    }
    const low=[[-.114,.77,.50],[.114,.77,.50],[.114,.77,.67],[-.114,.77,.67]];
    const high=[[-.157,.98,.47],[.157,.98,.47],[.157,.98,.74],[-.157,.98,.74]];
    for(let i=0;i<4;i++) {
      const j=(i+1)%4;
      p.beam(low[i],low[j],.011,black,5); p.beam(high[i],high[j],.012,black,5); p.beam(low[i],high[i],.01,black,5);
      p.beam(mix(low[i],high[i],.52),mix(low[j],high[j],.52),.006,black,4);
      for(let k=1;k<5;k++) p.beam(mix(low[i],low[j],k/5),mix(high[i],high[j],k/5),.0055,black,4);
    }
    p.box(0,.773,.586,.224,.014,.171,steel);
    p.ball(0,.766,.68,.029,.021,.018,0xf3e3a9);
    p.beam([-.04,.30,-.18],[-.19,.007,-.30],.012,steel,6);
    return p.finish();
  }

  const cache=new Map();
  function shared(make) {
    if(!cache.has(make)) cache.set(make,make());
    return cache.get(make).clone();
  }
  window.CampusArt = {tower,gate:()=>shared(gate),library:()=>shared(library),
    pavilion:()=>shared(pavilion),bicycle:()=>shared(bicycle)};
})();
