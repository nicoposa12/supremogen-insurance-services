<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Claim extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'claim_number', 'policy_id', 'customer_id', 'filed_by', 'assigned_to',
        'status', 'incident_date', 'incident_description',
        'claim_amount', 'approved_amount', 'settlement_amount',
        'adjuster_remarks', 'settlement_date',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'settlement_date' => 'date',
            'claim_amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'settlement_amount' => 'decimal:2',
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

    public function filedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'filed_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get all of the claim's attachments.
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
            $q->where('claim_number', $likeOperator, "%{$term}%")
              ->orWhereHas('customer', fn($cq) =>
                  $cq->where('first_name', $likeOperator, "%{$term}%")
                     ->orWhere('last_name', $likeOperator, "%{$term}%")
                     ->orWhere('customer_code', $likeOperator, "%{$term}%")
              )
              ->orWhereHas('policy', fn($pq) =>
                  $pq->where('policy_number', $likeOperator, "%{$term}%")
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
        $latest = static::withTrashed()
            ->where('claim_number', 'like', "CLM-{$year}-%")
            ->orderByDesc('id')->first();

        $nextSeq = $latest ? ((int) substr($latest->claim_number, -5)) + 1 : 1;
        return "CLM-{$year}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }
}
