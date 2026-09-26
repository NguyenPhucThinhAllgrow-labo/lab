<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $source = DB::table('tower_defense_towers')->where('id', 'speed')->first()
            ?? DB::table('tower_defense_towers')->where('id', 'damage')->first();

        if ($source && ! DB::table('tower_defense_towers')->where('id', 'support')->exists()) {
            DB::table('tower_defense_towers')->where('id', $source->id)->update([
                'id' => 'support',
                'name' => 'Trụ hỗ trợ',
                'description' => 'Tăng tốc đánh và sát thương cho các tháp trong phạm vi.',
                'role' => 'buff',
                'cost' => 175,
                'color' => '#a855f7',
                'effects' => json_encode([
                    'items' => [
                        ['id' => 'support-speed-aura', 'type' => 'attack-speed-aura', 'behavior' => 'attack_speed_aura', 'name' => 'Hào quang tốc độ', 'value' => 0.1, 'perLevel' => 0.2, 'radius' => 2.5, 'color' => '#22c55e'],
                        ['id' => 'support-damage-aura', 'type' => 'damage-aura', 'behavior' => 'damage_aura', 'name' => 'Hào quang sát thương', 'value' => 0.1, 'perLevel' => 0.2, 'radius' => 2.5, 'color' => '#ef4444'],
                    ],
                ]),
                'updated_at' => now(),
            ]);
        }

        DB::table('tower_defense_towers')->whereIn('id', ['speed', 'damage'])->delete();
    }

    public function down(): void
    {
        DB::table('tower_defense_towers')->where('id', 'support')->update([
            'id' => 'speed',
            'name' => 'Trụ tốc độ',
            'description' => 'Tăng tốc đánh cho các tháp trong phạm vi.',
            'cost' => 165,
            'color' => '#22c55e',
            'effects' => json_encode(['items' => [
                ['id' => 'speed-aura', 'type' => 'attack-speed-aura', 'behavior' => 'attack_speed_aura', 'name' => 'Hào quang tốc độ', 'value' => 0.1, 'perLevel' => 0.2, 'radius' => 2.5, 'color' => '#22c55e'],
            ]]),
            'updated_at' => now(),
        ]);
    }
};
