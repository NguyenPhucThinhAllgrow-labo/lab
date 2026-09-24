<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  TOWER_DEFINITIONS,
  canTowerReceiveSupportBuff,
  isSupportTowerKind,
  towerRangeAtLevel,
} from "~/composables/useTowerDefense";
import { mapPathPosition } from "~/games/tower-defense/map-path";
import {
  createTowerDefenseMapScene,
  loadTowerDefenseBackgroundModel,
  loadTowerDefenseCastle,
  mapWorldPosition,
  type TowerDefenseBackgroundLayer,
} from "~/components/tower-defense/scene/map-scene";
import {
  createTowerDefenseEnemyScene,
  type TowerDefenseEnemyScene,
} from "~/components/tower-defense/scene/enemy-scene";
import {
  createTowerDefenseProjectileScene,
  type TowerDefenseProjectileScene,
} from "~/components/tower-defense/scene/projectile-scene";
import {
  createTowerDefenseImpactScene,
  type TowerDefenseImpactScene,
} from "~/components/tower-defense/scene/impact-scene";
import {
  createTowerModelLibrary,
  type LevelledTowerKind,
  type ManagedTowerModelDefinition,
  type TowerFaction,
  type TowerModelLibrary,
} from "~/components/tower-defense/scene/tower-models";
import type {
  Enemy,
  GamePhase,
  Impact,
  Projectile,
  Tower,
  TowerDefenseMapDefinition,
  TowerKind,
} from "~/types/games/towerDefense";

const props = defineProps<{
  map: TowerDefenseMapDefinition;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  impacts: Impact[];
  selectedTowerId: number | null;
  selectedKind: TowerKind | null;
  phase: GamePhase;
  isPaused: boolean;
  speedMultiplier: 0.5 | 1 | 2 | 4;
  showBrickBackground: boolean;
  faction: TowerFaction;
  managedTowerModels?: Partial<Record<LevelledTowerKind, ManagedTowerModelDefinition>>;
}>();
const DEFENSE_PATH_TILES = props.map.pathTiles;
const DEFENSE_CELL_SIZE = props.map.cellSize;
const emit = defineEmits<{
  cellSelect: [x: number, y: number];
  backgroundSelect: [];
  selectedTowerPosition: [x: number, y: number, visible: boolean];
  ready: [];
}>();

// ===== WebGL lifecycle và tài nguyên dùng chung =============================
const host = ref<HTMLDivElement | null>(null);
const renderError = ref("");

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let mapBackgroundLayer: TowerDefenseBackgroundLayer | null = null;
let animationFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let surfaceDetail: THREE.DataTexture | null = null;
let frostGlowTexture: THREE.CanvasTexture | null = null;
const towerLevelLabelTextures = new Map<number, THREE.CanvasTexture>();
const towerBuffBadgeTextures = new Map<"damage" | "speed", THREE.CanvasTexture>();
const clock = new THREE.Clock();
let visualElapsed = 0;
let visualNow = 0;

// Cache object đang hiển thị theo ID gameplay; template giữ bản gốc để clone.
const towerModels = new Map<number, THREE.Group>();
const towerUpgradeEffects = new Map<
  number,
  { group: THREE.Group; bornAt: number; kind: TowerKind }
>();
let enemyScene: TowerDefenseEnemyScene | null = null;
let projectileScene: TowerDefenseProjectileScene | null = null;
let impactScene: TowerDefenseImpactScene | null = null;
const towerTemplates = new Map<Tower["kind"], THREE.Group>();
let towerModelLibrary: TowerModelLibrary | null = null;
let towerPreviewModel: THREE.Group | null = null;
let towerPreviewKind: TowerKind | null = null;
let castleModel: THREE.Group | null = null;
const tileMeshes: THREE.Mesh[] = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerStart = new THREE.Vector2();
const pointerCurrent = new THREE.Vector2();
const cameraMapSpan = Math.max(
  props.map.columns * props.map.cellSize,
  props.map.rows * props.map.cellSize,
  8,
);
const defaultCameraPosition = new THREE.Vector3(
  cameraMapSpan * 0.58,
  cameraMapSpan * 0.82,
  cameraMapSpan * 0.68,
);
const defaultCameraTarget = new THREE.Vector3(0, 0, 0);
const towerScreenPosition = new THREE.Vector3();
const thunderStartWorld = new THREE.Vector3();
const thunderEndWorld = new THREE.Vector3();
const thunderBranchStart = new THREE.Vector3();
const thunderBranchEnd = new THREE.Vector3();
const defensePathTileSet = new Set(
  DEFENSE_PATH_TILES.map((point) => `${point.x}:${point.y}`),
);
let cameraReturning = false;
let lastTowerAnchorUpdate = 0;
let lastTowerAnchorVisible = false;
let lastTowerAnchorX = Number.NaN;
let lastTowerAnchorY = Number.NaN;
let pointerTravel = 0;
let hoverMarker: THREE.Mesh | null = null;
let attackRangeMarker: THREE.Group | null = null;
let towerFocusMarker: THREE.Group | null = null;
let mysticParticles: THREE.Points | null = null;
let updateSpawnPortal: ((elapsed: number) => void) | null = null;
let performanceMode = false;

watch(
  () => props.showBrickBackground,
  (visible) => mapBackgroundLayer?.setVisible(visible),
);

// ===== Helpers tọa độ, geometry và giải phóng GPU ===========================
/** Đặt tâm grid tại world origin và ánh xạ hàng gameplay sang trục Z của Three.js. */
const worldPosition = (x: number, y: number) =>
  mapWorldPosition(props.map, x, y);
/** Đổi progress trên một lane gameplay thành Vector3 trong hệ tọa độ scene. */
function pathPosition(progress: number, lane: 0 | 1 = 0) {
  const position = mapPathPosition(props.map, progress, lane);
  return worldPosition(position.x, position.y);
}
/** Tạo bóng tròn giả nhẹ hơn shadow map để model luôn tách khỏi mặt đất. */
function groundShadow(radius: number) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      color: 0x10180d,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.renderOrder = 2;
  return shadow;
}

/** Gỡ Object3D và tùy chọn giải phóng geometry/material sở hữu riêng trên GPU. */
const disposeObject = (object: THREE.Object3D, disposeResources = true) => {
  object.traverse((child) => {
    if (!disposeResources) return;
    if (
      !(child instanceof THREE.Mesh) &&
      !(child instanceof THREE.Sprite) &&
      !(child instanceof THREE.Line)
    )
      return;
    if (child instanceof THREE.Mesh || child instanceof THREE.Line)
      child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => material.dispose());
  });
  object.removeFromParent();
};

/** Factory MeshStandardMaterial thống nhất chất liệu, bump và shadow cho scene. */
function mesh(
  geometry: THREE.BufferGeometry,
  color: number,
  options: {
    roughness?: number;
    metalness?: number;
    emissive?: number;
    flatShading?: boolean;
  } = {},
) {
  const roughness = options.roughness ?? 0.72;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: options.metalness ?? 0.05,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissive ? 1.35 : 1,
    flatShading: options.flatShading ?? false,
    bumpMap: roughness > 0.5 ? surfaceDetail : null,
    bumpScale: roughness > 0.5 ? 0.012 : 0,
  });
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

/** Sinh DataTexture nhiễu nhỏ dùng làm bump map chung cho đá và công trình. */
function createSurfaceDetail() {
  const size = 64;
  const data = new Uint8Array(size * size);
  let seed = 941;
  for (let index = 0; index < data.length; index++) {
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647 - 0.5) * 42;
    const x = index % size;
    const y = Math.floor(index / size);
    data[index] = Math.max(
      0,
      Math.min(
        255,
        128 + noise + Math.sin(x * 0.7) * 8 + Math.cos(y * 0.43) * 6,
      ),
    );
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}

/** Tắt shadow cho chi tiết rất nhỏ để giảm draw cost khi template được clone nhiều lần. */
function optimizeTemplateShadows(group: THREE.Group) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.computeBoundingSphere();
    // Chi tiết nhỏ vẫn nhận ánh sáng nhưng không tạo thêm một shadow draw-call.
    if ((child.geometry.boundingSphere?.radius ?? 0) < 0.22)
      child.castShadow = false;
  });
}

/** Phân biệt hai phe cho các tower dựng bằng geometry nội bộ. */
function applyProceduralTowerFaction(group: THREE.Group) {
  if (props.faction === "human") return;
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.color.multiply(new THREE.Color(0x755f78));
      material.emissive.lerp(new THREE.Color(0x4b102d), 0.16);
      material.roughness = Math.min(1, material.roughness + 0.08);
      material.needsUpdate = true;
    });
  });
}

/** Clone và hiệu chỉnh material kim loại của tower mà không làm bẩn material template khác. */
function applyTowerMetallicFinish(group: THREE.Group, tint: number) {
  const tintColor = new THREE.Color(tint);
  group.traverse((child) => {
    if (
      !(child instanceof THREE.Mesh) ||
      !(child.material instanceof THREE.MeshStandardMaterial)
    )
      return;
    const material = child.material;
    // Giữ nguyên pha lê/rune emissive; chỉ phủ ánh kim nhẹ lên kiến trúc.
    if (material.emissive.getHex() !== 0) return;
    material.color.lerp(tintColor, 0.08);
    material.metalness = THREE.MathUtils.clamp(
      Math.max(material.metalness, 0.12) + 0.04,
      0.16,
      0.88,
    );
    material.roughness = THREE.MathUtils.clamp(
      material.roughness - 0.08,
      0.24,
      0.82,
    );
    material.needsUpdate = true;
  });
}

/** Xếp các khối crenellation quanh mép tower theo vòng tròn. */
function addBattlements(
  group: THREE.Group,
  y: number,
  radius: number,
  color: number,
  count = 8,
) {
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const block = mesh(new THREE.BoxGeometry(0.18, 0.18, 0.14), color);
    block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    block.rotation.y = angle;
    group.add(block);
  }
}

/** Rải đá chân móng có biến thiên nhỏ để silhouette tower bớt đều. */
function addRockFooting(
  group: THREE.Group,
  radius: number,
  color: number,
  count = 9,
) {
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const rock = mesh(
      new THREE.DodecahedronGeometry(0.13 + (index % 3) * 0.018, 0),
      color,
      { flatShading: true },
    );
    rock.position.set(Math.sin(angle) * radius, 0.11, Math.cos(angle) * radius);
    rock.scale.set(1.15, 0.75 + (index % 2) * 0.16, 0.92);
    rock.rotation.set(index * 0.17, angle, index * -0.11);
    group.add(rock);
  }
}

/** Thêm các đai đá theo danh sách cao độ/bán kính cấu hình. */
function addStoneCourses(
  group: THREE.Group,
  courses: Array<{ y: number; radius: number }>,
  color: number,
) {
  for (const course of courses) {
    const seam = mesh(
      new THREE.CylinderGeometry(course.radius, course.radius, 0.035, 16),
      color,
      { roughness: 0.92 },
    );
    seam.position.y = course.y;
    group.add(seam);
  }
}

/** Bố trí khe bắn quanh thân tower và xoay từng khe hướng ra ngoài. */
function addArrowSlits(
  group: THREE.Group,
  y: number,
  radius: number,
  count = 4,
) {
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const slit = mesh(new THREE.BoxGeometry(0.065, 0.23, 0.025), 0x171b1a, {
      metalness: 0.08,
      roughness: 0.52,
    });
    slit.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    slit.rotation.y = angle;
    group.add(slit);
  }
}

/** Tạo cờ hai màu gắn trên tower; mesh được đặt tên để animate về sau. */
function createBanner(color: number, trim: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.11, 0.2);
  shape.lineTo(0.11, 0.2);
  shape.lineTo(0.11, -0.14);
  shape.lineTo(0, -0.22);
  shape.lineTo(-0.11, -0.14);
  shape.closePath();
  const cloth = mesh(new THREE.ShapeGeometry(shape), color, { roughness: 0.9 });
  (cloth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  const emblem = mesh(new THREE.CircleGeometry(0.035, 10), trim, {
    metalness: 0.35,
    roughness: 0.38,
  });
  emblem.position.z = 0.008;
  cloth.add(emblem);
  return cloth;
}

/** Tạo vòng chọn mờ ở chân tower, mặc định ẩn cho tới khi tower được chọn. */
function createTowerAura(color: number) {
  const aura = new THREE.Group();
  aura.name = "towerAura";
  aura.position.y = 0.105;
  const ring = mesh(new THREE.TorusGeometry(0.49, 0.018, 7, 40), color, {
    emissive: color,
    metalness: 0.25,
    roughness: 0.2,
  });
  ring.rotation.x = Math.PI / 2;
  const disc = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.46, 40),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  aura.add(ring, disc);
  for (let index = 0; index < 4; index++) {
    const angle = (index * Math.PI) / 2;
    const rune = mesh(new THREE.OctahedronGeometry(0.035, 0), color, {
      emissive: color,
      roughness: 0.16,
    });
    rune.position.set(Math.cos(angle) * 0.405, 0.025, Math.sin(angle) * 0.405);
    aura.add(rune);
  }
  return aura;
}

/** Tạo lazy radial texture cho ánh sáng băng và cache để mọi instance dùng chung. */
function getFrostGlowTexture() {
  if (frostGlowTexture) return frostGlowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Không thể tạo texture phát sáng cho tháp băng.");
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 62);
  gradient.addColorStop(0, "rgba(220, 252, 255, .95)");
  gradient.addColorStop(0.18, "rgba(91, 229, 255, .72)");
  gradient.addColorStop(0.5, "rgba(28, 174, 232, .22)");
  gradient.addColorStop(1, "rgba(10, 102, 181, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  frostGlowTexture = new THREE.CanvasTexture(canvas);
  frostGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return frostGlowTexture;
}

// ===== Model tháp và hiệu ứng nâng cấp ======================================
/** Gắn cửa và vòng tay nắm lên mặt trước của một tower procedural. */
function addDoor(group: THREE.Group, y: number, z: number) {
  const door = mesh(new THREE.BoxGeometry(0.2, 0.31, 0.035), 0x49301f);
  door.position.set(0, y, z);
  const ring = mesh(new THREE.TorusGeometry(0.035, 0.009, 5, 10), 0xc18b3d, {
    metalness: 0.7,
    roughness: 0.25,
  });
  ring.position.set(0.045, y, z + 0.025);
  group.add(door, ring);
}

/** Dựng template tháp cung cùng turret, dây cung và điểm phóng tên. */
function createArcherTower() {
  const group = new THREE.Group();
  group.add(createTowerAura(0x79b85a));
  addRockFooting(group, 0.43, 0x5c5b56, 11);
  const base = mesh(
    new THREE.CylinderGeometry(0.39, 0.49, 0.25, 16),
    0x4e4d49,
    { roughness: 0.9 },
  );
  base.position.y = 0.125;
  const body = mesh(new THREE.CylinderGeometry(0.29, 0.38, 0.9, 16), 0x9b968a, {
    roughness: 0.94,
  });
  body.position.y = 0.66;
  const lowerBand = mesh(
    new THREE.CylinderGeometry(0.385, 0.405, 0.1, 16),
    0x56534d,
    { roughness: 0.82 },
  );
  lowerBand.position.y = 0.38;
  const deck = mesh(
    new THREE.CylinderGeometry(0.47, 0.47, 0.13, 16),
    0x43372c,
    { roughness: 0.78 },
  );
  deck.position.y = 1.1;
  addStoneCourses(
    group,
    [
      { y: 0.56, radius: 0.35 },
      { y: 0.82, radius: 0.325 },
    ],
    0x77736b,
  );
  addArrowSlits(group, 0.73, 0.34);
  addDoor(group, 0.31, 0.43);
  addBattlements(group, 1.2, 0.39, 0xb1aca1, 10);
  const lowerBanner = createBanner(0x344a35, 0xb79852);
  lowerBanner.position.set(0, 0.66, 0.39);
  group.add(lowerBanner);
  const turret = new THREE.Group();
  turret.position.y = 1.2;
  const roof = mesh(new THREE.ConeGeometry(0.43, 0.4, 16), 0x263a2d, {
    roughness: 0.68,
  });
  roof.position.y = 0.44;
  const roofTrim = mesh(
    new THREE.CylinderGeometry(0.445, 0.445, 0.06, 16),
    0x85643d,
    { metalness: 0.35, roughness: 0.42 },
  );
  roofTrim.position.y = 0.25;
  for (const x of [-0.32, 0.32])
    for (const z of [-0.25, 0.25]) {
      const post = mesh(new THREE.BoxGeometry(0.075, 0.25, 0.075), 0x49372a, {
        roughness: 0.74,
      });
      post.position.set(x, 0.12, z);
      turret.add(post);
    }
  const cap = mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.1, 12), 0x756047, {
    metalness: 0.25,
    roughness: 0.44,
  });
  cap.position.y = 0.67;
  const flagPole = mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8),
    0x40352b,
    { metalness: 0.28, roughness: 0.4 },
  );
  flagPole.position.set(0, 0.82, 0);
  const flag = createBanner(0x344a35, 0xb79852);
  flag.scale.set(0.82, 0.82, 0.82);
  flag.position.set(0.13, 0.98, 0);
  flag.rotation.y = Math.PI / 2;
  // Mái, cờ và bốn trụ là kiến trúc cố định; tháp cung không có cụm pháo
  // cơ khí cần quay theo mục tiêu như tháp pháo.
  turret.name = "archerRoof";
  flag.name = "towerFlag";
  turret.add(roof, roofTrim, cap, flagPole, flag);
  group.add(base, body, lowerBand, deck, turret);
  return group;
}

/** Dựng template pháo, gồm barrel rig dùng cho aim/recoil và hiệu ứng nòng. */
function createCannonTower() {
  const group = new THREE.Group();
  group.add(createTowerAura(0xe09648));
  addRockFooting(group, 0.48, 0x55534f, 12);
  const base = mesh(
    new THREE.CylinderGeometry(0.43, 0.53, 0.27, 16),
    0x454541,
    { roughness: 0.9 },
  );
  base.position.y = 0.135;
  const wall = mesh(
    new THREE.CylinderGeometry(0.33, 0.42, 0.76, 16),
    0x918b80,
    { roughness: 0.94 },
  );
  wall.position.y = 0.58;
  const lowerBand = mesh(
    new THREE.CylinderGeometry(0.425, 0.445, 0.1, 16),
    0x55514b,
    { roughness: 0.8 },
  );
  lowerBand.position.y = 0.34;
  const rim = mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 16), 0x4a4844, {
    metalness: 0.16,
    roughness: 0.58,
  });
  rim.position.y = 0.99;
  addStoneCourses(
    group,
    [
      { y: 0.55, radius: 0.39 },
      { y: 0.78, radius: 0.36 },
    ],
    0x706c65,
  );
  addArrowSlits(group, 0.7, 0.375);
  addDoor(group, 0.3, 0.46);
  addBattlements(group, 1.1, 0.375, 0xa6a198, 10);
  const banner = createBanner(0x713f2c, 0xb99458);
  banner.position.set(0, 0.62, 0.405);
  group.add(banner);
  const turret = new THREE.Group();
  turret.position.y = 1.08;
  const cradle = mesh(new THREE.BoxGeometry(0.42, 0.24, 0.38), 0x45362b, {
    roughness: 0.7,
  });
  cradle.position.y = 0.02;
  const barrelRig = new THREE.Group();
  barrelRig.name = "towerBarrelRig";
  barrelRig.position.y = 0.13;
  barrelRig.rotation.x = -0.2;
  const barrel = mesh(
    new THREE.CylinderGeometry(0.085, 0.14, 0.82, 16),
    0x3e4546,
    { metalness: 0.78, roughness: 0.26 },
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.38;
  const muzzle = mesh(
    new THREE.CylinderGeometry(0.145, 0.145, 0.17, 16),
    0x292e2f,
    { metalness: 0.82, roughness: 0.22 },
  );
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.z = 0.82;
  const muzzleFlash = mesh(new THREE.OctahedronGeometry(0.11, 0), 0xffb347, {
    emissive: 0xff6a22,
    roughness: 0.14,
    flatShading: true,
  });
  muzzleFlash.name = "towerMuzzleFlash";
  muzzleFlash.position.z = 0.96;
  muzzleFlash.visible = false;
  const muzzleCharge = new THREE.Group();
  muzzleCharge.name = "cannonMuzzleCharge";
  muzzleCharge.position.z = 0.98;
  muzzleCharge.visible = false;
  for (let index = 0; index < 2; index++) {
    const chargeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.16 + index * 0.045, 0.012, 6, 28),
      new THREE.MeshBasicMaterial({
        color: index ? 0xff7b28 : 0xffcf66,
        transparent: true,
        opacity: 0.72 - index * 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    chargeRing.name = "cannonMuzzleRing";
    chargeRing.userData.index = index;
    muzzleCharge.add(chargeRing);
  }
  for (let index = 0; index < 8; index++) {
    const spark = new THREE.Mesh(
      new THREE.TetrahedronGeometry(index % 3 === 0 ? 0.025 : 0.017, 0),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xff7a24 : 0xffe19a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    spark.name = "cannonMuzzleSpark";
    spark.userData.index = index;
    spark.userData.angle = (index / 8) * Math.PI * 2;
    muzzleCharge.add(spark);
  }
  const barrelUpgradeFx = new THREE.Group();
  barrelUpgradeFx.name = "cannonBarrelUpgradeFx";
  barrelUpgradeFx.visible = false;
  for (let index = 0; index < 3; index++) {
    const energyBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.125 + index * 0.006, 0.009, 6, 24),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xff8a2b : 0xffd878,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    energyBand.name = "cannonBarrelEnergyBand";
    energyBand.userData.index = index;
    energyBand.position.z = 0.23 + index * 0.22;
    barrelUpgradeFx.add(energyBand);
  }
  for (let index = 0; index < 6; index++) {
    const arc = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.009, 0.07, 3, 5),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xffb13b : 0xfff0b0,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    arc.name = "cannonBarrelArc";
    arc.userData.index = index;
    arc.userData.phase = (index / 6) * Math.PI * 2;
    arc.rotation.x = Math.PI / 2;
    barrelUpgradeFx.add(arc);
  }
  for (const z of [0.16, 0.43, 0.69]) {
    const barrelBand = mesh(
      new THREE.TorusGeometry(0.12, 0.018, 7, 16),
      0x8d7148,
      { metalness: 0.72, roughness: 0.28 },
    );
    barrelBand.rotation.x = Math.PI / 2;
    barrelBand.position.z = z;
    barrelRig.add(barrelBand);
  }
  for (const x of [-0.27, 0.27]) {
    const wheel = mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.085, 16),
      0x382c24,
      { roughness: 0.8 },
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -0.04, 0.03);
    turret.add(wheel);
    const hub = mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.1, 12),
      0x846844,
      { metalness: 0.48, roughness: 0.35 },
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wheel.position);
    turret.add(hub);
  }
  turret.name = "towerTurret";
  barrel.name = "towerBarrel";
  muzzle.name = "towerMuzzle";
  barrelRig.add(barrel, muzzle, muzzleFlash, muzzleCharge, barrelUpgradeFx);
  turret.add(cradle, barrelRig);
  group.add(base, wall, lowerBand, rim, turret);
  return group;
}

/** Bổ sung marker, tinh thể và node hiệu ứng vào model tháp băng đã tải. */
function decorateFrostTower(group: THREE.Group) {
  if (group.getObjectByName("frostVisualEffects")) return;
  const centralY = Number(group.userData.frostEffectCenterY ?? 1.77);
  const effects = new THREE.Group();
  effects.name = "frostVisualEffects";
  const glowMaterial = new THREE.SpriteMaterial({
    map: getFrostGlowTexture(),
    color: 0xb9f7ff,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  glowMaterial.toneMapped = false;
  const glow = new THREE.Sprite(glowMaterial);
  glow.name = "frostGlowCentral";
  glow.position.y = centralY + 0.05;
  glow.scale.set(0.68, 0.88, 1);
  glow.userData.baseScaleX = 0.68;
  glow.userData.baseScaleY = 0.88;
  effects.add(glow);
  for (const [radius, tube, tilt, opacity] of [
    [0.43, 0.018, 0, 0.72],
    [0.48, 0.012, 0.3, 0.46],
  ] as Array<[number, number, number, number]>) {
    const energyRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 7, 48),
      new THREE.MeshBasicMaterial({
        color: 0x8cefff,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    energyRing.name = "frostEnergyRing";
    energyRing.position.y = centralY - 0.31;
    energyRing.rotation.set(Math.PI / 2 + tilt, 0, tilt * 0.65);
    energyRing.userData.baseTilt = tilt;
    effects.add(energyRing);
  }
  for (let index = 0; index < 10; index++) {
    const particle = new THREE.Mesh(
      new THREE.OctahedronGeometry(index % 3 === 0 ? 0.027 : 0.018, 0),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xc8f9ff : 0x4cddff,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    particle.name = "frostParticle";
    particle.userData.orbitAngle = (index / 10) * Math.PI * 2;
    particle.userData.orbitRadius = 0.34 + (index % 3) * 0.09;
    particle.userData.baseY = centralY - 0.42 + (index % 4) * 0.13;
    effects.add(particle);
  }
  group.add(effects);
}

/** Biến một clone tháp băng thành tháp lửa bằng material và effect node riêng. */
function createFireTowerTemplate(frostTemplate: THREE.Group) {
  const group = frostTemplate.clone(true);
  group.name = "FireTower3D";
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
    if (child instanceof THREE.Mesh) child.geometry = child.geometry.clone();
    const recolor = (original: THREE.Material) => {
      const material = original.clone();
      if (material instanceof THREE.SpriteMaterial) {
        material.color.setHex(0xff6238);
        material.opacity = Math.min(1, material.opacity * 1.08);
      } else if (material instanceof THREE.MeshBasicMaterial) {
        material.color.setHex(
          child.name.startsWith("frost") ? 0xff4b24 : 0xb83226,
        );
      } else if (material instanceof THREE.MeshStandardMaterial) {
        material.color.setRGB(1, 1, 1);
        material.metalness = Math.max(material.metalness, 0.14);
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            float fireLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float fireMax = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
            float fireMin = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
            float coolDominance = max(diffuseColor.g, diffuseColor.b) - diffuseColor.r;
            float coloredDetail = smoothstep(0.035, 0.2, coolDominance) * smoothstep(0.06, 0.3, fireMax - fireMin);
            vec3 fireShadow = vec3(0.32, 0.035, 0.024);
            vec3 fireMid = vec3(0.84, 0.12, 0.055);
            vec3 fireHighlight = vec3(1.0, 0.52, 0.14);
            vec3 firePalette = mix(fireShadow, fireMid, smoothstep(0.04, 0.62, fireLuma));
            firePalette = mix(firePalette, fireHighlight, smoothstep(0.62, 0.96, fireLuma));
            diffuseColor.rgb = mix(diffuseColor.rgb, firePalette, coloredDetail);`,
          );
        };
        material.customProgramCacheKey = () => "fire-tower-soft-red-accents-v3";
        if (child.name.startsWith("frost")) {
          material.emissive.setHex(0x8f190e);
          material.emissiveIntensity = 0.8;
        }
      }
      return material;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(recolor)
      : recolor(child.material);
  });
  return group;
}

/** Gắn quầng sáng nguyên tố lên lõi ở đỉnh các tháp lửa, sét và nước. */
function decorateElementalTowerGlow(
  group: THREE.Group,
  kind: "fire" | "thunder" | "water",
  level: 1 | 2 | 3,
) {
  const colors = {
    fire: 0xff5a18,
    thunder: 0x9b7cff,
    water: 0x38bdf8,
  } as const;
  const heightRatios = {
    fire: { 1: 0.82, 2: 0.84, 3: 0.86 },
    thunder: { 1: 0.82, 2: 0.73, 3: 0.79 },
    water: { 1: 0.76, 2: 0.73, 3: 0.68 },
  } as const;
  const glowScales = { fire: 1.5, thunder: 1, water: 1.02 } as const;
  const levelBrightness = { 1: 1, 2: 1.5, 3: 2 } as const;
  group.updateMatrixWorld(true);
  const towerBounds = new THREE.Box3().setFromObject(group);
  const towerSize = towerBounds.getSize(new THREE.Vector3());
  const glowPosition = towerBounds.getCenter(new THREE.Vector3());
  glowPosition.y =
    towerBounds.min.y + towerSize.y * heightRatios[kind][level];
  group.worldToLocal(glowPosition);
  const effect = new THREE.Group();
  effect.name = "elementalTowerGlow";
  effect.userData.kind = kind;
  effect.userData.level = level;
  effect.position.copy(glowPosition);

  // Hai lớp sprite additive tạo quầng rộng và lõi sáng rõ kể cả trên map tối.
  const outerMaterial = new THREE.SpriteMaterial({
    map: getFrostGlowTexture(),
    color: colors[kind],
    transparent: true,
    opacity:
      (kind === "fire" ? 0.58 : 0.52) * levelBrightness[level],
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const outerGlow = new THREE.Sprite(outerMaterial);
  outerGlow.name = "elementalTowerGlowOuter";
  outerGlow.scale.setScalar(glowScales[kind]);
  outerGlow.renderOrder = 8;

  const innerGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getFrostGlowTexture(),
      color: colors[kind],
      transparent: true,
      opacity: 0.92 * levelBrightness[level],
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  innerGlow.name = "elementalTowerGlowInner";
  innerGlow.scale.setScalar(glowScales[kind] * 0.58);
  innerGlow.renderOrder = 9;

  effect.add(outerGlow, innerGlow);

  // Tăng emissive cho phần nửa trên của model để glow không chỉ là một sprite
  // nổi bên ngoài mà còn phản ánh trực tiếp trên lõi/chi tiết của tháp.
  const glowFloor = towerBounds.min.y + towerBounds.getSize(new THREE.Vector3()).y * 0.52;
  const emissiveColor = new THREE.Color(colors[kind]).multiplyScalar(
    { 1: 0.3, 2: 0.42, 3: 0.56 }[level],
  );
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const childCenter = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
    if (childCenter.y < glowFloor) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.emissive.copy(emissiveColor);
      const levelIntensity =
        { 1: 1.05, 2: 1.65, 3: 2.3 }[level] +
        (kind === "thunder" ? 0.2 : 0);
      material.emissiveIntensity = Math.max(
        material.emissiveIntensity,
        levelIntensity,
      );
      material.needsUpdate = true;
    }
  });
  group.add(effect);
}

/** Hoàn thiện template GLB sau khi thư viện model đã chuẩn hóa kích thước. */
function decorateLoadedTowerModel(
  template: THREE.Group,
  kind: LevelledTowerKind,
  level: 1 | 2 | 3,
) {
  if (kind === "frost") decorateFrostTower(template);
  else if (kind === "fire" || kind === "thunder" || kind === "water")
    decorateElementalTowerGlow(template, kind, level);
  template.add(groundShadow(0.42));
  optimizeTemplateShadows(template);
}

/** Cache các node có tên vào userData để vòng render không phải traverse mỗi frame. */
function bindTowerParts(group: THREE.Group) {
  group.userData.turret = group.getObjectByName("towerTurret");
  group.userData.flag = group.getObjectByName("towerFlag");
  group.userData.barrelRig = group.getObjectByName("towerBarrelRig");
  group.userData.barrel = group.getObjectByName("towerBarrel");
  group.userData.muzzle = group.getObjectByName("towerMuzzle");
  group.userData.muzzleFlash = group.getObjectByName("towerMuzzleFlash");
  group.userData.cannonMuzzleCharge =
    group.getObjectByName("cannonMuzzleCharge");
  group.userData.cannonBarrelUpgradeFx = group.getObjectByName(
    "cannonBarrelUpgradeFx",
  );
  group.userData.aura = group.getObjectByName("towerAura");
  // Giữ model gọn: bỏ vòng aura trang trí quanh chân tower.
  if (group.userData.aura) group.userData.aura.visible = false;
  const glows: THREE.Object3D[] = [];
  const energyRings: THREE.Mesh[] = [];
  const particles: THREE.Mesh[] = [];
  group.traverse((child) => {
    if (child.name.startsWith("frostGlow")) glows.push(child);
    else if (child.name === "frostEnergyRing")
      energyRings.push(child as THREE.Mesh);
    else if (child.name === "frostParticle")
      particles.push(child as THREE.Mesh);
  });
  group.userData.frostGlows = glows;
  group.userData.frostEnergyRings = energyRings;
  group.userData.frostParticles = particles;
  // Không hiển thị vòng năng lượng và các hạt bay quanh tower.
  energyRings.forEach((ring) => (ring.visible = false));
  particles.forEach((particle) => (particle.visible = false));
}

/** Tạo và cache texture chữ level để mọi tower cùng cấp dùng chung tài nguyên. */
function getTowerLevelLabelTexture(level: number) {
  const normalizedLevel = Math.max(1, Math.round(level));
  const cached = towerLevelLabelTextures.get(normalizedLevel);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể tạo nhãn level cho tower.");

  context.beginPath();
  context.roundRect(7, 7, 242, 82, 22);
  context.fillStyle = "rgba(12, 17, 14, 0.9)";
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = "rgba(231, 190, 92, 0.95)";
  context.stroke();
  context.fillStyle = "#fff0bd";
  context.font = "900 47px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`LV.${normalizedLevel}`, 128, 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  towerLevelLabelTextures.set(normalizedLevel, texture);
  return texture;
}

function towerLevelScale(level: number) {
  return level === 1 ? 1 : level === 2 ? 1.13 : 1.27;
}

/** Tạo icon Gauge/Swords đồng bộ với avatar của hai trụ hỗ trợ trong sidebar. */
function getTowerBuffBadgeTexture(kind: "damage" | "speed") {
  const cached = towerBuffBadgeTextures.get(kind);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể tạo icon buff cho tower.");

  const color = kind === "damage" ? "#ef4444" : "#22c55e";
  const glow = context.createRadialGradient(64, 64, 7, 64, 64, 61);
  glow.addColorStop(0, `${color}66`);
  glow.addColorStop(0.58, `${color}28`);
  glow.addColorStop(1, `${color}00`);
  context.fillStyle = glow;
  context.fillRect(0, 0, 128, 128);
  context.lineWidth = 8;
  context.strokeStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (kind === "speed") {
    // Gauge: cùng hình bán nguyệt và kim chỉ như icon avatar của Trụ tốc độ.
    context.beginPath();
    context.arc(64, 70, 38, Math.PI * 0.88, Math.PI * 2.12);
    context.stroke();
    context.beginPath();
    context.moveTo(64, 70);
    context.lineTo(88, 46);
    context.stroke();
    context.fillStyle = color;
    context.beginPath();
    context.arc(64, 70, 7, 0, Math.PI * 2);
    context.fill();
  } else {
    // Swords: hai thanh kiếm bắt chéo giống icon avatar của Trụ sát thương.
    for (const mirrored of [false, true]) {
      context.save();
      if (mirrored) {
        context.translate(128, 0);
        context.scale(-1, 1);
      }
      context.beginPath();
      context.moveTo(35, 96);
      context.lineTo(91, 40);
      context.stroke();
      context.beginPath();
      context.moveTo(84, 31);
      context.lineTo(101, 24);
      context.lineTo(94, 41);
      context.stroke();
      context.beginPath();
      context.moveTo(28, 79);
      context.lineTo(47, 98);
      context.stroke();
      context.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  towerBuffBadgeTextures.set(kind, texture);
  return texture;
}

/** Đồng bộ các icon buff nhận được, đặt thành một hàng ngay dưới nhãn level. */
function syncTowerBuffBadges(group: THREE.Group, tower: Tower) {
  const buffs: Array<"damage" | "speed"> = [];
  if (!isSupportTowerKind(tower.kind)) {
    for (const kind of ["damage", "speed"] as const) {
      if (!canTowerReceiveSupportBuff(tower.kind, kind)) continue;

      const receivesBuff = props.towers.some((support) => {
        if (support.kind !== kind || support.id === tower.id) return false;
        return (
          Math.hypot(support.x - tower.x, support.y - tower.y) <=
          TOWER_DEFINITIONS[kind].range
        );
      });
      if (receivesBuff) buffs.push(kind);
    }
  }

  let badges = group.getObjectByName("towerBuffBadges") as
    | THREE.Group
    | undefined;
  const buffKey = buffs.join(":");
  if (badges?.userData.buffKey !== buffKey) {
    if (badges) disposeObject(badges);
    badges = new THREE.Group();
    badges.name = "towerBuffBadges";
    badges.userData.buffKey = buffKey;
    buffs.forEach((kind, index) => {
      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getTowerBuffBadgeTexture(kind),
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      badge.position.x = (index - (buffs.length - 1) / 2) * 0.2;
      badge.scale.setScalar(0.18);
      badge.renderOrder = 15;
      badges!.add(badge);
    });
    group.add(badges);
  }

  const scale = towerLevelScale(tower.level);
  const localTop = Number(group.userData.towerLocalTop) || 2.1;
  badges.visible = buffs.length > 0;
  badges.position.set(0, localTop + 0.035 / scale, 0);
  badges.scale.setScalar(1 / scale);
}

/** Gắn/cập nhật nhãn level trên đỉnh model và giữ kích thước world ổn định. */
function syncTowerLevelLabel(group: THREE.Group, level: number) {
  let label = group.getObjectByName("towerLevelLabel") as
    | THREE.Sprite
    | undefined;
  if (!label) {
    const previousScale = group.scale.x || 1;
    group.scale.setScalar(1);
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    group.scale.setScalar(previousScale);
    group.userData.towerLocalTop = Number.isFinite(bounds.max.y)
      ? bounds.max.y - group.position.y
      : 2.1;

    label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getTowerLevelLabelTexture(level),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    label.name = "towerLevelLabel";
    label.center.set(0.5, 0);
    label.renderOrder = 14;
    group.add(label);
  }

  const normalizedLevel = Math.max(1, Math.round(level));
  if (label.userData.level !== normalizedLevel) {
    (label.material as THREE.SpriteMaterial).map =
      getTowerLevelLabelTexture(normalizedLevel);
    (label.material as THREE.SpriteMaterial).needsUpdate = true;
    label.userData.level = normalizedLevel;
  }

  const scale = towerLevelScale(normalizedLevel);
  const localTop = Number(group.userData.towerLocalTop) || 2.1;
  label.position.set(0, localTop + 0.13 / scale, 0);
  label.scale.set(0.62 / scale, 0.23 / scale, 1 / scale);
}

/** Áp scale level và bù trục Y cho một model tower. */
function setTowerScale(
  group: THREE.Group,
  level: number,
) {
  group.scale.setScalar(towerLevelScale(level));
}

/** Bật/tắt chi tiết nâng cấp tĩnh dựa trên kind và level hiện tại. */
function applyTowerLevelAppearance(group: THREE.Group, tower: Tower) {
  const previous = group.getObjectByName("towerLevelEffect");
  if (previous) disposeObject(previous);
  // Level đã được thể hiện bằng model và nhãn LV; không thêm vòng quay,
  // tinh thể hoặc hạt bay trang trí quanh tower nữa.
  return;
  const effect = new THREE.Group();
  effect.name = "towerLevelEffect";
  effect.userData.kind = tower.kind;
  if (tower.level === 1) {
    group.add(effect);
    return;
  }
  const colors: Record<TowerKind, number> = {
    archer: 0x86e45c,
    cannon: 0xffa53b,
    frost: 0x6cecff,
    fire: 0xff5438,
    thunder: 0x9b7cff,
    water: 0x38bdf8,
    speed: 0x22c55e,
    damage: 0xef4444,
  };
  const accentColors: Record<TowerKind, number> = {
    archer: 0xeaffb8,
    cannon: 0xffe08a,
    frost: 0xe8fdff,
    fire: 0xffd45c,
    thunder: 0xe9ddff,
    water: 0xe0f7ff,
    speed: 0xbbf7d0,
    damage: 0xfecaca,
  };
  const effectMaterial = (opacity: number) =>
    new THREE.MeshBasicMaterial({
      color: colors[tower.kind],
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });

  // Mỗi cấp thêm một lớp kiến trúc cố định, giúp nhận biết level ngay cả khi
  // tower đang không tấn công và các particle nằm ngoài góc camera.
  const baseBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.035, 7, 36),
    effectMaterial(0.88),
  );
  baseBand.name = "levelFxBaseBand";
  baseBand.rotation.x = Math.PI / 2;
  baseBand.position.y = 0.16;
  effect.add(baseBand);

  // Ấn cấp và hào quang tồn tại vĩnh viễn, giúp phân biệt level 2/3 cả khi
  // tháp đang đứng yên. Số tinh thể tương ứng trực tiếp với cấp hiện tại.
  const levelAura = new THREE.Mesh(
    new THREE.RingGeometry(0.5, tower.level >= 3 ? 0.59 : 0.56, 48),
    effectMaterial(tower.level >= 3 ? 0.52 : 0.34),
  );
  levelAura.name = "levelFxAura";
  levelAura.rotation.x = -Math.PI / 2;
  levelAura.position.y = 0.08;
  effect.add(levelAura);
  for (let index = 0; index < tower.level; index++) {
    const badge = new THREE.Mesh(
      new THREE.OctahedronGeometry(tower.level >= 3 ? 0.075 : 0.06, 0),
      new THREE.MeshBasicMaterial({
        color: colors[tower.kind],
        transparent: true,
        opacity: tower.level >= 3 ? 1 : 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    badge.name = "levelFxBadge";
    badge.userData.index = index;
    badge.userData.count = tower.level;
    effect.add(badge);

    const badgeGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getFrostGlowTexture(),
        color: colors[tower.kind],
        transparent: true,
        opacity: tower.level >= 3 ? 0.55 : 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    badgeGlow.name = "levelFxBadgeGlow";
    badgeGlow.userData.index = index;
    badgeGlow.userData.count = tower.level;
    badgeGlow.scale.setScalar(tower.level >= 3 ? 0.28 : 0.22);
    effect.add(badgeGlow);
  }
  const wispCount = tower.level >= 3 ? 9 : 5;
  for (let index = 0; index < wispCount; index++) {
    const wisp = new THREE.Mesh(
      new THREE.OctahedronGeometry(index % 3 === 0 ? 0.022 : 0.015, 0),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? colors[tower.kind] : accentColors[tower.kind],
        transparent: true,
        opacity: index % 3 === 0 ? 0.92 : 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    wisp.name = "levelFxWisp";
    wisp.userData.index = index;
    wisp.userData.count = wispCount;
    wisp.userData.phase = (index / wispCount) * Math.PI * 2;
    effect.add(wisp);

    const wispGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getFrostGlowTexture(),
        color: index % 2 ? colors[tower.kind] : accentColors[tower.kind],
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    wispGlow.name = "levelFxWispGlow";
    wispGlow.userData.index = index;
    wispGlow.userData.phase = wisp.userData.phase;
    wispGlow.scale.setScalar(index % 3 === 0 ? 0.15 : 0.11);
    effect.add(wispGlow);

    const trail = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 6, 5),
      new THREE.MeshBasicMaterial({
        color: accentColors[tower.kind],
        transparent: true,
        opacity: tower.level >= 3 ? 0.42 : 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    trail.name = "levelFxWispTrail";
    trail.userData.index = index;
    trail.userData.phase = wisp.userData.phase;
    effect.add(trail);
  }
  if (tower.level >= 3) {
    const upperBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 7, 36),
      effectMaterial(0.92),
    );
    upperBand.name = "levelFxUpperBand";
    upperBand.rotation.x = Math.PI / 2;
    upperBand.position.y = 0.34;
    effect.add(upperBand);
    for (let index = 0; index < 4; index++) {
      const crest = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.065, 0),
        effectMaterial(0.96),
      );
      const angle = (index * Math.PI) / 2;
      crest.name = "levelFxCrest";
      crest.userData.index = index;
      crest.position.set(Math.cos(angle) * 0.39, 0.38, Math.sin(angle) * 0.39);
      crest.scale.y = 1.65;
      effect.add(crest);
    }
  }

  if (tower.kind === "archer") {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.014, 6, 40),
      effectMaterial(0.55),
    );
    orbit.name = "levelFxOrbit";
    orbit.rotation.x = Math.PI / 2;
    orbit.position.y = 0.22;
    effect.add(orbit);
    if (tower.level >= 3) {
      const crown = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.018, 6, 32),
        effectMaterial(0.72),
      );
      crown.name = "levelFxCrown";
      crown.rotation.x = Math.PI / 2;
      crown.position.y = 1.55;
      effect.add(crown);
      for (let index = 0; index < 3; index++) {
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.035, 0.16, 5),
          effectMaterial(0.82),
        );
        const angle = (index / 3) * Math.PI * 2;
        arrow.name = "levelFxArrow";
        arrow.userData.angle = angle;
        arrow.userData.index = index;
        effect.add(arrow);
      }
    }
  } else if (tower.kind === "cannon") {
    const ringCount = tower.level >= 3 ? 2 : 1;
    for (let index = 0; index < ringCount; index++) {
      const chargeRing = new THREE.Mesh(
        new THREE.RingGeometry(0.4 + index * 0.14, 0.45 + index * 0.14, 40),
        effectMaterial(0.42 - index * 0.08),
      );
      chargeRing.name = "levelFxCharge";
      chargeRing.userData.index = index;
      chargeRing.rotation.x = -Math.PI / 2;
      chargeRing.position.y = 0.13;
      effect.add(chargeRing);
    }
    if (tower.level >= 3) {
      for (let index = 0; index < 4; index++) {
        const ember = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.025, 0),
          effectMaterial(0.78),
        );
        const angle = (index * Math.PI) / 2;
        ember.name = "levelFxEmber";
        ember.userData.angle = angle;
        ember.position.set(
          Math.cos(angle) * 0.42,
          0.35,
          Math.sin(angle) * 0.42,
        );
        effect.add(ember);
      }
    }
  } else if (tower.kind === "frost") {
    const count = tower.level >= 3 ? 6 : 3;
    const ringCount = tower.level >= 3 ? 2 : 1;
    for (let index = 0; index < ringCount; index++) {
      const iceRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.31 + index * 0.13, 0.012, 6, 36),
        effectMaterial(0.4 - index * 0.08),
      );
      iceRing.name = "levelFxIceRing";
      iceRing.userData.index = index;
      iceRing.rotation.x = Math.PI / 2;
      iceRing.position.y = 0.58 + index * 0.28;
      effect.add(iceRing);
    }
    for (let index = 0; index < count; index++) {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.035, 0),
        effectMaterial(0.68),
      );
      const angle = (index / count) * Math.PI * 2;
      shard.name = "levelFxShard";
      shard.userData.angle = angle;
      shard.userData.index = index;
      effect.add(shard);
    }
  } else if (tower.kind === "fire") {
    const count = tower.level >= 3 ? 6 : 3;
    const ringCount = tower.level >= 3 ? 2 : 1;
    for (let index = 0; index < ringCount; index++) {
      const fireRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.3 + index * 0.14, 0.016, 6, 36),
        effectMaterial(0.48 - index * 0.09),
      );
      fireRing.name = "levelFxFireRing";
      fireRing.userData.index = index;
      fireRing.rotation.x = Math.PI / 2;
      fireRing.position.y = 0.34 + index * 0.32;
      effect.add(fireRing);
    }
    for (let index = 0; index < count; index++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.14, 6),
        effectMaterial(0.58),
      );
      const angle = (index / count) * Math.PI * 2;
      flame.name = "levelFxFlame";
      flame.userData.angle = angle;
      flame.userData.index = index;
      effect.add(flame);
    }
  } else {
    const count = tower.level >= 3 ? 8 : 4;
    const ringCount = tower.level >= 3 ? 2 : 1;
    for (let index = 0; index < ringCount; index++) {
      const electricRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.31 + index * 0.13, 0.013, 6, 36),
        effectMaterial(0.52 - index * 0.1),
      );
      electricRing.name = "levelFxIceRing";
      electricRing.userData.index = index;
      electricRing.rotation.x = Math.PI / 2;
      electricRing.position.y = 0.62 + index * 0.3;
      effect.add(electricRing);
    }
    for (let index = 0; index < count; index++) {
      const spark = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.036, 0),
        effectMaterial(0.8),
      );
      const angle = (index / count) * Math.PI * 2;
      spark.name = "levelFxShard";
      spark.userData.angle = angle;
      spark.userData.index = index;
      effect.add(spark);
    }
  }
  group.add(effect);
}

/** Animate các chi tiết nâng cấp phát sáng mà không tạo thêm object mỗi frame. */
function animateTowerLevelAppearance(
  model: THREE.Group,
  tower: Tower,
  elapsed: number,
) {
  const effect = model.getObjectByName("towerLevelEffect") as
    THREE.Group | undefined;
  if (!effect) return;
  effect.children.forEach((child) => {
    if (child.name === "levelFxOrbit") child.rotation.z = elapsed * 0.7;
    else if (child.name === "levelFxBaseBand") {
      const pulse = 1 + Math.sin(elapsed * 2.2 + tower.id) * 0.018;
      child.scale.setScalar(pulse);
    } else if (child.name === "levelFxAura") {
      child.rotation.z = elapsed * (tower.level >= 3 ? 0.8 : 0.45);
      child.scale.setScalar(1 + Math.sin(elapsed * 3 + tower.id) * 0.055);
    } else if (child.name === "levelFxBadge") {
      const index = Number(child.userData.index);
      const count = Number(child.userData.count);
      const angle =
        (index / count) * Math.PI * 2 -
        elapsed * (tower.level >= 3 ? 0.9 : 0.62);
      const radius = tower.level >= 3 ? 0.54 : 0.48;
      child.position.set(
        Math.cos(angle) * radius,
        0.52 + Math.sin(elapsed * 3.2 + index * 2.1) * 0.09,
        Math.sin(angle) * radius,
      );
      child.rotation.x = elapsed * 1.4 + index;
      child.rotation.y = elapsed * 2 + index;
      const shimmer = 1 + Math.sin(elapsed * 6 + index * 2.4) * 0.22;
      child.scale.setScalar(shimmer);
    } else if (child.name === "levelFxBadgeGlow") {
      const index = Number(child.userData.index);
      const count = Number(child.userData.count);
      const angle =
        (index / count) * Math.PI * 2 -
        elapsed * (tower.level >= 3 ? 0.9 : 0.62);
      const radius = tower.level >= 3 ? 0.54 : 0.48;
      child.position.set(
        Math.cos(angle) * radius,
        0.52 + Math.sin(elapsed * 3.2 + index * 2.1) * 0.09,
        Math.sin(angle) * radius,
      );
      const glowScale =
        (tower.level >= 3 ? 0.29 : 0.23) *
        (1 + Math.sin(elapsed * 5.5 + index) * 0.16);
      child.scale.set(glowScale, glowScale, 1);
    } else if (child.name === "levelFxWisp") {
      const index = Number(child.userData.index);
      const phase = Number(child.userData.phase);
      const layer = index % 3;
      const direction = layer === 1 ? -1 : 1;
      const angle = phase + elapsed * direction * (0.55 + layer * 0.17);
      const radius =
        0.38 + layer * 0.105 + Math.sin(elapsed * 1.8 + phase) * 0.035;
      const baseY = 0.38 + layer * 0.3;
      child.position.set(
        Math.cos(angle) * radius,
        baseY + Math.sin(elapsed * (1.9 + layer * 0.25) + phase * 2) * 0.14,
        Math.sin(angle) * radius,
      );
      child.scale.setScalar(
        0.72 + Math.sin(elapsed * 7 + index) * 0.25 + (tower.level - 2) * 0.18,
      );
      child.rotation.x = elapsed * (2.6 + layer * 0.4) + phase;
      child.rotation.y = -elapsed * 3.2 + index;
    } else if (
      child.name === "levelFxWispGlow" ||
      child.name === "levelFxWispTrail"
    ) {
      const index = Number(child.userData.index);
      const phase = Number(child.userData.phase);
      const layer = index % 3;
      const direction = layer === 1 ? -1 : 1;
      const angle = phase + elapsed * direction * (0.55 + layer * 0.17);
      const radius =
        0.38 + layer * 0.105 + Math.sin(elapsed * 1.8 + phase) * 0.035;
      const baseY = 0.38 + layer * 0.3;
      const y =
        baseY + Math.sin(elapsed * (1.9 + layer * 0.25) + phase * 2) * 0.14;
      if (child.name === "levelFxWispGlow") {
        child.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        );
        const glowSize =
          (index % 3 === 0 ? 0.16 : 0.115) *
          (1 +
            Math.sin(elapsed * 6.5 + index) * 0.18 +
            (tower.level - 2) * 0.12);
        child.scale.set(glowSize, glowSize, 1);
      } else {
        const trailingAngle = angle - direction * 0.075;
        child.position.set(
          Math.cos(trailingAngle) * radius,
          y - 0.012,
          Math.sin(trailingAngle) * radius,
        );
        child.rotation.y = -trailingAngle;
        const trailPulse = 1 + Math.sin(elapsed * 5.2 + index) * 0.2;
        child.scale.set(
          0.55 * trailPulse,
          0.55 * trailPulse,
          (tower.level >= 3 ? 3.2 : 2.5) * trailPulse,
        );
      }
    } else if (child.name === "levelFxUpperBand")
      child.rotation.z = -elapsed * 0.32;
    else if (child.name === "levelFxCrest") {
      const index = Number(child.userData.index);
      child.rotation.y = elapsed * 1.2 + index;
      child.position.y = 0.38 + Math.sin(elapsed * 2.8 + index) * 0.025;
    } else if (child.name === "levelFxCrown") {
      child.rotation.z = -elapsed;
      child.position.y = 1.55 + Math.sin(elapsed * 2.4) * 0.025;
    } else if (child.name === "levelFxArrow") {
      const index = Number(child.userData.index);
      const angle = Number(child.userData.angle) - elapsed * 0.8;
      child.position.set(
        Math.cos(angle) * 0.31,
        1.28 + Math.sin(elapsed * 3 + index) * 0.06,
        Math.sin(angle) * 0.31,
      );
      child.rotation.y = -angle;
    } else if (child.name === "levelFxCharge") {
      const index = Number(child.userData.index);
      const pulse =
        1 + Math.sin(elapsed * (3.4 + index * 0.5) + tower.id) * 0.07;
      child.scale.setScalar(pulse);
      child.rotation.z = elapsed * (index ? -0.45 : 0.35);
    } else if (child.name === "levelFxEmber") {
      const angle = Number(child.userData.angle) + elapsed * 0.75;
      child.position.set(
        Math.cos(angle) * 0.42,
        0.34 + Math.sin(elapsed * 3 + angle) * 0.08,
        Math.sin(angle) * 0.42,
      );
    } else if (child.name === "levelFxShard") {
      const index = Number(child.userData.index);
      const angle = Number(child.userData.angle) + elapsed * 0.62;
      child.position.set(
        Math.cos(angle) * 0.4,
        0.72 + Math.sin(elapsed * 2.2 + index) * 0.12,
        Math.sin(angle) * 0.4,
      );
      child.rotation.y = elapsed * 1.8 + index;
    } else if (child.name === "levelFxIceRing") {
      const index = Number(child.userData.index);
      child.rotation.z = elapsed * (index ? -0.42 : 0.55);
      child.scale.setScalar(1 + Math.sin(elapsed * 2.5 + index) * 0.035);
    } else if (child.name === "levelFxFlame") {
      const index = Number(child.userData.index);
      const angle = Number(child.userData.angle) + elapsed * 0.48;
      child.position.set(
        Math.cos(angle) * 0.36,
        0.48 + Math.sin(elapsed * 4.2 + index) * 0.1,
        Math.sin(angle) * 0.36,
      );
      child.scale.y = 0.8 + Math.sin(elapsed * 6 + index) * 0.25;
    } else if (child.name === "levelFxFireRing") {
      const index = Number(child.userData.index);
      child.rotation.z = elapsed * (index ? -1.05 : 0.8);
      child.scale.setScalar(1 + Math.sin(elapsed * 4 + index) * 0.05);
    }
  });
}

/** Tạo tia điện nhiều lớp; level cao có thêm lớp để tia dày rõ trên WebGL. */
function createThunderBeamEffect(level: number) {
  const effect = new THREE.Group();
  effect.name = "thunderBeamEffect";
  effect.visible = false;
  effect.userData.targets = [] as THREE.Group[];
  effect.userData.segmentStarts = Array.from(
    { length: 5 },
    () => new THREE.Vector3(),
  );
  effect.userData.segmentEnds = Array.from(
    { length: 5 },
    () => new THREE.Vector3(),
  );
  const layerRadius = THREE.MathUtils.clamp(Math.round(level) + 1, 2, 4);
  const layerSpacing = level === 1 ? 0.019 : level === 2 ? 0.021 : 0.023;
  for (let segmentIndex = 0; segmentIndex < 5; segmentIndex++) {
    for (let lane = -layerRadius; lane <= layerRadius; lane++) {
      const positions = new Float32Array(10 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const core = lane === 0;
      const innerGlow = Math.abs(lane) === 1;
      const material = new THREE.LineBasicMaterial({
        color: core ? 0xffffff : innerGlow ? 0xc4b5fd : 0x7c3aed,
        transparent: true,
        opacity: core ? 1 : innerGlow ? 0.58 : 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const beam = new THREE.Line(geometry, material);
      beam.name = "thunderChainBeam";
      beam.userData.segmentIndex = segmentIndex;
      beam.userData.lane = lane;
      beam.userData.layerSpacing = layerSpacing;
      beam.frustumCulled = false;
      beam.renderOrder = core ? 11 : 10;
      effect.add(beam);
    }
    for (
      let branchIndex = 0;
      branchIndex < Math.min(4, level + 1);
      branchIndex++
    ) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(5 * 3), 3),
      );
      const material = new THREE.LineBasicMaterial({
        color: branchIndex ? 0x8b5cf6 : 0xc4b5fd,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const branch = new THREE.Line(geometry, material);
      branch.name = "thunderBranchBeam";
      branch.userData.segmentIndex = segmentIndex;
      branch.userData.branchIndex = branchIndex;
      branch.frustumCulled = false;
      branch.renderOrder = 9;
      effect.add(branch);
    }
  }
  return effect;
}

/** Clone đúng template tower, bind node điều khiển và thêm instance vào scene. */
function createTowerModel(tower: Tower) {
  const template =
    towerModelLibrary?.get(tower.kind, tower.level) ??
    towerTemplates.get(tower.kind);
  if (!template) throw new Error(`Missing tower template: ${tower.kind}`);
  const group = template.clone(true);
  bindTowerParts(group);
  setTowerScale(group, tower.level);
  applyTowerLevelAppearance(group, tower);
  syncTowerLevelLabel(group, tower.level);
  syncTowerBuffBadges(group, tower);
  if (tower.kind === "thunder")
    group.add(createThunderBeamEffect(tower.level));
  group.position.copy(worldPosition(tower.x, tower.y));
  group.position.y = 0.05;
  group.userData.shotSequence = tower.shotSequence;
  group.userData.firedAt = 0;
  group.userData.level = tower.level;
  scene!.add(group);
  return group;
}

/** Dispose effect sở hữu riêng nhưng giữ geometry/material dùng chung từ template. */
function disposeTowerModel(model: THREE.Group) {
  for (const name of [
    "towerLevelEffect",
    "thunderBeamEffect",
    "towerLevelLabel",
    "towerBuffBadges",
  ]) {
    const ownedEffect = model.getObjectByName(name);
    if (ownedEffect) disposeObject(ownedEffect);
  }
  disposeObject(model, false);
}

/** Tạo burst ngắn tại tower vừa lên cấp và lưu thời điểm sinh để tự hủy. */
function createTowerUpgradeEffect(tower: Tower, now: number) {
  const existing = towerUpgradeEffects.get(tower.id);
  if (existing) disposeObject(existing.group);
  const group = new THREE.Group();
  group.position.copy(worldPosition(tower.x, tower.y));
  group.position.y = 0.1;
  const colors: Record<TowerKind, number> = {
    archer: 0x8ee85e,
    cannon: 0xffa83d,
    frost: 0x6ee7ff,
    fire: 0xff593d,
    thunder: 0xa78bfa,
    water: 0x38bdf8,
    speed: 0x22c55e,
    damage: 0xef4444,
  };
  const material = (opacity = 0.9) =>
    new THREE.MeshBasicMaterial({
      color: colors[tower.kind],
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  const accentColor = new THREE.Color(colors[tower.kind])
    .lerp(new THREE.Color(0xffffff), 0.62)
    .getHex();

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.42, 2.4, 24, 1, true),
    material(0.3),
  );
  beam.name = "upgradeBeam";
  beam.position.y = 1.05;
  group.add(beam);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 18, 12),
    material(0.95),
  );
  flash.name = "upgradeFlash";
  flash.position.y = 0.78;
  group.add(flash);
  for (let index = 0; index < 3; index++) {
    const shockwave = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.31, 48),
      material(0.88 - index * 0.16),
    );
    shockwave.name = "upgradeShockwave";
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.y = 0.08;
    shockwave.userData.delay = index * 0.14;
    group.add(shockwave);
  }

  // Glow mềm nhiều lớp làm burst có chiều sâu thay vì chỉ là geometry cứng.
  for (let index = 0; index < 2; index++) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getFrostGlowTexture(),
        color: index === 0 ? colors[tower.kind] : accentColor,
        transparent: true,
        opacity: index === 0 ? 0.72 : 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    halo.name = "upgradeHalo";
    halo.position.y = 0.65 + index * 0.56;
    halo.scale.setScalar(0.72 + index * 0.22);
    halo.userData.delay = index * 0.09;
    halo.userData.baseScale = 0.72 + index * 0.22;
    group.add(halo);
  }

  // Các dải sáng dựng đứng bay lên quanh thân tower.
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    const ray = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getFrostGlowTexture(),
        color: index % 2 ? accentColor : colors[tower.kind],
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    ray.name = "upgradeRay";
    ray.position.set(Math.cos(angle) * 0.34, 0.42, Math.sin(angle) * 0.34);
    ray.scale.set(0.15, 0.74, 1);
    ray.userData.angle = angle;
    ray.userData.delay = index * 0.025;
    group.add(ray);
  }

  // Kim tuyến bắn ra, xoáy nhẹ rồi bay lên. Giảm số lượng khi scene đang nặng.
  const sparkleCount = performanceMode ? 9 : tower.level >= 3 ? 18 : 14;
  for (let index = 0; index < sparkleCount; index++) {
    const angle = (index / sparkleCount) * Math.PI * 2;
    const sparkle = new THREE.Mesh(
      new THREE.OctahedronGeometry(index % 4 === 0 ? 0.045 : 0.027, 0),
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xffffff : accentColor,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    sparkle.name = "upgradeSparkle";
    sparkle.userData.angle = angle;
    sparkle.userData.radius = 0.18 + (index % 4) * 0.055;
    sparkle.userData.baseY = 0.12 + (index % 5) * 0.1;
    sparkle.userData.delay = (index % 6) * 0.035;
    sparkle.position.set(
      Math.cos(angle) * sparkle.userData.radius,
      sparkle.userData.baseY,
      Math.sin(angle) * sparkle.userData.radius,
    );
    group.add(sparkle);
  }

  for (let index = 0; index < 2; index++) {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.42 + index * 0.1, 0.012, 5, 52),
      new THREE.MeshBasicMaterial({
        color: index ? accentColor : colors[tower.kind],
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    orbit.name = "upgradeOrbit";
    orbit.position.y = 0.48 + index * 0.34;
    orbit.rotation.set(Math.PI / 2.5, index ? -0.65 : 0.55, index * 0.8);
    orbit.userData.direction = index ? -1 : 1;
    group.add(orbit);
  }

  if (tower.kind === "archer") {
    for (let index = 0; index < 3; index++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38 + index * 0.1, 0.018, 6, 40),
        material(0.72 - index * 0.12),
      );
      ring.name = "upgradeRing";
      ring.rotation.set(Math.PI / 2, index * 0.5, index * 0.35);
      ring.userData.delay = index * 0.08;
      group.add(ring);
    }
  } else if (tower.kind === "cannon") {
    for (let index = 0; index < 2; index++) {
      const wave = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.34, 48),
        material(0.82 - index * 0.18),
      );
      wave.name = "upgradeWave";
      wave.rotation.x = -Math.PI / 2;
      wave.position.y = 0.02;
      wave.userData.delay = index * 0.18;
      group.add(wave);
    }
  } else if (tower.kind === "frost") {
    for (let index = 0; index < 8; index++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.07, 0),
        material(0.88),
      );
      const angle = (index / 8) * Math.PI * 2;
      crystal.name = "upgradeCrystal";
      crystal.userData.angle = angle;
      crystal.position.set(
        Math.cos(angle) * 0.28,
        0.38,
        Math.sin(angle) * 0.28,
      );
      group.add(crystal);
    }
  } else if (tower.kind === "speed" || tower.kind === "damage") {
    for (let index = 0; index < 3; index++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3 + index * 0.11, 0.016, 6, 40),
        material(0.76 - index * 0.14),
      );
      ring.name = "upgradeRing";
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.18 + index * 0.2;
      ring.userData.delay = index * 0.08;
      group.add(ring);
    }
  } else {
    for (let index = 0; index < 7; index++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.22, 7),
        material(0.86),
      );
      const angle = (index / 7) * Math.PI * 2;
      flame.name = "upgradeFlame";
      flame.userData.angle = angle;
      flame.position.set(Math.cos(angle) * 0.25, 0.16, Math.sin(angle) * 0.25);
      group.add(flame);
    }
  }
  group.renderOrder = 8;
  scene!.add(group);
  towerUpgradeEffects.set(tower.id, { group, bornAt: now, kind: tower.kind });
}

/** Cập nhật tiến trình, opacity và giải phóng các effect nâng cấp đã kết thúc. */
function syncTowerUpgradeEffects(now: number) {
  for (const [towerId, effect] of towerUpgradeEffects) {
    const progress = (now - effect.bornAt) / 1850;
    if (progress >= 1) {
      disposeObject(effect.group);
      towerUpgradeEffects.delete(towerId);
      continue;
    }
    const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.45, 1);
    effect.group.children.forEach((child, index) => {
      const item = child as THREE.Mesh;
      const itemMaterial = item.material as THREE.MeshBasicMaterial;
      itemMaterial.opacity = fade * (0.7 + (index % 3) * 0.1);
      if (item.name === "upgradeBeam") {
        item.scale.set(1 + progress * 1.5, 1, 1 + progress * 1.5);
        itemMaterial.opacity = fade * 0.34;
        item.rotation.y += 0.035;
      } else if (item.name === "upgradeFlash") {
        const burst = Math.sin(Math.min(1, progress * 2.2) * Math.PI);
        item.scale.setScalar(0.3 + burst * 2.5);
        itemMaterial.opacity = fade * 0.82;
      } else if (item.name === "upgradeShockwave") {
        const local = Math.max(0, progress - Number(item.userData.delay));
        item.scale.setScalar(0.35 + local * 4.2);
        itemMaterial.opacity = local > 0 ? fade * 0.72 : 0;
      } else if (item.name === "upgradeHalo") {
        const local = Math.max(0, progress - Number(item.userData.delay));
        const pulse = Math.sin(Math.min(1, local * 1.7) * Math.PI);
        const scale = Number(item.userData.baseScale) * (0.55 + pulse * 1.5);
        item.scale.setScalar(scale);
        itemMaterial.opacity = local > 0 ? fade * pulse * 0.7 : 0;
        item.rotation.z += 0.012 * (index % 2 ? -1 : 1);
      } else if (item.name === "upgradeRay") {
        const local = Math.max(0, progress - Number(item.userData.delay));
        const pulse = Math.sin(Math.min(1, local * 1.45) * Math.PI);
        const angle = Number(item.userData.angle) + progress * 0.7;
        const radius = 0.34 + local * 0.18;
        item.position.set(
          Math.cos(angle) * radius,
          0.42 + local * 0.78,
          Math.sin(angle) * radius,
        );
        item.scale.set(0.12 + pulse * 0.1, 0.55 + pulse * 0.7, 1);
        itemMaterial.opacity = local > 0 ? fade * pulse * 0.48 : 0;
      } else if (item.name === "upgradeSparkle") {
        const delay = Number(item.userData.delay);
        const local = THREE.MathUtils.clamp(
          (progress - delay) / Math.max(0.01, 1 - delay),
          0,
          1,
        );
        const sparkle = Math.sin(local * Math.PI);
        const angle = Number(item.userData.angle) + local * 1.35;
        const radius = Number(item.userData.radius) + local * 0.48;
        item.position.set(
          Math.cos(angle) * radius,
          Number(item.userData.baseY) + local * 1.42,
          Math.sin(angle) * radius,
        );
        item.rotation.x += 0.08 + (index % 3) * 0.02;
        item.rotation.y += 0.11;
        item.scale.setScalar(0.35 + sparkle * 1.45);
        itemMaterial.opacity = local > 0 ? fade * sparkle : 0;
      } else if (item.name === "upgradeOrbit") {
        const pulse = Math.sin(progress * Math.PI);
        const direction = Number(item.userData.direction);
        item.rotation.x += 0.018 * direction;
        item.rotation.y += 0.026 * direction;
        item.rotation.z += 0.038 * direction;
        item.scale.setScalar(0.72 + pulse * 0.72);
        itemMaterial.opacity = fade * pulse * 0.78;
      } else if (item.name === "upgradeRing") {
        const local = Math.max(0, progress - Number(item.userData.delay));
        item.scale.setScalar(0.55 + local * 1.5);
        item.rotation.z += 0.045 + index * 0.012;
      } else if (item.name === "upgradeWave") {
        const local = Math.max(0, progress - Number(item.userData.delay));
        item.scale.setScalar(0.45 + local * 3.1);
      } else if (item.name === "upgradeCrystal") {
        const angle = Number(item.userData.angle);
        const radius = 0.28 + progress * 0.68;
        item.position.set(
          Math.cos(angle) * radius,
          0.38 + Math.sin(progress * Math.PI) * 0.8,
          Math.sin(angle) * radius,
        );
        item.rotation.y += 0.09;
      } else if (item.name === "upgradeFlame") {
        const angle = Number(item.userData.angle);
        const radius = 0.25 + progress * 0.55;
        item.position.set(
          Math.cos(angle) * radius,
          0.16 + progress * 1.15,
          Math.sin(angle) * radius,
        );
        item.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.8);
      }
    });
  }
}

/** Gỡ preview xây dựng và dispose material trong suốt được clone riêng. */
function removeTowerPreview() {
  if (!towerPreviewModel) return;
  towerPreviewModel.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => material.dispose());
  });
  towerPreviewModel.removeFromParent();
  towerPreviewModel = null;
  towerPreviewKind = null;
}

/** Tạo ghost tower bán trong suốt để theo ô hover trước khi đặt công trình. */
function createTowerPreview(kind: TowerKind) {
  removeTowerPreview();
  const template =
    towerModelLibrary?.get(kind, 1) ?? towerTemplates.get(kind);
  if (!template || !scene) return;
  const preview = template.clone(true);
  preview.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
    const makeTransparent = (original: THREE.Material) => {
      const material = original.clone();
      material.onBeforeCompile = original.onBeforeCompile;
      material.customProgramCacheKey = original.customProgramCacheKey;
      material.transparent = true;
      material.opacity = Math.min(material.opacity, 0.42);
      material.depthWrite = false;
      return material;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(makeTransparent)
      : makeTransparent(child.material);
    child.castShadow = false;
    child.receiveShadow = false;
  });
  setTowerScale(preview, 1);
  preview.visible = false;
  preview.renderOrder = 4;
  scene.add(preview);
  towerPreviewModel = preview;
  towerPreviewKind = kind;
}

// ===== Map và lâu đài ========================================================
/** Tải lâu đài theo map hiện tại rồi gắn vào scene nếu component còn tồn tại. */
async function loadCastleModel() {
  try {
    const container = await loadTowerDefenseCastle(props.map);
    if (!scene) {
      disposeObject(container);
      return;
    }
    if (castleModel) disposeObject(castleModel);
    castleModel = container;
    scene.add(container);
  } catch (error) {
    console.warn(`[Kingdom Defense] Không thể tải lâu đài của map ${props.map.id}.`, error);
  }
}

/** Tải layer nền tùy chọn và đồng bộ trạng thái bật/tắt từ HUD. */
async function loadMapBackgroundModel() {
  if (!scene) return;
  const layer = await loadTowerDefenseBackgroundModel(
    scene,
    props.map,
    tileMeshes,
  );
  if (!layer || !host.value?.isConnected) return;
  mapBackgroundLayer = layer;
  layer.setVisible(props.showBrickBackground);
}

// ===== Đồng bộ state gameplay sang Three.js mỗi frame =======================
/**
 * Đồng bộ snapshot gameplay sang object Three.js: tạo/xóa instance, nội suy
 * chuyển động, animate tower/enemy/projectile/impact và cập nhật selection.
 * Hàm không thay đổi HP, cooldown hay luật spawn.
 */
function syncScene(elapsed: number, frameDelta: number, now: number) {
  // Tower: đối chiếu ID để tái sử dụng instance, cập nhật level, selection,
  // hướng turret và các animation khai hỏa/recoil theo snapshot hiện tại.
  if (!scene) return;
  const sceneLoad =
    props.towers.length + props.enemies.length + props.projectiles.length;
  // Khi đã hạ chất lượng trong một wave thì giữ nguyên đến giờ nghỉ. Việc đổi
  // shadow/pixel buffer qua lại lúc quân số dao động gây khựng GPU rõ rệt.
  const shouldReduceEffects = performanceMode
    ? props.phase === "wave" || sceneLoad >= 16
    : sceneLoad > 22;
  if (renderer && shouldReduceEffects !== performanceMode) {
    performanceMode = shouldReduceEffects;
    renderer.shadowMap.enabled = !performanceMode;
    renderer.shadowMap.needsUpdate = !performanceMode;
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, performanceMode ? 1 : 1.5),
    );
  }
  if (mysticParticles) {
    mysticParticles.visible = !performanceMode;
    if (mysticParticles.visible) {
      const positions = mysticParticles.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const baseY = mysticParticles.userData.baseY as Float32Array;
      for (let index = 0; index < positions.count; index++)
        positions.setY(
          index,
          baseY[index]! + Math.sin(elapsed * 0.85 + index * 1.73) * 0.075,
        );
      positions.needsUpdate = true;
    }
  }
  updateSpawnPortal?.(elapsed);
  const selectedTower = props.towers.find(
    (tower) => tower.id === props.selectedTowerId,
  );
  const hovered = hoverMarker?.userData.hoveredCell as
    { x: number; y: number } | undefined;
  const hoveredIsPath = hovered
    ? defensePathTileSet.has(`${hovered.x}:${hovered.y}`)
    : false;
  const hoveredHasTower = hovered
    ? props.towers.some(
        (tower) => tower.x === hovered.x && tower.y === hovered.y,
      )
    : false;
  const canPreviewMove = Boolean(
    selectedTower &&
    hovered &&
    selectedTower.canRelocate &&
    props.phase !== "wave" &&
    props.phase !== "gameover" && props.phase !== "completed" &&
    !hoveredIsPath &&
    !hoveredHasTower,
  );
  const selectedPreviewCell = canPreviewMove ? hovered : selectedTower;
  if (props.selectedKind !== towerPreviewKind) {
    if (props.selectedKind) createTowerPreview(props.selectedKind);
    else removeTowerPreview();
  }
  if (towerPreviewModel) {
    const canPlacePreview = Boolean(
      hovered &&
      !hoveredIsPath &&
      !hoveredHasTower &&
      props.phase !== "gameover" && props.phase !== "completed",
    );
    towerPreviewModel.visible = canPlacePreview;
    if (hovered && canPlacePreview) {
      towerPreviewModel.position.copy(worldPosition(hovered.x, hovered.y));
      towerPreviewModel.position.y = 0.05;
    }
  }
  if (attackRangeMarker) {
    const previewKind = selectedTower?.kind ?? props.selectedKind;
    const placementPreviewCell =
      hovered && !hoveredIsPath && !hoveredHasTower ? hovered : undefined;
    const previewCell =
      props.phase !== "gameover" && props.phase !== "completed" && previewKind
        ? selectedTower
          ? selectedPreviewCell
          : placementPreviewCell
        : undefined;
    attackRangeMarker.visible = Boolean(previewCell && previewKind);
    if (previewCell && previewKind) {
      const definition = TOWER_DEFINITIONS[previewKind];
      const radius = towerRangeAtLevel(definition, selectedTower?.level ?? 1);
      attackRangeMarker.position.copy(
        worldPosition(previewCell.x, previewCell.y),
      );
      attackRangeMarker.position.y = 0.14;
      attackRangeMarker.scale.set(
        radius * DEFENSE_CELL_SIZE,
        1,
        radius * DEFENSE_CELL_SIZE,
      );
      const color =
        previewKind === "frost"
          ? 0x65e6ff
          : previewKind === "fire"
            ? 0xff5a3d
            : 0xffd36a;
      attackRangeMarker.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshBasicMaterial
        )
          child.material.color.setHex(color);
      });
    }
  }
  if (towerFocusMarker) {
    towerFocusMarker.visible = Boolean(selectedTower);
    if (selectedTower) {
      towerFocusMarker.position.copy(
        worldPosition(selectedTower.x, selectedTower.y),
      );
      towerFocusMarker.position.y = 0.12;
      const pulse = 1 + Math.sin(elapsed * 3.2) * 0.025;
      towerFocusMarker.scale.setScalar(pulse);
    }
  }
  if (hoverMarker) {
    const markerCell = selectedPreviewCell ?? hovered;
    hoverMarker.visible = Boolean(markerCell);
    if (markerCell) {
      hoverMarker.position.copy(worldPosition(markerCell.x, markerCell.y));
      hoverMarker.position.y = 0.125;
      const material = hoverMarker.material as THREE.MeshBasicMaterial;
      material.color.setHex(
        canPreviewMove ? 0x7ddc8b : selectedTower ? 0xffd36a : 0xf8edba,
      );
      material.opacity = selectedTower ? 0.42 : 0.25;
    }
  }
  const towerIds = new Set(props.towers.map((item) => item.id));
  for (const [id, model] of towerModels)
    if (!towerIds.has(id)) {
      disposeTowerModel(model);
      towerModels.delete(id);
    }
  for (const tower of props.towers) {
    let model = towerModels.get(tower.id) ?? createTowerModel(tower);
    towerModels.set(tower.id, model);
    const renderedLevel = Number(model.userData.level);
    if (renderedLevel !== tower.level) {
      if (renderedLevel < tower.level) createTowerUpgradeEffect(tower, now);
      if (towerModelLibrary?.has(tower.kind, tower.level)) {
        disposeTowerModel(model);
        model = createTowerModel(tower);
        towerModels.set(tower.id, model);
      } else applyTowerLevelAppearance(model, tower);
    }
    model.userData.level = tower.level;
    const turret = model.userData.turret as THREE.Group | undefined;
    const targetRotation =
      Math.PI / 2 - THREE.MathUtils.degToRad(tower.aimAngle);
    if (turret)
      turret.rotation.y +=
        Math.atan2(
          Math.sin(targetRotation - turret.rotation.y),
          Math.cos(targetRotation - turret.rotation.y),
        ) * 0.14;
    if (model.userData.shotSequence !== tower.shotSequence) {
      model.userData.shotSequence = tower.shotSequence;
      model.userData.firedAt = now;
    }
    const recoilAge = now - Number(model.userData.firedAt);
    const recoil = recoilAge < 220 ? Math.sin((recoilAge / 220) * Math.PI) : 0;
    const towerPosition = worldPosition(tower.x, tower.y);
    model.position.set(towerPosition.x, 0.05, towerPosition.z);
    setTowerScale(model, tower.level);
    syncTowerLevelLabel(model, tower.level);
    syncTowerBuffBadges(model, tower);
    animateTowerLevelAppearance(model, tower, elapsed);
    const aura = model.userData.aura as THREE.Group | undefined;
    if (aura) {
      aura.rotation.y = elapsed * (0.18 + (tower.id % 3) * 0.035);
      aura.position.y = 0.105 + Math.sin(elapsed * 1.8 + tower.id) * 0.008;
    }
    const barrel = model.userData.barrel as THREE.Mesh | undefined;
    const muzzle = model.userData.muzzle as THREE.Mesh | undefined;
    const barrelRig = model.userData.barrelRig as THREE.Group | undefined;
    const muzzleFlash = model.userData.muzzleFlash as THREE.Mesh | undefined;
    const muzzleCharge = model.userData.cannonMuzzleCharge as
      THREE.Group | undefined;
    const barrelUpgradeFx = model.userData.cannonBarrelUpgradeFx as
      THREE.Group | undefined;
    if (barrel) barrel.position.z = 0.38;
    if (muzzle) muzzle.position.z = 0.82;
    if (barrelRig) barrelRig.position.z = -recoil * 0.13;
    if (muzzleFlash) {
      const flash = recoilAge < 70 ? 1 - recoilAge / 70 : 0;
      muzzleFlash.visible = flash > 0;
      muzzleFlash.scale.setScalar(0.45 + flash * 0.9);
    }
    if (muzzleCharge) {
      muzzleCharge.visible = tower.level >= 2;
      if (muzzleCharge.visible) {
        muzzleCharge.children.forEach((child) => {
          const index = Number(child.userData.index);
          if (child.name === "cannonMuzzleRing") {
            child.visible = index === 0 || tower.level >= 3;
            child.rotation.z = elapsed * (index ? -2.1 : 1.6);
            child.scale.setScalar(
              1 +
                Math.sin(elapsed * (5 + index) + tower.id) * 0.1 +
                recoil * 0.28,
            );
          } else if (child.name === "cannonMuzzleSpark") {
            child.visible = index < (tower.level >= 3 ? 8 : 4);
            const angle =
              Number(child.userData.angle) +
              elapsed * (2.8 + (index % 3) * 0.45);
            const flicker = 0.72 + Math.sin(elapsed * 11 + index * 1.7) * 0.28;
            const radius = (tower.level >= 3 ? 0.23 : 0.18) * flicker;
            child.position.set(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              Math.sin(elapsed * 7 + index) * 0.07,
            );
            child.scale.setScalar(0.65 + flicker * 0.65 + recoil * 0.8);
            child.rotation.x = elapsed * 5 + index;
            child.rotation.y = elapsed * 4.2 - index;
          }
        });
      }
    }
    if (barrelUpgradeFx) {
      barrelUpgradeFx.visible = tower.level >= 2;
      if (barrelUpgradeFx.visible) {
        barrelUpgradeFx.children.forEach((child) => {
          const index = Number(child.userData.index);
          if (child.name === "cannonBarrelEnergyBand") {
            child.visible = index < (tower.level >= 3 ? 3 : 2);
            child.rotation.z = elapsed * (index % 2 ? -2.4 : 2) + index;
            const bandPulse =
              1 +
              Math.sin(elapsed * 6 + index * 1.8 + tower.id) * 0.09 +
              recoil * 0.18;
            child.scale.setScalar(bandPulse);
          } else if (child.name === "cannonBarrelArc") {
            child.visible = index < (tower.level >= 3 ? 6 : 4);
            const phase = Number(child.userData.phase);
            const travel =
              (elapsed * (tower.level >= 3 ? 0.9 : 0.68) + index / 6) % 1;
            const angle = phase + elapsed * (tower.level >= 3 ? 3.1 : 2.35);
            const radius = 0.135 + Math.sin(elapsed * 5 + index) * 0.012;
            child.position.set(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              0.12 + travel * 0.68,
            );
            child.rotation.z = -angle;
            child.scale.setScalar(
              0.7 + Math.sin(elapsed * 8 + index * 1.4) * 0.2 + recoil * 0.45,
            );
          }
        });
      }
    }
    const flag = model.userData.flag as THREE.Mesh | undefined;
    if (flag) flag.rotation.z = Math.sin(elapsed * 2.4 + tower.id) * 0.08;
    if (tower.kind === "frost" || tower.kind === "fire") {
      const pulse = 0.5 + Math.sin(elapsed * 3.2 + tower.id) * 0.5;
      const glows = model.userData.frostGlows as THREE.Object3D[];
      glows.forEach((glow) => {
        const glowPulse = 1 + pulse * 0.07 + recoil * 0.16;
        glow.scale.set(
          Number(glow.userData.baseScaleX) * glowPulse,
          Number(glow.userData.baseScaleY) * glowPulse,
          1,
        );
      });
      const energyRings = model.userData.frostEnergyRings as THREE.Mesh[];
      energyRings.forEach((energyRing, index) => {
        const tilt = Number(energyRing.userData.baseTilt);
        energyRing.rotation.x =
          Math.PI / 2 + tilt + Math.sin(elapsed * 0.8 + index) * 0.035;
        energyRing.rotation.z =
          (index ? -1 : 1) * elapsed * (0.32 + index * 0.1);
        energyRing.scale.setScalar(1 + recoil * 0.14 + pulse * 0.025);
      });
      const particles = model.userData.frostParticles as THREE.Mesh[];
      particles.forEach((particle, index) => {
        const angle =
          Number(particle.userData.orbitAngle) +
          elapsed * (0.28 + (index % 3) * 0.035);
        const radius = Number(particle.userData.orbitRadius);
        particle.position.set(
          Math.cos(angle) * radius,
          Number(particle.userData.baseY) +
            Math.sin(elapsed * 1.25 + index) * 0.1,
          Math.sin(angle) * radius,
        );
        particle.rotation.y = elapsed + index;
      });
    }
    if (
      tower.kind === "fire" ||
      tower.kind === "thunder" ||
      tower.kind === "water"
    ) {
      const elementalGlow = model.getObjectByName(
        "elementalTowerGlow",
      ) as THREE.Group | undefined;
      if (elementalGlow) {
        const pulse =
          1 +
          Math.sin(
            elapsed * (tower.kind === "thunder" ? 8.5 : 5.2) + tower.id,
          ) *
            0.12;
        elementalGlow.scale.setScalar(pulse);
        const ring = elementalGlow.getObjectByName("elementalTowerGlowRing");
        if (ring) {
          const direction = tower.kind === "water" ? -1 : 1;
          ring.rotation.z = elapsed * (tower.kind === "thunder" ? 2.8 : 1.25) * direction;
        }
      }
    }
    if (tower.kind === "thunder") {
      const beamEffect = model.getObjectByName("thunderBeamEffect") as
        THREE.Group | undefined;
      if (beamEffect) {
        const targets = beamEffect.userData.targets as THREE.Group[];
        targets.length = 0;
        for (const id of tower.beamTargetIds) {
          const targetModel = enemyScene?.models.get(id);
          if (targetModel) targets.push(targetModel);
        }
        beamEffect.visible = targets.length > 0;
        if (!targets.length) continue;
        model.updateMatrixWorld(true);
        const segmentStarts = beamEffect.userData
          .segmentStarts as THREE.Vector3[];
        const segmentEnds = beamEffect.userData.segmentEnds as THREE.Vector3[];
        const crystalAnchor =
          tower.level === 2
            ? model.getObjectByName("elementalTowerGlow")
            : undefined;
        for (let segmentIndex = 0; segmentIndex < targets.length; segmentIndex++) {
          if (segmentIndex === 0) {
            if (crystalAnchor)
              crystalAnchor.getWorldPosition(thunderStartWorld);
            else {
              thunderStartWorld.set(0, 1.72, 0);
              model.localToWorld(thunderStartWorld);
            }
          } else {
            targets[segmentIndex - 1]!.getWorldPosition(thunderStartWorld);
            thunderStartWorld.y += 0.62;
          }
          targets[segmentIndex]!.getWorldPosition(thunderEndWorld);
          thunderEndWorld.y += 0.62;
          segmentStarts[segmentIndex]!.copy(thunderStartWorld);
          segmentEnds[segmentIndex]!.copy(thunderEndWorld);
          model.worldToLocal(segmentStarts[segmentIndex]!);
          model.worldToLocal(segmentEnds[segmentIndex]!);
        }
        const flickerFrame = Math.floor(elapsed * 26);
        const random = (
          segmentIndex: number,
          pointIndex: number,
          salt: number,
        ) => {
          const value =
            Math.sin(
              (flickerFrame * 17.17 +
                tower.id * 13.13 +
                segmentIndex * 31.7 +
                pointIndex * 7.91 +
                salt) *
                12.9898,
            ) * 43758.5453;
          return (value - Math.floor(value)) * 2 - 1;
        };
        beamEffect.children.forEach((child) => {
          const beam = child as THREE.Line;
          const segmentIndex = Number(beam.userData.segmentIndex);
          const lane = Number(beam.userData.lane);
          const layerSpacing = Number(beam.userData.layerSpacing) || 0.019;
          const branchIndex = Number(beam.userData.branchIndex);
          const targetModel = targets[segmentIndex];
          beam.visible = Boolean(targetModel);
          if (!targetModel) return;
          const start = segmentStarts[segmentIndex]!;
          const end = segmentEnds[segmentIndex]!;
          const position = beam.geometry.getAttribute(
            "position",
          ) as THREE.BufferAttribute;
          if (child.name === "thunderBranchBeam") {
            const branchStartRatio = branchIndex ? 0.62 : 0.36;
            thunderBranchStart.lerpVectors(
              start,
              end,
              branchStartRatio,
            );
            const branchLength =
              0.28 + Math.abs(random(segmentIndex, branchIndex, 19)) * 0.22;
            thunderBranchEnd.set(
              thunderBranchStart.x +
                random(segmentIndex, 1, 23) * branchLength,
              thunderBranchStart.y +
                0.08 +
                random(segmentIndex, 2, 29) * 0.18,
              thunderBranchStart.z +
                random(segmentIndex, 3, 37) * branchLength,
            );
            for (let pointIndex = 0; pointIndex < 5; pointIndex++) {
              const ratio = pointIndex / 4;
              const edge = Math.sin(ratio * Math.PI);
              position.setXYZ(
                pointIndex,
                THREE.MathUtils.lerp(
                  thunderBranchStart.x,
                  thunderBranchEnd.x,
                  ratio,
                ) + random(segmentIndex, pointIndex, 41) * 0.045 * edge,
                THREE.MathUtils.lerp(
                  thunderBranchStart.y,
                  thunderBranchEnd.y,
                  ratio,
                ) + random(segmentIndex, pointIndex, 47) * 0.04 * edge,
                THREE.MathUtils.lerp(
                  thunderBranchStart.z,
                  thunderBranchEnd.z,
                  ratio,
                ) + random(segmentIndex, pointIndex, 53) * 0.045 * edge,
              );
            }
            position.needsUpdate = true;
            (beam.material as THREE.LineBasicMaterial).opacity = Math.max(
              0,
              0.25 + random(segmentIndex, branchIndex, 61) * 0.22,
            );
            return;
          }
          for (let pointIndex = 0; pointIndex < 10; pointIndex++) {
            const ratio = pointIndex / 9;
            const edge = Math.sin(ratio * Math.PI);
            const zigzag =
              random(segmentIndex, pointIndex, 3) *
              (0.065 +
                Math.abs(random(segmentIndex, pointIndex, 11)) * 0.065) *
              edge;
            const layerOffset = lane * layerSpacing * edge;
            position.setXYZ(
              pointIndex,
              THREE.MathUtils.lerp(start.x, end.x, ratio) +
                zigzag +
                layerOffset,
              THREE.MathUtils.lerp(start.y, end.y, ratio) +
                random(segmentIndex, pointIndex, 71) * 0.075 * edge +
                layerOffset,
              THREE.MathUtils.lerp(start.z, end.z, ratio) +
                random(segmentIndex, pointIndex, 83) * 0.11 * edge +
                layerOffset,
            );
          }
          position.needsUpdate = true;
          const core = lane === 0;
          const innerGlow = Math.abs(lane) === 1;
          const levelOpacityBoost = (tower.level - 1) * 0.06;
          (beam.material as THREE.LineBasicMaterial).opacity =
            THREE.MathUtils.clamp(
              (core
                ? 0.92
                : innerGlow
                  ? 0.5 + levelOpacityBoost
                  : 0.26 + levelOpacityBoost) +
                random(segmentIndex, lane, 97) * (core ? 0.08 : 0.12),
              0.1,
              1,
            );
        });
      }
    }
  }
  syncTowerUpgradeEffects(now);

  if (renderer && camera && now - lastTowerAnchorUpdate >= 34) {
    lastTowerAnchorUpdate = now;
    const selectedModel =
      props.selectedTowerId === null
        ? undefined
        : towerModels.get(props.selectedTowerId);
    if (!selectedModel) {
      if (lastTowerAnchorVisible) {
        lastTowerAnchorVisible = false;
        emit("selectedTowerPosition", 0, 0, false);
      }
    } else {
      const width = renderer.domElement.clientWidth;
      const height = renderer.domElement.clientHeight;
      selectedModel.getWorldPosition(towerScreenPosition);
      towerScreenPosition.y += 1.05;
      towerScreenPosition.project(camera);
      const visible =
        towerScreenPosition.z > -1 &&
        towerScreenPosition.z < 1 &&
        Math.abs(towerScreenPosition.x) <= 1.08 &&
        Math.abs(towerScreenPosition.y) <= 1.08;
      const towerX = (towerScreenPosition.x * 0.5 + 0.5) * width;
      const towerY = (-towerScreenPosition.y * 0.5 + 0.5) * height;
      const panelWidth = 220;
      const sidebarEdge = width - 278;
      const panelGap = 46;
      const preferredX = towerX + panelGap;
      const x =
        preferredX + panelWidth < sidebarEdge
          ? preferredX
          : towerX - panelWidth - panelGap;
      const y = THREE.MathUtils.clamp(towerY, 130, height - 130);
      const clampedX = Math.max(10, x);
      if (
        visible !== lastTowerAnchorVisible ||
        Math.abs(clampedX - lastTowerAnchorX) >= 1 ||
        Math.abs(y - lastTowerAnchorY) >= 1
      ) {
        lastTowerAnchorVisible = visible;
        lastTowerAnchorX = clampedX;
        lastTowerAnchorY = y;
        emit("selectedTowerPosition", clampedX, y, visible);
      }
    }
  }

  enemyScene?.sync({
    enemies: props.enemies,
    elapsed,
    frameDelta,
    now,
    speedMultiplier: props.speedMultiplier,
    worldUnitsPerCell: DEFENSE_CELL_SIZE,
    pathPosition,
  });
  projectileScene?.sync({
    projectiles: props.projectiles,
    towers: props.towers,
    elapsed,
    frameDelta,
    now,
  });

  impactScene?.sync({
    impacts: props.impacts,
    elapsed,
    now,
    speedMultiplier: props.speedMultiplier,
  });
}

/** Nội suy toàn bộ camera về góc nhìn mặc định khi người chơi yêu cầu. */
function updateCameraReturn(frameDelta: number) {
  if (!cameraReturning || !camera || !controls) return;
  const easing = 1 - Math.exp(-frameDelta * 6.5);
  camera.position.lerp(defaultCameraPosition, easing);
  controls.target.lerp(defaultCameraTarget, easing);
  camera.lookAt(controls.target);

  if (
    camera.position.distanceToSquared(defaultCameraPosition) < 0.0004 &&
    controls.target.distanceToSquared(defaultCameraTarget) < 0.0004
  ) {
    camera.position.copy(defaultCameraPosition);
    controls.target.copy(defaultCameraTarget);
    camera.lookAt(controls.target);
    cameraReturning = false;
    controls.enabled = true;
    const dampingEnabled = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = dampingEnabled;
  }
}

/** Chỉ trả camera về mặc định khi nhấn R; bỏ qua lúc đang nhập văn bản. */
function handleCameraResetShortcut(event: KeyboardEvent) {
  const target = event.target;
  if (
    event.code !== "KeyR" ||
    event.repeat ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    !controls
  )
    return;
  event.preventDefault();
  cameraReturning = true;
  controls.enabled = false;
}

// ===== Khởi tạo và hủy scene =================================================
/**
 * Khởi tạo renderer/camera/light/map, đăng ký input, tải GLB song song và bắt
 * đầu animation loop. Mọi tài nguyên tạo ở đây được thu hồi trong onBeforeUnmount.
 */
async function createWorld() {
  const target = host.value;
  if (!target) return;
  try {
    surfaceDetail = createSurfaceDetail();
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(props.map.theme.background, props.map.theme.fogNear, props.map.theme.fogFar);
    const archerTemplate = createArcherTower();
    archerTemplate.add(groundShadow(0.42));
    applyTowerMetallicFinish(archerTemplate, 0x8a7658);
    // applyProceduralTowerFaction(archerTemplate);
    optimizeTemplateShadows(archerTemplate);
    towerTemplates.set("archer", archerTemplate);
    const cannonTemplate = createCannonTower();
    cannonTemplate.add(groundShadow(0.42));
    applyTowerMetallicFinish(cannonTemplate, 0x776b5d);
    // applyProceduralTowerFaction(cannonTemplate);
    optimizeTemplateShadows(cannonTemplate);
    towerTemplates.set("cannon", cannonTemplate);
    const frostPlaceholder = new THREE.Group();
    frostPlaceholder.userData.frostEffectCenterY = 1.77;
    frostPlaceholder.add(groundShadow(0.42));
    decorateFrostTower(frostPlaceholder);
    towerTemplates.set("frost", frostPlaceholder);
    towerTemplates.set("fire", createFireTowerTemplate(frostPlaceholder));
    towerTemplates.set("thunder", createFireTowerTemplate(frostPlaceholder));
    towerTemplates.set("water", createFireTowerTemplate(frostPlaceholder));
    towerTemplates.set("speed", createFireTowerTemplate(frostPlaceholder));
    towerTemplates.set("damage", createFireTowerTemplate(frostPlaceholder));
    projectileScene = createTowerDefenseProjectileScene(scene, {
      surfaceDetail,
      worldPosition,
      towerModels,
    });
    impactScene = createTowerDefenseImpactScene(scene, {
      cellSize: DEFENSE_CELL_SIZE,
      worldPosition,
    });
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.12;
    towerModelLibrary = createTowerModelLibrary({
      renderer,
      faction: props.faction,
      managedModels: props.managedTowerModels,
      decorate: decorateLoadedTowerModel,
    });
    target.appendChild(renderer.domElement);
    renderer.setClearColor(props.map.theme.background, 1);
    const cameraFar = Math.max(250, cameraMapSpan * 10);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, cameraFar);
    camera.position.copy(defaultCameraPosition);
    camera.lookAt(defaultCameraTarget);
    camera.updateProjectionMatrix();
    enemyScene = createTowerDefenseEnemyScene(scene, camera, {
      enemyModel: props.map.enemyModel,
      bossModel: props.map.bossModel,
      enemyModels: Object.fromEntries(
        (props.map.enemyDefinitions ?? [])
          .filter((definition) => definition.model)
          .map((definition) => [definition.id, definition.model!]),
      ),
      bossModels: Object.fromEntries(
        (props.map.bossDefinitions ?? [])
          .filter((definition) => definition.model)
          .map((definition) => [definition.id, definition.model!]),
      ),
    });
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(defaultCameraTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = Math.max(4, cameraMapSpan * 0.18);
    controls.maxDistance = Math.max(35, cameraMapSpan * 2.5);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.update();
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x64706a, 1.45));
    const sun = new THREE.DirectionalLight(0xffffff, 2.85);
    sun.position.set(-6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.00008;
    sun.shadow.normalBias = 0.025;
    sun.shadow.camera.left = -9 * DEFENSE_CELL_SIZE;
    sun.shadow.camera.right = 9 * DEFENSE_CELL_SIZE;
    sun.shadow.camera.top = 7 * DEFENSE_CELL_SIZE;
    sun.shadow.camera.bottom = -7 * DEFENSE_CELL_SIZE;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.58);
    fill.position.set(7, 6, -8);
    scene.add(fill);
    const mapScene = createTowerDefenseMapScene(scene, props.map, surfaceDetail);
    tileMeshes.push(...mapScene.tileMeshes);
    mysticParticles = mapScene.particles;
    updateSpawnPortal = mapScene.updatePortal;
    hoverMarker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.88),
      new THREE.MeshBasicMaterial({
        color: 0xf8edba,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    hoverMarker.rotation.x = -Math.PI / 2;
    hoverMarker.visible = false;
    scene.add(hoverMarker);
    attackRangeMarker = new THREE.Group();
    const rangeDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffd36a,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.965, 1, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffd36a,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    rangeDisc.rotation.x = rangeRing.rotation.x = -Math.PI / 2;
    for (const marker of [rangeDisc, rangeRing]) {
      marker.renderOrder = 4;
      marker.frustumCulled = false;
    }
    attackRangeMarker.add(rangeDisc, rangeRing);
    attackRangeMarker.visible = false;
    scene.add(attackRangeMarker);
    towerFocusMarker = new THREE.Group();
    const focusHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.49, 0.62, 56),
      new THREE.MeshBasicMaterial({
        color: 0xb51f2e,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const focusRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.59, 56),
      new THREE.MeshBasicMaterial({
        color: 0xe43845,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    for (const marker of [focusHalo, focusRing]) {
      marker.rotation.x = -Math.PI / 2;
      marker.renderOrder = 6;
      marker.frustumCulled = false;
    }
    towerFocusMarker.add(focusHalo, focusRing);
    towerFocusMarker.visible = false;
    scene.add(towerFocusMarker);
    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(target.clientWidth, 2);
      const height = Math.max(target.clientHeight, 2);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(target);
    resize();
    const cellAtPointer = (event: PointerEvent) => {
      if (!renderer || !camera) return null;
      const bounds = renderer.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(tileMeshes, false)[0];
      return hit?.object.userData.cell as { x: number; y: number } | undefined;
    };
    renderer.domElement.addEventListener("pointerdown", (event) => {
      pointerStart.set(event.clientX, event.clientY);
      pointerTravel = 0;
      if (event.button === 0 && controls) {
        cameraReturning = false;
        controls.enabled = true;
      }
    });
    renderer.domElement.addEventListener("pointermove", (event) => {
      if (event.buttons & 1) {
        pointerCurrent.set(event.clientX, event.clientY);
        pointerTravel = Math.max(
          pointerTravel,
          pointerStart.distanceTo(pointerCurrent),
        );
        if (hoverMarker) hoverMarker.userData.hoveredCell = undefined;
        renderer!.domElement.style.cursor = "grabbing";
        return;
      }
      const cell = cellAtPointer(event);
      if (hoverMarker) hoverMarker.userData.hoveredCell = cell;
      renderer!.domElement.style.cursor = cell ? "pointer" : "grab";
    });
    renderer.domElement.addEventListener("pointerleave", () => {
      if (hoverMarker) hoverMarker.userData.hoveredCell = undefined;
    });
    renderer.domElement.addEventListener("click", (event) => {
      if (pointerTravel > 5) return;
      const cell = cellAtPointer(event);
      if (cell) {
        console.log("[Tower Defense] Clicked cell", { x: cell.x, y: cell.y });
        console.table({
          calls: renderer!.info.render.calls,
          triangles: renderer!.info.render.triangles,
          geometries: renderer!.info.memory.geometries,
          textures: renderer!.info.memory.textures,
        });
        emit("cellSelect", cell.x, cell.y);
      } else emit("backgroundSelect");
    });
    renderer.domElement.addEventListener("contextmenu", (event) =>
      event.preventDefault(),
    );
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      renderError.value =
        "Kết nối đồ họa 3D đã bị gián đoạn. Hãy tải lại trang.";
    });
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const frameDelta = Math.min(clock.getDelta(), 0.05);
      if (!props.isPaused) {
        visualElapsed += frameDelta;
        visualNow += frameDelta * 1000;
      }
      if (cameraReturning) updateCameraReturn(frameDelta);
      else controls?.update();
      if (!props.isPaused) syncScene(visualElapsed, frameDelta, visualNow);
      renderer!.render(scene!, camera!);
    };
    window.addEventListener("keydown", handleCameraResetShortcut);
    await Promise.allSettled([
      towerModelLibrary.load(),
      enemyScene.load(),
      loadMapBackgroundModel(),
      loadCastleModel(),
    ]);
    if (!renderer || !scene || !camera || !host.value?.isConnected) return;
    syncScene(visualElapsed, 0, visualNow);
    renderer.render(scene, camera);
    emit("ready");
    animate();
    console.table({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    });
  } catch (error) {
    renderError.value =
      "Không thể khởi tạo đồ họa 3D. Hãy bật WebGL hoặc tăng tốc phần cứng trong trình duyệt.";
    console.error("[Kingdom Defense] Scene initialization failed:", error);
    emit("ready");
  }
}

// Chờ DOM có host trước khi tạo WebGL context; requestAnimationFrame giúp Nuxt
// hoàn tất layout để camera/renderer lấy đúng kích thước ban đầu.
onMounted(async () => {
  await nextTick();
  animationFrame = requestAnimationFrame(() => {
    void createWorld();
  });
});
// Thu hồi listener, animation frame, controls, skeleton, geometry, material,
// texture và WebGL context để vào lại route không nhân đôi tài nguyên GPU.
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleCameraResetShortcut);
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  controls?.dispose();
  controls = null;
  tileMeshes.length = 0;
  projectileScene?.dispose();
  projectileScene = null;
  impactScene?.dispose();
  impactScene = null;
  enemyScene?.dispose();
  enemyScene = null;
  mapBackgroundLayer = null;
  towerModelLibrary?.dispose();
  towerModelLibrary = null;
  towerUpgradeEffects.clear();
  scene?.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Sprite ||
      child instanceof THREE.Line
    ) {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line)
        child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
  surfaceDetail?.dispose();
  surfaceDetail = null;
  frostGlowTexture?.dispose();
  frostGlowTexture = null;
  towerLevelLabelTextures.forEach((texture) => texture.dispose());
  towerLevelLabelTextures.clear();
  towerBuffBadgeTextures.forEach((texture) => texture.dispose());
  towerBuffBadgeTextures.clear();
  mysticParticles = null;
  updateSpawnPortal = null;
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
  renderer = null;
  scene = null;
});
</script>

<template>
  <div
    ref="host"
    class="tower-defense-scene"
    role="application"
    aria-label="Bản đồ phòng thủ 3D"
  >
    <p v-if="renderError" class="tower-defense-scene__error">
      {{ renderError }}
    </p>
  </div>
</template>

<style scoped>
.tower-defense-scene {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(#b8d494 0 45%, #80965f 45% 100%);
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.tower-defense-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.tower-defense-scene__error {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #172017;
  color: #f3d899;
  text-align: center;
}
</style>
