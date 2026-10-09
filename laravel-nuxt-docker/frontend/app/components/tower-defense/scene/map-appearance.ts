import * as THREE from "three";
import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

const fogRanges = new WeakMap<THREE.Fog, { near: number; far: number }>();
const configuredPosition = new THREE.Vector3();
const configuredTarget = new THREE.Vector3();

/** Zooming out must not push the entire board beyond a fixed fog cutoff. */
export function updateMapCameraFog(
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.Vector3,
  map: TowerDefenseMapDefinition,
) {
  const fog = scene.fog;
  if (!(fog instanceof THREE.Fog)) return;
  let base = fogRanges.get(fog);
  if (!base) {
    base = { near: fog.near, far: fog.far };
    fogRanges.set(fog, base);
  }
  const span = Math.max(map.columns * map.cellSize, map.rows * map.cellSize, 8);
  const position = map.camera?.position;
  const lookAt = map.camera?.target;
  const referenceDistance = position?.every(Number.isFinite) && lookAt?.every(Number.isFinite)
    ? configuredPosition.fromArray(position).distanceTo(configuredTarget.fromArray(lookAt))
    : span;
  const distance = camera.position.distanceTo(target);
  const retreat = Math.max(0, distance - referenceDistance);
  fog.near = base.near + retreat;
  fog.far = Math.max(base.far + retreat, distance + span * 0.75, fog.near + 1);
}

/** Keep ordinary-map gameplay and LIVE PREVIEW on the same colour pipeline. */
export function applyMapAppearance(
  scene: THREE.Scene,
  renderer: Pick<THREE.WebGLRenderer, "outputColorSpace" | "toneMapping" | "toneMappingExposure">,
  map: TowerDefenseMapDefinition,
) {
  const dark = map.environmentMode === "dark";
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 0.9 : 1.05;
  const background = new THREE.Color(map.theme.background);
  if (dark) background.lerp(new THREE.Color(0x11101f), 0.34);
  scene.background = background;
}

export function addMapAppearanceLights(scene: THREE.Scene, map: TowerDefenseMapDefinition) {
  const dark = map.environmentMode === "dark";
  const hemisphere = new THREE.HemisphereLight(
    dark ? 0xaab7e8 : 0xdbeafe, dark ? 0x171022 : 0x17120e, dark ? 1.5 : 2.25,
  );
  const key = new THREE.DirectionalLight(dark ? 0xd9ddff : 0xfff1d6, dark ? 2.35 : 3.2);
  key.position.set(8, 18, 10);
  const fill = new THREE.DirectionalLight(dark ? 0x7154b3 : 0x8b5cf6, dark ? 0.82 : 1.4);
  fill.position.set(-12, 8, -10);
  scene.add(hemisphere, key, fill);
}
