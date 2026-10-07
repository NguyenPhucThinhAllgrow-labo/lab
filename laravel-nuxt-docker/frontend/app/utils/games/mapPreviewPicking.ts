import type { GridPoint, TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { citadelForecourtTiles, pickCitadelBridgePoint } from "./citadelBridgeLayout";
import { mapSpacePosition } from "~/games/tower-defense/map-space";

/** Inverse of the game's projection, with the same physical paving snap as 2D. */
export function pickMapPreviewPoint(map: TowerDefenseMapDefinition, world: { x: number; z: number }, pads = false): GridPoint | null {
  if (pads) {
    const existing = map.buildableTiles?.find((point) => {
      const position = mapSpacePosition(map, point);
      return Math.hypot(position.x - world.x, position.z - world.z) <= (map.scenePreset === "citadel-of-cinders" ? 1.4 : map.cellSize * 0.45);
    });
    if (existing) return { ...existing };
  }
  let x: number; let y: number;
  if (map.scenePreset === "citadel-of-cinders" && map.sceneSettings?.lava) {
    const cos = Math.cos(-0.18); const sin = Math.sin(-0.18);
    const localX = world.x * cos - world.z * sin;
    const localZ = world.x * sin + world.z * cos;
    x = (localX + map.sceneSettings.lava.width / 2) / map.cellSize;
    y = (localZ + map.sceneSettings.lava.depth / 2) / map.cellSize;
    const bridge = pickCitadelBridgePoint(x, y, map, pads);
    if (bridge) return bridge;
    const court = citadelForecourtTiles(map).find((tile) =>
      Math.abs(localX - tile.worldX) < tile.width * map.cellSize / 2
      && Math.abs(localZ - tile.worldZ) < tile.height * map.cellSize / 2);
    if (court) return { ...court.point };
  } else {
    x = world.x / map.cellSize + (map.columns - 1) / 2;
    y = world.z / map.cellSize + (map.rows - 1) / 2;
  }
  const point = { x: Math.round(x), y: Math.round(y) };
  return point.x >= 0 && point.x < map.columns && point.y >= 0 && point.y < map.rows ? point : null;
}
