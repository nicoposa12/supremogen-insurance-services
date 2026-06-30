<?php

namespace Database\Seeders;

use App\Models\Policy;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Database\Seeder;

class PolicySeeder extends Seeder
{
    /**
     * Seed policies from approved quotations.
     */
    public function run(): void
    {
        $agent = User::where('email', 'agent@supremogen.com')->first();
        $approvedQuotations = Quotation::where('status', 'approved')
            ->with(['items.insuranceProduct', 'customer'])
            ->get();

        if (!$agent || $approvedQuotations->isEmpty()) {
            $this->command->warn('Skipping PolicySeeder: no approved quotations found.');
            return;
        }

        foreach ($approvedQuotations as $quotation) {
            $primaryItem = $quotation->items->first();
            if (!$primaryItem) continue;

            $effectiveDate = now()->subDays(rand(0, 60));
            $expiryDate = $effectiveDate->copy()->addYear();

            $policy = Policy::create([
                'policy_number' => Policy::generateNumber(),
                'quotation_id' => $quotation->id,
                'customer_id' => $quotation->customer_id,
                'insurance_product_id' => $primaryItem->insurance_product_id,
                'issued_by' => $agent->id,
                'status' => 'active',
                'effective_date' => $effectiveDate,
                'expiry_date' => $expiryDate,
                'total_premium' => $quotation->total_premium,
                'sum_insured' => $quotation->items->sum('sum_insured'),
                'terms_and_conditions' => 'Standard terms and conditions apply. Subject to policy wordings and endorsements.',
            ]);

            // Create coverages from quotation items
            foreach ($quotation->items as $item) {
                $policy->coverages()->create([
                    'coverage_name' => $item->insuranceProduct->name ?? 'General Coverage',
                    'coverage_description' => $item->description,
                    'sum_insured' => $item->sum_insured,
                    'premium_amount' => $item->premium_amount,
                    'deductible' => rand(1, 5) * 5000, // 5k to 25k deductible
                ]);
            }
        }
    }
}
