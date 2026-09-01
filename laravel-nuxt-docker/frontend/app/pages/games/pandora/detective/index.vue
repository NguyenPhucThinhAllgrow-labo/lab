<script setup lang="ts">
import type {
  DetectiveCaseMetadata,
} from '~/composables/useDetectiveApi'

/*
 * --------------------------------------------------
 * CASES
 * --------------------------------------------------
 */

const detectiveApi =
  useDetectiveApi()

const cases =
  ref<DetectiveCaseMetadata[]>([])

const loading = ref(true)
const loadError = ref(false)

async function loadCases() {
  loading.value = true
  loadError.value = false

  try {
    cases.value =
      await detectiveApi.listCases(
        'en',
      )
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadCases()
})

/*
 * --------------------------------------------------
 * ROUTER
 * --------------------------------------------------
 */

const router = useRouter()

function selectCase(
  caseId: string,
) {
  router.push(
    `/games/pandora/detective/${caseId}`,
  )
}
</script>

<template>
  <main
    class="min-h-screen
           bg-zinc-950
           px-6
           py-12
           text-zinc-200"
  >
    <div
      class="mx-auto
             max-w-6xl"
    >
      <!-- ========================================
           HEADER
           ======================================== -->

      <div
        class="mb-10"
      >
        <p
          class="mb-2
                 text-sm
                 uppercase
                 tracking-[0.3em]
                 text-zinc-500"
        >
          Detective Terminal
        </p>

        <h1
          class="text-4xl
                 font-bold
                 text-zinc-100"
        >
          Select a Case
        </h1>

        <p
          class="mt-3
                 max-w-2xl
                 text-zinc-500"
        >
          Choose an investigation to begin.
        </p>
      </div>

      <!-- ========================================
           CASE LIST
           ======================================== -->

      <div
        v-if="loading"
        class="rounded-xl border
               border-zinc-800
               bg-zinc-900 p-10
               text-center font-mono
               text-sm text-zinc-500"
      >
        Loading cases from server...
      </div>

      <div
        v-else-if="loadError"
        class="rounded-xl border
               border-red-900/60
               bg-red-950/20 p-10
               text-center"
      >
        <p class="text-sm text-red-300">
          Could not load detective cases.
        </p>

        <button
          type="button"
          class="mt-4 rounded border
                 border-red-800 px-4 py-2
                 font-mono text-xs
                 text-red-300"
          @click="loadCases"
        >
          RETRY
        </button>
      </div>

      <div
        v-else
        class="grid
               gap-5
               md:grid-cols-2
               lg:grid-cols-3"
      >
        <button
          v-for="item in cases"
          :key="item.id"
          type="button"
          class="group
                 rounded-xl
                 border
                 border-zinc-800
                 bg-zinc-900
                 p-6
                 text-left
                 transition
                 hover:border-zinc-600
                 hover:bg-zinc-900/80"
          @click="
            selectCase(item.id)
          "
        >
          <!-- Case ID -->

          <div
            class="mb-5
                   flex
                   items-center
                   justify-between"
          >
            <span
              class="font-mono
                     text-xs
                     uppercase
                     tracking-wider
                     text-zinc-500"
            >
              {{ item.id }}
            </span>

            <span
              class="text-zinc-600
                     transition
                     group-hover:translate-x-1
                     group-hover:text-zinc-300"
            >
              →
            </span>
          </div>

          <!-- Title -->

          <h2
            class="text-xl
                   font-semibold
                   text-zinc-100"
          >
            {{ item.title }}
          </h2>

          <!-- Description -->

          <p
            class="mt-3
                   text-sm
                   leading-6
                   text-zinc-500"
          >
            {{ item.description }}
          </p>

          <!-- Action -->

          <div
            class="mt-6
                   font-mono
                   text-xs
                   text-zinc-600
                   transition
                   group-hover:text-zinc-400"
          >
            START INVESTIGATION
          </div>
        </button>
      </div>
    </div>
  </main>
</template>
