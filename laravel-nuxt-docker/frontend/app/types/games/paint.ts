export type Phase =
  | 'lobby'
  | 'writing'
  | 'drawing'
  | 'guessing'
  | 'result'

export type Tool = 'brush' | 'eraser'

export interface Player {
  id: string
  name: string
  avatar: string
  host: boolean
  ready: boolean
  connected: boolean
  score: number
}

export interface Stroke {
  x: number
  y: number
  px: number
  py: number
  size: number
  tool: Tool
}

export interface ChainItem {
  prompt?: string
  drawing?: Stroke[]
  guess?: string
  authorId: string
  authorName: string
}

export interface Chain {
  original: string
  items: ChainItem[]
}

export interface RoomSettings {
  rounds: number
  writingSeconds: number
  drawingSeconds: number
  guessingSeconds: number
}

export interface GameState {
  phase: Phase
  round: number
  totalRounds: number
  timeLeft: number
  players: Player[]
  currentText?: string
  currentDrawing?: Stroke[]
  chains: Chain[]
  submitted: number
  totalRequired: number
  settings: RoomSettings
  started: boolean
  finished: boolean
}
