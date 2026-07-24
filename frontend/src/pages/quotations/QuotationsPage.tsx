import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Pencil, Trash2, Filter, FileText, X, Calendar, Loader2, Download, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getQuotations, deleteQuotation } from '../../services/quotationApi';
import type { Quotation, QuotationListParams } from '../../types/SalesTypes';
import QuotationFormPage from './QuotationFormPage';
import QuotationDetailPage from './QuotationDetailPage';
import { RequestCancellationModal } from '../../components/quotations/RequestCancellationModal';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const canEdit = roles.includes('Sales Agent') || roles.includes('Team Renewal');
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  const queryRole = searchParams.get('role') || '';

  const [params, setParams] = useState<QuotationListParams>({
    page: 1, per_page: 15, search: querySearch, status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
    start_date: undefined, end_date: undefined,
    creator_role: queryRole || undefined,
  });
  const [searchInput, setSearchInput] = useState(querySearch);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [cancellationTarget, setCancellationTarget] = useState<Quotation | null>(null);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);

  useEffect(() => {
    setParams((p) => ({
      ...p,
      creator_role: queryRole || undefined,
      page: 1,
    }));
  }, [queryRole]);

  // Modal Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Quotation | null>(null);

  // Modal View States
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);

  // Modal Preview States
  const [previewAttachment, setPreviewAttachment] = useState<{ id: number; file_name: string; mime_type: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleViewAttachment = async (att: any) => {
    setIsPreviewLoading(true);
    setPreviewAttachment(att);
    setPreviewUrl(null);
    try {
      const { data } = await axios.get(`/api/v1/attachments/${att.id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([data], { type: att.mime_type }));
      setPreviewUrl(blobUrl);
    } catch (err) {
      showToast('Failed to load document preview.', 'error');
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
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['quotations', params],
    queryFn: () => getQuotations(params),
    placeholderData: (prev) => prev,
    refetchInterval: 3000,
  });

  const pagination = response?.data;
  const quotations = pagination?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast('Policy request deleted successfully.');
      setDeleteTarget(null);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to delete.', 'error'),
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

  const statusFilters = ['all', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancellation_requested', 'cancelled', 'expired'];

  const columns = [
    {
      key: 'quotation_number', label: 'Number', sortable: true,
      render: (r: Quotation) => (
        <span className="font-mono text-xs text-blue-600 font-medium">{r.quotation_number}</span>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (r: Quotation) => (
        <div>
          <p className="font-medium text-slate-800 uppercase">
            {r.customer?.first_name} {r.customer?.last_name}
          </p>
          <p className="text-xs text-slate-500">{r.customer?.customer_code}</p>
        </div>
      ),
    },
    {
      key: 'agent', label: 'Agent',
      render: (r: Quotation) => (
        <span className="text-xs font-semibold text-slate-700 uppercase">
          {r.prepared_by && typeof r.prepared_by === 'object' ? r.prepared_by.name : '—'}
        </span>
      ),
    },
    {
      key: 'plate_no', label: 'Plate No.',
      render: (r: Quotation) => (
        <span className="font-mono text-xs font-semibold text-slate-700 uppercase">{r.customer?.plate_no || '—'}</span>
      ),
    },
    {
      key: 'vehicle', label: 'Vehicle',
      render: (r: Quotation) => (
        <span className="text-xs font-semibold text-slate-700 uppercase">{r.customer?.unit || '—'}</span>
      ),
    },
    {
      key: 'total_premium', label: 'Premium', sortable: true,
      render: (r: Quotation) => (
        <span className="font-medium text-slate-800">₱{Number(r.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Quotation) => <StatusBadge status={r.status} />,
    },
    {
      key: 'bank_attachment', label: 'Bank',
      render: (r: Quotation) => {
        const bankDoc = r.customer?.attachments?.find((d: any) => d.document_type === 'bank');
        if (!bankDoc) return <span className="text-slate-350">—</span>;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewAttachment(bankDoc);
            }}
            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200/80 transition-all cursor-pointer inline-flex items-center"
            title={`View ${bankDoc.file_name}`}
          >
            <FileText className="h-4 w-4" />
          </button>
        );
      }
    },

    {
      key: 'created_at', label: 'Created', sortable: true,
      className: 'hidden md:table-cell',
      render: (r: Quotation) => {
        const d = new Date(r.created_at);
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
      key: 'actions', label: 'Actions', className: 'text-right',
      render: (r: Quotation) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && r.status === 'draft' && (
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {canEdit && ['approved', 'submitted', 'under_review'].includes(r.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCancellationTarget(r);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
              title="Request Cancellation"
            >
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Policy Issuance Requests</h1>
          <p className="text-sm text-slate-500">Manage policy issuance requests and approvals</p>
        </div>
        {canEdit && (
          <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
            <Plus className="h-4 w-4" /> New Policy Request
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-4">
        {/* Search Input */}
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search policy request number, customer..."
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
        
        {/* Filters Group (Dates & Status) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
          {/* Start Date */}
          <div className="relative w-full sm:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input type="date"
              value={params.start_date || ''}
              onChange={(e) => setParams((p) => ({ ...p, start_date: e.target.value || undefined, page: 1 }))}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="relative w-full sm:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input type="date"
              value={params.end_date || ''}
              onChange={(e) => setParams((p) => ({ ...p, end_date: e.target.value || undefined, page: 1 }))}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
              title="End Date"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative w-full sm:w-48">
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

          {/* Clear Dates Button */}
          {(params.start_date || params.end_date) && (
            <button
              onClick={() => setParams((p) => ({ ...p, start_date: undefined, end_date: undefined, page: 1 }))}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 w-full sm:w-auto"
              title="Clear date filters"
            >
              <X className="h-4 w-4" />
              <span className="sm:hidden ml-2 text-sm font-medium">Clear Dates</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {quotations.length === 0 && !isLoading ? (
          <EmptyState icon={<FileText className="h-10 w-10 text-slate-400" />}
            title="No policy requests found" description="Create a new policy request to get started."
            action={
              canEdit ? (
                <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl transition cursor-pointer">
                  <Plus className="h-4 w-4" /> New Policy Request
                </button>
              ) : undefined
            } />
        ) : (
          <>
            <DataTable columns={columns} data={quotations} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading}
              onRowClick={(r) => setSelectedQuotationId(r.id)} />
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

      {/* ─── Quotation Form Modal ───────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  {formEditTarget ? `Edit Policy Request - ${formEditTarget.quotation_number}` : 'New Policy Request'}
                </h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <QuotationFormPage 
                id={formEditTarget?.id} 
                onClose={() => setIsFormOpen(false)} 
                onSuccess={() => { 
                  setIsFormOpen(false); 
                  queryClient.invalidateQueries({ queryKey: ['quotations'] }); 
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Quotation Details Modal ───────────── */}
      {selectedQuotationId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedQuotationId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <QuotationDetailPage 
              id={selectedQuotationId} 
              onClose={() => setSelectedQuotationId(null)} 
              onEdit={() => {
                const target = quotations.find((q) => q.id === selectedQuotationId);
                setSelectedQuotationId(null);
                setFormEditTarget(target || null);
                setIsFormOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ─── Document Preview Modal ───────────── */}
      {previewAttachment !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={handleClosePreview}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-tight truncate max-w-[60vw]">
                  Preview: {previewAttachment.file_name}
                </h3>
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

      <ConfirmModal open={!!deleteTarget} title="Delete Policy Request"
        message={`Are you sure you want to delete the policy request ${deleteTarget?.quotation_number}?`}
        confirmLabel="Delete" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} />

      {cancellationTarget && (
        <RequestCancellationModal
          quotation={cancellationTarget}
          isOpen={!!cancellationTarget}
          onClose={() => setCancellationTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['quotations'] });
          }}
        />
      )}
    </div>
  );
}
