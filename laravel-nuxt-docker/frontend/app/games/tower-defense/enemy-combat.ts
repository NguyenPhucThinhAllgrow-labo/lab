import type {
  Enemy,
  EnemyCombatProfile,
  EnemyCombatProfileKey,
  EnemyStatusEffect,
  TowerKind,
} from "~/types/games/towerDefense";

/**
 * Hồ sơ chiến đấu của từng loại quái. Hệ số 1 là bình thường, 0 là miễn nhiễm.
 * Khi thêm quái mới, chỉ cần khai báo profile và gán key lúc spawn.
 */
export const ENEMY_COMBAT_PROFILES: Record<
  EnemyCombatProfileKey,
  EnemyCombatProfile
> = {
  normal: {
    damageMultipliers: {},
    effectDurationMultipliers: {},
  },
  "lava-boss": {
    damageMultipliers: {
      fire: 0.1,
      water: 1.25,
    },
    effectDurationMultipliers: {
      burn: 0,
    },
  },
};

export function getEnemyCombatProfile(enemy: Enemy) {
  if (enemy.combatProfile) return enemy.combatProfile;
  return (
    ENEMY_COMBAT_PROFILES[enemy.combatProfileKey] ??
    ENEMY_COMBAT_PROFILES.normal
  );
}

export function enemyDamageMultiplier(enemy: Enemy, damageKind: TowerKind) {
  return getEnemyCombatProfile(enemy).damageMultipliers[damageKind] ?? 1;
}

export function damageEnemy(
  enemy: Enemy,
  damageKind: TowerKind,
  rawDamage: number,
) {
  const damage = rawDamage * enemyDamageMultiplier(enemy, damageKind);
  enemy.hp -= damage;
  return damage;
}

export function enemyEffectDuration(
  enemy: Enemy,
  effect: EnemyStatusEffect,
  baseDuration: number,
) {
  const multiplier =
    getEnemyCombatProfile(enemy).effectDurationMultipliers[effect] ?? 1;
  return baseDuration * multiplier;
}
