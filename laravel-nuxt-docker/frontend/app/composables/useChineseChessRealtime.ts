import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import type { ChineseChessMoveHistory, ChineseChessPiece, ChineseChessPlayer, ChineseChessRepetitionState, ChineseChessRoomStatus, PieceColor } from '~/types/games/chinese-chess'

export interface ChineseChessRealtimeMoveState {
  board: ChineseChessPiece[]
  move: ChineseChessMoveHistory | null
  move_count: number
  status: ChineseChessRoomStatus
  current_turn: PieceColor
  repetition: ChineseChessRepetitionState
  red_time_seconds: number
  black_time_seconds: number
  winner: ChineseChessPlayer | null
  finish_reason: string | null
  last_move_at: string | null
}

export interface ChineseChessRoomEvent {
  room_id: number
  version: number
  action: string
  state?: ChineseChessRealtimeMoveState
}

export interface ChineseChessPresenceMember {
  id: number
  name: string
}

export function useChineseChessRealtime() {
  const config = useRuntimeConfig()
  const echo = shallowRef<any>(null)
  const channelName = ref<string | null>(null)
  const socketId = useState<string | null>('chinese-chess-socket-id', () => null)

  function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match ? decodeURIComponent(match[1] ?? '') : ''
  }

  function connect(
    roomId: number,
    onUpdate: (event: ChineseChessRoomEvent) => void,
    onConnectionChange: (connected: boolean) => void,
    onMembersChange: (members: ChineseChessPresenceMember[]) => void,
  ): void {
    disconnect()

    const key = String(config.public.pusherAppKey ?? '')
    if (!key) {
      onConnectionChange(false)
      return
    }

    const baseUrl = String(config.public.apiUrl ?? '').replace(/\/$/, '')
    echo.value = new Echo({
      broadcaster: 'pusher',
      Pusher,
      key,
      cluster: String(config.public.pusherAppCluster || 'ap1'),
      forceTLS: true,
      authorizer: (channel: { name: string }) => ({
        authorize: async (socketId: string, callback: (error: boolean, data: unknown) => void) => {
          try {
            const response = await fetch(`${baseUrl}/api/broadcasting/auth`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
              },
              body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
            })

            if (!response.ok) {
              throw new Error(`Broadcast auth failed (${response.status})`)
            }
            callback(false, await response.json())
          } catch (error) {
            callback(true, error)
          }
        },
      }),
    })

    channelName.value = `chinese-chess.${roomId}`
    const members = new Map<number, ChineseChessPresenceMember>()
    const notifyMembers = () => onMembersChange([...members.values()])
    echo.value.join(channelName.value)
      .here((present: ChineseChessPresenceMember[]) => {
        members.clear()
        present.forEach(member => members.set(Number(member.id), member))
        notifyMembers()
      })
      .joining((member: ChineseChessPresenceMember) => {
        members.set(Number(member.id), member)
        notifyMembers()
      })
      .leaving((member: ChineseChessPresenceMember) => {
        members.delete(Number(member.id))
        notifyMembers()
      })
      .listen('.chinese-chess.room.updated', onUpdate)
    const connection = echo.value.connector?.pusher?.connection
    const markConnected = () => {
      socketId.value = connection?.socket_id ?? null
      onConnectionChange(true)
    }
    const markDisconnected = () => {
      socketId.value = null
      onConnectionChange(false)
    }
    connection?.bind('connected', markConnected)
    connection?.bind('disconnected', markDisconnected)
    connection?.bind('unavailable', markDisconnected)
    connection?.bind('failed', markDisconnected)
    connection?.bind('error', markDisconnected)
    onConnectionChange(connection?.state === 'connected')
  }

  function disconnect(): void {
    if (echo.value && channelName.value) {
      echo.value.leave(channelName.value)
      echo.value.disconnect()
    }
    echo.value = null
    channelName.value = null
    socketId.value = null
  }

  return { connect, disconnect }
}
