<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->string('image_asset_key', 500)->nullable()->after('color');
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->dropColumn('image_asset_key');
        });
    }
};
