<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tower_defense_enemies', function (Blueprint $table): void {
            $table->string('id', 100)->primary();
            $table->string('name');
            $table->string('kind', 20)->index();
            $table->string('model_asset_key')->nullable();
            $table->string('avatar_asset_key')->nullable();
            $table->unsignedInteger('base_health')->default(100);
            $table->decimal('base_speed', 6, 3)->default(1);
            $table->unsignedInteger('reward')->default(10);
            $table->unsignedInteger('castle_damage')->default(1);
            $table->text('summary')->nullable();
            $table->string('resistance')->nullable();
            $table->string('weakness')->nullable();
            $table->json('model_configuration')->nullable();
            $table->json('combat_profile')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tower_defense_enemies');
    }
};
