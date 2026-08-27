<template>
  <footer
    class="
      border-t border-white/[0.06]
      px-4 py-5
      sm:px-6 lg:px-8
    "
  >
    <div
      class="
        flex flex-col gap-2
        text-xs text-zinc-600
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      <p>
        © {{ new Date().getFullYear() }}
        Admin Panel. All rights reserved.
      </p>

      <p>
        Management System
      </p>
    </div>
  </footer>
</template>