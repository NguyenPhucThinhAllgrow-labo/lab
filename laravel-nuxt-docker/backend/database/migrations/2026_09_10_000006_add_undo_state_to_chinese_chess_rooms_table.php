<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->unsignedTinyInteger('red_undos_remaining')->default(3);
            $table->unsignedTinyInteger('black_undos_remaining')->default(3);
        });
    }

    public function down(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->dropColumn(['red_undos_remaining', 'black_undos_remaining']);
        });
    }
};
