<script setup lang="ts">
import type {
  Evidence,
  ScenarioTimelineEvent,
  SupportedLocale,
} from '~/types/games/detective'

const props = defineProps<{
  events: ScenarioTimelineEvent[]
  evidence: Evidence[]
  totalEvents: number
  locale: SupportedLocale
}>()

const emit = defineEmits<{
  close: []
}>()

const sortedEvents = computed(() =>
  props.events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const timeDifference = timeValue(left.event.time) - timeValue(right.event.time)
      return timeDifference || left.index - right.index
    })
    .map(item => item.event),
)

const remainingEvents = computed(() =>
  Math.max(0, props.totalEvents - props.events.length),
)

const progressPercent = computed(() => {
  if (!props.totalEvents) return 0
  return Math.round((props.events.length / props.totalEvents) * 100)
})

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

function timeValue(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return Number.MAX_SAFE_INTEGER

  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0)
}

function evidenceBasis(event: ScenarioTimelineEvent) {
  const requiredIds = event.requiresEvidence ?? []

  return requiredIds
    .map(id => props.evidence.find(item => item.id === id))
    .filter((item): item is Evidence => Boolean(item))
    .map(item => text(item.title))
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

        <button
          type="button"
          class="rounded border border-cyan-800 px-3 py-1.5
                 font-mono text-xs text-cyan-300 transition
                 hover:bg-cyan-950"
          @click="emit('close')"
        >
          [M] {{ locale === 'vi' ? 'Đóng' : 'Close' }}
        </button>
      </header>

      <div class="shrink-0 border-b border-slate-800 bg-black/25 px-5 py-3 md:px-8">
        <div class="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider">
          <span class="text-cyan-400">
            {{ locale === 'vi' ? 'Tiến độ tái dựng' : 'Reconstruction progress' }} · {{ progressPercent }}%
          </span>
          <span class="text-slate-500">
            {{ remainingEvents }} {{ locale === 'vi' ? 'mốc chưa xác minh' : 'unverified events' }}
          </span>
        </div>
        <div class="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            class="h-full rounded-full bg-cyan-500 transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          {{
            locale === 'vi'
              ? 'Các giờ bên dưới là thời điểm sự kiện xảy ra trong vụ án, không phải lúc bạn tìm thấy bằng chứng. Mốc mới chỉ xuất hiện sau khi có đủ căn cứ xác minh.'
              : 'Times below show when events occurred in the case, not when you discovered the evidence. A new event appears only after its supporting evidence is verified.'
          }}
        </p>
      </div>

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
            v-for="(event, index) in sortedEvents"
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
              <div
                v-if="evidenceBasis(event).length"
                class="mt-3 border-t border-slate-800 pt-3 font-mono text-[10px] leading-5 text-slate-500"
              >
                <span class="text-cyan-600">
                  {{ locale === 'vi' ? 'Căn cứ xác minh:' : 'Verified by:' }}
                </span>
                {{ evidenceBasis(event).join(' · ') }}
              </div>
              <div
                v-else-if="event.requiresGameCompletion"
                class="mt-3 border-t border-slate-800 pt-3 font-mono text-[10px] text-emerald-600"
              >
                {{ locale === 'vi' ? 'Kết quả triển khai tác chiến' : 'Operational deployment result' }}
              </div>
            </article>
          </li>
        </ol>
      </div>

      <footer
        class="flex shrink-0 flex-wrap gap-x-5 gap-y-2
               border-t border-slate-800 px-5 py-3
               font-mono text-[10px] text-slate-500"
      >
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500" />{{ locale === 'vi' ? 'Bối cảnh trước vụ án' : 'Case background' }}</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />{{ locale === 'vi' ? 'Hành vi tại hiện trường' : 'Incident action' }}</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />{{ locale === 'vi' ? 'Di chuyển và dấu vết' : 'Movement and trace' }}</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />{{ locale === 'vi' ? 'Ứng phó của cảnh sát' : 'Police response' }}</span>
      </footer>
    </section>
  </div>
</template>
