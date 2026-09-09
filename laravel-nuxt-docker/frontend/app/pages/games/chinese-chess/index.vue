<script setup lang="ts">
import { ArrowLeft, Globe, Monitor, Play, RotateCcw, Swords, Trophy, Users } from 'lucide-vue-next'
import {
  computed,
  onBeforeUnmount,
  ref,
} from 'vue'

import type {
  ChineseChessPiece,
  PieceColor,
} from '~/types/games/chinese-chess'

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

/**
 * ==========================================
 * CAPTURED PIECES
 * ==========================================
 */

const redCaptured =
  ref<ChineseChessPiece[]>([])

const blackCaptured =
  ref<ChineseChessPiece[]>([])

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
  winningColor: PieceColor,
  reason:
    | 'checkmate'
    | 'timeout'
    | 'surrender',
) {
  stopTimer()

  gameOver.value = true

  winner.value =
    winningColor

  loser.value =
    winningColor === 'red'
      ? 'black'
      : 'red'

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

  moveHistory.value.push({
    ...move,

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

  currentTurn.value =
    currentTurn.value === 'red'
      ? 'black'
      : 'red'

  /**
   * Timer chuyển sang người mới.
   */

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
      <aside class="match-panel match-panel--history">
        <div class="match-panel__title"><span>Lịch sử nước đi</span><b>{{ moveHistory.length }}</b></div>
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
          @move="handleMove"
          @checkmate="handleCheckmate"
          @check="handleCheck"
        />
      </section>

      <aside class="match-panel match-panel--players">
        <div class="match-panel__title"><span>Người chơi</span><Users :size="17" /></div>
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
          <button v-if="!gameStarted" class="chess-button chess-button--primary" @click="startGame"><Play :size="17" /> Bắt đầu</button>
          <button v-else class="chess-button" @click="restartGame"><RotateCcw :size="17" /> Chơi lại</button>
          <button v-if="gameStarted && !gameOver" class="chess-button chess-button--danger-ghost" @click="surrender">Đầu hàng</button>
        </div>
      </aside>
    </section>

    <Transition name="modal">
      <div v-if="gameOver" class="chess-dialog-backdrop">
        <section class="chess-dialog chess-dialog--result is-winner" role="alertdialog" aria-modal="true" aria-labelledby="local-result-title" aria-describedby="local-result-description">
          <div class="chess-dialog__icon is-winner"><Trophy :size="28" /></div>
          <span class="chess-dialog__eyebrow">VÁN ĐẤU KẾT THÚC</span>
          <h2 id="local-result-title">Quân {{ winnerName }} thắng!</h2>
          <p id="local-result-description">{{ winReasonText }} · Quân {{ loserName }} đã thua.</p>
          <div class="chess-dialog__actions is-centered"><button class="chess-button chess-button--primary" @click="restartGame"><RotateCcw :size="17" /> Chơi lại</button></div>
        </section>
      </div>
    </Transition>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/chinese-chess/online.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/history-pieces.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/ready.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/dialogs.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/typography.css"></style>
<style scoped src="~/assets/css/pages/games/chinese-chess/index.css"></style>

<style scoped src="~/assets/css/pages/games/chinese-chess/player-turn.css"></style>
