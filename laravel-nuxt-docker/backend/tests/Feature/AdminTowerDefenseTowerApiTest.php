<?php

namespace Tests\Feature;

use App\Models\TowerDefenseAsset;
use App\Models\User;
use Database\Seeders\TowerDefenseTowerSeeder;
use Database\Seeders\TowerDefenseEffectTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTowerDefenseTowerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_the_existing_game_towers(): void
    {
        $this->seed(TowerDefenseTowerSeeder::class);

        $this->assertDatabaseCount('tower_defense_towers', 8);
        $this->assertDatabaseHas('tower_defense_towers', [
            'id' => 'fire',
            'cost' => 150,
            'color' => '#dc2626',
        ]);
        $this->assertSame(
            'models/games/tower-defense/towers/water/human/level3.glb',
            \App\Models\TowerDefenseTower::findOrFail('water')->model_asset_keys['human3'],
        );
    }

    public function test_admin_can_manage_towers(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->seed(TowerDefenseEffectTypeSeeder::class);
        TowerDefenseAsset::create([
            'key' => 'models/towers/fire-level-1.glb',
            'type' => 'model',
            'purpose' => 'tower-model',
            'path' => 'models/towers/fire-level-1.glb',
            'size' => 10,
            'is_active' => true,
        ]);
        TowerDefenseAsset::create([
            'key' => 'images/games/tower-defense/towers/fire.png',
            'type' => 'image',
            'purpose' => 'tower-image',
            'path' => 'images/games/tower-defense/towers/fire.png',
            'size' => 10,
            'is_active' => true,
        ]);

        $payload = [
            'id' => 'fire',
            'name' => 'Tháp lửa',
            'description' => 'Gây sát thương thiêu đốt.',
            'role' => 'damage',
            'cost' => 150,
            'damage' => 10,
            'damage_by_level' => ['1' => 10, '2' => 18, '3' => 30],
            'max_level' => 3,
            'level_stats' => [
                '1' => ['damage' => 10, 'range' => 2.7, 'fireRate' => 1.1, 'upgradeCost' => 150],
                '2' => ['damage' => 18, 'range' => 3, 'fireRate' => 0.9, 'upgradeCost' => 115],
                '3' => ['damage' => 30, 'range' => 3.4, 'fireRate' => 0.7, 'upgradeCost' => 165],
            ],
            'range' => 2.7,
            'fire_rate' => 1.1,
            'color' => '#dc2626',
            'image_asset_key' => 'images/games/tower-defense/towers/fire.png',
            'effects' => [
                'burnDuration' => 4,
                'burnDamagePerSecond' => 4,
                'items' => [[
                    'id' => 'fire-burn',
                    'type' => 'damage-over-time',
                    'behavior' => 'damage_over_time',
                    'name' => 'Thiêu đốt',
                    'value' => 4,
                    'duration' => 4,
                    'perLevel' => 2,
                    'color' => '#ef4444',
                ]],
            ],
            'model_asset_keys' => ['dark1' => 'models/towers/fire-level-1.glb'],
            'model_configuration' => ['targetHeight' => 2.1, 'targetHeightByLevel' => ['1' => 2.1, '2' => 2.1, '3' => 2.1]],
            'sort_order' => 3,
            'is_active' => true,
        ];

        $this->postJson('/api/admin/tower-defense/towers', $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', 'fire')
            ->assertJsonPath('data.damage_by_level.3', 30)
            ->assertJsonPath('data.level_stats.2.range', 3)
            ->assertJsonPath('data.effects.burnDuration', 4)
            ->assertJsonPath('data.effects.items.0.type', 'damage-over-time')
            ->assertJsonPath('data.image_asset_key', 'images/games/tower-defense/towers/fire.png')
            ->assertJsonPath('data.model_asset_keys.dark1', 'models/towers/fire-level-1.glb');

        $this->putJson('/api/admin/tower-defense/towers/fire', [
            ...$payload,
            'cost' => 175,
            'max_level' => 5,
            'damage_by_level' => ['1' => 10, '2' => 18, '3' => 30, '4' => 45, '5' => 65],
            'level_stats' => [
                '1' => ['damage' => 10, 'range' => 2.7, 'fireRate' => 1.1, 'upgradeCost' => 175],
                '2' => ['damage' => 18, 'range' => 3, 'fireRate' => 0.9, 'upgradeCost' => 115],
                '3' => ['damage' => 30, 'range' => 3.4, 'fireRate' => 0.7, 'upgradeCost' => 165],
                '4' => ['damage' => 45, 'range' => 3.8, 'fireRate' => 0.6, 'upgradeCost' => 220],
                '5' => ['damage' => 65, 'range' => 4.2, 'fireRate' => 0.5, 'upgradeCost' => 275],
            ],
            'model_configuration' => ['targetHeight' => 2.1, 'targetHeightByLevel' => ['1' => 2.1, '2' => 2.2, '3' => 2.3, '4' => 2.4, '5' => 2.5]],
        ])
            ->assertOk()
            ->assertJsonPath('data.cost', 175)
            ->assertJsonPath('data.max_level', 5)
            ->assertJsonPath('data.damage_by_level.5', 65)
            ->assertJsonPath('data.level_stats.5.upgradeCost', 275)
            ->assertJsonPath('data.model_configuration.targetHeightByLevel.5', 2.5);

        $this->getJson('/api/admin/tower-defense/towers')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 20)
            ->assertJsonPath('total', 1);

        $this->getJson('/api/tower-defense/towers')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'fire')
            ->assertJsonPath('data.0.model_asset_keys.dark1', 'models/towers/fire-level-1.glb');

        $this->putJson('/api/admin/tower-defense/towers/fire', [...$payload, 'is_active' => false])
            ->assertOk();
        $this->getJson('/api/tower-defense/towers')->assertOk()->assertJsonCount(0, 'data');

        $this->deleteJson('/api/admin/tower-defense/towers/fire')->assertOk();
        $this->assertDatabaseMissing('tower_defense_towers', ['id' => 'fire']);
    }

    public function test_tower_rejects_an_asset_with_the_wrong_purpose(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        TowerDefenseAsset::create([
            'key' => 'models/enemy.glb',
            'type' => 'model',
            'purpose' => 'enemy-model',
            'path' => 'models/enemy.glb',
            'size' => 10,
            'is_active' => true,
        ]);

        $this->postJson('/api/admin/tower-defense/towers', [
            'id' => 'frost', 'name' => 'Invalid', 'role' => 'damage', 'cost' => 10, 'damage' => 1,
            'damage_by_level' => ['1' => 1, '2' => 2, '3' => 3],
            'max_level' => 3,
            'level_stats' => [
                '1' => ['damage' => 1, 'range' => 1, 'fireRate' => 1, 'upgradeCost' => 10],
                '2' => ['damage' => 2, 'range' => 1, 'fireRate' => 1, 'upgradeCost' => 10],
                '3' => ['damage' => 3, 'range' => 1, 'fireRate' => 1, 'upgradeCost' => 10],
            ],
            'range' => 1, 'fire_rate' => 1, 'color' => '#ffffff', 'effects' => [],
            'model_asset_keys' => ['dark1' => 'models/enemy.glb'],
            'model_configuration' => ['targetHeight' => 2, 'targetHeightByLevel' => ['1' => 2, '2' => 2, '3' => 2]],
        ])->assertUnprocessable()->assertJsonValidationErrors('model_asset_keys');
    }
}
