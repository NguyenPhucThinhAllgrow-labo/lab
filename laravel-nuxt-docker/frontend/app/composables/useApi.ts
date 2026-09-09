export const useApi = () => {
  const config = useRuntimeConfig()

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

      options.headers = headers
    },
  })

  return api
}