<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('record_no', 30)->nullable()->unique()->after('customer_code');
            $table->string('plate_no', 30)->nullable()->after('mobile');
            $table->string('unit', 100)->nullable()->after('plate_no');
            $table->string('mortgage', 100)->nullable()->after('unit');
            $table->string('agent', 100)->nullable()->after('mortgage');
            $table->string('insurance_provider', 100)->nullable()->after('agent');
            $table->string('policy_status', 30)->default('ACTIVE')->after('insurance_provider');
            $table->string('policy_no', 50)->nullable()->after('policy_status');

            // Financial details
            $table->decimal('assured_value', 14, 2)->default(0)->after('policy_no');
            $table->decimal('gross_premium', 14, 2)->default(0)->after('assured_value');
            $table->decimal('policy_premium', 14, 2)->default(0)->after('gross_premium');
            $table->decimal('discount', 14, 2)->default(0)->after('policy_premium');
            $table->decimal('bi_pd', 14, 2)->default(0)->after('discount');
            $table->decimal('pa', 14, 2)->default(0)->after('bi_pd');
            $table->decimal('aog', 14, 2)->default(0)->after('pa');
            $table->decimal('policy_rate', 8, 4)->default(0)->after('aog');
            $table->decimal('discount_rate', 8, 4)->default(0)->after('policy_rate');

            // Dates
            $table->date('writing_date')->nullable()->after('discount_rate');
            $table->date('date_issued')->nullable()->after('writing_date');
            $table->date('inception_date')->nullable()->after('date_issued');
            $table->date('expiry_date')->nullable()->after('inception_date');
            $table->date('delivery_date')->nullable()->after('expiry_date');
            $table->date('date_delivered')->nullable()->after('delivery_date');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'record_no', 'plate_no', 'unit', 'mortgage', 'agent', 'insurance_provider',
                'policy_status', 'policy_no', 'assured_value', 'gross_premium', 'policy_premium',
                'discount', 'bi_pd', 'pa', 'aog', 'policy_rate', 'discount_rate',
                'writing_date', 'date_issued', 'inception_date', 'expiry_date', 'delivery_date', 'date_delivered'
            ]);
        });
    }
};
