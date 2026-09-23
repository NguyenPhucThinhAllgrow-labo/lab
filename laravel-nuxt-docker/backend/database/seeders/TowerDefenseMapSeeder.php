<?php

namespace Database\Seeders;

use App\Models\TowerDefenseMap;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class TowerDefenseMapSeeder extends Seeder
{
    public function run(): void
    {
        $maps = json_decode(
            File::get(database_path('data/tower-defense-maps.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($maps as $index => $definition) {
            $id = $definition['id'];
            $name = $definition['name'];
            unset($definition['id'], $definition['name']);

            TowerDefenseMap::query()->updateOrCreate(
                ['id' => $id],
                [
                    'name' => $name,
                    'configuration' => $definition,
                    'sort_order' => $index,
                    'is_active' => true,
                ],
            );
        }
    }
}
