<script setup lang="ts">
import type {
  PersonProfile,
  SupportedLocale,
} from '~/types/games/detective'

const props = defineProps<{
  people: PersonProfile[]
  discoveredEvidenceIds: string[]
  locale: SupportedLocale
}>()

const emit = defineEmits<{
  close: []
}>()

const selectedId = ref<string | null>(null)

const discoveredIds = computed(() =>
  new Set(props.discoveredEvidenceIds),
)

function requirementsMet(ids?: string[]) {
  return (ids ?? []).every(id => discoveredIds.value.has(id))
}

const visiblePeople = computed(() =>
  props.people.filter(person => requirementsMet(person.requiresEvidence)),
)

const selectedPerson = computed(() =>
  visiblePeople.value.find(person => person.id === selectedId.value)
    ?? visiblePeople.value[0]
    ?? null,
)

function text(value: { en: string; vi: string }) {
  return value[props.locale] ?? value.en
}
</script>

<template>
  <div
    class="fixed inset-0 z-[106] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-8"
    role="presentation"
    @click.self="emit('close')"
  >
    <section
      class="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-violet-800/70 bg-slate-950 shadow-[0_0_70px_rgba(139,92,246,0.14)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-profiles-title"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-violet-900/70 bg-violet-950/20 px-5 py-4">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400">
            {{ locale === 'vi' ? 'Hồ sơ nhân sự vụ án' : 'Case personnel file' }}
          </p>
          <h2 id="person-profiles-title" class="mt-1 text-lg font-semibold text-violet-100">
            {{ locale === 'vi' ? 'Những người có liên quan' : 'Persons of interest' }}
          </h2>
          <p class="mt-1 text-xs text-slate-500">
            {{ locale === 'vi'
              ? 'Thông tin trong hồ sơ sẽ được bổ sung khi có bằng chứng xác minh.'
              : 'Profiles gain new verified facts as evidence is discovered.' }}
          </p>
        </div>

        <button
          type="button"
          class="rounded border border-violet-800 px-3 py-1.5 font-mono text-xs text-violet-300 transition hover:bg-violet-950"
          @click="emit('close')"
        >
          [P] {{ locale === 'vi' ? 'Đóng' : 'Close' }}
        </button>
      </header>

      <div class="grid min-h-0 flex-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <nav class="flex gap-2 overflow-x-auto border-b border-slate-800 p-3 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
          <button
            v-for="person in visiblePeople"
            :key="person.id"
            type="button"
            class="min-w-44 rounded-lg border px-3 py-3 text-left transition md:min-w-0"
            :class="selectedPerson?.id === person.id
              ? 'border-violet-500 bg-violet-950/50'
              : 'border-slate-800 bg-black/20 hover:border-violet-800'"
            @click="selectedId = person.id"
          >
            <div class="text-sm font-semibold text-slate-100">{{ person.name }}</div>
            <div class="mt-1 text-[10px] leading-4 text-violet-300">{{ text(person.role) }}</div>
          </button>
        </nav>

        <div v-if="selectedPerson" class="overflow-y-auto p-5 md:p-7">
          <div class="border-b border-slate-800 pb-5">
            <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-500">
              {{ text(selectedPerson.role) }}
            </p>
            <h3 class="mt-1 text-2xl font-semibold text-white">{{ selectedPerson.name }}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-400">{{ text(selectedPerson.summary) }}</p>
          </div>

          <div class="mt-5 space-y-3">
            <template v-for="(detail, index) in selectedPerson.details" :key="index">
              <div
                v-if="requirementsMet(detail.requiresEvidence)"
                class="rounded-lg border border-slate-800 bg-black/25 p-4"
              >
                <div class="font-mono text-[10px] uppercase tracking-wider text-violet-400">
                  {{ text(detail.label) }}
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-300">{{ text(detail.value) }}</p>
              </div>
              <div v-else class="rounded-lg border border-dashed border-slate-800 bg-black/10 p-4">
                <div class="font-mono text-[10px] uppercase tracking-wider text-slate-600">
                  {{ locale === 'vi' ? 'Thông tin chưa được xác minh' : 'Unverified information' }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
