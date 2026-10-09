const assert = require("node:assert/strict");
const fs = require("node:fs");
const ids = ["moonfrost-lake"];
const snapshot = JSON.parse(fs.readFileSync("../backend/database/data/tower-defense-maps.json"));
const key = ({ x, y }) => `${x}:${y}`;
for (const [index, id] of ids.entries()) {
  const preset = JSON.parse(fs.readFileSync(`app/data/tower-defense/${id}-map.json`));
  const c = preset.configuration;
  const stored = snapshot.find(map => map.id === id);
  assert.deepEqual(stored.configuration, c, "admin template and DB snapshot use identical configuration");
  assert.equal(stored.sort_order, index + 2);
  assert.equal(c.story.chapter, 4);
  assert.ok(c.story.summary.includes("Hư Không"));
  assert.equal(c.paths.length, 2);
  const pathKeys = new Set(c.paths.flat().map(key));
  assert.equal(new Set(c.pathTiles.map(key)).size, c.pathTiles.length);
  assert.deepEqual(new Set(c.pathTiles.map(key)), pathKeys);
  assert.ok(c.maxTowerCount <= c.buildableTiles.length);
  assert.equal(new Set(c.buildableTiles.map(key)).size, c.buildableTiles.length);
  for (const p of [...c.pathTiles, ...c.buildableTiles]) {
    assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y));
    assert.ok(p.x >= 0 && p.x < c.columns && p.y >= 0 && p.y < c.rows);
  }
  for (const p of c.buildableTiles) assert.ok(!pathKeys.has(key(p)), "pads cannot block enemy lanes");
  for (const [lane, path] of c.paths.entries()) {
    assert.deepEqual(path[0], c.spawnPoints[lane]);
    assert.deepEqual(path.at(-1), c.castle.position);
    for (let i = 1; i < path.length; i++) {
      assert.equal(Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y), 1,
        "lanes must remain continuous and orthogonal");
    }
  }
  if (c.swampSettings) assert.ok(c.swampSettings.treeCount <= 160, "new maps retain scenery budget");
}
const manager = fs.readFileSync("app/components/admin/TowerDefenseMapManager.vue", "utf8");
for (const id of ids) assert.ok(manager.includes(`${id}-map.json`));
for (const id of ["oathkeeper-necropolis", "last-rift-bastion"]) {
  assert.equal(snapshot.some(map => map.id === id), false, "removed maps cannot be recreated by snapshot seeding");
  assert.equal(manager.includes(`${id}-map.json`), false, "removed maps are absent from admin presets");
}
console.log("PASS: moonfrost campaign map, removed-map exclusions, DB/template parity, connected lanes and valid pads");
