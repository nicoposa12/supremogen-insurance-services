<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class ClaimNotification extends Model
{
    protected $fillable = [
        'reference_number',
        'assured_name',
        'contact_number',
        'email_address',
        'insurance_provider',
        'plate_number',
        'policy_number',
        'inception_date',
        'accident_date',
        'accident_reason',
        'nature_of_claims',
        'notes',
        'claim_count',
        'submitted_by',
        'status',
        'acknowledged_by',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'inception_date'  => 'date',
            'accident_date'   => 'date',
            'acknowledged_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(Policy::class, 'policy_number', 'policy_number');
    }

    // ─── Scopes ───────────────────────────────────

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (!$term) return $query;

        return $query->where(function (Builder $q) use ($term) {
            $q->where('reference_number', 'LIKE', "%{$term}%")
              ->orWhere('assured_name', 'LIKE', "%{$term}%")
              ->orWhere('policy_number', 'LIKE', "%{$term}%")
              ->orWhere('plate_number', 'LIKE', "%{$term}%")
              ->orWhere('insurance_provider', 'LIKE', "%{$term}%");
        });
    }

    public function scopeOfStatus(Builder $query, ?string $status): Builder
    {
        if (!$status) return $query;

        return $query->where('status', $status);
    }

    // ─── Helpers ──────────────────────────────────

    /**
     * Generate a unique reference number like CLN-2026-00001.
     */
    public static function generateNumber(): string
    {
        $year = date('Y');
        $last = static::where('reference_number', 'LIKE', "CLN-{$year}-%")
            ->orderByDesc('reference_number')
            ->value('reference_number');

        $next = 1;
        if ($last) {
            $parts = explode('-', $last);
            $next  = (int) end($parts) + 1;
        }

        return sprintf('CLN-%s-%05d', $year, $next);
    }

    /**
     * Get all of the claim notification's attachments.
     */
    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
