<?php

namespace Database\Seeders;

use App\Models\TowerDefenseEnemy;
use Illuminate\Database\Seeder;

class TowerDefenseEnemySeeder extends Seeder
{
    public function run(): void
    {
        TowerDefenseEnemy::query()->updateOrCreate(['id' => 'dark-soldier'], [
            'name' => 'Hắc binh',
            'kind' => 'normal',
            'model_asset_key' => 'models/games/tower-defense/character/normal.glb',
            'avatar_asset_key' => 'images/games/tower-defense/military/dark/normal.png',
            'left_weapon_asset_key' => null,
            'right_weapon_asset_key' => null,
            'base_health' => 100,
            'base_speed' => 1,
            'reward' => 10,
            'castle_damage' => 1,
            'summary' => 'Lính tiền tuyến cân bằng, không có kháng hay điểm yếu đặc biệt.',
            'resistance' => 'Không',
            'weakness' => 'Không',
            'model_configuration' => [
                'characterScale' => 2,
                'sceneScale' => 0.494,
                'healthBarY' => 1.85,
                'animationNames' => ['Walk', 'Run'],
                'removeRootMotion' => true,
            ],
            'combat_profile' => [
                'damageMultipliers' => [],
                'effectDurationMultipliers' => [],
            ],
            'is_active' => true,
        ]);

        TowerDefenseEnemy::query()->updateOrCreate(['id' => 'lava-overlord'], [
            'name' => 'Chúa tể Dung nham',
            'kind' => 'boss',
            'model_asset_key' => 'models/games/tower-defense/character/boss/map/lava/boss.glb',
            'avatar_asset_key' => 'images/games/tower-defense/military/dark/lava/boss.png',
            'left_weapon_asset_key' => null,
            'right_weapon_asset_key' => null,
            'base_health' => 1200,
            'base_speed' => 0.65,
            'reward' => 250,
            'castle_damage' => 5,
            'summary' => 'Thực thể dung nham khổng lồ, gần như miễn nhiễm với lửa.',
            'resistance' => 'Kháng hiệu ứng lửa, giảm 90% sát thương lửa',
            'weakness' => 'Nhận thêm 25% sát thương nước',
            'model_configuration' => [
                'characterScale' => 1,
                'sceneScale' => 1,
                'healthBarY' => 2.5,
                'animationNames' => ['Walk', 'Run'],
                'removeRootMotion' => true,
            ],
            'combat_profile' => [
                'damageMultipliers' => ['fire' => 0.1, 'water' => 1.25],
                'effectDurationMultipliers' => ['burn' => 0],
            ],
            'is_active' => true,
        ]);

        TowerDefenseEnemy::query()->updateOrCreate(['id' => 'dark-commander'], [
            'name' => 'Thủ lĩnh Hắc quân',
            'kind' => 'boss',
            'model_asset_key' => 'models/games/tower-defense/kit/adventure/Characters/gltf/Knight.glb',
            'avatar_asset_key' => 'images/games/tower-defense/military/dark/lava/boss.png',
            'left_weapon_asset_key' => 'models/games/tower-defense/kit/adventure/Assets/gltf/shield_round_color.gltf',
            'right_weapon_asset_key' => 'models/games/tower-defense/kit/adventure/Assets/gltf/sword_1handed.gltf',
            'base_health' => 440,
            'base_speed' => 0.5,
            'reward' => 35,
            'castle_damage' => 5,
            'summary' => 'Kẻ địch tinh nhuệ chỉ huy Hắc quân, có lượng máu cao và di chuyển chậm.',
            'resistance' => 'Không',
            'weakness' => 'Không',
            'model_configuration' => [
                'characterScale' => 0.78,
                'sceneScale' => 1.05,
                'healthBarY' => 1.9,
                'animationNames' => ['Walking_A'],
                'removeRootMotion' => true,
            ],
            'combat_profile' => [
                'damageMultipliers' => [],
                'effectDurationMultipliers' => [],
            ],
            'is_active' => true,
        ]);
    }
}
