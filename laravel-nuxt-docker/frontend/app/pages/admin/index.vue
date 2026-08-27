<script setup lang="ts">
import {
  ShoppingBag,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  CalendarDays,
  CreditCard
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin'
})

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
    time: '2 minutes ago'
  },
  {
    title: 'New user registered',
    description: 'Sarah Wilson joined your platform.',
    time: '15 minutes ago'
  },
  {
    title: 'Payment completed',
    description: 'Payment for #ORD-8289 was successful.',
    time: '42 minutes ago'
  },
  {
    title: 'Product updated',
    description: 'MacBook Pro inventory was updated.',
    time: '1 hour ago'
  }
]
</script>

<template>
  <main class="p-4 sm:p-6 lg:p-8">

    <!-- Top -->
    <div
      class="
        mb-8 flex flex-col
        justify-between gap-4
        sm:flex-row sm:items-center
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
          type="button"
          class="
            flex items-center gap-2
            rounded-xl
            border border-white/[0.06]
            bg-white/[0.02]
            px-4 py-2.5
            text-sm text-zinc-400
            hover:bg-white/[0.05]
            hover:text-white
          "
        >
          <CalendarDays class="h-4 w-4" />
          Last 30 days
        </button>

        <button
          type="button"
          class="
            hidden items-center gap-2
            rounded-xl
            bg-violet-500
            px-4 py-2.5
            text-sm font-medium text-white
            shadow-lg shadow-violet-500/20
            hover:bg-violet-400
            sm:flex
          "
        >
          + Add new
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="
          group rounded-2xl
          border border-white/[0.06]
          bg-[#11111b]/70
          p-5
          transition-all duration-300
          hover:-translate-y-1
          hover:border-violet-500/20
        "
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-zinc-500">
              {{ stat.title }}
            </p>

            <p class="mt-2 text-2xl font-bold tracking-tight">
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
            class="flex items-center gap-1 text-xs font-medium"
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

    <!-- Chart + Activity -->
    <div
      class="
        mt-6 grid gap-6
        xl:grid-cols-[1fr_360px]
      "
    >
      <!-- Chart -->
      <div
        class="
          rounded-2xl
          border border-white/[0.06]
          bg-[#11111b]/70
          p-5 sm:p-6
        "
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">
              Revenue overview
            </h3>

            <p class="mt-1 text-xs text-zinc-600">
              Monthly revenue performance
            </p>
          </div>

          <button type="button" class="text-zinc-600 hover:text-white">
            <MoreHorizontal class="h-5 w-5" />
          </button>
        </div>

        <div class="relative mt-8 h-64">
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
                <stop offset="0%" stop-color="#6366f1" />
                <stop offset="100%" stop-color="#a78bfa" />
              </linearGradient>
            </defs>

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

          <div
            class="
              absolute bottom-0 left-0 right-0
              flex justify-between
              pt-4
              text-[10px] text-zinc-700
            "
          >
            <span
              v-for="month in [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
              ]"
              :key="month"
            >
              {{ month }}
            </span>
          </div>
        </div>
      </div>

      <!-- Activity -->
      <div
        class="
          rounded-2xl
          border border-white/[0.06]
          bg-[#11111b]/70
          p-5 sm:p-6
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
            type="button"
            class="
              text-xs
              text-violet-400
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
            <div
              class="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full
                bg-violet-500/10
              "
            >
              <span
                class="
                  h-2 w-2
                  rounded-full
                  bg-violet-400
                "
              />
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-zinc-300">
                {{ activity.title }}
              </p>

              <p class="mt-0.5 truncate text-xs text-zinc-600">
                {{ activity.description }}
              </p>

              <p class="mt-1 text-[10px] text-zinc-700">
                {{ activity.time }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Orders -->
    <div
      class="
        mt-6 overflow-hidden
        rounded-2xl
        border border-white/[0.06]
        bg-[#11111b]/70
      "
    >
      <div
        class="
          flex items-center justify-between
          border-b border-white/[0.06]
          px-5 py-5 sm:px-6
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
          type="button"
          class="
            text-xs
            text-violet-400
            hover:text-violet-300
          "
        >
          View all
        </button>
      </div>

      <!-- Desktop -->
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
              <th class="px-6 py-4 font-medium">Order</th>
              <th class="px-6 py-4 font-medium">Customer</th>
              <th class="px-6 py-4 font-medium">Product</th>
              <th class="px-6 py-4 font-medium">Amount</th>
              <th class="px-6 py-4 font-medium">Status</th>
              <th class="px-6 py-4"></th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="order in recentOrders"
              :key="order.id"
              class="
                border-b border-white/[0.04]
                last:border-0
                hover:bg-violet-500/[0.025]
              "
            >
              <td
                class="
                  px-6 py-4
                  text-sm font-medium
                  text-violet-300
                "
              >
                {{ order.id }}
              </td>

              <td class="px-6 py-4">
                <p class="text-sm font-medium text-zinc-300">
                  {{ order.customer }}
                </p>

                <p class="mt-0.5 text-xs text-zinc-700">
                  {{ order.email }}
                </p>
              </td>

              <td class="px-6 py-4 text-sm text-zinc-500">
                {{ order.product }}
              </td>

              <td class="px-6 py-4 text-sm font-medium text-zinc-300">
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
                  type="button"
                  class="text-zinc-700 hover:text-zinc-300"
                >
                  <MoreHorizontal class="h-5 w-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="divide-y divide-white/[0.04] md:hidden">
        <div
          v-for="order in recentOrders"
          :key="order.id"
          class="p-5"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-violet-300">
                {{ order.id }}
              </p>

              <p class="mt-1 text-sm text-zinc-300">
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

          <div class="mt-4 flex items-center justify-between">
            <p class="text-xs text-zinc-600">
              {{ order.product }}
            </p>

            <p class="text-sm font-semibold text-zinc-300">
              {{ order.amount }}
            </p>
          </div>
        </div>
      </div>
    </div>

  </main>
</template>
