<?php

namespace Tests\Feature;

use App\Models\TowerDefenseAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTowerDefenseEnemyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_update_an_enemy_profile(): void
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
        TowerDefenseAsset::create([
            'key' => 'models/sword.gltf',
            'type' => 'model',
            'purpose' => 'equipment-model',
            'path' => 'models/sword.gltf',
            'size' => 10,
            'is_active' => true,
        ]);

        $payload = [
            'id' => 'test-enemy',
            'name' => 'Test Enemy',
            'kind' => 'normal',
            'model_asset_key' => 'models/enemy.glb',
            'avatar_asset_key' => null,
            'left_weapon_asset_key' => null,
            'right_weapon_asset_key' => 'models/sword.gltf',
            'base_health' => 150,
            'base_speed' => 1.2,
            'reward' => 12,
            'castle_damage' => 1,
            'summary' => 'Test profile',
            'resistance' => 'Không',
            'weakness' => 'Nước',
            'model_configuration' => [
                'characterScale' => 2,
                'sceneScale' => 0.5,
                'healthBarY' => 2,
                'animationNames' => ['Walk'],
                'removeRootMotion' => true,
                'rightWeaponTransform' => [
                    'position' => [0.1, -0.2, 0.3],
                    'rotation' => [0, 1.57, 0],
                    'scale' => 0.8,
                ],
            ],
            'combat_profile' => [
                'damageMultipliers' => ['water' => 1.25],
                'effectDurationMultipliers' => [],
            ],
            'is_active' => true,
        ];

        $this->postJson('/api/admin/tower-defense/enemies', $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', 'test-enemy')
            ->assertJsonPath('data.right_weapon_asset_key', 'models/sword.gltf')
            ->assertJsonPath('data.model_configuration.rightWeaponTransform.position.0', 0.1)
            ->assertJsonPath('data.model_configuration.rightWeaponTransform.scale', 0.8)
            ->assertJsonPath('data.combat_profile.damageMultipliers.water', 1.25);

        $this->putJson('/api/admin/tower-defense/enemies/test-enemy', [
            ...$payload,
            'base_health' => 250,
        ])->assertOk()->assertJsonPath('data.base_health', 250);

        $this->assertDatabaseHas('tower_defense_enemies', [
            'id' => 'test-enemy',
            'base_health' => 250,
        ]);
    }

    public function test_enemy_model_must_match_the_selected_kind(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        TowerDefenseAsset::create([
            'key' => 'models/boss.glb',
            'type' => 'model',
            'purpose' => 'boss-model',
            'path' => 'models/boss.glb',
            'size' => 10,
            'is_active' => true,
        ]);

        $this->postJson('/api/admin/tower-defense/enemies', [
            'id' => 'wrong-model',
            'name' => 'Wrong model',
            'kind' => 'normal',
            'model_asset_key' => 'models/boss.glb',
            'base_health' => 100,
            'base_speed' => 1,
            'reward' => 10,
            'castle_damage' => 1,
            'model_configuration' => [
                'characterScale' => 1,
                'sceneScale' => 1,
                'healthBarY' => 1,
                'animationNames' => [],
            ],
            'combat_profile' => [
                'damageMultipliers' => [],
                'effectDurationMultipliers' => [],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('model_asset_key');
    }
}
