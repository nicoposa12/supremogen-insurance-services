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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('request_type', 50)->nullable()->after('customer_type');
            $table->string('activity', 50)->nullable()->after('request_type');
            $table->string('quotation_used', 50)->nullable()->after('insurance_provider');
            $table->string('usage', 50)->nullable()->after('quotation_used');
            $table->string('chassis_no', 100)->nullable()->after('plate_no');
            $table->string('engine_no', 100)->nullable()->after('chassis_no');
            $table->string('color', 50)->nullable()->after('engine_no');
            $table->string('ownership', 50)->nullable()->after('unit');
            
            $table->decimal('own_damage_coverage', 14, 2)->default(0)->after('assured_value');
            $table->decimal('bi_coverage', 14, 2)->default(0)->after('bi_pd');
            $table->decimal('pd_coverage', 14, 2)->default(0)->after('bi_coverage');
            $table->string('payment_terms', 20)->nullable()->after('discount_rate');
            $table->decimal('agent_markup', 14, 2)->default(0)->after('payment_terms');
            $table->decimal('sub_agent_markup', 14, 2)->default(0)->after('agent_markup');
            $table->string('sub_agent_name', 100)->nullable()->after('sub_agent_markup');
            $table->decimal('freebie', 14, 2)->default(0)->after('sub_agent_name');
            
            $table->string('receiver_name', 150)->nullable()->after('zip_code');
            $table->string('delivery_address', 255)->nullable()->after('receiver_name');
            $table->string('landmark', 255)->nullable()->after('delivery_address');
            $table->string('backup_phone', 30)->nullable()->after('mobile');
            $table->string('fb_link', 255)->nullable()->after('backup_phone');
            
            $table->string('used_rate_type', 50)->nullable()->after('discount_rate');
            $table->string('used_rate', 100)->nullable()->after('used_rate_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'request_type', 'activity', 'quotation_used', 'usage', 'chassis_no', 'engine_no',
                'color', 'ownership', 'own_damage_coverage', 'bi_coverage', 'pd_coverage',
                'payment_terms', 'agent_markup', 'sub_agent_markup', 'sub_agent_name', 'freebie',
                'receiver_name', 'delivery_address', 'landmark', 'backup_phone', 'fb_link',
                'used_rate_type', 'used_rate'
            ]);
        });
    }
};
