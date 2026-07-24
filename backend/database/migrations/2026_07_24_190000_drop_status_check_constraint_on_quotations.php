<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            DB::statement("ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;");
        } catch (\Throwable $e) {
            // Ignore if constraint does not exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
