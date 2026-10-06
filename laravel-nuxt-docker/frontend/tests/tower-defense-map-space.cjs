// Run: node tests/tower-defense-map-space.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vue = require('vue');
const root = path.resolve(__dirname, '../app');
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  let source = fs.readFileSync(file, 'utf8');
  // Expose one deterministic simulation step only in this isolated test loader.
  if (file.endsWith('/composables/useTowerDefense.ts'))
    source = source.replace('    map,\n    credits,', '    testStep: step,\n    map,\n    credits,');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', 'ref', 'shallowRef', 'computed', 'triggerRef', 'onMounted', 'onBeforeUnmount', code)(
    id => id.startsWith('~/') ? load(path.resolve(root, id.slice(2) + '.ts')) : require(id),
    module, module.exports, vue.ref, vue.shallowRef, vue.computed, vue.triggerRef, () => {}, () => {},
  );
  return module.exports;
}
const { createMapSpatialMetrics, mapSpacePosition } = load(path.join(root, 'games/tower-defense/map-space.ts'));
const { mapWorldPosition } = load(path.join(root, 'components/tower-defense/scene/map-scene.ts'));
const { useTowerDefense } = load(path.join(root, 'composables/useTowerDefense.ts'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'data/tower-defense/lava-map.json'))).configuration;
const metrics = createMapSpatialMetrics(map);
const pad = { x: 53, y: 27 }, near = { x: 53, y: 30 }, far = { x: 59, y: 30 };
assert.equal((pad.x-near.x)**2 + (pad.y-near.y)**2, 9);
assert(metrics.distanceSquared(pad, near) < 2.7**2, 'nearby enemy must be inside the displayed cannon range');
assert(metrics.distanceSquared(pad, far) > 2.7**2, 'distant enemy must stay out of range');
for (const point of [pad, near, far, { x: 60.5, y: 30 }, { x: 64, y: 29.5 }]) {
  const position = mapSpacePosition(map, point);
  const rendered = mapWorldPosition(map, point.x, point.y, false);
  assert(Math.abs(position.x-rendered.x) < 1e-9);
  assert(Math.abs(position.z-rendered.z) < 1e-9);
}
const normal = createMapSpatialMetrics({ ...map, scenePreset: undefined });
assert.equal(normal.distanceSquared(pad, near), 9, 'regular grid maps must retain their existing ranges');
const moving = { x: 53, y: 30 };
assert(metrics.distanceSquared(pad, moving) < 2.7**2);
moving.x = 59;
assert(metrics.distanceSquared(pad, moving) > 2.7**2, 'cached positions must follow relocation');
const expectedAngle = Math.atan2(mapSpacePosition(map, near).z-mapSpacePosition(map, pad).z,
  mapSpacePosition(map, near).x-mapSpacePosition(map, pad).x)*180/Math.PI;
assert(Math.abs(metrics.aimAngle(pad, near)-expectedAngle) < 1e-9);

function cannonRound(progress) {
  const lane = Array.from({ length: 9 }, (_, index) => ({ x: 52+index, y: 30 }));
  const configuration = { ...map, id: 'range-test', configurationVersion: 'test', buildableTiles: [pad], paths: [lane, lane] };
  const game = useTowerDefense(configuration);
  game.selectedKind.value = 'cannon';
  game.selectCell(pad.x, pad.y);
  assert.equal(game.towers.value.length, 1);
  game.phase.value = 'wave';
  game.enemies.value = [{
    id: 1, kind: 'normal', combatProfileKey: 'normal', lane: 0, progress,
    hp: 100, maxHp: 100, armor: 0, magicResistance: 0, speed: 0, reward: 10, castleDamage: 1,
    slowUntil: 0, slowAmount: 0, isSlowed: false, frozenUntil: 0, isFrozen: false,
    burnRemaining: 0, burnDamagePerSecond: 0,
  }];
  game.testStep(0.1);
  return game;
}
const firing = cannonRound(1);
assert.equal(firing.towers.value[0].shotSequence, 1, 'cannon must actually fire at the nearby bridge enemy');
assert.equal(firing.projectiles.value.length, 1);
const waiting = cannonRound(7);
assert.equal(waiting.towers.value[0].shotSequence, 0, 'cannon must not fire outside its actual range');
assert.equal(waiting.projectiles.value.length, 0);
console.log('PASS: shared 3D projection, normalized ranges, heading, relocation, legacy grids and real cannon simulation');
