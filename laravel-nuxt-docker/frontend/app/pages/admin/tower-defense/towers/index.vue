<script setup lang="ts">
import { Box, Castle, Gauge, ImageIcon, Pencil, Plus, RefreshCw, Save, Search, Sparkles, Trash2, X } from "lucide-vue-next";

type TowerRole = "damage" | "buff";
type EffectBehavior = "bonus_damage" | "damage_over_time" | "slow" | "splash_damage" | "damage_aura" | "attack_speed_aura";
interface EffectTypeOption { id: string; name: string; role: TowerRole; behavior: EffectBehavior; description: string | null; color: string; is_active: boolean }
interface EffectForm { id: string; type: string; behavior: EffectBehavior; name: string; value: number; duration: number; radius: number; ratio: number; perLevel: number; color: string }
interface LevelStatsForm { damage: number; range: number; fireRate: number; upgradeCost: number; targetHeight: number }

interface Asset { id: number; key: string; type: string; purpose: string; isActive?: boolean }
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }
interface Tower {
  id: string; name: string; description: string | null; cost: number; damage: number;
  damage_by_level: Record<string, number> | null;
  max_level: number;
  level_stats: Record<string, Omit<LevelStatsForm, "targetHeight">> | null;
  role: TowerRole; range: number; fire_rate: number; color: string; effects: Record<string, any>;
  image_asset_key: string | null;
  model_asset_keys: Record<string, string>; model_configuration: { targetHeight: number; targetHeightByLevel?: Record<string, number> };
  sort_order: number; is_active: boolean;
}

const api = useApi();
const towers = ref<Tower[]>([]);
const assets = ref<Asset[]>([]);
const effectTypes = ref<EffectTypeOption[]>([]);
const loading = ref(true);
const towerPage = ref(1);
const towerLastPage = ref(1);
const towerTotal = ref(0);
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
  id: "", name: "", description: "", role: "damage" as TowerRole, maxLevel: 3,
  levelStats: {
    1: { damage: 10, range: 3, fireRate: 1, upgradeCost: 100, targetHeight: 2 },
    2: { damage: 15.5, range: 3.22, fireRate: 0.85, upgradeCost: 75, targetHeight: 2 },
    3: { damage: 21, range: 3.44, fireRate: 0.74, upgradeCost: 110, targetHeight: 2 },
  } as Record<number, LevelStatsForm>,
  color: "#64748b", sortOrder: 0, isActive: true,
  imageAssetKey: "", imagePreview: "",
  effectItems: [] as EffectForm[],
  darkModels: {} as Record<number, string>, humanModels: {} as Record<number, string>,
});
const form = reactive(blankForm());
const modelAssets = computed(() => assets.value.filter(asset => asset.type === "model" && asset.purpose === "tower-model"));
const towerImageAssets = computed(() => assets.value.filter(asset => asset.type === "image" && asset.purpose === "tower-image" && asset.isActive !== false));
const filteredTowers = computed(() => {
  const term = search.value.trim().toLocaleLowerCase("vi");
  return term ? towers.value.filter(tower => `${tower.id} ${tower.name} ${tower.description ?? ""}`.toLocaleLowerCase("vi").includes(term)) : towers.value;
});
const modelCount = (tower: Tower) => Object.values(tower.model_asset_keys ?? {}).filter(Boolean).length;
const assetUrl = (key: string) => `/api/tower-defense/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
const towerLevels = computed(() => Array.from({ length: Math.max(1, Number(form.maxLevel) || 1) }, (_, index) => index + 1));
function addTowerLevel() {
  form.maxLevel = Math.max(1, Number(form.maxLevel) || 1) + 1;
}
function removeTowerLevel() {
  const level = Math.max(1, Number(form.maxLevel) || 1);
  if (level <= 1) return;
  delete form.levelStats[level];
  delete form.darkModels[level];
  delete form.humanModels[level];
  form.maxLevel = level - 1;
}
const availableEffectOptions = computed(() => effectTypes.value.filter(option => option.role === form.role && option.is_active));
const effectHelp = (type: string) => effectTypes.value.find(option => option.id === type)?.description ?? "";
const needsDuration = (behavior: EffectBehavior) => behavior === "damage_over_time" || behavior === "slow";
const needsRadius = (behavior: EffectBehavior) => behavior === "splash_damage" || behavior.endsWith("_aura");
const needsRatio = (behavior: EffectBehavior) => behavior === "splash_damage";
const effectValueLabel = (behavior: EffectBehavior) => behavior === "slow" || behavior.endsWith("_aura") ? "Mức hiệu ứng (0–1)" : behavior === "damage_over_time" ? "Sát thương / giây" : "Giá trị";

function createEffect(type = availableEffectOptions.value[0]?.id ?? "bonus-damage"): EffectForm {
  const option = effectTypes.value.find(item => item.id === type);
  const behavior = option?.behavior ?? "bonus_damage";
  return { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, behavior, name: option?.name ?? "Hiệu ứng", value: behavior.endsWith("_aura") ? 0.1 : 0, duration: 0, radius: form.levelStats[1]?.range ?? 3, ratio: 0.5, perLevel: 0, color: option?.color ?? form.color };
}
function addEffect() { form.effectItems.push(createEffect()) }
function removeEffect(index: number) { form.effectItems.splice(index, 1) }
function selectEffectType(effect: EffectForm) {
  const option = effectTypes.value.find(item => item.id === effect.type);
  if (!option) return;
  effect.behavior = option.behavior;
  effect.name = option.name;
  effect.color = option.color;
}
function normalizeEffects(effects: Record<string, any>): EffectForm[] {
  if (Array.isArray(effects?.items)) return effects.items.map((effect: Partial<EffectForm>) => ({ ...createEffect(effect.type), ...effect }));
  const result: EffectForm[] = [];
  if (effects?.burnDamagePerSecond) result.push({ ...createEffect("damage_over_time"), value: effects.burnDamagePerSecond, duration: effects.burnDuration ?? 0 });
  if (effects?.slow) result.push({ ...createEffect("slow"), value: effects.slow, duration: effects.slowDuration ?? 0 });
  if (effects?.splashRadius) result.push({ ...createEffect("splash_damage"), radius: effects.splashRadius, ratio: effects.splashDamageRatio ?? 1 });
  return result;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, blankForm());
  formError.value = ""; fieldErrors.value = {};
  dialog.value?.showModal();
}
function selectTowerImageAsset() {
  form.imagePreview = form.imageAssetKey ? assetUrl(form.imageAssetKey) : "";
}
function clearTowerImage() {
  form.imageAssetKey = "";
  form.imagePreview = "";
}
function openEdit(tower: Tower) {
  editingId.value = tower.id;
  Object.assign(form, blankForm(), {
    id: tower.id, name: tower.name, description: tower.description ?? "", role: tower.role ?? "damage",
    maxLevel: tower.max_level ?? 3,
    levelStats: Object.fromEntries(Array.from({ length: tower.max_level ?? 3 }, (_, index) => {
      const level = index + 1;
      const stats = tower.level_stats?.[String(level)] ?? {
        damage: tower.damage_by_level?.[String(level)] ?? tower.damage * (1 + (level - 1) * (tower.id === "thunder" ? 0.42 : 0.55)),
        range: tower.range + (level - 1) * 0.22,
        fireRate: tower.fire_rate / (1 + (level - 1) * (tower.id === "archer" ? 0.35 : 0.18)),
        upgradeCost: level === 1 ? tower.cost : Math.round(tower.cost * (0.75 + (level - 2) * 0.35) / 5) * 5,
        targetHeight: tower.model_configuration?.targetHeight ?? 2,
      };
      return [level, {
        ...stats,
        targetHeight: tower.model_configuration?.targetHeightByLevel?.[String(level)] ?? tower.model_configuration?.targetHeight ?? 2,
      }];
    })),
    color: tower.color, imageAssetKey: tower.image_asset_key ?? "",
    imagePreview: tower.image_asset_key ? assetUrl(tower.image_asset_key) : "",
    sortOrder: tower.sort_order,
    isActive: tower.is_active, effectItems: normalizeEffects(tower.effects),
    darkModels: Object.fromEntries(Object.entries(tower.model_asset_keys ?? {}).filter(([key]) => key.startsWith("dark")).map(([key, value]) => [Number(key.slice(4)), value])),
    humanModels: Object.fromEntries(Object.entries(tower.model_asset_keys ?? {}).filter(([key]) => key.startsWith("human")).map(([key, value]) => [Number(key.slice(5)), value])),
  });
  formError.value = ""; fieldErrors.value = {};
  dialog.value?.showModal();
}
async function loadData(page = towerPage.value) {
  loading.value = true; pageError.value = "";
  try {
    const [towerResponse, assetResponse, effectTypeResponse] = await Promise.all([
      api<Paginated<Tower>>(`/api/admin/tower-defense/towers?per_page=12&page=${page}`),
      api<{ data: Asset[] }>("/api/admin/tower-defense/assets?per_page=500"),
      api<{ data: EffectTypeOption[] }>("/api/admin/tower-defense/effect-types?per_page=500"),
    ]);
    towers.value = towerResponse.data; towerPage.value = towerResponse.current_page; towerLastPage.value = towerResponse.last_page; towerTotal.value = towerResponse.total;
    assets.value = assetResponse.data; effectTypes.value = effectTypeResponse.data;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể tải danh sách tower.";
  } finally { loading.value = false }
}
async function submitForm() {
  if (saving.value) return;
  saving.value = true; formError.value = ""; fieldErrors.value = {};
  const payload = {
    id: form.id, name: form.name, description: form.description || null, role: form.role,
    cost: Number(form.levelStats[1]?.upgradeCost ?? 0), damage: Number(form.levelStats[1]?.damage ?? 0), max_level: Number(form.maxLevel),
    damage_by_level: Object.fromEntries(towerLevels.value.map(level => [level, Number(form.levelStats[level]?.damage ?? 0)])),
    level_stats: Object.fromEntries(towerLevels.value.map(level => [level, {
      damage: Number(form.levelStats[level]?.damage ?? 0), range: Number(form.levelStats[level]?.range ?? 0),
      fireRate: Number(form.levelStats[level]?.fireRate ?? 0), upgradeCost: Number(form.levelStats[level]?.upgradeCost ?? 0),
    }])),
    range: Number(form.levelStats[1]?.range ?? 0),
    fire_rate: Number(form.levelStats[1]?.fireRate ?? 0), color: form.color,
    image_asset_key: form.imageAssetKey || null,
    effects: { items: form.effectItems.map(effect => ({ ...effect, value: Number(effect.value), duration: Number(effect.duration), radius: Number(effect.radius), ratio: Number(effect.ratio), perLevel: Number(effect.perLevel) })) },
    model_asset_keys: Object.fromEntries(towerLevels.value.flatMap(level => [[`dark${level}`, form.darkModels[level] || null], [`human${level}`, form.humanModels[level] || null]])),
    model_configuration: {
      targetHeight: Number(form.levelStats[1]?.targetHeight ?? 2),
      targetHeightByLevel: Object.fromEntries(towerLevels.value.map(level => [level, Number(form.levelStats[level]?.targetHeight ?? 2)])),
    },
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

watch(() => form.role, () => {
  form.effectItems = form.effectItems.filter(effect => effectTypes.value.find(option => option.id === effect.type)?.role === form.role);
});
watch(() => form.maxLevel, (maxLevel) => {
  const maximum = Math.max(1, Number(maxLevel) || 1);
  for (let level = 1; level <= maximum; level++) {
    if (form.levelStats[level] === undefined) {
      const previous = form.levelStats[level - 1] ?? form.levelStats[1];
      form.levelStats[level] = {
        damage: previous?.damage ?? 0,
        range: previous?.range ?? 1,
        fireRate: previous?.fireRate ?? 0,
        upgradeCost: previous?.upgradeCost ?? 0,
        targetHeight: previous?.targetHeight ?? 2,
      };
    }
    if (form.darkModels[level] === undefined) form.darkModels[level] = "";
    if (form.humanModels[level] === undefined) form.humanModels[level] = "";
  }
});
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
      <button type="button" :disabled="loading" @click="loadData()"><RefreshCw :class="{ spin: loading }" /> Làm mới</button>
    </section>
    <p v-if="pageError" class="tower-alert">{{ pageError }}</p>
    <div v-if="loading" class="tower-empty">Đang tải danh sách…</div>
    <div v-else-if="!filteredTowers.length" class="tower-empty"><Castle /><strong>Chưa có tower</strong><span>Hãy tạo hồ sơ tower đầu tiên.</span></div>
    <section v-else class="tower-grid">
      <article v-for="tower in filteredTowers" :key="tower.id" class="tower-card" :class="{ inactive: !tower.is_active }">
        <header><span class="tower-card-image" :style="{ '--tower-color': tower.color }"><img v-if="tower.image_asset_key" :src="assetUrl(tower.image_asset_key)" :alt="tower.name" /><Castle v-else /></span><div><small>{{ tower.id }}</small><h2>{{ tower.name }}</h2></div><span class="status">{{ tower.is_active ? 'Đang dùng' : 'Tạm ẩn' }}</span></header>
        <p>{{ tower.description || "Chưa có mô tả." }}</p>
        <dl><div><dt>Giá xây</dt><dd>{{ tower.level_stats?.['1']?.upgradeCost ?? tower.cost }}</dd></div><div><dt>Số cấp</dt><dd>{{ tower.max_level ?? 3 }} level</dd></div><div><dt>Damage đầu → cuối</dt><dd>{{ tower.level_stats?.['1']?.damage ?? tower.damage }} → {{ tower.level_stats?.[String(tower.max_level)]?.damage ?? tower.damage }}</dd></div><div><dt>Tầm đầu → cuối</dt><dd>{{ tower.level_stats?.['1']?.range ?? tower.range }} → {{ tower.level_stats?.[String(tower.max_level)]?.range ?? tower.range }}</dd></div></dl>
        <footer><span>{{ modelCount(tower) }} model đã gắn</span><div><button title="Chỉnh sửa" @click="openEdit(tower)"><Pencil /></button><button class="danger" title="Xóa" @click="removeTower(tower)"><Trash2 /></button></div></footer>
      </article>
    </section>
    <AdminPagination :page="towerPage" :last-page="towerLastPage" :total="towerTotal" :loading="loading" @change="loadData" />

    <dialog ref="dialog" class="tower-dialog" @click.self="dialog?.close()">
      <form @submit.prevent="submitForm">
        <header class="tower-dialog__hero"><div class="tower-dialog__identity"><span class="tower-dialog__icon" :style="{ '--tower-accent': form.color }"><Castle /></span><div><small>{{ editingId ? 'CHỈNH SỬA TOWER' : 'TOWER MỚI' }}</small><h2>{{ form.name || 'Thiết lập tower' }}</h2><p>Cấu hình sức mạnh, hiệu ứng và hình ảnh hiển thị trong trận đấu.</p></div></div><button class="icon-button" type="button" aria-label="Đóng" @click="dialog?.close()"><X /></button></header>
        <div class="tower-form">
          <fieldset><legend><span class="section-icon"><Castle /></span><span>Thông tin cơ bản<small>Tên gọi và trạng thái sử dụng</small></span></legend><div class="form-grid">
            <label><span>Loại tower</span><input v-if="editingId" v-model="form.id" disabled /><select v-else v-model="form.id" required><option value="">Chọn loại tower…</option><option v-for="option in towerKindOptions" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select><small v-if="fieldErrors.id">{{ fieldErrors.id[0] }}</small></label>
            <label><span>Vai trò</span><select v-model="form.role"><option value="damage">Gây sát thương</option><option value="buff">Hỗ trợ / Buff</option></select></label>
            <label><span>Tên tower</span><input v-model="form.name" required /></label>
            <label><span>Màu nhận diện</span><input v-model="form.color" type="color" /></label>
            <label><span>Thứ tự</span><input v-model.number="form.sortOrder" type="number" min="0" step="1" /></label>
            <label class="wide"><span>Mô tả</span><textarea v-model="form.description" rows="2" /></label>
            <div class="tower-image-field wide"><div class="tower-image-preview" :style="{ '--tower-color': form.color }"><img v-if="form.imagePreview" :src="form.imagePreview" alt="Ảnh xem trước tower" /><ImageIcon v-else /></div><div><b>Ảnh đại diện tower</b><small>Chọn ảnh đã được upload với loại “Ảnh tower” trong phần Tài nguyên.</small><select v-model="form.imageAssetKey" @change="selectTowerImageAsset"><option value="">Không dùng ảnh đại diện</option><option v-for="asset in towerImageAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select><button v-if="form.imageAssetKey" type="button" class="danger" @click="clearTowerImage"><Trash2 /> Bỏ chọn ảnh</button><small v-if="!towerImageAssets.length">Chưa có tài nguyên Ảnh tower.</small><small v-if="fieldErrors.image_asset_key">{{ fieldErrors.image_asset_key[0] }}</small></div></div>
            <label class="check"><input v-model="form.isActive" type="checkbox" /> Cho phép sử dụng</label>
          </div></fieldset>
          <fieldset><legend><span class="section-icon"><Gauge /></span><span>Chỉ số gameplay theo level<small>Mỗi cấp có bộ chỉ số và giá nâng cấp riêng</small></span></legend><div class="level-stats-builder">
            <div class="level-manager"><div><span>Tổng số level</span><strong>{{ form.maxLevel }} level</strong></div><div><button type="button" :disabled="form.maxLevel <= 1" @click="removeTowerLevel">− Xóa level cuối</button><button type="button" class="primary" @click="addTowerLevel"><Plus /> Thêm level {{ form.maxLevel + 1 }}</button></div></div>
            <div class="level-stats-list"><article v-for="level in towerLevels" :key="`stats-${level}`" class="level-stat-card"><header><span>LV</span><strong>{{ level }}</strong><div><b>{{ level === 1 ? 'Chỉ số khi xây' : `Nâng cấp lên level ${level}` }}</b><small>{{ level === 1 ? 'Giá level 1 là giá đặt tower' : 'Tất cả giá trị áp dụng ngay sau nâng cấp' }}</small></div></header><div class="form-grid two level-stat-fields"><label><span>{{ form.role === 'buff' ? 'Sát thương (nếu có)' : 'Sát thương' }}</span><input v-model.number="form.levelStats[level].damage" type="number" min="0" step="any" required /></label><label><span>{{ form.role === 'buff' ? 'Phạm vi hỗ trợ' : 'Tầm đánh' }}</span><input v-model.number="form.levelStats[level].range" type="number" min="0.01" step="any" required /></label><label><span>Thời gian giữa đòn</span><div class="input-suffix"><input v-model.number="form.levelStats[level].fireRate" type="number" min="0" step="any" required /><span>giây</span></div></label><label><span>{{ level === 1 ? 'Giá xây' : `Giá nâng lên LV.${level}` }}</span><input v-model.number="form.levelStats[level].upgradeCost" type="number" min="0" step="1" required /></label><label class="wide"><span>Độ cao model LV.{{ level }}</span><input v-model.number="form.levelStats[level].targetHeight" type="number" min="0.01" step="any" required /></label></div></article></div>
          </div></fieldset>
          <fieldset><legend><span class="section-icon"><Sparkles /></span><span>Hiệu ứng đặc biệt<small>Frontend tự dựng UI và thực thi từ cấu hình này</small></span></legend><div class="effect-builder"><div v-if="!form.effectItems.length" class="effect-empty"><Sparkles /><span>Chưa có hiệu ứng cho tower này.</span></div><article v-for="(effect, index) in form.effectItems" :key="effect.id" class="effect-card"><header><div><span class="effect-color" :style="{ background: effect.color }" /><div><b>{{ effect.name || 'Hiệu ứng mới' }}</b><small>{{ effectHelp(effect.type) }}</small></div></div><button type="button" class="danger" title="Xóa hiệu ứng" @click="removeEffect(index)"><Trash2 /></button></header><div class="form-grid three"><label><span>Loại hiệu ứng</span><select v-model="effect.type" @change="selectEffectType(effect)"><option v-for="option in availableEffectOptions" :key="option.id" :value="option.id">{{ option.name }}</option></select></label><label><span>Tên hiển thị</span><input v-model="effect.name" required /></label><label><span>Màu hiệu ứng</span><input v-model="effect.color" type="color" /></label><label><span>{{ effectValueLabel(effect.behavior) }}</span><input v-model.number="effect.value" type="number" min="0" :max="effect.behavior === 'slow' || effect.behavior.endsWith('_aura') ? 1 : undefined" step="any" /></label><label><span>Tăng thêm mỗi cấp</span><input v-model.number="effect.perLevel" type="number" min="0" step="any" /></label><label v-if="needsDuration(effect.behavior)"><span>Thời lượng (giây)</span><input v-model.number="effect.duration" type="number" min="0" step="any" /></label><label v-if="needsRadius(effect.behavior)"><span>Bán kính</span><input v-model.number="effect.radius" type="number" min="0" step="any" /></label><label v-if="needsRatio(effect.behavior)"><span>Damage tại rìa (0–1)</span><input v-model.number="effect.ratio" type="number" min="0" max="1" step="any" /></label></div></article><button type="button" class="effect-add" :disabled="!availableEffectOptions.length" @click="addEffect"><Plus /> Thêm hiệu ứng {{ form.role === 'buff' ? 'buff' : 'sát thương' }}</button><NuxtLink class="effect-manage-link" to="/admin/tower-defense/effect-types">Quản lý loại hiệu ứng</NuxtLink></div><small v-if="fieldErrors['effects.items']">{{ fieldErrors['effects.items'][0] }}</small></fieldset>
          <fieldset><legend><span class="section-icon"><Box /></span><span>Model theo cấp độ<small>GLB/GLTF được tải cho từng phe</small></span></legend><div class="model-factions"><section><header><span class="faction-dot dark" /><div><b>Phe bóng tối</b><small>Model mặc định của quân Dark</small></div></header><label v-for="level in towerLevels" :key="`dark${level}`"><span><b>LV.{{ level }}</b> Cấp {{ level }}</span><select v-model="form.darkModels[level]"><option value="">Không gắn model</option><option v-for="asset in modelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label></section><section><header><span class="faction-dot human" /><div><b>Phe con người</b><small>Để trống sẽ dùng model Dark</small></div></header><label v-for="level in towerLevels" :key="`human${level}`"><span><b>LV.{{ level }}</b> Cấp {{ level }}</span><select v-model="form.humanModels[level]"><option value="">Không gắn model</option><option v-for="asset in modelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label></section></div><small v-if="fieldErrors.model_asset_keys">{{ fieldErrors.model_asset_keys[0] }}</small></fieldset>
        </div>
        <p v-if="formError" class="tower-alert">{{ formError }}</p>
        <footer><span>Thay đổi sẽ áp dụng sau khi tải lại trang game.</span><div><button type="button" @click="dialog?.close()">Hủy</button><button class="primary" type="submit" :disabled="saving"><Save />{{ saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Tạo tower' }}</button></div></footer>
      </form>
    </dialog>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense-towers.css"></style>
<style scoped>
.tower-card-image { display:grid; width:48px; height:48px; flex:none; place-items:center; overflow:hidden; border:1px solid color-mix(in srgb,var(--tower-color) 45%,white 8%); border-radius:13px; color:var(--tower-color); background:color-mix(in srgb,var(--tower-color) 15%,#101015) }
.tower-card-image img { width:100%; height:100%; object-fit:cover }
.tower-card-image svg { width:22px }
.tower-image-field { display:grid; grid-template-columns:104px 1fr; gap:14px; align-items:center; padding:13px; border:1px solid #ffffff0d; border-radius:13px; background:#09090e }
.tower-image-preview { display:grid; width:104px; aspect-ratio:1; place-items:center; overflow:hidden; border:1px dashed color-mix(in srgb,var(--tower-color) 55%,white 8%); border-radius:13px; color:var(--tower-color); background:color-mix(in srgb,var(--tower-color) 13%,#111118) }
.tower-image-preview img { width:100%; height:100%; object-fit:cover }
.tower-image-preview svg { width:28px }
.tower-image-field > div:last-child { display:flex; align-items:flex-start; flex-wrap:wrap; gap:8px }
.tower-image-field b, .tower-image-field > div > small { width:100% }
.tower-image-field b { color:#e4e4e7; font-size:12px }
.tower-image-field > div > small { color:#71717a }
.tower-image-upload { display:inline-flex !important; align-items:center; justify-content:center; flex-direction:row !important; gap:7px; padding:9px 12px; border:1px solid #8b5cf640; border-radius:10px; color:#c4b5fd !important; background:#8b5cf610; cursor:pointer }
.tower-image-upload svg { width:15px }
.tower-image-upload input { display:none }
.tower-image-field .danger { color:#f87171 }
@media (max-width:760px) { .tower-image-field { grid-template-columns:1fr } }
</style>
