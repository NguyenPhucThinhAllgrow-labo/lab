<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tower_defense_enemies', function (Blueprint $table) {
            $table->json('display_configuration')->nullable()->after('weakness');
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_enemies', function (Blueprint $table) {
            $table->dropColumn('display_configuration');
        });
    }
};
