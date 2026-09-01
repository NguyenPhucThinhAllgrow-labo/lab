<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detective_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('case_id');
            $table->foreign('case_id')->references('id')->on('detective_cases')->cascadeOnDelete();
            $table->string('locale', 5)->default('en');
            $table->string('current_directory')->default('/');
            $table->json('discovered_evidence')->nullable();
            $table->json('completed_tasks')->nullable();
            $table->json('command_history')->nullable();
            $table->json('terminal_lines')->nullable();
            $table->boolean('game_completed')->default(false);
            $table->timestamp('last_played_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'case_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detective_progress');
    }
};
