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

import {
  generateInsertionSortSteps,
} from '~/utils/algorithms/sorting/insertionSort'

import type {
  Complexity,
  SimulationStatus,
  InsertionSortSimulationStep,
} from '~/types/algorithm/sort/insertion'

useHead({
  title: 'Insertion Sort Playground',
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

const values = ref<number[]>([
  ...initialValues,
])

const steps = ref<InsertionSortSimulationStep[]>([])

const currentStep = ref<number>(0)

const status = ref<SimulationStatus>('idle')

const speed = ref<number>(550)

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

const currentSimulation = computed<
  InsertionSortSimulationStep | null
>(() => {
  if (steps.value.length === 0) {
    return null
  }

  return steps.value[currentStep.value] ?? null
})

const currentValues = computed<number[]>(() => {
  return (
    currentSimulation.value?.values ??
    values.value
  )
})

const currentIds = computed<number[]>(() => {
  return (
    currentSimulation.value?.ids ??
    values.value.map((_, index) => index)
  )
})

const currentComparing = computed<number[]>(() => {
  return (
    currentSimulation.value?.comparing ??
    []
  )
})

const currentSwapping = computed<number[]>(() => {
  return (
    currentSimulation.value?.swapping ??
    []
  )
})

const currentSorted = computed<number[]>(() => {
  return (
    currentSimulation.value?.sorted ??
    []
  )
})

const currentIndex = computed<number | null>(() => {
  return (
    currentSimulation.value?.currentIndex ??
    null
  )
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

const maxValue = computed<number>(() => {
  return Math.max(
    ...currentValues.value,
    1,
  )
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

function isCurrent(index: number): boolean {
  return currentIndex.value === index
}

function getBarHeight(value: number): string {
  const maxHeight = 270
  const minHeight = 36

  const height =
    (value / maxValue.value) *
    maxHeight

  return `${Math.max(height, minHeight)}px`
}

function getBarClass(
  index: number,
): string {
  if (isSwapping(index)) {
    return 'bar-moving'
  }

  if (isComparing(index)) {
    return 'bar-comparing'
  }

  if (isCurrent(index)) {
    return 'bar-current'
  }

  if (isSorted(index)) {
    return 'bar-sorted'
  }

  return 'bar-default'
}

function getValueClass(
  index: number,
): string {
  if (isSwapping(index)) {
    return 'text-amber-400'
  }

  if (isComparing(index)) {
    return 'text-blue-400'
  }

  if (isCurrent(index)) {
    return 'text-violet-400'
  }

  if (isSorted(index)) {
    return 'text-emerald-400'
  }

  return 'text-slate-300'
}

function getStatusLabel(
  index: number,
): string {
  if (isSwapping(index)) {
    return 'MOVE'
  }

  if (isComparing(index)) {
    return 'COMPARE'
  }

  if (isCurrent(index)) {
    return 'CURRENT'
  }

  if (isSorted(index)) {
    return 'SORTED'
  }

  return ''
}

/* =========================================================
   SIMULATION
========================================================= */

function initializeSimulation(): void {
  stopTimer()

  steps.value =
    generateInsertionSortSteps(
      values.value,
    )

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
      Math.floor(
        Math.random() * 90,
      ) + 10,
    )
  }

  values.value = generated

  steps.value =
    generateInsertionSortSteps(
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
            class="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400"
          >
            Sorting
          </div>

          <h1
            class="text-sm font-bold text-white"
          >
            Insertion Sort
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
          class="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"
        />

        <div
          class="relative max-w-4xl"
        >
          <div
            class="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-400"
          >
            <span
              class="h-1.5 w-1.5 rounded-full bg-violet-400"
            />

            SORTING ALGORITHM
          </div>

          <h2
            class="text-4xl font-black tracking-tight text-white sm:text-5xl"
          >
            Insertion Sort
          </h2>

          <p
            class="mt-5 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg"
          >
            Thuật toán sắp xếp xây dựng mảng đã sắp xếp
            từng phần tử một. Mỗi phần tử mới sẽ được lấy ra
            và chèn vào đúng vị trí trong vùng đã được sắp xếp.
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
            class="h-8 w-1 rounded-full bg-violet-500"
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
              Insertion Sort chia mảng thành hai vùng:
              <strong class="text-white">
                vùng đã sắp xếp
              </strong>
              và vùng chưa sắp xếp.
            </p>

            <p>
              Thuật toán lấy từng phần tử từ vùng chưa sắp xếp
              và tìm vị trí phù hợp trong vùng đã sắp xếp.
            </p>

            <p>
              Những phần tử lớn hơn phần tử đang xét sẽ được
              <strong class="text-white">
                dịch sang phải
              </strong>
              để tạo khoảng trống cho phần tử mới.
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
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-violet-400"
                >
                  1
                </span>

                <span class="text-sm text-slate-400">
                  Chọn phần tử hiện tại.
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
                  So sánh với các phần tử bên trái.
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
                  Dịch phần tử lớn hơn sang phải.
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
                  Chèn phần tử vào đúng vị trí.
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
            <li>• Dataset nhỏ.</li>
            <li>• Dữ liệu gần như đã được sắp xếp.</li>
            <li>• Cần thuật toán đơn giản, dễ implement.</li>
            <li>• Cần sorting in-place.</li>
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
            <li>• Dataset rất lớn.</li>
            <li>• Dữ liệu hoàn toàn ngẫu nhiên với kích thước lớn.</li>
            <li>• Cần performance cao.</li>
            <li>• Có thể sử dụng Quick Sort hoặc Merge Sort hiệu quả hơn.</li>
          </ul>
        </div>
      </section>

      <!-- ===================================================
           LIVE SIMULATION
      ==================================================== -->

      <section
        class="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-slate-900 shadow-2xl shadow-violet-950/20"
      >
        <div
          class="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"
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
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10"
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
                  Theo dõi từng thao tác của Insertion Sort
                  theo thời gian thực.
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

        <!-- PROGRESS -->

        <div
          class="relative h-1 bg-slate-800"
        >
          <div
            class="h-full bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400 transition-all duration-300"
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
            class="mb-7 flex items-start gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-5"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"
            >
              <ArrowUp
                class="h-5 w-5"
              />
            </div>

            <div class="min-w-0">
              <div
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400"
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

          <!-- =================================================
               ARRAY VISUALIZER
          ================================================== -->

          <div
            class="array-stage relative overflow-hidden rounded-3xl border border-slate-800 bg-[#080d18] p-4 sm:p-8"
          >
            <!-- Background grid -->

            <div
              class="pointer-events-none absolute inset-0 opacity-[0.035]"
              style="
                background-image:
                  linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
                background-size: 32px 32px;
              "
            />

            <!-- Floor -->

            <div
              class="pointer-events-none absolute bottom-[68px] left-4 right-4 h-px bg-slate-800 sm:left-8 sm:right-8"
            />

            <!-- ARRAY -->

            <TransitionGroup
              tag="div"
              name="array"
              move-class="array-move"
              class="relative flex h-[390px] items-end gap-2 sm:gap-3"
            >
              <div
                v-for="(value, index) in currentValues"
                :key="currentIds[index]"
                class="array-item relative flex min-w-0 flex-1 flex-col items-center justify-end"
              >
                <!-- STATUS -->

                <div
                  class="mb-2 h-5 text-center text-[9px] font-black uppercase tracking-wider"
                >
                  <span
                    v-if="getStatusLabel(index)"
                    :class="{
                      'text-amber-400':
                        isSwapping(index),

                      'text-blue-400':
                        isComparing(index),

                      'text-violet-400':
                        isCurrent(index) &&
                        !isComparing(index) &&
                        !isSwapping(index),

                      'text-emerald-400':
                        isSorted(index) &&
                        !isCurrent(index) &&
                        !isComparing(index) &&
                        !isSwapping(index),
                    }"
                  >
                    {{ getStatusLabel(index) }}
                  </span>
                </div>

                <!-- VALUE -->

                <div
                  class="relative z-10 mb-2 text-sm font-black transition-[color,text-shadow] duration-200 sm:text-base"
                  :class="[
                    getValueClass(index),
                    {
                      'value-glow':
                        isCurrent(index) ||
                        isComparing(index) ||
                        isSwapping(index),
                    },
                  ]"
                >
                  {{ value }}
                </div>

                <!-- BAR -->

                <div
                  class="bar relative w-full"
                  :class="getBarClass(index)"
                  :style="{
                    height: getBarHeight(value),
                  }"
                >
                  <div
                    class="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40"
                  />

                  <div
                    class="pointer-events-none absolute inset-x-0 top-0 h-10 bg-white/[0.08] blur-md"
                  />
                </div>

                <!-- INDEX -->

                <div
                  class="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-[10px] font-bold text-slate-600 transition-[border-color,color,background] duration-200"
                  :class="{
                    'border-violet-500/40 bg-violet-500/10 text-violet-400':
                      isCurrent(index),

                    'border-blue-500/40 bg-blue-500/10 text-blue-400':
                      isComparing(index),

                    'border-amber-500/40 bg-amber-500/10 text-amber-400':
                      isSwapping(index),

                    'border-emerald-500/30 bg-emerald-500/5 text-emerald-400':
                      isSorted(index) &&
                      !isCurrent(index) &&
                      !isComparing(index) &&
                      !isSwapping(index),
                  }"
                >
                  {{ index }}
                </div>
              </div>
            </TransitionGroup>
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

              Comparing
            </div>

            <div
              class="flex items-center gap-2 text-xs text-slate-500"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-amber-400"
              />

              Moving
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
                class="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400 transition-all duration-300"
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
                class="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-7 font-bold text-white shadow-lg shadow-violet-500/20 transition hover:from-violet-500 hover:to-violet-400 hover:shadow-violet-500/30 active:scale-[0.98]"
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
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-violet-500"
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
          class="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-slate-900 shadow-xl shadow-violet-950/10 lg:col-span-3"
        >
          <div
            class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
          />

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
                  insertion-sort.pseudo
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
                      // Start Insertion Sort
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
                        for
                      </span>

                      <span class="text-slate-300">
                        i = 1 → n - 1
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-violet-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-violet-500/50"
                    >
                      03
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        current
                      </span>

                      <span class="text-slate-300">
                        = array[i]
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
                        j
                      </span>

                      <span class="text-slate-300">
                        = i - 1
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
                        while
                      </span>

                      <span class="text-slate-300">
                        j &gt;= 0
                      </span>
                    </span>
                  </div>

                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      06
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        if
                      </span>

                      <span class="text-slate-300">
                        array[j] &gt; current
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-amber-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-amber-500/50"
                    >
                      07
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        shift
                      </span>

                      <span class="text-slate-300">
                        array[j] → array[j + 1]
                      </span>
                    </span>
                  </div>

                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      08
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        j
                      </span>

                      <span class="text-slate-300">
                        = j - 1
                      </span>
                    </span>
                  </div>

                  <div
                    class="flex rounded-lg bg-emerald-500/10"
                  >
                    <span
                      class="w-10 shrink-0 select-none text-right text-emerald-500/50"
                    >
                      09
                    </span>

                    <span class="ml-5">
                      <span class="text-violet-400">
                        insert
                      </span>

                      <span class="text-slate-300">
                        current at array[j + 1]
                      </span>
                    </span>
                  </div>

                  <div class="flex">
                    <span
                      class="w-10 shrink-0 select-none text-right text-slate-700"
                    >
                      10
                    </span>

                    <span class="ml-5 text-slate-500">
                      // sorted region grows
                    </span>
                  </div>
                </div>
              </div>
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
                Insertion Sort giữ một vùng bên trái đã được
                sắp xếp. Mỗi lần lặp, một phần tử mới được
                lấy ra và chèn vào đúng vị trí trong vùng đó.
              </p>
            </div>
          </div>
        </div>

        <!-- COMPLEXITY -->

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
                Insertion Sort sử dụng
                <span
                  class="font-semibold text-slate-300"
                >
                  O(1) auxiliary space
                </span>
                vì thuật toán sắp xếp
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
                InsertionSort.php
              </span>
            </div>

            <pre
              class="overflow-x-auto p-6 font-mono text-[13px] leading-7 text-slate-300"
            ><code><span class="text-violet-400">function</span> <span class="text-blue-400">insertionSort</span>(<span class="text-violet-400">array</span> $items): <span class="text-violet-400">array</span>
{
    $n = <span class="text-blue-400">count</span>($items);

    <span class="text-violet-400">for</span> ($i = <span class="text-amber-400">1</span>; $i &lt; $n; $i++) {

        $current = $items[$i];

        $j = $i - <span class="text-amber-400">1</span>;

        <span class="text-violet-400">while</span> ($j &gt;= <span class="text-amber-400">0</span> &amp;&amp; $items[$j] &gt; $current) {

            $items[$j + <span class="text-amber-400">1</span>] = $items[$j];

            $j--;
        }

        $items[$j + <span class="text-amber-400">1</span>] = $current;
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
            Tại sao gọi là "Insertion Sort"?
          </h3>
        </div>

        <p
          class="max-w-4xl text-sm leading-7 text-slate-400"
        >
          Thuật toán hoạt động tương tự như cách con người
          sắp xếp một bộ bài trên tay. Khi lấy một lá bài mới,
          ta tìm vị trí thích hợp trong những lá bài đã được
          sắp xếp rồi chèn nó vào đó.
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
              01 — Select
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Chọn phần tử tiếp theo từ vùng chưa sắp xếp.
            </p>
          </div>

          <div
            class="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-amber-400"
            >
              02 — Shift
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Dịch các phần tử lớn hơn sang bên phải.
            </p>
          </div>

          <div
            class="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5"
          >
            <div
              class="text-sm font-black text-emerald-400"
            >
              03 — Insert
            </div>

            <p
              class="mt-2 text-xs leading-6 text-slate-500"
            >
              Chèn phần tử hiện tại vào đúng vị trí.
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped src="~/assets/css/pages/algorithm/sorting/insertion-sort/index.css"></style>
