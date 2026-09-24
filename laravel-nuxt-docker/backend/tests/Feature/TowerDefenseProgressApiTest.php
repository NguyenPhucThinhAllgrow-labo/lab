<?php

namespace Tests\Feature;

use App\Models\TowerDefenseMap;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TowerDefenseProgressApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_maps_unlock_sequentially_after_completing_wave_twenty(): void
    {
        $first = $this->createMap('first-map', 'Map 1', 1);
        $second = $this->createMap('second-map', 'Map 2', 2);
        $this->createMap('third-map', 'Map 3', 3);

        $this->getJson('/api/tower-defense/maps')
            ->assertOk()
            ->assertJsonPath('data.0.isUnlocked', true)
            ->assertJsonPath('data.1.isUnlocked', false)
            ->assertJsonPath('data.2.isUnlocked', false)
            ->assertJsonPath('completionWave', 20);

        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->postJson("/api/tower-defense/maps/{$second->id}/progress", ['wave' => 20])
            ->assertForbidden();

        $this->postJson("/api/tower-defense/maps/{$first->id}/progress", ['wave' => 19])
            ->assertOk()
            ->assertJsonPath('data.completed', false)
            ->assertJsonPath('data.unlockedMap', null);

        $this->getJson('/api/tower-defense/maps')
            ->assertJsonPath('data.1.isUnlocked', false);

        $this->postJson("/api/tower-defense/maps/{$first->id}/progress", ['wave' => 20])
            ->assertOk()
            ->assertJsonPath('data.completed', true)
            ->assertJsonPath('data.maxWave', 20)
            ->assertJsonPath('data.unlockedMap.id', 'second-map');

        $this->getJson('/api/tower-defense/maps')
            ->assertOk()
            ->assertJsonPath('data.0.completed', true)
            ->assertJsonPath('data.1.isUnlocked', true)
            ->assertJsonPath('data.2.isUnlocked', false);
    }

    private function createMap(string $id, string $name, int $sortOrder): TowerDefenseMap
    {
        return TowerDefenseMap::create([
            'id' => $id,
            'name' => $name,
            'configuration' => ['columns' => 18, 'rows' => 14],
            'sort_order' => $sortOrder,
            'is_active' => true,
        ]);
    }
}
