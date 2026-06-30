<?php

namespace Database\Seeders;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $agent = User::where('email', 'agent@supremogen.com')->first();
        $underwriter = User::where('email', 'underwriter@supremogen.com')->first();

        if ($agent) {
            Notification::create([
                'user_id' => $agent->id,
                'title' => 'New Quotation Draft',
                'message' => 'Quotation QUO-2026-00001 has been successfully saved as draft.',
                'type' => 'info',
                'read_at' => now()->subHours(5),
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Invoice Overdue',
                'message' => 'Invoice INV-2026-00003 for Juan Dela Cruz is currently overdue by 5 days.',
                'type' => 'error',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Claim Status Updated',
                'message' => 'Claim CLM-2026-00002 has been moved to Under Investigation.',
                'type' => 'warning',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Policy Expiring Soon',
                'message' => 'Policy POL-2026-00002 is expiring in 15 days. A renewal record has been generated.',
                'type' => 'warning',
                'read_at' => null,
            ]);

            Notification::create([
                'user_id' => $agent->id,
                'title' => 'Payment Received',
                'message' => 'Payment of ₱25,000.00 was successfully recorded for Invoice INV-2026-00001.',
                'type' => 'success',
                'read_at' => null,
            ]);
        }

        if ($underwriter) {
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
    }
}
