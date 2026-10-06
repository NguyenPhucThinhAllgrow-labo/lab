const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
const app = path.join(__dirname, "../app");
const source = fs.readFileSync(path.join(app,
  "components/tower-defense/TowerDefenseScene.client.vue"), "utf8");
const start = source.indexOf("function decorateElementalTowerGlow(");
const end = source.indexOf("function decorateLoadedTowerModel(", start);
const compiled = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const decorate = new Function("THREE", "getFrostGlowTexture",
  compiled + "\nreturn decorateElementalTowerGlow;")(THREE, () => new THREE.Texture());
for (const kind of ["fire", "thunder", "water"]) {
  for (const level of [1, 2, 3]) {
    const model = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(2, 5, 2), new THREE.MeshStandardMaterial()));
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), stone);
    core.position.y = 2;
    model.add(core);
    decorate(model, kind, level);
    for (const name of ["elementalTowerGlowOuter", "elementalTowerGlowInner"]) {
      const glow = model.getObjectByName(name);
      assert.equal(glow.material.depthTest, true);
      assert.equal(glow.material.depthWrite, false);
      assert.ok(glow.material.opacity <= 0.56);
      assert.ok(glow.scale.x <= 0.75);
    }
    assert.ok(stone.emissiveIntensity <= 0.65);
  }
}

const cameraSource = fs.readFileSync(path.join(app, "utils/games/citadelCamera.ts"), "utf8");
const exportsObject = {};
new Function("exports", ts.transpileModule(cameraSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(exportsObject);
const { resolveCitadelCamera } = exportsObject;
const preset = require("../app/data/tower-defense/lava-map.json").configuration.sceneSettings.camera;
const old = { position: [41.02, 73.55, 30.58], target: [17, 5.3, 0], zoom: 1.2 };
const upgraded = resolveCitadelCamera(old, preset);
assert.deepEqual(upgraded.position, preset.position);
assert.deepEqual(upgraded.target, preset.target);
assert.equal(upgraded.zoom, old.zoom);
assert.deepEqual(old.position, [41.02, 73.55, 30.58]);
const custom = { position: [12, 50, 45], target: [0, 5, 0], zoom: 0.8 };
assert.equal(resolveCitadelCamera(custom, preset), custom);
assert.equal(resolveCitadelCamera(undefined, preset), preset);
console.log("PASS: restrained depth-tested tower glow, updated camera and preserved custom camera/zoom");
