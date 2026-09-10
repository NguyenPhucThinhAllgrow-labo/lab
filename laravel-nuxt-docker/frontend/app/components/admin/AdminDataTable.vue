<script setup lang="ts" generic="T">
import { RefreshCw } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  rows: T[]
  columns: string[]
  rowKey: (row: T) => string | number
  groups?: { key: string; title: string; rows: T[] }[]
  loading?: boolean
  error?: string
  emptyText?: string
  emptyDescription?: string
  title?: string
}>(), {
  loading: false, error: '', emptyText: 'Không có dữ liệu',
  emptyDescription: '', title: '',
})
const emit = defineEmits<{ retry: [] }>()
const showLoading = ref(false)
let loadingTimer: ReturnType<typeof setTimeout> | undefined
watch(() => props.loading, (loading) => {
  clearTimeout(loadingTimer)
  if (!loading) showLoading.value = false
  else loadingTimer = setTimeout(() => { showLoading.value = true }, 160)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(loadingTimer))
const sections = computed(() => props.groups ?? [{ key: 'all', title: '', rows: props.rows }])
</script>

<template>
  <section class="admin-data-table" :aria-label="title || undefined" :aria-busy="loading">
    <div v-if="error" class="admin-data-table__state is-error" role="alert">
      <strong>{{ error }}</strong><button type="button" :disabled="loading" @click="emit('retry')">Thử lại</button>
    </div>
    <div v-else-if="loading && !rows.length" class="admin-data-table__skeleton" role="status">
      <span class="sr-only">Đang tải dữ liệu...</span>
      <div v-for="row in 6" :key="row" class="admin-data-table__skeleton-row" aria-hidden="true">
        <i v-for="(column, index) in columns" :key="index"></i>
      </div>
    </div>
    <div v-else-if="!rows.length" class="admin-data-table__state"><strong>{{ emptyText }}</strong><span>{{ emptyDescription }}</span></div>
    <div v-else>
      <Transition name="table-loading">
        <div v-if="showLoading" class="admin-data-table__progress" role="status"><RefreshCw class="is-spinning" />Đang tải dữ liệu...</div>
      </Transition>
      <section v-for="group in sections" :key="group.key" :class="{ 'is-loading': showLoading }">
        <header v-if="group.title" class="admin-data-table__group"><h3>{{ group.title }}</h3><code>{{ group.key }}</code></header>
        <div class="admin-data-table__scroll">
          <table>
            <caption class="sr-only">{{ group.title || title || 'Danh sách dữ liệu' }}</caption>
            <thead><tr><th v-for="(column, index) in columns" :key="index" scope="col">{{ column }}</th></tr></thead>
            <tbody><tr v-for="(row, index) in group.rows" :key="rowKey(row)"><slot name="row" :row="row" :index="index" /></tr></tbody>
          </table>
        </div>
      </section>
    </div>

  </section>
</template>

<style scoped>
.admin-data-table { position: relative; min-width: 0; background: #11111b; }
.admin-data-table__scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { padding: 14px 20px; background: #ffffff03; color: #a1a1aa; font-size: 11px; font-weight: 600; white-space: nowrap; }
tbody :deep(td) { padding: 14px 20px; border-top: 1px solid #ffffff08; color: #d4d4d8; font-size: 12px; }
tbody tr:hover { background: #8b5cf606; }
.admin-data-table__state { display: flex; min-height: 220px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; color: #a1a1aa; font-size: 13px; text-align: center; }
.is-error { color: #fca5a5; }
.admin-data-table__state button { padding: 8px 14px; border: 1px solid currentColor; border-radius: 8px; }
.admin-data-table__progress { position: absolute; z-index: 2; top: 8px; right: 12px; border: 1px solid #c4b5fd30; border-radius: 8px; background: #1d192c; pointer-events: none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; color: #c4b5fd; font-size: 12px; }
.admin-data-table svg { width: 16px; height: 16px; }
.admin-data-table > div > section { transition: opacity 180ms ease; }
.is-loading { opacity: .8; }
.admin-data-table__group { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; color: #e4e4e7; font-size: 14px; }
.admin-data-table__group code { color: #a78bfa; font-size: 11px; }
button:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 3px; }
.is-spinning { animation: table-spin 1s linear infinite; }
@keyframes table-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .is-spinning { animation: none; } }
</style>

<style scoped>
.admin-data-table__skeleton { padding: 10px 20px; }
.admin-data-table__skeleton-row { display: flex; gap: 24px; align-items: center; height: 54px; border-bottom: 1px solid #ffffff08; }
.admin-data-table__skeleton-row i { height: 12px; flex: 1; border-radius: 4px; background: #ffffff09; animation: table-skeleton 1.6s ease-in-out infinite alternate; }
.admin-data-table__skeleton-row i:first-child { flex: .4; }
.table-loading-enter-active, .table-loading-leave-active { transition: opacity 150ms ease; }
.table-loading-enter-from, .table-loading-leave-to { opacity: 0; }
@keyframes table-skeleton { to { opacity: .4; } }
@media (prefers-reduced-motion: reduce) {
  .admin-data-table__skeleton-row i { animation: none; }
  .admin-data-table > div > section, .table-loading-enter-active, .table-loading-leave-active { transition: none; }
}
</style>
