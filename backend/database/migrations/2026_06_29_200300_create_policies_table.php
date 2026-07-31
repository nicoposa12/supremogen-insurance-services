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
        Schema::create('policies', function (Blueprint $table) {
            $table->id();
            $table->string('policy_number', 50)->nullable()->unique();
            $table->foreignId('quotation_id')->nullable()->constrained('quotations')->nullOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('insurance_product_id')->constrained('insurance_products')->cascadeOnDelete();
            $table->foreignId('issued_by')->constrained('users')->cascadeOnDelete();

            $table->enum('status', ['active', 'expired', 'cancelled', 'lapsed'])->default('active');

            $table->date('effective_date');
            $table->date('expiry_date');
            $table->decimal('total_premium', 14, 2)->default(0);
            $table->decimal('sum_insured', 14, 2)->default(0);
            $table->text('terms_and_conditions')->nullable();

            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('customer_id');
            $table->index('expiry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('policies');
    }
};
