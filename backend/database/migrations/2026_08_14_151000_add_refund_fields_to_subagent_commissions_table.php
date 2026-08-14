<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subagent_commissions', function (Blueprint $table) {
            if (!Schema::hasColumn('subagent_commissions', 'refund_date')) {
                $table->date('refund_date')->nullable()->after('amount_4');
            }
            if (!Schema::hasColumn('subagent_commissions', 'refund_amount')) {
                $table->decimal('refund_amount', 14, 2)->default(0)->after('refund_date');
            }
            if (!Schema::hasColumn('subagent_commissions', 'refund_notes')) {
                $table->text('refund_notes')->nullable()->after('refund_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subagent_commissions', function (Blueprint $table) {
            if (Schema::hasColumn('subagent_commissions', 'refund_notes')) {
                $table->dropColumn('refund_notes');
            }
            if (Schema::hasColumn('subagent_commissions', 'refund_amount')) {
                $table->dropColumn('refund_amount');
            }
            if (Schema::hasColumn('subagent_commissions', 'refund_date')) {
                $table->dropColumn('refund_date');
            }
        });
    }
};
