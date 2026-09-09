<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->unsignedInteger('round_number')->default(1)->after('status');
            $table->string('starting_color', 5)->default('red')->after('current_turn');
        });
    }

    public function down(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->dropColumn(['round_number', 'starting_color']);
        });
    }
};
