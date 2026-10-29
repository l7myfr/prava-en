<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-profile look: background, Home banner and banner text.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('customization')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('customization');
        });
    }
};
