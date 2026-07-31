<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Renewal;
use App\Models\Policy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RenewalController extends Controller
{
    /**
     * Paginated list of renewals.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'original_expiry_date');
        $sortDir = strtolower($request->input('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';

        $allowed = ['renewal_number', 'status', 'original_expiry_date', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'original_expiry_date';

        $renewals = Renewal::with([
                'customer:id,customer_code,first_name,last_name',
                'policy:id,policy_number,total_premium,expiry_date',
                'policy.insuranceProduct:id,name',
                'newPolicy:id,policy_number',
                'processedBy:id,name',
            ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json(['success' => true, 'data' => $renewals]);
    }

    /**
     * Show renewal details.
     */
    public function show(string $id)
    {
        $renewal = Renewal::with([
            'customer', 'policy.insuranceProduct', 'policy.coverages',
            'newPolicy:id,policy_number,status',
            'processedBy:id,name,email',
        ])->find($id);

        if (!$renewal) {
            return response()->json(['success' => false, 'message' => 'Renewal not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $renewal]);
    }

    /**
     * Process a renewal — mark as renewed with new policy dates.
     */
    public function process(Request $request, string $id)
    {
        $renewal = Renewal::find($id);
        if (!$renewal) return response()->json(['success' => false, 'message' => 'Renewal not found.'], 404);

        if ($renewal->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Only pending renewals can be processed.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'new_effective_date' => 'required|date',
            'new_expiry_date' => 'required|date|after:new_effective_date',
            'premium_adjustment' => 'nullable|numeric|min:-99999999.99|max:99999999.99',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        // Create the new policy from the old one
        $oldPolicy = $renewal->policy;
        $adjustment = (float) $request->input('premium_adjustment', 0);
        $newPremium = (float) $oldPolicy->total_premium + $adjustment;

        $newPolicy = Policy::create([
            'policy_number' => Policy::generateNumber(),
            'quotation_id' => null,
            'customer_id' => $renewal->customer_id,
            'insurance_product_id' => $oldPolicy->insurance_product_id,
            'issued_by' => $request->user()->id,
            'status' => 'active',
            'effective_date' => $request->input('new_effective_date'),
            'expiry_date' => $request->input('new_expiry_date'),
            'total_premium' => max($newPremium, 0),
            'sum_insured' => $oldPolicy->sum_insured,
            'terms_and_conditions' => $oldPolicy->terms_and_conditions,
        ]);

        // Copy coverages
        foreach ($oldPolicy->coverages as $cov) {
            $newPolicy->coverages()->create([
                'coverage_name' => $cov->coverage_name,
                'coverage_description' => $cov->coverage_description,
                'sum_insured' => $cov->sum_insured,
                'premium_amount' => $cov->premium_amount,
                'deductible' => $cov->deductible,
            ]);
        }

        $renewal->update([
            'status' => 'renewed',
            'new_policy_id' => $newPolicy->id,
            'new_effective_date' => $request->input('new_effective_date'),
            'new_expiry_date' => $request->input('new_expiry_date'),
            'premium_adjustment' => $adjustment,
            'processed_by' => $request->user()->id,
            'notes' => $request->input('notes'),
        ]);

        // Notify the agent who owns this customer about the renewal
        try {
            if ($renewal->customer && $renewal->customer->created_by) {
                \App\Models\Notification::create([
                    'user_id' => $renewal->customer->created_by,
                    'title' => 'Policy Renewed',
                    'message' => "Policy {$oldPolicy->policy_number} has been renewed as {$newPolicy->policy_number}.",
                    'type' => 'success',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send renewal notification: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Policy renewed successfully.',
            'data' => $renewal->fresh(['customer', 'policy', 'newPolicy']),
        ]);
    }

    /**
     * Cancel a pending renewal.
     */
    public function cancel(Request $request, string $id)
    {
        $renewal = Renewal::find($id);
        if (!$renewal) return response()->json(['success' => false, 'message' => 'Renewal not found.'], 404);

        if ($renewal->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Only pending renewals can be cancelled.'], 422);
        }

        $renewal->update([
            'status' => 'cancelled',
            'notes' => $request->input('notes', $renewal->notes),
        ]);

        return response()->json([
            'success' => true, 'message' => 'Renewal cancelled.',
            'data' => $renewal->fresh(),
        ]);
    }
}
