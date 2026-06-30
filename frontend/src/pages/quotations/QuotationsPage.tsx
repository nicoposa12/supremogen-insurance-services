import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Pencil, Trash2, Filter, FileText, X } from 'lucide-react';

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
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');
  const canEdit = roles.includes('Sales Agent');

  const [params, setParams] = useState<QuotationListParams>({
    page: 1, per_page: 15, search: '', status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);

  // Modal Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Quotation | null>(null);

  // Modal View States
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['quotations', params],
    queryFn: () => getQuotations(params),
    placeholderData: (prev) => prev,
  });

  const pagination = response?.data;
  const quotations = pagination?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast('Quotation deleted successfully.');
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

  const statusFilters = ['all', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired'];

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
          <p className="font-medium text-slate-800">
            {r.customer?.first_name} {r.customer?.last_name}
          </p>
          <p className="text-xs text-slate-500">{r.customer?.customer_code}</p>
        </div>
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
      key: 'valid_until', label: 'Valid Until', sortable: true,
      className: 'hidden lg:table-cell',
      render: (r: Quotation) => (
        <span className="text-xs text-slate-500">
          {r.valid_until ? new Date(r.valid_until).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      className: 'hidden md:table-cell',
      render: (r: Quotation) => (
        <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions', label: 'Actions', className: 'text-right',
      render: (r: Quotation) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedQuotationId(r.id); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View">
            <Eye className="h-4 w-4" />
          </button>
          {canEdit && r.status === 'draft' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setFormEditTarget(r); setIsFormOpen(true); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition" title="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quotations</h1>
          <p className="text-sm text-slate-500">Manage insurance quotations and approvals</p>
        </div>
        {canEdit && (
          <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
            <Plus className="h-4 w-4" /> New Quotation
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search quotation number, customer..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase">Status:</span>
          <div className="flex flex-wrap gap-1">
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setParams((p) => ({ ...p, status: s, page: 1 }))}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  params.status === s ? 'bg-[#4A0E17] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {quotations.length === 0 && !isLoading ? (
          <EmptyState icon={<FileText className="h-10 w-10 text-slate-400" />}
            title="No quotations found" description="Create a new quotation to get started."
            action={
              canEdit ? (
                <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl transition cursor-pointer">
                  <Plus className="h-4 w-4" /> New Quotation
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
                  {formEditTarget ? `Edit Quotation - ${formEditTarget.quotation_number}` : 'New Quotation'}
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
            <div className="flex-1 overflow-y-auto p-6">
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
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex-grow overflow-y-auto p-6">
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
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Quotation"
        message={`Are you sure you want to delete the quotation ${deleteTarget?.quotation_number}?`}
        confirmLabel="Delete" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
