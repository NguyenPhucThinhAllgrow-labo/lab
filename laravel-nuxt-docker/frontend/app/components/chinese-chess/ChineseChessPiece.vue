<script setup lang="ts">
import type { ChineseChessPiece } from '~/types/games/chinese-chess'

defineProps<{
  piece: ChineseChessPiece
  selected?: boolean
}>()
</script>

<template>
  <div
    class="chess-piece"
    :class="{
      'chess-piece--red': piece.color === 'red',
      'chess-piece--black': piece.color === 'black',
      'is-selected': selected,
    }"
  >
    <span
      v-if="piece.type === 'general'"
      class="chess-piece__symbol"
    >
      {{ piece.color === 'red' ? '帥' : '將' }}
    </span>

    <span
      v-else-if="piece.type === 'advisor'"
      class="chess-piece__symbol"
    >
      {{ piece.color === 'red' ? '仕' : '士' }}
    </span>

    <span
      v-else-if="piece.type === 'elephant'"
      class="chess-piece__symbol"
    >
      {{ piece.color === 'red' ? '相' : '象' }}
    </span>

    <span
      v-else-if="piece.type === 'horse'"
      class="chess-piece__symbol"
    >
      馬
    </span>

    <span
      v-else-if="piece.type === 'chariot'"
      class="chess-piece__symbol"
    >
      車
    </span>

    <span
      v-else-if="piece.type === 'cannon'"
      class="chess-piece__symbol"
    >
      炮
    </span>

    <span
      v-else-if="piece.type === 'soldier'"
      class="chess-piece__symbol"
    >
      {{ piece.color === 'red' ? '兵' : '卒' }}
    </span>
  </div>
</template>

<style scoped>
.chess-piece {
  position: relative;
  display: flex;
  width: 82%;
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: clamp(1px, 0.32vw, 3px) solid #85562d;
  border-radius: 9999px;
  background:
    radial-gradient(circle at 35% 24%, rgb(255 253 232 / 58%) 0 7%, transparent 21%),
    radial-gradient(circle at 50% 43%, #f8e8b9 0 58%, #dfbd7a 80%, #b77b3f 100%);
  box-shadow:
    0 clamp(2px, 0.42vw, 4px) 0 #75451f,
    0 clamp(3px, 0.65vw, 7px) clamp(4px, 0.8vw, 8px) rgb(48 25 8 / 27%),
    inset 0 clamp(1px, 0.3vw, 3px) clamp(2px, 0.45vw, 4px) rgb(255 252 224 / 68%),
    inset 0 -3px 5px rgb(112 62 22 / 24%);
  font-family: "Noto Serif CJK SC", "Noto Serif SC", "Songti SC", "KaiTi", "Microsoft YaHei", serif;
  font-size: clamp(1.04rem, 4.55vw, 2rem);
  font-weight: 900;
  line-height: 1;
  transition: transform 150ms ease, filter 150ms ease;
  user-select: none;
  isolation: isolate;
}

.chess-piece::after {
  position: absolute;
  top: 8%;
  left: 22%;
  width: 34%;
  height: 12%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgb(255 255 255 / 34%), transparent);
  content: "";
  filter: blur(0.5px);
  pointer-events: none;
  transform: rotate(-18deg);
}

.chess-piece--red {
  --piece-symbol-shadow: rgb(74 10 7 / 34%);
  color: #981711;
}

.chess-piece--black {
  --piece-symbol-shadow: rgb(0 0 0 / 36%);
  color: #17130e;
}

.chess-piece__symbol {
  position: relative;
  z-index: 1;
  transform: translateY(-1px);
  -webkit-text-stroke: 0.15px currentcolor;
  text-shadow:
    0 -1px 0 rgb(255 250 224 / 62%),
    0 1px 1px var(--piece-symbol-shadow);
}

.chess-piece.is-selected {
  z-index: 2;
  transform: translateY(-3px) scale(1.1);
  filter: brightness(1.06) saturate(1.08);
  box-shadow:
    0 4px 0 #75451f,
    0 7px 12px rgb(48 25 8 / 34%),
    0 0 0 3px #facc15,
    0 0 12px 3px rgb(250 204 21 / 42%),
    inset 0 3px 4px rgb(255 249 215 / 76%),
    inset 0 -3px 5px rgb(112 62 22 / 26%);
}

@media (hover: hover) {
  .chess-piece:hover {
    filter: brightness(1.04);
    transform: translateY(-2px);
  }

  .chess-piece.is-selected:hover {
    transform: translateY(-3px) scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .chess-piece {
    transition: none;
  }
}
</style>
