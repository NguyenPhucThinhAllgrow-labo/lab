import type { BossClass, TowerDefinition, TowerKind } from "~/types/games/towerDefense";

export const TOWER_DEFENSE_STORAGE_KEY = "game-lab:kingdom-defense:best-wave";
export const FROST_EFFECT_RADIUS = 1.47;
export const FROST_SLOW_DURATION_SECONDS = 1.4;
export const WATER_SLOW_DURATION_SECONDS = 2;
export const MAX_TOWER_LEVEL = 3;
export const TOWER_RANGE_LEVEL_BONUS = 0.22;
export const ENEMY_HIT_RADIUS = 0.28;
export const ENEMY_SPAWN_PROGRESS = -0.85;
export const BETWEEN_WAVE_DELAY_SECONDS = 30;
export const STARTING_CREDITS = 3000;
export const WAVE_BASE_REWARD = 30;
export const WAVE_REWARD_GROWTH = 4;
export const BOSS_HEALTH_MULTIPLIER = 5.5;
export const BOSS_REWARD_MULTIPLIER = 5;
export const BOSS_CASTLE_DAMAGE = 5;
// Đủ xử lý một tick nền khoảng 1 giây ngay cả ở tốc độ 4×, nhưng vẫn giới hạn
// lượng công việc của mỗi lần gọi để tab vừa mở lại không khóa main thread.
export const MAX_SIMULATION_STEPS_PER_TICK = 48;
export const BOSS_CLASSES: BossClass[] = ["barbarian", "knight", "mage", "ranger", "rogue"];
export const PREVIEW_ALL_BOSSES_ON_FIRST_WAVE = false;
export const UPGRADE_COST_MULTIPLIERS = { 1: 0.75, 2: 1.1 } as const;
const DEFAULT_FIRE_RATE_LEVEL_BONUS = 0.18;
const ARCHER_FIRE_RATE_LEVEL_BONUS = 0.35;

export const TOWER_DEFINITIONS: Record<TowerKind, TowerDefinition> = {
  archer: { kind: "archer", role: "damage", name: "Tháp cung", description: "Tầm xa; mỗi lần nâng cấp bắn thêm 2 mục tiêu.", cost: 90, damage: 10, range: 3.4, fireRate: 0.75, color: "#65a30d" },
  cannon: { kind: "cannon", name: "Tháp pháo", description: "Uy lực lớn, nổ lan quanh mục tiêu.", cost: 145, damage: 34, range: 2.7, fireRate: 1.45, splashRadius: 0.9, splashDamageRatio: 0.45, color: "#d97706" },
  frost: { kind: "frost", name: "Tháp băng", description: "Đóng băng hoàn toàn kẻ địch trong vùng.", cost: 120, damage: 0, range: FROST_EFFECT_RADIUS, fireRate: 5.2, color: "#0891b2" },
  fire: { kind: "fire", name: "Tháp lửa", description: "Cầu lửa nổ lan và thiêu đốt trong 4 giây.", cost: 150, damage: 10, range: 2.7, fireRate: 1.1, burnDuration: 4, burnDamagePerSecond: 4, splashRadius: 1.05, splashDamageRatio: 0.55, color: "#dc2626" },
  thunder: { kind: "thunder", name: "Tháp sét", description: "Tia điện liên tục, nối chuỗi qua nhiều mục tiêu.", cost: 175, damage: 16, range: 3.05, fireRate: 0, color: "#7c3aed" },
  water: { kind: "water", name: "Tháp nước", description: "Phun dòng nước gây sát thương lan và làm chậm cả nhóm.", cost: 135, damage: 12, range: 2.85, fireRate: 0.85, slow: 0.25, slowDuration: WATER_SLOW_DURATION_SECONDS, splashRadius: 0.85, splashDamageRatio: 0.6, color: "#0284c7" },
  speed: { kind: "speed", name: "Trụ tốc độ", description: "Tăng tốc đánh cho các tháp trong phạm vi.", cost: 165, damage: 0, range: 2.5, fireRate: 0, color: "#22c55e" },
  damage: { kind: "damage", name: "Trụ sát thương", description: "Tăng sát thương cho các tháp trong phạm vi.", cost: 175, damage: 0, range: 2.5, fireRate: 0, color: "#ef4444" },
};

export function isSupportTowerKind(kind: TowerKind | null | undefined) {
  return kind ? TOWER_DEFINITIONS[kind].role === "buff" || kind === "speed" || kind === "damage" : false;
}

export function towerEffectValue(effect: { value: number; perLevel?: number }, level: number) {
  return effect.value + Math.max(0, level - 1) * (effect.perLevel ?? 0);
}

export function towerDamageAtLevel(definition: TowerDefinition, level: number) {
  const normalizedLevel = Math.max(1, Math.min(definition.maxLevel ?? MAX_TOWER_LEVEL, Math.round(level)));
  const levelStat = definition.levelStats?.[normalizedLevel];
  if (levelStat) return levelStat.damage;
  const configured = definition.damageByLevel?.[normalizedLevel];
  if (configured !== undefined) return configured;
  const growth = definition.kind === "thunder" ? 0.42 : 0.55;
  return definition.damage * (1 + (normalizedLevel - 1) * growth);
}

export function towerRangeAtLevel(definition: TowerDefinition, level: number) {
  const normalizedLevel = Math.max(1, Math.min(definition.maxLevel ?? MAX_TOWER_LEVEL, Math.round(level)));
  const configured = definition.levelStats?.[normalizedLevel]?.range;
  if (configured !== undefined) return configured;
  if (definition.kind === "frost" || isSupportTowerKind(definition.kind)) return definition.range;
  return definition.range + (normalizedLevel - 1) * TOWER_RANGE_LEVEL_BONUS;
}

export function towerMaxLevel(kind: TowerKind) {
  return Math.max(1, TOWER_DEFINITIONS[kind].maxLevel ?? MAX_TOWER_LEVEL);
}

export function towerUpgradeCostMultiplier(level: number) {
  if (level === 1) return UPGRADE_COST_MULTIPLIERS[1];
  if (level === 2) return UPGRADE_COST_MULTIPLIERS[2];
  return UPGRADE_COST_MULTIPLIERS[2] + (level - 2) * 0.35;
}

export function towerUpgradeCost(kind: TowerKind, targetLevel: number) {
  const definition = TOWER_DEFINITIONS[kind];
  const configured = definition.levelStats?.[targetLevel]?.upgradeCost;
  if (configured !== undefined) return configured;
  return Math.round((definition.cost * towerUpgradeCostMultiplier(targetLevel - 1)) / 5) * 5;
}

/** Kiểm tra một loại tower có được phép nhận buff hỗ trợ tương ứng hay không. */
export function canTowerReceiveSupportBuff(
  towerKind: TowerKind,
  supportKind: "speed" | "damage",
) {
  if (isSupportTowerKind(towerKind)) return false;
  return !(towerKind === "frost" && supportKind === "damage");
}

export function towerSupportBonus(level: number) {
  return level >= 3 ? 0.5 : level === 2 ? 0.3 : 0.1;
}

/** Thời gian giữa hai lần bắn; tháp cung nhận thêm tốc độ rõ rệt qua mỗi cấp. */
export function towerFireInterval(kind: TowerKind, level: number) {
  const configured = TOWER_DEFINITIONS[kind].levelStats?.[level]?.fireRate;
  if (configured !== undefined) return configured;
  const levelBonus =
    kind === "archer"
      ? ARCHER_FIRE_RATE_LEVEL_BONUS
      : DEFAULT_FIRE_RATE_LEVEL_BONUS;
  return TOWER_DEFINITIONS[kind].fireRate / (1 + (level - 1) * levelBonus);
}
