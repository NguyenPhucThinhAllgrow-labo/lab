import type { ChineseChessPiece, ChineseChessMoveHistory } from '~/types/games/chinese-chess'

// Work backwards from the saved final board to preserve the exact recorded setup.
export function replayFrames(finalBoard: ChineseChessPiece[], moves: ChineseChessMoveHistory[]): ChineseChessPiece[][] {
  const frames: ChineseChessPiece[][] = new Array(moves.length + 1)
  let board = finalBoard.map(piece => ({ ...piece }))
  frames[moves.length] = board
  for (let index = moves.length - 1; index >= 0; index--) {
    const move = moves[index]!
    board = board.filter(piece => piece.id !== move.piece.id && piece.id !== move.captured?.id)
    board = [...board, { ...move.piece, ...move.from }]
    if (move.captured) board.push({ ...move.captured })
    frames[index] = board
  }
  return frames
}
