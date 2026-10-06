interface Point { x: number; y: number }

/** Shared edges, including lanes travelling in opposite directions. */
export function sharedLaneSegments(paths: readonly (readonly Point[])[]) {
  const edgeKey = (a: Point, b: Point) =>
    [`${a.x}:${a.y}`, `${b.x}:${b.y}`].sort().join("|");
  const second = paths[1] ?? [];
  const keys = new Set(second.slice(1).map((point, index) => edgeKey(second[index]!, point)));
  const first = paths[0] ?? [];
  const seen = new Set<string>();
  return first.slice(1).flatMap((point, index) => {
    const from = first[index]!;
    const key = edgeKey(from, point);
    if (!keys.has(key) || seen.has(key)) return [];
    seen.add(key);
    return [{ key, from, to: point }];
  });
}
