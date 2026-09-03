# Case 003 — Hướng dẫn giải hoàn chỉnh

> Cảnh báo: tài liệu này chứa toàn bộ lời giải của **Giao thức Bóng Ma**.

Case 003 sử dụng chế độ giao nhiệm vụ tuần tự. Cảnh sát chỉ giao nhiệm vụ tiếp theo sau khi nhiệm vụ hiện tại hoàn thành. Các lệnh bên dưới dùng đường dẫn tuyệt đối nên có thể thực hiện từ bất kỳ thư mục nào trong terminal.

Evidence được tìm thấy chưa tự động hoàn thành nhiệm vụ. Sau mỗi chặng, nhấn **Q** và **E** để mở đồng thời hai panel, chọn từng Evidence trong panel Evidence rồi nhấn **Đối chiếu evidence đang chọn** ở task hiện tại. Evidence đúng mới lộ tên thật và được gắn vào task; evidence sai không làm tăng tiến độ.

Các Evidence cần nối cho từng task trong lượt giải chuẩn:

| Task | Evidence cần đối chiếu |
| --- | --- |
| 1 | Evidence 01, 02, 07, 08 |
| 2 | Evidence 03, 04 |
| 3 | Evidence 05, 06, 07, 08, 09 |
| 4 | Evidence 10, 11, 12, 13 |
| 5 | Evidence 15, 16, 17, 18 |
| 6 | Evidence 18, 19, 22 |
| 7 | Evidence 20, 21, 22 |
| 8 | Evidence 23, 24, 25 |
| 9 | Evidence 14, 23, 26 |

Nếu muốn chơi lại từ đầu, nhấn **Reset game** và xác nhận xóa tiến trình hiện tại.

## Các lệnh phân tích mới

Không cần đọc mù toàn bộ tệp bằng `cat`. Có thể khoanh vùng và đối chiếu dữ liệu trước:

```bash
grep "02:17" /logs/system.log
head -n 8 /network/network.log
tail -n 10 /logs/auth.log
stat /server/process.log
strings /scripts/access-script.bin
diff /users/daniel.txt /users/victor.txt
checksum /external/certificate.txt
```

- `grep` tìm những dòng chứa thời gian, địa chỉ, tài khoản hoặc từ khóa cần kiểm tra.
- `head` và `tail` đọc một phần đầu/cuối của log dài.
- `stat` xem kích thước, số dòng và trạng thái chỉ đọc của tệp.
- `strings` tách phần văn bản có thể đọc khỏi script hoặc artifact.
- `diff` chỉ ra khác biệt giữa hai hồ sơ hoặc hai bản log.
- `checksum` tạo dấu vân tay ổn định để đối chiếu tệp.

Các lệnh phân tích giúp hình thành giả thuyết; dùng `cat` khi cần đọc toàn bộ tệp và chính thức thu thập evidence của case.

## 1. Tái dựng dòng thời gian kỹ thuật số

Đọc hoạt động hệ thống trước, sau đó lần theo quá trình xác thực, kết nối từ xa và tiến trình tạo archive:

```bash
cat /logs/system.log
cat /logs/auth.log
cat /network/network.log
cat /scripts/maintenance.txt
cat /users/service-accounts.txt
cat /server/remote-session.log
cat /server/process.log
```

Kết luận cần nhận ra:

- Phiên hợp lệ của Daniel đã chuyển sang trạng thái không hoạt động.
- Một endpoint lạ bỏ qua MFA rồi truy cập máy trạm từ xa.
- `svc-archive`, `remote-sync` và `archive-worker` được dùng để tạo archive Phoenix.

Sau `process.log`, mở hai panel và đối chiếu Evidence 01, 02, 07, 08. Khi cả bốn liên kết đúng, cảnh sát mới giao nhiệm vụ xác định nguồn tấn công.

## 2. Xác định nguồn tấn công

```bash
cat /network/dhcp.log
```

DHCP ánh xạ địa chỉ `10.44.12.77` tới `VICTOR-LAPTOP`. Đối chiếu Evidence 03 và 04 với task thứ hai để hoàn thành nhiệm vụ.

## 3. Xác định đường thực thi

Các mắt xích `MAINT-7`, `svc-archive`, phiên từ xa và `archive-worker` đã được tìm thấy. Thu thập thêm bằng chứng độc lập trong bộ nhớ:

```bash
cat /forensics/memory.txt
```

Kết luận: kẻ tấn công đi qua endpoint bảo trì, dùng tài khoản dịch vụ, mạo danh Daniel rồi nâng quyền tiến trình tạo archive.

## 4. Truy dấu USB đáng ngờ

```bash
cat /devices/usb.log
cat /forensics/usb-forensics.txt
cat /devices/usb-content.txt
cat /scripts/access-script.bin
```

Chuỗi bằng chứng cho thấy:

- USB `VX-7719` được cắm đúng thời điểm gây án.
- Victor là người dùng cuối của USB.
- USB chứa archive bị đánh cắp và các script phục vụ cuộc tấn công.
- Script truy cập sử dụng đúng `MAINT-7`, `svc-archive` và `remote-sync` đã thấy trong telemetry.

## 5. Chứng minh vụ xâm nhập vật lý

```bash
cat /forensics/badge-forensics.txt
cat /camera/camera-analysis.txt
cat /camera/camera.log
cat /users/victor.txt
```

Kết luận:

- Thẻ của Daniel đã bị sao chép.
- Người sử dụng thẻ trên camera không phải Daniel.
- Đặc điểm hình thể, quyền truy cập và các dấu vết kỹ thuật đều hướng tới Victor.

## 6. Truy tìm động cơ và chỉ đạo

Đọc thông điệp gửi cho Victor, sau đó truy dấu hạ tầng bên ngoài:

```bash
cat /emails/deleted-mail.txt
cat /external/destination.txt
cat /external/certificate.txt
cat /external/connection-history.txt
```

Kết luận:

- Victor nhận chỉ dẫn sử dụng credential cũ và endpoint bảo trì.
- Archive được chuyển tới `NODE-OMEGA` tại `10.44.19.88`.
- NODE-OMEGA không phải hệ thống production thuộc công ty.
- Máy chủ này từng liên lạc với Security Lab và laptop của Victor.

## 7. Truy dấu dữ liệu bị đánh cắp

Ba evidence của nhiệm vụ này đã được thu thập ở chặng trước, nhưng task không tự hoàn thành. Hãy đối chiếu Evidence 20, 21 và 22 với task mới được giao.

## 8. Phân biệt ba danh tính

Kiểm tra việc sửa log, tổng hợp các mâu thuẫn rồi đọc phân tích pháp y:

```bash
cat /logs/integrity.log
cat /incident/contradictions.txt
cat /incident/final-analysis.txt
```

Ba vai trò cần được tách riêng:

1. **Daniel Cross:** nạn nhân có tài khoản và thẻ bị mạo danh.
2. **Victor Hale:** người có khả năng trực tiếp thực hiện hoạt động vật lý.
3. **Người chưa xác định:** người kiểm soát NODE-OMEGA và có thể đã chỉ đạo Victor.

## 9. Tái dựng Giao thức Bóng Ma

Đọc script xóa dấu vết và dòng thời gian tổng hợp cuối cùng:

```bash
cat /scripts/cleanup.sh
cat /incident/timeline.txt
```

Case hoàn thành khi hệ thống nối được toàn bộ quá trình chiếm quyền tài khoản, truy cập từ xa, sử dụng thẻ sao chép, kết nối USB, tạo archive, chuyển dữ liệu và xóa dấu vết.

## Danh sách command rút gọn

Dùng block này để kiểm thử nhanh một lượt chơi mới:

```bash
cat /logs/system.log
cat /logs/auth.log
cat /network/network.log
cat /scripts/maintenance.txt
cat /users/service-accounts.txt
cat /server/remote-session.log
cat /server/process.log
cat /network/dhcp.log
cat /forensics/memory.txt
cat /devices/usb.log
cat /forensics/usb-forensics.txt
cat /devices/usb-content.txt
cat /scripts/access-script.bin
cat /forensics/badge-forensics.txt
cat /camera/camera-analysis.txt
cat /camera/camera.log
cat /users/victor.txt
cat /emails/deleted-mail.txt
cat /external/destination.txt
cat /external/certificate.txt
cat /external/connection-history.txt
cat /logs/integrity.log
cat /incident/contradictions.txt
cat /incident/final-analysis.txt
cat /scripts/cleanup.sh
cat /incident/timeline.txt
```

## Lời giải cuối cùng

Daniel không phải người thực hiện vụ đánh cắp. Tài khoản và thẻ của anh bị mạo danh để tạo bằng chứng giả. Các dấu vết từ DHCP, camera, USB và endpoint bảo trì liên kết Victor với hoạt động trực tiếp tại hiện trường. Tuy nhiên, dữ liệu được chuyển tới NODE-OMEGA do một bên chưa xác định kiểm soát, nên chưa thể kết luận Victor là chủ mưu cuối cùng.
