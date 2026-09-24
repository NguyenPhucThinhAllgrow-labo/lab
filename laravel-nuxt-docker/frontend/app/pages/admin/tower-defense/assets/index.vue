<script setup lang="ts">
import {
  Box,
  Check,
  Copy,
  ExternalLink,
  FileAudio,
  FileBox,
  FileImage,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-vue-next";

type AssetType = "model" | "sound" | "image";
type AssetPurpose =
  | "enemy-model" | "boss-model" | "castle-model" | "map-model"
  | "tower-model" | "equipment-model" | "animation" | "texture"
  | "enemy-avatar" | "boss-avatar" | "tower-image" | "map-image"
  | "ui-image" | "background-music" | "tower-sfx" | "other";

const ASSET_PURPOSE_OPTIONS: Record<AssetType, { value: AssetPurpose; label: string }[]> = {
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

interface Asset {
  id: number;
  key: string;
  type: AssetType;
  purpose: AssetPurpose;
  mimeType: string | null;
  size: number;
  isActive: boolean;
}

interface AssetResponse {
  data: Asset[];
  current_page: number;
  last_page: number;
  total: number;
}

useHead({ title: "Tài nguyên | Tower Defense Admin" });

const api = useApi();
const assets = ref<Asset[]>([]);
const loading = ref(true);
const page = ref(1);
const lastPage = ref(1);
const total = ref(0);
const pageError = ref("");
const search = ref("");
const type = ref<"" | AssetType>("");
const purpose = ref<"" | AssetPurpose>("");
const copiedKey = ref("");
const dialog = ref<HTMLDialogElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const formError = ref("");
const fieldErrors = ref<Record<string, string[]>>({});
const form = reactive({ key: "", type: "model" as AssetType, purpose: "enemy-model" as AssetPurpose, file: null as File | null });
let filterTimer: ReturnType<typeof setTimeout> | undefined;

const purposeOptions = computed(() => ASSET_PURPOSE_OPTIONS[type.value || "model"]);
const uploadPurposeOptions = computed(() => ASSET_PURPOSE_OPTIONS[form.type]);
const totalSize = computed(() => assets.value.reduce((sum, asset) => sum + asset.size, 0));

watch(type, () => {
  if (purpose.value && !ASSET_PURPOSE_OPTIONS[type.value || "model"].some(option => option.value === purpose.value)) purpose.value = "";
});
watch(() => form.type, () => {
  form.purpose = ASSET_PURPOSE_OPTIONS[form.type][0]?.value ?? "other";
});
watch([search, type, purpose], () => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => void loadAssets(1), 250);
});
onBeforeUnmount(() => clearTimeout(filterTimer));

async function loadAssets(nextPage = page.value) {
  loading.value = true;
  pageError.value = "";
  const params = new URLSearchParams({ per_page: "20", page: String(nextPage) });
  if (search.value.trim()) params.set("search", search.value.trim());
  if (type.value) params.set("type", type.value);
  if (purpose.value) params.set("purpose", purpose.value);
  try {
    const response = await api<AssetResponse>(`/api/admin/tower-defense/assets?${params}`);
    assets.value = response.data;
    page.value = response.current_page;
    lastPage.value = response.last_page;
    total.value = response.total;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể tải danh sách tài nguyên.";
  } finally {
    loading.value = false;
  }
}

function openDialog() {
  Object.assign(form, { key: "", type: "model", purpose: "enemy-model", file: null });
  formError.value = "";
  fieldErrors.value = {};
  if (fileInput.value) fileInput.value.value = "";
  dialog.value?.showModal();
}

function selectFile(event: Event) {
  form.file = (event.target as HTMLInputElement).files?.[0] ?? null;
}

async function uploadAsset() {
  if (uploading.value || !form.file) return;
  uploading.value = true;
  formError.value = "";
  fieldErrors.value = {};
  const body = new FormData();
  body.append("key", form.key.trim());
  body.append("type", form.type);
  body.append("purpose", form.purpose);
  body.append("file", form.file);
  try {
    await api("/api/admin/tower-defense/assets", { method: "POST", body });
    dialog.value?.close();
    await loadAssets(1);
  } catch (error: any) {
    formError.value = error?.data?.message || "Không thể tải tài nguyên lên backend.";
    fieldErrors.value = error?.data?.errors || {};
  } finally {
    uploading.value = false;
  }
}

function assetPath(key: string) {
  return `/api/tower-defense/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function copyAssetUrl(item: Asset) {
  await navigator.clipboard.writeText(new URL(assetPath(item.key), window.location.origin).href);
  copiedKey.value = item.key;
  window.setTimeout(() => { if (copiedKey.value === item.key) copiedKey.value = ""; }, 1600);
}

async function updatePurpose(item: Asset, event: Event) {
  const select = event.target as HTMLSelectElement;
  const nextPurpose = select.value as AssetPurpose;
  try {
    await api(`/api/admin/tower-defense/assets/${item.key}`, { method: "PUT", body: { purpose: nextPurpose } });
    item.purpose = nextPurpose;
  } catch (error: any) {
    select.value = item.purpose;
    pageError.value = error?.data?.message || "Không thể cập nhật mục đích tài nguyên.";
  }
}

async function deleteAsset(item: Asset) {
  if (!window.confirm(`Xóa tài nguyên “${item.key}”? File thật cũng sẽ bị xóa.`)) return;
  try {
    await api(`/api/admin/tower-defense/assets/${item.key}`, { method: "DELETE" });
    await loadAssets(assets.value.length === 1 && page.value > 1 ? page.value - 1 : page.value);
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể xóa tài nguyên.";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index++) { value /= 1024; unit = units[index]; }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

const assetIcon = (assetType: AssetType) => ({ model: FileBox, sound: FileAudio, image: FileImage })[assetType];
onMounted(() => loadAssets());
</script>

<template>
  <main class="td-admin-page">
    <header class="td-admin-header">
      <div><div class="td-admin-eyebrow"><Box /> TOWER DEFENSE CMS</div><h1>Kho tài nguyên</h1><p>Quản lý model, âm thanh và hình ảnh được lưu trong backend.</p></div>
      <div class="td-row-actions"><button class="td-button is-ghost" type="button" :disabled="loading" @click="loadAssets()"><RefreshCw :class="{ 'is-spinning': loading }" /> Làm mới</button><button class="td-button is-primary" type="button" @click="openDialog"><Upload /> Upload</button></div>
    </header>

    <section class="td-stats">
      <article><span><Box /></span><div><strong>{{ total }}</strong><small>Tổng tài nguyên</small></div></article>
      <article><span><FileBox /></span><div><strong>{{ formatBytes(totalSize) }}</strong><small>Dung lượng trang này</small></div></article>
    </section>
    <p v-if="pageError" class="td-alert">{{ pageError }}</p>

    <section class="td-panel">
      <header class="td-panel-header"><div><h2>Danh sách tài nguyên</h2><p>Tìm kiếm, phân loại và cập nhật mục đích sử dụng.</p></div></header>
      <div class="td-filters">
        <label><Search /><input v-model="search" type="search" placeholder="Tìm theo đường dẫn…" /></label>
        <select v-model="type"><option value="">Tất cả loại</option><option value="model">Model</option><option value="sound">Âm thanh</option><option value="image">Hình ảnh</option></select>
        <select v-model="purpose"><option value="">Tất cả mục đích</option><option v-for="option in purposeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select>
        <span>{{ total }} kết quả</span>
      </div>
      <div v-if="loading" class="td-loading"><RefreshCw /> Đang tải tài nguyên…</div>
      <div v-else class="td-table-wrap"><table><thead><tr><th>Tài nguyên</th><th>Loại</th><th>Mục đích</th><th>MIME</th><th>Dung lượng</th><th></th></tr></thead><tbody>
        <tr v-for="item in assets" :key="item.id"><td><div class="td-asset-name"><span class="td-asset-preview"><img v-if="item.type === 'image'" :src="assetPath(item.key)" alt="" /><component :is="assetIcon(item.type)" v-else /></span><code :title="item.key">{{ item.key }}</code></div></td><td><span class="td-type" :class="`is-${item.type}`">{{ item.type }}</span></td><td><select class="td-purpose-select" :value="item.purpose" @change="updatePurpose(item, $event)"><option v-for="option in ASSET_PURPOSE_OPTIONS[item.type]" :key="option.value" :value="option.value">{{ option.label }}</option></select></td><td>{{ item.mimeType || '—' }}</td><td>{{ formatBytes(item.size) }}</td><td><div class="td-row-actions"><a class="td-icon-button" :href="assetPath(item.key)" target="_blank" title="Mở"><ExternalLink /></a><button class="td-icon-button" type="button" title="Sao chép URL" @click="copyAssetUrl(item)"><Check v-if="copiedKey === item.key" /><Copy v-else /></button><button class="td-icon-button is-danger" type="button" title="Xóa" @click="deleteAsset(item)"><Trash2 /></button></div></td></tr>
        <tr v-if="assets.length === 0"><td colspan="6" class="td-empty">Không tìm thấy tài nguyên.</td></tr>
      </tbody></table></div>
      <AdminPagination :page="page" :last-page="lastPage" :total="total" :loading="loading" item-label="tài nguyên" @change="loadAssets" />
    </section>

    <Teleport to="body"><dialog ref="dialog" class="td-dialog is-small" @cancel.prevent="!uploading && dialog?.close()"><form method="dialog" @submit.prevent="uploadAsset"><header><div><small>ASSET STORAGE</small><h2>Upload tài nguyên</h2></div><button type="button" @click="dialog?.close()"><X /></button></header><div class="td-form-grid is-single"><label><span>Loại tài nguyên</span><select v-model="form.type"><option value="model">Model</option><option value="sound">Âm thanh</option><option value="image">Hình ảnh</option></select></label><label><span>Mục đích sử dụng</span><select v-model="form.purpose"><option v-for="option in uploadPurposeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><small v-if="fieldErrors.purpose">{{ fieldErrors.purpose[0] }}</small></label><label><span>Key / đường dẫn lưu</span><input v-model="form.key" required placeholder="models/games/tower-defense/.../model.glb" /><small v-if="fieldErrors.key">{{ fieldErrors.key[0] }}</small></label><label><span>File</span><input ref="fileInput" type="file" required @change="selectFile" /><small v-if="form.file">{{ form.file.name }} · {{ formatBytes(form.file.size) }}</small><small v-if="fieldErrors.file">{{ fieldErrors.file[0] }}</small></label></div><p v-if="formError" class="td-form-error">{{ formError }}</p><footer><button class="td-button is-ghost" type="button" @click="dialog?.close()">Hủy</button><button class="td-button is-primary" type="submit" :disabled="uploading || !form.file"><Upload /> {{ uploading ? 'Đang upload…' : 'Upload' }}</button></footer></form></dialog></Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense.css"></style>
