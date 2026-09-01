import { filesystem } from '~/data/whoami/filesystem'

import type {
  TerminalBlock,
  TerminalState,
  OutputType
} from '~/types/games/whoami'

export const useTerminal = () => {
  const blocks = useState<TerminalBlock[]>(
    'terminal-blocks',
    () => []
  )

  const state = useState<TerminalState>(
    'terminal-state',
    () => ({
      session:
        Math.floor(Math.random() * 9000) + 1000,

      currentSeal: 0,

      seals: Array(7).fill(false),

      sanity: 100,

      corruption: 0,

      memoryIntegrity: 100,

      commandHistory: [],

      ending: false
    })
  )

  const glitch = ref(false)
  const heavyGlitch = ref(false)

  let blockId = 0

  /*
   * ==========================================
   * UTILITIES
   * ==========================================
   */

  const sleep = (ms: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  const getTypingSpeed = (
    type: OutputType
  ): number => {
    switch (type) {
      case 'danger':
        return 35

      case 'warning':
        return 20

      case 'system':
        return 10

      case 'error':
        return 15

      case 'success':
        return 12

      default:
        return 7
    }
  }

  /*
   * ==========================================
   * PRINT / TYPING EFFECT
   * ==========================================
   */

  const print = async (
    command: string,
    output: string,
    type: OutputType = 'normal'
  ): Promise<void> => {
    const newBlock: TerminalBlock = {
      id: ++blockId,
      command,
      output,
      displayedOutput: '',
      type,
      isTyping: true
    }

    blocks.value.push(newBlock)

    const speed = getTypingSpeed(type)

    for (
      let i = 0;
      i < output.length;
      i++
    ) {
      const currentBlock =
        blocks.value.find(
          (block) => block.id === newBlock.id
        )

      if (!currentBlock) {
        return
      }

      currentBlock.displayedOutput =
        output.slice(0, i + 1)

      await sleep(speed)
    }

    const finishedBlock =
      blocks.value.find(
        (block) => block.id === newBlock.id
      )

    if (!finishedBlock) {
      return
    }

    finishedBlock.displayedOutput =
      output

    finishedBlock.isTyping =
      false
  }

  /*
   * ==========================================
   * FILESYSTEM
   * ==========================================
   */

  const normalizePath = (
    path: string
  ): string => {
    if (!path) {
      return '/'
    }

    let normalized = path.trim()

    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`
    }

    /*
     * Remove duplicate /
     */
    normalized =
      normalized.replace(
        /\/+/g,
        '/'
      )

    /*
     * Remove trailing /
     * except root
     */
    if (
      normalized.length > 1 &&
      normalized.endsWith('/')
    ) {
      normalized =
        normalized.slice(
          0,
          -1
        )
    }

    return normalized
  }

  const isLocked = (
    path: string
  ): boolean => {
    const file =
      filesystem[path]

    if (!file) {
      return false
    }

    if (
      file.requiredSeal === undefined
    ) {
      return false
    }

    return (
      state.value.currentSeal <
      file.requiredSeal
    )
  }

  const getChildren = (
    path: string
  ) => {
    const normalized =
      normalizePath(path)

    const prefix =
      normalized === '/'
        ? '/'
        : `${normalized}/`

    return Object.values(
      filesystem
    ).filter((file) => {
      if (
        file.path === normalized
      ) {
        return false
      }

      if (
        !file.path.startsWith(prefix)
      ) {
        return false
      }

      const relative =
        file.path.slice(
          prefix.length
        )

      return !relative.includes('/')
    })
  }

  /*
   * ==========================================
   * LS
   * ==========================================
   */

  const commandLs = (
    args: string[]
  ): {
    text: string
    type: OutputType
  } => {
    const path =
      normalizePath(
        args[0] ?? '/'
      )

    const directory =
      filesystem[path]

    if (!directory) {
      return {
        text:
          `ls: ${path}: No such file or directory`,
        type: 'error'
      }
    }

    if (
      directory.type !==
      'directory'
    ) {
      return {
        text:
          `ls: ${path}: Not a directory`,
        type: 'error'
      }
    }

    const children =
      getChildren(path)

    if (
      children.length === 0
    ) {
      return {
        text: '(empty)',
        type: 'normal'
      }
    }

    const lines: string[] = []

    for (
      const child of children
    ) {
      const locked =
        isLocked(child.path)

      if (
        child.type ===
        'directory'
      ) {
        lines.push(
          `${child.name}/`
        )

        const files =
          getChildren(
            child.path
          )

        for (
          const file of files
        ) {
          const fileLocked =
            isLocked(
              file.path
            )

          lines.push(
            `  ├── ${file.name}${
              fileLocked
                ? ' [LOCKED]'
                : ''
            }`
          )
        }
      } else {
        lines.push(
          `${child.name}${
            locked
              ? ' [LOCKED]'
              : ''
          }`
        )
      }
    }

    return {
      text:
        lines.join('\n'),
      type: 'normal'
    }
  }

  /*
   * ==========================================
   * CAT
   * ==========================================
   */

  const commandCat = (
    args: string[]
  ): {
    text: string
    type: OutputType
  } => {
    const target =
      args[0]

    if (!target) {
      return {
        text:
          'usage: cat <file>',
        type: 'warning'
      }
    }

    const path =
      normalizePath(target)

    const file =
      filesystem[path]

    if (!file) {
      return {
        text:
          `cat: ${path}: No such file or directory`,
        type: 'error'
      }
    }

    if (
      file.type !==
      'file'
    ) {
      return {
        text:
          `cat: ${path}: Is a directory`,
        type: 'error'
      }
    }

    if (
      isLocked(path)
    ) {
      const requiredSeal =
        file.requiredSeal ?? 0

      return {
        text:
`ACCESS DENIED

REQUIRED SEAL:
${String(
  requiredSeal
).padStart(2, '0')}`,
        type: 'warning'
      }
    }

    return {
      text:
        file.content ?? '(no data)',
      type: 'normal'
    }
  }

  /*
   * ==========================================
   * INSPECT
   * ==========================================
   */

  const commandInspect = (
    args: string[]
  ): {
    text: string
    type: OutputType
  } => {
    const target =
      args[0]

    if (!target) {
      return {
        text:
          'usage: inspect <entity>',
        type: 'warning'
      }
    }

    const entity =
      target.toLowerCase()

    const path =
      `/entities/${entity}`

    const file =
      filesystem[path]

    if (!file) {
      return {
        text:
          `inspect: ${entity}: Unknown entity`,
        type: 'error'
      }
    }

    if (
      isLocked(path)
    ) {
      return {
        text:
`ENTITY:
${entity.toUpperCase()}

STATUS:
LOCKED

ACCESS:
DENIED`,
        type: 'warning'
      }
    }

    return {
      text:
`ENTITY:
${entity.toUpperCase()}

STATUS:
CONTAINED

ACCESS:
GRANTED`,
      type: 'success'
    }
  }

  /*
   * ==========================================
   * STATUS
   * ==========================================
   */

  const commandStatus = (): {
    text: string
    type: OutputType
  } => {
    const openedSeals =
      state.value.seals.filter(
        Boolean
      ).length

    return {
      text:
`SESSION       ${state.value.session}
SEALS         ${openedSeals}/7
SANITY        ${state.value.sanity}%
INTEGRITY     ${state.value.memoryIntegrity}%
CORRUPTION    ${state.value.corruption}%`,
      type: 'system'
    }
  }

  /*
   * ==========================================
   * SEALS
   * ==========================================
   */

  const commandSeals = (): {
    text: string
    type: OutputType
  } => {
    const lines =
      state.value.seals.map(
        (open, index) => {
          const number =
            String(
              index + 1
            ).padStart(2, '0')

          return open
            ? `SEAL_${number}    OPEN`
            : `SEAL_${number}    LOCKED`
        }
      )

    return {
      text:
        lines.join('\n'),
      type: 'system'
    }
  }

  /*
   * ==========================================
   * SCAN
   * ==========================================
   */

  const commandScan = (): {
    text: string
    type: OutputType
  } => {
    const signal =
      state.value.currentSeal > 0
        ? 'DETECTED'
        : 'NONE'

    return {
      text:
`ENVIRONMENT SCAN

TEMP          19.4°C
LIFEFORM      NONE
SIGNAL        ${signal}
POWER         STABLE`,
      type: 'system'
    }
  }

  /*
   * ==========================================
   * WHOAMI
   * ==========================================
   */

  const commandWhoami = (): {
    text: string
    type: OutputType
  } => {
    if (
      state.value.currentSeal >= 5
    ) {
      return {
        text:
`USER          UNKNOWN
IDENTITY      CONFLICT
AUTHORITY     REVOKED`,
        type: 'danger'
      }
    }

    return {
      text:
`USER          ADMIN
IDENTITY      VERIFIED
AUTHORITY     ACTIVE`,
      type: 'system'
    }
  }

  /*
   * ==========================================
   * HELP
   * ==========================================
   */

  const commandHelp = (): {
    text: string
    type: OutputType
  } => {
    return {
      text:
`AVAILABLE COMMANDS

help       command list
ls         list files
cat        read file
inspect    inspect entity
scan       scan environment
open       open seal
seals      seal status
status     system status
whoami     identify user
history    command history
hint       get hint
clear      clear terminal
reset      reset game`,
      type: 'system'
    }
  }

  /*
   * ==========================================
   * HINT
   * ==========================================
   */

  const commandHint = (): {
    text: string
    type: OutputType
  } => {
    const hints: string[] = [
      'Some files are sealed.',
      'The entities are not independent.',
      'The logs were written by someone.',
      'The terminal remembers what you forget.',
      'Not every warning is a warning.',
      'The box is not the prison.',
      'You are closer than you think.'
    ]

    const index =
      Math.min(
        state.value.currentSeal,
        hints.length - 1
      )

    const hint =
      hints[index] ??
      hints[0] ??
      'Something is wrong.'

    return {
      text: hint,
      type: 'warning'
    }
  }

  /*
   * ==========================================
   * HISTORY
   * ==========================================
   */

  const commandHistory = (): {
    text: string
    type: OutputType
  } => {
    const history =
      state.value.commandHistory

    if (
      history.length === 0
    ) {
      return {
        text:
          '(history empty)',
        type: 'normal'
      }
    }

    return {
      text:
        history
          .map(
            (
              command,
              index
            ) =>
              `${index + 1}  ${command}`
          )
          .join('\n'),
      type: 'normal'
    }
  }

  /*
   * ==========================================
   * OPEN SEAL
   * ==========================================
   */

  const commandOpen = (
    args: string[]
  ): {
    text: string
    type: OutputType
  } => {
    const target =
      args[0]

    if (!target) {
      return {
        text:
          'usage: open seal_01',
        type: 'warning'
      }
    }

    const match =
      target.match(
        /^seal[_-]?(\d+)$/i
      )

    if (!match) {
      return {
        text:
          'INVALID SEAL',
        type: 'error'
      }
    }

    const sealString =
      match[1]

    if (!sealString) {
      return {
        text:
          'INVALID SEAL',
        type: 'error'
      }
    }

    const seal =
      Number(sealString)

    if (
      !Number.isInteger(seal) ||
      seal < 1 ||
      seal > 7
    ) {
      return {
        text:
          'INVALID SEAL',
        type: 'error'
      }
    }

    const index =
      seal - 1

    /*
     * TypeScript safety
     */
    if (
      index < 0 ||
      index >= state.value.seals.length
    ) {
      return {
        text:
          'INVALID SEAL',
        type: 'error'
      }
    }

    const alreadyOpen =
      state.value.seals[index]

    if (
      alreadyOpen === true
    ) {
      return {
        text:
          `SEAL_${String(seal).padStart(2, '0')} ALREADY OPEN`,
        type: 'normal'
      }
    }

    /*
     * Không cho phép bỏ qua seal
     */
    if (
      seal >
      state.value.currentSeal + 1
    ) {
      return {
        text:
`ACCESS DENIED

REQUIRED:
SEAL_${String(
  state.value.currentSeal + 1
).padStart(2, '0')}`,
        type: 'warning'
      }
    }

    /*
     * Open seal
     */
    state.value.seals[index] =
      true

    state.value.currentSeal =
      seal

    /*
     * Game stats
     */
    state.value.corruption =
      Math.min(
        100,
        state.value.corruption + 12
      )

    state.value.sanity =
      Math.max(
        0,
        state.value.sanity - 5
      )

    state.value.memoryIntegrity =
      Math.max(
        0,
        state.value.memoryIntegrity - 3
      )

    const messages: string[] = [
      'Đừng nhìn phía sau bạn.',
      'Bạn vừa quên mất một thứ.',
      'Hệ thống đang nói dối.',
      'Nó đang đói.',
      'Nó biết tên của bạn.',
      'Hy vọng không phải là lối thoát.',
      'Bạn chưa bao giờ là người vận hành.'
    ]

    const entities: string[] = [
      'FEAR',
      'MEMORY',
      'DECEPTION',
      'HUNGER',
      'MADNESS',
      'HOPE',
      'PANDORA'
    ]

    const message =
      messages[index] ??
      'UNKNOWN'

    const entity =
      entities[index] ??
      'UNKNOWN'

    /*
     * Glitch từ Seal 5
     */
    if (
      seal >= 5
    ) {
      glitch.value = true

      setTimeout(() => {
        glitch.value = false
      }, 400)
    }

    /*
     * Ending
     */
    if (
      seal === 7
    ) {
      heavyGlitch.value = true

      state.value.ending =
        true

      setTimeout(() => {
        heavyGlitch.value = false
      }, 1000)
    }

    return {
      text:
`SEAL_${String(seal).padStart(2, '0')} UNLOCKED

ENTITY:
${entity}

"${message}"`,
      type:
        seal >= 5
          ? 'danger'
          : 'warning'
    }
  }

  /*
   * ==========================================
   * EXECUTE
   * ==========================================
   */

  const execute = async (
    rawCommand: string
  ): Promise<void> => {
    const command =
      rawCommand.trim()

    if (!command) {
      return
    }

    /*
     * CLEAR
     */
    if (
      command.toLowerCase() ===
      'clear'
    ) {
      blocks.value = []

      return
    }

    /*
     * RESET
     */
    if (
      command.toLowerCase() ===
      'reset'
    ) {
      state.value = {
        session:
          Math.floor(
            Math.random() * 9000
          ) + 1000,

        currentSeal: 0,

        seals:
          Array(7).fill(false),

        sanity: 100,

        corruption: 0,

        memoryIntegrity: 100,

        commandHistory: [],

        ending: false
      }

      blocks.value = []

      await print(
        'reset',
        'SYSTEM RESET\n\nALL SEALS LOCKED.',
        'system'
      )

      return
    }

    /*
     * Save history
     */
    state.value.commandHistory.push(
      command
    )

    /*
     * Parse command
     */
    const parts =
      command.split(/\s+/)

    const name =
      parts[0]?.toLowerCase() ?? ''

    const args =
      parts.slice(1)

    let result: {
      text: string
      type: OutputType
    }

    switch (name) {
      case 'help':
        result =
          commandHelp()
        break

      case 'ls':
        result =
          commandLs(args)
        break

      case 'cat':
        result =
          commandCat(args)
        break

      case 'inspect':
        result =
          commandInspect(args)
        break

      case 'status':
        result =
          commandStatus()
        break

      case 'seals':
        result =
          commandSeals()
        break

      case 'scan':
        result =
          commandScan()
        break

      case 'whoami':
        result =
          commandWhoami()
        break

      case 'history':
        result =
          commandHistory()
        break

      case 'hint':
        result =
          commandHint()
        break

      case 'open':
        result =
          commandOpen(args)
        break

      default:
        result = {
          text:
            `command not found: ${name}`,
          type:
            'error'
        }
    }

    /*
     * Chờ typing hoàn thành
     */
    await print(
      command,
      result.text,
      result.type
    )
  }

  /*
   * ==========================================
   * BOOT
   * ==========================================
   */

  const boot = async (): Promise<void> => {
    if (
      blocks.value.length > 0
    ) {
      return
    }

    await print(
      'system',
`PANDORA_OS v0.1.7

Initializing containment system...
Loading memory...
Checking seals...

SYSTEM READY.

Type "help" for available commands.`,
      'system'
    )
  }

  /*
   * ==========================================
   * RETURN
   * ==========================================
   */

  return {
    blocks,
    state,
    glitch,
    heavyGlitch,
    execute,
    boot
  }
}
