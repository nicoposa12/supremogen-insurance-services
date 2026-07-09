<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\Permission\Models\Role;

$roles = Role::all();
foreach ($roles as $role) {
    echo "ID: {$role->id} | Name: '{$role->name}' | Guard: '{$role->guard_name}'\n";
}
