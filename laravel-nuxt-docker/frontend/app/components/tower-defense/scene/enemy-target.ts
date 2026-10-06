import * as THREE from "three";

/** Resolve the body anchor through the live enemy's placement and DB scale. */
export function enemyLightningTargetWorld(model: THREE.Group, target: THREE.Vector3) {
  const anchor = model.getObjectByName("enemyLightningTarget");
  if (anchor) return anchor.getWorldPosition(target);
  return model.localToWorld(target.set(0, 0.62, 0));
}
