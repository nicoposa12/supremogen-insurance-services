<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    /**
     * Paginated list of payments.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['payment_number', 'amount', 'payment_method', 'payment_date', 'status', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $baseQuery = Payment::search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->ofMethod($request->input('method'));

        if ($request->filled('customer_id')) {
            $baseQuery->whereHas('invoice', function ($q) use ($request) {
                $q->where('customer_id', $request->input('customer_id'));
            });
        }

        $summary = [
            'pending' => (clone $baseQuery)->where(function ($q) {
                $q->where('verification_status', 'pending_verification')
                  ->orWhere('verification_status', 'pending')
                  ->orWhereNull('verification_status');
            })->count(),
            'verified' => (clone $baseQuery)->where('verification_status', 'verified')->count(),
            'rejected' => (clone $baseQuery)->where('verification_status', 'rejected')->count(),
        ];

        $query = (clone $baseQuery)->with([
            'invoice:id,invoice_number,customer_id,total_amount,balance,policy_id,status',
            'invoice.policy:id,policy_number,quotation_id,status',
            'invoice.policy.quotation:id,quotation_number,ir_number,status',
            'invoice.customer:id,customer_code,first_name,last_name,policy_no,mobile,policy_status',
            'receivedBy:id,name',
            'verifiedBy:id,name',
            'attachments',
        ]);

        if ($request->filled('verification_status') && $request->input('verification_status') !== 'all') {
            $vStatus = $request->input('verification_status');
            if ($vStatus === 'pending' || $vStatus === 'pending_verification') {
                $query->where(function ($q) {
                    $q->where('verification_status', 'pending_verification')
                      ->orWhere('verification_status', 'pending')
                      ->orWhereNull('verification_status');
                });
            } else {
                $query->where('verification_status', $vStatus);
            }
        }

        $payments = $query->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'success' => true,
            'data'    => $payments,
            'summary' => $summary,
        ]);
    }

    /**
     * Record a new payment against an invoice.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => 'required|exists:invoices,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:jt,jrs,lbc,cod,walk_in,bank_transfer_pbcom,bank_transfer_security_bank,post_dated_checks,split_payment',
            'payment_date' => 'required|date',
            'reference_number' => 'required_if:payment_method,jt,jrs,lbc|nullable|string|max:100',
            'notes' => 'nullable|string|max:2000',
            'proof' => 'nullable|file|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Validate payment doesn't exceed balance or allow recording on cancelled/voided policies
        $invoice = Invoice::with(['policy', 'policy.quotation'])->find($request->input('invoice_id'));
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        }

        $isCancelled = in_array($invoice->status, ['paid', 'cancelled', 'voided']) || 
            ($invoice->policy && $invoice->policy->status === 'cancelled') ||
            ($invoice->policy && $invoice->policy->quotation && $invoice->policy->quotation->status === 'cancelled');

        if ($isCancelled) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot record collection payment for a cancelled policy or voided invoice.',
            ], 422);
        }

        $payment = \Illuminate\Support\Facades\DB::transaction(function () use ($request) {
            $payment = Payment::create([
                'payment_number' => Payment::generateNumber(),
                'invoice_id' => $request->input('invoice_id'),
                'received_by' => $request->user()->id,
                'amount' => $request->input('amount'),
                'payment_method' => $request->input('payment_method'),
                'payment_date' => $request->input('payment_date'),
                'reference_number' => $request->input('reference_number'),
                'notes' => $request->input('notes'),
                'status' => 'completed',
            ]);

            if ($request->hasFile('proof')) {
                $file = $request->file('proof');
                $originalName = $file->getClientOriginalName();
                $extension = $file->getClientOriginalExtension();
                $safeName = \Illuminate\Support\Str::uuid() . '.' . $extension;
                $disk = config('filesystems.default');
                $path = $file->storeAs("attachments/payment", $safeName, $disk);

                $payment->attachments()->create([
                    'file_name' => $originalName,
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'document_type' => 'receipt',
                    'uploaded_by' => $request->user()?->id,
                ]);
            }

            return $payment;
        });

        // Recalculate invoice totals (only counts verified payments, so balance is unchanged while pending)
        $invoice->recalculate();

        // Notify Accounting Officers about new collection payment needing verification
        try {
            $ref = $payment->payment_number ?? ('#' . $payment->id);
            $clientName = $invoice->customer ? trim($invoice->customer->first_name . ' ' . $invoice->customer->last_name) : 'Client';
            $amountFormatted = number_format((float) $payment->amount, 2);
            $collectorName = $request->user()?->name ?: 'Collection Officer';

            $accountingOfficers = \App\Models\User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['Accounting Officer', 'Accounting', 'Admin', 'Super Admin']);
            })->get();

            if ($accountingOfficers->isEmpty()) {
                $accountingOfficers = \App\Models\User::whereIn('role_name', ['Accounting Officer', 'Accounting', 'Admin', 'Super Admin'])->get();
            }

            foreach ($accountingOfficers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title'   => 'Collection Payment Pending Review',
                    'message' => "New collection payment {$ref} (₱{$amountFormatted}) for {$clientName} was submitted by {$collectorName} and is ready for accounting verification.",
                    'type'    => 'warning',
                    'read_at' => null,
                ]);
            }

            // Also notify the agent who owns this customer
            if ($invoice->customer && $invoice->customer->created_by) {
                \App\Models\Notification::create([
                    'user_id' => $invoice->customer->created_by,
                    'title'   => 'Collection Payment Submitted',
                    'message' => "A payment of ₱{$amountFormatted} for Invoice {$invoice->invoice_number} has been submitted for Accounting verification.",
                    'type'    => 'info',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send payment review notification to accounting: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Collection payment recorded successfully and submitted to Accounting for verification.',
            'data'    => $payment->load(['invoice.customer', 'receivedBy', 'attachments']),
        ], 201);
    }

    /**
     * Show payment details.
     */
    public function show(string $id)
    {
        $payment = Payment::with([
            'invoice.customer', 'invoice.policy:id,policy_number',
            'receivedBy:id,name,email',
            'attachments',
        ])->find($id);

        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $payment]);
    }

    /**
     * Update a payment record.
     */
    public function update(Request $request, string $id)
    {
        $payment = Payment::find($id);
        if (!$payment) return response()->json(['success' => false, 'message' => 'Payment not found.'], 404);

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:jt,jrs,lbc,cod,walk_in,bank_transfer_pbcom,bank_transfer_security_bank,post_dated_checks,split_payment',
            'payment_date' => 'required|date',
            'reference_number' => 'required_if:payment_method,jt,jrs,lbc|nullable|string|max:100',
            'notes' => 'nullable|string|max:2000',
            'proof' => 'nullable|file|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($request, $payment) {
            $payment->update([
                'amount' => $request->amount,
                'payment_method' => $request->payment_method,
                'payment_date' => $request->payment_date,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
            ]);

            if ($request->hasFile('proof')) {
                // Delete existing attachments if any
                foreach ($payment->attachments as $oldAttachment) {
                    $disk = config('filesystems.default');
                    if (\Illuminate\Support\Facades\Storage::disk($disk)->exists($oldAttachment->file_path)) {
                        \Illuminate\Support\Facades\Storage::disk($disk)->delete($oldAttachment->file_path);
                    }
                    $oldAttachment->delete();
                }

                // Add new attachment
                $file = $request->file('proof');
                $originalName = $file->getClientOriginalName();
                $extension = $file->getClientOriginalExtension();
                $safeName = \Illuminate\Support\Str::uuid() . '.' . $extension;
                $disk = config('filesystems.default');
                $path = $file->storeAs("attachments/payment", $safeName, $disk);

                $payment->attachments()->create([
                    'file_name' => $originalName,
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'document_type' => 'receipt',
                    'uploaded_by' => $request->user()?->id,
                ]);
            }
        });

        // Recalculate invoice
        $payment->invoice->recalculate();

        return response()->json([
            'success' => true,
            'message' => 'Payment updated successfully.',
            'data' => $payment->fresh(['invoice', 'attachments']),
        ]);
    }

    /**
     * Void a completed payment.
     */
    public function void(Request $request, string $id)
    {
        $payment = Payment::find($id);
        if (!$payment) return response()->json(['success' => false, 'message' => 'Payment not found.'], 404);

        if ($payment->status !== 'completed') {
            return response()->json(['success' => false, 'message' => 'Only completed payments can be voided.'], 422);
        }

        $payment->update(['status' => 'voided']);

        // Recalculate invoice
        $payment->invoice->recalculate();

        return response()->json([
            'success' => true, 'message' => 'Payment voided.',
            'data' => $payment->fresh(['invoice']),
        ]);
    }

    /**
     * Verify or reject a collection payment (Accounting Officer action).
     */
    public function verify(Request $request, string $id)
    {
        $payment = Payment::with(['invoice.customer', 'receivedBy', 'verifiedBy', 'attachments'])->find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:verified,rejected',
            'notes'  => 'nullable|string|max:2000',
            'special_attachment' => 'nullable|file|mimes:jpeg,jpg,png,pdf,doc,docx,zip|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $status = $request->input('status');
        $notes = $request->input('notes');

        // Prevent verification for cancelled policies or voided invoices
        $invoice = $payment->invoice;
        if ($invoice) {
            $isCancelled = in_array(strtolower($invoice->status), ['cancelled', 'voided']) ||
                ($invoice->policy && strtolower($invoice->policy->status) === 'cancelled') ||
                ($invoice->customer && strtoupper($invoice->customer->policy_status ?? '') === 'CANCELLED');

            if ($isCancelled) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot verify collection payment for a cancelled policy or voided invoice.'
                ], 422);
            }
        }

        $payment->update([
            'verification_status' => $status,
            'verification_notes'  => $notes,
            'verified_by'         => $request->user()->id,
            'verified_at'         => now(),
        ]);

        if ($request->hasFile('special_attachment')) {
            $file = $request->file('special_attachment');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $safeName = \Illuminate\Support\Str::uuid() . '.' . $extension;
            $disk = config('filesystems.default');
            $path = $file->storeAs("attachments/payment_special", $safeName, $disk);

            $payment->attachments()->create([
                'file_name' => 'Special Attachment: ' . $originalName,
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'document_type' => 'special_attachment',
                'uploaded_by' => $request->user()?->id,
            ]);
        }

        // Recalculate invoice balance upon verification
        if ($payment->invoice) {
            $payment->invoice->recalculate();
        }

        // Send payment receipt email to client when payment is verified
        if ($status === 'verified' && $payment->invoice) {
            try {
                $customer = $payment->invoice->customer;
                if ($customer && $customer->email) {
                    $verifiedPayments = $payment->invoice->payments()
                        ->where('status', 'completed')
                        ->where('verification_status', 'verified')
                        ->orderBy('payment_date', 'asc')
                        ->orderBy('created_at', 'asc')
                        ->get();
                    $paymentIndex = $verifiedPayments->pluck('id')->search($payment->id);
                    $installmentNumber = ($paymentIndex !== false) ? ($paymentIndex + 1) : 1;

                    $ordinals = [1 => '1ST', 2 => '2ND', 3 => '3RD', 4 => '4TH', 5 => '5TH', 6 => '6TH'];
                    $installmentOrdinal = $ordinals[$installmentNumber] ?? ($installmentNumber . 'TH');
                    $customerName = trim($customer->first_name . ' ' . $customer->last_name);
                    $policyNumber = $customer->policy_no ?: ($payment->invoice->policy?->policy_number ?: 'N/A');

                    \Illuminate\Support\Facades\Mail::to($customer->email)
                        ->queue(new \App\Mail\PaymentReceiptMail(
                            $customerName,
                            $policyNumber,
                            $installmentOrdinal,
                            (float) $payment->amount,
                            (float) $payment->invoice->balance
                        ));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send payment receipt email on verification: ' . $e->getMessage());
            }
        }

        // Notify Collection Officer who recorded the payment
        if ($payment->received_by) {
            try {
                $ref = $payment->payment_number ?? ('#' . $payment->id);
                $actionLabel = $status === 'verified' ? 'Verified' : 'Rejected';
                \App\Models\Notification::create([
                    'user_id' => $payment->received_by,
                    'title'   => "Collection Payment {$actionLabel}",
                    'message' => "Collection payment {$ref} (₱" . number_format((float) $payment->amount, 2) . ") was marked as {$actionLabel} by Accounting.",
                    'type'    => $status === 'verified' ? 'success' : 'warning',
                    'read_at' => null,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to notify payment verification: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => $status === 'verified' ? 'Payment successfully verified and invoice updated.' : 'Payment marked as rejected.',
            'data'    => $payment->fresh(['invoice.customer', 'receivedBy', 'verifiedBy', 'attachments']),
        ]);
    }
}
