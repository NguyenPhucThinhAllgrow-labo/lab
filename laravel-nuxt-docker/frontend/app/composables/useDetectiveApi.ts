import type {
  Scenario,
  SupportedLocale,
} from '~/types/games/detective'

import type {
  TerminalLine,
} from '~/types/games/terminal'

export interface DetectiveCaseMetadata {
  id: string
  title: string
  description: string
  translations: {
    title: Record<SupportedLocale, string>
    description: Record<SupportedLocale, string>
  }
  sort_order: number
}

export interface DetectiveCaseDetail extends DetectiveCaseMetadata {
  scenario: Scenario
}

export interface DetectiveProgressPayload {
  locale: SupportedLocale
  current_directory: string
  discovered_evidence: string[]
  completed_tasks: string[]
  linked_evidence: Record<string, string[]>
  unlocked_paths: string[]
  command_history: string[]
  hint_count: number
  hint_penalty: number
  hint_history: DetectiveHintUsage[]
  incorrect_link_attempts: number
  terminal_lines: TerminalLine[]
  game_completed: boolean
  elapsed_seconds: number
  evidence_history: DetectiveTimelineEntry[]
  task_history: DetectiveTimelineEntry[]
}

export interface DetectiveHintUsage {
  task_id: string | null
  evidence_id: string
  level: number
  penalty: number
  elapsed_seconds: number
  recorded_at: string
}

export interface DetectiveTimelineEntry {
  id: string
  elapsed_seconds: number
  recorded_at: string
}

export interface DetectiveProgress {
  id: number
  run_id: string | null
  user_id: number
  case_id: string
  locale: SupportedLocale
  current_directory: string
  discovered_evidence: string[] | null
  completed_tasks: string[] | null
  linked_evidence: Record<string, string[]> | null
  unlocked_paths: string[] | null
  command_history: string[] | null
  hint_count: number
  hint_penalty: number
  hint_history: DetectiveHintUsage[] | null
  incorrect_link_attempts: number
  terminal_lines: TerminalLine[] | null
  game_completed: boolean
  elapsed_seconds: number
  evidence_history: DetectiveTimelineEntry[] | null
  task_history: DetectiveTimelineEntry[] | null
  last_played_at: string | null
}

export interface DetectiveCompletionHistory {
  id: number
  run_id: string
  case_id: string
  elapsed_seconds: number
  evidence_history: DetectiveTimelineEntry[]
  task_history: DetectiveTimelineEntry[]
  linked_evidence: Record<string, string[]>
  command_history: string[]
  statistics: {
    evidence_count: number
    task_count: number
    command_count: number
    hint_count: number
    hint_penalty: number
    score: number
    rank: 'S' | 'A' | 'B' | 'C'
    incorrect_link_attempts: number
    hints_by_level: Record<string, number>
    hint_history: DetectiveHintUsage[]
    average_seconds_per_evidence: number | null
  }
  started_at: string
  completed_at: string
}

interface DataResponse<T> {
  data: T
}

export function useDetectiveApi() {
  const api = useApi()

  let csrfReady = false

  async function ensureCsrf() {
    if (csrfReady) {
      return
    }

    await api('/sanctum/csrf-cookie')
    csrfReady = true
  }

  async function getCase(
    caseId: string,
    locale: SupportedLocale,
  ) {
    const response = await api<
      DataResponse<DetectiveCaseDetail>
    >(`/api/detective/cases/${caseId}`, {
      query: { locale },
    })

    return response.data
  }

  async function listCases(
    locale: SupportedLocale,
  ) {
    const response = await api<
      DataResponse<DetectiveCaseMetadata[]>
    >('/api/detective/cases', {
      query: { locale },
    })

    return response.data
  }

  async function getScenario(
    caseId: string,
  ) {
    const detail = await getCase(
      caseId,
      'en',
    )

    return detail.scenario
  }

  async function getProgress(
    caseId: string,
  ) {
    const response = await api<
      DataResponse<DetectiveProgress | null>
    >(`/api/detective/cases/${caseId}/progress`)

    return response.data
  }

  async function saveProgress(
    caseId: string,
    payload: DetectiveProgressPayload,
  ) {
    await ensureCsrf()

    const response = await api<
      DataResponse<DetectiveProgress>
    >(`/api/detective/cases/${caseId}/progress`, {
      method: 'PUT',
      body: payload,
    })

    return response.data
  }

  async function resetProgress(
    caseId: string,
  ) {
    await ensureCsrf()

    await api(
      `/api/detective/cases/${caseId}/progress`,
      { method: 'DELETE' },
    )
  }

  async function getCompletionHistory() {
    const response = await api<
      DataResponse<DetectiveCompletionHistory[]>
    >('/api/detective/history')

    return response.data
  }

  async function getCompletionHistoryDetail(
    historyId: number,
  ) {
    const response = await api<
      DataResponse<DetectiveCompletionHistory>
    >(`/api/detective/history/${historyId}`)

    return response.data
  }

  return {
    listCases,
    getCase,
    getScenario,
    getProgress,
    saveProgress,
    resetProgress,
    getCompletionHistory,
    getCompletionHistoryDetail,
  }
}
