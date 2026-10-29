<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Topic progress shows how the latest attempt at each question went, which
     * the running correct/wrong totals cannot tell apart.
     */
    public function up(): void
    {
        Schema::table('user_question_progress', function (Blueprint $table) {
            $table->boolean('last_answer_correct')->nullable()->after('times_wrong');
        });
    }

    public function down(): void
    {
        Schema::table('user_question_progress', function (Blueprint $table) {
            $table->dropColumn('last_answer_correct');
        });
    }
};
