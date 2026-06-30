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
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            
            // Polymorphic relation fields (attachable_type, attachable_id)
            $table->string('attachable_type');
            $table->unsignedBigInteger('attachable_id');
            
            $table->string('file_name', 255);
            $table->string('file_path', 255);
            $table->integer('file_size');
            $table->string('mime_type', 100);
            $table->string('document_type', 100)->nullable(); // e.g., 'valid_id', 'or_cr', 'receipt'
            
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();

            // Indexes for fast lookups
            $table->index(['attachable_type', 'attachable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
