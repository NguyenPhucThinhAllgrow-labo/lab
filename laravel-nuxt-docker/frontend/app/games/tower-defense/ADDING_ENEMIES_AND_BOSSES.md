# Hướng dẫn thêm quái và boss mới

Tài liệu này mô tả cách thêm model, animation, chỉ số, kháng, điểm yếu, lịch
spawn và hồ sơ giao diện cho quái thường hoặc boss trong Tower Defense.

## Tổng quan kiến trúc

| Phần | File chính | Trách nhiệm |
| --- | --- | --- |
| Kiểu dữ liệu | `app/types/games/towerDefense.ts` | Enemy, model definition và combat profile |
| Model | `scene/enemy-models.ts` | URL model, scale, animation và equipment |
| Render | `scene/enemy-scene.ts` | Tải GLB, animation, di chuyển, bóng và thanh máu |
| Gameplay | `app/composables/useTowerDefense.ts` | Spawn, HP, tốc độ, phần thưởng và sát thương lâu đài |
| Kháng/điểm yếu | `app/games/tower-defense/enemy-combat.ts` | Hệ số damage và thời gian hiệu ứng |
| Map | Bảng `tower_defense_maps` | Boss model/profile riêng của từng map |
| Giao diện | `app/pages/games/tower-defense/index.vue` | Avatar và hồ sơ kẻ địch |

Quái thường và boss đều sử dụng interface `Enemy`. Không cần thêm một
`EnemyKind` mới chỉ để thay model. Quái thường chọn model bằng `modelKey`, còn
boss có thể dùng `bossClass` hoặc model riêng được cấu hình trên map.

## Phần A — Thêm quái thường mới

### 1. Chuẩn bị model

Đặt GLB trong thư mục public, ví dụ:

```text
backend/storage/app/tower-defense/assets/models/games/tower-defense/character/normal.glb
backend/storage/app/tower-defense/assets/models/games/tower-defense/character/armored.glb
backend/storage/app/tower-defense/assets/models/games/tower-defense/character/runner.glb
```

Model nên đáp ứng các yêu cầu sau:

- Có skeleton và animation đi bộ.
- Tên animation có chứa `walk`, hoặc khai báo đúng tên trong cấu hình.
- Nhân vật nhìn theo trục forward nhất quán với model hiện tại.
- Chân model nằm gần mặt đất tại local Y bằng `0`.
- Không chứa translation tiến về trước nếu dùng `removeRootMotion: true`.
- Texture được nhúng trong GLB hoặc đặt tại đường dẫn public hợp lệ.

### 2. Đăng ký model

Mở `app/components/tower-defense/scene/enemy-models.ts` và thêm entry vào
`ENEMY_MODEL_DEFINITIONS`:

```ts
export const ENEMY_MODEL_DEFINITIONS = {
  normal: {
    url: "/api/tower-defense/assets/models/games/tower-defense/character/normal.glb",
    characterScale: 2,
    sceneScale: 0.494,
    healthBarY: 2.1,
    animationNames: ["walk"],
    removeRootMotion: true,
  },

  armored: {
    url: "/api/tower-defense/assets/models/games/tower-defense/character/armored.glb",
    characterScale: 1.8,
    sceneScale: 0.55,
    healthBarY: 2.25,
    animationNames: ["walk", "walking"],
    removeRootMotion: true,
  },
};
```

Ý nghĩa các thuộc tính:

- `url`: URL tính từ thư mục `public`.
- `characterScale`: scale được áp dụng trực tiếp cho character trong template.
- `sceneScale`: scale cuối cùng của wrapper khi xuất hiện trên bản đồ.
- `healthBarY`: độ cao thanh máu và icon trạng thái.
- `animationNames`: danh sách tên dùng để tìm walk clip.
- `removeRootMotion`: giữ model đi tại chỗ và để gameplay điều khiển tọa độ.

Scale hiển thị cuối cùng gần bằng:

```text
characterScale × sceneScale
```

Nên điều chỉnh hai giá trị sao cho model có kích thước tương đương chiều rộng
một ô đường đi.

### 3. Gán model khi spawn

`modelKey` trong `Enemy` phải trùng với key vừa đăng ký:

```ts
enemies.value.push({
  // ...
  kind: "normal",
  modelKey: "armored",
  combatProfileKey: "armored",
});
```

Nếu không cung cấp `modelKey`, renderer sử dụng `DEFAULT_ENEMY_MODEL_KEY`, hiện
tại là `normal`.

Để tạo nhiều loại quái trong cùng wave, chọn model trước khi push enemy:

```ts
const modelKey = wave.value >= 8 && Math.random() < 0.3
  ? "armored"
  : "normal";
```

Nên tách cấu hình spawn thành dữ liệu riêng nếu số lượng loại quái tăng nhiều,
thay vì tiếp tục thêm nhiều điều kiện trực tiếp vào `spawnEnemy`.

### 4. Thêm chỉ số riêng

Hiện `spawnEnemy` tính HP, tốc độ và phần thưởng từ wave. Có thể áp dụng hệ số
theo loại quái:

```ts
const enemyStats = {
  normal: { hp: 1, speed: 1, reward: 1 },
  armored: { hp: 1.8, speed: 0.72, reward: 1.5 },
  runner: { hp: 0.7, speed: 1.45, reward: 1.2 },
} as const;

const stats = enemyStats[modelKey];
const enemyHp = maxHp * stats.hp;
const speed = baseSpeed * stats.speed;
const reward = Math.round(baseReward * stats.reward);
```

HP và tốc độ thực tế phải được ghi vào `hp`, `maxHp` và `speed` của `Enemy`.

## Phần B — Thêm combat profile

Combat profile quyết định kháng sát thương, điểm yếu và khả năng kháng hiệu ứng.

### 1. Khai báo key

Trong `app/types/games/towerDefense.ts`:

```ts
export type EnemyCombatProfileKey =
  | "normal"
  | "armored"
  | "lava-boss"
  | "ice-boss";
```

### 2. Khai báo hệ số

Trong `app/games/tower-defense/enemy-combat.ts`:

```ts
armored: {
  damageMultipliers: {
    archer: 0.65,
    cannon: 1.25,
  },
  effectDurationMultipliers: {
    slow: 0.8,
  },
},

"ice-boss": {
  damageMultipliers: {
    frost: 0.1,
    fire: 1.3,
  },
  effectDurationMultipliers: {
    freeze: 0,
  },
},
```

Quy ước multiplier:

- `1`: nhận sát thương hoặc hiệu ứng bình thường.
- `0`: miễn nhiễm hoàn toàn.
- `0.5`: chỉ nhận 50%.
- `1.25`: nhận thêm 25%.

Các tower không được khai báo sẽ mặc định có multiplier bằng `1`.

## Phần C — Thêm boss riêng cho map

Đây là cách phù hợp khi mỗi map có một boss GLB riêng, giống boss dung nham.

### 1. Chuẩn bị asset

Ví dụ boss băng:

```text
backend/storage/app/tower-defense/assets/models/games/tower-defense/character/boss/map/ice/boss.glb
backend/storage/app/tower-defense/assets/images/games/tower-defense/military/dark/ice/boss.png
```

### 2. Cấu hình boss trong map

Mở file map tương ứng và thêm:

```ts
bossCombatProfileKey: "ice-boss",
bossModel: {
  url: "/api/tower-defense/assets/models/games/tower-defense/character/boss/map/ice/boss.glb",
  characterScale: 2,
  sceneScale: 1,
  healthBarY: 2.2,
  animationNames: ["walk"],
  removeRootMotion: true,
},
```

Khi map có `bossModel`, `enemy-scene.ts` sẽ ưu tiên model này thay cho model
Adventure Kit được chọn bởi `bossClass`.

### 3. Điều chỉnh thông số boss

Các hằng số chung nằm trong `gameplay-config.ts`:

```ts
export const BOSS_HEALTH_MULTIPLIER = 5.5;
export const BOSS_REWARD_MULTIPLIER = 5;
export const BOSS_CASTLE_DAMAGE = 5;
```

Hiện boss:

- Xuất hiện mỗi 5 wave.
- Có HP bằng HP quái thường nhân `BOSS_HEALTH_MULTIPLIER`.
- Di chuyển bằng 50% tốc độ quái thường.
- Cho phần thưởng nhân `BOSS_REWARD_MULTIPLIER`.
- Gây mất `BOSS_CASTLE_DAMAGE` máu khi lọt qua cổng.

Nếu mỗi boss cần chỉ số riêng, nên chuyển các hệ số này thành một registry theo
`combatProfileKey` hoặc `bossClass`.

### 4. Glow hoặc aura dưới chân boss

Boss dung nham hiện có aura riêng khi:

```ts
enemy.combatProfileKey === "lava-boss"
```

Để boss mới có aura riêng, thêm cấu hình aura theo profile trong
`enemy-scene.ts`, hoặc tổng quát hóa thành registry:

```ts
const BOSS_AURA_COLORS: Partial<Record<EnemyCombatProfileKey, number>> = {
  "lava-boss": 0xff5a24,
  "ice-boss": 0x67e8f9,
};
```

Không nên dùng cùng điều kiện `lava-boss` cho tất cả boss vì màu và intensity
sẽ khó bảo trì khi số lượng boss tăng.

## Phần D — Thêm boss dùng Adventure Kit

Game hiện hỗ trợ các class:

```text
barbarian, knight, mage, ranger, rogue
```

Muốn thêm class mới:

1. Thêm class vào `BossClass` trong `towerDefense.ts`.
2. Thêm class vào `BOSS_CLASSES` trong `gameplay-config.ts`.
3. Khai báo character path trong `BOSS_CHARACTER_PATHS`.
4. Khai báo vũ khí trong `BOSS_EQUIPMENT_PATHS`.
5. Điều chỉnh `rightTransform` và `leftTransform` nếu vũ khí lệch tay.
6. Đảm bảo skeleton tương thích với clip `BOSS_MOVEMENT_PATH`.

Ví dụ:

```ts
export const BOSS_CHARACTER_PATHS = {
  // ...
  paladin: "Characters/gltf/Paladin.glb",
};

export const BOSS_EQUIPMENT_PATHS = {
  // ...
  paladin: {
    right: "Assets/gltf/sword_2handed.gltf",
    left: "Assets/gltf/shield_heater.gltf",
  },
};
```

Các node tay hiện được tìm bằng tên `handslotr` và `handslotl`. GLTFLoader có
thể loại dấu chấm khỏi tên node, vì vậy cần kiểm tra tên node sau khi load.

## Phần E — Animation và chuyển động

`enemy-scene.ts` tự thực hiện:

- Clone skeleton an toàn bằng `SkeletonUtils.clone`.
- Chọn walk clip theo `animationNames`.
- Loại root motion X/Z khi được yêu cầu.
- Đồng bộ tốc độ mixer với vận tốc world thực tế.
- Giảm nhịp chân khi bị slow.
- Dừng mixer khi bị freeze.
- Xoay model theo hướng của đường đi.
- Tái sử dụng model bằng object pool.

Nếu model trượt hoặc moonwalk, kiểm tra theo thứ tự:

1. Walk clip có thực sự được tìm thấy không.
2. `removeRootMotion` có đúng với model không.
3. Model có nhìn đúng forward axis không.
4. `characterScale` và `sceneScale` có quá lớn không.
5. Chân có nằm tại local Y bằng `0` không.
6. Tên xương hông có kết thúc bằng `Hips.position` không.

Nếu root motion sử dụng tên xương khác, cập nhật `removeRootMotion` để nhận diện
track tương ứng.

## Phần F — Thanh máu, bóng và hiệu ứng trạng thái

Mỗi model được bọc trong một group chứa:

- Character model.
- Thanh máu billboard.
- Bóng tròn dưới chân.
- Icon burn, freeze và slow.
- Aura boss nếu profile hỗ trợ.

Điều chỉnh `healthBarY` nếu thanh máu nằm trong đầu hoặc quá cao. Bán kính bóng
hiện phụ thuộc vào `EnemyKind`; nếu model mới lớn hoặc nhỏ bất thường, nên thêm
`shadowRadius` vào `TowerDefenseCharacterModelDefinition` thay vì hard-code.

## Phần G — Hồ sơ kẻ địch trên giao diện

Avatar đặt trong:

```text
backend/storage/app/tower-defense/assets/images/games/tower-defense/military/dark/<enemy-key>.png
backend/storage/app/tower-defense/assets/images/games/tower-defense/military/dark/<map-key>/boss.png
```

Sau đó cập nhật `enemyIntelCards` trong
`app/pages/games/tower-defense/index.vue`:

```ts
{
  id: "armored",
  name: "Thiết giáp binh",
  avatar: "/api/tower-defense/assets/images/games/tower-defense/military/dark/armored.png",
  summary: "Giáp dày, di chuyển chậm và kháng tên.",
  health: `${armoredHp} HP`,
  resistance: "Giảm 35% sát thương cung",
  weakness: "Nhận thêm 25% sát thương pháo",
}
```

Khi thêm ID mới, mở rộng type của `EnemyIntelCard["id"]` và bảo đảm logic
`dismissedEnemyIntelIds` vẫn nhận ID đó.

Nên tạo một registry hồ sơ dùng chung thay vì tiếp tục hard-code card nếu game
có nhiều loại quái.

## Phần H — Lịch spawn

Hiện tại:

- Quái thường được chia đều cho hai lane.
- Hai lane có cooldown spawn riêng.
- Boss được lên lịch mỗi wave chia hết cho 5.
- Boss xuất hiện ở một lane ngẫu nhiên.

Để thêm wave composition, có thể tạo cấu hình:

```ts
interface EnemySpawnDefinition {
  modelKey: string;
  combatProfileKey: EnemyCombatProfileKey;
  count: number;
  hpMultiplier: number;
  speedMultiplier: number;
  rewardMultiplier: number;
}
```

Mỗi lane nên giữ một queue `EnemySpawnDefinition[]`. `spawnEnemy` chỉ lấy phần
tử đầu queue thay vì tự quyết định mọi loại quái bằng điều kiện.

## Checklist thêm quái thường

- [ ] Đặt model GLB trong `public`.
- [ ] Kiểm tra tên walk animation.
- [ ] Thêm entry vào `ENEMY_MODEL_DEFINITIONS`.
- [ ] Căn `characterScale`, `sceneScale` và `healthBarY`.
- [ ] Thêm combat profile nếu có kháng hoặc điểm yếu.
- [ ] Gán `modelKey` và `combatProfileKey` khi spawn.
- [ ] Thêm hệ số HP, tốc độ và phần thưởng.
- [ ] Thêm avatar và hồ sơ UI.
- [ ] Kiểm tra bóng, thanh máu và icon trạng thái.
- [ ] Kiểm tra object pool khi quái chết hoặc thoát khỏi màn.

## Checklist thêm boss

- [ ] Đặt model và avatar boss trong `public`.
- [ ] Thêm `EnemyCombatProfileKey`.
- [ ] Thêm profile damage/effect multiplier.
- [ ] Cấu hình `bossModel` và `bossCombatProfileKey` trong map.
- [ ] Căn scale, health bar và animation.
- [ ] Kiểm tra HP, reward, speed và damage lên lâu đài.
- [ ] Thêm aura riêng nếu cần.
- [ ] Thêm hồ sơ boss trước wave boss.
- [ ] Kiểm tra boss ở cả hai lane và các góc cua.
- [ ] Kiểm tra burn, slow, freeze và điểm yếu nguyên tố.

## Kiểm tra cuối cùng

1. Model tải thành công và không xuất hiện cảnh báo trong console.
2. Animation walk phát đúng và không có cảm giác trượt chân.
3. Model quay đúng hướng khi qua góc cua.
4. Thanh máu và icon trạng thái luôn hướng về camera.
5. Freeze dừng cả di chuyển lẫn animation.
6. Slow giảm đúng tốc độ di chuyển và nhịp chân.
7. Kháng và điểm yếu cho ra đúng lượng sát thương.
8. Boss gây đúng lượng damage khi lọt qua cổng.
9. Model được tái sử dụng mà animation vẫn reset đúng.
10. Geometry, material, texture, skeleton và mixer được dispose khi rời game.
