export type TerminalLineType =
  | 'system'
  | 'command'
  | 'output'
  | 'error'
  | 'warning'
  | 'success'

export interface TerminalHighlight {
  start: number

  end: number
}

export interface TerminalLine {
  id: number

  type: TerminalLineType

  text: string

  variant?: 'intro'

  highlights?: TerminalHighlight[]
}

export interface TerminalCommand {
  command: string

  description: string

  requiresArgument: boolean
}
