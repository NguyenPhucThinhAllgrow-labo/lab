<script setup lang="ts">
import TowerDefenseMapManager from "~/components/admin/TowerDefenseMapManager.vue";
const route = useRoute();
</script>

<template>
  <TowerDefenseMapManager :key="String(route.params.mapId)" editor-mode="edit" :map-id="String(route.params.mapId)" />
</template>
