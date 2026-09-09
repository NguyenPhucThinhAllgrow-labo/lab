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

import { generateBubbleSortSteps } from '~/utils/algorithms/sorting/bubbleSort'

import type {
  Complexity,
  SimulationStatus,
  SimulationStep,
} from '~/types/algorithm/sort/common'

useHead({
  title: 'Bubble Sort Playground',
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
  best: 'O(n)',
  average: 'O(n²)',
  worst: 'O(n²)',
  space: 'O(1)',
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
    (currentStep.value / (steps.value.length - 1)) * 100,
  )
})

const isFirstStep = computed<boolean>(() => {
  return currentStep.value <= 0
})

const isLastStep = computed<boolean>(() => {
  return (
    steps.value.length > 0 &&
    currentStep.value >= steps.value.length - 1
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

function getBarHeight(value: number): string {
  const height = Math.max(value * 3, 35)

  return `${height}px`
}

/* =========================================================
   SIMULATION
========================================================= */

function initializeSimulation(): void {
  stopTimer()

  steps.value = generateBubbleSortSteps(values.value)

  currentStep.value = 0

  status.value = 'idle'
}

function reset(): void {
  values.value = [...initialValues]

  initializeSimulation()
}

function randomize(): void {
  stopTimer()

  const generated: number[] = []

  for (let index = 0; index < 8; index++) {
    generated.push(
      Math.floor(Math.random() * 90) + 10,
    )
  }

  values.value = generated

  steps.value = generateBubbleSortSteps(
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

  currentStep.value -= 1

  status.value = 'paused'

  stopTimer()
}

function play(): void {
  if (steps.value.length === 0) {
    initializeSimulation()
  }

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

    return
  }

  play()
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
    class="algorithm-lab algorithm-lab--bubble min-h-screen bg-slate-950 text-slate-100"
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
            class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400"
          >
            Sorting
          </div>

          <h1
            class="text-sm font-bold text-white"
          >
            Bubble Sort
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
          class="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
        />

        <div
          class="relative max-w-4xl"
        >
          <div
            class="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400"
          >
            <span
              class="h-1.5 w-1.5 rounded-full bg-blue-400"
            />

            SORTING ALGORITHM
          </div>

          <h2
            class="text-4xl font-black tracking-tight text-white sm:text-5xl"
          >
            Bubble Sort
          </h2>

          <p
            class="mt-5 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg"
          >
            Thuật toán sắp xếp đơn giản bằng cách liên tục
            so sánh các phần tử liền kề và hoán đổi chúng
            nếu chúng nằm sai thứ tự.
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
            class="h-8 w-1 rounded-full bg-blue-500"
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
              Bubble Sort duyệt qua mảng nhiều lần.
              Trong mỗi lần duyệt, thuật toán so sánh
              từng cặp phần tử đứng cạnh nhau.
            </p>

            <p>
              Nếu phần tử bên trái lớn hơn phần tử bên phải,
              hai phần tử sẽ được
              <strong class="text-white">
                swap
              </strong>.
            </p>

            <p>
              Sau mỗi vòng lặp, phần tử lớn nhất chưa được
              sắp xếp sẽ dần di chuyển về cuối mảng.
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

            <div
              class="space-y-3"
            >
              <div
                class="flex items-center gap-3"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400"
                >
                  1
                </span>

                <span class="text-sm text-slate-400">
                  Chọn hai phần tử liền kề.
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
                  So sánh hai phần tử.
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
                  Swap nếu chúng sai thứ tự.
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
                  Lặp lại đến khi mảng được sort.
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
        <!-- Use -->
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
              • Học và minh họa sorting algorithm.
            </li>

            <li>
              • Dataset rất nhỏ.
            </li>

            <li>
              • Implementation đơn giản.
            </li>

            <li>
              • Ưu tiên tính dễ hiểu hơn performance.
            </li>
          </ul>
        </div>

        <!-- Don't use -->
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
              • Hệ thống yêu cầu performance cao.
            </li>

            <li>
              • Sorting hàng triệu phần tử.
            </li>

            <li>
              • Khi Quick Sort hoặc Merge Sort phù hợp hơn.
            </li>
          </ul>
        </div>
      </section>

      <!-- ===================================================
           LIVE SIMULATION
      ==================================================== -->

      <section
        class="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-slate-900 shadow-2xl shadow-blue-950/20"
      >
        <!-- Background glow -->
        <div
          class="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
        />

        <div
          class="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl"
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
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10"
              >
                <span class="relative flex h-3 w-3">
                  <span
                    v-if="status === 'running'"
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  />

                  <span
                    class="relative inline-flex h-3 w-3 rounded-full"
                    :class="{
                      'bg-emerald-400':
                        status === 'running',

                      'bg-blue-400':
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

                      'border-blue-500/20 bg-blue-500/10 text-blue-400':
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
                  Theo dõi từng thao tác của Bubble Sort
                  theo thời gian thực.
                </p>
              </div>
            </div>

            <!-- Step -->
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
            class="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <!-- Simulation body -->
        <div
          class="relative p-6 lg:p-8"
        >
          <!-- Current operation -->
          <div
            class="mb-7 flex items-start gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"
            >
              <ArrowUp
                class="h-5 w-5"
              />
            </div>

            <div
              class="min-w-0"
            >
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400"
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
            <!-- Grid background -->
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
              class="relative flex min-h-[360px] items-end justify-center gap-2 sm:gap-3"
            >
              <div
                v-for="(value, index) in currentValues"
                :key="`${index}-${value}`"
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
                </div>

                <!-- Value -->
                <div
                  class="mb-2 text-sm font-black transition-all duration-300 sm:text-base"
                  :class="{
                    'scale-125 text-blue-400':
                      isComparing(index),

                    'scale-125 text-amber-400':
                      isSwapping(index),

                    'text-emerald-400':
                      isSorted(index),

                    'text-slate-300':
                      !isComparing(index) &&
                      !isSwapping(index) &&
                      !isSorted(index),
                  }"
                >
                  {{ value }}
                </div>

                <!-- Bar -->
                <div
                  class="relative w-full rounded-t-xl transition-all duration-500"
                  :class="{
                    'bg-gradient-to-t from-blue-700 to-blue-400 shadow-lg shadow-blue-500/30':
                      isComparing(index),

                    'bg-gradient-to-t from-amber-700 to-amber-400 shadow-lg shadow-amber-500/40':
                      isSwapping(index),

                    'bg-gradient-to-t from-emerald-700 to-emerald-400 shadow-lg shadow-emerald-500/30':
                      isSorted(index),

                    'bg-gradient-to-t from-slate-800 to-slate-600':
                      !isComparing(index) &&
                      !isSwapping(index) &&
                      !isSorted(index),
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

          <!-- Progress information -->
          <div
            class="mt-7"
          >
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
                class="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                :style="{ width: `${progress}%` }"
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
              <!-- Previous -->
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

              <!-- Play -->
              <button
                type="button"
                class="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-7 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/30 active:scale-[0.98]"
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

              <!-- Next -->
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

              <!-- Reset -->
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

              <!-- Random -->
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
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-blue-500"
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
        <!-- =================================================
             PSEUDOCODE
        ================================================== -->

        <div
          class="group relative overflow-hidden rounded-3xl border border-violet-500/20 bg-slate-900 shadow-xl shadow-violet-950/10 lg:col-span-3"
        >
          <div
            class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
          />

          <!-- Header -->
          <div
            class="relative flex items-center justify-between border-b border-slate-800 px-6 py-5"
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
                  Logic từng bước của thuật toán
                </p>
              </div>
            </div>

            <span
              class="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400"
            >
              Algorithm
            </span>
          </div>

          <!-- Code -->
          <div
            class="relative p-5 sm:p-6"
          >
            <div
              class="overflow-hidden rounded-2xl border border-slate-800 bg-[#070b13]"
            >
              <!-- Editor bar -->
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
                  bubble-sort.pseudo
                </span>
              </div>

              <!-- Code body -->
              <div
                class="overflow-x-auto p-5"
              >
                <div
                  class="min-w-[520px] font-mono text-[13px] leading-8"
                >
                  <div
                    class="flex"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      01
                    </span>

                    <span
                      class="ml-5 text-slate-500"
                    >
                      // Start Bubble Sort
                    </span>
                  </div>

                  <div
                    class="flex"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      02
                    </span>

                    <span
                      class="ml-5"
                    >
                      <span
                        class="text-violet-400"
                      >
                        for
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        i = 0 → n - 1
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      03
                    </span>

                    <span
                      class="ml-5"
                    >
                      <span
                        class="text-violet-400"
                      >
                        for
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        j = 0 → n - i - 1
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-blue-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-blue-500/50"
                    >
                      04
                    </span>

                    <span
                      class="ml-5"
                    >
                      <span
                        class="text-violet-400"
                      >
                        compare
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        array[j]
                      </span>

                      <span
                        class="text-slate-600"
                      >
                        and
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        array[j + 1]
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      05
                    </span>

                    <span
                      class="ml-5"
                    >
                      <span
                        class="text-violet-400"
                      >
                        if
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        array[j] &gt; array[j + 1]
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

                    <span
                      class="ml-5"
                    >
                      <span
                        class="text-violet-400"
                      >
                        swap
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        array[j], array[j + 1]
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      07
                    </span>

                    <span
                      class="ml-5 text-slate-500"
                    >
                      // largest element moves to the end
                    </span>
                  </div>

                  <div
                    class="flex"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      08
                    </span>

                    <span
                      class="ml-5"
                    >
                      <span
                        class="text-violet-400"
                      >
                        return
                      </span>

                      <span
                        class="text-slate-300"
                      >
                        sorted array
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Explanation -->
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
                Thuật toán kiểm tra từng cặp phần tử
                liền kề. Nếu phần tử bên trái lớn hơn
                phần tử bên phải, chúng sẽ được hoán đổi.
              </p>
            </div>
          </div>
        </div>

        <!-- =================================================
             COMPLEXITY
        ================================================== -->

        <div
          class="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900 shadow-xl shadow-emerald-950/10 lg:col-span-2"
        >
          <div
            class="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          />

          <!-- Header -->
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

          <!-- Cards -->
          <div
            class="relative grid gap-3 p-5"
          >
            <!-- Best -->
            <div
              class="group rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4 transition hover:border-emerald-500/30"
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
                  class="rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400"
                >
                  FAST
                </span>
              </div>

              <div
                class="mt-2 text-3xl font-black text-emerald-400"
              >
                {{ complexity.best }}
              </div>

              <div
                class="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  class="h-full w-[20%] rounded-full bg-emerald-400"
                />
              </div>
            </div>

            <!-- Average -->
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
                  class="h-full w-[65%] rounded-full bg-amber-400"
                />
              </div>
            </div>

            <!-- Worst -->
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

            <!-- Space -->
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
                  MEMORY
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

          <!-- Summary -->
          <div
            class="relative mx-5 mb-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div
              class="flex items-start gap-3"
            >
              <div
                class="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400"
              />

              <p
                class="text-xs leading-5 text-slate-500"
              >
                Bubble Sort sử dụng
                <span
                  class="font-semibold text-slate-300"
                >
                  O(1) auxiliary space
                </span>
                vì việc sắp xếp được thực hiện
                <span
                  class="font-semibold text-slate-300"
                >
                  in-place
                </span>.
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
        <!-- Header -->
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

        <!-- PHP code -->
        <div
          class="p-5 sm:p-6"
        >
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
                BubbleSort.php
              </span>
            </div>

            <pre
              class="overflow-x-auto p-6 font-mono text-[13px] leading-7 text-slate-300"
            ><code><span class="text-violet-400">function</span> <span class="text-blue-400">bubbleSort</span>(<span class="text-violet-400">array</span> $items): <span class="text-violet-400">array</span>
{
    $n = <span class="text-blue-400">count</span>($items);

    <span class="text-violet-400">for</span> ($i = <span class="text-amber-400">0</span>; $i &lt; $n - <span class="text-amber-400">1</span>; $i++) {

        $swapped = <span class="text-violet-400">false</span>;

        <span class="text-violet-400">for</span> ($j = <span class="text-amber-400">0</span>; $j &lt; $n - $i - <span class="text-amber-400">1</span>; $j++) {

            <span class="text-violet-400">if</span> ($items[$j] &gt; $items[$j + <span class="text-amber-400">1</span>]) {

                [$items[$j], $items[$j + <span class="text-amber-400">1</span>]]
                    = [$items[$j + <span class="text-amber-400">1</span>], $items[$j]];

                $swapped = <span class="text-violet-400">true</span>;
            }
        }

        <span class="text-violet-400">if</span> (!$swapped) {
            <span class="text-violet-400">break</span>;
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
            Tại sao gọi là "Bubble Sort"?
          </h3>
        </div>

        <p
          class="max-w-4xl text-sm leading-7 text-slate-400"
        >
          Hãy tưởng tượng mỗi giá trị lớn là một bong bóng.
          Khi thuật toán liên tục so sánh các phần tử liền kề,
          giá trị lớn dần được đẩy về phía cuối mảng.
          Sau mỗi vòng lặp, một phần tử lớn nhất chưa được
          xử lý sẽ "nổi" lên vị trí cuối cùng.
        </p>

        <div
          class="mt-7 grid gap-4 md:grid-cols-3"
        >
          <div
            class="rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-blue-400"
            >
              01 — Compare
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              So sánh hai phần tử liền kề.
            </p>
          </div>

          <div
            class="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-amber-400"
            >
              02 — Swap
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Đổi vị trí nếu chúng sai thứ tự.
            </p>
          </div>

          <div
            class="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-emerald-400"
            >
              03 — Sorted
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Phần tử lớn nhất được cố định ở cuối.
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style src="~/assets/css/pages/algorithm/algorithm-lab.css"></style>
