<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DEFENSE_GRID_COLUMNS, DEFENSE_GRID_ROWS, DEFENSE_PATH, DEFENSE_PATH_TILES, TOWER_DEFINITIONS, TOWER_RANGE_LEVEL_BONUS, defensePathPosition } from '~/composables/useTowerDefense'
import type { Enemy, GamePhase, Impact, Projectile, Tower, TowerKind } from '~/types/games/towerDefense'

const props = defineProps<{ towers: Tower[]; enemies: Enemy[]; projectiles: Projectile[]; impacts: Impact[]; selectedTowerId: number | null; selectedKind: TowerKind | null; phase: GamePhase; speedMultiplier: 1 | 2 }>()
const emit = defineEmits<{
  cellSelect: [x: number, y: number]
  backgroundSelect: []
  selectedTowerPosition: [x: number, y: number, visible: boolean]
}>()
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
const clock = new THREE.Clock()
const towerModels = new Map<number, THREE.Group>()
const enemyModels = new Map<number, THREE.Group>()
const projectileModels = new Map<number, { group: THREE.Group; bornAt: number }>()
const impactModels = new Map<number, THREE.Group>()
const towerTemplates = new Map<Tower['kind'], THREE.Group>()
let towerPreviewModel: THREE.Group | null = null
let towerPreviewKind: TowerKind | null = null
const projectileTemplates = new Map<Projectile['kind'], THREE.Group>()
let enemyTemplate: THREE.Group | null = null
let riggedEnemyTemplate: THREE.Group | null = null
let riggedEnemyAnimations: THREE.AnimationClip[] = []
const tileMeshes: THREE.Mesh[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pointerStart = new THREE.Vector2()
const pointerCurrent = new THREE.Vector2()
const defaultCameraPosition = new THREE.Vector3(5.7, 12.5, 5.6)
const defaultCameraTarget = new THREE.Vector3(1.3, 0, 0)
const defaultCameraOffset = defaultCameraPosition.clone().sub(defaultCameraTarget)
const cameraReturnPosition = new THREE.Vector3()
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

const worldPosition = (x: number, y: number) => new THREE.Vector3(x - (DEFENSE_GRID_COLUMNS - 1) / 2, 0, y - (DEFENSE_GRID_ROWS - 1) / 2)
function pathPosition(progress: number, lane: 0 | 1 = 0) {
  const position = defensePathPosition(progress, lane)
  return worldPosition(position.x, position.y)
}
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

const disposeObject = (object: THREE.Object3D, disposeResources = true) => {
  object.traverse((child) => {
    if (!disposeResources) return
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Sprite)) return
    if (child instanceof THREE.Mesh) child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(material => material.dispose())
  })
  object.removeFromParent()
}

function mesh(geometry: THREE.BufferGeometry, color: number, options: { roughness?: number; metalness?: number; emissive?: number; flatShading?: boolean } = {}) {
  const roughness = options.roughness ?? .72
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: options.metalness ?? .05, emissive: options.emissive ?? 0, emissiveIntensity: options.emissive ? 1.35 : 1, flatShading: options.flatShading ?? false, bumpMap: roughness > .5 ? surfaceDetail : null, bumpScale: roughness > .5 ? .012 : 0 })
  const item = new THREE.Mesh(geometry, material)
  item.castShadow = true
  item.receiveShadow = true
  return item
}

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

function optimizeTemplateShadows(group: THREE.Group) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.computeBoundingSphere()
    // Chi tiết nhỏ vẫn nhận ánh sáng nhưng không tạo thêm một shadow draw-call.
    if ((child.geometry.boundingSphere?.radius ?? 0) < .22) child.castShadow = false
  })
}

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

function addBattlements(group: THREE.Group, y: number, radius: number, color: number, count = 8) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const block = mesh(new THREE.BoxGeometry(.18, .18, .14), color)
    block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius)
    block.rotation.y = angle
    group.add(block)
  }
}

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

function addStoneCourses(group: THREE.Group, courses: Array<{ y: number; radius: number }>, color: number) {
  for (const course of courses) {
    const seam = mesh(new THREE.CylinderGeometry(course.radius, course.radius, .035, 16), color, { roughness: .92 })
    seam.position.y = course.y; group.add(seam)
  }
}

function addArrowSlits(group: THREE.Group, y: number, radius: number, count = 4) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const slit = mesh(new THREE.BoxGeometry(.065, .23, .025), 0x171b1a, { metalness: .08, roughness: .52 })
    slit.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius)
    slit.rotation.y = angle
    group.add(slit)
  }
}

function createBanner(color: number, trim: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-.11, .2); shape.lineTo(.11, .2); shape.lineTo(.11, -.14); shape.lineTo(0, -.22); shape.lineTo(-.11, -.14); shape.closePath()
  const cloth = mesh(new THREE.ShapeGeometry(shape), color, { roughness: .9 })
  ;(cloth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
  const emblem = mesh(new THREE.CircleGeometry(.035, 10), trim, { metalness: .35, roughness: .38 }); emblem.position.z = .008
  cloth.add(emblem)
  return cloth
}

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

function addDoor(group: THREE.Group, y: number, z: number) {
  const door = mesh(new THREE.BoxGeometry(.2, .31, .035), 0x49301f); door.position.set(0, y, z)
  const ring = mesh(new THREE.TorusGeometry(.035, .009, 5, 10), 0xc18b3d, { metalness: .7, roughness: .25 }); ring.position.set(.045, y, z + .025)
  group.add(door, ring)
}

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
  turret.name = 'towerTurret'; flag.name = 'towerFlag'
  turret.add(roof, roofTrim, cap, flagPole, flag); group.add(base, body, lowerBand, deck, turret)
  return group
}

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
  for (const z of [.16, .43, .69]) {
    const barrelBand = mesh(new THREE.TorusGeometry(.12, .018, 7, 16), 0x8d7148, { metalness: .72, roughness: .28 }); barrelBand.rotation.x = Math.PI / 2; barrelBand.position.z = z; barrelRig.add(barrelBand)
  }
  for (const x of [-.27, .27]) {
    const wheel = mesh(new THREE.CylinderGeometry(.19, .19, .085, 16), 0x382c24, { roughness: .8 }); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, -.04, .03); turret.add(wheel)
    const hub = mesh(new THREE.CylinderGeometry(.065, .065, .1, 12), 0x846844, { metalness: .48, roughness: .35 }); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); turret.add(hub)
  }
  turret.name = 'towerTurret'; barrel.name = 'towerBarrel'; muzzle.name = 'towerMuzzle'
  barrelRig.add(barrel, muzzle, muzzleFlash); turret.add(cradle, barrelRig); group.add(base, wall, lowerBand, rim, turret)
  return group
}

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

function createFireTowerTemplate(frostTemplate: THREE.Group) {
  const group = frostTemplate.clone(true)
  group.name = 'FireTower3D'
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return
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

function bindTowerParts(group: THREE.Group) {
  group.userData.turret = group.getObjectByName('towerTurret')
  group.userData.flag = group.getObjectByName('towerFlag')
  group.userData.barrelRig = group.getObjectByName('towerBarrelRig')
  group.userData.barrel = group.getObjectByName('towerBarrel')
  group.userData.muzzle = group.getObjectByName('towerMuzzle')
  group.userData.muzzleFlash = group.getObjectByName('towerMuzzleFlash')
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

function towerScaleForLevel(level: number) {
  const levelScale = .94 + level * .075
  return { horizontal: levelScale * .93, vertical: levelScale * 1.24 }
}

function setTowerScale(group: THREE.Group, level: number) {
  const scale = towerScaleForLevel(level)
  group.scale.set(scale.horizontal, scale.vertical, scale.horizontal)
}

function createTowerModel(tower: Tower) {
  const template = towerTemplates.get(tower.kind)
  if (!template) throw new Error(`Missing tower template: ${tower.kind}`)
  const group = template.clone(true)
  bindTowerParts(group)
  setTowerScale(group, tower.level)
  group.position.copy(worldPosition(tower.x, tower.y)); group.position.y = .05
  group.userData.shotSequence = tower.shotSequence; group.userData.firedAt = 0
  scene!.add(group); return group
}

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

function createGoblinLeg(x: number) {
  const leg = new THREE.Bone(); leg.position.set(x, .56, 0)
  const thigh = mesh(new THREE.CylinderGeometry(.075, .09, .27, 7), 0x58712f); thigh.position.y = -.13
  const knee = new THREE.Bone(); knee.position.y = -.28; knee.name = x < 0 ? 'enemyLeftKnee' : 'enemyRightKnee'
  const kneeJoint = mesh(new THREE.SphereGeometry(.085, 7, 5), 0x4d5f2b)
  const shin = mesh(new THREE.CylinderGeometry(.06, .075, .25, 7), 0x66503a); shin.position.y = -.12
  const boot = mesh(new THREE.BoxGeometry(.16, .13, .24), 0x2f251f); boot.position.set(0, -.26, .055); boot.rotation.x = -.08
  knee.add(kneeJoint, shin, boot); leg.add(thigh, knee)
  return leg
}

function createGoblinArm(x: number) {
  const arm = new THREE.Bone(); arm.position.set(x, .98, 0)
  const upper = mesh(new THREE.CylinderGeometry(.075, .09, .28, 7), 0x769640); upper.position.y = -.14
  const elbow = new THREE.Bone(); elbow.position.y = -.3; elbow.name = x < 0 ? 'enemyLeftElbow' : 'enemyRightElbow'
  const elbowJoint = mesh(new THREE.SphereGeometry(.082, 7, 5), 0x668438)
  const forearm = mesh(new THREE.CylinderGeometry(.06, .075, .25, 7), 0x83a74a); forearm.position.y = -.12
  const hand = mesh(new THREE.SphereGeometry(.075, 8, 6), 0x8eb650); hand.position.y = -.27; hand.scale.y = .8
  elbow.add(elbowJoint, forearm, hand); arm.add(upper, elbow)
  return arm
}

function createGoblinTemplate() {
  const group = new THREE.Group()
  const rig = new THREE.Bone(); rig.name = 'enemyRigRoot'
  const torso = mesh(new THREE.CylinderGeometry(.2, .28, .5, 9), 0x647f36); torso.position.y = .78
  const tunic = mesh(new THREE.CylinderGeometry(.25, .31, .48, 9), 0x68402d); tunic.position.y = .66
  const chestPlate = mesh(new THREE.DodecahedronGeometry(.3, 0), 0x554a3b, { metalness: .28, roughness: .54 }); chestPlate.position.set(0, .84, .08); chestPlate.scale.set(.9, .72, .5)
  const neck = mesh(new THREE.CylinderGeometry(.105, .13, .18, 8), 0x718f3e); neck.position.y = 1.06
  const scarf = mesh(new THREE.TorusGeometry(.2, .045, 7, 16), 0x812f28); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.02
  const belt = mesh(new THREE.CylinderGeometry(.27, .27, .075, 9), 0x30251f); belt.position.y = .64
  const buckle = mesh(new THREE.BoxGeometry(.105, .09, .04), 0xb8893e, { metalness: .65, roughness: .28 }); buckle.position.set(0, .64, .274)

  const head = new THREE.Bone(); head.position.y = 1.27
  const skull = mesh(new THREE.SphereGeometry(.25, 14, 10), 0x829f45); skull.scale.set(.95, 1, .9)
  const jaw = mesh(new THREE.SphereGeometry(.19, 10, 7), 0x77933e); jaw.position.set(0, -.11, .105); jaw.scale.set(1, .65, .75)
  const nose = mesh(new THREE.ConeGeometry(.07, .2, 7), 0x94b552); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.015, .27)
  const mouth = mesh(new THREE.BoxGeometry(.17, .025, .018), 0x281918); mouth.position.set(0, -.145, .235)
  const helmet = mesh(new THREE.SphereGeometry(.265, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), 0x40362e, { metalness: .22, roughness: .58 }); helmet.position.y = .015; helmet.scale.z = .94
  const helmetBand = mesh(new THREE.TorusGeometry(.245, .028, 6, 16), 0x75634c, { metalness: .45, roughness: .38 }); helmetBand.rotation.x = Math.PI / 2; helmetBand.position.y = .015
  const leftEar = mesh(new THREE.ConeGeometry(.09, .3, 7), 0x829f45); leftEar.rotation.z = Math.PI / 2; leftEar.position.set(-.32, .015, 0)
  const rightEar = leftEar.clone(); rightEar.rotation.z = -Math.PI / 2; rightEar.position.x = .32
  head.add(skull, jaw, nose, mouth, helmet, helmetBand, leftEar, rightEar)
  for (const x of [-.085, .085]) {
    const socket = mesh(new THREE.SphereGeometry(.058, 8, 6), 0x425127); socket.position.set(x, .055, .215); socket.scale.y = .75
    const eye = mesh(new THREE.SphereGeometry(.035, 8, 6), 0xe6c96f, { emissive: 0x2f2508 }); eye.position.set(x, .052, .252)
    const pupil = mesh(new THREE.SphereGeometry(.014, 6, 4), 0x17120d); pupil.position.set(x, .052, .282)
    const brow = mesh(new THREE.BoxGeometry(.105, .025, .025), 0x354321); brow.position.set(x, .12, .242); brow.rotation.z = x < 0 ? -.22 : .22
    head.add(socket, eye, pupil, brow)
  }
  for (const x of [-.07, .07]) {
    const tusk = mesh(new THREE.ConeGeometry(.022, .1, 6), 0xead9ac); tusk.position.set(x, -.17, .255); tusk.rotation.z = x < 0 ? -.12 : .12; head.add(tusk)
  }

  const leftLeg = createGoblinLeg(-.13); const rightLeg = createGoblinLeg(.13)
  const leftArm = createGoblinArm(-.31); leftArm.rotation.z = -.32
  const rightArm = createGoblinArm(.31); rightArm.rotation.z = .32
  for (const x of [-.3, .3]) {
    const arm = x < 0 ? leftArm : rightArm
    const shoulder = mesh(new THREE.SphereGeometry(.13, 9, 6), 0x4b4439, { metalness: .3, roughness: .5 }); shoulder.position.set(0, -.02, 0); shoulder.scale.set(1.15, .72, 1); arm.add(shoulder)
    const shoulderRim = mesh(new THREE.TorusGeometry(.105, .018, 5, 12, Math.PI), 0x91734a, { metalness: .5, roughness: .35 }); shoulderRim.position.set(0, -.01, .07); shoulderRim.rotation.z = x < 0 ? -.25 : .25; arm.add(shoulderRim)
  }

  const weapon = new THREE.Bone(); weapon.position.set(.39, .69, .06); weapon.rotation.z = -.36
  const handle = mesh(new THREE.CylinderGeometry(.024, .03, .62, 7), 0x4b3021); handle.position.y = .06
  const bladeShape = new THREE.Shape(); bladeShape.moveTo(-.035, 0); bladeShape.lineTo(.18, .05); bladeShape.lineTo(.22, .25); bladeShape.lineTo(.03, .3); bladeShape.lineTo(-.045, .2); bladeShape.closePath()
  const blade = mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: .055, bevelEnabled: true, bevelSize: .012, bevelThickness: .01, bevelSegments: 1 }), 0x9da39e, { metalness: .8, roughness: .24 }); blade.position.set(.005, .31, -.027)
  weapon.add(handle, blade)

  const shield = new THREE.Bone(); shield.position.set(-.39, .75, .22); shield.rotation.z = .08
  const shieldFace = mesh(new THREE.CylinderGeometry(.245, .245, .065, 14), 0x5a3c29); shieldFace.rotation.x = Math.PI / 2
  const shieldRim = mesh(new THREE.TorusGeometry(.245, .028, 6, 18), 0x77736c, { metalness: .7, roughness: .28 })
  const shieldBoss = mesh(new THREE.SphereGeometry(.07, 9, 7), 0x898781, { metalness: .75, roughness: .22 }); shieldBoss.position.z = .06
  shield.add(shieldFace, shieldRim, shieldBoss)
  for (let index = 0; index < 6; index++) {
    const angle = index / 6 * Math.PI * 2
    const rivet = mesh(new THREE.SphereGeometry(.016, 6, 4), 0xb29a69, { metalness: .65, roughness: .3 }); rivet.position.set(Math.cos(angle) * .19, Math.sin(angle) * .19, .07); shield.add(rivet)
  }

  const healthBack = mesh(new THREE.PlaneGeometry(.78, .07), 0x401b18); healthBack.position.set(0, 1.64, .05); healthBack.rotation.x = -1
  const health = mesh(new THREE.PlaneGeometry(.74, .045), 0x78cf58, { emissive: 0x183d10 }); health.position.set(0, 1.645, .085); health.rotation.x = -1
  leftLeg.name = 'enemyLeftLeg'; rightLeg.name = 'enemyRightLeg'; leftArm.name = 'enemyLeftArm'; rightArm.name = 'enemyRightArm'
  weapon.name = 'enemyWeapon'; shield.name = 'enemyShield'; head.name = 'enemyHead'; health.name = 'enemyHealth'
  rig.add(torso, tunic, chestPlate, neck, scarf, belt, buckle, head, leftLeg, rightLeg, leftArm, rightArm, weapon, shield)
  group.add(rig, healthBack, health)
  group.scale.setScalar(.74); return group
}

function addEnemyBurnEffect(group: THREE.Group) {
  const effect = new THREE.Group()
  effect.name = 'enemyBurnEffect'
  effect.visible = false
  for (let index = 0; index < 5; index++) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(.09 + index % 2 * .025, .3 + index % 3 * .07, 7),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffb126 : 0xff3b18, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    const angle = index / 5 * Math.PI * 2
    flame.position.set(Math.cos(angle) * .23, .38 + index % 2 * .28, Math.sin(angle) * .18)
    flame.userData.baseY = flame.position.y
    flame.userData.phase = index * 1.17
    effect.add(flame)
  }
  group.add(effect)
  group.userData.burnEffect = effect
}

function createEnemyModel() {
  if (riggedEnemyTemplate) {
    const group = cloneSkeleton(riggedEnemyTemplate) as THREE.Group
    const health = group.getObjectByName('enemyHealth') as THREE.Mesh
    const mixer = new THREE.AnimationMixer(group)
    const walk = riggedEnemyAnimations.find(clip => clip.name === 'Walk') ?? riggedEnemyAnimations[0]
    if (walk) mixer.clipAction(walk).play()
    group.userData.health = health
    group.userData.mixer = mixer
    group.userData.isSkinnedCharacter = true
    addEnemyBurnEffect(group)
    scene!.add(group)
    return group
  }
  if (!enemyTemplate) throw new Error('Missing enemy template')
  const group = enemyTemplate.clone(true)
  group.userData.leftLeg = group.getObjectByName('enemyLeftLeg')
  group.userData.rightLeg = group.getObjectByName('enemyRightLeg')
  group.userData.leftKnee = group.getObjectByName('enemyLeftKnee')
  group.userData.rightKnee = group.getObjectByName('enemyRightKnee')
  group.userData.leftArm = group.getObjectByName('enemyLeftArm')
  group.userData.rightArm = group.getObjectByName('enemyRightArm')
  group.userData.leftElbow = group.getObjectByName('enemyLeftElbow')
  group.userData.rightElbow = group.getObjectByName('enemyRightElbow')
  group.userData.weapon = group.getObjectByName('enemyWeapon')
  group.userData.shield = group.getObjectByName('enemyShield')
  group.userData.head = group.getObjectByName('enemyHead')
  group.userData.rig = group.getObjectByName('enemyRigRoot')
  group.userData.health = group.getObjectByName('enemyHealth')
  addEnemyBurnEffect(group)
  const bones: THREE.Bone[] = []
  group.traverse((child) => { if (child instanceof THREE.Bone) bones.push(child) })
  group.updateMatrixWorld(true)
  group.userData.skeleton = new THREE.Skeleton(bones)
  scene!.add(group)
  return group
}

function disposeEnemyModel(model: THREE.Group) {
  const mixer = model.userData.mixer as THREE.AnimationMixer | undefined
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model) }
  const skeletons = new Set<THREE.Skeleton>()
  model.traverse((child) => { if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton) })
  skeletons.forEach(skeleton => skeleton.dispose())
  ;(model.userData.skeleton as THREE.Skeleton | undefined)?.dispose()
  disposeObject(model, false)
}

async function loadRiggedEnemy() {
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/games/tower-defense/goblin-soldier.glb')
    if (!scene || !host.value?.isConnected) return
    const character = gltf.scene
    character.rotation.y = Math.PI
    character.scale.setScalar(.78)
    const visorTint = new THREE.Color(0x080b10)
    character.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true; child.receiveShadow = true
      const tint = (source: THREE.Material) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          const isVisor = material.name === 'Vanguard_VisorMat' || child.name.toLowerCase().includes('visor')
          if (isVisor) {
            material.color.lerp(visorTint, .82)
            material.metalness = .9
            material.roughness = .2
            material.envMapIntensity = 1.35
          } else {
            // Da, vải và giáp dùng chung một texture. Tạo mask từ vùng màu be
            // để lớp đen kim loại chỉ phủ lên các mảng giáp ngoài.
            material.onBeforeCompile = (shader) => {
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nfloat armorMask;')
                .replace('#include <map_fragment>', `#include <map_fragment>
                  float armorRed = smoothstep(0.045, 0.16, diffuseColor.r - diffuseColor.g);
                  float armorGold = smoothstep(0.025, 0.11, diffuseColor.g - diffuseColor.b);
                  float armorLight = smoothstep(0.16, 0.34, diffuseColor.g);
                  armorMask = armorRed * armorGold * armorLight;
                  vec3 blackSteel = diffuseColor.rgb * vec3(0.18, 0.22, 0.27);
                  diffuseColor.rgb = mix(diffuseColor.rgb, blackSteel, armorMask * 0.88);`)
                .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                  roughnessFactor = mix(roughnessFactor, 0.32, armorMask);`)
                .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
                  metalnessFactor = mix(metalnessFactor, 0.82, armorMask);`)
            }
            material.customProgramCacheKey = () => 'goblin-selective-black-armor-v1'
            material.envMapIntensity = 1.1
          }
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material)
    })
    const wrapper = new THREE.Group()
    const healthBack = mesh(new THREE.PlaneGeometry(.78, .07), 0x401b18); healthBack.position.set(0, 1.9, .05); healthBack.rotation.x = -1
    const health = mesh(new THREE.PlaneGeometry(.74, .045), 0x78cf58, { emissive: 0x183d10 }); health.position.set(0, 1.905, .085); health.rotation.x = -1; health.name = 'enemyHealth'
    wrapper.add(character, healthBack, health)
    riggedEnemyTemplate = wrapper
    riggedEnemyAnimations = gltf.animations
    // Thay các fallback procedural đang tồn tại bằng SkinnedMesh ở frame kế tiếp.
    for (const model of enemyModels.values()) disposeEnemyModel(model)
    enemyModels.clear()
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải rigged enemy, dùng model dự phòng.', error)
  }
}

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
          material.color.setRGB(1, 1, 1)
          material.emissive.setRGB(0, 0, 0)
          material.emissiveIntensity = 0
          material.roughness = .62
          material.metalness = .08
          material.envMapIntensity = .9
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(tuneMaterial) : tuneMaterial(child.material)
    })
    template.add(source)
    decorateFrostTower(template)
    template.add(groundShadow(.42))
    optimizeTemplateShadows(template)

    const fireTemplate = createFireTowerTemplate(template)
    const previousTemplate = towerTemplates.get('frost')
    const previousFireTemplate = towerTemplates.get('fire')
    if (towerPreviewKind === 'frost' || towerPreviewKind === 'fire') removeTowerPreview()
    for (const [id, model] of towerModels) {
      const kind = props.towers.find(tower => tower.id === id)?.kind
      if (kind !== 'frost' && kind !== 'fire') continue
      disposeObject(model, false)
      towerModels.delete(id)
    }
    if (previousTemplate) disposeObject(previousTemplate)
    if (previousFireTemplate) disposeObject(previousFireTemplate)
    towerTemplates.set('frost', template)
    towerTemplates.set('fire', fireTemplate)
  } catch (error) {
    console.warn('[Kingdom Defense] Không thể tải frost-tower-3d.glb, dùng placeholder dự phòng.', error)
  }
}

function createProjectileTemplate(kind: Projectile['kind']) {
  const group = new THREE.Group()
  let shot: THREE.Mesh
  if (kind === 'archer') {
    shot = mesh(new THREE.CylinderGeometry(.025, .025, .42, 6), 0xf2d28a); shot.rotation.x = Math.PI / 2
  } else if (kind === 'cannon') {
    shot = mesh(new THREE.SphereGeometry(.11, 9, 7), 0x332b25, { metalness: .7 });
  } else if (kind === 'fire') {
    shot = mesh(new THREE.SphereGeometry(.105, 14, 10), 0xffd052, { emissive: 0xe8380b, roughness: .18 })
    shot.name = 'fireballCore'
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.185, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff4a18, transparent: true, opacity: .34, depthWrite: false, blending: THREE.AdditiveBlending }))
    shot.add(glow)
  } else {
    shot = mesh(new THREE.OctahedronGeometry(.12), 0x74e8ff, { emissive: 0x2389a0 });
  }
  group.add(shot)
  return group
}

function createProjectile(projectile: Projectile) {
  const template = projectileTemplates.get(projectile.kind)
  if (!template) throw new Error(`Missing projectile template: ${projectile.kind}`)
  const group = template.clone(true)
  scene!.add(group)
  return { group, bornAt: performance.now() }
}

function createImpact(impact: Impact, now: number) {
  const color = impact.kind === 'frost' ? 0x6ee7ff : impact.kind === 'fire' ? 0xff3b1f : impact.kind === 'cannon' ? 0xff7a2f : 0xffe2a1
  const group = new THREE.Group(); group.position.copy(worldPosition(impact.position.x, impact.position.y)); group.userData.bornAt = now; group.userData.visualDuration = (impact.kind === 'frost' ? 1050 : impact.kind === 'fire' ? 650 : 240) / props.speedMultiplier
  if (impact.kind === 'frost') {
    group.position.y = .08
    const radius = impact.radius ?? 1

    // Sóng gradient lan trực tiếp từ chân tháp ra toàn bộ vùng sát thương.
    const waveMaterial = (opacity: number) => {
      const material = new THREE.MeshBasicMaterial({ map: getFrostWaveTexture(), color: 0xb6f4ff, transparent: true, opacity, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false })
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
    const waveMaterial = (opacity: number) => new THREE.MeshBasicMaterial({ map: getFireWaveTexture(), color: 0xffb05a, transparent: true, opacity, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false })
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
  } else {
    group.position.y = .45
    const ring = mesh(new THREE.TorusGeometry(.12, .035, 7, 18), color, { emissive: color }); ring.rotation.x = Math.PI / 2; group.add(ring)
  }
  scene!.add(group); return group
}

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

function createPineTree(x: number, z: number, scale: number) {
  const tree = new THREE.Group()
  const trunk = mesh(new THREE.CylinderGeometry(.1, .15, .85, 10), 0x493629, { roughness: .92 }); trunk.position.y = .4
  const lower = mesh(new THREE.ConeGeometry(.58, 1.05, 12), 0x29452f, { roughness: .9 }); lower.position.y = 1.02
  const middle = mesh(new THREE.ConeGeometry(.46, .9, 12), 0x31563a, { roughness: .9 }); middle.position.y = 1.48
  const top = mesh(new THREE.ConeGeometry(.32, .72, 12), 0x3b6542, { roughness: .9 }); top.position.y = 1.87
  tree.add(trunk, lower, middle, top); tree.position.set(x, -.08, z); tree.scale.setScalar(scale); scene!.add(tree)
}

function createCrystalCluster(x: number, z: number, color: number, scale = 1) {
  const cluster = new THREE.Group()
  const stone = mesh(new THREE.DodecahedronGeometry(.24, 0), 0x41494b, { roughness: .9, flatShading: true }); stone.position.y = .12; stone.scale.set(1.5, .55, 1.15); cluster.add(stone)
  for (let index = 0; index < 3; index++) {
    const crystal = mesh(new THREE.OctahedronGeometry(.15 - index * .025, 0), color, { emissive: color, roughness: .12, flatShading: true })
    crystal.position.set((index - 1) * .14, .31 + index * .055, (index % 2 ? -.05 : .04)); crystal.scale.y = 1.8 - index * .2; crystal.rotation.z = (index - 1) * -.2; cluster.add(crystal)
  }
  cluster.position.set(x, -.03, z); cluster.scale.setScalar(scale); scene!.add(cluster)
}

function createRuneStone(x: number, z: number, rotation: number) {
  const stone = new THREE.Group()
  const pillar = mesh(new THREE.BoxGeometry(.28, .82, .2, 2, 4, 2), 0x575c59, { roughness: .94 }); pillar.position.y = .36; pillar.rotation.z = .035
  const rune = mesh(new THREE.TorusGeometry(.075, .014, 6, 16), 0x8bd8cb, { emissive: 0x397f77, roughness: .2 }); rune.position.set(0, .45, .11)
  const mark = mesh(new THREE.BoxGeometry(.018, .22, .018), 0x8bd8cb, { emissive: 0x397f77, roughness: .2 }); mark.position.set(0, .45, .125)
  stone.add(pillar, rune, mark); stone.position.set(x, -.08, z); stone.rotation.y = rotation; scene!.add(stone)
}

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
  entry.position.copy(worldPosition(-.78, DEFENSE_PATH[0]!.y + .5)); entry.position.y = .02; scene!.add(entry)
}

function createCastle() {
  const group = new THREE.Group()
  const plinth = mesh(new THREE.CylinderGeometry(.72, .82, .2, 16), 0x4d4c47, { roughness: .92 }); plinth.position.y = .1
  const keep = mesh(new THREE.BoxGeometry(.78, 1.1, .78, 3, 4, 3), 0x999287, { roughness: .94 }); keep.position.y = .7
  const gate = mesh(new THREE.BoxGeometry(.3, .46, .045), 0x3d2c23, { roughness: .8 }); gate.position.set(0, .32, .415)
  const gateArch = mesh(new THREE.TorusGeometry(.15, .035, 7, 16, Math.PI), 0x68645d, { roughness: .86 }); gateArch.position.set(0, .54, .44); gateArch.rotation.z = Math.PI
  group.add(plinth, keep, gate, gateArch)
  const cornerPositions: Array<[number, number]> = [[-.48, -.44], [.48, -.44], [-.48, .44], [.48, .44]]
  for (const [x, z] of cornerPositions) {
    const tower = mesh(new THREE.CylinderGeometry(.19, .25, 1.02, 14), 0x888278, { roughness: .94 }); tower.position.set(x, .59, z)
    const towerBand = mesh(new THREE.CylinderGeometry(.215, .215, .07, 14), 0x68645d, { roughness: .84 }); towerBand.position.set(x, .92, z)
    const roof = mesh(new THREE.ConeGeometry(.28, .4, 14), 0x653a31, { roughness: .72 }); roof.position.set(x, 1.28, z)
    group.add(tower, towerBand, roof)
  }
  for (const x of [-.2, .2]) {
    const slit = mesh(new THREE.BoxGeometry(.07, .2, .025), 0x1e211f, { roughness: .55 }); slit.position.set(x, .82, .405); group.add(slit)
  }
  addBattlements(group, 1.3, .32, 0xb0aaa0, 8)
  const flagPole = mesh(new THREE.CylinderGeometry(.015, .015, .86, 8), 0x4b3c2d, { metalness: .2, roughness: .5 }); flagPole.position.set(0, 1.62, 0)
  const flag = createBanner(0x6e342d, 0xc19a58); flag.scale.set(1.1, 1.1, 1.1); flag.position.set(.14, 1.84, 0); flag.rotation.y = Math.PI / 2
  const castleCell = DEFENSE_PATH.at(-1)!
  group.add(flagPole, flag); group.position.copy(worldPosition(castleCell.x, castleCell.y + .5)); group.position.y = .07; group.scale.setScalar(.76); scene!.add(group)
}

function syncScene(elapsed: number, frameDelta: number, now: number) {
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
    const turret = model.userData.turret as THREE.Group | undefined
    const targetRotation = Math.PI / 2 - THREE.MathUtils.degToRad(tower.aimAngle)
    if (turret) turret.rotation.y += Math.atan2(Math.sin(targetRotation - turret.rotation.y), Math.cos(targetRotation - turret.rotation.y)) * .14
    if (model.userData.shotSequence !== tower.shotSequence) { model.userData.shotSequence = tower.shotSequence; model.userData.firedAt = now }
    const recoilAge = now - Number(model.userData.firedAt)
    const recoil = recoilAge < 220 ? Math.sin(recoilAge / 220 * Math.PI) : 0
    const towerPosition = worldPosition(tower.x, tower.y)
    model.position.set(towerPosition.x, .05, towerPosition.z)
    setTowerScale(model, tower.level)
    const aura = model.userData.aura as THREE.Group | undefined
    if (aura) { aura.rotation.y = elapsed * (.18 + tower.id % 3 * .035); aura.position.y = .105 + Math.sin(elapsed * 1.8 + tower.id) * .008 }
    const barrel = model.userData.barrel as THREE.Mesh | undefined
    const muzzle = model.userData.muzzle as THREE.Mesh | undefined
    const barrelRig = model.userData.barrelRig as THREE.Group | undefined
    const muzzleFlash = model.userData.muzzleFlash as THREE.Mesh | undefined
    if (barrel) barrel.position.z = .38
    if (muzzle) muzzle.position.z = .82
    if (barrelRig) barrelRig.position.z = -recoil * .13
    if (muzzleFlash) { const flash = recoilAge < 70 ? 1 - recoilAge / 70 : 0; muzzleFlash.visible = flash > 0; muzzleFlash.scale.setScalar(.45 + flash * .9) }
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
  }

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

  const enemyIds = new Set(props.enemies.map(item => item.id))
  for (const [id, model] of enemyModels) if (!enemyIds.has(id)) { disposeEnemyModel(model); enemyModels.delete(id) }
  for (const enemy of props.enemies) {
    const model = enemyModels.get(enemy.id) ?? createEnemyModel(); enemyModels.set(enemy.id, model)
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
    model.scale.setScalar(.494)
    const mixer = model.userData.mixer as THREE.AnimationMixer | undefined
    if (mixer) {
      mixer.timeScale = gaitSpeed * 1.25
      mixer.update(frameDelta)
    } else {
      ;(model.userData.leftLeg as THREE.Bone).rotation.x = stride * .62
      ;(model.userData.rightLeg as THREE.Bone).rotation.x = -stride * .62
      ;(model.userData.leftKnee as THREE.Bone).rotation.x = Math.max(0, -stride) * .52
      ;(model.userData.rightKnee as THREE.Bone).rotation.x = Math.max(0, stride) * .52
      ;(model.userData.leftArm as THREE.Bone).rotation.x = -stride * .34
      ;(model.userData.rightArm as THREE.Bone).rotation.x = stride * .34
      ;(model.userData.leftElbow as THREE.Bone).rotation.x = .16 + Math.max(0, stride) * .22
      ;(model.userData.rightElbow as THREE.Bone).rotation.x = .16 + Math.max(0, -stride) * .22
      ;(model.userData.weapon as THREE.Bone).rotation.x = stride * .28
      ;(model.userData.shield as THREE.Bone).rotation.z = .08 + stride * .045
      ;(model.userData.head as THREE.Bone).rotation.x = Math.sin(elapsed * 8 + enemy.id) * .05
      ;(model.userData.rig as THREE.Bone).rotation.z = stride * .018
    }
    const burnEffect = model.userData.burnEffect as THREE.Group | undefined
    if (burnEffect) {
      burnEffect.visible = enemy.burnRemaining > 0
      if (burnEffect.visible) {
        burnEffect.rotation.y = elapsed * 1.6 + enemy.id
        burnEffect.children.forEach((flame, index) => {
          const flicker = .82 + Math.sin(elapsed * 12 + Number(flame.userData.phase)) * .18
          flame.position.y = Number(flame.userData.baseY) + Math.sin(elapsed * 9 + index) * .035
          flame.scale.set(.82 + flicker * .18, flicker, .82 + flicker * .18)
        })
      }
    }
    const health = model.userData.health as THREE.Mesh; const healthRatio = Math.max(.02, enemy.hp / enemy.maxHp); health.scale.x = healthRatio; health.position.x = -(1 - healthRatio) * .37
  }

  const projectileIds = new Set(props.projectiles.map(item => item.id))
  for (const [id, item] of projectileModels) if (!projectileIds.has(id)) { disposeObject(item.group, false); projectileModels.delete(id) }
  for (const projectile of props.projectiles) {
    const item = projectileModels.get(projectile.id) ?? createProjectile(projectile); projectileModels.set(projectile.id, item)
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
    } else if (projectile.kind === 'fire') {
      const sourceTower = props.towers.find(tower => tower.x === projectile.from.x && tower.y === projectile.from.y && tower.kind === 'fire')
      const towerScale = towerScaleForLevel(sourceTower?.level ?? 1)
      startHeight = .05 + 1.72 * towerScale.vertical
      arcHeight = 0
    }
    item.group.position.lerpVectors(from, to, ratio)
    const fallProgress = projectile.kind === 'fire' ? Math.pow(ratio, 1.55) : ratio
    item.group.position.y = THREE.MathUtils.lerp(startHeight, targetHeight, fallProgress) + Math.sin(ratio * Math.PI) * arcHeight
    item.group.lookAt(to.x, targetHeight, to.z)
    if (projectile.kind === 'fire') {
      const fireball = item.group.getObjectByName('fireballCore')
      if (fireball) {
        fireball.rotateZ(frameDelta * 9)
        const pulse = 1 + Math.sin(elapsed * 18 + projectile.id) * .1
        fireball.scale.setScalar(pulse)
      }
    }
  }

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
    } else {
      model.scale.setScalar(1 + progress * 3); model.rotation.z += .12
    }
  }
}

function updateCameraReturn(frameDelta: number) {
  if (!cameraReturning || !camera || !controls) return
  const easing = 1 - Math.exp(-frameDelta * 6.5)
  cameraReturnPosition.copy(defaultCameraOffset).add(controls.target)
  camera.position.lerp(cameraReturnPosition, easing)
  camera.lookAt(controls.target)

  if (camera.position.distanceToSquared(cameraReturnPosition) < .0004) {
    camera.position.copy(cameraReturnPosition)
    camera.lookAt(controls.target)
    cameraReturning = false
    controls.enabled = true
    const dampingEnabled = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = dampingEnabled
  }
}

function handleCameraPointerUp(event: PointerEvent) {
  if (event.button !== 0 || pointerTravel <= 3 || !controls) return
  cameraReturning = true
  controls.enabled = false
}

function createWorld() {
  const target = host.value
  if (!target) return
  try {
    surfaceDetail = createSurfaceDetail()
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x1c3627, 20, 42)
    const archerTemplate = createArcherTower(); archerTemplate.add(groundShadow(.42)); applyTowerMetallicFinish(archerTemplate, 0x8a7658); optimizeTemplateShadows(archerTemplate); towerTemplates.set('archer', archerTemplate)
    const cannonTemplate = createCannonTower(); cannonTemplate.add(groundShadow(.42)); applyTowerMetallicFinish(cannonTemplate, 0x776b5d); optimizeTemplateShadows(cannonTemplate); towerTemplates.set('cannon', cannonTemplate)
    const frostPlaceholder = new THREE.Group(); frostPlaceholder.userData.frostEffectCenterY = 1.77; frostPlaceholder.add(groundShadow(.42)); decorateFrostTower(frostPlaceholder); towerTemplates.set('frost', frostPlaceholder)
    towerTemplates.set('fire', createFireTowerTemplate(frostPlaceholder))
    enemyTemplate = createGoblinTemplate(); optimizeTemplateShadows(enemyTemplate)
    void loadFrostTower()
    void loadRiggedEnemy()
    projectileTemplates.set('archer', createProjectileTemplate('archer'))
    projectileTemplates.set('cannon', createProjectileTemplate('cannon'))
    projectileTemplates.set('frost', createProjectileTemplate('frost'))
    projectileTemplates.set('fire', createProjectileTemplate('fire'))
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08; target.appendChild(renderer.domElement)
    renderer.setClearColor(0x1c3627, 1)
    camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 50)
    camera.position.copy(defaultCameraPosition)
    camera.zoom = .92
    camera.lookAt(defaultCameraTarget)
    camera.updateProjectionMatrix()
    controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(defaultCameraTarget); controls.enableDamping = true; controls.dampingFactor = .075; controls.enablePan = true; controls.panSpeed = .85; controls.zoomToCursor = true; controls.screenSpacePanning = true; controls.minZoom = .72; controls.maxZoom = 3.1; controls.minPolarAngle = .38; controls.maxPolarAngle = 1.32; controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY; controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; controls.update()
    scene.add(new THREE.HemisphereLight(0xffe4b5, 0x142e3a, 1.82))
    const sun = new THREE.DirectionalLight(0xffc976, 3.05); sun.position.set(-6, 12, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00008; sun.shadow.normalBias = .025; sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; scene.add(sun)
    const fill = new THREE.DirectionalLight(0x708cff, .82); fill.position.set(7, 6, -8); scene.add(fill)
    createMapFoundation()
    const pathSet = new Set(DEFENSE_PATH_TILES.map(point => `${point.x}:${point.y}`))
    for (let y = 0; y < DEFENSE_GRID_ROWS; y++) for (let x = 0; x < DEFENSE_GRID_COLUMNS; x++) {
      const isPath = pathSet.has(`${x}:${y}`)
      const grassTone = ((x * 7 + y * 11) % 4 === 0) ? 0x426b48 : ((x + y) % 3 === 0 ? 0x4d7650 : 0x386342)
      const tile = mesh(new THREE.BoxGeometry(.99, isPath ? .1 : .15, .99), isPath ? 0x343b3d : grassTone, { roughness: 1 })
      tile.position.copy(worldPosition(x, y)); tile.position.y = isPath ? -.025 : 0; tile.userData.cell = { x, y }; tileMeshes.push(tile); scene.add(tile)
    }
    createCobblestonePath()
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
    createCastle()
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
      const elapsed = clock.elapsedTime
      const now = performance.now()
      if (cameraReturning) updateCameraReturn(frameDelta)
      else controls?.update()
      syncScene(elapsed, frameDelta, now); renderer!.render(scene!, camera!)
    }
    window.addEventListener('pointerup', handleCameraPointerUp)
    animate()
  } catch (error) {
    renderError.value = 'Không thể khởi tạo đồ họa 3D. Hãy bật WebGL hoặc tăng tốc phần cứng trong trình duyệt.'
    console.error('[Kingdom Defense] Scene initialization failed:', error)
  }
}

onMounted(async () => {
  await nextTick()
  animationFrame = requestAnimationFrame(createWorld)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', handleCameraPointerUp)
  cancelAnimationFrame(animationFrame); resizeObserver?.disconnect(); controls?.dispose(); controls = null; tileMeshes.length = 0
  for (const model of enemyModels.values()) disposeEnemyModel(model)
  enemyModels.clear()
  if (riggedEnemyTemplate) disposeObject(riggedEnemyTemplate)
  riggedEnemyTemplate = null; riggedEnemyAnimations = []
  scene?.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) { if (child instanceof THREE.Mesh) child.geometry.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; materials.forEach(material => material.dispose()) } })
  surfaceDetail?.dispose(); surfaceDetail = null; frostGlowTexture?.dispose(); frostGlowTexture = null; frostWaveTexture?.dispose(); frostWaveTexture = null; fireWaveTexture?.dispose(); fireWaveTexture = null; mysticParticles = null; renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); renderer = null; scene = null
})
</script>

<template>
  <div ref="host" class="tower-defense-scene" role="application" aria-label="Bản đồ phòng thủ 3D">
    <p v-if="renderError" class="tower-defense-scene__error">{{ renderError }}</p>
  </div>
</template>

<style scoped>
.tower-defense-scene { position: absolute; z-index: 1; inset: 0; overflow: hidden; border-radius: 10px; background: linear-gradient(#b8d494 0 45%, #80965f 45% 100%); }
.tower-defense-scene :deep(canvas) { display: block; width: 100%; height: 100%; }
.tower-defense-scene__error { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding: 24px; background: #172017; color: #f3d899; text-align: center; }
</style>
