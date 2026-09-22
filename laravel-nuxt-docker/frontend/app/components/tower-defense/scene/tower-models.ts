import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { TowerKind } from "~/types/games/towerDefense";

export type LevelledTowerKind = Extract<
  TowerKind,
  "frost" | "fire" | "thunder" | "water"
>;

interface TowerModelDefinition {
  kind: LevelledTowerKind;
  modelName: string;
  targetHeight: number;
  urls: Record<1 | 2 | 3, string>;
}

const LEVELLED_TOWER_MODELS: TowerModelDefinition[] = [
  {
    kind: "frost",
    modelName: "FrostTower3D",
    targetHeight: 2.1,
    urls: {
      1: "/models/games/tower-defense/frost/enemy/level1.glb",
      2: "/models/games/tower-defense/frost/enemy/level2.glb",
      3: "/models/games/tower-defense/frost/enemy/level3.glb",
    },
  },
  {
    kind: "fire",
    modelName: "FireTower3D",
    targetHeight: 2.1,
    urls: {
      1: "/models/games/tower-defense/fire/enemy/level1.glb",
      2: "/models/games/tower-defense/fire/enemy/level2.glb",
      3: "/models/games/tower-defense/fire/enemy/level3.glb",
    },
  },
  {
    kind: "thunder",
    modelName: "ThunderTower3D",
    targetHeight: 2.1,
    urls: {
      1: "/models/games/tower-defense/thunder/enemy/level1.glb",
      2: "/models/games/tower-defense/thunder/enemy/level2.glb",
      3: "/models/games/tower-defense/thunder/enemy/level3.glb",
    },
  },
  {
    kind: "water",
    modelName: "WaterTower3D",
    targetHeight: 2,
    urls: {
      1: "/models/games/tower-defense/water/enemy/level1.glb",
      2: "/models/games/tower-defense/water/enemy/level2.glb",
      3: "/models/games/tower-defense/water/enemy/level3.glb",
    },
  },
];

export interface TowerModelLibraryOptions {
  renderer: THREE.WebGLRenderer;
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
  `${kind}:${THREE.MathUtils.clamp(Math.round(level), 1, 3)}`;

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

export function createTowerModelLibrary({
  renderer,
  decorate,
}: TowerModelLibraryOptions): TowerModelLibrary {
  const templates = new Map<string, THREE.Group>();
  let disposed = false;

  async function load() {
    const loader = new GLTFLoader();
    const requests = LEVELLED_TOWER_MODELS.flatMap((definition) =>
      ([1, 2, 3] as const).map(async (level) => {
        try {
          const gltf = await loader.loadAsync(definition.urls[level]);
          if (disposed) return;
          normalizeSource(gltf.scene, definition.targetHeight, renderer);
          const template = new THREE.Group();
          template.name = `${definition.modelName}Level${level}`;
          template.userData.kind = definition.kind;
          template.userData.level = level;
          if (definition.kind === "frost")
            template.userData.frostEffectCenterY = 1.77;
          template.add(gltf.scene);
          decorate(template, definition.kind, level);
          templates.set(templateKey(definition.kind, level), template);
        } catch (error) {
          console.warn(
            `[Kingdom Defense] Không thể tải ${definition.kind} level ${level}.`,
            error,
          );
        }
      }),
    );
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
