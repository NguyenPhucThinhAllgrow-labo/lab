const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vue = require("vue");
const source = fs.readFileSync("app/components/admin/TowerDefenseMapManager.vue", "utf8").split('<script setup lang="ts">')[1].split("</script>")[0];
const ast = ts.createSourceFile("editor.ts", source, ts.ScriptTarget.Latest, true);
const names = ["mapEditorSnapshot", "recordMapEditorHistory", "restoreMapEditorSnapshot", "undoMapEditorAction", "redoMapEditorAction", "handleMapEditorShortcut", "compressPath", "expandEditorPath", "syncEditorPaths", "updateMapConfiguration", "changeCastlePlacement", "clearMapEditorLane", "clearMapEditorBuildableTiles"];
const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map((node) => node.getText(ast)).join("\n");
assert.equal(functions.match(/function /g).length, names.length);
const initial = { paths: [[{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 0, y: 4 }, { x: 1, y: 4 }]],
  buildableTiles: [{ x: 2, y: 0 }], castle: { position: { x: 6, y: 2 }, modelUrl: "/castle.glb", maxSize: 15 } };
const mapForm = vue.reactive({ id: "original-map", name: "Original", isActive: true, configuration: JSON.stringify(initial) });
const selectedMapPreset = vue.ref("");
const mapActionUndo = vue.ref([]), mapActionRedo = vue.ref([]);
const mapEditorAnchors = vue.ref(structuredClone(initial.paths));
const visualMapConfiguration = vue.computed(() => { try { return JSON.parse(mapForm.configuration); } catch { return null; } });
const mapDialog = vue.ref({ open: true }), mapEditorPageReady = vue.ref(false), savingMap = vue.ref(false);
global.HTMLElement = class { constructor(editable = false) { this.isContentEditable = editable; } closest() { return false; } };
const dependencies = { mapForm, selectedMapPreset, mapActionUndo, mapActionRedo, mapEditorAnchors, visualMapConfiguration,
  mapDialog, mapEditorPageReady, savingMap, mapMode: vue.ref("edit"), mapEditorLane: vue.ref(0), mapEditorMessage: vue.ref("") };
const code = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const editor = new Function(...Object.keys(dependencies), `
  let mapHistoryReady = true, mapHistoryCurrent = null;
  const endMapAnchorDrag = () => {}, isBridgeSurfacePoint = () => false;
  ${code}
  mapHistoryCurrent = mapEditorSnapshot();
  return { recordMapEditorHistory, undoMapEditorAction, redoMapEditorAction, handleMapEditorShortcut,
    syncEditorPaths, updateMapConfiguration, changeCastlePlacement, clearMapEditorLane, clearMapEditorBuildableTiles };
`)(...Object.values(dependencies));
vue.watch(() => [mapForm.id, mapForm.name, mapForm.isActive, mapForm.configuration, selectedMapPreset.value], editor.recordMapEditorHistory);
const snapshot = () => ({ form: { ...mapForm }, preset: selectedMapPreset.value });
const read = () => JSON.parse(mapForm.configuration);
const shortcut = (key, changes = {}) => {
  let prevented = false;
  editor.handleMapEditorShortcut({ key, ctrlKey: true, target: new HTMLElement(), preventDefault() { prevented = true; }, ...changes });
  return prevented;
};
(async () => {
  const snapshots = [snapshot()];
  const operations = [
    () => { mapEditorAnchors.value[0].push({ x: 3, y: 0 }); editor.syncEditorPaths(); },
    () => editor.updateMapConfiguration((map) => { map.buildableTiles.push({ x: 5, y: 4 }); }),
    () => editor.clearMapEditorBuildableTiles(),
    () => editor.updateMapConfiguration((map) => { map.spawnPoints = [{ x: 1, y: 2 }, { x: 1, y: 4 }]; }),
    () => editor.changeCastlePlacement({ position: { x: 5, y: 2 } }),
    () => editor.changeCastlePlacement({ modelOffset: { x: 1.27, z: -3.5 } }),
    () => editor.updateMapConfiguration((map) => { map.castle.maxSize = 27.5; map.castle.modelUrl = "/different.glb"; }),
    () => editor.updateMapConfiguration((map) => { map.enemyDefinitionIds = ["enemy-new"]; map.backgroundMusicUrl = "/new.mp3"; }),
    () => { mapForm.name = "Renamed"; mapForm.isActive = false; },
    () => { mapEditorAnchors.value[0] = []; editor.syncEditorPaths(); },
    () => { selectedMapPreset.value = "swamp"; Object.assign(mapForm, { id: "new-preset", name: "Swamp", configuration: JSON.stringify(initial), isActive: true }); },
    () => { mapForm.configuration = '{ "invalid":'; },
  ];
  editor.undoMapEditorAction(); assert.equal(mapActionUndo.value.length, 0, "opening a map is not an edit");
  for (const operation of operations) {
    operation(); await vue.nextTick(); snapshots.push(snapshot());
  }
  assert.equal(mapActionUndo.value.length, operations.length, "each batched user action records exactly one full snapshot");
  for (let index = snapshots.length - 2; index >= 0; index--) {
    editor.undoMapEditorAction(); await vue.nextTick();
    assert.deepEqual(snapshot(), snapshots[index], "undo restores all fields, including collateral pad removals and invalid JSON drafts");
  }
  assert.deepEqual(read().buildableTiles, initial.buildableTiles);
  assert.equal(mapActionUndo.value.length, 0);
  for (let index = 1; index < snapshots.length; index++) {
    editor.redoMapEditorAction(); await vue.nextTick();
    assert.deepEqual(snapshot(), snapshots[index], "redo must restore the complete next map state");
  }
  editor.undoMapEditorAction(); await vue.nextTick();
  mapForm.name = "New branch"; await vue.nextTick();
  assert.equal(mapActionRedo.value.length, 0, "any new edit clears redo, not only lane edits");
  const before = snapshot();
  mapForm.name = "Pending edit";
  editor.undoMapEditorAction(); await vue.nextTick();
  assert.deepEqual(snapshot(), before, "immediate undo must flush pending edits without recording its own replay");
  assert.equal(shortcut("u", { ctrlKey: false, metaKey: true }), true);
  await vue.nextTick(); assert.equal(mapForm.name, "Pending edit");
  assert.equal(shortcut("z", { ctrlKey: false, metaKey: true }), true);
  await vue.nextTick(); assert.deepEqual(snapshot(), before);
  const input = new HTMLElement(); input.closest = () => ({});
  assert.equal(shortcut("u", { target: input }), false);
  assert.equal(shortcut("u", { target: new HTMLElement(true) }), false);
  assert.equal(shortcut("u", { repeat: true }), false);
  assert.equal(shortcut("u", { ctrlKey: false }), false);
  mapDialog.value.open = false; assert.equal(shortcut("u"), false);
  mapEditorPageReady.value = true; assert.equal(shortcut("u"), true);
  await vue.nextTick();
  savingMap.value = true; assert.equal(shortcut("z"), false); savingMap.value = false;
  for (let index = 0; index < 105; index++) { mapForm.name = `Edit ${index}`; await vue.nextTick(); }
  assert.equal(mapActionUndo.value.length, 100, "history is bounded to avoid unbounded editor memory");
  console.log("PASS: all map edits undo/redo, full form and presets, invalid JSON recovery, collateral changes, pending edits, shortcuts and bounded history");
})().catch((error) => { console.error(error); process.exitCode = 1; });
