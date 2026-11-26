const assert = require('node:assert/strict');
const THREE = require('../dist/vendor/three.min.js');
global.THREE = THREE;
global.window = {};
const context = {fillRect(){}, strokeRect(){}, fillText(){}, beginPath(){}, moveTo(){}, lineTo(){},
  stroke(){}, fill(){}, arc(){}, ellipse(){}, createLinearGradient(){return {addColorStop(){}};}};
global.document = {createElement: () => ({getContext: () => context})};
require('../dist/landmarks.js');

const art = window.CampusArt;
const dims = {tower: [36.99,37.01], gate: [7,8.1], library: [27,30], pavilion: [9,10], bicycle: [1,1.2]};
for (const [name, [min,max]] of Object.entries(dims)) {
  const model = art[name]();
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.min.y > -.06 && bounds.min.y <= .01, name+' base');
  assert.ok(bounds.max.y > min && bounds.max.y < max, name+' height');
  assert.ok(model.children.length >= 1 && model.children.length <= 5, name+' draw budget');
  let faces = 0;
  for (const mesh of model.children) {
    const g = mesh.geometry;
    assert.equal(g.attributes.position.count, g.attributes.normal.count);
    assert.equal(g.attributes.position.count, g.attributes.uv.count);
    assert.ok(g.attributes.position.array.every(Number.isFinite), name+' positions');
    assert.ok(g.attributes.normal.array.every(Number.isFinite), name+' normals');
    assert.ok(g.index.array.every(i => i < g.attributes.position.count), name+' indices');
    faces += g.index.count / 3;
  }
  if(name === 'tower') {
    const lit = () => model.children.filter(m => m.material.emissive.getHex() && m.material.emissiveIntensity).length;
    assert.equal(lit(),0); model.userData.setNight(true); assert.equal(lit(),3);
    model.userData.setNight(false); assert.equal(lit(),0);
    // Thirteen shallow overhanging bands must stay broad up to the octagonal roof.
    const edges=[];
    for(let i=0,y=10.36;i<13;y+=2.08-.032*i,i++){
      let radius=0;
      for(const mesh of model.children) {
        const verts=mesh.geometry.attributes.position;
        for(let j=0;j<verts.count;j++)if(Math.abs(verts.getY(j)-y)<.29)
          radius=Math.max(radius,Math.hypot(verts.getX(j),verts.getZ(j)));
      }
      assert.ok(radius>4.6 && radius<5.8); edges.push(radius);
    }
    assert.ok(edges[12]/edges[0]>.80 && edges[12]/edges[0]<.89);
  } else {
    assert.equal(art[name]().children[0].geometry,model.children[0].geometry);
    if(name==='library'){
      const size=bounds.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x-122)<.25 && Math.abs(size.z-55)<.7,'official east building envelope');
    }
  }
  console.log(name + ' | ' + model.children.length + ' draws | ' + Math.round(faces) + ' triangles | ' +
    bounds.getSize(new THREE.Vector3()).toArray().map(n => n.toFixed(2)).join(' × ') + ' m (X,Y,Z)');
}
