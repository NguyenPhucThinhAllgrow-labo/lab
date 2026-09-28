import type {
  Enemy,
  EnemyCombatProfile,
  EnemyCombatProfileKey,
  EnemyStatusEffect,
  TowerDamageType,
  TowerKind,
} from "~/types/games/towerDefense";
import { TOWER_DEFINITIONS, towerTemplateKind } from "~/games/tower-defense/gameplay-config";

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

export function towerDamageType(kind: TowerKind): TowerDamageType {
  const configuredType = TOWER_DEFINITIONS[kind]?.damageType;
  if (configuredType) return configuredType;
  const templateKind = towerTemplateKind(kind);
  if (templateKind === "archer" || templateKind === "cannon") return "physical";
  if (templateKind === "support") return "none";
  return "magic";
}

/** Chỉ số phòng thủ giảm dần: 100 giáp/kháng tương đương giảm 50%. */
export function enemyDefenseMultiplier(enemy: Enemy, damageKind: TowerKind) {
  const type = towerDamageType(damageKind);
  if (type === "none") return 1;
  const defense = Math.max(
    0,
    Number(type === "physical" ? enemy.armor : enemy.magicResistance) || 0,
  );
  return 100 / (100 + defense);
}

export function damageEnemy(
  enemy: Enemy,
  damageKind: TowerKind,
  rawDamage: number,
) {
  const damage =
    rawDamage *
    enemyDamageMultiplier(enemy, damageKind) *
    enemyDefenseMultiplier(enemy, damageKind);
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
