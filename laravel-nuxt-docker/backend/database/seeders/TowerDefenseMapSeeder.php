<?php

namespace Database\Seeders;

use App\Models\TowerDefenseMap;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class TowerDefenseMapSeeder extends Seeder
{
    public function run(): void
    {
        $maps = json_decode(
            File::get(database_path('data/tower-defense-maps.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($maps as $index => $definition) {
            $id = $definition['id'];
            $name = $definition['name'];
            unset($definition['id'], $definition['name']);
            $definition = $this->withManagedContent($id, $definition);

            TowerDefenseMap::query()->updateOrCreate(
                ['id' => $id],
                [
                    'name' => $name,
                    'configuration' => $definition,
                    'sort_order' => $index,
                    'is_active' => true,
                ],
            );
        }
    }

    private function withManagedContent(string $id, array $definition): array
    {
        $assetRoot = '/api/tower-defense/assets';
        $definition['backgroundMusicUrl'] ??=
            "{$assetRoot}/sounds/background/default.mp3";
        $definition['enemyModel'] ??= [
            'url' => "{$assetRoot}/models/games/tower-defense/character/normal.glb",
            'characterScale' => 2,
            'sceneScale' => 0.494,
            'healthBarY' => 2.1,
            'animationNames' => ['walk'],
            'removeRootMotion' => true,
        ];
        $definition['enemyIntel'] ??= [
            'name' => 'Hắc binh',
            'avatarUrl' => "{$assetRoot}/images/games/tower-defense/military/dark/normal.png",
            'summary' => 'Lính tiền tuyến cân bằng.',
            'resistance' => 'Không',
            'weakness' => 'Không',
        ];
        $definition['bossCombatProfileKey'] ??= 'normal';
        $definition['enemyDefinition'] ??= ['id' => 'dark-soldier'];
        $definition['bossDefinition'] ??= [
            'id' => $id === 'lava-fortress' ? 'lava-overlord' : 'dark-commander',
        ];
        $definition['enemyDefinitionIds'] ??= ['dark-soldier'];
        $definition['bossDefinitionIds'] ??= [
            $id === 'lava-fortress' ? 'lava-overlord' : 'dark-commander',
        ];
        $definition['bossIntel'] ??= $id === 'lava-fortress'
            ? [
                'name' => 'Chúa tể Dung nham',
                'avatarUrl' => "{$assetRoot}/images/games/tower-defense/military/dark/lava/boss.png",
                'summary' => 'Boss dung nham sở hữu lớp giáp hấp thụ nhiệt cực mạnh.',
                'resistance' => 'Miễn nhiễm thiêu đốt · giảm 90% sát thương lửa',
                'weakness' => 'Nhận thêm 25% sát thương nước',
            ]
            : [
                'name' => 'Thủ lĩnh Hắc quân',
                'avatarUrl' => "{$assetRoot}/images/games/tower-defense/military/dark/lava/boss.png",
                'summary' => 'Kẻ địch tinh nhuệ có lượng máu cao.',
                'resistance' => 'Không',
                'weakness' => 'Không',
            ];

        return $definition;
    }
}
