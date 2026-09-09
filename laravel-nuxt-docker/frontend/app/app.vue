<script setup lang="ts">
import PlayerLogoutButton from '~/components/auth/PlayerLogoutButton.vue'

const route = useRoute()

const layout = computed(() => {
  if (route.path === '/admin/login') {
    return undefined
  }

  if (
    route.path === '/admin' ||
    route.path.startsWith('/admin/')
  ) {
    return 'admin'
  }

  return undefined
})

const isGamePage = computed(() => route.path === '/games' || route.path.startsWith('/games/'))
const isPandoraGame = computed(() => route.path.startsWith('/games/pandora/'))
</script>

<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>

  <PlayerLogoutButton
    v-if="isGamePage"
    show-home
    :variant="isPandoraGame ? 'hacker' : 'default'"
  />
</template>

<style src="~/assets/css/app.css"></style>
