import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { kingdomCrossroadsMap } from "./kingdom-crossroads";
import { lavaFortressMap } from "./lava-fortress";

export const DEFAULT_TOWER_DEFENSE_MAP_ID = kingdomCrossroadsMap.id;
export const TOWER_DEFENSE_MAPS: Record<string, TowerDefenseMapDefinition> = {
  [kingdomCrossroadsMap.id]: kingdomCrossroadsMap,
  [lavaFortressMap.id]: lavaFortressMap,
};

/** Trả về map đã đăng ký; map mặc định được dùng nếu ID không tồn tại. */
export function getTowerDefenseMap(mapId = DEFAULT_TOWER_DEFENSE_MAP_ID) {
  return TOWER_DEFENSE_MAPS[mapId] ?? kingdomCrossroadsMap;
}

export { kingdomCrossroadsMap };
export { mapPathPosition } from "./map-utils";
