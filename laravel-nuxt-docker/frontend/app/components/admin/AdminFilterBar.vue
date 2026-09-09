<template>
  <div class="admin-filter-bar"><slot /></div>
</template>

<style scoped>
.admin-filter-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 20px; border-bottom: 1px solid #ffffff0d; }
.admin-filter-bar :deep(h2) { color: #e4e4e7; font-size: 15px; font-weight: 650; }
.admin-filter-bar :deep(p) { margin-top: 5px; color: #a1a1aa; font-size: 12px; }
</style>
