import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  UserPlus,
  FileText,
  CreditCard,
  BarChart3,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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

  // ─── Quick Actions ────────────────────

  const quickActions = [
    {
      label: 'New Customer',
      icon: UserPlus,
      path: '/dashboard/customers/new',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    },
    {
      label: 'New Quotation',
      icon: FileText,
      path: '/dashboard/quotations',
      color: 'bg-violet-50 text-violet-600 hover:bg-violet-100',
    },
    {
      label: 'Record Payment',
      icon: CreditCard,
      path: '/dashboard/payments',
      color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    },
    {
      label: 'View Reports',
      icon: BarChart3,
      path: '/dashboard/reports',
      color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    },
  ];

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
        <StatCard
          label="Total Customers"
          value={dashboard.stats.total_customers}
          icon={Users}
          trend={dashboard.stats.customer_trend}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Active Policies"
          value={dashboard.stats.active_policies}
          icon={ShieldCheck}
          trend={dashboard.stats.policies_trend}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Pending Claims"
          value={dashboard.stats.pending_claims}
          icon={AlertTriangle}
          trend={dashboard.stats.claims_trend}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
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
              <p className="text-xs text-slate-500 mt-0.5">Customer registrations over the last 12 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dashboard.charts.monthly_overview} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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

        {/* Pie Chart: Customer Types */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Customer Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">By status</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={dashboard.charts.customer_statuses}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {dashboard.charts.customer_statuses.map((_, index) => (
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
      </div>

      {/* ─── Quick Actions + Recent Customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${action.color}`}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
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
