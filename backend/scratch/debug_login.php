<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

// Test: what does the login query actually return for various inputs?
$testInputs = ['mamerto', 'mamer@gmail.com', 'admin@supremogen.com', 'System Admin'];

foreach ($testInputs as $input) {
    $user = User::where('email', $input)
        ->orWhere('name', $input)
        ->first();
    
    if ($user) {
        echo "Input: '{$input}' => Found user ID:{$user->id} Name:'{$user->name}' Email:'{$user->email}'\n";
    } else {
        echo "Input: '{$input}' => No user found\n";
    }
}

// Now test: can we login with a custom password after resetting?
echo "\n--- Password Hash Test ---\n";
$mamerto = User::find(11);
echo "Current password hash for mamerto: {$mamerto->password}\n";
echo "Hash::check('Password123!', hash): " . (Illuminate\Support\Facades\Hash::check('Password123!', $mamerto->password) ? 'YES' : 'NO') . "\n";

// Simulate what happens when someone types a CUSTOM password
$customPasswords = ['Test@1234', 'Custom1!', 'MyP@ss123'];
foreach ($customPasswords as $pwd) {
    $newHash = Illuminate\Support\Facades\Hash::make($pwd);
    $checkResult = Illuminate\Support\Facades\Hash::check($pwd, $newHash);
    echo "Password: '{$pwd}' => Hash check: " . ($checkResult ? 'YES' : 'NO') . "\n";
}
