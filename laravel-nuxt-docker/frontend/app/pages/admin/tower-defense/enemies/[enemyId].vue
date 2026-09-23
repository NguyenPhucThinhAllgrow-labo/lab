<script setup lang="ts">
import { ArrowLeft, Save } from "lucide-vue-next";
import type { TowerDefenseEquipmentTransform } from "~/types/games/towerDefense";

type EnemyKind = "normal" | "boss";
interface Asset { id: number; key: string; type: "model" | "image" | "sound"; purpose: string }
interface Enemy {
  id: string; name: string; kind: EnemyKind; model_asset_key: string;
  avatar_asset_key: string | null; left_weapon_asset_key: string | null;
  right_weapon_asset_key: string | null; base_health: number; base_speed: number;
  reward: number; castle_damage: number; summary: string | null;
  resistance: string | null; weakness: string | null; is_active: boolean;
  model_configuration: { characterScale: number; sceneScale: number; healthBarY: number; animationNames: string[]; removeRootMotion?: boolean; leftWeaponTransform?: TowerDefenseEquipmentTransform; rightWeaponTransform?: TowerDefenseEquipmentTransform };
  combat_profile: { damageMultipliers: Record<string, number>; effectDurationMultipliers: Record<string, number> };
}

const route = useRoute();
const router = useRouter();
const api = useApi();
const routeId = computed(() => String(route.params.enemyId));
const isCreating = computed(() => routeId.value === "new");
const loading = ref(true);
const saving = ref(false);
const pageError = ref("");
const formError = ref("");
const fieldErrors = ref<Record<string, string[]>>({});
const assets = ref<Asset[]>([]);

const defaultWeaponTransform = () => ({ position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: 1 });
const editableWeaponTransform = (value?: TowerDefenseEquipmentTransform) => ({
  position: [...(value?.position ?? [0, 0, 0])] as [number, number, number],
  rotation: (value?.rotation ?? [0, 0, 0]).map((angle) => angle * 180 / Math.PI) as [number, number, number],
  scale: value?.scale ?? 1,
});
const requestedKind: EnemyKind = route.query.kind === "boss" ? "boss" : "normal";
const form = reactive({
  id: "", name: "", kind: requestedKind, modelAssetKey: "", avatarAssetKey: "",
  leftWeaponAssetKey: "", rightWeaponAssetKey: "", leftWeaponTransform: defaultWeaponTransform(), rightWeaponTransform: defaultWeaponTransform(),
  baseHealth: requestedKind === "boss" ? 1000 : 100, baseSpeed: requestedKind === "boss" ? 0.65 : 1,
  reward: requestedKind === "boss" ? 200 : 10, castleDamage: requestedKind === "boss" ? 5 : 1,
  summary: "", resistance: "Không", weakness: "Không", characterScale: requestedKind === "boss" ? 1 : 2,
  sceneScale: requestedKind === "boss" ? 1 : 0.494, healthBarY: requestedKind === "boss" ? 2.5 : 1.85,
  animationNames: "Walk, Run", removeRootMotion: true, fireMultiplier: 1, waterMultiplier: 1,
  frostMultiplier: 1, thunderMultiplier: 1, archerMultiplier: 1, cannonMultiplier: 1,
  burnMultiplier: 1, slowMultiplier: 1, freezeMultiplier: 1, isActive: true,
});

useHead(() => ({ title: `${isCreating.value ? "Thêm" : "Sửa"} kẻ địch | Tower Defense Admin` }));
const modelAssets = computed(() => assets.value.filter((asset) => asset.purpose === (form.kind === "boss" ? "boss-model" : "enemy-model")));
const avatarAssets = computed(() => assets.value.filter((asset) => asset.purpose === (form.kind === "boss" ? "boss-avatar" : "enemy-avatar")));
const weaponAssets = computed(() => assets.value.filter((asset) => asset.purpose === "equipment-model" && /\.(glb|gltf)$/i.test(asset.key)));
const previewAnimationNames = computed(() => form.animationNames.split(",").map((name) => name.trim()).filter(Boolean));
const serializedWeaponTransform = (value: ReturnType<typeof defaultWeaponTransform>): TowerDefenseEquipmentTransform => ({
  position: value.position.map(Number) as [number, number, number],
  rotation: value.rotation.map((angle) => Number(angle) * Math.PI / 180) as [number, number, number],
  scale: Number(value.scale),
});
const leftWeaponPreviewTransform = computed(() => serializedWeaponTransform(form.leftWeaponTransform));
const rightWeaponPreviewTransform = computed(() => serializedWeaponTransform(form.rightWeaponTransform));
const assetUrl = (key: string | null) => key ? `/api/tower-defense/assets/${key.split("/").map(encodeURIComponent).join("/")}` : "";
const multiplier = (profile: Enemy["combat_profile"], group: keyof Enemy["combat_profile"], key: string) => profile[group]?.[key] ?? 1;

function fillForm(enemy: Enemy) {
  Object.assign(form, {
    id: enemy.id, name: enemy.name, kind: enemy.kind, modelAssetKey: enemy.model_asset_key,
    avatarAssetKey: enemy.avatar_asset_key ?? "", leftWeaponAssetKey: enemy.left_weapon_asset_key ?? "",
    rightWeaponAssetKey: enemy.right_weapon_asset_key ?? "", leftWeaponTransform: editableWeaponTransform(enemy.model_configuration.leftWeaponTransform),
    rightWeaponTransform: editableWeaponTransform(enemy.model_configuration.rightWeaponTransform), baseHealth: enemy.base_health,
    baseSpeed: enemy.base_speed, reward: enemy.reward, castleDamage: enemy.castle_damage, summary: enemy.summary ?? "",
    resistance: enemy.resistance ?? "", weakness: enemy.weakness ?? "", characterScale: enemy.model_configuration.characterScale,
    sceneScale: enemy.model_configuration.sceneScale, healthBarY: enemy.model_configuration.healthBarY,
    animationNames: enemy.model_configuration.animationNames.join(", "), removeRootMotion: enemy.model_configuration.removeRootMotion ?? true,
    fireMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "fire"), waterMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "water"),
    frostMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "frost"), thunderMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "thunder"),
    archerMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "archer"), cannonMultiplier: multiplier(enemy.combat_profile, "damageMultipliers", "cannon"),
    burnMultiplier: multiplier(enemy.combat_profile, "effectDurationMultipliers", "burn"), slowMultiplier: multiplier(enemy.combat_profile, "effectDurationMultipliers", "slow"),
    freezeMultiplier: multiplier(enemy.combat_profile, "effectDurationMultipliers", "freeze"), isActive: enemy.is_active,
  });
}

async function loadData() {
  loading.value = true;
  try {
    const requests = [api<{ data: Asset[] }>("/api/admin/tower-defense/assets")];
    const [assetResponse, enemyResponse] = await Promise.all([
      requests[0]!,
      isCreating.value ? Promise.resolve(null) : api<{ data: Enemy[] }>("/api/admin/tower-defense/enemies"),
    ]);
    assets.value = assetResponse.data;
    if (enemyResponse) {
      const enemy = enemyResponse.data.find((item) => item.id === routeId.value);
      if (!enemy) throw new Error("Không tìm thấy hồ sơ kẻ địch.");
      fillForm(enemy);
    }
  } catch (error: any) {
    pageError.value = error?.data?.message || error?.message || "Không thể tải dữ liệu chỉnh sửa.";
  } finally { loading.value = false }
}

function resetWeaponTransform(side: "left" | "right") {
  form[side === "left" ? "leftWeaponTransform" : "rightWeaponTransform"] = defaultWeaponTransform();
}
const compactMultipliers = (values: Record<string, number>) => Object.fromEntries(Object.entries(values).filter(([, value]) => Number(value) !== 1));
async function submitForm() {
  if (saving.value) return;
  saving.value = true; formError.value = ""; fieldErrors.value = {};
  const payload = {
    id: form.id, name: form.name, kind: form.kind, model_asset_key: form.modelAssetKey,
    avatar_asset_key: form.avatarAssetKey || null, left_weapon_asset_key: form.leftWeaponAssetKey || null,
    right_weapon_asset_key: form.rightWeaponAssetKey || null, base_health: Number(form.baseHealth), base_speed: Number(form.baseSpeed),
    reward: Number(form.reward), castle_damage: Number(form.castleDamage), summary: form.summary || null,
    resistance: form.resistance || null, weakness: form.weakness || null,
    model_configuration: { characterScale: Number(form.characterScale), sceneScale: Number(form.sceneScale), healthBarY: Number(form.healthBarY), animationNames: previewAnimationNames.value, removeRootMotion: form.removeRootMotion, leftWeaponTransform: form.leftWeaponAssetKey ? serializedWeaponTransform(form.leftWeaponTransform) : undefined, rightWeaponTransform: form.rightWeaponAssetKey ? serializedWeaponTransform(form.rightWeaponTransform) : undefined },
    combat_profile: { damageMultipliers: compactMultipliers({ fire: form.fireMultiplier, water: form.waterMultiplier, frost: form.frostMultiplier, thunder: form.thunderMultiplier, archer: form.archerMultiplier, cannon: form.cannonMultiplier }), effectDurationMultipliers: compactMultipliers({ burn: form.burnMultiplier, slow: form.slowMultiplier, freeze: form.freezeMultiplier }) },
    is_active: form.isActive,
  };
  try {
    await api(`/api/admin/tower-defense/enemies${isCreating.value ? "" : `/${routeId.value}`}`, { method: isCreating.value ? "POST" : "PUT", body: payload });
    await router.push("/admin/tower-defense/enemies");
  } catch (error: any) {
    formError.value = error?.data?.message || "Không thể lưu kẻ địch.";
    fieldErrors.value = error?.data?.errors || {};
  } finally { saving.value = false }
}

watch(() => form.kind, () => {
  if (!modelAssets.value.some((asset) => asset.key === form.modelAssetKey)) form.modelAssetKey = "";
  if (!avatarAssets.value.some((asset) => asset.key === form.avatarAssetKey)) form.avatarAssetKey = "";
});
onMounted(loadData);
</script>

<template>
  <main class="enemy-admin-page enemy-editor-page">
    <header class="enemy-header">
      <div><small>TOWER DEFENSE CMS</small><h1>{{ isCreating ? "Thêm kẻ địch" : `Chỉnh sửa ${form.name || routeId}` }}</h1><p>Thiết lập hồ sơ, model và chỉ số chiến đấu.</p></div>
      <div class="enemy-header-actions"><NuxtLink to="/admin/tower-defense/enemies"><ArrowLeft /> Quay lại danh sách</NuxtLink></div>
    </header>
    <div v-if="loading" class="enemy-loading">Đang tải dữ liệu…</div>
    <p v-else-if="pageError" class="enemy-alert">{{ pageError }}</p>
    <section v-else class="enemy-dialog enemy-editor-card">
      <form @submit.prevent="submitForm">
        <header><div><small>{{ isCreating ? 'TẠO MỚI' : 'CHỈNH SỬA' }}</small><h2>{{ form.kind === 'boss' ? 'Hồ sơ boss' : 'Hồ sơ lính thường' }}</h2></div></header>
        <div class="enemy-form">
          <fieldset><legend>Thông tin cơ bản</legend><div class="form-grid"><label><span>Loại</span><select v-model="form.kind"><option value="normal">Lính thường</option><option value="boss">Boss</option></select></label><label><span>Mã định danh</span><input v-model="form.id" :disabled="!isCreating" required placeholder="lava-overlord" /><small v-if="fieldErrors.id">{{ fieldErrors.id[0] }}</small></label><label><span>Tên</span><input v-model="form.name" required /><small v-if="fieldErrors.name">{{ fieldErrors.name[0] }}</small></label><label class="check"><input v-model="form.isActive" type="checkbox" /> Cho phép sử dụng</label><label class="wide"><span>Mô tả</span><textarea v-model="form.summary" rows="2" /></label><label><span>Kháng</span><input v-model="form.resistance" /></label><label><span>Điểm yếu</span><input v-model="form.weakness" /></label></div></fieldset>
          <fieldset><legend>Tài nguyên và model</legend><div class="enemy-resource-editor"><div class="form-grid">
            <label class="wide"><span>Model</span><select v-model="form.modelAssetKey" required><option value="">Chọn model…</option><option v-for="asset in modelAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select><small v-if="fieldErrors.model_asset_key">{{ fieldErrors.model_asset_key[0] }}</small></label>
            <label class="wide"><span>Avatar</span><select v-model="form.avatarAssetKey"><option value="">Không có avatar</option><option v-for="asset in avatarAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
            <label><span>Vũ khí tay trái</span><select v-model="form.leftWeaponAssetKey"><option value="">Không trang bị</option><option v-for="asset in weaponAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
            <label><span>Vũ khí tay phải</span><select v-model="form.rightWeaponAssetKey"><option value="">Không trang bị</option><option v-for="asset in weaponAssets" :key="asset.id" :value="asset.key">{{ asset.key }}</option></select></label>
            <div v-if="form.leftWeaponAssetKey || form.rightWeaponAssetKey" class="weapon-transform-panels wide">
              <section v-if="form.leftWeaponAssetKey" class="weapon-transform-panel"><header><div><small>TAY TRÁI</small><strong>Vị trí vũ khí</strong></div><button type="button" @click="resetWeaponTransform('left')">Đặt lại</button></header><div class="weapon-transform-group"><b>Vị trí</b><label v-for="(_, i) in 3" :key="i"><span>{{ ['X','Y','Z'][i] }}</span><input v-model.number="form.leftWeaponTransform.position[i]" type="number" step="0.01" /></label></div><div class="weapon-transform-group"><b>Góc xoay (°)</b><label v-for="(_, i) in 3" :key="i"><span>{{ ['X','Y','Z'][i] }}</span><input v-model.number="form.leftWeaponTransform.rotation[i]" type="number" step="1" /></label></div><label class="weapon-scale"><span>Tỉ lệ</span><input v-model.number="form.leftWeaponTransform.scale" type="number" min="0.05" step="0.05" /></label></section>
              <section v-if="form.rightWeaponAssetKey" class="weapon-transform-panel is-right"><header><div><small>TAY PHẢI</small><strong>Vị trí vũ khí</strong></div><button type="button" @click="resetWeaponTransform('right')">Đặt lại</button></header><div class="weapon-transform-group"><b>Vị trí</b><label v-for="(_, i) in 3" :key="i"><span>{{ ['X','Y','Z'][i] }}</span><input v-model.number="form.rightWeaponTransform.position[i]" type="number" step="0.01" /></label></div><div class="weapon-transform-group"><b>Góc xoay (°)</b><label v-for="(_, i) in 3" :key="i"><span>{{ ['X','Y','Z'][i] }}</span><input v-model.number="form.rightWeaponTransform.rotation[i]" type="number" step="1" /></label></div><label class="weapon-scale"><span>Tỉ lệ</span><input v-model.number="form.rightWeaponTransform.scale" type="number" min="0.05" step="0.05" /></label></section>
            </div>
            <label><span>Character scale</span><input v-model.number="form.characterScale" type="number" min="0.01" step="0.01" /></label><label><span>Scene scale</span><input v-model.number="form.sceneScale" type="number" min="0.01" step="0.001" /></label><label><span>Độ cao thanh máu</span><input v-model.number="form.healthBarY" type="number" step="0.05" /></label><label><span>Animation</span><input v-model="form.animationNames" /></label><label class="check"><input v-model="form.removeRootMotion" type="checkbox" /> Loại bỏ root motion</label>
          </div><ClientOnly><TowerDefenseEnemyModelPreview :model-url="assetUrl(form.modelAssetKey)" :avatar-url="assetUrl(form.avatarAssetKey)" :left-weapon-url="assetUrl(form.leftWeaponAssetKey)" :right-weapon-url="assetUrl(form.rightWeaponAssetKey)" :left-weapon-transform="leftWeaponPreviewTransform" :right-weapon-transform="rightWeaponPreviewTransform" :animation-names="previewAnimationNames" :character-scale="form.characterScale" :scene-scale="form.sceneScale" :remove-root-motion="form.removeRootMotion" /><template #fallback><div class="enemy-preview-fallback">Đang khởi tạo preview 3D…</div></template></ClientOnly></div></fieldset>
          <fieldset><legend>Chỉ số gameplay</legend><div class="form-grid four"><label><span>Máu cơ bản</span><input v-model.number="form.baseHealth" type="number" min="1" /></label><label><span>Tốc độ</span><input v-model.number="form.baseSpeed" type="number" min="0.01" step="0.01" /></label><label><span>Vàng thưởng</span><input v-model.number="form.reward" type="number" min="0" /></label><label><span>Sát thương lâu đài</span><input v-model.number="form.castleDamage" type="number" min="1" /></label></div></fieldset>
          <fieldset><legend>Hệ số sát thương nhận vào — 1 là bình thường</legend><div class="form-grid six"><label><span>Lửa</span><input v-model.number="form.fireMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Nước</span><input v-model.number="form.waterMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Băng</span><input v-model.number="form.frostMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Sét</span><input v-model.number="form.thunderMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Cung</span><input v-model.number="form.archerMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Pháo</span><input v-model.number="form.cannonMultiplier" type="number" min="0" max="10" step="0.05" /></label></div></fieldset>
          <fieldset><legend>Hệ số thời lượng hiệu ứng — 0 là miễn nhiễm</legend><div class="form-grid"><label><span>Thiêu đốt</span><input v-model.number="form.burnMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Làm chậm</span><input v-model.number="form.slowMultiplier" type="number" min="0" max="10" step="0.05" /></label><label><span>Đóng băng</span><input v-model.number="form.freezeMultiplier" type="number" min="0" max="10" step="0.05" /></label></div></fieldset>
        </div>
        <p v-if="formError" class="enemy-alert">{{ formError }}</p>
        <footer><NuxtLink to="/admin/tower-defense/enemies">Hủy</NuxtLink><button class="primary" type="submit" :disabled="saving"><Save /> {{ saving ? 'Đang lưu…' : 'Lưu hồ sơ' }}</button></footer>
      </form>
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/tower-defense-enemies.css"></style>
