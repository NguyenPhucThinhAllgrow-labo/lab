const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
const scene = path.join(__dirname, "../app/components/tower-defense/scene");
const source = fs.readFileSync(path.join(scene, "enemy-scene.ts"), "utf8");
const prepareSource = source.slice(source.indexOf("function prepareCharacter("),
  source.indexOf("function prepareEquipment("));
const prepare = new Function("THREE", "createEnemyHealthBars", ts.transpileModule(prepareSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText + "\nreturn prepareCharacter;")(THREE, () => {
  const bar = new THREE.Object3D();
  bar.position.y = 100;
  return bar;
});
const exportsObject = {};
new Function("require", "exports", ts.transpileModule(
  fs.readFileSync(path.join(scene, "enemy-target.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(require, exportsObject);
const { enemyLightningTargetWorld } = exportsObject;
for (const scale of [0.5, 1.2844, 2.6]) {
  const character = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial());
  body.position.set(0.1, 1.8, -0.15);
  character.add(body);
  const template = prepare(character, 2, 10);
  const model = template.clone(true);
  model.scale.setScalar(scale);
  model.position.set(20, 5.3 + model.userData.groundOffset * scale, -8);
  model.rotation.y = 0.4;
  model.updateMatrixWorld(true);
  const actual = enemyLightningTargetWorld(model, new THREE.Vector3());
  // Ground is 5.3; scaled character height is 8. Health bar is excluded.
  assert.ok(Math.abs(actual.y - (5.3 + 8 * scale * 0.5)) < 1e-9);
  const anchor = model.getObjectByName("enemyLightningTarget");
  assert.ok(actual.distanceTo(anchor.getWorldPosition(new THREE.Vector3())) < 1e-9);
  model.position.x += 5;
  assert.ok(Math.abs(enemyLightningTargetWorld(model, new THREE.Vector3()).x - actual.x - 5) < 1e-9);
}
// Rest-pose bounds deliberately extend far above the walking torso. The
// anchor must follow the animated bone, not any fraction of those bounds.
for (const boneName of ["mixamorigSpine1", "mixamorig:Spine1", "chest"]) {
  const character = new THREE.Group();
  character.add(new THREE.Mesh(new THREE.BoxGeometry(1, 20, 1), new THREE.MeshStandardMaterial()));
  const torso = new THREE.Bone();
  torso.name = boneName;
  torso.position.y = 0.7;
  character.add(torso);
  const model = prepare(character, 2, 100).clone(true);
  model.position.set(20, 5.3, -8);
  model.scale.setScalar(1.2844);
  const liveTorso = model.getObjectByName(boneName);
  assert.equal(model.getObjectByName("enemyLightningTarget").parent, liveTorso);
  for (const y of [0.7, 0.55, 0.65]) {
    liveTorso.position.y = y;
    model.updateMatrixWorld(true);
    const actual = enemyLightningTargetWorld(model, new THREE.Vector3());
    assert.ok(actual.distanceTo(liveTorso.getWorldPosition(new THREE.Vector3())) < 1e-9);
  }
}
console.log("PASS: lightning follows animated torso bones; fallback respects size, ground offset and movement");
