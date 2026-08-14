<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MainAgentCommission extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'transac',
        'released_to',
        'account_number',
        'released_date_1',
        'amount_1',
        'released_date_2',
        'amount_2',
        'released_date_3',
        'amount_3',
        'released_date_4',
        'amount_4',
        'refund_date',
        'refund_amount',
        'refund_notes',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount_1' => 'decimal:2',
            'amount_2' => 'decimal:2',
            'amount_3' => 'decimal:2',
            'amount_4' => 'decimal:2',
            'refund_amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
