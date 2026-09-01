import {
  filesystem
} from './filesystem'

import type {
  TerminalState,
  OutputType
} from '~/types/games/whoami'

/*
 * Context mà mỗi command nhận được.
 *
 * Command không còn phụ thuộc vào type Command
 * trong pandora.ts.
 */
export interface CommandContext {
  print: (
    output: string,
    type?: OutputType
  ) => void

  args: string[]

  state: TerminalState
}

/*
 * Cấu trúc của một command.
 */
export interface GameCommand {
  name: string
  description: string

  execute: (
    context: CommandContext
  ) => void
}

/*
 * Chuẩn hóa đường dẫn.
 */
function normalizePath(
  path: string
): string {
  if (!path) {
    return '/'
  }

  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  return path.replace(
    /\/+/g,
    '/'
  )
}

/*
 * Kiểm tra người chơi có quyền
 * truy cập file hay không.
 */
function canAccess(
  path: string,
  state: TerminalState
): boolean {
  const file =
    filesystem[path]

  if (!file) {
    return false
  }

  if (
    file.requiredSeal !== undefined &&
    state.currentSeal <
      file.requiredSeal
  ) {
    return false
  }

  return true
}

/*
 * Lấy số seal yêu cầu.
 *
 * Hàm này giúp tránh lỗi:
 *
 * Object is possibly 'undefined'
 */
function getRequiredSeal(
  path: string
): number {
  return filesystem[path]
    ?.requiredSeal ?? 0
}

/*
 * COMMANDS
 */
export const commands: GameCommand[] = [

  // =========================
  // HELP
  // =========================

  {
    name: 'help',

    description:
      'Hiển thị danh sách command',

    execute({ print }) {
      print(
`GIAO DIỆN COMMAND — PANDORA_OS

help       Hiển thị command
hint       Nhận gợi ý
clear      Xóa terminal

ls         Liệt kê file
cat        Đọc file
inspect    Kiểm tra thực thể

scan       Quét môi trường
open       Mở phong ấn
seals      Hiển thị trạng thái phong ấn

status     Hiển thị trạng thái hệ thống
whoami     Xác định người dùng
history    Xem lịch sử command

reset      Xóa toàn bộ tiến trình

GỢI Ý:

Khám phá filesystem.
Đọc các log.
Kiểm tra các thực thể.

Terminal sẽ không giải thích
mọi thứ cho bạn.`
      )
    }
  },

  // =========================
  // HINT
  // =========================

  {
    name: 'hint',

    description:
      'Nhận gợi ý',

    execute({
      print,
      state
    }) {
      const hints: string[] = [

`GỢI Ý:

Terminal chứa nhiều file.

Hãy thử:

ls
`,

`GỢI Ý:

Có những thực thể đang ẩn
bên trong hệ thống.

Hãy thử:

inspect fear
`,

`GỢI Ý:

Phong ấn đầu tiên đang chờ.

Hãy thử:

open seal_01
`,

`GỢI Ý:

Có điều gì đó không ổn
với danh tính của bạn.

Hãy thử:

whoami
`,

`GỢI Ý:

Hệ thống đang che giấu
một số file.

Hãy thử:

ls /unknown
`,

`GỢI Ý:

Một số log yêu cầu
phải mở phong ấn trước.

Hãy thử:

ls /logs
`,

`GỢI Ý:

Thực thể cuối cùng có thể
không thực sự là một thực thể.

Khám phá thư mục Pandora.

Hãy thử:

ls /pandora
`,

`GỢI Ý:

Không còn nơi nào khác để đi.

Đọc:

cat /pandora/true
`
      ]

      const index =
        Math.min(
          state.currentSeal,
          hints.length - 1
        )
        
      print(
        hints[index] ?? hints[0] ?? '',
        'warning'
      )
    }
  },

  // =========================
  // CLEAR
  // =========================

  {
    name: 'clear',

    description:
      'Xóa terminal',

    execute({ print }) {
      print('__CLEAR__')
    }
  },

  // =========================
  // LS
  // =========================

  {
    name: 'ls',

    description:
      'Liệt kê file',

    execute({
      print,
      args,
      state
    }) {
      const path =
        normalizePath(
          args[0] || '/'
        )

      const directory =
        filesystem[path]

      if (!directory) {
        print(
          `ls: ${path}: Không tìm thấy thư mục`,
          'error'
        )

        return
      }

      if (
        directory.type !==
        'directory'
      ) {
        print(
          `ls: ${path}: Không phải thư mục`,
          'error'
        )

        return
      }

      const prefix =
        path === '/'
          ? '/'
          : `${path}/`

      /*
       * Chỉ lấy các entry nằm
       * bên trong thư mục hiện tại.
       */
      const entries =
        Object.keys(
          filesystem
        )
          .filter(
            filePath =>
              filePath !== path &&
              filePath.startsWith(prefix)
          )
          .map(
            filePath => {
              const relative =
                filePath.slice(
                  prefix.length
                )

              const parts =
                relative.split('/')

              return {
                filePath,
                name:
                  parts[0] ?? '',
                depth:
                  parts.length - 1
              }
            }
          )

      /*
       * Cây filesystem.
       */
      const tree =
        new Map<
          string,
          {
            type:
              | 'file'
              | 'directory'

            locked: boolean
          }
        >()

      for (
        const entry of entries
      ) {
        if (!entry.name) {
          continue
        }

        const item =
          filesystem[
            entry.filePath
          ]

        /*
         * TypeScript không còn báo
         * item có thể undefined.
         */
        if (!item) {
          continue
        }

        /*
         * Entry trực tiếp.
         */
        if (
          entry.depth === 0
        ) {
          tree.set(
            entry.name,
            {
              type:
                item.type,

              locked:
                item.requiredSeal !==
                  undefined &&
                state.currentSeal <
                  item.requiredSeal
            }
          )

          continue
        }

        /*
         * Entry nằm trong folder.
         */
        const rootName =
          entry.name

        if (
          !tree.has(
            rootName
          )
        ) {
          tree.set(
            rootName,
            {
              type:
                'directory',

              locked:
                false
            }
          )
        }
      }

      if (!tree.size) {
        print(
          'THƯ MỤC TRỐNG.'
        )

        return
      }

      const lines: string[] = []

      for (
        const [
          name,
          info
        ] of tree
      ) {

        /*
         * FOLDER
         */
        if (
          info.type ===
          'directory'
        ) {
          const folderPath =
            path === '/'
              ? `/${name}`
              : `${path}/${name}`

          const children =
            Object.keys(
              filesystem
            )
              .filter(
                childPath => {
                  const childPrefix =
                    `${folderPath}/`

                  if (
                    !childPath.startsWith(
                      childPrefix
                    )
                  ) {
                    return false
                  }

                  const relative =
                    childPath.slice(
                      childPrefix.length
                    )

                  return (
                    !relative.includes('/')
                  )
                }
              )

          lines.push(
            info.locked
              ? `${name}/ [LOCKED]`
              : `${name}/`
          )

          for (
            const childPath of children
          ) {
            const child =
              filesystem[
                childPath
              ]

            if (!child) {
              continue
            }

            const childName =
              childPath.slice(
                `${folderPath}/`.length
              )

            const locked =
              child.requiredSeal !==
                undefined &&
              state.currentSeal <
                child.requiredSeal

            lines.push(
              child.type ===
                'directory'
                ? `  ├── ${childName}/${locked ? ' [LOCKED]' : ''}`
                : `  ├── ${childName}${locked ? ' [LOCKED]' : ''}`
            )
          }

          continue
        }

        /*
         * FILE
         */
        lines.push(
          info.locked
            ? `${name} [LOCKED]`
            : name
        )
      }

      print(
        lines.join('\n')
      )
    }
  },

  // =========================
  // CAT
  // =========================

  {
    name: 'cat',

    description:
      'Đọc file',

    execute({
      print,
      args,
      state
    }) {
      if (!args[0]) {
        print(
          'Cú pháp: cat /đường/dẫn/file',
          'error'
        )

        return
      }

      const path =
        normalizePath(
          args[0]
        )

      const file =
        filesystem[path]

      if (!file) {
        print(
          `cat: ${path}: Không tìm thấy file`,
          'error'
        )

        return
      }

      if (
        file.type ===
        'directory'
      ) {
        print(
          `cat: ${path}: Đây là thư mục`,
          'error'
        )

        return
      }

      if (
        !canAccess(
          path,
          state
        )
      ) {
        const requiredSeal =
          getRequiredSeal(path)

        print(
`TRUY CẬP BỊ TỪ CHỐI.

YÊU CẦU PHONG ẤN:
${requiredSeal}

PHONG ẤN HIỆN TẠI:
${state.currentSeal}`,
          'warning'
        )

        return
      }

      print(
        file.content ?? ''
      )
    }
  },

  // =========================
  // INSPECT
  // =========================

  {
    name: 'inspect',

    description:
      'Kiểm tra thực thể',

    execute({
      print,
      args,
      state
    }) {
      if (!args[0]) {
        print(
          'Cú pháp: inspect <entity>',
          'error'
        )

        return
      }

      const entity =
        args[0].toLowerCase()

      const path =
        `/entities/${entity}`

      const file =
        filesystem[path]

      if (!file) {
        print(
          `Không tìm thấy thực thể: ${entity}`,
          'error'
        )

        return
      }

      if (
        !canAccess(
          path,
          state
        )
      ) {
        print(
`THỰC THỂ:
${entity.toUpperCase()}

TRẠNG THÁI:
LOCKED

YÊU CẦU PHONG ẤN:
${file.requiredSeal ?? 0}`,
          'warning'
        )

        return
      }

      print(
        file.content ?? ''
      )
    }
  },

  // =========================
  // SCAN
  // =========================

  {
    name: 'scan',

    description:
      'Quét môi trường',

    execute({
      print,
      state
    }) {
      print(
`QUÉT MÔI TRƯỜNG

ÁNH SÁNG:
0.02%

KHÔNG KHÍ:
BÌNH THƯỜNG

NHIỆT ĐỘ:
19.4°C

ĐIỆN:
ỔN ĐỊNH

TÍN HIỆU SINH HỌC:
KHÔNG

TÍN HIỆU KHÔNG XÁC ĐỊNH:
${
  state.currentSeal >= 1
    ? '1'
    : '0'
}

KHOẢNG CÁCH:
${
  state.currentSeal >= 1
    ? '2.4 MÉT'
    : 'N/A'
}`
      )

      if (
        state.currentSeal >= 3
      ) {
        print(
`CẢNH BÁO:

KẾT QUẢ SCAN KHÔNG ĐÁNG TIN CẬY.`,
          'warning'
        )
      }
    }
  },

  // =========================
  // SEALS
  // =========================

  {
    name: 'seals',

    description:
      'Hiển thị trạng thái phong ấn',

    execute({
      print,
      state
    }) {
      const names: string[] = [
        'FEAR — NỖI SỢ',
        'MEMORY — KÝ ỨC',
        'DECEPTION — LỪA DỐI',
        'HUNGER — ĐÓI KHÁT',
        'MADNESS — ĐIÊN LOẠN',
        'HOPE — HY VỌNG',
        'PANDORA'
      ]

      const result =
        state.seals
          .map(
            (
              open,
              index
            ) => {
              const number =
                String(
                  index + 1
                ).padStart(
                  2,
                  '0'
                )

              const name =
                names[index] ??
                'UNKNOWN'

              return (
                `SEAL_${number} ` +
                `[${open ? 'OPEN' : 'LOCKED'}] ` +
                `— ${name}`
              )
            }
          )
          .join('\n')

      print(result)
    }
  },

  // =========================
  // STATUS
  // =========================

  {
    name: 'status',

    description:
      'Hiển thị trạng thái hệ thống',

    execute({
      print,
      state
    }) {
      const user =
        state.currentSeal >= 5
          ? 'PANDORA'
          : 'ADMIN'

      print(
`TRẠNG THÁI HỆ THỐNG

PHIÊN:
${state.session}

PHONG ẤN ĐÃ MỞ:
${state.seals.filter(Boolean).length}/7

TINH THẦN:
${state.sanity}%

MỨC ĐỘ HỎNG:
${state.corruption.toFixed(0)}%

TOÀN VẸN TRÍ NHỚ:
${state.memoryIntegrity}%

NGƯỜI DÙNG:
${user}`
      )
    }
  },

  // =========================
  // WHOAMI
  // =========================

  {
    name: 'whoami',

    description:
      'Xác định người dùng',

    execute({
      print,
      state
    }) {
      if (
        state.currentSeal >= 5
      ) {
        print(
`NGƯỜI DÙNG:
PANDORA

CẢNH BÁO:

PHÁT HIỆN XUNG ĐỘT DANH TÍNH.

PLAYER:
KHÔNG XÁC ĐỊNH`,
          'danger'
        )

        return
      }

      if (
        state.currentSeal >= 3
      ) {
        print(
`NGƯỜI DÙNG:
ADMIN

CẢNH BÁO:

BẢN GHI DANH TÍNH BỊ HỎNG.`,
          'warning'
        )

        return
      }

      print(
        'NGƯỜI DÙNG: ADMIN'
      )
    }
  },

  // =========================
  // HISTORY
  // =========================

  {
    name: 'history',

    description:
      'Xem lịch sử command',

    execute({
      print,
      state
    }) {
      if (
        state.commandHistory.length === 0
      ) {
        print(
          'KHÔNG CÓ LỊCH SỬ COMMAND.'
        )

        return
      }

      print(
        state.commandHistory
          .map(
            (
              command,
              index
            ) =>
              `${index + 1}  ${command}`
          )
          .join('\n')
      )
    }
  },

  // =========================
  // OPEN
  // =========================

  {
    name: 'open',

    description:
      'Mở phong ấn',

    execute({
      print,
      args,
      state
    }) {
      if (!args[0]) {
        print(
          'Cú pháp: open seal_01',
          'error'
        )

        return
      }

      const match =
        args[0].match(
          /seal[_-]?(\d+)/i
        )

      if (!match) {
        print(
          'Phong ấn không hợp lệ.',
          'error'
        )

        return
      }

      const seal =
        Number(
          match[1]
        )

      if (
        seal < 1 ||
        seal > 7
      ) {
        print(
          'Phong ấn phải nằm trong khoảng 01 đến 07.',
          'error'
        )

        return
      }

      const index =
        seal - 1

      /*
       * Vì seal đã được kiểm tra
       * từ 1 đến 7, index chắc chắn
       * nằm trong mảng 7 phần tử.
       */
      const alreadyOpen =
        state.seals[index] ?? false

      if (alreadyOpen) {
        print(
          `SEAL_${String(
            seal
          ).padStart(
            2,
            '0'
          )} ĐÃ ĐƯỢC MỞ.`
        )

        return
      }

      if (
        seal >
        state.currentSeal + 1
      ) {
        print(
`TRUY CẬP BỊ TỪ CHỐI.

SEAL_${String(
  state.currentSeal + 1
).padStart(
  2,
  '0'
)}

PHẢI ĐƯỢC MỞ TRƯỚC.`,
          'warning'
        )

        return
      }

      /*
       * Cập nhật trạng thái.
       */
      state.seals[index] =
        true

      state.currentSeal =
        seal

      state.corruption =
        Math.min(
          100,
          state.corruption + 14
        )

      state.sanity =
        Math.max(
          0,
          state.sanity - 7
        )

      state.memoryIntegrity =
        Math.max(
          0,
          state.memoryIntegrity - 4
        )

      /*
       * Sự kiện của từng phong ấn.
       */
      const events: Record<
        number,
        string
      > = {

        1:
`SEAL_01 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
FEAR — NỖI SỢ

TRẠNG THÁI:
ĐÃ GIẢI PHÓNG

...

...

CÓ THỨ GÌ ĐÓ ĐANG QUAN SÁT BẠN.`,

        2:
`SEAL_02 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
MEMORY — KÝ ỨC

CẢNH BÁO:

TOÀN VẸN TRÍ NHỚ ĐANG GIẢM.

BẠN CÓ NHỚ
TẠI SAO MÌNH ĐẾN ĐÂY KHÔNG?`,

        3:
`SEAL_03 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
DECEPTION — LỪA DỐI

CẢNH BÁO:

PHẢN HỒI CỦA HỆ THỐNG
CÓ THỂ KHÔNG CÒN ĐÁNG TIN.`,

        4:
`SEAL_04 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
HUNGER — ĐÓI KHÁT

...

ĐANG TIÊU THỤ THÔNG TIN:

MỖI COMMAND BẠN NHẬP
ĐỀU KHIẾN NÓ MẠNH HƠN.`,

        5:
`SEAL_05 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
MADNESS — ĐIÊN LOẠN

LỖI HỆ THỐNG:

TERMINAL KHÔNG CÒN
CHỜ INPUT.

NÓ ĐANG QUAN SÁT.`,

        6:
`SEAL_06 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
HOPE — HY VỌNG

ĐÃ TÌM THẤY PROTOCOL MỚI.

HOPE PROTOCOL:
AVAILABLE

CẢNH BÁO:

ĐÂY CÓ THỂ LÀ MỘT CÁI BẪY.`,

        7:
`SEAL_07 ĐÃ ĐƯỢC MỞ.

THỰC THỂ:
PANDORA

...

...

KHÔNG CÓ THỰC THỂ.

KHÔNG CÓ CHIẾC HỘP.

CHỈ CÓ BẠN.`
      }

      /*
       * Dùng ?? để TypeScript biết
       * luôn có text fallback.
       */
      const eventText =
        events[seal] ??
        'PHONG ẤN ĐÃ ĐƯỢC MỞ.'

      print(
        eventText,
        seal >= 5
          ? 'danger'
          : 'warning'
      )

      /*
       * ending trong pandora.ts
       * là boolean, không phải string.
       */
      if (
        seal === 7
      ) {
        state.ending =
          true
      }
    }
  },

  // =========================
  // RESET
  // =========================

  {
    name: 'reset',

    description:
      'Reset game',

    execute({
      print,
      args
    }) {
      if (
        args[0] !==
        '--confirm'
      ) {
        print(
`YÊU CẦU RESET.

Toàn bộ tiến trình sẽ bị xóa.

Gõ:

reset --confirm`,
          'warning'
        )

        return
      }

      print(
        '__RESET__'
      )
    }
  }
]
