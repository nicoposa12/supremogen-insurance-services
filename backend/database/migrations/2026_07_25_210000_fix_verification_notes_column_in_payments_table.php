<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'verification_remarks') && !Schema::hasColumn('payments', 'verification_notes')) {
                $table->renameColumn('verification_remarks', 'verification_notes');
            } elseif (!Schema::hasColumn('payments', 'verification_notes')) {
                $table->text('verification_notes')->nullable()->after('verification_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'verification_notes')) {
                $table->renameColumn('verification_notes', 'verification_remarks');
            }
        });
    }
};
