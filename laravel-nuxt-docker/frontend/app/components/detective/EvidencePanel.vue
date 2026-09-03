<script setup lang="ts">
import type {
  SupportedLocale,
  Evidence,
  FileNode,
} from '~/types/games/detective'

const props = defineProps<{
  evidence: Evidence[]

  filesystem: FileNode[]

  locale: SupportedLocale

  expanded?: boolean

  grouped?: boolean

  verifiedEvidenceIds: string[]

  selectedEvidenceIds: string[]

  rejectedEvidenceIds?: string[]

  linkingMode?: boolean
}>()

const emit = defineEmits<{
  toggleExpand: []
  selectEvidence: [evidenceId: string]
}>()

const expandedEvidenceIds = ref<string[]>([])

function getText(
  value: {
    en: string
    vi: string
  },
) {
  return (
    value[
      props.locale
    ] ?? value.en
  )
}

const discovered =
  computed(() =>
    props.evidence.filter(
      evidence =>
        evidence.discovered,
    ),
  )

const availableHints =
  computed(() =>
    props.evidence.filter(
      evidence => {
        if (
          evidence.discovered
        ) {
          return false
        }

        if (
          !evidence.requiresEvidence
            ?.length
        ) {
          return true
        }

        return evidence.requiresEvidence.every(
          requiredId =>
            props.evidence.some(
              item =>
                item.id ===
                  requiredId &&
                item.discovered,
            ),
        )
      },
    ),
  )

function getFileNode(
  path: string,
): FileNode | null {
  const parts = path
    .split('/')
    .filter(Boolean)
  let children = props.filesystem
  let current: FileNode | null = null

  for (const part of parts) {
    current = children.find(
      node => node.name === part,
    ) ?? null

    if (!current) {
      return null
    }

    children = current.type === 'directory'
      ? current.children ?? []
      : []
  }

  return current
}

function getFileContent(evidence: Evidence): string {
  const node = getFileNode(
    evidence.discover.path,
  )

  if (!node || node.type !== 'file' || !node.content) {
    return props.locale === 'vi'
      ? 'Không tìm thấy nội dung tệp nguồn.'
      : 'Source file content could not be found.'
  }

  return getText(node.content)
}

function isFileExpanded(evidenceId: string): boolean {
  return expandedEvidenceIds.value.includes(evidenceId)
}

function isVerified(evidenceId: string) {
  return props.verifiedEvidenceIds.includes(evidenceId)
}

function evidenceLabel(item: Evidence) {
  if (isVerified(item.id)) return getText(item.title)

  const index = props.evidence.findIndex(evidence => evidence.id === item.id)
  return `${props.locale === 'vi' ? 'Evidence' : 'Evidence'} ${String(index + 1).padStart(2, '0')}`
}

function toggleFileViewer(item: Evidence) {
  if (isFileExpanded(item.id)) {
    expandedEvidenceIds.value = expandedEvidenceIds.value.filter(
      evidenceId => evidenceId !== item.id,
    )
    return
  }

  expandedEvidenceIds.value = [
    ...expandedEvidenceIds.value,
    item.id,
  ]
}
</script>

<template>
  <section
    class="detective-running-frame rounded-lg
           border
           border-cyan-800/70
           bg-[#03090d]/95
           p-4
           shadow-lg
           shadow-[0_0_30px_rgba(6,182,212,0.08)]"
    :class="
      expanded && !grouped
        ? 'fixed inset-4 z-50 flex flex-col bg-[#03090d] md:inset-8'
        : expanded
          ? 'relative flex h-full min-h-0 flex-col'
          : 'relative'
    "
  >
    <span class="detective-border-runner" aria-hidden="true" />

    <div
      class="mb-4
             flex items-center
             justify-between"
    >
      <div>
        <div
          class="font-mono
                 text-xs
                 uppercase
                 tracking-[0.2em]
                 text-cyan-300"
        >
          Evidence
        </div>

        <div
          class="mt-1
                 text-[10px]
                 text-slate-400"
        >
          Collected evidence
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="font-mono
                 text-[10px]
                 text-cyan-400"
        >
          {{ discovered.length }}
          /
          {{ evidence.length }}
        </div>

        <button
          type="button"
          class="rounded border
                 border-cyan-800/70
                 px-2 py-1
                 font-mono text-[9px]
                 text-cyan-300
                 transition
                 hover:bg-cyan-950/60"
          :title="expanded ? 'Collapse evidence' : 'Expand evidence'"
          @click="emit('toggleExpand')"
        >
          [E] {{ expanded ? '−' : '+' }}
        </button>
      </div>
    </div>

    <!-- DISCOVERED -->

    <div
      v-if="discovered.length"
      class="space-y-2 overflow-y-auto"
      :class="
        expanded
          ? 'min-h-0 flex-1'
          : 'h-[120px]'
      "
    >
      <div
        v-for="item in discovered"
        :key="item.id"
        class="relative rounded-md border p-3 transition"
        :class="rejectedEvidenceIds?.includes(item.id)
          ? 'evidence-rejected border-red-500 bg-red-950/40'
          : selectedEvidenceIds.includes(item.id)
            ? 'evidence-link-selected border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/40'
          : isVerified(item.id)
            ? 'border-green-600/60 bg-green-900/30'
            : 'border-slate-500/70 bg-slate-700/45'"
      >
        <div
          class="flex items-center
                 gap-2"
        >
          <span
            class="font-mono text-xs"
            :class="isVerified(item.id) ? 'text-green-300' : 'text-slate-300'"
          >
            {{ isVerified(item.id) ? '✓' : '?' }}
          </span>

          <span
            class="text-xs font-medium"
            :class="isVerified(item.id) ? 'text-green-300' : 'text-slate-100'"
          >
            {{ evidenceLabel(item) }}
          </span>
        </div>

        <div
          v-if="isVerified(item.id)"
          class="mt-2
                 pl-5
                 text-[10px]
                 leading-5
                 text-slate-200"
        >
          {{ getText(item.description) }}
        </div>

        <div v-else class="mt-2 pl-5 text-[10px] leading-5 text-slate-300">
          {{ locale === 'vi'
            ? 'Evidence chưa được phân loại. Chọn và đối chiếu với nhiệm vụ hiện tại.'
            : 'Unclassified evidence. Select it and compare it with the current task.' }}
        </div>

        <div
          class="mt-2
                 pl-5
                 font-mono
                 text-[9px]
                 text-slate-400"
        >
          SOURCE:
          {{ item.discover.path }}
        </div>

        <div class="mt-3 flex flex-wrap justify-end gap-2 pl-5">
          <button
            type="button"
            class="rounded border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40"
            :class="selectedEvidenceIds.includes(item.id)
              ? 'border-cyan-400 bg-cyan-900/60 text-cyan-100'
              : 'border-slate-500 bg-slate-800/70 text-slate-200 hover:border-cyan-500 hover:text-cyan-300'"
            :disabled="!linkingMode"
            @click="emit('selectEvidence', item.id)"
          >
            {{ !linkingMode
              ? (locale === 'vi' ? 'Mở [Q] + [E]' : 'Open [Q] + [E]')
              : selectedEvidenceIds.includes(item.id)
                ? (locale === 'vi' ? 'Đang chọn' : 'Selected')
                : (locale === 'vi' ? 'Chọn đối chiếu' : 'Select to link') }}
          </button>

          <button
            type="button"
            class="rounded border
                   border-cyan-700/70
                   bg-cyan-950/30
                   px-2.5 py-1.5
                   font-mono text-[9px]
                   uppercase tracking-wider
                   text-cyan-300
                   transition
                   hover:border-cyan-500
                   hover:bg-cyan-900/40"
            :aria-expanded="isFileExpanded(item.id)"
            @click="toggleFileViewer(item)"
          >
            {{
              isFileExpanded(item.id)
                ? (locale === 'vi' ? 'Ẩn file nguồn' : 'Hide source file')
                : (locale === 'vi' ? 'Xem file nguồn' : 'View source file')
            }}
          </button>
        </div>

        <div
          v-if="isFileExpanded(item.id)"
          class="mt-3 overflow-hidden rounded-md
                 border border-cyan-800/70
                 bg-slate-950"
        >
          <div
            class="border-b border-slate-800
                   bg-slate-900 px-3 py-2
                   font-mono text-[9px]
                   text-cyan-300"
          >
            {{ item.discover.path }}
          </div>

          <pre
            class="max-h-72 overflow-auto
                   whitespace-pre-wrap break-words
                   p-3 font-mono text-[10px]
                   leading-5 text-slate-200"
          >{{ getFileContent(item) }}</pre>

          <div
            class="border-t border-slate-800
                   px-3 py-1.5 text-right
                   font-mono text-[8px]
                   text-slate-500"
          >
            {{ locale === 'vi' ? 'Tệp chứng cứ chỉ đọc' : 'Read-only evidence file' }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-md
             border
             border-slate-600
             bg-slate-700/40
             p-4
             text-center
             font-mono
             text-[10px]
             text-slate-300"
    >
      No evidence discovered.
    </div>

    <!-- HINT PREVIEW -->

    <div
      v-if="availableHints.length"
      class="mt-5
             border-t
             border-slate-600
             pt-4"
    >
      <div
        class="mb-3
               font-mono
               text-[10px]
               uppercase
               tracking-[0.2em]
               text-amber-300"
      >
        Available Clues
      </div>

      <div
        class="font-mono
               text-[10px]
               leading-5
               text-slate-300"
      >
        Type
        <span
          class="rounded bg-amber-950/60 px-1.5 py-0.5 text-amber-300"
        >
          hint
        </span>
        in the terminal to receive
        an investigation clue.
      </div>
    </div>

  </section>
</template>

<style scoped src="~/assets/css/components/detective/EvidencePanel.css"></style>
