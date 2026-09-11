import type {
  ChineseChessPiece,
  PieceColor,
  Position,
} from '~/types/games/chinese-chess'

const PIECE_TO_FEN: Record<ChineseChessPiece['type'], string> = {
  general: 'k',
  advisor: 'a',
  elephant: 'b',
  horse: 'n',
  chariot: 'r',
  cannon: 'c',
  soldier: 'p',
}

/** Convert the UI board (row 0 at Black's back rank) to Pikafish FEN. */
export function chineseChessBoardToFen(
  board: readonly ChineseChessPiece[],
  turn: PieceColor,
  halfmoveClock = 0,
  fullmoveNumber = 1,
): string {
  const occupied = new Map(board.map(piece => [`${piece.row}:${piece.col}`, piece]))
  const ranks: string[] = []

  for (let row = 0; row < 10; row += 1) {
    let rank = ''
    let empty = 0

    for (let col = 0; col < 9; col += 1) {
      const piece = occupied.get(`${row}:${col}`)

      if (!piece) {
        empty += 1
        continue
      }

      if (empty > 0) rank += String(empty)
      const symbol = PIECE_TO_FEN[piece.type]
      rank += piece.color === 'red' ? symbol.toUpperCase() : symbol
      empty = 0
    }

    if (empty > 0) rank += String(empty)
    ranks.push(rank)
  }

  return `${ranks.join('/')} ${turn === 'red' ? 'w' : 'b'} - - ${Math.max(0, halfmoveClock)} ${Math.max(1, fullmoveNumber)}`
}

/** Convert UI coordinates to Pikafish long algebraic notation, e.g. h2e2. */
export function chineseChessMoveToUci(from: Position, to: Position): string {
  return `${String.fromCharCode(97 + from.col)}${9 - from.row}${String.fromCharCode(97 + to.col)}${9 - to.row}`
}
