<script setup lang="ts">
import { Coins, Crown, Flag, Gauge, HeartPulse, Play, RotateCcw, Shield, ShieldCheck, Sparkles, Swords } from 'lucide-vue-next'
import { TOWER_DEFINITIONS, useTowerDefense } from '~/composables/useTowerDefense'
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
}
const phaseLabel = computed(() => ({ ready: 'Sẵn sàng', wave: 'Đang giao chiến', between: 'Chuẩn bị đợt mới', gameover: 'Lâu đài thất thủ' })[phase.value])
const enemiesRemaining = computed(() => enemies.value.length + pendingEnemies.value)

</script>

<template>
  <main class="defense-page">
    <div class="defense-page__grid" aria-hidden="true" />

    <section class="defense-shell">
      <header class="defense-hero">
        <div>
          <span class="defense-eyebrow"><Crown /> BẢO VỆ VƯƠNG QUỐC</span>
          <h1>Kingdom <em>Defense</em></h1>
          <p>Xây dựng phòng tuyến, đẩy lùi đoàn quân quái vật và bảo vệ lâu đài qua từng đợt tiến công.</p>
        </div>
        <div class="defense-status" :class="`is-${phase}`"><i /><span>{{ phaseLabel }}</span></div>
      </header>

      <div class="defense-stats">
        <article><HeartPulse /><div><small>ĐỘ BỀN LÂU ĐÀI</small><strong>{{ castleHealth }}<span>/20</span></strong></div></article>
        <article><Coins /><div><small>VÀNG</small><strong>{{ credits }}</strong></div></article>
        <article><Swords /><div><small>ĐỢT HIỆN TẠI</small><strong>{{ wave }}</strong></div></article>
        <article><ShieldCheck /><div><small>KỶ LỤC</small><strong>{{ bestWave }}</strong></div></article>
        <article><Sparkles /><div><small>ĐIỂM</small><strong>{{ score }}</strong></div></article>
      </div>

      <div class="defense-layout">
        <section class="defense-board-panel">
          <header><div><small>CHIẾN TRƯỜNG · ẢI 01</small><h2>Con đường tới lâu đài</h2></div><span>{{ enemiesRemaining }} quân địch</span></header>

          <div class="defense-board-stage">
            <div class="defense-board has-webgl" role="grid" aria-label="Bản đồ phòng thủ 3D, 12 cột và 8 hàng">
              <ClientOnly>
                <TowerDefenseScene
                  :towers="towers"
                  :enemies="enemies"
                  :projectiles="projectiles"
                  :impacts="impacts"
                  :selected-tower-id="selectedTowerId"
                  @cell-select="selectCell"
                />
                <template #fallback><div class="defense-scene-loading">Đang dựng chiến trường 3D…</div></template>
              </ClientOnly>

            <div class="defense-entry"><Flag /> ĐIỂM XUẤT PHÁT</div>
            </div>
          </div>

          <footer class="defense-board-footer">
            <p><span>CHỈ HUY</span>{{ message }}</p>
            <div class="defense-speed"><Gauge /><button type="button" :class="{ active: speedMultiplier === 1 }" @click="speedMultiplier = 1">1×</button><button type="button" :class="{ active: speedMultiplier === 2 }" @click="speedMultiplier = 2">2×</button></div>
          </footer>
        </section>

        <aside class="defense-sidebar">
          <section class="defense-build">
            <header><small>THÁP PHÒNG THỦ</small><h2>Chọn công trình</h2></header>
            <button v-for="kind in towerKinds" :key="kind" type="button" :class="{ active: selectedKind === kind }" @click="selectedKind = kind; selectedTowerId = null">
              <span :style="{ '--tower-color': TOWER_DEFINITIONS[kind].color }"><img :src="towerImages[kind]" :alt="TOWER_DEFINITIONS[kind].name"></span>
              <div><strong>{{ TOWER_DEFINITIONS[kind].name }}</strong><small>{{ TOWER_DEFINITIONS[kind].description }}</small></div>
              <b>{{ TOWER_DEFINITIONS[kind].cost }}</b>
            </button>
          </section>

          <section v-if="selectedTower" class="defense-upgrade">
            <small>THÁP ĐANG CHỌN</small>
            <h3>{{ TOWER_DEFINITIONS[selectedTower.kind].name }} · LV.{{ selectedTower.level }}</h3>
            <div><span>Sát thương</span><b>{{ Math.round(TOWER_DEFINITIONS[selectedTower.kind].damage * (1 + (selectedTower.level - 1) * 0.55)) }}</b></div>
            <div><span>{{ selectedTower.kind === 'frost' ? 'Bán kính vùng' : 'Tầm bắn' }}</span><b>{{ (selectedTower.kind === 'frost' ? 1 : TOWER_DEFINITIONS[selectedTower.kind].range + (selectedTower.level - 1) * 0.2).toFixed(1) }}</b></div>
            <button type="button" :disabled="selectedTower.level >= 3 || credits < upgradeCost" @click="upgradeSelected">{{ selectedTower.level >= 3 ? 'Đã tối đa' : `Nâng cấp · ${upgradeCost}` }}</button>
            <button type="button" class="is-sell" @click="sellSelected">Bán · {{ Math.floor(selectedTower.invested * 0.7) }}</button>
          </section>

          <section class="defense-wave-control">
            <div><span>Đợt tiếp theo</span><strong>{{ wave + 1 }}</strong></div>
            <p>Mỗi đợt tăng số lượng, tốc độ và sức chống chịu của quân địch.</p>
            <button v-if="phase !== 'gameover'" type="button" :disabled="!canStartWave" @click="startWave"><Play />{{ phase === 'wave' ? 'Đang giao chiến' : 'Bắt đầu đợt mới' }}</button>
            <button v-else type="button" @click="resetGame"><RotateCcw />Chơi lại</button>
          </section>
        </aside>
      </div>

      <footer class="defense-help"><Shield /><p><strong>Điều khiển chiến trường</strong>Click để đặt tháp · Giữ chuột trái và kéo để xoay góc nhìn · Lăn chuột để zoom · Chuột phải để di chuyển camera.</p></footer>
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/tower-defense.css"></style>
