<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RoleAndPermissionSeeder;
use Tests\TestCase;

class NotificationStreamTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);
    }

    public function test_stream_without_token_is_unauthorized(): void
    {
        $response = $this->getJson('/api/v1/notifications/stream');
        $response->assertStatus(401);
    }

    public function test_stream_with_invalid_token_is_unauthorized(): void
    {
        $response = $this->getJson('/api/v1/notifications/stream?token=invalid_token');
        $response->assertStatus(401);
    }

    public function test_stream_with_valid_token_in_query_parameter_is_authorized(): void
    {
        $user = User::where('email', 'admin@supremogen.com')->first();
        $this->assertNotNull($user);

        // Generate Sanctum token
        $token = $user->createToken('test_token')->plainTextToken;

        // Perform the request
        $response = $this->getJson('/api/v1/notifications/stream?token=' . $token);

        // Assert response status and headers
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/event-stream; charset=UTF-8');
        $response->assertHeader('Cache-Control', 'no-cache, private');
    }
}
