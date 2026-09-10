<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->foreignId('undo_requested_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('undo_requested_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('chinese_chess_rooms', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('undo_requested_by_id');
            $table->dropColumn('undo_requested_at');
        });
    }
};
