<?php

namespace Tests\Feature;

use App\Models\TowerDefenseEnemy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTowerDefenseMapApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_assign_multiple_normal_enemies_and_bosses_to_a_map(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createEnemy('normal-one', 'normal');
        $this->createEnemy('normal-two', 'normal');
        $this->createEnemy('boss-one', 'boss');
        $this->createEnemy('boss-two', 'boss');
        $configuration = $this->configuration(
            ['normal-one', 'normal-two'],
            ['boss-one', 'boss-two'],
        );
        $configuration['bossOnly'] = true;
        $configuration['environmentMode'] = 'dark';

        $this->postJson('/api/admin/tower-defense/maps', [
            'id' => 'multi-roster-map',
            'name' => 'Multi roster map',
            'configuration' => $configuration,
            'sort_order' => 0,
            'is_active' => true,
        ])->assertCreated();

        $this->postJson('/api/admin/tower-defense/maps', [
            'id' => 'auto-order-map',
            'name' => 'Auto order map',
            'configuration' => $configuration,
            // Backend phải bỏ qua thứ tự client gửi khi tạo mới.
            'sort_order' => 0,
            'is_active' => true,
        ])->assertCreated()->assertJsonPath('data.sort_order', 1);

        $this->assertDatabaseHas('tower_defense_maps', ['id' => 'multi-roster-map']);
        $this->assertDatabaseHas('tower_defense_maps', [
            'id' => 'auto-order-map',
            'sort_order' => 1,
        ]);
        $configuration = json_decode(
            (string) $this->getConnection()
                ->table('tower_defense_maps')
                ->where('id', 'multi-roster-map')
                ->value('configuration'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        $this->assertSame(['normal-one', 'normal-two'], $configuration['enemyDefinitionIds']);
        $this->assertSame(['boss-one', 'boss-two'], $configuration['bossDefinitionIds']);
        $this->assertSame(2500, $configuration['startingCredits']);
        $this->assertTrue($configuration['bossOnly']);
        $this->assertSame('dark', $configuration['environmentMode']);
    }

    public function test_map_rosters_reject_duplicates_and_profiles_of_the_wrong_kind(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createEnemy('normal-one', 'normal');
        $this->createEnemy('boss-one', 'boss');

        $this->postJson('/api/admin/tower-defense/maps', [
            'id' => 'invalid-roster-map',
            'name' => 'Invalid roster map',
            'configuration' => $this->configuration(
                ['normal-one', 'normal-one'],
                ['normal-one'],
            ),
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'configuration.enemyDefinitionIds.1',
            'configuration.bossDefinitionIds.0',
        ]);
    }

    public function test_admin_can_place_spawn_portals_and_castle_anywhere_on_the_map(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createEnemy('normal-one', 'normal');
        $this->createEnemy('boss-one', 'boss');
        $configuration = $this->configuration(['normal-one'], ['boss-one']);
        $configuration['spawnPoints'] = [
            ['x' => 2, 'y' => 3],
            ['x' => 3, 'y' => 2],
        ];
        $configuration['paths'] = [
            [['x' => 2, 'y' => 2], ['x' => 1, 'y' => 2]],
            [['x' => 3, 'y' => 1], ['x' => 2, 'y' => 1]],
        ];
        $configuration['castle']['position'] = ['x' => 0, 'y' => 3];

        $this->postJson('/api/admin/tower-defense/maps', [
            'id' => 'custom-structures-map',
            'name' => 'Custom structures map',
            'configuration' => $configuration,
        ])->assertCreated();

        $stored = json_decode(
            (string) $this->getConnection()->table('tower_defense_maps')
                ->where('id', 'custom-structures-map')
                ->value('configuration'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        $this->assertSame($configuration['spawnPoints'], $stored['spawnPoints']);
        $this->assertSame($configuration['castle']['position'], $stored['castle']['position']);
    }

    public function test_imported_citadel_configuration_survives_create_update_and_public_load(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createEnemy('normal-one', 'normal');
        $this->createEnemy('boss-one', 'boss');
        $preset = json_decode(file_get_contents(base_path('tests/Fixtures/citadel-map.json')), true, flags: JSON_THROW_ON_ERROR);
        $configuration = $preset['configuration'];
        $configuration['enemyDefinitionIds'] = ['normal-one'];
        $configuration['bossDefinitionIds'] = ['boss-one'];
        // A custom pad directly on a bridge lane must not disappear on save.
        $configuration['buildableTiles'][] = ['x' => 35, 'y' => 29];

        $this->postJson('/api/admin/tower-defense/maps', [
            'id' => 'saved-citadel', 'name' => 'Saved citadel',
            'configuration' => $configuration, 'is_active' => true,
        ])->assertCreated();
        $this->assertDatabaseHas('tower_defense_maps', ['id' => 'saved-citadel']);

        $first = $this->getJson('/api/tower-defense/maps/saved-citadel')->assertOk();
        $first->assertJsonPath('data.scenePreset', 'citadel-of-cinders')
            ->assertJsonPath('data.sceneSettings', $configuration['sceneSettings'])
            ->assertJsonPath('data.buildableTiles', $configuration['buildableTiles'])
            ->assertJsonPath('data.paths', $configuration['paths'])
            ->assertJsonPath('data.castle.position', $configuration['castle']['position']);
        $version = $first->json('data.configurationVersion');

        $configuration['buildableTiles'] = [['x' => 40, 'y' => 30]];
        $configuration['sceneSettings']['camera']['zoom'] = 0.85;
        $this->putJson('/api/admin/tower-defense/maps/saved-citadel', [
            'name' => 'Updated citadel', 'configuration' => $configuration, 'is_active' => true,
        ])->assertOk();
        $updated = $this->getJson('/api/tower-defense/maps')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.buildableTiles', $configuration['buildableTiles'])
            ->assertJsonPath('data.0.sceneSettings', $configuration['sceneSettings']);
        $this->assertNotSame($version, $updated->json('data.0.configurationVersion'));

        // Publishing is controlled by the existing active flag.
        $this->putJson('/api/admin/tower-defense/maps/saved-citadel', [
            'name' => 'Hidden citadel', 'configuration' => $configuration, 'is_active' => false,
        ])->assertOk();
        $this->getJson('/api/tower-defense/maps')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/tower-defense/maps/saved-citadel')->assertNotFound();
    }

    public function test_citadel_still_rejects_pads_on_spawn_or_castle(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createEnemy('normal-one', 'normal');
        $this->createEnemy('boss-one', 'boss');
        $configuration = json_decode(file_get_contents(base_path('tests/Fixtures/citadel-map.json')), true, flags: JSON_THROW_ON_ERROR)['configuration'];
        $configuration['enemyDefinitionIds'] = ['normal-one'];
        $configuration['bossDefinitionIds'] = ['boss-one'];
        foreach ([$configuration['spawnPoints'][0], $configuration['castle']['position']] as $point) {
            $configuration['buildableTiles'] = [$point];
            $this->postJson('/api/admin/tower-defense/maps', [
                'id' => 'invalid-citadel', 'name' => 'Invalid', 'configuration' => $configuration,
            ])->assertUnprocessable()->assertJsonValidationErrors(['configuration.buildableTiles.0']);
        }
    }

    private function createEnemy(string $id, string $kind): void
    {
        TowerDefenseEnemy::create([
            'id' => $id,
            'name' => $id,
            'kind' => $kind,
            'base_health' => 100,
            'base_speed' => 1,
            'reward' => 10,
            'castle_damage' => $kind === 'boss' ? 5 : 1,
            'model_configuration' => [],
            'combat_profile' => [],
            'is_active' => true,
        ]);
    }

    private function configuration(array $enemyIds, array $bossIds): array
    {
        return [
            'columns' => 4,
            'rows' => 4,
            'maxTowerCount' => 4,
            'startingCredits' => 2500,
            'cellSize' => 1.5,
            'paths' => [
                [['x' => 0, 'y' => 0], ['x' => 1, 'y' => 0]],
                [['x' => 0, 'y' => 1], ['x' => 1, 'y' => 1], ['x' => 1, 'y' => 0]],
            ],
            'pathTiles' => [['x' => 0, 'y' => 0]],
            'cornerRadius' => 0.3,
            'enemyDefinitionIds' => $enemyIds,
            'bossDefinitionIds' => $bossIds,
            'castle' => ['modelUrl' => '/castle.glb'],
            'camera' => ['zoom' => 1],
            'theme' => ['background' => 0],
            'scenery' => ['trees' => []],
        ];
    }
}
