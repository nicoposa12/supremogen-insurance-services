import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, Filter, FileText, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { getQuotations } from '../../services/quotationApi';
import type { Quotation, QuotationListParams } from '../../types/SalesTypes';
import InsuranceRequestDetailPage from './InsuranceRequestDetailPage.tsx';
import { useAuth } from '../../context/AuthContext';

export default function InsuranceRequestsPage() {
  const { roles = [] } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  const [params, setParams] = useState<QuotationListParams>({
    page: 1, per_page: 15, search: querySearch, status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState(querySearch);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['insurance-requests', params],
    queryFn: () => getQuotations(params),
    placeholderData: (prev) => prev,
  });

  const pagination = response?.data;
  const requests = pagination?.data ?? [];

  // Count plate numbers in the current list to identify duplicates client-side
  const plateCounts = requests.reduce((acc: Record<string, number>, r) => {
    const plate = r.customer?.plate_no?.trim().toUpperCase();
    if (
      plate &&
      plate !== '—' &&
      plate !== 'PENDING' &&
      plate !== 'TBA' &&
      plate !== 'TEMP' &&
      plate !== 'TEMPORARY' &&
      plate.length > 2
    ) {
      acc[plate] = (acc[plate] || 0) + 1;
    }
    return acc;
  }, {});

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

  const statusFilters = ['all', 'submitted', 'under_review', 'approved', 'rejected'];

  const columns = [
    {
      key: 'ir_number', label: 'IR No.', sortable: false,
      render: (r: Quotation) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-300/80 text-yellow-900 font-mono text-xs font-extrabold rounded-md tracking-wide shadow-sm">
          {r.ir_number || '—'}
        </span>
      ),
    },
    {
      key: 'customer', label: 'Assured Client',
      render: (r: Quotation) => (
        <div>
          <p className="font-semibold text-slate-800 text-sm uppercase">
            {r.customer?.first_name} {r.customer?.last_name}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">{r.customer?.customer_code}</p>
        </div>
      ),
    },
    {
      key: 'plate_no', label: 'Plate No.',
      render: (r: Quotation) => {
        const plate = r.customer?.plate_no?.trim().toUpperCase();
        const isDuplicate = plate && plateCounts[plate] > 1;
        const isUnderwriterOrAdmin = roles.includes('Underwriter') || roles.includes('Administrator');

        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-mono text-xs font-semibold text-slate-700 uppercase">{r.customer?.plate_no || '—'}</span>
            {isUnderwriterOrAdmin && isDuplicate && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider animate-pulse">
                ⚠️ DUPLICATE
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'vehicle', label: 'Vehicle',
      render: (r: Quotation) => (
        <span className="text-xs font-semibold text-slate-700 uppercase">{r.customer?.unit || '—'}</span>
      ),
    },

    {
      key: 'quotation_number', label: 'Request No.', sortable: true,
      render: (r: Quotation) => (
        <span className="font-mono text-xs text-blue-600 font-medium">{r.quotation_number}</span>
      ),
    },
    {
      key: 'total_premium', label: 'Premium', sortable: true,
      render: (r: Quotation) => (
        <span className="font-semibold text-slate-800 font-mono text-sm">
          ₱{Number(r.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'submitted_at', label: 'Submitted', sortable: false,
      className: 'hidden lg:table-cell',
      render: (r: Quotation) => (
        <span className="text-xs text-slate-500">
          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Quotation) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (r: Quotation) => (
        <button onClick={(e) => { e.stopPropagation(); setSelectedRequestId(r.id); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Insurance Requests</h1>
        <p className="text-sm text-slate-500">Review and process submitted policy issuance requests</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row items-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-4">
        {/* Search Input */}
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search IR number, client name, request number..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition" />
          {searchInput && (
            <button 
              onClick={() => {
                setSearchInput('');
                setSearchParams({});
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer flex items-center justify-center"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
          <div className="flex items-center gap-1.5 w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">From</span>
            <input
              type="date"
              value={params.start_date || ''}
              onChange={(e) => setParams((p) => ({ ...p, start_date: e.target.value || undefined, page: 1 }))}
              className="w-full lg:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">To</span>
            <input
              type="date"
              value={params.end_date || ''}
              onChange={(e) => setParams((p) => ({ ...p, end_date: e.target.value || undefined, page: 1 }))}
              className="w-full lg:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
            />
          </div>
          {(params.start_date || params.end_date) && (
            <button
              onClick={() => setParams((p) => ({ ...p, start_date: undefined, end_date: undefined, page: 1 }))}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition shrink-0"
            >
              Clear
            </button>
          )}
        </div>
        
        {/* Status Dropdown */}
        <div className="relative shrink-0 w-full lg:w-48">
          <select
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] appearance-none transition cursor-pointer"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : s === 'under_review' ? 'Under Review' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {requests.length === 0 && !isLoading ? (
          <EmptyState icon={<FileText className="h-10 w-10 text-slate-400" />}
            title="No insurance requests found" description="Submitted policy issuance requests from agents will appear here for review." />
        ) : (
          <>
            <DataTable columns={columns} data={requests} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading}
              onRowClick={(r) => setSelectedRequestId(r.id)} />
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

      {/* ─── Insurance Request Detail Modal ───────────── */}
      {selectedRequestId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRequestId(null)}>
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex-grow overflow-y-auto p-6">
              <InsuranceRequestDetailPage
                id={selectedRequestId}
                onClose={() => setSelectedRequestId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
