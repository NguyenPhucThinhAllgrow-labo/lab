<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import type {
  ChineseChessMoveHistory,
  ChineseChessPiece,
  PieceColor,
  Position,
} from '~/types/games/chinese-chess'
import type { ChineseChessSuggestedMove } from '~/utils/chinese-chess/advisor'

import {
  createInitialBoard,
} from '~/utils/chinese-chess/board'

import {
  getPseudoLegalMoves,
} from '~/utils/chinese-chess/move'

import {
  movePiece,
} from '~/utils/chinese-chess/game'

import {
  isInCheck,
  isCheckmate,
  isLegalMove,
} from '~/utils/chinese-chess/check'

/**
 * ==========================================
 * PROPS
 * ==========================================
 */

const props = defineProps<{
  currentTurn: PieceColor
  gameStarted: boolean
  position?: ChineseChessPiece[]
  playerColor?: PieceColor | null
  readonly?: boolean
  showWaitingOverlay?: boolean
  lastMove?: Pick<ChineseChessMoveHistory, 'from' | 'to'> | null
  suggestedMove?: ChineseChessSuggestedMove | null
}>()

/**
 * ==========================================
 * EMITS
 * ==========================================
 */

const emit = defineEmits<{
  move: [
    {
      number: number
      color: PieceColor
      piece: ChineseChessPiece
      from: Position
      to: Position
      captured: ChineseChessPiece | null
      position: ChineseChessPiece[]
      is_check: boolean
    },
  ]

  checkmate: [
    winningColor: PieceColor,
  ]

  check: [
    isCheck: boolean,
    color: PieceColor | null,
  ]
}>()

/**
 * ==========================================
 * BOARD
 * ==========================================
 */

// Display coordinates only: game rules and API moves keep their original coordinates.
const flipped = computed(() => props.playerColor === 'black')
const displayRow = (row: number) => flipped.value ? 9 - row : row
const displayCol = (col: number) => flipped.value ? 8 - col : col

const opponentReminderVisible = ref(false)
let opponentReminderTimer: ReturnType<typeof setTimeout> | null = null
let opponentReminderAutoHideTimer: ReturnType<typeof setTimeout> | null = null

const opponentReminderKey = computed(() => {
  if (!props.lastMove) return ''
  return `${props.currentTurn}:${props.lastMove.from.row}-${props.lastMove.from.col}:${props.lastMove.to.row}-${props.lastMove.to.col}`
})

const canShowOpponentReminder = computed(() =>
  props.gameStarted
  && !!props.playerColor,
)

function clearOpponentReminderTimer(): void {
  if (opponentReminderTimer) clearTimeout(opponentReminderTimer)
  opponentReminderTimer = null
}

function clearOpponentReminderAutoHideTimer(): void {
  if (opponentReminderAutoHideTimer) clearTimeout(opponentReminderAutoHideTimer)
  opponentReminderAutoHideTimer = null
}

function clearOpponentReminderTimers(): void {
  clearOpponentReminderTimer()
  clearOpponentReminderAutoHideTimer()
}

function dismissOpponentReminder(): void {
  clearOpponentReminderAutoHideTimer()
  opponentReminderVisible.value = false
}

watch(
  [opponentReminderKey, canShowOpponentReminder],
  ([moveKey, canShow]) => {
    clearOpponentReminderTimers()
    opponentReminderVisible.value = false

    if (!moveKey || !canShow) return

    opponentReminderTimer = setTimeout(() => {
      opponentReminderVisible.value = true
      opponentReminderTimer = null

      opponentReminderAutoHideTimer = setTimeout(() => {
        opponentReminderVisible.value = false
        opponentReminderAutoHideTimer = null
      }, 10000)
    }, 15000)
  },
  { immediate: true },
)

onBeforeUnmount(clearOpponentReminderTimers)

const board = ref<ChineseChessPiece[]>(
  props.position?.map(piece => ({ ...piece })) ?? createInitialBoard(),
)

function boardSignature(position: ChineseChessPiece[]): string {
  return position
    .map(piece => `${piece.id}:${piece.row}:${piece.col}`)
    .sort()
    .join('|')
}

watch(
  () => props.position,
  (position) => {
    if (!position || boardSignature(position) === boardSignature(board.value)) return

    board.value = position.map(piece => ({ ...piece }))
    clearSelection()
  },
  { deep: true },
)

const canInteract = computed(() =>
  props.gameStarted
  && !props.readonly
  && (!props.playerColor || props.playerColor === props.currentTurn),
)

/**
 * ==========================================
 * SELECTION
 * ==========================================
 */

const selectedPieceId =
  ref<string | null>(null)

const validMoves =
  ref<Position[]>([])

/**
 * ==========================================
 * CHECK STATE
 * ==========================================
 */

const redInCheck =
  computed(() =>
    isInCheck(
      board.value,
      'red',
    ),
  )

const blackInCheck =
  computed(() =>
    isInCheck(
      board.value,
      'black',
    ),
  )

const currentPlayerInCheck =
  computed(() =>
    isInCheck(
      board.value,
      props.currentTurn,
    ),
  )

/**
 * ==========================================
 * EMIT CHECK STATE TO PARENT
 * ==========================================
 */

watch(
  [redInCheck, blackInCheck],
  ([redCheck, blackCheck]) => {
    if (redCheck) {
      emit(
        'check',
        true,
        'red',
      )

      return
    }

    if (blackCheck) {
      emit(
        'check',
        true,
        'black',
      )

      return
    }

    emit(
      'check',
      false,
      null,
    )
  },
  {
    immediate: true,
  },
)

/**
 * ==========================================
 * CHECKED GENERAL
 * ==========================================
 */

const checkedGeneral =
  computed(() => {
    if (
      !redInCheck.value &&
      !blackInCheck.value
    ) {
      return null
    }

    const color: PieceColor =
      redInCheck.value
        ? 'red'
        : 'black'

    return (
      board.value.find(
        (piece) =>
          piece.type ===
            'general' &&
          piece.color === color,
      ) ?? null
    )
  })

/**
 * ==========================================
 * SELECTED PIECE
 * ==========================================
 */

const selectedPiece =
  computed(() => {
    if (
      !selectedPieceId.value
    ) {
      return null
    }

    return (
      board.value.find(
        (piece) =>
          piece.id ===
          selectedPieceId.value,
      ) ?? null
    )
  })

/**
 * ==========================================
 * GET PIECE
 * ==========================================
 */

function getPieceAt(
  row: number,
  col: number,
): ChineseChessPiece | undefined {
  return board.value.find(
    (piece) =>
      piece.row === row &&
      piece.col === col,
  )
}

function isLastMoveFrom(row: number, col: number): boolean {
  return props.lastMove?.from.row === row && props.lastMove.from.col === col
}

function isLastMoveTo(row: number, col: number): boolean {
  return props.lastMove?.to.row === row && props.lastMove.to.col === col
}

/**
 * ==========================================
 * VALID MOVE
 * ==========================================
 */

function isValidMove(
  row: number,
  col: number,
): boolean {
  return validMoves.value.some(
    (move) =>
      move.row === row &&
      move.col === col,
  )
}

/**
 * ==========================================
 * SELECT PIECE
 * ==========================================
 */

function selectPiece(
  piece: ChineseChessPiece,
) {
  /**
   * Chưa bắt đầu game
   */

  if (!canInteract.value) {
    return
  }

  /**
   * Không phải lượt quân này
   */

  if (
    piece.color !==
    props.currentTurn
  ) {
    return
  }

  selectedPieceId.value =
    piece.id

  /**
   * Pseudo legal moves
   */

  const pseudoMoves =
    getPseudoLegalMoves(
      piece,
      board.value,
    )

  /**
   * Lọc những nước:
   *
   * - Không làm Tướng mình bị chiếu
   * - Không vi phạm luật
   */

  validMoves.value =
    pseudoMoves.filter(
      (position) =>
        isLegalMove(
          board.value,
          piece,
          position,
        ),
      )
}

watch(
  () => props.suggestedMove,
  (suggestedMove) => {
    if (!suggestedMove || !canInteract.value) return

    const piece = board.value.find(candidate =>
      candidate.id === suggestedMove.pieceId
      && candidate.row === suggestedMove.from.row
      && candidate.col === suggestedMove.from.col)

    if (piece) selectPiece(piece)
  },
  { deep: true },
)

function isSuggestedMoveFrom(row: number, col: number): boolean {
  return props.suggestedMove?.from.row === row
    && props.suggestedMove.from.col === col
}

function isSuggestedMoveTo(row: number, col: number): boolean {
  return props.suggestedMove?.to.row === row
    && props.suggestedMove.to.col === col
}

/**
 * ==========================================
 * CLEAR SELECTION
 * ==========================================
 */

function clearSelection() {
  selectedPieceId.value =
    null

  validMoves.value = []
}

/**
 * ==========================================
 * HANDLE CLICK
 * ==========================================
 */

function handlePointClick(
  row: number,
  col: number,
) {
  /**
   * Chưa bắt đầu
   */

  if (!canInteract.value) {
    return
  }

  /**
   * Quân tại vị trí click
   */

  const clickedPiece =
    getPieceAt(
      row,
      col,
    )

  /**
   * ========================================
   * ĐANG CHỌN QUÂN
   * ========================================
   */

  if (
    selectedPiece.value
  ) {
    /**
     * Click vào ô hợp lệ
     */

    if (
      isValidMove(
        row,
        col,
      )
    ) {
      performMove(
        row,
        col,
      )

      return
    }

    /**
     * Click quân cùng màu
     *
     * Cho phép đổi quân
     */

    if (
      clickedPiece &&
      clickedPiece.color ===
        props.currentTurn
    ) {
      selectPiece(
        clickedPiece,
      )

      return
    }

    /**
     * Click quân đối phương
     * nhưng không phải ô hợp lệ
     *
     * Không làm gì.
     */

    return
  }

  /**
   * ========================================
   * CHƯA CHỌN QUÂN
   * ========================================
   */

  if (
    clickedPiece
  ) {
    selectPiece(
      clickedPiece,
    )
  }
}

/**
 * ==========================================
 * PERFORM MOVE
 * ==========================================
 */

function performMove(
  row: number,
  col: number,
) {
  const piece =
    selectedPiece.value

  if (!piece) {
    return
  }

  /**
   * Kiểm tra lại lượt.
   */

  if (
    piece.color !==
    props.currentTurn
  ) {
    clearSelection()

    return
  }

  /**
   * Kiểm tra legal move
   * lần cuối trước khi thực hiện.
   */

  if (
    !isLegalMove(
      board.value,
      piece,
      {
        row,
        col,
      },
    )
  ) {
    return
  }

  /**
   * Lưu vị trí cũ.
   */

  const from: Position = {
    row: piece.row,
    col: piece.col,
  }

  /**
   * Lưu quân bị ăn.
   *
   * Phải lấy trước khi movePiece()
   * vì sau đó quân này sẽ bị remove
   * khỏi board.
   */

  const captured =
    getPieceAt(
      row,
      col,
    ) ?? null

  /**
   * Lưu piece trước khi move.
   *
   * movePiece() có thể tạo board mới
   * nên dữ liệu này dùng cho history.
   */

  const movedPiece: ChineseChessPiece = {
    ...piece,
  }

  const nextBoard = movePiece(board.value, piece.id, { row, col })
  const opponentColor: PieceColor = piece.color === 'red' ? 'black' : 'red'
  const isCheck = isInCheck(nextBoard, opponentColor)

  if (props.position) {
    clearSelection()
    emit('move', {
      number: 0,
      color: piece.color,
      piece: movedPiece,
      from,
      to: { row, col },
      captured,
      position: nextBoard,
      is_check: isCheck,
    })
    if (isCheckmate(nextBoard, opponentColor)) {
      emit('checkmate', piece.color)
    }
    return
  }

  /**
   * Thực hiện nước đi.
   */

  /**
   * Cập nhật board.
   */

  board.value =
    nextBoard

  /**
   * Xóa selection.
   */

  clearSelection()

  /**
   * ========================================
   * KIỂM TRA CHECKMATE
   * ========================================
   *
   * Sau khi Đỏ đi:
   * kiểm tra Đen.
   *
   * Sau khi Đen đi:
   * kiểm tra Đỏ.
   */

  /**
   * Nếu đối thủ đã bị chiếu bí
   */

  if (
    isCheckmate(
      board.value,
      opponentColor,
    )
  ) {
    /**
     * Gửi lịch sử nước đi
     * trước khi kết thúc game.
     */

    emit('move', {
      number: 0,
      color: piece.color,
      piece: movedPiece,
      from,
      to: {
        row,
        col,
      },
      captured,
      position: nextBoard,
      is_check: isCheck,
    })

    /**
     * Người vừa đi là người thắng.
     */

    emit(
      'checkmate',
      piece.color,
    )

    return
  }

  /**
   * ========================================
   * EMIT MOVE
   * ========================================
   */

  emit('move', {
    number: 0,
    color: piece.color,
    piece: movedPiece,
    from,
    to: {
      row,
      col,
    },
    captured,
    position: nextBoard,
    is_check: isCheck,
  })
}

/**
 * ==========================================
 * CHECKED GENERAL POSITION
 * ==========================================
 */

function isCheckedGeneral(
  row: number,
  col: number,
): boolean {
  return (
    checkedGeneral.value !==
      null &&
    checkedGeneral.value.row ===
      row &&
    checkedGeneral.value.col ===
      col
  )
}

/**
 * ==========================================
 * CURRENT TURN PIECE
 * ==========================================
 */

function isCurrentTurnPiece(
  piece: ChineseChessPiece,
): boolean {
  return (
    canInteract.value &&
    piece.color === props.currentTurn
  )
}

const displayedFileLabels = computed(() =>
  Array.from(
    { length: 9 },
    (_, index) => String.fromCharCode(65 + displayCol(index)),
  ),
)

const displayedRankLabels = computed(() =>
  Array.from(
    { length: 10 },
    (_, index) => displayRow(index) + 1,
  ),
)
</script>

<template>
  <div
    class="
      chess-board-layout
      w-full
      max-w-[600px]
    "
  >
    <div
      class="chess-rank-axis"
      aria-hidden="true"
    >
      <span
        v-for="rank in displayedRankLabels"
        :key="`rank-${rank}`"
        class="chess-axis-label"
      >
        {{ rank }}
      </span>
    </div>

    <!-- ================================= -->
    <!-- BOARD -->
    <!-- ================================= -->

    <div
      class="chess-board-frame"
      :class="{
        'has-turn-glow': gameStarted && playerColor === currentTurn,
        'is-red-turn': gameStarted && playerColor === 'red' && currentTurn === 'red',
        'is-black-turn': gameStarted && playerColor === 'black' && currentTurn === 'black',
      }"
    >
      <div
        class="
          chess-board-surface
          relative
          aspect-[8/9]
          w-full
          overflow-hidden
          rounded-lg
        "
      >
      <!-- ================================= -->
      <!-- CHECK EFFECT -->
      <!-- ================================= -->

      <div
        v-if="checkedGeneral"
        class="
          pointer-events-none
          absolute
          z-30
          -translate-x-1/2
          -translate-y-1/2
          animate-pulse
          rounded-full
          border-4
          border-red-500
          bg-red-500/20
          shadow-[0_0_30px_rgba(239,68,68,0.9)]
        "
        :style="{
          left: `${
            5 +
            (displayCol(checkedGeneral.col) / 8) *
              90
          }%`,

          top: `${
            5 +
            (displayRow(checkedGeneral.row) / 9) *
              90
          }%`,

          width: '12%',
          aspectRatio: '1',
        }"
      />

      <Transition name="opponent-reminder">
        <div
          v-if="opponentReminderVisible && lastMove"
          class="opponent-turn-reminder"
          :class="{
            'is-below': displayRow(lastMove.to.row) < 2,
            'is-left-edge': displayCol(lastMove.to.col) < 2,
            'is-right-edge': displayCol(lastMove.to.col) > 6,
          }"
          :style="{
            left: `${5 + (displayCol(lastMove.to.col) / 8) * 90}%`,
            top: `${5 + (displayRow(lastMove.to.row) / 9) * 90}%`,
          }"
          role="status"
        >
          <button
            type="button"
            aria-label="Đóng lời nhắc"
            @click.stop="dismissOpponentReminder"
          >
            ×
          </button>
          <div class="opponent-turn-reminder__cue" aria-hidden="true">
            <span><i></i><i></i><i></i></span>
            <small>NHẮC LƯỢT</small>
          </div>
          <strong>Đã tới lượt của ngươi rồi đó!</strong>
          <span>Hãy hành động đi.</span>
        </div>
      </Transition>

      <!-- ================================= -->
      <!-- BOARD SVG -->
      <!-- ================================= -->

      <svg
        class="
          chess-board-grid
          absolute
          inset-[5%]
          h-[90%]
          w-[90%]
        "
        viewBox="0 0 8 9"
        preserveAspectRatio="none"
      >
        <!-- =============================== -->
        <!-- HORIZONTAL -->
        <!-- =============================== -->

        <g
          stroke="#5f381b"
          stroke-width="0.018"
        >
          <line
            v-for="row in 10"
            :key="`h-${row}`"
            x1="0"
            :y1="row - 1"
            x2="8"
            :y2="row - 1"
          />
        </g>

        <!-- =============================== -->
        <!-- VERTICAL -->
        <!-- =============================== -->

        <g
          stroke="#5f381b"
          stroke-width="0.018"
        >
          <!-- TOP -->

          <line
            v-for="col in 9"
            :key="
              `top-v-${col}`
            "
            :x1="col - 1"
            y1="0"
            :x2="col - 1"
            y2="4"
          />

          <!-- BOTTOM -->

          <line
            v-for="col in 9"
            :key="
              `bottom-v-${col}`
            "
            :x1="col - 1"
            y1="5"
            :x2="col - 1"
            y2="9"
          />
        </g>

        <!-- =============================== -->
        <!-- TOP PALACE -->
        <!-- =============================== -->

        <line
          x1="3"
          y1="0"
          x2="5"
          y2="2"
          stroke="#5f381b"
          stroke-width="0.018"
        />

        <line
          x1="5"
          y1="0"
          x2="3"
          y2="2"
          stroke="#5f381b"
          stroke-width="0.018"
        />

        <!-- =============================== -->
        <!-- BOTTOM PALACE -->
        <!-- =============================== -->

        <line
          x1="3"
          y1="7"
          x2="5"
          y2="9"
          stroke="#5f381b"
          stroke-width="0.018"
        />

        <line
          x1="5"
          y1="7"
          x2="3"
          y2="9"
          stroke="#5f381b"
          stroke-width="0.018"
        />
      </svg>

      <!-- ================================= -->
      <!-- RIVER -->
      <!-- ================================= -->

      <div
        class="
          chess-board-river
          pointer-events-none
          absolute
          left-[5%]
          right-[5%]
          top-[45%]
          h-[10%]
        "
      >
        <div
          class="
            flex
            h-full
            items-center
            justify-center
            gap-[15%]
            font-serif
            text-[clamp(0.9rem,3vw,1.6rem)]
            font-bold
            tracking-widest
            text-[#5f381b]
          "
        >
          <span>
            楚河
          </span>

          <span>
            漢界
          </span>
        </div>
      </div>

      <!-- ================================= -->
      <!-- INTERACTION -->
      <!-- ================================= -->

      <div
        class="
          absolute
          inset-[5%]
          h-[90%]
          w-[90%]
        "
      >
        <!-- 10 x 9 = 90 intersections -->

        <template
          v-for="row in 10"
          :key="
            `row-${row}`
          "
        >
          <button
            v-for="col in 9"
            :key="
              `${row}-${col}`
            "
            type="button"
            class="
              absolute
              z-20
              flex
              h-[11.11%]
              w-[12.5%]
              -translate-x-1/2
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
            "
            :class="{
              'cursor-pointer':
                canInteract,

              'cursor-not-allowed':
                !canInteract,
            }"
            :style="{
              left: `${
                (displayCol(col - 1) / 8) *
                100
              }%`,

              top: `${
                (displayRow(row - 1) / 9) *
                100
              }%`,
            }"
            @click="
              handlePointClick(
                row - 1,
                col - 1,
              )
            "
          >
            <span
              v-if="isLastMoveFrom(row - 1, col - 1)"
              class="chess-last-move-marker is-from"
            />

            <span
              v-if="isLastMoveTo(row - 1, col - 1)"
              class="chess-last-move-marker is-to"
            />

            <span
              v-if="isSuggestedMoveFrom(row - 1, col - 1)"
              class="chess-move-suggestion is-from"
              aria-hidden="true"
            />

            <span
              v-if="isSuggestedMoveTo(row - 1, col - 1)"
              class="chess-move-suggestion is-to"
              aria-hidden="true"
            >
              <small>ĐI</small>
            </span>

            <!-- =========================== -->
            <!-- VALID MOVE -->
            <!-- =========================== -->

            <span
              v-if="
                isValidMove(
                  row - 1,
                  col - 1,
                )
              "
              class="
                absolute
                h-3
                w-3
                rounded-full
                bg-green-600
                ring-2
                ring-white/60
              "
            />

            <!-- =========================== -->
            <!-- CHECKED GENERAL -->
            <!-- =========================== -->

            <span
              v-if="
                isCheckedGeneral(
                  row - 1,
                  col - 1,
                )
              "
              class="
                absolute
                h-[82%]
                w-[82%]
                animate-pulse
                rounded-full
                border-[3px]
                border-red-500
                bg-red-500/10
                shadow-[0_0_18px_rgba(239,68,68,0.8)]
              "
            />

            <!-- =========================== -->
            <!-- PIECE -->
            <!-- =========================== -->

            <ChineseChessPiece
              v-if="
                getPieceAt(
                  row - 1,
                  col - 1,
                )
              "
              :piece="
                getPieceAt(
                  row - 1,
                  col - 1,
                )!
              "
              :selected="
                getPieceAt(
                  row - 1,
                  col - 1,
                )?.id ===
                selectedPieceId
              "
              :class="{
                'chess-last-moved-piece': isLastMoveTo(row - 1, col - 1),
              }"
            />

            <!-- =========================== -->
            <!-- TURN LOCK OVERLAY -->
            <!-- =========================== -->

            <span
              v-if="
                getPieceAt(
                  row - 1,
                  col - 1,
                ) &&
                !isCurrentTurnPiece(
                  getPieceAt(
                    row - 1,
                    col - 1,
                  )!,
                )
              "
              class="
                pointer-events-none
                absolute
                inset-0
                rounded-full
              "
            />
          </button>
        </template>
      </div>

      <!-- ================================= -->
      <!-- NOT STARTED OVERLAY -->
      <!-- ================================= -->

      <div
        v-if="!gameStarted && showWaitingOverlay !== false"
        class="
          pointer-events-none
          absolute
          inset-0
          z-40
          flex
          items-center
          justify-center
          bg-black/20
        "
      >
        <div
          class="
            rounded-2xl
            border
            border-white/20
            bg-black/60
            px-6
            py-4
            text-center
            backdrop-blur-sm
          "
        >
          <p
            class="
              text-lg
              font-bold
              text-white
            "
          >
            Sẵn sàng
          </p>

          <p
            class="
              mt-1
              text-sm
              text-slate-300
            "
          >
            Nhấn "Bắt đầu" để chơi
          </p>
        </div>
      </div>
    </div>
    </div>

    <div aria-hidden="true" />

    <div
      class="chess-file-axis"
      aria-hidden="true"
    >
      <span
        v-for="file in displayedFileLabels"
        :key="`file-${file}`"
        class="chess-axis-label"
      >
        {{ file }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.chess-board-surface {
  isolation: isolate;
  border-width: clamp(5px, 0.8vw, 7px);
  border-style: solid;
  border-color: #704523;
  border-radius: clamp(10px, 1.4vw, 14px);
  background:
    linear-gradient(112deg, rgb(255 247 218 / 15%), transparent 26% 76%, rgb(91 52 24 / 8%)),
    repeating-linear-gradient(2deg, transparent 0 21px, rgb(91 59 31 / 3.5%) 22px 23px),
    linear-gradient(145deg, #dfc38f 0%, #d7b77d 54%, #cda568 100%);
  box-shadow:
    0 clamp(3px, 0.5vw, 5px) 0 #422713,
    0 clamp(8px, 1.4vw, 14px) clamp(14px, 2.5vw, 26px) rgb(0 0 0 / 30%),
    0 0 0 1px #2f1b0d,
    inset 0 0 0 2px rgb(240 207 151 / 38%),
    inset 0 0 clamp(16px, 3vw, 30px) rgb(84 48 20 / 12%);
}

.chess-board-surface::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 28% 16%, rgb(255 250 226 / 13%), transparent 32%),
    linear-gradient(90deg, rgb(255 255 255 / 4%), transparent 16% 84%, rgb(73 42 20 / 5%));
  box-shadow:
    inset 7px 0 12px -12px rgb(255 243 211 / 56%),
    inset -8px 0 14px -12px rgb(62 38 19 / 46%),
    inset 0 -8px 16px -14px rgb(54 31 14 / 52%);
  content: "";
  pointer-events: none;
}

.chess-board-frame {
  position: relative;
  isolation: isolate;
  border-radius: clamp(10px, 1.4vw, 14px);
}

.chess-board-frame.has-turn-glow::after {
  position: absolute;
  z-index: 0;
  inset: -3px;
  border-radius: inherit;
  padding: clamp(1px, 0.2vw, 2px);
  background: conic-gradient(
    from var(--turn-glow-angle),
    transparent 0 69%,
    var(--turn-glow-soft) 77%,
    var(--turn-glow-color) 84%,
    #fff8dc 87%,
    var(--turn-glow-color) 90%,
    transparent 98% 100%
  );
  content: "";
  filter: drop-shadow(0 0 4px var(--turn-glow-color));
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: chess-turn-border-run 5.5s linear infinite;
}

.chess-board-frame.has-turn-glow .chess-board-surface {
  position: relative;
  z-index: 1;
}

.chess-board-frame.is-red-turn {
  --turn-glow-color: #fb5a4f;
  --turn-glow-soft: rgb(245 158 11 / 45%);
}

.chess-board-frame.is-black-turn {
  --turn-glow-color: #67d7f5;
  --turn-glow-soft: rgb(56 189 248 / 38%);
}

@property --turn-glow-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes chess-turn-border-run {
  to {
    --turn-glow-angle: 360deg;
  }
}

.opponent-turn-reminder {
  --reminder-x: -50%;
  --reminder-tail-x: 50%;
  position: absolute;
  z-index: 45;
  width: clamp(220px, 44%, 280px);
  max-width: calc(100% - 16px);
  border: 1px solid #c88a3c;
  border-radius: 14px 14px 14px 5px;
  padding: 10px 30px 11px 12px;
  background: linear-gradient(145deg, rgb(255 249 231 / 98%), rgb(241 220 176 / 98%));
  box-shadow:
    0 10px 24px rgb(64 35 13 / 28%),
    inset 0 1px rgb(255 255 255 / 78%);
  color: #3f2b18;
  pointer-events: auto;
  transform: translate(var(--reminder-x), calc(-100% - clamp(30px, 5.5vw, 40px)));
  animation: opponent-reminder-enter 220ms cubic-bezier(0.2, 0.85, 0.3, 1.12);
}

.opponent-reminder-leave-active {
  transition:
    opacity 900ms ease,
    filter 900ms ease;
}

.opponent-reminder-leave-to {
  opacity: 0;
  filter: blur(2px);
}

.opponent-turn-reminder::after {
  position: absolute;
  bottom: -6px;
  left: var(--reminder-tail-x);
  width: 11px;
  height: 11px;
  border-right: 1px solid #c88a3c;
  border-bottom: 1px solid #c88a3c;
  background: #f1dcb0;
  content: "";
  transform: translateX(-50%) rotate(45deg);
}

.opponent-turn-reminder.is-left-edge {
  --reminder-x: -8%;
  --reminder-tail-x: 8%;
}

.opponent-turn-reminder.is-right-edge {
  --reminder-x: -92%;
  --reminder-tail-x: 92%;
}

.opponent-turn-reminder.is-below {
  border-radius: 5px 14px 14px;
  transform: translate(var(--reminder-x), clamp(30px, 5.5vw, 40px));
}

.opponent-turn-reminder.is-below::after {
  top: -6px;
  bottom: auto;
  border: 0;
  border-top: 1px solid #c88a3c;
  border-left: 1px solid #c88a3c;
  background: #fff8e5;
}

.opponent-turn-reminder > strong,
.opponent-turn-reminder > span {
  display: block;
}

.opponent-turn-reminder > strong {
  padding-right: 2px;
  font-family: Inter, "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
  font-size: clamp(0.72rem, 1.8vw, 0.86rem);
  font-weight: 750;
  line-height: 1.4;
  overflow-wrap: anywhere;
  white-space: normal;
}

.opponent-turn-reminder > span {
  margin-top: 3px;
  color: #7d674d;
  font-family: Inter, "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
  font-size: clamp(0.54rem, 1.4vw, 0.65rem);
  line-height: 1.45;
}

.opponent-turn-reminder__cue {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.opponent-turn-reminder__cue > span {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-radius: 999px;
  padding: 4px 6px;
  background: #b7772d;
}

.opponent-turn-reminder__cue i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff5dc;
  animation: reminder-speaking-dot 1.2s ease-in-out infinite;
}

.opponent-turn-reminder__cue i:nth-child(2) {
  animation-delay: 140ms;
}

.opponent-turn-reminder__cue i:nth-child(3) {
  animation-delay: 280ms;
}

.opponent-turn-reminder__cue small {
  color: #a56522;
  font-family: Inter, "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
  font-size: 0.48rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.opponent-turn-reminder button {
  position: absolute;
  top: 5px;
  right: 6px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 6px;
  color: #8c7357;
  font-size: 15px;
  line-height: 1;
}

.opponent-turn-reminder button:hover {
  background: rgb(112 73 35 / 10%);
  color: #4c3017;
}

@keyframes opponent-reminder-enter {
  from {
    opacity: 0;
    scale: 0.94;
  }

  to {
    opacity: 1;
    scale: 1;
  }
}

@keyframes reminder-speaking-dot {
  0%,
  60%,
  100% {
    opacity: 0.55;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.chess-board-grid {
  filter:
    drop-shadow(0 1px 0 rgb(255 231 172 / 42%))
    drop-shadow(0 1.2px 0.35px rgb(70 35 12 / 28%));
}

.chess-board-river {
  background: linear-gradient(
    90deg,
    rgb(190 145 84 / 16%),
    rgb(232 204 151 / 28%) 50%,
    rgb(178 129 70 / 14%)
  );
  box-shadow:
    inset 0 1px rgb(255 235 197 / 18%),
    inset 0 -1px rgb(91 56 27 / 9%);
}

.chess-board-layout {
  display: grid;
  grid-template-columns: 1.4rem minmax(0, 1fr);
  grid-template-rows: auto 1.4rem;
  column-gap: 0.25rem;
  row-gap: 0.2rem;
}

.chess-rank-axis {
  display: grid;
  grid-template-rows: repeat(10, minmax(0, 1fr));
  min-height: 0;
}

.chess-file-axis {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 5%;
}

.chess-axis-label {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b77934;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(0.58rem, 1.5vw, 0.72rem);
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 0 rgb(0 0 0 / 45%);
  user-select: none;
}

.chess-last-move-marker {
  position: absolute;
  z-index: 0;
  width: 88%;
  height: 88%;
  pointer-events: none;
  border-radius: 50%;
}

.chess-move-suggestion {
  position: absolute;
  z-index: 4;
  width: 94%;
  height: 94%;
  pointer-events: none;
  border-radius: 50%;
}

.chess-move-suggestion.is-from {
  border: 2px dashed #38bdf8;
  background: rgb(14 165 233 / 10%);
  box-shadow:
    0 0 0 3px rgb(14 165 233 / 14%),
    0 0 18px rgb(56 189 248 / 62%);
  animation: chess-suggestion-source 1.6s ease-in-out infinite;
}

.chess-move-suggestion.is-to {
  width: 54%;
  height: 54%;
  border: 2px solid #fef3c7;
  background: rgb(16 185 129 / 82%);
  box-shadow:
    0 0 0 5px rgb(16 185 129 / 20%),
    0 0 20px rgb(52 211 153 / 88%);
  animation: chess-suggestion-target 1.15s ease-in-out infinite;
}

.chess-move-suggestion.is-to small {
  color: #052e25;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-size: clamp(0.42rem, 1.2vw, 0.62rem);
  font-weight: 950;
  line-height: 1;
}

@keyframes chess-suggestion-source {
  50% {
    border-color: #bae6fd;
    box-shadow:
      0 0 0 5px rgb(14 165 233 / 9%),
      0 0 24px rgb(56 189 248 / 76%);
  }
}

@keyframes chess-suggestion-target {
  50% {
    transform: scale(0.84);
    box-shadow:
      0 0 0 9px rgb(16 185 129 / 9%),
      0 0 25px rgb(52 211 153 / 72%);
  }
}

.chess-last-move-marker.is-from {
  border: 2px dashed rgb(180 83 9 / 72%);
  background: rgb(245 158 11 / 14%);
  box-shadow: inset 0 0 12px rgb(120 53 15 / 20%);
}

.chess-last-move-marker.is-to {
  border: 3px solid #fbbf24;
  background: rgb(250 204 21 / 17%);
  box-shadow: 0 0 0 3px rgb(255 255 255 / 42%), 0 0 22px rgb(245 158 11 / 78%);
  animation: opponent-move-ring 0.85s ease-out;
}

.chess-last-moved-piece {
  z-index: 1;
  animation: opponent-piece-arrive 0.72s cubic-bezier(0.2, 0.9, 0.25, 1.2);
}

@keyframes opponent-move-ring {
  0% {
    opacity: 0;
    transform: scale(0.55);
  }
  55% {
    opacity: 1;
    transform: scale(1.14);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes opponent-piece-arrive {
  0% { transform: scale(0.72); filter: brightness(1.65); }
  55% { transform: scale(1.14); filter: brightness(1.2); }
  100% { transform: scale(1); filter: brightness(1); }
}

@media (prefers-reduced-motion: reduce) {
  .chess-board-frame.has-turn-glow::after {
    animation: none;
  }

  .opponent-turn-reminder {
    animation: none;
  }

  .opponent-reminder-leave-active {
    transition: none;
  }

  .opponent-turn-reminder__cue i {
    animation: none;
  }

  .chess-last-move-marker.is-to,
  .chess-last-moved-piece,
  .chess-move-suggestion {
    animation: none;
  }
}
</style>
