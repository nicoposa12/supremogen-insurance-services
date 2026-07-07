<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\User;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\Policy;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            // Get all users who have the Sales Agent role
            $agents = User::role('Sales Agent')->get();
        } catch (\Spatie\Permission\Exceptions\RoleDoesNotExist $e) {
            return;
        }
        
        if ($agents->isEmpty()) {
            return;
        }

        $agentCount = $agents->count();

        // 1. Distribute Customers
        $customers = Customer::all();
        foreach ($customers as $index => $customer) {
            $agent = $agents[$index % $agentCount];
            $customer->update(['created_by' => $agent->id]);
        }

        // 2. Distribute Quotations
        $quotations = Quotation::all();
        foreach ($quotations as $index => $quotation) {
            $agent = $agents[$index % $agentCount];
            $quotation->update(['prepared_by' => $agent->id]);
        }

        // 3. Distribute Policies
        $policies = Policy::all();
        foreach ($policies as $index => $policy) {
            $agent = $agents[$index % $agentCount];
            $policy->update(['issued_by' => $agent->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
