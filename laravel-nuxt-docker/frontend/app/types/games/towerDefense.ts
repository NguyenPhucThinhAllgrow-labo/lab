export type TowerKind = 'archer' | 'cannon' | 'frost' | 'fire'

export interface GridPoint { x: number; y: number }

export interface TowerDefinition {
  kind: TowerKind
  name: string
  description: string
  cost: number
  damage: number
  range: number
  fireRate: number
  slow?: number
  burnDuration?: number
  burnDamagePerSecond?: number
  splashRadius?: number
  splashDamageRatio?: number
  color: string
}

export interface Tower extends GridPoint {
  id: number
  kind: TowerKind
  level: number
  cooldown: number
  invested: number
  firingUntil: number
  aimAngle: number
  shotSequence: number
  canRelocate: boolean
}

export interface Enemy {
  id: number
  lane: 0 | 1
  progress: number
  hp: number
  maxHp: number
  speed: number
  reward: number
  slowUntil: number
  isSlowed: boolean
  burnRemaining: number
  burnDamagePerSecond: number
}

export interface Projectile {
  id: number
  kind: TowerKind
  from: GridPoint
  to: GridPoint
  life: number
  duration: number
  targetId: number
  damage: number
  slow?: number
  burnDuration?: number
  burnDamagePerSecond?: number
  splashRadius?: number
  splashDamageRatio?: number
}

export interface Impact {
  id: number
  kind: TowerKind
  position: GridPoint
  life: number
  radius?: number
}

export type GamePhase = 'ready' | 'wave' | 'between' | 'gameover'
