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
            $table->string('template_key', 30)->nullable()->after('id')->index();
        });

        DB::table('tower_defense_towers')->get(['id'])->each(function (object $tower): void {
            $template = in_array($tower->id, ['archer', 'cannon', 'frost', 'fire', 'thunder', 'water', 'support'], true)
                ? $tower->id
                : 'archer';
            DB::table('tower_defense_towers')->where('id', $tower->id)->update(['template_key' => $template]);
        });
    }

    public function down(): void
    {
        Schema::table('tower_defense_towers', function (Blueprint $table): void {
            $table->dropColumn('template_key');
        });
    }
};
