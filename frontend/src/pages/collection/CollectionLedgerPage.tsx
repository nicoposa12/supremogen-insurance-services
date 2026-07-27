import { useState, useEffect, useMemo, useRef } from 'react';
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
  Mail,
  FileText,
  Paperclip,
  Download,
  XCircle
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { getInvoices, sendInvoiceReminder } from '../../services/invoiceApi';
import { recordPayment, updatePayment } from '../../services/paymentApi';
import { downloadAttachment, getAttachmentPreview } from '../../services/attachmentApi';
import { getReportSummary } from '../../services/reportApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Invoice, Payment, PaymentMethod, PaymentFormData } from '../../types/AccountingTypes';
import supremogenLogo from '../../assets/image/Picture1.png';
import supremogenFooter from '../../assets/image/Picture2.png';

export default function CollectionLedgerPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  // Search & Pagination & Filter States
  const [searchVal, setSearchVal] = useState(querySearch);
  const [searchInput, setSearchInput] = useState(querySearch);
  const [invoiceStatus, setInvoiceStatus] = useState('every');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Column Header Filter States
  const [agentFilter, setAgentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [plateFilter, setPlateFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [dueMonthFilter, setDueMonthFilter] = useState('');
  const [dueYearFilter, setDueYearFilter] = useState('');
  const [dueDayFilter, setDueDayFilter] = useState('');

  // Sync search input when user clicks notifications
  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setSearchVal(querySearch);
    }
  }, [querySearch]);

  // Record Collection Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Receipt Page View State
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<Invoice | null>(null);

  // Expanded rows state
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<number, boolean>>({});

  const toggleExpand = (invoiceId: number) => {
    setExpandedInvoiceIds(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const handleClearSearchAndFilters = () => {
    setSearchInput('');
    setSearchVal('');
    setAgentFilter('');
    setTypeFilter('');
    setNameFilter('');
    setPlateFilter('');
    setPolicyFilter('');
    setTermFilter('');
    setDueMonthFilter('');
    setDueYearFilter('');
    setDueDayFilter('');
    setPage(1);
  };

  // Generate Receipt and Print via Hidden Iframe (No new tab or popup)
  const printReceiptHtml = (invoice: Invoice) => {
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
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        width: 100% !important;
        background: #fff;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      @page {
        size: letter;
        margin: 0;
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
      background: linear-gradient(to right, #8B0000 50%, #DAA520 50%);
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
      font-size: 11px;
    }
    .reminder-box {
      font-size: 9.5px;
      line-height: 1.45;
      margin-bottom: 15px;
      text-align: justify;
    }
    .reminder-box .bold-blue {
      color: #0000CD;
      font-weight: bold;
    }
    .reminder-box .bold-red {
      color: #B22222;
      font-weight: bold;
    }
    .reminder-box .bold-green {
      color: #008000;
      font-weight: bold;
    }
    .stamps-box {
      border: 1px solid #000;
      padding: 8px 12px;
      font-size: 9px;
      text-align: center;
      line-height: 1.4;
      margin-bottom: 15px;
    }
    .stamps-title {
      font-weight: bold;
      text-decoration: underline;
      color: #D2691E;
      margin-bottom: 2px;
    }
    .bank-box {
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 25px;
    }
    .bank-box .bank-title {
      font-weight: bold;
      color: #8B0000;
      margin-bottom: 2px;
    }
    .thank-you-box {
      font-size: 10.5px;
      line-height: 1.45;
    }
    .thank-you-box .company-name {
      font-weight: bold;
      color: #8B0000;
      margin-top: 2px;
    }
    .footer-block {
      text-align: center;
      margin-top: auto;
    }
    .footer-block img {
      width: 100%;
      height: auto;
      max-height: 100px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="receipt-border">
    <div>
      <div class="header-layout">
        <div class="header-left-spacer"></div>
        <div class="header-center">
          <img src="${supremogenLogo}" alt="Supremogen Logo" />
          <div class="address-text">
            2nd Flr. Unit F & H, Village Mall, Commonwealth Avenue, East Fairview Park Subdivision, Brgy. Fairview Q.C.<br />
            sales@supremogen.com || 027-091-5125
          </div>
        </div>
        <div class="header-right">
          <div>${receiptDate}</div>
          <div>${paymentMethodLabel}</div>
        </div>
      </div>

      <hr class="header-line" />

      <h1 class="title">ACKNOWLEDGEMENT RECEIPT</h1>
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
          <td>${unit}</td>
        </tr>
        <tr>
          <td class="label">Plate Number:</td>
          <td style="text-transform: uppercase;">${plateNo}</td>
        </tr>
        <tr>
          <td class="label">Effectivity Date:</td>
          <td>${inceptionDateDisplay}</td>
        </tr>
      </table>

      <div class="delivery-title">Delivery Details</div>
      <table class="aligned-table" style="margin-bottom: 12px;">
        <tr>
          <td class="label">Receiver's Name:</td>
          <td>${receiverName}</td>
        </tr>
        <tr>
          <td class="label">Delivery Address:</td>
          <td>${deliveryAddress}</td>
        </tr>
        <tr>
          <td class="label">Landmark:</td>
          <td>${landmark}</td>
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

      <table class="aligned-table" style="margin-top: 10px;">
        <tr>
          <td class="label" style="color: #8B0000; font-size: 11.5px;">Agent's Name:</td>
          <td style="color: #8B0000; font-weight: bold; font-size: 11.5px;">${agentName}</td>
        </tr>
        <tr>
          <td class="label" style="font-size: 11.5px;">TOTAL PREMIUM:</td>
          <td style="font-weight: bold; font-size: 11.5px;">${totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <div class="schedule-title">Schedule of Payment</div>
      <table class="schedule-table">
        <thead>
          <tr>
            <th style="color: #8B0000;">DETAILS OF PAYMENT</th>
            <th>DUE DATE</th>
            <th>AMOUNT</th>
            <th style="color: #8B0000;">REMARKS</th>
          </tr>
        </thead>
        <tbody>
          ${scheduleRows}
        </tbody>
      </table>

      <div class="reminder-box">
        <span class="bold-blue">All payments must be made directly to account name of the company (Supremogen Insurance Services). Do not pay with unauthorized individual or employees.</span>
        <br />
        <span class="bold-red">REMINDER : FAILURE TO PAY</span> the installment due will result to <span class="bold-red">POLICY CANCELLATION</span>. Kindly send your proof of payment at <span class="bold-red" style="text-decoration: underline;">paymentcollection@supremogen.com</span> and inform your Agent.
        <br />
        <span class="bold-green">In event of CLAIM INSURANCE, premium should be FULLY PAID</span>
      </div>

      <div class="stamps-box">
        <div class="stamps-title">DOCUMENTARY STAMPS TAX</div>
        The implementation of the Electronic Documentary Stamp Tax (EDST) system by BIR now mandates the payment of the DST portion upon policy issuance. Refunds on DST for cancelled policies are not allowed.
      </div>

      <div class="bank-box" style="display: flex; gap: 30px;">
        <div style="flex: 1;">
          <div class="bank-title">Philippine Bank of Communications (PBCom)</div>
          Account Name: Supremogen Insurance Services<br />
          ACCOUNT NUMBER: <u>227101004869</u>
        </div>
        <div style="flex: 1;">
          <div class="bank-title">Security Bank</div>
          Account Name: Supremogen Insurance Services<br />
          ACCOUNT NUMBER: <u>0000069770932</u>
        </div>
      </div>

      <div class="thank-you-box">
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
      // Print using silent hidden iframe (prevents new window popup/redirect!)
    }
  </script>
</body>
</html>`;

    // Print using silent hidden iframe (prevents new window popup/redirect!)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.write(receiptHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);
    }
  };

  // Record Collection Form State
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('walk_in');
  const [collectDate, setCollectDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [collectReference, setCollectReference] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectProof, setCollectProof] = useState<File | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleViewProof = async (att: any) => {
    setPreviewAttachment(att);
    setIsPreviewLoading(true);
    try {
      const blob = await getAttachmentPreview(att.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      showToast('Failed to load attachment preview.', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Debounce search inputs
  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setSearchVal(querySearch);
    }
  }, [querySearch]);

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
    refetchInterval: 3000,
  });

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-ledger', page, searchVal, invoiceStatus, perPage],
    queryFn: () => getInvoices({
      page: page,
      per_page: perPage,
      search: searchVal,
      status: (invoiceStatus === 'all' || invoiceStatus === 'dst_warning' || invoiceStatus === 'first_payment_alarm') ? 'sent,partial,overdue' : (invoiceStatus === 'every' ? 'sent,partial,overdue,paid,overpaid,voided' : invoiceStatus),
      sort_by: 'created_at',
      sort_dir: 'desc'
    }),
    refetchInterval: 3000,
    placeholderData: (prev) => prev,
  });

  const firstPaymentAlarmCount = useMemo(() => {
    const rawList = invoicesRes?.data?.data ?? [];
    return rawList.filter((row: Invoice) => {
      const customer = row.customer;
      if (Number(row.amount_paid) > 0 || Number(row.balance) <= 0) return false;
      const reqDateStr = customer?.writing_date || customer?.inception_date || row.created_at;
      if (!reqDateStr) return false;
      const reqDate = new Date(reqDateStr);
      if (isNaN(reqDate.getTime())) return false;

      const targetYear = reqDate.getMonth() === 11 ? reqDate.getFullYear() + 1 : reqDate.getFullYear();
      const targetMonth = (reqDate.getMonth() + 1) % 12;
      const alarmDate = new Date(targetYear, targetMonth, 20);

      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const alarmMidnight = new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate());

      return todayMidnight >= alarmMidnight;
    }).length;
  }, [invoicesRes]);

  const dstWarningCount = useMemo(() => {
    const rawList = invoicesRes?.data?.data ?? [];
    return rawList.filter((row: Invoice) => {
      const customer = row.customer;
      if (Number(row.balance) <= 0 || !customer?.inception_date) return false;
      const inDate = new Date(customer.inception_date);
      if (isNaN(inDate.getTime())) return false;
      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const inMidnight = new Date(inDate.getFullYear(), inDate.getMonth(), inDate.getDate());
      const diffTime = todayMidnight.getTime() - inMidnight.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24)) >= 80;
    }).length;
  }, [invoicesRes]);

  // Client-side filtering for Agent, Type, Assured Name, and Plate Number columns
  const filteredInvoices = useMemo(() => {
    const rawList = invoicesRes?.data?.data ?? [];
    return rawList.filter((row: Invoice) => {
      const customer = row.customer;

      // 1st Payment Alarm filter (No 1st payment by 20th of following month)
      if (invoiceStatus === 'first_payment_alarm') {
        if (Number(row.amount_paid) > 0 || Number(row.balance) <= 0) return false;
        const reqDateStr = customer?.writing_date || customer?.inception_date || row.created_at;
        if (!reqDateStr) return false;
        const reqDate = new Date(reqDateStr);
        if (isNaN(reqDate.getTime())) return false;

        const targetYear = reqDate.getMonth() === 11 ? reqDate.getFullYear() + 1 : reqDate.getFullYear();
        const targetMonth = (reqDate.getMonth() + 1) % 12;
        const alarmDate = new Date(targetYear, targetMonth, 20);

        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const alarmMidnight = new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate());

        if (todayMidnight < alarmMidnight) return false;
      }

      // DST Warning filter
      if (invoiceStatus === 'dst_warning') {
        if (Number(row.balance) <= 0 || !customer?.inception_date) return false;
        const inDate = new Date(customer.inception_date);
        if (isNaN(inDate.getTime())) return false;
        const today = new Date();
        const diffTime = today.getTime() - inDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 80) return false;
      }

      // Agent filter
      if (agentFilter) {
        const agent = (customer?.agent || '').toLowerCase();
        if (!agent.includes(agentFilter.toLowerCase())) {
          return false;
        }
      }

      // Type filter
      if (typeFilter && typeFilter !== '') {
        const reqType = (customer?.request_type || '').toUpperCase();
        if (reqType !== typeFilter.toUpperCase()) {
          return false;
        }
      }

      // Assured Name filter
      if (nameFilter) {
        const fullName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.toLowerCase();
        if (!fullName.includes(nameFilter.toLowerCase())) {
          return false;
        }
      }

      // Plate Number filter
      if (plateFilter) {
        const plate = (customer?.plate_no || '').toLowerCase();
        if (!plate.includes(plateFilter.toLowerCase())) {
          return false;
        }
      }

      // Policy Number filter
      if (policyFilter) {
        const policyNo = (customer?.policy_no || row.policy?.policy_number || '').toLowerCase();
        if (!policyNo.includes(policyFilter.toLowerCase())) {
          return false;
        }
      }

      // Terms filter
      if (termFilter) {
        const terms = String(customer?.payment_terms || 1);
        if (terms !== termFilter) {
          return false;
        }
      }

      // Due Date Month / Year / Day Filter
      if (dueMonthFilter || dueYearFilter || dueDayFilter) {
        const terms = Number(customer?.payment_terms || 1);
        const inceptionDateStr = customer?.inception_date;
        if (!inceptionDateStr) return false;

        const inceptionDate = new Date(inceptionDateStr);
        if (isNaN(inceptionDate.getTime())) return false;

        // Check if any of the active installments match the month/year/day filter
        let hasMatchingInstallment = false;
        for (let i = 0; i < terms; i++) {
          const d = new Date(inceptionDate.getFullYear(), inceptionDate.getMonth() + i, inceptionDate.getDate());
          
          let monthMatches = true;
          if (dueMonthFilter) {
            monthMatches = (d.getMonth() + 1) === Number(dueMonthFilter);
          }

          let yearMatches = true;
          if (dueYearFilter) {
            yearMatches = d.getFullYear() === Number(dueYearFilter);
          }

          let dayMatches = true;
          if (dueDayFilter) {
            dayMatches = d.getDate() === Number(dueDayFilter);
          }

          if (monthMatches && yearMatches && dayMatches) {
            hasMatchingInstallment = true;
            break;
          }
        }

        if (!hasMatchingInstallment) {
          return false;
        }
      }

      return true;
    });
  }, [invoicesRes, agentFilter, typeFilter, nameFilter, plateFilter, policyFilter, termFilter, dueMonthFilter, dueYearFilter, dueDayFilter]);

  const autoExpandedLedgerRef = useRef<string | null>(null);

  useEffect(() => {
    const isAutoOpen = searchParams.get('autoOpen') === 'true';
    if (isAutoOpen && !invoicesLoading && filteredInvoices.length > 0 && autoExpandedLedgerRef.current !== (querySearch || 'auto')) {
      autoExpandedLedgerRef.current = querySearch || 'auto';

      const searchUpper = (querySearch || '').toUpperCase();
      const match = querySearch ? (
        filteredInvoices.find((inv: Invoice) => {
          const custName = inv.customer ? `${inv.customer.first_name} ${inv.customer.last_name}`.toUpperCase() : '';
          const policyNo = (inv.customer?.policy_no || inv.policy?.policy_number || '').toUpperCase();
          const invNo = (inv.invoice_number || '').toUpperCase();
          const hasMatchingPayment = inv.payments?.some(
            (p) => p.payment_number?.toUpperCase() === searchUpper || p.reference_number?.toUpperCase() === searchUpper
          );

          return (
            hasMatchingPayment ||
            invNo === searchUpper ||
            invNo.includes(searchUpper) ||
            policyNo === searchUpper ||
            policyNo.includes(searchUpper) ||
            custName.includes(searchUpper)
          );
        }) || filteredInvoices[0]
      ) : filteredInvoices[0];

      if (match) {
        setExpandedInvoiceIds((prev) => ({ ...prev, [match.id]: true }));
      }
    }
  }, [filteredInvoices, searchParams, querySearch, invoicesLoading]);
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
    setCollectProof(null);
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

    const data: PaymentFormData = {
      invoice_id: selectedInvoice.id,
      amount: amountNum,
      payment_method: collectMethod,
      payment_date: collectDate,
      reference_number: collectReference || undefined,
      notes: collectNotes || undefined,
      proof: collectProof || undefined,
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

  const viewingMonth = useMemo(() => {
    return dueMonthFilter ? Number(dueMonthFilter) - 1 : new Date().getMonth();
  }, [dueMonthFilter]);

  const viewingYear = useMemo(() => {
    return dueYearFilter ? Number(dueYearFilter) : new Date().getFullYear();
  }, [dueYearFilter]);

  const currentMonthName = useMemo(() => {
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return monthNames[viewingMonth];
  }, [viewingMonth]);

  const currentYear = viewingYear;

  // Helper to calculate active due amount for this month
  const calculateDueAmount = (invoice: Invoice) => {
    if (Number(invoice.balance) <= 0) {
      return 0;
    }
    const terms = Number(invoice.customer?.payment_terms || 1);
    const totalAmount = Number(invoice.total_amount);
    const amountPaid = Number(invoice.amount_paid);
    const installmentAmount = totalAmount / terms;
    const inceptionDateStr = invoice.customer?.inception_date;
    if (!inceptionDateStr) return 0;

    const inceptionDate = new Date(inceptionDateStr);
    if (isNaN(inceptionDate.getTime())) return 0;

    const targetYr = viewingYear;
    const targetMth = viewingMonth;

    let currentInstallmentIndex = -1;
    for (let i = 0; i < terms; i++) {
      const targetDate = new Date(inceptionDate.getFullYear(), inceptionDate.getMonth() + i, 1);
      if (targetDate.getFullYear() === targetYr && targetDate.getMonth() === targetMth) {
        currentInstallmentIndex = i + 1;
        break;
      }
    }

    const firstInstDate = new Date(inceptionDate.getFullYear(), inceptionDate.getMonth(), 1);
    const targetCompareDate = new Date(targetYr, targetMth, 1);
    if (targetCompareDate < firstInstDate) {
      return 0;
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
  const isTrackerMethod = ['jt', 'jrs', 'lbc'].includes(collectMethod);

  if (viewingReceiptInvoice) {
    return (
      <div className="space-y-6 text-slate-700">
        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
          <button
            onClick={() => setViewingReceiptInvoice(null)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-750 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Ledger
          </button>
          <button
            onClick={() => printReceiptHtml(viewingReceiptInvoice)}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold uppercase tracking-wider rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
          >
            <FileText className="h-4 w-4" /> Print Receipt
          </button>
        </div>

        {/* Paper Container */}
        <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-6 md:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div className="bg-white text-black p-6 md:p-10 rounded-xl shadow-md max-w-[7.7in] w-full border border-slate-200 flex flex-col justify-between" style={{ fontFamily: "'Arial', sans-serif", minHeight: '10.2in' }}>
            <div>
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="w-[120px]"></div>
                <div className="flex-1 text-center">
                  <img src={supremogenLogo} alt="Supremogen Logo" className="max-w-[280px] md:max-w-[340px] mx-auto h-auto" />
                  <div className="text-[9px] md:text-[10px] font-bold text-black mt-2 leading-tight">
                    2nd Flr. Unit F & H, Village Mall, Commonwealth Avenue, East Fairview Park Subdivision, Brgy. Fairview Q.C.<br />
                    sales@supremogen.com || 027-091-5125
                  </div>
                </div>
                <div className="w-[120px] text-right text-[10px] md:text-[11px] font-bold text-black pt-4">
                  <div>
                    {(() => {
                      const payments = [...(viewingReceiptInvoice.payments || [])].sort(
                        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
                      );
                      const firstPayment = payments[0];
                      const refDate = firstPayment ? new Date(firstPayment.payment_date) : new Date();
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      return `${refDate.getMonth() + 1}${pad(refDate.getDate())}${refDate.getFullYear()}`;
                    })()}
                  </div>
                  <div className="mt-1">
                    {(() => {
                      const payments = [...(viewingReceiptInvoice.payments || [])].sort(
                        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
                      );
                      const firstPayment = payments[0];
                      return firstPayment
                        ? (PAYMENT_METHOD_LABELS[firstPayment.payment_method] || firstPayment.payment_method).toUpperCase()
                        : 'WALK IN';
                    })()}
                  </div>
                </div>
              </div>

              <div className="h-[4px] my-4" style={{ background: 'linear-gradient(to right, #8B0000 50%, #DAA520 50%)' }}></div>

              <h1 className="text-center text-xl md:text-2xl font-black tracking-wide text-black mb-1">ACKNOWLEDGEMENT RECEIPT</h1>
              <p className="text-center text-[10px] md:text-[11px] text-slate-800 mb-4">
                This letter acknowledges receipt of partial payment for COMPREHENSIVE INSURANCE for the assured name below.
              </p>

              {/* Assured & Policy Info Table */}
              <table className="w-full text-[10px] md:text-[11px] mb-4 border-collapse">
                <tbody>
                  <tr>
                    <td className="font-bold py-1 w-[120px]">Assured Name:</td>
                    <td className="py-1">
                      {(() => {
                        const customer = viewingReceiptInvoice.customer;
                        const assuredName = customer ? `${customer.first_name} ${customer.last_name}`.toUpperCase() : '—';
                        const mortgageText = customer?.mortgage ? ` LEASED TO ${customer.mortgage.toUpperCase()}` : '';
                        return assuredName + mortgageText;
                      })()}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Policy Number:</td>
                    <td className="py-1">{viewingReceiptInvoice.policy?.policy_number || viewingReceiptInvoice.customer?.policy_no || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Unit Details:</td>
                    <td className="py-1">{viewingReceiptInvoice.customer?.unit || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Plate Number:</td>
                    <td className="py-1 uppercase">{viewingReceiptInvoice.customer?.plate_no || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Effectivity Date:</td>
                    <td className="py-1">
                      {viewingReceiptInvoice.customer?.inception_date
                        ? new Date(viewingReceiptInvoice.customer.inception_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Delivery Details */}
              <div className="font-bold text-[#8B0000] text-[11px] md:text-[12px] uppercase mb-2">Delivery Details</div>
              <table className="w-full text-[10px] md:text-[11px] mb-4 border-collapse">
                <tbody>
                  <tr>
                    <td className="font-bold py-1 w-[120px]">Receiver's Name:</td>
                    <td className="py-1">
                      {viewingReceiptInvoice.customer?.receiver_name ||
                        (viewingReceiptInvoice.customer ? `${viewingReceiptInvoice.customer.first_name} ${viewingReceiptInvoice.customer.last_name}`.toUpperCase() : '—')}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Delivery Address:</td>
                    <td className="py-1">{viewingReceiptInvoice.customer?.delivery_address || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Landmark:</td>
                    <td className="py-1">{viewingReceiptInvoice.customer?.landmark || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Contact Number:</td>
                    <td className="py-1">{viewingReceiptInvoice.customer?.mobile || viewingReceiptInvoice.customer?.phone || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">Back up Number:</td>
                    <td className="py-1">
                      {viewingReceiptInvoice.customer?.backup_phone ||
                        viewingReceiptInvoice.customer?.mobile ||
                        viewingReceiptInvoice.customer?.phone || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Agent and Premium Table */}
              <table className="w-full text-[11px] md:text-[12px] mt-4 border-collapse">
                <tbody>
                  <tr>
                    <td className="font-bold py-1 w-[120px] text-[#8B0000]">Agent's Name:</td>
                    <td className="font-bold py-1 text-[#8B0000]">{viewingReceiptInvoice.customer?.agent || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-1">TOTAL PREMIUM:</td>
                    <td className="font-bold py-1">₱{Number(viewingReceiptInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>

              {/* Schedule of Payment */}
              <div className="text-center font-bold text-[12px] md:text-[13px] uppercase mt-4 mb-2 tracking-wide">Schedule of Payment</div>
              <table className="w-[85%] mx-auto text-[10px] md:text-[11px] text-center border border-black mb-4 border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="border-r border-black p-1 text-[#8B0000] font-bold">DETAILS OF PAYMENT</th>
                    <th className="border-r border-black p-1 font-bold">DUE DATE</th>
                    <th className="border-r border-black p-1 font-bold">AMOUNT</th>
                    <th className="p-1 text-[#8B0000] font-bold">REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const customer = viewingReceiptInvoice.customer;
                    const terms = Number(customer?.payment_terms || 1);
                    const totalPremium = Number(viewingReceiptInvoice.total_amount);
                    const installmentAmt = totalPremium / terms;
                    const payments = [...(viewingReceiptInvoice.payments || [])].sort(
                      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
                    );
                    const inceptionDateStr = customer?.inception_date;
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

                    return Array.from({ length: terms }).map((_, i) => {
                      const dueDate = inceptionDateStr
                        ? new Date(new Date(inceptionDateStr).getFullYear(), new Date(inceptionDateStr).getMonth() + i, new Date(inceptionDateStr).getDate())
                        : null;
                      const dueDateStr = dueDate ? `${monthNames[dueDate.getMonth()]} ${dueDate.getDate()}, ${dueDate.getFullYear()}` : '—';
                      const payment = payments[i];
                      const remarks = payment ? (PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method).toUpperCase() : '';
                      const suffix = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;

                      return (
                        <tr key={i} className="border-b border-black last:border-b-0">
                          <td className="border-r border-black p-1 text-[#8B0000] font-bold text-[10px]">{suffix}</td>
                          <td className="border-r border-black p-1 text-[10px]">{dueDateStr}</td>
                          <td className="border-r border-black p-1 text-[10px]">₱{installmentAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-1 font-bold text-[10px]">{remarks}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {/* Legal reminders */}
              <div className="text-[8.5px] md:text-[9.5px] leading-relaxed text-justify mb-4 space-y-1">
                <p className="text-[#0000CD] font-bold">
                  All payments must be made directly to account name of the company (Supremogen Insurance Services). Do not pay with unauthorized individual or employees.
                </p>
                <p className="text-[#B22222] font-semibold">
                  <span className="font-bold">REMINDER : FAILURE TO PAY</span> the installment due will result to <span className="font-bold">POLICY CANCELLATION</span>. Kindly send your proof of payment at <span className="font-bold underline">paymentcollection@supremogen.com</span> and inform your Agent.
                </p>
                <p className="text-[#008000] font-bold">
                  In event of CLAIM INSURANCE, premium should be FULLY PAID
                </p>
              </div>

              {/* Documentary Stamps Tax */}
              <div className="border border-black p-2 text-[8px] md:text-[9px] text-center leading-normal mb-4">
                <div className="font-bold underline text-[#D2691E] mb-1">DOCUMENTARY STAMPS TAX</div>
                The implementation of the Electronic Documentary Stamp Tax (EDST) system by BIR now mandates the payment of the DST portion upon policy issuance. Refunds on DST for cancelled policies are not allowed.
              </div>

              {/* Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[9px] md:text-[10px] leading-tight mb-4">
                <div>
                  <div className="font-bold text-[#8B0000] mb-0.5">Philippine Bank of Communications (PBCom)</div>
                  Account Name: Supremogen Insurance Services<br />
                  ACCOUNT NUMBER: <span className="font-bold underline">227101004869</span>
                </div>
                <div>
                  <div className="font-bold text-[#8B0000] mb-0.5">Security Bank</div>
                  Account Name: Supremogen Insurance Services<br />
                  ACCOUNT NUMBER: <span className="font-bold underline">0000069770932</span>
                </div>
              </div>

              {/* Signature / Company block */}
              <div className="text-[9.5px] md:text-[10.5px]">
                <p>Thank you,</p>
                <p className="font-bold text-[#8B0000] mt-0.5">Supremogen Insurance Services</p>
              </div>
            </div>

            {/* Footer Graphic */}
            <div className="text-center mt-6">
              <img src={supremogenFooter} alt="Footer Graphic" className="w-full h-auto max-h-[80px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="space-y-3.5">
          {/* Top Row: Search Input + Quick Alarm Chips */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by assured name, plate, policy, agent, invoice #..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition shadow-inner"
              />
              {(searchInput || agentFilter || typeFilter || nameFilter || plateFilter || policyFilter || termFilter || dueMonthFilter || dueDayFilter || dueYearFilter) && (
                <button
                  onClick={handleClearSearchAndFilters}
                  title="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Alarm Pill Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {firstPaymentAlarmCount > 0 && (
                <button
                  onClick={() => {
                    setInvoiceStatus(invoiceStatus === 'first_payment_alarm' ? 'every' : 'first_payment_alarm');
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                    invoiceStatus === 'first_payment_alarm'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-sm ring-2 ring-rose-700/20'
                      : 'bg-rose-50/80 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                  }`}
                  title="Filter records with no 1st payment by the 20th of the following month"
                >
                  <span className={`h-2 w-2 rounded-full ${invoiceStatus === 'first_payment_alarm' ? 'bg-white' : 'bg-rose-600'} animate-pulse`} />
                  <span>1st Payment Alarm</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    invoiceStatus === 'first_payment_alarm' ? 'bg-white text-rose-800' : 'bg-rose-200/80 text-rose-900'
                  }`}>
                    {firstPaymentAlarmCount}
                  </span>
                </button>
              )}

              {dstWarningCount > 0 && (
                <button
                  onClick={() => {
                    setInvoiceStatus(invoiceStatus === 'dst_warning' ? 'every' : 'dst_warning');
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                    invoiceStatus === 'dst_warning'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-600/20'
                      : 'bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100'
                  }`}
                  title="Filter records with 80+ days unpaid since inception"
                >
                  <span className={`h-2 w-2 rounded-full ${invoiceStatus === 'dst_warning' ? 'bg-white' : 'bg-amber-600'} animate-pulse`} />
                  <span>DST Warning</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    invoiceStatus === 'dst_warning' ? 'bg-white text-amber-900' : 'bg-amber-200/80 text-amber-900'
                  }`}>
                    {dstWarningCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Aligned Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            {/* Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={invoiceStatus}
                onChange={(e) => { setInvoiceStatus(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="every">All Invoices</option>
                <option value="all">All Outstanding</option>
                <option value="first_payment_alarm">1st Payment Alarm (20th Day)</option>
                <option value="dst_warning">DST Warning (80+ Days)</option>
                <option value="sent">Sent (Unpaid)</option>
                <option value="partial">Partially Paid</option>
                <option value="overdue">Overdue</option>
                <option value="overpaid">Overpayment</option>
                <option value="paid">Paid</option>
                <option value="voided">Cancelled / Voided</option>
              </select>
            </div>

            {/* Type */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="NEW ACCOUNT">New Account</option>
                <option value="RENEWAL">Renewal</option>
              </select>
            </div>

            {/* Terms */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Terms:</span>
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Terms</option>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="4">4 Months</option>
                <option value="5">5 Months</option>
                <option value="6">6 Months</option>
              </select>
            </div>

            {/* Month */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Month:</span>
              <select
                value={dueMonthFilter}
                onChange={(e) => { setDueMonthFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Months</option>
                <option value="1">Jan</option>
                <option value="2">Feb</option>
                <option value="3">Mar</option>
                <option value="4">Apr</option>
                <option value="5">May</option>
                <option value="6">Jun</option>
                <option value="7">Jul</option>
                <option value="8">Aug</option>
                <option value="9">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>
            </div>

            {/* Year */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Year:</span>
              <select
                value={dueYearFilter}
                onChange={(e) => { setDueYearFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {(searchInput || agentFilter || typeFilter || nameFilter || plateFilter || policyFilter || termFilter || dueMonthFilter || dueDayFilter || dueYearFilter) && (
              <button
                onClick={handleClearSearchAndFilters}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Ledger Grid */}
        {invoicesLoading ? (
          <div className="h-60 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
            <span className="text-sm text-slate-400">Loading payment ledger...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-medium text-slate-600">
                <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Agent</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Date Request</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">Assured Name</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Request No.</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Policy Number</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Plate Number</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Inception Date</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Total Premium</th>
                    <th className="px-2.5 py-3 border-r border-slate-200 text-center whitespace-nowrap">Terms</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Installment</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center whitespace-nowrap">1st</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center whitespace-nowrap">2nd</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center whitespace-nowrap">3rd</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center whitespace-nowrap">4th</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center whitespace-nowrap">5th</th>
                    <th className="px-3 py-3 border-r border-slate-200 text-center whitespace-nowrap">6th</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">Remaining Balance</th>
                    <th className="px-3.5 py-3 border-r border-slate-200 text-[#4A0E17] font-bold bg-[#4A0E17]/10 whitespace-nowrap">Due {currentMonthName} {currentYear}</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr className="bg-white">
                      <td colSpan={20} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-slate-50 text-slate-400">
                            <Receipt className="h-8 w-8 text-slate-455" />
                          </div>
                          <span className="text-sm font-bold text-slate-800">No record found</span>
                          <span className="text-xs text-slate-400 font-normal">Adjust your filters or record collections to display schedules.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((row: Invoice) => {
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
                            formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          });
                        }
                      }

                      const dueAmount = calculateDueAmount(row);
                      const isExpanded = !!expandedInvoiceIds[row.id];

                      // Calculate first active due installment index (the first one not fully paid)
                      const currentInstallmentIndex = (() => {
                        for (let i = 1; i <= terms; i++) {
                          const pay = payments[i - 1];
                          if (!pay || Number(pay.amount) < (installmentAmount - 0.05)) {
                            return i;
                          }
                        }
                        return terms + 1; // All paid
                      })();

                      // 1st Payment Alarm check (No 1st payment by 20th of following month)
                      const isFirstPaymentAlarm = (() => {
                        if (Number(row.amount_paid) > 0 || Number(row.balance) <= 0) return false;
                        const reqDateStr = customer?.writing_date || customer?.inception_date || row.created_at;
                        if (!reqDateStr) return false;
                        const reqDate = new Date(reqDateStr);
                        if (isNaN(reqDate.getTime())) return false;

                        const targetYear = reqDate.getMonth() === 11 ? reqDate.getFullYear() + 1 : reqDate.getFullYear();
                        const targetMonth = (reqDate.getMonth() + 1) % 12;
                        const alarmDate = new Date(targetYear, targetMonth, 20);

                        const today = new Date();
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const alarmMidnight = new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate());

                        return todayMidnight >= alarmMidnight;
                      })();

                      // DST Warning calculation (80+ days from inception with unpaid balance)
                      const dstWarningDays = (() => {
                        if (Number(row.balance) <= 0 || !inceptionDateStr) return 0;
                        const inDate = new Date(inceptionDateStr);
                        if (isNaN(inDate.getTime())) return 0;
                        const today = new Date();
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const inMidnight = new Date(inDate.getFullYear(), inDate.getMonth(), inDate.getDate());
                        const diffTime = todayMidnight.getTime() - inMidnight.getTime();
                        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      })();
                      const isDstWarning = dstWarningDays >= 80 && Number(row.balance) > 0;

                      // Grace period check for highlighting (3-6 terms, 3 day grace period)
                      let isHighlighted = false;
                      if (Number(row.balance) > 0 && terms >= 3 && terms <= 6 && inceptionDateStr && currentInstallmentIndex <= terms) {
                        const inDate = new Date(inceptionDateStr);
                        const unpaidDueDate = new Date(inDate.getFullYear(), inDate.getMonth() + (currentInstallmentIndex - 1), inDate.getDate());
                        const today = new Date();
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const dueMidnight = new Date(unpaidDueDate.getFullYear(), unpaidDueDate.getMonth(), unpaidDueDate.getDate());

                        const diffTime = todayMidnight.getTime() - dueMidnight.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays > 3) {
                          isHighlighted = true;
                        }
                      }

                      const isCancelledPolicy = (row as any).status === 'voided' || (row as any).status === 'cancelled' || row.policy?.status === 'cancelled' || (row as any).policy?.quotation?.status === 'cancelled';

                      return (
                        <span key={row.id} className="contents">
                          {/* Row 1: Header row / General Details */}
                          <tr
                            onClick={() => handleOpenCollection(row)}
                            className={`transition-colors text-xs cursor-pointer ${
                              isDstWarning
                                ? 'bg-amber-50/30 hover:bg-amber-50/60 text-slate-800 border-l-4 border-l-amber-500 font-medium'
                                : isCancelledPolicy
                                  ? 'bg-rose-50/40 hover:bg-rose-50 text-slate-800 border-l-4 border-l-rose-600'
                                  : isFirstPaymentAlarm
                                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-l-4 border-l-rose-500 font-medium'
                                    : isHighlighted
                                      ? 'bg-white hover:bg-slate-50 text-slate-800 border-l-4 border-l-rose-500 font-medium'
                                      : 'bg-white hover:bg-slate-50 text-slate-800'
                              }`}
                          >
                            <td className="px-3.5 py-3 border-r border-slate-200 text-slate-700 font-medium">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(row.id);
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
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
                            <td className="px-3.5 py-3 border-r border-slate-200 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                              {customer?.writing_date ? new Date(customer.writing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-3.5 py-3 border-r border-slate-200 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${customer?.request_type === 'NEW ACCOUNT' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
                                {customer?.request_type || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-r border-slate-200 font-bold uppercase tracking-tight">
                              <div className="text-slate-900 font-bold">{customer ? `${customer.first_name} ${customer.last_name}` : '—'}</div>
                              {isCancelledPolicy && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 tracking-wide whitespace-nowrap uppercase shadow-2xs">
                                    <XCircle className="h-3 w-3 text-rose-600" /> CANCELLED POLICY
                                  </span>
                                </div>
                              )}
                              {isFirstPaymentAlarm && !isCancelledPolicy && (
                                <div className="mt-1">
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 tracking-wide whitespace-nowrap"
                                    title="Request was made in previous month and no 1st payment has been recorded as of the 20th of this month."
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse flex-shrink-0" />
                                    Unpaid 1st Payment (Overdue 20th)
                                  </span>
                                </div>
                              )}
                              {isDstWarning && !isFirstPaymentAlarm && !isCancelledPolicy && (
                                <div className="mt-1">
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 tracking-wide whitespace-nowrap"
                                    title={`DST WARNING: ${dstWarningDays} days passed since inception date with unpaid balance.`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse flex-shrink-0" />
                                    DST Warning ({dstWarningDays}d Unpaid)
                                  </span>
                                </div>
                              )}
                              {customer && (
                                <div className="text-[10px] text-slate-400 font-normal normal-case mt-0.5 space-y-0.5">
                                  <p>{customer.mobile || customer.phone || 'No contact'}</p>
                                  <p className="truncate max-w-[180px]">{customer.email || 'No email'}</p>
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-3 border-r border-slate-200 text-[11px] font-mono text-blue-700 font-bold whitespace-nowrap">
                              {(row as any).policy?.quotation?.quotation_number || (row as any).policy?.quotation?.ir_number || (row as any).quotation_number || customer?.customer_code || '—'}
                            </td>
                            <td className="px-3.5 py-3 border-r border-slate-200 text-[11px] text-slate-700 font-semibold uppercase whitespace-nowrap">{customer?.policy_no || row.policy?.policy_number || '—'}</td>
                            <td className="px-3.5 py-3 border-r border-slate-200 text-[11px] text-slate-600 font-medium uppercase whitespace-nowrap">{customer?.plate_no || '—'}</td>
                            <td className="px-3.5 py-3 border-r border-slate-200 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                              {customer?.inception_date ? new Date(customer.inception_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-3.5 py-3 border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap">₱{totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-2.5 py-3 border-r border-slate-200 text-center font-semibold text-slate-600">{terms}</td>
                            <td className="px-3.5 py-3 border-r border-slate-200 text-slate-700 font-medium whitespace-nowrap">₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                            {[1, 2, 3, 4, 5, 6].map((idx) => {
                              const monthInfo = installmentMonths[idx - 1];
                              const isActive = idx <= terms;
                              const payment = isActive ? payments[idx - 1] : null;

                              const isInvoicePaid = Number(row.balance) <= 0;
                              const isPaid = isActive && (isInvoicePaid || (payment && Number(payment.amount) >= (installmentAmount - 0.05)));
                              const isPartial = isActive && !isInvoicePaid && payment && Number(payment.amount) > 0 && Number(payment.amount) < (installmentAmount - 0.05);
                              const isDue = isActive && !isInvoicePaid && !isPaid && idx === currentInstallmentIndex;

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
                                <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center transition-all ${!isActive
                                  ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-650'
                                  : isPaid
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                    : isPartial
                                      ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                      : isDue
                                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                        : 'dark:bg-slate-900/10'
                                  }`}>
                                  {isActive ? (
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none">{idx}{suffix} ({monthInfo?.monthName})</span>
                                      <span className={`text-[10px] font-mono font-bold mt-0.5 leading-none ${isPaid
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : isPartial
                                          ? 'text-amber-700 dark:text-amber-400 font-bold'
                                          : isDue
                                            ? 'text-rose-700 dark:text-rose-400'
                                            : 'text-slate-655 dark:text-slate-350'
                                        }`}>
                                        ₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className={`text-[8px] font-extrabold uppercase mt-1 px-1 py-0.5 rounded leading-none inline-flex items-center gap-1 border border-transparent ${isPaid
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/30'
                                        : isPartial
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/30 animate-pulse'
                                          : isDue
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/30 animate-pulse'
                                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700/50'
                                        }`}>
                                        <span>{isPaid ? 'Paid' : isPartial ? 'Partial' : isDue ? 'Due' : 'Unpaid'}</span>
                                        {isCellOverdue && (
                                          <span title="Overdue by more than 3 days!">
                                            <AlertTriangle className="h-2 w-2 text-rose-600 dark:text-rose-455 animate-pulse" />
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 border-r border-slate-200 font-mono font-black text-[#4A0E17] dark:text-[#f28b99]">
                              {Number((row as any).amount_paid) > Number((row as any).total_amount) ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-slate-400 font-normal line-through text-[10px]">₱0.00</span>
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded text-[9px] font-extrabold uppercase whitespace-nowrap">
                                    +₱{(Number((row as any).amount_paid) - Number((row as any).total_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })} OVERPAID
                                  </span>
                                </div>
                              ) : (
                                `₱${Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              )}
                            </td>
                            <td className="px-3 py-3 border-r border-slate-200 font-mono font-black text-rose-800 dark:text-rose-450 bg-rose-50/40 dark:bg-rose-950/20">
                              {dueAmount > 0 ? (
                                <span className="px-2 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-350 rounded-lg text-[11px] font-extrabold animate-pulse border border-rose-200 dark:border-rose-900/30">
                                  ₱{dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center" rowSpan={isExpanded ? 6 : 1} onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-center gap-2">
                                <button
                                  onClick={() => printReceiptHtml(row)}
                                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all hover:scale-[1.03] cursor-pointer animate-fade-in"
                                >
                                  <FileText className="h-3 w-3" /> Receipt
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <>
                              {/* Row 2: Schedule of Payment */}
                              <tr className="bg-emerald-50/10 dark:bg-emerald-950/5 text-emerald-800 dark:text-emerald-400">
                                <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-emerald-50/20 dark:bg-emerald-950/10 text-[10px] uppercase tracking-wide">Automatic</td>
                                <td colSpan={2} className="px-4 py-2 border-r border-slate-200 font-bold bg-emerald-50/20 dark:bg-emerald-950/15">Schedule of Payment</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-emerald-50/20 dark:bg-emerald-950/10 text-center font-bold">Automatic</td>
                                <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-emerald-50/20 dark:bg-emerald-950/10 font-bold text-center">Installment Due Dates</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const monthInfo = installmentMonths[idx - 1];
                                  const isActive = idx <= terms;
                                  return (
                                    <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-655' : 'text-emerald-950 dark:text-emerald-350 bg-emerald-50/30 dark:bg-emerald-950/20'}`}>
                                      {isActive ? monthInfo?.formattedDate : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 3: Amount of Payment */}
                              <tr className="bg-emerald-50/10 dark:bg-emerald-950/5 text-emerald-800 dark:text-emerald-400">
                                <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-emerald-50/20 dark:bg-emerald-950/10 text-[10px] uppercase tracking-wide">Automatic</td>
                                <td colSpan={2} className="px-4 py-2 border-r border-slate-200 font-bold bg-emerald-50/20 dark:bg-emerald-950/15">Amount of Payment</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-emerald-50/20 dark:bg-emerald-950/10 text-center font-bold">Automatic</td>
                                <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-emerald-50/20 dark:bg-emerald-950/10 font-bold text-center">Target Amount Per Installment</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  return (
                                    <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-bold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-650' : 'text-emerald-950 dark:text-emerald-350 bg-emerald-50/30 dark:bg-emerald-950/20'}`}>
                                      {isActive ? `₱${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 4: Actual Payment Date */}
                              <tr className="bg-pink-50/10 dark:bg-pink-950/5 text-pink-850 dark:text-pink-400">
                                <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-pink-50/20 dark:bg-pink-950/10 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-2 border-r border-slate-200 font-bold bg-pink-50/20 dark:bg-pink-950/15">Actual Payment Date</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-pink-50/20 dark:bg-pink-950/10 text-center"></td>
                                <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-pink-50/20 dark:bg-pink-950/10 font-bold text-center text-pink-900 dark:text-pink-300">Recorded Dates Collected</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  return (
                                    <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-650' : payment ? 'text-pink-955 dark:text-pink-350 bg-pink-50/40 dark:bg-pink-950/25 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                                      {payment ? new Date(payment.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-650 dark:text-slate-350 font-mono">
                                  {row.balance <= 0 ? 'PAID IN FULL' : 'PARTIAL'}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 5: Actual Amount Payment */}
                              <tr className="bg-pink-50/10 dark:bg-pink-950/5 text-pink-850 dark:text-pink-400">
                                <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-pink-50/20 dark:bg-pink-950/10 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-2 border-r border-slate-200 font-bold bg-pink-50/20 dark:bg-pink-950/15">Actual Amount Payment</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-pink-50/20 dark:bg-pink-950/10 text-center"></td>
                                <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-pink-50/20 dark:bg-pink-950/10 font-bold text-center text-pink-900 dark:text-pink-300 font-mono">Amount Paid & Method</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  return (
                                    <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-bold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-655' : payment ? 'text-pink-950 dark:text-pink-350 bg-pink-50/40 dark:bg-pink-950/25' : 'text-slate-400 dark:text-slate-500'}`}>
                                      {payment ? (
                                        <div className="flex flex-col items-center">
                                          <span>₱{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          <span className="text-[8px] font-extrabold text-pink-700 bg-pink-100/60 dark:bg-pink-950 dark:text-pink-400 border border-transparent dark:border-pink-900/30 px-1 rounded mt-0.5 uppercase tracking-wide">
                                            {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                          </span>
                                        </div>
                                      ) : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-emerald-800 dark:text-emerald-400 font-mono">
                                  ₱{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 5.5: Actual Reference / Check / Tracker */}
                              <tr className="bg-pink-50/10 dark:bg-pink-950/5 text-pink-850 dark:text-pink-400">
                                <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-pink-50/20 dark:bg-pink-950/10 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-2 border-r border-slate-200 font-bold bg-pink-50/20 dark:bg-pink-950/15">Actual Reference / Check / Tracker</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-pink-50/20 dark:bg-pink-950/10 text-center"></td>
                                <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-pink-50/20 dark:bg-pink-950/10 font-bold text-center text-pink-900 dark:text-pink-300 font-mono">Ref / Check / Tracking No.</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  if (!isActive) {
                                    return (
                                      <td key={idx} className="px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-650">
                                        —
                                      </td>
                                    );
                                  }
                                  if (!payment) {
                                    return (
                                      <td key={idx} className="px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                        —
                                      </td>
                                    );
                                  }
                                  const isTracker = ['jt', 'jrs', 'lbc'].includes(payment.payment_method);
                                  const isCheck = payment.payment_method === 'post_dated_checks';
                                  const labelType = isTracker ? 'Track No' : (isCheck ? 'Check No' : 'Ref');
                                  return (
                                    <td key={idx} className="px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-pink-50/40 dark:bg-pink-950/25">
                                      {payment.reference_number ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-bold">{labelType}</span>
                                          <span className="truncate max-w-[100px] block font-semibold" title={payment.reference_number}>{payment.reference_number}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-500">No Ref</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-650 dark:text-slate-350 font-mono">
                                </td>
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 6: Actual Payment Proof */}
                              <tr className="bg-pink-50/10 dark:bg-pink-950/5 text-pink-850 dark:text-pink-400 border-b-2 border-slate-200 dark:border-slate-800">
                                <td colSpan={3} className="px-3 py-2 border-r border-slate-100 text-right font-bold bg-pink-50/20 dark:bg-pink-950/10 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-2 border-r border-slate-200 font-bold bg-pink-50/20 dark:bg-pink-950/15">Actual Payment Proof</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] bg-pink-50/20 dark:bg-pink-950/10 text-center"></td>
                                <td colSpan={4} className="px-3 py-2 border-r border-slate-200 bg-pink-50/20 dark:bg-pink-950/10 font-bold text-center text-pink-900 dark:text-pink-300 font-mono">Proof of Payment</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  const proofFile = payment?.attachments?.[0];
                                  return (
                                    <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-655' : payment ? 'text-pink-950 dark:text-pink-350 bg-pink-50/40 dark:bg-pink-950/25' : 'text-slate-400 dark:text-slate-500'}`}>
                                      {proofFile ? (
                                        <button
                                          type="button"
                                          onClick={() => handleViewProof(proofFile)}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-[9px] font-bold rounded transition cursor-pointer"
                                        >
                                          <Paperclip className="h-2.5 w-2.5" /> View Proof
                                        </button>
                                      ) : isActive && payment ? (
                                        <span className="text-slate-400 text-[9px]">No Proof</span>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-650 dark:text-slate-350 font-mono">
                                </td>
                                <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>
                            </>
                          )}
                        </span>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {invoicesRes?.data && filteredInvoices.length > 0 && (
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

        const isCancelledPolicy = (selectedInvoice.status as string) === 'voided' || selectedInvoice.status === 'cancelled' || selectedInvoice.policy?.status === 'cancelled' || (selectedInvoice as any).policy?.quotation?.status === 'cancelled';

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

              {isCancelledPolicy && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl mb-5">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">Policy Cancelled / Voided Invoice</h4>
                    <p className="text-xs text-red-600 mt-0.5">Collection payments cannot be recorded or edited for this client because the policy has been cancelled.</p>
                  </div>
                </div>
              )}

              {/* Installment Ledger Section */}
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden mb-5 shadow-sm">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Schedule Ledger</span>
                  <span className="text-[10px] font-extrabold text-[#4A0E17] bg-[#4A0E17]/10 px-3 py-1 rounded-full border border-[#4A0E17]/20 uppercase tracking-wide">
                    {terms} Month Terms
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-[11px] font-medium text-slate-600">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 border-r border-slate-200 bg-slate-100 text-slate-600 font-extrabold min-w-[150px] text-left">LEDGER DETAIL</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 text-center">1st Installment</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 text-center">2nd Installment</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 text-center">3rd Installment</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 text-center">4th Installment</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 text-center">5th Installment</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 text-center">6th Installment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {/* Row 1: Schedule of Payment (Expected Dates) */}
                      <tr>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/50 text-left">Schedule of Payment</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${!isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-800 font-semibold'
                              }`}>
                              {isActive ? getExpectedDateStr(idx) : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 2: Amount of Payment (Expected Amounts) */}
                      <tr>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/50 text-left">Amount of Payment</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${!isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-900 font-bold'
                              }`}>
                              {isActive ? `₱${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 3: Actual Payment Date */}
                      <tr>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50 text-left">Actual Payment Date</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${!isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-600'
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
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

                      {/* Row 4: Actual Amount / Method */}
                      <tr>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50 text-left">Actual Amount & Method</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${!isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-800'
                              }`}>
                              {payment ? (
                                <div className="flex flex-col items-center group relative">
                                  <span className="font-bold">₱{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  {payment.verification_status === 'verified' ? (
                                    <>
                                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                        VERIFIED ({PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method})
                                      </span>
                                      {(() => {
                                        const specialAtt = payment.attachments?.find(
                                          (att) => att.document_type === 'special_attachment' || att.file_name?.toLowerCase().includes('special attachment')
                                        );
                                        if (specialAtt) {
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => handleViewProof(specialAtt)}
                                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold shadow-2xs transition cursor-pointer"
                                              title="View Special Attachment uploaded by Accounting"
                                            >
                                              <Paperclip className="h-2.5 w-2.5 text-amber-700" /> Special File
                                            </button>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </>
                                  ) : payment.verification_status === 'rejected' ? (
                                    <span className="text-[9px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                      REJECTED
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                      PENDING VERIFICATION
                                    </span>
                                  )}
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
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

                      {/* Row 5: Ref / Check / Tracking No. */}
                      <tr>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50 text-left">Ref / Check / Tracking No.</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          if (!isActive) {
                            return (
                              <td key={idx} className="px-2 py-2 border-r border-slate-200 text-center font-mono bg-slate-50 text-slate-350">
                                —
                              </td>
                            );
                          }
                          if (!payment) {
                            return (
                              <td key={idx} className="px-2 py-2 border-r border-slate-200 text-center font-mono text-slate-400">
                                —
                              </td>
                            );
                          }
                          const isTracker = ['jt', 'jrs', 'lbc'].includes(payment.payment_method);
                          const isCheck = payment.payment_method === 'post_dated_checks';
                          const labelType = isTracker ? 'Track No' : (isCheck ? 'Check No' : 'Ref');
                          return (
                            <td key={idx} className="px-2 py-2 border-r border-slate-200 text-center font-mono text-slate-700 text-xs font-semibold">
                              {payment.reference_number ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">{labelType}</span>
                                  <span className="truncate max-w-[100px] block font-semibold" title={payment.reference_number}>{payment.reference_number}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">No Ref</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 6: Proof */}
                      <tr>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-700 bg-slate-50 text-left">Proof of Payment</td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          const payment = isActive ? payments[idx - 1] : null;
                          const proofFile = payment?.attachments?.[0];
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${!isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-700'
                              }`}>
                              {proofFile ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewProof(proofFile)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                  title={`Download proof of payment for installment ${idx}`}
                                >
                                  <Paperclip className="h-2.5 w-2.5" /> View Proof
                                </button>
                              ) : isActive && payment ? (
                                <span className="text-slate-400">No Proof</span>
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
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 text-xs shadow-inner">
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Client</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {selectedInvoice.customer?.first_name} {selectedInvoice.customer?.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Policy Number</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {selectedInvoice.customer?.policy_no || selectedInvoice.policy?.policy_number || '—'}
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
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Premium</span>
                    <span className="font-bold text-slate-800">₱{Number(selectedInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Due Date</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedInvoice.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Remaining balance</span>
                    <span className="font-bold text-[#4A0E17]">₱{Number(selectedInvoice.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    disabled={isCancelledPolicy}
                    placeholder="Enter amount collected..."
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Payment Method *
                    </label>
                    <select
                      disabled={isCancelledPolicy}
                      value={collectMethod}
                      onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      {collectMethod === 'post_dated_checks' ? 'Date of Check *' : 'Date Collected *'}
                    </label>
                    <input
                      type="date"
                      required
                      disabled={isCancelledPolicy}
                      value={collectDate}
                      onChange={(e) => setCollectDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    {isTrackerMethod
                      ? 'Tracking Number *'
                      : (collectMethod === 'post_dated_checks'
                        ? 'Check Number *'
                        : (needsReference
                          ? 'Reference Number *'
                          : 'Reference Number (Optional)'))}
                  </label>
                  <input
                    type="text"
                    disabled={isCancelledPolicy}
                    required={needsReference || isTrackerMethod}
                    placeholder={isTrackerMethod
                      ? "Enter tracking number..."
                      : (collectMethod === 'post_dated_checks'
                        ? "Enter check number..."
                        : (needsReference
                          ? "Enter transaction reference code..."
                          : "e.g. check no., deposit slip id..."))}
                    value={collectReference}
                    onChange={(e) => setCollectReference(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Proof of Payment (Optional)
                  </label>
                  <input
                    key={collectProof ? 'file-loaded' : 'file-empty'}
                    type="file"
                    disabled={isCancelledPolicy}
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setCollectProof(e.target.files[0]);
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {editingPaymentId && selectedInvoice.payments?.find(p => p.id === editingPaymentId)?.attachments?.[0] && (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Current: {selectedInvoice.payments.find(p => p.id === editingPaymentId)?.attachments?.[0].file_name} (Uploading a new file will replace it)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Collection Notes
                  </label>
                  <textarea
                    rows={2}
                    disabled={isCancelledPolicy}
                    placeholder="Record additional payment notes..."
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition resize-none disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                    disabled={isCancelledPolicy || recordCollectionMut.isPending || updateCollectionMut.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-bold rounded-2xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Proof Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              if (previewUrl) window.URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              setPreviewAttachment(null);
            }}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full p-6 border border-slate-100 dark:border-slate-800 animate-scale-in max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setPreviewAttachment(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Paperclip className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate pr-8" title={previewAttachment.file_name}>
                  {previewAttachment.file_name}
                </h3>
                <p className="text-xs text-slate-500">Proof of Payment Attachment</p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[300px] bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 overflow-hidden">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
                  <span className="text-xs text-slate-400">Loading preview...</span>
                </div>
              ) : previewUrl ? (
                previewAttachment.mime_type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={previewAttachment.file_name}
                    className="max-h-[55vh] max-w-full rounded-xl object-contain shadow-sm border border-slate-200/50 bg-white"
                  />
                ) : previewAttachment.mime_type === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[55vh] rounded-xl border border-slate-200 bg-white"
                    title="PDF Proof Preview"
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-slate-350 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Preview not available</p>
                    <p className="text-xs text-slate-400 mt-1">This file format cannot be displayed in-browser. Please download it below.</p>
                  </div>
                )
              ) : (
                <div className="text-center text-rose-600 text-xs">Failed to load preview.</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setPreviewAttachment(null);
                }}
                className="px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadAttachment(previewAttachment.id, previewAttachment.file_name);
                    showToast('Download started.', 'success');
                  } catch (err) {
                    showToast('Failed to download file.', 'error');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
