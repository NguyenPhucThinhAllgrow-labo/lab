# Tower Defense content API

Map và asset của Tower Defense được quản lý bởi Laravel thay vì phục vụ trực
tiếp từ `frontend/public`.

## Vị trí dữ liệu

- Cấu hình map: bảng `tower_defense_maps`, cột `configuration` là JSON.
- Metadata asset: bảng `tower_defense_assets`.
- File thật: `backend/storage/app/tower-defense/assets`.
- Dữ liệu map ban đầu: `backend/database/data/tower-defense-maps.json`.

Cấu trúc asset giữ nguyên đường dẫn tương đối:

```text
assets/
├── models/games/tower-defense/...
├── sounds/...
└── images/games/tower-defense/...
```

## Khởi tạo database

```bash
php artisan migrate
php artisan db:seed --class=TowerDefenseMapSeeder
php artisan db:seed --class=TowerDefenseAssetSeeder
```

Chạy lại `TowerDefenseAssetSeeder` sau khi chép file trực tiếp vào storage để
đồng bộ metadata và kích thước file.

## API public

- `GET /api/tower-defense/maps`
- `GET /api/tower-defense/maps/{id}`
- `GET /api/tower-defense/assets`
- `GET /api/tower-defense/assets/{key}`

Nuxt gọi API map khi mở trang game. Database là nguồn cấu hình map duy nhất;
nếu API chưa sẵn sàng, trang game trả lỗi `503` thay vì dùng dữ liệu cục bộ cũ.

## API admin

Các endpoint sau yêu cầu Sanctum token/cookie của tài khoản `admin`:

Giao diện quản trị có tại `/admin/tower-defense`, gồm tab quản lý map và tab
quản lý tài nguyên. Giới hạn upload đồng bộ ở Laravel, PHP và Nginx là 200 MB.
Form map có trình dựng trực quan hai lane: click các điểm cùng hàng/cột để tạo
đường đi, hoàn tác hoặc xóa lane. `paths` và `pathTiles` được cập nhật live;
phần JSON nâng cao dùng để chỉnh camera, theme, model nền và boss.

- `GET /api/admin/tower-defense/maps`
- `POST /api/admin/tower-defense/maps`
- `PUT /api/admin/tower-defense/maps/{id}`
- `DELETE /api/admin/tower-defense/maps/{id}`
- `GET /api/admin/tower-defense/assets`
- `POST /api/admin/tower-defense/assets` — multipart gồm `key`, `type`, `file`
  và tùy chọn `metadata`.
- `DELETE /api/admin/tower-defense/assets/{key}`

`type` của asset nhận một trong `model`, `sound`, `image`. `key` phải bắt đầu
bằng `models/`, `sounds/` hoặc `images/`.
