<script setup lang="ts">
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, GripHorizontal, House, LoaderCircle, LogOut } from 'lucide-vue-next'
import LogoutConfirmModal from '~/components/auth/LogoutConfirmModal.vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'hacker'
  showHome?: boolean
}>(), { variant: 'default', showHome: false })
const { user, logout } = useAuth()
const loading = ref(false)
const logoutConfirmOpen = ref(false)
const expanded = ref(false)
const verticallyCollapsed = ref(false)
async function toggleVertical() {
  if (pointerId !== null) return
  // Preserve the top edge while the dock changes height.
  dockTop.value = dock.value?.getBoundingClientRect().top ?? dockTop.value
  verticallyCollapsed.value = !verticallyCollapsed.value
  try { localStorage.setItem('player-dock-vertical-collapsed', String(verticallyCollapsed.value)) } catch { /* Storage is optional. */ }
  await nextTick()
  fitDock()
  saveTop()
}
const dock = ref<HTMLElement | null>(null)
const dockTop = ref<number | null>(null)
const dragging = ref(false)
const storageKey = 'player-dock-top'
let pointerId: number | null = null
let startY = 0
let startTop = 0
let maxTop = 0
let pendingTop = 0
let frame: number | null = null
let observer: ResizeObserver | null = null
function clampTop(top: number) {
  return Math.max(12, Math.min(top, Math.max(12, window.innerHeight - (dock.value?.offsetHeight ?? 0) - 12)))
}
function saveTop() {
  try { localStorage.setItem(storageKey, String(dockTop.value)) } catch { /* Storage is optional. */ }
}
function flushDrag() {
  frame = null
  dockTop.value = Math.max(12, Math.min(pendingTop, maxTop))
}
function startDrag(event: PointerEvent) {
  if (event.button !== 0 || pointerId !== null) return
  const rect = dock.value?.getBoundingClientRect()
  if (!rect) return
  pointerId = event.pointerId
  startY = event.clientY
  startTop = rect.top
  pendingTop = startTop
  maxTop = Math.max(12, window.innerHeight - rect.height - 12)
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function moveDrag(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  pendingTop = startTop + event.clientY - startY
  if (frame === null) frame = requestAnimationFrame(flushDrag)
}
function endDrag(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  if (frame !== null) cancelAnimationFrame(frame)
  flushDrag()
  pointerId = null
  dragging.value = false
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
  saveTop()
}
function moveWithKeyboard(event: KeyboardEvent) {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  dockTop.value = clampTop((dockTop.value ?? dock.value?.getBoundingClientRect().top ?? 12) + (event.key === 'ArrowUp' ? -1 : 1) * (event.shiftKey ? 40 : 10))
  saveTop()
}
function fitDock() {
  if (pointerId === null && dockTop.value !== null) dockTop.value = clampTop(dockTop.value)
}
onMounted(() => {
  try {
    verticallyCollapsed.value = localStorage.getItem('player-dock-vertical-collapsed') === 'true'
    const saved = localStorage.getItem(storageKey)
    if (saved !== null && Number.isFinite(Number(saved))) dockTop.value = clampTop(Number(saved))
  } catch { /* Keep the dock centered when storage is unavailable. */ }
  observer = new ResizeObserver(fitDock)
  if (dock.value) observer.observe(dock.value)
  window.addEventListener('resize', fitDock)
})
onBeforeUnmount(() => {
  if (frame !== null) cancelAnimationFrame(frame)
  observer?.disconnect()
  window.removeEventListener('resize', fitDock)
})
const displayName = computed(() => user.value?.name?.trim() || 'Người chơi')
const initial = computed(() => displayName.value.slice(0, 1).toLocaleUpperCase('vi'))
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
  <Teleport to="body">
    <nav ref="dock" class="player-dock" :style="dockTop !== null ? { top: `${dockTop}px`, transform: 'none' } : undefined" :class="[{ 'is-expanded': expanded && !verticallyCollapsed, 'is-dragging': dragging }, `player-dock--${props.variant}`]" aria-label="Menu người chơi">
      <button type="button" class="player-dock__handle" title="Kéo lên xuống hoặc dùng phím mũi tên" aria-label="Di chuyển dock lên xuống" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag" @keydown="moveWithKeyboard"><GripHorizontal :size="20" /></button>
      <template v-if="!verticallyCollapsed">
      <button class="player-dock__avatar" type="button" :title="displayName" :aria-label="`${displayName}: ${expanded ? 'thu gọn' : 'mở rộng'} menu`" :aria-expanded="expanded" @click="expanded = !expanded">
        <b>{{ initial }}</b><span v-if="expanded" class="player-dock__identity"><small>Đang đăng nhập</small><strong>{{ displayName }}</strong></span>
      </button>
      <div class="player-dock__divider"></div>
      <NuxtLink v-if="props.showHome" to="/" class="player-dock__action" title="Trang chủ" aria-label="Về trang chủ"><House :size="20" /><span v-if="expanded">Trang chủ</span></NuxtLink>
      <button type="button" class="player-dock__action player-dock__exit" :disabled="loading" :title="loading ? 'Đang đăng xuất…' : 'Đăng xuất'" aria-label="Đăng xuất" @click="logoutConfirmOpen = true"><LoaderCircle v-if="loading" :size="20" class="is-spinning" /><LogOut v-else :size="20" /><span v-if="expanded">{{ loading ? 'Đang thoát…' : 'Đăng xuất' }}</span></button>
      <button type="button" class="player-dock__action player-dock__toggle" :title="expanded ? 'Thu gọn dock' : 'Mở rộng dock'" :aria-label="expanded ? 'Thu gọn dock' : 'Mở rộng dock'" :aria-expanded="expanded" @click="expanded = !expanded"><ChevronRight v-if="expanded" :size="18" /><ChevronLeft v-else :size="18" /><span v-if="expanded">Thu gọn</span></button>
      </template>
      <button type="button" class="player-dock__action player-dock__toggle" :title="verticallyCollapsed ? 'Mở dock xuống' : 'Thu gọn dock lên'" :aria-label="verticallyCollapsed ? 'Mở dock xuống' : 'Thu gọn dock theo chiều dọc'" :aria-expanded="!verticallyCollapsed" @click="toggleVertical"><ChevronDown v-if="verticallyCollapsed" :size="18" /><ChevronUp v-else :size="18" /><span v-if="expanded && !verticallyCollapsed">Thu gọn lên</span></button>
    </nav>
    <LogoutConfirmModal :open="logoutConfirmOpen" :loading="loading" :user-name="displayName" :variant="props.variant" @cancel="logoutConfirmOpen = false" @confirm="confirmLogout" />
  </Teleport>
</template>

<style scoped>
.player-dock { position: fixed; z-index: 1000; top: 50%; right: max(10px, env(safe-area-inset-right)); transform: translateY(-50%); display: flex; flex-direction: column; gap: 6px; width: 62px; max-height: calc(100dvh - 24px); overflow-y: auto; padding: 8px; border: 1px solid #ffffff26; border-radius: 18px; background: #171c24; color: #edf2fa; box-shadow: 0 8px 28px #0005; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.player-dock__handle { display: grid; place-items: center; width: 100%; min-height: 28px; flex-shrink: 0; border: 0; border-radius: 8px; background: #ffffff08; color: #aebbd1; cursor: grab; touch-action: none; user-select: none; }
.player-dock__handle:hover { background: #ffffff14; color: #edf2fa; }
.player-dock.is-dragging .player-dock__handle { cursor: grabbing; }
.player-dock.is-expanded { width: min(224px, calc(100vw - 24px)); }
.player-dock__avatar, .player-dock__action { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; flex-shrink: 0; padding: 10px 12px; border: 1px solid transparent; border-radius: 11px; background: transparent; color: inherit; cursor: pointer; text-decoration: none; font: inherit; font-size: 13px; font-weight: 600; }
.player-dock__avatar { padding: 4px; }
.player-dock__avatar b { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px; background: #c4b5fd; color: #281b50; font-size: 15px; }
.player-dock__identity { display: grid; gap: 3px; min-width: 0; text-align: left; }
.player-dock__identity small { color: #adb9cd; font-size: 10px; }
.player-dock__identity strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.player-dock__divider { height: 1px; flex-shrink: 0; margin: 3px 4px; background: #ffffff1a; }
.player-dock__action svg { flex-shrink: 0; }
.player-dock__action:hover:not(:disabled), .player-dock__avatar:hover { background: #ffffff0d; border-color: #ffffff1a; }
.player-dock__exit { background: #f8717114; color: #ffb4b4; }
.player-dock__exit:hover:not(:disabled) { background: #f8717129; border-color: #f8717140; }
.player-dock__toggle { color: #aebbd1; }
.player-dock button:focus-visible, .player-dock a:focus-visible { outline: 2px solid #c4b5fd; outline-offset: -2px; }
.player-dock button:disabled { opacity: .5; cursor: wait; }
.player-dock--hacker { background: #101e19; border-color: #34d39940; }
.player-dock--hacker .player-dock__avatar b { background: #6ee7b7; color: #063d2a; }
.is-spinning { animation: dock-spin .8s linear infinite; }
@keyframes dock-spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) { .player-dock { right: max(4px, env(safe-area-inset-right)); width: 54px; padding: 4px; border-radius: 14px; } }
@media (prefers-reduced-motion: reduce) { .is-spinning { animation: none; } }
</style>
