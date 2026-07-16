<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claim_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 20)->unique();

            // Assured details
            $table->string('assured_name');
            $table->string('contact_number')->nullable();
            $table->string('email_address')->nullable();

            // Policy / insurance details
            $table->string('insurance_provider');
            $table->string('plate_number')->nullable();
            $table->string('policy_number');
            $table->date('inception_date')->nullable();

            // Incident details
            $table->date('accident_date');
            $table->text('nature_of_claims');
            $table->text('notes')->nullable();

            // Workflow
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 30)->default('pending'); // pending, acknowledged
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('submitted_by');
            $table->index('accident_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claim_notifications');
    }
};
