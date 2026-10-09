const assert = require("node:assert/strict");
const fs = require("node:fs");
const scene = fs.readFileSync("app/components/tower-defense/scene/swamp-scene.ts", "utf8");
assert.doesNotMatch(scene, /swamp-creature|creatureShadow|updateSwampCreature|uCreature|vWaterWorld/,
  "shared preview/game swamp scene must no longer render or animate the creature shadow");
assert.match(scene, /waterContact\?\.update\(elapsed\)/, "shoreline waves remain animated on water maps");
assert.match(scene, /waterMaterial.uniforms.uTime!.value = elapsed/, "water remains animated");
console.log("PASS: creature shadow removed from shared scene; water and shoreline waves retained");
