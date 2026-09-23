<?php

namespace Tests\Feature;

use App\Models\TowerDefenseAsset;
use App\Models\TowerDefenseEnemy;
use App\Models\TowerDefenseMap;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TowerDefenseContentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_only_active_maps_as_game_definitions(): void
    {
        TowerDefenseMap::create([
            'id' => 'test-map',
            'name' => 'Test map',
            'configuration' => ['columns' => 18, 'rows' => 14],
            'sort_order' => 1,
            'is_active' => true,
        ]);
        TowerDefenseMap::create([
            'id' => 'hidden-map',
            'name' => 'Hidden map',
            'configuration' => ['columns' => 18, 'rows' => 14],
            'sort_order' => 0,
            'is_active' => false,
        ]);

        $this->getJson('/api/tower-defense/maps')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', 'test-map')
            ->assertJsonPath('data.0.columns', 18)
            ->assertJsonPath('data.0.startingCredits', 3000);
    }

    public function test_it_streams_an_active_asset_from_backend_storage(): void
    {
        Storage::fake('tower-defense');
        $key = 'sounds/fire/test.mp3';
        Storage::disk('tower-defense')->put($key, 'audio-content');
        TowerDefenseAsset::create([
            'key' => $key,
            'type' => 'sound',
            'purpose' => 'tower-sfx',
            'path' => $key,
            'mime_type' => 'audio/mpeg',
            'size' => 13,
            'is_active' => true,
        ]);

        $this->get('/api/tower-defense/assets/'.$key)
            ->assertOk()
            ->assertHeader('content-type', 'audio/mpeg');
    }

    public function test_asset_index_exposes_the_asset_purpose(): void
    {
        TowerDefenseAsset::create([
            'key' => 'models/games/tower-defense/character/test.glb',
            'type' => 'model',
            'purpose' => 'enemy-model',
            'path' => 'models/games/tower-defense/character/test.glb',
            'mime_type' => 'model/gltf-binary',
            'size' => 10,
            'is_active' => true,
        ]);

        $this->getJson('/api/tower-defense/assets')
            ->assertOk()
            ->assertJsonPath('data.0.purpose', 'enemy-model');
    }

    public function test_map_definition_hydrates_the_latest_managed_enemy_profile(): void
    {
        TowerDefenseEnemy::create([
            'id' => 'managed-enemy',
            'name' => 'Managed Enemy',
            'kind' => 'normal',
            'model_asset_key' => 'models/enemy.glb',
            'avatar_asset_key' => 'images/enemy.png',
            'left_weapon_asset_key' => null,
            'right_weapon_asset_key' => 'models/sword.gltf',
            'base_health' => 175,
            'base_speed' => 1.15,
            'reward' => 20,
            'castle_damage' => 2,
            'summary' => 'Managed centrally',
            'resistance' => 'Lửa',
            'weakness' => 'Nước',
            'model_configuration' => [
                'characterScale' => 2,
                'sceneScale' => 0.5,
                'healthBarY' => 2,
                'animationNames' => ['Walk'],
            ],
            'combat_profile' => [
                'damageMultipliers' => ['water' => 1.25],
                'effectDurationMultipliers' => [],
            ],
            'is_active' => true,
        ]);
        TowerDefenseEnemy::create([
            'id' => 'managed-enemy-two',
            'name' => 'Managed Enemy Two',
            'kind' => 'normal',
            'model_asset_key' => 'models/enemy-two.glb',
            'base_health' => 225,
            'base_speed' => 0.9,
            'reward' => 30,
            'castle_damage' => 2,
            'model_configuration' => [
                'characterScale' => 1,
                'sceneScale' => 1,
                'healthBarY' => 2,
                'animationNames' => ['Walk'],
            ],
            'combat_profile' => [
                'damageMultipliers' => [],
                'effectDurationMultipliers' => [],
            ],
            'is_active' => true,
        ]);
        TowerDefenseMap::create([
            'id' => 'managed-map',
            'name' => 'Managed Map',
            'configuration' => [
                'columns' => 18,
                'rows' => 14,
                'enemyDefinition' => ['id' => 'managed-enemy'],
                'enemyDefinitionIds' => ['managed-enemy', 'managed-enemy-two'],
            ],
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->getJson('/api/tower-defense/maps/managed-map')
            ->assertOk()
            ->assertJsonPath('data.enemyDefinition.baseHealth', 175)
            ->assertJsonCount(2, 'data.enemyDefinitions')
            ->assertJsonPath('data.enemyDefinitions.1.id', 'managed-enemy-two')
            ->assertJsonPath('data.enemyIntel.name', 'Managed Enemy')
            ->assertJsonPath('data.enemyModel.rightWeaponUrl', '/api/tower-defense/assets/models/sword.gltf')
            ->assertJsonPath('data.enemyModel.url', '/api/tower-defense/assets/models/enemy.glb');
    }
}
