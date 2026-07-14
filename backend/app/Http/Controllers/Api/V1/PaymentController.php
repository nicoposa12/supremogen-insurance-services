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

        $payments = Payment::with([
                'invoice:id,invoice_number,total_amount,balance',
                'invoice.customer:id,customer_code,first_name,last_name',
                'receivedBy:id,name',
            ])
            ->search($request->input('search'))
            ->ofStatus($request->input('status'))
            ->ofMethod($request->input('method'))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json(['success' => true, 'data' => $payments]);
    }

    /**
     * Record a new payment against an invoice.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => 'required|exists:invoices,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:jt,jrs,cod,walk_in,bank_transfer_pbcom,bank_transfer_security_bank,post_dated_checks,split_payment',
            'payment_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Validate payment doesn't exceed balance
        $invoice = Invoice::find($request->input('invoice_id'));
        if (in_array($invoice->status, ['paid', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot record payment for a ' . $invoice->status . ' invoice.',
            ], 422);
        }

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

        // Recalculate invoice totals & status
        $invoice->recalculate();

        // Send payment receipt email to client (auto-queued via ShouldQueue)
        try {
            $customer = $invoice->customer;
            if ($customer && $customer->email) {
                $payments = $invoice->payments()->where('status', 'completed')->orderBy('payment_date', 'asc')->orderBy('created_at', 'asc')->get();
                $paymentIndex = $payments->pluck('id')->search($payment->id);
                $installmentNumber = ($paymentIndex !== false) ? ($paymentIndex + 1) : 1;

                $ordinals = [1 => '1ST', 2 => '2ND', 3 => '3RD', 4 => '4TH', 5 => '5TH', 6 => '6TH'];
                $installmentOrdinal = $ordinals[$installmentNumber] ?? ($installmentNumber . 'TH');

                $customerName = trim($customer->first_name . ' ' . $customer->last_name);
                $policyNumber = $customer->policy_no ?: ($invoice->policy?->policy_number ?: 'N/A');

                \Illuminate\Support\Facades\Mail::to($customer->email)->send(
                    new \App\Mail\PaymentReceiptMail(
                        $customerName,
                        $policyNumber,
                        $installmentOrdinal,
                        (float) $payment->amount,
                        (float) $invoice->balance
                    )
                );

                \Illuminate\Support\Facades\Log::info("Payment receipt email queued for {$customer->email} for invoice {$invoice->invoice_number}, {$installmentOrdinal} payment.");
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to queue payment receipt email: ' . $e->getMessage());
        }

        // Notify the agent who owns this customer about the payment
        try {
            if ($invoice->customer && $invoice->customer->created_by) {
                \App\Models\Notification::create([
                    'user_id' => $invoice->customer->created_by,
                    'title' => 'Payment Received',
                    'message' => "A payment of ₱" . number_format($payment->amount, 2) . " has been successfully recorded for Invoice {$invoice->invoice_number}.",
                    'type' => 'success',
                    'read_at' => null,
                ]);
            }

            // Notify all Collection officers
            $collectionOfficers = \App\Models\User::role('Collection')->get();
            foreach ($collectionOfficers as $officer) {
                \App\Models\Notification::create([
                    'user_id' => $officer->id,
                    'title' => 'Payment Received',
                    'message' => "A payment of ₱" . number_format($payment->amount, 2) . " has been successfully recorded for Invoice {$invoice->invoice_number}.",
                    'type' => 'success',
                    'read_at' => null,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send payment notification: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully.',
            'data' => $payment->load(['invoice.customer', 'receivedBy']),
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
            'payment_method' => 'required|in:jt,jrs,cod,walk_in,bank_transfer_pbcom,bank_transfer_security_bank,post_dated_checks,split_payment',
            'payment_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $payment->update([
            'amount' => $request->amount,
            'payment_method' => $request->payment_method,
            'payment_date' => $request->payment_date,
            'reference_number' => $request->reference_number,
            'notes' => $request->notes,
        ]);

        // Recalculate invoice
        $payment->invoice->recalculate();

        return response()->json([
            'success' => true,
            'message' => 'Payment updated successfully.',
            'data' => $payment->fresh(['invoice']),
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
}
