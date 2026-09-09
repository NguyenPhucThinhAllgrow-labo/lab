<script setup lang="ts">
import { LoaderCircle, LogOut } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'hacker'
}>(), {
  variant: 'default',
})

const loading = ref(false)
const { user, logout } = useAuth()
const sessionElement = ref<HTMLElement | null>(null)
const dragging = ref(false)
const positionReady = ref(false)
const position = reactive({ x: 0, y: 0 })

const POSITION_STORAGE_KEY = 'player-logout-position'
const VIEWPORT_GAP = 8

let activePointerId: number | null = null
let pointerStartX = 0
let pointerStartY = 0
let positionStartX = 0
let positionStartY = 0
let movedDuringDrag = false

const displayName = computed(() => user.value?.name?.trim() || 'Người chơi')
const initial = computed(() => displayName.value.slice(0, 1).toLocaleUpperCase('vi'))

const positionStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`,
  right: 'auto',
  bottom: 'auto',
  visibility: positionReady.value ? 'visible' : 'hidden',
}))

function clampPosition(x: number, y: number) {
  const element = sessionElement.value
  const width = element?.offsetWidth ?? 0
  const height = element?.offsetHeight ?? 0

  return {
    x: Math.min(Math.max(VIEWPORT_GAP, x), Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP)),
    y: Math.min(Math.max(VIEWPORT_GAP, y), Math.max(VIEWPORT_GAP, window.innerHeight - height - VIEWPORT_GAP)),
  }
}

function setPosition(x: number, y: number) {
  const next = clampPosition(x, y)
  position.x = next.x
  position.y = next.y
}

function savePosition() {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position))
  } catch {
    // Dragging still works when browser storage is unavailable.
  }
}

function handlePointerDown(event: PointerEvent) {
  if (loading.value || event.button !== 0) return

  activePointerId = event.pointerId
  pointerStartX = event.clientX
  pointerStartY = event.clientY
  positionStartX = position.x
  positionStartY = position.y
  movedDuringDrag = false
  dragging.value = true
  sessionElement.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return

  const deltaX = event.clientX - pointerStartX
  const deltaY = event.clientY - pointerStartY

  if (Math.hypot(deltaX, deltaY) > 4) movedDuringDrag = true

  setPosition(positionStartX + deltaX, positionStartY + deltaY)
  event.preventDefault()
}

function finishDragging(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return

  if (sessionElement.value?.hasPointerCapture(event.pointerId)) {
    sessionElement.value.releasePointerCapture(event.pointerId)
  }
  activePointerId = null
  dragging.value = false
  savePosition()
}

function handleResize() {
  setPosition(position.x, position.y)
  savePosition()
}

async function handleLogout(event: MouseEvent) {
  if (movedDuringDrag) {
    event.preventDefault()
    event.stopPropagation()
    movedDuringDrag = false
    return
  }

  loading.value = true

  try {
    await logout()
    await navigateTo('/login')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await nextTick()

  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) ?? 'null')

    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      setPosition(saved.x, saved.y)
    } else {
      const width = sessionElement.value?.offsetWidth ?? 0
      setPosition(window.innerWidth - width - 20, 20)
    }
  } catch {
    const width = sessionElement.value?.offsetWidth ?? 0
    setPosition(window.innerWidth - width - 20, 20)
  }

  positionReady.value = true
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="sessionElement"
      class="player-session"
      :class="[`player-session--${props.variant}`, { 'is-dragging': dragging }]"
      :style="positionStyle"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="finishDragging"
      @pointercancel="finishDragging"
    >
      <div class="player-session__user" :title="`${displayName} — kéo để di chuyển`">
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
  </Teleport>
</template>

<style scoped>
.player-session { position: fixed; z-index: 1000; display: flex; height: 48px; align-items: center; gap: 7px; padding: 5px 6px 5px 7px; border: 1px solid rgb(148 163 184 / 18%); border-radius: 15px; background: rgb(15 23 42 / 88%); color: #e2e8f0; box-shadow: 0 14px 36px rgb(2 6 23 / 32%), inset 0 1px rgb(255 255 255 / 6%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; cursor: grab; touch-action: none; user-select: none; backdrop-filter: blur(14px); }
.player-session.is-dragging { cursor: grabbing; box-shadow: 0 18px 48px rgb(2 6 23 / 45%), 0 0 0 2px rgb(125 211 252 / 14%); }
.player-session__user { display: flex; min-width: 0; align-items: center; gap: 9px; }
.player-session__avatar { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border: 1px solid rgb(125 211 252 / 24%); border-radius: 10px; background: linear-gradient(135deg, #0284c7, #6366f1); color: white; font-size: 12px; font-weight: 800; box-shadow: 0 7px 17px rgb(14 165 233 / 18%); }
.player-session__identity { display: grid; min-width: 0; max-width: 145px; gap: 1px; }
.player-session__identity small { color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: .08em; }
.player-session__identity strong { overflow: hidden; color: #f8fafc; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.player-session__divider { width: 1px; height: 25px; background: rgb(148 163 184 / 15%); }
.player-session__logout { display: flex; height: 34px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #94a3b8; cursor: pointer; touch-action: none; font: inherit; font-size: 10px; font-weight: 700; transition: border-color .18s ease, background .18s ease, color .18s ease; }
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
@media (max-width: 600px) { .player-session__identity { max-width: 95px; }.player-session__logout span { display: none; }.player-session__logout { width: 34px; justify-content: center; padding: 0; } }
@media (prefers-reduced-motion: reduce) { .player-session__logout svg.is-spinning { animation: none; } }
</style>
