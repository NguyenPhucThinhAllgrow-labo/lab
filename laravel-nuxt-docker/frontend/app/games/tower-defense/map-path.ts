import type {
  GridPoint,
  TowerDefenseLane,
  TowerDefenseMapDefinition,
} from "~/types/games/towerDefense";

/** Nội suy vị trí trên lane và bo góc bằng quadratic Bézier. */
export function mapPathPosition(
  map: TowerDefenseMapDefinition,
  progress: number,
  lane: TowerDefenseLane = 0,
): GridPoint {
  const path = map.paths[lane];
  const index =
    progress < 0 ? 0 : Math.min(Math.floor(progress), path.length - 2);
  const ratio = progress < 0 ? progress : progress - index;
  const from = path[index]!;
  const to = path[index + 1]!;
  const linearPosition = {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
  if (progress < 0) return linearPosition;

  for (let cornerIndex = 1; cornerIndex < path.length - 1; cornerIndex++) {
    if (Math.abs(progress - cornerIndex) > map.cornerRadius) continue;
    const previous = path[cornerIndex - 1]!;
    const corner = path[cornerIndex]!;
    const next = path[cornerIndex + 1]!;
    if ((previous.x === corner.x) === (corner.x === next.x)) continue;
    const start = {
      x: corner.x + (previous.x - corner.x) * map.cornerRadius,
      y: corner.y + (previous.y - corner.y) * map.cornerRadius,
    };
    const end = {
      x: corner.x + (next.x - corner.x) * map.cornerRadius,
      y: corner.y + (next.y - corner.y) * map.cornerRadius,
    };
    const turnProgress =
      (progress - (cornerIndex - map.cornerRadius)) / (map.cornerRadius * 2);
    const inverse = 1 - turnProgress;
    return {
      x:
        inverse * inverse * start.x +
        2 * inverse * turnProgress * corner.x +
        turnProgress * turnProgress * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * turnProgress * corner.y +
        turnProgress * turnProgress * end.y,
    };
  }
  return linearPosition;
}
