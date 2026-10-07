const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const THREE = require("three");
const exportsObject = {};
const source = fs.readFileSync("app/components/tower-defense/scene/map-appearance.ts", "utf8");
new Function("require", "exports", ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(require, exportsObject);
const { applyMapAppearance, addMapAppearanceLights } = exportsObject;
for (const environmentMode of ["dark", "light"]) {
  const map = { environmentMode, theme: { background: "#18242b" } };
  const preview = new THREE.Scene(), game = new THREE.Scene();
  const previewRenderer = {}, gameRenderer = {};
  applyMapAppearance(preview, previewRenderer, map);
  applyMapAppearance(game, gameRenderer, map);
  addMapAppearanceLights(preview, map);
  addMapAppearanceLights(game, map);
  assert.deepEqual(gameRenderer, previewRenderer);
  assert.equal(gameRenderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(gameRenderer.toneMappingExposure, environmentMode === "dark" ? 0.9 : 1.05);
  assert.equal(game.background.getHex(), preview.background.getHex());
  const lights = (scene) => scene.children.map((light) => ({ type: light.type, color: light.color.getHex(), ground: light.groundColor?.getHex(), intensity: light.intensity, position: light.position.toArray(), shadow: light.castShadow }));
  assert.deepEqual(lights(game), lights(preview));
  assert.equal(game.children.length, 3, "no additional gameplay ambient light");
  assert.deepEqual(game.children[1].position.toArray(), [8, 18, 10]);
}
const game = fs.readFileSync("app/components/tower-defense/TowerDefenseScene.client.vue", "utf8");
const preview = fs.readFileSync("app/components/tower-defense/MapPreview.client.vue", "utf8");
assert.match(game, /applyMapAppearance\(scene, renderer, props.map\)/);
assert.match(game, /addMapAppearanceLights\(scene, props.map\)/);
assert.match(preview, /applyMapAppearance\(scene, renderer, props.map\)/);
assert.match(preview, /addMapAppearanceLights\(scene, map\)/);
for (const source of [game, preview]) assert.match(source, /createTowerDefenseMapScene\(scene, props.map, null\)/);
assert.doesNotMatch(game, /NeutralToneMapping|new THREE.AmbientLight|is-dark-environment::after/);
assert.match(game, /renderer = runtime\?\.renderer[\s\S]*?if \(!runtime\) \{[\s\S]*?applyMapAppearance/,
  "lava runtime retains its own preview colour pipeline");
assert.match(game, /<LavaCitadelScene[\s\S]*?:configuration="map"/);
const lava = fs.readFileSync("app/pages/games/tower-defense/test.vue", "utf8");
assert.match(lava, /renderer.toneMapping = THREE.ACESFilmicToneMapping/);
assert.match(lava, /renderer.toneMappingExposure = 1;/);
console.log("PASS: shared preview/game tone mapping, exposure, lighting, backgrounds and surface detail; lava runtime retained without extra vignette");
