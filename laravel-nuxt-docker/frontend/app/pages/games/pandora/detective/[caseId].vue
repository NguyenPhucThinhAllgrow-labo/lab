<script setup lang="ts">
import type {
  DetectiveProgressPayload,
  DetectiveTimelineEntry,
} from '~/composables/useDetectiveApi'
import type {
  Scenario,
  ScenarioTimelineEvent,
  Task,
} from '~/types/games/detective'

import ScenarioHeader from '~/components/detective/ScenarioHeader.vue'
import Terminal from '~/components/detective/Terminal.vue'
import CommandBar from '~/components/detective/CommandBar.vue'
import TaskPanel from '~/components/detective/TaskPanel.vue'
import EvidencePanel from '~/components/detective/EvidencePanel.vue'
import PasswordPrompt from '~/components/detective/PasswordPrompt.vue'
import CaseTimelineModal from '~/components/detective/CaseTimelineModal.vue'
import OperationalReportModal from '~/components/detective/OperationalReportModal.vue'
import PersonProfilesModal from '~/components/detective/PersonProfilesModal.vue'
import TaskCompletionNotice from '~/components/detective/TaskCompletionNotice.vue'

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
const timelineOpen = ref(false)
const personProfilesOpen = ref(false)
const operationalReportOpen = ref(false)
const operationalReportSuccess = ref(false)
const completedTaskNotice = ref<Task | null>(null)
const terminalLightTheme = ref(false)
const terminalResetKey = ref(0)
const selectedEvidenceIds = ref<string[]>([])
const evidenceLinkFeedback = ref<{ success: boolean; message: string } | null>(null)
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

let taskNoticeTimer:
  ReturnType<typeof setTimeout> |
  null = null

const TERMINAL_THEME_KEY =
  'detective-terminal-theme'

const localProgressKey = computed(() =>
  `detective-progress:${caseId.value}`,
)

function readLocalProgress(): DetectiveProgressPayload | null {
  try {
    const stored = localStorage.getItem(localProgressKey.value)
    if (!stored) return null

    const progress = JSON.parse(stored) as DetectiveProgressPayload
    return progress && Array.isArray(progress.discovered_evidence)
      ? progress
      : null
  } catch {
    localStorage.removeItem(localProgressKey.value)
    return null
  }
}

function writeLocalProgress(progress: DetectiveProgressPayload) {
  try {
    localStorage.setItem(localProgressKey.value, JSON.stringify(progress))
  } catch {
    // Preserve core state even if verbose terminal output fills the quota.
    localStorage.setItem(localProgressKey.value, JSON.stringify({
      ...progress,
      command_history: progress.command_history.slice(-100),
      terminal_lines: progress.terminal_lines.slice(-150),
    }))
  }
}

function applyProgress(progress: DetectiveProgressPayload) {
  game.restoreProgress(progress)
  elapsedSeconds.value = progress.elapsed_seconds ?? 0
  evidenceHistory.value = progress.evidence_history ?? []
  taskHistory.value = progress.task_history ?? []
}

function toggleTerminalTheme() {
  terminalLightTheme.value =
    !terminalLightTheme.value

  localStorage.setItem(
    TERMINAL_THEME_KEY,
    terminalLightTheme.value
      ? 'light'
      : 'dark',
  )
}

const formattedElapsedTime = computed(() => {
  const hours = Math.floor(elapsedSeconds.value / 3600)
  const minutes = Math.floor((elapsedSeconds.value % 3600) / 60)
  const seconds = elapsedSeconds.value % 60

  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':')
})

const investigationScore = computed(() =>
  Math.max(0, 100 - game.state.hintPenalty),
)

const selectedEvidence = computed(() =>
  game.state.evidence.filter(item => selectedEvidenceIds.value.includes(item.id)),
)

const verifiedEvidenceIds = computed(() => [
  ...new Set(Object.values(game.state.linkedEvidence).flat()),
])

function selectEvidenceForLink(evidenceId: string) {
  if (!evidenceLinkingMode.value) return

  selectedEvidenceIds.value = selectedEvidenceIds.value.includes(evidenceId)
    ? selectedEvidenceIds.value.filter(id => id !== evidenceId)
    : [...selectedEvidenceIds.value, evidenceId]
  evidenceLinkFeedback.value = null
}

function linkSelectedEvidence(taskId: string, evidenceIds: string[]) {
  if (!evidenceLinkingMode.value) return

  let linkedCount = 0

  for (const evidenceId of evidenceIds) {
    if (game.linkEvidenceToTask(taskId, evidenceId)) {
      linkedCount += 1
    }
  }

  const rejectedCount = evidenceIds.length - linkedCount
  const taskCompleted = game.state.tasks
    .find(task => task.id === taskId)
    ?.completed ?? false

  evidenceLinkFeedback.value = rejectedCount > 0 && !taskCompleted
    ? {
        success: false,
        message: game.state.locale === 'vi'
          ? `${rejectedCount} evidence không phù hợp với nhiệm vụ hiện tại.`
          : `${rejectedCount} evidence does not support the current assignment.`,
      }
    : null

  selectedEvidenceIds.value = []
}

const headerTitle = computed(() =>
  game.text(scenario.title),
)

const headerDescription = computed(() =>
  game.text(scenario.description),
)

const visibleTimelineEvents = computed<ScenarioTimelineEvent[]>(() => {
  const discoveredIds = new Set(
    game.state.evidence
      .filter(item => item.discovered)
      .map(item => item.id),
  )

  if (scenario.timeline?.length) {
    return scenario.timeline.filter(event => {
      if (
        event.requiresGameCompletion &&
        !game.state.gameCompleted
      ) {
        return false
      }

      return (event.requiresEvidence ?? []).every(id =>
        discoveredIds.has(id),
      )
    })
  }

  return game.state.evidence
    .map((evidence, index) => ({
      evidence,
      index,
    }))
    .filter(item => item.evidence.discovered)
    .map(({ evidence, index }) => ({
      time: `E${String(index + 1).padStart(2, '0')}`,
      category: 'trace' as const,
      title: evidence.title,
      description: evidence.description,
      requiresEvidence: [evidence.id],
    }))
})

const timelineTotalEvents = computed(() =>
  scenario.timeline?.length ?? scenario.evidence.length,
)

const discoveredEvidenceIds = computed(() =>
  game.state.evidence
    .filter(item => item.discovered)
    .map(item => item.id),
)

const nextTaskAfterNotice = computed(() => {
  if (!completedTaskNotice.value) return undefined

  const completedIndex = game.state.tasks.findIndex(
    task => task.id === completedTaskNotice.value?.id,
  )

  return game.state.tasks
    .slice(completedIndex + 1)
    .find(task => !task.completed)
})

function showTaskCompletionNotice(task: Task) {
  completedTaskNotice.value = task

  if (taskNoticeTimer) clearTimeout(taskNoticeTimer)
  taskNoticeTimer = setTimeout(() => {
    completedTaskNotice.value = null
    taskNoticeTimer = null
  }, 12000)
}

function closeTaskCompletionNotice() {
  completedTaskNotice.value = null
  if (taskNoticeTimer) {
    clearTimeout(taskNoticeTimer)
    taskNoticeTimer = null
  }
}

function reviewTaskSummary(taskId: string) {
  const task = game.state.tasks.find(item => item.id === taskId)
  if (task?.completed) showTaskCompletionNotice(task)
}

const operationalReportAvailable = computed(() => {
  return game.isOperationalReportAvailable()
})

function confirmOperationalReport() {
  if (game.completeOperationalReport()) {
    operationalReportSuccess.value = true
  }
}

function openOperationalReport() {
  operationalReportSuccess.value =
    game.state.gameCompleted
  operationalReportOpen.value = true
}

function closeOperationalReport() {
  operationalReportOpen.value = false
  operationalReportSuccess.value = false
}

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
    linked_evidence: Object.fromEntries(
      Object.entries(game.state.linkedEvidence).map(([taskId, ids]) => [taskId, [...ids]]),
    ),
    unlocked_paths: [
      ...game.state.unlockedPaths,
    ],
    command_history: [
      ...game.state.commandHistory,
    ],
    hint_count: game.state.hintCount,
    hint_penalty: game.state.hintPenalty,
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
  const localProgress = readLocalProgress()

  try {
    if (!authInitialized.value) {
      await fetchUser()
    }
  } catch {
    if (localProgress) applyProgress(localProgress)
    progressStatus.value = 'local'
    progressReady.value = true
    return
  }

  if (!user.value) {
    if (localProgress) applyProgress(localProgress)
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
      writeLocalProgress(createProgressPayload())
    } else if (localProgress) {
      applyProgress(localProgress)
    }

    progressStatus.value = progress ? 'saved' : 'local'
  } catch {
    if (localProgress) applyProgress(localProgress)
    progressStatus.value = 'local'
  } finally {
    progressReady.value = true
  }
}

async function persistProgress() {
  if (!progressReady.value) {
    return
  }

  const payload = createProgressPayload()
  writeLocalProgress(payload)

  if (!user.value) {
    progressStatus.value = 'local'
    return
  }

  progressStatus.value = 'saving'

  try {
    await detectiveApi.saveProgress(
      caseId.value,
      payload,
    )

    progressStatus.value = 'saved'
  } catch {
    // The local snapshot remains available even when the API is offline.
    progressStatus.value = 'local'
  }
}

function scheduleProgressSave() {
  if (!progressReady.value) {
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

    localStorage.removeItem(localProgressKey.value)

    game.resetGame()
    // Recreate the terminal so its output queue is empty and the intro
    // animation always starts again, even when the new intro has the same
    // number of lines and uses the same locale.
    terminalResetKey.value += 1
    elapsedSeconds.value = 0
    evidenceHistory.value = []
    taskHistory.value = []
    terminalInput.value = ''
    selectedEvidenceIds.value = []
    evidenceLinkFeedback.value = null
    operationalReportOpen.value = false
    operationalReportSuccess.value = false
    personProfilesOpen.value = false
    closeTaskCompletionNotice()
    collapseExpandedPanels()
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
    linkedEvidence: Object.entries(game.state.linkedEvidence)
      .map(([taskId, ids]) => [taskId, [...ids]]),
    unlockedPaths: [...game.state.unlockedPaths],
    commands: game.state.commandHistory.length,
    hints: game.state.hintCount,
    hintPenalty: game.state.hintPenalty,
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

        const completedTask = game.state.tasks.find(item => item.id === task.id)
        if (completedTask) showTaskCompletionNotice(completedTask)
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

type ExpandablePanel =
  | 'terminal'
  | 'task'
  | 'evidence'

const expandedPanels = reactive<
  Record<ExpandablePanel, boolean>
>({
  terminal: false,
  task: false,
  evidence: false,
})

const allPanelsExpanded = computed(
  () =>
    expandedPanels.terminal &&
    expandedPanels.task &&
    expandedPanels.evidence,
)

const expandedPanelCount = computed(
  () =>
    Object.values(expandedPanels)
      .filter(Boolean).length,
)

const multiplePanelsExpanded = computed(
  () => expandedPanelCount.value >= 2,
)

const evidenceLinkingMode = computed(() =>
  expandedPanels.task && expandedPanels.evidence,
)

watch(evidenceLinkingMode, enabled => {
  if (!enabled) {
    selectedEvidenceIds.value = []
    evidenceLinkFeedback.value = null
  }
})

function collapseExpandedPanels() {
  expandedPanels.terminal = false
  expandedPanels.task = false
  expandedPanels.evidence = false
}

function togglePanel(
  panel: ExpandablePanel,
) {
  expandedPanels[panel] =
    !expandedPanels[panel]
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
    game.state.passwordPrompt
  ) {
    event.preventDefault()
    game.cancelPasswordPrompt()
    return
  }

  if (
    event.key === 'Escape' &&
    timelineOpen.value
  ) {
    event.preventDefault()
    timelineOpen.value = false
    return
  }

  if (
    event.key === 'Escape' &&
    personProfilesOpen.value
  ) {
    event.preventDefault()
    personProfilesOpen.value = false
    return
  }

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
    operationalReportOpen.value
  ) {
    event.preventDefault()
    closeOperationalReport()
    return
  }

  if (
    event.key === 'Escape' &&
    Object.values(expandedPanels)
      .some(Boolean)
  ) {
    event.preventDefault()
    collapseExpandedPanels()
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

  if (
    key === 'm' &&
    !game.state.passwordPrompt &&
    !resetConfirmationOpen.value
  ) {
    event.preventDefault()
    timelineOpen.value = !timelineOpen.value
    return
  }

  if (
    key === 'p' &&
    scenario.people?.length &&
    !game.state.passwordPrompt &&
    !resetConfirmationOpen.value
  ) {
    event.preventDefault()
    personProfilesOpen.value = !personProfilesOpen.value
    return
  }

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
  terminalLightTheme.value =
    localStorage.getItem(
      TERMINAL_THEME_KEY,
    ) === 'light'

  window.addEventListener(
    'keydown',
    handlePanelShortcut,
  )

  void loadRemoteProgress()

  clockTimer = setInterval(() => {
    if (progressReady.value && !game.state.gameCompleted) {
      elapsedSeconds.value += 1

      if (elapsedSeconds.value % 30 === 0) {
        void persistProgress()
      }
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (progressReady.value) {
    writeLocalProgress(createProgressPayload())
  }

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

  if (taskNoticeTimer) {
    clearTimeout(taskNoticeTimer)
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
    class="hacker-workspace min-h-screen
           bg-[#020706]
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

    <div class="fixed bottom-5 right-5 z-40 flex flex-wrap justify-end gap-2">
      <button
        v-if="scenario.people?.length"
        type="button"
        class="rounded-lg border border-violet-700/70 bg-slate-950/95 px-3 py-2 font-mono text-xs text-violet-300 shadow-xl transition hover:bg-violet-950/80"
        :title="game.state.locale === 'vi' ? 'Mở hồ sơ nhân vật (P)' : 'Open person profiles (P)'"
        @click="personProfilesOpen = true"
      >
        [P] {{ game.state.locale === 'vi' ? 'Đối tượng' : 'People' }}
      </button>

      <button
        type="button"
        class="rounded-lg border border-cyan-700/70 bg-slate-950/95 px-3 py-2 font-mono text-xs text-cyan-300 shadow-xl transition hover:bg-cyan-950/80"
        title="Open case timeline (M)"
        @click="timelineOpen = true"
      >
        [M] {{ game.state.locale === 'vi' ? 'Dòng sự kiện' : 'Timeline' }}
      </button>
    </div>

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
      :class="
        multiplePanelsExpanded
            ? allPanelsExpanded
              ? 'fixed inset-4 z-50 max-w-none grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-2 gap-4 overflow-hidden bg-zinc-950 p-4 md:inset-8 lg:grid-cols-[repeat(2,minmax(0,1fr))]'
              : 'fixed inset-4 z-50 max-w-none grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-1 gap-4 overflow-hidden bg-zinc-950 p-4 md:inset-8 lg:grid-cols-[repeat(2,minmax(0,1fr))]'
          : ''
      "
    >
      <!-- ========================================
           TERMINAL
           ======================================== -->

      <section
        class="flex min-w-0 flex-col"
        :class="
          expandedPanels.terminal &&
          expandedPanelCount === 1
              ? 'fixed inset-4 z-50 flex flex-col bg-zinc-950 md:inset-8'
            : allPanelsExpanded
              ? 'relative col-span-2 row-start-2 flex min-h-0 flex-col'
              : multiplePanelsExpanded && expandedPanels.terminal
                ? 'relative order-3 flex min-h-0 flex-col'
              : multiplePanelsExpanded
                ? 'hidden'
                : 'relative'
        "
      >
        <div
          class="relative min-h-0"
          :class="expandedPanels.terminal ? 'flex flex-1 flex-col' : ''"
        >
          <button
          type="button"
          class="absolute left-3 top-3 z-10 rounded border px-2.5 py-1
                 font-mono text-[10px] transition"
          :class="terminalLightTheme
            ? 'border-amber-400 bg-white text-amber-700 hover:bg-amber-50'
            : 'border-slate-700 bg-zinc-950 text-slate-300 hover:bg-slate-900'"
          :title="terminalLightTheme
            ? game.state.locale === 'vi' ? 'Chuyển sang chế độ ban đêm' : 'Switch to dark mode'
            : game.state.locale === 'vi' ? 'Chuyển sang chế độ ban ngày' : 'Switch to light mode'"
          @click="toggleTerminalTheme"
        >
          {{ terminalLightTheme
            ? game.state.locale === 'vi' ? '☾ Ban đêm' : '☾ Dark mode'
            : game.state.locale === 'vi' ? '☀ Ban ngày' : '☀ Light mode' }}
          </button>

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
            expandedPanels.terminal
              ? 'Collapse terminal'
              : 'Expand terminal'
          "
          @click="togglePanel('terminal')"
        >
          [SPACE]
          {{
            expandedPanels.terminal
              ? '−'
              : '+'
          }}
          </button>

          <Terminal
          :key="terminalResetKey"
          ref="terminalRef"
          :expanded="
            expandedPanels.terminal
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
          :light-theme="terminalLightTheme"
          :locale="game.state.locale"
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
        </div>

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

        <div
          class="order-first mb-3 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800/80 bg-black/40 px-3 py-2"
          :class="multiplePanelsExpanded ? 'hidden' : ''"
        >
          <div
            class="rounded border border-cyan-900/70 bg-cyan-950/20 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-cyan-300"
            title="Elapsed investigation time"
          >
            ⏱ {{ formattedElapsedTime }}
          </div>

          <div
            class="rounded border border-emerald-900/70 bg-emerald-950/20 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-emerald-300"
            :title="game.state.locale === 'vi'
              ? `${game.state.hintCount} gợi ý · trừ ${game.state.hintPenalty} điểm`
              : `${game.state.hintCount} hints · ${game.state.hintPenalty} point penalty`"
          >
            {{ game.state.locale === 'vi' ? 'Điểm' : 'Score' }}:
            {{ investigationScore }}/100
          </div>

          <div
            class="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em]"
            :class="{
              'text-amber-400': progressStatus === 'loading' || progressStatus === 'saving',
              'text-emerald-400': progressStatus === 'saved',
              'text-zinc-600': progressStatus === 'local',
              'text-red-400': progressStatus === 'error',
            }"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current" />
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
            class="rounded border border-red-900/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="resettingGame || progressStatus === 'loading' || progressStatus === 'saving'"
            @click="requestGameReset"
          >
            {{ resettingGame ? 'Resetting...' : 'Reset game' }}
          </button>
        </div>
      </section>

      <!-- ========================================
           TASK + EVIDENCE
           ======================================== -->

      <aside
        :class="
          multiplePanelsExpanded
            ? 'contents'
            : 'space-y-5'
        "
      >
        <div
          :class="
            allPanelsExpanded
              ? 'col-start-1 row-start-1 min-h-0 min-w-0 w-full'
              : multiplePanelsExpanded && expandedPanels.task
                ? 'order-1 min-h-0 min-w-0 w-full'
              : multiplePanelsExpanded
                ? 'hidden'
                : ''
          "
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
              expandedPanels.task
            "
            :grouped="
              multiplePanelsExpanded
            "
            :operational-report-available="
              operationalReportAvailable
            "
            :linked-evidence="game.state.linkedEvidence"
            :selected-evidence="selectedEvidence"
            :link-feedback="evidenceLinkFeedback"
            :linking-mode="evidenceLinkingMode"
            @toggle-expand="
              togglePanel('task')
            "
            @review-task-summary="reviewTaskSummary"
            @link-evidence="linkSelectedEvidence"
            @create-operational-report="
              openOperationalReport
            "
          />
        </div>

        <div
          :class="
            allPanelsExpanded
              ? 'col-start-2 row-start-1 min-h-0 min-w-0 w-full'
              : multiplePanelsExpanded && expandedPanels.evidence
                ? 'order-2 min-h-0 min-w-0 w-full'
              : multiplePanelsExpanded
                ? 'hidden'
                : ''
          "
        >
          <EvidencePanel
            :evidence="
              game.state.evidence
            "
            :filesystem="
              scenario.filesystem
            "
            :locale="
              game.state.locale
            "
            :expanded="
              expandedPanels.evidence
            "
            :grouped="
              multiplePanelsExpanded
            "
            :verified-evidence-ids="verifiedEvidenceIds"
            :selected-evidence-ids="selectedEvidenceIds"
            :linking-mode="evidenceLinkingMode"
            @toggle-expand="
              togglePanel('evidence')
            "
            @select-evidence="selectEvidenceForLink"
          />
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <CaseTimelineModal
        v-if="timelineOpen"
        :events="visibleTimelineEvents"
        :evidence="game.state.evidence"
        :total-events="timelineTotalEvents"
        :locale="game.state.locale"
        @close="timelineOpen = false"
      />

      <PersonProfilesModal
        v-if="personProfilesOpen && scenario.people?.length"
        :people="scenario.people"
        :discovered-evidence-ids="discoveredEvidenceIds"
        :locale="game.state.locale"
        @close="personProfilesOpen = false"
      />

      <TaskCompletionNotice
        v-if="completedTaskNotice"
        :task="completedTaskNotice"
        :next-task="nextTaskAfterNotice"
        :locale="game.state.locale"
        @close="closeTaskCompletionNotice"
      />

      <OperationalReportModal
        v-if="operationalReportOpen && scenario.operationalReport"
        :locale="game.state.locale"
        :report="scenario.operationalReport"
        :success="operationalReportSuccess"
        @close="closeOperationalReport"
        @confirm="confirmOperationalReport"
      />

      <PasswordPrompt
        v-if="game.state.passwordPrompt"
        :path="game.state.passwordPrompt.path"
        :prompt="game.state.passwordPrompt.prompt"
        :incorrect="game.state.passwordPrompt.incorrect"
        :locale="game.state.locale"
        @submit="game.submitPassword"
        @cancel="game.cancelPasswordPrompt"
      />

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

<style scoped>
.hacker-workspace {
  background-image:
    linear-gradient(rgb(16 185 129 / 2.5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(16 185 129 / 2.5%) 1px, transparent 1px),
    radial-gradient(circle at 50% 0%, rgb(6 78 59 / 18%), transparent 46%);
  background-size: 32px 32px, 32px 32px, 100% 100%;
}

.hacker-workspace::after {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  content: '';
  opacity: 0.12;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 3px,
    rgb(0 0 0 / 32%) 4px
  );
}

</style>
