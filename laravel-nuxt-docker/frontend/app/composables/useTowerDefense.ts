import type { Enemy, GamePhase, GridPoint, Impact, Projectile, Tower, TowerDefinition, TowerKind } from '~/types/games/towerDefense'

const STORAGE_KEY = 'game-lab:kingdom-defense:best-wave'
export const FROST_EFFECT_RADIUS = 2.1
export const DEFENSE_GRID_COLUMNS = 18
export const DEFENSE_GRID_ROWS = 14
export const TOWER_RANGE_LEVEL_BONUS = 0.28
const ENEMY_HIT_RADIUS = 0.28
const ENEMY_SPAWN_PROGRESS = -0.85
const BETWEEN_WAVE_DELAY_SECONDS = 30

export const TOWER_DEFINITIONS: Record<TowerKind, TowerDefinition> = {
  archer: { kind: 'archer', name: 'Tháp cung', description: 'Tầm xa, sát thương ổn định.', cost: 80, damage: 18, range: 3.15, fireRate: 0.75, color: '#65a30d' },
  cannon: { kind: 'cannon', name: 'Tháp pháo', description: 'Uy lực lớn, nhịp bắn chậm.', cost: 110, damage: 34, range: 2.8, fireRate: 1.25, color: '#d97706' },
  frost: { kind: 'frost', name: 'Tháp băng', description: 'Đóng băng vùng bán kính 2,1 ô.', cost: 95, damage: 6, range: FROST_EFFECT_RADIUS, fireRate: 1.1, slow: 0.48, color: '#0891b2' },
  fire: { kind: 'fire', name: 'Tháp lửa', description: 'Cầu lửa nổ lan và thiêu đốt trong 5 giây.', cost: 105, damage: 10, range: 2.65, fireRate: 0.9, burnDuration: 5, burnDamagePerSecond: 5.6, splashRadius: 1.25, splashDamageRatio: 0.6, color: '#dc2626' },
}

export const DEFENSE_PATH: GridPoint[] = [
  { x: 0, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 }, { x: 5, y: 11 },
  { x: 5, y: 10 }, { x: 5, y: 9 }, { x: 5, y: 8 }, { x: 5, y: 7 },
  { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }, { x: 10, y: 7 },
  { x: 10, y: 6 }, { x: 10, y: 5 }, { x: 10, y: 4 }, { x: 10, y: 3 },
  { x: 11, y: 3 }, { x: 12, y: 3 }, { x: 13, y: 3 }, { x: 14, y: 3 }, { x: 15, y: 3 }, { x: 16, y: 3 }, { x: 17, y: 3 },
]
// Stop at the front of the gate. The enemy model has a visible body radius, so
// letting its centre travel farther makes its face clip through the castle wall.
const CASTLE_GATE_PROGRESS = DEFENSE_PATH.length - 1.7

const defensePathTileKeys = new Set<string>()
for (let index = 0; index < DEFENSE_PATH.length - 1; index++) {
  const from = DEFENSE_PATH[index]!
  const to = DEFENSE_PATH[index + 1]!
  const isHorizontal = from.y === to.y
  for (const point of [from, to]) {
    const tiles = isHorizontal
      ? [point, { x: point.x, y: point.y + 1 }]
      : [point, { x: point.x + 1, y: point.y }]
    for (const tile of tiles) defensePathTileKeys.add(`${tile.x}:${tile.y}`)
  }
}
for (let index = 1; index < DEFENSE_PATH.length - 1; index++) {
  const previous = DEFENSE_PATH[index - 1]!
  const corner = DEFENSE_PATH[index]!
  const next = DEFENSE_PATH[index + 1]!
  const changesDirection = (previous.x === corner.x) !== (corner.x === next.x)
  if (changesDirection) defensePathTileKeys.add(`${corner.x + 1}:${corner.y + 1}`)
}
export const DEFENSE_PATH_TILES: GridPoint[] = [...defensePathTileKeys].map((key) => {
  const [x, y] = key.split(':').map(Number)
  return { x: x!, y: y! }
})

function laneOffsetAt(pathIndex: number, lane: 0 | 1): GridPoint {
  if (lane === 0) return { x: 0, y: 0 }
  const point = DEFENSE_PATH[pathIndex]!
  const previous = DEFENSE_PATH[Math.max(0, pathIndex - 1)]!
  const next = DEFENSE_PATH[Math.min(DEFENSE_PATH.length - 1, pathIndex + 1)]!
  const incoming = previous.y === point.y ? { x: 0, y: 1 } : { x: 1, y: 0 }
  const outgoing = point.y === next.y ? { x: 0, y: 1 } : { x: 1, y: 0 }
  return { x: (incoming.x + outgoing.x) / 2, y: (incoming.y + outgoing.y) / 2 }
}

export function defensePathPosition(progress: number, lane: 0 | 1 = 0): GridPoint {
  const index = progress < 0 ? 0 : Math.min(Math.floor(progress), DEFENSE_PATH.length - 2)
  const ratio = progress < 0 ? progress : progress - index
  const from = DEFENSE_PATH[index]!
  const to = DEFENSE_PATH[index + 1]!
  const fromOffset = laneOffsetAt(index, lane)
  const toOffset = laneOffsetAt(index + 1, lane)
  const linearPosition = {
    x: from.x + fromOffset.x + (to.x + toOffset.x - from.x - fromOffset.x) * ratio,
    y: from.y + fromOffset.y + (to.y + toOffset.y - from.y - fromOffset.y) * ratio,
  }

  if (progress < 0) return linearPosition
  const cornerRadius = .32
  for (let cornerIndex = 1; cornerIndex < DEFENSE_PATH.length - 1; cornerIndex++) {
    if (Math.abs(progress - cornerIndex) > cornerRadius) continue
    const previous = DEFENSE_PATH[cornerIndex - 1]!
    const corner = DEFENSE_PATH[cornerIndex]!
    const next = DEFENSE_PATH[cornerIndex + 1]!
    if ((previous.x === corner.x) === (corner.x === next.x)) continue

    const previousOffset = laneOffsetAt(cornerIndex - 1, lane)
    const cornerOffset = laneOffsetAt(cornerIndex, lane)
    const nextOffset = laneOffsetAt(cornerIndex + 1, lane)
    const previousPoint = { x: previous.x + previousOffset.x, y: previous.y + previousOffset.y }
    const cornerPoint = { x: corner.x + cornerOffset.x, y: corner.y + cornerOffset.y }
    const nextPoint = { x: next.x + nextOffset.x, y: next.y + nextOffset.y }
    const start = {
      x: cornerPoint.x + (previousPoint.x - cornerPoint.x) * cornerRadius,
      y: cornerPoint.y + (previousPoint.y - cornerPoint.y) * cornerRadius,
    }
    const end = {
      x: cornerPoint.x + (nextPoint.x - cornerPoint.x) * cornerRadius,
      y: cornerPoint.y + (nextPoint.y - cornerPoint.y) * cornerRadius,
    }
    const turnProgress = (progress - (cornerIndex - cornerRadius)) / (cornerRadius * 2)
    const inverse = 1 - turnProgress
    return {
      x: inverse * inverse * start.x + 2 * inverse * turnProgress * cornerPoint.x + turnProgress * turnProgress * end.x,
      y: inverse * inverse * start.y + 2 * inverse * turnProgress * cornerPoint.y + turnProgress * turnProgress * end.y,
    }
  }

  return linearPosition
}

export function useTowerDefense() {
  const credits = ref(260)
  const castleHealth = ref(20)
  const wave = ref(0)
  const score = ref(0)
  const bestWave = ref(0)
  const phase = ref<GamePhase>('ready')
  const speedMultiplier = ref<1 | 2>(1)
  const selectedKind = ref<TowerKind | null>(null)
  const selectedTowerId = ref<number | null>(null)
  // Các object game được cập nhật liên tục. shallowRef tránh Vue tạo proxy sâu cho
  // hàng trăm object mà Three.js vẫn đọc lại ở mỗi frame.
  const towers = shallowRef<Tower[]>([])
  const enemies = shallowRef<Enemy[]>([])
  const projectiles = shallowRef<Projectile[]>([])
  const impacts = shallowRef<Impact[]>([])
  const pendingEnemies = ref(0)
  const nextWaveCountdown = ref(0)
  const message = ref('Chọn tháp và đặt vào vùng trống để bắt đầu phòng thủ.')
  let nextTowerId = 1
  let nextEnemyId = 1
  let nextProjectileId = 1
  let nextImpactId = 1
  let spawnCooldown = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let elapsed = 0
  let lastTickAt = 0

  const pathKeys = new Set(DEFENSE_PATH_TILES.map(point => `${point.x}:${point.y}`))
  const selectedTower = computed(() => towers.value.find(tower => tower.id === selectedTowerId.value) ?? null)
  const canStartWave = computed(() => phase.value === 'ready' || phase.value === 'between')
  const upgradeCost = computed(() => selectedTower.value ? 55 + selectedTower.value.level * 35 : 0)

  function isPath(x: number, y: number) { return pathKeys.has(`${x}:${y}`) }
  function towerAt(x: number, y: number) { return towers.value.find(tower => tower.x === x && tower.y === y) }

  function selectCell(x: number, y: number) {
    const existing = towerAt(x, y)
    if (existing) {
      existing.canRelocate = false
      triggerRef(towers)
      selectedKind.value = null
      selectedTowerId.value = existing.id
      message.value = canStartWave.value
        ? `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Nhấn Di chuyển nếu muốn đổi vị trí.`
        : `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Chỉ có thể di chuyển khi round kết thúc.`
      return
    }

    const towerToMove = selectedTower.value
    if (towerToMove) {
      if (!canStartWave.value || !towerToMove.canRelocate) {
        message.value = canStartWave.value ? 'Hãy nhấn nút Di chuyển trước khi chọn ô mới.' : 'Chỉ có thể di chuyển tháp trong thời gian chuẩn bị.'
        return
      }
      if (phase.value === 'gameover') return
      if (isPath(x, y)) {
        message.value = 'Không thể đặt tháp trên đường di chuyển của quân địch.'
        return
      }

      towerToMove.x = x
      towerToMove.y = y
      towerToMove.canRelocate = false
      triggerRef(towers)
      message.value = `Đã di chuyển ${TOWER_DEFINITIONS[towerToMove.kind].name}.`
      return
    }

    if (isPath(x, y) || phase.value === 'gameover') return
    if (!selectedKind.value) {
      message.value = 'Hãy chọn một công trình trước khi đặt tháp.'
      return
    }
    const definition = TOWER_DEFINITIONS[selectedKind.value]
    if (credits.value < definition.cost) { message.value = `Cần ${definition.cost} vàng để xây ${definition.name}.`; return }
    credits.value -= definition.cost
    const tower: Tower = { id: nextTowerId++, kind: definition.kind, x, y, level: 1, cooldown: 0, invested: definition.cost, firingUntil: 0, aimAngle: 0, shotSequence: 0, canRelocate: false }
    towers.value.push(tower)
    selectedKind.value = null
    selectedTowerId.value = null
    triggerRef(towers)
    message.value = canStartWave.value
      ? `${definition.name} đã được xây dựng. Chọn tháp và nhấn Di chuyển nếu muốn đổi vị trí.`
      : `${definition.name} đã được xây dựng và khóa vị trí vì round đang diễn ra.`
  }

  function upgradeSelected() {
    const tower = selectedTower.value
    if (!tower || tower.level >= 3 || credits.value < upgradeCost.value) return
    credits.value -= upgradeCost.value
    tower.invested += upgradeCost.value
    tower.level++
    triggerRef(towers)
    message.value = `Đã nâng ${TOWER_DEFINITIONS[tower.kind].name} lên cấp ${tower.level}.`
  }

  function enableSelectedRelocation() {
    const tower = selectedTower.value
    if (!tower || !canStartWave.value) return
    tower.canRelocate = true
    triggerRef(towers)
    message.value = `Chọn một ô trống để di chuyển ${TOWER_DEFINITIONS[tower.kind].name}.`
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
    nextWaveCountdown.value = 0
    for (const tower of towers.value) tower.canRelocate = false
    triggerRef(towers)
    wave.value++
    pendingEnemies.value = 10 + wave.value * 5
    spawnCooldown = 0
    phase.value = 'wave'
    message.value = `Đợt ${wave.value}: quân địch đang tiến vào vương quốc.`
  }

  function spawnEnemy() {
    const maxHp = 65 + wave.value * 32 + Math.floor(wave.value * wave.value * 1.1)
    const id = nextEnemyId++
    const lane: 0 | 1 = Math.random() < 0.5 ? 0 : 1
    enemies.value.push({ id, lane, progress: ENEMY_SPAWN_PROGRESS, hp: maxHp, maxHp, speed: 0.72 + Math.min(wave.value * 0.025, 0.35), reward: 7 + wave.value, slowUntil: 0, isSlowed: false, burnRemaining: 0, burnDamagePerSecond: 0 })
    pendingEnemies.value--
  }

  function positionFor(enemy: Enemy) {
    return defensePathPosition(enemy.progress, enemy.lane)
  }

  function step(dt: number) {
    if (phase.value !== 'wave') return
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
      const position = positionFor(target)
      const affectedEnemies = projectile.splashRadius
        ? enemies.value.filter((enemy) => {
            const enemyPosition = positionFor(enemy)
            return Math.hypot(enemyPosition.x - position.x, enemyPosition.y - position.y) <= projectile.splashRadius! + ENEMY_HIT_RADIUS
          })
        : [target]
      for (const affectedEnemy of affectedEnemies) {
        const affectedPosition = positionFor(affectedEnemy)
        const distanceFromCenter = Math.hypot(affectedPosition.x - position.x, affectedPosition.y - position.y)
        const splashExtent = (projectile.splashRadius ?? 0) + ENEMY_HIT_RADIUS
        const distanceRatio = splashExtent > 0 ? Math.min(1, distanceFromCenter / splashExtent) : 0
        const edgeDamageRatio = projectile.splashDamageRatio ?? 1
        const damageRatio = 1 - distanceRatio * (1 - edgeDamageRatio)
        affectedEnemy.hp -= projectile.damage * damageRatio
        if (projectile.slow) { affectedEnemy.slowUntil = elapsed + 1.4; affectedEnemy.isSlowed = true }
        if (projectile.burnDuration && projectile.burnDamagePerSecond) {
          affectedEnemy.burnRemaining = projectile.burnDuration
          affectedEnemy.burnDamagePerSecond = Math.max(affectedEnemy.burnDamagePerSecond, projectile.burnDamagePerSecond)
        }
      }
      impacts.value.push({ id: nextImpactId++, kind: projectile.kind, position, life: projectile.kind === 'fire' ? .65 : .42, radius: projectile.splashRadius })
    }
    impacts.value = impacts.value.filter((impact) => { impact.life -= dt; return impact.life > 0 })
    spawnCooldown -= dt
    if (pendingEnemies.value > 0 && spawnCooldown <= 0) { spawnEnemy(); spawnCooldown = Math.max(0.45, 1.15 - wave.value * 0.025) }

    for (const enemy of enemies.value) {
      if (enemy.burnRemaining > 0) {
        enemy.hp -= enemy.burnDamagePerSecond * dt
        enemy.burnRemaining = Math.max(0, enemy.burnRemaining - dt)
        if (enemy.burnRemaining === 0) enemy.burnDamagePerSecond = 0
      }
      const slowed = enemy.slowUntil > elapsed
      enemy.isSlowed = slowed
      enemy.progress += enemy.speed * dt * (slowed ? 0.52 : 1)
    }

    const escaped = enemies.value.filter(enemy => enemy.progress >= CASTLE_GATE_PROGRESS)
    if (escaped.length) castleHealth.value = Math.max(0, castleHealth.value - escaped.length)
    enemies.value = enemies.value.filter(enemy => enemy.progress < CASTLE_GATE_PROGRESS)

    const enemyPositions = new Map<number, GridPoint>()
    for (const enemy of enemies.value) enemyPositions.set(enemy.id, positionFor(enemy))
    const targetsByProgress = [...enemies.value].filter(enemy => enemy.hp > 0 && enemy.progress >= 0).sort((a, b) => b.progress - a.progress)

    for (const tower of towers.value) {
      tower.cooldown -= dt
      if (tower.cooldown > 0) continue
      const definition = TOWER_DEFINITIONS[tower.kind]
      const effectiveRange = tower.kind === 'frost' ? definition.range : definition.range + (tower.level - 1) * TOWER_RANGE_LEVEL_BONUS
      const target = targetsByProgress.find((enemy) => {
        if (enemy.hp <= 0) return false
        const position = enemyPositions.get(enemy.id)!
        const hitRadius = tower.kind === 'frost' ? ENEMY_HIT_RADIUS : 0
        return Math.hypot(position.x - tower.x, position.y - tower.y) <= effectiveRange + hitRadius
      })
      if (!target) continue
      const targetPosition = positionFor(target)
      tower.aimAngle = Math.atan2(targetPosition.y - tower.y, targetPosition.x - tower.x) * 180 / Math.PI
      tower.firingUntil = elapsed + .22
      tower.shotSequence++
      if (tower.kind === 'frost') {
        const frostRadius = FROST_EFFECT_RADIUS
        const damage = definition.damage * (1 + (tower.level - 1) * 0.55)
        for (const enemy of enemies.value) {
          if (enemy.hp <= 0 || enemy.progress < 0) continue
          const position = enemyPositions.get(enemy.id)!
          // Tính cả thân quái khi chạm mép vùng, thay vì yêu cầu tâm quái phải
          // lọt tuyệt đối vào bán kính. Nhờ vậy tick 100 ms không bỏ sót sát thương.
          if (Math.hypot(position.x - tower.x, position.y - tower.y) > frostRadius + ENEMY_HIT_RADIUS) continue
          enemy.hp -= damage
          enemy.slowUntil = elapsed + 1.4
          enemy.isSlowed = true
        }
        impacts.value.push({ id: nextImpactId++, kind: 'frost', position: { x: tower.x, y: tower.y }, life: 1.05, radius: frostRadius })
        tower.cooldown = definition.fireRate / (1 + (tower.level - 1) * 0.18)
        continue
      }
      const shotDuration = tower.kind === 'fire' ? 0.55 : 0.34
      const levelMultiplier = 1 + (tower.level - 1) * 0.55
      projectiles.value.push({
        id: nextProjectileId++,
        kind: tower.kind,
        from: { x: tower.x, y: tower.y },
        to: targetPosition,
        life: shotDuration,
        duration: shotDuration / speedMultiplier.value,
        targetId: target.id,
        damage: definition.damage * levelMultiplier,
        slow: definition.slow,
        burnDuration: definition.burnDuration,
        burnDamagePerSecond: definition.burnDamagePerSecond ? definition.burnDamagePerSecond * levelMultiplier : undefined,
        splashRadius: definition.splashRadius,
        splashDamageRatio: definition.splashDamageRatio,
      })
      tower.cooldown = definition.fireRate / (1 + (tower.level - 1) * 0.18)
    }

    const defeated = enemies.value.filter(enemy => enemy.hp <= 0)
    for (const enemy of defeated) { credits.value += enemy.reward; score.value += enemy.reward * 10 }
    enemies.value = enemies.value.filter(enemy => enemy.hp > 0)

    if (castleHealth.value <= 0) {
      phase.value = 'gameover'
      projectiles.value = []
      impacts.value = []
      bestWave.value = Math.max(bestWave.value, wave.value)
      localStorage.setItem(STORAGE_KEY, String(bestWave.value))
      message.value = 'Lâu đài đã thất thủ. Hãy tập hợp quân đội và thử lại.'
    } else if (pendingEnemies.value === 0 && enemies.value.length === 0) {
      phase.value = 'between'
      nextWaveCountdown.value = BETWEEN_WAVE_DELAY_SECONDS
      projectiles.value = []
      impacts.value = []
      credits.value += 45 + wave.value * 8
      message.value = `Đã đẩy lùi đợt ${wave.value}. Đợt tiếp theo sẽ tự bắt đầu sau ${BETWEEN_WAVE_DELAY_SECONDS} giây.`
    }

    triggerRef(towers)
    triggerRef(enemies)
    triggerRef(projectiles)
    triggerRef(impacts)
  }

  function tick() {
    const now = Date.now()
    const realDelta = lastTickAt ? Math.max(0, (now - lastTickAt) / 1000) : 0
    lastTickAt = now

    // Trình duyệt có thể giảm tần suất timer ở tab nền. Chạy bù theo các bước nhỏ
    // giúp mô phỏng vẫn đúng mà quái và đạn không nhảy xuyên mục tiêu. Thời gian
    // dư tiếp tục đi qua giai đoạn chuẩn bị và các round kế tiếp.
    let remainingRealTime = realDelta
    while (remainingRealTime > 0) {
      if (phase.value === 'between') {
        const consumed = Math.min(remainingRealTime, nextWaveCountdown.value)
        nextWaveCountdown.value = Math.max(0, nextWaveCountdown.value - consumed)
        remainingRealTime -= consumed
        if (nextWaveCountdown.value === 0) startWave()
        continue
      }
      if (phase.value !== 'wave') break

      const realStep = Math.min(0.1 / speedMultiplier.value, remainingRealTime)
      step(realStep * speedMultiplier.value)
      remainingRealTime -= realStep
    }
  }

  function resetGame() {
    credits.value = 260; castleHealth.value = 20; wave.value = 0; score.value = 0
    phase.value = 'ready'; towers.value = []; enemies.value = []; projectiles.value = []; impacts.value = []; pendingEnemies.value = 0; nextWaveCountdown.value = 0
    selectedKind.value = null; selectedTowerId.value = null; nextTowerId = 1; nextEnemyId = 1; nextProjectileId = 1; nextImpactId = 1; elapsed = 0; spawnCooldown = 0; lastTickAt = Date.now()
    message.value = 'Vương quốc đang chờ lệnh. Hãy xây dựng tuyến phòng thủ.'
  }

  onMounted(() => {
    bestWave.value = Number(localStorage.getItem(STORAGE_KEY) ?? 0)
    lastTickAt = Date.now()
    timer = setInterval(tick, 100)
    document.addEventListener('visibilitychange', tick)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', tick)
  })

  function isTowerFiring(tower: Tower) { return tower.firingUntil > elapsed }

  return { credits, castleHealth, wave, score, bestWave, phase, speedMultiplier, selectedKind, selectedTowerId, selectedTower, towers, enemies, projectiles, impacts, pendingEnemies, nextWaveCountdown, message, canStartWave, upgradeCost, isPath, towerAt, positionFor, isTowerFiring, selectCell, upgradeSelected, enableSelectedRelocation, sellSelected, startWave, resetGame }
}
