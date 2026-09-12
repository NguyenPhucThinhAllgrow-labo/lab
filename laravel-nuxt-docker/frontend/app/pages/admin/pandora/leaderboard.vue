<script setup lang="ts">
import AdminDataTable from '~/components/admin/AdminDataTable.vue'
import AdminFilterBar from '~/components/admin/AdminFilterBar.vue'
import AdminPagination from '~/components/admin/AdminPagination.vue'
import type { AdminPagination as Pagination } from '~/types/admin/table'
import {
  Award,
  Clock3,
  RefreshCw,
  Search,
  Target,
  Trophy,
  Users,
} from 'lucide-vue-next'

interface LeaderboardCase {
  id: string
  title: string
}

interface LeaderboardEntry {
  rank: number
  history_id: number
  player: {
    id: number | null
    name: string
    email: string | null
  }
  case: LeaderboardCase
  score: number
  grade: string
  elapsed_seconds: number
  hint_count: number
  incorrect_link_attempts: number
  command_count: number
  attempts: number
  completed_at: string | null
}

interface CompletionHistoryEntry {
  history_id: number
  run_id: string
  player: LeaderboardEntry['player']
  case: LeaderboardCase
  score: number
  grade: string
  elapsed_seconds: number
  hint_count: number
  incorrect_link_attempts: number
  command_count: number
  attempt_number: number
  started_at: string | null
  completed_at: string | null
}

interface LeaderboardData {
  summary: {
    players: number
    completions: number
    average_score: number
    average_elapsed_seconds: number
    best_score: number
  }
  cases: LeaderboardCase[]
}


interface PaginatedResponse<T> { data: { items: T[]; pagination: Pagination } }
interface BestResponse extends PaginatedResponse<LeaderboardEntry> { data: PaginatedResponse<LeaderboardEntry>['data'] & LeaderboardData }

useHead({ title: 'Pandora Ranking | Admin' })

const api = useApi()
const selectedCase = ref('')
const historyNameQuery = ref('')
const historyCase = ref('')
const bestLoading = ref(true)
const historyLoading = ref(true)
const errorMessage = ref('')
const historyError = ref('')
const leaderboard = ref<LeaderboardData | null>(null)
const bestEntries = ref<LeaderboardEntry[]>([])
const historyEntries = ref<CompletionHistoryEntry[]>([])
const emptyPagination = (): Pagination => ({ current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null })
const bestPagination = ref<Pagination>(emptyPagination())
const historyPagination = ref<Pagination>(emptyPagination())
const caseFilterOptions = computed(() => (leaderboard.value?.cases ?? []).map(item => ({
  value: item.id,
  label: item.title,
  meta: `[${item.id}]`,
})))

const summaryCards = computed(() => [
  {
    label: 'Người chơi',
    value: leaderboard.value?.summary.players ?? 0,
    detail: 'Đã hoàn thành ít nhất một case',
    icon: Users,
    tone: 'violet',
  },
  {
    label: 'Lượt hoàn thành',
    value: leaderboard.value?.summary.completions ?? 0,
    detail: 'Tổng số lượt được ghi nhận',
    icon: Target,
    tone: 'cyan',
  },
  {
    label: 'Điểm trung bình',
    value: leaderboard.value?.summary.average_score ?? 0,
    detail: `Cao nhất ${leaderboard.value?.summary.best_score ?? 0} điểm`,
    icon: Award,
    tone: 'amber',
  },
  {
    label: 'Thời gian trung bình',
    value: formatDuration(leaderboard.value?.summary.average_elapsed_seconds ?? 0),
    detail: 'Tính trên tất cả lượt chơi',
    icon: Clock3,
    tone: 'emerald',
  },
])

const leaderboardGroups = computed(() => {
  const groups = new Map<string, {
    case: LeaderboardCase
    entries: LeaderboardEntry[]
  }>()

  for (const entry of bestEntries.value) {
    const group = groups.get(entry.case.id)

    if (group) {
      group.entries.push(entry)
    } else {
      groups.set(entry.case.id, {
        case: entry.case,
        entries: [entry],
      })
    }
  }

  return [...groups.values()]
})

const tableGroups = computed(() => leaderboardGroups.value.map(group => ({ key: group.case.id, title: group.case.title, rows: group.entries })))

let bestRequest = 0
let historyRequest = 0

async function loadBest(page = bestPagination.value.current_page) {
  const request = ++bestRequest
  bestLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api<BestResponse>('/api/admin/pandora/leaderboard/best', {
      query: { case_id: selectedCase.value || undefined, locale: 'vi', page, per_page: bestPagination.value.per_page },
    })
    if (request !== bestRequest) return
    bestEntries.value = response.data.items
    bestPagination.value = response.data.pagination
    leaderboard.value = { summary: response.data.summary, cases: response.data.cases }
  } catch (error: any) {
    if (request !== bestRequest) return
    errorMessage.value = error?.data?.message || 'Không thể tải thành tích tốt nhất.'
  } finally {
    if (request === bestRequest) bestLoading.value = false
  }
}

async function loadHistory(page = historyPagination.value.current_page) {
  const request = ++historyRequest
  historyLoading.value = true
  historyError.value = ''
  try {
    const response = await api<PaginatedResponse<CompletionHistoryEntry>>('/api/admin/pandora/leaderboard/history', {
      query: {
        case_id: historyCase.value || undefined,
        search: historyNameQuery.value.trim() || undefined,
        locale: 'vi', page, per_page: historyPagination.value.per_page,
      },
    })
    if (request !== historyRequest) return
    historyEntries.value = response.data.items
    historyPagination.value = response.data.pagination
  } catch (error: any) {
    if (request !== historyRequest) return
    historyError.value = error?.data?.message || 'Không thể tải lịch sử lượt chơi.'
  } finally {
    if (request === historyRequest) historyLoading.value = false
  }
}

function refreshAll() {
  return Promise.all([loadBest(), loadHistory()])
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function rankClass(rank: number) {
  if (rank === 1) return 'is-first'
  if (rank === 2) return 'is-second'
  if (rank === 3) return 'is-third'
  return ''
}

let historySearchTimer: ReturnType<typeof setTimeout> | undefined
watch(selectedCase, () => loadBest(1))
watch(historyCase, () => loadHistory(1))
watch(historyNameQuery, () => {
  ++historyRequest
  clearTimeout(historySearchTimer)
  historySearchTimer = setTimeout(() => loadHistory(1), 300)
})
onMounted(() => Promise.all([loadBest(1), loadHistory(1)]))
onBeforeUnmount(() => { ++bestRequest; ++historyRequest; clearTimeout(historySearchTimer) })
</script>

<template>
  <main class="pandora-ranking">
    <header class="pandora-ranking__header">
      <div>
        <div class="pandora-ranking__eyebrow">
          <Trophy />
          PANDORA OPERATIONS
        </div>
        <h1>Bảng xếp hạng thám tử</h1>
        <p>Dữ liệu tổng hợp trực tiếp từ các lượt hoàn thành được lưu trong hệ thống.</p>
      </div>

      <button type="button" class="pandora-ranking__refresh" :disabled="bestLoading || historyLoading" @click="refreshAll">
        <RefreshCw :class="{ 'is-spinning': bestLoading || historyLoading }" />
        Làm mới
      </button>
    </header>

    <section class="pandora-ranking__stats">
      <article v-for="card in summaryCards" :key="card.label" class="ranking-stat" :class="`ranking-stat--${card.tone}`">
        <div class="ranking-stat__icon"><component :is="card.icon" /></div>
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.detail }}</small>
      </article>
    </section>

    <section class="rounded-2xl mt-[18px] border border-white/[0.06] bg-[#11111b]">
      <AdminFilterBar>
        <div>
          <h2>Thành tích tốt nhất</h2>
          <p>Mỗi người chơi chỉ lấy lượt tốt nhất trong từng case.</p>
        </div>

        <AdminFilterSelect
          v-model="selectedCase"
          :options="caseFilterOptions"
          placeholder="Tất cả case"
          aria-label="Lọc thành tích theo case"
          :loading="bestLoading"
        />
      </AdminFilterBar>
      <AdminDataTable
      title="Thành tích tốt nhất" :rows="bestEntries" :groups="tableGroups"
      :columns="['Hạng', 'Người chơi', 'Điểm', 'Thời gian', 'Hint', 'Nối sai', 'Lượt chơi', 'Hoàn thành']"
      :row-key="entry => entry.history_id" :loading="bestLoading" :error="errorMessage" empty-text="Chưa có thành tích" empty-description="Người chơi hoàn thành case sẽ xuất hiện tại đây." @retry="loadBest()"
    >
      <template #row="{ row: entry }">
                    <td>
                      <span
                        class="ranking-position"
                        :class="rankClass(entry.rank)"
                        :title="entry.rank <= 3 ? `Hạng ${entry.rank}` : undefined"
                      >
                        <Trophy v-if="entry.rank <= 3" aria-hidden="true" />
                        <template v-else>{{ entry.rank }}</template>
                      </span>
                    </td>
                    <td>
                      <div class="ranking-player">
                        <span>{{ entry.player.name.slice(0, 1).toUpperCase() }}</span>
                        <div><strong>{{ entry.player.name }}</strong><small>{{ entry.player.email || 'Không có email' }}</small></div>
                      </div>
                    </td>
                    <td><div class="ranking-score"><strong>{{ entry.score }}</strong><span :class="`grade-${entry.grade.toLowerCase()}`">{{ entry.grade }}</span></div></td>
                    <td class="ranking-mono">{{ formatDuration(entry.elapsed_seconds) }}</td>
                    <td>{{ entry.hint_count }}</td>
                    <td>{{ entry.incorrect_link_attempts }}</td>
                    <td>{{ entry.attempts }}</td>
                    <td class="ranking-date">{{ formatDate(entry.completed_at) }}</td>
                  </template>
    </AdminDataTable>
      <AdminPagination v-if="!errorMessage" :pagination="bestPagination" :loading="bestLoading" item-label="thành tích" @page-change="loadBest" />
    </section>

    <section class="pandora-ranking__history-panel rounded-2xl border border-white/[0.06] bg-[#11111b]" v-if="leaderboard">
      <AdminFilterBar>
        <div>
          <h2>Lịch sử tất cả lượt chơi</h2>
          <p>Mỗi dòng là một lần hoàn thành riêng biệt, mới nhất được hiển thị trước.</p>
        </div>

        <div class="pandora-ranking__history-tools">
          <label class="pandora-ranking__history-search">
            <Search />
            <input
              v-model="historyNameQuery"
              type="search"
              placeholder="Tìm tên hoặc email..."
              aria-label="Tìm lịch sử theo người chơi"
            >
          </label>

          <AdminFilterSelect
            v-model="historyCase"
            :options="caseFilterOptions"
            placeholder="Tất cả case"
            aria-label="Lọc lịch sử theo case"
            :loading="historyLoading"
          />

          <span class="pandora-ranking__history-count">
            {{ historyPagination.total }} lượt
          </span>
        </div>
      </AdminFilterBar>
      <AdminDataTable
      title="Lịch sử tất cả lượt chơi" :rows="historyEntries"
      :columns="['Lượt', 'Người chơi', 'Case', 'Điểm', 'Thời gian', 'Hint', 'Nối sai', 'Lệnh', 'Hoàn thành']"
      :row-key="entry => entry.history_id" :loading="historyLoading" :error="historyError" empty-text="Không tìm thấy lượt chơi phù hợp" empty-description="Thử thay đổi tên người chơi hoặc case đang lọc." @retry="loadHistory()"
    >
      <template #row="{ row: entry }">
                <td>
                  <span class="ranking-attempt">#{{ entry.attempt_number }}</span>
                </td>
                <td>
                  <div class="ranking-player">
                    <span>{{ entry.player.name.slice(0, 1).toUpperCase() }}</span>
                    <div><strong>{{ entry.player.name }}</strong><small>{{ entry.player.email || 'Không có email' }}</small></div>
                  </div>
                </td>
                <td><strong class="ranking-case">{{ entry.case.title }}</strong><small class="ranking-case-id">{{ entry.case.id }}</small></td>
                <td><div class="ranking-score"><strong>{{ entry.score }}</strong><span :class="`grade-${entry.grade.toLowerCase()}`">{{ entry.grade }}</span></div></td>
                <td class="ranking-mono">{{ formatDuration(entry.elapsed_seconds) }}</td>
                <td>{{ entry.hint_count }}</td>
                <td>{{ entry.incorrect_link_attempts }}</td>
                <td>{{ entry.command_count }}</td>
                <td class="ranking-date">{{ formatDate(entry.completed_at) }}</td>
              </template>
    </AdminDataTable>
      <AdminPagination v-if="!historyError" :pagination="historyPagination" :loading="historyLoading" item-label="lượt" @page-change="loadHistory" />
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/pandora/leaderboard.css"></style>
