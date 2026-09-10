export type PieceColor = 'red' | 'black'

export type PieceType =
  | 'general'
  | 'advisor'
  | 'elephant'
  | 'horse'
  | 'chariot'
  | 'cannon'
  | 'soldier'

export interface Position {
  row: number
  col: number
}

export interface ChineseChessPiece {
  id: string
  type: PieceType
  color: PieceColor
  row: number
  col: number
}

export interface Move {
  pieceId: string
  from: Position
  to: Position
  capturedPieceId?: string
}

export interface ChineseChessMoveHistory {
  number: number
  color: PieceColor
  piece: ChineseChessPiece
  from: Position
  to: Position
  captured: ChineseChessPiece | null
  is_check?: boolean
  rule_action?: 'quiet' | 'check' | 'chase' | 'check_chase'
  chases?: ChineseChessChaseRelation[]
  position?: ChineseChessPiece[]
  played_at?: string
}

export interface ChineseChessChaseRelation {
  attacker_id: string
  attacker_type: PieceType
  target_id: string
  target_type: PieceType
  protected: boolean
  pinned: boolean
  prohibited: boolean
}

export interface ChineseChessRepetitionState {
  status: 'none' | 'warning' | 'violation' | 'draw'
  count: number
  obligated_color: PieceColor | null
  violator_color?: PieceColor | null
  reason: 'perpetual_check' | 'perpetual_chase' | 'perpetual_check_chase' | 'repetition_draw' | null
}

export interface ChineseChessPlayer {
  id: number
  name: string
}

export type ChineseChessRoomStatus = 'waiting' | 'playing' | 'paused' | 'finished' | 'cancelled'

export interface ChineseChessRoom {
  id: number
  code: string
  status: ChineseChessRoomStatus
  round_number: number
  current_turn: PieceColor
  starting_color: PieceColor
  board: ChineseChessPiece[]
  move_history: ChineseChessMoveHistory[]
  repetition: ChineseChessRepetitionState
  red_time_seconds: number
  black_time_seconds: number
  red_player: ChineseChessPlayer
  black_player: ChineseChessPlayer | null
  winner: ChineseChessPlayer | null
  paused_by: ChineseChessPlayer | null
  paused_at: string | null
  finish_reason: string | null
  version: number
  your_color: PieceColor | null
  red_ready: boolean
  black_ready: boolean
  red_rematch: boolean
  black_rematch: boolean
  server_time: string
  last_move_at: string | null
}
