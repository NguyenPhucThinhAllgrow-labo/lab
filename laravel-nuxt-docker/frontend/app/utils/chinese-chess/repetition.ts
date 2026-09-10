import type {
  ChineseChessChaseRelation,
  ChineseChessPiece,
  ChineseChessRepetitionState,
  PieceColor,
} from '~/types/games/chinese-chess'
import { isInCheck, isLegalMove } from '~/utils/chinese-chess/check'
import { getPseudoLegalMoves } from '~/utils/chinese-chess/move'

export interface PositionRecord {
  key: string
  turn: PieceColor
  move_number: number
  mover: PieceColor | null
  piece_id?: string
  gave_check: boolean
  chases: ChineseChessChaseRelation[]
  action?: 'quiet' | 'check' | 'chase' | 'check_chase'
}

export function positionKey(board: ChineseChessPiece[], turn: PieceColor): string {
  const pieces = board
    .map(piece => `${piece.color}:${piece.type}:${piece.row}:${piece.col}`)
    .sort()

  return `${turn}|${pieces.join('|')}`
}

export function initialPositionHistory(board: ChineseChessPiece[], turn: PieceColor): PositionRecord[] {
  return [{ key: positionKey(board, turn), turn, move_number: 0, mover: null, gave_check: false, chases: [] }]
}

function pieceAt(board: ChineseChessPiece[], row: number, col: number): ChineseChessPiece | undefined {
  return board.find(piece => piece.row === row && piece.col === col)
}

function isProtected(board: ChineseChessPiece[], target: ChineseChessPiece): boolean {
  return board.some((defender) => {
    if (defender.color !== target.color || defender.id === target.id) return false
    const probe = board.map(piece => piece.id === target.id
      ? { ...piece, color: defender.color === 'red' ? 'black' as const : 'red' as const }
      : piece)
    const probeDefender = probe.find(piece => piece.id === defender.id)!
    return isLegalMove(probe, probeDefender, { row: target.row, col: target.col })
  })
}

function isPinned(board: ChineseChessPiece[], target: ChineseChessPiece): boolean {
  if (isInCheck(board, target.color)) return false
  return isInCheck(board.filter(piece => piece.id !== target.id), target.color)
}

function crossedRiver(piece: ChineseChessPiece): boolean {
  return piece.color === 'red' ? piece.row <= 4 : piece.row >= 5
}

export function chaseRelations(board: ChineseChessPiece[], color: PieceColor): ChineseChessChaseRelation[] {
  const relations: ChineseChessChaseRelation[] = []

  for (const attacker of board.filter(piece => piece.color === color)) {
    for (const move of getPseudoLegalMoves(attacker, board)) {
      const target = pieceAt(board, move.row, move.col)
      if (!target || target.color === color || target.type === 'general') continue

      const protectedTarget = isProtected(board, target)
      const pinned = isPinned(board, target)
      const sameTypeException = attacker.type === target.type && !pinned
      const kingOrPawnException = attacker.type === 'general' || attacker.type === 'soldier'
      const protectedRookException = target.type === 'chariot' && (attacker.type === 'horse' || attacker.type === 'cannon')
      const soldierMayBeChased = target.type !== 'soldier' || crossedRiver(target)

      relations.push({
        attacker_id: attacker.id,
        attacker_type: attacker.type,
        target_id: target.id,
        target_type: target.type,
        protected: protectedTarget,
        pinned,
        prohibited: soldierMayBeChased
          && !sameTypeException
          && !kingOrPawnException
          && (!protectedTarget || protectedRookException),
      })
    }
  }

  return relations
}

export function recordPosition(
  history: PositionRecord[],
  before: ChineseChessPiece[],
  after: ChineseChessPiece[],
  movedPiece: ChineseChessPiece,
  nextTurn: PieceColor,
  moveNumber: number,
): { history: PositionRecord[], state: ChineseChessRepetitionState, record: PositionRecord } {
  const records = history.length ? [...history] : initialPositionHistory(before, movedPiece.color)
  const beforeRelations = new Map(chaseRelations(before, movedPiece.color).map(item => [`${item.attacker_id}>${item.target_id}`, item]))
  const chases = chaseRelations(after, movedPiece.color).filter(item =>
    item.attacker_id === movedPiece.id
    || !beforeRelations.has(`${item.attacker_id}>${item.target_id}`)
    || (item.prohibited && !beforeRelations.get(`${item.attacker_id}>${item.target_id}`)?.prohibited))
  const gaveCheck = isInCheck(after, nextTurn)
  const record: PositionRecord = {
    key: positionKey(after, nextTurn),
    turn: nextTurn,
    move_number: moveNumber,
    mover: movedPiece.color,
    piece_id: movedPiece.id,
    gave_check: gaveCheck,
    chases,
    action: gaveCheck ? (chases.length ? 'check_chase' : 'check') : (chases.length ? 'chase' : 'quiet'),
  }
  records.push(record)
  const trimmed = records.slice(-256)

  return { history: trimmed, state: adjudicateRepetition(trimmed), record }
}

function classify(cycle: PositionRecord[], color: PieceColor): { kind: string, severity: number } {
  const moves = cycle.filter(record => record.mover === color)
  if (!moves.length) return { kind: 'none', severity: 0 }
  const prohibitedChases = (move: PositionRecord) => move.chases.filter(chase => chase.prohibited)
  const allCheck = moves.every(move => move.gave_check)
  const allCoercive = moves.every(move => move.gave_check || prohibitedChases(move).length > 0)
  const hasCheck = moves.some(move => move.gave_check)
  const hasChase = moves.some(move => prohibitedChases(move).length > 0)

  if (allCheck && hasChase) return { kind: 'check_chase', severity: 3 }
  if (allCheck) return { kind: 'perpetual_check', severity: 3 }
  if (allCoercive && hasCheck && hasChase) return { kind: 'check_chase', severity: 2 }
  if (allCoercive && hasChase) return { kind: 'perpetual_chase', severity: 1 }
  return { kind: 'none', severity: 0 }
}

export function adjudicateRepetition(history: PositionRecord[]): ChineseChessRepetitionState {
  const none: ChineseChessRepetitionState = { status: 'none', count: 1, obligated_color: null, reason: null }
  if (history.length < 5) return none
  const last = history.at(-1)!
  const occurrences = history.map((record, index) => record.key === last.key ? index : -1).filter(index => index >= 0)
  if (occurrences.length < 2) return none

  const start = occurrences.at(-2)!
  const cycle = history.slice(start + 1)
  const red = classify(cycle, 'red')
  const black = classify(cycle, 'black')
  const obligated = red.severity === black.severity ? null : red.severity > black.severity ? 'red' : 'black'
  const offender = obligated === 'red' ? red : black
  const reason = !obligated
    ? 'repetition_draw' as const
    : offender.kind === 'perpetual_check'
      ? 'perpetual_check' as const
      : offender.kind === 'check_chase'
        ? 'perpetual_check_chase' as const
        : 'perpetual_chase' as const

  if (occurrences.length === 2) {
    return { status: 'warning', count: 2, obligated_color: obligated, reason }
  }
  return {
    status: obligated ? 'warning' : 'draw',
    count: occurrences.length,
    obligated_color: obligated,
    violator_color: obligated,
    reason,
  }
}
