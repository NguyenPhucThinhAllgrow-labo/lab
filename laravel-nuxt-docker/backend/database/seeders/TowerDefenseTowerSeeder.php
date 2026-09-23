<?php

namespace Database\Seeders;

use App\Models\TowerDefenseTower;
use Illuminate\Database\Seeder;

class TowerDefenseTowerSeeder extends Seeder
{
    public function run(): void
    {
        $towers = [
            [
                'id' => 'archer',
                'name' => 'Tháp cung',
                'description' => 'Tầm xa; mỗi lần nâng cấp bắn thêm 2 mục tiêu.',
                'cost' => 90,
                'damage' => 10,
                'range' => 3.4,
                'fire_rate' => 0.75,
                'color' => '#65a30d',
                'effects' => [],
                'model_asset_keys' => [],
                'model_configuration' => ['targetHeight' => 2],
            ],
            [
                'id' => 'cannon',
                'name' => 'Tháp pháo',
                'description' => 'Uy lực lớn, nổ lan quanh mục tiêu.',
                'cost' => 145,
                'damage' => 34,
                'range' => 2.7,
                'fire_rate' => 1.45,
                'color' => '#d97706',
                'effects' => ['splashRadius' => 0.9, 'splashDamageRatio' => 0.45],
                'model_asset_keys' => [],
                'model_configuration' => ['targetHeight' => 2],
            ],
            [
                'id' => 'frost',
                'name' => 'Tháp băng',
                'description' => 'Đóng băng hoàn toàn kẻ địch trong vùng.',
                'cost' => 120,
                'damage' => 0,
                'range' => 1.47,
                'fire_rate' => 5.2,
                'color' => '#0891b2',
                'effects' => [],
                'model_asset_keys' => $this->levels('frost'),
                'model_configuration' => ['targetHeight' => 2.1],
            ],
            [
                'id' => 'fire',
                'name' => 'Tháp lửa',
                'description' => 'Cầu lửa nổ lan và thiêu đốt trong 4 giây.',
                'cost' => 150,
                'damage' => 10,
                'range' => 2.7,
                'fire_rate' => 1.1,
                'color' => '#dc2626',
                'effects' => [
                    'burnDuration' => 4,
                    'burnDamagePerSecond' => 4,
                    'splashRadius' => 1.05,
                    'splashDamageRatio' => 0.55,
                ],
                'model_asset_keys' => $this->levels('fire'),
                'model_configuration' => ['targetHeight' => 2.1],
            ],
            [
                'id' => 'thunder',
                'name' => 'Tháp sét',
                'description' => 'Tia điện liên tục, nối chuỗi qua nhiều mục tiêu.',
                'cost' => 175,
                'damage' => 16,
                'range' => 3.05,
                'fire_rate' => 0,
                'color' => '#7c3aed',
                'effects' => [],
                'model_asset_keys' => $this->levels('thunder'),
                'model_configuration' => ['targetHeight' => 2.1],
            ],
            [
                'id' => 'water',
                'name' => 'Tháp nước',
                'description' => 'Phun dòng nước gây sát thương lan và làm chậm cả nhóm.',
                'cost' => 135,
                'damage' => 12,
                'range' => 2.85,
                'fire_rate' => 0.85,
                'color' => '#0284c7',
                'effects' => [
                    'slow' => 0.25,
                    'slowDuration' => 2,
                    'splashRadius' => 0.85,
                    'splashDamageRatio' => 0.6,
                ],
                'model_asset_keys' => [
                    ...$this->levels('water'),
                    'human1' => 'models/games/tower-defense/towers/water/human/level1.glb',
                    'human2' => 'models/games/tower-defense/towers/water/human/level2.glb',
                    'human3' => 'models/games/tower-defense/towers/water/human/level3.glb',
                ],
                'model_configuration' => ['targetHeight' => 2],
            ],
            [
                'id' => 'speed',
                'name' => 'Trụ tốc độ',
                'description' => 'Tăng tốc đánh cho các tháp trong phạm vi.',
                'cost' => 165,
                'damage' => 0,
                'range' => 2.5,
                'fire_rate' => 0,
                'color' => '#22c55e',
                'effects' => [],
                'model_asset_keys' => [
                    'dark1' => 'models/games/tower-defense/towers/supports/enemy/speed.glb',
                    'dark2' => 'models/games/tower-defense/towers/supports/enemy/speed.glb',
                    'dark3' => 'models/games/tower-defense/towers/supports/enemy/speed.glb',
                ],
                'model_configuration' => ['targetHeight' => 2],
            ],
            [
                'id' => 'damage',
                'name' => 'Trụ sát thương',
                'description' => 'Tăng sát thương cho các tháp trong phạm vi.',
                'cost' => 175,
                'damage' => 0,
                'range' => 2.5,
                'fire_rate' => 0,
                'color' => '#ef4444',
                'effects' => [],
                'model_asset_keys' => [
                    'dark1' => 'models/games/tower-defense/towers/supports/enemy/damage/level1.glb',
                    'dark2' => 'models/games/tower-defense/towers/supports/enemy/damage/level2.glb',
                    'dark3' => 'models/games/tower-defense/towers/supports/enemy/damage/level3.glb',
                ],
                'model_configuration' => ['targetHeight' => 2],
            ],
        ];

        foreach ($towers as $sortOrder => $tower) {
            TowerDefenseTower::query()->updateOrCreate(
                ['id' => $tower['id']],
                [...$tower, 'sort_order' => $sortOrder, 'is_active' => true],
            );
        }
    }

    /** @return array<string, string> */
    private function levels(string $kind): array
    {
        $base = "models/games/tower-defense/towers/{$kind}/enemy";

        return [
            'dark1' => "{$base}/level1.glb",
            'dark2' => "{$base}/level2.glb",
            'dark3' => "{$base}/level3.glb",
        ];
    }
}
