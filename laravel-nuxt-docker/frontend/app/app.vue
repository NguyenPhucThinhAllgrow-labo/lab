<script setup lang="ts">
import PlayerHeader from "~/components/auth/PlayerHeader.vue";

const { theme } = useSiteTheme();
useHead(() => ({ htmlAttrs: { "data-site-theme": theme.value } }));

const route = useRoute();
let resizeIdle: ReturnType<typeof setTimeout> | undefined;
function handleViewportResize() {
  document.documentElement.classList.add("viewport-resizing");
  clearTimeout(resizeIdle);
  resizeIdle = setTimeout(
    () => document.documentElement.classList.remove("viewport-resizing"),
    180,
  );
}
onMounted(() =>
  window.addEventListener("resize", handleViewportResize, { passive: true }),
);
onBeforeUnmount(() => {
  window.removeEventListener("resize", handleViewportResize);
  clearTimeout(resizeIdle);
  document.documentElement.classList.remove("viewport-resizing");
});

const layout = computed(() => {
  if (route.path === "/admin/login") {
    return undefined;
  }

  if (route.path === "/admin" || route.path.startsWith("/admin/")) {
    return "admin";
  }

  return undefined;
});

const isGamePage = computed(
  () => route.path === "/games" || route.path.startsWith("/games/"),
);
</script>

<template>
  <NuxtLayout :name="layout">
    <PlayerHeader v-if="isGamePage" />
    <NuxtPage />
  </NuxtLayout>
</template>

<style src="~/assets/css/app.css"></style>
