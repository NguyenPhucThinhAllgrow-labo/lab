import type { Scenario } from '~/types/games/detective'

export const case003: Scenario = {
  id: 'case003',

  /*
   * --------------------------------------------------
   * SCENARIO INFO
   * --------------------------------------------------
   */

  title: {
    en: 'THE GHOST PROTOCOL',
    vi: 'GIAO THỨC BÓNG MA',
  },

  description: {
    en:
      'At 02:17, the company security system detected an unauthorized transfer of a classified research archive. At 02:19, the lead researcher Daniel Cross was found unconscious inside a locked server room. The access logs identify Daniel as the last person to enter. However, network records suggest that someone else was operating his account.',

    vi:
      'Lúc 02:17, hệ thống an ninh của công ty phát hiện một vụ chuyển giao trái phép kho nghiên cứu mật. Lúc 02:19, trưởng nhóm nghiên cứu Daniel Cross được phát hiện bất tỉnh bên trong một phòng máy chủ bị khóa. Nhật ký ra vào xác định Daniel là người cuối cùng bước vào. Tuy nhiên, các bản ghi mạng cho thấy có người khác đang sử dụng tài khoản của anh ấy.',
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
      'CASE: THE GHOST PROTOCOL',
      '',
      '02:17:42',
      'CLASSIFIED DATA TRANSFER DETECTED.',
      '',
      '02:19:08',
      'RESEARCHER DANIEL CROSS',
      'FOUND UNCONSCIOUS INSIDE SERVER ROOM 4.',
      '',
      'The server room was locked from the inside.',
      '',
      'No obvious signs of forced entry were found.',
      '',
      'Initial access records identify',
      'Daniel Cross as the last authorized user.',
      '',
      'But network telemetry tells a different story.',
      '',
      'Your objective:',
      'Reconstruct the timeline.',
      'Determine how the breach occurred.',
      'Identify who controlled Daniel\'s account.',
      'Separate the real evidence from fabricated evidence.',
      'Identify the person responsible.',
      '',
      'WARNING:',
      'Some logs may have been modified.',
      '',
      'Type "help" to see available commands.',
    ],

    vi: [
      'DETECTIVE TERMINAL v1.0',
      '----------------------------------------',
      'VỤ ÁN: GIAO THỨC BÓNG MA',
      '',
      '02:17:42',
      'PHÁT HIỆN CHUYỂN DỮ LIỆU MẬT TRÁI PHÉP.',
      '',
      '02:19:08',
      'NHÀ NGHIÊN CỨU DANIEL CROSS',
      'ĐƯỢC PHÁT HIỆN BẤT TỈNH TRONG PHÒNG MÁY CHỦ 4.',
      '',
      'Phòng máy chủ đã bị khóa từ bên trong.',
      '',
      'Không tìm thấy dấu hiệu đột nhập bằng vũ lực rõ ràng.',
      '',
      'Nhật ký truy cập ban đầu xác định',
      'Daniel Cross là người dùng được cấp quyền cuối cùng.',
      '',
      'Nhưng dữ liệu mạng lại cho thấy một câu chuyện khác.',
      '',
      'Mục tiêu của bạn:',
      'Tái dựng dòng thời gian.',
      'Xác định cách thức vụ xâm nhập xảy ra.',
      'Xác định ai đã kiểm soát tài khoản của Daniel.',
      'Phân biệt bằng chứng thật với bằng chứng bị ngụy tạo.',
      'Xác định người chịu trách nhiệm.',
      '',
      'CẢNH BÁO:',
      'Một số nhật ký có thể đã bị chỉnh sửa.',
      '',
      'Gõ "help" để xem các lệnh khả dụng.',
    ],
  },

  people: [
    {
      id: 'daniel-cross',
      name: 'Daniel Cross',
      role: { en: 'Lead researcher and victim', vi: 'Trưởng nhóm nghiên cứu, nạn nhân' },
      summary: {
        en: 'Found unconscious in Server Room 4; his account and badge appear throughout the incident records.',
        vi: 'Được phát hiện bất tỉnh trong Phòng máy chủ 4; tài khoản và thẻ của anh xuất hiện trong nhiều bản ghi sự cố.',
      },
      details: [
        {
          label: { en: 'Account compromise', vi: 'Tài khoản bị xâm nhập' },
          value: {
            en: 'Authentication evidence indicates that Daniel’s identity was used from another endpoint.',
            vi: 'Bằng chứng xác thực cho thấy danh tính Daniel đã bị sử dụng từ một thiết bị đầu cuối khác.',
          },
          requiresEvidence: ['authentication-anomaly'],
        },
        {
          label: { en: 'Physical contradiction', vi: 'Mâu thuẫn vật lý' },
          value: {
            en: 'Independent badge and camera evidence shows that the person moving through the facility was not Daniel.',
            vi: 'Dữ liệu thẻ và camera độc lập cho thấy người di chuyển trong cơ sở không phải Daniel.',
          },
          requiresEvidence: ['camera-timeline'],
        },
      ],
    },
    {
      id: 'victor-hale',
      name: 'Victor Hale',
      role: { en: 'Security administrator', vi: 'Quản trị viên an ninh' },
      summary: {
        en: 'A privileged employee whose access and equipment become relevant as the physical evidence develops.',
        vi: 'Nhân viên có đặc quyền, với quyền truy cập và thiết bị trở nên đáng chú ý khi chuỗi chứng cứ vật lý được làm rõ.',
      },
      requiresEvidence: ['victor-profile'],
      details: [
        {
          label: { en: 'Physical operation', vi: 'Hoạt động tại hiện trường' },
          value: {
            en: 'Profile, camera and endpoint records connect Victor to the cloned badge, USB device and maintenance endpoint.',
            vi: 'Hồ sơ, camera và bản ghi thiết bị nối Victor với thẻ sao chép, USB và endpoint bảo trì.',
          },
          requiresEvidence: ['incident-contradictions'],
        },
        {
          label: { en: 'Recovered message', vi: 'Tin nhắn được khôi phục' },
          value: {
            en: 'A deleted message instructed Victor to use an old credential and keep Daniel uninvolved.',
            vi: 'Một tin nhắn đã xóa yêu cầu Victor dùng thông tin xác thực cũ và không để Daniel liên quan.',
          },
          requiresEvidence: ['deleted-email'],
        },
      ],
    },
    {
      id: 'external-operator',
      name: 'Unknown operator',
      role: { en: 'External controller', vi: 'Người điều khiển bên ngoài' },
      summary: {
        en: 'An unidentified party associated with the external transfer destination.',
        vi: 'Một bên chưa xác định có liên hệ với đích chuyển dữ liệu bên ngoài.',
      },
      requiresEvidence: ['external-node'],
      details: [
        {
          label: { en: 'Control infrastructure', vi: 'Hạ tầng điều khiển' },
          value: {
            en: 'Certificate and command history tie NODE-OMEGA to the external phase of the operation.',
            vi: 'Chứng thư và lịch sử lệnh nối NODE-OMEGA với giai đoạn bên ngoài của chiến dịch.',
          },
          requiresEvidence: ['external-history'],
        },
      ],
    },
  ],

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
            en: `[01:42:11] USER LOGIN: daniel
[01:43:03] MFA SUCCESS
[01:48:22] FILE ACCESS: /research/phoenix.dat
[01:51:09] FILE ACCESS: /research/phoenix.key
[01:58:44] USER SESSION IDLE
[02:03:11] SERVICE ACCOUNT LOGIN: svc-backup
[02:07:55] FILE ACCESS: /research/phoenix.dat
[02:11:32] FILE ACCESS: /research/phoenix.key
[02:14:02] USB DEVICE CONNECTED: UNKNOWN-USB
[02:15:19] ARCHIVE CREATED: phoenix-export.tar
[02:17:42] OUTBOUND TRANSFER STARTED
[02:18:03] OUTBOUND TRANSFER COMPLETED
[02:18:51] USB DEVICE REMOVED
[02:19:08] SERVER ROOM ALARM TRIGGERED
[02:19:11] DANIEL CROSS SESSION LOCKED`,

            vi: `[01:42:11] USER LOGIN: daniel
[01:43:03] MFA SUCCESS
[01:48:22] FILE ACCESS: /research/phoenix.dat
[01:51:09] FILE ACCESS: /research/phoenix.key
[01:58:44] USER SESSION IDLE
[02:03:11] SERVICE ACCOUNT LOGIN: svc-backup
[02:07:55] FILE ACCESS: /research/phoenix.dat
[02:11:32] FILE ACCESS: /research/phoenix.key
[02:14:02] USB DEVICE CONNECTED: UNKNOWN-USB
[02:15:19] ARCHIVE CREATED: phoenix-export.tar
[02:17:42] OUTBOUND TRANSFER STARTED
[02:18:03] OUTBOUND TRANSFER COMPLETED
[02:18:51] USB DEVICE REMOVED
[02:19:08] SERVER ROOM ALARM TRIGGERED
[02:19:11] DANIEL CROSS SESSION LOCKED`,
          },
        },

        {
          type: 'file',
          name: 'auth.log',

          content: {
            en: `[01:42:08] AUTH REQUEST: daniel
[01:42:11] PASSWORD ACCEPTED
[01:42:12] MFA TOKEN ACCEPTED
[01:42:13] DEVICE: DC-WORKSTATION-07

[01:59:31] AUTH REQUEST: daniel
[01:59:32] PASSWORD ACCEPTED
[01:59:33] MFA BYPASS
[01:59:34] DEVICE: UNKNOWN-ENDPOINT

[02:06:12] AUTH REQUEST: daniel
[02:06:13] PASSWORD ACCEPTED
[02:06:14] MFA BYPASS
[02:06:15] DEVICE: UNKNOWN-ENDPOINT

[02:18:55] AUTH REQUEST: daniel
[02:18:56] PASSWORD ACCEPTED
[02:18:57] MFA TOKEN EXPIRED`,

            vi: `[01:42:08] YÊU CẦU XÁC THỰC: daniel
[01:42:11] MẬT KHẨU ĐƯỢC CHẤP NHẬN
[01:42:12] TOKEN MFA ĐƯỢC CHẤP NHẬN
[01:42:13] THIẾT BỊ: DC-WORKSTATION-07

[01:59:31] YÊU CẦU XÁC THỰC: daniel
[01:59:32] MẬT KHẨU ĐƯỢC CHẤP NHẬN
[01:59:33] BỎ QUA MFA
[01:59:34] THIẾT BỊ: UNKNOWN-ENDPOINT

[02:06:12] YÊU CẦU XÁC THỰC: daniel
[02:06:13] MẬT KHẨU ĐƯỢC CHẤP NHẬN
[02:06:14] BỎ QUA MFA
[02:06:15] THIẾT BỊ: UNKNOWN-ENDPOINT

[02:18:55] YÊU CẦU XÁC THỰC: daniel
[02:18:56] MẬT KHẨU ĐƯỢC CHẤP NHẬN
[02:18:57] TOKEN MFA ĐÃ HẾT HẠN`,
          },
        },

        {
          type: 'file',
          name: 'kernel.log',

          content: {
            en: `[01:41:59] SYSTEM BOOT
[01:42:01] TPM INITIALIZED
[01:42:02] SECURE BOOT VERIFIED
[01:58:42] PROCESS: research-agent
[01:58:43] PROCESS: backup-agent
[01:58:44] PROCESS: remote-sync
[01:59:12] PROCESS: remote-sync CHILD PROCESS CREATED
[02:00:01] MEMORY REGION MARKED EXECUTABLE
[02:03:12] PROCESS: remote-sync TERMINATED
[02:03:13] PROCESS: archive-worker STARTED
[02:15:01] PROCESS: archive-worker ELEVATED
[02:18:50] PROCESS: archive-worker TERMINATED`,

            vi: `[01:41:59] KHỞI ĐỘNG HỆ THỐNG
[01:42:01] TPM ĐƯỢC KHỞI TẠO
[01:42:02] SECURE BOOT ĐÃ ĐƯỢC XÁC MINH
[01:58:42] TIẾN TRÌNH: research-agent
[01:58:43] TIẾN TRÌNH: backup-agent
[01:58:44] TIẾN TRÌNH: remote-sync
[01:59:12] TIẾN TRÌNH: remote-sync TẠO TIẾN TRÌNH CON
[02:00:01] VÙNG BỘ NHỚ ĐƯỢC ĐÁNH DẤU CÓ THỂ THỰC THI
[02:03:12] TIẾN TRÌNH: remote-sync ĐÃ KẾT THÚC
[02:03:13] TIẾN TRÌNH: archive-worker ĐÃ KHỞI ĐỘNG
[02:15:01] TIẾN TRÌNH: archive-worker ĐƯỢC NÂNG QUYỀN
[02:18:50] TIẾN TRÌNH: archive-worker ĐÃ KẾT THÚC`,
          },
        },

        {
          type: 'file',
          name: 'audit.log',

          content: {
            en: `[01:48:22] DANIEL READ /research/phoenix.dat
[01:51:09] DANIEL READ /research/phoenix.key
[01:58:44] DANIEL SESSION IDLE

[01:59:32] DANIEL ACCOUNT USED FROM UNKNOWN-ENDPOINT

[02:07:55] DANIEL ACCOUNT READ /research/phoenix.dat
[02:11:32] DANIEL ACCOUNT READ /research/phoenix.key

[02:15:19] DANIEL ACCOUNT CREATED ARCHIVE
[02:17:42] DANIEL ACCOUNT TRANSFERRED ARCHIVE

[02:19:11] DANIEL ACCOUNT SESSION LOCKED`,

            vi: `[01:48:22] DANIEL ĐỌC /research/phoenix.dat
[01:51:09] DANIEL ĐỌC /research/phoenix.key
[01:58:44] PHIÊN DANIEL KHÔNG HOẠT ĐỘNG

[01:59:32] TÀI KHOẢN DANIEL ĐƯỢC SỬ DỤNG TỪ UNKNOWN-ENDPOINT

[02:07:55] TÀI KHOẢN DANIEL ĐỌC /research/phoenix.dat
[02:11:32] TÀI KHOẢN DANIEL ĐỌC /research/phoenix.key

[02:15:19] TÀI KHOẢN DANIEL TẠO ARCHIVE
[02:17:42] TÀI KHOẢN DANIEL CHUYỂN ARCHIVE

[02:19:11] PHIÊN TÀI KHOẢN DANIEL BỊ KHÓA`,
          },
        },

        {
          type: 'file',
          name: 'integrity.log',

          content: {
            en: `[02:20:03] LOG INTEGRITY CHECK STARTED

system.log
EXPECTED HASH: 7F3A-91CC
CURRENT HASH: 7F3A-91CC
STATUS: VALID

auth.log
EXPECTED HASH: A81D-44E2
CURRENT HASH: 39BC-771A
STATUS: MODIFIED

audit.log
EXPECTED HASH: 0F22-18D9
CURRENT HASH: 0F22-18D9
STATUS: VALID

network.log
EXPECTED HASH: 91AB-771C
CURRENT HASH: 91AB-771C
STATUS: VALID

camera.log
EXPECTED HASH: 62CC-119A
CURRENT HASH: 62CC-119A
STATUS: VALID`,

            vi: `[02:20:03] BẮT ĐẦU KIỂM TRA TÍNH TOÀN VẸN NHẬT KÝ

system.log
HASH MONG ĐỢI: 7F3A-91CC
HASH HIỆN TẠI: 7F3A-91CC
TRẠNG THÁI: HỢP LỆ

auth.log
HASH MONG ĐỢI: A81D-44E2
HASH HIỆN TẠI: 39BC-771A
TRẠNG THÁI: ĐÃ CHỈNH SỬA

audit.log
HASH MONG ĐỢI: 0F22-18D9
HASH HIỆN TẠI: 0F22-18D9
TRẠNG THÁI: HỢP LỆ

network.log
HASH MONG ĐỢI: 91AB-771C
HASH HIỆN TẠI: 91AB-771C
TRẠNG THÁI: HỢP LỆ

camera.log
HASH MONG ĐỢI: 62CC-119A
HASH HIỆN TẠI: 62CC-119A
TRẠNG THÁI: HỢP LỆ`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'research',

      children: [
        {
          type: 'file',
          name: 'phoenix.dat',

          content: {
            en: `PROJECT PHOENIX

CLASSIFICATION:
OMEGA

PROJECT OWNER:
Daniel Cross

DESCRIPTION:
Autonomous predictive model capable of
forecasting infrastructure failures.

CURRENT VERSION:
PHOENIX-9

WARNING:
Source data must never leave
Research Network 7.

AUTHORIZED USERS:

Daniel Cross
Maya Chen
Ethan Cole`,

            vi: `DỰ ÁN PHOENIX

PHÂN LOẠI:
OMEGA

CHỦ SỞ HỮU DỰ ÁN:
Daniel Cross

MÔ TẢ:
Mô hình dự đoán tự động có khả năng
dự báo các sự cố hạ tầng.

PHIÊN BẢN HIỆN TẠI:
PHOENIX-9

CẢNH BÁO:
Dữ liệu nguồn không được phép rời khỏi
Mạng Nghiên cứu 7.

NGƯỜI DÙNG ĐƯỢC CẤP QUYỀN:

Daniel Cross
Maya Chen
Ethan Cole`,
          },
        },

        {
          type: 'file',
          name: 'phoenix.key',

          content: {
            en: `PHOENIX ENCRYPTION KEY

KEY ID:
PX-09-77-A

CREATED:
01:12

LAST ROTATION:
23:44

ROTATION OWNER:
Maya Chen

NOTE:

Any archive created with this key
must be generated from an approved
Research Network workstation.`,

            vi: `KHÓA MÃ HÓA PHOENIX

ID KHÓA:
PX-09-77-A

ĐƯỢC TẠO:
01:12

LẦN XOAY KHÓA CUỐI:
23:44

NGƯỜI QUẢN LÝ XOAY KHÓA:
Maya Chen

GHI CHÚ:

Mọi archive được tạo bằng khóa này
phải được tạo từ một máy trạm
thuộc Mạng Nghiên cứu được phê duyệt.`,
          },
        },

        {
          type: 'file',
          name: 'researchers.txt',

          content: {
            en: `PHOENIX RESEARCH TEAM

Daniel Cross
Lead Researcher

Maya Chen
Cryptography Engineer

Ethan Cole
Infrastructure Engineer

Victor Hale
Security Administrator

Nora Bennett
Research Assistant`,

            vi: `NHÓM NGHIÊN CỨU PHOENIX

Daniel Cross
Trưởng nhóm nghiên cứu

Maya Chen
Kỹ sư mật mã

Ethan Cole
Kỹ sư hạ tầng

Victor Hale
Quản trị viên an ninh

Nora Bennett
Trợ lý nghiên cứu`,
          },
        },

        {
          type: 'file',
          name: 'incident-notes.txt',

          content: {
            en: `INTERNAL INCIDENT NOTES

Daniel reported unusual authentication
events at 18:32.

Maya reported that the Phoenix key
rotated unexpectedly at 23:44.

Ethan reported intermittent failures
on backup infrastructure.

Victor requested emergency audit access
at 00:12.

Nora reported seeing someone near
Research Network 7 at approximately
01:55.

No incident was officially opened.`,

            vi: `GHI CHÚ SỰ CỐ NỘI BỘ

Daniel báo cáo các sự kiện xác thực
bất thường lúc 18:32.

Maya báo cáo khóa Phoenix
xoay bất thường lúc 23:44.

Ethan báo cáo các lỗi gián đoạn
trên hạ tầng sao lưu.

Victor yêu cầu quyền truy cập kiểm toán
khẩn cấp lúc 00:12.

Nora báo cáo đã nhìn thấy ai đó gần
Mạng Nghiên cứu 7 vào khoảng
01:55.

Không có sự cố nào được chính thức mở.`,
          },
        },

        {
          type: 'file',
          name: 'deleted-index.txt',

          content: {
            en: `RECOVERED DELETED INDEX

DELETED:
phoenix-export.tar

CREATED:
02:15:19

DELETED:
02:18:47

RECOVERY STATUS:
PARTIAL

ORIGINAL LOCATION:
/tmp/.cache/archive/`,

            vi: `CHỈ MỤC ĐÃ XÓA ĐƯỢC KHÔI PHỤC

ĐÃ XÓA:
phoenix-export.tar

ĐƯỢC TẠO:
02:15:19

ĐÃ XÓA:
02:18:47

TRẠNG THÁI KHÔI PHỤC:
MỘT PHẦN

VỊ TRÍ BAN ĐẦU:
/tmp/.cache/archive/`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'network',

      children: [
        {
          type: 'file',
          name: 'network.log',

          content: {
            en: `[01:57:02] DNS QUERY
HOST: research-gateway.local

[01:59:21] CONNECTION
SOURCE: UNKNOWN-ENDPOINT
DESTINATION: DC-WORKSTATION-07
PORT: 3389

[02:01:44] CONNECTION
SOURCE: DC-WORKSTATION-07
DESTINATION: research-gateway.local
PORT: 8443

[02:06:11] CONNECTION
SOURCE: UNKNOWN-ENDPOINT
DESTINATION: DC-WORKSTATION-07
PORT: 3389

[02:17:42] LARGE OUTBOUND TRANSFER
SOURCE: DC-WORKSTATION-07
DESTINATION: 10.44.19.88
PORT: 443

[02:18:03] TRANSFER COMPLETE

[02:18:04] DESTINATION DISCONNECTED`,

            vi: `[01:57:02] TRUY VẤN DNS
HOST: research-gateway.local

[01:59:21] KẾT NỐI
NGUỒN: UNKNOWN-ENDPOINT
ĐÍCH: DC-WORKSTATION-07
CỔNG: 3389

[02:01:44] KẾT NỐI
NGUỒN: DC-WORKSTATION-07
ĐÍCH: research-gateway.local
CỔNG: 8443

[02:06:11] KẾT NỐI
NGUỒN: UNKNOWN-ENDPOINT
ĐÍCH: DC-WORKSTATION-07
CỔNG: 3389

[02:17:42] CHUYỂN DỮ LIỆU RA NGOÀI DUNG LƯỢNG LỚN
NGUỒN: DC-WORKSTATION-07
ĐÍCH: 10.44.19.88
CỔNG: 443

[02:18:03] CHUYỂN DỮ LIỆU HOÀN TẤT

[02:18:04] NGẮT KẾT NỐI ĐÍCH`,
          },
        },

        {
          type: 'file',
          name: 'dns.log',

          content: {
            en: `[01:56:51] QUERY:
updates-research.local

[01:57:02] QUERY:
research-gateway.local

[01:57:05] QUERY:
cdn-research.local

[02:00:14] QUERY:
sync-research.local

[02:05:44] QUERY:
research-gateway.local

[02:17:40] QUERY:
secure-transfer.local`,

            vi: `[01:56:51] TRUY VẤN:
updates-research.local

[01:57:02] TRUY VẤN:
research-gateway.local

[01:57:05] TRUY VẤN:
cdn-research.local

[02:00:14] TRUY VẤN:
sync-research.local

[02:05:44] TRUY VẤN:
research-gateway.local

[02:17:40] TRUY VẤN:
secure-transfer.local`,
          },
        },

        {
          type: 'file',
          name: 'firewall.log',

          content: {
            en: `[01:59:22] ALLOW
SRC: 10.44.12.77
DST: 10.44.12.15
PORT: 3389

[02:06:12] ALLOW
SRC: 10.44.12.77
DST: 10.44.12.15
PORT: 3389

[02:17:42] ALLOW
SRC: 10.44.12.15
DST: 10.44.19.88
PORT: 443

[02:18:04] BLOCK
SRC: 10.44.19.88
DST: 10.44.12.15
PORT: 443`,

            vi: `[01:59:22] CHO PHÉP
NGUỒN: 10.44.12.77
ĐÍCH: 10.44.12.15
CỔNG: 3389

[02:06:12] CHO PHÉP
NGUỒN: 10.44.12.77
ĐÍCH: 10.44.12.15
CỔNG: 3389

[02:17:42] CHO PHÉP
NGUỒN: 10.44.12.15
ĐÍCH: 10.44.19.88
CỔNG: 443

[02:18:04] CHẶN
NGUỒN: 10.44.19.88
ĐÍCH: 10.44.12.15
CỔNG: 443`,
          },
        },

        {
          type: 'file',
          name: 'dhcp.log',

          content: {
            en: `[01:58:59]
IP: 10.44.12.77
MAC: 88:1F:A1:77:19:42
HOSTNAME: VICTOR-LAPTOP

[02:05:59]
IP: 10.44.12.77
MAC: 88:1F:A1:77:19:42
HOSTNAME: VICTOR-LAPTOP

[02:18:21]
IP RELEASED:
10.44.12.77`,

            vi: `[01:58:59]
IP: 10.44.12.77
MAC: 88:1F:A1:77:19:42
TÊN THIẾT BỊ: VICTOR-LAPTOP

[02:05:59]
IP: 10.44.12.77
MAC: 88:1F:A1:77:19:42
TÊN THIẾT BỊ: VICTOR-LAPTOP

[02:18:21]
IP ĐƯỢC GIẢI PHÓNG:
10.44.12.77`,
          },
        },

        {
          type: 'file',
          name: 'proxy.log',

          content: {
            en: `[01:59:40]
CLIENT: 10.44.12.15
USER: daniel
REQUEST: /remote/control

[02:01:44]
CLIENT: 10.44.12.15
USER: daniel
REQUEST: /research/phoenix.dat

[02:06:21]
CLIENT: 10.44.12.15
USER: daniel
REQUEST: /remote/control

[02:15:20]
CLIENT: 10.44.12.15
USER: daniel
REQUEST: /archive/create

[02:17:41]
CLIENT: 10.44.12.15
USER: daniel
REQUEST: /transfer/start`,

            vi: `[01:59:40]
CLIENT: 10.44.12.15
USER: daniel
YÊU CẦU: /remote/control

[02:01:44]
CLIENT: 10.44.12.15
USER: daniel
YÊU CẦU: /research/phoenix.dat

[02:06:21]
CLIENT: 10.44.12.15
USER: daniel
YÊU CẦU: /remote/control

[02:15:20]
CLIENT: 10.44.12.15
USER: daniel
YÊU CẦU: /archive/create

[02:17:41]
CLIENT: 10.44.12.15
USER: daniel
YÊU CẦU: /transfer/start`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'devices',

      children: [
        {
          type: 'file',
          name: 'usb.log',

          content: {
            en: `[02:14:02] USB CONNECTED

VENDOR:
UNKNOWN

SERIAL:
VX-7719

DEVICE:
USB STORAGE

[02:14:05]
MOUNTED:
USB-ARCHIVE

[02:18:47]
UNMOUNTED

[02:18:51]
USB REMOVED`,

            vi: `[02:14:02] USB ĐƯỢC KẾT NỐI

NHÀ SẢN XUẤT:
UNKNOWN

SỐ SERIAL:
VX-7719

THIẾT BỊ:
USB STORAGE

[02:14:05]
ĐÃ GẮN:
USB-ARCHIVE

[02:18:47]
ĐÃ THÁO GẮN

[02:18:51]
USB ĐƯỢC THÁO RA`,
          },
        },

        {
          type: 'file',
          name: 'usb-content.txt',

          content: {
            en: `USB ARCHIVE CONTENT

phoenix-export.tar
access-script.bin
cleanup.sh

TIMESTAMP:
02:15:19

SOURCE:
DC-WORKSTATION-07`,

            vi: `NỘI DUNG USB

phoenix-export.tar
access-script.bin
cleanup.sh

THỜI GIAN:
02:15:19

NGUỒN:
DC-WORKSTATION-07`,
          },
        },

        {
          type: 'file',
          name: 'device-registry.txt',

          content: {
            en: `REGISTERED DEVICES

USB-ARCHIVE
SERIAL:
VX-7719
OWNER:
UNREGISTERED

LAST SEEN:
02:18:51

DEVICE VX-7719

FIRST REGISTERED:
17 DAYS AGO

REGISTERED HOST:
SECURITY-LAB-02

REGISTRATION STATUS:
REVOKED`,

            vi: `THIẾT BỊ ĐÃ ĐĂNG KÝ

USB-ARCHIVE
SERIAL:
VX-7719
CHỦ SỞ HỮU:
CHƯA ĐĂNG KÝ

LẦN CUỐI NHÌN THẤY:
02:18:51

THIẾT BỊ VX-7719

ĐĂNG KÝ LẦN ĐẦU:
17 NGÀY TRƯỚC

MÁY CHỦ ĐĂNG KÝ:
SECURITY-LAB-02

TRẠNG THÁI ĐĂNG KÝ:
ĐÃ THU HỒI`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'access',

      children: [
        {
          type: 'file',
          name: 'badge.log',

          content: {
            en: `[01:31:04]
BADGE:
DC-117

OWNER:
DANIEL CROSS

DOOR:
RESEARCH-LAB

STATUS:
GRANTED

[01:54:33]
BADGE:
VC-201

OWNER:
VICTOR HALE

DOOR:
SECURITY-LAB

STATUS:
GRANTED

[02:11:02]
BADGE:
DC-117

OWNER:
DANIEL CROSS

DOOR:
SERVER-ROOM-4

STATUS:
GRANTED

[02:19:08]
BADGE:
DC-117

OWNER:
DANIEL CROSS

DOOR:
SERVER-ROOM-4

STATUS:
ALARM`,

            vi: `[01:31:04]
THẺ:
DC-117

CHỦ SỞ HỮU:
DANIEL CROSS

CỬA:
RESEARCH-LAB

TRẠNG THÁI:
ĐƯỢC CHO PHÉP

[01:54:33]
THẺ:
VC-201

CHỦ SỞ HỮU:
VICTOR HALE

CỬA:
SECURITY-LAB

TRẠNG THÁI:
ĐƯỢC CHO PHÉP

[02:11:02]
THẺ:
DC-117

CHỦ SỞ HỮU:
DANIEL CROSS

CỬA:
SERVER-ROOM-4

TRẠNG THÁI:
ĐƯỢC CHO PHÉP

[02:19:08]
THẺ:
DC-117

CHỦ SỞ HỮU:
DANIEL CROSS

CỬA:
SERVER-ROOM-4

TRẠNG THÁI:
BÁO ĐỘNG`,
          },
        },

        {
          type: 'file',
          name: 'door-controller.log',

          content: {
            en: `[02:10:59]
SERVER ROOM 4
LOCKED

[02:11:02]
BADGE ACCEPTED
DC-117

[02:11:03]
DOOR OPEN

[02:11:07]
DOOR CLOSED

[02:11:08]
LOCK ENGAGED

[02:19:08]
INTERNAL MOTION DETECTED

[02:19:08]
EMERGENCY LOCKDOWN`,

            vi: `[02:10:59]
PHÒNG MÁY CHỦ 4
ĐÃ KHÓA

[02:11:02]
THẺ ĐƯỢC CHẤP NHẬN
DC-117

[02:11:03]
CỬA MỞ

[02:11:07]
CỬA ĐÓNG

[02:11:08]
KHÓA ĐƯỢC KÍCH HOẠT

[02:19:08]
PHÁT HIỆN CHUYỂN ĐỘNG BÊN TRONG

[02:19:08]
KHÓA KHẨN CẤP`,
          },
        },

        {
          type: 'file',
          name: 'badge-analysis.txt',

          content: {
            en: `BADGE FORENSIC ANALYSIS

BADGE:
DC-117

OWNER:
Daniel Cross

PHYSICAL BADGE:
LAST CONFIRMED IN DANIEL'S WALLET
AT 00:41

SERVER ACCESS:
02:11:02

WARNING:

Badge authentication only confirms
the badge credential.

It does NOT confirm the identity
of the person carrying it.

CLONING INDICATOR:
POSSIBLE`,

            vi: `PHÂN TÍCH PHÁP Y THẺ RA VÀO

THẺ:
DC-117

CHỦ SỞ HỮU:
Daniel Cross

THẺ VẬT LÝ:
LẦN CUỐI ĐƯỢC XÁC NHẬN TRONG VÍ CỦA DANIEL
LÚC 00:41

TRUY CẬP MÁY CHỦ:
02:11:02

CẢNH BÁO:

Xác thực thẻ chỉ xác nhận
thông tin định danh của thẻ.

Nó KHÔNG xác nhận danh tính
của người đang mang thẻ.

DẤU HIỆU SAO CHÉP:
CÓ THỂ`,
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
          name: 'camera.log',

          content: {
            en: `[01:48:00]
CAMERA R7-01
Daniel enters Research Network 7.

[01:52:14]
CAMERA R7-01
Daniel remains inside.

[01:54:31]
CAMERA S2-04
Victor enters Security Lab.

[01:58:02]
CAMERA R7-01
Daniel leaves Research Network 7.

[02:00:18]
CAMERA HALL-03
Person wearing dark jacket
enters Research Corridor.

[02:10:58]
CAMERA SERVER-04
Person carrying Daniel's badge
approaches Server Room 4.

[02:11:03]
CAMERA SERVER-04
Person enters.

[02:18:45]
CAMERA SERVER-04
Person exits.

[02:19:08]
CAMERA SERVER-04
Daniel Cross discovered inside.`,

            vi: `[01:48:00]
CAMERA R7-01
Daniel bước vào Mạng Nghiên cứu 7.

[01:52:14]
CAMERA R7-01
Daniel vẫn ở bên trong.

[01:54:31]
CAMERA S2-04
Victor bước vào Phòng An ninh.

[01:58:02]
CAMERA R7-01
Daniel rời khỏi Mạng Nghiên cứu 7.

[02:00:18]
CAMERA HALL-03
Một người mặc áo khoác tối màu
bước vào hành lang nghiên cứu.

[02:10:58]
CAMERA SERVER-04
Một người mang thẻ của Daniel
tiếp cận Phòng Máy chủ 4.

[02:11:03]
CAMERA SERVER-04
Người này bước vào.

[02:18:45]
CAMERA SERVER-04
Người này rời đi.

[02:19:08]
CAMERA SERVER-04
Phát hiện Daniel Cross bên trong.`,
          },
        },

        {
          type: 'file',
          name: 'hallway.log',

          content: {
            en: `[01:57:51]
HALLWAY CAMERA

SUBJECT:
UNKNOWN

HEIGHT:
~180 CM

CLOTHING:
DARK JACKET

[02:03:21]
SUBJECT:
UNKNOWN

DIRECTION:
RESEARCH CORRIDOR -> SECURITY LAB

[02:09:44]
SUBJECT:
UNKNOWN

DIRECTION:
SECURITY LAB -> SERVER CORRIDOR

[02:18:47]
SUBJECT:
UNKNOWN

DIRECTION:
SERVER CORRIDOR -> EXIT`,

            vi: `[01:57:51]
CAMERA HÀNH LANG

ĐỐI TƯỢNG:
KHÔNG XÁC ĐỊNH

CHIỀU CAO:
~180 CM

TRANG PHỤC:
ÁO KHOÁC TỐI MÀU

[02:03:21]
ĐỐI TƯỢNG:
KHÔNG XÁC ĐỊNH

HƯỚNG DI CHUYỂN:
HÀNH LANG NGHIÊN CỨU -> PHÒNG AN NINH

[02:09:44]
ĐỐI TƯỢNG:
KHÔNG XÁC ĐỊNH

HƯỚNG DI CHUYỂN:
PHÒNG AN NINH -> HÀNH LANG MÁY CHỦ

[02:18:47]
ĐỐI TƯỢNG:
KHÔNG XÁC ĐỊNH

HƯỚNG DI CHUYỂN:
HÀNH LANG MÁY CHỦ -> LỐI RA`,
          },
        },

        {
          type: 'file',
          name: 'camera-analysis.txt',

          content: {
            en: `VIDEO ANALYSIS

FRAME ENHANCEMENT:

The individual entering Server Room 4
does NOT appear to be Daniel Cross.

Face:
OBSCURED

Height:
APPROXIMATELY 180 CM

Daniel Cross:
HEIGHT 174 CM

Victor Hale:
HEIGHT 181 CM

Ethan Cole:
HEIGHT 179 CM

Maya Chen:
HEIGHT 166 CM`,

            vi: `PHÂN TÍCH VIDEO

TĂNG CƯỜNG KHUNG HÌNH:

Người bước vào Phòng Máy chủ 4
KHÔNG có vẻ là Daniel Cross.

Khuôn mặt:
BỊ CHE KHUẤT

Chiều cao:
KHOẢNG 180 CM

Daniel Cross:
CHIỀU CAO 174 CM

Victor Hale:
CHIỀU CAO 181 CM

Ethan Cole:
CHIỀU CAO 179 CM

Maya Chen:
CHIỀU CAO 166 CM`,
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
daniel.cross@company.local

TIME:
18:32

SUBJECT:
Authentication Warning

MESSAGE:
Someone is attempting to access
my account.

I have not approved these requests.

----------------------------------------

FROM:
victor.hale@company.local

TIME:
00:12

SUBJECT:
Emergency Audit

MESSAGE:
I need temporary access to the
Phoenix audit logs.

Do not modify production systems.

----------------------------------------

FROM:
maya.chen@company.local

TIME:
23:44

SUBJECT:
Key Rotation

MESSAGE:
The Phoenix encryption key rotated
successfully.

Please do not generate archives
until the new key is validated.

----------------------------------------

FROM:
ethan.cole@company.local

TIME:
01:21

SUBJECT:
Backup Failure

MESSAGE:
The backup cluster is behaving
strangely again.

I will investigate in the morning.`,

            vi: `HỘP THƯ ĐẾN

----------------------------------------

NGƯỜI GỬI:
daniel.cross@company.local

THỜI GIAN:
18:32

CHỦ ĐỀ:
Cảnh báo xác thực

NỘI DUNG:
Có người đang cố truy cập
tài khoản của tôi.

Tôi chưa phê duyệt các yêu cầu này.

----------------------------------------

NGƯỜI GỬI:
victor.hale@company.local

THỜI GIAN:
00:12

CHỦ ĐỀ:
Kiểm toán khẩn cấp

NỘI DUNG:
Tôi cần quyền truy cập tạm thời vào
nhật ký kiểm toán Phoenix.

Không được chỉnh sửa hệ thống production.

----------------------------------------

NGƯỜI GỬI:
maya.chen@company.local

THỜI GIAN:
23:44

CHỦ ĐỀ:
Xoay khóa

NỘI DUNG:
Khóa mã hóa Phoenix đã được xoay
thành công.

Vui lòng không tạo archive
cho đến khi khóa mới được xác thực.

----------------------------------------

NGƯỜI GỬI:
ethan.cole@company.local

THỜI GIAN:
01:21

CHỦ ĐỀ:
Lỗi sao lưu

NỘI DUNG:
Cụm máy chủ sao lưu lại hoạt động
bất thường.

Tôi sẽ điều tra vào buổi sáng.`,
          },
        },

        {
          type: 'file',
          name: 'sent.txt',

          content: {
            en: `SENT

----------------------------------------

FROM:
daniel.cross@company.local

TO:
security@company.local

TIME:
18:35

MESSAGE:
Please investigate repeated
authentication attempts against
my account.

----------------------------------------

FROM:
victor.hale@company.local

TO:
daniel.cross@company.local

TIME:
00:19

MESSAGE:
Understood.

Do not access Phoenix tonight.

----------------------------------------

FROM:
maya.chen@company.local

TO:
daniel.cross@company.local

TIME:
23:46

MESSAGE:
The key rotation completed.

Your workstation should be safe.`,

            vi: `ĐÃ GỬI

----------------------------------------

NGƯỜI GỬI:
daniel.cross@company.local

ĐẾN:
security@company.local

THỜI GIAN:
18:35

NỘI DUNG:
Vui lòng điều tra các lần thử
xác thực lặp lại đối với
tài khoản của tôi.

----------------------------------------

NGƯỜI GỬI:
victor.hale@company.local

ĐẾN:
daniel.cross@company.local

THỜI GIAN:
00:19

NỘI DUNG:
Đã hiểu.

Tối nay đừng truy cập Phoenix.

----------------------------------------

NGƯỜI GỬI:
maya.chen@company.local

ĐẾN:
daniel.cross@company.local

THỜI GIAN:
23:46

NỘI DUNG:
Việc xoay khóa đã hoàn tất.

Máy trạm của bạn sẽ an toàn.`,
          },
        },

        {
          type: 'file',
          name: 'deleted-mail.txt',

          content: {
            en: `RECOVERED DELETED MESSAGE

FROM:
unknown

TO:
victor.hale@company.local

TIME:
01:49

SUBJECT:
Phoenix

MESSAGE:

The old credential still works.

Use the maintenance endpoint.

Do not involve Daniel.

DELETE AFTER READING.`,

            vi: `TIN NHẮN ĐÃ XÓA ĐƯỢC KHÔI PHỤC

NGƯỜI GỬI:
unknown

ĐẾN:
victor.hale@company.local

THỜI GIAN:
01:49

CHỦ ĐỀ:
Phoenix

NỘI DUNG:

Thông tin xác thực cũ vẫn hoạt động.

Hãy sử dụng endpoint bảo trì.

Không được liên quan đến Daniel.

XÓA SAU KHI ĐỌC.`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'users',

      children: [
        {
          type: 'file',
          name: 'daniel.txt',

          content: {
            en: `USER PROFILE

NAME:
Daniel Cross

ROLE:
Lead Researcher

HEIGHT:
174 CM

MFA:
ENABLED

LAST PASSWORD CHANGE:
12 DAYS AGO

SECURITY NOTE:
Reported suspicious authentication
events at 18:32.`,

            vi: `HỒ SƠ NGƯỜI DÙNG

TÊN:
Daniel Cross

VAI TRÒ:
Trưởng nhóm nghiên cứu

CHIỀU CAO:
174 CM

MFA:
ĐÃ BẬT

LẦN ĐỔI MẬT KHẨU CUỐI:
12 NGÀY TRƯỚC

GHI CHÚ AN NINH:
Đã báo cáo các sự kiện xác thực
đáng ngờ lúc 18:32.`,
          },
        },

        {
          type: 'file',
          name: 'victor.txt',

          content: {
            en: `USER PROFILE

NAME:
Victor Hale

ROLE:
Security Administrator

HEIGHT:
181 CM

MFA:
ENABLED

PRIVILEGED ACCESS:
YES

BADGE:
VC-201

KNOWN DEVICES:
VICTOR-LAPTOP

SECURITY NOTE:
Requested emergency audit access
at 00:12.`,

            vi: `HỒ SƠ NGƯỜI DÙNG

TÊN:
Victor Hale

VAI TRÒ:
Quản trị viên an ninh

CHIỀU CAO:
181 CM

MFA:
ĐÃ BẬT

QUYỀN TRUY CẬP ĐẶC BIỆT:
CÓ

THẺ:
VC-201

THIẾT BỊ ĐÃ BIẾT:
VICTOR-LAPTOP

GHI CHÚ AN NINH:
Đã yêu cầu quyền truy cập kiểm toán
khẩn cấp lúc 00:12.`,
          },
        },

        {
          type: 'file',
          name: 'ethan.txt',

          content: {
            en: `USER PROFILE

NAME:
Ethan Cole

ROLE:
Infrastructure Engineer

HEIGHT:
179 CM

MFA:
ENABLED

PRIVILEGED ACCESS:
LIMITED

KNOWN DEVICES:
ETHAN-LAPTOP

SECURITY NOTE:
Responsible for backup systems.`,

            vi: `HỒ SƠ NGƯỜI DÙNG

TÊN:
Ethan Cole

VAI TRÒ:
Kỹ sư hạ tầng

CHIỀU CAO:
179 CM

MFA:
ĐÃ BẬT

QUYỀN TRUY CẬP ĐẶC BIỆT:
GIỚI HẠN

THIẾT BỊ ĐÃ BIẾT:
ETHAN-LAPTOP

GHI CHÚ AN NINH:
Phụ trách hệ thống sao lưu.`,
          },
        },

        {
          type: 'file',
          name: 'maya.txt',

          content: {
            en: `USER PROFILE

NAME:
Maya Chen

ROLE:
Cryptography Engineer

HEIGHT:
166 CM

MFA:
ENABLED

PRIVILEGED ACCESS:
RESEARCH

SECURITY NOTE:
Owns Phoenix key rotation process.`,

            vi: `HỒ SƠ NGƯỜI DÙNG

TÊN:
Maya Chen

VAI TRÒ:
Kỹ sư mật mã

CHIỀU CAO:
166 CM

MFA:
ĐÃ BẬT

QUYỀN TRUY CẬP ĐẶC BIỆT:
RESEARCH

GHI CHÚ AN NINH:
Phụ trách quy trình xoay khóa Phoenix.`,
          },
        },

        {
          type: 'file',
          name: 'service-accounts.txt',

          content: {
            en: `SERVICE ACCOUNTS

svc-backup
Purpose:
Automated backup

Privilege:
READ RESEARCH

Last password rotation:
41 DAYS AGO

svc-archive
Purpose:
Archive generation

Privilege:
READ + WRITE RESEARCH

Last password rotation:
3 DAYS AGO

WARNING:

svc-archive credential was exposed
in an internal diagnostic script
17 days ago.`,

            vi: `TÀI KHOẢN DỊCH VỤ

svc-backup
Mục đích:
Sao lưu tự động

Quyền:
ĐỌC RESEARCH

Lần xoay mật khẩu cuối:
41 NGÀY TRƯỚC

svc-archive
Mục đích:
Tạo archive

Quyền:
ĐỌC + GHI RESEARCH

Lần xoay mật khẩu cuối:
3 NGÀY TRƯỚC

CẢNH BÁO:

Thông tin xác thực của svc-archive
đã bị lộ trong một script chẩn đoán nội bộ
17 ngày trước.`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'scripts',

      children: [
        {
          type: 'file',
          name: 'access-script.bin',

          content: {
            en: `BINARY FILE ANALYSIS

FILE:
access-script.bin

SIZE:
18 KB

CREATED:
02:15:18

FUNCTION:

Creates remote session using
stored service credentials.

REFERENCES:

svc-archive
remote-sync
maintenance endpoint

OBFUSCATED SECTION:

4D 41 49 4E 54 2D 37

DECODED:

MAINT-7`,

            vi: `PHÂN TÍCH TỆP NHỊ PHÂN

TỆP:
access-script.bin

KÍCH THƯỚC:
18 KB

ĐƯỢC TẠO:
02:15:18

CHỨC NĂNG:

Tạo phiên từ xa bằng
thông tin xác thực dịch vụ được lưu trữ.

THAM CHIẾU:

svc-archive
remote-sync
maintenance endpoint

PHẦN ĐÃ LÀM RỐI:

4D 41 49 4E 54 2D 37

GIẢI MÃ:

MAINT-7`,
          },
        },

        {
          type: 'file',
          name: 'cleanup.sh',

          content: {
            en: `#!/bin/sh

killall remote-sync
rm /tmp/.cache/archive/phoenix-export.tar
rm /var/log/remote-session.log

echo "cleanup complete"

AUTHOR:
unknown`,

            vi: `#!/bin/sh

killall remote-sync
rm /tmp/.cache/archive/phoenix-export.tar
rm /var/log/remote-session.log

echo "cleanup complete"

TÁC GIẢ:
unknown`,
          },
        },

        {
          type: 'file',
          name: 'maintenance.txt',

          content: {
            en: `MAINTENANCE ENDPOINT

ENDPOINT:
MAINT-7

AUTHORIZED PURPOSE:
Emergency infrastructure maintenance

AUTHORIZED USERS:

Victor Hale
Ethan Cole

NOTE:

All sessions should generate
remote-session.log

EXCEPTION:

Legacy sessions may bypass
standard authentication logging.`,

            vi: `ENDPOINT BẢO TRÌ

ENDPOINT:
MAINT-7

MỤC ĐÍCH ĐƯỢC PHÉP:
Bảo trì hạ tầng khẩn cấp

NGƯỜI DÙNG ĐƯỢC PHÉP:

Victor Hale
Ethan Cole

GHI CHÚ:

Mọi phiên làm việc phải tạo
remote-session.log

NGOẠI LỆ:

Các phiên legacy có thể bỏ qua
việc ghi nhật ký xác thực tiêu chuẩn.`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'server',

      children: [
        {
          type: 'file',
          name: 'remote-session.log',

          content: {
            en: `[01:58:57]
REMOTE SESSION CREATED

ENDPOINT:
MAINT-7

ACCOUNT:
svc-archive

SOURCE:
10.44.12.77

[01:59:32]
IMPERSONATION:
daniel

[02:03:12]
SESSION REAUTHENTICATED

[02:06:12]
REMOTE SESSION RECONNECTED

[02:15:20]
ARCHIVE OPERATION STARTED

[02:17:41]
TRANSFER OPERATION STARTED

[02:18:47]
SESSION TERMINATED`,

            vi: `[01:58:57]
ĐÃ TẠO PHIÊN TỪ XA

ENDPOINT:
MAINT-7

TÀI KHOẢN:
svc-archive

NGUỒN:
10.44.12.77

[01:59:32]
MẠO DANH:
daniel

[02:03:12]
PHIÊN ĐƯỢC XÁC THỰC LẠI

[02:06:12]
PHIÊN TỪ XA ĐƯỢC KẾT NỐI LẠI

[02:15:20]
BẮT ĐẦU THAO TÁC ARCHIVE

[02:17:41]
BẮT ĐẦU THAO TÁC CHUYỂN DỮ LIỆU

[02:18:47]
PHIÊN ĐÃ KẾT THÚC`,
          },
        },

        {
          type: 'file',
          name: 'process.log',

          content: {
            en: `[01:59:12]
PROCESS:
remote-sync

PARENT:
maintenance-agent

[01:59:13]
COMMAND:
--user daniel

[02:03:13]
PROCESS:
archive-worker

[02:15:01]
PRIVILEGE:
SYSTEM

[02:18:50]
PROCESS:
archive-worker TERMINATED`,

            vi: `[01:59:12]
TIẾN TRÌNH:
remote-sync

TIẾN TRÌNH CHA:
maintenance-agent

[01:59:13]
LỆNH:
--user daniel

[02:03:13]
TIẾN TRÌNH:
archive-worker

[02:15:01]
QUYỀN:
SYSTEM

[02:18:50]
TIẾN TRÌNH:
archive-worker ĐÃ KẾT THÚC`,
          },
        },

        {
          type: 'file',
          name: 'server-room.txt',

          content: {
            en: `SERVER ROOM 4

LOCK STATUS:
NORMAL

AIR QUALITY:
NORMAL

TEMPERATURE:
NORMAL

MOTION SENSOR:
ACTIVE

02:11:
AUTHORIZED BADGE USED

02:19:
MOTION DETECTED

02:19:
EMERGENCY LOCKDOWN

NO FORCED ENTRY DETECTED`,

            vi: `PHÒNG MÁY CHỦ 4

TRẠNG THÁI KHÓA:
BÌNH THƯỜNG

CHẤT LƯỢNG KHÔNG KHÍ:
BÌNH THƯỜNG

NHIỆT ĐỘ:
BÌNH THƯỜNG

CẢM BIẾN CHUYỂN ĐỘNG:
ĐANG HOẠT ĐỘNG

02:11:
THẺ ĐƯỢC CẤP QUYỀN ĐƯỢC SỬ DỤNG

02:19:
PHÁT HIỆN CHUYỂN ĐỘNG

02:19:
KHÓA KHẨN CẤP

KHÔNG PHÁT HIỆN ĐỘT NHẬP BẰNG VŨ LỰC`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'forensics',

      children: [
        {
          type: 'file',
          name: 'memory.txt',

          content: {
            en: `MEMORY FORENSICS

HOST:
DC-WORKSTATION-07

CAPTURE:
02:21

SUSPICIOUS PROCESS:

remote-sync

PID:
4412

PARENT:
maintenance-agent

COMMAND LINE:

remote-sync --user daniel
--session legacy

MEMORY STRINGS:

MAINT-7
svc-archive
VX-7719

IMPORTANT:

Process contained an in-memory
credential token.

Token owner:
svc-archive`,

            vi: `PHÁP Y BỘ NHỚ

MÁY CHỦ:
DC-WORKSTATION-07

THU THẬP:
02:21

TIẾN TRÌNH ĐÁNG NGỜ:

remote-sync

PID:
4412

TIẾN TRÌNH CHA:
maintenance-agent

DÒNG LỆNH:

remote-sync --user daniel
--session legacy

CHUỖI TRONG BỘ NHỚ:

MAINT-7
svc-archive
VX-7719

QUAN TRỌNG:

Tiến trình chứa một token
xác thực trong bộ nhớ.

Chủ sở hữu token:
svc-archive`,
          },
        },

        {
          type: 'file',
          name: 'usb-forensics.txt',

          content: {
            en: `USB FORENSICS

SERIAL:
VX-7719

DEVICE HASH:
C81A-77D1

PREVIOUS HOST:
SECURITY-LAB-02

LAST USER:
VICTOR

MOUNT HISTORY:

SECURITY-LAB-02
17 DAYS AGO

DC-WORKSTATION-07
02:14:02

WARNING:

Device registration was revoked
17 days ago.`,

            vi: `PHÁP Y USB

SERIAL:
VX-7719

HASH THIẾT BỊ:
C81A-77D1

MÁY CHỦ TRƯỚC ĐÓ:
SECURITY-LAB-02

NGƯỜI DÙNG CUỐI:
VICTOR

LỊCH SỬ GẮN KẾT:

SECURITY-LAB-02
17 NGÀY TRƯỚC

DC-WORKSTATION-07
02:14:02

CẢNH BÁO:

Đăng ký thiết bị đã bị thu hồi
17 ngày trước.`,
          },
        },

        {
          type: 'file',
          name: 'badge-forensics.txt',

          content: {
            en: `BADGE FORENSICS

BADGE:
DC-117

ORIGINAL OWNER:
DANIEL CROSS

CLONING ANALYSIS:

RFID UID:
MATCH

CRYPTOGRAPHIC SIGNATURE:
INVALID

INTERPRETATION:

The credential identifier matches
Daniel's badge.

The cryptographic signature does not.

LIKELY:
CLONED BADGE`,

            vi: `PHÁP Y THẺ RA VÀO

THẺ:
DC-117

CHỦ SỞ HỮU BAN ĐẦU:
DANIEL CROSS

PHÂN TÍCH SAO CHÉP:

RFID UID:
TRÙNG KHỚP

CHỮ KÝ MẬT MÃ:
KHÔNG HỢP LỆ

DIỄN GIẢI:

Mã định danh thông tin xác thực trùng với
thẻ của Daniel.

Nhưng chữ ký mật mã thì không trùng.

KHẢ NĂNG:
THẺ BỊ SAO CHÉP`,
          },
        },

        {
          type: 'file',
          name: 'transfer.txt',

          content: {
            en: `TRANSFER FORENSICS

ARCHIVE:
phoenix-export.tar

SIZE:
4.8 GB

HASH:
91E7-AC44

DESTINATION:
10.44.19.88

TRANSFER:
02:17:42 - 02:18:03

DESTINATION TYPE:
EXTERNAL RESEARCH NODE

KNOWN OWNER:
UNKNOWN

TLS:
VALID

SERVER CERTIFICATE:
SECURE-TRANSFER.LOCAL

NOTE:

Destination server accepted
the archive but immediately
closed the connection.`,

            vi: `PHÁP Y CHUYỂN DỮ LIỆU

ARCHIVE:
phoenix-export.tar

KÍCH THƯỚC:
4.8 GB

HASH:
91E7-AC44

ĐÍCH:
10.44.19.88

CHUYỂN DỮ LIỆU:
02:17:42 - 02:18:03

LOẠI ĐÍCH:
NODE NGHIÊN CỨU BÊN NGOÀI

CHỦ SỞ HỮU ĐÃ BIẾT:
UNKNOWN

TLS:
HỢP LỆ

CHỨNG CHỈ MÁY CHỦ:
SECURE-TRANSFER.LOCAL

GHI CHÚ:

Máy chủ đích đã nhận archive
nhưng ngay lập tức
đóng kết nối.`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'incident',

      children: [
        {
          type: 'file',
          name: 'timeline.txt',

          content: {
            en: `PRELIMINARY TIMELINE

18:32
Daniel reports suspicious login attempts.

18:35
Daniel reports incident to Security.

23:44
Phoenix encryption key rotates.

00:12
Victor requests emergency audit access.

01:49
Deleted email references MAINT-7.

01:54
Victor enters Security Lab.

01:58
Remote maintenance session starts.

01:59
Daniel account impersonated.

02:03
Backup process changes to archive-worker.

02:06
Remote session reconnects.

02:10
Cloned Daniel badge approaches Server Room.

02:11
Server Room accessed.

02:14
Unknown USB connected.

02:15
Phoenix archive created.

02:17
Archive transferred externally.

02:18
USB removed.

02:19
Daniel found unconscious.`,

            vi: `DÒNG THỜI GIAN SƠ BỘ

18:32
Daniel báo cáo các lần đăng nhập đáng ngờ.

18:35
Daniel báo cáo sự việc cho bộ phận An ninh.

23:44
Khóa mã hóa Phoenix được xoay.

00:12
Victor yêu cầu quyền kiểm toán khẩn cấp.

01:49
Email đã xóa đề cập đến MAINT-7.

01:54
Victor bước vào Phòng An ninh.

01:58
Phiên bảo trì từ xa bắt đầu.

01:59
Tài khoản Daniel bị mạo danh.

02:03
Tiến trình sao lưu chuyển sang archive-worker.

02:06
Phiên từ xa kết nối lại.

02:10
Thẻ Daniel bị sao chép tiếp cận Phòng Máy chủ.

02:11
Phòng Máy chủ được truy cập.

02:14
USB không xác định được kết nối.

02:15
Archive Phoenix được tạo.

02:17
Archive được chuyển ra bên ngoài.

02:18
USB bị tháo ra.

02:19
Daniel được phát hiện bất tỉnh.`,
          },
        },

        {
          type: 'file',
          name: 'contradictions.txt',

          content: {
            en: `EVIDENCE CONTRADICTIONS

1.

AUTH.LOG CLAIMS:

MFA BYPASS

But the authentication system
normally does not support MFA bypass.

2.

BADGE.LOG CLAIMS:

Daniel's badge accessed Server Room.

Forensics indicate the badge
was cloned.

3.

AUDIT.LOG CLAIMS:

Daniel created the archive.

Process logs show archive-worker
performed the operation.

4.

CAMERA.LOG SHOWS:

Person entering Server Room
does not match Daniel's height.

5.

USB FORENSICS:

USB was previously registered
to Security Lab 02.

6.

NETWORK DHCP:

10.44.12.77 belonged to
Victor's laptop.

7.

REMOTE SESSION:

MAINT-7 used svc-archive.

8.

DELETED EMAIL:

Someone instructed Victor to
use MAINT-7.`,

            vi: `MÂU THUẪN TRONG BẰNG CHỨNG

1.

AUTH.LOG CHO RẰNG:

BỎ QUA MFA

Nhưng hệ thống xác thực
thông thường không hỗ trợ bỏ qua MFA.

2.

BADGE.LOG CHO RẰNG:

Thẻ của Daniel đã truy cập Phòng Máy chủ.

Pháp y cho thấy thẻ
đã bị sao chép.

3.

AUDIT.LOG CHO RẰNG:

Daniel đã tạo archive.

Nhật ký tiến trình cho thấy archive-worker
mới thực hiện thao tác này.

4.

CAMERA.LOG CHO THẤY:

Người bước vào Phòng Máy chủ
không có chiều cao giống Daniel.

5.

PHÁP Y USB:

USB trước đây được đăng ký
với Security Lab 02.

6.

DHCP MẠNG:

10.44.12.77 thuộc về
laptop của Victor.

7.

PHIÊN TỪ XA:

MAINT-7 sử dụng svc-archive.

8.

EMAIL ĐÃ XÓA:

Có người hướng dẫn Victor
sử dụng MAINT-7.`,
          },
        },

        {
          type: 'file',
          name: 'final-analysis.txt',

          content: {
            en: `FORENSIC ANALYSIS

The incident contains three
distinct identities:

IDENTITY A:
Daniel Cross

Used as the impersonated account.

IDENTITY B:
Victor Hale

Physical access evidence connects
Victor to the cloned badge,
USB device and maintenance endpoint.

IDENTITY C:
UNKNOWN OPERATOR

Used the external destination
10.44.19.88.

IMPORTANT:

Victor appears to have performed
the physical operation.

However, the transfer destination
was controlled by an unknown party.

The investigation must determine
whether Victor acted independently
or under external direction.`,

            vi: `PHÂN TÍCH PHÁP Y

Sự việc bao gồm ba
danh tính riêng biệt:

DANH TÍNH A:
Daniel Cross

Bị sử dụng làm tài khoản bị mạo danh.

DANH TÍNH B:
Victor Hale

Bằng chứng truy cập vật lý liên kết
Victor với thẻ bị sao chép,
thiết bị USB và endpoint bảo trì.

DANH TÍNH C:
NGƯỜI VẬN HÀNH KHÔNG XÁC ĐỊNH

Đã sử dụng máy chủ đích bên ngoài
10.44.19.88.

QUAN TRỌNG:

Victor có vẻ là người trực tiếp
thực hiện hoạt động vật lý.

Tuy nhiên, máy chủ đích của vụ chuyển dữ liệu
được kiểm soát bởi một bên không xác định.

Cuộc điều tra phải xác định
Victor hành động độc lập
hay theo chỉ đạo từ bên ngoài.`,
          },
        },
      ],
    },

    {
      type: 'directory',
      name: 'external',

      children: [
        {
          type: 'file',
          name: 'destination.txt',

          content: {
            en: `EXTERNAL NODE

IP:
10.44.19.88

HOSTNAME:
NODE-OMEGA

STATUS:
OFFLINE

SERVER CERTIFICATE:
SECURE-TRANSFER.LOCAL

LAST CONNECTION:
02:18:03

REGISTERED ORGANIZATION:
NONE

GEOLOCATION:
UNKNOWN

NOTE:

Node was created 6 days ago.

No corporate ownership found.`,

            vi: `NODE BÊN NGOÀI

IP:
10.44.19.88

TÊN MÁY CHỦ:
NODE-OMEGA

TRẠNG THÁI:
OFFLINE

CHỨNG CHỈ MÁY CHỦ:
SECURE-TRANSFER.LOCAL

KẾT NỐI CUỐI:
02:18:03

TỔ CHỨC ĐĂNG KÝ:
KHÔNG CÓ

VỊ TRÍ ĐỊA LÝ:
KHÔNG XÁC ĐỊNH

GHI CHÚ:

Node được tạo 6 ngày trước.

Không tìm thấy quyền sở hữu
của công ty.`,
          },
        },

        {
          type: 'file',
          name: 'certificate.txt',

          content: {
            en: `CERTIFICATE ANALYSIS

SUBJECT:
secure-transfer.local

ISSUER:
Internal Development CA

CREATED:
6 DAYS AGO

OWNER:
UNASSIGNED

CERTIFICATE SERIAL:
OMEGA-77-19

WARNING:

Certificate was signed using
a development CA.

Production transfer systems
must use Corporate CA.`,

            vi: `PHÂN TÍCH CHỨNG CHỈ

ĐỐI TƯỢNG:
secure-transfer.local

NHÀ CẤP:
Internal Development CA

ĐƯỢC TẠO:
6 NGÀY TRƯỚC

CHỦ SỞ HỮU:
CHƯA GÁN

SERIAL CHỨNG CHỈ:
OMEGA-77-19

CẢNH BÁO:

Chứng chỉ được ký bằng
CA phát triển.

Hệ thống chuyển dữ liệu production
phải sử dụng Corporate CA.`,
          },
        },

        {
          type: 'file',
          name: 'connection-history.txt',

          content: {
            en: `CONNECTION HISTORY

NODE-OMEGA

DAY -6:
CREATED

DAY -5:
NO CONNECTION

DAY -4:
NO CONNECTION

DAY -3:
CONNECTION TO:
SECURITY-LAB-02

DAY -2:
NO CONNECTION

DAY -1:
CONNECTION TO:
10.44.12.77

TODAY:
CONNECTION TO:
DC-WORKSTATION-07`,

            vi: `LỊCH SỬ KẾT NỐI

NODE-OMEGA

NGÀY -6:
ĐƯỢC TẠO

NGÀY -5:
KHÔNG CÓ KẾT NỐI

NGÀY -4:
KHÔNG CÓ KẾT NỐI

NGÀY -3:
KẾT NỐI VỚI:
SECURITY-LAB-02

NGÀY -2:
KHÔNG CÓ KẾT NỐI

NGÀY -1:
KẾT NỐI VỚI:
10.44.12.77

HÔM NAY:
KẾT NỐI VỚI:
DC-WORKSTATION-07`,
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
      id: 'system-activity',
      title: { en: 'System Activity Timeline', vi: 'Dòng thời gian hoạt động hệ thống' },
      description: {
        en: 'The workstation shows Daniel becoming idle, then service and archive activity leading to the final transfer.',
        vi: 'Máy trạm cho thấy Daniel chuyển sang trạng thái không hoạt động, sau đó xuất hiện hoạt động của tài khoản dịch vụ và archive dẫn tới vụ chuyển dữ liệu.',
      },
      type: 'digital',
      hint: {
        en: 'Start with the workstation timeline. Do not assume the account name identifies the operator.',
        vi: 'Hãy bắt đầu từ dòng thời gian của máy trạm. Đừng mặc định tên tài khoản chính là người thực hiện.',
      },
      discover: { type: 'cat', path: '/logs/system.log' },
      highlight: {
        en: ['USER SESSION IDLE', 'SERVICE ACCOUNT LOGIN', 'UNKNOWN-USB', 'ARCHIVE CREATED', 'OUTBOUND TRANSFER'],
        vi: ['PHIÊN DANIEL KHÔNG HOẠT ĐỘNG', 'ĐĂNG NHẬP TÀI KHOẢN DỊCH VỤ', 'USB-ĐÁNG NGỜ', 'ARCHIVE ĐƯỢC TẠO', 'CHUYỂN DỮ LIỆU RA NGOÀI'],
      },
      requiresEvidence: [],
      discovered: false,
    },
    {
      id: 'authentication-anomaly',
      title: { en: 'Authentication Anomaly', vi: 'Bất thường xác thực' },
      description: {
        en: "'Daniel's account was used from an unknown endpoint with MFA bypass after his legitimate session became idle.'",
        vi: 'Tài khoản của Daniel bị sử dụng từ một endpoint không xác định với MFA bị bỏ qua sau khi phiên hợp lệ của anh chuyển sang không hoạt động.',
      },
      type: 'digital',
      hint: { en: "'Compare the suspicious login with Daniel's legitimate login.'", vi: 'So sánh lần đăng nhập đáng ngờ với lần đăng nhập hợp lệ của Daniel.' },
      discover: { type: 'cat', path: '/logs/auth.log' },
      highlight: { en: ['01:42:13', '01:59:31', 'MFA BYPASS', 'UNKNOWN-ENDPOINT'], vi: ['01:42:13', '01:59:31', 'BỎ QUA MFA', 'UNKNOWN-ENDPOINT'] },
      requiresEvidence: ['system-activity'],
      discovered: false,
    },
    {
      id: 'network-trace',
      title: { en: 'Remote Connection Trace', vi: 'Truy dấu kết nối từ xa' },
      description: {
        en: "'The suspicious endpoint connected to Daniel's workstation through remote access shortly after the authentication anomaly.'",
        vi: 'Endpoint đáng ngờ kết nối tới máy trạm của Daniel qua truy cập từ xa ngay sau bất thường xác thực.',
      },
      type: 'digital',
      hint: { en: 'Follow the unknown endpoint to the device that actually generated the traffic.', vi: 'Hãy truy endpoint không xác định về thiết bị thực sự tạo ra lưu lượng.' },
      discover: { type: 'cat', path: '/network/network.log' },
      highlight: { en: ['UNKNOWN-ENDPOINT', '10.44.12.77', '3389', '02:17:42'], vi: ['UNKNOWN-ENDPOINT', '10.44.12.77', '3389', '02:17:42'] },
      requiresEvidence: ['authentication-anomaly'],
      discovered: false,
    },
    {
      id: 'dhcp-trace',
      title: { en: 'DHCP Device Identification', vi: 'Xác định thiết bị qua DHCP' },
      description: {
        en: 'DHCP maps 10.44.12.77 to VICTOR-LAPTOP, connecting the remote intrusion to a physical device.',
        vi: 'DHCP ánh xạ 10.44.12.77 tới VICTOR-LAPTOP, nối vụ truy cập từ xa với một thiết bị vật lý cụ thể.',
      },
      type: 'digital',
      hint: { en: 'An IP identifies a device, not automatically a person. Use the device identity as the next link.', vi: 'IP xác định thiết bị, chưa tự động xác định con người. Hãy dùng danh tính thiết bị làm mắt xích tiếp theo.' },
      discover: { type: 'cat', path: '/network/dhcp.log' },
      highlight: { en: ['10.44.12.77', 'VICTOR-LAPTOP'], vi: ['10.44.12.77', 'VICTOR-LAPTOP'] },
      requiresEvidence: ['network-trace'],
      discovered: false,
    },
    {
      id: 'maintenance-endpoint',
      title: { en: 'Legacy Maintenance Endpoint', vi: 'Endpoint bảo trì Legacy' },
      description: {
        en: 'MAINT-7 was an authorized legacy maintenance endpoint for Victor and Ethan and could create remote sessions with weaker logging.',
        vi: 'MAINT-7 là endpoint bảo trì legacy được cấp cho Victor và Ethan, có thể tạo phiên từ xa với cơ chế ghi log yếu hơn.',
      },
      type: 'digital',
      hint: { en: 'The remote session mentions MAINT-7. Find out who was allowed to use it.', vi: 'Phiên từ xa nhắc tới MAINT-7. Hãy xác định ai được phép sử dụng nó.' },
      discover: { type: 'cat', path: '/scripts/maintenance.txt' },
      highlight: { en: ['MAINT-7', 'Victor Hale', 'Ethan Cole', 'Legacy sessions'], vi: ['MAINT-7', 'Victor Hale', 'Ethan Cole', 'Phiên Legacy'] },
      requiresEvidence: ['network-trace'],
      discovered: false,
    },
    {
      id: 'service-account',
      title: { en: 'Compromised Archive Service', vi: 'Tài khoản dịch vụ Archive bị xâm phạm' },
      description: {
        en: 'svc-archive had READ + WRITE access to research data and its credential had been exposed before the incident.',
        vi: 'svc-archive có quyền ĐỌC + GHI dữ liệu nghiên cứu và thông tin xác thực của nó từng bị lộ trước vụ việc.',
      },
      type: 'digital',
      hint: { en: 'Now that you know the maintenance path, identify the service account used by it.', vi: 'Sau khi biết đường đi qua endpoint bảo trì, hãy xác định tài khoản dịch vụ được sử dụng.' },
      discover: { type: 'cat', path: '/users/service-accounts.txt' },
      highlight: { en: ['svc-archive', 'READ + WRITE RESEARCH', 'credential was exposed'], vi: ['svc-archive', 'ĐỌC + GHI RESEARCH', 'thông tin xác thực đã bị lộ'] },
      requiresEvidence: ['maintenance-endpoint'],
      discovered: false,
    },
    {
      id: 'remote-session',
      title: { en: 'Remote Session Evidence', vi: 'Bằng chứng phiên từ xa' },
      description: {
        en: 'The server session shows svc-archive being used through MAINT-7 and then impersonating Daniel.',
        vi: 'Phiên máy chủ cho thấy svc-archive được sử dụng qua MAINT-7 rồi mạo danh Daniel.',
      },
      type: 'digital',
      hint: { en: "'This is the bridge between the suspicious network connection and Daniel's account.'", vi: 'Đây là cầu nối giữa kết nối mạng đáng ngờ và tài khoản Daniel.' },
      discover: { type: 'cat', path: '/server/remote-session.log' },
      highlight: { en: ['MAINT-7', 'svc-archive', 'IMPERSONATION', 'daniel'], vi: ['MAINT-7', 'svc-archive', 'MẠO DANH', 'daniel'] },
      requiresEvidence: ['service-account'],
      discovered: false,
    },
    {
      id: 'process-forensics',
      title: { en: 'Archive Process Forensics', vi: 'Pháp y tiến trình tạo Archive' },
      description: {
        en: 'The remote process spawned archive-worker and elevated it to SYSTEM, explaining how the archive was actually created.',
        vi: 'Tiến trình từ xa tạo archive-worker và nâng quyền lên SYSTEM, giải thích archive thực sự được tạo như thế nào.',
      },
      type: 'digital',
      hint: { en: 'The audit log names Daniel, but process telemetry can identify the process that performed the operation.', vi: 'Audit log ghi tên Daniel, nhưng telemetry tiến trình có thể xác định tiến trình thực hiện thao tác.' },
      discover: { type: 'cat', path: '/server/process.log' },
      highlight: { en: ['remote-sync', 'archive-worker', 'PRIVILEGE: SYSTEM'], vi: ['remote-sync', 'archive-worker', 'QUYỀN: SYSTEM'] },
      requiresEvidence: ['remote-session'],
      discovered: false,
    },
    {
      id: 'memory-forensics',
      title: { en: 'Memory Credential Evidence', vi: 'Bằng chứng thông tin xác thực trong bộ nhớ' },
      description: {
        en: 'Memory from the suspicious process contains the same MAINT-7 and svc-archive references, independently confirming the execution path.',
        vi: 'Bộ nhớ của tiến trình đáng ngờ chứa cùng các tham chiếu MAINT-7 và svc-archive, xác nhận độc lập đường thực thi.',
      },
      type: 'digital',
      hint: { en: 'Use memory as independent confirmation of what the process actually used.', vi: 'Dùng bộ nhớ để xác nhận độc lập những gì tiến trình thực sự đã sử dụng.' },
      discover: { type: 'cat', path: '/forensics/memory.txt' },
      highlight: { en: ['MAINT-7', 'svc-archive', 'Token owner'], vi: ['MAINT-7', 'svc-archive', 'Chủ sở hữu token'] },
      requiresEvidence: ['process-forensics'],
      discovered: false,
    },
    {
      id: 'usb-device',
      title: { en: 'Suspicious USB Device', vi: 'Thiết bị USB đáng ngờ' },
      description: {
        en: 'USB VX-7719 was connected shortly before the archive was created.',
        vi: 'USB VX-7719 được kết nối ngay trước khi archive được tạo.',
      },
      type: 'digital',
      hint: { en: 'The workstation timeline shows removable media. Inspect the device record.', vi: 'Dòng thời gian máy trạm cho thấy có thiết bị rời. Hãy kiểm tra hồ sơ thiết bị.' },
      discover: { type: 'cat', path: '/devices/usb.log' },
      highlight: { en: ['VX-7719', 'USB STORAGE', '02:14:02'], vi: ['VX-7719', 'USB STORAGE', '02:14:02'] },
      requiresEvidence: ['system-activity'],
      discovered: false,
    },
    {
      id: 'usb-history',
      title: { en: 'USB Ownership History', vi: 'Lịch sử sở hữu USB' },
      description: {
        en: 'Forensic device records connect VX-7719 to Security Lab 02 and identify Victor as its last user.',
        vi: 'Hồ sơ pháp y thiết bị liên kết VX-7719 với Security Lab 02 và xác định Victor là người dùng cuối.',
      },
      type: 'digital',
      hint: { en: 'A suspicious USB matters only when you can connect it to a person or location.', vi: 'USB đáng ngờ chỉ có giá trị khi bạn liên kết được nó với người hoặc địa điểm.' },
      discover: { type: 'cat', path: '/forensics/usb-forensics.txt' },
      highlight: { en: ['VX-7719', 'SECURITY-LAB-02', 'LAST USER: VICTOR'], vi: ['VX-7719', 'SECURITY-LAB-02', 'NGƯỜI DÙNG CUỐI: VICTOR'] },
      requiresEvidence: ['usb-device'],
      discovered: false,
    },
    {
      id: 'usb-content',
      title: { en: 'Attack Toolkit on USB', vi: 'Bộ công cụ trên USB' },
      description: {
        en: 'The USB contained the stolen archive plus access and cleanup scripts.',
        vi: 'USB chứa archive bị đánh cắp cùng script truy cập và script xóa dấu vết.',
      },
      type: 'digital',
      hint: { en: 'Inspect the USB contents to see whether it carried more than the stolen data.', vi: 'Kiểm tra nội dung USB để xem nó có chứa gì ngoài dữ liệu bị đánh cắp.' },
      discover: { type: 'cat', path: '/devices/usb-content.txt' },
      highlight: { en: ['phoenix-export.tar', 'access-script.bin', 'cleanup.sh'], vi: ['phoenix-export.tar', 'access-script.bin', 'cleanup.sh'] },
      requiresEvidence: ['usb-history'],
      discovered: false,
    },
    {
      id: 'access-script',
      title: { en: 'Remote Access Script', vi: 'Script truy cập từ xa' },
      description: {
        en: 'The USB script references svc-archive, MAINT-7 and remote-sync—the same path seen in server telemetry.',
        vi: 'Script trên USB tham chiếu svc-archive, MAINT-7 và remote-sync—đúng đường đi xuất hiện trong telemetry máy chủ.',
      },
      type: 'digital',
      hint: { en: 'Compare the script with the remote session and process evidence.', vi: 'So sánh script với bằng chứng phiên từ xa và tiến trình.' },
      discover: { type: 'cat', path: '/scripts/access-script.bin' },
      highlight: { en: ['svc-archive', 'MAINT-7', 'remote-sync'], vi: ['svc-archive', 'MAINT-7', 'remote-sync'] },
      requiresEvidence: ['usb-content', 'remote-session'],
      discovered: false,
    },
    {
      id: 'cleanup-script',
      title: { en: 'Evidence Cleanup Script', vi: 'Script xóa dấu vết' },
      description: {
        en: 'The cleanup script attempts to terminate remote-sync and delete the stolen archive and remote-session log.',
        vi: 'Script dọn dẹp cố kết thúc remote-sync và xóa archive bị đánh cắp cùng log phiên từ xa.',
      },
      type: 'digital',
      hint: { en: 'Once you find the access tool, inspect what the operator planned to erase.', vi: 'Sau khi tìm thấy công cụ truy cập, hãy kiểm tra những gì kẻ thực hiện định xóa.' },
      discover: { type: 'cat', path: '/scripts/cleanup.sh' },
      highlight: { en: ['killall remote-sync', 'rm /tmp/.cache/archive/phoenix-export.tar', 'rm /var/log/remote-session.log'], vi: ['killall remote-sync', 'rm /tmp/.cache/archive/phoenix-export.tar', 'rm /var/log/remote-session.log'] },
      requiresEvidence: ['access-script'],
      discovered: false,
    },
    {
      id: 'badge-analysis',
      title: { en: 'Cloned Security Badge', vi: 'Thẻ an ninh bị sao chép' },
      description: {
        en: "'Daniel's badge credential opened Server Room 4, but forensic analysis indicates the physical badge was cloned.'",
        vi: 'Thông tin thẻ của Daniel mở được Phòng Máy chủ 4, nhưng pháp y cho thấy thẻ vật lý đã bị sao chép.',
      },
      type: 'object',
      hint: { en: 'The access system proves a credential was used, not who carried it.', vi: 'Hệ thống ra vào chỉ chứng minh một credential được sử dụng, không chứng minh ai mang nó.' },
      discover: { type: 'cat', path: '/forensics/badge-forensics.txt' },
      highlight: { en: ['DANIEL CROSS', 'CRYPTOGRAPHIC SIGNATURE: INVALID', 'CLONED BADGE'], vi: ['DANIEL CROSS', 'CHỮ KÝ MẬT MÃ: KHÔNG HỢP LỆ', 'THẺ BỊ SAO CHÉP'] },
      requiresEvidence: [],
      discovered: false,
    },
    {
      id: 'camera-evidence',
      title: { en: 'Server Room Camera Evidence', vi: 'Bằng chứng camera phòng máy chủ' },
      description: {
        en: 'Camera analysis shows the person entering Server Room 4 was not Daniel.',
        vi: 'Phân tích camera cho thấy người bước vào Phòng Máy chủ 4 không phải Daniel.',
      },
      type: 'photo',
      hint: { en: 'Combine the cloned badge with the person actually seen on camera.', vi: 'Kết hợp thẻ bị sao chép với người thực sự xuất hiện trên camera.' },
      discover: { type: 'cat', path: '/camera/camera-analysis.txt' },
      highlight: { en: ['does NOT appear to be Daniel Cross', '180 CM', 'Daniel Cross', '174 CM'], vi: ['KHÔNG có vẻ là Daniel Cross', '180 CM', 'Daniel Cross', '174 CM'] },
      requiresEvidence: ['badge-analysis'],
      discovered: false,
    },
    {
      id: 'camera-timeline',
      title: { en: 'Physical Surveillance Timeline', vi: 'Dòng thời gian giám sát vật lý' },
      description: {
        en: 'Camera footage places Victor in the Security Lab and later shows a taller person entering and leaving Server Room 4.',
        vi: 'Camera đặt Victor tại Phòng An ninh và sau đó ghi nhận một người cao hơn bước vào rồi rời Phòng Máy chủ 4.',
      },
      type: 'photo',
      hint: { en: 'Build the physical timeline independently, then compare it with the network timeline.', vi: 'Tái dựng dòng thời gian vật lý trước, sau đó đối chiếu với dòng thời gian mạng.' },
      discover: { type: 'cat', path: '/camera/camera.log' },
      highlight: { en: ['Victor enters Security Lab', "'Person carrying Daniel's badge'", 'Person exits', 'Daniel Cross discovered'], vi: ['Victor bước vào Phòng An ninh', 'Người mang thẻ của Daniel', 'Người này rời đi', 'Phát hiện Daniel Cross'] },
      requiresEvidence: ['camera-evidence'],
      discovered: false,
    },
    {
      id: 'victor-profile',
      title: { en: 'Victor Hale Profile', vi: 'Hồ sơ Victor Hale' },
      description: {
        en: 'Victor is a security administrator, uses VICTOR-LAPTOP, has privileged access and is approximately the same height as the person in the server-room footage.',
        vi: 'Victor là quản trị viên an ninh, sử dụng VICTOR-LAPTOP, có quyền đặc biệt và có chiều cao gần bằng người xuất hiện trong camera phòng máy chủ.',
      },
      type: 'object',
      hint: { en: "'A physical match is not enough. Verify Victor's access and technical capability.'", vi: 'Khớp hình thể vẫn chưa đủ. Hãy xác minh quyền truy cập và khả năng kỹ thuật của Victor.' },
      discover: { type: 'cat', path: '/users/victor.txt' },
      highlight: { en: ['Victor Hale', '181 CM', 'PRIVILEGED ACCESS', 'VICTOR-LAPTOP'], vi: ['Victor Hale', '181 CM', 'QUYỀN TRUY CẬP ĐẶC BIỆT', 'VICTOR-LAPTOP'] },
      requiresEvidence: ['dhcp-trace', 'camera-timeline'],
      discovered: false,
    },
    {
      id: 'deleted-email',
      title: { en: 'Deleted Maintenance Message', vi: 'Tin nhắn bảo trì đã xóa' },
      description: {
        en: 'A recovered message directed Victor to use the old credential and MAINT-7 while keeping Daniel out of the operation.',
        vi: 'Tin nhắn khôi phục cho thấy Victor được hướng dẫn dùng credential cũ và MAINT-7, đồng thời không liên quan Daniel.',
      },
      type: 'document',
      hint: { en: 'Now ask why Victor would use this maintenance path. Search the recovered communications.', vi: 'Bây giờ hãy hỏi vì sao Victor lại dùng đường bảo trì này. Tìm các liên lạc đã được khôi phục.' },
      discover: { type: 'cat', path: '/emails/deleted-mail.txt' },
      highlight: { en: ['victor.hale@company.local', 'old credential still works', 'MAINT-7', 'Do not involve Daniel'], vi: ['victor.hale@company.local', 'thông tin xác thực cũ vẫn hoạt động', 'MAINT-7', 'Không được liên quan đến Daniel'] },
      requiresEvidence: ['victor-profile', 'maintenance-endpoint'],
      discovered: false,
    },
    {
      id: 'external-node',
      title: { en: 'Unknown External Node', vi: 'Node bên ngoài không xác định' },
      description: {
        en: 'The Phoenix archive was transferred to NODE-OMEGA at 10.44.19.88, a recently created system with no corporate ownership.',
        vi: 'Archive Phoenix được chuyển tới NODE-OMEGA tại 10.44.19.88, một hệ thống mới tạo và không có chủ sở hữu doanh nghiệp.',
      },
      type: 'digital',
      hint: { en: 'Follow the destination of the 02:17 transfer.', vi: 'Hãy lần theo đích đến của vụ chuyển dữ liệu lúc 02:17.' },
      discover: { type: 'cat', path: '/external/destination.txt' },
      highlight: { en: ['10.44.19.88', 'NODE-OMEGA', '6 days ago', 'No corporate ownership found'], vi: ['10.44.19.88', 'NODE-OMEGA', '6 ngày trước', 'Không tìm thấy quyền sở hữu của công ty'] },
      requiresEvidence: ['network-trace'],
      discovered: false,
    },
    {
      id: 'external-certificate',
      title: { en: 'Suspicious External Certificate', vi: 'Chứng chỉ máy chủ bên ngoài đáng ngờ' },
      description: {
        en: 'NODE-OMEGA uses a development certificate rather than the corporate production certificate.',
        vi: 'NODE-OMEGA dùng chứng chỉ development thay vì chứng chỉ production của công ty.',
      },
      type: 'digital',
      hint: { en: 'Determine whether the destination looks like an approved production system.', vi: 'Xác định xem máy chủ đích có phải hệ thống production được phê duyệt hay không.' },
      discover: { type: 'cat', path: '/external/certificate.txt' },
      highlight: { en: ['Development CA', '6 DAYS AGO', 'UNASSIGNED'], vi: ['Development CA', '6 NGÀY TRƯỚC', 'CHƯA GÁN'] },
      requiresEvidence: ['external-node'],
      discovered: false,
    },
    {
      id: 'external-history',
      title: { en: 'External Connection History', vi: 'Lịch sử kết nối máy chủ bên ngoài' },
      description: {
        en: "'NODE-OMEGA had prior connections to Security Lab 02 and Victor's laptop before the final transfer.'",
        vi: 'NODE-OMEGA từng kết nối với Security Lab 02 và laptop của Victor trước vụ chuyển dữ liệu cuối cùng.',
      },
      type: 'digital',
      hint: { en: 'Trace NODE-OMEGA backward. The history may connect the external controller to the internal operation.', vi: 'Truy ngược NODE-OMEGA. Lịch sử có thể nối người điều khiển bên ngoài với hoạt động nội bộ.' },
      discover: { type: 'cat', path: '/external/connection-history.txt' },
      highlight: { en: ['SECURITY-LAB-02', '10.44.12.77', 'DC-WORKSTATION-07'], vi: ['SECURITY-LAB-02', '10.44.12.77', 'DC-WORKSTATION-07'] },
      requiresEvidence: ['external-certificate', 'dhcp-trace'],
      discovered: false,
    },
    {
      id: 'log-tampering',
      title: { en: 'Tampered Authentication Log', vi: 'Nhật ký xác thực bị chỉnh sửa' },
      description: {
        en: 'The integrity report proves auth.log was modified, so it cannot be treated as the sole source of truth.',
        vi: 'Báo cáo toàn vẹn chứng minh auth.log đã bị sửa, vì vậy không thể dùng nó làm nguồn sự thật duy nhất.',
      },
      type: 'digital',
      hint: { en: 'Before trusting a suspicious login record, verify the log integrity.', vi: 'Trước khi tin một bản ghi đăng nhập đáng ngờ, hãy kiểm tra tính toàn vẹn của log.' },
      discover: { type: 'cat', path: '/logs/integrity.log' },
      highlight: { en: ['auth.log', 'STATUS: MODIFIED'], vi: ['auth.log', 'TRẠNG THÁI: ĐÃ CHỈNH SỬA'] },
      requiresEvidence: ['authentication-anomaly'],
      discovered: false,
    },
    {
      id: 'incident-contradictions',
      title: { en: 'Evidence Contradictions', vi: 'Mâu thuẫn trong bằng chứng' },
      description: {
        en: "'Independent evidence shows that Daniel's account and badge were used, but Daniel was not the person performing the operation.'",
        vi: 'Các nguồn bằng chứng độc lập cho thấy tài khoản và thẻ của Daniel bị sử dụng, nhưng Daniel không phải người thực hiện.',
      },
      type: 'digital',
      hint: { en: 'Compare account, process, network and camera evidence. Look for a consistent alternative explanation.', vi: 'So sánh bằng chứng tài khoản, tiến trình, mạng và camera. Tìm một lời giải thích thay thế nhất quán.' },
      discover: { type: 'cat', path: '/incident/contradictions.txt' },
      highlight: { en: ['MFA BYPASS', 'cloned', 'archive-worker', 'does not match Daniel', 'VICTOR-LAPTOP', 'MAINT-7'], vi: ['BỎ QUA MFA', 'bị sao chép', 'archive-worker', 'không khớp với Daniel', 'VICTOR-LAPTOP', 'MAINT-7'] },
      requiresEvidence: ['log-tampering', 'process-forensics', 'camera-evidence', 'dhcp-trace'],
      discovered: false,
    },
    {
      id: 'final-forensics',
      title: { en: 'Final Forensic Analysis', vi: 'Phân tích pháp y cuối cùng' },
      description: {
        en: 'The evidence separates Daniel as the impersonated account, Victor as the likely physical operator, and an unknown party controlling NODE-OMEGA.',
        vi: 'Bằng chứng tách Daniel thành chủ tài khoản bị mạo danh, Victor là người có khả năng trực tiếp thực hiện, và một bên không xác định kiểm soát NODE-OMEGA.',
      },
      type: 'digital',
      hint: { en: 'Do not collapse the physical operator and external controller into one identity without evidence.', vi: 'Đừng gộp người trực tiếp thực hiện và người điều khiển bên ngoài thành một danh tính nếu chưa có bằng chứng.' },
      discover: { type: 'cat', path: '/incident/final-analysis.txt' },
      highlight: { en: ['IDENTITY A', 'IDENTITY B', 'IDENTITY C', 'Victor Hale', 'unknown party'], vi: ['DANH TÍNH A', 'DANH TÍNH B', 'DANH TÍNH C', 'Victor Hale', 'bên không xác định'] },
      requiresEvidence: ['incident-contradictions', 'external-history', 'deleted-email'],
      discovered: false,
    },
    {
      id: 'final-timeline',
      title: { en: 'Complete Incident Timeline', vi: 'Dòng thời gian hoàn chỉnh của sự việc' },
      description: {
        en: 'The final timeline connects the account compromise, remote session, physical access, USB tooling, archive creation and external transfer.',
        vi: 'Dòng thời gian cuối cùng liên kết việc chiếm quyền tài khoản, phiên từ xa, truy cập vật lý, công cụ USB, tạo archive và chuyển dữ liệu ra ngoài.',
      },
      type: 'digital',
      hint: { en: 'Only after the separate evidence chains agree should you reconstruct the whole operation.', vi: 'Chỉ sau khi các chuỗi bằng chứng độc lập khớp nhau mới tái dựng toàn bộ hoạt động.' },
      discover: { type: 'cat', path: '/incident/timeline.txt' },
      highlight: { en: ['18:32', '01:49', '01:58', '01:59', '02:11', '02:14', '02:17', '02:19'], vi: ['18:32', '01:49', '01:58', '01:59', '02:11', '02:14', '02:17', '02:19'] },
      requiresEvidence: ['final-forensics', 'cleanup-script', 'camera-timeline', 'external-history'],
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
      id: 'reconstruct-digital-timeline',
      title: { en: 'Reconstruct the digital timeline', vi: 'Tái dựng dòng thời gian kỹ thuật số' },
      description: {
        en: "'Establish the sequence from Daniel's idle session to the remote session, archive creation and final transfer.'",
        vi: 'Xác lập chuỗi sự kiện từ khi phiên của Daniel không hoạt động đến phiên từ xa, tạo archive và chuyển dữ liệu.',
      },
      requiresEvidence: ['system-activity', 'authentication-anomaly', 'remote-session', 'process-forensics'],
      completed: false,
    },
    {
      id: 'identify-attack-source',
      title: { en: 'Identify the attack source', vi: 'Xác định nguồn tấn công' },
      description: {
        en: 'Trace the suspicious connection from the unknown endpoint to the physical device that generated it.',
        vi: 'Truy dấu kết nối đáng ngờ từ endpoint không xác định tới thiết bị vật lý đã tạo ra nó.',
      },
      requiresEvidence: ['network-trace', 'dhcp-trace'],
      completed: false,
    },
    {
      id: 'identify-execution-path',
      title: { en: 'Identify the execution path', vi: 'Xác định đường thực thi' },
      description: {
        en: 'Determine how the attacker moved from the maintenance endpoint to svc-archive and then to the archive worker.',
        vi: 'Xác định kẻ tấn công đi từ endpoint bảo trì tới svc-archive rồi tới archive-worker như thế nào.',
      },
      requiresEvidence: ['maintenance-endpoint', 'service-account', 'remote-session', 'process-forensics', 'memory-forensics'],
      completed: false,
    },
    {
      id: 'trace-usb-device',
      title: { en: 'Trace the suspicious USB', vi: 'Truy dấu USB đáng ngờ' },
      description: {
        en: 'Connect the USB to its previous owner and determine whether it carried the tools used in the operation.',
        vi: 'Liên kết USB với người từng sử dụng nó và xác định liệu nó có chứa công cụ được dùng trong vụ việc hay không.',
      },
      requiresEvidence: ['usb-device', 'usb-history', 'usb-content', 'access-script'],
      completed: false,
    },
    {
      id: 'prove-physical-intrusion',
      title: { en: 'Prove the physical intrusion', vi: 'Chứng minh vụ xâm nhập vật lý' },
      description: {
        en: 'Prove Daniel did not enter Server Room 4 and determine why the person using his badge is linked to Victor.',
        vi: 'Chứng minh Daniel không vào Phòng Máy chủ 4 và xác định vì sao người dùng thẻ của anh lại liên quan tới Victor.',
      },
      requiresEvidence: ['badge-analysis', 'camera-evidence', 'camera-timeline', 'victor-profile'],
      completed: false,
    },
    {
      id: 'trace-motive',
      title: { en: 'Trace the motive and instruction', vi: 'Truy tìm động cơ và chỉ đạo' },
      description: {
        en: 'Find the communication that connects Victor to MAINT-7 and determine whether the operation was directed by someone else.',
        vi: 'Tìm liên lạc kết nối Victor với MAINT-7 và xác định liệu hoạt động có được một bên khác chỉ đạo hay không.',
      },
      requiresEvidence: ['victor-profile', 'deleted-email', 'external-history'],
      completed: false,
    },
    {
      id: 'trace-exfiltration',
      title: { en: 'Trace the stolen research', vi: 'Truy dấu dữ liệu bị đánh cắp' },
      description: {
        en: 'Identify the destination of the Phoenix archive and determine whether it was an authorized corporate system.',
        vi: 'Xác định đích đến của archive Phoenix và xem đó có phải hệ thống được công ty cấp phép hay không.',
      },
      requiresEvidence: ['external-node', 'external-certificate', 'external-history'],
      completed: false,
    },
    {
      id: 'separate-identities',
      title: { en: 'Separate the three identities', vi: 'Phân biệt ba danh tính' },
      description: {
        en: 'Separate Daniel as the impersonated account, Victor as the likely physical operator, and the unknown external controller.',
        vi: 'Phân biệt Daniel là tài khoản bị mạo danh, Victor là người có khả năng trực tiếp thực hiện và bên điều khiển bên ngoài chưa xác định.',
      },
      requiresEvidence: ['incident-contradictions', 'final-forensics'],
      completed: false,
    },
    {
      id: 'reconstruct-full-operation',
      title: { en: 'Reconstruct the Ghost Protocol', vi: 'Tái dựng Giao thức Bóng Ma' },
      description: {
        en: 'Combine the digital, physical and external evidence into one consistent account of the operation, including the attempted cleanup.',
        vi: 'Kết hợp bằng chứng kỹ thuật số, vật lý và bên ngoài thành một diễn biến nhất quán, bao gồm cả nỗ lực xóa dấu vết.',
      },
      requiresEvidence: ['log-tampering', 'cleanup-script', 'final-timeline'],
      completed: false,
    },
  ],
}
