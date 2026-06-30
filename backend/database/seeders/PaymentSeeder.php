<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    public function run(): void
    {
        $agent = User::where('email', 'agent@supremogen.com')->first();
        if (!$agent) {
            $this->command->warn('Skipping PaymentSeeder: agent not found.');
            return;
        }

        // Create payments for invoices that are paid or partial
        $invoices = Invoice::whereIn('status', ['paid', 'partial'])->get();
        $methods = ['cash', 'check', 'bank_transfer', 'online', 'gcash', 'maya'];

        foreach ($invoices as $invoice) {
            $amountToPay = (float) $invoice->amount_paid;

            if ($amountToPay <= 0) continue;

            // For paid invoices, 1 full payment. For partial, 1 partial payment.
            Payment::create([
                'payment_number' => Payment::generateNumber(),
                'invoice_id' => $invoice->id,
                'received_by' => $agent->id,
                'amount' => $amountToPay,
                'payment_method' => $methods[array_rand($methods)],
                'payment_date' => now()->subDays(rand(0, 30)),
                'reference_number' => fake()->optional(0.5)->numerify('REF-########'),
                'notes' => fake()->optional(0.3)->sentence(),
                'status' => 'completed',
            ]);
        }
    }
}
