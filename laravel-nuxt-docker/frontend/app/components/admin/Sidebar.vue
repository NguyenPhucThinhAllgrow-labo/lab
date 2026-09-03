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
  Gamepad2,
  Crosshair,
  ChessKing,
  Zap,
  Blocks,
  Bubbles,
  Brackets,
  BetweenHorizonalEnd,
  Code,
  CircleDot,
  X,
  ArrowDownUp,
  Brush,
  SquareTerminal,
  LogOut
} from 'lucide-vue-next'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { user, logout } = useAuth()

const gameMenuOpen = ref(false)
const algorithmMenuOpen = ref(false)
const sortingMenuOpen = ref(false)

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
  },
  {
    label: 'WhoAmI',
    to: '/games/pandora/whoami',
    icon: Blocks
  },
  {
    label: 'I am a detective.',
    to: '/games/pandora/detective',
    icon: SquareTerminal
  }
]

const sortingMenuItems = [
  {
    label: 'Bubble Sort',
    to: '/algorithm/sorting/bubble-sort',
    icon: Bubbles
  },
  {
    label: 'Selection Sort',
    to: '/algorithm/sorting/selection-sort',
    icon: Brackets
  },
  {
    label: 'Insertion Sort',
    to: '/algorithm/sorting/insertion-sort',
    icon: BetweenHorizonalEnd
  }
]

const algorithmMenuItems = [
  {
    label: 'Greedy',
    to: '/algorithm/greedy',
    icon: CircleDot
  }
]

const handleLogout = async () => {
  await logout()
  navigateTo('/login')
}
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
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Header -->
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

      <!-- Close -->
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
        "
        aria-label="Close sidebar"
        @click="emit('close')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Menu -->
    <div
      class="
        flex-1
        overflow-y-auto
        px-4
        py-6
      "
    >
      <nav class="space-y-1">
        <!-- Main menu -->
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

          <span>
            {{ item.label }}
          </span>

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

        <!-- Game -->
        <div class="pt-1">
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

          <Transition name="game-menu">
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

        <!-- Algorithms -->
        <div class="pt-1">
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
            :aria-expanded="algorithmMenuOpen"
            @click="algorithmMenuOpen = !algorithmMenuOpen"
          >
            <Code
              class="
                h-[18px] w-[18px]
                shrink-0
                transition-transform
                duration-200
                group-hover:scale-105
              "
            />

            <span>
              Algorithms
            </span>

            <ChevronDown
              class="
                ml-auto
                h-4 w-4
                transition-transform
                duration-200
              "
              :class="
                algorithmMenuOpen
                  ? 'rotate-180'
                  : ''
              "
            />
          </button>

          <Transition name="algorithm-menu">
            <nav
              v-if="algorithmMenuOpen"
              class="
                mt-1
                space-y-1
                pl-6
              "
            >
              <!-- Sorting -->
              <div>
                <button
                  type="button"
                  class="
                    group
                    flex w-full
                    items-center
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
                  :aria-expanded="sortingMenuOpen"
                  @click="
                    sortingMenuOpen = !sortingMenuOpen
                  "
                >
                  <ArrowDownUp
                    class="
                      h-4 w-4
                      shrink-0
                      transition-transform
                      duration-200
                      group-hover:scale-105
                    "
                  />

                  <span>
                    Sorting
                  </span>

                  <ChevronDown
                    class="
                      ml-auto
                      h-4 w-4
                      transition-transform
                      duration-200
                    "
                    :class="
                      sortingMenuOpen
                        ? 'rotate-180'
                        : ''
                    "
                  />
                </button>

                <!-- Sorting children -->
                <Transition name="sorting-menu">
                  <nav
                    v-if="sortingMenuOpen"
                    class="
                      mt-1
                      space-y-1
                      pl-5
                    "
                  >
                    <NuxtLink
                      v-for="item in sortingMenuItems"
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

              <!-- Other Algorithms -->
              <NuxtLink
                v-for="item in algorithmMenuItems"
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

        <!-- Settings -->
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

    <!-- User -->
    <div
      class="
        shrink-0
        border-t
        border-white/[0.06]
        p-4
      "
    >
      <!-- User Info -->
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
            shrink-0 items-center justify-center
            rounded-full
            bg-gradient-to-br
            from-violet-500
            to-indigo-600
            text-xs
            font-bold
            text-white
          "
        >
          {{ user?.name?.charAt(0).toUpperCase() || 'U' }}
        </div>

        <!-- User -->
        <div class="ml-3 min-w-0">
          <p
            class="
              truncate
              text-sm
              font-medium
              text-zinc-200
            "
          >
            {{ user?.name || 'User' }}
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
      </div>

      <!-- Logout -->
      <button
        type="button"
        class="
          mt-2
          flex w-full
          items-center
          gap-3
          rounded-xl
          px-3 py-2.5
          text-sm
          text-zinc-500
          transition-all
          duration-200
          hover:bg-red-500/10
          hover:text-red-400
        "
        aria-label="Logout"
        @click="handleLogout"
      >
        <LogOut
          class="
            h-[18px] w-[18px]
            shrink-0
          "
        />

        <span>
          Logout
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped src="~/assets/css/components/admin/Sidebar.css"></style>
