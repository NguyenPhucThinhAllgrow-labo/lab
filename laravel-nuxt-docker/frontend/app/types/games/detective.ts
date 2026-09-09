export type SupportedLocale =
  | 'en'
  | 'vi'

export interface LocalizedText {
  en: string
  vi: string
}

export interface LocalizedTextArray {
  en: string[]
  vi: string[]
}

/*
 * --------------------------------------------------
 * FILESYSTEM
 * --------------------------------------------------
 */

export interface FileNode {
  type:
    | 'file'
    | 'directory'

  name: string

  /*
   * File content được dịch theo locale.
   *
   * Directory không cần content.
   */
  content?: LocalizedText

  children?: FileNode[]

  /*
   * Optional access control inherited by descendants.
   * Sudo nodes require a one-command elevation. Password nodes remain
   * accessible for the rest of the run after a successful unlock.
   */
  access?:
    | {
        type: 'sudo'
      }
    | {
        type: 'password'
        password: string
        prompt?: LocalizedText
      }
}

/*
 * --------------------------------------------------
 * EVIDENCE
 * --------------------------------------------------
 */

export interface Evidence {
  id: string

  title: LocalizedText

  description: LocalizedText

  type:
    | 'digital'
    | 'document'
    | 'photo'
    | 'object'

  hint: LocalizedText

  discover: {
    type: 'cat'

    /*
     * Path KHÔNG dịch.
     */
    path: string
  }

  /*
   * Highlight cũng theo locale
   * vì text trong file được dịch.
   */
  highlight?: {
    en: string[]
    vi: string[]
  }

  requiresEvidence?: string[]

  discovered?: boolean
}

/*
 * --------------------------------------------------
 * TASK
 * --------------------------------------------------
 */

export interface Task {
  id: string

  title: LocalizedText

  description: LocalizedText

  reason?: LocalizedText

  /* Shown once when the task is completed. */
  completionSummary?: LocalizedText

  /* A direction for the next investigation step without revealing a command. */
  nextLead?: LocalizedText

  requiresEvidence: string[]

  completed?: boolean
}

export interface PersonProfileDetail {
  label: LocalizedText

  value: LocalizedText

  requiresEvidence?: string[]
}

export interface PersonProfile {
  id: string

  name: string

  role: LocalizedText

  summary: LocalizedText

  requiresEvidence?: string[]

  details: PersonProfileDetail[]
}

export interface ScenarioTimelineEvent {
  time: string

  title: LocalizedText

  description: LocalizedText

  category?:
    | 'before'
    | 'incident'
    | 'trace'
    | 'response'

  requiresEvidence?: string[]

  requiresGameCompletion?: boolean
}

export interface ScenarioOperationalReport {
  answers: {
    suspect: string[]
    vehicle: string[]
    target: string[]
    victim: string[]
  }
}

/*
 * --------------------------------------------------
 * SCENARIO
 * --------------------------------------------------
 */

export interface Scenario {
  id: string

  title: LocalizedText

  description: LocalizedText

  initialDirectory: string

  intro: LocalizedTextArray

  timeline?: ScenarioTimelineEvent[]

  /* Character dossiers can reveal people and facts progressively. */
  people?: PersonProfile[]

  /*
   * When present, completing every investigation task unlocks a final
   * player-authored operational report. The case is solved only after the
   * report is validated.
   */
  operationalReport?: ScenarioOperationalReport

  filesystem: FileNode[]

  evidence: Evidence[]

  tasks: Task[]
}
