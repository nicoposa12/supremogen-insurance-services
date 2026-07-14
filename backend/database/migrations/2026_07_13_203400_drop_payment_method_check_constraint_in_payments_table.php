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
        // Drop the check constraint in PostgreSQL if it exists
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-adding the constraint if necessary
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'online', 'gcash', 'maya', 'jt', 'jrs', 'cod', 'walk_in', 'bank_transfer_pbcom', 'bank_transfer_security_bank', 'post_dated_checks', 'split_payment'));");
        }
    }
};
