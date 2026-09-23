<script setup lang="ts">
import {
  Box,
  Check,
  Copy,
  Database,
  ExternalLink,
  FileAudio,
  FileBox,
  FileImage,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-vue-next";

type AssetType = "model" | "sound" | "image";

interface AdminTowerDefenseMap {
  id: string;
  name: string;
  configuration: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  updated_at: string | null;
}

interface AdminTowerDefenseAsset {
  id: number;
  key: string;
  type: AssetType;
  url: string;
  mimeType: string | null;
  size: number;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  updatedAt: string | null;
}

interface MapListResponse {
  data: AdminTowerDefenseMap[];
}

interface AssetListResponse {
  data: AdminTowerDefenseAsset[];
}

useHead({ title: "Tower Defense | Admin" });

const api = useApi();
const activeTab = ref<"maps" | "assets">("maps");
const maps = ref<AdminTowerDefenseMap[]>([]);
const assets = ref<AdminTowerDefenseAsset[]>([]);
const loadingMaps = ref(true);
const loadingAssets = ref(true);
const pageError = ref("");
const assetSearch = ref("");
const assetType = ref<"" | AssetType>("");
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
  paths: [MapEditorPoint[], MapEditorPoint[]];
  pathTiles: MapEditorPoint[];
  theme?: {
    terrain?: number;
    gridLine?: number;
    routeColors?: [number, number];
  };
}
const mapEditorLane = ref<0 | 1>(0);
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

const assetDialog = ref<HTMLDialogElement | null>(null);
const assetFileInput = ref<HTMLInputElement | null>(null);
const uploadingAsset = ref(false);
const assetFormError = ref("");
const assetFieldErrors = ref<Record<string, string[]>>({});
const assetForm = reactive({
  key: "",
  type: "model" as AssetType,
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
      (!query || item.key.toLocaleLowerCase("vi").includes(query)),
  );
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
    cellSize: 1.5,
    paths,
    pathTiles: paths.flat(),
    cornerRadius: 0.34,
    castle: {
      modelUrl:
        "/api/tower-defense/assets/models/games/tower-defense/castle.glb",
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

async function loadMaps() {
  loadingMaps.value = true;
  pageError.value = "";
  try {
    const response = await api<MapListResponse>(
      "/api/admin/tower-defense/maps",
    );
    maps.value = response.data;
  } catch (error: any) {
    pageError.value =
      error?.data?.message || "Không thể tải danh sách map Tower Defense.";
  } finally {
    loadingMaps.value = false;
  }
}

async function loadAssets() {
  loadingAssets.value = true;
  pageError.value = "";
  try {
    const response = await api<AssetListResponse>(
      "/api/admin/tower-defense/assets",
    );
    assets.value = response.data;
  } catch (error: any) {
    pageError.value =
      error?.data?.message || "Không thể tải danh sách tài nguyên.";
  } finally {
    loadingAssets.value = false;
  }
}

function refreshAll() {
  void Promise.all([loadMaps(), loadAssets()]);
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
      item?.configuration ?? defaultMapConfiguration(),
      null,
      2,
    ),
  });
  mapDialog.value?.showModal();
}

function closeMapDialog() {
  if (!savingMap.value) mapDialog.value?.close();
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
  Object.assign(assetForm, { key: "", type: "model", file: null });
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
  void Promise.all([loadMaps(), loadAssets()]);
});
</script>

<template>
  <main class="td-admin-page">
    <header class="td-admin-header">
      <div>
        <div class="td-admin-eyebrow"><MapPinned /> TOWER DEFENSE CMS</div>
        <h1>Map và tài nguyên</h1>
        <p>Quản lý cấu hình gameplay và asset được phục vụ từ Laravel.</p>
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
        <div><strong>{{ maps.length }}</strong><small>Tổng số map</small></div>
      </article>
      <article>
        <span><Database /></span>
        <div><strong>{{ activeMapCount }}</strong><small>Map đang bật</small></div>
      </article>
      <article>
        <span><Box /></span>
        <div><strong>{{ assets.length }}</strong><small>Tài nguyên</small></div>
      </article>
      <article>
        <span><FileBox /></span>
        <div><strong>{{ formatBytes(totalAssetSize) }}</strong><small>Dung lượng</small></div>
      </article>
    </section>

    <p v-if="pageError" class="td-alert">{{ pageError }}</p>

    <nav class="td-tabs" aria-label="Nội dung Tower Defense">
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'maps' }"
        @click="activeTab = 'maps'"
      ><MapPinned /> Map <span>{{ maps.length }}</span></button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'assets' }"
        @click="activeTab = 'assets'"
      ><Box /> Tài nguyên <span>{{ assets.length }}</span></button>
    </nav>

    <section v-if="activeTab === 'maps'" class="td-panel">
      <header class="td-panel-header">
        <div><h2>Cấu hình map</h2><p>Dữ liệu JSON đang được game tải trực tiếp từ database.</p></div>
        <button class="td-button is-primary" type="button" @click="openMapDialog('create')">
          <Plus /> Thêm map
        </button>
      </header>

      <div v-if="loadingMaps" class="td-loading"><RefreshCw /> Đang tải map…</div>
      <div v-else class="td-table-wrap">
        <table>
          <thead><tr><th>Map</th><th>Kích thước</th><th>Giới hạn trụ</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in maps" :key="item.id">
              <td><div class="td-map-name"><span><MapPinned /></span><div><strong>{{ item.name }}</strong><code>{{ item.id }}</code></div></div></td>
              <td>{{ item.configuration.columns }} × {{ item.configuration.rows }}</td>
              <td>{{ item.configuration.maxTowerCount }}</td>
              <td>#{{ item.sort_order }}</td>
              <td>
                <button class="td-status" :class="{ 'is-active': item.is_active }" type="button" @click="toggleMap(item)">
                  <i /> {{ item.is_active ? "Đang bật" : "Đã tắt" }}
                </button>
              </td>
              <td><div class="td-row-actions">
                <NuxtLink class="td-icon-button" :to="`/games/tower-defense?map=${item.id}`" target="_blank" title="Mở map"><ExternalLink /></NuxtLink>
                <button class="td-icon-button" type="button" title="Sửa" @click="openMapDialog('edit', item)"><Pencil /></button>
                <button class="td-icon-button is-danger" type="button" title="Xóa" @click="openMapDialog('delete', item)"><Trash2 /></button>
              </div></td>
            </tr>
            <tr v-if="maps.length === 0"><td colspan="6" class="td-empty">Database chưa có map.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="td-panel">
      <header class="td-panel-header">
        <div><h2>Kho tài nguyên</h2><p>Model, âm thanh và hình ảnh trong backend storage.</p></div>
        <button class="td-button is-primary" type="button" @click="openAssetDialog"><Upload /> Upload</button>
      </header>

      <div class="td-filters">
        <label><Search /><input v-model="assetSearch" type="search" placeholder="Tìm theo đường dẫn…" /></label>
        <select v-model="assetType"><option value="">Tất cả loại</option><option value="model">Model</option><option value="sound">Âm thanh</option><option value="image">Hình ảnh</option></select>
        <span>{{ filteredAssets.length }} kết quả</span>
      </div>

      <div v-if="loadingAssets" class="td-loading"><RefreshCw /> Đang tải tài nguyên…</div>
      <div v-else class="td-table-wrap">
        <table>
          <thead><tr><th>Tài nguyên</th><th>Loại</th><th>MIME</th><th>Dung lượng</th><th></th></tr></thead>
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
              <td>{{ item.mimeType || "—" }}</td>
              <td>{{ formatBytes(item.size) }}</td>
              <td><div class="td-row-actions">
                <a class="td-icon-button" :href="assetPath(item.key)" target="_blank" title="Mở"><ExternalLink /></a>
                <button class="td-icon-button" type="button" title="Sao chép URL" @click="copyAssetUrl(item)"><Check v-if="copiedKey === item.key" /><Copy v-else /></button>
                <button class="td-icon-button is-danger" type="button" title="Xóa" @click="deleteAsset(item)"><Trash2 /></button>
              </div></td>
            </tr>
            <tr v-if="filteredAssets.length === 0"><td colspan="5" class="td-empty">Không tìm thấy tài nguyên.</td></tr>
          </tbody>
        </table>
      </div>
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
            <section class="td-live-editor is-full">
              <header>
                <div>
                  <strong>Trình dựng đường đi trực tiếp</strong>
                  <small>Chọn lane rồi click các điểm cùng hàng hoặc cột. JSON được sinh tự động.</small>
                </div>
                <div class="td-lane-switcher">
                  <button type="button" :class="{ 'is-active': mapEditorLane === 0 }" @click="mapEditorLane = 0">Lane 1</button>
                  <button type="button" :class="{ 'is-active': mapEditorLane === 1 }" @click="mapEditorLane = 1">Lane 2</button>
                </div>
              </header>

              <div v-if="visualMapConfiguration" class="td-live-stage">
                <div
                  class="td-live-grid"
                  :style="{
                    '--map-columns': mapEditorColumns,
                    '--map-terrain': colorNumber(visualMapConfiguration.theme?.terrain, '#1b211e'),
                    '--map-grid': colorNumber(visualMapConfiguration.theme?.gridLine, '#303832'),
                    '--lane-one': colorNumber(visualMapConfiguration.theme?.routeColors?.[0], '#f1c96a'),
                    '--lane-two': colorNumber(visualMapConfiguration.theme?.routeColors?.[1], '#ff8b76'),
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
                    }"
                    @click="selectMapEditorCell(point)"
                  ><span>{{ isEditorAnchor(point, 0) || isEditorAnchor(point, 1) ? '◆' : '' }}</span></button>
                </div>
                <aside>
                  <div class="td-live-legend"><span class="is-one" /> Lane 1 <span class="is-two" /> Lane 2</div>
                  <dl>
                    <div><dt>Kích thước</dt><dd>{{ visualMapConfiguration.columns }} × {{ visualMapConfiguration.rows }}</dd></div>
                    <div><dt>Lane 1</dt><dd>{{ visualMapConfiguration.paths[0]?.length ?? 0 }} ô</dd></div>
                    <div><dt>Lane 2</dt><dd>{{ visualMapConfiguration.paths[1]?.length ?? 0 }} ô</dd></div>
                  </dl>
                  <button class="td-editor-action" type="button" :disabled="mapEditorAnchors[mapEditorLane].length === 0" @click="undoMapEditorLane"><Undo2 /> Hoàn tác điểm</button>
                  <button class="td-editor-action is-danger" type="button" :disabled="mapEditorAnchors[mapEditorLane].length === 0" @click="clearMapEditorLane"><Trash2 /> Xóa lane {{ mapEditorLane + 1 }}</button>
                </aside>
              </div>
              <p v-else class="td-live-invalid">JSON chưa hợp lệ nên không thể dựng bản xem trước.</p>
              <p v-if="mapEditorMessage" class="td-editor-message">{{ mapEditorMessage }}</p>
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
