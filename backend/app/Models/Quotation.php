<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'quotation_number',
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
        ];
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

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
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

        return $query->where(function ($q) use ($term) {
            $q->where('quotation_number', 'like', "%{$term}%")
              ->orWhere('notes', 'like', "%{$term}%")
              ->orWhereHas('customer', function ($cq) use ($term) {
                  $cq->where('first_name', 'like', "%{$term}%")
                     ->orWhere('last_name', 'like', "%{$term}%")
                     ->orWhere('customer_code', 'like', "%{$term}%");
              });
        });
    }

    public function scopeOfStatus($query, ?string $status)
    {
        if (!$status || $status === 'all') return $query;
        return $query->where('status', $status);
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
     * Recalculate total premium from items.
     */
    public function recalculateTotalPremium(): void
    {
        $this->total_premium = $this->items()->sum('premium_amount');
        $this->saveQuietly();
    }
}
