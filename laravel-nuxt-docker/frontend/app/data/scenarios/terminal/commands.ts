import type {
  TerminalCommand,
} from '~/types/games/terminal'

export const terminalCommands:
  TerminalCommand[] = [
    {
      command: 'pwd',

      description:
        'Print current directory',

      requiresArgument: false,
    },
    {
      command: 'intro',

      description:
        'Print current intro',

      requiresArgument: false,
    },
    {
      command: 'ls',

      description:
        'List directory contents',

      requiresArgument: false,
    },

    {
      command: 'cd',

      description:
        'Change directory',

      requiresArgument: true,
    },

    {
      command: 'cat',

      description:
        'Read file',

      requiresArgument: true,
    },

    {
      command: 'find',

      description:
        'Find files',

      requiresArgument: true,
    },

    {
      command: 'history',

      description:
        'Show command history',

      requiresArgument: false,
    },

    {
      command: 'whoami',

      description:
        'Show current user',

      requiresArgument: false,
    },

    {
      command: 'hint',

      description:
        'Get an investigation hint',

      requiresArgument: false,
    },

    {
      command: 'guide',

      description:
        'Explain investigation folders',

      requiresArgument: true,
    },

    {
      command: 'help',

      description:
        'Show available commands',

      requiresArgument: false,
    },

    {
      command: 'lang',

      description:
        'Change terminal language',

      requiresArgument: true,
    },

    {
      command: 'clear',

      description:
        'Clear terminal',

      requiresArgument: false,
    },
  ]
