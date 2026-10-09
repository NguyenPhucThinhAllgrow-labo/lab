const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
const root = path.resolve(__dirname, "../app");
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith("~/")
    ? load(path.join(root, id.slice(2) + ".ts"))
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const document = require("../app/data/tower-defense/swamp-map.json");
assert.deepEqual(document, require("../../backend/tests/Fixtures/swamp-map.json"), "API tests must use the actual selectable preset");
const map = document.configuration;
const { swampRoadFences } = load(path.join(root, "utils/games/swampRoadFences.ts"));
const bend = [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]];
assert.equal(swampRoadFences(bend).length, 6, "L bend keeps both endpoint openings and six outer edges");
const junction = [bend[0], [{ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]];
for (const lanes of [bend, junction, map.paths]) {
  const fences = swampRoadFences(lanes);
  const keys = new Set();
  for (const { from, to } of fences) {
    assert.equal(Math.abs(from.x - to.x) + Math.abs(from.y - to.y), 1);
    assert.ok(from.x === to.x || from.y === to.y, "turn fences must never be diagonal");
    const center = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const neighbours = from.x === to.x
      ? [{ x: center.x - 0.5, y: center.y }, { x: center.x + 0.5, y: center.y }]
      : [{ x: center.x, y: center.y - 0.5 }, { x: center.x, y: center.y + 0.5 }];
    assert.equal(neighbours.filter((p) => lanes.flat().some((c) => c.x === p.x && c.y === p.y)).length, 1,
      "no rail may separate connected road cells, including shared lanes and junctions");
    const key = [JSON.stringify(from), JSON.stringify(to)].sort().join("|");
    assert.ok(!keys.has(key), "shared lanes must not duplicate fences"); keys.add(key);
  }
  assert.deepEqual(swampRoadFences([...lanes].reverse()), fences, "lane order cannot change road boundary placement");
}
assert.ok(swampRoadFences(bend, [{ x: 1, y: -1 }]).length < swampRoadFences(bend).length,
  "platform access must remain open");
assert.equal(map.scenePreset, "gothic-swamp");
assert.equal(map.buildableTiles.length, 12);
for (const [lane, points] of map.paths.entries()) {
  assert.deepEqual(points[0], map.spawnPoints[lane]);
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]; const current = points[index];
    assert.equal(Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y), 1);
  }
}
const pathKeys = new Set(map.paths.flat().map((p) => `${p.x}:${p.y}`));
assert.equal(map.pathTiles.length, pathKeys.size);
for (const pad of map.buildableTiles) assert.ok(!pathKeys.has(`${pad.x}:${pad.y}`));
for (const point of [...map.pathTiles, ...map.buildableTiles, ...map.spawnPoints, map.castle.position]) {
  assert.ok(point.x >= 0 && point.x < map.columns && point.y >= 0 && point.y < map.rows);
}
const { createSwampScene } = load(path.join(root, "components/tower-defense/scene/swamp-scene.ts"));
const { expandSwampEditableArea } = load(path.join(root, "utils/games/swampEditableArea.ts"));
const { createCitadelArchitecture, batchCitadelArchitecture } = load(path.join(root, "components/tower-defense/scene/citadel-architecture.ts"));
const castleMaterials = [0x696872, 0x45434c, 0x202936].map((color) => new THREE.MeshStandardMaterial({ color }));
const referenceCastle = createCitadelArchitecture(...castleMaterials);
const originalCastleBounds = new THREE.Box3().setFromObject(referenceCastle);
batchCitadelArchitecture(referenceCastle);
const batchedCastleBounds = new THREE.Box3().setFromObject(referenceCastle);
assert.ok(originalCastleBounds.min.distanceTo(batchedCastleBounds.min) < 0.00001);
assert.ok(originalCastleBounds.max.distanceTo(batchedCastleBounds.max) < 0.00001);
const lavaSceneSource = fs.readFileSync(path.join(root, "pages/games/tower-defense/test.vue"), "utf8");
assert.match(lavaSceneSource, /const fortress = createCitadelArchitecture\(stone, darkStone, roof/);
const { mapSpacePosition } = load(path.join(root, "games/tower-defense/map-space.ts"));
const { pickMapPreviewPoint } = load(path.join(root, "utils/games/mapPreviewPicking.ts"));
const expandedMap = expandSwampEditableArea(map);
assert.equal(expandedMap.columns, 70);
assert.equal(expandedMap.rows, 60);
assert.equal(expandedMap.swampSettings.editorPadding, 13);
assert.strictEqual(expandSwampEditableArea(expandedMap), expandedMap, "editing/saving twice must not expand twice");
assert.deepEqual(mapSpacePosition(expandedMap, expandedMap.castle.position), mapSpacePosition(map, map.castle.position));
const expandedScene = new THREE.Scene();
const expandedEnvironment = createSwampScene(expandedScene, expandedMap, null);
for (const tile of expandedEnvironment.tileMeshes) {
  assert.deepEqual(pickMapPreviewPoint(expandedMap, tile.position, true), tile.userData.cell);
}
for (const land of expandedScene.getObjectsByProperty("name", "swampEdgeLand")) {
  const point = pickMapPreviewPoint(expandedMap, land.position);
  assert.ok(point, "outer land must accept spawn and lane clicks");
  const edited = structuredClone(expandedMap);
  edited.spawnPoints[0] = point;
  edited.paths[0] = [{ ...point }, { x: point.x + 1, y: point.y }];
  const editedScene = new THREE.Scene(); createSwampScene(editedScene, edited, null);
  assert.ok(editedScene.getObjectByName("swampPathPaving").userData.pathCells.some((p) => p.x === point.x && p.y === point.y));
}
const scene = new THREE.Scene();
const environment = createSwampScene(scene, map, null);
assert.equal(mapSpacePosition(map, { x: 0, y: 0 }).baseY, 0.25);
assert.equal(scene.getObjectByName("gothicSwampEnvironment").position.y, 0.25);
assert.ok(Math.abs(scene.getObjectByName("swampWater").getWorldPosition(new THREE.Vector3()).y + 0.65) < 0.00001,
  "raising ground must not raise the water surface");
for (const name of ["swampGreenTrees", "swampGravestones", "swampGrass"]) {
  assert.ok(scene.getObjectByName(name)?.count > 0, `${name} must decorate the dry land`);
}
assert.equal(environment.tileMeshes.length, 12);
assert.equal(scene.getObjectByName("swampPathPaving").count, pathKeys.size * 4);
const platforms = scene.getObjectByName("swampTowerPlatforms");
const torchFlames = scene.getObjectByName("swampTorchFlames");
for (let index = 0; index < torchFlames.count; index++) {
  const matrix = new THREE.Matrix4(); torchFlames.getMatrixAt(index, matrix);
  const x = matrix.elements[12], z = matrix.elements[14];
  assert.ok(!map.paths.flat().some((point) => {
    const road = mapSpacePosition(map, point);
    return Math.abs(road.x - x) < map.cellSize / 2 + 0.374
      && Math.abs(road.z - z) < map.cellSize / 2 + 0.374;
  }), "lamp pedestals must not sit in the middle of a bend or crossing lane");
}
const waterContact = scene.getObjectByName("swampWaterContact");
assert.ok(waterContact.userData.contactSegments > 0 && waterContact.userData.contactSegments <= 12000);
assert.equal(waterContact.material.depthWrite, false);
const contactGeometry = waterContact.geometry;
environment.update(2.5);
assert.equal(waterContact.material.uniforms.uTime.value, 2.5);
assert.equal(waterContact.geometry, contactGeometry);
const platformPositions = platforms.geometry.getAttribute("position");
assert.ok(platforms.geometry.hasAttribute("color"), "stone courses have shaded recesses");
const wornCap = Array.from({ length: platformPositions.count }, (_, i) => ({
  radius: Math.hypot(platformPositions.getX(i), platformPositions.getZ(i)), y: platformPositions.getY(i),
})).filter((point) => point.y > 0.46 && point.radius < 0.9);
assert.ok(wornCap.some((point) => point.y < 0.49), "pad tops need recessed weathering, not a flat triangle fan");
assert.ok(wornCap.every((point) => point.y <= 0.500001), "surface relief must not raise the tower support plane");
assert.ok(wornCap.filter((point) => point.radius <= 0.451).every((point) => Math.abs(point.y - 0.5) < 0.000001),
  "the central tower footing stays level");
assert.ok(platformPositions.count < 250, "weathering uses one lightweight instanced geometry");
assert.ok(new Set(Array.from({ length: platformPositions.count }, (_, i) => platformPositions.getY(i).toFixed(3))).size > 8,
  "platform walls have multiple uneven courses, not a plain cylinder");
const { createSwampPadGeometry } = load(path.join(root, "components/tower-defense/scene/swamp-pad-geometry.ts"));
assert.deepEqual(Array.from(createSwampPadGeometry().attributes.position.array), Array.from(platformPositions.array),
  "pad weathering must remain stable across edits and rebuilds");
const rings = scene.getObjectByName("swampTowerPadRings");
assert.equal(scene.getObjectByName("swampTowerPadSpokes"), undefined, "four-direction pad decorations have been removed");
function instanceBounds(mesh, index) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
}
const roadTop = instanceBounds(scene.getObjectByName("swampPathPaving"), 0).max.y;
for (let index = 0; index < platforms.count; index++) {
  const padTop = instanceBounds(platforms, index).max.y;
  assert.ok(instanceBounds(platforms, index).max.x - instanceBounds(platforms, index).min.x <= map.cellSize * 1.16,
    "swamp platforms retain a compact footprint independent of lava balcony sizing");
  assert.ok(roadTop - padTop > 0.025, "platform caps must not share the paving depth");
  assert.ok(instanceBounds(rings, index).min.y - padTop > 0.01, "the entire ring tube must clear the pad cap");
}
assert.equal(scene.getObjectByName("swampPathPaving").material.polygonOffset, true);
for (const name of ["swampPathPaving", "swampPathGround"]) {
  const geometry = scene.getObjectByName(name).geometry;
  assert.equal(geometry.type, "ExtrudeGeometry", "road surfaces must use chipped bevelled outlines rather than box tiles");
  geometry.computeBoundingBox();
  assert.ok(Math.abs(geometry.boundingBox.max.y - 0.5) < 0.00001 && Math.abs(geometry.boundingBox.min.y + 0.5) < 0.00001,
    "weathered edges must preserve the calibrated walking surface height");
}
assert.deepEqual(new Set(scene.getObjectByName("swampPathPaving").userData.pathCells.map((p) => `${p.x}:${p.y}`)), pathKeys);
const rerouted = structuredClone(map);
rerouted.paths = [[{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }], [{ x: 5, y: 4 }, { x: 5, y: 3 }]];
// Deliberately keep imported pathTiles unchanged: edited lanes are the authority.
const reroutedScene = new THREE.Scene();
createSwampScene(reroutedScene, rerouted, null);
const reroutedPaving = reroutedScene.getObjectByName("swampPathPaving");
assert.equal(reroutedPaving.count, 16, "new road cells generate four slabs each; shared lanes do not duplicate paving");
assert.deepEqual(reroutedPaving.userData.pathCells, [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 4 }]);
const slabMatrix = new THREE.Matrix4();
const newCell = mapSpacePosition(rerouted, { x: 3, y: 3 });
let slabX = 0, slabZ = 0;
for (let index = 0; index < 4; index++) {
  reroutedPaving.getMatrixAt(index, slabMatrix);
  slabX += slabMatrix.elements[12]; slabZ += slabMatrix.elements[14];
}
assert.ok(Math.abs(slabX / 4 - newCell.x) < 0.00001 && Math.abs(slabZ / 4 - newCell.z) < 0.00001);
assert.equal(reroutedScene.getObjectByName("swampBridgeArches"), undefined, "bridges on removed lanes must not remain behind");
const previewSource = fs.readFileSync(path.join(root, "components/tower-defense/MapPreview.client.vue"), "utf8");
assert.match(previewSource, /watch\(\(\) => props\.map, \(\) => void rebuildPreview\(\), \{ deep: true \}\)/);
for (const name of ["swampWater", "swampIsland", "swampFortress", "swampCastleGround", "swampCastleMoss", "swampCastleReeds", "swampMarshBanks", "swampTreeBranches", "swampLilyPads", "swampLowMist", "swampTowerPlatforms", "swampTorchFlames"]) {
  assert.ok(scene.getObjectByName(name), name);
}
assert.equal(scene.getObjectsByProperty("name", "swampIsland").length, map.swampSettings.islands.length);
assert.equal(scene.getObjectByName("swampWarmWindows"), undefined, "small decorative houses and their windows must be removed");
const largeLands = scene.getObjectsByProperty("name", "swampIsland").filter((island) => island.userData.largeLand);
assert.equal(largeLands.length, 4, "four substantial land regions should interrupt the small marsh clusters");
for (const land of largeLands) {
  const size = new THREE.Box3().setFromObject(land).getSize(new THREE.Vector3());
  assert.ok(size.x > 24 && size.z > 18, "large land must visibly exceed the small islands");
}
const outerLands = scene.getObjectsByProperty("name", "swampEdgeLand");
assert.equal(outerLands.length, 6, "large scenic land must also appear outside the editable map edges");
for (const land of outerLands) {
  const bounds = new THREE.Box3().setFromObject(land);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(Math.max(size.x, size.z) > 24 && Math.min(size.x, size.z) > 13);
  assert.ok(bounds.max.y < 0.25 - 0.18 && bounds.max.y > -0.65, "edge land stays below roads and above water");
  assert.ok(bounds.min.x > -(map.columns * map.cellSize + 70) / 2 && bounds.max.x < (map.columns * map.cellSize + 70) / 2);
  assert.ok(bounds.min.z > -(map.rows * map.cellSize + 70) / 2 && bounds.max.z < (map.rows * map.cellSize + 70) / 2);
}
const spawnAreas = map.swampSettings.islands.filter((island) => island.spawnArea);
assert.equal(spawnAreas.length, 8, "provide eight additional clear land regions, not more portals");
assert.equal(map.spawnPoints.length, 2);
assert.equal(scene.getObjectsByProperty("name", "swampIsland").filter((island) => island.userData.spawnArea).length, 8);
for (const area of spawnAreas) {
  const position = mapSpacePosition(map, area);
  assert.deepEqual(pickMapPreviewPoint(map, new THREE.Vector3(position.x, 0.06, position.z), false), { x: area.x, y: area.y });
  assert.ok(area.radius >= 3, "spawn land must have room around a portal");
}
assert.equal(map.swampSettings.treeCount, 160);
assert.ok(scene.getObjectByName("swampMarshBanks").count >= 40, "marsh clusters must fill the empty surroundings");
const banks = scene.getObjectByName("swampMarshBanks");
assert.deepEqual(Array.from(expandedScene.getObjectByName("swampMarshBanks").instanceMatrix.array), Array.from(banks.instanceMatrix.array),
  "expanding the editable area must preserve terrain positions and shapes");
const edgeCoverage = { left: 0, right: 0, rear: 0, front: 0 };
const bankRotations = new Set();
const bankSizes = new Set();
const edgeDepths = new Set();
const bankMatrix = new THREE.Matrix4();
const playableHalfWidth = (map.columns - 1) * map.cellSize / 2;
const playableHalfDepth = (map.rows - 1) * map.cellSize / 2;
for (let index = 0; index < banks.count; index++) {
  banks.getMatrixAt(index, bankMatrix);
  const position = new THREE.Vector3().setFromMatrixPosition(bankMatrix);
  const rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  bankMatrix.decompose(new THREE.Vector3(), rotation, scale);
  bankRotations.add(rotation.toArray().map((value) => value.toFixed(2)).join(":"));
  bankSizes.add(`${scale.x.toFixed(1)}:${scale.z.toFixed(1)}`);
  if (position.x < -playableHalfWidth - 15) edgeDepths.add(Math.round(-position.x - playableHalfWidth));
  if (position.x < -playableHalfWidth - 15) edgeCoverage.left++;
  if (position.x > playableHalfWidth + 15) edgeCoverage.right++;
  if (position.z < -playableHalfDepth - 15) edgeCoverage.rear++;
  if (position.z > playableHalfDepth + 15) edgeCoverage.front++;
  assert.ok(Math.abs(position.x) + 6 < (map.columns * map.cellSize + 70) / 2);
  assert.ok(Math.abs(position.z) + 6 < (map.rows * map.cellSize + 70) / 2);
}
for (const [side, count] of Object.entries(edgeCoverage)) {
  assert.ok(count >= 6, `${side} outer water band must have visible marsh clusters`);
}
assert.ok(edgeDepths.size >= 5, "shore clusters must occupy a broad irregular band, not one straight row");
assert.ok(bankRotations.size > 20 && bankSizes.size > 20, "banks must vary in orientation and proportions");
assert.ok(scene.getObjectByName("swampLilyPads").count > 800, "lily pads must form visible clusters");
const leaves = scene.getObjectByName("swampLilyPads");
assert.equal(leaves.material.side, THREE.FrontSide);
assert.equal(leaves.material.polygonOffset, true);
const leafPositions = [];
const leafMatrix = new THREE.Matrix4();
for (let index = 0; index < leaves.count; index++) {
  leaves.getMatrixAt(index, leafMatrix);
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), scale = new THREE.Vector3();
  leafMatrix.decompose(p, q, scale);
  assert.ok(p.y - scene.getObjectByName("swampWater").position.y > 0.09, "leaves must clear the water depth plane");
  for (const previous of leafPositions) {
    assert.ok(Math.hypot(p.x - previous.x, p.z - previous.z) >= scale.x + previous.radius + 0.025,
      "coplanar leaves must not overlap and flicker");
  }
  leafPositions.push({ x: p.x, z: p.z, radius: scale.x });
}
for (const island of scene.getObjectsByProperty("name", "swampIsland")) {
  assert.ok(new THREE.Box3().setFromObject(island).max.y < 0.25 - 0.08, "soil must not share the paving's depth plane");
}
for (const land of [...scene.getObjectsByProperty("name", "swampIsland"),
  ...scene.getObjectsByProperty("name", "swampEdgeLand"), scene.getObjectByName("swampCastleGround")]) {
  const geometry = land.geometry;
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const topHeights = [];
  for (let index = 0; index < positions.count; index++) {
    if (normals.getY(index) > 0.85) topHeights.push(positions.getY(index));
  }
  assert.ok(topHeights.length > 30, "soil must have interior surface vertices, not just a flat outline cap");
  assert.ok(Math.max(...topHeights) - Math.min(...topHeights) > 0.05, "soil surface must have visible relief");
  assert.ok(positions.count < 6000, "terrain tessellation stays bounded for live editing");
  assert.ok(geometry.hasAttribute("color"), "soil must have stable mottled surface colours");
  assert.equal(land.material.vertexColors, true);
}
assert.equal(scene.getObjectByName("swampLowMist").material.forceSinglePass, true);
assert.equal(scene.getObjectByName("swampLowMist").material.depthWrite, false);
assert.ok(scene.getObjectByName("swampTreeBranches").count <= map.swampSettings.treeCount * 15);
assert.ok(scene.getObjectByName("swampTreeBranches").count > map.swampSettings.treeCount * 10, "only obstructing trees should be hidden, not redistributed");
const gate = mapSpacePosition(map, map.castle.position);
assert.equal(scene.getObjectByName("swampFortress").position.x, gate.x);
assert.equal(scene.getObjectByName("swampFortress").position.z, gate.z);
const marshGround = scene.getObjectByName("swampCastleGround");
assert.equal(marshGround.position.x, gate.x);
assert.equal(marshGround.position.z, gate.z);
assert.equal(marshGround.material.vertexColors, true, "castle surroundings use mottled mud and moss");
const marshBounds = new THREE.Box3().setFromObject(marshGround);
assert.ok(marshBounds.max.y < 0.25 + 0.06, "mud must not cover the road or castle courtyard");
assert.ok(marshBounds.min.y < -0.65 && marshBounds.max.y > -0.65, "shoreline must meet the swamp water");
const swampCastle = scene.getObjectByName("citadelArchitecture");
assert.deepEqual(swampCastle.scale.toArray(), [1, 1, 1], "castle must have the lava castle's full size");
assert.equal(swampCastle.position.z, -13.05, "shared gate must align with the configured destination cell");
const detachedCastle = swampCastle.clone(true);
detachedCastle.position.set(0, 0, 0);
const swampCastleBounds = new THREE.Box3().setFromObject(detachedCastle);
assert.ok(originalCastleBounds.min.distanceTo(swampCastleBounds.min) < 0.00001);
assert.ok(originalCastleBounds.max.distanceTo(swampCastleBounds.max) < 0.00001);
let castleDraws = 0;
swampCastle.traverse((object) => { if (object instanceof THREE.Mesh) castleDraws++; });
assert.ok(castleDraws < 60, `castle geometry must be batched, got ${castleDraws} draws`);
let instanceBatches = 0;
scene.traverse((object) => {
  if (!(object instanceof THREE.InstancedMesh)) return;
  instanceBatches++;
  assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite), object.name);
});
assert.ok(instanceBatches < 25, "decorations must be batched rather than thousands of individual draws");
for (const tile of environment.tileMeshes) {
  const p = tile.userData.cell;
  assert.deepEqual(pickMapPreviewPoint(map, tile.position, true), p);
  assert.equal(mapSpacePosition(map, p).padOffset, 0.06);
}
environment.update(4.2);
assert.equal(scene.getObjectByName("swampWater").material.uniforms.uTime.value, 4.2);
const repeatScene = new THREE.Scene();
createSwampScene(repeatScene, map, null);
assert.deepEqual(Array.from(repeatScene.getObjectByName("swampMarshBanks").instanceMatrix.array), Array.from(banks.instanceMatrix.array),
  "natural variation must stay deterministic across preview rebuilds");
const movedPortal = structuredClone(map);
movedPortal.spawnPoints[0] = { x: 11, y: 13 };
const portalScene = new THREE.Scene(); createSwampScene(portalScene, movedPortal, null);
const changedLaneScene = new THREE.Scene(); createSwampScene(changedLaneScene, rerouted, null);
for (const editedScene of [portalScene, changedLaneScene]) {
  assert.deepEqual(Array.from(editedScene.getObjectByName("swampMarshBanks").instanceMatrix.array), Array.from(banks.instanceMatrix.array),
    "placing portals or editing lanes must never redistribute soil patches");
  const oldLands = scene.getObjectsByProperty("name", "swampEdgeLand");
  const newLands = editedScene.getObjectsByProperty("name", "swampEdgeLand");
  assert.equal(newLands.length, oldLands.length);
  oldLands.forEach((land, index) => {
    assert.deepEqual(newLands[index].position.toArray(), land.position.toArray());
    assert.deepEqual(Array.from(newLands[index].geometry.attributes.position.array), Array.from(land.geometry.attributes.position.array));
  });
}
const unaffectedTrees = (targetScene) => {
  const mesh = targetScene.getObjectByName("swampTreeBranches"), matrix = new THREE.Matrix4();
  const portalPositions = [...map.spawnPoints, ...movedPortal.spawnPoints].map((point) => mapSpacePosition(map, point));
  const result = [];
  for (let index = 0; index < mesh.count; index += 15) {
    mesh.getMatrixAt(index, matrix);
    if (portalPositions.some((p) => Math.hypot(p.x - matrix.elements[12], p.z - matrix.elements[14]) < map.cellSize * 3)) continue;
    result.push(Array.from(mesh.instanceMatrix.array.slice(index * 16, (index + 15) * 16)).join(":"));
  }
  return result.sort();
};
assert.deepEqual(unaffectedTrees(portalScene), unaffectedTrees(scene), "trees away from the edited portal must keep their position and shape");
const moved = structuredClone(map); moved.buildableTiles.push({ x: 3, y: 3 }); moved.castle.position = { x: 35, y: 4 };
const movedScene = new THREE.Scene();
const updated = createSwampScene(movedScene, moved, null);
assert.equal(updated.tileMeshes.length, 13);
const movedGate = mapSpacePosition(moved, moved.castle.position);
assert.equal(movedScene.getObjectByName("swampCastleGround").position.x, movedGate.x);
assert.equal(movedScene.getObjectByName("swampCastleGround").position.z, movedGate.z);
const lava = require("../app/data/tower-defense/lava-map.json").configuration;
assert.equal(lava.scenePreset, "citadel-of-cinders");
console.log(`PASS: swamp preset lanes/pads, shared 3D layout, editable placement, surface projection, animated water and ${instanceBatches} decoration batches`);
