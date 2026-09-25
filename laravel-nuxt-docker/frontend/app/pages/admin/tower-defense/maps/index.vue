<script setup lang="ts">
import {
  Box,
  Check,
  Copy,
  Crown,
  Database,
  ExternalLink,
  FileAudio,
  FileBox,
  FileImage,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Skull,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-vue-next";
import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";

type AssetType = "model" | "sound" | "image";
type AssetPurpose =
  | "enemy-model"
  | "boss-model"
  | "castle-model"
  | "map-model"
  | "tower-model"
  | "equipment-model"
  | "animation"
  | "texture"
  | "enemy-avatar"
  | "boss-avatar"
  | "tower-image"
  | "map-image"
  | "ui-image"
  | "background-music"
  | "tower-sfx"
  | "other";

const ASSET_PURPOSE_OPTIONS: Record<
  AssetType,
  { value: AssetPurpose; label: string }[]
> = {
  model: [
    { value: "enemy-model", label: "Model lính" },
    { value: "boss-model", label: "Model boss" },
    { value: "castle-model", label: "Model lâu đài" },
    { value: "map-model", label: "Model nền map" },
    { value: "tower-model", label: "Model trụ" },
    { value: "equipment-model", label: "Model trang bị" },
    { value: "animation", label: "Animation" },
    { value: "texture", label: "Texture của model" },
    { value: "other", label: "Model khác" },
  ],
  sound: [
    { value: "background-music", label: "Nhạc nền" },
    { value: "tower-sfx", label: "Âm thanh trụ" },
    { value: "other", label: "Âm thanh khác" },
  ],
  image: [
    { value: "enemy-avatar", label: "Ảnh lính" },
    { value: "boss-avatar", label: "Ảnh boss" },
    { value: "tower-image", label: "Ảnh tower" },
    { value: "map-image", label: "Ảnh map" },
    { value: "ui-image", label: "Ảnh giao diện" },
    { value: "other", label: "Ảnh khác" },
  ],
};

interface AdminTowerDefenseMap {
  id: string;
  name: string;
  configuration: MapEditorConfiguration;
  sort_order: number;
  is_active: boolean;
  updated_at: string | null;
}

interface AdminTowerDefenseAsset {
  id: number;
  key: string;
  type: AssetType;
  purpose: AssetPurpose;
  url: string;
  mimeType: string | null;
  size: number;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  updatedAt: string | null;
}

interface MapListResponse {
  data: AdminTowerDefenseMap[];
  current_page: number;
  last_page: number;
  total: number;
}

interface AssetListResponse {
  data: AdminTowerDefenseAsset[];
  current_page: number;
  last_page: number;
  total: number;
}

interface ManagedEnemy {
  id: string;
  name: string;
  kind: "normal" | "boss";
  model_asset_key: string;
  avatar_asset_key: string | null;
  left_weapon_asset_key: string | null;
  right_weapon_asset_key: string | null;
  base_health: number;
  base_speed: number;
  reward: number;
  castle_damage: number;
  summary: string | null;
  resistance: string | null;
  weakness: string | null;
  model_configuration: Omit<CharacterModelConfiguration, "url">;
  combat_profile: {
    damageMultipliers: Record<string, number>;
    effectDurationMultipliers: Record<string, number>;
  };
  is_active: boolean;
}

useHead({ title: "Quản lý Map | Tower Defense Admin" });

const api = useApi();
const maps = ref<AdminTowerDefenseMap[]>([]);
const assets = ref<AdminTowerDefenseAsset[]>([]);
const enemyCatalog = ref<ManagedEnemy[]>([]);
const loadingMaps = ref(true);
const loadingAssets = ref(true);
const mapPage = ref(1);
const mapLastPage = ref(1);
const mapTotal = ref(0);
const assetPage = ref(1);
const assetLastPage = ref(1);
const assetTotal = ref(0);
const pageError = ref("");
const assetSearch = ref("");
const assetType = ref<"" | AssetType>("");
const assetPurpose = ref<"" | AssetPurpose>("");
const copiedKey = ref("");

const mapDialog = ref<HTMLDialogElement | null>(null);
const mapMode = ref<"create" | "edit" | "delete">("create");
const selectedMap = ref<AdminTowerDefenseMap | null>(null);
const savingMap = ref(false);
const mapFormError = ref("");
const mapFieldErrors = ref<Record<string, string[]>>({});
const mapForm = reactive({
  id: "",
  name: "",
  sortOrder: 0,
  isActive: true,
  configuration: "",
});
interface MapEditorPoint {
  x: number;
  y: number;
}
interface MapEditorConfiguration extends Record<string, unknown> {
  columns: number;
  rows: number;
  maxTowerCount: number;
  startingCredits: number;
  spawnPoints?: [MapEditorPoint, MapEditorPoint];
  paths: [MapEditorPoint[], MapEditorPoint[]];
  pathTiles: MapEditorPoint[];
  backgroundMusicUrl?: string;
  backgroundModel?: { url: string; offsetY?: number };
  enemyModel?: CharacterModelConfiguration;
  bossModel?: CharacterModelConfiguration;
  bossCombatProfileKey?: "normal" | "lava-boss";
  enemyIntel?: EnemyIntelConfiguration;
  bossIntel?: EnemyIntelConfiguration;
  enemyDefinition?: ManagedEnemyDefinition;
  bossDefinition?: ManagedEnemyDefinition;
  enemyDefinitionIds?: string[];
  bossDefinitionIds?: string[];
  enemyDefinitions?: ManagedEnemyDefinition[];
  bossDefinitions?: ManagedEnemyDefinition[];
  castle: {
    modelUrl: string;
    position?: MapEditorPoint;
    offsetX: number;
    offsetY: number;
    rotationY: number;
    maxSize: number;
    pathEndOffset: number;
  };
  theme?: {
    terrain?: number;
    gridLine?: number;
    routeColors?: [number, number];
  };
}
interface ManagedEnemyDefinition {
  id: string;
  baseHealth: number;
  baseSpeed: number;
  reward: number;
  castleDamage: number;
  combatProfile: {
    damageMultipliers: Record<string, number>;
    effectDurationMultipliers: Record<string, number>;
  };
}
interface CharacterModelConfiguration {
  url: string;
  leftWeaponUrl?: string;
  rightWeaponUrl?: string;
  characterScale: number;
  sceneScale: number;
  healthBarY: number;
  animationNames: string[];
  removeRootMotion?: boolean;
}
interface EnemyIntelConfiguration {
  name: string;
  avatarUrl: string;
  summary: string;
  resistance: string;
  weakness: string;
}
const mapEditorLane = ref<0 | 1>(0);
const mapEditorPlacementMode = ref<"path" | "portal-0" | "portal-1" | "castle">("path");
const mapEditorAnchors = ref<[MapEditorPoint[], MapEditorPoint[]]>([[], []]);
const mapEditorMessage = ref("");

const visualMapConfiguration = computed<MapEditorConfiguration | null>(() => {
  try {
    const value = JSON.parse(mapForm.configuration) as MapEditorConfiguration;
    if (
      !Number.isInteger(value.columns) ||
      !Number.isInteger(value.rows) ||
      value.columns < 1 ||
      value.rows < 1 ||
      !Array.isArray(value.paths) ||
      value.paths.length !== 2
    )
      return null;
    return value;
  } catch {
    return null;
  }
});
const mapEditorColumns = computed(() =>
  Math.min(40, visualMapConfiguration.value?.columns ?? 0),
);
const mapEditorRows = computed(() =>
  Math.min(40, visualMapConfiguration.value?.rows ?? 0),
);
const minimumMapColumns = computed(() =>
  Math.max(
    4,
    ...(visualMapConfiguration.value?.paths.flat().map((point) => point.x + 1) ?? []),
    ...(visualMapConfiguration.value?.spawnPoints?.map((point) => point.x + 1) ?? []),
    (visualMapConfiguration.value?.castle.position?.x ?? -1) + 1,
  ),
);
const minimumMapRows = computed(() =>
  Math.max(
    4,
    ...(visualMapConfiguration.value?.paths.flat().map((point) => point.y + 1) ?? []),
    ...(visualMapConfiguration.value?.spawnPoints?.map((point) => point.y + 1) ?? []),
    (visualMapConfiguration.value?.castle.position?.y ?? -1) + 1,
  ),
);
const mapEditorCells = computed(() =>
  Array.from(
    { length: mapEditorColumns.value * mapEditorRows.value },
    (_, index) => ({
      x: index % mapEditorColumns.value,
      y: Math.floor(index / mapEditorColumns.value),
    }),
  ),
);
const mapEditorPathKeys = computed<[Set<string>, Set<string>]>(() => {
  const paths = visualMapConfiguration.value?.paths ?? [[], []];
  return [
    new Set(paths[0].map((point) => `${point.x}:${point.y}`)),
    new Set(paths[1].map((point) => `${point.x}:${point.y}`)),
  ];
});

function configuredSpawnPoint(lane: 0 | 1) {
  const configuration = visualMapConfiguration.value;
  return configuration?.spawnPoints?.[lane] ?? configuration?.paths[lane]?.[0] ?? null;
}

function configuredCastlePoint() {
  const configuration = visualMapConfiguration.value;
  return configuration?.castle?.position ?? configuration?.paths[0]?.at(-1) ?? null;
}

function isConfiguredPoint(point: MapEditorPoint, target: MapEditorPoint | null) {
  return target?.x === point.x && target.y === point.y;
}

function editorCellContent(point: MapEditorPoint) {
  if (isConfiguredPoint(point, configuredCastlePoint())) return "♜";
  if (isConfiguredPoint(point, configuredSpawnPoint(0))) return "G1";
  if (isConfiguredPoint(point, configuredSpawnPoint(1))) return "G2";
  return isEditorAnchor(point, 0) || isEditorAnchor(point, 1) ? "◆" : "";
}

const assetDialog = ref<HTMLDialogElement | null>(null);
const assetFileInput = ref<HTMLInputElement | null>(null);
const uploadingAsset = ref(false);
const assetFormError = ref("");
const assetFieldErrors = ref<Record<string, string[]>>({});
const assetForm = reactive({
  key: "",
  type: "model" as AssetType,
  purpose: "enemy-model" as AssetPurpose,
  file: null as File | null,
});

const activeMapCount = computed(
  () => maps.value.filter((item) => item.is_active).length,
);
const totalAssetSize = computed(() =>
  assets.value.reduce((total, item) => total + item.size, 0),
);
const filteredAssets = computed(() => {
  const query = assetSearch.value.trim().toLocaleLowerCase("vi");
  return assets.value.filter(
    (item) =>
      (!assetType.value || item.type === assetType.value) &&
      (!assetPurpose.value || item.purpose === assetPurpose.value) &&
      (!query || item.key.toLocaleLowerCase("vi").includes(query)),
  );
});
const selectableModelAssets = computed(() =>
  assets.value.filter(
    (item) => item.type === "model" && /\.(glb|gltf)$/i.test(item.key),
  ),
);
const availablePurposeOptions = computed(() =>
  assetType.value
    ? ASSET_PURPOSE_OPTIONS[assetType.value]
    : Array.from(
        new Map(
          Object.values(ASSET_PURPOSE_OPTIONS)
            .flat()
            .map((option) => [option.value, option]),
        ).values(),
      ),
);
const uploadPurposeOptions = computed(
  () => ASSET_PURPOSE_OPTIONS[assetForm.type],
);
const assetsForPurpose = (purpose: AssetPurpose) =>
  assets.value.filter((item) => item.purpose === purpose);
const selectableCastleAssets = computed(() =>
  selectableModelAssets.value.filter((item) => item.purpose === "castle-model"),
);
const selectableMapModelAssets = computed(() =>
  selectableModelAssets.value.filter((item) => item.purpose === "map-model"),
);
const selectableMusicAssets = computed(() => assetsForPurpose("background-music"));
const selectableNormalEnemies = computed(() =>
  enemyCatalog.value.filter((enemy) => enemy.kind === "normal" && enemy.is_active),
);
const selectableBosses = computed(() =>
  enemyCatalog.value.filter((enemy) => enemy.kind === "boss" && enemy.is_active),
);

watch(
  () => assetForm.type,
  (type) => {
    const firstPurpose = ASSET_PURPOSE_OPTIONS[type][0];
    if (firstPurpose) assetForm.purpose = firstPurpose.value;
  },
);
watch(assetType, () => {
  if (
    assetPurpose.value &&
    !availablePurposeOptions.value.some(
      (option) => option.value === assetPurpose.value,
    )
  )
    assetPurpose.value = "";
});

const defaultMapConfiguration = () => {
  const paths = [3, 10].map((startY) => {
    const horizontal = Array.from({ length: 15 }, (_, x) => ({ x, y: startY }));
    const verticalStep = Math.sign(6 - startY);
    const vertical = Array.from(
      { length: Math.abs(6 - startY) },
      (_, index) => ({ x: 14, y: startY + verticalStep * (index + 1) }),
    );
    const castleApproach = [15, 16, 17].map((x) => ({ x, y: 6 }));
    return [...horizontal, ...vertical, ...castleApproach];
  });
  return {
    columns: 18,
    rows: 14,
    maxTowerCount: 12,
    startingCredits: 3000,
    cellSize: 1.5,
    spawnPoints: [{ x: 0, y: 3 }, { x: 0, y: 10 }] as [MapEditorPoint, MapEditorPoint],
    paths,
    pathTiles: paths.flat(),
    cornerRadius: 0.34,
    enemyDefinitionIds: ["dark-soldier"],
    bossDefinitionIds: ["dark-commander"],
    backgroundMusicUrl:
      "/api/tower-defense/assets/sounds/background/default.mp3",
    enemyModel: {
      url: "/api/tower-defense/assets/models/games/tower-defense/character/normal.glb",
      characterScale: 2,
      sceneScale: 0.494,
      healthBarY: 2.1,
      animationNames: ["walk"],
      removeRootMotion: true,
    },
    enemyIntel: {
      name: "Hắc binh",
      avatarUrl:
        "/api/tower-defense/assets/images/games/tower-defense/military/dark/normal.png",
      summary: "Lính tiền tuyến cân bằng.",
      resistance: "Không",
      weakness: "Không",
    },
    bossCombatProfileKey: "normal",
    bossIntel: {
      name: "Thủ lĩnh Hắc quân",
      avatarUrl:
        "/api/tower-defense/assets/images/games/tower-defense/military/dark/lava/boss.png",
      summary: "Kẻ địch tinh nhuệ có lượng máu cao.",
      resistance: "Không",
      weakness: "Không",
    },
    castle: {
      modelUrl:
        "/api/tower-defense/assets/models/games/tower-defense/castle.glb",
      position: { x: 17, y: 6 },
      offsetX: 1.5,
      offsetY: -0.22,
      rotationY: 0,
      maxSize: 8.5,
      pathEndOffset: 0.48,
    },
    camera: {
      position: [7.41, 16.25, 7.28],
      target: [1.69, 0, 0],
      zoom: 0.71,
    },
    theme: {
      background: 526351,
      fogNear: 18,
      fogFar: 40,
      terrain: 1776414,
      gridCenter: 3092790,
      gridLine: 2304302,
      path: 3882044,
      pathStone: 6711408,
      routeColors: [14796906, 16751454],
      tileColors: [2504752, 2965305, 2040098],
    },
    scenery: { trees: [], crystals: [], runes: [] },
  };
};

const previewMap = computed<TowerDefenseMapDefinition | null>(() => {
  const configuration = visualMapConfiguration.value;
  if (!configuration) return null;
  const defaults = defaultMapConfiguration();
  const castle = {
    ...defaults.castle,
    ...configuration.castle,
  } as TowerDefenseMapDefinition["castle"];
  // Các map cũ từ seeder không khai báo vị trí riêng. Gameplay sẽ suy ra cổng
  // từ đầu lane và lâu đài từ cuối map, nên preview cũng phải giữ hai trường
  // này là undefined thay vì chèn tọa độ của map mặc định.
  if (!Object.hasOwn(configuration.castle ?? {}, "position")) {
    delete castle.position;
  }
  return {
    ...defaults,
    ...configuration,
    id: mapForm.id.trim() || "map-preview",
    name: mapForm.name.trim() || "Map preview",
    spawnPoints: Object.hasOwn(configuration, "spawnPoints")
      ? configuration.spawnPoints
      : undefined,
    castle,
    camera: {
      ...defaults.camera,
      ...(configuration.camera as TowerDefenseMapDefinition["camera"] | undefined),
    },
    theme: {
      ...defaults.theme,
      ...configuration.theme,
    },
    scenery: {
      ...defaults.scenery,
      ...(configuration.scenery as TowerDefenseMapDefinition["scenery"] | undefined),
    },
  } as TowerDefenseMapDefinition;
});
const renderedPreviewMap = shallowRef<TowerDefenseMapDefinition | null>(null);
const mapPreviewDirty = ref(false);

function refreshMapPreview() {
  if (!previewMap.value) return;
  // Preview dùng snapshot riêng để thao tác vẽ lane không kích hoạt việc dựng
  // lại hàng trăm mesh và tải model sau mỗi lần click.
  renderedPreviewMap.value = JSON.parse(
    JSON.stringify(previewMap.value),
  ) as TowerDefenseMapDefinition;
  mapPreviewDirty.value = false;
}

watch(previewMap, () => {
  if (renderedPreviewMap.value) mapPreviewDirty.value = true;
});

function compressPath(path: MapEditorPoint[]) {
  if (path.length <= 2) return path.map((point) => ({ ...point }));
  const anchors: MapEditorPoint[] = [{ ...path[0]! }];
  for (let index = 1; index < path.length - 1; index++) {
    const previous = path[index - 1]!;
    const current = path[index]!;
    const next = path[index + 1]!;
    const previousDirection = {
      x: Math.sign(current.x - previous.x),
      y: Math.sign(current.y - previous.y),
    };
    const nextDirection = {
      x: Math.sign(next.x - current.x),
      y: Math.sign(next.y - current.y),
    };
    if (
      previousDirection.x !== nextDirection.x ||
      previousDirection.y !== nextDirection.y
    )
      anchors.push({ ...current });
  }
  anchors.push({ ...path[path.length - 1]! });
  return anchors;
}

function expandEditorPath(anchors: MapEditorPoint[]) {
  if (anchors.length === 0) return [];
  const path: MapEditorPoint[] = [{ ...anchors[0]! }];
  for (let index = 1; index < anchors.length; index++) {
    const from = anchors[index - 1]!;
    const to = anchors[index]!;
    const stepX = Math.sign(to.x - from.x);
    const stepY = Math.sign(to.y - from.y);
    const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    for (let step = 1; step <= distance; step++) {
      path.push({ x: from.x + stepX * step, y: from.y + stepY * step });
    }
  }
  return path;
}

function syncEditorPaths() {
  const configuration = visualMapConfiguration.value;
  if (!configuration) return;
  const paths = mapEditorAnchors.value.map(expandEditorPath) as [
    MapEditorPoint[],
    MapEditorPoint[],
  ];
  const pathTiles = Array.from(
    new Map(
      paths.flat().map((point) => [`${point.x}:${point.y}`, point]),
    ).values(),
  );
  mapForm.configuration = JSON.stringify(
    { ...configuration, paths, pathTiles },
    null,
    2,
  );
}

function selectMapEditorCell(point: MapEditorPoint) {
  if (mapEditorPlacementMode.value !== "path") {
    updateMapConfiguration((configuration) => {
      if (mapEditorPlacementMode.value === "castle") {
        configuration.castle.position = { ...point };
        return;
      }
      const lane = mapEditorPlacementMode.value === "portal-0" ? 0 : 1;
      const fallback: [MapEditorPoint, MapEditorPoint] = [
        { ...(configuration.paths[0]?.[0] ?? point) },
        { ...(configuration.paths[1]?.[0] ?? point) },
      ];
      const spawnPoints = configuration.spawnPoints ?? fallback;
      spawnPoints[lane] = { ...point };
      configuration.spawnPoints = spawnPoints;
    });
    mapEditorMessage.value = mapEditorPlacementMode.value === "castle"
      ? `Đã đặt điểm cuối path/cổng lâu đài tại ${point.x}, ${point.y}; mặt trước model sẽ nằm sát đường đi.`
      : `Đã đặt cổng ${mapEditorPlacementMode.value === "portal-0" ? 1 : 2} tại ô ${point.x}, ${point.y}.`;
    return;
  }

  const anchors = mapEditorAnchors.value[mapEditorLane.value];
  const previous = anchors[anchors.length - 1];
  if (previous && previous.x !== point.x && previous.y !== point.y) {
    mapEditorMessage.value =
      "Điểm mới phải nằm cùng hàng hoặc cùng cột với điểm trước.";
    return;
  }
  if (previous?.x === point.x && previous.y === point.y) return;
  anchors.push({ ...point });
  mapEditorMessage.value = "Đường đi và JSON đã được cập nhật.";
  syncEditorPaths();
}

function undoMapEditorLane() {
  mapEditorAnchors.value[mapEditorLane.value].pop();
  mapEditorMessage.value = "Đã hoàn tác điểm gần nhất.";
  syncEditorPaths();
}

function clearMapEditorLane() {
  mapEditorAnchors.value[mapEditorLane.value] = [];
  mapEditorMessage.value = `Đã xóa lane ${mapEditorLane.value + 1}.`;
  syncEditorPaths();
}

function resetMapEditorLayout() {
  const defaults = defaultMapConfiguration();
  updateMapConfiguration((configuration) => {
    configuration.columns = defaults.columns;
    configuration.rows = defaults.rows;
    configuration.cellSize = defaults.cellSize;
    configuration.cornerRadius = defaults.cornerRadius;
    configuration.spawnPoints = structuredClone(defaults.spawnPoints);
    configuration.paths = structuredClone(defaults.paths) as [
      MapEditorPoint[],
      MapEditorPoint[],
    ];
    configuration.pathTiles = structuredClone(defaults.pathTiles);
    configuration.castle.position = { ...defaults.castle.position };
  });
  mapEditorLane.value = 0;
  mapEditorPlacementMode.value = "path";
  mapEditorMessage.value =
    "Đã đưa kích thước, hai lane, cổng spawn và cổng lâu đài về bố cục mặc định.";
}

function isEditorAnchor(point: MapEditorPoint, lane: 0 | 1) {
  return mapEditorAnchors.value[lane].some(
    (anchor) => anchor.x === point.x && anchor.y === point.y,
  );
}

function colorNumber(value: unknown, fallback: string) {
  return typeof value === "number"
    ? `#${value.toString(16).padStart(6, "0").slice(-6)}`
    : fallback;
}

function updateMapConfiguration(
  mutate: (configuration: MapEditorConfiguration) => void,
) {
  const configuration = visualMapConfiguration.value;
  if (!configuration) return;
  const next = structuredClone(configuration);
  mutate(next);
  mapForm.configuration = JSON.stringify(next, null, 2);
}

function updateMapNumber(
  field: "columns" | "rows" | "maxTowerCount" | "startingCredits",
  event: Event,
) {
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isInteger(value)) return;
  updateMapConfiguration((configuration) => {
    configuration[field] = value;
  });
}

function configuredAssetKey(url?: string) {
  const prefix = "/api/tower-defense/assets/";
  return url?.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : "";
}

function selectedAssetKey(event: Event) {
  return (event.target as HTMLSelectElement).value;
}

function selectSimpleAsset(
  field: "backgroundMusicUrl" | "backgroundModel",
  event: Event,
) {
  const key = selectedAssetKey(event);
  updateMapConfiguration((configuration) => {
    if (field === "backgroundMusicUrl") {
      configuration.backgroundMusicUrl = key ? assetPath(key) : "";
      return;
    }
    if (key)
      configuration.backgroundModel = {
        url: assetPath(key),
        offsetY: configuration.backgroundModel?.offsetY ?? -0.055,
      };
    else delete configuration.backgroundModel;
  });
}

function selectCastleModel(event: Event) {
  const key = selectedAssetKey(event);
  if (!key) return;
  updateMapConfiguration((configuration) => {
    configuration.castle.modelUrl = assetPath(key);
  });
}

function managedEnemyDefinition(enemy: ManagedEnemy): ManagedEnemyDefinition {
  return {
      id: enemy.id,
      baseHealth: enemy.base_health,
      baseSpeed: enemy.base_speed,
      reward: enemy.reward,
      castleDamage: enemy.castle_damage,
      combatProfile: enemy.combat_profile,
  };
}

function applyPrimaryManagedEnemy(
  configuration: MapEditorConfiguration,
  kind: "normal" | "boss",
  enemy: ManagedEnemy,
) {
    const definition = managedEnemyDefinition(enemy);
    const model: CharacterModelConfiguration = {
      ...enemy.model_configuration,
      url: assetPath(enemy.model_asset_key),
      leftWeaponUrl: enemy.left_weapon_asset_key
        ? assetPath(enemy.left_weapon_asset_key)
        : undefined,
      rightWeaponUrl: enemy.right_weapon_asset_key
        ? assetPath(enemy.right_weapon_asset_key)
        : undefined,
    };
    const intel: EnemyIntelConfiguration = {
      name: enemy.name,
      avatarUrl: enemy.avatar_asset_key ? assetPath(enemy.avatar_asset_key) : "",
      summary: enemy.summary ?? "",
      resistance: enemy.resistance ?? "Không",
      weakness: enemy.weakness ?? "Không",
    };
    if (kind === "boss") {
      configuration.bossDefinition = definition;
      configuration.bossModel = model;
      configuration.bossIntel = intel;
      configuration.bossCombatProfileKey =
        enemy.id === "lava-overlord" ? "lava-boss" : "normal";
    } else {
      configuration.enemyDefinition = definition;
      configuration.enemyModel = model;
      configuration.enemyIntel = intel;
    }
}

function managedEnemyIds(kind: "normal" | "boss") {
  const configuration = visualMapConfiguration.value;
  if (!configuration) return [];
  const ids =
    kind === "boss"
      ? configuration.bossDefinitionIds
      : configuration.enemyDefinitionIds;
  if (ids?.length) return ids;
  const legacyId =
    kind === "boss"
      ? configuration.bossDefinition?.id
      : configuration.enemyDefinition?.id;
  return legacyId ? [legacyId] : [];
}

function isManagedEnemySelected(kind: "normal" | "boss", id: string) {
  return managedEnemyIds(kind).includes(id);
}

function toggleManagedEnemy(
  kind: "normal" | "boss",
  enemy: ManagedEnemy,
  event: Event,
) {
  const checked = (event.target as HTMLInputElement).checked;
  const currentIds = managedEnemyIds(kind);
  if (!checked && currentIds.length <= 1) {
    (event.target as HTMLInputElement).checked = true;
    mapEditorMessage.value = `Map phải có ít nhất một ${kind === "boss" ? "boss" : "lính thường"}.`;
    return;
  }
  const ids = checked
    ? [...new Set([...currentIds, enemy.id])]
    : currentIds.filter((id) => id !== enemy.id);
  updateMapConfiguration((configuration) => {
    const selected = ids
      .map((id) => enemyCatalog.value.find((item) => item.id === id))
      .filter((item): item is ManagedEnemy => Boolean(item));
    const definitions = selected.map(managedEnemyDefinition);
    if (kind === "boss") {
      configuration.bossDefinitionIds = ids;
      configuration.bossDefinitions = definitions;
    } else {
      configuration.enemyDefinitionIds = ids;
      configuration.enemyDefinitions = definitions;
    }
    if (selected[0]) applyPrimaryManagedEnemy(configuration, kind, selected[0]);
  });
}

watch(
  () => mapForm.configuration,
  (configuration) => {
    try {
      const parsed = JSON.parse(configuration) as MapEditorConfiguration;
      if (!Array.isArray(parsed.paths) || parsed.paths.length !== 2) return;
      mapEditorAnchors.value = [
        compressPath(parsed.paths[0] ?? []),
        compressPath(parsed.paths[1] ?? []),
      ];
    } catch {
      // JSON đang được gõ dở; preview giữ trạng thái hợp lệ gần nhất.
    }
  },
);

async function loadMaps(page = mapPage.value) {
  loadingMaps.value = true;
  pageError.value = "";
  try {
    const response = await api<MapListResponse>(
      `/api/admin/tower-defense/maps?per_page=10&page=${page}`,
    );
    maps.value = response.data;
    mapPage.value = response.current_page;
    mapLastPage.value = response.last_page;
    mapTotal.value = response.total;
  } catch (error: any) {
    pageError.value =
      error?.data?.message || "Không thể tải danh sách map Tower Defense.";
  } finally {
    loadingMaps.value = false;
  }
}

async function loadAssets(page = assetPage.value) {
  loadingAssets.value = true;
  pageError.value = "";
  try {
    const response = await api<AssetListResponse>(
      `/api/admin/tower-defense/assets?per_page=500&page=${page}`,
    );
    assets.value = response.data;
    assetPage.value = response.current_page;
    assetLastPage.value = response.last_page;
    assetTotal.value = response.total;
  } catch (error: any) {
    pageError.value =
      error?.data?.message || "Không thể tải danh sách tài nguyên.";
  } finally {
    loadingAssets.value = false;
  }
}

async function loadEnemies() {
  try {
    const response = await api<{ data: ManagedEnemy[] }>(
      "/api/admin/tower-defense/enemies?per_page=500",
    );
    enemyCatalog.value = response.data;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể tải danh mục quái.";
  }
}

function refreshAll() {
  void Promise.all([loadMaps(), loadAssets(), loadEnemies()]);
}

function openMapDialog(
  mode: "create" | "edit" | "delete",
  item: AdminTowerDefenseMap | null = null,
) {
  mapMode.value = mode;
  selectedMap.value = item;
  mapFormError.value = "";
  mapFieldErrors.value = {};
  Object.assign(mapForm, {
    id: item?.id ?? "",
    name: item?.name ?? "",
    sortOrder: item?.sort_order ?? maps.value.length,
    isActive: item?.is_active ?? true,
    configuration: JSON.stringify(
      item
        ? {
            ...item.configuration,
            startingCredits: item.configuration.startingCredits ?? 3000,
          }
        : defaultMapConfiguration(),
      null,
      2,
    ),
  });
  mapDialog.value?.showModal();
  if (mode !== "delete") void nextTick(refreshMapPreview);
}

function closeMapDialog() {
  if (!savingMap.value) {
    mapDialog.value?.close();
    renderedPreviewMap.value = null;
    mapPreviewDirty.value = false;
  }
}

async function submitMap() {
  if (savingMap.value) return;
  savingMap.value = true;
  mapFormError.value = "";
  mapFieldErrors.value = {};

  try {
    if (mapMode.value === "delete") {
      await api(`/api/admin/tower-defense/maps/${selectedMap.value!.id}`, {
        method: "DELETE",
      });
    } else {
      let configuration: Record<string, unknown>;
      try {
        configuration = JSON.parse(mapForm.configuration);
      } catch {
        throw new Error("JSON cấu hình map không hợp lệ.");
      }

      const creating = mapMode.value === "create";
      await api(
        `/api/admin/tower-defense/maps${creating ? "" : `/${selectedMap.value!.id}`}`,
        {
          method: creating ? "POST" : "PUT",
          body: {
            ...(creating ? { id: mapForm.id.trim() } : {}),
            name: mapForm.name.trim(),
            configuration,
            sort_order: Number(mapForm.sortOrder),
            is_active: mapForm.isActive,
          },
        },
      );
    }
    mapDialog.value?.close();
    renderedPreviewMap.value = null;
    mapPreviewDirty.value = false;
    await loadMaps();
  } catch (error: any) {
    mapFormError.value =
      error?.data?.message || error?.message || "Không thể lưu cấu hình map.";
    mapFieldErrors.value = error?.data?.errors || {};
  } finally {
    savingMap.value = false;
  }
}

async function toggleMap(item: AdminTowerDefenseMap) {
  try {
    await api(`/api/admin/tower-defense/maps/${item.id}`, {
      method: "PUT",
      body: {
        name: item.name,
        configuration: item.configuration,
        sort_order: item.sort_order,
        is_active: !item.is_active,
      },
    });
    item.is_active = !item.is_active;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể đổi trạng thái map.";
  }
}

function openAssetDialog() {
  Object.assign(assetForm, {
    key: "",
    type: "model",
    purpose: "enemy-model",
    file: null,
  });
  assetFormError.value = "";
  assetFieldErrors.value = {};
  if (assetFileInput.value) assetFileInput.value.value = "";
  assetDialog.value?.showModal();
}

function selectAssetFile(event: Event) {
  const input = event.target as HTMLInputElement;
  assetForm.file = input.files?.[0] ?? null;
}

async function uploadAsset() {
  if (uploadingAsset.value || !assetForm.file) return;
  uploadingAsset.value = true;
  assetFormError.value = "";
  assetFieldErrors.value = {};
  const body = new FormData();
  body.append("key", assetForm.key.trim());
  body.append("type", assetForm.type);
  body.append("purpose", assetForm.purpose);
  body.append("file", assetForm.file);

  try {
    await api("/api/admin/tower-defense/assets", { method: "POST", body });
    assetDialog.value?.close();
    await loadAssets();
  } catch (error: any) {
    assetFormError.value =
      error?.data?.message || "Không thể tải tài nguyên lên backend.";
    assetFieldErrors.value = error?.data?.errors || {};
  } finally {
    uploadingAsset.value = false;
  }
}

function assetPath(key: string) {
  return `/api/tower-defense/assets/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

async function copyAssetUrl(item: AdminTowerDefenseAsset) {
  const url = new URL(assetPath(item.key), window.location.origin).href;
  await navigator.clipboard.writeText(url);
  copiedKey.value = item.key;
  window.setTimeout(() => {
    if (copiedKey.value === item.key) copiedKey.value = "";
  }, 1600);
}

async function updateAssetPurpose(item: AdminTowerDefenseAsset, event: Event) {
  const select = event.target as HTMLSelectElement;
  const purpose = select.value as AssetPurpose;
  try {
    await api(`/api/admin/tower-defense/assets/${item.key}`, {
      method: "PUT",
      body: { purpose },
    });
    item.purpose = purpose;
  } catch (error: any) {
    select.value = item.purpose;
    pageError.value =
      error?.data?.message || "Không thể cập nhật mục đích tài nguyên.";
  }
}

async function deleteAsset(item: AdminTowerDefenseAsset) {
  if (!window.confirm(`Xóa tài nguyên “${item.key}”? File thật cũng sẽ bị xóa.`))
    return;
  try {
    await api(`/api/admin/tower-defense/assets/${item.key}`, {
      method: "DELETE",
    });
    assets.value = assets.value.filter((asset) => asset.id !== item.id);
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể xóa tài nguyên.";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index++) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

function assetIcon(type: AssetType) {
  return { model: FileBox, sound: FileAudio, image: FileImage }[type];
}

onMounted(() => {
  void Promise.all([loadMaps(), loadAssets(), loadEnemies()]);
});
</script>

<template>
  <main class="td-admin-page">
    <header class="td-admin-header">
      <div>
        <div class="td-admin-eyebrow"><MapPinned /> TOWER DEFENSE CMS</div>
        <h1>Quản lý Map</h1>
        <p>Quản lý cấu hình gameplay, đường đi và nội dung riêng của từng map.</p>
      </div>
      <button
        class="td-button is-ghost"
        type="button"
        :disabled="loadingMaps || loadingAssets"
        @click="refreshAll"
      >
        <RefreshCw :class="{ 'is-spinning': loadingMaps || loadingAssets }" />
        Làm mới
      </button>
    </header>

    <section class="td-stats">
      <article>
        <span><MapPinned /></span>
        <div><strong>{{ mapTotal }}</strong><small>Tổng số map</small></div>
      </article>
      <article>
        <span><Database /></span>
        <div><strong>{{ activeMapCount }}</strong><small>Map đang bật</small></div>
      </article>
    </section>

    <p v-if="pageError" class="td-alert">{{ pageError }}</p>

    <section class="td-panel">
      <header class="td-panel-header">
        <div><h2>Cấu hình map</h2><p>Dữ liệu JSON đang được game tải trực tiếp từ database.</p></div>
        <button class="td-button is-primary" type="button" @click="openMapDialog('create')">
          <Plus /> Thêm map
        </button>
      </header>

      <div v-if="loadingMaps" class="td-loading"><RefreshCw /> Đang tải map…</div>
      <div v-else class="td-table-wrap">
        <table>
          <thead><tr><th>Map</th><th>Kích thước</th><th>Giới hạn trụ</th><th>Vàng đầu trận</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in maps" :key="item.id">
              <td><div class="td-map-name"><span><MapPinned /></span><div><strong>{{ item.name }}</strong><code>{{ item.id }}</code></div></div></td>
              <td>{{ item.configuration.columns }} × {{ item.configuration.rows }}</td>
              <td>{{ item.configuration.maxTowerCount }}</td>
              <td>{{ item.configuration.startingCredits ?? 3000 }}</td>
              <td>#{{ item.sort_order }}</td>
              <td>
                <button class="td-status" :class="{ 'is-active': item.is_active }" type="button" @click="toggleMap(item)">
                  <i /> {{ item.is_active ? "Đang bật" : "Đã tắt" }}
                </button>
              </td>
              <td><div class="td-row-actions">
                <button class="td-icon-button" type="button" title="Sửa" @click="openMapDialog('edit', item)"><Pencil /></button>
                <button class="td-icon-button is-danger" type="button" title="Xóa" @click="openMapDialog('delete', item)"><Trash2 /></button>
              </div></td>
            </tr>
            <tr v-if="maps.length === 0"><td colspan="7" class="td-empty">Database chưa có map.</td></tr>
          </tbody>
        </table>
      </div>
      <AdminPagination :page="mapPage" :last-page="mapLastPage" :total="mapTotal" :loading="loadingMaps" @change="loadMaps" />
    </section>

    <section v-if="false" class="td-panel">
      <header class="td-panel-header">
        <div><h2>Kho tài nguyên</h2><p>Model, âm thanh và hình ảnh trong backend storage.</p></div>
        <button class="td-button is-primary" type="button" @click="openAssetDialog"><Upload /> Upload</button>
      </header>

      <div class="td-filters">
        <label><Search /><input v-model="assetSearch" type="search" placeholder="Tìm theo đường dẫn…" /></label>
        <select v-model="assetType"><option value="">Tất cả loại</option><option value="model">Model</option><option value="sound">Âm thanh</option><option value="image">Hình ảnh</option></select>
        <select v-model="assetPurpose"><option value="">Tất cả mục đích</option><option v-for="option in availablePurposeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select>
        <span>{{ filteredAssets.length }} kết quả</span>
      </div>

      <div v-if="loadingAssets" class="td-loading"><RefreshCw /> Đang tải tài nguyên…</div>
      <div v-else class="td-table-wrap">
        <table>
          <thead><tr><th>Tài nguyên</th><th>Loại</th><th>Mục đích</th><th>MIME</th><th>Dung lượng</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in filteredAssets" :key="item.id">
              <td><div class="td-asset-name">
                <span class="td-asset-preview">
                  <img v-if="item.type === 'image'" :src="assetPath(item.key)" alt="" />
                  <component :is="assetIcon(item.type)" v-else />
                </span>
                <code :title="item.key">{{ item.key }}</code>
              </div></td>
              <td><span class="td-type" :class="`is-${item.type}`">{{ item.type }}</span></td>
              <td><select class="td-purpose-select" :value="item.purpose" @change="updateAssetPurpose(item, $event)"><option v-for="option in ASSET_PURPOSE_OPTIONS[item.type]" :key="option.value" :value="option.value">{{ option.label }}</option></select></td>
              <td>{{ item.mimeType || "—" }}</td>
              <td>{{ formatBytes(item.size) }}</td>
              <td><div class="td-row-actions">
                <a class="td-icon-button" :href="assetPath(item.key)" target="_blank" title="Mở"><ExternalLink /></a>
                <button class="td-icon-button" type="button" title="Sao chép URL" @click="copyAssetUrl(item)"><Check v-if="copiedKey === item.key" /><Copy v-else /></button>
                <button class="td-icon-button is-danger" type="button" title="Xóa" @click="deleteAsset(item)"><Trash2 /></button>
              </div></td>
            </tr>
            <tr v-if="filteredAssets.length === 0"><td colspan="6" class="td-empty">Không tìm thấy tài nguyên.</td></tr>
          </tbody>
        </table>
      </div>
      <AdminPagination :page="assetPage" :last-page="assetLastPage" :total="assetTotal" :loading="loadingAssets" @change="loadAssets" />
    </section>

    <Teleport to="body">
      <dialog ref="mapDialog" class="td-dialog is-wide" @cancel.prevent="closeMapDialog">
        <form method="dialog" @submit.prevent="submitMap">
          <header><div><small>MAP CONFIGURATION</small><h2>{{ mapMode === 'create' ? 'Thêm map' : mapMode === 'edit' ? 'Sửa map' : 'Xóa map?' }}</h2></div><button type="button" @click="closeMapDialog"><X /></button></header>
          <p v-if="mapMode === 'delete'" class="td-delete-copy">Map <strong>{{ selectedMap?.name }}</strong> sẽ bị xóa khỏi database và biến mất khỏi game. Asset liên quan không bị xóa.</p>
          <div v-else class="td-form-grid td-map-form">
            <label><span>ID map</span><input v-model="mapForm.id" :disabled="mapMode === 'edit'" required pattern="[a-z0-9-]+" placeholder="dark-forest" /><small v-if="mapFieldErrors.id">{{ mapFieldErrors.id[0] }}</small></label>
            <label><span>Tên hiển thị</span><input v-model="mapForm.name" required placeholder="Khu rừng Bóng tối" /><small v-if="mapFieldErrors.name">{{ mapFieldErrors.name[0] }}</small></label>
            <label><span>Thứ tự</span><input v-model.number="mapForm.sortOrder" type="number" min="0" required /></label>
            <label class="td-checkbox"><input v-model="mapForm.isActive" type="checkbox" /><span>Cho phép người chơi chọn map này</span></label>
            <section v-if="visualMapConfiguration" class="td-map-settings is-full">
              <header><div><strong>Thông số map và gameplay</strong><small>Các giá trị này được áp dụng trực tiếp khi người chơi mở map.</small></div></header>
              <div>
                <label><span>Số cột</span><input :value="visualMapConfiguration.columns" type="number" :min="minimumMapColumns" max="40" step="1" required @change="updateMapNumber('columns', $event)" /><small v-if="mapFieldErrors['configuration.columns']">{{ mapFieldErrors['configuration.columns'][0] }}</small></label>
                <label><span>Số hàng</span><input :value="visualMapConfiguration.rows" type="number" :min="minimumMapRows" max="40" step="1" required @change="updateMapNumber('rows', $event)" /><small v-if="mapFieldErrors['configuration.rows']">{{ mapFieldErrors['configuration.rows'][0] }}</small></label>
                <label><span>Số trụ tối đa</span><input :value="visualMapConfiguration.maxTowerCount" type="number" min="1" max="1000" step="1" required @change="updateMapNumber('maxTowerCount', $event)" /><small v-if="mapFieldErrors['configuration.maxTowerCount']">{{ mapFieldErrors['configuration.maxTowerCount'][0] }}</small></label>
                <label><span>Vàng khởi đầu</span><input :value="visualMapConfiguration.startingCredits ?? 3000" type="number" min="0" max="10000000" step="1" required @change="updateMapNumber('startingCredits', $event)" /><small v-if="mapFieldErrors['configuration.startingCredits']">{{ mapFieldErrors['configuration.startingCredits'][0] }}</small></label>
              </div>
            </section>
            <section
              class="td-live-editor is-full"
              :style="{
                '--lane-one': colorNumber(visualMapConfiguration?.theme?.routeColors?.[0], '#f1c96a'),
                '--lane-two': colorNumber(visualMapConfiguration?.theme?.routeColors?.[1], '#ff8b76'),
              }"
            >
              <header>
                <div>
                  <strong>Trình dựng đường đi trực tiếp</strong>
                  <small>Chọn lane rồi click các điểm cùng hàng hoặc cột. JSON được sinh tự động.</small>
                </div>
                <div class="td-lane-switcher">
                  <button type="button" :class="{ 'is-active': mapEditorPlacementMode === 'path' && mapEditorLane === 0 }" @click="mapEditorLane = 0; mapEditorPlacementMode = 'path'">Vẽ lane 1</button>
                  <button type="button" :class="{ 'is-active': mapEditorPlacementMode === 'path' && mapEditorLane === 1 }" @click="mapEditorLane = 1; mapEditorPlacementMode = 'path'">Vẽ lane 2</button>
                  <button type="button" :class="{ 'is-active': mapEditorPlacementMode === 'portal-0' }" @click="mapEditorPlacementMode = 'portal-0'">Đặt cổng 1</button>
                  <button type="button" :class="{ 'is-active': mapEditorPlacementMode === 'portal-1' }" @click="mapEditorPlacementMode = 'portal-1'">Đặt cổng 2</button>
                  <button type="button" :class="{ 'is-active': mapEditorPlacementMode === 'castle' }" @click="mapEditorPlacementMode = 'castle'">Đặt cổng lâu đài</button>
                </div>
              </header>

              <div v-if="visualMapConfiguration" class="td-live-stage">
                <div
                  class="td-live-grid"
                  :style="{
                    '--map-columns': mapEditorColumns,
                    '--map-terrain': colorNumber(visualMapConfiguration.theme?.terrain, '#1b211e'),
                    '--map-grid': colorNumber(visualMapConfiguration.theme?.gridLine, '#303832'),
                  }"
                >
                  <button
                    v-for="point in mapEditorCells"
                    :key="`${point.x}:${point.y}`"
                    type="button"
                    :title="`Ô ${point.x}, ${point.y}`"
                    :class="{
                      'is-lane-one': mapEditorPathKeys[0].has(`${point.x}:${point.y}`),
                      'is-lane-two': mapEditorPathKeys[1].has(`${point.x}:${point.y}`),
                      'is-anchor-one': isEditorAnchor(point, 0),
                      'is-anchor-two': isEditorAnchor(point, 1),
                      'is-portal-one': isConfiguredPoint(point, configuredSpawnPoint(0)),
                      'is-portal-two': isConfiguredPoint(point, configuredSpawnPoint(1)),
                      'is-castle': isConfiguredPoint(point, configuredCastlePoint()),
                    }"
                    @click="selectMapEditorCell(point)"
                  ><span>{{ editorCellContent(point) }}</span></button>
                </div>
                <aside>
                  <div class="td-live-legend"><span class="is-one" /> Lane 1 <span class="is-two" /> Lane 2</div>
                  <dl>
                    <div><dt>Kích thước</dt><dd>{{ visualMapConfiguration.columns }} × {{ visualMapConfiguration.rows }}</dd></div>
                    <div><dt>Lane 1</dt><dd>{{ visualMapConfiguration.paths[0]?.length ?? 0 }} ô</dd></div>
                    <div><dt>Lane 2</dt><dd>{{ visualMapConfiguration.paths[1]?.length ?? 0 }} ô</dd></div>
                    <div><dt>Cổng 1</dt><dd>{{ configuredSpawnPoint(0)?.x }}, {{ configuredSpawnPoint(0)?.y }}</dd></div>
                    <div><dt>Cổng 2</dt><dd>{{ configuredSpawnPoint(1)?.x }}, {{ configuredSpawnPoint(1)?.y }}</dd></div>
                    <div><dt>Cổng lâu đài</dt><dd>{{ configuredCastlePoint()?.x }}, {{ configuredCastlePoint()?.y }}</dd></div>
                  </dl>
                  <button class="td-editor-action" type="button" :disabled="mapEditorAnchors[mapEditorLane].length === 0" @click="undoMapEditorLane"><Undo2 /> Hoàn tác điểm</button>
                  <button class="td-editor-action is-danger" type="button" :disabled="mapEditorAnchors[mapEditorLane].length === 0" @click="clearMapEditorLane"><Trash2 /> Xóa lane {{ mapEditorLane + 1 }}</button>
                  <button class="td-editor-action is-reset" type="button" @click="resetMapEditorLayout"><RotateCcw /> Đặt lại mặc định</button>
                </aside>
              </div>
              <p v-else class="td-live-invalid">JSON chưa hợp lệ nên không thể dựng bản xem trước.</p>
              <p v-if="mapEditorMessage" class="td-editor-message">{{ mapEditorMessage }}</p>
            </section>

            <section v-if="renderedPreviewMap" class="td-map-preview is-full">
              <header>
                <div>
                  <small>LIVE PREVIEW</small>
                  <strong>Bản xem trước trong game</strong>
                  <p>Preview chỉ dựng lại khi bạn yêu cầu để thao tác chỉnh lane luôn mượt.</p>
                </div>
                <div class="td-map-preview-actions">
                  <span v-if="mapPreviewDirty">Có thay đổi chưa hiển thị</span>
                  <button type="button" :disabled="!previewMap" @click="refreshMapPreview">
                    <RefreshCw /> {{ mapPreviewDirty ? 'Cập nhật preview' : 'Dựng lại preview' }}
                  </button>
                </div>
              </header>
              <ClientOnly>
                <TowerDefenseMapPreview :map="renderedPreviewMap" />
                <template #fallback>
                  <div class="td-map-preview-fallback">Đang khởi tạo trình xem 3D…</div>
                </template>
              </ClientOnly>
            </section>

            <section v-if="visualMapConfiguration" class="td-content-editor is-full">
              <header>
                <div><strong>Nội dung riêng của map</strong><small>Chọn trực tiếp từ tài nguyên backend.</small></div>
              </header>
              <div class="td-content-grid">
                <fieldset>
                  <legend>Công trình và không gian</legend>
                  <label><span>Model lâu đài</span><select :value="configuredAssetKey(visualMapConfiguration.castle?.modelUrl)" @change="selectCastleModel"><option value="">Chọn model…</option><option v-for="asset in selectableCastleAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
                  <label><span>Model nền 3D</span><select :value="configuredAssetKey(visualMapConfiguration.backgroundModel?.url)" @change="selectSimpleAsset('backgroundModel', $event)"><option value="">Không dùng model nền</option><option v-for="asset in selectableMapModelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
                  <label><span>Nhạc nền</span><select :value="configuredAssetKey(visualMapConfiguration.backgroundMusicUrl)" @change="selectSimpleAsset('backgroundMusicUrl', $event)"><option value="">Không phát nhạc</option><option v-for="asset in selectableMusicAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
                </fieldset>

                <fieldset>
                  <legend>Lính thường</legend>
                  <div class="td-roster-heading"><span>Chọn một hoặc nhiều loại lính xuất hiện trên map.</span><b>{{ managedEnemyIds('normal').length }} đã chọn</b></div>
                  <div class="td-roster-options"><label v-for="enemy in selectableNormalEnemies" :key="enemy.id" class="td-roster-option" :class="{ 'is-selected': isManagedEnemySelected('normal', enemy.id) }"><input type="checkbox" :checked="isManagedEnemySelected('normal', enemy.id)" @change="toggleManagedEnemy('normal', enemy, $event)" /><img v-if="enemy.avatar_asset_key" :src="assetPath(enemy.avatar_asset_key)" alt="" /><Skull v-else /><span><strong>{{ enemy.name }}</strong><code>{{ enemy.id }}</code><small>HP {{ enemy.base_health }} · Tốc độ {{ enemy.base_speed }}</small></span></label></div>
                  <NuxtLink class="td-manage-enemy-link" to="/admin/tower-defense/enemies">Quản lý hồ sơ lính →</NuxtLink>
                </fieldset>

                <fieldset>
                  <legend>Boss</legend>
                  <div class="td-roster-heading is-boss"><span>Boss đã chọn sẽ được luân phiên ở các đợt boss.</span><b>{{ managedEnemyIds('boss').length }} đã chọn</b></div>
                  <div class="td-roster-options"><label v-for="enemy in selectableBosses" :key="enemy.id" class="td-roster-option is-boss" :class="{ 'is-selected': isManagedEnemySelected('boss', enemy.id) }"><input type="checkbox" :checked="isManagedEnemySelected('boss', enemy.id)" @change="toggleManagedEnemy('boss', enemy, $event)" /><img v-if="enemy.avatar_asset_key" :src="assetPath(enemy.avatar_asset_key)" alt="" /><Crown v-else /><span><strong>{{ enemy.name }}</strong><code>{{ enemy.id }}</code><small>HP {{ enemy.base_health }} · Mất {{ enemy.castle_damage }} máu</small></span></label></div>
                  <NuxtLink class="td-manage-enemy-link" to="/admin/tower-defense/enemies">Quản lý hồ sơ boss →</NuxtLink>
                </fieldset>
              </div>
            </section>

            <details class="td-json-editor is-full">
              <summary>JSON nâng cao</summary>
              <label><span>Configuration JSON</span><textarea v-model="mapForm.configuration" rows="18" spellcheck="false" /><small v-if="mapFieldErrors.configuration">{{ mapFieldErrors.configuration[0] }}</small></label>
            </details>
          </div>
          <p v-if="mapFormError" class="td-form-error">{{ mapFormError }}</p>
          <footer><button class="td-button is-ghost" type="button" @click="closeMapDialog">Hủy</button><button class="td-button" :class="mapMode === 'delete' ? 'is-danger' : 'is-primary'" type="submit" :disabled="savingMap">{{ savingMap ? 'Đang xử lý…' : mapMode === 'delete' ? 'Xóa map' : 'Lưu cấu hình' }}</button></footer>
        </form>
      </dialog>

      <dialog ref="assetDialog" class="td-dialog is-small" @cancel.prevent="!uploadingAsset && assetDialog?.close()">
        <form method="dialog" @submit.prevent="uploadAsset">
          <header><div><small>ASSET STORAGE</small><h2>Upload tài nguyên</h2></div><button type="button" @click="assetDialog?.close()"><X /></button></header>
          <div class="td-form-grid is-single">
            <label><span>Loại tài nguyên</span><select v-model="assetForm.type"><option value="model">Model</option><option value="sound">Âm thanh</option><option value="image">Hình ảnh</option></select></label>
            <label><span>Mục đích sử dụng</span><select v-model="assetForm.purpose"><option v-for="option in uploadPurposeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><small v-if="assetFieldErrors.purpose">{{ assetFieldErrors.purpose[0] }}</small></label>
            <label><span>Key / đường dẫn lưu</span><input v-model="assetForm.key" required placeholder="models/games/tower-defense/.../model.glb" /><small v-if="assetFieldErrors.key">{{ assetFieldErrors.key[0] }}</small></label>
            <label><span>File</span><input ref="assetFileInput" type="file" required @change="selectAssetFile" /><small v-if="assetForm.file">{{ assetForm.file.name }} · {{ formatBytes(assetForm.file.size) }}</small><small v-if="assetFieldErrors.file">{{ assetFieldErrors.file[0] }}</small></label>
          </div>
          <p v-if="assetFormError" class="td-form-error">{{ assetFormError }}</p>
          <footer><button class="td-button is-ghost" type="button" @click="assetDialog?.close()">Hủy</button><button class="td-button is-primary" type="submit" :disabled="uploadingAsset || !assetForm.file"><Upload /> {{ uploadingAsset ? 'Đang upload…' : 'Upload' }}</button></footer>
        </form>
      </dialog>
    </Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense.css"></style>
