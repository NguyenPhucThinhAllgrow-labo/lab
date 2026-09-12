import type { ChineseChessMlCandidate, ChineseChessSuggestedMove } from '~/utils/chinese-chess/advisor'
import type { ChineseChessPiece, PieceColor } from '~/types/games/chinese-chess'

export function useChineseChessWorker() {
  let worker: Worker | undefined
  let sequence = 0
  let disposed = false
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>()
  function stop() {
    worker?.terminate()
    worker = undefined
    for (const request of pending.values()) request.reject(new Error('Phân tích đã dừng.'))
    pending.clear()
  }
  function request<T>(task: 'candidates' | 'tactics', board: ChineseChessPiece[], color: PieceColor, excluded: ReadonlySet<string>, selected?: ChineseChessSuggestedMove): Promise<T> {
    if (disposed) return Promise.reject(new Error('Trang chơi đã đóng.'))
    if (!worker) {
      worker = new Worker(new URL('../workers/chinese-chess.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        const item = pending.get(data.id)
        if (!item) return
        pending.delete(data.id)
        if (data.error) item.reject(new Error(data.error))
        else item.resolve(data.result)
      }
      worker.onerror = stop
    }
    const id = ++sequence
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      try {
        // Vue's reactive proxies cannot be sent with structured clone.
        worker!.postMessage(JSON.parse(JSON.stringify({ id, task, board, color, excluded: [...excluded], selected })))
      } catch (error) { pending.delete(id); reject(error) }
    })
  }
  onBeforeUnmount(() => { disposed = true; stop() })
  return {
    candidates: (board: ChineseChessPiece[], color: PieceColor, excluded: ReadonlySet<string>) => request<ChineseChessMlCandidate[]>('candidates', board, color, excluded),
    tactics: (board: ChineseChessPiece[], color: PieceColor, excluded: ReadonlySet<string>, selected?: ChineseChessSuggestedMove) => request<{ best: ChineseChessSuggestedMove | null; selectedScore: number | null }>('tactics', board, color, excluded, selected),
  }
}
