<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

$admin = User::where('email', 'admin@supremogen.com')->first();
$targetUser = User::find(11); // mamerto

auth()->login($admin);

$customPassword = 'Test@1234';
echo "=== STEP 1: Reset password to custom '{$customPassword}' ===\n";

// Simulate the exact payload the frontend sends
$request = Request::create("/api/v1/users/{$targetUser->id}", 'PUT', [
    'name' => $targetUser->name,
    'email' => $targetUser->email,
    'role' => $targetUser->getRoleNames()->first(),
    'password' => $customPassword,
]);
$request->setUserResolver(function () use ($admin) { return $admin; });

$controller = app(UserController::class);
$response = $controller->update($request, $targetUser);

echo "Update Response Status: " . $response->getStatusCode() . "\n";
echo "Update Response: " . $response->getContent() . "\n\n";

// Re-fetch user
$targetUser->refresh();
echo "Hash check '{$customPassword}': " . (Hash::check($customPassword, $targetUser->password) ? 'YES' : 'NO') . "\n\n";

echo "=== STEP 2: Attempt login with '{$customPassword}' ===\n";

$loginRequest = Request::create('/api/v1/auth/login', 'POST', [
    'email' => 'mamerto',
    'password' => $customPassword,
]);

$authController = app(AuthController::class);
$loginResponse = $authController->login($loginRequest);

echo "Login Response Status: " . $loginResponse->getStatusCode() . "\n";
echo "Login Response: " . $loginResponse->getContent() . "\n\n";

// Now reset back to default
echo "=== STEP 3: Reset back to default 'Password123!' ===\n";
$targetUser->refresh();
$resetRequest = Request::create("/api/v1/users/{$targetUser->id}", 'PUT', [
    'name' => $targetUser->name,
    'email' => $targetUser->email,
    'role' => $targetUser->getRoleNames()->first(),
    'password' => 'Password123!',
]);
$resetRequest->setUserResolver(function () use ($admin) { return $admin; });

$resetResponse = $controller->update($resetRequest, $targetUser);
echo "Reset Response Status: " . $resetResponse->getStatusCode() . "\n";
$targetUser->refresh();
echo "Hash check 'Password123!': " . (Hash::check('Password123!', $targetUser->password) ? 'YES' : 'NO') . "\n";
