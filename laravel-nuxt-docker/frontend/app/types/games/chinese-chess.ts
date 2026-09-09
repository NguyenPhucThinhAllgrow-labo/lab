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