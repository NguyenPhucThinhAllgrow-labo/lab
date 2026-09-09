import type { GameState, Player, Stroke } from '~/types/games/paint'

interface Envelope {
  type: string
  payload?: any
}

export const useGameSocket = () => {
  const config = useRuntimeConfig()
  const socket = shallowRef<WebSocket | null>(null)
  const connected = ref(false)
  const state = ref<GameState | null>(null)
  const self = ref<Player | null>(null)
  const error = ref('')
  const events = ref<Record<string, any>>({})

  const connect = (
    roomCode: string,
    name: string,
    playerId?: string
  ) => new Promise<void>((resolve, reject) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      resolve()
      return
    }

    error.value = ''
    const ws = new WebSocket(
      `${config.public.wsUrl}?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(name)}${playerId ? `&playerId=${encodeURIComponent(playerId)}` : ''}`
    )

    ws.onopen = () => {
      socket.value = ws
      connected.value = true
      resolve()
    }

    ws.onmessage = (event) => {
      const message: Envelope = JSON.parse(event.data)

      if (message.type === 'state') state.value = message.payload
      if (message.type === 'self') {
        self.value = message.payload
        localStorage.setItem(`drawguess:${roomCode}:player`, message.payload.id)
      }
      if (message.type === 'error') error.value = message.payload
      events.value = { ...events.value, [message.type]: message.payload }
    }

    ws.onclose = () => {
      connected.value = false
      socket.value = null
    }

    ws.onerror = () => {
      error.value = 'Không thể kết nối máy chủ realtime.'
      reject(new Error(error.value))
    }
  })

  const send = (type: string, payload?: any) => {
    if (socket.value?.readyState !== WebSocket.OPEN) return
    socket.value.send(JSON.stringify({ type, payload }))
  }

  const join = (roomCode: string, name: string) => {
    const saved = process.client
      ? localStorage.getItem(`drawguess:${roomCode}:player`) || undefined
      : undefined
    return connect(roomCode, name, saved)
  }

  const create = (roomCode: string, name: string) => connect(roomCode, name)

  const close = () => socket.value?.close()

  return {
    socket,
    connected,
    state,
    self,
    error,
    events,
    send,
    join,
    create,
    close
  }
}
