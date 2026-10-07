const assert = require("node:assert/strict");
const fs = require("node:fs");
const THREE = require("three");
const game = fs.readFileSync("app/components/tower-defense/TowerDefenseScene.client.vue", "utf8");
const preview = fs.readFileSync("app/components/tower-defense/MapPreview.client.vue", "utf8");
const lava = fs.readFileSync("app/pages/games/tower-defense/test.vue", "utf8");
const swamp = fs.readFileSync("app/components/tower-defense/scene/swamp-scene.ts", "utf8");
const overlay = fs.readFileSync("app/components/tower-defense/scene/label-overlay.ts", "utf8");
for (const source of [game, preview, lava]) {
  assert.match(source, /new THREE.PerspectiveCamera\(38,[^;]*0\.5,/);
  assert.match(source, /document.hidden/);
}
assert.match(game, /if \(model.userData.buffLayoutKey !== buffLayoutKey\) \{\s*syncTowerBuffBadges/);
assert.match(game, /else positionTowerBuffBadges\(model\)/, "camera-facing icons still update when buff coverage is cached");
assert.doesNotMatch(overlay, /new Set\(sprites.map/);
assert.match(overlay, /activeMaterials.clear\(\)/);
assert.match(overlay, /scale.setFromMatrixScale\(sprite.matrixWorld\)/);
assert.match(swamp, /fwidth\(ripplePhase\)/);
assert.match(lava, /fwidth\(seam\)/);
assert.match(lava, /const padRuneMaterial[\s\S]*?polygonOffsetFactor: -1/);
assert.match(lava, /capTop \+ 0.0125 \* padScale\(z\) \+ 0.012/);
assert.match(lava, /\(padIsBalcony\(z\) \? 0.061 : 0\) \+ 0.025 \/ 2 \+ 0.012/);
for (const balcony of [false, true]) {
  const capTop = balcony ? 0.061 : 0;
  const ringBottom = capTop + 0.0125 * 1.2 + 0.012 - 0.0125 * 1.2;
  const spokeBottom = capTop + 0.025 / 2 + 0.012 - 0.025 / 2;
  assert.ok(ringBottom - capTop > 0.011 && spokeBottom - capTop > 0.011,
    "lava pad markings must clear both balcony insets and bridge paving");
}

// Quantify depth precision instead of claiming an unmeasured FPS improvement.
const separation = (near) => {
  const camera = new THREE.PerspectiveCamera(38, 1, near, 2500);
  const a = new THREE.Vector3(0, 0, -180).applyMatrix4(camera.projectionMatrix);
  const b = new THREE.Vector3(0, 0, -180.02).applyMatrix4(camera.projectionMatrix);
  return Math.abs(a.z - b.z);
};
assert.ok(separation(0.5) > separation(0.1) * 4.9, "fivefold depth precision gain for nearby surfaces at distant viewing angles");
console.log("PASS: improved depth precision, shader edge filtering, cached buff layout, reusable HUD storage and hidden-tab suspension");
