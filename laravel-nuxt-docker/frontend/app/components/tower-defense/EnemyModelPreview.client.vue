<script setup lang="ts">
import { Pause, Play, RotateCcw, RotateCw } from "lucide-vue-next";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ADVENTURE_KIT_ROOT,
  BOSS_MOVEMENT_PATH,
} from "./scene/enemy-models";
import type { TowerDefenseEquipmentTransform, TowerKind } from "~/types/games/towerDefense";
import {
  decorateTowerVisualEffects,
  getBuiltInTowerModelUrl,
  type ProjectileVisualKind,
  type TowerVisualEffectDefinition,
} from "./scene/tower-models";
import { createTowerDefenseProceduralModel } from "./scene/procedural-tower-models";
import {
  configureTowerDefenseThunderVisual,
  createTowerDefenseProjectileTemplate,
  decorateTowerDefenseProjectileLevel,
  decorateTowerDefenseProjectileVisual,
} from "./scene/projectile-visuals";

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
    eyebrow?: string;
    title?: string;
    showAnimationControls?: boolean;
    detailLabel?: string;
    detailValue?: string;
    visualEffects?: TowerVisualEffectDefinition[];
    visualEffectLevel?: number;
    towerKind?: TowerKind;
    towerRange?: number;
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
    eyebrow: "LIVE PREVIEW",
    title: "Model trong game",
    showAnimationControls: true,
    detailLabel: "Scene scale",
    detailValue: "",
    visualEffects: () => [],
    visualEffectLevel: 1,
    towerKind: undefined,
    towerRange: 1.47,
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
let towerProjectileSimulation: THREE.Group | null = null;
let frostPreviewWaveTexture: THREE.CanvasTexture | null = null;
let mixer: THREE.AnimationMixer | null = null;
let animationAction: THREE.AnimationAction | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame = 0;
let loadVersion = 0;
let rendererWidth = 0;
let rendererHeight = 0;
let fittedCharacterHeight = 2;
let fittedCameraZoom = 1;
let previewElapsed = 0;
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
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Line)) return;
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
  if (towerProjectileSimulation) disposeObject(towerProjectileSimulation);
  towerProjectileSimulation = null;
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
    root.getObjectByName("managedTowerVisualEffects"),
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

function getFrostPreviewWaveTexture() {
  if (frostPreviewWaveTexture) return frostPreviewWaveTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể tạo gradient cho sóng băng preview.");
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 126);
  gradient.addColorStop(0, "rgba(43, 135, 194, .05)");
  gradient.addColorStop(0.48, "rgba(35, 151, 207, .1)");
  gradient.addColorStop(0.72, "rgba(47, 185, 226, .24)");
  gradient.addColorStop(0.86, "rgba(106, 226, 246, .5)");
  gradient.addColorStop(0.94, "rgba(190, 249, 255, .4)");
  gradient.addColorStop(1, "rgba(54, 157, 211, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  frostPreviewWaveTexture = new THREE.CanvasTexture(canvas);
  frostPreviewWaveTexture.colorSpace = THREE.SRGBColorSpace;
  return frostPreviewWaveTexture;
}

function createFrostWaveSimulation(definition: TowerVisualEffectDefinition) {
  if (!scene) return;
  const simulation = new THREE.Group();
  simulation.name = "towerProjectileSimulation";
  simulation.userData.kind = "frost-wave";
  // Đồng bộ impact-scene: bán kính gameplay = range theo ô × cellSize (1.5).
  const radius = Math.max(0.1, Number(props.towerRange) || 1.47) * 1.5;
  const waves: THREE.Mesh[] = [];
  for (const [index, scale] of [1, 0.725].entries()) {
    const baseOpacity = THREE.MathUtils.clamp(definition.opacity, 0, 1) *
      (index === 0 ? 0.66 : 0.34);
    const wave = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2 * scale, radius * 2 * scale),
      new THREE.MeshBasicMaterial({
        map: getFrostPreviewWaveTexture(),
        color: new THREE.Color(definition.color),
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false,
      }),
    );
    wave.name = "frostCascadeWave";
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = index === 0 ? 0.105 : 0.115;
    wave.scale.setScalar(0.01);
    wave.userData.baseOpacity = baseOpacity;
    wave.userData.index = index;
    waves.push(wave);
    simulation.add(wave);
  }
  simulation.userData.frostCascadeWave = waves;
  scene.add(simulation);
  towerProjectileSimulation = simulation;
}

function createTowerProjectileSimulation(root: THREE.Group, adjustCamera = true) {
  if (!scene) return;
  if (towerProjectileSimulation) disposeObject(towerProjectileSimulation);
  towerProjectileSimulation = null;
  const definition = props.visualEffects.find(
    (effect) =>
      effect.type === "projectile" &&
      effect.enabled &&
      (!effect.level || effect.level === props.visualEffectLevel),
  );
  if (!definition) return;
  if (props.towerKind === "frost") {
    createFrostWaveSimulation(definition);
    return;
  }

  const simulation = new THREE.Group();
  simulation.name = "towerProjectileSimulation";
  const kind = definition.projectileKind ?? "fire";
  const height = Math.max(fittedCharacterHeight, 0.5);
  const launch = new THREE.Vector3(
    0,
    height * THREE.MathUtils.clamp(definition.heightRatio ?? 0.9, 0, 1.5),
    0,
  );
  const targetPosition = new THREE.Vector3(Math.max(1.3, height * 0.86), 0, 0);

  const projectile = createTowerDefenseProjectileTemplate(kind);
  decorateTowerDefenseProjectileLevel(projectile, kind, props.visualEffectLevel);
  if (kind === "thunder") configureTowerDefenseThunderVisual(projectile, definition);
  else decorateTowerDefenseProjectileVisual(projectile, definition);
  projectile.name = "towerPreviewProjectile";

  const target = new THREE.Group();
  target.name = "towerPreviewTarget";
  const targetScale = Math.max(0.58, height * 0.58);
  target.userData.baseScale = targetScale;
  const armor = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    metalness: 0.46,
    roughness: 0.38,
  });
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.34, 6, 10),
    armor,
  );
  body.position.y = 0.48;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 14, 10),
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.35,
      roughness: 0.32,
    }),
  );
  head.position.y = 0.82;
  const shoulder = new THREE.Mesh(
    new THREE.BoxGeometry(0.43, 0.1, 0.15),
    armor.clone(),
  );
  shoulder.position.y = 0.64;
  const legMaterial = armor.clone();
  for (const x of [-0.09, 0.09]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 0.3, 8),
      legMaterial,
    );
    leg.position.set(x, 0.15, 0);
    target.add(leg);
  }
  const impactGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 10, 8),
    new THREE.MeshBasicMaterial({
      color: definition.glowColor ?? definition.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      wireframe: true,
    }),
  );
  impactGlow.name = "towerPreviewTargetImpact";
  impactGlow.position.y = 0.55;
  target.add(body, head, shoulder, impactGlow);
  target.position.copy(targetPosition);
  target.scale.setScalar(targetScale);

  simulation.userData.kind = kind;
  simulation.userData.launch = launch;
  simulation.userData.target = targetPosition.clone().add(new THREE.Vector3(0, 0.55 * targetScale, 0));
  simulation.userData.projectile = projectile;
  simulation.userData.targetObject = target;
  simulation.userData.definition = definition;
  simulation.add(projectile, target);
  scene.add(simulation);
  towerProjectileSimulation = simulation;

  if (adjustCamera) {
    // Chỉ fit lại khi model/level thay đổi; chỉnh effect phải giữ góc nhìn hiện tại.
    fittedCameraTarget.set(targetPosition.x * 0.34, height * 0.5, 0);
    fittedCameraZoom *= 0.7;
    resetCamera();
  }
}

function animateTowerProjectileSimulation() {
  const simulation = towerProjectileSimulation;
  if (!simulation) return;
  if (simulation.userData.kind === "frost-wave") {
    const cycleProgress = (previewElapsed % 1.3) / 1.05;
    const progress = THREE.MathUtils.clamp(cycleProgress, 0, 1);
    simulation.visible = cycleProgress < 1;
    const waveProgress = THREE.MathUtils.smoothstep(progress, 0, 0.92);
    const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.76, 1);
    const waves = simulation.userData.frostCascadeWave as THREE.Mesh[];
    waves.forEach((wave, index) => {
      const delayedProgress = index === 0
        ? waveProgress
        : THREE.MathUtils.smoothstep(progress, 0.28, 1);
      wave.scale.setScalar(Math.max(0.01, delayedProgress));
      (wave.material as THREE.MeshBasicMaterial).opacity =
        Number(wave.userData.baseOpacity) * fade * delayedProgress;
      wave.rotation.z = (index % 2 ? -1 : 1) * previewElapsed * 0.18;
    });
    return;
  }
  const projectile = simulation.userData.projectile as THREE.Group;
  const targetObject = simulation.userData.targetObject as THREE.Group;
  const definition = simulation.userData.definition as TowerVisualEffectDefinition;
  const kind = simulation.userData.kind as ProjectileVisualKind;
  const launch = simulation.userData.launch as THREE.Vector3;
  const target = simulation.userData.target as THREE.Vector3;
  const progress = (previewElapsed * 0.55) % 1;
  const baseScale =
    Math.max(0.65, fittedCharacterHeight * 0.42) *
    (1 + Math.max(0, props.visualEffectLevel - 1) * 0.12);

  if (kind === "thunder") {
    const bolt = projectile.getObjectByName("thunderBoltCore");
    const flashProgress = (previewElapsed % 1.15) / 1.15;
    projectile.visible = flashProgress < 0.72;
    projectile.position.lerpVectors(launch, target, 0.5);
    projectile.lookAt(target);
    const configuredScale = Number(bolt?.userData.baseScale) || 1;
    projectile.scale.set(
      baseScale * configuredScale,
      baseScale * configuredScale,
      launch.distanceTo(target) / 0.76,
    );
    const flickerFrame = Math.floor(previewElapsed * 28);
    bolt?.children.forEach((child) => {
      if (!(child instanceof THREE.Line)) return;
      const lane = Number(child.userData.lane);
      const position = child.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let index = 1; index < position.count - 1; index++) {
        const seed = flickerFrame * 11.7 + index * 17.3 + lane * 5.1;
        position.setX(index, Math.sin(seed) * 0.052 + lane * 0.012);
        position.setY(index, Math.cos(seed * 1.31) * 0.045);
      }
      position.needsUpdate = true;
    });
  } else {
    projectile.visible = true;
    const movement = THREE.MathUtils.smoothstep(progress, 0, 1);
    projectile.position.lerpVectors(launch, target, movement);
    projectile.position.y +=
      Math.sin(progress * Math.PI) * Math.max(0.22, fittedCharacterHeight * 0.16);
    projectile.lookAt(target);
    projectile.scale.setScalar(baseScale);
  }

  const thunderImpactPhase = (previewElapsed % 1.15) / 1.15;
  const impact = kind === "thunder"
    ? Math.max(0, 1 - thunderImpactPhase * 4)
    : THREE.MathUtils.smoothstep(progress, 0.84, 1);
  const targetBaseScale = Number(targetObject.userData.baseScale) || 1;
  targetObject.scale.setScalar(targetBaseScale);
  targetObject.position.x = target.x + impact * 0.025 * Math.sin(previewElapsed * 32);
  const impactGlow = targetObject.getObjectByName("towerPreviewTargetImpact") as
    | THREE.Mesh
    | undefined;
  if (impactGlow) {
    impactGlow.scale.setScalar(0.22 + impact * (0.72 + Math.sin(previewElapsed * 20) * 0.08));
    (impactGlow.material as THREE.MeshBasicMaterial).opacity = impact * 0.34;
  }

  const fireball = projectile.getObjectByName("fireballCore");
  if (fireball) fireball.rotateZ(0.12);
  const drop = projectile.getObjectByName("waterShotCore");
  if (drop) {
    const pulse = 1 + Math.sin(previewElapsed * 10) * 0.055;
    drop.scale.set(pulse * 0.94, pulse * 0.94, pulse * 1.24);
  }
  projectile.traverse((item) => {
    if (item.name !== "managedProjectileVisual") return;
    const configuredScale = Number(item.userData.baseScale) || definition.size;
    const pulseSpeed = Number(item.userData.pulseSpeed) || 0;
    item.scale.setScalar(
      configuredScale * (1 + Math.sin(previewElapsed * pulseSpeed) * 0.1),
    );
  });
}

async function loadPreview() {
  const version = ++loadVersion;
  clearCharacter();
  errorMessage.value = "";
  equipmentWarning.value = "";
  activeAnimation.value = "Tĩnh";
  if ((!props.modelUrl && !props.towerKind) || !scene) return;
  loading.value = true;
  try {
    const loader = new GLTFLoader();
    const fallbackUrl = props.towerKind
      ? getBuiltInTowerModelUrl(props.towerKind, props.visualEffectLevel)
      : undefined;
    const sourceUrl = props.modelUrl || fallbackUrl;
    const gltf = sourceUrl ? await loader.loadAsync(sourceUrl) : null;
    const proceduralModel = gltf
      ? null
      : createTowerDefenseProceduralModel(props.towerKind);
    if (!gltf && !proceduralModel)
      throw new Error("Không có model fallback cho tower đã chọn.");
    if (version !== loadVersion || !scene) {
      if (gltf) disposeObject(gltf.scene);
      if (proceduralModel) disposeObject(proceduralModel);
      return;
    }
    const root = new THREE.Group();
    const character = gltf?.scene ?? proceduralModel!;
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
    decorateTowerVisualEffects(root, props.visualEffects, props.visualEffectLevel);
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

    let sourceAnimations = gltf?.animations ?? [];
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
    createTowerProjectileSimulation(root);
    // Trên màn hình Retina, canvas có thể nhận kích thước thực sau frame tải
    // model. Fit lại ở frame kế tiếp để Mac và Windows dùng cùng layout cuối.
    requestAnimationFrame(() => {
      if (version !== loadVersion || characterRoot !== root) return;
      resizeRenderer();
      fitCharacter(root);
      createTowerProjectileSimulation(root);
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
  scene.background = new THREE.Color(0x9ca3af);
  scene.fog = new THREE.Fog(0x9ca3af, 8, 22);
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
      color: 0x6b7280,
      metalness: 0.05,
      roughness: 0.88,
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
    const delta = Math.min(clock.getDelta(), 0.05);
    mixer?.update(delta);
    previewElapsed += delta;
    animateTowerProjectileSimulation();
    characterRoot?.getObjectByName("managedTowerVisualEffects")?.children.forEach((effect) => {
      const speed = Number(effect.userData.pulseSpeed) || 0;
      const pulse = speed > 0 ? 1 + Math.sin(previewElapsed * speed + Number(effect.userData.phase || 0)) * 0.12 : 1;
      effect.scale.setScalar(pulse);
    });
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
    props.visualEffectLevel,
    props.towerKind,
    props.towerRange,
    ...props.animationNames,
  ],
  () => void loadPreview(),
);
watch(
  () => props.visualEffects,
  () => {
    if (!characterRoot) return;
    decorateTowerVisualEffects(
      characterRoot,
      props.visualEffects,
      props.visualEffectLevel,
    );
    createTowerProjectileSimulation(characterRoot, false);
  },
  { deep: true },
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
  frostPreviewWaveTexture?.dispose();
  frostPreviewWaveTexture = null;
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
});
</script>

<template>
  <section class="enemy-model-preview">
    <header>
      <div><small>{{ eyebrow }}</small><strong>{{ title }}</strong></div>
      <nav>
        <button type="button" title="Xoay nhân vật sang trái 45°" @click="rotateCharacter(-1)"><RotateCcw /></button>
        <button type="button" title="Xoay nhân vật sang phải 45°" @click="rotateCharacter(1)"><RotateCw /></button>
        <button
          v-if="showAnimationControls"
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
      <img v-if="!modelUrl && !towerKind && avatarUrl" :src="avatarUrl" alt="" />
      <p v-if="!modelUrl && !towerKind">Chọn model để xem trước.</p>
      <p v-else-if="loading">Đang tải model…</p>
      <p v-else-if="errorMessage" class="is-error">{{ errorMessage }}</p>
    </div>
    <footer :class="{ 'is-single': !showAnimationControls }">
      <span v-if="showAnimationControls"><small>Animation</small><b>{{ activeAnimation }} · {{ isAnimationPlaying ? 'Đang chạy' : 'Đang dừng' }}</b></span>
      <span><small>{{ detailLabel }}</small><b>{{ detailValue || Number(sceneScale).toFixed(3) }}</b></span>
    </footer>
    <p v-if="equipmentWarning" class="enemy-model-preview__warning">{{ equipmentWarning }}</p>
    <em>Kéo để xoay · Cuộn để zoom</em>
  </section>
</template>

<style scoped>
.enemy-model-preview{overflow:hidden;border:1px solid rgb(139 92 246/.28);border-radius:12px;background:#090910;box-shadow:0 18px 40px rgb(0 0 0/.28)}
.enemy-model-preview>header{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid rgb(255 255 255/.06);background:linear-gradient(90deg,rgb(124 58 237/.1),transparent)}
.enemy-model-preview>header div{display:grid;gap:2px}.enemy-model-preview>header small{color:#a78bfa;font-size:7px;font-weight:900;letter-spacing:.13em}.enemy-model-preview>header strong{color:#f4f4f5;font-size:11px}.enemy-model-preview>header button{display:grid;width:29px;height:29px;padding:0;place-items:center;border:1px solid rgb(255 255 255/.08);border-radius:7px;background:rgb(255 255 255/.03);color:#a1a1aa;cursor:pointer}.enemy-model-preview>header svg{width:13px}.enemy-model-preview__stage{position:relative;height:480px;overflow:hidden;background:radial-gradient(circle at 50% 42%,#d1d5db 0,#9ca3af 55%,#6b7280 100%)}.enemy-model-preview__stage canvas{position:absolute;inset:0;width:100%!important;height:100%!important}.enemy-model-preview__stage p{position:absolute;z-index:2;inset:50% auto auto 50%;width:max-content;max-width:80%;margin:0;transform:translate(-50%,-50%);color:#475569;font-size:10px;text-align:center}.enemy-model-preview__stage p.is-error{color:#fda4af}.enemy-model-preview__stage>img{position:absolute;z-index:1;inset:50% auto auto 50%;width:82px;height:82px;transform:translate(-50%,-50%);border:1px solid rgb(167 139 250/.35);border-radius:16px;object-fit:cover;opacity:.55}.enemy-model-preview>footer{display:grid;grid-template-columns:1fr 1fr;gap:1px;border-top:1px solid rgb(255 255 255/.06);background:rgb(255 255 255/.04)}.enemy-model-preview>footer.is-single{grid-template-columns:1fr}.enemy-model-preview>footer span{display:grid;gap:3px;padding:9px 11px;background:#0d0d15}.enemy-model-preview>footer small{color:#60606d;font-size:7px;text-transform:uppercase}.enemy-model-preview>footer b{overflow:hidden;color:#d4d4d8;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.enemy-model-preview__warning{margin:0;padding:8px 11px;border-top:1px solid rgb(245 158 11/.18);background:rgb(245 158 11/.06);color:#fbbf24;font-size:8px;line-height:1.4}.enemy-model-preview>em{display:block;padding:8px 11px;color:#52525b;font-size:8px;font-style:normal;text-align:center}@media(max-width:900px){.enemy-model-preview__stage{height:360px}}
.enemy-model-preview>header nav{display:flex;align-items:center;gap:6px}
.enemy-model-preview>header .animation-toggle{display:flex;width:auto;padding:0 9px;gap:5px;color:#c4b5fd}
.enemy-model-preview>header .animation-toggle span{font-size:8px;font-weight:800;white-space:nowrap}
.enemy-model-preview>header button:disabled{opacity:.35;cursor:not-allowed}
</style>
