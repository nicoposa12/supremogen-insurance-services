import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  DollarSign,
  ArrowRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  FileText,
  RotateCcw,
  Wallet,
  FileSpreadsheet,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { getDashboardData } from '../../services/dashboardApi';
import { getQuotations } from '../../services/quotationApi';
import type { DashboardData } from '../../types/CustomerTypes';
import { useAuth } from '../../context/AuthContext';

// Chart colors
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isClaimsOfficer = roles.includes('Claims Officer');
  const isAccountingOnly = roles.includes('Accounting Officer') && !roles.includes('Administrator') && !roles.includes('Owner');
  const showRevenue = roles.includes('Administrator') || roles.includes('Accounting Officer');



  const { data: response, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
    refetchInterval: 60000, // auto-refresh every 60s
  });

  const dashboard: DashboardData | undefined = response?.data;

  const [overviewTimeframe, setOverviewTimeframe] = useState('monthly');
  const [revenueTimeframe, setRevenueTimeframe] = useState('monthly');
  const [distributionTimeframe, setDistributionTimeframe] = useState('monthly');
  const [premiumTimeframe, setPremiumTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [customerTimeframe, setCustomerTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const activePremium = useMemo(() => {
    if (!dashboard || !dashboard.stats || !dashboard.stats.premium) {
      return { value: 0, trend: 0 };
    }
    return dashboard.stats.premium[premiumTimeframe] || { value: 0, trend: 0 };
  }, [dashboard, premiumTimeframe]);

  const activeCustomers = useMemo(() => {
    if (!dashboard || !dashboard.stats || !dashboard.stats.customers) {
      const val = dashboard?.stats?.total_customers ?? 0;
      const tr = dashboard?.stats?.customer_trend ?? 0;
      return { value: val, trend: tr };
    }
    return dashboard.stats.customers[customerTimeframe] || { value: 0, trend: 0 };
  }, [dashboard, customerTimeframe]);

  const activePolicies = useMemo(() => {
    if (!dashboard || !dashboard.stats || !dashboard.stats.policies) {
      const val = dashboard?.stats?.active_policies ?? 0;
      const tr = dashboard?.stats?.policies_trend ?? 0;
      return { value: val, trend: tr };
    }
    return dashboard.stats.policies[customerTimeframe] || { value: 0, trend: 0 };
  }, [dashboard, customerTimeframe]);

  const [accountingTimeframe, setAccountingTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [accountingSearchQuery, setAccountingSearchQuery] = useState('');

  // Fetch quotations for accounting metrics
  const { data: qResponse } = useQuery({
    queryKey: ['quotations', 'accounting-dashboard-data'],
    queryFn: () => getQuotations({ per_page: 500 }),
    enabled: roles.includes('Accounting Officer'),
  });

  const quotationsList = qResponse?.data?.data || [];
  const approvedList = useMemo(() => {
    return quotationsList.filter((q: any) => q.status === 'approved' || q.status === 'submitted' || q.status === 'under_review');
  }, [quotationsList]);

  const getAssuredName = (q: any): string => {
    if (!q) return 'N/A';
    const firstItem = q.items?.[0];
    const cov = firstItem?.coverage_details || {};
    if (cov.full_name) return cov.full_name;
    if (cov.assured_name) return cov.assured_name;
    if (cov.client_name) return cov.client_name;

    const cust = (q.customer || {}) as any;
    if (cust.customer_type === 'corporate' && cust.company_name) {
      return cust.company_name;
    }
    const nameParts = [cust.first_name, cust.middle_name, cust.last_name, cust.suffix].filter(Boolean).join(' ');
    if (nameParts) return nameParts;
    if (cust.full_name) return cust.full_name;
    if (cust.name) return cust.name;
    if (cust.company_name) return cust.company_name;
    if (q.customer_name) return q.customer_name;
    if (q.assured_name) return q.assured_name;

    return 'N/A';
  };

  // Helper to compute individual quotation financials accurately
  const getQuotationFinancials = (q: any) => {
    const firstItem = q.items?.[0];
    const cov = firstItem?.coverage_details || {};
    const custAny = (q.customer || {}) as any;
    const provider = (cov.insurance_provider || cov.provider || custAny.insurance_provider || 'ALPHA').toUpperCase();
    const usage = ((custAny.usage || '') + ' ' + (custAny.quotation_used || '') + ' ' + (cov.usage || '')).toUpperCase();
    const isCV = usage.includes('TNVS') || usage.includes('HIRE') || usage.includes('YELLOW');

    const sumIns = Number(firstItem?.sum_insured || cov.sum_insured || custAny.own_damage_coverage || 430000);
    const totalPolicyPrem = Number(q.total_premium || 0);
    const subAgentMarkup = Number(cov.calculator?.sub_agent_markup || cov.sub_agent_markup || custAny.sub_agent_markup || 0);
    const freebieCashback = Number(cov.calculator?.freebie_cashback || cov.freebie_cashback || cov.freebie || custAny.freebie || 0);

    let remit = 0;
    let compInc = 0;
    let netInc = 0;

    if (provider.includes('CBIC')) {
      const ebi = isCV ? 660 : 420;
      const tppd = isCV ? 1395 : 1245;
      const netBasicPrem = sumIns * (0.0065 + 0.003) + ebi + tppd;
      const netGrossPrem = netBasicPrem * (1 + 0.125 + 0.12 + 0.0011);
      const netTariffComm = (ebi * 0.30 + tppd * 0.20) * 0.90;
      remit = netGrossPrem - netTariffComm;
      compInc = totalPolicyPrem - remit;
      netInc = compInc - subAgentMarkup - freebieCashback;
    } else {
      // ALPHA
      const subtotalPrem = sumIns * 0.009 + 420 + 1245;
      const grossTot = subtotalPrem * (1 + 0.2461) + 100;
      const netTariffComm = (420 * 0.30 + 1245 * 0.30) * 0.90;
      remit = grossTot - netTariffComm;
      compInc = totalPolicyPrem - remit;
      netInc = compInc - subAgentMarkup - freebieCashback;
    }

    return {
      provider,
      totalPolicyPrem,
      remit,
      compInc,
      subAgentMarkup,
      freebieCashback,
      netInc,
      date: new Date(q.created_at || Date.now()),
    };
  };

  // Filtered approved items based on active timeframe
  const timeframeFilteredQuotations = useMemo(() => {
    const now = new Date();
    return approvedList.filter((q: any) => {
      const qDate = new Date(q.created_at || Date.now());
      if (accountingTimeframe === 'daily') {
        return qDate.toDateString() === now.toDateString();
      }
      if (accountingTimeframe === 'weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return qDate >= startOfWeek && qDate <= now;
      }
      if (accountingTimeframe === 'monthly') {
        return qDate.getMonth() === now.getMonth() && qDate.getFullYear() === now.getFullYear();
      }
      if (accountingTimeframe === 'yearly') {
        return qDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [approvedList, accountingTimeframe]);

  // Aggregate Metrics based on timeframe
  const accountingMetrics = useMemo(() => {
    let totalPrem = 0;
    let totalRemit = 0;
    let totalCompInc = 0;
    let totalDeductions = 0;
    let totalNetInc = 0;

    timeframeFilteredQuotations.forEach((q: any) => {
      const fin = getQuotationFinancials(q);
      totalPrem += fin.totalPolicyPrem;
      totalRemit += fin.remit;
      totalCompInc += fin.compInc;
      totalDeductions += (fin.subAgentMarkup + fin.freebieCashback);
      totalNetInc += fin.netInc;
    });

    return {
      totalPrem: Math.round(totalPrem),
      totalRemit: Math.round(totalRemit),
      totalCompInc: Math.round(totalCompInc),
      totalDeductions: Math.round(totalDeductions),
      totalNetInc: Math.round(totalNetInc),
      count: timeframeFilteredQuotations.length,
    };
  }, [timeframeFilteredQuotations]);

  // Time-Series Chart Data accurately computed from actual quotation records
  const accountingChartSeries = useMemo(() => {
    const now = new Date();

    if (accountingTimeframe === 'daily') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyBuckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        return {
          dateStr: d.toDateString(),
          label: i === 6 ? 'Today' : days[d.getDay()],
          companyIncome: 0,
          netIncome: 0,
          premium: 0,
        };
      });

      approvedList.forEach((q: any) => {
        const fin = getQuotationFinancials(q);
        const qDateStr = fin.date.toDateString();
        const bucket = dailyBuckets.find((b) => b.dateStr === qDateStr);
        if (bucket) {
          bucket.companyIncome += fin.compInc;
          bucket.netIncome += fin.netInc;
          bucket.premium += fin.totalPolicyPrem;
        }
      });

      return dailyBuckets.map((b) => ({
        label: b.label,
        premium: Math.round(b.premium),
        companyIncome: Math.round(b.companyIncome),
        netIncome: Math.round(b.netIncome),
      }));
    }

    if (accountingTimeframe === 'weekly') {
      const weeks = [
        { label: 'Week 1', minDay: 1, maxDay: 7, companyIncome: 0, netIncome: 0, premium: 0 },
        { label: 'Week 2', minDay: 8, maxDay: 14, companyIncome: 0, netIncome: 0, premium: 0 },
        { label: 'Week 3', minDay: 15, maxDay: 21, companyIncome: 0, netIncome: 0, premium: 0 },
        { label: 'Week 4', minDay: 22, maxDay: 31, companyIncome: 0, netIncome: 0, premium: 0 },
      ];

      approvedList.forEach((q: any) => {
        const fin = getQuotationFinancials(q);
        if (fin.date.getMonth() === now.getMonth() && fin.date.getFullYear() === now.getFullYear()) {
          const dayOfMonth = fin.date.getDate();
          const bucket = weeks.find((w) => dayOfMonth >= w.minDay && dayOfMonth <= w.maxDay);
          if (bucket) {
            bucket.companyIncome += fin.compInc;
            bucket.netIncome += fin.netInc;
            bucket.premium += fin.totalPolicyPrem;
          }
        }
      });

      return weeks.map((w) => ({
        label: w.label,
        premium: Math.round(w.premium),
        companyIncome: Math.round(w.companyIncome),
        netIncome: Math.round(w.netIncome),
      }));
    }

    if (accountingTimeframe === 'yearly') {
      const currentYear = now.getFullYear();
      const years = [currentYear - 2, currentYear - 1, currentYear].map((y) => ({
        label: String(y),
        yearNum: y,
        companyIncome: 0,
        netIncome: 0,
        premium: 0,
      }));

      approvedList.forEach((q: any) => {
        const fin = getQuotationFinancials(q);
        const qYear = fin.date.getFullYear();
        const bucket = years.find((y) => y.yearNum === qYear);
        if (bucket) {
          bucket.companyIncome += fin.compInc;
          bucket.netIncome += fin.netInc;
          bucket.premium += fin.totalPolicyPrem;
        }
      });

      return years.map((y) => ({
        label: y.label,
        premium: Math.round(y.premium),
        companyIncome: Math.round(y.companyIncome),
        netIncome: Math.round(y.netIncome),
      }));
    }

    // Monthly Default
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBuckets = monthNames.map((m, idx) => ({
      monthIdx: idx,
      label: m,
      companyIncome: 0,
      netIncome: 0,
      premium: 0,
    }));

    approvedList.forEach((q: any) => {
      const fin = getQuotationFinancials(q);
      if (fin.date.getFullYear() === now.getFullYear()) {
        const mIdx = fin.date.getMonth();
        if (monthlyBuckets[mIdx]) {
          monthlyBuckets[mIdx].companyIncome += fin.compInc;
          monthlyBuckets[mIdx].netIncome += fin.netInc;
          monthlyBuckets[mIdx].premium += fin.totalPolicyPrem;
        }
      }
    });

    return monthlyBuckets.map((b) => ({
      label: b.label,
      premium: Math.round(b.premium),
      companyIncome: Math.round(b.companyIncome),
      netIncome: Math.round(b.netIncome),
    }));
  }, [accountingTimeframe, approvedList]);

  // Provider Share Data accurately computed from actual quotation records
  const providerShareData = useMemo(() => {
    let alphaCount = 0;
    let cbicCount = 0;
    let alphaIncome = 0;
    let cbicIncome = 0;

    timeframeFilteredQuotations.forEach((q: any) => {
      const fin = getQuotationFinancials(q);
      if (fin.provider.includes('CBIC')) {
        cbicCount++;
        cbicIncome += fin.netInc;
      } else {
        alphaCount++;
        alphaIncome += fin.netInc;
      }
    });

    return [
      { name: 'ALPHA Provider', value: alphaCount, income: Math.round(alphaIncome), color: '#3b82f6' },
      { name: 'CBIC Provider', value: cbicCount, income: Math.round(cbicIncome), color: '#f59e0b' },
    ];
  }, [timeframeFilteredQuotations]);

  if (isClaimsOfficer) {
    const claimsByProvider = dashboard?.charts?.claims_by_provider || [];
    const claimsByStatus = dashboard?.charts?.claims_by_status || [];
    const recentClaims = dashboard?.recent_claims || [];

    return (
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-805 uppercase tracking-wide">Claims Operations Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time claims notification status, distribution, and queue analytics.</p>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Claims"
            value={dashboard?.stats?.pending_claims ?? 0}
            icon={ShieldAlert}
            trend={dashboard?.stats?.pending_claims_trend ?? 0}
            trendLabel="vs last month"
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
          />
          <StatCard
            label="Acknowledged Claims"
            value={dashboard?.stats?.acknowledged_claims ?? 0}
            icon={ShieldCheck}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Returned to Agent"
            value={dashboard?.stats?.returned_claims ?? 0}
            icon={RotateCcw}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Total Claims Filed"
            value={dashboard?.stats?.total_claims ?? 0}
            icon={FileText}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Claims by Provider Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider mb-4">Claims by Insurance Provider</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={claimsByProvider} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Bar dataKey="value" fill="#4A0E17" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Claims status Pie Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider mb-4">Claims Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={claimsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {claimsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-slate-650 font-semibold uppercase">{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Claim Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider">Recent Claim Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest submitted claim notifications</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/claim-notifications')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition uppercase"
            >
              View Queue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ref No. / Assured
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Date Filed
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentClaims.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/dashboard/claim-notifications?search=${c.reference_number}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-bold text-slate-800 uppercase">
                          {c.reference_number}
                        </p>
                        <p className="text-xs text-slate-500 uppercase mt-0.5">{c.assured_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-semibold uppercase">
                      {c.insurance_provider}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Accounting Officer Dashboard Branch
  if (roles.includes('Accounting Officer')) {
    const searchLower = accountingSearchQuery.toLowerCase();
    const ledgerQuotations = timeframeFilteredQuotations.filter((q: any) => {
      if (!accountingSearchQuery) return true;
      const ref = (q.quotation_number || q.ir_number || `IR-${q.id}`).toLowerCase();
      const name = getAssuredName(q).toLowerCase();
      const provider = (q.items?.[0]?.coverage_details?.insurance_provider || 'ALPHA').toLowerCase();
      return ref.includes(searchLower) || name.includes(searchLower) || provider.includes(searchLower);
    });

    return (
      <div className="space-y-4">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Financial Ledger & Income Dashboard</h1>
            <p className="text-sm text-slate-500">Real-time tracking of auto-calculated policy premiums, remittances, and net company income</p>
          </div>

          {/* Timeframe Pill Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setAccountingTimeframe(tf)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition uppercase cursor-pointer ${
                  accountingTimeframe === tf
                    ? 'bg-[#4A0E17] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Financial Flow Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FINANCIAL COMPUTATION FLOW ({accountingTimeframe.toUpperCase()}):</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[11px]">
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase text-[10px] block font-sans font-medium">Total Premium</span>
                <span className="font-bold text-blue-700">₱{accountingMetrics.totalPrem.toLocaleString('en-US')}</span>
              </div>
              <span className="text-slate-400 font-sans font-bold">−</span>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase text-[10px] block font-sans font-medium">Provider Remittances</span>
                <span className="font-bold text-purple-700">₱{accountingMetrics.totalRemit.toLocaleString('en-US')}</span>
              </div>
              <span className="text-slate-400 font-sans font-bold">=</span>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase text-[10px] block font-sans font-medium">Company Income</span>
                <span className="font-bold text-amber-700">₱{accountingMetrics.totalCompInc.toLocaleString('en-US')}</span>
              </div>
              <span className="text-slate-400 font-sans font-bold">−</span>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase text-[10px] block font-sans font-medium">Sub-Agent & Cashback</span>
                <span className="font-bold text-rose-700">₱{accountingMetrics.totalDeductions.toLocaleString('en-US')}</span>
              </div>
              <span className="text-slate-400 font-sans font-bold">=</span>
              <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 font-extrabold shadow-2xs">
                <span className="text-emerald-700 uppercase text-[10px] block font-sans font-medium">NET INCOME</span>
                <span className="text-sm font-bold">₱{accountingMetrics.totalNetInc.toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Financial Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Policy Premium"
            value={`₱${accountingMetrics.totalPrem.toLocaleString('en-US')}`}
            icon={DollarSign}
            trend={14.2}
            trendLabel={`${accountingMetrics.count} policies (${accountingTimeframe})`}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Provider Remittances"
            value={`₱${accountingMetrics.totalRemit.toLocaleString('en-US')}`}
            icon={FileText}
            trend={9.5}
            trendLabel="Net Remittance to Alpha & CBIC"
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <StatCard
            label="Gross Company Income"
            value={`₱${accountingMetrics.totalCompInc.toLocaleString('en-US')}`}
            icon={TrendingUp}
            trend={16.8}
            trendLabel={`Margin ${accountingMetrics.totalPrem > 0 ? ((accountingMetrics.totalCompInc / accountingMetrics.totalPrem) * 100).toFixed(1) : '0'}%`}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />

          {/* NET INCOME CARD (Highlighted Emerald Theme) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#065f46] rounded-2xl p-5 text-white border border-emerald-400/40 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90 block">NET COMPANY INCOME</span>
                <h3 className="text-2xl font-black text-white mt-1">₱{accountingMetrics.totalNetInc.toLocaleString('en-US')}</h3>
              </div>
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200 font-medium">
              <span>After Markups & Cashback</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" /> Net Profit
              </span>
            </div>
          </div>
        </div>

        {/* Financial Analytics & Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Income Performance Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Income Performance Trend</h3>
                <p className="text-xs text-slate-500">Gross Company Income vs. Net Income over time ({accountingTimeframe})</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Company Income
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Net Income
                </span>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={accountingChartSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNetInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Amount']} />
                  <Area type="monotone" dataKey="companyIncome" name="Company Income" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCompInc)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="netIncome" name="Net Income" stroke="#10b981" fillOpacity={1} fill="url(#colorNetInc)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Provider Share & Net Income Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Provider Revenue Share</h3>
              <p className="text-xs text-slate-500">Distribution between ALPHA and CBIC providers</p>
            </div>

            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={providerShareData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {providerShareData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(val: string) => <span className="text-xs font-bold text-slate-700 uppercase">{val}</span>} />
                  <Tooltip formatter={(val: any) => [`${val} Approved Policies`, 'Volume']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Provider Income Progress Cards */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {providerShareData.map((p: any) => (
                <div key={p.name} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                  <span className="font-extrabold text-slate-900">₱{p.income.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approved Policy Statements Accounting Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Approved Policy Accounting Ledger</h3>
              <p className="text-xs text-slate-500">Auto-calculated policy statement records with complete income breakdowns</p>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search IR no, assured name, provider..."
                value={accountingSearchQuery}
                onChange={(e) => setAccountingSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20"
              />
              <button
                onClick={() => navigate('/dashboard/policy-statements')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer whitespace-nowrap"
              >
                All Statements <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">IR / Ref No.</th>
                  <th className="px-4 py-3">Assured Name</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3 text-right">Total Premium</th>
                  <th className="px-4 py-3 text-right">Remittance</th>
                  <th className="px-4 py-3 text-right">Company Income</th>
                  <th className="px-4 py-3 text-right">Net Income</th>
                  <th className="px-4 py-3 text-center">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerQuotations.slice(0, 10).map((q: any) => {
                  const fin = getQuotationFinancials(q);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold text-slate-800">{q.quotation_number || q.ir_number || `IR-${q.id}`}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{getAssuredName(q)}</td>
                      <td className="px-4 py-3 uppercase font-medium">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${fin.provider.includes('CBIC') ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                          {fin.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 text-right">₱{fin.totalPolicyPrem.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 font-medium text-purple-700 text-right">₱{fin.remit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700 text-right">₱{fin.compInc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 font-black text-emerald-700 text-right bg-emerald-50/50">₱{fin.netInc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{fin.date.toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate('/dashboard/policy-statements')}
                          className="px-2.5 py-1 bg-[#4A0E17] text-white text-[11px] font-semibold rounded-lg hover:bg-[#3D0B12] transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {ledgerQuotations.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No policy ledger records found for the selected timeframe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const getOverviewData = () => {
    if (!dashboard) return [];
    switch (overviewTimeframe) {
      case 'daily':
        return dashboard.charts.daily_overview || [];
      case 'weekly':
        return dashboard.charts.weekly_overview || [];
      case 'yearly':
        return dashboard.charts.yearly_overview || [];
      case 'monthly':
      default:
        return dashboard.charts.monthly_overview || [];
    }
  };

  const getRevenueData = () => {
    if (!dashboard) return [];
    switch (revenueTimeframe) {
      case 'daily':
        return dashboard.charts.daily_overview || [];
      case 'weekly':
        return dashboard.charts.weekly_overview || [];
      case 'yearly':
        return dashboard.charts.yearly_overview || [];
      case 'monthly':
      default:
        return dashboard.charts.monthly_overview || [];
    }
  };

  const getDistributionData = () => {
    if (!dashboard) return [];
    const statuses = dashboard.charts.customer_statuses;
    if (!statuses) return [];

    if (Array.isArray(statuses)) {
      return statuses;
    }

    switch (distributionTimeframe) {
      case 'daily':
        return statuses.daily || [];
      case 'weekly':
        return statuses.weekly || [];
      case 'yearly':
        return statuses.yearly || [];
      case 'monthly':
      default:
        return statuses.monthly || [];
    }
  };



  // ─── Loading Skeleton ─────────────────

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5 h-32">
              <div className="h-4 bg-slate-200 rounded w-24 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 h-80" />
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Statistics Cards ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers Card with Timeframe Selector */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total Customers</span>
                <select
                  value={customerTimeframe}
                  onChange={(e) => setCustomerTimeframe(e.target.value as any)}
                  className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-[#4A0E17] cursor-pointer no-print mr-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">
                {activeCustomers.value.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-sm">
            {activeCustomers.trend > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-emerald-600">+{activeCustomers.trend}%</span>
              </>
            ) : activeCustomers.trend < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-600">{activeCustomers.trend}%</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-500">0%</span>
              </>
            )}
            <span className="text-slate-400">vs last {customerTimeframe === 'daily' ? 'day' : customerTimeframe === 'weekly' ? 'week' : customerTimeframe === 'monthly' ? 'month' : 'year'}</span>
          </div>
        </div>
        <StatCard
          label="Active Policies"
          value={activePolicies.value}
          icon={ShieldCheck}
          trend={activePolicies.trend}
          trendLabel={`vs last ${customerTimeframe === 'daily' ? 'day' : customerTimeframe === 'weekly' ? 'week' : customerTimeframe === 'monthly' ? 'month' : 'year'}`}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        {/* Total Premium Card with Timeframe Selector */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total Premium</span>
                <select
                  value={premiumTimeframe}
                  onChange={(e) => setPremiumTimeframe(e.target.value as any)}
                  className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-[#4A0E17] cursor-pointer no-print mr-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">
                ₱{activePremium.value.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-sm">
            {activePremium.trend > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-emerald-600">+{activePremium.trend}%</span>
              </>
            ) : activePremium.trend < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-600">{activePremium.trend}%</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-500">0%</span>
              </>
            )}
            <span className="text-slate-400">vs last {premiumTimeframe === 'daily' ? 'day' : premiumTimeframe === 'weekly' ? 'week' : premiumTimeframe === 'monthly' ? 'month' : 'year'}</span>
          </div>
        </div>
        {showRevenue ? (
          <StatCard
            label="Monthly Revenue"
            value={`₱${dashboard.stats.monthly_revenue.toLocaleString()}`}
            icon={DollarSign}
            trend={dashboard.stats.revenue_trend}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
        ) : (
          <StatCard
            label="Pending Claims"
            value={dashboard.stats.pending_claims}
            icon={ShieldAlert}
            trend={dashboard.stats.pending_claims_trend ?? 0}
            iconColor="text-rose-650"
            iconBg="bg-rose-50"
          />
        )}
      </div>

      {/* ─── Charts Row ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart: Monthly Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Monthly Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">Customer registrations over time</p>
            </div>
            <select
              value={overviewTimeframe}
              onChange={(e) => setOverviewTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={getOverviewData()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="short" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="customers"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#colorCustomers)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Revenue / Active Policies Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {showRevenue ? 'Monthly Revenue' : 'Active Policies'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {showRevenue ? 'Revenue over time' : 'Policies issued over time'}
              </p>
            </div>
            <select
              value={revenueTimeframe}
              onChange={(e) => setRevenueTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={getRevenueData()} margin={{ top: 5, right: 5, left: showRevenue ? -20 : -30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="short" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => showRevenue ? `₱${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip
                formatter={(value: any) => [
                  showRevenue ? `₱${Number(value).toLocaleString()}` : Number(value),
                  showRevenue ? 'Revenue' : 'Policies'
                ]}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              />
              <Bar dataKey={showRevenue ? 'revenue' : 'policies'} fill="#c92a3e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Quick Actions + Recent Customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart: Customer Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Customer Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">By status</p>
            </div>
            <select
              value={distributionTimeframe}
              onChange={(e) => setDistributionTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={getDistributionData()}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {getDistributionData().map((_, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Customers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Recent Customers</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest registered customers</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/customers')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recent_customers.slice(0, 7).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/dashboard/customers/${c.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-slate-800">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{c.customer_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600 hidden sm:table-cell">
                      {c.customer_type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
