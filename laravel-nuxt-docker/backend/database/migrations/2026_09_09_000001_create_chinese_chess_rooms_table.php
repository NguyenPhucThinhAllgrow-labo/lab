<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chinese_chess_rooms', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 8)->unique();
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('red_player_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('black_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('waiting')->index();
            $table->string('current_turn', 5)->default('red');
            $table->json('board');
            $table->json('move_history')->nullable();
            $table->unsignedInteger('red_time_seconds')->default(600);
            $table->unsignedInteger('black_time_seconds')->default(600);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('last_move_at')->nullable();
            $table->foreignId('winner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('finish_reason', 30)->nullable();
            $table->unsignedInteger('version')->default(0);
            $table->boolean('red_rematch')->default(false);
            $table->boolean('black_rematch')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chinese_chess_rooms');
    }
};
