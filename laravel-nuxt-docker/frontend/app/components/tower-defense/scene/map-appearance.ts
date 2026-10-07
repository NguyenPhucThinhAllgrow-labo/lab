import * as THREE from "three";
import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

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
