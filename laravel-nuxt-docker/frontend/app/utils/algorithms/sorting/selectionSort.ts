import type { SimulationStep } from '~/types/algorithm'

/**
 * Generate every state of Selection Sort.
 *
 * The algorithm itself does not know anything about Vue.
 * It simply returns a list of simulation steps.
 */
export function generateSelectionSortSteps(
  input: number[],
): SimulationStep[] {
  const values: number[] = [...input]
  const steps: SimulationStep[] = []
  const sortedIndices: Set<number> = new Set()

  const addStep = (
    description: string,
    comparing: number[] = [],
    swapping: number[] = [],
    currentIndex?: number,
    minimumIndex?: number,
  ): void => {
    steps.push({
      values: [...values],
      comparing: [...comparing],
      swapping: [...swapping],
      sorted: Array.from(sortedIndices),
      description,
      currentIndex,
      minimumIndex,
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

  // Bắt đầu Selection Sort
  addStep(`Bắt đầu Selection Sort với ${n} phần tử.`)

  for (let i = 0; i < n - 1; i++) {
    let minimumIndex: number = i

    addStep(
      `Bắt đầu vòng lặp ${i + 1}. Chọn phần tử nhỏ nhất trong phần chưa được sắp xếp.`,
      [],
      [],
      i,
      minimumIndex,
    )

    // Tìm minimum
    for (let j = i + 1; j < n; j++) {
      const currentValue: number = values[j]!
      const minimumValue: number = values[minimumIndex]!

      addStep(
        `So sánh ${currentValue} với giá trị nhỏ nhất hiện tại ${minimumValue}.`,
        [minimumIndex, j],
        [],
        i,
        minimumIndex,
      )

      if (currentValue < minimumValue) {
        minimumIndex = j

        addStep(
          `${currentValue} nhỏ hơn ${minimumValue} → cập nhật minimum.`,
          [minimumIndex],
          [],
          i,
          minimumIndex,
        )
      } else {
        addStep(
          `${currentValue} ≥ ${minimumValue} → giữ nguyên minimum.`,
          [minimumIndex, j],
          [],
          i,
          minimumIndex,
        )
      }
    }

    // Swap nếu minimum không nằm ở vị trí hiện tại
    if (minimumIndex !== i) {
      const currentValue: number = values[i]!
      const minimumValue: number = values[minimumIndex]!

      addStep(
        `Tìm thấy minimum ${minimumValue}. Swap với ${currentValue} ở vị trí ${i}.`,
        [i, minimumIndex],
        [i, minimumIndex],
        i,
        minimumIndex,
      )

      values[i] = minimumValue
      values[minimumIndex] = currentValue

      addStep(
        `Đã swap → ${values[i]!} được đưa về vị trí ${i}.`,
        [],
        [i, minimumIndex],
        i,
        minimumIndex,
      )
    } else {
      addStep(
        `${values[i]!} đã là phần tử nhỏ nhất → không cần swap.`,
        [],
        [],
        i,
        minimumIndex,
      )
    }

    // Phần tử tại i đã đúng vị trí
    sortedIndices.add(i)

    addStep(
      `${values[i]!} đã ở đúng vị trí.`,
      [],
      [],
      i,
      minimumIndex,
    )
  }

  // Phần tử cuối cùng chắc chắn đã đúng vị trí
  sortedIndices.add(n - 1)

  addStep(
    `${values[n - 1]!} là phần tử cuối cùng và đã ở đúng vị trí.`,
    [],
    [],
    n - 1,
    n - 1,
  )

  // Đảm bảo tất cả phần tử được đánh dấu sorted
  for (let index = 0; index < n; index++) {
    sortedIndices.add(index)
  }

  addStep(
    'Hoàn thành Selection Sort. Tất cả phần tử đã được sắp xếp.',
  )

  return steps
}