<script setup lang="ts">
import { getScenario } from '~/data/scenarios'

import ScenarioHeader from '~/components/detective/ScenarioHeader.vue'
import Terminal from '~/components/detective/Terminal.vue'
import CommandBar from '~/components/detective/CommandBar.vue'
import TaskPanel from '~/components/detective/TaskPanel.vue'
import EvidencePanel from '~/components/detective/EvidencePanel.vue'

/*
 * --------------------------------------------------
 * SCENARIO
 * --------------------------------------------------
 */

const scenario =
  getScenario('case003')

if (!scenario) {
  throw new Error(
    'Scenario "case001" not found.',
  )
}

/*
 * --------------------------------------------------
 * GAME
 * --------------------------------------------------
 */

const game =
  useDetectiveGame(
    scenario,
  )

/*
 * --------------------------------------------------
 * TERMINAL INPUT
 * --------------------------------------------------
 */

const terminalInput =
  ref('')

/*
 * --------------------------------------------------
 * AUTOCOMPLETE
 * --------------------------------------------------
 */

const autocompleteEntries =
  computed(() =>
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
  game.execute(
    command,
  )

  terminalInput.value =
    ''
}

/*
 * --------------------------------------------------
 * COMMAND BAR
 * --------------------------------------------------
 */

function handleCommandBarInput(
  value: string,
) {
  terminalInput.value =
    value
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
      >
        <Terminal
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
          :locale="
            game.state.locale
          "
        />

        <EvidencePanel
          :evidence="
            game.state.evidence
          "
          :locale="
            game.state.locale
          "
        />
      </aside>
    </div>
  </main>
</template>