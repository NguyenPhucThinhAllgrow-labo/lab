<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tower_defense_effect_types', function (Blueprint $table): void {
            $table->string('id', 100)->primary();
            $table->string('name');
            $table->string('role', 20)->index();
            $table->string('behavior', 50)->index();
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#8b5cf6');
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tower_defense_effect_types');
    }
};
