<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'payment_number', 'invoice_id', 'received_by',
        'amount', 'payment_method', 'payment_date',
        'reference_number', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    // ── Relationships ─────────────────────

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

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
            $q->where('payment_number', $likeOperator, "%{$term}%")
              ->orWhere('reference_number', $likeOperator, "%{$term}%")
              ->orWhereHas('invoice', function ($iq) use ($term, $likeOperator) {
                  $iq->where('invoice_number', $likeOperator, "%{$term}%");
              });
        });
    }

    public function scopeOfStatus($query, ?string $status)
    {
        if (!$status || $status === 'all') return $query;
        return $query->where('status', $status);
    }

    public function scopeOfMethod($query, ?string $method)
    {
        if (!$method || $method === 'all') return $query;
        return $query->where('payment_method', $method);
    }

    // ── Helpers ───────────────────────────

    public static function generateNumber(): string
    {
        $year = now()->format('Y');
        $latest = static::withTrashed()
            ->where('payment_number', 'like', "PAY-{$year}-%")
            ->orderByDesc('id')->first();

        $nextSeq = $latest ? ((int) substr($latest->payment_number, -5)) + 1 : 1;
        return "PAY-{$year}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }
}
