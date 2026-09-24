<script setup lang="ts">
import {
  Activity,
  Crown,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Trash2,
  X,
} from "lucide-vue-next";
import type { TowerDefenseEquipmentTransform } from "~/types/games/towerDefense";

type EnemyKind = "normal" | "boss";
type AssetPurpose =
  | "enemy-model"
  | "boss-model"
  | "enemy-avatar"
  | "boss-avatar"
  | string;

interface Asset {
  id: number;
  key: string;
  type: "model" | "image" | "sound";
  purpose: AssetPurpose;
}

interface Enemy {
  id: string;
  name: string;
  kind: EnemyKind;
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
  display_configuration?: { primaryColor?: string; glowColor?: string } | null;
  model_configuration: {
    characterScale: number;
    sceneScale: number;
    healthBarY: number;
    animationNames: string[];
    removeRootMotion?: boolean;
    leftWeaponTransform?: TowerDefenseEquipmentTransform;
    rightWeaponTransform?: TowerDefenseEquipmentTransform;
  };
  combat_profile: {
    damageMultipliers: Record<string, number>;
    effectDurationMultipliers: Record<string, number>;
  };
  is_active: boolean;
}

const api = useApi();
const enemies = ref<Enemy[]>([]);
const assets = ref<Asset[]>([]);
const loading = ref(true);
const saving = ref(false);
const pageError = ref("");
const formError = ref("");
const fieldErrors = ref<Record<string, string[]>>({});
const search = ref("");
const kindFilter = ref<"" | EnemyKind>("");
const dialog = ref<HTMLDialogElement | null>(null);
const editingId = ref<string | null>(null);

function defaultWeaponTransform() {
  return {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: 1,
  };
}

function editableWeaponTransform(transform?: TowerDefenseEquipmentTransform) {
  return {
    position: [...(transform?.position ?? [0, 0, 0])] as [number, number, number],
    rotation: (transform?.rotation ?? [0, 0, 0]).map(
      (angle) => (angle * 180) / Math.PI,
    ) as [number, number, number],
    scale: transform?.scale ?? 1,
  };
}

const form = reactive({
  id: "",
  name: "",
  kind: "normal" as EnemyKind,
  modelAssetKey: "",
  avatarAssetKey: "",
  leftWeaponAssetKey: "",
  rightWeaponAssetKey: "",
  leftWeaponTransform: defaultWeaponTransform(),
  rightWeaponTransform: defaultWeaponTransform(),
  baseHealth: 100,
  baseSpeed: 1,
  reward: 10,
  castleDamage: 1,
  summary: "",
  resistance: "Không",
  weakness: "Không",
  characterScale: 2,
  sceneScale: 0.494,
  healthBarY: 1.85,
  animationNames: "Walk, Run",
  removeRootMotion: true,
  fireMultiplier: 1,
  waterMultiplier: 1,
  frostMultiplier: 1,
  thunderMultiplier: 1,
  archerMultiplier: 1,
  cannonMultiplier: 1,
  burnMultiplier: 1,
  slowMultiplier: 1,
  freezeMultiplier: 1,
  isActive: true,
});

useHead({ title: "Quái và boss | Tower Defense Admin" });

const filteredEnemies = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("vi");
  return enemies.value.filter(
    (enemy) =>
      (!kindFilter.value || enemy.kind === kindFilter.value) &&
      (!query ||
        enemy.name.toLocaleLowerCase("vi").includes(query) ||
        enemy.id.toLocaleLowerCase("vi").includes(query)),
  );
});
const normalCount = computed(
  () => enemies.value.filter((enemy) => enemy.kind === "normal").length,
);
const bossCount = computed(
  () => enemies.value.filter((enemy) => enemy.kind === "boss").length,
);
const modelAssets = computed(() =>
  assets.value.filter(
    (asset) =>
      asset.purpose ===
      (form.kind === "boss" ? "boss-model" : "enemy-model"),
  ),
);
const avatarAssets = computed(() =>
  assets.value.filter(
    (asset) =>
      asset.purpose ===
      (form.kind === "boss" ? "boss-avatar" : "enemy-avatar"),
  ),
);
const weaponAssets = computed(() =>
  assets.value.filter(
    (asset) =>
      asset.purpose === "equipment-model" && /\.(glb|gltf)$/i.test(asset.key),
  ),
);
const previewAnimationNames = computed(() =>
  form.animationNames
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
function serializedWeaponTransform(
  transform: ReturnType<typeof defaultWeaponTransform>,
): TowerDefenseEquipmentTransform {
  return {
    position: transform.position.map(Number) as [number, number, number],
    rotation: transform.rotation.map((angle) =>
      (Number(angle) * Math.PI) / 180,
    ) as [number, number, number],
    scale: Number(transform.scale),
  };
}
const leftWeaponPreviewTransform = computed(() =>
  serializedWeaponTransform(form.leftWeaponTransform),
);
const rightWeaponPreviewTransform = computed(() =>
  serializedWeaponTransform(form.rightWeaponTransform),
);

function resetWeaponTransform(side: "left" | "right") {
  const key = side === "left" ? "leftWeaponTransform" : "rightWeaponTransform";
  form[key] = defaultWeaponTransform();
}

function assetUrl(key: string | null) {
  if (!key) return "";
  return `/api/tower-defense/assets/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function multiplier(profile: Enemy["combat_profile"], group: "damageMultipliers" | "effectDurationMultipliers", key: string) {
  return profile[group]?.[key] ?? 1;
}

async function loadData() {
  loading.value = true;
  pageError.value = "";
  try {
    const [enemyResponse, assetResponse] = await Promise.all([
      api<{ data: Enemy[] }>("/api/admin/tower-defense/enemies"),
      api<{ data: Asset[] }>("/api/admin/tower-defense/assets"),
    ]);
    enemies.value = enemyResponse.data;
    assets.value = assetResponse.data;
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể tải danh mục quái.";
  } finally {
    loading.value = false;
  }
}

function resetForm(kind: EnemyKind = "normal") {
  Object.assign(form, {
    id: "",
    name: "",
    kind,
    modelAssetKey: "",
    avatarAssetKey: "",
    leftWeaponAssetKey: "",
    rightWeaponAssetKey: "",
    leftWeaponTransform: defaultWeaponTransform(),
    rightWeaponTransform: defaultWeaponTransform(),
    baseHealth: kind === "boss" ? 1000 : 100,
    baseSpeed: kind === "boss" ? 0.65 : 1,
    reward: kind === "boss" ? 200 : 10,
    castleDamage: kind === "boss" ? 5 : 1,
    summary: "",
    resistance: "Không",
    weakness: "Không",
    characterScale: kind === "boss" ? 1 : 2,
    sceneScale: kind === "boss" ? 1 : 0.494,
    healthBarY: kind === "boss" ? 2.5 : 1.85,
    animationNames: "Walk, Run",
    removeRootMotion: true,
    fireMultiplier: 1,
    waterMultiplier: 1,
    frostMultiplier: 1,
    thunderMultiplier: 1,
    archerMultiplier: 1,
    cannonMultiplier: 1,
    burnMultiplier: 1,
    slowMultiplier: 1,
    freezeMultiplier: 1,
    isActive: true,
  });
}

function openCreate(kind: EnemyKind = "normal") {
  editingId.value = null;
  resetForm(kind);
  formError.value = "";
  fieldErrors.value = {};
  dialog.value?.showModal();
}

function openEdit(enemy: Enemy) {
  editingId.value = enemy.id;
  Object.assign(form, {
    id: enemy.id,
    name: enemy.name,
    kind: enemy.kind,
    modelAssetKey: enemy.model_asset_key,
    avatarAssetKey: enemy.avatar_asset_key ?? "",
    leftWeaponAssetKey: enemy.left_weapon_asset_key ?? "",
    rightWeaponAssetKey: enemy.right_weapon_asset_key ?? "",
    leftWeaponTransform: editableWeaponTransform(
      enemy.model_configuration.leftWeaponTransform,
    ),
    rightWeaponTransform: editableWeaponTransform(
      enemy.model_configuration.rightWeaponTransform,
    ),
    baseHealth: enemy.base_health,
    baseSpeed: enemy.base_speed,
    reward: enemy.reward,
    castleDamage: enemy.castle_damage,
    summary: enemy.summary ?? "",
    resistance: enemy.resistance ?? "",
    weakness: enemy.weakness ?? "",
    characterScale: enemy.model_configuration.characterScale,
    sceneScale: enemy.model_configuration.sceneScale,
    healthBarY: enemy.model_configuration.healthBarY,
    animationNames: enemy.model_configuration.animationNames.join(", "),
    removeRootMotion: enemy.model_configuration.removeRootMotion ?? true,
    fireMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "fire"),
    waterMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "water"),
    frostMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "frost"),
    thunderMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "thunder"),
    archerMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "archer"),
    cannonMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "cannon"),
    burnMultiplier: multiplier(enemy.combat_profile, "effectDurationMultipliers", "burn"),
    slowMultiplier: multiplier(enemy.combat_profile, "effectDurationMultipliers", "slow"),
    freezeMultiplier: multiplier(enemy.combat_profile, "effectDurationMultipliers", "freeze"),
    isActive: enemy.is_active,
  });
  formError.value = "";
  fieldErrors.value = {};
  dialog.value?.showModal();
}

function compactMultipliers(values: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => Number(value) !== 1),
  );
}

async function submitForm() {
  if (saving.value) return;
  saving.value = true;
  formError.value = "";
  fieldErrors.value = {};
  const payload = {
    id: form.id,
    name: form.name,
    kind: form.kind,
    model_asset_key: form.modelAssetKey,
    avatar_asset_key: form.avatarAssetKey || null,
    left_weapon_asset_key: form.leftWeaponAssetKey || null,
    right_weapon_asset_key: form.rightWeaponAssetKey || null,
    base_health: Number(form.baseHealth),
    base_speed: Number(form.baseSpeed),
    reward: Number(form.reward),
    castle_damage: Number(form.castleDamage),
    summary: form.summary || null,
    resistance: form.resistance || null,
    weakness: form.weakness || null,
    model_configuration: {
      characterScale: Number(form.characterScale),
      sceneScale: Number(form.sceneScale),
      healthBarY: Number(form.healthBarY),
      animationNames: form.animationNames.split(",").map((name) => name.trim()).filter(Boolean),
      removeRootMotion: form.removeRootMotion,
      leftWeaponTransform: form.leftWeaponAssetKey
        ? serializedWeaponTransform(form.leftWeaponTransform)
        : undefined,
      rightWeaponTransform: form.rightWeaponAssetKey
        ? serializedWeaponTransform(form.rightWeaponTransform)
        : undefined,
    },
    combat_profile: {
      damageMultipliers: compactMultipliers({
        fire: form.fireMultiplier,
        water: form.waterMultiplier,
        frost: form.frostMultiplier,
        thunder: form.thunderMultiplier,
        archer: form.archerMultiplier,
        cannon: form.cannonMultiplier,
      }),
      effectDurationMultipliers: compactMultipliers({
        burn: form.burnMultiplier,
        slow: form.slowMultiplier,
        freeze: form.freezeMultiplier,
      }),
    },
    is_active: form.isActive,
  };
  try {
    await api(
      `/api/admin/tower-defense/enemies${editingId.value ? `/${editingId.value}` : ""}`,
      { method: editingId.value ? "PUT" : "POST", body: payload },
    );
    dialog.value?.close();
    await loadData();
  } catch (error: any) {
    formError.value = error?.data?.message || "Không thể lưu kẻ địch.";
    fieldErrors.value = error?.data?.errors || {};
  } finally {
    saving.value = false;
  }
}

async function deleteEnemy(enemy: Enemy) {
  if (!window.confirm(`Xóa “${enemy.name}” khỏi danh mục?`)) return;
  try {
    await api(`/api/admin/tower-defense/enemies/${enemy.id}`, { method: "DELETE" });
    enemies.value = enemies.value.filter((item) => item.id !== enemy.id);
  } catch (error: any) {
    pageError.value = error?.data?.message || "Không thể xóa kẻ địch.";
  }
}

watch(
  () => form.kind,
  () => {
    if (!modelAssets.value.some((asset) => asset.key === form.modelAssetKey))
      form.modelAssetKey = "";
    if (!avatarAssets.value.some((asset) => asset.key === form.avatarAssetKey))
      form.avatarAssetKey = "";
  },
);

onMounted(loadData);
</script>

<template>
  <main class="enemy-admin-page">
    <header class="enemy-header">
      <div><small>TOWER DEFENSE CMS</small><h1>Quái và boss</h1><p>Quản lý chỉ số, hồ sơ chiến đấu và tài nguyên hiển thị.</p></div>
      <div class="enemy-header-actions"><NuxtLink to="/admin/tower-defense">Map & tài nguyên</NuxtLink><button type="button" @click="loadData"><RefreshCw :class="{ spin: loading }" /> Làm mới</button><NuxtLink class="primary" to="/admin/tower-defense/enemies/new"><Plus /> Thêm kẻ địch</NuxtLink></div>
    </header>

    <section class="enemy-stats">
      <article><Skull /><div><strong>{{ enemies.length }}</strong><span>Tổng số</span></div></article>
      <article><Activity /><div><strong>{{ normalCount }}</strong><span>Lính thường</span></div></article>
      <article><Crown /><div><strong>{{ bossCount }}</strong><span>Boss</span></div></article>
      <article><Shield /><div><strong>{{ enemies.filter((enemy) => enemy.is_active).length }}</strong><span>Đang sử dụng</span></div></article>
    </section>

    <p v-if="pageError" class="enemy-alert">{{ pageError }}</p>

    <section class="enemy-panel">
      <header><div class="enemy-search"><Search /><input v-model="search" placeholder="Tìm theo tên hoặc mã…" /></div><select v-model="kindFilter"><option value="">Tất cả</option><option value="normal">Lính thường</option><option value="boss">Boss</option></select><NuxtLink class="enemy-add-link" to="/admin/tower-defense/enemies/new?kind=boss"><Crown /> Thêm boss</NuxtLink></header>
      <div v-if="loading" class="enemy-loading"><RefreshCw class="spin" /> Đang tải danh mục…</div>
      <div v-else class="enemy-grid">
        <article v-for="enemy in filteredEnemies" :key="enemy.id" class="enemy-card" :class="{ boss: enemy.kind === 'boss', inactive: !enemy.is_active }" :style="{ '--enemy-primary': enemy.display_configuration?.primaryColor ?? (enemy.kind === 'boss' ? '#f59e0b' : '#8b5cf6'), '--enemy-glow': enemy.display_configuration?.glowColor ?? (enemy.kind === 'boss' ? '#ef4444' : '#7c3aed') }">
          <div class="enemy-avatar"><img v-if="enemy.avatar_asset_key" :src="assetUrl(enemy.avatar_asset_key)" alt="" /><Skull v-else /></div>
          <div class="enemy-card-body"><div class="enemy-card-title"><span>{{ enemy.kind === 'boss' ? 'BOSS' : 'LÍNH THƯỜNG' }}</span><i :class="{ active: enemy.is_active }">{{ enemy.is_active ? 'Đang bật' : 'Đã tắt' }}</i></div><h2>{{ enemy.name }}</h2><code>{{ enemy.id }}</code><p>{{ enemy.summary || 'Chưa có mô tả.' }}</p><dl><div><dt>HP</dt><dd>{{ enemy.base_health }}</dd></div><div><dt>Tốc độ</dt><dd>{{ enemy.base_speed }}</dd></div><div><dt>Thưởng</dt><dd>{{ enemy.reward }}</dd></div><div><dt>Mất máu</dt><dd>{{ enemy.castle_damage }}</dd></div></dl><div class="enemy-traits"><span><b>Kháng</b>{{ enemy.resistance || 'Không' }}</span><span><b>Điểm yếu</b>{{ enemy.weakness || 'Không' }}</span></div></div>
          <footer><NuxtLink :to="`/admin/tower-defense/enemies/${encodeURIComponent(enemy.id)}`"><Pencil /> Sửa</NuxtLink><button class="danger" type="button" @click="deleteEnemy(enemy)"><Trash2 /> Xóa</button></footer>
        </article>
        <p v-if="filteredEnemies.length === 0" class="enemy-empty">Không tìm thấy kẻ địch phù hợp.</p>
      </div>
    </section>

    <Teleport v-if="false" to="body">
      <dialog ref="dialog" class="enemy-dialog" @cancel.prevent="!saving && dialog?.close()">
        <form @submit.prevent="submitForm">
          <header><div><small>{{ editingId ? 'CHỈNH SỬA' : 'TẠO MỚI' }}</small><h2>{{ form.kind === 'boss' ? 'Hồ sơ boss' : 'Hồ sơ lính thường' }}</h2></div><button type="button" @click="dialog?.close()"><X /></button></header>
          <div class="enemy-form">
            <fieldset><legend>Thông tin cơ bản</legend><div class="form-grid"><label><span>Loại</span><select v-model="form.kind"><option value="normal">Lính thường</option><option value="boss">Boss</option></select></label><label><span>Mã định danh</span><input v-model="form.id" :disabled="!!editingId" required placeholder="lava-overlord" /><small v-if="fieldErrors.id">{{ fieldErrors.id?.[0] }}</small></label><label><span>Tên</span><input v-model="form.name" required /><small v-if="fieldErrors.name">{{ fieldErrors.name?.[0] }}</small></label><label class="check"><input v-model="form.isActive" type="checkbox" /> Cho phép sử dụng</label><label class="wide"><span>Mô tả</span><textarea v-model="form.summary" rows="2" /></label><label><span>Kháng</span><input v-model="form.resistance" /></label><label><span>Điểm yếu</span><input v-model="form.weakness" /></label></div></fieldset>
            <fieldset>
              <legend>Tài nguyên và model</legend>
              <div class="enemy-resource-editor">
                <div class="form-grid">
                  <label class="wide"><span>Model</span><select v-model="form.modelAssetKey" required><option value="">Chọn model {{ form.kind === 'boss' ? 'boss' : 'lính' }}…</option><option v-for="asset in modelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select><small v-if="fieldErrors.model_asset_key">{{ fieldErrors.model_asset_key?.[0] }}</small></label>
                  <label class="wide"><span>Avatar</span><select v-model="form.avatarAssetKey"><option value="">Không có avatar</option><option v-for="asset in avatarAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
                  <label><span>Vũ khí tay trái (không bắt buộc)</span><select v-model="form.leftWeaponAssetKey"><option value="">Không trang bị</option><option v-for="asset in weaponAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select><small v-if="fieldErrors.left_weapon_asset_key">{{ fieldErrors.left_weapon_asset_key?.[0] }}</small></label>
                  <label><span>Vũ khí tay phải (không bắt buộc)</span><select v-model="form.rightWeaponAssetKey"><option value="">Không trang bị</option><option v-for="asset in weaponAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select><small v-if="fieldErrors.right_weapon_asset_key">{{ fieldErrors.right_weapon_asset_key?.[0] }}</small></label>
                  <div v-if="form.leftWeaponAssetKey || form.rightWeaponAssetKey" class="weapon-transform-panels wide">
                    <section v-if="form.leftWeaponAssetKey" class="weapon-transform-panel">
                      <header><div><small>TAY TRÁI</small><strong>Vị trí vũ khí</strong></div><button type="button" @click="resetWeaponTransform('left')">Đặt lại</button></header>
                      <div class="weapon-transform-group"><b>Vị trí</b><label><span>X</span><input v-model.number="form.leftWeaponTransform.position[0]" type="number" step="0.01" /></label><label><span>Y</span><input v-model.number="form.leftWeaponTransform.position[1]" type="number" step="0.01" /></label><label><span>Z</span><input v-model.number="form.leftWeaponTransform.position[2]" type="number" step="0.01" /></label></div>
                      <div class="weapon-transform-group"><b>Góc xoay (°)</b><label><span>X</span><input v-model.number="form.leftWeaponTransform.rotation[0]" type="number" step="1" /></label><label><span>Y</span><input v-model.number="form.leftWeaponTransform.rotation[1]" type="number" step="1" /></label><label><span>Z</span><input v-model.number="form.leftWeaponTransform.rotation[2]" type="number" step="1" /></label></div>
                      <label class="weapon-scale"><span>Tỉ lệ</span><input v-model.number="form.leftWeaponTransform.scale" type="number" min="0.05" step="0.05" /></label>
                    </section>
                    <section v-if="form.rightWeaponAssetKey" class="weapon-transform-panel is-right">
                      <header><div><small>TAY PHẢI</small><strong>Vị trí vũ khí</strong></div><button type="button" @click="resetWeaponTransform('right')">Đặt lại</button></header>
                      <div class="weapon-transform-group"><b>Vị trí</b><label><span>X</span><input v-model.number="form.rightWeaponTransform.position[0]" type="number" step="0.01" /></label><label><span>Y</span><input v-model.number="form.rightWeaponTransform.position[1]" type="number" step="0.01" /></label><label><span>Z</span><input v-model.number="form.rightWeaponTransform.position[2]" type="number" step="0.01" /></label></div>
                      <div class="weapon-transform-group"><b>Góc xoay (°)</b><label><span>X</span><input v-model.number="form.rightWeaponTransform.rotation[0]" type="number" step="1" /></label><label><span>Y</span><input v-model.number="form.rightWeaponTransform.rotation[1]" type="number" step="1" /></label><label><span>Z</span><input v-model.number="form.rightWeaponTransform.rotation[2]" type="number" step="1" /></label></div>
                      <label class="weapon-scale"><span>Tỉ lệ</span><input v-model.number="form.rightWeaponTransform.scale" type="number" min="0.05" step="0.05" /></label>
                    </section>
                  </div>
                  <label><span>Character scale</span><input v-model.number="form.characterScale" type="number" min="0.01" step="0.01" /></label>
                  <label><span>Scene scale</span><input v-model.number="form.sceneScale" type="number" min="0.01" step="0.001" /></label>
                  <label><span>Độ cao thanh máu</span><input v-model.number="form.healthBarY" type="number" step="0.05" /></label>
                  <label><span>Animation, cách nhau dấu phẩy</span><input v-model="form.animationNames" /></label>
                  <label class="check"><input v-model="form.removeRootMotion" type="checkbox" /> Loại bỏ root motion</label>
                </div>
                <ClientOnly>
                  <TowerDefenseEnemyModelPreview
                    :model-url="assetUrl(form.modelAssetKey)"
                    :avatar-url="assetUrl(form.avatarAssetKey)"
                    :left-weapon-url="assetUrl(form.leftWeaponAssetKey)"
                    :right-weapon-url="assetUrl(form.rightWeaponAssetKey)"
                    :left-weapon-transform="leftWeaponPreviewTransform"
                    :right-weapon-transform="rightWeaponPreviewTransform"
                    :animation-names="previewAnimationNames"
                    :character-scale="form.characterScale"
                    :scene-scale="form.sceneScale"
                    :remove-root-motion="form.removeRootMotion"
                  />
                  <template #fallback><div class="enemy-preview-fallback">Đang khởi tạo preview 3D…</div></template>
                </ClientOnly>
              </div>
            </fieldset>
            <fieldset><legend>Chỉ số gameplay</legend><div class="form-grid four"><label><span>Máu cơ bản</span><input v-model.number="form.baseHealth" type="number" min="1" /></label><label><span>Tốc độ</span><input v-model.number="form.baseSpeed" type="number" min="0.01" step="0.01" /></label><label><span>Vàng thưởng</span><input v-model.number="form.reward" type="number" min="0" /></label><label><span>Sát thương lâu đài</span><input v-model.number="form.castleDamage" type="number" min="1" /></label></div></fieldset>
            <fieldset><legend>Hệ số sát thương nhận vào — 1 là bình thường</legend><div class="form-grid six"><label><span>Lửa</span><input v-model.number="form.fireMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Nước</span><input v-model.number="form.waterMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Băng</span><input v-model.number="form.frostMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Sét</span><input v-model.number="form.thunderMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Cung</span><input v-model.number="form.archerMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Pháo</span><input v-model.number="form.cannonMultiplier" type="number" min="0" max="10" step="0.05" /></label></div></fieldset>
            <fieldset><legend>Hệ số thời lượng hiệu ứng — 0 là miễn nhiễm</legend><div class="form-grid"><label><span>Thiêu đốt</span><input v-model.number="form.burnMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Làm chậm</span><input v-model.number="form.slowMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Đóng băng</span><input v-model.number="form.freezeMultiplier" type="number" min="0" max="10" step="0.05" /></label></div></fieldset>
          </div>
          <p v-if="formError" class="enemy-alert">{{ formError }}</p>
          <footer><button type="button" @click="dialog?.close()">Hủy</button><button class="primary" type="submit" :disabled="saving">{{ saving ? 'Đang lưu…' : 'Lưu hồ sơ' }}</button></footer>
        </form>
      </dialog>
    </Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense-enemies.css"></style>
