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
            $table->json('damage_by_level')->nullable()->after('damage');
        });

        DB::table('tower_defense_towers')->get()->each(function (object $tower): void {
            $base = (float) $tower->damage;
            $thunder = $tower->id === 'thunder';
            DB::table('tower_defense_towers')->where('id', $tower->id)->update([
                'damage_by_level' => json_encode([
                    '1' => $base,
                    '2' => round($base * ($thunder ? 1.42 : 1.55), 2),
                    '3' => round($base * ($thunder ? 1.84 : 2.1), 2),
                ]),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->dropColumn('damage_by_level');
        });
    }
};
