# Hướng dẫn thêm tháp phòng thủ mới

Tài liệu này mô tả các bước thêm một loại tháp mới vào Tower Defense theo kiến
trúc hiện tại. Ví dụ bên dưới sử dụng tháp độc với mã định danh `poison`.

## Tổng quan

Một tháp được chia thành các phần độc lập:

| Phần | File chính | Trách nhiệm |
| --- | --- | --- |
| Kiểu dữ liệu | `app/types/games/towerDefense.ts` | Khai báo mã định danh và dữ liệu tháp |
| Thông số | `app/games/tower-defense/gameplay-config.ts` | Giá, damage, range và fire rate |
| Gameplay | `app/composables/useTowerDefense.ts` | Chọn mục tiêu, bắn và áp dụng hiệu ứng |
| Model | `app/components/tower-defense/scene/tower-models.ts` | Tải model GLB theo level |
| Hiển thị tháp | `TowerDefenseScene.client.vue` | Glow, hiệu ứng nâng cấp và animation |
| Đạn | `scene/projectile-scene.ts` | Hình dạng, điểm xuất phát và quỹ đạo đạn |
| Va chạm | `scene/impact-scene.ts` | Hiệu ứng khi đạn trúng mục tiêu |
| Giao diện | `app/pages/games/tower-defense/index.vue` | Nút chọn, icon và thông tin tháp |

## 1. Khai báo loại tháp

Mở `app/types/games/towerDefense.ts` và thêm mã định danh mới vào `TowerKind`:

```ts
export type TowerKind =
  | "archer"
  | "cannon"
  | "frost"
  | "fire"
  | "thunder"
  | "water"
  | "poison";
```

Nên sử dụng tên ngắn, viết thường và không chứa khoảng trắng. Mã này được dùng
trong gameplay, model, projectile, impact và hồ sơ kháng của kẻ địch.

## 2. Khai báo thông số gameplay

Thêm cấu hình vào `TOWER_DEFINITIONS` trong `gameplay-config.ts`:

```ts
poison: {
  kind: "poison",
  name: "Tháp độc",
  description: "Bắn độc tố gây sát thương theo thời gian.",
  cost: 160,
  damage: 8,
  range: 2.8,
  fireRate: 1,
  color: "#65a30d",
},
```

Các thuộc tính có sẵn:

- `cost`: giá xây tháp.
- `damage`: sát thương của một phát bắn ở level 1.
- `range`: tầm bắn theo đơn vị grid.
- `fireRate`: thời gian giữa hai phát bắn, tính bằng giây.
- `slow` và `slowDuration`: tỷ lệ và thời gian làm chậm.
- `burnDuration` và `burnDamagePerSecond`: hiệu ứng thiêu đốt.
- `splashRadius` và `splashDamageRatio`: bán kính và sát thương lan ở rìa.
- `color`: màu đại diện trên giao diện.

Nếu tháp cần thuộc tính mới như `poisonDuration`, hãy thêm thuộc tính tùy chọn
vào `TowerDefinition` và `Projectile` trong `towerDefense.ts`.

## 3. Chuẩn bị model theo level

Đặt model trong `public` theo cấu trúc thống nhất:

```text
backend/storage/app/tower-defense/assets/models/games/tower-defense/poison/enemy/level1.glb
backend/storage/app/tower-defense/assets/models/games/tower-defense/poison/enemy/level2.glb
backend/storage/app/tower-defense/assets/models/games/tower-defense/poison/enemy/level3.glb
```

Sau đó cập nhật `scene/tower-models.ts`.

### Thêm vào nhóm model có level

```ts
export type LevelledTowerKind = Extract<
  TowerKind,
  "frost" | "fire" | "thunder" | "water" | "poison"
>;
```

### Đăng ký model

```ts
{
  kind: "poison",
  modelName: "PoisonTower3D",
  targetHeight: 2.1,
  urls: {
    1: "/api/tower-defense/assets/models/games/tower-defense/poison/enemy/level1.glb",
    2: "/api/tower-defense/assets/models/games/tower-defense/poison/enemy/level2.glb",
    3: "/api/tower-defense/assets/models/games/tower-defense/poison/enemy/level3.glb",
  },
},
```

`targetHeight` là chiều cao chuẩn hóa trước khi scene áp dụng scale theo level.
Model phải đặt chân tại đáy của bounding box; thư viện sẽ tự căn tâm X/Z và đưa
đáy model về mặt đất.

Nếu chưa có GLB, cần tạo model procedural và đăng ký nó vào `towerTemplates`
trong `TowerDefenseScene.client.vue`.

## 4. Khai báo glow và hiệu ứng nâng cấp

Nếu model dùng `decorateElementalTowerGlow`, bổ sung cấu hình cho loại tháp mới:

- Tỷ lệ chiều cao glow theo từng level.
- Kích thước glow.
- Màu lõi và màu ngoài.
- Độ sáng theo level.

Trong `TowerDefenseScene.client.vue`, thêm loại tháp mới vào các object:

```ts
const colors: Record<TowerKind, number> = {
  // ...
  poison: 0x84cc16,
};

const accentColors: Record<TowerKind, number> = {
  // ...
  poison: 0xd9f99d,
};
```

Thực hiện tương tự cho bảng màu trong `createTowerUpgradeEffect`. Sau khi thêm
`TowerKind`, TypeScript sẽ báo lỗi tại những `Record<TowerKind, ...>` còn thiếu.

## 5. Thêm hình dạng viên đạn

Mở `scene/projectile-scene.ts` và thêm nhánh trong `createTemplate`:

```ts
} else if (kind === "poison") {
  shot = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 10),
    new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  shot.name = "poisonShotCore";
```

Thêm `poison` vào danh sách khởi tạo template:

```ts
for (const kind of [
  "archer",
  "cannon",
  "frost",
  "fire",
  "thunder",
  "water",
  "poison",
] as const) {
  templates.set(kind, createTemplate(kind));
}
```

Nếu bỏ qua bước này, `createProjectile` sẽ báo `Missing projectile template`.

## 6. Chọn điểm xuất phát của đạn

Mặc định đạn xuất hiện tại tâm ô của tháp với cao độ `startHeight = 0.72`.

Nếu model có điểm bắn riêng, nên đặt tên node trong GLB, ví dụ:

```text
projectileSpawn
```

Trong `sync` của `projectile-scene.ts`, lấy tọa độ world của node đó:

```ts
const sourceModel = sourceTower
  ? towerModels.get(sourceTower.id)
  : undefined;
const projectileSpawn = sourceModel?.getObjectByName("projectileSpawn");

if (projectileSpawn) {
  projectileSpawn.getWorldPosition(from);
  startHeight = from.y;
}
```

`getWorldPosition` đã bao gồm position, rotation và scale của model, vì vậy điểm
bắn sẽ tự thay đổi đúng theo từng level.

## 7. Thêm hiệu ứng va chạm

Mở `scene/impact-scene.ts` và thêm nhánh trong `createImpact`:

```ts
} else if (impact.kind === "poison") {
  group.position.y = 0.2;

  const cloud = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0x84cc16,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );

  cloud.name = "poisonHitCloud";
  group.add(cloud);
```

Thêm nhánh tương ứng trong `sync` để scale, xoay và giảm opacity theo
`progress`. Nếu không thêm hiệu ứng riêng, loại tháp mới hiện rơi vào hiệu ứng
mặc định gần giống đạn pháo.

## 8. Thêm logic chiến đấu đặc biệt

Tháp gây sát thương trực tiếp thông thường sẽ tự sử dụng luồng projectile có
sẵn trong `useTowerDefense.ts`:

1. Tìm kẻ địch đi xa nhất trong tầm bắn.
2. Chờ cooldown.
3. Tạo projectile.
4. Gây sát thương khi projectile đến đích.
5. Tăng sát thương và tốc độ bắn theo level.

Chỉ cần sửa `useTowerDefense.ts` nếu tháp có cơ chế đặc biệt, ví dụ:

- Gây độc theo thời gian.
- Bắn xuyên nhiều mục tiêu.
- Hồi máu hoặc tăng sức mạnh cho tháp khác.
- Tấn công liên tục giống tháp sét.
- Tạo vùng tác động giống tháp băng.

Với hiệu ứng độc, nên bổ sung trạng thái vào `Enemy`, cập nhật trạng thái trong
`step`, đồng thời khai báo multiplier kháng hiệu ứng trong hồ sơ kẻ địch.

## 9. Thêm icon và thông tin giao diện

Import icon phù hợp từ `lucide-vue-next` trong `index.vue`:

```ts
import { FlaskConical } from "lucide-vue-next";
```

Sau đó thêm điều kiện vào danh sách lựa chọn tháp:

```vue
<FlaskConical v-else-if="kind === 'poison'" />
```

Nếu tháp có thông số riêng, thêm chúng vào:

- Popup tháp đang được chọn.
- Tooltip trong danh sách xây dựng.
- Mô tả damage, tốc độ bắn và hiệu ứng trạng thái.

Nếu không thêm icon, nhánh `else` hiện tại sẽ hiển thị icon của tháp nước.

## 10. Kháng và điểm yếu của kẻ địch

`EnemyCombatProfile.damageMultipliers` sử dụng `TowerKind` nên có thể cấu hình
sát thương của tháp mới theo từng loại kẻ địch:

```ts
damageMultipliers: {
  poison: 0.5,
}
```

`0.5` nghĩa là kẻ địch chỉ nhận 50% sát thương độc. Nếu không khai báo, hệ số
mặc định là `1`, tương đương nhận đủ sát thương.

Nếu tạo trạng thái mới, thêm nó vào `EnemyStatusEffect` và bổ sung
`effectDurationMultipliers`.

## Checklist hoàn thành

- [ ] Thêm mã vào `TowerKind`.
- [ ] Thêm entry vào `TOWER_DEFINITIONS`.
- [ ] Thêm model GLB hoặc model procedural.
- [ ] Thêm màu glow và hiệu ứng nâng cấp.
- [ ] Đăng ký projectile template.
- [ ] Căn đúng điểm xuất phát của đạn.
- [ ] Thêm impact và animation impact.
- [ ] Thêm logic gameplay đặc biệt nếu cần.
- [ ] Thêm icon và thông tin UI.
- [ ] Cập nhật kháng và điểm yếu của enemy nếu cần.
- [ ] Kiểm tra cả level 1, 2 và 3.
- [ ] Kiểm tra build/typecheck trước khi hoàn tất.

## Kiểm tra nhanh

Sau khi hoàn thành, cần kiểm tra:

1. Tháp xuất hiện trong sidebar và có thể được chọn lại để hủy chọn.
2. Không thể xây vượt quá giới hạn tháp của map.
3. Model đứng đúng mặt đất ở cả ba level.
4. Điểm bắn nằm đúng đầu nòng, glow hoặc node spawn.
5. Đạn biến mất đúng lúc va chạm.
6. Damage, splash và hiệu ứng trạng thái hoạt động đúng.
7. Popup nâng cấp hiển thị đúng thông số.
8. Không có lỗi `Missing tower template` hoặc `Missing projectile template`.
9. Geometry, material và texture được giải phóng khi rời trang.
10. Game vẫn ổn định khi có nhiều tháp và nhiều projectile cùng lúc.
