<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Policy;
use App\Models\PolicyCoverage;
use App\Models\Quotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Traits\Auditable;

class PolicyController extends Controller
{
    use Auditable;
    /**
     * Paginated list of policies.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['policy_number', 'total_premium', 'status', 'effective_date', 'expiry_date', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $query = Policy::with([
                'customer:id,customer_code,first_name,last_name',
                'insuranceProduct:id,name,code',
                'issuedBy:id,name',
            ]);

        if ($request->user()->isSalesOrRenewal()) {
            $query->where(function ($q) use ($request) {
                $q->where('issued_by', $request->user()->id)
                  ->orWhereHas('quotation', function ($q2) use ($request) {
                      $q2->where('prepared_by', $request->user()->id);
                  });
            });
        }

        $policies = $query
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'success' => true,
            'data' => $policies,
        ]);
    }

    /**
     * Issue a new policy (typically from an approved quotation).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'policy_number' => 'nullable|string|max:100|unique:policies,policy_number',
            'quotation_id' => 'nullable|integer|exists:quotations,id',
            'customer_id' => 'required|integer|exists:customers,id',
            'insurance_product_id' => 'required|integer|exists:insurance_products,id',
            'effective_date' => 'required|date',
            'expiry_date' => 'required|date|after:effective_date',
            'total_premium' => 'required|numeric|min:0|max:99999999.99',
            'sum_insured' => 'required|numeric|min:0|max:99999999.99',
            'terms_and_conditions' => 'nullable|string|max:5000',
            'coverages' => 'nullable|array|max:20',
            'coverages.*.coverage_name' => 'required|string|max:200',
            'coverages.*.coverage_description' => 'nullable|string|max:1000',
            'coverages.*.sum_insured' => 'required|numeric|min:0|max:99999999.99',
            'coverages.*.premium_amount' => 'required|numeric|min:0|max:99999999.99',
            'coverages.*.deductible' => 'nullable|numeric|min:0|max:99999999.99',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // If from a quotation, verify it's approved
        if ($request->input('quotation_id')) {
            $quotation = Quotation::find($request->input('quotation_id'));
            if (!$quotation || $quotation->status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Policy can only be issued from an approved quotation.',
                ], 422);
            }
        }

        $policy = DB::transaction(function () use ($request) {
            $policy = Policy::create([
                'policy_number' => $request->input('policy_number') ?: Policy::generateNumber(),
                'quotation_id' => $request->input('quotation_id'),
                'customer_id' => $request->input('customer_id'),
                'insurance_product_id' => $request->input('insurance_product_id'),
                'issued_by' => $request->user()->id,
                'status' => 'active',
                'effective_date' => $request->input('effective_date'),
                'expiry_date' => $request->input('expiry_date'),
                'total_premium' => $request->input('total_premium'),
                'sum_insured' => $request->input('sum_insured'),
                'terms_and_conditions' => $request->input('terms_and_conditions'),
            ]);

            // Create coverages
            if ($request->has('coverages')) {
                foreach ($request->input('coverages') as $coverage) {
                    $policy->coverages()->create($coverage);
                }
            }

            return $policy;
        });

        // Notify the agent who prepared the quotation or who owns the customer (Sales Agent or Team Renewal)
        try {
            $policyNumber = $policy->policy_number;
            $customerName = $policy->customer ? trim($policy->customer->first_name . ' ' . $policy->customer->last_name) : 'Customer';
            $underwriterName = $request->user()->name;

            $targetUserIds = collect();
            if ($policy->quotation_id) {
                $quotation = Quotation::find($policy->quotation_id);
                if ($quotation && $quotation->prepared_by) {
                    $targetUserIds->push($quotation->prepared_by);
                }
            }
            if ($policy->customer_id) {
                $customer = \App\Models\Customer::find($policy->customer_id);
                if ($customer) {
                    if ($customer->created_by) {
                        $creator = \App\Models\User::find($customer->created_by);
                        if ($creator && $creator->isSalesOrRenewal()) {
                            $targetUserIds->push($creator->id);
                        }
                    }
                    if ($customer->agent) {
                        $matchedAgent = \App\Models\User::where('name', $customer->agent)->first();
                        if ($matchedAgent && $matchedAgent->isSalesOrRenewal()) {
                            $targetUserIds->push($matchedAgent->id);
                        }
                    }
                }
            }

            if ($targetUserIds->isEmpty()) {
                $agentsAndRenewals = \App\Models\User::role(['Sales Agent', 'Team Renewal'])->get();
                foreach ($agentsAndRenewals as $agentUser) {
                    $targetUserIds->push($agentUser->id);
                }
            }

            $title = 'Policy Number Assigned';
            $message = "Policy No. {$policyNumber} has been successfully assigned and policy issued for {$customerName} by underwriter {$underwriterName}.";

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
                        'type'    => 'success',
                        'read_at' => null,
                    ]);
                }
            }

            // Also notify all Accounting Officers about the newly issued policy statement
            $accountingOfficers = \App\Models\User::role('Accounting Officer')->get();
            $customerName = $policy->customer ? trim($policy->customer->first_name . ' ' . $policy->customer->last_name) : 'Customer';
            foreach ($accountingOfficers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title'   => 'Policy Statement Ready',
                    'message' => "New policy billing statement for Policy {$policy->policy_number} (Assured: {$customerName}) is ready for accounting processing.",
                    'type'    => 'success',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send policy issuance notification: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Policy issued successfully.',
            'data' => $policy->load(['customer', 'insuranceProduct', 'coverages', 'issuedBy']),
        ], 201);
    }

    /**
     * Show policy details.
     */
    public function show(string $id)
    {
        $policy = Policy::with([
            'customer',
            'quotation:id,quotation_number,status,prepared_by',
            'insuranceProduct',
            'issuedBy:id,name,email',
            'coverages',
        ])->find($id);

        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found.'], 404);
        }

        if (request()->user()->isSalesOrRenewal()) {
            $isOwner = $policy->issued_by === request()->user()->id || 
                       ($policy->quotation && $policy->quotation->prepared_by === request()->user()->id);
            if (!$isOwner) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this policy record.',
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $policy,
        ]);
    }

    /**
     * Update policy details (limited fields).
     */
    public function update(Request $request, string $id)
    {
        $policy = Policy::with('quotation')->find($id);

        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found.'], 404);
        }

        if ($request->user()->isSalesOrRenewal()) {
            $isOwner = $policy->issued_by === $request->user()->id || 
                       ($policy->quotation && $policy->quotation->prepared_by === $request->user()->id);
            if (!$isOwner) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this policy record.',
                ], 403);
            }
        }

        if ($policy->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Only active policies can be updated.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'terms_and_conditions' => 'nullable|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $policy->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Policy updated successfully.',
            'data' => $policy->fresh(['customer', 'coverages']),
        ]);
    }

    /**
     * Cancel an active policy with reason.
     */
    public function cancel(Request $request, string $id)
    {
        $policy = Policy::with('quotation')->find($id);

        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found.'], 404);
        }

        if ($request->user()->isSalesOrRenewal()) {
            $isOwner = $policy->issued_by === $request->user()->id || 
                       ($policy->quotation && $policy->quotation->prepared_by === $request->user()->id);
            if (!$isOwner) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this policy record.',
                ], 403);
            }
        }

        if ($policy->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Only active policies can be cancelled.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'cancellation_reason' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $policy->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $request->input('cancellation_reason'),
        ]);

        $this->audit('policy.cancel', $policy, 'Cancelled policy #' . $policy->policy_number,
            ['status' => 'active'],
            ['status' => 'cancelled', 'reason' => $request->input('cancellation_reason')],
        );

        return response()->json([
            'success' => true,
            'message' => 'Policy cancelled successfully.',
            'data' => $policy->fresh(),
        ]);
    }
}
