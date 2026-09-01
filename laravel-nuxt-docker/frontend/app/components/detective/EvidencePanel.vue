<script setup lang="ts">
import type {
    SupportedLocale,
  Evidence,
} from '~/types/games/detective'

const props = defineProps<{
  evidence: Evidence[]

  locale: SupportedLocale
}>()

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
</script>

<template>
  <section
    class="rounded-lg
           border
           border-zinc-800
           bg-zinc-950
           p-4"
  >
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
                 text-zinc-500"
        >
          Evidence
        </div>

        <div
          class="mt-1
                 text-[10px]
                 text-zinc-700"
        >
          Collected evidence
        </div>
      </div>

      <div
        class="font-mono
               text-[10px]
               text-zinc-700"
      >
        {{ discovered.length }}
        /
        {{ evidence.length }}
      </div>
    </div>

    <!-- DISCOVERED -->

    <div
      v-if="discovered.length"
      class="space-y-2 h-[120px] overflow-y-auto"
    >
      <div
        v-for="item in discovered"
        :key="item.id"
        class="rounded-md
               border
               border-green-900/40
               bg-green-950/10
               p-3"
      >
        <div
          class="flex items-center
                 gap-2"
        >
          <span
            class="font-mono
                   text-xs
                   text-green-500"
          >
            ✓
          </span>

          <span
            class="text-xs
                   font-medium
                   text-green-400"
          >
            {{ getText(item.title) }}
          </span>
        </div>

        <div
          class="mt-2
                 pl-5
                 text-[10px]
                 leading-5
                 text-zinc-500"
        >
          {{ getText(item.description) }}
        </div>

        <div
          class="mt-2
                 pl-5
                 font-mono
                 text-[9px]
                 text-zinc-700"
        >
          SOURCE:
          {{ item.discover.path }}
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-md
             border
             border-zinc-900
             bg-black/20
             p-4
             text-center
             font-mono
             text-[10px]
             text-zinc-700"
    >
      No evidence discovered.
    </div>

    <!-- HINT PREVIEW -->

    <div
      v-if="availableHints.length"
      class="mt-5
             border-t
             border-zinc-900
             pt-4"
    >
      <div
        class="mb-3
               font-mono
               text-[10px]
               uppercase
               tracking-[0.2em]
               text-amber-600"
      >
        Available Clues
      </div>

      <div
        class="font-mono
               text-[10px]
               leading-5
               text-zinc-700"
      >
        Type
        <span
          class="text-amber-600"
        >
          hint
        </span>
        in the terminal to receive
        an investigation clue.
      </div>
    </div>
  </section>
</template>