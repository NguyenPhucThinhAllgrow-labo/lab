<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'hacker'
}>(), {
  variant: 'default',
})

const loading = ref(false)

const { logout } = useAuth()

async function handleLogout() {
  loading.value = true

  try {
    await logout()
    await navigateTo('/login')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition disabled:cursor-wait disabled:opacity-60"
    :class="variant === 'hacker'
      ? 'border-emerald-500/50 bg-[#02100b]/95 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-950/60'
      : 'rounded-full border-0 bg-slate-900/90 px-4 font-sans text-xs font-semibold normal-case tracking-normal text-white shadow-xl shadow-slate-950/25 backdrop-blur hover:bg-rose-600'"
    :disabled="loading"
    :title="loading ? 'Đang đăng xuất...' : 'Đăng xuất khỏi phiên người chơi'"
    @click="handleLogout"
  >
    <span>Logout</span>
  </button>
</template>
