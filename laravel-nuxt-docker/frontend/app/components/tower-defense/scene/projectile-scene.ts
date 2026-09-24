import * as THREE from "three";
import type { Projectile, Tower } from "~/types/games/towerDefense";

interface ProjectileSceneOptions {
  surfaceDetail: THREE.DataTexture | null;
  worldPosition: (x: number, y: number) => THREE.Vector3;
  towerModels: ReadonlyMap<number, THREE.Group>;
}

export interface ProjectileSceneSyncOptions {
  projectiles: Projectile[];
  towers: Tower[];
  elapsed: number;
  frameDelta: number;
  now: number;
}

export interface TowerDefenseProjectileScene {
  sync: (options: ProjectileSceneSyncOptions) => void;
  dispose: () => void;
}

/** Quản lý trọn vòng đời hình dạng, instance và chuyển động đạn trong scene. */
export function createTowerDefenseProjectileScene(
  scene: THREE.Scene,
  { surfaceDetail, worldPosition, towerModels }: ProjectileSceneOptions,
): TowerDefenseProjectileScene {
  const templates = new Map<Projectile["kind"], THREE.Group>();
  const models = new Map<number, { group: THREE.Group; bornAt: number }>();
  const projectileDirection = new THREE.Vector3();
  const projectileLookTarget = new THREE.Vector3();

  function modelLaunchPoint(towerId: number, heightRatio: number, nodeName?: string) {
    const model = towerModels.get(towerId);
    if (!model) return undefined;
    const node = nodeName ? model.getObjectByName(nodeName) : undefined;
    if (node) return node.getWorldPosition(new THREE.Vector3());
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) return undefined;
    const point = bounds.getCenter(new THREE.Vector3());
    point.y = THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, heightRatio);
    return point;
  }

  /** Tạo material đồng nhất với các model procedural còn lại trong scene. */
  function mesh(
    geometry: THREE.BufferGeometry,
    color: number,
    options: {
      roughness?: number;
      metalness?: number;
      emissive?: number;
    } = {},
  ) {
    const roughness = options.roughness ?? 0.72;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: options.metalness ?? 0.05,
      emissive: options.emissive ?? 0,
      emissiveIntensity: options.emissive ? 1.35 : 1,
      bumpMap: roughness > 0.5 ? surfaceDetail : null,
      bumpScale: roughness > 0.5 ? 0.012 : 0,
    });
    const item = new THREE.Mesh(geometry, material);
    item.castShadow = true;
    item.receiveShadow = true;
    return item;
  }

  /** Gỡ object khỏi scene; template clone dùng chung resource nên chỉ dispose khi hủy subsystem. */
  function removeObject(object: THREE.Object3D, disposeResources = false) {
    if (disposeResources) {
      object.traverse((child) => {
        if (
          !(child instanceof THREE.Mesh) &&
          !(child instanceof THREE.Line) &&
          !(child instanceof THREE.Sprite)
        )
          return;
        if (child instanceof THREE.Mesh || child instanceof THREE.Line)
          child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((material) => material.dispose());
      });
    }
    object.removeFromParent();
  }

  /**
   * Tạo hình dạng 3D dùng chung cho từng loại đạn.
   * Hàm này chỉ dựng mesh/material, chưa quyết định đạn xuất hiện ở vị trí nào.
   */
  function createTemplate(kind: Projectile["kind"]) {
    const group = new THREE.Group();
    let shot: THREE.Mesh;
    if (kind === "archer") {
      shot = mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.42, 7),
        0xc99a58,
      );
      shot.rotation.x = Math.PI / 2;
      const arrowHead = mesh(
        new THREE.ConeGeometry(0.055, 0.13, 6),
        0xd8dde0,
        { metalness: 0.7, roughness: 0.28 },
      );
      arrowHead.rotation.x = Math.PI / 2;
      arrowHead.position.z = 0.265;
      group.add(arrowHead);
      for (const rotation of [0, Math.PI / 2]) {
        const feather = mesh(
          new THREE.BoxGeometry(0.055, 0.012, 0.11),
          0x7d342f,
          { roughness: 0.85 },
        );
        feather.position.z = -0.19;
        feather.rotation.z = rotation;
        group.add(feather);
      }
    } else if (kind === "cannon") {
      shot = mesh(new THREE.SphereGeometry(0.11, 9, 7), 0x332b25, {
        metalness: 0.7,
      });
    } else if (kind === "fire") {
      shot = mesh(new THREE.SphereGeometry(0.105, 14, 10), 0xffd052, {
        emissive: 0xe8380b,
        roughness: 0.18,
      });
      shot.name = "fireballCore";
      shot.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.185, 14, 10),
          new THREE.MeshBasicMaterial({
            color: 0xff4a18,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        ),
      );
    } else if (kind === "thunder") {
      shot = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 1),
        new THREE.MeshBasicMaterial({
          color: 0xe9ddff,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      shot.name = "thunderBoltCore";
      shot.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 12, 8),
          new THREE.MeshBasicMaterial({
            color: 0x7c3aed,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        ),
      );
    } else if (kind === "water") {
      shot = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 18, 12),
        new THREE.MeshPhysicalMaterial({
          color: 0x7dd3fc,
          emissive: 0x075985,
          emissiveIntensity: 0.75,
          roughness: 0.08,
          metalness: 0,
          transmission: 0.5,
          transparent: true,
          opacity: 0.88,
        }),
      );
      shot.name = "waterShotCore";
      shot.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 14, 10),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        ),
      );
      for (let index = 0; index < 7; index++) {
        const droplet = new THREE.Mesh(
          new THREE.SphereGeometry(0.038 + (index % 3) * 0.007, 9, 7),
          new THREE.MeshBasicMaterial({
            color: index % 2 ? 0xbae6fd : 0x38bdf8,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        const angle = (index / 7) * Math.PI * 2;
        droplet.name = "waterShotDroplet";
        droplet.userData.index = index;
        droplet.userData.angle = angle;
        droplet.position.set(
          Math.cos(angle) * 0.17,
          Math.sin(angle) * 0.12,
          0,
        );
        group.add(droplet);
      }
    } else {
      shot = mesh(new THREE.OctahedronGeometry(0.12), 0x74e8ff, {
        emissive: 0x2389a0,
      });
    }
    group.add(shot);
    return group;
  }

  for (const kind of [
    "archer",
    "cannon",
    "frost",
    "fire",
    "thunder",
    "water",
  ] as const)
    templates.set(kind, createTemplate(kind));

  /** Clone projectile render-side; `sync` sẽ đặt nó tại điểm bắn ngay trong frame hiện tại. */
  function createProjectile(projectile: Projectile, now: number) {
    const template = templates.get(projectile.kind);
    if (!template)
      throw new Error(`Missing projectile template: ${projectile.kind}`);
    const group = template.clone(true);
    const levelScale = 1 + (projectile.level - 1) * 0.2;
    group.scale.setScalar(levelScale);
    group.userData.levelScale = levelScale;
    if (projectile.kind === "archer" && projectile.level >= 2) {
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.008,
          0.018,
          0.2 + projectile.level * 0.035,
          6,
        ),
        new THREE.MeshBasicMaterial({
          color: projectile.level >= 3 ? 0xa8e878 : 0xffdfa0,
          transparent: true,
          opacity: projectile.level >= 3 ? 0.34 : 0.22,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      trail.name = "arrowTrail";
      trail.rotation.x = Math.PI / 2;
      trail.position.z = -0.34;
      group.add(trail);
    } else if (projectile.kind === "cannon" && projectile.level >= 2) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + projectile.level * 0.025, 10, 8),
        new THREE.MeshBasicMaterial({
          color: projectile.level >= 3 ? 0xff5a24 : 0xffa43d,
          transparent: true,
          opacity: 0.22 + projectile.level * 0.06,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      glow.name = "cannonShotGlow";
      group.add(glow);
    }
    scene.add(group);
    return { group, bornAt: now };
  }

  /** Scale dùng để đặt đầu nòng procedural đúng với kích thước tower từng level. */
  function towerScaleForLevel(level: number) {
    const levelScale = level === 1 ? 1 : level === 2 ? 1.13 : 1.27;
    return {
      horizontal: levelScale * 0.93,
      vertical: levelScale * 1.24,
    };
  }

  function sync({
    projectiles,
    towers,
    elapsed,
    frameDelta,
    now,
  }: ProjectileSceneSyncOptions) {
    const projectileIds = new Set(projectiles.map((item) => item.id));
    for (const [id, item] of models) {
      if (projectileIds.has(id)) continue;
      removeObject(item.group);
      models.delete(id);
    }

    for (const projectile of projectiles) {
      const item =
        models.get(projectile.id) ?? createProjectile(projectile, now);
      models.set(projectile.id, item);
      const ratio = Math.min(
        1,
        (now - item.bornAt) / (projectile.duration * 1000),
      );
      item.group.visible = ratio < 1;
      if (ratio >= 1) continue;

      // Tâm ô grid là vị trí mặc định; từng loại tháp có thể hiệu chỉnh `from`.
      const from = worldPosition(projectile.from.x, projectile.from.y);
      const to = worldPosition(projectile.to.x, projectile.to.y);
      const targetHeight = 0.45;
      let startHeight = 0.72;
      let arcHeight = 1.15;

      if (projectile.kind === "archer") {
        const sourceTower = towers.find(
          (tower) =>
            tower.x === projectile.from.x &&
            tower.y === projectile.from.y &&
            tower.kind === "archer",
        );
        const towerScale = towerScaleForLevel(sourceTower?.level ?? 1);
        const directionX = to.x - from.x;
        const directionZ = to.z - from.z;
        const horizontalDistance = Math.max(
          Math.hypot(directionX, directionZ),
          0.001,
        );

        // Mũi tên rời mép tháp thay vì xuất hiện từ tâm chân tháp. Độ vồng
        // tăng theo khoảng cách bắn để các phát xa trông tự nhiên hơn.
        const launchOffset = 0.34 * towerScale.horizontal;
        from.x += (directionX / horizontalDistance) * launchOffset;
        from.z += (directionZ / horizontalDistance) * launchOffset;
        const launchPoint = sourceTower ? modelLaunchPoint(sourceTower.id, 0.78) : undefined;
        if (launchPoint) {
          from.x = launchPoint.x + (directionX / horizontalDistance) * launchOffset;
          from.z = launchPoint.z + (directionZ / horizontalDistance) * launchOffset;
          startHeight = launchPoint.y;
        } else startHeight = 1.24 * towerScale.vertical;
        arcHeight = THREE.MathUtils.clamp(
          horizontalDistance * 0.28,
          0.55,
          1.45,
        );
      } else if (projectile.kind === "cannon") {
        const sourceTower = towers.find(
          (tower) =>
            tower.x === projectile.from.x &&
            tower.y === projectile.from.y &&
            tower.kind === "cannon",
        );
        const towerScale = towerScaleForLevel(sourceTower?.level ?? 1);
        const directionX = to.x - from.x;
        const directionZ = to.z - from.z;
        const directionLength = Math.max(
          Math.hypot(directionX, directionZ),
          0.001,
        );
        const muzzleDistance = Math.cos(0.2) * 0.9 * towerScale.horizontal;
        from.x += (directionX / directionLength) * muzzleDistance;
        from.z += (directionZ / directionLength) * muzzleDistance;
        const launchPoint = sourceTower ? modelLaunchPoint(sourceTower.id, 0.72, "towerMuzzle") : undefined;
        if (launchPoint) {
          from.copy(launchPoint);
        }
        startHeight = launchPoint?.y ??
          0.05 + (1.08 + 0.13 + Math.sin(0.2) * 0.9) * towerScale.vertical;
        arcHeight = 0.42;
      } else if (
        projectile.kind === "fire" ||
        projectile.kind === "thunder" ||
        projectile.kind === "water"
      ) {
        const sourceTower = towers.find(
          (tower) =>
            tower.x === projectile.from.x &&
            tower.y === projectile.from.y &&
            tower.kind === projectile.kind,
        );
        const towerScale = towerScaleForLevel(sourceTower?.level ?? 1);
        const elementalGlow = sourceTower
          ? towerModels
              .get(sourceTower.id)
              ?.getObjectByName("elementalTowerGlow")
          : undefined;
        if (
          elementalGlow &&
          (projectile.kind === "fire" || projectile.kind === "water")
        ) {
          // World position đã bao gồm transform của model và offset riêng từng level.
          elementalGlow.getWorldPosition(from);
          startHeight = from.y;
        } else {
          startHeight = 0.05 + 1.72 * towerScale.vertical;
        }
        arcHeight = projectile.kind === "water" ? 0.24 : 0;
      }

      const fallProgress =
        projectile.kind === "fire"
          ? Math.pow(ratio, 1.55)
          : projectile.kind === "water"
            ? THREE.MathUtils.smoothstep(ratio, 0, 1)
            : ratio;
      const movementProgress =
        projectile.kind === "water" ? fallProgress : ratio;
      item.group.position.lerpVectors(from, to, movementProgress);
      if (projectile.kind === "archer") {
        // Quỹ đạo parabol và đạo hàm của nó. Hướng mũi tên theo tiếp tuyến
        // khiến nó ngóc lên khi rời cung và chúi đầu xuống trước khi trúng đích.
        item.group.position.y =
          THREE.MathUtils.lerp(startHeight, targetHeight, ratio) +
          4 * arcHeight * ratio * (1 - ratio);
        projectileDirection.set(
          to.x - from.x,
          targetHeight - startHeight + 4 * arcHeight * (1 - 2 * ratio),
          to.z - from.z,
        );
        projectileLookTarget
          .copy(item.group.position)
          .add(projectileDirection);
        item.group.lookAt(projectileLookTarget);
      } else {
        item.group.position.y =
          THREE.MathUtils.lerp(startHeight, targetHeight, fallProgress) +
          Math.sin(movementProgress * Math.PI) * arcHeight;
        item.group.lookAt(to.x, targetHeight, to.z);
      }

      if (projectile.kind === "fire") {
        const fireball = item.group.getObjectByName("fireballCore");
        if (fireball) {
          fireball.rotateZ(frameDelta * 9);
          fireball.scale.setScalar(
            1 + Math.sin(elapsed * 18 + projectile.id) * 0.1,
          );
        }
      } else if (projectile.kind === "thunder") {
        const bolt = item.group.getObjectByName("thunderBoltCore");
        if (bolt) {
          bolt.rotateZ(frameDelta * 18);
          bolt.scale.setScalar(
            1 + Math.sin(elapsed * 28 + projectile.id) * 0.18,
          );
        }
      } else if (projectile.kind === "water") {
        const drop = item.group.getObjectByName("waterShotCore");
        if (drop) {
          const pulse = 1 + Math.sin(elapsed * 10 + projectile.id) * 0.055;
          drop.scale.set(pulse * 0.94, pulse * 0.94, pulse * 1.24);
        }
        item.group.rotateZ(
          Math.sin(elapsed * 5.5 + projectile.id * 0.7) * 0.055,
        );
        item.group.children.forEach((child) => {
          if (child.name !== "waterShotDroplet") return;
          const index = Number(child.userData.index);
          const angle =
            Number(child.userData.angle) +
            elapsed * (2.7 + (index % 2) * 0.45) +
            projectile.id;
          const radius = 0.12 + (index % 3) * 0.02;
          child.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle * 1.2) * 0.085,
            Math.sin(angle) * radius,
          );
          child.scale.setScalar(0.82 + Math.sin(elapsed * 6 + index) * 0.13);
        });
      }
    }
  }

  function dispose() {
    models.forEach((item) => removeObject(item.group, true));
    models.clear();
    templates.forEach((template) => removeObject(template, true));
    templates.clear();
  }

  return { sync, dispose };
}
