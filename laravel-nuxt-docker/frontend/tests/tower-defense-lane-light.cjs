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
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith("~/")
    ? load(path.join(root, id.slice(2) + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const { createLaneLightTrails } = load(path.join(root, "components/tower-defense/scene/lane-light-trail.ts"));
const { mapSpacePosition } = load(path.join(root, "games/tower-defense/map-space.ts"));
for (const preset of ["swamp-map", "lava-map"]) {
  const document = JSON.parse(fs.readFileSync(path.join(root, `data/tower-defense/${preset}.json`), "utf8"));
  const map = document.configuration;
  const original = JSON.stringify(map);
  const scene = new THREE.Scene();
  const trails = createLaneLightTrails(scene, map);
  assert.equal(trails.group.children.length, map.paths.filter((p) => p.length > 1).length);
  for (const [i, mesh] of trails.group.children.entries()) {
    const first = mapSpacePosition(map, map.paths[i][0]);
    const position = mesh.geometry.attributes.position;
    assert.ok(Math.abs((position.getX(0) + position.getX(1)) / 2 - first.x) < 0.0001);
    assert.ok(Math.abs(position.getY(0) - first.baseY - first.surfaceOffset - 0.09) < 0.0001);
    assert.equal(mesh.geometry.index.count / 3, 46, "each lane adds only 46 triangles");
    assert.equal(mesh.material.opacity, 0.22, "lane trail stays faint rather than overpowering the road");
    const buffer = position.array;
    trails.update(0.1);
    assert.strictEqual(position.array, buffer, "frame updates reuse vertex buffers");
    assert.ok(Array.from(buffer).every(Number.isFinite));
    trails.update(0);
  }
  assert.equal(JSON.stringify(map), original, "effect must not change gameplay paths");
  trails.dispose();
  assert.equal(scene.children.length, 0);
}
console.log("PASS: game lane light trails, preset surface heights, reused buffers, small triangle budget and cleanup");
