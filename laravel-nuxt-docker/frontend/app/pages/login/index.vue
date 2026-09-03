<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const { login } = useAuth()

const handleLogin = async () => {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Vui lòng nhập email và mật khẩu'
    return
  }

  loading.value = true

  try {
    await login(
      email.value,
      password.value,
    )

    // Login thành công
    await navigateTo('/admin')
  } catch (err: any) {
    console.error('Login error:', err)

    if (err?.status === 422) {
      error.value =
        err?.data?.errors?.email?.[0] ||
        err?.data?.message ||
        'Email hoặc mật khẩu không chính xác.'

      return
    }

    if (err?.status === 419) {
      error.value =
        'Phiên bảo mật đã hết hạn. Vui lòng thử lại.'

      return
    }

    if (err?.status === 401) {
      error.value =
        'Email hoặc mật khẩu không chính xác.'

      return
    }

    error.value =
      err?.data?.message ||
      'Đăng nhập thất bại. Vui lòng thử lại.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">

    <!-- Background decoration -->
    <div class="background-glow background-glow-1"></div>
    <div class="background-glow background-glow-2"></div>

    <!-- Login card -->
    <div class="login-card">

      <!-- Logo -->
      <div class="logo">
        <div class="logo-icon">
          <span>A</span>
        </div>

        <span>Admin Panel</span>
      </div>

      <!-- Header -->
      <div class="header">
        <h1>Đăng nhập</h1>

        <p>
          Đăng nhập vào tài khoản của bạn
        </p>
      </div>

      <!-- Form -->
      <form
        @submit.prevent="handleLogin"
        novalidate
      >

        <!-- Email -->
        <div class="form-group">
          <label for="email">
            Email
          </label>

          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            :disabled="loading"
          />
        </div>

        <!-- Password -->
        <div class="form-group">

          <div class="password-label">
            <label for="password">
              Mật khẩu
            </label>

            <NuxtLink
              to="/forgot-password"
              tabindex="-1"
            >
              Quên mật khẩu?
            </NuxtLink>
          </div>

          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <!-- Error -->
        <p
          v-if="error"
          class="error"
          role="alert"
        >
          {{ error }}
        </p>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading"
        >
          <span v-if="loading">
            Đang đăng nhập...
          </span>

          <span v-else>
            Đăng nhập
          </span>
        </button>

      </form>

      <!-- Divider -->
      <div class="divider">
        <span>hoặc</span>
      </div>

      <!-- Register -->
      <p class="register">
        Chưa có tài khoản?

        <NuxtLink to="/register">
          Đăng ký
        </NuxtLink>
      </p>

    </div>
  </div>
</template>

<style scoped src="~/assets/css/pages/login/index.css"></style>
