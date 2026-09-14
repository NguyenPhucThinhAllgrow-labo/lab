import type { Enemy, GamePhase, GridPoint, Impact, Projectile, Tower, TowerDefinition, TowerKind } from '~/types/games/towerDefense'

const STORAGE_KEY = 'game-lab:kingdom-defense:best-wave'

export const TOWER_DEFINITIONS: Record<TowerKind, TowerDefinition> = {
  archer: { kind: 'archer', name: 'Tháp cung', description: 'Tầm xa, sát thương ổn định.', cost: 80, damage: 18, range: 2.25, fireRate: 0.75, color: '#65a30d' },
  cannon: { kind: 'cannon', name: 'Tháp pháo', description: 'Uy lực lớn, nhịp bắn chậm.', cost: 110, damage: 34, range: 2, fireRate: 1.25, color: '#d97706' },
  frost: { kind: 'frost', name: 'Tháp băng', description: 'Đóng băng vùng đường kính 2 ô.', cost: 95, damage: 6, range: 1, fireRate: 1.1, slow: 0.48, color: '#0891b2' },
}

export const DEFENSE_PATH: GridPoint[] = [
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
  { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
  { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 4 }, { x: 8, y: 3 }, { x: 8, y: 2 },
  { x: 8, y: 1 }, { x: 9, y: 1 }, { x: 10, y: 1 }, { x: 11, y: 1 },
]

export function useTowerDefense() {
  const credits = ref(260)
  const castleHealth = ref(20)
  const wave = ref(0)
  const score = ref(0)
  const bestWave = ref(0)
  const phase = ref<GamePhase>('ready')
  const speedMultiplier = ref<1 | 2>(1)
  const selectedKind = ref<TowerKind>('archer')
  const selectedTowerId = ref<number | null>(null)
  const towers = ref<Tower[]>([])
  const enemies = ref<Enemy[]>([])
  const projectiles = ref<Projectile[]>([])
  const impacts = ref<Impact[]>([])
  const pendingEnemies = ref(0)
  const message = ref('Chọn tháp và đặt vào vùng trống để bắt đầu phòng thủ.')
  let nextTowerId = 1
  let nextEnemyId = 1
  let nextProjectileId = 1
  let nextImpactId = 1
  let spawnCooldown = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let elapsed = 0

  const pathKeys = new Set(DEFENSE_PATH.map(point => `${point.x}:${point.y}`))
  const selectedTower = computed(() => towers.value.find(tower => tower.id === selectedTowerId.value) ?? null)
  const canStartWave = computed(() => phase.value === 'ready' || phase.value === 'between')
  const upgradeCost = computed(() => selectedTower.value ? 55 + selectedTower.value.level * 35 : 0)

  function isPath(x: number, y: number) { return pathKeys.has(`${x}:${y}`) }
  function towerAt(x: number, y: number) { return towers.value.find(tower => tower.x === x && tower.y === y) }

  function selectCell(x: number, y: number) {
    const existing = towerAt(x, y)
    if (existing) { selectedTowerId.value = existing.id; return }
    selectedTowerId.value = null
    if (isPath(x, y) || phase.value === 'gameover') return
    const definition = TOWER_DEFINITIONS[selectedKind.value]
    if (credits.value < definition.cost) { message.value = `Cần ${definition.cost} vàng để xây ${definition.name}.`; return }
    credits.value -= definition.cost
    towers.value.push({ id: nextTowerId++, kind: definition.kind, x, y, level: 1, cooldown: 0, invested: definition.cost, firingUntil: 0, aimAngle: 0, shotSequence: 0 })
    message.value = `${definition.name} đã được xây dựng.`
  }

  function upgradeSelected() {
    const tower = selectedTower.value
    if (!tower || tower.level >= 3 || credits.value < upgradeCost.value) return
    credits.value -= upgradeCost.value
    tower.invested += upgradeCost.value
    tower.level++
    message.value = `Đã nâng ${TOWER_DEFINITIONS[tower.kind].name} lên cấp ${tower.level}.`
  }

  function sellSelected() {
    const tower = selectedTower.value
    if (!tower) return
    credits.value += Math.floor(tower.invested * 0.7)
    towers.value = towers.value.filter(item => item.id !== tower.id)
    selectedTowerId.value = null
    message.value = 'Đã bán tháp và hoàn lại 70% số vàng.'
  }

  function startWave() {
    if (!canStartWave.value) return
    wave.value++
    pendingEnemies.value = 5 + wave.value * 2
    spawnCooldown = 0
    phase.value = 'wave'
    message.value = `Đợt ${wave.value}: quân địch đang tiến vào vương quốc.`
  }

  function spawnEnemy() {
    const maxHp = 44 + wave.value * 18
    enemies.value.push({ id: nextEnemyId++, progress: 0, hp: maxHp, maxHp, speed: 0.72 + Math.min(wave.value * 0.025, 0.35), reward: 14 + wave.value * 2, slowUntil: 0 })
    pendingEnemies.value--
  }

  function positionFor(enemy: Enemy) {
    const index = Math.min(Math.floor(enemy.progress), DEFENSE_PATH.length - 1)
    const nextIndex = Math.min(index + 1, DEFENSE_PATH.length - 1)
    const ratio = enemy.progress - index
    const from = DEFENSE_PATH[index]!
    const to = DEFENSE_PATH[nextIndex]!
    return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio }
  }

  function tick() {
    if (phase.value !== 'wave') return
    const dt = 0.1 * speedMultiplier.value
    elapsed += dt
    const arrived: Projectile[] = []
    projectiles.value = projectiles.value.filter((projectile) => {
      const target = enemies.value.find(enemy => enemy.id === projectile.targetId)
      if (target) projectile.to = positionFor(target)
      projectile.life -= dt
      if (projectile.life <= 0) arrived.push(projectile)
      return projectile.life > 0 && Boolean(target)
    })
    for (const projectile of arrived) {
      const target = enemies.value.find(enemy => enemy.id === projectile.targetId)
      if (!target) continue
      target.hp -= projectile.damage
      if (projectile.slow) target.slowUntil = elapsed + 1.4
      const position = positionFor(target)
      impacts.value.push({ id: nextImpactId++, kind: projectile.kind, position, life: .42 })
    }
    impacts.value = impacts.value.filter((impact) => { impact.life -= dt; return impact.life > 0 })
    spawnCooldown -= dt
    if (pendingEnemies.value > 0 && spawnCooldown <= 0) { spawnEnemy(); spawnCooldown = Math.max(0.55, 1.4 - wave.value * 0.025) }

    for (const enemy of enemies.value) {
      const slowed = enemy.slowUntil > elapsed
      enemy.progress += enemy.speed * dt * (slowed ? 0.52 : 1)
    }

    const escaped = enemies.value.filter(enemy => enemy.progress >= DEFENSE_PATH.length - 1)
    if (escaped.length) castleHealth.value = Math.max(0, castleHealth.value - escaped.length)
    enemies.value = enemies.value.filter(enemy => enemy.progress < DEFENSE_PATH.length - 1)

    for (const tower of towers.value) {
      tower.cooldown -= dt
      if (tower.cooldown > 0) continue
      const definition = TOWER_DEFINITIONS[tower.kind]
      const effectiveRange = tower.kind === 'frost' ? definition.range : definition.range + (tower.level - 1) * 0.2
      const target = [...enemies.value].sort((a, b) => b.progress - a.progress).find((enemy) => {
        const position = positionFor(enemy)
        return Math.hypot(position.x - tower.x, position.y - tower.y) <= effectiveRange
      })
      if (!target) continue
      const targetPosition = positionFor(target)
      tower.aimAngle = Math.atan2(targetPosition.y - tower.y, targetPosition.x - tower.x) * 180 / Math.PI
      tower.firingUntil = elapsed + .22
      tower.shotSequence++
      if (tower.kind === 'frost') {
        const frostRadius = 1
        const damage = definition.damage * (1 + (tower.level - 1) * 0.55)
        for (const enemy of enemies.value) {
          const position = positionFor(enemy)
          if (Math.hypot(position.x - tower.x, position.y - tower.y) > frostRadius) continue
          enemy.hp -= damage
          enemy.slowUntil = elapsed + 1.4
        }
        impacts.value.push({ id: nextImpactId++, kind: 'frost', position: { x: tower.x, y: tower.y }, life: .62, radius: frostRadius })
        tower.cooldown = definition.fireRate / (1 + (tower.level - 1) * 0.18)
        continue
      }
      const shotDuration = 0.34
      projectiles.value.push({ id: nextProjectileId++, kind: tower.kind, from: { x: tower.x, y: tower.y }, to: targetPosition, life: shotDuration, duration: shotDuration / speedMultiplier.value, targetId: target.id, damage: definition.damage * (1 + (tower.level - 1) * 0.55), slow: definition.slow })
      tower.cooldown = definition.fireRate / (1 + (tower.level - 1) * 0.18)
    }

    const defeated = enemies.value.filter(enemy => enemy.hp <= 0)
    for (const enemy of defeated) { credits.value += enemy.reward; score.value += enemy.reward * 10 }
    enemies.value = enemies.value.filter(enemy => enemy.hp > 0)

    if (castleHealth.value <= 0) {
      phase.value = 'gameover'
      bestWave.value = Math.max(bestWave.value, wave.value)
      localStorage.setItem(STORAGE_KEY, String(bestWave.value))
      message.value = 'Lâu đài đã thất thủ. Hãy tập hợp quân đội và thử lại.'
    } else if (pendingEnemies.value === 0 && enemies.value.length === 0) {
      phase.value = 'between'
      credits.value += 45 + wave.value * 8
      message.value = `Đã đẩy lùi đợt ${wave.value}. Hãy củng cố phòng tuyến.`
    }
  }

  function resetGame() {
    credits.value = 260; castleHealth.value = 20; wave.value = 0; score.value = 0
    phase.value = 'ready'; towers.value = []; enemies.value = []; projectiles.value = []; impacts.value = []; pendingEnemies.value = 0
    selectedTowerId.value = null; nextTowerId = 1; nextEnemyId = 1; nextProjectileId = 1; nextImpactId = 1; elapsed = 0
    message.value = 'Vương quốc đang chờ lệnh. Hãy xây dựng tuyến phòng thủ.'
  }

  onMounted(() => {
    bestWave.value = Number(localStorage.getItem(STORAGE_KEY) ?? 0)
    timer = setInterval(tick, 100)
  })
  onBeforeUnmount(() => { if (timer) clearInterval(timer) })

  function isTowerFiring(tower: Tower) { return tower.firingUntil > elapsed }

  return { credits, castleHealth, wave, score, bestWave, phase, speedMultiplier, selectedKind, selectedTowerId, selectedTower, towers, enemies, projectiles, impacts, pendingEnemies, message, canStartWave, upgradeCost, isPath, towerAt, positionFor, isTowerFiring, selectCell, upgradeSelected, sellSelected, startWave, resetGame }
}
