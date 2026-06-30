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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer_code', 20)->unique();

            // Personal Information
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('suffix', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();

            // Contact Information
            $table->string('email', 150)->unique();
            $table->string('phone', 30)->nullable();
            $table->string('mobile', 30)->nullable();

            // Address
            $table->string('address_line_1', 255)->nullable();
            $table->string('address_line_2', 255)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('zip_code', 10)->nullable();

            // Business / Corporate
            $table->enum('customer_type', ['individual', 'corporate'])->default('individual');
            $table->string('company_name', 200)->nullable();
            $table->string('tin', 30)->nullable();

            // Status & Metadata
            $table->enum('status', ['active', 'inactive', 'blacklisted'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes for common queries
            $table->index(['last_name', 'first_name']);
            $table->index('status');
            $table->index('customer_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
