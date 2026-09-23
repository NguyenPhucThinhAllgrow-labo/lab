import type { Tower, TowerKind } from "~/types/games/towerDefense";

type TowerSoundKind = Extract<
  TowerKind,
  "archer" | "cannon" | "fire" | "frost" | "thunder" | "water"
>;

const STORAGE_KEY = "game-lab:tower-defense:sound-enabled";
const DEFAULT_BACKGROUND_MUSIC_URL = "/api/tower-defense/assets/sounds/background/default.mp3";
const EFFECT_URLS: Record<TowerSoundKind, string> = {
  archer: "/api/tower-defense/assets/sounds/acher/default.mp3",
  cannon: "/api/tower-defense/assets/sounds/cannon/default.mp3",
  fire: "/api/tower-defense/assets/sounds/fire/default.mp3",
  frost: "/api/tower-defense/assets/sounds/frost/default.mp3",
  thunder: "/api/tower-defense/assets/sounds/thunder/default.wav",
  water: "/api/tower-defense/assets/sounds/water/default.mp3",
};
const EFFECT_VOLUMES: Record<TowerSoundKind, number> = {
  archer: 0.08,
  cannon: 0.12,
  fire: 0.2025,
  frost: 0.14,
  thunder: 0.04,
  water: 0.035,
};
const MIN_EFFECT_GAP_MS: Record<TowerSoundKind, number> = {
  archer: 70,
  cannon: 120,
  fire: 90,
  frost: 160,
  thunder: 0,
  water: 90,
};
const MAX_ACTIVE_EFFECTS = 8;

const hasTowerShotSound = (kind: TowerKind): kind is TowerSoundKind =>
  kind in EFFECT_URLS;

/** Quản lý nhạc nền và SFX của tower bằng các Audio element tái sử dụng cache. */
export function useTowerDefenseAudio(
  backgroundMusicUrl = DEFAULT_BACKGROUND_MUSIC_URL,
) {
  const soundEnabled = ref(true);
  const sourceEffects = new Map<TowerSoundKind, HTMLAudioElement>();
  const activeEffects = new Set<HTMLAudioElement>();
  const lastEffectAt = new Map<TowerSoundKind, number>();
  const lastShotSequence = new Map<number, number>();
  let backgroundMusic: HTMLAudioElement | null = null;
  let audioPrepared = false;

  function prepareAudio() {
    if (!import.meta.client || audioPrepared) return;
    audioPrepared = true;

    if (backgroundMusicUrl) {
      backgroundMusic = new Audio(backgroundMusicUrl);
      backgroundMusic.loop = true;
      backgroundMusic.preload = "auto";
      backgroundMusic.volume = 0.18;
    }

    for (const [kind, url] of Object.entries(EFFECT_URLS) as Array<
      [TowerSoundKind, string]
    >) {
      const audio = new Audio(url);
      audio.preload = "auto";
      sourceEffects.set(kind, audio);
    }
  }

  async function startBackgroundMusic() {
    if (!soundEnabled.value || !import.meta.client) return;
    prepareAudio();
    if (!backgroundMusic || !backgroundMusic.paused) return;

    try {
      await backgroundMusic.play();
    } catch {
      // Trình duyệt có thể chặn autoplay; nút loa sẽ thử lại từ thao tác người dùng.
    }
  }

  function stopActiveEffects() {
    for (const audio of activeEffects) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeEffects.clear();
  }

  /** Duy trì một loop sét chung khi có beam hoạt động và dừng ngay khi beam tắt. */
  function setThunderFiring(firing: boolean) {
    if (firing) prepareAudio();
    const audio = sourceEffects.get("thunder");
    if (!audio) return;

    if (!firing || !soundEnabled.value) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    if (!audio.paused) return;

    audio.loop = true;
    audio.volume = EFFECT_VOLUMES.thunder;
    void audio.play().catch(() => undefined);
  }

  function playEffect(kind: TowerSoundKind, now: number) {
    if (!soundEnabled.value || activeEffects.size >= MAX_ACTIVE_EFFECTS) return;
    const previous = lastEffectAt.get(kind) ?? -Infinity;
    if (now - previous < MIN_EFFECT_GAP_MS[kind]) return;

    prepareAudio();
    const source = sourceEffects.get(kind);
    if (!source) return;
    lastEffectAt.set(kind, now);

    const audio = source.cloneNode(true) as HTMLAudioElement;
    audio.volume = EFFECT_VOLUMES[kind];
    audio.playbackRate = 0.96 + Math.random() * 0.08;
    const release = () => activeEffects.delete(audio);
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    activeEffects.add(audio);
    void audio.play().catch(release);
  }

  /** Phát SFX đúng lúc bắn; riêng sét giữ loop trong toàn bộ thời gian beam hoạt động. */
  function syncTowerShots(towers: Tower[], combatActive: boolean) {
    if (!import.meta.client) return;
    const currentIds = new Set(towers.map((tower) => tower.id));
    for (const id of lastShotSequence.keys())
      if (!currentIds.has(id)) lastShotSequence.delete(id);

    const now = performance.now();
    let thunderFiring = false;
    for (const tower of towers) {
      const previousSequence = lastShotSequence.get(tower.id);
      lastShotSequence.set(tower.id, tower.shotSequence);
      if (tower.kind === "thunder") {
        if (
          combatActive &&
          soundEnabled.value &&
          tower.beamTargetIds.length > 0
        )
          thunderFiring = true;
        continue;
      }
      if (
        !combatActive ||
        !soundEnabled.value ||
        !hasTowerShotSound(tower.kind)
      )
        continue;
      if (
        previousSequence !== undefined &&
        tower.shotSequence !== previousSequence
      )
        playEffect(tower.kind, now);
    }
    setThunderFiring(thunderFiring);
  }

  async function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
    localStorage.setItem(STORAGE_KEY, String(soundEnabled.value));

    if (!soundEnabled.value) {
      backgroundMusic?.pause();
      stopActiveEffects();
      setThunderFiring(false);
      return;
    }
    await startBackgroundMusic();
  }

  onMounted(() => {
    soundEnabled.value = localStorage.getItem(STORAGE_KEY) !== "false";
    prepareAudio();
  });

  onBeforeUnmount(() => {
    backgroundMusic?.pause();
    backgroundMusic = null;
    stopActiveEffects();
    setThunderFiring(false);
    sourceEffects.clear();
    lastEffectAt.clear();
    lastShotSequence.clear();
  });

  return {
    soundEnabled,
    startBackgroundMusic,
    syncTowerShots,
    toggleSound,
  };
}
