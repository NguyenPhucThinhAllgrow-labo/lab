export type SimulationStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'

export interface InsertionSortSimulationStep {
  /**
   * Giá trị hiện tại của array.
   */
  values: number[]

  /**
   * ID cố định của từng phần tử.
   *
   * Ví dụ:
   *
   * values = [45, 12, 87]
   * ids    = [0,  1,  2]
   *
   * Sau khi 12 di chuyển:
   *
   * values = [12, 45, 87]
   * ids    = [1,  0,  2]
   *
   * ID không bao giờ thay đổi theo value.
   */
  ids: number[]

  /**
   * Các index đang được so sánh.
   */
  comparing: number[]

  /**
   * Các index đang di chuyển.
   */
  swapping: number[]

  /**
   * Các index thuộc vùng đã sorted.
   */
  sorted: number[]

  /**
   * Text mô tả thao tác hiện tại.
   */
  description: string

  /**
   * Index hiện tại đang được xử lý.
   */
  currentIndex?: number
}

export interface Complexity {
  best: string
  average: string
  worst: string
  space: string
}
