<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Renewal extends Model
{
    protected $fillable = [
        'renewal_number', 'policy_id', 'customer_id', 'new_policy_id',
        'processed_by', 'status', 'original_expiry_date',
        'new_effective_date', 'new_expiry_date', 'premium_adjustment', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'original_expiry_date' => 'date',
            'new_effective_date' => 'date',
            'new_expiry_date' => 'date',
            'premium_adjustment' => 'decimal:2',
        ];
    }

    // ── Relationships ─────────────────────

    public function policy(): BelongsTo
    {
        return $this->belongsTo(Policy::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function newPolicy(): BelongsTo
    {
        return $this->belongsTo(Policy::class, 'new_policy_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    // ── Scopes ────────────────────────────

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;
        
        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $likeOperator = $driver === 'pgsql' ? 'ilike' : 'like';

        return $query->where(function ($q) use ($term, $likeOperator) {
            $q->where('renewal_number', $likeOperator, "%{$term}%")
              ->orWhereHas('policy', fn($pq) =>
                  $pq->where('policy_number', $likeOperator, "%{$term}%")
              )
              ->orWhereHas('customer', fn($cq) =>
                  $cq->where('first_name', $likeOperator, "%{$term}%")
                     ->orWhere('last_name', $likeOperator, "%{$term}%")
              );
        });
    }

    public function scopeOfStatus($query, ?string $status)
    {
        if (!$status || $status === 'all') return $query;
        return $query->where('status', $status);
    }

    // ── Helpers ───────────────────────────

    public static function generateNumber(): string
    {
        $year = now()->format('Y');
        $latest = static::where('renewal_number', 'like', "RNW-{$year}-%")
            ->orderByDesc('id')->first();

        $nextSeq = $latest ? ((int) substr($latest->renewal_number, -5)) + 1 : 1;
        return "RNW-{$year}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }
}
