import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { TowerKind } from "~/types/games/towerDefense";

export type LevelledTowerKind = TowerKind;
export type TowerFaction = "human" | "dark";

interface TowerModelDefinition {
  kind: LevelledTowerKind;
  modelName: string;
  targetHeight: number;
  urls: Record<number, string>;
}

export const PROJECTILE_VISUAL_KINDS = ["archer", "cannon", "frost", "fire", "thunder", "water"] as const;
export type ProjectileVisualKind = (typeof PROJECTILE_VISUAL_KINDS)[number];

export interface TowerVisualEffectDefinition {
  id: string;
  type: "glow" | "projectile";
  enabled: boolean;
  heightRatio?: number;
  level: number;
  color: string;
  size: number;
  opacity: number;
  pulseSpeed: number;
  /** Màu quầng riêng của đạn; mặc định dùng `color`. */
  glowColor?: string;
  /** Chiều dài đuôi đạn theo world unit. */
  trailLength?: number;
  trailOpacity?: number;
  /** Hình dáng procedural dùng chung với projectile renderer trong game. */
  projectileKind?: ProjectileVisualKind;
}

export interface ManagedTowerModelDefinition {
  templateKind: TowerKind;
  targetHeight: number;
  targetHeightByLevel?: Record<number, number>;
  visualEffects?: TowerVisualEffectDefinition[];
  dark: Record<number, string>;
  human: Record<number, string>;
}

const LEVELLED_TOWER_MODELS: TowerModelDefinition[] = [
  {
    kind: "archer",
    modelName: "ArcherTower3D",
    targetHeight: 2,
    urls: {},
  },
  {
    kind: "cannon",
    modelName: "CannonTower3D",
    targetHeight: 2,
    urls: {},
  },
  {
    kind: "frost",
    modelName: "FrostTower3D",
    targetHeight: 2.1,
    urls: {
      1: "/api/tower-defense/assets/models/games/tower-defense/towers/frost/enemy/level1.glb",
      2: "/api/tower-defense/assets/models/games/tower-defense/towers/frost/enemy/level2.glb",
      3: "/api/tower-defense/assets/models/games/tower-defense/towers/frost/enemy/level3.glb",
    },
  },
  {
    kind: "fire",
    modelName: "FireTower3D",
    targetHeight: 2.1,
    urls: {
      1: "/api/tower-defense/assets/models/games/tower-defense/towers/fire/enemy/level1.glb",
      2: "/api/tower-defense/assets/models/games/tower-defense/towers/fire/enemy/level2.glb",
      3: "/api/tower-defense/assets/models/games/tower-defense/towers/fire/enemy/level3.glb",
    },
  },
  {
    kind: "thunder",
    modelName: "ThunderTower3D",
    targetHeight: 2.1,
    urls: {
      1: "/api/tower-defense/assets/models/games/tower-defense/towers/thunder/enemy/level1.glb",
      2: "/api/tower-defense/assets/models/games/tower-defense/towers/thunder/enemy/level2.glb",
      3: "/api/tower-defense/assets/models/games/tower-defense/towers/thunder/enemy/level3.glb",
    },
  },
  {
    kind: "water",
    modelName: "WaterTower3D",
    targetHeight: 2,
    urls: {
      1: "/api/tower-defense/assets/models/games/tower-defense/towers/water/enemy/level1.glb",
      2: "/api/tower-defense/assets/models/games/tower-defense/towers/water/enemy/level2.glb",
      3: "/api/tower-defense/assets/models/games/tower-defense/towers/water/enemy/level3.glb",
    },
  },
  {
    kind: "support",
    modelName: "SupportTower3D",
    targetHeight: 2,
    urls: {
      1: "/api/tower-defense/assets/models/games/tower-defense/towers/supports/enemy/speed.glb",
      2: "/api/tower-defense/assets/models/games/tower-defense/towers/supports/enemy/speed.glb",
      3: "/api/tower-defense/assets/models/games/tower-defense/towers/supports/enemy/speed.glb",
    },
  },
];

export interface TowerModelLibraryOptions {
  renderer: THREE.WebGLRenderer;
  faction: TowerFaction;
  managedModels?: Partial<Record<LevelledTowerKind, ManagedTowerModelDefinition>>;
  decorate: (
    template: THREE.Group,
    kind: LevelledTowerKind,
    level: 1 | 2 | 3,
  ) => void;
}

export interface TowerModelLibrary {
  load: () => Promise<void>;
  get: (kind: TowerKind, level: number) => THREE.Group | undefined;
  has: (kind: TowerKind, level: number) => boolean;
  dispose: () => void;
}

const templateKey = (kind: TowerKind, level: number) =>
  `${kind}:${Math.max(1, Math.round(level))}`;

function disposeTemplate(template: THREE.Group) {
  template.traverse((child) => {
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
  template.removeFromParent();
}

function normalizeSource(
  source: THREE.Group,
  targetHeight: number,
  renderer: THREE.WebGLRenderer,
  faction: TowerFaction,
  usesNativeFactionAsset: boolean,
) {
  source.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0)
    throw new Error("Model tower không có kích thước hợp lệ.");

  source.scale.multiplyScalar(targetHeight / sourceSize.y);
  source.updateMatrixWorld(true);
  const fittedBounds = new THREE.Box3().setFromObject(source);
  const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
  source.position.set(
    source.position.x - fittedCenter.x,
    source.position.y - fittedBounds.min.y,
    source.position.z - fittedCenter.z,
  );
  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!child.geometry.getAttribute("normal"))
      child.geometry.computeVertexNormals();
    child.castShadow = true;
    child.receiveShadow = true;
    const tuneMaterial = (original: THREE.Material) => {
      const material = original.clone();
      if (
        !usesNativeFactionAsset &&
        faction === "human" &&
        material instanceof THREE.MeshStandardMaterial
      ) {
        const hsl = { h: 0, s: 0, l: 0 };
        material.color.getHSL(hsl);
        material.color.setHSL(
          hsl.h * 0.55 + 0.12,
          Math.min(0.58, hsl.s * 0.72 + 0.08),
          Math.min(0.78, hsl.l * 1.28 + 0.12),
        );
        material.emissive.lerp(new THREE.Color(0xd7b866), 0.08);
      }
      if (material instanceof THREE.MeshStandardMaterial && material.map) {
        material.map.anisotropy = Math.min(
          8,
          renderer.capabilities.getMaxAnisotropy(),
        );
        material.map.needsUpdate = true;
      }
      material.needsUpdate = true;
      return material;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(tuneMaterial)
      : tuneMaterial(child.material);
  });
}

let configuredGlowTexture: THREE.CanvasTexture | null = null;

function getConfiguredGlowTexture() {
  if (configuredGlowTexture) return configuredGlowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 62);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, "#ffffffdd");
  gradient.addColorStop(0.55, "#ffffff55");
  gradient.addColorStop(1, "#ffffff00");
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  configuredGlowTexture = new THREE.CanvasTexture(canvas);
  configuredGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return configuredGlowTexture;
}

export function decorateTowerVisualEffects(group: THREE.Group, effects: TowerVisualEffectDefinition[] = [], level = 1) {
  group.getObjectByName("managedTowerVisualEffects")?.removeFromParent();
  const active = effects.filter((effect) => effect.enabled && effect.type === "glow" && (!effect.level || effect.level === level));
  if (!active.length) return;
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const collection = new THREE.Group();
  collection.name = "managedTowerVisualEffects";
  active.forEach((definition, index) => {
    const effect = new THREE.Group();
    effect.name = "managedTowerGlow";
    effect.position.set(center.x, bounds.min.y + size.y * THREE.MathUtils.clamp(definition.heightRatio ?? 0.9, 0, 2), center.z);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getConfiguredGlowTexture(), color: new THREE.Color(definition.color), transparent: true, opacity: THREE.MathUtils.clamp(definition.opacity, 0, 1), depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sprite.renderOrder = 10;
    effect.userData.baseScale = Math.max(0.05, definition.size);
    effect.userData.pulseSpeed = Math.max(0, definition.pulseSpeed);
    effect.userData.phase = index * 1.7;
    sprite.scale.setScalar(effect.userData.baseScale);
    effect.add(sprite); collection.add(effect);
  });
  group.add(collection);
}

export function createTowerModelLibrary({
  renderer,
  faction,
  managedModels,
  decorate,
}: TowerModelLibraryOptions): TowerModelLibrary {
  const templates = new Map<string, THREE.Group>();
  let disposed = false;

  async function load() {
    const loader = new GLTFLoader();
    const modelDefinitions = [
      ...LEVELLED_TOWER_MODELS,
      ...Object.entries(managedModels ?? {})
        .filter(([kind]) => !LEVELLED_TOWER_MODELS.some((definition) => definition.kind === kind))
        .map(([kind, managed]) => {
          const base = LEVELLED_TOWER_MODELS.find((definition) => definition.kind === managed?.templateKind)
            ?? LEVELLED_TOWER_MODELS[0]!;
          return { ...base, kind: kind as TowerKind, modelName: `${base.modelName}-${kind}` };
        }),
    ];
    const requests = modelDefinitions.flatMap((definition) => {
      const managed = managedModels?.[definition.kind];
      const baseDefinition = LEVELLED_TOWER_MODELS.find((item) => item.kind === managed?.templateKind) ?? definition;
      const levels = [...new Set([
        ...Object.keys(definition.urls),
        ...Object.keys(managed?.dark ?? {}),
        ...Object.keys(managed?.human ?? {}),
      ].map(Number))].filter((level) => Number.isInteger(level) && level > 0);
      return levels.map(async (level) => {
        try {
          const visualKind = managed?.templateKind ?? definition.kind;
          const hasHumanModel = visualKind === "water";
          const modelUrl =
            managed?.[faction]?.[level] ??
            managed?.dark[level] ??
            (faction === "human" && hasHumanModel
              ? `/api/tower-defense/assets/models/games/tower-defense/towers/water/human/level${level}.glb`
              : baseDefinition.urls[level]);
          if (!modelUrl) return;
          const gltf = await loader.loadAsync(modelUrl);
          if (disposed) return;
          normalizeSource(
            gltf.scene,
            managed?.targetHeightByLevel?.[level] ?? managed?.targetHeight ?? definition.targetHeight,
            renderer,
            faction,
            faction === "human" && Boolean(managed?.human[level] || hasHumanModel),
          );
          const template = new THREE.Group();
          template.name = `${definition.modelName}Level${level}`;
          template.userData.kind = definition.kind;
          template.userData.level = level;
          if (visualKind === "frost")
            template.userData.frostEffectCenterY = 1.77;
          template.add(gltf.scene);
          decorateTowerVisualEffects(template, managed?.visualEffects, level);
          decorate(template, visualKind, Math.min(3, level) as 1 | 2 | 3);
          templates.set(templateKey(definition.kind, level), template);
        } catch (error) {
          console.warn(
            `[Kingdom Defense] Không thể tải ${definition.kind} level ${level}.`,
            error,
          );
        }
      });
    });
    await Promise.all(requests);
  }

  function get(kind: TowerKind, level: number) {
    return templates.get(templateKey(kind, level));
  }

  function has(kind: TowerKind, level: number) {
    return templates.has(templateKey(kind, level));
  }

  function dispose() {
    disposed = true;
    templates.forEach(disposeTemplate);
    templates.clear();
  }

  return { load, get, has, dispose };
}
