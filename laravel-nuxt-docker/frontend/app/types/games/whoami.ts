export type OutputType =
  | 'normal'
  | 'system'
  | 'success'
  | 'warning'
  | 'error'
  | 'danger'

export interface TerminalBlock {
  id: number
  command: string
  output: string
  displayedOutput: string
  type: OutputType
  isTyping: boolean
}

export interface FileNode {
  path: string

  name: string

  type:
    | 'file'
    | 'directory'

  content?: string

  requiredSeal?: number
}

export interface TerminalState {
  session: number

  currentSeal: number

  seals: boolean[]

  sanity: number

  corruption: number

  memoryIntegrity: number

  commandHistory: string[]

  ending: boolean
}
