<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Traits\Auditable;

class QuotationController extends Controller
{
    use Auditable;
    /**
     * Paginated list of quotations with search, filter, sort.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['quotation_number', 'total_premium', 'status', 'valid_until', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $query = Quotation::with([
            'customer',
            'customer.attachments',
            'policy',
            'policy.invoice',
            'policy.invoice.payments',
            'attachments',
            'attachments.uploadedBy:id,name',
            'items',
            'preparedBy:id,name'
        ]);

        if ($request->user()->isSalesOrRenewal()) {
            $userId = $request->user()->id;
            $userName = $request->user()->name;
            $query->where(function ($q) use ($userId, $userName) {
                $q->where('prepared_by', $userId)
                  ->orWhereHas('customer', function ($cq) use ($userName) {
                      $cq->where('agent', 'like', "%{$userName}%");
                  });
            });
        } elseif ($request->user()->hasRole('Underwriter')) {
            // Underwriters see submitted / resubmitted / under_review / approved / rejected / cancellation_requested / cancelled
            $query->whereIn('status', ['submitted', 'resubmitted', 'under_review', 'approved', 'rejected', 'cancellation_requested', 'cancelled']);
        }

        if ($request->filled('creator_role')) {
            $roleName = $request->input('creator_role');
            $query->whereHas('preparedBy', function ($q) use ($roleName) {
                $q->whereHas('roles', function ($r) use ($roleName) {
                    $r->where('name', $roleName);
                });
            });
        }

        $quotations = $query
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->betweenDates($request->input('start_date'), $request->input('end_date'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'success' => true,
            'data' => $quotations,
        ]);
    }

    /**
     * Create a new quotation with items.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer|exists:customers,id',
            'valid_until' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1|max:20',
            'items.*.insurance_product_id' => 'required|integer|exists:insurance_products,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.sum_insured' => 'required|numeric|min:0|max:99999999.99',
            'items.*.premium_rate' => 'required|numeric|min:0|max:100',
            'items.*.premium_amount' => 'required|numeric|min:0|max:99999999.99',
            'items.*.coverage_details' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $quotation = DB::transaction(function () use ($request) {
            $quotation = Quotation::create([
                'quotation_number' => Quotation::generateNumber(),
                'customer_id' => $request->input('customer_id'),
                'prepared_by' => $request->user()->id,
                'status' => 'draft',
                'valid_until' => $request->input('valid_until'),
                'notes' => $request->input('notes'),
                'total_premium' => 0,
            ]);

            $totalPremium = 0;
            foreach ($request->input('items') as $item) {
                $quotation->items()->create($item);
                $totalPremium += (float) $item['premium_amount'];
            }

            $quotation->update(['total_premium' => $totalPremium]);

            return $quotation;
        });

        return response()->json([
            'success' => true,
            'message' => 'Quotation created successfully.',
            'data' => $quotation->load(['customer', 'items.insuranceProduct', 'preparedBy']),
        ], 201);
    }

    /**
     * Show quotation details with items and relationships.
     */
    public function show(string $id)
    {
        $quotation = Quotation::with([
            'customer',
            'policy',
            'items.insuranceProduct',
            'preparedBy:id,name,email',
            'reviewedBy:id,name,email',
        ])->find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if (request()->user()->isSalesOrRenewal() && $quotation->prepared_by !== request()->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this quotation record.',
            ], 403);
        }

        // Underwriters can view any quotation (needed for IR review)
        if (request()->user()->hasRole('Underwriter') && $quotation->customer && $quotation->customer->plate_no) {
            $duplicateCustomers = \App\Models\Customer::where('plate_no', $quotation->customer->plate_no)
                ->where('id', '!=', $quotation->customer->id)
                ->get(['id', 'customer_code', 'first_name', 'last_name']);
            
            $quotation->customer->setAttribute('duplicate_plates', $duplicateCustomers);
        }

        return response()->json([
            'success' => true,
            'data' => $quotation,
        ]);
    }

    /**
     * Update a draft quotation (items replaced entirely).
     */
    public function update(Request $request, string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if ($request->user()->isSalesOrRenewal() && $quotation->prepared_by !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this quotation record.',
            ], 403);
        }

        if (!in_array($quotation->status, ['draft', 'rejected', 'resubmitted'])) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft or rejected quotations can be edited.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer|exists:customers,id',
            'valid_until' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1|max:20',
            'items.*.insurance_product_id' => 'required|integer|exists:insurance_products,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.sum_insured' => 'required|numeric|min:0|max:99999999.99',
            'items.*.premium_rate' => 'required|numeric|min:0|max:100',
            'items.*.premium_amount' => 'required|numeric|min:0|max:99999999.99',
            'items.*.coverage_details' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::transaction(function () use ($quotation, $request) {
            $quotation->update([
                'customer_id' => $request->input('customer_id'),
                'valid_until' => $request->input('valid_until'),
                'notes' => $request->input('notes'),
            ]);

            // Replace items
            $quotation->items()->delete();
            $totalPremium = 0;
            foreach ($request->input('items') as $item) {
                $quotation->items()->create($item);
                $totalPremium += (float) $item['premium_amount'];
            }
            $quotation->update(['total_premium' => $totalPremium]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Quotation updated successfully.',
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct', 'preparedBy']),
        ]);
    }

    /**
     * Delete a draft quotation.
     */
    public function destroy(string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if (request()->user()->isSalesOrRenewal() && $quotation->prepared_by !== request()->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this quotation record.',
            ], 403);
        }

        if ($quotation->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft quotations can be deleted.',
            ], 422);
        }

        $this->audit('quotation.delete', $quotation, 'Deleted quotation #' . ($quotation->quotation_number ?? $quotation->id));

        $quotation->delete();

        return response()->json(['success' => true, 'message' => 'Quotation deleted successfully.']);
    }

    /**
     * Submit a draft quotation for underwriter review.
     */
    public function submit(string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if (request()->user()->isSalesOrRenewal() && $quotation->prepared_by !== request()->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this quotation record.',
            ], 403);
        }

        if (!in_array($quotation->status, ['draft', 'rejected', 'resubmitted'])) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft or rejected quotations can be submitted for review.',
            ], 422);
        }

        if ($quotation->items()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Quotation must have at least one item before submitting.',
            ], 422);
        }

        $newStatus = in_array($quotation->status, ['rejected', 'resubmitted']) ? 'resubmitted' : 'submitted';

        $quotation->update([
            'status' => $newStatus,
            'submitted_at' => now(),
            'ir_number' => $quotation->ir_number ?? Quotation::generateIRNumber(),
        ]);

        // Notify all Underwriters
        try {
            $underwriters = \App\Models\User::role('Underwriter')->get();
            $actionWord = $newStatus === 'resubmitted' ? 'resubmitted' : 'submitted';
            foreach ($underwriters as $underwriter) {
                \App\Models\Notification::create([
                    'user_id' => $underwriter->id,
                    'title' => $newStatus === 'resubmitted' ? 'Quotation Resubmitted for Review' : 'Quotation Submitted for Review',
                    'message' => "Quotation {$quotation->quotation_number} has been {$actionWord} by " . request()->user()->name . " and requires your review.",
                    'type' => 'info',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send quotation submission notifications: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => $newStatus === 'resubmitted' ? 'Quotation resubmitted for review.' : 'Quotation submitted for review.',
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct']),
        ]);
    }

    /**
     * Underwriter review: approve or reject with remarks.
     */
    public function review(Request $request, string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if (!in_array($quotation->status, ['submitted', 'under_review', 'resubmitted'])) {
            return response()->json([
                'success' => false,
                'message' => 'Only submitted or resubmitted quotations can be reviewed.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'reviewer_remarks' => 'nullable|string|max:2000',
            'or_number' => 'nullable|string|max:100',
            'trip_number' => 'nullable|string|max:100',
            'policy_number' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $action = $request->input('action');
        $invoice = null;
        $policy = null;

        DB::transaction(function () use ($quotation, $action, $request, &$invoice, &$policy) {
            $quotation->update([
                'status' => $action === 'approve' ? 'approved' : 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewer_remarks' => $request->input('reviewer_remarks'),
                'reviewed_at' => now(),
                'or_number' => $request->input('or_number', $quotation->or_number),
                'trip_number' => $request->input('trip_number', $quotation->trip_number),
            ]);

            // Automatically create or update Policy and Invoice if approved
            if ($action === 'approve') {
                $customer = $quotation->customer;
                $productId = $quotation->items->first()?->insurance_product_id;
                $providedPolicyNo = $request->input('policy_number');

                if ($customer && $providedPolicyNo) {
                    $customer->update(['policy_no' => $providedPolicyNo]);
                }

                $policyNoToUse = $providedPolicyNo ?: ($customer?->policy_no ?: null);

                // Find existing policy for this quotation or customer
                $existingPolicy = \App\Models\Policy::where('quotation_id', $quotation->id)
                    ->orWhere(function ($q) use ($quotation) {
                        if ($quotation->customer_id) {
                            $q->where('customer_id', $quotation->customer_id);
                        }
                    })->first();

                if ($existingPolicy) {
                    $existingPolicy->update([
                        'policy_number' => $policyNoToUse,
                        'quotation_id' => $quotation->id,
                        'customer_id' => $quotation->customer_id,
                        'insurance_product_id' => $productId,
                        'status' => 'active',
                    ]);
                    $policy = $existingPolicy;
                } else {
                    $policy = \App\Models\Policy::create([
                        'policy_number' => $policyNoToUse,
                        'quotation_id' => $quotation->id,
                        'customer_id' => $quotation->customer_id,
                        'insurance_product_id' => $productId,
                        'issued_by' => $request->user()->id,
                        'status' => 'active',
                        'effective_date' => $customer?->inception_date ?? now(),
                        'expiry_date' => $customer?->expiry_date ?? now()->addYear(),
                        'total_premium' => $customer?->policy_premium ?? 0,
                        'sum_insured' => $customer?->assured_value ?? 0,
                        'terms_and_conditions' => $quotation->notes,
                    ]);
                }

                // Create default coverages for the policy matching quotation items
                foreach ($quotation->items as $item) {
                    $policy->coverages()->create([
                        'coverage_name' => $item->insuranceProduct?->name ?? 'Premium Item',
                        'sum_insured' => $customer?->assured_value ?? 0,
                        'premium_rate' => 0,
                        'premium_amount' => $item->premium_amount,
                    ]);
                }

                // Create Invoice
                $invoice = \App\Models\Invoice::create([
                    'invoice_number' => \App\Models\Invoice::generateNumber(),
                    'policy_id' => $policy->id,
                    'customer_id' => $quotation->customer_id,
                    'created_by' => $request->user()->id,
                    'status' => 'sent',
                    'due_date' => $customer?->inception_date ?? now(),
                    'subtotal' => $customer?->policy_premium ?? 0,
                    'tax_amount' => 0,
                    'total_amount' => $customer?->policy_premium ?? 0,
                    'amount_paid' => 0,
                    'balance' => $customer?->policy_premium ?? 0,
                    'notes' => 'Automatically generated invoice from approved quotation ' . $quotation->quotation_number,
                ]);

                // Create line items
                $invoice->items()->create([
                    'description' => 'Insurance Premium - ' . ($quotation->items->first()?->insuranceProduct?->name ?? 'Policy'),
                    'quantity' => 1,
                    'unit_price' => $customer?->policy_premium ?? 0,
                    'amount' => $customer?->policy_premium ?? 0,
                ]);
            }
        });

        // After transaction commits, create Claim Notification outside the transaction
        // to prevent a NOT NULL violation from rolling back the approval
        if ($action === 'approve' && $policy) {
            try {
                $customer = $quotation->customer;
                $claimNotification = \App\Models\ClaimNotification::create([
                    'reference_number'   => \App\Models\ClaimNotification::generateNumber(),
                    'assured_name'       => trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? '')),
                    'contact_number'     => $customer->mobile ?? $customer->phone,
                    'email_address'      => $customer->email,
                    'insurance_provider' => $customer->insurance_provider ?? 'Supremogen Insurance Services',
                    'plate_number'       => $customer->plate_no,
                    'policy_number'      => $policy->policy_number ?? 'PENDING',
                    'inception_date'     => $policy->effective_date,
                    'accident_date'      => $policy->effective_date ?? now(),
                    'nature_of_claims'   => 'Auto-generated claim notification upon underwriting approval.',
                    'notes'              => 'Automatically generated from approved Quotation ' . $quotation->quotation_number,
                    'submitted_by'       => $quotation->prepared_by ?? $request->user()->id,
                    'status'             => 'pending',
                ]);

                // Notify all Claims Officers
                $officers = \App\Models\User::role('Claims Officer')->get();
                foreach ($officers as $officer) {
                    \App\Models\Notification::create([
                        'user_id' => $officer->id,
                        'title'   => 'Claim Notification Received',
                        'message' => "New claim notification {$claimNotification->reference_number} for assured \"{$claimNotification->assured_name}\" — Policy {$claimNotification->policy_number}.",
                        'type'    => 'warning',
                        'read_at' => null,
                    ]);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to create automatic claim notification: ' . $e->getMessage());
            }
        }

        // Notify the creator & team of the quotation (Sales Agent or Team Renewal)
        try {
            $refNo = $quotation->quotation_number ?: ($quotation->ir_number ?: "IR-{$quotation->id}");
            $underwriterName = $request->user()->name;

            if ($action === 'approve') {
                $assignedPolicyNo = $policy?->policy_number ?? $request->input('policy_number') ?? $quotation->customer?->policy_no;
                if (!empty($assignedPolicyNo)) {
                    $title = 'Policy Number Assigned';
                    $message = "Quotation {$refNo} has been approved and Policy No. {$assignedPolicyNo} was assigned by underwriter {$underwriterName}.";
                } else {
                    $title = 'Quotation Approved';
                    $message = "Quotation {$refNo} has been approved by underwriter {$underwriterName}.";
                }
                $type = 'success';
            } else {
                $title = 'Quotation Rejected';
                $message = "Quotation {$refNo} has been rejected by underwriter {$underwriterName}.";
                $type = 'error';
            }

            $this->notifySalesAndRenewalAgents($quotation, $title, $message, $type);

            // If approved, notify Accounting officers and Collection officers
            if ($action === 'approve') {
                $customerName = $quotation->customer
                    ? trim($quotation->customer->first_name . ' ' . $quotation->customer->last_name)
                    : 'Customer';

                // 1. Notify all Accounting Officers about the newly approved policy statement
                $accountingOfficers = \App\Models\User::role(['Accounting Officer', 'Team Support Operation'])->get();
                foreach ($accountingOfficers as $officer) {
                    \App\Models\Notification::create([
                        'user_id' => $officer->id,
                        'title'   => 'Policy Statement Ready',
                        'message' => "New policy billing statement for {$refNo} (Assured: {$customerName}) is ready for accounting processing.",
                        'type'    => 'success',
                        'read_at' => null,
                    ]);
                }

                // 2. Notify all Collection officers about the generated invoice
                if ($invoice) {
                    $collectionOfficers = \App\Models\User::role('Collection')->get();
                    foreach ($collectionOfficers as $officer) {
                        \App\Models\Notification::create([
                            'user_id' => $officer->id,
                            'title'   => 'Invoice Issued',
                            'message' => "A new invoice {$invoice->invoice_number} has been generated for {$customerName} with balance ₱" . number_format((float) $invoice->balance, 2) . ".",
                            'type'    => 'info',
                            'read_at' => null,
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send quotation review notification: ' . $e->getMessage());
        }

        $message = $action === 'approve' ? 'Quotation approved.' : 'Quotation rejected.';

        $this->audit(
            $action === 'approve' ? 'quotation.approve' : 'quotation.reject',
            $quotation,
            $message . ' Quotation #' . ($quotation->quotation_number ?? $quotation->id),
            ['status' => 'submitted'],
            ['status' => $action === 'approve' ? 'approved' : 'rejected'],
        );

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct', 'reviewedBy']),
        ]);
    }

    /**
     * Update quotation metadata (OR No., Trip No., Policy No.) by underwriter or admin.
     */
    public function updateMetadata(Request $request, string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        // Allow Underwriters, Admins, Owners, Super Admins
        if (!$request->user()->hasAnyRole(['Underwriter', 'Administrator', 'Owner', 'Super Admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'or_number' => 'nullable|string|max:100',
            'trip_number' => 'nullable|string|max:100',
            'policy_number' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->has('or_number')) {
            $quotation->or_number = $request->input('or_number');
        }
        if ($request->has('trip_number')) {
            $quotation->trip_number = $request->input('trip_number');
        }
        $quotation->save();

        if ($request->has('policy_number')) {
            $policyNo = $request->input('policy_number');

            if ($quotation->customer) {
                $quotation->customer->update(['policy_no' => $policyNo]);
            }

            $policy = \App\Models\Policy::where('quotation_id', $quotation->id)
                ->orWhere(function ($q) use ($quotation) {
                    if ($quotation->customer_id) {
                        $q->where('customer_id', $quotation->customer_id);
                    }
                })->first();

            if ($policy) {
                $policy->update(['policy_number' => $policyNo]);
            } else if ($policyNo && $quotation->customer_id) {
                \App\Models\Policy::create([
                    'policy_number' => $policyNo,
                    'quotation_id' => $quotation->id,
                    'customer_id' => $quotation->customer_id,
                    'insurance_product_id' => $quotation->items->first()?->insurance_product_id,
                    'issued_by' => $request->user()->id,
                    'status' => 'active',
                    'effective_date' => $quotation->customer?->inception_date ?? now(),
                    'expiry_date' => $quotation->customer?->expiry_date ?? now()->addYear(),
                    'total_premium' => $quotation->customer?->policy_premium ?? 0,
                    'sum_insured' => $quotation->customer?->assured_value ?? 0,
                    'terms_and_conditions' => $quotation->notes,
                ]);
            }

            if (!empty($policyNo)) {
                $refNo = $quotation->quotation_number ?: ($quotation->ir_number ?: "IR-{$quotation->id}");
                $customerName = $quotation->customer
                    ? trim($quotation->customer->first_name . ' ' . $quotation->customer->last_name)
                    : 'Customer';
                $underwriterName = $request->user()->name;

                $this->notifySalesAndRenewalAgents(
                    $quotation,
                    'Policy Number Assigned',
                    "Policy No. {$policyNo} has been assigned to quotation {$refNo} (Customer: {$customerName}) by underwriter {$underwriterName}.",
                    'success'
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Quotation metadata updated successfully.',
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct', 'policy']),
        ]);
    }

    /**
     * Request policy cancellation (Sales Agent / Team Renewal).
     */
    public function requestCancellation(Request $request, string $id)
    {
        $quotation = Quotation::with(['customer', 'items'])->find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if ($request->user()->isSalesOrRenewal() && $quotation->prepared_by !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'writing_date' => 'nullable|string',
            'cancellation_reason' => 'required|string|max:2000',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $firstItem = $quotation->items?->first();
        $cov = $firstItem?->coverage_details ?? [];
        $cust = $quotation->customer;

        $attachmentUrl = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $safeName = \Illuminate\Support\Str::uuid() . '.' . $extension;
            $disk = config('filesystems.default') ?: 'public';
            if ($disk === 'local') {
                $disk = 'public';
            }

            $path = $file->storeAs("attachments/cancellations", $safeName, $disk);

            $attachment = \App\Models\Attachment::create([
                'attachable_type' => \App\Models\Quotation::class,
                'attachable_id' => $quotation->id,
                'file_name' => $originalName,
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'document_type' => 'cancellation_supporting_document',
                'uploaded_by' => $request->user()?->id,
                'storage_disk' => $disk,
            ]);

            $attachmentUrl = "/api/v1/attachments/{$attachment->id}/download";
        }

        $writingDate = $request->input('writing_date') ?? ($cust?->inception_date ?? now()->toDateString());
        $clientName = $cust ? trim("{$cust->first_name} {$cust->last_name}") : '—';
        $policyNumber = $cust?->policy_no ?? $quotation->policy?->policy_number ?? $quotation->policy_number ?? '—';
        $plateNumber = $cov['plate_no'] ?? $cust?->plate_no ?? '—';
        $provider = $cov['insurance_provider'] ?? $cust?->insurance_provider ?? 'ALPHA';
        $inception = $request->input('inception') ?? ($cust?->inception_date ?? '—');

        $cancellationDetails = [
            'writing_date' => $writingDate,
            'client_name' => $clientName,
            'policy_number' => $policyNumber,
            'plate_number' => $plateNumber,
            'provider' => $provider,
            'inception' => $inception,
            'reason' => $request->input('cancellation_reason'),
            'attachment_url' => $attachmentUrl,
        ];

        $quotation->update([
            'status' => 'cancellation_requested',
            'cancellation_reason' => $request->input('cancellation_reason'),
            'cancellation_details' => $cancellationDetails,
            'cancellation_requested_by' => $request->user()->id,
            'cancellation_requested_at' => now(),
        ]);

        // Notify Underwriters
        try {
            $underwriters = \App\Models\User::role('Underwriter')->get();
            $requestNumber = $quotation->quotation_number ?? $quotation->ir_number ?? 'Request';
            foreach ($underwriters as $underwriter) {
                \App\Models\Notification::create([
                    'user_id' => $underwriter->id,
                    'title' => 'Policy Cancellation Requested',
                    'message' => "Cancellation requested for {$requestNumber} ({$clientName}) by " . $request->user()->name . ".",
                    'type' => 'warning',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify underwriters of cancellation request: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Policy cancellation request submitted successfully.',
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct', 'cancellationRequestedBy']),
        ]);
    }

    /**
     * Underwriter review of cancellation request (approve or reject).
     */
    public function reviewCancellation(Request $request, string $id)
    {
        $quotation = Quotation::with(['customer', 'policy'])->find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        if (!$request->user()->hasRole('Underwriter')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], 403);
        }

        if ($quotation->status !== 'cancellation_requested') {
            return response()->json([
                'success' => false,
                'message' => 'No active cancellation request found for this policy.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'remarks' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $action = $request->input('action');
        $remarks = $request->input('remarks');

        DB::transaction(function () use ($quotation, $action, $remarks, $request) {
            if ($action === 'approve') {
                $quotation->update([
                    'status' => 'cancelled',
                    'reviewer_remarks' => $remarks ?? $quotation->reviewer_remarks,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

                if ($quotation->policy) {
                    $quotation->policy->update([
                        'status' => 'cancelled',
                        'cancellation_reason' => $quotation->cancellation_reason,
                        'cancelled_at' => now(),
                    ]);

                    // Automatically void invoice in Collection and Accounting
                    \App\Models\Invoice::where('policy_id', $quotation->policy->id)
                        ->update([
                            'status' => 'voided',
                            'balance' => 0,
                            'notes' => 'Invoice automatically voided due to approved policy cancellation request.',
                        ]);
                }

                // Also void any open invoices for this customer
                if ($quotation->customer_id) {
                    \App\Models\Invoice::where('customer_id', $quotation->customer_id)
                        ->whereIn('status', ['sent', 'unpaid', 'partially_paid', 'overdue', 'draft'])
                        ->update([
                            'status' => 'voided',
                            'balance' => 0,
                        ]);
                }
            } else {
                // Reject cancellation -> restore status back to approved
                $quotation->update([
                    'status' => 'approved',
                    'reviewer_remarks' => $remarks ? "Cancellation Request Rejected: {$remarks}" : $quotation->reviewer_remarks,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);
            }
        });

        // Notify requested sales agent
        if ($quotation->cancellation_requested_by) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $quotation->cancellation_requested_by,
                    'title' => $action === 'approve' ? 'Cancellation Request Approved' : 'Cancellation Request Rejected',
                    'message' => "Cancellation request for policy {$quotation->ir_number} was " . ($action === 'approve' ? 'approved' : 'rejected') . " by Underwriter.",
                    'type' => $action === 'approve' ? 'info' : 'warning',
                    'read_at' => null,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to notify agent of cancellation decision: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => $action === 'approve' ? 'Cancellation approved and policy cancelled.' : 'Cancellation request rejected.',
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct', 'reviewedBy']),
        ]);
    }

    /**
     * Toggle remittance status for a policy statement / quotation.
     */
    public function toggleRemittance(Request $request, string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        $newVal = !(bool) $quotation->is_remitted;
        $boolString = $newVal ? 'true' : 'false';
        $remittedAt = $newVal ? now()->toDateTimeString() : null;
        $remittedAtSql = $remittedAt ? "'{$remittedAt}'" : 'NULL';

        // PostgreSQL requires raw boolean keyword (true/false) instead of integer binding (1/0)
        DB::statement("UPDATE quotations SET is_remitted = {$boolString}, remitted_at = {$remittedAtSql}, updated_at = NOW() WHERE id = ?", [$quotation->id]);

        $quotation->refresh();

        // Notify Claims Officers about remittance status change
        try {
            $user = $request->user();
            $customerName = '';
            if ($quotation->customer) {
                $customerName = trim(($quotation->customer->first_name ?? '') . ' ' . ($quotation->customer->last_name ?? ''));
            }
            $ref = $quotation->quotation_number ?? $quotation->ir_number ?? "QUO-{$quotation->id}";
            $statusText = $newVal ? 'Remitted' : 'Unremitted';

            $claimsOfficers = User::role('Claims Officer')->get();
            foreach ($claimsOfficers as $officer) {
                Notification::create([
                    'user_id' => $officer->id,
                    'title'   => "Remittance Status: {$statusText}",
                    'message' => "{$user->name} marked {$ref}" . ($customerName ? " ({$customerName})" : '') . " as {$statusText}.",
                    'type'    => $newVal ? 'success' : 'warning',
                    'read_at' => null,
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to notify Claims Officers about remittance change: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => $newVal ? 'Policy statement marked as Remitted.' : 'Policy statement marked as Unremitted.',
            'data' => $quotation->fresh(['customer', 'policy', 'attachments']),
        ]);
    }

    /**
     * Notify Sales Agent / Team Renewal associated with a quotation.
     */
    protected function notifySalesAndRenewalAgents(Quotation $quotation, string $title, string $message, string $type = 'success'): void
    {
        try {
            $targetUserIds = collect();

            if ($quotation->prepared_by) {
                $targetUserIds->push($quotation->prepared_by);
            }

            if ($quotation->customer) {
                if ($quotation->customer->created_by) {
                    $creator = \App\Models\User::find($quotation->customer->created_by);
                    if ($creator && $creator->isSalesOrRenewal()) {
                        $targetUserIds->push($creator->id);
                    }
                }
                if ($quotation->customer->agent) {
                    $matchedAgent = \App\Models\User::where('name', $quotation->customer->agent)->first();
                    if ($matchedAgent && $matchedAgent->isSalesOrRenewal()) {
                        $targetUserIds->push($matchedAgent->id);
                    }
                }
            }

            // Fallback: if no specific agent user found, notify all active Sales Agent and Team Renewal users
            if ($targetUserIds->isEmpty()) {
                $agentsAndRenewals = \App\Models\User::role(['Sales Agent', 'Team Renewal'])->get();
                foreach ($agentsAndRenewals as $agentUser) {
                    $targetUserIds->push($agentUser->id);
                }
            }

            foreach ($targetUserIds->unique() as $userId) {
                $alreadyNotified = \App\Models\Notification::where('user_id', $userId)
                    ->where('title', $title)
                    ->where('message', $message)
                    ->where('created_at', '>=', now()->subSeconds(10))
                    ->exists();

                if (!$alreadyNotified) {
                    \App\Models\Notification::create([
                        'user_id' => $userId,
                        'title'   => $title,
                        'message' => $message,
                        'type'    => $type,
                        'read_at' => null,
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify sales agent/team renewal: ' . $e->getMessage());
        }
    }
}
