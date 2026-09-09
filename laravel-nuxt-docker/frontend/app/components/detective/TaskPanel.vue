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

  linkedEvidence: Record<string, string[]>

  selectedEvidence: Evidence[]

  linkFeedback?: {
    success: boolean
    message: string
  } | null

  linkingMode?: boolean
}>()

const emit = defineEmits<{
  toggleExpand: []
  createOperationalReport: []
  reviewTaskSummary: [taskId: string]
  linkEvidence: [taskId: string, evidenceIds: string[]]
}>()

const explainedTaskId = ref<string | null>(null)

const completedTasks = computed(() =>
  props.tasks.filter(task => task.completed),
)

const activeTask = computed(() =>
  props.tasks.find(task => !task.completed) ?? null,
)

const hiddenTaskCount = computed(() => {
  if (!activeTask.value) return 0

  const activeIndex = props.tasks.findIndex(
    task => task.id === activeTask.value?.id,
  )

  return Math.max(0, props.tasks.length - activeIndex - 1)
})

const lockedTasks = computed(() => {
  if (!activeTask.value) return []
  const activeIndex = props.tasks.findIndex(task => task.id === activeTask.value?.id)
  return props.tasks.slice(activeIndex + 1).filter(task => !task.completed)
})

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

function getDiscoveredCount(
  task: Task,
) {
  return props.linkedEvidence[task.id]?.length ?? 0
}

function getLinkedTaskEvidence(task: Task) {
  const linkedIds = props.linkedEvidence[task.id] ?? []

  return linkedIds
    .map(id => props.evidence.find(item => item.id === id))
    .filter((item): item is Evidence => Boolean(item))
}

function getRequiredTaskEvidence(task: Task) {
  return task.requiresEvidence
    .map(id => props.evidence.find(item => item.id === id))
    .filter((item): item is Evidence => Boolean(item))
}

function isEvidenceLinked(task: Task, evidenceId: string) {
  return props.linkedEvidence[task.id]?.includes(evidenceId) ?? false
}
</script>

<template>
  <section
    class="detective-running-frame rounded-lg
           border
           border-emerald-800/70
           bg-[#030b08]/95
           p-4
           shadow-lg
           shadow-[0_0_30px_rgba(16,185,129,0.08)]"
    :class="[
      expanded && !grouped
        ? 'fixed inset-4 z-50 flex flex-col bg-[#030b08] md:inset-8'
        : expanded
          ? 'relative flex h-full min-h-0 flex-col'
          : 'relative',
      activeTask ? 'task-panel-active' : 'task-panel-verified',
    ]"
  >
    <span class="detective-border-runner" aria-hidden="true" />

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
                 text-emerald-300"
        >
          {{ locale === 'vi' ? 'Chỉ thị điều tra' : 'Investigation order' }}
        </div>

        <div
          class="mt-1
                 text-[10px]
                 text-stone-400"
        >
          {{
            activeTask
              ? locale === 'vi'
                ? 'Nhiệm vụ hiện tại do cảnh sát giao'
                : 'Current police assignment'
              : locale === 'vi'
                ? 'Đã xử lý toàn bộ chỉ thị'
                : 'All assignments processed'
          }}
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="font-mono
                 text-[10px]
                 text-emerald-400"
        >
          {{
            completedTasks.length
          }}
          /
          {{ tasks.length }}
        </div>

        <button
          type="button"
          class="rounded border
                 border-emerald-700/70
                 px-2 py-1
                 font-mono text-[9px]
                 text-emerald-300
                 transition
                 hover:bg-emerald-950/70"
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
          v-if="activeTask"
          class="mb-3 flex items-center gap-3 rounded-md border border-cyan-800/60 bg-cyan-950/25 px-3 py-2"
        >
          <span class="relative flex h-2.5 w-2.5 shrink-0">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>
          <div class="font-mono text-[9px] uppercase tracking-[0.13em] text-cyan-300">
            {{ locale === 'vi' ? 'Đã nhận chỉ thị từ đơn vị điều tra' : 'Assignment received from investigation unit' }}
          </div>
        </div>

        <div
          v-if="activeTask"
          :key="activeTask.id"
          class="rounded-md border border-emerald-700/70 bg-emerald-950/35 p-3 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
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
                activeTask.completed
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-amber-600 text-amber-300'
              "
              :title="
                locale === 'vi'
                  ? 'Giải thích nhiệm vụ'
                  : 'Explain this task'
              "
              :aria-expanded="explainedTaskId === activeTask.id"
              @click="toggleTaskExplanation(activeTask)"
            >
              {{
                activeTask.completed
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
                    activeTask.completed
                      ? 'text-emerald-300'
                      : 'text-stone-100'
                  "
                >
                  {{ getText(
                      activeTask.title,
                    ) }}
                  <span class="ml-1 font-mono text-cyan-500">[{{ activeTask.id }}]</span>
                </div>

                <span
                  class="shrink-0
                         font-mono
                         text-[9px]
                         text-amber-300"
                >
                  {{ getDiscoveredCount(activeTask) }}
                  /
                  {{ activeTask.requiresEvidence.length }}
                </span>
              </div>

              <div
                class="mt-1
                      text-[10px]
                      leading-5
                      text-stone-300"
              >
                {{ getText(activeTask.description) }}
              </div>

              <button
                v-if="activeTask.completed"
                type="button"
                class="mt-2 rounded border border-emerald-700/70
                       bg-emerald-950/35 px-2.5 py-1.5
                       font-mono text-[9px] uppercase tracking-[0.1em]
                       text-emerald-300 transition
                       hover:border-emerald-500 hover:bg-emerald-900/45"
                @click="emit('reviewTaskSummary', activeTask.id)"
              >
                {{ locale === 'vi' ? 'Xem tổng kết' : 'Review summary' }}
              </button>

              <div
                v-if="explainedTaskId === activeTask.id"
                class="mt-3 rounded-md border border-amber-700/50
                       bg-amber-950/35 p-3"
              >
                <div class="font-mono text-[9px] uppercase
                            tracking-[0.14em] text-amber-300">
                  {{ locale === 'vi' ? 'Vì sao có nhiệm vụ này?' : 'Why does this task exist?' }}
                </div>
                <p class="mt-1.5 text-[10px] leading-5 text-stone-200">
                  {{ getTaskReason(activeTask) }}
                </p>

              </div>

              <div
                class="mt-3 space-y-1.5
                       border-t
                       border-stone-600/60
                       pt-3"
              >
                <div
                  class="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px]"
                >
                  <span class="uppercase tracking-[0.14em] text-stone-400">
                    {{ locale === 'vi' ? 'Bằng chứng liên quan' : 'Related evidence' }}
                  </span>
                  <span class="normal-case tracking-normal text-cyan-500">
                    {{ !linkingMode
                      ? (locale === 'vi' ? 'Mở [Q] + [E] để đối chiếu' : 'Open [Q] + [E] to link')
                      : selectedEvidence.length
                        ? (locale === 'vi' ? `${selectedEvidence.length} evidence đã chọn` : `${selectedEvidence.length} selected`)
                        : (locale === 'vi' ? 'Chọn evidence ở panel [E]' : 'Select evidence in panel [E]') }}
                  </span>
                </div>

                <button
                  v-if="linkingMode && selectedEvidence.length"
                  type="button"
                  class="mb-2.5 w-full rounded border border-cyan-600/70 bg-cyan-950/40 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-900/50"
                  @click="emit('linkEvidence', activeTask.id, selectedEvidence.map(item => item.id))"
                >
                  {{ locale === 'vi'
                    ? `Đối chiếu ${selectedEvidence.length} evidence đang chọn`
                    : `Link ${selectedEvidence.length} selected evidence` }}
                </button>

                <div
                  v-if="linkFeedback"
                  class="mb-2.5 rounded border px-2.5 py-2 font-mono text-[9px] leading-4"
                  :class="linkFeedback.success
                    ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300'
                    : 'border-red-800/60 bg-red-950/25 text-red-300'"
                >
                  {{ linkFeedback.message }}
                </div>

                <div
                  v-for="item in getRequiredTaskEvidence(activeTask)"
                  :key="item.id"
                  class="flex items-center
                         gap-2 rounded
                         border px-2 py-1.5"
                  :class="
                    isEvidenceLinked(activeTask, item.id)
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
                      isEvidenceLinked(activeTask, item.id)
                        ? 'border-emerald-600 text-emerald-300'
                        : 'border-stone-600 text-stone-500'
                    "
                  >
                    {{ isEvidenceLinked(activeTask, item.id) ? '✓' : '?' }}
                  </span>

                  <span
                    class="truncate text-[10px]"
                    :class="
                      isEvidenceLinked(activeTask, item.id)
                        ? 'text-emerald-200'
                        : 'text-amber-100/80'
                    "
                  >
                    {{ getText(item.title) }}
                    <span class="ml-1 text-cyan-500">[{{ item.id }}]</span>
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-md border border-emerald-700/60 bg-emerald-950/35 p-5 text-center"
        >
          <div class="font-mono text-xs uppercase tracking-[0.16em] text-emerald-300">
            {{ locale === 'vi' ? 'Toàn bộ nhiệm vụ đã hoàn thành' : 'All assignments completed' }}
          </div>
        </div>

        <div
          v-if="hiddenTaskCount"
          class="rounded-md border border-dashed border-stone-700 bg-black/20 px-3 py-3 text-center"
        >
          <div class="font-mono text-[9px] uppercase tracking-[0.12em] text-stone-500">
            {{
              locale === 'vi'
                ? `${hiddenTaskCount} nhiệm vụ tiếp theo đang chờ cảnh sát chỉ định`
                : `${hiddenTaskCount} further assignments awaiting police authorization`
            }}
          </div>
          <div class="mt-2 space-y-1 text-left">
            <div
              v-for="(task, index) in lockedTasks"
              :key="task.id"
              class="truncate font-mono text-[9px] text-stone-600"
            >
              [LOCKED] {{ locale === 'vi' ? 'CHỈ THỊ' : 'ASSIGNMENT' }} {{ String(index + 2).padStart(2, '0') }}
            </div>
          </div>
        </div>

        <details v-if="completedTasks.length" class="rounded-md border border-stone-800 bg-black/20">
          <summary class="cursor-pointer px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-stone-500 hover:text-emerald-300">
            {{ locale === 'vi' ? `Hồ sơ đã hoàn thành (${completedTasks.length})` : `Completed files (${completedTasks.length})` }}
          </summary>
          <div class="space-y-2 border-t border-stone-800 p-2">
            <details
              v-for="task in completedTasks"
              :key="task.id"
              class="completed-task-record overflow-hidden rounded border border-emerald-900/60 bg-emerald-950/20 transition"
            >
              <summary class="completed-task-summary flex cursor-pointer list-none items-center justify-between gap-3 px-2.5 py-2 text-[10px] text-emerald-300 transition hover:bg-emerald-950/40">
                <span class="flex min-w-0 items-center gap-2">
                  <span class="shrink-0 font-mono">[VERIFIED] ✓</span>
                  <span class="truncate">
                    {{ getText(task.title) }}
                    <span class="text-emerald-600">[{{ task.id }}]</span>
                  </span>
                </span>
                <span class="shrink-0 font-mono text-[9px] text-emerald-600">
                  {{ getLinkedTaskEvidence(task).length }}
                  {{ locale === 'vi' ? 'bằng chứng' : 'evidence' }} ▾
                </span>
              </summary>

              <div class="border-t border-emerald-950/80 p-2.5">
                <div class="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-stone-500">
                  {{ locale === 'vi' ? 'Bằng chứng đã xác minh' : 'Verified evidence' }}
                </div>

                <div
                  v-if="getLinkedTaskEvidence(task).length"
                  class="space-y-1.5"
                >
                  <div
                    v-for="item in getLinkedTaskEvidence(task)"
                    :key="item.id"
                    class="flex items-start gap-2 rounded border border-emerald-900/50 bg-black/20 px-2 py-1.5"
                  >
                    <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-700 font-mono text-[8px] text-emerald-300">
                      ✓
                    </span>
                    <div class="min-w-0">
                      <div class="text-[10px] text-emerald-200">
                        {{ getText(item.title) }}
                        <span class="ml-1 text-cyan-600">[{{ item.id }}]</span>
                      </div>
                      <div class="mt-0.5 text-[9px] leading-4 text-stone-400">
                        {{ getText(item.description) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-[9px] text-stone-600">
                  {{ locale === 'vi' ? 'Không có evidence được liên kết.' : 'No linked evidence.' }}
                </div>

                <button
                  type="button"
                  class="mt-2.5 w-full rounded border border-emerald-800/70 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-emerald-400 transition hover:bg-emerald-950/50"
                  @click="emit('reviewTaskSummary', task.id)"
                >
                  {{ locale === 'vi' ? 'Xem lại kết luận' : 'Review conclusion' }}
                </button>
              </div>
            </details>
          </div>
        </details>

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

<style scoped src="~/assets/css/components/detective/TaskPanel.css"></style>
