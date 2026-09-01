<script setup lang="ts">
import type {
  DetectiveProgressPayload,
  DetectiveTimelineEntry,
} from '~/composables/useDetectiveApi'
import type {
  Scenario,
} from '~/types/games/detective'

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

const detectiveApi =
  useDetectiveApi()

let scenario: Scenario

try {
  scenario =
    await detectiveApi.getScenario(
      caseId.value,
    )
} catch {
  throw createError({
    statusCode: 404,
    statusMessage:
      `Scenario "${caseId.value}" could not be loaded from the API.`,
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

const {
  user,
  initialized: authInitialized,
  fetchUser,
} = useAuth()

const progressReady = ref(false)
const resettingGame = ref(false)
const resetConfirmationOpen = ref(false)
const elapsedSeconds = ref(0)
const evidenceHistory = ref<DetectiveTimelineEntry[]>([])
const taskHistory = ref<DetectiveTimelineEntry[]>([])
const progressStatus = ref<
  | 'loading'
  | 'saving'
  | 'saved'
  | 'local'
  | 'error'
>('loading')

let saveTimer:
  ReturnType<typeof setTimeout> |
  null = null

let clockTimer:
  ReturnType<typeof setInterval> |
  null = null

const formattedElapsedTime = computed(() => {
  const hours = Math.floor(elapsedSeconds.value / 3600)
  const minutes = Math.floor((elapsedSeconds.value % 3600) / 60)
  const seconds = elapsedSeconds.value % 60

  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':')
})

const headerTitle = computed(() =>
  game.text(scenario.title),
)

const headerDescription = computed(() =>
  game.text(scenario.description),
)

function createProgressPayload(): DetectiveProgressPayload {
  return {
    locale: game.state.locale,
    current_directory:
      game.state.currentDirectory,
    discovered_evidence:
      game.state.evidence
        .filter(item =>
          item.discovered,
        )
        .map(item => item.id),
    completed_tasks:
      game.state.tasks
        .filter(task =>
          task.completed,
        )
        .map(task => task.id),
    command_history: [
      ...game.state.commandHistory,
    ],
    terminal_lines:
      game.state.terminal.map(
        line => ({ ...line }),
      ),
    game_completed:
      game.state.gameCompleted,
    elapsed_seconds: elapsedSeconds.value,
    evidence_history: [...evidenceHistory.value],
    task_history: [...taskHistory.value],
  }
}

async function loadRemoteProgress() {
  if (!authInitialized.value) {
    await fetchUser()
  }

  if (!user.value) {
    progressStatus.value = 'local'
    progressReady.value = true
    return
  }

  try {
    const progress =
      await detectiveApi.getProgress(
        caseId.value,
      )

    if (progress) {
      game.restoreProgress(progress)
      elapsedSeconds.value = progress.elapsed_seconds ?? 0
      evidenceHistory.value = progress.evidence_history ?? []
      taskHistory.value = progress.task_history ?? []
    }

    progressStatus.value = 'saved'
  } catch {
    progressStatus.value = 'error'
  } finally {
    progressReady.value = true
  }
}

async function persistProgress() {
  if (
    !progressReady.value ||
    !user.value
  ) {
    return
  }

  progressStatus.value = 'saving'

  try {
    await detectiveApi.saveProgress(
      caseId.value,
      createProgressPayload(),
    )

    progressStatus.value = 'saved'
  } catch {
    progressStatus.value = 'error'
  }
}

function scheduleProgressSave() {
  if (
    !progressReady.value ||
    !user.value
  ) {
    return
  }

  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  saveTimer = setTimeout(() => {
    void persistProgress()
  }, 800)
}

function requestGameReset() {
  resetConfirmationOpen.value = true
}

function cancelGameReset() {
  if (!resettingGame.value) {
    resetConfirmationOpen.value = false
  }
}

async function resetGame() {
  resettingGame.value = true
  progressReady.value = false

  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  try {
    if (user.value) {
      await detectiveApi.resetProgress(
        caseId.value,
      )
    }

    game.resetGame()
    elapsedSeconds.value = 0
    evidenceHistory.value = []
    taskHistory.value = []
    terminalInput.value = ''
    expandedPanel.value = null
    progressStatus.value =
      user.value ? 'saved' : 'local'
    resetConfirmationOpen.value = false
  } catch {
    progressStatus.value = 'error'
  } finally {
    progressReady.value = true
    resettingGame.value = false
  }
}

watch(
  () => ({
    locale: game.state.locale,
    directory: game.state.currentDirectory,
    evidence: game.state.evidence.map(item => item.discovered),
    tasks: game.state.tasks.map(task => task.completed),
    commands: game.state.commandHistory.length,
    terminal: game.state.terminal.length,
    completed: game.state.gameCompleted,
    evidenceEvents: evidenceHistory.value.length,
    taskEvents: taskHistory.value.length,
  }),
  scheduleProgressSave,
  { deep: true },
)

watch(
  () => game.state.evidence.map(item => ({ id: item.id, done: item.discovered })),
  items => {
    if (!progressReady.value) return

    for (const item of items) {
      if (item.done && !evidenceHistory.value.some(entry => entry.id === item.id)) {
        evidenceHistory.value.push({
          id: item.id,
          elapsed_seconds: elapsedSeconds.value,
          recorded_at: new Date().toISOString(),
        })
      }
    }
  },
  { deep: true },
)

watch(
  () => game.state.tasks.map(task => ({ id: task.id, done: task.completed })),
  tasks => {
    if (!progressReady.value) return

    for (const task of tasks) {
      if (task.done && !taskHistory.value.some(entry => entry.id === task.id)) {
        taskHistory.value.push({
          id: task.id,
          elapsed_seconds: elapsedSeconds.value,
          recorded_at: new Date().toISOString(),
        })
      }
    }
  },
  { deep: true },
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
    resetConfirmationOpen.value
  ) {
    event.preventDefault()
    cancelGameReset()
    return
  }

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

  void loadRemoteProgress()

  clockTimer = setInterval(() => {
    if (progressReady.value && !game.state.gameCompleted) {
      elapsedSeconds.value += 1

      if (user.value && elapsedSeconds.value % 30 === 0) {
        void persistProgress()
      }
    }
  }, 1000)
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'keydown',
    handlePanelShortcut,
  )

  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  if (clockTimer) {
    clearInterval(clockTimer)
  }
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
        headerTitle
      "
      :description="
        headerDescription
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
        <div
          class="flex items-center
                 justify-between gap-3"
        >
          <div
            class="rounded border
                   border-cyan-900/70
                   bg-cyan-950/20
                   px-2.5 py-1
                   font-mono text-[10px]
                   tracking-[0.12em]
                   text-cyan-300"
            title="Elapsed investigation time"
          >
            ⏱ {{ formattedElapsedTime }}
          </div>

          <div
            class="flex items-center
                 gap-2
                 font-mono text-[9px]
                 uppercase
                 tracking-[0.12em]"
            :class="{
              'text-amber-400':
                progressStatus === 'loading' ||
                progressStatus === 'saving',
              'text-emerald-400':
                progressStatus === 'saved',
              'text-zinc-600':
                progressStatus === 'local',
              'text-red-400':
                progressStatus === 'error',
            }"
          >
            <span
              class="h-1.5 w-1.5
                     rounded-full bg-current"
            />
            {{
              progressStatus === 'loading'
                ? 'Loading progress'
                : progressStatus === 'saving'
                  ? 'Saving progress'
                  : progressStatus === 'saved'
                    ? 'Progress saved'
                    : progressStatus === 'local'
                      ? 'Local session'
                      : 'Sync failed'
            }}
          </div>

          <button
            type="button"
            class="rounded border
                   border-red-900/70
                   px-2.5 py-1
                   font-mono text-[9px]
                   uppercase
                   tracking-[0.1em]
                   text-red-400 transition
                   hover:bg-red-950/40
                   disabled:cursor-not-allowed
                   disabled:opacity-40"
            :disabled="
              resettingGame ||
              progressStatus === 'loading' ||
              progressStatus === 'saving'
            "
            @click="requestGameReset"
          >
            {{
              resettingGame
                ? 'Resetting...'
                : 'Reset game'
            }}
          </button>
        </div>

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

    <Teleport to="body">
      <div
        v-if="resetConfirmationOpen"
        class="fixed inset-0 z-[100]
               flex items-center
               justify-center
               bg-black/80 p-4
               backdrop-blur-sm"
        role="presentation"
        @click.self="cancelGameReset"
      >
        <section
          class="w-full max-w-md
                 rounded-xl border
                 border-red-900/70
                 bg-zinc-950 p-6
                 shadow-2xl
                 shadow-black/70"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          aria-describedby="reset-dialog-description"
        >
          <div
            class="mb-4 flex h-10 w-10
                   items-center justify-center
                   rounded-full border
                   border-red-800
                   bg-red-950/40
                   font-mono text-red-400"
          >
            !
          </div>

          <h2
            id="reset-dialog-title"
            class="text-lg font-semibold
                   text-zinc-100"
          >
            {{
              game.state.locale === 'vi'
                ? 'Khởi động lại vụ án?'
                : 'Restart this case?'
            }}
          </h2>

          <p
            id="reset-dialog-description"
            class="mt-3 text-sm
                   leading-6 text-zinc-400"
          >
            {{
              game.state.locale === 'vi'
                ? 'Toàn bộ tiến trình hiện tại, thời gian, evidence và task đã hoàn thành sẽ bị xóa. Lịch sử của những lượt đã hoàn thành vẫn được giữ lại.'
                : 'Current progress, elapsed time, discovered evidence and completed tasks will be deleted. Previously completed run history will be kept.'
            }}
          </p>

          <div
            class="mt-6 flex
                   justify-end gap-3"
          >
            <button
              type="button"
              class="rounded-md border
                     border-zinc-700
                     px-4 py-2
                     text-xs text-zinc-300
                     transition
                     hover:bg-zinc-800
                     disabled:opacity-40"
              :disabled="resettingGame"
              @click="cancelGameReset"
            >
              {{
                game.state.locale === 'vi'
                  ? 'Hủy'
                  : 'Cancel'
              }}
            </button>

            <button
              type="button"
              class="rounded-md border
                     border-red-700
                     bg-red-950/50
                     px-4 py-2
                     text-xs text-red-300
                     transition
                     hover:bg-red-900/50
                     disabled:cursor-wait
                     disabled:opacity-50"
              :disabled="resettingGame"
              @click="resetGame"
            >
              {{
                resettingGame
                  ? game.state.locale === 'vi'
                    ? 'Đang reset...'
                    : 'Resetting...'
                  : game.state.locale === 'vi'
                    ? 'Xóa và bắt đầu lại'
                    : 'Delete and restart'
              }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </main>
</template>
