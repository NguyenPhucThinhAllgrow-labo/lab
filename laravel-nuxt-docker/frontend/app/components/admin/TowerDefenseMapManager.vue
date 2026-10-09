<script setup lang="ts">
const props = defineProps<{ editorMode?: "create" | "edit"; mapId?: string }>();
const mapEditorPageReady = ref(false);
const loadingEditor = ref(Boolean(props.editorMode));
import {
  ArrowLeft,
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
  Save,
  Moon,
  Sun,
  Skull,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-vue-next";
import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { sharedLaneSegments } from "~/utils/games/sharedLaneSegments";
import { expandSwampEditableArea } from "~/utils/games/swampEditableArea";
import lavaMapData from "~/data/tower-defense/lava-map.json";
import swampMapData from "~/data/tower-defense/swamp-map.json";
import moonfrostMapData from "~/data/tower-defense/moonfrost-lake-map.json";
import LiveMapEditor from "~/components/tower-defense/LiveMapEditor.client.vue";
import { citadelBridgeLayout, citadelBridgePointWorld, citadelBridgeTiles, citadelForecourtTiles, pickCitadelBridgePoint } from "~/utils/games/citadelBridgeLayout";

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
  armor: number;
  magic_resistance: number;
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

useHead({ title: props.editorMode === "create" ? "Thêm map | Tower Defense Admin" : props.editorMode === "edit" ? "Sửa map | Tower Defense Admin" : "Quản lý Map | Tower Defense Admin" });

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
  cellSize: number;
  maxTowerCount: number;
  startingCredits: number;
  bossOnly?: boolean;
  environmentMode?: "normal" | "dark";
  scenePreset?: "citadel-of-cinders" | "gothic-swamp";
  sceneSettings?: {
    bridge?: {
      castleEdgeX: number;
      length: number;
      width?: number;
      bayWidth: number;
      paverColumns: number;
      paverRows: number;
      towerPadCount: number;
      omittedTowerPierIndices?: number[];
    };
    lava?: {
      width: number;
      depth: number;
    };
    editorLayers?: Array<{
      id:
        | "lava"
        | "opposite-foundation"
        | "bridge-foundation"
        | "bridge"
        | "castle-foundation"
        | "forecourt"
        | "forest"
        | "castle";
      label: string;
      bounds: {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
      };
    }>;
  };
  spawnPoints?: [MapEditorPoint, MapEditorPoint];
  paths: [MapEditorPoint[], MapEditorPoint[]];
  pathTiles: MapEditorPoint[];
  buildableTiles?: MapEditorPoint[];
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
    modelOffset?: { x: number; z: number };
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
  armor: number;
  magicResistance: number;
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
  armor: number;
  magicResistance: number;
  resistance: string;
  weakness: string;
}
const mapEditorLane = ref<0 | 1>(0);
const mapEditorPlacementMode = ref<
  "path" | "buildable" | "portal-0" | "portal-1" | "castle"
>("path");
const mapEditorAnchors = ref<[MapEditorPoint[], MapEditorPoint[]]>([[], []]);
type MapEditorSnapshot = { form: typeof mapForm; preset: string };
const mapActionUndo = ref<MapEditorSnapshot[]>([]);
const mapActionRedo = ref<MapEditorSnapshot[]>([]);
let mapHistoryReady = false;
let mapHistoryCurrent: MapEditorSnapshot | null = null;

const mapEditorGrid = ref<SVGSVGElement | null>(null);
const mapEditorViewport = ref<HTMLDivElement | null>(null);
const mapEditorZoom = ref(1);
const isMapEditorPanning = ref(false);
let mapEditorPanPointerId: number | null = null;
let mapEditorPanClientX = 0;
let mapEditorPanClientY = 0;
let mapEditorPanScrollLeft = 0;
let mapEditorPanScrollTop = 0;
const draggedMapAnchor = ref<{ lane: 0 | 1; index: number } | null>(null);
const draggedMapAnchorTarget = ref<MapEditorPoint | null>(null);
let mapEditorDragPointerId: number | null = null;
let ignoreMapEditorClickUntil = 0;
const mapEditorMessage = ref("");
const hoveredMapEditorPoint = ref<MapEditorPoint | null>(null);
let mapEditorHoverFrame = 0;
let pendingMapEditorPointer: PointerEvent | null = null;
const mapEditorPadHint = computed(() => {
  if (mapEditorPlacementMode.value !== "buildable" || !hoveredMapEditorPoint.value) return null;
  const point = hoveredMapEditorPoint.value;
  const status = mapPadPlacementStatus(point);
  return { point, ...status };
});

function changeMapEditorZoom(step: number) {
  mapEditorZoom.value = Math.min(
    2,
    Math.max(0.5, Number((mapEditorZoom.value + step).toFixed(2))),
  );
}

function zoomMapEditorWithWheel(event: WheelEvent) {
  const viewport = mapEditorViewport.value;
  if (!viewport) return;
  event.preventDefault();
  const previousZoom = mapEditorZoom.value;
  const nextZoom = Math.min(
    2,
    Math.max(
      0.5,
      Number((previousZoom + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2)),
    ),
  );
  if (nextZoom === previousZoom) return;

  const bounds = viewport.getBoundingClientRect();
  const pointerX = event.clientX - bounds.left;
  const pointerY = event.clientY - bounds.top;
  const contentX = viewport.scrollLeft + pointerX;
  const contentY = viewport.scrollTop + pointerY;
  mapEditorZoom.value = nextZoom;

  void nextTick(() => {
    const scale = nextZoom / previousZoom;
    viewport.scrollLeft = contentX * scale - pointerX;
    viewport.scrollTop = contentY * scale - pointerY;
  });
}

function startMapEditorPan(event: PointerEvent) {
  if (event.button !== 2 && event.button !== 1) return;
  const viewport = mapEditorViewport.value;
  if (!viewport) return;
  event.preventDefault();
  isMapEditorPanning.value = true;
  mapEditorPanPointerId = event.pointerId;
  mapEditorPanClientX = event.clientX;
  mapEditorPanClientY = event.clientY;
  mapEditorPanScrollLeft = viewport.scrollLeft;
  mapEditorPanScrollTop = viewport.scrollTop;
  viewport.setPointerCapture(event.pointerId);
}

function moveMapEditorPan(event: PointerEvent) {
  const viewport = mapEditorViewport.value;
  if (
    !viewport
    || !isMapEditorPanning.value
    || event.pointerId !== mapEditorPanPointerId
  ) return;
  viewport.scrollLeft = mapEditorPanScrollLeft - (event.clientX - mapEditorPanClientX);
  viewport.scrollTop = mapEditorPanScrollTop - (event.clientY - mapEditorPanClientY);
}

function endMapEditorPan(event?: PointerEvent) {
  if (event && event.pointerId !== mapEditorPanPointerId) return;
  isMapEditorPanning.value = false;
  mapEditorPanPointerId = null;
}

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
  Math.min(100, visualMapConfiguration.value?.columns ?? 0),
);
const mapEditorRows = computed(() =>
  Math.min(100, visualMapConfiguration.value?.rows ?? 0),
);
const minimumMapColumns = computed(() =>
  Math.max(
    4,
    ...(visualMapConfiguration.value?.paths.flat().map((point) => point.x + 1) ?? []),
    ...(visualMapConfiguration.value?.spawnPoints?.map((point) => point.x + 1) ?? []),
    ...(visualMapConfiguration.value?.buildableTiles?.map((point) => point.x + 1) ?? []),
    (visualMapConfiguration.value?.castle.position?.x ?? -1) + 1,
  ),
);
const minimumMapRows = computed(() =>
  Math.max(
    4,
    ...(visualMapConfiguration.value?.paths.flat().map((point) => point.y + 1) ?? []),
    ...(visualMapConfiguration.value?.spawnPoints?.map((point) => point.y + 1) ?? []),
    ...(visualMapConfiguration.value?.buildableTiles?.map((point) => point.y + 1) ?? []),
    (visualMapConfiguration.value?.castle.position?.y ?? -1) + 1,
  ),
);
const mapEditorPathKeys = computed<[Set<string>, Set<string>]>(() => {
  const paths = visualMapConfiguration.value?.paths ?? [[], []];
  return [
    new Set(paths[0].map((point) => `${point.x}:${point.y}`)),
    new Set(paths[1].map((point) => `${point.x}:${point.y}`)),
  ];
});
const mapEditorBuildableKeys = computed(() =>
  new Set(
    (visualMapConfiguration.value?.buildableTiles ?? []).map(
      (point) => `${point.x}:${point.y}`,
    ),
  ),
);
const mapEditorTerrainLayers = computed(() => {
  const configuration = visualMapConfiguration.value;
  const layers = (configuration?.sceneSettings?.editorLayers ?? []).map((layer) => {
    if ((layer.id !== "bridge" && layer.id !== "bridge-foundation")
      || configuration?.scenePreset !== "citadel-of-cinders")
      return layer;
    const layout = citadelBridgeLayout(configuration);
    if (!layout) return layer;
    const centerRow = layout.lava.depth / configuration.cellSize / 2;
    const halfWidth = layout.width / configuration.cellSize / 2;
    return {
      ...layer,
      bounds: {
        xMin: (layout.startX + layout.lava.width / 2) / configuration.cellSize,
        xMax: (layout.bridge.castleEdgeX + layout.lava.width / 2) / configuration.cellSize - 1,
        yMin: centerRow - halfWidth,
        yMax: centerRow + halfWidth - 1,
      },
    };
  });
  if (
    configuration?.scenePreset !== "citadel-of-cinders"
    || layers.some((layer) => layer.id === "forecourt")
  ) return layers;
  // Older imported documents omit the paved approach present in the 3D scene.
  const foundationIndex = layers.findIndex((layer) => layer.id === "castle-foundation");
  if (foundationIndex < 0) return layers;
  return [
    ...layers.slice(0, foundationIndex + 1),
    {
      id: "forecourt" as const,
      label: "Sân lát nối cầu và cổng lâu đài",
      bounds: { xMin: 61, xMax: 65, yMin: 24, yMax: 35 },
    },
    ...layers.slice(foundationIndex + 1),
  ];
});
const mapEditorPathPolylines = computed(() =>
  (visualMapConfiguration.value?.paths ?? [[], []]).map((path) =>
    path.map((point) => {
      const position = mapEditorDisplayPoint(point);
      return `${position.x},${position.y}`;
    }).join(" "),
  ),
);
const mapEditorBridgeTiles = computed(() => {
  const configuration = visualMapConfiguration.value;
  return configuration?.scenePreset === "citadel-of-cinders"
    ? [...citadelBridgeTiles(configuration), ...citadelForecourtTiles(configuration)] : [];
});
const mapEditorSharedLaneSegments = computed(() =>
  sharedLaneSegments(visualMapConfiguration.value?.paths ?? []).map(segment => ({
    key: segment.key,
    from: mapEditorDisplayPoint(segment.from),
    to: mapEditorDisplayPoint(segment.to),
  })),
);

function mapEditorDisplayPoint(point: MapEditorPoint) {
  const configuration = visualMapConfiguration.value;
  if (configuration?.scenePreset === "citadel-of-cinders") {
    const world = citadelBridgePointWorld(point, configuration);
    const lava = configuration.sceneSettings?.lava;
    if (world && lava) return {
      x: (world.x + lava.width / 2) / configuration.cellSize,
      y: (world.z + lava.depth / 2) / configuration.cellSize,
    };
  }
  return { x: point.x + 0.5, y: point.y + 0.5 };
}
const mapEditorMarkers = computed(() => ({
  spawnOne: configuredSpawnPoint(0),
  spawnTwo: configuredSpawnPoint(1),
  castle: configuredCastlePoint(),
}));

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
  if (mapEditorBuildableKeys.value.has(`${point.x}:${point.y}`)) return "T";
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

function applyImportedCitadelLayout(configuration: MapEditorConfiguration) {
  const bridge = configuration.sceneSettings?.bridge;
  const lava = configuration.sceneSettings?.lava;
  if (!bridge || !lava) return;

  // Lưới bao toàn bộ mặt bằng 180×120 của scene, không chỉ riêng mặt cầu.
  // Cell 2 world-unit giữ đúng 36 cột gạch dọc cây cầu dài 72.
  const cellSize = bridge.length / bridge.paverColumns;
  const columns = Math.round(lava.width / cellSize);
  const rows = Math.round(lava.depth / cellSize);
  const centerRow = Math.floor(rows / 2);
  const laneRows = [centerRow - 1, centerRow + 1] as const;
  const bridgeStartWorldX = bridge.castleEdgeX - bridge.length;
  const worldToGridX = (worldX: number) =>
    Math.round((worldX + lava.width / 2) / cellSize);
  const bridgeStartX = worldToGridX(bridgeStartWorldX);
  const bridgeEndX = worldToGridX(bridge.castleEdgeX);
  const gateTile = citadelForecourtTiles({ ...configuration, cellSize, rows }).find((tile) => tile.worldZ === 0 && tile.worldX === 41);
  const castleX = gateTile?.point.x ?? bridgeEndX;
  const approachX = bridgeEndX - 1;
  const paths = laneRows.map((laneY) => [
    ...Array.from(
      { length: approachX - bridgeStartX + 1 },
      (_, index) => ({ x: bridgeStartX + index, y: laneY }),
    ),
    { x: approachX, y: centerRow },
    ...Array.from({ length: castleX - approachX }, (_, index) => ({ x: approachX + index + 1, y: centerRow })),
  ]) as [MapEditorPoint[], MapEditorPoint[]];
  const pierCount = Math.round(bridge.length / bridge.bayWidth) + 1;
  const omitted = new Set(bridge.omittedTowerPierIndices ?? []);
  const towerPierIndexes = Array.from({ length: pierCount }, (_, index) => index)
    .filter((index) => index > 0 && index < pierCount - 1 && !omitted.has(index))
    .slice(0, bridge.towerPadCount);
  const buildableTiles = towerPierIndexes.map((pierIndex, index) => ({
    x: worldToGridX(bridgeStartWorldX + pierIndex * bridge.bayWidth),
    y: index % 2 === 0 ? centerRow - 3 : centerRow + 3,
  }));

  configuration.columns = columns;
  configuration.rows = rows;
  configuration.cellSize = cellSize;
  configuration.spawnPoints = [
    { x: bridgeStartX, y: laneRows[0] },
    { x: bridgeStartX, y: laneRows[1] },
  ];
  configuration.paths = paths;
  configuration.pathTiles = Array.from(
    new Map(
      paths.flat().map((point) => [`${point.x}:${point.y}`, point]),
    ).values(),
  );
  configuration.buildableTiles = buildableTiles;
  configuration.maxTowerCount = buildableTiles.length;
  configuration.castle.position = { x: castleX, y: centerRow };
}

const selectedMapPreset = ref("");
const mapPresets = [lavaMapData, swampMapData, moonfrostMapData].map((data) => ({ id: data.id, name: data.name, data }));

function selectMapPreset(event: Event) {
  if (mapMode.value !== "create") return;
  const id = (event.target as HTMLSelectElement).value;
  const selected = mapPresets.find((preset) => preset.id === id);
  if (!selected) return;
  selectedMapPreset.value = id;
  const preset = structuredClone(selected.data) as unknown as {
    id: string;
    name: string;
    isActive: boolean;
    configuration: MapEditorConfiguration;
  };
  // Only the original bridge template needs its legacy layout regenerated.
  // Campaign templates already contain authored lanes and tower positions.
  if (selected.id === lavaMapData.id) applyImportedCitadelLayout(preset.configuration);
  preset.configuration = expandSwampEditableArea(preset.configuration);
  const removedProfiles = normalizeMapEnemyRoster(preset.configuration);
  Object.assign(mapForm, {
    id: preset.id,
    name: preset.name,
    isActive: preset.isActive,
    configuration: JSON.stringify(preset.configuration, null, 2),
  });
  mapEditorMessage.value = removedProfiles > 0
    ? `Đã nạp map ${preset.name}; ${removedProfiles} hồ sơ quái không còn hoạt động đã được loại bỏ.`
    : `Đã nạp map ${preset.name}. Có thể chỉnh sửa trực tiếp trên LIVE PREVIEW trước khi lưu.`;
  void nextTick(refreshMapPreview);
}

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
    bossOnly: false,
    environmentMode: "normal" as const,
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
  if (renderedPreviewMap.value && previewMap.value) refreshMapPreview();
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
    // Kéo một góc có thể làm hai anchor không còn thẳng hàng. Luôn nối theo
    // trục X rồi trục Y để path vẫn gồm các đoạn vuông góc hợp lệ.
    for (
      let x = from.x + stepX;
      stepX !== 0 && x !== to.x + stepX;
      x += stepX
    )
      path.push({ x, y: from.y });
    for (
      let y = from.y + stepY;
      stepY !== 0 && y !== to.y + stepY;
      y += stepY
    )
      path.push({ x: to.x, y });
  }
  return path;
}

function removeEditorPathLoops(path: MapEditorPoint[]) {
  const route: MapEditorPoint[] = [];
  const routeIndexes = new Map<string, number>();
  for (const point of path) {
    const key = `${point.x}:${point.y}`;
    const previousIndex = routeIndexes.get(key);
    if (previousIndex === undefined) {
      routeIndexes.set(key, route.length);
      route.push({ ...point });
      continue;
    }

    // Nếu tuyến quay lại ô đã đi qua, phần nằm giữa tạo thành vòng lặp/nhánh
    // thừa. Cắt phần đó để mỗi ô chỉ xuất hiện một lần trên đường tới đích.
    for (let index = route.length - 1; index > previousIndex; index--) {
      const removed = route[index]!;
      routeIndexes.delete(`${removed.x}:${removed.y}`);
    }
    route.length = previousIndex + 1;
  }
  return route;
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
  const pathKeys = new Set(pathTiles.map((point) => `${point.x}:${point.y}`));
  const nextConfiguration = { ...configuration, paths, pathTiles };
  // Map cũ không có buildableTiles nghĩa là mọi ô ngoài path đều đặt được trụ.
  // Chỉ tạo danh sách giới hạn sau khi admin chủ động dùng công cụ đặt bệ.
  if (Object.hasOwn(configuration, "buildableTiles")) {
    nextConfiguration.buildableTiles = (configuration.buildableTiles ?? []).filter(
      (point) => !pathKeys.has(`${point.x}:${point.y}`)
        || (configuration.scenePreset === "citadel-of-cinders" && isBridgeSurfacePoint(point, configuration)),
    );
  }
  mapForm.configuration = JSON.stringify(nextConfiguration, null, 2);
}

function isBridgeSurfacePoint(
  point: MapEditorPoint,
  configuration: MapEditorConfiguration,
) {
  const bridgeBounds = configuration.sceneSettings?.editorLayers?.find(
    (layer) => layer.id === "bridge",
  )?.bounds;
  return Boolean(
    bridgeBounds
    && point.x >= bridgeBounds.xMin
    && point.x <= bridgeBounds.xMax
    && point.y >= bridgeBounds.yMin
    && point.y <= bridgeBounds.yMax
  );
}

function mapPadPlacementStatus(point: MapEditorPoint) {
  const configuration = visualMapConfiguration.value;
  if (!configuration) return { allowed: false, removing: false, message: "Map chưa hợp lệ." };
  const pads = configuration.buildableTiles ?? [];
  if (pads.some((pad) => isConfiguredPoint(point, pad)))
    return { allowed: true, removing: true, message: "Nhấn để xóa bệ này." };
  if (isConfiguredPoint(point, configuredSpawnPoint(0))
    || isConfiguredPoint(point, configuredSpawnPoint(1))
    || isConfiguredPoint(point, configuredCastlePoint()))
    return { allowed: false, removing: false, message: "Ô này là cổng; không thể đặt bệ." };
  if (!isBridgeSurfacePoint(point, configuration)
    && mapEditorPathKeys.value.some((keys) => keys.has(`${point.x}:${point.y}`)))
    return { allowed: false, removing: false, message: "Ô này thuộc đường đi ngoài cầu." };
  const position = (point: MapEditorPoint) => {
    if (configuration.scenePreset === "citadel-of-cinders") {
      const world = citadelBridgePointWorld(point, configuration);
      if (world) return world;
    }
    return { x: point.x * configuration.cellSize, z: point.y * configuration.cellSize };
  };
  const target = position(point);
  const overlaps = pads.some((pad) => {
    const existing = position(pad);
    return Math.hypot(existing.x - target.x, existing.z - target.z) < 2.8;
  });
  return overlaps
    ? { allowed: false, removing: false, message: "Bệ sẽ chồng lên bệ bên cạnh. Chọn ô xa hơn." }
    : { allowed: true, removing: false, message: "Nhấn để đặt bệ tại ô này." };
}

function selectMapEditorCell(point: MapEditorPoint) {
  if (performance.now() < ignoreMapEditorClickUntil) return;
  if (mapEditorPlacementMode.value === "buildable") {
    const configuration = visualMapConfiguration.value;
    if (!configuration) return;
    const padPoint = { ...point };
    const onBridgeSurface = isBridgeSurfacePoint(padPoint, configuration);
    const status = mapPadPlacementStatus(padPoint);
    if (!status.allowed) {
      mapEditorMessage.value = status.message;
      return;
    }
    let added = false;
    updateMapConfiguration((configuration) => {
      const buildableTiles = configuration.buildableTiles ?? [];
      const existingIndex = buildableTiles.findIndex(
        (cell) => cell.x === padPoint.x && cell.y === padPoint.y,
      );
      if (existingIndex >= 0) buildableTiles.splice(existingIndex, 1);
      else {
        buildableTiles.push({ ...padPoint });
        added = true;
      }
      configuration.buildableTiles = buildableTiles;
    });
    mapEditorMessage.value = `${added ? "Đã thêm" : "Đã bỏ"} bệ đặt trụ tại ô ${padPoint.x}, ${padPoint.y}${onBridgeSurface ? " trên mặt cầu" : ""}.`;
    return;
  }
  if (mapEditorPlacementMode.value !== "path") {
    if (mapEditorPlacementMode.value === "castle") {
      changeCastlePlacement({ position: { ...point } });
      mapEditorMessage.value = `Đã đặt cổng lâu đài tại ô ${point.x}, ${point.y}.`;
      return;
    }
    updateMapConfiguration((configuration) => {
      if (Object.hasOwn(configuration, "buildableTiles")) {
        configuration.buildableTiles = (configuration.buildableTiles ?? []).filter(
          (cell) => cell.x !== point.x || cell.y !== point.y,
        );
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
    mapEditorMessage.value = `Đã đặt cổng ${mapEditorPlacementMode.value === "portal-0" ? 1 : 2} tại ô ${point.x}, ${point.y}.`;
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

function mapAnchorIndex(point: MapEditorPoint, lane: 0 | 1) {
  return mapEditorAnchors.value[lane].findIndex(
    (anchor) => anchor.x === point.x && anchor.y === point.y,
  );
}

function movePreviewMapAnchor(change: { from: MapEditorPoint; to: MapEditorPoint; lane: 0 | 1 }) {
  const index = mapAnchorIndex(change.from, change.lane);
  if (index < 0) return;
  draggedMapAnchor.value = { lane: change.lane, index };
  dropMapAnchor(change.to);
}

function movePreviewCastle(offset: { x: number; z: number }) {
  changeCastlePlacement({ modelOffset: { ...offset } });
  mapEditorMessage.value = "Đã di chuyển model lâu đài tự do, giữ nguyên ô cổng. Nhấn lưu để ghi vị trí mới.";
}

function changeCastlePlacement(change: { position?: MapEditorPoint; modelOffset?: { x: number; z: number } }) {
  updateMapConfiguration((next) => {
    Object.assign(next.castle, change);
    if (change.position && Object.hasOwn(next, "buildableTiles")) next.buildableTiles = (next.buildableTiles ?? []).filter(
      (pad) => pad.x !== change.position!.x || pad.y !== change.position!.y,
    );
  });
}


function mapEditorSnapshot(): MapEditorSnapshot {
  return { form: { ...mapForm }, preset: selectedMapPreset.value };
}

function recordMapEditorHistory() {
  const current = mapEditorSnapshot();
  if (mapHistoryCurrent && JSON.stringify(current) === JSON.stringify(mapHistoryCurrent)) return;
  if (mapHistoryReady && mapHistoryCurrent) {
    mapActionUndo.value.push(mapHistoryCurrent);
    if (mapActionUndo.value.length > 100) mapActionUndo.value.shift();
    mapActionRedo.value = [];
  }
  mapHistoryCurrent = current;
}

function restoreMapEditorSnapshot(snapshot: MapEditorSnapshot) {
  endMapAnchorDrag();
  mapHistoryCurrent = { form: { ...snapshot.form }, preset: snapshot.preset };
  Object.assign(mapForm, snapshot.form);
  selectedMapPreset.value = snapshot.preset;
  try {
    const parsed = JSON.parse(snapshot.form.configuration) as MapEditorConfiguration;
    if (Array.isArray(parsed.paths) && parsed.paths.length === 2)
      mapEditorAnchors.value = [compressPath(parsed.paths[0] ?? []), compressPath(parsed.paths[1] ?? [])];
  } catch { /* Preserve invalid JSON drafts too; undo can recover the last valid map. */ }
}

function undoMapEditorAction() {
  if (savingMap.value) return;
  recordMapEditorHistory();
  const previous = mapActionUndo.value.pop();
  if (!previous) return;
  mapActionRedo.value.push(mapEditorSnapshot());
  restoreMapEditorSnapshot(previous);
  mapEditorMessage.value = "Đã hoàn tác thao tác gần nhất.";
}

function redoMapEditorAction() {
  if (savingMap.value) return;
  recordMapEditorHistory();
  const next = mapActionRedo.value.pop();
  if (!next) return;
  mapActionUndo.value.push(mapEditorSnapshot());
  restoreMapEditorSnapshot(next);
  mapEditorMessage.value = "Đã làm lại thao tác vừa hoàn tác.";
}

function canDragMapAnchor(point: MapEditorPoint) {
  return (
    mapEditorPlacementMode.value === "path" &&
    mapAnchorIndex(point, mapEditorLane.value) >= 0
  );
}

function startMapAnchorDrag(event: PointerEvent, point: MapEditorPoint) {
  if (!canDragMapAnchor(point)) {
    return;
  }
  event.preventDefault();
  draggedMapAnchor.value = {
    lane: mapEditorLane.value,
    index: mapAnchorIndex(point, mapEditorLane.value),
  };
  draggedMapAnchorTarget.value = { ...point };
  mapEditorDragPointerId = event.pointerId;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function mapEditorPointFromPointer(event: PointerEvent) {
  const grid = mapEditorGrid.value;
  if (!grid) return null;
  const matrix = grid.getScreenCTM();
  if (!matrix) return null;
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  const configuration = visualMapConfiguration.value;
  if (mapEditorPlacementMode.value === "buildable") {
    const pad = visualMapConfiguration.value?.buildableTiles?.find((point) => {
      const position = mapEditorDisplayPoint(point);
      const radius = 1.4 / (visualMapConfiguration.value?.cellSize ?? 2);
      return Math.hypot(position.x - x, position.y - y) <= radius;
    });
    if (pad) return { ...pad };
  }
  if (configuration?.scenePreset === "citadel-of-cinders") {
    const bridgePoint = pickCitadelBridgePoint(x, y, configuration, mapEditorPlacementMode.value === "buildable");
    if (bridgePoint) return bridgePoint;
  }
  const tile = mapEditorBridgeTiles.value.find((tile) =>
    x >= tile.x && x < tile.x + tile.width && y >= tile.y && y < tile.y + tile.height,
  );
  if (tile) return { ...tile.point };
  const pad = visualMapConfiguration.value?.buildableTiles?.find((point) => {
    const position = mapEditorDisplayPoint(point);
    return Math.hypot(position.x - x, position.y - y) < 0.5;
  });
  if (pad) return { ...pad };
  return {
    x: Math.max(
      0,
      Math.min(
        mapEditorColumns.value - 1,
        configuration?.scenePreset === "citadel-of-cinders" ? Math.round(x) : Math.floor(x),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        mapEditorRows.value - 1,
        configuration?.scenePreset === "citadel-of-cinders" ? Math.round(y) : Math.floor(y),
      ),
    ),
  };
}

function startMapEditorPointer(event: PointerEvent) {
  if (event.button !== 0) return;
  const point = mapEditorPointFromPointer(event);
  if (point) startMapAnchorDrag(event, point);
}

function selectMapEditorPointer(event: PointerEvent) {
  const point = mapEditorPointFromPointer(event);
  if (point) selectMapEditorCell(point);
}

function moveMapAnchorDrag(event: PointerEvent) {
  pendingMapEditorPointer = event;
  if (!mapEditorHoverFrame) {
    mapEditorHoverFrame = requestAnimationFrame(() => {
      mapEditorHoverFrame = 0;
      const latest = pendingMapEditorPointer;
      pendingMapEditorPointer = null;
      if (latest) updateMapEditorPointer(latest);
    });
  }
}

function clearMapEditorHover() {
  cancelAnimationFrame(mapEditorHoverFrame);
  mapEditorHoverFrame = 0;
  pendingMapEditorPointer = null;
  hoveredMapEditorPoint.value = null;
}

onBeforeUnmount(clearMapEditorHover);

function updateMapEditorPointer(event: PointerEvent) {
  if (!isMapEditorPanning.value && mapEditorPlacementMode.value === "buildable") {
    const point = mapEditorPointFromPointer(event);
    const previous = hoveredMapEditorPoint.value;
    if (point?.x !== previous?.x || point?.y !== previous?.y)
      hoveredMapEditorPoint.value = point;
  }
  if (
    !draggedMapAnchor.value ||
    event.pointerId !== mapEditorDragPointerId
  )
    return;
  const point = mapEditorPointFromPointer(event);
  if (point && !isConfiguredPoint(point, draggedMapAnchorTarget.value))
    draggedMapAnchorTarget.value = point;
}

function finishMapAnchorDrag(event: PointerEvent) {
  if (
    !draggedMapAnchor.value ||
    event.pointerId !== mapEditorDragPointerId
  )
    return;
  const point = mapEditorPointFromPointer(event);
  if (point) dropMapAnchor(point);
  else endMapAnchorDrag();
}

function dropMapAnchor(point: MapEditorPoint) {
  const dragged = draggedMapAnchor.value;
  if (!dragged) return;
  const anchors = mapEditorAnchors.value[dragged.lane];
  const currentAnchor = anchors[dragged.index];
  if (!currentAnchor) return;
  if (isConfiguredPoint(point, currentAnchor)) { endMapAnchorDrag(); return; }
  const spawnPoint = configuredSpawnPoint(dragged.lane);
  const destination = configuredCastlePoint();
  anchors[dragged.index] = { ...point };

  // Dù kéo cả điểm đầu/cuối, tuyến vẫn phải bắt đầu tại cổng spawn và kết
  // thúc ở cổng lâu đài. Điểm vừa kéo sẽ trở thành một góc trung gian.
  if (
    spawnPoint &&
    (anchors[0]?.x !== spawnPoint.x || anchors[0]?.y !== spawnPoint.y)
  )
    anchors.unshift({ ...spawnPoint });
  const lastAnchor = anchors.at(-1);
  if (
    destination &&
    (lastAnchor?.x !== destination.x || lastAnchor?.y !== destination.y)
  )
    anchors.push({ ...destination });

  // Tính lại toàn bộ lane từ spawn đến đích, lấp khoảng cách bằng các đoạn
  // ngang/dọc, bỏ vòng lặp/nhánh thừa rồi nén lại thành các điểm góc.
  mapEditorAnchors.value[dragged.lane] = compressPath(
    removeEditorPathLoops(expandEditorPath(anchors)),
  );
  mapEditorLane.value = dragged.lane;
  mapEditorMessage.value =
    `Đã di chuyển điểm góc và tính lại lane ${dragged.lane + 1} từ cổng spawn đến đích.`;
  ignoreMapEditorClickUntil = performance.now() + 250;
  draggedMapAnchor.value = null;
  draggedMapAnchorTarget.value = null;
  mapEditorDragPointerId = null;
  syncEditorPaths();
}

function endMapAnchorDrag() {
  draggedMapAnchor.value = null;
  draggedMapAnchorTarget.value = null;
  mapEditorDragPointerId = null;
}

function isMapAnchorDropTarget(point: MapEditorPoint) {
  return (
    draggedMapAnchorTarget.value?.x === point.x &&
    draggedMapAnchorTarget.value.y === point.y
  );
}




function handleMapEditorShortcut(event: KeyboardEvent) {
  if (!(mapDialog.value?.open || mapEditorPageReady.value) || mapMode.value === "delete" || savingMap.value
    || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable
    || target.closest('input, textarea, select, [role="textbox"]'))) return;
  const key = event.key.toLowerCase();
  if (key !== "z" && key !== "u") return;
  event.preventDefault();
  if (key === "z") undoMapEditorAction();
  else redoMapEditorAction();
}

function clearMapEditorLane() {
  if (!mapEditorAnchors.value[mapEditorLane.value].length) return;
  mapEditorAnchors.value[mapEditorLane.value] = [];
  mapEditorMessage.value = `Đã xóa lane ${mapEditorLane.value + 1}.`;
  syncEditorPaths();
}

function clearMapEditorBuildableTiles() {
  updateMapConfiguration((configuration) => {
    configuration.buildableTiles = [];
  });
  mapEditorMessage.value = "Đã xóa toàn bộ bệ đặt trụ.";
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
    delete configuration.buildableTiles;
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

function toggleBossOnly() {
  updateMapConfiguration((configuration) => {
    configuration.bossOnly = !configuration.bossOnly;
  });
}

function toggleEnvironmentMode() {
  updateMapConfiguration((configuration) => {
    configuration.environmentMode =
      configuration.environmentMode === "dark" ? "normal" : "dark";
  });
}

function configuredAssetKey(url?: string) {
  const prefix = "/api/tower-defense/assets/";
  return url?.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : "";
}

function selectSimpleAsset(
  field: "backgroundMusicUrl" | "backgroundModel",
  key: string,
) {
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

function selectCastleModel(key: string) {
  updateMapConfiguration((configuration) => {
    configuration.castle.modelUrl = key ? assetPath(key) : "";
  });
}

function updateCastleModelSize(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value) || value < 0.1 || value > 200) return;
  updateMapConfiguration((configuration) => {
    configuration.castle.maxSize = value;
  });
}

function managedEnemyDefinition(enemy: ManagedEnemy): ManagedEnemyDefinition {
  return {
      id: enemy.id,
      baseHealth: enemy.base_health,
      armor: enemy.armor ?? 0,
      magicResistance: enemy.magic_resistance ?? 0,
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
      armor: enemy.armor ?? 0,
      magicResistance: enemy.magic_resistance ?? 0,
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

watch(() => [mapForm.id, mapForm.name, mapForm.isActive, mapForm.configuration, selectedMapPreset.value], recordMapEditorHistory);

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

/** Loại hồ sơ đã xóa/tắt để form không gửi ID ẩn và bị backend từ chối. */
function normalizeMapEnemyRoster(configuration: MapEditorConfiguration) {
  let removedCount = 0;
  for (const kind of ["normal", "boss"] as const) {
    const available = enemyCatalog.value.filter(
      (enemy) => enemy.kind === kind && enemy.is_active,
    );
    if (!available.length) continue;
    const availableById = new Map(available.map((enemy) => [enemy.id, enemy]));
    const configuredIds = kind === "boss"
      ? configuration.bossDefinitionIds
      : configuration.enemyDefinitionIds;
    const legacyId = kind === "boss"
      ? configuration.bossDefinition?.id
      : configuration.enemyDefinition?.id;
    const requestedIds = configuredIds?.length
      ? configuredIds
      : legacyId
        ? [legacyId]
        : [];
    const validIds = [...new Set(requestedIds)].filter((id) =>
      availableById.has(id),
    );
    removedCount += requestedIds.length - validIds.length;
    if (!validIds.length) validIds.push(available[0]!.id);
    const selected = validIds.map((id) => availableById.get(id)!);
    const definitions = selected.map(managedEnemyDefinition);
    if (kind === "boss") {
      configuration.bossDefinitionIds = validIds;
      configuration.bossDefinitions = definitions;
    } else {
      configuration.enemyDefinitionIds = validIds;
      configuration.enemyDefinitions = definitions;
    }
    applyPrimaryManagedEnemy(configuration, kind, selected[0]!);
  }
  return removedCount;
}

async function openMapDialog(
  mode: "create" | "edit" | "delete",
  item: AdminTowerDefenseMap | null = null,
) {
  if (mode !== "delete" && !props.editorMode) {
    await navigateTo(mode === "create" ? "/admin/tower-defense/maps/create" : `/admin/tower-defense/maps/${encodeURIComponent(item!.id)}/edit`);
    return;
  }
  if (mode !== "delete" && !enemyCatalog.value.length) await loadEnemies();
  mapHistoryReady = false;
  mapActionUndo.value = []; mapActionRedo.value = [];
  mapMode.value = mode;
  selectedMapPreset.value = "";
  selectedMap.value = item;
  mapFormError.value = "";
  mapFieldErrors.value = {};
  mapEditorMessage.value = "";
  mapEditorZoom.value = 1;
  endMapEditorPan();
  // item đến từ ref nên configuration là Vue Proxy; structuredClone không thể
  // clone Proxy. Cấu hình map là tài liệu JSON, vì vậy chuyển về object thuần.
  const configuration = JSON.parse(JSON.stringify(
    item
      ? {
          ...item.configuration,
          startingCredits: item.configuration.startingCredits ?? 3000,
        }
      : defaultMapConfiguration(),
  )) as MapEditorConfiguration;
  const removedProfiles = mode === "delete"
    ? 0
    : normalizeMapEnemyRoster(configuration);
  Object.assign(mapForm, {
    id: item?.id ?? "",
    name: item?.name ?? "",
    isActive: item?.is_active ?? true,
    configuration: JSON.stringify(mode === "delete" ? configuration : expandSwampEditableArea(configuration), null, 2),
  });
  if (removedProfiles > 0)
    mapEditorMessage.value = `Đã loại ${removedProfiles} hồ sơ quái/boss không còn hoạt động khỏi cấu hình map.`;
  await nextTick();
  mapHistoryCurrent = mapEditorSnapshot();
  mapHistoryReady = mode !== "delete";
  if (!props.editorMode) mapDialog.value?.showModal();
  if (mode !== "delete") {
    void nextTick(() => {
      if (mapEditorViewport.value) {
        mapEditorViewport.value.scrollLeft = 0;
        mapEditorViewport.value.scrollTop = 0;
      }
      refreshMapPreview();
    });
  }
}

function closeMapDialog() {
  if (!savingMap.value) {
    if (props.editorMode) { void navigateTo("/admin/tower-defense/maps"); return; }
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
            is_active: mapForm.isActive,
          },
        },
      );
    }
    if (!props.editorMode) mapDialog.value?.close();
    renderedPreviewMap.value = null;
    mapPreviewDirty.value = false;
    if (props.editorMode) { await navigateTo("/admin/tower-defense/maps"); return; }
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

onMounted(async () => {
  window.addEventListener("keydown", handleMapEditorShortcut);
  if (!props.editorMode) {
    void Promise.all([loadMaps(), loadAssets(), loadEnemies()]);
    return;
  }
  try {
    await Promise.all([loadAssets(), loadEnemies()]);
    const item = props.editorMode === "edit"
      ? (await api<{ data: AdminTowerDefenseMap }>(`/api/admin/tower-defense/maps/${encodeURIComponent(props.mapId!)}`)).data
      : null;
    await openMapDialog(props.editorMode, item);
    mapEditorPageReady.value = true;
    await nextTick();
    refreshMapPreview();
  } catch (error: any) {
    pageError.value = error?.data?.message || error?.message || "Không thể tải map để chỉnh sửa.";
  } finally { loadingEditor.value = false; }
});
onBeforeUnmount(() => window.removeEventListener("keydown", handleMapEditorShortcut));
</script>

<template>
  <main class="td-admin-page">
    <header v-if="!props.editorMode" class="td-admin-header">
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

    <header v-else class="td-admin-header">
      <div><div class="td-admin-eyebrow"><MapPinned /> TOWER DEFENSE CMS</div><h1>{{ props.editorMode === 'create' ? 'Thêm map' : 'Chỉnh sửa map' }}</h1></div>
      <NuxtLink class="td-button is-ghost" to="/admin/tower-defense/maps"><ArrowLeft aria-hidden="true" />Về danh sách map</NuxtLink>
    </header>
    <section v-if="!props.editorMode" class="td-stats">
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
    <div v-if="loadingEditor" class="td-loading"><RefreshCw /> Đang tải trình chỉnh sửa map…</div>

    <section v-if="!props.editorMode" class="td-panel">
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

    <Teleport to="body" :disabled="Boolean(props.editorMode)">
      <component :is="props.editorMode ? 'section' : 'dialog'" v-if="!props.editorMode || mapEditorPageReady" ref="mapDialog" class="td-dialog is-wide" :class="{ 'td-map-editor-page': props.editorMode }" @cancel.prevent="closeMapDialog">
        <form @submit.prevent="submitMap">
          <header><div><small>MAP CONFIGURATION</small><h2>{{ mapMode === 'create' ? 'Thêm map' : mapMode === 'edit' ? 'Sửa map' : 'Xóa map?' }}</h2></div><button type="button" @click="closeMapDialog"><X /></button></header>
          <p v-if="mapMode === 'delete'" class="td-delete-copy">Map <strong>{{ selectedMap?.name }}</strong> sẽ bị xóa khỏi database và biến mất khỏi game. Asset liên quan không bị xóa.</p>
          <div v-else class="td-form-grid td-map-form">
            <section v-if="mapMode === 'create'" class="td-map-preset-import is-full">
              <div>
                <strong>Chọn map mẫu</strong>
                <small>Chọn map để nạp cấu hình và chỉnh sửa trực tiếp trên LIVE PREVIEW.</small>
              </div>
              <label class="td-map-preset-select"><span>Map mẫu</span>
                <select :value="selectedMapPreset" @change="selectMapPreset">
                  <option value="" disabled>— Chọn map —</option>
                  <option v-for="preset in mapPresets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
                </select>
              </label>
            </section>
            <label><span>ID map</span><input v-model="mapForm.id" :disabled="mapMode === 'edit'" required pattern="[a-z0-9-]+" placeholder="dark-forest" /><small v-if="mapFieldErrors.id">{{ mapFieldErrors.id[0] }}</small></label>
            <label><span>Tên hiển thị</span><input v-model="mapForm.name" required placeholder="Khu rừng Bóng tối" /><small v-if="mapFieldErrors.name">{{ mapFieldErrors.name[0] }}</small></label>
            <label class="td-checkbox"><input v-model="mapForm.isActive" type="checkbox" /><span>Cho phép người chơi chọn map này</span></label>
            <section v-if="visualMapConfiguration" class="td-content-editor is-full">
              <header>
                <div><strong>Nội dung riêng của map</strong><small>Chọn trực tiếp từ tài nguyên backend.</small></div>
              </header>
              <div class="td-content-grid">
                <fieldset>
                  <legend>Công trình và không gian</legend>
                  <label><span>Model lâu đài</span><AdminAssetPicker :model-value="configuredAssetKey(visualMapConfiguration.castle?.modelUrl)" :assets="selectableCastleAssets" placeholder="Không dùng model lâu đài" clear-label="Không dùng model lâu đài" @update:model-value="selectCastleModel" /><small v-if="!visualMapConfiguration.castle?.modelUrl">Dùng lâu đài mặc định của cảnh; áp dụng ngay trên LIVE PREVIEW và khi lưu map.</small></label>
                  <label v-if="visualMapConfiguration.castle?.modelUrl"><span>Kích thước model lâu đài</span><input :value="visualMapConfiguration.castle.maxSize" type="number" min="0.1" max="200" step="0.1" required @change="updateCastleModelSize" /><small>Đơn vị trong cảnh 3D; tăng để phóng to. Model giữ nguyên tỉ lệ và cập nhật trên LIVE PREVIEW.</small><small v-if="mapFieldErrors['configuration.castle.maxSize']">{{ mapFieldErrors['configuration.castle.maxSize'][0] }}</small></label>
                  <label><span>Model nền 3D</span><AdminAssetPicker :model-value="configuredAssetKey(visualMapConfiguration.backgroundModel?.url)" :assets="selectableMapModelAssets" placeholder="Chọn model nền…" clear-label="Không dùng model nền" @update:model-value="selectSimpleAsset('backgroundModel', $event)" /></label>
                  <label><span>Nhạc nền</span><AdminAssetPicker :model-value="configuredAssetKey(visualMapConfiguration.backgroundMusicUrl)" :assets="selectableMusicAssets" placeholder="Chọn nhạc nền…" clear-label="Không phát nhạc" @update:model-value="selectSimpleAsset('backgroundMusicUrl', $event)" /></label>
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
                  <button
                    type="button"
                    class="td-boss-only-toggle"
                    :class="{ 'is-active': visualMapConfiguration.bossOnly }"
                    :aria-pressed="Boolean(visualMapConfiguration.bossOnly)"
                    @click="toggleBossOnly"
                  >
                    <Crown />
                    <span><strong>Chỉ spawn boss</strong><small>{{ visualMapConfiguration.bossOnly ? 'Đang bật · áp dụng ở mọi wave' : 'Đang tắt · boss xuất hiện mỗi 5 wave' }}</small></span>
                    <i>{{ visualMapConfiguration.bossOnly ? 'BẬT' : 'TẮT' }}</i>
                  </button>
                  <div class="td-roster-options"><label v-for="enemy in selectableBosses" :key="enemy.id" class="td-roster-option is-boss" :class="{ 'is-selected': isManagedEnemySelected('boss', enemy.id) }"><input type="checkbox" :checked="isManagedEnemySelected('boss', enemy.id)" @change="toggleManagedEnemy('boss', enemy, $event)" /><img v-if="enemy.avatar_asset_key" :src="assetPath(enemy.avatar_asset_key)" alt="" /><Crown v-else /><span><strong>{{ enemy.name }}</strong><code>{{ enemy.id }}</code><small>HP {{ enemy.base_health }} · Mất {{ enemy.castle_damage }} máu</small></span></label></div>
                  <NuxtLink class="td-manage-enemy-link" to="/admin/tower-defense/enemies">Quản lý hồ sơ boss →</NuxtLink>
                </fieldset>
              </div>
            </section>

            <section v-if="visualMapConfiguration" class="td-map-settings is-full">
              <header><div><strong>Thông số map và gameplay</strong><small>Các giá trị này được áp dụng trực tiếp khi người chơi mở map.</small></div></header>
              <div>
                <label><span>Số cột</span><input :value="visualMapConfiguration.columns" type="number" :min="minimumMapColumns" max="100" step="1" required @change="updateMapNumber('columns', $event)" /><small v-if="mapFieldErrors['configuration.columns']">{{ mapFieldErrors['configuration.columns'][0] }}</small></label>
                <label><span>Số hàng</span><input :value="visualMapConfiguration.rows" type="number" :min="minimumMapRows" max="100" step="1" required @change="updateMapNumber('rows', $event)" /><small v-if="mapFieldErrors['configuration.rows']">{{ mapFieldErrors['configuration.rows'][0] }}</small></label>
                <label><span>Số trụ tối đa</span><input :value="visualMapConfiguration.maxTowerCount" type="number" min="1" max="1000" step="1" required @change="updateMapNumber('maxTowerCount', $event)" /><small v-if="mapFieldErrors['configuration.maxTowerCount']">{{ mapFieldErrors['configuration.maxTowerCount'][0] }}</small></label>
                <label><span>Vàng khởi đầu</span><input :value="visualMapConfiguration.startingCredits ?? 3000" type="number" min="0" max="10000000" step="1" required @change="updateMapNumber('startingCredits', $event)" /><small v-if="mapFieldErrors['configuration.startingCredits']">{{ mapFieldErrors['configuration.startingCredits'][0] }}</small></label>
                <button
                  type="button"
                  class="td-environment-toggle"
                  :class="{ 'is-dark': visualMapConfiguration.environmentMode === 'dark' }"
                  :aria-pressed="visualMapConfiguration.environmentMode === 'dark'"
                  @click="toggleEnvironmentMode"
                >
                  <Moon v-if="visualMapConfiguration.environmentMode === 'dark'" aria-hidden="true" /><Sun v-else aria-hidden="true" />
                  <span><strong>Không khí map</strong><small>{{ visualMapConfiguration.environmentMode === 'dark' ? 'U tối' : 'Bình thường' }}</small></span>
                  <i>{{ visualMapConfiguration.environmentMode === 'dark' ? 'U TỐI' : 'THƯỜNG' }}</i>
                </button>
              </div>
            </section>

            <section class="td-live-editor is-full">
              <p v-if="!visualMapConfiguration" class="td-live-invalid">JSON chưa hợp lệ nên không thể dựng bản xem trước.</p>

              <div
                v-if="renderedPreviewMap"
                class="td-map-preview td-live-editor-preview"
              >
                <header>
                  <div>
                    <small>LIVE PREVIEW · MAP ĐANG CHỈNH</small>
                    <strong>Bố cục thật trong game</strong>
                    <p>Chọn công cụ rồi nhấn trực tiếp trên cảnh 3D để chỉnh. Thay đổi được đồng bộ vào JSON; nhấn lưu để ghi DB.</p>
                  </div>
                  <div class="td-map-preview-actions">
                    <span v-if="mapPreviewDirty">Có thay đổi chưa hiển thị</span>
                    <button type="button" :disabled="!previewMap" @click="refreshMapPreview">
                      <RefreshCw /> {{ mapPreviewDirty ? 'Cập nhật preview' : 'Dựng lại preview' }}
                    </button>
                  </div>
                </header>
                <ClientOnly>
                  <LiveMapEditor
                    :map="renderedPreviewMap"
                    v-model:tool="mapEditorPlacementMode"
                    v-model:lane="mapEditorLane"
                    :anchors="mapEditorAnchors"
                    :can-undo="mapActionUndo.length > 0"
                    :can-redo="mapActionRedo.length > 0"
                    @select="selectMapEditorCell"
                    @move-anchor="movePreviewMapAnchor"
                    @move-castle="movePreviewCastle"
                    @undo="undoMapEditorAction"
                    @redo="redoMapEditorAction"
                    @clear-lane="clearMapEditorLane"
                    @clear-pads="clearMapEditorBuildableTiles"
                    @reset-layout="resetMapEditorLayout"
                  />
                  <p v-if="mapEditorMessage" role="status" class="td-pad-placement-hint">{{ mapEditorMessage }}</p>
                  <template #fallback>
                    <div class="td-map-preview-fallback">Đang khởi tạo trình xem 3D…</div>
                  </template>
                </ClientOnly>
              </div>
            </section>

            <details class="td-json-editor is-full">
              <summary>JSON nâng cao</summary>
              <label><span>Configuration JSON</span><textarea v-model="mapForm.configuration" rows="18" spellcheck="false" /><small v-if="mapFieldErrors.configuration">{{ mapFieldErrors.configuration[0] }}</small></label>
            </details>
          </div>
          <p v-if="mapFormError" class="td-form-error">{{ mapFormError }}</p>
          <footer><button class="td-button is-ghost" type="button" @click="closeMapDialog"><X aria-hidden="true" />Hủy</button><button class="td-button" :class="mapMode === 'delete' ? 'is-danger' : 'is-primary'" type="submit" :disabled="savingMap"><Trash2 v-if="mapMode === 'delete'" aria-hidden="true" /><Save v-else aria-hidden="true" />{{ savingMap ? 'Đang xử lý…' : mapMode === 'delete' ? 'Xóa map' : 'Lưu cấu hình' }}</button></footer>
        </form>
      </component>

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
<style scoped>
.td-environment-toggle :deep(svg) { width:18px; height:18px; flex-shrink:0; }
.td-dialog.td-map-editor-page {
  display: block;
  position: static;
  width: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  overflow: visible;
}
.td-map-editor-page > form {
  max-height: none;
}
.td-map-editor-page > form > .td-form-grid {
  overflow: visible;
}
</style>
