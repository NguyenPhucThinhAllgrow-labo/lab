<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tower_defense_towers', function (Blueprint $table): void {
            $table->string('id', 100)->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('cost');
            $table->decimal('damage', 10, 2)->default(0);
            $table->decimal('range', 8, 3);
            $table->decimal('fire_rate', 8, 3)->default(0);
            $table->string('color', 7)->default('#64748b');
            $table->json('effects')->nullable();
            $table->json('model_asset_keys')->nullable();
            $table->json('model_configuration')->nullable();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tower_defense_towers');
    }
};
