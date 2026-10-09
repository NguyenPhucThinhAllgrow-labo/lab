<script setup lang="ts">
import * as THREE from "three";
import { Orbit, Route, Layers, DoorOpen, Castle, Undo2, Redo2, Trash2, RotateCcw, ZoomIn, ZoomOut, Scan } from "lucide-vue-next";
import LavaCitadelScene from "~/pages/games/tower-defense/test.vue";
import MapPreview from "./MapPreview.client.vue";
import type { CitadelRuntime } from "./scene/citadel-runtime";
import type { GridPoint, TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { mapSpacePosition } from "~/games/tower-defense/map-space";
import { pickMapPreviewPoint } from "~/utils/games/mapPreviewPicking";

type Tool = "path" | "buildable" | "portal-0" | "portal-1" | "castle";
const toolIcons = { path: Route, buildable: Layers, "portal-0": DoorOpen, "portal-1": DoorOpen, castle: Castle };
const props = defineProps<{ map: TowerDefenseMapDefinition; tool: Tool; lane: 0 | 1; anchors: [GridPoint[], GridPoint[]]; canUndo?: boolean; canRedo?: boolean }>();
const emit = defineEmits<{
  select: [point: GridPoint];
  moveAnchor: [change: { from: GridPoint; to: GridPoint; lane: 0 | 1 }];
  moveCastle: [offset: { x: number; z: number }];
  "update:tool": [tool: Tool];
  "update:lane": [lane: 0 | 1];
  undo: [];
  redo: [];
  clearLane: [];
  clearPads: [];
  resetLayout: [];
}>();
const editing = ref(false);
const cornerDragMode = ref(false);
const draggingCorner = ref(false);
const cameraReady = ref(false);
const zoomPercent = ref(100);
let zoomCamera: THREE.Camera | null = null;
let initialCameraDistance = 0;
const hoverPoint = ref<GridPoint | null>(null);
let runtime: CitadelRuntime | null = null;
let overlay: THREE.Group | null = null;
let cursor: THREE.Mesh | null = null;
let dragGuide: THREE.Line | null = null;
let pressed: { id: number; point: GridPoint; anchor: boolean; moved: boolean; index: number; lane: 0 | 1; x: number; y: number } | null = null;
let castleDrag: { id: number; model: THREE.Object3D; origin: THREE.Vector3; grab: THREE.Vector3; offset: { x: number; z: number }; target: { x: number; z: number } | null } | null = null;
const castleFocused = ref(false);
let castleFocusBox: THREE.Box3Helper | null = null;
let hoverFrame = 0;
let pendingPointer: PointerEvent | null = null;
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hit = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
const tools: Array<{ label: string; tool: Tool; lane?: 0 | 1 }> = [
  { label: "Vẽ lane 1", tool: "path", lane: 0 }, { label: "Vẽ lane 2", tool: "path", lane: 1 },
  { label: "Đặt bệ trụ", tool: "buildable" }, { label: "Đặt cổng 1", tool: "portal-0" },
  { label: "Đặt cổng 2", tool: "portal-1" }, { label: "Đặt cổng lâu đài", tool: "castle" },
];
function updateZoomPercent() {
  if (!runtime || !initialCameraDistance) return;
  const distance = runtime.camera.position.distanceTo(runtime.controls.target);
  zoomPercent.value = Math.round(initialCameraDistance / Math.max(distance, 0.001) * 100);
}
function changePreviewZoom(factor: number) {
  if (!runtime) return;
  const { camera, controls } = runtime;
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  if (!distance) return;
  const nextDistance = THREE.MathUtils.clamp(distance / factor, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.multiplyScalar(nextDistance / distance));
  controls.update(); updateZoomPercent();
}
function resetPreviewZoom() {
  if (!runtime || !initialCameraDistance) return;
  changePreviewZoom(runtime.camera.position.distanceTo(runtime.controls.target) / initialCameraDistance);
}
function chooseTool(tool: typeof tools[number]) {
  cornerDragMode.value = false;
  editing.value = true;
  emit("update:tool", tool.tool);
  if (tool.lane !== undefined) emit("update:lane", tool.lane);
}
function enableCornerDrag() {
  editing.value = true;
  cornerDragMode.value = true;
  emit("update:tool", "path");
}
function anchorFromPointer(event: PointerEvent) {
  if (!runtime || props.tool !== "path") return -1;
  const bounds = runtime.renderer.domElement.getBoundingClientRect();
  let closest = -1; let distance = 16;
  props.anchors[props.lane].forEach((point, index, anchors) => {
    if (cornerDragMode.value && (index === 0 || index === anchors.length - 1)) return;
    const screen = position(point).project(runtime!.camera);
    if (screen.z < -1 || screen.z > 1) return;
    const pixels = Math.hypot(bounds.left + (screen.x + 1) * bounds.width / 2 - event.clientX,
      bounds.top + (1 - screen.y) * bounds.height / 2 - event.clientY);
    if (pixels < distance) { closest = index; distance = pixels; }
  });
  return closest;
}
function previewCorner(point: GridPoint) {
  if (!pressed?.anchor || !dragGuide) return;
  const anchors = props.anchors[pressed.lane].map((anchor, index) => index === pressed!.index ? point : anchor);
  const route: GridPoint[] = anchors.length ? [{ ...anchors[0]! }] : [];
  for (let index = 1; index < anchors.length; index++) {
    const from = anchors[index - 1]!; const to = anchors[index]!;
    const dx = Math.sign(to.x - from.x); const dy = Math.sign(to.y - from.y);
    for (let x = from.x; x !== to.x;) { x += dx; route.push({ x, y: from.y }); }
    for (let y = from.y; y !== to.y;) { y += dy; route.push({ x: to.x, y }); }
  }
  let attribute = dragGuide.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!attribute || attribute.count < route.length) {
    dragGuide.geometry.dispose();
    dragGuide.geometry = new THREE.BufferGeometry();
    attribute = new THREE.Float32BufferAttribute(new Float32Array(Math.max(64, route.length * 2) * 3), 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    dragGuide.geometry.setAttribute("position", attribute);
  }
  route.forEach((point, index) => {
    const world = position(point);
    attribute!.setXYZ(index, world.x, world.y, world.z);
  });
  attribute.needsUpdate = true;
  dragGuide.geometry.setDrawRange(0, route.length);
  dragGuide.visible = true;
}
function position(point: GridPoint) {
  const p = mapSpacePosition(props.map, point);
  return new THREE.Vector3(p.x, p.baseY + p.surfaceOffset + 0.12, p.z);
}
function disposeOverlay() {
  overlay?.traverse((object) => {
    if (object instanceof THREE.Sprite) {
      object.material.map?.dispose(); object.material.dispose();
    }
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
  overlay?.removeFromParent(); overlay = null; cursor = null; dragGuide = null;
  castleFocusBox = null;
}
function rebuildOverlay() {
  disposeOverlay();
  if (!runtime) return;
  overlay = new THREE.Group();
  overlay.name = "adminMapEditingGuides";
  const label = (point: GridPoint, text: string, color: number, height: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = 480; canvas.height = 112;
    const context = canvas.getContext("2d");
    if (!context) return;
    const accent = `#${color.toString(16).padStart(6, "0")}`;
    context.fillStyle = "rgba(8, 10, 18, 0.92)"; context.fillRect(0, 0, 480, 112);
    context.strokeStyle = accent; context.lineWidth = 6; context.strokeRect(3, 3, 474, 106);
    context.font = "bold 48px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle";
    context.fillStyle = accent; context.fillText(text, 240, 58);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false,
    }));
    sprite.name = "adminMapIdentityLabel"; sprite.userData.text = text;
    sprite.position.copy(position(point)); sprite.position.y += height;
    sprite.center.set(0.5, 0);
    sprite.scale.set(0.105, 0.0245, 1); sprite.renderOrder = 40; overlay!.add(sprite);
  };
  const marker = (point: GridPoint, color: number, radius = 0.45) => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.75, radius, 24),
      new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position(point)); mesh.renderOrder = 30; overlay!.add(mesh);
  };
  for (const lane of [0, 1] as const) {
    const color = lane === 0 ? 0xff4fa4 : 0xffbc35;
    const points = props.map.paths[lane].map((point) => position(point));
    // Small opposing offsets make shared lanes visible instead of hiding one.
    points.forEach((point) => { point.y += lane * 0.045; point.z += (lane ? 1 : -1) * 0.09; });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity: 0.85 }));
    line.renderOrder = 29; overlay.add(line);
    const laneLabelPoint = props.map.paths[lane][Math.floor(props.map.paths[lane].length * (lane === 0 ? 0.35 : 0.65))];
    if (laneLabelPoint) label(laneLabelPoint, `Lane ${lane + 1}`, color, 0.9);
    props.anchors[lane].forEach((point, index, anchors) => {
      marker(point, color);
      if (editing.value && props.tool === "path" && lane === props.lane && index > 0 && index < anchors.length - 1) {
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 6),
          new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false }));
        handle.name = "laneCornerHandle";
        handle.position.copy(position(point)); handle.position.y += 0.25;
        handle.renderOrder = 32; overlay!.add(handle);
      }
    });
    const spawn = props.map.spawnPoints?.[lane] ?? props.map.paths[lane][0];
    if (spawn) {
      marker(spawn, color, 0.85);
      label(spawn, `Cổng ${lane + 1}`, color, 5.2);
    }
  }
  if (props.map.castle.position) marker(props.map.castle.position, 0xffc24b, 1);
  (props.map.buildableTiles ?? []).forEach((point) => marker(point, 0x4ade80, 0.65));
  cursor = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  cursor.rotation.x = -Math.PI / 2; cursor.renderOrder = 31; cursor.visible = false;
  dragGuide = new THREE.Line(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }));
  dragGuide.name = "laneCornerDragPreview"; dragGuide.renderOrder = 33; dragGuide.visible = false;
  dragGuide.frustumCulled = false;
  overlay.add(cursor, dragGuide); runtime.scene.add(overlay);
  castleFocusBox = new THREE.Box3Helper(new THREE.Box3(), 0x67e8f9);
  castleFocusBox.name = "castleModelFocus";
  const focusMaterial = castleFocusBox.material as THREE.LineBasicMaterial;
  focusMaterial.depthTest = false;
  focusMaterial.transparent = true;
  focusMaterial.opacity = 0.85;
  castleFocusBox.renderOrder = 35; castleFocusBox.visible = false;
  overlay.add(castleFocusBox);
}
function focusCastle(model: THREE.Object3D | null) {
  castleFocused.value = Boolean(model);
  if (castleFocusBox) {
    castleFocusBox.visible = Boolean(model);
    if (model) castleFocusBox.box.setFromObject(model);
    (castleFocusBox.material as THREE.LineBasicMaterial).color.setHex(castleDrag ? 0xffc24b : 0x67e8f9);
  }
  if (runtime) runtime.renderer.domElement.style.cursor = model ? castleDrag ? "grabbing" : "grab" : "";
}
function pointFromPointer(event: PointerEvent) {
  if (!runtime) return null;
  const bounds = runtime.renderer.domElement.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
  ray.setFromCamera(pointer, runtime.camera);
  const ground = mapSpacePosition(props.map, { x: 0, y: 0 });
  plane.constant = -(props.map.scenePreset === "citadel-of-cinders" ? props.map.sceneSettings?.bridge.deckWorldY ?? 5.3 : ground.baseY + ground.surfaceOffset);
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return pickMapPreviewPoint(props.map, hit, props.tool === "buildable");
}
function down(event: PointerEvent) {
  if (!runtime || event.button !== 0) return;
  pointFromPointer(event);
  const castle = props.map.castle.modelUrl ? runtime.scene.getObjectByName("castleModel") : null;
  if (castle && props.map.castle.position && ray.intersectObject(castle, true).length
    && ray.ray.intersectPlane(plane, hit)) {
    const offset = props.map.castle.modelOffset ?? { x: 0, z: 0 };
    castleDrag = { id: event.pointerId, model: castle, origin: castle.position.clone(), grab: hit.clone(),
      offset: { ...offset }, target: { ...offset } };
    focusCastle(castle);
    event.preventDefault(); event.stopImmediatePropagation();
    runtime.renderer.domElement.setPointerCapture(event.pointerId);
    return;
  }
  if (!editing.value) return;
  const index = anchorFromPointer(event);
  const point = index >= 0 ? { ...props.anchors[props.lane][index]! } : pointFromPointer(event);
  if (!point) return;
  if (cornerDragMode.value && index < 0) return;
  const anchor = index >= 0;
  pressed = { id: event.pointerId, point, anchor, moved: false, index, lane: props.lane, x: event.clientX, y: event.clientY };
  draggingCorner.value = anchor;
  // Only a lane handle owns the drag. Other gestures reach OrbitControls;
  // a short click can still edit, but a camera drag must never place anything.
  if (anchor) {
    event.preventDefault(); event.stopImmediatePropagation();
    runtime?.renderer.domElement.setPointerCapture(event.pointerId);
  }
}
function moveCastleFromPointer(event: PointerEvent) {
  if (!castleDrag || event.pointerId !== castleDrag.id) return null;
  pointFromPointer(event);
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  const delta = hit.clone().sub(castleDrag.grab);
  const target = { x: castleDrag.offset.x + delta.x, z: castleDrag.offset.z + delta.z };
  if (Math.abs(target.x) > 1000 || Math.abs(target.z) > 1000) { castleDrag.target = null; return null; }
  castleDrag.target = target;
  castleDrag.model.position.copy(castleDrag.origin).add(delta);
  focusCastle(castleDrag.model);
  return target;
}
function move(event: PointerEvent) {
  if (pressed && event.pointerId === pressed.id
    && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) >= 6) pressed.moved = true;
  pendingPointer = event;
  if (hoverFrame) return;
  hoverFrame = requestAnimationFrame(() => {
    hoverFrame = 0;
    if (castleDrag && pendingPointer) { moveCastleFromPointer(pendingPointer); return; }
    if (pendingPointer && runtime) {
      pointFromPointer(pendingPointer);
      const castle = props.map.castle.modelUrl ? runtime.scene.getObjectByName("castleModel") : null;
      focusCastle(castle && ray.intersectObject(castle, true).length ? castle : null);
    }
    const point = editing.value && pendingPointer ? pointFromPointer(pendingPointer) : null;
    hoverPoint.value = point;
    if (cursor) { cursor.visible = Boolean(point); if (point) cursor.position.copy(position(point)); }
    if (point && pressed?.anchor) previewCorner(point);
  });
}
function up(event: PointerEvent) {
  if (castleDrag && event.pointerId === castleDrag.id) {
    const target = moveCastleFromPointer(event);
    event.preventDefault(); event.stopImmediatePropagation();
    cancel();
    if (target && (Math.abs(target.x - (props.map.castle.modelOffset?.x ?? 0)) > 0.0001
      || Math.abs(target.z - (props.map.castle.modelOffset?.z ?? 0)) > 0.0001))
      emit("moveCastle", target);
    return;
  }
  if (!pressed || event.pointerId !== pressed.id) return;
  const start = pressed; pressed = null;
  draggingCorner.value = false;
  if (dragGuide) dragGuide.visible = false;
  const canvas = runtime?.renderer.domElement;
  if (start.anchor) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const point = pointFromPointer(event);
    if (!point) return;
    if (point.x !== start.point.x || point.y !== start.point.y)
      emit("moveAnchor", { from: start.point, to: point, lane: start.lane });
  } else if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) {
    emit("select", start.point);
  }
}
function cancel() {
  const canvas = runtime?.renderer.domElement;
  if (castleDrag) {
    castleDrag.model.position.copy(castleDrag.origin);
    if (canvas?.hasPointerCapture(castleDrag.id)) canvas.releasePointerCapture(castleDrag.id);
    castleDrag = null;
  }
  if (pressed?.anchor && canvas?.hasPointerCapture(pressed.id)) canvas.releasePointerCapture(pressed.id);
  pressed = null; pendingPointer = null; hoverPoint.value = null;
  draggingCorner.value = false;
  if (dragGuide) dragGuide.visible = false;
  if (cursor) cursor.visible = false;
  focusCastle(null);
}
function detach() {
  cancel();
  runtime?.controls.removeEventListener?.("change", updateZoomPercent);
  cameraReady.value = false;
  const canvas = runtime?.renderer.domElement;
  canvas?.removeEventListener("pointerdown", down, true);
  canvas?.removeEventListener("pointermove", move, true);
  canvas?.removeEventListener("pointerup", up, true);
  canvas?.removeEventListener("pointercancel", cancel, true);
  canvas?.removeEventListener("pointerleave", cancel, true);
  disposeOverlay(); runtime = null;
}
function ready(next: CitadelRuntime) {
  detach(); runtime = next;
  if (zoomCamera !== next.camera) {
    zoomCamera = next.camera;
    initialCameraDistance = next.camera.position.distanceTo(next.controls.target);
  }
  next.controls.addEventListener?.("change", updateZoomPercent);
  cameraReady.value = true;
  updateZoomPercent();
  const canvas = next.renderer.domElement;
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move, true);
  canvas.addEventListener("pointerup", up, true);
  canvas.addEventListener("pointercancel", cancel, true);
  canvas.addEventListener("pointerleave", cancel, true);
  rebuildOverlay();
}
watch(() => [props.map, props.anchors, props.lane, props.tool, cornerDragMode.value], () => { cancel(); rebuildOverlay(); });
watch(editing, () => { cancel(); rebuildOverlay(); });
onBeforeUnmount(() => { if (hoverFrame) cancelAnimationFrame(hoverFrame); detach(); });
</script>

<template>
  <div class="td-direct-map-editor">
    <div class="td-direct-map-tools">
      <button type="button" :class="{ active: !editing }" @click="editing = false"><Orbit aria-hidden="true" />Xoay camera</button>
      <button v-for="item in tools" :key="item.label" type="button"
        :class="{ active: editing && !cornerDragMode && tool === item.tool && (item.lane === undefined || lane === item.lane) }"
        @click="chooseTool(item)"><component :is="toolIcons[item.tool]" aria-hidden="true" />{{ item.label }}</button>
      <div class="td-direct-map-zoom" aria-label="Thu phóng preview 3D">
        <button type="button" :disabled="!cameraReady" title="Thu nhỏ" aria-label="Thu nhỏ" @click="changePreviewZoom(1 / 1.25)"><ZoomOut aria-hidden="true" /></button>
        <button type="button" :disabled="!cameraReady" title="Đặt lại 100%" @click="resetPreviewZoom"><Scan aria-hidden="true" />{{ zoomPercent }}%</button>
        <button type="button" :disabled="!cameraReady" title="Phóng lớn" aria-label="Phóng lớn" @click="changePreviewZoom(1.25)"><ZoomIn aria-hidden="true" /></button>
      </div>
      <span>{{ editing && cornerDragMode ? `Lane ${lane + 1}: kéo chấm màu để đổi góc · Kéo vùng trống để xoay` : editing ? 'Bấm: chỉnh · Kéo vùng trống: xoay · Kéo điểm lane: di chuyển · Phải: pan · Lăn: zoom' : 'Kéo trái: xoay · Kéo phải: pan · Lăn: zoom' }}
        <template v-if="draggingCorner"> · Đang kéo góc</template>
        <template v-if="map.castle.modelUrl"> · {{ castleFocused ? 'Lâu đài đang focus · kéo để di chuyển tự do' : 'Rê chuột vào lâu đài để kéo tự do' }}</template>
        <template v-if="hoverPoint"> · Ô {{ hoverPoint.x }}, {{ hoverPoint.y }}</template>
      </span>
    </div>
    <div class="td-direct-map-tools td-direct-map-actions">
      <span class="td-map-identity td-map-identity--one">● Lane 1 · Cổng 1</span>
      <span class="td-map-identity td-map-identity--two">● Lane 2 · Cổng 2</span>
      <button type="button" title="Ctrl + Z / ⌘ + Z (Mac)" :disabled="!canUndo" @click="emit('undo')"><Undo2 aria-hidden="true" />Hoàn tác · Ctrl/⌘+Z</button>
      <button type="button" title="Ctrl + U / ⌘ + U (Mac)" :disabled="!canRedo" @click="emit('redo')"><Redo2 aria-hidden="true" />Làm lại · Ctrl/⌘+U</button>
      <button type="button" class="danger" :disabled="!anchors[lane].length" @click="emit('clearLane')"><Trash2 aria-hidden="true" />Xóa lane {{ lane + 1 }}</button>
      <button type="button" class="danger" :disabled="!map.buildableTiles?.length" @click="emit('clearPads')"><Trash2 aria-hidden="true" />Xóa toàn bộ bệ</button>
      <button type="button" class="reset" @click="emit('resetLayout')"><RotateCcw aria-hidden="true" />Đặt lại mặc định</button>
    </div>
    <LavaCitadelScene v-if="map.scenePreset === 'citadel-of-cinders'" embedded :configuration="map" @runtime-ready="ready" />
    <MapPreview v-else :map="map" @runtime-ready="ready" />
  </div>
</template>

<style scoped>
.td-direct-map-tools { display:flex; flex-wrap:wrap; gap:8px; padding:12px; align-items:center; background:#10101b; }
.td-direct-map-tools button { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px; border:1px solid #353547; border-radius:8px; color:#c5c5d0; background:#171721; cursor:pointer; }
.td-direct-map-tools button :deep(svg) { width:16px; height:16px; flex-shrink:0; }
.td-direct-map-tools button.active { border-color:#4ade80; color:#a7f3c4; background:#153024; }
.td-direct-map-tools span { font-size:12px; color:#a1a1b2; }
.td-direct-map-tools button:disabled { opacity:0.4; cursor:not-allowed; }
.td-direct-map-zoom { display:flex; gap:2px; }
.td-direct-map-actions { border-top:1px solid #282837; }
.td-direct-map-actions button.danger { color:#fb7185; }
.td-direct-map-actions button.reset { color:#fbbf24; }
.td-direct-map-tools .td-map-identity { padding:4px 8px; border-radius:6px; background:#08080f; font-weight:600; }
.td-direct-map-tools .td-map-identity--one { color:#ff4fa4; }
.td-direct-map-tools .td-map-identity--two { color:#ffbc35; }
</style>
