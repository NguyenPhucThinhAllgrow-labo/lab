const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith(".")
    ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const { createVolcanicFoundation } = load(path.resolve("app/components/tower-defense/scene/volcanic-foundation.ts"));
const shape = new THREE.Shape(); shape.moveTo(-47, -59); shape.lineTo(8, -59);
shape.lineTo(17, -42); shape.lineTo(17, 42); shape.lineTo(8, 59); shape.lineTo(-47, 59); shape.closePath();
const geometry = createVolcanicFoundation(shape, 8.7, 0.65, 3907);
const repeated = createVolcanicFoundation(shape, 8.7, 0.65, 3907);
assert.deepEqual(Array.from(geometry.attributes.position.array), Array.from(repeated.attributes.position.array), "terrain must not randomize during editing");
assert.equal(geometry.groups.length, 2, "top rock and basalt walls retain their separate materials");
assert.ok(geometry.attributes.position.count < 14000, "terrain tessellation stays bounded");
const world = geometry.clone().rotateX(Math.PI / 2).translate(0, 4.55, 0);
world.computeBoundingBox();
assert.ok(world.boundingBox.max.y <= 5.21 && world.boundingBox.max.y > 4.8, "foundation must remain below the 5.3 bridge deck");
assert.ok(world.boundingBox.min.y < -4.7, "the cliff base retains its original submerged depth");
const p = geometry.attributes.position;
const heights = new Set(); const edgeWidths = new Set();
for (let index = 0; index < p.count; index++) {
  if (p.getZ(index) > 1) {
    heights.add(p.getZ(index).toFixed(2));
    if (p.getX(index) < -46) edgeWidths.add(p.getX(index).toFixed(2));
  }
}
assert.ok(heights.size > 30 && edgeWidths.size > 15, "cliff faces need multiple rough vertical layers, not flat extrusion walls");
const colors = geometry.attributes.color;
for (let index = 0; index < colors.count; index++) {
  assert.equal(colors.getX(index), colors.getY(index), "terrain vertex colour must not introduce a brown cast");
  assert.equal(colors.getY(index), colors.getZ(index));
  assert.ok(colors.getX(index) >= 0.879 && colors.getX(index) <= 1);
}
const sceneSource = fs.readFileSync("app/pages/games/tower-defense/test.vue", "utf8");
assert.equal((sceneSource.match(/terrainMaterial.onBeforeCompile = material.onBeforeCompile/g) ?? []).length, 2,
  "both foundation clones must retain the original basalt colour and lava proximity shader");
const topNormal = world.attributes.normal;
assert.ok(Array.from({ length: topNormal.count }, (_, i) => topNormal.getY(i)).filter((n) => n > 0.9).length > 100,
  "top faces must point upward after coordinate conversion");
console.log("PASS: volcanic terrain relief, layered cliffs, material groups, winding, stable generation and bridge clearance");
