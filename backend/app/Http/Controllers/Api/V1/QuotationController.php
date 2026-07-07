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

        $query = Quotation::with(['customer:id,customer_code,first_name,last_name,plate_no,unit', 'preparedBy:id,name']);

        if ($request->user()->isSalesOrRenewal()) {
            $query->where('prepared_by', $request->user()->id);
        } elseif ($request->user()->hasRole('Underwriter')) {
            // Underwriters only see submitted / under_review / approved / rejected
            $query->whereIn('status', ['submitted', 'under_review', 'approved', 'rejected']);
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

        $quotation->update([
            'status' => $action === 'approve' ? 'approved' : 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewer_remarks' => $request->input('reviewer_remarks'),
            'reviewed_at' => now(),
            'or_number' => $request->input('or_number', $quotation->or_number),
            'trip_number' => $request->input('trip_number', $quotation->trip_number),
        ]);

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
