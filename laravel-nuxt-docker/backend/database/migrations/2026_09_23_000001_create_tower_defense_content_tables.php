<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tower_defense_maps', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('name');
            $table->json('configuration');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('tower_defense_assets', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('type', 20)->index();
            $table->string('path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->json('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tower_defense_assets');
        Schema::dropIfExists('tower_defense_maps');
    }
};
