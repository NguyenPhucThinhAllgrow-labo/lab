<script setup lang="ts">
import { AlertTriangle, LogOut, X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  loading?: boolean
  userName?: string
  variant?: 'default' | 'hacker'
}>(), {
  loading: false,
  userName: 'Người chơi',
  variant: 'default',
})

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const dialog = ref<HTMLElement | null>(null)

function cancel(): void {
  if (!props.loading) emit('cancel')
}

watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  dialog.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="logout-confirm">
      <div
        v-if="open"
        ref="dialog"
        class="logout-confirm"
        :class="`logout-confirm--${variant}`"
        role="presentation"
        tabindex="-1"
        @click.self="cancel"
        @keydown.esc="cancel"
      >
        <section role="alertdialog" aria-modal="true" aria-labelledby="logout-confirm-title" aria-describedby="logout-confirm-description">
          <button type="button" class="logout-confirm__close" aria-label="Đóng" :disabled="loading" @click="cancel">
            <X aria-hidden="true" />
          </button>

          <div class="logout-confirm__icon"><AlertTriangle aria-hidden="true" /></div>
          <small>{{ variant === 'hacker' ? 'SESSION TERMINATION' : 'XÁC NHẬN ĐĂNG XUẤT' }}</small>
          <h2 id="logout-confirm-title">Bạn muốn đăng xuất?</h2>
          <p id="logout-confirm-description"><strong>{{ userName }}</strong> sẽ kết thúc phiên hiện tại và cần đăng nhập lại để tiếp tục chơi.</p>

          <div class="logout-confirm__actions">
            <button type="button" :disabled="loading" @click="cancel">Ở lại</button>
            <button type="button" class="logout-confirm__submit" :disabled="loading" @click="emit('confirm')">
              <LogOut aria-hidden="true" />
              {{ loading ? 'Đang đăng xuất...' : 'Xác nhận đăng xuất' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.logout-confirm { position: fixed; z-index: 10000; inset: 0; display: grid; place-items: center; padding: 20px; outline: 0; background: rgb(3 7 5 / 74%); backdrop-filter: blur(10px); }
.logout-confirm > section { position: relative; width: min(100%, 470px); padding: 38px; overflow: hidden; border: 1px solid rgb(213 244 135 / 24%); border-radius: 20px; background: linear-gradient(145deg, #1b241f, #111714); color: #edf3ea; box-shadow: 0 32px 100px rgb(0 0 0 / 62%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; text-align: center; }
.logout-confirm > section::before { content: ""; position: absolute; top: -90px; left: 50%; width: 260px; height: 160px; transform: translateX(-50%); border-radius: 50%; background: rgb(213 244 135 / 10%); filter: blur(45px); pointer-events: none; }
.logout-confirm__close { position: absolute; z-index: 2; top: 14px; right: 14px; display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgb(255 255 255 / 9%); border-radius: 10px; background: rgb(255 255 255 / 4%); color: #8f9b93; cursor: pointer; }
.logout-confirm__close:hover:not(:disabled) { background: rgb(255 255 255 / 9%); color: white; }
.logout-confirm__close svg { width: 17px; height: 17px; }
.logout-confirm__icon { position: relative; display: grid; width: 58px; height: 58px; margin: 0 auto 20px; place-items: center; border: 1px solid rgb(251 113 133 / 28%); border-radius: 18px; background: rgb(225 29 72 / 10%); color: #fda4af; }
.logout-confirm__icon svg { width: 27px; height: 27px; }
.logout-confirm small { color: #d5f487; font-size: 9px; font-weight: 800; letter-spacing: .18em; }
.logout-confirm h2 { margin: 11px 0 10px; font-size: 27px; font-weight: 650; letter-spacing: -.035em; }
.logout-confirm p { max-width: 350px; margin: 0 auto; color: #a4afa7; font-size: 12px; line-height: 1.7; }
.logout-confirm p strong { color: #e8eee5; }
.logout-confirm__actions { display: grid; grid-template-columns: .75fr 1.25fr; gap: 10px; margin-top: 28px; }
.logout-confirm__actions button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 10px; background: rgb(255 255 255 / 4%); color: #cbd3cc; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; }
.logout-confirm__actions button:hover:not(:disabled) { background: rgb(255 255 255 / 8%); }
.logout-confirm__actions button:disabled { cursor: wait; opacity: .55; }
.logout-confirm__actions .logout-confirm__submit { border-color: rgb(251 113 133 / 32%); background: rgb(190 24 45 / 24%); color: #fecdd3; }
.logout-confirm__actions .logout-confirm__submit:hover:not(:disabled) { background: rgb(190 24 45 / 38%); }
.logout-confirm__submit svg { width: 16px; height: 16px; }
.logout-confirm--hacker > section { border-radius: 2px; border-color: rgb(52 211 153 / 34%); background: #06100c; font-family: "Lucida Console", Monaco, "Courier New", monospace; box-shadow: 0 0 45px rgb(16 185 129 / 13%), 0 32px 100px rgb(0 0 0 / 72%); }
.logout-confirm--hacker > section::after { content: "[ CONNECTION AWAITING INPUT ]"; position: absolute; right: 12px; bottom: 9px; color: rgb(52 211 153 / 20%); font-size: 7px; letter-spacing: .12em; }
.logout-confirm--hacker .logout-confirm__close, .logout-confirm--hacker .logout-confirm__actions button { border-radius: 1px; }
.logout-confirm--hacker .logout-confirm__icon { border-radius: 2px; }
.logout-confirm--hacker small { color: #6ee7b7; }
.logout-confirm-enter-active, .logout-confirm-leave-active { transition: opacity .18s ease; }
.logout-confirm-enter-active > section, .logout-confirm-leave-active > section { transition: opacity .18s ease, transform .22s ease; }
.logout-confirm-enter-from, .logout-confirm-leave-to { opacity: 0; }
.logout-confirm-enter-from > section, .logout-confirm-leave-to > section { opacity: 0; transform: translateY(10px) scale(.97); }
@media (max-width: 480px) { .logout-confirm { align-items: end; padding: 0; }.logout-confirm > section { width: 100%; padding: 34px 22px 24px; border-right: 0; border-bottom: 0; border-left: 0; border-radius: 20px 20px 0 0; }.logout-confirm__actions { grid-template-columns: 1fr; }.logout-confirm__actions button:first-child { order: 2; } }
@media (prefers-reduced-motion: reduce) { .logout-confirm, .logout-confirm > section { transition: none !important; } }
</style>
