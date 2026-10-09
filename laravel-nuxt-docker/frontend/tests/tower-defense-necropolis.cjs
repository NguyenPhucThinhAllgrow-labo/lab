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
const map = JSON.parse(fs.readFileSync("tests/fixtures/oathkeeper-necropolis-map.json")).configuration;
const before = JSON.stringify(map);
function build() {
  const scene = new THREE.Scene(); const environment = createSwampScene(scene, map, null);
  let triangles = 0;
  const meshes = new Map();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
      * (object.isInstancedMesh ? object.count : 1);
    if (object.name) meshes.set(object.name, object);
  });
  return { scene, meshes, triangles, environment };
}
const first = build(), second = build();
assert.equal(JSON.stringify(map), before, "theme must not mutate gameplay or persisted map data");
for (const name of ["necropolisPointedArches", "necropolisMonuments", "necropolisStatueHeads", "necropolisStatueWings", "swampBridgeArches"]) {
  assert.ok(first.meshes.get(name)?.isInstancedMesh, `${name} uses shared instance batches`);
  assert.deepEqual(first.meshes.get(name).instanceMatrix.array, second.meshes.get(name).instanceMatrix.array,
    "monuments remain deterministic across preview/game rebuilds");
}
assert.equal(first.meshes.has("swampGreenTrees"), false);
assert.equal(first.meshes.has("swampLilyPads"), false);
assert.equal(first.scene.getObjectByName("swampFortress").visible, true, "keep the shared castle used by other maps");
assert.ok(first.scene.getObjectByName("necropolisBurialGround"), "cemetery has a dry stone ground");
assert.equal(first.scene.getObjectByName("necropolisBurialGround").position.y, 0.22,
  "surrounding ground is higher than the dirt and brick road surfaces");
const burialGround = first.scene.getObjectByName("necropolisBurialGround");
assert.ok(burialGround.material.alphaMap?.isDataTexture, "lane recesses are cut out so lowered paving stays visible");
assert.equal(burialGround.material.alphaTest, 0.5);
assert.equal(first.scene.getObjectByName("necropolisRecessFloor").position.y, -0.18,
  "a lower floor closes gaps under the recessed road");
for (const name of ["swampIsland", "swampEdgeLand", "swampCastleGround", "swampMarshBanks"]) {
  assert.equal(first.scene.getObjectByName(name), undefined, `${name} is not rendered in the cemetery`);
}
assert.equal(first.scene.getObjectByName("swampWater"), undefined);
assert.equal(first.scene.getObjectByName("swampWaterContact"), undefined, "cemetery has no lake ripples");
assert.equal(first.meshes.has("swampCastleReeds"), false);
assert.equal(first.meshes.has("swampGrass"), false);
const trail = first.meshes.get("swampPathGround");
assert.equal(trail.material.color.getHex(), 0x665b49, "earth trail contrasts with the cold stone cemetery floor");
const trailMatrix = new THREE.Matrix4();
trail.getMatrixAt(0, trailMatrix);
const trailPosition = new THREE.Vector3(), trailScale = new THREE.Vector3();
trailMatrix.decompose(trailPosition, new THREE.Quaternion(), trailScale);
assert.ok(Math.abs(trailPosition.y + 0.025) < 0.0001, "dirt track sits above the burial floor");
assert.ok(Math.abs(trailScale.x - map.cellSize * 1.1) < 0.0001, "trail cells overlap to avoid grid gaps");
assert.deepEqual(trail.instanceMatrix.array, second.meshes.get("swampPathGround").instanceMatrix.array);
assert.deepEqual(first.meshes.get("swampPathPaving").instanceMatrix.array,
  second.meshes.get("swampPathPaving").instanceMatrix.array, "scattered trail stones stay fixed across rebuilds");
const brickwork = first.meshes.get("swampPathPaving");
const dirtTop = trailPosition.y + trailScale.y * 0.5;
assert.ok(burialGround.position.y - dirtTop > 0.18, "dirt road is visibly recessed below the surrounding banks");
for (let index = 0; index < brickwork.count; index++) {
  brickwork.getMatrixAt(index, trailMatrix);
  const position = new THREE.Vector3(), scale = new THREE.Vector3();
  trailMatrix.decompose(position, new THREE.Quaternion(), scale);
  assert.ok(Math.abs(scale.y - 0.045) < 0.0001, "only scattered trail stones remain, not the old bridge brick cap");
}
const laneCells = new Set(map.paths.flat().map((point) => `${point.x}:${point.y}`));
assert.equal(trail.count, laneCells.size, "dirt trail continues over every lane cell, including bridges");
assert.equal(brickwork.count, laneCells.size * 4, "bridge spans use the same sparse stones as the rest of the trail");
const mist = first.meshes.get("swampLowMist");
assert.equal(mist.count, 64, "denser fog retains soft camera-facing clouds, not crossed sheets");
assert.ok(mist.material.isShaderMaterial);
assert.match(mist.material.vertexShader, /mvPosition.xy\+=position.xy\*size/, "clouds face the camera without exposing plane edges");
assert.match(mist.material.fragmentShader, /smoothstep\(.08,1.,radius\)/, "cloud silhouettes fade smoothly");
assert.match(mist.material.fragmentShader, /cloud\*\.46/, "increase fog density while retaining translucent edges");
first.environment.update(7);
assert.equal(mist.material.uniforms.uTime.value, 7, "mist clouds drift continuously");
assert.ok(first.triangles < 165000, `necropolis scenery budget exceeded: ${first.triangles}`);
assert.equal(first.meshes.get("swampTowerPlatforms").count, map.buildableTiles.length);
const platforms = first.meshes.get("swampTowerPlatforms");
assert.equal(platforms.material.color.getHex(), 0x857d70, "cemetery pads use warm weathered stone");
assert.equal(platforms.material.vertexColors, false);
assert.equal(first.meshes.has("swampTowerPadRings"), false, "no marsh-style bronze pad rings");
platforms.getMatrixAt(0, trailMatrix);
trailMatrix.decompose(trailPosition, new THREE.Quaternion(), trailScale);
assert.ok(Math.abs(trailScale.y - 0.28) < 0.0001, "cemetery plinths stay shallow, not cylindrical drums");
const source = fs.readFileSync(path.join(root, "components/tower-defense/scene/swamp-scene.ts"), "utf8");
assert.match(source, /necropolis \? \[\] : swampRoadFences/, "cemetery paths have no roadside fences");
console.log(`PASS: shared castle, dry cemetery, drifting layered mist, deterministic monuments and ${first.triangles} static triangles; gameplay unchanged`);
