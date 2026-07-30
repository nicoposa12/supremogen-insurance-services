<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Traits\Auditable;

class ClaimController extends Controller
{
    use Auditable;
    /**
     * Paginated list of claims.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['claim_number', 'claim_amount', 'status', 'incident_date', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $query = Claim::with([
                'customer:id,customer_code,first_name,last_name',
                'policy:id,policy_number',
                'filedBy:id,name',
                'assignedTo:id,name',
            ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'));

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        $claims = $query->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json(['success' => true, 'data' => $claims]);
    }

    /**
     * File a new claim.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'policy_id' => 'required|exists:policies,id',
            'customer_id' => 'required|exists:customers,id',
            'incident_date' => 'required|date|before_or_equal:today',
            'incident_description' => 'required|string|max:5000',
            'claim_amount' => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $claim = Claim::create([
            'claim_number' => Claim::generateNumber(),
            'policy_id' => $request->input('policy_id'),
            'customer_id' => $request->input('customer_id'),
            'filed_by' => $request->user()->id,
            'status' => 'filed',
            'incident_date' => $request->input('incident_date'),
            'incident_description' => $request->input('incident_description'),
            'claim_amount' => $request->input('claim_amount'),
        ]);

        // Notify all Claims Officers
        try {
            $officers = \App\Models\User::role('Claims Officer')->get();
            foreach ($officers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title' => 'Claim Filed',
                    'message' => "A new claim {$claim->claim_number} has been filed and is awaiting assignment.",
                    'type' => 'warning',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send claim notification: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Claim filed successfully.',
            'data' => $claim->load(['customer', 'policy', 'filedBy']),
        ], 201);
    }

    /**
     * Show claim details.
     */
    public function show(string $id)
    {
        $claim = Claim::with([
            'customer', 'policy.insuranceProduct',
            'filedBy:id,name,email', 'assignedTo:id,name,email',
        ])->find($id);

        if (!$claim) {
            return response()->json(['success' => false, 'message' => 'Claim not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $claim]);
    }

    /**
     * Update a filed claim (before investigation).
     */
    public function update(Request $request, string $id)
    {
        $claim = Claim::find($id);
        if (!$claim) return response()->json(['success' => false, 'message' => 'Claim not found.'], 404);

        if ($claim->status !== 'filed') {
            return response()->json(['success' => false, 'message' => 'Only filed claims can be edited.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'incident_date' => 'required|date|before_or_equal:today',
            'incident_description' => 'required|string|max:5000',
            'claim_amount' => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $claim->update($validator->validated());

        return response()->json([
            'success' => true, 'message' => 'Claim updated.',
            'data' => $claim->fresh(['customer', 'policy']),
        ]);
    }

    /**
     * Assign a claim to an adjuster/investigator.
     */
    public function assign(Request $request, string $id)
    {
        $claim = Claim::find($id);
        if (!$claim) return response()->json(['success' => false, 'message' => 'Claim not found.'], 404);

        if (!in_array($claim->status, ['filed', 'under_investigation'])) {
            return response()->json(['success' => false, 'message' => 'Claim cannot be assigned at this stage.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'assigned_to' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        $claim->update([
            'assigned_to' => $request->input('assigned_to'),
            'status' => 'under_investigation',
        ]);

        $assignee = \App\Models\User::find($request->input('assigned_to'));
        $this->audit('claim.assign', $claim, 'Assigned claim #' . $claim->claim_number . ' to ' . ($assignee->name ?? 'User #' . $request->input('assigned_to')),
            ['status' => 'filed'],
            ['status' => 'under_investigation', 'assigned_to' => $request->input('assigned_to')],
        );

        // Notify the assigned Claims Officer
        try {
            if ($claim->assigned_to) {
                \App\Models\Notification::create([
                    'user_id' => $claim->assigned_to,
                    'title' => 'Claim Assigned to You',
                    'message' => "Claim {$claim->claim_number} has been assigned to you for investigation.",
                    'type' => 'info',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify assigned officer: ' . $e->getMessage());
        }

        // Notify the creator of the claim
        try {
            if ($claim->filed_by) {
                \App\Models\Notification::create([
                    'user_id' => $claim->filed_by,
                    'title' => 'Claim Status Updated',
                    'message' => "Claim {$claim->claim_number} has been moved to Under Investigation.",
                    'type' => 'warning',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify claim creator on assignment: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true, 'message' => 'Claim assigned for investigation.',
            'data' => $claim->fresh(['customer', 'policy', 'assignedTo']),
        ]);
    }

    /**
     * Approve or deny a claim.
     */
    public function review(Request $request, string $id)
    {
        $claim = Claim::find($id);
        if (!$claim) return response()->json(['success' => false, 'message' => 'Claim not found.'], 404);

        if (!in_array($claim->status, ['filed', 'under_investigation'])) {
            return response()->json(['success' => false, 'message' => 'Claim cannot be reviewed at this stage.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,deny',
            'approved_amount' => 'required_if:action,approve|nullable|numeric|min:0',
            'adjuster_remarks' => 'nullable|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        $oldStatus = $claim->status;
        $action = $request->input('action');
        $claim->update([
            'status' => $action === 'approve' ? 'approved' : 'denied',
            'approved_amount' => $action === 'approve' ? $request->input('approved_amount') : null,
            'adjuster_remarks' => $request->input('adjuster_remarks'),
        ]);

        $this->audit(
            $action === 'approve' ? 'claim.approve' : 'claim.deny',
            $claim,
            ($action === 'approve' ? 'Approved' : 'Denied') . ' claim #' . $claim->claim_number,
            ['status' => $oldStatus],
            ['status' => $action === 'approve' ? 'approved' : 'denied', 'approved_amount' => $request->input('approved_amount')],
        );

        // Notify the creator of the claim
        try {
            if ($claim->filed_by) {
                \App\Models\Notification::create([
                    'user_id' => $claim->filed_by,
                    'title' => $action === 'approve' ? 'Claim Approved' : 'Claim Denied',
                    'message' => "Claim {$claim->claim_number} has been " . ($action === 'approve' ? 'approved' : 'denied') . ".",
                    'type' => $action === 'approve' ? 'success' : 'error',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify claim creator on review: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => $action === 'approve' ? 'Claim approved.' : 'Claim denied.',
            'data' => $claim->fresh(['customer', 'policy']),
        ]);
    }

    /**
     * Settle an approved claim.
     */
    public function settle(Request $request, string $id)
    {
        $claim = Claim::find($id);
        if (!$claim) return response()->json(['success' => false, 'message' => 'Claim not found.'], 404);

        if ($claim->status !== 'approved') {
            return response()->json(['success' => false, 'message' => 'Only approved claims can be settled.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'settlement_amount' => 'required|numeric|min:0',
            'settlement_date' => 'required|date',
            'adjuster_remarks' => 'nullable|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        $claim->update([
            'status' => 'settled',
            'settlement_amount' => $request->input('settlement_amount'),
            'settlement_date' => $request->input('settlement_date'),
            'adjuster_remarks' => $request->input('adjuster_remarks') ?? $claim->adjuster_remarks,
        ]);

        $this->audit('claim.settle', $claim, 'Settled claim #' . $claim->claim_number . ' for ₱' . number_format((float) $request->input('settlement_amount'), 2),
            ['status' => 'approved'],
            ['status' => 'settled', 'settlement_amount' => $request->input('settlement_amount')],
        );

        // Notify the creator of the claim
        try {
            if ($claim->filed_by) {
                \App\Models\Notification::create([
                    'user_id' => $claim->filed_by,
                    'title' => 'Claim Settled',
                    'message' => "Claim {$claim->claim_number} has been settled.",
                    'type' => 'success',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to notify claim creator on settlement: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true, 'message' => 'Claim settled.',
            'data' => $claim->fresh(['customer', 'policy']),
        ]);
    }

    /**
     * Delete a filed claim.
     */
    public function destroy(string $id)
    {
        $claim = Claim::find($id);
        if (!$claim) return response()->json(['success' => false, 'message' => 'Claim not found.'], 404);
        if ($claim->status !== 'filed') {
            return response()->json(['success' => false, 'message' => 'Only filed claims can be deleted.'], 422);
        }
        $claim->delete();
        return response()->json(['success' => true, 'message' => 'Claim deleted.']);
    }
}
