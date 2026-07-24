import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, Filter, ShieldCheck, X } from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { getPolicies } from '../../services/policyApi';
import type { Policy, PolicyListParams } from '../../types/SalesTypes';
import PolicyDetailPage from './PolicyDetailPage';

export default function PoliciesPage() {
  const navigate = useNavigate();

  const [params, setParams] = useState<PolicyListParams>({
    page: 1, per_page: 15, search: '', status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  // Modal View State
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['policies', params],
    queryFn: () => getPolicies(params),
    placeholderData: (prev) => prev,
  });

  const pagination = response?.data;
  const policies = pagination?.data ?? [];

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

  const statusFilters = ['all', 'active', 'expired', 'cancelled', 'lapsed'];

  const columns = [
    {
      key: 'policy_number', label: 'Policy No.', sortable: true,
      render: (r: Policy) => (
        <span className="font-mono text-xs text-blue-600 font-medium">{r.policy_number}</span>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (r: Policy) => (
        <div>
          <p className="font-medium text-slate-800 uppercase">{r.customer?.first_name} {r.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{r.customer?.customer_code}</p>
        </div>
      ),
    },
    {
      key: 'insurance_product', label: 'Product', className: 'hidden md:table-cell',
      render: (r: Policy) => (
        <span className="text-sm text-slate-600">{r.insurance_product?.name ?? '—'}</span>
      ),
    },
    {
      key: 'total_premium', label: 'Premium', sortable: true,
      render: (r: Policy) => (
        <span className="font-medium text-slate-800">₱{Number(r.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'effective_date', label: 'Effective', sortable: true, className: 'hidden lg:table-cell',
      render: (r: Policy) => {
        const d = new Date(r.effective_date || (r as any).created_at);
        const dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return (
          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
            <span>{dateStr}</span>
            <span className="text-[11px] font-mono text-slate-400 ml-1.5">{timeStr}</span>
          </span>
        );
      },
    },
    {
      key: 'expiry_date', label: 'Expiry', sortable: true, className: 'hidden lg:table-cell',
      render: (r: Policy) => (
        <span className="text-xs text-slate-500">{new Date(r.expiry_date).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Policy) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (r: Policy) => (
        <button onClick={(e) => { e.stopPropagation(); setSelectedPolicyId(r.id); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Policies</h1>
        <p className="text-sm text-slate-500">Manage issued insurance policies</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search policy number, customer..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase">Status:</span>
          <div className="flex gap-1">
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setParams((p) => ({ ...p, status: s, page: 1 }))}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  params.status === s ? 'bg-[#4A0E17] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {policies.length === 0 && !isLoading ? (
          <EmptyState icon={<ShieldCheck className="h-10 w-10 text-slate-400" />}
            title="No policies found" description="Try adjusting your search or issue a new policy from an approved quotation." />
        ) : (
          <>
            <DataTable columns={columns} data={policies} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading}
              onRowClick={(r) => setSelectedPolicyId(r.id)} />
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

      {/* ─── Policy Details Modal ───────────── */}
      {selectedPolicyId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPolicyId(null)}>
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex-grow overflow-y-auto p-6">
              <PolicyDetailPage 
                id={selectedPolicyId} 
                onClose={() => setSelectedPolicyId(null)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
