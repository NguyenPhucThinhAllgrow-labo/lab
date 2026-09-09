import type {
  ChineseChessPiece,
  Position,
} from '~/types/games/chinese-chess'

export function getPieceAt(
  board: ChineseChessPiece[],
  position: Position,
): ChineseChessPiece | undefined {
  return board.find(
    piece =>
      piece.row === position.row &&
      piece.col === position.col,
  )
}

export function movePiece(
  board: ChineseChessPiece[],
  pieceId: string,
  to: Position,
): ChineseChessPiece[] {
  const nextBoard = board.map(
    piece => ({
      ...piece,
    }),
  )

  const movingPiece =
    nextBoard.find(
      piece =>
        piece.id === pieceId,
    )

  if (!movingPiece) {
    return board
  }

  const capturedPiece =
    getPieceAt(
      nextBoard,
      to,
    )

  // Không cho ăn quân cùng màu
  if (
    capturedPiece &&
    capturedPiece.color ===
      movingPiece.color
  ) {
    return board
  }

  // Ăn quân
  if (capturedPiece) {
    const capturedIndex =
      nextBoard.findIndex(
        piece =>
          piece.id ===
          capturedPiece.id,
      )

    if (capturedIndex !== -1) {
      nextBoard.splice(
        capturedIndex,
        1,
      )
    }
  }

  // Di chuyển
  const index =
    nextBoard.findIndex(
      piece =>
        piece.id === pieceId,
    )

  nextBoard[index] = {
    ...movingPiece,
    row: to.row,
    col: to.col,
  }

  return nextBoard
}