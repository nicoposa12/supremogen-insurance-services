<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'quotation_id',
        'insurance_product_id',
        'description',
        'sum_insured',
        'premium_rate',
        'premium_amount',
        'coverage_details',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sum_insured' => 'decimal:2',
            'premium_rate' => 'decimal:4',
            'premium_amount' => 'decimal:2',
            'coverage_details' => 'array',
        ];
    }

    // ── Relationships ─────────────────────

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function insuranceProduct(): BelongsTo
    {
        return $this->belongsTo(InsuranceProduct::class);
    }
}
