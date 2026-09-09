import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

import type { ChineseChessRoom } from '~/types/games/chinese-chess'

interface RoomEvent {
  room: ChineseChessRoom
  action: string
}

export function useChineseChessRealtime() {
  const config = useRuntimeConfig()
  const echo = shallowRef<any>(null)
  const channelName = ref<string | null>(null)

  function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match ? decodeURIComponent(match[1] ?? '') : ''
  }

  function connect(roomId: number, onUpdate: (event: RoomEvent) => void): boolean {
    disconnect()

    const key = String(config.public.pusherAppKey ?? '')
    if (!key) {
      return false
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
    echo.value.private(channelName.value).listen('.chinese-chess.room.updated', onUpdate)

    return true
  }

  function disconnect(): void {
    if (echo.value && channelName.value) {
      echo.value.leave(channelName.value)
      echo.value.disconnect()
    }
    echo.value = null
    channelName.value = null
  }

  return { connect, disconnect }
}
