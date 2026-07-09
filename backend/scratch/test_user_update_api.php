<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

$admin = User::where('email', 'admin@supremogen.com')->first();
$targetUser = User::where('name', 'mamerto')->first();

if (!$admin || !$targetUser) {
    die("Users not found.\n");
}

// Authenticate as Admin
auth()->login($admin);

// Create request
$request = Request::create("/api/v1/users/{$targetUser->id}", 'PUT', [
    'name' => $targetUser->name,
    'email' => $targetUser->email,
    'role' => $targetUser->getRoleNames()->first() ?? 'Sales Agent',
    'password' => 'Password123!',
]);

// Bind request to current user
$request->setUserResolver(function () use ($admin) {
    return $admin;
});

$controller = app(UserController::class);
$response = $controller->update($request, $targetUser);

echo "Status Code: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";

// Re-fetch user to check if password changed
$targetUser->refresh();
echo "New Password matches 'Password123!': " . (Hash::check('Password123!', $targetUser->password) ? "YES" : "NO") . "\n";
