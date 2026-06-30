<?php

namespace Database\Seeders;

use App\Models\InsuranceProduct;
use Illuminate\Database\Seeder;

class InsuranceProductSeeder extends Seeder
{
    /**
     * Seed standard non-life insurance products.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'Comprehensive Motor Insurance',
                'code' => 'MOT-COMP',
                'category' => 'motor',
                'description' => 'Full coverage for private and commercial vehicles including own damage, theft, and third-party liability.',
                'base_premium_rate' => 2.5000,
            ],
            [
                'name' => 'Third Party Liability - Motor',
                'code' => 'MOT-TPL',
                'category' => 'motor',
                'description' => 'Coverage for third-party bodily injury and property damage arising from vehicle use.',
                'base_premium_rate' => 1.2000,
            ],
            [
                'name' => 'Fire Insurance',
                'code' => 'FIRE-STD',
                'category' => 'fire',
                'description' => 'Protection against loss or damage to property caused by fire, lightning, and related perils.',
                'base_premium_rate' => 0.3500,
            ],
            [
                'name' => 'Marine Cargo Insurance',
                'code' => 'MAR-CARGO',
                'category' => 'marine',
                'description' => 'Coverage for goods in transit by sea, air, or land against loss or damage.',
                'base_premium_rate' => 0.5000,
            ],
            [
                'name' => 'Comprehensive General Liability',
                'code' => 'CAS-CGL',
                'category' => 'casualty',
                'description' => 'Protection against third-party claims for bodily injury and property damage arising from business operations.',
                'base_premium_rate' => 1.0000,
            ],
            [
                'name' => 'Surety Bond',
                'code' => 'BND-SURETY',
                'category' => 'bonds',
                'description' => 'Guarantee of contract performance, bid security, and other obligations.',
                'base_premium_rate' => 1.5000,
            ],
            [
                'name' => 'Personal Accident Insurance',
                'code' => 'PA-IND',
                'category' => 'personal_accident',
                'description' => 'Coverage for accidental death, dismemberment, and disability for individuals or groups.',
                'base_premium_rate' => 0.8000,
            ],
            [
                'name' => 'Contractors All Risk',
                'code' => 'ENG-CAR',
                'category' => 'engineering',
                'description' => 'Comprehensive coverage for construction projects including material damage and third-party liability.',
                'base_premium_rate' => 0.4500,
            ],
        ];

        foreach ($products as $product) {
            InsuranceProduct::updateOrCreate(
                ['code' => $product['code']],
                $product
            );
        }
    }
}
