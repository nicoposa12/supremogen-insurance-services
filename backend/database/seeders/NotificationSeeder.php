<?php

namespace Database\Seeders;

use App\Models\Notification;
use App\Models\User;
use App\Models\Quotation;
use App\Models\Claim;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing notifications first
        Notification::truncate();

        // Fetch all users with respective roles
        $agentsAndRenewal = User::role(['Sales Agent', 'Team Renewal'])->get();
        $underwriters = User::role('Underwriter')->get();
        $claimsOfficers = User::role('Claims Officer')->get();
        $collectionOfficers = User::role('Collection')->get();

        // Fetch actual approved and rejected quotations from database if available
        $approvedQuo = Quotation::where('status', 'approved')->first();
        $rejectedQuo = Quotation::where('status', 'rejected')->first();

        $approvedQuoNum = $approvedQuo ? $approvedQuo->quotation_number : 'QUO-2026-00012';
        $rejectedQuoNum = $rejectedQuo ? $rejectedQuo->quotation_number : 'QUO-2026-00010';

        // Fetch actual claims from database
        $approvedClaim = Claim::where('status', 'approved')->first();
        $approvedClaimNum = $approvedClaim ? $approvedClaim->claim_number : 'CLM-2026-00002';

        $filedClaim = Claim::where('status', 'filed')->first();
        $filedClaimNum = $filedClaim ? $filedClaim->claim_number : 'CLM-2026-00003';

        $assignedClaim = Claim::where('status', 'under_investigation')->first() ?? Claim::first();
        $assignedClaimNum = $assignedClaim ? $assignedClaim->claim_number : 'CLM-2026-00002';

        // Fetch actual invoices and payments from database
        $firstInvoice = Invoice::with('customer')->orderBy('created_at', 'asc')->first();
        $completedPayment = Payment::with('invoice.customer')->where('status', 'completed')->first();
        $overdueInvoice = Invoice::with('customer')->where('status', 'overdue')->first() 
            ?? Invoice::with('customer')->where('balance', '>', 0)->first();

        // Details for Invoice Issued
        $issuedInvNum = $firstInvoice ? $firstInvoice->invoice_number : 'INV-2026-00001';
        $issuedInvCust = $firstInvoice && $firstInvoice->customer ? trim($firstInvoice->customer->first_name . ' ' . $firstInvoice->customer->last_name) : 'Erick Espedillon';
        $issuedInvBal = $firstInvoice ? $firstInvoice->balance : 17000.00;

        // Details for Payment Received
        $receivedPayAmt = $completedPayment ? $completedPayment->amount : 10000.00;
        $receivedPayInvNum = $completedPayment && $completedPayment->invoice ? $completedPayment->invoice->invoice_number : 'INV-2026-00001';

        // Details for Invoice Overdue
        $overdueInvNum = $overdueInvoice ? $overdueInvoice->invoice_number : 'INV-2026-00002';
        $overdueInvCust = $overdueInvoice && $overdueInvoice->customer ? trim($overdueInvoice->customer->first_name . ' ' . $overdueInvoice->customer->last_name) : 'Juan Dela Cruz';
        $overdueInvBal = $overdueInvoice ? $overdueInvoice->balance : 30000.00;

        // Seed notifications for Sales Agents & Team Renewal (like mark anthony)
        foreach ($agentsAndRenewal as $agent) {
            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Quotation Approved',
                'message' => "Quotation {$approvedQuoNum} has been approved by Bob Underwriter.",
                'type' => 'success',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Quotation Rejected',
                'message' => "Quotation {$rejectedQuoNum} has been rejected by Bob Underwriter.",
                'type' => 'error',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Claim Approved',
                'message' => "Claim {$approvedClaimNum} has been approved by Claims Officer.",
                'type' => 'success',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Payment Received',
                'message' => "Payment of ₱" . number_format($receivedPayAmt, 2) . " was successfully recorded for Invoice {$receivedPayInvNum}.",
                'type' => 'success',
                'read_at' => null,
            ]);
        }

        // Seed notifications for Underwriters
        foreach ($underwriters as $underwriter) {
            Notification::create([
                'user_id' => $underwriter->id,
                'title' => 'Quotation Submitted for Review',
                'message' => 'Quotation QUO-2026-00004 has been submitted by Agent and requires your review.',
                'type' => 'info',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $underwriter->id,
                'title' => 'Claim Filed',
                'message' => "A new claim {$filedClaimNum} has been filed and is awaiting assignment.",
                'type' => 'warning',
                'read_at' => null,
            ]);
        }

        // Seed notifications for Claims Officers
        foreach ($claimsOfficers as $officer) {
            Notification::create([
                'user_id' => $officer->id,
                'title' => 'New Claim Assigned',
                'message' => "Claim {$assignedClaimNum} has been assigned to you for investigation.",
                'type' => 'info',
                'read_at' => null,
            ]);
        }

        // Seed notifications for Collection Officers
        foreach ($collectionOfficers as $officer) {
            Notification::create([
                'user_id' => $officer->id,
                'title' => 'Invoice Issued',
                'message' => "A new invoice {$issuedInvNum} has been generated for {$issuedInvCust} with balance ₱" . number_format($issuedInvBal, 2) . ".",
                'type' => 'info',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $officer->id,
                'title' => 'Payment Received',
                'message' => "A payment of ₱" . number_format($receivedPayAmt, 2) . " has been successfully recorded for Invoice {$receivedPayInvNum}.",
                'type' => 'success',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $officer->id,
                'title' => 'Invoice Overdue',
                'message' => "Invoice {$overdueInvNum} for {$overdueInvCust} is overdue. Please follow up on outstanding balance of ₱" . number_format($overdueInvBal, 2) . ".",
                'type' => 'warning',
                'read_at' => null,
            ]);
        }
    }
}
