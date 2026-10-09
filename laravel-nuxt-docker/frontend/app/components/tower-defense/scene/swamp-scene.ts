import * as THREE from "three";
import { createSwampPadGeometry } from "./swamp-pad-geometry";
import { createSwampWaterContact } from "./swamp-water-contact";
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
  const necropolis = settings?.style === "necropolis";
  // ID fallback also upgrades existing DB maps without replacing admin layouts.
  const winter = settings?.style === "moonfrost" || inputMap.id === "moonfrost-lake";
  const root = new THREE.Group(); root.name = "gothicSwampEnvironment";
  const groundLift = mapSpacePosition(inputMap, { x: 0, y: 0 }).baseY;
  root.position.y = groundLift;
  scene.add(root);
  let seed = settings?.seed ?? 7319;
  const resetRandom = (stream: number) => { seed = ((settings?.seed ?? 7319) ^ Math.imul(stream, 0x9e3779b1)) >>> 0; };
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const world = (point: GridPoint) => { const p = mapSpacePosition(map, point); return new THREE.Vector3(p.x, 0, p.z); };
  const stone = new THREE.MeshStandardMaterial({ color: necropolis ? 0x68717e : 0x70746c, roughness: 0.95, bumpMap: detail, bumpScale: 0.055 });
  const pavingStone = stone.clone();
  if (necropolis) {
    pavingStone.color.setHex(0x9b9382);
    pavingStone.roughness = 1;
    pavingStone.bumpScale = 0.09;
  }
  pavingStone.polygonOffset = true;
  pavingStone.polygonOffsetFactor = -1;
  pavingStone.polygonOffsetUnits = -1;
  const cliff = new THREE.MeshStandardMaterial({ color: necropolis ? 0x303743 : 0x343d38, roughness: 1, flatShading: true });
  const spawnGround = new THREE.MeshStandardMaterial({ color: necropolis ? 0x454953 : 0x4b5138, roughness: 0.98, bumpMap: detail, bumpScale: 0.035 });
  const trailSoil = spawnGround.clone();
  trailSoil.color.setHex(0x665b49);
  trailSoil.bumpScale = 0.14;
  const islandSoil = spawnGround.clone(); islandSoil.vertexColors = true; islandSoil.bumpScale = 0.11;
  const islandCliff = cliff.clone(); islandCliff.vertexColors = true;
  const wood = new THREE.MeshStandardMaterial({ color: 0x302a25, roughness: 0.97 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x292f31, roughness: 0.72, metalness: 0.55 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8b7549, roughness: 0.72, metalness: 0.45 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x505e37, roughness: 1, side: THREE.DoubleSide });
  const banner = new THREE.MeshStandardMaterial({ color: 0x501e24, roughness: 0.95, side: THREE.DoubleSide });
  if (winter) {
    stone.color.setHex(0x73869f);
    pavingStone.color.setHex(0x9b9b97);
    pavingStone.bumpScale = 0.1;
    cliff.color.setHex(0x334c70);
    spawnGround.color.setHex(0x586b83);
    islandSoil.color.setHex(0x586b83);
    islandCliff.color.setHex(0x506b92);
    islandSoil.vertexColors = false;
    islandCliff.vertexColors = false;
    iron.color.setHex(0x283b59);
    banner.color.setHex(0x203e8c);
    // Procedural stone grain and hairline fractures: no external bitmap assets.
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const fleck = grain - Math.floor(grain);
      const fracture = Math.abs(x - 38 - y * 0.22 - Math.sin(y * 0.15) * 2.5) < 0.7
        || (y > 70 && Math.abs(x - 92 + (y - 70) * 0.4 - Math.sin(y * 0.19)) < 0.6);
      const shade = fracture ? 145 : Math.round(220 + fleck * 30);
      const offset = (y * 128 + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = shade;
      pixels[offset + 3] = 255;
    }
    const masonryTexture = new THREE.DataTexture(pixels, 128, 128, THREE.RGBAFormat);
    masonryTexture.colorSpace = THREE.SRGBColorSpace;
    masonryTexture.magFilter = THREE.LinearFilter;
    masonryTexture.minFilter = THREE.LinearMipmapLinearFilter;
    masonryTexture.generateMipmaps = true;
    masonryTexture.needsUpdate = true;
    stone.map = masonryTexture;
    pavingStone.map = masonryTexture;
  }
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
      depth: 0.84, bevelEnabled: !winter, bevelSegments: 1, bevelSize: 0.025, bevelThickness: 0.08, steps: 1,
    });
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, -0.42, 0);
    return geometry;
  };
  const paving = batch("swampPathPaving", wornSlab(0.09), pavingStone);
  const pathGround = batch("swampPathGround", wornSlab(0.22), necropolis ? trailSoil : spawnGround);
  const cliffs = batch("swampRockwork", new THREE.IcosahedronGeometry(1, 0), cliff);
  const timber = batch("swampTimber", unitBox.clone(), wood);
  const metal = batch("swampIronwork", unitBox.clone(), iron);
  const cloth = new THREE.Shape();
  cloth.moveTo(-0.5, 0.5); cloth.lineTo(0.5, 0.5); cloth.lineTo(0.5, -0.35);
  cloth.lineTo(0.25, -0.5); cloth.lineTo(0.05, -0.32); cloth.lineTo(-0.2, -0.5); cloth.lineTo(-0.5, -0.35); cloth.closePath();
  const banners = batch("swampBanners", new THREE.ShapeGeometry(cloth), banner);
  // Branch ends overlap other branches or the ground; omit their hidden caps.
  const cylinders = batch("swampTreeBranches", new THREE.CylinderGeometry(0.7, 1, 1, 4, 1, true), wood);
  const crowns = batch("swampGothicRoofs", new THREE.ConeGeometry(1, 1, 6), iron);
  const bridgeArches = batch("swampBridgeArches", new THREE.TorusGeometry(1, 0.13, 5, 12, Math.PI), stone);
  const padStone = stone.clone(); padStone.color.setHex(necropolis ? 0x505968 : 0x535b51); padStone.roughness = 0.98;
  padStone.vertexColors = true; padStone.flatShading = true;
  if (winter) padStone.color.setHex(0x879dbc);
  if (necropolis) {
    padStone.vertexColors = false;
    padStone.color.setHex(0x857d70);
    padStone.bumpScale = 0.13;
  }
  const padTrim = bronze.clone(); padTrim.color.setHex(0x8a8060); padTrim.metalness = 0.3;
  // Cemetery platforms are shallow chipped stone plinths, not marsh drums.
  const pads = batch("swampTowerPlatforms", necropolis ? wornSlab(0.2) : createSwampPadGeometry(), padStone);
  const padRings = batch("swampTowerPadRings", new THREE.TorusGeometry(1, 0.018, 3, 24), padTrim);
  const lilyMaterial = moss.clone();
  lilyMaterial.side = THREE.FrontSide;
  lilyMaterial.polygonOffset = true;
  lilyMaterial.polygonOffsetFactor = -1;
  lilyMaterial.polygonOffsetUnits = -1;
  const lily = batch("swampLilyPads", new THREE.CircleGeometry(1, 7, 0.14, Math.PI * 1.88), lilyMaterial);
  const marshMoss = batch("swampCastleMoss", new THREE.DodecahedronGeometry(1, 0), moss);
  // Bases sit inside the soil: keep the visible blades, not bottom faces.
  const reeds = batch("swampCastleReeds", new THREE.ConeGeometry(0.08, 1, 3, 1, true), moss);
  const foliage = batch("swampGreenTrees", new THREE.DodecahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x344a2b, roughness: 1, flatShading: true }));
  const graves = batch("swampGravestones", unitBox.clone(), cliff);
  const grass = batch("swampGrass", new THREE.ConeGeometry(0.12, 1, 3, 1, true), moss);
  const marshBanks = batch("swampMarshBanks", new THREE.DodecahedronGeometry(1, 0),
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
  const necropolisMistMaterial = necropolis || winter ? new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    forceSinglePass: true, toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec2 vOffset; uniform float uTime;
      void main(){vUv=uv; vec4 center=vec4(0.,0.,0.,1.); vec2 size=vec2(1.);
        #ifdef USE_INSTANCING
          center=instanceMatrix*center;
          size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        #endif
        vOffset=center.xz;
        center.x+=sin(uTime*.06+center.z*.035)*.7;
        center.z+=cos(uTime*.05+center.x*.04)*.5;
        // Face the camera: crossed standing sheets expose their flat edges on orbit.
        vec4 mvPosition=modelViewMatrix*center;
        mvPosition.xy+=position.xy*size;
        gl_Position=projectionMatrix*mvPosition;
      }`,
    fragmentShader: `varying vec2 vUv; varying vec2 vOffset;
      uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){vec2 p=vUv*3.+vOffset*.035+vec2(uTime*.015,-uTime*.009);
        float cloud=.32+.4*noise(p)+.16*noise(p*2.1);
        vec2 q=(vUv-.5)*2.;
        float radius=length(q)+(noise(p+7.)-.5)*.14;
        float edge=pow(1.-smoothstep(.08,1.,radius),1.6);
        float alpha=edge*cloud*${winter ? ".26" : ".46"}*smoothstep(0.,.3,vUv.y);
        gl_FragColor=vec4(vec3(.47,.53,.6),alpha);
        #include <colorspace_fragment>
      }`,
  }) : null;
  const mist = batch("swampLowMist", new THREE.PlaneGeometry(1, 1), necropolisMistMaterial ?? new THREE.MeshBasicMaterial({
    color: necropolis ? 0x9eb1ce : 0x90aaa8, map: mistTexture, transparent: true, opacity: necropolis ? 0.32 : 0.22,
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
    vertexShader: `varying vec2 vUv;
      void main(){ vUv=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vUv*90.; float n=noise(p*.7+vec2(${winter ? "0." : "uTime*.014"},0.));
        float ripplePhase=p.x*3.4+p.y*1.7+uTime*.45+n*3.;
        float ripple=sin(ripplePhase)*.035*(1.-smoothstep(.6,3.,fwidth(ripplePhase)));
        vec3 color=uColor*(.75+n*.45)+vec3(.08,.13,.12)*ripple;
        ${winter ? `float cracks=1.-smoothstep(.008,.024,abs(sin(p.x*.63+noise(p*.2)*3.)*sin(p.y*.47+noise(p*.3)*2.)));
        float icePatch=smoothstep(.64,.82,noise(p*.17+9.));
        float reflection=pow(max(0.,sin(p.y*8.+noise(p*.6)*4.+uTime*.1)),18.);
        color=mix(vec3(.008,.018,.042),vec3(.025,.055,.105),n);
        color=mix(color,vec3(.11,.2,.32),icePatch*.65);
        color+=vec3(.09,.13,.18)*cracks*icePatch*.2;
        color+=vec3(.025,.035,.05)*reflection;` : ""}
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment> }`,
  });
  const groundMaterial = necropolis ? new THREE.MeshStandardMaterial({
    color: 0x333b48, roughness: 1, bumpMap: detail, bumpScale: 0.12,
  }) : waterMaterial;
  if (necropolis) waterMaterial.dispose();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(map.columns * map.cellSize + 70, map.rows * map.cellSize + 70), groundMaterial);
  water.name = necropolis ? "necropolisBurialGround" : "swampWater";
  water.rotation.x = -Math.PI / 2;
  // Raise the banks rather than lowering the playable surface underneath
  // enemies' feet: the recessed road stays aligned with gameplay projection.
  water.position.y = necropolis ? 0.22 : winter ? -9 : -0.65 - groundLift;
  if (necropolis && groundMaterial instanceof THREE.MeshStandardMaterial) {
    // Cut the raised surrounding soil around lanes/pads, so recessed paving
    // remains visible rather than being buried under an opaque ground plane.
    const resolution = 1024;
    const width = map.columns * map.cellSize + 70;
    const depth = map.rows * map.cellSize + 70;
    const mask = new Uint8Array(resolution * resolution * 4).fill(255);
    const cut = (point: GridPoint, halfWidth: number, circular: boolean) => {
      const p = world(point);
      const left = Math.max(0, Math.floor((0.5 + (p.x - halfWidth) / width) * resolution));
      const right = Math.min(resolution - 1, Math.ceil((0.5 + (p.x + halfWidth) / width) * resolution));
      const bottom = Math.max(0, Math.floor((0.5 - (p.z + halfWidth) / depth) * resolution));
      const top = Math.min(resolution - 1, Math.ceil((0.5 - (p.z - halfWidth) / depth) * resolution));
      for (let y = bottom; y <= top; y++) for (let x = left; x <= right; x++) {
        const dx = ((x + 0.5) / resolution - 0.5) * width - p.x;
        const dz = (0.5 - (y + 0.5) / resolution) * depth - p.z;
        if (circular ? Math.hypot(dx, dz) <= halfWidth : Math.abs(dx) <= halfWidth && Math.abs(dz) <= halfWidth) {
          mask[(y * resolution + x) * 4 + 1] = 0;
        }
      }
    };
    for (const point of map.paths.flat()) cut(point, map.cellSize * 0.49, false);
    for (const point of map.buildableTiles ?? []) cut(point, map.cellSize * 0.65, true);
    const recess = new THREE.Mesh(water.geometry, groundMaterial.clone());
    recess.name = "necropolisRecessFloor";
    recess.rotation.copy(water.rotation);
    recess.position.y = -0.18;
    root.add(recess);
    const alphaMap = new THREE.DataTexture(mask, resolution, resolution, THREE.RGBAFormat);
    alphaMap.needsUpdate = true;
    groundMaterial.alphaMap = alphaMap;
    groundMaterial.alphaTest = 0.5;
  }
  root.add(water);
  scene.fog = new THREE.Fog(map.theme.background, map.theme.fogNear, map.theme.fogFar);

  // Irregular islands; raised walkways are kept level with gameplay ground.
  for (const [islandIndex, island] of (necropolis ? [] : settings?.islands ?? []).entries()) {
    if (winter && !(map.spawnPoints ?? []).some((point) => point.x === island.x && point.y === island.y)
      && !(map.castle.position?.x === island.x && map.castle.position?.y === island.y)) continue;
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
    // A continuous worn dirt track, with scattered stones rather than a tiled grid.
    // Continue the same trail over bridge spans, without the old tiled cap.
    // Retain the exact gameplay lane coordinates and bridge supports.
    if (necropolis) {
      pathGround(p.clone().setY(-0.025), v(map.cellSize * 1.1, 0.12, map.cellSize * 1.1));
      for (let index = 0; index < 4; index++) {
        const size = map.cellSize * (0.15 + random() * 0.12);
        paving(p.clone().add(v((random() - 0.5) * map.cellSize * 0.72, 0.065,
          (random() - 0.5) * map.cellSize * 0.72)),
        v(size, 0.045, size * (0.65 + random() * 0.45)), yaw(random() * Math.PI),
        [0x9b9180, 0x807967, 0xb1a58e][Math.floor(random() * 3)]!);
      }
      continue;
    }
    if (!bridgeCell(point)) {
      pathGround(p.clone().setY(-0.55), v(map.cellSize, 0.98, map.cellSize), new THREE.Quaternion(), 0x747c65);
      for (const side of [-1, 1]) {
        const rock = p.clone().add(v(side * map.cellSize * 0.68, -0.35, (random() - 0.5) * map.cellSize));
        const rotation = yaw(random() * 6);
        if (!touchesPad(rock, 0.7) && !touchesRoad(rock, 0.3)) cliffs(rock, v(0.65, 0.45, 0.7), rotation);
      }
    }
    const pavingRows = winter ? 3 : 2;
    for (let row = 0; row < pavingRows; row++) for (let column = 0; column < 2; column++) {
      paving(p.clone().add(v((column - 0.5) * map.cellSize / 2 + (winter && row % 2 ? map.cellSize * 0.04 : 0),
        0, (row - (pavingRows - 1) / 2) * map.cellSize / pavingRows)),
        v(map.cellSize / 2 - 0.065, 0.12, map.cellSize / pavingRows - 0.065), yaw((random() - 0.5) * 0.055),
        (necropolis ? [0x969392, 0x787d87, 0xa7a19a] : winter ? [0x9e9d9a, 0x80858e, 0xb3afa5] : [0xb1aea0, 0x95988b, 0xc0b7a3])[Math.floor(random() * 3)]!);
    }
  }
  const fencePosts = new Set<string>();
  const railingStone = winter ? batch("moonfrostRailingStone", unitBox.clone(), stone) : null;
  const railingIron = winter ? batch("moonfrostRailingIron", unitBox.clone(), iron) : null;
  const railingSpires = winter ? batch("moonfrostRailingSpires", new THREE.ConeGeometry(1, 1, 4), stone) : null;
  const railingSnow = winter ? batch("moonfrostRailingSnow", unitBox.clone(),
    new THREE.MeshStandardMaterial({ color: 0xddeaff, roughness: 0.96 })) : null;
  const railingDiamonds = winter ? batch("moonfrostRailingDiamonds", new THREE.TorusGeometry(1, 0.035, 3, 4), iron) : null;
  for (const { from, to } of (necropolis ? [] : swampRoadFences(map.paths, map.buildableTiles ?? []))) {
    const a = world(from); const b = world(to);
    const direction = b.clone().sub(a).normalize();
    const rotation = yaw(Math.atan2(direction.x, direction.z));
    const center = a.clone().add(b).multiplyScalar(0.5);
    if (winter) {
      for (const height of [0.38, 0.92]) railingIron!(center.clone().setY(height), v(0.055, 0.065, a.distanceTo(b)), rotation);
      railingSnow!(center.clone().setY(0.963), v(0.06, 0.018, a.distanceTo(b) * 0.92), rotation);
      for (let index = 1; index <= 2; index++) {
        railingIron!(a.clone().lerp(b, index / 3).setY(0.65), v(0.035, 0.54, 0.035));
      }
      railingDiamonds!(center.clone().setY(0.65), v(0.18, 0.24, 1),
        yaw(Math.atan2(direction.x, direction.z) + Math.PI / 2));
    } else {
      for (const height of [0.45, 0.9]) metal(center.clone().setY(height), v(0.09, 0.1, a.distanceTo(b)), rotation);
    }
    if (necropolis) for (let index = 1; index < 5; index++) {
      const spike = a.clone().lerp(b, index / 5);
      metal(spike.clone().setY(0.8), v(0.065, 1.5, 0.065));
      crowns(spike.clone().setY(1.6), v(0.1, 0.22, 0.1));
    }
    for (const point of [from, to]) {
      const key = `${point.x}:${point.y}`;
      if (fencePosts.has(key)) continue;
      fencePosts.add(key);
      const post = world(point);
      if (winter) {
        railingStone!(post.clone().setY(0.52), v(0.28, 1.04, 0.28));
        railingStone!(post.clone().setY(0.13), v(0.4, 0.22, 0.4));
        railingStone!(post.clone().setY(1.07), v(0.38, 0.12, 0.38));
        railingSnow!(post.clone().setY(1.145), v(0.4, 0.025, 0.4));
        railingSpires!(post.clone().setY(1.38), v(0.2, 0.48, 0.2), yaw(Math.PI / 4));
        continue;
      }
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
    // A sideways offset can land inside the crossing lane at a bend/junction.
    // Keep the full pedestal clear of paving and tower platforms.
    if (touchesRoad(p, 0.375) || touchesPad(p, 0.375)) return false;
    boxes(p.clone().add(v(0, -0.35, 0)), v(0.7, 0.8, 0.7));
    boxes(p.clone().add(v(0, 0.55, 0)), v(0.55, 1.1, 0.55));
    metal(p.clone().add(v(0, 1.16, 0)), v(0.75, 0.18, 0.75));
    flames(p.clone().add(v(0, 1.63, 0)), v(1, 1, 1));
    return true;
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
    if (necropolis) {
      pads(p.clone().setY(padTop - 0.28 / 2), v(radius * 1.8, 0.28, radius * 1.8), yaw(Math.PI / 4));
    } else {
      pads(p.clone().setY(padTop - 1.42 / 2), v(radius, 1.42, radius));
    }
    // Account for the scaled torus tube, not only its centreline.
    if (!necropolis) padRings(p.clone().setY(padTop + radius * 0.82 * 0.018 + 0.012), v(radius * 0.82, radius * 0.82, 1), horizontal);
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
    if (necropolis) {
      // Dry shattered stone rather than grassy reed islands over a lake.
      for (let rock = 0; rock < 5; rock++) {
        const angle = random() * Math.PI * 2, distance = random() * radius;
        cliffs(p.clone().add(v(Math.cos(angle) * distance, -0.35, Math.sin(angle) * distance)),
          v(0.8 + random() * 2, 0.35 + random() * 0.8, 0.8 + random() * 2), rotation);
      }
      return;
    }
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
  for (let attempts = 0; thickets.length < (necropolis ? 28 : 48) && attempts < 600; attempts++) {
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
  for (let attempts = 0; edgeThickets.length < (necropolis ? 36 : 64) && attempts < 700; attempts++) {
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
    if (necropolis) {
      // Keep cemetery decoration sites, but no raised swamp land patches.
      edgeLands.push({ center, rotation, radiusX, radiusZ });
      return;
    }
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
    if (!necropolis && index % 2 === 0 && clear(tree)) {
      timber(tree.clone().add(v(0, height / 2, 0)), v(0.23, height, 0.23), yaw(random() * 6));
      foliage(tree.clone().add(v(0, height, 0)), canopy);
      foliage(tree.clone().add(v(0.65, height - 0.6, 0.35)), canopy.clone().multiplyScalar(0.65));
    }
    for (let grave = 0; grave < (necropolis ? 6 : index % 3 === 0 ? 3 : 1); grave++) {
      resetRandom(0x60000 + index * 16 + grave);
      const p = sample(), rotation = yaw(random() * 6);
      const height = 0.6 + random() * 0.35;
      if (!clear(p)) continue;
      graves(p.clone().add(v(0, 0.04, 0)), v(0.75, 0.12, 1.3), rotation);
      graves(p.clone().add(v(0, height / 2, 0)), v(0.45, height, 0.16), rotation);
      graves(p.clone().add(v(0, height * 0.75, 0)), v(0.65, 0.12, 0.18), rotation);
    }
    for (let patch = 0; patch < (necropolis ? 0 : 24); patch++) {
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
  for (let cluster = 0; !necropolis && cluster < lilyClusters.length; cluster++) {
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
  for (let index = 0; index < (necropolis ? 64 : winter ? 28 : 18); index++) {
    const position = world({ x: random() * map.columns, y: random() * map.rows });
    if (necropolis || winter) mist(position.clone().setY((winter ? -3.5 : 1.3) + random() * 0.8),
      v(21 + random() * 12, winter ? 2.5 : 4 + random() * 2.5, 1));
    else mist(position.clone().setY(0.18 + random() * 0.1),
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
  if (!necropolis) {
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
    const mudColor = new THREE.Color(winter ? 0x586b83 : necropolis ? 0x383b44 : 0x3f3b2b);
    const mossColor = new THREE.Color(winter ? 0x8093ae : necropolis ? 0x505966 : 0x48543a);
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
    for (let index = 0; !necropolis && index < 160; index++) {
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
    const p = world(point).add(v((index % 2 ? 1 : -1) * map.cellSize * 0.85, 0, 0));
    if (!torch(p)) return;
    if (index % 2 === 0) {
      metal(p.clone().add(v(0, 2.3, 0)), v(0.1, 4.6, 0.1));
      banners(p.clone().add(v(0.6, 3, 0)), v(1.15, 1.9, 0.05));
    }
  });
  if (necropolis) {
    // Reused low-poly instance batches: tombs, pointed arches and winged effigies.
    // These are decorative only; no extra physics, lights or loaded GLBs.
    const archShape = new THREE.Shape();
    archShape.moveTo(-1, 0); archShape.lineTo(-1, 1.5); archShape.lineTo(-0.65, 2.15);
    archShape.lineTo(0, 2.75); archShape.lineTo(0.65, 2.15); archShape.lineTo(1, 1.5);
    archShape.lineTo(1, 0); archShape.lineTo(0.78, 0); archShape.lineTo(0.78, 1.45);
    archShape.lineTo(0.48, 1.95); archShape.lineTo(0, 2.4); archShape.lineTo(-0.48, 1.95);
    archShape.lineTo(-0.78, 1.45); archShape.lineTo(-0.78, 0); archShape.closePath();
    const arches = batch("necropolisPointedArches", new THREE.ExtrudeGeometry(archShape,
      { depth: 0.24, bevelEnabled: false, steps: 1 }), stone);
    const monuments = batch("necropolisMonuments", unitBox.clone(), cliff);
    const robes = batch("necropolisStatueRobes", new THREE.ConeGeometry(1, 1, 7), stone);
    const heads = batch("necropolisStatueHeads", new THREE.SphereGeometry(1, 7, 5), stone);
    const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.lineTo(-0.3, 1.2);
    wing.lineTo(-1.1, 2.2); wing.lineTo(-2.5, 2.8); wing.lineTo(-1.85, 0.6);
    wing.lineTo(-0.7, -0.5); wing.closePath();
    const wings = batch("necropolisStatueWings", new THREE.ExtrudeGeometry(wing,
      { depth: 0.16, bevelEnabled: false, steps: 1 }), stone);
    const statue = (p: THREE.Vector3, scale = 1) => {
      monuments(p.clone().add(v(0, 0.2, 0)), v(2.1 * scale, 0.65, 1.7 * scale));
      robes(p.clone().add(v(0, 1.85 * scale, 0)), v(0.85 * scale, 2.9 * scale, 0.8 * scale));
      heads(p.clone().add(v(0, 3.25 * scale, 0)), v(0.38 * scale, 0.45 * scale, 0.38 * scale));
      for (const side of [-1, 1]) wings(p.clone().add(v(side * 0.3 * scale, 2.1 * scale, -0.25)),
        v(scale, scale, scale), yaw(side < 0 ? Math.PI : 0));
    };
    resetRandom(97);
    let tombCount = 0;
    for (const land of decoratedLand) {
      for (let attempt = 0; attempt < 6 && tombCount < 16; attempt++) {
        const angle = random() * Math.PI * 2;
        const p = land.center.clone().add(v(Math.cos(angle) * land.radius * 0.55, 0,
          Math.sin(angle) * land.radius * 0.55));
        const cell = { x: p.x / map.cellSize + (map.columns - 1) / 2, y: p.z / map.cellSize + (map.rows - 1) / 2 };
        if (touchesRoad(p, 3.2) || touchesPad(p, 3.2) || insideCastle(cell.x, cell.y, 2)) continue;
        const rotation = yaw(random() * Math.PI * 2);
        monuments(p.clone().setY(-0.12), v(4.8, 0.65, 4.8), rotation);
        if (winter || tombCount % 4 === 0) statue(p, 1.3);
        else {
          monuments(p.clone().setY(1.2), v(2.8, 2.4, 2.4), rotation);
          arches(p.clone().add(v(0, 0, 1.3).applyQuaternion(rotation)), v(1.5, 1.4, 1), rotation);
          crowns(p.clone().setY(3.6), v(2, 2.1, 2), rotation);
        }
        for (const side of [-1, 1]) {
          // Side fences leave the front open, like small cemetery enclosures.
          metal(p.clone().add(v(side * 2.15, 0.65, 0).applyQuaternion(rotation)), v(0.09, 0.12, 4.2), rotation);
          for (const end of [-1, 1]) {
            const post = p.clone().add(v(side * 2.15, 0, end * 2.1).applyQuaternion(rotation));
            monuments(post.clone().setY(1.45), v(0.38, 2.9, 0.38));
            crowns(post.clone().setY(3.1), v(0.35, 0.7, 0.35));
          }
          const torchPoint = p.clone().add(v(side * 2.1, 0, 1.7).applyQuaternion(rotation));
          torch(torchPoint);
          metal(torchPoint.clone().setY(2.3), v(0.1, 4.6, 0.1));
          banners(torchPoint.clone().add(v(0.5, 3, 0)), v(0.9, 1.7, 1));
        }
        tombCount++; break;
      }
    }
  }
  if (winter) {
    const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xddeaff, roughness: 0.96 });
    const iceMaterial = new THREE.MeshStandardMaterial({ color: 0x8fbce9, roughness: 0.32, metalness: 0.12 });
    const pineMaterial = new THREE.MeshStandardMaterial({ color: 0x243e54, roughness: 1 });
    const bankRocks = batch("moonfrostBankRocks", new THREE.IcosahedronGeometry(1, 0), cliff);
    const snow = batch("moonfrostSnowCaps", new THREE.IcosahedronGeometry(0.5, 0), snowMaterial);
    const icicles = batch("moonfrostIcicles", new THREE.ConeGeometry(1, 1, 5), iceMaterial);
    const pillars = batch("moonfrostBridgePillars", unitBox.clone(), cliff);
    const buttresses = batch("moonfrostBridgeButtresses", new THREE.CylinderGeometry(0.38, 0.68, 1, 4), stone);
    const courses = batch("moonfrostBridgeCourses", unitBox.clone(), stone);
    const padDrums = batch("moonfrostPadMasonry", new THREE.CylinderGeometry(1, 1.08, 1, 10), stone);
    const padRunes = batch("moonfrostPadRunes", unitBox.clone(), padTrim);
    const carvedStone = stone.clone();
    carvedStone.color.setHex(0x9cacc0);
    carvedStone.bumpScale = 0.16;
    const archBlocks = batch("moonfrostArchVoussoirs", unitBox.clone(), carvedStone);
    const facadeBands = batch("moonfrostFacadeBands", unitBox.clone(), carvedStone);
    const padRimBlocks = batch("moonfrostPadRimBlocks", unitBox.clone(), carvedStone);
    const panelShape = new THREE.Shape();
    panelShape.moveTo(-0.5, 0); panelShape.lineTo(-0.5, 0.65);
    panelShape.quadraticCurveTo(-0.4, 0.88, 0, 1);
    panelShape.quadraticCurveTo(0.4, 0.88, 0.5, 0.65);
    panelShape.lineTo(0.5, 0); panelShape.lineTo(0.38, 0);
    panelShape.lineTo(0.38, 0.62); panelShape.quadraticCurveTo(0.3, 0.8, 0, 0.9);
    panelShape.quadraticCurveTo(-0.3, 0.8, -0.38, 0.62);
    panelShape.lineTo(-0.38, 0); panelShape.closePath();
    const relief = batch("moonfrostButtressRelief", new THREE.ExtrudeGeometry(panelShape,
      { depth: 0.08, bevelEnabled: false, curveSegments: 4 }), carvedStone);
    const arcadeShape = new THREE.Shape();
    arcadeShape.moveTo(-0.5, 0); arcadeShape.lineTo(-0.5, 1);
    arcadeShape.lineTo(0.5, 1); arcadeShape.lineTo(0.5, 0);
    arcadeShape.lineTo(0.36, 0); arcadeShape.lineTo(0.36, 0.45);
    arcadeShape.quadraticCurveTo(0.3, 0.8, 0, 0.85);
    arcadeShape.quadraticCurveTo(-0.3, 0.8, -0.36, 0.45);
    arcadeShape.lineTo(-0.36, 0); arcadeShape.closePath();
    const arcades = batch("moonfrostBridgeArcades", new THREE.ExtrudeGeometry(arcadeShape,
      { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 5 }), stone);
    const pines = batch("moonfrostPineCrowns", new THREE.ConeGeometry(1, 1, 7), pineMaterial);
    const pineSnow = batch("moonfrostPineSnow", new THREE.ConeGeometry(1, 1, 7), snowMaterial);
    const mountains = batch("moonfrostMountains", new THREE.IcosahedronGeometry(1, 1), cliff);
    const down = new THREE.Quaternion().setFromAxisAngle(v(0, 0, 1), Math.PI);
    resetRandom(113);
    const spans = new Set<string>();
    const supportKeys = new Set<string>();
    for (const lane of map.paths) {
      for (let start = 0; start < lane.length - 1;) {
        const a = lane[start]!, next = lane[start + 1]!;
        const dx = next.x - a.x, dy = next.y - a.y;
        let end = start + 1;
        while (end + 1 < lane.length && lane[end + 1]!.x - lane[end]!.x === dx
          && lane[end + 1]!.y - lane[end]!.y === dy) end++;
        for (let from = start; from < end; from += 4) {
          const b = world(lane[Math.min(from + 4, end)]!);
          const c = world(lane[from]!);
          const key = [lane[from]!, lane[Math.min(from + 4, end)]!].map((p) => `${p.x}:${p.y}`).sort().join("/");
          if (spans.has(key)) continue;
          spans.add(key);
          const center = c.clone().add(b).multiplyScalar(0.5);
          const alongX = dx !== 0;
          const rotation = yaw(alongX ? 0 : Math.PI / 2);
          const spanWidth = c.distanceTo(b);
          for (const side of [-1, 1]) {
            const origin = center.clone().add(alongX ? v(0, -8.5, side * map.cellSize * 0.43)
              : v(side * map.cellSize * 0.43, -8.5, 0));
            arcades(origin, v(spanWidth, 8.3, 0.22), rotation);
            // Individual voussoirs follow the actual pointed opening, not a
            // semicircular torus pasted over the wall. Gaps read as mortar.
            const archPoint = (t: number) => {
              const right = t >= 0.5;
              const u = right ? (t - 0.5) * 2 : t * 2;
              const a = right ? v(0, 0.85, 0) : v(-0.36, 0.45, 0);
              const control = right ? v(0.3, 0.8, 0) : v(-0.3, 0.8, 0);
              const b = right ? v(0.36, 0.45, 0) : v(0, 0.85, 0);
              return a.multiplyScalar((1 - u) ** 2).add(control.multiplyScalar(2 * u * (1 - u)))
                .add(b.multiplyScalar(u * u)).multiply(v(spanWidth, 8.3, 1));
            };
            for (let block = 0; block < 16; block++) {
              const a = archPoint(block / 16), b = archPoint((block + 1) / 16);
              const tangent = b.clone().sub(a);
              const blockRotation = rotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(v(0, 0, 1), Math.atan2(tangent.y, tangent.x)));
              const position = a.add(b).multiplyScalar(0.5).add(v(0, 0.08, side < 0 ? -0.12 : 0.33))
                .applyQuaternion(rotation).add(origin);
              archBlocks(position, v(tangent.length() * 0.93, 0.27, 0.22), blockRotation,
                block % 3 ? 0xd7dce5 : 0xaab8ca);
            }
            for (const height of [7.5, 8.15]) facadeBands(origin.clone().add(v(0, height, side < 0 ? -0.1 : 0.32).applyQuaternion(rotation)),
              v(spanWidth, 0.16, 0.32), rotation);
          }
          for (const p of [b, c]) {
            const supportKey = `${p.x}:${p.z}:${alongX}`;
            if (supportKeys.has(supportKey)) continue;
            supportKeys.add(supportKey);
            pillars(p.clone().setY(-4.4), v(map.cellSize * 0.7, 8.2, map.cellSize * 0.7));
            for (const side of [-1, 1]) {
              const foot = p.clone().add(alongX ? v(0, -4.4, side * map.cellSize * 0.58)
                : v(side * map.cellSize * 0.58, -4.4, 0));
              buttresses(foot, v(1.9, 8.4, 1.9), yaw(Math.PI / 4));
              const outward = alongX ? v(0, 0, side) : v(side, 0, 0);
              const faceRotation = yaw(Math.atan2(outward.x, outward.z));
              relief(foot.clone().add(outward.clone().multiplyScalar(0.55)).setY(-3.5), v(0.65, 2.6, 1), faceRotation);
              for (let course = 0; course < 6; course++) {
                courses(foot.clone().setY(-0.55 - course * 1.35), v(1.05 + course * 0.08, 0.13, 1.05 + course * 0.08));
              }
            }
          }
        }
        start = end;
      }
    }
    for (const [index, point] of path.entries()) {
      const p = world(point);
      for (const side of [-1, 1]) {
        // Orient the snowy cornice to the exposed boundary, not always world Z.
        const alongX = pathKeys.has(`${point.x - 1}:${point.y}`) || pathKeys.has(`${point.x + 1}:${point.y}`);
        const edge = p.clone().add(alongX ? v(0, 0.085, side * map.cellSize * 0.45)
          : v(side * map.cellSize * 0.45, 0.085, 0));
        const edgeRotation = yaw(alongX ? Math.PI / 2 : 0);
        snow(edge, v(map.cellSize * 0.12, 0.05, map.cellSize * 0.95), edgeRotation);
        for (let tip = 0; tip < 2; tip++) {
          const height = 0.8 + random() * 1.8;
          icicles(edge.clone().add(v(0, -height / 2 - 0.08, (tip - 0.5) * map.cellSize * 0.6).applyQuaternion(edgeRotation)),
            v(0.12 + random() * 0.1, height, 0.13), down);
        }
      }
      if (index % 7 === 0) {
        for (const side of [-1, 1]) {
          const post = p.clone().add(v(side * map.cellSize * 0.65, 0, 0));
          if (touchesRoad(post, 0.1) || touchesPad(post, 0.3)) continue;
          boxes(post.clone().setY(1.3), v(0.45, 2.6, 0.45));
          crowns(post.clone().setY(2.9), v(0.4, 0.9, 0.4));
          banners(post.clone().add(v(0, 1.4, 0.28)), v(0.75, 1.7, 1));
          flames(post.clone().setY(2.75), v(0.65, 0.8, 0.65));
        }
      }
    }
    for (const point of map.buildableTiles ?? []) {
      const p = world(point), radius = padRadius;
      for (let block = 0; block < 16; block++) {
        const angle = block / 16 * Math.PI * 2;
        padRimBlocks(p.clone().add(v(Math.sin(angle) * radius * 0.98, -0.2, Math.cos(angle) * radius * 0.98)),
          v(radius * 0.36, 0.32, 0.22), yaw(angle), block % 4 ? 0xd0d9e6 : 0xa8b6cb);
      }
      for (let course = 0; course < 4; course++) {
        padDrums(p.clone().setY(-1.7 - course * 2), v(radius * (0.9 + course * 0.035), 1.96, radius * (0.9 + course * 0.035)));
      }
      for (let index = 0; index < 8; index++) {
        const angle = index / 8 * Math.PI * 2;
        padRunes(p.clone().add(v(Math.sin(angle) * radius * 0.5, 0.061, Math.cos(angle) * radius * 0.5)),
          v(0.025, 0.012, radius * 0.55), yaw(angle));
      }
      for (let index = 0; index < 10; index++) {
        const angle = index / 10 * Math.PI * 2;
        const rim = p.clone().add(v(Math.cos(angle) * radius * 0.95, 0.012, Math.sin(angle) * radius * 0.95));
        snow(rim, v(0.45, 0.035, 0.45), yaw(angle));
        const height = 0.6 + random() * 1.4;
        icicles(rim.clone().add(v(0, -height / 2 - 0.12, 0)), v(0.1, height, 0.1), down);
      }
    }
    for (const [index, point] of treePositions.entries()) {
      resetRandom(0x90000 + index);
      if (index % 2 || occupied(point.x, point.y, 1.6) || insideCastle(point.x, point.y, 3)) continue;
      const p = world(point), height = 4 + random() * 4;
      // Fir trees belong on actual islands, not isolated rock spikes in the lake.
      const onBank = edgeLands.some((land) => {
        const relative = p.clone().sub(land.center).applyQuaternion(land.rotation.clone().invert());
        return (relative.x / land.radiusX) ** 2 + (relative.z / land.radiusZ) ** 2 < 0.45;
      }) || (settings?.islands ?? []).some((island) =>
        (map.spawnPoints ?? []).some((spawn) => spawn.x === island.x && spawn.y === island.y)
        && Math.hypot(point.x - island.x, point.y - island.y) < island.radius * 0.6);
      if (!onBank) continue;
      snow(p.clone().setY(-0.06), v(2.8, 0.15, 2.6));
      for (let tier = 0; tier < 3; tier++) {
        const radius = (1.8 - tier * 0.4) * height / 6;
        const center = p.clone().add(v(0, height * (0.3 + tier * 0.22), 0));
        pines(center, v(radius, height * 0.42, radius));
        pineSnow(center.clone().add(v(0, height * 0.145, 0)), v(radius * 0.42, height * 0.13, radius * 0.42));
      }
    }
    // Extend existing land foundations down to the lake while preserving tops.
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !["swampIsland", "swampEdgeLand", "swampCastleGround"].includes(object.name)) return;
      resetRandom(131);
      object.geometry.computeBoundingBox();
      const top = object.geometry.boundingBox!.max.y;
      const bottom = object.geometry.boundingBox!.min.y;
      const originalTop = object.position.y + top * object.scale.y;
      object.scale.y = (originalTop + 9.2) / Math.max(0.01, top - bottom);
      object.position.y = originalTop - top * object.scale.y;
      // Keep sparse snow patches on the shoreline, without extra rock spikes.
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox!;
      const radiusX = (bounds.max.x - bounds.min.x) / 2;
      const radiusZ = (bounds.max.z - bounds.min.z) / 2;
      const center = v((bounds.min.x + bounds.max.x) / 2, 0, (bounds.min.z + bounds.max.z) / 2);
      // Populate existing banks in small anchored clusters, not random objects
      // scattered through the lake. Each bank has its own stable seed stream.
      if (object.name !== "swampCastleGround") {
        const bankSeed = Math.round(object.position.x * 31 + object.position.z * 71);
        for (let tree = 0; tree < 6; tree++) {
          resetRandom(0xb0000 + bankSeed + tree * 97);
          const angle = tree * 2.399;
          const distance = 0.22 + random() * 0.32;
          const p = center.clone().add(v(Math.cos(angle) * radiusX * distance, 0, Math.sin(angle) * radiusZ * distance))
            .applyQuaternion(object.quaternion).add(object.position).setY(originalTop);
          const cell = { x: p.x / map.cellSize + (map.columns - 1) / 2, y: p.z / map.cellSize + (map.rows - 1) / 2 };
          if (touchesRoad(p, 1.7) || touchesPad(p, 1.5) || insideCastle(cell.x, cell.y, 3)
            || (map.spawnPoints ?? []).some((point) => world(point).distanceTo(p) < map.cellSize * 2)) continue;
          const height = 3.6 + random() * 2.8;
          for (let tier = 0; tier < 3; tier++) {
            const radius = (1.5 - tier * 0.34) * height / 6;
            const crown = p.clone().add(v(0, height * (0.3 + tier * 0.22), 0));
            pines(crown, v(radius, height * 0.42, radius));
            pineSnow(crown.clone().add(v(0, height * 0.145, 0)), v(radius * 0.42, height * 0.13, radius * 0.42));
          }
          if (tree % 2 === 0) {
            const rock = p.clone().add(v(1.3, 0.17, -0.8));
            if (!touchesRoad(rock, 0.8) && !touchesPad(rock, 0.8)) {
              bankRocks(rock, v(0.7, 0.4, 0.55), yaw(angle));
              snow(rock.clone().add(v(0, 0.3, 0)), v(0.95, 0.07, 0.8));
            }
          }
        }
      }
      for (let index = 0; index < 18; index++) {
        const angle = index / 18 * Math.PI * 2;
        const localEdge = center.clone().add(v(Math.cos(angle) * radiusX * 0.86, 0, Math.sin(angle) * radiusZ * 0.86));
        localEdge.applyQuaternion(object.quaternion).add(object.position).setY(-4.4);
        if (index % 3 === 0) {
          snow(localEdge.clone().setY(originalTop + 0.05), v(2 + random(), 0.12, 1.8 + random()));
          const height = 0.9 + random() * 1.3;
          icicles(localEdge.clone().setY(originalTop - height / 2), v(0.13, height, 0.13), down);
        }
      }
    });
    for (let index = 0; index < 14; index++) {
      resetRandom(0xa0000 + index);
      const x = (index / 13 - 0.5) * map.columns * map.cellSize * 1.6;
      const height = 12 + random() * 15;
      const p = v(x + (random() - 0.5) * 7, height * 0.45 - 9, -map.rows * map.cellSize / 2 - 26 - random() * 9);
      mountains(p, v(8 + random() * 5, height * 0.6, 8 + random() * 6), yaw(random() * 6));
      snow(p.clone().add(v(0, height * 0.52, 0)), v(7, height * 0.06, 6));
    }
    const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xc9ddff, fog: false, toneMapped: false }));
    moonDisc.name = "moonfrostMoon";
    moonDisc.position.set(-24, 33, -map.rows * map.cellSize / 2 - 30);
    root.add(moonDisc);
  }
  const matrix = new THREE.Matrix4();
  for (const group of batches) {
    if (winter && ["swampLilyPads", "swampGrass", "swampGreenTrees", "swampCastleReeds", "swampCastleMoss", "swampTreeBranches", "swampMarshBanks", "swampRockwork", "swampGravestones"].includes(group.name)) {
      group.geometry.dispose(); continue;
    }
    if (["swampCastleReeds", "swampCastleMoss", "swampRockwork"].includes(group.name)) {
      group.items = group.items.filter((item) => !(map.spawnPoints ?? []).some((point) => {
        const portal = world(point);
        return Math.hypot(portal.x - item.position.x, portal.z - item.position.z) < map.cellSize * 1.8;
      }));
    }
    if (!group.items.length) { group.geometry.dispose(); continue; }
    const mesh = new THREE.InstancedMesh(group.geometry, group.material, group.items.length); mesh.name = group.name;
    group.items.forEach((item, index) => {
      if (group.name === "swampLilyPads" || (group.name === "swampLowMist" && !necropolis && !winter)) item.position.y -= groundLift;
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
  const moon = new THREE.DirectionalLight(winter ? 0xaccaff : 0x9dbab9, winter ? 0.9 : 0.65); moon.position.set(-30, 45, 10); root.add(moon);
  const gateLight = new THREE.PointLight(0xff9744, 13, 24, 2); gateLight.position.copy(local(0, 4, 1)); root.add(gateLight);
  const waterContact = necropolis || winter ? null : createSwampWaterContact(root, water.position.y);
  return {
    tileMeshes,
    update: (elapsed: number) => {
      if (!necropolis) waterMaterial.uniforms.uTime!.value = elapsed;
      if (necropolisMistMaterial) necropolisMistMaterial.uniforms.uTime!.value = elapsed;
      flameMaterial.uniforms.uTime!.value = elapsed;
      waterContact?.update(elapsed);
    },
  };
}
