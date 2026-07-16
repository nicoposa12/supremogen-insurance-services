<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Database\Factories\CustomerFactory;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'customer_code',
        'record_no',
        'first_name',
        'last_name',
        'middle_name',
        'suffix',
        'date_of_birth',
        'gender',
        'email',
        'phone',
        'mobile',
        'plate_no',
        'unit',
        'mortgage',
        'agent',
        'insurance_provider',
        'policy_status',
        'policy_no',
        'assured_value',
        'gross_premium',
        'policy_premium',
        'discount',
        'bi_pd',
        'pa',
        'aog',
        'policy_rate',
        'discount_rate',
        'writing_date',
        'date_issued',
        'inception_date',
        'expiry_date',
        'delivery_date',
        'date_delivered',
        'address_line_1',
        'address_line_2',
        'city',
        'province',
        'zip_code',
        'customer_type',
        'company_name',
        'tin',
        'status',
        'notes',
        'created_by',
        
        // Revised fields
        'request_type',
        'activity',
        'quotation_used',
        'usage',
        'chassis_no',
        'engine_no',
        'color',
        'ownership',
        'own_damage_coverage',
        'bi_coverage',
        'pd_coverage',
        'payment_terms',
        'agent_markup',
        'sub_agent_markup',
        'sub_agent_name',
        'freebie',
        'receiver_name',
        'delivery_address',
        'landmark',
        'backup_phone',
        'fb_link',
        'used_rate_type',
        'used_rate',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'approved',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'writing_date' => 'date',
            'date_issued' => 'date',
            'inception_date' => 'date',
            'expiry_date' => 'date',
            'delivery_date' => 'date',
            'date_delivered' => 'date',
            'assured_value' => 'decimal:2',
            'gross_premium' => 'decimal:2',
            'policy_premium' => 'decimal:2',
            'discount' => 'decimal:2',
            'bi_pd' => 'decimal:2',
            'pa' => 'decimal:2',
            'aog' => 'decimal:2',
            'policy_rate' => 'decimal:4',
            'discount_rate' => 'decimal:4',
            
            // Revised fields decimals
            'own_damage_coverage' => 'decimal:2',
            'bi_coverage' => 'decimal:2',
            'pd_coverage' => 'decimal:2',
            'agent_markup' => 'decimal:2',
            'sub_agent_markup' => 'decimal:2',
            'freebie' => 'decimal:2',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($customer) {
            if (!$customer->record_no) {
                $customer->record_no = static::generateRecordNo();
            }
        });
    }

    /**
     * Create a new factory instance for the model.
     */
    protected static function newFactory(): CustomerFactory
    {
        return CustomerFactory::new();
    }

    // ──────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────

    /**
     * Get the customer's full name.
     */
    public function getFullNameAttribute(): string
    {
        $parts = array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->suffix,
        ]);

        return implode(' ', $parts);
    }

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    /**
     * Documents uploaded for this customer.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(CustomerDocument::class);
    }

    /**
     * User who registered the customer.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ──────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────

    /**
     * Scope: search by name, email, phone, or customer code.
     */
    public function scopeSearch($query, ?string $term)
    {
        if (!$term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('first_name', 'like', "%{$term}%")
              ->orWhere('last_name', 'like', "%{$term}%")
              ->orWhere('email', 'like', "%{$term}%")
              ->orWhere('phone', 'like', "%{$term}%")
              ->orWhere('mobile', 'like', "%{$term}%")
              ->orWhere('customer_code', 'like', "%{$term}%")
              ->orWhere('company_name', 'like', "%{$term}%")
              ->orWhere('plate_no', 'like', "%{$term}%")
              ->orWhere('policy_no', 'like', "%{$term}%");
        });
    }

    /**
     * Scope: filter by status.
     */
    public function scopeOfStatus($query, ?string $status)
    {
        if (!$status || $status === 'all') {
            return $query;
        }

        return $query->where('status', $status);
    }

    /**
     * Scope: filter by customer type.
     */
    public function scopeOfType($query, ?string $type)
    {
        if (!$type || $type === 'all') {
            return $query;
        }

        return $query->where('customer_type', $type);
    }

    // ──────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────

    /**
     * Generate a unique customer code (e.g. CUST-00001).
     */
    public static function generateCode(): string
    {
        $latest = static::withTrashed()->orderByDesc('id')->first();
        $nextId = $latest ? $latest->id + 1 : 1;

        return 'CUST-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Generate a unique record number (e.g. SG00001).
     */
    public static function generateRecordNo(): string
    {
        $latest = static::withTrashed()->orderByDesc('id')->first();
        $nextId = $latest ? $latest->id + 1 : 1;

        return 'SG' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Get all of the customer's attachments.
     */
    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * Quotations for this customer.
     */
    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    /**
     * Get the customer's approved status.
     */
    public function getApprovedAttribute(): string
    {
        return $this->quotations()->where('status', 'approved')->exists() ? 'YES' : 'NO';
    }

    /**
     * Scope: filter customers with approved quotations.
     */
    public function scopeApproved($query)
    {
        return $query->whereHas('quotations', function ($q) {
            $q->where('status', 'approved');
        });
    }
}
