<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Http\Request;

$admin = User::where('email', 'admin@supremogen.com')->first();
if (!$admin) {
    die("Admin not found.\n");
}

auth()->login($admin);

$request = Request::create('/api/v1/users', 'GET');
$request->setUserResolver(function () use ($admin) {
    return $admin;
});

$controller = app(UserController::class);
$response = $controller->index($request);

echo "Content: " . json_encode(json_decode($response->getContent()), JSON_PRETTY_PRINT) . "\n";
