<?php

namespace Database\Seeders;

use App\Models\DetectiveCase;
use Illuminate\Database\Seeder;
use JsonException;
use RuntimeException;

class DetectiveCaseSeeder extends Seeder
{
    /** @throws JsonException */
    public function run(): void
    {
        $dataFile = database_path('data/detective-cases.json');
        $contents = file_get_contents($dataFile);

        if ($contents === false) {
            throw new RuntimeException("Unable to read {$dataFile}");
        }

        $scenarios = json_decode(
            $contents,
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($scenarios as $index => $scenario) {
            DetectiveCase::query()->updateOrCreate(
                ['id' => $scenario['id']],
                [
                    'title' => $scenario['title'],
                    'description' => $scenario['description'],
                    'scenario' => $scenario,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ],
            );
        }
    }
}
