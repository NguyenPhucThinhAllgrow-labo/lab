<script setup lang="ts">
import { RotateCcw } from "lucide-vue-next";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createTowerDefenseMapScene,
  loadTowerDefenseBackgroundModel,
  loadTowerDefenseCastle,
} from "./scene/map-scene";
import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

const props = defineProps<{
  map: TowerDefenseMapDefinition;
}>();

const host = ref<HTMLDivElement | null>(null);
const loading = ref(false);
const errorMessage = ref("");

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let animationFrame = 0;
let rebuildVersion = 0;
let rendererWidth = 0;
let rendererHeight = 0;
let previewIsVisible = true;
let updatePortal: ((elapsed: number) => void) | null = null;
const clock = new THREE.Clock();
const cameraTarget = new THREE.Vector3();
const cameraPosition = new THREE.Vector3();

function resizeRenderer() {
  if (!host.value || !renderer || !camera) return;
  const bounds = host.value.getBoundingClientRect();
  const width = Math.max(0, Math.round(bounds.width));
  const height = Math.max(0, Math.round(bounds.height));
  if (width < 2 || height < 2) return;
  if (width === rendererWidth && height === rendererHeight) return;
  rendererWidth = width;
  rendererHeight = height;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

function clearScene() {
  if (!scene) return;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((child) => {
    const renderable = child as THREE.Mesh | THREE.Points | THREE.Line;
    if (renderable.geometry) geometries.add(renderable.geometry);
    const childMaterials = renderable.material
      ? Array.isArray(renderable.material)
        ? renderable.material
        : [renderable.material]
      : [];
    childMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach(disposeMaterial);
  scene.clear();
  updatePortal = null;
}

function addLights() {
  if (!scene) return;
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x17120e, 2.25));
  const keyLight = new THREE.DirectionalLight(0xfff1d6, 3.2);
  keyLight.position.set(8, 18, 10);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x8b5cf6, 1.4);
  fillLight.position.set(-12, 8, -10);
  scene.add(fillLight);
}

function fitCamera(map: TowerDefenseMapDefinition) {
  if (!camera || !controls) return;
  const width = Math.max(map.columns * map.cellSize, 8);
  const depth = Math.max(map.rows * map.cellSize, 8);
  const span = Math.max(width, depth);
  cameraTarget.set(0, 0, 0);
  cameraPosition.set(span * 0.58, span * 0.82, span * 0.68);
  camera.position.copy(cameraPosition);
  camera.near = 0.1;
  camera.far = Math.max(250, span * 10);
  camera.updateProjectionMatrix();
  controls.target.copy(cameraTarget);
  controls.minDistance = Math.max(4, span * 0.18);
  controls.maxDistance = Math.max(35, span * 2.5);
  controls.update();
}

function resetCamera() {
  if (!camera || !controls) return;
  camera.position.copy(cameraPosition);
  controls.target.copy(cameraTarget);
  controls.update();
}

async function rebuildPreview() {
  if (!scene) return;
  const version = ++rebuildVersion;
  loading.value = true;
  errorMessage.value = "";
  clearScene();
  addLights();

  try {
    scene.background = new THREE.Color(props.map.theme.background);
    const mapScene = createTowerDefenseMapScene(scene, props.map, null);
    updatePortal = mapScene.updatePortal;
    fitCamera(props.map);

    const optionalLoads: Promise<unknown>[] = [];
    if (props.map.backgroundModel?.url) {
      optionalLoads.push(
        loadTowerDefenseBackgroundModel(scene, props.map, mapScene.tileMeshes).then(
          (background) => {
            if (version !== rebuildVersion && background?.group)
              clearDetachedObject(background.group);
          },
        ),
      );
    }
    if (props.map.castle.modelUrl) {
      optionalLoads.push(
        loadTowerDefenseCastle(props.map).then((castle) => {
          if (version === rebuildVersion) scene?.add(castle);
          else clearDetachedObject(castle);
        }),
      );
    }

    const results = await Promise.allSettled(optionalLoads);
    if (version !== rebuildVersion) return;
    if (results.some((result) => result.status === "rejected")) {
      errorMessage.value =
        "Một model chưa tải được; địa hình và đường đi vẫn đang được hiển thị.";
    }
  } catch (error) {
    if (version !== rebuildVersion) return;
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể dựng preview map.";
  } finally {
    if (version === rebuildVersion) loading.value = false;
  }
}

function clearDetachedObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(disposeMaterial);
  });
  object.removeFromParent();
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  // Render theo tần số quét của màn hình để camera damping và hiệu ứng portal
  // luôn mượt; khi canvas nằm ngoài viewport thì vẫn dừng hoàn toàn để giảm tải.
  if (!previewIsVisible) return;
  controls?.update();
  updatePortal?.(clock.getElapsedTime());
  if (renderer && scene && camera) renderer.render(scene, camera);
}

watch(() => props.map, () => void rebuildPreview());

onMounted(() => {
  if (!host.value) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.value.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.48;

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(host.value);
  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      previewIsVisible = entry?.isIntersecting ?? false;
      if (previewIsVisible) resizeRenderer();
    },
    { threshold: 0.01 },
  );
  intersectionObserver.observe(host.value);
  resizeRenderer();
  void rebuildPreview();
  animate();
});

onBeforeUnmount(() => {
  rebuildVersion += 1;
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  controls?.dispose();
  clearScene();
  renderer?.dispose();
  renderer?.domElement.remove();
  renderer = null;
  scene = null;
  camera = null;
  controls = null;
});
</script>

<template>
  <div class="map-preview">
    <div ref="host" class="map-preview__canvas" />
    <div v-if="loading" class="map-preview__loading">
      <span /> Đang dựng map…
    </div>
    <p v-if="errorMessage" class="map-preview__error">{{ errorMessage }}</p>
    <div class="map-preview__toolbar">
      <span>Kéo để xoay · cuộn để thu phóng</span>
      <button type="button" title="Đặt lại góc nhìn" @click="resetCamera">
        <RotateCcw /> Đặt lại góc nhìn
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-preview {
  position: relative;
  height: clamp(520px, 60vh, 680px);
  overflow: hidden;
  background: #08080f;
}
.map-preview__canvas {
  position: absolute;
  inset: 0 0 42px;
}
.map-preview__canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}
.map-preview__canvas :deep(canvas:active) { cursor: grabbing; }
.map-preview__loading {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid rgb(167 139 250 / 20%);
  border-radius: 8px;
  background: rgb(12 12 19 / 82%);
  color: #c4b5fd;
  font-size: 10px;
  backdrop-filter: blur(8px);
}
.map-preview__loading span {
  width: 10px;
  height: 10px;
  border: 2px solid rgb(167 139 250 / 25%);
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
.map-preview__error {
  position: absolute;
  right: 14px;
  bottom: 52px;
  left: 14px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid rgb(251 113 133 / 22%);
  border-radius: 8px;
  background: rgb(76 5 25 / 72%);
  color: #fecdd3;
  font-size: 10px;
  backdrop-filter: blur(8px);
}
.map-preview__toolbar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 12px;
  border-top: 1px solid rgb(255 255 255 / 7%);
  background: rgb(12 12 19 / 94%);
  color: #71717a;
  font-size: 9px;
}
.map-preview__toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 7px;
  background: rgb(255 255 255 / 4%);
  color: #a1a1aa;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
.map-preview__toolbar button:hover { color: #ddd6fe; }
.map-preview__toolbar svg { width: 12px; height: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .map-preview { height: 380px; }
  .map-preview__toolbar > span { display: none; }
  .map-preview__toolbar { justify-content: flex-end; }
}
</style>
