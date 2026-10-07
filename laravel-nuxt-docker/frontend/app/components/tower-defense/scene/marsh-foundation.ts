import * as THREE from "three";

/** A tessellated mud surface and eroded, sloping bank, with no edit-time randomness. */
export function createMarshFoundation(shape: THREE.Shape, depth: number, options: { bankLayers?: number; relief?: number; erosion?: number } = {}): THREE.BufferGeometry {
  const outline = shape.getPoints();
  if (outline[0]!.equals(outline.at(-1)!)) outline.pop();
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
  const center = outline.reduce((sum, p) => sum.add(p), new THREE.Vector2()).multiplyScalar(1 / outline.length);
  const perimeter: THREE.Vector2[] = [];
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % outline.length]!;
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 2));
    for (let step = 0; step < steps; step++) perimeter.push(a.clone().lerp(b, step / steps));
  });
  const rings = Math.max(2, Math.ceil(Math.max(...perimeter.map((p) => p.distanceTo(center))) / 2));
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const mud = new THREE.Color(0x686c49), moss = new THREE.Color(0x959773);
  const add = (p: THREE.Vector2, height: number, side = false) => {
    const patch = (Math.sin(p.x * 0.53 + Math.cos(p.y * 0.31)) * Math.cos(p.y * 0.47) + 1) / 2;
    vertices.push(p.x, height, -p.y);
    const color = mud.clone().lerp(moss, patch);
    if (side) color.multiplyScalar(0.64 + patch * 0.16);
    colors.push(color.r, color.g, color.b);
  };
  const surface = (p: THREE.Vector2) => depth + 0.07
    - (Math.sin(p.x * 0.72 + Math.cos(p.y * 0.43)) * Math.cos(p.y * 0.68) + 1) * (options.relief ?? 0.055)
    - (Math.sin(p.x * 2.1 + p.y * 1.7) + 1) * 0.012;
  add(center, surface(center));
  const count = perimeter.length;
  for (let ring = 1; ring <= rings; ring++) {
    for (const edge of perimeter) {
      const p = center.clone().lerp(edge, ring / rings);
      add(p, surface(p));
    }
    const current = 1 + (ring - 1) * count;
    for (let index = 0; index < count; index++) {
      const next = (index + 1) % count;
      if (ring === 1) indices.push(0, current + index, current + next);
      else {
        const previous = current - count;
        indices.push(previous + index, current + index, current + next,
          previous + index, current + next, previous + next);
      }
    }
  }
  let previous = 1 + (rings - 1) * count;
  const capIndices = indices.length;
  const bankLayers = options.bankLayers ?? 2;
  const layers = bankLayers === 2 ? [[depth * 0.53, 0.22], [-0.12, 0.4]]
    : Array.from({ length: bankLayers }, (_, index) => {
      const t = (index + 1) / bankLayers;
      return [depth * (1 - t) - t * 0.12, Math.sin(t * Math.PI) * 0.5 + t * 0.4];
    });
  for (const [height, spread] of layers) {
    const current = vertices.length / 3;
    for (const edge of perimeter) {
      const erosion = Math.sin(edge.x * 1.3 + edge.y * 0.7 + (options.bankLayers ? height! * 1.4 : 0));
      const p = edge.clone().add(edge.clone().sub(center).normalize().multiplyScalar(spread! + erosion * (options.erosion ?? 0.08)));
      add(p, height! + erosion * 0.055, true);
    }
    for (let index = 0; index < count; index++) {
      const next = (index + 1) % count;
      indices.push(previous + index, current + index, current + next,
        previous + index, current + next, previous + next);
    }
    previous = current;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.addGroup(0, capIndices, 0);
  geometry.addGroup(capIndices, indices.length - capIndices, 1);
  return geometry;
}
