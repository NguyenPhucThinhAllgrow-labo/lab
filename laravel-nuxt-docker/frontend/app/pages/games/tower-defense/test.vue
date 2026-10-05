<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
const autoRotate = ref(false);
const fullscreen = ref(false);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let animationFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let lavaMaterial: THREE.ShaderMaterial | null = null;
const lavaFlowMaterials: THREE.ShaderMaterial[] = [];
const flames: Array<{ mesh: THREE.Mesh; light?: THREE.PointLight; phase: number }> = [];
const embers: THREE.Points[] = [];
const surfaceTextures: THREE.Texture[] = [];
// Preserve the gameplay camera's configured direction
// ([7.41, 16.25, 7.28] looking at [1.69, 0, 0]) while scaling its distance
// to frame this much larger hand-built scene.
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(17, 5.3, 0);
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(41.02, 73.55, 30.58);
const DEFAULT_CAMERA_ZOOM = 0.71;

// Move the complete citadel four bridge bays farther back while keeping the
// opposite shore fixed. Extending by exact 4.5-unit bays also keeps every
// pier and arch evenly spaced.
const BRIDGE_CASTLE_EDGE_X = 32;
const BRIDGE_LENGTH = 72;
const BRIDGE_WIDTH = 5;
const BRIDGE_CENTER_X = BRIDGE_CASTLE_EDGE_X - BRIDGE_LENGTH / 2;
const BRIDGE_OPPOSITE_EDGE_X = BRIDGE_CASTLE_EDGE_X - BRIDGE_LENGTH;
const OPPOSITE_LANDMASS_ORIGIN_X = -43;

function getAdaptivePixelRatio(width: number, height: number) {
  // Keep the internal buffer near 1.1 MP. Small/medium screens stay crisp,
  // while large and high-DPI displays scale down instead of multiplying GPU
  // work purely because the browser window contains more pixels.
  const maxRenderPixels = 1_100_000;
  const pixelBudgetRatio = Math.sqrt(maxRenderPixels / Math.max(1, width * height));
  return Math.min(window.devicePixelRatio, 1, pixelBudgetRatio);
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vSurfaceLift;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float broadSwell = sin(position.x * 0.052 + uTime * 0.07)
      * sin(position.y * 0.061 - uTime * 0.055);
    float crossingSwell = sin((position.x - position.y) * 0.033 + uTime * 0.042);
    vSurfaceLift = broadSwell * 0.065 + crossingSwell * 0.035;
    displaced.z += vSurfaceLift;
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const lavaFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vSurfaceLift;

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

  void main() {
    vec2 world = vWorldPosition.xz;
    vec2 drift = vec2(uTime * 0.007, -uTime * 0.01);
    vec2 broadCoordinates = world * vec2(0.035, 0.041);
    // The two broad warp samples do not need a full multi-octave fbm. Keeping
    // them as value noise preserves the slow organic drift while substantially
    // reducing fragment work on the full-screen lava surface.
    vec2 warp = vec2(
      noise(broadCoordinates + drift),
      noise(broadCoordinates + vec2(8.7, 13.1) - drift * 0.65)
    ) - 0.5;
    vec2 flowCoordinates = world * vec2(0.09, 0.105) + warp * 2.1 + drift;

    // Hai thang nhiễu tạo các mảng vỏ nguội không đều. Ngưỡng cao giữ phần
    // dung nham nóng thành khe hẹp, đứt đoạn thay vì các dải neon lớn.
    float broadShape = noise(flowCoordinates);
    float fineShape = noise(flowCoordinates * 3.7 + warp * 1.4 - drift * 1.8);
    float microShape = noise(flowCoordinates * 8.3 - drift * 3.1);
    float ridge = 1.0 - abs(broadShape * 2.0 - 1.0);
    float fissure = smoothstep(
      0.89,
      0.975,
      ridge + (fineShape - 0.5) * 0.1
    );
    float brokenFlow = smoothstep(0.24, 0.68, fineShape + microShape * 0.2);
    fissure *= mix(0.22, 1.0, brokenFlow);
    float hotCore = smoothstep(0.62, 0.96, fissure)
      * smoothstep(0.5, 0.88, microShape);

    vec3 coldBasalt = vec3(0.009, 0.008, 0.01);
    vec3 warmBasalt = vec3(0.055, 0.017, 0.012);
    vec3 ashBasalt = vec3(0.085, 0.074, 0.077);
    vec3 deepMagma = vec3(0.32, 0.012, 0.002);
    vec3 moltenOrange = vec3(0.82, 0.075, 0.004);
    vec3 hotAmber = vec3(1.0, 0.29, 0.018);

    float crustVariation = mix(broadShape, fineShape, 0.36);
    vec3 crustColor = mix(coldBasalt, warmBasalt, crustVariation * 0.58);
    crustColor = mix(crustColor, ashBasalt, smoothstep(0.72, 0.94, fineShape) * 0.22);
    vec3 magmaColor = mix(deepMagma, moltenOrange, fissure * 0.82);
    magmaColor = mix(magmaColor, hotAmber, hotCore * 0.72);
    float cooledFilm = smoothstep(0.7, 0.94, microShape) * fissure * 0.26;
    vec3 color = mix(crustColor, magmaColor, fissure);
    color = mix(color, warmBasalt, cooledFilm);

    // Small, broad highlights belong to the solid skin only. Molten seams stay
    // emissive and matte instead of looking like glossy neon paint.
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 surfaceNormal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    surfaceNormal.y = abs(surfaceNormal.y);
    vec3 lightDirection = normalize(vec3(-0.35, 0.82, 0.44));
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float specular = pow(max(dot(surfaceNormal, halfDirection), 0.0), 28.0);
    float fresnel = pow(1.0 - max(dot(surfaceNormal, viewDirection), 0.0), 4.0);
    color += vec3(0.16, 0.19, 0.21) * (specular * 0.16 + fresnel * 0.045)
      * (1.0 - fissure) * (0.82 + vSurfaceLift);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const lavaFlowVertexShader = /* glsl */ `
  varying vec2 vFlowPosition;
  void main() {
    vFlowPosition = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lavaFlowFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vFlowPosition;

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

  void main() {
    float fall = -vFlowPosition.y;
    vec2 flowUv = vec2(vFlowPosition.x * 1.7, fall * 0.82 - uTime * 1.35 + uPhase);
    float broadFlow = noise(flowUv);
    float fineFlow = noise(flowUv * vec2(2.7, 1.8) + vec2(7.3, -uTime * 0.65));
    float hotCore = smoothstep(0.42, 0.86, broadFlow * 0.72 + fineFlow * 0.5);
    vec3 crust = vec3(0.26, 0.015, 0.002);
    vec3 molten = vec3(1.0, 0.16, 0.005);
    vec3 hot = vec3(1.0, 0.78, 0.08);
    vec3 color = mix(crust, molten, smoothstep(0.15, 0.72, broadFlow));
    color = mix(color, hot, hotCore);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const lavaImpactVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lavaImpactFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;

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

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float time = uTime * 0.42 + uPhase;

    // Break the circular silhouette so the pool merges into the lake instead
    // of reading as a flat, perfectly cut decal.
    float edgeNoise = noise(vec2(angle * 1.7 + uPhase, time * 0.24));
    float edge = 0.9 + (edgeNoise - 0.5) * 0.2;
    float poolMask = 1.0 - smoothstep(edge - 0.16, edge + 0.04, radius);

    float moltenNoise = noise(p * 3.3 + vec2(time * 0.35, -time * 0.22));
    float core = (1.0 - smoothstep(0.08, 0.72, radius)) * (0.7 + moltenNoise * 0.3);

    // Two soft shock fronts travel through the shallow molten pool. Their
    // irregularity keeps the contact from looking like a neon ring.
    float ripplePhase = fract(time * 0.34);
    float rippleRadius = mix(0.16, 0.92, ripplePhase);
    float ripple = 1.0 - smoothstep(0.025, 0.105, abs(radius - rippleRadius));
    ripple *= 1.0 - ripplePhase;
    ripple *= 0.45 + noise(vec2(angle * 3.1, uPhase)) * 0.55;

    float secondPhase = fract(ripplePhase + 0.5);
    float secondRadius = mix(0.18, 0.9, secondPhase);
    float secondRipple = 1.0 - smoothstep(0.025, 0.09, abs(radius - secondRadius));
    secondRipple *= (1.0 - secondPhase) * 0.55;

    vec3 cooled = vec3(0.18, 0.008, 0.001);
    vec3 molten = vec3(1.0, 0.12, 0.002);
    vec3 whiteHot = vec3(1.0, 0.72, 0.06);
    vec3 color = mix(cooled, molten, smoothstep(0.18, 0.7, moltenNoise + core));
    color = mix(color, whiteHot, clamp(core * 0.72 + ripple + secondRipple, 0.0, 1.0));

    float crustFade = 1.0 - smoothstep(0.62, 1.0, radius);
    float alpha = poolMask * (0.28 + core * 0.58 + (ripple + secondRipple) * 0.35);
    alpha *= mix(0.72, 1.0, crustFade);
    gl_FragColor = vec4(color, alpha);
  }
`;

const bridgeLavaContactVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vPhase;

  void main() {
    vUv = uv;
    vec4 contactPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      contactPosition = instanceMatrix * contactPosition;
    #endif
    vec4 worldPosition = modelMatrix * contactPosition;
    vPhase = fract(sin(dot(worldPosition.xz, vec2(12.9898, 78.233))) * 43758.5453);

    float radial = length(uv - vec2(0.5)) * 2.0;
    float surfacePulse = sin(radial * 18.0 - uTime * 2.2 + vPhase * 6.2831);
    worldPosition.y += surfacePulse * 0.018;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const bridgeLavaContactFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vPhase;

  void main() {
    float radial = length(vUv - vec2(0.5)) * 2.0;
    float life = fract(uTime * 0.24 + vPhase);
    float waveRadius = mix(0.5, 0.98, life);
    float wave = 1.0 - smoothstep(0.02, 0.12, abs(radial - waveRadius));
    wave *= 1.0 - life;

    float secondLife = fract(life + 0.5);
    float secondRadius = mix(0.5, 0.98, secondLife);
    float secondWave = 1.0 - smoothstep(0.02, 0.105, abs(radial - secondRadius));
    secondWave *= (1.0 - secondLife) * 0.55;

    float contactHeat = 1.0 - smoothstep(0.48, 0.72, radial);
    float flicker = 0.82 + sin(uTime * 3.1 + vPhase * 11.0) * 0.18;
    vec3 deepHeat = vec3(0.48, 0.025, 0.002);
    vec3 hotEdge = vec3(1.0, 0.34, 0.025);
    vec3 color = mix(deepHeat, hotEdge, clamp(wave + secondWave + contactHeat * 0.45, 0.0, 1.0));
    float alpha = (wave * 0.68 + secondWave * 0.38 + contactHeat * 0.24) * flicker;
    if (alpha < 0.018) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function addLavaFall(
  parent: THREE.Object3D,
  position: [number, number, number],
  width: number,
  height: number,
  seed: number,
  rotationY = 0,
  outwardBulge = 0.7,
) {
  const halfWidth = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth * 0.72, 0);
  shape.lineTo(-halfWidth * (0.82 + seededRandom(seed) * 0.22), -height * 0.2);
  shape.lineTo(-halfWidth * (0.55 + seededRandom(seed + 1) * 0.3), -height * 0.43);
  shape.lineTo(-halfWidth * (0.88 + seededRandom(seed + 2) * 0.2), -height * 0.7);
  // An uneven, slightly broken lower lip avoids the perfectly straight seam
  // that otherwise gives away the waterfall as a single flat polygon.
  shape.lineTo(-halfWidth * 0.9, -height * 0.975);
  shape.lineTo(-halfWidth * 0.54, -height);
  shape.lineTo(-halfWidth * 0.14, -height * 0.968);
  shape.lineTo(halfWidth * 0.18, -height);
  shape.lineTo(halfWidth * 0.56, -height * 0.958);
  shape.lineTo(halfWidth, -height * 0.986);
  shape.lineTo(halfWidth * (0.62 + seededRandom(seed + 3) * 0.3), -height * 0.72);
  shape.lineTo(halfWidth * (0.9 + seededRandom(seed + 4) * 0.18), -height * 0.45);
  shape.lineTo(halfWidth * (0.58 + seededRandom(seed + 5) * 0.32), -height * 0.18);
  shape.lineTo(halfWidth * 0.72, 0);
  shape.closePath();

  const material = new THREE.ShaderMaterial({
    vertexShader: lavaFlowVertexShader,
    fragmentShader: lavaFlowFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: seededRandom(seed + 11) * 12 },
    },
    // The cascade is visually opaque. Let it participate in the depth buffer
    // so cliffs, bridge piers and rocks correctly occlude it.
    side: THREE.FrontSide,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  });
  lavaFlowMaterials.push(material);

  const geometry = new THREE.ShapeGeometry(shape, 12);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const progress = THREE.MathUtils.clamp(-positions.getY(index) / height, 0, 1);
    positions.setZ(index, Math.sin(progress * Math.PI * 0.5) * outwardBulge);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const fall = new THREE.Mesh(geometry, material);
  const outwardX = Math.sin(rotationY);
  const outwardZ = Math.cos(rotationY);
  fall.position.set(
    position[0] + outwardX * 0.16,
    position[1],
    position[2] + outwardZ * 0.16,
  );
  fall.rotation.y = rotationY;
  fall.renderOrder = 4;
  parent.add(fall);

  // Build the impact in a rotated local frame. Besides keeping the long axis
  // parallel to the waterfall, this also lets the animated pool overlap the
  // curved lower lip and dissolve naturally into the lake surface.
  const impactMaterial = new THREE.ShaderMaterial({
    vertexShader: lavaImpactVertexShader,
    fragmentShader: lavaImpactFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: seededRandom(seed + 17) * 9 },
    },
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  lavaFlowMaterials.push(impactMaterial);

  const impact = new THREE.Group();
  impact.position.set(
    position[0] + outwardX * (outwardBulge + 0.55),
    position[1] - height + 0.06,
    position[2] + outwardZ * (outwardBulge + 0.55),
  );
  impact.rotation.y = rotationY;

  const splash = new THREE.Mesh(new THREE.CircleGeometry(width * 0.92, 48), impactMaterial);
  splash.rotation.x = -Math.PI / 2;
  splash.scale.set(1, 0.68, 1);
  splash.renderOrder = 3;
  impact.add(splash);
  parent.add(impact);

  return fall;
}

type SurfacePattern = "masonry" | "rough" | "path" | "roof";

function createSurfaceBumpMap(pattern: SurfacePattern, repeatX: number, repeatY: number) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(size, size);
  const pixels = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const broadNoise = seededRandom(Math.floor(x / 8) * 0.73 + Math.floor(y / 8) * 13.17);
      const fineNoise = seededRandom(x * 0.113 + y * 7.31);
      let height = 128 + broadNoise * 42 + fineNoise * 24;

      if (pattern === "masonry") {
        const course = 64;
        const row = Math.floor(y / course);
        const shiftedX = (x + (row % 2) * 48) % 96;
        const horizontalJoint = Math.min(y % course, course - (y % course));
        const verticalJoint = Math.min(shiftedX, 96 - shiftedX);
        const edge = Math.min(horizontalJoint, verticalJoint);
        height = edge < 4 ? 24 + fineNoise * 12 : 155 + Math.min(edge, 14) * 2.8 + broadNoise * 28 + fineNoise * 14;
      } else if (pattern === "path") {
        const cellX = (x + (Math.floor(y / 76) % 2) * 54) % 108;
        const cellY = y % 76;
        const joint = Math.min(cellX, 108 - cellX, cellY, 76 - cellY);
        height = joint < 5 ? 22 : 142 + Math.min(joint, 18) * 2.5 + broadNoise * 38 + fineNoise * 18;
      } else if (pattern === "roof") {
        const rib = Math.abs(((x + y * 0.2) % 42) - 21);
        height = 92 + Math.max(0, 21 - rib) * 5.4 + broadNoise * 20 + fineNoise * 9;
      } else {
        height = 88 + broadNoise * 82 + fineNoise * 44;
      }

      const value = Math.max(0, Math.min(255, Math.round(height)));
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = renderer ? Math.min(renderer.capabilities.getMaxAnisotropy(), 8) : 1;
  texture.needsUpdate = true;
  surfaceTextures.push(texture);
  return texture;
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
  mesh.userData.mergeStaticBox = true;
  parent.add(mesh);
  return mesh;
}

function mergeStaticMeshes(scope: THREE.Object3D, destination: THREE.Scene) {
  scope.updateWorldMatrix(true, true);
  const animatedMeshes = new Set(flames.map(({ mesh }) => mesh));
  const groups = new Map<string, {
    material: THREE.Material;
    meshes: THREE.Mesh[];
    geometries: THREE.BufferGeometry[];
  }>();

  scope.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh)
      || object instanceof THREE.InstancedMesh
      || object instanceof THREE.SkinnedMesh
      || Array.isArray(object.material)
      || object.material.transparent
      || object.material instanceof THREE.ShaderMaterial
      || animatedMeshes.has(object)
      || object.renderOrder !== 0
    ) return;

    const attributeSignature = Object.keys(object.geometry.attributes)
      .map((name) => {
        const attribute = object.geometry.getAttribute(name);
        return `${name}:${attribute.itemSize}:${Number(attribute.normalized)}`;
      })
      .sort()
      .join("|");
    const key = [
      object.material.uuid,
      Number(object.castShadow),
      Number(object.receiveShadow),
      Number(Boolean(object.geometry.index)),
      attributeSignature,
    ].join(":");
    let group = groups.get(key);
    if (!group) {
      group = { material: object.material, meshes: [], geometries: [] };
      groups.set(key, group);
    }
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    group.meshes.push(object);
    group.geometries.push(geometry);
  });

  groups.forEach(({ material, meshes, geometries }) => {
    if (meshes.length < 2) {
      geometries.forEach((geometry) => geometry.dispose());
      return;
    }
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (!geometry) return;

    const merged = new THREE.Mesh(geometry, material);
    merged.castShadow = meshes[0]!.castShadow;
    merged.receiveShadow = meshes[0]!.receiveShadow;
    merged.name = `merged-static-meshes-${material.uuid}`;
    destination.add(merged);

    meshes.forEach((mesh) => {
      mesh.parent?.remove(mesh);
    });
  });
}

function addRuggedFoundationBlock(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  seed: number,
  amplitude = 0.22,
) {
  const [width, height, depth] = size;
  const geometry = new THREE.BoxGeometry(
    width,
    height,
    depth,
    Math.max(4, Math.ceil(width / 2.4)),
    2,
    Math.max(4, Math.ceil(depth / 2.4)),
  );
  const vertices = geometry.getAttribute("position") as THREE.BufferAttribute;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;

  for (let index = 0; index < vertices.count; index += 1) {
    let x = vertices.getX(index);
    let y = vertices.getY(index);
    let z = vertices.getZ(index);
    const surfaceNoise = seededRandom(
      seed + Math.round((x + halfWidth) * 17) * 0.37 + Math.round((z + halfDepth) * 19) * 1.91,
    );
    const cornerStrength = THREE.MathUtils.smoothstep(Math.abs(x) / halfWidth, 0.68, 1)
      * THREE.MathUtils.smoothstep(Math.abs(z) / halfDepth, 0.68, 1);
    const localAmplitude = amplitude * (1 + cornerStrength * 2.4);

    if (y >= halfHeight - 0.001) y += (surfaceNoise - 0.5) * localAmplitude * 2;
    if (Math.abs(x) >= halfWidth - 0.001)
      x += Math.sign(x) * (surfaceNoise - 0.5) * localAmplitude * 0.7;
    if (Math.abs(z) >= halfDepth - 0.001)
      z += Math.sign(z) * (surfaceNoise - 0.5) * localAmplitude * 0.7;

    vertices.setXYZ(index, x, y, z);
  }
  vertices.needsUpdate = true;
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roughenExtrudedFoundationTop(
  geometry: THREE.ExtrudeGeometry,
  seed: number,
  amplitude: number,
) {
  const vertices = geometry.getAttribute("position") as THREE.BufferAttribute;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;
  const halfWidth = Math.max((bounds.max.x - bounds.min.x) / 2, 0.001);
  const halfDepth = Math.max((bounds.max.y - bounds.min.y) / 2, 0.001);
  for (let index = 0; index < vertices.count; index += 1) {
    const x = vertices.getX(index);
    const y = vertices.getY(index);
    const z = vertices.getZ(index);
    if (z > 0.08) continue;
    const cornerStrength = THREE.MathUtils.smoothstep(Math.abs(x - centerX) / halfWidth, 0.7, 1)
      * THREE.MathUtils.smoothstep(Math.abs(y - centerY) / halfDepth, 0.7, 1);
    const relief = (seededRandom(seed + x * 1.73 + y * 7.19) - 0.5)
      * amplitude
      * (1 + cornerStrength * 2.6);
    vertices.setZ(index, z - relief);
  }
  vertices.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function addRuggedSurfaceField(
  parent: THREE.Object3D,
  material: THREE.Material,
  bounds: [number, number, number, number],
  surfaceY: number,
  count: number,
  seed: number,
  contains?: (x: number, z: number) => boolean,
) {
  const [minX, maxX, minZ, maxZ] = bounds;
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const field = new THREE.InstancedMesh(geometry, material, count);
  const transform = new THREE.Object3D();
  let placed = 0;
  let attempt = 0;

  while (placed < count && attempt < count * 8) {
    const itemSeed = seed + attempt * 47;
    const x = THREE.MathUtils.lerp(minX, maxX, seededRandom(itemSeed));
    const z = THREE.MathUtils.lerp(minZ, maxZ, seededRandom(itemSeed + 11));
    attempt += 1;
    if (contains && !contains(x, z)) continue;

    const radius = 0.45 + seededRandom(itemSeed + 19) * 1.25;
    transform.position.set(x, surfaceY, z);
    transform.rotation.set(
      (seededRandom(itemSeed + 23) - 0.5) * 0.18,
      seededRandom(itemSeed + 29) * Math.PI,
      (seededRandom(itemSeed + 31) - 0.5) * 0.18,
    );
    transform.scale.set(
      radius,
      0.1 + seededRandom(itemSeed + 37) * 0.2,
      radius * (0.65 + seededRandom(itemSeed + 41) * 0.55),
    );
    transform.updateMatrix();
    field.setMatrixAt(placed, transform.matrix);
    placed += 1;
  }

  field.count = placed;
  field.instanceMatrix.needsUpdate = true;
  field.castShadow = true;
  field.receiveShadow = true;
  parent.add(field);
  return field;
}

function addFoundationCornerOutcrops(
  parent: THREE.Object3D,
  material: THREE.Material,
  corners: Array<[number, number]>,
  surfaceY: number,
  seed: number,
) {
  const piecesPerCorner = 3;
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const outcrops = new THREE.InstancedMesh(
    geometry,
    material,
    corners.length * piecesPerCorner,
  );
  const transform = new THREE.Object3D();
  let instance = 0;

  corners.forEach(([cornerX, cornerZ], cornerIndex) => {
    for (let piece = 0; piece < piecesPerCorner; piece += 1) {
      const itemSeed = seed + cornerIndex * 101 + piece * 23;
      const radius = 1.15 + seededRandom(itemSeed + 5) * 1.45;
      transform.position.set(
        cornerX + (seededRandom(itemSeed + 7) - 0.5) * 3.2,
        surfaceY + seededRandom(itemSeed + 11) * 0.22,
        cornerZ + (seededRandom(itemSeed + 13) - 0.5) * 3.2,
      );
      transform.rotation.set(
        (seededRandom(itemSeed + 17) - 0.5) * 0.32,
        seededRandom(itemSeed + 19) * Math.PI,
        (seededRandom(itemSeed + 29) - 0.5) * 0.32,
      );
      transform.scale.set(
        radius,
        0.38 + seededRandom(itemSeed + 31) * 0.72,
        radius * (0.72 + seededRandom(itemSeed + 37) * 0.5),
      );
      transform.updateMatrix();
      outcrops.setMatrixAt(instance, transform.matrix);
      instance += 1;
    }
  });

  outcrops.instanceMatrix.needsUpdate = true;
  outcrops.castShadow = true;
  outcrops.receiveShadow = true;
  parent.add(outcrops);
  return outcrops;
}

function addGableRoof(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  height: number,
  y: number,
  material: THREE.Material,
) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -halfWidth, 0, halfDepth, halfWidth, 0, halfDepth, 0, height, halfDepth,
    -halfWidth, 0, -halfDepth, halfWidth, 0, -halfDepth, 0, height, -halfDepth,
  ], 3));
  geometry.setIndex([
    0, 1, 2, 4, 3, 5,
    3, 0, 2, 3, 2, 5,
    1, 4, 5, 1, 5, 2,
    3, 4, 1, 3, 1, 0,
  ]);
  geometry.computeVertexNormals();
  const roofMesh = new THREE.Mesh(geometry, material);
  roofMesh.position.y = y;
  parent.add(setShadow(roofMesh));
  return roofMesh;
}

function addRoseWindow(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale: number,
  stone: THREE.Material,
) {
  const window = new THREE.Group();
  window.position.set(x, y, z);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(1.08 * scale, 24),
    new THREE.MeshStandardMaterial({
      color: 0x3d1018,
      emissive: 0xa72b12,
      emissiveIntensity: 0.75,
      side: THREE.DoubleSide,
    }),
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08 * scale, 0.13 * scale, 6, 24), stone);
  glass.position.z = 0.01;
  ring.position.z = 0.05;
  window.add(glass, ring);
  for (let spoke = 0; spoke < 8; spoke += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 2.0 * scale, 0.1), stone);
    bar.rotation.z = (spoke / 8) * Math.PI;
    bar.position.z = 0.07;
    window.add(bar);
  }
  parent.add(setShadow(window));
  return window;
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
  // Ánh sáng môi trường đã đủ nhuộm màu kiến trúc. Không tạo PointLight cho
  // từng đuốc vì mỗi nguồn sẽ được tính trên mọi MeshStandardMaterial.
  void withLight;
  flames.push({ mesh: fire, phase: seededRandom(flames.length + 12) * Math.PI * 2 });
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

function addBattlements(
  parent: THREE.Object3D,
  length: number,
  x: number,
  y: number,
  z: number,
  alongX: boolean,
  material: THREE.Material,
  thickness = 0.52,
) {
  const count = Math.max(2, Math.floor(length / 0.75));
  for (let index = 0; index <= count; index += 1) {
    const t = index / count - 0.5;
    addBox(
      parent,
      alongX ? [0.34, 0.48, thickness] : [thickness, 0.48, 0.34],
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

function addCliffRockBlocks(parent: THREE.Object3D, rock: THREE.Material) {
  const blocks: Array<{ x: number; y: number; z: number; side: boolean; seed: number }> = [];
  // Three staggered courses create the tall, broken basalt wall from the
  // reference instead of exposing a broad, smooth extruded foundation face.
  const levels = [-2.15, -5.45, -8.35];
  let seed = 2101;

  levels.forEach((y, level) => {
    for (let x = -37 + level * 4.8; x <= 37; x += 10.4) {
      const absX = Math.abs(x);
      const frontZ = absX <= 14 ? 27 : 27 - ((absX - 14) / 25) * 3;
      blocks.push({ x, y, z: frontZ + 0.08, side: false, seed: seed++ });
      blocks.push({ x: x - 2.1, y, z: -28.08, side: false, seed: seed++ });
    }
  });

  levels.forEach((y, level) => {
    for (const x of [-45.08, 45.08]) {
      for (let z = -19 + level * 4.4; z <= 14; z += 10.2) {
        blocks.push({ x, y, z, side: true, seed: seed++ });
      }
    }
  });

  const blockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const cliffBlocks = new THREE.InstancedMesh(blockGeometry, rock, blocks.length);
  const transform = new THREE.Object3D();
  blocks.forEach((block, index) => {
    const along = 3.3 + seededRandom(block.seed * 1.7) * 1.15;
    const vertical = 2.15 + seededRandom(block.seed * 2.3) * 0.72;
    const outward = 1.35 + seededRandom(block.seed * 3.1) * 0.55;
    transform.position.set(
      block.x + (seededRandom(block.seed * 4.1) - 0.5) * 1.5,
      block.y + (seededRandom(block.seed * 5.3) - 0.5) * 0.9,
      block.z + (seededRandom(block.seed * 6.7) - 0.5) * 0.55,
    );
    transform.rotation.set(
      (seededRandom(block.seed * 7.1) - 0.5) * 0.35,
      seededRandom(block.seed * 8.3) * Math.PI,
      (seededRandom(block.seed * 9.7) - 0.5) * 0.3,
    );
    transform.scale.set(
      block.side ? outward : along,
      vertical,
      block.side ? along : outward,
    );
    transform.updateMatrix();
    cliffBlocks.setMatrixAt(index, transform.matrix);
  });
  cliffBlocks.instanceMatrix.needsUpdate = true;
  cliffBlocks.castShadow = true;
  cliffBlocks.receiveShadow = true;
  parent.add(cliffBlocks);
  return cliffBlocks;
}

function addLavaSupportRocks(parent: THREE.Object3D, rock: THREE.Material) {
  const supports = [-37, -27, -17, -7, 7, 17, 27, 37];
  const pieces: Array<{
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rx: number;
    ry: number;
    rz: number;
  }> = [];

  supports.forEach((x, supportIndex) => {
    const seed = 2603 + supportIndex * 47;
    const absX = Math.abs(x);
    const cliffZ = absX <= 14 ? 27 : 27 - ((absX - 14) / 25) * 3;
    const bottom = -9.7;
    const height = 7.15 + seededRandom(seed) * 1.35;
    const segmentCount = 2;
    const step = height / segmentCount;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const taper = 1 - segment * 0.095;
      const segmentSeed = seed + segment * 13;
      pieces.push({
        x: x + (seededRandom(segmentSeed) - 0.5) * 1.1,
        y: bottom + step * (segment + 0.5),
        z: cliffZ + 0.78 + (seededRandom(segmentSeed + 3) - 0.5) * 0.55,
        sx: (2.35 + seededRandom(segmentSeed + 5) * 0.8) * taper,
        sy: step * 0.7,
        sz: (1.65 + seededRandom(segmentSeed + 7) * 0.65) * taper,
        rx: (seededRandom(segmentSeed + 9) - 0.5) * 0.22,
        ry: seededRandom(segmentSeed + 11) * Math.PI,
        rz: (seededRandom(segmentSeed + 15) - 0.5) * 0.18,
      });
    }

    // Broad anchor boulders make each pillar feel embedded in the lava plane.
    for (const side of [-1, 1]) {
      const shardSeed = seed + (side > 0 ? 31 : 23);
      pieces.push({
        x: x + side * (1.85 + seededRandom(shardSeed) * 0.7),
        y: -8.65 + seededRandom(shardSeed + 2) * 0.3,
        z: cliffZ + 1.0 + (seededRandom(shardSeed + 4) - 0.5) * 1.1,
        sx: 1.35 + seededRandom(shardSeed + 6) * 0.65,
        sy: 1.45 + seededRandom(shardSeed + 8) * 0.6,
        sz: 1.1 + seededRandom(shardSeed + 10) * 0.5,
        rx: (seededRandom(shardSeed + 12) - 0.5) * 0.45,
        ry: seededRandom(shardSeed + 14) * Math.PI,
        rz: side * (0.18 + seededRandom(shardSeed + 16) * 0.18),
      });
    }
  });

  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const mesh = new THREE.InstancedMesh(geometry, rock, pieces.length);
  const transform = new THREE.Object3D();
  pieces.forEach((piece, index) => {
    transform.position.set(piece.x, piece.y, piece.z);
    transform.rotation.set(piece.rx, piece.ry, piece.rz);
    transform.scale.set(piece.sx, piece.sy, piece.sz);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addFoundationLavaFissures(parent: THREE.Object3D) {
  const fissureMaterial = new THREE.MeshStandardMaterial({
    color: 0x661603,
    emissive: 0xff3108,
    emissiveIntensity: 2.35,
    roughness: 0.72,
    metalness: 0,
  });
  const segments: Array<{
    x: number;
    y: number;
    z: number;
    length: number;
    width: number;
    angle: number;
    side: boolean;
  }> = [];

  const addCrack = (
    fixed: number,
    along: number,
    side: boolean,
    direction: number,
    seed: number,
  ) => {
    let cursor = along;
    let y = -9.56;
    const count = 3 + Math.floor(seededRandom(seed + 2) * 2);
    for (let index = 0; index < count; index += 1) {
      const segmentSeed = seed + index * 17;
      const length = 0.72 + seededRandom(segmentSeed) * 0.78;
      const angle = (seededRandom(segmentSeed + 3) - 0.5) * 0.72;
      const deltaAlong = Math.sin(angle) * length;
      const deltaY = Math.cos(angle) * length;
      segments.push({
        x: side ? fixed : cursor + deltaAlong * 0.5,
        y: y + deltaY * 0.5,
        z: side ? cursor + deltaAlong * 0.5 : fixed,
        length,
        width: 0.075 + seededRandom(segmentSeed + 7) * 0.085,
        angle: angle * direction,
        side,
      });
      cursor += deltaAlong;
      y += deltaY;
    }
  };

  // Sparse vertical seams echo the reference cliff. Keeping most of the rock
  // unlit avoids turning the foundation into a regular glowing grid.
  [-30, -10, 13, 31].forEach((x, index) => addCrack(27.72, x, false, -1, 5201 + index * 53));
  [-24, 4, 28].forEach((x, index) => addCrack(-28.72, x, false, 1, 5441 + index * 59));
  [-16, 3, 17].forEach((z, index) => addCrack(-45.72, z, true, 1, 5651 + index * 61));
  [-13, 8].forEach((z, index) => addCrack(45.72, z, true, -1, 5861 + index * 67));

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const fissures = new THREE.InstancedMesh(geometry, fissureMaterial, segments.length);
  const transform = new THREE.Object3D();
  segments.forEach((segment, index) => {
    transform.position.set(segment.x, segment.y, segment.z);
    transform.rotation.set(segment.side ? segment.angle : 0, 0, segment.side ? 0 : segment.angle);
    transform.scale.set(
      segment.side ? 0.075 : segment.width,
      segment.length,
      segment.side ? segment.width : 0.075,
    );
    transform.updateMatrix();
    fissures.setMatrixAt(index, transform.matrix);
  });
  fissures.instanceMatrix.needsUpdate = true;
  fissures.castShadow = false;
  fissures.receiveShadow = false;
  fissures.renderOrder = 1;
  parent.add(fissures);
  return fissures;
}

function addOppositeCliffRockFacing(parent: THREE.Object3D, rock: THREE.Material) {
  // Follow the castle-facing front and both angled shoulders with the same
  // massive low-poly boulders used beneath the citadel foundation.
  const contour: Array<[number, number]> = [
    [-48.05, -59.2],
    [-43.05, -54],
    [-39.05, -42],
    [-39.05, 42],
    [-43.05, 54],
    [-48.05, 59.2],
  ];
  const pieces: Array<{
    x: number;
    y: number;
    z: number;
    rotationY: number;
    sx: number;
    sy: number;
    sz: number;
    seed: number;
  }> = [];

  let seed = 4703;
  for (let segment = 0; segment < contour.length - 1; segment += 1) {
    const [startX, startZ] = contour[segment]!;
    const [endX, endZ] = contour[segment + 1]!;
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const length = Math.hypot(deltaX, deltaZ);
    const tangentX = deltaX / length;
    const tangentZ = deltaZ / length;
    const outwardX = tangentZ;
    const outwardZ = -tangentX;
    const baseRotationY = Math.atan2(-tangentZ, tangentX);
    const count = Math.max(1, Math.ceil(length / 8.4));

    for (let row = 0; row < 2; row += 1) {
      for (let index = 0; index < count; index += 1) {
        const pieceSeed = seed++;
        const stagger = row === 0 ? 0.18 : 0.62;
        const progress = THREE.MathUtils.clamp((index + stagger) / count, 0.04, 0.96);
        const outwardOffset = 0.48 + seededRandom(pieceSeed * 2.3) * 0.34;
        pieces.push({
          x: THREE.MathUtils.lerp(startX, endX, progress) + outwardX * outwardOffset,
          y: (row === 0 ? -2.25 : 2.0) + (seededRandom(pieceSeed * 3.1) - 0.5) * 0.72,
          z: THREE.MathUtils.lerp(startZ, endZ, progress) + outwardZ * outwardOffset,
          rotationY: baseRotationY + (seededRandom(pieceSeed * 4.7) - 0.5) * 0.32,
          sx: 3.15 + seededRandom(pieceSeed * 5.3) * 1.05,
          sy: 2.05 + seededRandom(pieceSeed * 6.1) * 0.62,
          sz: 1.35 + seededRandom(pieceSeed * 7.9) * 0.48,
          seed: pieceSeed,
        });
      }
    }
  }

  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const facing = new THREE.InstancedMesh(geometry, rock, pieces.length);
  const transform = new THREE.Object3D();
  pieces.forEach((piece, index) => {
    transform.position.set(piece.x, piece.y, piece.z);
    transform.rotation.set(
      (seededRandom(piece.seed * 8.3) - 0.5) * 0.28,
      piece.rotationY,
      (seededRandom(piece.seed * 9.7) - 0.5) * 0.24,
    );
    transform.scale.set(piece.sx, piece.sy, piece.sz);
    transform.updateMatrix();
    facing.setMatrixAt(index, transform.matrix);
  });
  facing.instanceMatrix.needsUpdate = true;
  facing.castShadow = true;
  facing.receiveShadow = true;
  parent.add(facing);
  return facing;
}

function addOppositeRockyPlateauTop(parent: THREE.Object3D, rock: THREE.Material) {
  // Broad overlapping shelves make the land read as one eroded high plateau,
  // rather than a flat slab with small stones sprinkled over it. The bridge
  // approach stays clear so its deck still meets the plateau cleanly.
  const count = 64;
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const shelves = new THREE.InstancedMesh(geometry, rock, count);
  const transform = new THREE.Object3D();
  let placed = 0;
  let attempt = 0;

  while (placed < count && attempt < count * 12) {
    const itemSeed = 6101 + attempt * 43;
    const x = THREE.MathUtils.lerp(-86, -43, seededRandom(itemSeed));
    const z = THREE.MathUtils.lerp(-53, 53, seededRandom(itemSeed + 7));
    attempt += 1;

    const insidePlateau = Math.abs(z) <= 42
      || x <= -48 - (Math.abs(z) - 42) * 0.32;
    const bridgeApproach = x > -58 && Math.abs(z) < 10;
    if (!insidePlateau || bridgeApproach) continue;

    const radius = 1.9 + seededRandom(itemSeed + 11) * 2.65;
    const rise = 0.12 + seededRandom(itemSeed + 13) * 0.72;
    transform.position.set(
      x,
      5.2 + rise * 0.55,
      z,
    );
    transform.rotation.set(
      (seededRandom(itemSeed + 17) - 0.5) * 0.11,
      seededRandom(itemSeed + 19) * Math.PI,
      (seededRandom(itemSeed + 23) - 0.5) * 0.11,
    );
    transform.scale.set(
      radius * (0.85 + seededRandom(itemSeed + 29) * 0.45),
      0.22 + rise,
      radius * (0.65 + seededRandom(itemSeed + 31) * 0.55),
    );
    transform.updateMatrix();
    shelves.setMatrixAt(placed, transform.matrix);
    placed += 1;
  }

  shelves.count = placed;
  shelves.instanceMatrix.needsUpdate = true;
  shelves.castShadow = true;
  shelves.receiveShadow = true;
  parent.add(shelves);
  return shelves;
}

function addOppositeLandmass(
  parent: THREE.Object3D,
  rock: THREE.Material,
  lavaRock: THREE.Material,
) {
  // A continent-sized plateau spans the complete 120-unit lava width.
  // Its eastern edge is derived from the bridge length so both always meet.
  const bevelSize = 0.8;
  // Compensate for the beveled top contour with only a small hidden overlap;
  // a larger value leaves a visible excess shelf around the far bridge mouth.
  const bridgeOverlap = bevelSize + 0.15;
  // Keep the overlap that hides the bevel at the bridge joint, but place the
  // plateau a hair below the deck. Coplanar overlapping top faces z-fight as
  // the camera moves and make the bridge edge appear to flicker.
  const bridgeJointDepthOffset = 0.1;
  const eastEdgeX = BRIDGE_OPPOSITE_EDGE_X - OPPOSITE_LANDMASS_ORIGIN_X + bridgeOverlap;
  const shape = new THREE.Shape();
  shape.moveTo(-47, -59.2);
  shape.lineTo(eastEdgeX - 9, -59.2);
  shape.lineTo(eastEdgeX - 4, -54);
  shape.lineTo(eastEdgeX, -42);
  shape.lineTo(eastEdgeX, 42);
  shape.lineTo(eastEdgeX - 4, 54);
  shape.lineTo(eastEdgeX - 9, 59.2);
  shape.lineTo(-47, 59.2);
  shape.closePath();

  const landmassGeometry = roughenExtrudedFoundationTop(
    new THREE.ExtrudeGeometry(shape, {
      depth: 8.7,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize,
      bevelThickness: 0.65,
      steps: 1,
    }),
    3907,
    0.5,
  );
  // Keep the plateau cap as ordinary rock while the vertical faces exposed to
  // the lake use heat-darkened basalt.
  const landmass = new THREE.Mesh(landmassGeometry, [rock, lavaRock]);
  // Include bevel thickness in the height calculation. Away from the hidden
  // joint the 0.1-unit difference is imperceptible, while the bridge surface
  // remains the sole visible face throughout the overlap.
  landmass.position.set(
    OPPOSITE_LANDMASS_ORIGIN_X,
    4.65 - bridgeJointDepthOffset,
    0,
  );
  landmass.rotation.x = Math.PI / 2;
  parent.add(setShadow(landmass));
  addOppositeCliffRockFacing(parent, lavaRock);
  addOppositeRockyPlateauTop(parent, rock);

  addRuggedSurfaceField(
    parent,
    rock,
    [-88, -41, -56, 56],
    5.13,
    150,
    3967,
    (x, z) => Math.abs(z) <= 42 || x <= -48 - (Math.abs(z) - 42) * 0.32,
  );
  addFoundationCornerOutcrops(
    parent,
    rock,
    [[-87, -55], [-87, 55], [-44, -42], [-44, 42]],
    5.08,
    4013,
  );

  // Lava vents break through the cliff facing the bridge and fall directly
  // into the lake. Keep the central bridge mouth clear.
  const oppositeCliffX = OPPOSITE_LANDMASS_ORIGIN_X + eastEdgeX + 0.18;
  for (const [z, width, seed] of [
    [-28, 2.7, 4051],
    [-14, 2.1, 4073],
    [15, 2.45, 4091],
    [29, 2.0, 4111],
  ] as Array<[number, number, number]>) {
    addLavaFall(parent, [oppositeCliffX, 4.72, z], width, 9.32, seed, Math.PI / 2, 0.8);
  }

  return landmass;
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
  archMaterial: THREE.Material,
  facingBack = false,
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  if (facingBack) group.rotation.y = Math.PI;
  const radius = 1.55 * scale;
  const springY = -2.05 * scale;
  const deckUndersideY = -0.3 * scale;
  // Stop each spandrel inside the shared pier so neighbouring panels never overlap.
  const halfBay = 2.15 * scale;

  // Fill both spandrels so no sky gap remains between the curved arch and bridge deck.
  const leftSpandrelShape = new THREE.Shape();
  leftSpandrelShape.moveTo(-halfBay, springY);
  leftSpandrelShape.lineTo(-halfBay, deckUndersideY);
  leftSpandrelShape.lineTo(0, deckUndersideY);
  for (let step = 0; step <= 10; step += 1) {
    const angle = Math.PI / 2 + (step / 10) * (Math.PI / 2);
    leftSpandrelShape.lineTo(Math.cos(angle) * radius, springY + Math.sin(angle) * radius);
  }
  leftSpandrelShape.closePath();

  const rightSpandrelShape = new THREE.Shape();
  rightSpandrelShape.moveTo(0, deckUndersideY);
  rightSpandrelShape.lineTo(halfBay, deckUndersideY);
  rightSpandrelShape.lineTo(halfBay, springY);
  for (let step = 0; step <= 10; step += 1) {
    const angle = (step / 10) * (Math.PI / 2);
    rightSpandrelShape.lineTo(Math.cos(angle) * radius, springY + Math.sin(angle) * radius);
  }
  rightSpandrelShape.closePath();

  for (const shape of [leftSpandrelShape, rightSpandrelShape]) {
    const spandrel = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.04 * scale,
        bevelEnabled: false,
        steps: 1,
      }),
      material,
    );
    // Centre the thin solid on the arch plane: nearly flush, but never coplanar with the pier.
    spandrel.position.z = -0.02 * scale;
    group.add(spandrel);
  }

  // Individual dark voussoirs read as masonry and avoid the smooth pipe-like torus silhouette.
  const archSegments = 13;
  const innerRadius = radius - 0.22 * scale;
  const outerRadius = radius + 0.22 * scale;
  for (let index = 0; index < archSegments; index += 1) {
    // Adjacent stones share an edge but never an area. Overlapping their
    // coplanar front/back faces causes visible shimmer on the far arch row.
    const startAngle = (index / archSegments) * Math.PI;
    const endAngle = ((index + 1) / archSegments) * Math.PI;
    const archStoneShape = new THREE.Shape();
    archStoneShape.moveTo(
      Math.cos(startAngle) * innerRadius,
      springY + Math.sin(startAngle) * innerRadius,
    );
    archStoneShape.lineTo(
      Math.cos(endAngle) * innerRadius,
      springY + Math.sin(endAngle) * innerRadius,
    );
    archStoneShape.lineTo(
      Math.cos(endAngle) * outerRadius,
      springY + Math.sin(endAngle) * outerRadius,
    );
    archStoneShape.lineTo(
      Math.cos(startAngle) * outerRadius,
      springY + Math.sin(startAngle) * outerRadius,
    );
    archStoneShape.closePath();
    const archStone = new THREE.Mesh(
      new THREE.ExtrudeGeometry(archStoneShape, {
        depth: 0.44 * scale,
        bevelEnabled: false,
        steps: 1,
      }),
      archMaterial,
    );
    archStone.position.z = -0.22 * scale;
    group.add(archStone);
  }
  // Preserve the arch crown while extending its columns to the lava-level footing.
  const columnHeight = 7.65 * scale;
  const columnCenterY = -5.875 * scale;
  const footingY = -9.49 * scale;
  const leftColumn = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale, columnHeight, 0.5 * scale), material);
  leftColumn.position.set(-radius, columnCenterY, 0);
  const rightColumn = leftColumn.clone();
  rightColumn.position.x = radius;
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.76 * scale, 0.42 * scale, 0.72 * scale), material);
  leftFoot.position.set(-radius, footingY, 0);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = radius;
  group.add(leftColumn, rightColumn, leftFoot, rightFoot);

  // Impost blocks cover the visible seams where each curved arch meets its columns.
  for (const side of [-1, 1]) {
    const impost = new THREE.Mesh(
      new THREE.BoxGeometry(0.76 * scale, 0.46 * scale, 0.72 * scale),
      material,
    );
    impost.position.set(side * radius, -2.05 * scale, 0);
    group.add(impost);
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

function addBurningTree(
  parent: THREE.Object3D,
  x: number,
  z: number,
  scale: number,
  seed: number,
) {
  const charredBark = new THREE.MeshStandardMaterial({
    color: 0x090606,
    emissive: 0x160300,
    emissiveIntensity: 0.2,
    roughness: 1,
  });
  const emberMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4a0a,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const tree = new THREE.Group();
  tree.position.set(x, -0.48, z);
  tree.rotation.y = seededRandom(seed) * Math.PI * 2;
  tree.rotation.z = (seededRandom(seed + 3) - 0.5) * 0.16;

  const trunkHeight = 4.1 * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.28 * scale, trunkHeight, 7),
    charredBark,
  );
  trunk.position.y = trunkHeight / 2;
  tree.add(trunk);

  for (let index = 0; index < 5; index += 1) {
    const angle = seededRandom(seed + index * 13) * Math.PI * 2;
    const branchLength = scale * (0.8 + seededRandom(seed + index * 17) * 0.8);
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025 * scale, 0.07 * scale, branchLength, 5),
      charredBark,
    );
    const direction = new THREE.Vector3(
      Math.cos(angle),
      0.25 + seededRandom(seed + index * 19) * 0.38,
      Math.sin(angle),
    ).normalize();
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    branch.position.copy(direction).multiplyScalar(branchLength * 0.42);
    branch.position.y += scale * (1.65 + index * 0.42);
    tree.add(branch);
  }

  // Khe than hồng mảnh bám theo mặt thân cây. Dùng mặt phẳng thay cho các
  // SphereGeometry để khi nhìn gần không còn giống những cục cam tròn.
  for (let index = 0; index < 4; index += 1) {
    const angle = seededRandom(seed + 101 + index * 11) * Math.PI * 2;
    const scar = new THREE.Mesh(
      new THREE.PlaneGeometry(
        0.055 * scale,
        (0.2 + seededRandom(seed + index * 17) * 0.16) * scale,
      ),
      emberMaterial,
    );
    scar.position.set(
      Math.cos(angle) * 0.205 * scale,
      scale * (0.65 + index * 0.68),
      Math.sin(angle) * 0.205 * scale,
    );
    scar.rotation.y = Math.PI / 2 - angle;
    scar.rotation.z = (seededRandom(seed + index * 31) - 0.5) * 0.65;
    tree.add(scar);
  }

  // Ngọn lửa thuôn nhọn và hơi nghiêng, thay cho khối cầu phát sáng trước đây.
  for (let index = 0; index < 2; index += 1) {
    const angle = seededRandom(seed + 211 + index * 23) * Math.PI * 2;
    const fire = new THREE.Mesh(
      new THREE.ConeGeometry(0.14 * scale, 0.62 * scale, 5),
      new THREE.MeshBasicMaterial({
        color: index === 0 ? 0xff6a0a : 0xd92b05,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    fire.position.set(
      Math.cos(angle) * 0.2 * scale,
      scale * (0.9 + index * 1.35),
      Math.sin(angle) * 0.2 * scale,
    );
    fire.rotation.z = (seededRandom(seed + 251 + index * 13) - 0.5) * 0.28;
    fire.scale.set(0.72, 1.25, 0.72);
    tree.add(fire);
    flames.push({
      mesh: fire,
      phase: seededRandom(seed + 307 + index * 29) * Math.PI * 2,
    });
  }

  const emberCount = 18;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberOffsets = new Float32Array(emberCount * 2);
  const emberPhases = new Float32Array(emberCount);
  for (let index = 0; index < emberCount; index += 1) {
    const particleSeed = seed + 401 + index * 31;
    const angle = seededRandom(particleSeed) * Math.PI * 2;
    const radius = scale * (0.08 + seededRandom(particleSeed + 3) * 0.24);
    emberOffsets[index * 2] = Math.cos(angle) * radius;
    emberOffsets[index * 2 + 1] = Math.sin(angle) * radius;
    emberPhases[index] = seededRandom(particleSeed + 7);
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(emberPositions, 3),
  );
  const risingEmbers = new THREE.Points(
    emberGeometry,
    new THREE.PointsMaterial({
      color: 0xff6418,
      size: 0.075 * scale,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  risingEmbers.frustumCulled = false;
  risingEmbers.userData.rising = true;
  risingEmbers.userData.emberOffsets = emberOffsets;
  risingEmbers.userData.emberPhases = emberPhases;
  risingEmbers.userData.riseHeight = 4.5 * scale;
  risingEmbers.userData.riseSpeed = 0.12 + seededRandom(seed + 503) * 0.045;
  risingEmbers.userData.driftPhase = seededRandom(seed + 509) * Math.PI * 2;
  tree.add(risingEmbers);
  embers.push(risingEmbers);

  tree.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.material !== charredBark) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  parent.add(tree);
}

function addAshForest(
  parent: THREE.Object3D,
  countPerSide: number,
  frontCountPerSide: number,
  rearCount: number,
) {
  const totalTrees = (countPerSide + frontCountPerSide) * 2 + rearCount;
  const bark = new THREE.MeshStandardMaterial({
    color: 0x211516,
    emissive: 0x120504,
    emissiveIntensity: 0.24,
    roughness: 1,
  });
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.1, 0.24, 5, 7),
    bark,
    totalTrees,
  );
  const branches = Array.from({ length: 6 }, () => (
    new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.025, 0.075, 1.55, 5),
      bark,
      totalTrees,
    )
  ));
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const branchDirection = new THREE.Vector3();
  let instance = 0;

  const placeTree = (seed: number, x: number, z: number, scale: number) => {
    const rotationY = seededRandom(seed + 41) * Math.PI * 2;

    transform.position.set(x, -0.48 + 2.45 * scale, z);
    transform.rotation.set(
      (seededRandom(seed + 43) - 0.5) * 0.12,
      rotationY,
      (seededRandom(seed + 47) - 0.5) * 0.12,
    );
    transform.scale.setScalar(scale);
    transform.updateMatrix();
    trunk.setMatrixAt(instance, transform.matrix);

    branches.forEach((branch, tier) => {
      const branchSeed = seed + tier * 17;
      const angle = rotationY + tier * 2.399 + (seededRandom(branchSeed + 3) - 0.5) * 0.5;
      const upward = 0.22 + seededRandom(branchSeed + 5) * 0.38;
      branchDirection.set(Math.cos(angle), upward, Math.sin(angle)).normalize();
      const branchLength = scale * (0.9 + seededRandom(branchSeed + 7) * 0.85);
      const branchY = -0.48 + (1.8 + tier * 0.55) * scale;
      transform.position.set(
        x + branchDirection.x * branchLength * 0.42,
        branchY + branchDirection.y * branchLength * 0.42,
        z + branchDirection.z * branchLength * 0.42,
      );
      transform.quaternion.setFromUnitVectors(up, branchDirection);
      transform.scale.set(scale * 0.82, branchLength / 1.55, scale * 0.82);
      transform.updateMatrix();
      branch.setMatrixAt(instance, transform.matrix);
    });
    instance += 1;
  };

  for (const side of [-1, 1]) {
    for (let index = 0; index < countPerSide; index += 1) {
      const seed = 941 + index * 37 + (side > 0 ? 5003 : 0);
      const x = side * (19.2 + seededRandom(seed) * 20.5);
      const z = -21.5 + seededRandom(seed + 11) * 43;
      const scale = 1.05 + seededRandom(seed + 23) * 1.15;
      placeTree(seed, x, z, scale);
    }

    // A looser transition scatters burned trees around the forecourt instead of
    // forming two artificial-looking clumps tight against its parapets.
    for (let index = 0; index < frontCountPerSide; index += 1) {
      const seed = 12011 + index * 43 + (side > 0 ? 3011 : 0);
      const x = side * (13.2 + seededRandom(seed) * 10.8);
      const z = 13.5 + seededRandom(seed + 11) * 11.5;
      const scale = 0.85 + seededRandom(seed + 23) * 0.9;
      placeTree(seed, x, z, scale);
    }
  }

  // A continuous but irregular tree line fills the strip behind the rear wall
  // and great hall, where the plateau previously looked empty when viewed
  // from the gameplay camera or while orbiting around the citadel.
  for (let index = 0; index < rearCount; index += 1) {
    const seed = 18181 + index * 61;
    const x = -39 + seededRandom(seed) * 78;
    const z = -27 + seededRandom(seed + 13) * 5.5;
    const scale = 0.95 + seededRandom(seed + 29) * 1.15;
    placeTree(seed, x, z, scale);
  }

  trunk.instanceMatrix.needsUpdate = true;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  parent.add(trunk);
  for (const branch of branches) {
    branch.instanceMatrix.needsUpdate = true;
    branch.castShadow = true;
    branch.receiveShadow = true;
    parent.add(branch);
  }
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

function addBridge(
  parent: THREE.Object3D,
  stone: THREE.Material,
  darkStone: THREE.Material,
  lavaRock: THREE.Material,
) {
  const bridge = new THREE.Group();
  // Keep the castle end fixed while deriving the opposite end and foundation edge.
  bridge.position.set(BRIDGE_CENTER_X, 5, 0);
  const bridgeLength = BRIDGE_LENGTH;
  const bridgeWidth = BRIDGE_WIDTH;
  const bayWidth = 4.5;
  const pierCount = Math.round(bridgeLength / bayWidth) + 1;
  const pierPositions = Array.from(
    { length: pierCount },
    (_, index) => -bridgeLength / 2 + index * bayWidth,
  );
  const archPositions = pierPositions.slice(0, -1).map((x) => x + bayWidth / 2);
  const deckTopY = 0.3;
  const bridgeEdgeZ = bridgeWidth / 2;
  // Mười hai vị trí đặt tháp trải đều dọc cầu. Bỏ ba tim trụ cách đều nhau
  // để tạo khoảng nghỉ, tránh biến mép cầu thành một dải bệ liên tục.
  const omittedTowerPierIndices = new Set([3, 8, 13]);
  const towerPadXs = pierPositions.filter((_, index) => (
    index > 0
      && index < pierPositions.length - 1
      && !omittedTowerPierIndices.has(index)
  ));
  // The bridge surface tops out at world Y = 5.3, matching the forecourt and castle floor.
  addBox(bridge, [bridgeLength, 0.6, bridgeWidth], [0, 0, 0], stone);
  addBox(bridge, [bridgeLength, 0.28, bridgeWidth], [0, -0.44, 0], darkStone);

  // Những phiến đá xám nâu lớn tạo mặt đường lát kiểu pháo đài trong ảnh.
  // Instance color phá sự đồng đều nhưng toàn bộ nền gạch vẫn chỉ tốn một draw call.
  const paverColumns = 36;
  const paverRows = 3;
  const paverLength = bridgeLength / paverColumns;
  const paverDepth = (bridgeWidth - 0.18) / paverRows;
  const paverMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.015,
  });
  const pavers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(paverLength - 0.075, 0.075, paverDepth - 0.075),
    paverMaterial,
    paverColumns * paverRows,
  );
  const paverTransform = new THREE.Object3D();
  const paverPalette = [0x615957, 0x756960, 0x514c50, 0x685e5b];
  let paverIndex = 0;
  for (let column = 0; column < paverColumns; column += 1) {
    for (let row = 0; row < paverRows; row += 1) {
      const seed = 23011 + column * 37 + row * 101;
      paverTransform.position.set(
        -bridgeLength / 2 + paverLength * (column + 0.5),
        deckTopY + 0.0375 + (seededRandom(seed) - 0.5) * 0.012,
        (row - (paverRows - 1) / 2) * paverDepth,
      );
      paverTransform.rotation.set(
        0,
        (seededRandom(seed + 7) - 0.5) * 0.025,
        (seededRandom(seed + 13) - 0.5) * 0.012,
      );
      paverTransform.updateMatrix();
      pavers.setMatrixAt(paverIndex, paverTransform.matrix);
      pavers.setColorAt(
        paverIndex,
        new THREE.Color(paverPalette[(column + row * 2) % paverPalette.length]!),
      );
      paverIndex += 1;
    }
  }
  pavers.instanceMatrix.needsUpdate = true;
  if (pavers.instanceColor) pavers.instanceColor.needsUpdate = true;
  // The deck beneath already receives the large architectural shadows. Avoid
  // repeating that shadow lookup across every visible paving fragment.
  pavers.receiveShadow = false;
  bridge.add(pavers);

  // Mặt cầu chỉ nở rộng cục bộ thành các ban công tròn, thay vì biến toàn bộ
  // cây cầu thành một tấm chữ nhật rộng đều.
  const towerPadPositions = towerPadXs.map((x, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    return [x, side * (bridgeEdgeZ + 0.5)] as const;
  });
  const padTransform = new THREE.Object3D();

  // Lan can Gothic thấp và thoáng: hai thanh ngang mảnh, trụ đứng và chóp
  // nhọn. Các đoạn thẳng ngắt tại lối vào bệ đặt tháp.
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x29262d,
    metalness: 0.28,
    roughness: 0.72,
  });
  const straightRailSegments: Array<[number, number, number]> = [];
  const railOpeningHalfWidth = 1.28;
  const railEdgeZ = bridgeEdgeZ - 0.09;
  for (const z of [-railEdgeZ, railEdgeZ]) {
    const sidePadXs = towerPadPositions
      .filter(([, padZ]) => Math.sign(padZ) === Math.sign(z))
      .map(([padX]) => padX);
    let segmentStart = -bridgeLength / 2;
    for (const padX of sidePadXs) {
      const segmentEnd = padX - railOpeningHalfWidth;
      if (segmentEnd - segmentStart > 0.2) {
        straightRailSegments.push([
          (segmentStart + segmentEnd) / 2,
          segmentEnd - segmentStart,
          z,
        ]);
      }
      segmentStart = padX + railOpeningHalfWidth;
    }
    if (bridgeLength / 2 - segmentStart > 0.2) {
      straightRailSegments.push([
        (segmentStart + bridgeLength / 2) / 2,
        bridgeLength / 2 - segmentStart,
        z,
      ]);
    }
  }

  const straightRails = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    railMaterial,
    straightRailSegments.length * 2,
  );
  const straightPostPositions: Array<[number, number]> = [];
  let straightRailIndex = 0;
  straightRailSegments.forEach(([centerX, length, z]) => {
    for (const [height, centerY, depth] of [
      [0.14, deckTopY + 0.11, 0.2],
      [0.11, deckTopY + 0.64, 0.18],
    ] as Array<[number, number, number]>) {
      padTransform.position.set(centerX, centerY, z);
      padTransform.rotation.set(0, 0, 0);
      padTransform.scale.set(length, height, depth);
      padTransform.updateMatrix();
      straightRails.setMatrixAt(straightRailIndex, padTransform.matrix);
      straightRailIndex += 1;
    }

    const postCount = Math.max(2, Math.ceil(length / 1.05));
    for (let post = 0; post <= postCount; post += 1) {
      straightPostPositions.push([
        centerX - length / 2 + (post / postCount) * length,
        z,
      ]);
    }
  });

  const straightPosts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 0.66, 0.14),
    railMaterial,
    straightPostPositions.length,
  );
  const straightFinials = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.13, 0.24, 4),
    railMaterial,
    straightPostPositions.length,
  );
  straightPostPositions.forEach(([x, z], index) => {
    padTransform.position.set(x, deckTopY + 0.33, z);
    padTransform.rotation.set(0, Math.PI / 4, 0);
    padTransform.scale.set(1, 1, 1);
    padTransform.updateMatrix();
    straightPosts.setMatrixAt(index, padTransform.matrix);

    padTransform.position.y = deckTopY + 0.78;
    padTransform.updateMatrix();
    straightFinials.setMatrixAt(index, padTransform.matrix);
  });

  for (const railPart of [
    straightRails,
    straightPosts,
    straightFinials,
  ]) {
    railPart.instanceMatrix.needsUpdate = true;
    railPart.castShadow = true;
    railPart.receiveShadow = true;
    bridge.add(railPart);
  }

  const padBalconies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.6, 18),
    stone,
    towerPadPositions.length,
  );
  const padCorbels = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.85, 1.22, 0.78, 12),
    darkStone,
    towerPadPositions.length,
  );
  towerPadPositions.forEach(([x, z], index) => {
    padTransform.position.set(x, 0, z);
    padTransform.rotation.set(0, Math.PI / 18, 0);
    padTransform.scale.set(1, 1, 1);
    padTransform.updateMatrix();
    padBalconies.setMatrixAt(index, padTransform.matrix);

    padTransform.position.y = -0.68;
    padTransform.rotation.y = Math.PI / 12;
    padTransform.updateMatrix();
    padCorbels.setMatrixAt(index, padTransform.matrix);
  });

  const padRuneMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a6032,
    emissive: 0x2c0903,
    emissiveIntensity: 0.24,
    metalness: 0.58,
    roughness: 0.46,
  });
  const padRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.83, 0.07, 6, 20),
    padRuneMaterial,
    towerPadPositions.length,
  );
  towerPadPositions.forEach(([x, z], index) => {
    padTransform.position.set(x, deckTopY + 0.015, z);
    padTransform.rotation.set(Math.PI / 2, 0, 0);
    padTransform.scale.set(1, 1, 1);
    padTransform.updateMatrix();
    padRings.setMatrixAt(index, padTransform.matrix);
  });

  const spokeCount = 8;
  const padSpokes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.58, 0.05, 0.065),
    padRuneMaterial,
    towerPadPositions.length * spokeCount,
  );
  let spokeIndex = 0;
  towerPadPositions.forEach(([x, z]) => {
    for (let spoke = 0; spoke < spokeCount; spoke += 1) {
      const angle = (spoke / spokeCount) * Math.PI * 2;
      const radialCenter = 0.51;
      padTransform.position.set(
        x + Math.cos(angle) * radialCenter,
        deckTopY + 0.02,
        z + Math.sin(angle) * radialCenter,
      );
      padTransform.rotation.set(0, -angle, 0);
      padTransform.updateMatrix();
      padSpokes.setMatrixAt(spokeIndex, padTransform.matrix);
      spokeIndex += 1;
    }
  });

  for (const padPart of [
    padBalconies,
    padCorbels,
    padRings,
    padSpokes,
  ]) {
    padPart.instanceMatrix.needsUpdate = true;
    padPart.castShadow = true;
    padPart.receiveShadow = true;
    padPart.name = "tower-placement-pad";
    bridge.add(padPart);
  }

  const recessShape = new THREE.Shape();
  recessShape.moveTo(-0.4, -1.7);
  recessShape.lineTo(-0.4, 0.72);
  recessShape.quadraticCurveTo(-0.34, 1.35, 0, 1.72);
  recessShape.quadraticCurveTo(0.34, 1.35, 0.4, 0.72);
  recessShape.lineTo(0.4, -1.7);
  recessShape.closePath();
  const recessGeometry = new THREE.ShapeGeometry(recessShape);
  const recessMaterial = new THREE.MeshBasicMaterial({
    color: 0x100d12,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  for (const x of pierPositions) {
    // Meet the deck exactly at its underside. Avoid overlapping coplanar side faces,
    // which cause z-fighting now that the deck and supports share the same width.
    addBox(bridge, [1.15, 9.4, bridgeWidth], [x, -5, 0], lavaRock);
    for (const side of [-1, 1]) {
      const recess = new THREE.Mesh(recessGeometry, recessMaterial);
      recess.position.set(x, -5.05, side * (bridgeWidth / 2 + 0.08));
      bridge.add(recess);
    }
  }

  // Phá silhouette vuông vức tại đường tiếp xúc với dung nham. Các tảng
  // basalt thấp che chân hộp và khiến trụ trông như được neo vào đá núi lửa.
  const footingGeometry = new THREE.DodecahedronGeometry(1, 0);
  const footingCount = pierPositions.length * 4;
  const footingRocks = new THREE.InstancedMesh(
    footingGeometry,
    lavaRock,
    footingCount,
  );
  const footingTransform = new THREE.Object3D();
  let footingIndex = 0;
  pierPositions.forEach((x, pierIndex) => {
    for (let piece = 0; piece < 4; piece += 1) {
      const seed = 6203 + pierIndex * 71 + piece * 17;
      const side = piece % 2 === 0 ? -1 : 1;
      const radius = 0.72 + seededRandom(seed) * 0.5;
      footingTransform.position.set(
        x + (seededRandom(seed + 3) - 0.5) * 1.35,
        -9.55 + seededRandom(seed + 5) * 0.2,
        side * (1.25 + seededRandom(seed + 7) * 2.3),
      );
      footingTransform.rotation.set(
        (seededRandom(seed + 11) - 0.5) * 0.42,
        seededRandom(seed + 13) * Math.PI,
        (seededRandom(seed + 17) - 0.5) * 0.36,
      );
      footingTransform.scale.set(
        radius * (0.78 + seededRandom(seed + 19) * 0.45),
        radius * (0.48 + seededRandom(seed + 23) * 0.38),
        radius * (0.9 + seededRandom(seed + 29) * 0.62),
      );
      footingTransform.updateMatrix();
      footingRocks.setMatrixAt(footingIndex, footingTransform.matrix);
      footingIndex += 1;
    }
  });
  footingRocks.instanceMatrix.needsUpdate = true;
  footingRocks.castShadow = true;
  footingRocks.receiveShadow = true;
  bridge.add(footingRocks);

  // Một draw call tạo vùng gợn nóng cho toàn bộ chân cầu. Các instance dùng
  // pha khác nhau nên mặt dung nham không dao động đồng loạt như máy móc.
  const contactMaterial = new THREE.ShaderMaterial({
    vertexShader: bridgeLavaContactVertexShader,
    fragmentShader: bridgeLavaContactFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  lavaFlowMaterials.push(contactMaterial);
  const contactRipples = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.5, 1, 28),
    contactMaterial,
    pierPositions.length,
  );
  const contactTransform = new THREE.Object3D();
  pierPositions.forEach((x, index) => {
    // Mặt lava dao động tối đa khoảng 0.1; đặt ripple cao hơn đỉnh sóng một
    // chút để depth buffer không nuốt mất hiệu ứng ở góc camera thấp.
    contactTransform.position.set(x, -9.56, 0);
    contactTransform.rotation.set(-Math.PI / 2, 0, 0);
    contactTransform.scale.set(
      1.72 + seededRandom(8101 + index * 23) * 0.24,
      5.05 + seededRandom(8111 + index * 29) * 0.4,
      1,
    );
    contactTransform.updateMatrix();
    contactRipples.setMatrixAt(index, contactTransform.matrix);
  });
  contactRipples.instanceMatrix.needsUpdate = true;
  contactRipples.frustumCulled = false;
  contactRipples.renderOrder = 8;
  bridge.add(contactRipples);

  const archZ = bridgeWidth / 2 + 0.03;
  for (const x of archPositions) {
    addGothicArch(bridge, x, -archZ, 1, stone, darkStone);
    addGothicArch(bridge, x, archZ, 1, stone, darkStone, true);
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
  // Nhấc rune khỏi mặt đường một khoảng rất nhỏ để tránh z-fighting.
  group.position.set(x, y + 0.012, z);
  group.rotation.x = -Math.PI / 2;
  const runeMaterial = new THREE.MeshStandardMaterial({
    color: 0xa49b8e,
    roughness: 0.8,
    metalness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(scale * 0.72, scale * 0.88, 12), runeMaterial);
  group.add(ring);
  const spokeInnerRadius = scale * 0.22;
  const spokeOuterRadius = scale * 0.72;
  const spokeLength = spokeOuterRadius - spokeInnerRadius;
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(scale * 0.08, spokeLength, 0.04),
      runeMaterial,
    );
    // Bắt đầu tia ngoài vùng tâm để các mesh không còn đè lên nhau.
    spoke.position.y = (spokeInnerRadius + spokeOuterRadius) / 2;
    spoke.rotation.z = (i / 8) * Math.PI * 2;
    group.add(spoke);
  }
  parent.add(group);
}

function addCastleDoor(parent: THREE.Object3D, x: number, y: number, z: number, rotationY: number, scale = 1) {
  const door = new THREE.Group();
  door.position.set(x, y, z);
  door.rotation.y = rotationY;

  const width = 1.58 * scale;
  const shoulderHeight = 1.72 * scale;
  const totalHeight = 2.92 * scale;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, shoulderHeight);
  shape.quadraticCurveTo(-width * 0.42, totalHeight * 0.88, 0, totalHeight);
  shape.quadraticCurveTo(width * 0.42, totalHeight * 0.88, width / 2, shoulderHeight);
  shape.lineTo(width / 2, 0);
  shape.closePath();

  const wood = new THREE.MeshStandardMaterial({
    color: 0x6b321e,
    roughness: 0.72,
    metalness: 0.02,
    emissive: 0x120502,
    emissiveIntensity: 0.22,
    bumpMap: createSurfaceBumpMap("rough", 2.2, 6.5),
    bumpScale: 0.1,
  });
  const iron = new THREE.MeshStandardMaterial({ color: 0x29262d, roughness: 0.3, metalness: 0.9 });
  const doorLeaf = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.16 * scale, bevelEnabled: true, bevelSize: 0.035 * scale, bevelThickness: 0.025 * scale, bevelSegments: 2 }),
    wood,
  );
  doorLeaf.castShadow = true;
  doorLeaf.receiveShadow = true;
  door.add(doorLeaf);

  const hardwareDepth = 0.215 * scale;
  const centerBar = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 2.55 * scale, 0.055 * scale), iron);
  centerBar.position.set(0, 1.27 * scale, hardwareDepth);
  door.add(centerBar);

  for (const barY of [0.52, 1.25, 1.86]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.42 * scale, 0.11 * scale, 0.055 * scale), iron);
    brace.position.set(0, barY * scale, hardwareDepth);
    door.add(brace);
  }

  for (const side of [-1, 1]) {
    const verticalBrace = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 2.18 * scale, 0.055 * scale), iron);
    verticalBrace.position.set(side * 0.55 * scale, 1.1 * scale, hardwareDepth);
    door.add(verticalBrace);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1 * scale, 0.025 * scale, 6, 16), iron);
    handle.position.set(side * 0.17 * scale, 1.12 * scale, hardwareDepth + 0.055 * scale);
    door.add(handle);
  }

  for (const studY of [0.52, 1.25, 1.86]) {
    for (const studX of [-0.55, -0.28, 0.28, 0.55]) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 7, 5), iron);
      stud.position.set(studX * scale, studY * scale, hardwareDepth + 0.04 * scale);
      door.add(stud);
    }
  }

  parent.add(setShadow(door));
  return door;
}

function addCastleGatehouse(
  parent: THREE.Object3D,
  x: number,
  z: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const gatehouse = new THREE.Group();
  gatehouse.position.set(x, 0, z);

  // Twin round watchtowers and a tall pointed portal follow the reference gate module.
  for (const side of [-1, 1]) {
    addGothicWatchtower(gatehouse, side * 2.55, 0, 12.8, 1.28, stone, darkStone, roof);
    addBanner(gatehouse, side * 2.55, 7.9, 1.31, 0, 0.82);
  }

  addBox(gatehouse, [3.25, 10.5, 1.25], [0, 5.25, 0], darkStone);
  addBox(gatehouse, [3.65, 0.42, 1.48], [0, 10.43, 0], stone);
  addBattlements(gatehouse, 3.45, 0, 10.87, 0.74, true, stone);
  addGothicWindow(gatehouse, 0, 7.35, 0.636, 0, 0.48);
  addRoseWindow(gatehouse, 0, 9.0, 0.65, 0.48, stone);

  // A flat pointed opening replaces the previous rounded 3D capsule.
  const openingShape = new THREE.Shape();
  openingShape.moveTo(-1.18, 0);
  openingShape.lineTo(-1.18, 2.55);
  openingShape.lineTo(0, 4.15);
  openingShape.lineTo(1.18, 2.55);
  openingShape.lineTo(1.18, 0);
  openingShape.closePath();
  const opening = new THREE.Mesh(
    new THREE.ShapeGeometry(openingShape),
    new THREE.MeshBasicMaterial({ color: 0x070608, side: THREE.DoubleSide }),
  );
  opening.position.set(0, 0.48, 0.646);
  gatehouse.add(opening);

  // Heavy stone jambs and a pointed lintel frame the entrance.
  for (const side of [-1, 1]) {
    addBox(gatehouse, [0.34, 2.75, 0.42], [side * 1.32, 1.84, 0.88], stone);
    const archSide = addBox(gatehouse, [2.0, 0.34, 0.42], [side * 0.58, 3.75, 0.88], stone);
    archSide.rotation.z = side * -0.94;
    addBox(gatehouse, [0.62, 0.38, 0.62], [side * 1.32, 0.52, 0.88], stone);
  }

  addCastleDoor(gatehouse, 0, 0.5, 0.91, 0, 1.32);
  for (const torchX of [-1.72, 1.72]) addTorch(gatehouse, torchX, 2.35, 1.02, 0.76, true);

  parent.add(setShadow(gatehouse));
  return gatehouse;
}

function addCastleFoundation(
  parent: THREE.Object3D,
  stone: THREE.Material,
  darkStone: THREE.Material,
  rock: THREE.Material,
  lavaRock: THREE.Material,
) {
  const foundation = new THREE.Group();
  const cityCenterZ = -3.6;
  const lavaWidth = 90;

  // The summit stretches behind the citadel to hold several complete town districts.
  addRuggedFoundationBlock(foundation, [36.7, 0.7, 37.7], [0, -1.35, cityCenterZ], stone, 4201, 0.24);
  addRuggedFoundationBlock(foundation, [36.15, 0.85, 37.15], [0, -2.05, cityCenterZ], darkStone, 4243, 0.28);
  addRuggedFoundationBlock(foundation, [35.45, 1.05, 36.45], [0, -2.95, cityCenterZ], stone, 4283, 0.32);

  // One broad volcanic plateau supports both the citadel and its forecourt.
  // The irregular vertical outline reads as a land region with cliffs instead
  // of a tapered mound of loose material.
  const halfLandWidth = lavaWidth / 2;
  const landShape = new THREE.Shape();
  landShape.moveTo(-halfLandWidth + 4, -28);
  landShape.lineTo(halfLandWidth - 4, -28);
  landShape.lineTo(halfLandWidth, -22);
  landShape.lineTo(halfLandWidth, 15);
  landShape.lineTo(halfLandWidth - 6, 24);
  landShape.lineTo(14, 27);
  landShape.lineTo(-14, 27);
  landShape.lineTo(-halfLandWidth + 6, 24);
  landShape.lineTo(-halfLandWidth, 15);
  landShape.lineTo(-halfLandWidth, -22);
  landShape.closePath();

  // Keep the cliff body solid behind the large outer boulders. Hiding the
  // extrusion sides leaves visible holes between rocks and breaks the base.
  const landGeometry = roughenExtrudedFoundationTop(
    new THREE.ExtrudeGeometry(landShape, {
      depth: 9.15,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.65,
      bevelThickness: 0.45,
      steps: 1,
    }),
    4303,
    0.48,
  );
  const land = new THREE.Mesh(landGeometry, [rock, lavaRock]);
  land.position.y = -0.55;
  land.rotation.x = Math.PI / 2;
  foundation.add(setShadow(land));
  addRuggedSurfaceField(
    foundation,
    rock,
    [-42, 42, -25.5, 24],
    -0.08,
    170,
    4363,
    (x, z) => {
      const edge = z > 15
        ? 44 - (z - 15) * 0.62
        : z < -22
          ? 44 - (-22 - z) * 0.62
          : 44;
      return Math.abs(x) <= edge;
    },
  );
  addFoundationCornerOutcrops(
    foundation,
    rock,
    [[-40, -26], [40, -26], [-38, 23], [38, 23]],
    -0.16,
    4409,
  );
  addCliffRockBlocks(foundation, lavaRock);

  // One heavy stone belt visually locks the castle plinth into the mountain summit.
  addRuggedFoundationBlock(
    foundation,
    [35.1, 0.24, 36.1],
    [0, -3.48, cityCenterZ],
    darkStone,
    4337,
    0.14,
  );

  // Heavy buttresses carry the wall down towards the volcanic shelf.
  for (const x of [-16.6, -12.45, -8.3, -4.15, 0, 4.15, 8.3, 12.45, 16.6]) {
    const frontButtress = addBox(foundation, [0.72, 6.8, 1.05], [x, -6.3, 14.15], stone);
    frontButtress.rotation.x = -0.035;
    const backButtress = addBox(foundation, [0.72, 6.8, 1.05], [x, -6.3, -22.15], stone);
    backButtress.rotation.x = 0.035;
    addBox(foundation, [1.15, 0.55, 1.5], [x, -9.425, 14.38], lavaRock);
    addBox(foundation, [1.15, 0.55, 1.5], [x, -9.425, -22.38], lavaRock);
  }

  for (const z of [-20.25, -16.2, -12.15, -8.1, -4.05, 0, 4.1, 8.2, 12.25]) {
    const leftButtress = addBox(foundation, [1.05, 6.8, 0.72], [-17.65, -6.3, z], stone);
    leftButtress.rotation.z = 0.035;
    const rightButtress = addBox(foundation, [1.05, 6.8, 0.72], [17.65, -6.3, z], stone);
    rightButtress.rotation.z = -0.035;
    addBox(foundation, [1.5, 0.55, 1.15], [-17.88, -9.425, z], lavaRock);
    addBox(foundation, [1.5, 0.55, 1.15], [17.88, -9.425, z], lavaRock);
  }

  // Irregular volcanic rocks break up the mountain silhouette at the lava line.
  const cliff = new THREE.Group();
  cliff.position.y = -8.75;
  addRockCluster(cliff, -16.4, -21, 3.35, lavaRock, 511);
  addRockCluster(cliff, 16.3, -20.9, 3.5, lavaRock, 537);
  addRockCluster(cliff, -16.5, 12.9, 3.25, lavaRock, 563);
  addRockCluster(cliff, 16.4, 13, 3.1, lavaRock, 587);
  addRockCluster(cliff, 0, -21.4, 3.0, lavaRock, 613);
  addRockCluster(cliff, 0.3, 13.35, 2.85, lavaRock, 641);
  foundation.add(cliff);

  // Natural rock pillars rise out of the lava and visibly carry the front edge.
  addLavaSupportRocks(foundation, lavaRock);

  const slopeRocks = new THREE.Group();
  slopeRocks.position.y = -6.25;
  addRockCluster(slopeRocks, -15.8, -16.8, 2.75, lavaRock, 677);
  addRockCluster(slopeRocks, 15.6, -16.5, 2.9, lavaRock, 701);
  addRockCluster(slopeRocks, -16, 8.7, 2.65, lavaRock, 727);
  addRockCluster(slopeRocks, 15.7, 8.9, 2.5, lavaRock, 751);
  foundation.add(slopeRocks);

  // Landscape the broad outer bands while preserving the gate-to-hall sightline.
  const plateauRocks = [
    [-37, -20, 2.3, 811], [-29, -8, 1.8, 823], [-38, 8, 2.05, 839], [-29, 20, 1.7, 853],
    [37, -19, 2.2, 877], [29, -6, 1.75, 881], [38, 9, 2.0, 907], [30, 20, 1.8, 919],
  ] as Array<[number, number, number, number]>;
  for (const [x, z, scale, seed] of plateauRocks) {
    const cluster = addRockCluster(foundation, x, z, scale, rock, seed);
    cluster.position.y = -0.42;
  }

  // A contiguous canopy of tall instanced pines fills both outer land bands.
  addAshForest(foundation, 110, 28, 64);
  for (const [x, z, scale, seed] of [
    [-31, -13, 1.25, 7103],
    [-25, 8, 1.05, 7151],
    [-34, 18, 1.18, 7193],
    [29, -16, 1.3, 7247],
    [24, 7, 1.08, 7283],
    [35, 16, 1.2, 7331],
  ] as Array<[number, number, number, number]>) {
    addBurningTree(foundation, x, z, scale, seed);
  }

  for (const side of [-1, 1]) {
    // Smaller boulder fields break up the tree line and create natural clearings.
    for (let index = 0; index < 4; index += 1) {
      const seed = 1709 + index * 53 + (side > 0 ? 277 : 0);
      const x = side * (24 + seededRandom(seed) * 14);
      const z = -17 + seededRandom(seed + 17) * 34;
      const cluster = addRockCluster(foundation, x, z, 0.8 + seededRandom(seed + 31) * 0.65, rock, seed);
      cluster.position.y = -0.42;
    }
  }

  for (const [x, z, scale] of [
    [-40, -8, 1.0], [-31, 5, 0.82], [-23, 20, 0.9],
    [40, -7, 0.95], [31, 6, 0.86], [23, 20, 0.92],
  ] as Array<[number, number, number]>) addDeadTree(foundation, x, -0.48, z, scale);

  for (const [x, z, scale, seed] of [
    [-35, -4, 1.8, 1013], [-26, 8, 1.45, 1019], [-39, 17, 1.6, 1021],
    [35, -3, 1.7, 1031], [26, 9, 1.5, 1039], [39, 18, 1.55, 1049],
  ] as Array<[number, number, number, number]>) {
    addCrimsonGrowth(foundation, x, -0.44, z, scale, seed);
  }

  // Animated lava cascades emerge from cracks in the castle foundation. The
  // front pair frames the entrance while the side vents remain visible when
  // orbiting around the citadel.
  addLavaFall(foundation, [-10.5, -0.38, 27.25], 2.6, 9.25, 4513, 0, 3.0);
  addLavaFall(foundation, [10.8, -0.38, 27.25], 2.25, 9.25, 4547, 0, 3.0);
  addLavaFall(foundation, [-45.15, -0.42, -5.5], 2.3, 9.2, 4579, -Math.PI / 2, 2.2);
  addLavaFall(foundation, [45.15, -0.42, 4.5], 2.55, 9.2, 4603, Math.PI / 2, 2.2);

  parent.add(foundation);
}

function addCastleForecourt(
  parent: THREE.Object3D,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const forecourt = new THREE.Group();
  const courtZ = 17.5;
  const courtWidth = 24;
  const courtDepth = 10;

  // The paved court sits directly on the flat summit of the shared plateau.
  addBox(forecourt, [courtWidth, 0.78, courtDepth], [0, -0.16, courtZ], stone);

  // Large alternating slabs make the scale of the open court readable from above.
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      addBox(
        forecourt,
        [2.05, 0.08, 1.72],
        [-9.45 + column * 2.1, 0.27, 13.3 + row * 1.78],
        (row + column) % 2 ? stone : darkStone,
      );
    }
  }

  for (const x of [-11.72, 11.72]) {
    addBox(forecourt, [0.4, 0.82, courtDepth], [x, 0.4, courtZ], stone);
    addBattlements(forecourt, courtDepth - 0.3, x, 1.03, courtZ, false, stone);
  }

  // The outer parapet is split in the middle so the bridge enters the court directly.
  for (const x of [-7.6, 7.6]) {
    addBox(forecourt, [7.2, 0.82, 0.4], [x, 0.4, 22.32], stone);
    addBattlements(forecourt, 6.95, x, 1.03, 22.32, true, stone);
  }

  for (const x of [-10.3, 10.3]) {
    addStatue(forecourt, x, 0.24, 13.2, x < 0 ? 0.45 : -0.45, stone, 0.72);
    addTorch(forecourt, x, 1.05, 21.15, 0.74, true);
  }
  for (const x of [-4.8, 4.8]) addSpire(forecourt, x, 0.25, 22.15, 0.48, stone, roof);

  parent.add(setShadow(forecourt));
}

function addSquareCastleTower(
  parent: THREE.Object3D,
  x: number,
  z: number,
  height: number,
  size: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
  roofed = false,
) {
  const tower = new THREE.Group();
  tower.position.set(x, 0, z);

  addBox(tower, [size + 0.35, 0.55, size + 0.35], [0, 0.28, 0], darkStone);
  addBox(tower, [size, height, size], [0, height / 2 + 0.5, 0], stone);
  addBox(tower, [size + 0.28, 0.35, size + 0.28], [0, height + 0.42, 0], darkStone);

  if (roofed) {
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(size * 0.78, 3.3, 4), roof);
    roofMesh.position.y = height + 2.18;
    roofMesh.rotation.y = Math.PI / 4;
    tower.add(roofMesh);
    addSpire(tower, 0, height + 3.55, 0, 0.34, stone, roof);
  } else {
    addBattlements(tower, size - 0.2, 0, height + 0.82, size / 2, true, stone);
    addBattlements(tower, size - 0.2, 0, height + 0.82, -size / 2, true, stone);
    addBattlements(tower, size - 0.2, size / 2, height + 0.82, 0, false, stone);
    addBattlements(tower, size - 0.2, -size / 2, height + 0.82, 0, false, stone);
  }

  addGothicWindow(tower, 0, height * 0.64, size / 2 + 0.012, 0, 0.52);
  addGothicWindow(tower, size / 2 + 0.012, height * 0.64, 0, Math.PI / 2, 0.52);
  parent.add(setShadow(tower));
  return tower;
}

function addGothicWatchtower(
  parent: THREE.Object3D,
  x: number,
  z: number,
  height: number,
  radius: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const tower = new THREE.Group();
  tower.position.set(x, 0, z);

  const footing = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.28, radius * 1.42, 1.05, 12), darkStone);
  footing.position.y = 0.52;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, height, 12), stone);
  shaft.position.y = height / 2 + 0.72;
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.12, 0.52, 12), darkStone);
  balcony.position.y = height + 0.72;
  tower.add(footing, shaft, balcony);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const merlon = addBox(
      tower,
      [0.42, 0.62, 0.34],
      [Math.sin(angle) * radius * 1.1, height + 1.18, Math.cos(angle) * radius * 1.1],
      stone,
    );
    merlon.rotation.y = angle;
  }

  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.28, 4.5, 12), roof);
  roofMesh.position.y = height + 3.25;
  tower.add(roofMesh);
  addSpire(tower, 0, height + 5.35, 0, 0.34, stone, roof);

  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    addGothicWindow(
      tower,
      Math.sin(angle) * (radius + 0.015),
      height * 0.58,
      Math.cos(angle) * (radius + 0.015),
      angle,
      0.46,
    );
  }

  // Four shallow radial buttresses give the cylindrical shaft a fortified Gothic base.
  for (const angle of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
    const buttress = addBox(
      tower,
      [0.42, height * 0.48, 0.72],
      [Math.sin(angle) * radius * 1.02, height * 0.24 + 0.55, Math.cos(angle) * radius * 1.02],
      darkStone,
    );
    buttress.rotation.y = angle;
  }

  parent.add(setShadow(tower));
  return tower;
}

function addCentralGothicTower(
  parent: THREE.Object3D,
  x: number,
  z: number,
  height: number,
  size: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const tower = new THREE.Group();
  tower.position.set(x, 0, z);

  addBox(tower, [size + 0.8, 0.8, size + 0.8], [0, 0.4, 0], darkStone);
  addBox(tower, [size, height, size], [0, height / 2 + 0.72, 0], stone);
  addBox(tower, [size + 0.42, 0.42, size + 0.42], [0, height * 0.48, 0], darkStone);
  addBox(tower, [size + 0.56, 0.48, size + 0.56], [0, height + 0.78, 0], darkStone);

  const frontZ = size / 2 + 0.03;
  addVisibleChamber(tower, 0, 4.2, frontZ, stone, darkStone, 1.18, "hall");
  addVisibleChamber(tower, 0, 10.2, frontZ, stone, darkStone, 1.06, "hall");
  addRoseWindow(tower, 0, 15.8, frontZ + 0.02, 1.02, stone);
  for (const side of [-1, 1]) {
    addGothicWindow(tower, side * (size / 2 + 0.02), 7.0, 0.8, side * Math.PI / 2, 0.52);
    addGothicWindow(tower, side * (size / 2 + 0.02), 13.2, -0.8, side * Math.PI / 2, 0.48);
    addBanner(tower, side * 2.05, 10.8, frontZ + 0.08, 0, 0.9);
  }

  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      addBox(
        tower,
        [0.52, height * 0.7, 0.66],
        [sideX * (size / 2 + 0.15), height * 0.35 + 0.72, sideZ * (size / 2 + 0.08)],
        darkStone,
      );
      addSpire(tower, sideX * (size / 2 + 0.08), height + 0.8, sideZ * (size / 2 + 0.08), 0.52, stone, roof);
    }
  }

  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(size * 0.76, 9.2, 4), roof);
  roofMesh.position.y = height + 5.35;
  roofMesh.rotation.y = Math.PI / 4;
  tower.add(roofMesh);
  addSpire(tower, 0, height + 9.75, 0, 0.46, stone, roof);

  parent.add(setShadow(tower));
  return tower;
}

function addArrowSlit(parent: THREE.Object3D, x: number, y: number, z: number, rotationY = 0) {
  const slit = new THREE.Group();
  slit.position.set(x, y, z);
  slit.rotation.y = rotationY;
  const recess = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.92),
    new THREE.MeshBasicMaterial({ color: 0x09080b, side: THREE.DoubleSide }),
  );
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.13, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x56505a, roughness: 0.9 }),
  );
  lintel.position.set(0, 0.51, 0.025);
  slit.add(recess, lintel);
  parent.add(slit);
  return slit;
}

function addVisibleChamber(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  scale = 1,
  roomType: "hall" | "library" | "quarters" = "hall",
) {
  const room = new THREE.Group();
  room.position.set(x, y, z);

  const width = 1.65 * scale;
  const shoulder = 1.35 * scale;
  const peak = 2.05 * scale;
  const openingShape = new THREE.Shape();
  openingShape.moveTo(-width / 2, 0);
  openingShape.lineTo(-width / 2, shoulder);
  openingShape.lineTo(0, peak);
  openingShape.lineTo(width / 2, shoulder);
  openingShape.lineTo(width / 2, 0);
  openingShape.closePath();

  const chamberGlow = new THREE.MeshStandardMaterial({
    color: roomType === "library" ? 0x24120d : 0x32140c,
    emissive: roomType === "quarters" ? 0x7d1d08 : 0xb4370b,
    emissiveIntensity: roomType === "quarters" ? 0.55 : 0.82,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const opening = new THREE.Mesh(new THREE.ShapeGeometry(openingShape), chamberGlow);
  opening.position.z = 0.018;
  room.add(opening);

  // Thick jambs, sill and angled lintels make the room read as a deep opening.
  for (const side of [-1, 1]) {
    addBox(room, [0.2 * scale, shoulder, 0.34 * scale], [side * (width / 2 + 0.06 * scale), shoulder / 2, 0.16 * scale], stone);
    const lintel = addBox(room, [1.08 * scale, 0.2 * scale, 0.34 * scale], [side * 0.37 * scale, 1.7 * scale, 0.16 * scale], stone);
    lintel.rotation.z = side * -0.61;
  }
  addBox(room, [width + 0.35 * scale, 0.2 * scale, 0.52 * scale], [0, 0.03, 0.22 * scale], darkStone);

  const wood = new THREE.MeshStandardMaterial({ color: 0x3b2118, roughness: 0.72, metalness: 0.04 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x17151a, roughness: 0.38, metalness: 0.72 });
  if (roomType === "library") {
    for (const shelfY of [0.42, 0.76, 1.1]) addBox(room, [1.12 * scale, 0.07 * scale, 0.08], [0, shelfY * scale, 0.055], wood);
    for (const shelfX of [-0.52, 0, 0.52]) addBox(room, [0.055 * scale, 1.02 * scale, 0.08], [shelfX * scale, 0.74 * scale, 0.06], wood);
  } else if (roomType === "quarters") {
    addBox(room, [0.95 * scale, 0.18 * scale, 0.46 * scale], [0, 0.3 * scale, 0.25 * scale], wood);
    addBox(room, [0.12 * scale, 0.5 * scale, 0.12 * scale], [-0.36 * scale, 0.12 * scale, 0.25 * scale], wood);
    addBox(room, [0.12 * scale, 0.5 * scale, 0.12 * scale], [0.36 * scale, 0.12 * scale, 0.25 * scale], wood);
  } else {
    addBox(room, [1.05 * scale, 0.13 * scale, 0.42 * scale], [0, 0.48 * scale, 0.24 * scale], wood);
    for (const tableX of [-0.4, 0.4]) addBox(room, [0.1 * scale, 0.48 * scale, 0.1 * scale], [tableX * scale, 0.24 * scale, 0.24 * scale], wood);
    const brazier = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scale, 8, 6), metal);
    brazier.position.set(0, 1.16 * scale, 0.2 * scale);
    room.add(brazier);
  }

  parent.add(setShadow(room));
  return room;
}

function addCourtyardGallery(
  parent: THREE.Object3D,
  side: -1 | 1,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const gallery = new THREE.Group();
  gallery.position.set(side * 7.1, 0, 6.2);
  const innerX = -side * 0.94;
  const outerX = side * 0.94;

  addBox(gallery, [2.05, 0.22, 5.15], [0, 0.55, 0], darkStone);
  addBox(gallery, [0.28, 2.85, 5.15], [outerX, 1.93, 0], darkStone);
  addBox(gallery, [2.15, 0.24, 5.35], [0, 3.35, 0], roof).rotation.z = side * 0.11;
  addBox(gallery, [0.24, 0.28, 5.3], [innerX, 3.12, 0], stone);

  // Open arcade creates a readable circulation layer around the inner court.
  for (const z of [-2.35, -1.18, 0, 1.18, 2.35]) {
    addBox(gallery, [0.3, 2.6, 0.3], [innerX, 1.84, z], stone);
    addBox(gallery, [0.52, 0.22, 0.52], [innerX, 0.66, z], darkStone);
  }
  for (const z of [-1.75, 0, 1.75]) {
    addCastleDoor(gallery, outerX - side * 0.03, 0.59, z, -side * Math.PI / 2, 0.43);
  }

  // Benches, a long work table and roof beams distinguish the arcade from a bare wall.
  const wood = new THREE.MeshStandardMaterial({ color: 0x352019, roughness: 0.78 });
  addBox(gallery, [1.1, 0.12, 2.35], [side * 0.12, 1.02, 0], wood);
  for (const z of [-0.92, 0.92]) addBox(gallery, [0.82, 0.48, 0.12], [side * 0.12, 0.78, z], wood);
  for (const z of [-2.0, -1.0, 0, 1.0, 2.0]) addBox(gallery, [1.92, 0.12, 0.16], [0, 3.08, z], darkStone);
  addTorch(gallery, outerX - side * 0.2, 2.35, -0.58, 0.5, false);
  addTorch(gallery, outerX - side * 0.2, 2.35, 0.58, 0.5, false);

  parent.add(setShadow(gallery));
  return gallery;
}

function addTownHouse(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  rotationY: number,
  seed: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  house.rotation.y = rotationY;
  const timber = new THREE.MeshStandardMaterial({
    color: seed % 2 ? 0x3a241d : 0x2b1d1a,
    roughness: 0.86,
  });
  const plaster = new THREE.MeshStandardMaterial({
    color: seed % 3 ? 0x65564d : 0x574c49,
    roughness: 0.94,
  });

  // Stone shop floor with a slightly overhanging timber residence above it.
  addBox(house, [width, 1.55, depth], [0, 1.25, 0], stone);
  addBox(house, [width + 0.24, height - 1.35, depth + 0.18], [0, 1.55 + (height - 1.35) / 2, 0], plaster);
  addBox(house, [width + 0.38, 0.18, depth + 0.32], [0, 1.62, 0], darkStone);

  // Exposed beams make each small building readable as an individual town house.
  for (const beamX of [-width * 0.42, 0, width * 0.42]) {
    addBox(house, [0.1, height - 1.5, 0.12], [beamX, 1.72 + (height - 1.5) / 2, depth / 2 + 0.12], timber);
  }
  addBox(house, [width + 0.12, 0.1, 0.13], [0, height - 0.52, depth / 2 + 0.12], timber);
  addBox(house, [width + 0.12, 0.1, 0.13], [0, height - 1.42, depth / 2 + 0.12], timber);

  addGableRoof(house, width + 0.58, depth + 0.52, 1.9, height, roof);

  addBox(house, [0.62, 1.08, 0.1], [-width * 0.23, 1.02, depth / 2 + 0.08], timber);
  addBox(house, [0.78, 0.13, 0.18], [-width * 0.23, 1.6, depth / 2 + 0.1], darkStone);
  addGothicWindow(house, width * 0.23, 1.18, depth / 2 + 0.075, 0, 0.34);
  addGothicWindow(house, 0, height - 0.92, depth / 2 + 0.105, 0, 0.3);

  const chimneyX = seed % 2 ? -width * 0.3 : width * 0.3;
  addBox(house, [0.36, 1.8, 0.42], [chimneyX, height + 1.15, -depth * 0.18], darkStone);
  addBox(house, [0.5, 0.16, 0.56], [chimneyX, height + 2.04, -depth * 0.18], stone);

  parent.add(setShadow(house));
  return house;
}

function addTownChapel(
  parent: THREE.Object3D,
  x: number,
  z: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const chapel = new THREE.Group();
  chapel.position.set(x, 0, z);
  addBox(chapel, [3.0, 4.0, 3.2], [0, 2.45, 0], darkStone);
  addBox(chapel, [3.25, 0.22, 3.45], [0, 0.5, 0], stone);

  addGableRoof(chapel, 3.65, 3.75, 2.8, 4.45, roof);

  addBox(chapel, [1.25, 5.15, 1.35], [0, 3.0, 1.42], stone);
  const bellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.1, 4), roof);
  bellRoof.position.set(0, 6.55, 1.42);
  bellRoof.rotation.y = Math.PI / 4;
  chapel.add(bellRoof);
  addSpire(chapel, 0, 7.4, 1.42, 0.27, stone, roof);
  addCastleDoor(chapel, 0, 0.5, 1.7, 0, 0.62);
  addGothicWindow(chapel, 0, 3.76, 1.805, 0, 0.44);
  addGothicWindow(chapel, 1.51, 2.7, -0.35, Math.PI / 2, 0.38);
  parent.add(setShadow(chapel));
  return chapel;
}

function addMarketStall(
  parent: THREE.Object3D,
  x: number,
  z: number,
  rotationY: number,
  darkStone: THREE.Material,
  seed: number,
) {
  const stall = new THREE.Group();
  stall.position.set(x, 0, z);
  stall.rotation.y = rotationY;
  const wood = new THREE.MeshStandardMaterial({ color: 0x39231a, roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({
    color: seed % 2 ? 0x721724 : 0x8b3b1c,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  for (const postX of [-0.68, 0.68]) {
    for (const postZ of [-0.42, 0.42]) addBox(stall, [0.09, 1.55, 0.09], [postX, 1.23, postZ], wood);
  }
  addBox(stall, [1.55, 0.13, 1.0], [0, 1.05, 0], wood);
  const canopy = addBox(stall, [1.75, 0.1, 1.18], [0, 2.03, 0], cloth);
  canopy.rotation.z = seed % 2 ? 0.08 : -0.08;
  for (const itemX of [-0.45, 0, 0.45]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.3), itemX === 0 ? darkStone : wood);
    crate.position.set(itemX, 1.25, 0);
    stall.add(crate);
  }
  parent.add(setShadow(stall));
  return stall;
}

function addTownWell(
  parent: THREE.Object3D,
  x: number,
  z: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const well = new THREE.Group();
  well.position.set(x, 0, z);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.62, 12), stone);
  basin.position.y = 0.76;
  const opening = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 12), darkStone);
  opening.position.y = 1.09;
  well.add(basin, opening);
  for (const side of [-1, 1]) addBox(well, [0.14, 1.8, 0.14], [side * 0.73, 1.5, 0], darkStone);
  addBox(well, [1.72, 0.16, 0.18], [0, 2.34, 0], stone);
  const cover = new THREE.Mesh(new THREE.ConeGeometry(1, 0.72, 4), roof);
  cover.position.y = 2.66;
  cover.rotation.y = Math.PI / 4;
  cover.scale.z = 0.72;
  well.add(cover);
  parent.add(setShadow(well));
  return well;
}

function addResidentialWing(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  depth: number,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
) {
  const wing = new THREE.Group();
  wing.position.set(x, 0, z);
  const height = x < 0 ? 12.9 : 11.4;

  addBox(wing, [width, height, depth], [0, height / 2 + 0.48, 0], darkStone);
  addBox(wing, [width + 0.28, 0.24, depth + 0.28], [0, 6.3, 0], stone);
  addBox(wing, [width + 0.38, 0.32, depth + 0.38], [0, height + 0.42, 0], stone);

  // A steep gabled roof replaces the flat barracks silhouette.
  addGableRoof(wing, width + 0.78, depth + 0.72, 4.1, height + 0.58, roof);

  // Tall paired lancets emphasize the vertical Gothic facade.
  for (const slitX of [-width * 0.27, width * 0.25]) {
    addGothicWindow(wing, slitX, 2.2, depth / 2 + 0.025, 0, 0.55);
    addGothicWindow(wing, slitX, 7.25, depth / 2 + 0.025, 0, 0.62);
  }
  addArrowSlit(wing, x < 0 ? width * 0.18 : -width * 0.2, height - 2.1, depth / 2 + 0.016);
  addCastleDoor(wing, 0, 0.5, depth / 2 + 0.04, 0, 0.52);
  for (const side of [-1, 1]) {
    addArrowSlit(wing, side * (width / 2 + 0.016), 4.1, -depth * 0.2, side * Math.PI / 2);
    addArrowSlit(wing, side * (width / 2 + 0.016), height - 2.35, depth * 0.2, side * Math.PI / 2);

    // Deep buttresses visually carry the weight of the upper fighting platform.
    for (const buttressZ of [-depth * 0.36, depth * 0.36]) {
      addBox(wing, [0.48, height * 0.82, 0.72], [side * (width / 2 + 0.18), height * 0.41 + 0.48, buttressZ], stone);
      addBox(wing, [0.68, 0.42, 0.96], [side * (width / 2 + 0.2), 0.69, buttressZ], darkStone);
    }
  }

  // One slender round turret breaks the residential symmetry.
  addGothicWatchtower(
    wing,
    x < 0 ? -width * 0.34 : width * 0.34,
    -depth * 0.32,
    height + 2.1,
    1.15,
    stone,
    darkStone,
    roof,
  );

  parent.add(setShadow(wing));
  return wing;
}

function buildFortress(
  root: THREE.Group,
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
  rock: THREE.Material,
  lavaRock: THREE.Material,
) {
  const fortress = new THREE.Group();
  // The complete citadel, plateau and forest sit four bridge bays farther back;
  // the extended deck still meets the forecourt at world X = 32.
  fortress.position.set(54.5, 5, 0);
  // Turn the complete front facade towards the bridge while keeping the gate,
  // courtyard path and keep aligned as one architectural composition.
  fortress.rotation.y = -Math.PI / 2;
  addCastleFoundation(fortress, stone, darkStone, rock, lavaRock);
  addCastleForecourt(fortress, stone, darkStone, roof);
  addBox(fortress, [35, 0.9, 35.5], [0, -0.15, -4], stone);
  addBox(fortress, [35.6, 1.3, 36.1], [0, -0.85, -4], darkStone);

  // Taller curtain walls give the outer defensive ring a more imposing silhouette.
  const curtainWallHeight = 10.3;
  const curtainWallCenterY = 0.205 + curtainWallHeight / 2;
  const curtainWallTrimY = 0.205 + curtainWallHeight + 0.065;
  const curtainWallBattlementY = curtainWallTrimY + 0.42;
  for (const z of [-20.65, 12.65]) {
    addBox(fortress, [32.2, curtainWallHeight, 0.82], [0, curtainWallCenterY, z], darkStone);
    addBox(fortress, [32.4, 0.3, 1.02], [0, curtainWallTrimY, z], stone);
    addBattlements(fortress, 32.1, 0, curtainWallBattlementY, z, true, stone);
  }
  for (const x of [-16.72, 16.72]) {
    addBox(fortress, [0.82, curtainWallHeight, 30.3], [x, curtainWallCenterY, -4], darkStone);
    addBox(fortress, [1.02, 0.3, 30.5], [x, curtainWallTrimY, -4], stone);
    addBattlements(fortress, 30.2, x, curtainWallBattlementY, -4, false, stone);
  }

  // Repeated exterior buttresses reproduce the strong vertical rhythm of the reference walls.
  for (const z of [-20.65, 12.65]) {
    const outwardZ = z + (z > 0 ? 0.64 : -0.64);
    for (const x of [-12.4, -8.3, -4.2, 4.2, 8.3, 12.4]) {
      addBox(fortress, [0.48, 8.8, 1.08], [x, 4.6, outwardZ], stone);
      addBox(fortress, [0.72, 0.55, 1.42], [x, 0.78, outwardZ + (z > 0 ? 0.12 : -0.12)], darkStone);
    }
  }
  for (const x of [-16.72, 16.72]) {
    const outwardX = x + (x > 0 ? 0.64 : -0.64);
    for (const z of [-15.8, -10.8, -5.8, -0.8, 4.2, 9.2]) {
      addBox(fortress, [1.08, 8.8, 0.48], [outwardX, 4.6, z], stone);
      addBox(fortress, [1.42, 0.55, 0.72], [outwardX + (x > 0 ? 0.12 : -0.12), 0.78, z], darkStone);
    }
  }

  // Four corner towers establish the classic castle silhouette.
  for (const [x, z] of [[-16.45, -20.45], [-16.45, 12.45], [16.45, -20.45], [16.45, 12.45]] as const) {
    addGothicWatchtower(fortress, x, z, 14.6, 2.45, stone, darkStone, roof);
  }
  // Mid-wall watchtowers break the long city wall into defended sections.
  addGothicWatchtower(fortress, -16.45, -4.2, 12.4, 1.9, stone, darkStone, roof);
  addGothicWatchtower(fortress, 16.45, -4.2, 12.4, 1.9, stone, darkStone, roof);
  addGothicWatchtower(fortress, 0, -20.45, 13.4, 2.1, stone, darkStone, roof);

  // The only main entrance projects from the front facade, now facing the bridge.
  addCastleGatehouse(fortress, 0, 13.05, stone, darkStone, roof);
  for (const x of [-12.2, -9.4, 9.4, 12.2]) {
    addGothicWindow(fortress, x, 5.6, 13.08, 0, 0.46);
  }
  addBanner(fortress, -6.7, 7.2, 13.1, 0, 0.94);
  addBanner(fortress, 6.7, 7.2, 13.1, 0, 0.94);

  // The great hall anchors the rear of the castle and terminates the processional axis.
  const keep = new THREE.Group();
  keep.position.set(0, 0, -14.1);
  const hallWidth = 18;
  const hallDepth = 8.6;
  const hallHeight = 12.7;
  addBox(keep, [hallWidth, hallHeight, hallDepth], [0, 6.755, 0], darkStone);
  addBox(keep, [hallWidth + 0.4, 0.38, hallDepth + 0.4], [0, 13.13, 0], stone);
  addGableRoof(keep, hallWidth + 0.75, hallDepth + 0.8, 5.2, 13.32, roof);

  // A broad, symmetrical facade faces the gate across the now-open inner court.
  for (const x of [-6.2, -3.15, 3.15, 6.2]) {
    addVisibleChamber(keep, x, 0.72, hallDepth / 2 + 0.025, stone, darkStone, 0.98, "hall");
  }
  addCastleDoor(keep, 0, 0.5, hallDepth / 2 + 0.08, 0, 1.3);
  addVisibleChamber(keep, -5.2, 7.05, hallDepth / 2 + 0.025, stone, darkStone, 0.9, "library");
  addVisibleChamber(keep, 5.2, 7.05, hallDepth / 2 + 0.025, stone, darkStone, 0.9, "quarters");
  addRoseWindow(keep, 0, 9.72, hallDepth / 2 + 0.04, 1.18, stone);
  addBox(keep, [15.2, 0.2, 0.68], [0, 6.79, hallDepth / 2 + 0.2], stone);
  for (const x of [-6.2, -3.15, 0, 3.15, 6.2]) {
    addBox(keep, [0.16, 0.62, 0.16], [x, 7.06, hallDepth / 2 + 0.47], darkStone);
  }
  for (const z of [-2.8, 0, 2.8]) {
    addArrowSlit(keep, hallWidth / 2 + 0.02, 4.2, z, Math.PI / 2);
    addArrowSlit(keep, hallWidth / 2 + 0.02, 9.6, z, Math.PI / 2);
  }

  addCentralGothicTower(keep, 0, -1.15, 22.5, 6.2, stone, darkStone, roof);
  for (const side of [-1, 1]) {
    addGothicWatchtower(keep, side * 7.15, 3.15, 16.5, 1.45, stone, darkStone, roof);
    addBanner(keep, side * 7.15, 9.15, 4.62, 0, 0.9);
  }
  for (const [x, z] of [[-8.1, -3.65], [-8.1, 3.65], [8.1, -3.65], [8.1, 3.65]] as const) {
    addSpire(keep, x, 13.07, z, 0.66, stone, roof);
  }
  addTorch(keep, -7.55, 1.05, hallDepth / 2 + 0.1, 0.66, true);
  addTorch(keep, 7.55, 1.05, hallDepth / 2 + 0.1, 0.66, true);
  fortress.add(keep);

  // Asymmetrical fortified barracks add rooms without softening the citadel silhouette.
  addResidentialWing(fortress, -12.8, -0.8, 4.15, 9.4, stone, darkStone, roof);
  addResidentialWing(fortress, 12.8, -0.8, 4.15, 9.4, stone, darkStone, roof);

  // Covered galleries connect the barracks, courtyard and central keep.
  addCourtyardGallery(fortress, -1, stone, darkStone, roof);
  addCourtyardGallery(fortress, 1, stone, darkStone, roof);

  // Service buildings stay against the side walls, leaving the rear hall and
  // the complete ceremonial axis unobstructed.
  addTownChapel(fortress, -12.6, -11.8, stone, darkStone, roof);
  const townLots = [
    [-12.2, -7.8, 2.25, 2.05, 3.45, Math.PI, 11],
    [12.2, -7.85, 2.3, 2.0, 3.85, Math.PI, 29],
    [-12.35, -16.6, 2.3, 2.05, 3.65, 0, 61],
    [12.35, -16.55, 2.3, 2.05, 3.8, 0, 97],
  ] as Array<[number, number, number, number, number, number, number]>;
  for (const [x, z, width, depth, height, rotationY, seed] of townLots) {
    addTownHouse(fortress, x, z, width, depth, height, rotationY, seed, stone, darkStone, roof);
  }
  addTownHouse(fortress, -12.55, 8.6, 2.3, 2.15, 3.5, Math.PI / 2, 41, stone, darkStone, roof);
  addTownHouse(fortress, 12.55, 8.55, 2.35, 2.15, 3.85, -Math.PI / 2, 47, stone, darkStone, roof);

  // The processional path now runs without interruption from the gate to the rear hall.
  for (let step = 0; step < 29; step += 1) {
    addBox(fortress, [4.4, 0.12, 0.72], [0, 0.52, 11.7 - step * 0.74], step % 2 ? stone : darkStone);
  }
  addCircularRune(fortress, 0, 0.58, 5.8, 1.35);
  addCircularRune(fortress, 0, 0.58, -5.1, 1.2);
  addMarketStall(fortress, -3.35, 10.25, Math.PI / 2, darkStone, 53);
  addMarketStall(fortress, 3.35, 10.25, -Math.PI / 2, darkStone, 59);
  addTownWell(fortress, 4.25, 7.75, stone, darkStone, roof);
  addStatue(fortress, -4.25, 0.48, 7.75, 0.25, stone, 0.6);
  root.add(fortress);
}

function createVolcanicSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Color(0x120b10);

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#242532");
  gradient.addColorStop(0.42, "#343341");
  gradient.addColorStop(0.72, "#49323a");
  gradient.addColorStop(0.9, "#68281d");
  gradient.addColorStop(1, "#28151b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildScene() {
  const host = viewport.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.background = createVolcanicSkyTexture();
  // Fog tuyến tính chỉ bắt đầu ngoài vùng chơi chính. FogExp2 phụ thuộc mạnh
  // vào khoảng cách camera nên từng làm màu lâu đài đổi rõ rệt khi zoom ra.
  scene.fog = new THREE.Fog(0x302631, 180, 340);

  camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 300);
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.zoom = DEFAULT_CAMERA_ZOOM;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(getAdaptivePixelRatio(host.clientWidth, host.clientHeight));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(DEFAULT_CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.35;
  controls.minDistance = 24;
  controls.maxDistance = 160;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.19;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;

  const root = new THREE.Group();
  root.rotation.y = -0.18;
  scene.add(root);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x696872,
    roughness: 0.82,
    metalness: 0.05,
    bumpMap: createSurfaceBumpMap("masonry", 3.2, 3.2),
    bumpScale: 0.18,
  });
  const darkStone = new THREE.MeshStandardMaterial({
    color: 0x45434c,
    roughness: 0.9,
    metalness: 0.03,
    bumpMap: createSurfaceBumpMap("masonry", 3.8, 3.8),
    bumpScale: 0.16,
  });
  const roof = new THREE.MeshStandardMaterial({
    color: 0x202936,
    roughness: 0.64,
    metalness: 0.18,
    bumpMap: createSurfaceBumpMap("roof", 4.5, 2.5),
    bumpScale: 0.18,
  });
  const rock = new THREE.MeshStandardMaterial({
    color: 0x252229,
    roughness: 0.96,
    flatShading: true,
    bumpMap: createSurfaceBumpMap("rough", 3.5, 3.5),
    bumpScale: 0.38,
  });
  const lavaRock = new THREE.MeshStandardMaterial({
    // The final colour is height-blended in the shader: ordinary dark rock at
    // the top, heat-blackened basalt where the foundation meets the lava.
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    emissive: 0x260601,
    emissiveIntensity: 0.14,
    bumpMap: createSurfaceBumpMap("rough", 4.2, 4.2),
    bumpScale: 0.46,
  });
  lavaRock.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vLavaWorldY;",
      )
      .replace(
        "#include <project_vertex>",
        `vec4 lavaWorldPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
        lavaWorldPosition = instanceMatrix * lavaWorldPosition;
#endif
        vLavaWorldY = (modelMatrix * lavaWorldPosition).y;
#include <project_vertex>`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vLavaWorldY;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // World-space height keeps the transition consistent across the
        // castle cliff, bridge piers and the opposite plateau.
        float lavaProximity = 1.0 - smoothstep(-4.35, 1.4, vLavaWorldY);
        vec3 upperRock = vec3(0.145, 0.132, 0.155);
        vec3 cooledBasalt = vec3(0.040, 0.025, 0.027);
        diffuseColor.rgb *= mix(upperRock, cooledBasalt, lavaProximity);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float lavaHeat = 1.0 - smoothstep(-4.65, -2.15, vLavaWorldY);
        totalEmissiveRadiance *= lavaHeat;`,
      );
  };
  lavaRock.customProgramCacheKey = () => "height-blended-lava-rock-v1";

  lavaMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: lavaFragmentShader,
    uniforms: { uTime: { value: 0 } },
  });
  // Enough subdivisions for very shallow viscous swells; the displacement is
  // deliberately subtle so bridge footings remain seated at the lava line.
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(180, 120, 56, 34), lavaMaterial);
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = -4.7;
  root.add(lava);

  addOppositeLandmass(root, rock, lavaRock);
  addBridge(root, stone, darkStone, lavaRock);
  buildFortress(root, stone, darkStone, roof, rock, lavaRock);

  // These basalt clusters sit inside the lake rather than floating above it:
  // their lower mass is submerged, while only broken crowns pierce the opaque
  // lava skin. This also gives the bridge surroundings more physical depth.
  for (const [x, z, scale, seed] of [
    [-20, 10, 2.5, 201], [-11, 11, 2.2, 221], [21, 6, 3.4, 238], [19, -12, 3.1, 250], [8, 11, 2.1, 266], [-3, -10, 2.2, 279],
  ] as Array<[number, number, number, number]>) {
    const submergedCluster = addRockCluster(root, x, z, scale, lavaRock, seed);
    submergedCluster.position.y = -4.55 + seededRandom(seed + 83) * 0.32;
  }

  // Hundreds of individually-authored boxes share only a small set of
  // materials. Bake their world transforms and merge each material group so
  // the static architecture renders in a handful of draw calls.
  mergeStaticMeshes(root, scene);

  // Ánh trăng tím lạnh chỉ viền khối; nguồn cam ấm giữ đá ăn màu với dung nham
  // mà không nâng toàn bộ vật liệu lên xám trắng.
  scene.add(new THREE.HemisphereLight(0xa2a5ba, 0x351713, 0.88));
  const keyLight = new THREE.DirectionalLight(0xffc39d, 1.96);
  keyLight.position.set(-24, 38, 22);
  keyLight.target.position.set(10, 0, 0);
  keyLight.castShadow = true;
  // The atlas is generated only once, so doubling its resolution improves
  // static shadow edges without adding per-frame shadow rendering work.
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 150;
  keyLight.shadow.camera.left = -68;
  keyLight.shadow.camera.right = 68;
  keyLight.shadow.camera.top = 58;
  keyLight.shadow.camera.bottom = -58;
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.normalBias = 0.055;
  scene.add(keyLight, keyLight.target);

  const rimLight = new THREE.DirectionalLight(0x8a8fbf, 0.56);
  rimLight.position.set(34, 18, -32);
  scene.add(rimLight);

  // All shadow-casting architecture is static. Render its shadow atlas once
  // instead of rebuilding a large depth map on every animation frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const clock = new THREE.Clock();
  let lastRisingEmberUpdate = -1;
  const animate = () => {
    animationFrame = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    // Let requestAnimationFrame follow the display cadence. Comparing its
    // slightly jittery interval against an exact 1/60 previously skipped every
    // other callback on some 60 Hz displays, making the scene look like 30 FPS.
    const updateRisingEmbers = elapsed - lastRisingEmberUpdate >= 1 / 24;
    if (updateRisingEmbers) lastRisingEmberUpdate = elapsed;
    if (lavaMaterial) lavaMaterial.uniforms.uTime!.value = elapsed;
    lavaFlowMaterials.forEach((material) => {
      material.uniforms.uTime!.value = elapsed;
    });
    flames.forEach((flame) => {
      const pulse = 0.86 + Math.sin(elapsed * 8.5 + flame.phase) * 0.11 + Math.sin(elapsed * 15 + flame.phase) * 0.05;
      flame.mesh.scale.set(0.72 * pulse, 1.75 * (1.08 - pulse * 0.08), 0.72 * pulse);
      if (flame.light) flame.light.intensity = 10 + pulse * 5;
    });
    embers.forEach((cloud) => {
      if (cloud.userData.rising) {
        if (!updateRisingEmbers) return;
        const positions = cloud.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        const offsets = cloud.userData.emberOffsets as Float32Array;
        const phases = cloud.userData.emberPhases as Float32Array;
        const riseHeight = cloud.userData.riseHeight as number;
        const riseSpeed = cloud.userData.riseSpeed as number;
        const driftPhase = cloud.userData.driftPhase as number;
        for (let index = 0; index < positions.count; index += 1) {
          const life = (elapsed * riseSpeed + phases[index]!) % 1;
          const sway = Math.sin(elapsed * 1.35 + index * 1.71 + driftPhase)
            * life
            * 0.22;
          positions.setXYZ(
            index,
            offsets[index * 2]! + sway,
            0.55 + life * riseHeight,
            offsets[index * 2 + 1]! + Math.cos(elapsed + index) * life * 0.12,
          );
        }
        positions.needsUpdate = true;
        const material = cloud.material as THREE.PointsMaterial;
        material.opacity = 0.62 + Math.sin(elapsed * 2.1 + driftPhase) * 0.16;
      }
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
    renderer.setPixelRatio(getAdaptivePixelRatio(width, height));
    renderer.setSize(width, height, false);
  });
  resizeObserver.observe(host);
  loading.value = false;
}

function resetCamera() {
  if (!camera || !controls) return;
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.zoom = DEFAULT_CAMERA_ZOOM;
  camera.updateProjectionMatrix();
  controls.target.copy(DEFAULT_CAMERA_TARGET);
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
    if (scene.background instanceof THREE.Texture) scene.background.dispose();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
  renderer?.dispose();
  renderer?.domElement.remove();
  surfaceTextures.forEach((texture) => texture.dispose());
  surfaceTextures.length = 0;
  lavaFlowMaterials.length = 0;
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  flames.length = 0;
  embers.length = 0;
});
</script>

<template>
  <main class="citadel-page">
    <div ref="viewport" class="scene-viewport">
      <div class="vignette" aria-hidden="true" />

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

.vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.vignette { box-shadow: inset 0 0 130px 28px rgba(18, 25, 34, .34); }

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
  background: rgba(9, 7, 10, .9);
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
