<script setup lang="ts">
import {
  Award,
  ChevronLeft,
  ChevronRight,
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

interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
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

async function loadBest(page = bestPagination.value.current_page) {
  bestLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api<BestResponse>('/api/admin/pandora/leaderboard/best', {
      query: { case_id: selectedCase.value || undefined, locale: 'vi', page, per_page: bestPagination.value.per_page },
    })
    bestEntries.value = response.data.items
    bestPagination.value = response.data.pagination
    leaderboard.value = { summary: response.data.summary, cases: response.data.cases }
  } catch (error: any) {
    errorMessage.value = error?.data?.message || 'Không thể tải thành tích tốt nhất.'
  } finally {
    bestLoading.value = false
  }
}

async function loadHistory(page = historyPagination.value.current_page) {
  historyLoading.value = true
  try {
    const response = await api<PaginatedResponse<CompletionHistoryEntry>>('/api/admin/pandora/leaderboard/history', {
      query: {
        case_id: historyCase.value || undefined,
        search: historyNameQuery.value.trim() || undefined,
        locale: 'vi', page, per_page: historyPagination.value.per_page,
      },
    })
    historyEntries.value = response.data.items
    historyPagination.value = response.data.pagination
  } catch (error: any) {
    errorMessage.value = error?.data?.message || 'Không thể tải lịch sử lượt chơi.'
  } finally {
    historyLoading.value = false
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
  clearTimeout(historySearchTimer)
  historySearchTimer = setTimeout(() => loadHistory(1), 300)
})
onMounted(() => Promise.all([loadBest(1), loadHistory(1)]))
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

    <section class="pandora-ranking__panel">
      <div class="pandora-ranking__toolbar">
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
      </div>

      <div v-if="errorMessage" class="pandora-ranking__error">
        <p>{{ errorMessage }}</p>
        <button type="button" @click="refreshAll">Thử lại</button>
      </div>

      <div v-else-if="bestLoading && !bestEntries.length" class="pandora-ranking__loading">
        <i v-for="row in 6" :key="row"></i>
      </div>

      <div v-else-if="!bestEntries.length" class="pandora-ranking__empty">
        <Trophy />
        <strong>Chưa có thành tích</strong>
        <span>Người chơi hoàn thành case sẽ xuất hiện tại đây.</span>
      </div>

      <div v-else class="pandora-ranking__table-area">
        <div v-if="bestLoading" class="pandora-ranking__filter-loading" role="status" aria-live="polite">
          <RefreshCw />
          <span>Đang lọc dữ liệu...</span>
        </div>

        <div class="pandora-ranking__boards" :class="{ 'is-filtering': bestLoading }">
          <section
            v-for="group in leaderboardGroups"
            :key="group.case.id"
            class="pandora-ranking__case-board"
          >
            <header class="pandora-ranking__case-heading">
              <div>
                <span>CASE RANKING</span>
                <h3>{{ group.case.title }}</h3>
              </div>
              <code>[{{ group.case.id }}]</code>
              <small>{{ group.entries.length }} người chơi</small>
            </header>

            <div class="pandora-ranking__table-wrap">
              <table class="pandora-ranking__table pandora-ranking__case-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Người chơi</th>
                    <th>Điểm</th>
                    <th>Thời gian</th>
                    <th>Hint</th>
                    <th>Nối sai</th>
                    <th>Lượt chơi</th>
                    <th>Hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in group.entries" :key="`${entry.player.id}-${entry.case.id}`">
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
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      <footer v-if="bestPagination.total" class="pandora-ranking__pagination">
        <span>Hiển thị {{ bestPagination.from }}–{{ bestPagination.to }} trong {{ bestPagination.total }} thành tích</span>
        <div>
          <button type="button" :disabled="bestPagination.current_page <= 1 || bestLoading" @click="loadBest(bestPagination.current_page - 1)"><ChevronLeft /></button>
          <strong>{{ bestPagination.current_page }} / {{ bestPagination.last_page }}</strong>
          <button type="button" :disabled="bestPagination.current_page >= bestPagination.last_page || bestLoading" @click="loadBest(bestPagination.current_page + 1)"><ChevronRight /></button>
        </div>
      </footer>
    </section>

    <section v-if="leaderboard" class="pandora-ranking__panel pandora-ranking__history-panel">
      <div class="pandora-ranking__toolbar">
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
      </div>

      <div v-if="!historyEntries.length && !historyLoading" class="pandora-ranking__empty pandora-ranking__empty--compact">
        <Clock3 />
        <strong>Không tìm thấy lượt chơi phù hợp</strong>
        <span>Thử thay đổi tên người chơi hoặc case đang lọc.</span>
      </div>

      <div v-else class="pandora-ranking__table-area">
        <div v-if="historyLoading" class="pandora-ranking__filter-loading" role="status" aria-live="polite">
          <RefreshCw />
          <span>Đang lọc lịch sử...</span>
        </div>

        <div class="pandora-ranking__table-wrap" :class="{ 'is-filtering': historyLoading }">
          <table class="pandora-ranking__table pandora-ranking__history-table">
            <thead>
              <tr>
                <th>Lượt</th>
                <th>Người chơi</th>
                <th>Case</th>
                <th>Điểm</th>
                <th>Thời gian</th>
                <th>Hint</th>
                <th>Nối sai</th>
                <th>Lệnh</th>
                <th>Hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in historyEntries" :key="entry.history_id">
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
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <footer v-if="historyPagination.total" class="pandora-ranking__pagination">
        <span>Hiển thị {{ historyPagination.from }}–{{ historyPagination.to }} trong {{ historyPagination.total }} lượt</span>
        <div>
          <button type="button" :disabled="historyPagination.current_page <= 1 || historyLoading" @click="loadHistory(historyPagination.current_page - 1)"><ChevronLeft /></button>
          <strong>{{ historyPagination.current_page }} / {{ historyPagination.last_page }}</strong>
          <button type="button" :disabled="historyPagination.current_page >= historyPagination.last_page || historyLoading" @click="loadHistory(historyPagination.current_page + 1)"><ChevronRight /></button>
        </div>
      </footer>
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/pandora/leaderboard.css"></style>
