<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Policy;
use App\Models\User;
use Illuminate\Database\Seeder;

class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        $agent = User::where('email', 'agent@supremogen.com')->first();
        $policies = Policy::with('customer')->where('status', 'active')->get();

        if (!$agent || $policies->isEmpty()) {
            $this->command->warn('Skipping InvoiceSeeder: no active policies.');
            return;
        }

        $statuses = ['draft', 'sent', 'sent', 'partial', 'paid', 'paid', 'overdue'];

        foreach ($policies as $idx => $policy) {
            $status = $statuses[$idx % count($statuses)];
            $premium = (float) $policy->total_premium;
            $tax = round($premium * 0.12, 2); // 12% VAT
            $total = $premium + $tax;

            $amountPaid = match ($status) {
                'paid' => $total,
                'partial' => round($total * 0.5, 2),
                default => 0,
            };

            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateNumber(),
                'policy_id' => $policy->id,
                'customer_id' => $policy->customer_id,
                'created_by' => $agent->id,
                'status' => $status,
                'due_date' => $status === 'overdue' ? now()->subDays(rand(5, 30)) : now()->addDays(rand(15, 60)),
                'subtotal' => $premium,
                'tax_amount' => $tax,
                'total_amount' => $total,
                'amount_paid' => $amountPaid,
                'balance' => $total - $amountPaid,
                'notes' => fake()->optional(0.3)->sentence(),
            ]);

            // Create line items
            $invoice->items()->create([
                'description' => 'Insurance Premium — ' . ($policy->insuranceProduct->name ?? 'Policy'),
                'quantity' => 1,
                'unit_price' => $premium,
                'amount' => $premium,
            ]);

            if ($tax > 0) {
                $invoice->items()->create([
                    'description' => 'Value Added Tax (12%)',
                    'quantity' => 1,
                    'unit_price' => $tax,
                    'amount' => $tax,
                ]);
            }
        }
    }
}
