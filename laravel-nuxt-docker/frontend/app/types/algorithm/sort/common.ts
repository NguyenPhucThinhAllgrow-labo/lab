export type SimulationStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'

export interface SimulationStep {
  values: number[]
  comparing: number[]
  swapping: number[]
  sorted: number[]
  description: string
  currentIndex?: number
  minimumIndex?: number
}

export interface Complexity {
  best: string
  average: string
  worst: string
  space: string
}