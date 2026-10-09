<?php

namespace Tests\Feature;

use App\Models\TowerDefenseMap;
use Database\Seeders\TowerDefenseCampaignMapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TowerDefenseCampaignMapTest extends TestCase
{
    use RefreshDatabase;

    public function test_campaign_seed_adds_maps_without_overwriting_or_deleting_cms_maps(): void
    {
        $existing = TowerDefenseMap::create(['id' => 'custom-map', 'name' => 'CMS edits', 'configuration' => ['columns' => 44], 'sort_order' => 8, 'is_active' => true]);
        $before = $existing->fresh()->toArray();
        $this->seed(TowerDefenseCampaignMapSeeder::class);
        $this->assertSame($before, $existing->fresh()->toArray());
        $this->assertDatabaseCount('tower_defense_maps', 2);
        foreach (TowerDefenseCampaignMapSeeder::MAP_IDS as $index => $id) {
            $map = TowerDefenseMap::findOrFail($id);
            $this->assertSame($index + 9, $map->sort_order);
            $this->assertSame(4, $map->configuration['story']['chapter']);
            $this->assertCount(2, $map->configuration['paths']);
        }
        $newMap = TowerDefenseMap::findOrFail('moonfrost-lake');
        $newMap->update(['name' => 'Edited in CMS']);
        $this->seed(TowerDefenseCampaignMapSeeder::class);
        $this->assertDatabaseCount('tower_defense_maps', 2);
        $this->assertDatabaseMissing('tower_defense_maps', ['id' => 'oathkeeper-necropolis']);
        $this->assertDatabaseMissing('tower_defense_maps', ['id' => 'last-rift-bastion']);
        $this->assertSame('Edited in CMS', $newMap->fresh()->name);
        $this->getJson('/api/tower-defense/maps')->assertOk()
            ->assertJsonPath('data.1.id', 'moonfrost-lake')
            ->assertJsonPath('data.1.story.chapter', 4);
    }
}
