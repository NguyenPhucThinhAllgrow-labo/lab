<?php

namespace Tests\Feature;

use App\Models\TowerDefenseEnemy;
use App\Models\TowerDefenseMap;
use App\Models\TowerDefenseTower;
use App\Services\TowerDefenseDefaultVisualScales;
use Database\Seeders\TowerDefenseEnemySeeder;
use Database\Seeders\TowerDefenseTowerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TowerDefenseVisualScalesTest extends TestCase
{
    use RefreshDatabase;

    public function test_seed_defaults_have_per_level_heights_and_enemy_scene_scales(): void
    {
        $this->seed([TowerDefenseTowerSeeder::class, TowerDefenseEnemySeeder::class]);
        $this->assertSame([1 => 4, 2 => 4.52, 3 => 5.08], TowerDefenseTower::findOrFail('archer')->model_configuration['targetHeightByLevel']);
        $this->assertSame([1 => 4.2, 2 => 4.746, 3 => 5.334], TowerDefenseTower::findOrFail('fire')->model_configuration['targetHeightByLevel']);
        $this->assertSame(1.2844, TowerDefenseEnemy::findOrFail('dark-soldier')->model_configuration['sceneScale']);
    }

    public function test_command_updates_only_default_visual_fields_and_is_idempotent(): void
    {
        $this->seed([TowerDefenseTowerSeeder::class, TowerDefenseEnemySeeder::class]);
        $tower = TowerDefenseTower::findOrFail('fire');
        $tower->model_configuration = ['targetHeight' => 2.1, 'targetHeightByLevel' => [1 => 2.1], 'visualEffects' => [['id' => 'keep-me']]];
        $tower->damage = 123;
        $tower->save();
        $custom = $tower->replicate();
        $custom->id = 'custom-tower';
        $custom->save();

        $enemy = TowerDefenseEnemy::findOrFail('dark-soldier');
        $enemy->model_configuration = array_replace($enemy->model_configuration, ['sceneScale' => 0.494]);
        $enemy->base_speed = 1.7;
        $enemy->save();
        $map = TowerDefenseMap::create(['id' => 'keep-map', 'name' => 'Keep map', 'configuration' => ['columns' => 90, 'rows' => 60], 'is_active' => true]);

        $this->artisan('tower-defense:update-default-visual-scales')->assertSuccessful();
        $tower->refresh();
        $enemy->refresh();
        $this->assertSame(123.0, (float) $tower->damage);
        $this->assertSame([['id' => 'keep-me']], $tower->model_configuration['visualEffects']);
        $this->assertSame(5.334, $tower->model_configuration['targetHeightByLevel'][3]);
        $this->assertSame(1.2844, $enemy->model_configuration['sceneScale']);
        $this->assertSame(1.7, (float) $enemy->base_speed);
        $this->assertSame(2.1, $custom->fresh()->model_configuration['targetHeight']);
        $this->assertSame($map->configuration, $map->fresh()->configuration);

        $first = $tower->model_configuration;
        app(TowerDefenseDefaultVisualScales::class)->apply();
        $this->assertSame($first, $tower->fresh()->model_configuration);
    }
}
