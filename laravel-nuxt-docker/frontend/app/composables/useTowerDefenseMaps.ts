import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

interface TowerDefenseMapResponse {
  data: TowerDefenseMapDefinition[];
}

/** Nạp catalog map từ Laravel; database là nguồn cấu hình duy nhất. */
export async function fetchTowerDefenseMaps() {
  try {
    const response = await $fetch<TowerDefenseMapResponse>(
      "/api/tower-defense/maps",
    );
    if (response.data.length === 0)
      throw new Error("Database chưa có cấu hình map Tower Defense.");
    return response.data;
  } catch (error) {
    console.error("Không thể tải map Tower Defense từ API.", error);
    throw createError({
      statusCode: 503,
      statusMessage: "Không thể tải cấu hình map Tower Defense.",
      cause: error,
    });
  }
}
