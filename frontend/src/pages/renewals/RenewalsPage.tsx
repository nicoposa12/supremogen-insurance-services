import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, RefreshCw, Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getRenewals, processRenewal, cancelRenewal } from '../../services/renewalApi';
import type { Renewal, RenewalListParams } from '../../types/ClaimsTypes';

export default function RenewalsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  const [params, setParams] = useState<RenewalListParams>({
    page: 1, per_page: 15, search: querySearch, status: 'all',
    sort_by: 'original_expiry_date', sort_dir: 'asc',
  });
  const [searchInput, setSearchInput] = useState(querySearch);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);

  // Process modal
  const [processTarget, setProcessTarget] = useState<Renewal | null>(null);
  const [newEffective, setNewEffective] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [premiumAdj, setPremiumAdj] = useState<number>(0);
  const [processNotes, setProcessNotes] = useState('');

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<Renewal | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['renewals', params],
    queryFn: () => getRenewals(params),
    placeholderData: (prev) => prev,
  });

  const pagination = response?.data;
  const renewals = pagination?.data ?? [];

  const processMut = useMutation({
    mutationFn: () => processRenewal(processTarget!.id, {
      new_effective_date: newEffective,
      new_expiry_date: newExpiry,
      premium_adjustment: premiumAdj,
      notes: processNotes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      showToast('Policy renewed successfully!');
      setProcessTarget(null);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to process.', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelRenewal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      showToast('Renewal cancelled.');
      setCancelTarget(null);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to cancel.', 'error'),
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setParams((p) => ({ ...p, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);
  const handleSort = (key: string) => {
    setParams((p) => ({
      ...p, sort_by: key,
      sort_dir: p.sort_by === key && p.sort_dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openProcess = (r: Renewal) => {
    const expiryDate = r.original_expiry_date?.split('T')[0] ?? '';
    setProcessTarget(r);
    setNewEffective(expiryDate);
    // Default: 1 year from expiry
    if (expiryDate) {
      const d = new Date(expiryDate);
      d.setFullYear(d.getFullYear() + 1);
      setNewExpiry(d.toISOString().split('T')[0]);
    }
    setPremiumAdj(0);
    setProcessNotes('');
  };

  const statusFilters = ['all', 'pending', 'renewed', 'expired', 'cancelled'];

  const columns = [
    {
      key: 'renewal_number', label: 'Renewal No.', sortable: true,
      render: (r: Renewal) => (
        <span className="font-mono text-xs text-blue-600 font-medium">{r.renewal_number}</span>
      ),
    },
    {
      key: 'policy', label: 'Policy',
      render: (r: Renewal) => (
        <div>
          <p className="font-mono text-xs text-slate-600">{r.policy?.policy_number}</p>
          <p className="text-xs text-slate-500">{r.policy?.insurance_product?.name}</p>
        </div>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (r: Renewal) => (
        <span className="text-sm text-slate-700">{r.customer?.first_name} {r.customer?.last_name}</span>
      ),
    },
    {
      key: 'original_expiry_date', label: 'Expiry Date', sortable: true,
      render: (r: Renewal) => {
        const exp = new Date(r.original_expiry_date);
        const isExpiring = r.status === 'pending' && exp <= new Date(Date.now() + 30 * 86400000);
        return (
          <span className={`text-xs ${isExpiring ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
            {exp.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'premium', label: 'Premium', className: 'hidden lg:table-cell',
      render: (r: Renewal) => (
        <span className="text-sm text-slate-700">₱{Number(r.policy?.total_premium ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Renewal) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (r: Renewal) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/policies/${r.policy_id}`); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View Policy">
            <Eye className="h-4 w-4" />
          </button>
          {!isAdmin && !roles.includes('Accounting Officer') && r.status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); openProcess(r); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition" title="Renew">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCancelTarget(r); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Cancel">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {r.new_policy && (
            <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/policies/${r.new_policy_id}`); }}
              className="px-2 py-1 text-xs text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition" title="View New Policy">
              {r.new_policy.policy_number}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Renewals</h1>
        <p className="text-sm text-slate-500">Track policy renewals and expirations</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search renewal no., policy, customer..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase">Status:</span>
          <div className="flex gap-1">
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setParams((p) => ({ ...p, status: s, page: 1 }))}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  params.status === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {renewals.length === 0 && !isLoading ? (
          <EmptyState icon={<RefreshCw className="h-10 w-10 text-slate-400" />}
            title="No renewals found" description="Renewals will appear when policies approach their expiry date." />
        ) : (
          <>
            <DataTable columns={columns} data={renewals} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading}
              rowClassName={(r: any) => {
                const isAgentOrRenewal = roles.includes('Sales Agent') || roles.includes('Team Renewal') || roles.includes('Renewal');
                const isCancellationNotice =
                  isAgentOrRenewal &&
                  (r.status === 'cancelled' ||
                    (r.status as string) === 'cancellation_requested' ||
                    (r.policy?.notes && r.policy.notes.includes('Notice for Cancellation')));
                return isCancellationNotice
                  ? 'bg-amber-500/15 dark:bg-amber-950/40 hover:bg-amber-500/25 border-l-4 border-l-amber-500 text-slate-900 font-semibold shadow-2xs'
                  : 'hover:bg-slate-50/80';
              }}
            />
            {pagination && (
              <div className="border-t border-slate-100">
                <Pagination currentPage={pagination.current_page} lastPage={pagination.last_page}
                  perPage={pagination.per_page} total={pagination.total}
                  from={pagination.from} to={pagination.to}
                  onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                  onPerPageChange={(pp) => setParams((p) => ({ ...p, per_page: pp, page: 1 }))} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Process Renewal Modal */}
      {processTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setProcessTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Renew Policy</h3>
            <p className="text-sm text-slate-500">
              Renewing <span className="font-medium text-slate-700">{processTarget.policy?.policy_number}</span> for{' '}
              <span className="font-medium text-slate-700">{processTarget.customer?.first_name} {processTarget.customer?.last_name}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Effective Date *</label>
                <input type="date" value={newEffective} onChange={(e) => setNewEffective(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Expiry Date *</label>
                <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Premium Adjustment (₱)</label>
              <input type="number" step="1" value={premiumAdj || ''} onChange={(e) => setPremiumAdj(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                placeholder="0 for no change, positive to increase, negative to decrease" />
              <p className="text-xs text-slate-400 mt-1">
                Current: ₱{Number(processTarget.policy?.total_premium ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} →
                New: ₱{(Number(processTarget.policy?.total_premium ?? 0) + premiumAdj).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea value={processNotes} onChange={(e) => setProcessNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setProcessTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => processMut.mutate()} disabled={processMut.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-600/20 transition">
                {processMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <RefreshCw className="h-4 w-4" /> Renew Policy
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!cancelTarget} title="Cancel Renewal"
        message={`Cancel renewal ${cancelTarget?.renewal_number} for policy ${cancelTarget?.policy?.policy_number}?`}
        confirmLabel="Cancel Renewal" variant="danger" loading={cancelMut.isPending}
        onConfirm={() => cancelTarget && cancelMut.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)} />
    </div>
  );
}
