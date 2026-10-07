<?php

namespace Tests\Feature;

use App\Models\TowerDefenseMap;
use App\Models\TowerDefenseTower;
use Database\Seeders\TowerDefenseMapSeeder;
use Database\Seeders\TowerDefenseTowerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class TowerDefenseSeedSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeders_restore_complete_database_snapshots_and_are_idempotent(): void
    {
        $towers = json_decode(File::get(database_path('data/tower-defense-towers.json')), true, flags: JSON_THROW_ON_ERROR);
        $maps = json_decode(File::get(database_path('data/tower-defense-maps.json')), true, flags: JSON_THROW_ON_ERROR);

        $this->seed([TowerDefenseTowerSeeder::class, TowerDefenseMapSeeder::class]);
        $this->assertSnapshots($towers, $maps);

        $tower = TowerDefenseTower::findOrFail($towers[0]['id']);
        $tower->update(['name' => 'Changed', 'is_active' => false, 'sort_order' => 99, 'level_stats' => [], 'effects' => [], 'model_configuration' => []]);
        $map = TowerDefenseMap::findOrFail($maps[0]['id']);
        $map->update(['name' => 'Changed', 'configuration' => [], 'is_active' => false, 'sort_order' => 99]);

        $this->seed([TowerDefenseTowerSeeder::class, TowerDefenseMapSeeder::class]);
        $this->assertSnapshots($towers, $maps);
        $this->seed([TowerDefenseTowerSeeder::class, TowerDefenseMapSeeder::class]);
        $this->assertSnapshots($towers, $maps);

        $support = TowerDefenseTower::findOrFail('support');
        $this->assertSame(3.5, $support->range);
        foreach ($support->level_stats as $stat) {
            $this->assertEquals(3.5, $stat['range']);
        }
        foreach ($support->effects['items'] as $effect) {
            $this->assertEquals(3.5, $effect['radius']);
        }
    }

    private function assertSnapshots(array $towers, array $maps): void
    {
        $this->assertDatabaseCount('tower_defense_towers', count($towers));
        $this->assertDatabaseCount('tower_defense_maps', count($maps));
        foreach ($towers as $definition) {
            $record = TowerDefenseTower::findOrFail($definition['id']);
            $this->assertEquals($definition, $record->only($record->getFillable()), "Tower {$definition['id']} must retain every exported field");
        }
        foreach ($maps as $definition) {
            $record = TowerDefenseMap::findOrFail($definition['id']);
            $this->assertEquals($definition, $record->only($record->getFillable()), "Map {$definition['id']} must retain its raw configuration and metadata");
        }
    }
}
