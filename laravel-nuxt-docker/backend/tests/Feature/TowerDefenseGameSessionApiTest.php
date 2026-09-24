<?php

namespace Tests\Feature;

use App\Models\TowerDefenseGameSession;
use App\Models\TowerDefenseMap;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TowerDefenseGameSessionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_read_or_write_game_sessions(): void
    {
        $map = $this->createMap();

        $this->getJson("/api/tower-defense/maps/{$map->id}/session")->assertUnauthorized();
        $this->putJson("/api/tower-defense/maps/{$map->id}/session", [])->assertUnauthorized();
        $this->getJson('/api/tower-defense/history')->assertUnauthorized();
    }

    public function test_player_can_save_update_and_restore_one_active_session(): void
    {
        $map = $this->createMap();
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->putJson("/api/tower-defense/maps/{$map->id}/session", [
            'faction' => 'human',
            'snapshot' => $this->snapshot($map->id, wave: 4, score: 800),
        ])->assertOk()->assertJsonPath('data.status', 'active');

        $this->putJson("/api/tower-defense/maps/{$map->id}/session", [
            'faction' => 'human',
            'snapshot' => $this->snapshot($map->id, wave: 5, score: 1200),
        ])->assertOk()->assertJsonPath('data.currentWave', 5);

        $this->assertDatabaseCount('tower_defense_game_sessions', 1);
        $this->getJson("/api/tower-defense/maps/{$map->id}/session")
            ->assertOk()
            ->assertJsonPath('data.faction', 'human')
            ->assertJsonPath('data.snapshot.wave', 5)
            ->assertJsonPath('data.snapshot.credits', 2500)
            ->assertJsonPath('data.snapshot.pendingEnemies', 7)
            ->assertJsonPath('data.snapshot.towers.0.kind', 'frost');
    }

    public function test_finished_session_moves_to_history_and_replay_creates_new_active_session(): void
    {
        $map = $this->createMap();
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->putJson("/api/tower-defense/maps/{$map->id}/session", [
            'faction' => 'dark',
            'snapshot' => $this->snapshot($map->id, wave: 20, score: 9000, phase: 'completed'),
        ])->assertOk()->assertJsonPath('data.status', 'completed');

        $this->getJson("/api/tower-defense/maps/{$map->id}/session")
            ->assertOk()->assertJsonPath('data', null);
        $this->getJson('/api/tower-defense/history')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mapName', 'Session map')
            ->assertJsonPath('data.0.currentWave', 20)
            ->assertJsonMissingPath('data.0.snapshot');

        $this->putJson("/api/tower-defense/maps/{$map->id}/session", [
            'faction' => 'dark',
            'snapshot' => $this->snapshot($map->id),
        ])->assertOk()->assertJsonPath('data.status', 'active');

        $this->assertDatabaseCount('tower_defense_game_sessions', 2);
        $this->assertSame(1, TowerDefenseGameSession::where('status', 'completed')->count());
        $this->assertSame(1, TowerDefenseGameSession::where('status', 'active')->count());
    }

    private function createMap(): TowerDefenseMap
    {
        return TowerDefenseMap::create([
            'id' => 'session-map',
            'name' => 'Session map',
            'configuration' => ['columns' => 18, 'rows' => 14],
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }

    private function snapshot(
        string $mapId,
        int $wave = 0,
        int $score = 0,
        string $phase = 'ready',
    ): array {
        return [
            'version' => 1,
            'mapId' => $mapId,
            'phase' => $phase,
            'wave' => $wave,
            'score' => $score,
            'castleHealth' => 20,
            'credits' => 2500,
            'pendingEnemies' => 7,
            'speedMultiplier' => 2,
            'towers' => [['id' => 1, 'kind' => 'frost', 'x' => 2, 'y' => 3, 'level' => 1]],
            'enemies' => [],
            'projectiles' => [],
            'impacts' => [],
        ];
    }
}
