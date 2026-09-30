<script setup lang="ts">
import { Check, ChevronDown, Search, X } from "lucide-vue-next";

interface AssetOption {
  id: string | number;
  key: string;
}

const props = withDefaults(defineProps<{
  modelValue?: string;
  assets: AssetOption[];
  placeholder?: string;
  clearLabel?: string;
  required?: boolean;
}>(), {
  placeholder: "Chọn tài nguyên…",
  clearLabel: "Không sử dụng",
  required: false,
  modelValue: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const root = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const query = ref("");
const selectedAsset = computed(() =>
  props.assets.find((asset) => asset.key === props.modelValue),
);
const filteredAssets = computed(() => {
  const term = query.value.trim().toLocaleLowerCase("vi");
  if (!term) return props.assets;
  return props.assets.filter((asset) =>
    asset.key.toLocaleLowerCase("vi").includes(term),
  );
});

function assetName(key: string) {
  return key.split("/").pop() || key;
}

async function toggle() {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) return;
  query.value = "";
  await nextTick();
  searchInput.value?.focus();
}

function choose(value: string) {
  emit("update:modelValue", value);
  isOpen.value = false;
  query.value = "";
}

function closeFromOutside(event: PointerEvent) {
  if (!root.value || event.composedPath().includes(root.value)) return;
  isOpen.value = false;
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || !isOpen.value) return;
  event.stopPropagation();
  isOpen.value = false;
}

onMounted(() => {
  document.addEventListener("pointerdown", closeFromOutside);
  document.addEventListener("keydown", handleEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeFromOutside);
  document.removeEventListener("keydown", handleEscape);
});
</script>

<template>
  <div ref="root" class="admin-asset-picker" :class="{ 'is-open': isOpen }">
    <button
      type="button"
      class="admin-asset-picker__trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span :class="{ 'is-placeholder': !selectedAsset }">
        <b>{{ selectedAsset ? assetName(selectedAsset.key) : placeholder }}</b>
        <small v-if="selectedAsset">{{ selectedAsset.key }}</small>
      </span>
      <ChevronDown />
    </button>

    <div v-if="isOpen" class="admin-asset-picker__menu">
      <div class="admin-asset-picker__search">
        <Search />
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="Tìm theo tên hoặc đường dẫn…"
          autocomplete="off"
        />
        <button v-if="query" type="button" aria-label="Xóa tìm kiếm" @click="query = ''"><X /></button>
      </div>
      <div class="admin-asset-picker__options" role="listbox">
        <button
          v-if="!required"
          type="button"
          class="is-clear"
          :class="{ 'is-selected': !modelValue }"
          @click="choose('')"
        >
          <span><b>{{ clearLabel }}</b><small>Bỏ tài nguyên đang chọn</small></span>
          <Check v-if="!modelValue" />
        </button>
        <button
          v-for="asset in filteredAssets"
          :key="asset.id"
          type="button"
          :class="{ 'is-selected': asset.key === modelValue }"
          @click="choose(asset.key)"
        >
          <span><b>{{ assetName(asset.key) }}</b><small>{{ asset.key }}</small></span>
          <Check v-if="asset.key === modelValue" />
        </button>
        <p v-if="filteredAssets.length === 0">Không tìm thấy tài nguyên phù hợp.</p>
      </div>
      <footer>{{ filteredAssets.length }} / {{ assets.length }} tài nguyên</footer>
    </div>
  </div>
</template>

<style scoped>
.admin-asset-picker { position: relative; min-width: 0; }
.admin-asset-picker__trigger {
  display: flex;
  width: 100%;
  min-height: 39px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
  background: #101018;
  color: #e4e4e7;
  text-align: left;
  cursor: pointer;
}
.is-open > .admin-asset-picker__trigger { border-color: rgb(139 92 246 / 65%); }
.admin-asset-picker__trigger > span,
.admin-asset-picker__options span { display: grid; min-width: 0; gap: 2px; }
.admin-asset-picker__trigger b,
.admin-asset-picker__options b { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.admin-asset-picker__trigger small,
.admin-asset-picker__options small { overflow: hidden; color: #71717a !important; font-size: 8px !important; font-weight: 500 !important; text-overflow: ellipsis; white-space: nowrap; }
.admin-asset-picker__trigger .is-placeholder b { color: #71717a; font-weight: 500; }
.admin-asset-picker__trigger > svg { width: 15px; flex: none; transition: transform 150ms ease; }
.is-open > .admin-asset-picker__trigger > svg { transform: rotate(180deg); }
.admin-asset-picker__menu {
  position: absolute;
  z-index: 300;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  min-width: min(440px, 80vw);
  overflow: hidden;
  border: 1px solid rgb(139 92 246 / 35%);
  border-radius: 10px;
  background: #111119;
  box-shadow: 0 18px 50px #000b;
}
.admin-asset-picker__search { display: grid; grid-template-columns: 18px minmax(0, 1fr) 24px; align-items: center; gap: 6px; padding: 8px; border-bottom: 1px solid #ffffff0d; }
.admin-asset-picker__search > svg { width: 15px; color: #8b5cf6; }
.admin-asset-picker__search input { width: 100%; height: 32px; padding: 0 8px; border: 1px solid #ffffff12; border-radius: 7px; background: #09090e; color: #f4f4f5; font-size: 10px; outline: none; }
.admin-asset-picker__search button { display: grid; width: 24px; height: 24px; padding: 0; place-items: center; border: 0; background: transparent; color: #71717a; cursor: pointer; }
.admin-asset-picker__search button svg { width: 13px; }
.admin-asset-picker__options { display: grid; overflow-y: auto; max-height: 250px; padding: 5px; }
.admin-asset-picker__options > button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 9px; border: 0; border-radius: 7px; background: transparent; color: #d4d4d8; text-align: left; cursor: pointer; }
.admin-asset-picker__options > button:hover { background: #ffffff0a; }
.admin-asset-picker__options > button.is-selected { background: rgb(139 92 246 / 14%); color: #ddd6fe; }
.admin-asset-picker__options > button.is-clear b { color: #a1a1aa; }
.admin-asset-picker__options > button > svg { width: 14px; flex: none; color: #a78bfa; }
.admin-asset-picker__options > p { margin: 0; padding: 22px 10px; color: #71717a; font-size: 9px; text-align: center; }
.admin-asset-picker__menu footer { padding: 6px 9px; border-top: 1px solid #ffffff0d; color: #52525b; font-size: 8px; text-align: right; }
@media (max-width: 680px) { .admin-asset-picker__menu { min-width: 100%; } }
</style>
