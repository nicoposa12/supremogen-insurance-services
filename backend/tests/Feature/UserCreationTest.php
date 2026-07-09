<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Database\Seeders\RoleAndPermissionSeeder;
use Tests\TestCase;

class UserCreationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed roles and permissions
        $this->seed(RoleAndPermissionSeeder::class);
    }

    public function test_administrator_can_create_user_without_password_and_gets_default_password(): void
    {
        // Get the system admin user seeded by RoleAndPermissionSeeder
        $admin = User::where('email', 'admin@supremogen.com')->first();
        $this->assertNotNull($admin);

        // Send create user request without password
        $response = $this->actingAs($admin)
            ->postJson('/api/v1/users', [
                'name' => 'New Agent Test',
                'email' => 'new.agent@supremogen.com',
                'role' => 'Sales Agent',
            ]);

        // Assert creation succeeded
        $response->assertStatus(201);
        $response->assertJsonPath('success', true);

        // Retrieve created user
        $newUser = User::where('email', 'new.agent@supremogen.com')->first();
        $this->assertNotNull($newUser);
        
        // Verify default password
        $this->assertTrue(Hash::check('Password123!', $newUser->password));
    }
}
