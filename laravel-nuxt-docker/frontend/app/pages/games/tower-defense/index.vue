<script setup lang="ts">
import { Coins, Crown, Gauge, HeartPulse, Move, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Swords, Undo2 } from 'lucide-vue-next'
import { FROST_SLOW_DURATION_SECONDS, TOWER_DEFINITIONS, TOWER_RANGE_LEVEL_BONUS, useTowerDefense } from '~/composables/useTowerDefense'
import type { TowerKind } from '~/types/games/towerDefense'

useHead({
  title: 'Kingdom Defense — Game Lab',
  meta: [{ name: 'description', content: 'Xây dựng phòng tuyến và bảo vệ lâu đài trong game Tower Defense chiến thuật.' }],
})

const {
  credits, castleHealth, wave, score, bestWave, phase, isPaused, speedMultiplier, selectedKind,
  selectedTowerId, selectedTower, towers, enemies, projectiles, impacts, pendingEnemies, nextWaveCountdown, message, canStartWave, canUndoSelectedPlacement,
  upgradeCost, selectCell, upgradeSelected, enableSelectedRelocation, sellSelected, undoSelectedPlacement,
  startWave, resetGame, togglePause,
} = useTowerDefense()

const towerKinds = Object.keys(TOWER_DEFINITIONS) as TowerKind[]
const towerImages = {
  archer: '/images/games/tower-defense/archer-tower.png?v=20260914-2',
  cannon: '/images/games/tower-defense/cannon-tower.png?v=20260914-2',
  frost: '/images/games/tower-defense/frost-tower.png?v=20260914-2',
  fire: '/images/games/tower-defense/frost-tower.png?v=20260914-2',
}
const phaseLabel = computed(() => isPaused.value ? 'Đã tạm dừng' : ({ ready: 'Sẵn sàng', wave: 'Đang giao chiến', between: 'Chuẩn bị đợt mới', gameover: 'Lâu đài thất thủ' })[phase.value])
const enemiesRemaining = computed(() => enemies.value.length + pendingEnemies.value)
const selectedTowerAnchor = ref({ x: 0, y: 0, visible: false })
const isMovePlacementMode = ref(false)
const hoveredTowerKind = ref<TowerKind | null>(null)
const towerTooltipPosition = ref({ x: 0, y: 0 })
const hoveredTowerDefinition = computed(() => hoveredTowerKind.value ? TOWER_DEFINITIONS[hoveredTowerKind.value] : null)
const sceneReady = ref(false)
const imagesReady = ref(false)
const isGameReady = computed(() => sceneReady.value && imagesReady.value)

function preloadTowerImages() {
  const sources = [...new Set(Object.values(towerImages))]
  return Promise.allSettled(sources.map(source => new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = image.onerror = () => resolve()
    image.src = source
  })))
}

function positionTowerTooltip(clientX: number, clientY: number) {
  towerTooltipPosition.value = {
    x: Math.max(12, clientX - 244),
    y: Math.max(12, Math.min(clientY - 70, window.innerHeight - 290)),
  }
}

function showTowerTooltip(kind: TowerKind, event: MouseEvent | FocusEvent) {
  hoveredTowerKind.value = kind
  if (event instanceof MouseEvent) {
    positionTowerTooltip(event.clientX, event.clientY)
    return
  }
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  positionTowerTooltip(bounds.left, bounds.top + bounds.height / 2)
}

function hideTowerTooltip() {
  hoveredTowerKind.value = null
}

function updateSelectedTowerAnchor(x: number, y: number, visible: boolean) {
  selectedTowerAnchor.value = { x, y, visible }
}

function handleCellSelect(x: number, y: number) {
  const clickedTower = towers.value.some(tower => tower.x === x && tower.y === y)
  selectCell(x, y)
  isMovePlacementMode.value = false
  if (!clickedTower) {
    selectedKind.value = null
    selectedTowerId.value = null
  }
}

function clearBoardSelection() {
  isMovePlacementMode.value = false
  selectedKind.value = null
  selectedTowerId.value = null
}

function beginTowerRelocation() {
  enableSelectedRelocation()
  isMovePlacementMode.value = true
}

function closeTowerPopupOnOutsideClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.defense-upgrade--floating') || target.closest('.tower-defense-scene')) return
  isMovePlacementMode.value = false
  selectedTowerId.value = null
}

function cancelSelectionOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (selectedKind.value || selectedTowerId.value !== null) {
    clearBoardSelection()
    message.value = 'Đã hủy lựa chọn.'
  }
}

watch(phase, (currentPhase) => {
  if (currentPhase === 'wave' || currentPhase === 'gameover') isMovePlacementMode.value = false
})

onMounted(async () => {
  document.addEventListener('click', closeTowerPopupOnOutsideClick)
  window.addEventListener('keydown', cancelSelectionOnEscape)
  await preloadTowerImages()
  imagesReady.value = true
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeTowerPopupOnOutsideClick)
  window.removeEventListener('keydown', cancelSelectionOnEscape)
})

</script>

<template>
  <main class="defense-page">
    <div class="defense-page__grid" aria-hidden="true" />

    <section class="defense-shell" :class="{ 'is-loading': !isGameReady }" :aria-hidden="!isGameReady">
      <section class="defense-board-panel">
        <div class="defense-board-stage">
          <div class="defense-board has-webgl" role="grid" aria-label="Bản đồ phòng thủ 3D, 18 cột và 14 hàng">
            <ClientOnly>
              <TowerDefenseScene
                :towers="towers"
                :enemies="enemies"
                :projectiles="projectiles"
                :impacts="impacts"
                :selected-tower-id="selectedTowerId"
                :selected-kind="selectedKind"
                :phase="phase"
                :is-paused="isPaused"
                :speed-multiplier="speedMultiplier"
                @cell-select="handleCellSelect"
                @background-select="clearBoardSelection"
                @selected-tower-position="updateSelectedTowerAnchor"
                @ready="sceneReady = true"
              />
              <template #fallback><div class="defense-scene-loading">Đang dựng chiến trường 3D…</div></template>
            </ClientOnly>

            <header class="defense-game-hud">
              <div class="defense-game-title">
                <span class="defense-eyebrow"><Crown /> BẢO VỆ VƯƠNG QUỐC</span>
                <h1>Kingdom <em>Defense</em></h1>
              </div>
              <div class="defense-status" :class="`is-${phase}`">
                <i />
                <span>{{ phaseLabel }}</span>
                <b>{{ enemiesRemaining }} quân địch</b>
              </div>
              <div class="defense-stats">
                <article><HeartPulse /><div><small>LÂU ĐÀI</small><strong>{{ castleHealth }}<span>/20</span></strong></div></article>
                <article><Coins /><div><small>VÀNG</small><strong>{{ credits }}</strong></div></article>
                <article><Swords /><div><small>ĐỢT</small><strong>{{ wave }}</strong></div></article>
                <article><ShieldCheck /><div><small>KỶ LỤC</small><strong>{{ bestWave }}</strong></div></article>
                <article><Sparkles /><div><small>ĐIỂM</small><strong>{{ score }}</strong></div></article>
              </div>
            </header>

            <section
              v-if="selectedTower && selectedTowerAnchor.visible && !isMovePlacementMode"
              class="defense-upgrade defense-upgrade--floating"
              :style="{ left: `${selectedTowerAnchor.x}px`, top: `${selectedTowerAnchor.y}px` }"
            >
              <button
                type="button"
                class="defense-upgrade__close"
                aria-label="Đóng thông tin tháp"
                title="Đóng"
                @click.stop="selectedTowerId = null"
              >
                ×
              </button>
              <small>THÁP ĐANG CHỌN</small>
              <h3>{{ TOWER_DEFINITIONS[selectedTower.kind].name }} · LV.{{ selectedTower.level }}</h3>
              <p class="defense-upgrade__description">{{ TOWER_DEFINITIONS[selectedTower.kind].description }}</p>
              <p>{{ selectedTower.canRelocate && canStartWave ? 'Chọn một ô trống trên bản đồ để đặt lại tháp.' : canStartWave ? 'Nhấn Di chuyển để chọn vị trí mới cho tháp.' : 'Chỉ có thể di chuyển tháp trong thời gian chuẩn bị.' }}</p>
              <div class="is-price"><span>{{ selectedTower.level > 1 ? 'Tổng đầu tư' : 'Giá xây' }}</span><b>{{ selectedTower.invested }} vàng</b></div>
              <div class="is-damage"><span>Sát thương</span><b>{{ Math.round(TOWER_DEFINITIONS[selectedTower.kind].damage * (1 + (selectedTower.level - 1) * 0.55)) }}</b></div>
              <div class="is-range"><span>{{ selectedTower.kind === 'frost' ? 'Bán kính vùng' : 'Tầm bắn' }}</span><b>{{ (selectedTower.kind === 'frost' ? TOWER_DEFINITIONS.frost.range : TOWER_DEFINITIONS[selectedTower.kind].range + (selectedTower.level - 1) * TOWER_RANGE_LEVEL_BONUS).toFixed(1) }}</b></div>
              <div class="is-rate"><span>Nhịp bắn</span><b>{{ (TOWER_DEFINITIONS[selectedTower.kind].fireRate / (1 + (selectedTower.level - 1) * 0.18)).toFixed(2) }} giây</b></div>
              <div v-if="selectedTower.kind === 'frost'" class="is-slow"><span>Làm chậm</span><b>{{ Math.round((TOWER_DEFINITIONS.frost.slow ?? 0) * 100) }}% · {{ FROST_SLOW_DURATION_SECONDS }} giây</b></div>
              <div v-if="selectedTower.kind === 'fire' || selectedTower.kind === 'cannon'" class="is-splash"><span>Bán kính nổ</span><b>{{ TOWER_DEFINITIONS[selectedTower.kind].splashRadius }}</b></div>
              <div v-if="selectedTower.kind === 'fire'" class="is-burn"><span>Thiêu đốt</span><b>{{ ((TOWER_DEFINITIONS.fire.burnDamagePerSecond ?? 0) * (1 + (selectedTower.level - 1) * 0.55)).toFixed(1) }}/s · {{ TOWER_DEFINITIONS.fire.burnDuration }}s</b></div>
              <button type="button" :disabled="selectedTower.level >= 3 || credits < upgradeCost" @click="upgradeSelected">{{ selectedTower.level >= 3 ? 'Đã tối đa' : `Nâng cấp · ${upgradeCost}` }}</button>
              <button type="button" class="is-move" :disabled="!canStartWave || selectedTower.canRelocate" @click="beginTowerRelocation"><Move />{{ selectedTower.canRelocate ? 'Đang chọn vị trí' : 'Di chuyển' }}</button>
              <button v-if="canUndoSelectedPlacement" type="button" class="is-undo" title="Gỡ tháp và nhận lại toàn bộ vàng đã đầu tư" @click="undoSelectedPlacement"><Undo2 />Hoàn tác đặt tháp · {{ selectedTower.invested }}</button>
              <button type="button" class="is-sell" @click="sellSelected">Bán · {{ Math.floor(selectedTower.invested * 0.7) }}</button>
            </section>

            <aside class="defense-sidebar">
              <section class="defense-build">
                <header><small>THÁP PHÒNG THỦ</small><h2>Chọn công trình</h2></header>
                <button
                  v-for="kind in towerKinds"
                  :key="kind"
                  type="button"
                  :class="{ active: selectedKind === kind }"
                  @click="selectedKind = kind; selectedTowerId = null"
                  @mouseenter="showTowerTooltip(kind, $event)"
                  @mousemove="showTowerTooltip(kind, $event)"
                  @mouseleave="hideTowerTooltip"
                  @focus="showTowerTooltip(kind, $event)"
                  @blur="hideTowerTooltip"
                >
                  <span :style="{ '--tower-color': TOWER_DEFINITIONS[kind].color }"><img :src="towerImages[kind]" :alt="TOWER_DEFINITIONS[kind].name" :class="{ 'is-fire-tower': kind === 'fire' }"></span>
                  <div><strong>{{ TOWER_DEFINITIONS[kind].name }}</strong><small>{{ TOWER_DEFINITIONS[kind].description }}</small></div>
                  <b>{{ TOWER_DEFINITIONS[kind].cost }}</b>
                </button>
              </section>

              <section class="defense-wave-control">
                <div><span>Đợt tiếp theo</span><strong>{{ wave + 1 }}</strong></div>
                <p v-if="phase === 'between'">Tự động bắt đầu sau {{ Math.ceil(nextWaveCountdown) }} giây. Bạn vẫn có thể bắt đầu sớm.</p>
                <p v-else>Mỗi đợt tăng số lượng, tốc độ và sức chống chịu của quân địch.</p>
                <button v-if="phase !== 'gameover'" type="button" :disabled="!canStartWave" @click="startWave"><Play />{{ phase === 'wave' ? 'Đang giao chiến' : phase === 'between' ? `Bắt đầu ngay · ${Math.ceil(nextWaveCountdown)}s` : 'Bắt đầu đợt đầu tiên' }}</button>
                <button v-else type="button" @click="resetGame"><RotateCcw />Chơi lại</button>
              </section>
            </aside>

            <footer class="defense-board-footer">
              <p><span>CHỈ HUY</span>{{ message }}</p>
              <div><div class="defense-speed"><button v-if="phase === 'wave'" type="button" :class="{ active: isPaused }" :title="isPaused ? 'Tiếp tục' : 'Tạm dừng'" @click="togglePause"><Play v-if="isPaused" /><Pause v-else />{{ isPaused ? 'Tiếp tục' : 'Tạm dừng' }}</button><Gauge /><button type="button" :class="{ active: speedMultiplier === 1 }" @click="speedMultiplier = 1">1×</button><button type="button" :class="{ active: speedMultiplier === 2 }" @click="speedMultiplier = 2">2×</button></div></div>
            </footer>
          </div>
        </div>
      </section>
    </section>

    <Transition name="defense-loader">
      <section v-if="!isGameReady" class="defense-loading-screen" role="status" aria-live="polite" aria-label="Đang tải trò chơi">
        <div class="defense-loading-screen__crest"><Crown /></div>
        <span>ĐANG TRIỆU TẬP QUÂN ĐỘI</span>
        <h1>Kingdom <em>Defense</em></h1>
        <div class="defense-loading-screen__bar"><i /></div>
        <p>Đang chuẩn bị chiến trường và tài nguyên 3D…</p>
      </section>
    </Transition>

    <Teleport to="body">
      <aside
        v-if="hoveredTowerDefinition"
        class="defense-tower-tooltip"
        :style="{ left: `${towerTooltipPosition.x}px`, top: `${towerTooltipPosition.y}px`, '--tower-color': hoveredTowerDefinition.color }"
      >
        <small>THÔNG TIN CÔNG TRÌNH</small>
        <h3>{{ hoveredTowerDefinition.name }}</h3>
        <p>{{ hoveredTowerDefinition.description }}</p>
        <dl>
          <div class="is-price"><dt>Giá xây</dt><dd>{{ hoveredTowerDefinition.cost }} vàng</dd></div>
          <div class="is-damage"><dt>Sát thương</dt><dd>{{ hoveredTowerDefinition.damage }}</dd></div>
          <div class="is-range"><dt>{{ hoveredTowerKind === 'frost' ? 'Bán kính vùng' : 'Tầm bắn' }}</dt><dd>{{ hoveredTowerDefinition.range.toFixed(1) }}</dd></div>
          <div class="is-rate"><dt>Nhịp bắn</dt><dd>{{ hoveredTowerDefinition.fireRate.toFixed(2) }} giây</dd></div>
          <div v-if="hoveredTowerKind === 'frost'" class="is-slow"><dt>Làm chậm</dt><dd>{{ Math.round((hoveredTowerDefinition.slow ?? 0) * 100) }}% · {{ FROST_SLOW_DURATION_SECONDS }} giây</dd></div>
          <div v-if="hoveredTowerKind === 'fire' || hoveredTowerKind === 'cannon'" class="is-splash"><dt>Nổ lan</dt><dd>{{ hoveredTowerDefinition.splashRadius }}</dd></div>
          <div v-if="hoveredTowerKind === 'fire'" class="is-burn"><dt>Thiêu đốt</dt><dd>{{ hoveredTowerDefinition.burnDamagePerSecond }}/s · {{ hoveredTowerDefinition.burnDuration }}s</dd></div>
        </dl>
      </aside>
    </Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/tower-defense.css"></style>
