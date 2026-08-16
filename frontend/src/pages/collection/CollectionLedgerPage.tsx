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
  XCircle,
  Gift,
  Eye
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import FreebieAttachmentModal from '../../components/modals/FreebieAttachmentModal';
import { getInvoices, sendInvoiceReminder, sendCancellationNotice } from '../../services/invoiceApi';
import { recordPayment, updatePayment } from '../../services/paymentApi';
import { updateCustomer } from '../../services/customerApi';
import { downloadAttachment, getAttachmentPreview } from '../../services/attachmentApi';
import { getReportSummary } from '../../services/reportApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Invoice, Payment, PaymentMethod, PaymentFormData } from '../../types/AccountingTypes';
import supremogenLogo from '../../assets/image/Picture1.png';
import supremogenFooter from '../../assets/image/Picture2.png';
import { useAuth } from '../../context/AuthContext';

export default function CollectionLedgerPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles = [] } = useAuth();
  const [searchParams] = useSearchParams();

  const canManageCollection = roles.some((r: string) =>
    ['Collection', 'Administrator', 'Owner', 'Super Admin'].includes(r)
  );
  const isAgentOrRenewal = roles.some((r: string) =>
    ['Sales Agent', 'Team Renewal', 'Renewal'].includes(r)
  );
  const querySearch = searchParams.get('search') || '';

  // Search & Pagination & Filter States
  const [searchVal, setSearchVal] = useState(querySearch);
  const [searchInput, setSearchInput] = useState(querySearch);
  const [invoiceStatus, setInvoiceStatus] = useState('every');
  const [sentUnpaidTermFilter, setSentUnpaidTermFilter] = useState('');
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

  // Schedule editing state
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [customScheduleDates, setCustomScheduleDates] = useState<Record<number, string>>({});

  // Receipt Page View State
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<Invoice | null>(null);

  // Expanded rows state
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<number, boolean>>({});

  // Dual-scroll sync state & refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const isSyncingScroll = useRef<boolean>(false);

  useEffect(() => {
    const updateScrollWidth = () => {
      if (bottomScrollRef.current) {
        setTableScrollWidth(bottomScrollRef.current.scrollWidth);
      }
    };
    updateScrollWidth();
    const observer = new ResizeObserver(updateScrollWidth);
    if (bottomScrollRef.current) {
      observer.observe(bottomScrollRef.current);
    }
    window.addEventListener('resize', updateScrollWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScrollWidth);
    };
  }, []);

  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleBottomScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const toggleExpand = (invoiceId: number) => {
    setExpandedInvoiceIds(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowClick = (row: Invoice) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      if (canManageCollection) {
        handleOpenCollection(row);
      }
    }, 250);
  };

  const handleRowDoubleClick = (row: Invoice) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    toggleExpand(row.id);
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
    setSentUnpaidTermFilter('');
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
  const [freebieModalTarget, setFreebieModalTarget] = useState<Invoice | null>(null);

  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [sendingCancellationNoticeId, setSendingCancellationNoticeId] = useState<number | null>(null);
  const [cancellationNoticeModalTarget, setCancellationNoticeModalTarget] = useState<Invoice | null>(null);

  const sendCancellationNoticeMut = useMutation({
    mutationFn: (invoiceId: number) => {
      setSendingCancellationNoticeId(invoiceId);
      return sendCancellationNotice(invoiceId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast(res.message || 'Notice for Cancellation sent to Sales Agent & Team Renewal!', 'success');
      setSendingCancellationNoticeId(null);
      setCancellationNoticeModalTarget(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to send Notice for Cancellation.', 'error');
      setSendingCancellationNoticeId(null);
    }
  });

  const handleSendNoticeForCancellation = (row: Invoice) => {
    setCancellationNoticeModalTarget(row);
  };

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

  const isPaymentVerified = (payment: Payment | null | undefined): boolean => {
    if (!payment) return false;
    const vStatus = (payment.verification_status || '').trim().toLowerCase();
    return (
      vStatus === 'verified' ||
      vStatus.startsWith('reflected') ||
      vStatus.includes('pbcom') ||
      vStatus.includes('security') ||
      vStatus.includes('jnt') ||
      vStatus.includes('cleared')
    );
  };

  const isPaymentPendingVerification = (payment: Payment | null | undefined): boolean => {
    if (!payment) return false;
    const vStatus = (payment.verification_status || '').trim().toLowerCase();
    const isVerified =
      vStatus === 'verified' ||
      vStatus.startsWith('reflected') ||
      vStatus.includes('pbcom') ||
      vStatus.includes('security') ||
      vStatus.includes('jnt') ||
      vStatus.includes('cleared');
    const isRejected = vStatus === 'rejected';
    return !isVerified && !isRejected;
  };

  const hasPendingVerification = (invoice: Invoice): boolean => {
    if (!invoice.payments || invoice.payments.length === 0) return false;
    return invoice.payments.some(isPaymentPendingVerification);
  };

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-ledger', page, searchVal, invoiceStatus, perPage],
    queryFn: () => getInvoices({
      page: page,
      per_page: perPage,
      search: searchVal,
      status: (invoiceStatus === 'all' || invoiceStatus === 'dst_warning' || invoiceStatus === 'first_payment_alarm' || invoiceStatus === 'sent')
        ? 'sent,partial,overdue,paid'
        : (invoiceStatus === 'every'
            ? 'sent,partial,overdue,paid,overpaid,cancelled,voided'
            : (invoiceStatus === 'voided' ? 'cancelled,voided' : invoiceStatus)),
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

      // All Outstanding filter
      if (invoiceStatus === 'all') {
        const hasUnverified = hasPendingVerification(row);
        if (Number(row.balance) <= 0 && !hasUnverified) return false;
      }

      // Paid filter (Must have no pending verification payments)
      if (invoiceStatus === 'paid') {
        const hasUnverified = hasPendingVerification(row);
        if (Number(row.balance) > 0 || hasUnverified) return false;
      }

      // Sent (Unpaid) Filter & Term Filter (Include records with pending verification payments)
      if (invoiceStatus === 'sent') {
        const hasUnverified = hasPendingVerification(row);
        if (Number(row.balance) <= 0 && !hasUnverified) return false;

        if (sentUnpaidTermFilter) {
          const targetTerm = Number(sentUnpaidTermFilter);
          const terms = Number(customer?.payment_terms || 1);
          if (targetTerm < 1 || targetTerm > 6 || terms < targetTerm) {
            return false;
          }

          const totalPremium = Number(row.total_amount);
          const installmentAmount = totalPremium / terms;
          const payments = [...(row.payments || [])].sort(
            (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
          );

          const isInvoicePaid = Number(row.balance) <= 0 && !hasUnverified;
          const paymentForTerm = payments[targetTerm - 1];
          // A term is ONLY paid if verified AND amount covers installment
          const isTermPaid = isInvoicePaid || (
            paymentForTerm &&
            Number(paymentForTerm.amount) >= (installmentAmount - 0.05) &&
            isPaymentVerified(paymentForTerm)
          );

          if (isTermPaid) {
            return false;
          }
        }
      }

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
        const agent = (
          customer?.agent ||
          (typeof row.created_by === 'object' ? row.created_by?.name : '') ||
          (row.policy as any)?.quotation?.prepared_by?.name ||
          (row.policy as any)?.quotation?.reviewed_by?.name ||
          ''
        ).toLowerCase();
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
  }, [invoicesRes, agentFilter, typeFilter, nameFilter, plateFilter, policyFilter, termFilter, dueMonthFilter, dueYearFilter, dueDayFilter, invoiceStatus, sentUnpaidTermFilter]);

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

      // Strip autoOpen from URL so refresh won't re-trigger
      if (window.location.search.includes('autoOpen')) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('autoOpen');
        window.history.replaceState(null, '', newUrl.pathname + newUrl.search);
      }
    }
  }, [filteredInvoices, searchParams, querySearch, invoicesLoading]);

  // Listen for Escape key press to close modals
  useEffect(() => {
    if (!collectionModalOpen && !previewAttachment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewAttachment) {
          setPreviewAttachment(null);
        } else if (collectionModalOpen) {
          setCollectionModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collectionModalOpen, previewAttachment]);
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
    if (!canManageCollection) return;
    setSelectedInvoice(invoice);
    setCollectAmount(prefilledAmount ? String(prefilledAmount) : String(invoice.balance));
    setIsEditingSchedule(false);
    try {
      const saved = localStorage.getItem(`custom_schedule_${invoice.id}`);
      if (saved) {
        setCustomScheduleDates(JSON.parse(saved));
      } else {
        setCustomScheduleDates({});
      }
    } catch (e) {
      setCustomScheduleDates({});
    }
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

  // Export Collection Ledger records to Excel spreadsheet
  const exportToExcel = () => {
    if (filteredInvoices.length === 0) {
      showToast('No collection records available to export.', 'error');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let rowsHtml = '';
    filteredInvoices.forEach((row: Invoice, idx: number) => {
      const customer = row.customer;
      const terms = Number(customer?.payment_terms || 1);
      const totalPremium = Number(row.total_amount);
      const amountPaid = Number(row.amount_paid);
      const balance = Number(row.balance);
      const installmentAmount = totalPremium / terms;
      const dueAmount = calculateDueAmount(row);

      const payments = [...(row.payments || [])].sort(
        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      );

      const inceptionDateStr = customer?.inception_date;
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

      const currentInstallmentIndex = (() => {
        for (let i = 1; i <= terms; i++) {
          const pay = payments[i - 1];
          if (!pay || Number(pay.amount) < (installmentAmount - 0.05)) {
            return i;
          }
        }
        return terms + 1;
      })();

      const termCellTexts: string[] = [];
      for (let i = 1; i <= 6; i++) {
        if (i > terms) {
          termCellTexts.push('—');
          continue;
        }

        const payment = payments[i - 1];
        const isInvoicePaid = balance <= 0 && !hasPendingVerification(row);
        const isTermVerified = isPaymentVerified(payment);
        const isTermPending = isPaymentPendingVerification(payment);

        const isPaid = isInvoicePaid || (payment && Number(payment.amount) >= (installmentAmount - 0.05) && isTermVerified);
        const isPendingVer = isTermPending;
        const isPartial = !isInvoicePaid && !isPendingVer && payment && Number(payment.amount) > 0 && Number(payment.amount) < (installmentAmount - 0.05);
        const isDue = !isInvoicePaid && !isPaid && !isPendingVer && i === currentInstallmentIndex;

        let dueDateText = '—';
        if (inceptionDateStr) {
          const d = new Date(inceptionDateStr);
          if (!isNaN(d.getTime())) {
            const dateObj = new Date(d.getFullYear(), d.getMonth() + (i - 1), d.getDate());
            dueDateText = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
          }
        }

        let statusText = 'UNPAID';
        if (isPaid) {
          statusText = `Paid (${payment?.amount ? '₱' + Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Full'})`;
        } else if (isPendingVer) {
          statusText = `Pending Verification (₱${Number(payment?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
        } else if (isPartial) {
          statusText = `Partial (₱${Number(payment?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
        } else if (isDue) {
          statusText = `Due (${dueDateText})`;
        } else {
          statusText = `Unpaid (${dueDateText})`;
        }

        termCellTexts.push(statusText);
      }

      const reqDate = customer?.writing_date ? new Date(customer.writing_date).toLocaleDateString('en-US') : '—';
      const incDate = customer?.inception_date ? new Date(customer.inception_date).toLocaleDateString('en-US') : '—';
      const agent = customer?.agent || '—';
      const type = customer?.request_type === 'NEW ACCOUNT' ? 'NEW' : 'RENEWAL';
      const assuredName = customer ? `${customer.first_name} ${customer.last_name}`.toUpperCase() : '—';
      const reqNo = (row as any).policy?.quotation?.quotation_number || (row as any).policy?.quotation?.ir_number || (row as any).quotation_number || customer?.customer_code || '—';
      const policyNo = customer?.policy_no || row.policy?.policy_number || '—';
      const plateNo = customer?.plate_no || '—';
      const statusStr = (row.status || 'sent').toUpperCase();

      rowsHtml += `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${agent}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${reqDate}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${type}</td>
          <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 6px;">${assuredName}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${reqNo}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${policyNo}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${plateNo}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${incDate}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">₱${totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${terms}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px;">₱${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${termCellTexts[0]}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${termCellTexts[1]}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${termCellTexts[2]}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${termCellTexts[3]}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${termCellTexts[4]}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${termCellTexts[5]}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; color: #047857;">₱${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; color: #4A0E17;">₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; color: #be123c;">${dueAmount > 0 ? '₱' + dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${statusStr}</td>
        </tr>
      `;
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Collection Ledger</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
          th { background-color: #4A0E17; color: #ffffff; font-weight: bold; border: 1px solid #330a10; padding: 8px; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .title-row { font-size: 16px; font-weight: bold; color: #4A0E17; }
          .meta-row { font-size: 11px; color: #475569; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colSpan="22" class="title-row" style="font-size: 16px; font-weight: bold; color: #4A0E17;">SUPREMOGEN INSURANCE SERVICES</td></tr>
          <tr><td colSpan="22" style="font-size: 13px; font-weight: bold; color: #1e293b;">COLLECTION PAYMENT LEDGER REPORT</td></tr>
          <tr><td colSpan="22" class="meta-row">Export Date: ${todayStr} | Total Records: ${filteredInvoices.length}</td></tr>
          <tr><td colSpan="22"></td></tr>
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Req Date</th>
              <th>Type</th>
              <th>Assured Name</th>
              <th>Req #</th>
              <th>Policy #</th>
              <th>Plate #</th>
              <th>Inception Date</th>
              <th>Total Premium</th>
              <th>Terms</th>
              <th>Installment Amt</th>
              <th>1st Term</th>
              <th>2nd Term</th>
              <th>3rd Term</th>
              <th>4th Term</th>
              <th>5th Term</th>
              <th>6th Term</th>
              <th>Total Paid</th>
              <th>Balance</th>
              <th>Current Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.download = `Collection_Ledger_${dateStamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Collection Ledger exported to Excel successfully!', 'success');
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
    <div className="space-y-3.5 text-slate-700">
      {/* Page Title & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link to="/dashboard/collection" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Dashboard</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Collection Payment Ledger</h1>
            {!canManageCollection && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold rounded-lg inline-flex items-center gap-1">
                <Eye className="h-3 w-3 text-amber-600" /> Viewing Mode (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Full visual spreadsheet layout for tracking and managing installment collection schedules</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-20 w-20 bg-blue-50/30 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Billings</span>
              <p className="text-xl font-black text-slate-800">
                ₱{collectionMetrics.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <Info className="h-3 w-3" />
            <span>Accumulated amount billed</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-20 w-20 bg-emerald-50/30 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Collected</span>
              <p className="text-xl font-black text-emerald-800">
                ₱{collectionMetrics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-600 font-semibold">Collections active</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-20 w-20 bg-red-50/30 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Outstanding</span>
              <p className="text-xl font-black text-red-800">
                ₱{collectionMetrics.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3 text-rose-500 animate-pulse" />
            <span className="text-rose-600 font-semibold">Pending collections</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-20 w-20 bg-cyan-50/30 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collection Rate</span>
              <p className="text-xl font-black text-cyan-800">
                {collectionMetrics.collectionRate}%
              </p>
            </div>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-3 shadow-sm animate-fade-in">
        {/* Search & Filter Controls */}
        <div className="space-y-2.5">
          {/* Top Row: Search Input + Quick Alarm Chips */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by assured name, plate, policy, agent, invoice #..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition shadow-inner"
              />
              {(searchInput || agentFilter || typeFilter || nameFilter || plateFilter || policyFilter || termFilter || dueMonthFilter || dueDayFilter || dueYearFilter) && (
                <button
                  onClick={handleClearSearchAndFilters}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-3 w-3" />
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
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    invoiceStatus === 'first_payment_alarm'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-sm ring-2 ring-rose-700/20'
                      : 'bg-rose-50/80 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                  }`}
                  title="Filter records with no 1st payment by the 20th of the following month"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${invoiceStatus === 'first_payment_alarm' ? 'bg-white' : 'bg-rose-600'} animate-pulse`} />
                  <span>1st Payment Alarm</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
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
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    invoiceStatus === 'dst_warning'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-600/20'
                      : 'bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100'
                  }`}
                  title="Filter records with 80+ days unpaid since inception"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${invoiceStatus === 'dst_warning' ? 'bg-white' : 'bg-amber-600'} animate-pulse`} />
                  <span>DST Warning</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
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
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-300 transition">
              <Filter className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
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
                <option value="overdue">Overdue</option>
                <option value="overpaid">Overpayment</option>
                <option value="paid">Paid</option>
                <option value="voided">Cancelled / Voided</option>
              </select>
            </div>

            {/* Sent Unpaid Term Filter (Shown when Sent (Unpaid) is selected) */}
            {invoiceStatus === 'sent' && (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 hover:border-amber-300 transition animate-fadeIn">
                <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Unpaid Term:</span>
                <select
                  value={sentUnpaidTermFilter}
                  onChange={(e) => { setSentUnpaidTermFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs font-semibold text-amber-900 focus:outline-none cursor-pointer"
                >
                  <option value="">All Terms Unpaid</option>
                  <option value="1">1st Term Unpaid</option>
                  <option value="2">2nd Term Unpaid</option>
                  <option value="3">3rd Term Unpaid</option>
                  <option value="4">4th Term Unpaid</option>
                  <option value="5">5th Term Unpaid</option>
                  <option value="6">6th Term Unpaid</option>
                </select>
              </div>
            )}

            {/* Type */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-300 transition">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
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
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-300 transition">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Terms:</span>
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
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-300 transition">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Month:</span>
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
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-300 transition">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Year:</span>
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
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Reset
              </button>
            )}

            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ml-auto"
              title="Export filtered collection records to Excel"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>
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
            {/* Top Horizontal Scrollbar */}
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto overflow-y-hidden border border-b-0 border-slate-200 rounded-t-xl bg-slate-100/90 py-0.5 text-slate-400 shadow-xs"
              style={{ width: '100%' }}
            >
              <div style={{ width: `${tableScrollWidth || 1600}px`, height: '2px' }} />
            </div>

            <div
              ref={bottomScrollRef}
              onScroll={handleBottomScroll}
              className="overflow-x-auto rounded-b-xl border border-slate-200 shadow-sm"
            >
              <table className="min-w-[1550px] w-full text-left text-[10px] font-medium text-slate-600 border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[9px] font-bold border-b-2 border-slate-300">
                  <tr>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Agent</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Req Date</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Type</th>
                    <th className="px-2 py-1.5 border-r border-slate-300 min-w-[120px]">Assured Name</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Req #</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Policy #</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Plate #</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Inception</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Total Prem.</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">Terms</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Inst. Amt</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">1st</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">2nd</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">3rd</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">4th</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">5th</th>
                    <th className="px-1 py-1.5 border-r border-slate-300 text-center whitespace-nowrap">6th</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 whitespace-nowrap">Balance</th>
                    <th className="px-1.5 py-1.5 border-r border-slate-300 text-[#4A0E17] font-bold bg-[#4A0E17]/10 whitespace-nowrap">Due</th>
                    <th className="px-1.5 py-1.5 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr className="bg-white">
                      <td colSpan={20} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 rounded-full bg-slate-50 text-slate-400">
                            <Receipt className="h-6 w-6 text-slate-455" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">No record found</span>
                          <span className="text-[11px] text-slate-400 font-normal">Adjust your filters or record collections to display schedules.</span>
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
                      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

                      for (let i = 0; i < 6; i++) {
                        const idx = i + 1;
                        let customYmd = null;
                        try {
                          const saved = localStorage.getItem(`custom_schedule_${row.id}`);
                          if (saved) {
                            const parsed = JSON.parse(saved);
                            if (parsed && parsed[idx]) customYmd = parsed[idx];
                          }
                        } catch (e) {}

                        if (customYmd) {
                          const parts = customYmd.split('-');
                          if (parts.length === 3) {
                            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                            if (!isNaN(d.getTime())) {
                              installmentMonths.push({
                                index: idx,
                                monthName: monthNames[d.getMonth()],
                                year: d.getFullYear(),
                                formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              });
                              continue;
                            }
                          }
                        }

                        if (inceptionDateStr) {
                          const date = new Date(inceptionDateStr);
                          if (!isNaN(date.getTime())) {
                            const d = new Date(date.getFullYear(), date.getMonth() + i, date.getDate());
                            installmentMonths.push({
                              index: idx,
                              monthName: monthNames[d.getMonth()],
                              year: d.getFullYear(),
                              formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            });
                          }
                        }
                      }

                      const dueAmount = calculateDueAmount(row);
                      const isExpanded = !!expandedInvoiceIds[row.id];

                      // Calculate first active due installment index (the first one not fully paid and verified)
                      const currentInstallmentIndex = (() => {
                        for (let i = 1; i <= terms; i++) {
                          const pay = payments[i - 1];
                          if (!pay || Number(pay.amount) < (installmentAmount - 0.05) || !isPaymentVerified(pay)) {
                            return i;
                          }
                        }
                        return terms + 1; // All paid & verified
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
                      const hasNoticeForCancellation = isAgentOrRenewal && ((row.notes && row.notes.includes('Notice for Cancellation')) || ((row as any).policy?.quotation?.status === 'cancellation_requested'));

                      return (
                        <span key={row.id} className="contents">
                          {/* Row 1: Header row / General Details */}
                          <tr
                            onClick={() => handleRowClick(row)}
                            onDoubleClick={() => handleRowDoubleClick(row)}
                            className={`transition-all text-[10px] cursor-pointer select-none border-b border-slate-300 ${
                              isExpanded
                                ? 'bg-amber-100/90 dark:bg-amber-950/60 text-slate-900 border-l-4 border-l-[#4A0E17] font-bold shadow-xs'
                                : hasNoticeForCancellation
                                  ? 'bg-amber-500/20 dark:bg-amber-950/50 hover:bg-amber-500/30 text-slate-900 border-l-4 border-l-amber-600 font-bold shadow-xs'
                                  : isDstWarning
                                    ? 'bg-amber-50/30 hover:bg-amber-50/60 text-slate-800 border-l-2 border-l-amber-500 font-medium'
                                    : isCancelledPolicy
                                      ? 'bg-rose-50/40 hover:bg-rose-50 text-slate-800 border-l-2 border-l-rose-600'
                                      : isFirstPaymentAlarm
                                        ? 'bg-white hover:bg-slate-50 text-slate-800 border-l-2 border-l-rose-500 font-medium'
                                        : isHighlighted
                                          ? 'bg-white hover:bg-slate-50 text-slate-800 border-l-2 border-l-rose-500 font-medium'
                                          : 'bg-white hover:bg-slate-50 text-slate-800'
                              }`}
                          >
                            <td className="px-1.5 py-1 border-r border-slate-300 text-slate-700 font-medium">
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(row.id);
                                  }}
                                  className={`p-0.5 rounded transition cursor-pointer shrink-0 ${
                                    isExpanded
                                      ? 'bg-[#4A0E17] text-white shadow-2xs'
                                      : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                                  }`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-white" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                                <span className="truncate max-w-[80px]">{customer?.agent || '—'}</span>
                              </div>
                            </td>
                            <td className="px-1.5 py-1 border-r border-slate-300 text-[9.5px] text-slate-500 font-medium whitespace-nowrap">
                              {customer?.writing_date ? new Date(customer.writing_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '—'}
                            </td>
                            <td className="px-1.5 py-1 border-r border-slate-300 whitespace-nowrap">
                              <span className={`px-1 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-tight ${customer?.request_type === 'NEW ACCOUNT' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
                                {customer?.request_type === 'NEW ACCOUNT' ? 'NEW' : 'RENEWAL'}
                              </span>
                            </td>
                            <td className="px-2 py-1 border-r border-slate-300 font-bold uppercase tracking-tight">
                              <div className="text-slate-900 font-bold text-[10.5px] truncate max-w-[130px] flex items-center gap-1">
                                <span>{customer ? `${customer.first_name} ${customer.last_name}` : '—'}</span>
                                {isExpanded && (
                                  <span className="px-1 py-0.1 rounded text-[7.5px] font-black bg-[#4A0E17] text-white uppercase tracking-wider">OPEN</span>
                                )}
                              </div>
                              {isCancelledPolicy && (
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 tracking-wide whitespace-nowrap uppercase">
                                    <XCircle className="h-2 w-2 text-rose-600" /> CANCELLED
                                  </span>
                                </div>
                              )}
                              {isFirstPaymentAlarm && !isCancelledPolicy && (
                                <div className="mt-0.5">
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 tracking-wide whitespace-nowrap"
                                    title="No 1st payment recorded as of 20th."
                                  >
                                    <span className="h-1 w-1 rounded-full bg-rose-600 animate-pulse flex-shrink-0" />
                                    Unpaid 1st
                                  </span>
                                </div>
                              )}
                              {isDstWarning && !isFirstPaymentAlarm && !isCancelledPolicy && (
                                <div className="mt-0.5">
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 tracking-wide whitespace-nowrap"
                                    title={`DST WARNING: ${dstWarningDays} days passed.`}
                                  >
                                    <span className="h-1 w-1 rounded-full bg-amber-600 animate-pulse flex-shrink-0" />
                                    DST ({dstWarningDays}d)
                                  </span>
                                </div>
                              )}
                              {customer && (customer.mobile || customer.phone || customer.email) && (
                                <div className="text-[8.5px] text-slate-400 font-normal normal-case mt-0.5 truncate max-w-[130px]">
                                  {customer.mobile || customer.phone || ''} {customer.email ? `• ${customer.email}` : ''}
                                </div>
                              )}
                            </td>
                            <td className="px-1.5 py-1 border-r border-slate-300 text-[10px] font-mono text-blue-700 font-bold whitespace-nowrap">
                              {(row as any).policy?.quotation?.quotation_number || (row as any).policy?.quotation?.ir_number || (row as any).quotation_number || customer?.customer_code || '—'}
                            </td>
                            <td className="px-1.5 py-1 border-r border-slate-300 text-[10px] text-slate-700 font-semibold uppercase whitespace-nowrap truncate max-w-[85px]">{customer?.policy_no || row.policy?.policy_number || '—'}</td>
                            <td className="px-1.5 py-1 border-r border-slate-300 text-[10px] text-slate-600 font-medium uppercase whitespace-nowrap truncate max-w-[65px]">{customer?.plate_no || '—'}</td>
                            <td className="px-1.5 py-1 border-r border-slate-300 text-[9.5px] text-slate-500 font-medium whitespace-nowrap">
                              {customer?.inception_date ? new Date(customer.inception_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '—'}
                            </td>
                            <td className="px-1.5 py-1 border-r border-slate-300 font-bold text-slate-800 whitespace-nowrap">₱{totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-1 py-1 border-r border-slate-300 text-center font-semibold text-slate-600">{terms}</td>
                            <td className="px-1.5 py-1 border-r border-slate-300 text-slate-700 font-medium whitespace-nowrap">₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                            {[1, 2, 3, 4, 5, 6].map((idx) => {
                              const monthInfo = installmentMonths[idx - 1];
                              const isActive = idx <= terms;
                              const payment = isActive ? payments[idx - 1] : null;

                              const isInvoicePaid = Number(row.balance) <= 0 && !hasPendingVerification(row);
                              const isTermVerified = isPaymentVerified(payment);
                              const isTermPending = isPaymentPendingVerification(payment);

                              const isPaid = isActive && (isInvoicePaid || (payment && Number(payment.amount) >= (installmentAmount - 0.05) && isTermVerified));
                              const isPendingVer = isActive && isTermPending;
                              const isPartial = isActive && !isInvoicePaid && !isPendingVer && payment && Number(payment.amount) > 0 && Number(payment.amount) < (installmentAmount - 0.05);
                              const isDue = isActive && !isInvoicePaid && !isPaid && !isPendingVer && idx === currentInstallmentIndex;

                              const cellDueDate = inceptionDateStr ? new Date(new Date(inceptionDateStr).getFullYear(), new Date(inceptionDateStr).getMonth() + idx - 1, new Date(inceptionDateStr).getDate()) : null;
                              const isCellOverdue = terms >= 3 && terms <= 6 && cellDueDate && isActive && !isPaid && !isPendingVer && (() => {
                                const today = new Date();
                                const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const cellMidnight = new Date(cellDueDate.getFullYear(), cellDueDate.getMonth(), cellDueDate.getDate());
                                const diff = todayMidnight.getTime() - cellMidnight.getTime();
                                return Math.floor(diff / (1000 * 60 * 60 * 24)) > 3;
                              })();

                              const suffix = idx === 1 ? 'ST' : idx === 2 ? 'ND' : idx === 3 ? 'RD' : 'TH';

                              return (
                                <td key={idx} className={`px-1 py-1 border-r border-slate-300 text-center transition-all ${!isActive
                                  ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-650'
                                  : isPaid
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                    : isPendingVer
                                      ? 'bg-amber-50/70 dark:bg-amber-950/30'
                                      : isPartial
                                        ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                        : isDue
                                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                          : 'dark:bg-slate-900/10'
                                  }`}>
                                  {isActive ? (
                                    <div className="flex flex-col items-center justify-center gap-0">
                                      <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none">{idx}{suffix} ({monthInfo?.monthName})</span>
                                      <span className={`text-[9px] font-mono font-bold leading-tight ${isPaid
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : isPendingVer
                                          ? 'text-amber-800 dark:text-amber-300 font-bold'
                                          : isPartial
                                            ? 'text-amber-700 dark:text-amber-400 font-bold'
                                            : isDue
                                              ? 'text-rose-700 dark:text-rose-400'
                                              : 'text-slate-655 dark:text-slate-350'
                                        }`}>
                                        ₱{installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className={`text-[7px] font-extrabold uppercase mt-0.5 px-0.5 py-0.2 rounded leading-none inline-flex items-center gap-0.5 border border-transparent ${isPaid
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/30'
                                        : isPendingVer
                                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/50 animate-pulse'
                                          : isPartial
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/30 animate-pulse'
                                            : isDue
                                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/30 animate-pulse'
                                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700/50'
                                        }`}>
                                        <span>{isPaid ? 'Paid' : isPendingVer ? 'Pending' : isPartial ? 'Partial' : isDue ? 'Due' : 'Unpaid'}</span>
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
                            <td className="px-1.5 py-1 border-r border-slate-300 font-mono font-black text-[#4A0E17] dark:text-[#f28b99]">
                              {(Number((row as any).amount_paid) - Number((row as any).total_amount)) >= 1.00 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-slate-400 font-normal line-through text-[9px]">₱0.00</span>
                                  <span className="px-1 py-0.2 bg-purple-100 text-purple-900 border border-purple-300 rounded text-[8px] font-extrabold uppercase whitespace-nowrap">
                                    +₱{(Number((row as any).amount_paid) - Number((row as any).total_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })} OVER
                                  </span>
                                </div>
                              ) : (
                                `₱${Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              )}
                            </td>
                            <td className="px-1.5 py-1 border-r border-slate-300 font-mono font-black text-rose-800 dark:text-rose-450 bg-rose-50/40 dark:bg-rose-950/20">
                              {dueAmount > 0 ? (
                                <span className="px-1 py-0.2 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-350 rounded text-[9.5px] font-extrabold animate-pulse border border-rose-200 dark:border-rose-900/30">
                                  ₱{dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-1.5 py-1 text-center border-slate-300" rowSpan={isExpanded ? 6 : 1} onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-center gap-0.5">
                                <button
                                  onClick={() => printReceiptHtml(row)}
                                  className="w-full inline-flex items-center justify-center gap-1 px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[9.5px] font-bold uppercase tracking-wider rounded transition-all hover:scale-[1.02] cursor-pointer"
                                >
                                  <FileText className="h-2.5 w-2.5" /> Receipt
                                </button>
                                {(() => {
                                  const rowAny = row as any;
                                  const freebieAttCount = [
                                    ...(rowAny.attachments || []),
                                    ...(rowAny.policy?.quotation?.attachments || []),
                                    ...((rowAny.payments || []).flatMap((p: any) => p.attachments || []))
                                  ].filter(
                                    att => att.document_type === 'freebie_proof' ||
                                           att.document_type?.toLowerCase().includes('freebie') ||
                                           att.file_name?.toLowerCase().includes('freebie')
                                  ).length;

                                  const isPaidOrHasFreebie = (row.status as string) === 'paid' ||
                                    (row.status as string) === 'overpaid' ||
                                    (row.balance !== undefined && Number(row.balance) <= 0 && Number(row.total_amount || 0) > 0) ||
                                    freebieAttCount > 0;

                                  if (!isPaidOrHasFreebie) return null;

                                  return (
                                    <button
                                      onClick={() => setFreebieModalTarget(row)}
                                      className={`w-full whitespace-nowrap inline-flex items-center justify-center gap-0.5 px-1 py-0.2 text-[9px] font-bold rounded border transition-all active:scale-95 cursor-pointer shadow-2xs ${
                                        freebieAttCount > 0
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80'
                                          : 'bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100/80'
                                      }`}
                                      title={freebieAttCount > 0 ? `${freebieAttCount} Freebie Proof Attachment(s) Uploaded` : 'Upload / View Freebie Delivery Proof'}
                                    >
                                      <Gift className={`h-2.5 w-2.5 shrink-0 ${freebieAttCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                                      <span>{freebieAttCount > 0 ? `Freebie (${freebieAttCount})` : 'Freebie'}</span>
                                    </button>
                                  );
                                })()}

                                {isExpanded && (
                                  <button
                                    onClick={() => handleSendNoticeForCancellation(row)}
                                    disabled={sendingCancellationNoticeId === row.id}
                                    className={`w-full whitespace-nowrap inline-flex items-center justify-center gap-0.5 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-tight rounded border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-2xs mt-0.5 ${
                                      (row.notes && row.notes.includes('Notice for Cancellation'))
                                        ? 'bg-rose-100/80 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-rose-700 hover:bg-rose-800 text-white border-rose-800'
                                    }`}
                                    title="Issue Notice for Cancellation to Sales Agent & Team Renewal"
                                  >
                                    {sendingCancellationNoticeId === row.id ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <AlertTriangle className="h-2.5 w-2.5 text-amber-300" />
                                    )}
                                    <span>{(row.notes && row.notes.includes('Notice for Cancellation')) ? 'Notice Sent' : 'Notice Cancellation'}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <>
                              {/* Row 2: Schedule of Payment */}
                              <tr className="bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-b border-slate-300 border-l-4 border-l-[#4A0E17]">
                                <td colSpan={3} className="px-2.5 py-1 border-r border-slate-300 text-right font-bold bg-emerald-50/40 dark:bg-emerald-950/30 text-[9.5px] uppercase tracking-wide">Automatic</td>
                                <td colSpan={2} className="px-3 py-1 border-r border-slate-300 font-bold bg-emerald-50/40 dark:bg-emerald-950/35 text-xs">Schedule of Payment</td>
                                <td className="px-2.5 py-1 border-r border-slate-300 font-mono text-[9.5px] bg-emerald-50/40 dark:bg-emerald-950/30 text-center font-bold">Automatic</td>
                                <td colSpan={5} className="px-2.5 py-1 border-r border-slate-300 bg-emerald-50/40 dark:bg-emerald-950/30 font-bold text-center text-xs">Installment Due Dates</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const monthInfo = installmentMonths[idx - 1];
                                  const isActive = idx <= terms;
                                  return (
                                    <td key={idx} className={`px-1.5 py-1 border-r border-slate-300 text-center font-mono text-[9.5px] font-semibold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-655' : 'text-emerald-950 dark:text-emerald-350 bg-emerald-50/50 dark:bg-emerald-950/40'}`}>
                                      {isActive ? monthInfo?.formattedDate : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-2.5 py-1 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                                <td className="px-2.5 py-1 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 3: Amount of Payment */}
                              <tr className="bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-b border-slate-300 border-l-4 border-l-[#4A0E17]">
                                <td colSpan={3} className="px-3 py-1.5 border-r border-slate-300 text-right font-bold bg-emerald-50/40 dark:bg-emerald-950/30 text-[10px] uppercase tracking-wide">Automatic</td>
                                <td colSpan={2} className="px-4 py-1.5 border-r border-slate-300 font-bold bg-emerald-50/40 dark:bg-emerald-950/35">Amount of Payment</td>
                                <td className="px-3 py-1.5 border-r border-slate-300 font-mono text-[10px] bg-emerald-50/40 dark:bg-emerald-950/30 text-center font-bold">Automatic</td>
                                <td colSpan={5} className="px-3 py-1.5 border-r border-slate-300 bg-emerald-50/40 dark:bg-emerald-950/30 font-bold text-center">Target Amount Per Installment</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  return (
                                    <td key={idx} className={`px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] font-bold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-650' : 'text-emerald-950 dark:text-emerald-350 bg-emerald-50/50 dark:bg-emerald-950/40'}`}>
                                      {isActive ? `₱${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 4: Actual Payment Date */}
                              <tr className="bg-pink-50/30 dark:bg-pink-950/20 text-pink-900 dark:text-pink-300 border-b border-slate-300 border-l-4 border-l-[#4A0E17]">
                                <td colSpan={3} className="px-3 py-1.5 border-r border-slate-300 text-right font-bold bg-pink-50/40 dark:bg-pink-950/30 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-1.5 border-r border-slate-300 font-bold bg-pink-50/40 dark:bg-pink-950/35">Actual Payment Date</td>
                                <td className="px-3 py-1.5 border-r border-slate-300 font-mono text-[10px] bg-pink-50/40 dark:bg-pink-950/30 text-center"></td>
                                <td colSpan={5} className="px-3 py-1.5 border-r border-slate-300 bg-pink-50/40 dark:bg-pink-950/30 font-bold text-center text-pink-900 dark:text-pink-300">Recorded Dates Collected</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  return (
                                    <td key={idx} className={`px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-650' : payment ? 'text-pink-955 dark:text-pink-350 bg-pink-50/50 dark:bg-pink-950/35 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                                      {payment ? new Date(payment.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-650 dark:text-slate-350 font-mono">
                                  {row.balance <= 0 ? 'PAID IN FULL' : 'PARTIAL'}
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 5: Actual Amount Payment */}
                              <tr className="bg-pink-50/30 dark:bg-pink-950/20 text-pink-900 dark:text-pink-300 border-b border-slate-300 border-l-4 border-l-[#4A0E17]">
                                <td colSpan={3} className="px-3 py-1.5 border-r border-slate-300 text-right font-bold bg-pink-50/40 dark:bg-pink-950/30 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-1.5 border-r border-slate-300 font-bold bg-pink-50/40 dark:bg-pink-950/35">Actual Amount Payment</td>
                                <td className="px-3 py-1.5 border-r border-slate-300 font-mono text-[10px] bg-pink-50/40 dark:bg-pink-950/30 text-center"></td>
                                <td colSpan={5} className="px-3 py-1.5 border-r border-slate-300 bg-pink-50/40 dark:bg-pink-950/30 font-bold text-center text-pink-900 dark:text-pink-300 font-mono">Amount Paid & Method</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  return (
                                    <td key={idx} className={`px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] font-bold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-655' : payment ? 'text-pink-950 dark:text-pink-350 bg-pink-50/50 dark:bg-pink-950/35' : 'text-slate-400 dark:text-slate-500'}`}>
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
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-emerald-800 dark:text-emerald-400 font-mono">
                                  ₱{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 5.5: Actual Reference / Check / Tracker */}
                              <tr className="bg-pink-50/30 dark:bg-pink-950/20 text-pink-900 dark:text-pink-300 border-b border-slate-300 border-l-4 border-l-[#4A0E17]">
                                <td colSpan={3} className="px-3 py-1.5 border-r border-slate-300 text-right font-bold bg-pink-50/40 dark:bg-pink-950/30 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-1.5 border-r border-slate-300 font-bold bg-pink-50/40 dark:bg-pink-950/35">Actual Reference / Check / Tracker</td>
                                <td className="px-3 py-1.5 border-r border-slate-300 font-mono text-[10px] bg-pink-50/40 dark:bg-pink-950/30 text-center"></td>
                                <td colSpan={5} className="px-3 py-1.5 border-r border-slate-300 bg-pink-50/40 dark:bg-pink-950/30 font-bold text-center text-pink-900 dark:text-pink-300 font-mono">Ref / Check / Tracking No.</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  if (!isActive) {
                                    return (
                                      <td key={idx} className="px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] bg-slate-50 dark:bg-slate-900/40 text-slate-350 dark:text-slate-650">
                                        —
                                      </td>
                                    );
                                  }
                                  if (!payment) {
                                    return (
                                      <td key={idx} className="px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                        —
                                      </td>
                                    );
                                  }
                                  const isTracker = ['jt', 'jrs', 'lbc'].includes(payment.payment_method);
                                  const isCheck = payment.payment_method === 'post_dated_checks';
                                  const labelType = isTracker ? 'Track No' : (isCheck ? 'Check No' : 'Ref');
                                  return (
                                    <td key={idx} className="px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-pink-50/50 dark:bg-pink-950/35">
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
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-650 dark:text-slate-350 font-mono">
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
                              </tr>

                              {/* Row 6: Actual Payment Proof */}
                              <tr className="bg-pink-50/30 dark:bg-pink-950/20 text-pink-900 dark:text-pink-300 border-b-2 border-slate-400 border-l-4 border-l-[#4A0E17]">
                                <td colSpan={3} className="px-3 py-1.5 border-r border-slate-300 text-right font-bold bg-pink-50/40 dark:bg-pink-950/30 text-[10px]"></td>
                                <td colSpan={2} className="px-4 py-1.5 border-r border-slate-300 font-bold bg-pink-50/40 dark:bg-pink-950/35">Actual Payment Proof</td>
                                <td className="px-3 py-1.5 border-r border-slate-300 font-mono text-[10px] bg-pink-50/40 dark:bg-pink-950/30 text-center"></td>
                                <td colSpan={5} className="px-3 py-1.5 border-r border-slate-300 bg-pink-50/40 dark:bg-pink-950/30 font-bold text-center text-pink-900 dark:text-pink-300 font-mono">Proof of Payment</td>

                                {[1, 2, 3, 4, 5, 6].map((idx) => {
                                  const isActive = idx <= terms;
                                  const payment = isActive ? payments[idx - 1] : null;
                                  const proofFile = payment?.attachments?.[0];
                                  return (
                                    <td key={idx} className={`px-2 py-1.5 border-r border-slate-300 text-center font-mono text-[10px] font-semibold ${!isActive ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-655' : payment ? 'text-pink-950 dark:text-pink-350 bg-pink-50/40 dark:bg-pink-950/25' : 'text-slate-400 dark:text-slate-500'}`}>
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
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-650 dark:text-slate-350 font-mono"></td>
                                <td className="px-3 py-1.5 border-r border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"></td>
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
      {canManageCollection && collectionModalOpen && selectedInvoice && (() => {
        const customer = selectedInvoice.customer;
        const terms = Number(customer?.payment_terms || 1);
        const totalPremium = Number(selectedInvoice.total_amount);
        const installmentAmount = totalPremium / terms;
        const inceptionDateStr = customer?.inception_date;

        // Sort payments sequentially by date
        const payments = [...(selectedInvoice.payments || [])].sort(
          (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
        );

        const getExpectedYmd = (idx: number) => {
          if (customScheduleDates[idx]) return customScheduleDates[idx];
          if (!inceptionDateStr) return '';
          const date = new Date(inceptionDateStr);
          if (isNaN(date.getTime())) return '';
          const d = new Date(date.getFullYear(), date.getMonth() + idx - 1, date.getDate());
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        const getExpectedDateStr = (idx: number) => {
          const ymd = getExpectedYmd(idx);
          if (!ymd) return '—';
          const parts = ymd.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(d.getTime())) {
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }
          }
          return ymd;
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
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/50 text-left">
                          <div className="flex items-center justify-between gap-1">
                            <span>Schedule of Payment</span>
                            {!isEditingSchedule ? (
                              <button
                                type="button"
                                onClick={() => setIsEditingSchedule(true)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer transition shadow-2xs"
                                title="Click to customize schedule dates"
                              >
                                <Pencil className="h-2.5 w-2.5" /> Edit
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      localStorage.setItem(`custom_schedule_${selectedInvoice.id}`, JSON.stringify(customScheduleDates));
                                      if (selectedInvoice.customer?.id && customScheduleDates[1]) {
                                        await updateCustomer(selectedInvoice.customer.id, {
                                          inception_date: customScheduleDates[1]
                                        } as any);
                                      }
                                      showToast('Payment schedule updated successfully', 'success');
                                      queryClient.invalidateQueries({ queryKey: ['invoices'] });
                                    } catch (e) {
                                      showToast('Failed to save schedule update', 'error');
                                    }
                                    setIsEditingSchedule(false);
                                  }}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer transition shadow-2xs"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingSchedule(false);
                                    try {
                                      const saved = localStorage.getItem(`custom_schedule_${selectedInvoice.id}`);
                                      if (saved) setCustomScheduleDates(JSON.parse(saved));
                                      else setCustomScheduleDates({});
                                    } catch (e) {}
                                  }}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition shadow-2xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        {[1, 2, 3, 4, 5, 6].map((idx) => {
                          const isActive = idx <= terms;
                          return (
                            <td key={idx} className={`px-2 py-2 border-r border-slate-200 text-center font-mono ${!isActive ? 'bg-slate-50 text-slate-350' : 'text-slate-800 font-semibold'
                              }`}>
                              {isActive ? (
                                isEditingSchedule ? (
                                  <input
                                    type="date"
                                    value={getExpectedYmd(idx)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCustomScheduleDates((prev) => ({
                                        ...prev,
                                        [idx]: val
                                      }));
                                    }}
                                    className="text-[10px] px-1 py-0.5 border border-blue-400 rounded bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                  />
                                ) : (
                                  getExpectedDateStr(idx)
                                )
                              ) : '—'}
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
                                  {(() => {
                                    const vStatus = (payment.verification_status || '').trim().toLowerCase();
                                    const isVerifiedStatus =
                                      vStatus === 'verified' ||
                                      vStatus.startsWith('reflected') ||
                                      vStatus.includes('pbcom') ||
                                      vStatus.includes('security') ||
                                      vStatus.includes('jnt') ||
                                      vStatus.includes('cleared');
                                    const isRejectedStatus = vStatus === 'rejected';

                                    if (isVerifiedStatus) {
                                      const labelText = vStatus === 'verified'
                                        ? (PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method)
                                        : payment.verification_status!.toUpperCase();

                                      return (
                                        <>
                                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                            VERIFIED ({labelText})
                                          </span>
                                          {(() => {
                                            const specialAtts = payment.attachments?.filter(
                                              (att) => att.document_type === 'special_attachment' || att.file_name?.toLowerCase().includes('special attachment')
                                            ) || [];
                                            if (specialAtts.length === 1) {
                                              return (
                                                <button
                                                  type="button"
                                                  onClick={() => handleViewProof(specialAtts[0])}
                                                  className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold shadow-2xs transition cursor-pointer"
                                                  title={`View Special Attachment (${specialAtts[0].file_name})`}
                                                >
                                                  <Paperclip className="h-2.5 w-2.5 text-amber-700" /> Special File
                                                </button>
                                              );
                                            }
                                            if (specialAtts.length > 1) {
                                              return (
                                                <button
                                                  type="button"
                                                  onClick={() => handleViewProof(specialAtts[0])}
                                                  className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold shadow-2xs transition cursor-pointer"
                                                  title={`View all ${specialAtts.length} special attachments`}
                                                >
                                                  <Paperclip className="h-2.5 w-2.5 text-amber-700" /> Special Files ({specialAtts.length})
                                                </button>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </>
                                      );
                                    }

                                    if (isRejectedStatus) {
                                      return (
                                        <span className="text-[9px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                          REJECTED
                                        </span>
                                      );
                                    }

                                    return (
                                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md mt-0.5 uppercase leading-none">
                                        PENDING VERIFICATION
                                      </span>
                                    );
                                  })()}
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

      {/* Freebie Attachment Modal */}
      {freebieModalTarget && (
        <FreebieAttachmentModal
          isOpen={Boolean(freebieModalTarget)}
          onClose={() => setFreebieModalTarget(null)}
          attachableType="invoice"
          attachableId={freebieModalTarget.id}
          title={freebieModalTarget.invoice_number || `INV-${freebieModalTarget.id}`}
          customerName={
            freebieModalTarget.customer
              ? (freebieModalTarget.customer.full_name || [freebieModalTarget.customer.first_name, freebieModalTarget.customer.last_name].filter(Boolean).join(' ') || freebieModalTarget.customer.company_name)
              : 'Assured Customer'
          }
          isCancelled={Boolean(
            freebieModalTarget.status === 'cancelled' ||
            (freebieModalTarget.status as string) === 'voided' ||
            freebieModalTarget.policy?.status === 'cancelled' ||
            (freebieModalTarget as any).policy?.quotation?.status === 'cancelled'
          )}
          freebieInfo={
            (freebieModalTarget as any).policy?.quotation?.items?.[0]?.coverage_details?.calculator?.freebie_amount ??
            ((freebieModalTarget as any).policy?.quotation?.items?.[0]?.coverage_details?.calculator?.freebie_cashback || (freebieModalTarget.customer as any)?.freebie || 0)
          }
          onAttachmentUploaded={() => queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] })}
        />
      )}

      {/* Notice for Cancellation Professional Confirmation Modal */}
      {cancellationNoticeModalTarget && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setCancellationNoticeModalTarget(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/40">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                    Notice for Cancellation
                  </h3>
                  <p className="text-xs text-slate-500">Dispatch cancellation notice alert to Sales & Renewal Team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellationNoticeModalTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Record Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Policy Number:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {cancellationNoticeModalTarget.customer?.policy_no || cancellationNoticeModalTarget.policy?.policy_number || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Assured Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {cancellationNoticeModalTarget.customer ? `${cancellationNoticeModalTarget.customer.first_name} ${cancellationNoticeModalTarget.customer.last_name}` : 'Assured Customer'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Assigned Agent:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {cancellationNoticeModalTarget.customer?.agent || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-medium">Outstanding Balance:</span>
                <span className="font-bold text-rose-700 dark:text-rose-400">
                  ₱{Number(cancellationNoticeModalTarget.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Warning Callout Box */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Important Notice:</p>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-350">
                  This action sends an official notification alert to the <strong>Sales Agent</strong> and <strong>Team Renewal</strong> so they can process the official Cancellation Request.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancellationNoticeModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingCancellationNoticeId === cancellationNoticeModalTarget.id}
                onClick={() => {
                  sendCancellationNoticeMut.mutate(cancellationNoticeModalTarget.id);
                }}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {sendingCancellationNoticeId === cancellationNoticeModalTarget.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                )}
                <span>Send Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
