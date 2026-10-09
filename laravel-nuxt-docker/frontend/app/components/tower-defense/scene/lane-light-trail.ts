import * as THREE from "three";
import { mapSpacePosition } from "~/games/tower-defense/map-space";
import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

/** Small reusable ribbons follow the actual lane surface; no gameplay entities. */
export function createLaneLightTrails(scene: THREE.Scene, map: TowerDefenseMapDefinition) {
  const group = new THREE.Group(); group.name = "laneLightTrails";
  scene.add(group);
  const samples = 24;
  const lanes = map.paths.filter((path) => path.length > 1).map((path) => {
    const points = path.map((point) => {
      const world = mapSpacePosition(map, point);
      return new THREE.Vector3(world.x, world.baseY + world.surfaceOffset + 0.09, world.z);
    });
    const distances = [0];
    for (let i = 1; i < points.length; i++) distances.push(distances[i - 1]! + points[i]!.distanceTo(points[i - 1]!));
    const length = distances.at(-1)!;
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.Float32BufferAttribute(new Float32Array(samples * 6), 3);
    const colors = new Float32Array(samples * 6);
    const indices: number[] = [];
    const color = new THREE.Color(0xb8fff1);
    for (let i = 0; i < samples; i++) {
      const brightness = (1 - i / (samples - 1)) ** 1.6;
      for (let side = 0; side < 2; side++) color.toArray(colors, i * 6 + side * 3);
      for (let j = 0; j < 6; j++) colors[i * 6 + j] = colors[i * 6 + j]! * brightness;
      if (i < samples - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    geometry.setAttribute("position", position);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, side: THREE.DoubleSide, forceSinglePass: true,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // Moving vertices, tiny fixed-cost batch per lane.
    mesh.renderOrder = 2; group.add(mesh);
    return { points, distances, length, position, mesh };
  });
  const center = new THREE.Vector3(), tangent = new THREE.Vector3();
  function update(elapsed: number) {
    for (const lane of lanes) {
      const speed = map.cellSize * 22;
      const tail = map.cellSize * 3.2;
      const head = (elapsed % ((lane.length + tail) / speed + 1.5)) * speed;
      lane.mesh.visible = lane.length > 0 && head <= lane.length + tail;
      if (!lane.mesh.visible) continue;
      for (let i = 0; i < samples; i++) {
        const distance = THREE.MathUtils.clamp(head - tail * i / (samples - 1), 0, lane.length);
        let segment = 1;
        while (segment < lane.distances.length - 1 && lane.distances[segment]! < distance) segment++;
        const start = lane.points[segment - 1]!, end = lane.points[segment]!;
        const span = lane.distances[segment]! - lane.distances[segment - 1]!;
        center.copy(start).lerp(end, span ? (distance - lane.distances[segment - 1]!) / span : 0);
        tangent.subVectors(end, start).normalize();
        const width = map.cellSize * 0.045 * (1 - i / samples);
        lane.position.setXYZ(i * 2, center.x - tangent.z * width, center.y, center.z + tangent.x * width);
        lane.position.setXYZ(i * 2 + 1, center.x + tangent.z * width, center.y, center.z - tangent.x * width);
      }
      lane.position.needsUpdate = true;
    }
  }
  update(0);
  return {
    group, update,
    dispose() {
      group.removeFromParent();
      for (const lane of lanes) { lane.mesh.geometry.dispose(); lane.mesh.material.dispose(); }
    },
  };
}
