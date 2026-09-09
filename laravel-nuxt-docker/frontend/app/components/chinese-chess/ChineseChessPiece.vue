<script setup lang="ts">
import type { ChineseChessPiece } from '~/types/games/chinese-chess'

defineProps<{
  piece: ChineseChessPiece
  selected?: boolean
}>()
</script>

<template>
  <div
    class="
      relative
      flex
      aspect-square
      w-[82%]
      items-center
      justify-center
      rounded-full
      border-2
      bg-[#f4dfb0]
      font-serif
      text-3xl
      font-bold
      shadow-md
      transition
      duration-150
      select-none
    "
    :class="[
      piece.color === 'red'
        ? 'border-red-700 text-red-700'
        : 'border-black text-black',

      selected
        ? 'scale-110 ring-4 ring-yellow-400'
        : '',
    ]"
  >
    <span v-if="piece.type === 'general'">
      {{ piece.color === 'red' ? '帥' : '將' }}
    </span>

    <span v-else-if="piece.type === 'advisor'">
      {{ piece.color === 'red' ? '仕' : '士' }}
    </span>

    <span v-else-if="piece.type === 'elephant'">
      {{ piece.color === 'red' ? '相' : '象' }}
    </span>

    <span v-else-if="piece.type === 'horse'">
      馬
    </span>

    <span v-else-if="piece.type === 'chariot'">
      車
    </span>

    <span v-else-if="piece.type === 'cannon'">
      炮
    </span>

    <span v-else-if="piece.type === 'soldier'">
      {{ piece.color === 'red' ? '兵' : '卒' }}
    </span>
  </div>
</template>