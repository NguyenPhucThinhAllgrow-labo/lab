# Tower Defense content API

Map và asset của Tower Defense được quản lý bởi Laravel thay vì phục vụ trực
tiếp từ `frontend/public`.

## Vị trí dữ liệu

- Cấu hình map: bảng `tower_defense_maps`, cột `configuration` là JSON.
- Metadata asset: bảng `tower_defense_assets`.
- Danh mục quái và boss: bảng `tower_defense_enemies`.
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

Mục “Nội dung riêng của map” cho phép chọn nhiều hồ sơ lính thường và boss,
cùng model lâu đài, model nền 3D và nhạc nền. Thứ tự chọn được lưu trong
`enemyDefinitionIds` và `bossDefinitionIds`; game luân phiên các hồ sơ theo
thứ tự này. Model, avatar, chỉ số, vũ khí và hồ sơ chiến đấu luôn được hydrate
từ danh mục quái của backend thay vì sao chép cố định vào scene frontend.

Trang `/admin/tower-defense/enemies` quản lý tập trung lính thường và boss:
model, avatar, máu, tốc độ, vàng thưởng, sát thương lâu đài, scale model,
animation, vũ khí tay trái/phải tùy chọn, kháng/điểm yếu, hệ số sát thương nhận
vào và thời lượng hiệu ứng. Hai trường vũ khí chỉ nhận asset có purpose
`equipment-model`; scene sẽ gắn chúng vào bone tay tương ứng nếu model hỗ trợ.
Form map cho phép chọn hồ sơ từ danh mục này. Map lưu ID hồ sơ và public API
tự nạp dữ liệu mới nhất, vì vậy chỉnh hồ sơ sẽ có hiệu lực trên mọi map đã gán.

- `GET /api/admin/tower-defense/maps`
- `POST /api/admin/tower-defense/maps`
- `PUT /api/admin/tower-defense/maps/{id}`
- `DELETE /api/admin/tower-defense/maps/{id}`
- `GET /api/admin/tower-defense/enemies`
- `POST /api/admin/tower-defense/enemies`
- `PUT /api/admin/tower-defense/enemies/{id}`
- `DELETE /api/admin/tower-defense/enemies/{id}`
- `GET /api/admin/tower-defense/assets`
- `POST /api/admin/tower-defense/assets` — multipart gồm `key`, `type`,
  `purpose`, `file` và tùy chọn `metadata`.
- `PUT /api/admin/tower-defense/assets/{key}` — đổi `purpose` của asset.
- `DELETE /api/admin/tower-defense/assets/{key}`

`type` mô tả định dạng cấp cao và nhận một trong `model`, `sound`, `image`.
`purpose` mô tả tài nguyên dùng cho thành phần nào:

- Model: `enemy-model`, `boss-model`, `castle-model`, `map-model`,
  `tower-model`, `equipment-model`, `animation`, `texture`, `other`.
- Âm thanh: `background-music`, `tower-sfx`, `other`.
- Hình ảnh: `enemy-avatar`, `boss-avatar`, `map-image`, `ui-image`, `other`.

Backend kiểm tra `purpose` phải phù hợp với `type`. Trang admin dùng trường này
để lọc kho tài nguyên và chỉ hiện đúng model/ảnh/âm thanh trong từng ô cấu hình
map. `key` phải bắt đầu bằng `models/`, `sounds/` hoặc `images/`.
