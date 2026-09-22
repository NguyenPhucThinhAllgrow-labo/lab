import type { BossClass, TowerDefinition, TowerKind } from "~/types/games/towerDefense";

export const TOWER_DEFENSE_STORAGE_KEY = "game-lab:kingdom-defense:best-wave";
export const FROST_EFFECT_RADIUS = 2.1;
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
// Không chạy bù vô hạn sau khi tab bị throttle hoặc main thread bận. Ở 4×,
// 250 ms thời gian thực tương ứng tối đa 10 bước simulation 100 ms.
export const MAX_TICK_BACKLOG_SECONDS = 0.25;
export const MAX_SIMULATION_STEPS_PER_TICK = 12;
export const BOSS_CLASSES: BossClass[] = ["barbarian", "knight", "mage", "ranger", "rogue"];
export const PREVIEW_ALL_BOSSES_ON_FIRST_WAVE = false;
export const UPGRADE_COST_MULTIPLIERS = { 1: 0.75, 2: 1.1 } as const;

export const TOWER_DEFINITIONS: Record<TowerKind, TowerDefinition> = {
  archer: { kind: "archer", name: "Tháp cung", description: "Tầm xa, sát thương ổn định.", cost: 90, damage: 10, range: 3.4, fireRate: 0.75, color: "#65a30d" },
  cannon: { kind: "cannon", name: "Tháp pháo", description: "Uy lực lớn, nổ lan quanh mục tiêu.", cost: 145, damage: 34, range: 2.7, fireRate: 1.45, splashRadius: 0.9, splashDamageRatio: 0.45, color: "#d97706" },
  frost: { kind: "frost", name: "Tháp băng", description: "Đóng băng hoàn toàn kẻ địch trong vùng.", cost: 120, damage: 0, range: FROST_EFFECT_RADIUS, fireRate: 2.6, color: "#0891b2" },
  fire: { kind: "fire", name: "Tháp lửa", description: "Cầu lửa nổ lan và thiêu đốt trong 4 giây.", cost: 150, damage: 10, range: 2.7, fireRate: 1.1, burnDuration: 4, burnDamagePerSecond: 4, splashRadius: 1.05, splashDamageRatio: 0.55, color: "#dc2626" },
  thunder: { kind: "thunder", name: "Tháp sét", description: "Tia điện liên tục, nối chuỗi qua nhiều mục tiêu.", cost: 175, damage: 16, range: 3.05, fireRate: 0, color: "#7c3aed" },
  water: { kind: "water", name: "Tháp nước", description: "Phun dòng nước gây sát thương và làm chậm.", cost: 135, damage: 12, range: 2.85, fireRate: 0.85, slow: 0.25, slowDuration: WATER_SLOW_DURATION_SECONDS, color: "#0284c7" },
};
