<script setup lang="ts">
import {
  ArrowRight,
  Blocks,
  BrainCircuit,
  Braces,
  ChevronRight,
  Crosshair,
  Gamepad2,
  KeyRound,
  LogOut,
  Mail,
  Radar,
  Swords,
  TerminalSquare,
  X,
  Zap,
} from 'lucide-vue-next'
import LogoutConfirmModal from '~/components/auth/LogoutConfirmModal.vue'

useHead({
  title: 'Game Lab — Play, Think, Improve',
  meta: [{ name: 'description', content: 'Khám phá các game thử thách phản xạ, chiến thuật và tư duy trong Game Lab.' }],
})

const { user, initialized, fetchUser, login, logout } = useAuth()
const loggingOut = ref(false)
const logoutError = ref('')
const logoutConfirmOpen = ref(false)
const loginModalOpen = ref(false)
const loginEmail = ref('')
const loginPassword = ref('')
const loginLoading = ref(false)
const loginError = ref('')
const loginEmailInput = ref<HTMLInputElement | null>(null)

function openLoginModal() {
  loginError.value = ''
  loginModalOpen.value = true
}

function closeLoginModal() {
  if (loginLoading.value) return
  loginModalOpen.value = false
  loginError.value = ''
}

async function handleLogin() {
  if (loginLoading.value) return

  loginError.value = ''
  if (!loginEmail.value || !loginPassword.value) {
    loginError.value = 'Vui lòng nhập email và mật khẩu.'
    return
  }

  loginLoading.value = true
  try {
    await login(loginEmail.value, loginPassword.value)
    loginModalOpen.value = false
    loginPassword.value = ''
  } catch (error: any) {
    if (error?.status === 422 || error?.status === 401) {
      loginError.value = error?.data?.errors?.email?.[0]
        || error?.data?.message
        || 'Email hoặc mật khẩu không chính xác.'
    } else if (error?.status === 419) {
      loginError.value = 'Phiên bảo mật đã hết hạn. Vui lòng thử lại.'
    } else {
      loginError.value = error?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
    }
  } finally {
    loginLoading.value = false
  }
}

watch(loginModalOpen, async (isOpen) => {
  if (!import.meta.client) return

  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    await nextTick()
    loginEmailInput.value?.focus()
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ''
  try {
    await logout()
  } catch {
    await fetchUser()
    logoutError.value = 'Không thể đăng xuất. Vui lòng thử lại.'
  } finally {
    loggingOut.value = false
    logoutConfirmOpen.value = false
  }
}

const games = [
  {
    name: 'Aim Training',
    code: 'AIM-01',
    category: 'Precision',
    description: 'Rèn tốc độ rê chuột, độ chính xác và khả năng khóa mục tiêu.',
    path: '/games/aim',
    icon: Crosshair,
    tone: 'cyan',
  },
  {
    name: 'Chinese Chess',
    code: 'XQ-02',
    category: 'Strategy',
    description: 'Điều binh khiển tướng trong bàn cờ chiến thuật cổ điển.',
    path: '/games/chinese-chess',
    icon: Swords,
    tone: 'amber',
  },
  {
    name: 'Reaction Test',
    code: 'RFX-03',
    category: 'Reflex',
    description: 'Đo phản xạ tức thời qua những tín hiệu xuất hiện bất ngờ.',
    path: '/games/reaction',
    icon: Zap,
    tone: 'rose',
  },
  {
    name: 'Tetris',
    code: 'TRS-04',
    category: 'Arcade',
    description: 'Xếp khối, phá hàng và duy trì nhịp chơi lâu nhất có thể.',
    path: '/games/tetris',
    icon: Blocks,
    tone: 'violet',
  },
  {
    name: 'Who Am I?',
    code: 'WHO-05',
    category: 'Terminal puzzle',
    description: 'Khám phá danh tính ẩn giấu qua một terminal đầy bí mật.',
    path: '/games/pandora/whoami',
    icon: TerminalSquare,
    tone: 'emerald',
  },
  {
    name: 'Pandora Detective',
    code: 'PDS-06',
    category: 'Investigation',
    description: 'Thu thập chứng cứ, kết nối manh mối và phá giải từng vụ án.',
    path: '/games/pandora/detective',
    icon: Radar,
    tone: 'indigo',
  },
]

const algorithmLabs = [
  { name: 'Bubble Sort', path: '/algorithm/sorting/bubble-sort' },
  { name: 'Selection Sort', path: '/algorithm/sorting/selection-sort' },
  { name: 'Insertion Sort', path: '/algorithm/sorting/insertion-sort' },
  { name: 'Greedy', path: '/algorithm/greedy' },
]

onMounted(async () => {
  if (!initialized.value) await fetchUser()
})
</script>

<template>
  <main class="home-page">
    <div class="home-page__grid" aria-hidden="true"></div>
    <div class="home-page__orb home-page__orb--one" aria-hidden="true"></div>
    <div class="home-page__orb home-page__orb--two" aria-hidden="true"></div>

    <header class="home-header">
      <NuxtLink to="/" class="home-brand">
        <span><Gamepad2 /></span>
        <div><strong>GAME LAB</strong><small>CHƠI · KHÁM PHÁ · TIẾN BỘ</small></div>
      </NuxtLink>

      <nav class="home-nav" aria-label="Điều hướng chính">
        <a href="#games">Trò chơi</a>
        <a href="#algorithm-lab">Thuật toán</a>
        <NuxtLink to="/portfolio">Portfolio</NuxtLink>
      </nav>

      <div class="home-account">
        <template v-if="user">
          <div class="home-account__user">
            <span class="home-account__avatar" aria-hidden="true">{{ user.name.trim().slice(0, 1).toLocaleUpperCase('vi') }}</span>
            <div class="home-account__identity">
              <strong :title="user.name">{{ user.name }}</strong>
              <small :title="user.email">{{ user.email }}</small>
            </div>
          </div>
          <button
            type="button"
            class="home-account__logout"
            :disabled="loggingOut"
            :aria-label="loggingOut ? 'Đang đăng xuất' : 'Đăng xuất'"
            title="Đăng xuất"
            @click="logoutConfirmOpen = true"
          >
            <LogOut aria-hidden="true" />
            <span>{{ loggingOut ? 'Đang thoát...' : 'Đăng xuất' }}</span>
          </button>
        </template>
        <template v-else-if="initialized">
          <button type="button" class="home-account__login" @click="openLoginModal">Đăng nhập</button>
          <NuxtLink class="home-account__register" to="/register">Tạo tài khoản</NuxtLink>
        </template>
        <span v-else class="home-account__loading"></span>
        <p v-if="logoutError" class="home-account__error" role="alert">{{ logoutError }}</p>
      </div>
    </header>

    <section class="home-hero">
      <div class="home-hero__copy">
        <div class="home-hero__eyebrow"><span></span> KHÔNG GIAN CHO TRÍ TÒ MÒ</div>
        <h1>Một chút thử thách.<br><span>Mỗi ngày tiến xa.</span></h1>
        <p>Luyện phản xạ, thử tài chiến thuật hoặc bước vào một vụ án bí ẩn. Chọn thử thách của bạn và bắt đầu khám phá.</p>
        <div class="home-hero__actions">
          <a href="#games" class="home-button home-button--primary">Khám phá game <ArrowRight /></a>
          <a href="#algorithm-lab" class="home-button home-button--ghost">Khám phá thuật toán <ChevronRight /></a>
        </div>
        <div class="home-hero__metrics">
          <span><strong>06</strong><small>Trò chơi</small></span>
          <i></i>
          <span><strong>04</strong><small>Mô phỏng thuật toán</small></span>
          <i></i>
          <span><strong>01</strong><small>Không gian khám phá</small></span>
        </div>
      </div>

      <NuxtLink to="/games/pandora/detective" class="home-feature">
        <div class="home-feature__top"><span>THỬ THÁCH NỔI BẬT</span><span>01 / 06</span></div>
        <div class="home-feature__art" aria-hidden="true">
          <div class="home-feature__orbit home-feature__orbit--outer"></div>
          <div class="home-feature__orbit home-feature__orbit--inner"></div>
          <Radar />
          <span class="home-feature__evidence home-feature__evidence--one">01 — MANH MỐI</span>
          <span class="home-feature__evidence home-feature__evidence--two">02 — KẾT NỐI</span>
        </div>
        <div class="home-feature__copy">
          <small>QUAN SÁT. SUY LUẬN. PHÁ ÁN.</small>
          <h2>Pandora Detective</h2>
          <p>Mỗi manh mối là một phần của sự thật. Bạn có thể kết nối chúng?</p>
          <span class="home-feature__cta">Bắt đầu điều tra <ArrowRight /></span>
        </div>
      </NuxtLink>
    </section>

    <section id="games" class="home-section">
      <header class="home-section__header">
        <div><small>TÌM THỬ THÁCH CỦA BẠN</small><h2>Hôm nay bạn muốn chơi gì?</h2></div>
        <p>Chọn thử thách phù hợp với kỹ năng bạn muốn chinh phục.</p>
      </header>

      <div class="home-games">
        <NuxtLink v-for="(game, index) in games" :key="game.path" :to="game.path" class="home-game-card" :class="`home-game-card--${game.tone}`">
          <div class="home-game-card__top"><span class="home-game-card__icon"><component :is="game.icon" /></span><code>{{ game.code }}</code></div>
          <small>{{ game.category }}</small>
          <h3>{{ game.name }}</h3>
          <p>{{ game.description }}</p>
          <footer><span>Khám phá trò chơi</span><ArrowRight /></footer>
          <b aria-hidden="true">0{{ index + 1 }}</b>
        </NuxtLink>
      </div>
    </section>

    <section id="algorithm-lab" class="home-lab">
      <div class="home-lab__icon"><BrainCircuit /></div>
      <div class="home-lab__copy"><small>HỌC QUA TRẢI NGHIỆM</small><h2>Algorithm Lab</h2><p>Quan sát thuật toán vận hành từng bước qua các mô phỏng trực quan và tương tác.</p></div>
      <div class="home-lab__links">
        <NuxtLink v-for="lab in algorithmLabs" :key="lab.path" :to="lab.path"><Braces /><span>{{ lab.name }}</span><ChevronRight /></NuxtLink>
      </div>
    </section>

    <footer class="home-footer">
      <div class="home-brand"><span><Gamepad2 /></span><div><strong>GAME LAB</strong><small>PLAY. THINK. IMPROVE.</small></div></div>
      <p>Dành cho những người luôn tò mò.</p>
      <div><NuxtLink to="/portfolio">Portfolio</NuxtLink><button v-if="!user" type="button" @click="openLoginModal">Đăng nhập</button><NuxtLink to="/admin/login">Admin</NuxtLink></div>
    </footer>

    <Transition name="home-modal">
      <div v-if="loginModalOpen" class="home-login-modal" role="presentation" @click.self="closeLoginModal">
        <section
          class="home-login-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-login-title"
          @keydown.esc="closeLoginModal"
        >
          <button type="button" class="home-login-dialog__close" aria-label="Đóng cửa sổ đăng nhập" :disabled="loginLoading" @click="closeLoginModal">
            <X aria-hidden="true" />
          </button>

          <aside class="home-login-dialog__intro">
            <span class="home-login-dialog__badge"><Gamepad2 aria-hidden="true" /></span>
            <div>
              <small>GAME LAB MEMBER</small>
              <h2>Chào mừng<br>trở lại.</h2>
              <p>Một tài khoản, toàn bộ trò chơi và hành trình tiến bộ của bạn.</p>
            </div>
            <div class="home-login-dialog__status"><i></i> Hệ thống sẵn sàng</div>
          </aside>

          <div class="home-login-dialog__form">
            <header>
              <small>PLAYER ACCESS</small>
              <h3 id="home-login-title">Đăng nhập tài khoản</h3>
              <p>Tiếp tục khám phá không gian Game Lab.</p>
            </header>

            <form novalidate @submit.prevent="handleLogin">
              <label class="home-login-field" for="home-login-email">
                <span>Email</span>
                <div><Mail aria-hidden="true" /><input id="home-login-email" ref="loginEmailInput" v-model="loginEmail" type="email" autocomplete="email" placeholder="player@example.com" :disabled="loginLoading"></div>
              </label>

              <label class="home-login-field" for="home-login-password">
                <span>Mật khẩu</span>
                <div><KeyRound aria-hidden="true" /><input id="home-login-password" v-model="loginPassword" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" :disabled="loginLoading"></div>
              </label>

              <p v-if="loginError" class="home-login-dialog__error" role="alert">{{ loginError }}</p>

              <button class="home-login-dialog__submit" type="submit" :disabled="loginLoading">
                <span>{{ loginLoading ? 'Đang xác thực...' : 'Đăng nhập' }}</span>
                <ArrowRight aria-hidden="true" />
              </button>
            </form>

            <p class="home-login-dialog__register">Chưa có tài khoản? <NuxtLink to="/register" @click="closeLoginModal">Tạo tài khoản</NuxtLink></p>
          </div>
        </section>
      </div>
    </Transition>

    <LogoutConfirmModal
      :open="logoutConfirmOpen"
      :loading="loggingOut"
      :user-name="user?.name"
      @cancel="logoutConfirmOpen = false"
      @confirm="handleLogout"
    />
  </main>
</template>

<style scoped src="~/assets/css/pages/home.css"></style>
