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
        Schema::table('attachments', function (Blueprint $table) {
            $table->string('storage_disk')->nullable()->after('uploaded_by');
        });

        // Mark all existing attachments (uploaded before R2) that have no storage_disk
        // as 'local' so we know they were stored on the ephemeral local disk
        \App\Models\Attachment::whereNull('storage_disk')->update([
            'storage_disk' => 'local',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attachments', function (Blueprint $table) {
            $table->dropColumn('storage_disk');
        });
    }
};
