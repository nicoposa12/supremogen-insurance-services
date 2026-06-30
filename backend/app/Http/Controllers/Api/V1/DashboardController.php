<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\Policy;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Claim;
use App\Models\Renewal;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics and chart data.
     * Returns real stats for customers, quotations, and policies.
     */
    public function index(Request $request)
    {
        $now = Carbon::now();
        $user = $request->user();
        $isAgent = $user->hasRole('Sales Agent');
        $userId = $user->id;

        // ── Helper Queries for Isolation ────
        $customerQuery = Customer::query();
        $policyQuery = Policy::query();
        $quotationQuery = Quotation::query();
        $claimQuery = Claim::query();
        $invoiceQuery = Invoice::query();
        $paymentQuery = Payment::query();
        $renewalQuery = Renewal::query();

        if ($isAgent) {
            $customerQuery->where('created_by', $userId);
            $policyQuery->where(function ($q) use ($userId) {
                $q->where('issued_by', $userId)
                  ->orWhereHas('quotation', function ($q2) use ($userId) {
                      $q2->where('prepared_by', $userId);
                  });
            });
            $quotationQuery->where('prepared_by', $userId);
            $claimQuery->whereHas('policy', function ($q) use ($userId) {
                $q->where('issued_by', $userId)
                  ->orWhereHas('quotation', function ($q2) use ($userId) {
                      $q2->where('prepared_by', $userId);
                  });
            });
            $invoiceQuery->whereHas('policy', function ($q) use ($userId) {
                $q->where('issued_by', $userId)
                  ->orWhereHas('quotation', function ($q2) use ($userId) {
                      $q2->where('prepared_by', $userId);
                  });
            });
            $paymentQuery->whereHas('invoice.policy', function ($q) use ($userId) {
                $q->where('issued_by', $userId)
                  ->orWhereHas('quotation', function ($q2) use ($userId) {
                      $q2->where('prepared_by', $userId);
                  });
            });
            $renewalQuery->whereHas('policy', function ($q) use ($userId) {
                $q->where('issued_by', $userId)
                  ->orWhereHas('quotation', function ($q2) use ($userId) {
                      $q2->where('prepared_by', $userId);
                  });
            });
        }

        // ── Customer Stats ──────────────────
        $totalCustomers = (clone $customerQuery)->count();
        $newCustomersThisMonth = (clone $customerQuery)->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)->count();
        $newCustomersLastMonth = (clone $customerQuery)->whereMonth('created_at', $now->copy()->subMonth()->month)
            ->whereYear('created_at', $now->copy()->subMonth()->year)->count();
        $customerTrend = $newCustomersLastMonth > 0
            ? round((($newCustomersThisMonth - $newCustomersLastMonth) / $newCustomersLastMonth) * 100, 1)
            : ($newCustomersThisMonth > 0 ? 100 : 0);

        // ── Policy Stats ────────────────────
        $activePolicies = (clone $policyQuery)->where('status', 'active')->count();
        $policiesThisMonth = (clone $policyQuery)->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)->count();
        $policiesLastMonth = (clone $policyQuery)->whereMonth('created_at', $now->copy()->subMonth()->month)
            ->whereYear('created_at', $now->copy()->subMonth()->year)->count();
        $policiesTrend = $policiesLastMonth > 0
            ? round((($policiesThisMonth - $policiesLastMonth) / $policiesLastMonth) * 100, 1)
            : ($policiesThisMonth > 0 ? 100 : 0);

        // ── Quotation Stats ─────────────────
        $pendingQuotations = (clone $quotationQuery)->whereIn('status', ['submitted', 'under_review'])->count();

        // ── Revenue (sum of policy premiums this month) ──
        $monthlyRevenue = (clone $policyQuery)->where('status', 'active')
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('total_premium');
        $lastMonthRevenue = (clone $policyQuery)->where('status', 'active')
            ->whereMonth('created_at', $now->copy()->subMonth()->month)
            ->whereYear('created_at', $now->copy()->subMonth()->year)
            ->sum('total_premium');
        $revenueTrend = $lastMonthRevenue > 0
            ? round((($monthlyRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1)
            : ($monthlyRevenue > 0 ? 100 : 0);

        // ── Monthly chart data (last 12 months) ──
        $monthlyOverview = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $monthlyOverview[] = [
                'month' => $month->format('M Y'),
                'short' => $month->format('M'),
                'customers' => (clone $customerQuery)->whereMonth('created_at', $month->month)
                    ->whereYear('created_at', $month->year)->count(),
                'policies' => (clone $policyQuery)->whereMonth('created_at', $month->month)
                    ->whereYear('created_at', $month->year)->count(),
                'revenue' => (float) (clone $policyQuery)->where('status', 'active')
                    ->whereMonth('created_at', $month->month)
                    ->whereYear('created_at', $month->year)
                    ->sum('total_premium'),
            ];
        }

        // ── Pie charts ──
        $customerStatuses = [
            ['name' => 'Active', 'value' => (clone $customerQuery)->where('status', 'active')->count()],
            ['name' => 'Inactive', 'value' => (clone $customerQuery)->where('status', 'inactive')->count()],
            ['name' => 'Blacklisted', 'value' => (clone $customerQuery)->where('status', 'blacklisted')->count()],
        ];

        $customerTypes = [
            ['name' => 'Individual', 'value' => (clone $customerQuery)->where('customer_type', 'individual')->count()],
            ['name' => 'Corporate', 'value' => (clone $customerQuery)->where('customer_type', 'corporate')->count()],
        ];

        // ── Recent customers ──
        $recentCustomers = (clone $customerQuery)->orderByDesc('created_at')
            ->take(10)
            ->get(['id', 'customer_code', 'first_name', 'last_name', 'email', 'customer_type', 'status', 'created_at']);

        // ── Invoice & Payment Stats ──────────
        $totalReceivable = (float) (clone $invoiceQuery)->whereNotIn('status', ['cancelled', 'paid'])->sum('balance');
        $overdueInvoices = (clone $invoiceQuery)->where('status', 'overdue')->count();
        $totalCollected = (float) (clone $paymentQuery)->where('status', 'completed')->sum('amount');

        // ── Claims & Renewals Stats ─────────
        $pendingClaims = (clone $claimQuery)->whereIn('status', ['filed', 'under_investigation'])->count();
        $totalClaims = (clone $claimQuery)->count();
        $pendingRenewals = (clone $renewalQuery)->where('status', 'pending')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => (clone $customerQuery)->where('status', 'active')->count(),
                    'new_customers_this_month' => $newCustomersThisMonth,
                    'customer_trend' => $customerTrend,
                    'active_policies' => $activePolicies,
                    'policies_trend' => $policiesTrend,
                    'pending_claims' => $pendingClaims,
                    'total_claims' => $totalClaims,
                    'monthly_revenue' => (float) $monthlyRevenue,
                    'revenue_trend' => $revenueTrend,
                    'total_receivable' => $totalReceivable,
                    'overdue_invoices' => $overdueInvoices,
                    'total_collected' => $totalCollected,
                    'pending_renewals' => $pendingRenewals,
                ],
                'charts' => [
                    'monthly_overview' => $monthlyOverview,
                    'customer_types' => $customerTypes,
                    'customer_statuses' => $customerStatuses,
                ],
                'recent_customers' => $recentCustomers,
            ],
        ]);
    }
}
