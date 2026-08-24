import type {
  ChessPiece,
  PieceColor,
  Position,
} from '~/types/chess'

import {
  getPseudoLegalMoves,
} from '~/utils/chess/move'

import {
  movePiece,
} from '~/utils/chess/game'

/**
 * ==========================================
 * TÌM TƯỚNG
 * ==========================================
 */

function findGeneral(
  board: ChessPiece[],
  color: PieceColor,
): ChessPiece | undefined {
  return board.find(
    piece =>
      piece.type === 'general' &&
      piece.color === color,
  )
}

/**
 * ==========================================
 * TÌM QUÂN
 * ==========================================
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
 * ==========================================
 * KIỂM TRA HAI TƯỚNG ĐỐI MẶT
 * ==========================================
 *
 * Trong Cờ Tướng:
 *
 * Hai Tướng không được nhìn thẳng
 * vào nhau trên cùng một cột
 * mà không có quân nào ở giữa.
 */

function areGeneralsFacing(
  board: ChessPiece[],
): boolean {
  const redGeneral =
    findGeneral(
      board,
      'red',
    )

  const blackGeneral =
    findGeneral(
      board,
      'black',
    )

  if (
    !redGeneral ||
    !blackGeneral
  ) {
    return false
  }

  /**
   * Không cùng cột
   * => không đối mặt.
   */

  if (
    redGeneral.col !==
    blackGeneral.col
  ) {
    return false
  }

  const col =
    redGeneral.col

  const start =
    Math.min(
      redGeneral.row,
      blackGeneral.row,
    )

  const end =
    Math.max(
      redGeneral.row,
      blackGeneral.row,
    )

  /**
   * Kiểm tra có quân nào
   * nằm giữa hai Tướng không.
   */

  for (
    let row = start + 1;
    row < end;
    row++
  ) {
    if (
      getPieceAt(
        board,
        row,
        col,
      )
    ) {
      return false
    }
  }

  return true
}

/**
 * ==========================================
 * TƯỚNG CÓ BỊ CHIẾU KHÔNG?
 * ==========================================
 */

export function isInCheck(
  board: ChessPiece[],
  color: PieceColor,
): boolean {
  const general =
    findGeneral(
      board,
      color,
    )

  /**
   * Không còn Tướng
   * => thua.
   */

  if (!general) {
    return true
  }

  /**
   * Hai Tướng đối mặt
   * cũng được tính là đang bị chiếu.
   */

  if (
    areGeneralsFacing(board)
  ) {
    return true
  }

  /**
   * Tìm toàn bộ quân địch.
   */

  const enemyPieces =
    board.filter(
      piece =>
        piece.color !== color,
    )

  /**
   * Kiểm tra từng quân địch
   * có thể ăn Tướng không.
   */

  for (
    const enemy of enemyPieces
  ) {
    const moves =
      getPseudoLegalMoves(
        enemy,
        board,
      )

    const attacksGeneral =
      moves.some(
        move =>
          move.row ===
            general.row &&
          move.col ===
            general.col,
      )

    if (
      attacksGeneral
    ) {
      return true
    }
  }

  return false
}

/**
 * ==========================================
 * THỬ NƯỚC ĐI
 * ==========================================
 */

function tryMove(
  board: ChessPiece[],
  piece: ChessPiece,
  position: Position,
): ChessPiece[] {
  return movePiece(
    board,
    piece.id,
    position,
  )
}

/**
 * ==========================================
 * KIỂM TRA LEGAL MOVE
 * ==========================================
 */

export function isLegalMove(
  board: ChessPiece[],
  piece: ChessPiece,
  position: Position,
): boolean {
  /**
   * Lấy pseudo legal moves.
   */

  const pseudoMoves =
    getPseudoLegalMoves(
      piece,
      board,
    )

  /**
   * Không nằm trong
   * pseudo legal moves.
   */

  const allowed =
    pseudoMoves.some(
      move =>
        move.row ===
          position.row &&
        move.col ===
          position.col,
    )

  if (!allowed) {
    return false
  }

  /**
   * Thử nước đi.
   */

  const nextBoard =
    tryMove(
      board,
      piece,
      position,
    )

  /**
   * Sau khi đi,
   * Tướng mình không được chiếu.
   */

  return !isInCheck(
    nextBoard,
    piece.color,
  )
}

/**
 * ==========================================
 * TẤT CẢ LEGAL MOVES
 * ==========================================
 */

export function getLegalMoves(
  board: ChessPiece[],
  color: PieceColor,
): {
  piece: ChessPiece
  moves: Position[]
}[] {
  const result: {
    piece: ChessPiece
    moves: Position[]
  }[] = []

  const pieces =
    board.filter(
      piece =>
        piece.color === color,
    )

  for (
    const piece of pieces
  ) {
    const pseudoMoves =
      getPseudoLegalMoves(
        piece,
        board,
      )

    const legalMoves =
      pseudoMoves.filter(
        position =>
          isLegalMove(
            board,
            piece,
            position,
          ),
      )

    if (
      legalMoves.length > 0
    ) {
      result.push({
        piece,
        moves: legalMoves,
      })
    }
  }

  return result
}

/**
 * ==========================================
 * CHECKMATE
 * ==========================================
 *
 * Chiếu bí:
 *
 * 1. Bị chiếu
 * 2. Không còn legal move
 */

export function isCheckmate(
  board: ChessPiece[],
  color: PieceColor,
): boolean {
  /**
   * Không bị chiếu
   * => không phải chiếu bí.
   */

  if (
    !isInCheck(
      board,
      color,
    )
  ) {
    return false
  }

  /**
   * Tìm nước thoát.
   */

  const legalMoves =
    getLegalMoves(
      board,
      color,
    )

  /**
   * Không còn nước nào
   * => CHIẾU BÍ.
   */

  return (
    legalMoves.length === 0
  )
}

/**
 * ==========================================
 * STALEMATE
 * ==========================================
 */

export function isStalemate(
  board: ChessPiece[],
  color: PieceColor,
): boolean {
  /**
   * Đang bị chiếu
   * => không phải stalemate.
   */

  if (
    isInCheck(
      board,
      color,
    )
  ) {
    return false
  }

  const legalMoves =
    getLegalMoves(
      board,
      color,
    )

  return (
    legalMoves.length === 0
  )
}