<script setup lang="ts">
/*
 * --------------------------------------------------
 * CASES
 * --------------------------------------------------
 */

const cases = [
  {
    id: 'case001',
    title: 'Case 001',
    description: 'The first investigation.',
  },
  {
    id: 'case002',
    title: 'Case 002',
    description: 'A new mystery begins.',
  },
  {
    id: 'case003',
    title: 'Case 003',
    description: 'An investigation with new evidence.',
  },
]

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