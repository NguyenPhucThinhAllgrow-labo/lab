<script setup lang="ts">

const terminal = useTerminal()

const input = ref('')

const inputRef =
  ref<HTMLInputElement | null>(null)

const terminalRef =
  ref<HTMLDivElement | null>(null)

const historyIndex = ref(-1)

const showHint = ref(true)

const isExecuting = ref(false)

/*
 * ==========================================
 * SCROLL
 * ==========================================
 */

const scrollBottom = () => {
  nextTick(() => {
    const element =
      terminalRef.value

    if (!element) {
      return
    }

    element.scrollTop =
      element.scrollHeight
  })
}

/*
 * ==========================================
 * EXECUTE
 * ==========================================
 */

const execute = async () => {
  const command =
    input.value.trim()

  if (!command) {
    return
  }

  /*
   * Không cho chạy command mới
   * khi command trước đang typing.
   */
  if (isExecuting.value) {
    return
  }

  showHint.value = false

  historyIndex.value = -1

  /*
   * Clear input trước
   * để UX giống terminal thật.
   */
  input.value = ''

  isExecuting.value = true

  try {
    await terminal.execute(
      command
    )
  } finally {
    isExecuting.value = false

    /*
     * Focus lại input
     */
    await nextTick()

    inputRef.value?.focus()

    scrollBottom()
  }
}

/*
 * ==========================================
 * KEYBOARD
 * ==========================================
 */

const handleKeydown = (
  event: KeyboardEvent
) => {

  /*
   * Không xử lý history
   * trong lúc terminal đang typing.
   */
  if (
    isExecuting.value
  ) {
    /*
     * Vẫn cho phép Escape
     */
    if (
      event.key !== 'Escape'
    ) {
      return
    }
  }

  const history =
    terminal.state.value
      .commandHistory

  /*
   * ========================================
   * ARROW UP
   * ========================================
   */

  if (
    event.key === 'ArrowUp'
  ) {

    event.preventDefault()

    if (
      history.length === 0
    ) {
      return
    }

    if (
      historyIndex.value === -1
    ) {
      historyIndex.value =
        history.length - 1
    } else {
      historyIndex.value =
        Math.max(
          0,
          historyIndex.value - 1
        )
    }

    const command =
      history[
        historyIndex.value
      ]

    /*
     * TypeScript safety
     */
    if (
      command !== undefined
    ) {
      input.value =
        command
    }

    return
  }

  /*
   * ========================================
   * ARROW DOWN
   * ========================================
   */

  if (
    event.key === 'ArrowDown'
  ) {

    event.preventDefault()

    if (
      history.length === 0
    ) {
      return
    }

    if (
      historyIndex.value === -1
    ) {
      return
    }

    historyIndex.value++

    /*
     * Đã đi xuống dưới cùng history
     */
    if (
      historyIndex.value >=
      history.length
    ) {

      historyIndex.value = -1

      input.value = ''

      return
    }

    const command =
      history[
        historyIndex.value
      ]

    if (
      command !== undefined
    ) {
      input.value =
        command
    }

    return
  }

  /*
   * ========================================
   * TAB AUTOCOMPLETE
   * ========================================
   */

  if (
    event.key === 'Tab'
  ) {

    event.preventDefault()

    const commands = [
      'help',
      'ls',
      'cat',
      'inspect',
      'scan',
      'open',
      'seals',
      'status',
      'whoami',
      'history',
      'hint',
      'clear',
      'reset'
    ]

    const current =
      input.value
        .trim()
        .toLowerCase()

    /*
     * Nếu không nhập gì
     * thì không autocomplete.
     */
    if (!current) {
      return
    }

    const match =
      commands.find(
        command =>
          command.startsWith(
            current
          )
      )

    if (
      match !== undefined
    ) {
      input.value = match
    }

    return
  }

  /*
   * ========================================
   * ESC
   * ========================================
   */

  if (
    event.key === 'Escape'
  ) {

    event.preventDefault()

    input.value = ''

    historyIndex.value = -1

    inputRef.value?.focus()

    return
  }
}

/*
 * ==========================================
 * MOUNT
 * ==========================================
 */

onMounted(async () => {

  await terminal.boot()

  await nextTick()

  inputRef.value?.focus()

  scrollBottom()
})

/*
 * ==========================================
 * AUTO SCROLL
 * ==========================================
 *
 * Quan trọng:
 *
 * Không chỉ watch blocks.length.
 *
 * Vì typing thay đổi:
 *
 * block.displayedOutput
 *
 * chứ không thay đổi length.
 */

watch(
  () =>
    terminal.blocks.value
      .map(
        block =>
          `${block.id}:${block.displayedOutput.length}:${block.isTyping}`
      )
      .join('|'),

  () => {
    scrollBottom()
  }
)

</script>

<template>

  <div
    class="
      relative
      flex
      h-screen
      w-screen
      flex-col
      overflow-hidden
      bg-[#020403]
      font-mono
      text-green-400
    "
    :class="{
      'terminal-glitch':
        terminal.glitch.value,

      'terminal-heavy-glitch':
        terminal.heavyGlitch.value
    }"
    @click="inputRef?.focus()"
  >

    <!-- ================================= -->
    <!-- CRT EFFECT                         -->
    <!-- ================================= -->

    <div
      class="
        pointer-events-none
        absolute
        inset-0
        z-40
        crt-vignette
      "
    />

    <div
      class="
        pointer-events-none
        absolute
        inset-0
        z-40
        scanlines
      "
    />

    <div
      class="
        pointer-events-none
        absolute
        inset-0
        z-40
        noise
      "
    />

    <!-- ================================= -->
    <!-- HEADER                             -->
    <!-- ================================= -->

    <header
      class="
        relative
        z-10
        flex
        h-12
        shrink-0
        items-center
        justify-between
        border-b
        border-green-950
        bg-[#030604]
        px-4
      "
    >

      <div
        class="flex items-center"
      >

        <div
          class="flex gap-1.5"
        >

          <span
            class="
              h-2.5
              w-2.5
              rounded-full
              bg-red-600
            "
          />

          <span
            class="
              h-2.5
              w-2.5
              rounded-full
              bg-yellow-500
            "
          />

          <span
            class="
              h-2.5
              w-2.5
              rounded-full
              bg-green-500
              shadow-[0_0_8px_#39ff88]
            "
          />

        </div>

        <span
          class="
            ml-4
            text-[10px]
            font-bold
            tracking-[0.25em]
            text-green-500
          "
        >
          PANDORA_OS
        </span>

      </div>

      <span
        class="
          text-[9px]
          tracking-[0.2em]
          text-green-950
        "
      >
        SESSION:
        {{
          terminal.state.value.session
        }}
      </span>

    </header>

    <!-- ================================= -->
    <!-- TERMINAL                           -->
    <!-- ================================= -->

    <main
      ref="terminalRef"
      class="
        relative
        z-10
        flex-1
        overflow-y-auto
      "
    >

      <div
        class="
          mx-auto
          min-h-full
          w-full
          max-w-5xl
          px-4
          py-6
          sm:px-8
          sm:py-8
        "
      >

        <!-- ================================= -->
        <!-- INTRO HINT                         -->
        <!-- ================================= -->

        <Transition
          enter-active-class="transition duration-300"
          enter-from-class="opacity-0"
          leave-active-class="transition duration-300"
          leave-to-class="opacity-0"
        >

          <div
            v-if="showHint"
            class="
              mb-5
              text-[9px]
              tracking-wide
              text-green-950
            "
          >
            Gõ
            <span
              class="text-green-800"
            >
              help
            </span>
            để xem command.
          </div>

        </Transition>

        <!-- ================================= -->
        <!-- COMMAND HISTORY                   -->
        <!-- ================================= -->

        <div
          class="space-y-6"
        >

          <div
            v-for="block in terminal.blocks.value"
            :key="block.id"
            class="command-block"
          >

            <!-- COMMAND -->

            <div
              class="
                mb-2
                flex
                items-center
                gap-2
                text-xs
                sm:text-sm
              "
            >

              <span
                class="text-green-700"
              >
                &gt;
              </span>

              <span
                class="text-green-400"
              >
                {{ block.command }}
              </span>

            </div>

            <!-- OUTPUT BOX -->

            <div
              class="
                relative
                overflow-hidden
                rounded-sm
                border
                border-green-950
                bg-green-950/[0.025]
                px-4
                py-3
                sm:px-5
                sm:py-4
              "
              :class="{
                'border-red-950':
                  block.type === 'error' ||
                  block.type === 'danger',

                'border-yellow-950':
                  block.type === 'warning',

                'border-green-900':
                  block.type === 'success'
              }"
            >

              <!-- LEFT LINE -->

              <div
                class="
                  absolute
                  left-0
                  top-0
                  h-full
                  w-px
                  bg-green-950
                "
                :class="{
                  'bg-red-900':
                    block.type === 'error' ||
                    block.type === 'danger',

                  'bg-yellow-900':
                    block.type === 'warning',

                  'bg-green-700':
                    block.type === 'success'
                }"
              />

              <!-- OUTPUT -->

              <pre
                class="
                  m-0
                  whitespace-pre-wrap
                  break-words
                  font-mono
                  text-[11px]
                  leading-6
                  text-green-600
                  sm:text-xs
                  sm:leading-6
                "
                :class="{
                  'text-red-500':
                    block.type === 'error' ||
                    block.type === 'danger',

                  'text-yellow-400':
                    block.type === 'warning',

                  'text-green-300':
                    block.type === 'success',

                  'text-green-500':
                    block.type === 'system'
                }"
              >{{ block.displayedOutput }}<span
                v-if="block.isTyping"
                class="typing-cursor"
              >█</span></pre>

            </div>

          </div>

        </div>

        <!-- ================================= -->
        <!-- INPUT                              -->
        <!-- ================================= -->

        <form
          class="
            mt-6
            flex
            items-center
            pb-8
            text-xs
            sm:text-sm
          "
          @submit.prevent="execute"
        >

          <span
            class="
              mr-2
              shrink-0
              text-green-700
            "
          >
            &gt;
          </span>

          <input
            ref="inputRef"
            v-model="input"
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            :disabled="isExecuting"
            class="
              w-full
              bg-transparent
              text-green-400
              caret-green-400
              outline-none
              placeholder:text-green-950
              disabled:cursor-wait
              disabled:opacity-50
            "
          />

          <span
            v-if="!isExecuting"
            class="
              ml-1
              animate-pulse
              text-green-500
            "
          >
            █
          </span>

          <span
            v-else
            class="
              ml-1
              animate-pulse
              text-yellow-600
            "
          >
            ▌
          </span>

        </form>

      </div>

    </main>

    <!-- ================================= -->
    <!-- FOOTER                             -->
    <!-- ================================= -->

    <footer
      class="
        relative
        z-10
        flex
        h-7
        shrink-0
        items-center
        justify-between
        border-t
        border-green-950
        bg-[#020403]
        px-4
        text-[8px]
        tracking-[0.15em]
      "
    >

      <span
        class="text-green-950"
      >
        PANDORA CONTAINMENT SYSTEM
      </span>

      <span
        :class="
          terminal.state.value.corruption >= 70
            ? 'text-red-900'
            : 'text-green-950'
        "
      >
        SYSTEM:
        {{
          terminal.state.value.corruption >= 70
            ? 'UNSTABLE'
            : 'OK'
        }}
      </span>

    </footer>

  </div>

</template>

<style scoped>

.typing-cursor {
  display: inline-block;

  margin-left: 2px;

  color: #39ff88;

  text-shadow:
    0 0 5px #39ff88,
    0 0 10px #39ff88;

  animation:
    pandora-cursor-blink
    0.7s
    steps(1)
    infinite;
}

@keyframes pandora-cursor-blink {

  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

</style>
