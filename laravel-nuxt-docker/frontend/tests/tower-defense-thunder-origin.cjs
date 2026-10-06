const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const THREE = require("three");

// Exercise the actual beam-origin code without mounting a WebGL scene.
const source = fs.readFileSync(path.join(__dirname,
  "../app/components/tower-defense/TowerDefenseScene.client.vue"), "utf8");
const anchor = source.match(/const crystalAnchor =[^;]+;/)[0];
const originStart = source.indexOf("if (segmentIndex === 0)", source.indexOf(anchor));
const originEnd = source.indexOf("} else {\n            enemyLightningTargetWorld", originStart);
assert.ok(originStart >= 0 && originEnd > originStart);
const resolveOrigin = new Function("model", "tower", "thunderStartWorld",
  `${anchor}\nconst segmentIndex = 0;\n${source.slice(originStart, originEnd)} }`);

for (const level of [1, 2, 3]) {
  const model = new THREE.Group();
  model.position.set(23, 5.4, -7);
  model.rotation.y = -0.18;
  model.scale.setScalar(1 + level * 0.35);
  const core = new THREE.Group();
  core.name = "elementalTowerGlow";
  core.position.set(0.15, 3 + level * 0.2, -0.1);
  model.add(core);
  model.updateMatrixWorld(true);
  const expected = core.getWorldPosition(new THREE.Vector3());
  const actual = new THREE.Vector3();
  resolveOrigin(model, { level }, actual);
  assert.ok(actual.distanceTo(expected) < 1e-9, `level ${level} must fire from its core`);
}

// Procedural fallback without a GLB anchor remains supported.
const fallback = new THREE.Group();
fallback.position.y = 5.4;
fallback.scale.setScalar(2);
fallback.updateMatrixWorld(true);
const actual = new THREE.Vector3();
resolveOrigin(fallback, { level: 1 }, actual);
assert.ok(Math.abs(actual.y - (5.4 + 1.72 * 2)) < 1e-9);
console.log("PASS: thunder origins follow all three model cores, world transforms and procedural fallback");
