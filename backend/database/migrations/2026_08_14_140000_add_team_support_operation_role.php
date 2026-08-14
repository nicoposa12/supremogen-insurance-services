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

        $accountingPermissions = [
            'invoices.create',
            'invoices.update',
            'invoices.delete',
            'invoices.print',
            'payments.create',
            'payments.update',
            'payments.delete',
        ];

        // Ensure permissions exist
        foreach (array_merge($viewPermissions, $accountingPermissions) as $perm) {
            Permission::findOrCreate($perm);
        }

        $teamSupportRole = Role::findOrCreate('Team Support Operation', 'web');
        $teamSupportRole->givePermissionTo(array_merge($viewPermissions, $accountingPermissions));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $role = Role::findByName('Team Support Operation', 'web');
        if ($role) {
            $role->delete();
        }
    }
};
