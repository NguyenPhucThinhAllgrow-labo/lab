<script setup lang="ts">
import {
  ArrowRight,
  Blocks,
  BrainCircuit,
  Braces,
  ChevronRight,
  Crosshair,
  Gamepad2,
  Radar,
  ShieldCheck,
  Sparkles,
  Swords,
  TerminalSquare,
  Zap,
} from 'lucide-vue-next'

useHead({
  title: 'Game Lab — Play, Think, Improve',
  meta: [{ name: 'description', content: 'Khám phá các game thử thách phản xạ, chiến thuật và tư duy trong Game Lab.' }],
})

const { user, initialized, fetchUser } = useAuth()

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
        <div><strong>GAME LAB</strong><small>PLAYGROUND / 2026</small></div>
      </NuxtLink>

      <nav class="home-nav" aria-label="Điều hướng chính">
        <a href="#games">Games</a>
        <a href="#algorithm-lab">Algorithm Lab</a>
        <NuxtLink to="/portfolio">Portfolio</NuxtLink>
      </nav>

      <div class="home-account">
        <PlayerLogoutButton v-if="user" />
        <template v-else-if="initialized">
          <NuxtLink class="home-account__login" to="/login">Đăng nhập</NuxtLink>
          <NuxtLink class="home-account__register" to="/register">Tạo tài khoản</NuxtLink>
        </template>
        <span v-else class="home-account__loading"></span>
      </div>
    </header>

    <section class="home-hero">
      <div class="home-hero__copy">
        <div class="home-hero__eyebrow"><Sparkles /> INTERACTIVE GAME EXPERIENCE</div>
        <h1>Chơi để thử thách.<br><span>Nghĩ để tiến xa.</span></h1>
        <p>Một không gian tập hợp game phản xạ, chiến thuật và giải đố — được xây dựng để mỗi lượt chơi đều mang lại một trải nghiệm mới.</p>
        <div class="home-hero__actions">
          <a href="#games" class="home-button home-button--primary">Khám phá game <ArrowRight /></a>
          <NuxtLink to="/games/pandora/detective" class="home-button home-button--ghost"><ShieldCheck /> Chơi Pandora</NuxtLink>
        </div>
        <div class="home-hero__metrics">
          <span><strong>06</strong><small>Game modes</small></span>
          <i></i>
          <span><strong>04</strong><small>Algorithm labs</small></span>
          <i></i>
          <span><strong>∞</strong><small>Challenges</small></span>
        </div>
      </div>

      <div class="home-console" aria-hidden="true">
        <div class="home-console__top"><span></span><span></span><span></span><code>game_lab.session</code></div>
        <div class="home-console__body">
          <p><i>$</i> initialize player_session</p>
          <p><i>›</i> Loading challenges...</p>
          <p><i>›</i> Reflex module <b>[READY]</b></p>
          <p><i>›</i> Strategy module <b>[READY]</b></p>
          <p><i>›</i> Pandora network <b>[ONLINE]</b></p>
          <p class="is-active"><i>$</i> select_your_game<span>_</span></p>
        </div>
        <div class="home-console__radar"><Radar /></div>
      </div>
    </section>

    <section id="games" class="home-section">
      <header class="home-section__header">
        <div><small>CHOOSE YOUR CHALLENGE</small><h2>Game collection</h2></div>
        <p>Chọn thử thách phù hợp với kỹ năng bạn muốn chinh phục.</p>
      </header>

      <div class="home-games">
        <NuxtLink v-for="(game, index) in games" :key="game.path" :to="game.path" class="home-game-card" :class="`home-game-card--${game.tone}`">
          <div class="home-game-card__top"><span class="home-game-card__icon"><component :is="game.icon" /></span><code>{{ game.code }}</code></div>
          <small>{{ game.category }}</small>
          <h3>{{ game.name }}</h3>
          <p>{{ game.description }}</p>
          <footer><span>PLAY NOW</span><ArrowRight /></footer>
          <b aria-hidden="true">0{{ index + 1 }}</b>
        </NuxtLink>
      </div>
    </section>

    <section id="algorithm-lab" class="home-lab">
      <div class="home-lab__icon"><BrainCircuit /></div>
      <div class="home-lab__copy"><small>VISUAL LEARNING</small><h2>Algorithm Lab</h2><p>Quan sát thuật toán vận hành từng bước qua các mô phỏng trực quan và tương tác.</p></div>
      <div class="home-lab__links">
        <NuxtLink v-for="lab in algorithmLabs" :key="lab.path" :to="lab.path"><Braces /><span>{{ lab.name }}</span><ChevronRight /></NuxtLink>
      </div>
    </section>

    <footer class="home-footer">
      <div class="home-brand"><span><Gamepad2 /></span><div><strong>GAME LAB</strong><small>PLAY. THINK. IMPROVE.</small></div></div>
      <p>Built for curious players.</p>
      <div><NuxtLink to="/portfolio">Portfolio</NuxtLink><NuxtLink to="/login">Player login</NuxtLink><NuxtLink to="/admin/login">Admin</NuxtLink></div>
    </footer>
  </main>
</template>

<style scoped src="~/assets/css/pages/home.css"></style>
