import type {
  FileNode
} from '~/types/games/whoami'

export const filesystem:
  Record<string, FileNode> = {

  '/': {
    path: '/',
    name: '/',
    type: 'directory'
  },

  '/system': {
    path: '/system',
    name: 'system',
    type: 'directory'
  },

  '/system/version': {
    path: '/system/version',
    name: 'version',
    type: 'file',

    content:
`PANDORA_OS
PHIÊN BẢN 0.1.7
BẢN DỰNG 441

TRẠNG THÁI:
HỆ THỐNG QUẢN THÚC ĐANG HOẠT ĐỘNG`
  },

  '/system/readme.txt': {
    path: '/system/readme.txt',
    name: 'readme.txt',
    type: 'file',

    content:
`GIAO THỨC QUẢN THÚC PANDORA

Bảy thực thể đã bị phong ấn.

Không được mở chiếc hộp.

Nếu hệ thống quản thúc thất bại:

KHÔNG ĐƯỢC TIN TERMINAL.`
  },

  '/logs': {
    path: '/logs',
    name: 'logs',
    type: 'directory'
  },

  '/logs/session_001': {
    path: '/logs/session_001',
    name: 'session_001',
    type: 'file',

    content:
`PHIÊN 001

Người vận hành: ELIAS VALE

Hệ thống vẫn im lặng.

Sau đó tôi nghe thấy tiếng thở.

Không có ai khác trong căn phòng.`
  },

  '/logs/session_002': {
    path: '/logs/session_002',
    name: 'session_002',
    type: 'file',

    requiredSeal: 1,

    content:
`PHIÊN 002

Phong ấn đầu tiên phản ứng với âm thanh.

Đáng lẽ nó không thể nghe thấy tôi.`
  },

  '/logs/session_003': {
    path: '/logs/session_003',
    name: 'session_003',
    type: 'file',

    requiredSeal: 2,

    content:
`PHIÊN 003

Phát hiện suy giảm trí nhớ.

Tôi nhớ mình đã mở cánh cửa.

Nhưng trong cơ sở này không hề có cánh cửa nào.`
  },

  '/logs/session_004': {
    path: '/logs/session_004',
    name: 'session_004',
    type: 'file',

    requiredSeal: 3,

    content:
`PHIÊN 004

Ai đó đã thay đổi nhật ký.

Dấu thời gian ghi là ngày mai.`
  },

  '/entities': {
    path: '/entities',
    name: 'entities',
    type: 'directory'
  },

  '/entities/fear': {
    path: '/entities/fear',
    name: 'fear',
    type: 'file',

    content:
`THỰC THỂ 001

ĐỊNH DANH:
NỖI SỢ

TRẠNG THÁI:
ĐANG BỊ QUẢN THÚC

MỨC ĐỘ ĐE DỌA:
KHÔNG XÁC ĐỊNH`
  },

  '/entities/memory': {
    path: '/entities/memory',
    name: 'memory',
    type: 'file',

    requiredSeal: 1,

    content:
`THỰC THỂ 002

ĐỊNH DANH:
KÝ ỨC

TRẠNG THÁI:
ĐANG BỊ QUẢN THÚC

CẢNH BÁO:
KHÔNG ĐƯỢC ĐỌC HAI LẦN.`
  },

  '/entities/deception': {
    path: '/entities/deception',
    name: 'deception',
    type: 'file',

    requiredSeal: 2,

    content:
`THỰC THỂ 003

ĐỊNH DANH:
LỪA DỐI

TRẠNG THÁI:
ĐANG BỊ QUẢN THÚC

CẢNH BÁO:
TERMINAL CÓ THỂ ĐANG NÓI DỐI.`
  },

  '/entities/hunger': {
    path: '/entities/hunger',
    name: 'hunger',
    type: 'file',

    requiredSeal: 3,

    content:
`THỰC THỂ 004

ĐỊNH DANH:
ĐÓI KHÁT

TRẠNG THÁI:
ĐANG BỊ QUẢN THÚC

KHUYẾN CÁO:
KHÔNG ĐƯỢC CHO NÓ ĂN.`
  },

  '/entities/madness': {
    path: '/entities/madness',
    name: 'madness',
    type: 'file',

    requiredSeal: 4,

    content:
`THỰC THỂ 005

ĐỊNH DANH:
ĐIÊN LOẠN

TRẠNG THÁI:
ĐANG BỊ QUẢN THÚC

QUAN SÁT:
NÓ BIẾT TÊN CỦA BẠN.`
  },

  '/entities/hope': {
    path: '/entities/hope',
    name: 'hope',
    type: 'file',

    requiredSeal: 5,

    content:
`THỰC THỂ 006

ĐỊNH DANH:
HY VỌNG

TRẠNG THÁI:
ĐANG BỊ QUẢN THÚC

CẢNH BÁO:
HY VỌNG KHÔNG PHẢI LÀ THỨ AN TOÀN.`
  },

  '/pandora': {
    path: '/pandora',
    name: 'pandora',
    type: 'directory'
  },

  '/pandora/box': {
    path: '/pandora/box',
    name: 'box',
    type: 'file',

    content:
`HỘP PANDORA

TRẠNG THÁI:
ĐANG BỊ NIÊM PHONG

NGUỒN GỐC:
KHÔNG XÁC ĐỊNH

ỦY QUYỀN:
YÊU CẦU`
  },

  '/pandora/true': {
    path: '/pandora/true',
    name: 'true',
    type: 'file',

    requiredSeal: 6,

    content:
`PANDORA

DANH TÍNH:
KHÔNG XÁC ĐỊNH

PHÂN LOẠI:
THỰC THỂ 007

THÔNG BÁO:

BẠN CHƯA BAO GIỜ LÀ NGƯỜI VẬN HÀNH.`
  }
}
