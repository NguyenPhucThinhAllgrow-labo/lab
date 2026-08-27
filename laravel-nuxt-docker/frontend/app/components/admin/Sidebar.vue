<script setup lang="ts">
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  MoreHorizontal,
  Gamepad2,
  Crosshair,
  ChessKing,
  Zap,
  Blocks,
  X
} from 'lucide-vue-next'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const gameMenuOpen = ref(true)

const menuItems = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard
  },
  {
    label: 'Analytics',
    to: '/analytics',
    icon: BarChart3
  },
  {
    label: 'Users',
    to: '/users',
    icon: Users
  },
  {
    label: 'Products',
    to: '/products',
    icon: Package
  },
  {
    label: 'Orders',
    to: '/orders',
    icon: ShoppingBag,
    badge: '12'
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: FileText
  }
]

const gameMenuItems = [
  {
    label: 'Aim',
    to: '/games/aim',
    icon: Crosshair
  },
  {
    label: 'Chess',
    to: '/games/chess',
    icon: ChessKing
  },
  {
    label: 'Reaction',
    to: '/games/reaction',
    icon: Zap
  },
  {
    label: 'Tetris',
    to: '/games/tetris',
    icon: Blocks
  }
]
</script>

<template>
  <aside
    class="
      fixed inset-y-0 left-0 z-50
      flex w-64 flex-col
      border-r border-white/[0.06]
      bg-[#0d0d12]
      shadow-2xl shadow-black/20
      transition-transform duration-300
    "
    :class="
      open
        ? 'translate-x-0'
        : '-translate-x-full lg:translate-x-0'
    "
  >

    <!-- ==================== -->
    <!-- HEADER / LOGO -->
    <!-- ==================== -->

    <div
      class="
        flex h-20 shrink-0 items-center
        border-b border-white/[0.06]
        px-6
      "
    >
      <!-- Logo -->
      <div
        class="
          flex h-9 w-9
          items-center justify-center
          rounded-xl
          bg-gradient-to-br
          from-violet-500
          to-indigo-600
          shadow-lg
          shadow-violet-500/20
        "
      >
        <span class="font-bold text-white">
          A
        </span>
      </div>

      <!-- Brand -->
      <div class="ml-3">
        <p class="text-sm font-bold text-white">
          Admin Panel
        </p>

        <p class="text-[11px] text-zinc-600">
          Management System
        </p>
      </div>

      <!-- Close mobile -->
      <button
        type="button"
        class="
          ml-auto
          flex h-8 w-8
          items-center justify-center
          rounded-lg
          text-zinc-500
          transition
          hover:bg-white/5
          hover:text-white
          lg:hidden
        "
        @click="emit('close')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- ==================== -->
    <!-- MENU -->
    <!-- ==================== -->

    <div
      class="
        flex-1
        overflow-y-auto
        px-4
        py-6
      "
    >

      <!-- MAIN MENU -->

      <nav class="space-y-1">

        <!-- Normal menu -->
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="
            group
            flex items-center
            gap-3
            rounded-xl
            px-3 py-2.5
            text-sm
            text-zinc-500
            transition-all
            duration-200
            hover:bg-white/[0.04]
            hover:text-zinc-200
          "
          active-class="bg-violet-500/10 !text-violet-300"
          @click="emit('close')"
        >

          <!-- Icon -->
          <component
            :is="item.icon"
            class="
              h-[18px] w-[18px]
              shrink-0
              transition-transform
              duration-200
              group-hover:scale-105
            "
          />

          <!-- Label -->
          <span>
            {{ item.label }}
          </span>

          <!-- Badge -->
          <span
            v-if="item.badge"
            class="
              ml-auto
              rounded-full
              bg-violet-500/10
              px-2 py-0.5
              text-[10px]
              text-violet-400
            "
          >
            {{ item.badge }}
          </span>

        </NuxtLink>


        <!-- ==================== -->
        <!-- GAME -->
        <!-- ==================== -->

        <div class="pt-1">

          <!-- Game button -->
          <button
            type="button"
            class="
              group
              flex w-full
              items-center
              gap-3
              rounded-xl
              px-3 py-2.5
              text-sm
              text-zinc-500
              transition-all
              duration-200
              hover:bg-white/[0.04]
              hover:text-zinc-200
            "
            :aria-expanded="gameMenuOpen"
            @click="gameMenuOpen = !gameMenuOpen"
          >

            <Gamepad2
              class="
                h-[18px] w-[18px]
                shrink-0
                transition-transform
                duration-200
                group-hover:scale-105
              "
            />

            <span>
              Game
            </span>

            <ChevronDown
              class="
                ml-auto
                h-4 w-4
                transition-transform
                duration-200
              "
              :class="gameMenuOpen ? 'rotate-180' : ''"
            />

          </button>


          <!-- Game children -->
          <Transition name="fade">

            <nav
              v-if="gameMenuOpen"
              class="
                mt-1
                space-y-1
                pl-6
              "
            >

              <NuxtLink
                v-for="item in gameMenuItems"
                :key="item.to"
                :to="item.to"
                class="
                  group
                  flex items-center
                  gap-3
                  rounded-xl
                  px-3 py-2
                  text-sm
                  text-zinc-500
                  transition-all
                  duration-200
                  hover:bg-white/[0.04]
                  hover:text-zinc-200
                "
                active-class="bg-violet-500/10 !text-violet-300"
                @click="emit('close')"
              >

                <component
                  :is="item.icon"
                  class="
                    h-4 w-4
                    shrink-0
                    transition-transform
                    duration-200
                    group-hover:scale-105
                  "
                />

                <span>
                  {{ item.label }}
                </span>

              </NuxtLink>

            </nav>

          </Transition>

        </div>


        <!-- ==================== -->
        <!-- SETTINGS -->
        <!-- ==================== -->

        <div class="pt-1">

          <NuxtLink
            to="/settings"
            class="
              group
              flex items-center
              gap-3
              rounded-xl
              px-3 py-2.5
              text-sm
              text-zinc-500
              transition-all
              duration-200
              hover:bg-white/[0.04]
              hover:text-zinc-200
            "
            active-class="bg-violet-500/10 !text-violet-300"
            @click="emit('close')"
          >

            <Settings
              class="
                h-[18px] w-[18px]
                shrink-0
                transition-transform
                duration-200
                group-hover:scale-105
              "
            />

            <span>
              Settings
            </span>

          </NuxtLink>

        </div>

      </nav>

    </div>


    <!-- ==================== -->
    <!-- USER -->
    <!-- ==================== -->

    <div
      class="
        shrink-0
        border-t
        border-white/[0.06]
        p-4
      "
    >

      <div
        class="
          flex items-center
          rounded-xl
          p-2
          transition
          hover:bg-white/[0.04]
        "
      >

        <!-- Avatar -->
        <div
          class="
            flex h-9 w-9
            shrink-0
            items-center justify-center
            rounded-full
            bg-gradient-to-br
            from-violet-500
            to-indigo-600
            text-xs
            font-bold
            text-white
          "
        >
          JD
        </div>


        <!-- User info -->
        <div class="ml-3 min-w-0">

          <p
            class="
              truncate
              text-sm
              font-medium
              text-zinc-200
            "
          >
            John Doe
          </p>

          <p
            class="
              truncate
              text-[11px]
              text-zinc-600
            "
          >
            Administrator
          </p>

        </div>


        <!-- More -->
        <button
          type="button"
          class="
            ml-auto
            text-zinc-600
            transition
            hover:text-zinc-300
          "
        >
          <MoreHorizontal class="h-4 w-4" />
        </button>

      </div>

    </div>

  </aside>
</template>


<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>