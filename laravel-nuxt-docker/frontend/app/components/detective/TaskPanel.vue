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
           border-zinc-800
           bg-zinc-950
           p-4"
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
                 text-zinc-500"
        >
          Investigation
        </div>

        <div
          class="mt-1
                 text-[10px]
                 text-zinc-700"
        >
          Current objectives
        </div>
      </div>

      <div
        class="font-mono
               text-[10px]
               text-zinc-700"
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

    <div class="space-y-3 h-[320px] overflow-y-auto">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="rounded-md
               border p-3"
        :class="
          task.completed
            ? 'border-green-900/50 bg-green-950/10'
            : 'border-zinc-900 bg-black/20'
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
                ? 'border-green-800 text-green-500'
                : 'border-zinc-800 text-zinc-700'
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
                  ? 'text-green-400'
                  : 'text-zinc-400'
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
                     text-zinc-600"
            >
              {{ getText(task.description) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>