<script setup lang="ts">
import { Box, Castle, Gauge, Pencil, Plus, RefreshCw, Save, Search, Sparkles, Trash2, X } from "lucide-vue-next";

interface Asset { id: number; key: string; type: string; purpose: string }
interface Tower {
  id: string; name: string; description: string | null; cost: number; damage: number;
  range: number; fire_rate: number; color: string; effects: Record<string, number>;
  model_asset_keys: Record<string, string>; model_configuration: { targetHeight: number };
  sort_order: number; is_active: boolean;
}

const api = useApi();
const towers = ref<Tower[]>([]);
const assets = ref<Asset[]>([]);
const loading = ref(true);
const saving = ref(false);
const pageError = ref("");
const formError = ref("");
const fieldErrors = ref<Record<string, string[]>>({});
const search = ref("");
const dialog = ref<HTMLDialogElement | null>(null);
const editingId = ref<string | null>(null);
const towerKindOptions = [
  ["archer", "Tháp cung"], ["cannon", "Tháp pháo"], ["frost", "Tháp băng"],
  ["fire", "Tháp lửa"], ["thunder", "Tháp sét"], ["water", "Tháp nước"],
  ["speed", "Trụ tốc độ"], ["damage", "Trụ sát thương"],
] as const;

const blankForm = () => ({
  id: "", name: "", description: "", cost: 100, damage: 10, range: 3,
  fireRate: 1, color: "#64748b", targetHeight: 2, sortOrder: 0, isActive: true,
  slow: 0, slowDuration: 0, burnDuration: 0, burnDamagePerSecond: 0,
  splashRadius: 0, splashDamageRatio: 0,
  dark1: "", dark2: "", dark3: "", human1: "", human2: "", human3: "",
});
const form = reactive(blankForm());
const modelAssets = computed(() => assets.value.filter(asset => asset.type === "model" && asset.purpose === "tower-model"));
const filteredTowers = computed(() => {
  const term = search.value.trim().toLocaleLowerCase("vi");
  return term ? towers.value.filter(tower => `${tower.id} ${tower.name} ${tower.description ?? ""}`.toLocaleLowerCase("vi").includes(term)) : towers.value;
});
const modelCount = (tower: Tower) => Object.values(tower.model_asset_keys ?? {}).filter(Boolean).length;

function openCreate() {
  editingId.value = null;
  Object.assign(form, blankForm());
  formError.value = ""; fieldErrors.value = {};
  dialog.value?.showModal();
}
function openEdit(tower: Tower) {
  editingId.value = tower.id;
  Object.assign(form, blankForm(), {
    id: tower.id, name: tower.name, description: tower.description ?? "", cost: tower.cost,
    damage: tower.damage, range: tower.range, fireRate: tower.fire_rate, color: tower.color,
    targetHeight: tower.model_configuration?.targetHeight ?? 2, sortOrder: tower.sort_order,
    isActive: tower.is_active, ...tower.effects,
    dark1: tower.model_asset_keys?.dark1 ?? "", dark2: tower.model_asset_keys?.dark2 ?? "",
    dark3: tower.model_asset_keys?.dark3 ?? "", human1: tower.model_asset_keys?.human1 ?? "",
    human2: tower.model_asset_keys?.human2 ?? "", human3: tower.model_asset_keys?.human3 ?? "",
  });
  formError.value = ""; fieldErrors.value = {};
  dialog.value?.showModal();
}
function compactNumbers(values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => Number(value) > 0));
}
async function loadData() {
  loading.value = true; pageError.value = "";
  try {
    const [towerResponse, assetResponse] = await Promise.all([
      api<{ data: Tower[] }>("/api/admin/tower-defense/towers"),
      api<{ data: Asset[] }>("/api/admin/tower-defense/assets"),
    ]);
    towers.value = towerResponse.data; assets.value = assetResponse.data;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể tải danh sách tower.";
  } finally { loading.value = false }
}
async function submitForm() {
  if (saving.value) return;
  saving.value = true; formError.value = ""; fieldErrors.value = {};
  const payload = {
    id: form.id, name: form.name, description: form.description || null,
    cost: Number(form.cost), damage: Number(form.damage), range: Number(form.range),
    fire_rate: Number(form.fireRate), color: form.color,
    effects: compactNumbers({ slow: form.slow, slowDuration: form.slowDuration, burnDuration: form.burnDuration, burnDamagePerSecond: form.burnDamagePerSecond, splashRadius: form.splashRadius, splashDamageRatio: form.splashDamageRatio }),
    model_asset_keys: { dark1: form.dark1 || null, dark2: form.dark2 || null, dark3: form.dark3 || null, human1: form.human1 || null, human2: form.human2 || null, human3: form.human3 || null },
    model_configuration: { targetHeight: Number(form.targetHeight) },
    sort_order: Number(form.sortOrder), is_active: form.isActive,
  };
  try {
    await api(`/api/admin/tower-defense/towers${editingId.value ? `/${editingId.value}` : ""}`, { method: editingId.value ? "PUT" : "POST", body: payload });
    dialog.value?.close(); await loadData();
  } catch (error: any) {
    formError.value = error?.data?.message || "Không thể lưu tower.";
    fieldErrors.value = error?.data?.errors || {};
  } finally { saving.value = false }
}
async function removeTower(tower: Tower) {
  if (!confirm(`Xóa tower “${tower.name}”?`)) return;
  try { await api(`/api/admin/tower-defense/towers/${tower.id}`, { method: "DELETE" }); await loadData() }
  catch (error: any) { pageError.value = error?.data?.message || "Không thể xóa tower." }
}

useHead({ title: "Quản lý Tower | Admin" });
onMounted(loadData);
</script>

<template>
  <main class="tower-admin-page">
    <header class="tower-header">
      <div><small>TOWER DEFENSE CMS</small><h1>Quản lý Tower</h1><p>Cấu hình chỉ số chiến đấu, hiệu ứng và model theo từng cấp.</p></div>
      <button class="primary" type="button" @click="openCreate"><Plus /> Thêm tower</button>
    </header>
    <section class="tower-toolbar">
      <label><Search /><input v-model="search" placeholder="Tìm tên hoặc mã tower…" /></label>
      <button type="button" :disabled="loading" @click="loadData"><RefreshCw :class="{ spin: loading }" /> Làm mới</button>
    </section>
    <p v-if="pageError" class="tower-alert">{{ pageError }}</p>
    <div v-if="loading" class="tower-empty">Đang tải danh sách…</div>
    <div v-else-if="!filteredTowers.length" class="tower-empty"><Castle /><strong>Chưa có tower</strong><span>Hãy tạo hồ sơ tower đầu tiên.</span></div>
    <section v-else class="tower-grid">
      <article v-for="tower in filteredTowers" :key="tower.id" class="tower-card" :class="{ inactive: !tower.is_active }">
        <header><span class="tower-swatch" :style="{ background: tower.color }" /><div><small>{{ tower.id }}</small><h2>{{ tower.name }}</h2></div><span class="status">{{ tower.is_active ? 'Đang dùng' : 'Tạm ẩn' }}</span></header>
        <p>{{ tower.description || "Chưa có mô tả." }}</p>
        <dl><div><dt>Giá</dt><dd>{{ tower.cost }}</dd></div><div><dt>Sát thương</dt><dd>{{ tower.damage }}</dd></div><div><dt>Tầm đánh</dt><dd>{{ tower.range }}</dd></div><div><dt>Nhịp bắn</dt><dd>{{ tower.fire_rate }}s</dd></div></dl>
        <footer><span>{{ modelCount(tower) }} model đã gắn</span><div><button title="Chỉnh sửa" @click="openEdit(tower)"><Pencil /></button><button class="danger" title="Xóa" @click="removeTower(tower)"><Trash2 /></button></div></footer>
      </article>
    </section>

    <dialog ref="dialog" class="tower-dialog" @click.self="dialog?.close()">
      <form @submit.prevent="submitForm">
        <header class="tower-dialog__hero"><div class="tower-dialog__identity"><span class="tower-dialog__icon" :style="{ '--tower-accent': form.color }"><Castle /></span><div><small>{{ editingId ? 'CHỈNH SỬA TOWER' : 'TOWER MỚI' }}</small><h2>{{ form.name || 'Thiết lập tower' }}</h2><p>Cấu hình sức mạnh, hiệu ứng và hình ảnh hiển thị trong trận đấu.</p></div></div><button class="icon-button" type="button" aria-label="Đóng" @click="dialog?.close()"><X /></button></header>
        <div class="tower-form">
          <fieldset><legend><span class="section-icon"><Castle /></span><span>Thông tin cơ bản<small>Tên gọi và trạng thái sử dụng</small></span></legend><div class="form-grid">
            <label><span>Loại tower</span><input v-if="editingId" v-model="form.id" disabled /><select v-else v-model="form.id" required><option value="">Chọn loại tower…</option><option v-for="option in towerKindOptions" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select><small v-if="fieldErrors.id">{{ fieldErrors.id[0] }}</small></label>
            <label><span>Tên tower</span><input v-model="form.name" required /></label>
            <label><span>Màu nhận diện</span><input v-model="form.color" type="color" /></label>
            <label><span>Thứ tự</span><input v-model.number="form.sortOrder" type="number" min="0" /></label>
            <label class="wide"><span>Mô tả</span><textarea v-model="form.description" rows="2" /></label>
            <label class="check"><input v-model="form.isActive" type="checkbox" /> Cho phép sử dụng</label>
          </div></fieldset>
          <fieldset><legend><span class="section-icon"><Gauge /></span><span>Chỉ số gameplay<small>Các giá trị tác động trực tiếp trong trận</small></span></legend><div class="form-grid three stat-grid">
            <label><span>Giá xây</span><input v-model.number="form.cost" type="number" min="0" required /></label><label><span>Sát thương</span><input v-model.number="form.damage" type="number" min="0" step="0.01" required /></label><label><span>Tầm đánh</span><input v-model.number="form.range" type="number" min="0.01" step="0.01" required /></label><label><span>Thời gian giữa đòn (giây)</span><input v-model.number="form.fireRate" type="number" min="0" step="0.01" required /></label><label><span>Độ cao model</span><input v-model.number="form.targetHeight" type="number" min="0.01" step="0.01" required /></label>
          </div></fieldset>
          <fieldset><legend><span class="section-icon"><Sparkles /></span><span>Hiệu ứng đặc biệt<small>Để 0 đối với hiệu ứng không sử dụng</small></span></legend><div class="form-grid three">
            <label><span>Làm chậm (0–1)</span><input v-model.number="form.slow" type="number" min="0" max="1" step="0.01" /></label><label><span>Thời gian chậm</span><input v-model.number="form.slowDuration" type="number" min="0" step="0.1" /></label><label><span>Thời gian cháy</span><input v-model.number="form.burnDuration" type="number" min="0" step="0.1" /></label><label><span>Damage cháy / giây</span><input v-model.number="form.burnDamagePerSecond" type="number" min="0" step="0.1" /></label><label><span>Bán kính lan</span><input v-model.number="form.splashRadius" type="number" min="0" step="0.01" /></label><label><span>Tỉ lệ damage lan</span><input v-model.number="form.splashDamageRatio" type="number" min="0" max="1" step="0.01" /></label>
          </div></fieldset>
          <fieldset><legend><span class="section-icon"><Box /></span><span>Model theo cấp độ<small>GLB/GLTF được tải cho từng phe</small></span></legend><div class="model-factions"><section><header><span class="faction-dot dark" /><div><b>Phe bóng tối</b><small>Model mặc định của quân Dark</small></div></header><label v-for="level in 3" :key="`dark${level}`"><span><b>LV.{{ level }}</b> Cấp {{ level }}</span><select v-model="form[`dark${level}` as 'dark1']"><option value="">Không gắn model</option><option v-for="asset in modelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label></section><section><header><span class="faction-dot human" /><div><b>Phe con người</b><small>Để trống sẽ dùng model Dark</small></div></header><label v-for="level in 3" :key="`human${level}`"><span><b>LV.{{ level }}</b> Cấp {{ level }}</span><select v-model="form[`human${level}` as 'human1']"><option value="">Không gắn model</option><option v-for="asset in modelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label></section></div><small v-if="fieldErrors.model_asset_keys">{{ fieldErrors.model_asset_keys[0] }}</small></fieldset>
        </div>
        <p v-if="formError" class="tower-alert">{{ formError }}</p>
        <footer><span>Thay đổi sẽ áp dụng sau khi tải lại trang game.</span><div><button type="button" @click="dialog?.close()">Hủy</button><button class="primary" type="submit" :disabled="saving"><Save />{{ saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Tạo tower' }}</button></div></footer>
      </form>
    </dialog>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense-towers.css"></style>
