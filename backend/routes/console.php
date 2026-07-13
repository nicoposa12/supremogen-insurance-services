<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Invoice;
use App\Mail\PaymentReminderMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    Log::info('Running payment reminder cron scheduler...');
    
    // Find all invoices that are sent or partial (active and unpaid or partially paid)
    $invoices = Invoice::whereIn('status', ['sent', 'partial'])
        ->where('balance', '>', 0)
        ->with(['customer', 'policy'])
        ->get();

    $today = now()->startOfDay();
    $sentCount = 0;

    foreach ($invoices as $invoice) {
        $customer = $invoice->customer;
        if (!$customer || !$customer->email || !$customer->inception_date) {
            continue;
        }

        $terms = (int) ($customer->payment_terms ?? 1);
        $totalAmount = (float) $invoice->total_amount;
        $amountPaid = (float) $invoice->amount_paid;

        $installmentAmount = $terms > 0 ? ($totalAmount / $terms) : 0;
        $paidInstallments = $installmentAmount > 0 ? floor($amountPaid / $installmentAmount) : 0;
        $nextInstallmentIndex = $paidInstallments + 1;

        if ($nextInstallmentIndex > $terms) {
            continue; // Already paid in full based on terms calculation
        }

        $inception = \Carbon\Carbon::parse($customer->inception_date);
        $dueDate = $inception->copy()->addMonths($nextInstallmentIndex - 1)->startOfDay();

        // Check if the due date is exactly 3 days from today
        $daysDiff = $today->diffInDays($dueDate, false);
        
        if ($daysDiff === 3) {
            $dueDateFormatted = $dueDate->format('M d, Y');
            $ordinals = [1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th', 5 => '5th', 6 => '6th'];
            $installmentOrdinal = $ordinals[$nextInstallmentIndex] ?? ($nextInstallmentIndex . 'th');
            $customerName = trim($customer->first_name . ' ' . $customer->last_name);
            $policyNumber = $customer->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');

            try {
                Mail::to($customer->email)->send(
                    new PaymentReminderMail(
                        $customerName,
                        $policyNumber,
                        $installmentOrdinal,
                        $terms,
                        $installmentAmount,
                        (float) $invoice->balance,
                        $dueDateFormatted
                    )
                );
                $sentCount++;
                Log::info("Sent auto payment reminder to {$customer->email} for invoice {$invoice->invoice_number}, installment {$installmentOrdinal}");
            } catch (\Exception $e) {
                Log::error("Failed to send auto payment reminder for invoice {$invoice->invoice_number}: " . $e->getMessage());
            }
        }
    }

    Log::info("Completed payment reminder cron scheduler. Sent {$sentCount} reminders.");
})->daily();
