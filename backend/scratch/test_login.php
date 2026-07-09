<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Http\Request;

$request = Request::create('/api/v1/auth/login', 'POST', [
    'email' => 'mamerto',
    'password' => 'Password123!',
]);

$controller = app(AuthController::class);
$response = $controller->login($request);

echo "Status Code: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
