import * as THREE from "three";

const anchor = new THREE.Vector3();
const parentScale = new THREE.Vector3();

/** CSS-pixel sizing, independent of map units, model scale and camera zoom. */
export function labelWorldUnitsPerPixel(
  object: THREE.Object3D,
  camera: THREE.Camera,
  viewportHeight: number,
) {
  object.getWorldPosition(anchor);
  anchor.applyMatrix4(camera.matrixWorldInverse);
  const depth = camera instanceof THREE.PerspectiveCamera
    ? Math.max(camera.near, -anchor.z)
    : 1;
  return 2 * depth / Math.max(0.001, Math.abs(camera.projectionMatrix.elements[5]!))
    / Math.max(1, viewportHeight);
}

export function scaleScreenLabel(
  object: THREE.Object3D,
  camera: THREE.Camera,
  viewportHeight: number,
  width: number,
  height: number,
) {
  if (object instanceof THREE.Sprite) {
    object.userData.screenWidth = width;
    object.userData.screenHeight = height;
  }
  const unit = labelWorldUnitsPerPixel(object, camera, viewportHeight);
  if (object.parent) object.parent.getWorldScale(parentScale);
  else parentScale.setScalar(1);
  object.scale.set(
    width * unit / Math.max(0.001, Math.abs(parentScale.x)),
    height * unit / Math.max(0.001, Math.abs(parentScale.y)),
    1,
  );
}
