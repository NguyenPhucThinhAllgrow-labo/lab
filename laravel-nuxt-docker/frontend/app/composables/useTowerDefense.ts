import type {
  BossClass,
  Enemy,
  GamePhase,
  GridPoint,
  Impact,
  Projectile,
  Tower,
  TowerKind,
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
  MAX_TOWER_LEVEL,
  MAX_SIMULATION_STEPS_PER_TICK,
  MAX_TICK_BACKLOG_SECONDS,
  PREVIEW_ALL_BOSSES_ON_FIRST_WAVE,
  STARTING_CREDITS,
  TOWER_DEFINITIONS,
  TOWER_DEFENSE_STORAGE_KEY,
  TOWER_RANGE_LEVEL_BONUS,
  UPGRADE_COST_MULTIPLIERS,
  WATER_SLOW_DURATION_SECONDS,
  WAVE_BASE_REWARD,
  WAVE_REWARD_GROWTH,
} from "~/games/tower-defense/gameplay-config";
import { DEFAULT_TOWER_DEFENSE_MAP_ID, getTowerDefenseMap, mapPathPosition } from "~/games/tower-defense/maps";
import {
  damageEnemy,
  enemyEffectDuration,
} from "~/games/tower-defense/enemy-combat";

export { FROST_EFFECT_RADIUS, FROST_SLOW_DURATION_SECONDS, MAX_TOWER_LEVEL, TOWER_DEFINITIONS, TOWER_RANGE_LEVEL_BONUS, WATER_SLOW_DURATION_SECONDS } from "~/games/tower-defense/gameplay-config";

/** Cung cấp state, command và simulation loop độc lập với lớp render Three.js. */
export function useTowerDefense(mapId = DEFAULT_TOWER_DEFENSE_MAP_ID) {
  const map = getTowerDefenseMap(mapId);
  const storageKey = `${TOWER_DEFENSE_STORAGE_KEY}:${map.id}`;
  const castleGateProgress = (lane: 0 | 1) =>
    map.paths[lane].length - 1 + map.castle.pathEndOffset;
  // ===== State công khai cho page và scene ==================================
  const credits = ref(STARTING_CREDITS);
  const castleHealth = ref(20);
  const wave = ref(0);
  const score = ref(0);
  const bestWave = ref(0);
  const phase = ref<GamePhase>("ready");
  const isPaused = ref(false);
  const speedMultiplier = ref<1 | 2 | 4>(1);
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
  let nextProjectileId = 1;
  let nextImpactId = 1;
  const pendingEnemiesByLane: [number, number] = [0, 0];
  const spawnCooldownByLane: [number, number] = [0, 0];
  let pendingBosses: Array<{
    lane: 0 | 1;
    kind: "boss";
    bossClass: BossClass;
  }> = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;
  let lastTickAt = 0;

  // ===== Selection và quản lý vòng đời tháp ================================
  const pathKeys = new Set(
    map.pathTiles.map((point) => `${point.x}:${point.y}`),
  );
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
  const upgradeCost = computed(() => {
    const tower = selectedTower.value;
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return 0;
    const multiplier = UPGRADE_COST_MULTIPLIERS[tower.level as 1 | 2];
    return (
      Math.round((TOWER_DEFINITIONS[tower.kind].cost * multiplier) / 5) * 5
    );
  });

  /** Kiểm tra ô có thuộc một trong hai lane và vì vậy bị cấm xây tower hay không. */
  function isPath(x: number, y: number) {
    return pathKeys.has(`${x}:${y}`);
  }
  /** Tìm tower tại một ô grid, dùng cho cả selection và chống đặt chồng. */
  function towerAt(x: number, y: number) {
    return towers.value.find((tower) => tower.x === x && tower.y === y);
  }

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
      message.value = canStartWave.value
        ? `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Nhấn Di chuyển nếu muốn đổi vị trí.`
        : `Đã chọn ${TOWER_DEFINITIONS[existing.kind].name}. Chỉ có thể di chuyển khi round kết thúc.`;
      return;
    }

    const towerToMove = selectedTower.value;
    if (towerToMove) {
      if (!canStartWave.value || !towerToMove.canRelocate) {
        message.value = canStartWave.value
          ? "Hãy nhấn nút Di chuyển trước khi chọn ô mới."
          : "Chỉ có thể di chuyển tháp trong thời gian chuẩn bị.";
        return;
      }
      if (phase.value === "gameover") return;
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

    if (isPath(x, y) || phase.value === "gameover") return;
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
      tower.level >= MAX_TOWER_LEVEL ||
      credits.value < upgradeCost.value
    )
      return;
    credits.value -= upgradeCost.value;
    tower.invested += upgradeCost.value;
    tower.level++;
    triggerRef(towers);
    message.value = `Đã nâng ${TOWER_DEFINITIONS[tower.kind].name} lên cấp ${tower.level}.`;
  }

  /** Mở khóa một lần chọn ô đích mới, chỉ cho phép giữa các wave. */
  function enableSelectedRelocation() {
    const tower = selectedTower.value;
    if (!tower || !canStartWave.value) return;
    tower.canRelocate = true;
    triggerRef(towers);
    message.value = `Chọn một ô trống để di chuyển ${TOWER_DEFINITIONS[tower.kind].name}.`;
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
   * Khóa thao tác di chuyển, phân phối quân cho hai lane và lên lịch một boss
   * class ngẫu nhiên ở mỗi wave chia hết cho 5.
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
    pendingBosses =
      PREVIEW_ALL_BOSSES_ON_FIRST_WAVE && wave.value === 1
        ? BOSS_CLASSES.map((bossClass, index) => ({
            lane: (index % 2) as 0 | 1,
            kind: "boss" as const,
            bossClass,
          }))
        : wave.value % 5 === 0
          ? [
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
    const enemyHp = boss ? maxHp * BOSS_HEALTH_MULTIPLIER : maxHp;
    const baseReward = 6 + Math.floor(wave.value * 0.55);
    enemies.value.push({
      id,
      kind: boss?.kind ?? "normal",
      combatProfileKey: boss
        ? (map.bossCombatProfileKey ?? "normal")
        : "normal",
      bossClass: boss?.bossClass,
      lane,
      progress: ENEMY_SPAWN_PROGRESS,
      hp: enemyHp,
      maxHp: enemyHp,
      speed: (0.72 + Math.min(wave.value * 0.025, 0.35)) * (boss ? 0.5 : 1),
      reward: baseReward * (boss ? BOSS_REWARD_MULTIPLIER : 1),
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
          total + (enemy.kind === "boss" ? BOSS_CASTLE_DAMAGE : 1),
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
      const effectiveRange =
        tower.kind === "frost"
          ? definition.range
          : definition.range + (tower.level - 1) * TOWER_RANGE_LEVEL_BONUS;
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
        const levelMultiplier = 1 + (tower.level - 1) * 0.42;
        chainTargets.forEach((enemy, index) => {
          damageEnemy(
            enemy,
            "thunder",
            definition.damage * levelMultiplier * Math.pow(0.72, index) * dt,
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
        tower.cooldown = definition.fireRate / (1 + (tower.level - 1) * 0.18);
        continue;
      }
      const shotDuration =
        tower.kind === "fire" ? 0.55 : tower.kind === "water" ? 0.28 : 0.34;
      const levelMultiplier = 1 + (tower.level - 1) * 0.55;
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
          damage: definition.damage * levelMultiplier,
          level: tower.level,
          slow: definition.slow,
          slowDuration: definition.slowDuration,
          burnDuration: definition.burnDuration,
          burnDamagePerSecond: definition.burnDamagePerSecond
            ? definition.burnDamagePerSecond * levelMultiplier
            : undefined,
          splashRadius: definition.splashRadius,
          splashDamageRatio: definition.splashDamageRatio,
        });
      }
      tower.cooldown = definition.fireRate / (1 + (tower.level - 1) * 0.18);
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
      phase.value = "between";
      nextWaveCountdown.value = BETWEEN_WAVE_DELAY_SECONDS;
      projectiles.value = [];
      impacts.value = [];
      credits.value += WAVE_BASE_REWARD + wave.value * WAVE_REWARD_GROWTH;
      message.value = `Đã đẩy lùi đợt ${wave.value}. Đợt tiếp theo sẽ tự bắt đầu sau ${BETWEEN_WAVE_DELAY_SECONDS} giây.`;
    }

    triggerRef(towers);
    triggerRef(enemies);
    triggerRef(projectiles);
    triggerRef(impacts);
  }

  // Đồng hồ thực được chia thành bước nhỏ để gameplay ổn định khi đổi tốc độ.
  // Backlog bị giới hạn để một timer trễ không khóa main thread vì chạy bù dài.
  /** Đổi thời gian thực thành các bước simulation tối đa 100 ms có giới hạn. */
  function tick() {
    const now = Date.now();
    const realDelta = lastTickAt ? Math.max(0, (now - lastTickAt) / 1000) : 0;
    lastTickAt = now;
    if (isPaused.value || document.hidden) return;

    // Chỉ bù một cửa sổ ngắn. Phần thời gian tab bị ẩn hoặc main thread bị treo
    // lâu được bỏ qua để tránh vòng lặp hàng nghìn bước khi quay lại game.
    let remainingRealTime = Math.min(realDelta, MAX_TICK_BACKLOG_SECONDS);
    let simulationSteps = 0;
    while (remainingRealTime > 0 && simulationSteps < MAX_SIMULATION_STEPS_PER_TICK) {
      simulationSteps++;
      if (phase.value === "between") {
        const consumed = Math.min(remainingRealTime, nextWaveCountdown.value);
        nextWaveCountdown.value = Math.max(
          0,
          nextWaveCountdown.value - consumed,
        );
        remainingRealTime -= consumed;
        if (nextWaveCountdown.value === 0) startWave();
        continue;
      }
      if (phase.value !== "wave") break;

      const realStep = Math.min(0.1 / speedMultiplier.value, remainingRealTime);
      step(realStep * speedMultiplier.value);
      remainingRealTime -= realStep;
    }
  }

  // ===== Lifecycle và điều khiển phiên chơi ================================
  /** Khôi phục toàn bộ state phiên chơi nhưng giữ bestWave đã lưu ở localStorage. */
  function resetGame() {
    credits.value = STARTING_CREDITS;
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
    message.value = "Vương quốc đang chờ lệnh. Hãy xây dựng tuyến phòng thủ.";
  }

  // Khởi động simulation timer ở client; khi visibility đổi chỉ reset đồng hồ,
  // không chạy bù khoảng thời gian tab nằm ở nền.
  onMounted(() => {
    bestWave.value = Number(localStorage.getItem(storageKey) ?? 0);
    lastTickAt = Date.now();
    timer = setInterval(tick, 100);
    document.addEventListener("visibilitychange", resetTickClock);
  });
  // Luôn dọn timer/listener để không còn simulation chạy sau khi rời route.
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", resetTickClock);
  });

  /** Bỏ backlog của tab nền; game tiếp tục từ thời điểm người chơi quay lại. */
  function resetTickClock() {
    lastTickAt = Date.now();
  }

  /** Cho renderer biết tower còn nằm trong cửa sổ animation khai hỏa hay không. */
  function isTowerFiring(tower: Tower) {
    return tower.firingUntil > elapsed;
  }
  /** Đặt trạng thái pause và reset mốc thời gian để không chạy bù lúc resume. */
  function setPaused(paused: boolean) {
    if (phase.value === "ready" || phase.value === "gameover") return;
    if (isPaused.value === paused) return;
    isPaused.value = paused;
    lastTickAt = Date.now();
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
    towers,
    enemies,
    projectiles,
    impacts,
    pendingEnemies,
    nextWaveCountdown,
    message,
    canStartWave,
    canUndoSelectedPlacement,
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
    setPaused,
    togglePause,
  };
}
