<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Traits\Auditable;

class InvoiceController extends Controller
{
    use Auditable;
    /**
     * Paginated list of invoices.
     */
    public function index(Request $request)
    {
        // Self-heal: Check if there are any approved quotations that do not have a policy
        $orphanedQuotations = \App\Models\Quotation::where('status', 'approved')
            ->whereDoesntHave('policy')
            ->with(['customer', 'items.insuranceProduct'])
            ->get();

        if ($orphanedQuotations->isNotEmpty()) {
            DB::transaction(function () use ($orphanedQuotations, $request) {
                foreach ($orphanedQuotations as $quotation) {
                    $customer = $quotation->customer;
                    $productId = $quotation->items->first()?->insurance_product_id;
                    
                    $policy = \App\Models\Policy::create([
                        'policy_number' => $customer?->policy_no ?: null,
                        'quotation_id' => $quotation->id,
                        'customer_id' => $quotation->customer_id,
                        'insurance_product_id' => $productId,
                        'issued_by' => $quotation->reviewed_by ?: ($request->user() ? $request->user()->id : 1),
                        'status' => 'active',
                        'effective_date' => $customer?->inception_date ?? now(),
                        'expiry_date' => $customer?->expiry_date ?? now()->addYear(),
                        'total_premium' => $customer?->policy_premium ?? 0,
                        'sum_insured' => $customer?->assured_value ?? 0,
                        'terms_and_conditions' => $quotation->notes,
                    ]);

                    foreach ($quotation->items as $item) {
                        $policy->coverages()->create([
                            'coverage_name' => $item->insuranceProduct?->name ?? 'Premium Item',
                            'sum_insured' => $customer?->assured_value ?? 0,
                            'premium_rate' => 0,
                            'premium_amount' => $item->premium_amount,
                        ]);
                    }

                    $invoice = \App\Models\Invoice::create([
                        'invoice_number' => \App\Models\Invoice::generateNumber(),
                        'policy_id' => $policy->id,
                        'customer_id' => $quotation->customer_id,
                        'created_by' => $quotation->reviewed_by ?: ($request->user() ? $request->user()->id : 1),
                        'status' => 'sent',
                        'due_date' => $customer?->inception_date ?? now(),
                        'subtotal' => $customer?->policy_premium ?? 0,
                        'tax_amount' => 0,
                        'total_amount' => $customer?->policy_premium ?? 0,
                        'amount_paid' => 0,
                        'balance' => $customer?->policy_premium ?? 0,
                        'notes' => 'Automatically generated invoice from approved quotation ' . $quotation->quotation_number,
                    ]);

                    $invoice->items()->create([
                        'description' => 'Insurance Premium - ' . ($quotation->items->first()?->insuranceProduct?->name ?? 'Policy'),
                        'quantity' => 1,
                        'unit_price' => $customer?->policy_premium ?? 0,
                        'amount' => $customer?->policy_premium ?? 0,
                    ]);

                    // Notify the agent who owns this customer about the invoice
                    try {
                        if ($customer && $customer->created_by) {
                            \App\Models\Notification::create([
                                'user_id' => $customer->created_by,
                                'title' => 'Invoice Issued',
                                'message' => "A new invoice {$invoice->invoice_number} has been generated for " . ($customer ? ($customer->first_name . ' ' . $customer->last_name) : 'Customer') . " with balance ₱" . number_format($invoice->balance, 2) . ".",
                                'type' => 'info',
                                'read_at' => null,
                            ]);
                        }

                        // Notify all Collection officers
                        $collectionOfficers = \App\Models\User::role('Collection')->get();
                        foreach ($collectionOfficers as $officer) {
                            \App\Models\Notification::create([
                                'user_id' => $officer->id,
                                'title' => 'Invoice Issued',
                                'message' => "A new invoice {$invoice->invoice_number} has been generated for " . ($customer ? ($customer->first_name . ' ' . $customer->last_name) : 'Customer') . " with balance ₱" . number_format($invoice->balance, 2) . ".",
                                'type' => 'info',
                                'read_at' => null,
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error('Failed to send auto-heal invoice creation notification: ' . $e->getMessage());
                    }
                }
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['invoice_number', 'total_amount', 'balance', 'status', 'due_date', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $invoices = Invoice::with([
                'customer',
                'customer.createdBy:id,name',
                'customer.createdBy.roles',
                'policy',
                'policy.quotation.items.insuranceProduct',
                'policy.quotation.preparedBy:id,name',
                'policy.quotation.reviewedBy:id,name',
                'policy.quotation.attachments',
                'policy.issuedBy:id,name',
                'createdBy:id,name',
                'payments.attachments',
                'attachments',
                'attachments.uploadedBy:id,name',
                'subagentCommission',
            ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        // Auto-check for DST Warnings (80+ days past inception with unpaid balance) and notify Collection officers
        try {
            $eightyDaysAgo = \Carbon\Carbon::now()->subDays(80)->toDateString();
            $dstInvoices = Invoice::where('balance', '>', 0)
                ->whereHas('customer', function ($q) use ($eightyDaysAgo) {
                    $q->whereNotNull('inception_date')
                      ->where('inception_date', '<=', $eightyDaysAgo);
                })
                ->with(['customer', 'policy'])
                ->get();

            if ($dstInvoices->isNotEmpty()) {
                $collectionOfficers = \App\Models\User::role('Collection')->get();
                if ($collectionOfficers->isNotEmpty()) {
                    foreach ($dstInvoices as $dstInv) {
                        $cust = $dstInv->customer;
                        $custName = $cust ? trim($cust->first_name . ' ' . $cust->last_name) : 'Customer';
                        $policyNo = $cust?->policy_no ?: ($dstInv->policy?->policy_number ?: 'N/A');
                        $daysPassed = $cust?->inception_date ? \Carbon\Carbon::parse($cust->inception_date)->diffInDays(now()) : 80;
                        
                        $title = 'DST Warning: 80+ Days Unpaid';
                        $msg = "CRITICAL: Policy {$policyNo} for Assured {$custName} is {$daysPassed} days past inception date with unpaid balance of ₱" . number_format($dstInv->balance, 2) . ". Please review BIR EDST compliance.";

                        foreach ($collectionOfficers as $officer) {
                            $alreadySentToday = \App\Models\Notification::where('user_id', $officer->id)
                                ->where('title', 'DST Warning: 80+ Days Unpaid')
                                ->where('message', 'like', "%{$policyNo}%")
                                ->whereDate('created_at', \Carbon\Carbon::today())
                                ->exists();

                            if (!$alreadySentToday) {
                                \App\Models\Notification::create([
                                    'user_id' => $officer->id,
                                    'title' => $title,
                                    'message' => $msg,
                                    'type' => 'error',
                                    'read_at' => null,
                                ]);
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to dispatch DST warning notifications: ' . $e->getMessage());
        }

        // Auto-check for 1st Payment Alarms (No 1st payment by 20th of following month)
        try {
            $unpaidFirstInvoices = Invoice::where('amount_paid', 0)
                ->where('balance', '>', 0)
                ->whereHas('customer', function ($q) {
                    $q->whereNotNull('writing_date')
                      ->orWhereNotNull('inception_date');
                })
                ->with(['customer', 'policy'])
                ->get();

            if ($unpaidFirstInvoices->isNotEmpty()) {
                $today = \Carbon\Carbon::today();
                $collectionOfficers = \App\Models\User::role('Collection')->get();

                if ($collectionOfficers->isNotEmpty()) {
                    foreach ($unpaidFirstInvoices as $inv) {
                        $cust = $inv->customer;
                        $reqDateStr = $cust?->writing_date ?? $cust?->inception_date ?? $inv->created_at;
                        if (!$reqDateStr) continue;

                        $reqDate = \Carbon\Carbon::parse($reqDateStr);
                        // 20th day of the following month
                        $alarmDate = $reqDate->copy()->addMonthNoOverflow()->startOfMonth()->addDays(19);

                        if ($today->greaterThanOrEqualTo($alarmDate)) {
                            $custName = $cust ? trim($cust->first_name . ' ' . $cust->last_name) : 'Customer';
                            $policyNo = $cust?->policy_no ?: ($inv->policy?->policy_number ?: 'N/A');
                            $reqMonthName = $reqDate->format('F Y');
                            $alarmDateStr = $alarmDate->format('M 20, Y');

                            $title = '1st Payment Overdue Alarm';
                            $msg = "ALARM: Assured {$custName} (Policy: {$policyNo}, Request Date: {$reqMonthName}) has NO 1st payment recorded as of {$alarmDateStr}.";

                            foreach ($collectionOfficers as $officer) {
                                $alreadySentToday = \App\Models\Notification::where('user_id', $officer->id)
                                    ->where('title', '1st Payment Overdue Alarm')
                                    ->where('message', 'like', "%{$policyNo}%")
                                    ->whereDate('created_at', \Carbon\Carbon::today())
                                    ->exists();

                                if (!$alreadySentToday) {
                                    \App\Models\Notification::create([
                                        'user_id' => $officer->id,
                                        'title' => $title,
                                        'message' => $msg,
                                        'type' => 'error',
                                        'read_at' => null,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to dispatch 1st Payment Alarm notifications: ' . $e->getMessage());
        }

        return response()->json(['success' => true, 'data' => $invoices]);
    }

    /**
     * Create a new invoice with items.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer|exists:customers,id',
            'policy_id' => 'nullable|integer|exists:policies,id',
            'due_date' => 'required|date',
            'tax_amount' => 'nullable|numeric|min:0|max:99999999.99',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1|max:20',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1|max:9999',
            'items.*.unit_price' => 'required|numeric|min:0|max:99999999.99',
            'items.*.amount' => 'required|numeric|min:0|max:99999999.99',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $invoice = DB::transaction(function () use ($request) {
            $subtotal = collect($request->input('items'))->sum('amount');
            $taxAmount = (float) $request->input('tax_amount', 0);
            $totalAmount = $subtotal + $taxAmount;

            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateNumber(),
                'customer_id' => $request->input('customer_id'),
                'policy_id' => $request->input('policy_id'),
                'created_by' => $request->user()->id,
                'status' => 'draft',
                'due_date' => $request->input('due_date'),
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'balance' => $totalAmount,
                'notes' => $request->input('notes'),
            ]);

            foreach ($request->input('items') as $item) {
                $invoice->items()->create($item);
            }

            return $invoice;
        });

        // Notify the agent who owns this customer about the invoice
        try {
            if ($invoice->customer && $invoice->customer->created_by) {
                \App\Models\Notification::create([
                    'user_id' => $invoice->customer->created_by,
                    'title' => 'Invoice Issued',
                    'message' => "A new invoice {$invoice->invoice_number} has been generated for " . ($invoice->customer ? ($invoice->customer->first_name . ' ' . $invoice->customer->last_name) : 'Customer') . " with balance ₱" . number_format($invoice->balance, 2) . ".",
                    'type' => 'info',
                    'read_at' => null,
                ]);
            }

            // Notify all Collection officers
            $collectionOfficers = \App\Models\User::role('Collection')->get();
            foreach ($collectionOfficers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title' => 'Invoice Issued',
                    'message' => "A new invoice {$invoice->invoice_number} has been generated for " . ($invoice->customer ? ($invoice->customer->first_name . ' ' . $invoice->customer->last_name) : 'Customer') . " with balance ₱" . number_format($invoice->balance, 2) . ".",
                    'type' => 'info',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send invoice creation notification: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice created successfully.',
            'data' => $invoice->load(['customer', 'items', 'policy', 'createdBy']),
        ], 201);
    }

    /**
     * Show invoice details.
     */
    public function show(string $id)
    {
        $invoice = Invoice::with([
            'customer', 'policy:id,policy_number,status',
            'items', 'payments.receivedBy:id,name', 'payments.attachments', 'createdBy:id,name,email',
        ])->find($id);

        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $invoice]);
    }

    /**
     * Update a draft invoice.
     */
    public function update(Request $request, string $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);

        if (!in_array($invoice->status, ['draft'])) {
            return response()->json(['success' => false, 'message' => 'Only draft invoices can be edited.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer|exists:customers,id',
            'policy_id' => 'nullable|integer|exists:policies,id',
            'due_date' => 'required|date',
            'tax_amount' => 'nullable|numeric|min:0|max:99999999.99',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1|max:20',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1|max:9999',
            'items.*.unit_price' => 'required|numeric|min:0|max:99999999.99',
            'items.*.amount' => 'required|numeric|min:0|max:99999999.99',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::transaction(function () use ($invoice, $request) {
            $subtotal = collect($request->input('items'))->sum('amount');
            $taxAmount = (float) $request->input('tax_amount', 0);
            $totalAmount = $subtotal + $taxAmount;

            $invoice->update([
                'customer_id' => $request->input('customer_id'),
                'policy_id' => $request->input('policy_id'),
                'due_date' => $request->input('due_date'),
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'balance' => $totalAmount - $invoice->amount_paid,
                'notes' => $request->input('notes'),
            ]);

            $invoice->items()->delete();
            foreach ($request->input('items') as $item) {
                $invoice->items()->create($item);
            }
        });

        return response()->json([
            'success' => true, 'message' => 'Invoice updated.',
            'data' => $invoice->fresh(['customer', 'items', 'policy']),
        ]);
    }

    /**
     * Delete a draft invoice.
     */
    public function destroy(string $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        if ($invoice->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Only draft invoices can be deleted.'], 422);
        }
        $this->audit('invoice.delete', $invoice, 'Deleted invoice #' . $invoice->invoice_number);

        $invoice->delete();
        return response()->json(['success' => true, 'message' => 'Invoice deleted.']);
    }

    /**
     * Send an invoice (change status to sent).
     */
    public function send(string $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        if ($invoice->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Only draft invoices can be sent.'], 422);
        }

        $invoice->update(['status' => 'sent']);

        return response()->json([
            'success' => true, 'message' => 'Invoice sent.',
            'data' => $invoice->fresh(),
        ]);
    }

    /**
     * Cancel an invoice.
     */
    public function cancel(string $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        if (in_array($invoice->status, ['paid', 'cancelled'])) {
            return response()->json(['success' => false, 'message' => 'This invoice cannot be cancelled.'], 422);
        }

        $oldStatus = $invoice->status;
        $invoice->update(['status' => 'cancelled']);

        $this->audit('invoice.cancel', $invoice, 'Cancelled invoice #' . $invoice->invoice_number,
            ['status' => $oldStatus],
            ['status' => 'cancelled'],
        );

        return response()->json([
            'success' => true, 'message' => 'Invoice cancelled.',
            'data' => $invoice->fresh(),
        ]);
    }

    /**
     * Send a payment reminder for the next unpaid installment.
     */
    public function sendReminder(string $id)
    {
        $invoice = Invoice::with(['customer', 'policy', 'payments'])->find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        }

        $customer = $invoice->customer;
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer details not found for this invoice.'], 422);
        }

        $email = $customer->email;
        if (!$email) {
            return response()->json(['success' => false, 'message' => 'Customer does not have a registered email address.'], 422);
        }

        $terms = (int) ($customer->payment_terms ?? 1);
        $totalAmount = (float) $invoice->total_amount;
        $amountPaid = (float) $invoice->amount_paid;

        $installmentAmount = $terms > 0 ? ($totalAmount / $terms) : 0;
        $paidInstallments = $installmentAmount > 0 ? floor($amountPaid / $installmentAmount) : 0;
        $nextInstallmentIndex = $paidInstallments + 1;

        if ($nextInstallmentIndex > $terms || $invoice->balance <= 0) {
            return response()->json(['success' => false, 'message' => 'Invoice has already been paid in full. No reminders needed.'], 422);
        }

        $inceptionDateStr = $customer->inception_date;
        if (!$inceptionDateStr) {
            return response()->json(['success' => false, 'message' => 'Customer inception date is missing. Cannot calculate due date.'], 422);
        }

        $inception = \Carbon\Carbon::parse($inceptionDateStr);
        $dueDate = $inception->copy()->addMonths($nextInstallmentIndex - 1);
        $dueDateFormatted = $dueDate->format('M d, Y');

        $ordinals = [1 => '1ST', 2 => '2ND', 3 => '3RD', 4 => '4TH', 5 => '5TH', 6 => '6TH'];
        $isLast = ((int)$nextInstallmentIndex === (int)$terms);
        $installmentOrdinal = $isLast ? 'LAST' : ($ordinals[$nextInstallmentIndex] ?? ($nextInstallmentIndex . 'TH'));

        $customerName = trim($customer->first_name . ' ' . $customer->last_name);
        $policyNumber = $customer->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');
        $plateNumber = strtoupper($customer->plate_no ?: 'N/A');

        try {
            \Illuminate\Support\Facades\Mail::to($email)->send(
                new \App\Mail\PaymentReminderMail(
                    $customerName,
                    $policyNumber,
                    $installmentOrdinal,
                    $terms,
                    $installmentAmount,
                    (float) $invoice->balance,
                    $dueDateFormatted,
                    $plateNumber
                )
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send payment reminder email: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send email: ' . $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Payment reminder email successfully sent to {$email} for the {$installmentOrdinal} installment."
        ]);
    }

    /**
     * Dispatch an immediate DST Warning notification to Collection Officers.
     */
    public function notifyDstWarning(Request $request, string $id)
    {
        $invoice = Invoice::with(['customer', 'policy'])->find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        }

        $customer = $invoice->customer;
        $customerName = $customer ? trim($customer->first_name . ' ' . $customer->last_name) : 'Customer';
        $policyNumber = $customer?->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');
        $daysPassed = $customer?->inception_date ? \Carbon\Carbon::parse($customer->inception_date)->diffInDays(now()) : 80;

        $collectionOfficers = \App\Models\User::role('Collection')->get();
        if ($collectionOfficers->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No collection officers found to notify.'], 422);
        }

        foreach ($collectionOfficers as $officer) {
            \App\Models\Notification::create([
                'user_id' => $officer->id,
                'title' => 'DST Warning: 80+ Days Unpaid',
                'message' => "CRITICAL: Policy {$policyNumber} for Assured {$customerName} is {$daysPassed} days past inception date with unpaid balance of ₱" . number_format($invoice->balance, 2) . ". Please review BIR EDST compliance.",
                'type' => 'error',
                'read_at' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "DST Warning notification successfully sent to " . $collectionOfficers->count() . " Collection Officer(s).",
        ]);
    }

    /**
     * Create or update sub-agent commission details for an invoice.
     */
    public function updateSubagentCommission(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'transac' => 'nullable|string|max:100',
            'released_to' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:100',
            'released_date_1' => 'nullable|date',
            'amount_1' => 'nullable|numeric|min:0',
            'released_date_2' => 'nullable|date',
            'amount_2' => 'nullable|numeric|min:0',
            'released_date_3' => 'nullable|date',
            'amount_3' => 'nullable|numeric|min:0',
            'released_date_4' => 'nullable|date',
            'amount_4' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $subagentCommission = \App\Models\SubagentCommission::updateOrCreate(
            ['invoice_id' => $invoice->id],
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Sub-agent commission record updated successfully.',
            'data' => $subagentCommission,
        ]);
    }

    /**
     * Dispatch a Notice for Cancellation request notification from Collection to Sales Agent & Renewal Team.
     */
    public function notifyCancellationNotice(Request $request, string $id)
    {
        $invoice = Invoice::with(['customer', 'policy.quotation'])->find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found.'], 404);
        }

        $customer = $invoice->customer;
        $customerName = $customer ? trim($customer->first_name . ' ' . $customer->last_name) : 'Customer';
        $policyNumber = $customer?->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');
        $agentName = $customer?->agent ?: 'N/A';

        $targetUserIds = collect();

        // 1. Quotation creator / assigned agent
        $quotation = $invoice->policy?->quotation;
        if ($quotation && $quotation->prepared_by) {
            $targetUserIds->push($quotation->prepared_by);
        }

        // 2. Matching agent user by name if found
        if ($agentName !== 'N/A') {
            $matchingAgent = \App\Models\User::where('name', 'like', "%{$agentName}%")->first();
            if ($matchingAgent) {
                $targetUserIds->push($matchingAgent->id);
            }
        }

        // 3. All Sales, Renewal, Underwriter, Admin, Owner, Super Admin members
        $rolesToNotify = [
            'Sales Agent', 'Sales',
            'Team Renewal', 'Renewal',
            'Underwriter',
            'Administrator', 'Owner', 'Super Admin',
            'General Manager', 'Operational Manager'
        ];
        $teamUsers = \App\Models\User::whereHas('roles', function ($q) use ($rolesToNotify) {
            $q->whereIn('name', $rolesToNotify);
        })->get();

        foreach ($teamUsers as $u) {
            $targetUserIds->push($u->id);
        }

        $uniqueUserIds = $targetUserIds->unique()->filter();

        $title = 'Notice for Cancellation Request';
        $msg = "NOTICE FOR CANCELLATION: Collection has issued a cancellation notice for Policy {$policyNumber} (Assured: {$customerName}, Agent: {$agentName}) due to payment default. Sales Agent / Team Renewal, please review and submit a cancellation request.";

        foreach ($uniqueUserIds as $userId) {
            \App\Models\Notification::create([
                'user_id' => $userId,
                'title' => $title,
                'message' => $msg,
                'type' => 'warning',
                'read_at' => null,
            ]);
        }

        $senderName = $request->user()?->name ?? 'Collection';
        $stamp = "Notice for Cancellation issued by {$senderName} on " . now()->format('M d, Y H:i');

        // Stamp invoice, policy, quotation, and customer so all pages reflect notice sent
        $invoice->update([
            'notes' => trim(($invoice->notes ? $invoice->notes . ' | ' : '') . $stamp),
        ]);

        if ($invoice->policy) {
            $invoice->policy->update([
                'notes' => trim(($invoice->policy->notes ? $invoice->policy->notes . ' | ' : '') . $stamp),
            ]);

            if ($invoice->policy->quotation) {
                $invoice->policy->quotation->update([
                    'notes' => trim(($invoice->policy->quotation->notes ? $invoice->policy->quotation->notes . ' | ' : '') . $stamp),
                ]);
            }
        }

        if ($customer) {
            $customer->update([
                'notes' => trim(($customer->notes ? $customer->notes . ' | ' : '') . $stamp),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Notice for Cancellation successfully sent to Sales Agent & Team Renewal.",
            'data' => $invoice->fresh(['customer', 'policy.quotation']),
        ]);
    }
}
