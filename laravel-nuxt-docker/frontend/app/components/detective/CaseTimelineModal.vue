<script setup lang="ts">
import type {
  ScenarioTimelineEvent,
  SupportedLocale,
} from '~/types/games/detective'

const props = defineProps<{
  events: ScenarioTimelineEvent[]
  totalEvents: number
  locale: SupportedLocale
}>()

const emit = defineEmits<{
  close: []
  'change-locale': [locale: SupportedLocale]
}>()

const languages: SupportedLocale[] = ['en', 'vi']

function text(value: { en: string; vi: string }) {
  return value[props.locale] ?? value.en
}

function markerClass(category?: ScenarioTimelineEvent['category']) {
  return {
    before: 'border-slate-500 bg-slate-900 text-slate-300',
    incident: 'border-red-500 bg-red-950 text-red-300',
    trace: 'border-amber-500 bg-amber-950 text-amber-300',
    response: 'border-emerald-500 bg-emerald-950 text-emerald-300',
  }[category ?? 'trace']
}
</script>

<template>
  <div
    class="fixed inset-0 z-[105] flex items-center justify-center
           bg-black/85 p-4 backdrop-blur-sm md:p-8"
    role="presentation"
    @click.self="emit('close')"
  >
    <section
      class="flex max-h-[90vh] w-full max-w-4xl flex-col
             overflow-hidden rounded-xl border border-cyan-800/70
             bg-slate-950 shadow-[0_0_70px_rgba(6,182,212,0.15)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-timeline-title"
    >
      <header
        class="flex shrink-0 items-center justify-between gap-4
               border-b border-cyan-900/70 bg-cyan-950/25 px-5 py-4"
      >
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-500">
            {{ locale === 'vi' ? 'Hồ sơ diễn biến' : 'Event reconstruction' }}
          </p>
          <h2 id="case-timeline-title" class="mt-1 text-lg font-semibold text-cyan-100">
            {{ locale === 'vi' ? 'Dòng thời gian vụ án' : 'Case timeline' }}
          </h2>
          <p class="mt-1 font-mono text-[10px] text-slate-500">
            {{ events.length }}/{{ totalEvents }}
            {{ locale === 'vi' ? 'sự kiện đã tái dựng' : 'events reconstructed' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex overflow-hidden rounded border border-slate-700
                   bg-black/40 font-mono text-[10px]"
            :aria-label="locale === 'vi' ? 'Chọn ngôn ngữ' : 'Select language'"
          >
            <button
              v-for="language in languages"
              :key="language"
              type="button"
              class="px-2.5 py-1.5 uppercase transition"
              :class="locale === language
                ? 'bg-cyan-800 text-white'
                : 'text-slate-500 hover:bg-slate-900 hover:text-cyan-300'"
              :aria-pressed="locale === language"
              @click="emit('change-locale', language)"
            >
              {{ language }}
            </button>
          </div>

          <button
            type="button"
            class="rounded border border-cyan-800 px-3 py-1.5
                   font-mono text-xs text-cyan-300 transition
                   hover:bg-cyan-950"
            @click="emit('close')"
          >
            [M] {{ locale === 'vi' ? 'Đóng' : 'Close' }}
          </button>
        </div>
      </header>

      <div class="timeline-scrollbar overflow-y-auto px-5 py-6 md:px-8">
        <div
          v-if="!events.length"
          class="rounded-lg border border-dashed border-slate-700
                 bg-black/20 px-5 py-12 text-center"
        >
          <p class="font-mono text-sm text-slate-400">
            {{ locale === 'vi' ? 'CHƯA ĐỦ DỮ LIỆU' : 'INSUFFICIENT DATA' }}
          </p>
          <p class="mt-2 text-xs text-slate-500">
            {{
              locale === 'vi'
                ? 'Khám phá thêm bằng chứng để tái dựng dòng sự kiện.'
                : 'Discover more evidence to reconstruct the event timeline.'
            }}
          </p>
        </div>

        <ol v-else class="relative ml-8 border-l border-slate-700/80">
          <li
            v-for="(event, index) in events"
            :key="`${event.time}-${index}`"
            class="relative pb-7 pl-9 last:pb-0"
          >
            <span
              class="absolute -left-[27px] top-0 flex h-14 w-14
                     items-center justify-center rounded-full border
                     font-mono text-xs font-bold shadow-lg"
              :class="markerClass(event.category)"
            >
              {{ event.time }}
            </span>

            <article class="rounded-lg border border-slate-800 bg-black/30 p-4">
              <h3 class="text-sm font-semibold text-slate-100">
                {{ text(event.title) }}
              </h3>
              <p class="mt-2 text-xs leading-5 text-slate-400">
                {{ text(event.description) }}
              </p>
            </article>
          </li>
        </ol>
      </div>

      <footer
        class="flex shrink-0 flex-wrap gap-x-5 gap-y-2
               border-t border-slate-800 px-5 py-3
               font-mono text-[10px] text-slate-500"
      >
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500" />{{ locale === 'vi' ? 'Trước sự việc' : 'Before' }}</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />{{ locale === 'vi' ? 'Sự việc' : 'Incident' }}</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />{{ locale === 'vi' ? 'Dấu vết' : 'Trace' }}</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />{{ locale === 'vi' ? 'Phản ứng' : 'Response' }}</span>
      </footer>
    </section>
  </div>
</template>
