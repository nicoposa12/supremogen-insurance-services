import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, Filter, FileText, X, Loader2, Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { getQuotations } from '../../services/quotationApi';
import type { Quotation, QuotationListParams } from '../../types/SalesTypes';
import InsuranceRequestDetailPage from './InsuranceRequestDetailPage.tsx';
import InlinePolicyNoCell from '../../components/quotations/InlinePolicyNoCell';
import BankAttachmentCell from '../../components/quotations/BankAttachmentCell';
import { useAuth } from '../../context/AuthContext';

export default function InsuranceRequestsPage() {
  const { roles = [] } = useAuth();
  const isAgentOrRenewal = roles.some((r: string) => ['Sales Agent', 'Team Renewal', 'Renewal'].includes(r));
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  const [params, setParams] = useState<QuotationListParams>({
    page: 1, per_page: 15, search: querySearch, status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState(querySearch);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  // Modal Preview States
  const [previewAttachment, setPreviewAttachment] = useState<{ id: number; file_name: string; mime_type: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewList, setPreviewList] = useState<any[]>([]);

  const handleViewAttachment = async (att: any, list?: any[]) => {
    setIsPreviewLoading(true);
    setPreviewAttachment(att);
    if (list && list.length > 0) {
      setPreviewList(list);
    } else {
      setPreviewList([att]);
    }
    setPreviewUrl(null);
    try {
      const { data } = await axios.get(`/api/v1/attachments/${att.id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([data], { type: att.mime_type }));
      setPreviewUrl(blobUrl);
    } catch (err: any) {
      setPreviewAttachment(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewAttachment(null);
    setPreviewList([]);
  };

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
    refetchInterval: 3000,
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

  const statusFilters = ['all', 'submitted', 'resubmitted', 'under_review', 'cancellation_requested', 'approved', 'rejected', 'cancelled'];

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
      key: 'agent', label: 'Agent', sortable: false,
      render: (r: Quotation) => {
        const custAny = (r.customer || {}) as any;
        const agentName = (r.prepared_by && typeof r.prepared_by === 'object' ? r.prepared_by.name : null) ||
          r.customer?.agent ||
          custAny.created_by_user?.name ||
          (typeof custAny.created_by === 'object' ? custAny.created_by?.name : null) ||
          '—';
        return (
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            {agentName}
          </span>
        );
      },
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
      render: (r: Quotation) => {
        const dateVal = r.submitted_at || r.created_at;
        if (!dateVal) return <span className="text-xs text-slate-400">—</span>;
        const d = new Date(dateVal);
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
      key: 'status', label: 'Status', sortable: true,
      render: (r: Quotation) => <StatusBadge status={r.status} />,
    },
    {
      key: 'bank_attachment', label: 'Bank',
      render: (r: Quotation) => (
        <BankAttachmentCell
          customerAttachments={r.customer?.attachments}
          quotationAttachments={r.attachments}
          onViewAttachment={handleViewAttachment}
        />
      ),
    },
    {
      key: 'provider', label: 'Provider', sortable: false,
      render: (r: Quotation) => {
        const firstItem = r.items?.[0];
        const cov = firstItem?.coverage_details || {};
        const rawProvider = (cov.insurance_provider || cov.provider || r.customer?.insurance_provider || 'ALPHA').toUpperCase().trim();
        const isCBIC = rawProvider.includes('CBIC');
        const displayProvider = isCBIC ? 'CBIC' : 'ALPHA';

        return (
          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md uppercase border tracking-wider font-mono ${
            isCBIC
              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
              : 'bg-blue-50 text-blue-800 border-blue-200/80'
          }`}>
            {displayProvider}
          </span>
        );
      },
    },
    {
      key: 'policy_no', label: 'Policy No.',
      render: (r: Quotation) => <InlinePolicyNoCell quotation={r} />,
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
          <input type="text" placeholder="Search IR number, agent, client name, request number..."
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
              onRowClick={(r) => setSelectedRequestId(r.id)}
              rowClassName={(r) => {
                const isCancellationNotice =
                  isAgentOrRenewal &&
                  (r.status === 'cancellation_requested' ||
                    (r.notes && r.notes.includes('Notice for Cancellation')) ||
                    (r.policy?.invoice?.notes && r.policy.invoice.notes.includes('Notice for Cancellation')));
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

      {/* ─── Document Preview Modal ───────────── */}
      {previewAttachment !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={handleClosePreview}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-5 w-5 text-amber-400 shrink-0" />
                <h3 className="font-bold text-sm tracking-tight truncate max-w-[40vw]">
                  Preview: {previewAttachment.file_name}
                </h3>
                {previewList.length > 1 && (
                  <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl ml-2">
                    {previewList.map((doc, idx) => (
                      <button
                        key={doc.id || idx}
                        onClick={() => handleViewAttachment(doc, previewList)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          doc.id === previewAttachment.id
                            ? 'bg-amber-400 text-slate-900 shadow-xs font-bold'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Bank Attachment {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a 
                    href={previewUrl} 
                    download={previewAttachment.file_name}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition flex items-center justify-center"
                    title="Download File"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                )}
                <button 
                  onClick={handleClosePreview}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex items-center justify-center min-h-[50vh]">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-[#4A0E17]" />
                  <p className="text-sm font-semibold text-slate-500">Loading document preview...</p>
                </div>
              ) : previewUrl ? (
                previewAttachment.mime_type.startsWith('image/') ? (
                  <img 
                    src={previewUrl} 
                    alt={previewAttachment.file_name} 
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-sm border border-slate-200" 
                  />
                ) : previewAttachment.mime_type === 'application/pdf' ? (
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-[70vh] rounded-2xl border border-slate-250 bg-white" 
                    title={previewAttachment.file_name}
                  />
                ) : (
                  <div className="text-center py-10 space-y-4">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">This file format cannot be previewed in the browser.</p>
                    <a 
                      href={previewUrl} 
                      download={previewAttachment.file_name}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-bold rounded-xl transition shadow-sm"
                    >
                      Download File
                    </a>
                  </div>
                )
              ) : (
                <div className="text-sm font-bold text-rose-500">Error loading file content.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
