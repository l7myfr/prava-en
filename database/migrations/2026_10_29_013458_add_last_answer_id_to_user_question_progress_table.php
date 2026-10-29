<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remembers which answer was picked last, so topic practice can show past
     * answers and resume at the first unanswered question.
     */
    public function up(): void
    {
        Schema::table('user_question_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('last_answer_id')->nullable()->after('last_answer_correct');
        });
    }

    public function down(): void
    {
        Schema::table('user_question_progress', function (Blueprint $table) {
            $table->dropColumn('last_answer_id');
        });
    }
};
