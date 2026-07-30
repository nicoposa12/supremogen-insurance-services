import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, Shield, Clock, User, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { getAuditLogs, type AuditLog, type AuditLogParams } from '../../services/auditLogApi';

// Action type badge colors
const actionColors: Record<string, string> = {
  'auth.login': 'bg-emerald-100 text-emerald-700',
  'auth.login_failed': 'bg-red-100 text-red-700',
  'auth.logout': 'bg-slate-100 text-slate-600',
  'user.impersonate': 'bg-purple-100 text-purple-700',
  'quotation.approve': 'bg-emerald-100 text-emerald-700',
  'quotation.reject': 'bg-red-100 text-red-700',
  'quotation.delete': 'bg-red-100 text-red-700',
  'policy.cancel': 'bg-orange-100 text-orange-700',
  'invoice.cancel': 'bg-orange-100 text-orange-700',
  'invoice.delete': 'bg-red-100 text-red-700',
  'payment.void': 'bg-red-100 text-red-700',
  'payment.verify': 'bg-blue-100 text-blue-700',
  'claim.assign': 'bg-blue-100 text-blue-700',
  'claim.approve': 'bg-emerald-100 text-emerald-700',
  'claim.deny': 'bg-red-100 text-red-700',
  'claim.settle': 'bg-emerald-100 text-emerald-700',
};

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.login_failed', label: 'Failed Login' },
  { value: 'auth.logout', label: 'Logout' },
  { value: 'user.impersonate', label: 'Impersonate' },
  { value: 'quotation.approve', label: 'Quotation Approved' },
  { value: 'quotation.reject', label: 'Quotation Rejected' },
  { value: 'quotation.delete', label: 'Quotation Deleted' },
  { value: 'policy.cancel', label: 'Policy Cancelled' },
  { value: 'invoice.cancel', label: 'Invoice Cancelled' },
  { value: 'invoice.delete', label: 'Invoice Deleted' },
  { value: 'payment.void', label: 'Payment Voided' },
  { value: 'payment.verify', label: 'Payment Verified' },
  { value: 'claim.assign', label: 'Claim Assigned' },
  { value: 'claim.approve', label: 'Claim Approved' },
  { value: 'claim.deny', label: 'Claim Denied' },
  { value: 'claim.settle', label: 'Claim Settled' },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function JsonViewer({ data, label }: { data: Record<string, any> | null; label: string }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-600 overflow-x-auto">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-slate-400">{key}:</span>
            <span className="text-slate-700">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'null')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const params: AuditLogParams = useMemo(() => ({
    page,
    per_page: 20,
    ...(search && { search }),
    ...(actionFilter && { action: actionFilter }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
  }), [page, search, actionFilter, dateFrom, dateTo]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => getAuditLogs(params),
    placeholderData: (prev) => prev,
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#4A0E17]/10 rounded-xl">
          <Shield className="h-6 w-6 text-[#4A0E17]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
          <p className="text-sm text-slate-500">Track all sensitive actions across the system</p>
        </div>
        {meta && (
          <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            {meta.total.toLocaleString()} entries
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-600">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] outline-none transition"
            />
          </div>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] outline-none transition cursor-pointer"
          >
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] outline-none transition"
            placeholder="From date"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] outline-none transition"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Shield className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No audit logs found</p>
            <p className="text-xs mt-1">Adjust your filters or check back later</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">When</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log: AuditLog) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    isExpanded={expandedRow === log.id}
                    onToggle={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Page {meta.current_page} of {meta.last_page} ({meta.total} total)
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ log, isExpanded, onToggle }: { log: AuditLog; isExpanded: boolean; onToggle: () => void }) {
  const hasDetails = (log.old_values && Object.keys(log.old_values).length > 0) ||
                     (log.new_values && Object.keys(log.new_values).length > 0);

  return (
    <>
      <tr
        className={`hover:bg-slate-50/70 transition cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {formatDate(log.created_at)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-700">{log.user?.name || '—'}</span>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={log.description}>
          {log.description}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            {log.ip_address || '—'}
          </div>
        </td>
        <td className="px-4 py-3">
          {hasDetails && (
            <button className="p-1 rounded-md hover:bg-slate-200 transition">
              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
          )}
        </td>
      </tr>
      {isExpanded && hasDetails && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <JsonViewer data={log.old_values} label="Before" />
              <JsonViewer data={log.new_values} label="After" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
