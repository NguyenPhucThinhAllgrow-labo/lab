interface CameraSettings {
  position: number[];
  target: number[];
  zoom: number;
}

// Upgrade the previous shipped angle in saved maps, without overwriting
// an administrator's custom camera or requiring a DB rewrite.
export function resolveCitadelCamera<T extends CameraSettings>(camera: T | undefined, fallback: T): T {
  if (!camera) return fallback;
  const previousPosition = [41.02, 73.55, 30.58];
  const previousTarget = [17, 5.3, 0];
  const matches = (actual: number[], expected: number[]) => actual.length === expected.length
    && actual.every((value, index) => Math.abs(value - expected[index]!) < 0.001);
  if (matches(camera.position, previousPosition) && matches(camera.target, previousTarget)) {
    return { ...camera, position: [...fallback.position], target: [...fallback.target] };
  }
  return camera;
}
