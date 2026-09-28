import * as THREE from "three";
import type { DamageNumber, GridPoint } from "~/types/games/towerDefense";

export interface DamageNumberSceneSyncOptions {
  damageNumbers: DamageNumber[];
  frameDelta: number;
}

export interface TowerDefenseDamageNumberScene {
  sync: (options: DamageNumberSceneSyncOptions) => void;
  dispose: () => void;
}

export interface TowerDefenseDamageNumberSceneOptions {
  enemyModels: Map<number, THREE.Group>;
  worldPosition: (point: GridPoint) => THREE.Vector3;
}

const damageNumberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});
const DAMAGE_TEXTURE_REFRESH_INTERVAL = 1 / 12;

function formatDamage(amount: number) {
  if (amount >= 1000)
    return `-${damageNumberFormatter.format(amount)}`;
  const rounded =
    amount >= 10
      ? Math.round(amount).toString()
      : amount.toFixed(1).replace(/\.0$/, "");
  return `-${rounded}`;
}

function damageTextureKey(damageNumber: DamageNumber) {
  return (
    (damageNumber.critical ? "critical:" : "normal:") +
    damageNumber.color +
    ":" +
    damageNumber.amount
  );
}

function drawDamageTexture(
  texture: THREE.CanvasTexture,
  damageNumber: DamageNumber,
) {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const text = formatDamage(damageNumber.amount);
  const fontSize = damageNumber.critical
    ? text.length >= 7
      ? 22
      : text.length >= 5
        ? 26
        : 30
    : text.length >= 7
      ? 24
      : text.length >= 5
        ? 28
        : 32;
  const textY = damageNumber.critical ? 39 : 31;
  if (damageNumber.critical) {
    context.font = "900 13px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeStyle = "rgba(69, 26, 3, 0.98)";
    context.lineWidth = 5;
    context.strokeText("CRIT!", 64, 11);
    context.fillStyle = "#fde047";
    context.fillText("CRIT!", 64, 11);
  }
  context.font = "900 " + fontSize + "px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = damageNumber.critical
    ? "rgba(113, 63, 18, 0.98)"
    : "rgba(39, 8, 8, 0.95)";
  context.lineWidth = 7;
  context.strokeText(text, 64, textY);
  context.fillStyle = damageNumber.color;
  context.fillText(text, 64, textY);
  texture.needsUpdate = true;
}

function createDamageTexture(damageNumber: DamageNumber) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  drawDamageTexture(texture, damageNumber);
  return texture;
}

export function createTowerDefenseDamageNumberScene(
  scene: THREE.Scene,
  options: TowerDefenseDamageNumberSceneOptions,
): TowerDefenseDamageNumberScene {
  const sprites = new Map<number, THREE.Sprite>();
  const activeIds = new Set<number>();
  const anchorPosition = new THREE.Vector3();

  function disposeSprite(sprite: THREE.Sprite) {
    sprite.material.map?.dispose();
    sprite.material.dispose();
    sprite.removeFromParent();
  }

  function setSpriteAnchor(sprite: THREE.Sprite, damageNumber: DamageNumber) {
    const enemyModel = options.enemyModels.get(damageNumber.enemyId);
    const healthBars = enemyModel?.userData.healthBars as THREE.Group | undefined;
    if (healthBars) {
      healthBars.getWorldPosition(anchorPosition);
      sprite.position.copy(anchorPosition);
      sprite.position.y += 0.28;
    } else {
      sprite.position.copy(options.worldPosition(damageNumber.position));
      sprite.position.y = 2.1;
    }
    const startPosition = sprite.userData.startPosition as
      | THREE.Vector3
      | undefined;
    if (startPosition) startPosition.copy(sprite.position);
    else sprite.userData.startPosition = sprite.position.clone();
  }

  function createSprite(damageNumber: DamageNumber) {
    const material = new THREE.SpriteMaterial({
      map: createDamageTexture(damageNumber),
      depthTest: false,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = "enemyDamageNumber-" + damageNumber.enemyId;
    sprite.renderOrder = 40;

    setSpriteAnchor(sprite, damageNumber);
    sprite.userData.damageNumberId = damageNumber.id;
    sprite.userData.visualProgress = 0;
    sprite.userData.textureKey = damageTextureKey(damageNumber);
    sprite.userData.textureRefreshElapsed = 0;
    sprite.userData.textureCritical = Boolean(damageNumber.critical);
    sprite.userData.horizontalOffset =
      (((damageNumber.id * 37) % 11) - 5) * 0.018;
    const baseScale = damageNumber.critical ? 1.38 : 1.15;
    sprite.scale.set(baseScale, baseScale * 0.5, 1);
    scene.add(sprite);
    return sprite;
  }

  function sync({ damageNumbers, frameDelta }: DamageNumberSceneSyncOptions) {
    activeIds.clear();
    for (const damageNumber of damageNumbers) activeIds.add(damageNumber.enemyId);
    for (const [id, sprite] of sprites) {
      if (activeIds.has(id)) continue;
      disposeSprite(sprite);
      sprites.delete(id);
    }

    for (const damageNumber of damageNumbers) {
      const sprite = sprites.get(damageNumber.enemyId) ?? createSprite(damageNumber);
      sprites.set(damageNumber.enemyId, sprite);
      if (Number(sprite.userData.damageNumberId) !== damageNumber.id) {
        setSpriteAnchor(sprite, damageNumber);
        sprite.userData.damageNumberId = damageNumber.id;
        sprite.userData.visualProgress = 0;
        sprite.userData.horizontalOffset =
          (((damageNumber.id * 37) % 11) - 5) * 0.018;
        sprite.userData.textureKey = "";
        sprite.userData.textureRefreshElapsed = DAMAGE_TEXTURE_REFRESH_INTERVAL;
      }
      const textureKey = damageTextureKey(damageNumber);
      const textureChanged =
        String(sprite.userData.textureKey) !== textureKey;
      const criticalChanged =
        Boolean(sprite.userData.textureCritical) !==
        Boolean(damageNumber.critical);
      const textureRefreshElapsed =
        Number(sprite.userData.textureRefreshElapsed) + frameDelta;
      if (
        textureChanged &&
        (criticalChanged ||
          !sprite.userData.textureKey ||
          textureRefreshElapsed >= DAMAGE_TEXTURE_REFRESH_INTERVAL)
      ) {
        const texture = sprite.material.map as THREE.CanvasTexture | null;
        if (texture) drawDamageTexture(texture, damageNumber);
        sprite.userData.textureKey = textureKey;
        sprite.userData.textureRefreshElapsed = 0;
        sprite.userData.textureCritical = Boolean(damageNumber.critical);
      } else {
        sprite.userData.textureRefreshElapsed = textureRefreshElapsed;
      }
      const progress = THREE.MathUtils.clamp(
        Number(sprite.userData.visualProgress) + frameDelta / 0.82,
        0,
        1,
      );
      sprite.userData.visualProgress = progress;
      const startPosition = sprite.userData.startPosition as THREE.Vector3;
      sprite.position.copy(startPosition);
      sprite.position.x +=
        Number(sprite.userData.horizontalOffset) * progress;
      sprite.position.y += progress * 0.82;
      sprite.material.opacity =
        progress < 0.66 ? 1 : 1 - (progress - 0.66) / 0.34;
      const popScale = progress < 0.15
        ? THREE.MathUtils.lerp(0.65, 1.08, progress / 0.15)
        : THREE.MathUtils.lerp(1.08, 0.9, (progress - 0.15) / 0.85);
      const baseScale = damageNumber.critical ? 1.38 : 1.15;
      sprite.scale.set(baseScale * popScale, baseScale * 0.5 * popScale, 1);
    }
  }

  function dispose() {
    for (const sprite of sprites.values()) disposeSprite(sprite);
    sprites.clear();
  }

  return { sync, dispose };
}
