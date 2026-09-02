<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->json('unlocked_paths')->nullable()->after('completed_tasks');
        });
    }

    public function down(): void
    {
        Schema::table('detective_progress', function (Blueprint $table): void {
            $table->dropColumn('unlocked_paths');
        });
    }
};
