<?php
use App\Models\Invoice;

$invoices = Invoice::whereIn('status', ['sent', 'partial'])->where('balance', '>', 0)->with(['customer', 'policy'])->get();
echo "Found " . $invoices->count() . " invoices.\n";
foreach ($invoices as $invoice) {
    $customer = $invoice->customer;
    if (!$customer) {
        echo "Invoice " . $invoice->invoice_number . " has no customer.\n";
        continue;
    }
    if ($customer->id != 8) continue;
    $terms = (int) ($customer->payment_terms ?? 1);
    $totalAmount = (float) $invoice->total_amount;
    $amountPaid = (float) $invoice->amount_paid;
    $installmentAmount = $terms > 0 ? ($totalAmount / $terms) : 0;
    $paidInstallments = $installmentAmount > 0 ? floor($amountPaid / $installmentAmount) : 0;
    $nextInstallmentIndex = $paidInstallments + 1;
    $inception = \Carbon\Carbon::parse($customer->inception_date);
    $dueDate = $inception->copy()->addMonths($nextInstallmentIndex - 1)->startOfDay();
    $today = now()->startOfDay();
    $daysDiff = $today->diffInDays($dueDate, false);
    echo "Client: " . $customer->first_name . " " . $customer->last_name . "\n";
    echo "Due Date: " . $dueDate->toString() . "\n";
    echo "Today: " . $today->toString() . "\n";
    echo "Days Diff: " . $daysDiff . "\n";
}
