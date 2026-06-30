<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_number', 'policy_id', 'customer_id', 'created_by',
        'status', 'due_date', 'subtotal', 'tax_amount', 'total_amount',
        'amount_paid', 'balance', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'balance' => 'decimal:2',
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get all of the invoice's attachments.
     */
    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ── Scopes ────────────────────────────

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;
        return $query->where(function ($q) use ($term) {
            $q->where('invoice_number', 'like', "%{$term}%")
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

    // ── Helpers ───────────────────────────

    public static function generateNumber(): string
    {
        $year = now()->format('Y');
        $latest = static::withTrashed()
            ->where('invoice_number', 'like', "INV-{$year}-%")
            ->orderByDesc('id')->first();

        $nextSeq = $latest ? ((int) substr($latest->invoice_number, -5)) + 1 : 1;
        return "INV-{$year}-" . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Recalculate totals from items and payments.
     */
    public function recalculate(): void
    {
        $this->subtotal = $this->items()->sum('amount');
        $this->total_amount = $this->subtotal + $this->tax_amount;
        $this->amount_paid = $this->payments()->where('status', 'completed')->sum('amount');
        $this->balance = $this->total_amount - $this->amount_paid;

        // Auto-update status based on balance
        if ($this->status !== 'cancelled' && $this->status !== 'draft') {
            if ($this->balance <= 0) {
                $this->status = 'paid';
            } elseif ($this->amount_paid > 0) {
                $this->status = 'partial';
            }
        }

        $this->saveQuietly();
    }
}
