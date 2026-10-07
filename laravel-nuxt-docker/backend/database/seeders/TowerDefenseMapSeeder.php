<?php

namespace Database\Seeders;

use App\Models\TowerDefenseMap;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class TowerDefenseMapSeeder extends Seeder
{
    public function run(): void
    {
        // Snapshot of current DB configuration; do not recalculate CMS settings.
        $definitions = json_decode(
            File::get(database_path('data/tower-defense-maps.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        DB::transaction(function () use ($definitions): void {
            // Preserve the existing map seeder's authoritative snapshot behavior.
            $ids = array_column($definitions, 'id');
            if ($ids === []) {
                TowerDefenseMap::query()->delete();

                return;
            }
            TowerDefenseMap::query()->whereNotIn('id', $ids)->delete();

            foreach ($definitions as $definition) {
                $id = $definition['id'];
                unset($definition['id']);

                TowerDefenseMap::query()->updateOrCreate(['id' => $id], $definition);
            }
        });
    }
}
