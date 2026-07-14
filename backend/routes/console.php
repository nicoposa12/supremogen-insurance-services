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

Artisan::command('reminders:send', function () {
    Log::info('Running manual/automated payment reminder command...');
    $this->info('Running payment reminder command...');
    
    // Find all invoices that are sent or partial (active and unpaid or partially paid)
    $invoices = Invoice::whereIn('status', ['sent', 'partial'])
        ->where('balance', '>', 0)
        ->with(['customer', 'policy'])
        ->get();

    $today = now()->startOfDay();
    $sentCount = 0;

    foreach ($invoices as $invoice) {
        $customer = $invoice->customer;
        if (!$customer) {
            continue;
        }
        
        if (!$customer->email || !$customer->inception_date) {
            continue;
        }

        $terms = (int) ($customer->payment_terms ?? 1);
        $totalAmount = (float) $invoice->total_amount;
        $amountPaid = (float) $invoice->amount_paid;

        $installmentAmount = $terms > 0 ? ($totalAmount / $terms) : 0;
        $paidInstallments = $installmentAmount > 0 ? floor($amountPaid / $installmentAmount) : 0;
        $nextInstallmentIndex = $paidInstallments + 1;

        if ($nextInstallmentIndex > $terms) {
            continue;
        }

        $inception = \Carbon\Carbon::parse($customer->inception_date);
        $dueDate = $inception->copy()->addMonths($nextInstallmentIndex - 1)->startOfDay();

        // Check if the due date is exactly 1 day from today (day before payment)
        $daysDiff = $today->diffInDays($dueDate, false);
        
        if ((int)$daysDiff === 1) {
            $dueDateFormatted = $dueDate->format('M d, Y');
            $ordinals = [1 => '1ST', 2 => '2ND', 3 => '3RD', 4 => '4TH', 5 => '5TH', 6 => '6TH'];
            $isLast = ((int)$nextInstallmentIndex === (int)$terms);
            $installmentOrdinal = $isLast ? 'LAST' : ($ordinals[$nextInstallmentIndex] ?? ($nextInstallmentIndex . 'TH'));
            
            $customerName = trim($customer->first_name . ' ' . $customer->last_name);
            $policyNumber = $customer->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');
            $plateNumber = strtoupper($customer->plate_no ?: 'N/A');

            try {
                Mail::to($customer->email)->send(
                    new PaymentReminderMail(
                        $customerName,
                        $policyNumber,
                        $installmentOrdinal,
                        $terms,
                        $installmentAmount,
                        (float) $invoice->balance,
                        $dueDateFormatted,
                        $plateNumber
                    )
                );
                $sentCount++;
                Log::info("Sent auto payment reminder to {$customer->email} for invoice {$invoice->invoice_number}, installment {$installmentOrdinal}");
                $this->info("Sent auto payment reminder to {$customer->email} for invoice {$invoice->invoice_number}, installment {$installmentOrdinal}");

                // Notify all Collection officers
                $collectionOfficers = \App\Models\User::role('Collection')->get();
                foreach ($collectionOfficers as $officer) {
                    \App\Models\Notification::create([
                        'user_id' => $officer->id,
                        'title' => 'Payment Reminder Sent',
                        'message' => "A payment reminder for the {$installmentOrdinal} installment of ₱" . number_format($installmentAmount, 2) . " was sent to {$customerName} for Invoice {$invoice->invoice_number}.",
                        'type' => 'info',
                        'read_at' => null,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error("Failed to send auto payment reminder for invoice {$invoice->invoice_number}: " . $e->getMessage());
                $this->error("Failed to send auto payment reminder for invoice {$invoice->invoice_number}: " . $e->getMessage());
            }
        } elseif ((int)$daysDiff <= -4 && !$invoice->cancellation_warning_sent) {
            $customerName = trim($customer->first_name . ' ' . $customer->last_name);
            $policyNumber = $customer->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');

            try {
                Mail::to($customer->email)->send(
                    new \App\Mail\PolicyCancellationWarningMail(
                        $customerName,
                        $policyNumber
                    )
                );
                $sentCount++;
                $invoice->cancellation_warning_sent = \Illuminate\Support\Facades\DB::raw('true');
                $invoice->save();
                Log::info("Sent auto policy cancellation warning to {$customer->email} for invoice {$invoice->invoice_number}");
                $this->info("Sent auto policy cancellation warning to {$customer->email} for invoice {$invoice->invoice_number}");

                // Notify all Collection officers
                $collectionOfficers = \App\Models\User::role('Collection')->get();
                foreach ($collectionOfficers as $officer) {
                    \App\Models\Notification::create([
                        'user_id' => $officer->id,
                        'title' => 'Policy Cancellation Warning Sent',
                        'message' => "A policy cancellation warning was sent to {$customerName} for Invoice {$invoice->invoice_number} (Policy: {$policyNumber}) as it is " . abs((int)$daysDiff) . " days overdue.",
                        'type' => 'error',
                        'read_at' => null,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error("Failed to send auto policy cancellation warning for invoice {$invoice->invoice_number}: " . $e->getMessage());
                $this->error("Failed to send auto policy cancellation warning for invoice {$invoice->invoice_number}: " . $e->getMessage());
            }
        }
    }

    Log::info("Completed payment reminder command. Sent {$sentCount} reminders.");
    $this->info("Completed payment reminder command. Sent {$sentCount} reminders.");
})->purpose('Send automated payment reminders to clients 1 day before due date');

Schedule::command('reminders:send')->daily();
