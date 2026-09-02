# Case 004 — Hướng dẫn giải hoàn chỉnh

> Cảnh báo: tài liệu này chứa toàn bộ lời giải của **Tín hiệu cuối cùng**.

Case 004 có độ khó cao và sử dụng chế độ giao nhiệm vụ tuần tự. Người chơi phải đối chiếu ba chuỗi chứng cứ độc lập: hiện trường vật lý, pháp y hệ thống và dữ liệu viễn thông. Một số dữ liệu là dấu vết giả; đặc biệt không được xem tên tài khoản, vị trí GPS hoặc thời gian hiển thị trên camera là sự thật nếu chưa kiểm chứng.

Các lệnh dưới đây dùng đường dẫn tuyệt đối nên có thể chạy từ bất kỳ thư mục nào. Nếu muốn chơi lại từ đầu, nhấn **Reset game** và xác nhận xóa tiến trình hiện tại.

## 1. Bảo toàn và chuẩn hóa hiện trường

Đọc biên bản hiện trường trước, sau đó đối chiếu kết quả pháp y với dòng thời gian NTP của thiết bị:

```bash
cat /scene/first-response.txt
cat /scene/forensics.txt
cat /device/timeline.log
```

Kết luận cần nhận ra:

- Ổ nguồn tin mã hóa `ORPHEUS` đã biến mất.
- Có hai chiếc cốc; chiếc đã rửa vẫn còn cặn thuốc an thần.
- Vé đỗ xe `P-4187` là vật chứng vật lý quan trọng.
- Đồng hồ phòng ngủ lệch 17 phút nên không thể dùng làm mốc thời gian.
- Đồng hồ đeo ghi nhận giằng co lúc `01:14:22`, nằm trong khoảng tử vong `01:10–01:35` theo giờ thực.
- Dòng thời gian laptop dùng NTP đã xác minh: giằng co lúc 01:14, tháo ổ ORPHEUS lúc 01:19 và truy cập hệ thống vật chứng lúc 01:22.

Ba evidence đầu tiên hoàn thành nhiệm vụ bảo toàn và chuẩn hóa hiện trường.

## 2. Bác bỏ danh tính cảnh sát bị gài

Kiểm tra tài khoản xuất hiện trong phiên truy cập rồi truy địa chỉ mạng về thiết bị thật:

```bash
cat /police/account-audit.log
cat /network/dhcp.log
```

Kết luận:

- Cán bộ **Lucas Reed** có camera áo liên tục từ 01:00 đến 02:04 và không thể là người thao tác tại căn hộ.
- Tài khoản `lucas.reed` bị đăng nhập bằng mã khôi phục MFA `RC-04`.
- Mã này từng được in cho cựu giám sát viên **Grant Mercer**.
- IP `10.23.8.44` thuộc `FIELDKIT-MERCER`, bộ thiết bị cảnh sát cũ được cấp cho Mercer nhưng chưa hoàn trả.

Tên tài khoản chỉ chứng minh credential nào được sử dụng, không chứng minh danh tính người trực tiếp thao tác.

## 3. Xác định hung thủ và động cơ

Đối chiếu hồ sơ Mercer, hồ sơ tham nhũng Orpheus và tuyến phương tiện:

```bash
cat /police/personnel.txt
cat /police/corruption-case.txt
cat /city/parking.log
```

Chuỗi chứng cứ cho thấy:

- Mercer có vết sẹo 22 mm ở ngón cái phải, phù hợp dấu găng tay bán phần tại hiện trường.
- Mercer hiểu hệ thống vật chứng, radio, giả lập GPS và từng có quyền bảo trì camera Quận Ven Sông.
- Mercer sở hữu sedan xám biển số `51H-742.19`.
- Vé `P-4187` và camera đặt chiếc xe tại Tòa nhà 17 từ 00:57 đến 01:31.
- Xe sau đó chạy về phía đông trên đường Ven Sông và có vệt sơn xanh mới.
- ORPHEUS chứa bằng chứng tham nhũng hợp đồng vô tuyến của Northstar Logistics, trong đó Mercer nằm trong chuỗi phê duyệt.

Hồ sơ tham nhũng xác lập động cơ; dấu vết vật lý, thiết bị và phương tiện mới là chứng cứ liên kết Mercer với hành vi.

## 4. Phá thủ đoạn đánh lạc hướng vị trí

Trước tiên kiểm tra VPN và điện thoại rác:

```bash
cat /network/vpn.log
cat /telecom/suspect-phone.log
```

Không được kết luận Mercer ở Thư viện Trung tâm:

- Thư viện chỉ là điểm ra công khai của VPN.
- Điểm vào tunnel nằm ở vùng vô tuyến `RIVER-3`.
- GPS trên máy rác báo Thư viện nhưng không vượt qua chứng thực và có dấu hiệu chèn vị trí.
- Cùng thiết bị đó bám trạm `RIVER-3` rồi gọi tới máy cổng Northstar.

Evidence tổng hợp của nhiệm vụ này còn cần dòng thời gian đã hiệu chỉnh. Vì vậy hãy tiếp tục truy nạn nhân trước khi đọc báo cáo loại dấu vết giả.

## 5. Truy tìm Claire Bennett

Xác minh tin nhắn được gửi từ thiết bị nào, sau đó lần theo beacon điện thoại của Claire:

```bash
cat /device/messages-recovered.txt
cat /telecom/claire-phone.log
```

Kết luận:

- Tin “tôi an toàn ở nhà” lúc 01:06 được ký bằng `CB-DESK-2`, không phải khóa điện thoại `CB-PHONE-9` của Claire.
- Bản nháp chưa gửi mô tả xe tải xanh, cần cẩu ven sông và tiếng chuông mỗi 15 phút.
- Điện thoại Claire di chuyển từ khu trung tâm tới `RIVER-3`.
- Beacon khẩn cấp thu hẹp vị trí còn sống xuống bán kính 180 m quanh dãy kho 4–7.

Đối chiếu tuyến xe và beacon trên một dòng thời gian chuẩn:

```bash
cat /analysis/clock-normalization.txt
```

Camera River chậm sáu phút. Sau hiệu chỉnh, cảm biến giao thông ghi xe tới River-3 lúc 01:52 và beacon Claire bắt đầu lúc 01:54. Hai nguồn dữ liệu độc lập khớp nhau.

Lúc này có thể hoàn tất việc bác bỏ toàn bộ dấu vết giả:

```bash
cat /analysis/false-trails.txt
```

Báo cáo loại bỏ bốn hướng sai:

1. Lucas Reed chỉ là chủ tài khoản bị đánh cắp.
2. Thư viện Trung tâm chỉ là điểm ra VPN và tọa độ GPS giả.
3. Tin nhắn an toàn của Claire được gửi bằng máy bàn sau khi cô bị bắt.
4. Đồng hồ phòng ngủ bị lệch 17 phút.

Lệnh cuối hoàn thành nhiệm vụ **Phá thủ đoạn đánh lạc hướng vị trí**. Vì các evidence cần cho nhiệm vụ **Truy tìm nạn nhân còn sống** cũng đã được thu thập, chạy một lệnh vô hại để hệ thống đánh giá nhiệm vụ vừa được giao:

```bash
pwd
```

## 6. Xác lập mục tiêu tác chiến

So sánh mô tả của Claire, vi vết hiện trường, phạm vi beacon và liên hệ Northstar với bản đồ công nghiệp:

```bash
cat /city/industrial-map.txt
```

Chỉ **Kho Northstar số 6** đáp ứng đồng thời tất cả điều kiện:

- Nằm trong vùng `RIVER-3` và dãy kho 4–7.
- Có hai cần cẩu giàn sơn xanh.
- Chuông cảnh báo hàng hóa chạy mỗi 15 phút.
- Có kho sợi đay, phù hợp sợi thu tại lan can hiện trường.
- Thuộc Northstar Logistics, đơn vị liên quan hồ sơ tham nhũng và cuộc gọi từ máy rác.

Các địa điểm còn lại bị loại vì thiếu cần cẩu, sai chu kỳ chuông, không có sợi đay hoặc không cho xe tải vào ban đêm.

## 7. Phê chuẩn bắt giữ và giải cứu

Sau khi nghi phạm, động cơ, thủ đoạn đánh lạc hướng, tuyến xe và vị trí mục tiêu đã hội tụ, mở hồ sơ tác chiến:

```bash
cat /analysis/arrest-dossier.txt
```

Hồ sơ xác lập đủ căn cứ:

- Nghi phạm: **Grant Mercer**.
- Mục tiêu: **Kho Northstar số 6**, cửa bốc hàng phía đông.
- Nạn nhân cần giải cứu: **Claire Bennett**, nhiều khả năng ở văn phòng bên trong.
- Đội bắt giữ dùng kênh mã hóa `TAC-6` vì Mercer hiểu hệ thống radio cảnh sát.
- Cần bảo toàn `FIELDKIT-MERCER` và ổ `ORPHEUS` khi thu giữ.

Đọc báo cáo sau hành động để hoàn thành case:

```bash
cat /analysis/resolution.txt
```

Claire được giải cứu còn sống, Grant Mercer bị bắt cạnh xe `51H-742.19`, còn FIELDKIT và ổ ORPHEUS được thu giữ theo lệnh. Chuỗi bảo quản chứng cứ được duy trì và không có phát súng nào.

## Danh sách command rút gọn

Dùng block sau để kiểm thử nhanh một lượt chơi mới theo đúng thứ tự mở khóa:

```bash
cat /scene/first-response.txt
cat /scene/forensics.txt
cat /device/timeline.log
cat /police/account-audit.log
cat /network/dhcp.log
cat /police/personnel.txt
cat /police/corruption-case.txt
cat /city/parking.log
cat /network/vpn.log
cat /telecom/suspect-phone.log
cat /device/messages-recovered.txt
cat /telecom/claire-phone.log
cat /analysis/clock-normalization.txt
cat /analysis/false-trails.txt
pwd
cat /city/industrial-map.txt
cat /analysis/arrest-dossier.txt
cat /analysis/resolution.txt
```

## Lời giải cuối cùng

Grant Mercer giết nhà báo Ethan Ward để chiếm ổ ORPHEUS, vì kho dữ liệu chứa bằng chứng Mercer tham gia đường dây rút ruột hợp đồng vô tuyến thông qua Northstar Logistics. Hắn bắt cóc biên tập viên Claire Bennett, đánh cắp tài khoản của Lucas Reed bằng mã khôi phục MFA và sử dụng `FIELDKIT-MERCER` để xóa dấu vết trong hệ thống cảnh sát.

Mercer tạo hai lớp vị trí giả: kết nối qua VPN có điểm ra tại Thư viện Trung tâm và chèn GPS giả trên điện thoại rác. Tuy nhiên, vùng vô tuyến `RIVER-3`, vé đỗ xe, camera tuyến đường, beacon của Claire, cuộc gọi tới cổng Northstar, sợi đay, vảy sơn xanh và mô tả cần cẩu hội tụ tại Kho Northstar số 6. Sau khi hiệu chỉnh sai lệch đồng hồ camera, toàn bộ chuỗi thời gian trở nên nhất quán, đủ căn cứ để phát lệnh bắt và giải cứu nạn nhân.
