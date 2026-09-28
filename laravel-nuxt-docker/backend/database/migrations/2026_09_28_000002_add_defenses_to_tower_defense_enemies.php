<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tower_defense_enemies', function (Blueprint $table): void {
            $table->unsignedInteger('armor')->default(0)->after('base_health');
            $table->unsignedInteger('magic_resistance')->default(0)->after('armor');
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_enemies', function (Blueprint $table): void {
            $table->dropColumn(['armor', 'magic_resistance']);
        });
    }
};
