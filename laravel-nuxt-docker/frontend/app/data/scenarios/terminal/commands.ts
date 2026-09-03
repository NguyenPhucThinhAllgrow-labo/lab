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
      command: 'grep',
      description: 'Search text inside a file',
      requiresArgument: true,
    },

    {
      command: 'head',
      description: 'Read the first lines of a file',
      requiresArgument: true,
    },

    {
      command: 'tail',
      description: 'Read the last lines of a file',
      requiresArgument: true,
    },

    {
      command: 'stat',
      description: 'Inspect file metadata',
      requiresArgument: true,
    },

    {
      command: 'diff',
      description: 'Compare two files',
      requiresArgument: true,
    },

    {
      command: 'strings',
      description: 'Extract readable strings from a file',
      requiresArgument: true,
    },

    {
      command: 'checksum',
      description: 'Calculate a forensic file checksum',
      requiresArgument: true,
    },

    {
      command: 'find',

      description:
        'Find files',

      requiresArgument: true,
    },

    {
      command: 'sudo',

      description:
        'Run a filesystem command with elevated access',

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
