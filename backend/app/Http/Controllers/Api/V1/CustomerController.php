<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    /**
     * Display a paginated list of customers.
     * Supports: search, status filter, type filter, sorting.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        // Whitelist sortable columns
        $allowedSorts = ['customer_code', 'first_name', 'last_name', 'email', 'customer_type', 'status', 'policy_status', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'created_at';
        }
        $sortDir = strtolower($sortDir) === 'asc' ? 'asc' : 'desc';

        if ($request->boolean('include_cancelled')) {
            $query = Customer::with(['createdBy.roles', 'quotations'])
                ->whereHas('quotations', function ($q) {
                    $q->whereIn('status', ['approved', 'cancelled', 'cancellation_requested']);
                });
        } else {
            $query = Customer::with(['createdBy.roles'])->approved();
        }

        if ($request->user()->isSalesOrRenewal()) {
            $query->where('created_by', $request->user()->id);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->input('end_date'));
        }

        if ($request->boolean('no_paginate')) {
            $items = $query
                ->search($request->input('search'))
                ->ofStatus($request->input('status'))
                ->ofType($request->input('type'))
                ->orderBy($sortBy, $sortDir)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'current_page' => 1,
                    'data' => $items,
                    'first_page_url' => '',
                    'from' => 1,
                    'last_page' => 1,
                    'last_page_url' => '',
                    'next_page_url' => null,
                    'path' => $request->url(),
                    'per_page' => $items->count(),
                    'prev_page_url' => null,
                    'to' => $items->count(),
                    'total' => $items->count(),
                ],
            ]);
        }

        $customers = $query
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->ofType($request->input('type'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'success' => true,
            'data' => $customers,
        ]);
    }

    /**
     * Store a newly created customer.
     */
    public function store(Request $request)
    {
        if ($request->user()->cannot('customers.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to create customer records.',
            ], 403);
        }

        $validator = Validator::make($request->all(), $this->validationRules());

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['customer_code'] = Customer::generateCode();
        $data['created_by'] = $request->user()->id;

        $customer = Customer::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully.',
            'data' => $customer->load('createdBy'),
        ], 201);
    }

    /**
     * Display the specified customer with documents.
     */
    public function show(string $id)
    {
        $customer = Customer::with(['documents', 'createdBy.roles'])->find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }

        if (request()->user()->isSalesOrRenewal() && $customer->created_by !== request()->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this customer record.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $customer,
        ]);
    }

    /**
     * Update the specified customer.
     */
    public function update(Request $request, string $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }

        if ($request->user()->cannot('customers.update')) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to edit customer records.',
            ], 403);
        }

        if ($request->user()->isSalesOrRenewal() && $customer->created_by !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this customer record.',
            ], 403);
        }

        $validator = Validator::make($request->all(), $this->validationRules($id));

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $customer->update($validator->validated());

        if ($request->filled('policy_no')) {
            $customer->policies()->update(['policy_number' => $request->input('policy_no')]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully.',
            'data' => $customer->fresh(['documents', 'createdBy']),
        ]);
    }

    /**
     * Soft-delete the specified customer.
     */
    public function destroy(string $id)
    {
        if (request()->user()->cannot('customers.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to delete customer records.',
            ], 403);
        }

        $customer = Customer::find($id);

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Customer deleted successfully.',
        ]);
    }

    /**
     * Upload a document for the specified customer.
     */
    public function uploadDocument(Request $request, string $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }

        if ($request->user()->cannot('customers.update')) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to upload documents.',
            ], 403);
        }

        if ($request->user()->isSalesOrRenewal() && $customer->created_by !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this customer record.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,pdf,doc,docx',
            'document_type' => 'required|in:valid_id,document,photo',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');
        $path = $file->store("customers/{$customer->id}/documents", 'public');

        $document = $customer->documents()->create([
            'document_type' => $request->input('document_type'),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully.',
            'data' => $document,
        ], 201);
    }

    /**
     * Delete a document belonging to a customer.
     */
    public function deleteDocument(string $customerId, string $documentId)
    {
        $customer = Customer::find($customerId);
        if ($customer && request()->user()->isSalesOrRenewal() && $customer->created_by !== request()->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this customer record.',
            ], 403);
        }

        if (request()->user()->cannot('customers.update')) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to delete documents.',
            ], 403);
        }

        $document = CustomerDocument::where('customer_id', $customerId)
            ->where('id', $documentId)
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        // Remove file from storage
        $disk = config('filesystems.default');
        if ($disk === 'local') {
            $disk = 'public';
        }
        Storage::disk($disk)->delete($document->file_path);

        $document->delete();

        return response()->json([
            'success' => true,
            'message' => 'Document deleted successfully.',
        ]);
    }

    private function validationRules(?string $ignoreId = null): array
    {
        $recordNoUnique = 'unique:customers,record_no';
        if ($ignoreId) {
            $recordNoUnique .= ',' . $ignoreId;
        }

        return [
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'suffix' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female,other',
            'email' => 'sometimes|required|email|max:150',
            'phone' => 'nullable|string|max:30',
            'mobile' => 'nullable|string|max:30',
            'address_line_1' => 'nullable|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'zip_code' => 'nullable|string|max:10',
            'customer_type' => 'sometimes|required|in:individual,corporate',
            'company_name' => 'nullable|required_if:customer_type,corporate|string|max:200',
            'tin' => 'nullable|string|max:30',
            'status' => 'nullable|in:active,inactive,blacklisted',
            'notes' => 'nullable|string|max:2000',

            // Transaction & Policy fields
            'record_no' => "nullable|string|max:30|{$recordNoUnique}",
            'plate_no' => "nullable|string|max:30",
            'unit' => 'nullable|string|max:100',
            'mortgage' => 'nullable|string|max:100',
            'agent' => 'nullable|string|max:100',
            'insurance_provider' => 'nullable|string|max:100',
            'policy_status' => 'nullable|string|max:30',
            'policy_no' => 'nullable|string|max:50',

            // Financial details
            'assured_value' => 'nullable|numeric|min:0|max:99999999.99',
            'gross_premium' => 'nullable|numeric|min:0|max:99999999.99',
            'policy_premium' => 'nullable|numeric|min:0|max:99999999.99',
            'discount' => 'nullable|numeric|min:0|max:99999999.99',
            'bi_pd' => 'nullable|numeric|min:0|max:99999999.99',
            'pa' => 'nullable|numeric|min:0|max:99999999.99',
            'aog' => 'nullable|numeric|min:0|max:99999999.99',
            'policy_rate' => 'nullable|numeric|min:0|max:100',
            'discount_rate' => 'nullable|numeric|min:0|max:100',

            // Dates
            'writing_date' => 'nullable|date',
            'date_issued' => 'nullable|date',
            'inception_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'date_delivered' => 'nullable|date',

            // Revised fields
            'policy_no' => 'nullable|string|max:100',
            'request_type' => 'nullable|string|max:50',
            'activity' => 'nullable|string|max:50',
            'quotation_used' => 'nullable|string|max:50',
            'usage' => 'nullable|string|max:50',
            'chassis_no' => 'nullable|string|max:100',
            'engine_no' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'ownership' => 'nullable|string|max:50',
            'own_damage_coverage' => 'nullable|numeric|min:0|max:99999999.99',
            'bi_coverage' => 'nullable|numeric|min:0|max:99999999.99',
            'pd_coverage' => 'nullable|numeric|min:0|max:99999999.99',
            'payment_terms' => 'nullable|string|max:20',
            'agent_markup' => 'nullable|numeric|min:0|max:99999999.99',
            'sub_agent_markup' => 'nullable|numeric|min:0|max:99999999.99',
            'sub_agent_name' => 'nullable|string|max:100',
            'freebie' => 'nullable|numeric|min:0|max:99999999.99',
            'receiver_name' => 'nullable|string|max:150',
            'delivery_address' => 'nullable|string|max:255',
            'landmark' => 'nullable|string|max:255',
            'backup_phone' => 'nullable|string|max:30',
            'fb_link' => 'nullable|string|max:255',
            'used_rate_type' => 'nullable|string|max:50',
            'used_rate' => 'nullable|string|max:100',
        ];
    }
}
