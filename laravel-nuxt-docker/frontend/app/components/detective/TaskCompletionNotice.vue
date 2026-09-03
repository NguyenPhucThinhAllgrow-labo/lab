<script setup lang="ts">
import type {
  SupportedLocale,
  Task,
} from '~/types/games/detective'

const props = defineProps<{
  task: Task
  nextTask?: Task
  locale: SupportedLocale
}>()

const emit = defineEmits<{
  close: []
}>()

function text(value: { en: string; vi: string }) {
  return value[props.locale] ?? value.en
}
</script>

<template>
  <aside
    class="fixed left-1/2 top-1/2 z-[108] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-emerald-600/70 bg-slate-950/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.65)] backdrop-blur"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
          {{ locale === 'vi' ? 'Nhiệm vụ hoàn thành' : 'Task completed' }}
        </p>
        <h2 class="mt-1 text-sm font-semibold text-emerald-100">{{ text(task.title) }}</h2>
      </div>
      <button type="button" class="font-mono text-xs text-slate-500 hover:text-white" @click="emit('close')">✕</button>
    </div>

    <div class="mt-4 rounded-lg border border-emerald-900/70 bg-emerald-950/25 p-3">
      <div class="font-mono text-[9px] uppercase tracking-wider text-emerald-500">
        {{ locale === 'vi' ? 'Kết luận mới' : 'New conclusion' }}
      </div>
      <p class="mt-1.5 text-xs leading-5 text-slate-200">
        {{ text(task.completionSummary ?? task.description) }}
      </p>
    </div>

    <div class="mt-3 rounded-lg border border-cyan-900/70 bg-cyan-950/20 p-3">
      <div class="font-mono text-[9px] uppercase tracking-wider text-cyan-500">
        {{ locale === 'vi' ? 'Đầu mối tiếp theo' : 'Next lead' }}
      </div>
      <p class="mt-1.5 text-xs leading-5 text-slate-300">
        {{ task.nextLead
          ? text(task.nextLead)
          : nextTask
            ? text(nextTask.description)
            : locale === 'vi'
              ? 'Đã hoàn tất các mục tiêu điều tra. Hãy kiểm tra bước kết luận cuối cùng.'
              : 'All investigation objectives are complete. Review the final conclusion step.' }}
      </p>
    </div>
  </aside>
</template>
