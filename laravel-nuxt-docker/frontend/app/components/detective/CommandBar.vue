<script setup lang="ts">
import type {
  TerminalCommand,
} from '~/types/games/terminal'

const props = defineProps<{
  commands: TerminalCommand[]
}>()

const emit = defineEmits<{
  execute: [command: string]

  input: [value: string]
}>()

function clickCommand(
  command: TerminalCommand,
) {
  if (
    command.requiresArgument
  ) {
    emit(
      'input',
      `${command.command} `,
    )

    return
  }

  emit(
    'execute',
    command.command,
  )
}
</script>

<template>
  <div
    class="rounded-b-lg
           border-x
           border-b
           border-cyan-900/70
           bg-slate-950
           shadow-[0_8px_24px_rgba(8,145,178,0.08)]
           p-3"
  >
    <div
      class="mb-3
             flex items-center
             justify-between"
    >
      <span
        class="font-mono
               text-[10px]
               uppercase
               tracking-[0.2em]
               text-cyan-400"
      >
        COMMAND SHORTCUTS
      </span>

      <span
        class="font-mono
               text-[9px]
               text-slate-500"
      >
        shortcuts only
      </span>
    </div>

    <div
      class="flex flex-wrap
             gap-2"
    >
      <button
        v-for="command in props.commands"
        :key="command.command"
        type="button"
        :title="
          command.description
        "
        class="rounded-md
               border
               border-cyan-900/70
               bg-cyan-950/30
               px-3 py-1.5
               font-mono
               text-xs
               text-cyan-300
               transition
               hover:border-emerald-600
               hover:bg-emerald-950/40
               hover:text-emerald-300
               focus-visible:outline-none
               focus-visible:ring-1
               focus-visible:ring-cyan-400
               active:scale-95"
        @click="
          clickCommand(command)
        "
      >
        $ {{ command.command }}
      </button>
    </div>
  </div>
</template>
