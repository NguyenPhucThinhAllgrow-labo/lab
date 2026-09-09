import {
  computed,
  onUnmounted,
  ref,
} from 'vue'

export type ChessTurn =
  | 'red'
  | 'black'

export function useChessTimer(
  initialSeconds = 10 * 60,
) {
  const redTime = ref(
    initialSeconds,
  )

  const blackTime = ref(
    initialSeconds,
  )

  /**
   * Lượt hiện tại.
   *
   * Game luôn bắt đầu bằng Đỏ.
   */
  const currentTurn =
    ref<ChessTurn>('red')

  /**
   * Game đã bắt đầu chưa.
   */
  const hasStarted = ref(false)

  /**
   * Timer đang chạy.
   */
  const isRunning = ref(false)

  /**
   * Game đã kết thúc chưa.
   */
  const isGameOver = ref(false)

  let interval:
    ReturnType<typeof setInterval> | null =
    null

  /**
   * ================================
   * FORMAT TIME
   * ================================
   */

  function formatTime(
    seconds: number,
  ): string {
    const minutes =
      Math.floor(seconds / 60)

    const secs =
      seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const redTimeText = computed(
    () =>
      formatTime(
        redTime.value,
      ),
  )

  const blackTimeText = computed(
    () =>
      formatTime(
        blackTime.value,
      ),
  )

  /**
   * Thời gian của bên đang chơi.
   */
  const currentTime = computed(
    () => {
      if (
        currentTurn.value ===
        'red'
      ) {
        return redTime.value
      }

      return blackTime.value
    },
  )

  /**
   * ================================
   * START
   * ================================
   *
   * Bắt đầu timer của bên hiện tại.
   *
   * Khi gọi start() lần đầu:
   *
   * currentTurn = red
   *
   * => timer Đỏ chạy.
   */

  function start() {
    if (
      isRunning.value ||
      isGameOver.value
    ) {
      return
    }

    if (
      currentTime.value <= 0
    ) {
      isGameOver.value = true
      return
    }

    hasStarted.value = true
    isRunning.value = true

    interval =
      setInterval(() => {
        /**
         * ============================
         * ĐỎ
         * ============================
         */

        if (
          currentTurn.value ===
          'red'
        ) {
          redTime.value--

          if (
            redTime.value <= 0
          ) {
            redTime.value = 0

            stop()

            isGameOver.value = true
          }

          return
        }

        /**
         * ============================
         * ĐEN
         * ============================
         */

        blackTime.value--

        if (
          blackTime.value <= 0
        ) {
          blackTime.value = 0

          stop()

          isGameOver.value = true
        }
      }, 1000)
  }

  /**
   * ================================
   * STOP
   * ================================
   */

  function stop() {
    isRunning.value = false

    if (interval !== null) {
      clearInterval(interval)

      interval = null
    }
  }

  /**
   * ================================
   * SWITCH TURN
   * ================================
   *
   * Chỉ gọi SAU KHI một nước đi
   * hoàn thành.
   *
   * Đỏ đi xong:
   *   red -> black
   *
   * Đen đi xong:
   *   black -> red
   */

  function switchTurn() {
    if (
      isGameOver.value ||
      !hasStarted.value
    ) {
      return
    }

    /**
     * Dừng timer bên hiện tại.
     */
    stop()

    /**
     * Đổi lượt.
     */
    currentTurn.value =
      currentTurn.value === 'red'
        ? 'black'
        : 'red'

    /**
     * Bắt đầu timer bên mới.
     */
    start()
  }

  /**
   * ================================
   * RESET
   * ================================
   *
   * Chơi lại:
   *
   * - Đỏ = 10:00
   * - Đen = 10:00
   * - Lượt = Đỏ
   * - Timer chưa chạy
   *
   * Phải nhấn "Bắt đầu" lại.
   */

  function reset() {
    stop()

    redTime.value =
      initialSeconds

    blackTime.value =
      initialSeconds

    currentTurn.value = 'red'

    hasStarted.value = false

    isGameOver.value = false
  }

  /**
   * ================================
   * RESIGN
   * ================================
   */

  function resign() {
    stop()

    isGameOver.value = true
  }

  /**
   * ================================
   * CLEANUP
   * ================================
   */

  onUnmounted(() => {
    stop()
  })

  return {
    redTime,
    blackTime,

    currentTurn,

    hasStarted,
    isRunning,
    isGameOver,

    redTimeText,
    blackTimeText,

    start,
    stop,
    switchTurn,
    reset,
    resign,
  }
}