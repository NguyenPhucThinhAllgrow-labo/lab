import type { Scenario } from '~/types/games/detective'

export const case004: Scenario = {
  id: 'case004',
  title: {
    en: 'CASE 004 — THE LAST SIGNAL',
    vi: 'VỤ ÁN 004 — TÍN HIỆU CUỐI CÙNG',
  },
  description: {
    en: 'You arrive at apartment 17B as the police forensic investigator. Investigative journalist Ethan Ward is dead beside his unlocked laptop, the encrypted source drive is missing, and a second victim may still be alive. Examine the laptop at the scene through a read-only forensic bridge, correlate its artifacts with authorized police systems, identify the offender and locate him before the final signal disappears.',
    vi: 'Bạn đến căn hộ 17B với vai trò chuyên viên điều tra pháp y của cảnh sát. Nhà báo Ethan Ward tử vong cạnh chiếc laptop đang mở khóa, ổ nguồn tin mã hóa đã biến mất và có thể vẫn còn một nạn nhân thứ hai đang sống. Hãy điều tra chiếc laptop ngay tại hiện trường qua cầu nối pháp y chỉ đọc, đối chiếu dấu vết với các hệ thống cảnh sát được cấp quyền, xác định hung thủ và tìm ra vị trí của hắn trước khi tín hiệu cuối cùng biến mất.',
  },
  initialDirectory: '/',
  intro: {
    en: [
      'POLICE JOINT INVESTIGATION TERMINAL // CASE 004',
      '------------------------------------------------',
      '06:42 — You arrive and secure crime scene 17B.',
      'Victim: Ethan Ward, investigative journalist.',
      'Estimated time of death: 01:10–01:35.',
      '',
      "Ethan's laptop is awake beside the victim. The encrypted source drive is gone.",
      'You attach a police read-only forensic bridge to the laptop.',
      'The original disk remains write-blocked while you investigate it on scene.',
      'A message suggests his editor, Claire Bennett, was taken alive.',
      'Someone used a police evidence account to erase records.',
      '',
      'This terminal combines the laptop image with authorized police data mounts.',
      'Read /README.txt to identify the source of each top-level folder.',
      'Preserve separate chains of digital, physical and telecom evidence.',
      'Find the false trail. Identify the offender. Locate and arrest him.',
      '',
      'CAUTION: clocks disagree and one location record was forged.',
      'Restricted records require sudo. Reading a sealed file opens a password prompt.',
      'Use help to review all available commands.',
    ],
    vi: [
      'HỆ THỐNG ĐIỀU TRA LIÊN NGÀNH // VỤ ÁN 004',
      '------------------------------------------------',
      '06:42 — Bạn tới và phong tỏa hiện trường căn hộ 17B.',
      'Nạn nhân: Ethan Ward, nhà báo điều tra.',
      'Thời gian tử vong ước tính: 01:10–01:35.',
      '',
      'Laptop của Ethan đang hoạt động cạnh nạn nhân. Ổ nguồn tin mã hóa đã biến mất.',
      'Bạn gắn cầu nối pháp y chỉ đọc của cảnh sát vào laptop.',
      'Ổ đĩa gốc được chặn ghi trong suốt quá trình điều tra tại hiện trường.',
      'Một tin nhắn cho thấy biên tập viên Claire Bennett bị bắt đi khi còn sống.',
      'Có kẻ đã dùng tài khoản kho vật chứng cảnh sát để xóa dữ liệu.',
      '',
      'Terminal này kết hợp ảnh laptop với các nguồn dữ liệu cảnh sát được cấp quyền.',
      'Đọc /README.txt để biết nguồn của từng thư mục cấp cao.',
      'Hãy giữ độc lập các chuỗi chứng cứ số, vật lý và viễn thông.',
      'Phá dấu vết giả. Xác định hung thủ. Định vị và bắt giữ hắn.',
      '',
      'CẢNH BÁO: các đồng hồ lệch nhau và một bản ghi vị trí đã bị làm giả.',
      'Hồ sơ hạn chế cần sudo. Khi đọc tệp niêm phong, hệ thống sẽ yêu cầu mật mã.',
      'Dùng help để xem toàn bộ lệnh khả dụng.',
    ],
  },
  filesystem: [
    {
      type: 'file',
      name: 'README.txt',
      content: {
        en: `ON-SCENE FORENSIC WORKSPACE\nTarget device: Ethan Ward laptop EW-LAPTOP-01\nAcquisition: live read-only bridge; original disk write-blocked\n\n/laptop  — files and artifacts read from Ethan's laptop\n/scene   — observations entered by the on-scene police team\n/police  — restricted remote police records; sudo authorization required\n/network — authorized network-provider returns\n/city    — municipal camera, parking and map returns\n/telecom — emergency telecom returns\n/analysis — investigator-generated correlations and warrant material\n\nThese mount points are evidence sources in the police field terminal. Only /laptop represents data stored on the victim's computer.`,
        vi: `KHÔNG GIAN PHÁP Y TẠI HIỆN TRƯỜNG\nThiết bị mục tiêu: laptop Ethan Ward EW-LAPTOP-01\nThu thập: cầu nối trực tiếp chỉ đọc; ổ gốc bị chặn ghi\n\n/laptop  — tệp và dấu vết đọc từ laptop của Ethan\n/scene   — quan sát do tổ cảnh sát hiện trường nhập\n/police  — hồ sơ cảnh sát từ xa bị hạn chế; cần quyền sudo\n/network — dữ liệu nhà cung cấp mạng trả về theo thẩm quyền\n/city    — dữ liệu camera, bãi xe và bản đồ đô thị\n/telecom — dữ liệu viễn thông khẩn cấp\n/analysis — kết quả đối chiếu và tài liệu xin lệnh do điều tra viên tạo\n\nCác điểm mount này là nguồn chứng cứ trong terminal hiện trường của cảnh sát. Chỉ /laptop là dữ liệu thực sự nằm trên máy tính nạn nhân.`,
      },
    },
    {
      type: 'directory', name: 'scene', children: [
        { type: 'file', name: 'first-response.txt', content: {
          en: `SCENE 17B — FIRST RESPONSE\n06:42 perimeter established\nVictim beside desk; no forced entry\nSmart lock latched; balcony ajar\nLaptop awake; source drive absent\nKitchen: two cups, one rinsed\nRecovered under radiator: torn parking stub P-4187\nBedroom clock displays 01:18 but power monitor records a 17-minute drift`,
          vi: `HIỆN TRƯỜNG 17B — PHẢN ỨNG ĐẦU TIÊN\n06:42 thiết lập vành đai\nNạn nhân cạnh bàn; không có dấu cạy cửa\nKhóa thông minh đã chốt; cửa ban công hé mở\nLaptop đang hoạt động; ổ nguồn tin biến mất\nBếp: hai chiếc cốc, một chiếc đã rửa\nDưới lò sưởi: cuống vé đỗ xe rách P-4187\nĐồng hồ phòng ngủ chỉ 01:18 nhưng bộ giám sát điện ghi nhận lệch 17 phút`,
        } },
        { type: 'file', name: 'forensics.txt', content: {
          en: `FORENSIC PRELIMINARY\nDeath window: 01:10–01:35 TRUE TIME\nSedative residue in rinsed cup\nPartial glove print: right thumb, scar interruption\nBlue alkyd paint flakes and jute fibers on balcony rail\nVictim's phone stopped moving at 01:12; watch recorded a struggle at 01:14`,
          vi: `PHÁP Y SƠ BỘ\nKhoảng tử vong: 01:10–01:35 GIỜ THỰC\nCặn thuốc an thần trong chiếc cốc đã rửa\nDấu găng tay bán phần: ngón cái phải, bị ngắt bởi vết sẹo\nVảy sơn alkyd xanh và sợi đay trên lan can\nĐiện thoại nạn nhân ngừng di chuyển lúc 01:12; đồng hồ ghi nhận giằng co lúc 01:14`,
        } },
        { type: 'file', name: 'chain-of-custody.txt', content: {
          en: `ITEMS SEALED\nEW-LAPTOP-01 — live bridge attached 07:03; image SHA256 verified\nCUP-B — sealed 07:11\nPAINT-RAIL — sealed 07:18\nSTUB-P4187 — sealed 07:21\nWARRANT VAULT CODE FORMAT: archive name + sealed parking-stub number\nNOTE: conclusions must not rely solely on mutable apartment logs`,
          vi: `VẬT CHỨNG ĐÃ NIÊM PHONG\nEW-LAPTOP-01 — gắn cầu nối lúc 07:03; SHA256 ảnh đĩa hợp lệ\nCUP-B — niêm phong 07:11\nPAINT-RAIL — niêm phong 07:18\nSTUB-P4187 — niêm phong 07:21\nĐỊNH DẠNG MÃ KHO LỆNH: tên archive + số cuống vé đỗ xe đã niêm phong\nLƯU Ý: không được kết luận chỉ từ nhật ký có thể sửa tại căn hộ`,
        } },
      ],
    },
    {
      type: 'directory', name: 'laptop', children: [
        { type: 'file', name: 'timeline.log', content: {
          en: `[00:41:08] encrypted archive ORPHEUS mounted\n[00:52:31] message received from CLAIRE-BENNETT\n[01:03:44] smart-lock guest token accepted\n[01:12:07] phone stationary\n[01:14:22] wearable: impact / elevated heart rate\n[01:19:50] ORPHEUS unmounted\n[01:22:13] browser session opened: evidence.metro-police.local\n[01:27:09] cleanup task executed\nCLOCK SOURCE: NTP VERIFIED; OFFSET +00:00`,
          vi: `[00:41:08] gắn kho mã hóa ORPHEUS\n[00:52:31] nhận tin nhắn từ CLAIRE-BENNETT\n[01:03:44] chấp nhận token khách của khóa thông minh\n[01:12:07] điện thoại đứng yên\n[01:14:22] thiết bị đeo: va chạm / nhịp tim tăng\n[01:19:50] tháo ORPHEUS\n[01:22:13] mở phiên trình duyệt: evidence.metro-police.local\n[01:27:09] chạy tác vụ dọn dẹp\nNGUỒN GIỜ: NTP ĐÃ XÁC MINH; ĐỘ LỆCH +00:00`,
        } },
        { type: 'file', name: 'messages-recovered.txt', content: {
          en: `RECOVERED THREAD\n00:52 CLAIRE-BENNETT: Ethan, the procurement files are real. I am followed.\n00:54 ETHAN: Go to the newsroom safe point. Do not come here.\n01:06 CLAIRE-BENNETT: [message sent by paired desktop] I'm safe at home. Delete everything.\nFORENSIC NOTE: 01:06 message signed by desktop key CB-DESK-2, not Claire's phone key CB-PHONE-9.\nDRAFT 01:16 (unsent): "Blue truck. River cranes. Heard bell every fifteen minutes."`,
          vi: `LUỒNG TIN NHẮN KHÔI PHỤC\n00:52 CLAIRE-BENNETT: Ethan, hồ sơ mua sắm là thật. Có người bám theo tôi.\n00:54 ETHAN: Tới điểm an toàn của tòa soạn. Đừng về đây.\n01:06 CLAIRE-BENNETT: [gửi từ máy tính ghép cặp] Tôi an toàn ở nhà. Xóa hết đi.\nGHI CHÚ PHÁP Y: tin 01:06 ký bằng khóa máy bàn CB-DESK-2, không phải khóa điện thoại CB-PHONE-9 của Claire.\nBẢN NHÁP 01:16 (chưa gửi): "Xe tải xanh. Cần cẩu ven sông. Nghe chuông mỗi mười lăm phút."`,
        } },
        { type: 'file', name: 'browser-artifact.log', content: {
          en: `SESSION evidence.metro-police.local\nAccount: evidence.tech/lucas.reed\nToken issued: 01:21:58\nDevice cookie: NONE\nClient: portable-browser/7.4\nAction: delete case lookup "ORPHEUS"\nRecovered cache header: X-Forwarded-For 10.23.8.44\nWARNING: password identity does not establish physical operator`,
          vi: `PHIÊN evidence.metro-police.local\nTài khoản: evidence.tech/lucas.reed\nToken cấp: 01:21:58\nCookie thiết bị: KHÔNG CÓ\nClient: portable-browser/7.4\nThao tác: xóa tra cứu vụ "ORPHEUS"\nHeader cache khôi phục: X-Forwarded-For 10.23.8.44\nCẢNH BÁO: danh tính mật khẩu không chứng minh người trực tiếp thao tác`,
        } },
      ],
    },
    {
      type: 'directory', name: 'police', access: { type: 'sudo' }, children: [
        { type: 'file', name: 'account-audit.log', content: {
          en: `ACCOUNT AUDIT — lucas.reed\n00:38 biometric entry: Central Evidence Building\n00:44 workstation EVID-03 unlocked with smart card\n01:00–02:04 body camera continuous; Officer Lucas Reed processing locker 6\n01:21 password login from 10.23.8.44; MFA recovery code RC-04\nRC-04 was printed for supervisor Grant Mercer on 14 May\nConclusion: Lucas Reed's account was compromised; verified alibi excludes him as apartment operator`,
          vi: `KIỂM TOÁN TÀI KHOẢN — lucas.reed\n00:38 sinh trắc vào Tòa nhà Vật chứng Trung tâm\n00:44 mở máy EVID-03 bằng thẻ thông minh\n01:00–02:04 camera áo liên tục; cán bộ Lucas Reed xử lý tủ số 6\n01:21 đăng nhập mật khẩu từ 10.23.8.44; mã khôi phục MFA RC-04\nRC-04 được in cho giám sát viên Grant Mercer ngày 14/05\nKết luận: tài khoản Lucas Reed bị chiếm dụng; ngoại phạm đã xác minh loại anh khỏi người thao tác tại căn hộ`,
        } },
        { type: 'file', name: 'personnel.txt', content: {
          en: `GRANT MERCER — former police digital-evidence supervisor\nDismissed: 3 months ago, unauthorized source searches\nSkills: evidence portal, radio systems, GPS simulation\nRight thumb: documented 22 mm scar\nRegistered vehicle: gray sedan 51H-742.19\nFormer contractor access: River District camera maintenance\nCurrent address: vacated two weeks ago`,
          vi: `GRANT MERCER — cựu giám sát viên vật chứng số của cảnh sát\nBuộc thôi việc: 3 tháng trước, tra cứu nguồn tin trái phép\nKỹ năng: cổng vật chứng, hệ thống vô tuyến, giả lập GPS\nNgón cái phải: hồ sơ ghi nhận sẹo dài 22 mm\nXe đăng ký: sedan xám 51H-742.19\nQuyền cũ của nhà thầu: bảo trì camera Quận Ven Sông\nĐịa chỉ hiện tại: đã rời đi hai tuần trước`,
        } },
        { type: 'file', name: 'corruption-case.txt', content: {
          en: `SEALED INTERNAL CASE — authorized for homicide task force\nOrpheus archive concerned diverted emergency-radio contracts.\nShell vendor: Northstar Logistics.\nApproval chain included former supervisor Grant Mercer.\nJournalist requested comment yesterday; Mercer denied contact.\nThis establishes motive, not presence. Corroboration required.`,
          vi: `HỒ SƠ NỘI BỘ NIÊM PHONG — tổ án mạng được phép truy cập\nKho Orpheus liên quan hợp đồng vô tuyến khẩn cấp bị rút ruột.\nNhà cung cấp bình phong: Northstar Logistics.\nChuỗi phê duyệt có cựu giám sát viên Grant Mercer.\nNhà báo yêu cầu phản hồi hôm qua; Mercer phủ nhận liên hệ.\nĐây là động cơ, không phải bằng chứng có mặt. Cần đối chứng.`,
        } },
      ],
    },
    {
      type: 'directory', name: 'network', children: [
        { type: 'file', name: 'dhcp.log', content: {
          en: `[01:02:51] 10.23.8.44 lease MAC 7C:91:22:AF:18:04\nAP: TOWER-17-FLOOR\nHostname: FIELDKIT-MERCER\n[01:28:14] lease released\nAsset history: retired police field kit assigned to Grant Mercer; never returned`,
          vi: `[01:02:51] 10.23.8.44 cấp cho MAC 7C:91:22:AF:18:04\nAP: TOWER-17-FLOOR\nTên máy: FIELDKIT-MERCER\n[01:28:14] giải phóng địa chỉ\nLịch sử tài sản: bộ thiết bị hiện trường cảnh sát cũ cấp cho Grant Mercer; chưa hoàn trả`,
        } },
        { type: 'file', name: 'vpn.log', content: {
          en: `[01:29:02] FIELDKIT-MERCER -> municipal maintenance VPN\nCredential: contractor/river-cam-04\nExit shown publicly: 203.0.113.71 CENTRAL LIBRARY\nTunnel ingress radio sector: RIVER-3\nDevice certificate expired but accepted by legacy gateway`,
          vi: `[01:29:02] FIELDKIT-MERCER -> VPN bảo trì đô thị\nTài khoản: contractor/river-cam-04\nĐiểm ra công khai hiển thị: 203.0.113.71 THƯ VIỆN TRUNG TÂM\nVùng vô tuyến đầu vào tunnel: RIVER-3\nChứng chỉ thiết bị đã hết hạn nhưng gateway cũ vẫn chấp nhận`,
        } },
      ],
    },
    {
      type: 'directory', name: 'city', children: [
        { type: 'file', name: 'parking.log', content: {
          en: `PARKING STUB P-4187\nIssued 00:57 — Tower 17 visitor bay\nPlate OCR: 51H-742.19\nExit 01:31\nRoute camera 01:43: plate 51H-742.19 eastbound River Road\nVehicle color gray; rear quarter shows fresh BLUE paint transfer`,
          vi: `CUỐNG VÉ P-4187\nCấp 00:57 — bãi khách Tòa nhà 17\nBiển số OCR: 51H-742.19\nRời bãi 01:31\nCamera tuyến 01:43: biển 51H-742.19 đi về phía đông đường Ven Sông\nXe màu xám; hông sau có vệt SƠN XANH mới`,
        } },
        { type: 'file', name: 'camera-integrity.txt', content: {
          en: `RIVER DISTRICT CAMERA 12\nVideo gap: 01:46–02:11\nMaintenance command signed contractor/river-cam-04\nController clock: -06:00 minutes\nImmutable traffic sensor still records vehicle axle pair at TRUE TIME 01:52\nDo not merge displayed camera time with NTP time without correction`,
          vi: `CAMERA 12 QUẬN VEN SÔNG\nMất hình: 01:46–02:11\nLệnh bảo trì ký bởi contractor/river-cam-04\nĐồng hồ bộ điều khiển: chậm 06:00 phút\nCảm biến giao thông bất biến vẫn ghi nhận cặp trục xe lúc GIỜ THỰC 01:52\nKhông ghép giờ hiển thị camera với giờ NTP nếu chưa hiệu chỉnh`,
        } },
        { type: 'file', name: 'industrial-map.txt', content: {
          en: `RIVER-3 SECTOR CANDIDATES\nA. Old Ferry Depot — no cranes; church bell 30-minute cycle\nB. Northstar Warehouse 6 — two blue gantry cranes; freight warning bell 15-minute cycle; jute storage\nC. Central Library — VPN exit only; no truck access after 22:00\nD. East Pump Station — blue epoxy surfaces; no jute; continuous siren`,
          vi: `CÁC ĐIỂM TRONG VÙNG RIVER-3\nA. Bến Phà Cũ — không có cần cẩu; chuông nhà thờ mỗi 30 phút\nB. Kho Northstar số 6 — hai cần cẩu giàn xanh; chuông cảnh báo hàng hóa mỗi 15 phút; kho sợi đay\nC. Thư viện Trung tâm — chỉ là điểm ra VPN; cấm xe tải sau 22:00\nD. Trạm Bơm Đông — bề mặt epoxy xanh; không có sợi đay; còi liên tục`,
        } },
      ],
    },
    {
      type: 'directory', name: 'telecom', children: [
        { type: 'file', name: 'claire-phone.log', content: {
          en: `DEVICE CB-PHONE-9\n00:49 attached CELL-CENTRAL-2\n01:08 abrupt movement; microphone keyword "van"\n01:36 attached RIVER-2\n01:51 attached RIVER-3\nSince 01:54 low-power emergency beacon, no GPS fix\nBeacon bearing intersection: 11° from RIVER-3A, 284° from RIVER-3C\nEstimated radius: 180 m around Warehouse Row 4–7`,
          vi: `THIẾT BỊ CB-PHONE-9\n00:49 kết nối CELL-CENTRAL-2\n01:08 di chuyển đột ngột; micro ghi từ khóa "xe tải"\n01:36 kết nối RIVER-2\n01:51 kết nối RIVER-3\nTừ 01:54 phát beacon khẩn cấp công suất thấp, không có GPS\nGiao hội phương vị: 11° từ RIVER-3A, 284° từ RIVER-3C\nBán kính ước tính: 180 m quanh dãy kho 4–7`,
        } },
        { type: 'file', name: 'suspect-phone.log', content: {
          en: `BURNER B-771 — linked by contact graph to Grant Mercer\n01:55 GPS report: CENTRAL LIBRARY\n01:55 radio attachment: RIVER-3, timing advance 2\nGPS attestation: FAILED; developer-mode injection detected\n02:07 call to Northstar gate handset, duration 18 sec\n02:12 handset powered off`,
          vi: `MÁY RÁC B-771 — đồ thị liên hệ nối với Grant Mercer\n01:55 GPS báo: THƯ VIỆN TRUNG TÂM\n01:55 kết nối vô tuyến: RIVER-3, timing advance 2\nChứng thực GPS: THẤT BẠI; phát hiện chèn vị trí ở chế độ nhà phát triển\n02:07 gọi máy cổng Northstar, 18 giây\n02:12 thiết bị tắt nguồn`,
        } },
      ],
    },
    {
      type: 'directory', name: 'analysis', children: [
        { type: 'file', name: 'clock-normalization.txt', content: {
          en: `NORMALIZED TIMELINE (TRUE TIME)\n00:57 suspect vehicle enters Tower 17\n01:03 guest token accepted\n01:14 struggle / homicide window\n01:19 source drive removed\n01:21 police account abused\n01:31 vehicle exits\n01:52 traffic sensor reaches River-3 (camera display would read 01:46)\n01:54 victim beacon begins\nResult: apartment, vehicle and telecom chains are temporally consistent`,
          vi: `DÒNG THỜI GIAN CHUẨN HÓA (GIỜ THỰC)\n00:57 xe nghi phạm vào Tòa nhà 17\n01:03 chấp nhận token khách\n01:14 giằng co / khoảng gây án\n01:19 tháo ổ nguồn tin\n01:21 lạm dụng tài khoản cảnh sát\n01:31 xe rời bãi\n01:52 cảm biến giao thông tới River-3 (camera sẽ hiển thị 01:46)\n01:54 beacon nạn nhân bắt đầu\nKết quả: chuỗi căn hộ, xe và viễn thông nhất quán về thời gian`,
        } },
        { type: 'file', name: 'false-trails.txt', content: {
          en: `FALSE-TRAIL ASSESSMENT\nLucas Reed: credential stolen; continuous verified alibi\nCentral Library: VPN exit and spoofed GPS, contradicted by radio sector and access restrictions\nClaire's 01:06 message: desktop key used after abduction; not proof of safety\nBedroom clock: 17-minute drift; excluded\nReliable independent anchors: NTP device, wearable, sealed parking stub, immutable road sensor, cellular bearings`,
          vi: `ĐÁNH GIÁ DẤU VẾT GIẢ\nLucas Reed: credential bị đánh cắp; ngoại phạm liên tục đã xác minh\nThư viện Trung tâm: điểm ra VPN và GPS giả; mâu thuẫn vùng vô tuyến và hạn chế ra vào\nTin nhắn 01:06 của Claire: dùng khóa máy bàn sau khi bị bắt; không chứng minh an toàn\nĐồng hồ phòng ngủ: lệch 17 phút; loại bỏ\nMốc độc lập đáng tin: thiết bị NTP, đồng hồ đeo, vé đỗ xe niêm phong, cảm biến đường bất biến, giao hội di động`,
        } },
        { type: 'file', name: 'arrest-dossier.txt', access: {
          type: 'password',
          password: 'ORPHEUS-4187',
          prompt: {
            en: 'Warrant vault challenge: combine the archive name with the sealed parking-stub number.',
            vi: 'Xác minh kho lệnh: ghép tên archive với số cuống vé đỗ xe đã niêm phong.',
          },
        }, content: {
          en: `OPERATIONAL DOSSIER — PROBABLE CAUSE ESTABLISHED\nSuspect: GRANT MERCER\nVehicle: 51H-742.19\nOffenses: homicide, abduction, evidence-system intrusion, obstruction\nTarget: NORTHSTAR WAREHOUSE 6, east loading bay\nLive victim: CLAIRE BENNETT; beacon consistent with interior office\nRisks: former police radio knowledge; may monitor open channels\nTactical instruction: encrypted channel TAC-6; medical team stage south; preserve FIELDKIT-MERCER and ORPHEUS drive\nSTATUS 02:18: warrant authorized — ARREST TEAM DISPATCHED`,
          vi: `HỒ SƠ TÁC CHIẾN — ĐÃ ĐỦ CĂN CỨ\nNghi phạm: GRANT MERCER\nPhương tiện: 51H-742.19\nTội danh: giết người, bắt cóc, xâm nhập hệ thống vật chứng, cản trở điều tra\nMục tiêu: KHO NORTHSTAR SỐ 6, cửa bốc hàng phía đông\nNạn nhân còn sống: CLAIRE BENNETT; beacon phù hợp văn phòng bên trong\nRủi ro: từng làm cảnh sát, biết hệ thống vô tuyến; có thể nghe kênh mở\nChỉ thị chiến thuật: kênh mã hóa TAC-6; y tế chờ phía nam; bảo toàn FIELDKIT-MERCER và ổ ORPHEUS\nTRẠNG THÁI 02:18: lệnh bắt đã phê chuẩn — ĐỘI BẮT GIỮ XUẤT PHÁT`,
        } },
        { type: 'file', name: 'resolution.txt', content: {
          en: `AFTER-ACTION 02:31\nClaire Bennett recovered alive from office, Warehouse 6.\nGrant Mercer arrested at east loading bay beside vehicle 51H-742.19.\nORPHEUS drive and FIELDKIT-MERCER seized under warrant.\nBlue paint on vehicle matches warehouse crane and scene flakes by laboratory comparison.\nNo shots fired. Evidence chain preserved.`,
          vi: `KẾT QUẢ 02:31\nGiải cứu Claire Bennett còn sống tại văn phòng Kho số 6.\nBắt Grant Mercer tại cửa bốc hàng phía đông cạnh xe 51H-742.19.\nThu giữ ổ ORPHEUS và FIELDKIT-MERCER theo lệnh.\nSơn xanh trên xe khớp cần cẩu nhà kho và vảy sơn hiện trường qua giám định phòng thí nghiệm.\nKhông nổ súng. Chuỗi bảo quản chứng cứ nguyên vẹn.`,
        } },
      ],
    },
  ],
  evidence: [
    { id: 'scene-baseline', title: { en: 'Secured Scene Baseline', vi: 'Mốc hiện trường đã bảo toàn' }, description: { en: 'The scene contains a missing drive, a second cup, a drifting clock and parking stub P-4187.', vi: 'Hiện trường có ổ dữ liệu biến mất, chiếc cốc thứ hai, đồng hồ lệch và vé đỗ xe P-4187.' }, type: 'object', hint: { en: 'Begin with the first responder record and note what can mislead the timeline.', vi: 'Bắt đầu từ biên bản phản ứng đầu tiên và lưu ý yếu tố có thể làm sai dòng thời gian.' }, discover: { type: 'cat', path: '/scene/first-response.txt' }, highlight: { en: ['two cups', 'P-4187', '17-minute drift'], vi: ['hai chiếc cốc', 'P-4187', 'lệch 17 phút'] }, requiresEvidence: [], discovered: false },
    { id: 'forensic-window', title: { en: 'Independent Homicide Window', vi: 'Khoảng gây án độc lập' }, description: { en: 'Toxicology, wearable data and trace materials establish the true homicide window and offender traces.', vi: 'Độc chất, thiết bị đeo và vi vết xác lập khoảng gây án thực cùng dấu vết hung thủ.' }, type: 'object', hint: { en: 'Use biological and wearable evidence instead of the bedroom clock.', vi: 'Dùng chứng cứ sinh học và thiết bị đeo thay cho đồng hồ phòng ngủ.' }, discover: { type: 'cat', path: '/scene/forensics.txt' }, highlight: { en: ['01:10–01:35 TRUE TIME', 'right thumb', 'Blue alkyd paint', 'jute fibers'], vi: ['01:10–01:35 GIỜ THỰC', 'ngón cái phải', 'sơn alkyd xanh', 'sợi đay'] }, requiresEvidence: ['scene-baseline'], discovered: false },
    { id: 'device-timeline', title: { en: 'NTP Laptop Timeline', vi: 'Dòng thời gian NTP của laptop' }, description: { en: "Ethan's verified laptop clock anchors the struggle, drive removal and evidence-system access.", vi: 'Đồng hồ laptop của Ethan đã xác minh neo thời điểm giằng co, tháo ổ và truy cập hệ thống vật chứng.' }, type: 'digital', hint: { en: "Inspect the victim laptop for a clock source whose offset is verified.", vi: 'Kiểm tra laptop nạn nhân để tìm nguồn giờ có độ lệch đã được xác minh.' }, discover: { type: 'cat', path: '/laptop/timeline.log' }, highlight: { en: ['NTP VERIFIED', '01:14:22', '01:19:50', '01:22:13'], vi: ['NTP ĐÃ XÁC MINH', '01:14:22', '01:19:50', '01:22:13'] }, requiresEvidence: ['scene-baseline'], discovered: false },
    { id: 'claire-abducted', title: { en: 'Claire Bennett Abduction Signal', vi: 'Tín hiệu Claire Bennett bị bắt cóc' }, description: { en: 'The reassuring message was sent with a desktop key; an unsent draft recovered from the laptop places Claire near river cranes and a 15-minute bell.', vi: 'Tin báo an toàn được gửi bằng khóa máy bàn; bản nháp khôi phục từ laptop đặt Claire gần cần cẩu ven sông và chuông 15 phút.' }, type: 'document', hint: { en: 'Verify which device signed each message recovered from the laptop.', vi: 'Xác minh thiết bị ký từng tin nhắn khôi phục từ laptop.' }, discover: { type: 'cat', path: '/laptop/messages-recovered.txt' }, highlight: { en: ['desktop key', 'not Claire\'s phone', 'Blue truck', 'River cranes', 'fifteen minutes'], vi: ['khóa máy bàn', 'không phải khóa điện thoại', 'Xe tải xanh', 'Cần cẩu ven sông', 'mười lăm phút'] }, requiresEvidence: ['device-timeline'], discovered: false },
    { id: 'account-compromise', title: { en: 'Compromised Police Account', vi: 'Tài khoản cảnh sát bị chiếm dụng' }, description: { en: 'Officer Lucas Reed has a continuous verified alibi; recovery code RC-04 instead points toward former supervisor Grant Mercer.', vi: 'Lucas Reed có ngoại phạm liên tục đã xác minh; mã RC-04 lại dẫn tới cựu giám sát Grant Mercer.' }, type: 'digital', hint: { en: 'An account name is not an operator. Audit MFA and the officer’s physical presence.', vi: 'Tên tài khoản không phải người thao tác. Kiểm tra MFA và sự hiện diện vật lý của cán bộ.' }, discover: { type: 'cat', path: '/police/account-audit.log' }, highlight: { en: ['body camera continuous', 'RC-04', 'Grant Mercer', 'compromised'], vi: ['camera áo liên tục', 'RC-04', 'Grant Mercer', 'bị chiếm dụng'] }, requiresEvidence: ['device-timeline'], discovered: false },
    { id: 'fieldkit-trace', title: { en: 'Retired Field Kit Trace', vi: 'Truy dấu bộ thiết bị cũ' }, description: { en: 'The apartment network maps the evidence-system access to an unreturned police field kit assigned to Grant Mercer.', vi: 'Mạng căn hộ ánh xạ truy cập hệ thống vật chứng tới bộ thiết bị cảnh sát chưa hoàn trả cấp cho Grant Mercer.' }, type: 'digital', hint: { en: 'Resolve 10.23.8.44 to a device and asset owner.', vi: 'Ánh xạ 10.23.8.44 tới thiết bị và người nhận tài sản.' }, discover: { type: 'cat', path: '/network/dhcp.log' }, highlight: { en: ['10.23.8.44', 'FIELDKIT-MERCER', 'Grant Mercer', 'never returned'], vi: ['10.23.8.44', 'FIELDKIT-MERCER', 'Grant Mercer', 'chưa hoàn trả'] }, requiresEvidence: ['account-compromise'], discovered: false },
    { id: 'suspect-profile', title: { en: 'Grant Mercer Capability Match', vi: 'Hồ sơ năng lực Grant Mercer' }, description: { en: 'Mercer matches the thumb scar, owns the traced vehicle, knew GPS and evidence systems, and retained River District access.', vi: 'Mercer khớp sẹo ngón cái, sở hữu xe bị truy dấu, hiểu GPS và hệ thống vật chứng, đồng thời từng có quyền tại Quận Ven Sông.' }, type: 'document', hint: { en: 'Compare forensic traces with personnel records, technical capability and vehicle ownership.', vi: 'Đối chiếu vi vết với hồ sơ nhân sự, năng lực kỹ thuật và quyền sở hữu xe.' }, discover: { type: 'cat', path: '/police/personnel.txt' }, highlight: { en: ['22 mm scar', '51H-742.19', 'GPS simulation', 'River District'], vi: ['sẹo dài 22 mm', '51H-742.19', 'giả lập GPS', 'Quận Ven Sông'] }, requiresEvidence: ['forensic-window', 'fieldkit-trace'], discovered: false },
    { id: 'motive', title: { en: 'Orpheus Corruption Motive', vi: 'Động cơ từ hồ sơ Orpheus' }, description: { en: 'The stolen archive exposed Northstar contract corruption involving Mercer, establishing a motive for homicide and abduction.', vi: 'Kho bị đánh cắp phơi bày tham nhũng hợp đồng Northstar liên quan Mercer, xác lập động cơ giết người và bắt cóc.' }, type: 'document', hint: { en: 'Open the sealed internal case only after identifying the suspect.', vi: 'Mở hồ sơ nội bộ niêm phong sau khi đã nhận diện nghi phạm.' }, discover: { type: 'cat', path: '/police/corruption-case.txt' }, highlight: { en: ['Northstar Logistics', 'Grant Mercer', 'motive, not presence'], vi: ['Northstar Logistics', 'Grant Mercer', 'động cơ, không phải bằng chứng có mặt'] }, requiresEvidence: ['suspect-profile'], discovered: false },
    { id: 'vehicle-route', title: { en: 'Vehicle Route to River District', vi: 'Tuyến xe tới Quận Ven Sông' }, description: { en: 'The sealed stub and cameras place Mercer’s sedan at the scene and then eastbound toward River-3.', vi: 'Vé niêm phong và camera đặt sedan của Mercer tại hiện trường rồi đi về River-3.' }, type: 'photo', hint: { en: 'Connect parking stub P-4187 to a plate and outbound route.', vi: 'Nối vé P-4187 với biển số và tuyến rời đi.' }, discover: { type: 'cat', path: '/city/parking.log' }, highlight: { en: ['P-4187', '51H-742.19', 'River Road', 'BLUE paint'], vi: ['P-4187', '51H-742.19', 'đường Ven Sông', 'SƠN XANH'] }, requiresEvidence: ['scene-baseline', 'suspect-profile'], discovered: false },
    { id: 'vpn-deception', title: { en: 'Library VPN False Location', vi: 'Vị trí giả qua VPN Thư viện' }, description: { en: 'Central Library is only a public VPN exit; radio ingress and the stolen contractor credential place the device in River-3.', vi: 'Thư viện chỉ là điểm ra VPN; đầu vào vô tuyến và tài khoản nhà thầu bị dùng đặt thiết bị tại River-3.' }, type: 'digital', hint: { en: 'Distinguish a tunnel exit from the device’s physical radio sector.', vi: 'Phân biệt điểm ra tunnel với vùng vô tuyến vật lý của thiết bị.' }, discover: { type: 'cat', path: '/network/vpn.log' }, highlight: { en: ['CENTRAL LIBRARY', 'Tunnel ingress', 'RIVER-3', 'river-cam-04'], vi: ['THƯ VIỆN TRUNG TÂM', 'đầu vào tunnel', 'RIVER-3', 'river-cam-04'] }, requiresEvidence: ['fieldkit-trace'], discovered: false },
    { id: 'gps-spoof', title: { en: 'Spoofed Burner GPS', vi: 'GPS máy rác bị giả mạo' }, description: { en: 'The burner’s Library GPS fails attestation while cellular radio and a Northstar gate call place it in River-3.', vi: 'GPS Thư viện của máy rác không qua chứng thực, trong khi vô tuyến và cuộc gọi cổng Northstar đặt nó tại River-3.' }, type: 'digital', hint: { en: 'Do not trust coordinates without attestation; compare radio attachment and calls.', vi: 'Không tin tọa độ chưa chứng thực; đối chiếu vùng vô tuyến và cuộc gọi.' }, discover: { type: 'cat', path: '/telecom/suspect-phone.log' }, highlight: { en: ['GPS attestation: FAILED', 'RIVER-3', 'Northstar gate'], vi: ['Chứng thực GPS: THẤT BẠI', 'RIVER-3', 'cổng Northstar'] }, requiresEvidence: ['vpn-deception', 'motive'], discovered: false },
    { id: 'live-beacon', title: { en: 'Live Victim Beacon', vi: 'Beacon nạn nhân còn sống' }, description: { en: 'Claire’s phone route and emergency bearings narrow her live location to Warehouse Row 4–7.', vi: 'Tuyến điện thoại và giao hội beacon của Claire thu hẹp vị trí còn sống tới dãy kho 4–7.' }, type: 'digital', hint: { en: 'Follow the victim’s radio handoffs after the forged message.', vi: 'Theo các lần chuyển vùng vô tuyến của nạn nhân sau tin nhắn giả.' }, discover: { type: 'cat', path: '/telecom/claire-phone.log' }, highlight: { en: ['RIVER-3', 'emergency beacon', 'Warehouse Row 4–7'], vi: ['RIVER-3', 'beacon khẩn cấp', 'dãy kho 4–7'] }, requiresEvidence: ['claire-abducted'], discovered: false },
    { id: 'clock-correction', title: { en: 'Corrected River Timeline', vi: 'Dòng thời gian River đã hiệu chỉnh' }, description: { en: 'Correcting the camera’s six-minute offset aligns the immutable road sensor, vehicle route and victim beacon.', vi: 'Hiệu chỉnh camera chậm sáu phút làm khớp cảm biến đường bất biến, tuyến xe và beacon nạn nhân.' }, type: 'digital', hint: { en: 'Normalize every timestamp before rejecting an otherwise consistent route.', vi: 'Chuẩn hóa mọi mốc giờ trước khi bác bỏ một tuyến đường vốn nhất quán.' }, discover: { type: 'cat', path: '/analysis/clock-normalization.txt' }, highlight: { en: ['TRUE TIME', '01:52', 'camera display would read 01:46', 'temporally consistent'], vi: ['GIỜ THỰC', '01:52', 'camera sẽ hiển thị 01:46', 'nhất quán về thời gian'] }, requiresEvidence: ['device-timeline', 'vehicle-route', 'live-beacon'], discovered: false },
    { id: 'target-location', title: { en: 'Northstar Warehouse 6', vi: 'Kho Northstar số 6' }, description: { en: 'Only Warehouse 6 matches the river cranes, 15-minute bell, jute fibers, Northstar link and live-beacon radius.', vi: 'Chỉ Kho số 6 khớp cần cẩu ven sông, chuông 15 phút, sợi đay, liên hệ Northstar và bán kính beacon.' }, type: 'document', hint: { en: 'Intersect every environmental clue with the beacon radius; eliminate candidates explicitly.', vi: 'Giao mọi dấu hiệu môi trường với bán kính beacon; loại từng địa điểm rõ ràng.' }, discover: { type: 'cat', path: '/city/industrial-map.txt' }, highlight: { en: ['Northstar Warehouse 6', 'blue gantry cranes', '15-minute cycle', 'jute storage'], vi: ['Kho Northstar số 6', 'cần cẩu giàn xanh', 'mỗi 15 phút', 'kho sợi đay'] }, requiresEvidence: ['clock-correction', 'gps-spoof', 'forensic-window'], discovered: false },
    { id: 'false-trail-analysis', title: { en: 'False Trails Eliminated', vi: 'Đã loại các dấu vết giả' }, description: { en: 'Independent sources eliminate Lucas Reed, Central Library, Claire’s forged safety message and the drifting bedroom clock.', vi: 'Các nguồn độc lập loại Lucas Reed, Thư viện Trung tâm, tin an toàn giả của Claire và đồng hồ phòng ngủ lệch.' }, type: 'digital', hint: { en: 'Before seeking arrest authority, document why each tempting alternative is false.', vi: 'Trước khi xin lệnh bắt, ghi rõ vì sao từng phương án đánh lạc hướng là sai.' }, discover: { type: 'cat', path: '/analysis/false-trails.txt' }, highlight: { en: ['credential stolen', 'spoofed GPS', 'desktop key', '17-minute drift', 'Reliable independent anchors'], vi: ['credential bị đánh cắp', 'GPS giả', 'khóa máy bàn', 'lệch 17 phút', 'Mốc độc lập đáng tin'] }, requiresEvidence: ['account-compromise', 'vpn-deception', 'gps-spoof', 'clock-correction'], discovered: false },
    { id: 'arrest-authorized', title: { en: 'Arrest and Rescue Authorized', vi: 'Đã phê chuẩn bắt giữ và giải cứu' }, description: { en: 'Converging evidence establishes probable cause against Grant Mercer and directs TAC-6 to Warehouse 6.', vi: 'Chứng cứ hội tụ tạo đủ căn cứ với Grant Mercer và điều đội TAC-6 tới Kho số 6.' }, type: 'document', hint: { en: 'Open the operational dossier only after suspect, deception, route and target all converge.', vi: 'Chỉ mở hồ sơ tác chiến khi nghi phạm, thủ đoạn giả, tuyến đường và mục tiêu đã hội tụ.' }, discover: { type: 'cat', path: '/analysis/arrest-dossier.txt' }, highlight: { en: ['GRANT MERCER', 'NORTHSTAR WAREHOUSE 6', 'CLAIRE BENNETT', 'warrant authorized', 'ARREST TEAM DISPATCHED'], vi: ['GRANT MERCER', 'KHO NORTHSTAR SỐ 6', 'CLAIRE BENNETT', 'lệnh bắt đã phê chuẩn', 'ĐỘI BẮT GIỮ XUẤT PHÁT'] }, requiresEvidence: ['target-location', 'false-trail-analysis', 'motive', 'vehicle-route'], discovered: false },
    { id: 'case-resolved', title: { en: 'Suspect Arrested, Victim Rescued', vi: 'Bắt nghi phạm, giải cứu nạn nhân' }, description: { en: 'Claire is rescued alive, Mercer is arrested, and the stolen archive and field kit are recovered with the evidence chain intact.', vi: 'Claire được giải cứu, Mercer bị bắt, ổ dữ liệu và bộ thiết bị được thu hồi với chuỗi chứng cứ nguyên vẹn.' }, type: 'object', hint: { en: 'Read the after-action report after dispatching the arrest team.', vi: 'Đọc báo cáo kết quả sau khi điều đội bắt giữ.' }, discover: { type: 'cat', path: '/analysis/resolution.txt' }, highlight: { en: ['recovered alive', 'Grant Mercer arrested', 'ORPHEUS', 'Evidence chain preserved'], vi: ['Giải cứu Claire Bennett còn sống', 'Bắt Grant Mercer', 'ORPHEUS', 'Chuỗi bảo quản chứng cứ nguyên vẹn'] }, requiresEvidence: ['arrest-authorized'], discovered: false },
  ],
  tasks: [
    { id: 'secure-and-time', title: { en: 'Secure and normalize the scene', vi: 'Bảo toàn và chuẩn hóa hiện trường' }, description: { en: 'Establish a reliable homicide window without trusting the drifting clock.', vi: 'Xác lập khoảng gây án đáng tin mà không dựa vào đồng hồ bị lệch.' }, requiresEvidence: ['scene-baseline', 'forensic-window', 'device-timeline'], completed: false },
    { id: 'protect-innocent-officer', title: { en: 'Disprove the planted police identity', vi: 'Bác bỏ danh tính cảnh sát bị gài' }, description: { en: 'Prove who did not operate the stolen account and trace the actual device.', vi: 'Chứng minh ai không thao tác tài khoản bị đánh cắp và truy thiết bị thật.' }, requiresEvidence: ['account-compromise', 'fieldkit-trace'], completed: false },
    { id: 'identify-offender', title: { en: 'Identify offender and motive', vi: 'Xác định hung thủ và động cơ' }, description: { en: 'Join physical traces, technical capability, vehicle ownership and Orpheus motive.', vi: 'Ghép vi vết, năng lực kỹ thuật, sở hữu xe và động cơ Orpheus.' }, requiresEvidence: ['suspect-profile', 'motive', 'vehicle-route'], completed: false },
    { id: 'defeat-deception', title: { en: 'Defeat the location deception', vi: 'Phá thủ đoạn đánh lạc hướng vị trí' }, description: { en: 'Separate VPN exit and spoofed GPS from physical radio evidence.', vi: 'Tách điểm ra VPN và GPS giả khỏi chứng cứ vô tuyến vật lý.' }, requiresEvidence: ['vpn-deception', 'gps-spoof', 'false-trail-analysis'], completed: false },
    { id: 'find-claire', title: { en: 'Trace the living victim', vi: 'Truy tìm nạn nhân còn sống' }, description: { en: 'Use message signatures, cellular handoffs and bearings to locate Claire.', vi: 'Dùng chữ ký tin nhắn, chuyển vùng và giao hội để tìm Claire.' }, requiresEvidence: ['claire-abducted', 'live-beacon', 'clock-correction'], completed: false },
    { id: 'establish-target', title: { en: 'Establish the tactical target', vi: 'Xác lập mục tiêu tác chiến' }, description: { en: 'Intersect independent scene, environmental, vehicle and telecom evidence.', vi: 'Giao chứng cứ độc lập từ hiện trường, môi trường, phương tiện và viễn thông.' }, requiresEvidence: ['target-location', 'false-trail-analysis'], completed: false },
    { id: 'arrest-and-rescue', title: { en: 'Authorize arrest and rescue', vi: 'Phê chuẩn bắt giữ và giải cứu' }, description: { en: 'Build probable cause, dispatch safely and preserve the final evidence.', vi: 'Lập căn cứ, triển khai an toàn và bảo toàn vật chứng cuối.' }, requiresEvidence: ['arrest-authorized', 'case-resolved'], completed: false },
  ],
}
