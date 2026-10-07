import * as THREE from "three";
import { createMarshFoundation } from "./marsh-foundation";

/** Shared terrain topology, with thicker eroded basalt banks instead of flat extrusion walls. */
export function createVolcanicFoundation(shape: THREE.Shape, depth: number, topBevel: number, seed: number) {
  const geometry = createMarshFoundation(shape, depth, { bankLayers: 8, relief: 0.2, erosion: 0.65 });
  const positions = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = -positions.getZ(index), height = positions.getY(index);
    // Match the existing extrusion coordinates (+depth points down after its X rotation).
    const bankDepth = THREE.MathUtils.clamp((depth + 0.07 - height) / (depth + 0.19), 0, 1);
    positions.setXYZ(index, x, y, depth - height - topBevel + 0.07 + bankDepth * (2 * topBevel - 0.19));
    const patch = (Math.sin(x * 0.43 + seed) * Math.cos(y * 0.37 + height * 0.9) + 1) / 2;
    // Subtle neutral variation; lava warmth comes from lighting and the basalt shader.
    const shade = 0.88 + patch * 0.12;
    colors.setXYZ(index, shade, shade, shade);
  }
  positions.needsUpdate = true; colors.needsUpdate = true;
  // The coordinate conversion reflects one axis, so preserve outward face winding.
  const indices = geometry.getIndex()!;
  for (let index = 0; index < indices.count; index += 3) {
    const second = indices.getX(index + 1);
    indices.setX(index + 1, indices.getX(index + 2));
    indices.setX(index + 2, second);
  }
  indices.needsUpdate = true;
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
