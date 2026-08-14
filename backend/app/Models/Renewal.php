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
        $term = trim($term);
        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $likeOperator = $driver === 'pgsql' ? 'ilike' : 'like';
        $concatExpr = ($driver === 'pgsql' || $driver === 'sqlite')
            ? "(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))"
            : "CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))";

        $words = array_filter(explode(' ', $term));

        return $query->where(function ($q) use ($term, $likeOperator, $concatExpr, $words) {
            $q->where('renewal_number', $likeOperator, "%{$term}%")
              ->orWhereHas('policy', fn($pq) =>
                  $pq->where('policy_number', $likeOperator, "%{$term}%")
              )
              ->orWhereHas('customer', function ($cq) use ($term, $likeOperator, $concatExpr, $words) {
                  $cq->where('first_name', $likeOperator, "%{$term}%")
                     ->orWhere('last_name', $likeOperator, "%{$term}%")
                     ->orWhereRaw("{$concatExpr} {$likeOperator} ?", ["%{$term}%"])
                     ->orWhere('policy_no', $likeOperator, "%{$term}%")
                     ->orWhere('plate_no', $likeOperator, "%{$term}%");

                  if (count($words) > 1) {
                      $cq->orWhere(function ($sub) use ($words, $likeOperator) {
                          foreach ($words as $w) {
                              $sub->where(function ($wQ) use ($w, $likeOperator) {
                                  $wQ->where('first_name', $likeOperator, "%{$w}%")
                                     ->orWhere('last_name', $likeOperator, "%{$w}%")
                                     ->orWhere('company_name', $likeOperator, "%{$w}%");
                              });
                          }
                      });
                  }
              });
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
