<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detective_progress', function (Blueprint $table) {
            $table->json('linked_evidence')->nullable()->after('completed_tasks');
        });

        Schema::table('detective_completion_histories', function (Blueprint $table) {
            $table->json('linked_evidence')->nullable()->after('task_history');
        });
    }

    public function down(): void
    {
        Schema::table('detective_completion_histories', function (Blueprint $table) {
            $table->dropColumn('linked_evidence');
        });

        Schema::table('detective_progress', function (Blueprint $table) {
            $table->dropColumn('linked_evidence');
        });
    }
};
