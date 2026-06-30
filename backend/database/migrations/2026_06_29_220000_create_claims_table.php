<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claims', function (Blueprint $table) {
            $table->id();
            $table->string('claim_number', 30)->unique();
            $table->foreignId('policy_id')->constrained('policies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('filed_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('status', [
                'filed', 'under_investigation', 'approved', 'denied', 'settled', 'closed',
            ])->default('filed');

            $table->date('incident_date');
            $table->text('incident_description');
            $table->decimal('claim_amount', 14, 2);
            $table->decimal('approved_amount', 14, 2)->nullable();
            $table->decimal('settlement_amount', 14, 2)->nullable();
            $table->text('adjuster_remarks')->nullable();
            $table->date('settlement_date')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('policy_id');
            $table->index('customer_id');
            $table->index('incident_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claims');
    }
};
