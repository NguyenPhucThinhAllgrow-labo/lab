# Cloudflare Tunnel cho Laravel + Nuxt + Docker

Tài liệu này hướng dẫn public dự án ra Internet để máy khác có thể truy cập và chơi Chinese Chess online mà không cần mở port trên router.

## 1. Kiến trúc hiện tại

Luồng request của dự án:

```text
Máy người chơi
    ↓ HTTPS
Cloudflare Tunnel
    ↓ Docker network
Nginx :80
    ├── /              → Nuxt :3000
    ├── /api/*         → Laravel/PHP-FPM :9000
    └── /sanctum/*     → Laravel/PHP-FPM :9000
```

Service `cloudflared` đã có trong `docker-compose.yml`:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: cloudflared
  command: tunnel --no-autoupdate --url http://nginx:80 --http-host-header localhost
  depends_on:
    - nginx
  restart: unless-stopped
```

Đây là **Quick Tunnel**. Cloudflare tự sinh một địa chỉ ngẫu nhiên dạng:

```text
https://random-name.trycloudflare.com
```

Quick Tunnel phù hợp để phát triển và thử nghiệm. Cloudflare không cam kết SLA, URL có thể thay đổi khi tunnel được tạo lại, giới hạn hiện tại là 200 request đang xử lý đồng thời và không hỗ trợ SSE. WebSocket/Pusher của dự án không phụ thuộc SSE.

Tài liệu chính thức: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

## 2. Khởi chạy Quick Tunnel

Từ thư mục dự án:

```bash
cd laravel-nuxt-docker
docker compose up -d --build
```

Kiểm tra các container:

```bash
docker compose ps
```

Theo dõi log tunnel:

```bash
docker compose logs -f cloudflared
```

Trong log sẽ xuất hiện URL `https://...trycloudflare.com`. Có thể lấy URL gần nhất bằng:

```bash
docker compose logs cloudflared \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
  | tail -n 1
```

Gửi URL này cho máy khác. Không cần thêm `:3000`, `/api` hoặc địa chỉ IP nội bộ.

Ví dụ:

```text
https://example-random.trycloudflare.com
```

Trang chơi online:

```text
https://example-random.trycloudflare.com/games/chinese-chess/online
```

## 3. Cấu hình frontend

Khi truy cập từ máy khác, frontend không được gọi API bằng `http://localhost`. Với trình duyệt của người chơi, `localhost` là máy của chính người chơi chứ không phải máy đang chạy Docker.

Khuyến nghị sử dụng API cùng origin trong `frontend/.env`:

```dotenv
NUXT_PUBLIC_API_URL=
```

Khi đó frontend gọi tương đối:

```text
/sanctum/csrf-cookie
/api/login
/api/chinese-chess/rooms
```

Nginx sẽ chuyển các request này đến Laravel. Cách này tránh lỗi CORS, mixed content và không cần sửa `.env` mỗi khi Quick Tunnel đổi URL.

Pusher frontend chỉ chứa key và cluster:

```dotenv
NUXT_PUBLIC_PUSHER_APP_KEY=your-public-key
NUXT_PUBLIC_PUSHER_APP_CLUSTER=ap1
```

Không đưa `PUSHER_APP_SECRET` vào frontend.

Sau khi sửa frontend environment:

```bash
docker compose restart frontend
```

Nếu biến môi trường được đóng vào production build, cần build lại image/container tương ứng.

## 4. Cấu hình Laravel và Sanctum

Quick Tunnel hiện đã được cho phép trong `backend/config/sanctum.php` qua:

```php
'*.trycloudflare.com'
```

Vì frontend và API dùng cùng hostname nên thông thường không cần thêm CORS origin cho từng URL ngẫu nhiên.

Cấu hình đề xuất trong `backend/.env`:

```dotenv
APP_URL=https://your-current-url.trycloudflare.com
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=true
```

`APP_URL` nên được cập nhật nếu ứng dụng tạo link tuyệt đối hoặc URL asset từ Laravel. Với request API cùng origin, phần lớn chức năng vẫn hoạt động khi URL Quick Tunnel thay đổi.

Sau khi thay đổi `.env`, xóa cache cấu hình:

```bash
docker compose exec backend php artisan optimize:clear
```

Không commit `.env`, Pusher secret, tunnel token hoặc Cloudflare API token lên Git.

## 5. Kiểm tra toàn bộ luồng

Trên máy chạy Docker:

```bash
docker compose ps
docker compose logs --tail=100 nginx
docker compose logs --tail=100 frontend
docker compose logs --tail=100 backend
docker compose logs --tail=100 cloudflared
```

Trên máy khác hoặc điện thoại dùng 4G/5G:

1. Mở URL `https://...trycloudflare.com`.
2. Đăng ký hoặc đăng nhập hai tài khoản khác nhau.
3. Tài khoản chủ phòng tạo phòng Chinese Chess.
4. Gửi URL và mã phòng cho người còn lại.
5. Kiểm tra hai bên đều nhận được cập nhật nước đi qua Pusher.

Trong DevTools của trình duyệt, các request đúng phải có dạng:

```text
https://...trycloudflare.com/api/...
```

Nếu request là `http://localhost/api/...`, frontend vẫn đang dùng cấu hình API cũ.

## 6. Các lỗi thường gặp

### Không tìm thấy URL public

```bash
docker compose restart cloudflared
docker compose logs -f cloudflared
```

Nếu mạng chặn kết nối ra ngoài, cần cho phép `cloudflared` kết nối đến Cloudflare. Đối với Named Tunnel, Cloudflare khuyến nghị kiểm tra khả năng kết nối outbound qua port `7844`.

### Cloudflare trả về 502 Bad Gateway

Kiểm tra Nginx và Nuxt:

```bash
docker compose ps
docker compose logs --tail=100 nginx frontend
```

Từ container tunnel, origin phải là `http://nginx:80`, không phải `http://localhost:80`. Trong container, `localhost` chỉ trỏ về chính container `cloudflared`.

### API báo `Failed to fetch`

Kiểm tra Network tab. API phải dùng hostname Cloudflare hiện tại hoặc đường dẫn tương đối `/api`.

Không dùng:

```dotenv
NUXT_PUBLIC_API_URL=http://localhost
```

### Laravel trả về 419 hoặc CSRF token mismatch

Kiểm tra theo thứ tự:

```bash
docker compose exec backend php artisan optimize:clear
docker compose restart backend nginx
```

Sau đó xóa cookie cũ của domain `trycloudflare.com`, tải lại trang và đăng nhập lại. Đảm bảo browser gọi `/sanctum/csrf-cookie` trên cùng hostname với frontend.

### Đăng nhập được nhưng API trả về 401

Kiểm tra:

- Host hiện tại có nằm trong `SANCTUM_STATEFUL_DOMAINS` hoặc pattern `*.trycloudflare.com`.
- Request sử dụng `credentials: include`.
- Cookie không bị chặn bởi trình duyệt.
- Frontend và API không bị tách sang hai hostname khác nhau.

### Pusher không đồng bộ nước đi

Kiểm tra backend:

```dotenv
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_APP_CLUSTER=ap1
```

Kiểm tra frontend:

```dotenv
NUXT_PUBLIC_PUSHER_APP_KEY=...
NUXT_PUBLIC_PUSHER_APP_CLUSTER=ap1
```

Sau đó:

```bash
docker compose exec backend php artisan optimize:clear
docker compose restart backend frontend
```

Frontend kết nối trực tiếp đến Pusher qua HTTPS/WSS; Cloudflare Tunnel chỉ public website và API của dự án.

### URL thay đổi sau khi restart

Đây là hành vi bình thường của Quick Tunnel. Muốn URL cố định, hãy chuyển sang Named Tunnel.

## 7. Named Tunnel với domain cố định

Named Tunnel phù hợp hơn khi cần dùng lâu dài. Cần:

- Tài khoản Cloudflare.
- Một domain đã được quản lý DNS trên Cloudflare.
- Tunnel được tạo trong Cloudflare Dashboard.
- Public hostname, ví dụ `game.example.com`.

Theo hướng dẫn chính thức: [Create a remotely-managed tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/).

Trong Cloudflare Dashboard:

1. Vào **Networking → Tunnels**.
2. Chọn **Create a tunnel**.
3. Đặt tên tunnel, ví dụ `laravel-nuxt-game`.
4. Tạo Published application route.
5. Chọn hostname, ví dụ `game.example.com`.
6. Service URL dùng `http://nginx:80` vì `cloudflared` chạy cùng Docker network.
7. Sao chép tunnel token.

Lưu token trong file `.env` ở cạnh `docker-compose.yml`:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token
```

Không commit token này. Người có token có thể chạy connector cho tunnel, vì vậy cần coi token như mật khẩu. Xem [Tunnel permissions](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/remote-tunnel-permissions/).

Đổi service `cloudflared` thành:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: cloudflared
  command: tunnel --no-autoupdate run
  environment:
    TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
  depends_on:
    - nginx
  restart: unless-stopped
```

Khởi động lại:

```bash
docker compose up -d cloudflared
docker compose logs -f cloudflared
```

Sau đó cập nhật backend:

```dotenv
APP_URL=https://game.example.com
SANCTUM_STATEFUL_DOMAINS=game.example.com
SESSION_DOMAIN=game.example.com
SESSION_SECURE_COOKIE=true
CORS_ALLOWED_ORIGINS=https://game.example.com
```

Frontend vẫn nên dùng API tương đối:

```dotenv
NUXT_PUBLIC_API_URL=
```

Cuối cùng:

```bash
docker compose exec backend php artisan optimize:clear
docker compose restart backend frontend nginx cloudflared
```

## 8. Lưu ý bảo mật

- Quick Tunnel làm ứng dụng có thể truy cập công khai; không dùng dữ liệu thật hoặc mật khẩu quan trọng trong môi trường thử nghiệm.
- Không public trực tiếp MySQL `3310` hoặc Redis ra Internet.
- Không chia sẻ `PUSHER_APP_SECRET`, `APP_KEY` hoặc tunnel token.
- Nếu token Named Tunnel bị lộ, thu hồi/rotate token trong Cloudflare Dashboard.
- Với website dùng lâu dài, nên cấu hình Cloudflare Access để giới hạn người được phép truy cập.
- Chỉ public Nginx; database và Redis tiếp tục nằm trong Docker network.

## 9. Lệnh nhanh

```bash
# Khởi động toàn bộ hệ thống
docker compose up -d --build

# Xem URL Quick Tunnel
docker compose logs cloudflared \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
  | tail -n 1

# Theo dõi tunnel
docker compose logs -f cloudflared

# Làm mới tunnel và nhận URL khác
docker compose restart cloudflared

# Xóa cache Laravel sau khi đổi environment
docker compose exec backend php artisan optimize:clear

# Dừng hệ thống
docker compose down
```
