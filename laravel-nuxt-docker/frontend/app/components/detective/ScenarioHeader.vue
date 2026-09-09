<script setup lang="ts">
defineProps<{
  id: string

  title: string

  description: string
}>()
</script>

<template>
  <header
    class="border-b
           border-emerald-950
           bg-[#020806]/95
           shadow-[0_8px_30px_rgba(16,185,129,0.05)]"
  >
    <div
      class="mx-auto
             flex max-w-[1600px]
             items-center
             justify-between
             px-6 py-5"
    >
      <div>
        <div
          class="font-mono
                 text-[10px]
                 uppercase
                 tracking-[0.3em]
                 text-emerald-400"
        >
          Detective Terminal
        </div>

        <h1
          class="mt-1
                 font-mono
                 text-xl
                 font-semibold
                 text-emerald-50"
        >
          {{ title }}
        </h1>

        <p
          class="mt-2
                 max-w-3xl
                 font-mono
                 text-[11px]
                 leading-5
                 text-emerald-700"
        >
          {{ description }}
        </p>
      </div>

      <div
        class="hidden
               text-right
               sm:block"
      >
        <div
          class="font-mono
                 text-[9px]
                 uppercase
                 tracking-widest
                 text-emerald-700"
        >
          CASE
        </div>

        <div
          class="mt-1
                 font-mono
                 text-sm
                 text-emerald-400"
        >
          {{ id }}
        </div>
      </div>
    </div>
  </header>
</template>
