<script setup lang="ts">
import {
  PanelLeft,
  Menu,
  Bell,
  Search
} from 'lucide-vue-next'

defineProps<{
  sidebarOpen: boolean
}>()

const emit = defineEmits<{
  'open-sidebar': []
  'toggle-sidebar': []
}>()
</script>

<template>
  <header
    class="
      sticky top-0 z-30
      flex h-20
      items-center
      border-b border-white/[0.06]
      bg-[#09090b]/80
      px-4 sm:px-6
      backdrop-blur-xl
    "
  >
    <!-- Desktop -->
    <button
      type="button"
      class="
        hidden lg:flex
        h-10 w-10
        items-center justify-center
        rounded-xl
        border border-white/[0.06]
        text-zinc-500
        transition-all
        duration-200
        hover:bg-white/[0.05]
        hover:text-white
      "
      :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
      :aria-label="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
      @click="emit('toggle-sidebar')"
    >
      <PanelLeft class="h-5 w-5" />
    </button>

    <!-- Mobile -->
    <button
      type="button"
      class="
        flex lg:hidden
        h-10 w-10
        items-center justify-center
        rounded-xl
        border border-white/[0.06]
        text-zinc-500
        transition-all
        duration-200
        hover:bg-white/[0.05]
        hover:text-white
      "
      aria-label="Open sidebar"
      @click="emit('open-sidebar')"
    >
      <Menu class="h-5 w-5" />
    </button>

    <!-- Search -->
    <div class="ml-3 hidden md:block">
      <div
        class="
          flex h-10 w-64
          items-center
          gap-2
          rounded-xl
          border border-white/[0.06]
          bg-white/[0.02]
          px-3
          text-zinc-600
        "
      >
        <Search class="h-4 w-4" />

        <span class="text-sm">
          Search...
        </span>

        <kbd
          class="
            ml-auto
            rounded-md
            border border-white/[0.06]
            px-1.5 py-0.5
            text-[10px]
            text-zinc-600
          "
        >
          /
        </kbd>
      </div>
    </div>

    <!-- Right -->
    <div class="ml-auto flex items-center gap-2">
      <button
        type="button"
        class="
          relative
          flex h-10 w-10
          items-center justify-center
          rounded-xl
          text-zinc-500
          transition
          hover:bg-white/[0.05]
          hover:text-white
        "
        aria-label="Notifications"
      >
        <Bell class="h-5 w-5" />

        <span
          class="
            absolute right-2 top-2
            h-1.5 w-1.5
            rounded-full
            bg-violet-500
          "
        />
      </button>
    </div>
  </header>
</template>
