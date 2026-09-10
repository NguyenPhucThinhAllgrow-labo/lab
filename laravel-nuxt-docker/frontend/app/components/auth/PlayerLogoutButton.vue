<script setup lang="ts">
import { ChevronRight, ChevronUp, GripVertical, House, LoaderCircle, LogOut, PanelTopOpen } from 'lucide-vue-next'
import LogoutConfirmModal from '~/components/auth/LogoutConfirmModal.vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'hacker'
  showHome?: boolean
}>(), {
  variant: 'default',
  showHome: false,
})

const loading = ref(false)
const logoutConfirmOpen = ref(false)
const collapsed = ref(false)
const vertical = ref(false)
const { user, logout } = useAuth()
const sessionElement = ref<HTMLElement | null>(null)
const dragging = ref(false)
const positionReady = ref(false)
const position = reactive({ x: 0, y: 0 })

const POSITION_STORAGE_KEY = 'player-logout-position'
const COLLAPSED_STORAGE_KEY = 'player-logout-collapsed'
const ORIENTATION_STORAGE_KEY = 'player-logout-vertical'
const VIEWPORT_GAP = 8

let activePointerId: number | null = null
let pointerStartX = 0
let pointerStartY = 0
let positionStartX = 0
let positionStartY = 0
let sizeObserver: ResizeObserver | null = null

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
  if (loading.value || event.button !== 0 || activePointerId !== null) return
  // Keep native button clicks out of the draggable container's pointer capture.
  if (event.target instanceof Element && event.target.closest('button, a') && !event.target.closest('[data-drag-handle]')) return

  activePointerId = event.pointerId
  pointerStartX = event.clientX
  pointerStartY = event.clientY
  positionStartX = position.x
  positionStartY = position.y
  dragging.value = true
  sessionElement.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return

  const deltaX = event.clientX - pointerStartX
  const deltaY = event.clientY - pointerStartY

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

function handleDragKeydown(event: KeyboardEvent) {
  const directions: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  }
  const direction = directions[event.key]
  if (!direction) return
  event.preventDefault()
  const step = event.shiftKey ? 40 : 10
  setPosition(position.x + direction[0] * step, position.y + direction[1] * step)
  savePosition()
}

async function toggleCollapsed() {
  const right = position.x + (sessionElement.value?.offsetWidth ?? 0)
  collapsed.value = !collapsed.value
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed.value))
  } catch {
    // The toggle still works when storage is unavailable.
  }
  await nextTick()
  setPosition(right - (sessionElement.value?.offsetWidth ?? 0), position.y)
  savePosition()
}

async function toggleOrientation() {
  const right = position.x + (sessionElement.value?.offsetWidth ?? 0)
  vertical.value = !vertical.value
  try {
    localStorage.setItem(ORIENTATION_STORAGE_KEY, String(vertical.value))
  } catch {
    // The orientation toggle still works when storage is unavailable.
  }
  await nextTick()
  setPosition(right - (sessionElement.value?.offsetWidth ?? 0), position.y)
  savePosition()
}

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

onMounted(async () => {
  try {
    collapsed.value = localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
    vertical.value = localStorage.getItem(ORIENTATION_STORAGE_KEY) === 'true'
  } catch {
    // Default to the expanded controls.
  }
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
  sizeObserver = new ResizeObserver(handleResize)
  if (sessionElement.value) sizeObserver.observe(sessionElement.value)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  sizeObserver?.disconnect()
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="sessionElement"
      class="player-session"
      :class="[`player-session--${props.variant}`, { 'is-dragging': dragging, 'is-collapsed': collapsed, 'is-vertical': vertical }]"
      :style="positionStyle"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="finishDragging"
      @pointercancel="finishDragging"
      @lostpointercapture="finishDragging"
    >
      <button
        type="button"
        class="player-session__drag"
        data-drag-handle
        :disabled="loading"
        title="Kéo để di chuyển, hoặc dùng phím mũi tên"
        aria-label="Di chuyển menu người chơi bằng cách kéo hoặc dùng phím mũi tên"
        @keydown="handleDragKeydown"
      >
        <GripVertical aria-hidden="true" />
      </button>
      <div v-show="!collapsed" class="player-session__user" :title="`${displayName} — kéo để di chuyển`">
        <span class="player-session__avatar">{{ initial }}</span>
        <span class="player-session__identity">
          <small>{{ props.variant === 'hacker' ? 'AUTHENTICATED' : 'Đang đăng nhập' }}</small>
          <strong>{{ displayName }}</strong>
        </span>
      </div>

      <span v-show="!collapsed" class="player-session__divider" aria-hidden="true"></span>

      <NuxtLink
        v-if="props.showHome && !collapsed"
        to="/"
        class="player-session__logout player-session__home"
        title="Về trang chủ"
        aria-label="Về trang chủ"
      >
        <House aria-hidden="true" />
        <span>Trang chủ</span>
      </NuxtLink>

      <button
        v-show="!collapsed"
        type="button"
        class="player-session__logout player-session__exit"
        :disabled="loading"
        :title="loading ? 'Đang đăng xuất...' : 'Đăng xuất khỏi phiên người chơi'"
        @click="logoutConfirmOpen = true"
      >
        <LoaderCircle v-if="loading" class="is-spinning" />
        <LogOut v-else />
        <span>{{ loading ? 'Đang thoát' : props.variant === 'hacker' ? 'EXIT' : 'Đăng xuất' }}</span>
      </button>
      <div class="player-session__controls">
        <button
          type="button"
          class="player-session__logout player-session__orientation"
          :disabled="loading"
          :title="vertical ? 'Chuyển sang hàng ngang' : 'Chuyển sang hàng dọc'"
          :aria-label="vertical ? 'Chuyển menu sang hàng ngang' : 'Chuyển menu sang hàng dọc'"
          :aria-pressed="vertical"
          @click="toggleOrientation"
        >
          <span class="player-session__orientation-glyph" aria-hidden="true">{{ vertical ? '↔' : '↕' }}</span>
          <span class="player-session__control-label">{{ vertical ? 'Chuyển hàng ngang' : 'Chuyển hàng dọc' }}</span>
        </button>
        <button
          type="button"
          class="player-session__logout player-session__toggle"
          :disabled="loading"
          :title="collapsed ? 'Mở menu người chơi' : 'Thu gọn menu người chơi'"
          :aria-label="collapsed ? 'Mở menu người chơi' : 'Thu gọn menu người chơi'"
          :aria-expanded="!collapsed"
          @click="toggleCollapsed"
        >
          <PanelTopOpen v-if="collapsed" aria-hidden="true" />
          <ChevronUp v-else-if="vertical" aria-hidden="true" />
          <ChevronRight v-else aria-hidden="true" />
          <span class="player-session__control-label">{{ collapsed ? 'Mở rộng menu' : 'Thu gọn menu' }}</span>
        </button>
      </div>
    </div>

    <LogoutConfirmModal
      :open="logoutConfirmOpen"
      :loading="loading"
      :user-name="displayName"
      :variant="props.variant"
      @cancel="logoutConfirmOpen = false"
      @confirm="confirmLogout"
    />
  </Teleport>
</template>

<style scoped>
.player-session { width: max-content; max-width: calc(100vw - 16px); box-sizing: border-box; }
.player-session__logout, .player-session__divider { flex-shrink: 0; white-space: nowrap; }
.player-session__identity small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-session__drag { display: grid; width: 32px; height: 34px; flex: none; place-items: center; padding: 0; border: 0; border-radius: 7px; background: rgb(148 163 184 / 8%); color: #94a3b8; cursor: grab; touch-action: none; }
.player-session__drag svg { width: 18px; height: 18px; pointer-events: none; }
.player-session__drag:hover { background: rgb(148 163 184 / 18%); }
.player-session__drag:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.player-session.is-dragging .player-session__drag { cursor: grabbing; }
.player-session--hacker .player-session__drag { border-radius: 1px; color: #6ee7b7; }
.player-session { position: fixed; z-index: 1000; display: flex; height: 48px; align-items: center; gap: 7px; padding: 5px 6px 5px 7px; border: 1px solid rgb(214 224 211 / 16%); border-radius: 15px; background: rgb(24 27 25 / 96%); color: #e2e8f0; box-shadow: 0 14px 36px rgb(2 6 23 / 32%), inset 0 1px rgb(255 255 255 / 6%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; cursor: grab; touch-action: none; user-select: none; backdrop-filter: blur(14px); }
.player-session.is-dragging { cursor: grabbing; box-shadow: 0 18px 48px rgb(2 6 23 / 45%), 0 0 0 2px rgb(125 211 252 / 14%); }
.player-session__user { display: flex; min-width: 0; align-items: center; gap: 9px; }
.player-session__avatar { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border: 1px solid rgb(213 244 135 / 24%); border-radius: 10px; background: #303b2e; color: #d5f487; font-size: 12px; font-weight: 800; box-shadow: inset 0 1px rgb(255 255 255 / 6%); }
.player-session__identity { display: grid; min-width: 0; max-width: 145px; gap: 1px; }
.player-session__identity small { color: #c5cec7; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.player-session__identity strong { overflow: hidden; color: #ffffff; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.player-session__divider { width: 1px; height: 25px; background: rgb(148 163 184 / 15%); }
.player-session__logout { display: flex; height: 34px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #94a3b8; cursor: pointer; touch-action: none; font: inherit; font-size: 12px; font-weight: 700; transition: border-color .18s ease, background .18s ease, color .18s ease; }
.player-session__logout:hover:not(:disabled) { border-color: rgb(251 113 133 / 23%); background: rgb(225 29 72 / 12%); color: #fda4af; }
.player-session__logout:disabled { cursor: wait; opacity: .6; }
.player-session__home { text-decoration: none; }
.player-session__home:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.player-session__controls { display: flex; flex: none; align-items: center; gap: 4px; }
.player-session__toggle, .player-session__orientation { width: 34px; justify-content: center; padding: 0; }
.player-session__orientation-glyph { font-size: 17px; font-weight: 500; line-height: 1; }
.player-session__control-label { display: none; }
.player-session__toggle:focus-visible, .player-session__orientation:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.player-session__logout svg { width: 14px; height: 14px; flex: none; }.player-session__logout svg.is-spinning { animation: session-spin .8s linear infinite; }
.player-session--hacker { height: 46px; border-color: rgb(110 231 183 / 24%); border-radius: 2px; background: rgb(15 26 21 / 97%); box-shadow: 0 0 22px rgb(16 185 129 / 10%), inset 0 0 18px rgb(16 185 129 / 3%); font-family: "Lucida Console", Monaco, "Courier New", monospace; }
.player-session--hacker .player-session__avatar { width: 32px; height: 32px; border-color: rgb(52 211 153 / 48%); border-radius: 1px; background: rgb(6 78 59 / 62%); color: #6ee7b7; box-shadow: inset 0 0 10px rgb(52 211 153 / 9%); }
.player-session--hacker .player-session__identity small { color: #b6d8c3; font-size: 9px; letter-spacing: .08em; }
.player-session--hacker .player-session__identity strong { color: #ecfdf5; font-size: 12px; font-weight: 700; }.player-session--hacker .player-session__identity strong::before { content: "user@"; color: #34d399; }
.player-session--hacker .player-session__divider { background: rgb(52 211 153 / 22%); }
.player-session--hacker .player-session__logout { border-radius: 1px; color: #a7f3d0; font-size: 11px; letter-spacing: .04em; }.player-session--hacker .player-session__logout:hover:not(:disabled) { border-color: rgb(52 211 153 / 42%); background: rgb(6 78 59 / 54%); color: #d1fae5; }
.player-session .player-session__home { border-color: rgb(213 244 135 / 12%); background: rgb(213 244 135 / 6%); color: #e5fac1; }
.player-session .player-session__home:hover { border-color: rgb(213 244 135 / 30%); background: rgb(213 244 135 / 13%); color: #e5fac1; }
.player-session .player-session__exit { border-color: rgb(252 165 165 / 14%); background: rgb(248 113 113 / 6%); color: #ffd0ca; }
.player-session .player-session__exit:hover:not(:disabled) { border-color: rgb(252 165 165 / 32%); background: rgb(248 113 113 / 14%); color: #fecaca; }
.player-session .player-session__toggle, .player-session .player-session__orientation, .player-session .player-session__drag { background: rgb(255 255 255 / 4%); color: #dce5de; }
.player-session .player-session__toggle:hover:not(:disabled), .player-session .player-session__orientation:hover:not(:disabled), .player-session .player-session__drag:hover { border-color: rgb(255 255 255 / 16%); background: rgb(255 255 255 / 9%); color: #f0f4ef; }
.player-session .player-session__exit:focus-visible { outline: 2px solid #efb4ae; outline-offset: 2px; }
.player-session.is-vertical:not(.is-collapsed) { width: 210px; height: auto; flex-direction: column; align-items: stretch; gap: 6px; padding: 8px; }
.player-session.is-vertical:not(.is-collapsed) .player-session__drag { width: 100%; height: 25px; border-radius: 8px; background: transparent; opacity: .65; }
.player-session.is-vertical:not(.is-collapsed) .player-session__drag:hover { background: rgb(255 255 255 / 5%); opacity: 1; }
.player-session.is-vertical:not(.is-collapsed) .player-session__user { width: 100%; padding: 4px 7px 7px; }
.player-session.is-vertical:not(.is-collapsed) .player-session__identity { max-width: 125px; }
.player-session.is-vertical:not(.is-collapsed) .player-session__divider { width: 100%; height: 1px; }
.player-session.is-vertical:not(.is-collapsed) .player-session__logout:not(.player-session__toggle, .player-session__orientation) { width: 100%; justify-content: flex-start; }
.player-session.is-vertical:not(.is-collapsed) .player-session__controls { flex-direction: column; align-items: stretch; padding-top: 3px; border-top: 1px solid rgb(148 163 184 / 10%); }
.player-session.is-vertical:not(.is-collapsed) .player-session__toggle, .player-session.is-vertical:not(.is-collapsed) .player-session__orientation { width: 100%; justify-content: flex-start; padding: 0 10px; }
.player-session.is-vertical:not(.is-collapsed) .player-session__control-label { display: inline; font-size: 10px; font-weight: 650; }
.player-session--hacker.is-vertical:not(.is-collapsed) .player-session__drag { border-radius: 1px; }
.player-session.is-vertical.is-collapsed { width: 48px; height: auto; flex-direction: column; padding: 6px; }
.player-session.is-vertical.is-collapsed .player-session__controls { flex-direction: column; }
@keyframes session-spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) { .player-session__identity { max-width: 95px; }.player-session:not(.is-vertical) .player-session__home > span, .player-session:not(.is-vertical) .player-session__exit > span { display: none; }.player-session:not(.is-vertical) .player-session__home, .player-session:not(.is-vertical) .player-session__exit { width: 34px; justify-content: center; padding: 0; } }
@media (prefers-reduced-motion: reduce) { .player-session__logout svg.is-spinning { animation: none; } }
</style>
