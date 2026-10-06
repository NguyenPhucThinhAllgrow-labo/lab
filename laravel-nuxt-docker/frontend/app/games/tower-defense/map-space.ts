import { citadelBridgePointWorld } from "~/utils/games/citadelBridgeLayout";
import type { GridPoint, TowerDefenseMapDefinition } from "~/types/games/towerDefense";

const cornerCache = new WeakMap<TowerDefenseMapDefinition, Map<string, NonNullable<ReturnType<typeof citadelBridgePointWorld>>>>();
const rotationCos = Math.cos(-0.18);
const rotationSin = Math.sin(-0.18);

/** Shared horizontal projection for both simulation and Three.js. */
export function mapSpacePosition(map: TowerDefenseMapDefinition, point: GridPoint) {
  if (map.scenePreset === "citadel-of-cinders") {
    let cache = cornerCache.get(map);
    if (!cache) { cache = new Map(); cornerCache.set(map, cache); }
    const corner = (x: number, y: number) => {
      const key = `${x}:${y}`;
      const cached = cache!.get(key);
      if (cached) return cached;
      const value = citadelBridgePointWorld({ x, y }, map);
      if (value) cache!.set(key, value);
      return value;
    };
    const left = Math.floor(point.x), top = Math.floor(point.y);
    const a = corner(left, top), b = corner(Math.ceil(point.x), top);
    const c = corner(left, Math.ceil(point.y)), d = corner(Math.ceil(point.x), Math.ceil(point.y));
    if (a && b && c && d) {
      const lerp = (from: number, to: number, ratio: number) => from + (to-from)*ratio;
      const interpolate = (av: number, bv: number, cv: number, dv: number) =>
        lerp(lerp(av, bv, point.x-left), lerp(cv, dv, point.x-left), point.y-top);
      const x = interpolate(a.x, b.x, c.x, d.x);
      const z = interpolate(a.z, b.z, c.z, d.z);
      const slabHeight = (value: typeof a) => value.onDeck ? 0.1 : value.balcony ? 0 : 0.02;
      const surfaceOffset = interpolate(slabHeight(a), slabHeight(b), slabHeight(c), slabHeight(d));
      return {
        x: x*rotationCos + z*rotationSin,
        z: z*rotationCos - x*rotationSin,
        surfaceOffset,
        padOffset: Math.abs(a.z) > Math.max(map.sceneSettings?.bridge.width ?? 6.5, 3)/2 ? 0 : surfaceOffset,
        baseY: map.sceneSettings?.bridge.deckWorldY ?? 5.3,
      };
    }
  }
  return {
    x: (point.x-(map.columns-1)/2)*map.cellSize,
    z: (point.y-(map.rows-1)/2)*map.cellSize,
    surfaceOffset: 0, padOffset: 0, baseY: 0,
  };
}

/** Ranges remain in cell units, matching the UI's radius * cellSize. */
export function createMapSpatialMetrics(map: TowerDefenseMapDefinition) {
  const positions = new WeakMap<GridPoint, { x: number; y: number; world: ReturnType<typeof mapSpacePosition> }>();
  const position = (point: GridPoint) => {
    const cached = positions.get(point);
    if (cached && cached.x === point.x && cached.y === point.y) return cached.world;
    const world = mapSpacePosition(map, point);
    positions.set(point, { x: point.x, y: point.y, world });
    return world;
  };
  return {
    distanceSquared(a: GridPoint, b: GridPoint) {
      const from = position(a), to = position(b);
      return ((from.x-to.x)**2 + (from.z-to.z)**2) / map.cellSize**2;
    },
    aimAngle(fromPoint: GridPoint, toPoint: GridPoint) {
      const from = position(fromPoint), to = position(toPoint);
      return Math.atan2(to.z-from.z, to.x-from.x)*180/Math.PI;
    },
  };
}
