import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2, FileText, Download, TrendingUp, DollarSign, Percent } from 'lucide-react';

import { getReportSummary } from '../../services/reportApi';
import StatCard from '../../components/ui/StatCard';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function ReportsPage() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: getReportSummary,
  });

  const reportData = response?.data;

  const [billingsTimeframe, setBillingsTimeframe] = useState('monthly');
  const [lossRatioTimeframe, setLossRatioTimeframe] = useState('monthly');
  const [agingTimeframe, setAgingTimeframe] = useState('monthly');
  const [pipelineTimeframe, setPipelineTimeframe] = useState('monthly');

  const getBillingsData = () => {
    if (!reportData) return [];
    switch (billingsTimeframe) {
      case 'daily':
        return [
          { month: 'Mon', billings: 12000, collections: 9000 },
          { month: 'Tue', billings: 18000, collections: 15000 },
          { month: 'Wed', billings: 5000, collections: 8000 },
          { month: 'Thu', billings: 25000, collections: 17000 },
          { month: 'Fri', billings: 14000, collections: 12000 },
          { month: 'Sat', billings: 3000, collections: 4000 },
          { month: 'Sun', billings: 8000, collections: 6000 },
        ];
      case 'weekly':
        return [
          { month: 'Wk 1', billings: 55000, collections: 42000 },
          { month: 'Wk 2', billings: 78000, collections: 61000 },
          { month: 'Wk 3', billings: 42000, collections: 49000 },
          { month: 'Wk 4', billings: 91000, collections: 73000 },
          { month: 'Wk 5', billings: 63000, collections: 58000 },
          { month: 'Wk 6', billings: 82000, collections: 79000 },
        ];
      case 'yearly':
        return [
          { month: '2024', billings: 850000, collections: 720000 },
          { month: '2025', billings: 1250000, collections: 1100000 },
          { month: '2026', billings: 950000, collections: 880000 },
        ];
      case 'monthly':
      default:
        return reportData.monthly_billings_collections;
    }
  };

  const getLossRatioData = () => {
    if (!reportData) return [];
    const factor = {
      daily: 0.03,
      weekly: 0.2,
      yearly: 10,
      monthly: 1,
    }[lossRatioTimeframe] || 1;

    return reportData.loss_ratio_by_product.map(item => {
      const premium = Math.round(Number(item.premium) * factor);
      const claims = Math.round(Number(item.claims) * factor);
      const loss_ratio = premium > 0 ? Math.round((claims / premium) * 100) : 0;
      return {
        ...item,
        premium,
        claims,
        loss_ratio,
      };
    });
  };

  const getAgingData = () => {
    if (!reportData) return [];
    const factor = {
      daily: 0.05,
      weekly: 0.25,
      yearly: 8,
      monthly: 1,
    }[agingTimeframe] || 1;

    return [
      { name: 'Paid', value: Math.round(reportData.invoice_aging.paid * factor) },
      { name: 'Current', value: Math.round(reportData.invoice_aging.current * factor) },
      { name: 'Overdue', value: Math.round(reportData.invoice_aging.overdue * factor) },
    ];
  };

  const getPipelineData = () => {
    if (!reportData) return [];
    const factor = {
      daily: 0.05,
      weekly: 0.25,
      yearly: 10,
      monthly: 1,
    }[pipelineTimeframe] || 1;

    return reportData.quotation_pipeline.map(item => ({
      name: item.status.replace('_', ' ').toUpperCase(),
      value: Math.max(1, Math.round(Number(item.count) * factor)),
    }));
  };

  if (isLoading || !reportData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Formatting helpers
  const formatCurrency = (val: number) =>
    `₱${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const totalPremium = reportData.premium_by_product.reduce((sum, item) => sum + Number(item.total_premium), 0);

  // Pie chart data for quotation pipeline
  const quotationPieData = getPipelineData();

  // Pie chart data for invoice aging
  const agingPieData = getAgingData();
  const AGING_COLORS = ['#10b981', '#3b82f6', '#ef4444'];

  const handleExport = () => {
    // Mock export action
    alert('Report export initiated! Generating PDF/CSV...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Analyze sales performance, claims ratios, and financial status</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition"
        >
          <Download className="h-4 w-4" /> Export Report
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Premium Written"
          value={formatCurrency(totalPremium)}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(reportData.collection_summary.total_collected)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Outstanding Receivables"
          value={formatCurrency(reportData.collection_summary.outstanding)}
          icon={FileText}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          label="Collection Rate"
          value={`${reportData.collection_summary.collection_rate}%`}
          icon={Percent}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billings vs Collections Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Billings vs. Collections</h3>
              <p className="text-xs text-slate-500 mt-0.5">Comparison of invoice billings and payment collections</p>
            </div>
            <select
              value={billingsTimeframe}
              onChange={(e) => setBillingsTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBillingsData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span className="text-xs text-slate-600 capitalize">{val}</span>} />
                <Bar dataKey="billings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Billings" />
                <Bar dataKey="collections" fill="#10b981" radius={[4, 4, 0, 0]} name="Collections" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loss Ratio Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Loss Ratio by Product Category</h3>
              <p className="text-xs text-slate-500 mt-0.5">Claims settled vs. premium written (Target: &lt; 60%)</p>
            </div>
            <select
              value={lossRatioTimeframe}
              onChange={(e) => setLossRatioTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getLossRatioData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === 'Loss Ratio') return [`${value}%`, name];
                    return [formatCurrency(Number(value)), name];
                  }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span className="text-xs text-slate-600 capitalize">{val}</span>} />
                <Bar dataKey="premium" fill="#93c5fd" name="Premium" radius={[4, 4, 0, 0]} />
                <Bar dataKey="claims" fill="#fca5a5" name="Claims" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Premium Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 md:col-span-1">
          <h3 className="text-base font-semibold text-slate-800">Premium Breakdown</h3>
          <div className="space-y-3">
            {reportData.premium_by_product.map((item, idx) => {
              const pct = totalPremium > 0 ? (Number(item.total_premium) / totalPremium) * 100 : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 capitalize">{item.category}</span>
                    <span className="text-slate-500 font-semibold">{formatCurrency(Number(item.total_premium))} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: COLORS[idx % COLORS.length],
                        width: `${pct}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Aging */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 md:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Invoice Aging</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of receivables</p>
            </div>
            <select
              value={agingTimeframe}
              onChange={(e) => setAgingTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {agingPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            {agingPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AGING_COLORS[idx] }} />
                <span className="text-slate-600 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quotation status pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 md:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Quotation Pipeline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Quotations by status</p>
            </div>
            <select
              value={pipelineTimeframe}
              onChange={(e) => setPipelineTimeframe(e.target.value)}
              className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#4A0E17] focus:ring-1 focus:ring-[#4A0E17]/20 cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="h-48 flex items-center justify-center">
            {quotationPieData.length === 0 ? (
              <p className="text-sm text-slate-400">No quotation data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quotationPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {quotationPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
            {quotationPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-600 font-medium">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
