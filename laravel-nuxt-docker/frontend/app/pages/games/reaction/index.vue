<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
} from 'vue'

import type {
  ChessPiece,
  PieceColor,
} from '~/types/chess'

useHead({
  title: 'Cờ Tướng',
})

/**
 * ==========================================
 * MOVE HISTORY
 * ==========================================
 */

interface MoveHistory {
  number: number
  color: PieceColor
  piece: ChessPiece

  from: {
    row: number
    col: number
  }

  to: {
    row: number
    col: number
  }

  captured: ChessPiece | null
}

/**
 * ==========================================
 * TIMER SNAPSHOT
 * ==========================================
 */

interface GameSnapshot {
  redTime: number
  blackTime: number
}

/**
 * ==========================================
 * CHESS BOARD REF
 * ==========================================
 */

const chessBoardRef =
  ref<{
    undoMove: () => boolean
  } | null>(null)

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
    | 'checkmate'
    | 'timeout'
    | 'surrender'
    | null
  >(null)

/**
 * ==========================================
 * CHECK STATE
 * ==========================================
 */

const isCheck =
  ref(false)

const checkColor =
  ref<PieceColor | null>(null)

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
 * GAME SNAPSHOTS
 * ==========================================
 */

const gameSnapshots =
  ref<GameSnapshot[]>([])

/**
 * ==========================================
 * CAPTURED PIECES
 * ==========================================
 */

const redCaptured =
  ref<ChessPiece[]>([])

const blackCaptured =
  ref<ChessPiece[]>([])

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
 * CAN UNDO
 * ==========================================
 */

const canUndo =
  computed(
    () =>
      moveHistory.value.length >
      0,
  )

/**
 * ==========================================
 * PIECE NAME
 * ==========================================
 */

function getPieceName(
  piece: ChessPiece,
): string {
  const names: Record<
    ChessPiece['type'],
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
  piece: ChessPiece,
): string {
  const symbols: Record<
    ChessPiece['type'],
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
 *
 * QUAN TRỌNG:
 *
 * Board nội bộ:
 *
 * row 0 = hàng 10
 * row 1 = hàng 9
 * row 2 = hàng 8
 * ...
 * row 8 = hàng 2
 * row 9 = hàng 1
 *
 * Vì vậy phải dùng:
 *
 * 10 - row
 *
 * thay vì:
 *
 * row + 1
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

  const boardRow =
    10 - row

  return `${columns[col]}${boardRow}`
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

  timer =
    setInterval(() => {
      if (
        !gameStarted.value ||
        gameOver.value
      ) {
        stopTimer()

        return
      }

      /**
       * ĐỎ
       */

      if (
        currentTurn.value ===
        'red'
      ) {
        if (
          redTime.value <=
          0
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
          redTime.value <=
          0
        ) {
          redTime.value = 0

          finishGame(
            'black',
            'timeout',
          )
        }

        return
      }

      /**
       * ĐEN
       */

      if (
        currentTurn.value ===
        'black'
      ) {
        if (
          blackTime.value <=
          0
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
          blackTime.value <=
          0
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
   * Tạo ChessBoard mới.
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
   * Reset snapshots.
   */

  gameSnapshots.value = []

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
  /**
   * Không xử lý move sau game over.
   */

  if (
    gameOver.value
  ) {
    return
  }

  /**
   * ========================================
   * SAVE TIMER SNAPSHOT
   * ========================================
   */

  gameSnapshots.value.push({
    redTime:
      redTime.value,

    blackTime:
      blackTime.value,
  })

  /**
   * ========================================
   * SAVE MOVE HISTORY
   * ========================================
   */

  moveHistory.value.push({
    ...move,

    number:
      moveHistory.value.length +
      1,
  })

  /**
   * ========================================
   * CAPTURED PIECE
   * ========================================
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
   * ========================================
   * CHANGE TURN
   * ========================================
   */

  currentTurn.value =
    currentTurn.value === 'red'
      ? 'black'
      : 'red'

  /**
   * ========================================
   * RESTART TIMER
   * ========================================
   */

  startTimer()
}

/**
 * ==========================================
 * UNDO LAST MOVE
 * ==========================================
 */

function undoLastMove() {
  if (
    moveHistory.value.length ===
    0
  ) {
    return
  }

  if (
    gameSnapshots.value.length ===
    0
  ) {
    return
  }

  /**
   * ========================================
   * RESTORE BOARD
   * ========================================
   */

  const success =
    chessBoardRef.value?.undoMove()

  if (!success) {
    return
  }

  /**
   * ========================================
   * REMOVE LAST MOVE
   * ========================================
   */

  const lastMove =
    moveHistory.value.pop()

  if (!lastMove) {
    return
  }

  /**
   * ========================================
   * RESTORE TIMER
   * ========================================
   */

  const snapshot =
    gameSnapshots.value.pop()

  if (!snapshot) {
    return
  }

  redTime.value =
    snapshot.redTime

  blackTime.value =
    snapshot.blackTime

  /**
   * ========================================
   * RESTORE CAPTURED PIECE
   * ========================================
   */

  if (
    lastMove.captured
  ) {
    if (
      lastMove.color === 'red'
    ) {
      redCaptured.value.pop()
    } else {
      blackCaptured.value.pop()
    }
  }

  /**
   * ========================================
   * RESTORE TURN
   * ========================================
   */

  currentTurn.value =
    lastMove.color

  /**
   * ========================================
   * RESTORE GAME STATE
   * ========================================
   */

  gameStarted.value = true

  gameOver.value = false

  winner.value = null

  loser.value = null

  winReason.value = null

  /**
   * ========================================
   * RESTART TIMER
   * ========================================
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
  <main
    class="
      min-h-screen
      bg-slate-950
      px-4
      py-8
      text-white
    "
  >
    <div
      class="
        mx-auto
        flex
        min-h-[calc(100vh-4rem)]
        w-full
        max-w-[1450px]
        flex-col
        justify-center
      "
    >
      <!-- ================================= -->
      <!-- HEADER -->
      <!-- ================================= -->

      <header
        class="
          mb-6
          text-center
        "
      >
        <h1
          class="
            text-3xl
            font-bold
          "
        >
          Cờ Tướng
        </h1>
      </header>

      <!-- ================================= -->
      <!-- THREE COLUMNS -->
      <!-- ================================= -->

      <div
        class="
          grid
          w-full
          gap-6
          xl:grid-cols-[300px_minmax(0,600px)_300px]
          xl:justify-center
        "
      >
        <!-- ================================= -->
        <!-- LEFT: HISTORY -->
        <!-- ================================= -->

        <aside
          class="
            order-2
            w-full
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
            p-5
            xl:order-1
          "
        >
          <!-- HISTORY -->

          <div>
            <div
              class="
                flex
                items-center
                justify-between
              "
            >
              <h2
                class="
                  font-semibold
                "
              >
                Lịch sử nước đi
              </h2>

              <span
                class="
                  rounded-full
                  bg-slate-800
                  px-2
                  py-1
                  text-xs
                  text-slate-400
                "
              >
                {{ moveHistory.length }}
              </span>
            </div>

            <div
              class="
                mt-3
                h-72
                overflow-y-auto
                rounded-xl
                bg-slate-800
              "
            >
              <!-- EMPTY -->

              <div
                v-if="
                  moveHistory.length ===
                  0
                "
                class="
                  flex
                  h-full
                  items-center
                  justify-center
                  p-4
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                Chưa có nước đi
              </div>

              <!-- MOVES -->

              <div
                v-else
                class="
                  divide-y
                  divide-slate-700
                "
              >
                <div
                  v-for="
                    move in moveHistory
                  "
                  :key="
                    `${move.number}-${move.piece.id}`
                  "
                  class="
                    flex
                    items-center
                    gap-2
                    px-3
                    py-2.5
                  "
                >
                  <!-- NUMBER -->

                  <span
                    class="
                      w-5
                      text-xs
                      text-slate-500
                    "
                  >
                    {{ move.number }}
                  </span>

                  <!-- COLOR -->

                  <span
                    class="
                      h-2
                      w-2
                      shrink-0
                      rounded-full
                    "
                    :class="
                      move.color === 'red'
                        ? 'bg-red-500'
                        : 'bg-slate-300'
                    "
                  />

                  <!-- PIECE -->

                  <span
                    class="
                      text-lg
                      font-bold
                    "
                    :class="
                      move.color === 'red'
                        ? 'text-red-400'
                        : 'text-slate-200'
                    "
                  >
                    {{
                      getPieceSymbol(
                        move.piece,
                      )
                    }}
                  </span>

                  <!-- MOVE -->

                  <div
                    class="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      class="
                        truncate
                        text-sm
                        text-slate-200
                      "
                    >
                      {{
                        getMoveText(
                          move,
                        )
                      }}
                    </p>
                  </div>

                  <!-- CAPTURE -->

                  <span
                    v-if="
                      move.captured
                    "
                    class="
                      shrink-0
                      rounded
                      bg-red-950/60
                      px-1.5
                      py-0.5
                      text-xs
                      text-red-300
                    "
                  >
                    {{
                      getPieceSymbol(
                        move.captured,
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ================================= -->
          <!-- CAPTURED -->
          <!-- ================================= -->

          <div
            class="
              mt-5
              border-t
              border-slate-800
              pt-5
            "
          >
            <h2
              class="
                font-semibold
              "
            >
              Quân đã ăn
            </h2>

            <!-- RED -->

            <div
              class="
                mt-4
              "
            >
              <div
                class="
                  flex
                  justify-between
                "
              >
                <span
                  class="
                    text-sm
                    text-red-400
                  "
                >
                  Đỏ đã ăn
                </span>

                <span
                  class="
                    text-xs
                    text-slate-500
                  "
                >
                  {{ redCaptured.length }}
                </span>
              </div>

              <div
                class="
                  mt-2
                  flex
                  min-h-9
                  flex-wrap
                  gap-1.5
                "
              >
                <span
                  v-for="
                    (piece, index)
                    in redCaptured
                  "
                  :key="
                    `red-${index}`
                  "
                  class="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-slate-800
                    text-lg
                  "
                  :title="
                    getPieceName(
                      piece,
                    )
                  "
                >
                  {{
                    getPieceSymbol(
                      piece,
                    )
                  }}
                </span>

                <span
                  v-if="
                    redCaptured.length ===
                    0
                  "
                  class="
                    text-xs
                    text-slate-500
                  "
                >
                  Chưa có
                </span>
              </div>
            </div>

            <!-- BLACK -->

            <div
              class="
                mt-4
              "
            >
              <div
                class="
                  flex
                  justify-between
                "
              >
                <span
                  class="
                    text-sm
                    text-slate-300
                  "
                >
                  Đen đã ăn
                </span>

                <span
                  class="
                    text-xs
                    text-slate-500
                  "
                >
                  {{ blackCaptured.length }}
                </span>
              </div>

              <div
                class="
                  mt-2
                  flex
                  min-h-9
                  flex-wrap
                  gap-1.5
                "
              >
                <span
                  v-for="
                    (piece, index)
                    in blackCaptured
                  "
                  :key="
                    `black-${index}`
                  "
                  class="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-slate-800
                    text-lg
                  "
                  :title="
                    getPieceName(
                      piece,
                    )
                  "
                >
                  {{
                    getPieceSymbol(
                      piece,
                    )
                  }}
                </span>

                <span
                  v-if="
                    blackCaptured.length ===
                    0
                  "
                  class="
                    text-xs
                    text-slate-500
                  "
                >
                  Chưa có
                </span>
              </div>
            </div>
          </div>
        </aside>

        <!-- ================================= -->
        <!-- CENTER: CHESS BOARD -->
        <!-- ================================= -->

        <section
          class="
            order-1
            flex
            justify-center
            xl:order-2
          "
        >
          <ChessBoard
            ref="chessBoardRef"
            :key="gameKey"
            :current-turn="currentTurn"
            :game-started="gameStarted"
            @move="handleMove"
            @checkmate="
              handleCheckmate
            "
            @check="handleCheck"
          />
        </section>

        <!-- ================================= -->
        <!-- RIGHT: SIDEBAR -->
        <!-- ================================= -->

        <aside
          class="
            order-3
            w-full
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
            p-5
          "
        >
          <!-- CHECK MESSAGE -->

          <Transition name="check">
            <div
              v-if="
                gameStarted &&
                isCheck
              "
              class="
                mb-3
                rounded-xl
                border
                border-red-500/30
                bg-red-950/40
                px-4
                py-3
                text-center
                shadow-lg
                shadow-red-950/20
              "
            >
              <p
                class="
                  animate-pulse
                  font-bold
                  text-red-400
                "
              >
                ⚠
                {{
                  checkPlayerName
                }}
                đang bị chiếu!
              </p>

              <p
                class="
                  mt-1
                  text-xs
                  text-red-300/70
                "
              >
                Hãy tìm nước đi để
                thoát chiếu
              </p>
            </div>
          </Transition>

          <!-- PLAYER -->

          <div
            class="
              mb-5
            "
          >
            <p
              class="
                text-sm
                text-slate-400
              "
            >
              Người chơi
            </p>

            <p
              class="
                mt-1
                text-xl
                font-bold
              "
              :class="
                currentTurn === 'red'
                  ? 'text-red-400'
                  : 'text-slate-200'
              "
            >
              {{ currentPlayerName }}
            </p>
          </div>

          <!-- RED TIMER -->

          <div
            class="
              mb-3
              rounded-xl
              p-4
              text-center
            "
            :class="
              currentTurn === 'red' &&
              gameStarted &&
              !gameOver
                ? 'bg-red-950/60 ring-2 ring-red-500/50'
                : 'bg-slate-800'
            "
          >
            <p
              class="
                text-sm
                text-slate-400
              "
            >
              Đỏ
            </p>

            <p
              class="
                mt-1
                font-mono
                text-3xl
                font-bold
              "
            >
              {{ redTimeText }}
            </p>
          </div>

          <!-- BLACK TIMER -->

          <div
            class="
              rounded-xl
              p-4
              text-center
            "
            :class="
              currentTurn === 'black' &&
              gameStarted &&
              !gameOver
                ? 'bg-slate-700 ring-2 ring-slate-400/50'
                : 'bg-slate-800'
            "
          >
            <p
              class="
                text-sm
                text-slate-400
              "
            >
              Đen
            </p>

            <p
              class="
                mt-1
                font-mono
                text-3xl
                font-bold
              "
            >
              {{ blackTimeText }}
            </p>
          </div>

          <!-- ================================= -->
          <!-- CONTROLS -->
          <!-- ================================= -->

          <div
            class="
              mt-5
              grid
              gap-2
            "
          >
            <!-- START -->

            <button
              v-if="
                !gameStarted
              "
              type="button"
              class="
                rounded-lg
                bg-green-600
                px-4
                py-2
                font-semibold
                transition
                hover:bg-green-500
              "
              @click="
                startGame
              "
            >
              Bắt đầu
            </button>

            <!-- UNDO -->

            <button
              v-if="
                canUndo
              "
              type="button"
              class="
                rounded-lg
                border
                border-yellow-500/30
                bg-yellow-500/10
                px-4
                py-2
                font-semibold
                text-yellow-400
                transition
                hover:bg-yellow-500/20
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              :disabled="
                !canUndo
              "
              @click="
                undoLastMove
              "
            >
              ↶ Hồi lại nước
            </button>

            <!-- RESTART -->

            <button
              v-if="
                gameStarted
              "
              type="button"
              class="
                rounded-lg
                bg-slate-700
                px-4
                py-2
                transition
                hover:bg-slate-600
              "
              @click="
                restartGame
              "
            >
              Chơi lại
            </button>

            <!-- SURRENDER -->

            <button
              v-if="
                gameStarted &&
                !gameOver
              "
              type="button"
              class="
                rounded-lg
                border
                border-slate-700
                px-4
                py-2
                text-slate-300
                transition
                hover:bg-slate-800
              "
              @click="
                surrender
              "
            >
              Đầu hàng
            </button>
          </div>
        </aside>
      </div>
    </div>

    <!-- ================================= -->
    <!-- GAME OVER MODAL -->
    <!-- ================================= -->

    <Transition name="modal">
      <div
        v-if="gameOver"
        class="
          fixed
          inset-0
          z-[100]
          flex
          items-center
          justify-center
          bg-black/75
          p-4
          backdrop-blur-sm
        "
      >
        <div
          class="
            w-full
            max-w-md
            rounded-3xl
            border
            border-slate-700
            bg-slate-900
            p-8
            text-center
            shadow-2xl
          "
        >
          <div
            class="
              mx-auto
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-full
              bg-yellow-500/10
              text-4xl
              ring-4
              ring-yellow-500/20
            "
          >
            🏆
          </div>

          <h2
            class="
              mt-5
              text-3xl
              font-bold
            "
          >
            Game Over
          </h2>

          <p
            class="
              mt-4
              text-xl
              font-semibold
            "
          >
            <span
              :class="
                winner === 'red'
                  ? 'text-red-400'
                  : 'text-slate-200'
              "
            >
              {{ winnerName }}
            </span>

            thắng!
          </p>

          <div
            class="
              mx-auto
              mt-4
              w-fit
              rounded-full
              bg-slate-800
              px-5
              py-2
              text-sm
              text-slate-300
            "
          >
            {{ winReasonText }}
          </div>

          <p
            class="
              mt-4
              text-sm
              text-slate-400
            "
          >
            {{ loserName }} đã thua
          </p>

          <button
            type="button"
            class="
              mt-3
              w-full
              rounded-xl
              bg-green-600
              px-5
              py-3
              font-semibold
              transition
              hover:bg-green-500
            "
            @click="
              restartGame
            "
          >
            Chơi lại
          </button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.check-enter-active,
.check-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.check-enter-from,
.check-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.modal-enter-active,
.modal-leave-active {
  transition:
    opacity 0.2s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  opacity: 0;
  transform: scale(0.92);
}
</style>
