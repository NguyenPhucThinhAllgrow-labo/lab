<script setup lang="ts">
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const route = useRoute()
const hackerBitSeed = ref(1)

let hackerBitTimer: ReturnType<typeof setInterval> | null = null

const games = [
  { name: 'Aim Training', path: '/games/aim', code: 'AIM-01', description: 'Precision challenge' },
  { name: 'Chess Arena', path: '/games/chess', code: 'CHS-02', description: 'Strategic board' },
  { name: 'Reaction Test', path: '/games/reaction', code: 'RFX-03', description: 'Speed challenge' },
  { name: 'Tetris', path: '/games/tetris', code: 'TRS-04', description: 'Block protocol' },
  { name: 'Pandora: Who Am I?', path: '/games/pandora/whoami', code: 'WHO-05', description: 'Identity puzzle' },
  { name: 'Pandora Detective', path: '/games/pandora/detective', code: 'PDS-06', description: 'Forensic investigation' },
]

function safeGamePath(value: unknown): string {
  if (
    typeof value === 'string' &&
    games.some(game => value.startsWith(game.path))
  ) {
    return value
  }

  return games[0].path
}

const selectedGamePath = ref(
  safeGamePath(route.query.redirect),
)

const selectedGame = computed(() =>
  games.find(game => selectedGamePath.value.startsWith(game.path)) ?? games[0],
)

const isPandoraSelected = computed(() =>
  selectedGame.value.path.startsWith('/games/pandora'),
)

const isTetrisSelected = computed(() =>
  selectedGame.value.path === '/games/tetris',
)

const loginBuildTransition = computed(() => {
  if (isPandoraSelected.value) return 'hacker-build'
  if (isTetrisSelected.value) return 'tetris-build'
  return 'login-direct'
})

const loginTheme = computed(() => {
  if (isPandoraSelected.value) {
    return {
      mark: 'P',
      brand: 'PANDORA NETWORK',
      eyebrow: 'SECURE GAME NETWORK',
      title: 'Kết nối Pandora và bắt đầu phiên chơi.',
      description: 'Phiên Pandora sẽ lưu tiến trình của bạn trên hệ thống bảo mật.',
      formStatus: 'SECURE TERMINAL',
    }
  }

  if (isTetrisSelected.value) {
    return {
      mark: 'T',
      brand: 'TETRIS ARCADE',
      eyebrow: 'LINE CLEAR PROTOCOL',
      title: 'Xếp khối, phá hàng và chinh phục điểm cao.',
      description: 'Đăng nhập để lưu điểm số và tiếp tục hành trình xếp khối của bạn.',
      formStatus: 'PLAYER ONE LOGIN',
    }
  }

  return {
    mark: 'G',
    brand: 'GAME PORTAL',
    eyebrow: 'PLAYER ACCESS',
    title: 'Chọn game và bắt đầu cuộc chơi.',
    description: 'Đăng nhập một lần để lưu tiến trình ở mọi game.',
    formStatus: 'PLAYER LOGIN',
  }
})

function hackerBit(column: number, bit: number) {
  let value = hackerBitSeed.value
    ^ Math.imul(column, 374761393)
    ^ Math.imul(bit, 668265263)

  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return (value ^ (value >>> 16)) & 1
}

function isHackerBitBright(column: number, bit: number) {
  const value = Math.imul(
    hackerBitSeed.value ^ Math.imul(column + 11, 2246822519) ^ Math.imul(bit + 7, 3266489917),
    1597334677,
  ) >>> 0

  return value % 17 === 0
}

function stopHackerBitUpdates() {
  if (!hackerBitTimer) return

  clearInterval(hackerBitTimer)
  hackerBitTimer = null
}

watch(isPandoraSelected, (isSelected) => {
  stopHackerBitUpdates()

  if (!import.meta.client || !isSelected) return

  hackerBitTimer = setInterval(() => {
    hackerBitSeed.value = (
      Math.imul(hackerBitSeed.value, 1664525) + 1013904223
    ) >>> 0
  }, 260)
}, { immediate: true })

onBeforeUnmount(stopHackerBitUpdates)

function selectGame(path: string) {
  selectedGamePath.value = path
  error.value = ''
}

const { login } = useAuth()

const handleLogin = async () => {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Vui lòng nhập email và mật khẩu'
    return
  }

  loading.value = true

  try {
    await login(
      email.value,
      password.value,
    )

    await navigateTo(selectedGamePath.value)
  } catch (err: any) {
    console.error('Login error:', err)

    if (err?.status === 422) {
      error.value =
        err?.data?.errors?.email?.[0] ||
        err?.data?.message ||
        'Email hoặc mật khẩu không chính xác.'

      return
    }

    if (err?.status === 419) {
      error.value =
        'Phiên bảo mật đã hết hạn. Vui lòng thử lại.'

      return
    }

    if (err?.status === 401) {
      error.value =
        'Email hoặc mật khẩu không chính xác.'

      return
    }

    error.value =
      err?.data?.message ||
      'Đăng nhập thất bại. Vui lòng thử lại.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main
    class="game-login"
    :class="{
      'game-login--pandora': isPandoraSelected,
      'game-login--tetris': isTetrisSelected,
    }"
  >
    <div class="game-login-grid" aria-hidden="true"></div>
    <div class="game-login-backdrop" aria-hidden="true">
      <div v-if="isPandoraSelected" class="game-login-hacker-decor">
        <span class="hacker-scanline"></span>
        <span class="hacker-corner hacker-corner--tl"></span>
        <span class="hacker-corner hacker-corner--tr"></span>
        <span class="hacker-corner hacker-corner--bl"></span>
        <span class="hacker-corner hacker-corner--br"></span>
        <code class="hacker-coordinate hacker-coordinate--top">NODE://PANDORA_GATE_01</code>
        <code class="hacker-coordinate hacker-coordinate--bottom">AES-256 // SESSION ISOLATED</code>
        <div class="hacker-bit-rain">
          <span
            v-for="column in 22"
            :key="column"
            :style="{
              left: `${((column - 1) / 21) * 100}%`,
              animationDelay: `-${(column * 1.37) % 9}s`,
              animationDuration: `${6 + ((column * 1.91) % 5)}s`,
            }"
          >
            <i
              v-for="bit in 18"
              :key="bit"
              :class="{ 'is-bright': isHackerBitBright(column, bit) }"
            >{{ hackerBit(column, bit) }}</i>
          </span>
        </div>
      </div>
      <div v-if="isTetrisSelected" class="game-login-tetrominoes">
        <i v-for="block in 12" :key="block"></i>
      </div>
    </div>

    <Transition :name="loginBuildTransition" mode="out-in" appear>
      <section :key="selectedGame.path" class="game-login-shell">
        <div v-if="isPandoraSelected" class="hacker-border-trace" aria-hidden="true">
          <i class="hacker-border-trace__top"></i>
          <i class="hacker-border-trace__right"></i>
          <i class="hacker-border-trace__bottom"></i>
          <i class="hacker-border-trace__left"></i>
        </div>

        <div v-if="isPandoraSelected" class="hacker-build-stream" aria-hidden="true">
          <span
            v-for="bit in 240"
            :key="bit"
            :style="{
              animationDelay: `${(bit * 37) % 420}ms`,
              animationDuration: `${280 + ((bit * 29) % 260)}ms`,
            }"
          >{{ ((bit * 7) % 11) > 5 ? '1' : '0' }}</span>
        </div>

        <div v-if="isTetrisSelected" class="tetris-build-blocks" aria-hidden="true">
          <i
            v-for="block in 14"
            :key="block"
            :class="`tetris-piece--${(block - 1) % 7}`"
            :style="{ animationDelay: `${(block * 41) % 260}ms` }"
          ><span v-for="cell in 4" :key="cell"></span></i>
        </div>

      <aside class="game-login-intro">
        <div class="game-login-brand">
          <span class="game-login-brand-mark">{{ loginTheme.mark }}</span>
          <span>{{ loginTheme.brand }}</span>
        </div>

        <div class="game-login-copy">
          <p>{{ loginTheme.eyebrow }}</p>
          <h1>{{ loginTheme.title }}</h1>
          <span>{{ loginTheme.description }}</span>
        </div>

        <nav class="game-login-list" aria-label="Game selection">
          <button
            v-for="game in games"
            :key="game.path"
            type="button"
            :class="{ active: selectedGame.path === game.path }"
            @click="selectGame(game.path)"
          >
            <span class="game-login-code">{{ game.code }}</span>
            <span class="game-login-game"><b>{{ game.name }}</b><small>{{ game.description }}</small></span>
            <span class="game-login-arrow">→</span>
          </button>
        </nav>
      </aside>

      <section class="game-login-form">
        <div class="game-login-form-status">
          <span>{{ loginTheme.formStatus }}</span>
          <i>● ONLINE</i>
        </div>

        <div class="game-login-selection">
          <span>SELECTED GAME</span>
          <strong>{{ selectedGame.name }}</strong>
        </div>

        <div v-if="isPandoraSelected" class="game-login-security" aria-label="Trạng thái hệ thống">
          <div class="game-login-security-head">
            <span>SYSTEM DIAGNOSTICS</span>
            <b>ACCESS READY</b>
          </div>
          <div class="game-login-security-log">
            <span><i></i> Gateway encrypted</span>
            <span><i></i> Evidence vault online</span>
            <span><i></i> Identity verification pending</span>
          </div>
          <div class="game-login-signal"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>

        <form novalidate @submit.prevent="handleLogin">
          <div class="game-login-field">
            <label for="email">EMAIL</label>
            <input id="email" v-model="email" type="email" placeholder="player@example.com" autocomplete="email" :disabled="loading" />
          </div>

          <div class="game-login-field">
            <label for="password">PASSWORD</label>
            <input id="password" v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" :disabled="loading" />
          </div>

          <p v-if="error" class="game-login-error" role="alert">{{ error }}</p>

          <button class="game-login-submit" type="submit" :disabled="loading">
            {{ loading ? 'ĐANG XÁC THỰC...' : `VÀO ${selectedGame.name.toUpperCase()}` }}
            <span>→</span>
          </button>
        </form>

        <p class="game-login-admin">Quản trị viên? <NuxtLink to="/admin/login">Đăng nhập admin →</NuxtLink></p>
      </section>
      </section>
    </Transition>
  </main>
</template>

<style scoped src="~/assets/css/pages/login/game-select.css"></style>
