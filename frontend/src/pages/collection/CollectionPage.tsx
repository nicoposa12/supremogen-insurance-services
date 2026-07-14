import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  Search, 
  Filter, 
  X, 
  Receipt, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  CreditCard, 
  Loader2, 
  Info,
  Clock,
  Plus,
  Pencil,
  AlertTriangle,
  Mail
} from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { getInvoices, sendInvoiceReminder } from '../../services/invoiceApi';
import { getPayments, recordPayment, updatePayment } from '../../services/paymentApi';
import { getReportSummary } from '../../services/reportApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Invoice, Payment, PaymentMethod, PaymentFormData } from '../../types/AccountingTypes';

export default function CollectionPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Tab State: 'dashboard' | 'history'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  // Search & Pagination & Filter States
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceSearchInput, setInvoiceSearchInput] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('every');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePerPage, setInvoicePerPage] = useState(10);

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentSearchInput, setPaymentSearchInput] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPerPage, setPaymentPerPage] = useState(10);

  // Record Collection Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Record Collection Form State
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('walk_in');
  const [collectDate, setCollectDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [collectReference, setCollectReference] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setInvoiceSearch(invoiceSearchInput);
      setInvoicePage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [invoiceSearchInput]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPaymentSearch(paymentSearchInput);
      setPaymentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [paymentSearchInput]);

  // Queries
  const { data: reportSummaryRes, isLoading: statsLoading } = useQuery({
    queryKey: ['report-summary'],
    queryFn: getReportSummary,
  });

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-collections', invoicePage, invoiceSearch, invoiceStatus, invoicePerPage],
    queryFn: () => getInvoices({
      page: invoicePage,
      per_page: invoicePerPage,
      search: invoiceSearch,
      status: invoiceStatus === 'all' ? 'sent,partial,overdue' : (invoiceStatus === 'every' ? 'sent,partial,overdue,paid' : invoiceStatus),
      sort_by: 'created_at',
      sort_dir: 'desc'
    }),
    placeholderData: (prev) => prev,
  });

  const { data: paymentsRes, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments-collections', paymentPage, paymentSearch, paymentStatus, paymentPerPage],
    queryFn: () => getPayments({
      page: paymentPage,
      per_page: paymentPerPage,
      search: paymentSearch,
      status: paymentStatus,
      sort_by: 'created_at',
      sort_dir: 'desc'
    }),
    placeholderData: (prev) => prev,
  });
  // Mutation for recording a collection payment
  const recordCollectionMut = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-collections'] });
      queryClient.invalidateQueries({ queryKey: ['payments-collections'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      showToast('Collection payment recorded successfully!', 'success');
      setCollectionModalOpen(false);
      setSelectedInvoice(null);
      resetCollectionForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to record collection.', 'error');
    }
  });

  // Mutation for updating a collection payment
  const updateCollectionMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentFormData }) => updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-collections'] });
      queryClient.invalidateQueries({ queryKey: ['payments-collections'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      showToast('Collection payment updated successfully!', 'success');
      setCollectionModalOpen(false);
      setSelectedInvoice(null);
      resetCollectionForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to update collection.', 'error');
    }
  });

  // State to track which invoice reminder is sending
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);

  // Mutation for sending a payment reminder email
  const sendReminderMut = useMutation({
    mutationFn: (invoiceId: number) => {
      setSendingReminderId(invoiceId);
      return sendInvoiceReminder(invoiceId);
    },
    onSuccess: (res: any) => {
      showToast(res.message || 'Payment reminder sent successfully!', 'success');
      setSendingReminderId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to send payment reminder email.', 'error');
      setSendingReminderId(null);
    }
  });

  const resetCollectionForm = () => {
    setCollectAmount('');
    setCollectMethod('walk_in');
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectReference('');
    setCollectNotes('');
    setEditingPaymentId(null);
  };

  const handleOpenCollection = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCollectAmount(String(invoice.balance));
    setCollectionModalOpen(true);
  };

  const handleRecordCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }

    const currentPayment = selectedInvoice.payments?.find(p => p.id === editingPaymentId);
    const maxAllowed = selectedInvoice.balance + (currentPayment ? Number(currentPayment.amount) : 0);
    if (amountNum > maxAllowed) {
      showToast(`Collection amount cannot exceed the invoice balance of ₱${maxAllowed.toLocaleString()}`, 'error');
      return;
    }

    const data: PaymentFormData = {
      invoice_id: selectedInvoice.id,
      amount: amountNum,
      payment_method: collectMethod,
      payment_date: collectDate,
      reference_number: collectReference || undefined,
      notes: collectNotes || undefined,
    };

    if (editingPaymentId !== null) {
      updateCollectionMut.mutate({ id: editingPaymentId, data });
    } else {
      recordCollectionMut.mutate(data);
    }
  };

  const currentMonthName = useMemo(() => {
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return monthNames[new Date().getMonth()];
  }, []);
  
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const calculateDueAmount = (invoice: Invoice) => {
    const terms = Number(invoice.customer?.payment_terms || 1);
    const totalAmount = Number(invoice.total_amount);
    const amountPaid = Number(invoice.amount_paid);
    const installmentAmount = totalAmount / terms;
    const inceptionDateStr = invoice.customer?.inception_date;
    if (!inceptionDateStr) return 0;
    
    const inceptionDate = new Date(inceptionDateStr);
    if (isNaN(inceptionDate.getTime())) return 0;

    const today = new Date();
    const currentYr = today.getFullYear();
    const currentMth = today.getMonth();

    let currentInstallmentIndex = -1;
    for (let i = 0; i < terms; i++) {
      const targetDate = new Date(inceptionDate.getFullYear(), inceptionDate.getMonth() + i, 1);
      if (targetDate.getFullYear() === currentYr && targetDate.getMonth() === currentMth) {
        currentInstallmentIndex = i + 1;
        break;
      }
    }

    const firstInstDate = new Date(inceptionDate.getFullYear(), inceptionDate.getMonth(), 1);
    if (today < firstInstDate) {
      currentInstallmentIndex = 1;
    }

    if (currentInstallmentIndex === -1) {
      return 0;
    }

    const paidCount = Math.floor(amountPaid / installmentAmount);

    if (currentInstallmentIndex > paidCount) {
      return installmentAmount;
    }

    return 0;
  };

  // Metrics calculation from report summary
  const collectionMetrics = useMemo(() => {
    const summary = reportSummaryRes?.data?.collection_summary;
    return {
      totalInvoiced: summary?.total_invoiced ?? 0,
      totalCollected: summary?.total_collected ?? 0,
      outstanding: summary?.outstanding ?? 0,
      collectionRate: summary?.collection_rate ?? 0,
    };
  }, [reportSummaryRes]);

  // Invoice Columns
  const invoiceColumns = [
    {
      key: 'invoice_number',
      label: 'Invoice No.',
      render: (r: Invoice) => (
        <span className="font-mono text-xs text-blue-600 font-semibold">{r.invoice_number}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer Details',
      render: (r: Invoice) => (
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">{r.customer ? `${r.customer.first_name} ${r.customer.last_name}` : '—'}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span className="font-mono">{r.customer?.customer_code}</span>
            {r.customer?.request_type && (
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                r.customer.request_type === 'NEW ACCOUNT'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-orange-50 text-orange-700 border border-orange-100'
              }`}>
                {r.customer.request_type}
              </span>
            )}
          </div>
          {r.customer && (
            <div className="text-[10px] text-slate-500 font-normal leading-tight">
              <p>{r.customer.mobile || r.customer.phone || 'No contact'}</p>
              <p className="truncate max-w-[180px]">{r.customer.email || 'No email'}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'agent',
      label: 'Agent',
      render: (r: Invoice) => (
        <span className="font-medium text-slate-700">{r.customer?.agent || '—'}</span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Amount Invoiced',
      render: (r: Invoice) => (
        <span className="font-medium text-slate-700">₱{Number(r.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance Due',
      render: (r: Invoice) => (
        <span className="font-bold text-[#4A0E17]">₱{Number(r.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (r: Invoice) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(r.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: Invoice) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Action',
      render: (r: Invoice) => (
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <button
            onClick={() => handleOpenCollection(r)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-lg shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
          >
            <CreditCard className="h-3 w-3" /> Record
          </button>
          {r.balance > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                sendReminderMut.mutate(r.id);
              }}
              disabled={!r.customer?.email || sendingReminderId === r.id}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-semibold rounded-lg shadow-sm transition-all hover:scale-[1.02] cursor-pointer ${
                !r.customer?.email
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-transparent'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
              title={!r.customer?.email ? 'No email registered for client' : 'Send payment reminder email to client'}
            >
              {sendingReminderId === r.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              <span>Reminder</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  // Payment Columns
  const paymentColumns = [
    {
      key: 'payment_number',
      label: 'Receipt No.',
      render: (r: Payment) => (
        <span className="font-mono text-xs text-blue-600 font-semibold">{r.payment_number}</span>
      ),
    },
    {
      key: 'invoice_number',
      label: 'Invoice Ref',
      render: (r: Payment) => (
        <span className="font-mono text-xs text-slate-500">{r.invoice?.invoice_number}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Collected From',
      render: (r: Payment) => (
        <div>
          <p className="font-medium text-slate-800">
            {r.invoice?.customer ? `${r.invoice.customer.first_name} ${r.invoice.customer.last_name}` : 'Unknown Customer'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount Collected',
      render: (r: Payment) => (
        <span className="font-bold text-emerald-700">₱{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (r: Payment) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          {PAYMENT_METHOD_LABELS[r.payment_method] ?? r.payment_method}
        </span>
      ),
    },
    {
      key: 'payment_date',
      label: 'Date Collected',
      render: (r: Payment) => (
        <span className="text-xs text-slate-600 font-medium">{new Date(r.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      ),
    },
    {
      key: 'reference_number',
      label: 'Ref No.',
      render: (r: Payment) => (
        <span className="font-mono text-xs text-slate-500 font-semibold">{r.reference_number || '--'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: Payment) => <StatusBadge status={r.status} />,
    },
  ];

  const needsReference = ['bank_transfer_pbcom', 'bank_transfer_security_bank', 'post_dated_checks', 'split_payment'].includes(collectMethod);

  return (
    <div className="space-y-6 text-slate-700">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Collection Module</h1>
          <p className="text-sm text-slate-500">Track company billings, manage accounts receivables, and record customer collections</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'dashboard' 
                ? 'bg-[#4A0E17] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Billing & Receivables
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'history' 
                ? 'bg-[#4A0E17] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Collection History
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-blue-50/30 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Billings</span>
              <p className="text-2xl font-black text-slate-800">
                ₱{collectionMetrics.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="h-3.5 w-3.5" />
            <span>Accumulated amount billed</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-emerald-50/30 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Collected</span>
              <p className="text-2xl font-black text-emerald-800">
                ₱{collectionMetrics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600 font-semibold">Collections active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-red-50/30 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Outstanding</span>
              <p className="text-2xl font-black text-red-800">
                ₱{collectionMetrics.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
            <span className="text-rose-600 font-semibold">Pending collections</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-cyan-50/30 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collection Rate</span>
              <p className="text-2xl font-black text-cyan-800">
                {collectionMetrics.collectionRate}%
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionMetrics.collectionRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-4">
          {/* Billing & Receivables Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search invoice number, client details..."
                  value={invoiceSearchInput} 
                  onChange={(e) => setInvoiceSearchInput(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition" 
                />
                {invoiceSearchInput && (
                  <button 
                    onClick={() => setInvoiceSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                <select
                  value={invoiceStatus}
                  onChange={(e) => {
                    setInvoiceStatus(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10"
                >
                  <option value="every">All Invoices</option>
                  <option value="all">All Outstanding</option>
                  <option value="sent">Sent (Unpaid)</option>
                  <option value="partial">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {invoicesLoading ? (
              <div className="h-60 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
                <span className="text-sm text-slate-400">Loading pending invoices...</span>
              </div>
            ) : (invoicesRes?.data?.data ?? []).length === 0 ? (
              <EmptyState 
                icon={<Receipt className="h-10 w-10 text-slate-400" />}
                title="No pending collections" 
                description="All client invoice payments are currently fully paid or cancelled." 
              />
            ) : (
              <>
                <DataTable 
                  columns={invoiceColumns} 
                  data={invoicesRes?.data?.data ?? []} 
                  loading={invoicesLoading}
                />
                {invoicesRes?.data && (
                  <Pagination
                    currentPage={invoicesRes.data.current_page}
                    lastPage={invoicesRes.data.last_page}
                    perPage={invoicesRes.data.per_page}
                    total={invoicesRes.data.total}
                    from={invoicesRes.data.from}
                    to={invoicesRes.data.to}
                    onPageChange={setInvoicePage}
                    onPerPageChange={(pp) => {
                      setInvoicePerPage(pp);
                      setInvoicePage(1);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Collection Receipts History */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search receipt no., invoice ref, client..."
                  value={paymentSearchInput} 
                  onChange={(e) => setPaymentSearchInput(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition" 
                />
                {paymentSearchInput && (
                  <button 
                    onClick={() => setPaymentSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt Status:</span>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    setPaymentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10"
                >
                  <option value="all">All Receipts</option>
                  <option value="completed">Completed Collections</option>
                  <option value="voided">Voided Collections</option>
                </select>
              </div>
            </div>

            {paymentsLoading ? (
              <div className="h-60 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
                <span className="text-sm text-slate-400">Loading collection logs...</span>
              </div>
            ) : (paymentsRes?.data?.data ?? []).length === 0 ? (
              <EmptyState 
                icon={<Receipt className="h-10 w-10 text-slate-400" />}
                title="No collection history" 
                description="No payment collections have been recorded yet." 
              />
            ) : (
              <>
                <DataTable 
                  columns={paymentColumns} 
                  data={paymentsRes?.data?.data ?? []} 
                  loading={paymentsLoading}
                />
                {paymentsRes?.data && (
                  <Pagination
                    currentPage={paymentsRes.data.current_page}
                    lastPage={paymentsRes.data.last_page}
                    perPage={paymentsRes.data.per_page}
                    total={paymentsRes.data.total}
                    from={paymentsRes.data.from}
                    to={paymentsRes.data.to}
                    onPageChange={setPaymentPage}
                    onPerPageChange={(pp) => {
                      setPaymentPerPage(pp);
                      setPaymentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Record Collection Modal */}
      {collectionModalOpen && selectedInvoice && (() => {
        const customer = selectedInvoice.customer;
        const terms = Number(customer?.payment_terms || 1);
        const totalPremium = Number(selectedInvoice.total_amount);
        const installmentAmount = totalPremium / terms;
        const inceptionDateStr = customer?.inception_date;
        
        // Sort payments sequentially by date
        const payments = [...(selectedInvoice.payments || [])].sort(
          (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
        );

        const getExpectedDateStr = (idx: number) => {
          if (!inceptionDateStr) return '—';
          const date = new Date(inceptionDateStr);
          if (isNaN(date.getTime())) return '—';
          const d = new Date(date.getFullYear(), date.getMonth() + idx - 1, date.getDate());
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        };

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setCollectionModalOpen(false)}
            />

            {/* Form Modal Body */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 border border-slate-100 animate-scale-in max-h-[95vh] overflow-y-auto">
              <button
                onClick={() => setCollectionModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{editingPaymentId ? 'Edit Collection Payment' : 'Record Collection Payment'}</h3>
                  <p className="text-xs text-slate-500">{editingPaymentId ? 'Modify recorded details for client invoice' : 'Record collection details for client invoice'} {selectedInvoice.invoice_number}</p>
                </div>
              </div>

              {/* Installment Ledger Section */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Schedule Ledger</span>
                  <span className="text-[10px] font-extrabold text-[#4A0E17] bg-[#4A0E17]/5 px-2.5 py-0.5 rounded-full border border-[#4A0E17]/20 uppercase">
                    {terms} Month Terms
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-[11px] font-medium text-slate-600">
                    <thead className="bg-slate-100/80 text-[10px] font-bold text-slate-700 uppercase">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-200 bg-slate-50 text-slate-500 font-bold min-w-[140px] text-left">LEDGER DETAIL</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center">1st Installment</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center">2nd Installment</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center">3rd Installment</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center">4th Installment</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center">5th Installment</th>
                        <th className="px-2 py-2 border-r border-slate-200 text-center">6th Installment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {/* Row 1: Schedule of Payment (Expected Dates) */}
                      <tr className="bg-emerald-50/10">
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/20 text-left">Schedule of Payment</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${
                              !isActive ? 'bg-slate-50 text-slate-350' : 'text-emerald-950 font-semibold'
                            }`}>
                              {isActive ? getExpectedDateStr(idx) : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 2: Amount of Payment (Expected Amounts) */}
                      <tr className="bg-emerald-50/10">
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/20 text-left">Amount of Payment</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${
                              !isActive ? 'bg-slate-50 text-slate-350' : 'text-emerald-950 font-bold'
                            }`}>
                              {isActive ? `₱${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-pink-50/10">
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-pink-800 bg-pink-50/20 text-left">Actual Payment Date</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${
                              !isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-400'
                            }`}>
                              {payment ? (
                                new Date(payment.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                              ) : isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollectAmount(String(installmentAmount.toFixed(2)));
                                    setCollectNotes(`${idx}${idx === 1 ? 'st' : idx === 2 ? 'nd' : idx === 3 ? 'rd' : 'th'} Installment payment`);
                                    const inputEl = document.getElementById('collection-form-amount');
                                    if (inputEl) {
                                      inputEl.scrollIntoView({ behavior: 'smooth' });
                                      inputEl.focus();
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-55 hover:bg-emerald-100 border border-emerald-200 text-[#4A0E17] text-[9px] font-bold rounded transition cursor-pointer"
                                  title={`Record ${idx}${idx === 1 ? 'st' : idx === 2 ? 'nd' : idx === 3 ? 'rd' : 'th'} installment`}
                                >
                                  <CreditCard className="h-2.5 w-2.5" /> Record
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 4: Actual Amount / Method */}
                      <tr className="bg-pink-50/10">
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-pink-800 bg-pink-50/20 text-left">Actual Amount & Method</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${
                              !isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-450'
                            }`}>
                              {payment ? (
                                <div className="flex flex-col items-center group relative">
                                  <span>₱{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  <span className="text-[9px] font-bold text-pink-700 bg-pink-100/60 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                    {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCollectAmount(String(payment.amount));
                                      setCollectMethod(payment.payment_method);
                                      setCollectDate(payment.payment_date);
                                      setCollectReference(payment.reference_number || '');
                                      setCollectNotes(payment.notes || '');
                                      setEditingPaymentId(payment.id);
                                      const inputEl = document.getElementById('collection-form-amount');
                                      if (inputEl) {
                                        inputEl.scrollIntoView({ behavior: 'smooth' });
                                        inputEl.focus();
                                      }
                                    }}
                                    className="absolute -top-1 -right-2 p-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                    title="Edit this payment"
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollectAmount(String(installmentAmount.toFixed(2)));
                                    setCollectNotes(`${idx}${idx === 1 ? 'st' : idx === 2 ? 'nd' : idx === 3 ? 'rd' : 'th'} Installment payment`);
                                    const inputEl = document.getElementById('collection-form-amount');
                                    if (inputEl) {
                                      inputEl.scrollIntoView({ behavior: 'smooth' });
                                      inputEl.focus();
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-55 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded transition cursor-pointer"
                                  title={`Record ${idx}${idx === 1 ? 'st' : idx === 2 ? 'nd' : idx === 3 ? 'rd' : 'th'} installment`}
                                >
                                  <Plus className="h-2.5 w-2.5" /> Record
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <form onSubmit={handleRecordCollection} className="space-y-4">
                 {/* Selected Invoice Details Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Client</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {selectedInvoice.customer?.first_name} {selectedInvoice.customer?.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Contact Number</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.customer?.mobile || selectedInvoice.customer?.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email Address</span>
                    <span className="font-bold text-slate-800 truncate block" title={selectedInvoice.customer?.email || undefined}>
                      {selectedInvoice.customer?.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Invoiced</span>
                    <span className="font-bold text-slate-800">₱{selectedInvoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Due Date</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedInvoice.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Outstanding Balance</span>
                    <span className="font-bold text-[#4A0E17]">₱{selectedInvoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Form Input fields */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Collection Amount (₱) *
                  </label>
                  <input 
                    id="collection-form-amount"
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="Enter amount collected..."
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Payment Method *
                    </label>
                    <select
                      value={collectMethod}
                      onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
                    >
                      {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Date Collected *
                    </label>
                    <input 
                      type="date" 
                      required
                      value={collectDate}
                      onChange={(e) => setCollectDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Reference Number {needsReference ? '*' : '(Optional)'}
                  </label>
                  <input 
                    type="text" 
                    required={needsReference}
                    placeholder={needsReference ? "Enter transaction reference code..." : "e.g. check no., deposit slip id..."}
                    value={collectReference}
                    onChange={(e) => setCollectReference(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Collection Notes
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Record additional payment notes..."
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
                  {editingPaymentId && (
                    <button
                      type="button"
                      onClick={() => resetCollectionForm()}
                      className="px-5 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-2xl transition cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={recordCollectionMut.isPending || updateCollectionMut.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-bold rounded-2xl shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {recordCollectionMut.isPending || updateCollectionMut.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{editingPaymentId ? 'Updating...' : 'Recording...'}</span>
                      </>
                    ) : (
                      <span>{editingPaymentId ? 'Update Payment' : 'Record Collection'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
