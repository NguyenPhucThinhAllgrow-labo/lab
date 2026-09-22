import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { BossClass, Enemy } from "~/types/games/towerDefense";
import {
  ADVENTURE_KIT_ROOT,
  BOSS_CHARACTER_PATHS,
  BOSS_CHARACTER_SCALE,
  BOSS_EQUIPMENT_PATHS,
  BOSS_HEALTH_BAR_Y,
  BOSS_MODEL_SCALE,
  BOSS_MOVEMENT_PATH,
  BOSS_WALK_ANIMATION_NAMES,
  DEFAULT_ENEMY_MODEL_KEY,
  ENEMY_MODEL_DEFINITIONS,
  type EquipmentTransform,
} from "./enemy-models";

type EnemyStatusKind = "fire" | "frost" | "water";

export interface EnemySceneSyncOptions {
  enemies: Enemy[];
  elapsed: number;
  frameDelta: number;
  now: number;
  pathPosition: (progress: number, lane: 0 | 1) => THREE.Vector3;
}

export interface TowerDefenseEnemyScene {
  readonly models: Map<number, THREE.Group>;
  load: () => Promise<void>;
  sync: (options: EnemySceneSyncOptions) => void;
  dispose: () => void;
}

function disposeObject(object: THREE.Object3D, disposeResources = true) {
  object.traverse((child) => {
    if (!disposeResources) return;
    if (
      !(child instanceof THREE.Mesh) &&
      !(child instanceof THREE.Sprite) &&
      !(child instanceof THREE.Line)
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

function createEnemyHealthBars(y: number) {
  const healthBars = new THREE.Group();
  healthBars.name = "enemyHealthBars";
  healthBars.position.set(0, y, 0);

  const healthBack = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.09),
    new THREE.MeshBasicMaterial({
      color: 0x401b18,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  healthBack.name = "enemyHealthBack";
  healthBack.renderOrder = 10;

  const health = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.055),
    new THREE.MeshBasicMaterial({
      color: 0x78cf58,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  health.name = "enemyHealth";
  health.position.z = 0.002;
  health.renderOrder = 11;
  healthBars.add(healthBack, health);
  return healthBars;
}

function removeRootMotion(clip: THREE.AnimationClip) {
  const normalizedClip = clip.clone();
  for (const track of normalizedClip.tracks) {
    if (!/Hips\.position$/.test(track.name) || track.values.length < 3) continue;
    const originX = track.values[0] ?? 0;
    const originZ = track.values[2] ?? 0;
    for (let index = 0; index < track.values.length; index += 3) {
      track.values[index] = originX;
      track.values[index + 2] = originZ;
    }
  }
  return normalizedClip;
}

function prepareCharacter(
  character: THREE.Group,
  characterScale: number,
  healthBarY: number,
) {
  character.rotation.y = 0;
  character.scale.setScalar(characterScale);
  character.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const cloneMaterial = (source: THREE.Material) => source.clone();
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material);
  });
  const wrapper = new THREE.Group();
  wrapper.add(character, createEnemyHealthBars(healthBarY));
  return wrapper;
}

function prepareEquipment(
  item: THREE.Object3D,
  transform?: EquipmentTransform,
) {
  item.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  item.position.set(0, 0, 0);
  item.rotation.set(0, 0, 0);
  item.scale.setScalar(1);
  const [positionX, positionY, positionZ] = transform?.position ?? [0, 0, 0];
  const [rotationX, rotationY, rotationZ] = transform?.rotation ?? [0, 0, 0];
  item.userData.attachPositionX = positionX;
  item.userData.attachPositionY = positionY;
  item.userData.attachPositionZ = positionZ;
  item.userData.attachRotationX = rotationX;
  item.userData.attachRotationY = rotationY;
  item.userData.attachRotationZ = rotationZ;
  return item;
}

export function createTowerDefenseEnemyScene(
  scene: THREE.Scene,
  camera: THREE.Camera,
): TowerDefenseEnemyScene {
  const models = new Map<number, THREE.Group>();
  const modelPool = new Map<string, THREE.Group[]>();
  const statusBadgeTextures = new Map<EnemyStatusKind, THREE.CanvasTexture>();
  const bossTemplates = new Map<BossClass, THREE.Group>();
  const bossEquipment = new Map<
    BossClass,
    { right: THREE.Object3D; left: THREE.Object3D }
  >();
  const worldQuaternion = new THREE.Quaternion();
  const billboardQuaternion = new THREE.Quaternion();
  const enemyTemplates = new Map<string, THREE.Group>();
  const enemyAnimations = new Map<string, THREE.AnimationClip[]>();
  let bossAnimations: THREE.AnimationClip[] = [];
  let disposed = false;

  function getStatusBadgeTexture(kind: EnemyStatusKind) {
    const cached = statusBadgeTextures.get(kind);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể tạo badge trạng thái enemy.");
    context.fillStyle =
      kind === "fire" ? "#7f1d1d" : kind === "water" ? "#0c4a6e" : "#075985";
    context.strokeStyle =
      kind === "fire" ? "#fdba74" : kind === "water" ? "#7dd3fc" : "#bae6fd";
    context.lineWidth = 6;
    context.beginPath();
    context.arc(48, 48, 40, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = "#fff";
    context.fillStyle = "#fff";
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (kind === "fire") {
      context.beginPath();
      context.moveTo(49, 18);
      context.bezierCurveTo(44, 34, 27, 39, 31, 58);
      context.bezierCurveTo(34, 74, 61, 79, 68, 58);
      context.bezierCurveTo(72, 43, 58, 33, 49, 18);
      context.fill();
      context.fillStyle = "#fbbf24";
      context.beginPath();
      context.moveTo(49, 42);
      context.bezierCurveTo(42, 51, 40, 61, 49, 68);
      context.bezierCurveTo(60, 61, 58, 51, 49, 42);
      context.fill();
    } else if (kind === "frost") {
      for (let index = 0; index < 3; index++) {
        context.save();
        context.translate(48, 48);
        context.rotate((index * Math.PI) / 3);
        context.beginPath();
        context.moveTo(-25, 0);
        context.lineTo(25, 0);
        context.moveTo(16, -8);
        context.lineTo(25, 0);
        context.lineTo(16, 8);
        context.moveTo(-16, -8);
        context.lineTo(-25, 0);
        context.lineTo(-16, 8);
        context.stroke();
        context.restore();
      }
    } else {
      for (let index = 0; index < 3; index++) {
        const lineY = 34 + index * 13;
        context.beginPath();
        context.moveTo(20, lineY);
        context.bezierCurveTo(30, lineY - 9, 39, lineY + 9, 49, lineY);
        context.bezierCurveTo(59, lineY - 9, 67, lineY + 9, 76, lineY);
        context.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    statusBadgeTextures.set(kind, texture);
    return texture;
  }

  function addStatusBadges(group: THREE.Group) {
    const badges = new THREE.Group();
    badges.name = "enemyStatusBadges";
    for (const [index, kind] of (["fire", "frost", "water"] as const).entries()) {
      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getStatusBadgeTexture(kind),
          transparent: true,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        }),
      );
      badge.name = `enemyStatusBadge-${kind}`;
      badge.position.set(-0.13 + index * 0.26, 2.08, 0.1);
      badge.scale.set(0.2, 0.2, 1);
      badge.visible = false;
      badge.renderOrder = 12;
      badges.add(badge);
    }
    group.add(badges);
    group.userData.statusBadges = badges;
  }

  function attachEquipment(
    group: THREE.Group,
    slotName: string,
    template: THREE.Object3D,
    name: string,
  ) {
    const slot = group.getObjectByName(slotName);
    if (!slot) return;
    const item = template.clone(true);
    item.name = name;
    item.position.set(
      Number(template.userData.attachPositionX) || 0,
      Number(template.userData.attachPositionY) || 0,
      Number(template.userData.attachPositionZ) || 0,
    );
    item.rotation.set(
      Number(template.userData.attachRotationX) || 0,
      Number(template.userData.attachRotationY) || 0,
      Number(template.userData.attachRotationZ) || 0,
    );
    item.scale.setScalar(1);
    slot.add(item);
  }

  function createModel(enemy: Enemy) {
    const modelKey = enemy.modelKey ?? DEFAULT_ENEMY_MODEL_KEY;
    const poolKey =
      enemy.kind === "boss" ? `boss:${enemy.bossClass}` : `enemy:${modelKey}`;
    const pooledModel = modelPool.get(poolKey)?.pop();
    if (pooledModel) {
      pooledModel.visible = true;
      pooledModel.userData.observedProgress = Number.NaN;
      pooledModel.userData.observedAt = 0;
      pooledModel.userData.progressVelocity = enemy.speed;
      pooledModel.userData.renderProgress = enemy.progress;
      pooledModel.userData.hasFacingDirection = false;
      (pooledModel.userData.mixer as THREE.AnimationMixer | undefined)?.setTime(0);
      scene.add(pooledModel);
      return pooledModel;
    }

    const bossClass = enemy.bossClass ?? "knight";
    const template =
      enemy.kind === "normal"
        ? enemyTemplates.get(modelKey)
        : bossTemplates.get(bossClass);
    if (!template)
      throw new Error(
        `Model ${enemy.kind === "normal" ? modelKey : bossClass} chưa được tải`,
      );
    const group = cloneSkeleton(template) as THREE.Group;

    if (enemy.kind === "boss") {
      const equipment = bossEquipment.get(bossClass);
      if (equipment) {
        // GLTFLoader loại dấu chấm trong handslot.r/l thành handslotr/l.
        attachEquipment(group, "handslotr", equipment.right, "enemyRightWeapon");
        attachEquipment(group, "handslotl", equipment.left, "enemyLeftWeapon");
      }
    }

    const health = group.getObjectByName("enemyHealth") as THREE.Mesh;
    group.userData.healthBars = group.getObjectByName("enemyHealthBars");
    if (enemy.kind === "boss") {
      health.material = (health.material as THREE.Material).clone();
      group.userData.ownsHealthMaterial = true;
      if (health.material instanceof THREE.MeshBasicMaterial)
        health.material.color.setHex(0xe34b38);
    }

    const definition = ENEMY_MODEL_DEFINITIONS[modelKey];
    const animations =
      enemy.kind === "normal"
        ? (enemyAnimations.get(modelKey) ?? [])
        : bossAnimations;
    const animationNames =
      enemy.kind === "normal"
        ? (definition?.animationNames ?? [])
        : BOSS_WALK_ANIMATION_NAMES;
    const walk =
      animations.find((clip) =>
        animationNames.some((name) =>
          clip.name.toLowerCase().includes(name.toLowerCase()),
        ),
      ) ?? animations[0];
    const mixer = new THREE.AnimationMixer(group);
    if (walk) mixer.clipAction(walk).play();
    group.userData.health = health;
    group.userData.mixer = mixer;
    group.userData.poolKey = poolKey;
    group.userData.sceneScale =
      enemy.kind === "normal" ? definition?.sceneScale : BOSS_MODEL_SCALE;
    addStatusBadges(group);
    scene.add(group);
    return group;
  }

  function disposeModel(model: THREE.Group) {
    const mixer = model.userData.mixer as THREE.AnimationMixer | undefined;
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    }
    const badges = model.userData.statusBadges as THREE.Group | undefined;
    badges?.traverse((child) => {
      if (child instanceof THREE.Sprite) child.material.dispose();
    });
    if (model.userData.ownsHealthMaterial) {
      const health = model.userData.health as THREE.Mesh | undefined;
      const materials = health
        ? Array.isArray(health.material)
          ? health.material
          : [health.material]
        : [];
      materials.forEach((material) => material.dispose());
    }
    const skeletons = new Set<THREE.Skeleton>();
    model.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton);
    });
    skeletons.forEach((skeleton) => skeleton.dispose());
    disposeObject(model, false);
  }

  function recycleModel(model: THREE.Group) {
    model.removeFromParent();
    model.visible = false;
    const poolKey = String(model.userData.poolKey ?? "normal");
    const pool = modelPool.get(poolKey) ?? [];
    const poolLimit = poolKey.startsWith("enemy:") ? 24 : 3;
    if (pool.length < poolLimit) {
      pool.push(model);
      modelPool.set(poolKey, pool);
    } else disposeModel(model);
  }

  async function loadEnemyModels() {
    const loader = new GLTFLoader();
    await Promise.all(
      Object.entries(ENEMY_MODEL_DEFINITIONS).map(async ([modelKey, definition]) => {
        const gltf = await loader.loadAsync(definition.url);
        if (disposed) return;
        enemyTemplates.set(
          modelKey,
          prepareCharacter(
            gltf.scene,
            definition.characterScale,
            definition.healthBarY,
          ),
        );
        enemyAnimations.set(
          modelKey,
          definition.removeRootMotion
            ? gltf.animations.map(removeRootMotion)
            : gltf.animations,
        );
      }),
    );
  }

  async function loadBossModels() {
    const loader = new GLTFLoader();
    const loadAsset = (path: string) =>
      loader.loadAsync(`${ADVENTURE_KIT_ROOT}/${path}`);
    const bossClasses = Object.keys(BOSS_CHARACTER_PATHS) as BossClass[];
    const characterAssets = await Promise.all(
      bossClasses.map((bossClass) => loadAsset(BOSS_CHARACTER_PATHS[bossClass])),
    );
    const movement = await loadAsset(BOSS_MOVEMENT_PATH);
    const equipmentPaths = [
      ...new Set(
        bossClasses.flatMap((bossClass) => {
          const definition = BOSS_EQUIPMENT_PATHS[bossClass];
          return [definition.right, definition.left];
        }),
      ),
    ];
    const equipmentAssets = await Promise.all(equipmentPaths.map(loadAsset));
    if (disposed) return;

    characterAssets.forEach((asset, index) => {
      bossTemplates.set(
        bossClasses[index]!,
        prepareCharacter(asset.scene, BOSS_CHARACTER_SCALE, BOSS_HEALTH_BAR_Y),
      );
    });
    bossAnimations = movement.animations;

    const equipmentByPath = new Map(
      equipmentPaths.map((path, index) => [path, equipmentAssets[index]!.scene]),
    );
    for (const bossClass of bossClasses) {
      const definition = BOSS_EQUIPMENT_PATHS[bossClass];
      bossEquipment.set(bossClass, {
        right: prepareEquipment(
          equipmentByPath.get(definition.right)!.clone(true),
          definition.rightTransform,
        ),
        left: prepareEquipment(
          equipmentByPath.get(definition.left)!.clone(true),
          definition.leftTransform,
        ),
      });
    }
  }

  async function load() {
    const results = await Promise.allSettled([loadEnemyModels(), loadBossModels()]);
    for (const result of results)
      if (result.status === "rejected")
        console.error("[Kingdom Defense] Không thể tải model quái.", result.reason);
  }

  function sync({
    enemies,
    elapsed,
    frameDelta,
    now,
    pathPosition,
  }: EnemySceneSyncOptions) {
    const enemyIds = new Set(enemies.map((enemy) => enemy.id));
    for (const [id, model] of models)
      if (!enemyIds.has(id)) {
        recycleModel(model);
        models.delete(id);
      }

    for (const enemy of enemies) {
      const model = models.get(enemy.id) ?? createModel(enemy);
      models.set(enemy.id, model);
      const previousObserved = Number(model.userData.observedProgress);
      if (!Number.isFinite(previousObserved)) {
        model.userData.observedProgress = enemy.progress;
        model.userData.observedAt = now;
        model.userData.progressVelocity = enemy.speed;
        model.userData.renderProgress = enemy.progress;
      } else if (enemy.progress !== previousObserved) {
        const observationTime = Math.max(
          (now - Number(model.userData.observedAt)) / 1000,
          0.001,
        );
        model.userData.progressVelocity = THREE.MathUtils.clamp(
          (enemy.progress - previousObserved) / observationTime,
          0,
          enemy.speed * 2.2,
        );
        model.userData.observedProgress = enemy.progress;
        model.userData.observedAt = now;
      }

      const predictionAge = Math.min(
        (now - Number(model.userData.observedAt)) / 1000,
        0.12,
      );
      const predictedProgress =
        enemy.progress + Number(model.userData.progressVelocity) * predictionAge;
      const renderProgress = THREE.MathUtils.damp(
        Number(model.userData.renderProgress),
        predictedProgress,
        24,
        frameDelta,
      );
      model.userData.renderProgress = renderProgress;
      const position = pathPosition(renderProgress, enemy.lane);
      const facingFrom = pathPosition(renderProgress - 0.08, enemy.lane);
      const facingTo = pathPosition(renderProgress + 0.12, enemy.lane);
      const observedVelocity =
        Number(model.userData.progressVelocity) || enemy.speed;
      const gaitSpeed = THREE.MathUtils.clamp(
        observedVelocity / 0.745,
        0.65,
        1.6,
      );
      const stride = Math.sin(elapsed * 8 * gaitSpeed + enemy.id);
      model.position.copy(position.setY(0.08 + Math.abs(stride) * 0.008));
      const targetRotation = Math.atan2(
        facingTo.x - facingFrom.x,
        facingTo.z - facingFrom.z,
      );
      if (!model.userData.hasFacingDirection) {
        model.rotation.y = targetRotation;
        model.userData.hasFacingDirection = true;
      } else {
        const rotationDelta = Math.atan2(
          Math.sin(targetRotation - model.rotation.y),
          Math.cos(targetRotation - model.rotation.y),
        );
        model.rotation.y += rotationDelta * (1 - Math.exp(-12 * frameDelta));
      }
      model.scale.setScalar(Number(model.userData.sceneScale));
      const mixer = model.userData.mixer as THREE.AnimationMixer | undefined;
      if (mixer) {
        mixer.timeScale = gaitSpeed * 1.25;
        mixer.update(frameDelta);
      }

      const badges = model.userData.statusBadges as THREE.Group | undefined;
      const healthBars = model.userData.healthBars as THREE.Group | undefined;
      model.getWorldQuaternion(worldQuaternion);
      billboardQuaternion
        .copy(worldQuaternion)
        .invert()
        .multiply(camera.quaternion);
      if (badges) {
        badges.quaternion.copy(billboardQuaternion);
        const fireBadge = badges.getObjectByName("enemyStatusBadge-fire");
        const frostBadge = badges.getObjectByName("enemyStatusBadge-frost");
        const waterBadge = badges.getObjectByName("enemyStatusBadge-water");
        if (fireBadge) fireBadge.visible = enemy.burnRemaining > 0;
        if (frostBadge) frostBadge.visible = enemy.isFrozen;
        if (waterBadge) waterBadge.visible = enemy.isSlowed;
        const activeBadges = [fireBadge, frostBadge, waterBadge].filter(
          (badge): badge is THREE.Object3D => Boolean(badge?.visible),
        );
        activeBadges.forEach((badge, index) => {
          badge.position.x = (index - (activeBadges.length - 1) / 2) * 0.24;
          const pulse = 1 + Math.sin(elapsed * 5 + enemy.id + index) * 0.06;
          badge.scale.set(0.2 * pulse, 0.2 * pulse, 1);
        });
      }
      healthBars?.quaternion.copy(billboardQuaternion);
      const health = model.userData.health as THREE.Mesh;
      const healthRatio = Math.max(0.02, enemy.hp / enemy.maxHp);
      health.scale.x = healthRatio;
      health.position.x = -(1 - healthRatio) * 0.38;
    }
  }

  function dispose() {
    disposed = true;
    for (const model of models.values()) disposeModel(model);
    models.clear();
    for (const pool of modelPool.values())
      for (const model of pool) disposeModel(model);
    modelPool.clear();
    enemyTemplates.forEach((template) => disposeObject(template));
    enemyTemplates.clear();
    enemyAnimations.clear();
    const characterTemplates = new Set(bossTemplates.values());
    characterTemplates.forEach((template) => disposeObject(template));
    bossTemplates.clear();
    const equipmentTemplates = new Set<THREE.Object3D>();
    bossEquipment.forEach(({ right, left }) => {
      equipmentTemplates.add(right);
      equipmentTemplates.add(left);
    });
    equipmentTemplates.forEach((template) => disposeObject(template));
    bossEquipment.clear();
    bossAnimations = [];
    statusBadgeTextures.forEach((texture) => texture.dispose());
    statusBadgeTextures.clear();
  }

  return { models, load, sync, dispose };
}
