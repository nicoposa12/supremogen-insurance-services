<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\InsuranceProduct;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Database\Seeder;

class QuotationSeeder extends Seeder
{
    /**
     * Seed ~20 quotations in various statuses.
     */
    public function run(): void
    {
        $agent = User::where('email', 'agent@supremogen.com')->first();
        $underwriter = User::where('email', 'underwriter@supremogen.com')->first();
        $customers = Customer::inRandomOrder()->limit(20)->get();
        $products = InsuranceProduct::all();

        if (!$agent || !$underwriter || $customers->isEmpty() || $products->isEmpty()) {
            $this->command->warn('Skipping QuotationSeeder: required data missing.');
            return;
        }

        $statuses = ['draft', 'draft', 'submitted', 'submitted', 'under_review',
                      'approved', 'approved', 'approved', 'rejected', 'expired'];

        foreach ($customers as $index => $customer) {
            $status = $statuses[$index % count($statuses)];
            $isReviewed = in_array($status, ['approved', 'rejected']);

            $quotation = Quotation::create([
                'quotation_number' => Quotation::generateNumber(),
                'customer_id' => $customer->id,
                'prepared_by' => $agent->id,
                'reviewed_by' => $isReviewed ? $underwriter->id : null,
                'status' => $status,
                'valid_until' => now()->addDays(rand(15, 60)),
                'total_premium' => 0,
                'notes' => fake()->optional(0.4)->sentence(),
                'reviewer_remarks' => $isReviewed ? fake()->sentence() : null,
                'submitted_at' => in_array($status, ['draft']) ? null : now()->subDays(rand(1, 10)),
                'reviewed_at' => $isReviewed ? now()->subDays(rand(0, 5)) : null,
            ]);

            // Add 1-3 items per quotation
            $itemCount = rand(1, 3);
            $totalPremium = 0;

            for ($i = 0; $i < $itemCount; $i++) {
                $product = $products->random();
                $sumInsured = rand(5, 50) * 100000; // 500k to 5M
                $rate = $product->base_premium_rate + (rand(-10, 10) / 100);
                $premium = round($sumInsured * ($rate / 100), 2);

                $quotation->items()->create([
                    'insurance_product_id' => $product->id,
                    'description' => "Coverage for {$customer->first_name} - {$product->name}",
                    'sum_insured' => $sumInsured,
                    'premium_rate' => $rate,
                    'premium_amount' => $premium,
                    'coverage_details' => [
                        'type' => $product->category,
                        'notes' => fake()->optional()->sentence(),
                    ],
                ]);

                $totalPremium += $premium;
            }

            $quotation->update(['total_premium' => $totalPremium]);
        }
    }
}
