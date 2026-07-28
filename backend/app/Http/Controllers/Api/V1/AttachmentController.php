<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    private array $modelMap = [
        'customer' => \App\Models\Customer::class,
        'quotation' => \App\Models\Quotation::class,
        'policy' => \App\Models\Policy::class,
        'invoice' => \App\Models\Invoice::class,
        'claim' => \App\Models\Claim::class,
        'payment' => \App\Models\Payment::class,
        'claim_notification' => \App\Models\ClaimNotification::class,
    ];

    /**
     * Display a listing of the attachments for a specific model instance and its linked entities.
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'attachable_type' => 'required|string|in:customer,quotation,policy,invoice,claim,payment,claim_notification',
            'attachable_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 400);
        }

        $type = $request->query('attachable_type');
        $id = (int) $request->query('attachable_id');

        $modelClass = $this->modelMap[$type];
        $model = $modelClass::find($id);

        if (!$model) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        // Gather all linked attachable targets (class names and short type names)
        $targets = [
            $modelClass => [$model->id],
            $type => [$model->id],
        ];

        $customerId = $model->customer_id ?? ($model->customer?->id ?? null);
        if ($customerId) {
            $targets[\App\Models\Customer::class][] = $customerId;
            $targets['customer'][] = $customerId;
        }

        if ($type === 'invoice') {
            /** @var \App\Models\Invoice $model */
            if ($model->policy_id) {
                $targets[\App\Models\Policy::class][] = $model->policy_id;
                $targets['policy'][] = $model->policy_id;
                $policy = $model->policy;
                if ($policy && $policy->quotation_id) {
                    $targets[\App\Models\Quotation::class][] = $policy->quotation_id;
                    $targets['quotation'][] = $policy->quotation_id;
                }
            }
            $paymentIds = $model->payments()->pluck('id')->toArray();
            if (!empty($paymentIds)) {
                $targets[\App\Models\Payment::class] = $paymentIds;
                $targets['payment'] = $paymentIds;
            }
        } elseif ($type === 'quotation') {
            /** @var \App\Models\Quotation $model */
            $policies = \App\Models\Policy::where('quotation_id', $model->id)
                ->when($customerId, fn($q) => $q->orWhere('customer_id', $customerId))
                ->get();

            $policyIds = $policies->pluck('id')->toArray();
            if (!empty($policyIds)) {
                $targets[\App\Models\Policy::class] = $policyIds;
                $targets['policy'] = $policyIds;

                $invoiceIds = \App\Models\Invoice::whereIn('policy_id', $policyIds)
                    ->when($customerId, fn($q) => $q->orWhere('customer_id', $customerId))
                    ->pluck('id')->toArray();

                if (!empty($invoiceIds)) {
                    $targets[\App\Models\Invoice::class] = $invoiceIds;
                    $targets['invoice'] = $invoiceIds;
                    $paymentIds = \App\Models\Payment::whereIn('invoice_id', $invoiceIds)->pluck('id')->toArray();
                    if (!empty($paymentIds)) {
                        $targets[\App\Models\Payment::class] = $paymentIds;
                        $targets['payment'] = $paymentIds;
                    }
                }
            } elseif ($customerId) {
                $invoiceIds = \App\Models\Invoice::where('customer_id', $customerId)->pluck('id')->toArray();
                if (!empty($invoiceIds)) {
                    $targets[\App\Models\Invoice::class] = $invoiceIds;
                    $targets['invoice'] = $invoiceIds;
                }
            }
        } elseif ($type === 'policy') {
            /** @var \App\Models\Policy $model */
            if ($model->quotation_id) {
                $targets[\App\Models\Quotation::class][] = $model->quotation_id;
                $targets['quotation'][] = $model->quotation_id;
            }
            $invoiceIds = $model->invoices()->pluck('id')->toArray();
            if (!empty($invoiceIds)) {
                $targets[\App\Models\Invoice::class] = $invoiceIds;
                $targets['invoice'] = $invoiceIds;
                $paymentIds = \App\Models\Payment::whereIn('invoice_id', $invoiceIds)->pluck('id')->toArray();
                if (!empty($paymentIds)) {
                    $targets[\App\Models\Payment::class] = $paymentIds;
                    $targets['payment'] = $paymentIds;
                }
            }
        } elseif ($type === 'payment') {
            /** @var \App\Models\Payment $model */
            if ($model->invoice_id) {
                $targets[\App\Models\Invoice::class][] = $model->invoice_id;
                $targets['invoice'][] = $model->invoice_id;
                $invoice = $model->invoice;
                if ($invoice && $invoice->policy_id) {
                    $targets[\App\Models\Policy::class][] = $invoice->policy_id;
                    $targets['policy'][] = $invoice->policy_id;
                    $policy = $invoice->policy;
                    if ($policy && $policy->quotation_id) {
                        $targets[\App\Models\Quotation::class][] = $policy->quotation_id;
                        $targets['quotation'][] = $policy->quotation_id;
                    }
                }
            }
        }

        $attachments = Attachment::where(function ($query) use ($targets) {
            foreach ($targets as $class => $ids) {
                $uniqueIds = array_unique(array_filter($ids));
                if (!empty($uniqueIds)) {
                    $query->orWhere(function ($q) use ($class, $uniqueIds) {
                        $q->where('attachable_type', $class)
                          ->whereIn('attachable_id', $uniqueIds);
                    });
                }
            }
        })
        ->with('uploadedBy:id,name')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'status' => 'success',
            'data' => $attachments
        ]);
    }

    /**
     * Store a newly created attachment in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'attachable_type' => 'required|string|in:customer,quotation,policy,invoice,claim,payment,claim_notification',
            'attachable_id' => 'required|integer',
            'file' => 'required|file|max:10240', // 10MB max
            'document_type' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 400);
        }

        $type = $request->input('attachable_type');
        $id = $request->input('attachable_id');
        $docType = $request->input('document_type');

        // Only Accounting officers & Admins can upload freebie_proof attachments
        if ($docType === 'freebie_proof' || str_contains(strtolower($docType ?? ''), 'freebie')) {
            $user = $request->user();
            $isAccountingOrAdmin = $user && (
                $user->hasAnyRole(['Accounting Officer', 'Accounting', 'Admin', 'Administrator', 'Super Admin', 'Collection', 'Collection Officer']) ||
                in_array($user->role_name ?? '', ['Accounting Officer', 'Accounting', 'Admin', 'Administrator', 'Super Admin', 'Collection', 'Collection Officer']) ||
                str_contains(strtolower($user->role_name ?? ''), 'accounting') ||
                str_contains(strtolower($user->role_name ?? ''), 'admin') ||
                str_contains(strtolower($user->role_name ?? ''), 'collection')
            );
            if (!$isAccountingOrAdmin) {
                return response()->json(['message' => 'Forbidden. Only Accounting Officers can upload freebie delivery attachments.'], 403);
            }
        }

        $modelClass = $this->modelMap[$type];
        $model = $modelClass::find($id);

        if (!$model) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        // Prevent upload of freebie attachments if the associated policy, quotation, or invoice is cancelled
        if ($docType === 'freebie_proof' || str_contains(strtolower($docType ?? ''), 'freebie')) {
            $isCancelled = false;

            if ($model instanceof \App\Models\Quotation) {
                $isCancelled = strtolower($model->status ?? '') === 'cancelled' ||
                    ($model->policy && strtolower($model->policy->status ?? '') === 'cancelled');
            } elseif ($model instanceof \App\Models\Policy) {
                $isCancelled = strtolower($model->status ?? '') === 'cancelled' ||
                    ($model->quotation && strtolower($model->quotation->status ?? '') === 'cancelled');
            } elseif ($model instanceof \App\Models\Invoice) {
                $isCancelled = in_array(strtolower($model->status ?? ''), ['cancelled', 'voided']) ||
                    ($model->policy && strtolower($model->policy->status ?? '') === 'cancelled') ||
                    ($model->policy && $model->policy->quotation && strtolower($model->policy->quotation->status ?? '') === 'cancelled');
            } elseif ($model instanceof \App\Models\Payment) {
                $isCancelled = strtolower($model->status ?? '') === 'voided' ||
                    ($model->invoice && in_array(strtolower($model->invoice->status ?? ''), ['cancelled', 'voided'])) ||
                    ($model->invoice && $model->invoice->policy && strtolower($model->invoice->policy->status ?? '') === 'cancelled');
            }

            if ($isCancelled) {
                return response()->json([
                    'message' => 'Cannot upload freebie delivery attachment for a cancelled policy or quotation.'
                ], 422);
            }
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        
        // Generate a secure unique filename
        $safeName = Str::uuid() . '.' . $extension;
        
        // Store the file in a subdirectory based on the model type
        $disk = config('filesystems.default');
        $path = $file->storeAs("attachments/{$type}", $safeName, $disk);

        $attachment = Attachment::create([
            'attachable_type' => $modelClass,
            'attachable_id' => $id,
            'file_name' => $originalName,
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'document_type' => $request->input('document_type'),
            'uploaded_by' => $request->user()?->id,
        ]);

        // Notify on claim_notification attachments
        if ($type === 'claim_notification') {
            $user = $request->user();
            $isAgent = $user && ($user->hasRole('Sales Agent') || $user->hasRole('Team Renewal'));
            
            if ($isAgent) {
                try {
                    $officers = \App\Models\User::role('Claims Officer')->get();
                    $docLabel = $attachment->document_type ?: 'Attachment';
                    foreach ($officers as $officer) {
                        \App\Models\Notification::create([
                            'user_id' => $officer->id,
                            'title'   => 'Claim Requirement Uploaded',
                            'message' => "{$user->name} uploaded a requirement ({$docLabel} - {$attachment->file_name}) for claim notification {$model->reference_number}.",
                            'type'    => 'info',
                            'read_at' => null,
                        ]);
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Failed to notify Claims Officers on requirement upload: ' . $e->getMessage());
                }
            } else {
                // If uploaded by Claims Officer / Admin, notify the Sales Agent / Submitter
                try {
                    $docLabel = $attachment->document_type ?: 'Official Document';
                    if ($model->submitted_by) {
                        \App\Models\Notification::create([
                            'user_id' => $model->submitted_by,
                            'title'   => 'Official Claim Document Uploaded',
                            'message' => "{$user->name} (Claims Officer) uploaded an official document ({$docLabel} - {$attachment->file_name}) for claim notification {$model->reference_number}.",
                            'type'    => 'info',
                            'read_at' => null,
                        ]);
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Failed to notify Agent on official document upload: ' . $e->getMessage());
                }
            }
        }

        // Notify Collection Officers on freebie proof attachment upload
        if ($docType === 'freebie_proof' || str_contains(strtolower($docType ?? ''), 'freebie')) {
            try {
                $user = $request->user();
                $uploaderName = $user ? $user->name : 'Accounting';

                $collectionOfficers = \App\Models\User::whereHas('roles', function ($rq) {
                    $rq->where('name', 'Collection')
                      ->orWhere('name', 'Collection Officer')
                      ->orWhere('name', 'like', '%Collection%')
                      ->orWhere('name', 'like', '%Collector%');
                })->get();

                // Determine model reference details
                $refStr = '';
                $customerName = '';

                if ($model instanceof \App\Models\Invoice) {
                    $refStr = "Invoice " . ($model->invoice_number ?: "INV-{$model->id}");
                    $cust = $model->customer;
                    $customerName = $cust ? ($cust->full_name ?: trim(($cust->first_name ?? '') . ' ' . ($cust->last_name ?? '')) ?: $cust->company_name) : '';
                } elseif ($model instanceof \App\Models\Quotation) {
                    $refStr = "Quotation " . ($model->quotation_number ?: $model->ir_number ?: "QUO-{$model->id}");
                    $custName = $model->customer_name;
                    if (!$custName && $model->customer) {
                        $cust = $model->customer;
                        $custName = $cust->full_name ?: trim(($cust->first_name ?? '') . ' ' . ($cust->last_name ?? '')) ?: $cust->company_name;
                    }
                    $customerName = $custName ?: '';
                } elseif ($model instanceof \App\Models\Payment) {
                    $refStr = "Payment " . ($model->payment_number ?: "PAY-{$model->id}");
                    $cust = $model->invoice?->customer;
                    $customerName = $cust ? ($cust->full_name ?: trim(($cust->first_name ?? '') . ' ' . ($cust->last_name ?? '')) ?: $cust->company_name) : '';
                } elseif ($model instanceof \App\Models\Policy) {
                    $refStr = "Policy " . ($model->policy_number ?: "POL-{$model->id}");
                    $cust = $model->customer;
                    $customerName = $cust ? ($cust->full_name ?: trim(($cust->first_name ?? '') . ' ' . ($cust->last_name ?? '')) ?: $cust->company_name) : '';
                } elseif ($model instanceof \App\Models\Customer) {
                    $refStr = "Customer Account";
                    $customerName = $model->full_name ?: trim(($model->first_name ?? '') . ' ' . ($model->last_name ?? '')) ?: $model->company_name;
                } else {
                    $refStr = ucfirst($type) . " #{$id}";
                }

                $forStr = $customerName ? " for {$customerName} ({$refStr})" : " for {$refStr}";

                foreach ($collectionOfficers as $officer) {
                    \App\Models\Notification::create([
                        'user_id' => $officer->id,
                        'title'   => 'Freebie Proof Uploaded',
                        'message' => "{$uploaderName} (Accounting) uploaded a freebie proof attachment ({$attachment->file_name}){$forStr}.",
                        'type'    => 'info',
                        'read_at' => null,
                    ]);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to notify Collection Officers on freebie proof upload: ' . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'File uploaded successfully.',
            'data' => $attachment->load('uploadedBy:id,name')
        ], 201); // 201 Created
    }

    public function download(string $id)
    {
        $attachment = Attachment::find($id);

        if (!$attachment) {
            abort(404, 'Attachment not found.');
        }

        $disk = config('filesystems.default');

        if (!Storage::disk($disk)->exists($attachment->file_path)) {
            abort(404, 'File not found on storage.');
        }

        return Storage::disk($disk)->download($attachment->file_path, $attachment->file_name);
    }

    /**
     * Preview/stream the attachment file.
     */
    public function preview(string $id)
    {
        $attachment = Attachment::find($id);

        if (!$attachment) {
            abort(404, 'Attachment not found.');
        }

        $disk = config('filesystems.default');

        if (!Storage::disk($disk)->exists($attachment->file_path)) {
            abort(404, 'File not found on storage.');
        }

        $filePath = Storage::disk($disk)->path($attachment->file_path);
        return response()->file($filePath, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="' . $attachment->file_name . '"'
        ]);
    }

    /**
     * Remove the specified attachment from storage and database.
     */
    public function destroy(string $id)
    {
        $attachment = Attachment::find($id);

        if (!$attachment) {
            return response()->json(['message' => 'Attachment not found.'], 404);
        }

        // Only Accounting officers & Admins can delete freebie_proof attachments
        if ($attachment->document_type === 'freebie_proof' || str_contains(strtolower($attachment->document_type ?? ''), 'freebie')) {
            $user = request()->user();
            $isAccountingOrAdmin = $user && (
                $user->hasAnyRole(['Accounting Officer', 'Accounting', 'Admin', 'Administrator', 'Super Admin', 'Collection', 'Collection Officer']) ||
                in_array($user->role_name ?? '', ['Accounting Officer', 'Accounting', 'Admin', 'Administrator', 'Super Admin', 'Collection', 'Collection Officer']) ||
                str_contains(strtolower($user->role_name ?? ''), 'accounting') ||
                str_contains(strtolower($user->role_name ?? ''), 'admin') ||
                str_contains(strtolower($user->role_name ?? ''), 'collection')
            );
            if (!$isAccountingOrAdmin) {
                return response()->json(['message' => 'Forbidden. Only Accounting Officers can remove freebie delivery attachments.'], 403);
            }
        }

        // Delete from physical storage
        $disk = config('filesystems.default');
        if (Storage::disk($disk)->exists($attachment->file_path)) {
            Storage::disk($disk)->delete($attachment->file_path);
        }

        // Delete database record
        $attachment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Attachment deleted successfully.'
        ]);
    }
}
