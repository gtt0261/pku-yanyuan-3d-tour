const assert = require('node:assert/strict');

global.window = {};
require('../dist/campus-data.js');
require('../dist/venue-directory.js');

const {buildings, boundary} = window.CAMPUS_DATA;
const {venues, sources} = window.VENUE_DIRECTORY;
const footprintIds = new Set(buildings.map(b => b.id));
const names = new Set(venues.flatMap(v => [v.name, ...v.aliases]));
const records = new Map(venues.map(v => [v.id, v]));
const namedBuildings = venues.filter(v => !v.poi && !v.model);
function inside(x, z, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) result = !result;
  }
  return result;
}

assert.equal(records.size, venues.length, '每个条目 ID 唯一');
for (const v of venues) {
  assert.ok(v.name && sources[v.source] && Number.isFinite(v.x) && Number.isFinite(v.z), v.id);
  assert.ok(v.osmId === null || footprintIds.has(v.osmId), v.name);
  assert.ok(inside(v.x, v.z, boundary), v.name + ' 位于校界内');
}
for (const b of buildings.filter(b => b.name)) assert.ok(records.has(b.id), b.name);
for (const name of ['农园食堂', '家园食堂', '学一食堂', '学五食堂', '勺园食堂', '佟园食堂', '艺园食堂', '燕南食堂', '松林餐厅', '成府园食堂']) {
  assert.ok(venues.some(v => v.name === name && v.kind === 'dining'), name);
}
for (let n = 28; n <= 48; n++) assert.ok(names.has(n + '楼'), '学生楼号 ' + n);
for (let n = 1; n <= 6; n++) assert.ok(names.has('李兆基人文学苑' + n + '号楼'), '人文学苑 ' + n);
for (let n = 50; n <= 66; n++) assert.ok(names.has('燕南园' + n + '号院'), '燕南园 ' + n);
assert.equal(records.get('n8156964521').osmId, 'r13059309', '成府园食堂和校医院共用建筑');
const extraModels = venues.filter(v => v.model);
assert.deepEqual(extraModels.map(v => v.id), ['yannan-62', 'yannan-64', 'yannan-65', 'yannan-66']);
for (const v of extraModels) {
  assert.ok(v.model.width > 0 && v.model.depth > 0 && v.model.height > 0, v.name);
  assert.ok(!buildings.some(b => inside(v.x, v.z, b.ring) && !(b.holes || []).some(h => inside(v.x, v.z, h))), v.name);
}

console.log(`${buildings.length} 个底图轮廓，${namedBuildings.length} 个具名轮廓，${venues.filter(v => v.poi).length} 处设施点，${extraModels.length} 个补绘院落。`);
