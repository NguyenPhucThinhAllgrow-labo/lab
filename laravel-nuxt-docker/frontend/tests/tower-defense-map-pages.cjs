const assert = require("node:assert/strict");
const fs = require("node:fs");
const { parse, compileTemplate } = require("@vue/compiler-sfc");
const files = ["app/components/admin/TowerDefenseMapManager.vue", "app/pages/admin/tower-defense/maps/index.vue",
  "app/pages/admin/tower-defense/maps/create.vue", "app/pages/admin/tower-defense/maps/[mapId]/edit.vue"];
for (const file of files) {
  const { descriptor, errors } = parse(fs.readFileSync(file, "utf8"));
  assert.deepEqual(errors, []);
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: file }).errors, []);
}
const manager = fs.readFileSync(files[0], "utf8");
assert.match(manager, /await navigateTo\(mode === "create" \? "\/admin\/tower-defense\/maps\/create"/);
assert.match(manager, /encodeURIComponent\(item!\.id\).*\/edit/);
assert.match(manager, /:is="props.editorMode \? 'section' : 'dialog'"/);
assert.match(manager, /if \(!props.editorMode\) mapDialog.value\?\.showModal\(\)/);
assert.match(manager, /if \(!props.editorMode\) mapDialog.value\?\.close\(\)/);
assert.match(manager, /mapDialog.value\?\.open \|\| mapEditorPageReady.value/);
assert.match(manager, /\/api\/admin\/tower-defense\/maps\/\$\{encodeURIComponent\(props.mapId!\)\}/);
assert.match(manager, /if \(props.editorMode\) \{ await navigateTo\("\/admin\/tower-defense\/maps"\); return; \}/);
assert.match(manager, /<LiveMapEditor/);
assert.match(fs.readFileSync(files[2], "utf8"), /editor-mode="create"/);
assert.match(fs.readFileSync(files[3], "utf8"), /editor-mode="edit"/);
console.log("PASS: standalone create/edit routes, page form rendering, direct admin loading, save navigation and editor shortcuts");
