<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('name', 'mamerto')->first();
if ($user) {
    echo "User found: {$user->name} | Email: {$user->email}\n";
    $passwordsToCheck = ['Password123!', 'password'];
    foreach ($passwordsToCheck as $pass) {
        $check = Hash::check($pass, $user->password) ? "YES" : "NO";
        echo "Matches '{$pass}': {$check}\n";
    }
} else {
    echo "User mamerto not found.\n";
}
