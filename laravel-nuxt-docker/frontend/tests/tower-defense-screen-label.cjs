const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const THREE = require("three");
const moduleUnderTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync("app/components/tower-defense/scene/screen-label.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("require", "module", "exports", code)(require, moduleUnderTest, moduleUnderTest.exports);
const { scaleScreenLabel } = moduleUnderTest.exports;
for (const camera of [new THREE.PerspectiveCamera(45, 1.5, 0.1, 1000), new THREE.OrthographicCamera(-80, 80, 60, -60, 0.1, 1000)]) {
  for (const depth of [8, 50, 180]) for (const modelScale of [0.4, 1, 5]) for (const zoom of [0.7, 2.5]) {
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, depth);
    camera.updateMatrixWorld(true);
    const model = new THREE.Group();
    model.scale.setScalar(modelScale);
    const label = new THREE.Sprite();
    model.add(label);
    scaleScreenLabel(label, camera, 720, 54, 21);
    model.updateMatrixWorld(true);
    const scale = label.getWorldScale(new THREE.Vector3());
    const projectedDepth = camera.isPerspectiveCamera ? depth : 1;
    const pixelHeight = scale.y * camera.projectionMatrix.elements[5] / projectedDepth * 360;
    assert.ok(Math.abs(pixelHeight - 21) < 0.001, "labels stay readable across map scale, camera distance and zoom");
    assert.ok(Math.abs(scale.x / scale.y - 54 / 21) < 0.001);
  }
}
const scene = fs.readFileSync("app/components/tower-defense/TowerDefenseScene.client.vue", "utf8");
const enemies = fs.readFileSync("app/components/tower-defense/scene/enemy-scene.ts", "utf8");
assert.match(scene, /scaleScreenLabel\(label, camera/);
assert.match(scene, /scaleScreenLabel\(badges, camera/);
assert.match(enemies, /scaleScreenLabel\(healthBars, camera/);
assert.match(enemies, /scaleScreenLabel\(badges, camera/);
assert.match(scene, /badge.scale.set\(24, 24, 1\)/);
assert.match(enemies, /24 \/ 0.28, 24 \/ 0.28/);
assert.doesNotMatch(enemies, /badge.scale.set\(0.28 \* pulse/);

// Execute actual canvas builders: supersampled assets must not be clipped,
// and repeated status changes reuse the same GPU texture.
function textureBuilder(source, name, caches) {
  const ast = ts.createSourceFile("scene.ts", source.replace(/<\/?script[^>]*>/g, ""), ts.ScriptTarget.Latest, true);
  let builder;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) builder = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(builder);
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
  const document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const js = ts.transpileModule(builder, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function("THREE", "document", ...Object.keys(caches), `${js}; return ${name};`)(THREE, document, ...Object.values(caches));
}
const buff = textureBuilder(scene, "getTowerBuffBadgeTexture", { towerBuffBadgeTextures: new Map() });
const status = textureBuilder(enemies, "getStatusBadgeTexture", { statusBadgeTextures: new Map() });
for (const [builder, kinds, resolution] of [[buff, ["speed", "damage"], 256], [status, ["fire", "frost", "water"], 288]]) {
  for (const kind of kinds) {
    const texture = builder(kind);
    assert.equal(texture.image.width, resolution);
    assert.equal(texture.image.height, resolution);
    assert.equal(texture.generateMipmaps, false);
    assert.equal(texture.minFilter, THREE.LinearFilter);
    assert.equal(builder(kind), texture);
  }
}
console.log("PASS: screen-sized tower levels, buffs, enemy health and status labels across maps and zoom levels");
