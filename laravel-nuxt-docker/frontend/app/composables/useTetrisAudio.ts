const MUSIC_STEP_MS = 185

const MELODY = [
  440, 523.25, 659.25, 523.25,
  392, 493.88, 587.33, 493.88,
  349.23, 440, 523.25, 440,
  329.63, 392, 493.88, 392,
]

export function useTetrisAudio() {
  const soundEnabled = ref(true)

  let context: AudioContext | null = null
  let musicTimer: ReturnType<typeof setInterval> | null = null
  let musicStep = 0
  const effectTimers = new Set<ReturnType<typeof setTimeout>>()

  onMounted(() => {
    soundEnabled.value = localStorage.getItem('tetris-sound-enabled') !== 'false'
  })

  function ensureContext() {
    if (!import.meta.client || !soundEnabled.value) return null

    context ??= new AudioContext()
    return context
  }

  async function unlockAudio() {
    const audioContext = ensureContext()

    if (!audioContext) return false

    try {
      await audioContext.resume()
    } catch {
      return false
    }

    return audioContext.state === 'running'
  }

  function tone(
    frequency: number,
    duration = 0.1,
    volume = 0.025,
    type: OscillatorType = 'square',
    endFrequency?: number,
  ) {
    if (!context || context.state !== 'running' || !soundEnabled.value) return

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)

    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)
    }

    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  function scheduleEffect(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      effectTimers.delete(timer)
      callback()
    }, delay)

    effectTimers.add(timer)
  }

  function playMusicStep() {
    const note = MELODY[musicStep % MELODY.length]

    if (note === undefined) return

    tone(note, 0.15, 0.018)

    if (musicStep % 4 === 0) {
      tone(note / 2, 0.3, 0.012, 'triangle')
    }

    musicStep++
  }

  async function startMusic() {
    if (!await unlockAudio() || musicTimer) return

    playMusicStep()
    musicTimer = setInterval(playMusicStep, MUSIC_STEP_MS)
  }

  function pauseMusic() {
    if (!musicTimer) return

    clearInterval(musicTimer)
    musicTimer = null
  }

  function stopAudio() {
    pauseMusic()
    musicStep = 0

    for (const timer of effectTimers) {
      clearTimeout(timer)
    }
    effectTimers.clear()
  }

  async function playStart() {
    if (!await unlockAudio()) return

    const notes = [261.63, 329.63, 392, 523.25]
    notes.forEach((note, index) => scheduleEffect(
      () => tone(note, 0.13, 0.035),
      index * 70,
    ))

    await startMusic()
  }

  function playMove() {
    tone(210, 0.035, 0.008)
  }

  function playSoftDrop() {
    tone(130, 0.025, 0.006, 'triangle')
  }

  function playRotate() {
    tone(320, 0.07, 0.017, 'square', 470)
  }

  function playLock() {
    tone(150, 0.08, 0.025, 'square', 65)
  }

  function playHardDrop(distance: number) {
    tone(290 + Math.min(distance, 16) * 8, 0.12, 0.035, 'sawtooth', 70)
  }

  function playLineClear(lines: number) {
    const notes = lines >= 4
      ? [523.25, 659.25, 783.99, 1046.5]
      : [440, 554.37, 659.25].slice(0, Math.max(2, lines + 1))

    notes.forEach((note, index) => scheduleEffect(
      () => tone(note, 0.18, lines >= 4 ? 0.045 : 0.032, 'square'),
      index * 75,
    ))
  }

  function playGameOver(stopBackgroundMusic = true) {
    if (stopBackgroundMusic) {
      pauseMusic()
    }

    const notes = [392, 329.63, 261.63, 196]

    notes.forEach((note, index) => scheduleEffect(
      () => tone(note, 0.25, 0.035, 'sawtooth'),
      index * 130,
    ))
  }

  function playPause(isPaused: boolean) {
    if (isPaused) {
      tone(300, 0.1, 0.025, 'square', 150)
      pauseMusic()
      return
    }

    tone(220, 0.1, 0.025, 'square', 440)
    void startMusic()
  }

  async function toggleSound(shouldPlayMusic: boolean) {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem('tetris-sound-enabled', String(soundEnabled.value))

    if (!soundEnabled.value) {
      stopAudio()
      return
    }

    if (shouldPlayMusic) {
      await startMusic()
    } else if (await unlockAudio()) {
      tone(440, 0.08, 0.025)
      scheduleEffect(() => tone(660, 0.1, 0.025), 70)
    }
  }

  async function dispose() {
    stopAudio()

    if (!context) return

    await context.close()
    context = null
  }

  return {
    soundEnabled,
    startMusic,
    pauseMusic,
    stopAudio,
    playStart,
    playMove,
    playSoftDrop,
    playRotate,
    playLock,
    playHardDrop,
    playLineClear,
    playGameOver,
    playPause,
    toggleSound,
    dispose,
  }
}
