<script setup lang="ts">
import { AlertTriangle, ArrowLeft, Globe, Monitor, Play, RotateCcw, Swords, Trophy, Undo2, Users, X } from 'lucide-vue-next'
import {
  computed,
  onBeforeUnmount,
  ref,
} from 'vue'

import type {
  ChineseChessChaseRelation,
  ChineseChessPiece,
  ChineseChessRepetitionState,
  PieceColor,
} from '~/types/games/chinese-chess'
import { createInitialBoard } from '~/utils/chinese-chess/board'
import { isInCheck } from '~/utils/chinese-chess/check'
import { adjudicateRepetition, initialPositionHistory, recordPosition, type PositionRecord } from '~/utils/chinese-chess/repetition'

useHead({
  title: 'Chinese Chess',
})

/**
 * ==========================================
 * MOVE HISTORY
 * ==========================================
 */

interface MoveHistory {
  number: number
  color: PieceColor
  piece: ChineseChessPiece

  from: {
    row: number
    col: number
  }

  to: {
    row: number
    col: number
  }

  captured: ChineseChessPiece | null
  position: ChineseChessPiece[]
  is_check: boolean
  rule_action?: 'quiet' | 'check' | 'chase' | 'check_chase'
  chases?: ChineseChessChaseRelation[]
}

/**
 * ==========================================
 * GAME STATE
 * ==========================================
 */

const gameKey = ref(0)

const gameStarted =
  ref(false)

const gameOver =
  ref(false)

const currentTurn =
  ref<PieceColor>('red')

const winner =
  ref<PieceColor | null>(null)

const loser =
  ref<PieceColor | null>(null)

const winReason =
  ref<
    'checkmate' |
    'timeout' |
    'surrender' |
    'perpetual_check' |
    'perpetual_chase' |
    'perpetual_check_chase' |
    'repetition_draw' |
    null
  >(null)

/**
 * ==========================================
 * CHECK STATE
 * ==========================================
 */

const isCheck =
  ref(false)

const checkColor =
  ref<PieceColor | null>(
    null,
  )

/**
 * ==========================================
 * TIMER
 * ==========================================
 */

const INITIAL_TIME =
  10 * 60

const redTime =
  ref(INITIAL_TIME)

const blackTime =
  ref(INITIAL_TIME)

let timer:
  ReturnType<
    typeof setInterval
  > | null = null

/**
 * ==========================================
 * HISTORY
 * ==========================================
 */

const moveHistory =
  ref<MoveHistory[]>([])

const localBoard = ref(createInitialBoard())
const positionHistory = ref<PositionRecord[]>(initialPositionHistory(localBoard.value, 'red'))
const repetitionState = ref<ChineseChessRepetitionState>({ status: 'none', count: 1, obligated_color: null, reason: null })
const repetitionModal = ref(false)
const mobilePanel = ref<'history' | 'players' | null>(null)

function toggleMobilePanel(panel: 'history' | 'players'): void {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

/**
 * ==========================================
 * CAPTURED PIECES
 * ==========================================
 */

const redCaptured =
  ref<ChineseChessPiece[]>([])

const blackCaptured =
  ref<ChineseChessPiece[]>([])

const redUndosRemaining = ref(3)
const blackUndosRemaining = ref(3)
const lastMove = computed(() => moveHistory.value.at(-1) ?? null)
const undoRemaining = computed(() => lastMove.value?.color === 'black' ? blackUndosRemaining.value : redUndosRemaining.value)
const canUndo = computed(() => gameStarted.value && !gameOver.value && !!lastMove.value && undoRemaining.value > 0)

/**
 * ==========================================
 * TIMER TEXT
 * ==========================================
 */

const redTimeText =
  computed(() =>
    formatTime(
      redTime.value,
    ),
  )

const blackTimeText =
  computed(() =>
    formatTime(
      blackTime.value,
    ),
  )

function formatTime(
  totalSeconds: number,
): string {
  const minutes =
    Math.floor(
      totalSeconds / 60,
    )

  const seconds =
    totalSeconds % 60

  return `${String(
    minutes,
  ).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`
}

/**
 * ==========================================
 * PLAYER NAME
 * ==========================================
 */

const currentPlayerName =
  computed(() =>
    currentTurn.value === 'red'
      ? 'Đỏ'
      : 'Đen',
  )

const winnerName =
  computed(() => {
    if (
      winner.value === 'red'
    ) {
      return 'Đỏ'
    }

    if (
      winner.value === 'black'
    ) {
      return 'Đen'
    }

    return ''
  })

const loserName =
  computed(() => {
    if (
      loser.value === 'red'
    ) {
      return 'Đỏ'
    }

    if (
      loser.value === 'black'
    ) {
      return 'Đen'
    }

    return ''
  })

/**
 * ==========================================
 * CHECK PLAYER NAME
 * ==========================================
 */

const checkPlayerName =
  computed(() => {
    if (
      checkColor.value ===
      'red'
    ) {
      return 'Tướng Đỏ'
    }

    if (
      checkColor.value ===
      'black'
    ) {
      return 'Tướng Đen'
    }

    return ''
  })

/**
 * ==========================================
 * WIN REASON
 * ==========================================
 */

const winReasonText =
  computed(() => {
    switch (
      winReason.value
    ) {
      case 'checkmate':
        return 'Chiếu bí'

      case 'timeout':
        return 'Hết thời gian'

      case 'surrender':
        return 'Đầu hàng'

      case 'perpetual_check':
        return 'Thua do chiếu liên tục'

      case 'perpetual_chase':
        return 'Thua do đuổi quân liên tục'

      case 'perpetual_check_chase':
        return 'Thua do chiếu và đuổi quân liên tục'

      case 'repetition_draw':
        return 'Hòa do lặp lại thế cờ'

      default:
        return ''
    }
  })

/**
 * ==========================================
 * PIECE NAME
 * ==========================================
 */

function getPieceName(
  piece: ChineseChessPiece,
): string {
  const names: Record<
    ChineseChessPiece['type'],
    string
  > = {
    general: 'Tướng',
    advisor: 'Sĩ',
    elephant: 'Tượng',
    horse: 'Mã',
    chariot: 'Xe',
    cannon: 'Pháo',
    soldier: 'Tốt',
  }

  return names[piece.type]
}

/**
 * ==========================================
 * PIECE SYMBOL
 * ==========================================
 */

function getPieceSymbol(
  piece: ChineseChessPiece,
): string {
  const symbols: Record<
    ChineseChessPiece['type'],
    string
  > = {
    general:
      piece.color === 'red'
        ? '帥'
        : '將',

    advisor:
      piece.color === 'red'
        ? '仕'
        : '士',

    elephant:
      piece.color === 'red'
        ? '相'
        : '象',

    horse: '馬',

    chariot: '車',

    cannon: '炮',

    soldier:
      piece.color === 'red'
        ? '兵'
        : '卒',
  }

  return symbols[piece.type]
}

/**
 * ==========================================
 * POSITION TEXT
 * ==========================================
 */

function getPositionText(
  row: number,
  col: number,
): string {
  const columns = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
  ]

  return `${columns[col]}${row + 1}`
}

/**
 * ==========================================
 * MOVE TEXT
 * ==========================================
 */

function getMoveText(
  move: MoveHistory,
): string {
  const from =
    getPositionText(
      move.from.row,
      move.from.col,
    )

  const to =
    getPositionText(
      move.to.row,
      move.to.col,
    )

  return `${from} → ${to}`
}

/**
 * ==========================================
 * CHECK
 * ==========================================
 */

function handleCheck(
  checked: boolean,
  color: PieceColor | null,
) {
  isCheck.value = checked
  checkColor.value = color
}

/**
 * ==========================================
 * TIMER
 * ==========================================
 */

function stopTimer() {
  if (
    timer !== null
  ) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()

  timer = setInterval(() => {
    if (
      !gameStarted.value ||
      gameOver.value
    ) {
      stopTimer()

      return
    }

    if (
      currentTurn.value ===
      'red'
    ) {
      if (
        redTime.value <= 0
      ) {
        redTime.value = 0

        finishGame(
          'black',
          'timeout',
        )

        return
      }

      redTime.value--

      if (
        redTime.value <= 0
      ) {
        redTime.value = 0

        finishGame(
          'black',
          'timeout',
        )
      }

      return
    }

    if (
      currentTurn.value ===
      'black'
    ) {
      if (
        blackTime.value <= 0
      ) {
        blackTime.value = 0

        finishGame(
          'red',
          'timeout',
        )

        return
      }

      blackTime.value--

      if (
        blackTime.value <= 0
      ) {
        blackTime.value = 0

        finishGame(
          'red',
          'timeout',
        )
      }
    }
  }, 1000)
}

/**
 * ==========================================
 * FINISH GAME
 * ==========================================
 */

function finishGame(
  winningColor: PieceColor | null,
  reason:
    | 'checkmate'
    | 'timeout'
    | 'surrender'
    | 'perpetual_check'
    | 'perpetual_chase'
    | 'perpetual_check_chase'
    | 'repetition_draw',
) {
  stopTimer()

  gameOver.value = true

  winner.value =
    winningColor

  loser.value = winningColor ? (winningColor === 'red' ? 'black' : 'red') : null

  winReason.value =
    reason
}

/**
 * ==========================================
 * START GAME
 * ==========================================
 */

function startGame() {
  if (
    gameStarted.value &&
    !gameOver.value
  ) {
    return
  }

  gameStarted.value = true

  gameOver.value = false

  currentTurn.value = 'red'

  winner.value = null

  loser.value = null

  winReason.value = null

  isCheck.value = false

  checkColor.value = null

  localBoard.value = createInitialBoard()
  positionHistory.value = initialPositionHistory(localBoard.value, 'red')
  repetitionState.value = { status: 'none', count: 1, obligated_color: null, reason: null }
  repetitionModal.value = false
  redUndosRemaining.value = 3
  blackUndosRemaining.value = 3

  startTimer()
}

/**
 * ==========================================
 * RESTART
 * ==========================================
 */

function restartGame() {
  stopTimer()

  /**
   * Tạo ChineseChessBoard mới.
   */

  gameKey.value++

  /**
   * Reset trạng thái.
   */

  gameStarted.value = false

  gameOver.value = false

  currentTurn.value = 'red'

  winner.value = null

  loser.value = null

  winReason.value = null

  /**
   * Reset check.
   */

  isCheck.value = false

  checkColor.value = null

  /**
   * Reset timer.
   */

  redTime.value =
    INITIAL_TIME

  blackTime.value =
    INITIAL_TIME

  /**
   * Reset lịch sử.
   */

  moveHistory.value = []

  /**
   * Reset quân đã ăn.
   */

  redCaptured.value = []

  blackCaptured.value = []

  localBoard.value = createInitialBoard()
  positionHistory.value = initialPositionHistory(localBoard.value, 'red')
  repetitionState.value = { status: 'none', count: 1, obligated_color: null, reason: null }
  repetitionModal.value = false
  redUndosRemaining.value = 3
  blackUndosRemaining.value = 3
}

/**
 * ==========================================
 * HANDLE MOVE
 * ==========================================
 */

function handleMove(
  move: MoveHistory,
) {
  if (
    gameOver.value
  ) {
    return
  }

  const nextTurn: PieceColor = move.color === 'red' ? 'black' : 'red'
  const repetition = recordPosition(
    positionHistory.value,
    localBoard.value,
    move.position,
    move.piece,
    nextTurn,
    moveHistory.value.length + 1,
  )

  if (repetition.state.count >= 3 && repetition.state.obligated_color === move.color) {
    repetitionState.value = repetition.state
    repetitionModal.value = true
    return
  }

  positionHistory.value = repetition.history
  repetitionState.value = repetition.state
  localBoard.value = move.position.map(piece => ({ ...piece }))

  moveHistory.value.push({
    ...move,
    is_check: repetition.record.gave_check,
    rule_action: repetition.record.action,
    chases: repetition.record.chases,

    number:
      moveHistory.value.length +
      1,
  })

  /**
   * Lưu quân bị ăn.
   */

  if (
    move.captured
  ) {
    if (
      move.color === 'red'
    ) {
      redCaptured.value.push(
        move.captured,
      )
    } else {
      blackCaptured.value.push(
        move.captured,
      )
    }
  }

  /**
   * Đổi lượt.
   */

  currentTurn.value = nextTurn

  if (repetition.state.status === 'draw') {
    finishGame(null, 'repetition_draw')
    return
  }

  /**
   * Timer chuyển sang người mới.
   */

  startTimer()
}

function undoLastMove(): void {
  if (!canUndo.value) return

  const move = moveHistory.value.pop()
  if (!move) return

  if (move.color === 'red') {
    redUndosRemaining.value--
    if (move.captured) redCaptured.value.pop()
  } else {
    blackUndosRemaining.value--
    if (move.captured) blackCaptured.value.pop()
  }

  const previous = moveHistory.value.at(-1)?.position ?? createInitialBoard()
  localBoard.value = previous.map(piece => ({ ...piece }))
  positionHistory.value = positionHistory.value.slice(0, -1)
  if (!positionHistory.value.length) {
    positionHistory.value = initialPositionHistory(localBoard.value, move.color)
  }
  repetitionState.value = adjudicateRepetition(positionHistory.value)
  repetitionModal.value = false
  currentTurn.value = move.color
  isCheck.value = isInCheck(localBoard.value, move.color)
  checkColor.value = isCheck.value ? move.color : null
  startTimer()
}

/**
 * ==========================================
 * CHECKMATE
 * ==========================================
 */

function handleCheckmate(
  winningColor: PieceColor,
) {
  if (gameOver.value) return
  finishGame(
    winningColor,
    'checkmate',
  )
}

/**
 * ==========================================
 * SURRENDER
 * ==========================================
 */

function surrender() {
  if (
    !gameStarted.value ||
    gameOver.value
  ) {
    return
  }

  const winningColor:
    PieceColor =
      currentTurn.value === 'red'
        ? 'black'
        : 'red'

  finishGame(
    winningColor,
    'surrender',
  )
}

/**
 * ==========================================
 * CLEANUP
 * ==========================================
 */

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <main class="online-chess local-chess">
    <div class="online-chess__glow" aria-hidden="true"></div>
    <header class="online-chess__header">
      <NuxtLink to="/" class="online-chess__back"><ArrowLeft :size="16" /> Trang chủ</NuxtLink>
      <div><span class="online-chess__eyebrow">CHINESE CHESS</span><h1>Cờ Tướng</h1></div>
      <span class="online-chess__connection"><Monitor :size="16" /> Cùng thiết bị</span>
    </header>

    <section class="chess-roombar">
      <div>
        <span class="online-chess__eyebrow">CHƠI CÙNG THIẾT BỊ</span>
        <p class="local-chess__subtitle">Hai người chơi · 10 phút mỗi bên</p>
      </div>
      <div class="chess-roombar__status" :class="gameStarted && !gameOver ? 'is-playing' : 'is-waiting'">
        <span></span>{{ gameOver ? 'Ván đấu kết thúc' : gameStarted ? `Lượt quân ${currentPlayerName}` : 'Sẵn sàng bắt đầu' }}
      </div>
      <NuxtLink to="/games/chinese-chess/online" class="chess-button"><Globe :size="17" /><span>Chơi online với bạn bè</span></NuxtLink>
    </section>

    <section class="online-match">
      <nav class="mobile-chess-toolbar" aria-label="Thông tin ván đấu">
        <div>
          <strong>{{ gameOver ? 'Đã kết thúc' : gameStarted ? `Lượt ${currentPlayerName}` : 'Chưa bắt đầu' }}</strong>
          <small>Đen {{ blackTimeText }} · Đỏ {{ redTimeText }}</small>
        </div>
        <button type="button" :class="{ 'is-active': mobilePanel === 'history' }" @click="toggleMobilePanel('history')">Lịch sử <b>{{ moveHistory.length }}</b></button>
        <button type="button" :class="{ 'is-active': mobilePanel === 'players' }" @click="toggleMobilePanel('players')">Trận đấu</button>
      </nav>

      <aside class="match-panel match-panel--history" :class="{ 'is-mobile-open': mobilePanel === 'history' }">
        <div class="match-panel__title"><span>Lịch sử nước đi</span><b>{{ moveHistory.length }}</b><button type="button" class="mobile-panel-close" aria-label="Đóng lịch sử" @click="mobilePanel = null"><X :size="16" /></button></div>
        <div class="move-list">
          <p v-if="!moveHistory.length" class="match-empty">Chưa có nước đi nào</p>
          <div v-for="move in moveHistory" :key="`${move.number}-${move.piece.id}`" class="move-item">
            <span>{{ move.number }}</span>
            <i :class="`is-${move.color}`"></i>
            <strong class="move-piece-token" :class="`is-${move.piece.color}`" :title="getPieceName(move.piece)">{{ getPieceSymbol(move.piece) }}</strong>
            <small>{{ getMoveText(move) }}</small>
            <span class="move-item__result">
              <template v-if="move.captured">
                <span class="move-capture-mark">×</span>
                <strong class="move-piece-token is-captured" :class="`is-${move.captured.color}`" :title="getPieceName(move.captured)">{{ getPieceSymbol(move.captured) }}</strong>
              </template>
              <strong v-if="move.is_check" class="move-check-badge">Chiếu</strong>
              <strong v-if="move.rule_action === 'chase' || move.rule_action === 'check_chase'" class="move-chase-badge">Tróc</strong>
            </span>
          </div>
        </div>
        <div class="captured-block">
          <p>Quân đã ăn</p>
          <div><span>Đỏ</span><b v-for="piece in redCaptured" :key="piece.id" class="captured-piece-token" :class="`is-${piece.color}`" :title="getPieceName(piece)">{{ getPieceSymbol(piece) }}</b><small v-if="!redCaptured.length">—</small></div>
          <div><span>Đen</span><b v-for="piece in blackCaptured" :key="piece.id" class="captured-piece-token" :class="`is-${piece.color}`" :title="getPieceName(piece)">{{ getPieceSymbol(piece) }}</b><small v-if="!blackCaptured.length">—</small></div>
        </div>
      </aside>

      <section class="online-board-wrap">
        <div v-if="!gameStarted" class="board-overlay">
          <div class="board-waiting-card">
            <div class="board-waiting-card__icon"><Swords :size="24" /></div>
            <span class="board-waiting-card__eyebrow">HAI NGƯỜI · CÙNG THIẾT BỊ</span>
            <h2>Sẵn sàng khai cuộc?</h2>
            <p>Quân Đỏ đi trước. Mỗi bên có 10 phút để thi đấu.</p>
            <button class="chess-button chess-button--primary" @click="startGame"><Play :size="17" /> Bắt đầu ván đấu</button>
          </div>
        </div>
        <ChineseChessBoard
          :key="gameKey"
          :current-turn="currentTurn"
          :game-started="gameStarted && !gameOver"
          :position="localBoard"
          :last-move="lastMove"
          @move="handleMove"
          @checkmate="handleCheckmate"
          @check="handleCheck"
        />
      </section>

      <aside class="match-panel match-panel--players" :class="{ 'is-mobile-open': mobilePanel === 'players' }">
        <div class="match-panel__title"><span>Người chơi</span><Users :size="17" /><button type="button" class="mobile-panel-close" aria-label="Đóng bảng trận đấu" @click="mobilePanel = null"><X :size="16" /></button></div>
          <div v-if="gameStarted && !gameOver" class="player-turn" role="status">
            <span class="player-turn__dot" :class="{ 'is-red': currentTurn === 'red' }"></span>
            Lượt quân {{ currentTurn === 'red' ? 'Đỏ' : 'Đen' }}
          </div>
        <div class="player-card" :class="{ 'is-active': gameStarted && !gameOver && currentTurn === 'black' }">
          <div class="player-avatar is-black">將</div>
          <div><span>QUÂN ĐEN</span><strong>Người chơi Đen</strong></div>
          <time>{{ blackTimeText }}</time>
        </div>
        <div class="match-versus">VS</div>
        <div class="player-card" :class="{ 'is-active': gameStarted && !gameOver && currentTurn === 'red' }">
          <div class="player-avatar is-red">帥</div>
          <div><span>QUÂN ĐỎ</span><strong>Người chơi Đỏ</strong></div>
          <time>{{ redTimeText }}</time>
        </div>
        <div class="match-notice" :class="{ 'is-mine': gameStarted && !gameOver }" aria-live="polite">
          <Swords :size="17" />
          <div>
            <strong>{{ gameOver ? `Quân ${winnerName} thắng` : gameStarted ? `Lượt quân ${currentPlayerName}` : 'Bấm Bắt đầu để khai cuộc' }}</strong>
            <span v-if="gameStarted && !gameOver && isCheck">{{ checkPlayerName }} đang bị chiếu! Hãy tìm nước đi để thoát chiếu.</span>
          </div>
        </div>
        <div class="match-actions">
          <div v-if="repetitionState.status === 'warning'" class="repetition-warning" role="alert">
            <strong>{{ repetitionState.obligated_color ? `Quân ${repetitionState.obligated_color === 'red' ? 'Đỏ' : 'Đen'} phải phá lặp` : 'Thế cờ đã lặp lần hai' }}</strong>
            <span>{{ repetitionState.obligated_color ? 'Hãy đổi nước để phá chuỗi lặp. Ván đấu sẽ không tự động xử thua.' : 'Lặp lại lần ba sẽ được xử hòa.' }}</span>
          </div>
          <button v-if="!gameStarted" class="chess-button chess-button--primary" @click="startGame"><Play :size="17" /> Bắt đầu</button>
          <button v-else class="chess-button" @click="restartGame"><RotateCcw :size="17" /> Chơi lại</button>
          <button v-if="gameStarted && !gameOver" class="chess-button chess-button--undo" :disabled="!canUndo" @click="undoLastMove">
            <Undo2 :size="17" /> Đi lại <span>({{ undoRemaining }}/3)</span>
          </button>
          <button v-if="gameStarted && !gameOver" class="chess-button chess-button--danger-ghost" @click="surrender">Đầu hàng</button>
        </div>
      </aside>
    </section>

    <Transition name="modal">
      <div v-if="gameOver" class="chess-dialog-backdrop">
        <section class="chess-dialog chess-dialog--result is-winner" role="alertdialog" aria-modal="true" aria-labelledby="local-result-title" aria-describedby="local-result-description">
          <div class="chess-dialog__icon is-winner"><Trophy :size="28" /></div>
          <span class="chess-dialog__eyebrow">VÁN ĐẤU KẾT THÚC</span>
          <h2 id="local-result-title">{{ winner ? `Quân ${winnerName} thắng!` : 'Ván đấu hòa' }}</h2>
          <p id="local-result-description">{{ winner ? `${winReasonText} · Quân ${loserName} đã thua.` : winReasonText }}</p>
          <div class="chess-dialog__actions is-centered"><button class="chess-button chess-button--primary" @click="restartGame"><RotateCcw :size="17" /> Chơi lại</button></div>
        </section>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="chess-dialog">
        <div v-if="repetitionModal" class="chess-dialog-backdrop" role="presentation">
          <section class="chess-dialog" role="alertdialog" aria-modal="true" aria-labelledby="local-repetition-title">
            <button class="chess-dialog__close" aria-label="Đóng" @click="repetitionModal = false"><X :size="18" /></button>
            <div class="chess-dialog__icon is-warning"><AlertTriangle :size="28" /></div>
            <span class="chess-dialog__eyebrow">PHẢI PHÁ THẾ LẶP</span>
            <h2 id="local-repetition-title">Nước đi đã được hoàn lại</h2>
            <p>Quân {{ currentTurn === 'red' ? 'Đỏ' : 'Đen' }} đang tiếp tục chuỗi chiếu hoặc đuổi quân. Hãy chọn một nước khác.</p>
            <div class="chess-dialog__actions is-centered">
              <button class="chess-button chess-button--primary" @click="repetitionModal = false">Chọn nước khác</button>
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
<style scoped src="~/assets/css/pages/games/chinese-chess/index.css"></style>

<style scoped src="~/assets/css/pages/games/chinese-chess/player-turn.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/repetition.css"></style>
