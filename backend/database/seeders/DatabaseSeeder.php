<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            // CustomerSeeder::class,
            InsuranceProductSeeder::class,
            // QuotationSeeder::class,
            // PolicySeeder::class,
            // InvoiceSeeder::class,
            // PaymentSeeder::class,
            // ClaimSeeder::class,
            // RenewalSeeder::class,
            NotificationSeeder::class,
        ]);
    }
}
