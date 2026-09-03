import type {
  Evidence,
  FileNode,
  Scenario,
  SupportedLocale,
  Task,
} from '~/types/games/detective'

import type {
  TerminalLine,
} from '~/types/games/terminal'

import {
  terminalCommands,
} from '~/data/scenarios/terminal/commands'

interface DetectiveGameState {
  terminal: TerminalLine[]

  currentDirectory: string

  evidence: Evidence[]

  tasks: Task[]

  unlockedPaths: string[]

  passwordPrompt: {
    path: string
    prompt: string
    privileged: boolean
    incorrect: boolean
  } | null

  commandHistory: string[]

  gameCompleted: boolean

  locale: SupportedLocale
}

export function useDetectiveGame(
  scenario: Scenario,
) {
  /*
   * --------------------------------------------------
   * LOCALE
   * --------------------------------------------------
   */

  const supportedLocales:
    SupportedLocale[] = [
      'en',
      'vi',
    ]

  /*
   * --------------------------------------------------
   * STATE
   * --------------------------------------------------
   */

  const state =
    reactive<DetectiveGameState>({
      terminal: [],

      currentDirectory:
        normalizePath(
          scenario.initialDirectory ||
            '/',
        ),

      evidence:
        scenario.evidence.map(
          evidence => ({
            ...evidence,

            discovered:
              evidence.discovered ??
              false,
          }),
        ),

      tasks:
        scenario.tasks.map(
          task => ({
            ...task,

            completed:
              task.completed ??
              false,
          }),
        ),

      unlockedPaths: [],

      passwordPrompt: null,

      commandHistory: [],

      gameCompleted: false,

      locale: 'en',
    })

  let lineId = 0

  function normalizeRestoredTerminalLine(
    line: TerminalLine,
  ): TerminalLine {
    const restored = {
      ...line,
      highlights: line.highlights?.map(
        highlight => ({ ...highlight }),
      ),
    }

    if (!restored.highlights?.length) {
      return restored
    }

    /*
     * Older saved guide lines were trimmed by Laravel while their highlight
     * offsets kept the original indentation. Rebuild the filename range from
     * the tree line itself so existing progress repairs automatically on F5.
     */
    const guideMatch = restored.text.match(
      /^(\s*[├└]── )(.+?)( — )/u,
    )

    if (guideMatch) {
      const prefix = guideMatch[1] ?? ''
      const name = guideMatch[2] ?? ''

      restored.highlights = [{
        start: prefix.length,
        end: prefix.length + name.length,
      }]

      return restored
    }

    restored.highlights = restored.highlights
      .filter(
        highlight =>
          Number.isInteger(highlight.start) &&
          Number.isInteger(highlight.end) &&
          highlight.start >= 0 &&
          highlight.end > highlight.start &&
          highlight.end <= restored.text.length,
      )
      .sort((a, b) => a.start - b.start)

    return restored
  }

  function restoreProgress(
    progress: {
      locale: SupportedLocale
      current_directory: string
      discovered_evidence: string[] | null
      completed_tasks: string[] | null
      unlocked_paths?: string[] | null
      command_history: string[] | null
      terminal_lines: TerminalLine[] | null
      game_completed: boolean
    },
  ) {
    const discoveredIds =
      new Set(
        progress.discovered_evidence ?? [],
      )

    const completedIds =
      new Set(
        progress.completed_tasks ?? [],
      )

    state.locale = progress.locale
    state.currentDirectory =
      normalizePath(
        progress.current_directory ||
          scenario.initialDirectory ||
          '/',
      )

    state.evidence.forEach(
      evidence => {
        evidence.discovered =
          discoveredIds.has(
            evidence.id,
          )
      },
    )

    state.tasks.forEach(task => {
      task.completed =
        completedIds.has(task.id)
    })

    state.unlockedPaths = (
      progress.unlocked_paths ?? []
    ).map(path => normalizePath(path))
    state.passwordPrompt = null

    state.commandHistory = [
      ...(progress.command_history ?? []),
    ]

    state.terminal =
      (progress.terminal_lines ?? []).map(
        line => normalizeRestoredTerminalLine(line),
      )

    const containsRemovedCompletedTask = [
      ...completedIds,
    ].some(
      completedId =>
        !state.tasks.some(
          task => task.id === completedId,
        ),
    )

    /*
     * A case may replace an old automatic final task with an operational
     * report. Legacy saves still contain the removed task ID and a completed
     * flag; reopen those saves at the report step so the new action is not
     * hidden. New report completions contain only current task IDs.
     */
    state.gameCompleted =
      progress.game_completed &&
      !(
        scenario.operationalReport &&
        containsRemovedCompletedTask
      )

    lineId = Math.max(
      0,
      ...state.terminal.map(
        line => line.id,
      ),
    )
  }

  function resetGame() {
    const currentLocale = state.locale

    state.currentDirectory =
      normalizePath(
        scenario.initialDirectory ||
          '/',
      )

    state.evidence =
      scenario.evidence.map(
        evidence => ({
          ...evidence,
          discovered:
            evidence.discovered ??
            false,
        }),
      )

    state.tasks =
      scenario.tasks.map(task => ({
        ...task,
        completed:
          task.completed ?? false,
      }))

    state.commandHistory = []
    state.unlockedPaths = []
    state.passwordPrompt = null
    state.gameCompleted = false
    // Reset investigation progress without discarding the language
    // explicitly selected by the player.
    state.locale = currentLocale
    state.terminal = []
    lineId = 0

    showIntro()
  }

  /*
   * --------------------------------------------------
   * TRANSLATION HELPER
   * --------------------------------------------------
   */

  function text(
    value: {
      en: string
      vi: string
    },
  ): string {
    return (
      value[
        state.locale
      ] ?? value.en
    )
  }

  function texts(
    value: {
      en: string[]
      vi: string[]
    },
  ): string[] {
    return (
      value[
        state.locale
      ] ?? value.en
    )
  }

  /*
   * --------------------------------------------------
   * PATH
   * --------------------------------------------------
   */

  function normalizePath(
    path: string,
  ): string {
    if (!path) {
      return '/'
    }

    const parts =
      path.split('/')

    const result: string[] = []

    for (const part of parts) {
      if (
        !part ||
        part === '.'
      ) {
        continue
      }

      if (
        part === '..'
      ) {
        if (
          result.length > 0
        ) {
          result.pop()
        }

        continue
      }

      result.push(part)
    }

    if (!result.length) {
      return '/'
    }

    return `/${result.join('/')}`
  }

  function resolvePath(
    currentPath: string,
    targetPath: string,
  ): string {
    if (!targetPath) {
      return normalizePath(
        currentPath,
      )
    }

    if (
      targetPath.startsWith('/')
    ) {
      return normalizePath(
        targetPath,
      )
    }

    return normalizePath(
      `${currentPath}/${targetPath}`,
    )
  }

  /*
   * --------------------------------------------------
   * FILESYSTEM
   * --------------------------------------------------
   */

  function getRootNode(): FileNode {
    return {
      type: 'directory',

      name: '/',

      children:
        scenario.filesystem,
    }
  }

  function getNode(
    path: string,
  ): FileNode | null {
    const normalizedPath =
      normalizePath(path)

    if (
      normalizedPath === '/'
    ) {
      return getRootNode()
    }

    const parts =
      normalizedPath
        .split('/')
        .filter(Boolean)

    let children =
      scenario.filesystem

    let current:
      | FileNode
      | null = null

    for (
      let index = 0;
      index < parts.length;
      index++
    ) {
      const part =
        parts[index]

      const found =
        children.find(
          node =>
            node.name === part,
        )

      if (!found) {
        return null
      }

      current = found

      if (
        index <
        parts.length - 1
      ) {
        if (
          found.type !==
          'directory'
        ) {
          return null
        }

        children =
          found.children ?? []
      }
    }

    return current
  }

  function getDirectory(
    path: string,
  ): FileNode | null {
    const node =
      getNode(path)

    if (
      !node ||
      node.type !==
        'directory'
    ) {
      return null
    }

    return node
  }

  function getPathNodes(
    path: string,
  ): Array<{
    node: FileNode
    path: string
  }> {
    const parts = normalizePath(path)
      .split('/')
      .filter(Boolean)
    const result: Array<{
      node: FileNode
      path: string
    }> = []
    let children = scenario.filesystem
    let currentPath = ''

    for (const part of parts) {
      const node = children.find(
        item => item.name === part,
      )

      if (!node) {
        return []
      }

      currentPath += `/${part}`
      result.push({
        node,
        path: currentPath,
      })
      children =
        node.type === 'directory'
          ? node.children ?? []
          : []
    }

    return result
  }

  function isPasswordPathUnlocked(
    protectedPath: string,
  ): boolean {
    return state.unlockedPaths.some(
      path =>
        normalizePath(path) ===
        normalizePath(protectedPath),
    )
  }

  function getDeniedAccess(
    path: string,
    privileged = false,
  ) {
    for (const item of getPathNodes(path)) {
      if (
        item.node.access?.type === 'sudo' &&
        !privileged
      ) {
        return {
          type: 'sudo' as const,
          path: item.path,
          node: item.node,
        }
      }

      if (
        item.node.access?.type === 'password' &&
        !isPasswordPathUnlocked(item.path)
      ) {
        return {
          type: 'password' as const,
          path: item.path,
          node: item.node,
        }
      }
    }

    return null
  }

  function canAccessPath(
    path: string,
    privileged = false,
  ): boolean {
    return !getDeniedAccess(
      path,
      privileged,
    )
  }

  /*
   * Password-protected files are visible so the player can discover and try
   * to open them. Sudo-protected paths remain hidden until a privileged
   * listing is requested. Visibility never grants permission to read.
   */
  function canRevealPath(
    path: string,
    privileged = false,
  ): boolean {
    if (normalizePath(path) === '/') {
      return true
    }

    const pathNodes = getPathNodes(path)

    if (!pathNodes.length) {
      return false
    }

    return pathNodes.every(
      item =>
        item.node.access?.type !== 'sudo' ||
        privileged,
    )
  }

  function ensurePathAccess(
    path: string,
    privileged = false,
    openPasswordPrompt = false,
  ): boolean {
    const denied = getDeniedAccess(
      path,
      privileged,
    )

    if (!denied) {
      return true
    }

    addLine(
      'error',
      `${getTranslation('accessDenied')}: ${path}`,
    )

    if (denied.type === 'sudo') {
      addLine(
        'system',
        getTranslation('sudoRequired'),
      )
    } else {
      const prompt = denied.node.access
        ?.type === 'password'
        ? denied.node.access.prompt
        : undefined

      if (openPasswordPrompt) {
        state.passwordPrompt = {
          path: denied.path,
          prompt: prompt
            ? text(prompt)
            : getTranslation(
                'passwordRequired',
              ),
          privileged,
          incorrect: false,
        }
      } else {
        addLine(
          'system',
          prompt
            ? text(prompt)
            : getTranslation(
                'passwordRequired',
              ),
        )
      }
    }

    return false
  }

  /*
   * --------------------------------------------------
   * TERMINAL OUTPUT
   * --------------------------------------------------
   */

  function addLine(
    type: TerminalLine['type'],
    lineText: string,
    highlights?: TerminalLine['highlights'],
    variant?: TerminalLine['variant'],
  ) {
    state.terminal.push({
      id: ++lineId,

      type,

      text: lineText,

      highlights,

      variant,
    })
  }

  /*
   * --------------------------------------------------
   * HIGHLIGHTS
   * --------------------------------------------------
   */

  function createHighlights(
    lineText: string,
    terms: string[],
  ): Array<{
    start: number
    end: number
  }> {
    const highlights: Array<{
      start: number
      end: number
    }> = []

    const normalizedText =
      lineText.toLowerCase()

    for (const term of terms) {
      if (!term) {
        continue
      }

      const normalizedTerm =
        term.toLowerCase()

      let searchStart = 0

      while (true) {
        const index =
          normalizedText.indexOf(
            normalizedTerm,
            searchStart,
          )

        if (index === -1) {
          break
        }

        highlights.push({
          start: index,

          end:
            index +
            term.length,
        })

        searchStart =
          index +
          term.length
      }
    }

    highlights.sort(
      (a, b) =>
        a.start -
        b.start,
    )

    const merged: Array<{
      start: number
      end: number
    }> = []

    for (
      const item of highlights
    ) {
      const last =
        merged[
          merged.length - 1
        ]

      if (!last) {
        merged.push({
          ...item,
        })

        continue
      }

      if (
        item.start <=
        last.end
      ) {
        last.end =
          Math.max(
            last.end,
            item.end,
          )
      } else {
        merged.push({
          ...item,
        })
      }
    }

    return merged
  }

  /*
   * --------------------------------------------------
   * EVIDENCE
   * --------------------------------------------------
   */

  function canDiscoverEvidence(
    evidence: Evidence,
  ): boolean {
    if (
      !evidence.requiresEvidence
        ?.length
    ) {
      return true
    }

    return evidence.requiresEvidence.every(
      requiredId =>
        state.evidence.some(
          item =>
            item.id ===
              requiredId &&
            item.discovered,
        ),
    )
  }

  function discoverEvidence(
    evidence: Evidence,
  ) {
    if (
      evidence.discovered
    ) {
      return
    }

    if (
      !canDiscoverEvidence(
        evidence,
      )
    ) {
      addLine(
        'warning',
        `${getTranslation('accessDenied')}: ${text(
          evidence.title,
        )}`,
      )

      addLine(
        'warning',
        getTranslation(
          'additionalEvidenceRequired',
        ),
      )

      return
    }

    evidence.discovered =
      true

    addLine(
      'success',
      `${getTranslation(
        'evidenceDiscovered',
      )}: ${text(
        evidence.title,
      )}`,
    )

    addLine(
      'success',
      `→ ${text(
        evidence.description,
      )}`,
    )

  }

  function checkEvidenceFromCat(
    path: string,
  ) {
    const matchingEvidence =
      state.evidence.filter(
        evidence =>
          normalizePath(
            evidence.discover.path,
          ) ===
          normalizePath(path),
      )

    for (
      const evidence of
        matchingEvidence
    ) {
      if (
        evidence.discovered
      ) {
        continue
      }

      if (
        !canDiscoverEvidence(
          evidence,
        )
      ) {
        addLine(
          'warning',
          `${getTranslation(
            'fileContainsSuspiciousInformation',
          )} "${text(
            evidence.title,
          )}".`,
        )

        continue
      }

      discoverEvidence(
        evidence,
      )
    }
  }

  /*
   * --------------------------------------------------
   * TASKS
   * --------------------------------------------------
   */

  function checkTasks() {
    // Police assignments are sequential: only the first unfinished task is
    // active. This also prevents overlapping evidence from completing several
    // future objectives at the same moment.
    const task = state.tasks.find(
      item => !item.completed,
    )

    if (!task) {
      return
    }

    const completed =
      task.requiresEvidence.every(
        evidenceId =>
          state.evidence.some(
            evidence =>
              evidence.id ===
                evidenceId &&
              evidence.discovered,
          ),
      )

    if (!completed) {
      return
    }

    task.completed = true

    addLine(
      'success',
      `${getTranslation(
        'taskCompleted',
      )}: ${text(
        task.title,
      )}`,
    )

    addLine(
      'success',
      `→ ${text(
        task.description,
      )}`,
    )
  }

  function finalizeGameCompletion() {
    if (state.gameCompleted) {
      return
    }

    state.gameCompleted = true

    addLine(
      'success',
      '========================================',
    )

    addLine(
      'success',
      getTranslation(
        'caseSolved',
      ),
    )

    addLine(
      'success',
      getTranslation(
        'allTasksCompleted',
      ),
    )

    addLine(
      'success',
      '========================================',
    )
  }

  function checkGameCompletion() {
    const allTasksCompleted =
      state.tasks.length > 0 &&
      state.tasks.every(
        task =>
          task.completed,
      )

    if (
      !allTasksCompleted
    ) {
      return
    }

    if (scenario.operationalReport) {
      return
    }

    finalizeGameCompletion()
  }

  function completeOperationalReport(): boolean {
    if (!scenario.operationalReport) {
      return false
    }

    const allTasksCompleted =
      state.tasks.length > 0 &&
      state.tasks.every(
        task => task.completed,
      )

    if (!allTasksCompleted) {
      return false
    }

    finalizeGameCompletion()

    return true
  }

  function isOperationalReportAvailable(): boolean {
    return Boolean(
      scenario.operationalReport &&
      state.tasks.length > 0 &&
      state.tasks.every(
        task => task.completed,
      ),
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: PWD
   * --------------------------------------------------
   */

  function commandPwd() {
    addLine(
      'output',
      state.currentDirectory,
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: LS
   * --------------------------------------------------
   */

  function commandLs(
    args: string[],
    privileged = false,
  ) {
    const longFormat =
      args[0] === '-l'

    if (
      args.length >
        (longFormat ? 2 : 1)
    ) {
      addLine(
        'error',
        getTranslation(
          'lsTooManyArguments',
        ),
      )

      return
    }

    const target =
      (
        longFormat
          ? args[1]
          : args[0]
      ) || '.'

    const path =
      resolvePath(
        state.currentDirectory,
        target,
      )

    const directory =
      getDirectory(path)

    if (!directory) {
      addLine(
        'error',
        `ls: ${target}: ${getTranslation(
          'noSuchFileOrDirectory',
        )}`,
      )

      return
    }

    if (!ensurePathAccess(path, privileged)) {
      return
    }

    const children =
      (directory.children ?? []).filter(
        child =>
          canRevealPath(
            path === '/'
              ? `/${child.name}`
              : `${path}/${child.name}`,
            privileged,
          ),
      )

    if (!children.length) {
      return
    }

    if (longFormat) {
      const descriptions: Record<
        SupportedLocale,
        Record<string, string>
      > = {
        en: {
          directory: 'Directory containing related investigation files.',
          authentication: 'Authentication and login event records.',
          network: 'Network connection and traffic telemetry.',
          physicalAccess: 'Physical access, badge or entry records.',
          surveillance: 'Surveillance camera data or visual records.',
          device: 'Device, USB or removable-media information.',
          communication: 'Email or communication records.',
          identity: 'User, employee or identity profile data.',
          forensic: 'Forensic artifact or analysis result.',
          timeline: 'Chronological event or activity timeline.',
          script: 'Executable or automation script; inspect carefully.',
          key: 'Cryptographic key or certificate material.',
          log: 'System or application event log.',
          data: 'Structured case or research data.',
          text: 'Plain-text document or investigator note.',
          image: 'Image or photographic evidence.',
          archive: 'Archive containing one or more files.',
          generic: 'Case-related file requiring inspection.',
        },

        vi: {
          directory: 'Thư mục chứa các tệp điều tra liên quan.',
          authentication: 'Bản ghi sự kiện xác thực và đăng nhập.',
          network: 'Dữ liệu kết nối và lưu lượng mạng.',
          physicalAccess: 'Bản ghi ra vào, thẻ hoặc truy cập vật lý.',
          surveillance: 'Dữ liệu camera giám sát hoặc hình ảnh.',
          device: 'Thông tin thiết bị, USB hoặc bộ nhớ ngoài.',
          communication: 'Email hoặc bản ghi liên lạc.',
          identity: 'Dữ liệu hồ sơ người dùng hoặc nhân viên.',
          forensic: 'Dấu vết hoặc kết quả phân tích pháp chứng.',
          timeline: 'Dòng thời gian sự kiện hoặc hoạt động.',
          script: 'Script thực thi hoặc tự động hóa; cần kiểm tra kỹ.',
          key: 'Khóa mã hóa hoặc dữ liệu chứng chỉ.',
          log: 'Nhật ký sự kiện hệ thống hoặc ứng dụng.',
          data: 'Dữ liệu vụ án hoặc nghiên cứu có cấu trúc.',
          text: 'Tài liệu văn bản hoặc ghi chú điều tra.',
          image: 'Hình ảnh hoặc bằng chứng dạng ảnh.',
          archive: 'Tệp nén chứa một hoặc nhiều tệp.',
          generic: 'Tệp liên quan vụ án cần được kiểm tra.',
        },
      }

      const localeDescriptions =
        descriptions[state.locale]

      function describeNode(
        node: FileNode,
      ) {
        if (node.type === 'directory') {
          return localeDescriptions.directory
        }

        const name =
          node.name.toLowerCase()

        if (/auth|login|credential|mfa/.test(name)) {
          return localeDescriptions.authentication
        }

        if (/network|dns|dhcp|firewall|traffic|pcap/.test(name)) {
          return localeDescriptions.network
        }

        if (/access|badge|door|parking/.test(name)) {
          return localeDescriptions.physicalAccess
        }

        if (/camera|photo|image|snapshot|video/.test(name)) {
          return localeDescriptions.surveillance
        }

        if (/usb|device|mount|hardware/.test(name)) {
          return localeDescriptions.device
        }

        if (/mail|message|inbox/.test(name)) {
          return localeDescriptions.communication
        }

        if (/user|profile|employee|account/.test(name)) {
          return localeDescriptions.identity
        }

        if (/forensic|memory|process|artifact/.test(name)) {
          return localeDescriptions.forensic
        }

        if (/timeline|history|activity/.test(name)) {
          return localeDescriptions.timeline
        }

        if (/script|\.sh$|\.ps1$|\.py$/.test(name)) {
          return localeDescriptions.script
        }

        if (/certificate|\.key$|\.pem$|\.crt$/.test(name)) {
          return localeDescriptions.key
        }

        if (/\.log$/.test(name)) {
          return localeDescriptions.log
        }

        if (/\.(json|csv|dat|db)$/.test(name)) {
          return localeDescriptions.data
        }

        if (/\.(txt|md)$/.test(name)) {
          return localeDescriptions.text
        }

        if (/\.(png|jpg|jpeg|gif)$/.test(name)) {
          return localeDescriptions.image
        }

        if (/\.(zip|tar|gz)$/.test(name)) {
          return localeDescriptions.archive
        }

        return localeDescriptions.generic
      }

      for (const child of children) {
        const displayName =
          child.type === 'directory'
            ? `${child.name}/`
            : child.name

        const line = `${
          child.type === 'directory'
            ? 'd'
            : '-'
        }  ${displayName.padEnd(24)} ${describeNode(child)}`

        addLine(
          'output',
          line,
          createHighlights(
            line,
            [
              state.locale === 'vi'
                ? 'cần kiểm tra kỹ'
                : 'inspect carefully',
            ],
          ),
        )
      }

      return
    }

    const output =
      children
        .map(child => {
          if (
            child.type ===
            'directory'
          ) {
            return `${child.name}/`
          }

          return child.name
        })
        .join('    ')

    addLine(
      'output',
      output,
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: CD
   * --------------------------------------------------
   */

  function commandCd(
    args: string[],
    privileged = false,
  ) {
    if (!args.length) {
      state.currentDirectory =
        '/'

      return
    }

    if (args.length > 1) {
      addLine(
        'error',
        getTranslation(
          'cdTooManyArguments',
        ),
      )

      return
    }

    const target =
      args[0]

    if (!target) {
      return
    }

    const path =
      resolvePath(
        state.currentDirectory,
        target,
      )

    const node =
      getNode(path)

    if (!node) {
      addLine(
        'error',
        `cd: ${target}: ${getTranslation(
          'noSuchFileOrDirectory',
        )}`,
      )

      return
    }

    if (
      node.type !==
      'directory'
    ) {
      addLine(
        'error',
        `cd: ${target}: ${getTranslation(
          'notDirectory',
        )}`,
      )

      return
    }

    if (!ensurePathAccess(path, privileged)) {
      return
    }

    state.currentDirectory =
      path
  }

  /*
   * --------------------------------------------------
   * COMMAND: CAT
   * --------------------------------------------------
   */

  function commandCat(
    args: string[],
    privileged = false,
  ) {
    if (!args.length) {
      addLine(
        'error',
        getTranslation(
          'catMissingOperand',
        ),
      )

      return
    }

    if (args.length > 1) {
      addLine(
        'warning',
        getTranslation(
          'catOneFile',
        ),
      )

      return
    }

    const inputPath =
      args[0]

    if (!inputPath) {
      return
    }

    const path =
      resolvePath(
        state.currentDirectory,
        inputPath,
      )

    const node =
      getNode(path)

    if (!node) {
      addLine(
        'error',
        `cat: ${inputPath}: ${getTranslation(
          'noSuchFileOrDirectory',
        )}`,
      )

      return
    }

    if (
      node.type ===
      'directory'
    ) {
      addLine(
        'error',
        `cat: ${inputPath}: ${getTranslation(
          'isDirectory',
        )}`,
      )

      return
    }

    if (!ensurePathAccess(path, privileged, true)) {
      return
    }

    const content =
      node.content
        ? text(
            node.content,
          )
        : ''

    const matchingEvidence =
      state.evidence.filter(
        evidence =>
          normalizePath(
            evidence.discover.path,
          ) === path,
      )

    const highlightTerms =
      matchingEvidence.flatMap(
        evidence =>
          evidence.highlight
            ? evidence
                .highlight[
                state.locale
              ]
            : [],
      )

    const highlights =
      createHighlights(
        content,
        highlightTerms,
      )

    addLine(
      'output',
      content,
      highlights,
    )

    checkEvidenceFromCat(
      path,
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: FIND
   * --------------------------------------------------
   */

  function commandFind(
    args: string[],
    privileged = false,
  ) {
    const query =
      args.join(' ').trim()

    if (!query) {
      addLine(
        'error',
        getTranslation(
          'findMissingPattern',
        ),
      )

      return
    }

    const results: string[] = []

    function walk(
      nodes: FileNode[],
      basePath: string,
    ) {
      for (
        const node of nodes
      ) {
        const nodePath =
          basePath === '/'
            ? `/${node.name}`
            : `${basePath}/${node.name}`

        if (!canRevealPath(nodePath, privileged)) {
          continue
        }

        if (
          node.name
            .toLowerCase()
            .includes(
              query.toLowerCase(),
            )
        ) {
          results.push(
            nodePath +
              (
                node.type ===
                'directory'
                  ? '/'
                  : ''
              ),
          )
        }

        if (
          node.type ===
            'directory' &&
          node.children
        ) {
          walk(
            node.children,
            nodePath,
          )
        }
      }
    }

    walk(
      scenario.filesystem,
      '/',
    )

    if (!results.length) {
      addLine(
        'output',
        `${getTranslation(
          'findNoResults',
        )} "${query}"`,
      )

      return
    }

    for (
      const result of results
    ) {
      addLine(
        'output',
        result,
      )
    }
  }

  /*
   * --------------------------------------------------
   * COMMAND: SUDO / PASSWORD PROMPT
   * --------------------------------------------------
   */

  function commandSudo(
    args: string[],
  ) {
    const nestedCommand =
      args[0]?.toLowerCase()
    const nestedArgs = args.slice(1)

    if (!nestedCommand) {
      addLine(
        'error',
        getTranslation('sudoMissingCommand'),
      )
      return
    }

    switch (nestedCommand) {
      case 'ls':
        commandLs(nestedArgs, true)
        break
      case 'cd':
        commandCd(nestedArgs, true)
        break
      case 'cat':
        commandCat(nestedArgs, true)
        break
      case 'find':
        commandFind(nestedArgs, true)
        break
      case 'guide':
        commandGuide(nestedArgs, true)
        break
      default:
        addLine(
          'error',
          `${getTranslation('sudoUnsupportedCommand')}: ${nestedCommand}`,
        )
    }
  }

  function submitPassword(
    password: string,
  ): boolean {
    const request = state.passwordPrompt

    if (!request) {
      return false
    }

    const node = getNode(request.path)

    if (
      node?.access?.type !== 'password' ||
      password !== node.access.password
    ) {
      request.incorrect = true
      return false
    }

    if (!isPasswordPathUnlocked(request.path)) {
      state.unlockedPaths.push(request.path)
    }

    const path = request.path
    const privileged = request.privileged
    state.passwordPrompt = null

    addLine(
      'success',
      `${getTranslation('pathUnlocked')}: ${path}`,
    )
    commandCat([path], privileged)

    return true
  }

  function cancelPasswordPrompt() {
    state.passwordPrompt = null
  }

  /*
   * --------------------------------------------------
   * COMMAND: HISTORY
   * --------------------------------------------------
   */

  function commandHistory() {
    if (
      !state.commandHistory
        .length
    ) {
      return
    }

    state.commandHistory.forEach(
      (
        command,
        index,
      ) => {
        addLine(
          'output',
          `${index + 1}  ${command}`,
        )
      },
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: WHOAMI
   * --------------------------------------------------
   */

  function commandWhoami() {
    addLine(
      'output',
      'detective',
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: HINT
   * --------------------------------------------------
   */

  function showEvidenceHint(
    evidence: Evidence,
  ) {
    const folder = evidence.discover.path
      .split('/')
      .filter(Boolean)[0] ?? ''

    const termsByFolder: Record<
      SupportedLocale,
      Record<string, string[]>
    > = {
      en: {
        logs: [
          'timeline',
          'workstation',
          'account name',
          'authentication',
          'login',
          'session',
          'activity',
        ],
        network: [
          'connection',
          'endpoint',
          'IP',
          'traffic',
          'remote access',
          'device',
        ],
        devices: [
          'device',
          'USB',
          'workstation',
          'owner',
          'history',
        ],
        laptop: [
          'laptop',
          'victim device',
          'artifact',
          'timeline',
          'message',
        ],
        usb: [
          'USB',
          'device',
          'owner',
          'contents',
          'history',
        ],
        access: [
          'badge',
          'physical access',
          'entry',
          'identity',
        ],
        camera: [
          'camera',
          'footage',
          'timeline',
          'person',
        ],
        emails: [
          'email',
          'message',
          'communication',
          'sender',
        ],
        email: [
          'email',
          'message',
          'communication',
          'sender',
        ],
        users: [
          'profile',
          'account',
          'identity',
          'user',
        ],
        scripts: [
          'script',
          'command',
          'automation',
          'cleanup',
        ],
        forensics: [
          'forensic',
          'memory',
          'process',
          'artifact',
        ],
        incident: [
          'contradiction',
          'timeline',
          'evidence',
        ],
        external: [
          'external',
          'certificate',
          'destination',
          'infrastructure',
        ],
        research: [
          'research',
          'archive',
          'classified',
          'project',
        ],
        server: [
          'server',
          'service',
          'worker',
          'job',
        ],
        documents: [
          'document',
          'report',
          'record',
          'file',
        ],
        notes: [
          'note',
          'context',
          'personal',
        ],
        parking: [
          'vehicle',
          'parking',
          'entry',
        ],
        system: [
          'system',
          'configuration',
          'service',
          'status',
        ],
      },

      vi: {
        logs: [
          'dòng thời gian',
          'máy trạm',
          'tên tài khoản',
          'xác thực',
          'đăng nhập',
          'phiên',
          'hoạt động',
        ],
        network: [
          'kết nối',
          'endpoint',
          'IP',
          'lưu lượng',
          'truy cập từ xa',
          'thiết bị',
        ],
        devices: [
          'thiết bị',
          'USB',
          'máy trạm',
          'chủ sở hữu',
          'lịch sử',
        ],
        laptop: [
          'laptop',
          'máy nạn nhân',
          'dấu vết',
          'dòng thời gian',
          'tin nhắn',
        ],
        usb: [
          'USB',
          'thiết bị',
          'chủ sở hữu',
          'nội dung',
          'lịch sử',
        ],
        access: [
          'thẻ',
          'truy cập vật lý',
          'ra vào',
          'danh tính',
        ],
        camera: [
          'camera',
          'hình ảnh',
          'dòng thời gian',
          'người',
        ],
        emails: [
          'email',
          'thư',
          'liên lạc',
          'người gửi',
        ],
        email: [
          'email',
          'thư',
          'liên lạc',
          'người gửi',
        ],
        users: [
          'hồ sơ',
          'tài khoản',
          'danh tính',
          'người dùng',
        ],
        scripts: [
          'script',
          'lệnh',
          'tự động hóa',
          'xóa dấu vết',
        ],
        forensics: [
          'pháp chứng',
          'bộ nhớ',
          'tiến trình',
          'dấu vết',
        ],
        incident: [
          'mâu thuẫn',
          'dòng thời gian',
          'bằng chứng',
        ],
        external: [
          'bên ngoài',
          'chứng chỉ',
          'đích đến',
          'hạ tầng',
        ],
        research: [
          'nghiên cứu',
          'archive',
          'dữ liệu mật',
          'dự án',
        ],
        server: [
          'máy chủ',
          'dịch vụ',
          'worker',
          'tác vụ',
        ],
        documents: [
          'tài liệu',
          'báo cáo',
          'hồ sơ',
          'tệp',
        ],
        notes: [
          'ghi chú',
          'bối cảnh',
          'cá nhân',
        ],
        parking: [
          'phương tiện',
          'bãi đỗ xe',
          'ra vào',
        ],
        system: [
          'hệ thống',
          'cấu hình',
          'dịch vụ',
          'trạng thái',
        ],
      },
    }

    const hintLine = `${getTranslation(
      'hint',
    )}: ${text(evidence.hint)}`

    addLine(
      'warning',
      hintLine,
      createHighlights(
        hintLine,
        termsByFolder[state.locale][
          folder
        ] ?? [],
      ),
    )
  }

  function commandHint(
    args: string[],
  ) {
    if (!args.length) {
      const activeTask = state.tasks.find(
        task => !task.completed,
      )

      /*
       * Build the complete dependency branch for the active task. A task may
       * require evidence that is still locked behind several other pieces of
       * evidence, so looking only at task.requiresEvidence is not enough.
       */
      const taskEvidenceIds = new Set<string>()
      const directTaskEvidenceIds = new Set(
        activeTask?.requiresEvidence ?? [],
      )

      function collectEvidenceDependencies(
        evidenceId: string,
      ) {
        if (taskEvidenceIds.has(evidenceId)) {
          return
        }

        taskEvidenceIds.add(evidenceId)

        const evidence = state.evidence.find(
          item => item.id === evidenceId,
        )

        for (
          const requiredId of
            evidence?.requiresEvidence ?? []
        ) {
          collectEvidenceDependencies(requiredId)
        }
      }

      for (
        const evidenceId of
          activeTask?.requiresEvidence ?? []
      ) {
        collectEvidenceDependencies(evidenceId)
      }

      const availableEvidence =
        state.evidence.filter(
          evidence =>
            !evidence.discovered &&
            canDiscoverEvidence(
              evidence,
            ),
        )

      if (
        !availableEvidence.length
      ) {
        addLine(
          'success',
          getTranslation(
            'noEvidenceHints',
          ),
        )

        return
      }

      const evidence =
        availableEvidence.find(item =>
          directTaskEvidenceIds.has(item.id),
        ) ?? availableEvidence.find(item =>
          taskEvidenceIds.has(item.id),
        ) ?? availableEvidence[0]

      if (!evidence) {
        return
      }

      if (activeTask) {
        addLine(
          'system',
          state.locale === 'vi'
            ? `Mục tiêu hiện tại: ${text(activeTask.title)}`
            : `Current objective: ${text(activeTask.title)}`,
        )
      }

      showEvidenceHint(evidence)

      return
    }

    const query =
      args
        .join(' ')
        .toLowerCase()

    const evidence =
      state.evidence.find(
        item =>
          item.id
            .toLowerCase() ===
            query ||
          text(
            item.title,
          )
            .toLowerCase()
            .includes(query),
      )

    if (!evidence) {
      addLine(
        'error',
        `${getTranslation(
          'evidenceNotFound',
        )}: "${query}"`,
      )

      return
    }

    if (
      evidence.discovered
    ) {
      addLine(
        'success',
        `${getTranslation(
          'evidenceAlreadyDiscovered',
        )}: ${text(
          evidence.title,
        )}`,
      )

      return
    }

    showEvidenceHint(evidence)
  }

  /*
   * --------------------------------------------------
   * COMMAND: GUIDE
   * --------------------------------------------------
   */

  function commandGuide(
    args: string[],
    privileged = false,
  ) {
    if (args.length > 1) {
      addLine(
        'error',
        getTranslation(
          'guideTooManyArguments',
        ),
      )

      return
    }

    const requestedFolder =
      args[0]
        ?.replace(/^\/+|\/+$/g, '')
        .toLowerCase()

    const selectedFolder =
      requestedFolder
        ? scenario.filesystem.find(
            node =>
              node.type ===
                'directory' &&
              canAccessPath(`/${node.name}`, privileged) &&
              node.name.toLowerCase() ===
                requestedFolder,
          )
        : undefined

    if (
      requestedFolder &&
      !selectedFolder
    ) {
      addLine(
        'error',
        `${getTranslation(
          'guideFolderNotFound',
        )}: ${requestedFolder}`,
      )

      return
    }

    const guideNodes = selectedFolder
      ? [selectedFolder]
      : scenario.filesystem.filter(
          node =>
            canRevealPath(`/${node.name}`, privileged),
        )
    const descriptions: Record<
      SupportedLocale,
      Record<string, string>
    > = {
      en: {
        logs: 'System, authentication and activity timelines.',
        laptop: "Read-only artifacts from Ethan Ward's laptop.",
        documents: 'Work documents, reports and personnel records.',
        research: 'Protected research files and project data.',
        network: 'Connections, traffic, DNS and remote access traces.',
        devices: 'Workstations, removable media and device history.',
        usb: 'USB contents, metadata and connection history.',
        access: 'Badge records and physical access events.',
        camera: 'Surveillance footage, snapshots and camera status.',
        parking: 'Vehicle and parking access records.',
        emails: 'Messages and communication trails.',
        email: 'Messages and communication trails.',
        users: 'User profiles, accounts and identity information.',
        notes: 'Personal notes and relevant investigation context.',
        scripts: 'Automation, maintenance and suspicious scripts.',
        server: 'Server services, jobs and operational records.',
        system: 'System configuration and operating records.',
        forensics: 'Recovered artifacts and forensic analysis.',
        incident: 'Incident summaries, timelines and contradictions.',
        external: 'Outside infrastructure and third-party connections.',
      },

      vi: {
        logs: 'Dòng thời gian hệ thống, xác thực và hoạt động.',
        laptop: 'Dấu vết chỉ đọc từ laptop của Ethan Ward.',
        documents: 'Tài liệu công việc, báo cáo và hồ sơ nhân sự.',
        research: 'Tệp nghiên cứu được bảo vệ và dữ liệu dự án.',
        network: 'Kết nối, lưu lượng, DNS và dấu vết truy cập từ xa.',
        devices: 'Máy trạm, thiết bị lưu trữ và lịch sử thiết bị.',
        usb: 'Nội dung, metadata và lịch sử kết nối USB.',
        access: 'Dữ liệu thẻ ra vào và sự kiện truy cập vật lý.',
        camera: 'Camera giám sát, ảnh chụp và trạng thái camera.',
        parking: 'Hồ sơ phương tiện và truy cập bãi đỗ xe.',
        emails: 'Email và dấu vết liên lạc.',
        email: 'Email và dấu vết liên lạc.',
        users: 'Hồ sơ người dùng, tài khoản và thông tin danh tính.',
        notes: 'Ghi chú cá nhân và bối cảnh liên quan điều tra.',
        scripts: 'Script tự động hóa, bảo trì và script đáng ngờ.',
        server: 'Dịch vụ, tác vụ và hồ sơ vận hành máy chủ.',
        system: 'Cấu hình và hồ sơ hoạt động của hệ thống.',
        forensics: 'Dấu vết khôi phục và phân tích pháp chứng.',
        incident: 'Tóm tắt, dòng thời gian và mâu thuẫn sự cố.',
        external: 'Hạ tầng bên ngoài và kết nối bên thứ ba.',
      },
    }

    const itemDescriptions: Record<
      SupportedLocale,
      Record<string, string>
    > = {
      en: {
        directory: 'Subdirectory',
        log: 'Event log',
        text: 'Text document',
        data: 'Structured data',
        script: 'Executable script',
        image: 'Visual evidence',
        archive: 'Archived data',
        authentication: 'Records logins, sessions, credentials and MFA events.',
        systemActivity: 'Tracks system activity, services and workstation events over time.',
        network: 'Records connections, addresses, ports and network traffic.',
        dhcp: 'Maps network addresses to the devices that used them.',
        physicalAccess: 'Records badge usage, doors and physical entry events.',
        surveillance: 'Provides camera status, footage or visual timeline information.',
        device: 'Describes USB or hardware identity, connection and usage history.',
        communication: 'Contains messages used to trace communication and instructions.',
        identity: 'Contains user, employee or account identity information.',
        process: 'Shows process execution, memory activity or forensic artifacts.',
        automation: 'Defines automated commands, maintenance actions or cleanup behavior.',
        crypto: 'Contains key, certificate or trust identity information.',
        incident: 'Combines incident events, timelines or conflicting observations.',
        research: 'Contains protected project, archive or research-related data.',
        generic: 'Investigation file',
      },
      vi: {
        directory: 'Thư mục con',
        log: 'Nhật ký sự kiện',
        text: 'Tài liệu văn bản',
        data: 'Dữ liệu có cấu trúc',
        script: 'Script thực thi',
        image: 'Bằng chứng hình ảnh',
        archive: 'Dữ liệu lưu trữ',
        authentication: 'Ghi lại đăng nhập, phiên, thông tin xác thực và sự kiện MFA.',
        systemActivity: 'Theo dõi hoạt động hệ thống, dịch vụ và sự kiện máy trạm theo thời gian.',
        network: 'Ghi lại kết nối, địa chỉ, cổng và lưu lượng mạng.',
        dhcp: 'Ánh xạ địa chỉ mạng với thiết bị đã sử dụng địa chỉ đó.',
        physicalAccess: 'Ghi lại việc dùng thẻ, cửa và các sự kiện ra vào vật lý.',
        surveillance: 'Cung cấp trạng thái camera, hình ảnh hoặc dòng thời gian giám sát.',
        device: 'Mô tả danh tính, kết nối và lịch sử sử dụng USB hoặc phần cứng.',
        communication: 'Chứa thông điệp dùng để truy dấu liên lạc và chỉ đạo.',
        identity: 'Chứa thông tin danh tính người dùng, nhân viên hoặc tài khoản.',
        process: 'Cho biết tiến trình thực thi, hoạt động bộ nhớ hoặc dấu vết pháp chứng.',
        automation: 'Định nghĩa lệnh tự động, thao tác bảo trì hoặc hành vi xóa dấu vết.',
        crypto: 'Chứa khóa, chứng chỉ hoặc thông tin định danh tin cậy.',
        incident: 'Kết hợp sự kiện, dòng thời gian hoặc các quan sát mâu thuẫn.',
        research: 'Chứa dữ liệu dự án, kho lưu trữ hoặc nghiên cứu được bảo vệ.',
        generic: 'Tệp điều tra',
      },
    }

    function describeGuideItem(
      node: FileNode,
      path: string,
    ) {
      const labels =
        itemDescriptions[state.locale]

      if (node.type === 'directory') {
        return labels.directory
      }

      const name = node.name.toLowerCase()
      const normalizedPath = path.toLowerCase()

      if (/auth|login|credential|mfa/.test(name)) {
        return labels.authentication
      }

      if (/dhcp/.test(name)) {
        return labels.dhcp
      }

      if (/network|dns|firewall|traffic|connection|pcap/.test(name)) {
        return labels.network
      }

      if (/badge|door|access|parking/.test(name)) {
        return labels.physicalAccess
      }

      if (/camera|photo|image|snapshot|footage|video/.test(name)) {
        return labels.surveillance
      }

      if (/usb|device|mount|hardware/.test(name)) {
        return labels.device
      }

      if (/mail|message|inbox/.test(name)) {
        return labels.communication
      }

      if (/user|profile|employee|account/.test(name)) {
        return labels.identity
      }

      if (/process|memory|forensic|artifact/.test(name)) {
        return labels.process
      }

      if (/script|cleanup|maintenance|\.sh$|\.py$|\.ps1$/.test(name)) {
        return labels.automation
      }

      if (/certificate|\.key$|\.pem$|\.crt$/.test(name)) {
        return labels.crypto
      }

      if (/incident|contradiction|timeline/.test(name)) {
        return labels.incident
      }

      if (
        normalizedPath.includes('/research/') ||
        /phoenix|research|archive/.test(name)
      ) {
        return labels.research
      }

      if (/system|service|activity/.test(name)) {
        return labels.systemActivity
      }

      if (name.endsWith('.log')) {
        return labels.log
      }

      if (/\.(txt|md|eml)$/.test(name)) {
        return labels.text
      }

      if (/\.(json|csv|dat|db|pcap)$/.test(name)) {
        return labels.data
      }

      if (/\.(sh|py|ps1|js)$/.test(name)) {
        return labels.script
      }

      if (/\.(png|jpg|jpeg|gif|mp4)$/.test(name)) {
        return labels.image
      }

      if (/\.(zip|tar|gz)$/.test(name)) {
        return labels.archive
      }

      return labels.generic
    }

    function showGuideChildren(
      nodes: FileNode[],
      prefix = '     ',
      basePath = '',
    ) {
      const visibleNodes = nodes.filter(
        node =>
          canRevealPath(
            `${basePath}/${node.name}`,
            privileged,
          ),
      )

      visibleNodes.forEach((node, index) => {
        const last =
          index === visibleNodes.length - 1

        const branch =
          last ? '└──' : '├──'

        const name =
          node.type === 'directory'
            ? `${node.name}/`
            : node.name

        const nodePath =
          `${basePath}/${node.name}`

        addLine(
          'output',
          `${prefix}${branch} ${name} — ${describeGuideItem(node, nodePath)}`,
          createHighlights(
            `${prefix}${branch} ${name} — ${describeGuideItem(node, nodePath)}`,
            [name],
          ),
        )

        if (
          node.type === 'directory' &&
          node.children?.length
        ) {
          showGuideChildren(
            node.children,
            `${prefix}${last ? '    ' : '│   '}`,
            nodePath,
          )
        }
      })
    }

    addLine(
      'system',
      getTranslation(
        'folderGuideTitle',
      ),
    )

    addLine(
      'output',
      '',
    )

    const guideDirectories =
      guideNodes.filter(
        node =>
          node.type ===
            'directory',
      )

    for (
      const [
        directoryIndex,
        node,
      ] of guideDirectories.entries()
    ) {
      if (directoryIndex > 0) {
        addLine(
          'output',
          '',
        )
      }

      const description =
        descriptions[state.locale][
          node.name
        ] ??
        getTranslation(
          'genericFolderDescription',
        )

      const line =
        `  /${node.name.padEnd(12)} ${description}`

      addLine(
        'output',
        line,
        createHighlights(
          line,
          [
            `/${node.name}`,
          ],
        ),
      )

      if (node.children?.length) {
        showGuideChildren(
          node.children,
          '     ',
          `/${node.name}`,
        )
      }
    }

    addLine(
      'output',
      '',
    )

    const tip = getTranslation(
      'folderGuideTip',
    )

    addLine(
      'system',
      tip,
      createHighlights(
        tip,
        [
          'ls /folder',
          'cat /folder/file',
          'ls /thư-mục',
          'cat /thư-mục/tệp',
        ],
      ),
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND: HELP
   * --------------------------------------------------
   */

  function commandHelp() {
    addLine(
      'system',
      getTranslation(
        'availableCommands',
      ),
    )

    for (
      const command of
        terminalCommands
    ) {
      const suffix =
        command.requiresArgument
          ? ' <argument>'
          : ''

      addLine(
        'output',
        `  ${command.command}${suffix}    ${getCommandDescription(
          command.command,
        )}`,
      )
    }
  }

  /*
   * --------------------------------------------------
   * COMMAND: LANG
   * --------------------------------------------------
   */

  function commandLang(
    args: string[],
  ) {
    /*
     * lang
     */

    if (!args.length) {
      addLine(
        'system',
        `${getTranslation(
          'currentLanguage',
        )}: ${state.locale}`,
      )

      addLine(
        'output',
        `${getTranslation(
          'availableLanguages',
        )}: ${supportedLocales.join(
          ', ',
        )}`,
      )

      return
    }

    /*
     * lang en vi
     */

    if (args.length > 1) {
      addLine(
        'error',
        getTranslation(
          'langTooManyArguments',
        ),
      )

      return
    }

    const requestedLocale =
      args[0]?.toLowerCase()

    if (
      requestedLocale !==
        'en' &&
      requestedLocale !==
        'vi'
    ) {
      addLine(
        'error',
        `${getTranslation(
          'unsupportedLanguage',
        )}: ${requestedLocale}`,
      )

      addLine(
        'system',
        `${getTranslation(
          'availableLanguages',
        )}: ${supportedLocales.join(
          ', ',
        )}`,
      )

      return
    }

    if (
      state.locale ===
requestedLocale
    ) {
      addLine(
        'warning',
        getTranslation(
          'languageAlreadyActive',
        ),
      )

      return
    }

    state.locale =
requestedLocale

    addLine(
      'success',
      getTranslation(
        'languageChanged',
      ),
    )

    addLine(
      'system',
      `${getTranslation(
        'currentLanguage',
      )}: ${state.locale}`,
    )

    showIntro()
  }

  /*
   * --------------------------------------------------
   * COMMAND: CLEAR
   * --------------------------------------------------
   */

  function clearTerminal() {
    state.terminal = []
  }

  /*
   * --------------------------------------------------
   * TRANSLATION FOR TERMINAL
   * --------------------------------------------------
   */

  const terminalTranslations = {
    en: {
      commandNotFound:
        'command not found',

      helpInstruction:
        'Type "help" to see available commands.',

      availableCommands:
        'Available commands:',

      noSuchFileOrDirectory:
        'No such file or directory',

      notDirectory:
        'Not a directory',

      isDirectory:
        'Is a directory',

      cdTooManyArguments:
        'cd: too many arguments',

      lsTooManyArguments:
        'ls: too many arguments',

      catMissingOperand:
        'cat: missing file operand',

      catOneFile:
        'cat: this terminal supports one file at a time',

      findMissingPattern:
        'find: missing search pattern',

      findNoResults:
        'find: no results for',

      noEvidenceHints:
        'No immediate evidence hints available. Review the evidence already collected.',

      hint:
        'HINT',

      folderGuideTitle:
        'INVESTIGATION FOLDER GUIDE',

      guideTooManyArguments:
        'guide: too many arguments',

      guideFolderNotFound:
        'guide: folder not found',

      genericFolderDescription:
        'Case-related files for further investigation.',

      folderGuideTip:
        'Use "ls /folder" to inspect a folder, then "cat /folder/file" to read a file.',

      evidenceNotFound:
        'hint: evidence not found',

      evidenceAlreadyDiscovered:
        'Evidence already discovered',

      evidenceDiscovered:
        'EVIDENCE DISCOVERED',

      taskCompleted:
        'TASK COMPLETED',

      caseSolved:
        'CASE SOLVED',

      allTasksCompleted:
        'All investigation tasks have been completed.',

      accessDenied:
        'ACCESS DENIED',

      additionalEvidenceRequired:
        'Additional evidence is required before this information can be established.',

      fileContainsSuspiciousInformation:
        'The file contains suspicious information, but you need more evidence before establishing',

      sudoRequired:
        'Elevated access required. Retry with: sudo <command> <path>',

      passwordRequired:
        'This path is password protected.',

      sudoMissingCommand:
        'sudo: missing command',

      sudoUnsupportedCommand:
        'sudo: unsupported command',

      pathUnlocked:
        'PATH UNLOCKED',

      currentLanguage:
        'Current language',

      availableLanguages:
        'Available languages',

      langTooManyArguments:
        'lang: too many arguments',

      unsupportedLanguage:
        'Unsupported language',

      languageAlreadyActive:
        'This language is already active.',

      languageChanged:
        'Language changed successfully.',
    },

    vi: {
      commandNotFound:
        'không tìm thấy lệnh',

      helpInstruction:
        'Gõ "help" để xem các lệnh khả dụng.',

      availableCommands:
        'Các lệnh khả dụng:',

      noSuchFileOrDirectory:
        'Không có tệp hoặc thư mục như vậy',

      notDirectory:
        'Không phải là thư mục',

      isDirectory:
        'Là một thư mục',

      cdTooManyArguments:
        'cd: quá nhiều đối số',

      lsTooManyArguments:
        'ls: quá nhiều đối số',

      catMissingOperand:
        'cat: thiếu tệp cần đọc',

      catOneFile:
        'cat: terminal này chỉ hỗ trợ một tệp mỗi lần',

      findMissingPattern:
        'find: thiếu mẫu tìm kiếm',

      findNoResults:
        'find: không tìm thấy kết quả cho',

      noEvidenceHints:
        'Không có gợi ý bằng chứng mới. Hãy xem lại các bằng chứng đã thu thập.',

      hint:
        'GỢI Ý',

      folderGuideTitle:
        'HƯỚNG DẪN THƯ MỤC ĐIỀU TRA',

      guideTooManyArguments:
        'guide: quá nhiều đối số',

      guideFolderNotFound:
        'guide: không tìm thấy thư mục',

      genericFolderDescription:
        'Các tệp liên quan vụ án cần được điều tra thêm.',

      folderGuideTip:
        'Dùng "ls /thư-mục" để xem nội dung, sau đó dùng "cat /thư-mục/tệp" để đọc tệp.',

      evidenceNotFound:
        'hint: không tìm thấy bằng chứng',

      evidenceAlreadyDiscovered:
        'Bằng chứng đã được phát hiện',

      evidenceDiscovered:
        'ĐÃ PHÁT HIỆN BẰNG CHỨNG',

      taskCompleted:
        'ĐÃ HOÀN THÀNH NHIỆM VỤ',

      caseSolved:
        'ĐÃ GIẢI QUYẾT VỤ ÁN',

      allTasksCompleted:
        'Tất cả nhiệm vụ điều tra đã được hoàn thành.',

      accessDenied:
        'TRUY CẬP BỊ TỪ CHỐI',

      additionalEvidenceRequired:
        'Cần thêm bằng chứng trước khi có thể xác lập thông tin này.',

      fileContainsSuspiciousInformation:
        'Tệp chứa thông tin đáng ngờ, nhưng bạn cần thêm bằng chứng trước khi xác lập',

      sudoRequired:
        'Cần quyền nâng cao. Hãy thử lại với: sudo <lệnh> <đường-dẫn>',

      passwordRequired:
        'Đường dẫn này được bảo vệ bằng mật mã.',

      sudoMissingCommand:
        'sudo: thiếu lệnh cần chạy',

      sudoUnsupportedCommand:
        'sudo: lệnh không được hỗ trợ',

      pathUnlocked:
        'ĐÃ MỞ KHÓA ĐƯỜNG DẪN',

      currentLanguage:
        'Ngôn ngữ hiện tại',

      availableLanguages:
        'Ngôn ngữ khả dụng',

      langTooManyArguments:
        'lang: quá nhiều đối số',

      unsupportedLanguage:
        'Ngôn ngữ không được hỗ trợ',

      languageAlreadyActive:
        'Ngôn ngữ này đang được sử dụng.',

      languageChanged:
        'Đã chuyển ngôn ngữ thành công.',
    },
  }

  function getTranslation(
    key: keyof typeof terminalTranslations.en,
  ): string {
    return (
      terminalTranslations[
        state.locale
      ][key] ??
      terminalTranslations.en[key]
    )
  }

  /*
   * --------------------------------------------------
   * COMMAND DESCRIPTION
   * --------------------------------------------------
   */

  function getCommandDescription(
    command: string,
  ): string {
    const descriptions: Record<
      SupportedLocale,
      Record<string, string>
    > = {
      en: {
        pwd: 'Print current directory',
        intro: 'Print current intro',
        ls: 'List directory contents',
        cd: 'Change directory',
        cat: 'Read file',
        find: 'Find files',
        sudo: 'Run ls, cd, cat, find or guide with elevated access',
        history: 'Show command history',
        whoami: 'Show current user',
        hint: 'Get an investigation hint',
        guide: 'Explain investigation folders',
        help: 'Show available commands',
        lang: 'Change terminal language',
        clear: 'Clear terminal',
      },

      vi: {
        pwd: 'Hiển thị thư mục hiện tại',
        intro: 'Hiển thị intro hiện tại',
        ls: 'Liệt kê nội dung thư mục',
        cd: 'Chuyển thư mục',
        cat: 'Đọc nội dung tệp',
        find: 'Tìm tệp',
        sudo: 'Chạy ls, cd, cat, find hoặc guide với quyền nâng cao',
        history: 'Hiển thị lịch sử lệnh',
        whoami: 'Hiển thị người dùng hiện tại',
        hint: 'Nhận gợi ý điều tra',
        guide: 'Giải thích chức năng các thư mục điều tra',
        help: 'Hiển thị các lệnh khả dụng',
        lang: 'Thay đổi ngôn ngữ terminal',
        clear: 'Xóa terminal',
      },
    }

    return (
      descriptions[
        state.locale
      ][command] ??
      descriptions.en[
        command
      ] ??
      ''
    )
  }

  /*
   * --------------------------------------------------
   * PROMPT
   * --------------------------------------------------
   */

  function getPrompt(): string {
    return `detective@${scenario.id}:${state.currentDirectory}$`
  }

  /*
   * --------------------------------------------------
   * AUTOCOMPLETE
   * --------------------------------------------------
   */

  function getAutocompleteEntries(
    input: string,
  ): string[] {
    const value = input

    if (
      !value.includes(' ') &&
      !value.includes('\t')
    ) {
      return terminalCommands
        .map(
          item =>
            item.command,
        )
        .filter(
          command =>
            command.startsWith(
              value.toLowerCase(),
            ),
        )
    }

    const match =
      value.match(
        /^(\S+)\s+(.*)$/,
      )

    if (!match) {
      return []
    }

    const command =
      match[1]?.toLowerCase()

    const argument =
      match[2]

    if (
      !command ||
      argument === undefined
    ) {
      return []
    }

    /*
     * SUDO AUTOCOMPLETE
     *
     * Keep the nested command in each suggestion so the terminal can
     * replace everything after "sudo" in one operation.
     */

    if (command === 'sudo') {
      const sudoCommands = [
        'ls',
        'cd',
        'cat',
        'find',
        'guide',
      ]

      if (!argument.includes(' ')) {
        return sudoCommands.filter(item =>
          item.startsWith(
            argument.toLowerCase(),
          ),
        )
      }

      const sudoMatch = argument.match(
        /^(ls|cd|cat|find|guide)\s+(.*)$/i,
      )

      if (!sudoMatch) {
        return []
      }

      const nestedCommand =
        sudoMatch[1]?.toLowerCase()
      const nestedArgument =
        sudoMatch[2] ?? ''

      if (!nestedCommand) {
        return []
      }

      if (nestedCommand === 'guide') {
        if (nestedArgument.includes(' ')) {
          return []
        }

        const hasLeadingSlash =
          nestedArgument.startsWith('/')
        const query = nestedArgument
          .replace(/^\/+/, '')
          .toLowerCase()

        return scenario.filesystem
          .filter(node =>
            node.type === 'directory' &&
            node.name.toLowerCase()
              .startsWith(query),
          )
          .map(node =>
            `${nestedCommand} ${hasLeadingSlash ? '/' : ''}${node.name}`,
          )
      }

      if (
        nestedCommand === 'ls' &&
        nestedArgument.startsWith('-')
      ) {
        if (!nestedArgument.includes(' ')) {
          return '-l'.startsWith(nestedArgument)
            ? ['ls -l']
            : []
        }

        const longMatch = nestedArgument.match(
          /^-l\s+(\S*)$/,
        )

        if (!longMatch) {
          return []
        }

        return getPathSuggestions(
          longMatch[1] ?? '',
          true,
        ).map(entry => `ls -l ${entry}`)
      }

      if (nestedArgument.includes(' ')) {
        return []
      }

      return getPathSuggestions(
        nestedArgument,
        true,
      ).map(entry =>
        `${nestedCommand} ${entry}`,
      )
    }

    /*
     * LANG AUTOCOMPLETE
     */

    if (
      command === 'lang'
    ) {
      if (
        argument.includes(' ')
      ) {
        return []
      }

      return supportedLocales.filter(
        locale =>
          locale.startsWith(
            argument.toLowerCase(),
          ),
      )
    }

    /*
     * GUIDE AUTOCOMPLETE
     */

    if (command === 'guide') {
      if (argument.includes(' ')) {
        return []
      }

      const hasLeadingSlash =
        argument.startsWith('/')

      const query = argument
        .replace(/^\/+/, '')
        .toLowerCase()

      return scenario.filesystem
        .filter(
          node =>
            node.type ===
              'directory' &&
            node.name
              .toLowerCase()
              .startsWith(query),
        )
        .map(node =>
          `${hasLeadingSlash ? '/' : ''}${node.name}`,
        )
    }

    /*
     * PATH AUTOCOMPLETE
     */

    if (
      command === 'ls' &&
      argument.startsWith('-')
    ) {
      if (!argument.includes(' ')) {
        return '-l'.startsWith(argument)
          ? ['-l']
          : []
      }

      const longMatch =
        argument.match(
          /^-l\s+(\S*)$/,
        )

      if (!longMatch) {
        return []
      }

      return getPathSuggestions(
        longMatch[1] ?? '',
      ).map(entry =>
        `-l ${entry}`,
      )
    }

    if (
      command !== 'cd' &&
      command !== 'cat' &&
      command !== 'ls'
    ) {
      return []
    }

    if (
      argument.includes(' ')
    ) {
      return []
    }

    return getPathSuggestions(
      argument,
    )
  }

  /*
   * --------------------------------------------------
   * PATH AUTOCOMPLETE
   * --------------------------------------------------
   */

  function getPathSuggestions(
    inputPath: string,
    privileged = false,
  ): string[] {
    const value =
      inputPath

    if (
      !value.includes('/')
    ) {
      const directory =
        getDirectory(
          state.currentDirectory,
        )

      if (!directory) {
        return []
      }

      if (!canAccessPath(state.currentDirectory, privileged)) {
        return []
      }

      const searchName =
        value.toLowerCase()

      return (
        directory.children ?? []
      )
        .filter(child =>
          canRevealPath(
            state.currentDirectory === '/'
              ? `/${child.name}`
              : `${state.currentDirectory}/${child.name}`,
            privileged,
          ) &&
          child.name
              .toLowerCase()
              .startsWith(
                searchName,
              ),
        )
        .map(child => {
          if (
            child.type ===
            'directory'
          ) {
            return `${child.name}/`
          }

          return child.name
        })
    }

    const lastSlash =
      value.lastIndexOf('/')

    const directoryPart =
      value.slice(
        0,
        lastSlash,
      )

    const searchName =
      value.slice(
        lastSlash + 1,
      )

    let directoryPath: string

    if (
      value.startsWith('/')
    ) {
      directoryPath =
        normalizePath(
          directoryPart ||
            '/',
        )
    } else {
      directoryPath =
        resolvePath(
          state.currentDirectory,
          directoryPart ||
            '.',
        )
    }

    const directory =
      getDirectory(
        directoryPath,
      )

    if (!directory) {
      return []
    }

    if (!canAccessPath(directoryPath, privileged)) {
      return []
    }

    const normalizedSearch =
      searchName.toLowerCase()

    return (
      directory.children ?? []
    )
      .filter(child =>
        canRevealPath(
          directoryPath === '/'
            ? `/${child.name}`
            : `${directoryPath}/${child.name}`,
          privileged,
        ) &&
        child.name
            .toLowerCase()
            .startsWith(
              normalizedSearch,
            ),
      )
      .map(child => {
        const suffix =
          child.type ===
          'directory'
            ? '/'
            : ''

        const prefix =
          value.slice(
            0,
            lastSlash + 1,
          )

        return `${prefix}${child.name}${suffix}`
      })
  }

  /*
   * --------------------------------------------------
   * EXECUTE
   * --------------------------------------------------
   */

  function execute(
    rawCommand: string,
  ) {
    const commandLine = rawCommand
      .replace(
        /(?:&#x20;|&#32;|&nbsp;)/gi,
        ' ',
      )
      .replace(/[\u00a0\u200b]/g, ' ')
      .trim()

    if (!commandLine) {
      return
    }

    state.commandHistory.push(
      commandLine,
    )

    addLine(
      'command',
      `${getPrompt()} ${commandLine}`,
    )

    const parts =
      commandLine.match(
        /(?:[^\s"]+|"[^"]*")+/g,
      ) ?? []

    const rawCommandName =
      parts[0]

    if (!rawCommandName) {
      return
    }

    const command =
      rawCommandName.toLowerCase()

    const args =
      parts
        .slice(1)
        .map(arg => {
          if (
            arg.startsWith('"') &&
            arg.endsWith('"')
          ) {
            return arg.slice(
              1,
              -1,
            )
          }

          return arg
        })

    switch (command) {
      case 'pwd':
        commandPwd()
        break
    case 'intro':
        showIntro()
        break

      case 'ls':
        commandLs(args)
        break

      case 'cd':
        commandCd(args)
        break

      case 'cat':
        commandCat(args)
        break

      case 'find':
        commandFind(args)
        break

      case 'sudo':
        commandSudo(args)
        break

      case 'history':
        commandHistory()
        break

      case 'whoami':
        commandWhoami()
        break

      case 'hint':
        commandHint(args)
        break

      case 'guide':
        commandGuide(args)
        break

      case 'help':
        commandHelp()
        break

      case 'lang':
        commandLang(args)
        break

      case 'clear':
        clearTerminal()
        break

      default:
        addLine(
          'error',
          `${command}: ${getTranslation(
            'commandNotFound',
          )}`,
        )

        addLine(
          'system',
          getTranslation(
            'helpInstruction',
          ),
        )

        break
    }

    checkTasks()

    checkGameCompletion()
  }

  /*
   * --------------------------------------------------
   * INITIALIZE
   * --------------------------------------------------
   */

function showIntro() {
  for (
    const line of texts(
      scenario.intro,
    )
  ) {
    addLine(
      'system',
      line,
      undefined,
      'intro',
    )
  }

  addLine(
    'system',
    '',
    undefined,
    'intro',
  )

  addLine(
    'system',
    `${getTranslation(
      'currentLanguage',
    )}: ${state.locale}`,
    undefined,
    'intro',
  )

  addLine(
    'system',
    getTranslation(
      'helpInstruction',
    ),
    undefined,
    'intro',
  )

  addLine(
    'system',
    '',
    undefined,
    'intro',
  )
}

function initialize() {
  if (
    state.terminal.length > 0
  ) {
    return
  }

  showIntro()
}

  initialize()

  /*
   * --------------------------------------------------
   * RETURN API
   * --------------------------------------------------
   */

  return {
    state,

    scenario,

    terminalCommands,

    execute,

    clearTerminal,

    getPrompt,

    getAutocompleteEntries,

    normalizePath,

    resolvePath,

    getNode,

    getDirectory,

    checkTasks,

    checkGameCompletion,

    completeOperationalReport,

    isOperationalReportAvailable,

    restoreProgress,

    resetGame,

    submitPassword,

    cancelPasswordPrompt,

    text,
  }
}
