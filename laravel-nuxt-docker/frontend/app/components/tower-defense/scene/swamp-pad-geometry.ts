import * as THREE from "three";

/** Shared low-poly masonry: a worn cap over chipped, recessed stone courses. */
export function createSwampPadGeometry() {
  const segments = 18;
  const heights = [0.5, 0.42, 0.19, 0.17, -0.08, -0.1, -0.35, -0.37, -0.5];
  const radii = [0.98, 1, 0.97, 0.925, 0.98, 0.93, 1.02, 0.96, 1.04];
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let layer = 0; layer < heights.length; layer++) {
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      const weathering = (Math.sin(segment * 2.31 + layer * 1.7) + 1) / 2;
      const radius = radii[layer]! - weathering * (layer === 0 ? 0.012 : 0.035);
      const height = heights[layer]! + (layer === 0 || layer === heights.length - 1 ? 0 : Math.sin(segment * 1.71 + layer) * 0.008);
      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      const mortar = layer === 3 || layer === 5 || layer === 7;
      const shade = mortar ? 0.5 : 0.8 + weathering * 0.17;
      colors.push(shade, shade, shade);
      if (layer < heights.length - 1) {
        const a = layer * segments + segment;
        const b = layer * segments + (segment + 1) % segments;
        indices.push(a, b, a + segments, b, b + segments, a + segments);
      }
    }
  }
  const top = positions.length / 3;
  positions.push(0, 0.5, 0); colors.push(0.95, 0.95, 0.95);
  const bottom = positions.length / 3;
  positions.push(0, -0.5, 0); colors.push(0.65, 0.65, 0.65);
  // Shallow depressions, not raised bumps: preserve the support plane and
  // clearance below the trim. The centre remains level for the tower's feet.
  const surfaceRings: number[] = [];
  for (const radius of [0.45, 0.66, 0.84]) {
    surfaceRings.push(positions.length / 3);
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      const erosion = (Math.sin(segment * 1.91 + radius * 12) * Math.cos(segment * 0.73 - radius * 5) + 1) / 2;
      const depth = radius === 0.45 ? 0 : 0.006 + erosion * 0.018;
      positions.push(Math.cos(angle) * radius, 0.5 - depth, Math.sin(angle) * radius);
      const shade = 0.91 - erosion * (radius === 0.45 ? 0.04 : 0.18);
      colors.push(shade, shade, shade);
    }
  }
  surfaceRings.push(0); // Join the existing top rim without overlapping faces.
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    const lastRing = (heights.length - 1) * segments;
    indices.push(top, surfaceRings[0]! + next, surfaceRings[0]! + segment,
      bottom, lastRing + segment, lastRing + next);
    for (let ring = 0; ring < surfaceRings.length - 1; ring++) {
      const a = surfaceRings[ring]! + segment, b = surfaceRings[ring]! + next;
      const c = surfaceRings[ring + 1]! + segment, d = surfaceRings[ring + 1]! + next;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
