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
        $customers = DB::table('customers')
            ->whereNotNull('policy_no')
            ->where('policy_no', '!=', '')
            ->get();

        foreach ($customers as $c) {
            $existing = DB::table('policies')
                ->where('policy_number', $c->policy_no)
                ->where('customer_id', '!=', $c->id)
                ->exists();

            if (!$existing) {
                DB::table('policies')
                    ->where('customer_id', $c->id)
                    ->update(['policy_number' => $c->policy_no]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
