import { TOWER_DEFINITIONS } from "~/games/tower-defense/gameplay-config";
import type { TowerDefinition, TowerKind } from "~/types/games/towerDefense";
import type {
  LevelledTowerKind,
  ManagedTowerModelDefinition,
} from "~/components/tower-defense/scene/tower-models";

interface ManagedTower {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  damage: number;
  range: number;
  fire_rate: number;
  color: string;
  effects: Partial<TowerDefinition> | null;
  model_asset_keys: Record<string, string> | null;
  model_configuration: { targetHeight?: number } | null;
}

const knownTowerKinds = new Set(Object.keys(TOWER_DEFINITIONS));

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
      if (!knownTowerKinds.has(tower.id)) continue;
      const kind = tower.id as TowerKind;
      activeKinds.push(kind);
      TOWER_DEFINITIONS[kind] = {
        ...TOWER_DEFINITIONS[kind],
        ...(tower.effects ?? {}),
        kind,
        name: tower.name,
        description: tower.description ?? "",
        cost: tower.cost,
        damage: tower.damage,
        range: tower.range,
        fireRate: tower.fire_rate,
        color: tower.color,
      };
      const levelledKind = kind as LevelledTowerKind;
      const keys = tower.model_asset_keys ?? {};
      managedModels[levelledKind] = {
        targetHeight: tower.model_configuration?.targetHeight ?? 2,
        dark: {
          1: modelUrl(keys.dark1), 2: modelUrl(keys.dark2), 3: modelUrl(keys.dark3),
        },
        human: {
          1: modelUrl(keys.human1), 2: modelUrl(keys.human2), 3: modelUrl(keys.human3),
        },
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
