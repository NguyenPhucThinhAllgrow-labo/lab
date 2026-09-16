<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DEFENSE_GRID_COLUMNS, DEFENSE_GRID_ROWS, DEFENSE_PATH, DEFENSE_PATHS, DEFENSE_PATH_TILES, TOWER_DEFINITIONS, TOWER_RANGE_LEVEL_BONUS, defensePathPosition } from '~/composables/useTowerDefense'
import type { BossClass, Enemy, GamePhase, Impact, Projectile, Tower, TowerKind } from '~/types/games/towerDefense'

const props = defineProps<{ towers: Tower[]; enemies: Enemy[]; projectiles: Projectile[]; impacts: Impact[]; selectedTowerId: number | null; selectedKind: TowerKind | null; phase: GamePhase; isPaused: boolean; speedMultiplier: 1 | 2 | 4 }>()
const emit = defineEmits<{
  cellSelect: [x: number, y: number]
  backgroundSelect: []
  selectedTowerPosition: [x: number, y: number, visible: boolean]
  ready: []
}>()

// ===== WebGL lifecycle và tài nguyên dùng chung =============================
const host = ref<HTMLDivElement | null>(null)
const renderError = ref('')

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let controls: OrbitControls | null = null
let animationFrame = 0
let resizeObserver: ResizeObserver | null = null
let surfaceDetail: THREE.DataTexture | null = null
let frostGlowTexture: THREE.CanvasTexture | null = null
let frostWaveTexture: THREE.CanvasTexture | null = null
let fireWaveTexture: THREE.CanvasTexture | null = null
const enemyStatusBadgeTextures = new Map<'fire' | 'frost' | 'water', THREE.CanvasTexture>()
const clock = new THREE.Clock()
let visualElapsed = 0
let visualNow = 0

// Cache object đang hiển thị theo ID gameplay; template giữ bản gốc để clone.
const towerModels = new Map<number, THREE.Group>()
const towerUpgradeEffects = new Map<number, { group: THREE.Group; bornAt: number; kind: TowerKind }>()
const enemyModels = new Map<number, THREE.Group>()
const projectileModels = new Map<number, { group: THREE.Group; bornAt: number }>()
const impactModels = new Map<number, THREE.Group>()
const towerTemplates = new Map<Tower['kind'], THREE.Group>()
let towerPreviewModel: THREE.Group | null = null
let towerPreviewKind: TowerKind | null = null
let castleModel: THREE.Group | null = null
const projectileTemplates = new Map<Projectile['kind'], THREE.Group>()
let riggedEnemyTemplate: THREE.Group | null = null
let riggedEnemyAnimations: THREE.AnimationClip[] = []
let enemySwordTemplate: THREE.Object3D | null = null
let enemyShieldTemplate: THREE.Object3D | null = null
// Năm class boss dùng chung rig animation nhưng có model và trang bị riêng.
const bossEnemyTemplates = new Map<BossClass, THREE.Group>()
const bossEquipmentTemplates = new Map<BossClass, { right: THREE.Object3D; left: THREE.Object3D }>()
const tileMeshes: THREE.Mesh[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pointerStart = new THREE.Vector2()
const pointerCurrent = new THREE.Vector2()
const defaultCameraPosition = new THREE.Vector3(5.7, 12.5, 5.6)
const defaultCameraTarget = new THREE.Vector3(1.3, 0, 0)
const towerScreenPosition = new THREE.Vector3()
const defensePathTileSet = new Set(DEFENSE_PATH_TILES.map(point => `${point.x}:${point.y}`))
let cameraReturning = false
let lastTowerAnchorUpdate = 0
let lastTowerAnchorVisible = false
let lastTowerAnchorX = Number.NaN
let lastTowerAnchorY = Number.NaN
let pointerTravel = 0
let hoverMarker: THREE.Mesh | null = null
let attackRangeMarker: THREE.Group | null = null
let towerFocusMarker: THREE.Group | null = null
let mysticParticles: THREE.Points | null = null
let performanceMode = false

// ===== Helpers tọa độ, geometry và giải phóng GPU ===========================
/** Đặt tâm grid tại world origin và ánh xạ hàng gameplay sang trục Z của Three.js. */
const worldPosition = (x: number, y: number) => new THREE.Vector3(x - (DEFENSE_GRID_COLUMNS - 1) / 2, 0, y - (DEFENSE_GRID_ROWS - 1) / 2)
/** Đổi progress trên một lane gameplay thành Vector3 trong hệ tọa độ scene. */
function pathPosition(progress: number, lane: 0 | 1 = 0) {
  const position = defensePathPosition(progress, lane)
  return worldPosition(position.x, position.y)
}
/** Tạo bóng tròn giả nhẹ hơn shadow map để model luôn tách khỏi mặt đất. */
function groundShadow(radius: number) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: 0x10180d, transparent: true, opacity: .32, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = .02
  shadow.renderOrder = 2
  return shadow
}

/** Gỡ Object3D và tùy chọn giải phóng geometry/material sở hữu riêng trên GPU. */
const disposeObject = (object: THREE.Object3D, disposeResources = true) => {
  object.traverse((child) => {
    if (!disposeResources) return
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Sprite) && !(child instanceof THREE.Line)) return
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(material => material.dispose())
  })
  object.removeFromParent()
}

/** Factory MeshStandardMaterial thống nhất chất liệu, bump và shadow cho scene. */
function mesh(geometry: THREE.BufferGeometry, color: number, options: { roughness?: number; metalness?: number; emissive?: number; flatShading?: boolean } = {}) {
  const roughness = options.roughness ?? .72
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: options.metalness ?? .05, emissive: options.emissive ?? 0, emissiveIntensity: options.emissive ? 1.35 : 1, flatShading: options.flatShading ?? false, bumpMap: roughness > .5 ? surfaceDetail : null, bumpScale: roughness > .5 ? .012 : 0 })
  const item = new THREE.Mesh(geometry, material)
  item.castShadow = true
  item.receiveShadow = true
  return item
}

/** Sinh DataTexture nhiễu nhỏ dùng làm bump map chung cho đá và công trình. */
function createSurfaceDetail() {
  const size = 64
  const data = new Uint8Array(size * size)
  let seed = 941
  for (let index = 0; index < data.length; index++) {
    seed = (seed * 16807) % 2147483647
    const noise = (seed / 2147483647 - .5) * 42
    const x = index % size; const y = Math.floor(index / size)
    data[index] = Math.max(0, Math.min(255, 128 + noise + Math.sin(x * .7) * 8 + Math.cos(y * .43) * 6))
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat)
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3); texture.needsUpdate = true
  return texture
}

/** Tắt shadow cho chi tiết rất nhỏ để giảm draw cost khi template được clone nhiều lần. */
function optimizeTemplateShadows(group: THREE.Group) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.computeBoundingSphere()
    // Chi tiết nhỏ vẫn nhận ánh sáng nhưng không tạo thêm một shadow draw-call.
    if ((child.geometry.boundingSphere?.radius ?? 0) < .22) child.castShadow = false
  })
}

/** Clone và hiệu chỉnh material kim loại của tower mà không làm bẩn material template khác. */
function applyTowerMetallicFinish(group: THREE.Group, tint: number) {
  const tintColor = new THREE.Color(tint)
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial)) return
    const material = child.material
    // Giữ nguyên pha lê/rune emissive; chỉ phủ ánh kim nhẹ lên kiến trúc.
    if (material.emissive.getHex() !== 0) return
    material.color.lerp(tintColor, .08)
    material.metalness = THREE.MathUtils.clamp(Math.max(material.metalness, .12) + .04, .16, .88)
    material.roughness = THREE.MathUtils.clamp(material.roughness - .08, .24, .82)
    material.needsUpdate = true
  })
}

/** Xếp các khối crenellation quanh mép tower theo vòng tròn. */
function addBattlements(group: THREE.Group, y: number, radius: number, color: number, count = 8) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const block = mesh(new THREE.BoxGeometry(.18, .18, .14), color)
    block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius)
    block.rotation.y = angle
    group.add(block)
  }
}

/** Rải đá chân móng có biến thiên nhỏ để silhouette tower bớt đều. */
function addRockFooting(group: THREE.Group, radius: number, color: number, count = 9) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const rock = mesh(new THREE.DodecahedronGeometry(.13 + (index % 3) * .018, 0), color, { flatShading: true })
    rock.position.set(Math.sin(angle) * radius, .11, Math.cos(angle) * radius)
    rock.scale.set(1.15, .75 + (index % 2) * .16, .92)
    rock.rotation.set(index * .17, angle, index * -.11)
    group.add(rock)
  }
}

/** Thêm các đai đá theo danh sách cao độ/bán kính cấu hình. */
function addStoneCourses(group: THREE.Group, courses: Array<{ y: number; radius: number }>, color: number) {
  for (const course of courses) {
    const seam = mesh(new THREE.CylinderGeometry(course.radius, course.radius, .035, 16), color, { roughness: .92 })
    seam.position.y = course.y; group.add(seam)
  }
}

/** Bố trí khe bắn quanh thân tower và xoay từng khe hướng ra ngoài. */
function addArrowSlits(group: THREE.Group, y: number, radius: number, count = 4) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const slit = mesh(new THREE.BoxGeometry(.065, .23, .025), 0x171b1a, { metalness: .08, roughness: .52 })
    slit.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius)
    slit.rotation.y = angle
    group.add(slit)
  }
}

/** Tạo cờ hai màu gắn trên tower; mesh được đặt tên để animate về sau. */
function createBanner(color: number, trim: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-.11, .2); shape.lineTo(.11, .2); shape.lineTo(.11, -.14); shape.lineTo(0, -.22); shape.lineTo(-.11, -.14); shape.closePath()
  const cloth = mesh(new THREE.ShapeGeometry(shape), color, { roughness: .9 })
  ;(cloth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
  const emblem = mesh(new THREE.CircleGeometry(.035, 10), trim, { metalness: .35, roughness: .38 }); emblem.position.z = .008
  cloth.add(emblem)
  return cloth
}

/** Tạo vòng chọn mờ ở chân tower, mặc định ẩn cho tới khi tower được chọn. */
function createTowerAura(color: number) {
  const aura = new THREE.Group(); aura.name = 'towerAura'; aura.position.y = .105
  const ring = mesh(new THREE.TorusGeometry(.49, .018, 7, 40), color, { emissive: color, metalness: .25, roughness: .2 }); ring.rotation.x = Math.PI / 2
  const disc = new THREE.Mesh(new THREE.RingGeometry(.32, .46, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2
  aura.add(ring, disc)
  for (let index = 0; index < 4; index++) {
    const angle = index * Math.PI / 2
    const rune = mesh(new THREE.OctahedronGeometry(.035, 0), color, { emissive: color, roughness: .16 }); rune.position.set(Math.cos(angle) * .405, .025, Math.sin(angle) * .405); aura.add(rune)
  }
  return aura
}

/** Tạo lazy radial texture cho ánh sáng băng và cache để mọi instance dùng chung. */
function getFrostGlowTexture() {
  if (frostGlowTexture) return frostGlowTexture
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Không thể tạo texture phát sáng cho tháp băng.')
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 62)
  gradient.addColorStop(0, 'rgba(220, 252, 255, .95)')
  gradient.addColorStop(.18, 'rgba(91, 229, 255, .72)')
  gradient.addColorStop(.5, 'rgba(28, 174, 232, .22)')
  gradient.addColorStop(1, 'rgba(10, 102, 181, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  frostGlowTexture = new THREE.CanvasTexture(canvas)
  frostGlowTexture.colorSpace = THREE.SRGBColorSpace
  return frostGlowTexture
}

/** Tạo texture vòng sóng băng bằng Canvas, tránh phải tải thêm ảnh ngoài. */
function getFrostWaveTexture() {
  if (frostWaveTexture) return frostWaveTexture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Không thể tạo gradient cho sóng băng.')
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 126)
  gradient.addColorStop(0, 'rgba(43, 135, 194, .05)')
  gradient.addColorStop(.48, 'rgba(35, 151, 207, .1)')
  gradient.addColorStop(.72, 'rgba(47, 185, 226, .24)')
  gradient.addColorStop(.86, 'rgba(106, 226, 246, .5)')
  gradient.addColorStop(.94, 'rgba(190, 249, 255, .4)')
  gradient.addColorStop(1, 'rgba(54, 157, 211, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  frostWaveTexture = new THREE.CanvasTexture(canvas)
  frostWaveTexture.colorSpace = THREE.SRGBColorSpace
  return frostWaveTexture
}

/** Tạo radial texture nóng cho sóng nổ của tower lửa. */
function getFireWaveTexture() {
  if (fireWaveTexture) return fireWaveTexture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Không thể tạo gradient cho sóng lửa.')
  const gradient = context.createRadialGradient(128, 128, 3, 128, 128, 126)
  gradient.addColorStop(0, 'rgba(255, 205, 76, .12)')
  gradient.addColorStop(.46, 'rgba(255, 105, 30, .16)')
  gradient.addColorStop(.72, 'rgba(239, 55, 20, .3)')
  gradient.addColorStop(.87, 'rgba(255, 145, 38, .58)')
  gradient.addColorStop(.95, 'rgba(255, 218, 112, .42)')
  gradient.addColorStop(1, 'rgba(180, 25, 8, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  fireWaveTexture = new THREE.CanvasTexture(canvas)
  fireWaveTexture.colorSpace = THREE.SRGBColorSpace
  return fireWaveTexture
}

// ===== Model tháp và hiệu ứng nâng cấp ======================================
/** Gắn cửa và vòng tay nắm lên mặt trước của một tower procedural. */
function addDoor(group: THREE.Group, y: number, z: number) {
  const door = mesh(new THREE.BoxGeometry(.2, .31, .035), 0x49301f); door.position.set(0, y, z)
  const ring = mesh(new THREE.TorusGeometry(.035, .009, 5, 10), 0xc18b3d, { metalness: .7, roughness: .25 }); ring.position.set(.045, y, z + .025)
  group.add(door, ring)
}

/** Dựng template tháp cung cùng turret, dây cung và điểm phóng tên. */
function createArcherTower() {
  const group = new THREE.Group()
  group.add(createTowerAura(0x79b85a))
  addRockFooting(group, .43, 0x5c5b56, 11)
  const base = mesh(new THREE.CylinderGeometry(.39, .49, .25, 16), 0x4e4d49, { roughness: .9 }); base.position.y = .125
  const body = mesh(new THREE.CylinderGeometry(.29, .38, .9, 16), 0x9b968a, { roughness: .94 }); body.position.y = .66
  const lowerBand = mesh(new THREE.CylinderGeometry(.385, .405, .1, 16), 0x56534d, { roughness: .82 }); lowerBand.position.y = .38
  const deck = mesh(new THREE.CylinderGeometry(.47, .47, .13, 16), 0x43372c, { roughness: .78 }); deck.position.y = 1.1
  addStoneCourses(group, [{ y: .56, radius: .35 }, { y: .82, radius: .325 }], 0x77736b)
  addArrowSlits(group, .73, .34)
  addDoor(group, .31, .43)
  addBattlements(group, 1.2, .39, 0xb1aca1, 10)
  const lowerBanner = createBanner(0x344a35, 0xb79852); lowerBanner.position.set(0, .66, .39); group.add(lowerBanner)
  const turret = new THREE.Group(); turret.position.y = 1.2
  const roof = mesh(new THREE.ConeGeometry(.43, .4, 16), 0x263a2d, { roughness: .68 }); roof.position.y = .44
  const roofTrim = mesh(new THREE.CylinderGeometry(.445, .445, .06, 16), 0x85643d, { metalness: .35, roughness: .42 }); roofTrim.position.y = .25
  for (const x of [-.32, .32]) for (const z of [-.25, .25]) {
    const post = mesh(new THREE.BoxGeometry(.075, .25, .075), 0x49372a, { roughness: .74 }); post.position.set(x, .12, z); turret.add(post)
  }
  const cap = mesh(new THREE.CylinderGeometry(.08, .11, .1, 12), 0x756047, { metalness: .25, roughness: .44 }); cap.position.y = .67
  const flagPole = mesh(new THREE.CylinderGeometry(.012, .012, .66, 8), 0x40352b, { metalness: .28, roughness: .4 }); flagPole.position.set(0, .82, 0)
  const flag = createBanner(0x344a35, 0xb79852); flag.scale.set(.82, .82, .82); flag.position.set(.13, .98, 0); flag.rotation.y = Math.PI / 2
  // Mái, cờ và bốn trụ là kiến trúc cố định; tháp cung không có cụm pháo
  // cơ khí cần quay theo mục tiêu như tháp pháo.
  turret.name = 'archerRoof'; flag.name = 'towerFlag'
  turret.add(roof, roofTrim, cap, flagPole, flag); group.add(base, body, lowerBand, deck, turret)
  return group
}

/** Dựng template pháo, gồm barrel rig dùng cho aim/recoil và hiệu ứng nòng. */
function createCannonTower() {
  const group = new THREE.Group()
  group.add(createTowerAura(0xe09648))
  addRockFooting(group, .48, 0x55534f, 12)
  const base = mesh(new THREE.CylinderGeometry(.43, .53, .27, 16), 0x454541, { roughness: .9 }); base.position.y = .135
  const wall = mesh(new THREE.CylinderGeometry(.33, .42, .76, 16), 0x918b80, { roughness: .94 }); wall.position.y = .58
  const lowerBand = mesh(new THREE.CylinderGeometry(.425, .445, .1, 16), 0x55514b, { roughness: .8 }); lowerBand.position.y = .34
  const rim = mesh(new THREE.CylinderGeometry(.44, .44, .12, 16), 0x4a4844, { metalness: .16, roughness: .58 }); rim.position.y = .99
  addStoneCourses(group, [{ y: .55, radius: .39 }, { y: .78, radius: .36 }], 0x706c65)
  addArrowSlits(group, .7, .375)
  addDoor(group, .3, .46)
  addBattlements(group, 1.1, .375, 0xa6a198, 10)
  const banner = createBanner(0x713f2c, 0xb99458); banner.position.set(0, .62, .405); group.add(banner)
  const turret = new THREE.Group(); turret.position.y = 1.08
  const cradle = mesh(new THREE.BoxGeometry(.42, .24, .38), 0x45362b, { roughness: .7 }); cradle.position.y = .02
  const barrelRig = new THREE.Group(); barrelRig.name = 'towerBarrelRig'; barrelRig.position.y = .13; barrelRig.rotation.x = -.2
  const barrel = mesh(new THREE.CylinderGeometry(.085, .14, .82, 16), 0x3e4546, { metalness: .78, roughness: .26 }); barrel.rotation.x = Math.PI / 2; barrel.position.z = .38
  const muzzle = mesh(new THREE.CylinderGeometry(.145, .145, .17, 16), 0x292e2f, { metalness: .82, roughness: .22 }); muzzle.rotation.x = Math.PI / 2; muzzle.position.z = .82
  const muzzleFlash = mesh(new THREE.OctahedronGeometry(.11, 0), 0xffb347, { emissive: 0xff6a22, roughness: .14, flatShading: true }); muzzleFlash.name = 'towerMuzzleFlash'; muzzleFlash.position.z = .96; muzzleFlash.visible = false
  const muzzleCharge = new THREE.Group(); muzzleCharge.name = 'cannonMuzzleCharge'; muzzleCharge.position.z = .98; muzzleCharge.visible = false
  for (let index = 0; index < 2; index++) {
    const chargeRing = new THREE.Mesh(
      new THREE.TorusGeometry(.16 + index * .045, .012, 6, 28),
      new THREE.MeshBasicMaterial({ color: index ? 0xff7b28 : 0xffcf66, transparent: true, opacity: .72 - index * .16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    chargeRing.name = 'cannonMuzzleRing'; chargeRing.userData.index = index; muzzleCharge.add(chargeRing)
  }
  for (let index = 0; index < 8; index++) {
    const spark = new THREE.Mesh(
      new THREE.TetrahedronGeometry(index % 3 === 0 ? .025 : .017, 0),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xff7a24 : 0xffe19a, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    spark.name = 'cannonMuzzleSpark'; spark.userData.index = index; spark.userData.angle = index / 8 * Math.PI * 2; muzzleCharge.add(spark)
  }
  const barrelUpgradeFx = new THREE.Group(); barrelUpgradeFx.name = 'cannonBarrelUpgradeFx'; barrelUpgradeFx.visible = false
  for (let index = 0; index < 3; index++) {
    const energyBand = new THREE.Mesh(
      new THREE.TorusGeometry(.125 + index * .006, .009, 6, 24),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xff8a2b : 0xffd878, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    energyBand.name = 'cannonBarrelEnergyBand'; energyBand.userData.index = index; energyBand.position.z = .23 + index * .22; barrelUpgradeFx.add(energyBand)
  }
  for (let index = 0; index < 6; index++) {
    const arc = new THREE.Mesh(
      new THREE.CapsuleGeometry(.009, .07, 3, 5),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffb13b : 0xfff0b0, transparent: true, opacity: .82, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    arc.name = 'cannonBarrelArc'; arc.userData.index = index; arc.userData.phase = index / 6 * Math.PI * 2; arc.rotation.x = Math.PI / 2; barrelUpgradeFx.add(arc)
  }
  for (const z of [.16, .43, .69]) {
    const barrelBand = mesh(new THREE.TorusGeometry(.12, .018, 7, 16), 0x8d7148, { metalness: .72, roughness: .28 }); barrelBand.rotation.x = Math.PI / 2; barrelBand.position.z = z; barrelRig.add(barrelBand)
  }
  for (const x of [-.27, .27]) {
    const wheel = mesh(new THREE.CylinderGeometry(.19, .19, .085, 16), 0x382c24, { roughness: .8 }); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, -.04, .03); turret.add(wheel)
    const hub = mesh(new THREE.CylinderGeometry(.065, .065, .1, 12), 0x846844, { metalness: .48, roughness: .35 }); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); turret.add(hub)
  }
  turret.name = 'towerTurret'; barrel.name = 'towerBarrel'; muzzle.name = 'towerMuzzle'
  barrelRig.add(barrel, muzzle, muzzleFlash, muzzleCharge, barrelUpgradeFx); turret.add(cradle, barrelRig); group.add(base, wall, lowerBand, rim, turret)
  return group
}

/** Bổ sung marker, tinh thể và node hiệu ứng vào model tháp băng đã tải. */
function decorateFrostTower(group: THREE.Group) {
  if (group.getObjectByName('frostVisualEffects')) return
  const centralY = Number(group.userData.frostEffectCenterY ?? 1.77)
  const effects = new THREE.Group()
  effects.name = 'frostVisualEffects'
  const glowMaterial = new THREE.SpriteMaterial({ map: getFrostGlowTexture(), color: 0xb9f7ff, transparent: true, opacity: .7, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending })
  glowMaterial.toneMapped = false
  const glow = new THREE.Sprite(glowMaterial)
  glow.name = 'frostGlowCentral'
  glow.position.y = centralY + .05
  glow.scale.set(.68, .88, 1)
  glow.userData.baseScaleX = .68
  glow.userData.baseScaleY = .88
  effects.add(glow)
  for (const [radius, tube, tilt, opacity] of [[.43, .018, 0, .72], [.48, .012, .3, .46]] as Array<[number, number, number, number]>) {
    const energyRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 7, 48),
      new THREE.MeshBasicMaterial({ color: 0x8cefff, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    energyRing.name = 'frostEnergyRing'
    energyRing.position.y = centralY - .31
    energyRing.rotation.set(Math.PI / 2 + tilt, 0, tilt * .65)
    energyRing.userData.baseTilt = tilt
    effects.add(energyRing)
  }
  for (let index = 0; index < 10; index++) {
    const particle = new THREE.Mesh(
      new THREE.OctahedronGeometry(index % 3 === 0 ? .027 : .018, 0),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xc8f9ff : 0x4cddff, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    particle.name = 'frostParticle'
    particle.userData.orbitAngle = index / 10 * Math.PI * 2
    particle.userData.orbitRadius = .34 + index % 3 * .09
    particle.userData.baseY = centralY - .42 + index % 4 * .13
    effects.add(particle)
  }
  group.add(effects)
}

/** Biến một clone tháp băng thành tháp lửa bằng material và effect node riêng. */
function createFireTowerTemplate(frostTemplate: THREE.Group) {
  const group = frostTemplate.clone(true)
  group.name = 'FireTower3D'
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return
    if (child instanceof THREE.Mesh) child.geometry = child.geometry.clone()
    const recolor = (original: THREE.Material) => {
      const material = original.clone()
      if (material instanceof THREE.SpriteMaterial) {
        material.color.setHex(0xff6238)
        material.opacity = Math.min(1, material.opacity * 1.08)
      } else if (material instanceof THREE.MeshBasicMaterial) {
        material.color.setHex(child.name.startsWith('frost') ? 0xff4b24 : 0xb83226)
      } else if (material instanceof THREE.MeshStandardMaterial) {
        material.color.setRGB(1, 1, 1)
        material.metalness = Math.max(material.metalness, .14)
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
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
            diffuseColor.rgb = mix(diffuseColor.rgb, firePalette, coloredDetail);`)
        }
        material.customProgramCacheKey = () => 'fire-tower-soft-red-accents-v3'
        if (child.name.startsWith('frost')) {
          material.emissive.setHex(0x8f190e)
          material.emissiveIntensity = .8
        }
      }
      return material
    }
    child.material = Array.isArray(child.material) ? child.material.map(recolor) : recolor(child.material)
  })
  return group
}

/** Gắn quầng sáng nguyên tố lên lõi ở đỉnh các tháp lửa, sét và nước. */
function decorateElementalTowerGlow(group: THREE.Group, kind: 'fire' | 'thunder' | 'water') {
  const colors = { fire: 0xff5a18, thunder: 0x9b7cff, water: 0x38bdf8 } as const
  const heights = { fire: 1.82, thunder: 1.82, water: 1.78 } as const
  const effect = new THREE.Group()
  effect.name = 'elementalTowerGlow'
  effect.userData.kind = kind
  effect.position.y = heights[kind]
  const glowMaterial = new THREE.SpriteMaterial({ map: getFrostGlowTexture(), color: colors[kind], transparent: true, opacity: .68, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false })
  const glow = new THREE.Sprite(glowMaterial)
  glow.name = 'elementalTowerGlowSprite'
  glow.userData.baseScale = kind === 'fire' ? .7 : .62
  glow.scale.setScalar(Number(glow.userData.baseScale))
  glow.renderOrder = 8
  effect.add(glow)
  group.add(effect)
}

/** Cache các node có tên vào userData để vòng render không phải traverse mỗi frame. */
function bindTowerParts(group: THREE.Group) {
  group.userData.turret = group.getObjectByName('towerTurret')
  group.userData.flag = group.getObjectByName('towerFlag')
  group.userData.barrelRig = group.getObjectByName('towerBarrelRig')
  group.userData.barrel = group.getObjectByName('towerBarrel')
  group.userData.muzzle = group.getObjectByName('towerMuzzle')
  group.userData.muzzleFlash = group.getObjectByName('towerMuzzleFlash')
  group.userData.cannonMuzzleCharge = group.getObjectByName('cannonMuzzleCharge')
  group.userData.cannonBarrelUpgradeFx = group.getObjectByName('cannonBarrelUpgradeFx')
  group.userData.aura = group.getObjectByName('towerAura')
  const glows: THREE.Object3D[] = []
  const energyRings: THREE.Mesh[] = []
  const particles: THREE.Mesh[] = []
  group.traverse((child) => {
    if (child.name.startsWith('frostGlow')) glows.push(child)
    else if (child.name === 'frostEnergyRing') energyRings.push(child as THREE.Mesh)
    else if (child.name === 'frostParticle') particles.push(child as THREE.Mesh)
  })
  group.userData.frostGlows = glows
  group.userData.frostEnergyRings = energyRings
  group.userData.frostParticles = particles
}

/** Trả scale ngang/dọc theo level để tower lớn lên nhưng vẫn bám đúng mặt đất. */
function towerScaleForLevel(level: number) {
  // Khoảng cách kích thước đủ lớn để nhận ra cấp tháp ngay từ camera toàn cảnh.
  const levelScale = level === 1 ? 1 : level === 2 ? 1.13 : 1.27
  return { horizontal: levelScale * .93, vertical: levelScale * 1.24 }
}

/** Áp scale level và bù trục Y cho một model tower. */
function setTowerScale(group: THREE.Group, level: number) {
  const scale = towerScaleForLevel(level)
  group.scale.set(scale.horizontal, scale.vertical, scale.horizontal)
}

/** Bật/tắt chi tiết nâng cấp tĩnh dựa trên kind và level hiện tại. */
function applyTowerLevelAppearance(group: THREE.Group, tower: Tower) {
  const previous = group.getObjectByName('towerLevelEffect')
  if (previous) disposeObject(previous)
  const effect = new THREE.Group(); effect.name = 'towerLevelEffect'; effect.userData.kind = tower.kind
  if (tower.level === 1) { group.add(effect); return }
  const colors: Record<TowerKind, number> = { archer: 0x86e45c, cannon: 0xffa53b, frost: 0x6cecff, fire: 0xff5438, thunder: 0x9b7cff, water: 0x38bdf8 }
  const accentColors: Record<TowerKind, number> = { archer: 0xeaffb8, cannon: 0xffe08a, frost: 0xe8fdff, fire: 0xffd45c, thunder: 0xe9ddff, water: 0xe0f7ff }
  const effectMaterial = (opacity: number) => new THREE.MeshBasicMaterial({ color: colors[tower.kind], transparent: true, opacity, depthWrite: false, toneMapped: false })

  // Mỗi cấp thêm một lớp kiến trúc cố định, giúp nhận biết level ngay cả khi
  // tower đang không tấn công và các particle nằm ngoài góc camera.
  const baseBand = new THREE.Mesh(new THREE.TorusGeometry(.45, .035, 7, 36), effectMaterial(.88))
  baseBand.name = 'levelFxBaseBand'; baseBand.rotation.x = Math.PI / 2; baseBand.position.y = .16; effect.add(baseBand)

  // Ấn cấp và hào quang tồn tại vĩnh viễn, giúp phân biệt level 2/3 cả khi
  // tháp đang đứng yên. Số tinh thể tương ứng trực tiếp với cấp hiện tại.
  const levelAura = new THREE.Mesh(
    new THREE.RingGeometry(.5, tower.level >= 3 ? .59 : .56, 48),
    effectMaterial(tower.level >= 3 ? .52 : .34),
  )
  levelAura.name = 'levelFxAura'; levelAura.rotation.x = -Math.PI / 2; levelAura.position.y = .08; effect.add(levelAura)
  for (let index = 0; index < tower.level; index++) {
    const badge = new THREE.Mesh(
      new THREE.OctahedronGeometry(tower.level >= 3 ? .075 : .06, 0),
      new THREE.MeshBasicMaterial({ color: colors[tower.kind], transparent: true, opacity: tower.level >= 3 ? 1 : .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    badge.name = 'levelFxBadge'
    badge.userData.index = index
    badge.userData.count = tower.level
    effect.add(badge)

    const badgeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: getFrostGlowTexture(), color: colors[tower.kind], transparent: true, opacity: tower.level >= 3 ? .55 : .38, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    badgeGlow.name = 'levelFxBadgeGlow'; badgeGlow.userData.index = index; badgeGlow.userData.count = tower.level
    badgeGlow.scale.setScalar(tower.level >= 3 ? .28 : .22); effect.add(badgeGlow)
  }
  const wispCount = tower.level >= 3 ? 9 : 5
  for (let index = 0; index < wispCount; index++) {
    const wisp = new THREE.Mesh(
      new THREE.OctahedronGeometry(index % 3 === 0 ? .022 : .015, 0),
      new THREE.MeshBasicMaterial({ color: index % 2 ? colors[tower.kind] : accentColors[tower.kind], transparent: true, opacity: index % 3 === 0 ? .92 : .68, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    wisp.name = 'levelFxWisp'; wisp.userData.index = index; wisp.userData.count = wispCount
    wisp.userData.phase = index / wispCount * Math.PI * 2; effect.add(wisp)

    const wispGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: getFrostGlowTexture(), color: index % 2 ? colors[tower.kind] : accentColors[tower.kind], transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    wispGlow.name = 'levelFxWispGlow'; wispGlow.userData.index = index; wispGlow.userData.phase = wisp.userData.phase
    wispGlow.scale.setScalar(index % 3 === 0 ? .15 : .11); effect.add(wispGlow)

    const trail = new THREE.Mesh(
      new THREE.SphereGeometry(.014, 6, 5),
      new THREE.MeshBasicMaterial({ color: accentColors[tower.kind], transparent: true, opacity: tower.level >= 3 ? .42 : .3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    trail.name = 'levelFxWispTrail'; trail.userData.index = index; trail.userData.phase = wisp.userData.phase; effect.add(trail)
  }
  if (tower.level >= 3) {
    const upperBand = new THREE.Mesh(new THREE.TorusGeometry(.36, .025, 7, 36), effectMaterial(.92))
    upperBand.name = 'levelFxUpperBand'; upperBand.rotation.x = Math.PI / 2; upperBand.position.y = .34; effect.add(upperBand)
    for (let index = 0; index < 4; index++) {
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(.065, 0), effectMaterial(.96)); const angle = index * Math.PI / 2
      crest.name = 'levelFxCrest'; crest.userData.index = index; crest.position.set(Math.cos(angle) * .39, .38, Math.sin(angle) * .39); crest.scale.y = 1.65; effect.add(crest)
    }
  }

  if (tower.kind === 'archer') {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(.43, .014, 6, 40), effectMaterial(.55)); orbit.name = 'levelFxOrbit'; orbit.rotation.x = Math.PI / 2; orbit.position.y = .22; effect.add(orbit)
    if (tower.level >= 3) {
      const crown = new THREE.Mesh(new THREE.TorusGeometry(.2, .018, 6, 32), effectMaterial(.72)); crown.name = 'levelFxCrown'; crown.rotation.x = Math.PI / 2; crown.position.y = 1.55; effect.add(crown)
      for (let index = 0; index < 3; index++) {
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(.035, .16, 5), effectMaterial(.82)); const angle = index / 3 * Math.PI * 2
        arrow.name = 'levelFxArrow'; arrow.userData.angle = angle; arrow.userData.index = index; effect.add(arrow)
      }
    }
  } else if (tower.kind === 'cannon') {
    const ringCount = tower.level >= 3 ? 2 : 1
    for (let index = 0; index < ringCount; index++) {
      const chargeRing = new THREE.Mesh(new THREE.RingGeometry(.4 + index * .14, .45 + index * .14, 40), effectMaterial(.42 - index * .08))
      chargeRing.name = 'levelFxCharge'; chargeRing.userData.index = index; chargeRing.rotation.x = -Math.PI / 2; chargeRing.position.y = .13; effect.add(chargeRing)
    }
    if (tower.level >= 3) {
      for (let index = 0; index < 4; index++) {
        const ember = new THREE.Mesh(new THREE.DodecahedronGeometry(.025, 0), effectMaterial(.78)); const angle = index * Math.PI / 2
        ember.name = 'levelFxEmber'; ember.userData.angle = angle; ember.position.set(Math.cos(angle) * .42, .35, Math.sin(angle) * .42); effect.add(ember)
      }
    }
  } else if (tower.kind === 'frost') {
    const count = tower.level >= 3 ? 6 : 3
    const ringCount = tower.level >= 3 ? 2 : 1
    for (let index = 0; index < ringCount; index++) {
      const iceRing = new THREE.Mesh(new THREE.TorusGeometry(.31 + index * .13, .012, 6, 36), effectMaterial(.4 - index * .08))
      iceRing.name = 'levelFxIceRing'; iceRing.userData.index = index; iceRing.rotation.x = Math.PI / 2; iceRing.position.y = .58 + index * .28; effect.add(iceRing)
    }
    for (let index = 0; index < count; index++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.035, 0), effectMaterial(.68)); const angle = index / count * Math.PI * 2
      shard.name = 'levelFxShard'; shard.userData.angle = angle; shard.userData.index = index; effect.add(shard)
    }
  } else if (tower.kind === 'fire') {
    const count = tower.level >= 3 ? 6 : 3
    const ringCount = tower.level >= 3 ? 2 : 1
    for (let index = 0; index < ringCount; index++) {
      const fireRing = new THREE.Mesh(new THREE.TorusGeometry(.3 + index * .14, .016, 6, 36), effectMaterial(.48 - index * .09))
      fireRing.name = 'levelFxFireRing'; fireRing.userData.index = index; fireRing.rotation.x = Math.PI / 2; fireRing.position.y = .34 + index * .32; effect.add(fireRing)
    }
    for (let index = 0; index < count; index++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(.035, .14, 6), effectMaterial(.58)); const angle = index / count * Math.PI * 2
      flame.name = 'levelFxFlame'; flame.userData.angle = angle; flame.userData.index = index; effect.add(flame)
    }
  } else {
    const count = tower.level >= 3 ? 8 : 4
    const ringCount = tower.level >= 3 ? 2 : 1
    for (let index = 0; index < ringCount; index++) {
      const electricRing = new THREE.Mesh(new THREE.TorusGeometry(.31 + index * .13, .013, 6, 36), effectMaterial(.52 - index * .1))
      electricRing.name = 'levelFxIceRing'; electricRing.userData.index = index; electricRing.rotation.x = Math.PI / 2; electricRing.position.y = .62 + index * .3; effect.add(electricRing)
    }
    for (let index = 0; index < count; index++) {
      const spark = new THREE.Mesh(new THREE.TetrahedronGeometry(.036, 0), effectMaterial(.8)); const angle = index / count * Math.PI * 2
      spark.name = 'levelFxShard'; spark.userData.angle = angle; spark.userData.index = index; effect.add(spark)
    }
  }
  group.add(effect)
}

/** Animate các chi tiết nâng cấp phát sáng mà không tạo thêm object mỗi frame. */
function animateTowerLevelAppearance(model: THREE.Group, tower: Tower, elapsed: number) {
  const effect = model.getObjectByName('towerLevelEffect') as THREE.Group | undefined
  if (!effect) return
  effect.children.forEach((child) => {
    if (child.name === 'levelFxOrbit') child.rotation.z = elapsed * .7
    else if (child.name === 'levelFxBaseBand') { const pulse = 1 + Math.sin(elapsed * 2.2 + tower.id) * .018; child.scale.setScalar(pulse) }
    else if (child.name === 'levelFxAura') { child.rotation.z = elapsed * (tower.level >= 3 ? .8 : .45); child.scale.setScalar(1 + Math.sin(elapsed * 3 + tower.id) * .055) }
    else if (child.name === 'levelFxBadge') {
      const index = Number(child.userData.index); const count = Number(child.userData.count)
      const angle = index / count * Math.PI * 2 - elapsed * (tower.level >= 3 ? .9 : .62)
      const radius = tower.level >= 3 ? .54 : .48
      child.position.set(Math.cos(angle) * radius, .52 + Math.sin(elapsed * 3.2 + index * 2.1) * .09, Math.sin(angle) * radius)
      child.rotation.x = elapsed * 1.4 + index; child.rotation.y = elapsed * 2 + index
      const shimmer = 1 + Math.sin(elapsed * 6 + index * 2.4) * .22
      child.scale.setScalar(shimmer)
    }
    else if (child.name === 'levelFxBadgeGlow') {
      const index = Number(child.userData.index); const count = Number(child.userData.count)
      const angle = index / count * Math.PI * 2 - elapsed * (tower.level >= 3 ? .9 : .62)
      const radius = tower.level >= 3 ? .54 : .48
      child.position.set(Math.cos(angle) * radius, .52 + Math.sin(elapsed * 3.2 + index * 2.1) * .09, Math.sin(angle) * radius)
      const glowScale = (tower.level >= 3 ? .29 : .23) * (1 + Math.sin(elapsed * 5.5 + index) * .16)
      child.scale.set(glowScale, glowScale, 1)
    }
    else if (child.name === 'levelFxWisp') {
      const index = Number(child.userData.index); const phase = Number(child.userData.phase)
      const layer = index % 3
      const direction = layer === 1 ? -1 : 1
      const angle = phase + elapsed * direction * (.55 + layer * .17)
      const radius = .38 + layer * .105 + Math.sin(elapsed * 1.8 + phase) * .035
      const baseY = .38 + layer * .3
      child.position.set(Math.cos(angle) * radius, baseY + Math.sin(elapsed * (1.9 + layer * .25) + phase * 2) * .14, Math.sin(angle) * radius)
      child.scale.setScalar(.72 + Math.sin(elapsed * 7 + index) * .25 + (tower.level - 2) * .18)
      child.rotation.x = elapsed * (2.6 + layer * .4) + phase; child.rotation.y = -elapsed * 3.2 + index
    }
    else if (child.name === 'levelFxWispGlow' || child.name === 'levelFxWispTrail') {
      const index = Number(child.userData.index); const phase = Number(child.userData.phase)
      const layer = index % 3
      const direction = layer === 1 ? -1 : 1
      const angle = phase + elapsed * direction * (.55 + layer * .17)
      const radius = .38 + layer * .105 + Math.sin(elapsed * 1.8 + phase) * .035
      const baseY = .38 + layer * .3
      const y = baseY + Math.sin(elapsed * (1.9 + layer * .25) + phase * 2) * .14
      if (child.name === 'levelFxWispGlow') {
        child.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
        const glowSize = (index % 3 === 0 ? .16 : .115) * (1 + Math.sin(elapsed * 6.5 + index) * .18 + (tower.level - 2) * .12)
        child.scale.set(glowSize, glowSize, 1)
      } else {
        const trailingAngle = angle - direction * .075
        child.position.set(Math.cos(trailingAngle) * radius, y - .012, Math.sin(trailingAngle) * radius)
        child.rotation.y = -trailingAngle
        const trailPulse = 1 + Math.sin(elapsed * 5.2 + index) * .2
        child.scale.set(.55 * trailPulse, .55 * trailPulse, (tower.level >= 3 ? 3.2 : 2.5) * trailPulse)
      }
    }
    else if (child.name === 'levelFxUpperBand') child.rotation.z = -elapsed * .32
    else if (child.name === 'levelFxCrest') { const index = Number(child.userData.index); child.rotation.y = elapsed * 1.2 + index; child.position.y = .38 + Math.sin(elapsed * 2.8 + index) * .025 }
    else if (child.name === 'levelFxCrown') { child.rotation.z = -elapsed; child.position.y = 1.55 + Math.sin(elapsed * 2.4) * .025 }
    else if (child.name === 'levelFxArrow') {
      const index = Number(child.userData.index); const angle = Number(child.userData.angle) - elapsed * .8
      child.position.set(Math.cos(angle) * .31, 1.28 + Math.sin(elapsed * 3 + index) * .06, Math.sin(angle) * .31); child.rotation.y = -angle
    } else if (child.name === 'levelFxCharge') {
      const index = Number(child.userData.index); const pulse = 1 + Math.sin(elapsed * (3.4 + index * .5) + tower.id) * .07
      child.scale.setScalar(pulse); child.rotation.z = elapsed * (index ? -.45 : .35)
    }
    else if (child.name === 'levelFxEmber') {
      const angle = Number(child.userData.angle) + elapsed * .75; child.position.set(Math.cos(angle) * .42, .34 + Math.sin(elapsed * 3 + angle) * .08, Math.sin(angle) * .42)
    } else if (child.name === 'levelFxShard') {
      const index = Number(child.userData.index); const angle = Number(child.userData.angle) + elapsed * .62
      child.position.set(Math.cos(angle) * .4, .72 + Math.sin(elapsed * 2.2 + index) * .12, Math.sin(angle) * .4); child.rotation.y = elapsed * 1.8 + index
    } else if (child.name === 'levelFxIceRing') {
      const index = Number(child.userData.index); child.rotation.z = elapsed * (index ? -.42 : .55); child.scale.setScalar(1 + Math.sin(elapsed * 2.5 + index) * .035)
    } else if (child.name === 'levelFxFlame') {
      const index = Number(child.userData.index); const angle = Number(child.userData.angle) + elapsed * .48
      child.position.set(Math.cos(angle) * .36, .48 + Math.sin(elapsed * 4.2 + index) * .1, Math.sin(angle) * .36); child.scale.y = .8 + Math.sin(elapsed * 6 + index) * .25
    } else if (child.name === 'levelFxFireRing') {
      const index = Number(child.userData.index); child.rotation.z = elapsed * (index ? -1.05 : .8); child.scale.setScalar(1 + Math.sin(elapsed * 4 + index) * .05)
    }
  })
}

/** Tạo sẵn tia điện ba lớp cho mỗi đoạn chuỗi để có lõi dày và quầng sáng. */
function createThunderBeamEffect() {
  const effect = new THREE.Group()
  effect.name = 'thunderBeamEffect'
  effect.visible = false
  for (let segmentIndex = 0; segmentIndex < 5; segmentIndex++) {
    for (const lane of [-2, -1, 0, 1, 2]) {
      const positions = new Float32Array(10 * 3)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const core = lane === 0
      const innerGlow = Math.abs(lane) === 1
      const material = new THREE.LineBasicMaterial({ color: core ? 0xffffff : innerGlow ? 0xc4b5fd : 0x7c3aed, transparent: true, opacity: core ? 1 : innerGlow ? .58 : .32, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
      const beam = new THREE.Line(geometry, material)
      beam.name = 'thunderChainBeam'; beam.userData.segmentIndex = segmentIndex; beam.userData.lane = lane; beam.frustumCulled = false; beam.renderOrder = core ? 11 : 10; effect.add(beam)
    }
    for (let branchIndex = 0; branchIndex < 2; branchIndex++) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3))
      const material = new THREE.LineBasicMaterial({ color: branchIndex ? 0x8b5cf6 : 0xc4b5fd, transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
      const branch = new THREE.Line(geometry, material)
      branch.name = 'thunderBranchBeam'; branch.userData.segmentIndex = segmentIndex; branch.userData.branchIndex = branchIndex; branch.frustumCulled = false; branch.renderOrder = 9; effect.add(branch)
    }
  }
  return effect
}

/** Clone đúng template tower, bind node điều khiển và thêm instance vào scene. */
function createTowerModel(tower: Tower) {
  const template = towerTemplates.get(tower.kind)
  if (!template) throw new Error(`Missing tower template: ${tower.kind}`)
  const group = template.clone(true)
  bindTowerParts(group)
  setTowerScale(group, tower.level)
  applyTowerLevelAppearance(group, tower)
  if (tower.kind === 'thunder') group.add(createThunderBeamEffect())
  group.position.copy(worldPosition(tower.x, tower.y)); group.position.y = .05
  group.userData.shotSequence = tower.shotSequence; group.userData.firedAt = 0; group.userData.level = tower.level
  scene!.add(group); return group
}

/** Tạo burst ngắn tại tower vừa lên cấp và lưu thời điểm sinh để tự hủy. */
function createTowerUpgradeEffect(tower: Tower, now: number) {
  const existing = towerUpgradeEffects.get(tower.id)
  if (existing) disposeObject(existing.group)
  const group = new THREE.Group()
  group.position.copy(worldPosition(tower.x, tower.y)); group.position.y = .1
  const colors: Record<TowerKind, number> = { archer: 0x8ee85e, cannon: 0xffa83d, frost: 0x6ee7ff, fire: 0xff593d, thunder: 0xa78bfa, water: 0x38bdf8 }
  const material = (opacity = .9) => new THREE.MeshBasicMaterial({ color: colors[tower.kind], transparent: true, opacity, depthWrite: false, toneMapped: false })

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .42, 2.4, 24, 1, true), material(.3))
  beam.name = 'upgradeBeam'; beam.position.y = 1.05; group.add(beam)
  const flash = new THREE.Mesh(new THREE.SphereGeometry(.25, 18, 12), material(.95))
  flash.name = 'upgradeFlash'; flash.position.y = .78; group.add(flash)
  for (let index = 0; index < 3; index++) {
    const shockwave = new THREE.Mesh(new THREE.RingGeometry(.24, .31, 48), material(.88 - index * .16))
    shockwave.name = 'upgradeShockwave'; shockwave.rotation.x = -Math.PI / 2; shockwave.position.y = .08; shockwave.userData.delay = index * .14; group.add(shockwave)
  }

  if (tower.kind === 'archer') {
    for (let index = 0; index < 3; index++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.38 + index * .1, .018, 6, 40), material(.72 - index * .12))
      ring.name = 'upgradeRing'; ring.rotation.set(Math.PI / 2, index * .5, index * .35); ring.userData.delay = index * .08; group.add(ring)
    }
  } else if (tower.kind === 'cannon') {
    for (let index = 0; index < 2; index++) {
      const wave = new THREE.Mesh(new THREE.RingGeometry(.28, .34, 48), material(.82 - index * .18))
      wave.name = 'upgradeWave'; wave.rotation.x = -Math.PI / 2; wave.position.y = .02; wave.userData.delay = index * .18; group.add(wave)
    }
  } else if (tower.kind === 'frost') {
    for (let index = 0; index < 8; index++) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), material(.88))
      const angle = index / 8 * Math.PI * 2
      crystal.name = 'upgradeCrystal'; crystal.userData.angle = angle; crystal.position.set(Math.cos(angle) * .28, .38, Math.sin(angle) * .28); group.add(crystal)
    }
  } else {
    for (let index = 0; index < 7; index++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(.055, .22, 7), material(.86))
      const angle = index / 7 * Math.PI * 2
      flame.name = 'upgradeFlame'; flame.userData.angle = angle; flame.position.set(Math.cos(angle) * .25, .16, Math.sin(angle) * .25); group.add(flame)
    }
  }
  group.renderOrder = 8; scene!.add(group)
  towerUpgradeEffects.set(tower.id, { group, bornAt: now, kind: tower.kind })
}

/** Cập nhật tiến trình, opacity và giải phóng các effect nâng cấp đã kết thúc. */
function syncTowerUpgradeEffects(now: number) {
  for (const [towerId, effect] of towerUpgradeEffects) {
    const progress = (now - effect.bornAt) / 1550
    if (progress >= 1) { disposeObject(effect.group); towerUpgradeEffects.delete(towerId); continue }
    const fade = 1 - THREE.MathUtils.smoothstep(progress, .45, 1)
    effect.group.children.forEach((child, index) => {
      const item = child as THREE.Mesh
      const itemMaterial = item.material as THREE.MeshBasicMaterial
      itemMaterial.opacity = fade * (.7 + index % 3 * .1)
      if (item.name === 'upgradeBeam') {
        item.scale.set(1 + progress * 1.5, 1, 1 + progress * 1.5)
        itemMaterial.opacity = fade * .34
        item.rotation.y += .035
      } else if (item.name === 'upgradeFlash') {
        const burst = Math.sin(Math.min(1, progress * 2.2) * Math.PI)
        item.scale.setScalar(.3 + burst * 2.5)
        itemMaterial.opacity = fade * .82
      } else if (item.name === 'upgradeShockwave') {
        const local = Math.max(0, progress - Number(item.userData.delay))
        item.scale.setScalar(.35 + local * 4.2)
        itemMaterial.opacity = local > 0 ? fade * .72 : 0
      } else if (item.name === 'upgradeRing') {
        const local = Math.max(0, progress - Number(item.userData.delay)); item.scale.setScalar(.55 + local * 1.5); item.rotation.z += .045 + index * .012
      } else if (item.name === 'upgradeWave') {
        const local = Math.max(0, progress - Number(item.userData.delay)); item.scale.setScalar(.45 + local * 3.1)
      } else if (item.name === 'upgradeCrystal') {
        const angle = Number(item.userData.angle); const radius = .28 + progress * .68
        item.position.set(Math.cos(angle) * radius, .38 + Math.sin(progress * Math.PI) * .8, Math.sin(angle) * radius); item.rotation.y += .09
      } else if (item.name === 'upgradeFlame') {
        const angle = Number(item.userData.angle); const radius = .25 + progress * .55
        item.position.set(Math.cos(angle) * radius, .16 + progress * 1.15, Math.sin(angle) * radius); item.scale.setScalar(1 + Math.sin(progress * Math.PI) * .8)
      }
    })
  }
}

/** Gỡ preview xây dựng và dispose material trong suốt được clone riêng. */
function removeTowerPreview() {
  if (!towerPreviewModel) return
  towerPreviewModel.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(material => material.dispose())
  })
  towerPreviewModel.removeFromParent()
  towerPreviewModel = null
  towerPreviewKind = null
}

/** Tạo ghost tower bán trong suốt để theo ô hover trước khi đặt công trình. */
function createTowerPreview(kind: TowerKind) {
  removeTowerPreview()
  const template = towerTemplates.get(kind)
  if (!template || !scene) return
  const preview = template.clone(true)
  preview.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return
    const makeTransparent = (original: THREE.Material) => {
      const material = original.clone()
      material.onBeforeCompile = original.onBeforeCompile
      material.customProgramCacheKey = original.customProgramCacheKey
      material.transparent = true
      material.opacity = Math.min(material.opacity, .42)
      material.depthWrite = false
      return material
    }
    child.material = Array.isArray(child.material) ? child.material.map(makeTransparent) : makeTransparent(child.material)
    child.castShadow = false
    child.receiveShadow = false
  })
  setTowerScale(preview, 1)
  preview.visible = false
  preview.renderOrder = 4
  scene.add(preview)
  towerPreviewModel = preview
  towerPreviewKind = kind
}

// ===== Enemy GLB, boss class và hiệu ứng trạng thái =========================
/** Vẽ badge trạng thái mang biểu tượng của tháp gây hiệu ứng. */
function getEnemyStatusBadgeTexture(kind: 'fire' | 'frost' | 'water') {
  const cached = enemyStatusBadgeTextures.get(kind)
  if (cached) return cached
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Không thể tạo badge trạng thái enemy.')
  context.fillStyle = kind === 'fire' ? '#7f1d1d' : kind === 'water' ? '#0c4a6e' : '#075985'
  context.strokeStyle = kind === 'fire' ? '#fdba74' : kind === 'water' ? '#7dd3fc' : '#bae6fd'
  context.lineWidth = 6
  context.beginPath(); context.arc(48, 48, 40, 0, Math.PI * 2); context.fill(); context.stroke()
  context.strokeStyle = '#fff'; context.fillStyle = '#fff'; context.lineWidth = 7; context.lineCap = 'round'; context.lineJoin = 'round'
  if (kind === 'fire') {
    context.beginPath(); context.moveTo(49, 18); context.bezierCurveTo(44, 34, 27, 39, 31, 58); context.bezierCurveTo(34, 74, 61, 79, 68, 58); context.bezierCurveTo(72, 43, 58, 33, 49, 18); context.fill()
    context.fillStyle = '#fbbf24'; context.beginPath(); context.moveTo(49, 42); context.bezierCurveTo(42, 51, 40, 61, 49, 68); context.bezierCurveTo(60, 61, 58, 51, 49, 42); context.fill()
  } else if (kind === 'frost') {
    for (let index = 0; index < 3; index++) {
      context.save(); context.translate(48, 48); context.rotate(index * Math.PI / 3); context.beginPath(); context.moveTo(-25, 0); context.lineTo(25, 0); context.moveTo(16, -8); context.lineTo(25, 0); context.lineTo(16, 8); context.moveTo(-16, -8); context.lineTo(-25, 0); context.lineTo(-16, 8); context.stroke(); context.restore()
    }
  } else {
    for (let index = 0; index < 3; index++) {
      const y = 34 + index * 13
      context.beginPath(); context.moveTo(20, y); context.bezierCurveTo(30, y - 9, 39, y + 9, 49, y); context.bezierCurveTo(59, y - 9, 67, y + 9, 76, y); context.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  enemyStatusBadgeTextures.set(kind, texture)
  return texture
}

/** Đặt badge lửa/băng ngay phía trên thanh máu của enemy. */
function addEnemyStatusBadges(group: THREE.Group) {
  const badges = new THREE.Group(); badges.name = 'enemyStatusBadges'
  for (const [index, kind] of (['fire', 'frost', 'water'] as const).entries()) {
    const material = new THREE.SpriteMaterial({ map: getEnemyStatusBadgeTexture(kind), transparent: true, depthWrite: false, depthTest: false, toneMapped: false })
    const badge = new THREE.Sprite(material); badge.name = `enemyStatusBadge-${kind}`; badge.position.set(-.13 + index * .26, 2.08, .1); badge.scale.set(.2, .2, 1); badge.visible = false; badge.renderOrder = 12; badges.add(badge)
  }
  group.add(badges)
  group.userData.statusBadges = badges
}

/** Clone model theo bossClass, gắn cặp vũ khí vào socket và khởi chạy Walking_A. */
function createEnemyModel(enemy: Enemy) {
  console.log(enemy)
  const characterTemplate = enemy.kind === 'boss' && enemy.bossClass
    ? bossEnemyTemplates.get(enemy.bossClass)
    : riggedEnemyTemplate
  if (!characterTemplate) throw new Error(`Model ${enemy.bossClass ?? 'knight'} chưa được tải`)
  const group = cloneSkeleton(characterTemplate) as THREE.Group
  const attachEquipment = (slotName: string, template: THREE.Object3D | null, name: string) => {
    const slot = group.getObjectByName(slotName)
    if (!slot || !template) return
    const item = template.clone(true)
    item.name = name
    item.position.set(
      Number(template.userData.attachPositionX) || 0,
      Number(template.userData.attachPositionY) || 0,
      Number(template.userData.attachPositionZ) || 0,
    )
    // Một số asset bất đối xứng (như rìu Barbarian) cần orientation riêng khi
    // chuyển từ hệ trục asset sang hệ trục hand socket.
    item.rotation.set(
      Number(template.userData.attachRotationX) || 0,
      Number(template.userData.attachRotationY) || 0,
      Number(template.userData.attachRotationZ) || 0,
    )
    item.scale.setScalar(1)
    slot.add(item)
  }
  const bossEquipment = enemy.kind === 'boss' && enemy.bossClass
    ? bossEquipmentTemplates.get(enemy.bossClass)
    : null
  // GLTFLoader loại dấu chấm trong tên bone: handslot.r/l -> handslotr/l.
  attachEquipment('handslotr', bossEquipment?.right ?? enemySwordTemplate, 'enemyRightWeapon')
  attachEquipment('handslotl', bossEquipment?.left ?? enemyShieldTemplate, 'enemyLeftWeapon')
  const health = group.getObjectByName('enemyHealth') as THREE.Mesh
  if (enemy.kind === 'boss') {
    health.material = (health.material as THREE.Material).clone()
    if (health.material instanceof THREE.MeshStandardMaterial) { health.material.color.setHex(0xe34b38); health.material.emissive.setHex(0x54130c) }
  }
  const mixer = new THREE.AnimationMixer(group)
  const walk = riggedEnemyAnimations.find(clip => clip.name === 'Walking_A') ?? riggedEnemyAnimations[0]
  if (walk) mixer.clipAction(walk).play()
  group.userData.health = health
  group.userData.mixer = mixer
  group.userData.isSkinnedCharacter = true
  group.userData.isBoss = enemy.kind === 'boss'
  addEnemyStatusBadges(group)
  scene!.add(group)
  return group
}

/** Dừng mixer, dispose skeleton/effect sở hữu riêng rồi gỡ enemy khỏi scene. */
function disposeEnemyModel(model: THREE.Group) {
  const mixer = model.userData.mixer as THREE.AnimationMixer | undefined
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model) }
  const statusBadges = model.userData.statusBadges as THREE.Group | undefined
  statusBadges?.traverse((child) => { if (child instanceof THREE.Sprite) child.material.dispose() })
  const skeletons = new Set<THREE.Skeleton>()
  model.traverse((child) => { if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton) })
  skeletons.forEach(skeleton => skeleton.dispose())
  ;(model.userData.skeleton as THREE.Skeleton | undefined)?.dispose()
  disposeObject(model, false)
}

/** Tải toàn bộ đội hình, animation và trang bị trước khi phát sự kiện scene ready. */
async function loadRiggedEnemy() {
  try {
    const loader = new GLTFLoader()
    const kitRoot = '/models/games/tower-defense/kit/adventure'
    const loadKitAsset = (relativePath: string) => loader.loadAsync(`${kitRoot}/${relativePath}`)
    const prepareEquipment = (item: THREE.Object3D) => {
      item.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.receiveShadow = true
      })
      item.position.set(0, 0, 0)
      item.rotation.set(0, 0, 0)
      item.scale.setScalar(1)
      return item
    }
    const prepareCharacter = (character: THREE.Group) => {
      character.rotation.y = 0
      character.scale.setScalar(.78)
      character.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.receiveShadow = true
        const cloneMaterial = (source: THREE.Material) => source.clone()
        child.material = Array.isArray(child.material) ? child.material.map(cloneMaterial) : cloneMaterial(child.material)
      })
      const wrapper = new THREE.Group()
      const healthBack = mesh(new THREE.PlaneGeometry(.78, .07), 0x401b18); healthBack.position.set(0, 1.9, .05); healthBack.rotation.x = -1
      const health = mesh(new THREE.PlaneGeometry(.74, .045), 0x78cf58, { emissive: 0x183d10 }); health.position.set(0, 1.905, .085); health.rotation.x = -1; health.name = 'enemyHealth'
      wrapper.add(character, healthBack, health)
      return wrapper
    }

    const [knight, barbarian, mage, ranger, rogue, movement, sword, knightShield, axe, barbarianShield, staff, spellbook, bow, arrow, dagger] = await Promise.all([
      loadKitAsset('Characters/gltf/Knight.glb'),
      loadKitAsset('Characters/gltf/Barbarian.glb'),
      loadKitAsset('Characters/gltf/Mage.glb'),
      loadKitAsset('Characters/gltf/Ranger.glb'),
      loadKitAsset('Characters/gltf/Rogue.glb'),
      loadKitAsset('Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb'),
      loadKitAsset('Assets/gltf/sword_1handed.gltf'),
      loadKitAsset('Assets/gltf/shield_round_color.gltf'),
      loadKitAsset('Assets/gltf/axe_1handed.gltf'),
      loadKitAsset('Assets/gltf/shield_round_barbarian.gltf'),
      loadKitAsset('Assets/gltf/staff.gltf'),
      loadKitAsset('Assets/gltf/spellbook_open.gltf'),
      loadKitAsset('Assets/gltf/bow_withString.gltf'),
      loadKitAsset('Assets/gltf/arrow_bow.gltf'),
      loadKitAsset('Assets/gltf/dagger.gltf'),
    ])
    if (!scene || !host.value?.isConnected) return

    riggedEnemyTemplate = prepareCharacter(knight.scene)
    bossEnemyTemplates.set('knight', riggedEnemyTemplate)
    bossEnemyTemplates.set('barbarian', prepareCharacter(barbarian.scene))
    bossEnemyTemplates.set('mage', prepareCharacter(mage.scene))
    bossEnemyTemplates.set('ranger', prepareCharacter(ranger.scene))
    bossEnemyTemplates.set('rogue', prepareCharacter(rogue.scene))
    riggedEnemyAnimations = movement.animations

    enemySwordTemplate = prepareEquipment(sword.scene)
    enemyShieldTemplate = prepareEquipment(knightShield.scene)
    bossEquipmentTemplates.set('knight', { right: enemySwordTemplate, left: enemyShieldTemplate })
    const barbarianAxe = prepareEquipment(axe.scene)
    // Walking_A đã dựng trục Y của socket thẳng đứng; chỉ lật lưỡi rìu ra ngoài.
    barbarianAxe.userData.attachRotationY = Math.PI
    bossEquipmentTemplates.set('barbarian', { right: barbarianAxe, left: prepareEquipment(barbarianShield.scene) })
    const mageStaff = prepareEquipment(staff.scene)
    const mageBook = prepareEquipment(spellbook.scene)
    // Đưa pháp tuyến sách về trục Y và nâng tâm sách lên khỏi lòng bàn tay.
    mageBook.userData.attachRotationX = -Math.PI / 2
    mageBook.userData.attachPositionY = .2
    mageBook.userData.attachPositionZ = .08
    bossEquipmentTemplates.set('mage', { right: mageStaff, left: mageBook })
    const rangerArrow = prepareEquipment(arrow.scene)
    rangerArrow.userData.attachRotationX = -Math.PI / 2
    // Origin của arrow nằm giữa thân; giữ đúng tâm để bàn tay không nắm sát đầu tên.
    rangerArrow.userData.attachPositionY = 0
    const rangerBow = prepareEquipment(bow.scene)
    rangerBow.userData.attachRotationX = Math.PI / 2
    rangerBow.userData.attachRotationZ = Math.PI
    // Origin của bow nằm giữa thân; đặt tại socket để tay trái nắm đúng tay cầm giữa.
    rangerBow.userData.attachPositionY = 0
    // Ranger cầm giữa tên bằng tay phải và giữa cung bằng tay trái.
    bossEquipmentTemplates.set('ranger', { right: rangerArrow, left: rangerBow })
    const rogueDagger = prepareEquipment(dagger.scene)
    bossEquipmentTemplates.set('rogue', { right: rogueDagger, left: rogueDagger })

    for (const model of enemyModels.values()) disposeEnemyModel(model)
    enemyModels.clear()
  } catch (error) {
    console.error('[Kingdom Defense] Không thể tải nhân vật hoặc trang bị KayKit.', error)
  }
}

// ===== Model GLB của tháp và projectile/impact ===============================
/** Tải GLB tháp băng, chuẩn hóa material và thay placeholder đang dùng trong scene. */
async function loadFrostTower() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/games/tower-defense/frost-tower-3d.glb')
    if (!scene || !host.value?.isConnected) return
    const template = new THREE.Group()
    template.name = 'FrostTower3D'
    template.userData.frostEffectCenterY = 1.77
    const source = gltf.scene
    source.scale.set(1.5, 2.1, 1.5)
    source.position.y = 1.053
    source.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.geometry.getAttribute('normal')) child.geometry.computeVertexNormals()
      child.castShadow = true
      child.receiveShadow = true
      const tuneMaterial = (original: THREE.Material) => {
        const material = original.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) {
            material.map.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 8)
            material.map.needsUpdate = true
          }
          material.needsUpdate = true
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(tuneMaterial) : tuneMaterial(child.material)
    })
    template.add(source)
    decorateFrostTower(template)
    template.add(groundShadow(.42))
    optimizeTemplateShadows(template)

    const previousTemplate = towerTemplates.get('frost')
    if (towerPreviewKind === 'frost') removeTowerPreview()
    for (const [id, model] of towerModels) {
      const kind = props.towers.find(tower => tower.id === id)?.kind
      if (kind !== 'frost') continue
      disposeObject(model, false)
      towerModels.delete(id)
    }
    if (previousTemplate) disposeObject(previousTemplate)
    towerTemplates.set('frost', template)
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải frost-tower-3d.glb, dùng placeholder dự phòng.', error)
  }
}

/** Tải model tháp lửa riêng, căn giữa chân model và thay placeholder đang hiển thị. */
async function loadFireTower() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/games/tower-defense/fire-tower.glb')
    if (!scene || !host.value?.isConnected) return
    const template = new THREE.Group()
    template.name = 'FireTower3D'
    const source = gltf.scene
    source.updateMatrixWorld(true)
    const sourceBounds = new THREE.Box3().setFromObject(source)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())
    if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0) throw new Error('Model tháp lửa không có kích thước hợp lệ.')
    // Tháp băng cao xấp xỉ 2.1 đơn vị sau transform; chuẩn hóa tháp lửa cùng cỡ.
    source.scale.multiplyScalar(2.1 / sourceSize.y)
    source.updateMatrixWorld(true)
    const fittedBounds = new THREE.Box3().setFromObject(source)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    source.position.x -= fittedCenter.x
    source.position.z -= fittedCenter.z
    source.position.y -= fittedBounds.min.y
    source.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.geometry.getAttribute('normal')) child.geometry.computeVertexNormals()
      child.castShadow = true
      child.receiveShadow = true
      const tuneMaterial = (original: THREE.Material) => {
        const material = original.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) {
            material.map.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 8)
            material.map.needsUpdate = true
          }
          material.needsUpdate = true
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(tuneMaterial) : tuneMaterial(child.material)
    })
    template.add(source)
    decorateElementalTowerGlow(template, 'fire')
    template.add(groundShadow(.42))
    optimizeTemplateShadows(template)

    const previousTemplate = towerTemplates.get('fire')
    if (towerPreviewKind === 'fire') removeTowerPreview()
    for (const [id, model] of towerModels) {
      if (props.towers.find(tower => tower.id === id)?.kind !== 'fire') continue
      disposeObject(model, false)
      towerModels.delete(id)
    }
    if (previousTemplate) disposeObject(previousTemplate)
    towerTemplates.set('fire', template)
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải fire-tower.glb, dùng placeholder dự phòng.', error)
  }
}

/** Tải model tháp sét, chuẩn hóa kích thước và thay model dự phòng. */
async function loadThunderTower() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/games/tower-defense/thunder-tower.glb')
    if (!scene || !host.value?.isConnected) return
    const template = new THREE.Group()
    template.name = 'ThunderTower3D'
    const source = gltf.scene
    source.updateMatrixWorld(true)
    const sourceBounds = new THREE.Box3().setFromObject(source)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())
    if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0) throw new Error('Model tháp sét không có kích thước hợp lệ.')
    source.scale.multiplyScalar(2.1 / sourceSize.y)
    source.updateMatrixWorld(true)
    const fittedBounds = new THREE.Box3().setFromObject(source)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    source.position.set(source.position.x - fittedCenter.x, source.position.y - fittedBounds.min.y, source.position.z - fittedCenter.z)
    source.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.geometry.getAttribute('normal')) child.geometry.computeVertexNormals()
      child.castShadow = true
      child.receiveShadow = true
      const tuneMaterial = (original: THREE.Material) => {
        const material = original.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) {
            material.map.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 8)
            material.map.needsUpdate = true
          }
          material.needsUpdate = true
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(tuneMaterial) : tuneMaterial(child.material)
    })
    template.add(source)
    decorateElementalTowerGlow(template, 'thunder')
    template.add(groundShadow(.42))
    optimizeTemplateShadows(template)

    const previousTemplate = towerTemplates.get('thunder')
    if (towerPreviewKind === 'thunder') removeTowerPreview()
    for (const [id, model] of towerModels) {
      if (props.towers.find(tower => tower.id === id)?.kind !== 'thunder') continue
      disposeObject(model, false)
      towerModels.delete(id)
    }
    if (previousTemplate) disposeObject(previousTemplate)
    towerTemplates.set('thunder', template)
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải thunder-tower.glb, dùng placeholder dự phòng.', error)
  }
}

/** Tải model tháp nước, chuẩn hóa về cùng tỷ lệ với các tháp nguyên tố khác. */
async function loadWaterTower() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/games/tower-defense/water-tower.glb')
    if (!scene || !host.value?.isConnected) return
    const template = new THREE.Group()
    template.name = 'WaterTower3D'
    const source = gltf.scene
    source.updateMatrixWorld(true)
    const sourceBounds = new THREE.Box3().setFromObject(source)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())
    if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0) throw new Error('Model tháp nước không có kích thước hợp lệ.')
    source.scale.multiplyScalar(2.1 / sourceSize.y)
    source.updateMatrixWorld(true)
    const fittedBounds = new THREE.Box3().setFromObject(source)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    source.position.set(source.position.x - fittedCenter.x, source.position.y - fittedBounds.min.y, source.position.z - fittedCenter.z)
    source.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.geometry.getAttribute('normal')) child.geometry.computeVertexNormals()
      child.castShadow = true
      child.receiveShadow = true
      const tuneMaterial = (original: THREE.Material) => {
        const material = original.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) {
            material.map.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 8)
            material.map.needsUpdate = true
          }
          material.needsUpdate = true
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(tuneMaterial) : tuneMaterial(child.material)
    })
    template.add(source)
    decorateElementalTowerGlow(template, 'water')
    template.add(groundShadow(.42))
    optimizeTemplateShadows(template)

    const previousTemplate = towerTemplates.get('water')
    if (towerPreviewKind === 'water') removeTowerPreview()
    for (const [id, model] of towerModels) {
      if (props.towers.find(tower => tower.id === id)?.kind !== 'water') continue
      disposeObject(model, false)
      towerModels.delete(id)
    }
    if (previousTemplate) disposeObject(previousTemplate)
    towerTemplates.set('water', template)
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải water-tower.glb, dùng placeholder dự phòng.', error)
  }
}

/** Tạo geometry dùng chung cho từng loại đạn; instance sau đó chỉ clone template. */
function createProjectileTemplate(kind: Projectile['kind']) {
  const group = new THREE.Group()
  let shot: THREE.Mesh
  if (kind === 'archer') {
    shot = mesh(new THREE.CylinderGeometry(.018, .018, .42, 7), 0xc99a58); shot.rotation.x = Math.PI / 2
    const arrowHead = mesh(new THREE.ConeGeometry(.055, .13, 6), 0xd8dde0, { metalness: .7, roughness: .28 })
    arrowHead.rotation.x = Math.PI / 2; arrowHead.position.z = .265; group.add(arrowHead)
    for (const rotation of [0, Math.PI / 2]) {
      const feather = mesh(new THREE.BoxGeometry(.055, .012, .11), 0x7d342f, { roughness: .85 })
      feather.position.z = -.19; feather.rotation.z = rotation; group.add(feather)
    }
  } else if (kind === 'cannon') {
    shot = mesh(new THREE.SphereGeometry(.11, 9, 7), 0x332b25, { metalness: .7 });
  } else if (kind === 'fire') {
    shot = mesh(new THREE.SphereGeometry(.105, 14, 10), 0xffd052, { emissive: 0xe8380b, roughness: .18 })
    shot.name = 'fireballCore'
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.185, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff4a18, transparent: true, opacity: .34, depthWrite: false, blending: THREE.AdditiveBlending }))
    shot.add(glow)
  } else if (kind === 'thunder') {
    shot = new THREE.Mesh(new THREE.OctahedronGeometry(.11, 1), new THREE.MeshBasicMaterial({ color: 0xe9ddff, transparent: true, opacity: .96, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    shot.name = 'thunderBoltCore'
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: .38, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    shot.add(glow)
  } else if (kind === 'water') {
    shot = new THREE.Mesh(new THREE.SphereGeometry(.13, 18, 12), new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, emissive: 0x075985, emissiveIntensity: .75, roughness: .08, metalness: 0, transmission: .5, transparent: true, opacity: .88 }))
    shot.name = 'waterShotCore'
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: .24, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    shot.add(glow)
    for (let index = 0; index < 7; index++) {
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(.038 + index % 3 * .007, 9, 7), new THREE.MeshBasicMaterial({ color: index % 2 ? 0xbae6fd : 0x38bdf8, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
      const angle = index / 7 * Math.PI * 2
      droplet.name = 'waterShotDroplet'; droplet.userData.index = index; droplet.userData.angle = angle; droplet.position.set(Math.cos(angle) * .17, Math.sin(angle) * .12, 0); group.add(droplet)
    }
  } else {
    shot = mesh(new THREE.OctahedronGeometry(.12), 0x74e8ff, { emissive: 0x2389a0 });
  }
  group.add(shot)
  return group
}

/** Sinh projectile render-side và ghi bornAt để nội suy theo duration gameplay. */
function createProjectile(projectile: Projectile, now: number) {
  const template = projectileTemplates.get(projectile.kind)
  if (!template) throw new Error(`Missing projectile template: ${projectile.kind}`)
  const group = template.clone(true)
  const levelScale = 1 + (projectile.level - 1) * .2
  group.scale.setScalar(levelScale)
  group.userData.levelScale = levelScale
  if (projectile.kind === 'archer' && projectile.level >= 2) {
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(.008, .018, .2 + projectile.level * .035, 6), new THREE.MeshBasicMaterial({ color: projectile.level >= 3 ? 0xa8e878 : 0xffdfa0, transparent: true, opacity: projectile.level >= 3 ? .34 : .22, depthWrite: false, toneMapped: false }))
    trail.name = 'arrowTrail'; trail.rotation.x = Math.PI / 2; trail.position.z = -.34; group.add(trail)
  } else if (projectile.kind === 'cannon' && projectile.level >= 2) {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.15 + projectile.level * .025, 10, 8), new THREE.MeshBasicMaterial({ color: projectile.level >= 3 ? 0xff5a24 : 0xffa43d, transparent: true, opacity: .22 + projectile.level * .06, depthWrite: false, toneMapped: false }))
    glow.name = 'cannonShotGlow'; group.add(glow)
  }
  scene!.add(group)
  return { group, bornAt: now }
}

/** Dựng hiệu ứng va chạm theo loại sát thương, bán kính và level của phát bắn. */
function createImpact(impact: Impact, now: number) {
  const color = impact.kind === 'frost' ? 0x6ee7ff : impact.kind === 'fire' ? 0xff3b1f : impact.kind === 'thunder' ? 0xa78bfa : impact.kind === 'water' ? 0x38bdf8 : impact.kind === 'cannon' ? 0xff7a2f : 0xffe2a1
  const group = new THREE.Group(); group.position.copy(worldPosition(impact.position.x, impact.position.y)); group.userData.bornAt = now; group.userData.level = impact.level; group.userData.visualDuration = (impact.kind === 'frost' ? 1050 : impact.kind === 'fire' ? 650 : impact.kind === 'water' ? 580 : impact.kind === 'thunder' ? 520 : 420) / props.speedMultiplier
  if (impact.kind === 'frost') {
    group.position.y = .08
    const radius = impact.radius ?? 1

    // Sóng gradient lan trực tiếp từ chân tháp ra toàn bộ vùng sát thương.
    const waveMaterial = (opacity: number) => {
      const material = new THREE.MeshBasicMaterial({ map: getFrostWaveTexture(), color: impact.level >= 3 ? 0xe4fbff : impact.level === 2 ? 0x8feeff : 0x68d9ef, transparent: true, opacity: opacity * (.78 + impact.level * .11), depthWrite: false, blending: THREE.NormalBlending, toneMapped: false })
      return material
    }
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), waveMaterial(.66))
    disc.name = 'frostCascadeWave'
    disc.rotation.x = -Math.PI / 2
    disc.position.y = .025
    disc.scale.set(.01, .01, .01)
    disc.userData.baseOpacity = .66
    const innerWave = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.45, radius * 1.45), waveMaterial(.34))
    innerWave.name = 'frostCascadeWave'
    innerWave.rotation.x = -Math.PI / 2
    innerWave.position.y = .035
    innerWave.scale.set(.01, .01, .01)
    innerWave.userData.baseOpacity = .34

    group.userData.frostCascadeWave = [disc, innerWave]
    group.add(disc, innerWave)
  } else if (impact.kind === 'fire') {
    group.position.y = .08
    const radius = impact.radius ?? 1
    const waveMaterial = (opacity: number) => new THREE.MeshBasicMaterial({ map: getFireWaveTexture(), color: impact.level >= 3 ? 0xffe06a : impact.level === 2 ? 0xff8b38 : 0xff5a28, transparent: true, opacity: opacity * (.78 + impact.level * .11), depthWrite: false, blending: THREE.NormalBlending, toneMapped: false })
    const outerWave = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), waveMaterial(.68))
    outerWave.rotation.x = -Math.PI / 2
    outerWave.position.y = .025
    outerWave.scale.set(.01, .01, .01)
    outerWave.userData.baseOpacity = .68
    const innerWave = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.45, radius * 1.45), waveMaterial(.4))
    innerWave.rotation.x = -Math.PI / 2
    innerWave.position.y = .035
    innerWave.scale.set(.01, .01, .01)
    innerWave.userData.baseOpacity = .4
    for (const wave of [outerWave, innerWave]) {
      wave.name = 'fireBlastWave'
      wave.renderOrder = 5
    }
    group.userData.fireBlastWaves = [outerWave, innerWave]
    group.add(outerWave, innerWave)
  } else if (impact.kind === 'water') {
    group.position.y = .1
    const radius = impact.radius ?? .7
    for (let index = 0; index < 3; index++) {
      const ripple = new THREE.Mesh(new THREE.RingGeometry(.12 + index * .07, .17 + index * .08, 40), new THREE.MeshBasicMaterial({ color: index === 1 ? 0x7dd3fc : color, transparent: true, opacity: .78 - index * .14, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
      ripple.name = 'waterHitRipple'; ripple.userData.index = index; ripple.userData.radius = radius; ripple.rotation.x = -Math.PI / 2; ripple.position.y = index * .018; group.add(ripple)
    }
    const dropletCount = 7 + impact.level * 2
    for (let index = 0; index < dropletCount; index++) {
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(.022 + index % 3 * .006, 7, 5), new THREE.MeshBasicMaterial({ color: index % 2 ? 0xbae6fd : 0x38bdf8, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }))
      droplet.name = 'waterHitDroplet'; droplet.userData.angle = index / dropletCount * Math.PI * 2; droplet.userData.index = index; group.add(droplet)
    }
  } else if (impact.kind === 'thunder') {
    group.position.y = .36
    const flash = new THREE.Mesh(new THREE.SphereGeometry(.18 + impact.level * .035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe9ddff, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
    flash.name = 'thunderHitFlash'; group.add(flash)
    const arcCount = 5 + impact.level * 2
    for (let index = 0; index < arcCount; index++) {
      const arc = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .2 + index % 3 * .055, 3, 5), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x8b5cf6 : 0xd8c8ff, transparent: true, opacity: .92, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))
      const angle = index / arcCount * Math.PI * 2
      arc.name = 'thunderHitArc'; arc.userData.angle = angle; arc.userData.index = index; arc.rotation.z = -angle; group.add(arc)
    }
  } else if (impact.kind === 'archer') {
    group.position.y = .42
    const slashCount = impact.level >= 3 ? 3 : impact.level === 2 ? 2 : 1
    for (let index = 0; index < slashCount; index++) {
      const slash = new THREE.Mesh(new THREE.BoxGeometry(.018, .24 + index * .035, .018), new THREE.MeshBasicMaterial({ color: impact.level >= 3 ? 0xb5ef86 : 0xffe5a6, transparent: true, opacity: .88 - index * .13, depthWrite: false, toneMapped: false }))
      slash.name = 'archerHitSlash'; slash.userData.index = index; slash.rotation.z = -.62 + index * .62; slash.rotation.y = index * .8; group.add(slash)
    }
    const sparkCount = impact.level === 1 ? 3 : impact.level === 2 ? 6 : 10
    for (let index = 0; index < sparkCount; index++) {
      const spark = new THREE.Mesh(new THREE.ConeGeometry(.018, .13 + impact.level * .025, 5), new THREE.MeshBasicMaterial({ color: impact.level >= 3 ? 0xb5ff82 : 0xffe2a1, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }))
      const angle = index / sparkCount * Math.PI * 2; spark.name = 'archerHitSpark'; spark.userData.angle = angle; spark.userData.index = index; spark.rotation.z = -angle; group.add(spark)
    }
  } else {
    group.position.y = .08
    const flash = new THREE.Mesh(new THREE.SphereGeometry(.16 + impact.level * .035, 12, 8), new THREE.MeshBasicMaterial({ color: impact.level >= 3 ? 0xffdd72 : 0xff8b38, transparent: true, opacity: .82, depthWrite: false, toneMapped: false }))
    flash.name = 'cannonHitFlash'; flash.position.y = .22; group.add(flash)
    const waveCount = impact.level >= 3 ? 2 : 1
    for (let index = 0; index < waveCount; index++) {
      const wave = new THREE.Mesh(new THREE.RingGeometry(.12 + index * .06, .19 + index * .07, 32), new THREE.MeshBasicMaterial({ color: impact.level >= 3 ? 0xff5728 : color, transparent: true, opacity: .78 - index * .18, depthWrite: false, toneMapped: false }))
      wave.name = 'cannonHitWave'; wave.userData.index = index; wave.rotation.x = -Math.PI / 2; group.add(wave)
    }
    const debrisCount = impact.level === 1 ? 4 : impact.level === 2 ? 7 : 12
    for (let index = 0; index < debrisCount; index++) {
      const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(.025 + impact.level * .006, 0), new THREE.MeshBasicMaterial({ color: index % 2 ? 0x3d332b : 0xff8a35, transparent: true, opacity: .9, depthWrite: false }))
      const angle = index / debrisCount * Math.PI * 2; debris.name = 'cannonHitDebris'; debris.userData.angle = angle; debris.userData.index = index; group.add(debris)
    }
    const smokeCount = impact.level === 1 ? 2 : impact.level === 2 ? 4 : 6
    for (let index = 0; index < smokeCount; index++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(.09 + index % 2 * .025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x292824, transparent: true, opacity: .5, depthWrite: false }))
      const angle = index / smokeCount * Math.PI * 2; smoke.name = 'cannonHitSmoke'; smoke.userData.angle = angle; smoke.userData.index = index; smoke.position.y = .18; group.add(smoke)
    }
  }
  scene!.add(group); return group
}

// ===== Mặt đất, đường đi, phong cảnh và lâu đài =============================
/** Dựng nền grid, phân biệt ô đường đi và lưu tile để raycast thao tác xây tháp. */
function createMapFoundation() {
  const terrainSize = 120
  const terrain = mesh(new THREE.PlaneGeometry(terrainSize, terrainSize), 0x31583a, { roughness: 1 })
  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = -.1
  terrain.castShadow = false
  terrain.receiveShadow = true

  const terrainGrid = new THREE.GridHelper(terrainSize, terrainSize, 0x223c29, 0x294b31)
  terrainGrid.position.y = -.085
  const gridMaterials = Array.isArray(terrainGrid.material) ? terrainGrid.material : [terrainGrid.material]
  for (const material of gridMaterials) { material.transparent = true; material.opacity = .34; material.depthWrite = false }
  scene!.add(terrain, terrainGrid)
}

/** Rải phiến đá dọc hai lane dựa trên DEFENSE_PATHS dùng chung với gameplay. */
function createCobblestonePath() {
  const stonesPerTile = 9
  const geometry = new THREE.BoxGeometry(.27, .025, .24)
  const material = new THREE.MeshStandardMaterial({ color: 0x555d60, roughness: .92, metalness: .04, bumpMap: surfaceDetail, bumpScale: .014 })
  const stones = new THREE.InstancedMesh(geometry, material, DEFENSE_PATH_TILES.length * stonesPerTile)
  const dummy = new THREE.Object3D()
  let instance = 0
  for (let pathIndex = 0; pathIndex < DEFENSE_PATH_TILES.length; pathIndex++) {
    const point = DEFENSE_PATH_TILES[pathIndex]!
    for (let stoneIndex = 0; stoneIndex < stonesPerTile; stoneIndex++) {
      const column = stoneIndex % 3; const row = Math.floor(stoneIndex / 3)
      const jitter = ((pathIndex * 17 + stoneIndex * 11) % 9 - 4) * .008
      dummy.position.copy(worldPosition(point.x + (column - 1) * .3 + jitter, point.y + (row - 1) * .29 - jitter))
      dummy.position.y = .0375
      dummy.rotation.set(0, ((pathIndex + stoneIndex) % 3 - 1) * .035, 0)
      dummy.scale.set(.96 + ((pathIndex + stoneIndex) % 3) * .025, 1, .96)
      dummy.updateMatrix(); stones.setMatrixAt(instance++, dummy.matrix)
    }
  }
  stones.castShadow = true; stones.receiveShadow = true; stones.instanceMatrix.needsUpdate = true; scene!.add(stones)
}

/** Vẽ đường chỉ dẫn mảnh trên lane để người chơi đọc hướng tiến quân. */
function createEnemyRouteLines() {
  const routeColors = [0xffc857, 0x67d5ff]

  for (const lane of [0, 1] as const) {
    const path = DEFENSE_PATHS[lane]
    const curve = new THREE.CurvePath<THREE.Vector3>()
    const sampleStep = .08
    const lastProgress = path.length - 1
    let previous = pathPosition(-.78, lane)
    previous.y = .105

    for (let progress = -.78 + sampleStep; progress < lastProgress; progress += sampleStep) {
      const next = pathPosition(Math.min(progress, lastProgress), lane)
      next.y = .105
      curve.add(new THREE.LineCurve3(previous.clone(), next.clone()))
      previous = next
    }

    const end = pathPosition(lastProgress, lane)
    end.y = .105
    curve.add(new THREE.LineCurve3(previous.clone(), end))

    const glow = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.ceil(lastProgress / sampleStep), .06, 8, false),
      new THREE.MeshBasicMaterial({ color: routeColors[lane], transparent: true, opacity: .055, depthWrite: false, toneMapped: false }),
    )
    const line = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.ceil(lastProgress / sampleStep), .018, 8, false),
      new THREE.MeshBasicMaterial({ color: routeColors[lane], transparent: true, opacity: .28, depthWrite: false, toneMapped: false }),
    )
    glow.renderOrder = 3
    line.renderOrder = 4
    scene!.add(glow, line)
  }
}

/** Tạo cây thông low-poly trang trí tại tọa độ world cho trước. */
function createPineTree(x: number, z: number, scale: number) {
  const tree = new THREE.Group()
  const trunk = mesh(new THREE.CylinderGeometry(.1, .15, .85, 10), 0x493629, { roughness: .92 }); trunk.position.y = .4
  const lower = mesh(new THREE.ConeGeometry(.58, 1.05, 12), 0x29452f, { roughness: .9 }); lower.position.y = 1.02
  const middle = mesh(new THREE.ConeGeometry(.46, .9, 12), 0x31563a, { roughness: .9 }); middle.position.y = 1.48
  const top = mesh(new THREE.ConeGeometry(.32, .72, 12), 0x3b6542, { roughness: .9 }); top.position.y = 1.87
  tree.add(trunk, lower, middle, top); tree.position.set(x, -.08, z); tree.scale.setScalar(scale); scene!.add(tree)
}

/** Tạo cụm tinh thể phát sáng trang trí và gom thành một Group dễ bố trí. */
function createCrystalCluster(x: number, z: number, color: number, scale = 1) {
  const cluster = new THREE.Group()
  const stone = mesh(new THREE.DodecahedronGeometry(.24, 0), 0x41494b, { roughness: .9, flatShading: true }); stone.position.y = .12; stone.scale.set(1.5, .55, 1.15); cluster.add(stone)
  for (let index = 0; index < 3; index++) {
    const crystal = mesh(new THREE.OctahedronGeometry(.15 - index * .025, 0), color, { emissive: color, roughness: .12, flatShading: true })
    crystal.position.set((index - 1) * .14, .31 + index * .055, (index % 2 ? -.05 : .04)); crystal.scale.y = 1.8 - index * .2; crystal.rotation.z = (index - 1) * -.2; cluster.add(crystal)
  }
  cluster.position.set(x, -.03, z); cluster.scale.setScalar(scale); scene!.add(cluster)
}

/** Tạo bia rune cùng ký hiệu emissive, xoay theo bố cục cảnh. */
function createRuneStone(x: number, z: number, rotation: number) {
  const stone = new THREE.Group()
  const pillar = mesh(new THREE.BoxGeometry(.28, .82, .2, 2, 4, 2), 0x575c59, { roughness: .94 }); pillar.position.y = .36; pillar.rotation.z = .035
  const rune = mesh(new THREE.TorusGeometry(.075, .014, 6, 16), 0x8bd8cb, { emissive: 0x397f77, roughness: .2 }); rune.position.set(0, .45, .11)
  const mark = mesh(new THREE.BoxGeometry(.018, .22, .018), 0x8bd8cb, { emissive: 0x397f77, roughness: .2 }); mark.position.set(0, .45, .125)
  stone.add(pillar, rune, mark); stone.position.set(x, -.08, z); stone.rotation.y = rotation; scene!.add(stone)
}

/** Tạo particle field nền để tăng chiều sâu mà không tham gia raycast/gameplay. */
function createMysticAtmosphere() {
  const count = 90
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const baseY = new Float32Array(count)
  let seed = 2173
  const gold = new THREE.Color(0xffd88a); const blue = new THREE.Color(0x74dff2)
  for (let index = 0; index < count; index++) {
    seed = (seed * 16807) % 2147483647; const x = seed / 2147483647 * (DEFENSE_GRID_COLUMNS + .4) - (DEFENSE_GRID_COLUMNS + .4) / 2
    seed = (seed * 16807) % 2147483647; const y = .35 + seed / 2147483647 * 2.25
    seed = (seed * 16807) % 2147483647; const z = seed / 2147483647 * (DEFENSE_GRID_ROWS + .1) - (DEFENSE_GRID_ROWS + .1) / 2
    positions.set([x, y, z], index * 3); baseY[index] = y
    const color = index % 3 === 0 ? blue : gold; colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({ size: .065, vertexColors: true, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
  mysticParticles = new THREE.Points(geometry, material); mysticParticles.userData.baseY = baseY; mysticParticles.frustumCulled = false; scene!.add(mysticParticles)
}

/** Bố trí cây, đá, crystal và rune ngoài khu vực grid có thể tương tác. */
function createMapScenery() {
  const edgeX = DEFENSE_GRID_COLUMNS / 2 + .45
  const edgeZ = DEFENSE_GRID_ROWS / 2 - .75
  createPineTree(-edgeX, -edgeZ, .72)
  createPineTree(-edgeX, edgeZ, .62)
  createPineTree(edgeX, -edgeZ, .68)
  createPineTree(edgeX, edgeZ, .76)
  createCrystalCluster(-edgeX + .3, .55, 0x6ddbea, .85)
  createCrystalCluster(edgeX - .3, -.55, 0xa58be8, .9)
  createRuneStone(-edgeX + .4, -2.55, .22)
  createRuneStone(edgeX - .4, 2.55, Math.PI + .18)
  const entry = new THREE.Group()
  for (const z of [-.42, .42]) {
    const post = mesh(new THREE.CylinderGeometry(.11, .15, .9, 10), 0x68645b, { roughness: .92 }); post.position.set(0, .42, z)
    const cap = mesh(new THREE.ConeGeometry(.18, .24, 10), 0x3f493d, { roughness: .78 }); cap.position.set(0, 1, z); entry.add(post, cap)
  }
  const beam = mesh(new THREE.BoxGeometry(.16, .16, 1.02), 0x4a3729, { roughness: .82 }); beam.position.set(0, .88, 0); entry.add(beam)
  for (const path of DEFENSE_PATHS) {
    const routeEntry = entry.clone(true)
    routeEntry.position.copy(worldPosition(-.78, path[0]!.y))
    routeEntry.position.y = .02
    scene!.add(routeEntry)
  }
}

/** Tải lâu đài GLB, canh cổng với cuối hai lane và thay model cũ an toàn. */
async function loadCastleModel() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/games/tower-defense/castle.glb')
    if (!scene) { disposeObject(gltf.scene); return }
    const source = gltf.scene
    const bounds = new THREE.Box3().setFromObject(source)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const largestHorizontalSide = Math.max(size.x, size.z, .001)
    const modelScale = Math.min(8.5 / Math.max(size.y, .001), 8.5 / largestHorizontalSide)
    source.position.set(-center.x, -bounds.min.y, -center.z)
    source.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      child.geometry.computeBoundingSphere()
      if ((child.geometry.boundingSphere?.radius ?? 0) < size.length() * .012) child.castShadow = false
    })
    const container = new THREE.Group()
    container.name = 'castleModel'
    container.add(source)
    container.scale.setScalar(modelScale)
    const castleCell = DEFENSE_PATH.at(-1)!
    // Tâm model nằm ngoài vùng xây dựng, nhưng phần cổng/cầu thang được kéo sát
    // điểm cuối con đường và hạ nhẹ để móng lâu đài bám vào mặt đất.
    container.position.copy(worldPosition(DEFENSE_GRID_COLUMNS + 1.5, castleCell.y))
    container.position.y = -.22
    container.rotation.y = -Math.PI / 2
    if (castleModel) disposeObject(castleModel)
    castleModel = container
    scene.add(container)
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải castle.glb.', error)
  }
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
  if (!scene) return
  const sceneLoad = props.towers.length + props.enemies.length + props.projectiles.length
  const shouldReduceEffects = performanceMode ? sceneLoad >= 22 : sceneLoad > 30
  if (renderer && shouldReduceEffects !== performanceMode) {
    performanceMode = shouldReduceEffects
    renderer.shadowMap.enabled = !performanceMode
    renderer.setPixelRatio(Math.min(devicePixelRatio, performanceMode ? 1 : 1.5))
  }
  if (mysticParticles) {
    mysticParticles.visible = !performanceMode
    if (mysticParticles.visible) {
      const positions = mysticParticles.geometry.getAttribute('position') as THREE.BufferAttribute
      const baseY = mysticParticles.userData.baseY as Float32Array
      for (let index = 0; index < positions.count; index++) positions.setY(index, baseY[index]! + Math.sin(elapsed * .85 + index * 1.73) * .075)
      positions.needsUpdate = true
    }
  }
  const selectedTower = props.towers.find(tower => tower.id === props.selectedTowerId)
  const hovered = hoverMarker?.userData.hoveredCell as { x: number; y: number } | undefined
  const hoveredIsPath = hovered ? defensePathTileSet.has(`${hovered.x}:${hovered.y}`) : false
  const hoveredHasTower = hovered ? props.towers.some(tower => tower.x === hovered.x && tower.y === hovered.y) : false
  const canPreviewMove = Boolean(
    selectedTower
    && hovered
    && selectedTower.canRelocate
    && props.phase !== 'wave'
    && props.phase !== 'gameover'
    && !hoveredIsPath
    && !hoveredHasTower,
  )
  const selectedPreviewCell = canPreviewMove ? hovered : selectedTower
  if (props.selectedKind !== towerPreviewKind) {
    if (props.selectedKind) createTowerPreview(props.selectedKind)
    else removeTowerPreview()
  }
  if (towerPreviewModel) {
    const canPlacePreview = Boolean(hovered && !hoveredIsPath && !hoveredHasTower && props.phase !== 'gameover')
    towerPreviewModel.visible = canPlacePreview
    if (hovered && canPlacePreview) {
      towerPreviewModel.position.copy(worldPosition(hovered.x, hovered.y))
      towerPreviewModel.position.y = .05
    }
  }
  if (attackRangeMarker) {
    const previewKind = selectedTower?.kind ?? props.selectedKind
    const placementPreviewCell = hovered && !hoveredIsPath && !hoveredHasTower ? hovered : undefined
    const previewCell = props.phase !== 'gameover' && previewKind ? (selectedTower ? selectedPreviewCell : placementPreviewCell) : undefined
    attackRangeMarker.visible = Boolean(previewCell && previewKind)
    if (previewCell && previewKind) {
      const definition = TOWER_DEFINITIONS[previewKind]
      const radius = previewKind === 'frost' ? definition.range : definition.range + ((selectedTower?.level ?? 1) - 1) * TOWER_RANGE_LEVEL_BONUS
      attackRangeMarker.position.copy(worldPosition(previewCell.x, previewCell.y)); attackRangeMarker.position.y = .14
      attackRangeMarker.scale.set(radius, 1, radius)
      const color = previewKind === 'frost' ? 0x65e6ff : previewKind === 'fire' ? 0xff5a3d : 0xffd36a
      attackRangeMarker.traverse((child) => { if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) child.material.color.setHex(color) })
    }
  }
  if (towerFocusMarker) {
    towerFocusMarker.visible = Boolean(selectedTower)
    if (selectedTower) {
      towerFocusMarker.position.copy(worldPosition(selectedTower.x, selectedTower.y))
      towerFocusMarker.position.y = .12
      const pulse = 1 + Math.sin(elapsed * 3.2) * .025
      towerFocusMarker.scale.setScalar(pulse)
    }
  }
  if (hoverMarker) {
    const markerCell = selectedPreviewCell ?? hovered
    hoverMarker.visible = Boolean(markerCell)
    if (markerCell) {
      hoverMarker.position.copy(worldPosition(markerCell.x, markerCell.y))
      hoverMarker.position.y = .125
      const material = hoverMarker.material as THREE.MeshBasicMaterial
      material.color.setHex(canPreviewMove ? 0x7ddc8b : selectedTower ? 0xffd36a : 0xf8edba)
      material.opacity = selectedTower ? .42 : .25
    }
  }
  const towerIds = new Set(props.towers.map(item => item.id))
  for (const [id, model] of towerModels) if (!towerIds.has(id)) { disposeObject(model, false); towerModels.delete(id) }
  for (const tower of props.towers) {
    const model = towerModels.get(tower.id) ?? createTowerModel(tower); towerModels.set(tower.id, model)
    const renderedLevel = Number(model.userData.level)
    if (renderedLevel < tower.level) { createTowerUpgradeEffect(tower, now); applyTowerLevelAppearance(model, tower) }
    model.userData.level = tower.level
    const turret = model.userData.turret as THREE.Group | undefined
    const targetRotation = Math.PI / 2 - THREE.MathUtils.degToRad(tower.aimAngle)
    if (turret) turret.rotation.y += Math.atan2(Math.sin(targetRotation - turret.rotation.y), Math.cos(targetRotation - turret.rotation.y)) * .14
    if (model.userData.shotSequence !== tower.shotSequence) { model.userData.shotSequence = tower.shotSequence; model.userData.firedAt = now }
    const recoilAge = now - Number(model.userData.firedAt)
    const recoil = recoilAge < 220 ? Math.sin(recoilAge / 220 * Math.PI) : 0
    const towerPosition = worldPosition(tower.x, tower.y)
    model.position.set(towerPosition.x, .05, towerPosition.z)
    setTowerScale(model, tower.level)
    animateTowerLevelAppearance(model, tower, elapsed)
    const aura = model.userData.aura as THREE.Group | undefined
    if (aura) { aura.rotation.y = elapsed * (.18 + tower.id % 3 * .035); aura.position.y = .105 + Math.sin(elapsed * 1.8 + tower.id) * .008 }
    const barrel = model.userData.barrel as THREE.Mesh | undefined
    const muzzle = model.userData.muzzle as THREE.Mesh | undefined
    const barrelRig = model.userData.barrelRig as THREE.Group | undefined
    const muzzleFlash = model.userData.muzzleFlash as THREE.Mesh | undefined
    const muzzleCharge = model.userData.cannonMuzzleCharge as THREE.Group | undefined
    const barrelUpgradeFx = model.userData.cannonBarrelUpgradeFx as THREE.Group | undefined
    if (barrel) barrel.position.z = .38
    if (muzzle) muzzle.position.z = .82
    if (barrelRig) barrelRig.position.z = -recoil * .13
    if (muzzleFlash) { const flash = recoilAge < 70 ? 1 - recoilAge / 70 : 0; muzzleFlash.visible = flash > 0; muzzleFlash.scale.setScalar(.45 + flash * .9) }
    if (muzzleCharge) {
      muzzleCharge.visible = tower.level >= 2
      if (muzzleCharge.visible) {
        muzzleCharge.children.forEach((child) => {
          const index = Number(child.userData.index)
          if (child.name === 'cannonMuzzleRing') {
            child.visible = index === 0 || tower.level >= 3
            child.rotation.z = elapsed * (index ? -2.1 : 1.6)
            child.scale.setScalar(1 + Math.sin(elapsed * (5 + index) + tower.id) * .1 + recoil * .28)
          } else if (child.name === 'cannonMuzzleSpark') {
            child.visible = index < (tower.level >= 3 ? 8 : 4)
            const angle = Number(child.userData.angle) + elapsed * (2.8 + index % 3 * .45)
            const flicker = .72 + Math.sin(elapsed * 11 + index * 1.7) * .28
            const radius = (tower.level >= 3 ? .23 : .18) * flicker
            child.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(elapsed * 7 + index) * .07)
            child.scale.setScalar(.65 + flicker * .65 + recoil * .8)
            child.rotation.x = elapsed * 5 + index; child.rotation.y = elapsed * 4.2 - index
          }
        })
      }
    }
    if (barrelUpgradeFx) {
      barrelUpgradeFx.visible = tower.level >= 2
      if (barrelUpgradeFx.visible) {
        barrelUpgradeFx.children.forEach((child) => {
          const index = Number(child.userData.index)
          if (child.name === 'cannonBarrelEnergyBand') {
            child.visible = index < (tower.level >= 3 ? 3 : 2)
            child.rotation.z = elapsed * (index % 2 ? -2.4 : 2) + index
            const bandPulse = 1 + Math.sin(elapsed * 6 + index * 1.8 + tower.id) * .09 + recoil * .18
            child.scale.setScalar(bandPulse)
          } else if (child.name === 'cannonBarrelArc') {
            child.visible = index < (tower.level >= 3 ? 6 : 4)
            const phase = Number(child.userData.phase)
            const travel = (elapsed * (tower.level >= 3 ? .9 : .68) + index / 6) % 1
            const angle = phase + elapsed * (tower.level >= 3 ? 3.1 : 2.35)
            const radius = .135 + Math.sin(elapsed * 5 + index) * .012
            child.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, .12 + travel * .68)
            child.rotation.z = -angle
            child.scale.setScalar(.7 + Math.sin(elapsed * 8 + index * 1.4) * .2 + recoil * .45)
          }
        })
      }
    }
    const flag = model.userData.flag as THREE.Mesh | undefined
    if (flag) flag.rotation.z = Math.sin(elapsed * 2.4 + tower.id) * .08
    if (tower.kind === 'frost' || tower.kind === 'fire') {
      const pulse = .5 + Math.sin(elapsed * 3.2 + tower.id) * .5
      const glows = model.userData.frostGlows as THREE.Object3D[]
      glows.forEach((glow) => { const glowPulse = 1 + pulse * .07 + recoil * .16; glow.scale.set(Number(glow.userData.baseScaleX) * glowPulse, Number(glow.userData.baseScaleY) * glowPulse, 1) })
      const energyRings = model.userData.frostEnergyRings as THREE.Mesh[]
      energyRings.forEach((energyRing, index) => { const tilt = Number(energyRing.userData.baseTilt); energyRing.rotation.x = Math.PI / 2 + tilt + Math.sin(elapsed * .8 + index) * .035; energyRing.rotation.z = (index ? -1 : 1) * elapsed * (.32 + index * .1); energyRing.scale.setScalar(1 + recoil * .14 + pulse * .025) })
      const particles = model.userData.frostParticles as THREE.Mesh[]
      particles.forEach((particle, index) => { const angle = Number(particle.userData.orbitAngle) + elapsed * (.28 + index % 3 * .035); const radius = Number(particle.userData.orbitRadius); particle.position.set(Math.cos(angle) * radius, Number(particle.userData.baseY) + Math.sin(elapsed * 1.25 + index) * .1, Math.sin(angle) * radius); particle.rotation.y = elapsed + index })
    }
    if (tower.kind === 'fire' || tower.kind === 'thunder' || tower.kind === 'water') {
      const elementalGlow = model.getObjectByName('elementalTowerGlowSprite') as THREE.Sprite | undefined
      if (elementalGlow) {
        const baseScale = Number(elementalGlow.userData.baseScale)
        const pulse = 1 + Math.sin(elapsed * (tower.kind === 'thunder' ? 8.5 : 5.2) + tower.id) * .12
        elementalGlow.scale.set(baseScale * pulse, baseScale * pulse, 1)
      }
    }
    if (tower.kind === 'thunder') {
      const beamEffect = model.getObjectByName('thunderBeamEffect') as THREE.Group | undefined
      if (beamEffect) {
        const targets = tower.beamTargetIds.map(id => enemyModels.get(id)).filter((item): item is THREE.Group => Boolean(item))
        beamEffect.visible = targets.length > 0
        model.updateMatrixWorld(true)
        beamEffect.children.forEach((child) => {
          const beam = child as THREE.Line
          const segmentIndex = Number(beam.userData.segmentIndex)
          const lane = Number(beam.userData.lane)
          const branchIndex = Number(beam.userData.branchIndex)
          const targetModel = targets[segmentIndex]
          beam.visible = Boolean(targetModel)
          if (!targetModel) return
          const startWorld = new THREE.Vector3()
          if (segmentIndex === 0) model.localToWorld(startWorld.set(0, 1.72, 0))
          else targets[segmentIndex - 1]!.getWorldPosition(startWorld).add(new THREE.Vector3(0, .62, 0))
          const endWorld = targetModel.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .62, 0))
          const start = model.worldToLocal(startWorld.clone())
          const end = model.worldToLocal(endWorld.clone())
          const position = beam.geometry.getAttribute('position') as THREE.BufferAttribute
          const flickerFrame = Math.floor(elapsed * 26)
          const random = (pointIndex: number, salt: number) => {
            const value = Math.sin((flickerFrame * 17.17 + tower.id * 13.13 + segmentIndex * 31.7 + pointIndex * 7.91 + salt) * 12.9898) * 43758.5453
            return (value - Math.floor(value)) * 2 - 1
          }
          if (child.name === 'thunderBranchBeam') {
            const branchStartRatio = branchIndex ? .62 : .36
            const branchStart = new THREE.Vector3().lerpVectors(start, end, branchStartRatio)
            const branchLength = .28 + Math.abs(random(branchIndex, 19)) * .22
            const branchEnd = branchStart.clone().add(new THREE.Vector3(random(1, 23) * branchLength, .08 + random(2, 29) * .18, random(3, 37) * branchLength))
            for (let pointIndex = 0; pointIndex < 5; pointIndex++) {
              const ratio = pointIndex / 4
              const edge = Math.sin(ratio * Math.PI)
              position.setXYZ(pointIndex, THREE.MathUtils.lerp(branchStart.x, branchEnd.x, ratio) + random(pointIndex, 41) * .045 * edge, THREE.MathUtils.lerp(branchStart.y, branchEnd.y, ratio) + random(pointIndex, 47) * .04 * edge, THREE.MathUtils.lerp(branchStart.z, branchEnd.z, ratio) + random(pointIndex, 53) * .045 * edge)
            }
            position.needsUpdate = true
            ;(beam.material as THREE.LineBasicMaterial).opacity = Math.max(0, .25 + random(branchIndex, 61) * .22)
            return
          }
          for (let pointIndex = 0; pointIndex < 10; pointIndex++) {
            const ratio = pointIndex / 9
            const edge = Math.sin(ratio * Math.PI)
            const zigzag = random(pointIndex, 3) * (.065 + Math.abs(random(pointIndex, 11)) * .065) * edge
            const layerOffset = lane * .019 * edge
            position.setXYZ(pointIndex, THREE.MathUtils.lerp(start.x, end.x, ratio) + zigzag + layerOffset, THREE.MathUtils.lerp(start.y, end.y, ratio) + random(pointIndex, 71) * .075 * edge + layerOffset, THREE.MathUtils.lerp(start.z, end.z, ratio) + random(pointIndex, 83) * .11 * edge + layerOffset)
          }
          position.needsUpdate = true
          const core = lane === 0
          const innerGlow = Math.abs(lane) === 1
          ;(beam.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.clamp((core ? .92 : innerGlow ? .5 : .26) + random(lane, 97) * (core ? .08 : .12), .1, 1)
        })
      }
    }
  }
  syncTowerUpgradeEffects(now)

  if (renderer && camera && now - lastTowerAnchorUpdate >= 34) {
    lastTowerAnchorUpdate = now
    const selectedModel = props.selectedTowerId === null ? undefined : towerModels.get(props.selectedTowerId)
    if (!selectedModel) {
      if (lastTowerAnchorVisible) {
        lastTowerAnchorVisible = false
        emit('selectedTowerPosition', 0, 0, false)
      }
    }
    else {
      const width = renderer.domElement.clientWidth
      const height = renderer.domElement.clientHeight
      selectedModel.getWorldPosition(towerScreenPosition)
      towerScreenPosition.y += 1.05
      towerScreenPosition.project(camera)
      const visible = towerScreenPosition.z > -1 && towerScreenPosition.z < 1 && Math.abs(towerScreenPosition.x) <= 1.08 && Math.abs(towerScreenPosition.y) <= 1.08
      const towerX = (towerScreenPosition.x * .5 + .5) * width
      const towerY = (-towerScreenPosition.y * .5 + .5) * height
      const panelWidth = 220
      const sidebarEdge = width - 278
      const panelGap = 46
      const preferredX = towerX + panelGap
      const x = preferredX + panelWidth < sidebarEdge ? preferredX : towerX - panelWidth - panelGap
      const y = THREE.MathUtils.clamp(towerY, 130, height - 130)
      const clampedX = Math.max(10, x)
      if (visible !== lastTowerAnchorVisible || Math.abs(clampedX - lastTowerAnchorX) >= 1 || Math.abs(y - lastTowerAnchorY) >= 1) {
        lastTowerAnchorVisible = visible
        lastTowerAnchorX = clampedX
        lastTowerAnchorY = y
        emit('selectedTowerPosition', clampedX, y, visible)
      }
    }
  }

  // Enemy: clone/xóa model theo ID, dự đoán progress giữa hai tick gameplay,
  // nội suy góc cua và cập nhật mixer cùng hiệu ứng burn/frost.
  const enemyIds = new Set(props.enemies.map(item => item.id))
  for (const [id, model] of enemyModels) if (!enemyIds.has(id)) { disposeEnemyModel(model); enemyModels.delete(id) }
  for (const enemy of props.enemies) {
    const model = enemyModels.get(enemy.id) ?? createEnemyModel(enemy); enemyModels.set(enemy.id, model)
    const previousObserved = Number(model.userData.observedProgress)
    if (!Number.isFinite(previousObserved)) {
      model.userData.observedProgress = enemy.progress
      model.userData.observedAt = now
      model.userData.progressVelocity = enemy.speed
      model.userData.renderProgress = enemy.progress
    } else if (enemy.progress !== previousObserved) {
      const observationTime = Math.max((now - Number(model.userData.observedAt)) / 1000, .001)
      model.userData.progressVelocity = THREE.MathUtils.clamp((enemy.progress - previousObserved) / observationTime, 0, enemy.speed * 2.2)
      model.userData.observedProgress = enemy.progress
      model.userData.observedAt = now
    }
    const predictionAge = Math.min((now - Number(model.userData.observedAt)) / 1000, .12)
    const predictedProgress = enemy.progress + Number(model.userData.progressVelocity) * predictionAge
    const renderProgress = THREE.MathUtils.damp(Number(model.userData.renderProgress), predictedProgress, 24, frameDelta)
    model.userData.renderProgress = renderProgress
    const position = pathPosition(renderProgress, enemy.lane)
    const facingFrom = pathPosition(renderProgress - .08, enemy.lane)
    const facingTo = pathPosition(renderProgress + .12, enemy.lane)
    const observedVelocity = Number(model.userData.progressVelocity) || enemy.speed
    const gaitSpeed = THREE.MathUtils.clamp(observedVelocity / .745, .65, 1.6)
    const stride = Math.sin(elapsed * 8 * gaitSpeed + enemy.id)
    model.position.copy(position.setY(.08 + Math.abs(stride) * .008))
    const targetRotation = Math.atan2(facingTo.x - facingFrom.x, facingTo.z - facingFrom.z)
    if (!model.userData.hasFacingDirection) {
      model.rotation.y = targetRotation
      model.userData.hasFacingDirection = true
    } else {
      const rotationDelta = Math.atan2(Math.sin(targetRotation - model.rotation.y), Math.cos(targetRotation - model.rotation.y))
      model.rotation.y += rotationDelta * (1 - Math.exp(-12 * frameDelta))
    }
    model.scale.setScalar(enemy.kind === 'normal' ? .494 : 1.05)
    const mixer = model.userData.mixer as THREE.AnimationMixer | undefined
    if (mixer) { mixer.timeScale = gaitSpeed * 1.25; mixer.update(frameDelta) }
    const statusBadges = model.userData.statusBadges as THREE.Group | undefined
    if (statusBadges) {
      const fireBadge = statusBadges.getObjectByName('enemyStatusBadge-fire')
      const frostBadge = statusBadges.getObjectByName('enemyStatusBadge-frost')
      const waterBadge = statusBadges.getObjectByName('enemyStatusBadge-water')
      if (fireBadge) fireBadge.visible = enemy.burnRemaining > 0
      if (frostBadge) frostBadge.visible = enemy.isFrozen
      if (waterBadge) waterBadge.visible = enemy.isSlowed
      const activeBadges = [fireBadge, frostBadge, waterBadge].filter((badge): badge is THREE.Object3D => Boolean(badge?.visible))
      activeBadges.forEach((badge, index) => {
        badge.position.x = (index - (activeBadges.length - 1) / 2) * .24
        const pulse = 1 + Math.sin(elapsed * 5 + enemy.id + index) * .06
        badge.scale.set(.2 * pulse, .2 * pulse, 1)
      })
    }
    const health = model.userData.health as THREE.Mesh; const healthRatio = Math.max(.02, enemy.hp / enemy.maxHp); health.scale.x = healthRatio; health.position.x = -(1 - healthRatio) * .37
  }

  // Projectile: nội suy theo bornAt + duration render; gameplay vẫn quyết định
  // thời điểm trúng đích và sát thương trong composable.
  const projectileIds = new Set(props.projectiles.map(item => item.id))
  for (const [id, item] of projectileModels) if (!projectileIds.has(id)) { disposeObject(item.group, false); projectileModels.delete(id) }
  for (const projectile of props.projectiles) {
    const item = projectileModels.get(projectile.id) ?? createProjectile(projectile, now); projectileModels.set(projectile.id, item)
    const ratio = Math.min(1, (now - item.bornAt) / (projectile.duration * 1000))
    item.group.visible = ratio < 1
    if (ratio >= 1) continue
    const from = worldPosition(projectile.from.x, projectile.from.y); const to = worldPosition(projectile.to.x, projectile.to.y)
    const targetHeight = .45
    let startHeight = .72
    let arcHeight = 1.15
    if (projectile.kind === 'cannon') {
      const sourceTower = props.towers.find(tower => tower.x === projectile.from.x && tower.y === projectile.from.y && tower.kind === 'cannon')
      const towerScale = towerScaleForLevel(sourceTower?.level ?? 1)
      const directionX = to.x - from.x; const directionZ = to.z - from.z
      const directionLength = Math.max(Math.hypot(directionX, directionZ), .001)
      const muzzleDistance = Math.cos(.2) * .9 * towerScale.horizontal
      from.x += directionX / directionLength * muzzleDistance
      from.z += directionZ / directionLength * muzzleDistance
      startHeight = .05 + (1.08 + .13 + Math.sin(.2) * .9) * towerScale.vertical
      arcHeight = .42
    } else if (projectile.kind === 'fire' || projectile.kind === 'thunder' || projectile.kind === 'water') {
      const sourceTower = props.towers.find(tower => tower.x === projectile.from.x && tower.y === projectile.from.y && tower.kind === projectile.kind)
      const towerScale = towerScaleForLevel(sourceTower?.level ?? 1)
      startHeight = .05 + 1.72 * towerScale.vertical
      arcHeight = projectile.kind === 'water' ? .24 : 0
    }
    const fallProgress = projectile.kind === 'fire' ? Math.pow(ratio, 1.55) : ratio
    item.group.position.lerpVectors(from, to, ratio)
    item.group.position.y = THREE.MathUtils.lerp(startHeight, targetHeight, fallProgress) + Math.sin(ratio * Math.PI) * arcHeight
    item.group.lookAt(to.x, targetHeight, to.z)
    if (projectile.kind === 'fire') {
      const fireball = item.group.getObjectByName('fireballCore')
      if (fireball) {
        fireball.rotateZ(frameDelta * 9)
        const pulse = 1 + Math.sin(elapsed * 18 + projectile.id) * .1
        fireball.scale.setScalar(pulse)
      }
    } else if (projectile.kind === 'thunder') {
      const bolt = item.group.getObjectByName('thunderBoltCore')
      if (bolt) { bolt.rotateZ(frameDelta * 18); bolt.scale.setScalar(1 + Math.sin(elapsed * 28 + projectile.id) * .18) }
    } else if (projectile.kind === 'water') {
      const drop = item.group.getObjectByName('waterShotCore')
      if (drop) {
        const pulse = 1 + Math.sin(elapsed * 17 + projectile.id) * .09
        drop.scale.set(pulse, pulse * .88, pulse)
      }
      item.group.children.forEach((child) => {
        if (child.name !== 'waterShotDroplet') return
        const index = Number(child.userData.index)
        const angle = Number(child.userData.angle) + elapsed * (4.2 + index % 2 * .7) + projectile.id
        const radius = .15 + index % 3 * .025
        child.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.3) * .12, Math.sin(angle) * radius)
        child.scale.setScalar(.75 + Math.sin(elapsed * 9 + index) * .2)
      })
    }
  }

  // Impact: giữ object sống đúng lifetime do gameplay cấp và animate theo tuổi.
  const impactIds = new Set(props.impacts.map(item => item.id))
  for (const [id, model] of impactModels) if (!impactIds.has(id)) { disposeObject(model); impactModels.delete(id) }
  for (const impact of props.impacts) {
    const model = impactModels.get(impact.id) ?? createImpact(impact, now); impactModels.set(impact.id, model)
    const progress = THREE.MathUtils.clamp((now - Number(model.userData.bornAt)) / Number(model.userData.visualDuration), 0, 1)
    model.visible = progress < 1
    if (impact.kind === 'frost') {
      const waveProgress = THREE.MathUtils.smoothstep(progress, 0, .92)
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .76, 1)
      const waves = model.userData.frostCascadeWave as THREE.Mesh[]
      waves.forEach((wave, index) => {
        const delayedProgress = index === 0 ? waveProgress : THREE.MathUtils.smoothstep(progress, .28, 1)
        const scale = Math.max(.01, delayedProgress)
        wave.scale.set(scale, scale, scale)
        ;(wave.material as THREE.MeshBasicMaterial).opacity = Number(wave.userData.baseOpacity) * fade * delayedProgress
        wave.rotation.z = (index % 2 ? -1 : 1) * elapsed * .18
      })
    } else if (impact.kind === 'fire') {
      const waveProgress = THREE.MathUtils.smoothstep(progress, 0, .9)
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .68, 1)
      const waves = model.userData.fireBlastWaves as THREE.Mesh[]
      waves.forEach((wave, index) => {
        const delayedProgress = index === 0 ? waveProgress : THREE.MathUtils.smoothstep(progress, .2, 1)
        const scale = Math.max(.01, delayedProgress)
        wave.scale.set(scale, scale, scale)
        ;(wave.material as THREE.MeshBasicMaterial).opacity = Number(wave.userData.baseOpacity) * fade * delayedProgress
        wave.rotation.z = (index % 2 ? -1 : 1) * elapsed * .22
      })
    } else if (impact.kind === 'water') {
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .5, 1)
      model.children.forEach((child) => {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = fade * (child.name === 'waterHitRipple' ? .72 : .9)
        if (child.name === 'waterHitRipple') {
          const index = Number(child.userData.index); const delayed = Math.max(0, progress - index * .1)
          child.scale.setScalar(.25 + delayed * (3.2 + Number(child.userData.radius)))
        } else if (child.name === 'waterHitDroplet') {
          const angle = Number(child.userData.angle); const distance = progress * (.38 + impact.level * .08)
          child.position.set(Math.cos(angle) * distance, Math.sin(progress * Math.PI) * (.42 + impact.level * .08), Math.sin(angle) * distance)
        }
      })
    } else if (impact.kind === 'thunder') {
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .32, 1)
      model.children.forEach((child) => {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = fade * (child.name === 'thunderHitFlash' ? .85 : .95)
        if (child.name === 'thunderHitFlash') child.scale.setScalar(.45 + Math.sin(progress * Math.PI) * 2.1)
        else if (child.name === 'thunderHitArc') {
          const angle = Number(child.userData.angle); const distance = progress * (.42 + impact.level * .09)
          child.position.set(Math.cos(angle) * distance, Math.sin(progress * Math.PI) * .35, Math.sin(angle) * distance)
          child.scale.y = .7 + Math.sin(elapsed * 35 + Number(child.userData.index)) * .3
        }
      })
    } else if (impact.kind === 'archer') {
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .45, 1)
      model.children.forEach((child) => {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = fade * (child.name === 'archerHitSlash' ? .92 : .95)
        if (child.name === 'archerHitSlash') {
          const index = Number(child.userData.index); child.scale.set(.7 + progress * .7, 1 + progress * (1.1 + impact.level * .2), 1); child.rotation.z += (index % 2 ? -.07 : .07)
        } else if (child.name === 'archerHitSpark') {
          const angle = Number(child.userData.angle); const distance = progress * (.35 + impact.level * .12)
          child.position.set(Math.cos(angle) * distance, Math.sin(progress * Math.PI) * (.24 + impact.level * .07), Math.sin(angle) * distance)
        }
      })
    } else {
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .5, 1)
      model.children.forEach((child) => {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = fade * (child.name === 'cannonHitWave' ? .72 : .9)
        if (child.name === 'cannonHitFlash') {
          child.scale.setScalar(.7 + Math.sin(progress * Math.PI) * (1.5 + impact.level * .25)); material.opacity = fade * .72
        } else if (child.name === 'cannonHitWave') {
          const index = Number(child.userData.index); const delayed = Math.max(0, progress - index * .12)
          child.scale.setScalar(1 + delayed * (3.2 + impact.level * .7)); child.rotation.z += index ? -.08 : .1
        } else if (child.name === 'cannonHitDebris') {
          const angle = Number(child.userData.angle); const distance = progress * (.42 + impact.level * .15)
          child.position.set(Math.cos(angle) * distance, Math.sin(progress * Math.PI) * (.3 + impact.level * .1), Math.sin(angle) * distance); child.rotation.x += .14; child.rotation.y += .1
        } else if (child.name === 'cannonHitSmoke') {
          const index = Number(child.userData.index); const angle = Number(child.userData.angle); const spread = .08 + progress * (.16 + impact.level * .035)
          child.position.set(Math.cos(angle) * spread, .18 + progress * (.48 + index % 2 * .12), Math.sin(angle) * spread); child.scale.setScalar(.65 + progress * (1.25 + impact.level * .12)); material.opacity = fade * .42
        }
      })
    }
  }
}

/** Nội suy toàn bộ camera về góc nhìn mặc định khi người chơi yêu cầu. */
function updateCameraReturn(frameDelta: number) {
  if (!cameraReturning || !camera || !controls) return
  const easing = 1 - Math.exp(-frameDelta * 6.5)
  camera.position.lerp(defaultCameraPosition, easing)
  controls.target.lerp(defaultCameraTarget, easing)
  camera.zoom = THREE.MathUtils.lerp(camera.zoom, .92, easing)
  camera.updateProjectionMatrix()
  camera.lookAt(controls.target)

  if (camera.position.distanceToSquared(defaultCameraPosition) < .0004 && controls.target.distanceToSquared(defaultCameraTarget) < .0004 && Math.abs(camera.zoom - .92) < .001) {
    camera.position.copy(defaultCameraPosition)
    controls.target.copy(defaultCameraTarget)
    camera.zoom = .92
    camera.updateProjectionMatrix()
    camera.lookAt(controls.target)
    cameraReturning = false
    controls.enabled = true
    const dampingEnabled = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = dampingEnabled
  }
}

/** Chỉ trả camera về mặc định khi nhấn R; bỏ qua lúc đang nhập văn bản. */
function handleCameraResetShortcut(event: KeyboardEvent) {
  const target = event.target
  if (event.code !== 'KeyR' || event.repeat || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable) || !controls) return
  event.preventDefault()
  cameraReturning = true
  controls.enabled = false
}

// ===== Khởi tạo và hủy scene =================================================
/**
 * Khởi tạo renderer/camera/light/map, đăng ký input, tải GLB song song và bắt
 * đầu animation loop. Mọi tài nguyên tạo ở đây được thu hồi trong onBeforeUnmount.
 */
async function createWorld() {
  const target = host.value
  if (!target) return
  try {
    surfaceDetail = createSurfaceDetail()
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x1c3627, 20, 42)
    const archerTemplate = createArcherTower(); archerTemplate.add(groundShadow(.42)); applyTowerMetallicFinish(archerTemplate, 0x8a7658); optimizeTemplateShadows(archerTemplate); towerTemplates.set('archer', archerTemplate)
    const cannonTemplate = createCannonTower(); cannonTemplate.add(groundShadow(.42)); applyTowerMetallicFinish(cannonTemplate, 0x776b5d); optimizeTemplateShadows(cannonTemplate); towerTemplates.set('cannon', cannonTemplate)
    const frostPlaceholder = new THREE.Group(); frostPlaceholder.userData.frostEffectCenterY = 1.77; frostPlaceholder.add(groundShadow(.42)); decorateFrostTower(frostPlaceholder); towerTemplates.set('frost', frostPlaceholder)
    towerTemplates.set('fire', createFireTowerTemplate(frostPlaceholder))
    towerTemplates.set('thunder', createFireTowerTemplate(frostPlaceholder))
    towerTemplates.set('water', createFireTowerTemplate(frostPlaceholder))
    projectileTemplates.set('archer', createProjectileTemplate('archer'))
    projectileTemplates.set('cannon', createProjectileTemplate('cannon'))
    projectileTemplates.set('frost', createProjectileTemplate('frost'))
    projectileTemplates.set('fire', createProjectileTemplate('fire'))
    projectileTemplates.set('thunder', createProjectileTemplate('thunder'))
    projectileTemplates.set('water', createProjectileTemplate('water'))
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.12; target.appendChild(renderer.domElement)
    renderer.setClearColor(0x1c3627, 1)
    camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 50)
    camera.position.copy(defaultCameraPosition)
    camera.zoom = .92
    camera.lookAt(defaultCameraTarget)
    camera.updateProjectionMatrix()
    controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(defaultCameraTarget); controls.enableDamping = true; controls.dampingFactor = .075; controls.enablePan = true; controls.panSpeed = .85; controls.zoomToCursor = true; controls.screenSpacePanning = true; controls.minZoom = .72; controls.maxZoom = 3.1; controls.minPolarAngle = .38; controls.maxPolarAngle = 1.32; controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY; controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; controls.update()
    scene.add(new THREE.AmbientLight(0xffffff, .72))
    scene.add(new THREE.HemisphereLight(0xffffff, 0x64706a, 1.45))
    const sun = new THREE.DirectionalLight(0xffffff, 2.85); sun.position.set(-6, 12, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00008; sun.shadow.normalBias = .025; sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdbeafe, .58); fill.position.set(7, 6, -8); scene.add(fill)
    createMapFoundation()
    const pathSet = new Set(DEFENSE_PATH_TILES.map(point => `${point.x}:${point.y}`))
    for (let y = 0; y < DEFENSE_GRID_ROWS; y++) for (let x = 0; x < DEFENSE_GRID_COLUMNS; x++) {
      const isPath = pathSet.has(`${x}:${y}`)
      const grassTone = ((x * 7 + y * 11) % 4 === 0) ? 0x426b48 : ((x + y) % 3 === 0 ? 0x4d7650 : 0x386342)
      const tile = mesh(new THREE.BoxGeometry(.99, isPath ? .1 : .15, .99), isPath ? 0x343b3d : grassTone, { roughness: 1 })
      tile.position.copy(worldPosition(x, y)); tile.position.y = isPath ? -.025 : 0; tile.userData.cell = { x, y }; tileMeshes.push(tile); scene.add(tile)
    }
    createCobblestonePath()
    createEnemyRouteLines()
    createMapScenery()
    createMysticAtmosphere()
    hoverMarker = new THREE.Mesh(new THREE.PlaneGeometry(.88, .88), new THREE.MeshBasicMaterial({ color: 0xf8edba, transparent: true, opacity: .25, depthWrite: false, side: THREE.DoubleSide }))
    hoverMarker.rotation.x = -Math.PI / 2; hoverMarker.visible = false; scene.add(hoverMarker)
    attackRangeMarker = new THREE.Group()
    const rangeDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: .09, depthWrite: false, side: THREE.DoubleSide }))
    const rangeRing = new THREE.Mesh(new THREE.RingGeometry(.965, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: .78, depthWrite: false, side: THREE.DoubleSide }))
    rangeDisc.rotation.x = rangeRing.rotation.x = -Math.PI / 2
    for (const marker of [rangeDisc, rangeRing]) { marker.renderOrder = 4; marker.frustumCulled = false }
    attackRangeMarker.add(rangeDisc, rangeRing); attackRangeMarker.visible = false; scene.add(attackRangeMarker)
    towerFocusMarker = new THREE.Group()
    const focusHalo = new THREE.Mesh(new THREE.RingGeometry(.49, .62, 56), new THREE.MeshBasicMaterial({ color: 0xb51f2e, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }))
    const focusRing = new THREE.Mesh(new THREE.RingGeometry(.55, .59, 56), new THREE.MeshBasicMaterial({ color: 0xe43845, transparent: true, opacity: .98, depthWrite: false, side: THREE.DoubleSide }))
    for (const marker of [focusHalo, focusRing]) { marker.rotation.x = -Math.PI / 2; marker.renderOrder = 6; marker.frustumCulled = false }
    towerFocusMarker.add(focusHalo, focusRing); towerFocusMarker.visible = false; scene.add(towerFocusMarker)
    const resize = () => {
      if (!renderer || !camera) return
      const width = Math.max(target.clientWidth, 2)
      const height = Math.max(target.clientHeight, 2)
      const aspect = width / height
      const viewHeight = DEFENSE_GRID_ROWS + 4
      camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2; camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2
      camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
    }
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(target); resize()
    const cellAtPointer = (event: PointerEvent) => {
      if (!renderer || !camera) return null
      const bounds = renderer.domElement.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return null
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(tileMeshes, false)[0]
      return hit?.object.userData.cell as { x: number; y: number } | undefined
    }
    renderer.domElement.addEventListener('pointerdown', (event) => {
      pointerStart.set(event.clientX, event.clientY); pointerTravel = 0
      if (event.button === 0 && controls) { cameraReturning = false; controls.enabled = true }
    })
    renderer.domElement.addEventListener('pointermove', (event) => {
      if (event.buttons & 1) { pointerCurrent.set(event.clientX, event.clientY); pointerTravel = Math.max(pointerTravel, pointerStart.distanceTo(pointerCurrent)) }
      const cell = cellAtPointer(event)
      if (hoverMarker) hoverMarker.userData.hoveredCell = cell
      renderer!.domElement.style.cursor = event.buttons & 1 ? 'grabbing' : cell ? 'pointer' : 'grab'
    })
    renderer.domElement.addEventListener('pointerleave', () => { if (hoverMarker) hoverMarker.userData.hoveredCell = undefined })
    renderer.domElement.addEventListener('click', (event) => {
      if (pointerTravel > 5) return
      const cell = cellAtPointer(event)
      if (cell) emit('cellSelect', cell.x, cell.y)
      else emit('backgroundSelect')
    })
    renderer.domElement.addEventListener('contextmenu', event => event.preventDefault())
    renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); renderError.value = 'Kết nối đồ họa 3D đã bị gián đoạn. Hãy tải lại trang.' })
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      const frameDelta = Math.min(clock.getDelta(), .05)
      if (!props.isPaused) { visualElapsed += frameDelta; visualNow += frameDelta * 1000 }
      if (cameraReturning) updateCameraReturn(frameDelta)
      else controls?.update()
      if (!props.isPaused) syncScene(visualElapsed, frameDelta, visualNow)
      renderer!.render(scene!, camera!)
    }
    window.addEventListener('keydown', handleCameraResetShortcut)
    await Promise.allSettled([
      loadFrostTower(),
      loadFireTower(),
      loadThunderTower(),
      loadWaterTower(),
      loadRiggedEnemy(),
      loadCastleModel(),
    ])
    if (!renderer || !scene || !camera || !host.value?.isConnected) return
    syncScene(visualElapsed, 0, visualNow)
    renderer.render(scene, camera)
    emit('ready')
    animate()
  } catch (error) {
    renderError.value = 'Không thể khởi tạo đồ họa 3D. Hãy bật WebGL hoặc tăng tốc phần cứng trong trình duyệt.'
    console.error('[Kingdom Defense] Scene initialization failed:', error)
    emit('ready')
  }
}

// Chờ DOM có host trước khi tạo WebGL context; requestAnimationFrame giúp Nuxt
// hoàn tất layout để camera/renderer lấy đúng kích thước ban đầu.
onMounted(async () => {
  await nextTick()
  animationFrame = requestAnimationFrame(() => { void createWorld() })
})
// Thu hồi listener, animation frame, controls, skeleton, geometry, material,
// texture và WebGL context để vào lại route không nhân đôi tài nguyên GPU.
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleCameraResetShortcut)
  cancelAnimationFrame(animationFrame); resizeObserver?.disconnect(); controls?.dispose(); controls = null; tileMeshes.length = 0
  for (const model of enemyModels.values()) disposeEnemyModel(model)
  enemyModels.clear()
  towerUpgradeEffects.clear()
  const characterTemplates = new Set<THREE.Group>(bossEnemyTemplates.values())
  if (riggedEnemyTemplate) characterTemplates.add(riggedEnemyTemplate)
  characterTemplates.forEach(template => disposeObject(template))
  bossEnemyTemplates.clear()
  const equipmentTemplates = new Set<THREE.Object3D>()
  if (enemySwordTemplate) equipmentTemplates.add(enemySwordTemplate)
  if (enemyShieldTemplate) equipmentTemplates.add(enemyShieldTemplate)
  bossEquipmentTemplates.forEach(({ right, left }) => { equipmentTemplates.add(right); equipmentTemplates.add(left) })
  equipmentTemplates.forEach(template => disposeObject(template))
  bossEquipmentTemplates.clear()
  enemySwordTemplate = null; enemyShieldTemplate = null
  riggedEnemyTemplate = null; riggedEnemyAnimations = []
  scene?.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.Line) { if (child instanceof THREE.Mesh || child instanceof THREE.Line) child.geometry.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; materials.forEach(material => material.dispose()) } })
  surfaceDetail?.dispose(); surfaceDetail = null; frostGlowTexture?.dispose(); frostGlowTexture = null; frostWaveTexture?.dispose(); frostWaveTexture = null; fireWaveTexture?.dispose(); fireWaveTexture = null; enemyStatusBadgeTextures.forEach(texture => texture.dispose()); enemyStatusBadgeTextures.clear(); mysticParticles = null; renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); renderer = null; scene = null
})
</script>

<template>
  <div ref="host" class="tower-defense-scene" role="application" aria-label="Bản đồ phòng thủ 3D">
    <p v-if="renderError" class="tower-defense-scene__error">{{ renderError }}</p>
  </div>
</template>

<style scoped>
.tower-defense-scene { position: absolute; z-index: 1; inset: 0; overflow: hidden; border-radius: 10px; background: linear-gradient(#b8d494 0 45%, #80965f 45% 100%); touch-action: none; -webkit-user-select: none; user-select: none; }
.tower-defense-scene :deep(canvas) { display: block; width: 100%; height: 100%; }
.tower-defense-scene__error { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding: 24px; background: #172017; color: #f3d899; text-align: center; }
</style>
