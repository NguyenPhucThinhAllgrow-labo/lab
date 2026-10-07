import type { GridPoint, TowerDefenseMapDefinition } from "~/types/games/towerDefense";

function shiftMap(map: TowerDefenseMapDefinition, delta: number): TowerDefenseMapDefinition {
  const shift = <P extends GridPoint>(p: P): P => ({ ...p, x: p.x + delta, y: p.y + delta });
  return {
    ...map,
    columns: map.columns + delta * 2,
    rows: map.rows + delta * 2,
    paths: map.paths.map((lane) => lane.map(shift)) as TowerDefenseMapDefinition["paths"],
    pathTiles: map.pathTiles.map(shift),
    spawnPoints: map.spawnPoints?.map(shift) as TowerDefenseMapDefinition["spawnPoints"],
    buildableTiles: map.buildableTiles?.map(shift),
    castle: { ...map.castle, position: map.castle.position ? shift(map.castle.position) : undefined },
    swampSettings: map.swampSettings ? {
      ...map.swampSettings,
      islands: map.swampSettings.islands.map(shift),
      bridges: map.swampSettings.bridges.map(({ from, to }) => ({ from: shift(from), to: shift(to) })),
    } : undefined,
  };
}

/** Include the 35-world-unit scenic water apron in the saved, editable grid. */
export function expandSwampEditableArea<T extends { scenePreset?: string; columns: number; rows: number; cellSize: number }>(source: T): T {
  const map = source as unknown as TowerDefenseMapDefinition;
  if (map.scenePreset !== "gothic-swamp" || map.swampSettings?.editorPadding) return source;
  const padding = Math.max(0, Math.min(Math.floor(35 / map.cellSize), Math.floor((100 - map.columns) / 2), Math.floor((100 - map.rows) / 2)));
  if (!padding || !map.swampSettings) return source;
  const expanded = shiftMap(map, padding);
  expanded.swampSettings!.editorPadding = padding;
  return expanded as unknown as T;
}

/** Keep procedural scenery in its original frame while the editable grid grows. */
export function swampSceneryMap(map: TowerDefenseMapDefinition): TowerDefenseMapDefinition {
  const padding = map.swampSettings?.editorPadding ?? 0;
  return padding ? shiftMap(map, -padding) : map;
}
