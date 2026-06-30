<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['individual', 'corporate']);
        $gross = fake()->randomFloat(2, 12000, 45000);
        $discount = fake()->randomFloat(2, 0, 5000);
        $writingDate = now()->subDays(rand(10, 60));
        $issuedDate = $writingDate->copy()->addDays(1);
        $inceptionDate = $writingDate->copy()->addDays(2);
        $expiryDate = $inceptionDate->copy()->addYear();
        $deliveryDate = $writingDate->copy()->addDays(3);

        return [
            'customer_code' => 'CUST-' . str_pad(fake()->unique()->numberBetween(1, 99999), 5, '0', STR_PAD_LEFT),
            'record_no' => 'SG' . str_pad(fake()->unique()->numberBetween(5, 99999), 5, '0', STR_PAD_LEFT),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'middle_name' => fake()->optional(0.6)->firstName(),
            'suffix' => fake()->optional(0.1)->suffix(),
            'date_of_birth' => fake()->dateTimeBetween('-65 years', '-18 years')->format('Y-m-d'),
            'gender' => fake()->randomElement(['male', 'female']),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional(0.7)->phoneNumber(),
            'mobile' => fake()->phoneNumber(),
            
            // Vehicle
            'plate_no' => fake()->regexify('[A-Z]{3}[0-9]{4}'),
            'unit' => fake()->randomElement([
                'Toyota Vios 1.3 XLE CVT', 'Honda Civic 1.5 RS Turbo', 'Mitsubishi Xpander 1.5 GLS',
                'Ford Ranger 2.0 Bi-Turbo', 'Nissan Navara 2.5 VL', 'Hyundai Tucson 2.0 GLS',
                'Suzuki Swift 1.2 GL', 'Toyota Fortuner 2.8 Q 4x2'
            ]),
            'mortgage' => fake()->randomElement(['BDO Unibank', 'BPI', 'EastWest Bank', 'None', 'None']),
            
            // Policy
            'agent' => fake()->randomElement(['Juan Dela Cruz', 'Maria Santos', 'Michael Chang', 'Sarah G.']),
            'insurance_provider' => fake()->randomElement(['Standard Insurance', 'Pioneer Insurance', 'FPG Insurance', 'MAA General Assurance']),
            'policy_status' => fake()->randomElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
            'policy_no' => 'MOP-' . fake()->numerify('###-####-####'),
            
            // Financial
            'assured_value' => fake()->randomFloat(2, 450000, 1800000),
            'gross_premium' => $gross,
            'policy_premium' => max($gross - $discount, 5000),
            'discount' => $discount,
            'bi_pd' => fake()->randomElement([100000, 200000, 300000]),
            'pa' => fake()->randomElement([50000, 100000, 150000]),
            'aog' => fake()->randomElement([150000, 250000, 500000]),
            'policy_rate' => fake()->randomFloat(4, 1.2, 2.8),
            'discount_rate' => fake()->randomFloat(4, 0.05, 0.2),
            
            // Dates
            'writing_date' => $writingDate->format('Y-m-d'),
            'date_issued' => $issuedDate->format('Y-m-d'),
            'inception_date' => $inceptionDate->format('Y-m-d'),
            'expiry_date' => $expiryDate->format('Y-m-d'),
            'delivery_date' => $deliveryDate->format('Y-m-d'),
            'date_delivered' => $deliveryDate->copy()->addHours(fake()->numberBetween(2, 24))->format('Y-m-d H:i:s'),

            'address_line_1' => fake()->streetAddress(),
            'address_line_2' => fake()->optional(0.3)->secondaryAddress(),
            'city' => fake()->city(),
            'province' => fake()->state(),
            'zip_code' => fake()->postcode(),
            'customer_type' => $type,
            'company_name' => $type === 'corporate' ? fake()->company() : null,
            'tin' => fake()->optional(0.5)->numerify('###-###-###-###'),
            'status' => fake()->randomElement(['active', 'active', 'active', 'inactive', 'blacklisted']),
            'notes' => fake()->optional(0.3)->sentence(),
        ];
    }

    /**
     * State: individual customer.
     */
    public function individual(): static
    {
        return $this->state(fn(array $attributes) => [
            'customer_type' => 'individual',
            'company_name' => null,
        ]);
    }

    /**
     * State: corporate customer.
     */
    public function corporate(): static
    {
        return $this->state(fn(array $attributes) => [
            'customer_type' => 'corporate',
            'company_name' => fake()->company(),
        ]);
    }

    /**
     * State: active customer.
     */
    public function active(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'active',
        ]);
    }
}
