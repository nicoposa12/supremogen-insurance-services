import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Pencil, Trash2, Filter, Receipt, X } from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getInvoices, deleteInvoice } from '../../services/invoiceApi';
import type { Invoice, InvoiceListParams } from '../../types/AccountingTypes';
import InvoiceFormPage from './InvoiceFormPage';
import InvoiceDetailPage from './InvoiceDetailPage';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  const [params, setParams] = useState<InvoiceListParams>({
    page: 1, per_page: 15, search: querySearch, status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState(querySearch);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);

  // Modal Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Invoice | null>(null);

  // Modal View States
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
    placeholderData: (prev) => prev,
  });

  const pagination = response?.data;
  const invoices = pagination?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('Invoice deleted.');
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

  const statusFilters = ['all', 'draft', 'sent', 'partial', 'paid', 'overdue', 'overpaid', 'cancelled'];

  const columns = [
    {
      key: 'invoice_number', label: 'Invoice No.', sortable: true,
      render: (r: Invoice) => (
        <span className="font-mono text-xs text-blue-600 font-medium">{r.invoice_number}</span>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (r: Invoice) => (
        <div>
          <p className="font-medium text-slate-800">{r.customer?.first_name} {r.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{r.customer?.customer_code}</p>
        </div>
      ),
    },
    {
      key: 'total_amount', label: 'Total', sortable: true,
      render: (r: Invoice) => (
        <span className="font-medium text-slate-800">₱{Number(r.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'balance', label: 'Balance', sortable: true,
      render: (r: Invoice) => {
        const bal = Number(r.balance);
        return (
          <span className={`font-medium ${bal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ₱{bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Invoice) => <StatusBadge status={r.status} />,
    },
    {
      key: 'due_date', label: 'Due Date', sortable: true, className: 'hidden lg:table-cell',
      render: (r: Invoice) => {
        const due = new Date(r.due_date);
        const isOverdue = r.status !== 'paid' && r.status !== 'cancelled' && due < new Date();
        return (
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
            {due.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'actions', label: 'Actions', className: 'text-right',
      render: (r: Invoice) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedInvoiceId(r.id); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View">
            <Eye className="h-4 w-4" />
          </button>
          {!isAdmin && r.status === 'draft' && (
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
          <h1 className="text-xl font-bold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-500">Manage billing and receivables</p>
        </div>
        {!isAdmin && (
          <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
            <Plus className="h-4 w-4" /> New Invoice
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search invoice number, customer..."
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
        {invoices.length === 0 && !isLoading ? (
          <EmptyState icon={<Receipt className="h-10 w-10 text-slate-400" />}
            title="No invoices found" description="Create a new invoice to get started."
            action={
              !isAdmin ? (
                <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl transition cursor-pointer">
                  <Plus className="h-4 w-4" /> New Invoice
                </button>
              ) : undefined
            } />
        ) : (
          <>
            <DataTable columns={columns} data={invoices} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading}
              onRowClick={(r) => setSelectedInvoiceId(r.id)} />
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

      {/* ─── Invoice Form Modal ───────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  {formEditTarget ? `Edit Invoice - ${formEditTarget.invoice_number}` : 'New Invoice'}
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
              <InvoiceFormPage 
                id={formEditTarget?.id} 
                onClose={() => setIsFormOpen(false)} 
                onSuccess={() => { 
                  setIsFormOpen(false); 
                  queryClient.invalidateQueries({ queryKey: ['invoices'] }); 
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice Details Modal ───────────── */}
      {selectedInvoiceId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            <div className="flex-grow overflow-y-auto p-6">
              <InvoiceDetailPage 
                id={selectedInvoiceId} 
                onClose={() => setSelectedInvoiceId(null)} 
                onEdit={() => {
                  const target = invoices.find((inv) => inv.id === selectedInvoiceId);
                  setSelectedInvoiceId(null);
                  setFormEditTarget(target || null);
                  setIsFormOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Invoice"
        message={`Are you sure you want to delete the invoice ${deleteTarget?.invoice_number}?`}
        confirmLabel="Delete" variant="danger" loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
