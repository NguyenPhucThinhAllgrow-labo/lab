const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
const root = path.resolve("app"), cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  new Function("require", "exports", ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)((id) => id.startsWith("~/") ? load(path.join(root, id.slice(2) + ".ts"))
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), exports);
  return exports;
}
const { createSwampScene } = load(path.join(root, "components/tower-defense/scene/swamp-scene.ts"));
const { swampRoadFences } = load(path.join(root, "utils/games/swampRoadFences.ts"));
const preset = JSON.parse(fs.readFileSync("app/data/tower-defense/moonfrost-lake-map.json"));
const map = { ...preset.configuration, id: preset.id };
const before = JSON.stringify(map);
function build(input) {
  const scene = new THREE.Scene();
  const environment = createSwampScene(scene, input, null);
  let triangles = 0;
  scene.traverse((object) => {
    if (object.isMesh && object.visible) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
      * (object.isInstancedMesh ? object.count : 1);
  });
  return { scene, environment, triangles };
}
const first = build(map), second = build(map);
const legacy = structuredClone(map); delete legacy.swampSettings.style;
const fallback = build(legacy);
assert.equal(JSON.stringify(map), before, "rendering does not mutate stored lanes, pads or gameplay");
for (const name of ["moonfrostSnowCaps", "moonfrostIcicles", "moonfrostBridgePillars", "moonfrostBridgeArcades", "moonfrostBridgeButtresses", "moonfrostBridgeCourses", "moonfrostPineCrowns", "moonfrostPineSnow", "moonfrostMountains", "moonfrostPadMasonry", "moonfrostPadRunes"]) {
  const mesh = first.scene.getObjectByName(name);
  assert.ok(mesh?.isInstancedMesh && mesh.count > 0, `${name} uses shared low-poly batches`);
  assert.deepEqual(mesh.instanceMatrix.array, second.scene.getObjectByName(name).instanceMatrix.array);
  assert.deepEqual(mesh.instanceMatrix.array, fallback.scene.getObjectByName(name).instanceMatrix.array,
    "existing DB map gets the same winter style via its ID without overwriting layouts");
}
for (const name of ["swampGreenTrees", "swampGrass", "swampLilyPads", "swampCastleReeds", "swampCastleMoss", "swampTreeBranches", "swampMarshBanks", "swampWaterContact", "swampRockwork", "moonfrostRockSpurs", "swampGravestones", "necropolisMonuments", "moonfrostIceFloes"]) {
  assert.equal(first.scene.getObjectByName(name), undefined, `${name} is absent from the frozen lake`);
}
assert.equal(first.scene.getObjectByName("swampFortress").visible, true, "keep the shared castle");
assert.equal(first.scene.getObjectByName("swampTowerPlatforms").count, map.buildableTiles.length);
assert.equal(first.environment.tileMeshes.length, map.buildableTiles.length, "tower placement remains interactive");
assert.ok(first.scene.getObjectByName("moonfrostMoon"));
assert.equal(first.scene.getObjectByName("swampBanners").material.color.getHex(), 0x203e8c);
assert.equal(first.scene.getObjectByName("swampWater").position.y, -9);
assert.match(first.scene.getObjectByName("swampWater").material.fragmentShader, /float cracks=/);
assert.match(first.scene.getObjectByName("swampWater").material.fragmentShader, /cracks\*icePatch\*\.2/,
  "cracks are sparse and subdued, not a bright cellular grid covering the lake");
assert.match(first.scene.getObjectByName("swampWater").material.fragmentShader, /vec3\(\.008,\.018,\.042\)/,
  "lake uses dark navy rather than pale cyan");
assert.equal(first.scene.getObjectByName("moonfrostMountains").geometry.type, "IcosahedronGeometry",
  "mountains use irregular rock volumes rather than repeated cone silhouettes");
assert.equal(first.scene.getObjectByName("swampEdgeLand").material.color.getHex(), 0x586b83,
  "islands expose dark rock instead of an entirely white snow surface");
assert.equal(first.scene.getObjectByName("moonfrostPadMasonry").count, map.buildableTiles.length * 4);
assert.equal(first.scene.getObjectByName("moonfrostPadRunes").count, map.buildableTiles.length * 8);
assert.equal(first.scene.getObjectByName("swampPathPaving").count,
  new Set(map.paths.flat().map((point) => `${point.x}:${point.y}`)).size * 6,
  "winter road uses smaller rectangular paving courses rather than four large square tiles");
assert.equal(first.scene.getObjectByName("swampPathPaving").material.color.getHex(), 0x9b9b97);
const fences = swampRoadFences(map.paths, map.buildableTiles);
const bankRocks = first.scene.getObjectByName("moonfrostBankRocks");
assert.ok(bankRocks?.isInstancedMesh && bankRocks.count > 0, "small rocks decorate existing wooded banks");
assert.deepEqual(bankRocks.instanceMatrix.array, second.scene.getObjectByName("moonfrostBankRocks").instanceMatrix.array,
  "bank clusters remain stable across preview/game rebuilds");
for (let index = 0; index < bankRocks.count; index++) {
  const matrix = new THREE.Matrix4(); bankRocks.getMatrixAt(index, matrix);
  const p = new THREE.Vector3().setFromMatrixPosition(matrix);
  assert.ok(p.y > -1, "new rocks stay on banks, not scattered at lake height");
}
for (const name of ["moonfrostArchVoussoirs", "moonfrostFacadeBands", "moonfrostButtressRelief", "moonfrostPadRimBlocks"]) {
  const mesh = first.scene.getObjectByName(name);
  assert.ok(mesh?.isInstancedMesh && mesh.count > 0, `${name} is real batched geometry, not concept art`);
  assert.deepEqual(mesh.instanceMatrix.array, second.scene.getObjectByName(name).instanceMatrix.array);
}
assert.equal(first.scene.getObjectByName("moonfrostPadRimBlocks").count, map.buildableTiles.length * 16);
assert.ok(first.scene.getObjectByName("swampPathPaving").material.map?.isDataTexture,
  "pavement gets procedural stone grain and fractures");
assert.deepEqual(first.scene.getObjectByName("swampPathPaving").material.map.image.data,
  second.scene.getObjectByName("swampPathPaving").material.map.image.data);
assert.equal(first.scene.getObjectByName("moonfrostRailingDiamonds").count, fences.length,
  "winter railings use open gothic panels on exposed boundaries only");
assert.equal(first.scene.getObjectByName("moonfrostRailingIron").count, fences.length * 4,
  "two horizontal rails and two thin vertical bars replace dense spikes");
const postKeys = new Set(fences.flatMap(({ from, to }) => [from, to]).map((p) => `${p.x}:${p.y}`));
assert.equal(first.scene.getObjectByName("moonfrostRailingSpires").count, postKeys.size,
  "stone finials are deduplicated at corners and junctions");
assert.equal(first.scene.getObjectByName("moonfrostRailingStone").count, postKeys.size * 3);
first.environment.update(8);
assert.equal(first.scene.getObjectByName("swampLowMist").material.uniforms.uTime.value, 8);
assert.ok(first.triangles < 185000, `winter scenery budget exceeded: ${first.triangles}`);
console.log(`PASS: moonfrost snow/ice, gothic platforms, snowy pines, legacy DB fallback, deterministic scenery and ${first.triangles} triangles; gameplay unchanged`);
