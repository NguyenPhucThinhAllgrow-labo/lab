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

      commandHistory: [],

      gameCompleted: false,

      locale: 'en',
    })

  let lineId = 0

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

  /*
   * --------------------------------------------------
   * TERMINAL OUTPUT
   * --------------------------------------------------
   */

  function addLine(
    type: TerminalLine['type'],
    lineText: string,
    highlights?: TerminalLine['highlights'],
  ) {
    state.terminal.push({
      id: ++lineId,

      type,

      text: lineText,

      highlights,
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

    checkTasks()

    checkGameCompletion()
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
    for (const task of state.tasks) {
      if (
        task.completed
      ) {
        continue
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
        continue
      }

      task.completed =
        true

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

    if (
      state.gameCompleted
    ) {
      return
    }

    state.gameCompleted =
      true

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
  ) {
    const target =
      args[0] || '.'

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

    const children =
      directory.children ?? []

    if (!children.length) {
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

  function commandHint(
    args: string[],
  ) {
    if (!args.length) {
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
        availableEvidence[0]

      if (!evidence) {
        return
      }

      addLine(
        'warning',
        `${getTranslation(
          'hint',
        )}: ${text(
          evidence.hint,
        )}`,
      )

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

    addLine(
      'warning',
      `${getTranslation(
        'hint',
      )}: ${text(
        evidence.hint,
      )}`,
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
        history: 'Show command history',
        whoami: 'Show current user',
        hint: 'Get an investigation hint',
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
        history: 'Hiển thị lịch sử lệnh',
        whoami: 'Hiển thị người dùng hiện tại',
        hint: 'Nhận gợi ý điều tra',
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
     * PATH AUTOCOMPLETE
     */

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

      const searchName =
        value.toLowerCase()

      return (
        directory.children ?? []
      )
        .filter(child =>
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

    const normalizedSearch =
      searchName.toLowerCase()

    return (
      directory.children ?? []
    )
      .filter(child =>
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
    const commandLine =
      rawCommand.trim()

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

      case 'history':
        commandHistory()
        break

      case 'whoami':
        commandWhoami()
        break

      case 'hint':
        commandHint(args)
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
    )
  }

  addLine(
    'system',
    '',
  )

  addLine(
    'system',
    `${getTranslation(
      'currentLanguage',
    )}: ${state.locale}`,
  )

  addLine(
    'system',
    getTranslation(
      'helpInstruction',
    ),
  )

  addLine(
    'system',
    '',
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

    text,
  }
}