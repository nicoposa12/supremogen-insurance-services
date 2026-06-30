import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getInvoice, createInvoice, updateInvoice } from '../../services/invoiceApi';
import { getCustomers } from '../../services/customerApi';
import { getPolicies } from '../../services/policyApi';
import type { InvoiceFormData, InvoiceItem } from '../../types/AccountingTypes';

interface ItemRow {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

const emptyRow: ItemRow = { description: '', quantity: 1, unit_price: 0, amount: 0 };

export default function InvoiceFormPage({ id: propId, onClose, onSuccess }: { id?: number; onClose?: () => void; onSuccess?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState<number>(0);
  const [policyId, setPolicyId] = useState<number | undefined>();
  const [dueDate, setDueDate] = useState('');
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyRow }]);

  // Fetch customers
  const { data: customersRes } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: () => getCustomers({ per_page: 100 }),
  });
  const customerOptions = customersRes?.data?.data ?? [];

  // Fetch policies for dropdown
  const { data: policiesRes } = useQuery({
    queryKey: ['policies-dropdown', customerId],
    queryFn: () => getPolicies({ per_page: 100, status: 'active' }),
    enabled: true,
  });
  const policyOptions = policiesRes?.data?.data ?? [];

  // Fetch existing for edit
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.data) {
      const inv = existing.data;
      setCustomerId(inv.customer_id);
      setPolicyId(inv.policy_id ?? undefined);
      setDueDate(inv.due_date?.split('T')[0] ?? '');
      setTaxAmount(Number(inv.tax_amount));
      setNotes(inv.notes ?? '');
      if (inv.items && inv.items.length > 0) {
        setItems(inv.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          amount: Number(it.amount),
        })));
      }
    }
  }, [existing]);

  // Pre-fill from query params (e.g. from policy page)
  useEffect(() => {
    const qCustomerId = searchParams.get('customer_id');
    const qPolicyId = searchParams.get('policy_id');
    const qPremium = searchParams.get('premium');
    const qProductName = searchParams.get('product_name');

    if (qCustomerId) setCustomerId(Number(qCustomerId));
    if (qPolicyId) setPolicyId(Number(qPolicyId));
    if (qPremium && qProductName) {
      const premium = Number(qPremium);
      const tax = Math.round(premium * 0.12 * 100) / 100;
      setTaxAmount(tax);
      setItems([{
        description: `Insurance Premium — ${qProductName}`,
        quantity: 1,
        unit_price: premium,
        amount: premium,
      }]);
    }
    if (!dueDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [searchParams]);

  // Item handlers
  const addItem = () => setItems([...items, { ...emptyRow }]);
  const removeItem = (i: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  };
  const updateItem = (i: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[i].amount = Math.round(
        (Number(updated[i].quantity) || 0) * (Number(updated[i].unit_price) || 0) * 100
      ) / 100;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const totalAmount = subtotal + (Number(taxAmount) || 0);

  const createMut = useMutation({
    mutationFn: (data: InvoiceFormData) => createInvoice(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showToast('Invoice created.');
      if (onSuccess) onSuccess();
      else navigate(`/dashboard/invoices/${res.data.id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to create.', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (data: InvoiceFormData) => updateInvoice(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      showToast('Invoice updated.');
      if (onSuccess) onSuccess();
      else navigate(`/dashboard/invoices/${id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to update.', 'error'),
  });

  const handleSave = () => {
    if (!customerId) { showToast('Please select a customer.', 'error'); return; }
    if (!dueDate) { showToast('Please set a due date.', 'error'); return; }
    if (items.some((it) => !it.description)) { showToast('All items need a description.', 'error'); return; }

    const data: InvoiceFormData = {
      customer_id: customerId,
      policy_id: policyId,
      due_date: dueDate,
      tax_amount: taxAmount,
      notes: notes || undefined,
      items: items.map(({ description, quantity, unit_price, amount }) => ({
        description, quantity, unit_price, amount,
      })),
    };

    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const inputClass = 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition';

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {!onClose && (
        <div className="flex items-center gap-4">
          <button onClick={() => onClose ? onClose() : navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
            <p className="text-sm text-slate-500">{isEdit ? 'Update invoice details' : 'Create a new billing invoice'}</p>
          </div>
        </div>
      )}

      {/* Invoice Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Invoice Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))} className={inputClass}>
              <option value={0}>Select a customer...</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.customer_code} — {c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Linked Policy</label>
            <select value={policyId ?? ''} onChange={(e) => setPolicyId(e.target.value ? Number(e.target.value) : undefined)} className={inputClass}>
              <option value="">No linked policy</option>
              {policyOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.policy_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Optional notes..." />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
          <button onClick={addItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-xl">
              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description *</label>
                <input type="text" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Qty</label>
                <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Price</label>
                <input type="number" step="0.01" value={item.unit_price || ''} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
                <input type="number" value={item.amount || ''} readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium" />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeItem(i)} disabled={items.length <= 1}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <div className="flex justify-end gap-8">
            <span className="text-sm text-slate-500">Subtotal</span>
            <span className="text-sm font-medium text-slate-700 w-32 text-right">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-end items-center gap-4">
            <span className="text-sm text-slate-500">Tax</span>
            <input type="number" step="0.01" value={taxAmount || ''} onChange={(e) => setTaxAmount(Number(e.target.value))}
              className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-8 pt-2 border-t border-slate-200">
            <span className="text-base font-semibold text-slate-700">Total</span>
            <span className="text-xl font-bold text-slate-800 w-32 text-right">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={() => onClose ? onClose() : navigate(-1)}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSave} disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-600/20 transition">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Update Invoice' : 'Create Invoice'}
        </button>
      </div>
    </div>
  );
}
