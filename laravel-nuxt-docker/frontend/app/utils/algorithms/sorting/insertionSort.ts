import type {
  InsertionSortSimulationStep,
} from '~/types/algorithm/sort/insertion'

/**
 * Generate visual simulation steps for Insertion Sort.
 *
 * IMPORTANT:
 *
 * Thay vì mô phỏng shift trực tiếp:
 *
 * [45, 12, 87]
 * [45, 45, 87]  <-- BAD
 *
 * ta mô phỏng bằng adjacent swap:
 *
 * [45, 12, 87]
 * [12, 45, 87]  <-- GOOD
 *
 * Điều này giúp:
 *
 * 1. Không duplicate value.
 * 2. Không duplicate ID.
 * 3. TransitionGroup có thể FLIP chính xác.
 * 4. Animation phần tử thực sự di chuyển.
 */
export function generateInsertionSortSteps(
  input: number[],
): InsertionSortSimulationStep[] {
  const values: number[] = [
    ...input,
  ]

  /**
   * ID cố định cho từng phần tử.
   *
   * ID này đại diện cho "identity" của element,
   * không phải index hiện tại.
   */
  const ids: number[] = input.map(
    (_, index) => index,
  )

  const steps: InsertionSortSimulationStep[] = []

  /**
   * Những index hiện tại đã sorted.
   */
  const sortedIndices = new Set<number>()

  /**
   * Snapshot một trạng thái.
   */
  const addStep = (
    description: string,
    comparing: number[] = [],
    swapping: number[] = [],
    currentIndex?: number,
  ): void => {
    steps.push({
      values: [...values],

      ids: [...ids],

      comparing: [
        ...comparing,
      ],

      swapping: [
        ...swapping,
      ],

      sorted: [
        ...sortedIndices,
      ],

      description,

      currentIndex,
    })
  }

  const n: number = values.length

  /* =======================================================
     EMPTY
  ======================================================= */

  if (n === 0) {
    addStep(
      'Mảng rỗng. Không có phần tử nào để sắp xếp.',
    )

    return steps
  }

  /* =======================================================
     SINGLE ELEMENT
  ======================================================= */

  if (n === 1) {
    sortedIndices.add(0)

    addStep(
      `${values[0]} là phần tử duy nhất nên mảng đã được sắp xếp.`,
      [],
      [],
      0,
    )

    return steps
  }

  /* =======================================================
     INITIAL
  ======================================================= */

  sortedIndices.add(0)

  addStep(
    `Bắt đầu Insertion Sort. ${values[0]} được xem là đã sắp xếp.`,
    [],
    [],
    0,
  )

  /* =======================================================
     MAIN LOOP
  ======================================================= */

  for (let i = 1; i < n; i++) {
    let j: number = i

    const currentValue: number =
      values[i]!

    /* -------------------------------------------------------
       SELECT
    ------------------------------------------------------- */

    addStep(
      `Chọn ${currentValue} tại index ${i} để chèn vào vùng đã sắp xếp.`,
      [],
      [],
      i,
    )

    /* -------------------------------------------------------
       INSERTION
    ------------------------------------------------------- */

    while (j > 0) {
      const leftIndex: number =
        j - 1

      const rightIndex: number =
        j

      const leftValue: number =
        values[leftIndex]!

      const rightValue: number =
        values[rightIndex]!

      /* -----------------------------------------------------
         COMPARE
      ----------------------------------------------------- */

      addStep(
        `So sánh ${rightValue} với ${leftValue}.`,
        [
          leftIndex,
          rightIndex,
        ],
        [],
        rightIndex,
      )

      /* -----------------------------------------------------
         CORRECT POSITION
      ----------------------------------------------------- */

      if (leftValue <= rightValue) {
        addStep(
          `${leftValue} ≤ ${rightValue} → ${rightValue} đã ở đúng vị trí.`,
          [
            leftIndex,
            rightIndex,
          ],
          [],
          rightIndex,
        )

        break
      }

      /* -----------------------------------------------------
         MOVE
      ----------------------------------------------------- */

      addStep(
        `${leftValue} > ${rightValue} → dịch ${rightValue} sang trái.`,
        [
          leftIndex,
          rightIndex,
        ],
        [
          leftIndex,
          rightIndex,
        ],
        rightIndex,
      )

      /* -----------------------------------------------------
         SWAP VALUE
      ----------------------------------------------------- */

      const tempValue: number =
        values[leftIndex]!

      values[leftIndex] =
        values[rightIndex]!

      values[rightIndex] =
        tempValue

      /* -----------------------------------------------------
         SWAP ID
      ----------------------------------------------------- */

      const tempId: number =
        ids[leftIndex]!

      ids[leftIndex] =
        ids[rightIndex]!

      ids[rightIndex] =
        tempId

      /* -----------------------------------------------------
         AFTER MOVE
      ----------------------------------------------------- */

      addStep(
        `Đưa ${rightValue} từ index ${rightIndex} sang index ${leftIndex}.`,
        [],
        [
          leftIndex,
          rightIndex,
        ],
        leftIndex,
      )

      j--
    }

    /* -------------------------------------------------------
       SORTED REGION
    ------------------------------------------------------- */

    for (
      let index = 0;
      index <= i;
      index++
    ) {
      sortedIndices.add(index)
    }

    addStep(
      `Phần tử ${currentValue} đã được chèn. Vùng 0 → ${i} đã được sắp xếp.`,
      [],
      [],
      j,
    )
  }

  /* =======================================================
     FINAL
  ======================================================= */

  for (
    let index = 0;
    index < n;
    index++
  ) {
    sortedIndices.add(index)
  }

  addStep(
    'Hoàn thành Insertion Sort. Tất cả phần tử đã được sắp xếp.',
  )

  return steps
}
