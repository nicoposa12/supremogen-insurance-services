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

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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

        $cacheKey = 'dashboard_stats_' . $userId . '_' . ($isAgent ? 'agent' : 'admin');

        $data = Cache::remember($cacheKey, 60, function () use ($isAgent, $userId, $now) {
            // Helper Queries for Isolation inside closure
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

            // Driver-specific SQL fields
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $yearField = $isSqlite ? "strftime('%Y', created_at)" : "EXTRACT(YEAR FROM created_at)";
            $yearMonthField = $isSqlite ? "strftime('%Y-%m', created_at)" : "to_char(created_at, 'YYYY-MM')";
            $dateField = $isSqlite ? "date(created_at)" : "CAST(created_at AS DATE)";

            // 1. Customer stats
            $customerStats = (clone $customerQuery)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as this_month,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_month,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as daily,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as yesterday,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as weekly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_week,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as monthly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_month_val,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as yearly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_year
                ", [
                    $now->copy()->startOfMonth(), $now->copy()->endOfMonth(), // this_month
                    $now->copy()->subMonth()->startOfMonth(), $now->copy()->subMonth()->endOfMonth(), // last_month
                    Carbon::today(), Carbon::tomorrow(), // daily
                    Carbon::yesterday(), Carbon::today(), // yesterday
                    Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek(), // weekly
                    Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek(), // last week
                    Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth(), // monthly
                    Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth(), // last_month_val
                    Carbon::now()->startOfYear(), Carbon::now()->endOfYear(), // yearly
                    Carbon::now()->subYear()->startOfYear(), Carbon::now()->subYear()->endOfYear(), // last year
                ])
                ->first();

            $totalCustomers = (int) ($customerStats->total ?? 0);
            $newCustomersThisMonth = (int) ($customerStats->this_month ?? 0);
            $newCustomersLastMonth = (int) ($customerStats->last_month ?? 0);
            $customerTrend = $newCustomersLastMonth > 0
                ? round((($newCustomersThisMonth - $newCustomersLastMonth) / $newCustomersLastMonth) * 100, 1)
                : ($newCustomersThisMonth > 0 ? 100 : 0);

            $dailyCustomers = (int) ($customerStats->daily ?? 0);
            $yesterdayCustomers = (int) ($customerStats->yesterday ?? 0);
            $dailyCustomersTrend = $yesterdayCustomers > 0
                ? round((($dailyCustomers - $yesterdayCustomers) / $yesterdayCustomers) * 100, 1)
                : ($dailyCustomers > 0 ? 100 : 0);

            $weeklyCustomers = (int) ($customerStats->weekly ?? 0);
            $lastWeekCustomers = (int) ($customerStats->last_week ?? 0);
            $weeklyCustomersTrend = $lastWeekCustomers > 0
                ? round((($weeklyCustomers - $lastWeekCustomers) / $lastWeekCustomers) * 100, 1)
                : ($weeklyCustomers > 0 ? 100 : 0);

            $monthlyCustomers = (int) ($customerStats->monthly ?? 0);
            $lastMonthCustomers = (int) ($customerStats->last_month_val ?? 0);
            $monthlyCustomersTrend = $lastMonthCustomers > 0
                ? round((($monthlyCustomers - $lastMonthCustomers) / $lastMonthCustomers) * 100, 1)
                : ($monthlyCustomers > 0 ? 100 : 0);

            $yearlyCustomers = (int) ($customerStats->yearly ?? 0);
            $lastYearCustomers = (int) ($customerStats->last_year ?? 0);
            $yearlyCustomersTrend = $lastYearCustomers > 0
                ? round((($yearlyCustomers - $lastYearCustomers) / $lastYearCustomers) * 100, 1)
                : ($yearlyCustomers > 0 ? 100 : 0);

            // 2. Policy stats
            $policyStats = (clone $customerQuery)
                ->whereRaw("UPPER(policy_status) = 'ACTIVE'")
                ->selectRaw("
                    COUNT(*) as active_count,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as daily,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) as yesterday,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as weekly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_week,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as monthly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_month,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as yearly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as last_year
                ", [
                    Carbon::today(), Carbon::tomorrow(), // daily
                    Carbon::yesterday(), Carbon::today(), // yesterday
                    Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek(), // weekly
                    Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek(), // last week
                    Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth(), // monthly
                    Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth(), // last month
                    Carbon::now()->startOfYear(), Carbon::now()->endOfYear(), // yearly
                    Carbon::now()->subYear()->startOfYear(), Carbon::now()->subYear()->endOfYear(), // last year
                ])
                ->first();

            $activePolicies = (int) ($policyStats->active_count ?? 0);
            
            $dailyPolicies = (int) ($policyStats->daily ?? 0);
            $yesterdayPolicies = (int) ($policyStats->yesterday ?? 0);
            $dailyPoliciesTrend = $yesterdayPolicies > 0
                ? round((($dailyPolicies - $yesterdayPolicies) / $yesterdayPolicies) * 100, 1)
                : ($dailyPolicies > 0 ? 100 : 0);

            $weeklyPolicies = (int) ($policyStats->weekly ?? 0);
            $lastWeekPolicies = (int) ($policyStats->last_week ?? 0);
            $weeklyPoliciesTrend = $lastWeekPolicies > 0
                ? round((($weeklyPolicies - $lastWeekPolicies) / $lastWeekPolicies) * 100, 1)
                : ($weeklyPolicies > 0 ? 100 : 0);

            $monthlyPolicies = (int) ($policyStats->monthly ?? 0);
            $lastMonthPolicies = (int) ($policyStats->last_month ?? 0);
            $monthlyPoliciesTrend = $lastMonthPolicies > 0
                ? round((($monthlyPolicies - $lastMonthPolicies) / $lastMonthPolicies) * 100, 1)
                : ($monthlyPolicies > 0 ? 100 : 0);

            $yearlyPolicies = (int) ($policyStats->yearly ?? 0);
            $lastYearPolicies = (int) ($policyStats->last_year ?? 0);
            $yearlyPoliciesTrend = $lastYearPolicies > 0
                ? round((($yearlyPolicies - $lastYearPolicies) / $lastYearPolicies) * 100, 1)
                : ($yearlyPolicies > 0 ? 100 : 0);

            $policiesTrend = $monthlyPoliciesTrend;

            // 3. Premium & Revenue Statistics
            $premiumStats = (clone $customerQuery)
                ->whereRaw("UPPER(policy_status) = 'ACTIVE'")
                ->selectRaw("
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN policy_premium ELSE 0 END) as daily,
                    SUM(CASE WHEN created_at >= ? AND created_at < ? THEN policy_premium ELSE 0 END) as yesterday,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN policy_premium ELSE 0 END) as weekly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN policy_premium ELSE 0 END) as last_week,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN policy_premium ELSE 0 END) as monthly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN policy_premium ELSE 0 END) as last_month,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN policy_premium ELSE 0 END) as yearly,
                    SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN policy_premium ELSE 0 END) as last_year
                ", [
                    Carbon::today(), Carbon::tomorrow(), // daily
                    Carbon::yesterday(), Carbon::today(), // yesterday
                    Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek(), // weekly
                    Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek(), // last week
                    Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth(), // monthly
                    Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth(), // last month
                    Carbon::now()->startOfYear(), Carbon::now()->endOfYear(), // yearly
                    Carbon::now()->subYear()->startOfYear(), Carbon::now()->subYear()->endOfYear(), // last year
                ])
                ->first();

            $dailyPremium = (float) ($premiumStats->daily ?? 0);
            $yesterdayPremium = (float) ($premiumStats->yesterday ?? 0);
            $dailyPremiumTrend = $yesterdayPremium > 0
                ? round((($dailyPremium - $yesterdayPremium) / $yesterdayPremium) * 100, 1)
                : ($dailyPremium > 0 ? 100 : 0);

            $weeklyPremium = (float) ($premiumStats->weekly ?? 0);
            $lastWeekPremium = (float) ($premiumStats->last_week ?? 0);
            $weeklyPremiumTrend = $lastWeekPremium > 0
                ? round((($weeklyPremium - $lastWeekPremium) / $lastWeekPremium) * 100, 1)
                : ($weeklyPremium > 0 ? 100 : 0);

            $monthlyPremium = (float) ($premiumStats->monthly ?? 0);
            $lastMonthPremium = (float) ($premiumStats->last_month ?? 0);
            $monthlyPremiumTrend = $lastMonthPremium > 0
                ? round((($monthlyPremium - $lastMonthPremium) / $lastMonthPremium) * 100, 1)
                : ($monthlyPremium > 0 ? 100 : 0);

            $yearlyPremium = (float) ($premiumStats->yearly ?? 0);
            $lastYearPremium = (float) ($premiumStats->last_year ?? 0);
            $yearlyPremiumTrend = $lastYearPremium > 0
                ? round((($yearlyPremium - $lastYearPremium) / $lastYearPremium) * 100, 1)
                : ($yearlyPremium > 0 ? 100 : 0);

            $monthlyRevenue = $monthlyPremium;
            $lastMonthRevenue = $lastMonthPremium;
            $revenueTrend = $monthlyPremiumTrend;

            // 4. Quotations, Invoices, Payments, Claims, Renewals
            $pendingQuotations = (int) (clone $quotationQuery)->whereIn('status', ['submitted', 'under_review'])->count();
            $totalReceivable = (float) (clone $invoiceQuery)->whereNotIn('status', ['cancelled', 'paid'])->sum('balance');
            $overdueInvoices = (int) (clone $invoiceQuery)->where('status', 'overdue')->count();
            $totalCollected = (float) (clone $paymentQuery)->where('status', 'completed')->sum('amount');
            $pendingClaims = (int) (clone $claimQuery)->whereIn('status', ['filed', 'under_investigation'])->count();
            $totalClaims = (int) (clone $claimQuery)->count();
            $pendingRenewals = (int) (clone $renewalQuery)->where('status', 'pending')->count();

            // 5. Daily overview chart
            $dailyData = (clone $customerQuery)
                ->selectRaw("
                    {$dateField} as date_val,
                    COUNT(*) as customer_count,
                    SUM(CASE WHEN UPPER(policy_status) = 'ACTIVE' THEN 1 ELSE 0 END) as policy_count,
                    SUM(CASE WHEN UPPER(policy_status) = 'ACTIVE' THEN policy_premium ELSE 0 END) as revenue
                ")
                ->where('created_at', '>=', $now->copy()->subDays(6)->startOfDay())
                ->groupBy('date_val')
                ->get()
                ->keyBy(function ($item) {
                    return Carbon::parse($item->date_val)->toDateString();
                });

            $dailyOverview = [];
            for ($i = 6; $i >= 0; $i--) {
                $day = $now->copy()->subDays($i);
                $dayStr = $day->toDateString();
                $dayData = $dailyData->get($dayStr);
                $dailyOverview[] = [
                    'short' => $day->format('D'),
                    'customers' => $dayData ? (int) $dayData->customer_count : 0,
                    'policies' => $dayData ? (int) $dayData->policy_count : 0,
                    'revenue' => $dayData ? (float) $dayData->revenue : 0.0,
                ];
            }

            // 6. Weekly overview chart (last 6 weeks)
            $weeklyRaw = (clone $customerQuery)
                ->whereBetween('created_at', [$now->copy()->subWeeks(5)->startOfWeek(), $now->copy()->endOfWeek()])
                ->get(['created_at', 'policy_status', 'policy_premium']);

            $weeklyOverview = [];
            for ($i = 5; $i >= 0; $i--) {
                $weekStart = $now->copy()->subWeeks($i)->startOfWeek();
                $weekEnd = $now->copy()->subWeeks($i)->endOfWeek();
                
                $weekCustomers = $weeklyRaw->filter(function ($item) use ($weekStart, $weekEnd) {
                    return $item->created_at >= $weekStart && $item->created_at <= $weekEnd;
                });
                $weekActivePolicies = $weekCustomers->filter(function ($item) {
                    return strtoupper($item->policy_status) === 'ACTIVE';
                });

                $weeklyOverview[] = [
                    'short' => 'Wk ' . (6 - $i),
                    'customers' => $weekCustomers->count(),
                    'policies' => $weekActivePolicies->count(),
                    'revenue' => (float) $weekActivePolicies->sum('policy_premium'),
                ];
            }

            // 7. Monthly overview chart (last 12 months)
            $monthlyData = (clone $customerQuery)
                ->selectRaw("
                    {$yearMonthField} as month_val,
                    COUNT(*) as customer_count,
                    SUM(CASE WHEN UPPER(policy_status) = 'ACTIVE' THEN 1 ELSE 0 END) as policy_count,
                    SUM(CASE WHEN UPPER(policy_status) = 'ACTIVE' THEN policy_premium ELSE 0 END) as revenue
                ")
                ->where('created_at', '>=', $now->copy()->subMonths(11)->startOfMonth())
                ->groupBy('month_val')
                ->get()
                ->keyBy('month_val');

            $monthlyOverview = [];
            for ($i = 11; $i >= 0; $i--) {
                $month = $now->copy()->subMonths($i);
                $monthStr = $month->format('Y-m');
                $monthData = $monthlyData->get($monthStr);
                $monthlyOverview[] = [
                    'month' => $month->format('M Y'),
                    'short' => $month->format('M'),
                    'customers' => $monthData ? (int) $monthData->customer_count : 0,
                    'policies' => $monthData ? (int) $monthData->policy_count : 0,
                    'revenue' => $monthData ? (float) $monthData->revenue : 0.0,
                ];
            }

            // 8. Yearly overview chart (last 3 years)
            $yearlyData = (clone $customerQuery)
                ->selectRaw("
                    {$yearField} as year_val,
                    COUNT(*) as customer_count,
                    SUM(CASE WHEN UPPER(policy_status) = 'ACTIVE' THEN 1 ELSE 0 END) as policy_count,
                    SUM(CASE WHEN UPPER(policy_status) = 'ACTIVE' THEN policy_premium ELSE 0 END) as revenue
                ")
                ->where('created_at', '>=', $now->copy()->subYears(2)->startOfYear())
                ->groupBy('year_val')
                ->get()
                ->keyBy(function ($item) {
                    return (int) $item->year_val;
                });

            $yearlyOverview = [];
            for ($i = 2; $i >= 0; $i--) {
                $year = $now->copy()->subYears($i)->year;
                $yearData = $yearlyData->get($year);
                $yearlyOverview[] = [
                    'short' => (string) $year,
                    'customers' => $yearData ? (int) $yearData->customer_count : 0,
                    'policies' => $yearData ? (int) $yearData->policy_count : 0,
                    'revenue' => $yearData ? (float) $yearData->revenue : 0.0,
                ];
            }

            // 9. Status Distribution
            $statusCounts = (clone $customerQuery)
                ->selectRaw("status, COUNT(*) as count")
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status')
                ->toArray();

            $overallStatuses = [
                ['name' => 'Active', 'value' => $statusCounts['active'] ?? 0],
                ['name' => 'Inactive', 'value' => $statusCounts['inactive'] ?? 0],
                ['name' => 'Blacklisted', 'value' => $statusCounts['blacklisted'] ?? 0],
            ];

            $statusAggregates = (clone $customerQuery)
                ->selectRaw("
                    status,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as daily,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as weekly,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as monthly,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as yearly
                ", [
                    $now->copy()->subDay(),
                    $now->copy()->subWeek(),
                    $now->copy()->subMonth(),
                    $now->copy()->subYear()
                ])
                ->groupBy('status')
                ->get();

            $dailyStatuses = [['name' => 'Active', 'value' => 0], ['name' => 'Inactive', 'value' => 0], ['name' => 'Blacklisted', 'value' => 0]];
            $weeklyStatuses = [['name' => 'Active', 'value' => 0], ['name' => 'Inactive', 'value' => 0], ['name' => 'Blacklisted', 'value' => 0]];
            $monthlyStatuses = [['name' => 'Active', 'value' => 0], ['name' => 'Inactive', 'value' => 0], ['name' => 'Blacklisted', 'value' => 0]];
            $yearlyStatuses = [['name' => 'Active', 'value' => 0], ['name' => 'Inactive', 'value' => 0], ['name' => 'Blacklisted', 'value' => 0]];

            foreach ($statusAggregates as $item) {
                $statusName = ucfirst($item->status);
                $dIndex = array_search($statusName, array_column($dailyStatuses, 'name'));
                if ($dIndex !== false) {
                     $dailyStatuses[$dIndex]['value'] = (int) $item->daily;
                     $weeklyStatuses[$dIndex]['value'] = (int) $item->weekly;
                     $monthlyStatuses[$dIndex]['value'] = (int) $item->monthly;
                     $yearlyStatuses[$dIndex]['value'] = (int) $item->yearly;
                }
            }

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

            // 10. Customer Types
            $typeCounts = (clone $customerQuery)
                ->selectRaw("customer_type, COUNT(*) as count")
                ->groupBy('customer_type')
                ->get()
                ->pluck('count', 'customer_type')
                ->toArray();

            $customerTypes = [
                ['name' => 'Individual', 'value' => $typeCounts['individual'] ?? 0],
                ['name' => 'Corporate', 'value' => $typeCounts['corporate'] ?? 0],
            ];

            // 11. Recent customers
            $recentCustomers = (clone $customerQuery)->orderByDesc('created_at')
                ->take(10)
                ->get(['id', 'customer_code', 'first_name', 'last_name', 'email', 'customer_type', 'status', 'created_at'])
                ->map(function ($item) {
                     return [
                         'id' => $item->id,
                         'customer_code' => $item->customer_code,
                         'first_name' => $item->first_name,
                         'last_name' => $item->last_name,
                         'email' => $item->email,
                         'customer_type' => $item->customer_type,
                         'status' => $item->status,
                         'created_at' => $item->created_at->toDateTimeString()
                     ];
                })
                ->toArray();

            return [
                'stats' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => (int) (clone $customerQuery)->where('status', 'active')->count(),
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
                    'policies' => [
                        'daily' => ['value' => $dailyPolicies, 'trend' => $dailyPoliciesTrend],
                        'weekly' => ['value' => $weeklyPolicies, 'trend' => $weeklyPoliciesTrend],
                        'monthly' => ['value' => $monthlyPolicies, 'trend' => $monthlyPoliciesTrend],
                        'yearly' => ['value' => $yearlyPolicies, 'trend' => $yearlyPoliciesTrend],
                    ],
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
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
