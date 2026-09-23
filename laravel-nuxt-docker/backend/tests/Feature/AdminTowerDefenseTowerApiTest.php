<?php

namespace Tests\Feature;

use App\Models\TowerDefenseAsset;
use App\Models\User;
use Database\Seeders\TowerDefenseTowerSeeder;
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
        TowerDefenseAsset::create([
            'key' => 'models/towers/fire-level-1.glb',
            'type' => 'model',
            'purpose' => 'tower-model',
            'path' => 'models/towers/fire-level-1.glb',
            'size' => 10,
            'is_active' => true,
        ]);

        $payload = [
            'id' => 'fire',
            'name' => 'Tháp lửa',
            'description' => 'Gây sát thương thiêu đốt.',
            'cost' => 150,
            'damage' => 10,
            'range' => 2.7,
            'fire_rate' => 1.1,
            'color' => '#dc2626',
            'effects' => ['burnDuration' => 4, 'burnDamagePerSecond' => 4],
            'model_asset_keys' => ['dark1' => 'models/towers/fire-level-1.glb'],
            'model_configuration' => ['targetHeight' => 2.1],
            'sort_order' => 3,
            'is_active' => true,
        ];

        $this->postJson('/api/admin/tower-defense/towers', $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', 'fire')
            ->assertJsonPath('data.effects.burnDuration', 4)
            ->assertJsonPath('data.model_asset_keys.dark1', 'models/towers/fire-level-1.glb');

        $this->putJson('/api/admin/tower-defense/towers/fire', [...$payload, 'cost' => 175])
            ->assertOk()
            ->assertJsonPath('data.cost', 175);

        $this->getJson('/api/admin/tower-defense/towers')
            ->assertOk()
            ->assertJsonCount(1, 'data');

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
            'id' => 'frost', 'name' => 'Invalid', 'cost' => 10, 'damage' => 1,
            'range' => 1, 'fire_rate' => 1, 'color' => '#ffffff', 'effects' => [],
            'model_asset_keys' => ['dark1' => 'models/enemy.glb'],
            'model_configuration' => ['targetHeight' => 2],
        ])->assertUnprocessable()->assertJsonValidationErrors('model_asset_keys');
    }
}
