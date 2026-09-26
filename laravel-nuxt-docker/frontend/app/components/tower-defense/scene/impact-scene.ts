import * as THREE from "three";
import type { Impact } from "~/types/games/towerDefense";

interface ImpactSceneOptions {
  cellSize: number;
  worldPosition: (x: number, y: number) => THREE.Vector3;
}

export interface ImpactSceneSyncOptions {
  impacts: Impact[];
  elapsed: number;
  now: number;
  speedMultiplier: number;
}

export interface TowerDefenseImpactScene {
  sync: (options: ImpactSceneSyncOptions) => void;
  dispose: () => void;
}

/** Quản lý hiệu ứng va chạm và toàn bộ tài nguyên GPU liên quan. */
export function createTowerDefenseImpactScene(
  scene: THREE.Scene,
  { cellSize, worldPosition }: ImpactSceneOptions,
): TowerDefenseImpactScene {
  const models = new Map<number, THREE.Group>();
  const activeImpactIds = new Set<number>();
  let frostWaveTexture: THREE.CanvasTexture | null = null;
  let fireWaveTexture: THREE.CanvasTexture | null = null;

  function disposeObject(object: THREE.Object3D) {
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
    object.removeFromParent();
  }

  /** Tạo texture vòng sóng băng bằng Canvas, tránh phải tải thêm ảnh ngoài. */
  function getFrostWaveTexture() {
    if (frostWaveTexture) return frostWaveTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể tạo gradient cho sóng băng.");
    const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 126);
    gradient.addColorStop(0, "rgba(43, 135, 194, .05)");
    gradient.addColorStop(0.48, "rgba(35, 151, 207, .1)");
    gradient.addColorStop(0.72, "rgba(47, 185, 226, .24)");
    gradient.addColorStop(0.86, "rgba(106, 226, 246, .5)");
    gradient.addColorStop(0.94, "rgba(190, 249, 255, .4)");
    gradient.addColorStop(1, "rgba(54, 157, 211, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    frostWaveTexture = new THREE.CanvasTexture(canvas);
    frostWaveTexture.colorSpace = THREE.SRGBColorSpace;
    return frostWaveTexture;
  }

  /** Tạo radial texture nóng cho sóng nổ của tower lửa. */
  function getFireWaveTexture() {
    if (fireWaveTexture) return fireWaveTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể tạo gradient cho sóng lửa.");
    const gradient = context.createRadialGradient(128, 128, 3, 128, 128, 126);
    gradient.addColorStop(0, "rgba(255, 205, 76, .12)");
    gradient.addColorStop(0.46, "rgba(255, 105, 30, .16)");
    gradient.addColorStop(0.72, "rgba(239, 55, 20, .3)");
    gradient.addColorStop(0.87, "rgba(255, 145, 38, .58)");
    gradient.addColorStop(0.95, "rgba(255, 218, 112, .42)");
    gradient.addColorStop(1, "rgba(180, 25, 8, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    fireWaveTexture = new THREE.CanvasTexture(canvas);
    fireWaveTexture.colorSpace = THREE.SRGBColorSpace;
    return fireWaveTexture;
  }

  /** Dựng hiệu ứng va chạm theo loại sát thương, bán kính và level của phát bắn. */
  function createImpact(impact: Impact, now: number, speedMultiplier: number) {
    const color =
      impact.kind === "frost"
        ? 0x6ee7ff
        : impact.kind === "fire"
          ? 0xff3b1f
          : impact.kind === "thunder"
            ? 0xa78bfa
            : impact.kind === "water"
              ? 0x38bdf8
              : impact.kind === "cannon"
                ? 0xff7a2f
                : 0xffe2a1;
    const group = new THREE.Group();
    group.position.copy(worldPosition(impact.position.x, impact.position.y));
    group.userData.bornAt = now;
    group.userData.level = impact.level;
    group.userData.visualDuration =
      (impact.kind === "frost"
        ? 1050
        : impact.kind === "fire"
          ? 650
          : impact.kind === "water"
            ? 580
            : impact.kind === "thunder"
              ? 520
              : 420) / speedMultiplier;
    if (impact.kind === "frost") {
      group.position.y = 0.08;
      const radius = (impact.radius ?? 1) * cellSize;

      // Sóng gradient lan trực tiếp từ chân tháp ra toàn bộ vùng sát thương.
      const waveMaterial = (opacity: number) => {
        const material = new THREE.MeshBasicMaterial({
          map: getFrostWaveTexture(),
          color:
            impact.level >= 3
              ? 0xe4fbff
              : impact.level === 2
                ? 0x8feeff
                : 0x68d9ef,
          transparent: true,
          opacity: opacity * (0.78 + impact.level * 0.11),
          depthWrite: false,
          blending: THREE.NormalBlending,
          toneMapped: false,
        });
        return material;
      };
      const disc = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 2, radius * 2),
        waveMaterial(0.66),
      );
      disc.name = "frostCascadeWave";
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.025;
      disc.scale.set(0.01, 0.01, 0.01);
      disc.userData.baseOpacity = 0.66;
      const innerWave = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 1.45, radius * 1.45),
        waveMaterial(0.34),
      );
      innerWave.name = "frostCascadeWave";
      innerWave.rotation.x = -Math.PI / 2;
      innerWave.position.y = 0.035;
      innerWave.scale.set(0.01, 0.01, 0.01);
      innerWave.userData.baseOpacity = 0.34;

      group.userData.frostCascadeWave = [disc, innerWave];
      group.add(disc, innerWave);
    } else if (impact.kind === "fire") {
      group.position.y = 0.08;
      const radius = (impact.radius ?? 1) * cellSize;
      const waveMaterial = (opacity: number) =>
        new THREE.MeshBasicMaterial({
          map: getFireWaveTexture(),
          color:
            impact.level >= 3
              ? 0xffe06a
              : impact.level === 2
                ? 0xff8b38
                : 0xff5a28,
          transparent: true,
          opacity: opacity * (0.78 + impact.level * 0.11),
          depthWrite: false,
          blending: THREE.NormalBlending,
          toneMapped: false,
        });
      const outerWave = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 2, radius * 2),
        waveMaterial(0.68),
      );
      outerWave.rotation.x = -Math.PI / 2;
      outerWave.position.y = 0.025;
      outerWave.scale.set(0.01, 0.01, 0.01);
      outerWave.userData.baseOpacity = 0.68;
      const innerWave = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 1.45, radius * 1.45),
        waveMaterial(0.4),
      );
      innerWave.rotation.x = -Math.PI / 2;
      innerWave.position.y = 0.035;
      innerWave.scale.set(0.01, 0.01, 0.01);
      innerWave.userData.baseOpacity = 0.4;
      for (const wave of [outerWave, innerWave]) {
        wave.name = "fireBlastWave";
        wave.renderOrder = 5;
      }
      group.userData.fireBlastWaves = [outerWave, innerWave];
      group.add(outerWave, innerWave);
    } else if (impact.kind === "water") {
      group.position.y = 0.1;
      const radius = (impact.radius ?? 0.7) * cellSize;
      const up = new THREE.Vector3(0, 1, 0);
      for (let index = 0; index < 8; index++) {
        const angle = (index / 8) * Math.PI * 2;
        const jet = new THREE.Mesh(
          new THREE.ConeGeometry(0.035, 0.34 + (index % 3) * 0.06, 7),
          new THREE.MeshBasicMaterial({
            color: index % 2 ? 0xbae6fd : 0x38bdf8,
            transparent: true,
            opacity: 0.74,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        const direction = new THREE.Vector3(
          Math.cos(angle) * 0.72,
          0.86,
          Math.sin(angle) * 0.72,
        ).normalize();
        jet.name = "waterHitJet";
        jet.userData.angle = angle;
        jet.userData.index = index;
        jet.quaternion.setFromUnitVectors(up, direction);
        group.add(jet);
      }
      for (let index = 0; index < 3; index++) {
        const ripple = new THREE.Mesh(
          new THREE.RingGeometry(0.12 + index * 0.07, 0.17 + index * 0.08, 40),
          new THREE.MeshBasicMaterial({
            color: index === 1 ? 0x7dd3fc : color,
            transparent: true,
            opacity: 0.78 - index * 0.14,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        ripple.name = "waterHitRipple";
        ripple.userData.index = index;
        ripple.userData.radius = radius;
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.y = index * 0.018;
        group.add(ripple);
      }
      const dropletCount = 7 + impact.level * 2;
      for (let index = 0; index < dropletCount; index++) {
        const droplet = new THREE.Mesh(
          new THREE.SphereGeometry(0.022 + (index % 3) * 0.006, 7, 5),
          new THREE.MeshBasicMaterial({
            color: index % 2 ? 0xbae6fd : 0x38bdf8,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        droplet.name = "waterHitDroplet";
        droplet.userData.angle = (index / dropletCount) * Math.PI * 2;
        droplet.userData.index = index;
        group.add(droplet);
      }
    } else if (impact.kind === "thunder") {
      group.position.y = 0.36;
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.18 + impact.level * 0.035, 12, 8),
        new THREE.MeshBasicMaterial({
          color: 0xe9ddff,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      flash.name = "thunderHitFlash";
      group.add(flash);
      const arcCount = 5 + impact.level * 2;
      for (let index = 0; index < arcCount; index++) {
        const arc = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.012, 0.2 + (index % 3) * 0.055, 3, 5),
          new THREE.MeshBasicMaterial({
            color: index % 2 ? 0x8b5cf6 : 0xd8c8ff,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        const angle = (index / arcCount) * Math.PI * 2;
        arc.name = "thunderHitArc";
        arc.userData.angle = angle;
        arc.userData.index = index;
        arc.rotation.z = -angle;
        group.add(arc);
      }
    } else if (impact.kind === "archer") {
      group.position.y = 0.42;
      const slashCount = impact.level >= 3 ? 3 : impact.level === 2 ? 2 : 1;
      for (let index = 0; index < slashCount; index++) {
        const slash = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.24 + index * 0.035, 0.018),
          new THREE.MeshBasicMaterial({
            color: impact.level >= 3 ? 0xb5ef86 : 0xffe5a6,
            transparent: true,
            opacity: 0.88 - index * 0.13,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        slash.name = "archerHitSlash";
        slash.userData.index = index;
        slash.rotation.z = -0.62 + index * 0.62;
        slash.rotation.y = index * 0.8;
        group.add(slash);
      }
      const sparkCount = impact.level === 1 ? 3 : impact.level === 2 ? 6 : 10;
      for (let index = 0; index < sparkCount; index++) {
        const spark = new THREE.Mesh(
          new THREE.ConeGeometry(0.018, 0.13 + impact.level * 0.025, 5),
          new THREE.MeshBasicMaterial({
            color: impact.level >= 3 ? 0xb5ff82 : 0xffe2a1,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        const angle = (index / sparkCount) * Math.PI * 2;
        spark.name = "archerHitSpark";
        spark.userData.angle = angle;
        spark.userData.index = index;
        spark.rotation.z = -angle;
        group.add(spark);
      }
    } else {
      group.position.y = 0.08;
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 + impact.level * 0.035, 12, 8),
        new THREE.MeshBasicMaterial({
          color: impact.level >= 3 ? 0xffdd72 : 0xff8b38,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      flash.name = "cannonHitFlash";
      flash.position.y = 0.22;
      group.add(flash);
      const waveCount = impact.level >= 3 ? 2 : 1;
      for (let index = 0; index < waveCount; index++) {
        const wave = new THREE.Mesh(
          new THREE.RingGeometry(0.12 + index * 0.06, 0.19 + index * 0.07, 32),
          new THREE.MeshBasicMaterial({
            color: impact.level >= 3 ? 0xff5728 : color,
            transparent: true,
            opacity: 0.78 - index * 0.18,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        wave.name = "cannonHitWave";
        wave.userData.index = index;
        wave.rotation.x = -Math.PI / 2;
        group.add(wave);
      }
      const debrisCount = impact.level === 1 ? 4 : impact.level === 2 ? 7 : 12;
      for (let index = 0; index < debrisCount; index++) {
        const debris = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.025 + impact.level * 0.006, 0),
          new THREE.MeshBasicMaterial({
            color: index % 2 ? 0x3d332b : 0xff8a35,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
          }),
        );
        const angle = (index / debrisCount) * Math.PI * 2;
        debris.name = "cannonHitDebris";
        debris.userData.angle = angle;
        debris.userData.index = index;
        group.add(debris);
      }
      const smokeCount = impact.level === 1 ? 2 : impact.level === 2 ? 4 : 6;
      for (let index = 0; index < smokeCount; index++) {
        const smoke = new THREE.Mesh(
          new THREE.SphereGeometry(0.09 + (index % 2) * 0.025, 8, 6),
          new THREE.MeshBasicMaterial({
            color: 0x292824,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        );
        const angle = (index / smokeCount) * Math.PI * 2;
        smoke.name = "cannonHitSmoke";
        smoke.userData.angle = angle;
        smoke.userData.index = index;
        smoke.position.y = 0.18;
        group.add(smoke);
      }
    }
    scene.add(group);
    return group;
  }

  function sync({
    impacts,
    elapsed,
    now,
    speedMultiplier,
  }: ImpactSceneSyncOptions) {
    // Impact: giữ object sống đúng lifetime do gameplay cấp và animate theo tuổi.
    activeImpactIds.clear();
    for (const impact of impacts) activeImpactIds.add(impact.id);
    for (const [id, model] of models)
      if (!activeImpactIds.has(id)) {
        disposeObject(model);
        models.delete(id);
      }
    for (const impact of impacts) {
      const model = models.get(impact.id) ?? createImpact(impact, now, speedMultiplier);
      models.set(impact.id, model);
      const progress = THREE.MathUtils.clamp(
        (now - Number(model.userData.bornAt)) /
          Number(model.userData.visualDuration),
        0,
        1,
      );
      model.visible = progress < 1;
      if (impact.kind === "frost") {
        const waveProgress = THREE.MathUtils.smoothstep(progress, 0, 0.92);
        const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.76, 1);
        const waves = model.userData.frostCascadeWave as THREE.Mesh[];
        waves.forEach((wave, index) => {
          const delayedProgress =
            index === 0
              ? waveProgress
              : THREE.MathUtils.smoothstep(progress, 0.28, 1);
          const scale = Math.max(0.01, delayedProgress);
          wave.scale.set(scale, scale, scale);
          (wave.material as THREE.MeshBasicMaterial).opacity =
            Number(wave.userData.baseOpacity) * fade * delayedProgress;
          wave.rotation.z = (index % 2 ? -1 : 1) * elapsed * 0.18;
        });
      } else if (impact.kind === "fire") {
        const waveProgress = THREE.MathUtils.smoothstep(progress, 0, 0.9);
        const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.68, 1);
        const waves = model.userData.fireBlastWaves as THREE.Mesh[];
        waves.forEach((wave, index) => {
          const delayedProgress =
            index === 0
              ? waveProgress
              : THREE.MathUtils.smoothstep(progress, 0.2, 1);
          const scale = Math.max(0.01, delayedProgress);
          wave.scale.set(scale, scale, scale);
          (wave.material as THREE.MeshBasicMaterial).opacity =
            Number(wave.userData.baseOpacity) * fade * delayedProgress;
          wave.rotation.z = (index % 2 ? -1 : 1) * elapsed * 0.22;
        });
      } else if (impact.kind === "water") {
        const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.5, 1);
        model.children.forEach((child) => {
          const material = (child as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          material.opacity =
            fade * (child.name === "waterHitRipple" ? 0.72 : 0.9);
          if (child.name === "waterHitRipple") {
            const index = Number(child.userData.index);
            const delayed = Math.max(0, progress - index * 0.1);
            child.scale.setScalar(
              0.25 + delayed * (3.2 + Number(child.userData.radius)),
            );
          } else if (child.name === "waterHitDroplet") {
            const angle = Number(child.userData.angle);
            const distance = progress * (0.38 + impact.level * 0.08);
            child.position.set(
              Math.cos(angle) * distance,
              Math.sin(progress * Math.PI) * (0.42 + impact.level * 0.08),
              Math.sin(angle) * distance,
            );
          } else if (child.name === "waterHitJet") {
            const angle = Number(child.userData.angle);
            const burst = Math.sin(progress * Math.PI);
            child.position.set(
              Math.cos(angle) * progress * 0.24,
              0.06 + burst * 0.13,
              Math.sin(angle) * progress * 0.24,
            );
            child.scale.set(1 - progress * 0.35, 0.35 + burst * 1.5, 1 - progress * 0.35);
          }
        });
      } else if (impact.kind === "thunder") {
        const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.32, 1);
        model.children.forEach((child) => {
          const material = (child as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          material.opacity =
            fade * (child.name === "thunderHitFlash" ? 0.85 : 0.95);
          if (child.name === "thunderHitFlash")
            child.scale.setScalar(0.45 + Math.sin(progress * Math.PI) * 2.1);
          else if (child.name === "thunderHitArc") {
            const angle = Number(child.userData.angle);
            const distance = progress * (0.42 + impact.level * 0.09);
            child.position.set(
              Math.cos(angle) * distance,
              Math.sin(progress * Math.PI) * 0.35,
              Math.sin(angle) * distance,
            );
            child.scale.y =
              0.7 + Math.sin(elapsed * 35 + Number(child.userData.index)) * 0.3;
          }
        });
      } else if (impact.kind === "archer") {
        const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.45, 1);
        model.children.forEach((child) => {
          const material = (child as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          material.opacity =
            fade * (child.name === "archerHitSlash" ? 0.92 : 0.95);
          if (child.name === "archerHitSlash") {
            const index = Number(child.userData.index);
            child.scale.set(
              0.7 + progress * 0.7,
              1 + progress * (1.1 + impact.level * 0.2),
              1,
            );
            child.rotation.z += index % 2 ? -0.07 : 0.07;
          } else if (child.name === "archerHitSpark") {
            const angle = Number(child.userData.angle);
            const distance = progress * (0.35 + impact.level * 0.12);
            child.position.set(
              Math.cos(angle) * distance,
              Math.sin(progress * Math.PI) * (0.24 + impact.level * 0.07),
              Math.sin(angle) * distance,
            );
          }
        });
      } else {
        const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.5, 1);
        model.children.forEach((child) => {
          const material = (child as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          material.opacity = fade * (child.name === "cannonHitWave" ? 0.72 : 0.9);
          if (child.name === "cannonHitFlash") {
            child.scale.setScalar(
              0.7 + Math.sin(progress * Math.PI) * (1.5 + impact.level * 0.25),
            );
            material.opacity = fade * 0.72;
          } else if (child.name === "cannonHitWave") {
            const index = Number(child.userData.index);
            const delayed = Math.max(0, progress - index * 0.12);
            child.scale.setScalar(1 + delayed * (3.2 + impact.level * 0.7));
            child.rotation.z += index ? -0.08 : 0.1;
          } else if (child.name === "cannonHitDebris") {
            const angle = Number(child.userData.angle);
            const distance = progress * (0.42 + impact.level * 0.15);
            child.position.set(
              Math.cos(angle) * distance,
              Math.sin(progress * Math.PI) * (0.3 + impact.level * 0.1),
              Math.sin(angle) * distance,
            );
            child.rotation.x += 0.14;
            child.rotation.y += 0.1;
          } else if (child.name === "cannonHitSmoke") {
            const index = Number(child.userData.index);
            const angle = Number(child.userData.angle);
            const spread = 0.08 + progress * (0.16 + impact.level * 0.035);
            child.position.set(
              Math.cos(angle) * spread,
              0.18 + progress * (0.48 + (index % 2) * 0.12),
              Math.sin(angle) * spread,
            );
            child.scale.setScalar(0.65 + progress * (1.25 + impact.level * 0.12));
            material.opacity = fade * 0.42;
          }
        });
      }
    }
  }

  function dispose() {
    models.forEach(disposeObject);
    models.clear();
    frostWaveTexture?.dispose();
    frostWaveTexture = null;
    fireWaveTexture?.dispose();
    fireWaveTexture = null;
  }

  return { sync, dispose };
}
