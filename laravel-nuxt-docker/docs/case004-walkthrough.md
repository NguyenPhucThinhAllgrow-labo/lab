# Case 004 — Hướng dẫn giải hoàn chỉnh

> Cảnh báo: tài liệu này chứa toàn bộ lời giải của **Tín hiệu cuối cùng**.

Case 004 có độ khó cao và sử dụng chế độ giao nhiệm vụ tuần tự. Người chơi phải đối chiếu ba nhóm chứng cứ độc lập: vật chứng tại hiện trường, dấu vết số trên thiết bị và dữ liệu viễn thông. Một số dữ liệu đã bị hung thủ cố ý làm giả; vì vậy tên tài khoản, tọa độ GPS và giờ hiển thị trên camera đều phải được kiểm tra bằng một nguồn khác.

Người chơi là chuyên viên pháp y cảnh sát trực tiếp đến căn hộ 17B. Tại đây, người chơi gắn cầu nối chỉ đọc vào laptop `EW-LAPTOP-01` của Ethan Ward và điều tra máy ngay tại hiện trường. Terminal hiển thị `/laptop` là dữ liệu thật trên laptop; các thư mục `/scene`, `/police`, `/network`, `/city`, `/telecom` và `/analysis` là nguồn nghiệp vụ được mount vào cùng không gian điều tra, không phải thư mục nằm trên máy của Ethan.

Các lệnh dưới đây dùng đường dẫn tuyệt đối nên có thể chạy từ bất kỳ thư mục nào. Nếu muốn chơi lại từ đầu, nhấn **Reset game** và xác nhận xóa tiến trình hiện tại.

Nhấn phím **M** ở ngoài ô nhập terminal để mở dòng thời gian vụ án. Ban đầu, bảng chỉ hiển thị những mốc mà điều tra viên đã đủ dữ kiện để tái dựng; các sự kiện mới sẽ xuất hiện dần khi evidence liên quan được khám phá. Nhấn **M** lần nữa, nhấn **Esc** hoặc nút đóng để quay lại màn hình điều tra.

Nhấn phím **P** để mở hồ sơ những người liên quan. Ethan Ward và Claire Bennett có mặt từ đầu theo hồ sơ nhập vụ; Lucas Reed và Grant Mercer chỉ xuất hiện khi người chơi tìm được chứng cứ nhắc tới họ. Những thông tin nhạy cảm như ngoại phạm, động cơ, phương tiện và vị trí giam giữ tiếp tục được bổ sung theo từng evidence đã xác minh.

Mỗi khi hoàn thành một task, game hiển thị thông báo gồm **Kết luận mới** và **Đầu mối tiếp theo**. Đầu mối chỉ định hướng nguồn cần điều tra hoặc phép đối chiếu cần thực hiện, không đưa thẳng câu lệnh hay lời giải.

Tính năng này áp dụng cho mọi case. Case có timeline được biên soạn riêng sẽ dùng điều kiện `requiresEvidence` của từng sự kiện; case không khai báo timeline sẽ tự tạo các mốc `E01`, `E02`, ... từ evidence đã khám phá, vì vậy các case mới vẫn có timeline mặc định.

Trước khi điều tra, đọc hồ sơ nhập vụ để nắm tóm tắt sự việc, vai trò của Ethan Ward và Claire Bennett, ý nghĩa ban đầu của ORPHEUS và các mục tiêu cần hoàn thành. Hồ sơ chỉ chứa thông tin cảnh sát biết lúc đến hiện trường, không tiết lộ hung thủ:

```bash
cat /CASE-BRIEF.txt
```

Sau đó đọc mô tả workspace để biết mỗi thư mục lấy dữ liệu từ đâu:

```bash
cat /README.txt
```

### Quan hệ giữa Ethan, Claire, Mercer và nguồn gốc ORPHEUS

Đọc ghi chú tiếp nhận nguồn tin trên laptop:

```bash
cat /laptop/orpheus-intake.txt
```

Chuỗi quan hệ được xác lập như sau:

- **LYRA** là mật danh của một kiểm toán viên mua sắm thành phố. Người này gửi ổ đĩa mã hóa, checksum SHA-256 và danh mục hồ sơ cho Ethan qua hộp nhận tài liệu an toàn của tòa soạn.
- **Ethan Ward** là phóng viên chính. Anh xác minh checksum, đặt tên kho dữ liệu là `ORPHEUS`, trực tiếp giữ ổ đĩa và giữ khóa giải mã duy nhất ngoại tuyến để bảo vệ nguồn tin.
- **Claire Bennett** là biên tập viên kiêm người kiểm chứng độc lập. Cô không giữ ổ hoặc khóa giải mã; Ethan chỉ chuyển mã hóa đơn, đăng ký nhà cung cấp và ngày thanh toán để Claire đối chiếu với dữ liệu công khai.
- **Grant Mercer** xuất hiện trong chuỗi phê duyệt đáng ngờ. Khi Ethan yêu cầu giải trình, Mercer giả vờ muốn làm nguồn đối chứng bí mật và đề nghị gặp riêng. Vì chưa biết Mercer là hung thủ, Ethan cấp mã khách dùng một lần `EW-INTERVIEW-04` cho cuộc gặp.

Như vậy Ethan không tự nhiên có được toàn bộ bí mật: anh nhận dữ liệu từ một nguồn nội bộ, xác minh tính toàn vẹn bằng checksum và nhờ Claire kiểm chứng nội dung bằng nguồn độc lập. Mercer biết về ORPHEUS vì Ethan liên hệ hắn để bảo đảm quyền phản hồi trước khi xuất bản; hắn lợi dụng quy trình báo chí đó để vào căn hộ mà không cần phá cửa.

### Tệp gây nhiễu

Case có thêm một số thư mục và tệp không thuộc chuỗi chứng cứ chính. Chúng chứa những chi tiết dễ khiến người chơi đi sai hướng, nhưng có thể bị loại trừ khi kiểm tra thời gian, nguồn dữ liệu và đặc điểm nhận dạng:

- `/laptop/personal/expenses-august.csv` và `/laptop/personal/weekend-notes.txt`: dữ liệu cá nhân cũ của Ethan; các tệp đã được tạo hoặc lưu trữ nhiều tháng trước vụ án.
- `/network/legacy/expired-leases.log` và `/network/legacy/router-diagnostics.txt`: dữ liệu mạng hết hạn hoặc bản tự kiểm tra diễn ra ngoài khung giờ gây án.
- `/city/maintenance/river-road-works.txt` và `/city/maintenance/camera-test.log`: hồ sơ bảo trì diễn ra sau vụ án; chiếc xe màu xanh trong tệp kiểm tra thuộc Camera 09, không phải xe nghi phạm xuất hiện ở Camera 12.

Các tệp này không mở khóa evidence hay hoàn thành task. Mục đích của chúng là buộc người chơi kiểm chứng một dữ kiện trước khi đưa nó vào kết luận.

## 1. Bảo toàn và chuẩn hóa hiện trường

Đọc biên bản hiện trường trước, sau đó đối chiếu kết quả pháp y với dòng thời gian NTP của thiết bị:

```bash
cat /scene/first-response.txt
cat /scene/chain-of-custody.txt
cat /scene/forensics.txt
cat /laptop/timeline.log
```

`/laptop/timeline.log` không phải nhật ký do một thiết bị duy nhất tạo ra. Đây là dòng thời gian pháp y được dựng từ các bản ghi đang lưu trên laptop:

- Việc kết nối hoặc tháo ổ ORPHEUS và lịch sử trình duyệt do chính hệ điều hành laptop ghi lại.
- Sự kiện mở cửa là bản sao thông báo mà ứng dụng quản lý nhà thông minh đã lưu trên laptop.
- Trạng thái điện thoại và đồng hồ đeo tay là dữ liệu do các ứng dụng ghép nối đồng bộ về laptop.
- Mỗi dòng trong tệp đều ghi rõ `NGUỒN`, nhờ đó người chơi biết bản ghi ban đầu đến từ đâu.

Do đó, sự kiện mở khóa nằm trong `/laptop` vì laptop giữ một bản sao thông báo, không phải vì chiếc laptop trực tiếp điều khiển hoặc tạo nhật ký gốc của ổ khóa.

Kết luận cần nhận ra:

- Ổ nguồn tin mã hóa `ORPHEUS` đã biến mất.
- Có hai chiếc cốc; chiếc đã rửa vẫn còn cặn thuốc an thần.
- Vé đỗ xe `P-4187` là vật chứng vật lý quan trọng.
- Biên bản bảo quản cho biết mã kho lệnh được tạo bằng tên archive và số cuống vé đã niêm phong.
- Đồng hồ trong phòng ngủ là đồng hồ có kết nối mạng. Nhật ký đồng bộ của bộ điều khiển nhà thông minh cho thấy nó chạy chậm 17 phút so với giờ mạng chuẩn, nên không thể dùng trực tiếp làm mốc thời gian.
- Đồng hồ đeo ghi nhận giằng co lúc `01:14:22`, nằm trong khoảng tử vong `01:10–01:35` theo giờ thực.
- Dòng thời gian laptop dùng NTP đã xác minh: giằng co lúc 01:14 và tháo ổ ORPHEUS lúc 01:19. Laptop không chứa bản ghi truy cập hệ thống cảnh sát.
- Bản sao thông báo của khóa thông minh cho biết Ethan đã tạo mã khách `EW-INTERVIEW-04` lúc 00:41 cho Grant Mercer, với ghi chú “phỏng vấn nguồn tin ORPHEUS”. Mercer dùng mã này mở cửa chính lúc 01:03, nên căn hộ không có dấu hiệu bị đột nhập.

Ba evidence đầu tiên hoàn thành nhiệm vụ bảo toàn và chuẩn hóa hiện trường.

## 2. Điều tra vụ sử dụng trái phép tài khoản cảnh sát

Sau khi task đầu hoàn thành, hãy tiếp tục tìm dấu vết ngay trên laptop của Ethan. Ethan đã cấu hình router chuyển thông tin về các thiết bị mới trong mạng nhà sang laptop của mình:

```bash
cat /laptop/network-monitor.log
```

Nhật ký cho thấy một thiết bị riêng mang tên `FIELDKIT-MERCER`, địa chỉ `10.23.8.44`, đã kết nối Wi-Fi căn hộ rồi truy cập tên miền `evidence.metro-police.local`. Vì kết nối được mã hóa, laptop chỉ nhìn thấy thiết bị và tên miền đích; nó không thể biết tài khoản nào được dùng bên trong hệ thống cảnh sát.

Thư mục `/police` là hồ sơ hạn chế nên bị ẩn khỏi `ls` và `find` thông thường. Dùng quyền nâng cao để đọc bản ghi do máy chủ hệ thống vật chứng tạo ra, rồi truy địa chỉ mạng về thiết bị thật:

```bash
sudo guide police
sudo ls /police
sudo ls -l /police
sudo cat /police/account-audit.log
cat /network/dhcp.log
```

Kết luận:

- Cán bộ **Lucas Reed** có camera áo liên tục từ 01:00 đến 02:04 và không thể là người thao tác tại căn hộ.
- Tài khoản `lucas.reed` bị đăng nhập bằng mã khôi phục MFA `RC-04`.
- Mã này từng được in cho cựu giám sát viên **Grant Mercer**.
- IP `10.23.8.44` thuộc `FIELDKIT-MERCER`, bộ thiết bị cảnh sát cũ được cấp cho Mercer nhưng chưa hoàn trả.

Phiên truy cập hệ thống cảnh sát không diễn ra trên laptop của Ethan. Laptop chỉ giữ bản sao nhật ký giám sát mạng, qua đó cung cấp đầu mối ban đầu. Máy chủ cảnh sát lưu tài khoản, hành động xóa và IP nguồn; router căn hộ lưu thiết bị được cấp IP đó. Đối chiếu cả ba nguồn mới chứng minh thiết bị riêng tại hiện trường đã sử dụng tài khoản của Lucas.

Tên tài khoản chỉ cho biết thông tin đăng nhập của ai đã được sử dụng; nó không chứng minh chủ tài khoản là người trực tiếp thao tác.

## 3. Xác định hung thủ và động cơ

Đối chiếu hồ sơ Mercer, hồ sơ tham nhũng Orpheus và tuyến phương tiện:

```bash
sudo cat /police/personnel.txt
sudo cat /police/corruption-case.txt
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

## 4. Truy tìm Claire Bennett

Xác minh tin nhắn được gửi từ thiết bị nào, sau đó lần theo beacon điện thoại của Claire:

```bash
cat /laptop/messages-recovered.txt
cat /telecom/claire-phone.log
```

Kết luận:

- Tin “tôi an toàn ở nhà” lúc 01:06 được ký bằng `CB-DESK-2`, không phải khóa điện thoại `CB-PHONE-9` của Claire.
- Bản nháp chưa gửi mô tả xe tải xanh, cần cẩu ven sông và tiếng chuông mỗi 15 phút.
- Điện thoại Claire di chuyển từ khu trung tâm tới `RIVER-3`.
- “Beacon” là tín hiệu khẩn cấp công suất thấp do điện thoại Claire phát ra khi không lấy được GPS. Hai trạm di động đo hướng phát và khoanh vùng điện thoại trong bán kính 180 m quanh dãy kho số 4 đến số 7.

Đối chiếu `claire-abducted` và `live-beacon` với task **Truy tìm nạn nhân còn sống**. Task này chỉ cần xác minh Claire bị bắt cóc và khoanh vùng tín hiệu còn hoạt động; chưa cần xác định chính xác nhà kho.

## 5. Phá thủ đoạn đánh lạc hướng vị trí

Beacon chỉ tới `RIVER-3`, nhưng dấu vết số của Mercer lại chỉ tới Thư viện Trung tâm. Kiểm tra VPN và điện thoại rác để giải quyết mâu thuẫn:

```bash
cat /network/vpn.log
cat /telecom/suspect-phone.log
```

Không được kết luận Mercer ở Thư viện Trung tâm:

- Thư viện chỉ là điểm ra công khai của VPN.
- Kết nối VPN đi ra Internet tại Thư viện, nhưng tín hiệu vô tuyến cho thấy thiết bị bắt đầu kết nối từ khu vực `RIVER-3`.
- GPS trên điện thoại dùng một lần báo vị trí Thư viện, nhưng phần mềm kiểm tra phát hiện tọa độ đã bị chèn giả.
- Cùng thiết bị đó bám trạm `RIVER-3` rồi gọi tới máy cổng Northstar.

Đối chiếu tuyến xe và beacon trên một dòng thời gian chuẩn:

```bash
cat /analysis/clock-normalization.txt
```

Đồng hồ Camera 12 chạy chậm sáu phút. Một cảm biến giao thông riêng biệt, không cho phép sửa bản ghi sau khi tạo, ghi nhận xe tới RIVER-3 lúc 01:52 theo giờ chuẩn. Hai phút sau, điện thoại Claire bắt đầu phát tín hiệu khẩn cấp. Hai nguồn dữ liệu độc lập vì vậy khớp nhau.

Lúc này có thể hoàn tất việc bác bỏ toàn bộ dấu vết giả:

```bash
cat /analysis/false-trails.txt
```

Báo cáo loại bỏ bốn hướng sai:

1. Lucas Reed chỉ là chủ tài khoản bị đánh cắp.
2. Thư viện Trung tâm chỉ là điểm ra VPN và tọa độ GPS giả.
3. Tin nhắn an toàn của Claire được gửi bằng máy bàn sau khi cô bị bắt.
4. Đồng hồ phòng ngủ bị lệch 17 phút.

Đối chiếu `vpn-deception`, `gps-spoof` và `false-trail-analysis` với task **Loại bỏ vị trí giả do hung thủ tạo ra**. Vì `live-beacon` đã được tìm ở task trước, `clock-correction` giờ được mở theo đúng thứ tự và không còn buộc người chơi làm trước một task chưa được giao.

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

Đối chiếu `target-location` với task **Xác định chính xác địa điểm cần đột kích**. `false-trail-analysis` đã hoàn thành vai trò ở task loại bỏ vị trí giả và không cần liên kết lại ở bước này.

## 7. Lập văn bản tác chiến và kết thúc vụ án

Sau khi hoàn thành toàn bộ `6/6` task — trong đó bước cuối là **Xác định chính xác địa điểm cần đột kích** — bảng Nhiệm vụ xuất hiện nút **Lập văn bản tác chiến**. Tệp dưới đây chỉ là mẫu tham khảo, không cần mật mã hoặc `sudo`:

```bash
cat /analysis/arrest-dossier.txt
```

Nhấn **Lập văn bản tác chiến** và điền kết luận từ những bằng chứng đã thu thập:

- Nghi phạm: `Grant Mercer`.
- Biển số phương tiện: `51H-742.19`.
- Mục tiêu: `Kho Northstar số 6` hoặc `Northstar Warehouse 6`.
- Nạn nhân cần giải cứu: `Claire Bennett`.

Các tội danh, rủi ro và chỉ thị dành cho TAC-6 đã được hệ thống điền sẵn. Nhấn **Đồng ý và triển khai**. Nếu cả bốn kết luận khớp với chứng cứ, hồ sơ được phê duyệt, đội TAC-6 xuất phát và game hoàn thành; nếu sai, biểu mẫu đánh dấu những trường cần kiểm tra lại.

Sau khi hoàn thành, nhấn lại **Lập văn bản tác chiến** sẽ mở thẳng thông báo triển khai thành công thay vì yêu cầu nhập lại kết luận.

## Danh sách command rút gọn

Dùng block sau để kiểm thử nhanh một lượt chơi mới theo đúng thứ tự mở khóa:

```bash
cat /CASE-BRIEF.txt
cat /README.txt
cat /laptop/orpheus-intake.txt
cat /scene/first-response.txt
cat /scene/chain-of-custody.txt
cat /scene/forensics.txt
cat /laptop/timeline.log
cat /laptop/network-monitor.log
sudo cat /police/account-audit.log
cat /network/dhcp.log
sudo cat /police/personnel.txt
sudo cat /police/corruption-case.txt
cat /city/parking.log
cat /laptop/messages-recovered.txt
cat /telecom/claire-phone.log
cat /network/vpn.log
cat /telecom/suspect-phone.log
cat /analysis/clock-normalization.txt
cat /analysis/false-trails.txt
pwd
cat /city/industrial-map.txt
cat /analysis/arrest-dossier.txt
```

## Lời giải cuối cùng

Grant Mercer giết nhà báo Ethan Ward để chiếm ổ ORPHEUS, vì kho dữ liệu chứa bằng chứng Mercer tham gia đường dây rút ruột hợp đồng vô tuyến thông qua Northstar Logistics. Hắn bắt cóc biên tập viên Claire Bennett, đánh cắp tài khoản của Lucas Reed bằng mã khôi phục MFA và sử dụng `FIELDKIT-MERCER` để xóa dấu vết trong hệ thống cảnh sát.

Mercer tạo hai lớp vị trí giả: kết nối qua VPN có điểm ra tại Thư viện Trung tâm và chèn GPS giả trên điện thoại dùng một lần. Tuy nhiên, vùng vô tuyến `RIVER-3`, vé đỗ xe, camera tuyến đường, tín hiệu khẩn cấp của Claire, cuộc gọi tới cổng Northstar, sợi đay, vảy sơn xanh và mô tả cần cẩu đều hội tụ tại Kho Northstar số 6. Sau khi hiệu chỉnh sai lệch đồng hồ camera, toàn bộ chuỗi thời gian trở nên nhất quán, đủ căn cứ để phát lệnh bắt và giải cứu nạn nhân.
