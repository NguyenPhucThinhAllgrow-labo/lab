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
}>()

const emit = defineEmits<{
  toggleExpand: []
}>()

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
           bg-stone-800/90
           p-4
           shadow-lg
           shadow-amber-950/20"
    :class="
      expanded
        ? 'fixed inset-4 z-50 flex flex-col bg-stone-900 md:inset-8'
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
              ? 'border-emerald-600/60 bg-emerald-900/30'
              : 'border-amber-800/60 bg-stone-700/50'
          "
        >
          <div
            class="flex gap-3"
          >
            <div
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
            >
              {{
                task.completed
                  ? '✓'
                  : '!'
              }}
            </div>

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
  </section>
</template>
