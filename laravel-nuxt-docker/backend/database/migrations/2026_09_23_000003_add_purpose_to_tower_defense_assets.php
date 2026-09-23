<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tower_defense_assets', function (Blueprint $table): void {
            $table->string('purpose', 40)->default('other')->after('type')->index();
        });

        DB::table('tower_defense_assets')
            ->select(['id', 'key', 'type'])
            ->orderBy('id')
            ->each(function (object $asset): void {
                DB::table('tower_defense_assets')
                    ->where('id', $asset->id)
                    ->update(['purpose' => $this->purposeFor($asset->type, $asset->key)]);
            });
    }

    public function down(): void
    {
        Schema::table('tower_defense_assets', function (Blueprint $table): void {
            $table->dropIndex(['purpose']);
            $table->dropColumn('purpose');
        });
    }

    private function purposeFor(string $type, string $key): string
    {
        $path = strtolower($key);

        if ($type === 'sound') {
            return str_contains($path, 'sounds/background/')
                ? 'background-music'
                : 'tower-sfx';
        }

        if ($type === 'image') {
            if (str_contains($path, '/boss.')) {
                return 'boss-avatar';
            }
            if (str_contains($path, '/military/')) {
                return 'enemy-avatar';
            }
            if (str_contains($path, '/map/') || str_contains($path, '/background/')) {
                return 'map-image';
            }

            return 'ui-image';
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
};
