<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define permissions
        $permissions = [
            // Dashboard
            'dashboard.view',

            // Customers
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',

            // Quotations
            'quotations.view',
            'quotations.create',
            'quotations.update',
            'quotations.delete',
            'quotations.submit',
            'quotations.approve',
            'quotations.reject',

            // Policies
            'policies.view',
            'policies.create',
            'policies.update',
            'policies.delete',
            'policies.print',
            'policies.cancel',

            // Claims
            'claims.view',
            'claims.create',
            'claims.update',
            'claims.delete',
            'claims.approve',
            'claims.reject',
            'claims.settle',

            // Invoices
            'invoices.view',
            'invoices.create',
            'invoices.update',
            'invoices.delete',
            'invoices.print',

            // Payments
            'payments.view',
            'payments.create',
            'payments.update',
            'payments.delete',

            // Renewals
            'renewals.view',
            'renewals.create',
            'renewals.update',
            'renewals.delete',

            // Reports
            'reports.view',
            'reports.export',

            // Users
            'users.view',
            'users.create',
            'users.update',
            'users.delete',

            // Settings
            'settings.view',
            'settings.update',
        ];

        // Create permissions
        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission);
        }

        // Create roles and assign existing permissions

        // 1. Administrator - Full Permissions
        $adminRole = Role::findOrCreate('Administrator');
        $adminRole->givePermissionTo(Permission::all());

        // 2. Sales Agent
        $agentRole = Role::findOrCreate('Sales Agent');
        $agentRole->givePermissionTo([
            'dashboard.view',
            'customers.view',
            'customers.create',
            'customers.update',
            'quotations.view',
            'quotations.create',
            'quotations.update',
            'quotations.submit',
            'policies.view',
            'invoices.view',
            'renewals.view',
            'renewals.create',
            'reports.view',
        ]);

        // 3. Underwriter
        $underwriterRole = Role::findOrCreate('Underwriter');
        $underwriterRole->givePermissionTo([
            'dashboard.view',
            'customers.view',
            'quotations.view',
            'quotations.approve',
            'quotations.reject',
            'policies.view',
            'policies.create',
            'policies.update',
            'settings.view',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
        ]);

        // 4. Accounting Officer
        $accountingRole = Role::findOrCreate('Accounting Officer');
        $accountingRole->givePermissionTo([
            'dashboard.view',
            'customers.view',
            'policies.view',
            'invoices.view',
            'invoices.create',
            'invoices.update',
            'payments.view',
            'payments.create',
            'reports.view',
        ]);

        // 5. Claims Officer
        $claimsRole = Role::findOrCreate('Claims Officer');
        $claimsRole->givePermissionTo([
            'dashboard.view',
            'customers.view',
            'policies.view',
            'claims.view',
            'claims.update',
            'claims.approve',
            'claims.reject',
            'claims.settle',
            'reports.view',
        ]);

        // 6. Customer
        $customerRole = Role::findOrCreate('Customer');
        $customerRole->givePermissionTo([
            'dashboard.view',
        ]);

        // 7. Team Renewal
        $renewalRole = Role::findOrCreate('Team Renewal');
        $renewalRole->givePermissionTo([
            'dashboard.view',
            'customers.view',
            'customers.create',
            'customers.update',
            'quotations.view',
            'quotations.create',
            'quotations.update',
            'quotations.submit',
            'policies.view',
            'invoices.view',
            'renewals.view',
            'renewals.create',
            'reports.view',
        ]);

        // 8. Collection
        $collectionRole = Role::findOrCreate('Collection');
        $collectionRole->givePermissionTo([
            'dashboard.view',
            'customers.view',
            'invoices.view',
            'payments.view',
            'payments.create',
            'reports.view',
        ]);

        // Create the default administrator account only.
        // All other user accounts should be created through the application's Settings panel.
        $defaultUsers = [
            [
                'name' => 'System Admin',
                'email' => 'admin@supremogen.com',
                'role' => 'Administrator',
            ],
        ];

        foreach ($defaultUsers as $u) {
            $user = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make('password'),
                ]
            );
            $user->syncRoles([$u['role']]);
        }
    }
}
