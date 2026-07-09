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
        $isAgent = $user->hasRole('Sales Agent') || $user->hasRole('Team Renewal');
        $userId = $user->id;

        // ── Helper Queries for Isolation ────
        $customerQuery = Customer::approved();
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

        // ── Customer Stats (Daily, Weekly, Monthly, Yearly) ──
        $dailyCustomers = (clone $customerQuery)->whereDate('created_at', Carbon::today())->count();
        $yesterdayCustomers = (clone $customerQuery)->whereDate('created_at', Carbon::yesterday())->count();
        $dailyCustomersTrend = $yesterdayCustomers > 0
            ? round((($dailyCustomers - $yesterdayCustomers) / $yesterdayCustomers) * 100, 1)
            : ($dailyCustomers > 0 ? 100 : 0);

        $weeklyCustomers = (clone $customerQuery)
            ->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
            ->count();
        $lastWeekCustomers = (clone $customerQuery)
            ->whereBetween('created_at', [Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek()])
            ->count();
        $weeklyCustomersTrend = $lastWeekCustomers > 0
            ? round((($weeklyCustomers - $lastWeekCustomers) / $lastWeekCustomers) * 100, 1)
            : ($weeklyCustomers > 0 ? 100 : 0);

        $monthlyCustomers = (clone $customerQuery)
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->count();
        $lastMonthCustomers = (clone $customerQuery)
            ->whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->whereYear('created_at', Carbon::now()->subMonth()->year)
            ->count();
        $monthlyCustomersTrend = $lastMonthCustomers > 0
            ? round((($monthlyCustomers - $lastMonthCustomers) / $lastMonthCustomers) * 100, 1)
            : ($monthlyCustomers > 0 ? 100 : 0);

        $yearlyCustomers = (clone $customerQuery)
            ->whereYear('created_at', Carbon::now()->year)
            ->count();
        $lastYearCustomers = (clone $customerQuery)
            ->whereYear('created_at', Carbon::now()->subYear()->year)
            ->count();
        $yearlyCustomersTrend = $lastYearCustomers > 0
            ? round((($yearlyCustomers - $lastYearCustomers) / $lastYearCustomers) * 100, 1)
            : ($yearlyCustomers > 0 ? 100 : 0);

        // ── Policy Stats ────────────────────
        $activePolicies = (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')->count();
        $policiesThisMonth = (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)->count();
        $policiesLastMonth = (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereMonth('created_at', $now->copy()->subMonth()->month)
            ->whereYear('created_at', $now->copy()->subMonth()->year)->count();
        $policiesTrend = $policiesLastMonth > 0
            ? round((($policiesThisMonth - $policiesLastMonth) / $policiesLastMonth) * 100, 1)
            : ($policiesThisMonth > 0 ? 100 : 0);

        // ── Quotation Stats ─────────────────
        $pendingQuotations = (clone $quotationQuery)->whereIn('status', ['submitted', 'under_review'])->count();

        // ── Revenue (sum of policy premiums this month) ──
        $monthlyRevenue = (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('policy_premium');
        $lastMonthRevenue = (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereMonth('created_at', $now->copy()->subMonth()->month)
            ->whereYear('created_at', $now->copy()->subMonth()->year)
            ->sum('policy_premium');
        $revenueTrend = $lastMonthRevenue > 0
            ? round((($monthlyRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1)
            : ($monthlyRevenue > 0 ? 100 : 0);

        // ── Daily chart data (last 7 days) ──
        $dailyOverview = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i);
            $dailyOverview[] = [
                'short' => $day->format('D'),
                'customers' => (clone $customerQuery)->whereDate('created_at', $day->toDateString())->count(),
                'policies' => (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereDate('created_at', $day->toDateString())
                    ->count(),
                'revenue' => (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereDate('created_at', $day->toDateString())
                    ->sum('policy_premium'),
            ];
        }

        // ── Weekly chart data (last 6 weeks) ──
        $weeklyOverview = [];
        for ($i = 5; $i >= 0; $i--) {
            $weekStart = $now->copy()->subWeeks($i)->startOfWeek();
            $weekEnd = $now->copy()->subWeeks($i)->endOfWeek();
            $weeklyOverview[] = [
                'short' => 'Wk ' . (6 - $i),
                'customers' => (clone $customerQuery)->whereBetween('created_at', [$weekStart, $weekEnd])->count(),
                'policies' => (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereBetween('created_at', [$weekStart, $weekEnd])
                    ->count(),
                'revenue' => (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereBetween('created_at', [$weekStart, $weekEnd])
                    ->sum('policy_premium'),
            ];
        }

        // ── Monthly chart data (last 12 months) ──
        $monthlyOverview = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $monthlyOverview[] = [
                'month' => $month->format('M Y'),
                'short' => $month->format('M'),
                'customers' => (clone $customerQuery)->whereMonth('created_at', $month->month)
                    ->whereYear('created_at', $month->year)->count(),
                'policies' => (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereMonth('created_at', $month->month)
                    ->whereYear('created_at', $month->year)->count(),
                'revenue' => (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereMonth('created_at', $month->month)
                    ->whereYear('created_at', $month->year)
                    ->sum('policy_premium'),
            ];
        }

        // ── Yearly chart data (last 3 years) ──
        $yearlyOverview = [];
        for ($i = 2; $i >= 0; $i--) {
            $year = $now->copy()->subYears($i)->year;
            $yearlyOverview[] = [
                'short' => (string) $year,
                'customers' => (clone $customerQuery)->whereYear('created_at', $year)->count(),
                'policies' => (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereYear('created_at', $year)
                    ->count(),
                'revenue' => (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
                    ->whereYear('created_at', $year)
                    ->sum('policy_premium'),
            ];
        }

        // ── Status Distribution by Timeframe ──
        $overallStatuses = [
            ['name' => 'Active', 'value' => (clone $customerQuery)->where('status', 'active')->count()],
            ['name' => 'Inactive', 'value' => (clone $customerQuery)->where('status', 'inactive')->count()],
            ['name' => 'Blacklisted', 'value' => (clone $customerQuery)->where('status', 'blacklisted')->count()],
        ];

        $dailyStatuses = [
            ['name' => 'Active', 'value' => (clone $customerQuery)->where('status', 'active')->where('created_at', '>=', $now->copy()->subDay())->count()],
            ['name' => 'Inactive', 'value' => (clone $customerQuery)->where('status', 'inactive')->where('created_at', '>=', $now->copy()->subDay())->count()],
            ['name' => 'Blacklisted', 'value' => (clone $customerQuery)->where('status', 'blacklisted')->where('created_at', '>=', $now->copy()->subDay())->count()],
        ];

        $weeklyStatuses = [
            ['name' => 'Active', 'value' => (clone $customerQuery)->where('status', 'active')->where('created_at', '>=', $now->copy()->subWeek())->count()],
            ['name' => 'Inactive', 'value' => (clone $customerQuery)->where('status', 'inactive')->where('created_at', '>=', $now->copy()->subWeek())->count()],
            ['name' => 'Blacklisted', 'value' => (clone $customerQuery)->where('status', 'blacklisted')->where('created_at', '>=', $now->copy()->subWeek())->count()],
        ];

        $monthlyStatuses = [
            ['name' => 'Active', 'value' => (clone $customerQuery)->where('status', 'active')->where('created_at', '>=', $now->copy()->subMonth())->count()],
            ['name' => 'Inactive', 'value' => (clone $customerQuery)->where('status', 'inactive')->where('created_at', '>=', $now->copy()->subMonth())->count()],
            ['name' => 'Blacklisted', 'value' => (clone $customerQuery)->where('status', 'blacklisted')->where('created_at', '>=', $now->copy()->subMonth())->count()],
        ];

        $yearlyStatuses = [
            ['name' => 'Active', 'value' => (clone $customerQuery)->where('status', 'active')->where('created_at', '>=', $now->copy()->subYear())->count()],
            ['name' => 'Inactive', 'value' => (clone $customerQuery)->where('status', 'inactive')->where('created_at', '>=', $now->copy()->subYear())->count()],
            ['name' => 'Blacklisted', 'value' => (clone $customerQuery)->where('status', 'blacklisted')->where('created_at', '>=', $now->copy()->subYear())->count()],
        ];

        $isAllZero = function($statuses) {
            foreach ($statuses as $s) {
                if ($s['value'] > 0) return false;
            }
            return true;
        };

        $dailyStatuses = $isAllZero($dailyStatuses) ? $overallStatuses : $dailyStatuses;
        $weeklyStatuses = $isAllZero($weeklyStatuses) ? $overallStatuses : $weeklyStatuses;
        $monthlyStatuses = $isAllZero($monthlyStatuses) ? $overallStatuses : $monthlyStatuses;
        $yearlyStatuses = $isAllZero($yearlyStatuses) ? $overallStatuses : $yearlyStatuses;

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

        // ── Premium Stats (Daily, Weekly, Monthly, Yearly) ──
        $dailyPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereDate('created_at', Carbon::today())
            ->sum('policy_premium');
        $yesterdayPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereDate('created_at', Carbon::yesterday())
            ->sum('policy_premium');
        $dailyPremiumTrend = $yesterdayPremium > 0
            ? round((($dailyPremium - $yesterdayPremium) / $yesterdayPremium) * 100, 1)
            : ($dailyPremium > 0 ? 100 : 0);

        $weeklyPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
            ->sum('policy_premium');
        $lastWeekPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereBetween('created_at', [Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek()])
            ->sum('policy_premium');
        $weeklyPremiumTrend = $lastWeekPremium > 0
            ? round((($weeklyPremium - $lastWeekPremium) / $lastWeekPremium) * 100, 1)
            : ($weeklyPremium > 0 ? 100 : 0);

        $monthlyPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('policy_premium');
        $lastMonthPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->whereYear('created_at', Carbon::now()->subMonth()->year)
            ->sum('policy_premium');
        $monthlyPremiumTrend = $lastMonthPremium > 0
            ? round((($monthlyPremium - $lastMonthPremium) / $lastMonthPremium) * 100, 1)
            : ($monthlyPremium > 0 ? 100 : 0);

        $yearlyPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('policy_premium');
        $lastYearPremium = (float) (clone $customerQuery)->whereRaw('UPPER(policy_status) = "ACTIVE"')
            ->whereYear('created_at', Carbon::now()->subYear()->year)
            ->sum('policy_premium');
        $yearlyPremiumTrend = $lastYearPremium > 0
            ? round((($yearlyPremium - $lastYearPremium) / $lastYearPremium) * 100, 1)
            : ($yearlyPremium > 0 ? 100 : 0);

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => (clone $customerQuery)->where('status', 'active')->count(),
                    'new_customers_this_month' => $newCustomersThisMonth,
                    'customer_trend' => $customerTrend,
                    'customers' => [
                        'daily' => ['value' => $dailyCustomers, 'trend' => $dailyCustomersTrend],
                        'weekly' => ['value' => $weeklyCustomers, 'trend' => $weeklyCustomersTrend],
                        'monthly' => ['value' => $monthlyCustomers, 'trend' => $monthlyCustomersTrend],
                        'yearly' => ['value' => $yearlyCustomers, 'trend' => $yearlyCustomersTrend],
                    ],
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
                    'premium' => [
                        'daily' => ['value' => $dailyPremium, 'trend' => $dailyPremiumTrend],
                        'weekly' => ['value' => $weeklyPremium, 'trend' => $weeklyPremiumTrend],
                        'monthly' => ['value' => $monthlyPremium, 'trend' => $monthlyPremiumTrend],
                        'yearly' => ['value' => $yearlyPremium, 'trend' => $yearlyPremiumTrend],
                    ],
                ],
                'charts' => [
                    'daily_overview' => $dailyOverview,
                    'weekly_overview' => $weeklyOverview,
                    'monthly_overview' => $monthlyOverview,
                    'yearly_overview' => $yearlyOverview,
                    'customer_types' => $customerTypes,
                    'customer_statuses' => [
                        'daily' => $dailyStatuses,
                        'weekly' => $weeklyStatuses,
                        'monthly' => $monthlyStatuses,
                        'yearly' => $yearlyStatuses,
                    ],
                ],
                'recent_customers' => $recentCustomers,
            ],
        ]);
    }
}
