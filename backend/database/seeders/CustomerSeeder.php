<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Specific hand-crafted transaction records matching realistic scenarios
        Customer::create([
            'customer_code' => 'CUST-00001',
            'record_no' => 'SG00001',
            'first_name' => 'Erick',
            'last_name' => 'Espedillon',
            'middle_name' => 'S.',
            'email' => 'erick@example.com',
            'mobile' => '0917-123-4567',
            'gender' => 'male',
            'date_of_birth' => '1990-05-15',
            
            // Vehicle
            'plate_no' => 'NCB8050',
            'unit' => 'Toyota Vios 1.3 XLE CVT',
            'mortgage' => 'BDO Unibank',
            
            // Policy
            'agent' => 'Juan Dela Cruz',
            'insurance_provider' => 'Standard Insurance',
            'policy_status' => 'INACTIVE',
            'policy_no' => 'MOP-123-1234-1202',
            
            // Financial
            'assured_value' => 600000.00,
            'gross_premium' => 17000.00,
            'policy_premium' => 17000.00,
            'discount' => 0.00,
            'bi_pd' => 200000.00,
            'pa' => 100000.00,
            'aog' => 250000.00,
            'policy_rate' => 1.85,
            'discount_rate' => 0.00,
            
            // Dates
            'writing_date' => '2026-05-05',
            'date_issued' => '2026-05-06',
            'inception_date' => '2026-05-07',
            'expiry_date' => '2027-05-07',
            'delivery_date' => '2026-05-08',
            'date_delivered' => '2026-05-08 14:30:00',
            
            'address_line_1' => '123 Ayala Avenue',
            'city' => 'Makati City',
            'province' => 'Metro Manila',
            'zip_code' => '1200',
            'customer_type' => 'individual',
            'status' => 'inactive', // DRAFT
        ]);

        Customer::create([
            'customer_code' => 'CUST-00002',
            'record_no' => 'SG00002',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'middle_name' => 'Santos',
            'email' => 'juan@example.com',
            'mobile' => '0918-987-6543',
            'gender' => 'male',
            'date_of_birth' => '1985-10-20',
            
            // Vehicle
            'plate_no' => 'NCI1020',
            'unit' => 'Toyota Fortuner 2.8 Q 4x2',
            'mortgage' => 'None',
            
            // Policy
            'agent' => 'Maria Santos',
            'insurance_provider' => 'Pioneer Insurance',
            'policy_status' => 'ACTIVE',
            'policy_no' => 'MOP-543-2109-8765',
            
            // Financial
            'assured_value' => 1800000.00,
            'gross_premium' => 32500.00,
            'policy_premium' => 30000.00,
            'discount' => 2500.00,
            'bi_pd' => 300000.00,
            'pa' => 150000.00,
            'aog' => 500000.00,
            'policy_rate' => 2.10,
            'discount_rate' => 7.69,
            
            // Dates
            'writing_date' => '2026-06-01',
            'date_issued' => '2026-06-02',
            'inception_date' => '2026-06-03',
            'expiry_date' => '2027-06-03',
            'delivery_date' => '2026-06-04',
            'date_delivered' => '2026-06-04 10:15:00',
            
            'address_line_1' => '456 Rizal Boulevard',
            'city' => 'Calamba City',
            'province' => 'Laguna',
            'zip_code' => '4027',
            'customer_type' => 'individual',
            'status' => 'blacklisted', // INSURED WITH BALANCE
        ]);

        Customer::create([
            'customer_code' => 'CUST-00003',
            'record_no' => 'SG00003',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'middle_name' => 'Gomez',
            'email' => 'maria@example.com',
            'mobile' => '0919-444-5555',
            'gender' => 'female',
            'date_of_birth' => '1992-12-05',
            
            // Vehicle
            'plate_no' => 'NDG5543',
            'unit' => 'Honda Civic 1.5 RS Turbo',
            'mortgage' => 'BPI',
            
            // Policy
            'agent' => 'Sarah G.',
            'insurance_provider' => 'FPG Insurance',
            'policy_status' => 'ACTIVE',
            'policy_no' => 'MOP-998-7766-5544',
            
            // Financial
            'assured_value' => 1300000.00,
            'gross_premium' => 24800.00,
            'policy_premium' => 24800.00,
            'discount' => 0.00,
            'bi_pd' => 200000.00,
            'pa' => 100000.00,
            'aog' => 350000.00,
            'policy_rate' => 1.90,
            'discount_rate' => 0.00,
            
            // Dates
            'writing_date' => '2026-06-10',
            'date_issued' => '2026-06-11',
            'inception_date' => '2026-06-12',
            'expiry_date' => '2027-06-12',
            'delivery_date' => '2026-06-13',
            'date_delivered' => '2026-06-13 16:45:00',
            
            'address_line_1' => '789 Taft Avenue',
            'city' => 'Manila',
            'province' => 'Metro Manila',
            'zip_code' => '1000',
            'customer_type' => 'individual',
            'status' => 'active', // INSURED
        ]);

        Customer::create([
            'customer_code' => 'CUST-00004',
            'record_no' => 'SG00004',
            'first_name' => 'Manuel',
            'last_name' => 'Quezon',
            'middle_name' => 'Luis',
            'email' => 'manuel@example.com',
            'mobile' => '0920-777-8888',
            'gender' => 'male',
            'date_of_birth' => '1978-08-19',
            
            // Vehicle
            'plate_no' => 'NCO9921',
            'unit' => 'Mitsubishi Xpander 1.5 GLS',
            'mortgage' => 'EastWest Bank',
            
            // Policy
            'agent' => 'Juan Dela Cruz',
            'insurance_provider' => 'Standard Insurance',
            'policy_status' => 'ACTIVE',
            'policy_no' => 'MOP-887-6655-4433',
            
            // Financial
            'assured_value' => 950000.00,
            'gross_premium' => 19200.00,
            'policy_premium' => 18200.00,
            'discount' => 1000.00,
            'bi_pd' => 200000.00,
            'pa' => 100000.00,
            'aog' => 250000.00,
            'policy_rate' => 2.02,
            'discount_rate' => 5.21,
            
            // Dates
            'writing_date' => '2026-06-15',
            'date_issued' => '2026-06-16',
            'inception_date' => '2026-06-17',
            'expiry_date' => '2027-06-17',
            'delivery_date' => '2026-06-18',
            'date_delivered' => '2026-06-18 11:00:00',
            
            'address_line_1' => '101 Aurora Boulevard',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'zip_code' => '1100',
            'customer_type' => 'individual',
            'status' => 'active', // INSURED
        ]);

        // Seed 15 additional random individual customers
        Customer::factory()->individual()->count(15)->create();

        // Seed 10 additional random corporate customers
        Customer::factory()->corporate()->count(10)->create();
    }
}
