<?php

namespace Tests\Feature;

use App\Models\TowerDefenseAsset;
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
            ->assertJsonPath('data.0.columns', 18);
    }

    public function test_it_streams_an_active_asset_from_backend_storage(): void
    {
        Storage::fake('tower-defense');
        $key = 'sounds/fire/test.mp3';
        Storage::disk('tower-defense')->put($key, 'audio-content');
        TowerDefenseAsset::create([
            'key' => $key,
            'type' => 'sound',
            'path' => $key,
            'mime_type' => 'audio/mpeg',
            'size' => 13,
            'is_active' => true,
        ]);

        $this->get('/api/tower-defense/assets/'.$key)
            ->assertOk()
            ->assertHeader('content-type', 'audio/mpeg');
    }
}
