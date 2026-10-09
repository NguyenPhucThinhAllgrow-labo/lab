<?php

namespace Database\Seeders;

use App\Models\TowerDefenseMap;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/** Add new campaign maps without restoring snapshots over CMS edits. */
class TowerDefenseCampaignMapSeeder extends Seeder
{
    public const MAP_IDS = ['moonfrost-lake'];

    public function run(): void
    {
        $definitions = json_decode(File::get(database_path('data/tower-defense-maps.json')), true, flags: JSON_THROW_ON_ERROR);
        DB::transaction(function () use ($definitions): void {
            $order = (int) (TowerDefenseMap::query()->max('sort_order') ?? -1);
            foreach ($definitions as $definition) {
                if (! in_array($definition['id'], self::MAP_IDS, true)) {
                    continue;
                }
                $id = $definition['id'];
                if (TowerDefenseMap::query()->whereKey($id)->exists()) {
                    continue;
                }
                unset($definition['id']);
                $definition['sort_order'] = ++$order;
                TowerDefenseMap::query()->firstOrCreate(['id' => $id], $definition);
            }
        });
    }
}
