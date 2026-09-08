<script setup lang="ts">
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const { adminLogin } = useAuth()

async function handleLogin() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Vui lòng nhập email và mật khẩu'
    return
  }

  loading.value = true

  try {
    await adminLogin(email.value, password.value)

    const route = useRoute()
    const requestedRedirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : ''
    const redirect = requestedRedirect.startsWith('/')
      && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/admin'

    await navigateTo(redirect)
  } catch (err: any) {
    if (err?.status === 422 || err?.status === 401) {
      error.value = err?.data?.errors?.email?.[0]
        || 'Email hoặc mật khẩu admin không chính xác.'
    } else if (err?.status === 419) {
      error.value = 'Phiên bảo mật đã hết hạn. Vui lòng thử lại.'
    } else {
      error.value = err?.data?.message
        || 'Đăng nhập thất bại. Vui lòng thử lại.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="background-glow background-glow-1"></div>
    <div class="background-glow background-glow-2"></div>

    <div class="login-card">
      <div class="logo">
        <div class="logo-icon"><span>A</span></div>
        <span>Admin Panel</span>
      </div>

      <div class="header">
        <h1>Đăng nhập quản trị</h1>
        <p>Khu vực chỉ dành cho quản trị viên</p>
      </div>

      <form novalidate @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="admin-email">Email</label>
          <input
            id="admin-email"
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            autocomplete="email"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="admin-password">Mật khẩu</label>
          <input
            id="admin-password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập admin' }}
        </button>
      </form>

      <p class="register">
        Người chơi?
        <NuxtLink to="/login">Đăng nhập tại đây</NuxtLink>
      </p>
    </div>
  </div>
</template>

<style scoped src="~/assets/css/pages/login/index.css"></style>
