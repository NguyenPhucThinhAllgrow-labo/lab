<script setup lang="ts">
import { getScenario } from '~/data/scenarios'

import ScenarioHeader from '~/components/detective/ScenarioHeader.vue'
import Terminal from '~/components/detective/Terminal.vue'
import CommandBar from '~/components/detective/CommandBar.vue'
import TaskPanel from '~/components/detective/TaskPanel.vue'
import EvidencePanel from '~/components/detective/EvidencePanel.vue'

/*
 * --------------------------------------------------
 * ROUTE
 * --------------------------------------------------
 */

const route = useRoute()

const caseId = computed(() =>
  String(route.params.caseId),
)

/*
 * --------------------------------------------------
 * SCENARIO
 * --------------------------------------------------
 */

const scenario = getScenario(caseId.value)

if (!scenario) {
  throw createError({
    statusCode: 404,
    statusMessage: `Scenario "${caseId.value}" not found.`,
  })
}

/*
 * --------------------------------------------------
 * GAME
 * --------------------------------------------------
 */

const game = useDetectiveGame(
  scenario,
)

/*
 * --------------------------------------------------
 * TERMINAL INPUT
 * --------------------------------------------------
 */

const terminalInput = ref('')

const terminalRef =
  ref<InstanceType<
    typeof Terminal
  > | null>(null)

const expandedPanel =
  ref<
    'terminal' |
    'task' |
    'evidence' |
    null
  >(
    null,
  )

function togglePanel(
  panel:
    | 'terminal'
    | 'task'
    | 'evidence',
) {
  expandedPanel.value =
    expandedPanel.value === panel
      ? null
      : panel
}

function handlePanelShortcut(
  event: KeyboardEvent,
) {
  if (
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return
  }

  const target = event.target

  if (
    event.key === 'Escape' &&
    expandedPanel.value
  ) {
    event.preventDefault()
    expandedPanel.value = null
    return
  }

  if (
    target instanceof HTMLElement &&
    (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT']
        .includes(target.tagName)
    )
  ) {
    return
  }

  const key = event.key.toLowerCase()

  if (key === 'q') {
    event.preventDefault()
    togglePanel('task')
  }

  if (key === 'e') {
    event.preventDefault()
    togglePanel('evidence')
  }

  if (event.code === 'Space') {
    event.preventDefault()
    togglePanel('terminal')
  }

}

onMounted(() => {
  window.addEventListener(
    'keydown',
    handlePanelShortcut,
  )
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'keydown',
    handlePanelShortcut,
  )
})

/*
 * --------------------------------------------------
 * AUTOCOMPLETE
 * --------------------------------------------------
 */

const autocompleteEntries = computed(() =>
  game.getAutocompleteEntries(
    terminalInput.value,
  ),
)

/*
 * --------------------------------------------------
 * EXECUTE COMMAND
 * --------------------------------------------------
 */

function executeCommand(
  command: string,
) {
  game.execute(command)

  terminalInput.value = ''
}

/*
 * --------------------------------------------------
 * COMMAND BAR
 * --------------------------------------------------
 */

async function handleCommandBarInput(
  value: string,
) {
  terminalInput.value = value

  await nextTick()

  terminalRef.value?.focusInput()
}
</script>

<template>
  <main
    class="min-h-screen
           bg-zinc-950
           text-zinc-200"
  >
    <!-- ==========================================
         SCENARIO HEADER
         ========================================== -->

    <ScenarioHeader
      :id="scenario.id"
      :title="
        game.text(
          scenario.title,
        )
      "
      :description="
        game.text(
          scenario.description,
        )
      "
    />

    <!-- ==========================================
         MAIN LAYOUT
         ========================================== -->

    <div
      class="mx-auto
             grid
             max-w-[1600px]
             grid-cols-1
             gap-5
             p-6
             lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <!-- ========================================
           TERMINAL
           ======================================== -->

      <section
        class="min-w-0"
        :class="
          expandedPanel === 'terminal'
            ? 'fixed inset-4 z-50 flex flex-col bg-zinc-950 md:inset-8'
            : 'relative'
        "
      >
        <button
          type="button"
          class="absolute right-3 top-3
                 z-10 rounded border
                 border-green-800/70
                 bg-black/90 px-2 py-1
                 font-mono text-[9px]
                 text-green-400
                 transition
                 hover:bg-green-950"
          :title="
            expandedPanel === 'terminal'
              ? 'Collapse terminal'
              : 'Expand terminal'
          "
          @click="togglePanel('terminal')"
        >
          [SPACE]
          {{
            expandedPanel === 'terminal'
              ? '−'
              : '+'
          }}
        </button>

        <Terminal
          ref="terminalRef"
          :expanded="
            expandedPanel === 'terminal'
          "
          :lines="
            game.state.terminal
          "
          :current-directory="
            game.state.currentDirectory
          "
          :scenario-id="
            scenario.id
          "
          :input-value="
            terminalInput
          "
          :commands="
            game.terminalCommands.map(
              command =>
                command.command,
            )
          "
          :autocomplete-entries="
            autocompleteEntries
          "
          @execute="
            executeCommand
          "
          @update:input-value="
            terminalInput = $event
          "
        />

        <CommandBar
          :commands="
            game.terminalCommands
          "
          @execute="
            executeCommand
          "
          @input="
            handleCommandBarInput
          "
        />
      </section>

      <!-- ========================================
           TASK + EVIDENCE
           ======================================== -->

      <aside
        class="space-y-5"
      >
        <TaskPanel
          :tasks="
            game.state.tasks
          "
          :evidence="
            game.state.evidence
          "
          :locale="
            game.state.locale
          "
          :expanded="
            expandedPanel === 'task'
          "
          @toggle-expand="
            togglePanel('task')
          "
        />

        <EvidencePanel
          :evidence="
            game.state.evidence
          "
          :locale="
            game.state.locale
          "
          :expanded="
            expandedPanel === 'evidence'
          "
          @toggle-expand="
            togglePanel('evidence')
          "
        />
      </aside>
    </div>
  </main>
</template>
