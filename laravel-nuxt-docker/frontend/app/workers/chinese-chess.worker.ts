import { buildChineseChessMlCandidates, findBestChineseChessMove, evaluateChineseChessMove } from '../utils/chinese-chess/advisor'
import type { ChineseChessSuggestedMove } from '../utils/chinese-chess/advisor'
import type { ChineseChessPiece, PieceColor } from '../types/games/chinese-chess'

self.onmessage = (event: MessageEvent<{
  id: number; task: 'candidates' | 'tactics'; board: ChineseChessPiece[]; color: PieceColor
  excluded: string[]; selected?: ChineseChessSuggestedMove
}>) => {
  const { id, task, board, color, excluded, selected } = event.data
  try {
    const result = task === 'candidates'
      ? buildChineseChessMlCandidates(board, color).filter(move => !excluded.includes(move.id))
      : {
          best: findBestChineseChessMove(board, color, new Set(excluded)),
          selectedScore: selected ? evaluateChineseChessMove(board, color, selected) : null,
        }
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Không thể phân tích bàn cờ.' })
  }
}
