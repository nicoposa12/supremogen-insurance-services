<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class QuotationController extends Controller
{
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

        $query = Quotation::with(['customer:id,customer_code,first_name,last_name,plate_no,unit', 'customer.attachments', 'preparedBy:id,name']);

        if ($request->user()->isSalesOrRenewal()) {
            $query->where('prepared_by', $request->user()->id);
        } elseif ($request->user()->hasRole('Underwriter')) {
            // Underwriters only see submitted / under_review / approved / rejected
            $query->whereIn('status', ['submitted', 'under_review', 'approved', 'rejected']);
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
            'customer_id' => 'required|exists:customers,id',
            'valid_until' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.insurance_product_id' => 'required|exists:insurance_products,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.sum_insured' => 'required|numeric|min:0',
            'items.*.premium_rate' => 'required|numeric|min:0',
            'items.*.premium_amount' => 'required|numeric|min:0',
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

        if ($quotation->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft quotations can be edited.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|exists:customers,id',
            'valid_until' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.insurance_product_id' => 'required|exists:insurance_products,id',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.sum_insured' => 'required|numeric|min:0',
            'items.*.premium_rate' => 'required|numeric|min:0',
            'items.*.premium_amount' => 'required|numeric|min:0',
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

        if ($quotation->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft quotations can be submitted.',
            ], 422);
        }

        if ($quotation->items()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Quotation must have at least one item before submitting.',
            ], 422);
        }

        $quotation->update([
            'status' => 'submitted',
            'submitted_at' => now(),
            'ir_number' => $quotation->ir_number ?? Quotation::generateIRNumber(),
        ]);

        // Notify all Underwriters
        try {
            $underwriters = \App\Models\User::role('Underwriter')->get();
            foreach ($underwriters as $underwriter) {
                \App\Models\Notification::create([
                    'user_id' => $underwriter->id,
                    'title' => 'Quotation Submitted for Review',
                    'message' => "Quotation {$quotation->quotation_number} has been submitted by " . request()->user()->name . " and requires your review.",
                    'type' => 'info',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send quotation submission notifications: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Quotation submitted for review.',
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

        if (!in_array($quotation->status, ['submitted', 'under_review'])) {
            return response()->json([
                'success' => false,
                'message' => 'Only submitted quotations can be reviewed.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'reviewer_remarks' => 'nullable|string|max:2000',
            'or_number' => 'nullable|string|max:100',
            'trip_number' => 'nullable|string|max:100',
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

        DB::transaction(function () use ($quotation, $action, $request, &$invoice) {
            $quotation->update([
                'status' => $action === 'approve' ? 'approved' : 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewer_remarks' => $request->input('reviewer_remarks'),
                'reviewed_at' => now(),
                'or_number' => $request->input('or_number', $quotation->or_number),
                'trip_number' => $request->input('trip_number', $quotation->trip_number),
            ]);

            // Automatically create Policy and Invoice if approved
            if ($action === 'approve') {
                $customer = $quotation->customer;
                $productId = $quotation->items->first()?->insurance_product_id;
                
                $policy = \App\Models\Policy::create([
                    'policy_number' => \App\Models\Policy::generateNumber(),
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

                // Automatically create a Claim Notification for Claims Officers
                try {
                    $claimNotification = \App\Models\ClaimNotification::create([
                        'reference_number'   => \App\Models\ClaimNotification::generateNumber(),
                        'assured_name'       => trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? '')),
                        'contact_number'     => $customer->mobile ?? $customer->phone,
                        'email_address'      => $customer->email,
                        'insurance_provider' => $customer->insurance_provider ?? 'Supremogen Insurance Services',
                        'plate_number'       => $customer->plate_no,
                        'policy_number'      => $policy->policy_number,
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
        });

        // Notify the creator of the quotation (Sales Agent or Team Renewal)
        try {
            if ($quotation->prepared_by) {
                \App\Models\Notification::create([
                    'user_id' => $quotation->prepared_by,
                    'title' => $action === 'approve' ? 'Quotation Approved' : 'Quotation Rejected',
                    'message' => "Quotation {$quotation->quotation_number} has been " . ($action === 'approve' ? 'approved' : 'rejected') . " by " . $request->user()->name . ".",
                    'type' => $action === 'approve' ? 'success' : 'error',
                    'read_at' => null,
                ]);
            }

            // If approved, also notify all Collection officers about the generated invoice
            if ($action === 'approve' && $invoice) {
                $collectionOfficers = \App\Models\User::role('Collection')->get();
                foreach ($collectionOfficers as $officer) {
                    \App\Models\Notification::create([
                        'user_id' => $officer->id,
                        'title' => 'Invoice Issued',
                        'message' => "A new invoice {$invoice->invoice_number} has been generated for " . ($quotation->customer ? ($quotation->customer->first_name . ' ' . $quotation->customer->last_name) : 'Customer') . " with balance ₱" . number_format($invoice->balance, 2) . ".",
                        'type' => 'info',
                        'read_at' => null,
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send quotation review notification: ' . $e->getMessage());
        }

        $message = $action === 'approve' ? 'Quotation approved.' : 'Quotation rejected.';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct', 'reviewedBy']),
        ]);
    }

    /**
     * Update quotation metadata (OR No. and Trip No.) by underwriter.
     */
    public function updateMetadata(Request $request, string $id)
    {
        $quotation = Quotation::find($id);

        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found.'], 404);
        }

        // Only underwriters can update metadata
        if (!$request->user()->hasRole('Underwriter')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'or_number' => 'nullable|string|max:100',
            'trip_number' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $quotation->update([
            'or_number' => $request->input('or_number', $quotation->or_number),
            'trip_number' => $request->input('trip_number', $quotation->trip_number),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Quotation metadata updated successfully.',
            'data' => $quotation->fresh(['customer', 'items.insuranceProduct']),
        ]);
    }
}
