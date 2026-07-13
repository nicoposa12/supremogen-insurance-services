import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  Search, 
  Filter, 
  X, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  CreditCard, 
  Loader2, 
  Info,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { getInvoices } from '../../services/invoiceApi';
import { recordPayment } from '../../services/paymentApi';
import { getReportSummary } from '../../services/reportApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Invoice, Payment, PaymentMethod, PaymentFormData } from '../../types/AccountingTypes';

export default function CollectionLedgerPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Search & Pagination & Filter States
  const [searchVal, setSearchVal] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Record Collection Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Record Collection Form State
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('cash');
  const [collectDate, setCollectDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [collectReference, setCollectReference] = useState('');
  const [collectNotes, setCollectNotes] = useState('');

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchVal(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Queries
  const { data: reportSummaryRes } = useQuery({
    queryKey: ['report-summary'],
    queryFn: getReportSummary,
  });

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-ledger', page, searchVal, invoiceStatus, perPage],
    queryFn: () => getInvoices({
      page: page,
      per_page: perPage,
      search: searchVal,
      status: invoiceStatus === 'all' ? 'sent,partial,overdue' : invoiceStatus,
      sort_by: 'created_at',
      sort_dir: 'desc'
    }),
    placeholderData: (prev) => prev,
  });

  // Mutation for recording a collection payment
  const recordCollectionMut = useMutation({
    mutationFn: (data: PaymentFormData) => recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      showToast('Payment recorded successfully!', 'success');
      setCollectionModalOpen(false);
      setSelectedInvoice(null);
      resetCollectionForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to record payment.', 'error');
    }
  });

  const resetCollectionForm = () => {
    setCollectAmount('');
    setCollectMethod('cash');
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectReference('');
    setCollectNotes('');
  };

  const handleOpenCollection = (invoice: Invoice, prefilledAmount?: number) => {
    setSelectedInvoice(invoice);
    setCollectAmount(prefilledAmount ? String(prefilledAmount) : String(invoice.balance));
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

    if (amountNum > selectedInvoice.balance) {
      showToast(`Collection amount cannot exceed the balance of ₱${selectedInvoice.balance.toLocaleString()}`, 'error');
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

    recordCollectionMut.mutate(data);
  };

  // Metrics calculation
  const collectionMetrics = useMemo(() => {
    const summary = reportSummaryRes?.data?.collection_summary;
    return {
      totalInvoiced: summary?.total_invoiced ?? 0,
      totalCollected: summary?.total_collected ?? 0,
      outstanding: summary?.outstanding ?? 0,
      collectionRate: summary?.collection_rate ?? 0,
    };
  }, [reportSummaryRes]);

  const currentMonthName = useMemo(() => {
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return monthNames[new Date().getMonth()];
  }, []);
  
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Helper to calculate active due amount for this month
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

  const needsReference = ['check', 'bank_transfer', 'online', 'gcash', 'maya'].includes(collectMethod);

  return (
    <div className="space-y-6 text-slate-700">
      {/* Page Title & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/dashboard/collection" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collection Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Collection Payment Ledger</h1>
          <p className="text-sm text-slate-500">Full visual spreadsheet layout for tracking and managing installment collection schedules</p>
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
              <Clock className="h-5 w-5" />
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

      {/* Main Ledger Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-sm animate-fade-in">
        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by assured name, plate, invoice number..."
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition" 
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
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
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10"
            >
              <option value="all">All Outstanding</option>
              <option value="sent">Sent (Unpaid)</option>
              <option value="partial">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Ledger Grid */}
        {invoicesLoading ? (
          <div className="h-60 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
            <span className="text-sm text-slate-400">Loading payment ledger...</span>
          </div>
        ) : (invoicesRes?.data?.data ?? []).length === 0 ? (
          <EmptyState 
            icon={<Receipt className="h-10 w-10 text-slate-400" />}
            title="No ledger records found" 
            description="Adjust your filters or record collections to display schedules." 
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-medium text-slate-500">
                <thead className="bg-[#4A0E17]/5 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-3 py-3 border-r border-slate-200 min-w-[130px]">Agent</th>
                    <th className="px-3 py-3 border-r border-slate-200 min-w-[110px]">Date Request</th>
                    <th className="px-3 py-3 border-r border-slate-200 min-w-[130px]">Type</th>
                    <th className="px-4 py-3 border-r border-slate-200 min-w-[200px]">Assured Name</th>
                    <th className="px-3 py-3 border-r border-slate-200 min-w-[120px]">Plate Number</th>
                    <th className="px-3 py-3 border-r border-slate-200 min-w-[150px]">Inception Date</th>
                    <th className="px-3 py-3 border-r border-slate-200">Total Premium</th>
                    <th className="px-2 py-3 border-r border-slate-200 text-center">Terms</th>
                    <th className="px-3 py-3 border-r border-slate-200">Amount of Payment</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center min-w-[120px]">1st</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center min-w-[120px]">2nd</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center min-w-[120px]">3rd</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center min-w-[120px]">4th</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center min-w-[120px]">5th</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center min-w-[120px]">6th</th>
                    <th className="px-3 py-3 border-r border-slate-200">Remaining Balance</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-[#4A0E17] font-extrabold bg-[#4A0E17]/10 min-w-[130px]">Due {currentMonthName} {currentYear}</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 bg-white">
                  {(invoicesRes?.data?.data ?? []).map((row: Invoice) => {
                    const customer = row.customer;
                    const terms = Number(customer?.payment_terms || 1);
                    const totalPremium = Number(row.total_amount);
                    const amountPaid = Number(row.amount_paid);
                    const installmentAmount = totalPremium / terms;
                    
                    // Sort payments sequentially by date
                    const payments = [...(row.payments || [])].sort(
                      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
                    );
                    
                    // Generate schedule dates list
                    const inceptionDateStr = customer?.inception_date;
                    let installmentMonths: { monthName: string; year: number; index: number; formattedDate: string }[] = [];
                    if (inceptionDateStr) {
                      const date = new Date(inceptionDateStr);
                      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                      for (let i = 0; i < 6; i++) {
                        const d = new Date(date.getFullYear(), date.getMonth() + i, date.getDate());
                        installmentMonths.push({
                          index: i + 1,
                          monthName: monthNames[d.getMonth()],
                          year: d.getFullYear(),
                          formattedDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        });
                      }
                    }

                    const dueAmount = calculateDueAmount(row);

                    return (
                      <span key={row.id} className="contents">
                        {/* Row 1: Header row / General Details */}
                        <tr className="bg-slate-50/50 hover:bg-slate-100/40 transition-colors font-bold text-slate-800">
                          <td className="px-3 py-3 border-r border-slate-200 text-slate-700">{customer?.agent || '—'}</td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-[11px] text-slate-500">
                            {customer?.writing_date ? new Date(customer.writing_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${
                              customer?.request_type === 'NEW ACCOUNT' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {customer?.request_type || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200 font-black uppercase text-slate-900 tracking-tight">{customer ? `${customer.first_name} ${customer.last_name}` : '—'}</td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-[11px] text-slate-600">{customer?.plate_no || '—'}</td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-[11px] text-slate-500">
                            {customer?.inception_date ? new Date(customer.inception_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono font-extrabold text-slate-700">₱{totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-3 border-r border-slate-200 text-center font-mono font-extrabold text-slate-600">{terms}</td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-slate-650 font-bold">₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          
                          {/* Monthly cells header row */}
                          {[1, 2, 3, 4, 5, 6].map((idx) => {
                            const monthInfo = installmentMonths[idx - 1];
                            const isActive = idx <= terms;
                            return (
                              <td key={idx} className={`px-2 py-3 border-r border-slate-200 text-center text-[10px] font-extrabold bg-[#4A0E17]/5 ${!isActive ? 'bg-slate-100 text-slate-400' : 'text-[#4A0E17]'}`}>
                                {isActive ? `${idx}ST (${monthInfo?.monthName})` : '—'}
                              </td>
                            );
                          })}

                          <td className="px-3 py-3 border-r border-slate-200 font-mono font-black text-[#4A0E17]">₱{Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono font-black text-rose-800 bg-rose-50/40">
                            {dueAmount > 0 ? (
                              <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-extrabold animate-pulse">
                                ₱{dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center" rowSpan={5}>
                            <button
                              onClick={() => handleOpenCollection(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all hover:scale-[1.03] cursor-pointer"
                            >
                              <CreditCard className="h-3 w-3" /> Record
                            </button>
                          </td>
                        </tr>

                        {/* Row 2: schedule of payment */}
                        <tr className="bg-emerald-50/10 text-emerald-800">
                          <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-emerald-50/20 text-[10px] uppercase tracking-wide">automatic</td>
                          <td className="px-4 py-2 border-r border-slate-200 font-bold bg-emerald-50/20">schedule of payment</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-emerald-50/20 text-center font-bold">automatic</td>
                          <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-emerald-50/20 font-bold text-center">Installment Due Dates</td>
                          
                          {[1, 2, 3, 4, 5, 6].map((idx) => {
                            const monthInfo = installmentMonths[idx - 1];
                            const isActive = idx <= terms;
                            return (
                              <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 text-slate-300' : 'text-emerald-950 bg-emerald-50/30'}`}>
                                {isActive ? monthInfo?.formattedDate : '—'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50"></td>
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50"></td>
                        </tr>

                        {/* Row 3: amount of payment */}
                        <tr className="bg-emerald-50/10 text-emerald-800">
                          <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-emerald-50/20 text-[10px] uppercase tracking-wide">automatic</td>
                          <td className="px-4 py-2 border-r border-slate-200 font-bold bg-emerald-50/20">amount of payment</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-emerald-50/20 text-center font-bold">automatic</td>
                          <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-emerald-50/20 font-bold text-center">Target Amount Per Installment</td>
                          
                          {[1, 2, 3, 4, 5, 6].map((idx) => {
                            const isActive = idx <= terms;
                            return (
                              <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-bold ${!isActive ? 'bg-slate-50 text-slate-300' : 'text-emerald-950 bg-emerald-50/30'}`}>
                                {isActive ? `₱${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50"></td>
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50"></td>
                        </tr>

                        {/* Row 4: actual payment date */}
                        <tr className="bg-pink-50/10 text-pink-850">
                          <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-pink-50/20 text-[10px]"></td>
                          <td className="px-4 py-2 border-r border-slate-200 font-bold bg-pink-50/20">actual payment date</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-pink-50/20 text-center"></td>
                          <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-pink-50/20 font-bold text-center text-pink-900">Recorded Dates Collected</td>
                          
                          {[1, 2, 3, 4, 5, 6].map((idx) => {
                            const isActive = idx <= terms;
                            const payment = isActive ? payments[idx - 1] : null;
                            return (
                              <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 text-slate-300' : payment ? 'text-pink-950 bg-pink-50/40 font-bold' : 'text-slate-400'}`}>
                                {payment ? new Date(payment.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 font-bold text-slate-650 font-mono">
                            {row.balance <= 0 ? 'PAID IN FULL' : 'PARTIAL'}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50"></td>
                        </tr>

                        {/* Row 5: actual amount payment */}
                        <tr className="bg-pink-50/10 text-pink-850 border-b-2 border-slate-200">
                          <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-pink-50/20 text-[10px]"></td>
                          <td className="px-4 py-2 border-r border-slate-200 font-bold bg-pink-50/20">actual amount payment</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-pink-50/20 text-center"></td>
                          <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-pink-50/20 font-bold text-center text-pink-900 font-mono">Amount Paid & Method</td>
                          
                          {[1, 2, 3, 4, 5, 6].map((idx) => {
                            const isActive = idx <= terms;
                            const payment = isActive ? payments[idx - 1] : null;
                            return (
                              <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-bold ${!isActive ? 'bg-slate-50 text-slate-300' : payment ? 'text-pink-950 bg-pink-50/40' : 'text-slate-400'}`}>
                                {payment ? (
                                  <div className="flex flex-col items-center">
                                    <span>₱{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <span className="text-[8px] font-extrabold text-pink-700 bg-pink-100/60 px-1 rounded mt-0.5 uppercase tracking-wide">
                                      {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                    </span>
                                  </div>
                                ) : '—'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 font-bold text-emerald-800 font-mono">
                            ₱{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50"></td>
                        </tr>
                      </span>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoicesRes?.data && (
              <Pagination
                currentPage={invoicesRes.data.current_page}
                lastPage={invoicesRes.data.last_page}
                perPage={invoicesRes.data.per_page}
                total={invoicesRes.data.total}
                from={invoicesRes.data.from}
                to={invoicesRes.data.to}
                onPageChange={setPage}
                onPerPageChange={(pp) => {
                  setPerPage(pp);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

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
                  <h3 className="text-lg font-bold text-slate-800">Record Collection Payment</h3>
                  <p className="text-xs text-slate-500">Record collection details for client invoice {selectedInvoice.invoice_number}</p>
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

                      {/* Row 3: Actual Payment Date */}
                      <tr className="bg-pink-50/10">
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-pink-800 bg-pink-50/20 text-left">Actual Payment Date</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${
                              !isActive ? 'bg-slate-50 text-slate-350' : payment ? 'text-pink-950 font-semibold' : 'text-slate-400'
                            }`}>
                              {payment ? new Date(payment.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
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
                              !isActive ? 'bg-slate-50 text-slate-350' : payment ? 'text-pink-950 font-bold' : 'text-slate-400'
                            }`}>
                              {payment ? (
                                <div className="flex flex-col items-center">
                                  <span>₱{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  <span className="text-[9px] font-bold text-pink-700 bg-pink-100/60 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                    {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                  </span>
                                </div>
                              ) : '—'}
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
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Client</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {selectedInvoice.customer?.first_name} {selectedInvoice.customer?.last_name}
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
                      <option value="cash">Cash Collection</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check Payment</option>
                      <option value="online">Online Payment</option>
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
                  <button
                    type="button"
                    onClick={() => setCollectionModalOpen(false)}
                    disabled={recordCollectionMut.isPending}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-2xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordCollectionMut.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-bold rounded-2xl shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {recordCollectionMut.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record Collection</span>
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
