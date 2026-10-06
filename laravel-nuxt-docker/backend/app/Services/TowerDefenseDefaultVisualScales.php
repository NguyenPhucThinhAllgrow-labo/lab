<?php

namespace App\Services;

use App\Models\TowerDefenseEnemy;
use App\Models\TowerDefenseTower;
use Illuminate\Support\Facades\DB;

class TowerDefenseDefaultVisualScales
{
    public const TOWER_HEIGHTS = [
        'archer' => 4, 'cannon' => 4, 'water' => 4, 'support' => 4,
        'frost' => 4.2, 'fire' => 4.2, 'thunder' => 4.2,
    ];

    public const ENEMY_SCALES = [
        'dark-soldier' => 1.2844, 'lava-overlord' => 2.6, 'dark-commander' => 2.73,
    ];

    public static function towerConfiguration(string $id, array $configuration): array
    {
        if (! isset(self::TOWER_HEIGHTS[$id])) {
            return $configuration;
        }
        $height = self::TOWER_HEIGHTS[$id];
        return array_replace($configuration, [
            'targetHeight' => $height,
            'targetHeightByLevel' => [1 => $height, 2 => round($height * 1.13, 4), 3 => round($height * 1.27, 4)],
        ]);
    }

    /** Update only visual fields of the built-in records; safe to run twice. */
    public function apply(): array
    {
        return DB::transaction(function (): array {
            $counts = ['towers' => 0, 'enemies' => 0];
            foreach (TowerDefenseTower::whereIn('id', array_keys(self::TOWER_HEIGHTS))->lockForUpdate()->get() as $tower) {
                $tower->model_configuration = self::towerConfiguration($tower->id, $tower->model_configuration ?? []);
                $tower->save();
                $counts['towers']++;
            }
            foreach (TowerDefenseEnemy::whereIn('id', array_keys(self::ENEMY_SCALES))->lockForUpdate()->get() as $enemy) {
                $enemy->model_configuration = array_replace($enemy->model_configuration ?? [], [
                    'sceneScale' => self::ENEMY_SCALES[$enemy->id],
                ]);
                $enemy->save();
                $counts['enemies']++;
            }
            return $counts;
        });
    }
}
