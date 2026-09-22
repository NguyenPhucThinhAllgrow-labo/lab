import type {
  BossClass,
  TowerDefenseCharacterModelDefinition,
} from "~/types/games/towerDefense";

/**
 * Model của quái thường. Khi thêm loại quái mới, khai báo thêm một definition
 * cùng cấu trúc và chọn definition đó từ dữ liệu gameplay.
 */
export const DEFAULT_ENEMY_MODEL_KEY = "normal";

export const ENEMY_MODEL_DEFINITIONS: Record<
  string,
  TowerDefenseCharacterModelDefinition
> = {
  normal: {
    url: "/models/games/tower-defense/character/normal.glb",
    characterScale: 2,
    sceneScale: 0.494,
    healthBarY: 2.1,
    animationNames: ["walk"],
    removeRootMotion: true,
  },
};

export const ADVENTURE_KIT_ROOT =
  "/models/games/tower-defense/kit/adventure";

export const BOSS_CHARACTER_PATHS: Record<BossClass, string> = {
  knight: "Characters/gltf/Knight.glb",
  barbarian: "Characters/gltf/Barbarian.glb",
  mage: "Characters/gltf/Mage.glb",
  ranger: "Characters/gltf/Ranger.glb",
  rogue: "Characters/gltf/Rogue.glb",
};

export const BOSS_MOVEMENT_PATH =
  "Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb";

export const BOSS_MODEL_SCALE = 1.05;
export const BOSS_CHARACTER_SCALE = 0.78;
export const BOSS_HEALTH_BAR_Y = 1.9;
export const BOSS_WALK_ANIMATION_NAMES = ["Walking_A"];

export interface BossEquipmentDefinition {
  right: string;
  left: string;
  rightTransform?: EquipmentTransform;
  leftTransform?: EquipmentTransform;
}

export interface EquipmentTransform {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const BOSS_EQUIPMENT_PATHS: Record<
  BossClass,
  BossEquipmentDefinition
> = {
  knight: {
    right: "Assets/gltf/sword_1handed.gltf",
    left: "Assets/gltf/shield_round_color.gltf",
  },
  barbarian: {
    right: "Assets/gltf/axe_1handed.gltf",
    left: "Assets/gltf/shield_round_barbarian.gltf",
    rightTransform: { rotation: [0, Math.PI, 0] },
  },
  mage: {
    right: "Assets/gltf/staff.gltf",
    left: "Assets/gltf/spellbook_open.gltf",
    leftTransform: {
      position: [0, 0.2, 0.08],
      rotation: [-Math.PI / 2, 0, 0],
    },
  },
  ranger: {
    right: "Assets/gltf/arrow_bow.gltf",
    left: "Assets/gltf/bow_withString.gltf",
    rightTransform: { position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0] },
    leftTransform: {
      position: [0, 0, 0],
      rotation: [Math.PI / 2, 0, Math.PI],
    },
  },
  rogue: {
    right: "Assets/gltf/dagger.gltf",
    left: "Assets/gltf/dagger.gltf",
  },
};

/*
 * Code cũ của quái thường được giữ lại để tham khảo:
 *
 * const characterTemplate =
 *   enemy.kind === "boss" && enemy.bossClass
 *     ? bossEnemyTemplates.get(enemy.bossClass)
 *     : riggedEnemyTemplate;
 *
 * attachEquipment("handslotr", enemySwordTemplate, "enemyRightWeapon");
 * attachEquipment("handslotl", enemyShieldTemplate, "enemyLeftWeapon");
 *
 * const walk =
 *   riggedEnemyAnimations.find((clip) => clip.name === "Walking_A") ??
 *   riggedEnemyAnimations[0];
 */
