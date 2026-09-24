<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->json('level_stats')->nullable()->after('max_level');
        });
        DB::table('tower_defense_towers')->get()->each(function (object $tower): void {
            $damages = json_decode($tower->damage_by_level ?? '[]', true) ?: [];
            $stats = [];
            for ($level = 1; $level <= (int) $tower->max_level; $level++) {
                $stats[(string) $level] = [
                    'damage' => (float) ($damages[(string) $level] ?? $tower->damage),
                    'range' => (float) $tower->range + (in_array($tower->id, ['frost', 'speed', 'damage'], true) ? 0 : max(0, $level - 1) * 0.22),
                    'fireRate' => (float) $tower->fire_rate / (1 + max(0, $level - 1) * ($tower->id === 'archer' ? 0.35 : 0.18)),
                    'upgradeCost' => $level === 1 ? (int) $tower->cost : (int) round($tower->cost * (0.75 + ($level - 2) * 0.35) / 5) * 5,
                ];
            }
            DB::table('tower_defense_towers')->where('id', $tower->id)->update(['level_stats' => json_encode($stats)]);
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->dropColumn('level_stats');
        });
    }
};
