import type {
  Scenario,
} from '~/types/games/detective'

export const case001: Scenario = {
  id: 'case001',

  /*
   * --------------------------------------------------
   * SCENARIO INFO
   * --------------------------------------------------
   */

  title: {
    en: 'THE MIDNIGHT TERMINAL',

    vi: 'THIẾT BỊ ĐẦU CUỐI LÚC NỬA ĐÊM',
  },

  description: {
    en:
      'Alex Morgan disappeared from his office at approximately 23:50. His workstation was left unlocked.',

    vi:
      'Alex Morgan biến mất khỏi văn phòng vào khoảng 23:50. Máy tính làm việc của anh ta vẫn được mở khóa.',
  },

  initialDirectory: '/',

  /*
   * --------------------------------------------------
   * INTRO
   * --------------------------------------------------
   */

  intro: {
    en: [
      'DETECTIVE TERMINAL v1.0',
      '----------------------------------------',
      'CASE: THE MIDNIGHT TERMINAL',
      '',
      'Alex Morgan disappeared from his office',
      'at approximately 23:50.',
      '',
      'His workstation was left unlocked.',
      '',
      'Your objective:',
      'Investigate the filesystem.',
      'Find the evidence.',
      'Identify the suspect.',
      '',
      'Type "help" to see available commands.',
    ],

    vi: [
      'DETECTIVE TERMINAL v1.0',
      '----------------------------------------',
      'VỤ ÁN: THIẾT BỊ ĐẦU CUỐI LÚC NỬA ĐÊM',
      '',
      'Alex Morgan biến mất khỏi văn phòng',
      'vào khoảng 23:50.',
      '',
      'Máy tính làm việc của anh ta vẫn được mở khóa.',
      '',
      'Mục tiêu của bạn:',
      'Điều tra hệ thống tệp.',
      'Tìm bằng chứng.',
      'Xác định nghi phạm.',
      '',
      'Gõ "help" để xem các lệnh khả dụng.',
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

          name: 'system.log',

          content: {
            en: `[23:41:02] USER LOGIN: alex
[23:43:11] FILE ACCESS: /documents/project.txt
[23:47:55] COMMAND EXECUTED: mount /dev/usb0
[23:48:01] USB DEVICE CONNECTED: UNKNOWN-USB
[23:48:04] FILE COPIED: /documents/project.txt
[23:49:22] CAMERA SERVICE STOPPED
[23:50:03] USER SESSION LOCKED`,

            vi: `[23:41:02] USER LOGIN: alex
[23:43:11] FILE ACCESS: /documents/project.txt
[23:47:55] COMMAND EXECUTED: mount /dev/usb0
[23:48:01] USB DEVICE CONNECTED: UNKNOWN-USB
[23:48:04] FILE COPIED: /documents/project.txt
[23:49:22] CAMERA SERVICE STOPPED
[23:50:03] USER SESSION LOCKED`,
          },
        },

        {
          type: 'file',

          name: 'access.log',

          content: {
            en: `[23:38:11] OFFICE DOOR OPENED
[23:43:08] OFFICE DOOR OPENED
[23:49:58] OFFICE DOOR OPENED
[23:51:04] OFFICE DOOR CLOSED`,

            vi: `[23:38:11] OFFICE DOOR OPENED
[23:43:08] OFFICE DOOR OPENED
[23:49:58] OFFICE DOOR OPENED
[23:51:04] OFFICE DOOR CLOSED`,
          },
        },

        {
          type: 'file',

          name: 'network.log',

          content: {
            en: `[23:46:21] OUTBOUND CONNECTION
HOST: secure-mail.local
PORT: 443

[23:47:10] CONNECTION ESTABLISHED

[23:50:12] CONNECTION CLOSED`,

            vi: `[23:46:21] OUTBOUND CONNECTION
HOST: secure-mail.local
PORT: 443

[23:47:10] CONNECTION ESTABLISHED

[23:50:12] CONNECTION CLOSED`,
          },
        },
      ],
    },

    {
      type: 'directory',

      name: 'documents',

      children: [
        {
          type: 'file',

          name: 'project.txt',

          content: {
            en: `PROJECT NIGHTFALL

Subject:
Transfer protocol

Meeting:
23:45

Location:
Parking level B2

Instruction:
Do not trust internal channels.`,

            vi: `DỰ ÁN NIGHTFALL

Chủ đề:
Giao thức chuyển giao

Cuộc gặp:
23:45

Địa điểm:
Bãi đỗ xe tầng B2

Chỉ thị:
Không được tin tưởng các kênh nội bộ.`,
          },
        },

        {
          type: 'file',

          name: 'meeting.enc',

          content: {
            en: `ENCRYPTED DATA

4D 41 52 43 55 53
52 45 45 44

KEY:
NIGHTFALL

STATUS:
PARTIALLY DECRYPTED`,

            vi: `DỮ LIỆU ĐÃ MÃ HÓA

4D 41 52 43 55 53
52 45 45 44

KHÓA:
NIGHTFALL

TRẠNG THÁI:
GIẢI MÃ MỘT PHẦN`,
          },
        },

        {
          type: 'file',

          name: 'notes.txt',

          content: {
            en: `NOTES

Nightfall project is confidential.

Marcus requested access
to the project documentation.

Alex refused.`,

            vi: `GHI CHÚ

Dự án Nightfall là thông tin mật.

Marcus yêu cầu quyền truy cập
vào tài liệu của dự án.

Alex đã từ chối.`,
          },
        },
      ],
    },

    {
      type: 'directory',

      name: 'emails',

      children: [
        {
          type: 'file',

          name: 'inbox.txt',

          content: {
            en: `INBOX

----------------------------------------

FROM:
unknown@secure-mail.local

TO:
alex@company.local

TIME:
23:32

SUBJECT:
Tonight

MESSAGE:
Meet me at parking B2.
Come alone.

----------------------------------------

FROM:
marcus@company.local

TO:
alex@company.local

TIME:
22:17

SUBJECT:
Project

MESSAGE:
We need to discuss the Nightfall
project tomorrow.`,

            vi: `HỘP THƯ ĐẾN

----------------------------------------

FROM:
unknown@secure-mail.local

TO:
alex@company.local

TIME:
23:32

SUBJECT:
Tối nay

MESSAGE:
Gặp tôi tại bãi đỗ xe B2.
Hãy đi một mình.

----------------------------------------

FROM:
marcus@company.local

TO:
alex@company.local

TIME:
22:17

SUBJECT:
Dự án

MESSAGE:
Chúng ta cần thảo luận về dự án
Nightfall vào ngày mai.`,
          },
        },

        {
          type: 'file',

          name: 'sent.txt',

          content: {
            en: `SENT

FROM:
alex@company.local

TO:
unknown@secure-mail.local

TIME:
23:36

MESSAGE:
I will be there.`,

            vi: `ĐÃ GỬI

FROM:
alex@company.local

TO:
unknown@secure-mail.local

TIME:
23:36

MESSAGE:
Tôi sẽ đến đó.`,
          },
        },
      ],
    },

    {
      type: 'directory',

      name: 'usb',

      children: [
        {
          type: 'file',

          name: 'device.txt',

          content: {
            en: `USB DEVICE REPORT

Vendor:
UNKNOWN

Serial:
USB-8841-X

Connected:
23:48:01

Removed:
23:50:17

Status:
SUSPICIOUS`,

            vi: `BÁO CÁO THIẾT BỊ USB

Nhà sản xuất:
UNKNOWN

Serial:
USB-8841-X

Kết nối:
23:48:01

Ngắt kết nối:
23:50:17

Trạng thái:
ĐÁNG NGỜ`,
          },
        },

        {
          type: 'file',

          name: 'files.txt',

          content: {
            en: `USB CONTENT

project.txt
meeting.enc

COPY TIME:
23:48:04`,

            vi: `NỘI DUNG USB

project.txt
meeting.enc

THỜI GIAN SAO CHÉP:
23:48:04`,
          },
        },
      ],
    },

    {
      type: 'directory',

      name: 'camera',

      children: [
        {
          type: 'file',

          name: 'parking.txt',

          content: {
            en: `CAMERA FOOTAGE

23:43

A person wearing a dark hoodie
entered the office.

23:49

The same person exited
toward parking level B2.

23:50

Camera service stopped.

Face recognition:
UNAVAILABLE`,

            vi: `HÌNH ẢNH CAMERA

23:43

Một người mặc áo hoodie tối màu
đã bước vào văn phòng.

23:49

Người này rời đi
về phía bãi đỗ xe tầng B2.

23:50

Dịch vụ camera bị dừng.

Nhận diện khuôn mặt:
KHÔNG KHẢ DỤNG`,
          },
        },

        {
          type: 'file',

          name: 'office.txt',

          content: {
            en: `OFFICE CAMERA

23:42
Alex enters the office.

23:43
Unknown person enters.

23:49
Unknown person leaves.

23:50
Alex session becomes locked.`,

            vi: `CAMERA VĂN PHÒNG

23:42
Alex bước vào văn phòng.

23:43
Một người không rõ danh tính bước vào.

23:49
Người không rõ danh tính rời đi.

23:50
Phiên làm việc của Alex bị khóa.`,
          },
        },
      ],
    },

    {
      type: 'directory',

      name: 'parking',

      children: [
        {
          type: 'file',

          name: 'access.log',

          content: {
            en: `PARKING ACCESS LOG

23:51:12

CARD:
MR-8841

OWNER:
Marcus Reed

LOCATION:
Parking Level B2

STATUS:
MATCH CONFIRMED`,

            vi: `NHẬT KÝ RA VÀO BÃI ĐỖ XE

23:51:12

THẺ:
MR-8841

CHỦ SỞ HỮU:
Marcus Reed

ĐỊA ĐIỂM:
Bãi đỗ xe tầng B2

TRẠNG THÁI:
ĐÃ XÁC NHẬN TRÙNG KHỚP`,
          },
        },
      ],
    },

    {
      type: 'directory',

      name: 'system',

      children: [
        {
          type: 'file',

          name: 'users.txt',

          content: {
            en: `SYSTEM USERS

alex
marcus
admin
guest`,

            vi: `NGƯỜI DÙNG HỆ THỐNG

alex
marcus
admin
guest`,
          },
        },

        {
          type: 'file',

          name: 'hostname.txt',

          content: {
            en: `HOSTNAME

ALEX-WORKSTATION-01`,

            vi: `TÊN MÁY CHỦ

ALEX-WORKSTATION-01`,
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
      id: 'terminal-log',

      title: {
        en: 'Terminal Activity Log',
        vi: 'Nhật ký hoạt động Terminal',
      },

      description: {
        en:
          'The system log shows that an unknown USB device was mounted shortly before Alex disappeared.',

        vi:
          'Nhật ký hệ thống cho thấy một thiết bị USB không xác định đã được kết nối ngay trước khi Alex biến mất.',
      },

      type: 'digital',

      hint: {
        en:
          'Something unusual happened shortly before the workstation was locked. Look for system activity.',

        vi:
          'Có điều bất thường xảy ra ngay trước khi máy tính bị khóa. Hãy kiểm tra hoạt động hệ thống.',
      },

      discover: {
        type: 'cat',
        path: '/logs/system.log',
      },

      highlight: {
        en: [
          'USB DEVICE CONNECTED',
          'UNKNOWN-USB',
          'FILE COPIED',
        ],

        vi: [
          'USB DEVICE CONNECTED',
          'UNKNOWN-USB',
          'FILE COPIED',
        ],
      },

      discovered: false,
    },

    {
      id: 'access-log',

      title: {
        en: 'Office Access Log',
        vi: 'Nhật ký ra vào văn phòng',
      },

      description: {
        en:
          'The office door was opened several times around the disappearance.',

        vi:
          'Cửa văn phòng được mở nhiều lần xung quanh thời điểm Alex biến mất.',
      },

      type: 'digital',

      hint: {
        en:
          'Someone physically entered the office around the time of the incident. Investigate access records.',

        vi:
          'Có người đã trực tiếp vào văn phòng vào thời điểm xảy ra vụ việc. Hãy kiểm tra nhật ký ra vào.',
      },

      discover: {
        type: 'cat',
        path: '/logs/access.log',
      },

      highlight: {
        en: [
          '23:49:58',
          'OFFICE DOOR OPENED',
        ],

        vi: [
          '23:49:58',
          'OFFICE DOOR OPENED',
        ],
      },

      discovered: false,
    },

    {
      id: 'project-document',

      title: {
        en: 'Nightfall Project Document',
        vi: 'Tài liệu dự án Nightfall',
      },

      description: {
        en:
          'The document mentions a meeting at parking level B2 and warns Alex not to trust internal channels.',

        vi:
          'Tài liệu đề cập đến một cuộc gặp tại bãi đỗ xe tầng B2 và cảnh báo Alex không được tin tưởng các kênh nội bộ.',
      },

      type: 'document',

      hint: {
        en:
          'There may be a project document containing information about the meeting.',

        vi:
          'Có thể có một tài liệu dự án chứa thông tin về cuộc gặp.',
      },

      discover: {
        type: 'cat',
        path: '/documents/project.txt',
      },

      highlight: {
        en: [
          'Transfer protocol',
          'Parking level B2',
          'Do not trust internal channels',
        ],

        vi: [
          'Giao thức chuyển giao',
          'Bãi đỗ xe tầng B2',
          'Không được tin tưởng các kênh nội bộ',
        ],
      },

      discovered: false,
    },

    {
      id: 'suspicious-email',

      title: {
        en: 'Suspicious Email',
        vi: 'Email đáng ngờ',
      },

      description: {
        en:
          'An unknown sender instructed Alex to meet at parking level B2 and come alone.',

        vi:
          'Một người gửi không xác định yêu cầu Alex gặp tại bãi đỗ xe tầng B2 và đi một mình.',
      },

      type: 'document',

      hint: {
        en:
          'Someone contacted Alex shortly before the incident. Investigate the email records.',

        vi:
          'Có người đã liên lạc với Alex ngay trước vụ việc. Hãy kiểm tra nhật ký email.',
      },

      discover: {
        type: 'cat',
        path: '/emails/inbox.txt',
      },

      highlight: {
        en: [
          'unknown@secure-mail.local',
          'Meet me at parking B2.',
          'Come alone.',
        ],

        vi: [
          'unknown@secure-mail.local',
          'Gặp tôi tại bãi đỗ xe B2.',
          'Hãy đi một mình.',
        ],
      },

      discovered: false,
    },

    {
      id: 'sent-message',

      title: {
        en: 'Alex Sent a Reply',
        vi: 'Alex đã gửi phản hồi',
      },

      description: {
        en:
          'Alex replied to the unknown sender and agreed to meet.',

        vi:
          'Alex đã trả lời người gửi không xác định và đồng ý gặp mặt.',
      },

      type: 'document',

      hint: {
        en:
          'The incoming message may not be the whole story. Look for outgoing communication.',

        vi:
          'Tin nhắn đến có thể chưa phải toàn bộ câu chuyện. Hãy tìm các liên lạc được gửi đi.',
      },

      discover: {
        type: 'cat',
        path: '/emails/sent.txt',
      },

      requiresEvidence: [
        'suspicious-email',
      ],

      discovered: false,
    },

    {
      id: 'usb-device',

      title: {
        en: 'Unknown USB Device',
        vi: 'Thiết bị USB không xác định',
      },

      description: {
        en:
          'USB-8841-X was connected at 23:48:01 and removed at 23:50:17.',

        vi:
          'USB-8841-X được kết nối lúc 23:48:01 và được tháo ra lúc 23:50:17.',
      },

      type: 'digital',

      hint: {
        en:
          'The system activity mentioned an external device. Investigate removable media.',

        vi:
          'Hoạt động hệ thống đề cập đến một thiết bị bên ngoài. Hãy điều tra thiết bị lưu trữ di động.',
      },

      discover: {
        type: 'cat',
        path: '/usb/device.txt',
      },

      highlight: {
        en: [
          'UNKNOWN',
          'USB-8841-X',
          '23:48:01',
          'SUSPICIOUS',
        ],

        vi: [
          'UNKNOWN',
          'USB-8841-X',
          '23:48:01',
          'ĐÁNG NGỜ',
        ],
      },

      requiresEvidence: [
        'terminal-log',
      ],

      discovered: false,
    },

    {
      id: 'usb-files',

      title: {
        en: 'Copied Project Files',
        vi: 'Các tệp dự án đã sao chép',
      },

      description: {
        en:
          'The USB contained copies of project.txt and meeting.enc.',

        vi:
          'USB chứa các bản sao của project.txt và meeting.enc.',
      },

      type: 'digital',

      hint: {
        en:
          'The suspicious USB may reveal what was copied from the workstation.',

        vi:
          'Chiếc USB đáng ngờ có thể cho biết những gì đã được sao chép khỏi máy tính.',
      },

      discover: {
        type: 'cat',
        path: '/usb/files.txt',
      },

      requiresEvidence: [
        'usb-device',
      ],

      discovered: false,
    },

    {
      id: 'encrypted-meeting',

      title: {
        en: 'Encrypted Meeting File',
        vi: 'Tệp cuộc gặp được mã hóa',
      },

      description: {
        en:
          'The encrypted data contains the name MARCUS REED.',

        vi:
          'Dữ liệu được mã hóa chứa tên MARCUS REED.',
      },

      type: 'document',

      hint: {
        en:
          'A suspicious encrypted document may connect the project to a person.',

        vi:
          'Một tài liệu được mã hóa đáng ngờ có thể liên kết dự án với một người cụ thể.',
      },

      discover: {
        type: 'cat',
        path: '/documents/meeting.enc',
      },

      requiresEvidence: [
        'project-document',
        'usb-files',
      ],

      highlight: {
        en: [
          '4D 41 52 43 55 53',
          '52 45 45 44',
          'MARCUS REED',
        ],

        vi: [
          '4D 41 52 43 55 53',
          '52 45 45 44',
          'MARCUS REED',
        ],
      },

      discovered: false,
    },

    {
      id: 'camera-footage',

      title: {
        en: 'Security Camera Footage',
        vi: 'Hình ảnh camera an ninh',
      },

      description: {
        en:
          'Camera footage shows an unknown person entering the office and leaving toward parking level B2.',

        vi:
          'Camera cho thấy một người không xác định bước vào văn phòng và rời đi về phía bãi đỗ xe tầng B2.',
      },

      type: 'photo',

      hint: {
        en:
          'Someone entered the office and later moved toward parking B2. Check the surveillance records.',

        vi:
          'Có người bước vào văn phòng rồi di chuyển về phía bãi đỗ xe B2. Hãy kiểm tra camera giám sát.',
      },

      discover: {
        type: 'cat',
        path: '/camera/parking.txt',
      },

      highlight: {
        en: [
          '23:43',
          'A person wearing a dark hoodie',
          'parking level B2',
          'Camera service stopped',
        ],

        vi: [
          '23:43',
          'Một người mặc áo hoodie tối màu',
          'bãi đỗ xe tầng B2',
          'Dịch vụ camera bị dừng',
        ],
      },

      requiresEvidence: [
        'access-log',
      ],

      discovered: false,
    },

    {
      id: 'parking-trace',

      title: {
        en: 'Parking Access Trace',
        vi: 'Dấu vết ra vào bãi đỗ xe',
      },

      description: {
        en:
          'Parking card MR-8841 belongs to Marcus Reed.',

        vi:
          'Thẻ ra vào bãi đỗ xe MR-8841 thuộc về Marcus Reed.',
      },

      type: 'object',

      hint: {
        en:
          'The camera trail leads toward parking level B2. Investigate the parking access records.',

        vi:
          'Dấu vết từ camera dẫn đến bãi đỗ xe tầng B2. Hãy kiểm tra nhật ký ra vào bãi đỗ xe.',
      },

      discover: {
        type: 'cat',
        path: '/parking/access.log',
      },

      highlight: {
        en: [
          'MR-8841',
          'Marcus Reed',
          'Parking Level B2',
          'MATCH CONFIRMED',
        ],

        vi: [
          'MR-8841',
          'Marcus Reed',
          'Bãi đỗ xe tầng B2',
          'ĐÃ XÁC NHẬN TRÙNG KHỚP',
        ],
      },

      requiresEvidence: [
        'camera-footage',
        'encrypted-meeting',
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
      id: 'inspect-terminal',

      title: {
        en: 'Inspect terminal activity',
        vi: 'Kiểm tra hoạt động terminal',
      },

      description: {
        en:
          'Determine what happened shortly before the workstation was locked.',

        vi:
          'Xác định điều gì đã xảy ra ngay trước khi máy tính bị khóa.',
      },

      requiresEvidence: [
        'terminal-log',
      ],

      completed: false,
    },

    {
      id: 'investigate-communication',

      title: {
        en: 'Investigate communication',
        vi: 'Điều tra liên lạc',
      },

      description: {
        en:
          'Find out whether Alex was contacted before disappearing.',

        vi:
          'Tìm hiểu xem Alex có nhận được liên lạc trước khi biến mất hay không.',
      },

      requiresEvidence: [
        'suspicious-email',
        'sent-message',
      ],

      completed: false,
    },

    {
      id: 'investigate-usb',

      title: {
        en: 'Investigate the USB device',
        vi: 'Điều tra thiết bị USB',
      },

      description: {
        en:
          'Determine what external device was connected and what it contained.',

        vi:
          'Xác định thiết bị bên ngoài nào đã được kết nối và nó chứa những gì.',
      },

      requiresEvidence: [
        'terminal-log',
        'usb-device',
        'usb-files',
      ],

      completed: false,
    },

    {
      id: 'identify-suspect',

      title: {
        en: 'Identify the suspect',
        vi: 'Xác định nghi phạm',
      },

      description: {
        en:
          'Connect the digital, physical and parking evidence to a suspect.',

        vi:
          'Liên kết các bằng chứng kỹ thuật số, vật lý và bãi đỗ xe với một nghi phạm.',
      },

      requiresEvidence: [
        'encrypted-meeting',
        'camera-footage',
        'parking-trace',
      ],

      completed: false,
    },
  ],
}