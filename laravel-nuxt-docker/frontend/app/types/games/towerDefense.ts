export type TowerKind =
  "archer" | "cannon" | "frost" | "fire" | "thunder" | "water";
export type EnemyKind = "normal" | "boss";
export type BossClass = "barbarian" | "knight" | "mage" | "ranger" | "rogue";

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
  /** Khoảng cách world-space giữa tâm hai ô kề nhau. */
  cellSize: number;
  paths: [GridPoint[], GridPoint[]];
  pathTiles: GridPoint[];
  cornerRadius: number;
  backgroundModel?: {
    url: string;
    offsetY?: number;
  };
  bossModel?: TowerDefenseCharacterModelDefinition;
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
}

export interface TowerDefenseCharacterModelDefinition {
  url: string;
  characterScale: number;
  sceneScale: number;
  healthBarY: number;
  animationNames: string[];
  removeRootMotion?: boolean;
}

export interface TowerDefinition {
  kind: TowerKind;
  name: string;
  description: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  slow?: number;
  slowDuration?: number;
  burnDuration?: number;
  burnDamagePerSecond?: number;
  splashRadius?: number;
  splashDamageRatio?: number;
  color: string;
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
  /** Khóa model trong ENEMY_MODEL_DEFINITIONS; mặc định là "normal". */
  modelKey?: string;
  bossClass?: BossClass;
  lane: 0 | 1;
  progress: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
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

export type GamePhase = "ready" | "wave" | "between" | "gameover";
