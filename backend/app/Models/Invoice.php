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
        'amount_paid', 'balance', 'notes', 'cancellation_warning_sent',
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
            'cancellation_warning_sent' => 'boolean',
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

        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $likeOperator = $driver === 'pgsql' ? 'ilike' : 'like';

        $cleanTerm = trim($term);
        $cleanTermNoHyphen = str_replace('-', '', $cleanTerm);

        return $query->where(function ($q) use ($cleanTerm, $cleanTermNoHyphen, $likeOperator) {
            $q->where('invoice_number', $likeOperator, "%{$cleanTerm}%")
              ->orWhereHas('customer', function ($cq) use ($cleanTerm, $likeOperator) {
                  $cq->where('first_name', $likeOperator, "%{$cleanTerm}%")
                     ->orWhere('last_name', $likeOperator, "%{$cleanTerm}%")
                     ->orWhere('agent', $likeOperator, "%{$cleanTerm}%")
                     ->orWhere('customer_code', $likeOperator, "%{$cleanTerm}%")
                     ->orWhere('policy_no', $likeOperator, "%{$cleanTerm}%")
                     ->orWhere('plate_no', $likeOperator, "%{$cleanTerm}%");
              })
              ->orWhereHas('createdBy', function ($uq) use ($cleanTerm, $likeOperator) {
                  $uq->where('name', $likeOperator, "%{$cleanTerm}%");
              })
              ->orWhereHas('policy', function ($pq) use ($cleanTerm, $likeOperator) {
                  $pq->where('policy_number', $likeOperator, "%{$cleanTerm}%")
                     ->orWhereHas('quotation', function ($qq) use ($cleanTerm, $likeOperator) {
                         $qq->where('quotation_number', $likeOperator, "%{$cleanTerm}%")
                            ->orWhere('ir_number', $likeOperator, "%{$cleanTerm}%")
                            ->orWhereHas('preparedBy', function ($prq) use ($cleanTerm, $likeOperator) {
                                $prq->where('name', $likeOperator, "%{$cleanTerm}%");
                            });
                     });
              })
              ->orWhereHas('payments', function ($payq) use ($cleanTerm, $cleanTermNoHyphen, $likeOperator) {
                  $payq->where('payment_number', $likeOperator, "%{$cleanTerm}%")
                       ->orWhere('payment_number', $likeOperator, "%{$cleanTermNoHyphen}%")
                       ->orWhere('reference_number', $likeOperator, "%{$cleanTerm}%");
              });
        });
    }

    protected $appends = [
        'overpayment_amount',
    ];

    public function getOverpaymentAmountAttribute(): float
    {
        return max(0, (float) $this->amount_paid - (float) $this->total_amount);
    }

    public function scopeOfStatus($query, ?string $status)
    {
        if (!$status || $status === 'all') return $query;

        $statuses = explode(',', $status);
        if (in_array('overpaid', $statuses)) {
            return $query->where(function ($q) use ($statuses) {
                $q->whereIn('status', $statuses)
                  ->orWhereRaw('amount_paid > total_amount');
            });
        }

        if (count($statuses) > 1) {
            return $query->whereIn('status', $statuses);
        }

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
        $this->amount_paid = $this->payments()
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->where('verification_status', 'verified')
                  ->orWhereIn('verification_status', [
                      'REFLECTED PBCOM',
                      'REFLECTED SECURITY BANK',
                      'JNT SOA',
                      'CLEARED CHECK',
                      'reflected_pbcom',
                      'reflected_security_bank',
                      'jnt_soa',
                      'cleared_check'
                  ]);
            })
            ->sum('amount');

        // Auto-update status based on balance & overpayment
        if ($this->status !== 'cancelled' && $this->status !== 'draft') {
            if ((float) $this->amount_paid > (float) $this->total_amount + 0.01) {
                $this->status = 'overpaid';
                $this->balance = 0;
            } elseif ((float) $this->amount_paid >= (float) $this->total_amount - 0.01) {
                $this->status = 'paid';
                $this->balance = 0;
            } elseif ((float) $this->amount_paid > 0) {
                $this->status = 'partial';
                $this->balance = max(0, (float) $this->total_amount - (float) $this->amount_paid);
            } else {
                $this->status = 'sent';
                $this->balance = (float) $this->total_amount;
            }
        }

        $this->saveQuietly();
    }
}
