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
        Schema::create('policy_coverages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('policy_id')->constrained('policies')->cascadeOnDelete();
            $table->string('coverage_name', 200);
            $table->text('coverage_description')->nullable();
            $table->decimal('sum_insured', 14, 2)->default(0);
            $table->decimal('premium_amount', 14, 2)->default(0);
            $table->decimal('deductible', 14, 2)->default(0);
            $table->timestamps();

            $table->index('policy_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('policy_coverages');
    }
};
