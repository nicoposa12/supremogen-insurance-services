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
        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('quotations')->cascadeOnDelete();
            $table->foreignId('insurance_product_id')->constrained('insurance_products')->cascadeOnDelete();
            $table->string('description', 255)->nullable();
            $table->decimal('sum_insured', 14, 2)->default(0);
            $table->decimal('premium_rate', 8, 4)->default(0);
            $table->decimal('premium_amount', 14, 2)->default(0);
            $table->json('coverage_details')->nullable();
            $table->timestamps();

            $table->index('quotation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
    }
};
