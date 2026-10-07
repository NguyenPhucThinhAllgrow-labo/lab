<?php

namespace Database\Seeders;

use App\Models\TowerDefenseTower;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class TowerDefenseTowerSeeder extends Seeder
{
    public function run(): void
    {
        // Snapshot of current DB configuration; do not recalculate CMS settings.
        $definitions = json_decode(
            File::get(database_path('data/tower-defense-towers.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        DB::transaction(function () use ($definitions): void {
            foreach ($definitions as $definition) {
                $id = $definition['id'];
                unset($definition['id']);

                TowerDefenseTower::query()->updateOrCreate(['id' => $id], $definition);
            }
        });
    }
}
