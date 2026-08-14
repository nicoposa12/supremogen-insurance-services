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

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class, 'policy_number', 'quotation_number');
    }

    // ─── Scopes ───────────────────────────────────

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (!$term) return $query;

        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $likeOperator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';

        return $query->where(function (Builder $q) use ($term, $likeOperator) {
            $q->where('reference_number', $likeOperator, "%{$term}%")
              ->orWhere('assured_name', $likeOperator, "%{$term}%")
              ->orWhere('policy_number', $likeOperator, "%{$term}%")
              ->orWhere('plate_number', $likeOperator, "%{$term}%")
              ->orWhere('insurance_provider', $likeOperator, "%{$term}%")
              ->orWhereHas('policy.quotation', function ($qq) use ($term, $likeOperator) {
                  $qq->where('quotation_number', $likeOperator, "%{$term}%")
                     ->orWhere('ir_number', $likeOperator, "%{$term}%");
              })
              ->orWhereHas('quotation', function ($qq) use ($term, $likeOperator) {
                  $qq->where('quotation_number', $likeOperator, "%{$term}%")
                     ->orWhere('ir_number', $likeOperator, "%{$term}%");
              });
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
