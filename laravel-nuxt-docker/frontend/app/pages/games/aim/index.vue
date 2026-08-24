<script setup lang="ts">
type Circle = {
  x: number
  y: number
  size: number
}

const playing = ref(false)
const score = ref(0)
const hits = ref(0)
const misses = ref(0)
const reaction = ref(0)
const bestReaction = ref<number | null>(null)
const circle = ref<Circle | null>(null)

let spawnedAt = 0
let gameTimer: ReturnType<typeof setTimeout> | null = null

const GAME_TIME = 30
const CIRCLE_SIZE = 55

const timeLeft = ref(GAME_TIME)

const accuracy = computed(() => {
  const total = hits.value + misses.value

  if (!total) return 100

  return Math.round((hits.value / total) * 100)
})

function spawnCircle() {
  const padding = CIRCLE_SIZE / 2 + 20

  circle.value = {
    x: Math.random() * (100 - (padding / window.innerWidth) * 200)
      + (padding / window.innerWidth) * 100,

    y: Math.random() * (100 - (padding / window.innerHeight) * 200)
      + (padding / window.innerHeight) * 100,

    size: CIRCLE_SIZE
  }

  spawnedAt = performance.now()
}

function startGame() {
  score.value = 0
  hits.value = 0
  misses.value = 0
  reaction.value = 0
  timeLeft.value = GAME_TIME
  playing.value = true

  spawnCircle()

  gameTimer = setInterval(() => {
    timeLeft.value--

    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

function hitCircle(event: MouseEvent) {
  event.stopPropagation()

  if (!playing.value || !circle.value) return

  const currentReaction = Math.round(
    performance.now() - spawnedAt
  )

  reaction.value = currentReaction

  if (
    bestReaction.value === null ||
    currentReaction < bestReaction.value
  ) {
    bestReaction.value = currentReaction
    localStorage.setItem(
      'aim-best-reaction',
      String(currentReaction)
    )
  }

  hits.value++

  // Điểm càng cao nếu click càng nhanh
  const points = Math.max(
    10,
    Math.round(1000 / currentReaction * 100)
  )

  score.value += points

  spawnCircle()
}

function miss() {
  if (!playing.value) return

  misses.value++
}

function endGame() {
  playing.value = false
  circle.value = null

  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

function resetBest() {
  bestReaction.value = null
  localStorage.removeItem('aim-best-reaction')
}

onMounted(() => {
  const saved = localStorage.getItem('aim-best-reaction')

  if (saved) {
    bestReaction.value = Number(saved)
  }
})

onUnmounted(() => {
  if (gameTimer) {
    clearInterval(gameTimer)
  }
})
</script>

<template>
  <main class="aim-page">

    <!-- HEADER -->
    <header class="header">
      <div>
        <div class="eyebrow">AIM TRAINER</div>
        <h1>Click The Circle</h1>
      </div>

      <div v-if="playing" class="stats">
        <div>
          <span>TIME</span>
          <strong>{{ timeLeft }}s</strong>
        </div>

        <div>
          <span>SCORE</span>
          <strong>{{ score }}</strong>
        </div>

        <div>
          <span>ACCURACY</span>
          <strong>{{ accuracy }}%</strong>
        </div>
      </div>
    </header>

    <!-- START SCREEN -->
    <section
      v-if="!playing && hits === 0"
      class="start-screen"
    >
      <div class="crosshair">⌖</div>

      <h2>Test your aim</h2>

      <p>
        Click vào các hình tròn xuất hiện trên màn hình
        nhanh và chính xác nhất có thể.
      </p>

      <button @click="startGame">
        START AIM TEST
      </button>

      <div
        v-if="bestReaction"
        class="best"
      >
        ⚡ Best reaction:
        <strong>{{ bestReaction }} ms</strong>
      </div>
    </section>

    <!-- GAME -->
    <section
      v-else-if="playing"
      class="arena"
      @click="miss"
    >
      <div
        v-if="circle"
        class="target"
        :style="{
          left: `${circle.x}%`,
          top: `${circle.y}%`,
          width: `${circle.size}px`,
          height: `${circle.size}px`
        }"
        @click="hitCircle"
      >
        <span></span>
      </div>

      <div class="hint">
        CLICK THE CIRCLE
      </div>
    </section>

    <!-- RESULT -->
    <section
      v-else
      class="result-screen"
    >
      <div class="result-icon">
        🎯
      </div>

      <h2>Game Over</h2>

      <div class="final-score">
        {{ score }}
        <span>points</span>
      </div>

      <div class="result-grid">
        <div>
          <span>HITS</span>
          <strong>{{ hits }}</strong>
        </div>

        <div>
          <span>MISS</span>
          <strong>{{ misses }}</strong>
        </div>

        <div>
          <span>ACCURACY</span>
          <strong>{{ accuracy }}%</strong>
        </div>

        <div>
          <span>BEST REACTION</span>
          <strong>
            {{ bestReaction ? `${bestReaction} ms` : '-' }}
          </strong>
        </div>
      </div>

      <button @click="startGame">
        PLAY AGAIN
      </button>

      <button
        class="reset"
        @click="resetBest"
      >
        Reset best
      </button>
    </section>

  </main>
</template>

<style scoped>
.aim-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at center,
      #172033 0%,
      #0b0f18 70%
    );
  color: white;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* HEADER */

.header {
  height: 90px;
  padding: 20px 35px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(8, 12, 20, 0.85);
  border-bottom: 1px solid #222b3a;
}

.eyebrow {
  color: #38bdf8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 3px;
}

h1 {
  margin: 3px 0 0;
  font-size: 22px;
}

.stats {
  display: flex;
  gap: 35px;
}

.stats div {
  min-width: 70px;
  display: flex;
  flex-direction: column;
  text-align: right;
}

.stats span,
.result-grid span {
  color: #68758a;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.stats strong {
  margin-top: 4px;
  font-size: 17px;
}

/* START */

.start-screen,
.result-screen {
  min-height: calc(100vh - 90px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.crosshair,
.result-icon {
  font-size: 75px;
  margin-bottom: 10px;
}

.start-screen h2,
.result-screen h2 {
  margin: 0;
  font-size: 42px;
  font-weight: 900;
}

.start-screen p {
  max-width: 500px;
  color: #8290a6;
  line-height: 1.7;
  margin: 15px 20px 30px;
}

button {
  border: none;
  padding: 16px 30px;
  border-radius: 10px;
  background: #38bdf8;
  color: #03111a;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: 0.15s;
}

button:hover {
  background: #67cefa;
  transform: translateY(-2px);
}

.best {
  margin-top: 25px;
  color: #7e8da3;
}

.best strong {
  color: #facc15;
}

/* ARENA */

.arena {
  position: relative;
  height: calc(100vh - 90px);
  overflow: hidden;
  cursor: crosshair;
}

.target {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      #ffffff 0%,
      #ffffff 12%,
      #ef4444 13%,
      #ef4444 43%,
      #991b1b 44%,
      #991b1b 100%
    );

  border: 3px solid white;

  box-shadow:
    0 0 0 2px #ef4444,
    0 0 30px rgba(239, 68, 68, 0.6);

  cursor: crosshair;

  animation: target-in 0.12s ease-out;
}

.target span {
  position: absolute;
  inset: 50%;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.hint {
  position: absolute;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 3px;
  pointer-events: none;
}

@keyframes target-in {
  from {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }

  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

/* RESULT */

.final-score {
  margin: 20px 0 35px;
  font-size: 80px;
  line-height: 1;
  font-weight: 900;
  color: #38bdf8;
}

.final-score span {
  color: #68758a;
  font-size: 14px;
  letter-spacing: 2px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 35px;
  margin-bottom: 35px;
}

.result-grid div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-grid strong {
  font-size: 20px;
}

.reset {
  margin-top: 15px;
  padding: 8px 15px;
  background: transparent;
  color: #64748b;
  font-size: 11px;
}

/* MOBILE */

@media (max-width: 700px) {
  .header {
    padding: 15px;
  }

  .stats {
    gap: 12px;
  }

  .stats div {
    min-width: auto;
  }

  .stats span {
    font-size: 8px;
  }

  .stats strong {
    font-size: 13px;
  }

  h1 {
    font-size: 17px;
  }

  .result-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
  }

  .final-score {
    font-size: 65px;
  }
}
</style>