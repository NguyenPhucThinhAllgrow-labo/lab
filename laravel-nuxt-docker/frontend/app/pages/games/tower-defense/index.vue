<script setup lang="ts">
import { Coins, Crown, Gauge, HeartPulse, Play, RotateCcw, ShieldCheck, Sparkles, Swords } from 'lucide-vue-next'
import { TOWER_DEFINITIONS, TOWER_RANGE_LEVEL_BONUS, useTowerDefense } from '~/composables/useTowerDefense'
import type { TowerKind } from '~/types/games/towerDefense'

useHead({
  title: 'Kingdom Defense — Game Lab',
  meta: [{ name: 'description', content: 'Xây dựng phòng tuyến và bảo vệ lâu đài trong game Tower Defense chiến thuật.' }],
})

const {
  credits, castleHealth, wave, score, bestWave, phase, speedMultiplier, selectedKind,
  selectedTowerId, selectedTower, towers, enemies, projectiles, impacts, pendingEnemies, message, canStartWave,
  upgradeCost, selectCell, upgradeSelected, sellSelected,
  startWave, resetGame,
} = useTowerDefense()

const towerKinds = Object.keys(TOWER_DEFINITIONS) as TowerKind[]
const towerImages = {
  archer: '/images/games/tower-defense/archer-tower.png?v=20260914-2',
  cannon: '/images/games/tower-defense/cannon-tower.png?v=20260914-2',
  frost: '/images/games/tower-defense/frost-tower.png?v=20260914-2',
  fire: '/images/games/tower-defense/frost-tower.png?v=20260914-2',
}
const phaseLabel = computed(() => ({ ready: 'Sẵn sàng', wave: 'Đang giao chiến', between: 'Chuẩn bị đợt mới', gameover: 'Lâu đài thất thủ' })[phase.value])
const enemiesRemaining = computed(() => enemies.value.length + pendingEnemies.value)
const selectedTowerAnchor = ref({ x: 0, y: 0, visible: false })

function updateSelectedTowerAnchor(x: number, y: number, visible: boolean) {
  selectedTowerAnchor.value = { x, y, visible }
}

function handleCellSelect(x: number, y: number) {
  const clickedTower = towers.value.some(tower => tower.x === x && tower.y === y)
  selectCell(x, y)
  if (!clickedTower) {
    selectedKind.value = null
    selectedTowerId.value = null
  }
}

function clearBoardSelection() {
  selectedKind.value = null
  selectedTowerId.value = null
}

function closeTowerPopupOnOutsideClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.defense-upgrade--floating') || target.closest('.tower-defense-scene')) return
  selectedTowerId.value = null
}

function cancelSelectionOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (selectedKind.value || selectedTowerId.value !== null) {
    clearBoardSelection()
    message.value = 'Đã hủy lựa chọn.'
  }
}

onMounted(() => {
  document.addEventListener('click', closeTowerPopupOnOutsideClick)
  window.addEventListener('keydown', cancelSelectionOnEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeTowerPopupOnOutsideClick)
  window.removeEventListener('keydown', cancelSelectionOnEscape)
})

</script>

<template>
  <main class="defense-page">
    <div class="defense-page__grid" aria-hidden="true" />

    <section class="defense-shell">
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
                :speed-multiplier="speedMultiplier"
                @cell-select="handleCellSelect"
                @background-select="clearBoardSelection"
                @selected-tower-position="updateSelectedTowerAnchor"
              />
              <template #fallback><div class="defense-scene-loading">Đang dựng chiến trường 3D…</div></template>
            </ClientOnly>

            <header class="defense-game-hud">
              <div class="defense-game-title">
                <span class="defense-eyebrow"><Crown /> BẢO VỆ VƯƠNG QUỐC</span>
                <h1>Kingdom <em>Defense</em></h1>
              </div>
              <div class="defense-status" :class="`is-${phase}`"><i /><span>{{ phaseLabel }}</span></div>
              <div class="defense-stats">
                <article><HeartPulse /><div><small>LÂU ĐÀI</small><strong>{{ castleHealth }}<span>/20</span></strong></div></article>
                <article><Coins /><div><small>VÀNG</small><strong>{{ credits }}</strong></div></article>
                <article><Swords /><div><small>ĐỢT</small><strong>{{ wave }}</strong></div></article>
                <article><ShieldCheck /><div><small>KỶ LỤC</small><strong>{{ bestWave }}</strong></div></article>
                <article><Sparkles /><div><small>ĐIỂM</small><strong>{{ score }}</strong></div></article>
              </div>
            </header>

            <section
              v-if="selectedTower && selectedTowerAnchor.visible"
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
              <p>{{ canStartWave && selectedTower.canRelocate ? 'Tháp mới mua: chọn ô trống để đổi vị trí trước khi bắt đầu round.' : 'Tháp đã bị khóa vị trí.' }}</p>
              <div><span>Sát thương</span><b>{{ Math.round(TOWER_DEFINITIONS[selectedTower.kind].damage * (1 + (selectedTower.level - 1) * 0.55)) }}</b></div>
              <div><span>{{ selectedTower.kind === 'frost' ? 'Bán kính vùng' : 'Tầm bắn' }}</span><b>{{ (selectedTower.kind === 'frost' ? TOWER_DEFINITIONS.frost.range : TOWER_DEFINITIONS[selectedTower.kind].range + (selectedTower.level - 1) * TOWER_RANGE_LEVEL_BONUS).toFixed(1) }}</b></div>
              <div v-if="selectedTower.kind === 'fire'" class="is-splash"><span>Bán kính nổ</span><b>{{ TOWER_DEFINITIONS.fire.splashRadius }}</b></div>
              <div v-if="selectedTower.kind === 'fire'" class="is-burn"><span>Thiêu đốt</span><b>{{ ((TOWER_DEFINITIONS.fire.burnDamagePerSecond ?? 0) * (1 + (selectedTower.level - 1) * 0.55)).toFixed(1) }}/s · 5s</b></div>
              <button type="button" :disabled="selectedTower.level >= 3 || credits < upgradeCost" @click="upgradeSelected">{{ selectedTower.level >= 3 ? 'Đã tối đa' : `Nâng cấp · ${upgradeCost}` }}</button>
              <button type="button" class="is-sell" @click="sellSelected">Bán · {{ Math.floor(selectedTower.invested * 0.7) }}</button>
            </section>

            <aside class="defense-sidebar">
              <section class="defense-build">
                <header><small>THÁP PHÒNG THỦ</small><h2>Chọn công trình</h2></header>
                <button v-for="kind in towerKinds" :key="kind" type="button" :class="{ active: selectedKind === kind }" @click="selectedKind = kind; selectedTowerId = null">
                  <span :style="{ '--tower-color': TOWER_DEFINITIONS[kind].color }"><img :src="towerImages[kind]" :alt="TOWER_DEFINITIONS[kind].name" :class="{ 'is-fire-tower': kind === 'fire' }"></span>
                  <div><strong>{{ TOWER_DEFINITIONS[kind].name }}</strong><small>{{ TOWER_DEFINITIONS[kind].description }}</small></div>
                  <b>{{ TOWER_DEFINITIONS[kind].cost }}</b>
                </button>
              </section>

              <section class="defense-wave-control">
                <div><span>Đợt tiếp theo</span><strong>{{ wave + 1 }}</strong></div>
                <p>Mỗi đợt tăng số lượng, tốc độ và sức chống chịu của quân địch.</p>
                <button v-if="phase !== 'gameover'" type="button" :disabled="!canStartWave" @click="startWave"><Play />{{ phase === 'wave' ? 'Đang giao chiến' : 'Bắt đầu đợt mới' }}</button>
                <button v-else type="button" @click="resetGame"><RotateCcw />Chơi lại</button>
              </section>
            </aside>

            <footer class="defense-board-footer">
              <p><span>CHỈ HUY</span>{{ message }}</p>
              <div><strong>{{ enemiesRemaining }} quân địch</strong><div class="defense-speed"><Gauge /><button type="button" :class="{ active: speedMultiplier === 1 }" @click="speedMultiplier = 1">1×</button><button type="button" :class="{ active: speedMultiplier === 2 }" @click="speedMultiplier = 2">2×</button></div></div>
            </footer>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/tower-defense.css"></style>
