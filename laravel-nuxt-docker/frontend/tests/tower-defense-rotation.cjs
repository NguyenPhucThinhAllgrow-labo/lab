const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const THREE = require("three");
const composable = fs.readFileSync("app/composables/useTowerDefense.ts", "utf8");
const start = composable.indexOf("  function rotateSelected()");
const end = composable.indexOf("  /** Chỉ tower", start);
const selectedTower = { value: null }, towers = { value: [] }, message = { value: "" };
let notifications = 0;
const rotate = new Function("selectedTower", "towers", "message", "triggerRef", "TOWER_DEFINITIONS",
  ts.transpileModule(composable.slice(start, end), {}).outputText + ";return rotateSelected;")(
  selectedTower, towers, message, () => notifications++, { cannon: { name: "Pháo" } });
rotate(); assert.equal(notifications, 0);
const tower = { id: 1, kind: "cannon", aimAngle: 0, x: 3, y: 5, level: 1, invested: 145, cooldown: 1 };
selectedTower.value = tower;
for (const expected of [90, 180, 270, 0]) { rotate(); assert.equal(tower.rotationY, expected); }
assert.equal(notifications, 4); assert.equal(tower.aimAngle, 0);
assert.deepEqual([tower.x, tower.y, tower.level, tower.invested, tower.cooldown], [3, 5, 1, 145, 1]);
rotate();
const restored = JSON.parse(JSON.stringify(tower));
assert.equal(restored.rotationY, 90, "angle is included in existing snapshot serialization");
const sceneSource = fs.readFileSync("app/components/tower-defense/TowerDefenseScene.client.vue", "utf8");
const sceneStart = sceneSource.indexOf("function syncTowerRotation(");
const sceneEnd = sceneSource.indexOf("function syncScene(", sceneStart);
const sync = new Function("THREE", ts.transpileModule(sceneSource.slice(sceneStart, sceneEnd), {}).outputText
  + ";return syncTowerRotation;")(THREE);
const model = new THREE.Group(), turret = new THREE.Group(); model.add(turret); model.userData.turret = turret;
sync(model, { aimAngle: 0 }); assert.equal(model.rotation.y, 0, "old snapshots default to zero");
sync(model, restored); assert.equal(model.rotation.y, Math.PI / 2);
for (let i = 0; i < 150; i++) sync(model, { rotationY: 90, aimAngle: 45 });
assert.ok(Math.abs(model.rotation.y + turret.rotation.y - Math.PI / 4) < 1e-6,
  "manual base rotation does not change world-space aiming");
assert.match(sceneSource, /else for \(const tower of props.towers\)/, "rotation updates while paused");
const page = fs.readFileSync("app/pages/games/tower-defense/index.vue", "utf8");
assert.match(page, /@click="rotateSelected"/);
console.log("PASS: 90-degree steps, wraparound, legacy/saved angles, paused rotation and world-space turret aiming");
