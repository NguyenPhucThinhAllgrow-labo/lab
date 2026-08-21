<script setup lang="ts">
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const error = ref('')

  const handleLogin = async () => {
    error.value = ''

    if (!email.value || !password.value) {
      error.value = 'Vui lòng nhập email và mật khẩu'
      return
    }

    loading.value = true

    try {
      // TODO: gọi API login ở đây
      console.log({
        email: email.value,
        password: password.value,
      })

      // Ví dụ sau khi login thành công:
      // await navigateTo('/')
    } catch (err) {
      error.value = 'Đăng nhập thất bại'
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo">
        <div class="logo-icon">L</div>
        <span>MyApp</span>
      </div>

      <div class="header">
        <h1>Đăng nhập</h1>
        <p>Đăng nhập vào tài khoản của bạn</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <div class="password-label">
            <label for="password">Mật khẩu</label>
            <a href="#">Quên mật khẩu?</a>
          </div>

          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </div>

        <p v-if="error" class="error">
          {{ error }}
        </p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>

      <div class="divider">
        <span>hoặc</span>
      </div>

      <p class="register">
        Chưa có tài khoản?
        <NuxtLink to="/register">Đăng ký</NuxtLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f7fb;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 32px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.logo-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #2563eb;
  color: white;
}

.header {
  text-align: center;
  margin-bottom: 28px;
}

.header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  color: #111827;
}

.header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.password-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.password-label a {
  color: #2563eb;
  font-size: 13px;
  text-decoration: none;
}

input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
  transition: 0.2s;
}

input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

button {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  background: #1d4ed8;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin: -4px 0 16px;
  color: #dc2626;
  font-size: 13px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 28px 0;
  color: #9ca3af;
  font-size: 13px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.register {
  margin: 0;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.register a {
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 22px;
  }
}
</style>