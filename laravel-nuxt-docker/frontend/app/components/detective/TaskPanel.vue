<script setup lang="ts">
import type {
    SupportedLocale,
  Task,
} from '~/types/games/detective'

const props = defineProps<{
  tasks: Task[]

  locale: SupportedLocale
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
    </div>
    <div class="h-[320px] overflow-y-auto p-3">
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

            <div>
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

              <div
                class="mt-1
                      text-[10px]
                      leading-5
                      text-stone-300"
              >
                {{ getText(task.description) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
