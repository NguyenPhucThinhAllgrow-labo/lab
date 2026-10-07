const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
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
const { TOWER_DEFINITIONS: definitions, supportBonusAt, towerSupportRange } = load(path.join(root, "games/tower-defense/gameplay-config.ts"));
const { createMapSpatialMetrics } = load(path.join(root, "games/tower-defense/map-space.ts"));
const effect = (behavior, radius) => ({ behavior, radius, value: 0.1, perLevel: 0.2 });
definitions.customSupport = { ...definitions.support, kind: "customSupport", templateKind: "support", role: "buff", range: 10,
  effects: [effect("attack_speed_aura", 3.5), effect("damage_aura", 2)] };
definitions.customFrost = { ...definitions.frost, kind: "customFrost", templateKind: "frost" };
const support = { id: 1, kind: "customSupport", x: 53, y: 27, level: 3 };
const tower = { id: 2, kind: "cannon", x: 53, y: 30, level: 1 };
const lava = JSON.parse(fs.readFileSync(path.join(root, "data/tower-defense/lava-map.json"))).configuration;
for (const map of [lava, { ...lava, scenePreset: "gothic-swamp" }, { ...lava, scenePreset: undefined }]) {
  const metric = createMapSpatialMetrics(map).distanceSquared;
  const expected = metric(support, tower) <= 3.5 ** 2 ? 0.5 : 0;
  assert.equal(supportBonusAt(tower, [support, tower], "speed", metric), expected);
  assert.equal(supportBonusAt({ ...tower, kind: "frost" }, [support], "damage", metric), 0);
  assert.equal(supportBonusAt({ ...tower, kind: "customFrost" }, [support], "damage", metric), 0);
  assert.equal(supportBonusAt({ ...tower, kind: "frost" }, [support], "speed", metric), expected);
  assert.equal(supportBonusAt(support, [support, tower], "speed", metric), 0);
}
const gridDistance = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const boundary = { ...tower, x: 56.5, y: 27 };
assert.equal(supportBonusAt(boundary, [support], "speed", gridDistance), 0.5);
assert.equal(supportBonusAt({ ...boundary, x: 56.501 }, [support], "speed", gridDistance), 0);
assert.equal(supportBonusAt(boundary, [support], "damage", gridDistance), 0);
const stronger = { ...support, id: 3, level: 2 };
assert.equal(supportBonusAt(tower, [support, stronger], "speed", gridDistance), 0.5, "auras do not stack");
assert.equal(towerSupportRange(definitions.customSupport, 3), 3.5, "preview uses effect radius, not stale base range");
const scene = fs.readFileSync(path.join(root, "components/tower-defense/TowerDefenseScene.client.vue"), "utf8");
assert.match(scene, /supportBonusAt\(tower, props.towers, kind, buffSpatialMetrics.distanceSquared\)/);
assert.match(scene, /towerSupportRange\(definition/);
const gameplay = fs.readFileSync(path.join(root, "composables/useTowerDefense.ts"), "utf8");
assert.match(gameplay, /supportBonusAt\(tower, towers.value, supportKind, distanceSquared\)/);
console.log("PASS: shared buff logic, world-space coverage, CMS variants, per-effect range, frost rules and non-stacking bonuses");
