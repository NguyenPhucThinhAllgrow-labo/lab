<script setup lang="ts">
import { ArrowLeft, CheckCircle2, Gamepad2, ShieldCheck, UserPlus } from 'lucide-vue-next'

useHead({ title: 'Đăng ký tài khoản | Game Portal' })

const route = useRoute()
const { register } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

const passwordChecks = computed(() => ({
  length: password.value.length >= 8,
  matches: password.value !== '' && password.value === passwordConfirmation.value,
}))

async function handleRegister() {
  errorMessage.value = ''
  fieldErrors.value = {}

  if (!name.value.trim() || !email.value || !password.value || !passwordConfirmation.value) {
    errorMessage.value = 'Vui lòng nhập đầy đủ thông tin đăng ký.'
    return
  }

  loading.value = true

  try {
    await register(name.value.trim(), email.value, password.value, passwordConfirmation.value)

    const requestedRedirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const redirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/games/pandora/detective'

    await navigateTo(redirect)
  } catch (error: any) {
    fieldErrors.value = error?.data?.errors ?? {}
    errorMessage.value = error?.data?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.'
  } finally {
    loading.value = false
  }
}

function fieldError(field: string) {
  return fieldErrors.value[field]?.[0]
}
</script>

<template>
  <main class="register-page">
    <div class="register-page__grid" aria-hidden="true"></div>
    <div class="register-page__glow register-page__glow--left" aria-hidden="true"></div>
    <div class="register-page__glow register-page__glow--right" aria-hidden="true"></div>

    <section class="register-card">
      <NuxtLink class="register-card__back" to="/login">
        <ArrowLeft />
        Quay lại đăng nhập
      </NuxtLink>

      <header class="register-card__header">
        <span class="register-card__icon"><UserPlus /></span>
        <div>
          <small>PLAYER REGISTRATION</small>
          <h1>Tạo tài khoản người chơi</h1>
          <p>Một tài khoản để lưu tiến trình và thành tích trong tất cả game.</p>
        </div>
      </header>

      <form novalidate @submit.prevent="handleRegister">
        <label class="register-field">
          <span>Tên người chơi</span>
          <input v-model="name" type="text" autocomplete="name" placeholder="Nhập tên hiển thị" :disabled="loading">
          <small v-if="fieldError('name')">{{ fieldError('name') }}</small>
        </label>

        <label class="register-field">
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="email" placeholder="player@example.com" :disabled="loading">
          <small v-if="fieldError('email')">{{ fieldError('email') }}</small>
        </label>

        <div class="register-card__passwords">
          <label class="register-field">
            <span>Mật khẩu</span>
            <input v-model="password" type="password" autocomplete="new-password" placeholder="Tối thiểu 8 ký tự" :disabled="loading">
            <small v-if="fieldError('password')">{{ fieldError('password') }}</small>
          </label>

          <label class="register-field">
            <span>Xác nhận mật khẩu</span>
            <input v-model="passwordConfirmation" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" :disabled="loading">
          </label>
        </div>

        <div class="register-requirements" aria-live="polite">
          <span :class="{ 'is-valid': passwordChecks.length }"><CheckCircle2 /> Ít nhất 8 ký tự</span>
          <span :class="{ 'is-valid': passwordChecks.matches }"><CheckCircle2 /> Mật khẩu trùng khớp</span>
        </div>

        <p v-if="errorMessage" class="register-card__error" role="alert">{{ errorMessage }}</p>

        <button class="register-card__submit" type="submit" :disabled="loading">
          <span>{{ loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản' }}</span>
          <UserPlus />
        </button>
      </form>

      <footer class="register-card__footer">
        <span><ShieldCheck /> Tài khoản được bảo vệ bằng phiên đăng nhập an toàn</span>
        <p>Đã có tài khoản? <NuxtLink to="/login">Đăng nhập</NuxtLink></p>
      </footer>
    </section>

    <div class="register-game-mark" aria-hidden="true"><Gamepad2 /></div>
  </main>
</template>

<style scoped src="~/assets/css/pages/register.css"></style>
