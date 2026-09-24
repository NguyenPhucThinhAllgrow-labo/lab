<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tower_defense_game_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tower_defense_map_id', 100);
            $table->string('faction', 20);
            $table->string('status', 20)->default('active');
            $table->unsignedInteger('current_wave')->default(0);
            $table->unsignedBigInteger('score')->default(0);
            $table->unsignedInteger('castle_health')->default(20);
            $table->json('snapshot');
            $table->timestamp('started_at');
            $table->timestamp('last_played_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->foreign('tower_defense_map_id')
                ->references('id')
                ->on('tower_defense_maps')
                ->cascadeOnDelete();
            $table->index(['user_id', 'status', 'last_played_at']);
            $table->index(['user_id', 'tower_defense_map_id', 'status'], 'td_sessions_user_map_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tower_defense_game_sessions');
    }
};
