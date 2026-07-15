import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Loader2, Paperclip } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getInvoices } from '../../services/invoiceApi';
import { recordPayment } from '../../services/paymentApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { PaymentFormData, PaymentMethod } from '../../types/AccountingTypes';

export default function PaymentFormPage({ invoiceId: propInvoiceId, balance: propBalance, onClose, onSuccess }: { invoiceId?: number; balance?: number; onClose?: () => void; onSuccess?: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [invoiceId, setInvoiceId] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('walk_in');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  // Pre-fill from query params or props
  useEffect(() => {
    if (propInvoiceId) {
      setInvoiceId(propInvoiceId);
      if (propBalance !== undefined) setAmount(propBalance);
    } else {
      const qInvoiceId = searchParams.get('invoice_id');
      const qBalance = searchParams.get('balance');
      if (qInvoiceId) setInvoiceId(Number(qInvoiceId));
      if (qBalance) setAmount(Number(qBalance));
    }
  }, [searchParams, propInvoiceId, propBalance]);

  // Fetch invoices for dropdown (only unpaid/partial)
  const { data: invoicesRes } = useQuery({
    queryKey: ['invoices-payable'],
    queryFn: () => getInvoices({ per_page: 100 }),
  });
  const invoiceOptions = (invoicesRes?.data?.data ?? []).filter(
    (inv) => ['sent', 'partial', 'overdue'].includes(inv.status)
  );

  const selectedInvoice = invoiceOptions.find((inv) => inv.id === invoiceId);

  const recordMut = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('Payment recorded successfully!');
      if (onSuccess) onSuccess();
      else navigate('/dashboard/payments');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to record payment.', 'error'),
  });

  const handleSubmit = () => {
    if (!invoiceId) { showToast('Please select an invoice.', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Please enter a valid amount.', 'error'); return; }
    if (!paymentDate) { showToast('Please set a payment date.', 'error'); return; }

    const data: PaymentFormData = {
      invoice_id: invoiceId,
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      reference_number: referenceNumber || undefined,
      notes: notes || undefined,
      proof: proof || undefined,
    };

    recordMut.mutate(data);
  };

  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition';

  const needsReference = ['bank_transfer_pbcom', 'bank_transfer_security_bank', 'post_dated_checks', 'split_payment'].includes(paymentMethod);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!onClose && (
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Record Payment</h1>
            <p className="text-sm text-slate-500">Record a payment against an invoice</p>
          </div>
        </div>
      )}

      {/* Invoice Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Invoice</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Invoice *</label>
          <select value={invoiceId} onChange={(e) => {
            const id = Number(e.target.value);
            setInvoiceId(id);
            const inv = invoiceOptions.find((i) => i.id === id);
            if (inv) setAmount(Number(inv.balance));
          }} className={inputClass}>
            <option value={0}>Choose an invoice...</option>
            {invoiceOptions.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {inv.customer?.first_name} {inv.customer?.last_name} — Balance: ₱{Number(inv.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>

        {selectedInvoice && (
          <div className="bg-blue-50 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">Invoice</p>
              <p className="text-blue-800 font-medium">{selectedInvoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">Total</p>
              <p className="text-blue-800 font-medium">₱{Number(selectedInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">Balance</p>
              <p className="text-blue-800 font-bold">₱{Number(selectedInvoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount *</label>
            <input type="number" step="0.01" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))}
              className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Date *</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Method *</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setPaymentMethod(key)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center transition ${
                    paymentMethod === key
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {needsReference && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {paymentMethod === 'post_dated_checks' ? 'Check Number' : 'Reference / Transaction ID'}
              </label>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
                className={inputClass} placeholder={paymentMethod === 'post_dated_checks' ? 'Enter check number...' : 'Enter reference number...'} />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="Optional payment notes..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Proof of Payment (Optional)</label>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setProof(e.target.files[0]);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-250"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={() => onClose ? onClose() : navigate(-1)}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSubmit} disabled={recordMut.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-600/20 transition">
          {recordMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Record Payment
        </button>
      </div>
    </div>
  );
}
