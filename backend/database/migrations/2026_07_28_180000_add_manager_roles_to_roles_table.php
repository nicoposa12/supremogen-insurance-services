<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $viewPermissions = [
            'dashboard.view',
            'customers.view',
            'quotations.view',
            'policies.view',
            'claims.view',
            'invoices.view',
            'payments.view',
            'renewals.view',
            'reports.view',
            'users.view',
            'settings.view',
        ];

        // Ensure permissions exist
        foreach ($viewPermissions as $perm) {
            Permission::findOrCreate($perm);
        }

        $gmRole = Role::findOrCreate('General Manager', 'web');
        $gmRole->givePermissionTo($viewPermissions);

        $omRole = Role::findOrCreate('Operational Manager', 'web');
        $omRole->givePermissionTo($viewPermissions);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
