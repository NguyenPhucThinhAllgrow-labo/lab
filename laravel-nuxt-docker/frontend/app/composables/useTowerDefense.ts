import type {
  BossClass,
  Enemy,
  GamePhase,
  GridPoint,
  Impact,
  Projectile,
  Tower,
  TowerKind,
  TowerDefenseMapDefinition,
  TowerDefenseGameSnapshot,
} from "~/types/games/towerDefense";
import {
  BETWEEN_WAVE_DELAY_SECONDS,
  BOSS_CASTLE_DAMAGE,
  BOSS_CLASSES,
  BOSS_HEALTH_MULTIPLIER,
  BOSS_REWARD_MULTIPLIER,
  ENEMY_HIT_RADIUS,
  ENEMY_SPAWN_PROGRESS,
  FROST_EFFECT_RADIUS,
  FROST_SLOW_DURATION_SECONDS,
  MAX_SIMULATION_STEPS_PER_TICK,
  PREVIEW_ALL_BOSSES_ON_FIRST_WAVE,
  STARTING_CREDITS,
  TOWER_DEFINITIONS,
  TOWER_DEFENSE_STORAGE_KEY,
  WATER_SLOW_DURATION_SECONDS,
  WAVE_BASE_REWARD,
  WAVE_REWARD_GROWTH,
  canTowerReceiveSupportBuff,
  isSupportTowerKind,
  towerFireInterval,
  towerEffectValue,
  towerDamageAtLevel,
  towerMaxLevel,
  towerRangeAtLevel,
  towerUpgradeCost,
  towerSupportBonus,
} from "~/games/tower-defense/gameplay-config";
import { mapPathPosition } from "~/games/tower-defense/map-path";
import {
  damageEnemy,
  enemyEffectDuration,
} from "~/games/tower-defense/enemy-combat";

export { FROST_EFFECT_RADIUS, FROST_SLOW_DURATION_SECONDS, MAX_TOWER_LEVEL, TOWER_DEFINITIONS, TOWER_RANGE_LEVEL_BONUS, WATER_SLOW_DURATION_SECONDS, canTowerReceiveSupportBuff, isSupportTowerKind, towerDamageAtLevel, towerEffectValue, towerFireInterval, towerMaxLevel, towerRangeAtLevel, towerSupportBonus } from "~/games/tower-defense/gameplay-config";

/** Cung cấp state, command và simulation loop độc lập với lớp render Three.js. */
export function useTowerDefense(map: TowerDefenseMapDefinition) {
  const storageKey = `${TOWER_DEFENSE_STORAGE_KEY}:${map.id}`;
  const startingCredits = Number.isFinite(map.startingCredits)
    ? Math.max(0, Math.floor(map.startingCredits))
    : STARTING_CREDITS;
  const completionWave = Number.isFinite(map.completionWave)
    ? Math.max(1, Math.floor(map.completionWave ?? 20))
    : 20;
  const castleGateProgress = (lane: 0 | 1) => {
    const path = map.paths[lane];
    const pathEnd = path.at(-1)!;
    const castle = map.castle.position;
    const travelOffset = castle && castle.x === pathEnd.x && castle.y === pathEnd.y
      ? 0
      : map.castle.pathEndOffset;
    return path.length - 1 + travelOffset;
  };
  // ===== State công khai cho page và scene ==================================
  const credits = ref(startingCredits);
  const castleHealth = ref(20);
  const wave = ref(0);
  const score = ref(0);
  const bestWave = ref(0);
  const phase = ref<GamePhase>("ready");
  const isPaused = ref(false);
  const speedMultiplier = ref<0.5 | 1 | 2 | 4>(1);
  const selectedKind = ref<TowerKind | null>(null);
  const selectedTowerId = ref<number | null>(null);
  // Các object game được cập nhật liên tục. shallowRef tránh Vue tạo proxy sâu cho
  // hàng trăm object mà Three.js vẫn đọc lại ở mỗi frame.
  const towers = shallowRef<Tower[]>([]);
  const enemies = shallowRef<Enemy[]>([]);
  const projectiles = shallowRef<Projectile[]>([]);
  const impacts = shallowRef<Impact[]>([]);
  const undoableTowerIds = ref<number[]>([]);
  const pendingEnemies = ref(0);
  const nextWaveCountdown = ref(0);
  const message = ref("Chọn tháp và đặt vào vùng trống để bắt đầu phòng thủ.");
  let nextTowerId = 1;
  let nextEnemyId = 1;
  let nextManagedEnemyIndex = 0;
  let nextManagedBossIndex = 0;
  let nextProjectileId = 1;
  let nextImpactId = 1;
  const pendingEnemiesByLane: [number, number] = [0, 0];
  const spawnCooldownByLane: [number, number] = [0, 0];
  let pendingBosses: Array<{
    lane: 0 | 1;
    kind: "boss";
    bossClass: BossClass;
    definitionId?: string;
  }> = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;
  let lastTickAt = 0;
  let pendingRealTime = 0;

  // ===== Selection và quản lý vòng đời tháp ================================
  const pathKeys = new Set(
    map.pathTiles.map((point) => `${point.x}:${point.y}`),
  );
  for (const point of map.spawnPoints ?? [])
    pathKeys.add(`${point.x}:${point.y}`);
  if (map.castle.position)
    pathKeys.add(`${map.castle.position.x}:${map.castle.position.y}`);
  const selectedTower = computed(
    () =>
      towers.value.find((tower) => tower.id === selectedTowerId.value) ?? null,
  );
  const canStartWave = computed(
    () => phase.value === "ready" || phase.value === "between",
  );
  const canUndoSelectedPlacement = computed(
    () =>
      canStartWave.value &&
      selectedTower.value !== null &&
      undoableTowerIds.value.includes(selectedTower.value.id),
  );
  const canRelocateSelectedTower = computed(
    () =>
      canStartWave.value &&
      selectedTower.value !== null &&
      undoableTowerIds.value.includes(selectedTower.value.id),
  );
  const upgradeCost = computed(() => {
    const tower = selectedTower.value;
    if (!tower || tower.level >= towerMaxLevel(tower.kind)) return 0;
    return towerUpgradeCost(tower.kind, tower.level + 1);
  });

  /** Kiểm tra ô có thuộc một trong hai lane và vì vậy bị cấm xây tower hay không. */
  function isPath(x: number, y: number) {
    return pathKeys.has(`${x}:${y}`);
  }
  /** Tìm tower tại một ô grid, dùng cho cả selection và chống đặt chồng. */
  function towerAt(x: number, y: number) {
    return towers.value.find((tower) => tower.x === x && tower.y === y);
  }

  /** Buff cùng loại không cộng dồn; tower nhận mức mạnh nhất đang phủ lên nó. */
  function supportBonusFor(tower: Tower, supportKind: "speed" | "damage") {
    if (!canTowerReceiveSupportBuff(tower.kind, supportKind)) return 0;

    return towers.value.reduce((strongest, support) => {
      if (support.id === tower.id) return strongest;
      const supportDefinition = TOWER_DEFINITIONS[support.kind];
      const effectType = supportKind === "speed" ? "attack_speed_aura" : "damage_aura";
      const effect = supportDefinition.effects?.find((item) => item.behavior === effectType);
      if (!effect && support.kind !== supportKind) return strongest;
      const range = towerRangeAtLevel(supportDefinition, support.level);
      if (Math.hypot(support.x - tower.x, support.y - tower.y) > range)
        return strongest;
      return Math.max(
        strongest,
        effect ? towerEffectValue(effect, support.level) : towerSupportBonus(support.level),
      );
    }, 0);
  }

  /** Các buff hỗ trợ thực tế mà tower đang chọn nhận tại vị trí hiện tại. */
  const selectedTowerSupportBonuses = computed(() => {
    const tower = selectedTower.value;
    if (!tower || isSupportTowerKind(tower.kind)) {
      return { damage: 0, speed: 0 };
    }
    return {
      damage: supportBonusFor(tower, "damage"),
      speed: supportBonusFor(tower, "speed"),
    };
  });

  /**
   * Xử lý click grid theo thứ tự ưu tiên: chọn tower có sẵn, đặt lại tower đang
   * di chuyển, rồi mới xây tower mới sau khi kiểm tra path, phase và số vàng.
   */
  function selectCell(x: number, y: number) {
    const existing = towerAt(x, y);
    if (existing) {
      existing.canRelocate = false;
      triggerRef(towers);
      selectedKind.value = null;

      if (selectedTowerId.value === existing.id) {
        selectedTowerId.value = null;
        message.value = `Đã hủy chọn ${TOWER_DEFINITIONS[existing.kind].name}.`;
        return;
      }

      selectedTowerId.value = existing.id;
      message.value = !canStartWave.value
        ? `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Không thể di chuyển khi round đang diễn ra.`
        : undoableTowerIds.value.includes(existing.id)
          ? `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Nhấn Di chuyển nếu muốn đổi vị trí.`
          : `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Vị trí đã khóa từ round trước.`;
      return;
    }

    const towerToMove = selectedTower.value;
    if (towerToMove) {
      if (!canRelocateSelectedTower.value || !towerToMove.canRelocate) {
        message.value = !canStartWave.value
          ? "Không thể di chuyển tháp khi round đang diễn ra."
          : !undoableTowerIds.value.includes(towerToMove.id)
            ? "Tháp từ round trước đã bị khóa vị trí."
            : "Hãy nhấn nút Di chuyển trước khi chọn ô mới.";
        return;
      }
      if (phase.value === "gameover" || phase.value === "completed") return;
      if (isPath(x, y)) {
        message.value =
          "Không thể đặt tháp trên đường di chuyển của quân địch.";
        return;
      }

      towerToMove.x = x;
      towerToMove.y = y;
      towerToMove.canRelocate = false;
      triggerRef(towers);
      message.value = `Đã di chuyển ${TOWER_DEFINITIONS[towerToMove.kind].name}.`;
      return;
    }

    if (isPath(x, y) || phase.value === "gameover" || phase.value === "completed") return;
    if (!selectedKind.value) {
      message.value = "Hãy chọn một công trình trước khi đặt tháp.";
      return;
    }
    const definition = TOWER_DEFINITIONS[selectedKind.value];
    if (towers.value.length >= map.maxTowerCount) {
      message.value = `Đã đạt giới hạn ${map.maxTowerCount} tháp. Hãy bán một tháp trước khi xây mới.`;
      return;
    }
    if (credits.value < definition.cost) {
      message.value = `Cần ${definition.cost} vàng để xây ${definition.name}.`;
      return;
    }
    credits.value -= definition.cost;
    const tower: Tower = {
      id: nextTowerId++,
      kind: definition.kind,
      x,
      y,
      level: 1,
      cooldown: 0,
      invested: definition.cost,
      firingUntil: 0,
      aimAngle: 0,
      shotSequence: 0,
      beamTargetIds: [],
      canRelocate: false,
    };
    towers.value.push(tower);
    if (canStartWave.value) undoableTowerIds.value.push(tower.id);
    selectedKind.value = null;
    selectedTowerId.value = null;
    triggerRef(towers);
    message.value = canStartWave.value
      ? `${definition.name} đã được xây dựng. Chọn tháp và nhấn Di chuyển nếu muốn đổi vị trí.`
      : `${definition.name} đã được xây dựng và khóa vị trí vì round đang diễn ra.`;
  }

  /** Trừ vàng, tăng level/invested và phát tín hiệu shallowRef cho tower đã chọn. */
  function upgradeSelected() {
    const tower = selectedTower.value;
    if (
      !tower ||
      tower.level >= towerMaxLevel(tower.kind) ||
      credits.value < upgradeCost.value
    )
      return;
    credits.value -= upgradeCost.value;
    tower.invested += upgradeCost.value;
    tower.level++;
    triggerRef(towers);
    message.value = `Đã nâng ${TOWER_DEFINITIONS[tower.kind].name} lên cấp ${tower.level}.`;
  }

  /** Chỉ tower vừa đặt trong giai đoạn chuẩn bị hiện tại mới được đổi vị trí. */
  function enableSelectedRelocation() {
    const tower = selectedTower.value;
    if (!tower || !canRelocateSelectedTower.value) {
      message.value = canStartWave.value
        ? "Tháp từ round trước đã bị khóa vị trí."
        : "Không thể di chuyển tháp khi round đang diễn ra.";
      return false;
    }
    tower.canRelocate = true;
    triggerRef(towers);
    message.value = `Chọn một ô trống để di chuyển ${TOWER_DEFINITIONS[tower.kind].name}.`;
    return true;
  }

  /** Bán tower và hoàn 70% tổng vốn đầu tư, đồng thời dọn selection/undo state. */
  function sellSelected() {
    const tower = selectedTower.value;
    if (!tower) return;
    credits.value += Math.floor(tower.invested * 0.7);
    towers.value = towers.value.filter((item) => item.id !== tower.id);
    undoableTowerIds.value = undoableTowerIds.value.filter(
      (id) => id !== tower.id,
    );
    selectedTowerId.value = null;
    message.value = "Đã bán tháp và hoàn lại 70% số vàng.";
  }

  /** Hoàn tác tower vừa đặt trong phase chuẩn bị và hoàn lại toàn bộ invested. */
  function undoSelectedPlacement() {
    const tower = selectedTower.value;
    if (!tower || !canUndoSelectedPlacement.value) return;
    credits.value += tower.invested;
    towers.value = towers.value.filter((item) => item.id !== tower.id);
    undoableTowerIds.value = undoableTowerIds.value.filter(
      (id) => id !== tower.id,
    );
    selectedTowerId.value = null;
    message.value = `Đã hoàn tác ${TOWER_DEFINITIONS[tower.kind].name} và hoàn lại ${tower.invested} vàng.`;
  }

  // ===== Wave, spawn và boss ===============================================
  /**
   * Khóa thao tác di chuyển, phân phối quân cho hai lane và lên lịch toàn bộ
   * boss được admin chọn ở mỗi wave chia hết cho 5.
   */
  function startWave() {
    if (!canStartWave.value) return;
    undoableTowerIds.value = [];
    nextWaveCountdown.value = 0;
    isPaused.value = false;
    for (const tower of towers.value) tower.canRelocate = false;
    triggerRef(towers);
    wave.value++;
    const waveEnemyCount = 8 + wave.value * 3;
    pendingEnemiesByLane[0] = Math.ceil(waveEnemyCount / 2);
    pendingEnemiesByLane[1] = Math.floor(waveEnemyCount / 2);
    const managedBosses = map.bossDefinitions?.length
      ? map.bossDefinitions
      : map.bossDefinition
        ? [map.bossDefinition]
        : [];
    pendingBosses =
      PREVIEW_ALL_BOSSES_ON_FIRST_WAVE && wave.value === 1
        ? BOSS_CLASSES.map((bossClass, index) => ({
            lane: (index % 2) as 0 | 1,
            kind: "boss" as const,
            bossClass,
          }))
        : wave.value % 5 === 0
          ? managedBosses.length
            ? managedBosses.map((definition, index) => ({
                lane: (index % 2) as 0 | 1,
                kind: "boss" as const,
                bossClass: BOSS_CLASSES[index % BOSS_CLASSES.length]!,
                definitionId: definition.id,
              }))
            : [
              {
                lane: Math.random() < 0.5 ? 0 : 1,
                kind: "boss",
                bossClass:
                  BOSS_CLASSES[
                    Math.floor(Math.random() * BOSS_CLASSES.length)
                  ]!,
              },
            ]
          : [];
    pendingEnemies.value =
      pendingEnemiesByLane[0] + pendingEnemiesByLane[1] + pendingBosses.length;
    // Hai cổng sở hữu lịch spawn riêng; cổng dưới lệch nhịp ban đầu để hai luồng
    // không vô tình hoạt động như một hàng đợi chung được chia xen kẽ.
    spawnCooldownByLane[0] = 0;
    spawnCooldownByLane[1] = 0.28;
    phase.value = "wave";
    message.value = `Đợt ${wave.value}: quân địch đang tiến vào vương quốc.`;
  }

  /** Tạo enemy kế tiếp của lane, ưu tiên boss đã lên lịch và áp multiplier riêng. */
  function spawnEnemy(lane: 0 | 1) {
    const bossIndex = pendingBosses.findIndex((boss) => boss.lane === lane);
    const boss = bossIndex >= 0 ? pendingBosses[bossIndex]! : null;
    if (!boss && pendingEnemiesByLane[lane] <= 0) return;
    const maxHp =
      60 + wave.value * 18 + Math.floor(wave.value * wave.value * 1.15);
    const id = nextEnemyId++;
    const managedRoster = boss ? map.bossDefinitions : map.enemyDefinitions;
    const managedDefinition = boss?.definitionId
      ? (map.bossDefinitions?.find(
          (definition) => definition.id === boss.definitionId,
        ) ??
        (map.bossDefinition?.id === boss.definitionId
          ? map.bossDefinition
          : undefined))
      : managedRoster?.length
        ? managedRoster[
            boss
              ? nextManagedBossIndex++ % managedRoster.length
              : nextManagedEnemyIndex++ % managedRoster.length
          ]
      : boss
        ? map.bossDefinition
        : map.enemyDefinition;
    const managedWaveScale =
      1 + Math.max(0, wave.value - 1) * 0.18 + Math.max(0, wave.value - 1) ** 2 * 0.0115;
    const enemyHp = managedDefinition
      ? Math.round(managedDefinition.baseHealth * managedWaveScale)
      : boss
        ? maxHp * BOSS_HEALTH_MULTIPLIER
        : maxHp;
    const baseReward = 6 + Math.floor(wave.value * 0.55);
    const spawnPoint = map.spawnPoints?.[lane];
    const pathStart = map.paths[lane][0]!;
    const spawnProgress = spawnPoint
      ? spawnPoint.x === pathStart.x && spawnPoint.y === pathStart.y
        ? 0
        : -1
      : ENEMY_SPAWN_PROGRESS;
    enemies.value.push({
      id,
      kind: boss?.kind ?? "normal",
      combatProfileKey: boss
        ? managedDefinition?.id === "lava-overlord"
          ? "lava-boss"
          : (map.bossCombatProfileKey ?? "normal")
        : "normal",
      combatProfile: managedDefinition?.combatProfile,
      definitionId: managedDefinition?.id,
      modelKey: managedDefinition?.id,
      bossClass: managedDefinition ? undefined : boss?.bossClass,
      lane,
      progress: spawnProgress,
      hp: enemyHp,
      maxHp: enemyHp,
      speed: managedDefinition
        ? managedDefinition.baseSpeed *
          (1 + Math.min(Math.max(0, wave.value - 1) * 0.02, 0.3))
        : (0.72 + Math.min(wave.value * 0.025, 0.35)) * (boss ? 0.5 : 1),
      reward: managedDefinition
        ? Math.round(managedDefinition.reward * (1 + Math.max(0, wave.value - 1) * 0.05))
        : baseReward * (boss ? BOSS_REWARD_MULTIPLIER : 1),
      castleDamage:
        managedDefinition?.castleDamage ??
        (boss ? BOSS_CASTLE_DAMAGE : 1),
      slowUntil: 0,
      slowAmount: 0,
      isSlowed: false,
      frozenUntil: 0,
      isFrozen: false,
      burnRemaining: 0,
      burnDamagePerSecond: 0,
    });
    if (boss) pendingBosses.splice(bossIndex, 1);
    else pendingEnemiesByLane[lane]--;
    pendingEnemies.value--;
  }

  /** Lấy tọa độ grid nội suy hiện tại của enemy từ progress và lane. */
  function positionFor(enemy: Enemy) {
    return mapPathPosition(map, enemy.progress, enemy.lane);
  }

  // ===== Simulation chiến đấu ==============================================
  // Một bước mô phỏng xử lý đạn đến đích, hiệu ứng trạng thái, di chuyển quái,
  // chọn mục tiêu, tháp khai hỏa và điều kiện kết thúc wave/game.
  /** Tiến simulation theo dt giây game-time đã bao gồm speedMultiplier. */
  function step(dt: number) {
    if (phase.value !== "wave") return;
    elapsed += dt;
    const enemyById = new Map(enemies.value.map((enemy) => [enemy.id, enemy]));
    const arrived: Projectile[] = [];
    projectiles.value = projectiles.value.filter((projectile) => {
      const target = enemyById.get(projectile.targetId);
      if (target) projectile.to = positionFor(target);
      projectile.life -= dt;
      if (projectile.life <= 0) arrived.push(projectile);
      return projectile.life > 0 && Boolean(target);
    });
    for (const projectile of arrived) {
      const target = enemyById.get(projectile.targetId);
      if (!target) continue;
      const position = positionFor(target);
      const affectedEnemies = projectile.splashRadius
        ? enemies.value.filter((enemy) => {
            const enemyPosition = positionFor(enemy);
            return (
              Math.hypot(
                enemyPosition.x - position.x,
                enemyPosition.y - position.y,
              ) <=
              projectile.splashRadius! + ENEMY_HIT_RADIUS
            );
          })
        : [target];
      for (const affectedEnemy of affectedEnemies) {
        const affectedPosition = positionFor(affectedEnemy);
        const distanceFromCenter = Math.hypot(
          affectedPosition.x - position.x,
          affectedPosition.y - position.y,
        );
        const splashExtent = (projectile.splashRadius ?? 0) + ENEMY_HIT_RADIUS;
        const distanceRatio =
          splashExtent > 0 ? Math.min(1, distanceFromCenter / splashExtent) : 0;
        const edgeDamageRatio = projectile.splashDamageRatio ?? 1;
        const damageRatio = 1 - distanceRatio * (1 - edgeDamageRatio);
        damageEnemy(
          affectedEnemy,
          projectile.kind,
          projectile.damage * damageRatio,
        );
        if (projectile.slow) {
          const slowDuration = enemyEffectDuration(
            affectedEnemy,
            "slow",
            projectile.slowDuration ?? WATER_SLOW_DURATION_SECONDS,
          );
          if (slowDuration > 0) {
            affectedEnemy.slowUntil = elapsed + slowDuration;
            affectedEnemy.slowAmount = Math.max(
              affectedEnemy.slowAmount,
              projectile.slow,
            );
            affectedEnemy.isSlowed = true;
          }
        }
        if (projectile.burnDuration && projectile.burnDamagePerSecond) {
          const burnDuration = enemyEffectDuration(
            affectedEnemy,
            "burn",
            projectile.burnDuration,
          );
          if (burnDuration > 0) {
            affectedEnemy.burnRemaining = burnDuration;
            affectedEnemy.burnDamagePerSecond = Math.max(
              affectedEnemy.burnDamagePerSecond,
              projectile.burnDamagePerSecond,
            );
          }
        }
      }
      impacts.value.push({
        id: nextImpactId++,
        kind: projectile.kind,
        position,
        life:
          projectile.kind === "fire"
            ? 0.65
            : projectile.kind === "thunder"
              ? 0.52
              : projectile.kind === "water"
                ? 0.58
                : 0.42,
        radius: projectile.splashRadius,
        level: projectile.level,
      });
    }
    impacts.value = impacts.value.filter((impact) => {
      impact.life -= dt;
      return impact.life > 0;
    });
    const baseSpawnInterval = Math.max(0.45, 1.15 - wave.value * 0.025);
    for (const lane of [0, 1] as const) {
      spawnCooldownByLane[lane] -= dt;
      if (
        (pendingEnemiesByLane[lane] <= 0 &&
          !pendingBosses.some((boss) => boss.lane === lane)) ||
        spawnCooldownByLane[lane] > 0
      )
        continue;
      spawnEnemy(lane);
      spawnCooldownByLane[lane] =
        baseSpawnInterval * (lane === 0 ? 0.93 : 1.07);
    }

    for (const enemy of enemies.value) {
      if (enemy.burnRemaining > 0) {
        damageEnemy(enemy, "fire", enemy.burnDamagePerSecond * dt);
        enemy.burnRemaining = Math.max(0, enemy.burnRemaining - dt);
        if (enemy.burnRemaining === 0) enemy.burnDamagePerSecond = 0;
      }
      const frozen = enemy.frozenUntil > elapsed;
      const slowed = enemy.slowUntil > elapsed;
      enemy.isFrozen = frozen;
      enemy.isSlowed = slowed;
      if (!slowed) enemy.slowAmount = 0;
      enemy.progress +=
        enemy.speed * dt * (frozen ? 0 : slowed ? 1 - enemy.slowAmount : 1);
    }

    const escaped = enemies.value.filter(
      (enemy) =>
        enemy.hp > 0 &&
        enemy.progress >= castleGateProgress(enemy.lane),
    );
    if (escaped.length) {
      const castleDamage = escaped.reduce(
        (total, enemy) =>
          total + enemy.castleDamage,
        0,
      );
      castleHealth.value = Math.max(0, castleHealth.value - castleDamage);
      const escapedIds = new Set(escaped.map((enemy) => enemy.id));
      enemies.value = enemies.value.filter(
        (enemy) => !escapedIds.has(enemy.id),
      );
    }

    const enemyPositions = new Map<number, GridPoint>();
    for (const enemy of enemies.value)
      enemyPositions.set(enemy.id, positionFor(enemy));
    const targetsByProgress = [...enemies.value]
      .filter((enemy) => enemy.hp > 0 && enemy.progress >= 0)
      .sort((a, b) => b.progress - a.progress);

    for (const tower of towers.value) {
      const definition = TOWER_DEFINITIONS[tower.kind];
      if (isSupportTowerKind(tower.kind)) {
        tower.beamTargetIds = [];
        tower.cooldown = 0;
        continue;
      }
      const damageMultiplier = 1 + supportBonusFor(tower, "damage");
      const attackSpeedMultiplier = 1 + supportBonusFor(tower, "speed");
      const effectiveRange = towerRangeAtLevel(definition, tower.level);
      const target = targetsByProgress.find((enemy) => {
        if (enemy.hp <= 0) return false;
        const position = enemyPositions.get(enemy.id)!;
        const hitRadius = tower.kind === "frost" ? ENEMY_HIT_RADIUS : 0;
        return (
          Math.hypot(position.x - tower.x, position.y - tower.y) <=
          effectiveRange + hitRadius
        );
      });
      if (tower.kind === "thunder") {
        tower.beamTargetIds = [];
        if (!target) continue;
        const chainTargets: Enemy[] = [target];
        const maxTargets = 2 + tower.level;
        const chainRange = 1.65 + (tower.level - 1) * 0.12;
        while (chainTargets.length < maxTargets) {
          const previous = chainTargets[chainTargets.length - 1]!;
          const previousPosition = enemyPositions.get(previous.id)!;
          const next = targetsByProgress.find((enemy) => {
            if (
              enemy.hp <= 0 ||
              chainTargets.some((item) => item.id === enemy.id)
            )
              return false;
            const position = enemyPositions.get(enemy.id)!;
            return (
              Math.hypot(
                position.x - previousPosition.x,
                position.y - previousPosition.y,
              ) <= chainRange
            );
          });
          if (!next) break;
          chainTargets.push(next);
        }
        chainTargets.forEach((enemy, index) => {
          damageEnemy(
            enemy,
            "thunder",
            towerDamageAtLevel(definition, tower.level) *
              damageMultiplier *
              attackSpeedMultiplier *
              Math.pow(0.72, index) *
              dt,
          );
        });
        tower.beamTargetIds = chainTargets.map((enemy) => enemy.id);
        const targetPosition = enemyPositions.get(target.id)!;
        tower.aimAngle =
          (Math.atan2(targetPosition.y - tower.y, targetPosition.x - tower.x) *
            180) /
          Math.PI;
        tower.firingUntil = elapsed + dt * 2;
        continue;
      }
      tower.beamTargetIds = [];
      tower.cooldown -= dt;
      if (tower.cooldown > 0 || !target) continue;
      const targetPosition = positionFor(target);
      tower.aimAngle =
        (Math.atan2(targetPosition.y - tower.y, targetPosition.x - tower.x) *
          180) /
        Math.PI;
      tower.firingUntil = elapsed + 0.22;
      tower.shotSequence++;
      if (tower.kind === "frost") {
        const frostRadius = FROST_EFFECT_RADIUS;
        for (const enemy of enemies.value) {
          if (enemy.hp <= 0 || enemy.progress < 0) continue;
          const position = enemyPositions.get(enemy.id)!;
          // Tính cả thân quái khi chạm mép vùng, thay vì yêu cầu tâm quái phải
          // lọt tuyệt đối vào bán kính. Nhờ vậy tick 100 ms không bỏ sót sát thương.
          if (
            Math.hypot(position.x - tower.x, position.y - tower.y) >
            frostRadius + ENEMY_HIT_RADIUS
          )
            continue;
          const freezeDuration = enemyEffectDuration(
            enemy,
            "freeze",
            FROST_SLOW_DURATION_SECONDS,
          );
          if (freezeDuration > 0) {
            enemy.frozenUntil = elapsed + freezeDuration;
            enemy.isFrozen = true;
          }
        }
        impacts.value.push({
          id: nextImpactId++,
          kind: "frost",
          position: { x: tower.x, y: tower.y },
          life: 1.05,
          radius: frostRadius,
          level: tower.level,
        });
        tower.cooldown =
          towerFireInterval(tower.kind, tower.level) / attackSpeedMultiplier;
        continue;
      }
      const shotDuration =
        tower.kind === "fire" ? 0.55 : tower.kind === "water" ? 0.28 : 0.34;
      const levelMultiplier = 1 + (tower.level - 1) * 0.55;
      const bonusDamage = (definition.effects ?? [])
        .filter((effect) => effect.behavior === "bonus_damage")
        .reduce((total, effect) => total + towerEffectValue(effect, tower.level), 0);
      const slowEffect = definition.effects?.find((effect) => effect.behavior === "slow");
      const burnEffect = definition.effects?.find((effect) => effect.behavior === "damage_over_time");
      const splashEffect = definition.effects?.find((effect) => effect.behavior === "splash_damage");
      const shotTargets =
        tower.kind === "archer"
          ? targetsByProgress
              .filter((enemy) => {
                const position = enemyPositions.get(enemy.id)!;
                return (
                  Math.hypot(position.x - tower.x, position.y - tower.y) <=
                  effectiveRange
                );
              })
              .slice(0, 1 + (tower.level - 1) * 2)
          : [target];
      for (const shotTarget of shotTargets) {
        // Gameplay chỉ lưu ô xuất phát/đích. Scene 3D sẽ đổi chúng sang world
        // space rồi hiệu chỉnh điểm xuất phát theo đầu nòng hoặc glow của tháp.
        projectiles.value.push({
          id: nextProjectileId++,
          kind: tower.kind,
          from: { x: tower.x, y: tower.y },
          to: positionFor(shotTarget),
          life: shotDuration,
          duration: shotDuration / speedMultiplier.value,
          targetId: shotTarget.id,
          damage: (towerDamageAtLevel(definition, tower.level) + bonusDamage) * damageMultiplier,
          level: tower.level,
          slow: slowEffect ? towerEffectValue(slowEffect, tower.level) : definition.slow,
          slowDuration: slowEffect?.duration ?? definition.slowDuration,
          burnDuration: burnEffect?.duration ?? definition.burnDuration,
          burnDamagePerSecond: burnEffect
            ? towerEffectValue(burnEffect, tower.level) * damageMultiplier
            : definition.burnDamagePerSecond
              ? definition.burnDamagePerSecond * levelMultiplier * damageMultiplier
            : undefined,
          splashRadius: splashEffect?.radius ?? definition.splashRadius,
          splashDamageRatio: splashEffect?.ratio ?? definition.splashDamageRatio,
        });
      }
      tower.cooldown =
        towerFireInterval(tower.kind, tower.level) / attackSpeedMultiplier;
    }

    const defeated = enemies.value.filter((enemy) => enemy.hp <= 0);
    for (const enemy of defeated) {
      credits.value += enemy.reward;
      score.value += enemy.reward * 10;
    }
    enemies.value = enemies.value.filter((enemy) => enemy.hp > 0);

    if (castleHealth.value <= 0) {
      phase.value = "gameover";
      projectiles.value = [];
      impacts.value = [];
      bestWave.value = Math.max(bestWave.value, wave.value);
      localStorage.setItem(storageKey, String(bestWave.value));
      message.value = "Lâu đài đã thất thủ. Hãy tập hợp quân đội và thử lại.";
    } else if (pendingEnemies.value === 0 && enemies.value.length === 0) {
      projectiles.value = [];
      impacts.value = [];
      credits.value += WAVE_BASE_REWARD + wave.value * WAVE_REWARD_GROWTH;
      if (wave.value >= completionWave) {
        phase.value = "completed";
        nextWaveCountdown.value = 0;
        bestWave.value = Math.max(bestWave.value, wave.value);
        localStorage.setItem(storageKey, String(bestWave.value));
        message.value = `Đã hoàn thành đợt cuối ${completionWave}. Vương quốc đã được bảo vệ!`;
      } else {
        phase.value = "between";
        nextWaveCountdown.value = BETWEEN_WAVE_DELAY_SECONDS;
        message.value = `Đã đẩy lùi đợt ${wave.value}. Đợt tiếp theo sẽ tự bắt đầu sau ${BETWEEN_WAVE_DELAY_SECONDS} giây.`;
      }
    }

    triggerRef(towers);
    triggerRef(enemies);
    triggerRef(projectiles);
    triggerRef(impacts);
  }

  // Đồng hồ thực được chia thành bước nhỏ để gameplay ổn định khi đổi tốc độ.
  // Thời gian chưa xử lý được giữ lại, giúp game tiếp tục khi timer tab nền bị throttle.
  /** Đổi thời gian thực thành các bước simulation và giữ backlog cho tick kế tiếp. */
  function tick() {
    const now = Date.now();
    const realDelta = lastTickAt ? Math.max(0, (now - lastTickAt) / 1000) : 0;
    lastTickAt = now;
    if (isPaused.value) {
      pendingRealTime = 0;
      return;
    }
    if (phase.value !== "wave" && phase.value !== "between") {
      pendingRealTime = 0;
      return;
    }

    pendingRealTime += realDelta;
    let simulationSteps = 0;
    while (
      pendingRealTime > 0.000001 &&
      simulationSteps < MAX_SIMULATION_STEPS_PER_TICK
    ) {
      simulationSteps++;
      if (phase.value === "between") {
        const consumed = Math.min(pendingRealTime, nextWaveCountdown.value);
        nextWaveCountdown.value = Math.max(
          0,
          nextWaveCountdown.value - consumed,
        );
        pendingRealTime -= consumed;
        if (nextWaveCountdown.value === 0) startWave();
        continue;
      }
      if (phase.value !== "wave") break;

      const realStep = Math.min(
        0.1 / speedMultiplier.value,
        pendingRealTime,
      );
      step(realStep * speedMultiplier.value);
      pendingRealTime -= realStep;
    }
    if (phase.value !== "wave" && phase.value !== "between")
      pendingRealTime = 0;
  }

  // ===== Lifecycle và điều khiển phiên chơi ================================
  /** Tạo bản sao thuần JSON của toàn bộ state cần để tiếp tục đúng một phiên. */
  function createSnapshot(): TowerDefenseGameSnapshot {
    return JSON.parse(JSON.stringify({
      version: 1,
      mapId: map.id,
      phase: phase.value,
      credits: credits.value,
      castleHealth: castleHealth.value,
      wave: wave.value,
      score: score.value,
      bestWave: bestWave.value,
      speedMultiplier: speedMultiplier.value,
      selectedKind: selectedKind.value,
      selectedTowerId: selectedTowerId.value,
      towers: towers.value,
      enemies: enemies.value,
      projectiles: projectiles.value,
      impacts: impacts.value,
      pendingEnemies: pendingEnemies.value,
      nextWaveCountdown: nextWaveCountdown.value,
      undoableTowerIds: undoableTowerIds.value,
      pendingEnemiesByLane,
      spawnCooldownByLane,
      pendingBosses,
      nextTowerId,
      nextEnemyId,
      nextManagedEnemyIndex,
      nextManagedBossIndex,
      nextProjectileId,
      nextImpactId,
      elapsed,
    })) as TowerDefenseGameSnapshot;
  }

  /** Khôi phục snapshot từ backend; phiên đang đánh luôn trở lại ở trạng thái pause. */
  function restoreSnapshot(snapshot: TowerDefenseGameSnapshot): boolean {
    if (
      snapshot?.version !== 1 ||
      snapshot.mapId !== map.id ||
      !Array.isArray(snapshot.towers) ||
      !Array.isArray(snapshot.enemies)
    ) return false;

    const restored = JSON.parse(JSON.stringify(snapshot)) as TowerDefenseGameSnapshot;
    const finiteNumber = (value: unknown, fallback: number) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };
    credits.value = Math.max(0, finiteNumber(restored.credits, startingCredits));
    castleHealth.value = Math.max(0, finiteNumber(restored.castleHealth, 20));
    wave.value = Math.max(0, Math.floor(finiteNumber(restored.wave, 0)));
    score.value = Math.max(0, Math.floor(finiteNumber(restored.score, 0)));
    bestWave.value = Math.max(
      bestWave.value,
      wave.value,
      Math.floor(finiteNumber(restored.bestWave, 0)),
    );
    phase.value = restored.phase;
    speedMultiplier.value = [0.5, 1, 2, 4].includes(restored.speedMultiplier)
      ? restored.speedMultiplier
      : 1;
    selectedKind.value = restored.selectedKind ?? null;
    selectedTowerId.value = restored.towers.some((tower) => tower.id === restored.selectedTowerId)
      ? restored.selectedTowerId
      : null;
    towers.value = restored.towers;
    enemies.value = restored.enemies;
    projectiles.value = Array.isArray(restored.projectiles) ? restored.projectiles : [];
    impacts.value = Array.isArray(restored.impacts) ? restored.impacts : [];
    pendingEnemies.value = Math.max(0, Math.floor(Number(restored.pendingEnemies) || 0));
    nextWaveCountdown.value = Math.max(0, Number(restored.nextWaveCountdown) || 0);
    undoableTowerIds.value = Array.isArray(restored.undoableTowerIds)
      ? restored.undoableTowerIds
      : [];
    pendingEnemiesByLane[0] = Math.max(0, Math.floor(Number(restored.pendingEnemiesByLane?.[0]) || 0));
    pendingEnemiesByLane[1] = Math.max(0, Math.floor(Number(restored.pendingEnemiesByLane?.[1]) || 0));
    spawnCooldownByLane[0] = Math.max(0, Number(restored.spawnCooldownByLane?.[0]) || 0);
    spawnCooldownByLane[1] = Math.max(0, Number(restored.spawnCooldownByLane?.[1]) || 0);
    pendingBosses = Array.isArray(restored.pendingBosses) ? restored.pendingBosses : [];
    nextTowerId = Math.max(
      1,
      ...restored.towers.map((tower) => tower.id + 1),
      Math.floor(finiteNumber(restored.nextTowerId, 1)),
    );
    nextEnemyId = Math.max(
      1,
      ...restored.enemies.map((enemy) => enemy.id + 1),
      Math.floor(finiteNumber(restored.nextEnemyId, 1)),
    );
    nextManagedEnemyIndex = Math.max(0, Math.floor(finiteNumber(restored.nextManagedEnemyIndex, 0)));
    nextManagedBossIndex = Math.max(0, Math.floor(finiteNumber(restored.nextManagedBossIndex, 0)));
    nextProjectileId = Math.max(
      1,
      ...projectiles.value.map((projectile) => projectile.id + 1),
      Math.floor(finiteNumber(restored.nextProjectileId, 1)),
    );
    nextImpactId = Math.max(
      1,
      ...impacts.value.map((impact) => impact.id + 1),
      Math.floor(finiteNumber(restored.nextImpactId, 1)),
    );
    elapsed = Math.max(
      0,
      ...restored.towers.map((tower) => tower.firingUntil ?? 0),
      finiteNumber(restored.elapsed, 0),
    );
    isPaused.value = phase.value === "wave" || phase.value === "between";
    lastTickAt = Date.now();
    pendingRealTime = 0;
    message.value = isPaused.value
      ? `Đã khôi phục phiên ở đợt ${wave.value}. Nhấn Tiếp tục khi bạn sẵn sàng.`
      : "Đã khôi phục phiên chơi gần nhất.";
    return true;
  }

  /** Khôi phục toàn bộ state phiên chơi nhưng giữ bestWave đã lưu ở localStorage. */
  function resetGame() {
    credits.value = startingCredits;
    castleHealth.value = 20;
    wave.value = 0;
    score.value = 0;
    phase.value = "ready";
    isPaused.value = false;
    towers.value = [];
    enemies.value = [];
    projectiles.value = [];
    impacts.value = [];
    pendingEnemies.value = 0;
    nextWaveCountdown.value = 0;
    selectedKind.value = null;
    selectedTowerId.value = null;
    nextTowerId = 1;
    nextEnemyId = 1;
    nextManagedEnemyIndex = 0;
    nextManagedBossIndex = 0;
    nextProjectileId = 1;
    nextImpactId = 1;
    elapsed = 0;
    undoableTowerIds.value = [];
    pendingEnemiesByLane[0] = 0;
    pendingEnemiesByLane[1] = 0;
    spawnCooldownByLane[0] = 0;
    spawnCooldownByLane[1] = 0;
    pendingBosses = [];
    lastTickAt = Date.now();
    pendingRealTime = 0;
    message.value = "Vương quốc đang chờ lệnh. Hãy xây dựng tuyến phòng thủ.";
  }

  // Timer tab nền có thể bị trình duyệt giảm tần suất; tick dùng thời gian thực
  // nên gameplay vẫn tiến lên và xử lý phần backlog khi quay lại.
  onMounted(() => {
    bestWave.value = Number(localStorage.getItem(storageKey) ?? 0);
    lastTickAt = Date.now();
    timer = setInterval(tick, 100);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });
  // Luôn dọn timer/listener để không còn simulation chạy sau khi rời route.
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  /** Khi quay lại tab, xử lý ngay thời gian đã trôi qua thay vì chờ timer kế tiếp. */
  function handleVisibilityChange() {
    if (!document.hidden) tick();
  }

  /** Cho renderer biết tower còn nằm trong cửa sổ animation khai hỏa hay không. */
  function isTowerFiring(tower: Tower) {
    return tower.firingUntil > elapsed;
  }
  /** Đặt trạng thái pause và reset mốc thời gian để không chạy bù lúc resume. */
  function setPaused(paused: boolean) {
    if (phase.value === "gameover" || phase.value === "completed") return;
    if (isPaused.value === paused) return;
    isPaused.value = paused;
    lastTickAt = Date.now();
    pendingRealTime = 0;
    message.value = isPaused.value
      ? "Trận đấu đã tạm dừng."
      : "Trận đấu tiếp tục.";
  }

  function togglePause() {
    setPaused(!isPaused.value);
  }

  return {
    map,
    credits,
    castleHealth,
    wave,
    score,
    bestWave,
    phase,
    isPaused,
    speedMultiplier,
    selectedKind,
    selectedTowerId,
    selectedTower,
    selectedTowerSupportBonuses,
    towers,
    enemies,
    projectiles,
    impacts,
    pendingEnemies,
    nextWaveCountdown,
    message,
    canStartWave,
    canUndoSelectedPlacement,
    canRelocateSelectedTower,
    upgradeCost,
    isPath,
    towerAt,
    positionFor,
    isTowerFiring,
    selectCell,
    upgradeSelected,
    enableSelectedRelocation,
    sellSelected,
    undoSelectedPlacement,
    startWave,
    resetGame,
    createSnapshot,
    restoreSnapshot,
    setPaused,
    togglePause,
  };
}
