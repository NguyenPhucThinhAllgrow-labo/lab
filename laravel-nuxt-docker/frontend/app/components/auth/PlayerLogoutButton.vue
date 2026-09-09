<script setup lang="ts">
import { LoaderCircle, LogOut } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'hacker'
}>(), {
  variant: 'default',
})

const loading = ref(false)
const { user, logout } = useAuth()

const displayName = computed(() => user.value?.name?.trim() || 'Người chơi')
const initial = computed(() => displayName.value.slice(0, 1).toLocaleUpperCase('vi'))

async function handleLogout() {
  loading.value = true

  try {
    await logout()
    await navigateTo('/login')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="player-session" :class="`player-session--${props.variant}`">
    <div class="player-session__user" :title="displayName">
      <span class="player-session__avatar">{{ initial }}</span>
      <span class="player-session__identity">
        <small>{{ props.variant === 'hacker' ? 'AUTHENTICATED' : 'Đang đăng nhập' }}</small>
        <strong>{{ displayName }}</strong>
      </span>
    </div>

    <span class="player-session__divider" aria-hidden="true"></span>

    <button
      type="button"
      class="player-session__logout"
      :disabled="loading"
      :title="loading ? 'Đang đăng xuất...' : 'Đăng xuất khỏi phiên người chơi'"
      @click="handleLogout"
    >
      <LoaderCircle v-if="loading" class="is-spinning" />
      <LogOut v-else />
      <span>{{ loading ? 'Đang thoát' : props.variant === 'hacker' ? 'EXIT' : 'Đăng xuất' }}</span>
    </button>
  </div>
</template>

<style scoped>
.player-session { display: flex; height: 48px; align-items: center; gap: 7px; padding: 5px 6px 5px 7px; border: 1px solid rgb(148 163 184 / 18%); border-radius: 15px; background: rgb(15 23 42 / 88%); color: #e2e8f0; box-shadow: 0 14px 36px rgb(2 6 23 / 32%), inset 0 1px rgb(255 255 255 / 6%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; backdrop-filter: blur(14px); }
.player-session__user { display: flex; min-width: 0; align-items: center; gap: 9px; }
.player-session__avatar { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border: 1px solid rgb(125 211 252 / 24%); border-radius: 10px; background: linear-gradient(135deg, #0284c7, #6366f1); color: white; font-size: 12px; font-weight: 800; box-shadow: 0 7px 17px rgb(14 165 233 / 18%); }
.player-session__identity { display: grid; min-width: 0; max-width: 145px; gap: 1px; }
.player-session__identity small { color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: .08em; }
.player-session__identity strong { overflow: hidden; color: #f8fafc; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.player-session__divider { width: 1px; height: 25px; background: rgb(148 163 184 / 15%); }
.player-session__logout { display: flex; height: 34px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #94a3b8; cursor: pointer; font: inherit; font-size: 10px; font-weight: 700; transition: border-color .18s ease, background .18s ease, color .18s ease; }
.player-session__logout:hover:not(:disabled) { border-color: rgb(251 113 133 / 23%); background: rgb(225 29 72 / 12%); color: #fda4af; }
.player-session__logout:disabled { cursor: wait; opacity: .6; }
.player-session__logout svg { width: 14px; height: 14px; flex: none; }.player-session__logout svg.is-spinning { animation: session-spin .8s linear infinite; }
.player-session--hacker { height: 46px; border-color: rgb(52 211 153 / 42%); border-radius: 2px; background: rgb(1 12 8 / 94%); box-shadow: 0 0 22px rgb(16 185 129 / 10%), inset 0 0 18px rgb(16 185 129 / 3%); font-family: "Lucida Console", Monaco, "Courier New", monospace; }
.player-session--hacker .player-session__avatar { width: 32px; height: 32px; border-color: rgb(52 211 153 / 48%); border-radius: 1px; background: rgb(6 78 59 / 62%); color: #6ee7b7; box-shadow: inset 0 0 10px rgb(52 211 153 / 9%); }
.player-session--hacker .player-session__identity small { color: #39745d; font-size: 7px; letter-spacing: .14em; }
.player-session--hacker .player-session__identity strong { color: #a7f3d0; font-size: 10px; font-weight: 500; }.player-session--hacker .player-session__identity strong::before { content: "user@"; color: #34d399; }
.player-session--hacker .player-session__divider { background: rgb(52 211 153 / 22%); }
.player-session--hacker .player-session__logout { border-radius: 1px; color: #6ee7b7; font-size: 9px; letter-spacing: .1em; }.player-session--hacker .player-session__logout:hover:not(:disabled) { border-color: rgb(52 211 153 / 42%); background: rgb(6 78 59 / 54%); color: #d1fae5; }
@keyframes session-spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) { .player-session { right: 12px !important; top: 12px !important; }.player-session__identity { max-width: 95px; }.player-session__logout span { display: none; }.player-session__logout { width: 34px; justify-content: center; padding: 0; } }
@media (prefers-reduced-motion: reduce) { .player-session__logout svg.is-spinning { animation: none; } }
</style>
