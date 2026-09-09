<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  Coins,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Target,
  Zap,
} from 'lucide-vue-next'

useHead({
  title: 'Greedy Algorithm Playground',
})

/* =========================================================
   TYPES
========================================================= */

type SimulationStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'

type GreedyAction =
  | 'idle'
  | 'select'
  | 'compare'
  | 'take'
  | 'complete'

interface GreedySimulationStep {
  coins: number[]
  selectedCoins: number[]
  remaining: number
  target: number
  currentIndex?: number
  comparing: number[]
  selectedIndex?: number
  action: GreedyAction
  description: string
}

/* =========================================================
   DATA
========================================================= */

const initialCoins: number[] = [
  1,
  5,
  10,
  25,
]

const initialTarget = 63

const coins = ref<number[]>([
  ...initialCoins,
])

const target = ref<number>(
  initialTarget,
)

const steps = ref<GreedySimulationStep[]>([])

const currentStep = ref<number>(0)

const status = ref<SimulationStatus>(
  'idle',
)

const speed = ref<number>(650)

let timer: ReturnType<typeof setTimeout> | null =
  null

/* =========================================================
   COMPLEXITY
========================================================= */

const complexity = {
  best: 'O(k)',
  average: 'O(k)',
  worst: 'O(k)',
  space: 'O(k)',
}

/*
 * k = số loại coin.
 *
 * Nếu cần tìm coin bằng cách duyệt toàn bộ denominations
 * ở mỗi lần chọn, complexity phụ thuộc vào số lần chọn.
 *
 * Với danh sách coin đã sort giảm dần và duyệt tuyến tính,
 * trường hợp tổng quát là O(k * m), trong đó m là số coin
 * được chọn.
 *
 * Ở visualization này ta sort một lần rồi duyệt từ lớn -> nhỏ.
 */

/* =========================================================
   COMPUTED
========================================================= */

const currentSimulation = computed<
  GreedySimulationStep | null
>(() => {
  if (steps.value.length === 0) {
    return null
  }

  return (
    steps.value[currentStep.value] ??
    null
  )
})

const currentRemaining = computed<number>(() => {
  return (
    currentSimulation.value?.remaining ??
    target.value
  )
})

const currentSelectedCoins = computed<number[]>(
  () => {
    return (
      currentSimulation.value?.selectedCoins ??
      []
    )
  },
)

const currentComparing = computed<number[]>(() => {
  return (
    currentSimulation.value?.comparing ??
    []
  )
})

const currentIndex = computed<number | null>(
  () => {
    return (
      currentSimulation.value?.currentIndex ??
      null
    )
  },
)

const currentSelectedIndex = computed<
  number | null
>(() => {
  return (
    currentSimulation.value?.selectedIndex ??
    null
  )
})

const currentAction = computed<GreedyAction>(
  () => {
    return (
      currentSimulation.value?.action ??
      'idle'
    )
  },
)

const currentDescription = computed<string>(
  () => {
    return (
      currentSimulation.value?.description ??
      'Nhấn Play Simulation để bắt đầu.'
    )
  },
)

const selectedTotal = computed<number>(() => {
  return currentSelectedCoins.value.reduce(
    (sum, value) => sum + value,
    0,
  )
})

const progress = computed<number>(() => {
  if (steps.value.length <= 1) {
    return 0
  }

  return Math.round(
    (currentStep.value /
      (steps.value.length - 1)) *
      100,
  )
})

const isFirstStep = computed<boolean>(() => {
  return currentStep.value <= 0
})

const isLastStep = computed<boolean>(() => {
  return (
    steps.value.length > 0 &&
    currentStep.value >=
      steps.value.length - 1
  )
})

const statusLabel = computed<string>(() => {
  switch (status.value) {
    case 'running':
      return 'Running'

    case 'paused':
      return 'Paused'

    case 'completed':
      return 'Completed'

    default:
      return 'Ready'
  }
})

const coinMax = computed<number>(() => {
  return Math.max(
    ...coins.value,
    1,
  )
})

const solutionCount = computed<number>(() => {
  return currentSelectedCoins.value.length
})

/* =========================================================
   HELPERS
========================================================= */

function isComparing(
  index: number,
): boolean {
  return currentComparing.value.includes(index)
}

function isSelected(
  index: number,
): boolean {
  return (
    currentSimulation.value?.coins[
      index
    ] !== undefined &&
    currentSelectedCoins.value.includes(
      currentSimulation.value.coins[index]!,
    )
  )
}

function isCurrent(
  index: number,
): boolean {
  return currentIndex.value === index
}

function isSelectedIndex(
  index: number,
): boolean {
  return (
    currentSelectedIndex.value === index
  )
}

function getCoinHeight(
  value: number,
): string {
  const minHeight = 80
  const maxHeight = 220

  const height =
    (value / coinMax.value) *
    maxHeight

  return `${Math.max(height, minHeight)}px`
}

function getCoinClass(
  index: number,
): string {
  if (isSelectedIndex(index)) {
    return 'coin-selected-current'
  }

  if (isSelected(index)) {
    return 'coin-selected'
  }

  if (isComparing(index)) {
    return 'coin-comparing'
  }

  if (isCurrent(index)) {
    return 'coin-current'
  }

  return 'coin-default'
}

function getCoinValueClass(
  index: number,
): string {
  if (isSelectedIndex(index)) {
    return 'text-emerald-300'
  }

  if (isSelected(index)) {
    return 'text-emerald-400'
  }

  if (isComparing(index)) {
    return 'text-blue-400'
  }

  if (isCurrent(index)) {
    return 'text-violet-400'
  }

  return 'text-slate-300'
}

function getCoinStatusLabel(
  index: number,
): string {
  if (isSelectedIndex(index)) {
    return 'TAKE'
  }

  if (isComparing(index)) {
    return 'CHECK'
  }

  if (isCurrent(index)) {
    return 'CURRENT'
  }

  if (isSelected(index)) {
    return 'USED'
  }

  return ''
}

/* =========================================================
   SIMULATION
========================================================= */

/**
 * Greedy Coin Change
 *
 * Ví dụ:
 *
 * coins = [1, 5, 10, 25]
 * target = 63
 *
 * Greedy:
 *
 * 25 -> remaining 38
 * 25 -> remaining 13
 * 10 -> remaining 3
 * 1  -> remaining 2
 * 1  -> remaining 1
 * 1  -> remaining 0
 *
 * Tổng cộng 6 coins.
 *
 * Lưu ý:
 * Greedy Coin Change không phải lúc nào cũng cho
 * nghiệm tối ưu với mọi hệ tiền.
 */
function generateGreedySteps(
  inputCoins: number[],
  inputTarget: number,
): GreedySimulationStep[] {
  const sortedCoins = [
    ...inputCoins,
  ]
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value > 0,
    )
    .sort(
      (a, b) => b - a,
    )

  const steps: GreedySimulationStep[] =
    []

  const selectedCoins: number[] = []

  let remaining =
    inputTarget

  const addStep = (
    description: string,
    comparing: number[] = [],
    currentIndex?: number,
    selectedIndex?: number,
    action: GreedyAction = 'idle',
  ): void => {
    steps.push({
      coins: [
        ...sortedCoins,
      ],

      selectedCoins: [
        ...selectedCoins,
      ],

      remaining,

      target: inputTarget,

      currentIndex,

      comparing: [
        ...comparing,
      ],

      selectedIndex,

      action,

      description,
    })
  }

  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    sortedCoins.length === 0
  ) {
    addStep(
      'Không có mệnh giá tiền hợp lệ để xử lý.',
      [],
      undefined,
      undefined,
      'complete',
    )

    return steps
  }

  /* =======================================================
     INVALID TARGET
  ======================================================= */

  if (
    !Number.isFinite(inputTarget) ||
    inputTarget <= 0
  ) {
    addStep(
      'Số tiền mục tiêu phải lớn hơn 0.',
      [],
      undefined,
      undefined,
      'complete',
    )

    return steps
  }

  /* =======================================================
     INITIAL
  ======================================================= */

  addStep(
    `Bắt đầu Greedy. Mục tiêu là tạo ${inputTarget} bằng cách chọn đồng tiền lớn nhất có thể.`,
    [],
    undefined,
    undefined,
    'idle',
  )

  /* =======================================================
     MAIN LOOP
  ======================================================= */

  while (
    remaining > 0
  ) {
    let selected = false

    for (
      let index = 0;
      index < sortedCoins.length;
      index++
    ) {
      const coin =
        sortedCoins[index]!

      /* -----------------------------------------------------
         COMPARE
      ----------------------------------------------------- */

      addStep(
        `Xét đồng ${coin}. Kiểm tra xem ${coin} có ≤ số tiền còn lại ${remaining} hay không.`,
        [
          index,
        ],
        index,
        undefined,
        'compare',
      )

      /* -----------------------------------------------------
         CANNOT TAKE
      ----------------------------------------------------- */

      if (
        coin > remaining
      ) {
        addStep(
          `${coin} > ${remaining} → không thể chọn đồng ${coin}. Tiếp tục xét mệnh giá nhỏ hơn.`,
          [
            index,
          ],
          index,
          undefined,
          'compare',
        )

        continue
      }

      /* -----------------------------------------------------
         TAKE
      ----------------------------------------------------- */

      selectedCoins.push(
        coin,
      )

      remaining -= coin

      addStep(
        `${coin} ≤ số tiền còn lại → chọn đồng ${coin}. Còn lại ${remaining}.`,
        [],
        index,
        index,
        'take',
      )

      selected = true

      break
    }

    /* -------------------------------------------------------
       CANNOT COMPLETE
    ------------------------------------------------------- */

    if (!selected) {
      addStep(
        `Không còn đồng tiền nào phù hợp. Không thể tạo chính xác số tiền còn lại.`,
        [],
        undefined,
        undefined,
        'complete',
      )

      break
    }
  }

  /* =======================================================
     FINAL
  ======================================================= */

  if (
    remaining === 0
  ) {
    addStep(
      `Hoàn thành Greedy. Đã tạo chính xác ${inputTarget} bằng ${selectedCoins.length} đồng tiền.`,
      [],
      undefined,
      undefined,
      'complete',
    )
  }

  return steps
}

/* =========================================================
   SIMULATION CONTROLS
========================================================= */

function initializeSimulation(): void {
  stopTimer()

  steps.value =
    generateGreedySteps(
      coins.value,
      target.value,
    )

  currentStep.value = 0

  status.value = 'idle'
}

function reset(): void {
  coins.value = [
    ...initialCoins,
  ]

  target.value =
    initialTarget

  initializeSimulation()
}

function randomize(): void {
  stopTimer()

  const generatedCoins =
    new Set<number>()

  while (
    generatedCoins.size < 5
  ) {
    generatedCoins.add(
      Math.floor(
        Math.random() * 45,
      ) + 1,
    )
  }

  coins.value = [
    ...generatedCoins,
  ].sort(
    (a, b) => a - b,
  )

  target.value =
    Math.floor(
      Math.random() * 100,
    ) + 30

  steps.value =
    generateGreedySteps(
      coins.value,
      target.value,
    )

  currentStep.value = 0

  status.value = 'idle'
}

function goToNextStep(): void {
  if (
    steps.value.length === 0
  ) {
    return
  }

  if (
    isLastStep.value
  ) {
    status.value = 'completed'

    stopTimer()

    return
  }

  currentStep.value += 1

  if (
    isLastStep.value
  ) {
    status.value = 'completed'

    stopTimer()
  }
}

function goToPreviousStep(): void {
  if (
    steps.value.length === 0
  ) {
    return
  }

  if (
    isFirstStep.value
  ) {
    return
  }

  currentStep.value -= 1

  status.value = 'paused'

  stopTimer()
}

function play(): void {
  if (
    steps.value.length === 0
  ) {
    initializeSimulation()
  }

  if (
    isLastStep.value
  ) {
    currentStep.value = 0
  }

  status.value = 'running'

  scheduleNextStep()
}

function pause(): void {
  status.value = 'paused'

  stopTimer()
}

function togglePlay(): void {
  if (
    status.value === 'running'
  ) {
    pause()

    return
  }

  play()
}

function scheduleNextStep(): void {
  stopTimer()

  if (
    status.value !== 'running'
  ) {
    return
  }

  if (
    isLastStep.value
  ) {
    status.value = 'completed'

    return
  }

  timer = setTimeout(() => {
    goToNextStep()

    if (
      status.value === 'running'
    ) {
      scheduleNextStep()
    }
  }, speed.value)
}

function stopTimer(): void {
  if (
    timer !== null
  ) {
    clearTimeout(timer)

    timer = null
  }
}

/* =========================================================
   WATCHERS / LIFECYCLE
========================================================= */

watch(
  speed,
  () => {
    if (
      status.value === 'running'
    ) {
      scheduleNextStep()
    }
  },
)

onMounted(() => {
  initializeSimulation()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <div
    class="min-h-screen bg-slate-950 text-slate-100"
  >
    <!-- =====================================================
         HEADER
    ====================================================== -->

    <header
      class="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4"
      >
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
          @click="$router.back()"
        >
          <ArrowLeft
            class="h-4 w-4"
          />

          Algorithms
        </button>

        <div
          class="h-5 w-px bg-slate-800"
        />

        <div>
          <div
            class="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400"
          >
            Algorithm Design
          </div>

          <h1
            class="text-sm font-bold text-white"
          >
            Greedy Algorithm
          </h1>
        </div>
      </div>
    </header>

    <main
      class="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:py-10"
    >
      <!-- ===================================================
           HERO
      ==================================================== -->

      <section
        class="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-7 lg:p-10"
      >
        <div
          class="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div
          class="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl"
        />

        <div
          class="relative max-w-4xl"
        >
          <div
            class="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400"
          >
            <span
              class="h-1.5 w-1.5 rounded-full bg-emerald-400"
            />

            ALGORITHM DESIGN
          </div>

          <h2
            class="text-4xl font-black tracking-tight text-white sm:text-5xl"
          >
            Greedy Algorithm
          </h2>

          <p
            class="mt-5 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg"
          >
            Thuật toán tham lam xây dựng lời giải bằng cách
            luôn chọn lựa chọn tốt nhất tại thời điểm hiện tại,
            với hy vọng chuỗi lựa chọn cục bộ đó tạo ra một
            lời giải tối ưu toàn cục.
          </p>

          <div
            class="mt-7 flex flex-wrap gap-3"
          >
            <div
              class="flex items-center gap-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.06] px-4 py-2.5 text-xs text-emerald-300"
            >
              <Zap
                class="h-4 w-4"
              />

              Local Optimal Choice
            </div>

            <div
              class="flex items-center gap-2 rounded-xl border border-blue-500/10 bg-blue-500/[0.06] px-4 py-2.5 text-xs text-blue-300"
            >
              <Target
                class="h-4 w-4"
              />

              Global Solution
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================
           INTRODUCTION
      ==================================================== -->

      <section
        class="rounded-3xl border border-slate-800 bg-slate-900 p-6 lg:p-8"
      >
        <div
          class="mb-6 flex items-center gap-3"
        >
          <div
            class="h-8 w-1 rounded-full bg-emerald-500"
          />

          <h3
            class="text-xl font-black text-white"
          >
            Giới thiệu thuật toán
          </h3>
        </div>

        <div
          class="grid gap-8 lg:grid-cols-2"
        >
          <div
            class="space-y-4 text-sm leading-7 text-slate-400"
          >
            <p>
              Greedy không cố gắng xem xét tất cả các khả năng.
              Thay vào đó, thuật toán đưa ra quyết định tốt nhất
              <strong class="text-white">
                ngay tại thời điểm hiện tại
              </strong>.
            </p>

            <p>
              Trong ví dụ Coin Change, ở mỗi bước ta chọn đồng
              tiền lớn nhất nhưng không vượt quá số tiền còn lại.
            </p>

            <p>
              Điểm quan trọng là chiến lược Greedy
              <strong class="text-white">
                không phải lúc nào cũng tạo ra nghiệm tối ưu
              </strong>
              cho mọi bài toán.
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-800 bg-slate-950 p-5"
          >
            <div
              class="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500"
            >
              Greedy Strategy
            </div>

            <div
              class="space-y-3"
            >
              <div
                class="flex items-center gap-3"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-400"
                >
                  1
                </span>

                <span class="text-sm text-slate-400">
                  Xác định các lựa chọn khả thi.
                </span>
              </div>

              <div
                class="flex items-center gap-3"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400"
                >
                  2
                </span>

                <span class="text-sm text-slate-400">
                  Chọn lựa chọn tốt nhất hiện tại.
                </span>
              </div>

              <div
                class="flex items-center gap-3"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-400"
                >
                  3
                </span>

                <span class="text-sm text-slate-400">
                  Cập nhật trạng thái bài toán.
                </span>
              </div>

              <div
                class="flex items-center gap-3"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-400"
                >
                  4
                </span>

                <span class="text-sm text-slate-400">
                  Lặp lại cho đến khi hoàn thành.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================
           USE CASES
      ==================================================== -->

      <section
        class="grid gap-5 md:grid-cols-2"
      >
        <div
          class="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-slate-900 p-6"
        >
          <div
            class="flex items-center gap-3"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"
            >
              <Check
                class="h-5 w-5 text-emerald-400"
              />
            </div>

            <div>
              <h3
                class="font-bold text-emerald-400"
              >
                Khi nào nên sử dụng?
              </h3>

              <p
                class="text-xs text-slate-600"
              >
                Good use cases
              </p>
            </div>
          </div>

          <ul
            class="mt-6 space-y-3 text-sm text-slate-400"
          >
            <li>
              • Activity Selection.
            </li>

            <li>
              • Fractional Knapsack.
            </li>

            <li>
              • Huffman Coding.
            </li>

            <li>
              • Minimum Spanning Tree.
            </li>

            <li>
              • Một số bài toán Coin Change.
            </li>
          </ul>
        </div>

        <div
          class="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/[0.08] to-slate-900 p-6"
        >
          <div
            class="flex items-center gap-3"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10"
            >
              <span
                class="text-lg font-black text-red-400"
              >
                ×
              </span>
            </div>

            <div>
              <h3
                class="font-bold text-red-400"
              >
                Khi nào không nên sử dụng?
              </h3>

              <p
                class="text-xs text-slate-600"
              >
                Be careful
              </p>
            </div>
          </div>

          <ul
            class="mt-6 space-y-3 text-sm text-slate-400"
          >
            <li>
              • Khi local optimum không đảm bảo global optimum.
            </li>

            <li>
              • 0/1 Knapsack.
            </li>

            <li>
              • Một số biến thể Coin Change.
            </li>

            <li>
              • Khi cần xét lại quyết định trước đó.
            </li>
          </ul>
        </div>
      </section>

      <!-- ===================================================
           LIVE SIMULATION
      ==================================================== -->

      <section
        class="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900 shadow-2xl shadow-emerald-950/20"
      >
        <div
          class="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div
          class="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl"
        />

        <!-- HEADER -->

        <div
          class="relative border-b border-slate-800 bg-slate-900/90 px-6 py-5"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-5"
          >
            <div
              class="flex items-center gap-4"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10"
              >
                <span
                  class="relative flex h-3 w-3"
                >
                  <span
                    v-if="status === 'running'"
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  />

                  <span
                    class="relative inline-flex h-3 w-3 rounded-full"
                    :class="{
                      'bg-emerald-400':
                        status === 'running',

                      'bg-violet-400':
                        status === 'completed',

                      'bg-slate-500':
                        status === 'idle' ||
                        status === 'paused',
                    }"
                  />
                </span>
              </div>

              <div>
                <div
                  class="flex flex-wrap items-center gap-3"
                >
                  <h3
                    class="text-xl font-black tracking-tight text-white"
                  >
                    LIVE SIMULATION
                  </h3>

                  <span
                    class="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    :class="{
                      'border-emerald-500/20 bg-emerald-500/10 text-emerald-400':
                        status === 'running',

                      'border-amber-500/20 bg-amber-500/10 text-amber-400':
                        status === 'paused',

                      'border-violet-500/20 bg-violet-500/10 text-violet-400':
                        status === 'completed',

                      'border-slate-700 bg-slate-800 text-slate-400':
                        status === 'idle',
                    }"
                  >
                    {{ statusLabel }}
                  </span>
                </div>

                <p
                  class="mt-1 text-sm text-slate-500"
                >
                  Quan sát cách Greedy luôn chọn lựa chọn tốt nhất hiện tại.
                </p>
              </div>
            </div>

            <div
              class="flex gap-3"
            >
              <div
                class="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3"
              >
                <div
                  class="text-[10px] font-bold uppercase tracking-widest text-slate-600"
                >
                  Remaining
                </div>

                <div
                  class="mt-1 flex items-baseline gap-1"
                >
                  <span
                    class="text-2xl font-black text-white"
                  >
                    {{ currentRemaining }}
                  </span>
                </div>
              </div>

              <div
                class="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3"
              >
                <div
                  class="text-[10px] font-bold uppercase tracking-widest text-slate-600"
                >
                  Coins
                </div>

                <div
                  class="mt-1 flex items-baseline gap-1"
                >
                  <span
                    class="text-2xl font-black text-emerald-400"
                  >
                    {{ solutionCount }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PROGRESS -->

        <div
          class="relative h-1 bg-slate-800"
        >
          <div
            class="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-400 transition-all duration-300"
            :style="{
              width: `${progress}%`,
            }"
          />
        </div>

        <!-- BODY -->

        <div
          class="relative p-6 lg:p-8"
        >
          <!-- CURRENT OPERATION -->

          <div
            class="mb-7 flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"
            >
              <Coins
                class="h-5 w-5"
              />
            </div>

            <div class="min-w-0">
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400"
              >
                Current Operation
              </div>

              <p
                class="mt-1 text-base font-medium leading-7 text-slate-200"
              >
                {{ currentDescription }}
              </p>
            </div>
          </div>

          <!-- TARGET / REMAINING -->

          <div
            class="mb-7 grid gap-4 sm:grid-cols-3"
          >
            <div
              class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
            >
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600"
              >
                Target
              </div>

              <div
                class="mt-2 text-3xl font-black text-white"
              >
                {{ target }}
              </div>
            </div>

            <div
              class="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5"
            >
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600"
              >
                Selected Total
              </div>

              <div
                class="mt-2 text-3xl font-black text-emerald-400"
              >
                {{ selectedTotal }}
              </div>
            </div>

            <div
              class="rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-5"
            >
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600"
              >
                Remaining
              </div>

              <div
                class="mt-2 text-3xl font-black text-blue-400"
              >
                {{ currentRemaining }}
              </div>
            </div>
          </div>

          <!-- =================================================
               COIN VISUALIZER
          ================================================== -->

          <div
            class="coin-stage relative overflow-hidden rounded-3xl border border-slate-800 bg-[#080d18] p-4 sm:p-8"
          >
            <!-- Background -->

            <div
              class="pointer-events-none absolute inset-0 opacity-[0.035]"
              style="
                background-image:
                  linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
                background-size: 32px 32px;
              "
            />

            <!-- Header -->

            <div
              class="relative mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600"
                >
                  Available Denominations
                </div>

                <div
                  class="mt-1 text-xs text-slate-500"
                >
                  Greedy xét từ lớn → nhỏ
                </div>
              </div>

              <div
                class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400"
              >
                Action:
                {{ currentAction.toUpperCase() }}
              </div>
            </div>

            <!-- COINS -->

            <div
              class="relative flex min-h-[350px] items-end gap-3 sm:gap-5"
            >
              <div
                v-for="(coin, index) in currentSimulation?.coins ?? coins"
                :key="`${coin}-${index}`"
                class="coin-item relative flex min-w-0 flex-1 flex-col items-center justify-end"
              >
                <!-- STATUS -->

                <div
                  class="mb-2 h-5 text-center text-[9px] font-black uppercase tracking-wider"
                >
                  <span
                    v-if="getCoinStatusLabel(index)"
                    :class="{
                        'text-emerald-400':
                        isSelectedIndex(index) ||
                        (
                            isSelected(index) &&
                            !isSelectedIndex(index)
                        ),

                        'text-blue-400':
                        isComparing(index),

                        'text-violet-400':
                        isCurrent(index) &&
                        !isComparing(index),
                    }"
                    >
                    {{ getCoinStatusLabel(index) }}
                    </span>
                </div>

                <!-- VALUE -->

                <div
                  class="relative z-10 mb-3 text-sm font-black transition-[color,text-shadow] duration-200 sm:text-base"
                  :class="[
                    getCoinValueClass(index),
                    {
                      'value-glow':
                        isCurrent(index) ||
                        isComparing(index) ||
                        isSelected(index),
                    },
                  ]"
                >
                  {{ coin }}
                </div>

                <!-- COIN -->

                <div
                  class="coin relative flex w-full items-center justify-center"
                  :class="getCoinClass(index)"
                  :style="{
                    height: getCoinHeight(coin),
                  }"
                >
                  <div
                    class="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40"
                  />

                  <div
                    class="pointer-events-none absolute inset-x-0 top-0 h-10 bg-white/[0.08] blur-md"
                  />

                  <span
                    class="relative z-10 text-xl font-black sm:text-3xl"
                    :class="getCoinValueClass(index)"
                  >
                    {{ coin }}
                  </span>

                  <span
                    class="absolute bottom-3 text-[8px] font-bold uppercase tracking-[0.2em] opacity-60"
                  >
                    coin
                  </span>
                </div>

                <!-- INDEX -->

                <div
                  class="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-[10px] font-bold text-slate-600 transition-[border-color,color,background] duration-200"
                  :class="{
                    'border-emerald-500/40 bg-emerald-500/10 text-emerald-400':
                      isSelectedIndex(index),

                    'border-blue-500/40 bg-blue-500/10 text-blue-400':
                      isComparing(index),

                    'border-violet-500/40 bg-violet-500/10 text-violet-400':
                      isCurrent(index) &&
                      !isComparing(index),

                    'border-emerald-500/30 bg-emerald-500/5 text-emerald-400':
                      isSelected(index) &&
                      !isSelectedIndex(index),
                  }"
                >
                  {{ index }}
                </div>
              </div>
            </div>

            <!-- SELECTED COINS -->

            <div
              class="relative mt-8 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div
                    class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400"
                  >
                    Selected Coins
                  </div>

                  <div
                    class="mt-1 text-xs text-slate-600"
                  >
                    Các lựa chọn Greedy đã thực hiện
                  </div>
                </div>

                <div
                  class="font-mono text-sm font-bold text-slate-300"
                >
                  {{ selectedTotal }}
                  /
                  {{ target }}
                </div>
              </div>

              <div
                v-if="currentSelectedCoins.length > 0"
                class="mt-4 flex flex-wrap gap-2"
              >
                <div
                  v-for="(
                    selectedCoin,
                    index
                  ) in currentSelectedCoins"
                  :key="`${selectedCoin}-${index}`"
                  class="flex h-10 min-w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-sm font-black text-emerald-400"
                >
                  {{ selectedCoin }}
                </div>
              </div>

              <div
                v-else
                class="mt-4 text-xs text-slate-600"
              >
                Chưa chọn đồng tiền nào.
              </div>
            </div>
          </div>

          <!-- LEGEND -->

          <div
            class="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-violet-400"
              />

              Current
            </div>

            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-blue-400"
              />

              Checking
            </div>

            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-emerald-400"
              />

              Selected
            </div>
          </div>

          <!-- PROGRESS -->

          <div class="mt-7">
            <div
              class="mb-2 flex justify-between text-xs"
            >
              <span
                class="font-medium text-slate-500"
              >
                Simulation Progress
              </span>

              <span
                class="font-bold text-slate-300"
              >
                {{ progress }}%
              </span>
            </div>

            <div
              class="h-1.5 overflow-hidden rounded-full bg-slate-800"
            >
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                :style="{
                  width: `${progress}%`,
                }"
              />
            </div>
          </div>

          <!-- CONTROLS -->

          <div
            class="mt-8 flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <div
              class="flex flex-wrap items-center justify-center gap-2"
            >
              <!-- PREVIOUS -->

              <button
                type="button"
                :disabled="isFirstStep"
                class="group flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                @click="goToPreviousStep"
              >
                <SkipBack
                  class="h-4 w-4 transition group-hover:-translate-x-0.5"
                />
              </button>

              <!-- PLAY -->

              <button
                type="button"
                class="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98]"
                @click="togglePlay"
              >
                <Pause
                  v-if="status === 'running'"
                  class="h-4 w-4"
                />

                <Play
                  v-else
                  class="h-4 w-4 fill-current"
                />

                {{
                  status === 'running'
                    ? 'Pause'
                    : 'Play Simulation'
                }}
              </button>

              <!-- NEXT -->

              <button
                type="button"
                :disabled="isLastStep"
                class="group flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                @click="goToNextStep"
              >
                <SkipForward
                  class="h-4 w-4 transition group-hover:translate-x-0.5"
                />
              </button>

              <!-- RESET -->

              <button
                type="button"
                class="ml-2 flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                @click="reset"
              >
                <RotateCcw
                  class="h-4 w-4"
                />

                Reset
              </button>

              <!-- RANDOMIZE -->

              <button
                type="button"
                class="flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                @click="randomize"
              >
                <Shuffle
                  class="h-4 w-4"
                />

                Randomize
              </button>
            </div>

            <!-- SPEED -->

            <div
              class="mx-auto w-full max-w-xl"
            >
              <div
                class="mb-3 flex items-center justify-between"
              >
                <span
                  class="text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Simulation Speed
                </span>

                <span
                  class="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300"
                >
                  {{ speed }} ms
                </span>
              </div>

              <input
                v-model.number="speed"
                type="range"
                min="100"
                max="1500"
                step="50"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-500"
              />

              <div
                class="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-slate-700"
              >
                <span>Fast</span>

                <span>Slow</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================
           PSEUDOCODE + COMPLEXITY
      ==================================================== -->

      <section
        class="grid gap-6 lg:grid-cols-5"
      >
        <!-- PSEUDOCODE -->

        <div
          class="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900 shadow-xl shadow-emerald-950/10 lg:col-span-3"
        >
          <div
            class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          />

          <div
            class="relative flex items-center justify-between border-b border-slate-800 px-6 py-5"
          >
            <div
              class="flex items-center gap-4"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10"
              >
                <span
                  class="font-mono text-lg font-black text-emerald-400"
                >
                  &lt;/&gt;
                </span>
              </div>

              <div>
                <h3
                  class="text-lg font-black text-white"
                >
                  PSEUDOCODE
                </h3>

                <p
                  class="mt-0.5 text-xs text-slate-500"
                >
                  Greedy Coin Change
                </p>
              </div>
            </div>

            <span
              class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400"
            >
              Greedy
            </span>
          </div>

          <div class="relative p-5 sm:p-6">
            <div
              class="overflow-hidden rounded-2xl border border-slate-800 bg-[#070b13]"
            >
              <div
                class="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full bg-red-400/70"
                />

                <span
                  class="h-2.5 w-2.5 rounded-full bg-amber-400/70"
                />

                <span
                  class="h-2.5 w-2.5 rounded-full bg-emerald-400/70"
                />

                <span
                  class="ml-3 font-mono text-[10px] text-slate-600"
                >
                  greedy-coin-change.pseudo
                </span>
              </div>

              <div
                class="overflow-x-auto p-5"
              >
                <div
                  class="min-w-[560px] font-mono text-[13px] leading-8"
                >
                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      01
                    </span>

                    <span class="ml-5 text-slate-500">
                      // Sort denominations descending
                    </span>
                  </div>

                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      02
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        sort
                      </span>

                      <span class="text-slate-300">
                        coins descending
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-emerald-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-emerald-500/50"
                    >
                      03
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        remaining
                      </span>

                      <span class="text-slate-300">
                        = target
                      </span>
                    </span>
                  </div>

                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      04
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        while
                      </span>

                      <span class="text-slate-300">
                        remaining &gt; 0
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-blue-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-blue-500/50"
                    >
                      05
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        choose
                      </span>

                      <span class="text-slate-300">
                        largest coin ≤ remaining
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-amber-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-amber-500/50"
                    >
                      06
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        take
                      </span>

                      <span class="text-slate-300">
                        selected coin
                      </span>
                    </span>
                  </div>

                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      07
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        remaining
                      </span>

                      <span class="text-slate-300">
                        -= coin
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-emerald-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-emerald-500/50"
                    >
                      08
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        repeat
                      </span>

                      <span class="text-slate-300">
                        until remaining = 0
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="mt-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4"
            >
              <div
                class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400"
              >
                Greedy Principle
              </div>

              <p
                class="mt-2 text-sm leading-6 text-slate-400"
              >
                Ở mỗi bước, không quay lại quyết định trước đó.
                Thuật toán chỉ quan tâm lựa chọn tốt nhất
                trong trạng thái hiện tại.
              </p>
            </div>
          </div>
        </div>

        <!-- COMPLEXITY -->

        <div
          class="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900 shadow-xl shadow-cyan-950/10 lg:col-span-2"
        >
          <div
            class="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
          />

          <div
            class="relative border-b border-slate-800 px-6 py-5"
          >
            <div
              class="flex items-center gap-4"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10"
              >
                <span
                  class="font-mono text-xl font-black text-cyan-400"
                >
                  O
                </span>
              </div>

              <div>
                <h3
                  class="text-lg font-black text-white"
                >
                  COMPLEXITY
                </h3>

                <p
                  class="mt-0.5 text-xs text-slate-500"
                >
                  Performance analysis
                </p>
              </div>
            </div>
          </div>

          <div class="relative grid gap-3 p-5">
            <div
              class="group rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4 transition hover:border-emerald-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Selection
                </span>

                <span
                  class="rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400"
                >
                  GREEDY
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-emerald-400"
              >
                {{ complexity.best }}
              </div>

              <p
                class="mt-2 text-xs leading-5 text-slate-600"
              >
                Duyệt qua các denomination.
              </p>
            </div>

            <div
              class="group rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-4 transition hover:border-blue-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Sorting
                </span>

                <span
                  class="rounded-lg bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-400"
                >
                  PREPARE
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-blue-400"
              >
                O(k log k)
              </div>

              <p
                class="mt-2 text-xs leading-5 text-slate-600"
              >
                Nếu cần sort denominations trước.
              </p>
            </div>

            <div
              class="group rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-4 transition hover:border-violet-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Space
                </span>

                <span
                  class="rounded-lg bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-violet-400"
                >
                  MEMORY
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-violet-400"
              >
                O(k)
              </div>

              <p
                class="mt-2 text-xs leading-5 text-slate-600"
              >
                Do lưu danh sách các lựa chọn.
              </p>
            </div>

            <div
              class="rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4"
            >
              <div
                class="text-[10px] font-black uppercase tracking-[0.2em] text-red-400"
              >
                Important
              </div>

              <p
                class="mt-2 text-xs leading-5 text-slate-500"
              >
                Complexity và tính tối ưu phụ thuộc vào
                bài toán cụ thể. Greedy không tự động đảm bảo
                optimal solution.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================
           PHP
      ==================================================== -->

      <section
        class="overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-900 shadow-xl shadow-indigo-950/10"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5"
        >
          <div
            class="flex items-center gap-4"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10"
            >
              <span
                class="font-mono text-sm font-black text-indigo-400"
              >
                PHP
              </span>
            </div>

            <div>
              <h3
                class="text-lg font-black text-white"
              >
                PHP IMPLEMENTATION
              </h3>

              <p
                class="mt-0.5 text-xs text-slate-500"
              >
                Greedy Coin Change
              </p>
            </div>
          </div>

          <span
            class="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400"
          >
            PHP 8+
          </span>
        </div>

        <div class="p-5 sm:p-6">
          <div
            class="overflow-hidden rounded-2xl border border-slate-800 bg-[#070b13]"
          >
            <div
              class="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-red-400/70"
              />

              <span
                class="h-2.5 w-2.5 rounded-full bg-amber-400/70"
              />

              <span
                class="h-2.5 w-2.5 rounded-full bg-emerald-400/70"
              />

              <span
                class="ml-3 font-mono text-[10px] text-slate-600"
              >
                GreedyCoinChange.php
              </span>
            </div>

            <pre
              class="overflow-x-auto p-6 font-mono text-[13px] leading-7 text-slate-300"
            ><code><span class="text-violet-400">function</span> <span class="text-blue-400">greedyCoinChange</span>(
    <span class="text-violet-400">array</span> $coins,
    <span class="text-violet-400">int</span> $target
): <span class="text-violet-400">array</span> {

    <span class="text-blue-400">rsort</span>($coins);

    $selected = [];

    $remaining = $target;

    <span class="text-violet-400">foreach</span> ($coins <span class="text-violet-400">as</span> $coin) {

        <span class="text-violet-400">while</span> (
            $remaining &gt;= $coin
        ) {

            $selected[] = $coin;

            $remaining -= $coin;
        }

        <span class="text-violet-400">if</span> (
            $remaining === <span class="text-amber-400">0</span>
        ) {
            <span class="text-violet-400">break</span>;
        }
    }

    <span class="text-violet-400">return</span> $selected;
}</code></pre>
          </div>
        </div>
      </section>

      <!-- ===================================================
           EXPLANATION
      ==================================================== -->

      <section
        class="rounded-3xl border border-slate-800 bg-slate-900 p-6 lg:p-8"
      >
        <div
          class="mb-5 flex items-center gap-3"
        >
          <div
            class="h-8 w-1 rounded-full bg-cyan-400"
          />

          <h3
            class="text-xl font-black text-white"
          >
            Tại sao gọi là "Greedy"?
          </h3>
        </div>

        <p
          class="max-w-4xl text-sm leading-7 text-slate-400"
        >
          "Greedy" có nghĩa là tham lam. Thuật toán luôn muốn
          lấy phần tốt nhất có thể ngay lập tức mà không quan
          tâm đến việc lựa chọn đó có làm thay đổi những quyết
          định sau này hay không.
        </p>

        <div
          class="mt-7 grid gap-4 md:grid-cols-3"
        >
          <div
            class="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-violet-400"
            >
              01 — Choose
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Chọn phương án tốt nhất trong trạng thái hiện tại.
            </p>
          </div>

          <div
            class="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-amber-400"
            >
              02 — Commit
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Chấp nhận lựa chọn và không quay lại thay đổi.
            </p>
          </div>

          <div
            class="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-emerald-400"
            >
              03 — Repeat
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Tiếp tục cho đến khi đạt được lời giải.
            </p>
          </div>
        </div>

        <!-- WARNING -->

        <div
          class="mt-7 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5"
        >
          <div
            class="flex items-start gap-3"
          >
            <div
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10"
            >
              <span
                class="font-black text-amber-400"
              >
                !
              </span>
            </div>

            <div>
              <div
                class="text-sm font-black text-amber-400"
              >
                Greedy không phải lúc nào cũng tối ưu
              </div>

              <p
                class="mt-1 text-xs leading-6 text-slate-500"
              >
                Đây là điểm quan trọng nhất cần nhớ.
                Muốn chứng minh Greedy đúng, bài toán thường
                phải có các tính chất như
                <span
                  class="font-semibold text-slate-300"
                >
                  greedy-choice property
                </span>
                và
                <span
                  class="font-semibold text-slate-300"
                >
                  optimal substructure
                </span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped src="~/assets/css/pages/algorithm/greedy/index.css"></style>
