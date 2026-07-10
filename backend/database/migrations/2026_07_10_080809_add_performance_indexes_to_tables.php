<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Determine if the migration should be run within a transaction.
     *
     * @var bool
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasIndex('customers', 'customers_policy_status_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index('policy_status');
            });
        }
        if (!Schema::hasIndex('customers', 'customers_created_at_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index('created_at');
            });
        }
        if (!Schema::hasIndex('customers', 'customers_created_by_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index('created_by');
            });
        }

        if (!Schema::hasIndex('quotations', 'quotations_created_at_index')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->index('created_at');
            });
        }

        if (!Schema::hasIndex('policies', 'policies_insurance_product_id_index')) {
            Schema::table('policies', function (Blueprint $table) {
                $table->index('insurance_product_id');
            });
        }
        if (!Schema::hasIndex('policies', 'policies_issued_by_index')) {
            Schema::table('policies', function (Blueprint $table) {
                $table->index('issued_by');
            });
        }
        if (!Schema::hasIndex('policies', 'policies_created_at_index')) {
            Schema::table('policies', function (Blueprint $table) {
                $table->index('created_at');
            });
        }

        if (!Schema::hasIndex('invoices', 'invoices_policy_id_index')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->index('policy_id');
            });
        }
        if (!Schema::hasIndex('invoices', 'invoices_created_at_index')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->index('created_at');
            });
        }

        if (!Schema::hasIndex('payments', 'payments_created_at_index')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index('created_at');
            });
        }

        if (!Schema::hasIndex('claims', 'claims_created_at_index')) {
            Schema::table('claims', function (Blueprint $table) {
                $table->index('created_at');
            });
        }

        if (!Schema::hasIndex('renewals', 'renewals_created_at_index')) {
            Schema::table('renewals', function (Blueprint $table) {
                $table->index('created_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasIndex('customers', 'customers_policy_status_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropIndex(['policy_status']);
            });
        }
        if (Schema::hasIndex('customers', 'customers_created_at_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }
        if (Schema::hasIndex('customers', 'customers_created_by_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropIndex(['created_by']);
            });
        }

        if (Schema::hasIndex('quotations', 'quotations_created_at_index')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }

        if (Schema::hasIndex('policies', 'policies_insurance_product_id_index')) {
            Schema::table('policies', function (Blueprint $table) {
                $table->dropIndex(['insurance_product_id']);
            });
        }
        if (Schema::hasIndex('policies', 'policies_issued_by_index')) {
            Schema::table('policies', function (Blueprint $table) {
                $table->dropIndex(['issued_by']);
            });
        }
        if (Schema::hasIndex('policies', 'policies_created_at_index')) {
            Schema::table('policies', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }

        if (Schema::hasIndex('invoices', 'invoices_policy_id_index')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropIndex(['policy_id']);
            });
        }
        if (Schema::hasIndex('invoices', 'invoices_created_at_index')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }

        if (Schema::hasIndex('payments', 'payments_created_at_index')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }

        if (Schema::hasIndex('claims', 'claims_created_at_index')) {
            Schema::table('claims', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }

        if (Schema::hasIndex('renewals', 'renewals_created_at_index')) {
            Schema::table('renewals', function (Blueprint $table) {
                $table->dropIndex(['created_at']);
            });
        }
    }
};
