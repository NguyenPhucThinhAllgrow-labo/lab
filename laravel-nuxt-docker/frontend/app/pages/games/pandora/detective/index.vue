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
  <main class="hacker-screen relative min-h-screen overflow-hidden bg-[#030807] px-4 py-6 font-mono text-emerald-200 sm:px-6 lg:px-10">

    <div class="pointer-events-none absolute inset-0 hacker-grid" />
    <div class="pointer-events-none absolute inset-0 scanlines opacity-25" />

    <div class="relative mx-auto max-w-7xl">
      <header class="overflow-hidden border border-emerald-900/80 bg-black/75 shadow-[0_0_50px_rgba(16,185,129,0.08)]">
        <div class="flex items-center justify-between border-b border-emerald-950 bg-emerald-950/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-600">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            PANDORA // FORENSIC NETWORK
          </div>
        </div>

        <div class="grid gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_280px] md:px-8 md:py-10">
          <div>
            <p class="mb-3 text-xs uppercase tracking-[0.35em] text-emerald-500">
              root@pandora:~/detective$
            </p>
            <h1 class="text-3xl font-bold uppercase tracking-tight text-emerald-100 sm:text-5xl">
              Case Access Terminal<span class="cursor-blink text-emerald-400">_</span>
            </h1>
            <p class="mt-5 max-w-2xl text-sm leading-7 text-emerald-700 sm:text-base">
              Authorized forensic workspace. Select an encrypted case file to initialize the investigation environment.
            </p>
          </div>

          <div class="border-l-2 border-emerald-900/70 pl-5 text-[11px] leading-6 text-emerald-700">
            <div class="flex justify-between gap-4"><span>NETWORK</span><span class="text-emerald-400">ONLINE</span></div>
            <div class="flex justify-between gap-4"><span>DATABASE</span><span class="text-emerald-400">CONNECTED</span></div>
            <div class="flex justify-between gap-4"><span>CLEARANCE</span><span class="text-amber-400">LEVEL 04</span></div>
            <div class="mt-3 border-t border-emerald-950 pt-3 text-emerald-800">
              {{ String(cases.length).padStart(2, '0') }} CASE FILES INDEXED
            </div>
          </div>
        </div>
      </header>

      <section class="mt-5 border border-emerald-950/90 bg-black/65 p-3 sm:p-5">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950 pb-3 text-[10px] uppercase tracking-[0.18em]">
          <span class="text-emerald-500">/secure/case_registry</span>
          <span class="text-emerald-800">Click file to decrypt and mount</span>
        </div>

        <div v-if="loading" class="flex min-h-64 items-center justify-center border border-dashed border-emerald-900/60 bg-emerald-950/5 text-xs text-emerald-600">
          <span class="mr-3 animate-pulse text-emerald-300">[•••]</span>
          QUERYING SECURE CASE DATABASE...
        </div>

        <div v-else-if="loadError" class="flex min-h-64 flex-col items-center justify-center border border-red-900/60 bg-red-950/10 p-8 text-center">
          <p class="text-xs tracking-wider text-red-400">[ CONNECTION_REFUSED ] CASE DATABASE UNREACHABLE</p>
          <button type="button" class="mt-5 border border-red-700 bg-red-950/30 px-5 py-2 text-xs text-red-300 transition hover:bg-red-900/40" @click="loadCases">
            &gt; RETRY_CONNECTION
          </button>
        </div>

        <div v-else-if="cases.length === 0" class="flex min-h-64 items-center justify-center border border-dashed border-emerald-950 text-xs text-emerald-800">
          [ EMPTY_REGISTRY ] NO CASE FILES FOUND
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="(item, index) in cases"
            :key="item.id"
            type="button"
            class="case-file group relative min-h-64 overflow-hidden border border-emerald-900/60 bg-[#050d0a]/90 p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-950/20 hover:shadow-[0_0_30px_rgba(52,211,153,0.12)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
            @click="selectCase(item.id)"
          >
            <span class="case-border-runner" aria-hidden="true" />

            <span class="absolute right-3 top-2 text-5xl font-bold text-emerald-950/70 transition group-hover:text-emerald-900/60">
              {{ String(index + 1).padStart(2, '0') }}
            </span>

            <div class="relative flex h-full flex-col">
              <div class="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-600">
                <span class="h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                {{ item.id }}.enc
              </div>

              <div class="my-5 h-px bg-gradient-to-r from-emerald-700/70 to-transparent" />

              <h2 class="pr-8 text-lg font-bold uppercase leading-7 tracking-wide text-emerald-100 transition group-hover:text-white">
                {{ item.title }}
              </h2>
              <p class="mt-3 flex-1 text-xs leading-6 text-emerald-700 transition group-hover:text-emerald-500">
                {{ item.description }}
              </p>

              <div class="mt-6 flex items-center justify-between border-t border-emerald-950 pt-4 text-[10px] uppercase tracking-wider">
                <span class="text-amber-500/80">CLASSIFIED</span>
                <span class="text-emerald-500 transition group-hover:text-emerald-200">
                  [ OPEN_CASE ] <span class="inline-block transition group-hover:translate-x-1">&gt;</span>
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>

      <footer class="mt-4 flex flex-wrap justify-between gap-2 px-1 text-[9px] uppercase tracking-[0.2em] text-emerald-900">
        <span>Unauthorized access is monitored and logged</span>
        <span>Pandora OS // Build 4.7.12</span>
      </footer>
    </div>
  </main>
</template>

<style scoped src="~/assets/css/pages/games/pandora/detective/index.css"></style>
