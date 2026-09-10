<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->json('position_history')->nullable()->after('move_history');
            $table->json('repetition_state')->nullable()->after('position_history');
        });
    }

    public function down(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->dropColumn(['position_history', 'repetition_state']);
        });
    }
};
