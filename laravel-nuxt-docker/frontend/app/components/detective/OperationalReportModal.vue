<script setup lang="ts">
import type {
  ScenarioOperationalReport,
  SupportedLocale,
} from '~/types/games/detective'

const props = defineProps<{
  locale: SupportedLocale
  report: ScenarioOperationalReport
  success?: boolean
  score?: number
  rank?: string
  elapsedSeconds?: number
  hintHistory?: Array<{ level: number }>
  commandCount?: number
  incorrectLinkAttempts?: number
  evidenceCount?: number
  taskCount?: number
}>()

const formattedTime = computed(() => {
  const seconds = props.elapsedSeconds ?? 0
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':')
})

function hintsAtLevel(level: number) {
  return props.hintHistory?.filter(item => item.level === level).length ?? 0
}

const emit = defineEmits<{
  close: []
  confirm: []
}>()

type ReportField =
  | 'suspect'
  | 'vehicle'
  | 'target'
  | 'victim'

const form = reactive<Record<ReportField, string>>({
  suspect: '',
  vehicle: '',
  target: '',
  victim: '',
})

const invalidFields = ref<ReportField[]>([])

function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function isCorrect(field: ReportField): boolean {
  const answer = normalizeAnswer(form[field])

  return props.report.answers[field].some(
    accepted => normalizeAnswer(accepted) === answer,
  )
}

function submit() {
  const fields: ReportField[] = [
    'suspect',
    'vehicle',
    'target',
    'victim',
  ]

  invalidFields.value = fields.filter(
    field => !isCorrect(field),
  )

  if (!invalidFields.value.length) {
    emit('confirm')
  }
}

function fieldInvalid(field: ReportField): boolean {
  return invalidFields.value.includes(field)
}
</script>

<template>
  <div
    class="fixed inset-0 z-[120] flex items-center
           justify-center bg-black/85 p-4 backdrop-blur-sm"
    role="presentation"
    @click.self="emit('close')"
  >
    <section
      v-if="success"
      class="w-full max-w-xl overflow-hidden rounded-xl
             border border-emerald-600/80 bg-slate-950
             shadow-2xl shadow-emerald-950/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deployment-success-title"
    >
      <div
        class="border-b border-emerald-900/70
               bg-emerald-950/40 px-6 py-5 text-center"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center
                 justify-center rounded-full border-2
                 border-emerald-500 bg-emerald-950
                 font-mono text-2xl text-emerald-300"
        >
          ✓
        </div>

        <h2
          id="deployment-success-title"
          class="mt-4 font-mono text-lg font-bold
                 uppercase tracking-[0.12em]
                 text-emerald-300"
        >
          {{
            locale === 'vi'
              ? 'Triển khai thành công'
              : 'Deployment successful'
          }}
        </h2>
      </div>

      <div class="space-y-4 px-6 py-6 text-center">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded border border-emerald-800 bg-black/40 p-3">
            <div class="text-[9px] uppercase text-emerald-600">{{ locale === 'vi' ? 'Xếp hạng' : 'Rank' }}</div>
            <div class="mt-1 text-3xl font-black text-emerald-300">{{ rank ?? 'C' }}</div>
          </div>
          <div class="rounded border border-cyan-900 bg-black/40 p-3">
            <div class="text-[9px] uppercase text-cyan-600">{{ locale === 'vi' ? 'Điểm' : 'Score' }}</div>
            <div class="mt-1 text-lg font-bold text-cyan-300">{{ score ?? 0 }}/100</div>
          </div>
          <div class="rounded border border-slate-800 bg-black/40 p-3">
            <div class="text-[9px] uppercase text-slate-500">{{ locale === 'vi' ? 'Thời gian' : 'Time' }}</div>
            <div class="mt-1 text-sm text-slate-200">{{ formattedTime }}</div>
          </div>
          <div class="rounded border border-amber-900 bg-black/40 p-3">
            <div class="text-[9px] uppercase text-amber-600">Commands</div>
            <div class="mt-1 text-lg text-amber-300">{{ commandCount ?? 0 }}</div>
          </div>
        </div>

        <div class="rounded border border-slate-800 bg-black/30 px-4 py-3 font-mono text-[10px] text-slate-300">
          HINT L1: {{ hintsAtLevel(1) }} · L2: {{ hintsAtLevel(2) }} · L3: {{ hintsAtLevel(3) }} ·
          {{ locale === 'vi' ? 'NỐI SAI' : 'WRONG LINKS' }}: {{ incorrectLinkAttempts ?? 0 }} ·
          EVIDENCE: {{ evidenceCount ?? 0 }} · TASK: {{ taskCount ?? 0 }}
        </div>
        <p class="text-sm font-semibold text-slate-100">
          {{
            locale === 'vi'
              ? 'Bạn đã hoàn thành công việc điều tra được giao.'
              : 'You have completed your assigned investigation.'
          }}
        </p>

        <p class="text-xs leading-6 text-slate-300">
          {{
            locale === 'vi'
              ? 'Các kết luận trong hồ sơ tác chiến khớp với toàn bộ bằng chứng đã thu thập. Hồ sơ đã được phê duyệt và đội TAC-6 đang được triển khai tới mục tiêu.'
              : 'The operational conclusions match the collected evidence. The dossier has been approved and TAC-6 is now deploying to the target.'
          }}
        </p>

        <div
          class="rounded-md border border-emerald-900/70
                 bg-emerald-950/25 px-4 py-3
                 font-mono text-[10px] leading-5
                 text-emerald-200"
        >
          {{
            locale === 'vi'
              ? 'TRẠNG THÁI: HỒ SƠ ĐÃ PHÊ DUYỆT — ĐỘI TAC-6 ĐÃ XUẤT PHÁT'
              : 'STATUS: DOSSIER APPROVED — TAC-6 DISPATCHED'
          }}
        </div>
      </div>

      <footer
        class="flex justify-center border-t
               border-slate-800 px-6 py-4"
      >
        <button
          type="button"
          class="rounded border border-emerald-600
                 bg-emerald-950/50 px-6 py-2.5
                 text-xs font-semibold text-emerald-300
                 transition hover:bg-emerald-900/60"
          @click="emit('close')"
        >
          {{ locale === 'vi' ? 'Hoàn tất' : 'Finish' }}
        </button>
      </footer>
    </section>

    <form
      v-else
      class="max-h-[92vh] w-full max-w-3xl overflow-y-auto
             rounded-xl border border-cyan-800/80
             bg-slate-950 shadow-2xl shadow-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operational-report-title"
      @submit.prevent="submit"
    >
      <header class="flex items-start justify-between gap-4
                     border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div>
          <h2 id="operational-report-title"
              class="font-mono text-sm font-bold text-cyan-300">
            {{ locale === 'vi' ? 'HỒ SƠ TÁC CHIẾN — ĐÃ ĐỦ CĂN CỨ' : 'OPERATIONAL DOSSIER — PROBABLE CAUSE ESTABLISHED' }}
          </h2>
          <p class="mt-1 text-[10px] text-slate-400">
            {{ locale === 'vi' ? 'Điền kết luận dựa trên các bằng chứng đã thu thập.' : 'Complete the conclusions using the evidence you collected.' }}
          </p>
        </div>
        <button type="button" class="font-mono text-lg text-slate-400 hover:text-white"
                :aria-label="locale === 'vi' ? 'Đóng' : 'Close'" @click="emit('close')">×</button>
      </header>

      <div class="space-y-4 p-5 font-mono text-xs leading-6 text-slate-200">
        <label class="block">
          <span>{{ locale === 'vi' ? 'Nghi phạm:' : 'Suspect:' }}</span>
          <input v-model="form.suspect" type="text" autocomplete="off"
                 autofocus
                 :aria-invalid="fieldInvalid('suspect')"
                 class="ml-2 min-w-[240px] rounded border bg-slate-900 px-2 py-1 text-cyan-200 outline-none"
                 :class="fieldInvalid('suspect') ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'">
        </label>

        <label class="block">
          <span>{{ locale === 'vi' ? 'Phương tiện: xe mang biển số' : 'Vehicle registration:' }}</span>
          <input v-model="form.vehicle" type="text" autocomplete="off"
                 :aria-invalid="fieldInvalid('vehicle')"
                 class="ml-2 min-w-[200px] rounded border bg-slate-900 px-2 py-1 text-cyan-200 outline-none"
                 :class="fieldInvalid('vehicle') ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'">
        </label>

        <p>{{ locale === 'vi' ? 'Tội danh: giết người, bắt cóc, xâm nhập hệ thống vật chứng và cản trở điều tra' : 'Offenses: homicide, abduction, evidence-system intrusion and obstruction' }}</p>

        <label class="block">
          <span>{{ locale === 'vi' ? 'Mục tiêu:' : 'Target:' }}</span>
          <input v-model="form.target" type="text" autocomplete="off"
                 :aria-invalid="fieldInvalid('target')"
                 class="mx-2 min-w-[260px] rounded border bg-slate-900 px-2 py-1 text-cyan-200 outline-none"
                 :class="fieldInvalid('target') ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'">
          <span>{{ locale === 'vi' ? ', cửa bốc hàng phía đông' : ', east loading bay' }}</span>
        </label>

        <label class="block">
          <span>{{ locale === 'vi' ? 'Nạn nhân cần giải cứu:' : 'Victim to rescue:' }}</span>
          <input v-model="form.victim" type="text" autocomplete="off"
                 :aria-invalid="fieldInvalid('victim')"
                 class="mx-2 min-w-[220px] rounded border bg-slate-900 px-2 py-1 text-cyan-200 outline-none"
                 :class="fieldInvalid('victim') ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'">
          <span>{{ locale === 'vi' ? '; hướng phát tín hiệu khẩn cấp phù hợp với khu văn phòng bên trong kho' : '; emergency bearings match the office inside the warehouse' }}</span>
        </label>

        <p>{{ locale === 'vi' ? 'Rủi ro: Mercer từng là cảnh sát và hiểu hệ thống vô tuyến, do đó có thể nghe lén các kênh liên lạc không mã hóa.' : 'Risk: Mercer is a former officer with radio expertise and may monitor unencrypted channels.' }}</p>
        <p>{{ locale === 'vi' ? 'Chỉ thị: đội TAC-6 dùng kênh mã hóa; tổ y tế chờ ở phía nam; khi bắt giữ phải bảo toàn bộ máy tính FIELDKIT-MERCER và ổ đĩa ORPHEUS làm vật chứng.' : 'Instruction: TAC-6 uses an encrypted channel; medical team stages south; preserve FIELDKIT-MERCER and the ORPHEUS drive.' }}</p>
        <p>{{ locale === 'vi' ? 'TRẠNG THÁI: CHỜ ĐIỀU TRA VIÊN PHÊ CHUẨN' : 'STATUS: AWAITING INVESTIGATOR APPROVAL' }}</p>

        <p v-if="invalidFields.length" role="alert" class="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-red-300">
          {{ locale === 'vi' ? 'Một hoặc nhiều kết luận chưa khớp với bằng chứng đã thu thập. Hãy kiểm tra lại các trường màu đỏ.' : 'One or more conclusions do not match the collected evidence. Review the fields marked in red.' }}
        </p>
      </div>

      <footer class="flex justify-end gap-3 border-t border-slate-800 px-5 py-4">
        <button type="button" class="rounded border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800" @click="emit('close')">
          {{ locale === 'vi' ? 'Hủy' : 'Cancel' }}
        </button>
        <button type="submit" class="rounded border border-emerald-600 bg-emerald-950/50 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60">
          {{ locale === 'vi' ? 'Đồng ý và triển khai' : 'Approve and deploy' }}
        </button>
      </footer>
    </form>
  </div>
</template>
