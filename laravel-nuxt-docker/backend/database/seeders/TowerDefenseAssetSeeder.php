<?php

namespace Database\Seeders;

use App\Models\TowerDefenseAsset;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Mime\MimeTypes;

class TowerDefenseAssetSeeder extends Seeder
{
    public function run(): void
    {
        $disk = Storage::disk('tower-defense');
        $activeKeys = [];

        foreach ($disk->allFiles() as $path) {
            $type = $this->typeFor($path);
            if ($type === null) {
                continue;
            }

            $activeKeys[] = $path;
            TowerDefenseAsset::query()->updateOrCreate(
                ['key' => $path],
                [
                    'type' => $type,
                    'path' => $path,
                    'mime_type' => MimeTypes::getDefault()->guessMimeType($disk->path($path)),
                    'size' => $disk->size($path),
                    'is_active' => true,
                ],
            );
        }

        TowerDefenseAsset::query()
            ->when($activeKeys !== [], fn ($query) => $query->whereNotIn('key', $activeKeys))
            ->when($activeKeys === [], fn ($query) => $query)
            ->update(['is_active' => false]);
    }

    private function typeFor(string $path): ?string
    {
        return match (strtok($path, '/')) {
            'models' => 'model',
            'sounds' => 'sound',
            'images' => 'image',
            default => null,
        };
    }
}
