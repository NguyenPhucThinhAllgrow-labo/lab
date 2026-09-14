<script setup lang="ts">
import { ChevronDown, ChevronUp, Gamepad2, LoaderCircle, LogOut } from 'lucide-vue-next'
import LogoutConfirmModal from '~/components/auth/LogoutConfirmModal.vue'
import ThemeToggle from '~/components/common/ThemeToggle.vue'

const { user, logout } = useAuth()
const route = useRoute()
const loading = ref(false)
const logoutConfirmOpen = ref(false)
const collapsed = ref(false)
const displayName = computed(() => user.value?.name?.trim() || 'Người chơi')
const initial = computed(() => displayName.value.slice(0, 1).toLocaleUpperCase('vi'))
const themeClass = computed(() => {
  if (route.path.startsWith('/games/pandora/')) return 'player-header--pandora'
  if (route.path.startsWith('/games/chinese-chess')) return 'player-header--chess'
  if (route.path.startsWith('/games/aim')) return 'player-header--aim'
  if (route.path.startsWith('/games/reaction')) return 'player-header--reaction'
  if (route.path.startsWith('/games/tetris')) return 'player-header--tetris'
  return 'player-header--default'
})

function toggleHeader() {
  collapsed.value = !collapsed.value
  try { localStorage.setItem('player-header-collapsed', String(collapsed.value)) } catch { /* Storage is optional. */ }
}

onMounted(() => {
  try { collapsed.value = localStorage.getItem('player-header-collapsed') === 'true' } catch { /* Use the expanded header by default. */ }
})

async function confirmLogout() {
  if (loading.value) return

  loading.value = true
  try {
    await logout()
    logoutConfirmOpen.value = false
    await navigateTo('/login')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="game-header-shell" :class="[themeClass, { 'is-collapsed': collapsed }]">
    <header class="home-header">
      <NuxtLink to="/" class="home-brand" aria-label="Game Lab — Trang chủ">
        <span><Gamepad2 aria-hidden="true" /></span>
        <div><strong>GAME LAB</strong><small>CHƠI · KHÁM PHÁ · TIẾN BỘ</small></div>
      </NuxtLink>

      <nav class="home-nav" aria-label="Điều hướng chính">
        <NuxtLink :to="{ path: '/', hash: '#games' }">Trò chơi</NuxtLink>
        <NuxtLink :to="{ path: '/', hash: '#algorithm-lab' }">Thuật toán</NuxtLink>
        <NuxtLink to="/portfolio">Portfolio</NuxtLink>
      </nav>

      <div class="home-account">
        <div class="home-account__user">
          <span class="home-account__avatar" aria-hidden="true">{{ initial }}</span>
          <div class="home-account__identity">
            <strong :title="displayName">{{ displayName }}</strong>
            <small :title="user?.email">{{ user?.email }}</small>
          </div>
        </div>

        <button
          type="button"
          class="home-account__logout"
          :disabled="loading"
          :title="loading ? 'Đang đăng xuất…' : 'Đăng xuất'"
          :aria-label="loading ? 'Đang đăng xuất' : 'Đăng xuất'"
          @click="logoutConfirmOpen = true"
        >
          <LoaderCircle v-if="loading" :size="16" class="player-header__spinner" aria-hidden="true" />
          <LogOut v-else aria-hidden="true" />
          <span>{{ loading ? 'Đang thoát…' : 'Đăng xuất' }}</span>
        </button>
      </div>

      <ThemeToggle class="home-theme-toggle" />

      <button
        type="button"
        class="home-header-toggle"
        :title="collapsed ? 'Hiện header' : 'Ẩn header'"
        :aria-label="collapsed ? 'Hiện header' : 'Ẩn header'"
        :aria-expanded="!collapsed"
        @click="toggleHeader"
      >
        <ChevronDown v-if="collapsed" :size="18" aria-hidden="true" />
        <ChevronUp v-else :size="18" aria-hidden="true" />
      </button>
    </header>
  </div>

  <LogoutConfirmModal
    :open="logoutConfirmOpen"
    :loading="loading"
    :user-name="displayName"
    @cancel="logoutConfirmOpen = false"
    @confirm="confirmLogout"
  />
</template>

<style scoped>
.game-header-shell { --home-border: #ffffff14; --home-muted: #aab5b0; --home-accent: #d5f487; --header-bg: #101715; --header-glow: #d5f48712; --header-avatar-bg: #d5f48710; position: relative; z-index: 900; background: var(--header-bg); color: #f0f3ed; font-family: Inter, ui-sans-serif, system-ui, sans-serif; box-shadow: 0 8px 30px var(--header-glow); transition: background-color .2s ease, color .2s ease; }
.player-header--pandora { --home-accent: #34d399; --home-muted: #78a995; --home-border: #34d39925; --header-bg: #020806; --header-glow: #10b9811a; --header-avatar-bg: #064e3b80; }
.player-header--chess { --home-accent: #e2a84b; --home-muted: #aaa398; --home-border: #f59e0b22; --header-bg: #0b0a09; --header-glow: #d9770618; --header-avatar-bg: #78350f52; }
.player-header--aim { --home-accent: #67e8f9; --home-muted: #9bb4c4; --home-border: #22d3ee22; --header-bg: #08121b; --header-glow: #06b6d41a; --header-avatar-bg: #164e6360; }
.player-header--reaction { --home-accent: #fb7185; --home-muted: #b8a3aa; --home-border: #fb718525; --header-bg: #160b10; --header-glow: #e11d4818; --header-avatar-bg: #88133752; }
.player-header--tetris { --home-accent: #c4b5fd; --home-muted: #aaa5bc; --home-border: #a78bfa25; --header-bg: #100d1b; --header-glow: #8b5cf61a; --header-avatar-bg: #4c1d9560; }
.game-header-shell *, .game-header-shell *::before, .game-header-shell *::after { box-sizing: border-box; }
.game-header-shell a { text-decoration: none; }
.game-header-shell a:focus-visible, .game-header-shell button:focus-visible { outline: 2px solid var(--home-accent); outline-offset: 5px; }
.home-header { position: relative; z-index: 10; display: grid; width: min(calc(100% - 80px), 1200px); min-height: 96px; grid-template-columns: auto minmax(0, 1fr) auto 40px 40px; grid-template-areas: "brand nav account theme toggle"; align-items: center; gap: 12px; margin-inline: auto; border-bottom: 1px solid var(--home-border); transition: min-height .2s ease; }
.home-brand { grid-area: brand; display: flex; flex: none; align-items: center; gap: 12px; color: #f0f3ed; }
.home-brand > span { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 12px; background: var(--home-accent); color: #182216; }
.home-brand svg { width: 23px; height: 23px; }
.home-brand > div { display: grid; gap: 5px; }
.home-brand strong { font-size: 17px; letter-spacing: .04em; }
.home-brand small { color: var(--home-muted); font-size: 8px; letter-spacing: .09em; }
.home-nav { grid-area: nav; display: flex; align-items: center; justify-content: center; gap: 20px; }
.home-nav a { padding-block: 10px; color: var(--home-muted); font-size: 13px; font-weight: 500; white-space: nowrap; }
.home-nav a:hover { color: var(--home-accent); }
.home-account { grid-area: account; position: relative; display: flex; min-width: 0; align-items: center; gap: 12px; }
.home-account__user { display: flex; min-width: 0; align-items: center; gap: 10px; }
.home-account__avatar { display: grid; width: 36px; height: 36px; flex: none; place-items: center; border: 1px solid color-mix(in srgb, var(--home-accent) 32%, transparent); border-radius: 50%; background: var(--header-avatar-bg); color: var(--home-accent); font-size: 13px; font-weight: 700; }
.home-account__identity { display: grid; min-width: 0; gap: 4px; }
.home-account__identity strong, .home-account__identity small { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-account__identity strong { font-size: 12px; font-weight: 600; }
.home-account__identity small { color: var(--home-muted); font-size: 10px; }
.home-account__logout { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--home-border); border-radius: 8px; background: #ffffff04; color: #eef2e8; font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.home-account__logout:hover:not(:disabled) { border-color: var(--home-accent); color: var(--home-accent); }
.home-account__logout:disabled { cursor: wait; opacity: .5; }
.home-account__logout svg { width: 16px; height: 16px; }
.home-theme-toggle { grid-area: theme; position: static; justify-self: end; margin: 0; }
.home-header-toggle { grid-area: toggle; display: inline-grid; width: 40px; height: 40px; place-items: center; padding: 0; border: 1px solid #9ca3af60; border-radius: 9px; background: transparent; color: inherit; cursor: pointer; }
.home-header-toggle:hover { border-color: var(--home-accent); background: color-mix(in srgb, var(--home-accent) 9%, transparent); color: var(--home-accent); }
.game-header-shell.is-collapsed { height: 0; background: transparent; box-shadow: none; }
.game-header-shell.is-collapsed .home-header { position: fixed; top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); width: 44px; min-height: 44px; grid-template-columns: 40px; grid-template-areas: "toggle"; justify-content: center; padding: 2px; border: 1px solid var(--home-border); border-radius: 12px; background: var(--header-bg); box-shadow: 0 8px 24px var(--header-glow); }
.game-header-shell.is-collapsed :where(.home-brand, .home-nav, .home-account, .home-theme-toggle) { display: none; }
.game-header-shell.is-collapsed .home-header-toggle { border-color: transparent; }
.player-header__spinner { animation: player-header-spin .8s linear infinite; }
@keyframes player-header-spin { to { transform: rotate(1turn); } }
:global(html:not([data-site-theme="dark"])) .game-header-shell { --home-border: #00000018; --home-muted: #26302b; --header-bg: color-mix(in srgb, var(--home-accent) 8%, white); --header-glow: #24351c0b; --header-avatar-bg: color-mix(in srgb, var(--home-accent) 18%, white); background: var(--header-bg); color: #000; }
:global(html:not([data-site-theme="dark"])) .home-header { background: #fff; border-color: #c9d3c3; box-shadow: 0 6px 24px #24351c08; }
:global(html:not([data-site-theme="dark"])) .game-header-shell :where(a, button, span, small, strong, div) { color: #000; }
:global(html:not([data-site-theme="dark"])) .home-brand > span { background: color-mix(in srgb, var(--home-accent) 62%, white); }
:global(html:not([data-site-theme="dark"])) .home-account__avatar { border-color: color-mix(in srgb, var(--home-accent) 48%, #9ca3af); background: var(--header-avatar-bg); }
@media (max-width: 1100px) {
  .home-header { grid-template-columns: minmax(0, 1fr) auto 40px 40px; grid-template-areas: "brand account theme toggle" "nav nav nav nav"; gap: 14px 12px; }
  .home-nav { justify-content: flex-start; gap: 24px; padding-top: 12px; border-top: 1px solid var(--home-border); }
}
@media (max-width: 600px) {
  .home-header { width: min(calc(100% - 28px), 1200px); grid-template-columns: minmax(0, 1fr) 40px 40px; grid-template-areas: "brand theme toggle" "nav nav nav" "account account account"; gap: 12px; padding-block: 12px; }
  .game-header-shell.is-collapsed .home-header { width: 44px; min-height: 44px; grid-template-columns: 40px; grid-template-areas: "toggle"; padding: 2px; }
  .home-nav { justify-content: space-between; gap: 10px; }
  .home-account { width: 100%; justify-content: flex-end; padding-top: 12px; border-top: 1px solid var(--home-border); }
  .home-account__user { min-width: 0; margin-right: auto; }
  .home-account__logout span { display: none; }
  .home-account__logout { width: 40px; padding-inline: 0; }
}
@media (prefers-reduced-motion: reduce) { .player-header__spinner { animation: none; } }
</style>
