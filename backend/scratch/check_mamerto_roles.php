<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::where('name', 'mamerto')->first();
if ($user) {
    echo "User: {$user->name}\n";
    echo "Roles: " . implode(', ', $user->getRoleNames()->toArray()) . "\n";
} else {
    echo "Not found.\n";
}
