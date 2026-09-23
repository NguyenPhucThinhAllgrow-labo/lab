import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type {
  BossClass,
  Enemy,
  TowerDefenseCharacterModelDefinition,
} from "~/types/games/towerDefense";
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
  speedMultiplier: number;
  worldUnitsPerCell: number;
  pathPosition: (progress: number, lane: 0 | 1) => THREE.Vector3;
}

// Tốc độ world mà clip walk 1× khớp tương đối với độ dài một bước chân.
// Mixer sẽ nhân theo vận tốc model thực tế để chân không chạy tại chỗ hoặc lướt.
const WALK_WORLD_SPEED_AT_NORMAL_PLAYBACK = 0.54;
const DEFAULT_WALK_CLIP_DURATION = 2.3333333333333335;
const WALK_SPEED_RESPONSE = 20;
const FACING_RESPONSE = 19;

export interface TowerDefenseEnemyScene {
  readonly models: Map<number, THREE.Group>;
  load: () => Promise<void>;
  sync: (options: EnemySceneSyncOptions) => void;
  dispose: () => void;
}

export interface TowerDefenseEnemySceneOptions {
  enemyModel?: TowerDefenseCharacterModelDefinition;
  bossModel?: TowerDefenseCharacterModelDefinition;
  enemyModels?: Record<string, TowerDefenseCharacterModelDefinition>;
  bossModels?: Record<string, TowerDefenseCharacterModelDefinition>;
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
  item.scale.setScalar(transform?.scale ?? 1);
  const [positionX, positionY, positionZ] = transform?.position ?? [0, 0, 0];
  const [rotationX, rotationY, rotationZ] = transform?.rotation ?? [0, 0, 0];
  item.userData.attachPositionX = positionX;
  item.userData.attachPositionY = positionY;
  item.userData.attachPositionZ = positionZ;
  item.userData.attachRotationX = rotationX;
  item.userData.attachRotationY = rotationY;
  item.userData.attachRotationZ = rotationZ;
  item.userData.attachScale = transform?.scale ?? 1;
  return item;
}

export function createTowerDefenseEnemyScene(
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: TowerDefenseEnemySceneOptions = {},
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
  const activeStatusBadges: THREE.Object3D[] = [];
  const groundShadowGeometry = new THREE.CircleGeometry(1, 24);
  const groundShadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x070a08,
    depthWrite: false,
    opacity: 0.26,
    transparent: true,
  });
  const lavaBossGlowGeometry = new THREE.CircleGeometry(1, 48);
  const enemyTemplates = new Map<string, THREE.Group>();
  const enemyAnimations = new Map<string, THREE.AnimationClip[]>();
  let lavaBossGlowMaterial: THREE.ShaderMaterial | null = null;
  let lavaFlameTexture: THREE.CanvasTexture | null = null;
  let customBossTemplate: THREE.Group | null = null;
  let customBossAnimations: THREE.AnimationClip[] = [];
  const enemyEquipment = new Map<
    string,
    { left?: THREE.Object3D; right?: THREE.Object3D }
  >();
  const managedBossTemplates = new Map<string, THREE.Group>();
  const managedBossAnimations = new Map<string, THREE.AnimationClip[]>();
  const managedBossEquipment = new Map<
    string,
    { left?: THREE.Object3D; right?: THREE.Object3D }
  >();
  let customBossEquipment: {
    left?: THREE.Object3D;
    right?: THREE.Object3D;
  } = {};
  let bossAnimations: THREE.AnimationClip[] = [];
  let disposed = false;

  function getLavaBossGlowMaterial() {
    if (lavaBossGlowMaterial) return lavaBossGlowMaterial;
    lavaBossGlowMaterial = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
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
        varying vec2 vUv;

        float expandingRing(float radius, float phase, float width) {
          float ring = 1.0 - smoothstep(0.0, width, abs(radius - phase));
          return ring * (1.0 - phase);
        }

        void main() {
          float radius = length(vUv - vec2(0.5)) * 2.0;
          float edgeFade = 1.0 - smoothstep(0.72, 1.0, radius);
          float core = (1.0 - smoothstep(0.0, 0.62, radius)) * 0.46;
          float phaseA = fract(uTime * 0.38);
          float phaseB = fract(uTime * 0.38 + 0.5);
          float waves = expandingRing(radius, phaseA, 0.075)
            + expandingRing(radius, phaseB, 0.09) * 0.74;
          float shimmer = 0.9 + sin(uTime * 3.4 + radius * 15.0) * 0.1;
          float alpha = min((core + waves) * edgeFade * shimmer * 1.32, 1.0);
          if (alpha < 0.012) discard;
          vec3 innerColor = vec3(1.0, 0.52, 0.055);
          vec3 outerColor = vec3(1.0, 0.035, 0.006);
          vec3 color = mix(innerColor, outerColor, smoothstep(0.12, 0.92, radius));
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    return lavaBossGlowMaterial;
  }

  function getLavaFlameTexture() {
    if (lavaFlameTexture) return lavaFlameTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể tạo texture lửa cho lava boss.");
    const gradient = context.createRadialGradient(32, 68, 2, 32, 54, 43);
    gradient.addColorStop(0, "#fff7ad");
    gradient.addColorStop(0.2, "#ffd129");
    gradient.addColorStop(0.48, "#ff5a12");
    gradient.addColorStop(0.75, "#d20e05");
    gradient.addColorStop(1, "#50000000");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(32, 4);
    context.bezierCurveTo(24, 24, 7, 37, 14, 67);
    context.bezierCurveTo(20, 92, 47, 94, 54, 68);
    context.bezierCurveTo(60, 43, 43, 28, 32, 4);
    context.fill();
    lavaFlameTexture = new THREE.CanvasTexture(canvas);
    lavaFlameTexture.colorSpace = THREE.SRGBColorSpace;
    return lavaFlameTexture;
  }

  function addLavaBossFlames(group: THREE.Group, sceneScale: number) {
    const flames = new THREE.Group();
    flames.name = "lavaBossFlames";
    for (let index = 0; index < 12; index++) {
      const angle = (index / 12) * Math.PI * 2;
      const flame = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getLavaFlameTexture(),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.82,
          toneMapped: false,
          transparent: true,
        }),
      );
      const radius = (0.12 + (index % 3) * 0.035) / sceneScale;
      flame.name = "lavaBossFlame";
      flame.userData.angle = angle;
      flame.userData.phase = index / 12;
      flame.userData.radius = radius;
      flame.userData.speed = 0.72 + (index % 4) * 0.09;
      flame.renderOrder = 4;
      flames.add(flame);
    }
    group.add(flames);
  }

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
    context.shadowColor =
      kind === "fire" ? "#ff4d16" : kind === "water" ? "#22bdf2" : "#7ddfff";
    context.shadowBlur = 14;
    context.lineWidth = 8;
    context.beginPath();
    context.arc(48, 48, 40, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
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
    const healthBars = group.getObjectByName("enemyHealthBars");
    badges.position.set(0, (healthBars?.position.y ?? 1.9) + 0.27, 0);
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
      badge.position.set(-0.17 + index * 0.34, 0, 0.01);
      badge.scale.set(0.28, 0.28, 1);
      badge.visible = false;
      badge.renderOrder = 20;
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
    const normalizedSlotName = slotName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isRight = normalizedSlotName.endsWith("r");
    const aliases = isRight
      ? ["handslotr", "righthand", "handr", "mixamorighhand", "mixamorigrightHand"]
      : ["handslotl", "lefthand", "handl", "mixamoriglefthand"];
    let slot = group.getObjectByName(slotName);
    if (!slot) {
      group.traverse((child) => {
        if (slot) return;
        const normalizedName = child.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (aliases.some((alias) => normalizedName === alias.toLowerCase()))
          slot = child;
      });
    }
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
    item.scale.setScalar(Number(template.userData.attachScale) || 1);
    slot.add(item);
  }

  function createModel(enemy: Enemy) {
    const modelKey = enemy.modelKey ?? DEFAULT_ENEMY_MODEL_KEY;
    const poolKey =
      enemy.kind === "boss" ? `boss:${modelKey}` : `enemy:${modelKey}`;
    const pooledModel = modelPool.get(poolKey)?.pop();
    if (pooledModel) {
      pooledModel.visible = true;
      pooledModel.userData.observedProgress = Number.NaN;
      pooledModel.userData.observedAt = 0;
      pooledModel.userData.progressVelocity = enemy.speed;
      pooledModel.userData.renderProgress = enemy.progress;
      pooledModel.userData.hasFacingDirection = false;
      pooledModel.userData.hasWorldPosition = false;
      pooledModel.userData.animationWorldSpeed = 0;
      pooledModel.userData.walkPhase = 0;
      (pooledModel.userData.mixer as THREE.AnimationMixer | undefined)?.setTime(0);
      scene.add(pooledModel);
      return pooledModel;
    }

    const bossClass = enemy.bossClass ?? "knight";
    const template =
      enemy.kind === "normal"
        ? enemyTemplates.get(modelKey)
        : (managedBossTemplates.get(modelKey) ??
          customBossTemplate ??
          bossTemplates.get(bossClass));
    if (!template)
      throw new Error(
        `Model ${enemy.kind === "normal" ? modelKey : bossClass} chưa được tải`,
      );
    const group = cloneSkeleton(template) as THREE.Group;

    if (enemy.kind === "normal") {
      const equipment = enemyEquipment.get(modelKey);
      if (equipment?.right)
        attachEquipment(
          group,
          "handslotr",
          equipment.right,
          "enemyRightWeapon",
        );
      if (equipment?.left)
        attachEquipment(
          group,
          "handslotl",
          equipment.left,
          "enemyLeftWeapon",
        );
    } else if (managedBossTemplates.has(modelKey)) {
      const equipment = managedBossEquipment.get(modelKey);
      if (equipment?.right)
        attachEquipment(
          group,
          "handslotr",
          equipment.right,
          "enemyRightWeapon",
        );
      if (equipment?.left)
        attachEquipment(
          group,
          "handslotl",
          equipment.left,
          "enemyLeftWeapon",
        );
    } else {
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

    const definition =
      enemy.kind === "normal"
        ? (options.enemyModels?.[modelKey] ??
          (modelKey === DEFAULT_ENEMY_MODEL_KEY && options.enemyModel
            ? options.enemyModel
            : ENEMY_MODEL_DEFINITIONS[modelKey]))
        : (options.bossModels?.[modelKey] ?? options.bossModel);
    const animations =
      enemy.kind === "normal"
        ? (enemyAnimations.get(modelKey) ?? [])
        : (managedBossAnimations.get(modelKey) ??
          (customBossTemplate ? customBossAnimations : bossAnimations));
    const animationNames =
      enemy.kind === "normal"
        ? (definition?.animationNames ?? [])
        : (definition?.animationNames ?? BOSS_WALK_ANIMATION_NAMES);
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
    group.userData.walkClipDuration = walk?.duration ?? DEFAULT_WALK_CLIP_DURATION;
    group.userData.lastWorldPosition = new THREE.Vector3();
    group.userData.hasWorldPosition = false;
    group.userData.animationWorldSpeed = 0;
    group.userData.walkPhase = 0;
    group.userData.poolKey = poolKey;
    group.userData.sceneScale =
      enemy.kind === "normal"
        ? definition?.sceneScale
        : (definition?.sceneScale ?? BOSS_MODEL_SCALE);
    const sceneScale = Number(group.userData.sceneScale) || 1;
    const shadowRadius = enemy.kind === "boss" ? 0.42 : 0.24;
    const groundShadow = new THREE.Mesh(
      groundShadowGeometry,
      groundShadowMaterial,
    );
    groundShadow.name = "enemyGroundShadow";
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = -0.02 / sceneScale;
    groundShadow.scale.set(
      shadowRadius / sceneScale,
      (shadowRadius * 0.72) / sceneScale,
      1,
    );
    groundShadow.castShadow = false;
    groundShadow.receiveShadow = false;
    groundShadow.renderOrder = 2;
    group.add(groundShadow);
    if (enemy.combatProfileKey === "lava-boss") {
      const lavaGlow = new THREE.Mesh(
        lavaBossGlowGeometry,
        getLavaBossGlowMaterial(),
      );
      const glowScale = 0.9 / sceneScale;
      lavaGlow.name = "lavaBossGroundGlow";
      lavaGlow.rotation.x = -Math.PI / 2;
      lavaGlow.position.y = -0.012 / sceneScale;
      lavaGlow.scale.set(glowScale, glowScale, 1);
      lavaGlow.castShadow = false;
      lavaGlow.receiveShadow = false;
      lavaGlow.renderOrder = 3;
      group.add(lavaGlow);
      addLavaBossFlames(group, sceneScale);
    }
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
    const definitions = {
      ...ENEMY_MODEL_DEFINITIONS,
      ...(options.enemyModel
        ? { [DEFAULT_ENEMY_MODEL_KEY]: options.enemyModel }
        : {}),
      ...(options.enemyModels ?? {}),
    };
    await Promise.all(
      Object.entries(definitions).map(async ([modelKey, definition]) => {
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
        if (definition.leftWeaponUrl || definition.rightWeaponUrl) {
          const [leftWeapon, rightWeapon] = await Promise.all([
            definition.leftWeaponUrl
              ? loader.loadAsync(definition.leftWeaponUrl)
              : null,
            definition.rightWeaponUrl
              ? loader.loadAsync(definition.rightWeaponUrl)
              : null,
          ]);
          if (disposed) return;
          enemyEquipment.set(modelKey, {
            left: leftWeapon
              ? prepareEquipment(leftWeapon.scene, definition.leftWeaponTransform)
              : undefined,
            right: rightWeapon
              ? prepareEquipment(rightWeapon.scene, definition.rightWeaponTransform)
              : undefined,
          });
        }
      }),
    );
  }

  async function loadBossModels() {
    const loader = new GLTFLoader();
    if (options.bossModels && Object.keys(options.bossModels).length > 0) {
      await Promise.all(
        Object.entries(options.bossModels).map(async ([modelKey, definition]) => {
          const gltf = await loader.loadAsync(definition.url);
          if (disposed) return;
          managedBossTemplates.set(
            modelKey,
            prepareCharacter(
              gltf.scene,
              definition.characterScale,
              definition.healthBarY,
            ),
          );
          let sourceAnimations = gltf.animations;
          if (sourceAnimations.length === 0) {
            const movement = await loader.loadAsync(
              `${ADVENTURE_KIT_ROOT}/${BOSS_MOVEMENT_PATH}`,
            );
            sourceAnimations = movement.animations;
          }
          managedBossAnimations.set(
            modelKey,
            definition.removeRootMotion
              ? sourceAnimations.map(removeRootMotion)
              : sourceAnimations,
          );
          const [leftWeapon, rightWeapon] = await Promise.all([
            definition.leftWeaponUrl
              ? loader.loadAsync(definition.leftWeaponUrl)
              : null,
            definition.rightWeaponUrl
              ? loader.loadAsync(definition.rightWeaponUrl)
              : null,
          ]);
          if (disposed) return;
          managedBossEquipment.set(modelKey, {
            left: leftWeapon
              ? prepareEquipment(leftWeapon.scene, definition.leftWeaponTransform)
              : undefined,
            right: rightWeapon
              ? prepareEquipment(rightWeapon.scene, definition.rightWeaponTransform)
              : undefined,
          });
        }),
      );
      return;
    }
    if (options.bossModel) {
      const gltf = await loader.loadAsync(options.bossModel.url);
      if (disposed) return;
      customBossTemplate = prepareCharacter(
        gltf.scene,
        options.bossModel.characterScale,
        options.bossModel.healthBarY,
      );
      let sourceAnimations = gltf.animations;
      if (sourceAnimations.length === 0) {
        const movement = await loader.loadAsync(
          `${ADVENTURE_KIT_ROOT}/${BOSS_MOVEMENT_PATH}`,
        );
        sourceAnimations = movement.animations;
      }
      customBossAnimations = options.bossModel.removeRootMotion
        ? sourceAnimations.map(removeRootMotion)
        : sourceAnimations;
      const [leftWeapon, rightWeapon] = await Promise.all([
        options.bossModel.leftWeaponUrl
          ? loader.loadAsync(options.bossModel.leftWeaponUrl)
          : null,
        options.bossModel.rightWeaponUrl
          ? loader.loadAsync(options.bossModel.rightWeaponUrl)
          : null,
      ]);
      if (disposed) return;
      customBossEquipment = {
        left: leftWeapon
          ? prepareEquipment(leftWeapon.scene, options.bossModel.leftWeaponTransform)
          : undefined,
        right: rightWeapon
          ? prepareEquipment(rightWeapon.scene, options.bossModel.rightWeaponTransform)
          : undefined,
      };
      return;
    }
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
    speedMultiplier,
    worldUnitsPerCell,
    pathPosition,
  }: EnemySceneSyncOptions) {
    if (lavaBossGlowMaterial)
      lavaBossGlowMaterial.uniforms.uTime!.value = elapsed;
    const enemyIds = new Set(enemies.map((enemy) => enemy.id));
    for (const [id, model] of models)
      if (!enemyIds.has(id)) {
        recycleModel(model);
        models.delete(id);
      }

    for (const enemy of enemies) {
      const model = models.get(enemy.id) ?? createModel(enemy);
      models.set(enemy.id, model);
      const frozen = enemy.isFrozen;
      const previousObserved = Number(model.userData.observedProgress);
      if (!Number.isFinite(previousObserved)) {
        model.userData.observedProgress = enemy.progress;
        model.userData.observedAt = now;
        model.userData.progressVelocity = frozen
          ? 0
          : enemy.speed * speedMultiplier;
        model.userData.renderProgress = enemy.progress;
      } else if (enemy.progress !== previousObserved) {
        const observationTime = Math.max(
          (now - Number(model.userData.observedAt)) / 1000,
          0.001,
        );
        model.userData.progressVelocity = THREE.MathUtils.clamp(
          (enemy.progress - previousObserved) / observationTime,
          0,
          enemy.speed * speedMultiplier * 1.35,
        );
        model.userData.observedProgress = enemy.progress;
        model.userData.observedAt = now;
      }

      if (frozen) {
        model.userData.progressVelocity = 0;
        model.userData.observedProgress = enemy.progress;
        model.userData.observedAt = now;
      }

      const predictionAge = Math.min(
        (now - Number(model.userData.observedAt)) / 1000,
        0.12,
      );
      const predictedProgress =
        enemy.progress + Number(model.userData.progressVelocity) * predictionAge;
      const renderProgress = frozen
        ? Number(model.userData.renderProgress)
        : THREE.MathUtils.damp(
            Number(model.userData.renderProgress),
            predictedProgress,
            24,
            frameDelta,
          );
      model.userData.renderProgress = renderProgress;
      const position = pathPosition(renderProgress, enemy.lane);
      const facingFrom = pathPosition(renderProgress - 0.045, enemy.lane);
      const facingTo = pathPosition(renderProgress + 0.065, enemy.lane);
      const lastWorldPosition = model.userData
        .lastWorldPosition as THREE.Vector3;
      const hasWorldPosition = Boolean(model.userData.hasWorldPosition);
      const measuredWorldSpeed =
        hasWorldPosition && frameDelta > 0
          ? lastWorldPosition.distanceTo(position) / frameDelta
          : enemy.speed * speedMultiplier * worldUnitsPerCell;
      lastWorldPosition.copy(position);
      model.userData.hasWorldPosition = true;

      // Bám vận tốc render đủ nhanh để nhịp chân không trễ phía sau thân model,
      // đồng thời vẫn lọc dao động nhỏ sinh ra từ tick gameplay 100 ms.
      const animationWorldSpeed = frozen
        ? 0
        : THREE.MathUtils.damp(
            Number(model.userData.animationWorldSpeed) || measuredWorldSpeed,
            measuredWorldSpeed,
            WALK_SPEED_RESPONSE,
            frameDelta,
          );
      model.userData.animationWorldSpeed = animationWorldSpeed;
      const animationTimeScale = THREE.MathUtils.clamp(
        animationWorldSpeed / WALK_WORLD_SPEED_AT_NORMAL_PLAYBACK,
        0,
        4.5,
      );
      const walkClipDuration =
        Number(model.userData.walkClipDuration) || DEFAULT_WALK_CLIP_DURATION;
      model.userData.walkPhase =
        Number(model.userData.walkPhase) +
        (frameDelta * animationTimeScale * Math.PI * 2) / walkClipDuration;
      const stride = frozen ? 0 : Math.sin(Number(model.userData.walkPhase));
      model.position.copy(position.setY(0.08 + Math.abs(stride) * 0.014));
      const targetRotation = Math.atan2(
        facingTo.x - facingFrom.x,
        facingTo.z - facingFrom.z,
      );
      if (!model.userData.hasFacingDirection) {
        model.rotation.y = targetRotation;
        model.userData.hasFacingDirection = true;
      } else if (!frozen) {
        const rotationDelta = Math.atan2(
          Math.sin(targetRotation - model.rotation.y),
          Math.cos(targetRotation - model.rotation.y),
        );
        model.rotation.y +=
          rotationDelta * (1 - Math.exp(-FACING_RESPONSE * frameDelta));
      }
      model.scale.setScalar(Number(model.userData.sceneScale));
      const mixer = model.userData.mixer as THREE.AnimationMixer | undefined;
      if (mixer) {
        mixer.timeScale = frozen ? 0 : animationTimeScale;
        mixer.update(frameDelta);
      }
      const lavaFlames = model.getObjectByName("lavaBossFlames");
      if (lavaFlames) {
        const sceneScale = Number(model.userData.sceneScale) || 1;
        for (const child of lavaFlames.children) {
          const flame = child as THREE.Sprite;
          const phase = Number(flame.userData.phase);
          const speed = Number(flame.userData.speed);
          const rise = (elapsed * speed + phase) % 1;
          const angle = Number(flame.userData.angle);
          const radius = Number(flame.userData.radius);
          const flicker = 0.88 + Math.sin(elapsed * 11 + phase * 19) * 0.12;
          flame.position.set(
            Math.cos(angle) * radius + Math.sin(elapsed * 4.2 + angle) * 0.015,
            (0.16 + rise * 1.65) / sceneScale,
            Math.sin(angle) * radius,
          );
          const width = (0.13 + (1 - rise) * 0.075) * flicker / sceneScale;
          const height = (0.4 + (1 - rise) * 0.27) * flicker / sceneScale;
          flame.scale.set(width, height, 1);
          (flame.material as THREE.SpriteMaterial).opacity =
            Math.sin(rise * Math.PI) * 0.88;
        }
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
        activeStatusBadges.length = 0;
        if (fireBadge?.visible) activeStatusBadges.push(fireBadge);
        if (frostBadge?.visible) activeStatusBadges.push(frostBadge);
        if (waterBadge?.visible) activeStatusBadges.push(waterBadge);
        activeStatusBadges.forEach((badge, index) => {
          badge.position.x =
            (index - (activeStatusBadges.length - 1) / 2) * 0.34;
          badge.position.y = Math.sin(elapsed * 4.5 + index * 1.7) * 0.025;
          const pulse = 1 + Math.sin(elapsed * 6 + enemy.id + index) * 0.1;
          badge.scale.set(0.28 * pulse, 0.28 * pulse, 1);
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
    enemyEquipment.forEach(({ left, right }) => {
      if (left) disposeObject(left);
      if (right && right !== left) disposeObject(right);
    });
    enemyEquipment.clear();
    managedBossTemplates.forEach((template) => disposeObject(template));
    managedBossTemplates.clear();
    managedBossAnimations.clear();
    managedBossEquipment.forEach(({ left, right }) => {
      if (left) disposeObject(left);
      if (right && right !== left) disposeObject(right);
    });
    managedBossEquipment.clear();
    if (customBossTemplate) disposeObject(customBossTemplate);
    customBossTemplate = null;
    customBossAnimations = [];
    Object.values(customBossEquipment).forEach((item) => disposeObject(item));
    customBossEquipment = {};
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
    lavaBossGlowMaterial?.dispose();
    lavaBossGlowMaterial = null;
    lavaFlameTexture?.dispose();
    lavaFlameTexture = null;
    lavaBossGlowGeometry.dispose();
    groundShadowGeometry.dispose();
    groundShadowMaterial.dispose();
  }

  return { models, load, sync, dispose };
}
