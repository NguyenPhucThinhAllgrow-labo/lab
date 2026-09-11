# Hướng dẫn setup source Laravel + Nuxt + Docker

Tài liệu này hướng dẫn cài đặt project trên một máy mới sau khi clone hoặc pull source.

## 1. Thành phần được khởi chạy

Docker Compose của project gồm:

| Service | Vai trò |
|---|---|
| `nginx` | Reverse proxy, public ứng dụng ở cổng 80 |
| `backend` | Laravel/PHP-FPM |
| `frontend` | Nuxt development server |
| `mysql` | Cơ sở dữ liệu MySQL 8 |
| `redis` | Redis |
| `pikafish` | Chinese Chess engine và NNUE |
| `cloudflared` | Cloudflare Quick Tunnel tùy chọn |

Không cần tải dataset hoặc train Machine Learning để chạy game. Pikafish sử dụng NNUE trong Docker image và model fallback đã được lưu sẵn trong source.

## 2. Yêu cầu hệ thống

Máy mới cần có:

- Git.
- Docker Engine hoặc Docker Desktop.
- Docker Compose v2, sử dụng cú pháp `docker compose`.
- Make.
- Kết nối Internet trong lần cài đặt đầu.

Kiểm tra:

```bash
git --version
docker --version
docker compose version
make --version
```

Trên Windows nên chạy project bằng WSL2 và bật Docker Desktop integration cho WSL.

## 3. Clone và vào thư mục project

Clone repository theo URL của project:

```bash
git clone <repository-url>
cd <repository-directory>/laravel-nuxt-docker
```

Nếu source đã tồn tại:

```bash
git pull
cd laravel-nuxt-docker
```

Nếu terminal đã ở trong `laravel-nuxt-docker` thì không chạy lại `cd`. Xác nhận vị trí:

```bash
pwd
ls Makefile docker-compose.yml
```

## 4. Chuẩn bị file môi trường

Các file `.env` chứa secret nên không được lấy trực tiếp từ Git. Hãy nhận chúng qua kênh an toàn từ người quản lý dự án hoặc tạo cấu hình local mới.

| File | Bắt buộc | Mục đích |
|---|---|---|
| `backend/.env` | Có | Laravel, database, session, Sanctum và Pusher |
| `frontend/.env` | Nên có | URL API và cấu hình Pusher public |
| `.env` ở root project | Không | Ghi đè cấu hình Docker/Pikafish |

Không commit hoặc chia sẻ:

- `APP_KEY`.
- `PUSHER_APP_SECRET`.
- Cloudflare tunnel token.
- Mật khẩu hoặc khóa dịch vụ production.

### 4.1 Backend

Tạo `backend/.env` với các giá trị local tối thiểu:

```dotenv
APP_NAME=Laravel
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel_nuxt
DB_USERNAME=user123
DB_PASSWORD=root

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,127.0.0.1:3000
```

`DB_HOST` phải là `mysql`, không phải `localhost`, vì Laravel chạy bên trong Docker network.

Để sử dụng Chinese Chess online realtime, thêm thông tin Pusher của môi trường:

```dotenv
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-public-key
PUSHER_APP_SECRET=your-secret
PUSHER_APP_CLUSTER=ap1
```

Pikafish dùng các giá trị mặc định sau; chỉ cần thêm khi muốn ghi đè:

```dotenv
CHINESE_CHESS_ENGINE_URL=http://pikafish:8080
CHINESE_CHESS_ENGINE_MOVE_TIME_MS=700
CHINESE_CHESS_ENGINE_TIMEOUT_SECONDS=5
```

### 4.2 Frontend

Tạo `frontend/.env`:

```dotenv
NUXT_PUBLIC_API_URL=/
NUXT_PUBLIC_PUSHER_APP_KEY=your-public-key
NUXT_PUBLIC_PUSHER_APP_CLUSTER=ap1
```

Public key và cluster phải khớp với backend. Không đặt `PUSHER_APP_SECRET` trong frontend.

Nếu chưa cần realtime online, có thể để public key trống; các chế độ local và chơi với máy vẫn hoạt động.

### 4.3 Docker/Pikafish

File `.env` ở root `laravel-nuxt-docker` là tùy chọn. Docker Compose đã có giá trị mặc định, nhưng có thể cấu hình:

```dotenv
PIKAFISH_ARCH=x86-64-sse41-popcnt
PIKAFISH_THREADS=1
PIKAFISH_HASH_MB=128
```

Kiến trúc thường dùng:

| Máy | `PIKAFISH_ARCH` |
|---|---|
| Intel/AMD 64-bit phổ thông | `x86-64-sse41-popcnt` |
| Intel/AMD cũ | `x86-64` |
| ARM64/Linux | `armv8` |

## 5. Cài đặt lần đầu

Khi `backend/.env` đã tồn tại, chạy:

```bash
make setup
```

Quy trình này sẽ:

1. Kiểm tra `backend/.env`.
2. Build image PHP backend.
3. Build và khởi động các container, bao gồm Pikafish/NNUE.
4. Chờ MySQL sẵn sàng.
5. Cài Composer dependency.
6. Chạy Laravel migration.
7. Xóa cache Laravel.

Lần build đầu có thể mất vài phút. Pikafish cần compile C++ và tải khoảng 50 MB network NNUE.

Nếu `APP_KEY` trong `backend/.env` đang trống, chạy:

```bash
make key-generate
make cache-clear
```

Mỗi môi trường phải có `APP_KEY` riêng. Không sử dụng khóa production trên máy local.

## 6. Kiểm tra sau khi cài

### 6.1 Container

```bash
docker compose ps
```

Các service chính phải có trạng thái `Up` hoặc `healthy`.

### 6.2 Laravel

```bash
curl http://localhost/api/ping
```

Kết quả hợp lệ:

```json
{"message":"Laravel API OK"}
```

### 6.3 Pikafish/NNUE

```bash
make pikafish-health
```

Kết quả hợp lệ:

```json
{"status":"ok","engine":"Pikafish dev-20260910-99793311"}
```

### 6.4 Frontend

Mở trình duyệt:

```text
http://localhost
```

Chinese Chess:

```text
http://localhost/games/chinese-chess
```

Khi chọn **Chơi với máy**, khung người chơi Đen nên hiển thị `Máy tính · Pikafish NNUE` sau khi máy thực hiện nước đầu tiên.

## 7. Những lần chạy sau

Khởi động:

```bash
make up
```

Dừng toàn bộ project:

```bash
make down
```

Khởi động lại backend:

```bash
make restart
```

Xem trạng thái:

```bash
make ps
```

## 8. Sau khi pull code mới

Luồng thông thường:

```bash
git pull
make up
make composer-install
make migrate
make cache-clear
```

Nếu `docker/php/Dockerfile` hoặc PHP extension thay đổi:

```bash
docker compose build backend
docker compose up -d backend nginx
```

Nếu Pikafish Dockerfile, commit engine, checksum NNUE hoặc kiến trúc CPU thay đổi:

```bash
make pikafish-build
make pikafish-health
```

Nếu dependency frontend thay đổi, container frontend tự chạy `npm install` khi được tạo lại:

```bash
docker compose up -d --force-recreate frontend
```

## 9. Các lệnh thường dùng

| Lệnh | Công dụng |
|---|---|
| `make setup` | Cài đặt project lần đầu |
| `make up` | Khởi động container |
| `make down` | Dừng container |
| `make ps` | Xem trạng thái |
| `make logs` | Theo dõi log backend |
| `make migrate` | Chạy migration |
| `make cache-clear` | Xóa cache Laravel |
| `make test` | Chạy backend test |
| `make pikafish-build` | Build và chạy Pikafish |
| `make pikafish-health` | Kiểm tra engine và NNUE |
| `make pikafish-logs` | Xem log Pikafish |

Xem toàn bộ lệnh:

```bash
make help
```

## 10. Xử lý lỗi

### Thiếu `backend/.env`

```text
Thiếu backend/.env
```

Tạo file theo mục 4.1 rồi chạy lại `make setup`.

### `APP_KEY` chưa được thiết lập

```bash
make key-generate
make cache-clear
```

### Không kết nối được MySQL

Kiểm tra `backend/.env`:

```dotenv
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel_nuxt
DB_USERNAME=user123
DB_PASSWORD=root
```

Kiểm tra container và log:

```bash
docker compose ps mysql
docker compose logs --tail=100 mysql
```

### Pikafish không healthy

```bash
docker compose ps pikafish
docker compose logs --tail=100 pikafish
```

Nếu gặp `Illegal instruction`, đổi root `.env`:

```dotenv
PIKAFISH_ARCH=x86-64
```

Sau đó build lại:

```bash
docker compose build --no-cache pikafish
docker compose up -d --force-recreate pikafish backend
make pikafish-health
```

### Cổng 80 hoặc 3000 đã được sử dụng

Kiểm tra process/container đang chiếm cổng:

```bash
docker ps
```

Dừng service xung đột hoặc đổi port trong `docker-compose.yml`.

### Frontend không gọi được API

Kiểm tra `frontend/.env`:

```dotenv
NUXT_PUBLIC_API_URL=/
```

Sau đó tạo lại frontend:

```bash
docker compose up -d --force-recreate frontend nginx
```

### Realtime/Pusher không hoạt động

Kiểm tra public key và cluster của frontend có khớp backend hay không. Sau khi sửa `.env`:

```bash
docker compose exec backend php artisan optimize:clear
docker compose up -d --force-recreate frontend backend
```

## 11. Cloudflare Tunnel tùy chọn

Cloudflare không cần thiết khi chỉ chạy local. Khi cần cho máy khác truy cập, xem [Hướng dẫn Cloudflare Tunnel](./cloudflare-tunnel.md).

Không chia sẻ tunnel URL lâu dài như một địa chỉ production và không đưa secret vào Git.
