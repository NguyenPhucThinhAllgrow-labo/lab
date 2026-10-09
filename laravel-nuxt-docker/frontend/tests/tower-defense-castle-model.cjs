const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
const root = path.resolve(__dirname, "../app");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith("~/")
    ? load(path.join(root, id.slice(2) + ".ts"))
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const { GLTFLoader } = require("three/examples/jsm/loaders/GLTFLoader.js");
const original = GLTFLoader.prototype.loadAsync;
let requested;
let loadCount = 0;
GLTFLoader.prototype.loadAsync = async (url) => {
  loadCount++;
  requested = url;
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 10), new THREE.MeshStandardMaterial());
  mesh.position.set(3, 6, -2); scene.add(mesh);
  return { scene };
};
(async () => {
  try {
    const { loadTowerDefenseCastle, positionTowerDefenseCastle } = load(path.join(root, "components/tower-defense/scene/map-scene.ts"));
    const { mapSpacePosition } = load(path.join(root, "games/tower-defense/map-space.ts"));
    const { expandSwampEditableArea } = load(path.join(root, "utils/games/swampEditableArea.ts"));
    const lava = require("../app/data/tower-defense/lava-map.json").configuration;
    const swamp = require("../app/data/tower-defense/swamp-map.json").configuration;
    for (const preset of [lava, swamp, expandSwampEditableArea(swamp), { ...swamp, scenePreset: undefined }]) {
      const map = structuredClone(preset);
      map.castle.modelUrl = "/api/tower-defense/assets/models/custom-castle.glb";
      const castle = await loadTowerDefenseCastle(map);
      assert.equal(requested, map.castle.modelUrl);
      assert.equal(castle.name, "castleModel");
      const gate = mapSpacePosition(map, map.castle.position);
      const bounds = new THREE.Box3().setFromObject(castle);
      const floor = map.castle.offsetY + (map.scenePreset ? gate.baseY + gate.surfaceOffset : 0);
      assert.ok(Math.abs(bounds.min.y - floor) < 0.00001, "custom castle must stand on the preset floor, not at world zero");
      assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y - map.castle.maxSize) < 0.00001);
      assert.ok(Math.hypot(castle.position.x - gate.x, castle.position.z - gate.z) > 0, "castle front must align with its gate instead of covering it");
      map.castle.maxSize *= 2;
      const enlarged = await loadTowerDefenseCastle(map);
      const enlargedBounds = new THREE.Box3().setFromObject(enlarged);
      assert.ok(Math.abs(enlargedBounds.getSize(new THREE.Vector3()).y - bounds.getSize(new THREE.Vector3()).y * 2) < 0.00001,
        "changing model size must uniformly scale the castle");
      assert.ok(Math.abs(enlargedBounds.min.y - floor) < 0.00001, "resizing must not move the castle below its floor");
      const before = loadCount;
      const edited = structuredClone(map);
      edited.castle.maxSize = 9;
      edited.castle.position.x -= 1;
      const reused = positionTowerDefenseCastle(enlarged, edited);
      assert.strictEqual(reused, enlarged, "edits reuse the actual loaded model");
      assert.equal(loadCount, before, "gate and scale edits must not fetch the model again");
      assert.ok(Math.abs(new THREE.Box3().setFromObject(reused).getSize(new THREE.Vector3()).y - 9) < 0.00001);
      const beforeOffset = reused.position.clone();
      edited.castle.modelOffset = { x: 1.37, z: -2.19 };
      positionTowerDefenseCastle(reused, edited);
      assert.ok(Math.abs(reused.position.x - beforeOffset.x - 1.37) < 0.00001);
      assert.ok(Math.abs(reused.position.z - beforeOffset.z + 2.19) < 0.00001);
    }
    const preview = fs.readFileSync(path.join(root, "components/tower-defense/MapPreview.client.vue"), "utf8");
    const game = fs.readFileSync(path.join(root, "components/tower-defense/TowerDefenseScene.client.vue"), "utf8");
    const citadel = fs.readFileSync(path.join(root, "pages/games/tower-defense/test.vue"), "utf8");
    assert.match(preview, /if \(props.map.castle.modelUrl\)/);
    assert.match(preview, /fortress.visible = false/);
    assert.match(preview, /retainedCastle.removeFromParent\(\)/);
    assert.match(preview, /scene.add\(positionTowerDefenseCastle\(retainedCastle, props.map\)\)/);
    assert.match(game, /if \(isCitadel \|\| !props.map.castle.modelUrl\) return/);
    assert.match(game, /fortress.visible = false/);
    assert.match(citadel, /watch\(\(\) => JSON.stringify\(props.configuration\?\.castle\)/);
    assert.match(citadel, /parent.userData.castleArchitecture/);
    assert.match(citadel, /model && modelUrl === url/);
    const { createSwampScene } = load(path.join(root, "components/tower-defense/scene/swamp-scene.ts"));
    const custom = structuredClone(swamp); custom.castle.modelUrl = "/castle.glb";
    const scene = new THREE.Scene(); createSwampScene(scene, custom, null);
    assert.equal(scene.getObjectByName("swampFortress").visible, false,
      "default castle must stay hidden during custom-model loading, including full scene rebuilds");
    const manager = fs.readFileSync(path.join(root, "components/admin/TowerDefenseMapManager.vue"), "utf8");
    const selectCastleModel = manager.match(/function selectCastleModel\(key: string\) \{([\s\S]*?)\n\}/)[0];
    let configuration = structuredClone(custom);
    const select = new Function("updateMapConfiguration", "assetPath",
      ts.transpileModule(selectCastleModel + "\nreturn selectCastleModel;", {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText)((change) => change(configuration), (key) => `/api/tower-defense/assets/${key}`);
    const originalCastle = structuredClone(configuration.castle);
    select("");
    assert.deepEqual(configuration.castle, { ...originalCastle, modelUrl: "" },
      "disabling the model keeps gate, size, rotation and offset configuration intact");
    const fallbackScene = new THREE.Scene(); createSwampScene(fallbackScene, configuration, null);
    assert.equal(fallbackScene.getObjectByName("swampFortress").visible, true);
    select("models/replacement.glb");
    assert.equal(configuration.castle.modelUrl, "/api/tower-defense/assets/models/replacement.glb");
    const picker = manager.match(/<AdminAssetPicker[^>]*@update:model-value="selectCastleModel"[^>]*\/>/)[0];
    assert.match(picker, /clear-label="Không dùng model lâu đài"/);
    assert.doesNotMatch(picker, /\brequired\b/, "create/edit must both allow a castle without a model");
    console.log("PASS: selected castle URLs, preset floor heights, scale, gate alignment, preview/game replacement and live citadel updates");
  } finally { GLTFLoader.prototype.loadAsync = original; }
})().catch((error) => { console.error(error); process.exitCode = 1; });
