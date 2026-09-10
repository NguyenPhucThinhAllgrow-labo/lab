<script setup lang="ts">
import {
  computed,
  ref,
  watch,
} from 'vue'

import type {
  ChineseChessMoveHistory,
  ChineseChessPiece,
  PieceColor,
  Position,
} from '~/types/games/chinese-chess'

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
  border-width: clamp(5px, 1vw, 8px);
  border-style: solid;
  border-color: #986035 #683817 #3e1e0d #7a431e;
  background:
    linear-gradient(112deg, rgb(255 244 194 / 26%), transparent 24% 74%, rgb(105 55 18 / 13%)),
    repeating-linear-gradient(2deg, transparent 0 18px, rgb(112 67 25 / 4%) 19px 20px),
    linear-gradient(145deg, #efd292 0%, #e5bf76 52%, #d7a85f 100%);
  box-shadow:
    0 clamp(4px, 0.7vw, 7px) 0 #35190b,
    0 clamp(10px, 1.7vw, 18px) clamp(18px, 3vw, 32px) rgb(0 0 0 / 38%),
    0 0 0 2px rgb(43 20 8 / 85%),
    inset 0 0 0 2px rgb(255 224 157 / 58%),
    inset 0 0 clamp(18px, 4vw, 38px) rgb(102 53 17 / 18%);
}

.chess-board-surface::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 28% 16%, rgb(255 249 218 / 20%), transparent 30%),
    linear-gradient(90deg, rgb(255 255 255 / 6%), transparent 15% 84%, rgb(73 35 11 / 8%));
  box-shadow:
    inset 8px 0 12px -12px rgb(255 246 211 / 85%),
    inset -9px 0 15px -12px rgb(60 27 8 / 70%),
    inset 0 -10px 18px -15px rgb(49 22 7 / 82%);
  content: "";
  pointer-events: none;
}

.chess-board-grid {
  filter:
    drop-shadow(0 1px 0 rgb(255 231 172 / 42%))
    drop-shadow(0 1.2px 0.35px rgb(70 35 12 / 28%));
}

.chess-board-river {
  background: linear-gradient(
    90deg,
    rgb(221 177 103 / 42%),
    rgb(239 207 146 / 72%) 50%,
    rgb(210 158 82 / 38%)
  );
  box-shadow:
    inset 0 1px rgb(255 235 190 / 30%),
    inset 0 -1px rgb(98 51 17 / 14%);
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
  .chess-last-move-marker.is-to,
  .chess-last-moved-piece {
    animation: none;
  }
}
</style>
