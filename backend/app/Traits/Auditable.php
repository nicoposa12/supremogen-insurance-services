<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    /**
     * Log an audit entry for a sensitive action.
     *
     * @param  string       $action      Dot-notation action key (e.g. 'payment.void')
     * @param  Model|null   $model       The affected Eloquent model (nullable for auth events)
     * @param  string       $description Human-readable summary
     * @param  array|null   $oldValues   State before the change
     * @param  array|null   $newValues   State after the change
     */
    protected function audit(
        string $action,
        ?Model $model = null,
        string $description = '',
        ?array $oldValues = null,
        ?array $newValues = null,
    ): void {
        try {
            AuditLog::create([
                'user_id'         => request()->user()?->id,
                'action'          => $action,
                'auditable_type'  => $model ? get_class($model) : null,
                'auditable_id'    => $model?->getKey(),
                'description'     => $description,
                'old_values'      => $oldValues,
                'new_values'      => $newValues,
                'ip_address'      => request()->ip(),
                'user_agent'      => request()->userAgent(),
                'created_at'      => now(),
            ]);
        } catch (\Exception $e) {
            // Audit logging must never break the main action
            \Illuminate\Support\Facades\Log::error('Audit log failed: ' . $e->getMessage());
        }
    }
}
