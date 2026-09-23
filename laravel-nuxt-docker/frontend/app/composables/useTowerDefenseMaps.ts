import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

interface TowerDefenseMapResponse {
  data: TowerDefenseMapDefinition[];
}

/**
 * Laravel có thể được gọi qua hostname nội bộ Docker (ví dụ `nginx`). Với mọi
 * asset do ứng dụng phục vụ, chỉ giữ pathname để browser luôn dùng đúng origin
 * mà người chơi đang mở.
 */
function normalizeAssetUrl(url?: string) {
  if (!url) return url;
  try {
    const parsed = new URL(url, "http://tower-defense.local");
    if (parsed.pathname.startsWith("/api/tower-defense/assets/"))
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // URL tùy chỉnh không parse được sẽ được giữ nguyên để admin tự xử lý.
  }
  return url;
}

function normalizeMapAssets(
  map: TowerDefenseMapDefinition,
): TowerDefenseMapDefinition {
  const normalizeModel = <T extends { url: string } | undefined>(model: T): T =>
    model
      ? ({
          ...model,
          url: normalizeAssetUrl(model.url) ?? model.url,
          ...(Object.hasOwn(model, "leftWeaponUrl")
            ? {
                leftWeaponUrl: normalizeAssetUrl(
                  (model as { leftWeaponUrl?: string }).leftWeaponUrl,
                ),
              }
            : {}),
          ...(Object.hasOwn(model, "rightWeaponUrl")
            ? {
                rightWeaponUrl: normalizeAssetUrl(
                  (model as { rightWeaponUrl?: string }).rightWeaponUrl,
                ),
              }
            : {}),
        } as T)
      : model;
  const normalizeIntel = <
    T extends { avatarUrl: string } | undefined,
  >(intel: T): T =>
    intel
      ? ({
          ...intel,
          avatarUrl: normalizeAssetUrl(intel.avatarUrl) ?? intel.avatarUrl,
        } as T)
      : intel;
  const normalizeDefinitions = (
    definitions: TowerDefenseMapDefinition["enemyDefinitions"],
  ) =>
    definitions?.map((definition) => ({
      ...definition,
      model: normalizeModel(definition.model),
      intel: normalizeIntel(definition.intel),
    }));

  return {
    ...map,
    startingCredits:
      Number.isFinite(map.startingCredits) && map.startingCredits >= 0
        ? Math.floor(map.startingCredits)
        : 3000,
    backgroundMusicUrl: normalizeAssetUrl(map.backgroundMusicUrl),
    backgroundModel: normalizeModel(map.backgroundModel),
    castle: {
      ...map.castle,
      modelUrl: normalizeAssetUrl(map.castle.modelUrl) ?? map.castle.modelUrl,
    },
    enemyModel: normalizeModel(map.enemyModel),
    bossModel: normalizeModel(map.bossModel),
    enemyIntel: normalizeIntel(map.enemyIntel),
    bossIntel: normalizeIntel(map.bossIntel),
    enemyDefinition: map.enemyDefinition
      ? {
          ...map.enemyDefinition,
          model: normalizeModel(map.enemyDefinition.model),
          intel: normalizeIntel(map.enemyDefinition.intel),
        }
      : undefined,
    bossDefinition: map.bossDefinition
      ? {
          ...map.bossDefinition,
          model: normalizeModel(map.bossDefinition.model),
          intel: normalizeIntel(map.bossDefinition.intel),
        }
      : undefined,
    enemyDefinitions: normalizeDefinitions(map.enemyDefinitions),
    bossDefinitions: normalizeDefinitions(map.bossDefinitions),
  };
}

/** Nạp catalog map từ Laravel; database là nguồn cấu hình duy nhất. */
export async function fetchTowerDefenseMaps() {
  try {
    const response = await $fetch<TowerDefenseMapResponse>(
      "/api/tower-defense/maps",
    );
    if (response.data.length === 0)
      throw new Error("Database chưa có cấu hình map Tower Defense.");
    return response.data.map(normalizeMapAssets);
  } catch (error) {
    console.error("Không thể tải map Tower Defense từ API.", error);
    throw createError({
      statusCode: 503,
      statusMessage: "Không thể tải cấu hình map Tower Defense.",
      cause: error,
    });
  }
}
