<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import type { AdminPagination as Pagination } from "~/types/admin/table";

const props = withDefaults(defineProps<{
  pagination?: Pagination;
  page?: number;
  lastPage?: number;
  total?: number;
  loading?: boolean;
  itemLabel?: string;
}>(), { page: 1, lastPage: 1, total: 0, loading: false, itemLabel: "bản ghi" });
const emit = defineEmits<{ "page-change": [page: number]; change: [page: number] }>();
const currentPage = computed(() => props.pagination?.current_page ?? props.page);
const finalPage = computed(() => props.pagination?.last_page ?? props.lastPage);
const totalItems = computed(() => props.pagination?.total ?? props.total);

function changePage(page: number) {
  if (props.loading || page < 1 || page > finalPage.value || page === currentPage.value) return;
  emit("page-change", page);
  emit("change", page);
}
</script>

<template>
  <footer v-if="totalItems > 0" class="admin-pagination">
    <span v-if="pagination">Hiển thị {{ pagination.from ?? 0 }}–{{ pagination.to ?? 0 }} trong {{ totalItems }} {{ itemLabel }}</span>
    <span v-else>Trang {{ currentPage }}/{{ finalPage }} · {{ totalItems }} {{ itemLabel }}</span>
    <nav aria-label="Phân trang">
      <button type="button" aria-label="Trang trước" :disabled="loading || currentPage <= 1" @click="changePage(currentPage - 1)"><ChevronLeft /></button>
      <strong>{{ currentPage }} / {{ finalPage }}</strong>
      <button type="button" aria-label="Trang sau" :disabled="loading || currentPage >= finalPage" @click="changePage(currentPage + 1)"><ChevronRight /></button>
    </nav>
  </footer>
</template>

<style scoped>
.admin-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid #ffffff0d;
  border-radius: 12px;
  color: #a1a1aa;
  background: #111117;
  font-size: 13px;
}

.admin-pagination nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-pagination strong {
  min-width: 62px;
  padding: 0 8px;
  color: #e9d5ff;
  font-size: 13px;
  line-height: 38px;
  text-align: center;
  white-space: nowrap;
}

.admin-pagination button {
  display: grid;
  width: 38px;
  min-width: 38px;
  height: 38px;
  padding: 0;
  place-items: center;
  border: 1px solid #ffffff17;
  border-radius: 10px;
  color: #d8b4fe;
  background: #191820;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.admin-pagination button:not(:disabled):hover {
  border-color: #8b5cf680;
  background: #6d28d926;
  transform: translateY(-1px);
}

.admin-pagination button:disabled {
  color: #71717a;
  opacity: 0.45;
  cursor: not-allowed;
}

.admin-pagination button:focus-visible {
  outline: 2px solid #a78bfa;
  outline-offset: 2px;
}

.admin-pagination svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

@media (max-width: 560px) {
  .admin-pagination {
    justify-content: center;
    padding: 12px;
  }

  .admin-pagination > span {
    flex-basis: 100%;
    text-align: center;
  }
}
</style>
