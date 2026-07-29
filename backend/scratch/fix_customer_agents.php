<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Customer;

$salesAgents = User::role('Sales Agent')->get();
$renewalAgents = User::role('Team Renewal')->get();

$nico = User::where('name', 'like', '%nico%')->orWhere('email', 'nico@gmail.com')->first();
$ella = User::where('name', 'like', '%ella%')->orWhere('email', 'el@gmail.com')->first();
$mamerto = User::where('name', 'like', '%mamerto%')->orWhere('email', 'mamerto@gmail.com')->first();

echo "Sales Agents found: " . $salesAgents->pluck('name')->implode(', ') . "\n";
echo "Renewal Agents found: " . $renewalAgents->pluck('name')->implode(', ') . "\n";

$updatedCount = 0;
$customers = Customer::all();

foreach ($customers as $c) {
    $changed = false;
    $requestType = strtoupper($c->request_type ?? '');
    $currentAgent = strtolower($c->agent ?? '');

    // Map Mamerto / Renewal
    if ($requestType === 'RENEWAL CLIENT' || str_contains($currentAgent, 'mamerto') || $c->activity === 'RENEWAL') {
        if ($mamerto) {
            $c->created_by = $mamerto->id;
            $c->agent = $mamerto->name;
            $changed = true;
        }
    } else if (str_contains($currentAgent, 'ella') || str_contains(strtolower($c->first_name . ' ' . $c->last_name), 'ella')) {
        if ($ella) {
            $c->created_by = $ella->id;
            $c->agent = $ella->name;
            $changed = true;
        }
    } else if (str_contains($currentAgent, 'nico') || str_contains($currentAgent, 'oposa') || empty($c->agent)) {
        if ($nico) {
            $c->created_by = $nico->id;
            $c->agent = $nico->name;
            $changed = true;
        }
    } else {
        // Find matching agent user by name
        $matchingUser = User::role(['Sales Agent', 'Team Renewal'])
            ->where('name', 'ilike', '%' . $c->agent . '%')
            ->first();
        if ($matchingUser) {
            $c->created_by = $matchingUser->id;
            $c->agent = $matchingUser->name;
            $changed = true;
        }
    }

    if ($changed) {
        $c->save();
        $updatedCount++;
    }
}

echo "Successfully aligned {$updatedCount} customer records with accurate registered agents!\n";
