import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft, Pencil, CheckCircle2, XCircle, Send, ShieldCheck,
  Loader2, User, FileText, X, Calendar, Link2, AlertTriangle, Paperclip, Download, Eye
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { getQuotation, submitQuotation, reviewQuotation } from '../../services/quotationApi';
import { useAuth } from '../../context/AuthContext';
import { getAttachments, downloadAttachment } from '../../services/attachmentApi';
import AttachmentPanel from '../../components/ui/AttachmentPanel';
import { RequestCancellationModal } from '../../components/quotations/RequestCancellationModal';
import { getFileUrl } from '../../utils/url';
import logoImg from '../../assets/image/supremogen_logo.jpg';

const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100 + 1e-9) / 100;
};

export default function QuotationDetailPage({
  id: propId,
  onClose,
  onEdit
}: {
  id?: number;
  onClose?: () => void;
  onEdit?: () => void
}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { permissions, roles, token } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [activeTab, setActiveTab] = useState<'info' | 'payment' | 'claims' | 'documents'>('info');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  // Preview Modal State for Cancellation Attachment & Documents
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>('');
  const [previewModalType, setPreviewModalType] = useState<string>('');
  const [isPreviewModalLoading, setIsPreviewModalLoading] = useState(false);

  const handleViewCancellationDoc = async (urlPath: string) => {
    if (!urlPath) return;
    const fullUrl = getFileUrl(urlPath);
    
    setPreviewModalTitle('Cancellation Supporting Document');
    setIsPreviewModalLoading(true);
    setPreviewModalUrl(null);

    try {
      const response = await axios.get(fullUrl, { responseType: 'blob' });
      const contentType = String(response.headers['content-type'] || 'application/octet-stream');
      const isImage = contentType.startsWith('image/');
      const isPdf = contentType === 'application/pdf';
      setPreviewModalType(isImage ? 'image' : isPdf ? 'pdf' : 'other');
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      setPreviewModalUrl(blobUrl);
    } catch (err) {
      // Fallback: try to detect from URL extension
      const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(urlPath);
      const isPdf = /\.pdf$/i.test(urlPath);
      setPreviewModalType(isImage ? 'image' : isPdf ? 'pdf' : 'other');
      setPreviewModalUrl(fullUrl);
    } finally {
      setIsPreviewModalLoading(false);
    }
  };

  const handleDownloadCancellationDoc = async (urlPath: string) => {
    if (!urlPath) return;
    const fullUrl = getFileUrl(urlPath);

    try {
      const response = await axios.get(fullUrl, { responseType: 'blob' });
      // Extract filename from Content-Disposition header or derive from content-type
      const disposition = String(response.headers['content-disposition'] || '');
      const filenameMatch = disposition.match(/filename[^;=\n]*=["']?([^"';\n]*)["']?/);
      let downloadFileName: string;
      if (filenameMatch?.[1]) {
        downloadFileName = filenameMatch[1];
      } else {
        const contentType = String(response.headers['content-type'] || 'application/octet-stream');
        const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
        const ext = extMap[contentType] || 'pdf';
        downloadFileName = `cancellation-supporting-document-${quotation?.quotation_number || id}.${ext}`;
      }
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      showToast('Download started.');
    } catch (err) {
      const ext = urlPath.split('.').pop()?.split('?')[0] || 'pdf';
      const downloadFileName = `cancellation-supporting-document-${quotation?.quotation_number || id}.${ext}`;
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = downloadFileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Download started.');
    }
  };

  const handleClosePreviewModal = () => {
    if (previewModalUrl && previewModalUrl.startsWith('blob:')) {
      window.URL.revokeObjectURL(previewModalUrl);
    }
    setPreviewModalUrl(null);
    setPreviewModalTitle('');
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(Number(id)),
    enabled: !!id,
  });
  const quotation = response?.data;

  const { data: customerAttachmentsRes } = useQuery({
    queryKey: ['attachments', 'customer', quotation?.customer_id],
    queryFn: () => getAttachments('customer', quotation?.customer_id || 0),
    enabled: !!quotation?.customer_id,
  });
  const customerAttachments = customerAttachmentsRes?.data ?? [];

  const submitMut = useMutation({
    mutationFn: () => submitQuotation(Number(id)),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast(res?.message ?? 'Quotation submitted for review.');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to submit.', 'error'),
  });

  const reviewMut = useMutation({
    mutationFn: ({ action, remarks }: { action: 'approve' | 'reject'; remarks: string }) =>
      reviewQuotation(Number(id), action, remarks),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast(vars.action === 'approve' ? 'Quotation approved!' : 'Quotation rejected.');
      setShowReviewPanel(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Review failed.', 'error'),
  });

  const canReview = permissions.includes('quotations.approve') || permissions.includes('quotations.reject');
  const isReviewable = quotation && ['submitted', 'under_review', 'resubmitted'].includes(quotation.status);
  const canIssuePolicy = quotation?.status === 'approved' && permissions.includes('policies.create');
  const canEdit = (roles.includes('Sales Agent') || roles.includes('Team Renewal')) && ['draft', 'rejected'].includes(quotation?.status || '');
  const canRequestCancellation = quotation && (roles.includes('Sales Agent') || roles.includes('Team Renewal') || isAdmin) && ['approved', 'submitted', 'under_review', 'resubmitted'].includes(quotation.status);

  if (isLoading || !quotation) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
      </div>
    );
  }

  const firstItem = quotation.items?.[0];
  const hasCoverageDetails = firstItem && firstItem.coverage_details;
  const details = hasCoverageDetails ? firstItem.coverage_details : null;

  const formatDate = (val: any) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === '') return '—';
    const num = Number(val);
    return isNaN(num) ? '—' : `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const mainContent = (
    <>
      {/* Modal / Page Header */}
      {onClose ? (
        <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
            <h3 className="font-bold text-base tracking-tight">Transaction - {quotation.customer?.customer_code || '—'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 px-6 pt-6">
          <div className="flex items-center gap-3.5">
            <button onClick={() => navigate('/dashboard/quotations')}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{quotation.quotation_number}</h1>
                <StatusBadge status={quotation.status} size="sm" />
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Prepared {formatDate(quotation.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button onClick={() => onEdit ? onEdit() : navigate(`/dashboard/quotations/${id}/edit`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm">
                  <Pencil className="h-3.5 w-3.5 text-slate-500" /> {quotation.status === 'rejected' ? 'Re-edit Details' : 'Edit Draft'}
                </button>
                <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-xs font-bold rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-md shadow-[#4A0E17]/20 transition-all cursor-pointer">
                  <Send className="h-3.5 w-3.5" /> {quotation.status === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
                </button>
              </>
            )}
            {!isAdmin && canIssuePolicy && (
              <button onClick={() => navigate(`/dashboard/policies/issue/${quotation.id}`)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
                <ShieldCheck className="h-3.5 w-3.5" /> Issue Policy
              </button>
            )}
            {canRequestCancellation && (
              <button onClick={() => setShowCancellationModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Request Cancellation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-50 px-6 border-b border-slate-200/60 flex gap-2 pt-3 shrink-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${activeTab === 'info'
              ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
        >
          Information
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${activeTab === 'payment'
              ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
        >
          Payment
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${activeTab === 'claims'
              ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
        >
          Claims
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${activeTab === 'documents'
              ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
        >
          Documents
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700">
        {activeTab === 'info' && (
          <div className="space-y-6">
            {quotation.status === 'cancellation_requested' && (
              <div className="bg-[#f0f2f5] border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-red-600 text-white rounded-xl shadow-xs">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-tight">
                      REQUEST FOR CANCELLATION
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-amber-200">
                    Pending Underwriter Review
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm font-medium text-slate-800 tracking-wide">
                  <p className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 uppercase">WRITING DATE:</span>
                    <span className="text-slate-800">{quotation.cancellation_details?.writing_date || '—'}</span>
                  </p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 uppercase">INCEPTION DATE:</span>
                    <span className="text-slate-800">{quotation.cancellation_details?.inception || '—'}</span>
                  </p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 uppercase">ASSURED NAME:</span>
                    <span className="text-slate-800 uppercase">{quotation.cancellation_details?.client_name || [quotation.customer?.first_name, quotation.customer?.last_name].filter(Boolean).join(' ') || '—'}</span>
                  </p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 uppercase">POLICY NUMBER:</span>
                    <span className="font-mono text-slate-900">{quotation.cancellation_details?.policy_number || quotation.customer?.policy_no || (quotation as any).policy?.policy_number || '—'}</span>
                  </p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 uppercase">PLATE NUMBER:</span>
                    <span className="font-mono text-slate-900 uppercase">{quotation.cancellation_details?.plate_number || quotation.customer?.plate_no || '—'}</span>
                  </p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 uppercase">INSURANCE PROVIDER:</span>
                    <span className="text-slate-800 uppercase">{quotation.cancellation_details?.provider || 'ALPHA'}</span>
                  </p>

                  <div className="pt-3">
                    <p className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-900 uppercase">REASON OF CANCELLATION:</span>
                      <span className="text-slate-800 font-semibold">{quotation.cancellation_reason || quotation.cancellation_details?.reason || '—'}</span>
                    </p>
                  </div>
                </div>

                {quotation.cancellation_details?.attachment_url && (
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-600" />
                      <span className="font-bold text-slate-700 text-xs">Cancellation Supporting Document</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewCancellationDoc(quotation.cancellation_details?.attachment_url || '')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-600" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCancellationDoc(quotation.cancellation_details?.attachment_url || '')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-600" /> Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Record No, Status, Date Request Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
              <div>
                <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Record No.</span>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono font-bold text-[#4A0E17] text-sm shadow-sm">
                  {quotation.customer?.customer_code || '—'}
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Status</span>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-[#4A0E17] text-sm shadow-sm uppercase">
                  {quotation.status === 'draft' ? 'DRAFT' : quotation.status === 'approved' ? 'ACTIVE' : quotation.status}
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Date Request</span>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 text-sm shadow-sm">
                  {formatDate(quotation.customer?.writing_date)}
                </div>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {/* Left Column */}
              <div className="space-y-6">
                {/* REQUEST & ACTIVITY DETAILS */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Request & Activity Details</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Type</span>
                    <span className="col-span-2 text-slate-800 font-bold">{quotation.customer?.request_type || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Activity</span>
                    <span className="col-span-2 text-slate-800 font-bold">{quotation.customer?.activity || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Provider</span>
                    <span className="col-span-2 text-slate-800 font-bold">{quotation.customer?.insurance_provider || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Quotation Used</span>
                    <span className="col-span-2 text-slate-800 font-bold">{quotation.customer?.quotation_used || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Usage</span>
                    <span className="col-span-2 text-slate-800 font-bold">{quotation.customer?.usage || '—'}</span>
                  </div>
                </div>

                {/* ASSURED PERSONAL & CONTACT */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Assured Personal & Contact</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Assured Name</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">
                      {[
                        quotation.customer?.first_name,
                        quotation.customer?.middle_name,
                        quotation.customer?.last_name,
                        quotation.customer?.suffix
                      ].filter(Boolean).join(' ') || '—'}
                    </span>

                    <span className="text-slate-500 font-semibold text-xs">Contact No.#</span>
                    <span className="col-span-2 text-slate-800 font-medium">{quotation.customer?.mobile || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Back Up No.#</span>
                    <span className="col-span-2 text-slate-800 font-medium">{quotation.customer?.backup_phone || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Email Add</span>
                    <span className="col-span-2 text-slate-800 font-medium">{quotation.customer?.email || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">FB Link</span>
                    <span className="col-span-2 text-slate-800 font-medium truncate">
                      {quotation.customer?.fb_link ? (
                        <a href={quotation.customer.fb_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {quotation.customer.fb_link}
                        </a>
                      ) : '—'}
                    </span>
                  </div>
                </div>

                {/* ASSURED ADDRESS */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Assured Address</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Address</span>
                    <span className="col-span-2 text-slate-800 font-medium">
                      {[
                        quotation.customer?.address_line_1,
                        quotation.customer?.address_line_2,
                        quotation.customer?.city,
                        quotation.customer?.province,
                        quotation.customer?.zip_code
                      ].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                </div>

                {/* DELIVERY DETAILS */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Delivery Details</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Receiver's Name</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.receiver_name || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Delivery Address</span>
                    <span className="col-span-2 text-slate-800 font-medium">{quotation.customer?.delivery_address || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Landmark</span>
                    <span className="col-span-2 text-slate-800 font-medium">{quotation.customer?.landmark || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* VEHICLE INFORMATION */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Vehicle Information</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Year Model & Make</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.unit || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Chassis #</span>
                    <span className="col-span-2 text-slate-800 font-mono font-semibold uppercase">{quotation.customer?.chassis_no || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Engine #</span>
                    <span className="col-span-2 text-slate-800 font-mono font-semibold uppercase">{quotation.customer?.engine_no || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Color</span>
                    <span className="col-span-2 text-slate-800 font-medium capitalize">{quotation.customer?.color || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Plate Number</span>
                    <span className="col-span-2 text-slate-800 font-mono font-bold uppercase">{quotation.customer?.plate_no || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">MV File No.</span>
                    <span className="col-span-2 text-slate-800 font-mono font-bold uppercase">{quotation.customer?.mv_file_no || (firstItem?.coverage_details as any)?.mv_file_no || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Bank</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.mortgage || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Ownership</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.ownership || '—'}</span>
                  </div>
                </div>

                {/* POLICY & COVERAGES */}
                {(() => {
                  const cust: any = quotation.customer || {};
                  const itemSum = Number(firstItem?.sum_insured || 0);
                  const covSum = Number(details?.sum_insured || details?.coverages?.own_damage || details?.coverages?.od || cust.own_damage_coverage || cust.sum_insured || 0);
                  const odCov = itemSum > 0 ? itemSum : (covSum > 0 ? covSum : 430000);
                  const aonCov = odCov;
                  const biCov = Number(details?.coverages?.bi || details?.cov_bi || cust.bi_coverage || 200000);
                  const pdCov = Number(details?.coverages?.pd || details?.cov_pd || cust.pd_coverage || 200000);
                  const paCov = Number(details?.coverages?.pa || details?.cov_pa || cust.pa || cust.pa_coverage || 250000);

                  const parseRate = (val: any, fallback: number) => {
                    if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
                    if (typeof val === 'string') {
                      const match = val.match(/(\d+(?:\.\d+)?)/);
                      if (match) {
                        const parsed = parseFloat(match[1]);
                        if (!isNaN(parsed) && parsed > 0) return parsed;
                      }
                    }
                    return fallback;
                  };

                  let odPrem = Number(details?.premiums?.od ?? cust.od_premium ?? cust.premiums?.od ?? 0);
                  let aonPrem = Number(details?.premiums?.aon ?? cust.aon_premium ?? cust.premiums?.aon ?? 0);
                  let biPrem = Number(details?.premiums?.bi ?? cust.bi_premium ?? cust.premiums?.bi ?? 0);
                  let pdPrem = Number(details?.premiums?.pd ?? cust.pd_premium ?? cust.premiums?.pd ?? 0);
                  let paPrem = Number(details?.premiums?.pa ?? cust.pa_premium ?? cust.premiums?.pa ?? 0);

                  if (isNaN(odPrem) || odPrem === 0) {
                    if (odCov > 0) {
                      const rateOD = parseRate(details?.calculator?.selling_rate_od ?? cust.selling_rate_od ?? cust.used_rate, 1.30);
                      odPrem = Math.round(odCov * (rateOD / 100) * 100) / 100;
                    } else {
                      odPrem = 0;
                    }
                  }
                  if (isNaN(aonPrem) || aonPrem === 0) {
                    if (aonCov > 0) {
                      const rateAON = parseRate(details?.calculator?.selling_rate_aon ?? cust.selling_rate_aon, 0.10);
                      aonPrem = Math.round(aonCov * (rateAON / 100) * 100) / 100;
                    } else {
                      aonPrem = 0;
                    }
                  }
                  if (isNaN(biPrem) || biPrem === 0) {
                    biPrem = biCov > 0 ? 420 : 0;
                  }
                  if (isNaN(pdPrem) || pdPrem === 0) {
                    pdPrem = pdCov > 0 ? 1245 : 0;
                  }
                  if (isNaN(paPrem) || paPrem === 0) {
                    paPrem = paCov > 0 ? 700 : 0;
                  }

                  const isSirJessApproved = (cust.used_rate_type || '').toUpperCase().includes('SIR JESS');

                  return (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Policy & Coverages</h4>
                      <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 mb-2">
                        <span className="text-slate-500 font-semibold text-xs">Policy No.#</span>
                        <span className="col-span-2 text-slate-800 font-mono font-bold">{cust.policy_no || '—'}</span>

                        <span className="text-slate-500 font-semibold text-xs">Inception Date</span>
                        <span className="col-span-2 text-slate-800 font-medium">{formatDate(cust.inception_date)}</span>
                      </div>

                      <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white text-xs">
                        <table className="w-full text-left text-slate-700 border-collapse">
                          <thead>
                            <tr className="bg-[#4A0E17] text-white font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2 px-3 text-left">Peril</th>
                              <th className="py-2 px-3 text-right">Coverage</th>
                              {!isSirJessApproved && <th className="py-2 px-3 text-right">Premium</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            <tr className="hover:bg-slate-50/80 transition">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">Own Damage</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(odCov)}</td>
                              {!isSirJessApproved && <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(odPrem)}</td>}
                            </tr>
                            <tr className="hover:bg-slate-50/80 transition">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">Acts of Nature</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(aonCov)}</td>
                              {!isSirJessApproved && <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(aonPrem)}</td>}
                            </tr>
                            <tr className="hover:bg-slate-50/80 transition">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">Bodily Injury</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(biCov)}</td>
                              {!isSirJessApproved && <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(biPrem)}</td>}
                            </tr>
                            <tr className="hover:bg-slate-50/80 transition">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">Property Damage</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(pdCov)}</td>
                              {!isSirJessApproved && <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(pdPrem)}</td>}
                            </tr>
                            <tr className="hover:bg-slate-50/80 transition">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">Personal Accident</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(paCov)}</td>
                              {!isSirJessApproved && <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(paPrem)}</td>}
                            </tr>
                            <tr className="bg-slate-50 font-bold border-t border-slate-200">
                              <td className="py-2 px-3 text-slate-900 uppercase text-[10px] tracking-wider" colSpan={isSirJessApproved ? 1 : 2}>Total Premium</td>
                              <td className="py-2 px-3 text-right font-mono text-[#4A0E17] font-black text-sm">{formatCurrency(quotation.total_premium)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* TERMS, RATES & MARKUP */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Terms, Rates & Markup</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Payment Terms</span>
                    <span className="col-span-2 text-slate-800 font-medium">
                      {quotation.customer?.payment_terms ? `${quotation.customer.payment_terms} Month(s)` : '—'}
                    </span>

                    <span className="text-slate-500 font-semibold text-xs">Sub-Agent's Name</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.sub_agent_name || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Used Rate Type</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.used_rate_type || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Used Rate</span>
                    <span className="col-span-2 text-slate-800 font-semibold">
                      {(quotation.customer?.used_rate_type || '').toUpperCase().includes('SIR JESS') ? '—' : (quotation.customer?.used_rate || '—')}
                    </span>

                    {details && !((quotation.customer?.used_rate_type || '').toUpperCase().includes('SIR JESS')) && (
                      <>
                        <span className="text-slate-500 font-semibold text-xs">Agent Mark Up</span>
                        <span className="col-span-2 text-slate-800 font-medium font-mono">{formatCurrency(details.calculator?.agent_markup)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Sub-Agent Mark Up</span>
                        <span className="col-span-2 text-slate-800 font-medium font-mono">{formatCurrency(details.calculator?.sub_agent_markup)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Freebie</span>
                        <span className="col-span-2 text-slate-800 font-medium font-mono">{formatCurrency(details.calculator?.freebie_amount ?? details.calculator?.freebie_cashback)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Cashback</span>
                        <span className="col-span-2 text-slate-800 font-medium font-mono">{formatCurrency(details.calculator?.cashback_amount)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fallback Items Table for Legacy Quotations */}
            {!details && quotation.items && quotation.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 pt-4">
                <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-4">Quotation Items</h4>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase">Product</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Description</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Sum Insured</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                        <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase">Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item, i) => (
                        <tr key={item.id ?? i} className="border-b border-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-800">{item.insurance_product?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{item.description || '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-700">₱{Number(item.sum_insured).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{Number(item.premium_rate).toFixed(4)}%</td>
                          <td className="px-6 py-3 text-right font-medium text-slate-800">{formatCurrency(item.premium_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pricing details and Prepare details */}
            {details && (
              <div className="pt-6 border-t border-slate-200/80">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Pricing Details */}
                  {!((quotation.customer?.used_rate_type || '').toUpperCase().includes('SIR JESS')) && (
                    <div className="md:col-span-2 bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-3 shadow-sm">
                      <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Pricing Details</h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Selling Rate (OD)</span>
                          <span className="font-semibold text-slate-800 font-mono">{Number(details.calculator?.selling_rate_od || 0).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Selling Rate (AON)</span>
                          <span className="font-semibold text-slate-800 font-mono">{Number(details.calculator?.selling_rate_aon || 0).toFixed(2)}%</span>
                        </div>
                        {(() => {
                          const isMotor = quotation.customer?.quotation_used?.trim().toUpperCase() === 'MOTOR';
                          const basicPremiumSum = Number(details.premiums?.od || 0) + Number(details.premiums?.aon || 0) + Number(details.premiums?.bi || 0) + Number(details.premiums?.pd || 0) + Number(details.premiums?.pa || 0);

                          if (isMotor) {
                            const dst = roundToTwoDecimals(basicPremiumSum * 0.125);
                            const eVat = roundToTwoDecimals(basicPremiumSum * 0.12);
                            const lgt = roundToTwoDecimals(basicPremiumSum * 0.002);
                            const totalTaxAndPremium = basicPremiumSum + dst + eVat + lgt;
                            const isPartnerRate = (quotation.customer?.used_rate_type || '').toUpperCase().includes('PARTNER') || (quotation.customer?.used_rate_type || '').toUpperCase().includes('SIR JESS');
                            const motorFixedAddition = isPartnerRate ? 3000 : 3500;
                            const grossPremium = totalTaxAndPremium + motorFixedAddition + Number(details.calculator?.towing_fee || 0);

                            return (
                              <>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-500 font-medium">Basic Premium</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(basicPremiumSum)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-500 font-medium">DST (12.5%)</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(dst)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-medium">E-VAT (12%)</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(eVat)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-medium">LGT (0.2%)</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(lgt)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-500 font-medium">Towing Fee</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(details.calculator?.towing_fee)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-600 font-bold">Gross Premium</span>
                                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(grossPremium)}</span>
                                </div>
                              </>
                            );
                          } else {
                            const isPartnerRate = (quotation.customer?.used_rate_type || '').toUpperCase().includes('PARTNER') || (quotation.customer?.used_rate_type || '').toUpperCase().includes('SIR JESS');
                            const isOldCarRate = (quotation.customer?.used_rate_type || '').trim().toUpperCase() === 'OLD CAR QUOTATION' || (quotation.customer?.quotation_used || '').trim().toUpperCase() === 'OLD CAR';
                            const gpMultiplier = isPartnerRate
                              ? roundToTwoDecimals(basicPremiumSum * 1.2525)
                              : (isOldCarRate
                                  ? roundToTwoDecimals((basicPremiumSum * 1.2525) + 1500 + 2500)
                                  : roundToTwoDecimals((basicPremiumSum * 1.2525) + 1500)
                                );
                            const grossPremium = gpMultiplier + Number(details.calculator?.towing_fee || 0);

                            return (
                              <>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-500 font-medium">Basic Premium</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(basicPremiumSum)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-500 font-medium">GP * 1.2525</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(gpMultiplier)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-medium">Towing Fee</span>
                                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(details.calculator?.towing_fee)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                                  <span className="text-slate-600 font-bold">Gross Premium</span>
                                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(grossPremium)}</span>
                                </div>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Prepared & Reviewed info */}
                  <div className={`${((quotation.customer?.used_rate_type || '').toUpperCase().includes('SIR JESS')) ? 'md:col-span-3' : ''} bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-3 shadow-sm`}>
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Prepared & Reviewed Info</h4>
                    <div className="space-y-2 text-xs text-slate-600">
                      {typeof quotation.prepared_by === 'object' && quotation.prepared_by && (
                        <div>Prepared by: <span className="font-semibold text-slate-800">{quotation.prepared_by.name}</span></div>
                      )}
                      {quotation.submitted_at && (
                        <div>Submitted: <span className="font-semibold text-slate-800">{new Date(quotation.submitted_at).toLocaleString()}</span></div>
                      )}
                      {typeof quotation.reviewed_by === 'object' && quotation.reviewed_by && (
                        <div>Reviewed by: <span className="font-semibold text-slate-800">{quotation.reviewed_by.name}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Policy Request Attachments */}
            <div className="space-y-3 pt-4 border-t border-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider">Policy Request Attachments</h4>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {customerAttachments.length} {customerAttachments.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const orcrFiles = customerAttachments.filter((a: any) => a.document_type === 'orcr_ndos_4sides');
                  const screenshotFiles = customerAttachments.filter((a: any) => a.document_type === 'ella_langrio_screenshot');
                  const bankFiles = customerAttachments.filter((a: any) => a.document_type === 'bank');
                  const deedOfSaleFiles = customerAttachments.filter((a: any) => a.document_type === 'deed_of_sale_ndos');
                  const otherFiles = customerAttachments.filter((a: any) => !['orcr_ndos_4sides', 'ella_langrio_screenshot', 'bank', 'deed_of_sale_ndos'].includes(a.document_type || ''));
                  const needsDeedOfSale = ['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(quotation.customer?.ownership || '');

                  const renderCategoryCard = (files: any[], defaultLabel: string, keyPrefix: string, showIfEmpty: boolean = true) => {
                    if (files.length === 0) {
                      if (!showIfEmpty) return null;
                      return (
                        <div key={keyPrefix} className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-400 shrink-0">
                              <Paperclip className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{defaultLabel}</p>
                              <p className="text-xs font-semibold text-slate-700 truncate">No file uploaded</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (files.length === 1) {
                      const file = files[0];
                      return (
                        <div key={`${keyPrefix}-${file.id}`} className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-[#4A0E17]/30 transition group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-[#4A0E17]/5 group-hover:text-[#4A0E17] text-slate-400 transition shrink-0">
                              <Paperclip className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{defaultLabel}</p>
                              <p className="text-xs font-semibold text-slate-700 truncate" title={file.file_name}>
                                {file.file_name}
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => downloadAttachment(file.id, file.file_name)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A0E17] hover:underline bg-[#4A0E17]/5 px-3 py-2 rounded-xl shrink-0 transition hover:bg-[#4A0E17]/10 ml-3 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={`${keyPrefix}-multi`} className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-2.5 hover:border-[#4A0E17]/30 transition">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-[#4A0E17]/5 text-[#4A0E17] rounded-lg shrink-0">
                              <Paperclip className="h-4 w-4" />
                            </div>
                            <p className="text-[10px] font-extrabold text-[#4A0E17] uppercase tracking-wider">
                              {defaultLabel} ({files.length})
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {files.length} files
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {files.map((file: any, index: number) => (
                            <div key={file.id || index} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">#{index + 1}</span>
                                <p className="font-semibold text-slate-700 truncate" title={file.file_name}>
                                  {file.file_name}
                                </p>
                              </div>
                              <button 
                                type="button"
                                onClick={() => downloadAttachment(file.id, file.file_name)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A0E17] hover:underline bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 transition hover:bg-[#4A0E17]/5 shadow-2xs cursor-pointer"
                              >
                                <Download className="h-3 w-3" /> Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  const items: React.ReactNode[] = [];
                  items.push(renderCategoryCard(orcrFiles, 'ORCR / NDOS / 4 SIDES', 'orcr', true));
                  items.push(renderCategoryCard(screenshotFiles, 'Ella Langrio Screenshot', 'screenshot', true));
                  items.push(renderCategoryCard(bankFiles, 'Bank Attachment', 'bank', true));
                  if (deedOfSaleFiles.length > 0 || needsDeedOfSale) {
                    items.push(renderCategoryCard(deedOfSaleFiles, 'Deed of Sale / NDOS', 'deed', true));
                  }
                  if (otherFiles.length > 0) {
                    items.push(renderCategoryCard(otherFiles, 'Attachment / Document', 'other', false));
                  }

                  return items.filter(Boolean);
                })()}
              </div>
            </div>

            {/* Notes & Remarks */}
            {(quotation.notes || quotation.reviewer_remarks) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotation.notes && (
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-100 p-4">
                    <h5 className="text-xs font-bold text-slate-700 mb-1">Notes</h5>
                    <p className="text-xs text-slate-650 bg-white p-2.5 rounded-lg border border-slate-100">{quotation.notes}</p>
                  </div>
                )}
                {quotation.reviewer_remarks && (
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-100 p-4">
                    <h5 className="text-xs font-bold text-slate-700 mb-1">Reviewer Remarks</h5>
                    <p className="text-xs text-slate-655 bg-white p-2.5 rounded-lg border border-slate-100">{quotation.reviewer_remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Underwriter Review Panel */}
            {!isAdmin && canReview && isReviewable && (
              <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl border border-violet-200/85 p-5">
                <h3 className="text-xs font-bold text-violet-800 mb-1">Underwriter Review</h3>
                <p className="text-[10px] text-violet-600 mb-3">Review this quotation and approve or reject it.</p>
                {!showReviewPanel ? (
                  <button onClick={() => setShowReviewPanel(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition cursor-pointer">
                    <FileText className="h-3.5 w-3.5" /> Start Review
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)}
                      rows={2} placeholder="Add your review remarks..."
                      className="w-full px-3 py-2 bg-white border border-violet-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => reviewMut.mutate({ action: 'approve', remarks: reviewRemarks })}
                        disabled={reviewMut.isPending}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => reviewMut.mutate({ action: 'reject', remarks: reviewRemarks })}
                        disabled={reviewMut.isPending}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition cursor-pointer">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button onClick={() => setShowReviewPanel(false)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-[#4A0E17]">Payment History</h4>
            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
              No payment transactions recorded for this record.
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-[#4A0E17]">Claims Record</h4>
            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
              No claims filed against this policy.
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <AttachmentPanel type="customer" id={quotation.customer_id} readOnly={!canEdit} />
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex items-center justify-end gap-2.5 shrink-0">
        {canEdit && (
          <button
            onClick={() => onEdit ? onEdit() : navigate(`/dashboard/quotations/${id}/edit`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            {quotation.status === 'rejected' ? 'Re-edit Details' : 'Edit Details'}
          </button>
        )}
        {canRequestCancellation && (
          <button
            onClick={() => setShowCancellationModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Request Cancellation
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#4A0E17] hover:bg-[#3D0B12] rounded-xl transition"
          >
            Close Window
          </button>
        )}
      </div>

      {showCancellationModal && (
        <RequestCancellationModal
          quotation={quotation}
          isOpen={showCancellationModal}
          onClose={() => setShowCancellationModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['quotation', id] });
            queryClient.invalidateQueries({ queryKey: ['quotations'] });
          }}
        />
      )}

      {/* ─── DOCUMENT PREVIEW MODAL ───────────────────────── */}
      {(previewModalUrl || isPreviewModalLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide">{previewModalTitle || 'Document Preview'}</h3>
              </div>
              <div className="flex items-center gap-2">
                {previewModalUrl && (
                  <button
                    type="button"
                    onClick={() => handleDownloadCancellationDoc(quotation?.cancellation_details?.attachment_url || '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClosePreviewModal}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex items-center justify-center min-h-[50vh]">
              {isPreviewModalLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-[#4A0E17]" />
                  <p className="text-sm font-semibold text-slate-500">Loading document preview...</p>
                </div>
              ) : previewModalUrl ? (
                previewModalType === 'image' ? (
                  <img
                    src={previewModalUrl}
                    alt={previewModalTitle}
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-sm border border-slate-200"
                  />
                ) : previewModalType === 'pdf' ? (
                  <iframe
                    src={previewModalUrl}
                    className="w-full h-[70vh] rounded-2xl border border-slate-200 bg-white"
                    title={previewModalTitle}
                  />
                ) : (
                  <div className="text-center py-10 space-y-4">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">This file format cannot be previewed in the browser.</p>
                    <button
                      type="button"
                      onClick={() => handleDownloadCancellationDoc(quotation?.cancellation_details?.attachment_url || '')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      <Download className="h-4 w-4" /> Download File
                    </button>
                  </div>
                )
              ) : (
                <div className="text-sm font-bold text-rose-500">Error loading document.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (onClose) {
    return mainContent;
  }

  return (
    <div className="max-w-6xl mx-auto text-slate-700 bg-white rounded-3xl border border-slate-200/80 flex flex-col shadow-sm mt-6 mb-12 overflow-hidden max-h-[90vh]">
      {mainContent}
    </div>
  );
}
