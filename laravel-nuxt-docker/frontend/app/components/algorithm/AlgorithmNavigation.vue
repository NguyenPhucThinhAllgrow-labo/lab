<script setup lang="ts">
import ThemeToggle from '~/components/common/ThemeToggle.vue'
import { ArrowLeft, FlaskConical } from 'lucide-vue-next'
const route = useRoute()
const pages = [
  { name: 'Bubble Sort', path: '/algorithm/sorting/bubble-sort' },
  { name: 'Selection Sort', path: '/algorithm/sorting/selection-sort' },
  { name: 'Insertion Sort', path: '/algorithm/sorting/insertion-sort' },
  { name: 'Greedy', path: '/algorithm/greedy' },
]
</script>

<template>
  <header class="algorithm-navigation">
    <div class="algorithm-navigation__inner">
      <NuxtLink to="/#algorithm-lab" class="algorithm-navigation__home"><ArrowLeft :size="16" /> Trang chủ</NuxtLink>
      <span class="algorithm-navigation__brand"><FlaskConical :size="20" /> Algorithm Lab</span>
      <nav aria-label="Chọn thuật toán" class="algorithm-navigation__tabs">
        <NuxtLink v-for="page in pages" :key="page.path" :to="page.path" :aria-current="route.path.replace(/\/$/, '') === page.path ? 'page' : undefined">{{ page.name }}</NuxtLink>
      </nav>
      <ThemeToggle />
    </div>
  </header>
</template>

<style scoped>
.algorithm-navigation { position: sticky; top: 0; z-index: 40; }
.algorithm-navigation__inner { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin: auto; padding: 14px 20px; }
.algorithm-navigation__home, .algorithm-navigation__brand { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; font-size: 13px; }
.algorithm-navigation__home { color: #b7c2d0; }
.algorithm-navigation__brand { color: #f1f5f9; font-weight: 700; }
.algorithm-navigation__brand svg { color: var(--algorithm-accent); }
.algorithm-navigation__tabs { display: flex; gap: 4px; overflow-x: auto; margin-left: auto; }
.algorithm-navigation__tabs a { padding: 9px 12px; border: 1px solid transparent; border-radius: 8px; color: #b7c2d0; font-size: 12px; white-space: nowrap; }
.algorithm-navigation__tabs a[aria-current="page"] { color: var(--algorithm-accent); border-color: rgb(var(--algorithm-accent-rgb) / 28%); background: rgb(var(--algorithm-accent-rgb) / 10%); }
.algorithm-navigation a:hover { color: #fff; }
@media(max-width: 850px) { .algorithm-navigation__tabs { flex-basis: 100%; margin-left: 0; }.algorithm-navigation__inner { gap: 12px 20px; } }
</style>
