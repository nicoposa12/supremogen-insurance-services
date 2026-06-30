<?php

namespace Database\Seeders;

use App\Models\Claim;
use App\Models\Policy;
use App\Models\User;
use Illuminate\Database\Seeder;

class ClaimSeeder extends Seeder
{
    public function run(): void
    {
        $agent = User::where('email', 'agent@supremogen.com')->first();
        $underwriter = User::where('email', 'underwriter@supremogen.com')->first();
        $policies = Policy::with('customer')->where('status', 'active')->get();

        if (!$agent || $policies->isEmpty()) {
            $this->command->warn('Skipping ClaimSeeder: no active policies.');
            return;
        }

        $statuses = ['filed', 'under_investigation', 'approved', 'denied', 'settled', 'closed'];
        $incidents = [
            'Vehicle collision at intersection. Front bumper and hood damaged.',
            'Fire damage to insured property affecting ground floor.',
            'Water damage from burst pipe in commercial building.',
            'Theft of insured equipment from warehouse.',
            'Wind damage to roof and exterior walls during storm.',
            'Accidental injury at workplace requiring hospitalization.',
        ];

        foreach ($policies->take(6) as $idx => $policy) {
            $status = $statuses[$idx % count($statuses)];
            $claimAmt = rand(50, 500) * 1000;
            $isApproved = in_array($status, ['approved', 'settled', 'closed']);
            $isSettled = in_array($status, ['settled', 'closed']);

            Claim::create([
                'claim_number' => Claim::generateNumber(),
                'policy_id' => $policy->id,
                'customer_id' => $policy->customer_id,
                'filed_by' => $agent->id,
                'assigned_to' => in_array($status, ['under_investigation', 'approved', 'denied', 'settled', 'closed']) ? $underwriter?->id : null,
                'status' => $status,
                'incident_date' => now()->subDays(rand(5, 90)),
                'incident_description' => $incidents[$idx % count($incidents)],
                'claim_amount' => $claimAmt,
                'approved_amount' => $isApproved ? round($claimAmt * (rand(60, 100) / 100), 2) : null,
                'settlement_amount' => $isSettled ? round($claimAmt * (rand(50, 95) / 100), 2) : null,
                'adjuster_remarks' => $isApproved ? fake()->sentence() : null,
                'settlement_date' => $isSettled ? now()->subDays(rand(0, 15)) : null,
            ]);
        }
    }
}
