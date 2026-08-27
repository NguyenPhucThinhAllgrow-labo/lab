<script setup lang="ts">
import {
  Bell,
  Search,
  ChevronDown,
  Menu
} from 'lucide-vue-next'

const emit = defineEmits<{
  openSidebar: []
}>()
</script>

<template>
  <header
    class="
      sticky top-0 z-30
      h-20
      border-b border-white/[0.06]
      bg-[#09090b]/80
      backdrop-blur-xl
    "
  >
    <div
      class="
        flex h-full
        items-center justify-between
        px-4 sm:px-6 lg:px-8
      "
    >

      <!-- Left -->
      <div class="flex items-center gap-4">

        <button
          type="button"
          class="
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            border border-white/[0.06]
            bg-white/[0.02]
            text-zinc-400
            hover:bg-white/[0.05]
            hover:text-white
            lg:hidden
          "
          @click="emit('openSidebar')"
        >
          <Menu class="h-5 w-5" />
        </button>

        <div>
          <h1 class="text-lg font-semibold text-white">
            Dashboard
          </h1>

          <p class="hidden text-xs text-zinc-600 sm:block">
            Welcome back, John 👋
          </p>
        </div>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-2 sm:gap-4">

        <!-- Search -->
        <div
          class="
            hidden items-center
            rounded-xl
            border border-white/[0.06]
            bg-white/[0.02]
            px-3
            sm:flex
          "
        >
          <Search class="h-4 w-4 text-zinc-600" />

          <input
            type="text"
            placeholder="Search..."
            class="
              w-32
              bg-transparent
              px-2 py-2
              text-sm text-zinc-300
              outline-none
              placeholder:text-zinc-700
              lg:w-48
            "
          />

          <kbd
            class="
              hidden rounded-md
              border border-white/[0.06]
              px-1.5 py-0.5
              text-[10px] text-zinc-600
              lg:block
            "
          >
            ⌘ K
          </kbd>
        </div>

        <!-- Notification -->
        <button
          type="button"
          class="
            relative flex h-10 w-10
            items-center justify-center
            rounded-xl
            border border-white/[0.06]
            bg-white/[0.02]
            text-zinc-500
            hover:border-violet-500/20
            hover:bg-violet-500/5
            hover:text-violet-400
          "
        >
          <Bell class="h-[18px] w-[18px]" />

          <span
            class="
              absolute right-2 top-2
              h-1.5 w-1.5
              rounded-full
              bg-violet-500
            "
          />
        </button>

        <!-- Profile -->
        <button
          type="button"
          class="
            hidden items-center gap-2
            rounded-xl
            border border-transparent
            px-2 py-1.5
            hover:border-white/[0.06]
            hover:bg-white/[0.03]
            sm:flex
          "
        >
          <div
            class="
              flex h-8 w-8
              items-center justify-center
              rounded-full
              bg-gradient-to-br
              from-violet-500
              to-indigo-600
              text-[10px]
              font-bold
            "
          >
            JD
          </div>

          <ChevronDown class="h-4 w-4 text-zinc-600" />
        </button>
      </div>
    </div>
  </header>
</template>