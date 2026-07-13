<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InvoiceController extends Controller
{
    /**
     * Paginated list of invoices.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 15), 100);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowed = ['invoice_number', 'total_amount', 'balance', 'status', 'due_date', 'created_at'];
        if (!in_array($sortBy, $allowed)) $sortBy = 'created_at';

        $invoices = Invoice::with([
                'customer',
                'policy:id,policy_number',
                'createdBy:id,name',
                'payments',
            ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json(['success' => true, 'data' => $invoices]);
    }

    /**
     * Create a new invoice with items.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|exists:customers,id',
            'policy_id' => 'nullable|exists:policies,id',
            'due_date' => 'required|date',
            'tax_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.amount' => 'required|numeric|min:0',
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
            'items', 'payments.receivedBy:id,name', 'createdBy:id,name,email',
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
            'customer_id' => 'required|exists:customers,id',
            'policy_id' => 'nullable|exists:policies,id',
            'due_date' => 'required|date',
            'tax_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.amount' => 'required|numeric|min:0',
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

        $invoice->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true, 'message' => 'Invoice cancelled.',
            'data' => $invoice->fresh(),
        ]);
    }
}
