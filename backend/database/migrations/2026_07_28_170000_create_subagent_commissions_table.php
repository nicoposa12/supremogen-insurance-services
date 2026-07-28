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
        Schema::create('subagent_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->unique()->constrained('invoices')->onDelete('cascade');
            $table->string('transac')->nullable();
            $table->string('released_to')->nullable();
            $table->string('account_number')->nullable();
            $table->date('released_date_1')->nullable();
            $table->decimal('amount_1', 14, 2)->default(0);
            $table->date('released_date_2')->nullable();
            $table->decimal('amount_2', 14, 2)->default(0);
            $table->date('released_date_3')->nullable();
            $table->decimal('amount_3', 14, 2)->default(0);
            $table->date('released_date_4')->nullable();
            $table->decimal('amount_4', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subagent_commissions');
    }
};
