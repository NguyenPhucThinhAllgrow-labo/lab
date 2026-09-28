<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddCriticalHitTowerDefenseEffectType extends Migration
{
    public function up(): void
    {
        DB::table("tower_defense_effect_types")->updateOrInsert(
            ["id" => "critical-hit"],
            [
                "name" => "Chí mạng",
                "role" => "damage",
                "behavior" => "critical_hit",
                "description" => "Mỗi đòn có xác suất nhân sát thương theo hệ số cấu hình.",
                "color" => "#facc15",
                "sort_order" => 1,
                "is_active" => true,
                "created_at" => now(),
                "updated_at" => now(),
            ],
        );
    }

    public function down(): void
    {
        DB::table("tower_defense_effect_types")
            ->where("id", "critical-hit")
            ->delete();
    }
}
