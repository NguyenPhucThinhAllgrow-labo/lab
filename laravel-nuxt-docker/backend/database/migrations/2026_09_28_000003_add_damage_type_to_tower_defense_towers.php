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
            $table->string('damage_type', 20)->default('magic')->after('role');
        });

        DB::table('tower_defense_towers')
            ->whereIn('template_key', ['archer', 'cannon'])
            ->update(['damage_type' => 'physical']);

        DB::table('tower_defense_towers')
            ->where('role', 'buff')
            ->update(['damage_type' => 'none']);
    }

    public function down(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->dropColumn('damage_type');
        });
    }
};
