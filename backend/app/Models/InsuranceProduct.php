<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InsuranceProduct extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'category',
        'description',
        'base_premium_rate',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'base_premium_rate' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    // ── Relationships ─────────────────────

    public function quotationItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function policies(): HasMany
    {
        return $this->hasMany(Policy::class);
    }

    // ── Scopes ────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', \Illuminate\Support\Facades\DB::raw('true'));
    }
}
