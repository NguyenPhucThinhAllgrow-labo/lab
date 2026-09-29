<script setup lang="ts">
import { Box, Castle, Gauge, ImageIcon, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, Trash2, X } from "lucide-vue-next";

type TowerRole = "damage" | "buff";
type EffectBehavior = "bonus_damage" | "critical_hit" | "damage_over_time" | "slow" | "splash_damage" | "damage_aura" | "attack_speed_aura";
interface EffectTypeOption { id: string; name: string; role: TowerRole; behavior: EffectBehavior; description: string | null; color: string; is_active: boolean }
interface EffectForm { id: string; type: string; behavior: EffectBehavior; name: string; value: number; duration: number; radius: number; ratio: number; multiplier: number; perLevel: number; color: string }
interface LevelStatsForm { damage: number; range: number; fireRate: number; upgradeCost: number; targetHeight: number; chainTargets: number; chainRange: number; chainDamageRatio: number }

interface Asset { id: number; key: string; type: string; purpose: string; isActive?: boolean }
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }
interface Tower {
  id: string; template_key: string; name: string; description: string | null; cost: number; damage: number;
  damage_by_level: Record<string, number> | null;
  max_level: number;
  level_stats: Record<string, Omit<LevelStatsForm, "targetHeight">> | null;
  role: TowerRole; damage_type: TowerDamageCategory; range: number; fire_rate: number; color: string; effects: Record<string, any>;
  image_asset_key: string | null;
  model_asset_keys: Record<string, string>; model_configuration: { targetHeight: number; targetHeightByLevel?: Record<string, number> };
  is_active: boolean;
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
const editingId = ref<string | null>(null);
const towerKindOptions = [
  ["archer", "Tháp cung"], ["cannon", "Tháp pháo"], ["frost", "Tháp băng"],
  ["fire", "Tháp lửa"], ["thunder", "Tháp sét"], ["water", "Tháp nước"],
  ["support", "Trụ hỗ trợ"],
] as const;
const towerRoleLabel = (role: TowerRole) => role === "buff" ? "Trụ hỗ trợ" : "Trụ gây sát thương";
type TowerDamageCategory = "physical" | "magic" | "none";
const towerDamageCategory = (value: string | null | undefined): TowerDamageCategory =>
  value === "physical" || value === "magic" || value === "none" ? value : "magic";
const towerDamageCategoryLabel = (value: string | null | undefined) => {
  const category = towerDamageCategory(value);
  return category === "physical" ? "Sát thương vật lý" : category === "magic" ? "Sát thương phép" : "Không gây sát thương";
};
const towerDamageCategoryHelp = (value: string | null | undefined) => {
  const category = towerDamageCategory(value);
  return category === "physical"
    ? "Bị giảm bởi chỉ số Giáp của quái và boss."
    : category === "magic"
      ? "Bị giảm bởi chỉ số Kháng phép của quái và boss."
      : "Trụ này tập trung hỗ trợ và không có loại sát thương cơ bản.";
};

const blankForm = () => ({
  id: "", templateKey: "archer", name: "", description: "", role: "damage" as TowerRole, damageType: "physical" as TowerDamageCategory, maxLevel: 3,
  levelStats: {
    1: { damage: 10, range: 3, fireRate: 1, upgradeCost: 100, targetHeight: 2, chainTargets: 3, chainRange: 1.65, chainDamageRatio: 0.72 },
    2: { damage: 15.5, range: 3.22, fireRate: 0.85, upgradeCost: 75, targetHeight: 2, chainTargets: 4, chainRange: 1.77, chainDamageRatio: 0.72 },
    3: { damage: 21, range: 3.44, fireRate: 0.74, upgradeCost: 110, targetHeight: 2, chainTargets: 5, chainRange: 1.89, chainDamageRatio: 0.72 },
  } as Record<number, LevelStatsForm>,
  color: "#64748b", isActive: true,
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
function levelStatsFor(level: number): LevelStatsForm {
  const stats = form.levelStats[level] ?? form.levelStats[1];
  if (!stats) throw new Error("Thiếu cấu hình level 1 của tower.");
  return stats;
}
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
const needsMultiplier = (behavior: EffectBehavior) => behavior === "critical_hit";
const effectValueLabel = (behavior: EffectBehavior) => behavior === "critical_hit" ? "Tỷ lệ chí mạng (0–1)" : behavior === "slow" || behavior.endsWith("_aura") ? "Mức hiệu ứng (0–1)" : behavior === "damage_over_time" ? "Sát thương / giây" : "Giá trị";

function createEffect(type = availableEffectOptions.value[0]?.id ?? "bonus-damage"): EffectForm {
  const option = effectTypes.value.find(item => item.id === type);
  const behavior = option?.behavior ?? "bonus_damage";
  return { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, behavior, name: option?.name ?? "Hiệu ứng", value: behavior === "critical_hit" ? 0.15 : behavior.endsWith("_aura") ? 0.1 : 0, duration: 0, radius: form.levelStats[1]?.range ?? 3, ratio: 0.5, multiplier: 2, perLevel: 0, color: option?.color ?? form.color };
}
function addEffect() { form.effectItems.push(createEffect()) }
function removeEffect(index: number) { form.effectItems.splice(index, 1) }
function selectEffectType(effect: EffectForm) {
  const option = effectTypes.value.find(item => item.id === effect.type);
  if (!option) return;
  effect.behavior = option.behavior;
  effect.name = option.name;
  effect.color = option.color;
  if (option.behavior === "critical_hit") {
    effect.value = effect.value > 0 && effect.value <= 1 ? effect.value : 0.15;
    effect.multiplier = Math.max(1, effect.multiplier || 2);
  }
}
function normalizeEffects(effects: Record<string, any>): EffectForm[] {
  if (Array.isArray(effects?.items)) return effects.items.map((effect: Partial<EffectForm>) => ({ ...createEffect(effect.type), ...effect }));
  const result: EffectForm[] = [];
  if (effects?.burnDamagePerSecond) result.push({ ...createEffect("damage_over_time"), value: effects.burnDamagePerSecond, duration: effects.burnDuration ?? 0 });
  if (effects?.slow) result.push({ ...createEffect("slow"), value: effects.slow, duration: effects.slowDuration ?? 0 });
  if (effects?.splashRadius) result.push({ ...createEffect("splash_damage"), radius: effects.splashRadius, ratio: effects.splashDamageRatio ?? 1 });
  return result;
}



async function loadData(page = towerPage.value) {
  loading.value = true; pageError.value = "";
  try {
    const towerResponse = await api<Paginated<Tower>>(`/api/admin/tower-defense/towers?per_page=12&page=${page}`);
    towers.value = towerResponse.data; towerPage.value = towerResponse.current_page; towerLastPage.value = towerResponse.last_page; towerTotal.value = towerResponse.total;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể tải danh sách tower.";
  } finally { loading.value = false }
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
      <NuxtLink class="primary tower-create-link" to="/admin/tower-defense/towers/new"><Plus /> Thêm tower</NuxtLink>
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
        <dl><div><dt>Loại tower</dt><dd>{{ towerRoleLabel(tower.role) }}</dd></div><div><dt>Số cấp</dt><dd>{{ tower.max_level ?? 3 }} level</dd></div><div class="tower-damage-category" :class="`is-${towerDamageCategory(tower.damage_type)}`"><dt>Loại sát thương</dt><dd><ShieldCheck v-if="towerDamageCategory(tower.damage_type) === 'physical'" /><Sparkles v-else-if="towerDamageCategory(tower.damage_type) === 'magic'" /><Box v-else />{{ towerDamageCategoryLabel(tower.damage_type) }}</dd></div><div><dt>Damage đầu → cuối</dt><dd>{{ tower.level_stats?.['1']?.damage ?? tower.damage }} → {{ tower.level_stats?.[String(tower.max_level)]?.damage ?? tower.damage }}</dd></div><div><dt>Tầm đầu → cuối</dt><dd>{{ tower.level_stats?.['1']?.range ?? tower.range }} → {{ tower.level_stats?.[String(tower.max_level)]?.range ?? tower.range }}</dd></div></dl>
        <footer><span>{{ modelCount(tower) }} model đã gắn</span><div><NuxtLink :to="'/admin/tower-defense/towers/' + tower.id" title="Chỉnh sửa"><Pencil /></NuxtLink><button class="danger" title="Xóa" @click="removeTower(tower)"><Trash2 /></button></div></footer>
      </article>
    </section>
    <AdminPagination :page="towerPage" :last-page="towerLastPage" :total="towerTotal" :loading="loading" @change="loadData" />

  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense-towers.css"></style>
<style scoped>
.tower-create-link { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:9px 13px; border-radius:10px; color:#fff; background:linear-gradient(135deg,#8b5cf6,#4f46e5); box-shadow:0 8px 24px #6d28d940; text-decoration:none; }
.tower-create-link svg { width:16px; }
.tower-card footer a { display:inline-flex; align-items:center; justify-content:center; padding:7px; border:1px solid #ffffff12; border-radius:10px; color:#d4d4d8; background:#18181f; text-decoration:none; }
.tower-card footer a svg { width:16px; }
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
