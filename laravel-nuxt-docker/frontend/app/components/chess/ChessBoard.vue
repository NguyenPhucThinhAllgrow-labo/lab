<script setup lang="ts">
import {
  computed,
  ref,
  watch,
} from 'vue'

import type {
  ChessPiece,
  PieceColor,
  Position,
} from '~/types/chess'

import {
  createInitialBoard,
} from '~/utils/chess/board'

import {
  getPseudoLegalMoves,
} from '~/utils/chess/move'

import {
  movePiece,
} from '~/utils/chess/game'

import {
  isInCheck,
  isCheckmate,
  isLegalMove,
} from '~/utils/chess/check'

/**
 * ==========================================
 * PROPS
 * ==========================================
 */

const props = defineProps<{
  currentTurn: PieceColor
  gameStarted: boolean
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
      piece: ChessPiece
      from: Position
      to: Position
      captured: ChessPiece | null
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

const board = ref<ChessPiece[]>(
  createInitialBoard(),
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
): ChessPiece | undefined {
  return board.value.find(
    (piece) =>
      piece.row === row &&
      piece.col === col,
  )
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
  piece: ChessPiece,
) {
  /**
   * Chưa bắt đầu game
   */

  if (!props.gameStarted) {
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

  if (!props.gameStarted) {
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

  const movedPiece: ChessPiece = {
    ...piece,
  }

  /**
   * Thực hiện nước đi.
   */

  const nextBoard =
    movePiece(
      board.value,
      piece.id,
      {
        row,
        col,
      },
    )

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

  const opponentColor:
    PieceColor =
      piece.color === 'red'
        ? 'black'
        : 'red'

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
  piece: ChessPiece,
): boolean {
  return (
    piece.color ===
    props.currentTurn
  )
}
</script>

<template>
  <div
    class="
      w-full
      max-w-[600px]
    "
  >
    <!-- ================================= -->
    <!-- TURN INDICATOR -->
    <!-- ================================= -->

    <div
      v-if="gameStarted"
      class="
        mb-3
        flex
        items-center
        justify-center
        gap-2
      "
    >
      <span
        class="
          h-2.5
          w-2.5
          rounded-full
        "
        :class="
          currentTurn === 'red'
            ? 'bg-red-500'
            : 'bg-slate-300'
        "
      />

      <span
        class="
          text-sm
          font-semibold
        "
        :class="
          currentTurn === 'red'
            ? 'text-red-400'
            : 'text-slate-300'
        "
      >
        Lượt
        {{
          currentTurn === 'red'
            ? 'Đỏ'
            : 'Đen'
        }}
      </span>

      <span
        v-if="
          currentPlayerInCheck
        "
        class="
          ml-2
          animate-pulse
          rounded-full
          bg-red-500/20
          px-3
          py-1
          text-xs
          font-bold
          text-red-400
          ring-1
          ring-red-500/40
        "
      >
        ⚠ ĐANG CHIẾU
      </span>
    </div>

    <!-- ================================= -->
    <!-- BOARD -->
    <!-- ================================= -->

    <div
      class="
        relative
        aspect-[8/9]
        w-full
        overflow-hidden
        rounded-lg
        border-[6px]
        border-[#5b3218]
        bg-[#e7c681]
        shadow-2xl
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
            (checkedGeneral.col / 8) *
              90
          }%`,

          top: `${
            5 +
            (checkedGeneral.row / 9) *
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
          pointer-events-none
          absolute
          left-[5%]
          right-[5%]
          top-[45%]
          h-[10%]
          bg-[#e7c681]
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
                gameStarted,

              'cursor-not-allowed':
                !gameStarted,
            }"
            :style="{
              left: `${
                ((col - 1) / 8) *
                100
              }%`,

              top: `${
                ((row - 1) / 9) *
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

            <ChessPiece
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
        v-if="!gameStarted"
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
</template>