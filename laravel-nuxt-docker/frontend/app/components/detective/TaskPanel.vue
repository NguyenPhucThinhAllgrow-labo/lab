<script setup lang="ts">
import type {
  Evidence,
  SupportedLocale,
  Task,
} from '~/types/games/detective'

const props = defineProps<{
  tasks: Task[]

  evidence: Evidence[]

  locale: SupportedLocale

  expanded?: boolean

  grouped?: boolean

  operationalReportAvailable?: boolean
}>()

const emit = defineEmits<{
  toggleExpand: []
  createOperationalReport: []
  reviewTaskSummary: [taskId: string]
}>()

const explainedTaskId = ref<string | null>(null)

function toggleTaskExplanation(task: Task) {
  explainedTaskId.value =
    explainedTaskId.value === task.id
      ? null
      : task.id
}

function getTaskReason(task: Task) {
  if (task.reason) {
    return getText(task.reason)
  }

  return props.locale === 'vi'
    ? `Nhiệm vụ này cần thiết để xác lập: ${getText(task.description)}`
    : `This task is required to establish: ${getText(task.description)}`
}

function getText(
  value: {
    en: string
    vi: string
  },
) {
  return (
    value[
      props.locale
    ] ?? value.en
  )
}

function getTaskEvidence(
  task: Task,
) {
  return task.requiresEvidence
    .map(id =>
      props.evidence.find(
        item => item.id === id,
      ),
    )
    .filter(
      (item): item is Evidence =>
        Boolean(item),
    )
}

function getDiscoveredCount(
  task: Task,
) {
  return getTaskEvidence(task)
    .filter(item =>
      item.discovered,
    ).length
}
</script>

<template>
  <section
    class="rounded-lg
           border
           border-amber-700/60
           bg-stone-950/95
           p-4
           shadow-lg
           shadow-amber-950/20"
    :class="
      expanded && !grouped
        ? 'fixed inset-4 z-50 flex flex-col bg-stone-950 md:inset-8'
        : expanded
          ? 'flex h-full min-h-0 flex-col'
          : ''
    "
  >
    <div
      class="mb-4
             flex items-center
             justify-between"
             
    >
      <div>
        <div
          class="font-mono
                 text-xs
                 uppercase
                 tracking-[0.2em]
                 text-amber-200"
        >
          Investigation
        </div>

        <div
          class="mt-1
                 text-[10px]
                 text-stone-400"
        >
          Current objectives
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="font-mono
                 text-[10px]
                 text-amber-300"
        >
          {{
            tasks.filter(
              task =>
                task.completed,
            ).length
          }}
          /
          {{ tasks.length }}
        </div>

        <button
          type="button"
          class="rounded border
                 border-amber-700/60
                 px-2 py-1
                 font-mono text-[9px]
                 text-amber-200
                 transition
                 hover:bg-amber-900/40"
          :title="expanded ? 'Collapse tasks' : 'Expand tasks'"
          @click="emit('toggleExpand')"
        >
          [Q] {{ expanded ? '−' : '+' }}
        </button>
      </div>
    </div>
    <div
      class="overflow-y-auto p-3"
      :class="
        expanded
          ? 'min-h-0 flex-1'
          : 'h-[420px]'
      "
    >
      <div class="space-y-3">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="rounded-md
                border p-3"
          :class="
            task.completed
              ? 'border-emerald-600/60 bg-emerald-900/45'
              : 'border-amber-800/60 bg-stone-700/80'
          "
        >
          <div
            class="flex gap-3"
          >
            <button
              type="button"
              class="flex h-5
                    w-5 shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    font-mono
                    text-[10px]"
              :class="
                task.completed
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-amber-600 text-amber-300'
              "
              :title="
                locale === 'vi'
                  ? 'Giải thích nhiệm vụ'
                  : 'Explain this task'
              "
              :aria-expanded="explainedTaskId === task.id"
              @click="toggleTaskExplanation(task)"
            >
              {{
                task.completed
                  ? '✓'
                  : '!'
              }}
            </button>

            <div class="min-w-0 flex-1">
              <div
                class="flex items-start
                       justify-between
                       gap-3"
              >
                <div
                  class="text-xs
                         font-medium"
                  :class="
                    task.completed
                      ? 'text-emerald-300'
                      : 'text-stone-100'
                  "
                >
                  {{ getText(
                      task.title,
                    ) }}
                </div>

                <span
                  class="shrink-0
                         font-mono
                         text-[9px]"
                :class="
                  task.completed
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                "
                >
                  {{ getDiscoveredCount(task) }}
                  /
                  {{ task.requiresEvidence.length }}
                </span>
              </div>

              <div
                class="mt-1
                      text-[10px]
                      leading-5
                      text-stone-300"
              >
                {{ getText(task.description) }}
              </div>

              <button
                v-if="task.completed"
                type="button"
                class="mt-2 rounded border border-emerald-700/70
                       bg-emerald-950/35 px-2.5 py-1.5
                       font-mono text-[9px] uppercase tracking-[0.1em]
                       text-emerald-300 transition
                       hover:border-emerald-500 hover:bg-emerald-900/45"
                @click="emit('reviewTaskSummary', task.id)"
              >
                {{ locale === 'vi' ? 'Xem tổng kết' : 'Review summary' }}
              </button>

              <div
                v-if="explainedTaskId === task.id"
                class="mt-3 rounded-md border border-amber-700/50
                       bg-amber-950/35 p-3"
              >
                <div class="font-mono text-[9px] uppercase
                            tracking-[0.14em] text-amber-300">
                  {{ locale === 'vi' ? 'Vì sao có nhiệm vụ này?' : 'Why does this task exist?' }}
                </div>
                <p class="mt-1.5 text-[10px] leading-5 text-stone-200">
                  {{ getTaskReason(task) }}
                </p>

              </div>

              <div
                v-if="getTaskEvidence(task).length"
                class="mt-3 space-y-1.5
                       border-t
                       border-stone-600/60
                       pt-3"
              >
                <div
                  class="mb-2
                         font-mono
                         text-[9px]
                         uppercase
                         tracking-[0.14em]
                         text-stone-400"
                >
                  {{
                    locale === 'vi'
                      ? 'Bằng chứng liên quan'
                      : 'Related evidence'
                  }}
                </div>

                <div
                  v-for="item in getTaskEvidence(task)"
                  :key="item.id"
                  class="flex items-center
                         gap-2 rounded
                         border px-2 py-1.5"
                  :class="
                    item.discovered
                      ? 'border-emerald-700/50 bg-emerald-950/30'
                      : 'border-stone-600/50 bg-stone-900/30'
                  "
                >
                  <span
                    class="flex h-4 w-4
                           shrink-0 items-center
                           justify-center
                           rounded-full border
                           font-mono text-[8px]"
                    :class="
                      item.discovered
                        ? 'border-emerald-600 text-emerald-300'
                        : 'border-stone-600 text-stone-500'
                    "
                  >
                    {{ item.discovered ? '✓' : '?' }}
                  </span>

                  <span
                    class="truncate text-[10px]"
                    :class="
                      item.discovered
                        ? 'text-emerald-200'
                        : 'text-stone-400'
                    "
                  >
                    {{ getText(item.title) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div
      v-if="operationalReportAvailable"
      class="mt-4 shrink-0 border-t
             border-cyan-900/70 pt-4"
    >
      <div
        class="mb-2 text-center font-mono
               text-[9px] uppercase
               tracking-[0.12em] text-emerald-300"
      >
        {{
          locale === 'vi'
            ? 'Đã đủ thông tin kết luận'
            : 'Conclusion evidence complete'
        }}
      </div>

      <button
        type="button"
        class="w-full rounded-md border
               border-cyan-500
               bg-cyan-950/60 px-4 py-3
               font-mono text-[11px]
               font-semibold uppercase
               tracking-[0.12em]
               text-cyan-100 shadow-lg
               shadow-cyan-950/40 transition
               hover:border-cyan-300
               hover:bg-cyan-900/70"
        @click="emit('createOperationalReport')"
      >
        {{
          locale === 'vi'
            ? 'Lập văn bản tác chiến'
            : 'Prepare operational report'
        }}
      </button>
    </div>
  </section>
</template>
