<script setup lang="ts">
type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'too-early'

const gameState = ref<GameState>('idle')
const reactionTime = ref<number | null>(null)
const bestTime = ref<number | null>(null)

let startTime = 0
let timeoutId: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  const saved = localStorage.getItem('reaction-best')

  if (saved) {
    bestTime.value = Number(saved)
  }
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})

function startGame() {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  reactionTime.value = null
  gameState.value = 'waiting'

  // Random từ 1.5 đến 5 giây
  const delay = Math.floor(Math.random() * 3500) + 1500

  timeoutId = setTimeout(() => {
    gameState.value = 'ready'
    startTime = performance.now()
  }, delay)
}

function handleClick() {
  if (gameState.value === 'waiting') {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    gameState.value = 'too-early'
    return
  }

  if (gameState.value === 'ready') {
    const time = Math.round(performance.now() - startTime)

    reactionTime.value = time
    gameState.value = 'result'

    if (bestTime.value === null || time < bestTime.value) {
      bestTime.value = time
      localStorage.setItem('reaction-best', String(time))
    }
  }
}

function resetBest() {
  bestTime.value = null
  localStorage.removeItem('reaction-best')
}
</script>

<template>
  <main
    class="game"
    :class="{
      waiting: gameState === 'waiting',
      ready: gameState === 'ready',
      result: gameState === 'result',
      early: gameState === 'too-early'
    }"
    @click="handleClick"
  >
    <div class="content">
      <div class="logo">⚡</div>

      <h1>Reaction Test</h1>

      <p v-if="gameState === 'idle'" class="instruction">
        Kiểm tra tốc độ phản xạ của bạn
      </p>

      <p v-if="gameState === 'waiting'" class="instruction">
        Chờ màu xanh...
      </p>

      <p v-if="gameState === 'ready'" class="instruction big">
        CLICK NGAY!
      </p>

      <p v-if="gameState === 'result'" class="instruction">
        Phản xạ của bạn
      </p>

      <p v-if="gameState === 'too-early'" class="instruction">
        Bạn click quá sớm!
      </p>

      <div v-if="gameState === 'idle'" class="start-area">
        <button class="start-button" @click.stop="startGame">
          BẮT ĐẦU
        </button>
      </div>

      <div v-else-if="gameState === 'result'" class="result-area">
        <div class="score">
          {{ reactionTime }}
          <span>ms</span>
        </div>

        <div class="comparison">
          <div>
            <span>Kỷ lục</span>
            <strong>
              {{ bestTime ? `${bestTime} ms` : '--' }}
            </strong>
          </div>

          <div>
            <span>Đánh giá</span>
            <strong>
              {{
                reactionTime !== null && reactionTime < 200
                  ? '🔥 Siêu nhanh!'
                  : reactionTime !== null && reactionTime < 300
                    ? '⚡ Rất nhanh!'
                    : reactionTime !== null && reactionTime < 400
                      ? '👍 Tốt'
                      : '🐢 Cần luyện thêm'
              }}
            </strong>
          </div>
        </div>

        <button class="retry-button" @click.stop="startGame">
          CHƠI LẠI
        </button>
      </div>

      <div v-else-if="gameState === 'too-early'" class="result-area">
        <div class="error-icon">✕</div>

        <p class="error-text">
          Hãy đợi màu xanh rồi mới click!
        </p>

        <button class="retry-button" @click.stop="startGame">
          THỬ LẠI
        </button>
      </div>

      <div v-else class="waiting-area">
        <div class="target">
          <span v-if="gameState === 'waiting'">ĐỪNG CLICK</span>
          <span v-else>CLICK!</span>
        </div>
      </div>

      <div v-if="bestTime" class="best">
        🏆 Best: {{ bestTime }} ms
      </div>

      <button
        v-if="bestTime"
        class="reset"
        @click.stop="resetBest"
      >
        Xóa kỷ lục
      </button>
    </div>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/reaction/index.css"></style>
