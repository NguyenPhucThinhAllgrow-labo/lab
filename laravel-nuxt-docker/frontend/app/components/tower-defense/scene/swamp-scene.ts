import * as THREE from "three";
import { createSwampPadGeometry } from "./swamp-pad-geometry";
import type { GridPoint, TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { mapSpacePosition } from "~/games/tower-defense/map-space";
import { swampSceneryMap } from "~/utils/games/swampEditableArea";
import { swampRoadFences } from "~/utils/games/swampRoadFences";
import { createMarshFoundation } from "~/components/tower-defense/scene/marsh-foundation";
import { createCitadelArchitecture, batchCitadelArchitecture } from "~/components/tower-defense/scene/citadel-architecture";

/** A data-driven gothic marsh shared by admin preview and the playable map. */
export function createSwampScene(scene: THREE.Scene, inputMap: TowerDefenseMapDefinition, detail: THREE.DataTexture | null) {
  const map = swampSceneryMap(inputMap);
  const padding = inputMap.swampSettings?.editorPadding ?? 0;
  const settings = map.swampSettings;
  const root = new THREE.Group(); root.name = "gothicSwampEnvironment";
  const groundLift = mapSpacePosition(inputMap, { x: 0, y: 0 }).baseY;
  root.position.y = groundLift;
  scene.add(root);
  let seed = settings?.seed ?? 7319;
  const resetRandom = (stream: number) => { seed = ((settings?.seed ?? 7319) ^ Math.imul(stream, 0x9e3779b1)) >>> 0; };
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const world = (point: GridPoint) => { const p = mapSpacePosition(map, point); return new THREE.Vector3(p.x, 0, p.z); };
  const stone = new THREE.MeshStandardMaterial({ color: 0x70746c, roughness: 0.95, bumpMap: detail, bumpScale: 0.055 });
  const pavingStone = stone.clone();
  pavingStone.polygonOffset = true;
  pavingStone.polygonOffsetFactor = -1;
  pavingStone.polygonOffsetUnits = -1;
  const cliff = new THREE.MeshStandardMaterial({ color: 0x343d38, roughness: 1, flatShading: true });
  const spawnGround = new THREE.MeshStandardMaterial({ color: 0x4b5138, roughness: 0.98, bumpMap: detail, bumpScale: 0.035 });
  const islandSoil = spawnGround.clone(); islandSoil.vertexColors = true; islandSoil.bumpScale = 0.11;
  const islandCliff = cliff.clone(); islandCliff.vertexColors = true;
  const wood = new THREE.MeshStandardMaterial({ color: 0x302a25, roughness: 0.97 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x292f31, roughness: 0.72, metalness: 0.55 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8b7549, roughness: 0.72, metalness: 0.45 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x505e37, roughness: 1, side: THREE.DoubleSide });
  const banner = new THREE.MeshStandardMaterial({ color: 0x501e24, roughness: 0.95, side: THREE.DoubleSide });
  type Instance = { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Quaternion; color?: THREE.Color };
  const batches: Array<{ name: string; geometry: THREE.BufferGeometry; material: THREE.Material; items: Instance[] }> = [];
  const batch = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const group = { name, geometry, material, items: [] as Instance[] }; batches.push(group);
    return (position: THREE.Vector3, scale: THREE.Vector3, rotation = new THREE.Quaternion(), color?: number) => {
      group.items.push({ position: position.clone(), scale: scale.clone(), rotation: rotation.clone(), color: color === undefined ? undefined : new THREE.Color(color) });
    };
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boxes = batch("swampStonework", unitBox, stone);
  const wornSlab = (cut: number) => {
    const shape = new THREE.Shape();
    const edge = 0.475;
    shape.moveTo(-edge + cut, -edge);
    shape.lineTo(edge - cut * 0.65, -edge);
    shape.lineTo(edge, -edge + cut * 1.15);
    shape.lineTo(edge, edge - cut * 0.8);
    shape.lineTo(edge - cut * 1.2, edge);
    shape.lineTo(-edge + cut * 0.7, edge);
    shape.lineTo(-edge, edge - cut * 1.3);
    shape.lineTo(-edge, -edge + cut * 0.75);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.84, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.08, steps: 1,
    });
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, -0.42, 0);
    return geometry;
  };
  const paving = batch("swampPathPaving", wornSlab(0.09), pavingStone);
  const pathGround = batch("swampPathGround", wornSlab(0.22), spawnGround);
  const cliffs = batch("swampRockwork", new THREE.DodecahedronGeometry(1, 0), cliff);
  const timber = batch("swampTimber", unitBox.clone(), wood);
  const metal = batch("swampIronwork", unitBox.clone(), iron);
  const cloth = new THREE.Shape();
  cloth.moveTo(-0.5, 0.5); cloth.lineTo(0.5, 0.5); cloth.lineTo(0.5, -0.35);
  cloth.lineTo(0.25, -0.5); cloth.lineTo(0.05, -0.32); cloth.lineTo(-0.2, -0.5); cloth.lineTo(-0.5, -0.35); cloth.closePath();
  const banners = batch("swampBanners", new THREE.ShapeGeometry(cloth), banner);
  const cylinders = batch("swampTreeBranches", new THREE.CylinderGeometry(0.7, 1, 1, 6), wood);
  const crowns = batch("swampGothicRoofs", new THREE.ConeGeometry(1, 1, 6), iron);
  const bridgeArches = batch("swampBridgeArches", new THREE.TorusGeometry(1, 0.13, 5, 12, Math.PI), stone);
  const padStone = stone.clone(); padStone.color.setHex(0x535b51); padStone.roughness = 0.98;
  padStone.vertexColors = true; padStone.flatShading = true;
  const padTrim = bronze.clone(); padTrim.color.setHex(0x8a8060); padTrim.metalness = 0.3;
  const pads = batch("swampTowerPlatforms", createSwampPadGeometry(), padStone);
  const padRings = batch("swampTowerPadRings", new THREE.TorusGeometry(1, 0.018, 4, 32), padTrim);
  const lilyMaterial = moss.clone();
  lilyMaterial.side = THREE.FrontSide;
  lilyMaterial.polygonOffset = true;
  lilyMaterial.polygonOffsetFactor = -1;
  lilyMaterial.polygonOffsetUnits = -1;
  const lily = batch("swampLilyPads", new THREE.CircleGeometry(1, 7, 0.14, Math.PI * 1.88), lilyMaterial);
  const marshMoss = batch("swampCastleMoss", new THREE.DodecahedronGeometry(1, 0), moss);
  const reeds = batch("swampCastleReeds", new THREE.ConeGeometry(0.08, 1, 3), moss);
  const foliage = batch("swampGreenTrees", new THREE.DodecahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x344a2b, roughness: 1, flatShading: true }));
  const graves = batch("swampGravestones", unitBox.clone(), cliff);
  const grass = batch("swampGrass", new THREE.ConeGeometry(0.12, 1, 3), moss);
  const marshBanks = batch("swampMarshBanks", new THREE.DodecahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x454c35, roughness: 1, flatShading: true, bumpMap: detail, bumpScale: 0.04 }));
  const mistPixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const offset = (y * 32 + x) * 4;
    const radius = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
    mistPixels[offset] = mistPixels[offset + 1] = mistPixels[offset + 2] = 255;
    mistPixels[offset + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 180);
  }
  const mistTexture = new THREE.DataTexture(mistPixels, 32, 32, THREE.RGBAFormat);
  mistTexture.magFilter = THREE.LinearFilter; mistTexture.minFilter = THREE.LinearFilter; mistTexture.needsUpdate = true;
  const mist = batch("swampLowMist", new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    color: 0x90aaa8, map: mistTexture, transparent: true, opacity: 0.22,
    depthWrite: false, side: THREE.DoubleSide,
    forceSinglePass: true,
  }));
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const yaw = (angle: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  const horizontal = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const segment = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const direction = b.clone().sub(a);
    cylinders(a.clone().add(b).multiplyScalar(0.5), v(radius, direction.length(), radius),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  };

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(settings?.waterColor ?? 0x203f3f) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vUv*90.; float n=noise(p*.7+vec2(uTime*.014,0.));
        float ripplePhase=p.x*3.4+p.y*1.7+uTime*.45+n*3.;
        float ripple=sin(ripplePhase)*.035*(1.-smoothstep(.6,3.,fwidth(ripplePhase)));
        vec3 color=uColor*(.75+n*.45)+vec3(.08,.13,.12)*ripple;
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment> }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(map.columns * map.cellSize + 70, map.rows * map.cellSize + 70), waterMaterial);
  water.name = "swampWater"; water.rotation.x = -Math.PI / 2; water.position.y = -0.65 - groundLift; root.add(water);
  scene.fog = new THREE.Fog(map.theme.background, map.theme.fogNear, map.theme.fogFar);

  // Irregular islands; raised walkways are kept level with gameplay ground.
  for (const [islandIndex, island] of (settings?.islands ?? []).entries()) {
    const shape = new THREE.Shape(); const radius = island.radius * map.cellSize;
    const largeLand = island.radius >= 5.5;
    const vertexCount = largeLand ? 32 : 14;
    const phase = random() * Math.PI * 2;
    const outline: Array<{ x: number; z: number }> = [];
    for (let index = 0; index < vertexCount; index++) {
      const angle = index / vertexCount * Math.PI * 2;
      const r = radius * (largeLand
        ? 0.88 + Math.sin(angle * 3 + phase) * 0.13 + Math.cos(angle * 5 - phase) * 0.07
        : 0.82 + random() * 0.2);
      const x = Math.cos(angle) * r * (largeLand ? 1.1 : 1);
      const z = Math.sin(angle) * r * (largeLand ? 0.86 : 1);
      outline.push({ x, z });
      if (!index) shape.moveTo(x, z); else shape.lineTo(x, z);
    }
    shape.closePath();
    const geometry = createMarshFoundation(shape, 0.8);
    const mesh = new THREE.Mesh(geometry, island.spawnArea ? islandSoil : islandCliff); mesh.name = "swampIsland";
    mesh.userData.spawnArea = island.spawnArea === true;
    mesh.userData.largeLand = largeLand;
    // Keep soil below the paving, with distinct heights where neighbouring islands overlap.
    mesh.position.copy(world(island)); mesh.position.y = -1.01 - islandIndex * 0.003;
    mesh.receiveShadow = true; root.add(mesh);
    for (let index = 0; index < (largeLand ? 28 : 16); index++) {
      const edge = outline[Math.floor(random() * outline.length)]!;
      const p = world(island).add(v(edge.x * 0.95, -0.48, -edge.z * 0.95));
      cliffs(p, v(0.8 + random(), 0.6 + random() * 0.4, 0.8 + random()), yaw(random() * 6));
    }
  }
  // Derive paving from the current lanes, never from imported/stale pathTiles.
  resetRandom(17);
  const path = [...new Map(map.paths.flat().map((point) => [`${point.x}:${point.y}`, point])).values()];
  const pathKeys = new Set(path.map((point) => `${point.x}:${point.y}`));
  // Marsh pads are compact stepping-stone platforms, not wide bridge balconies.
  const padRadius = map.cellSize * 0.55;
  const padWorldPositions = (map.buildableTiles ?? []).map(world);
  const pathWorldPositions = path.map(world);
  const touchesPad = (p: THREE.Vector3, margin: number) => padWorldPositions.some((pad) =>
    Math.hypot(pad.x - p.x, pad.z - p.z) < padRadius + margin);
  const touchesRoad = (p: THREE.Vector3, margin: number) => pathWorldPositions.some((tile) =>
    Math.abs(tile.x - p.x) < map.cellSize / 2 + margin
      && Math.abs(tile.z - p.z) < map.cellSize / 2 + margin);
  const activeBridges = (settings?.bridges ?? []).filter(({ from, to }) => {
    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (!length || (from.x !== to.x && from.y !== to.y)) return false;
    for (let index = 0; index <= length; index++) {
      if (!pathKeys.has(`${from.x + Math.sign(to.x - from.x) * index}:${from.y + Math.sign(to.y - from.y) * index}`)) return false;
    }
    return true;
  });
  const bridgeCell = (point: GridPoint) => activeBridges.some(({ from, to }) =>
    from.x === to.x ? point.x === from.x && point.y > Math.min(from.y, to.y) && point.y < Math.max(from.y, to.y)
      : point.y === from.y && point.x > Math.min(from.x, to.x) && point.x < Math.max(from.x, to.x));
  for (const point of path) {
    const p = world(point);
    if (!bridgeCell(point)) {
      pathGround(p.clone().setY(-0.55), v(map.cellSize, 0.98, map.cellSize), new THREE.Quaternion(), 0x747c65);
      for (const side of [-1, 1]) {
        const rock = p.clone().add(v(side * map.cellSize * 0.68, -0.35, (random() - 0.5) * map.cellSize));
        const rotation = yaw(random() * 6);
        if (!touchesPad(rock, 0.7) && !touchesRoad(rock, 0.3)) cliffs(rock, v(0.65, 0.45, 0.7), rotation);
      }
    }
    for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
      paving(p.clone().add(v((column - 0.5) * map.cellSize / 2, 0, (row - 0.5) * map.cellSize / 2)),
        v(map.cellSize / 2 - 0.065, 0.12, map.cellSize / 2 - 0.065), yaw((random() - 0.5) * 0.055),
        [0xb1aea0, 0x95988b, 0xc0b7a3][Math.floor(random() * 3)]!);
    }
  }
  const fencePosts = new Set<string>();
  for (const { from, to } of swampRoadFences(map.paths, map.buildableTiles ?? [])) {
    const a = world(from); const b = world(to);
    const direction = b.clone().sub(a).normalize();
    const rotation = yaw(Math.atan2(direction.x, direction.z));
    const center = a.clone().add(b).multiplyScalar(0.5);
    for (const height of [0.45, 0.9]) metal(center.clone().setY(height), v(0.09, 0.1, a.distanceTo(b)), rotation);
    for (const point of [from, to]) {
      const key = `${point.x}:${point.y}`;
      if (fencePosts.has(key)) continue;
      fencePosts.add(key);
      const post = world(point);
      metal(post.clone().setY(0.5), v(0.12, 1, 0.12));
      crowns(post.clone().setY(1.1), v(0.15, 0.3, 0.15));
    }
  }

  const flameMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; uniform float uTime; void main(){vUv=uv;vec3 p=position;
      p.x+=sin(uTime*7.+position.y*8.)*.1*max(position.y,0.);
      vec4 transformed=vec4(p,1.);
      #ifdef USE_INSTANCING
        transformed=instanceMatrix*transformed;
      #endif
      gl_Position=projectionMatrix*modelViewMatrix*transformed;}`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; void main(){float a=(1.-vUv.y)*(.7+.15*sin(uTime*9.+vUv.x*8.));
      gl_FragColor=vec4(mix(vec3(1.,.22,.035),vec3(1.,.85,.35),1.-vUv.y),a);}`,
  });
  const flames = batch("swampTorchFlames", new THREE.ConeGeometry(0.22, 0.85, 5), flameMaterial);
  const torch = (p: THREE.Vector3) => {
    boxes(p.clone().add(v(0, -0.35, 0)), v(0.7, 0.8, 0.7));
    boxes(p.clone().add(v(0, 0.55, 0)), v(0.55, 1.1, 0.55));
    metal(p.clone().add(v(0, 1.16, 0)), v(0.75, 0.18, 0.75));
    flames(p.clone().add(v(0, 1.63, 0)), v(1, 1, 1));
  };
  for (const { from, to } of activeBridges) {
    const a = world(from); const b = world(to); const center = a.clone().add(b).multiplyScalar(0.5);
    const length = a.distanceTo(b) + map.cellSize; const alongX = from.y === to.y;
    const rotation = yaw(alongX ? Math.PI / 2 : 0); const width = map.cellSize * 1.4;
    boxes(center.clone().setY(-0.25), v(width, 0.32, length), rotation);
    for (const side of [-1, 1]) {
      const shift = alongX ? v(0, 0, side * width / 2) : v(side * width / 2, 0, 0);
      for (let arch = 0; arch < 3; arch++) {
        const p = a.clone().lerp(b, (arch + 0.5) / 3).add(shift).setY(-0.8);
        bridgeArches(p, v(a.distanceTo(b) / 6, 0.6, 0.28), yaw(alongX ? 0 : Math.PI / 2));
      }
      for (const end of [a, b]) { const p = end.clone().add(shift); torch(p); boxes(p.clone().setY(-0.85), v(0.55, 1.7, 0.55)); }
    }
  }
  const tileMeshes: THREE.Mesh[] = [];
  const pickGeometry = new THREE.CircleGeometry(padRadius, 20);
  const pickMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  for (const point of map.buildableTiles ?? []) {
    const p = world(point); const radius = padRadius;
    // The paving top is 0.06: never give an intersecting platform the same cap.
    const padTop = 0.03;
    pads(p.clone().setY(padTop - 1.42 / 2), v(radius, 1.42, radius));
    // Account for the scaled torus tube, not only its centreline.
    padRings(p.clone().setY(padTop + radius * 0.82 * 0.018 + 0.012), v(radius * 0.82, radius * 0.82, 1), horizontal);
    const pick = new THREE.Mesh(pickGeometry, pickMaterial); pick.rotation.x = -Math.PI / 2;
    pick.position.copy(p).setY(0.08); pick.userData.cell = { x: point.x + padding, y: point.y + padding }; root.add(pick); tileMeshes.push(pick);
  }

  const spawnAreas = (settings?.islands ?? []).filter((island) => island.spawnArea);
  const occupied = (x: number, y: number, distance: number) => path.some((p) => Math.hypot(p.x - x, p.y - y) < distance)
    || (map.buildableTiles ?? []).some((p) => Math.hypot(p.x - x, p.y - y) < distance)
    || (map.spawnPoints ?? []).some((p) => Math.hypot(p.x - x, p.y - y) < Math.max(distance, 1.8))
    || spawnAreas.some((p) => Math.hypot(p.x - x, p.y - y) < Math.max(distance, 1.8));
  const castle = map.castle.position ?? map.paths[0].at(-1)!;
  const gate = world(castle);
  const last = world(map.paths[0].at(-1)!);
  const gateRotation = yaw(Math.atan2(last.x - gate.x, last.z - gate.z));
  const inverseGateRotation = gateRotation.clone().invert();
  const insideCastle = (x: number, y: number, margin = 0) => {
    const p = world({ x, y }).sub(gate).applyQuaternion(inverseGateRotation);
    return Math.abs(p.x) < 21 + margin && p.z > -39 - margin && p.z < 3 + margin;
  };
  // Clusters break up the previously empty water apron as well as the playable marsh.
  // Shared instance batches keep this extra density out of the draw-call budget.
  const thickets: GridPoint[] = [];
  // Terrain only depends on the seed and fixed land settings, never edit-time exclusions.
  const terrainOccupied = (x: number, y: number) => spawnAreas.some((p) => Math.hypot(p.x - x, p.y - y) < 3.1);
  resetRandom(31);
  const addThicket = (x: number, y: number) => {
    thickets.push({ x, y });
    const p = world({ x, y }); const radius = 2.4 + random() * 3.1;
    const rotation = yaw(random() * Math.PI * 2);
    marshBanks(p.clone().setY(-0.66), v(radius, 0.42 + random() * 0.13, radius * (0.55 + random() * 0.65)), rotation,
      [0x454c35, 0x3e4432, 0x50513b][Math.floor(random() * 3)]!);
    // Unequal lobes make a ragged shore instead of repeating round, centred mounds.
    const lobes = 1 + Math.floor(random() * 3);
    for (let lobe = 0; lobe < lobes; lobe++) {
      const angle = random() * Math.PI * 2;
      const lobeRadius = radius * (0.3 + random() * 0.4);
      const offset = radius * (0.35 + random() * 0.25);
      marshBanks(p.clone().add(v(Math.cos(angle) * offset, -0.69 - random() * 0.12, Math.sin(angle) * offset)),
        v(lobeRadius, 0.35 + random() * 0.35, lobeRadius * (0.5 + random() * 0.6)), yaw(angle));
    }
    if (random() < 0.7) marshMoss(p.clone().add(v((random() - 0.5) * radius, -0.06, (random() - 0.5) * radius)),
      v(radius * (0.25 + random() * 0.4), 0.06, radius * (0.2 + random() * 0.35)), rotation);
    const tuftCount = 5 + Math.floor(random() * 16);
    const tuftAngle = random() * Math.PI * 2;
    for (let tuft = 0; tuft < tuftCount; tuft++) {
      const angle = tuftAngle + (random() - 0.5) * Math.PI * 1.4; const r = radius * (0.45 + random() * 0.55);
      const base = p.clone().add(v(Math.cos(angle) * r, -0.38, Math.sin(angle) * r));
      for (let blade = 0; blade < 3; blade++) {
        const height = 0.55 + random() * 0.85;
        reeds(base.clone().add(v((random() - 0.5) * 0.4, height / 2, (random() - 0.5) * 0.4)),
          v(1, height, 1), yaw(random() * 6), tuft % 2 ? 0x707047 : 0x53633d);
      }
    }
    const rockCount = Math.floor(random() * 6);
    for (let rock = 0; rock < rockCount; rock++) {
      const angle = random() * Math.PI * 2;
      cliffs(p.clone().add(v(Math.cos(angle) * radius * 0.7, -0.32, Math.sin(angle) * radius * 0.7)),
        v(0.55 + random(), 0.35 + random() * 0.4, 0.55 + random()), yaw(angle));
    }
  };
  for (let attempts = 0; thickets.length < 48 && attempts < 600; attempts++) {
    const x = -6 + random() * (map.columns + 12);
    const y = -6 + random() * (map.rows + 12);
    if (terrainOccupied(x, y)
      || thickets.some((p) => Math.hypot(p.x - x, p.y - y) < 2.6)) continue;
    addThicket(x, y);
  }
  // Explicitly cover the outer water apron: random playable-area sampling never
  // reaches this band, leaving the left, front and rear edges visibly empty.
  const edgeThickets: GridPoint[] = [];
  resetRandom(43);
  const addEdgeThicket = (x: number, y: number) => {
    if (terrainOccupied(x, y)
      || thickets.some((p) => Math.hypot(p.x - x, p.y - y) < 2.6)) return;
    addThicket(x, y); edgeThickets.push({ x, y });
  };
  // Sample a broad band, not an equally spaced perimeter fence.
  for (let attempts = 0; edgeThickets.length < 64 && attempts < 700; attempts++) {
    const inset = (13 + random() * 12) / map.cellSize;
    const alongX = -5 + random() * (map.columns + 9);
    const alongY = -5 + random() * (map.rows + 9);
    switch (attempts % 4) {
      case 0: addEdgeThicket(alongX, -inset); break;
      case 1: addEdgeThicket(alongX, map.rows - 1 + inset); break;
      case 2: addEdgeThicket(-inset, alongY); break;
      case 3: addEdgeThicket(map.columns - 1 + inset, alongY); break;
    }
  }
  // A few broad, low islands interrupt the small thickets in the outer water band.
  // These are scenic land only; the editable grid and spawn count remain unchanged.
  const halfWidth = (map.columns - 1) * map.cellSize / 2;
  const halfDepth = (map.rows - 1) * map.cellSize / 2;
  const edgeLands: Array<{ center: THREE.Vector3; rotation: THREE.Quaternion; radiusX: number; radiusZ: number }> = [];
  const edgeSites = [
    { x: -halfWidth - 18, z: -halfDepth * 0.48, alongX: false },
    { x: -halfWidth - 17, z: halfDepth * 0.57, alongX: false },
    { x: -halfWidth * 0.45, z: halfDepth + 18, alongX: true },
    { x: halfWidth * 0.48, z: halfDepth + 16, alongX: true },
    { x: -halfWidth * 0.38, z: -halfDepth - 18, alongX: true },
    { x: halfWidth + 18, z: halfDepth * 0.55, alongX: false },
  ];
  resetRandom(53);
  edgeSites.forEach((site, index) => {
    const center = v(site.x + (random() - 0.5) * 3, 0, site.z + (random() - 0.5) * 3);
    const point = { x: center.x / map.cellSize + (map.columns - 1) / 2, y: center.z / map.cellSize + (map.rows - 1) / 2 };
    if (terrainOccupied(point.x, point.y)) return;
    const length = 14 + random() * 6, depth = 8 + random() * 2;
    const radiusX = site.alongX ? length : depth, radiusZ = site.alongX ? depth : length;
    const rotation = yaw((random() - 0.5) * 0.22);
    const phase = random() * Math.PI * 2;
    const shape = new THREE.Shape();
    for (let vertex = 0; vertex < 40; vertex++) {
      const angle = vertex / 40 * Math.PI * 2;
      const r = 0.9 + Math.sin(angle * 3 + phase) * 0.11 + Math.cos(angle * 7 - phase) * 0.055;
      const x = Math.cos(angle) * radiusX * r, z = Math.sin(angle) * radiusZ * r;
      if (vertex === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
    }
    shape.closePath();
    const geometry = createMarshFoundation(shape, 0.75);
    const land = new THREE.Mesh(geometry, islandSoil);
    land.name = "swampEdgeLand";
    land.position.copy(center).setY(-1.06 - index * 0.025);
    land.quaternion.copy(rotation); land.receiveShadow = true; root.add(land);
    edgeLands.push({ center, rotation, radiusX, radiusZ });
    for (let patch = 0; patch < 3; patch++) {
      const p = v((random() - 0.5) * radiusX, 0, (random() - 0.5) * radiusZ).applyQuaternion(rotation).add(center);
      addEdgeThicket(p.x / map.cellSize + (map.columns - 1) / 2, p.z / map.cellSize + (map.rows - 1) / 2);
    }
  });
  const treeCount = Math.min(settings?.treeCount ?? 160, 180);
  const treePositions: GridPoint[] = [];
  for (let index = 0, attempts = 0; index < treeCount && attempts < treeCount * 15; attempts++) {
    resetRandom(0x10000 + attempts);
    const cluster = thickets[Math.floor(random() * thickets.length)];
    const x = cluster ? cluster.x + (random() - 0.5) * 2.2 : 1 + random() * (map.columns - 2);
    const y = cluster ? cluster.y + (random() - 0.5) * 2.2 : 1 + random() * (map.rows - 2);
    if (treePositions.some((p) => Math.hypot(p.x - x, p.y - y) < 0.35)) continue;
    treePositions.push({ x, y });
    index++;
    // Do not replace a hidden tree with another random tree elsewhere.
    if (occupied(x, y, 1.6) || insideCastle(x, y, 3)) continue;
    const base = world({ x, y }); const height = 3 + random() * 7;
    const top = base.clone().add(v((random() - 0.5) * 2.2, height, (random() - 0.5) * 2.2));
    segment(base.clone().setY(-0.4), top, 0.23 + random() * 0.18);
    cliffs(base.clone().setY(-0.3), v(1.2, 0.5, 1.1));
    for (let branch = 0; branch < 5; branch++) {
      const angle = random() * Math.PI * 2; const start = base.clone().lerp(top, 0.22 + random() * 0.65);
      const end = start.clone().add(v(Math.sin(angle) * (1.2 + random()), 0.6 + random() * 0.8, Math.cos(angle) * (1.2 + random())));
      segment(start, end, 0.08 + (5 - branch) * 0.012);
      segment(end, end.clone().add(v(Math.cos(angle) * 0.65, 0.8, Math.sin(angle) * 0.65)), 0.04);
    }
    const rootAngle = random() * Math.PI * 2;
    for (let branch = 0; branch < 4; branch++) {
      const angle = rootAngle + branch * Math.PI / 2 + (random() - 0.5) * 0.7;
      segment(base.clone().add(v(0, 0.65, 0)), base.clone().add(v(Math.sin(angle) * 1.1, -0.45, Math.cos(angle) * 1.1)), 0.12);
    }
  }
  // A few living trees, old graves and grass patches grow on land, not in the water.
  const decoratedLand = [...(settings?.islands ?? []).map((land) => ({ center: world(land), radius: land.radius * map.cellSize })),
    ...edgeLands.map((land) => ({ center: land.center, radius: Math.min(land.radiusX, land.radiusZ) }))];
  decoratedLand.forEach((land, index) => {
    resetRandom(0x50000 + index);
    const clear = (p: THREE.Vector3) => {
      const x = p.x / map.cellSize + (map.columns - 1) / 2, y = p.z / map.cellSize + (map.rows - 1) / 2;
      return !occupied(x, y, 1.1) && !insideCastle(x, y, 3);
    };
    const sample = () => {
      const angle = random() * Math.PI * 2, radius = land.radius * (0.3 + random() * 0.28);
      return land.center.clone().add(v(Math.cos(angle) * radius, -0.25, Math.sin(angle) * radius));
    };
    const tree = sample();
    const height = 2.8 + random() * 2;
    const canopy = v(1.2 + random() * 0.6, 1.1 + random() * 0.7, 1.1 + random() * 0.6);
    if (index % 2 === 0 && clear(tree)) {
      timber(tree.clone().add(v(0, height / 2, 0)), v(0.23, height, 0.23), yaw(random() * 6));
      foliage(tree.clone().add(v(0, height, 0)), canopy);
      foliage(tree.clone().add(v(0.65, height - 0.6, 0.35)), canopy.clone().multiplyScalar(0.65));
    }
    for (let grave = 0; grave < (index % 3 === 0 ? 3 : 1); grave++) {
      resetRandom(0x60000 + index * 16 + grave);
      const p = sample(), rotation = yaw(random() * 6);
      const height = 0.6 + random() * 0.35;
      if (!clear(p)) continue;
      graves(p.clone().add(v(0, 0.04, 0)), v(0.75, 0.12, 1.3), rotation);
      graves(p.clone().add(v(0, height / 2, 0)), v(0.45, height, 0.16), rotation);
      graves(p.clone().add(v(0, height * 0.75, 0)), v(0.65, 0.12, 0.18), rotation);
    }
    for (let patch = 0; patch < 24; patch++) {
      resetRandom(0x70000 + index * 32 + patch);
      const p = sample();
      if (!clear(p)) continue;
      for (let blade = 0; blade < 3; blade++) {
        const height = 0.18 + random() * 0.35;
        grass(p.clone().add(v((random() - 0.5) * 0.35, height / 2, (random() - 0.5) * 0.35)),
          v(0.65, height, 0.65), yaw(random() * 6), patch % 2 ? 0x63733f : 0x485c35);
      }
    }
  });
  // Spatial buckets prevent coplanar leaves from overlapping, without an O(n²) scan.
  const leafBuckets = new Map<string, Array<{ x: number; z: number; radius: number }>>();
  const lilyClusters = [...thickets, ...edgeThickets];
  for (let cluster = 0; cluster < lilyClusters.length; cluster++) {
    resetRandom(0x20000 + cluster);
    const center = lilyClusters[cluster]!;
    const leafCount = 14 + Math.floor(random() * 35);
    const driftAngle = random() * Math.PI * 2;
    for (let index = 0; index < leafCount; index++) {
      resetRandom(0x30000 + cluster * 128 + index);
      const along = (random() - 0.5) * 6, across = (random() - 0.5) * 3;
      const x = center.x + Math.cos(driftAngle) * along - Math.sin(driftAngle) * across;
      const y = center.y + Math.sin(driftAngle) * along + Math.cos(driftAngle) * across;
      if ((settings?.islands ?? []).some((island) => Math.hypot(x - island.x, y - island.y) < island.radius * 1.2)) continue;
      const p = world({ x, y }).setY(-0.55); const size = 0.3 + random() * 0.55;
      if (edgeLands.some((land) => {
        const relative = p.clone().sub(land.center).applyQuaternion(land.rotation.clone().invert());
        return (relative.x / land.radiusX) ** 2 + (relative.z / land.radiusZ) ** 2 < 1.25;
      })) continue;
      const bucketX = Math.floor(p.x / 2), bucketZ = Math.floor(p.z / 2);
      let overlaps = false;
      for (let dx = -1; dx <= 1 && !overlaps; dx++) for (let dz = -1; dz <= 1 && !overlaps; dz++) {
        overlaps = (leafBuckets.get(`${bucketX + dx}:${bucketZ + dz}`) ?? []).some((leaf) =>
          Math.hypot(leaf.x - p.x, leaf.z - p.z) < leaf.radius + size + 0.03);
      }
      if (overlaps) continue;
      const key = `${bucketX}:${bucketZ}`;
      const bucket = leafBuckets.get(key) ?? [];
      bucket.push({ x: p.x, z: p.z, radius: size }); leafBuckets.set(key, bucket);
      if (occupied(x, y, 1) || insideCastle(x, y, 9)) continue;
      lily(p, v(size, size, size), horizontal.clone().multiply(yaw(random() * Math.PI * 2)), [0x89985a, 0x63723e, 0x758750][index % 3]!);
    }
  }
  resetRandom(59);
  for (let index = 0; index < 18; index++) {
    mist(world({ x: random() * map.columns, y: random() * map.rows }).setY(0.18 + random() * 0.1),
      v(12 + random() * 12, 7 + random() * 8, 1), horizontal);
  }

  // Use the exact same full-size walls, towers, keep and courtyard as the lava citadel.
  const local = (x: number, y: number, z: number) => v(x, y, z).applyQuaternion(gateRotation).add(gate);
  const fortressMarker = new THREE.Group();
  fortressMarker.name = "swampFortress";
  fortressMarker.visible = !map.castle.modelUrl;
  fortressMarker.position.copy(gate);
  fortressMarker.quaternion.copy(gateRotation);
  root.add(fortressMarker);
  const castleStone = new THREE.MeshStandardMaterial({ color: 0x696872, roughness: 0.82, metalness: 0.05, bumpMap: detail, bumpScale: 0.18 });
  const castleDarkStone = new THREE.MeshStandardMaterial({ color: 0x45434c, roughness: 0.9, metalness: 0.03, bumpMap: detail, bumpScale: 0.16 });
  const castleRoof = new THREE.MeshStandardMaterial({ color: 0x202936, roughness: 0.64, metalness: 0.18, bumpMap: detail, bumpScale: 0.18 });
  const architecture = createCitadelArchitecture(castleStone, castleDarkStone, castleRoof, { bumpMap: () => detail });
  batchCitadelArchitecture(architecture);
  // The shared front gate is at local Z=13.05; align it with the configured cell.
  // Courtyard top is local Y=0.3, so it stays level with the swamp path at Y=0.06.
  architecture.position.set(0, -0.24, -13.05);
  fortressMarker.add(architecture);
  // The castle sits on a low muddy island, not a rectangular stone pedestal.
  // Its irregular shoreline dips into the water while the courtyard stays paved.
  resetRandom(71);
  const shore = new THREE.Shape();
  const shoreline: Array<{ x: number; z: number }> = [];
  for (let index = 0; index < 48; index++) {
    const angle = index / 48 * Math.PI * 2;
    const radius = 1 + Math.sin(angle * 5 + 0.4) * 0.055 + Math.cos(angle * 9) * 0.025;
    const x = Math.cos(angle) * 28 * radius;
    const z = -17.05 + Math.sin(angle) * 28 * radius;
    shoreline.push({ x, z });
    if (index === 0) shore.moveTo(x, -z); else shore.lineTo(x, -z);
  }
  shore.closePath();
  const marshGeometry = createMarshFoundation(shore, 0.85);
  const vertices = marshGeometry.getAttribute("position");
  const colors: number[] = [];
  const mudColor = new THREE.Color(0x3f3b2b);
  const mossColor = new THREE.Color(0x48543a);
  for (let index = 0; index < vertices.count; index++) {
    const x = vertices.getX(index), z = vertices.getZ(index);
    const patch = (Math.sin(x * 0.41 + Math.cos(z * 0.22)) * Math.cos(z * 0.37) + 1) / 2;
    const color = mudColor.clone().lerp(mossColor, patch);
    if (vertices.getY(index) < 0.4) color.multiplyScalar(0.65);
    colors.push(color.r, color.g, color.b);
  }
  marshGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const marshGround = new THREE.Mesh(marshGeometry, new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.98, metalness: 0,
    bumpMap: detail, bumpScale: 0.035,
  }));
  marshGround.name = "swampCastleGround";
  marshGround.position.copy(local(0, -1.12, 0));
  marshGround.quaternion.copy(gateRotation);
  marshGround.receiveShadow = true;
  root.add(marshGround);
  for (let index = 0; index < 160; index++) {
    const edge = shoreline[index % shoreline.length]!;
    const inset = 0.83 + random() * 0.15;
    const x = edge.x * inset;
    const z = -17.05 + (edge.z + 17.05) * inset;
    if (Math.abs(x) < 21 && z > -39 && z < 2) continue;
    const p = local(x, -0.15, z);
    if (path.some((point) => world(point).distanceTo(p) < map.cellSize)
      || (map.buildableTiles ?? []).some((point) => world(point).distanceTo(p) < map.cellSize)) continue;
    if (index % 3 === 0) {
      marshMoss(p, v(0.7 + random() * 1.3, 0.08, 0.6 + random()), gateRotation);
    }
    for (let blade = 0; blade < 3; blade++) {
      const height = 0.3 + random() * 0.6;
      reeds(p.clone().add(v((random() - 0.5) * 0.6, height / 2, (random() - 0.5) * 0.6)),
        v(1, height, 1), yaw(random() * 6), index % 2 ? 0x64633d : 0x4e5937);
    }
  }
  for (const x of [-5, 5]) torch(local(x, 0, 2.1));
  // Replace the small decorative buildings with irregular basalt outcrops.
  for (const [index, island] of (settings?.islands ?? []).slice(7).filter((island) => !island.spawnArea).entries()) {
    resetRandom(0x80000 + index);
    const p = world(island);
    for (let rockIndex = 0; rockIndex < 5; rockIndex++) {
      const angle = rockIndex * 2.4 + random() * 0.4;
      const distance = rockIndex === 0 ? 0 : 1.3 + random() * 1.2;
      const radius = rockIndex === 0 ? 1.7 : 0.65 + random() * 0.65;
      const height = rockIndex === 0 ? 1.7 : 0.6 + random() * 0.65;
      const position = p.clone().add(v(Math.cos(angle) * distance, height * 0.45 - 0.15, Math.sin(angle) * distance));
      const cell = { x: island.x + Math.cos(angle) * distance / map.cellSize, y: island.y + Math.sin(angle) * distance / map.cellSize };
      if (occupied(cell.x, cell.y, 0.9)) continue;
      cliffs(position, v(radius, height, radius * (0.7 + random() * 0.25)), yaw(random() * Math.PI * 2));
    }
  }
  path.filter((_, index) => index % 9 === 0).forEach((point, index) => {
    const p = world(point).add(v((index % 2 ? 1 : -1) * map.cellSize * 0.85, 0, 0)); torch(p);
    if (index % 2 === 0) {
      metal(p.clone().add(v(0, 2.3, 0)), v(0.1, 4.6, 0.1));
      banners(p.clone().add(v(0.6, 3, 0)), v(1.15, 1.9, 0.05));
    }
  });
  const matrix = new THREE.Matrix4();
  for (const group of batches) {
    if (["swampCastleReeds", "swampCastleMoss", "swampRockwork"].includes(group.name)) {
      group.items = group.items.filter((item) => !(map.spawnPoints ?? []).some((point) => {
        const portal = world(point);
        return Math.hypot(portal.x - item.position.x, portal.z - item.position.z) < map.cellSize * 1.8;
      }));
    }
    if (!group.items.length) { group.geometry.dispose(); continue; }
    const mesh = new THREE.InstancedMesh(group.geometry, group.material, group.items.length); mesh.name = group.name;
    group.items.forEach((item, index) => {
      if (group.name === "swampLilyPads" || group.name === "swampLowMist") item.position.y -= groundLift;
      matrix.compose(item.position, item.rotation, item.scale); mesh.setMatrixAt(index, matrix);
      if (item.color) mesh.setColorAt(index, item.color);
    });
    mesh.receiveShadow = true; mesh.castShadow = false;
    if (group.name === "swampLowMist") mesh.renderOrder = 2;
    if (group.name === "swampTorchFlames") mesh.renderOrder = 3;
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
    if (group.name === "swampPathPaving") mesh.userData.pathCells = path.map((point) => ({ x: point.x + padding, y: point.y + padding }));
  }
  // Few shared lights rather than one dynamic light/shadow pass per torch.
  const moon = new THREE.DirectionalLight(0x9dbab9, 0.65); moon.position.set(-30, 45, 10); root.add(moon);
  const gateLight = new THREE.PointLight(0xff9744, 13, 24, 2); gateLight.position.copy(local(0, 4, 1)); root.add(gateLight);
  return {
    tileMeshes,
    update: (elapsed: number) => {
      waterMaterial.uniforms.uTime!.value = elapsed;
      flameMaterial.uniforms.uTime!.value = elapsed;
    },
  };
}
