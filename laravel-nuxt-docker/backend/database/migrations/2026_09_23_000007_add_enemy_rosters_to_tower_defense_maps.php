<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tower_defense_maps')->orderBy('id')->each(function (object $map): void {
            $configuration = json_decode($map->configuration, true, flags: JSON_THROW_ON_ERROR);
            $enemyId = $configuration['enemyDefinition']['id'] ?? 'dark-soldier';
            $bossId = $configuration['bossDefinition']['id'] ?? ($map->id === 'lava-fortress' ? 'lava-overlord' : 'dark-commander');
            $configuration['enemyDefinitionIds'] = [$enemyId];
            $configuration['bossDefinitionIds'] = [$bossId];
            $this->updateMap($map->id, $configuration);
        });
    }

    public function down(): void
    {
        DB::table('tower_defense_maps')->orderBy('id')->each(function (object $map): void {
            $configuration = json_decode($map->configuration, true, flags: JSON_THROW_ON_ERROR);
            unset($configuration['enemyDefinitionIds'], $configuration['bossDefinitionIds']);
            $this->updateMap($map->id, $configuration);
        });
    }

    private function updateMap(string $id, array $configuration): void
    {
        DB::table('tower_defense_maps')->where('id', $id)->update([
            'configuration' => json_encode(
                $configuration,
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            ),
            'updated_at' => now(),
        ]);
    }
};
