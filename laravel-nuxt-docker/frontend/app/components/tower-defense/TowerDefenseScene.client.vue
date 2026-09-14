<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DEFENSE_PATH } from '~/composables/useTowerDefense'
import type { Enemy, Impact, Projectile, Tower } from '~/types/games/towerDefense'

const props = defineProps<{ towers: Tower[]; enemies: Enemy[]; projectiles: Projectile[]; impacts: Impact[]; selectedTowerId: number | null }>()
const emit = defineEmits<{ cellSelect: [x: number, y: number] }>()
const host = ref<HTMLDivElement | null>(null)
const renderError = ref('')

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let controls: OrbitControls | null = null
let animationFrame = 0
let resizeObserver: ResizeObserver | null = null
let surfaceDetail: THREE.DataTexture | null = null
const clock = new THREE.Clock()
const towerModels = new Map<number, THREE.Group>()
const enemyModels = new Map<number, THREE.Group>()
const projectileModels = new Map<number, { group: THREE.Group; bornAt: number }>()
const impactModels = new Map<number, THREE.Group>()
const tileMeshes: THREE.Mesh[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pointerStart = new THREE.Vector2()
const pointerCurrent = new THREE.Vector2()
let pointerTravel = 0
let hoverMarker: THREE.Mesh | null = null

const worldPosition = (x: number, y: number) => new THREE.Vector3(x - 5.5, 0, y - 3.5)
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

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Sprite)) return
    if (child instanceof THREE.Mesh) child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(material => material.dispose())
  })
  object.removeFromParent()
}

function mesh(geometry: THREE.BufferGeometry, color: number, options: { roughness?: number; metalness?: number; emissive?: number } = {}) {
  const roughness = options.roughness ?? .72
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: options.metalness ?? .05, emissive: options.emissive ?? 0, emissiveIntensity: options.emissive ? 1.35 : 1, flatShading: true, bumpMap: roughness > .5 ? surfaceDetail : null, bumpScale: roughness > .5 ? .018 : 0 })
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

function addBattlements(group: THREE.Group, y: number, radius: number, color: number, count = 8) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const block = mesh(new THREE.BoxGeometry(.18, .18, .14), color)
    block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius)
    block.rotation.y = angle
    group.add(block)
  }
}

function addWindow(group: THREE.Group, y: number, z: number, color = 0x263134) {
  const window = mesh(new THREE.BoxGeometry(.12, .22, .025), color, { metalness: .18, roughness: .4 })
  window.position.set(0, y, z)
  group.add(window)
}

function addRockFooting(group: THREE.Group, radius: number, color: number, count = 9) {
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2
    const rock = mesh(new THREE.DodecahedronGeometry(.13 + (index % 3) * .018, 0), color)
    rock.position.set(Math.sin(angle) * radius, .11, Math.cos(angle) * radius)
    rock.scale.set(1.15, .75 + (index % 2) * .16, .92)
    rock.rotation.set(index * .17, angle, index * -.11)
    group.add(rock)
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

function addDoor(group: THREE.Group, y: number, z: number) {
  const door = mesh(new THREE.BoxGeometry(.2, .31, .035), 0x49301f); door.position.set(0, y, z)
  const ring = mesh(new THREE.TorusGeometry(.035, .009, 5, 10), 0xc18b3d, { metalness: .7, roughness: .25 }); ring.position.set(.045, y, z + .025)
  group.add(door, ring)
}

function createArcherTower() {
  const group = new THREE.Group()
  addRockFooting(group, .43, 0x777369, 10)
  const base = mesh(new THREE.CylinderGeometry(.4, .5, .24, 8), 0x57554f); base.position.y = .12
  const body = mesh(new THREE.CylinderGeometry(.3, .38, .86, 10), 0xb9aa8f); body.position.y = .64
  const band = mesh(new THREE.CylinderGeometry(.34, .38, .12, 8), 0x645d50); band.position.y = .48
  const deck = mesh(new THREE.CylinderGeometry(.49, .49, .13, 10), 0x583116); deck.position.y = 1.08
  addWindow(group, .62, .345, 0x304138)
  addDoor(group, .31, .43)
  addBattlements(group, 1.19, .4, 0xd0c4aa, 10)
  const lowerBanner = createBanner(0x315e36, 0xe1b75e); lowerBanner.position.set(0, .65, .385); group.add(lowerBanner)
  const turret = new THREE.Group(); turret.position.y = 1.19
  const roof = mesh(new THREE.ConeGeometry(.43, .32, 8), 0x315c28); roof.position.y = .42
  const roofTrim = mesh(new THREE.CylinderGeometry(.44, .44, .055, 10), 0xb27b31, { metalness: .22, roughness: .48 }); roofTrim.position.y = .27
  const archerBody = mesh(new THREE.CapsuleGeometry(.09, .18, 3, 6), 0x8f3f28); archerBody.position.set(0, .16, .04)
  const archerHead = mesh(new THREE.SphereGeometry(.1, 8, 6), 0xe0b47e); archerHead.position.set(0, .36, .04)
  const bow = mesh(new THREE.TorusGeometry(.23, .025, 5, 14, Math.PI), 0xd39a4c); bow.rotation.z = Math.PI / 2; bow.position.set(0, .22, .24)
  const arrow = mesh(new THREE.CylinderGeometry(.012, .012, .42, 5), 0xe8d6a4); arrow.rotation.x = Math.PI / 2; arrow.position.set(0, .22, .24)
  const quiver = mesh(new THREE.CylinderGeometry(.055, .075, .28, 7), 0x59351f); quiver.position.set(-.14, .19, -.08); quiver.rotation.z = -.22
  for (let index = 0; index < 3; index++) {
    const spareArrow = mesh(new THREE.CylinderGeometry(.009, .009, .3, 4), 0xe7d4a1); spareArrow.position.set(-.17 + index * .03, .36, -.08); spareArrow.rotation.z = -.1 + index * .1; turret.add(spareArrow)
  }
  for (const x of [-.32, .32]) for (const z of [-.25, .25]) {
    const post = mesh(new THREE.BoxGeometry(.08, .23, .08), 0x65401f); post.position.set(x, .12, z); turret.add(post)
  }
  const flagPole = mesh(new THREE.CylinderGeometry(.012, .012, .62, 5), 0x6d4727); flagPole.position.set(0, .68, 0)
  const flag = createBanner(0x315e36, 0xe1b75e); flag.scale.set(.85, .85, .85); flag.position.set(.13, .83, 0); flag.rotation.y = Math.PI / 2
  turret.add(roof, roofTrim, archerBody, archerHead, bow, arrow, quiver, flagPole, flag); group.add(base, body, band, deck, turret); group.userData.turret = turret; group.userData.bow = bow; group.userData.flag = flag
  return group
}

function createCannonTower() {
  const group = new THREE.Group()
  addRockFooting(group, .49, 0x716b62, 11)
  const base = mesh(new THREE.CylinderGeometry(.5, .57, .28, 10), 0x4e4b48); base.position.y = .14
  const wall = mesh(new THREE.CylinderGeometry(.4, .46, .48, 10), 0xa99a84); wall.position.y = .5
  const rim = mesh(new THREE.CylinderGeometry(.46, .46, .11, 10), 0x5d5851); rim.position.y = .76
  addWindow(group, .48, .425, 0x342b25)
  addDoor(group, .29, .47)
  addBattlements(group, .86, .39, 0xbdb09c, 10)
  const banner = createBanner(0xc46422, 0xf0ba50); banner.position.set(0, .48, .445); group.add(banner)
  const turret = new THREE.Group(); turret.position.y = .84
  const cradle = mesh(new THREE.BoxGeometry(.44, .25, .4), 0x69401f); cradle.position.y = .02
  const barrel = mesh(new THREE.CylinderGeometry(.095, .15, .82, 12), 0xa96527, { metalness: .88, roughness: .18 }); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .13, .38)
  const muzzle = mesh(new THREE.CylinderGeometry(.15, .15, .16, 12), 0x4a2916, { metalness: .9, roughness: .16 }); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, .13, .82)
  for (const z of [.16, .43, .69]) {
    const barrelBand = mesh(new THREE.TorusGeometry(.13, .018, 6, 12), 0x37383a, { metalness: .85, roughness: .22 }); barrelBand.rotation.x = Math.PI / 2; barrelBand.position.set(0, .13, z); turret.add(barrelBand)
  }
  for (const x of [-.27, .27]) {
    const wheel = mesh(new THREE.CylinderGeometry(.2, .2, .09, 12), 0x44301f); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, -.04, .03); turret.add(wheel)
    const hub = mesh(new THREE.CylinderGeometry(.07, .07, .105, 10), 0xb77b38, { metalness: .3 }); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); turret.add(hub)
  }
  turret.add(cradle, barrel, muzzle); group.add(base, wall, rim, turret); group.userData.turret = turret; group.userData.barrel = barrel; group.userData.muzzle = muzzle
  return group
}

function createFrostTower() {
  const group = new THREE.Group()
  addRockFooting(group, .46, 0x82969e, 10)
  const base = mesh(new THREE.CylinderGeometry(.44, .52, .3, 8), 0x415d70); base.position.y = .15
  const body = mesh(new THREE.CylinderGeometry(.27, .4, .72, 8), 0x9fbac2); body.position.y = .62
  const collar = mesh(new THREE.CylinderGeometry(.38, .38, .12, 8), 0x2b7991, { metalness: .38 }); collar.position.y = .96
  addWindow(group, .62, .34, 0x28798c)
  addDoor(group, .3, .4)
  addBattlements(group, 1.03, .34, 0xd3e4e6, 8)
  const banner = createBanner(0x225b98, 0xbdefff); banner.position.set(0, .63, .37); group.add(banner)
  const crystal = mesh(new THREE.OctahedronGeometry(.31, 0), 0x6deaff, { emissive: 0x14798c, roughness: .14 }); crystal.position.y = 1.3; crystal.scale.y = 1.35
  const ring = mesh(new THREE.TorusGeometry(.39, .034, 7, 24), 0xa4f5ff, { emissive: 0x238fa2 }); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1
  const shards: THREE.Mesh[] = []
  for (let index = 0; index < 4; index++) {
    const shard = mesh(new THREE.ConeGeometry(.1, .38, 5), 0x5edbee, { emissive: 0x0c6273, roughness: .18 })
    const angle = index * Math.PI / 2; shard.position.set(Math.cos(angle) * .44, 1.24, Math.sin(angle) * .44); shard.rotation.z = Math.cos(angle) * .42; shard.rotation.x = Math.sin(angle) * .42; shard.userData.orbitAngle = angle; shards.push(shard); group.add(shard)
  }
  const glow = new THREE.PointLight(0x72eaff, 2.4, 3.2); glow.position.y = 1.3
  for (let index = 0; index < 6; index++) {
    const rune = mesh(new THREE.OctahedronGeometry(.035, 0), 0xa9f5ff, { emissive: 0x3ec7db, roughness: .15 }); const angle = index / 6 * Math.PI * 2; rune.position.set(Math.cos(angle) * .31, .66, Math.sin(angle) * .31); group.add(rune)
  }
  group.add(base, body, collar, crystal, ring, glow); group.userData.crystal = crystal; group.userData.ring = ring; group.userData.shards = shards
  return group
}

function createTowerModel(tower: Tower) {
  const group = tower.kind === 'archer' ? createArcherTower() : tower.kind === 'cannon' ? createCannonTower() : createFrostTower()
  group.add(groundShadow(.42))
  group.scale.setScalar(.88 + tower.level * .07)
  group.position.copy(worldPosition(tower.x, tower.y)); group.position.y = .05
  group.userData.shotSequence = tower.shotSequence; group.userData.firedAt = 0
  scene!.add(group); return group
}

function limb(color: number, x: number) {
  const pivot = new THREE.Group(); pivot.position.set(x, .48, 0)
  const part = mesh(new THREE.CapsuleGeometry(.07, .28, 3, 6), color); part.position.y = -.18
  pivot.add(part); return pivot
}

function createGoblin() {
  const group = new THREE.Group()
  const body = mesh(new THREE.CapsuleGeometry(.22, .34, 4, 8), 0x6f8838); body.position.y = .64
  const tunic = mesh(new THREE.ConeGeometry(.29, .48, 7), 0x73412b); tunic.position.y = .63
  const scarf = mesh(new THREE.TorusGeometry(.225, .055, 7, 14), 0x9d3028); scarf.rotation.x = Math.PI / 2; scarf.position.y = .88
  const belt = mesh(new THREE.CylinderGeometry(.245, .245, .08, 8), 0x3a251b); belt.position.y = .67
  const buckle = mesh(new THREE.BoxGeometry(.1, .09, .035), 0xd4a443, { metalness: .5 }); buckle.position.set(0, .67, .245)
  const head = mesh(new THREE.SphereGeometry(.27, 12, 9), 0x8fb64c); head.position.y = 1.08; head.scale.set(1, .86, .92)
  const mouth = mesh(new THREE.BoxGeometry(.18, .035, .025), 0x351b18); mouth.position.set(0, .96, .247)
  const nose = mesh(new THREE.ConeGeometry(.075, .23, 7), 0xa8c95b); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.04, .29)
  const leftEar = mesh(new THREE.ConeGeometry(.1, .3, 6), 0x8fb64c); leftEar.rotation.z = Math.PI / 2; leftEar.position.set(-.34, 1.11, 0)
  const rightEar = leftEar.clone(); rightEar.rotation.z = -Math.PI / 2; rightEar.position.x = .31
  const leftLeg = limb(0x65432d, -.12); const rightLeg = limb(0x65432d, .12)
  const leftArm = limb(0x8fb64c, -.29); leftArm.position.y = .78; leftArm.rotation.z = -.5
  const rightArm = limb(0x8fb64c, .29); rightArm.position.y = .78; rightArm.rotation.z = .5
  for (const x of [-.28, .28]) {
    const shoulder = mesh(new THREE.SphereGeometry(.115, 7, 5), 0x65402e, { metalness: .12 }); shoulder.position.set(x, .83, 0); shoulder.scale.y = .65; group.add(shoulder)
  }
  for (const x of [-.12, .12]) {
    const boot = mesh(new THREE.BoxGeometry(.15, .12, .23), 0x3c291e); boot.position.set(x, .16, .06); group.add(boot)
  }
  const weapon = new THREE.Group(); weapon.position.set(.35, .72, .04); weapon.rotation.z = -.42
  const handle = mesh(new THREE.CylinderGeometry(.025, .03, .55, 6), 0x5c3822); handle.position.y = .08
  const blade = mesh(new THREE.BoxGeometry(.18, .28, .055), 0xabb0aa, { metalness: .75, roughness: .25 }); blade.position.set(.04, .35, 0); blade.rotation.z = -.18
  weapon.add(handle, blade)
  const shield = new THREE.Group(); shield.position.set(-.34, .72, .19); shield.rotation.x = Math.PI / 2; shield.rotation.z = -.16
  const shieldFace = mesh(new THREE.CylinderGeometry(.25, .25, .07, 12), 0x604126); shieldFace.rotation.z = Math.PI / 2
  const shieldRim = mesh(new THREE.TorusGeometry(.25, .035, 6, 16), 0x77736c, { metalness: .65, roughness: .3 }); shieldRim.rotation.y = Math.PI / 2
  const shieldBoss = mesh(new THREE.SphereGeometry(.075, 8, 6), 0x85827b, { metalness: .7, roughness: .25 }); shieldBoss.position.x = .055
  shield.add(shieldFace, shieldRim, shieldBoss)
  for (const x of [-.09, .09]) {
    const eye = mesh(new THREE.SphereGeometry(.045, 7, 5), 0xffe7a1, { emissive: 0x3f2e08 }); eye.position.set(x, 1.13, .225); group.add(eye)
    const pupil = mesh(new THREE.SphereGeometry(.019, 6, 4), 0x21180f); pupil.position.set(x, 1.13, .265); group.add(pupil)
    const brow = mesh(new THREE.BoxGeometry(.11, .025, .03), 0x405027); brow.position.set(x, 1.2, .245); brow.rotation.z = x < 0 ? -.22 : .22; group.add(brow)
  }
  for (const x of [-.08, .08]) { const tusk = mesh(new THREE.ConeGeometry(.025, .11, 5), 0xf1dfb2); tusk.position.set(x, .94, .25); group.add(tusk) }
  for (let index = -1; index <= 1; index++) {
    const hair = mesh(new THREE.ConeGeometry(.045, .22 - Math.abs(index) * .035, 5), 0x34251e); hair.position.set(index * .075, 1.31 - Math.abs(index) * .02, -.015); hair.rotation.z = index * -.18; group.add(hair)
  }
  for (let index = 0; index < 5; index++) {
    const rivet = mesh(new THREE.SphereGeometry(.018, 5, 4), 0xb8914b, { metalness: .7, roughness: .28 }); const angle = index / 5 * Math.PI * 2; rivet.position.set(Math.cos(angle) * .18 - .34, .72 + Math.sin(angle) * .18, .24); group.add(rivet)
  }
  const healthBack = mesh(new THREE.PlaneGeometry(.78, .07), 0x401b18); healthBack.position.set(0, 1.48, .05); healthBack.rotation.x = -1
  const health = mesh(new THREE.PlaneGeometry(.74, .045), 0x78cf58, { emissive: 0x183d10 }); health.position.set(0, 1.485, .085); health.rotation.x = -1
  group.add(body, tunic, scarf, belt, buckle, head, mouth, nose, leftEar, rightEar, leftLeg, rightLeg, leftArm, rightArm, weapon, shield, healthBack, health)
  group.add(groundShadow(.32))
  group.userData.leftLeg = leftLeg; group.userData.rightLeg = rightLeg; group.userData.leftArm = leftArm; group.userData.rightArm = rightArm; group.userData.weapon = weapon; group.userData.shield = shield; group.userData.head = head; group.userData.health = health
  group.scale.setScalar(.74); scene!.add(group); return group
}

function createProjectile(projectile: Projectile) {
  const group = new THREE.Group()
  let shot: THREE.Mesh
  if (projectile.kind === 'archer') {
    shot = mesh(new THREE.CylinderGeometry(.025, .025, .42, 6), 0xf2d28a); shot.rotation.x = Math.PI / 2
  } else if (projectile.kind === 'cannon') {
    shot = mesh(new THREE.SphereGeometry(.11, 9, 7), 0x332b25, { metalness: .7 });
    const fire = new THREE.PointLight(0xff7a24, 2, 2); group.add(fire)
  } else {
    shot = mesh(new THREE.OctahedronGeometry(.12), 0x74e8ff, { emissive: 0x2389a0 });
    const glow = new THREE.PointLight(0x55ddff, 2, 2); group.add(glow)
  }
  group.add(shot); scene!.add(group); return { group, bornAt: performance.now() }
}

function createImpact(impact: Impact) {
  const color = impact.kind === 'frost' ? 0x6ee7ff : impact.kind === 'cannon' ? 0xff7a2f : 0xffe2a1
  const group = new THREE.Group(); group.position.copy(worldPosition(impact.position.x, impact.position.y)); group.userData.initialLife = impact.life
  if (impact.kind === 'frost') {
    group.position.y = .15
    const radius = impact.radius ?? 1
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshBasicMaterial({ color: 0x5bdcf4, transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2
    const outerRing = mesh(new THREE.TorusGeometry(radius, .035, 7, 48), 0xa9f7ff, { emissive: 0x49cfe8, roughness: .18 }); outerRing.rotation.x = Math.PI / 2
    const innerRing = mesh(new THREE.TorusGeometry(radius * .68, .018, 6, 40), 0x69e9ff, { emissive: 0x238fa2, roughness: .2 }); innerRing.rotation.x = Math.PI / 2
    group.add(disc, outerRing, innerRing)
    for (let index = 0; index < 12; index++) {
      const angle = index / 12 * Math.PI * 2
      const spike = mesh(new THREE.ConeGeometry(.055, .28, 5), 0x8cefff, { emissive: 0x1e8395, roughness: .18 }); spike.position.set(Math.cos(angle) * radius * .88, .12, Math.sin(angle) * radius * .88); spike.rotation.z = Math.cos(angle) * .32; spike.rotation.x = Math.sin(angle) * -.32; group.add(spike)
    }
  } else {
    group.position.y = .45
    const ring = mesh(new THREE.TorusGeometry(.12, .035, 7, 18), color, { emissive: color }); ring.rotation.x = Math.PI / 2; group.add(ring)
  }
  scene!.add(group); return group
}

function createCastle() {
  const group = new THREE.Group()
  const keep = mesh(new THREE.BoxGeometry(.72, 1.05, .72), 0xb9a88d); keep.position.y = .52
  const gate = mesh(new THREE.BoxGeometry(.28, .43, .04), 0x553620); gate.position.set(0, .23, .38)
  group.add(keep, gate)
  const cornerPositions: Array<[number, number]> = [[-.46, -.42], [.46, -.42], [-.46, .42], [.46, .42]]
  for (const [x, z] of cornerPositions) {
    const tower = mesh(new THREE.CylinderGeometry(.2, .24, .92, 8), 0x9f907a); tower.position.set(x, .46, z)
    const roof = mesh(new THREE.ConeGeometry(.27, .38, 8), 0x7b3d2b); roof.position.set(x, 1.08, z)
    group.add(tower, roof)
  }
  const flagPole = mesh(new THREE.CylinderGeometry(.018, .018, .8, 6), 0x6f4b26); flagPole.position.set(0, 1.4, 0)
  const flag = mesh(new THREE.PlaneGeometry(.42, .22), 0xd8a83e); flag.position.set(.2, 1.65, 0); flag.rotation.y = -.35
  group.add(flagPole, flag); group.position.copy(worldPosition(11, 1)); group.position.y = .08; group.scale.setScalar(.72); scene!.add(group)
}

function syncScene(elapsed: number) {
  if (!scene) return
  const selectedTower = props.towers.find(tower => tower.id === props.selectedTowerId)
  if (hoverMarker) {
    const hovered = hoverMarker.userData.hoveredCell as { x: number; y: number } | undefined
    const markerCell = selectedTower ?? hovered
    hoverMarker.visible = Boolean(markerCell)
    if (markerCell) {
      hoverMarker.position.copy(worldPosition(markerCell.x, markerCell.y))
      hoverMarker.position.y = .125
      const material = hoverMarker.material as THREE.MeshBasicMaterial
      material.color.setHex(selectedTower ? 0xffd36a : 0xf8edba)
      material.opacity = selectedTower ? .42 : .25
    }
  }
  const towerIds = new Set(props.towers.map(item => item.id))
  for (const [id, model] of towerModels) if (!towerIds.has(id)) { disposeObject(model); towerModels.delete(id) }
  for (const tower of props.towers) {
    const model = towerModels.get(tower.id) ?? createTowerModel(tower); towerModels.set(tower.id, model)
    const turret = model.userData.turret as THREE.Group | undefined
    const targetRotation = Math.PI / 2 - THREE.MathUtils.degToRad(tower.aimAngle)
    if (turret) turret.rotation.y += Math.atan2(Math.sin(targetRotation - turret.rotation.y), Math.cos(targetRotation - turret.rotation.y)) * .14
    if (model.userData.shotSequence !== tower.shotSequence) { model.userData.shotSequence = tower.shotSequence; model.userData.firedAt = performance.now() }
    const recoilAge = performance.now() - Number(model.userData.firedAt)
    const recoil = recoilAge < 220 ? Math.sin(recoilAge / 220 * Math.PI) : 0
    model.position.y = .05
    model.scale.setScalar(.88 + tower.level * .07)
    const bow = model.userData.bow as THREE.Mesh | undefined
    if (bow) bow.scale.x = 1 - recoil * .18
    const barrel = model.userData.barrel as THREE.Mesh | undefined
    const muzzle = model.userData.muzzle as THREE.Mesh | undefined
    if (barrel) barrel.position.z = .38 - recoil * .13
    if (muzzle) muzzle.position.z = .82 - recoil * .13
    const flag = model.userData.flag as THREE.Mesh | undefined
    if (flag) flag.rotation.z = Math.sin(elapsed * 2.4 + tower.id) * .08
    if (tower.kind === 'frost') {
      const crystal = model.userData.crystal as THREE.Mesh; crystal.rotation.y = elapsed * 1.4; crystal.position.y = 1.3 + Math.sin(elapsed * 2.5) * .07; crystal.scale.set(1 + recoil * .18, 1.35 + recoil * .2, 1 + recoil * .18)
      const ring = model.userData.ring as THREE.Mesh; ring.rotation.z = elapsed * .8
      const shards = model.userData.shards as THREE.Mesh[]
      shards.forEach((shard, index) => { const angle = Number(shard.userData.orbitAngle) + elapsed * .45; shard.position.set(Math.cos(angle) * .44, 1.22 + Math.sin(elapsed * 2 + index) * .06, Math.sin(angle) * .44); shard.rotation.y += .025 })
    }
  }

  const enemyIds = new Set(props.enemies.map(item => item.id))
  for (const [id, model] of enemyModels) if (!enemyIds.has(id)) { disposeObject(model); enemyModels.delete(id) }
  for (const enemy of props.enemies) {
    const model = enemyModels.get(enemy.id) ?? createGoblin(); enemyModels.set(enemy.id, model)
    const pathIndex = Math.min(Math.floor(enemy.progress), DEFENSE_PATH.length - 2)
    const from = DEFENSE_PATH[pathIndex]!; const to = DEFENSE_PATH[pathIndex + 1]!; const position = worldPosition(from.x + (to.x - from.x) * (enemy.progress - pathIndex), from.y + (to.y - from.y) * (enemy.progress - pathIndex))
    model.position.lerp(position.setY(.08 + Math.abs(Math.sin(elapsed * 7 + enemy.id)) * .04), .48)
    model.rotation.y = Math.atan2(to.x - from.x, to.y - from.y)
    const stride = Math.sin(elapsed * 8 + enemy.id)
    ;(model.userData.leftLeg as THREE.Group).rotation.x = stride * .65
    ;(model.userData.rightLeg as THREE.Group).rotation.x = -stride * .65
    ;(model.userData.leftArm as THREE.Group).rotation.x = -stride * .28
    ;(model.userData.rightArm as THREE.Group).rotation.x = stride * .28
    ;(model.userData.weapon as THREE.Group).rotation.x = stride * .32
    ;(model.userData.shield as THREE.Group).rotation.z = -.16 + stride * .05
    ;(model.userData.head as THREE.Mesh).rotation.x = Math.sin(elapsed * 8 + enemy.id) * .055
    const health = model.userData.health as THREE.Mesh; const healthRatio = Math.max(.02, enemy.hp / enemy.maxHp); health.scale.x = healthRatio; health.position.x = -(1 - healthRatio) * .37
  }

  const projectileIds = new Set(props.projectiles.map(item => item.id))
  for (const [id, item] of projectileModels) if (!projectileIds.has(id)) { disposeObject(item.group); projectileModels.delete(id) }
  for (const projectile of props.projectiles) {
    const item = projectileModels.get(projectile.id) ?? createProjectile(projectile); projectileModels.set(projectile.id, item)
    const ratio = Math.min(1, (performance.now() - item.bornAt) / (projectile.duration * 1000))
    const from = worldPosition(projectile.from.x, projectile.from.y); const to = worldPosition(projectile.to.x, projectile.to.y)
    item.group.position.lerpVectors(from, to, ratio); item.group.position.y = .72 + Math.sin(ratio * Math.PI) * 1.15
    item.group.lookAt(to.x, item.group.position.y, to.z)
  }

  const impactIds = new Set(props.impacts.map(item => item.id))
  for (const [id, model] of impactModels) if (!impactIds.has(id)) { disposeObject(model); impactModels.delete(id) }
  for (const impact of props.impacts) {
    const model = impactModels.get(impact.id) ?? createImpact(impact); impactModels.set(impact.id, model)
    const initialLife = Number(model.userData.initialLife) || .42
    const progress = THREE.MathUtils.clamp(1 - impact.life / initialLife, 0, 1)
    if (impact.kind === 'frost') {
      model.scale.setScalar(.92 + progress * .12); model.rotation.y += .018
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || !child.material.transparent) return
        child.material.opacity = Math.max(0, (1 - progress) * (child.geometry instanceof THREE.CircleGeometry ? .2 : .8))
      })
    } else {
      model.scale.setScalar(1 + progress * 3); model.rotation.z += .12
    }
  }
}

function createWorld() {
  const target = host.value
  if (!target) return
  try {
    surfaceDetail = createSurfaceDetail()
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x273321, 13, 23)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08; target.appendChild(renderer.domElement)
    renderer.setClearColor(0x263b22, 1)
    camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 50); camera.position.set(0, 13.5, 8.5); camera.lookAt(0, 0, 0)
    controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.dampingFactor = .075; controls.enablePan = true; controls.screenSpacePanning = false; controls.minZoom = .72; controls.maxZoom = 1.85; controls.minPolarAngle = .38; controls.maxPolarAngle = 1.32; controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY; controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; controls.update()
    scene.add(new THREE.HemisphereLight(0xffefd2, 0x182518, 1.72))
    const sun = new THREE.DirectionalLight(0xffd58d, 2.85); sun.position.set(-6, 12, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00025; sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6; scene.add(sun)
    const fill = new THREE.DirectionalLight(0x75aee8, .68); fill.position.set(7, 6, -8); scene.add(fill)
    const pathSet = new Set(DEFENSE_PATH.map(point => `${point.x}:${point.y}`))
    for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
      const isPath = pathSet.has(`${x}:${y}`); const tile = mesh(new THREE.BoxGeometry(.98, isPath ? .12 : .18, .98), isPath ? 0x8b7048 : ((x + y) % 3 === 0 ? 0x4e713b : 0x456636), { roughness: 1 }); tile.position.copy(worldPosition(x, y)); tile.position.y = isPath ? -.02 : 0; tile.userData.cell = { x, y }; tileMeshes.push(tile); scene.add(tile)
    }
    hoverMarker = new THREE.Mesh(new THREE.PlaneGeometry(.88, .88), new THREE.MeshBasicMaterial({ color: 0xf8edba, transparent: true, opacity: .25, depthWrite: false, side: THREE.DoubleSide }))
    hoverMarker.rotation.x = -Math.PI / 2; hoverMarker.visible = false; scene.add(hoverMarker)
    createCastle()
    const resize = () => {
      if (!renderer || !camera) return
      const width = Math.max(target.clientWidth, 2)
      const height = Math.max(target.clientHeight, 2)
      const aspect = width / height
      const viewHeight = 9.2
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
    renderer.domElement.addEventListener('pointerdown', (event) => { pointerStart.set(event.clientX, event.clientY); pointerTravel = 0 })
    renderer.domElement.addEventListener('pointermove', (event) => {
      if (event.buttons & 1) { pointerCurrent.set(event.clientX, event.clientY); pointerTravel = Math.max(pointerTravel, pointerStart.distanceTo(pointerCurrent)) }
      const cell = cellAtPointer(event)
      if (hoverMarker) hoverMarker.userData.hoveredCell = cell
      renderer!.domElement.style.cursor = event.buttons & 1 ? 'grabbing' : cell ? 'pointer' : 'grab'
    })
    renderer.domElement.addEventListener('pointerleave', () => { if (hoverMarker) hoverMarker.userData.hoveredCell = undefined })
    renderer.domElement.addEventListener('click', (event) => { if (pointerTravel > 5) return; const cell = cellAtPointer(event); if (cell) emit('cellSelect', cell.x, cell.y) })
    renderer.domElement.addEventListener('contextmenu', event => event.preventDefault())
    renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); renderError.value = 'Kết nối đồ họa 3D đã bị gián đoạn. Hãy tải lại trang.' })
    const animate = () => { animationFrame = requestAnimationFrame(animate); const elapsed = clock.getElapsedTime(); controls?.update(); syncScene(elapsed); renderer!.render(scene!, camera!) }; animate()
  } catch (error) {
    renderError.value = 'Không thể khởi tạo đồ họa 3D. Hãy bật WebGL hoặc tăng tốc phần cứng trong trình duyệt.'
    console.error('[Kingdom Defense] Scene initialization failed:', error)
  }
}

onMounted(async () => {
  await nextTick()
  animationFrame = requestAnimationFrame(createWorld)
})
onBeforeUnmount(() => { cancelAnimationFrame(animationFrame); resizeObserver?.disconnect(); controls?.dispose(); controls = null; tileMeshes.length = 0; scene?.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) { if (child instanceof THREE.Mesh) child.geometry.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; materials.forEach(material => material.dispose()) } }); surfaceDetail?.dispose(); surfaceDetail = null; renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove() })
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
