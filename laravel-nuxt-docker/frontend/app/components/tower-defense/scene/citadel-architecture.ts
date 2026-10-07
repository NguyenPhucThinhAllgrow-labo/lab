import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CITADEL_PAVING_COLORS } from "~/utils/games/citadelBridgeLayout";

/** Shared full-size castle architecture; each map supplies its landscape and placement. */
export function createCitadelArchitecture(
  stone: THREE.Material,
  darkStone: THREE.Material,
  roof: THREE.Material,
  options: {
    bumpMap?: (pattern: "path" | "rough", repeatX: number, repeatY: number) => THREE.Texture | null;
    torch?: (parent: THREE.Object3D, x: number, y: number, z: number, scale?: number, withLight?: boolean) => unknown;
  } = {},
) {
  const createSurfaceBumpMap = options.bumpMap ?? (() => null);
  const addTorch = options.torch ?? (() => undefined);
  const fortress = new THREE.Group();
  fortress.name = "citadelArchitecture";
  const innerPaving = new THREE.MeshStandardMaterial({
    color: CITADEL_PAVING_COLORS[0],
    roughness: 0.94,
    metalness: 0.015,
    bumpMap: createSurfaceBumpMap("path", 6, 6),
    bumpScale: 0.085,
  });
  addBox(fortress, [35, 0.9, 35.5], [0, -0.15, -4], innerPaving);
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
  return fortress;

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

  function setShadow(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return object;
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

}

/** Bake static castle parts locally, keeping the full architecture without thousands of draws. */
export function batchCitadelArchitecture(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[]; geometries: THREE.BufferGeometry[] }>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)
      || object.material.transparent || object.material instanceof THREE.ShaderMaterial) return;
    const material = object.material;
    const data = material.toJSON();
    delete data.uuid; delete data.metadata; delete data.name;
    const signature = Object.keys(object.geometry.attributes).sort().map((name) => {
      const attribute = object.geometry.getAttribute(name);
      return `${name}:${attribute.itemSize}:${Number(attribute.normalized)}`;
    }).join("|");
    const key = `${JSON.stringify(data)}:${Boolean(object.geometry.index)}:${signature}`;
    let group = groups.get(key);
    if (!group) { group = { material, meshes: [], geometries: [] }; groups.set(key, group); }
    group.meshes.push(object);
    group.geometries.push(object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld)));
  });
  const discardedMaterials = new Set<THREE.Material>();
  const retainedMaterials = new Set<THREE.Material>();
  for (const group of groups.values()) {
    const geometry = mergeGeometries(group.geometries, false);
    group.geometries.forEach((item) => item.dispose());
    if (!geometry) { group.meshes.forEach((mesh) => retainedMaterials.add(mesh.material as THREE.Material)); continue; }
    const merged = new THREE.Mesh(geometry, group.material);
    merged.name = "citadelArchitectureBatch";
    merged.receiveShadow = true;
    root.add(merged); retainedMaterials.add(group.material);
    group.meshes.forEach((mesh) => {
      mesh.removeFromParent(); mesh.geometry.dispose();
      discardedMaterials.add(mesh.material as THREE.Material);
    });
  }
  discardedMaterials.forEach((material) => { if (!retainedMaterials.has(material)) material.dispose(); });
}

export function addStatue(parent: THREE.Object3D, x: number, y: number, z: number, rotationY: number, material: THREE.Material, scale = 1) {
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
  statue.traverse((child) => {
    if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; }
  });
  parent.add(statue);
  return statue;
}
