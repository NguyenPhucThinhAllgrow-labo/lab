import * as THREE from "three";
import type { TowerKind } from "~/types/games/towerDefense";

function mesh(
  geometry: THREE.BufferGeometry,
  color: number,
  options: { roughness?: number; metalness?: number; flatShading?: boolean } = {},
) {
  const item = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0.05,
      flatShading: options.flatShading ?? false,
    }),
  );
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function addFoundation(group: THREE.Group, radius: number, color: number) {
  for (let index = 0; index < 11; index++) {
    const angle = (index / 11) * Math.PI * 2;
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

function addBattlements(group: THREE.Group, y: number, radius: number, color: number) {
  for (let index = 0; index < 10; index++) {
    const angle = (index / 10) * Math.PI * 2;
    const block = mesh(new THREE.BoxGeometry(0.18, 0.18, 0.14), color);
    block.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    block.rotation.y = angle;
    group.add(block);
  }
}

function addDoor(group: THREE.Group, z: number) {
  const door = mesh(new THREE.BoxGeometry(0.2, 0.31, 0.035), 0x49301f);
  door.position.set(0, 0.31, z);
  const handle = mesh(new THREE.TorusGeometry(0.035, 0.009, 5, 10), 0xc18b3d, {
    metalness: 0.7,
    roughness: 0.25,
  });
  handle.position.set(0.045, 0.31, z + 0.025);
  group.add(door, handle);
}

function createBase(kind: "archer" | "cannon") {
  const group = new THREE.Group();
  const cannon = kind === "cannon";
  group.name = cannon ? "CannonTower3D" : "ArcherTower3D";
  addFoundation(group, cannon ? 0.48 : 0.43, cannon ? 0x55534f : 0x5c5b56);
  const base = mesh(
    new THREE.CylinderGeometry(cannon ? 0.43 : 0.39, cannon ? 0.53 : 0.49, 0.26, 16),
    cannon ? 0x454541 : 0x4e4d49,
    { roughness: 0.9 },
  );
  base.position.y = 0.13;
  const body = mesh(
    new THREE.CylinderGeometry(cannon ? 0.33 : 0.29, cannon ? 0.42 : 0.38, cannon ? 0.76 : 0.9, 16),
    cannon ? 0x918b80 : 0x9b968a,
    { roughness: 0.94 },
  );
  body.position.y = cannon ? 0.58 : 0.66;
  group.add(base, body);
  addDoor(group, cannon ? 0.46 : 0.43);
  addBattlements(group, cannon ? 1.1 : 1.2, cannon ? 0.375 : 0.39, cannon ? 0xa6a198 : 0xb1aca1);
  return group;
}

function createArcherTower() {
  const group = createBase("archer");
  const roof = mesh(new THREE.ConeGeometry(0.43, 0.4, 16), 0x263a2d, { roughness: 0.68 });
  roof.position.y = 1.64;
  const pole = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8), 0x40352b);
  pole.position.y = 2.02;
  const flag = mesh(new THREE.BoxGeometry(0.25, 0.22, 0.018), 0x344a35, { roughness: 0.9 });
  flag.name = "towerFlag";
  flag.position.set(0.13, 2.18, 0);
  group.add(roof, pole, flag);
  return group;
}

function createCannonTower() {
  const group = createBase("cannon");
  const turret = new THREE.Group();
  turret.name = "towerTurret";
  turret.position.y = 1.08;
  const cradle = mesh(new THREE.BoxGeometry(0.42, 0.24, 0.38), 0x45362b, { roughness: 0.7 });
  const barrelRig = new THREE.Group();
  barrelRig.name = "towerBarrelRig";
  barrelRig.position.y = 0.13;
  barrelRig.rotation.x = -0.2;
  const barrel = mesh(new THREE.CylinderGeometry(0.085, 0.14, 0.82, 16), 0x3e4546, {
    metalness: 0.78,
    roughness: 0.26,
  });
  barrel.name = "towerBarrel";
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.38;
  const muzzle = mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.17, 16), 0x292e2f, {
    metalness: 0.82,
    roughness: 0.22,
  });
  muzzle.name = "towerMuzzle";
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.z = 0.82;
  barrelRig.add(barrel, muzzle);
  turret.add(cradle, barrelRig);
  group.add(turret);
  return group;
}

/** Dựng fallback cùng silhouette/material với tower procedural trong gameplay. */
export function createTowerDefenseProceduralModel(kind?: TowerKind) {
  if (kind === "archer") return createArcherTower();
  if (kind === "cannon") return createCannonTower();
  return null;
}
