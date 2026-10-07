import type { GridPoint } from "~/types/games/towerDefense";

export type SwampRoadFence = { from: GridPoint; to: GridPoint };

/** Fence the exposed boundary of the whole road, not each lane independently. */
export function swampRoadFences(paths: GridPoint[][], pads: GridPoint[] = []): SwampRoadFence[] {
  const key = (p: GridPoint) => `${p.x}:${p.y}`;
  const cells = new Map(paths.flat().map((p) => [key(p), p]));
  const openings = new Set<string>();
  for (const lane of paths) {
    if (lane.length < 2) continue;
    for (const [end, adjacent] of [[lane[0]!, lane[1]!], [lane.at(-1)!, lane.at(-2)!]] as const) {
      const dx = Math.sign(end.x - adjacent.x);
      const dy = Math.sign(end.y - adjacent.y);
      if (Math.abs(dx) + Math.abs(dy) === 1) openings.add(`${key(end)}:${dx}:${dy}`);
    }
  }
  const fences: SwampRoadFence[] = [];
  for (const point of [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x)) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (cells.has(key({ x: point.x + dx, y: point.y + dy }))
        || openings.has(`${key(point)}:${dx}:${dy}`)) continue;
      const center = { x: point.x + dx * 0.5, y: point.y + dy * 0.5 };
      const from = { x: center.x - dy * 0.5, y: center.y + dx * 0.5 };
      const to = { x: center.x + dy * 0.5, y: center.y - dx * 0.5 };
      // Leave access to platforms alongside the road (distance to the whole rail).
      if (pads.some((pad) => {
        const x = Math.max(Math.min(from.x, to.x), Math.min(Math.max(from.x, to.x), pad.x));
        const y = Math.max(Math.min(from.y, to.y), Math.min(Math.max(from.y, to.y), pad.y));
        return Math.hypot(pad.x - x, pad.y - y) < 0.7;
      })) continue;
      fences.push({ from, to });
    }
  }
  return fences;
}
