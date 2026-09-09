<script setup lang="ts">
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-vue-next'

import type {
  Complexity,
  SimulationStatus,
  SimulationStep,
} from '~/types/algorithm'

useHead({
  title: 'Selection Sort Playground',
})

/* =========================================================
   DATA
========================================================= */

const initialValues: number[] = [
  45,
  12,
  87,
  34,
  9,
  63,
  21,
]

const values = ref<number[]>([...initialValues])

const steps = ref<SimulationStep[]>([])

const currentStep = ref<number>(0)

const status = ref<SimulationStatus>('idle')

const speed = ref<number>(700)

let timer: ReturnType<typeof setTimeout> | null = null

const complexity: Complexity = {
  best: 'O(n²)',
  average: 'O(n²)',
  worst: 'O(n²)',
  space: 'O(1)',
}

/* =========================================================
   SIMULATION GENERATOR
========================================================= */

function generateSelectionSortSteps(
  input: number[],
): SimulationStep[] {
  const array: number[] = [...input]

  const result: SimulationStep[] = []

  const sortedIndices = new Set<number>()

  const addStep = (
    description: string,
    comparing: number[] = [],
    swapping: number[] = [],
    currentIndex?: number,
    minimumIndex?: number,
  ): void => {
    result.push({
      values: [...array],
      comparing: [...comparing],
      swapping: [...swapping],
      sorted: Array.from(sortedIndices),
      description,
      currentIndex,
      minimumIndex,
    })
  }

  const n = array.length

  /* Empty */
  if (n === 0) {
    addStep(
      'Mảng rỗng. Không có phần tử nào để sắp xếp.',
    )

    return result
  }

  /* One element */
  if (n === 1) {
    sortedIndices.add(0)

    addStep(
      `${array[0]!} là phần tử duy nhất nên mảng đã được sắp xếp.`,
    )

    return result
  }

  addStep(
    `Bắt đầu Selection Sort với ${n} phần tử.`,
  )

  /*
   * Selection Sort:
   *
   * i = vị trí cần đặt phần tử nhỏ nhất
   * minIndex = vị trí phần tử nhỏ nhất hiện tại
   */
  for (let i = 0; i < n - 1; i++) {
    let minIndex = i

    addStep(
      `Bắt đầu vòng ${i + 1}. Tìm phần tử nhỏ nhất trong phần chưa được sắp xếp.`,
      [i],
      [],
      i,
      minIndex,
    )

    /*
     * Highlight phần tử đầu tiên như minimum hiện tại
     */
    addStep(
      `${array[minIndex]!} đang là phần tử nhỏ nhất tạm thời.`,
      [minIndex],
      [],
      i,
      minIndex,
    )

    /*
     * Search minimum
     */
    for (let j = i + 1; j < n; j++) {
      addStep(
        `So sánh ${array[j]!} với phần tử nhỏ nhất hiện tại ${array[minIndex]!}.`,
        [j, minIndex],
        [],
        j,
        minIndex,
      )

      if (array[j]! < array[minIndex]!) {
        minIndex = j

        addStep(
          `${array[minIndex]!} nhỏ hơn → cập nhật minimum.`,
          [minIndex],
          [],
          j,
          minIndex,
        )
      } else {
        addStep(
          `${array[j]!} không nhỏ hơn ${array[minIndex]!} → giữ minimum.`,
          [j, minIndex],
          [],
          j,
          minIndex,
        )
      }
    }

    /*
     * Swap nếu minimum không nằm ở i
     */
    if (minIndex !== i) {
      const currentValue = array[i]!
      const minimumValue = array[minIndex]!

      addStep(
        `${minimumValue} là nhỏ nhất → chuẩn bị đưa về vị trí ${i}.`,
        [i, minIndex],
        [i, minIndex],
        i,
        minIndex,
      )

      /*
       * Thực hiện swap
       */
      array[i] = minimumValue
      array[minIndex] = currentValue

      addStep(
        `Đã swap → ${array[i]!} được đặt vào vị trí ${i}.`,
        [],
        [i, minIndex],
        i,
        minIndex,
      )
    } else {
      addStep(
        `${array[i]!} đã là phần tử nhỏ nhất → không cần swap.`,
        [i],
        [],
        i,
        minIndex,
      )
    }

    /*
     * Phần tử tại i đã cố định
     */
    sortedIndices.add(i)

    addStep(
      `${array[i]!} đã được cố định ở vị trí ${i}.`,
    )
  }

  /*
   * Phần tử cuối cùng chắc chắn đã đúng vị trí
   */
  sortedIndices.add(n - 1)

  addStep(
    `${array[n - 1]!} là phần tử cuối cùng và đã ở đúng vị trí.`,
  )

  /*
   * Đảm bảo toàn bộ sorted
   */
  for (let i = 0; i < n; i++) {
    sortedIndices.add(i)
  }

  addStep(
    'Hoàn thành Selection Sort. Tất cả phần tử đã được sắp xếp.',
  )

  return result
}

/* =========================================================
   COMPUTED
========================================================= */

const currentSimulation = computed<SimulationStep | null>(() => {
  if (steps.value.length === 0) {
    return null
  }

  return steps.value[currentStep.value] ?? null
})

const currentValues = computed<number[]>(() => {
  return currentSimulation.value?.values ?? values.value
})

const currentComparing = computed<number[]>(() => {
  return currentSimulation.value?.comparing ?? []
})

const currentSwapping = computed<number[]>(() => {
  return currentSimulation.value?.swapping ?? []
})

const currentSorted = computed<number[]>(() => {
  return currentSimulation.value?.sorted ?? []
})

const currentMinimumIndex = computed<number | undefined>(() => {
  return currentSimulation.value?.minimumIndex
})

const currentIndex = computed<number | undefined>(() => {
  return currentSimulation.value?.currentIndex
})

const currentDescription = computed<string>(() => {
  return (
    currentSimulation.value?.description ??
    'Nhấn Play Simulation để bắt đầu.'
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

/* =========================================================
   HELPERS
========================================================= */

function isComparing(index: number): boolean {
  return currentComparing.value.includes(index)
}

function isSwapping(index: number): boolean {
  return currentSwapping.value.includes(index)
}

function isSorted(index: number): boolean {
  return currentSorted.value.includes(index)
}

function isMinimum(index: number): boolean {
  return (
    currentMinimumIndex.value === index &&
    !isSwapping(index) &&
    !isSorted(index)
  )
}

function isCurrent(index: number): boolean {
  return (
    currentIndex.value === index &&
    !isSorted(index)
  )
}

function getBarHeight(value: number): string {
  const maxHeight = 280
  const maxValue = 100

  const height = Math.max(
    (value / maxValue) * maxHeight,
    35,
  )

  return `${height}px`
}

/* =========================================================
   SIMULATION CONTROL
========================================================= */

function initializeSimulation(): void {
  stopTimer()

  steps.value = generateSelectionSortSteps(
    values.value,
  )

  currentStep.value = 0

  status.value = 'idle'
}

function reset(): void {
  stopTimer()

  values.value = [...initialValues]

  steps.value = generateSelectionSortSteps(
    values.value,
  )

  currentStep.value = 0

  status.value = 'idle'
}

function randomize(): void {
  stopTimer()

  const generated: number[] = []

  for (let i = 0; i < 8; i++) {
    generated.push(
      Math.floor(Math.random() * 90) + 10,
    )
  }

  values.value = generated

  steps.value = generateSelectionSortSteps(
    generated,
  )

  currentStep.value = 0

  status.value = 'idle'
}

function goToNextStep(): void {
  if (steps.value.length === 0) {
    return
  }

  if (isLastStep.value) {
    status.value = 'completed'

    stopTimer()

    return
  }

  currentStep.value += 1

  if (isLastStep.value) {
    status.value = 'completed'

    stopTimer()
  }
}

function goToPreviousStep(): void {
  if (steps.value.length === 0) {
    return
  }

  if (isFirstStep.value) {
    return
  }

  stopTimer()

  currentStep.value -= 1

  status.value = 'paused'
}

function play(): void {
  if (steps.value.length === 0) {
    initializeSimulation()
  }

  /*
   * Nếu đã hoàn thành → chạy lại từ đầu
   */
  if (isLastStep.value) {
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
  if (status.value === 'running') {
    pause()
  } else {
    play()
  }
}

function scheduleNextStep(): void {
  stopTimer()

  if (status.value !== 'running') {
    return
  }

  if (isLastStep.value) {
    status.value = 'completed'

    return
  }

  timer = setTimeout(() => {
    goToNextStep()

    if (status.value === 'running') {
      scheduleNextStep()
    }
  }, speed.value)
}

function stopTimer(): void {
  if (timer !== null) {
    clearTimeout(timer)

    timer = null
  }
}

/* =========================================================
   WATCHERS / LIFECYCLE
========================================================= */

watch(speed, () => {
  if (status.value === 'running') {
    scheduleNextStep()
  }
})

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
          <ArrowLeft class="h-4 w-4" />

          Algorithms
        </button>

        <div
          class="h-5 w-px bg-slate-800"
        />

        <div>
          <div
            class="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400"
          >
            Sorting
          </div>

          <h1
            class="text-sm font-bold text-white"
          >
            Selection Sort
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
          class="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
        />

        <div class="relative max-w-4xl">
          <div
            class="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400"
          >
            <span
              class="h-1.5 w-1.5 rounded-full bg-purple-400"
            />

            SORTING ALGORITHM
          </div>

          <h2
            class="text-4xl font-black tracking-tight text-white sm:text-5xl"
          >
            Selection Sort
          </h2>

          <p
            class="mt-5 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg"
          >
            Thuật toán Selection Sort liên tục tìm
            phần tử nhỏ nhất trong phần chưa được
            sắp xếp và đưa nó về đúng vị trí.
          </p>
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
            class="h-8 w-1 rounded-full bg-purple-500"
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
              Selection Sort chia mảng thành hai
              phần: phần đã được sắp xếp và phần
              chưa được sắp xếp.
            </p>

            <p>
              Ở mỗi vòng lặp, thuật toán tìm phần tử
              <strong class="text-white">
                nhỏ nhất
              </strong>
              trong phần chưa được sắp xếp.
            </p>

            <p>
              Sau đó phần tử nhỏ nhất được swap với
              phần tử đầu tiên của vùng chưa được
              sắp xếp.
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-800 bg-slate-950 p-5"
          >
            <div
              class="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500"
            >
              Core Idea
            </div>

            <div class="space-y-3">
              <div
                v-for="(text, index) in [
                  'Chọn vị trí đầu tiên của vùng chưa sort.',
                  'Tìm phần tử nhỏ nhất.',
                  'Swap minimum với phần tử đầu tiên.',
                  'Đánh dấu vị trí đó là sorted.',
                ]"
                :key="index"
                class="flex items-center gap-3"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-xs font-bold text-purple-400"
                >
                  {{ index + 1 }}
                </span>

                <span
                  class="text-sm text-slate-400"
                >
                  {{ text }}
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
              • Học và minh họa sorting.
            </li>

            <li>
              • Dataset nhỏ.
            </li>

            <li>
              • Muốn số lần swap thấp.
            </li>

            <li>
              • Cần implementation đơn giản.
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
                Avoid when
              </p>
            </div>
          </div>

          <ul
            class="mt-6 space-y-3 text-sm text-slate-400"
          >
            <li>
              • Dataset lớn.
            </li>

            <li>
              • Yêu cầu performance cao.
            </li>

            <li>
              • Hàng triệu phần tử.
            </li>

            <li>
              • Cần thuật toán O(n log n).
            </li>
          </ul>
        </div>
      </section>

      <!-- ===================================================
           LIVE SIMULATION
      ==================================================== -->

      <section
        class="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-slate-900 shadow-2xl shadow-purple-950/20"
      >
        <div
          class="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
        />

        <div
          class="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-fuchsia-500/5 blur-3xl"
        />

        <!-- Header -->

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
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10"
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

                      'bg-purple-400':
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

                      'border-purple-500/20 bg-purple-500/10 text-purple-400':
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
                  Theo dõi quá trình tìm minimum
                  và đưa nó về đúng vị trí.
                </p>
              </div>
            </div>

            <div
              class="rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3"
            >
              <div
                class="text-[10px] font-bold uppercase tracking-widest text-slate-600"
              >
                Current Step
              </div>

              <div
                class="mt-1 flex items-baseline gap-1"
              >
                <span
                  class="text-2xl font-black text-white"
                >
                  {{ currentStep + 1 }}
                </span>

                <span
                  class="text-sm text-slate-600"
                >
                  / {{ steps.length }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress -->

        <div
          class="relative h-1 bg-slate-800"
        >
          <div
            class="h-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-emerald-400 transition-all duration-300"
            :style="{
              width: `${progress}%`,
            }"
          />
        </div>

        <!-- Body -->

        <div
          class="relative p-6 lg:p-8"
        >
          <!-- Current operation -->

          <div
            class="mb-7 flex items-start gap-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-5"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400"
            >
              <ArrowUp class="h-5 w-5" />
            </div>

            <div class="min-w-0">
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400"
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

          <!-- Array -->

          <div
            class="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#080d18] p-5 sm:p-8"
          >
            <div
              class="pointer-events-none absolute inset-0 opacity-[0.035]"
              style="
                background-image:
                  linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
                background-size: 32px 32px;
              "
            />

            <div
              class="relative flex min-h-[380px] items-end justify-center gap-2 sm:gap-3"
            >
              <div
                v-for="(value, index) in currentValues"
                :key="index"
                class="group relative flex h-full min-w-8 max-w-20 flex-1 flex-col items-center justify-end"
              >
                <!-- Status -->

                <div
                  class="mb-2 h-5 text-[9px] font-black uppercase tracking-wider"
                >
                  <span
                    v-if="isSwapping(index)"
                    class="text-amber-400"
                  >
                    SWAP
                  </span>

                  <span
                    v-else-if="isMinimum(index)"
                    class="text-fuchsia-400"
                  >
                    MIN
                  </span>

                  <span
                    v-else-if="isComparing(index)"
                    class="text-blue-400"
                  >
                    COMPARE
                  </span>

                  <span
                    v-else-if="isSorted(index)"
                    class="text-emerald-400"
                  >
                    SORTED
                  </span>

                  <span
                    v-else-if="isCurrent(index)"
                    class="text-purple-400"
                  >
                    CURRENT
                  </span>
                </div>

                <!-- Value -->

                <div
                  class="mb-2 text-sm font-black transition-all duration-300 sm:text-base"
                  :class="{
                    'scale-125 text-amber-400':
                      isSwapping(index),

                    'scale-125 text-fuchsia-400':
                      isMinimum(index),

                    'scale-125 text-blue-400':
                      isComparing(index),

                    'text-emerald-400':
                      isSorted(index),

                    'text-purple-400':
                      isCurrent(index) &&
                      !isMinimum(index) &&
                      !isComparing(index),

                    'text-slate-300':
                      !isComparing(index) &&
                      !isSwapping(index) &&
                      !isSorted(index) &&
                      !isMinimum(index) &&
                      !isCurrent(index),
                  }"
                >
                  {{ value }}
                </div>

                <!-- Bar -->

                <div
                  class="relative w-full rounded-t-xl transition-all duration-500 ease-out"
                  :class="{
                    'bg-gradient-to-t from-amber-700 to-amber-400 shadow-lg shadow-amber-500/40':
                      isSwapping(index),

                    'bg-gradient-to-t from-fuchsia-700 to-fuchsia-400 shadow-lg shadow-fuchsia-500/40':
                      isMinimum(index),

                    'bg-gradient-to-t from-blue-700 to-blue-400 shadow-lg shadow-blue-500/30':
                      isComparing(index),

                    'bg-gradient-to-t from-emerald-700 to-emerald-400 shadow-lg shadow-emerald-500/30':
                      isSorted(index),

                    'bg-gradient-to-t from-purple-700 to-purple-400 shadow-lg shadow-purple-500/20':
                      isCurrent(index) &&
                      !isMinimum(index) &&
                      !isComparing(index),

                    'bg-gradient-to-t from-slate-800 to-slate-600':
                      !isComparing(index) &&
                      !isSwapping(index) &&
                      !isSorted(index) &&
                      !isMinimum(index) &&
                      !isCurrent(index),
                  }"
                  :style="{
                    height: getBarHeight(value),
                  }"
                >
                  <div
                    class="absolute inset-x-0 top-0 h-px bg-white/30"
                  />
                </div>

                <!-- Index -->

                <div
                  class="mt-3 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-[10px] font-bold text-slate-600"
                >
                  {{ index }}
                </div>
              </div>
            </div>
          </div>

          <!-- Legend -->

          <div
            class="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-blue-400"
              />

              Comparing
            </div>

            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-fuchsia-400"
              />

              Minimum
            </div>

            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-amber-400"
              />

              Swapping
            </div>

            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-emerald-400"
              />

              Sorted
            </div>
          </div>

          <!-- Progress -->

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
                class="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-300"
                :style="{
                  width: `${progress}%`,
                }"
              />
            </div>
          </div>

          <!-- Controls -->

          <div
            class="mt-8 flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <div
              class="flex flex-wrap items-center justify-center gap-2"
            >
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

              <button
                type="button"
                class="group relative flex h-12 items-center gap-2 overflow-hidden rounded-2xl px-7 font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                :style="{
                    background:
                    'linear-gradient(100deg, #8b3df0 0%, #6366f1 45%, #45d9d2 100%)',
                    boxShadow:
                    '0 8px 24px rgba(99, 102, 241, 0.35)',
                }"
                @click="togglePlay"
                >
                <span
                    class="absolute inset-0 bg-white/0 transition-all duration-200 group-hover:bg-white/10"
                />

                <Pause
                    v-if="status === 'running'"
                    class="relative z-10 h-4 w-4"
                />

                <Play
                    v-else
                    class="relative z-10 h-4 w-4 fill-current"
                />

                <span class="relative z-10">
                    {{
                    status === 'running'
                        ? 'Pause'
                        : 'Play Simulation'
                    }}
                </span>
              </button>

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

              <button
                type="button"
                class="ml-2 flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                @click="reset"
              >
                <RotateCcw class="h-4 w-4" />

                Reset
              </button>

              <button
                type="button"
                class="flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                @click="randomize"
              >
                <Shuffle class="h-4 w-4" />

                Randomize
              </button>
            </div>

            <!-- Speed -->

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
                step="100"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-purple-500"
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
        <!-- Pseudocode -->

        <div
          class="overflow-hidden rounded-3xl border border-violet-500/20 bg-slate-900 shadow-xl shadow-violet-950/10 lg:col-span-3"
        >
          <div
            class="flex items-center justify-between border-b border-slate-800 px-6 py-5"
          >
            <div
              class="flex items-center gap-4"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10"
              >
                <span
                  class="font-mono text-lg font-black text-violet-400"
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
                  Logic từng bước của Selection Sort
                </p>
              </div>
            </div>
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
                  selection-sort.pseudo
                </span>
              </div>

              <pre
                class="overflow-x-auto p-5 font-mono text-[13px] leading-8 text-slate-300"
              ><code><span class="text-violet-400">for</span> i = <span class="text-amber-400">0</span> → n - <span class="text-amber-400">1</span>

    minIndex = i

    <span class="text-violet-400">for</span> j = i + <span class="text-amber-400">1</span> → n - <span class="text-amber-400">1</span>

        <span class="text-violet-400">if</span> array[j] &lt; array[minIndex]

            minIndex = j

    <span class="text-violet-400">if</span> minIndex != i

        swap(array[i], array[minIndex])

    mark i as sorted</code></pre>
            </div>

            <div
              class="mt-5 rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-4"
            >
              <div
                class="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400"
              >
                How to read this
              </div>

              <p
                class="mt-2 text-sm leading-6 text-slate-400"
              >
                Selection Sort không swap sau mỗi
                lần compare. Nó chỉ ghi nhớ vị trí
                minimum và swap một lần khi kết thúc
                mỗi vòng.
              </p>
            </div>
          </div>
        </div>

        <!-- Complexity -->

        <div
          class="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900 shadow-xl shadow-emerald-950/10 lg:col-span-2"
        >
          <div
            class="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          />

          <div
            class="relative border-b border-slate-800 px-6 py-5"
          >
            <div
              class="flex items-center gap-4"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10"
              >
                <span
                  class="font-mono text-xl font-black text-emerald-400"
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

          <div
            class="relative grid gap-3 p-5"
          >
            <!-- BEST -->

            <div
              class="group rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4 transition hover:border-red-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Best Case
                </span>

                <span
                  class="rounded-lg bg-red-500/10 px-2 py-1 text-[9px] font-bold text-red-400"
                >
                  STILL QUADRATIC
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-red-400"
              >
                {{ complexity.best }}
              </div>

              <div
                class="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  class="h-full w-full rounded-full bg-red-400"
                />
              </div>

              <p
                class="mt-3 text-xs leading-5 text-slate-600"
              >
                Vẫn phải tìm minimum trong toàn bộ
                phần chưa được sắp xếp.
              </p>
            </div>

            <!-- AVERAGE -->

            <div
              class="group rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-4 transition hover:border-amber-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Average Case
                </span>

                <span
                  class="rounded-lg bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-400"
                >
                  NORMAL
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-amber-400"
              >
                {{ complexity.average }}
              </div>

              <div
                class="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  class="h-full w-full rounded-full bg-amber-400"
                />
              </div>
            </div>

            <!-- WORST -->

            <div
              class="group rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4 transition hover:border-red-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Worst Case
                </span>

                <span
                  class="rounded-lg bg-red-500/10 px-2 py-1 text-[9px] font-bold text-red-400"
                >
                  SLOW
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-red-400"
              >
                {{ complexity.worst }}
              </div>

              <div
                class="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  class="h-full w-full rounded-full bg-red-400"
                />
              </div>
            </div>

            <!-- SPACE -->

            <div
              class="group rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-4 transition hover:border-blue-500/30"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Space Complexity
                </span>

                <span
                  class="rounded-lg bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-400"
                >
                  IN-PLACE
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-blue-400"
              >
                {{ complexity.space }}
              </div>

              <div
                class="mt-3 flex gap-1"
              >
                <span
                  v-for="index in 10"
                  :key="index"
                  class="h-1.5 flex-1 rounded-full"
                  :class="
                    index <= 2
                      ? 'bg-blue-400'
                      : 'bg-slate-800'
                  "
                />
              </div>
            </div>
          </div>

          <div
            class="relative mx-5 mb-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div
              class="flex items-start gap-3"
            >
              <div
                class="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400"
              />

              <p
                class="text-xs leading-5 text-slate-500"
              >
                Selection Sort sử dụng
                <span
                  class="font-semibold text-slate-300"
                >
                  O(1) auxiliary space
                </span>
                vì thuật toán thực hiện sorting
                <span
                  class="font-semibold text-slate-300"
                >
                  in-place
                </span>
                và chỉ cần một biến tạm cho việc swap.
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
                Implementation tương đương trong PHP
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
                SelectionSort.php
              </span>
            </div>

            <pre
              class="overflow-x-auto p-6 font-mono text-[13px] leading-7 text-slate-300"
            ><code><span class="text-violet-400">function</span> <span class="text-blue-400">selectionSort</span>(<span class="text-violet-400">array</span> $items): <span class="text-violet-400">array</span>
{
    $n = <span class="text-blue-400">count</span>($items);

    <span class="text-violet-400">for</span> ($i = <span class="text-amber-400">0</span>; $i &lt; $n - <span class="text-amber-400">1</span>; $i++) {

        $minIndex = $i;

        <span class="text-violet-400">for</span> ($j = $i + <span class="text-amber-400">1</span>; $j &lt; $n; $j++) {

            <span class="text-violet-400">if</span> ($items[$j] &lt; $items[$minIndex]) {
                $minIndex = $j;
            }
        }

        <span class="text-violet-400">if</span> ($minIndex !== $i) {

            [$items[$i], $items[$minIndex]]
                = [$items[$minIndex], $items[$i]];
        }
    }

    <span class="text-violet-400">return</span> $items;
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
            Selection Sort hoạt động như thế nào?
          </h3>
        </div>

        <p
          class="max-w-4xl text-sm leading-7 text-slate-400"
        >
          Mỗi vòng lặp sẽ tìm phần tử nhỏ nhất
          trong vùng chưa được sắp xếp. Sau khi tìm
          được minimum, thuật toán đưa nó về đầu
          vùng chưa sort. Vị trí đó sau đó được đánh
          dấu là
          <strong class="text-emerald-400">
            SORTED
          </strong>
          và không bị thay đổi nữa.
        </p>

        <div
          class="mt-7 grid gap-4 md:grid-cols-4"
        >
          <div
            class="rounded-2xl border border-purple-500/10 bg-purple-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-purple-400"
            >
              01 — Select
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Chọn vị trí đầu vùng chưa sort.
            </p>
          </div>

          <div
            class="rounded-2xl border border-fuchsia-500/10 bg-fuchsia-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-fuchsia-400"
            >
              02 — Find Min
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Tìm phần tử nhỏ nhất.
            </p>
          </div>

          <div
            class="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-amber-400"
            >
              03 — Swap
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Đưa minimum về đúng vị trí.
            </p>
          </div>

          <div
            class="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-emerald-400"
            >
              04 — Sorted
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Cố định phần tử và chuyển sang vị trí tiếp theo.
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>