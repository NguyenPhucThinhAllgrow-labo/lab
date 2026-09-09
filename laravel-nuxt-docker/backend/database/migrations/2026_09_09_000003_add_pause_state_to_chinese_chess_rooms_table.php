<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->foreignId('paused_by_id')->nullable()->after('last_move_at')->constrained('users')->nullOnDelete();
            $table->timestamp('paused_at')->nullable()->after('paused_by_id');
        });
    }

    public function down(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('paused_by_id');
            $table->dropColumn('paused_at');
        });
    }
};
