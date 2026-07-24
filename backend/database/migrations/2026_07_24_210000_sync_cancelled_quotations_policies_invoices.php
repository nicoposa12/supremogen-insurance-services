<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\Quotation;
use App\Models\Policy;
use App\Models\Invoice;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop check constraint on invoices status if present
        DB::statement("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;");

        // Synchronize all currently cancelled quotations with their policies and invoices
        $cancelledQuotations = Quotation::where('status', 'cancelled')->with('policy')->get();

        foreach ($cancelledQuotations as $quotation) {
            if ($quotation->policy) {
                $quotation->policy->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => $quotation->cancellation_reason ?? 'Cancelled upon underwriter approval',
                    'cancelled_at' => $quotation->updated_at ?? now(),
                ]);

                Invoice::where('policy_id', $quotation->policy->id)->update([
                    'status' => 'voided',
                    'balance' => 0,
                ]);
            }

            if ($quotation->customer_id) {
                Invoice::where('customer_id', $quotation->customer_id)
                    ->whereIn('status', ['sent', 'unpaid', 'partially_paid', 'overdue', 'draft'])
                    ->update([
                        'status' => 'voided',
                        'balance' => 0,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
