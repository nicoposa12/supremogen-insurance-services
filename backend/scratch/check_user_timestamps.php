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
    echo "Created At: {$user->created_at}\n";
    echo "Updated At: {$user->updated_at}\n";
    echo "Password Hash: {$user->password}\n";
} else {
    echo "Not found.\n";
}
