<script setup lang="ts">
const route = useRoute()

const layout = computed(() => {
  if (
    route.path === '/admin' ||
    route.path.startsWith('/admin/')
  ) {
    return 'admin'
  }

  return undefined
})
</script>

<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<style src="~/assets/css/app.css"></style>
