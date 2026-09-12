<script setup lang="ts">
import { Play, RefreshCw, Search, Swords } from 'lucide-vue-next'
import ChineseChessReplay from '~/components/admin/ChineseChessReplay.vue'
import AdminDataTable from '~/components/admin/AdminDataTable.vue'
import AdminFilterBar from '~/components/admin/AdminFilterBar.vue'
import AdminPagination from '~/components/admin/AdminPagination.vue'
import type { AdminPagination as Pagination } from '~/types/admin/table'
interface Player { id: number; name: string }
interface Match {
  id: number; code: string; round_number: number; status: string
  red_player: Player | null; black_player: Player | null; winner: Player | null
  finish_reason: string | null; move_count: number; started_at: string | null; updated_at: string | null
}
useHead({ title: 'Lịch sử chơi cờ | Admin' })
const replayId = ref<number | null>(null)
const api = useApi()
const rows = ref<Match[]>([])
const pagination = ref<Pagination>({ current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null })
const loading = ref(true)
const error = ref('')
const search = ref('')
const status = ref('')
const statuses: Record<string, string> = { waiting: 'Chờ người chơi', playing: 'Đang chơi', paused: 'Tạm dừng', finished: 'Đã kết thúc', cancelled: 'Đã hủy' }
const reasons: Record<string, string> = { checkmate: 'Chiếu bí', stalemate: 'Bí nước', timeout: 'Hết giờ', surrender: 'Đầu hàng', player_left: 'Người chơi rời phòng', host_left: 'Chủ phòng rời đi' }
let sequence = 0
let timer: ReturnType<typeof setTimeout> | undefined
async function load(page = pagination.value.current_page) {
  const request = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await api<{ data: { items: Match[]; pagination: Pagination } }>('/api/admin/chinese-chess/history', {
      query: { page, per_page: 15, search: search.value.trim() || undefined, status: status.value || undefined },
    })
    if (request !== sequence) return
    rows.value = result.data.items
    pagination.value = result.data.pagination
  } catch (err: any) {
    if (request === sequence) error.value = err?.data?.message || 'Không thể tải lịch sử chơi cờ.'
  } finally {
    if (request === sequence) loading.value = false
  }
}
function date(value: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
}
watch([search, status], () => {
  ++sequence
  clearTimeout(timer)
  timer = setTimeout(() => load(1), 300)
})
onMounted(() => load(1))
onBeforeUnmount(() => { ++sequence; clearTimeout(timer) })
</script>

<template>
  <main class="chess-history">
    <header class="chess-history__header">
      <div><p><Swords :size="16" /> CHINESE CHESS</p><h1>Lịch sử chơi cờ</h1><span>Lịch sử từng ván đấu trong các phòng cờ online.</span></div>
      <button type="button" :disabled="loading" @click="load()"><RefreshCw :size="16" /> Làm mới</button>
    </header>
    <section class="chess-history__panel">
      <AdminFilterBar>
        <label class="chess-history__search"><Search :size="16" /><input v-model="search" type="search" placeholder="Tìm mã phòng hoặc người chơi..." aria-label="Tìm mã phòng hoặc người chơi"></label>
        <select v-model="status" aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option><option v-for="(label, key) in statuses" :key="key" :value="key">{{ label }}</option></select>
        <span>{{ pagination.total }} ván</span>
      </AdminFilterBar>
      <AdminDataTable title="Lịch sử chơi cờ" :rows="rows" :row-key="row => row.id"
        :columns="['Phòng / Ván', 'Quân Đỏ', 'Quân Đen', 'Trạng thái', 'Người thắng', 'Kết thúc', 'Số nước', 'Bắt đầu', 'Cập nhật', 'Phát lại']"
        :loading="loading" :error="error" empty-text="Không tìm thấy ván cờ" empty-description="Thử thay đổi từ khóa hoặc trạng thái." @retry="load()">
        <template #row="{ row }">
          <td><strong>{{ row.code }}</strong><small>Ván {{ row.round_number }}</small></td>
          <td><span class="is-red">{{ row.red_player?.name || '—' }}</span></td>
          <td>{{ row.black_player?.name || 'Chưa có người chơi' }}</td>
          <td><span class="status" :class="`status--${row.status}`">{{ statuses[row.status] || row.status }}</span></td>
          <td><span class="is-winner">{{ row.winner?.name || '—' }}</span></td>
          <td>{{ row.finish_reason ? reasons[row.finish_reason] || row.finish_reason : '—' }}</td>
          <td>{{ row.move_count }}</td><td>{{ date(row.started_at) }}</td><td>{{ date(row.updated_at) }}</td>
        <td><button type="button" :aria-label="`Phát lại phòng ${row.code}, ván ${row.round_number}`" @click="replayId = row.id"><Play :size="16" /></button></td>
        </template>
      </AdminDataTable>
      <AdminPagination v-if="!error" :pagination="pagination" :loading="loading" item-label="ván" @page-change="load" />
    </section>
    <ChineseChessReplay v-if="replayId !== null" :key="replayId" :round-id="replayId" @close="replayId = null" />
  </main>
</template>

<style scoped>
.chess-history { padding: 28px; color: #e4e4e7; }
.chess-history__header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.chess-history__header p { display: flex; align-items: center; gap: 8px; color: #c4b5fd; font-size: 11px; letter-spacing: .1em; }
h1 { margin: 10px 0; font-size: 28px; font-weight: 700; }
.chess-history__header span { color: #a1a1aa; font-size: 13px; }
.chess-history__panel { border: 1px solid #ffffff10; border-radius: 16px; background: #11111b; }
button, select, .chess-history__search { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #ffffff18; border-radius: 8px; background: #181824; font-size: 12px; }
button:disabled { opacity: .5; }
input { width: min(260px, 55vw); outline: none; background: transparent; }
small { display: block; margin-top: 4px; color: #a1a1aa; }
.is-red { color: #fca5a5; }.is-winner { color: #6ee7b7; }
.status { white-space: nowrap; }.status--playing, .status--finished { color: #6ee7b7; }.status--waiting, .status--paused { color: #fcd34d; }.status--cancelled { color: #fca5a5; }
@media(max-width: 640px) { .chess-history { padding: 16px; } }
</style>
