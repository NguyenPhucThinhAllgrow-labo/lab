export type SimulationStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'

export interface GreedySimulationStep {
  /**
   * Trạng thái hiện tại của dữ liệu.
   */
  values: number[]

  /**
   * ID cố định của từng phần tử.
   */
  ids: number[]

  /**
   * Các index đang được xét.
   */
  comparing: number[]

  /**
   * Các index được chọn bởi Greedy.
   */
  selected: number[]

  /**
   * Các index đã được xử lý/chốt.
   */
  processed: number[]

  /**
   * Index hiện tại.
   */
  currentIndex?: number

  /**
   * Mô tả thao tác.
   */
  description: string
}

export interface Complexity {
  best: string
  average: string
  worst: string
  space: string
}
