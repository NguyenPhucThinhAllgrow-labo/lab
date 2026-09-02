# Case 003 — Hướng dẫn giải hoàn chỉnh

> Cảnh báo: tài liệu này chứa toàn bộ lời giải của **Giao thức Bóng Ma**.

Case 003 sử dụng chế độ giao nhiệm vụ tuần tự. Cảnh sát chỉ giao nhiệm vụ tiếp theo sau khi nhiệm vụ hiện tại hoàn thành. Các lệnh bên dưới dùng đường dẫn tuyệt đối nên có thể thực hiện từ bất kỳ thư mục nào trong terminal.

Nếu muốn chơi lại từ đầu, nhấn **Reset game** và xác nhận xóa tiến trình hiện tại.

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

Sau `process.log`, nhiệm vụ đầu tiên hoàn thành và cảnh sát giao nhiệm vụ xác định nguồn tấn công.

## 2. Xác định nguồn tấn công

```bash
cat /network/dhcp.log
```

DHCP ánh xạ địa chỉ `10.44.12.77` tới `VICTOR-LAPTOP`. Vì `network-trace` đã được thu thập ở nhiệm vụ trước, lệnh này hoàn thành nhiệm vụ thứ hai.

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

Ba evidence của nhiệm vụ này đã được thu thập khi hoàn thành nhiệm vụ thứ sáu. Chạy một lệnh vô hại để hệ thống đánh giá task vừa được cảnh sát giao:

```bash
pwd
```

Nhiệm vụ hoàn thành vì đích đến, chứng chỉ và lịch sử kết nối của NODE-OMEGA đều đã được xác lập.

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
pwd
cat /logs/integrity.log
cat /incident/contradictions.txt
cat /incident/final-analysis.txt
cat /scripts/cleanup.sh
cat /incident/timeline.txt
```

## Lời giải cuối cùng

Daniel không phải người thực hiện vụ đánh cắp. Tài khoản và thẻ của anh bị mạo danh để tạo bằng chứng giả. Các dấu vết từ DHCP, camera, USB và endpoint bảo trì liên kết Victor với hoạt động trực tiếp tại hiện trường. Tuy nhiên, dữ liệu được chuyển tới NODE-OMEGA do một bên chưa xác định kiểm soát, nên chưa thể kết luận Victor là chủ mưu cuối cùng.
