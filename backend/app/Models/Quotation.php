<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quotation extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'quotation_number',
        'ir_number',
        'or_number',
        'trip_number',
        'customer_id',
        'prepared_by',
        'reviewed_by',
        'status',
        'valid_until',
        'total_premium',
        'notes',
        'reviewer_remarks',
        'submitted_at',
        'reviewed_at',
        'cancellation_reason',
        'cancellation_details',
        'cancellation_requested_by',
        'cancellation_requested_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'valid_until' => 'date',
            'total_premium' => 'decimal:2',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'cancellation_requested_at' => 'datetime',
            'cancellation_details' => 'array',
        ];
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::saving(function ($quotation) {
            if ($quotation->status !== 'draft' && empty($quotation->ir_number)) {
                $quotation->ir_number = static::generateIRNumber();
            }
        });
    }

    // ── Relationships ─────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function cancellationRequestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancellation_requested_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function policy(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Policy::class);
    }

    /**
     * Get all of the quotation's attachments.
     */
    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ── Scopes ────────────────────────────

    /**
     * Search by quotation number, customer name, or notes.
     */
    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;

        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $likeOperator = $driver === 'pgsql' ? 'ilike' : 'like';

        return $query->where(function ($q) use ($term, $likeOperator) {
            $q->where('quotation_number', $likeOperator, "%{$term}%")
              ->orWhere('ir_number', $likeOperator, "%{$term}%")
              ->orWhere('notes', $likeOperator, "%{$term}%")
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

    public function scopeBetweenDates($query, ?string $startDate, ?string $endDate)
    {
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        return $query;
    }


    /**
     * Scope for a specific sales agent.
     */
    public function scopeForAgent($query, int $userId)
    {
        return $query->where('prepared_by', $userId);
    }

    // ── Helpers ───────────────────────────

    /**
     * Generate a unique quotation number (QUO-YYYY-NNNNN).
     */
    public static function generateNumber(): string
    {
        $year = now()->format('Y');
        $latest = static::withTrashed()
            ->where('quotation_number', 'like', "QUO-{$year}-%")
            ->orderByDesc('id')
            ->first();

        if ($latest) {
            $lastSeq = (int) substr($latest->quotation_number, -5);
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return "QUO-{$year}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Generate a unique IR number (IR-YY-NNNNN).
     */
    public static function generateIRNumber(): string
    {
        $yearShort = now()->format('y');
        $latest = static::withTrashed()
            ->whereNotNull('ir_number')
            ->where('ir_number', 'like', "IR-{$yearShort}-%")
            ->orderByDesc('id')
            ->first();

        if ($latest) {
            $lastSeq = (int) substr($latest->ir_number, -5);
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return "IR-{$yearShort}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Recalculate total premium from items.
     */
    public function recalculateTotalPremium(): void
    {
        $this->total_premium = $this->items()->sum('premium_amount');
        $this->saveQuietly();
    }
}
