<script setup lang="ts">
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-vue-next'

interface FilterSelectOption {
  value: string
  label: string
  meta?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: FilterSelectOption[]
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
  loading?: boolean
}>(), {
  placeholder: 'Tất cả',
  ariaLabel: 'Chọn bộ lọc',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const selectedOption = computed(() => props.options.find(option => option.value === props.modelValue))

function toggle() {
  if (!props.disabled && !props.loading) open.value = !open.value
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function closeOnOutsideClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

watch(() => props.disabled || props.loading, blocked => {
  if (blocked) open.value = false
})

onMounted(() => document.addEventListener('click', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutsideClick))
</script>

<template>
  <div ref="root" class="admin-filter-select" :class="{ 'is-open': open, 'is-loading': loading }">
    <button
      type="button"
      class="admin-filter-select__trigger"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :disabled="disabled || loading"
      @click="toggle"
      @keydown.esc="open = false"
    >
      <LoaderCircle v-if="loading" class="admin-filter-select__loading" />
      <Search v-else class="admin-filter-select__search" />
      <span class="admin-filter-select__value">
        <strong>{{ selectedOption?.label ?? placeholder }}</strong>
        <small v-if="selectedOption?.meta">{{ selectedOption.meta }}</small>
      </span>
      <ChevronDown class="admin-filter-select__chevron" />
    </button>

    <Transition name="filter-menu">
      <div v-if="open" class="admin-filter-select__menu" role="listbox" :aria-label="ariaLabel">
        <div class="admin-filter-select__caption">LỌC THEO CASE</div>
        <button
          type="button"
          role="option"
          class="admin-filter-select__option"
          :class="{ 'is-selected': modelValue === '' }"
          :aria-selected="modelValue === ''"
          @click="select('')"
        >
          <span><strong>{{ placeholder }}</strong><small>Hiển thị toàn bộ dữ liệu</small></span>
          <Check v-if="modelValue === ''" />
        </button>
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="option"
          class="admin-filter-select__option"
          :class="{ 'is-selected': modelValue === option.value }"
          :aria-selected="modelValue === option.value"
          @click="select(option.value)"
        >
          <span><strong>{{ option.label }}</strong><small>{{ option.meta }}</small></span>
          <Check v-if="modelValue === option.value" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-filter-select { position: relative; min-width: 270px; }
.admin-filter-select, .admin-filter-select * { box-sizing: border-box; }
.admin-filter-select__trigger { display: flex; width: 100%; height: 40px; align-items: center; gap: 10px; padding: 0 12px; border: 1px solid rgb(255 255 255 / 9%); border-radius: 11px; outline: 0; background: linear-gradient(180deg, #11111a, #0b0b12); color: #71717a; cursor: pointer; box-shadow: inset 0 1px rgb(255 255 255 / 2%); transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.admin-filter-select__trigger:hover:not(:disabled), .admin-filter-select.is-open .admin-filter-select__trigger { border-color: rgb(139 92 246 / 45%); background: #11111b; box-shadow: 0 0 0 3px rgb(139 92 246 / 8%); }
.admin-filter-select__trigger:disabled { cursor: wait; opacity: .65; }
.admin-filter-select__search, .admin-filter-select__loading { width: 14px; height: 14px; flex: none; }
.admin-filter-select__loading { color: #a78bfa; animation: filter-spin .8s linear infinite; }
.admin-filter-select__value { display: flex; min-width: 0; flex: 1; align-items: baseline; gap: 6px; text-align: left; }
.admin-filter-select__value strong { overflow: hidden; color: #e4e4e7; font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.admin-filter-select__value small { color: #52525b; font-family: monospace; font-size: 9px; white-space: nowrap; }
.admin-filter-select__chevron { width: 14px; height: 14px; flex: none; color: #52525b; transition: transform .18s ease, color .18s ease; }
.is-open .admin-filter-select__chevron { transform: rotate(180deg); color: #a78bfa; }
.admin-filter-select__menu { position: absolute; z-index: 20; top: calc(100% + 7px); right: 0; left: 0; width: 100%; max-height: 285px; overflow-y: auto; padding: 6px; border: 1px solid rgb(139 92 246 / 24%); border-radius: 12px; background: rgb(11 11 18 / 98%); box-shadow: 0 18px 45px rgb(0 0 0 / 55%), 0 0 0 1px rgb(255 255 255 / 2%); backdrop-filter: blur(16px); }
.admin-filter-select__caption { padding: 7px 10px 6px; color: #52525b; font-size: 8px; font-weight: 800; letter-spacing: .14em; }
.admin-filter-select__option { display: flex; width: 100%; align-items: center; gap: 12px; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: #71717a; cursor: pointer; text-align: left; transition: background .15s ease, color .15s ease; }
.admin-filter-select__option:hover { background: rgb(139 92 246 / 9%); }
.admin-filter-select__option.is-selected { background: linear-gradient(90deg, rgb(124 58 237 / 20%), rgb(79 70 229 / 8%)); color: #c4b5fd; }
.admin-filter-select__option > span { display: grid; min-width: 0; flex: 1; gap: 3px; }
.admin-filter-select__option strong { overflow: hidden; color: #d4d4d8; font-size: 10px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.admin-filter-select__option.is-selected strong { color: #ddd6fe; }
.admin-filter-select__option small { color: #52525b; font-family: monospace; font-size: 8px; }
.admin-filter-select__option svg { width: 13px; height: 13px; flex: none; color: #a78bfa; }
.filter-menu-enter-active, .filter-menu-leave-active { transition: opacity .14s ease, transform .14s ease; transform-origin: top right; }
.filter-menu-enter-from, .filter-menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
@keyframes filter-spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) { .admin-filter-select { width: 100%; min-width: 0; } }
</style>
