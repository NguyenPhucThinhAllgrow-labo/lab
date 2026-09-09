<script setup lang="ts">
import { AlertTriangle, ArrowLeft, Check, Copy, DoorOpen, Flag, LoaderCircle, Pause, Play, RefreshCw, Swords, Trophy, Users, Wifi, WifiOff, X } from 'lucide-vue-next'

import type {
  ChineseChessMoveHistory,
  ChineseChessRoom,
  PieceColor,
} from '~/types/games/chinese-chess'
import type { ChineseChessRoomEvent } from '~/composables/useChineseChessRealtime'
import { isInCheck } from '~/utils/chinese-chess/check'

useHead({ title: 'Chinese Chess Online' })

const api = useApi()
const route = useRoute()
const router = useRouter()
const realtime = useChineseChessRealtime()

const room = ref<ChineseChessRoom | null>(null)
const roomCode = ref('')
const busy = ref(false)
const errorMessage = ref('')
const copied = ref(false)
const realtimeConnected = ref(false)
const timeoutSyncing = ref(false)
const receivedAt = ref(Date.now())
const clockTick = ref(Date.now())
const surrenderConfirmOpen = ref(false)
const surrenderResult = ref<{ title: string; message: string; won: boolean } | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null
let pollRequestPending = false
let pollingEnabled = false
let announcedFinishVersion: number | null = null
let realtimeTargetVersion = 0
let realtimeSyncPending = false

const gameStarted = computed(() => room.value?.status === 'playing' || room.value?.status === 'paused')
const isMyTurn = computed(() => room.value?.status === 'playing' && room.value.your_color === room.value.current_turn)
const isReady = computed(() => {
  if (!room.value?.your_color) return false
  return room.value.your_color === 'red' ? room.value.red_ready : room.value.black_ready
})
const opponentReady = computed(() => {
  if (!room.value?.your_color) return false
  return room.value.your_color === 'red' ? room.value.black_ready : room.value.red_ready
})
const checkedColor = computed<PieceColor | null>(() => {
  if (!room.value) return null
  if (isInCheck(room.value.board, 'red')) return 'red'
  if (isInCheck(room.value.board, 'black')) return 'black'
  return null
})
const redCaptured = computed(() => room.value?.move_history.filter(move => move.color === 'red' && move.captured).map(move => move.captured!) ?? [])
const blackCaptured = computed(() => room.value?.move_history.filter(move => move.color === 'black' && move.captured).map(move => move.captured!) ?? [])
const lastMove = computed(() => room.value?.move_history.at(-1) ?? null)
const rematchRequested = computed(() => room.value?.your_color === 'red' ? room.value.red_rematch : room.value?.black_rematch)

const statusText = computed(() => {
  if (!room.value) return ''
  if (room.value.status === 'waiting') {
    if (!room.value.black_player) return 'Đang chờ đối thủ'
    if (isReady.value) return 'Đang chờ đối thủ sẵn sàng'
    if (opponentReady.value) return 'Đối thủ đã sẵn sàng'
    return 'Hãy xác nhận sẵn sàng'
  }
  if (room.value.status === 'playing') return isMyTurn.value ? 'Đến lượt bạn' : 'Đang chờ đối thủ đi'
  if (room.value.status === 'paused') return `${room.value.paused_by?.name ?? 'Một người chơi'} đã tạm dừng`
  if (room.value.status === 'cancelled') return 'Phòng đã đóng'
  const reasons: Record<string, string> = {
    checkmate: 'Chiếu bí', stalemate: 'Bí nước', timeout: 'Hết giờ',
    surrender: 'Đầu hàng', player_left: 'Đối thủ rời phòng', host_left: 'Chủ phòng đã rời đi',
  }
  return room.value.winner
    ? `${room.value.winner.name} thắng · ${reasons[room.value.finish_reason ?? ''] ?? 'Kết thúc'}`
    : reasons[room.value.finish_reason ?? ''] ?? 'Ván đấu kết thúc'
})

function applyRoom(next: ChineseChessRoom, keepColor = false): void {
  if (room.value?.id === next.id && next.version < room.value.version) return

  const previousStatus = room.value?.status
  const ownColor = keepColor ? room.value?.your_color ?? null : next.your_color
  const updatedRoom = { ...next, your_color: next.your_color ?? ownColor }
  room.value = updatedRoom
  receivedAt.value = Date.now()
  errorMessage.value = ''

  if (updatedRoom.status === 'playing') surrenderResult.value = null

  if (
    (previousStatus === 'playing' || previousStatus === 'paused')
    && updatedRoom.status === 'finished'
    && updatedRoom.finish_reason === 'surrender'
    && announcedFinishVersion !== updatedRoom.version
  ) {
    announcedFinishVersion = updatedRoom.version
    const winnerColor: PieceColor = updatedRoom.winner?.id === updatedRoom.red_player.id ? 'red' : 'black'
    const won = updatedRoom.your_color === winnerColor
    const loser = winnerColor === 'red'
      ? updatedRoom.black_player
      : updatedRoom.red_player

    surrenderResult.value = won
      ? {
          title: 'Đối thủ đã đầu hàng',
          message: `${loser?.name ?? 'Đối thủ'} đã đầu hàng. Bạn giành chiến thắng ván đấu này.`,
          won: true,
        }
      : {
          title: 'Bạn đã đầu hàng',
          message: `${updatedRoom.winner?.name ?? 'Đối thủ'} giành chiến thắng ván đấu này.`,
          won: false,
        }
  }
}

function messageFrom(error: any): string {
  const errors = error?.data?.errors
  if (errors) return String(Object.values(errors).flat()[0] ?? 'Yêu cầu không hợp lệ.')
  return error?.data?.message ?? error?.message ?? 'Không thể kết nối máy chủ.'
}

async function createRoom(): Promise<void> {
  await request(async () => {
    const response = await api<{ room: ChineseChessRoom }>('/api/chinese-chess/rooms', { method: 'POST' })
    applyRoom(response.room)
    await enterRoom(response.room)
  })
}

async function joinRoom(): Promise<void> {
  const code = roomCode.value.trim().toUpperCase()
  if (!code) {
    errorMessage.value = 'Hãy nhập mã phòng.'
    return
  }
  await request(async () => {
    const response = await api<{ room: ChineseChessRoom }>(`/api/chinese-chess/rooms/${code}/join`, { method: 'POST' })
    applyRoom(response.room)
    await enterRoom(response.room)
  })
}

async function loadRoom(code = room.value?.code, silent = false): Promise<void> {
  if (!code || (busy.value && silent)) return
  try {
    const response = await api<{ room: ChineseChessRoom }>(`/api/chinese-chess/rooms/${code}`)
    applyRoom(response.room)
  } catch (error) {
    if (!silent) errorMessage.value = messageFrom(error)
  }
}

async function enterRoom(next: ChineseChessRoom): Promise<void> {
  roomCode.value = next.code
  await router.replace({ query: { room: next.code } })
  realtimeConnected.value = realtime.connect(next.id, syncRoomFromRealtime)
  startPolling()
}

async function syncRoomFromRealtime(event: ChineseChessRoomEvent): Promise<void> {
  if (!room.value || event.room_id !== room.value.id || event.version <= room.value.version) return

  realtimeTargetVersion = Math.max(realtimeTargetVersion, event.version)
  if (realtimeSyncPending) return

  realtimeSyncPending = true

  try {
    do {
      const requestedVersion = realtimeTargetVersion
      await loadRoom(room.value?.code, true)

      if (!room.value || room.value.version < requestedVersion) break
    } while (room.value.version < realtimeTargetVersion)
  } finally {
    realtimeSyncPending = false
  }
}

async function submitMove(move: ChineseChessMoveHistory): Promise<void> {
  if (!room.value || busy.value || !isMyTurn.value) return
  await request(async () => {
    const response = await api<{ room: ChineseChessRoom }>(`/api/chinese-chess/rooms/${room.value!.code}/moves`, {
      method: 'POST',
      body: { piece_id: move.piece.id, to: move.to, version: room.value!.version },
    })
    applyRoom(response.room)
  }, true)
}

async function markReady(): Promise<void> {
  if (!room.value || room.value.status !== 'waiting' || !room.value.black_player || isReady.value) return
  await request(async () => {
    const response = await api<{ room: ChineseChessRoom }>(`/api/chinese-chess/rooms/${room.value!.code}/ready`, { method: 'POST' })
    applyRoom(response.room)
  })
}

async function surrender(): Promise<void> {
  if (!room.value || !['playing', 'paused'].includes(room.value.status)) return
  surrenderConfirmOpen.value = true
}

async function togglePause(): Promise<void> {
  if (!room.value || !['playing', 'paused'].includes(room.value.status)) return
  await roomAction(room.value.status === 'paused' ? 'resume' : 'pause')
}

async function confirmSurrender(): Promise<void> {
  surrenderConfirmOpen.value = false
  await roomAction('surrender')
}

async function requestRematch(): Promise<void> {
  await roomAction('rematch')
}

async function leaveRoom(): Promise<void> {
  if (!room.value) return
  if (['playing', 'paused'].includes(room.value.status) && !confirm('Rời phòng khi đang chơi sẽ bị xử thua. Tiếp tục?')) return
  await request(async () => {
    await api(`/api/chinese-chess/rooms/${room.value!.code}/leave`, { method: 'POST' })
    resetLobby()
  })
}

async function roomAction(action: 'surrender' | 'rematch' | 'pause' | 'resume'): Promise<void> {
  if (!room.value) return
  await request(async () => {
    const response = await api<{ room: ChineseChessRoom }>(`/api/chinese-chess/rooms/${room.value!.code}/${action}`, { method: 'POST' })
    applyRoom(response.room)
  })
}

async function request(callback: () => Promise<void>, reloadOnError = false): Promise<void> {
  busy.value = true
  errorMessage.value = ''
  try {
    await callback()
  } catch (error) {
    errorMessage.value = messageFrom(error)
    if (reloadOnError) await loadRoom()
  } finally {
    busy.value = false
  }
}

function resetLobby(): void {
  realtime.disconnect()
  stopPolling()
  room.value = null
  roomCode.value = ''
  realtimeConnected.value = false
  surrenderConfirmOpen.value = false
  surrenderResult.value = null
  announcedFinishVersion = null
  realtimeTargetVersion = 0
  realtimeSyncPending = false
  router.replace({ query: {} })
}

async function copyCode(): Promise<void> {
  if (!room.value) return
  await navigator.clipboard.writeText(room.value.code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1600)
}

function displayedTime(color: PieceColor): number {
  if (!room.value) return 600
  const base = color === 'red' ? room.value.red_time_seconds : room.value.black_time_seconds
  if (room.value.status !== 'playing' || room.value.current_turn !== color) return base
  const elapsed = Math.floor((clockTick.value - receivedAt.value) / 1000)
  return Math.max(0, base - elapsed)
}

function timeText(color: PieceColor): string {
  const value = displayedTime(color)
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function positionText(move: ChineseChessMoveHistory): string {
  const columns = 'ABCDEFGHI'
  return `${columns[move.from.col]}${move.from.row + 1} → ${columns[move.to.col]}${move.to.row + 1}`
}

function pieceName(piece: ChineseChessMoveHistory['piece']): string {
  if (piece.type === 'general') return piece.color === 'red' ? '帥' : '將'
  if (piece.type === 'advisor') return piece.color === 'red' ? '仕' : '士'
  if (piece.type === 'elephant') return piece.color === 'red' ? '相' : '象'
  if (piece.type === 'soldier') return piece.color === 'red' ? '兵' : '卒'

  return {
    horse: '馬',
    chariot: '車',
    cannon: '炮',
  }[piece.type] ?? piece.type
}

function startPolling(): void {
  stopPolling()
  pollingEnabled = true
  schedulePoll()
}

function schedulePoll(): void {
  if (!pollingEnabled) return

  const active = room.value?.status === 'waiting' || room.value?.status === 'playing' || room.value?.status === 'paused'
  const delay = realtimeConnected.value ? 15000 : active ? 650 : 5000

  pollTimer = setTimeout(async () => {
    if (!pollRequestPending) {
      pollRequestPending = true
      await loadRoom(undefined, true)
      pollRequestPending = false
    }
    schedulePoll()
  }, delay)
}

function stopPolling(): void {
  pollingEnabled = false
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

watch(clockTick, async () => {
  if (!room.value || room.value.status !== 'playing' || timeoutSyncing.value) return
  if (displayedTime(room.value.current_turn) > 0) return

  timeoutSyncing.value = true
  await loadRoom(undefined, true)
  timeoutSyncing.value = false
})

onMounted(async () => {
  clockTimer = setInterval(() => { clockTick.value = Date.now() }, 1000)
  const code = typeof route.query.room === 'string' ? route.query.room.toUpperCase() : ''
  if (code) {
    roomCode.value = code
    await request(async () => {
      const response = await api<{ room: ChineseChessRoom }>(`/api/chinese-chess/rooms/${code}/join`, { method: 'POST' })
      applyRoom(response.room)
      await enterRoom(response.room)
    })
  }
})

onBeforeUnmount(() => {
  realtime.disconnect()
  stopPolling()
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <main class="online-chess">
    <div class="online-chess__glow" aria-hidden="true"></div>

    <header class="online-chess__header">
      <NuxtLink to="/games/chinese-chess" class="online-chess__back">
        <ArrowLeft :size="17" /> Chơi cục bộ
      </NuxtLink>
      <div>
        <span class="online-chess__eyebrow">REALTIME MATCH</span>
        <h1>Chinese Chess Online</h1>
      </div>
      <div class="online-chess__connection" :class="{ 'is-online': realtimeConnected }">
        <Wifi v-if="realtimeConnected" :size="15" />
        <WifiOff v-else :size="15" />
        {{ realtimeConnected ? 'Pusher realtime' : 'Polling fallback' }}
      </div>
    </header>

    <section v-if="!room" class="chess-lobby">
      <div class="chess-lobby__intro">
        <span class="chess-lobby__symbol">帥</span>
        <p class="online-chess__eyebrow">PRIVATE ROOM</p>
        <h2>Thi đấu cùng bạn bè</h2>
        <p>Tạo phòng riêng hoặc nhập mã được chia sẻ. Mỗi nước đi được xác thực và đồng bộ bởi máy chủ.</p>
        <ul>
          <li><Check :size="16" /> Khóa lượt và chống gửi nước đi trùng</li>
          <li><Check :size="16" /> Đồng hồ 10 phút đồng bộ phía server</li>
          <li><Check :size="16" /> Xử lý chiếu bí, đầu hàng và mất kết nối</li>
        </ul>
      </div>

      <div class="chess-lobby__actions">
        <button class="chess-button chess-button--primary" :disabled="busy" @click="createRoom">
          <LoaderCircle v-if="busy" class="animate-spin" :size="18" />
          <Swords v-else :size="18" /> Tạo phòng mới
        </button>
        <div class="chess-lobby__divider"><span>hoặc tham gia</span></div>
        <label for="room-code">Mã phòng</label>
        <div class="chess-lobby__join">
          <input id="room-code" v-model="roomCode" maxlength="8" placeholder="VD: XQ7K2P" @keyup.enter="joinRoom" />
          <button class="chess-button" :disabled="busy" @click="joinRoom">Vào phòng</button>
        </div>
        <p v-if="errorMessage" class="chess-error">{{ errorMessage }}</p>
      </div>
    </section>

    <template v-else>
      <section class="chess-roombar">
        <div>
          <span class="online-chess__eyebrow">ROOM CODE</span>
          <button class="chess-roombar__code" title="Sao chép mã phòng" @click="copyCode">
            {{ room.code }} <Check v-if="copied" :size="16" /><Copy v-else :size="16" />
          </button>
        </div>
        <div class="chess-roombar__status" :class="`is-${room.status}`"><span></span>{{ statusText }}</div>
        <button class="chess-button chess-button--danger-ghost" :disabled="busy" @click="leaveRoom">
          <DoorOpen :size="17" /> Rời phòng
        </button>
      </section>

      <p v-if="errorMessage" class="chess-error chess-error--room">{{ errorMessage }}</p>

      <section class="online-match">
        <aside class="match-panel match-panel--history">
          <div class="match-panel__title"><span>Lịch sử nước đi</span><b>{{ room.move_history.length }}</b></div>
          <div class="move-list">
            <p v-if="!room.move_history.length" class="match-empty">Chưa có nước đi nào</p>
            <div v-for="move in room.move_history" :key="move.number" class="move-item">
              <span>{{ move.number }}</span>
              <i :class="`is-${move.color}`"></i>
              <strong class="move-piece-token" :class="`is-${move.piece.color}`">{{ pieceName(move.piece) }}</strong>
              <small>{{ positionText(move) }}</small>
              <span class="move-item__result">
                <template v-if="move.captured">
                  <span class="move-capture-mark">×</span>
                  <strong class="move-piece-token is-captured" :class="`is-${move.captured.color}`">{{ pieceName(move.captured) }}</strong>
                </template>
                <strong v-if="move.is_check" class="move-check-badge" title="Nước đi này chiếu tướng">Chiếu</strong>
              </span>
            </div>
          </div>
          <div class="captured-block">
            <p>Quân đã ăn</p>
            <div><span>Đỏ</span><b v-for="piece in redCaptured" :key="piece.id" class="captured-piece-token" :class="`is-${piece.color}`">{{ pieceName(piece) }}</b><small v-if="!redCaptured.length">—</small></div>
            <div><span>Đen</span><b v-for="piece in blackCaptured" :key="piece.id" class="captured-piece-token" :class="`is-${piece.color}`">{{ pieceName(piece) }}</b><small v-if="!blackCaptured.length">—</small></div>
          </div>
        </aside>

        <section class="online-board-wrap">
          <div v-if="room.status === 'waiting'" class="board-overlay">
            <div class="board-waiting-card" aria-live="polite">
              <div class="board-waiting-card__icon" :class="{ 'is-ready': isReady }">
                <LoaderCircle v-if="!room.black_player" class="animate-spin" :size="24" />
                <Check v-else-if="isReady" :size="24" />
                <Swords v-else :size="24" />
              </div>
              <span class="board-waiting-card__eyebrow">PHÒNG {{ room.code }}</span>
              <h2>{{ !room.black_player ? 'Đang chờ đối thủ' : isReady ? 'Bạn đã sẵn sàng' : 'Sẵn sàng thi đấu?' }}</h2>
              <p v-if="!room.black_player">Chia sẻ mã phòng để mời thêm một người chơi.</p>
              <p v-else-if="isReady">Ván đấu tự động bắt đầu ngay khi đối thủ sẵn sàng.</p>
              <p v-else>{{ opponentReady ? 'Đối thủ đã sẵn sàng và đang chờ bạn.' : 'Xác nhận khi bạn đã sẵn sàng bắt đầu.' }}</p>

              <div v-if="room.black_player" class="board-waiting-card__players">
                <span :class="{ 'is-ready': room.red_ready }"><i></i> Quân Đỏ</span>
                <b>VS</b>
                <span :class="{ 'is-ready': room.black_ready }"><i></i> Quân Đen</span>
              </div>

              <button v-if="room.black_player" class="chess-button chess-button--ready" :disabled="busy || isReady" @click="markReady">
                <LoaderCircle v-if="busy" class="animate-spin" :size="17" />
                <Check v-else :size="17" /> {{ isReady ? 'Đã sẵn sàng' : 'Tôi đã sẵn sàng' }}
              </button>
            </div>
          </div>
          <div v-else-if="room.status === 'paused'" class="board-overlay board-overlay--paused">
            <div class="board-waiting-card pause-card" aria-live="polite">
              <div class="board-waiting-card__icon is-paused"><Pause :size="24" /></div>
              <span class="board-waiting-card__eyebrow">VÁN ĐẤU ĐANG TẠM DỪNG</span>
              <h2>Đồng hồ đã dừng</h2>
              <p><strong>{{ room.paused_by?.name ?? 'Một người chơi' }}</strong> đã tạm dừng ván đấu.</p>
              <button class="chess-button chess-button--resume" :disabled="busy" @click="togglePause">
                <LoaderCircle v-if="busy" class="animate-spin" :size="17" />
                <Play v-else :size="17" /> Tiếp tục ván đấu
              </button>
            </div>
          </div>
          <ChineseChessBoard
            :current-turn="room.current_turn"
            :game-started="gameStarted"
            :position="room.board"
            :player-color="room.your_color"
            :last-move="lastMove"
            :readonly="busy || room.status === 'paused'"
            :show-waiting-overlay="false"
            @move="submitMove"
          />
        </section>

        <aside class="match-panel match-panel--players">
          <div class="match-panel__title"><span>Người chơi</span><Users :size="17" /></div>
          <div class="player-card" :class="{ 'is-active': room.status === 'playing' && room.current_turn === 'black' }">
            <div class="player-avatar is-black">將</div>
            <div><span>QUÂN ĐEN</span><strong>{{ room.black_player?.name ?? 'Đang chờ...' }}</strong><em v-if="room.status === 'waiting' && room.black_player" :class="{ 'is-ready': room.black_ready }">{{ room.black_ready ? 'Đã sẵn sàng' : 'Chưa sẵn sàng' }}</em></div>
            <time>{{ timeText('black') }}</time>
          </div>
          <div class="match-versus">VS</div>
          <div class="player-card" :class="{ 'is-active': room.status === 'playing' && room.current_turn === 'red' }">
            <div class="player-avatar is-red">帥</div>
            <div><span>QUÂN ĐỎ</span><strong>{{ room.red_player.name }}</strong><em v-if="room.status === 'waiting'" :class="{ 'is-ready': room.red_ready }">{{ room.red_ready ? 'Đã sẵn sàng' : 'Chưa sẵn sàng' }}</em></div>
            <time>{{ timeText('red') }}</time>
          </div>

          <div class="match-notice" :class="{ 'is-mine': isMyTurn }">
            <Swords :size="18" />
            <div><strong>{{ statusText }}</strong><span v-if="checkedColor">Tướng {{ checkedColor === 'red' ? 'Đỏ' : 'Đen' }} đang bị chiếu</span></div>
          </div>

          <div class="match-actions">
            <button v-if="room.status === 'playing'" class="chess-button chess-button--pause" :disabled="busy" @click="togglePause"><Pause :size="17" /> Tạm dừng</button>
            <button v-if="room.status === 'paused'" class="chess-button chess-button--resume" :disabled="busy" @click="togglePause"><Play :size="17" /> Tiếp tục</button>
            <button v-if="room.status === 'playing' || room.status === 'paused'" class="chess-button chess-button--danger-ghost" :disabled="busy" @click="surrender">Đầu hàng</button>
            <button v-if="room.status === 'finished'" class="chess-button chess-button--primary" :disabled="busy || rematchRequested" @click="requestRematch">
              <RefreshCw :size="17" /> {{ rematchRequested ? 'Đang chờ đối thủ' : 'Sẵn sàng' }}
            </button>
          </div>
        </aside>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="chess-dialog">
        <div v-if="surrenderConfirmOpen" class="chess-dialog-backdrop" role="presentation" @click.self="surrenderConfirmOpen = false">
          <section class="chess-dialog" role="dialog" aria-modal="true" aria-labelledby="surrender-dialog-title">
            <button class="chess-dialog__close" aria-label="Đóng" @click="surrenderConfirmOpen = false"><X :size="18" /></button>
            <div class="chess-dialog__icon is-warning"><AlertTriangle :size="28" /></div>
            <span class="chess-dialog__eyebrow">XÁC NHẬN ĐẦU HÀNG</span>
            <h2 id="surrender-dialog-title">Bạn muốn kết thúc ván đấu?</h2>
            <p>Sau khi xác nhận, đối thủ sẽ được xử thắng và hành động này không thể hoàn tác.</p>
            <div class="chess-dialog__actions">
              <button class="chess-button" :disabled="busy" @click="surrenderConfirmOpen = false">Tiếp tục chơi</button>
              <button class="chess-button chess-button--danger" :disabled="busy" @click="confirmSurrender">
                <Flag :size="17" /> Xác nhận đầu hàng
              </button>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="chess-dialog">
        <div v-if="surrenderResult" class="chess-dialog-backdrop" role="presentation">
          <section class="chess-dialog chess-dialog--result" :class="{ 'is-winner': surrenderResult.won }" role="alertdialog" aria-modal="true" aria-labelledby="surrender-result-title">
            <button class="chess-dialog__close" aria-label="Đóng" @click="surrenderResult = null"><X :size="18" /></button>
            <div class="chess-dialog__icon" :class="surrenderResult.won ? 'is-winner' : 'is-finished'">
              <Trophy v-if="surrenderResult.won" :size="30" />
              <Flag v-else :size="28" />
            </div>
            <span class="chess-dialog__eyebrow">VÁN ĐẤU KẾT THÚC</span>
            <h2 id="surrender-result-title">{{ surrenderResult.title }}</h2>
            <p>{{ surrenderResult.message }}</p>
            <div class="chess-dialog__actions is-centered">
              <button class="chess-button chess-button--primary" @click="surrenderResult = null">Đã hiểu</button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/chinese-chess/online.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/history-pieces.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/ready.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/dialogs.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/typography.css"></style>
