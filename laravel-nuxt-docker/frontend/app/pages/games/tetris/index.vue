<script setup lang="ts">
import {
  computed,
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
}

type GameMode = 0 | 1 | 2

const ROWS = 20
const COLS = 10

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
    gameOver: false
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

function clearLines(
  player: Player
): void {
  let cleared = 0

  const remaining =
    player.board.filter(row => {
      const full =
        row.every(
          cell => cell !== null
        )

      if (full) {
        cleared++
        return false
      }

      return true
    })

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

  if (cleared === 0) {
    return
  }

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

  mergePiece(player)
  clearLines(player)
  advancePiece(player)
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

  mergePiece(player)
  clearLines(player)
  advancePiece(player)
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
* {
  box-sizing: border-box;
}

.game-page {
  min-height: 100vh;
  padding: 0 16px;

  color: white;

  display: flex;
  justify-content: center;
  align-items: center;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background:
    radial-gradient(
      circle at 50% 15%,
      #18253c 0,
      #080b12 42%,
      #030407 100%
    );
}

/* =========================================================
   MODE
========================================================= */

.mode-screen {
  width: 100%;
  min-height: 90vh;

  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-card {
  width: 100%;
  max-width: 500px;

  padding: 45px;

  text-align: center;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(18, 25, 40, .95),
      rgba(7, 10, 17, .96)
    );

  border: 1px solid #29344a;

  box-shadow:
    0 30px 100px rgba(0, 0, 0, .6),
    inset 0 1px rgba(255,255,255,.04);
}

.logo span {
  display: block;

  font-size: 54px;
  font-weight: 1000;
  letter-spacing: 9px;

  background:
    linear-gradient(
      90deg,
      #00f0ff,
      #7b5cff,
      #ff35c8
    );

  -webkit-background-clip: text;
  color: transparent;
}

.logo small {
  display: block;

  margin-top: 5px;

  color: #68758b;

  font-size: 10px;
  letter-spacing: 5px;
}

.mode-title {
  margin: 42px 0 18px;

  color: #77849a;

  font-size: 11px;
  font-weight: 800;
  letter-spacing: 3px;
}

.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-button {
  width: 100%;

  display: flex;
  align-items: center;

  gap: 18px;

  padding: 17px 20px;

  text-align: left;

  cursor: pointer;

  color: white;

  background: #101722;

  border: 1px solid #2a3549;

  border-radius: 12px;

  transition:
    transform .2s ease,
    border-color .2s ease,
    background .2s ease,
    box-shadow .2s ease;
}

.mode-button:hover {
  transform: translateY(-2px);

  border-color: #00e5ff;

  background: #142033;

  box-shadow:
    0 10px 35px
    rgba(0, 229, 255, .12);
}

.mode-two:hover {
  border-color: #ff3fc9;

  box-shadow:
    0 10px 35px
    rgba(255, 63, 201, .12);
}

.mode-number {
  color: #00e5ff;

  font-size: 25px;
  font-weight: 900;
}

.mode-two .mode-number {
  color: #ff43c9;
}

.mode-button strong {
  display: block;

  font-size: 13px;
  letter-spacing: 2px;
}

.mode-button small {
  display: block;

  margin-top: 4px;

  color: #65738a;

  font-size: 9px;
  letter-spacing: 1px;
}

.mode-hint {
  margin-top: 25px;

  color: #424d61;

  font-size: 9px;
  letter-spacing: 2px;
}

/* =========================================================
   GAME
========================================================= */

.game-container {
  width: 100%;
  max-width: 1150px;

  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header h1 {
  margin: 0;

  font-size: 38px;
  font-weight: 1000;
  letter-spacing: 7px;

  background:
    linear-gradient(
      90deg,
      #00f0ff,
      #7b5cff,
      #ff35c8
    );

  -webkit-background-clip: text;
  color: transparent;
}

.header p {
  margin: 3px 0 0;

  color: #5d6a81;

  font-size: 9px;
  letter-spacing: 4px;
}

.header-actions {
  display: flex;
  align-items: center;

  gap: 9px;
}

.back-button,
.mode-back,
.restart-button {
  color: #aab6ca;

  background: #111824;

  border: 1px solid #2a3548;

  border-radius: 7px;

  padding: 8px 11px;

  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;

  cursor: pointer;

  transition:
    color .2s ease,
    border-color .2s ease,
    background .2s ease,
    box-shadow .2s ease,
    transform .2s ease;
}

.back-button:hover,
.mode-back:hover {
  color: white;
  border-color: #00e5ff;
}

.restart-button {
  color: #00e5ff;

  border-color: #25465a;
}

.restart-button:hover {
  color: white;

  border-color: #00e5ff;

  background: #142636;

  box-shadow:
    0 0 18px
    rgba(0, 229, 255, .18);

  transform: translateY(-1px);
}

.status {
  color: #7d8aa1;

  font-size: 10px;
  font-weight: 800;

  letter-spacing: 2px;

  white-space: nowrap;
}

.status span {
  color: #333d4d;

  margin-right: 6px;
}

.status .online {
  color: #00ff9d;

  text-shadow:
    0 0 10px #00ff9d;
}

.status .danger {
  color: #ff375f;

  text-shadow:
    0 0 10px #ff375f;
}

/* =========================================================
   LAYOUT
========================================================= */

.game-layout {
  display: grid;

  grid-template-columns:
    minmax(300px, 420px);

  justify-content: center;

  gap: 25px;
}

.game-layout.versus {
  grid-template-columns:
    minmax(270px, 360px)
    110px
    minmax(270px, 360px);

  align-items: start;

  gap: 18px;
}

.player-section {
  min-width: 0;
}

.player-title {
  height: 30px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 7px;

  color: #8592a8;

  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
}

.player-color.p1 {
  color: #00e5ff;

  text-shadow:
    0 0 10px #00e5ff;
}

.player-color.p2 {
  color: #ff3ec8;

  text-shadow:
    0 0 10px #ff3ec8;
}

/* =========================================================
   TOP AREA
========================================================= */

.player-top {
  width: 100%;

  display: grid;

  grid-template-columns:
    72px
    minmax(0, 1fr);

  align-items: stretch;

  gap: 10px;

  margin-bottom: 8px;
}

/* =========================================================
   NEXT
========================================================= */

.next-panel {
  width: 72px;
  min-width: 72px;

  height: 62px;

  display: flex;
  flex-direction: column;
  align-items: center;

  color: #637087;

  font-size: 8px;
  font-weight: 900;

  letter-spacing: 2px;
}

.next-panel > span {
  display: block;

  height: 10px;

  line-height: 10px;
}

.next-box {
  position: relative;

  width: 72px;
  height: 48px;

  margin-top: 4px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 7px;

  background:
    linear-gradient(
      145deg,
      #111925,
      #080c13
    );

  border: 1px solid #29344a;

  box-shadow:
    inset 0 0 18px rgba(0,0,0,.5);
}

.mini-piece {
  width: 42px;
  height: 30px;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;
}

.mini-row {
  width: max-content;

  display: flex;

  justify-content: center;

  height: 8px;
}

.mini-cell {
  width: 8px;
  height: 8px;

  flex: 0 0 8px;

  margin: .5px;

  border-radius: 2px;

  opacity: 0;
}

.mini-cell.active {
  opacity: 1;

  border:
    1px solid
    rgba(255,255,255,.4);

  box-shadow:
    inset 1px 1px
      rgba(255,255,255,.4),
    0 0 6px
      var(--glow);
}

.mini-piece.piece-I {
  transform: scale(.9);
}

/* =========================================================
   STATS
========================================================= */

.stats {
  min-width: 0;

  height: 62px;

  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 5px;

  align-items: stretch;
}

.stats div {
  min-width: 0;
  min-height: 62px;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  padding: 7px 4px;

  text-align: center;

  border-radius: 7px;

  background: #0c111a;

  border: 1px solid #202a3b;
}

.stats span {
  display: block;

  color: #5d6a80;

  font-size: 7px;
  line-height: 1;

  letter-spacing: 1px;

  white-space: nowrap;
}

.stats strong {
  display: block;

  margin-top: 5px;

  color: #e7efff;

  font-size: 14px;
  line-height: 1;

  white-space: nowrap;
}

/* =========================================================
   BOARD
========================================================= */

.board-wrapper {
  width: 100%;

  display: flex;
  flex-direction: column;

  gap: 9px;
}

.board {
  position: relative;

  width: 100%;

  aspect-ratio: 1 / 1.5;

  padding: 5px;

  overflow: hidden;

  border-radius: 11px;

  background:
    linear-gradient(
      145deg,
      #0d131d,
      #05080d
    );

  border: 1px solid #293449;

  box-shadow:
    0 25px 60px rgba(0,0,0,.5),
    inset 0 0 30px rgba(0,0,0,.7);
}

.board-row {
  display: grid;

  grid-template-columns:
    repeat(10, 1fr);

  height: 5%;
}

/*
 * QUAN TRỌNG:
 * Không transition background / transform ở đây.
 *
 * Đây là nguyên nhân chính khiến block bị:
 * - giật
 * - ghost
 * - để lại ô đen
 * - repaint chậm
 */
.cell {
  position: relative;

  margin: 1px;

  border-radius: 2px;

  background: #101620;

  border:
    1px solid
    rgba(255,255,255,.025);

  /*
   * Ép browser render ổn định.
   */
  contain: paint;

  transform: translateZ(0);
}

.cell.filled {
  background: var(--cell-color);

  border-color:
    rgba(255,255,255,.38);

  box-shadow:
    inset 2px 2px 0
      rgba(255,255,255,.32),

    inset -2px -2px 0
      rgba(0,0,0,.25),

    0 0 8px
      var(--piece-glow);
}

.cell.filled::after {
  content: "";

  position: absolute;

  left: 10%;
  right: 10%;
  top: 8%;

  height: 18%;

  border-radius: 50%;

  background:
    rgba(255,255,255,.35);

  pointer-events: none;
}

/* =========================================================
   OVERLAY
========================================================= */

.overlay {
  position: absolute;

  inset: 0;

  z-index: 10;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    rgba(2,5,10,.72);

  backdrop-filter:
    blur(3px);
}

.overlay > div {
  display: flex;
  flex-direction: column;

  align-items: center;

  gap: 8px;

  text-align: center;
}

.overlay strong {
  font-size: 22px;
  letter-spacing: 3px;
}

.overlay span {
  color: #718098;

  font-size: 9px;
  letter-spacing: 2px;
}

/* =========================================================
   CENTER
========================================================= */

.center-panel {
  min-height: 150px;

  display: flex;
  flex-direction: column;

  align-items: center;

  gap: 10px;

  padding-top: 40px;
}

.vs {
  color: #ff43c9;

  font-size: 30px;
  font-weight: 1000;

  text-shadow:
    0 0 20px
    rgba(255, 50, 200, .45);
}

.pause-button {
  width: 100%;

  padding: 10px;

  color: #c8d2e5;

  background: #111824;

  border: 1px solid #29344a;

  border-radius: 7px;

  cursor: pointer;

  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;

  transition:
    color .2s ease,
    border-color .2s ease;
}

.pause-button:hover {
  color: white;

  border-color: #00e5ff;
}

.keyboard-info {
  margin-top: 20px;

  text-align: center;
}

.keyboard-info strong {
  display: block;

  color: #6d7990;

  font-size: 8px;
  letter-spacing: 1px;
}

.keyboard-info span {
  display: block;

  margin-top: 7px;

  color: #424d61;

  font-size: 8px;

  line-height: 1.5;
}

/* =========================================================
   MOBILE CONTROLS
========================================================= */

.mobile-controls {
  display: none;

  grid-template-columns:
    repeat(5, 1fr);

  gap: 5px;
}

.mobile-controls button {
  height: 40px;

  color: #dce6f8;

  background: #111824;

  border:
    1px solid
    #2a3448;

  border-radius: 7px;

  font-size: 16px;
}

.mobile-controls button:active {
  background: #1e2a3e;

  transform: scale(.95);
}

/* =========================================================
   BOTTOM
========================================================= */

.bottom-controls {
  margin-top: 17px;

  display: flex;
  justify-content: center;

  gap: 20px;

  color: #515e74;

  font-size: 8px;
  letter-spacing: 1px;
}

.bottom-controls span {
  display: flex;

  gap: 5px;

  align-items: center;
}

.bottom-controls small {
  color: #394456;
}

footer {
  margin-top: 15px;

  text-align: center;

  color: #303a4d;

  font-size: 8px;

  letter-spacing: 3px;
}

/* =========================================================
   TABLET
========================================================= */

@media (max-width: 1000px) {
  .game-layout.versus {
    grid-template-columns:
      minmax(230px, 1fr)
      75px
      minmax(230px, 1fr);

    gap: 10px;
  }

  .center-panel {
    padding-top: 35px;
  }

  .player-top {
    grid-template-columns:
      60px
      minmax(0, 1fr);

    gap: 7px;
  }

  .next-panel {
    width: 60px;
    min-width: 60px;
  }

  .next-box {
    width: 60px;
  }

  .stats {
    gap: 4px;
  }

  .stats div {
    min-height: 62px;

    padding: 6px 3px;
  }

  .stats span {
    font-size: 6.5px;
  }

  .stats strong {
    font-size: 13px;
  }
}

/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 760px) {
  .game-page {
    min-height: 100dvh;

    padding: 12px 8px;

    align-items: flex-start;
  }

  .game-container {
    max-width: 500px;

    margin: 0 auto;
  }

  .header {
    margin-bottom: 12px;
  }

  .header h1 {
    font-size: 28px;
    letter-spacing: 5px;
  }

  .header-actions {
    gap: 5px;
  }

  .back-button,
  .restart-button {
    font-size: 8px;
    padding: 7px;
  }

  .status {
    display: none;
  }

  .game-layout,
  .game-layout.versus {
    grid-template-columns: 1fr;

    gap: 18px;
  }

  .player-section {
    width: 100%;

    max-width: 430px;

    margin: 0 auto;
  }

  .center-panel {
    order: 2;

    min-height: auto;

    padding: 0;

    flex-direction: row;

    justify-content: center;
  }

  .center-panel .vs {
    display: none;
  }

  .keyboard-info {
    display: none;
  }

  .player-top {
    width: 100%;

    grid-template-columns:
      62px
      minmax(0, 1fr);

    gap: 7px;

    align-items: stretch;
  }

  .next-panel {
    width: 62px;
    min-width: 62px;

    height: 58px;
  }

  .next-box {
    width: 62px;
    height: 44px;
  }

  .mini-piece {
    width: 40px;
    height: 28px;
  }

  .mini-cell {
    width: 7px;
    height: 7px;

    flex-basis: 7px;
  }

  .mini-row {
    height: 7px;
  }

  .stats {
    width: 100%;

    height: 58px;

    gap: 4px;
  }

  .stats div {
    min-height: 58px;

    padding: 6px 3px;
  }

  .stats span {
    font-size: 6px;
  }

  .stats strong {
    font-size: 13px;
  }

  .mobile-controls {
    display: grid;
  }

  .bottom-controls {
    display: none;
  }

  footer {
    margin-bottom: 8px;
  }
}

/* =========================================================
   SMALL MOBILE
========================================================= */

@media (max-width: 450px) {
  .game-page {
    padding:
      10px 6px;
  }

  .mode-card {
    padding:
      30px 20px;
  }

  .logo span {
    font-size: 40px;
  }

  .header h1 {
    font-size: 24px;
  }

  .header-actions {
    flex-wrap: wrap;

    justify-content: flex-end;
  }

  .player-top {
    grid-template-columns:
      54px
      minmax(0, 1fr);

    gap: 5px;
  }

  .next-panel {
    width: 54px;
    min-width: 54px;

    height: 54px;
  }

  .next-box {
    width: 54px;
    height: 42px;
  }

  .mini-piece {
    width: 38px;
    height: 26px;
  }

  .mini-cell {
    width: 6px;
    height: 6px;

    flex-basis: 6px;
  }

  .mini-row {
    height: 6px;
  }

  .stats {
    height: 54px;

    gap: 3px;
  }

  .stats div {
    min-height: 54px;

    padding:
      6px 2px;
  }

  .stats span {
    font-size: 6px;
  }

  .stats strong {
    font-size: 12px;
  }

  .board {
    border-radius: 8px;
  }
}
</style>