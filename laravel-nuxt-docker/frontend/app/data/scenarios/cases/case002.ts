import type { Scenario } from '~/types/games/detective'

const case002: Scenario = {
  id: 'case002',

  /*
   * --------------------------------------------------
   * SCENARIO INFO
   * --------------------------------------------------
   */

  title: {
    en: 'CASE 002 — THE MIDNIGHT TRANSFER',
    vi: 'VỤ ÁN 002 — VỤ CHUYỂN GIAO LÚC NỬA ĐÊM',
  },

  description: {
    en:
      'A suspicious data transfer occurred at 00:17. Investigate the workstation and determine who accessed the confidential files.',

    vi:
      'Một vụ chuyển dữ liệu đáng ngờ xảy ra lúc 00:17. Hãy điều tra máy trạm và xác định ai đã truy cập các tệp bảo mật.',
  },

  initialDirectory: '/',

  /*
   * --------------------------------------------------
   * INTRO
   * --------------------------------------------------
   */

  intro: {
    en: [
      '========================================',
      '          CASE 002',
      '      THE MIDNIGHT TRANSFER',
      '========================================',
      '',
      'Incident report:',
      'A confidential company archive was accessed',
      'shortly after midnight.',
      '',
      'The workstation was left unattended.',
      'Your task is to reconstruct what happened.',
      '',
      'The evidence is hidden inside the filesystem.',
      'Use terminal commands to investigate.',
      '',
      'Useful commands:',
      'ls, cd, cat, find, pwd, history, hint',
    ],

    vi: [
      '========================================',
      '          VỤ ÁN 002',
      '      VỤ CHUYỂN GIAO LÚC NỬA ĐÊM',
      '========================================',
      '',
      'Báo cáo sự việc:',
      'Một kho lưu trữ bảo mật của công ty đã được truy cập',
      'ngay sau nửa đêm.',
      '',
      'Máy trạm bị bỏ lại không có người giám sát.',
      'Nhiệm vụ của bạn là tái dựng lại những gì đã xảy ra.',
      '',
      'Các bằng chứng được ẩn bên trong hệ thống tệp.',
      'Sử dụng các lệnh terminal để điều tra.',
      '',
      'Các lệnh hữu ích:',
      'ls, cd, cat, find, pwd, history, hint',
    ],
  },

  /*
   * --------------------------------------------------
   * FILESYSTEM
   * --------------------------------------------------
   */

  filesystem: [
    {
      type: 'directory',
      name: 'logs',

      children: [
        {
          type: 'file',
          name: 'access.log',

          content: {
            en: `[00:03:12] user=alice login successful
[00:08:44] user=alice opened terminal
[00:12:31] user=alice accessed /documents
[00:17:42] USB DEVICE CONNECTED
[00:18:03] external storage mounted
[00:19:11] archive.zip copied to external device`,

            vi: `[00:03:12] user=alice login successful
[00:08:44] user=alice opened terminal
[00:12:31] user=alice accessed /documents
[00:17:42] USB DEVICE CONNECTED
[00:18:03] external storage mounted
[00:19:11] archive.zip copied to external device`,
          },
        },

        {
          type: 'file',
          name: 'system.log',

          content: {
            en: `[00:15:02] system status: normal
[00:16:48] network connection established
[00:17:42] USB DEVICE CONNECTED
[00:17:45] device=/dev/usb0
[00:18:01] filesystem mounted
[00:20:04] USB DEVICE DISCONNECTED`,

            vi: `[00:15:02] system status: bình thường
[00:16:48] kết nối mạng được thiết lập
[00:17:42] THIẾT BỊ USB ĐƯỢC KẾT NỐI
[00:17:45] thiết bị=/dev/usb0
[00:18:01] hệ thống tệp được gắn kết
[00:20:04] THIẾT BỊ USB ĐÃ NGẮT KẾT NỐI`,
          },
        },

        {
          type: 'directory',
          name: 'archive',

          children: [
            {
              type: 'file',
              name: 'old.log',

              content: {
                en: `[23:41:02] backup completed
[23:59:59] scheduled task completed`,

                vi: `[23:41:02] sao lưu hoàn tất
[23:59:59] tác vụ theo lịch hoàn tất`,
              },
            },
          ],
        },
      ],
    },

    {
      type: 'directory',
      name: 'documents',

      children: [
        {
          type: 'file',
          name: 'employee-list.txt',

          content: {
            en: `Employee Directory

Alice Morgan
Department: Finance
Employee ID: EMP-1042

Bob Carter
Department: IT
Employee ID: EMP-1031

Daniel Reed
Department: Security
Employee ID: EMP-1098`,

            vi: `DANH BẠ NHÂN VIÊN

Alice Morgan
Phòng ban: Tài chính
Mã nhân viên: EMP-1042

Bob Carter
Phòng ban: CNTT
Mã nhân viên: EMP-1031

Daniel Reed
Phòng ban: An ninh
Mã nhân viên: EMP-1098`,
          },
        },

        {
          type: 'file',
          name: 'confidential.txt',

          content: {
            en: `CONFIDENTIAL

Project: Orion
Classification: RESTRICTED

Authorized personnel:
- Alice Morgan
- Daniel Reed

Last access:
00:17:58

Access method:
EXTERNAL USB DEVICE`,

            vi: `BẢO MẬT

Dự án: Orion
Phân loại: HẠN CHẾ

Nhân sự được cấp quyền:
- Alice Morgan
- Daniel Reed

Lần truy cập cuối:
00:17:58

Phương thức truy cập:
THIẾT BỊ USB BÊN NGOÀI`,
          },
        },

        {
          type: 'directory',
          name: 'reports',

          children: [
            {
              type: 'file',
              name: 'security-report.txt',

              content: {
                en: `SECURITY REPORT

Incident date: 2026-08-31

A temporary security exception was created
at 00:16:51.

Exception owner:
Daniel Reed

Reason:
Emergency maintenance.`,

                vi: `BÁO CÁO AN NINH

Ngày xảy ra sự việc: 2026-08-31

Một ngoại lệ bảo mật tạm thời được tạo
vào lúc 00:16:51.

Người tạo ngoại lệ:
Daniel Reed

Lý do:
Bảo trì khẩn cấp.`,
              },
            },
          ],
        },
      ],
    },

    {
      type: 'directory',
      name: 'usb',

      children: [
        {
          type: 'file',
          name: 'device-info.txt',

          content: {
            en: `USB DEVICE INFORMATION

Device ID: USB-7782
Manufacturer: SecureDrive
Serial: SD-88421-X

Connection:
00:17:42

Disconnection:
00:20:04`,

            vi: `THÔNG TIN THIẾT BỊ USB

Mã thiết bị: USB-7782
Nhà sản xuất: SecureDrive
Số serial: SD-88421-X

Kết nối:
00:17:42

Ngắt kết nối:
00:20:04`,
          },
        },

        {
          type: 'file',
          name: 'transfer.log',

          content: {
            en: `TRANSFER LOG

[00:18:22] archive.zip
[00:18:23] 148 MB
[00:18:24] transfer started
[00:19:11] transfer completed

Destination:
USB-7782`,

            vi: `NHẬT KÝ CHUYỂN DỮ LIỆU

[00:18:22] archive.zip
[00:18:23] 148 MB
[00:18:24] bắt đầu chuyển dữ liệu
[00:19:11] chuyển dữ liệu hoàn tất

Đích:
USB-7782`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'email',

      children: [
        {
          type: 'file',
          name: 'inbox.txt',

          content: {
            en: `EMAIL INBOX

From: daniel.reed@company.local
To: alice.morgan@company.local
Time: 23:58

Subject: Emergency maintenance

Please leave the workstation unlocked tonight.
I need to perform a maintenance check.

- Daniel`,

            vi: `HỘP THƯ ĐẾN

From: daniel.reed@company.local
To: alice.morgan@company.local
Time: 23:58

Subject: Bảo trì khẩn cấp

Vui lòng để máy trạm mở khóa tối nay.
Tôi cần thực hiện kiểm tra bảo trì.

- Daniel`,
          },
        },

        {
          type: 'file',
          name: 'sent.txt',

          content: {
            en: `SENT EMAIL

From: alice.morgan@company.local
To: daniel.reed@company.local
Time: 00:21

Subject: Re: Emergency maintenance

I did not authorize any transfer of Project Orion.`,

            vi: `EMAIL ĐÃ GỬI

From: alice.morgan@company.local
To: daniel.reed@company.local
Time: 00:21

Subject: Re: Bảo trì khẩn cấp

Tôi không cho phép bất kỳ việc chuyển giao nào
của Dự án Orion.`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'notes',

      children: [
        {
          type: 'file',
          name: 'investigation.txt',

          content: {
            en: `PRIVATE INVESTIGATION NOTES

The workstation owner is Alice.

Daniel requested access to the machine
for emergency maintenance.

Check the USB connection time against
the confidential archive access.`,

            vi: `GHI CHÚ ĐIỀU TRA RIÊNG

Chủ sở hữu máy trạm là Alice.

Daniel yêu cầu quyền truy cập vào máy
để thực hiện bảo trì khẩn cấp.

Hãy đối chiếu thời gian kết nối USB
với thời điểm truy cập kho lưu trữ bảo mật.`,
          },
        },
      ],
    },
  ],

  /*
   * --------------------------------------------------
   * EVIDENCE
   * --------------------------------------------------
   */

  evidence: [
    {
      id: 'evidence-002-01',

      title: {
        en: 'Unauthorized USB Device',
        vi: 'Thiết bị USB không được phép',
      },

      description: {
        en:
          'A USB device was connected to the workstation at 00:17:42.',

        vi:
          'Một thiết bị USB đã được kết nối với máy trạm lúc 00:17:42.',
      },

      type: 'digital',

      hint: {
        en:
          'Check the system logs. Look for unusual hardware connections.',

        vi:
          'Hãy kiểm tra nhật ký hệ thống. Tìm các kết nối phần cứng bất thường.',
      },

      discover: {
        type: 'cat',
        path: '/logs/system.log',
      },

      highlight: {
        en: [
          'USB DEVICE CONNECTED',
          '00:17:42',
          '/dev/usb0',
        ],

        vi: [
          'THIẾT BỊ USB ĐƯỢC KẾT NỐI',
          '00:17:42',
          '/dev/usb0',
        ],
      },

      requiresEvidence: [],

      discovered: false,
    },

    {
      id: 'evidence-002-02',

      title: {
        en: 'Confidential Archive Transfer',
        vi: 'Chuyển kho lưu trữ bảo mật',
      },

      description: {
        en:
          'The confidential archive was copied to the connected USB device.',

        vi:
          'Kho lưu trữ bảo mật đã được sao chép vào thiết bị USB được kết nối.',
      },

      type: 'digital',

      hint: {
        en:
          'Investigate the USB directory and look for a transfer log.',

        vi:
          'Hãy điều tra thư mục USB và tìm nhật ký chuyển dữ liệu.',
      },

      discover: {
        type: 'cat',
        path: '/usb/transfer.log',
      },

      highlight: {
        en: [
          'archive.zip',
          '148 MB',
          'transfer completed',
          'USB-7782',
        ],

        vi: [
          'archive.zip',
          '148 MB',
          'chuyển dữ liệu hoàn tất',
          'USB-7782',
        ],
      },

      requiresEvidence: [
        'evidence-002-01',
      ],

      discovered: false,
    },

    {
      id: 'evidence-002-03',

      title: {
        en: 'Security Exception Created',
        vi: 'Ngoại lệ bảo mật được tạo',
      },

      description: {
        en:
          'A temporary security exception was created shortly before the USB device was connected. The exception was owned by Daniel Reed.',

        vi:
          'Một ngoại lệ bảo mật tạm thời được tạo ngay trước khi thiết bị USB được kết nối. Ngoại lệ này thuộc về Daniel Reed.',
      },

      type: 'document',

      hint: {
        en:
          'Search the reports directory for security-related information.',

        vi:
          'Hãy tìm kiếm thông tin liên quan đến an ninh trong thư mục báo cáo.',
      },

      discover: {
        type: 'cat',
        path: '/documents/reports/security-report.txt',
      },

      highlight: {
        en: [
          '00:16:51',
          'Exception owner:',
          'Daniel Reed',
          'Emergency maintenance',
        ],

        vi: [
          '00:16:51',
          'Người tạo ngoại lệ:',
          'Daniel Reed',
          'Bảo trì khẩn cấp',
        ],
      },

      requiresEvidence: [],

      discovered: false,
    },

    {
      id: 'evidence-002-04',

      title: {
        en: 'Maintenance Request',
        vi: 'Yêu cầu bảo trì',
      },

      description: {
        en:
          'Daniel Reed asked Alice to leave the workstation unlocked for emergency maintenance.',

        vi:
          'Daniel Reed yêu cầu Alice để máy trạm mở khóa để thực hiện bảo trì khẩn cấp.',
      },

      type: 'document',

      hint: {
        en:
          'Check the email inbox for messages sent shortly before the incident.',

        vi:
          'Hãy kiểm tra hộp thư đến để tìm các tin nhắn được gửi ngay trước sự việc.',
      },

      discover: {
        type: 'cat',
        path: '/email/inbox.txt',
      },

      highlight: {
        en: [
          'daniel.reed@company.local',
          '23:58',
          'leave the workstation unlocked',
          'maintenance',
        ],

        vi: [
          'daniel.reed@company.local',
          '23:58',
          'để máy trạm mở khóa',
          'bảo trì',
        ],
      },

      requiresEvidence: [],

      discovered: false,
    },

    {
      id: 'evidence-002-05',

      title: {
        en: 'Unauthorized Transfer',
        vi: 'Chuyển dữ liệu trái phép',
      },

      description: {
        en:
          'Alice explicitly denied authorizing the transfer after the incident.',

        vi:
          'Alice đã khẳng định rằng cô không cho phép việc chuyển dữ liệu sau sự việc.',
      },

      type: 'document',

      hint: {
        en:
          'Look at the sent email after the incident.',

        vi:
          'Hãy kiểm tra email đã gửi sau khi sự việc xảy ra.',
      },

      discover: {
        type: 'cat',
        path: '/email/sent.txt',
      },

      highlight: {
        en: [
          '00:21',
          'I did not authorize any transfer',
          'Project Orion',
        ],

        vi: [
          '00:21',
          'Tôi không cho phép bất kỳ việc chuyển giao nào',
          'Dự án Orion',
        ],
      },

      requiresEvidence: [
        'evidence-002-02',
      ],

      discovered: false,
    },
  ],

  /*
   * --------------------------------------------------
   * TASKS
   * --------------------------------------------------
   */

  tasks: [
    {
      id: 'task-002-01',

      title: {
        en: 'Identify the USB connection',
        vi: 'Xác định kết nối USB',
      },

      description: {
        en:
          'Determine when the suspicious USB device was connected.',

        vi:
          'Xác định thời điểm thiết bị USB đáng ngờ được kết nối.',
      },

      requiresEvidence: [
        'evidence-002-01',
      ],

      completed: false,
    },

    {
      id: 'task-002-02',

      title: {
        en: 'Confirm the data transfer',
        vi: 'Xác nhận việc chuyển dữ liệu',
      },

      description: {
        en:
          'Establish that the confidential archive was copied to the USB device.',

        vi:
          'Xác nhận rằng kho lưu trữ bảo mật đã được sao chép vào thiết bị USB.',
      },

      requiresEvidence: [
        'evidence-002-01',
        'evidence-002-02',
      ],

      completed: false,
    },

    {
      id: 'task-002-03',

      title: {
        en: 'Identify the suspicious authorization',
        vi: 'Xác định quyền cấp phép đáng ngờ',
      },

      description: {
        en:
          'Determine who created the security exception before the incident.',

        vi:
          'Xác định ai đã tạo ngoại lệ bảo mật trước khi sự việc xảy ra.',
      },

      requiresEvidence: [
        'evidence-002-03',
      ],

      completed: false,
    },

    {
      id: 'task-002-04',

      title: {
        en: 'Connect the evidence',
        vi: 'Liên kết các bằng chứng',
      },

      description: {
        en:
          'Establish the connection between the USB transfer and Daniel Reed.',

        vi:
          'Xác lập mối liên hệ giữa vụ chuyển dữ liệu qua USB và Daniel Reed.',
      },

      requiresEvidence: [
        'evidence-002-02',
        'evidence-002-03',
        'evidence-002-04',
        'evidence-002-05',
      ],

      completed: false,
    },
  ],
}

export default case002
