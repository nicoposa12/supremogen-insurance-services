<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\Policy;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Notification;
use App\Models\InsuranceProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RoleAndPermissionSeeder;
use Tests\TestCase;

class CollectionNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $collectionUser;
    protected Customer $customer;
    protected InsuranceProduct $product;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seed(RoleAndPermissionSeeder::class);

        // Fetch admin
        $this->admin = User::where('email', 'admin@supremogen.com')->first();

        // Create a Collection user
        $this->collectionUser = User::create([
            'name' => 'Collection Officer',
            'email' => 'collection@supremogen.com',
            'password' => bcrypt('password'),
        ]);
        $this->collectionUser->assignRole('Collection');

        // Create an Insurance Product
        $this->product = InsuranceProduct::create([
            'name' => 'Comprehensive Motor Car',
            'code' => 'MC-COMP',
            'category' => 'motor',
            'base_premium_rate' => 2.0,
            'is_active' => true,
        ]);

        // Create a Customer
        $this->customer = Customer::create([
            'customer_code' => 'CUST-TEST01',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'policy_premium' => 12000.00,
            'inception_date' => '2026-07-01',
            'expiry_date' => '2027-07-01',
            'status' => 'active',
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_invoice_creation_notifies_collection_officers(): void
    {
        // Assert no notifications exist initially for collection officer
        $this->assertEquals(0, Notification::where('user_id', $this->collectionUser->id)->count());

        // Create an invoice
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/invoices', [
                'customer_id' => $this->customer->id,
                'due_date' => '2026-08-01',
                'subtotal' => 12000.00,
                'tax_amount' => 0.00,
                'total_amount' => 12000.00,
                'notes' => 'Test invoice note',
                'items' => [
                    [
                        'description' => 'Premium payment',
                        'quantity' => 1,
                        'unit_price' => 12000.00,
                        'amount' => 12000.00,
                    ]
                ]
            ]);

        $response->assertStatus(201);

        // Assert notification was created for Collection user
        $notifications = Notification::where('user_id', $this->collectionUser->id)->get();
        $this->assertCount(1, $notifications);
        $this->assertEquals('Invoice Issued', $notifications->first()->title);
        $this->assertStringContainsString('generated for John Doe', $notifications->first()->message);
        $this->assertStringContainsString('₱12,000.00', $notifications->first()->message);
    }

    public function test_payment_creation_notifies_collection_officers(): void
    {
        // Pre-create policy and invoice
        $policy = Policy::create([
            'policy_number' => 'POL-TEST01',
            'customer_id' => $this->customer->id,
            'insurance_product_id' => $this->product->id,
            'issued_by' => $this->admin->id,
            'status' => 'active',
            'total_premium' => 12000.00,
            'sum_insured' => 500000.00,
            'effective_date' => '2026-07-01',
            'expiry_date' => '2027-07-01',
        ]);

        $invoice = Invoice::create([
            'invoice_number' => 'INV-TEST01',
            'policy_id' => $policy->id,
            'customer_id' => $this->customer->id,
            'created_by' => $this->admin->id,
            'status' => 'sent',
            'due_date' => '2026-07-01',
            'subtotal' => 12000.00,
            'total_amount' => 12000.00,
            'amount_paid' => 0.00,
            'balance' => 12000.00,
        ]);

        // Record a payment
        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/payments', [
                'invoice_id' => $invoice->id,
                'amount' => 5000.00,
                'payment_method' => 'walk_in',
                'payment_date' => '2026-07-14',
                'reference_number' => 'REF-001',
            ]);

        $response->assertStatus(201);

        // Assert notification was created for Collection user
        $notifications = Notification::where('user_id', $this->collectionUser->id)->get();
        $this->assertCount(1, $notifications);
        $this->assertEquals('Payment Received', $notifications->first()->title);
        $this->assertStringContainsString('payment of ₱5,000.00', $notifications->first()->message);
    }
}
