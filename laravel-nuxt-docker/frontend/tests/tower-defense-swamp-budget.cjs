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
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith("~/")
    ? load(path.join(root, id.slice(2) + ".ts"))
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const { createSwampScene } = load(path.join(root, "components/tower-defense/scene/swamp-scene.ts"));
const records = JSON.parse(fs.readFileSync(path.join(__dirname, "../../backend/database/data/tower-defense-maps.json"), "utf8"));
const map = records.find((record) => record.configuration.scenePreset === "gothic-swamp").configuration;
const before = JSON.stringify(map);
const scene = new THREE.Scene();
createSwampScene(scene, map, null);
let total = 0;
const counts = {};
scene.traverse((object) => {
  if (!object.isMesh) return;
  for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  if (materials.every((material) => !material.visible)) return;
  const triangles = (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  const instances = object.isInstancedMesh ? object.count : 1;
  total += triangles * instances;
  counts[object.name] = instances;
});
assert.equal(JSON.stringify(map), before, "render optimization must not mutate saved map/gameplay data");
assert.ok(total < 180000, `static swamp scenery budget exceeded: ${total}`);
assert.equal(counts.swampTreeBranches, 2025, "keep all existing trees and branches");
assert.equal(counts.swampMarshBanks, 342, "keep all bank placements");
assert.equal(counts.swampPathPaving, 320, "keep all path paving cells");
assert.equal(counts.swampTowerPlatforms, map.buildableTiles.length, "keep all playable platforms");
console.log(`PASS: saved swamp static scenery ${total} triangles (baseline 291126); placements and gameplay data unchanged`);
