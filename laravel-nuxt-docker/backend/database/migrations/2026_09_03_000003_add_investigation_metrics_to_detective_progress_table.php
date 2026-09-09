<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->json('hint_history')->nullable()->after('hint_penalty');
            $table->unsignedInteger('incorrect_link_attempts')->default(0)->after('hint_history');
        });
    }

    public function down(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->dropColumn(['hint_history', 'incorrect_link_attempts']);
        });
    }
};
