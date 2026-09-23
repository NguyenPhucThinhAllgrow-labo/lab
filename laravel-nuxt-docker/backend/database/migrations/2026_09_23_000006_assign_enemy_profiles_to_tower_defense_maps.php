<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tower_defense_maps')->orderBy('id')->each(function (object $map): void {
            $configuration = json_decode($map->configuration, true, flags: JSON_THROW_ON_ERROR);
            $configuration['enemyDefinition'] = ['id' => 'dark-soldier'];
            $configuration['bossDefinition'] = [
                'id' => $map->id === 'lava-fortress' ? 'lava-overlord' : 'dark-commander',
            ];

            DB::table('tower_defense_maps')->where('id', $map->id)->update([
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
        DB::table('tower_defense_maps')->orderBy('id')->each(function (object $map): void {
            $configuration = json_decode($map->configuration, true, flags: JSON_THROW_ON_ERROR);
            unset($configuration['enemyDefinition'], $configuration['bossDefinition']);
            DB::table('tower_defense_maps')->where('id', $map->id)->update([
                'configuration' => json_encode(
                    $configuration,
                    JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                ),
                'updated_at' => now(),
            ]);
        });
    }
};
