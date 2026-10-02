<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

useHead({
  title: "Citadel of Cinders — Three.js Scene",
  meta: [
    {
      name: "description",
      content: "Khung cảnh pháo đài gothic trên vực dung nham dựng hoàn toàn bằng Three.js.",
    },
  ],
});

const viewport = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const muted = ref(false);
const autoRotate = ref(true);
const fullscreen = ref(false);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let animationFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let lavaMaterial: THREE.ShaderMaterial | null = null;
const flames: Array<{ mesh: THREE.Mesh; light?: THREE.PointLight; phase: number }> = [];
const embers: THREE.Points[] = [];

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const lavaFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + 7.13;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vWorldPosition.xz * 0.16;
    float flow = fbm(p + vec2(uTime * 0.08, -uTime * 0.12));
    float cracks = fbm(p * 2.8 - vec2(uTime * 0.18, uTime * 0.05));
    float hot = smoothstep(0.5, 0.82, flow + cracks * 0.48);
    vec3 dark = vec3(0.09, 0.006, 0.002);
    vec3 red = vec3(0.65, 0.025, 0.002);
    vec3 gold = vec3(1.0, 0.35, 0.015);
    vec3 color = mix(dark, red, smoothstep(0.25, 0.7, flow));
    color = mix(color, gold, hot);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function setShadow(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSpire(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale: number,
  stone: THREE.Material,
  roof: THREE.Material,
) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.34 * scale, 1.5 * scale, 6), stone);
  shaft.position.y = 0.75 * scale;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.48 * scale, 1.65 * scale, 6), roof);
  cap.position.y = 2.2 * scale;
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.75 * scale, 5), roof);
  finial.position.y = 3.35 * scale;
  group.add(shaft, cap, finial);
  parent.add(setShadow(group));
  return group;
}

function addTorch(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1, withLight = true) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.3 * scale, 0.22 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x241b21, metalness: 0.75, roughness: 0.35 }),
  );
  const fire = new THREE.Mesh(
    new THREE.SphereGeometry(0.22 * scale, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a0a, transparent: true, opacity: 0.94 }),
  );
  fire.scale.set(0.72, 1.75, 0.72);
  fire.position.y = 0.34 * scale;
  group.add(bowl, fire);
  let light: THREE.PointLight | undefined;
  if (withLight) {
    light = new THREE.PointLight(0xff4b0a, 13 * scale, 8 * scale, 1.9);
    light.position.y = 0.55 * scale;
    group.add(light);
  }
  flames.push({ mesh: fire, light, phase: seededRandom(flames.length + 12) * Math.PI * 2 });
  parent.add(group);
  return group;
}

function addBanner(parent: THREE.Object3D, x: number, y: number, z: number, rotationY: number, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 2.9 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0x1a1417, metalness: 0.8, roughness: 0.3 }),
  );
  pole.position.x = -0.7 * scale;
  pole.position.y = 0.05 * scale;
  const clothShape = new THREE.Shape();
  clothShape.moveTo(-0.66 * scale, 1.25 * scale);
  clothShape.lineTo(0.7 * scale, 1.2 * scale);
  clothShape.lineTo(0.57 * scale, -0.9 * scale);
  clothShape.lineTo(0.16 * scale, -0.58 * scale);
  clothShape.lineTo(-0.18 * scale, -1.05 * scale);
  clothShape.lineTo(-0.66 * scale, -0.78 * scale);
  const cloth = new THREE.Mesh(
    new THREE.ShapeGeometry(clothShape),
    new THREE.MeshStandardMaterial({ color: 0x790b18, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  cloth.position.z = 0.04;
  const emblem = new THREE.Mesh(
    new THREE.RingGeometry(0.16 * scale, 0.2 * scale, 8),
    new THREE.MeshBasicMaterial({ color: 0xd99b42, side: THREE.DoubleSide }),
  );
  emblem.position.set(0, 0.35 * scale, 0.055);
  group.add(pole, cloth, emblem);
  parent.add(setShadow(group));
  return group;
}

function addGothicWindow(parent: THREE.Object3D, x: number, y: number, z: number, rotationY = 0, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  const glassMaterial = new THREE.MeshBasicMaterial({ color: 0xff4a0a, side: THREE.DoubleSide });
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(0.72 * scale, 1.5 * scale), glassMaterial);
  lower.position.y = -0.24 * scale;
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.36 * scale, 3, 0, Math.PI), glassMaterial);
  top.position.y = 0.51 * scale;
  top.rotation.z = Math.PI;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x15141b, metalness: 0.45, roughness: 0.65 });
  for (const offset of [-0.39, 0.39]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 1.72 * scale, 0.08), frameMaterial);
    side.position.set(offset * scale, -0.13 * scale, 0.025);
    group.add(side);
  }
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.065 * scale, 1.45 * scale, 0.08), frameMaterial);
  mullion.position.z = 0.03;
  group.add(lower, top, mullion);
  parent.add(group);
  return group;
}

function addBattlements(parent: THREE.Object3D, length: number, x: number, y: number, z: number, alongX: boolean, material: THREE.Material) {
  const count = Math.max(2, Math.floor(length / 0.75));
  for (let index = 0; index <= count; index += 1) {
    const t = index / count - 0.5;
    addBox(
      parent,
      alongX ? [0.34, 0.48, 0.52] : [0.52, 0.48, 0.34],
      alongX ? [x + t * length, y, z] : [x, y, z + t * length],
      material,
    );
  }
}

function addTower(parent: THREE.Object3D, x: number, z: number, height: number, stone: THREE.Material, roof: THREE.Material, radius = 1.15) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, height, 8), stone);
  base.position.y = height / 2;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.18, radius * 1.18, 0.35, 8), stone);
  collar.position.y = height - 0.3;
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.27, 2.8, 8), roof);
  roofMesh.position.y = height + 1.2;
  group.add(base, collar, roofMesh);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    addSpire(group, Math.cos(angle) * radius, height - 0.05, Math.sin(angle) * radius, 0.32, stone, roof);
  }
  parent.add(setShadow(group));
  return group;
}

function addRockCluster(parent: THREE.Object3D, x: number, z: number, scale: number, rock: THREE.Material, seed: number) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const count = 7 + Math.floor(seededRandom(seed) * 6);
  for (let i = 0; i < count; i += 1) {
    const angle = seededRandom(seed + i * 3.1) * Math.PI * 2;
    const spread = seededRandom(seed + i * 4.2) * scale;
    const height = scale * (0.75 + seededRandom(seed + i * 7.7) * 1.8);
    const radius = scale * (0.25 + seededRandom(seed + i * 9.3) * 0.38);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), rock);
    boulder.position.set(Math.cos(angle) * spread, height * 0.25 - 0.3, Math.sin(angle) * spread);
    boulder.scale.y = height / (radius * 2);
    boulder.rotation.set(seededRandom(i + seed) * 0.5, seededRandom(i + seed + 1) * 3, seededRandom(i + seed + 2) * 0.4);
    group.add(boulder);
  }
  parent.add(setShadow(group));
  return group;
}

function addRoad(parent: THREE.Object3D, points: THREE.Vector3[], material: THREE.Material, width = 3.25) {
  const curve = new THREE.CatmullRomCurve3(points);
  const samples = 62;
  for (let i = 0; i < samples; i += 1) {
    const point = curve.getPoint(i / (samples - 1));
    const next = curve.getPoint(Math.min(1, (i + 1) / (samples - 1)));
    const segment = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.24, width), material);
    segment.position.copy(point);
    segment.position.y += 0.02 + (i % 2) * 0.015;
    segment.rotation.y = -Math.atan2(next.z - point.z, next.x - point.x);
    segment.rotation.z = (seededRandom(i) - 0.5) * 0.02;
    segment.receiveShadow = true;
    parent.add(segment);
  }
}

function addGothicArch(
  parent: THREE.Object3D,
  x: number,
  z: number,
  scale: number,
  material: THREE.Material,
  facingBack = false,
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  if (facingBack) group.rotation.y = Math.PI;
  const radius = 1.55 * scale;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22 * scale, 8, 24, Math.PI), material);
  arch.position.y = -2.05 * scale;
  const leftColumn = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale, 5.3 * scale, 0.5 * scale), material);
  leftColumn.position.set(-radius, -4.7 * scale, 0);
  const rightColumn = leftColumn.clone();
  rightColumn.position.x = radius;
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.76 * scale, 0.42 * scale, 0.72 * scale), material);
  leftFoot.position.set(-radius, -7.25 * scale, 0);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = radius;
  group.add(arch, leftColumn, rightColumn, leftFoot, rightFoot);

  for (const side of [-1, 1]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 4.8 * scale, 0.13 * scale), material);
    rib.position.set(side * radius * 0.72, -4.8 * scale, 0.29 * scale);
    group.add(rib);
  }
  parent.add(setShadow(group));
}

function addDeadTree(parent: THREE.Object3D, x: number, y: number, z: number, scale: number) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x160f13, roughness: 1 });
  const tree = new THREE.Group();
  tree.position.set(x, y, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.19 * scale, 2.5 * scale, 6), bark);
  trunk.position.y = 1.2 * scale;
  trunk.rotation.z = 0.12;
  tree.add(trunk);
  for (let i = 0; i < 5; i += 1) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.075 * scale, 1.35 * scale, 5), bark);
    branch.position.set((i - 2) * 0.14 * scale, (1.8 + i * 0.14) * scale, 0);
    branch.rotation.z = (i - 2) * 0.28;
    branch.rotation.x = (i % 2 ? 0.38 : -0.38);
    tree.add(branch);
  }
  parent.add(setShadow(tree));
}

function addCrimsonGrowth(parent: THREE.Object3D, x: number, y: number, z: number, scale: number, seed: number) {
  const material = new THREE.MeshStandardMaterial({ color: 0x760d1b, roughness: 1 });
  for (let i = 0; i < 12; i += 1) {
    const petal = new THREE.Mesh(new THREE.IcosahedronGeometry(scale * (0.07 + seededRandom(seed + i) * 0.11), 0), material);
    const angle = seededRandom(seed + i * 2.7) * Math.PI * 2;
    const spread = seededRandom(seed + i * 5.1) * scale;
    petal.position.set(x + Math.cos(angle) * spread, y + 0.08, z + Math.sin(angle) * spread);
    petal.scale.y = 0.28;
    parent.add(petal);
  }
}

function addBridge(parent: THREE.Object3D, stone: THREE.Material, darkStone: THREE.Material, roof: THREE.Material) {
  const bridge = new THREE.Group();
  bridge.position.set(0, 5, 0);
  addBox(bridge, [17, 0.75, 4.1], [0, 0, 0], stone);
  addBox(bridge, [17.3, 0.28, 4.45], [0, -0.48, 0], darkStone);

  for (const z of [-2.2, 2.2]) {
    addBox(bridge, [17.2, 0.52, 0.28], [0, 0.55, z], stone);
    addBattlements(bridge, 17, 0, 1.04, z, true, stone);
  }

  for (const x of [-6.8, -2.3, 2.3, 6.8]) {
    for (const z of [-1.95, 1.95]) {
      addSpire(bridge, x, 0.62, z, 0.58, stone, roof);
    }
    const pier = addBox(bridge, [1.15, 8.6, 4.5], [x, -4.45, 0], darkStone);
    pier.geometry.translate(0, 0, 0);
    for (const side of [-1, 1]) {
      const recess = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.58, 2.7, 5, 12),
        new THREE.MeshStandardMaterial({ color: 0x100d12, roughness: 1 }),
      );
      recess.position.set(x, -4.2, side * 2.265);
      recess.rotation.z = Math.PI;
      bridge.add(recess);
    }
  }

  for (const x of [-4.55, 0, 4.55]) {
    addGothicArch(bridge, x, -2.28, 1, stone);
    addGothicArch(bridge, x, 2.28, 1, stone, true);
  }

  for (const x of [-5.8, -3.5, -1.15, 1.15, 3.5, 5.8]) {
    addBanner(bridge, x, -0.95, -2.32, 0, 0.48);
  }

  for (const x of [-5.6, -1.8, 1.8, 5.6]) {
    addTorch(bridge, x, 1.28, -1.82, 0.72, x === -1.8 || x === 1.8);
  }
  parent.add(bridge);
  return bridge;
}

function addStatue(parent: THREE.Object3D, x: number, y: number, z: number, rotationY: number, material: THREE.Material, scale = 1) {
  const statue = new THREE.Group();
  statue.position.set(x, y, z);
  statue.rotation.y = rotationY;
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.82 * scale, 0.7 * scale, 0.82 * scale), material);
  pedestal.position.y = 0.35 * scale;
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42 * scale, 1.65 * scale, 8), material);
  robe.position.y = 1.45 * scale;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25 * scale, 0.55 * scale, 4, 8), material);
  torso.position.y = 2.35 * scale;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23 * scale, 10, 8), material);
  head.position.y = 3.04 * scale;
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.34 * scale, 0.62 * scale, 8), material);
  hood.position.y = 3.16 * scale;
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 2.4 * scale, 0.08 * scale), material);
  sword.position.set(0.42 * scale, 1.98 * scale, 0.04);
  sword.rotation.z = -0.12;
  statue.add(pedestal, robe, torso, head, hood, sword);
  parent.add(setShadow(statue));
  return statue;
}

function addCircularRune(parent: THREE.Object3D, x: number, y: number, z: number, scale: number) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.x = -Math.PI / 2;
  const runeMaterial = new THREE.MeshStandardMaterial({ color: 0xa49b8e, roughness: 0.8, metalness: 0.25 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(scale * 0.72, scale * 0.88, 12), runeMaterial);
  group.add(ring);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.08, scale * 0.75, 0.04), runeMaterial);
    spoke.position.y = scale * 0.35;
    spoke.rotation.z = (i / 8) * Math.PI * 2;
    group.add(spoke);
  }
  const center = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.16, scale * 0.16, 0.06, 10), runeMaterial);
  center.rotation.x = Math.PI / 2;
  group.add(center);
  parent.add(group);
}

function buildFortress(root: THREE.Group, stone: THREE.Material, darkStone: THREE.Material, roof: THREE.Material, rock: THREE.Material) {
  const fortress = new THREE.Group();
  fortress.position.set(11.5, 5, -3.8);
  addBox(fortress, [15, 0.9, 12], [0, -0.15, 0], stone);
  addBox(fortress, [15.6, 1.3, 12.6], [0, -0.85, 0], darkStone);
  for (const z of [-5.82, 5.82]) {
    addBox(fortress, [14.8, 0.5, 0.28], [0, 0.58, z], stone);
    addBattlements(fortress, 14.6, 0, 1.04, z, true, stone);
  }
  for (const x of [-7.32, 7.32]) {
    addBox(fortress, [0.28, 0.5, 11.4], [x, 0.58, 0], stone);
    addBattlements(fortress, 11.3, x, 1.04, 0, false, stone);
  }
  addRockCluster(fortress, 5.8, 4.7, 2.4, rock, 101);
  addRockCluster(fortress, -5.9, -4.7, 2.1, rock, 125);

  addBox(fortress, [12.8, 4.7, 1.15], [0, 2.3, -4.85], darkStone);
  addBattlements(fortress, 12.8, 0, 4.85, -4.85, true, stone);
  for (const x of [-5.4, 5.4]) addTower(fortress, x, -4.7, 7.2, stone, roof, 1.38);
  for (const x of [-7, 7]) addTower(fortress, x, 4.9, 5.1, stone, roof, 1.08);

  const keep = new THREE.Group();
  keep.position.set(0, 0, -3.85);
  addBox(keep, [8.5, 6.4, 2.3], [0, 3.2, 0], darkStone);
  addBattlements(keep, 8.6, 0, 6.65, 1.22, true, stone);
  for (const x of [-3.9, 3.9]) addSpire(keep, x, 6.1, 0.95, 0.9, stone, roof);
  addGothicWindow(keep, 0, 3.75, 1.18, 0, 1.85);
  addGothicWindow(keep, -2.35, 3.55, 1.18, 0, 1.05);
  addGothicWindow(keep, 2.35, 3.55, 1.18, 0, 1.05);
  fortress.add(keep);

  const gate = new THREE.Group();
  // Cổng chính nằm trên mặt tiền đại điện phía sau, hướng xuống sân trong.
  gate.position.set(0, 0.05, -2.62);
  addBox(gate, [5.8, 4.5, 1.5], [0, 2.25, 0], darkStone);
  const portal = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.2, 1.8, 7, 16),
    new THREE.MeshBasicMaterial({ color: 0xff4a06 }),
  );
  portal.scale.y = 1.16;
  portal.position.set(0, 2.25, 0.77);
  gate.add(portal);
  for (let step = 0; step < 6; step += 1) {
    addBox(gate, [4.25 + step * 0.22, 0.18, 0.58], [0, 0.86 - step * 0.15, 1.15 + step * 0.48], stone);
  }
  for (const x of [-2.5, 2.5]) addSpire(gate, x, 4.2, 0.55, 0.68, stone, roof);
  fortress.add(gate);

  for (const x of [-5.9, -3.2, 3.2, 5.9]) addBanner(fortress, x, 3.7, -4.22, 0, 0.9);
  addBanner(fortress, -3.6, 2.2, 5.51, Math.PI, 0.75);
  addBanner(fortress, 3.6, 2.2, 5.51, Math.PI, 0.75);
  addCircularRune(fortress, -3.4, 0.47, 0.55, 1.3);
  addCircularRune(fortress, 3.6, 0.47, 2.1, 1.25);
  addStatue(fortress, -3.6, 0.45, 3.75, 0.1, stone, 0.8);
  addStatue(fortress, 3.6, 0.45, 3.75, -0.1, stone, 0.8);
  addStatue(fortress, -5.9, 0.45, 1.1, Math.PI * 0.15, stone, 0.65);
  addStatue(fortress, 5.9, 0.45, 1.1, -Math.PI * 0.15, stone, 0.65);
  for (const x of [-5.5, -2.7, 2.7, 5.5]) addTorch(fortress, x, 0.9, 4.9, 0.74, true);
  for (const [x, z, scale, seed] of [[-5, 2.2, 1.5, 330], [5.2, -1.3, 1.35, 350], [-2.1, -1, 1.2, 370]] as Array<[number, number, number, number]>) {
    addCrimsonGrowth(fortress, x, 0.45, z, scale, seed);
  }
  root.add(fortress);
}

function createEmbers(root: THREE.Group) {
  for (let cloudIndex = 0; cloudIndex < 3; cloudIndex += 1) {
    const count = 100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (seededRandom(i + cloudIndex * 91) - 0.5) * 42;
      positions[i * 3 + 1] = seededRandom(i + cloudIndex * 103) * 13 - 1;
      positions[i * 3 + 2] = (seededRandom(i + cloudIndex * 117) - 0.5) * 34;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: cloudIndex === 0 ? 0xff7a18 : 0xc82b0a, size: 0.075, transparent: true, opacity: 0.75 }),
    );
    points.userData.speed = 0.12 + cloudIndex * 0.06;
    root.add(points);
    embers.push(points);
  }
}

function buildScene() {
  const host = viewport.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070609);
  scene.fog = new THREE.FogExp2(0x10090e, 0.018);

  camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 130);
  camera.position.set(31, 31, 38);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  host.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  controls.minDistance = 18;
  controls.maxDistance = 64;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.19;

  const root = new THREE.Group();
  root.rotation.y = -0.18;
  scene.add(root);

  const stone = new THREE.MeshStandardMaterial({ color: 0x403b43, roughness: 0.86, metalness: 0.08 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x242029, roughness: 0.92, metalness: 0.05 });
  const pathStone = new THREE.MeshStandardMaterial({ color: 0x6b5a50, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x11121a, roughness: 0.72, metalness: 0.24 });
  const rock = new THREE.MeshStandardMaterial({ color: 0x1c191f, roughness: 1 });

  lavaMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: lavaFragmentShader,
    uniforms: { uTime: { value: 0 } },
  });
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(90, 70, 1, 1), lavaMaterial);
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = -4.7;
  root.add(lava);

  const underGlow = new THREE.PointLight(0xff2600, 16, 58, 1.5);
  underGlow.position.set(0, -3.5, 0);
  root.add(underGlow);

  addBridge(root, stone, darkStone, roof);
  buildFortress(root, stone, darkStone, roof, rock);

  const leftIsland = new THREE.Group();
  leftIsland.position.set(-13.5, 4.75, 3.6);
  addRockCluster(leftIsland, 0, 0, 4.8, rock, 20);
  addRockCluster(leftIsland, -4.7, 2.2, 3.1, rock, 31);
  addBox(leftIsland, [11.5, 0.72, 10.5], [-0.4, 0, 0], darkStone);
  addRoad(leftIsland, [
    new THREE.Vector3(-5.4, 0.5, 4.0),
    new THREE.Vector3(-2.8, 0.5, 3.25),
    new THREE.Vector3(-1.4, 0.5, 1.1),
    new THREE.Vector3(-2.1, 0.5, -1.55),
    new THREE.Vector3(0.8, 0.5, -2.35),
    new THREE.Vector3(5.2, 0.5, -1.35),
  ], pathStone, 3.4);
  addCircularRune(leftIsland, -2.25, 0.64, 1.3, 1.35);
  addCircularRune(leftIsland, -1.2, 0.64, -2.0, 1.12);
  addCircularRune(leftIsland, 2.55, 0.64, -1.65, 1.08);
  addTower(leftIsland, -3.7, -2.9, 4.4, stone, roof, 0.85);
  addTower(leftIsland, -4, 3.2, 3.6, stone, roof, 0.72);
  addTower(leftIsland, 2.9, 2.8, 3.7, stone, roof, 0.72);
  addBanner(leftIsland, -3.2, 1.6, -2.25, 0.15, 0.64);
  addStatue(leftIsland, 2.55, 0.55, -2.6, -0.3, stone, 0.67);
  for (const point of [[-4.2, 1.0, 1.0], [0, 1.0, -2.1], [4, 1.0, -1.6]] as const) addTorch(leftIsland, ...point, 0.68, true);
  addDeadTree(leftIsland, -5, 0.5, 1.9, 1.05);
  addDeadTree(leftIsland, -1.3, 0.5, 4.15, 0.85);
  addCrimsonGrowth(leftIsland, -4.3, 0.55, -0.6, 1.6, 410);
  addCrimsonGrowth(leftIsland, 1.5, 0.55, 2.85, 1.4, 430);
  addCrimsonGrowth(leftIsland, 3.5, 0.55, -3.2, 1.3, 450);
  root.add(leftIsland);

  const gateIsland = new THREE.Group();
  gateIsland.position.set(-21.5, 4.65, -2.4);
  addRockCluster(gateIsland, 0, 0, 3.4, rock, 61);
  addBox(gateIsland, [5.5, 0.75, 5.3], [0, 0, 0], darkStone);
  addBox(gateIsland, [4.1, 4.8, 0.8], [0, 2.4, -1.6], stone);
  const gateOpening = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 1.35, 6, 12), new THREE.MeshBasicMaterial({ color: 0x16090b }));
  gateOpening.position.set(0, 2, -2.02);
  gateIsland.add(gateOpening);
  for (const x of [-1.65, 1.65]) addSpire(gateIsland, x, 4.25, -1.55, 0.7, stone, roof);
  addBanner(gateIsland, 0, 3.05, -2.04, Math.PI, 0.72);
  addTorch(gateIsland, -1.4, 0.8, 1.65, 0.8, true);
  addTorch(gateIsland, 1.4, 0.8, 1.65, 0.8, true);
  addDeadTree(gateIsland, -2.1, 0.45, 1.4, 0.9);
  addCrimsonGrowth(gateIsland, 1.6, 0.5, 0.8, 1.15, 470);
  root.add(gateIsland);

  for (const [x, z, scale, seed] of [
    [-20, 10, 2.5, 201], [-11, 11, 2.2, 221], [21, 6, 3.4, 238], [19, -12, 3.1, 250], [8, 11, 2.1, 266], [-3, -10, 2.2, 279],
  ] as Array<[number, number, number, number]>) addRockCluster(root, x, z, scale, rock, seed);

  scene.add(new THREE.HemisphereLight(0x443955, 0x170605, 1.55));
  const keyLight = new THREE.DirectionalLight(0x8a8cae, 2.8);
  keyLight.position.set(-13, 25, 16);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -35;
  keyLight.shadow.camera.right = 35;
  keyLight.shadow.camera.top = 30;
  keyLight.shadow.camera.bottom = -30;
  scene.add(keyLight);
  const fortressGlow = new THREE.PointLight(0xff6a18, 38, 24, 1.7);
  fortressGlow.position.set(11, 10, -5);
  scene.add(fortressGlow);

  createEmbers(root);

  const clock = new THREE.Clock();
  const animate = () => {
    animationFrame = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    if (lavaMaterial) lavaMaterial.uniforms.uTime!.value = elapsed;
    flames.forEach((flame) => {
      const pulse = 0.86 + Math.sin(elapsed * 8.5 + flame.phase) * 0.11 + Math.sin(elapsed * 15 + flame.phase) * 0.05;
      flame.mesh.scale.set(0.72 * pulse, 1.75 * (1.08 - pulse * 0.08), 0.72 * pulse);
      if (flame.light) flame.light.intensity = 10 + pulse * 5;
    });
    embers.forEach((cloud) => {
      cloud.rotation.y = elapsed * cloud.userData.speed;
      cloud.position.y = Math.sin(elapsed * cloud.userData.speed * 3) * 0.3;
    });
    if (controls) {
      controls.autoRotate = autoRotate.value;
      controls.update();
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
  };
  animate();

  resizeObserver = new ResizeObserver(() => {
    if (!host || !renderer || !camera) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  });
  resizeObserver.observe(host);
  loading.value = false;
}

function resetCamera() {
  if (!camera || !controls) return;
  camera.position.set(31, 31, 38);
  controls.target.set(0, 3.1, 0);
  controls.update();
}

async function toggleFullscreen() {
  if (!viewport.value) return;
  if (!document.fullscreenElement) await viewport.value.requestFullscreen();
  else await document.exitFullscreen();
}

function onFullscreenChange() {
  fullscreen.value = Boolean(document.fullscreenElement);
}

onMounted(() => {
  buildScene();
  document.addEventListener("fullscreenchange", onFullscreenChange);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  controls?.dispose();
  if (scene) {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
  renderer?.dispose();
  renderer?.domElement.remove();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  flames.length = 0;
  embers.length = 0;
});
</script>

<template>
  <main class="citadel-page">
    <div ref="viewport" class="scene-viewport">
      <div class="vignette" aria-hidden="true" />
      <div class="grain" aria-hidden="true" />

      <div class="controls-hint">
        <span><b>DRAG</b> Rotate</span>
        <i />
        <span><b>SCROLL</b> Zoom</span>
        <i />
        <span><b>RIGHT DRAG</b> Pan</span>
      </div>

      <nav class="scene-actions" aria-label="Điều khiển khung cảnh">
        <button type="button" :class="{ active: autoRotate }" title="Tự động xoay" @click="autoRotate = !autoRotate">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-5V2m4.1 5A8 8 0 1 0 20 16" /></svg>
        </button>
        <button type="button" title="Đặt lại camera" @click="resetCamera">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" /></svg>
        </button>
        <button type="button" :class="{ active: !muted }" title="Âm thanh trang trí" @click="muted = !muted">
          <svg v-if="!muted" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Zm5 5 5 5m0-5-5 5" /></svg>
        </button>
        <button type="button" title="Toàn màn hình" @click="toggleFullscreen">
          <svg v-if="!fullscreen" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3m13-5v5h5M8 21v-5H3m13 5v-5h5" /></svg>
        </button>
      </nav>

      <transition name="fade">
        <div v-if="loading" class="loading-screen">
          <div class="sigil"><span /></div>
          <p>Forging the citadel</p>
        </div>
      </transition>
    </div>
  </main>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #070609; }

.citadel-page {
  min-height: 100svh;
  padding: 18px;
  color: #eee9df;
  background:
    radial-gradient(circle at 50% 120%, rgba(133, 22, 3, .34), transparent 42%),
    #070609;
  font-family: Inter, sans-serif;
}

.scene-viewport {
  position: relative;
  width: 100%;
  height: calc(100svh - 36px);
  min-height: 560px;
  overflow: hidden;
  border: 1px solid rgba(206, 146, 93, .19);
  border-radius: 3px;
  background: #09070b;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .62), inset 0 0 80px rgba(0, 0, 0, .4);
}

.scene-viewport::before,
.scene-viewport::after {
  position: absolute;
  z-index: 5;
  width: 72px;
  height: 72px;
  content: "";
  pointer-events: none;
  border-color: rgba(206, 146, 93, .58);
}

.scene-viewport::before { top: 17px; left: 17px; border-top: 1px solid; border-left: 1px solid; }
.scene-viewport::after { right: 17px; bottom: 17px; border-right: 1px solid; border-bottom: 1px solid; }

.scene-viewport :deep(canvas) { display: block; width: 100%; height: 100%; cursor: grab; }
.scene-viewport :deep(canvas:active) { cursor: grabbing; }

.vignette,
.grain { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.vignette { box-shadow: inset 0 0 150px 42px rgba(0, 0, 0, .68); }
.grain {
  opacity: .06;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

.title-card {
  position: absolute;
  z-index: 4;
  top: clamp(44px, 7vh, 94px);
  left: clamp(38px, 6vw, 104px);
  width: min(370px, 42vw);
  pointer-events: none;
  text-shadow: 0 3px 18px #000;
}

.eyebrow { margin: 0 0 17px; color: #d49b61; font-size: 10px; font-weight: 600; letter-spacing: .32em; }
h1 { margin: 0; font-family: Cinzel, serif; font-size: clamp(43px, 6vw, 84px); font-weight: 600; line-height: .83; letter-spacing: -.045em; text-transform: uppercase; }
h1 span { color: #bb5d35; font-size: .57em; letter-spacing: .045em; }
.subtitle { width: 290px; max-width: 100%; margin: 23px 0 0; color: rgba(235, 225, 211, .58); font-family: Cinzel, serif; font-size: 11px; line-height: 1.75; letter-spacing: .08em; }

.scene-info {
  position: absolute;
  z-index: 4;
  top: 42px;
  right: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 13px;
  border: 1px solid rgba(200, 150, 104, .16);
  background: rgba(8, 7, 10, .54);
  backdrop-filter: blur(12px);
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff5a19; box-shadow: 0 0 13px #ff3d00; animation: pulse 2s infinite; }
.scene-info strong, .scene-info small { display: block; }
.scene-info strong { color: #d9a16e; font-family: Cinzel, serif; font-size: 9px; letter-spacing: .19em; }
.scene-info small { margin-top: 4px; color: rgba(255,255,255,.39); font-size: 8px; letter-spacing: .08em; }

.scene-actions {
  position: absolute;
  z-index: 5;
  right: 36px;
  bottom: 34px;
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(218, 157, 102, .18);
  background: rgba(9, 7, 10, .72);
  backdrop-filter: blur(12px);
}
.scene-actions button { display: grid; width: 42px; height: 42px; padding: 12px; color: rgba(238, 225, 210, .48); cursor: pointer; border: 0; border-right: 1px solid rgba(218, 157, 102, .13); background: transparent; transition: .2s ease; }
.scene-actions button:last-child { border-right: 0; }
.scene-actions button:hover, .scene-actions button.active { color: #efb06f; background: rgba(181, 72, 27, .13); }
.scene-actions svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }

.controls-hint {
  position: absolute;
  z-index: 4;
  bottom: 45px;
  left: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,.36);
  font-size: 8px;
  letter-spacing: .12em;
  pointer-events: none;
}
.controls-hint b { color: rgba(224, 170, 118, .68); font-weight: 600; }
.controls-hint i { width: 1px; height: 11px; background: rgba(255,255,255,.16); }

.loading-screen { position: absolute; inset: 0; z-index: 10; display: grid; place-content: center; justify-items: center; background: #080609; }
.loading-screen p { margin-top: 24px; color: #b77b4c; font-family: Cinzel, serif; font-size: 10px; letter-spacing: .3em; text-transform: uppercase; }
.sigil { display: grid; width: 55px; height: 55px; place-items: center; border: 1px solid #6b2b19; transform: rotate(45deg); animation: spin 2.2s linear infinite; }
.sigil span { width: 23px; height: 23px; border: 1px solid #e36c2e; }
.fade-leave-active { transition: opacity .7s ease; }
.fade-leave-to { opacity: 0; }

@keyframes spin { to { transform: rotate(405deg); } }
@keyframes pulse { 50% { opacity: .48; transform: scale(.75); } }

@media (max-width: 720px) {
  .citadel-page { padding: 0; }
  .scene-viewport { height: 100svh; min-height: 500px; border: 0; }
  .title-card { top: 52px; left: 28px; width: 76vw; }
  .eyebrow { font-size: 8px; }
  h1 { font-size: clamp(38px, 14vw, 62px); }
  .subtitle { display: none; }
  .scene-info { top: auto; right: auto; bottom: 78px; left: 24px; }
  .controls-hint { display: none; }
  .scene-actions { right: 24px; bottom: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot, .sigil { animation: none; }
}
</style>
