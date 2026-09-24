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
            $tower['role'] = in_array($tower['id'], ['speed', 'damage'], true) ? 'buff' : 'damage';
            $tower['effects']['items'] = $this->effectItems($tower['id']);
            $levelMultiplier = $tower['id'] === 'thunder' ? [1, 1.42, 1.84] : [1, 1.55, 2.1];
            $tower['damage_by_level'] = [
                '1' => round($tower['damage'] * $levelMultiplier[0], 2),
                '2' => round($tower['damage'] * $levelMultiplier[1], 2),
                '3' => round($tower['damage'] * $levelMultiplier[2], 2),
            ];
            $tower['max_level'] = 3;
            $tower['model_configuration']['targetHeightByLevel'] = array_fill(1, $tower['max_level'], $tower['model_configuration']['targetHeight']);
            $tower['level_stats'] = collect(range(1, $tower['max_level']))->mapWithKeys(function (int $level) use ($tower): array {
                $rangeGrowth = in_array($tower['id'], ['frost', 'speed', 'damage'], true) ? 0 : ($level - 1) * 0.22;
                $fireRateGrowth = $tower['id'] === 'archer' ? 0.35 : 0.18;

                return [(string) $level => [
                    'damage' => $tower['damage_by_level'][(string) $level],
                    'range' => round($tower['range'] + $rangeGrowth, 2),
                    'fireRate' => round($tower['fire_rate'] / (1 + ($level - 1) * $fireRateGrowth), 3),
                    'upgradeCost' => $level === 1 ? $tower['cost'] : (int) round($tower['cost'] * (0.75 + ($level - 2) * 0.35) / 5) * 5,
                ]];
            })->all();
            TowerDefenseTower::query()->updateOrCreate(
                ['id' => $tower['id']],
                [...$tower, 'sort_order' => $sortOrder, 'is_active' => true],
            );
        }
    }

    /** @return array<int, array<string, int|float|string>> */
    private function effectItems(string $kind): array
    {
        return match ($kind) {
            'cannon' => [['id' => 'cannon-splash', 'type' => 'splash-damage', 'behavior' => 'splash_damage', 'name' => 'Nổ lan', 'value' => 0, 'radius' => 0.9, 'ratio' => 0.45, 'perLevel' => 0, 'color' => '#f59e0b']],
            'fire' => [
                ['id' => 'fire-burn', 'type' => 'damage-over-time', 'behavior' => 'damage_over_time', 'name' => 'Thiêu đốt', 'value' => 4, 'duration' => 4, 'perLevel' => 2.2, 'color' => '#ef4444'],
                ['id' => 'fire-splash', 'type' => 'splash-damage', 'behavior' => 'splash_damage', 'name' => 'Cầu lửa nổ', 'value' => 0, 'radius' => 1.05, 'ratio' => 0.55, 'perLevel' => 0, 'color' => '#f97316'],
            ],
            'water' => [
                ['id' => 'water-slow', 'type' => 'slow', 'behavior' => 'slow', 'name' => 'Dòng nước chậm', 'value' => 0.25, 'duration' => 2, 'perLevel' => 0, 'color' => '#38bdf8'],
                ['id' => 'water-splash', 'type' => 'splash-damage', 'behavior' => 'splash_damage', 'name' => 'Nước lan', 'value' => 0, 'radius' => 0.85, 'ratio' => 0.6, 'perLevel' => 0, 'color' => '#0ea5e9'],
            ],
            'speed' => [['id' => 'speed-aura', 'type' => 'attack-speed-aura', 'behavior' => 'attack_speed_aura', 'name' => 'Hào quang tốc độ', 'value' => 0.1, 'perLevel' => 0.2, 'radius' => 2.5, 'color' => '#22c55e']],
            'damage' => [['id' => 'damage-aura', 'type' => 'damage-aura', 'behavior' => 'damage_aura', 'name' => 'Hào quang sát thương', 'value' => 0.1, 'perLevel' => 0.2, 'radius' => 2.5, 'color' => '#ef4444']],
            default => [],
        };
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
