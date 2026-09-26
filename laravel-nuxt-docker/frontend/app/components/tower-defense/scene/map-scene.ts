import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ENEMY_SPAWN_PROGRESS } from "~/games/tower-defense/gameplay-config";
import { mapPathPosition } from "~/games/tower-defense/map-path";
import type {
  GridPoint,
  TowerDefenseMapDefinition,
} from "~/types/games/towerDefense";

export interface TowerDefenseMapScene {
  tileMeshes: THREE.Mesh[];
  particles: THREE.Points;
  updatePortal: (elapsed: number) => void;
}

export interface TowerDefenseBackgroundLayer {
  group: THREE.Group;
  setVisible: (visible: boolean) => void;
}

/** Đổi tọa độ grid của một map sang hệ tọa độ world có tâm tại gốc scene. */
export function mapWorldPosition(map: TowerDefenseMapDefinition, x: number, y: number) {
  return new THREE.Vector3(
    (x - (map.columns - 1) / 2) * map.cellSize,
    0,
    (y - (map.rows - 1) / 2) * map.cellSize,
  );
}

function createMapMesh(surfaceDetail: THREE.DataTexture | null, geometry: THREE.BufferGeometry, color: number, options: { roughness?: number; emissive?: number; flatShading?: boolean } = {}) {
  const roughness = options.roughness ?? 0.8;
  const item = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.03,
    emissive: options.emissive ?? 0,
    emissiveIntensity: options.emissive ? 1.35 : 1,
    flatShading: options.flatShading ?? false,
    bumpMap: roughness > 0.5 ? surfaceDetail : null,
    bumpScale: roughness > 0.5 ? 0.012 : 0,
  }));
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function addFoundation(scene: THREE.Scene, map: TowerDefenseMapDefinition, surfaceDetail: THREE.DataTexture | null) {
  // Nền/grid phải vượt xa vùng camera có thể pan/orbit. Kích thước 120 trước
  // đây vẫn để lộ cạnh GridHelper như một đường chân trời ngang gần lâu đài.
  const terrainSize = Math.max(2000, map.columns * 20, map.rows * 20);
  const terrain = createMapMesh(surfaceDetail, new THREE.PlaneGeometry(terrainSize, terrainSize), map.theme.terrain, { roughness: 1 });
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.1;
  terrain.castShadow = false;
  const terrainGrid = new THREE.GridHelper(terrainSize, terrainSize, map.theme.gridCenter, map.theme.gridLine);
  terrainGrid.position.y = -0.085;
  const materials = Array.isArray(terrainGrid.material) ? terrainGrid.material : [terrainGrid.material];
  for (const material of materials) {
    material.transparent = true;
    // Grid chỉ đóng vai trò định hướng nền; để quá đậm sẽ xuyên qua và lấn át
    // portal, projectile cùng các quầng sáng additive ở gần mặt đất.
    material.opacity = 0.14;
    material.depthWrite = false;
  }
  scene.add(terrain, terrainGrid);
}

function addTiles(scene: THREE.Scene, map: TowerDefenseMapDefinition, surfaceDetail: THREE.DataTexture | null) {
  const pathKeys = new Set(map.pathTiles.map(point => `${point.x}:${point.y}`));
  const tiles: THREE.Mesh[] = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.columns; x++) {
    const isPath = pathKeys.has(`${x}:${y}`);
    const tileTone = (x * 7 + y * 11) % 4 === 0 ? map.theme.tileColors[0] : (x + y) % 3 === 0 ? map.theme.tileColors[1] : map.theme.tileColors[2];
    const tile = createMapMesh(surfaceDetail, new THREE.BoxGeometry(map.cellSize, isPath ? 0.1 : 0.15, map.cellSize), isPath ? map.theme.path : tileTone, { roughness: 1 });
    tile.position.copy(mapWorldPosition(map, x, y));
    tile.position.y = isPath ? -0.025 : 0;
    tile.userData.cell = { x, y };
    tiles.push(tile);
    scene.add(tile);
  }
  return tiles;
}

function addCobblestonePath(scene: THREE.Scene, map: TowerDefenseMapDefinition, surfaceDetail: THREE.DataTexture | null) {
  const stonesPerTile = 9;
  const geometry = new THREE.BoxGeometry(0.27 * map.cellSize, 0.025, 0.24 * map.cellSize);
  const material = new THREE.MeshStandardMaterial({ color: map.theme.pathStone, roughness: 0.92, metalness: 0.04, bumpMap: surfaceDetail, bumpScale: 0.014 });
  const stones = new THREE.InstancedMesh(geometry, material, map.pathTiles.length * stonesPerTile);
  const dummy = new THREE.Object3D();
  let instance = 0;
  for (let pathIndex = 0; pathIndex < map.pathTiles.length; pathIndex++) {
    const point = map.pathTiles[pathIndex]!;
    for (let stoneIndex = 0; stoneIndex < stonesPerTile; stoneIndex++) {
      const column = stoneIndex % 3;
      const row = Math.floor(stoneIndex / 3);
      const jitter = ((pathIndex * 17 + stoneIndex * 11) % 9 - 4) * 0.008;
      dummy.position.copy(mapWorldPosition(map, point.x + (column - 1) * 0.3 + jitter, point.y + (row - 1) * 0.29 - jitter));
      dummy.position.y = 0.0375;
      dummy.rotation.set(0, ((pathIndex + stoneIndex) % 3 - 1) * 0.035, 0);
      dummy.scale.set(0.96 + ((pathIndex + stoneIndex) % 3) * 0.025, 1, 0.96);
      dummy.updateMatrix();
      stones.setMatrixAt(instance++, dummy.matrix);
    }
  }
  stones.castShadow = true;
  stones.receiveShadow = true;
  stones.instanceMatrix.needsUpdate = true;
  scene.add(stones);
}

function spawnPortalPlacement(
  map: TowerDefenseMapDefinition,
  lane: 0 | 1,
) {
  const path = map.paths[lane];
  const pathStart = path[0]!;
  const configuredSpawnPoint = map.spawnPoints?.[lane];
  const spawnPoint = configuredSpawnPoint ?? pathStart;
  const entranceTarget = path.find(
    (point) => point.x !== spawnPoint.x || point.y !== spawnPoint.y,
  ) ?? pathStart;
  const direction = {
    x: entranceTarget.x - spawnPoint.x,
    y: entranceTarget.y - spawnPoint.y,
  };
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 0.001) {
    return { position: { ...spawnPoint }, direction };
  }
  // Điểm do admin chọn là tâm cổng và cũng là điểm sinh quái chính xác.
  if (configuredSpawnPoint) {
    return { position: { ...configuredSpawnPoint }, direction };
  }
  // Map seed không có spawnPoints nên đặt cả cổng lẫn điểm sinh quái lùi nhẹ
  // khỏi đầu lane, tạo cảm giác quân địch bước xuyên qua cổng vào chiến trường.
  return {
    position: {
      x:
        spawnPoint.x -
        (direction.x / length) * Math.abs(ENEMY_SPAWN_PROGRESS),
      y:
        spawnPoint.y -
        (direction.y / length) * Math.abs(ENEMY_SPAWN_PROGRESS),
    },
    direction,
  };
}

function addRouteLines(scene: THREE.Scene, map: TowerDefenseMapDefinition) {
  for (const lane of [0, 1] as const) {
    const path = map.paths[lane];
    const curve = new THREE.CurvePath<THREE.Vector3>();
    const sampleStep = 0.08;
    const lastProgress = path.length - 1;
    const routeEndProgress = lastProgress + map.castle.pathEndOffset;
    const at = (progress: number) => {
      const position = mapPathPosition(map, progress, lane);
      const world = mapWorldPosition(map, position.x, position.y);
      world.y = 0.105;
      return world;
    };
    const portalPlacement = spawnPortalPlacement(map, lane);
    let previous = mapWorldPosition(
      map,
      portalPlacement.position.x,
      portalPlacement.position.y,
    );
    previous.y = 0.105;
    const routeStartProgress = map.spawnPoints?.[lane] ? -1 : 0;
    for (let progress = routeStartProgress; progress < routeEndProgress; progress += sampleStep) {
      const next = at(Math.min(progress, routeEndProgress));
      curve.add(new THREE.LineCurve3(previous.clone(), next.clone()));
      previous = next;
    }
    curve.add(new THREE.LineCurve3(previous.clone(), at(routeEndProgress)));
    const segments = Math.ceil(routeEndProgress / sampleStep);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, 0.06 * map.cellSize, 8, false), new THREE.MeshBasicMaterial({ color: map.theme.routeColors[lane], transparent: true, opacity: 0.055, depthWrite: false, toneMapped: false }));
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, 0.018 * map.cellSize, 8, false), new THREE.MeshBasicMaterial({ color: map.theme.routeColors[lane], transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }));
    glow.renderOrder = 3;
    line.renderOrder = 4;
    scene.add(glow, line);
  }
}

function createPineTree(surfaceDetail: THREE.DataTexture | null) {
  const tree = new THREE.Group();
  const trunk = createMapMesh(surfaceDetail, new THREE.CylinderGeometry(0.1, 0.15, 0.85, 10), 0x493629, { roughness: 0.92 });
  trunk.position.y = 0.4;
  const layers = [
    [0.58, 1.05, 0x29452f, 1.02],
    [0.46, 0.9, 0x31563a, 1.48],
    [0.32, 0.72, 0x3b6542, 1.87],
  ] as const;
  tree.add(trunk);
  for (const [radius, height, color, y] of layers) {
    const layer = createMapMesh(surfaceDetail, new THREE.ConeGeometry(radius, height, 12), color, { roughness: 0.9 });
    layer.position.y = y;
    tree.add(layer);
  }
  return tree;
}

function createCrystalCluster(surfaceDetail: THREE.DataTexture | null, color: number) {
  const cluster = new THREE.Group();
  const stone = createMapMesh(surfaceDetail, new THREE.DodecahedronGeometry(0.24, 0), 0x41494b, { roughness: 0.9, flatShading: true });
  stone.position.y = 0.12;
  stone.scale.set(1.5, 0.55, 1.15);
  cluster.add(stone);
  for (let index = 0; index < 3; index++) {
    const crystal = createMapMesh(surfaceDetail, new THREE.OctahedronGeometry(0.15 - index * 0.025, 0), color, { emissive: color, roughness: 0.12, flatShading: true });
    crystal.position.set((index - 1) * 0.14, 0.31 + index * 0.055, index % 2 ? -0.05 : 0.04);
    crystal.scale.y = 1.8 - index * 0.2;
    crystal.rotation.z = (index - 1) * -0.2;
    cluster.add(crystal);
  }
  return cluster;
}

function createRuneStone(surfaceDetail: THREE.DataTexture | null) {
  const stone = new THREE.Group();
  const pillar = createMapMesh(surfaceDetail, new THREE.BoxGeometry(0.28, 0.82, 0.2, 2, 4, 2), 0x575c59, { roughness: 0.94 });
  pillar.position.y = 0.36;
  pillar.rotation.z = 0.035;
  const rune = createMapMesh(surfaceDetail, new THREE.TorusGeometry(0.075, 0.014, 6, 16), 0x8bd8cb, { emissive: 0x397f77, roughness: 0.2 });
  rune.position.set(0, 0.45, 0.11);
  const mark = createMapMesh(surfaceDetail, new THREE.BoxGeometry(0.018, 0.22, 0.018), 0x8bd8cb, { emissive: 0x397f77, roughness: 0.2 });
  mark.position.set(0, 0.45, 0.125);
  stone.add(pillar, rune, mark);
  return stone;
}

function addScenery(scene: THREE.Scene, map: TowerDefenseMapDefinition, surfaceDetail: THREE.DataTexture | null) {
  const edgeX = map.columns / 2 + 0.45;
  const edgeZ = map.rows / 2 - 0.75;
  for (const definition of map.scenery.trees) {
    const item = createPineTree(surfaceDetail);
    item.position.set(definition.x * edgeX * 2 * map.cellSize, -0.08, definition.y * edgeZ * 2 * map.cellSize);
    item.scale.setScalar(definition.scale);
    scene.add(item);
  }
  for (const definition of map.scenery.crystals) {
    const item = createCrystalCluster(surfaceDetail, definition.color);
    item.position.set(definition.x * edgeX * 2 * map.cellSize, -0.03, definition.y * edgeZ * 2 * map.cellSize);
    item.scale.setScalar(definition.scale ?? 1);
    scene.add(item);
  }
  for (const definition of map.scenery.runes) {
    const item = createRuneStone(surfaceDetail);
    item.position.set(definition.x * edgeX * 2 * map.cellSize, -0.08, definition.y * edgeZ * 2 * map.cellSize);
    item.rotation.y = definition.rotation;
    scene.add(item);
  }
}

function addSpawnPortal(scene: THREE.Scene, map: TowerDefenseMapDefinition) {
  const isLavaPortal = map.bossCombatProfileKey === "lava-boss";
  const portalColor = new THREE.Color(isLavaPortal ? 0xd93612 : 0x7040b8);
  const highlightColor = new THREE.Color(isLavaPortal ? 0xffa02c : 0x63b8e8);
  const portals: Array<{
    vortexMaterial: THREE.ShaderMaterial;
    matter: THREE.Points;
    matterPositions: THREE.BufferAttribute;
    matterLife: THREE.BufferAttribute;
    light: THREE.PointLight;
  }> = [];

  for (const lane of [0, 1] as const) {
    const portal = new THREE.Group();
    portal.name = `enemySpawnPortal-${lane}`;
    const vortexMaterial = new THREE.ShaderMaterial({
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uOuterColor: { value: portalColor },
        uInnerColor: { value: highlightColor },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uOuterColor;
        uniform vec3 uInnerColor;
        varying vec2 vUv;

        void main() {
          // Tâm xoáy dịch chuyển rất nhẹ để silhouette không cân tuyệt đối.
          vec2 point = vUv - vec2(0.5) + vec2(
            sin(uTime * 0.41) * 0.014,
            cos(uTime * 0.33 + 0.8) * 0.011
          );
          float radius = length(point) * 2.0;
          float angle = atan(point.y, point.x);

          // Nhiều lớp sóng có tốc độ khác nhau làm biên portal biến dạng
          // liên tục, tránh silhouette tròn đều như một tấm đĩa.
          float angularDrift = sin(uTime * 0.74) * 0.38;
          float morphCycle = uTime * 0.9;
          float fiveLobeWeight = pow(
            0.5 + 0.5 * cos(morphCycle),
            3.0
          );
          float sixLobeWeight = pow(
            0.5 + 0.5 * cos(morphCycle - 2.094),
            3.0
          );
          float manyLobeWeight = pow(
            0.5 + 0.5 * cos(morphCycle - 4.188),
            3.0
          );
          float totalShapeWeight =
            fiveLobeWeight + sixLobeWeight + manyLobeWeight;
          float morphShape = (
            cos(angle * 5.0 + angularDrift) * fiveLobeWeight +
            cos(angle * 6.0 - angularDrift * 0.7) * sixLobeWeight +
            cos(angle * 11.0 + angularDrift * 1.3) * manyLobeWeight
          ) / totalShapeWeight;
          // Các tần số thấp tạo thùy lớn nhỏ lệch nhau; các pha không đồng bộ
          // giúp cổng giống một vết rách sống thay vì hình hoa đối xứng.
          float asymmetricBulge =
            cos(angle - 0.72 + sin(uTime * 0.29) * 0.2) * 0.052 +
            sin(angle * 2.0 + 1.37 - uTime * 0.17) * 0.032 +
            cos(angle * 3.0 - 0.48 + uTime * 0.11) * 0.021;
          float brokenLobes =
            max(0.0, sin(angle * 4.0 + 0.9 - uTime * 0.23)) * 0.028 -
            max(0.0, cos(angle * 7.0 - 1.6 + uTime * 0.31)) * 0.018;
          float boundary = 0.875
            + morphShape * 0.075
            + sin(angle * 5.0 - uTime * 1.46) * 0.028
            + sin(angle * 13.0 + uTime * 2.18) * 0.014
            + asymmetricBulge
            + brokenLobes;
          // Giữ riêng phần chân cổng gần bán kính đầy đủ để silhouette luôn
          // chạm đất, còn các vùng khác vẫn được morph tự do.
          float groundAnchor = pow(max(0.0, -sin(angle)), 10.0);
          boundary = mix(boundary, 0.985, groundAnchor);
          float shapedRadius = radius / boundary;
          if (shapedRadius > 1.0) discard;
          float edgeFade = 1.0 - smoothstep(0.84, 1.0, shapedRadius);
          float spiral = 0.5 + 0.5 * sin(angle * 5.0 - radius * 18.0 + uTime * 3.0);
          float inwardFlow = 0.5 + 0.5 * sin(radius * 25.0 + uTime * 4.2);
          float filament = pow(spiral, 5.0) * (0.55 + inwardFlow * 0.45);
          vec3 magicColor = mix(
            uInnerColor,
            uOuterColor,
            smoothstep(0.15, 0.92, shapedRadius)
          );
          vec3 color = mix(vec3(0.006, 0.004, 0.01), magicColor, filament * 0.9);

          // Các mảnh vật chất xuất hiện ở vành ngoài, xoắn dần rồi bị hút vào lõi.
          float matterAlpha = 0.0;
          vec3 matterLight = vec3(0.0);
          for (int index = 0; index < 9; index++) {
            float item = float(index);
            float seed = fract(sin(item * 91.731 + 17.13) * 43758.5453);
            float speed = 0.105 + seed * 0.055;
            float travel = fract(seed - uTime * speed);
            float particleAngle =
              item * 2.399963 + travel * 3.2 + sin(uTime * 0.24 + item) * 0.16;
            vec2 particlePosition =
              vec2(cos(particleAngle), sin(particleAngle)) * travel * 0.47;
            float particleSize = mix(0.012, 0.021, 1.0 - travel);
            float distanceToParticle = distance(point, particlePosition);
            float particle = 1.0 - smoothstep(
              particleSize * 0.28,
              particleSize,
              distanceToParticle
            );
            float glow = 1.0 - smoothstep(
              particleSize,
              particleSize * 2.8,
              distanceToParticle
            );
            float life = smoothstep(0.0, 0.08, travel) *
              (1.0 - smoothstep(0.94, 1.0, travel));
            vec3 particleColor = mix(uOuterColor, uInnerColor, 1.0 - travel);
            matterAlpha += particle * life;
            matterLight += particleColor * (particle * 1.45 + glow * 0.32) * life;
          }

          color += matterLight;
          // Lõi portal gần như đặc để hấp thụ grid phía sau; chỉ mép ngoài mờ dần.
          float alpha = edgeFade * (0.96 + filament * 0.04);
          alpha = max(alpha, clamp(matterAlpha * 0.92, 0.0, 1.0));
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    const vortex = new THREE.Mesh(
      new THREE.CircleGeometry(0.61, 64),
      vortexMaterial,
    );
    vortex.name = "spawnPortalVortex";
    const placement = spawnPortalPlacement(map, lane);
    const entranceDirection = placement.direction;
    portal.rotation.y = Math.atan2(entranceDirection.x, entranceDirection.y);
    portal.position.copy(
      mapWorldPosition(map, placement.position.x, placement.position.y),
    );
    portal.scale.setScalar(2);
    // Circle bán kính 0.61 và portal scale 2 => bán kính thực 1.22.
    // Đặt tâm ở 1.24 để chân cổng vừa chạm mặt đất thay vì xuyên xuống dưới.
    portal.position.y = 1.24;
    vortex.position.z = 0.012;
    portal.add(vortex);
    const light = new THREE.PointLight(portalColor, 2.1, 7.2, 2);
    light.position.set(0, 0, 0.35);
    portal.add(light);

    // Các mảnh vật chất bên ngoài portal bị kéo theo quỹ đạo xoắn vào tâm.
    const matterCount = 40;
    const matterGeometry = new THREE.BufferGeometry();
    const matterPositions = new THREE.BufferAttribute(
      new Float32Array(matterCount * 3),
      3,
    );
    const matterLife = new THREE.BufferAttribute(
      new Float32Array(matterCount),
      1,
    );
    matterGeometry.setAttribute("position", matterPositions);
    matterGeometry.setAttribute("aLife", matterLife);
    const matter = new THREE.Points(
      matterGeometry,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uColor: { value: highlightColor },
        },
        vertexShader: `
          attribute float aLife;
          varying float vLife;

          void main() {
            vLife = aLife;
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            float perspective = clamp(
              14.0 / max(6.0, -viewPosition.z),
              0.85,
              1.5
            );
            gl_PointSize = mix(2.0, 5.2, aLife) * perspective;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vLife;

          void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            if (distanceToCenter > 0.5) discard;
            float core = 1.0 - smoothstep(0.04, 0.2, distanceToCenter);
            float glow = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
            float alpha = (glow * 0.38 + core * 0.62) * vLife * 0.62;
            gl_FragColor = vec4(uColor * (0.5 + core * 0.95), alpha);
          }
        `,
      }),
    );
    matter.name = "spawnPortalMatter";
    matter.frustumCulled = false;
    matter.renderOrder = 7;
    portal.add(matter);

    scene.add(portal);
    portals.push({
      vortexMaterial,
      matter,
      matterPositions,
      matterLife,
      light,
    });
  }

  return (elapsed: number) => {
    portals.forEach(
      (
        {
          vortexMaterial,
          matter,
          matterPositions,
          matterLife,
          light,
        },
        index,
      ) => {
        const phase = elapsed + index * 0.65;
        vortexMaterial.uniforms.uTime!.value = phase;
        light.intensity = 1.9 + Math.sin(phase * 3.2) * 0.38;

        for (
          let particleIndex = 0;
          particleIndex < matterPositions.count;
          particleIndex++
        ) {
          const seed = ((particleIndex * 47 + index * 19) % 97) / 97;
          const progress = (phase * (0.1 + seed * 0.045) + seed) % 1;
          // Hạt lơ lửng lâu ở ngoài rồi tăng tốc khi tiến gần tâm hút.
          const suction = progress ** 1.75;
          const radius = THREE.MathUtils.lerp(2.35, 0.04, suction);
          const angle =
            seed * Math.PI * 2 +
            suction * Math.PI * (3.4 + seed * 1.8) +
            Math.sin(phase * (0.22 + seed * 0.12) + particleIndex) * 0.22;
          const drift = Math.sin(seed * 29.4 + phase * 0.37) * (1 - suction);
          matterPositions.setXYZ(
            particleIndex,
            Math.cos(angle) * radius + drift * 0.12,
            Math.sin(angle) * radius * (0.58 + seed * 0.18),
            Math.sin(angle * 0.7 + seed * 31.7) * 0.18 * (1 - suction),
          );
          const fadeIn = THREE.MathUtils.smoothstep(progress, 0, 0.18);
          const fadeOut =
            1 - THREE.MathUtils.smoothstep(progress, 0.76, 0.98);
          const flicker = 0.72 + Math.sin(phase * 1.4 + seed * 41) * 0.28;
          matterLife.setX(particleIndex, fadeIn * fadeOut * flicker);
        }
        matterPositions.needsUpdate = true;
        matterLife.needsUpdate = true;
        matter.rotation.z = Math.sin(phase * 0.21) * 0.025;
      },
    );
  };
}

function addAtmosphere(scene: THREE.Scene, map: TowerDefenseMapDefinition) {
  const count = 90;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseY = new Float32Array(count);
  let seed = 2173;
  const gold = new THREE.Color(0xffd88a);
  const blue = new THREE.Color(0x74dff2);
  for (let index = 0; index < count; index++) {
    seed = (seed * 16807) % 2147483647;
    const x = ((seed / 2147483647) * (map.columns + 0.4) - (map.columns + 0.4) / 2) * map.cellSize;
    seed = (seed * 16807) % 2147483647;
    const y = 0.35 + (seed / 2147483647) * 2.25;
    seed = (seed * 16807) % 2147483647;
    const z = ((seed / 2147483647) * (map.rows + 0.1) - (map.rows + 0.1) / 2) * map.cellSize;
    positions.set([x, y, z], index * 3);
    baseY[index] = y;
    const color = index % 3 === 0 ? blue : gold;
    colors.set([color.r, color.g, color.b], index * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.065, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  particles.userData.baseY = baseY;
  particles.frustumCulled = false;
  scene.add(particles);
  return particles;
}

/** Dựng toàn bộ phần tĩnh của map và trả các object scene cần tương tác. */
export function createTowerDefenseMapScene(scene: THREE.Scene, map: TowerDefenseMapDefinition, surfaceDetail: THREE.DataTexture | null): TowerDefenseMapScene {
  addFoundation(scene, map, surfaceDetail);
  const tileMeshes = addTiles(scene, map, surfaceDetail);
  addCobblestonePath(scene, map, surfaceDetail);
  addRouteLines(scene, map);
  addScenery(scene, map, surfaceDetail);
  const updatePortal = addSpawnPortal(scene, map);
  const particles = addAtmosphere(scene, map);
  return { tileMeshes, particles, updatePortal };
}

/**
 * Lặp model nền bằng InstancedMesh trên các ô có thể xây. Tile trong suốt bên
 * dưới vẫn đảm nhiệm raycast nên model trang trí không can thiệp thao tác chọn ô.
 */
export async function loadTowerDefenseBackgroundModel(
  scene: THREE.Scene,
  map: TowerDefenseMapDefinition,
  tileMeshes: THREE.Mesh[],
) {
  if (!map.backgroundModel) return null;
  const gltf = await new GLTFLoader().loadAsync(map.backgroundModel.url);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const horizontalSize = Math.max(size.x, size.z);
  if (!Number.isFinite(horizontalSize) || horizontalSize <= 0)
    throw new Error("Model background không có kích thước hợp lệ.");

  const scale = (map.cellSize * 1.01) / horizontalSize;
  const surfaceY = 0.07 + (map.backgroundModel.offsetY ?? 0);
  const pathKeys = new Set(map.pathTiles.map((point) => `${point.x}:${point.y}`));
  const cells: GridPoint[] = [];
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.columns; x++)
      if (!pathKeys.has(`${x}:${y}`)) cells.push({ x, y });

  const background = new THREE.Group();
  background.name = "towerDefenseBackgroundModel";
  const fitMatrix = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4();
  const fitPosition = new THREE.Vector3();
  const fitScale = new THREE.Vector3(scale, scale, scale);
  const fitRotation = new THREE.Quaternion();

  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const instances = new THREE.InstancedMesh(
      child.geometry,
      child.material,
      cells.length,
    );
    instances.name = "lavaBackgroundInstances";
    cells.forEach((cell, index) => {
      const position = mapWorldPosition(map, cell.x, cell.y);
      fitPosition.set(
        position.x - center.x * scale,
        surfaceY - bounds.max.y * scale,
        position.z - center.z * scale,
      );
      fitMatrix.compose(fitPosition, fitRotation, fitScale);
      instanceMatrix.multiplyMatrices(fitMatrix, child.matrixWorld);
      instances.setMatrixAt(index, instanceMatrix);
    });
    instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    instances.instanceMatrix.needsUpdate = true;
    instances.castShadow = false;
    instances.receiveShadow = true;
    background.add(instances);
  });
  scene.add(background);
  const setVisible = (visible: boolean) => {
    background.visible = visible;
    for (const tile of tileMeshes) {
      const cell = tile.userData.cell as GridPoint | undefined;
      if (!cell || pathKeys.has(`${cell.x}:${cell.y}`)) continue;
      const materials = Array.isArray(tile.material)
        ? tile.material
        : [tile.material];
      for (const material of materials) {
        material.transparent = visible;
        material.opacity = visible ? 0 : 1;
        material.depthWrite = !visible;
        material.colorWrite = !visible;
        material.needsUpdate = true;
      }
    }
  };
  setVisible(true);
  return { group: background, setVisible } satisfies TowerDefenseBackgroundLayer;
}

/** Tải và căn model lâu đài theo cấu hình của map, không phụ thuộc component. */
export async function loadTowerDefenseCastle(map: TowerDefenseMapDefinition) {
  const gltf = await new GLTFLoader().loadAsync(map.castle.modelUrl);
  const source = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largestHorizontalSide = Math.max(size.x, size.z, 0.001);
  const modelScale = Math.min(map.castle.maxSize / Math.max(size.y, 0.001), map.castle.maxSize / largestHorizontalSide);
  source.position.set(-center.x, -bounds.min.y, -center.z);
  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.geometry.computeBoundingSphere();
    if ((child.geometry.boundingSphere?.radius ?? 0) < size.length() * 0.012) child.castShadow = false;
  });
  const container = new THREE.Group();
  container.name = "castleModel";
  container.add(source);
  container.scale.setScalar(modelScale);
  const castleCell = map.castle.position ?? {
    x: map.columns + map.castle.offsetX,
    y: map.paths[0].at(-1)!.y,
  };
  const approachPoints = map.paths.map((path) =>
    [...path].reverse().find(
      (point) => point.x !== castleCell.x || point.y !== castleCell.y,
    ) ?? path.at(-1)!,
  );
  const approachCenter = approachPoints.reduce(
    (center, point) => ({ x: center.x + point.x / approachPoints.length, y: center.y + point.y / approachPoints.length }),
    { x: 0, y: 0 },
  );
  let facingDirection = {
    x: approachCenter.x - castleCell.x,
    y: approachCenter.y - castleCell.y,
  };
  if (Math.hypot(facingDirection.x, facingDirection.y) < 0.001) {
    facingDirection = {
      x: approachPoints[0]!.x - castleCell.x,
      y: approachPoints[0]!.y - castleCell.y,
    };
  }
  // Mặt trước model mặc định theo +Z. Quay nó nhìn về hướng quân địch tiến tới;
  // rotationY chỉ là góc hiệu chỉnh dành cho GLB có trục trước khác chuẩn.
  container.rotation.y =
    Math.atan2(facingDirection.x, facingDirection.y) + map.castle.rotationY;
  container.position.copy(mapWorldPosition(map, castleCell.x, castleCell.y));
  if (map.castle.position) {
    const directionLength = Math.max(
      0.001,
      Math.hypot(facingDirection.x, facingDirection.y),
    );
    const frontX = facingDirection.x / directionLength;
    const frontZ = facingDirection.y / directionLength;
    const modelHalfDepth = size.z * modelScale * 0.5;
    // `castle.position` là điểm cuối path/cổng. Lùi đúng nửa chiều sâu model
    // để mặt trước chạm trực tiếp vào path mà phần thân không phủ lên đường.
    const clearance = modelHalfDepth;
    container.position.x -= frontX * clearance;
    container.position.z -= frontZ * clearance;
  }
  container.position.y = map.castle.offsetY;
  return container;
}
