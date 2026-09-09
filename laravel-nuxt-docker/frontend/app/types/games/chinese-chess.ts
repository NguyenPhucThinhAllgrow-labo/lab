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
  played_at?: string
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
  current_turn: PieceColor
  board: ChineseChessPiece[]
  move_history: ChineseChessMoveHistory[]
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
