<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

$user = User::where('name', 'mamerto')->first();
if (!$user) {
    die("User mamerto not found.\n");
}

$payload = [
    'name' => $user->name,
    'email' => $user->email,
    'role' => 'Team Renewal',
    'password' => 'Password123!',
];

$validator = Validator::make($payload, [
    'name' => 'required|string|max:255',
    'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
    'password' => [
        'nullable',
        'string',
        Password::min(8)
            ->letters()
            ->mixedCase()
            ->numbers()
            ->symbols()
    ],
    'role' => 'required|string|exists:roles,name',
]);

if ($validator->fails()) {
    echo "Validation failed:\n";
    print_r($validator->errors()->toArray());
} else {
    echo "Validation passed!\n";
}
