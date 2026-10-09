const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const THREE = require("three");
const exportsObject = {};
const js = ts.transpileModule(fs.readFileSync("app/components/tower-defense/scene/swamp-water-contact.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("require", "exports", js)(require, exportsObject);
const { createSwampWaterContact } = exportsObject;
function fixture() {
  const root = new THREE.Group(); root.position.y = 0.25;
  const shore = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), new THREE.MeshBasicMaterial());
  shore.name = "swampIsland"; root.add(shore);
  const rock = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial(), 2);
  rock.name = "swampRockwork";
  rock.setMatrixAt(0, new THREE.Matrix4().makeTranslation(6, 0, 0));
  rock.setMatrixAt(1, new THREE.Matrix4().makeTranslation(9, 10, 0));
  root.add(rock);
  return root;
}
const root = fixture();
const before = root.children.map((child) => child.matrix.clone());
const contact = createSwampWaterContact(root, -0.5);
assert.equal(contact.mesh.userData.contactSegments, 16, "shore and submerged instance contribute contours; dry instance is skipped");
const vertex = contact.mesh.geometry.getAttribute("position");
const ribbonWidth = new THREE.Vector3().fromBufferAttribute(vertex, 0)
  .distanceTo(new THREE.Vector3().fromBufferAttribute(vertex, 2));
assert.ok(Math.abs(ribbonWidth - 0.55) < 0.000001, "shoreline ripple footprint stays narrow");
for (let index = 0; index < vertex.count; index++) {
  assert.ok(Math.abs(vertex.getY(index) + 0.485) < 0.000001, "contact ribbons sit just above the water plane");
  assert.ok(vertex.getX(index) < 8, "no shoreline under the dry rock");
}
assert.equal(contact.mesh.material.depthWrite, false);
assert.equal(contact.mesh.material.depthTest, true, "dry land hides contact ribbons that overlap solid banks");
assert.equal(contact.mesh.material.forceSinglePass, true);
assert.equal(contact.mesh.material.blending, THREE.AdditiveBlending, "overlap order must not introduce transparency popping");
assert.match(contact.mesh.material.fragmentShader, /float patches=noise/);
assert.match(contact.mesh.material.fragmentShader, /uTime\*\.715/);
assert.match(contact.mesh.material.fragmentShader, /vec2\(uTime\*\.0234,-uTime\*\.0169\)/, "ripple drift and phase both move 30% faster");
assert.match(contact.mesh.material.fragmentShader, /crest\*\.17/);
assert.match(contact.mesh.material.fragmentShader, /sin\(wavePhase\)\),4\./, "wave crests retain their thin shape");
assert.match(contact.mesh.material.fragmentShader, /float warpedDistance=/);
assert.match(contact.mesh.material.fragmentShader, /float outerEdge=\.52\+patches/);
assert.doesNotMatch(contact.mesh.material.fragmentShader, /vDistance\*15\.|uTime\*1.8/,
  "contact water should not form fast, uniform bright rings");
const geometry = contact.mesh.geometry;
const original = Array.from(vertex.array);
for (let tick = 0; tick < 120; tick++) contact.update(tick / 60);
assert.equal(contact.mesh.material.uniforms.uTime.value, 119 / 60);
assert.equal(contact.mesh.geometry, geometry);
assert.deepEqual(Array.from(vertex.array), original, "GPU animation does not regenerate or upload geometry each frame");
root.children.slice(0, 2).forEach((child, index) => assert.deepEqual(child.matrix.elements, before[index].elements));
const repeated = createSwampWaterContact(fixture(), -0.5);
assert.deepEqual(Array.from(repeated.mesh.geometry.attributes.position.array), original);
const empty = createSwampWaterContact(new THREE.Group(), -0.5);
assert.equal(empty.mesh.userData.contactSegments, 0);
console.log("PASS: actual water intersections, instanced rocks, stable GPU-only ripples, dry-object exclusion and unchanged gameplay geometry");
