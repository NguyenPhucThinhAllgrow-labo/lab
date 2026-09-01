<script setup lang="ts">
import type {
  TerminalLine,
} from '~/types/games/terminal'

const props = defineProps<{
  lines: TerminalLine[]

  currentDirectory: string

  scenarioId: string

  inputValue: string

  commands: string[]

  autocompleteEntries: string[]

  expanded?: boolean
}>()

const emit = defineEmits<{
  execute: [command: string]

  'update:inputValue': [
    value: string,
  ]
}>()

/*
 * ==================================================
 * REFS
 * ==================================================
 */

const terminalRef =
  ref<HTMLElement | null>(null)

const inputRef =
  ref<HTMLInputElement | null>(null)

/*
 * ==================================================
 * HISTORY
 * ==================================================
 */

const localHistory =
  ref<string[]>([])

const historyIndex =
  ref(-1)

/*
 * ==================================================
 * AUTOCOMPLETE
 * ==================================================
 */

const autocompleteIndex =
  ref(0)

const showAutocomplete =
  ref(false)

/*
 * ==================================================
 * INPUT
 * ==================================================
 */

const input = computed({
  get() {
    return props.inputValue
  },

  set(value: string) {
    emit(
      'update:inputValue',
      value,
    )
  },
})

const autocompleteEntries =
  computed(() =>
    props.autocompleteEntries
      .slice(0, 10),
  )

/*
 * ==================================================
 * TYPING ENGINE
 * ==================================================
 *
 * QUAN TRỌNG:
 *
 * Không mutate:
 *
 *     line.text
 *
 * trong mỗi frame.
 *
 * Chỉ reactive:
 *
 *     typingText
 *
 * Sau khi typing hoàn tất,
 * line mới được đưa vào displayedLines.
 */

const displayedLines =
  shallowRef<TerminalLine[]>([])

const typingLine =
  shallowRef<TerminalLine | null>(
    null,
  )

const typingText =
  ref('')

const isTyping =
  ref(false)

const TYPING_SPEED = 0

/*
 * requestAnimationFrame handle
 */

let typingFrame:
  number | null = null

/*
 * Queue output.
 */

let typingQueue:
  TerminalLine[] = []

let processingQueue =
  false

/*
 * ==================================================
 * SCROLL
 * ==================================================
 */

function scrollToBottom() {
  const element =
    terminalRef.value

  if (!element) {
    return
  }

  element.scrollTop =
    element.scrollHeight
}

/*
 * ==================================================
 * FOCUS
 * ==================================================
 */

function focusInput() {
  const element = inputRef.value

  if (!element) {
    return
  }

  element.focus()

  const end = element.value.length

  element.setSelectionRange(
    end,
    end,
  )
}

defineExpose({
  focusInput,
})

/*
 * ==================================================
 * TYPING SPEED
 * ==================================================
 */

function getTypingSpeed(
  line: TerminalLine,
) {
  switch (line.type) {
    /*
     * Command của user:
     * render ngay.
     */

    case 'command':
      return 0

    /*
     * System message:
     * chậm hơn một chút.
     */

    case 'system':
      return 5

    /*
     * Success:
     * nhanh vừa.
     */

    case 'success':
      return 25

    /*
     * Warning.
     */

    case 'warning':
      return 22

    /*
     * Error.
     */

    case 'error':
      return 20

    /*
     * Normal output.
     */

    case 'output':
    default:
      return TYPING_SPEED
  }
}

/*
 * ==================================================
 * TYPE ONE LINE
 * ==================================================
 */

async function typeLine(
  line: TerminalLine,
) {
  const text =
    line.text ?? ''

  const speed =
    getTypingSpeed(line)

  /*
   * ================================================
   * INSTANT LINE
   * ================================================
   *
   * Command hoặc text rỗng.
   */

  if (
    speed <= 0 ||
    text.length === 0
  ) {
    displayedLines.value = [
      ...displayedLines.value,
      line,
    ]

    await nextTick()

    scrollToBottom()

    return
  }

  /*
   * ================================================
   * START TYPING
   * ================================================
   */

  isTyping.value = true

  typingLine.value = line

  typingText.value = ''

  /*
   * ================================================
   * REQUEST ANIMATION FRAME
   * ================================================
   */

  await new Promise<void>(
    resolve => {
      const start =
        performance.now()

      const animate = (
        currentTime: number,
      ) => {
        const elapsed =
          currentTime - start

        /*
         * Tính số character dựa trên
         * thời gian thực.
         */

        const characterCount =
          Math.min(
            Math.floor(
              elapsed / speed,
            ),
            text.length,
          )

        /*
         * CHỈ thay đổi primitive string.
         *
         * Không mutate TerminalLine.
         */

        typingText.value =
          text.slice(
            0,
            characterCount,
          )

        /*
         * Hoàn thành.
         */

        if (
          characterCount >=
          text.length
        ) {
          typingText.value =
            text

          typingFrame = null

          resolve()

          return
        }

        typingFrame =
          requestAnimationFrame(
            animate,
          )
      }

      typingFrame =
        requestAnimationFrame(
          animate,
        )
    },
  )

  /*
   * ================================================
   * TYPING FINISHED
   * ================================================
   */

  displayedLines.value = [
    ...displayedLines.value,
    line,
  ]

  typingLine.value = null

  typingText.value = ''

  isTyping.value = false

  await nextTick()

  scrollToBottom()
}

/*
 * ==================================================
 * PROCESS QUEUE
 * ==================================================
 */

async function processTypingQueue() {
  if (processingQueue) {
    return
  }

  processingQueue = true

  try {
    while (
      typingQueue.length > 0
    ) {
      const line =
        typingQueue.shift()

      if (!line) {
        continue
      }

      await typeLine(line)
    }
  } finally {
    processingQueue = false

    isTyping.value = false
  }
}

/*
 * ==================================================
 * WATCH GAME LINES
 * ==================================================
 */

watch(
  () => props.lines,
  newLines => {
    /*
     * ================================================
     * GAME RESET
     * ================================================
     */

    if (
      newLines.length <
      displayedLines.value.length
    ) {
      /*
       * Cancel animation.
       */

      if (
        typingFrame !== null
      ) {
        cancelAnimationFrame(
          typingFrame,
        )

        typingFrame = null
      }

      /*
       * Clear queue.
       */

      typingQueue = []

      /*
       * Reset UI.
       */

      displayedLines.value = []

      typingLine.value = null

      typingText.value = ''

      isTyping.value = false

      /*
       * Add toàn bộ line mới.
       */

      typingQueue.push(
        ...newLines,
      )

      processTypingQueue()

      return
    }

    /*
     * ================================================
     * DETECT NEW LINES
     * ================================================
     */

    const renderedCount =
      displayedLines.value.length

    /*
     * Nếu đang typing một line,
     * line đó chưa nằm trong
     * displayedLines.
     */

    const pendingTyping =
      typingLine.value
        ? 1
        : 0

    const knownCount =
      renderedCount +
      pendingTyping +
      typingQueue.length

    /*
     * Chỉ lấy line chưa được xử lý.
     */

    const newLinesToQueue =
      newLines.slice(
        knownCount,
      )

    if (
      !newLinesToQueue.length
    ) {
      return
    }

    typingQueue.push(
      ...newLinesToQueue,
    )

    processTypingQueue()
  },
  {
    immediate: true,
    deep: true,
  },
)

/*
 * ==================================================
 * AUTOCOMPLETE WATCHER
 * ==================================================
 *
 * Tự động hiển thị khi input hiện tại
 * có autocomplete entries.
 */

watch(
  () => props.autocompleteEntries,
  entries => {
    autocompleteIndex.value = 0

    showAutocomplete.value =
      Boolean(
        input.value.trim() &&
        entries.length,
      )
  },
  {
    deep: true,
  },
)

/*
 * ==================================================
 * SUBMIT
 * ==================================================
 */

function submit() {
  /*
   * Không cho submit trong lúc
   * terminal đang typing.
   */

  if (isTyping.value) {
    return
  }

  /*
   * input là computed lấy từ prop của component cha. Ở thời điểm
   * keydown Enter chạy, prop có thể chưa kịp nhận input event mới
   * nhất (đặc biệt khi dùng IME), trong khi DOM đã có giá trị đúng.
   */
  const command = (
    inputRef.value?.value ??
    input.value
  ).trim()

  if (!command) {
    return
  }

  /*
   * History.
   */

  localHistory.value = [
    command,

    ...localHistory.value.filter(
      item =>
        item !== command,
    ),
  ]

  historyIndex.value = -1

  /*
   * Hide autocomplete.
   */

  showAutocomplete.value =
    false

  /*
   * Execute.
   */

  emit(
    'execute',
    command,
  )

  /*
   * Clear input.
   */

  input.value = ''

  nextTick(() => {
    focusInput()
  })
}

/*
 * ==================================================
 * HISTORY UP
 * ==================================================
 */

function historyUp() {
  if (
    !localHistory.value.length
  ) {
    return
  }

  if (
    historyIndex.value <
    localHistory.value.length - 1
  ) {
    historyIndex.value++
  }

  input.value =
    localHistory.value[
      historyIndex.value
    ] ?? ''
}

/*
 * ==================================================
 * HISTORY DOWN
 * ==================================================
 */

function historyDown() {
  if (
    historyIndex.value === -1
  ) {
    input.value = ''

    return
  }

  if (
    historyIndex.value > 0
  ) {
    historyIndex.value--

    input.value =
      localHistory.value[
        historyIndex.value
      ] ?? ''

    return
  }

  historyIndex.value = -1

  input.value = ''
}

/*
 * ==================================================
 * AUTOCOMPLETE
 * ==================================================
 */

function autocomplete() {
  const entries =
    autocompleteEntries.value

  if (!entries.length) {
    return
  }

  const selected =
    entries[
      autocompleteIndex.value
    ]

  if (!selected) {
    return
  }

  const current =
    input.value

  /*
   * ================================================
   * COMMAND
   *
   * c<Tab>
   *
   * =>
   * cat
   * ================================================
   */

  if (
    !current.includes(' ')
  ) {
    input.value =
      `${selected} `

    showAutocomplete.value =
      false

    nextTick(() => {
      focusInput()
    })

    return
  }

  /*
   * ================================================
   * ARGUMENT
   *
   * cd<Tab>
   *
   * =>
   * cd logs/
   * ================================================
   */

  const match =
    current.match(
      /^(\S+\s+)(.*)$/,
    )

  if (!match) {
    return
  }

  const prefix =
    match[1] ?? ''

  /*
   * Directory.
   */

  if (
    selected.endsWith('/')
  ) {
    input.value =
      `${prefix}${selected}`
  } else {
    /*
     * File.
     */

    input.value =
      `${prefix}${selected} `
  }

  showAutocomplete.value =
    false

  nextTick(() => {
    focusInput()
  })
}

/*
 * ==================================================
 * TAB
 * ==================================================
 */

function handleTab() {
  const entries =
    autocompleteEntries.value

  if (!entries.length) {
    return
  }

  autocompleteIndex.value = 0

  autocomplete()
}

/*
 * ==================================================
 * AUTOCOMPLETE ARROW
 * ==================================================
 */

function handleAutocompleteArrow(
  direction: number,
) {
  const length =
    autocompleteEntries.value.length

  if (!length) {
    return
  }

  autocompleteIndex.value =
    (
      autocompleteIndex.value +
      direction +
      length
    ) % length
}

/*
 * ==================================================
 * SELECT AUTOCOMPLETE
 * ==================================================
 */

function selectAutocomplete(
  entry: string,
) {
  const current =
    input.value

  const parts =
    current.split(/\s+/)

  if (
    parts.length === 1
  ) {
    input.value =
      `${entry} `

    showAutocomplete.value =
      false

    nextTick(() => {
      focusInput()
    })

    return
  }

  input.value =
    `${parts[0]} ${entry}`

  if (
    !entry.endsWith('/')
  ) {
    input.value += ' '
  }

  showAutocomplete.value =
    false

  nextTick(() => {
    focusInput()
  })
}

/*
 * ==================================================
 * HIGHLIGHT RENDER
 * ==================================================
 */

function renderLineParts(
  line: TerminalLine,
) {
  if (
    !line.highlights?.length
  ) {
    return [
      {
        text: line.text,
        highlight: false,
      },
    ]
  }

  const result: Array<{
    text: string
    highlight: boolean
  }> = []

  let cursor = 0

  for (
    const highlight of
    line.highlights
  ) {
    if (
      highlight.start >
      cursor
    ) {
      result.push({
        text:
          line.text.slice(
            cursor,
            highlight.start,
          ),
        highlight: false,
      })
    }

    result.push({
      text:
        line.text.slice(
          highlight.start,
          highlight.end,
        ),
      highlight: true,
    })

    cursor =
      highlight.end
  }

  if (
    cursor <
    line.text.length
  ) {
    result.push({
      text:
        line.text.slice(
          cursor,
        ),
      highlight: false,
    })
  }

  return result
}

/*
 * ==================================================
 * KEYBOARD
 * ==================================================
 */

function handleKeydown(
  event: KeyboardEvent,
) {
  /*
   * ENTER
   */

  if (
    event.key === 'Enter'
  ) {
    if (event.isComposing) {
      return
    }

    event.preventDefault()

    submit()

    return
  }

  /*
   * ARROW UP
   */

  if (
    event.key === 'ArrowUp'
  ) {
    if (
      showAutocomplete.value
    ) {
      event.preventDefault()

      handleAutocompleteArrow(-1)

      return
    }

    event.preventDefault()

    historyUp()

    return
  }

  /*
   * ARROW DOWN
   */

  if (
    event.key === 'ArrowDown'
  ) {
    if (
      showAutocomplete.value
    ) {
      event.preventDefault()

      handleAutocompleteArrow(1)

      return
    }

    event.preventDefault()

    historyDown()

    return
  }

  /*
   * TAB
   */

  if (
    event.key === 'Tab'
  ) {
    event.preventDefault()

    event.stopPropagation()

    handleTab()

    return
  }

  /*
   * ESCAPE
   */

  if (
    event.key === 'Escape'
  ) {
    event.preventDefault()

    showAutocomplete.value =
      false

    return
  }
}

/*
 * ==================================================
 * UNMOUNT
 * ==================================================
 */

onBeforeUnmount(() => {
  /*
   * Cancel animation frame.
   */

  if (
    typingFrame !== null
  ) {
    cancelAnimationFrame(
      typingFrame,
    )

    typingFrame = null
  }

  /*
   * Clear queue.
   */

  typingQueue = []

  /*
   * Clear state.
   */

  typingLine.value = null

  typingText.value = ''

  isTyping.value = false
})

/*
 * ==================================================
 * MOUNT
 * ==================================================
 */

onMounted(() => {
  focusInput()
})
</script>

<template>
  <div
    ref="terminalRef"
    class="overflow-y-auto
           rounded-t-lg
           border
           border-zinc-800
           bg-black
           p-5
           font-mono
           text-sm
           shadow-2xl
           shadow-black/40"
    :class="
      props.expanded
        ? 'min-h-0 flex-1'
        : 'h-[560px]'
    "
    @click="focusInput"
  >
    <!-- ========================================= -->
    <!-- COMPLETED TERMINAL OUTPUT -->
    <!-- ========================================= -->

    <div
      v-for="(
        line,
        lineIndex
      ) in displayedLines"
      :key="
        line.id ??
        lineIndex
      "
      class="min-h-[20px]
             whitespace-pre-wrap
             leading-5"
      :class="{
        'text-green-500':
          line.type === 'system',

        'text-cyan-400':
          line.type === 'command',

        'text-zinc-300':
          line.type === 'output',

        'text-red-500':
          line.type === 'error',

        'text-yellow-400':
          line.type === 'warning',

        'font-bold text-green-400':
          line.type === 'success',
      }"
    >
      <template
        v-for="(
          part,
          partIndex
        ) in renderLineParts(line)"
        :key="partIndex"
      >
        <mark
          v-if="part.highlight"
          class="rounded
                 bg-yellow-400/25
                 px-1
                 text-yellow-300
                 ring-1
                 ring-yellow-500/50"
        >
          {{ part.text }}
        </mark>

        <span v-else>
          {{ part.text }}
        </span>
      </template>
    </div>

    <!-- ========================================= -->
    <!-- CURRENT TYPING LINE -->
    <!-- ========================================= -->

    <div
      v-if="typingLine"
      class="min-h-[20px]
             whitespace-pre-wrap
             leading-5"
      :class="{
        'text-green-500':
          typingLine.type === 'system',

        'text-zinc-300':
          typingLine.type === 'output',

        'text-red-500':
          typingLine.type === 'error',

        'text-yellow-400':
          typingLine.type === 'warning',

        'font-bold text-green-400':
          typingLine.type === 'success',
      }"
    >
      <span>
        {{ typingText }}
      </span>

      <!-- TYPING CURSOR -->

      <span
        class="ml-0.5
               inline-block
               h-4
               w-2
               animate-pulse
               bg-green-500
               align-middle"
      />
    </div>

    <!-- ========================================= -->
    <!-- PROMPT -->
    <!-- ========================================= -->

    <form
      class="mt-2 flex items-center gap-2"
      @submit.prevent="submit"
    >
      <span
        class="shrink-0
               text-green-500"
      >
        detective@{{
          props.scenarioId
        }}:
      </span>

      <span
        class="shrink-0
               text-cyan-400"
      >
        {{ props.currentDirectory }}
      </span>

      <span
        class="shrink-0
               text-zinc-500"
      >
        $
      </span>

      <input
        ref="inputRef"
        v-model="input"
        type="text"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        class="min-w-0
               flex-1
               border-none
               bg-transparent
               p-0
               font-mono
               text-sm
               text-green-400
               outline-none
               placeholder:text-zinc-800"
        placeholder="type command..."
        @keydown="handleKeydown"
      />

      <!-- INPUT CURSOR -->

      <span
        v-if="!input"
        class="h-4
               w-2
               shrink-0
               animate-pulse
               bg-green-500"
      />
    </form>

    <!-- ========================================= -->
    <!-- AUTOCOMPLETE -->
    <!-- ========================================= -->

    <div
      v-if="
        showAutocomplete &&
        autocompleteEntries.length
      "
      class="my-3
             max-w-lg
             overflow-hidden
             rounded-md
             border
             border-zinc-800
             bg-zinc-950"
    >
      <div
        class="border-b
               border-zinc-900
               px-3 py-2
               text-[9px]
               uppercase
               tracking-[0.2em]
               text-zinc-600"
      >
        Autocomplete
      </div>

      <button
        v-for="(
          entry,
          index
        ) in autocompleteEntries"
        :key="entry"
        type="button"
        class="flex w-full
               items-center
               justify-between
               px-3 py-2
               text-left
               font-mono
               text-xs"
        :class="
          index === autocompleteIndex
            ? 'bg-green-950/40 text-green-400'
            : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
        "
        @mousedown.prevent="
          selectAutocomplete(entry)
        "
      >
        <span>
          {{ entry }}
        </span>

        <span
          v-if="
            entry.endsWith('/')
          "
          class="text-[9px]
                 text-zinc-700"
        >
          DIR
        </span>
      </button>
    </div>
  </div>
</template>
