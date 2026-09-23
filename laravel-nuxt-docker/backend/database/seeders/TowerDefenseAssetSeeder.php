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
                    'purpose' => $this->purposeFor($type, $path),
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

    private function purposeFor(string $type, string $path): string
    {
        $path = strtolower($path);

        if ($type === 'sound') {
            return str_contains($path, 'sounds/background/')
                ? 'background-music'
                : 'tower-sfx';
        }
        if ($type === 'image') {
            if (str_contains($path, '/boss.')) {
                return 'boss-avatar';
            }
            if (str_contains($path, '/map/') || str_contains($path, '/background/')) {
                return 'map-image';
            }

            return str_contains($path, '/military/') ? 'enemy-avatar' : 'ui-image';
        }
        if (preg_match('/\.(png|jpe?g|webp)$/', $path)) {
            return 'texture';
        }
        if (str_contains($path, '/character/boss/') || str_contains($path, '/characters/')) {
            return 'boss-model';
        }
        if (str_contains($path, '/character/')) {
            return 'enemy-model';
        }
        if (str_contains($path, '/towers/')) {
            return 'tower-model';
        }
        if (str_contains($path, '/castle.') || str_contains($path, '/barrack/')) {
            return 'castle-model';
        }
        if (str_contains($path, '/tile/') || str_contains($path, '/background/')) {
            return 'map-model';
        }
        if (str_contains($path, '/assets/')) {
            return 'equipment-model';
        }
        if (str_contains($path, '/animations/')) {
            return 'animation';
        }

        return 'other';
    }
}
