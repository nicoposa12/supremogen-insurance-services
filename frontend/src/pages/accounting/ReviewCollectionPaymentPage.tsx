import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Paperclip,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  Download,
  Building2,
  Truck,
  Filter,
  Gift,
  Eye,
  Hash,
  Trash2,
  Edit3
} from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import FreebieAttachmentModal from '../../components/modals/FreebieAttachmentModal';
import { getPayments, verifyPayment, checkPaymentRefNo } from '../../services/paymentApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Payment, PaymentListParams } from '../../types/AccountingTypes';
import { getDownloadUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';

export default function ReviewCollectionPaymentPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { token, roles = [] } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamVal = searchParams.get('search') || '';
  const autoOpenModal = searchParams.get('autoOpen') === 'true';

  const isAccountingOrAdmin = roles.some((r: string) =>
    ['Accounting Officer', 'Team Support Operation', 'Administrator', 'Owner', 'Super Admin'].includes(r)
  );

  const [params, setParams] = useState<PaymentListParams>({
    page: 1,
    per_page: 15,
    search: searchParamVal,
    verification_status: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const [searchInput, setSearchInput] = useState(searchParamVal);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationRefNo, setVerificationRefNo] = useState('');
  const [actionType, setActionType] = useState<'verified' | 'rejected' | null>(null);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('REFLECTED PBCOM');
  const [specialFiles, setSpecialFiles] = useState<File[]>([]);
  const [deletingAttId, setDeletingAttId] = useState<number | null>(null);
  const [freebieModalTarget, setFreebieModalTarget] = useState<Payment | null>(null);

  // Duplicate Reference Number Validation States
  const [duplicateRefPaymentNumber, setDuplicateRefPaymentNumber] = useState<string | null>(null);
  const [isCheckingRef, setIsCheckingRef] = useState<boolean>(false);

  const hasAutoOpenedRef = useRef(false);

  // Auto-sync search parameters when clicking notifications
  useEffect(() => {
    if (searchParamVal) {
      setSearchInput(searchParamVal);
      setParams((p) => ({ ...p, search: searchParamVal, page: 1 }));
      hasAutoOpenedRef.current = false;
    }
  }, [searchParamVal]);

  // Real-time automatic search debounce (without hitting Enter)
  useEffect(() => {
    const handler = setTimeout(() => {
      setParams((p) => {
        if (p.search === searchInput) return p;
        return { ...p, search: searchInput, page: 1 };
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Proof Preview Modal States
  const [previewAttachment, setPreviewAttachment] = useState<{ id: number; file_name: string; mime_type?: string } | null>(null);
  const [previewAttachmentsList, setPreviewAttachmentsList] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleViewProof = async (att: any, allAtts?: any[]) => {
    setIsPreviewLoading(true);
    setPreviewAttachment(att);
    if (allAtts && allAtts.length > 0) {
      setPreviewAttachmentsList(allAtts);
    } else {
      setPreviewAttachmentsList([att]);
    }
    setPreviewUrl(null);
    try {
      const { data } = await axios.get(`/api/v1/attachments/${att.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(data);
      setPreviewUrl(blobUrl);
    } catch (err: any) {
      if (err?.response?.status === 410) {
        showToast('This file was uploaded before cloud storage was configured and is no longer available. Please re-upload the document.', 'error');
      } else {
        showToast('Failed to load proof attachment.', 'error');
      }
      setPreviewAttachment(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewAttachment(null);
    setPreviewAttachmentsList([]);
  };

  // Fetch payments
  const { data: response, isLoading } = useQuery({
    queryKey: ['payments-review', params],
    queryFn: () => getPayments(params),
    refetchInterval: 4000,
  });

  const pagination = response?.data;
  const payments = pagination?.data ?? [];

  // Real-time Duplicate Reference Number validation effect
  useEffect(() => {
    const trimmed = verificationRefNo.trim();
    if (!trimmed || !selectedPayment) {
      setDuplicateRefPaymentNumber(null);
      return;
    }

    // Fast local dataset check first
    const localDup = payments.find(
      (p) =>
        p.id !== selectedPayment.id &&
        ((p.accounting_ref_no && p.accounting_ref_no.trim().toLowerCase() === trimmed.toLowerCase()) ||
          (p.reference_number && p.reference_number.trim().toLowerCase() === trimmed.toLowerCase()))
    );

    if (localDup) {
      setDuplicateRefPaymentNumber(localDup.payment_number);
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setIsCheckingRef(true);
        const res = await checkPaymentRefNo(trimmed, selectedPayment.id);
        if (isMounted) {
          if (res.is_duplicate && res.duplicate_payment) {
            setDuplicateRefPaymentNumber(res.duplicate_payment.payment_number);
          } else if (!localDup) {
            setDuplicateRefPaymentNumber(null);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsCheckingRef(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [verificationRefNo, selectedPayment, payments]);

  // Auto-open verify modal when coming from notification link (only once per query search)
  useEffect(() => {
    if (autoOpenModal && payments.length > 0 && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      const match = payments.find(
        (p) =>
          p.payment_number?.toUpperCase() === searchParamVal.toUpperCase() ||
          p.reference_number?.toUpperCase() === searchParamVal.toUpperCase() ||
          p.accounting_ref_no?.toUpperCase() === searchParamVal.toUpperCase()
      ) || payments[0];

      if (match) {
        openVerifyModal(match, 'verified');
      }

      // Clean up autoOpen URL query parameter so browser refresh won't re-trigger modal
      if (window.location.search.includes('autoOpen')) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('autoOpen');
        window.history.replaceState(null, '', newUrl.pathname + newUrl.search);
      }
    }
  }, [payments, autoOpenModal, searchParamVal]);

  // Listen for Escape key press to close modals
  useEffect(() => {
    if (!selectedPayment && !previewAttachment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewAttachment) {
          handleClosePreview();
        } else if (selectedPayment) {
          setSelectedPayment(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPayment, previewAttachment]);

  // Verification Mutation
  const verifyMut = useMutation({
    mutationFn: ({ id, status, notes, accounting_ref_no, specialAttachment }: { id: number; status: string; notes?: string; accounting_ref_no?: string; specialAttachment?: File | File[] | null }) =>
      verifyPayment(id, status as any, notes, specialAttachment, accounting_ref_no),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payments-review'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      showToast(
        vars.status !== 'rejected' && vars.status !== 'REJECTED'
          ? `Payment successfully verified (${vars.status}).`
          : 'Payment flagged as rejected.'
      );
      setSelectedPayment(null);
      setActionType(null);
      setVerificationNotes('');
      setVerificationRefNo('');
      setSpecialFiles([]);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to process payment verification.', 'error');
    },
  });

  const handleDeleteAttachment = async (attId: number) => {
    if (!window.confirm('Are you sure you want to remove this attachment?')) return;
    try {
      setDeletingAttId(attId);
      await axios.delete(`/api/v1/attachments/${attId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Attachment deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['payments-review'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (selectedPayment) {
        setSelectedPayment({
          ...selectedPayment,
          attachments: selectedPayment.attachments?.filter((a) => a.id !== attId) || [],
        });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete attachment.', 'error');
    } finally {
      setDeletingAttId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, search: searchInput, page: 1 }));
  };

  const openVerifyModal = (payment: Payment, action: 'verified' | 'rejected') => {
    setSelectedPayment(payment);
    setActionType(action);
    setVerificationNotes(payment.verification_notes || '');
    setVerificationRefNo(payment.accounting_ref_no || '');
    setDuplicateRefPaymentNumber(null);
    setIsCheckingRef(false);
    const currentStatus = (payment.verification_status as string) || '';
    setSelectedVerificationStatus(
      currentStatus &&
      currentStatus !== 'pending_verification' &&
      currentStatus !== 'pending' &&
      currentStatus !== 'rejected' &&
      currentStatus !== 'REJECTED'
        ? currentStatus
        : 'REFLECTED PBCOM'
    );
    setSpecialFiles([]);
  };

  // Calculate Metrics from DB summary or paginated records fallback
  const summary = (response as any)?.summary;
  const pendingCount = summary?.pending ?? payments.filter((p) => !p.verification_status || (p.verification_status as string) === 'pending_verification' || (p.verification_status as string) === 'pending').length;
  const verifiedCount = summary?.verified ?? payments.filter((p) => {
    const v = (p.verification_status as string || '').toLowerCase().trim();
    return v === 'verified' || v.startsWith('reflected') || v.includes('pbcom') || v.includes('security') || v.includes('jnt') || v.includes('cleared');
  }).length;
  const rejectedCount = summary?.rejected ?? payments.filter((p) => (p.verification_status as string) === 'rejected').length;

  const columns = [
    {
      key: 'payment_number',
      label: 'PAY NO.',
      className: 'whitespace-nowrap',
      render: (p: Payment) => (
        <span className="font-mono text-[10.5px] font-bold text-[#4A0E17]">
          {p.payment_number}
        </span>
      ),
    },
    {
      key: 'reference_number',
      label: 'REF / CHECK NO.',
      className: 'whitespace-nowrap max-w-[90px] truncate',
      render: (p: Payment) => (
        <span className="font-mono text-[10.5px] text-slate-600 truncate block" title={p.reference_number || undefined}>
          {p.reference_number || '—'}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'CLIENT & POLICY',
      className: 'max-w-[135px] truncate',
      render: (p: Payment) => {
        const cust = p.invoice?.customer;
        const clientName = cust
          ? [cust.first_name, cust.last_name].filter(Boolean).join(' ')
          : '—';
        const policyNo = cust?.policy_no || (p.invoice as any)?.policy?.policy_number || p.invoice?.invoice_number || '—';
        const reqNo = (p.invoice as any)?.policy?.quotation?.quotation_number || (p.invoice as any)?.policy?.quotation?.ir_number;

        return (
          <div className="flex flex-col">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-tight truncate" title={clientName}>{clientName}</p>
            <p className="text-[9.5px] font-mono text-slate-500 truncate" title={`Policy: ${policyNo}`}>
              {policyNo}
            </p>
            {reqNo && (
              <p className="text-[9.5px] font-mono font-semibold text-blue-700 truncate" title={`Quotation: ${reqNo}`}>
                {reqNo}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'payment_method',
      label: 'METHOD',
      className: 'whitespace-nowrap',
      render: (p: Payment) => (
        <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9.5px] font-bold rounded border border-slate-200/60 uppercase">
          {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      className: 'whitespace-nowrap',
      render: (p: Payment) => (
        <span className="font-mono text-[11px] font-black text-emerald-700">
          ₱{Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'payment_date',
      label: 'COLLECTED',
      className: 'whitespace-nowrap',
      render: (p: Payment) => {
        const collectorName = typeof p.received_by === 'object' ? p.received_by?.name : 'Collection Officer';
        const dateStr = p.payment_date ? new Date(p.payment_date).toLocaleDateString() : (p.created_at ? new Date(p.created_at).toLocaleDateString() : '—');
        const timeStr = p.created_at ? new Date(p.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : null;

        return (
          <div>
            <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-slate-400" />
              {dateStr}
            </p>
            {timeStr && (
              <p className="text-[9px] font-mono font-medium text-slate-500">
                {timeStr}
              </p>
            )}
            <p className="text-[8.5px] text-slate-400 truncate max-w-[85px]" title={collectorName}>By: {collectorName}</p>
          </div>
        );
      },
    },
    {
      key: 'proof',
      label: 'ATTACHMENT',
      className: 'whitespace-nowrap',
      render: (p: Payment) => {
        const atts = p.attachments?.filter((a) => a.document_type !== 'special_attachment' && !a.file_name?.toLowerCase().includes('special attachment')) || [];
        const specialAtts = p.attachments?.filter((a) => a.document_type === 'special_attachment' || a.file_name?.toLowerCase().includes('special attachment')) || [];

        if (atts.length === 0 && specialAtts.length === 0) {
          return <span className="text-[10px] text-slate-300 font-medium">—</span>;
        }

        return (
          <div className="flex flex-col items-start gap-1">
            {atts.length === 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProof(atts[0], atts);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9.5px] rounded border border-slate-200 transition cursor-pointer shadow-2xs"
                title={`View Proof (${atts[0].file_name})`}
              >
                <Paperclip className="h-2.5 w-2.5 text-slate-500" /> Proof
              </button>
            )}
            {atts.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProof(atts[0], atts);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9.5px] rounded border border-slate-200 transition cursor-pointer shadow-2xs"
                title={`View all ${atts.length} proof attachments`}
              >
                <Paperclip className="h-2.5 w-2.5 text-slate-500" /> Proofs ({atts.length})
              </button>
            )}
            {specialAtts.length === 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProof(specialAtts[0], specialAtts);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[9.5px] rounded border border-amber-300 transition cursor-pointer shadow-2xs"
                title={`View Special Attachment (${specialAtts[0].file_name})`}
              >
                <Paperclip className="h-2.5 w-2.5 text-amber-600" /> Special
              </button>
            )}
            {specialAtts.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProof(specialAtts[0], specialAtts);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[9.5px] rounded border border-amber-300 transition cursor-pointer shadow-2xs"
                title={`View all ${specialAtts.length} special attachments`}
              >
                <Paperclip className="h-2.5 w-2.5 text-amber-600" /> Special ({specialAtts.length})
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'accounting_ref_no',
      label: 'REF NO',
      className: 'whitespace-nowrap',
      render: (p: Payment) => (
        <span className="font-mono text-[10.5px] font-bold text-slate-800">
          {p.accounting_ref_no || '—'}
        </span>
      ),
    },
    {
      key: 'verification_status',
      label: 'STATUS',
      className: 'whitespace-nowrap',
      render: (p: Payment) => {
        const rawStatus = (p.verification_status || 'pending_verification').trim();
        const upperStatus = rawStatus.toUpperCase();

        if (upperStatus === 'REFLECTED PBCOM' || upperStatus === 'REFLECTED_PBCOM') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300/80 text-[8.5px] font-black rounded uppercase tracking-tight">
              <Building2 className="h-2.5 w-2.5 text-emerald-700" /> PBCOM
            </span>
          );
        }
        if (upperStatus === 'REFLECTED SECURITY BANK' || upperStatus === 'REFLECTED_SECURITY_BANK') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-900 border border-teal-300/80 text-[8.5px] font-black rounded uppercase tracking-tight">
              <Building2 className="h-2.5 w-2.5 text-teal-700" /> SECURITY BANK
            </span>
          );
        }
        if (upperStatus === 'JNT SOA' || upperStatus === 'JNT_SOA') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-300/80 text-[8.5px] font-black rounded uppercase tracking-tight">
              <Truck className="h-2.5 w-2.5 text-blue-700" /> JNT SOA
            </span>
          );
        }
        if (upperStatus === 'CLEARED CHECK' || upperStatus === 'CLEARED_CHECK') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-900 border border-purple-300/80 text-[8.5px] font-black rounded uppercase tracking-tight">
              <CheckCircle2 className="h-2.5 w-2.5 text-purple-700" /> CLEARED
            </span>
          );
        }
        if (upperStatus === 'VERIFIED') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300/80 text-[8.5px] font-extrabold rounded uppercase tracking-tight">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> VERIFIED
            </span>
          );
        }
        if (upperStatus === 'REJECTED') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-900 border border-rose-300/80 text-[8.5px] font-extrabold rounded uppercase tracking-tight">
              <XCircle className="h-2.5 w-2.5 text-rose-600" /> REJECTED
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300/80 text-[8.5px] font-extrabold rounded uppercase tracking-tight">
            <Clock className="h-2.5 w-2.5 text-amber-600" /> PENDING
          </span>
        );
      },
    },
    {
      key: 'verified_at',
      label: 'VERIFIED',
      className: 'whitespace-nowrap',
      render: (p: Payment) => {
        if (!p.verified_at) {
          return <span className="text-[10px] text-slate-300 font-medium">—</span>;
        }

        const d = new Date(p.verified_at);
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        const verifierName = typeof p.verified_by === 'object' && p.verified_by ? (p.verified_by as any).name : (p as any).verified_by_user?.name || (p as any).verifiedBy?.name;

        return (
          <div>
            <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-emerald-600" />
              {dateStr}
            </p>
            <p className="text-[9px] font-mono font-bold text-emerald-700">
              {timeStr}
            </p>
            {verifierName && (
              <p className="text-[8.5px] text-slate-400 truncate max-w-[80px]" title={verifierName}>
                By: {verifierName}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'remaining_balance',
      label: 'REMAINING BAL',
      className: 'whitespace-nowrap',
      render: (p: Payment) => {
        if (!p.invoice || p.invoice.balance === undefined || p.invoice.balance === null) {
          return <span className="text-[10px] text-slate-300 font-medium">—</span>;
        }

        const bal = Number(p.invoice.balance);
        const isCancelled =
          (p.invoice as any)?.status === 'cancelled' ||
          (p.invoice as any)?.status === 'voided' ||
          (p.invoice as any)?.policy?.status?.toLowerCase() === 'cancelled' ||
          (p.invoice as any)?.policy?.quotation?.status?.toLowerCase() === 'cancelled' ||
          (p.invoice as any)?.customer?.policy_status?.toUpperCase() === 'CANCELLED';

        if (isCancelled) {
          return (
            <span className="text-[10px] font-bold text-rose-600 uppercase font-mono">
              ₱0.00
            </span>
          );
        }

        if (bal <= 0) {
          return (
            <div className="flex flex-col">
              <span className="text-[10.5px] font-black font-mono text-emerald-700">
                ₱0.00
              </span>
              <span className="text-[8.5px] font-extrabold text-emerald-600 uppercase">
                Fully Paid
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col">
            <span className="text-[10.5px] font-black font-mono text-[#4A0E17]">
              ₱{bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[8.5px] font-bold text-slate-400 uppercase">
              Pending Bal
            </span>
          </div>
        );
      },
    },
    ...(isAccountingOrAdmin
      ? [
          {
            key: 'action',
            label: 'ACTION',
            headerClassName: 'text-right whitespace-nowrap',
            className: 'whitespace-nowrap text-right',
            render: (p: Payment) => {
              const status = (p.verification_status || 'pending_verification').toUpperCase();
              const isVerified =
                status !== 'PENDING_VERIFICATION' &&
                status !== 'PENDING' &&
                status !== 'PENDING FOR VERIFICATION' &&
                status !== 'REJECTED';
              const isRejected = status === 'REJECTED';

              const isCancelled =
                (p.invoice as any)?.status === 'cancelled' ||
                (p.invoice as any)?.status === 'voided' ||
                (p.invoice as any)?.policy?.status?.toLowerCase() === 'cancelled' ||
                (p.invoice as any)?.policy?.quotation?.status?.toLowerCase() === 'cancelled' ||
                (p.invoice as any)?.customer?.policy_status?.toUpperCase() === 'CANCELLED';

              if (isCancelled) {
                return (
                  <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-rose-700 border border-rose-200/60 text-[9px] font-bold rounded cursor-not-allowed opacity-80"
                      title="Cannot verify payment for a cancelled policy or voided invoice"
                    >
                      <XCircle className="h-2.5 w-2.5 text-rose-500" /> Cancelled
                    </span>
                  </div>
                );
              }

              if (isVerified) {
                return (
                  <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openVerifyModal(p, 'verified')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-[#4A0E17] text-slate-600 hover:text-white font-bold text-[10px] rounded-md border border-slate-200/80 transition cursor-pointer shadow-2xs"
                      title="Edit verification status"
                    >
                      <Edit3 className="h-2.5 w-2.5" /> Edit
                    </button>
                  </div>
                );
              }

              return (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openVerifyModal(p, 'verified')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] rounded-md shadow-2xs transition cursor-pointer"
                    title="Verify and approve payment"
                  >
                    <Check className="h-2.5 w-2.5" /> Approve
                  </button>
                  {!isRejected && (
                    <button
                      onClick={() => openVerifyModal(p, 'rejected')}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-md border border-rose-200 transition cursor-pointer"
                      title="Reject payment"
                    >
                      <X className="h-2.5 w-2.5" /> Reject
                    </button>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Review Collection Payment</h1>
          {!isAccountingOrAdmin && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
              <Eye className="h-3 w-3 text-amber-600" /> Viewing Mode (Read-Only)
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Review, verify, and approve collection payments submitted by Collection Officers
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Review</span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200/60">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Verified Payments</span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{verifiedCount}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/60">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rejected Payments</span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{rejectedCount}</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200/60">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full xl:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search client, payment no., ref..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setParams((p) => ({ ...p, search: '', page: 1 }));
                setSearchParams({}, { replace: true });
                window.history.replaceState(null, '', window.location.pathname);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer flex items-center justify-center"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Range */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 transition hover:border-slate-300">
            <Calendar className="h-3.5 w-3.5 text-[#4A0E17]" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                const val = e.target.value;
                setDateFrom(val);
                setParams((p) => ({ ...p, date_from: val || undefined, page: 1 }));
              }}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 transition hover:border-slate-300">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                const val = e.target.value;
                setDateTo(val);
                setParams((p) => ({ ...p, date_to: val || undefined, page: 1 }));
              }}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setParams((p) => {
                  const updated = { ...p, page: 1 };
                  delete updated.date_from;
                  delete updated.date_to;
                  return updated;
                });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition cursor-pointer text-xs shadow-2xs"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" /> Clear Dates
            </button>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 transition hover:border-slate-300">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={params.verification_status || 'all'}
              onChange={(e) => setParams((p) => ({ ...p, verification_status: e.target.value, page: 1 }))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="all">All Verification Statuses</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="REFLECTED PBCOM">Reflected PBCOM</option>
              <option value="REFLECTED SECURITY BANK">Reflected Security Bank</option>
              <option value="JNT SOA">J&T SOA</option>
              <option value="CLEARED CHECK">Cleared Check</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#4A0E17]" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No collection payments found"
            description="There are no recorded collection payments matching your current filters."
          />
        ) : (
          <>
            <DataTable data={payments} columns={columns} dense={true} />
            {pagination && (
              <Pagination
                currentPage={pagination.current_page}
                lastPage={pagination.last_page}
                perPage={pagination.per_page}
                total={pagination.total}
                from={pagination.from}
                to={pagination.to}
                onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                onPerPageChange={(per_page) => setParams((p) => ({ ...p, per_page, page: 1 }))}
              />
            )}
          </>
        )}
      </div>

      {/* Verification Confirmation Modal */}
      {selectedPayment && actionType && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedPayment(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${actionType === 'verified' ? 'bg-[#4A0E17]/10 text-[#4A0E17]' : 'bg-rose-100 text-rose-800'}`}>
                  {actionType === 'verified' ? <CheckCircle2 className="h-5 w-5 text-[#4A0E17]" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {actionType === 'verified' ? 'Approve & Verify Payment' : 'Reject Collection Payment'}
                </h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 text-xs space-y-2 border border-slate-200/80">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Payment No</span>
                <span className="font-mono font-bold text-[#4A0E17] bg-[#4A0E17]/5 px-2 py-0.5 rounded-md border border-[#4A0E17]/10">{selectedPayment.payment_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Client</span>
                <span className="font-bold text-slate-800 uppercase">
                  {selectedPayment.invoice?.customer?.first_name} {selectedPayment.invoice?.customer?.last_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Method of Payment</span>
                <span className="font-bold text-slate-800 text-xs uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {PAYMENT_METHOD_LABELS[selectedPayment.payment_method] || (selectedPayment.payment_method || '').replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Amount</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  ₱{Number(selectedPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {selectedPayment.verified_at && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Verified At</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    {new Date(selectedPayment.verified_at).toLocaleDateString()} • {new Date(selectedPayment.verified_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                </div>
              )}
            </div>

            {actionType === 'verified' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Verification Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedVerificationStatus}
                  onChange={(e) => setSelectedVerificationStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
                >
                  <option value="REFLECTED PBCOM">REFLECTED PBCOM</option>
                  <option value="REFLECTED SECURITY BANK">REFLECTED SECURITY BANK</option>
                  <option value="JNT SOA">JNT SOA</option>
                  <option value="CLEARED CHECK">CLEARED CHECK</option>
                  <option value="PENDING FOR VERIFICATION">PENDING FOR VERIFICATION</option>
                </select>
              </div>
            )}

            {actionType === 'verified' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Paperclip className="h-3.5 w-3.5 text-[#4A0E17]" />
                    Special Attachment (Optional)
                  </span>
                  <span className="text-[10px] font-bold text-[#4A0E17] bg-[#4A0E17]/10 px-2 py-0.5 rounded-md border border-[#4A0E17]/20">
                    Accounting File
                  </span>
                </label>

                {/* Existing Saved Attachments List */}
                {(() => {
                  const existingSpecialAtts = selectedPayment.attachments?.filter(
                    (a) => a.document_type === 'special_attachment' || a.file_name?.toLowerCase().includes('special attachment')
                  ) || [];

                  if (existingSpecialAtts.length === 0) return null;

                  return (
                    <div className="space-y-1.5 mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-600" />
                        Saved Attachments ({existingSpecialAtts.length})
                      </p>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {existingSpecialAtts.map((att, idx) => (
                          <div
                            key={att.id || idx}
                            className="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Paperclip className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate text-[11px]" title={att.file_name}>
                                {att.file_name.replace(/^Special Attachment:\s*/i, '')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => handleViewProof(att)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] rounded-lg transition cursor-pointer"
                                title="Preview file"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                disabled={deletingAttId === att.id}
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                title="Delete attachment"
                              >
                                {deletingAttId === att.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Upload New / Additional Files */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2 hover:border-[#4A0E17]/40 transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.zip"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      setSpecialFiles((prev) => [...prev, ...newFiles]);
                      e.target.value = '';
                    }}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#4A0E17] file:text-white hover:file:bg-[#3D0B12] transition cursor-pointer"
                  />
                </div>

                {/* Pending New Files List */}
                {specialFiles.length > 0 && (
                  <div className="space-y-1 mt-1">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      New Files to Upload ({specialFiles.length})
                    </p>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {specialFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-1.5 px-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs"
                        >
                          <span className="truncate text-emerald-900 font-medium text-[11px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setSpecialFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-medium">
                  Attach official receipt, deposit slip, or accounting audit file. Previously uploaded files will be preserved.
                </p>
              </div>
            )}

            {actionType === 'verified' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Hash className="h-3.5 w-3.5 text-[#4A0E17]" />
                    Reference Number (Optional)
                  </span>
                  {isCheckingRef && (
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-[#4A0E17]" /> Checking...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={verificationRefNo}
                    onChange={(e) => setVerificationRefNo(e.target.value)}
                    placeholder="Enter OR # or transaction reference..."
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 ${
                      duplicateRefPaymentNumber
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 focus:ring-rose-500/20 focus:border-rose-600 pr-10'
                        : 'bg-slate-50 border border-slate-200/90 text-slate-800 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]'
                    }`}
                  />
                  {duplicateRefPaymentNumber && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse" />
                    </div>
                  )}
                </div>

                {duplicateRefPaymentNumber && (
                  <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200/90 rounded-xl text-rose-700 text-xs font-bold mt-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Duplicate Ref No: Already used in Payment #{duplicateRefPaymentNumber}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Verification Remarks / Notes (Optional)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Enter audit notes or justification..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  verifyMut.mutate({
                    id: selectedPayment.id,
                    status: actionType === 'verified' ? selectedVerificationStatus : 'REJECTED',
                    notes: verificationNotes,
                    accounting_ref_no: verificationRefNo,
                    specialAttachment: specialFiles.length > 0 ? specialFiles : null,
                  })
                }
                disabled={verifyMut.isPending || Boolean(duplicateRefPaymentNumber)}
                className={`px-5 py-2 font-bold text-xs rounded-xl transition cursor-pointer text-white shadow-xs flex items-center gap-1.5 ${
                  Boolean(duplicateRefPaymentNumber)
                    ? 'bg-rose-300 cursor-not-allowed opacity-60'
                    : actionType === 'verified'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifyMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : duplicateRefPaymentNumber ? (
                  'Duplicate Ref No'
                ) : actionType === 'verified' ? (
                  'Confirm Verification'
                ) : (
                  'Confirm Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={handleClosePreview}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-amber-300 shrink-0" />
                <h3 className="font-bold text-sm tracking-tight truncate">
                  {previewAttachment.file_name.replace(/^Special Attachment:\s*/i, '')}
                </h3>
              </div>
              <button onClick={handleClosePreview} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Multi-file Tabs Switcher */}
            {previewAttachmentsList.length > 1 && (
              <div className="bg-[#38080f] px-6 py-2 flex items-center gap-2 overflow-x-auto border-t border-white/10">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider shrink-0">
                  Files ({previewAttachmentsList.length}):
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {previewAttachmentsList.map((att, idx) => {
                    const isSelected = previewAttachment.id === att.id;
                    const cleanName = att.file_name.replace(/^Special Attachment:\s*/i, '');
                    return (
                      <button
                        key={att.id || idx}
                        onClick={() => handleViewProof(att, previewAttachmentsList)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-slate-900 shadow-xs'
                            : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[140px] truncate">{cleanName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-6 flex-1 overflow-y-auto flex items-center justify-center min-h-[300px] bg-slate-50">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
                  <span className="text-xs font-semibold">Loading proof preview...</span>
                </div>
              ) : previewUrl ? (
                previewAttachment.mime_type?.includes('pdf') ? (
                  <iframe src={previewUrl} className="w-full h-[500px] rounded-xl border border-slate-200" title="PDF Preview" />
                ) : (
                  <img src={previewUrl} alt="Proof of Payment" className="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200" />
                )
              ) : (
                <span className="text-xs text-slate-400 font-medium">Unable to render preview.</span>
              )}
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium truncate max-w-xs">{previewAttachment.file_name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={getDownloadUrl(previewAttachment.id, token)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Download File
                </a>
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freebie Attachment Modal */}
      {freebieModalTarget && (
        <FreebieAttachmentModal
          isOpen={Boolean(freebieModalTarget)}
          onClose={() => setFreebieModalTarget(null)}
          attachableType="payment"
          attachableId={freebieModalTarget.id}
          title={freebieModalTarget.payment_number || `PAY-${freebieModalTarget.id}`}
          customerName={
            freebieModalTarget.invoice?.customer
              ? [freebieModalTarget.invoice.customer.first_name, freebieModalTarget.invoice.customer.last_name].filter(Boolean).join(' ')
              : 'Assured Customer'
          }
          isCancelled={Boolean(
            freebieModalTarget.status === 'voided' ||
            freebieModalTarget.invoice?.status === 'cancelled' ||
            freebieModalTarget.invoice?.status === 'voided' ||
            freebieModalTarget.invoice?.policy?.status === 'cancelled'
          )}
          onAttachmentUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ['payments-review'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
          }}
        />
      )}
    </div>
  );
}
