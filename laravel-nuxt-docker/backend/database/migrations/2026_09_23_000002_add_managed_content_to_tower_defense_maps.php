<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tower_defense_maps')
            ->orderBy('id')
            ->each(function (object $map): void {
                $configuration = json_decode(
                    $map->configuration,
                    true,
                    flags: JSON_THROW_ON_ERROR,
                );
                $assetRoot = '/api/tower-defense/assets';
                $configuration['backgroundMusicUrl'] ??=
                    "{$assetRoot}/sounds/background/default.mp3";
                $configuration['enemyModel'] ??= [
                    'url' => "{$assetRoot}/models/games/tower-defense/character/normal.glb",
                    'characterScale' => 2,
                    'sceneScale' => 0.494,
                    'healthBarY' => 2.1,
                    'animationNames' => ['walk'],
                    'removeRootMotion' => true,
                ];
                $configuration['enemyIntel'] ??= [
                    'name' => 'Hắc binh',
                    'avatarUrl' => "{$assetRoot}/images/games/tower-defense/military/dark/normal.png",
                    'summary' => 'Lính tiền tuyến cân bằng.',
                    'resistance' => 'Không',
                    'weakness' => 'Không',
                ];
                $configuration['bossCombatProfileKey'] ??= 'normal';
                $configuration['bossIntel'] ??= $map->id === 'lava-fortress'
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

                DB::table('tower_defense_maps')
                    ->where('id', $map->id)
                    ->update([
                        'configuration' => json_encode(
                            $configuration,
                            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                        ),
                        'updated_at' => now(),
                    ]);
            });
    }

    public function down(): void
    {
        DB::table('tower_defense_maps')
            ->orderBy('id')
            ->each(function (object $map): void {
                $configuration = json_decode(
                    $map->configuration,
                    true,
                    flags: JSON_THROW_ON_ERROR,
                );
                unset(
                    $configuration['backgroundMusicUrl'],
                    $configuration['enemyModel'],
                    $configuration['enemyIntel'],
                    $configuration['bossIntel'],
                );

                DB::table('tower_defense_maps')
                    ->where('id', $map->id)
                    ->update([
                        'configuration' => json_encode(
                            $configuration,
                            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                        ),
                        'updated_at' => now(),
                    ]);
            });
    }
};
