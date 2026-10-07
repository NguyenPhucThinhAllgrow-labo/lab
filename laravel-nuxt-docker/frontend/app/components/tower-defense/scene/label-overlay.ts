import * as THREE from "three";

/** Render HUD sprites at display resolution, independently of the 3D pixel budget. */
export function createLabelOverlay(host: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.className = "tower-defense-label-overlay";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "3",
  });
  const context = canvas.getContext("2d");
  if (!context) return null;
  host.appendChild(canvas);
  const position = new THREE.Vector3();
  const view = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const originalOpacity = new Map<THREE.SpriteMaterial, number>();
  const activeMaterials = new Set<THREE.SpriteMaterial>();

  function draw(camera: THREE.Camera, sprites: readonly THREE.Sprite[]) {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const bufferWidth = Math.round(width * ratio), bufferHeight = Math.round(height * ratio);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth; canvas.height = bufferHeight;
    }
    context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    context!.clearRect(0, 0, width, height);
    context!.imageSmoothingEnabled = true;
    context!.imageSmoothingQuality = "high";
    camera.updateMatrixWorld(true);
    activeMaterials.clear();
    for (const sprite of sprites) {
      const material = sprite.material;
      activeMaterials.add(material);
      if (!originalOpacity.has(material)) originalOpacity.set(material, material.opacity);
      // The overlay owns these HUD sprites only; flames/glow stay in WebGL.
      material.opacity = 0;
      let visible = true;
      for (let parent: THREE.Object3D | null = sprite; parent; parent = parent.parent) {
        if (!parent.visible) { visible = false; break; }
      }
      const image = material.map?.image as CanvasImageSource | undefined;
      if (!visible || !image) continue;
      sprite.updateWorldMatrix(true, false);
      position.setFromMatrixPosition(sprite.matrixWorld);
      view.copy(position).applyMatrix4(camera.matrixWorldInverse);
      const depth = camera instanceof THREE.PerspectiveCamera ? -view.z : 1;
      position.project(camera);
      if (depth <= 0 || position.z < -1 || position.z > 1) continue;
      scale.setFromMatrixScale(sprite.matrixWorld);
      const pixelsPerUnit = height * Math.abs(camera.projectionMatrix.elements[5]!) / (2 * depth);
      const w = Number(sprite.userData.screenWidth) || Math.abs(scale.x) * pixelsPerUnit;
      const h = Number(sprite.userData.screenHeight) || Math.abs(scale.y) * pixelsPerUnit;
      const x = (position.x + 1) * width / 2 - sprite.center.x * w;
      const y = (1 - position.y) * height / 2 - (1 - sprite.center.y) * h;
      if (x + w < 0 || y + h < 0 || x > width || y > height) continue;
      context!.globalAlpha = originalOpacity.get(material) ?? 1;
      context!.drawImage(image, x, y, w, h);
    }
    context!.globalAlpha = 1;
    // Do not retain removed towers/enemies indefinitely.
    for (const material of originalOpacity.keys()) {
      if (!activeMaterials.has(material)) {
        material.opacity = originalOpacity.get(material)!;
        originalOpacity.delete(material);
      }
    }
  }
  return {
    draw,
    dispose() {
      for (const [material, opacity] of originalOpacity) material.opacity = opacity;
      originalOpacity.clear();
      activeMaterials.clear();
      canvas.remove();
    },
  };
}
