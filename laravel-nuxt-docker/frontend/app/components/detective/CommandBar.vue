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
           border-zinc-800
           bg-zinc-950
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
               text-zinc-600"
      >
        COMMAND SHORTCUTS
      </span>

      <span
        class="font-mono
               text-[9px]
               text-zinc-700"
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
               border-zinc-800
               bg-black
               px-3 py-1.5
               font-mono
               text-xs
               text-zinc-500
               transition
               hover:border-green-800
               hover:bg-green-950/20
               hover:text-green-400
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