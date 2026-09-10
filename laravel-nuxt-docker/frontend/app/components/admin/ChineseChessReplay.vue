<script setup lang="ts">
import { Pause, Play, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import ChineseChessBoard from '~/components/chinese-chess/ChineseChessBoard.vue'
import { replayFrames } from '~/utils/chinese-chess/replay'
import type { ChineseChessPiece, ChineseChessMoveHistory, PieceColor } from '~/types/games/chinese-chess'
const props = defineProps<{ roundId: number }>()
const emit = defineEmits<{ close: [] }>()
interface Replay {
  code: string; round_number: number; board: ChineseChessPiece[]; move_history: ChineseChessMoveHistory[]; starting_color: PieceColor
  red_player: { name: string } | null; black_player: { name: string } | null
}
const api = useApi()
const dialog = ref<HTMLDialogElement | null>(null)
const data = ref<Replay | null>(null)
const error = ref('')
const loading = ref(true)
const step = ref(0)
const playing = ref(false)
const speed = ref(1)
const frames = computed(() => data.value ? replayFrames(data.value.board, data.value.move_history) : [])
const total = computed(() => data.value?.move_history.length ?? 0)
const lastMove = computed(() => data.value?.move_history[step.value - 1] ?? null)
const turn = computed<PieceColor>(() => lastMove.value ? (lastMove.value.color === 'red' ? 'black' : 'red') : data.value?.starting_color ?? 'red')
let timer: ReturnType<typeof setInterval> | undefined
let disposed = false
function pause() { playing.value = false; clearInterval(timer) }
function play() {
  if (!total.value) return
  pause()
  if (step.value >= total.value) step.value = 0
  playing.value = true
  timer = setInterval(() => {
    step.value++
    if (step.value >= total.value) pause()
  }, 1000 / speed.value)
}
function seek(value: number) { pause(); step.value = Math.max(0, Math.min(total.value, value)) }
watch(speed, () => { if (playing.value) play() })
async function load() {
  loading.value = true; error.value = ''
  try {
    const result = await api<{ data: Replay }>(`/api/admin/chinese-chess/history/${props.roundId}`)
    if (disposed) return
    data.value = result.data; step.value = 0; play()
  } catch { if (!disposed) error.value = 'Không thể tải bản ghi ván đấu.' }
  finally { if (!disposed) loading.value = false }
}
onMounted(() => { dialog.value?.showModal(); void load() })
onBeforeUnmount(() => { disposed = true; pause(); dialog.value?.close() })
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="chess-replay" aria-labelledby="replay-title" @cancel.prevent="emit('close')">
      <header><div><h2 id="replay-title">Phát lại ván đấu <template v-if="data">· {{ data.code }} / Ván {{ data.round_number }}</template></h2><p v-if="data">Đỏ: {{ data.red_player?.name || '—' }} · Đen: {{ data.black_player?.name || '—' }}</p></div><button autofocus aria-label="Đóng phát lại" @click="emit('close')"><X :size="20" /></button></header>
      <p v-if="loading" role="status">Đang tải ván đấu...</p>
      <div v-else-if="error" role="alert">{{ error }} <button @click="load">Thử lại</button></div>
      <template v-else-if="data">
        <div class="chess-replay__board"><ChineseChessBoard :position="frames[step]" :current-turn="turn" :game-started="false" readonly :show-waiting-overlay="false" :last-move="lastMove" /></div>
        <footer>
          <input type="range" min="0" :max="total" :value="step" :disabled="!total" aria-label="Tua nước đi" @input="seek(Number(($event.target as HTMLInputElement).value))">
          <div class="chess-replay__controls">
            <button :disabled="step === 0" aria-label="Nước trước" @click="seek(step - 1)"><ChevronLeft :size="18" /></button>
            <button :disabled="!total" @click="playing ? pause() : play()"><Pause v-if="playing" :size="18" /><Play v-else :size="18" />{{ playing ? 'Tạm dừng' : step === total && total ? 'Phát lại' : 'Phát' }}</button>
            <button :disabled="step >= total" aria-label="Nước sau" @click="seek(step + 1)"><ChevronRight :size="18" /></button>
            <span>Nước {{ step }} / {{ total }}</span>
            <select v-model.number="speed" aria-label="Tốc độ phát"><option :value="0.5">0.5×</option><option :value="1">1×</option><option :value="2">2×</option><option :value="4">4×</option></select>
          </div>
          <p v-if="!total">Ván này chưa có nước đi được ghi nhận.</p>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.chess-replay { width: min(720px, calc(100vw - 24px)); max-height: 94dvh; padding: 20px; border: 1px solid #d8a45b40; border-radius: 16px; background: #171410; color: #eee8dc; }
.chess-replay::backdrop { background: #000b; }
header { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }h2 { font-size: 16px; font-weight: 700; }p { margin-top: 6px; color: #b3aa9c; font-size: 12px; }
.chess-replay__board { width: min(100%, 470px); margin: auto; }
footer { position: sticky; bottom: -20px; margin-top: 16px; padding: 12px 0; background: #171410; }
input { width: 100%; accent-color: #d8a45b; }.chess-replay__controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; font-size: 12px; }
button, select { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 8px 10px; border: 1px solid #ffffff20; border-radius: 8px; background: #262018; color: inherit; }button:disabled { opacity: .4; }button:focus-visible { outline: 2px solid #d8a45b; outline-offset: 2px; }
</style>
