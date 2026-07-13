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
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { getInvoices } from '../../services/invoiceApi';
import { recordPayment, updatePayment } from '../../services/paymentApi';
import { getReportSummary } from '../../services/reportApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Invoice, Payment, PaymentMethod, PaymentFormData } from '../../types/AccountingTypes';
import supremogenLogo from '../../assets/image/Picture1.png';
import supremogenFooter from '../../assets/image/Picture2.png';

export default function CollectionLedgerPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Search & Pagination & Filter States
  const [searchVal, setSearchVal] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('every');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Record Collection Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Expanded rows state
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<number, boolean>>({});

  const toggleExpand = (invoiceId: number) => {
    setExpandedInvoiceIds(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  // Generate Receipt
  const generateReceipt = (invoice: Invoice) => {
    const customer = invoice.customer;
    const terms = Number(customer?.payment_terms || 1);
    const totalPremium = Number(invoice.total_amount);
    const installmentAmt = totalPremium / terms;
    const payments = [...(invoice.payments || [])].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );
    const inceptionDateStr = customer?.inception_date;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Build schedule rows
    let scheduleRows = '';
    for (let i = 0; i < terms; i++) {
      const dueDate = inceptionDateStr
        ? new Date(new Date(inceptionDateStr).getFullYear(), new Date(inceptionDateStr).getMonth() + i, new Date(inceptionDateStr).getDate())
        : null;
      const dueDateStr = dueDate ? `${monthNames[dueDate.getMonth()]} ${dueDate.getDate()}, ${dueDate.getFullYear()}` : '—';
      const payment = payments[i];
      const remarks = payment ? (PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method).toUpperCase() : '';
      const suffix = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
      scheduleRows += `<tr>
        <td style="border: 1px solid #000; padding: 4px; color: #8B0000; font-weight: bold; font-size: 11px;">${suffix}</td>
        <td style="border: 1px solid #000; padding: 4px; font-size: 11px;">${dueDateStr}</td>
        <td style="border: 1px solid #000; padding: 4px; font-size: 11px;">${installmentAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 4px; font-weight: bold; font-size: 11px;">${remarks}</td>
      </tr>`;
    }

    const assuredName = customer ? `${customer.first_name} ${customer.last_name}`.toUpperCase() : '—';
    const mortgageText = customer?.mortgage ? ` LEASED TO ${customer.mortgage.toUpperCase()}` : '';
    const policyNo = invoice.policy?.policy_number || customer?.policy_no || '—';
    const unit = customer?.unit || '—';
    const plateNo = customer?.plate_no || '—';
    const inceptionDateDisplay = inceptionDateStr
      ? new Date(inceptionDateStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
      : '—';
    const receiverName = customer?.receiver_name || assuredName;
    const deliveryAddress = customer?.delivery_address || '—';
    const landmark = customer?.landmark || 'N/A';
    const contactNumber = customer?.mobile || customer?.phone || '—';
    const backupPhone = customer?.backup_phone || contactNumber;
    const agentName = customer?.agent || '—';

    // Format top right block
    const firstPayment = payments[0];
    const refDate = firstPayment ? new Date(firstPayment.payment_date) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const receiptDate = `${refDate.getMonth() + 1}${pad(refDate.getDate())}${refDate.getFullYear()}`;
    const paymentMethodLabel = firstPayment 
      ? (PAYMENT_METHOD_LABELS[firstPayment.payment_method] || firstPayment.payment_method).toUpperCase()
      : 'WALK IN';

    const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Acknowledgement Receipt - ${assuredName}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }
      @page {
        size: letter;
        margin: 0.4in;
      }
      .receipt-border {
        border: 1.5px solid #000 !important;
        margin: 0 !important;
        width: 7.7in !important;
        height: 10.2in !important;
        box-sizing: border-box !important;
      }
    }
    body {
      font-family: 'Arial', sans-serif;
      color: #000;
      margin: 0 auto;
      padding: 0;
      background-color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-border {
      border: 1.5px solid #000;
      padding: 20px 25px;
      margin: 20px auto;
      box-sizing: border-box;
      width: 7.7in;
      height: 10.2in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: #fff;
    }
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2px;
    }
    .header-left-spacer {
      width: 120px;
    }
    .header-center {
      flex: 1;
      text-align: center;
    }
    .header-center img {
      max-width: 380px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    .header-center .address-text {
      font-size: 11px;
      color: #000;
      margin-top: 4px;
      line-height: 1.4;
      font-weight: bold;
      white-space: nowrap;
    }
    .header-right {
      width: 120px;
      text-align: right;
      font-size: 11px;
      font-weight: bold;
      color: #000;
      margin-top: 15px;
      line-height: 1.3;
    }
    .header-line {
      height: 5px;
      background: linear-gradient(to right, #8B0000 40%, #DAA520 40%);
      margin: 10px 0 12px 0;
      border: none;
    }
    .title {
      text-align: center;
      font-size: 26px;
      font-weight: bold;
      margin: 0 0 4px 0;
      letter-spacing: 0.5px;
    }
    .subtitle {
      text-align: center;
      font-size: 12px;
      color: #000;
      margin-bottom: 12px;
      white-space: nowrap;
    }
    .aligned-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      line-height: 1.35;
      margin-bottom: 8px;
    }
    .aligned-table td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .aligned-table td.label {
      font-weight: bold;
      width: 120px;
    }
    .delivery-title {
      font-weight: bold;
      color: #8B0000;
      font-size: 11.5px;
      margin: 10px 0 2px 0;
      text-transform: uppercase;
    }
    .schedule-title {
      text-align: center;
      font-weight: bold;
      font-size: 13.5px;
      margin: 12px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .schedule-table {
      width: 80%;
      margin: 0 auto 10px auto;
      border-collapse: collapse;
      font-size: 11px;
      text-align: center;
      border: 1.5px solid #000;
    }
    .schedule-table th {
      border: 1px solid #000;
      padding: 4px;
      font-weight: bold;
      font-size: 10.5px;
      background-color: transparent;
    }
    .schedule-table td {
      border: 1px solid #000;
      padding: 4px;
    }
    .notice-block {
      font-size: 11px;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .notice-block p {
      margin: 4px 0;
    }
    .notice-block .blue-text {
      color: #003399;
      font-weight: bold;
    }
    .notice-block .red-highlight {
      color: #8B0000;
      font-weight: bold;
    }
    .notice-block .green-highlight {
      color: #006600;
      font-weight: bold;
      font-style: italic;
    }
    .doc-stamps-title {
      text-align: center;
      color: #C59B27;
      font-weight: bold;
      text-decoration: underline;
      font-size: 11px;
      margin: 4px 0 2px 0;
      text-transform: uppercase;
    }
    .doc-stamps-text {
      text-align: center;
      font-size: 9.5px;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .bank-info {
      font-size: 11px;
      line-height: 1.35;
      margin-bottom: 8px;
    }
    .bank-info p {
      margin: 2px 0;
    }
    .bank-info .bank-name {
      color: #8B0000;
      font-weight: bold;
    }
    .bank-info .underline-text {
      text-decoration: underline;
    }
    .closing-block {
      font-size: 11px;
      line-height: 1.35;
      margin-bottom: 5px;
    }
    .closing-block p {
      margin: 2px 0;
    }
    .closing-block .company-name {
      color: #8B0000;
      font-weight: bold;
    }
    .footer-block {
      margin-top: auto;
      text-align: center;
    }
    .footer-block img {
      width: 100%;
      height: auto;
      display: block;
    }
    .content-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
  <div class="receipt-border">
    <div class="content-wrap">
      <div class="header-layout">
        <div class="header-left-spacer"></div>
        <div class="header-center">
          <img src="${supremogenLogo}" alt="Supremogen Insurance Services" />
          <div class="address-text">
            2nd Flr. Unit F & H, Village Mall, Commonwealth Avenue, East Fairview Park Subdivision, Brgy. Fairview Q.C.<br/>
            sales@supremogen.com || 027-091-5125
          </div>
        </div>
        <div class="header-right">
          <div>${receiptDate}</div>
          <div>${paymentMethodLabel}</div>
        </div>
      </div>
      
      <div class="header-line"></div>

      <div class="title">ACKNOWLEDGEMENT RECEIPT</div>
      <div class="subtitle">This letter acknowledges receipt of partial payment for COMPREHENSIVE INSURANCE for the assured name below.</div>

      <table class="aligned-table">
        <tr>
          <td class="label">Assured Name:</td>
          <td>${assuredName}${mortgageText}</td>
        </tr>
        <tr>
          <td class="label">Policy Number:</td>
          <td>${policyNo}</td>
        </tr>
        <tr>
          <td class="label">Unit Details:</td>
          <td>${unit.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Plate Number:</td>
          <td>${plateNo.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Effectivity Date:</td>
          <td>${inceptionDateDisplay}</td>
        </tr>
      </table>

      <div class="delivery-title">DELIVERY DETAILS</div>
      <table class="aligned-table">
        <tr>
          <td class="label">Receiver's Name:</td>
          <td>${receiverName.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Delivery Address:</td>
          <td>${deliveryAddress.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Landmark:</td>
          <td>${landmark.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Contact Number:</td>
          <td>${contactNumber}</td>
        </tr>
        <tr>
          <td class="label">Back up Number:</td>
          <td>${backupPhone}</td>
        </tr>
      </table>

      <table class="aligned-table" style="margin-top: 8px;">
        <tr>
          <td class="label">Agent's Name:</td>
          <td>${agentName.toUpperCase()}</td>
        </tr>
        <tr style="font-weight: bold;">
          <td class="label">TOTAL PREMIUM:</td>
          <td>${totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <div class="schedule-title">SCHEDULE OF PAYMENT</div>
      <table class="schedule-table">
        <thead>
          <tr style="border-bottom: 1.5px solid #000;">
            <th style="color: #8B0000; border-right: 1.5px solid #000;">DETAILS OF PAYMENT</th>
            <th style="border-right: 1.5px solid #000;">DUE DATE</th>
            <th style="border-right: 1.5px solid #000;">AMOUNT</th>
            <th style="color: #8B0000;">REMARKS</th>
          </tr>
        </thead>
        <tbody>
          ${scheduleRows}
        </tbody>
      </table>

      <div class="notice-block">
        <p class="blue-text">All payments must be made directly to account name of the company (Supremogen Insurance Services). Do not pay with unauthorized individual or employees.</p>
        <p>
          <span class="red-highlight">REMINDER : FAILURE TO PAY</span> the installment due will result to <span class="red-highlight">POLICY CANCELLATION</span>. 
          Kindly send your proof of payment at <a href="mailto:paymentcollection@supremogen.com" style="color: #8B0000; text-decoration: underline;">paymentcollection@supremogen.com</a> and inform your Agent.
        </p>
        <p class="green-highlight">In event of CLAIM INSURANCE, premium should be FULLY PAID</p>
      </div>

      <div class="doc-stamps-title">DOCUMENTARY STAMPS TAX</div>
      <div class="doc-stamps-text">
        The implementation of the Electronic Documentary Stamp Tax (EDST) system by BIR now mandates the payment of the DST portion upon policy issuance. Refunds on DST for cancelled policies are not allowed.
      </div>

      <div class="bank-info">
        <p class="bank-name">Philippine Bank of Communications</p>
        <p>PB COM ACCOUNT NAME : Supremogen Insurance Services</p>
        <p>ACCOUNT NUMBER : <span class="underline-text" style="font-weight: bold;">227101004869</span></p>
      </div>

      <div class="closing-block">
        <p>Thank you,</p>
        <p class="company-name">Supremogen Insurance Services</p>
      </div>
    </div>

    <div class="footer-block">
      <img src="${supremogenFooter}" alt="Footer Graphic" />
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    }
  };
  
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
      status: invoiceStatus === 'all' ? 'sent,partial,overdue' : (invoiceStatus === 'every' ? 'sent,partial,overdue,paid' : invoiceStatus),
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

  // Mutation for updating a collection payment
  const updateCollectionMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentFormData }) => updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      showToast('Payment updated successfully!', 'success');
      setCollectionModalOpen(false);
      setSelectedInvoice(null);
      resetCollectionForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to update payment.', 'error');
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

    const currentPayment = selectedInvoice.payments?.find(p => p.id === editingPaymentId);
    const maxAllowed = selectedInvoice.balance + (currentPayment ? Number(currentPayment.amount) : 0);
    if (amountNum > maxAllowed) {
      showToast(`Collection amount cannot exceed the balance of ₱${maxAllowed.toLocaleString()}`, 'error');
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

  const needsReference = ['bank_transfer_pbcom', 'bank_transfer_security_bank', 'post_dated_checks', 'split_payment'].includes(collectMethod);

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
              <option value="every">All Invoices</option>
              <option value="all">All Outstanding</option>
              <option value="sent">Sent (Unpaid)</option>
              <option value="partial">Partially Paid</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
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
                    const isExpanded = !!expandedInvoiceIds[row.id];

                    // Grace period check for highlighting (3-6 terms, 3 day grace period)
                    let isHighlighted = false;
                    if (terms >= 3 && terms <= 6 && inceptionDateStr) {
                      const paidCount = Math.floor(amountPaid / installmentAmount);
                      if (paidCount < terms) {
                        const inDate = new Date(inceptionDateStr);
                        const unpaidDueDate = new Date(inDate.getFullYear(), inDate.getMonth() + paidCount, inDate.getDate());
                        const today = new Date();
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const dueMidnight = new Date(unpaidDueDate.getFullYear(), unpaidDueDate.getMonth(), unpaidDueDate.getDate());
                        
                        const diffTime = todayMidnight.getTime() - dueMidnight.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays > 3) {
                          isHighlighted = true;
                        }
                      }
                    }

                    return (
                      <span key={row.id} className="contents">
                        {/* Row 1: Header row / General Details */}
                        <tr 
                          onClick={() => handleOpenCollection(row)}
                          className={`transition-colors font-bold cursor-pointer ${
                            isHighlighted 
                              ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-950' 
                              : 'bg-slate-50/50 hover:bg-slate-100 text-slate-800 hover:text-slate-900'
                          }`}
                        >
                          <td className="px-3 py-3 border-r border-slate-200 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(row.id);
                                }}
                                className="p-1 rounded hover:bg-slate-250 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-[#4A0E17]" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span>{customer?.agent || '—'}</span>
                            </div>
                          </td>
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
                          <td className="px-4 py-3 border-r border-slate-200 font-black uppercase text-slate-900 tracking-tight">
                            <div>{customer ? `${customer.first_name} ${customer.last_name}` : '—'}</div>
                            {customer && (
                              <div className="text-[10px] text-slate-500 font-normal normal-case mt-0.5 space-y-0.5">
                                <p>{customer.mobile || customer.phone || 'No contact'}</p>
                                <p className="truncate max-w-[180px]">{customer.email || 'No email'}</p>
                              </div>
                            )}
                          </td>
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
                             const isPaid = isActive && idx <= Math.floor(amountPaid / installmentAmount);
                             
                             const cellDueDate = inceptionDateStr ? new Date(new Date(inceptionDateStr).getFullYear(), new Date(inceptionDateStr).getMonth() + idx - 1, new Date(inceptionDateStr).getDate()) : null;
                             const isCellOverdue = terms >= 3 && terms <= 6 && cellDueDate && isActive && !isPaid && (() => {
                               const today = new Date();
                               const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                               const cellMidnight = new Date(cellDueDate.getFullYear(), cellDueDate.getMonth(), cellDueDate.getDate());
                               const diff = todayMidnight.getTime() - cellMidnight.getTime();
                               return Math.floor(diff / (1000 * 60 * 60 * 24)) > 3;
                             })();

                             const suffix = idx === 1 ? 'ST' : idx === 2 ? 'ND' : idx === 3 ? 'RD' : 'TH';

                             return (
                               <td key={idx} className={`px-2 py-3 border-r border-slate-200 text-center text-[10px] font-extrabold bg-[#4A0E17]/5 ${!isActive ? 'bg-slate-100 text-slate-400' : 'text-[#4A0E17]'}`}>
                                 {isActive ? (
                                   <div className="flex items-center justify-center gap-1">
                                     <span>{idx}{suffix} ({monthInfo?.monthName})</span>
                                     {isCellOverdue && (
                                       <span title="Overdue by more than 3 days!">
                                         <AlertTriangle className="h-2.5 w-2.5 text-rose-600 animate-pulse" />
                                       </span>
                                     )}
                                   </div>
                                 ) : '—'}
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
                          <td className="px-4 py-3 text-center" rowSpan={isExpanded ? 5 : 1} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => generateReceipt(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all hover:scale-[1.03] cursor-pointer"
                            >
                              <FileText className="h-3 w-3" /> Receipt
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <>

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
                          </>
                        )}
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
