<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$users = \App\Models\User::with('roles')->get();
foreach ($users as $u) {
    echo $u->id . " | " . $u->name . " | " . $u->email . " | " . implode(', ', $u->getRoleNames()->toArray()) . "\n";
}

$customers = \App\Models\Customer::limit(20)->get();
echo "\n--- CUSTOMERS ---\n";
foreach ($customers as $c) {
    $creator = \App\Models\User::find($c->created_by);
    echo "Customer ID: {$c->id} | Name: {$c->first_name} {$c->last_name} | agent col: '{$c->agent}' | created_by: {$c->created_by} (" . ($creator ? $creator->name : 'N/A') . ") | request_type: '" . ($c->request_type ?? 'N/A') . "'\n";
}

