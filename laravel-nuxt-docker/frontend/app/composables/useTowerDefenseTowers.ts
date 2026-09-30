import { TOWER_DEFINITIONS } from "~/games/tower-defense/gameplay-config";
import type { TowerDamageType, TowerDefinition, TowerEffectDefinition, TowerKind, TowerLevelStats } from "~/types/games/towerDefense";
import type {
  LevelledTowerKind,
  ManagedTowerModelDefinition,
  TowerVisualEffectDefinition,
} from "~/components/tower-defense/scene/tower-models";

interface ManagedTower {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  role: "damage" | "buff";
  damage_type: TowerDamageType;
  cost: number;
  damage: number;
  damage_by_level: Record<string, number> | null;
  max_level: number;
  level_stats: Record<string, TowerLevelStats> | null;
  range: number;
  fire_rate: number;
  color: string;
  image_asset_key: string | null;
  effects: (Partial<TowerDefinition> & { items?: TowerEffectDefinition[] }) | null;
  model_asset_keys: Record<string, string> | null;
  model_configuration: { targetHeight?: number; targetHeightByLevel?: Record<string, number>; visualEffects?: TowerVisualEffectDefinition[] } | null;
}

const builtInDefinitions = { ...TOWER_DEFINITIONS };

/** Ghi đè cấu hình mặc định bằng các hồ sơ đang bật trong CMS. */
export interface TowerDefenseTowerCatalog {
  activeKinds: TowerKind[];
  managedModels: Partial<Record<LevelledTowerKind, ManagedTowerModelDefinition>>;
  usesFallback: boolean;
}

const modelUrl = (key?: string) => key
  ? `/api/tower-defense/assets/${key.split("/").map(encodeURIComponent).join("/")}`
  : undefined;

/** Nạp danh mục đang bật, chỉ số và model tower do CMS quản lý. */
export async function fetchTowerDefenseTowers(): Promise<TowerDefenseTowerCatalog> {
  try {
    const response = await $fetch<{ data: ManagedTower[] }>("/api/tower-defense/towers");
    const activeKinds: TowerKind[] = [];
    const managedModels: TowerDefenseTowerCatalog["managedModels"] = {};
    for (const tower of response.data) {
      const kind = tower.id as TowerKind;
      const templateKind = tower.template_key as TowerKind;
      const template = builtInDefinitions[templateKind];
      if (!template) continue;
      activeKinds.push(kind);
      TOWER_DEFINITIONS[kind] = {
        ...template,
        ...(tower.effects ?? {}),
        kind,
        templateKind,
        role: tower.role,
        damageType: tower.damage_type,
        name: tower.name,
        description: tower.description ?? "",
        cost: tower.cost,
        damage: tower.damage,
        damageByLevel: tower.damage_by_level
          ? Object.fromEntries(Object.entries(tower.damage_by_level).map(([level, damage]) => [Number(level), Number(damage)]))
          : undefined,
        maxLevel: tower.max_level,
        levelStats: tower.level_stats
          ? Object.fromEntries(Object.entries(tower.level_stats).map(([level, stats]) => [Number(level), {
              damage: Number(stats.damage),
              range: Number(stats.range),
              fireRate: Number(stats.fireRate),
              chainTargets: stats.chainTargets === undefined ? undefined : Number(stats.chainTargets),
              chainRange: stats.chainRange === undefined ? undefined : Number(stats.chainRange),
              chainDamageRatio: stats.chainDamageRatio === undefined ? undefined : Number(stats.chainDamageRatio),
              upgradeCost: Number(stats.upgradeCost),
            }]))
          : undefined,
        range: tower.range,
        fireRate: tower.fire_rate,
        color: tower.color,
        imageUrl: tower.image_asset_key ? modelUrl(tower.image_asset_key) : undefined,
        effects: tower.effects?.items ?? [],
      };
      const levelledKind = kind as LevelledTowerKind;
      const keys = tower.model_asset_keys ?? {};
      const factionModels = (faction: "dark" | "human") => Object.fromEntries(
        Object.entries(keys)
          .filter(([key, value]) => key.startsWith(faction) && value)
          .map(([key, value]) => [Number(key.slice(faction.length)), modelUrl(value)!])
          .filter(([level]) => Number.isInteger(level) && Number(level) > 0),
      );
      managedModels[levelledKind] = {
        templateKind,
        targetHeight: tower.model_configuration?.targetHeight ?? 2,
        targetHeightByLevel: tower.model_configuration?.targetHeightByLevel
          ? Object.fromEntries(Object.entries(tower.model_configuration.targetHeightByLevel).map(([level, height]) => [Number(level), Number(height)]))
          : undefined,
        visualEffects: tower.model_configuration?.visualEffects ?? [],
        dark: factionModels("dark"),
        human: factionModels("human"),
      };
    }
    return { activeKinds, managedModels, usesFallback: false };
  } catch {
    // Backend cũ hoặc tạm thời ngoại tuyến: game vẫn dùng cấu hình tích hợp sẵn.
    return {
      activeKinds: Object.keys(TOWER_DEFINITIONS) as TowerKind[],
      managedModels: {},
      usesFallback: true,
    };
  }
}
