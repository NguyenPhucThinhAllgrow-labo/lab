import type lavaMapData from "~/data/tower-defense/lava-map.json";

export type TowerKind =
  "archer" | "cannon" | "frost" | "fire" | "thunder" | "water" | "support";
export type EnemyKind = "normal" | "boss";
export type BossClass = "barbarian" | "knight" | "mage" | "ranger" | "rogue";
export type EnemyCombatProfileKey = "normal" | "lava-boss";
export type EnemyStatusEffect = "burn" | "slow" | "freeze";
export type TowerDamageType = "physical" | "magic" | "none";

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
  /** Hash cấu hình dùng để không khôi phục snapshot thuộc phiên bản map cũ. */
  configurationVersion: string;
  columns: number;
  rows: number;
  /** Số tháp tối đa người chơi được xây trên map. */
  maxTowerCount: number;
  /** Số vàng người chơi nhận khi bắt đầu hoặc chơi lại map. */
  startingCredits: number;
  /** Bỏ lính thường và đưa danh sách boss vào mọi wave. */
  bossOnly?: boolean;
  /** Tông ánh sáng và không khí riêng của map. */
  environmentMode?: "normal" | "dark";
  /** Cảnh dựng thủ công dùng cho map thay vì bố cục địa hình mặc định. */
  scenePreset?: "citadel-of-cinders";
  sceneSettings?: typeof lavaMapData.configuration.sceneSettings;
  /** Khoảng cách world-space giữa tâm hai ô kề nhau. */
  cellSize: number;
  /** Vị trí hai cổng sinh quái theo tọa độ grid của map. */
  spawnPoints?: [GridPoint, GridPoint];
  paths: [GridPoint[], GridPoint[]];
  pathTiles: GridPoint[];
  cornerRadius: number;
  backgroundModel?: {
    url: string;
    offsetY?: number;
  };
  /** Các bệ được phép xây; bỏ trống để mọi ô ngoài path vẫn xây được. */
  buildableTiles?: GridPoint[];
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
    /** Điểm cuối path/cổng lâu đài; mặt trước model tự nằm sát điểm này. */
    position?: GridPoint;
    offsetX: number;
    offsetY: number;
    /** Góc hiệu chỉnh thêm sau khi lâu đài tự quay mặt về hướng cuối lane. */
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
  armor: number;
  magicResistance: number;
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
  armor: number;
  magicResistance: number;
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
  /** Mẫu gameplay gốc; cho phép nhiều tower riêng biệt dùng chung hành vi. */
  templateKind?: TowerKind;
  role?: "damage" | "buff";
  damageType?: TowerDamageType;
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
  chainTargets?: number;
  chainRange?: number;
  chainDamageRatio?: number;
  /** Cấp 1 là giá xây; từ cấp 2 trở đi là giá nâng lên cấp đó. */
  upgradeCost: number;
}

export type TowerEffectBehavior =
  | "bonus_damage"
  | "critical_hit"
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
  multiplier?: number;
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
  lastAttackCritical?: boolean;
  criticalDamageMultiplier?: number;
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
  armor: number;
  magicResistance: number;
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
  burnDamageColor?: string;
}

export interface Projectile {
  id: number;
  kind: TowerKind;
  /** ID tower thực tế đã bắn; `kind` chỉ là mẫu gameplay/render gốc. */
  sourceTowerKind?: TowerKind;
  from: GridPoint;
  to: GridPoint;
  life: number;
  duration: number;
  targetId: number;
  damage: number;
  critical?: boolean;
  color?: string;
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

/** Số sát thương nổi chỉ tồn tại tạm thời ở lớp trình bày, không lưu vào snapshot. */
export interface DamageNumber {
  id: number;
  enemyId: number;
  kind: TowerKind;
  position: GridPoint;
  amount: number;
  critical?: boolean;
  color: string;
  life: number;
  duration: number;
}

export type GamePhase = "ready" | "wave" | "between" | "completed" | "gameover";

/** Snapshot đầy đủ để tiếp tục chính xác một phiên sau khi tải lại trang. */
export interface TowerDefenseGameSnapshot {
  version: 1;
  mapId: string;
  mapConfigurationVersion: string;
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
