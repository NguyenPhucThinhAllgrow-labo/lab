<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tower_defense_enemies', function (Blueprint $table): void {
            $table->string('left_weapon_asset_key')->nullable()->after('avatar_asset_key');
            $table->string('right_weapon_asset_key')->nullable()->after('left_weapon_asset_key');
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_enemies', function (Blueprint $table): void {
            $table->dropColumn(['left_weapon_asset_key', 'right_weapon_asset_key']);
        });
    }
};
