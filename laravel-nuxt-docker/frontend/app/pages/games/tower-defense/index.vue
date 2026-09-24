<script setup lang="ts">
import {
  Bomb,
  Coins,
  Crosshair,
  Crown,
  Flame,
  Gauge,
  Grid2X2,
  HeartPulse,
  Info,
  Maximize2,
  Minimize2,
  Move,
  Pause,
  Play,
  RotateCcw,
  ArrowRight,
  Trophy,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Swords,
  Undo2,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
} from "lucide-vue-next";
import {
  FROST_SLOW_DURATION_SECONDS,
  MAX_TOWER_LEVEL,
  TOWER_DEFINITIONS,
  TOWER_RANGE_LEVEL_BONUS,
  WATER_SLOW_DURATION_SECONDS,
  isSupportTowerKind,
  towerFireInterval,
  towerSupportBonus,
  useTowerDefense,
} from "~/composables/useTowerDefense";
import type { TowerFaction } from "~/components/tower-defense/scene/tower-models";
import type { TowerDefenseGameSnapshot, TowerKind } from "~/types/games/towerDefense";

useHead({
  title: "Kingdom Defense — Game Lab",
  meta: [
    {
      name: "description",
      content:
        "Xây dựng phòng tuyến và bảo vệ lâu đài trong game Tower Defense chiến thuật.",
    },
  ],
});

const route = useRoute();
const api = useApi();
const requestedMapId = typeof route.query.map === "string" ? route.query.map : undefined;
const availableMaps = ref(await fetchTowerDefenseMaps());
const requestedMap =
  availableMaps.value.find((item) => item.id === requestedMapId && item.isUnlocked !== false) ??
  availableMaps.value.find((item) => item.isUnlocked !== false);

if (!requestedMap)
  throw createError({ statusCode: 503, statusMessage: "Không có cấu hình map Tower Defense." });

// Composable giữ toàn bộ state và luật chơi; page chỉ điều phối HUD và thao tác UI.
const {
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
} = useTowerDefense(requestedMap);
const {
  soundEnabled,
  startBackgroundMusic,
  syncTowerShots,
  toggleSound,
} = useTowerDefenseAudio(map.backgroundMusicUrl);

/** Chỉ số chiến đấu đã bao gồm buff để popup phản ánh đúng sức mạnh hiện tại. */
const selectedTowerEffectiveDamage = computed(() => {
  const tower = selectedTower.value;
  if (!tower || isSupportTowerKind(tower.kind)) return 0;
  const baseDamage =
    TOWER_DEFINITIONS[tower.kind].damage *
    (1 + (tower.level - 1) * (tower.kind === "thunder" ? 0.42 : 0.55));
  const speedMultiplier =
    tower.kind === "thunder" ? 1 + selectedTowerSupportBonuses.value.speed : 1;
  return Math.round(
    baseDamage *
      (1 + selectedTowerSupportBonuses.value.damage) *
      speedMultiplier,
  );
});

const selectedTowerEffectiveFireInterval = computed(() => {
  const tower = selectedTower.value;
  if (!tower || isSupportTowerKind(tower.kind) || tower.kind === "thunder")
    return 0;
  return (
    towerFireInterval(tower.kind, tower.level) /
    (1 + selectedTowerSupportBonuses.value.speed)
  );
});

/** Đổi map bằng URL để khởi tạo lại sạch toàn bộ simulation và WebGL resources. */
function selectMap(event: Event) {
  const target = event.target as HTMLSelectElement;
  const selectedMap = availableMaps.value.find((item) => item.id === target.value);
  if (!selectedMap || selectedMap.isUnlocked === false) {
    target.value = map.id;
    message.value = "Map này chưa mở khóa. Hãy hoàn thành đợt 20 của map trước đó.";
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("map", target.value);
  window.location.assign(url);
}

function playNextMap() {
  const target = nextMap.value;
  if (!target || target.isUnlocked === false) return;
  const url = new URL(window.location.href);
  url.searchParams.set("map", target.id);
  window.location.assign(url);
}

function replayMap() {
  completionReported.value = false;
  completionSaving.value = false;
  completionSaveError.value = "";
  sessionFinalized.value = false;
  resetGame();
  void saveGameSession();
}

// Dữ liệu trình bày của bảng chọn tháp.
const towerKinds = Object.keys(TOWER_DEFINITIONS) as TowerKind[];
const completionWave = computed(() => map.completionWave ?? 20);
const phaseLabel = computed(() =>
  isPaused.value
    ? "Đã tạm dừng"
    : phase.value === "wave" && wave.value === completionWave.value
      ? "Đợt cuối"
      : {
        ready: "Sẵn sàng",
        wave: "Đang giao chiến",
        between: "Chuẩn bị đợt mới",
        completed: "Đã hoàn thành",
        gameover: "Lâu đài thất thủ",
      }[phase.value],
);
const enemiesRemaining = computed(
  () => enemies.value.length + pendingEnemies.value,
);

interface EnemyIntelCard {
  id: string;
  name: string;
  avatar: string;
  summary: string;
  health: string;
  resistance: string;
  weakness: string;
  primaryColor: string;
  glowColor: string;
}

const dismissedEnemyIntelIds = ref<EnemyIntelCard["id"][]>([]);
const enemyIntelWave = computed(() =>
  phase.value === "ready" || phase.value === "between"
    ? wave.value + 1
    : wave.value,
);
const enemyIntelCards = computed<EnemyIntelCard[]>(() => {
  if (enemyIntelWave.value <= 0 || phase.value === "gameover" || phase.value === "completed") return [];
  const legacyNormalHp =
    60 +
    enemyIntelWave.value * 18 +
    Math.floor(enemyIntelWave.value * enemyIntelWave.value * 1.15);
  const managedWaveScale =
    1 + Math.max(0, enemyIntelWave.value - 1) * 0.18 +
    Math.max(0, enemyIntelWave.value - 1) ** 2 * 0.0115;
  const normalDefinitions = map.enemyDefinitions?.length
    ? map.enemyDefinitions
    : map.enemyDefinition
      ? [map.enemyDefinition]
      : [];
  const cards: EnemyIntelCard[] = normalDefinitions.length
    ? normalDefinitions.map((definition) => ({
        id: `normal:${definition.id}`,
        name: definition.intel?.name ?? definition.name ?? definition.id,
        avatar: definition.intel?.avatarUrl ?? "",
        summary: definition.intel?.summary ?? "",
        health: `${Math.round(definition.baseHealth * managedWaveScale)} HP`,
        resistance: definition.intel?.resistance ?? "Không",
        weakness: definition.intel?.weakness ?? "Không",
        primaryColor: definition.intel?.primaryColor ?? "#8b5cf6",
        glowColor: definition.intel?.glowColor ?? "#7c3aed",
      }))
    : [
        {
          id: "normal",
          name: map.enemyIntel?.name ?? "Hắc binh",
          avatar: map.enemyIntel?.avatarUrl ?? "/api/tower-defense/assets/images/games/tower-defense/military/dark/normal.png",
          summary: map.enemyIntel?.summary ?? "Lính tiền tuyến cân bằng, không có kháng hay điểm yếu đặc biệt.",
          health: `${legacyNormalHp} HP`,
          resistance: map.enemyIntel?.resistance ?? "Không",
          weakness: map.enemyIntel?.weakness ?? "Không",
          primaryColor: map.enemyIntel?.primaryColor ?? "#8b5cf6",
          glowColor: map.enemyIntel?.glowColor ?? "#7c3aed",
        },
      ];
  if (enemyIntelWave.value % 5 === 0) {
    const bossDefinitions = map.bossDefinitions?.length
      ? map.bossDefinitions
      : map.bossDefinition
        ? [map.bossDefinition]
        : [];
    if (bossDefinitions.length)
      cards.push(
        ...bossDefinitions.map((definition) => ({
          id: `boss:${definition.id}`,
          name: definition.intel?.name ?? definition.name ?? definition.id,
          avatar: definition.intel?.avatarUrl ?? "",
          summary: definition.intel?.summary ?? "",
          health: `${Math.round(definition.baseHealth * managedWaveScale)} HP`,
          resistance: definition.intel?.resistance ?? "Không",
          weakness: definition.intel?.weakness ?? "Không",
          primaryColor: definition.intel?.primaryColor ?? "#f59e0b",
          glowColor: definition.intel?.glowColor ?? "#ef4444",
        })),
      );
    else {
      const isLavaBoss = map.bossCombatProfileKey === "lava-boss";
      cards.push({
        id: "boss",
        name: map.bossIntel?.name ?? (isLavaBoss ? "Chúa tể Dung nham" : "Thủ lĩnh Hắc quân"),
        avatar: map.bossIntel?.avatarUrl ?? "/api/tower-defense/assets/images/games/tower-defense/military/dark/lava/boss.png",
        summary: map.bossIntel?.summary ?? "Kẻ địch tinh nhuệ có lượng máu cao.",
        health: `${Math.round(legacyNormalHp * 5.5)} HP`,
        resistance: map.bossIntel?.resistance ?? "Không",
        weakness: map.bossIntel?.weakness ?? "Không",
        primaryColor: map.bossIntel?.primaryColor ?? "#f59e0b",
        glowColor: map.bossIntel?.glowColor ?? "#ef4444",
      });
    }
  }
  return cards.filter(
    (card) => !dismissedEnemyIntelIds.value.includes(card.id),
  );
});

function dismissEnemyIntel(id: EnemyIntelCard["id"]) {
  if (!dismissedEnemyIntelIds.value.includes(id))
    dismissedEnemyIntelIds.value = [...dismissedEnemyIntelIds.value, id];
}

// Trạng thái UI cục bộ không thuộc gameplay: popup, tooltip và màn hình loading.
const selectedTowerAnchor = ref({ x: 0, y: 0, visible: false });
const isMovePlacementMode = ref(false);
const hoveredTowerKind = ref<TowerKind | null>(null);
const towerTooltipPosition = ref({ x: 0, y: 0 });
const hoveredTowerDefinition = computed(() =>
  hoveredTowerKind.value ? TOWER_DEFINITIONS[hoveredTowerKind.value] : null,
);
const sceneReady = ref(false);
const imagesReady = ref(true);
const showBrickBackground = ref(false);
const isBuildPanelExpanded = ref(false);
const selectedFaction = ref<TowerFaction | null>(null);
const isGameReady = computed(
  () =>
    selectedFaction.value !== null && sceneReady.value && imagesReady.value,
);

interface TowerDefenseSessionResponse {
  data: {
    id: number;
    faction: TowerFaction;
    status: "active" | "completed" | "gameover";
    lastPlayedAt: string;
    snapshot: TowerDefenseGameSnapshot;
  } | null;
}

const sessionLoading = ref(true);
const sessionSaving = ref(false);
const sessionSaveQueued = ref(false);
const sessionFinalized = ref(false);

/** Nạp phiên active của tài khoản; khách chưa đăng nhập vẫn được chơi bình thường. */
async function loadSavedSession() {
  sessionLoading.value = true;
  try {
    const response = await api<TowerDefenseSessionResponse>(
      `/api/tower-defense/maps/${encodeURIComponent(map.id)}/session`,
    );
    if (response.data && restoreSnapshot(response.data.snapshot)) {
      selectedFaction.value = response.data.faction;
    }
  } catch (error: any) {
    const status = error?.statusCode ?? error?.status ?? error?.response?.status;
    if (status !== 401 && status !== 403)
      message.value = "Chưa thể tải phiên đã lưu. Bạn vẫn có thể bắt đầu một trận mới.";
  } finally {
    sessionLoading.value = false;
  }
}

/** Ghi snapshot lên backend; nếu đang có request thì gom thành một lần lưu kế tiếp. */
async function saveGameSession(force = false) {
  if (sessionLoading.value || !selectedFaction.value) return;
  if (!force && sessionFinalized.value && (phase.value === "completed" || phase.value === "gameover"))
    return;
  if (sessionSaving.value) {
    sessionSaveQueued.value = true;
    return;
  }

  sessionSaving.value = true;
  const snapshot = createSnapshot();
  try {
    await api(`/api/tower-defense/maps/${encodeURIComponent(map.id)}/session`, {
      method: "PUT",
      body: { faction: selectedFaction.value, snapshot },
    });
    if (snapshot.phase === "completed" || snapshot.phase === "gameover")
      sessionFinalized.value = true;
  } catch (error: any) {
    const status = error?.statusCode ?? error?.status ?? error?.response?.status;
    if (status !== 401 && status !== 403)
      message.value = "Không thể tự động lưu phiên chơi. Hệ thống sẽ thử lại.";
  } finally {
    sessionSaving.value = false;
    if (sessionSaveQueued.value) {
      sessionSaveQueued.value = false;
      void saveGameSession();
    }
  }
}


/** Chọn phe từ thao tác click đồng thời mở khóa audio theo chính sách trình duyệt. */
function selectFaction(faction: TowerFaction) {
  selectedFaction.value = faction;
  void startBackgroundMusic();
  void saveGameSession();
}

function togglePauseFromHud() {
  if (isPaused.value) {
    setPaused(false);
  } else {
    setPaused(true);
  }
}

function resumeGame() {
  setPaused(false);
}

// Giữ tooltip nằm trong viewport khi con trỏ ở sát cạnh màn hình.
/** Tính vị trí tooltip theo con trỏ và ép nó nằm hoàn toàn trong viewport. */
function positionTowerTooltip(clientX: number, clientY: number) {
  towerTooltipPosition.value = {
    x: Math.max(12, clientX - 244),
    y: Math.max(12, Math.min(clientY - 70, window.innerHeight - 290)),
  };
}

/** Mở tooltip cho chuột hoặc bàn phím; focus dùng bounding box thay cho tọa độ chuột. */
function showTowerTooltip(kind: TowerKind, event: MouseEvent | FocusEvent) {
  hoveredTowerKind.value = kind;
  if (event instanceof MouseEvent) {
    positionTowerTooltip(event.clientX, event.clientY);
    return;
  }
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  positionTowerTooltip(bounds.left, bounds.top + bounds.height / 2);
}

/** Đóng tooltip khi pointer/focus rời khỏi nút tower. */
function hideTowerTooltip() {
  hoveredTowerKind.value = null;
}

/** Nhận tọa độ màn hình do scene chiếu từ vị trí 3D của tower đang chọn. */
function updateSelectedTowerAnchor(x: number, y: number, visible: boolean) {
  selectedTowerAnchor.value = { x, y, visible };
}

// Scene phát tọa độ grid; composable quyết định chọn, đặt mới hay di chuyển tháp.
/** Chuyển click trên grid cho gameplay và đồng bộ lại selection cục bộ của page. */
function handleCellSelect(x: number, y: number) {
  const clickedTower = towers.value.some(
    (tower) => tower.x === x && tower.y === y,
  );
  selectCell(x, y);
  isMovePlacementMode.value = false;
  if (!clickedTower) {
    selectedKind.value = null;
    selectedTowerId.value = null;
  }
}

/** Hủy chế độ xây/di chuyển và đóng popup tower khi người chơi click nền. */
function clearBoardSelection() {
  isMovePlacementMode.value = false;
  selectedKind.value = null;
  selectedTowerId.value = null;
}

/** Chọn lại cùng một loại tháp trong sidebar để hủy chế độ xây. */
function toggleTowerKind(kind: TowerKind) {
  selectedKind.value = selectedKind.value === kind ? null : kind;
  selectedTowerId.value = null;
  isMovePlacementMode.value = false;
}

/** Cho phép tower đang chọn nhận ô đích mới trong giai đoạn chuẩn bị. */
function beginTowerRelocation() {
  isMovePlacementMode.value = enableSelectedRelocation();
}

/** Đóng popup khi click ngoài scene và ngoài chính popup, tránh chặn tương tác WebGL. */
function closeTowerPopupOnOutsideClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (
    target.closest(".defense-upgrade--floating") ||
    target.closest(".tower-defense-scene")
  )
    return;
  isMovePlacementMode.value = false;
  selectedTowerId.value = null;
}

/** Escape luôn bật/tắt pause trong mọi giai đoạn còn có thể chơi. */
function handleEscapeKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.repeat || !selectedFaction.value) return;
  if (phase.value === "completed" || phase.value === "gameover") return;
  event.preventDefault();

  if (!isPaused.value) clearBoardSelection();
  togglePauseFromHud();
}

watch(phase, (currentPhase) => {
  if (currentPhase === "wave" || currentPhase === "gameover" || currentPhase === "completed")
    isMovePlacementMode.value = false;
  if (currentPhase === "completed" || currentPhase === "gameover")
    void saveGameSession(true);
  else if (currentPhase === "wave" || currentPhase === "between")
    void saveGameSession();
});

const completionReported = ref(false);
const completionSaving = ref(false);
const completionSaveError = ref("");
const showFinalWaveAnnouncement = ref(false);
let finalWaveAnnouncementTimer: ReturnType<typeof setTimeout> | null = null;

/** Hiện cảnh báo cinematic ngắn khi người chơi bước vào đợt cuối. */
function announceFinalWave() {
  if (finalWaveAnnouncementTimer) clearTimeout(finalWaveAnnouncementTimer);
  showFinalWaveAnnouncement.value = true;
  finalWaveAnnouncementTimer = setTimeout(() => {
    showFinalWaveAnnouncement.value = false;
    finalWaveAnnouncementTimer = null;
  }, 2800);
}
const nextMap = computed(() => {
  const index = availableMaps.value.findIndex((item) => item.id === map.id);
  return index >= 0 ? availableMaps.value[index + 1] ?? null : null;
});

interface TowerDefenseProgressResponse {
  message: string;
  data: {
    mapId: string;
    maxWave: number;
    completed: boolean;
    completedAt: string | null;
    unlockedMap: { id: string; name: string } | null;
  };
  completionWave: number;
}

/** Lưu mốc hoàn thành đợt 20 và mở khóa map kế tiếp cho tài khoản hiện tại. */
async function reportMapCompletion() {
  if (completionReported.value) return;
  completionReported.value = true;
  completionSaving.value = true;
  completionSaveError.value = "";

  try {
    const response = await api<TowerDefenseProgressResponse>(
      `/api/tower-defense/maps/${encodeURIComponent(map.id)}/progress`,
      { method: "POST", body: { wave: wave.value } },
    );
    availableMaps.value = availableMaps.value.map((item) => {
      if (item.id === map.id)
        return { ...item, bestWave: response.data.maxWave, completed: response.data.completed };
      if (item.id === response.data.unlockedMap?.id)
        return { ...item, isUnlocked: true };
      return item;
    });
    message.value = response.message;
    completionSaving.value = false;
  } catch (error: any) {
    completionReported.value = false;
    completionSaving.value = false;
    const status = error?.statusCode ?? error?.status ?? error?.response?.status;
    completionSaveError.value = status === 401
      ? "Hãy đăng nhập để lưu chiến thắng và mở map tiếp theo."
      : "Chưa thể lưu tiến trình. Vui lòng thử lại.";
    message.value = completionSaveError.value;
  }
}

watch([phase, wave], ([currentPhase, currentWave]) => {
  if (currentPhase === "completed" && currentWave >= completionWave.value)
    void reportMapCompletion();
  if (
    !sessionLoading.value &&
    currentPhase === "wave" &&
    currentWave === completionWave.value
  ) announceFinalWave();
});
watch(
  [towers, phase, isPaused],
  ([currentTowers, currentPhase, paused]) =>
    syncTowerShots(currentTowers, currentPhase === "wave" && !paused),
  { flush: "sync" },
);

watch(enemyIntelWave, () => {
  dismissedEnemyIntelIds.value = [];
});

// Chỉ bỏ loading sau khi đã kiểm tra phiên lưu và tài nguyên scene sẵn sàng.
let sessionAutosaveTimer: ReturnType<typeof setInterval> | null = null;
function saveSessionWhenHidden() {
  if (document.hidden) void saveGameSession();
}

onMounted(async () => {
  await loadSavedSession();
  sessionAutosaveTimer = setInterval(() => void saveGameSession(), 3000);
  document.addEventListener("click", closeTowerPopupOnOutsideClick);
  document.addEventListener("visibilitychange", saveSessionWhenHidden);
  window.addEventListener("keydown", handleEscapeKey);
});
onBeforeUnmount(() => {
  if (sessionAutosaveTimer) clearInterval(sessionAutosaveTimer);
  if (finalWaveAnnouncementTimer) clearTimeout(finalWaveAnnouncementTimer);
  void saveGameSession();
  document.removeEventListener("click", closeTowerPopupOnOutsideClick);
  document.removeEventListener("visibilitychange", saveSessionWhenHidden);
  window.removeEventListener("keydown", handleEscapeKey);
});
</script>

<template>
  <main class="defense-page">
    <div class="defense-page__grid" aria-hidden="true" />

    <section
      v-if="!sessionLoading && !selectedFaction"
      class="defense-faction-select"
      aria-labelledby="defense-faction-title"
    >
      <small>CHỌN PHE PHÒNG THỦ</small>
      <h1 id="defense-faction-title">Tuyên thệ với vương quốc</h1>
      <p>Phe được chọn sẽ quyết định diện mạo của toàn bộ công trình.</p>
      <div>
        <button
          type="button"
          class="is-human"
          @click="selectFaction('human')"
        >
          <span><ShieldCheck /></span>
          <strong>HUMAN</strong>
          <small>Thành lũy sáng, kim loại và sắc vàng của vương quốc.</small>
        </button>
        <button
          type="button"
          class="is-dark"
          @click="selectFaction('dark')"
        >
          <span><Swords /></span>
          <strong>DARK</strong>
          <small>Pháo đài hắc ám với giáp tối và năng lượng ma thuật.</small>
        </button>
      </div>
    </section>

    <section
      v-if="!sessionLoading && selectedFaction"
      class="defense-shell"
      :class="{ 'is-loading': !isGameReady }"
      :aria-hidden="!isGameReady"
    >
      <section class="defense-board-panel">
        <div class="defense-board-stage">
          <div
            class="defense-board has-webgl"
            role="grid"
            :aria-label="`Bản đồ ${map.name}, ${map.columns} cột và ${map.rows} hàng`"
          >
            <!-- Scene chỉ render; mọi state gameplay được truyền từ composable qua props. -->
            <ClientOnly>
              <TowerDefenseScene
                :faction="selectedFaction ?? 'human'"
                :map="map"
                :towers="towers"
                :enemies="enemies"
                :projectiles="projectiles"
                :impacts="impacts"
                :selected-tower-id="selectedTowerId"
                :selected-kind="selectedKind"
                :phase="phase"
                :is-paused="isPaused"
                :speed-multiplier="speedMultiplier"
                :show-brick-background="showBrickBackground"
                @cell-select="handleCellSelect"
                @background-select="clearBoardSelection"
                @selected-tower-position="updateSelectedTowerAnchor"
                @ready="sceneReady = true"
              />
              <template #fallback
                ><div class="defense-scene-loading">
                  Đang dựng chiến trường 3D…
                </div></template
              >
            </ClientOnly>

            <Transition name="defense-final-wave">
              <section
                v-if="showFinalWaveAnnouncement"
                class="defense-final-wave-announcement"
                role="alert"
                aria-live="assertive"
              >
                <div class="defense-final-wave-announcement__line" />
                <div class="defense-final-wave-announcement__content">
                  <span><Swords /></span>
                  <small>THỬ THÁCH CUỐI CÙNG</small>
                  <strong>ĐỢT CUỐI</strong>
                  <p>Toàn quân địch đang tiến công — hãy giữ vững lâu đài!</p>
                </div>
                <div class="defense-final-wave-announcement__line" />
              </section>
            </Transition>

            <Transition name="defense-pause-overlay">
              <section
                v-if="isPaused && phase !== 'completed' && phase !== 'gameover'"
                class="defense-pause-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="defense-pause-title"
              >
                <div class="defense-pause-dialog">
                  <span><Pause /></span>
                  <small>TRẬN ĐẤU ĐÃ TẠM DỪNG</small>
                  <h2 id="defense-pause-title">Tạm ngừng chiến đấu</h2>
                  <p>
                    Mọi chuyển động và thời gian trong trận đấu đang tạm dừng.
                  </p>
                  <div class="defense-pause-actions">
                    <button type="button" autofocus @click="resumeGame">
                      <Play /> Tiếp tục
                    </button>
                    <button
                      type="button"
                      class="is-replay"
                      @click="replayMap"
                    >
                      <RotateCcw /> Chơi lại
                    </button>
                  </div>
                </div>
              </section>
            </Transition>

            <Transition name="defense-pause-overlay">
              <section
                v-if="phase === 'completed'"
                class="defense-completion-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="defense-completion-title"
              >
                <div class="defense-completion-dialog">
                  <span class="defense-completion-trophy"><Trophy /></span>
                  <small>HOÀN THÀNH ĐỢT {{ completionWave }}</small>
                  <h2 id="defense-completion-title">{{ map.name }} đã được chinh phục</h2>
                  <p>Bạn đã bảo vệ lâu đài qua toàn bộ {{ completionWave }} đợt tấn công.</p>

                  <div v-if="completionSaving" class="defense-completion-unlock is-loading">
                    Đang lưu chiến thắng và kiểm tra bản đồ tiếp theo…
                  </div>
                  <div v-else-if="completionSaveError" class="defense-completion-unlock is-error">
                    {{ completionSaveError }}
                    <button type="button" @click="reportMapCompletion">Thử lưu lại</button>
                  </div>
                  <div v-else-if="nextMap && nextMap.isUnlocked !== false" class="defense-completion-unlock">
                    <small>BẢN ĐỒ MỚI ĐÃ MỞ</small>
                    <strong>{{ nextMap.name }}</strong>
                  </div>
                  <div v-else-if="nextMap" class="defense-completion-unlock is-loading">
                    Đang chờ mở khóa {{ nextMap.name }}…
                  </div>
                  <div v-else class="defense-completion-unlock">
                    <small>CHIẾN DỊCH HOÀN TẤT</small>
                    <strong>Bạn đã chinh phục toàn bộ bản đồ</strong>
                  </div>

                  <div class="defense-completion-actions">
                    <button
                      v-if="nextMap && nextMap.isUnlocked !== false"
                      type="button"
                      class="primary"
                      @click="playNextMap"
                    >
                      Qua map tiếp theo <ArrowRight />
                    </button>
                    <button type="button" class="secondary" @click="replayMap">
                      <RotateCcw /> Chơi lại map này
                    </button>
                  </div>
                </div>
              </section>
            </Transition>

            <!-- HUD trạng thái trận đấu phủ trên WebGL canvas. -->
            <header class="defense-game-hud">
              <div class="defense-game-title">
                <span class="defense-eyebrow"><Crown /> BẢO VỆ VƯƠNG QUỐC</span>
                <h1>Kingdom <em>Defense</em></h1>
              </div>
              <div class="defense-status-controls">
                <div class="defense-status" :class="`is-${phase}`">
                  <i />
                  <span>{{ phaseLabel }}</span>
                  <b>{{ enemiesRemaining }} quân địch</b>
                </div>
                <button
                  v-if="phase !== 'completed' && phase !== 'gameover'"
                  type="button"
                  class="defense-pause"
                  :class="{ active: isPaused }"
                  :title="isPaused ? 'Tiếp tục' : 'Tạm dừng'"
                  @click="togglePauseFromHud"
                >
                  <Play v-if="isPaused" />
                  <Pause v-else />
                  {{ isPaused ? "Tiếp tục" : "Tạm dừng" }}
                </button>
              </div>
              <div class="defense-stats">
                <article>
                  <HeartPulse />
                  <div>
                    <small>LÂU ĐÀI</small
                    ><strong>{{ castleHealth }}<span>/20</span></strong>
                  </div>
                </article>
                <article>
                  <Coins />
                  <div>
                    <small>VÀNG</small><strong>{{ credits }}</strong>
                  </div>
                </article>
                <article>
                  <Swords />
                  <div>
                    <small>{{ phase === 'wave' && wave === completionWave ? 'ĐỢT CUỐI' : 'ĐỢT' }}</small><strong>{{ wave }}</strong>
                  </div>
                </article>
                <article>
                  <ShieldCheck />
                  <div>
                    <small>KỶ LỤC</small><strong>{{ bestWave }}</strong>
                  </div>
                </article>
                <article>
                  <Sparkles />
                  <div>
                    <small>ĐIỂM</small><strong>{{ score }}</strong>
                  </div>
                </article>
              </div>
            </header>

            <aside
              v-if="enemyIntelCards.length"
              class="defense-enemy-intel"
              aria-label="Thông tin quân địch trong đợt hiện tại"
            >
              <article
                :style="{ '--enemy-intel-primary': enemyIntel.primaryColor, '--enemy-intel-glow': enemyIntel.glowColor }"
                v-for="enemyIntel in enemyIntelCards"
                :key="enemyIntel.id"
                :class="{ 'is-boss': enemyIntel.id.startsWith('boss') }"
              >
                <img :src="enemyIntel.avatar" :alt="enemyIntel.name" />
                <div class="defense-enemy-intel__identity">
                  <small>
                    {{ enemyIntel.id.startsWith("boss") ? "BOSS" : "ĐỢT" }}
                    {{ enemyIntelWave }}
                  </small>
                  <strong>{{ enemyIntel.name }}</strong>
                </div>
                <div class="defense-enemy-intel__actions">
                  <button
                    type="button"
                    :aria-label="`Đóng thông tin ${enemyIntel.name}`"
                    @click="dismissEnemyIntel(enemyIntel.id)"
                  >
                    <X />
                  </button>
                  <span>
                    <button
                      type="button"
                      :aria-label="`Xem thông tin ${enemyIntel.name}`"
                    >
                      <Info />
                    </button>
                    <section role="tooltip">
                      <small>HỒ SƠ KẺ ĐỊCH</small>
                      <h3>{{ enemyIntel.name }}</h3>
                      <p>{{ enemyIntel.summary }}</p>
                      <dl>
                        <div><dt>Sinh lực</dt><dd>{{ enemyIntel.health }}</dd></div>
                        <div class="is-strength">
                          <dt><ShieldCheck />Điểm mạnh</dt>
                          <dd>{{ enemyIntel.resistance }}</dd>
                        </div>
                        <div class="is-weakness">
                          <dt><Crosshair />Điểm yếu</dt>
                          <dd>{{ enemyIntel.weakness }}</dd>
                        </div>
                      </dl>
                    </section>
                  </span>
                </div>
              </article>
            </aside>

            <section
              v-if="
                selectedTower &&
                selectedTowerAnchor.visible &&
                !isMovePlacementMode
              "
              class="defense-upgrade defense-upgrade--floating"
              :style="{
                left: `${selectedTowerAnchor.x}px`,
                top: `${selectedTowerAnchor.y}px`,
              }"
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
              <h3>
                {{ TOWER_DEFINITIONS[selectedTower.kind].name }} · LV.{{
                  selectedTower.level
                }}
              </h3>
              <p class="defense-upgrade__description">
                {{ TOWER_DEFINITIONS[selectedTower.kind].description }}
              </p>
              <p>
                {{
                  selectedTower.canRelocate && canStartWave
                    ? "Chọn một ô trống trên bản đồ để đặt lại tháp."
                    : canRelocateSelectedTower
                      ? "Nhấn Di chuyển để chọn vị trí mới cho tháp."
                      : canStartWave
                        ? "Vị trí đã khóa vì tháp thuộc round trước."
                        : "Không thể di chuyển tháp khi round đang diễn ra."
                }}
              </p>
              <div class="is-price">
                <span>{{
                  selectedTower.level > 1 ? "Tổng đầu tư" : "Giá xây"
                }}</span
                ><b>{{ selectedTower.invested }} vàng</b>
              </div>
              <div v-if="isSupportTowerKind(selectedTower.kind)" class="is-damage">
                <span>{{ selectedTower.kind === "speed" ? "Tốc độ" : "Sát thương" }}</span
                ><b>+{{ Math.round(towerSupportBonus(selectedTower.level) * 100) }}%</b>
              </div>
              <div v-else class="is-damage">
                <span>{{
                  selectedTower.kind === "thunder"
                    ? "Sát thương/giây hiện tại"
                    : "Sát thương hiện tại"
                }}</span
                ><b>{{ selectedTowerEffectiveDamage }}</b>
              </div>
              <div class="is-range">
                <span>{{
                  isSupportTowerKind(selectedTower.kind)
                    ? "Phạm vi buff"
                    : selectedTower.kind === "frost"
                      ? "Bán kính vùng"
                      : "Tầm bắn"
                }}</span
                ><b>{{
                  (selectedTower.kind === "frost" || isSupportTowerKind(selectedTower.kind)
                    ? TOWER_DEFINITIONS[selectedTower.kind].range
                    : TOWER_DEFINITIONS[selectedTower.kind].range +
                      (selectedTower.level - 1) * TOWER_RANGE_LEVEL_BONUS
                  ).toFixed(1)
                }}</b>
              </div>
              <div v-if="!isSupportTowerKind(selectedTower.kind)" class="is-rate">
                <span>{{
                  selectedTower.kind === "thunder"
                    ? "Tấn công"
                    : "Tốc độ hiện tại"
                }}</span
                ><b>{{
                  selectedTower.kind === "thunder"
                    ? "Liên tục"
                    : `${selectedTowerEffectiveFireInterval.toFixed(2)} giây`
                }}</b>
              </div>
              <div
                v-if="!isSupportTowerKind(selectedTower.kind)"
                class="is-buff-damage"
                :class="{ 'is-active': selectedTowerSupportBonuses.damage > 0 }"
              >
                <span>Buff sát thương</span
                ><b>+{{ Math.round(selectedTowerSupportBonuses.damage * 100) }}%</b>
              </div>
              <div
                v-if="!isSupportTowerKind(selectedTower.kind)"
                class="is-buff-speed"
                :class="{ 'is-active': selectedTowerSupportBonuses.speed > 0 }"
              >
                <span>Buff tốc độ</span
                ><b>+{{ Math.round(selectedTowerSupportBonuses.speed * 100) }}%</b>
              </div>
              <div v-if="selectedTower.kind === 'frost'" class="is-slow">
                <span>Đóng băng</span
                ><b>100% · {{ FROST_SLOW_DURATION_SECONDS }} giây</b>
              </div>
              <div v-if="selectedTower.kind === 'water'" class="is-slow">
                <span>Làm chậm</span
                ><b
                  >{{ Math.round((TOWER_DEFINITIONS.water.slow ?? 0) * 100) }}%
                  · {{ WATER_SLOW_DURATION_SECONDS }} giây</b
                >
              </div>
              <div
                v-if="
                  selectedTower.kind === 'fire' ||
                  selectedTower.kind === 'cannon' ||
                  selectedTower.kind === 'water'
                "
                class="is-splash"
              >
                <span>Bán kính lan</span
                ><b>{{ TOWER_DEFINITIONS[selectedTower.kind].splashRadius }}</b>
              </div>
              <div v-if="selectedTower.kind === 'fire'" class="is-burn">
                <span>Thiêu đốt</span
                ><b
                  >{{
                    (
                      (TOWER_DEFINITIONS.fire.burnDamagePerSecond ?? 0) *
                      (1 + (selectedTower.level - 1) * 0.55)
                    ).toFixed(1)
                  }}/s · {{ TOWER_DEFINITIONS.fire.burnDuration }}s</b
                >
              </div>
              <button
                type="button"
                :disabled="
                  selectedTower.level >= MAX_TOWER_LEVEL ||
                  credits < upgradeCost
                "
                @click="upgradeSelected"
              >
                {{
                  selectedTower.level >= MAX_TOWER_LEVEL
                    ? "Đã tối đa"
                    : `Nâng cấp · ${upgradeCost}`
                }}
              </button>
              <button
                type="button"
                class="is-move"
                :disabled="
                  !canRelocateSelectedTower || selectedTower.canRelocate
                "
                @click="beginTowerRelocation"
              >
                <Move />{{
                  selectedTower.canRelocate ? "Đang chọn vị trí" : "Di chuyển"
                }}
              </button>
              <button
                v-if="canUndoSelectedPlacement"
                type="button"
                class="is-undo"
                title="Gỡ tháp và nhận lại toàn bộ vàng đã đầu tư"
                @click="undoSelectedPlacement"
              >
                <Undo2 />Hoàn tác đặt tháp · {{ selectedTower.invested }}
              </button>
              <button type="button" class="is-sell" @click="sellSelected">
                Bán · {{ Math.floor(selectedTower.invested * 0.7) }}
              </button>
            </section>

            <!-- Sidebar xây tháp và điều khiển wave. -->
            <aside
              class="defense-sidebar"
              :class="{ 'is-build-expanded': isBuildPanelExpanded }"
            >
              <label v-if="availableMaps.length > 1" class="defense-map-picker">
                <span>BẢN ĐỒ</span>
                <select :value="map.id" @change="selectMap">
                  <option v-for="item in availableMaps" :key="item.id" :value="item.id" :disabled="item.isUnlocked === false">{{ item.isUnlocked === false ? '🔒 ' + item.name : item.completed ? '✓ ' + item.name : item.name }}</option>
                </select>
              </label>
              <section
                class="defense-build"
                :class="{ 'is-expanded': isBuildPanelExpanded }"
              >
                <header>
                  <button
                    type="button"
                    class="defense-build__expand"
                    :aria-expanded="isBuildPanelExpanded"
                    :title="
                      isBuildPanelExpanded
                        ? 'Thu gọn danh sách công trình'
                        : 'Mở rộng danh sách công trình'
                    "
                    @click="isBuildPanelExpanded = !isBuildPanelExpanded"
                  >
                    <Minimize2 v-if="isBuildPanelExpanded" />
                    <Maximize2 v-else />
                  </button>
                  <div>
                    <small>THÁP PHÒNG THỦ</small
                    ><strong class="defense-tower-count"
                      >{{ towers.length }}/{{ map.maxTowerCount }}</strong
                    >
                  </div>
                  <h2>Chọn công trình</h2>
                </header>
                <div class="defense-build__list">
                  <button
                    v-for="kind in towerKinds"
                    :key="kind"
                    type="button"
                    :class="{ active: selectedKind === kind }"
                    :disabled="towers.length >= map.maxTowerCount"
                    @click="toggleTowerKind(kind)"
                    @mouseenter="showTowerTooltip(kind, $event)"
                    @mousemove="showTowerTooltip(kind, $event)"
                    @mouseleave="hideTowerTooltip"
                    @focus="showTowerTooltip(kind, $event)"
                    @blur="hideTowerTooltip"
                  >
                    <span
                      :style="{
                        '--tower-color': TOWER_DEFINITIONS[kind].color,
                      }"
                      aria-hidden="true"
                    >
                      <Crosshair v-if="kind === 'archer'" />
                      <Bomb v-else-if="kind === 'cannon'" />
                      <Snowflake v-else-if="kind === 'frost'" />
                      <Flame v-else-if="kind === 'fire'" />
                      <Zap v-else-if="kind === 'thunder'" />
                      <Waves v-else-if="kind === 'water'" />
                      <Gauge v-else-if="kind === 'speed'" />
                      <Swords v-else />
                    </span>
                    <div>
                      <strong>{{ TOWER_DEFINITIONS[kind].name }}</strong
                      ><small>{{ TOWER_DEFINITIONS[kind].description }}</small>
                    </div>
                    <b>{{ TOWER_DEFINITIONS[kind].cost }}</b>
                  </button>
                </div>
              </section>

              <section class="defense-wave-control">
                <div class="is-current-wave">
                  <span>Đợt hiện tại</span
                  ><strong>{{ wave > 0 ? wave : "—" }}</strong>
                </div>
                <p v-if="phase === 'wave' && wave === completionWave" class="is-final-wave">
                  Đây là đợt cuối. Tiêu diệt toàn bộ quân địch để hoàn thành map.
                </p>
                <p v-else-if="phase === 'between'">
                  Tự động bắt đầu sau {{ Math.ceil(nextWaveCountdown) }} giây.
                  Bạn vẫn có thể bắt đầu sớm.
                </p>
                <p v-else>
                  Mỗi đợt tăng số lượng, tốc độ và sức chống chịu của quân địch.
                </p>
                <button
                  v-if="phase !== 'gameover' && phase !== 'completed'"
                  type="button"
                  :disabled="!canStartWave"
                  @click="startWave"
                >
                  <Play />{{
                    phase === "wave"
                      ? "Đang giao chiến"
                      : phase === "between"
                        ? `Bắt đầu ngay · ${Math.ceil(nextWaveCountdown)}s`
                        : "Bắt đầu đợt đầu tiên"
                  }}
                </button>
                <button v-else type="button" @click="replayMap">
                  <RotateCcw />Chơi lại
                </button>
              </section>
            </aside>

            <footer class="defense-board-footer">
              <p><span>CHỈ HUY</span>{{ message }}</p>
              <div>
                <button
                  type="button"
                  class="defense-sound-toggle"
                  :class="{ active: soundEnabled }"
                  :aria-pressed="soundEnabled"
                  :aria-label="soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'"
                  :title="soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'"
                  @click="toggleSound"
                >
                  <Volume2 v-if="soundEnabled" />
                  <VolumeX v-else />
                </button>
                <button
                  v-if="map.backgroundModel"
                  type="button"
                  class="defense-background-toggle"
                  :class="{ active: showBrickBackground }"
                  :aria-pressed="showBrickBackground"
                  :title="
                    showBrickBackground ? 'Ẩn nền gạch' : 'Hiện nền gạch'
                  "
                  @click="showBrickBackground = !showBrickBackground"
                >
                  <Grid2X2 /> Nền gạch
                </button>
                <span class="defense-camera-hint"
                  ><kbd>R</kbd> Đặt lại camera</span
                >
                <div class="defense-speed">
                  <Gauge /><button
                    type="button"
                    :class="{ active: speedMultiplier === 0.5 }"
                    @click="speedMultiplier = 0.5"
                  >
                    0.5×</button
                  ><button
                    type="button"
                    :class="{ active: speedMultiplier === 1 }"
                    @click="speedMultiplier = 1"
                  >
                    1×</button
                  ><button
                    type="button"
                    :class="{ active: speedMultiplier === 2 }"
                    @click="speedMultiplier = 2"
                  >
                    2×</button
                  ><button
                    type="button"
                    :class="{ active: speedMultiplier === 4 }"
                    @click="speedMultiplier = 4"
                  >
                    4×
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </section>

    <!-- Loading toàn màn hình tránh lộ scene đang nạp GLB/texture. -->
    <Transition name="defense-loader">
      <section
        v-if="sessionLoading || (selectedFaction && !isGameReady)"
        class="defense-loading-screen"
        role="status"
        aria-live="polite"
        aria-label="Đang tải trò chơi"
      >
        <div class="defense-loading-screen__crest"><Crown /></div>
        <span>{{ sessionLoading ? "ĐANG KHÔI PHỤC PHIÊN CHƠI" : "ĐANG TRIỆU TẬP QUÂN ĐỘI" }}</span>
        <h1>Kingdom <em>Defense</em></h1>
        <div class="defense-loading-screen__bar"><i /></div>
        <p>{{ sessionLoading ? "Đang kiểm tra dữ liệu đã lưu của bạn…" : "Đang chuẩn bị chiến trường và tài nguyên 3D…" }}</p>
      </section>
    </Transition>

    <Teleport to="body">
      <aside
        v-if="hoveredTowerDefinition"
        class="defense-tower-tooltip"
        :style="{
          left: `${towerTooltipPosition.x}px`,
          top: `${towerTooltipPosition.y}px`,
          '--tower-color': hoveredTowerDefinition.color,
        }"
      >
        <small>THÔNG TIN CÔNG TRÌNH</small>
        <h3>{{ hoveredTowerDefinition.name }}</h3>
        <p>{{ hoveredTowerDefinition.description }}</p>
        <dl>
          <div class="is-price">
            <dt>Giá xây</dt>
            <dd>{{ hoveredTowerDefinition.cost }} vàng</dd>
          </div>
          <div v-if="isSupportTowerKind(hoveredTowerKind)" class="is-damage">
            <dt>Buff theo cấp</dt>
            <dd>10% · 30% · 50%</dd>
          </div>
          <div v-else class="is-damage">
            <dt>
              {{
                hoveredTowerKind === "thunder"
                  ? "Sát thương/giây"
                  : "Sát thương"
              }}
            </dt>
            <dd>{{ hoveredTowerDefinition.damage }}</dd>
          </div>
          <div class="is-range">
            <dt>
              {{ isSupportTowerKind(hoveredTowerKind) ? "Phạm vi buff" : hoveredTowerKind === "frost" ? "Bán kính vùng" : "Tầm bắn" }}
            </dt>
            <dd>{{ hoveredTowerDefinition.range.toFixed(1) }}</dd>
          </div>
          <div v-if="!isSupportTowerKind(hoveredTowerKind)" class="is-rate">
            <dt>
              {{ hoveredTowerKind === "thunder" ? "Tấn công" : "Tốc độ" }}
            </dt>
            <dd>
              {{
                hoveredTowerKind === "thunder"
                  ? "Liên tục"
                  : `${hoveredTowerDefinition.fireRate.toFixed(2)} giây`
              }}
            </dd>
          </div>
          <div v-if="hoveredTowerKind === 'frost'" class="is-slow">
            <dt>Đóng băng</dt>
            <dd>100% · {{ FROST_SLOW_DURATION_SECONDS }} giây</dd>
          </div>
          <div v-if="hoveredTowerKind === 'water'" class="is-slow">
            <dt>Làm chậm</dt>
            <dd>
              {{ Math.round((hoveredTowerDefinition.slow ?? 0) * 100) }}% ·
              {{ WATER_SLOW_DURATION_SECONDS }} giây
            </dd>
          </div>
          <div
            v-if="
              hoveredTowerKind === 'fire' ||
              hoveredTowerKind === 'cannon' ||
              hoveredTowerKind === 'water'
            "
            class="is-splash"
          >
            <dt>Bán kính lan</dt>
            <dd>{{ hoveredTowerDefinition.splashRadius }}</dd>
          </div>
          <div v-if="hoveredTowerKind === 'fire'" class="is-burn">
            <dt>Thiêu đốt</dt>
            <dd>
              {{ hoveredTowerDefinition.burnDamagePerSecond }}/s ·
              {{ hoveredTowerDefinition.burnDuration }}s
            </dd>
          </div>
        </dl>
      </aside>
    </Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/tower-defense.css"></style>
