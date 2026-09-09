import type {
  ChessPiece,
  PieceColor,
  PieceType,
  Position,
} from '~/types/chess'

const ROWS = 10
const COLS = 9

/**
 * Kiểm tra vị trí có nằm trong bàn cờ hay không.
 */
function insideBoard(
  row: number,
  col: number,
): boolean {
  return (
    row >= 0 &&
    row < ROWS &&
    col >= 0 &&
    col < COLS
  )
}

/**
 * Lấy quân cờ tại một vị trí.
 */
function getPieceAt(
  board: ChessPiece[],
  row: number,
  col: number,
): ChessPiece | undefined {
  return board.find(
    piece =>
      piece.row === row &&
      piece.col === col,
  )
}

/**
 * Kiểm tra quân tại vị trí có phải quân địch.
 */
function isEnemy(
  piece: ChessPiece | undefined,
  color: PieceColor,
): boolean {
  return !!piece && piece.color !== color
}

/**
 * Kiểm tra quân tại vị trí có phải quân cùng màu.
 */
function isFriendly(
  piece: ChessPiece | undefined,
  color: PieceColor,
): boolean {
  return !!piece && piece.color === color
}

/**
 * Đếm số quân nằm giữa 2 vị trí.
 *
 * Dùng cho:
 * - Xe
 * - Pháo
 * - Tướng đối mặt
 */
function countPiecesBetween(
  board: ChessPiece[],
  from: Position,
  to: Position,
): number {
  let count = 0

  if (from.row === to.row) {
    const start = Math.min(
      from.col,
      to.col,
    )

    const end = Math.max(
      from.col,
      to.col,
    )

    for (
      let col = start + 1;
      col < end;
      col++
    ) {
      if (
        getPieceAt(
          board,
          from.row,
          col,
        )
      ) {
        count++
      }
    }
  } else if (from.col === to.col) {
    const start = Math.min(
      from.row,
      to.row,
    )

    const end = Math.max(
      from.row,
      to.row,
    )

    for (
      let row = start + 1;
      row < end;
      row++
    ) {
      if (
        getPieceAt(
          board,
          row,
          from.col,
        )
      ) {
        count++
      }
    }
  }

  return count
}

/**
 * Kiểm tra một vị trí có nằm trong cung của Tướng/Sĩ.
 */
function insidePalace(
  color: PieceColor,
  row: number,
  col: number,
): boolean {
  if (
    col < 3 ||
    col > 5
  ) {
    return false
  }

  if (color === 'black') {
    return row >= 0 && row <= 2
  }

  return row >= 7 && row <= 9
}

/**
 * Tướng
 *
 * Tướng:
 * - đi 1 ô ngang/dọc
 * - chỉ được ở trong cung
 */
function getGeneralMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const directions: Array<
    [number, number]
  > = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const [dr, dc] of directions) {
    const row = piece.row + dr
    const col = piece.col + dc

    if (!insideBoard(row, col)) {
      continue
    }

    if (
      !insidePalace(
        piece.color,
        row,
        col,
      )
    ) {
      continue
    }

    const target = getPieceAt(
      board,
      row,
      col,
    )

    if (
      !isFriendly(
        target,
        piece.color,
      )
    ) {
      moves.push({
        row,
        col,
      })
    }
  }

  return moves
}

/**
 * Sĩ
 *
 * Sĩ:
 * - đi chéo 1 ô
 * - chỉ ở trong cung
 */
function getAdvisorMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const directions: Array<
    [number, number]
  > = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]

  for (const [dr, dc] of directions) {
    const row = piece.row + dr
    const col = piece.col + dc

    if (!insideBoard(row, col)) {
      continue
    }

    if (
      !insidePalace(
        piece.color,
        row,
        col,
      )
    ) {
      continue
    }

    const target = getPieceAt(
      board,
      row,
      col,
    )

    if (
      !isFriendly(
        target,
        piece.color,
      )
    ) {
      moves.push({
        row,
        col,
      })
    }
  }

  return moves
}

/**
 * Tượng
 *
 * Tượng:
 * - đi chéo 2 ô
 * - không được qua sông
 * - bị chặn mắt tượng
 */
function getElephantMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const directions: Array<
    [number, number]
  > = [
    [-2, -2],
    [-2, 2],
    [2, -2],
    [2, 2],
  ]

  for (const [dr, dc] of directions) {
    const row = piece.row + dr
    const col = piece.col + dc

    if (!insideBoard(row, col)) {
      continue
    }

    // Tượng đen không được sang phần đỏ.
    if (
      piece.color === 'black' &&
      row > 4
    ) {
      continue
    }

    // Tượng đỏ không được sang phần đen.
    if (
      piece.color === 'red' &&
      row < 5
    ) {
      continue
    }

    // Kiểm tra mắt tượng.
    const eyeRow =
      piece.row + dr / 2

    const eyeCol =
      piece.col + dc / 2

    if (
      getPieceAt(
        board,
        eyeRow,
        eyeCol,
      )
    ) {
      continue
    }

    const target = getPieceAt(
      board,
      row,
      col,
    )

    if (
      !isFriendly(
        target,
        piece.color,
      )
    ) {
      moves.push({
        row,
        col,
      })
    }
  }

  return moves
}

/**
 * Mã
 *
 * Mã:
 * - đi theo hình chữ L
 * - bị chặn chân mã
 */
function getHorseMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const horseMoves: Array<{
    dr: number
    dc: number
    br: number
    bc: number
  }> = [
    {
      dr: -2,
      dc: -1,
      br: -1,
      bc: 0,
    },
    {
      dr: -2,
      dc: 1,
      br: -1,
      bc: 0,
    },
    {
      dr: 2,
      dc: -1,
      br: 1,
      bc: 0,
    },
    {
      dr: 2,
      dc: 1,
      br: 1,
      bc: 0,
    },
    {
      dr: -1,
      dc: -2,
      br: 0,
      bc: -1,
    },
    {
      dr: 1,
      dc: -2,
      br: 0,
      bc: -1,
    },
    {
      dr: -1,
      dc: 2,
      br: 0,
      bc: 1,
    },
    {
      dr: 1,
      dc: 2,
      br: 0,
      bc: 1,
    },
  ]

  for (const move of horseMoves) {
    const blockRow =
      piece.row + move.br

    const blockCol =
      piece.col + move.bc

    // Chân mã bị chặn.
    if (
      getPieceAt(
        board,
        blockRow,
        blockCol,
      )
    ) {
      continue
    }

    const row =
      piece.row + move.dr

    const col =
      piece.col + move.dc

    if (!insideBoard(row, col)) {
      continue
    }

    const target = getPieceAt(
      board,
      row,
      col,
    )

    if (
      !isFriendly(
        target,
        piece.color,
      )
    ) {
      moves.push({
        row,
        col,
      })
    }
  }

  return moves
}

/**
 * Xe
 *
 * Xe:
 * - đi ngang/dọc
 * - không được nhảy qua quân
 */
function getChariotMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const directions: Array<
    [number, number]
  > = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const [dr, dc] of directions) {
    let row = piece.row + dr
    let col = piece.col + dc

    while (
      insideBoard(row, col)
    ) {
      const target = getPieceAt(
        board,
        row,
        col,
      )

      if (!target) {
        moves.push({
          row,
          col,
        })
      } else {
        // Có thể ăn quân địch.
        if (
          isEnemy(
            target,
            piece.color,
          )
        ) {
          moves.push({
            row,
            col,
          })
        }

        // Gặp bất kỳ quân nào đều dừng.
        break
      }

      row += dr
      col += dc
    }
  }

  return moves
}

/**
 * Pháo
 *
 * Pháo:
 * - đi ngang/dọc
 * - đi bình thường khi chưa gặp quân
 * - muốn ăn phải có đúng 1 quân làm ngòi
 */
function getCannonMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const directions: Array<
    [number, number]
  > = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const [dr, dc] of directions) {
    let row = piece.row + dr
    let col = piece.col + dc

    let jumped = false

    while (
      insideBoard(row, col)
    ) {
      const target = getPieceAt(
        board,
        row,
        col,
      )

      if (!jumped) {
        if (!target) {
          // Chưa gặp quân nào.
          moves.push({
            row,
            col,
          })
        } else {
          // Quân đầu tiên là ngòi.
          jumped = true
        }
      } else {
        if (target) {
          // Quân đầu tiên sau ngòi
          // là quân có thể bị ăn.
          if (
            isEnemy(
              target,
              piece.color,
            )
          ) {
            moves.push({
              row,
              col,
            })
          }

          // Không được đi tiếp.
          break
        }
      }

      row += dr
      col += dc
    }
  }

  return moves
}

/**
 * Tốt
 *
 * Trước khi qua sông:
 * - chỉ đi thẳng
 *
 * Sau khi qua sông:
 * - đi thẳng
 * - đi ngang
 *
 * Không bao giờ được đi lùi.
 */
function getSoldierMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  const moves: Position[] = []

  const forward =
    piece.color === 'black'
      ? 1
      : -1

  // Đi thẳng.
  const forwardRow =
    piece.row + forward

  if (
    insideBoard(
      forwardRow,
      piece.col,
    )
  ) {
    const target = getPieceAt(
      board,
      forwardRow,
      piece.col,
    )

    if (
      !isFriendly(
        target,
        piece.color,
      )
    ) {
      moves.push({
        row: forwardRow,
        col: piece.col,
      })
    }
  }

  /**
   * Kiểm tra đã qua sông chưa.
   */
  const crossedRiver =
    piece.color === 'black'
      ? piece.row >= 5
      : piece.row <= 4

  if (!crossedRiver) {
    return moves
  }

  // Sau khi qua sông được đi ngang.
  const sideMoves: Array<
    [number, number]
  > = [
    [0, -1],
    [0, 1],
  ]

  for (const [dr, dc] of sideMoves) {
    const row =
      piece.row + dr

    const col =
      piece.col + dc

    if (!insideBoard(row, col)) {
      continue
    }

    const target = getPieceAt(
      board,
      row,
      col,
    )

    if (
      !isFriendly(
        target,
        piece.color,
      )
    ) {
      moves.push({
        row,
        col,
      })
    }
  }

  return moves
}

/**
 * Lấy các nước đi theo luật
 * chuyển động của từng quân.
 *
 * Đây là Pseudo-Legal Moves.
 *
 * Chưa kiểm tra:
 * - Tướng bị chiếu
 * - Tự đưa Tướng vào thế chiếu
 * - Tướng đối mặt
 */
export function getPseudoLegalMoves(
  piece: ChessPiece,
  board: ChessPiece[],
): Position[] {
  switch (piece.type) {
    case 'general':
      return getGeneralMoves(
        piece,
        board,
      )

    case 'advisor':
      return getAdvisorMoves(
        piece,
        board,
      )

    case 'elephant':
      return getElephantMoves(
        piece,
        board,
      )

    case 'horse':
      return getHorseMoves(
        piece,
        board,
      )

    case 'chariot':
      return getChariotMoves(
        piece,
        board,
      )

    case 'cannon':
      return getCannonMoves(
        piece,
        board,
      )

    case 'soldier':
      return getSoldierMoves(
        piece,
        board,
      )

    default:
      return []
  }
}