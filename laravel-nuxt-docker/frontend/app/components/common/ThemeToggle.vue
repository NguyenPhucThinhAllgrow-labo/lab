<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
const { theme, toggleTheme } = useSiteTheme();
</script>

<template>
  <button
    type="button"
    class="site-theme-toggle"
    :aria-label="
      theme === 'dark'
        ? 'Chuyển sang giao diện sáng'
        : 'Chuyển sang giao diện tối'
    "
    :title="
      theme === 'dark'
        ? 'Chuyển sang giao diện sáng'
        : 'Chuyển sang giao diện tối'
    "
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" :size="17" /><Moon v-else :size="17" />
  </button>
</template>

<style scoped>
.site-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 40px;
  height: 40px;
  padding: 0;
  flex-shrink: 0;
  border: 1px solid #9ca3af60;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}
.site-theme-toggle:hover {
  background: #9ca3af18;
}
.site-theme-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
</style>
