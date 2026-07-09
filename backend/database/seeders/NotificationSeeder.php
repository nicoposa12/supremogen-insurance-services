<?php

namespace Database\Seeders;

use App\Models\Notification;
use App\Models\User;
use App\Models\Quotation;
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

        // Fetch actual approved and rejected quotations from database if available
        $approvedQuo = Quotation::where('status', 'approved')->first();
        $rejectedQuo = Quotation::where('status', 'rejected')->first();

        $approvedQuoNum = $approvedQuo ? $approvedQuo->quotation_number : 'QUO-2026-00012';
        $rejectedQuoNum = $rejectedQuo ? $rejectedQuo->quotation_number : 'QUO-2026-00010';

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
                'message' => 'Claim CLM-2026-00002 has been approved by Claims Officer.',
                'type' => 'success',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Payment Received',
                'message' => 'Payment of ₱25,000.00 was successfully recorded by Accountant for Invoice INV-2026-00001.',
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
                'message' => 'A new claim CLM-2026-00003 has been filed and is awaiting assignment.',
                'type' => 'warning',
                'read_at' => null,
            ]);
        }

        // Seed notifications for Claims Officers
        foreach ($claimsOfficers as $officer) {
            Notification::create([
                'user_id' => $officer->id,
                'title' => 'New Claim Assigned',
                'message' => 'Claim CLM-2026-00002 has been assigned to you for investigation.',
                'type' => 'info',
                'read_at' => null,
            ]);
        }
    }
}
