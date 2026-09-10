export const useApi = () => {
  const config = useRuntimeConfig()
  const realtimeSocketId = useState<string | null>('chinese-chess-socket-id', () => null)

  const getXsrfToken = () => {
    if (import.meta.server) {
      return null
    }

    const match = document.cookie.match(
      /(?:^|;\s*)XSRF-TOKEN=([^;]*)/,
    )

    if (!match) {
      return null
    }

    return decodeURIComponent(match[1] ?? '')
  }

  const api = $fetch.create({
    baseURL: config.public.apiUrl,

    credentials: 'include',

    onRequest({ options }) {
      const headers = new Headers(options.headers)

      headers.set(
        'Accept',
        'application/json',
      )

      const token = getXsrfToken()

      if (token) {
        headers.set(
          'X-XSRF-TOKEN',
          token,
        )
      }

      if (realtimeSocketId.value) {
        headers.set('X-Socket-ID', realtimeSocketId.value)
      }

      options.headers = headers
    },
  })

  return api
}
