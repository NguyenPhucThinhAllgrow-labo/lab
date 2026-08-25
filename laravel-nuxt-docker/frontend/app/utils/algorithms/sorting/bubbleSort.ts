import type { SimulationStep } from '~/types/algorithm'

/**
 * Generate every state of Bubble Sort.
 *
 * The algorithm itself does not know anything about Vue.
 * It simply returns a list of simulation steps.
 */
export function generateBubbleSortSteps(
  input: number[],
): SimulationStep[] {
  const values: number[] = [...input]
  const steps: SimulationStep[] = []
  const sortedIndices: Set<number> = new Set()

  const addStep = (
    description: string,
    comparing: number[] = [],
    swapping: number[] = [],
  ): void => {
    steps.push({
      values: [...values],
      comparing: [...comparing],
      swapping: [...swapping],
      sorted: Array.from(sortedIndices),
      description,
    })
  }

  const n: number = values.length

  // Mảng rỗng
  if (n === 0) {
    addStep('Mảng rỗng. Không có phần tử nào để sắp xếp.')
    return steps
  }

  // Mảng có một phần tử
  if (n === 1) {
    sortedIndices.add(0)

    addStep(
      `${values[0]!} là phần tử duy nhất nên mảng đã được sắp xếp.`,
    )

    return steps
  }

  // Bắt đầu Bubble Sort
  addStep(`Bắt đầu Bubble Sort với ${n} phần tử.`)

  for (let i = 0; i < n - 1; i++) {
    let swapped = false

    addStep(
      `Bắt đầu vòng lặp ${i + 1}. Phần tử lớn nhất chưa được sắp xếp sẽ được đưa về cuối.`,
    )

    for (let j = 0; j < n - i - 1; j++) {
      // ! vì điều kiện vòng lặp đảm bảo hai index này tồn tại
      const left: number = values[j]!
      const right: number = values[j + 1]!

      // So sánh
      addStep(
        `So sánh ${left} và ${right}.`,
        [j, j + 1],
      )

      // Cần swap
      if (left > right) {
        addStep(
          `${left} > ${right} → cần hoán đổi hai phần tử.`,
          [j, j + 1],
          [j, j + 1],
        )

        values[j] = right
        values[j + 1] = left

        swapped = true

        addStep(
          `Đã swap → ${values[j]!} đứng trước ${values[j + 1]!}.`,
        )
      } else {
        // Không cần swap
        addStep(
          `${left} ≤ ${right} → giữ nguyên vị trí.`,
          [j, j + 1],
        )
      }
    }

    // Phần tử cuối của vòng này đã đúng vị trí
    const sortedIndex: number = n - i - 1

    sortedIndices.add(sortedIndex)

    addStep(
      `${values[sortedIndex]!} đã ở đúng vị trí.`,
    )

    // Không có swap => mảng đã được sắp xếp
    if (!swapped) {
      for (let index = 0; index < sortedIndex; index++) {
        sortedIndices.add(index)
      }

      addStep(
        'Không có swap nào xảy ra → mảng đã được sắp xếp hoàn toàn.',
      )

      break
    }
  }

  // Đảm bảo tất cả phần tử được đánh dấu sorted
  for (let index = 0; index < n; index++) {
    sortedIndices.add(index)
  }

  addStep(
    'Hoàn thành Bubble Sort. Tất cả phần tử đã được sắp xếp.',
  )

  return steps
}