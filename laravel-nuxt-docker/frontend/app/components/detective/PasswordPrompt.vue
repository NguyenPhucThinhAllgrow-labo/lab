<script setup lang="ts">
import type {
  SupportedLocale,
} from '~/types/games/detective'

const props = defineProps<{
  path: string
  prompt: string
  incorrect: boolean
  locale: SupportedLocale
}>()

const emit = defineEmits<{
  submit: [password: string]
  cancel: []
}>()

const password = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.incorrect,
  incorrect => {
    if (!incorrect) return
    password.value = ''
    nextTick(() => inputRef.value?.focus())
  },
)

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

function submit() {
  if (!password.value) return
  emit('submit', password.value)
}
</script>

<template>
  <div
    class="fixed inset-0 z-[110]
           flex items-center justify-center
           bg-black/85 p-4 backdrop-blur-sm"
    role="presentation"
    @click.self="emit('cancel')"
    @keydown.esc="emit('cancel')"
  >
    <section
      class="w-full max-w-xl overflow-hidden
             rounded-lg border border-emerald-700/70
             bg-slate-950 font-mono
             shadow-[0_0_60px_rgba(16,185,129,0.18)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-dialog-title"
    >
      <header
        class="flex items-center justify-between
               border-b border-emerald-900/80
               bg-emerald-950/30 px-4 py-2.5"
      >
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span class="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>

        <span
          id="password-dialog-title"
          class="text-[10px] uppercase tracking-[0.2em]
                 text-emerald-400"
        >
          secure credential prompt
        </span>

        <button
          type="button"
          class="text-xs text-slate-500 transition
                 hover:text-emerald-300"
          :aria-label="locale === 'vi' ? 'Đóng' : 'Close'"
          @click="emit('cancel')"
        >
          [×]
        </button>
      </header>

      <form class="space-y-4 p-5" @submit.prevent="submit">
        <p class="text-xs leading-5 text-emerald-300">
          detective@secure-vault:~$ cat {{ path }}
        </p>

        <p class="text-xs leading-5 text-slate-400">
          {{ prompt }}
        </p>

        <label class="block">
          <span class="mb-2 block text-[10px] uppercase
                       tracking-[0.16em] text-slate-500">
            {{ locale === 'vi' ? 'Nhập mật mã' : 'Enter password' }}
          </span>

          <div
            class="flex items-center gap-2 rounded border
                   bg-black/50 px-3 py-2"
            :class="incorrect
              ? 'border-red-700'
              : 'border-emerald-900 focus-within:border-emerald-500'"
          >
            <span class="text-sm text-emerald-500">password:</span>
            <input
              ref="inputRef"
              v-model="password"
              type="password"
              autocomplete="off"
              spellcheck="false"
              class="min-w-0 flex-1 bg-transparent text-sm
                     text-emerald-200 caret-emerald-400
                     outline-none"
            >
            <span class="animate-pulse text-emerald-400">█</span>
          </div>
        </label>

        <p
          v-if="incorrect"
          class="text-xs text-red-400"
          role="alert"
        >
          {{
            locale === 'vi'
              ? 'Mật mã không chính xác. Quyền truy cập bị từ chối.'
              : 'Incorrect password. Access denied.'
          }}
        </p>

        <div class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            class="rounded border border-slate-700 px-3 py-2
                   text-xs text-slate-400 transition
                   hover:bg-slate-900 hover:text-slate-200"
            @click="emit('cancel')"
          >
            {{ locale === 'vi' ? 'Hủy' : 'Cancel' }}
          </button>

          <button
            type="submit"
            class="rounded border border-emerald-700
                   bg-emerald-950/50 px-3 py-2
                   text-xs text-emerald-300 transition
                   hover:bg-emerald-900/60"
          >
            {{ locale === 'vi' ? 'Xác thực' : 'Authenticate' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
