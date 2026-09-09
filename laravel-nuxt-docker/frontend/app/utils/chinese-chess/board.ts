import type {
  ChineseChessPiece,
  PieceColor,
  PieceType,
} from '~/types/games/chinese-chess'

function createPiece(
  id: string,
  type: PieceType,
  color: PieceColor,
  row: number,
  col: number,
): ChineseChessPiece {
  return {
    id,
    type,
    color,
    row,
    col,
  }
}

export function createInitialBoard(): ChineseChessPiece[] {
  const pieces: ChineseChessPiece[] = []

  // =========================
  // BLACK
  // =========================

  // Xe
  pieces.push(
    createPiece('black-chariot-1', 'chariot', 'black', 0, 0),
    createPiece('black-chariot-2', 'chariot', 'black', 0, 8),
  )

  // Mã
  pieces.push(
    createPiece('black-horse-1', 'horse', 'black', 0, 1),
    createPiece('black-horse-2', 'horse', 'black', 0, 7),
  )

  // Tượng
  pieces.push(
    createPiece('black-elephant-1', 'elephant', 'black', 0, 2),
    createPiece('black-elephant-2', 'elephant', 'black', 0, 6),
  )

  // Sĩ
  pieces.push(
    createPiece('black-advisor-1', 'advisor', 'black', 0, 3),
    createPiece('black-advisor-2', 'advisor', 'black', 0, 5),
  )

  // Tướng
  pieces.push(
    createPiece('black-general', 'general', 'black', 0, 4),
  )

  // Pháo
  pieces.push(
    createPiece('black-cannon-1', 'cannon', 'black', 2, 1),
    createPiece('black-cannon-2', 'cannon', 'black', 2, 7),
  )

  // Tốt
  const blackSoldierCols = [0, 2, 4, 6, 8]

  blackSoldierCols.forEach((col, index) => {
    pieces.push(
      createPiece(
        `black-soldier-${index + 1}`,
        'soldier',
        'black',
        3,
        col,
      ),
    )
  })

  // =========================
  // RED
  // =========================

  // Xe
  pieces.push(
    createPiece('red-chariot-1', 'chariot', 'red', 9, 0),
    createPiece('red-chariot-2', 'chariot', 'red', 9, 8),
  )

  // Mã
  pieces.push(
    createPiece('red-horse-1', 'horse', 'red', 9, 1),
    createPiece('red-horse-2', 'horse', 'red', 9, 7),
  )

  // Tượng
  pieces.push(
    createPiece('red-elephant-1', 'elephant', 'red', 9, 2),
    createPiece('red-elephant-2', 'elephant', 'red', 9, 6),
  )

  // Sĩ
  pieces.push(
    createPiece('red-advisor-1', 'advisor', 'red', 9, 3),
    createPiece('red-advisor-2', 'advisor', 'red', 9, 5),
  )

  // Tướng
  pieces.push(
    createPiece('red-general', 'general', 'red', 9, 4),
  )

  // Pháo
  pieces.push(
    createPiece('red-cannon-1', 'cannon', 'red', 7, 1),
    createPiece('red-cannon-2', 'cannon', 'red', 7, 7),
  )

  // Tốt
  const redSoldierCols = [0, 2, 4, 6, 8]

  redSoldierCols.forEach((col, index) => {
    pieces.push(
      createPiece(
        `red-soldier-${index + 1}`,
        'soldier',
        'red',
        6,
        col,
      ),
    )
  })

  return pieces
}