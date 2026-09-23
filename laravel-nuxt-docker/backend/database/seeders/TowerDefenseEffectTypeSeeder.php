<?php

namespace Database\Seeders;

use App\Models\TowerDefenseEffectType;
use Illuminate\Database\Seeder;

class TowerDefenseEffectTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['id' => 'bonus-damage', 'name' => 'Sát thương cộng thêm', 'role' => 'damage', 'behavior' => 'bonus_damage', 'description' => 'Cộng trực tiếp vào sát thương mỗi đòn.', 'color' => '#ef4444'],
            ['id' => 'damage-over-time', 'name' => 'Sát thương theo thời gian', 'role' => 'damage', 'behavior' => 'damage_over_time', 'description' => 'Gây sát thương mỗi giây trong một khoảng thời gian.', 'color' => '#f97316'],
            ['id' => 'slow', 'name' => 'Làm chậm', 'role' => 'damage', 'behavior' => 'slow', 'description' => 'Giảm tốc độ di chuyển của mục tiêu.', 'color' => '#38bdf8'],
            ['id' => 'splash-damage', 'name' => 'Sát thương lan', 'role' => 'damage', 'behavior' => 'splash_damage', 'description' => 'Lan sát thương quanh mục tiêu chính.', 'color' => '#f59e0b'],
            ['id' => 'damage-aura', 'name' => 'Hào quang sát thương', 'role' => 'buff', 'behavior' => 'damage_aura', 'description' => 'Tăng sát thương tower đồng minh trong vùng.', 'color' => '#ef4444'],
            ['id' => 'attack-speed-aura', 'name' => 'Hào quang tốc đánh', 'role' => 'buff', 'behavior' => 'attack_speed_aura', 'description' => 'Tăng tốc đánh tower đồng minh trong vùng.', 'color' => '#22c55e'],
        ];
        foreach ($types as $sortOrder => $type) {
            TowerDefenseEffectType::query()->updateOrCreate(['id' => $type['id']], [...$type, 'sort_order' => $sortOrder, 'is_active' => true]);
        }
    }
}
