<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { AdminPagination as Pagination } from '~/types/admin/table'
const props = withDefaults(defineProps<{
  pagination: Pagination
  loading?: boolean
  itemLabel?: string
}>(), { loading: false, itemLabel: 'bản ghi' })
const emit = defineEmits<{ 'page-change': [page: number] }>()
function changePage(page: number) {
  if (props.loading || page < 1 || page > props.pagination.last_page || page === props.pagination.current_page) return
  emit('page-change', page)
}
</script>
<template>
    <footer v-if="pagination.total > 0" class="admin-pagination">
      <span>Hiển thị {{ pagination.from ?? 0 }}–{{ pagination.to ?? 0 }} trong {{ pagination.total }} {{ itemLabel }}</span>
      <nav aria-label="Phân trang">
        <button type="button" aria-label="Trang trước" :disabled="loading || pagination.current_page <= 1" @click="changePage(pagination.current_page - 1)"><ChevronLeft /></button>
        <strong>{{ pagination.current_page }} / {{ pagination.last_page }}</strong>
        <button type="button" aria-label="Trang sau" :disabled="loading || pagination.current_page >= pagination.last_page" @click="changePage(pagination.current_page + 1)"><ChevronRight /></button>
      </nav>
    </footer>
</template>
<style scoped>
.admin-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 20px; border-top: 1px solid #ffffff0d; color: #a1a1aa; font-size: 12px; }
.admin-pagination nav { display: flex; align-items: center; gap: 12px; }
.admin-pagination button { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid #ffffff18; border-radius: 8px; }
.admin-pagination button:disabled { opacity: .35; cursor: not-allowed; }
button:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 3px; }
.admin-pagination svg { width: 16px; height: 16px; }
</style>
