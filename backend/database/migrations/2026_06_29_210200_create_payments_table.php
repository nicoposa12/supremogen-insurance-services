<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_number', 30)->unique();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('received_by')->constrained('users')->cascadeOnDelete();

            $table->decimal('amount', 14, 2);
            $table->enum('payment_method', [
                'cash', 'check', 'bank_transfer', 'online', 'gcash', 'maya',
            ]);
            $table->date('payment_date');
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['completed', 'refunded', 'voided'])->default('completed');

            $table->timestamps();
            $table->softDeletes();

            $table->index('invoice_id');
            $table->index('payment_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
