const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const THREE = require("three");
const exportsObject = {};
new Function("require", "exports", ts.transpileModule(fs.readFileSync("app/components/tower-defense/scene/map-appearance.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(require, exportsObject);
const { updateMapCameraFog } = exportsObject;
for (const name of ["swamp", "lava", "moonfrost"]) {
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x111222, 80, 200);
  const camera = new THREE.PerspectiveCamera();
  const target = new THREE.Vector3();
  const map = { columns: 44, rows: 34, cellSize: 2.6, camera: { position: [0, 100, 0], target: [0, 0, 0] } };
  camera.position.set(0, 100, 0);
  updateMapCameraFog(scene, camera, target, map);
  const defaultRange = [scene.fog.near, scene.fog.far];
  camera.position.set(0, 300, 0);
  updateMapCameraFog(scene, camera, target, map);
  assert.equal(scene.fog.near, 280, `${name}: fog follows camera retreat`);
  assert.equal(scene.fog.far, 400);
  assert.ok(scene.fog.far > camera.position.distanceTo(target) + 44 * 2.6 * 0.5,
    "distant edge of the board never disappears into full fog");
  updateMapCameraFog(scene, camera, target, map);
  assert.equal(scene.fog.near, 280, "repeated frames do not accumulate fog offsets");
  camera.position.set(0, 100, 0);
  updateMapCameraFog(scene, camera, target, map);
  assert.deepEqual([scene.fog.near, scene.fog.far], defaultRange, "zoom back restores original atmosphere");
  scene.fog = null;
  assert.doesNotThrow(() => updateMapCameraFog(scene, camera, target, map));
}
for (const file of ["MapPreview.client.vue", "TowerDefenseScene.client.vue"]) {
  assert.match(fs.readFileSync(`app/components/tower-defense/${file}`, "utf8"), /updateMapCameraFog\(scene, camera, controls.target, props.map\)/);
}
console.log("PASS: camera-relative fog, far-map visibility, stable repeated frames and shared preview/game integration");
