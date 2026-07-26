import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Download
} from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { getPayments, verifyPayment } from '../../services/paymentApi';
import { PAYMENT_METHOD_LABELS } from '../../types/AccountingTypes';
import type { Payment, PaymentListParams } from '../../types/AccountingTypes';
import { getDownloadUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';

export default function ReviewCollectionPaymentPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { token } = useAuth();

  const [params, setParams] = useState<PaymentListParams>({
    page: 1,
    per_page: 15,
    search: '',
    verification_status: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const [searchInput, setSearchInput] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [actionType, setActionType] = useState<'verified' | 'rejected' | null>(null);
  const [specialFile, setSpecialFile] = useState<File | null>(null);

  // Proof Preview Modal States
  const [previewAttachment, setPreviewAttachment] = useState<{ id: number; file_name: string; mime_type?: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleViewProof = async (att: any) => {
    setIsPreviewLoading(true);
    setPreviewAttachment(att);
    setPreviewUrl(null);
    try {
      const { data } = await axios.get(`/api/v1/attachments/${att.id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([data], { type: att.mime_type || 'image/png' }));
      setPreviewUrl(blobUrl);
    } catch (err) {
      showToast('Failed to load proof preview.', 'error');
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
  };

  // Fetch payments
  const { data: response, isLoading } = useQuery({
    queryKey: ['payments-review', params],
    queryFn: () => getPayments(params),
    refetchInterval: 4000,
  });

  const pagination = response?.data;
  const payments = pagination?.data ?? [];

  // Verification Mutation
  const verifyMut = useMutation({
    mutationFn: ({ id, status, notes, specialAttachment }: { id: number; status: 'verified' | 'rejected'; notes?: string; specialAttachment?: File | null }) =>
      verifyPayment(id, status, notes, specialAttachment),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payments-review'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      showToast(
        vars.status === 'verified'
          ? 'Payment successfully verified and approved.'
          : 'Payment flagged as rejected.'
      );
      setSelectedPayment(null);
      setActionType(null);
      setVerificationNotes('');
      setSpecialFile(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to process payment verification.', 'error');
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, search: searchInput, page: 1 }));
  };

  const openVerifyModal = (payment: Payment, action: 'verified' | 'rejected') => {
    setSelectedPayment(payment);
    setActionType(action);
    setVerificationNotes('');
    setSpecialFile(null);
  };

  // Calculate Metrics from DB summary or paginated records fallback
  const summary = (response as any)?.summary;
  const pendingCount = summary?.pending ?? payments.filter((p) => !p.verification_status || (p.verification_status as string) === 'pending_verification' || (p.verification_status as string) === 'pending').length;
  const verifiedCount = summary?.verified ?? payments.filter((p) => (p.verification_status as string) === 'verified').length;
  const rejectedCount = summary?.rejected ?? payments.filter((p) => (p.verification_status as string) === 'rejected').length;

  const columns = [
    {
      key: 'payment_number',
      label: 'Payment No.',
      render: (p: Payment) => (
        <span className="font-mono text-xs font-bold text-[#4A0E17]">
          {p.payment_number}
        </span>
      ),
    },
    {
      key: 'reference_number',
      label: 'Ref / Check / Tracking No.',
      render: (p: Payment) => (
        <span className="font-mono text-xs font-medium text-slate-600">
          {p.reference_number || '—'}
        </span>
      ),
    },
    {
      key: 'client',
      label: 'Client & Policy',
      render: (p: Payment) => {
        const cust = p.invoice?.customer;
        const clientName = cust
          ? [cust.first_name, cust.last_name].filter(Boolean).join(' ')
          : '—';
        const policyNo = cust?.policy_no || (p.invoice as any)?.policy?.policy_number || p.invoice?.invoice_number || '—';
        const reqNo = (p.invoice as any)?.policy?.quotation?.quotation_number || (p.invoice as any)?.policy?.quotation?.ir_number;

        const isCancelled =
          (p.invoice as any)?.status === 'cancelled' ||
          (p.invoice as any)?.status === 'voided' ||
          (p.invoice as any)?.policy?.status?.toLowerCase() === 'cancelled' ||
          (p.invoice as any)?.policy?.quotation?.status?.toLowerCase() === 'cancelled' ||
          (cust as any)?.policy_status?.toUpperCase() === 'CANCELLED';

        return (
          <div>
            <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">{clientName}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Policy: {policyNo} {reqNo && <span className="text-slate-350 font-normal"> • </span>} {reqNo && <span className="text-blue-700 font-semibold">{reqNo}</span>}
            </p>
          </div>
        );
      },
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (p: Payment) => (
        <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md border border-slate-200/60">
          {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount Collected',
      render: (p: Payment) => (
        <span className="font-mono text-xs font-bold text-emerald-700">
          ₱{Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'payment_date',
      label: 'Date & Collector',
      render: (p: Payment) => {
        const collectorName = typeof p.received_by === 'object' ? p.received_by?.name : 'Collection Officer';
        return (
          <div>
            <p className="text-xs font-medium text-slate-700">
              {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
            </p>
            <p className="text-[11px] text-slate-400 font-normal">By: {collectorName}</p>
          </div>
        );
      },
    },
    {
      key: 'proof',
      label: 'Proof & Special Attachment',
      render: (p: Payment) => {
        const att = p.attachments?.find((a) => a.document_type !== 'special_attachment') || p.attachments?.[0];
        const specialAtt = p.attachments?.find((a) => a.document_type === 'special_attachment' || a.file_name?.toLowerCase().includes('special attachment'));

        if (!att && !specialAtt) {
          return <span className="text-xs text-slate-400 font-medium">—</span>;
        }

        return (
          <div className="flex flex-col items-start gap-1">
            {att && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProof(att);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200/80 transition cursor-pointer shadow-2xs"
              >
                <Paperclip className="h-3.5 w-3.5 text-slate-500" /> View Proof
              </button>
            )}
            {specialAtt && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProof(specialAtt);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-lg border border-amber-300 transition cursor-pointer shadow-2xs"
                title="View Special Attachment uploaded by Accounting"
              >
                <Paperclip className="h-3.5 w-3.5 text-amber-600" /> Special Attachment
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'verification_status',
      label: 'Verification Status',
      render: (p: Payment) => {
        const status = p.verification_status || 'pending_verification';
        if (status === 'verified') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold rounded-md uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified
            </span>
          );
        }
        if (status === 'rejected') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200/80 text-[10px] font-bold rounded-md uppercase tracking-wider">
              <XCircle className="h-3.5 w-3.5 text-rose-600" /> Rejected
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold rounded-md uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Review
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (p: Payment) => {
        const isVerified = p.verification_status === 'verified';
        const isRejected = p.verification_status === 'rejected';

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
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-rose-800 border border-rose-200 text-xs font-bold rounded-lg cursor-not-allowed shadow-2xs opacity-80"
                title="Cannot verify payment for a cancelled policy or voided invoice"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-600" /> Cannot Verify (Cancelled)
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {!isVerified && (
              <button
                onClick={() => openVerifyModal(p, 'verified')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                title="Verify and approve payment"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
            )}
            {!isRejected && (
              <button
                onClick={() => openVerifyModal(p, 'rejected')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition cursor-pointer"
                title="Reject or flag payment"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Review Collection Payment</h1>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search client, payment no., ref..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending_verification', 'verified', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setParams((p) => ({ ...p, verification_status: st, page: 1 }))}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                params.verification_status === st
                  ? 'bg-[#4A0E17] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st === 'all'
                ? 'All Statuses'
                : st === 'pending_verification'
                ? 'Pending Review'
                : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
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
            <DataTable data={payments} columns={columns} />
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
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
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Amount</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  ₱{Number(selectedPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {actionType === 'verified' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Paperclip className="h-3.5 w-3.5 text-[#4A0E17]" />
                    Special Attachment (Optional)
                  </span>
                  <span className="text-[10px] font-bold text-[#4A0E17] bg-[#4A0E17]/10 px-2 py-0.5 rounded-md border border-[#4A0E17]/20">
                    Accounting File
                  </span>
                </label>
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2 hover:border-[#4A0E17]/40 transition">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.zip"
                    onChange={(e) => setSpecialFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#4A0E17] file:text-white hover:file:bg-[#3D0B12] transition cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Attach official receipt, deposit slip, or accounting audit file to reflect on the Collection Ledger.
                </p>
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
                onClick={() => verifyMut.mutate({ id: selectedPayment.id, status: actionType, notes: verificationNotes, specialAttachment: specialFile })}
                disabled={verifyMut.isPending}
                className={`px-5 py-2 font-bold text-xs rounded-xl transition cursor-pointer text-white shadow-xs flex items-center gap-1.5 ${
                  actionType === 'verified' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : actionType === 'verified' ? 'Confirm Verification' : 'Confirm Rejection'}
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
                  Proof of Payment - {previewAttachment.file_name}
                </h3>
              </div>
              <button onClick={handleClosePreview} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

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
    </div>
  );
}
