<script setup lang="ts">
const sidebarOpen = ref(true)

const openSidebar = () => {
  sidebarOpen.value = true
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="min-h-screen bg-[#09090b] text-white">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar -->
    <AdminSidebar
      :open="sidebarOpen"
      @close="closeSidebar"
    />

    <!-- Main -->
    <div
      class="min-h-screen transition-[padding] duration-300"
      :class="sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'"
    >
      <!-- Header -->
      <AdminHeader
        :sidebar-open="sidebarOpen"
        @open-sidebar="openSidebar"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- Page -->
      <main class="min-h-[calc(100vh-5rem)]">
        <slot />
      </main>

      <!-- Footer -->
      <AdminFooter />
    </div>
  </div>
</template>

<style>
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
