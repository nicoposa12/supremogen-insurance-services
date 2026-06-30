<?php

namespace Database\Seeders;

use App\Models\Policy;
use App\Models\Renewal;
use Illuminate\Database\Seeder;

class RenewalSeeder extends Seeder
{
    public function run(): void
    {
        $policies = Policy::with('customer')->where('status', 'active')->get();

        if ($policies->isEmpty()) {
            $this->command->warn('Skipping RenewalSeeder: no active policies.');
            return;
        }

        $statuses = ['pending', 'pending', 'renewed', 'expired', 'cancelled'];

        foreach ($policies as $idx => $policy) {
            $status = $statuses[$idx % count($statuses)];

            Renewal::create([
                'renewal_number' => Renewal::generateNumber(),
                'policy_id' => $policy->id,
                'customer_id' => $policy->customer_id,
                'status' => $status,
                'original_expiry_date' => $policy->expiry_date,
                'new_effective_date' => $status === 'renewed' ? $policy->expiry_date : null,
                'new_expiry_date' => $status === 'renewed' ? $policy->expiry_date->copy()->addYear() : null,
                'premium_adjustment' => $status === 'renewed' ? rand(-5, 15) * 1000 : 0,
                'notes' => fake()->optional(0.3)->sentence(),
            ]);
        }
    }
}
