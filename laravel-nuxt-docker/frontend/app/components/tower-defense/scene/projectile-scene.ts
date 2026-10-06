import * as THREE from "three";
import type { Projectile, Tower } from "~/types/games/towerDefense";
import type {
  ManagedTowerModelDefinition,
  ProjectileVisualKind,
  TowerVisualEffectDefinition,
} from "./tower-models";
import {
  createTowerDefenseProjectileTemplate,
  configureTowerDefenseThunderVisual,
  decorateTowerDefenseProjectileLevel,
  decorateTowerDefenseProjectileVisual,
} from "./projectile-visuals";

interface ProjectileSceneOptions {
  surfaceDetail: THREE.DataTexture | null;
  worldPosition: (x: number, y: number) => THREE.Vector3;
  towerModels: ReadonlyMap<number, THREE.Group>;
  managedTowerModels?: Partial<Record<string, ManagedTowerModelDefinition>>;
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
  { surfaceDetail, worldPosition, towerModels, managedTowerModels }: ProjectileSceneOptions,
): TowerDefenseProjectileScene {
  const templates = new Map<ProjectileVisualKind, THREE.Group>();
  const models = new Map<number, { group: THREE.Group; bornAt: number }>();
  const modelPool = new Map<string, THREE.Group[]>();
  const activeProjectileIds = new Set<number>();
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

  for (const kind of [
    "archer",
    "cannon",
    "frost",
    "fire",
    "thunder",
    "water",
  ] as const)
    templates.set(kind, createTowerDefenseProjectileTemplate(kind, surfaceDetail));

  function projectileEffects(projectile: Projectile) {
    return managedTowerModels?.[projectile.sourceTowerKind ?? projectile.kind]
      ?.visualEffects?.filter(
        (effect) =>
          effect.type === "projectile" &&
          effect.enabled &&
          (!effect.level || effect.level === projectile.level),
      ) ?? [];
  }

  function projectileEffectKey(effects: TowerVisualEffectDefinition[]) {
    if (!effects.length) return "default";
    return effects.map((effect) => [
      effect.id, effect.color, effect.glowColor, effect.size, effect.opacity,
      effect.pulseSpeed, effect.trailLength, effect.trailOpacity, effect.projectileKind,
    ].join(":")).join("|");
  }

  /** Clone projectile render-side; `sync` sẽ đặt nó tại điểm bắn ngay trong frame hiện tại. */
  function createProjectile(projectile: Projectile, now: number) {
    const effects = projectileEffects(projectile);
    const visualKind = effects.find((effect) => effect.projectileKind)?.projectileKind ?? projectile.kind as ProjectileVisualKind;
    const poolKey = [projectile.kind, projectile.level, visualKind, projectileEffectKey(effects)].join(":");
    const pooled = modelPool.get(poolKey)?.pop();
    if (pooled) {
      pooled.visible = true;
      pooled.quaternion.identity();
      scene.add(pooled);
      return { group: pooled, bornAt: now };
    }
    const template = templates.get(visualKind);
    if (!template) throw new Error("Missing projectile template: " + visualKind);
    const group = template.clone(true);
    group.userData.poolKey = poolKey;
    group.userData.projectileVisualKind = visualKind;
    const levelScale = 1 + (projectile.level - 1) * 0.2;
    group.scale.setScalar(levelScale);
    group.userData.levelScale = levelScale;
    decorateTowerDefenseProjectileLevel(group, visualKind, projectile.level);
    if (visualKind === "thunder" && effects[0])
      configureTowerDefenseThunderVisual(group, effects[0]);
    else effects.forEach((effect) => decorateTowerDefenseProjectileVisual(group, effect));
    scene.add(group);
    return { group, bornAt: now };
  }

  function recycleProjectile(group: THREE.Group) {
    group.removeFromParent();
    group.visible = false;
    const poolKey = String(group.userData.poolKey);
    const pool = modelPool.get(poolKey) ?? [];
    // Giữ lại high-water mark của từng loại/cấp. Các clone dùng chung GPU
    // resource với template nên tái sử dụng an toàn hơn dispose giữa trận.
    pool.push(group);
    modelPool.set(poolKey, pool);
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
    activeProjectileIds.clear();
    for (const projectile of projectiles)
      activeProjectileIds.add(projectile.id);
    for (const [id, item] of models) {
      if (activeProjectileIds.has(id)) continue;
      recycleProjectile(item.group);
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

      const visualKind = (item.group.userData.projectileVisualKind ?? projectile.kind) as ProjectileVisualKind;
      const sourceTowerKind = projectile.sourceTowerKind ?? projectile.kind;
      const configuredProjectileEffect = projectileEffects(projectile)[0];
      const configuredLaunchHeight = configuredProjectileEffect?.heightRatio;
      item.group.traverse((configuredVisual) => {
        if (configuredVisual.name !== "managedProjectileVisual") return;

        const baseScale = Number(configuredVisual.userData.baseScale) || 1;
        const pulseSpeed = Number(configuredVisual.userData.pulseSpeed) || 0;
        const pulse = 1 + Math.sin(elapsed * pulseSpeed + projectile.id) * 0.1;
        configuredVisual.scale.setScalar(baseScale * pulse);
        configuredVisual.rotateZ(frameDelta * pulseSpeed * 0.35);
      });

      // Tâm ô grid là vị trí mặc định; từng loại tháp có thể hiệu chỉnh `from`.
      const from = worldPosition(projectile.from.x, projectile.from.y);
      const to = worldPosition(projectile.to.x, projectile.to.y);
      const sourceGroundY = from.y;
      const targetHeight = to.y + 0.45;
      let startHeight = sourceGroundY + 0.72;
      let arcHeight = 1.15;

      if (projectile.kind === "archer") {
        const sourceTower = towers.find(
          (tower) =>
            tower.x === projectile.from.x &&
            tower.y === projectile.from.y &&
            tower.kind === sourceTowerKind,
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
        const launchPoint = sourceTower ? modelLaunchPoint(sourceTower.id, configuredLaunchHeight ?? 0.78) : undefined;
        if (launchPoint) {
          from.x = launchPoint.x + (directionX / horizontalDistance) * launchOffset;
          from.z = launchPoint.z + (directionZ / horizontalDistance) * launchOffset;
          startHeight = launchPoint.y;
        } else startHeight = sourceGroundY + 1.24 * towerScale.vertical;
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
            tower.kind === sourceTowerKind,
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
        const launchPoint = sourceTower ? modelLaunchPoint(sourceTower.id, configuredLaunchHeight ?? 0.72, configuredLaunchHeight === undefined ? "towerMuzzle" : undefined) : undefined;
        if (launchPoint) {
          from.copy(launchPoint);
        }
        startHeight = launchPoint?.y ??
          sourceGroundY + 0.05 + (1.08 + 0.13 + Math.sin(0.2) * 0.9) * towerScale.vertical;
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
            tower.kind === sourceTowerKind,
        );
        const towerScale = towerScaleForLevel(sourceTower?.level ?? 1);
        const configuredLaunchPoint = sourceTower && configuredLaunchHeight !== undefined
          ? modelLaunchPoint(sourceTower.id, configuredLaunchHeight)
          : undefined;
        const elementalGlow = sourceTower
          ? towerModels
              .get(sourceTower.id)
              ?.getObjectByName("elementalTowerGlow")
          : undefined;
        if (configuredLaunchPoint) {
          from.copy(configuredLaunchPoint);
          startHeight = from.y;
        } else if (
          elementalGlow &&
          (projectile.kind === "fire" || projectile.kind === "water")
        ) {
          // World position đã bao gồm transform của model và offset riêng từng level.
          elementalGlow.getWorldPosition(from);
          startHeight = from.y;
        } else {
          startHeight = sourceGroundY + 0.05 + 1.72 * towerScale.vertical;
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

      if (visualKind === "fire") {
        const fireball = item.group.getObjectByName("fireballCore");
        if (fireball) {
          fireball.rotateZ(frameDelta * 9);
          fireball.scale.setScalar(
            1 + Math.sin(elapsed * 18 + projectile.id) * 0.1,
          );
        }
      } else if (visualKind === "thunder") {
        const bolt = item.group.getObjectByName("thunderBoltCore");
        if (bolt) {
          bolt.rotateZ(frameDelta * 18);
          bolt.scale.setScalar(
            1 + Math.sin(elapsed * 28 + projectile.id) * 0.18,
          );
        }
      } else if (visualKind === "water") {
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
    modelPool.forEach((pool) =>
      pool.forEach((group) => removeObject(group, true)),
    );
    modelPool.clear();
    templates.forEach((template) => removeObject(template, true));
    templates.clear();
  }

  return { sync, dispose };
}
