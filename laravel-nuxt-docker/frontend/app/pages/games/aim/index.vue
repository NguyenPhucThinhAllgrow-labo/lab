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

<style scoped src="~/assets/css/pages/games/aim/index.css"></style>
