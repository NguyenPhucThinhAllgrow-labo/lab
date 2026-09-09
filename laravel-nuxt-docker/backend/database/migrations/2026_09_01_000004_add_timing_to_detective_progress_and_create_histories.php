<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->uuid('run_id')->nullable()->unique()->after('case_id');
            $table->unsignedInteger('elapsed_seconds')->default(0);
            $table->json('evidence_history')->nullable();
            $table->json('task_history')->nullable();
        });

        Schema::create('detective_completion_histories', function (Blueprint $table): void {
            $table->id();
            $table->uuid('run_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('case_id');
            $table->foreign('case_id')->references('id')->on('detective_cases')->cascadeOnDelete();
            $table->unsignedInteger('elapsed_seconds');
            $table->json('evidence_history');
            $table->json('task_history');
            $table->json('command_history')->nullable();
            $table->json('statistics');
            $table->timestamp('started_at');
            $table->timestamp('completed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detective_completion_histories');

        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->dropUnique(['run_id']);
            $table->dropColumn(['run_id', 'elapsed_seconds', 'evidence_history', 'task_history']);
        });
    }
};
