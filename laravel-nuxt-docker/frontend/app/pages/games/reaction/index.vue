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

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  window.removeEventListener('keydown', handleKeydown)
})

function startGame() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }

  reactionTime.value = null
  gameState.value = 'waiting'

  // Random từ 1.5 đến 5 giây
  const delay = Math.floor(Math.random() * 3500) + 1500

  timeoutId = setTimeout(() => {
    gameState.value = 'ready'
    startTime = performance.now()
    timeoutId = null
  }, delay)
}

function handleClick() {
  if (gameState.value === 'waiting') {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
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

function handleKeydown(event: KeyboardEvent) {
  // Chỉ dùng phím Space
  if (event.code !== 'Space') return

  // Không tính khi giữ phím
  if (event.repeat) return

  // Không scroll trang khi nhấn Space
  event.preventDefault()

  if (gameState.value === 'idle') {
    startGame()
    return
  }

  if (gameState.value === 'result' || gameState.value === 'too-early') {
    startGame()
    return
  }

  handleClick()
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

      <!-- IDLE -->
      <p
        v-if="gameState === 'idle'"
        class="instruction"
      >
        Kiểm tra tốc độ phản xạ của bạn
      </p>

      <!-- WAITING -->
      <p
        v-if="gameState === 'waiting'"
        class="instruction"
      >
        Chờ màu xanh...
      </p>

      <!-- READY -->
      <p
        v-if="gameState === 'ready'"
        class="instruction big"
      >
        CLICK NGAY!
      </p>

      <!-- RESULT -->
      <p
        v-if="gameState === 'result'"
        class="instruction"
      >
        Phản xạ của bạn
      </p>

      <!-- TOO EARLY -->
      <p
        v-if="gameState === 'too-early'"
        class="instruction"
      >
        Bạn click quá sớm!
      </p>

      <!-- START -->
      <div
        v-if="gameState === 'idle'"
        class="start-area"
      >
        <button
          class="start-button"
          @click.stop="startGame"
        >
          BẮT ĐẦU
        </button>

        <p class="keyboard-hint">
          Hoặc nhấn <kbd>SPACE</kbd>
        </p>
      </div>

      <!-- RESULT -->
      <div
        v-else-if="gameState === 'result'"
        class="result-area"
      >
        <div class="score">
          {{ reactionTime }}
          <span>ms</span>
        </div>

        <div class="comparison">
          <div>
            <span>Kỷ lục</span>

            <strong>
              {{ bestTime !== null ? `${bestTime} ms` : '--' }}
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

        <button
          class="retry-button"
          @click.stop="startGame"
        >
          CHƠI LẠI
        </button>

        <p class="keyboard-hint">
          Hoặc nhấn <kbd>SPACE</kbd>
        </p>
      </div>

      <!-- TOO EARLY -->
      <div
        v-else-if="gameState === 'too-early'"
        class="result-area"
      >
        <div class="error-icon">✕</div>

        <p class="error-text">
          Hãy đợi màu xanh rồi mới click!
        </p>

        <button
          class="retry-button"
          @click.stop="startGame"
        >
          THỬ LẠI
        </button>

        <p class="keyboard-hint">
          Hoặc nhấn <kbd>SPACE</kbd>
        </p>
      </div>

      <!-- WAITING / READY -->
      <div
        v-else
        class="waiting-area"
      >
        <div class="target">
          <span v-if="gameState === 'waiting'">
            ĐỪNG CLICK
          </span>

          <span v-else>
            CLICK!
          </span>
        </div>

        <p class="keyboard-hint game-key">
          Nhấn <kbd>SPACE</kbd>
        </p>
      </div>

      <!-- BEST -->
      <div
        v-if="bestTime !== null"
        class="best"
      >
        🏆 Best: {{ bestTime }} ms
      </div>

      <!-- RESET -->
      <button
        v-if="bestTime !== null"
        class="reset"
        @click.stop="resetBest"
      >
        Xóa kỷ lục
      </button>
    </div>
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.game {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  color: white;

  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background: #171717;

  transition:
    background 0.15s ease,
    transform 0.1s ease;

  cursor: default;
  user-select: none;

  overflow: hidden;
}

.game.waiting {
  background: #e74c3c;
  cursor: pointer;
}

.game.ready {
  background: #2ecc71;
  cursor: pointer;
}

.game.result {
  background: #171717;
}

.game.early {
  background: #8e44ad;
}

.content {
  width: min(90%, 700px);
  text-align: center;
}

.logo {
  font-size: 52px;
  margin-bottom: 5px;
}

h1 {
  margin: 0;

  font-size: clamp(38px, 8vw, 70px);
  font-weight: 900;

  letter-spacing: -3px;
}

.instruction {
  margin: 15px 0 35px;

  color: #bdbdbd;

  font-size: 18px;
}

.waiting .instruction,
.ready .instruction {
  color: white;
  font-weight: 600;
}

.instruction.big {
  font-size: clamp(30px, 7vw, 60px);
  font-weight: 900;

  animation: pulse 0.5s infinite alternate;
}

.start-area {
  margin-top: 45px;
}

.start-button,
.retry-button {
  border: 0;
  border-radius: 14px;

  padding: 18px 45px;

  font-size: 18px;
  font-weight: 800;

  color: #171717;
  background: #fff;

  cursor: pointer;

  transition: all 0.2s ease;

  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.25);
}

.start-button:hover,
.retry-button:hover {
  transform: translateY(-3px);

  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.35);
}

.start-button:active,
.retry-button:active {
  transform: translateY(0);
}

.keyboard-hint {
  margin-top: 20px;

  color: rgba(255, 255, 255, 0.45);

  font-size: 14px;
}

kbd {
  display: inline-block;

  padding: 4px 9px;

  border-radius: 6px;

  color: #fff;
  background: rgba(255, 255, 255, 0.12);

  border: 1px solid rgba(255, 255, 255, 0.2);

  font-family: inherit;
  font-size: 12px;
  font-weight: 800;

  box-shadow:
    0 2px 0 rgba(255, 255, 255, 0.15);
}

.game-key {
  margin-top: 18px;
}

.target {
  margin: 40px auto 0;

  width: min(75vw, 400px);
  height: min(75vw, 400px);

  border: 4px solid rgba(255, 255, 255, 0.7);

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 25px;
  font-weight: 900;

  letter-spacing: 2px;
}

.waiting .target {
  animation: waitingPulse 1.2s infinite;
}

.ready .target {
  border-color: white;
  background: rgba(255, 255, 255, 0.1);
}

.result-area {
  margin-top: 20px;
}

.score {
  font-size: clamp(80px, 18vw, 150px);

  font-weight: 900;

  line-height: 1;

  letter-spacing: -7px;
}

.score span {
  font-size: 25px;

  letter-spacing: 0;

  color: #aaa;
}

.comparison {
  display: flex;

  justify-content: center;

  gap: 50px;

  margin: 35px 0;
}

.comparison div {
  display: flex;

  flex-direction: column;

  gap: 8px;
}

.comparison span {
  color: #888;

  font-size: 13px;

  text-transform: uppercase;
}

.comparison strong {
  font-size: 17px;
}

.error-icon {
  font-size: 100px;

  font-weight: 900;

  color: #f1c40f;
}

.error-text {
  color: #ddd;

  margin: 10px 0 35px;

  font-size: 18px;
}

.best {
  margin-top: 30px;

  color: #ffd700;

  font-weight: 700;
}

.reset {
  margin-top: 15px;

  background: transparent;

  color: #666;

  border: 0;

  cursor: pointer;

  text-decoration: underline;
}

.reset:hover {
  color: #aaa;
}

@keyframes pulse {
  from {
    transform: scale(1);
  }

  to {
    transform: scale(1.04);
  }
}

@keyframes waitingPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }

  50% {
    transform: scale(1.03);
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .comparison {
    gap: 25px;
  }

  .comparison strong {
    font-size: 15px;
  }

  .target {
    width: 65vw;
    height: 65vw;
  }
}
</style>
