import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Send, Ban, CreditCard,
  Loader2, User, DollarSign, Calendar, Receipt, Link2, X
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import AttachmentPanel from '../../components/ui/AttachmentPanel';
import { getInvoice, sendInvoice, cancelInvoice } from '../../services/invoiceApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import PaymentFormPage from '../payments/PaymentFormPage';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function InvoiceDetailPage({ id: propId, onClose, onEdit }: { id?: number; onClose?: () => void; onEdit?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [showCancel, setShowCancel] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(Number(id)),
    enabled: !!id,
  });
  const invoice = response?.data;

  const sendMut = useMutation({
    mutationFn: () => sendInvoice(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('Invoice sent.');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to send.', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelInvoice(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('Invoice cancelled.');
      setShowCancel(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to cancel.', 'error'),
  });

  if (isLoading || !invoice) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date(invoice.due_date) < new Date();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => onClose ? onClose() : navigate('/dashboard/invoices')} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} size="md" />
            {isOverdue && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">OVERDUE</span>}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Created {new Date(invoice.created_at).toLocaleDateString()}
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <>
                <button onClick={() => onEdit ? onEdit() : navigate(`/dashboard/invoices/${id}/edit`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-600/20 transition">
                  <Send className="h-4 w-4" /> Send Invoice
                </button>
              </>
            )}
            {['sent', 'partial', 'overdue'].includes(invoice.status) && (
              <button onClick={() => setIsPaymentOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition cursor-pointer">
                <CreditCard className="h-4 w-4" /> Record Payment
              </button>
            )}
            {!['paid', 'cancelled'].includes(invoice.status) && (
              <button onClick={() => setShowCancel(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition">
                <Ban className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-xl"><User className="h-5 w-5 text-blue-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Customer</p>
          </div>
          <p className="text-sm font-medium text-slate-800">{invoice.customer?.first_name} {invoice.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{invoice.customer?.customer_code}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Amount</p>
          </div>
          <p className="text-xl font-bold text-slate-800">₱{Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-xl"><Receipt className="h-5 w-5 text-amber-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Balance</p>
          </div>
          <p className={`text-xl font-bold ${Number(invoice.balance) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ₱{Number(invoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-50 rounded-xl"><Calendar className="h-5 w-5 text-violet-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Due Date</p>
          </div>
          <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
            {new Date(invoice.due_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Line Items</h3>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={item.id ?? i} className="border-b border-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-700">₱{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-800">₱{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td colSpan={3} className="px-6 py-2 text-right text-sm text-slate-500">Subtotal</td>
                <td className="px-6 py-2 text-right font-medium text-slate-700">₱{Number(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td colSpan={3} className="px-6 py-2 text-right text-sm text-slate-500">Tax</td>
                <td className="px-6 py-2 text-right font-medium text-slate-700">₱{Number(invoice.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-slate-600">Total</td>
                <td className="px-6 py-3 text-right text-lg font-bold text-slate-800">₱{Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Payment History</h3>
          <div className="space-y-3">
            {invoice.payments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{pay.payment_number}</p>
                    <p className="text-xs text-slate-500">
                      {PAYMENT_METHOD_LABELS[pay.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? pay.payment_method}
                      {pay.reference_number && ` · Ref: ${pay.reference_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-700">₱{Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(pay.payment_date).toLocaleDateString()}</span>
                    <StatusBadge status={pay.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm text-slate-500">Amount Paid</span>
            <span className="text-lg font-bold text-emerald-700">₱{Number(invoice.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Linked Policy + Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invoice.policy && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Linked Policy</h3>
            <button onClick={() => navigate(`/dashboard/policies/${invoice.policy?.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition">
              <Link2 className="h-4 w-4" /> {invoice.policy.policy_number}
            </button>
          </div>
        )}
        {invoice.notes && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Notes</h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <AttachmentPanel type="invoice" id={invoice.id} />

      {/* Footer Info */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {typeof invoice.created_by === 'object' && invoice.created_by && (
          <span>Created by: <span className="text-slate-600">{invoice.created_by.name}</span></span>
        )}
        <span>Created: <span className="text-slate-600">{new Date(invoice.created_at).toLocaleString()}</span></span>
      </div>

      {/* Cancel Modal */}
      <ConfirmModal open={showCancel} title="Cancel Invoice"
        message={`Cancel invoice ${invoice.invoice_number}? This cannot be undone.`}
        confirmLabel="Cancel Invoice" variant="danger" loading={cancelMut.isPending}
        onConfirm={() => cancelMut.mutate()} onCancel={() => setShowCancel(false)} />

      {/* ─── Record Payment Modal ───────────── */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  Record Payment — {invoice.invoice_number}
                </h3>
              </div>
              <button 
                onClick={() => setIsPaymentOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <PaymentFormPage 
                invoiceId={invoice.id}
                balance={Number(invoice.balance)}
                onClose={() => setIsPaymentOpen(false)} 
                onSuccess={() => { 
                  setIsPaymentOpen(false); 
                  queryClient.invalidateQueries({ queryKey: ['invoice', id] }); 
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
