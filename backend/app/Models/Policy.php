<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Policy extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'policy_number',
        'quotation_id',
        'customer_id',
        'insurance_product_id',
        'issued_by',
        'status',
        'effective_date',
        'expiry_date',
        'total_premium',
        'sum_insured',
        'terms_and_conditions',
        'cancelled_at',
        'cancellation_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effective_date' => 'date',
            'expiry_date' => 'date',
            'total_premium' => 'decimal:2',
            'sum_insured' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    // ── Relationships ─────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function insuranceProduct(): BelongsTo
    {
        return $this->belongsTo(InsuranceProduct::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function coverages(): HasMany
    {
        return $this->hasMany(PolicyCoverage::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    /**
     * Get all of the policy's attachments.
     */
    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ── Scopes ────────────────────────────

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;

        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $likeOperator = $driver === 'pgsql' ? 'ilike' : 'like';

        return $query->where(function ($q) use ($term, $likeOperator) {
            $q->where('policy_number', $likeOperator, "%{$term}%")
              ->orWhereHas('customer', function ($cq) use ($term, $likeOperator) {
                  $cq->where('first_name', $likeOperator, "%{$term}%")
                     ->orWhere('last_name', $likeOperator, "%{$term}%")
                     ->orWhere('customer_code', $likeOperator, "%{$term}%");
              });
        });
    }

    public function scopeOfStatus($query, ?string $status)
    {
        if (!$status || $status === 'all') return $query;
        if (str_contains($status, ',')) {
            return $query->whereIn('status', explode(',', $status));
        }
        return $query->where('status', $status);
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->where('status', 'active')
            ->whereBetween('expiry_date', [now(), now()->addDays($days)]);
    }

    // ── Helpers ───────────────────────────

    /**
     * Generate a unique policy number (POL-YYYY-NNNNN).
     */
    public static function generateNumber(): string
    {
        $year = now()->format('Y');
        $latest = static::withTrashed()
            ->where('policy_number', 'like', "POL-{$year}-%")
            ->orderByDesc('id')
            ->first();

        if ($latest) {
            $lastSeq = (int) substr($latest->policy_number, -5);
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return "POL-{$year}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }
}
