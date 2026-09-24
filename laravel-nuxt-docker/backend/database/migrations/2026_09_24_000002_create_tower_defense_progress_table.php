<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tower_defense_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tower_defense_map_id', 100);
            $table->unsignedInteger('max_wave')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('tower_defense_map_id')
                ->references('id')
                ->on('tower_defense_maps')
                ->cascadeOnDelete();
            $table->unique(['user_id', 'tower_defense_map_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tower_defense_progress');
    }
};
