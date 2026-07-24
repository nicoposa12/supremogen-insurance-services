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
        Schema::table('quotations', function (Blueprint $table) {
            if (!Schema::hasColumn('quotations', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('reviewer_remarks');
            }
            if (!Schema::hasColumn('quotations', 'cancellation_details')) {
                $table->json('cancellation_details')->nullable()->after('cancellation_reason');
            }
            if (!Schema::hasColumn('quotations', 'cancellation_requested_by')) {
                $table->foreignId('cancellation_requested_by')->nullable()->after('cancellation_details')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('quotations', 'cancellation_requested_at')) {
                $table->timestamp('cancellation_requested_at')->nullable()->after('cancellation_requested_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            if (Schema::hasColumn('quotations', 'cancellation_requested_by')) {
                $table->dropForeign(['cancellation_requested_by']);
                $table->dropColumn('cancellation_requested_by');
            }
            $table->dropColumn([
                'cancellation_reason',
                'cancellation_details',
                'cancellation_requested_at',
            ]);
        });
    }
};
