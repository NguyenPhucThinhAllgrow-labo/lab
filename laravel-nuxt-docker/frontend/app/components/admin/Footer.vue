<template>
  <footer
    class="
      border-t
      border-white/[0.06]
      px-4 py-6
      sm:px-6
    "
  >
    <div
      class="
        flex flex-col
        items-center
        justify-between
        gap-2
        text-xs
        text-zinc-600
        sm:flex-row
      "
    >
      <p>
        © {{ new Date().getFullYear() }} Admin Panel
      </p>

      <p>
        Management System
      </p>
    </div>
  </footer>
</template>
