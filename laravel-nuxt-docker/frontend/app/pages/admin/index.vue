<script setup lang="ts">
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  BarChart3,
  FileText,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  CalendarDays,
  CreditCard
} from 'lucide-vue-next'

const sidebarOpen = ref(false)

const menuGroups = [
  {
    title: 'MAIN',
    items: [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        active: true
      },
      {
        label: 'Analytics',
        icon: BarChart3
      }
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        label: 'Users',
        icon: Users
      },
      {
        label: 'Products',
        icon: Package
      },
      {
        label: 'Orders',
        icon: ShoppingBag
      },
      {
        label: 'Reports',
        icon: FileText
      }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      {
        label: 'Settings',
        icon: Settings
      }
    ]
  }
]

const stats = [
  {
    title: 'Total Revenue',
    value: '$84,420',
    change: '+12.5%',
    positive: true,
    icon: CreditCard
  },
  {
    title: 'Total Users',
    value: '12,840',
    change: '+8.2%',
    positive: true,
    icon: Users
  },
  {
    title: 'Total Orders',
    value: '3,642',
    change: '+5.7%',
    positive: true,
    icon: ShoppingBag
  },
  {
    title: 'Refunds',
    value: '$2,840',
    change: '-3.4%',
    positive: false,
    icon: ArrowDownRight
  }
]

const recentOrders = [
  {
    id: '#ORD-8291',
    customer: 'John Doe',
    email: 'john@example.com',
    product: 'MacBook Pro',
    amount: '$2,499',
    status: 'Completed'
  },
  {
    id: '#ORD-8290',
    customer: 'Sarah Wilson',
    email: 'sarah@example.com',
    product: 'iPhone 16 Pro',
    amount: '$1,199',
    status: 'Processing'
  },
  {
    id: '#ORD-8289',
    customer: 'Michael Brown',
    email: 'michael@example.com',
    product: 'AirPods Pro',
    amount: '$249',
    status: 'Completed'
  },
  {
    id: '#ORD-8288',
    customer: 'Emma Davis',
    email: 'emma@example.com',
    product: 'iPad Air',
    amount: '$699',
    status: 'Pending'
  },
  {
    id: '#ORD-8287',
    customer: 'James Wilson',
    email: 'james@example.com',
    product: 'Apple Watch',
    amount: '$499',
    status: 'Cancelled'
  }
]

const activities = [
  {
    title: 'New order received',
    description: 'Order #ORD-8291 has been created.',
    time: '2 minutes ago',
    color: 'violet'
  },
  {
    title: 'New user registered',
    description: 'Sarah Wilson joined your platform.',
    time: '15 minutes ago',
    color: 'indigo'
  },
  {
    title: 'Payment completed',
    description: 'Payment for #ORD-8289 was successful.',
    time: '42 minutes ago',
    color: 'emerald'
  },
  {
    title: 'Product updated',
    description: 'MacBook Pro inventory was updated.',
    time: '1 hour ago',
    color: 'amber'
  }
]
</script>

<template>
  <div class="min-h-screen bg-[#09090b] text-white">

    <!-- ========================================= -->
    <!-- MOBILE OVERLAY -->
    <!-- ========================================= -->

    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- ========================================= -->
    <!-- SIDEBAR -->
    <!-- ========================================= -->

    <aside
      class="
        fixed inset-y-0 left-0 z-50
        flex w-64 flex-col
        border-r border-white/[0.06]
        bg-[#0d0d12]
        transition-transform duration-300
        lg:translate-x-0
      "
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >

      <!-- Logo -->
      <div
        class="
          flex h-20 shrink-0 items-center
          border-b border-white/[0.06]
          px-6
        "
      >

        <div
          class="
            flex h-9 w-9 items-center justify-center
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

        <div class="ml-3">
          <p class="text-sm font-bold text-white">
            Admin Panel
          </p>

          <p class="text-[11px] text-zinc-600">
            Management System
          </p>
        </div>

        <!-- Mobile close -->
        <button
          class="
            ml-auto flex h-8 w-8 items-center
            justify-center rounded-lg
            text-zinc-500
            transition
            hover:bg-white/5
            hover:text-white
            lg:hidden
          "
          @click="sidebarOpen = false"
        >
          <X class="h-4 w-4" />
        </button>

      </div>

      <!-- Menu -->
      <div class="flex-1 overflow-y-auto px-4 py-6">

        <div
          v-for="group in menuGroups"
          :key="group.title"
          class="mb-7"
        >

          <p
            class="
              mb-3 px-3
              text-[10px]
              font-bold
              tracking-[0.15em]
              text-zinc-600
            "
          >
            {{ group.title }}
          </p>

          <nav class="space-y-1">

            <a
              v-for="item in group.items"
              :key="item.label"
              href="#"
              class="
                group relative flex items-center
                gap-3 rounded-xl
                px-3 py-2.5
                text-sm
                transition-all duration-200
              "
              :class="
                item.active
                  ? 'bg-violet-500/10 text-violet-300'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
              "
              @click="sidebarOpen = false"
            >

              <!-- Active indicator -->
              <span
                v-if="item.active"
                class="
                  absolute -left-4
                  h-6 w-0.5
                  rounded-full
                  bg-violet-500
                  shadow-[0_0_10px_rgba(139,92,246,0.8)]
                "
              />

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

              <!-- Dashboard badge -->
              <span
                v-if="item.label === 'Orders'"
                class="
                  ml-auto rounded-full
                  bg-violet-500/10
                  px-2 py-0.5
                  text-[10px]
                  text-violet-400
                "
              >
                12
              </span>

            </a>

          </nav>

        </div>

      </div>

      <!-- User -->
      <div
        class="
          shrink-0
          border-t border-white/[0.06]
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

          <div
            class="
              flex h-9 w-9
              shrink-0
              items-center justify-center
              rounded-full
              bg-gradient-to-br
              from-violet-500
              to-indigo-600
              text-xs font-bold
            "
          >
            JD
          </div>

          <div class="ml-3 min-w-0">
            <p class="truncate text-sm font-medium text-zinc-200">
              John Doe
            </p>

            <p class="truncate text-[11px] text-zinc-600">
              Administrator
            </p>
          </div>

          <button
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

    <!-- ========================================= -->
    <!-- MAIN -->
    <!-- ========================================= -->

    <div class="lg:pl-64">

      <!-- ========================================= -->
      <!-- HEADER -->
      <!-- ========================================= -->

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
            items-center
            justify-between
            px-4 sm:px-6 lg:px-8
          "
        >

          <!-- Left -->
          <div class="flex items-center gap-4">

            <!-- Mobile menu -->
            <button
              class="
                flex h-10 w-10
                items-center justify-center
                rounded-xl
                border border-white/[0.06]
                bg-white/[0.02]
                text-zinc-400
                transition
                hover:bg-white/[0.05]
                hover:text-white
                lg:hidden
              "
              @click="sidebarOpen = true"
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

              <Search
                class="h-4 w-4 text-zinc-600"
              />

              <input
                type="text"
                placeholder="Search..."
                class="
                  w-32
                  bg-transparent
                  px-2 py-2
                  text-sm
                  text-zinc-300
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
                  text-[10px]
                  text-zinc-600
                  lg:block
                "
              >
                ⌘ K
              </kbd>

            </div>

            <!-- Notification -->
            <button
              class="
                relative flex h-10 w-10
                items-center justify-center
                rounded-xl
                border border-white/[0.06]
                bg-white/[0.02]
                text-zinc-500
                transition
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
                  shadow-[0_0_8px_rgba(139,92,246,0.8)]
                "
              />

            </button>

            <!-- Profile -->
            <button
              class="
                hidden items-center gap-2
                rounded-xl
                border border-transparent
                px-2 py-1.5
                transition
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

              <ChevronDown
                class="h-4 w-4 text-zinc-600"
              />

            </button>

          </div>

        </div>
      </header>

      <!-- ========================================= -->
      <!-- CONTENT -->
      <!-- ========================================= -->

      <main class="p-4 sm:p-6 lg:p-8">

        <!-- Top -->
        <div
          class="
            mb-8
            flex flex-col
            justify-between
            gap-4
            sm:flex-row
            sm:items-center
          "
        >

          <div>
            <p class="text-sm text-zinc-500">
              Overview
            </p>

            <h2 class="mt-1 text-2xl font-bold">
              Today's performance
            </h2>
          </div>

          <div class="flex gap-3">

            <button
              class="
                flex items-center gap-2
                rounded-xl
                border border-white/[0.06]
                bg-white/[0.02]
                px-4 py-2.5
                text-sm
                text-zinc-400
                transition
                hover:bg-white/[0.05]
                hover:text-white
              "
            >
              <CalendarDays class="h-4 w-4" />
              Last 30 days
              <ChevronDown class="h-3.5 w-3.5" />
            </button>

            <button
              class="
                hidden items-center gap-2
                rounded-xl
                bg-violet-500
                px-4 py-2.5
                text-sm
                font-medium
                text-white
                shadow-lg
                shadow-violet-500/20
                transition
                hover:bg-violet-400
                sm:flex
              "
            >
              <Plus class="h-4 w-4" />
              Add new
            </button>

          </div>

        </div>

        <!-- ========================================= -->
        <!-- STATS -->
        <!-- ========================================= -->

        <div
          class="
            grid gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <div
            v-for="stat in stats"
            :key="stat.title"
            class="
              group
              rounded-2xl
              border border-white/[0.06]
              bg-[#11111b]/70
              p-5
              transition-all duration-300
              hover:-translate-y-1
              hover:border-violet-500/20
              hover:bg-violet-500/[0.03]
            "
          >

            <div class="flex items-start justify-between">

              <div>

                <p class="text-sm text-zinc-500">
                  {{ stat.title }}
                </p>

                <p
                  class="
                    mt-2
                    text-2xl
                    font-bold
                    tracking-tight
                  "
                >
                  {{ stat.value }}
                </p>

              </div>

              <div
                class="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  bg-violet-500/10
                  text-violet-400
                  transition
                  group-hover:bg-violet-500/20
                "
              >
                <component
                  :is="stat.icon"
                  class="h-5 w-5"
                />
              </div>

            </div>

            <div class="mt-4 flex items-center gap-2">

              <span
                class="
                  flex items-center gap-1
                  text-xs font-medium
                "
                :class="
                  stat.positive
                    ? 'text-emerald-400'
                    : 'text-red-400'
                "
              >

                <ArrowUpRight
                  v-if="stat.positive"
                  class="h-3.5 w-3.5"
                />

                <ArrowDownRight
                  v-else
                  class="h-3.5 w-3.5"
                />

                {{ stat.change }}

              </span>

              <span class="text-xs text-zinc-700">
                vs last month
              </span>

            </div>

          </div>

        </div>

        <!-- ========================================= -->
        <!-- CHART + ACTIVITY -->
        <!-- ========================================= -->

        <div
          class="
            mt-6
            grid gap-6
            xl:grid-cols-[1fr_360px]
          "
        >

          <!-- Revenue Chart -->
          <div
            class="
              rounded-2xl
              border border-white/[0.06]
              bg-[#11111b]/70
              p-5
              sm:p-6
            "
          >

            <div
              class="
                flex items-center
                justify-between
              "
            >

              <div>
                <h3 class="font-semibold">
                  Revenue overview
                </h3>

                <p class="mt-1 text-xs text-zinc-600">
                  Monthly revenue performance
                </p>
              </div>

              <button
                class="
                  text-zinc-600
                  transition
                  hover:text-white
                "
              >
                <MoreHorizontal class="h-5 w-5" />
              </button>

            </div>

            <!-- Fake chart -->
            <div class="relative mt-8 h-64">

              <!-- Horizontal lines -->
              <div
                class="
                  absolute inset-0
                  flex flex-col
                  justify-between
                "
              >
                <div
                  v-for="i in 5"
                  :key="i"
                  class="border-t border-white/[0.04]"
                />
              </div>

              <!-- Chart -->
              <svg
                viewBox="0 0 800 240"
                preserveAspectRatio="none"
                class="absolute inset-0 h-full w-full"
              >

                <defs>
                  <linearGradient
                    id="areaGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stop-color="#8b5cf6"
                      stop-opacity="0.3"
                    />

                    <stop
                      offset="100%"
                      stop-color="#8b5cf6"
                      stop-opacity="0"
                    />
                  </linearGradient>

                  <linearGradient
                    id="lineGradient"
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stop-color="#6366f1"
                    />

                    <stop
                      offset="100%"
                      stop-color="#a78bfa"
                    />
                  </linearGradient>
                </defs>

                <!-- Area -->
                <path
                  d="
                    M0 190
                    C70 175 90 150 150 160
                    C210 170 230 110 300 125
                    C360 140 380 85 440 105
                    C500 125 530 70 590 85
                    C650 100 690 35 750 55
                    C770 62 790 45 800 40
                    L800 240
                    L0 240
                    Z
                  "
                  fill="url(#areaGradient)"
                />

                <!-- Line -->
                <path
                  d="
                    M0 190
                    C70 175 90 150 150 160
                    C210 170 230 110 300 125
                    C360 140 380 85 440 105
                    C500 125 530 70 590 85
                    C650 100 690 35 750 55
                    C770 62 790 45 800 40
                  "
                  fill="none"
                  stroke="url(#lineGradient)"
                  stroke-width="3"
                  stroke-linecap="round"
                />

              </svg>

              <!-- Labels -->
              <div
                class="
                  absolute bottom-0 left-0 right-0
                  flex justify-between
                  pt-4
                  text-[10px]
                  text-zinc-700
                "
              >
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>

            </div>

          </div>

          <!-- Activity -->
          <div
            class="
              rounded-2xl
              border border-white/[0.06]
              bg-[#11111b]/70
              p-5
              sm:p-6
            "
          >

            <div class="flex items-center justify-between">

              <div>
                <h3 class="font-semibold">
                  Recent activity
                </h3>

                <p class="mt-1 text-xs text-zinc-600">
                  Latest updates
                </p>
              </div>

              <button
                class="
                  text-xs
                  text-violet-400
                  transition
                  hover:text-violet-300
                "
              >
                View all
              </button>

            </div>

            <div class="mt-6 space-y-5">

              <div
                v-for="activity in activities"
                :key="activity.title"
                class="flex gap-3"
              >

                <div class="relative">

                  <div
                    class="
                      flex h-9 w-9
                      items-center justify-center
                      rounded-full
                      bg-violet-500/10
                      text-violet-400
                    "
                  >
                    <span
                      class="h-2 w-2 rounded-full bg-violet-400"
                    />
                  </div>

                </div>

                <div class="min-w-0 flex-1">

                  <p
                    class="
                      text-sm
                      font-medium
                      text-zinc-300
                    "
                  >
                    {{ activity.title }}
                  </p>

                  <p
                    class="
                      mt-0.5
                      truncate
                      text-xs
                      text-zinc-600
                    "
                  >
                    {{ activity.description }}
                  </p>

                  <p
                    class="
                      mt-1
                      text-[10px]
                      text-zinc-700
                    "
                  >
                    {{ activity.time }}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

        <!-- ========================================= -->
        <!-- ORDERS -->
        <!-- ========================================= -->

        <div
          class="
            mt-6
            overflow-hidden
            rounded-2xl
            border border-white/[0.06]
            bg-[#11111b]/70
          "
        >

          <!-- Header -->
          <div
            class="
              flex items-center
              justify-between
              border-b border-white/[0.06]
              px-5 py-5
              sm:px-6
            "
          >

            <div>

              <h3 class="font-semibold">
                Recent orders
              </h3>

              <p class="mt-1 text-xs text-zinc-600">
                Latest transactions
              </p>

            </div>

            <button
              class="
                text-xs
                text-violet-400
                transition
                hover:text-violet-300
              "
            >
              View all
            </button>

          </div>

          <!-- Desktop table -->
          <div class="hidden overflow-x-auto md:block">

            <table class="w-full">

              <thead>
                <tr
                  class="
                    border-b border-white/[0.04]
                    text-left
                    text-[11px]
                    uppercase
                    tracking-wider
                    text-zinc-700
                  "
                >

                  <th class="px-6 py-4 font-medium">
                    Order
                  </th>

                  <th class="px-6 py-4 font-medium">
                    Customer
                  </th>

                  <th class="px-6 py-4 font-medium">
                    Product
                  </th>

                  <th class="px-6 py-4 font-medium">
                    Amount
                  </th>

                  <th class="px-6 py-4 font-medium">
                    Status
                  </th>

                  <th class="px-6 py-4">
                  </th>

                </tr>
              </thead>

              <tbody>

                <tr
                  v-for="order in recentOrders"
                  :key="order.id"
                  class="
                    border-b border-white/[0.04]
                    last:border-0
                    transition-colors
                    hover:bg-violet-500/[0.025]
                  "
                >

                  <td
                    class="
                      whitespace-nowrap
                      px-6 py-4
                      text-sm
                      font-medium
                      text-violet-300
                    "
                  >
                    {{ order.id }}
                  </td>

                  <td class="px-6 py-4">

                    <p
                      class="
                        text-sm
                        font-medium
                        text-zinc-300
                      "
                    >
                      {{ order.customer }}
                    </p>

                    <p
                      class="
                        mt-0.5
                        text-xs
                        text-zinc-700
                      "
                    >
                      {{ order.email }}
                    </p>

                  </td>

                  <td
                    class="
                      whitespace-nowrap
                      px-6 py-4
                      text-sm
                      text-zinc-500
                    "
                  >
                    {{ order.product }}
                  </td>

                  <td
                    class="
                      whitespace-nowrap
                      px-6 py-4
                      text-sm
                      font-medium
                      text-zinc-300
                    "
                  >
                    {{ order.amount }}
                  </td>

                  <td class="px-6 py-4">

                    <span
                      class="
                        inline-flex
                        rounded-full
                        px-2.5 py-1
                        text-[10px]
                        font-medium
                      "
                      :class="{
                        'bg-emerald-500/10 text-emerald-400':
                          order.status === 'Completed',

                        'bg-amber-500/10 text-amber-400':
                          order.status === 'Processing' ||
                          order.status === 'Pending',

                        'bg-red-500/10 text-red-400':
                          order.status === 'Cancelled'
                      }"
                    >
                      {{ order.status }}
                    </span>

                  </td>

                  <td class="px-6 py-4 text-right">

                    <button
                      class="
                        text-zinc-700
                        transition
                        hover:text-zinc-300
                      "
                    >
                      <MoreHorizontal
                        class="h-5 w-5"
                      />
                    </button>

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

          <!-- Mobile cards -->
          <div class="divide-y divide-white/[0.04] md:hidden">

            <div
              v-for="order in recentOrders"
              :key="order.id"
              class="p-5"
            >

              <div
                class="flex items-start justify-between"
              >

                <div>

                  <p
                    class="
                      text-sm
                      font-semibold
                      text-violet-300
                    "
                  >
                    {{ order.id }}
                  </p>

                  <p
                    class="
                      mt-1
                      text-sm
                      text-zinc-300
                    "
                  >
                    {{ order.customer }}
                  </p>

                </div>

                <span
                  class="
                    rounded-full
                    px-2.5 py-1
                    text-[10px]
                    font-medium
                  "
                  :class="{
                    'bg-emerald-500/10 text-emerald-400':
                      order.status === 'Completed',

                    'bg-amber-500/10 text-amber-400':
                      order.status === 'Processing' ||
                      order.status === 'Pending',

                    'bg-red-500/10 text-red-400':
                      order.status === 'Cancelled'
                  }"
                >
                  {{ order.status }}
                </span>

              </div>

              <div
                class="
                  mt-4
                  flex
                  items-center
                  justify-between
                "
              >

                <p class="text-xs text-zinc-600">
                  {{ order.product }}
                </p>

                <p
                  class="
                    text-sm
                    font-semibold
                    text-zinc-300
                  "
                >
                  {{ order.amount }}
                </p>

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>