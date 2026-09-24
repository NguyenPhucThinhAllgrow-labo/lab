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

        $this->postJson('/api/admin/tower-defense/maps', [
            'id' => 'multi-roster-map',
            'name' => 'Multi roster map',
            'configuration' => $this->configuration(
                ['normal-one', 'normal-two'],
                ['boss-one', 'boss-two'],
            ),
            'sort_order' => 0,
            'is_active' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('tower_defense_maps', ['id' => 'multi-roster-map']);
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
