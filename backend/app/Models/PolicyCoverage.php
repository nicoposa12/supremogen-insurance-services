<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyCoverage extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'policy_id',
        'coverage_name',
        'coverage_description',
        'sum_insured',
        'premium_amount',
        'deductible',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sum_insured' => 'decimal:2',
            'premium_amount' => 'decimal:2',
            'deductible' => 'decimal:2',
        ];
    }

    // ── Relationships ─────────────────────

    public function policy(): BelongsTo
    {
        return $this->belongsTo(Policy::class);
    }
}
