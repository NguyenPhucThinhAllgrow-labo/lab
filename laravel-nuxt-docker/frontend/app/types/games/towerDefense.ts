export type TowerKind =
  "archer" | "cannon" | "frost" | "fire" | "thunder" | "water" | "speed" | "damage";
export type EnemyKind = "normal" | "boss";
export type BossClass = "barbarian" | "knight" | "mage" | "ranger" | "rogue";
export type EnemyCombatProfileKey = "normal" | "lava-boss";
export type EnemyStatusEffect = "burn" | "slow" | "freeze";

export interface EnemyCombatProfile {
  damageMultipliers: Partial<Record<TowerKind, number>>;
  effectDurationMultipliers: Partial<Record<EnemyStatusEffect, number>>;
}

export interface GridPoint {
  x: number;
  y: number;
}

export type TowerDefenseLane = 0 | 1;

export interface TowerDefenseMapTheme {
  background: number;
  fogNear: number;
  fogFar: number;
  terrain: number;
  gridCenter: number;
  gridLine: number;
  path: number;
  pathStone: number;
  routeColors: [number, number];
  tileColors: [number, number, number];
}

export interface TowerDefenseMapScenery {
  trees: Array<{ x: number; y: number; scale: number }>;
  crystals: Array<{ x: number; y: number; color: number; scale?: number }>;
  runes: Array<{ x: number; y: number; rotation: number }>;
}

/**
 * Toàn bộ dữ liệu cần để gameplay và Three.js cùng chạy một map. Muốn thêm map
 * mới chỉ cần tạo một object đúng interface này và đăng ký trong maps/index.ts.
 */
export interface TowerDefenseMapDefinition {
  id: string;
  name: string;
  columns: number;
  rows: number;
  /** Số tháp tối đa người chơi được xây trên map. */
  maxTowerCount: number;
  /** Số vàng người chơi nhận khi bắt đầu hoặc chơi lại map. */
  startingCredits: number;
  /** Khoảng cách world-space giữa tâm hai ô kề nhau. */
  cellSize: number;
  paths: [GridPoint[], GridPoint[]];
  pathTiles: GridPoint[];
  cornerRadius: number;
  backgroundModel?: {
    url: string;
    offsetY?: number;
  };
  /** Nhạc nền riêng của map, được chọn từ kho asset backend. */
  backgroundMusicUrl?: string;
  /** Model quái thường riêng của map. */
  enemyModel?: TowerDefenseCharacterModelDefinition;
  /** Profile kháng/điểm yếu áp dụng cho boss riêng của map. */
  bossCombatProfileKey?: EnemyCombatProfileKey;
  bossModel?: TowerDefenseCharacterModelDefinition;
  enemyIntel?: TowerDefenseEnemyIntelDefinition;
  bossIntel?: TowerDefenseEnemyIntelDefinition;
  /** Hồ sơ gameplay được admin chọn từ danh mục quái. */
  enemyDefinition?: TowerDefenseManagedEnemyDefinition;
  bossDefinition?: TowerDefenseManagedEnemyDefinition;
  enemyDefinitionIds?: string[];
  bossDefinitionIds?: string[];
  enemyDefinitions?: TowerDefenseManagedEnemyDefinition[];
  bossDefinitions?: TowerDefenseManagedEnemyDefinition[];
  castle: {
    modelUrl: string;
    offsetX: number;
    offsetY: number;
    rotationY: number;
    maxSize: number;
    /** Số ô đi tiếp sau tâm ô path cuối để chạm đúng cổng lâu đài. */
    pathEndOffset: number;
  };
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
  theme: TowerDefenseMapTheme;
  scenery: TowerDefenseMapScenery;
  /** Trạng thái mở khóa theo tiến trình người chơi. */
  isUnlocked?: boolean;
  bestWave?: number;
  completed?: boolean;
  completionWave?: number;
}

export interface TowerDefenseManagedEnemyDefinition {
  id: string;
  name?: string;
  kind?: EnemyKind;
  baseHealth: number;
  baseSpeed: number;
  reward: number;
  castleDamage: number;
  combatProfile: EnemyCombatProfile;
  model?: TowerDefenseCharacterModelDefinition;
  intel?: TowerDefenseEnemyIntelDefinition;
}

export interface TowerDefenseEnemyIntelDefinition {
  name: string;
  avatarUrl: string;
  summary: string;
  resistance: string;
  weakness: string;
  primaryColor?: string;
  glowColor?: string;
}

export interface TowerDefenseCharacterModelDefinition {
  url: string;
  /** Model trang bị gắn vào bone tay; bỏ trống nếu nhân vật không dùng. */
  leftWeaponUrl?: string;
  rightWeaponUrl?: string;
  leftWeaponTransform?: TowerDefenseEquipmentTransform;
  rightWeaponTransform?: TowerDefenseEquipmentTransform;
  characterScale: number;
  sceneScale: number;
  healthBarY: number;
  animationNames: string[];
  removeRootMotion?: boolean;
}

export interface TowerDefenseEquipmentTransform {
  position: [number, number, number];
  /** Góc Euler tính theo radian. */
  rotation: [number, number, number];
  scale: number;
}

export interface TowerDefinition {
  kind: TowerKind;
  role?: "damage" | "buff";
  name: string;
  description: string;
  cost: number;
  damage: number;
  damageByLevel?: Record<number, number>;
  levelStats?: Record<number, TowerLevelStats>;
  maxLevel?: number;
  range: number;
  fireRate: number;
  slow?: number;
  slowDuration?: number;
  burnDuration?: number;
  burnDamagePerSecond?: number;
  splashRadius?: number;
  splashDamageRatio?: number;
  effects?: TowerEffectDefinition[];
  color: string;
  imageUrl?: string;
}

export interface TowerLevelStats {
  damage: number;
  range: number;
  fireRate: number;
  /** Cấp 1 là giá xây; từ cấp 2 trở đi là giá nâng lên cấp đó. */
  upgradeCost: number;
}

export type TowerEffectBehavior =
  | "bonus_damage"
  | "damage_over_time"
  | "slow"
  | "splash_damage"
  | "damage_aura"
  | "attack_speed_aura";

export interface TowerEffectDefinition {
  id: string;
  type: string;
  behavior: TowerEffectBehavior;
  name: string;
  value: number;
  duration?: number;
  radius?: number;
  ratio?: number;
  perLevel?: number;
  color?: string;
}

export interface Tower extends GridPoint {
  id: number;
  kind: TowerKind;
  level: number;
  cooldown: number;
  invested: number;
  firingUntil: number;
  aimAngle: number;
  shotSequence: number;
  beamTargetIds: number[];
  canRelocate: boolean;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  combatProfileKey: EnemyCombatProfileKey;
  /** Profile từ database; nếu không có sẽ dùng profile legacy theo key. */
  combatProfile?: EnemyCombatProfile;
  /** Khóa model trong ENEMY_MODEL_DEFINITIONS; mặc định là "normal". */
  modelKey?: string;
  definitionId?: string;
  bossClass?: BossClass;
  lane: 0 | 1;
  progress: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  castleDamage: number;
  slowUntil: number;
  slowAmount: number;
  isSlowed: boolean;
  frozenUntil: number;
  isFrozen: boolean;
  burnRemaining: number;
  burnDamagePerSecond: number;
}

export interface Projectile {
  id: number;
  kind: TowerKind;
  from: GridPoint;
  to: GridPoint;
  life: number;
  duration: number;
  targetId: number;
  damage: number;
  level: number;
  slow?: number;
  slowDuration?: number;
  burnDuration?: number;
  burnDamagePerSecond?: number;
  splashRadius?: number;
  splashDamageRatio?: number;
}

export interface Impact {
  id: number;
  kind: TowerKind;
  position: GridPoint;
  life: number;
  level: number;
  radius?: number;
}

export type GamePhase = "ready" | "wave" | "between" | "completed" | "gameover";

/** Snapshot đầy đủ để tiếp tục chính xác một phiên sau khi tải lại trang. */
export interface TowerDefenseGameSnapshot {
  version: 1;
  mapId: string;
  phase: GamePhase;
  credits: number;
  castleHealth: number;
  wave: number;
  score: number;
  bestWave: number;
  speedMultiplier: 0.5 | 1 | 2 | 4;
  selectedKind: TowerKind | null;
  selectedTowerId: number | null;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  impacts: Impact[];
  pendingEnemies: number;
  nextWaveCountdown: number;
  undoableTowerIds: number[];
  pendingEnemiesByLane: [number, number];
  spawnCooldownByLane: [number, number];
  pendingBosses: Array<{
    lane: TowerDefenseLane;
    kind: "boss";
    bossClass: BossClass;
    definitionId?: string;
  }>;
  nextTowerId: number;
  nextEnemyId: number;
  nextManagedEnemyIndex: number;
  nextManagedBossIndex: number;
  nextProjectileId: number;
  nextImpactId: number;
  elapsed: number;
}
