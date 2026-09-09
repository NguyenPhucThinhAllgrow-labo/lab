<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->boolean('red_ready')->default(false)->after('version');
            $table->boolean('black_ready')->default(false)->after('red_ready');
        });
    }

    public function down(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->dropColumn(['red_ready', 'black_ready']);
        });
    }
};
