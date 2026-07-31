<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\Policy;
use App\Models\Notification;
use App\Models\InsuranceProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RoleAndPermissionSeeder;
use Tests\TestCase;

class PolicyAssignmentNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $underwriter;
    protected User $salesAgent;
    protected User $teamRenewal;
    protected Customer $customer;
    protected Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->underwriter = User::create([
            'name' => 'Michael Underwriter',
            'email' => 'underwriter@supremogen.com',
            'password' => bcrypt('password'),
        ]);
        $this->underwriter->assignRole('Underwriter');

        $this->salesAgent = User::create([
            'name' => 'Nicomar Sales Agent',
            'email' => 'salesagent@supremogen.com',
            'password' => bcrypt('password'),
        ]);
        $this->salesAgent->assignRole('Sales Agent');

        $this->teamRenewal = User::create([
            'name' => 'Renewal Agent',
            'email' => 'renewal@supremogen.com',
            'password' => bcrypt('password'),
        ]);
        $this->teamRenewal->assignRole('Team Renewal');

        $this->customer = Customer::create([
            'customer_code' => 'CUST-00001',
            'first_name' => 'Clint',
            'last_name' => 'Buar',
            'email' => 'clint@example.com',
            'created_by' => $this->salesAgent->id,
        ]);

        $this->quotation = Quotation::create([
            'quotation_number' => 'QUO-2026-00099',
            'customer_id' => $this->customer->id,
            'prepared_by' => $this->salesAgent->id,
            'status' => 'submitted',
            'total_premium' => 15000.00,
        ]);
    }

    public function test_sales_agent_is_notified_when_underwriter_approves_quotation_with_policy_number(): void
    {
        $response = $this->actingAs($this->underwriter)->postJson("/api/v1/quotations/{$this->quotation->id}/review", [
            'action' => 'approve',
            'policy_number' => 'POL-2026-00099',
            'reviewer_remarks' => 'Approved with policy number',
        ]);

        $response->assertStatus(200);

        $notification = Notification::where('user_id', $this->salesAgent->id)->first();
        $this->assertNotNull($notification);
        $this->assertEquals('Policy Number Assigned', $notification->title);
        $this->assertStringContainsString('POL-2026-00099', $notification->message);
        $this->assertStringContainsString('QUO-2026-00099', $notification->message);
        $this->assertStringContainsString('Michael Underwriter', $notification->message);
    }

    public function test_sales_agent_is_notified_when_underwriter_updates_metadata_policy_number(): void
    {
        $response = $this->actingAs($this->underwriter)->postJson("/api/v1/quotations/{$this->quotation->id}/metadata", [
            'policy_number' => 'MCP-99999',
        ]);

        $response->assertStatus(200);

        $notification = Notification::where('user_id', $this->salesAgent->id)->first();
        $this->assertNotNull($notification);
        $this->assertEquals('Policy Number Assigned', $notification->title);
        $this->assertStringContainsString('MCP-99999', $notification->message);
    }

    public function test_sales_agent_is_notified_when_underwriter_updates_customer_policy_no(): void
    {
        $response = $this->actingAs($this->underwriter)->putJson("/api/v1/customers/{$this->customer->id}", [
            'first_name' => 'Clint',
            'last_name' => 'Buar',
            'email' => 'clint@example.com',
            'policy_no' => 'POL-CUST-12345',
        ]);

        $response->assertStatus(200);

        $notification = Notification::where('user_id', $this->salesAgent->id)->first();
        $this->assertNotNull($notification);
        $this->assertEquals('Policy Number Assigned', $notification->title);
        $this->assertStringContainsString('POL-CUST-12345', $notification->message);
    }
}
