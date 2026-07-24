import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Filter, CreditCard, Ban, X } from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getPayments, voidPayment } from '../../services/paymentApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Payment, PaymentListParams } from '../../types/AccountingTypes';
import PaymentFormPage from './PaymentFormPage';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [params, setParams] = useState<PaymentListParams>({
    page: 1, per_page: 15, search: '', status: 'all', method: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);

  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['payments', params],
    queryFn: () => getPayments(params),
    placeholderData: (prev) => prev,
  });

  const pagination = response?.data;
  const payments = pagination?.data ?? [];

  const voidMut = useMutation({
    mutationFn: (id: number) => voidPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('Payment voided.');
      setVoidTarget(null);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to void.', 'error'),
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

  const statusFilters = ['all', 'completed', 'voided', 'refunded'];
  const methodFilters = [
    'all',
    'walk_in',
    'jt',
    'jrs',
    'cod',
    'bank_transfer_pbcom',
    'bank_transfer_security_bank',
    'post_dated_checks',
    'split_payment'
  ];

  const columns = [
    {
      key: 'payment_number', label: 'Payment No.', sortable: true,
      render: (r: Payment) => (
        <span className="font-mono text-xs text-blue-600 font-medium">{r.payment_number}</span>
      ),
    },
    {
      key: 'invoice', label: 'Invoice',
      render: (r: Payment) => (
        <div>
          <p className="font-mono text-xs text-slate-600">{r.invoice?.invoice_number}</p>
          {r.invoice?.customer && (
            <p className="text-xs text-slate-500">{r.invoice.customer.first_name} {r.invoice.customer.last_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount', label: 'Amount', sortable: true,
      render: (r: Payment) => (
        <span className="font-medium text-emerald-700">₱{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'payment_method', label: 'Method', sortable: true,
      render: (r: Payment) => (
        <span className="text-sm text-slate-600">{PAYMENT_METHOD_LABELS[r.payment_method] ?? r.payment_method}</span>
      ),
    },
    {
      key: 'payment_date', label: 'Date & Time', sortable: true,
      render: (r: Payment) => {
        const d = new Date(r.payment_date || (r as any).created_at);
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
      key: 'reference_number', label: 'Reference', className: 'hidden lg:table-cell',
      render: (r: Payment) => (
        <span className="text-xs text-slate-500 font-mono">{r.reference_number || '—'}</span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Payment) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (r: Payment) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/invoices/${r.invoice_id}`); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View Invoice">
            <Eye className="h-4 w-4" />
          </button>
          {!isAdmin && r.status === 'completed' && (
            <button onClick={(e) => { e.stopPropagation(); setVoidTarget(r); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Void">
              <Ban className="h-4 w-4" />
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
          <h1 className="text-xl font-bold text-slate-800">Payments</h1>
          <p className="text-sm text-slate-500">Track all payment transactions</p>
        </div>
        {!isAdmin && (
          <button onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search payment no., reference, invoice..."
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
                }`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase">Method:</span>
          <div className="flex flex-wrap gap-1">
            {methodFilters.map((m) => (
              <button key={m} onClick={() => setParams((p) => ({ ...p, method: m, page: 1 }))}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  params.method === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{m === 'bank_transfer' ? 'Bank' : m === 'all' ? 'All' : PAYMENT_METHOD_LABELS[m as keyof typeof PAYMENT_METHOD_LABELS] ?? m}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {payments.length === 0 && !isLoading ? (
          <EmptyState icon={<CreditCard className="h-10 w-10 text-slate-400" />}
            title="No payments found" description="Payments will appear here when recorded against invoices."
            action={
              !isAdmin ? (
                <button onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl transition cursor-pointer">
                  <Plus className="h-4 w-4" /> Record Payment
                </button>
              ) : undefined
            } />
        ) : (
          <>
            <DataTable columns={columns} data={payments} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading} />
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

      {/* ─── Payment Form Modal ───────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  Record Payment
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
              <PaymentFormPage 
                onClose={() => setIsFormOpen(false)} 
                onSuccess={() => { 
                  setIsFormOpen(false); 
                  queryClient.invalidateQueries({ queryKey: ['payments'] }); 
                }} 
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!voidTarget} title="Void Payment"
        message={`Void payment ${voidTarget?.payment_number} for ₱${Number(voidTarget?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}? The invoice balance will be updated.`}
        confirmLabel="Void Payment" variant="danger" loading={voidMut.isPending}
        onConfirm={() => voidTarget && voidMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)} />
    </div>
  );
}
