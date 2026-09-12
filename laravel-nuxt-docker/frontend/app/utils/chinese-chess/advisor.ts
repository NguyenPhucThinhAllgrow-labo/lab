import type {
  ChineseChessPiece,
  PieceColor,
  Position,
} from '~/types/games/chinese-chess'

import {
  getLegalMoves,
  isInCheck,
} from '~/utils/chinese-chess/check'

import {
  getPieceAt,
  movePiece,
} from '~/utils/chinese-chess/game'

export interface ChineseChessSuggestedMove {
  pieceId: string
  from: Position
  to: Position
  score: number
}

export interface ChineseChessMlCandidate extends ChineseChessSuggestedMove {
  id: string
  features: Record<string, number>
}

interface CandidateMove extends ChineseChessSuggestedMove {
  piece: ChineseChessPiece
  captured: ChineseChessPiece | null
}

const MATE_SCORE = 1_000_000

const PIECE_VALUES: Record<ChineseChessPiece['type'], number> = {
  general: 100_000,
  chariot: 900,
  cannon: 450,
  horse: 400,
  elephant: 210,
  advisor: 210,
  soldier: 100,
}

function opponentOf(color: PieceColor): PieceColor {
  return color === 'red' ? 'black' : 'red'
}

function candidates(board: ChineseChessPiece[], color: PieceColor): CandidateMove[] {
  return getLegalMoves(board, color)
    .flatMap(({ piece, moves }) => moves.map(to => ({
      piece,
      pieceId: piece.id,
      from: { row: piece.row, col: piece.col },
      to,
      captured: getPieceAt(board, to) ?? null,
      score: 0,
    })))
    .sort((left, right) => {
      const leftCapture = left.captured ? PIECE_VALUES[left.captured.type] : 0
      const rightCapture = right.captured ? PIECE_VALUES[right.captured.type] : 0
      return rightCapture - leftCapture
    })
}

function positionalScore(piece: ChineseChessPiece): number {
  const centerBonus = (4 - Math.abs(4 - piece.col)) * 3

  if (piece.type !== 'soldier') return centerBonus

  const advancement = piece.color === 'red' ? 9 - piece.row : piece.row
  const crossedRiver = piece.color === 'red' ? piece.row <= 4 : piece.row >= 5

  return advancement * 7 + (crossedRiver ? 45 : 0) + centerBonus
}

function evaluate(board: ChineseChessPiece[], perspective: PieceColor): number {
  let score = 0

  for (const piece of board) {
    const value = PIECE_VALUES[piece.type] + positionalScore(piece)
    score += piece.color === perspective ? value : -value
  }

  if (isInCheck(board, opponentOf(perspective))) score += 70
  if (isInCheck(board, perspective)) score -= 90

  return score
}

function tacticalScore(
  board: ChineseChessPiece[],
  color: PieceColor,
  candidate: CandidateMove,
  cutoff = Number.NEGATIVE_INFINITY,
): number {
  const opponent = opponentOf(color)
  const nextBoard = movePiece(board, candidate.pieceId, candidate.to)
  const replies = candidates(nextBoard, opponent)

  if (replies.length === 0) return MATE_SCORE

  let score = Number.POSITIVE_INFINITY
  for (const reply of replies) {
    const replyBoard = movePiece(nextBoard, reply.pieceId, reply.to)
    let replyScore = evaluate(replyBoard, color)

    if (isInCheck(replyBoard, color) && candidates(replyBoard, color).length === 0) {
      replyScore = -MATE_SCORE
    }

    score = Math.min(score, replyScore)
    if (score <= cutoff) break
  }

  if (isInCheck(nextBoard, opponent)) score += 18
  if (candidate.captured) score += PIECE_VALUES[candidate.captured.type] / 100
  return score
}

export function evaluateChineseChessMove(
  board: ChineseChessPiece[],
  color: PieceColor,
  move: Pick<ChineseChessSuggestedMove, 'pieceId' | 'to'>,
): number | null {
  const candidate = candidates(board, color).find(item =>
    item.pieceId === move.pieceId
    && item.to.row === move.to.row
    && item.to.col === move.to.col)

  return candidate ? tacticalScore(board, color, candidate) : null
}

/**
 * Converts legal moves into a stable, model-agnostic feature contract. Laravel
 * only ranks these candidates; move legality always remains in the chess engine.
 */
export function buildChineseChessMlCandidates(
  board: ChineseChessPiece[],
  color: PieceColor,
): ChineseChessMlCandidate[] {
  const opponent = opponentOf(color)
  const legalCandidates = candidates(board, color)
  const ownMobility = legalCandidates.length

  return legalCandidates.map((candidate) => {
    const nextBoard = movePiece(board, candidate.pieceId, candidate.to)
    const opponentReplies = candidates(nextBoard, opponent)
    const givesCheck = isInCheck(nextBoard, opponent)

    return {
      id: `${candidate.pieceId}:${candidate.to.row}:${candidate.to.col}`,
      pieceId: candidate.pieceId,
      from: candidate.from,
      to: candidate.to,
      score: 0,
      features: {
        capture_value: (candidate.captured ? PIECE_VALUES[candidate.captured.type] : 0) / 900,
        gives_check: givesCheck ? 1 : 0,
        gives_checkmate: givesCheck && opponentReplies.length === 0 ? 1 : 0,
        material_balance: evaluate(nextBoard, color) / 2_000,
        own_mobility: ownMobility / 100,
        opponent_mobility: opponentReplies.length / 100,
        piece_position: positionalScore({ ...candidate.piece, ...candidate.to }) / 100,
      },
    }
  })
}

/**
 * Tactical two-ply advisor: score every legal move against the opponent's
 * strongest immediate reply. Checkmates always outrank material gains and a
 * reply that checkmates the player always rejects the candidate.
 */
export function findBestChineseChessMove(
  board: ChineseChessPiece[],
  color: PieceColor,
  excludedMoves: ReadonlySet<string> = new Set(),
): ChineseChessSuggestedMove | null {
  const ownCandidates = candidates(board, color).filter(candidate =>
    !excludedMoves.has(`${candidate.pieceId}:${candidate.to.row}:${candidate.to.col}`))
  let bestMove: CandidateMove | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const candidate of ownCandidates) {
    const score = tacticalScore(board, color, candidate, bestScore)

    if (score > bestScore) {
      bestScore = score
      bestMove = candidate
    }
  }

  if (!bestMove) return null

  return {
    pieceId: bestMove.pieceId,
    from: bestMove.from,
    to: bestMove.to,
    score: bestScore,
  }
}
