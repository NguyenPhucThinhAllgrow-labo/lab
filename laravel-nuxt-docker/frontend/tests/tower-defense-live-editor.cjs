const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({
  fillRect() {}, strokeRect() {}, fillText() {},
}) }) };
const vue = require("vue");
const root = path.resolve(__dirname, "../app");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "module", "exports", code)((id) => id.startsWith("~/")
    ? load(path.join(root, id.slice(2) + ".ts"))
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports);
  return module.exports;
}
const map = require("../app/data/tower-defense/lava-map.json").configuration;
const props = { map, tool: "buildable", lane: 0, anchors: [[{ x: 55, y: 30 }], []] };
const emitted = [];
let cleanup;
let frameCallback;
const script = fs.readFileSync(path.join(root, "components/tower-defense/LiveMapEditor.client.vue"), "utf8").split('<script setup lang="ts">')[1].split("</script>")[0];
const code = ts.transpileModule(script, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const editor = new Function("require", "exports", "defineProps", "defineEmits", "ref", "watch", "onBeforeUnmount", "requestAnimationFrame", "cancelAnimationFrame",
  code + "\nreturn { ready, down, move, up, cancel, chooseTool, enableCornerDrag, detach, changePreviewZoom, resetPreviewZoom };")((id) => id.endsWith(".vue") ? {}
    : id.startsWith("~/") ? load(path.join(root, id.slice(2) + ".ts")) : require(id), {},
  () => props, () => (event, value) => emitted.push([event, value]), vue.ref, () => {}, (fn) => { cleanup = fn; },
  (fn) => { frameCallback = fn; return 1; }, () => { frameCallback = null; });
const listeners = new Set();
const captured = new Set();
const canvas = {
  style: { cursor: "" },
  getBoundingClientRect: () => ({ left: 20, top: 30, width: 800, height: 600 }),
  addEventListener: (name) => listeners.add(name), removeEventListener: (name) => listeners.delete(name),
  setPointerCapture: (id) => captured.add(id), hasPointerCapture: (id) => captured.has(id),
  releasePointerCapture: (id) => captured.delete(id),
};
const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
camera.position.set(20, 60, 50); camera.lookAt(0, 5.3, 0); camera.updateMatrixWorld(true);
const controlListeners = new Set();
const controls = { target: new THREE.Vector3(0, 5.3, 0), minDistance: 4, maxDistance: 300,
  addEventListener: (name) => controlListeners.add(name), removeEventListener: (name) => controlListeners.delete(name),
  update: () => camera.updateMatrixWorld(true) };
const runtime = { scene: new THREE.Scene(), camera, renderer: { domElement: canvas }, controls };
editor.ready(runtime);
const labels = runtime.scene.getObjectsByProperty("name", "adminMapIdentityLabel");
assert.deepEqual(labels.map((label) => label.userData.text).sort(), ["Cổng 1", "Cổng 2", "Lane 1", "Lane 2"]);
assert.ok(labels.every((label) => !label.material.sizeAttenuation && !label.material.depthTest), "editor labels stay readable while zooming and are not hidden by models");
assert.ok(labels.every((label) => label.scale.x <= 0.105 && label.center.y === 0), "labels must be compact and anchored above their target");
const portalLabel = labels.find((label) => label.userData.text === "Cổng 1");
const portalBase = load(path.join(root, "games/tower-defense/map-space.ts")).mapSpacePosition(map, map.spawnPoints[0]);
assert.ok(portalLabel.position.y > portalBase.baseY + 5, "portal label must sit above the portal, not over its opening");
assert.equal(listeners.size, 5);
const { mapSpacePosition } = load(path.join(root, "games/tower-defense/map-space.ts"));
function pointerAt(point, button = 0) {
  const p = mapSpacePosition(map, point);
  const screen = new THREE.Vector3(p.x, 5.3, p.z).project(camera);
  return { button, pointerId: 1, clientX: 20 + (screen.x + 1) * 400,
    clientY: 30 + (1 - screen.y) * 300, preventDefault() {}, stopImmediatePropagation() {} };
}
const cell = { x: 55, y: 30 };
editor.down(pointerAt(cell)); editor.up(pointerAt(cell));
assert.equal(emitted.length, 0, "navigation mode must not mutate a map");
editor.chooseTool({ tool: "buildable", label: "Bệ trụ" }); emitted.length = 0;
editor.down(pointerAt(cell, 2)); editor.up(pointerAt(cell, 2));
assert.equal(emitted.length, 0, "right-button pan must not place anything");
editor.down(pointerAt(cell)); editor.up(pointerAt(cell));
assert.deepEqual(emitted.pop(), ["select", cell]);
assert.equal(captured.size, 0);
props.tool = "path";
editor.down(pointerAt(cell)); editor.up(pointerAt({ x: 56, y: 30 }));
assert.deepEqual(emitted.pop(), ["moveAnchor", { from: cell, to: { x: 56, y: 30 }, lane: 0 }]);
for (const tool of ["portal-0", "portal-1", "castle"]) {
  props.tool = tool; editor.down(pointerAt(cell)); editor.up(pointerAt(cell));
  assert.deepEqual(emitted.pop(), ["select", cell]);
}
editor.down(pointerAt(cell)); editor.cancel(); editor.up(pointerAt(cell));
assert.equal(emitted.length, 0, "cancelled drag must not edit");
assert.equal(captured.size, 0, "cancelled drag must release pointer capture");
const originalDistance = camera.position.distanceTo(controls.target);
const originalTarget = controls.target.clone();
editor.changePreviewZoom(1.25);
assert.ok(Math.abs(camera.position.distanceTo(controls.target) - originalDistance / 1.25) < 1e-9);
editor.changePreviewZoom(1 / 1.25);
assert.ok(Math.abs(camera.position.distanceTo(controls.target) - originalDistance) < 1e-9);
editor.changePreviewZoom(1e6);
assert.ok(Math.abs(camera.position.distanceTo(controls.target) - controls.minDistance) < 1e-9);
editor.changePreviewZoom(1e-6);
assert.ok(Math.abs(camera.position.distanceTo(controls.target) - controls.maxDistance) < 1e-9);
editor.resetPreviewZoom();
assert.ok(Math.abs(camera.position.distanceTo(controls.target) - originalDistance) < 1e-9);
assert.ok(controls.target.equals(originalTarget), "zoom must not change editing target");
props.tool = "buildable";
const orbitStart = pointerAt(cell);
let blocked = false;
orbitStart.stopImmediatePropagation = () => { blocked = true; };
editor.down(orbitStart);
assert.equal(blocked, false, "editing over empty space must allow OrbitControls to receive pointerdown");
const orbitMove = { ...orbitStart, clientX: orbitStart.clientX + 25 };
editor.move(orbitMove); frameCallback();
editor.move(orbitStart); frameCallback();
editor.up(orbitStart);
assert.equal(emitted.length, 0, "a camera drag returning to its start must not place a pad");
props.tool = "path";
props.anchors = [[{ x: 50, y: 30 }, cell, { x: 55, y: 35 }], []];
editor.enableCornerDrag(); emitted.length = 0;
editor.ready(runtime);
assert.equal(runtime.scene.getObjectsByProperty("name", "laneCornerHandle").length, 1);
const start = pointerAt(cell);
start.clientX += 10; // Handles must be easy to grab, not require exact grid-center clicks.
start.stopImmediatePropagation = () => { blocked = true; };
const destination = { x: 56, y: 29 };
const cameraBeforeDrag = camera.position.clone();
editor.down(start);
assert.equal(blocked, true, "lane handle dragging must block camera rotation");
editor.move(pointerAt(destination));
frameCallback();
const guide = runtime.scene.getObjectByName("laneCornerDragPreview");
assert.equal(guide.visible, true);
assert.ok(guide.geometry.getAttribute("position").count > 3);
assert.equal(emitted.length, 0, "dragging must only preview, not rebuild/persist each pointer move");
editor.up(pointerAt(destination));
assert.deepEqual(emitted.pop(), ["moveAnchor", { from: cell, to: destination, lane: 0 }]);
assert.equal(guide.visible, false);
assert.ok(camera.position.equals(cameraBeforeDrag));
editor.down(pointerAt(props.anchors[0][0])); editor.up(pointerAt(destination));
assert.equal(emitted.length, 0, "corner mode must not move spawn/endpoints or append path points");
editor.down(pointerAt(cell)); editor.move(pointerAt(destination)); frameCallback();
editor.cancel(); editor.up(pointerAt(destination));
assert.equal(guide.visible, false);
assert.equal(emitted.length, 0);
props.map = structuredClone(map);
props.map.castle.modelUrl = "/castle.glb";
props.map.castle.position = { ...cell };
const castle = new THREE.Group(); castle.name = "castleModel";
const castleBody = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), new THREE.MeshBasicMaterial());
castleBody.position.y = 3; castle.add(castleBody);
const castlePoint = mapSpacePosition(map, cell);
castle.position.set(castlePoint.x, 5.3, castlePoint.z);
runtime.scene.add(castle); castle.updateMatrixWorld(true);
const originalCastle = castle.position.clone();
editor.down(pointerAt(cell));
assert.equal(captured.size, 1, "clicking the castle must capture its drag, not rotate the camera");
const movedCastleCell = { x: cell.x + 0.35, y: cell.y };
editor.move(pointerAt(movedCastleCell)); frameCallback();
assert.ok(castle.position.distanceTo(originalCastle) > 0.1, "castle geometry must follow sub-cell movement immediately");
assert.equal(canvas.style.cursor, "grabbing");
assert.equal(runtime.scene.getObjectByName("castleModelFocus").visible, true);
assert.equal(emitted.length, 0, "castle movement must not rebuild the scene on each pointer event");
editor.up(pointerAt(movedCastleCell));
const moved = emitted.pop();
assert.equal(moved[0], "moveCastle");
assert.ok(Math.abs(moved[1].x - (mapSpacePosition(map, movedCastleCell).x - castlePoint.x)) < 0.00001);
assert.ok(Math.abs(moved[1].z - (mapSpacePosition(map, movedCastleCell).z - castlePoint.z)) < 0.00001);
assert.equal(captured.size, 0);
assert.ok(camera.position.equals(cameraBeforeDrag));
castle.position.copy(originalCastle); castle.updateMatrixWorld(true);
editor.down(pointerAt(cell)); editor.move(pointerAt(movedCastleCell)); frameCallback();
editor.cancel();
assert.ok(castle.position.equals(originalCastle), "cancel must restore castle position");
assert.equal(captured.size, 0);
assert.equal(emitted.length, 0);
editor.move(pointerAt(cell)); frameCallback();
assert.equal(canvas.style.cursor, "grab");
assert.equal(runtime.scene.getObjectByName("castleModelFocus").visible, true);
editor.cancel();
assert.equal(runtime.scene.getObjectByName("castleModelFocus").visible, false);
castle.removeFromParent();
cleanup();
assert.equal(listeners.size, 0);
assert.equal(controlListeners.size, 0);
assert.equal(runtime.scene.children.length, 0);
console.log("PASS: live 3D tools, corner grab tolerance/live route preview/drop/cancel, protected endpoints, zoom and cleanup");
