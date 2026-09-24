<script setup lang="ts">
import { Pause, Play, RotateCcw, RotateCw } from "lucide-vue-next";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ADVENTURE_KIT_ROOT,
  BOSS_MOVEMENT_PATH,
} from "./scene/enemy-models";
import type { TowerDefenseEquipmentTransform } from "~/types/games/towerDefense";

const props = withDefaults(
  defineProps<{
    modelUrl?: string;
    avatarUrl?: string;
    leftWeaponUrl?: string;
    rightWeaponUrl?: string;
    leftWeaponTransform?: TowerDefenseEquipmentTransform;
    rightWeaponTransform?: TowerDefenseEquipmentTransform;
    animationNames?: string[];
    characterScale?: number;
    sceneScale?: number;
    removeRootMotion?: boolean;
  }>(),
  {
    modelUrl: "",
    avatarUrl: "",
    leftWeaponUrl: "",
    rightWeaponUrl: "",
    animationNames: () => [],
    characterScale: 1,
    sceneScale: 1,
    removeRootMotion: true,
  },
);

const host = ref<HTMLDivElement | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const activeAnimation = ref("Tĩnh");
const isAnimationPlaying = ref(false);
const hasAnimation = ref(false);
const previewYaw = ref(0);
const equipmentWarning = ref("");

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let controls: OrbitControls | null = null;
let characterRoot: THREE.Group | null = null;
let mixer: THREE.AnimationMixer | null = null;
let animationAction: THREE.AnimationAction | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame = 0;
let loadVersion = 0;
let rendererWidth = 0;
let rendererHeight = 0;
let fittedCharacterHeight = 2;
let fittedCameraZoom = 1;
const fittedCameraTarget = new THREE.Vector3(0, 1, 0);
const clock = new THREE.Clock();
const PREVIEW_FRUSTUM_HEIGHT = 5;
const GAME_CAMERA_DIRECTION = new THREE.Vector3(0.31, 0.86, 0.39).normalize();

function resizeRenderer() {
  if (!host.value || !renderer || !camera) return;
  // Safari có thể làm tròn clientWidth/clientHeight khác Chrome khi dialog vừa
  // mở. Bounding rect giữ đúng kích thước CSS thực trên cả macOS và Windows.
  const bounds = host.value.getBoundingClientRect();
  const width = Math.max(0, Math.round(bounds.width));
  const height = Math.max(0, Math.round(bounds.height));
  if (width < 2 || height < 2) return;
  if (width === rendererWidth && height === rendererHeight) return;
  rendererWidth = width;
  rendererHeight = height;
  renderer.setSize(width, height, false);
  const halfHeight = PREVIEW_FRUSTUM_HEIGHT / 2;
  const halfWidth = halfHeight * (width / height);
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => material.dispose());
  });
  object.removeFromParent();
}

function clearCharacter() {
  if (mixer && characterRoot) {
    mixer.stopAllAction();
    mixer.uncacheRoot(characterRoot);
  }
  mixer = null;
  animationAction = null;
  hasAnimation.value = false;
  isAnimationPlaying.value = false;
  if (characterRoot) disposeObject(characterRoot);
  characterRoot = null;
}

function toggleAnimation() {
  if (!animationAction) return;
  if (isAnimationPlaying.value) {
    animationAction.paused = true;
    isAnimationPlaying.value = false;
    return;
  }
  animationAction.paused = false;
  animationAction.play();
  isAnimationPlaying.value = true;
}

function removeRootMotion(clip: THREE.AnimationClip) {
  const result = clip.clone();
  for (const track of result.tracks) {
    if (!/hips\.position$/i.test(track.name) || track.values.length < 3) continue;
    const x = track.values[0] ?? 0;
    const z = track.values[2] ?? 0;
    for (let index = 0; index < track.values.length; index += 3) {
      track.values[index] = x;
      track.values[index + 2] = z;
    }
  }
  return result;
}

function findHand(root: THREE.Object3D, side: "left" | "right") {
  // Model Adventure Kit có cả bone bàn tay và bone socket handslot. Scene game
  // luôn ưu tiên socket; preview cũng phải làm giống hệt để pivot vũ khí khớp.
  const slotName = side === "right" ? "handslotr" : "handslotl";
  const exactSlot = root.getObjectByName(slotName);
  if (exactSlot) return exactSlot;

  let normalizedSlot: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (normalizedSlot) return;
    const name = child.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (name === slotName) normalizedSlot = child;
  });
  if (normalizedSlot) return normalizedSlot as THREE.Object3D;

  const aliases =
    side === "right"
      ? ["righthand", "handr", "mixamorighhand", "mixamorigrightHand"]
      : ["lefthand", "handl", "mixamorigleftHand"];
  const normalizedAliases = aliases.map((name) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  let result: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (result) return;
    const name = child.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedAliases.includes(name)) result = child;
  });
  return result as THREE.Object3D | null;
}

async function attachWeapon(
  loader: GLTFLoader,
  root: THREE.Object3D,
  side: "left" | "right",
  url: string,
  transform?: TowerDefenseEquipmentTransform,
) {
  if (!url) return true;
  const slot = findHand(root, side);
  if (!slot) return false;
  const asset = await loader.loadAsync(url);
  asset.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  asset.scene.name = `previewWeapon-${side}`;
  applyEquipmentTransform(asset.scene, transform);
  slot.add(asset.scene);
  return true;
}

function applyEquipmentTransform(
  object: THREE.Object3D,
  transform?: TowerDefenseEquipmentTransform,
) {
  object.position.fromArray(transform?.position ?? [0, 0, 0]);
  const [rotationX, rotationY, rotationZ] = transform?.rotation ?? [0, 0, 0];
  object.rotation.set(rotationX, rotationY, rotationZ);
  object.scale.setScalar(transform?.scale ?? 1);
}

function resetCamera() {
  if (!camera || !controls) return;
  const distance = Math.max(fittedCharacterHeight * 6, 8);
  camera.position
    .copy(fittedCameraTarget)
    .addScaledVector(GAME_CAMERA_DIRECTION, distance);
  camera.zoom = fittedCameraZoom;
  controls.target.copy(fittedCameraTarget);
  controls.update();
  camera.updateProjectionMatrix();
}

function rotateCharacter(direction: -1 | 1) {
  previewYaw.value += direction * (Math.PI / 4);
  if (characterRoot) characterRoot.rotation.y = previewYaw.value;
}

function fitCharacter(root: THREE.Object3D) {
  if (!camera || !controls) return;
  // Không để vũ khí dài làm sai tâm và thu nhỏ cơ thể trong khung preview.
  const weapons = [
    root.getObjectByName("previewWeapon-left"),
    root.getObjectByName("previewWeapon-right"),
  ].filter((weapon): weapon is THREE.Object3D => Boolean(weapon));
  const weaponParents = weapons.map((weapon) => weapon.parent);
  weapons.forEach((weapon) => weapon.removeFromParent());
  root.updateMatrixWorld(true);
  // `precise=true` rất quan trọng với SkinnedMesh: bounding box cache của asset
  // thường lấy từ bind pose và có thể làm tâm camera lệch xa model đang hiển thị.
  const box = new THREE.Box3().setFromObject(root, true);
  if (box.isEmpty()) {
    weapons.forEach((weapon, index) => weaponParents[index]?.add(weapon));
    return;
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= box.min.y;
  root.position.z -= center.z;
  const height = Math.max(size.y, 0.1);
  fittedCharacterHeight = height;
  // Fit theo kích thước thật sau characterScale/sceneScale để model luôn đủ lớn
  // và nằm giữa khung trong lúc quản trị viên chỉnh vũ khí, scale, animation.
  fittedCameraZoom = THREE.MathUtils.clamp(
    (PREVIEW_FRUSTUM_HEIGHT * 0.68) / height,
    0.35,
    6,
  );
  root.updateMatrixWorld(true);
  // Sau ba phép dịch phía trên, tâm thân nhân vật luôn là trục X/Z = 0. Không
  // đo lại từ bounding box cache để tránh sai số khiến nội dung dạt sang góc.
  fittedCameraTarget.set(0, height * 0.5, 0);
  weapons.forEach((weapon, index) => weaponParents[index]?.add(weapon));
  root.updateMatrixWorld(true);
  resetCamera();
  const distance = Math.max(height * 6, 8);
  camera.near = Math.max(0.01, distance / 100);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
  controls.minZoom = camera.zoom * 0.45;
  controls.maxZoom = camera.zoom * 3;
  controls.update();
}

async function loadPreview() {
  const version = ++loadVersion;
  clearCharacter();
  errorMessage.value = "";
  equipmentWarning.value = "";
  activeAnimation.value = "Tĩnh";
  if (!props.modelUrl || !scene) return;
  loading.value = true;
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(props.modelUrl);
    if (version !== loadVersion || !scene) {
      disposeObject(gltf.scene);
      return;
    }
    const root = new THREE.Group();
    const character = gltf.scene;
    const characterScale = Math.max(Number(props.characterScale) || 1, 0.01);
    const sceneScale = Math.max(Number(props.sceneScale) || 1, 0.01);
    character.scale.setScalar(characterScale);
    root.scale.setScalar(sceneScale);
    root.userData.previewCombinedScale = characterScale * sceneScale;
    root.rotation.y = previewYaw.value;
    character.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    root.add(character);
    scene.add(root);
    characterRoot = root;

    const [leftAttached, rightAttached] = await Promise.all([
      attachWeapon(
        loader,
        character,
        "left",
        props.leftWeaponUrl,
        props.leftWeaponTransform,
      ),
      attachWeapon(
        loader,
        character,
        "right",
        props.rightWeaponUrl,
        props.rightWeaponTransform,
      ),
    ]);
    if (version !== loadVersion) return;
    const missing: string[] = [];
    if (props.leftWeaponUrl && !leftAttached) missing.push("tay trái");
    if (props.rightWeaponUrl && !rightAttached) missing.push("tay phải");
    equipmentWarning.value = missing.length
      ? `Không tìm thấy bone ${missing.join(" và ")} trong model.`
      : "";

    let sourceAnimations = gltf.animations;
    if (
      sourceAnimations.length === 0 &&
      props.modelUrl.includes("/kit/adventure/Characters/")
    ) {
      const movement = await loader.loadAsync(
        `${ADVENTURE_KIT_ROOT}/${BOSS_MOVEMENT_PATH}`,
      );
      sourceAnimations = movement.animations;
    }
    const clips = props.removeRootMotion
      ? sourceAnimations.map(removeRootMotion)
      : sourceAnimations;
    const animation =
      clips.find((clip) =>
        props.animationNames.some((name) =>
          clip.name.toLowerCase().includes(name.toLowerCase()),
        ),
      ) ?? clips[0];
    if (animation) {
      mixer = new THREE.AnimationMixer(root);
      animationAction = mixer.clipAction(animation);
      // Áp dụng frame đầu để model có tư thế tự nhiên nhưng chưa chuyển động.
      // Chỉ khi quản trị viên bấm nút chạy thì thời gian animation mới tiếp tục.
      animationAction.reset().play();
      animationAction.paused = true;
      mixer.update(0);
      hasAnimation.value = true;
      activeAnimation.value = animation.name;
    }
    // Căn lại sau khi animation đã áp pose. Đây là bước giúp Safari/macOS và
    // Chrome/Windows dùng đúng cùng tâm model thay vì phụ thuộc bind pose.
    fitCharacter(root);
    // Trên màn hình Retina, canvas có thể nhận kích thước thực sau frame tải
    // model. Fit lại ở frame kế tiếp để Mac và Windows dùng cùng layout cuối.
    requestAnimationFrame(() => {
      if (version !== loadVersion || characterRoot !== root) return;
      resizeRenderer();
      fitCharacter(root);
    });
  } catch (error) {
    console.error("[Tower Defense] Không thể preview model.", error);
    errorMessage.value = "Không thể tải model hoặc vũ khí đã chọn.";
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

function createPreview() {
  if (!host.value) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090910);
  scene.fog = new THREE.Fog(0x090910, 8, 22);
  camera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.05, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  // Dùng cùng mật độ render trên mọi hệ điều hành. Retina DPR=2 từng khiến
  // frame khởi tạo trên Mac khác với Chrome/Windows và làm camera fit lệch.
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Dùng cùng pipeline màu với scene thật để preview không bị ám tím/sáng khác
  // giữa màn hình Display-P3 của macOS và màn hình sRGB phổ biến trên Windows.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.enablePan = false;
  resetCamera();

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x64706a, 1.45));
  const sun = new THREE.DirectionalLight(0xffffff, 2.85);
  sun.position.set(-6, 12, 7);
  sun.castShadow = true;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdbeafe, 0.58);
  fill.position.set(7, 6, -8);
  scene.add(fill);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshStandardMaterial({
      color: 0x151321,
      metalness: 0.15,
      roughness: 0.82,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.24, 64),
    new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.55 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  scene.add(ring);

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(host.value);
  resizeRenderer();
  const render = () => {
    animationFrame = requestAnimationFrame(render);
    // Native dialog có thể được mount khi đang display:none. Kiểm tra lại ở
    // mỗi frame giúp canvas lấy đúng kích thước ngay lúc showModal().
    resizeRenderer();
    mixer?.update(Math.min(clock.getDelta(), 0.05));
    controls?.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  };
  render();
  void loadPreview();
}

watch(
  () => [
    props.modelUrl,
    props.leftWeaponUrl,
    props.rightWeaponUrl,
    props.characterScale,
    props.sceneScale,
    props.removeRootMotion,
    ...props.animationNames,
  ],
  () => void loadPreview(),
);
watch(
  () => props.leftWeaponTransform,
  (transform) => {
    const weapon = characterRoot?.getObjectByName("previewWeapon-left");
    if (weapon) applyEquipmentTransform(weapon, transform);
  },
  { deep: true },
);
watch(
  () => props.rightWeaponTransform,
  (transform) => {
    const weapon = characterRoot?.getObjectByName("previewWeapon-right");
    if (weapon) applyEquipmentTransform(weapon, transform);
  },
  { deep: true },
);

onMounted(createPreview);
onBeforeUnmount(() => {
  loadVersion++;
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  controls?.dispose();
  clearCharacter();
  scene?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
});
</script>

<template>
  <section class="enemy-model-preview">
    <header>
      <div><small>LIVE PREVIEW</small><strong>Model trong game</strong></div>
      <nav>
        <button type="button" title="Xoay nhân vật sang trái 45°" @click="rotateCharacter(-1)"><RotateCcw /></button>
        <button type="button" title="Xoay nhân vật sang phải 45°" @click="rotateCharacter(1)"><RotateCw /></button>
        <button
          class="animation-toggle"
          type="button"
          :disabled="!hasAnimation || loading"
          :title="isAnimationPlaying ? 'Tạm dừng animation' : 'Chạy animation'"
          @click="toggleAnimation"
        ><Pause v-if="isAnimationPlaying" /><Play v-else /><span>{{ isAnimationPlaying ? 'Tạm dừng' : 'Chạy animation' }}</span></button>
        <button type="button" title="Đặt lại góc nhìn" @click="resetCamera"><RotateCcw /></button>
      </nav>
    </header>
    <div ref="host" class="enemy-model-preview__stage">
      <img v-if="!modelUrl && avatarUrl" :src="avatarUrl" alt="" />
      <p v-if="!modelUrl">Chọn model để xem trước.</p>
      <p v-else-if="loading">Đang tải model…</p>
      <p v-else-if="errorMessage" class="is-error">{{ errorMessage }}</p>
    </div>
    <footer>
      <span><small>Animation</small><b>{{ activeAnimation }} · {{ isAnimationPlaying ? 'Đang chạy' : 'Đang dừng' }}</b></span>
      <span><small>Scene scale</small><b>{{ Number(sceneScale).toFixed(3) }}</b></span>
    </footer>
    <p v-if="equipmentWarning" class="enemy-model-preview__warning">{{ equipmentWarning }}</p>
    <em>Kéo để xoay · Cuộn để zoom</em>
  </section>
</template>

<style scoped>
.enemy-model-preview{overflow:hidden;border:1px solid rgb(139 92 246/.28);border-radius:12px;background:#090910;box-shadow:0 18px 40px rgb(0 0 0/.28)}
.enemy-model-preview>header{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid rgb(255 255 255/.06);background:linear-gradient(90deg,rgb(124 58 237/.1),transparent)}
.enemy-model-preview>header div{display:grid;gap:2px}.enemy-model-preview>header small{color:#a78bfa;font-size:7px;font-weight:900;letter-spacing:.13em}.enemy-model-preview>header strong{color:#f4f4f5;font-size:11px}.enemy-model-preview>header button{display:grid;width:29px;height:29px;padding:0;place-items:center;border:1px solid rgb(255 255 255/.08);border-radius:7px;background:rgb(255 255 255/.03);color:#a1a1aa;cursor:pointer}.enemy-model-preview>header svg{width:13px}.enemy-model-preview__stage{position:relative;height:480px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#242039 0,#0d0c15 47%,#08080e 100%)}.enemy-model-preview__stage canvas{position:absolute;inset:0;width:100%!important;height:100%!important}.enemy-model-preview__stage p{position:absolute;z-index:2;inset:50% auto auto 50%;width:max-content;max-width:80%;margin:0;transform:translate(-50%,-50%);color:#71717a;font-size:10px;text-align:center}.enemy-model-preview__stage p.is-error{color:#fda4af}.enemy-model-preview__stage>img{position:absolute;z-index:1;inset:50% auto auto 50%;width:82px;height:82px;transform:translate(-50%,-50%);border:1px solid rgb(167 139 250/.35);border-radius:16px;object-fit:cover;opacity:.55}.enemy-model-preview>footer{display:grid;grid-template-columns:1fr 1fr;gap:1px;border-top:1px solid rgb(255 255 255/.06);background:rgb(255 255 255/.04)}.enemy-model-preview>footer span{display:grid;gap:3px;padding:9px 11px;background:#0d0d15}.enemy-model-preview>footer small{color:#60606d;font-size:7px;text-transform:uppercase}.enemy-model-preview>footer b{overflow:hidden;color:#d4d4d8;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.enemy-model-preview__warning{margin:0;padding:8px 11px;border-top:1px solid rgb(245 158 11/.18);background:rgb(245 158 11/.06);color:#fbbf24;font-size:8px;line-height:1.4}.enemy-model-preview>em{display:block;padding:8px 11px;color:#52525b;font-size:8px;font-style:normal;text-align:center}@media(max-width:900px){.enemy-model-preview__stage{height:360px}}
.enemy-model-preview>header nav{display:flex;align-items:center;gap:6px}
.enemy-model-preview>header .animation-toggle{display:flex;width:auto;padding:0 9px;gap:5px;color:#c4b5fd}
.enemy-model-preview>header .animation-toggle span{font-size:8px;font-weight:800;white-space:nowrap}
.enemy-model-preview>header button:disabled{opacity:.35;cursor:not-allowed}
</style>
