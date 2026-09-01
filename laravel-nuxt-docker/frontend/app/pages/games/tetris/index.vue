<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref
} from 'vue'

type Cell = string | null
type Matrix = number[][]

interface Piece {
  id: string
  name: string
  shape: Matrix
  color: string
  glow: string
}

interface ActivePiece {
  piece: Piece
  shape: Matrix
  x: number
  y: number
}

interface Player {
  board: Cell[][]
  current: ActivePiece | null
  next: Piece | null
  pieceIndex: number
  score: number
  lines: number
  level: number
  gameOver: boolean
  clearingRows: number[]
  isClearing: boolean
}

type GameMode = 0 | 1 | 2

const ROWS = 20
const COLS = 10
const LINE_CLEAR_DURATION = 360

const pieces: Piece[] = [
  {
    id: 'I',
    name: 'I',
    shape: [[1, 1, 1, 1]],
    color: '#00e5ff',
    glow: '#00f0ff'
  },
  {
    id: 'O',
    name: 'O',
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#ffe600',
    glow: '#fff000'
  },
  {
    id: 'T',
    name: 'T',
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#b84cff',
    glow: '#b000ff'
  },
  {
    id: 'J',
    name: 'J',
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#3675ff',
    glow: '#0055ff'
  },
  {
    id: 'L',
    name: 'L',
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#ff9d21',
    glow: '#ff7800'
  },
  {
    id: 'S',
    name: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#21ed72',
    glow: '#00ff66'
  },
  {
    id: 'Z',
    name: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#ff3d63',
    glow: '#ff1744'
  }
]

const mode = ref<GameMode>(0)

const player1 = ref<Player>(createPlayer())
const player2 = ref<Player>(createPlayer())

const paused = ref(false)
const started = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null
let gameSession = 0

const SEQUENCE_BAGS = 100

let pieceSequence: Piece[] = []

/* =========================================================
   COMPUTED
========================================================= */

const winner = computed(() => {
  if (mode.value !== 2 || !started.value) {
    return ''
  }

  if (
    player1.value.gameOver &&
    player2.value.gameOver
  ) {
    return 'DRAW'
  }

  if (player1.value.gameOver) {
    return 'PLAYER 2 WINS'
  }

  if (player2.value.gameOver) {
    return 'PLAYER 1 WINS'
  }

  return ''
})

const speed = computed(() => {
  const highestLevel = Math.max(
    player1.value.level,
    mode.value === 2
      ? player2.value.level
      : 1
  )

  return Math.max(
    90,
    700 - (highestLevel - 1) * 55
  )
})

/* =========================================================
   BOARD / PLAYER
========================================================= */

function createBoard(): Cell[][] {
  return Array.from(
    { length: ROWS },
    () =>
      Array.from(
        { length: COLS },
        (): Cell => null
      )
  )
}

function createPlayer(): Player {
  return {
    board: createBoard(),
    current: null,
    next: null,
    pieceIndex: 0,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    clearingRows: [],
    isClearing: false
  }
}

function cloneShape(shape: Matrix): Matrix {
  return shape.map(row => [...row])
}

/* =========================================================
   RANDOMIZER
========================================================= */

function createBag(): Piece[] {
  const bag = [...pieces]

  for (
    let i = bag.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    )

    const temp = bag[i]!

    bag[i] = bag[j]!
    bag[j] = temp
  }

  return bag
}

function createPieceSequence(): void {
  pieceSequence = []

  for (
    let i = 0;
    i < SEQUENCE_BAGS;
    i++
  ) {
    pieceSequence.push(
      ...createBag()
    )
  }
}

function getPieceAt(index: number): Piece {
  if (!pieceSequence[index]) {
    createPieceSequence()
  }

  return pieceSequence[index]!
}

/* =========================================================
   SPAWN
========================================================= */

function spawnPlayer(
  player: Player,
  forcedPiece?: Piece
): boolean {
  const piece =
    forcedPiece ??
    getPieceAt(player.pieceIndex)

  const shape = cloneShape(
    piece.shape
  )

  const width =
    shape[0]?.length ?? 0

  const x = Math.floor(
    (COLS - width) / 2
  )

  const y = 0

  const active: ActivePiece = {
    piece,
    shape,
    x,
    y
  }

  if (
    collision(
      player,
      shape,
      x,
      y
    )
  ) {
    player.current = null
    player.gameOver = true

    return false
  }

  player.current = active

  player.next = getPieceAt(
    player.pieceIndex + 1
  )

  return true
}

/* =========================================================
   COLLISION
========================================================= */

function collision(
  player: Player,
  shape: Matrix,
  x: number,
  y: number
): boolean {
  for (
    let row = 0;
    row < shape.length;
    row++
  ) {
    const currentRow = shape[row]

    if (!currentRow) {
      continue
    }

    for (
      let col = 0;
      col < currentRow.length;
      col++
    ) {
      if (currentRow[col] !== 1) {
        continue
      }

      const newX = x + col
      const newY = y + row

      if (
        newX < 0 ||
        newX >= COLS ||
        newY >= ROWS
      ) {
        return true
      }

      if (newY < 0) {
        continue
      }

      const boardRow =
        player.board[newY]

      if (
        boardRow &&
        boardRow[newX] !== null
      ) {
        return true
      }
    }
  }

  return false
}

/* =========================================================
   MERGE
========================================================= */

function mergePiece(
  player: Player
): void {
  const active = player.current

  if (!active) {
    return
  }

  for (
    let row = 0;
    row < active.shape.length;
    row++
  ) {
    const currentRow =
      active.shape[row]

    if (!currentRow) {
      continue
    }

    for (
      let col = 0;
      col < currentRow.length;
      col++
    ) {
      if (currentRow[col] !== 1) {
        continue
      }

      const x =
        active.x + col

      const y =
        active.y + row

      if (
        x >= 0 &&
        x < COLS &&
        y >= 0 &&
        y < ROWS
      ) {
        const boardRow =
          player.board[y]

        if (boardRow) {
          boardRow[x] =
            active.piece.color
        }
      }
    }
  }

  player.current = null
}

/* =========================================================
   CLEAR LINES
========================================================= */

async function clearLines(
  player: Player
): Promise<void> {
  const clearingRows = player.board
    .map((row, index) =>
      row.every(cell => cell !== null)
        ? index
        : -1
    )
    .filter(index => index >= 0)

  const cleared = clearingRows.length

  if (cleared === 0) {
    return
  }

  player.isClearing = true
  player.clearingRows = clearingRows

  // Đợi Vue render class animation trước khi bắt đầu đếm thời gian.
  await nextTick()
  await new Promise<void>(resolve => {
    window.setTimeout(resolve, LINE_CLEAR_DURATION)
  })

  const remaining = player.board.filter(
    (_, index) => !clearingRows.includes(index)
  )

  while (
    remaining.length < ROWS
  ) {
    remaining.unshift(
      Array.from(
        { length: COLS },
        (): Cell => null
      )
    )
  }

  player.board = remaining

  player.clearingRows = []
  player.isClearing = false

  const points = [
    0,
    100,
    300,
    500,
    800
  ]

  player.score +=
    (points[cleared] ?? 0) *
    player.level

  player.lines += cleared

  player.level =
    Math.floor(
      player.lines / 10
    ) + 1
}

/* =========================================================
   ADVANCE
========================================================= */

function advancePiece(
  player: Player
): void {
  player.pieceIndex++

  spawnPlayer(player)
}

async function lockPiece(
  player: Player
): Promise<void> {
  const session = gameSession

  mergePiece(player)
  await clearLines(player)

  // Ignore delayed work left over from a restart, mode change, or unmount.
  if (
    session !== gameSession ||
    !started.value ||
    (
      player !== player1.value &&
      player !== player2.value
    )
  ) {
    return
  }

  advancePiece(player)
}

/* =========================================================
   MOVE DOWN
========================================================= */

function moveDown(
  player: Player,
  softDrop = false
): void {
  if (
    paused.value ||
    player.gameOver ||
    player.isClearing ||
    !started.value ||
    !player.current
  ) {
    return
  }

  const active =
    player.current

  if (
    !collision(
      player,
      active.shape,
      active.x,
      active.y + 1
    )
  ) {
    active.y++

    if (softDrop) {
      player.score += 1
    }

    return
  }

  void lockPiece(player)
}

/* =========================================================
   LEFT / RIGHT
========================================================= */

function moveLeft(
  player: Player
): void {
  if (
    paused.value ||
    player.gameOver ||
    player.isClearing ||
    !started.value ||
    !player.current
  ) {
    return
  }

  const active =
    player.current

  if (
    !collision(
      player,
      active.shape,
      active.x - 1,
      active.y
    )
  ) {
    active.x--
  }
}

function moveRight(
  player: Player
): void {
  if (
    paused.value ||
    player.gameOver ||
    player.isClearing ||
    !started.value ||
    !player.current
  ) {
    return
  }

  const active =
    player.current

  if (
    !collision(
      player,
      active.shape,
      active.x + 1,
      active.y
    )
  ) {
    active.x++
  }
}

/* =========================================================
   ROTATE
========================================================= */

function rotateMatrix(
  shape: Matrix
): Matrix {
  const height =
    shape.length

  const width =
    shape[0]?.length ?? 0

  return Array.from(
    { length: width },
    (_, col) =>
      Array.from(
        { length: height },
        (_, row) =>
          shape[
            height - 1 - row
          ]?.[col] ?? 0
      )
  )
}

function rotate(
  player: Player
): void {
  if (
    paused.value ||
    player.gameOver ||
    player.isClearing ||
    !started.value ||
    !player.current
  ) {
    return
  }

  const active =
    player.current

  const rotated =
    rotateMatrix(
      active.shape
    )

  const kicks = [
    0,
    -1,
    1,
    -2,
    2
  ]

  for (
    const kick of kicks
  ) {
    if (
      !collision(
        player,
        rotated,
        active.x + kick,
        active.y
      )
    ) {
      active.shape =
        rotated

      active.x += kick

      return
    }
  }
}

/* =========================================================
   HARD DROP
========================================================= */

function hardDrop(
  player: Player
): void {
  if (
    paused.value ||
    player.gameOver ||
    player.isClearing ||
    !started.value ||
    !player.current
  ) {
    return
  }

  const active =
    player.current

  let distance = 0

  while (
    !collision(
      player,
      active.shape,
      active.x,
      active.y + 1
    )
  ) {
    active.y++
    distance++
  }

  player.score +=
    distance * 2

  void lockPiece(player)
}

/* =========================================================
   CELL RENDER
========================================================= */

function getCellColor(
  player: Player,
  row: number,
  col: number
): string | null {
  const boardRow =
    player.board[row]

  if (!boardRow) {
    return null
  }

  const boardColor =
    boardRow[col]

  if (boardColor) {
    return boardColor
  }

  const active =
    player.current

  if (!active) {
    return null
  }

  const localRow =
    row - active.y

  const localCol =
    col - active.x

  const shapeRow =
    active.shape[localRow]

  if (!shapeRow) {
    return null
  }

  if (
    localCol < 0 ||
    localCol >= shapeRow.length
  ) {
    return null
  }

  if (
    shapeRow[localCol] !== 1
  ) {
    return null
  }

  return active.piece.color
}

function getCellGlow(
  player: Player,
  row: number,
  col: number
): string | undefined {
  const active =
    player.current

  if (!active) {
    return undefined
  }

  const localRow =
    row - active.y

  const localCol =
    col - active.x

  const shapeRow =
    active.shape[localRow]

  if (!shapeRow) {
    return undefined
  }

  if (
    localCol < 0 ||
    localCol >= shapeRow.length
  ) {
    return undefined
  }

  if (
    shapeRow[localCol] !== 1
  ) {
    return undefined
  }

  return active.piece.glow
}

/* =========================================================
   RESET
========================================================= */

function resetPlayers(): void {
  player1.value =
    createPlayer()

  player2.value =
    createPlayer()
}

/* =========================================================
   START
========================================================= */

function startGame(
  selectedMode: 1 | 2
): void {
  stopTimer()
  gameSession++

  mode.value =
    selectedMode

  resetPlayers()

  paused.value = false
  started.value = true

  /*
   * Tạo duy nhất một sequence.
   * Cả P1 và P2 lấy cùng sequence.
   */
  createPieceSequence()

  player1.value.pieceIndex = 0

  spawnPlayer(
    player1.value,
    getPieceAt(0)
  )

  if (selectedMode === 2) {
    player2.value.pieceIndex = 0

    spawnPlayer(
      player2.value,
      getPieceAt(0)
    )
  }

  restartTimer()
}

/* =========================================================
   RESTART
========================================================= */

function restartGame(): void {
  if (mode.value === 1) {
    startGame(1)
    return
  }

  if (mode.value === 2) {
    startGame(2)
  }
}

/* =========================================================
   TIMER
========================================================= */

function restartTimer(): void {
  stopTimer()

  scheduleTick()
}

function scheduleTick(): void {
  if (
    !started.value ||
    paused.value
  ) {
    return
  }

  timer = setTimeout(() => {
    timer = null

    gameTick()

    if (
      started.value &&
      !paused.value
    ) {
      scheduleTick()
    }
  }, speed.value)
}

function gameTick(): void {
  if (
    !started.value ||
    paused.value
  ) {
    return
  }

  if (
    !player1.value.gameOver
  ) {
    moveDown(
      player1.value
    )
  }

  if (
    mode.value === 2 &&
    !player2.value.gameOver
  ) {
    moveDown(
      player2.value
    )
  }

  if (
    mode.value === 1 &&
    player1.value.gameOver
  ) {
    stopTimer()
    return
  }

  if (
    mode.value === 2 &&
    player1.value.gameOver &&
    player2.value.gameOver
  ) {
    stopTimer()
  }
}

function stopTimer(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

/* =========================================================
   PAUSE
========================================================= */

function togglePause(): void {
  if (
    !started.value ||
    (
      player1.value.gameOver &&
      (
        mode.value === 1 ||
        player2.value.gameOver
      )
    )
  ) {
    return
  }

  paused.value =
    !paused.value

  if (paused.value) {
    stopTimer()
  } else {
    restartTimer()
  }
}

/* =========================================================
   BACK
========================================================= */

function backToMode(): void {
  stopTimer()
  gameSession++

  started.value = false
  paused.value = false
  mode.value = 0

  resetPlayers()

  pieceSequence = []
}

/* =========================================================
   KEYBOARD
========================================================= */

function handleKeydown(
  event: KeyboardEvent
): void {
  if (
    event.key === 'Escape'
  ) {
    event.preventDefault()

    backToMode()

    return
  }

  if (!started.value) {
    if (event.key === '1') {
      startGame(1)
    }

    if (event.key === '2') {
      startGame(2)
    }

    return
  }

  if (
    event.key === 'r' ||
    event.key === 'R'
  ) {
    event.preventDefault()

    restartGame()

    return
  }

  if (
    event.key === 'p' ||
    event.key === 'P'
  ) {
    event.preventDefault()

    togglePause()

    return
  }

  switch (event.key) {
    case 'a':
    case 'A':
      event.preventDefault()
      moveLeft(player1.value)
      break

    case 'd':
    case 'D':
      event.preventDefault()
      moveRight(player1.value)
      break

    case 's':
    case 'S':
      event.preventDefault()
      moveDown(
        player1.value,
        true
      )
      break

    case 'w':
    case 'W':
      event.preventDefault()
      rotate(player1.value)
      break

    case ' ':
      event.preventDefault()
      hardDrop(player1.value)
      break
  }

  if (mode.value === 2) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        moveLeft(player2.value)
        break

      case 'ArrowRight':
        event.preventDefault()
        moveRight(player2.value)
        break

      case 'ArrowDown':
        event.preventDefault()
        moveDown(
          player2.value,
          true
        )
        break

      case 'ArrowUp':
        event.preventDefault()
        rotate(player2.value)
        break

      case 'Enter':
        event.preventDefault()
        hardDrop(player2.value)
        break
    }
  }
}

/* =========================================================
   LIFECYCLE
========================================================= */

onMounted(() => {
  window.addEventListener(
    'keydown',
    handleKeydown
  )
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'keydown',
    handleKeydown
  )

  stopTimer()
  gameSession++
})
</script>

<template>
  <div class="game-page">

    <!-- =================================================
         MODE SELECT
    ================================================= -->

    <div
      v-if="!started"
      class="mode-screen"
    >
      <div class="mode-card">

        <div class="logo">
          <span>TETRIS</span>
          <small>NUXT EDITION</small>
        </div>

        <div class="mode-title">
          SELECT MODE
        </div>

        <div class="mode-buttons">

          <button
            class="mode-button"
            @click="startGame(1)"
          >
            <span class="mode-number">
              01
            </span>

            <span>
              <strong>
                1 PLAYER
              </strong>

              <small>
                A / D / S / W
              </small>
            </span>
          </button>

          <button
            class="mode-button mode-two"
            @click="startGame(2)"
          >
            <span class="mode-number">
              02
            </span>

            <span>
              <strong>
                2 PLAYERS
              </strong>

              <small>
                SAME PIECES · VS
              </small>
            </span>
          </button>

        </div>

        <div class="mode-hint">
          PRESS 1 OR 2 TO START
        </div>

      </div>
    </div>

    <!-- =================================================
         GAME
    ================================================= -->

    <div
      v-else
      class="game-container"
    >

      <!-- HEADER -->

      <header class="header">

        <div>
          <h1>TETRIS</h1>

          <p>
            {{
              mode === 2
                ? 'BATTLE MODE'
                : 'NUXT EDITION'
            }}
          </p>
        </div>

        <div class="header-actions">

          <button
            class="restart-button"
            @click="restartGame"
          >
            ↻ RESTART
          </button>

          <button
            class="back-button"
            @click="backToMode"
          >
            ← MODE
          </button>

          <div class="status">
            <span
              :class="{
                online:
                  started &&
                  !player1.gameOver,
                danger:
                  player1.gameOver
              }"
            >
              ●
            </span>

            {{
              winner ||
              (
                paused
                  ? 'PAUSED'
                  : 'PLAYING'
              )
            }}
          </div>

        </div>

      </header>

      <!-- =================================================
           GAME LAYOUT
      ================================================= -->

      <main
        class="game-layout"
        :class="{
          versus: mode === 2
        }"
      >

        <!-- =================================================
             PLAYER 1
        ================================================= -->

        <section class="player-section">

          <div class="player-title">
            <span>
              PLAYER 1
            </span>

            <span class="player-color p1">
              ●
            </span>
          </div>

          <!-- TOP INFO -->

          <div class="player-top">

            <!-- NEXT -->

            <div class="next-panel">

              <span>NEXT</span>

              <div class="next-box">

                <div
                  v-if="player1.next"
                  class="mini-piece"
                  :class="`piece-${player1.next.id}`"
                >

                  <div
                    v-for="(
                      row,
                      r
                    ) in player1.next.shape"
                    :key="r"
                    class="mini-row"
                  >

                    <div
                      v-for="(
                        cell,
                        c
                      ) in row"
                      :key="c"
                      class="mini-cell"
                      :class="{
                        active:
                          cell === 1
                      }"
                      :style="
                        cell === 1
                          ? {
                              background:
                                player1.next.color,
                              '--glow':
                                player1.next.glow
                            }
                          : {}
                      "
                    />

                  </div>

                </div>

              </div>

            </div>

            <!-- STATS -->

            <div class="stats">

              <div>
                <span>SCORE</span>

                <strong>
                  {{ player1.score }}
                </strong>
              </div>

              <div>
                <span>LINES</span>

                <strong>
                  {{ player1.lines }}
                </strong>
              </div>

              <div>
                <span>LEVEL</span>

                <strong>
                  {{ player1.level }}
                </strong>
              </div>

            </div>

          </div>

          <!-- BOARD -->

          <div class="board-wrapper">

            <div class="board">

              <div
                v-for="(
                  row,
                  rowIndex
                ) in player1.board"
                :key="rowIndex"
                class="board-row"
                :class="{
                  'line-clearing':
                    player1.clearingRows.includes(rowIndex)
                }"
              >

                <div
                  v-for="(
                    _,
                    colIndex
                  ) in row"
                  :key="colIndex"
                  class="cell"
                  :class="{
                    filled:
                      getCellColor(
                        player1,
                        rowIndex,
                        colIndex
                      )
                  }"
                  :style="{
                    '--cell-color':
                      getCellColor(
                        player1,
                        rowIndex,
                        colIndex
                      ) || 'transparent',

                    '--piece-glow':
                      getCellGlow(
                        player1,
                        rowIndex,
                        colIndex
                      ) || 'transparent'
                  }"
                />

              </div>

              <!-- GAME OVER -->

              <div
                v-if="player1.gameOver"
                class="overlay"
              >
                <div>

                  <strong>
                    GAME OVER
                  </strong>

                  <span>
                    SCORE:
                    {{ player1.score }}
                  </span>

                </div>
              </div>

              <!-- PAUSE -->

              <div
                v-if="
                  paused &&
                  !player1.gameOver
                "
                class="overlay"
              >
                <div>

                  <strong>
                    PAUSED
                  </strong>

                  <span>
                    PRESS P
                  </span>

                </div>
              </div>

            </div>

            <!-- MOBILE CONTROLS -->

            <div class="mobile-controls">

              <button
                @click="
                  moveLeft(player1)
                "
              >
                ◀
              </button>

              <button
                @click="
                  moveDown(player1)
                "
              >
                ▼
              </button>

              <button
                @click="
                  moveRight(player1)
                "
              >
                ▶
              </button>

              <button
                @click="
                  rotate(player1)
                "
              >
                ↻
              </button>

              <button
                @click="
                  hardDrop(player1)
                "
              >
                ⬇
              </button>

            </div>

          </div>

        </section>

        <!-- =================================================
             CENTER / VS
        ================================================= -->

        <aside
          v-if="mode === 2"
          class="center-panel"
        >

          <div class="vs">
            VS
          </div>

          <button
            class="pause-button"
            @click="togglePause"
          >
            {{
              paused
                ? 'RESUME'
                : 'PAUSE'
            }}
          </button>

          <button
            class="mode-back"
            @click="restartGame"
          >
            ↻ RESTART
          </button>

          <button
            class="mode-back"
            @click="backToMode"
          >
            ← MODES
          </button>

          <div class="keyboard-info">

            <strong>
              SAME BLOCKS
            </strong>

            <span>
              Both players receive
              the exact same
              piece sequence.
            </span>

          </div>

        </aside>

        <!-- =================================================
             PLAYER 2
        ================================================= -->

        <section
          v-if="mode === 2"
          class="player-section"
        >

          <div class="player-title">
            <span>
              PLAYER 2
            </span>

            <span class="player-color p2">
              ●
            </span>
          </div>

          <!-- TOP INFO -->

          <div class="player-top">

            <!-- NEXT -->

            <div class="next-panel">

              <span>NEXT</span>

              <div class="next-box">

                <div
                  v-if="player2.next"
                  class="mini-piece"
                  :class="`piece-${player2.next.id}`"
                >

                  <div
                    v-for="(
                      row,
                      r
                    ) in player2.next.shape"
                    :key="r"
                    class="mini-row"
                  >

                    <div
                      v-for="(
                        cell,
                        c
                      ) in row"
                      :key="c"
                      class="mini-cell"
                      :class="{
                        active:
                          cell === 1
                      }"
                      :style="
                        cell === 1
                          ? {
                              background:
                                player2.next.color,
                              '--glow':
                                player2.next.glow
                            }
                          : {}
                      "
                    />

                  </div>

                </div>

              </div>

            </div>

            <!-- STATS -->

            <div class="stats">

              <div>
                <span>SCORE</span>

                <strong>
                  {{ player2.score }}
                </strong>
              </div>

              <div>
                <span>LINES</span>

                <strong>
                  {{ player2.lines }}
                </strong>
              </div>

              <div>
                <span>LEVEL</span>

                <strong>
                  {{ player2.level }}
                </strong>
              </div>

            </div>

          </div>

          <!-- BOARD -->

          <div class="board-wrapper">

            <div class="board">

              <div
                v-for="(
                  row,
                  rowIndex
                ) in player2.board"
                :key="rowIndex"
                class="board-row"
                :class="{
                  'line-clearing':
                    player2.clearingRows.includes(rowIndex)
                }"
              >

                <div
                  v-for="(
                    _,
                    colIndex
                  ) in row"
                  :key="colIndex"
                  class="cell"
                  :class="{
                    filled:
                      getCellColor(
                        player2,
                        rowIndex,
                        colIndex
                      )
                  }"
                  :style="{
                    '--cell-color':
                      getCellColor(
                        player2,
                        rowIndex,
                        colIndex
                      ) || 'transparent',

                    '--piece-glow':
                      getCellGlow(
                        player2,
                        rowIndex,
                        colIndex
                      ) || 'transparent'
                  }"
                />

              </div>

              <!-- GAME OVER -->

              <div
                v-if="player2.gameOver"
                class="overlay"
              >
                <div>

                  <strong>
                    GAME OVER
                  </strong>

                  <span>
                    SCORE:
                    {{ player2.score }}
                  </span>

                </div>
              </div>

              <!-- PAUSE -->

              <div
                v-if="
                  paused &&
                  !player2.gameOver
                "
                class="overlay"
              >
                <div>

                  <strong>
                    PAUSED
                  </strong>

                  <span>
                    PRESS P
                  </span>

                </div>
              </div>

            </div>

            <!-- MOBILE CONTROLS -->

            <div class="mobile-controls">

              <button
                @click="
                  moveLeft(player2)
                "
              >
                ◀
              </button>

              <button
                @click="
                  moveDown(player2)
                "
              >
                ▼
              </button>

              <button
                @click="
                  moveRight(player2)
                "
              >
                ▶
              </button>

              <button
                @click="
                  rotate(player2)
                "
              >
                ↻
              </button>

              <button
                @click="
                  hardDrop(player2)
                "
              >
                ⬇
              </button>

            </div>

          </div>

        </section>

      </main>

      <!-- BOTTOM CONTROLS -->

      <div class="bottom-controls">

        <span>
          P
          <small>PAUSE</small>
        </span>

        <span>
          R
          <small>RESTART</small>
        </span>

        <span>
          ESC
          <small>BACK TO MODE</small>
        </span>

        <span>
          1 / 2
          <small>SELECT MODE</small>
        </span>

      </div>

      <footer>
        BUILT WITH NUXT 3 · VUE 3
      </footer>

    </div>
  </div>
</template>

<style scoped>
  @import "~/assets/css/tetris.css";
</style>
