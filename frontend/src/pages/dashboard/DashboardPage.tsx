import { useState, useMemo } from 'react';
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
import { getDashboardData } from '../../services/dashboardApi';
import type { DashboardData } from '../../types/CustomerTypes';

// Chart colors
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const navigate = useNavigate();

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
          value={dashboard.stats.active_policies}
          icon={ShieldCheck}
          trend={dashboard.stats.policies_trend}
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
        <StatCard
          label="Monthly Revenue"
          value={`₱${dashboard.stats.monthly_revenue.toLocaleString()}`}
          icon={DollarSign}
          trend={dashboard.stats.revenue_trend}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
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

        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Monthly Revenue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Revenue over time</p>
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
            <BarChart data={getRevenueData()} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="short" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              />
              <Bar dataKey="revenue" fill="#c92a3e" radius={[4, 4, 0, 0]} />
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
