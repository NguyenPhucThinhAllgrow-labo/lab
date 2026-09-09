export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL,
    }
  },
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  pinia: {
    storesDirs: [
      './app/stores/**',
    ],
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Your Name — Frontend Developer',
      meta: [
        {
          name: 'description',
          content: 'Personal portfolio of a Frontend Developer'
        }
      ]
    }
  }
})