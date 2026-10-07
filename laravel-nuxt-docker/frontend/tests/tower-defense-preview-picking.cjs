const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../app");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith("~/")
    ? load(path.join(root, id.slice(2) + ".ts"))
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const { pickMapPreviewPoint } = load(path.join(root, "utils/games/mapPreviewPicking.ts"));
const { mapSpacePosition } = load(path.join(root, "games/tower-defense/map-space.ts"));
const { citadelBridgeTiles, citadelForecourtTiles } = load(path.join(root, "utils/games/citadelBridgeLayout.ts"));
const map = require("../app/data/tower-defense/lava-map.json").configuration;
for (const tile of [...citadelBridgeTiles(map), ...citadelForecourtTiles(map)]) {
  const world = mapSpacePosition(map, tile.point);
  assert.deepEqual(pickMapPreviewPoint(map, world), tile.point, "3D clicks must snap to the same physical paving cell as 2D");
}
for (const point of map.buildableTiles) {
  const world = mapSpacePosition(map, point);
  assert.deepEqual(pickMapPreviewPoint(map, world, true), point);
}
const standard = { ...map, scenePreset: undefined };
for (const point of [{ x: 0, y: 0 }, { x: 15, y: 22 }, { x: 89, y: 59 }]) {
  assert.deepEqual(pickMapPreviewPoint(standard, mapSpacePosition(standard, point)), point);
}
assert.equal(pickMapPreviewPoint(map, { x: 10000, z: 10000 }), null);
assert.equal(pickMapPreviewPoint(standard, { x: 10000, z: 10000 }), null);
console.log("PASS: 3D click projection matches bridge, court, balcony pads and regular maps; out-of-map clicks rejected");
