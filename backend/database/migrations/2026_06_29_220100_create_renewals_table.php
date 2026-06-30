<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('renewals', function (Blueprint $table) {
            $table->id();
            $table->string('renewal_number', 30)->unique();
            $table->foreignId('policy_id')->constrained('policies')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('new_policy_id')->nullable()->constrained('policies')->nullOnDelete();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('status', ['pending', 'renewed', 'expired', 'cancelled'])->default('pending');

            $table->date('original_expiry_date');
            $table->date('new_effective_date')->nullable();
            $table->date('new_expiry_date')->nullable();
            $table->decimal('premium_adjustment', 14, 2)->default(0);
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('policy_id');
            $table->index('original_expiry_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('renewals');
    }
};
