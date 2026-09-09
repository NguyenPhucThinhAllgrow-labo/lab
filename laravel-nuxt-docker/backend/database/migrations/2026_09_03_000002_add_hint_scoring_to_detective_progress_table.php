<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->unsignedInteger('hint_count')->default(0)->after('command_history');
            $table->unsignedInteger('hint_penalty')->default(0)->after('hint_count');
        });
    }

    public function down(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->dropColumn(['hint_count', 'hint_penalty']);
        });
    }
};
