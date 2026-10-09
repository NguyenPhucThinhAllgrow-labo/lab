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
const decorate = new Function("THREE", "getFrostGlowTexture", "getTowerOuterGlowTexture",
  compiled + "\nreturn decorateElementalTowerGlow;")(THREE, () => new THREE.Texture(), () => new THREE.Texture());
const frostStart = source.indexOf("function decorateFrostTower(");
const frostEnd = source.indexOf("function createFireTowerTemplate(", frostStart);
const decorateFrost = new Function("THREE", "getTowerOuterGlowTexture",
  ts.transpileModule(source.slice(frostStart, frostEnd), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
    + "\nreturn decorateFrostTower;")(THREE, () => new THREE.Texture());
for (const height of [2, 4, 7]) {
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, height, 1), new THREE.MeshStandardMaterial());
  body.position.y = height / 2; model.add(body);
  // Legacy fixed metadata must no longer override a resized model.
  model.userData.frostEffectCenterY = 1.77;
  decorateFrost(model);
  const glow = model.getObjectByName("frostGlowCentral");
  assert.ok(Math.abs(glow.position.y - height * (1.82 / 2.1)) < 0.000001,
    "frost crystal anchor follows actual model height, not the old fixed Y");
  assert.equal(glow.material.depthTest, false, "frost halo stays visible regardless of camera occlusion");
  assert.equal(glow.material.depthWrite, false);
  assert.equal(glow.material.opacity, 0.98);
  assert.equal(glow.scale.x, 0.92);
  assert.equal(glow.scale.y, 1.19);
  assert.equal(glow.position.x, 0);
  assert.equal(glow.position.z, 0);
}
for (const [level, height] of [[1, 2.1], [2, 3.2], [3, 4.5]]) {
  const model = new THREE.Group();
  model.position.set(20, 5.3, -12); model.rotation.y = 1.1; model.scale.setScalar(1.7);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, height, 1), new THREE.MeshStandardMaterial());
  body.position.set(0.2, height / 2 + 0.3, -0.1); model.add(body);
  const configured = new THREE.Sprite(new THREE.SpriteMaterial());
  configured.position.set(0, 100, 0); configured.scale.setScalar(50); model.add(configured);
  model.userData.level = level;
  decorateFrost(model);
  const effects = model.getObjectByName("frostVisualEffects");
  const glow = model.getObjectByName("frostGlowCentral");
  assert.ok(Math.abs(glow.position.y - (0.3 + height * 1.82 / 2.1)) < 1e-6,
    "all levels anchor in local coordinates despite map elevation, rotation, scale and DB sprites");
  assert.ok(Math.abs(effects.position.x - 0.2) < 1e-6);
  assert.ok(Math.abs(effects.position.z + 0.1) < 1e-6);
  const expected = model.localToWorld(new THREE.Vector3(0.2, 0.3 + height * 1.82 / 2.1, -0.1));
  assert.ok(glow.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-6);
  decorateFrost(model);
  assert.equal(model.children.filter((child) => child.name === "frostVisualEffects").length, 1);
}
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
      assert.equal(glow.material.depthTest, false, "elemental halos stay visible regardless of camera occlusion");
      assert.equal(glow.material.depthWrite, false);
      const levelBrightness = [1, 1.5, 2][level - 1];
      const opacity = name.endsWith("Inner") ? 0.18 : kind === "fire" ? 0.82 : 0.74;
      const expectedOpacity = Math.min(name.endsWith("Inner") ? 0.36 : 1, opacity * levelBrightness);
      assert.ok(Math.abs(glow.material.opacity - expectedOpacity) < 0.000001,
        "broad halo is retained while inner brightness is capped to avoid a saturated round core");
      const size = { fire: 1.5, thunder: 1, water: 1.02 }[kind];
      assert.ok(Math.abs(glow.scale.x - (name.endsWith("Inner") ? size * 0.58 : size * 1.35)) < 0.000001);
      if (name.endsWith("Inner")) assert.ok(glow.scale.y > glow.scale.x, "inner halo follows the tall crystal instead of forming a circle");
    }
    assert.ok(Math.abs(stone.emissiveIntensity - ([1.05, 1.65, 2.3][level - 1] + (kind === "thunder" ? 0.2 : 0))) < 0.000001,
      "historical emissive material intensity restored");
    model.position.set(12, 5.3, -8);
    model.scale.setScalar(1.5);
    const effect = model.getObjectByName("elementalTowerGlow");
    const ratios = { fire: [0.82, 0.84, 0.86], thunder: [0.82, 0.73, 0.79], water: [0.76, 0.73, 0.68] };
    assert.ok(Math.abs(effect.position.y - (-2.5 + 5 * ratios[kind][level - 1])) < 0.000001,
      "main branch crystal position restored at each level");
    assert.equal(effect.position.x, 0);
    assert.equal(effect.position.z, 0);
  }
}

const cameraSource = fs.readFileSync(path.join(app, "utils/games/citadelCamera.ts"), "utf8");
const librarySource = fs.readFileSync(path.join(app, "components/tower-defense/scene/tower-models.ts"), "utf8");
const managedStart = librarySource.indexOf("export function decorateTowerVisualEffects(");
const managedEnd = librarySource.indexOf("export function createTowerModelLibrary(", managedStart);
const managedExports = {};
new Function("THREE", "getConfiguredGlowTexture", "exports",
  ts.transpileModule(librarySource.slice(managedStart, managedEnd), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(THREE, () => new THREE.Texture(), managedExports);
for (const level of [1, 2, 3]) {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial()));
  managedExports.decorateTowerVisualEffects(model, [{ enabled: true, type: "glow", color: "#b080ff",
    opacity: 0.7, heightRatio: 0.9, size: 1.2, pulseSpeed: 2 }], level);
  const glow = model.getObjectByName("managedTowerGlow").children[0];
  assert.equal(glow.material.depthTest, false);
  assert.equal(glow.name, "managedTowerGlowSprite", "DB halo participates in separate occlusion");
  assert.equal(glow.material.depthWrite, false);
  assert.equal(glow.material.opacity, 0.7, "occlusion fix preserves saved brightness");
  assert.equal(glow.scale.x, 1.2, "occlusion fix preserves saved glow size");
  decorate(model, "thunder", level);
  assert.ok(model.getObjectByName("elementalTowerGlow"), "main branch elemental decorator restored");
  decorateFrost(model);
  assert.equal(model.getObjectByName("frostGlowCentral").visible, true);
}
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
assert.doesNotMatch(source, /positionTowerCoreGlows|coreGlowAnchor|coreGlowRadius/);
assert.doesNotMatch(source, /towerGlowOcclusion|createTowerGlowOcclusion/,
  "camera movement must not trigger CPU checks that switch tower halos off");
assert.doesNotMatch(source, /getCrystalHaloTexture|crystalHaloTexture/,
  "temporary softened halo texture must be removed");
assert.match(source, /gradient.addColorStop\(0.55, "rgba\(255,255,255,\.5\)"\)/,
  "outer halo brightness increases away from the already saturated central hotspot");
assert.match(source, /gradient.addColorStop\(0, "rgba\(255,255,255,\.55\)"\)/,
  "outer halo has a soft centre rather than an intense circular hotspot");
console.log("PASS: frost anchors follow model sizes/local transforms at all levels; other halos and camera unchanged");
