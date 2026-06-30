<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Policy;
use App\Models\Quotation;
use App\Models\InsuranceProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Get summary data for reports.
     */
    public function summary(Request $request)
    {
        // 1. Premium Written by Product Category
        $premiumByProduct = InsuranceProduct::leftJoin('policies', 'insurance_products.id', '=', 'policies.insurance_product_id')
            ->select('insurance_products.category', DB::raw('SUM(COALESCE(policies.total_premium, 0)) as total_premium'))
            ->groupBy('insurance_products.category')
            ->get();

        // 2. Loss Ratio (Claims Settled vs Premium Written)
        $claimsAndPremium = InsuranceProduct::leftJoin('policies', 'insurance_products.id', '=', 'policies.insurance_product_id')
            ->leftJoin('claims', 'policies.id', '=', 'claims.policy_id')
            ->select(
                'insurance_products.category',
                DB::raw('SUM(COALESCE(policies.total_premium, 0)) as total_premium'),
                DB::raw('SUM(COALESCE(claims.settlement_amount, 0)) as total_claims_settled')
            )
            ->groupBy('insurance_products.category')
            ->get()
            ->map(function ($item) {
                $premium = (float) $item->total_premium;
                $claims = (float) $item->total_claims_settled;
                $lossRatio = $premium > 0 ? round(($claims / $premium) * 100, 1) : 0;
                return [
                    'category' => $item->category,
                    'premium' => $premium,
                    'claims' => $claims,
                    'loss_ratio' => $lossRatio,
                ];
            });

        // 3. Sales Pipeline (Quotation status distribution)
        $quotationStatusDistribution = Quotation::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        // 4. Invoice Aging & Collections
        $totalInvoiced = (float) Invoice::sum('total_amount');
        $totalCollected = (float) Payment::where('status', 'completed')->sum('amount');
        $outstandingReceivable = (float) Invoice::whereNotIn('status', ['cancelled', 'paid'])->sum('balance');

        $invoiceAging = [
            'paid' => (float) Invoice::where('status', 'paid')->sum('total_amount'),
            'current' => (float) Invoice::whereIn('status', ['sent', 'partial'])->where('due_date', '>=', now())->sum('balance'),
            'overdue' => (float) Invoice::where('status', 'overdue')->orWhere(function($q) {
                $q->whereIn('status', ['sent', 'partial'])->where('due_date', '<', now());
            })->sum('balance'),
        ];

        // 5. Monthly Collections vs Monthly Billings (Last 6 Months)
        $monthlyBillingsAndCollections = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = now()->subMonths($i)->startOfMonth();
            $monthEnd = now()->subMonths($i)->endOfMonth();
            $monthLabel = $monthStart->format('M Y');

            $billings = (float) Invoice::whereBetween('created_at', [$monthStart, $monthEnd])->sum('total_amount');
            $collections = (float) Payment::where('status', 'completed')
                ->whereBetween('payment_date', [$monthStart, $monthEnd])
                ->sum('amount');

            $monthlyBillingsAndCollections[] = [
                'month' => $monthLabel,
                'billings' => $billings,
                'collections' => $collections,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'premium_by_product' => $premiumByProduct,
                'loss_ratio_by_product' => $claimsAndPremium,
                'quotation_pipeline' => $quotationStatusDistribution,
                'collection_summary' => [
                    'total_invoiced' => $totalInvoiced,
                    'total_collected' => $totalCollected,
                    'outstanding' => $outstandingReceivable,
                    'collection_rate' => $totalInvoiced > 0 ? round(($totalCollected / $totalInvoiced) * 100, 1) : 0,
                ],
                'invoice_aging' => $invoiceAging,
                'monthly_billings_collections' => $monthlyBillingsAndCollections,
            ],
        ]);
    }
}
