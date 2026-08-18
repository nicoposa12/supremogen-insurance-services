import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft, CheckCircle2, XCircle, FileText, Loader2,
  User, Car, Upload, History, Link2, Save, Paperclip, Download, AlertTriangle, Eye, X
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { getQuotation, reviewQuotation, reviewQuotationCancellation, updateQuotationMetadata } from '../../services/quotationApi';
import { updateCustomer } from '../../services/customerApi';
import { getAttachments, uploadAttachment, downloadAttachment } from '../../services/attachmentApi';
import { getClaims } from '../../services/claimApi';
import { useAuth } from '../../context/AuthContext';
import { getFileUrl } from '../../utils/url';

const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100 + 1e-9) / 100;
};

export default function InsuranceRequestDetailPage({ id, onClose }: { id: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles = [], permissions = [], token } = useAuth();

  const isUnderwriterOrAdmin = roles.some((r: string) =>
    ['Underwriter', 'Administrator', 'Owner', 'Super Admin'].includes(r)
  );

  // Review state
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const [showClaimsModal, setShowClaimsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bankFileInputRef = useRef<HTMLInputElement>(null);

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

  // Editable customer fields
  const [policyNo, setPolicyNo] = useState('');
  const [assuredClient, setAssuredClient] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [make, setMake] = useState('');
  const [color, setColor] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [mortgagee, setMortgagee] = useState('');
  const [seater, setSeater] = useState('');
  const [mvFileNo, setMvFileNo] = useState('');
  const [authNo, setAuthNo] = useState('');

  // Data queries
  const { data: response, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(id),
    enabled: !!id,
  });
  const quotation = response?.data;

  const { data: customerAttachmentsRes } = useQuery({
    queryKey: ['attachments', 'customer', quotation?.customer_id],
    queryFn: () => getAttachments('customer', quotation?.customer_id || 0),
    enabled: !!quotation?.customer_id,
  });
  const customerAttachments = customerAttachmentsRes?.data ?? [];

  const { data: claimsResponse } = useQuery({
    queryKey: ['customer-claims', quotation?.customer?.customer_code],
    queryFn: () => getClaims({ search: quotation?.customer?.customer_code || '' }),
    enabled: !!quotation?.customer?.customer_code,
  });
  const claims = claimsResponse?.data?.data || [];

  // Populate state from loaded data
  useEffect(() => {
    if (quotation) {
      setPolicyNo(quotation.customer?.policy_no || (quotation as any).policy?.policy_number || '');
      const c = quotation.customer;
      if (c) {
        const fullName = [c.first_name, c.middle_name, c.last_name, c.suffix].filter(Boolean).join(' ');
        setAssuredClient(fullName);
        setAddressLine1(c.address_line_1 || '');
        setCity(c.city || '');
        setProvince(c.province || '');
        setZipCode(c.zip_code || '');
        setContact(c.mobile || c.phone || '');
        setEmail(c.email || '');
        setPlateNo(c.plate_no || '');
        setMake(c.unit || '');
        setColor(c.color || '');
        setSerialNo(c.chassis_no || '');
        setEngineNo(c.engine_no || '');
        setMortgagee(c.mortgage || '');
        setSeater(String(quotation.items?.[0]?.coverage_details?.seater || ''));
        setMvFileNo(c.plate_no || '');
        setAuthNo('');
      }
    }
  }, [quotation]);

  // Mutations
  const reviewMut = useMutation({
    mutationFn: ({ action, remarks, policyNumber }: { action: 'approve' | 'reject'; remarks: string; policyNumber?: string }) =>
      reviewQuotation(id, action, remarks, undefined, undefined, policyNumber),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['insurance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast(vars.action === 'approve' ? 'Insurance request approved!' : 'Insurance request rejected.');
      setShowReviewPanel(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Review failed.', 'error'),
  });

  const reviewCancellationMut = useMutation({
    mutationFn: ({ action, remarks }: { action: 'approve' | 'reject'; remarks?: string }) =>
      reviewQuotationCancellation(id, action, remarks),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['insurance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast(vars.action === 'approve' ? 'Cancellation request approved and policy cancelled.' : 'Cancellation request rejected.');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Cancellation review failed.', 'error'),
  });

  const uploadAttachmentMut = useMutation({
    mutationFn: async ({ files, type }: { files: File[]; type: string }) => {
      if (!quotation?.customer_id) throw new Error('No customer ID');
      for (const file of files) {
        await uploadAttachment('customer', quotation.customer_id, file, type);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', 'customer', quotation?.customer_id] });
      showToast(`${vars.files.length} attachment(s) uploaded successfully.`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Upload failed.', 'error'),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!quotation?.customer_id) throw new Error('No customer');
      // Parse assured client name into parts
      const nameParts = assuredClient.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

      // Save customer info
      await updateCustomer(quotation.customer_id, {
        policy_no: policyNo,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        address_line_1: addressLine1,
        city,
        province,
        zip_code: zipCode,
        mobile: contact,
        email: email || undefined,
        plate_no: plateNo,
        unit: make,
        color,
        chassis_no: serialNo,
        engine_no: engineNo,
        mortgage: mortgagee,
      } as any);

      if (id && policyNo) {
        await updateQuotationMetadata(Number(id), {
          policyNumber: policyNo,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      showToast('Customer and quotation details saved successfully.');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Save failed.', 'error'),
  });

  const canReview = isUnderwriterOrAdmin && (permissions.includes('quotations.approve') || permissions.includes('quotations.reject'));
  const isReviewable = isUnderwriterOrAdmin && quotation && ['submitted', 'under_review', 'resubmitted'].includes(quotation.status);
  const isEditable = isUnderwriterOrAdmin && canReview && isReviewable;

  if (isLoading || !quotation) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" /></div>;
  }

  const customer = quotation.customer;
  const firstItem = quotation.items?.[0];
  const details = firstItem?.coverage_details || null;

  // Styling constants
  const labelClass = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[110px] text-right pr-3 pt-2.5';
  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all duration-150';
  const readonlyClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-semibold text-slate-800 cursor-default';
  const sectionHeaderClass = 'flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-transparent rounded-xl border border-slate-100';

  const fieldInput = (value: string, setter: (v: string) => void, placeholder = '') =>
    isEditable
      ? <input type="text" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} className={inputClass} />
      : <div className={readonlyClass}>{value || '—'}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-700">
      {/* ─── HEADER ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
        <div className="flex items-center gap-3.5">
          <button onClick={onClose}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{quotation.quotation_number}</h1>
              <StatusBadge status={quotation.status} size="sm" />
              {!isUnderwriterOrAdmin && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                  <Eye className="h-3 w-3 text-amber-600" /> Viewing Mode (Read-Only)
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Submitted {quotation.submitted_at ? new Date(quotation.submitted_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Actions & IR NO. */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button onClick={() => setShowClaimsModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm cursor-pointer no-print">
            <History className="h-3.5 w-3.5 text-slate-500" /> Claim History
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer no-print">
            {uploadAttachmentMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload Attachment
          </button>
          <button onClick={() => bankFileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer no-print">
            {uploadAttachmentMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload Bank Attachment
          </button>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">POLICY NO. :</span>
            {isEditable ? (
              <input
                type="text"
                value={policyNo}
                onChange={(e) => setPolicyNo(e.target.value)}
                placeholder="Assign Policy No..."
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 focus:border-[#4A0E17] font-mono text-xs font-bold text-[#4A0E17] rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/15 transition-all w-48 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
              />
            ) : (
              <span className="inline-flex items-center px-3.5 py-1.5 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-xl border border-slate-200">
                {policyNo || quotation.customer?.policy_no || (quotation as any).policy?.policy_number || '—'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">IR NO. :</span>
            <span className="inline-flex items-center px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-mono text-xs font-black rounded-xl shadow-2xs tracking-wider border border-amber-400/80">
              {quotation.ir_number || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── CANCELLATION REQUEST BANNER ─────────────────────── */}
      {/* ─── CANCELLATION REQUEST BANNER ─────────────────────── */}
      {quotation.status === 'cancellation_requested' && (
        <div className="bg-[#f0f2f5] border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                    REQUEST FOR CANCELLATION
                  </h3>
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-red-200">
                    Pending Underwriter Review
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Submitted by <span className="text-slate-800 font-bold">{typeof quotation.cancellation_requested_by === 'object' ? quotation.cancellation_requested_by?.name : 'Sales Agent'}</span>
                </p>
              </div>
            </div>

            {canReview && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => reviewCancellationMut.mutate({ action: 'reject' })}
                  disabled={reviewCancellationMut.isPending}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  Reject Cancellation
                </button>
                <button
                  onClick={() => reviewCancellationMut.mutate({ action: 'approve' })}
                  disabled={reviewCancellationMut.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Approve Cancellation
                </button>
              </div>
            )}
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
              <span className="font-mono text-slate-900">{quotation.cancellation_details?.policy_number || policyNo || quotation.customer?.policy_no || (quotation as any).policy?.policy_number || '—'}</span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-bold text-slate-900 uppercase">PLATE NUMBER:</span>
              <span className="font-mono text-slate-900 uppercase">{quotation.cancellation_details?.plate_number || quotation.customer?.plate_no || '—'}</span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-bold text-slate-900 uppercase">INSURANCE PROVIDER:</span>
              <span className="text-slate-800 uppercase">{quotation.cancellation_details?.provider || 'ALPHA'}</span>
            </p>

            <div className="pt-4">
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

      {/* ─── CLIENT INFORMATION ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <User className="h-4 w-4 text-[#4A0E17]" />
          <h3 className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Client Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs mt-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/50">
          {/* Column 1 & 2: Client Info */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Assured Client</span>
              <span className="text-slate-850 font-extrabold uppercase text-right">{assuredClient || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Address</span>
              <span className="text-slate-800 font-bold text-right pl-4">{[addressLine1, city, province, zipCode].filter(Boolean).join(', ') || '—'}</span>
            </div>
          </div>

          {/* Column 3: Contact & Email */}
          <div className="space-y-3.5">
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Contact</span>
              <span className="text-slate-800 font-bold font-mono text-right">{contact || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Email</span>
              <span className="text-slate-800 font-bold text-right break-all">{email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── VEHICLE INFORMATION ────────────────────── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Car className="h-4 w-4 text-[#4A0E17]" />
          <h3 className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Vehicle Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs mt-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/50">
          {/* Column 1: Basic Vehicle Info */}
          <div className="space-y-3.5">
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Plate No.</span>
              <span className="text-slate-855 font-extrabold font-mono uppercase text-right">{plateNo || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Make</span>
              <span className="text-slate-800 font-bold uppercase text-right">{make || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Model</span>
              <span className="text-slate-800 font-bold uppercase text-right">{customer?.quotation_used || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline pb-1">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Yr.</span>
              <span className="text-slate-800 font-bold text-right">{make ? make.match(/\d{4}/)?.[0] || '—' : '—'}</span>
            </div>
          </div>

          {/* Column 2: Specs & Identification */}
          <div className="space-y-3.5">
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Color</span>
              <span className="text-slate-800 font-bold uppercase text-right">{color || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Serial No.</span>
              <span className="text-slate-800 font-bold font-mono uppercase text-right truncate max-w-[150px]" title={serialNo}>{serialNo || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Engine No.</span>
              <span className="text-slate-800 font-bold font-mono uppercase text-right truncate max-w-[150px]" title={engineNo}>{engineNo || '—'}</span>
            </div>
            <div className="flex justify-between items-baseline pb-1">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">No. of Seats</span>
              <span className="text-slate-800 font-bold text-right">{seater || '—'}</span>
            </div>
          </div>

          {/* Column 3: Mortgagee & TPL details */}
          <div className="space-y-4.5">
            <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-2.5">
              <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Mortgagee</span>
              <span className="text-slate-850 font-extrabold uppercase text-xs">{mortgagee || '—'}</span>
            </div>

            {/* TPL Only Section */}
            <div className="border border-amber-200/80 rounded-xl overflow-hidden bg-amber-50/20">
              <div className="bg-amber-500/10 px-3 py-1.5 border-b border-amber-200/85">
                <h4 className="text-[9px] font-extrabold text-amber-800 uppercase tracking-widest text-center">
                  TPL Details Only
                </h4>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between items-baseline text-[11px]">
                  <span className="text-amber-850 font-bold uppercase text-[9px]">MV File No.</span>
                  <span className="text-slate-800 font-extrabold font-mono uppercase">{mvFileNo || '—'}</span>
                </div>
                <div className="flex justify-between items-baseline text-[11px]">
                  <span className="text-amber-850 font-bold uppercase text-[9px]">Auth. No.</span>
                  <span className="text-slate-800 font-extrabold font-mono uppercase">{authNo || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Duplicate Plates Alert (if any, full span) */}
          {customer?.duplicate_plates && customer.duplicate_plates.length > 0 && (
            <div className="col-span-1 md:col-span-3 mt-2 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl">
              <div className="flex items-center gap-2 font-extrabold text-amber-800 text-xs">
                <span>⚠️</span><span>DUPLICATE PLATE NO. DETECTED</span>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[10px] text-amber-900">
                {customer.duplicate_plates.map((dup: any) => (
                  <div key={dup.id} className="bg-amber-100/50 border border-amber-200/60 px-2.5 py-1.5 rounded-lg">
                    • {dup.first_name} {dup.last_name} ({dup.customer_code})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── COVERAGE & PREMIUM DETAILS ─────────────── */}
      {details && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6 border-t border-slate-150">
          {/* Left: Coverages & Premiums */}
          <div className="lg:col-span-8 space-y-6">
            {/* Request Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Request Details</h4>
              <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 text-xs">
                <span className="text-slate-500 font-semibold">Date Request</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.writing_date ? new Date(customer.writing_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : '—'}</span>

                <span className="text-slate-500 font-semibold">Inception Date</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.inception_date ? new Date(customer.inception_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : '—'}</span>

                <span className="text-slate-500 font-semibold">Type</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.request_type || '—'}</span>

                <span className="text-slate-500 font-semibold">Activity</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.activity || '—'}</span>

                <span className="text-slate-500 font-semibold">Provider</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.insurance_provider || '—'}</span>

                <span className="text-slate-500 font-semibold">Quotation Used</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.quotation_used || '—'}</span>

                <span className="text-slate-500 font-semibold">Usage</span>
                <span className="col-span-2 text-slate-800 font-bold">{customer?.usage || '—'}</span>
              </div>
            </div>

            {/* Coverages & Premiums Table */}
            {(() => {
              const custAny: any = customer || {};
              const itemSumInsured = Number(firstItem?.sum_insured || 0);
              const covSumInsured = Number(details?.sum_insured || details?.coverages?.own_damage || details?.coverages?.od || custAny.own_damage_coverage || custAny.sum_insured || 0);
              const odCoverage = itemSumInsured > 0 ? itemSumInsured : (covSumInsured > 0 ? covSumInsured : 430000);
              const aonCoverage = odCoverage;

              const biCoverage = Number(details?.coverages?.bi || details?.cov_bi || custAny.bi_coverage || 200000);
              const pdCoverage = Number(details?.coverages?.pd || details?.cov_pd || custAny.pd_coverage || 200000);
              const paCoverage = Number(details?.coverages?.pa || details?.cov_pa || custAny.pa || custAny.pa_coverage || 250000);

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

              let odPrem = Number(details?.premiums?.od ?? custAny.od_premium ?? custAny.premiums?.od ?? 0);
              let aonPrem = Number(details?.premiums?.aon ?? custAny.aon_premium ?? custAny.premiums?.aon ?? 0);
              let biPrem = Number(details?.premiums?.bi ?? custAny.bi_premium ?? custAny.premiums?.bi ?? 0);
              let pdPrem = Number(details?.premiums?.pd ?? custAny.pd_premium ?? custAny.premiums?.pd ?? 0);
              let paPrem = Number(details?.premiums?.pa ?? custAny.pa_premium ?? custAny.premiums?.pa ?? 0);

              if (isNaN(odPrem) || odPrem === 0) {
                if (odCoverage > 0) {
                  const rateOD = parseRate(details?.calculator?.selling_rate_od ?? custAny.selling_rate_od ?? custAny.used_rate, 1.30);
                  odPrem = Math.round(odCoverage * (rateOD / 100) * 100) / 100;
                } else {
                  odPrem = 0;
                }
              }
              if (isNaN(aonPrem) || aonPrem === 0) {
                if (aonCoverage > 0) {
                  const rateAON = parseRate(details?.calculator?.selling_rate_aon ?? custAny.selling_rate_aon, 0.10);
                  aonPrem = Math.round(aonCoverage * (rateAON / 100) * 100) / 100;
                } else {
                  aonPrem = 0;
                }
              }
              if (isNaN(biPrem) || biPrem === 0) {
                biPrem = biCoverage > 0 ? 420 : 0;
              }
              if (isNaN(pdPrem) || pdPrem === 0) {
                pdPrem = pdCoverage > 0 ? 1245 : 0;
              }
              if (isNaN(paPrem) || paPrem === 0) {
                paPrem = paCoverage > 0 ? 700 : 0;
              }

              const formatAmt = (val: number | string | undefined | null) => {
                const num = Number(val || 0);
                if (isNaN(num)) return '0.00';
                return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              };

              return (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Coverages & Premiums
                  </h4>
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-xs text-left text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-[#4A0E17] text-white font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-4 text-left">Coverage Type</th>
                          <th className="py-2.5 px-4 text-right">Sum Insured (Coverage)</th>
                          <th className="py-2.5 px-4 text-right">Premium</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-4 font-bold text-slate-800">Own Damage / Theft (OD)</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">₱{formatAmt(odCoverage)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">₱{formatAmt(odPrem)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-4 font-bold text-slate-800">Acts of Nature (AON)</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">₱{formatAmt(aonCoverage)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">₱{formatAmt(aonPrem)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-4 font-bold text-slate-800">Excess Bodily Injury (BI)</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">₱{formatAmt(biCoverage)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">₱{formatAmt(biPrem)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-4 font-bold text-slate-800">Third Party Property Damage (PD)</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">₱{formatAmt(pdCoverage)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">₱{formatAmt(pdPrem)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-4 font-bold text-slate-800">Auto Passenger Accident (PA)</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">₱{formatAmt(paCoverage)}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">₱{formatAmt(paPrem)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Attachments */}
            <div className="space-y-3">
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
          </div>

          {/* Right: Pricing Summary */}
          <div className="lg:col-span-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-3.5">
            <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Pricing Details</h4>

            {(() => {
              const isMotor = quotation.customer?.quotation_used?.trim().toUpperCase() === 'MOTOR';
              const basicPremiumSum = Number(details.premiums?.od || 0) + Number(details.premiums?.aon || 0) + Number(details.premiums?.bi || 0) + Number(details.premiums?.pd || 0) + Number(details.premiums?.pa || 0);

              if (isMotor) {
                const dst = roundToTwoDecimals(basicPremiumSum * 0.125);
                const eVat = roundToTwoDecimals(basicPremiumSum * 0.12);
                const lgt = roundToTwoDecimals(basicPremiumSum * 0.002);
                const totalTaxAndPremium = basicPremiumSum + dst + eVat + lgt;
                const isPartnerRate = (customer?.used_rate_type || '').toUpperCase().includes('PARTNER') || (customer?.used_rate_type || '').toUpperCase().includes('SIR JESS');
                const motorFixedAddition = isPartnerRate ? 3000 : 3500;
                const grossPremium = totalTaxAndPremium + motorFixedAddition + Number(details.calculator?.towing_fee || 0);

                return (
                  <div className="space-y-3.5 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Selling Rate (OD)</span>
                      <span className="font-semibold text-slate-800 font-mono text-sm">{Number(details.calculator?.selling_rate_od || 0).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Selling Rate (AON)</span>
                      <span className="font-semibold text-slate-800 font-mono text-sm">{Number(details.calculator?.selling_rate_aon || 0).toFixed(2)}%</span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-200">
                      <span className="font-medium">Basic Premium</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{basicPremiumSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">DST (12.5%)</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{dst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">E-VAT (12%)</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{eVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">LGT (0.2%)</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{lgt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Towing Fee</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{Number(details.calculator?.towing_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-200">
                      <span className="font-bold text-slate-700">Gross Premium</span>
                      <span className="font-bold text-slate-850 font-mono text-sm">₱{grossPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Agent Mark Up</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Sub-Agent Mark Up</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.sub_agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Freebie</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.freebie_amount ?? (details.calculator?.freebie_cashback || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Cashback</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.cashback_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-4 border-t-2 border-[#4A0E17]/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Premium</span>
                      <div className="flex items-baseline justify-between">
                        <span className="font-extrabold text-[#4A0E17] font-mono text-xl">₱{Number(quotation.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Gross + Markups</span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const isPartnerRate = (customer?.used_rate_type || '').toUpperCase().includes('PARTNER') || (customer?.used_rate_type || '').toUpperCase().includes('SIR JESS');
                const gpMultiplier = isPartnerRate
                  ? roundToTwoDecimals(basicPremiumSum * 1.2525)
                  : roundToTwoDecimals((basicPremiumSum * 1.2525) + 1500);
                const grossPremium = gpMultiplier + Number(details.calculator?.towing_fee || 0);

                return (
                  <div className="space-y-3.5 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Selling Rate (OD)</span>
                      <span className="font-semibold text-slate-800 font-mono text-sm">{Number(details.calculator?.selling_rate_od || 0).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Selling Rate (AON)</span>
                      <span className="font-semibold text-slate-800 font-mono text-sm">{Number(details.calculator?.selling_rate_aon || 0).toFixed(2)}%</span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-200">
                      <span className="font-medium">Basic Premium</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{basicPremiumSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">GP × 1.2525</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{gpMultiplier.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Towing Fee</span>
                      <span className="font-semibold text-slate-850 font-mono text-sm">₱{Number(details.calculator?.towing_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-200">
                      <span className="font-bold text-slate-700">Gross Premium</span>
                      <span className="font-bold text-slate-850 font-mono text-sm">₱{grossPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Agent Mark Up</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Sub-Agent Mark Up</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.sub_agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Freebie</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.freebie_amount ?? (details.calculator?.freebie_cashback || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Cashback</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.cashback_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-4 border-t-2 border-[#4A0E17]/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Premium</span>
                      <div className="flex items-baseline justify-between">
                        <span className="font-extrabold text-[#4A0E17] font-mono text-xl">₱{Number(quotation.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Gross + Markups</span>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* ─── Notes & Remarks ─────────────────────────── */}
      {(quotation.notes || quotation.reviewer_remarks) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotation.notes && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Notes</h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{quotation.notes}</p>
            </div>
          )}
          {quotation.reviewer_remarks && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Reviewer Remarks</h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{quotation.reviewer_remarks}</p>
              {typeof quotation.reviewed_by === 'object' && quotation.reviewed_by && (
                <p className="text-xs text-slate-400 mt-2">
                  By {quotation.reviewed_by.name} · {quotation.reviewed_at ? new Date(quotation.reviewed_at).toLocaleDateString() : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Underwriter Review Panel ────────────────── */}
      {canReview && isReviewable && (
        <div className="bg-gradient-to-r from-slate-900 via-[#2A080D] to-[#4A0E17] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-rose-950/40 relative overflow-hidden space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/10 text-amber-300 rounded-2xl border border-white/10 backdrop-blur-md">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  UNDERWRITER DECISION & POLICY ASSIGNMENT
                </h3>
                <p className="text-xs font-medium text-slate-300 mt-0.5">
                  Review submitted policy details, assign official policy number, and finalize approval state.
                </p>
              </div>
            </div>

            {!showReviewPanel && (
              <button
                onClick={() => setShowReviewPanel(true)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider shrink-0"
              >
                <FileText className="h-4 w-4" /> Start Review
              </button>
            )}
          </div>

          {showReviewPanel && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-black text-amber-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span>Assign Official Policy Number</span>
                  <span className="text-[10px] text-slate-400 font-medium normal-case font-sans">(Editable by Underwriter)</span>
                </label>
                <input
                  type="text"
                  value={policyNo}
                  onChange={(e) => setPolicyNo(e.target.value)}
                  placeholder="Enter policy number to assign (e.g. MCP-2026-001)..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 focus:border-amber-400 font-mono text-sm font-bold text-white placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Underwriter Remarks & Audit Notes
                </label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add optional review remarks or underwriting notes..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 focus:border-amber-400 text-sm text-white placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => reviewMut.mutate({ action: 'approve', remarks: reviewRemarks, policyNumber: policyNo })}
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve & Issue Policy
                </button>
                <button
                  onClick={() => reviewMut.mutate({ action: 'reject', remarks: reviewRemarks })}
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  <XCircle className="h-4 w-4" /> Reject Request
                </button>
                <button
                  onClick={() => setShowReviewPanel(false)}
                  className="px-4 py-3 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prepared By Info */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {typeof quotation.prepared_by === 'object' && quotation.prepared_by && (
          <span>Prepared by: <span className="text-slate-600">{quotation.prepared_by.name}</span></span>
        )}
        {quotation.submitted_at && (
          <span>Submitted: <span className="text-slate-600">{new Date(quotation.submitted_at).toLocaleString()}</span></span>
        )}
        {typeof quotation.reviewed_by === 'object' && quotation.reviewed_by && (
          <span>Reviewed by: <span className="text-slate-600">{quotation.reviewed_by.name}</span></span>
        )}
      </div>

      {/* Hidden File Input for Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            uploadAttachmentMut.mutate({ files, type: 'other' });
            e.target.value = '';
          }
        }}
        className="hidden"
        accept="image/*,application/pdf"
      />
      <input
        type="file"
        ref={bankFileInputRef}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            uploadAttachmentMut.mutate({ files, type: 'bank' });
            e.target.value = '';
          }
        }}
        className="hidden"
        accept="image/*,application/pdf"
      />

      {/* Claim History Modal */}
      {showClaimsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowClaimsModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base tracking-tight">Claim History - {assuredClient}</h3>
              <button onClick={() => setShowClaimsModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50 flex-1">
              {claims.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium text-sm">No claims filed for this customer.</div>
              ) : (
                <div className="space-y-3">
                  {claims.map((claim: any) => (
                    <div key={claim.id} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm hover:shadow transition">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="font-mono font-bold text-[#4A0E17] text-sm">{claim.claim_number}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${claim.status === 'settled' || claim.status === 'closed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                            claim.status === 'approved' ? 'bg-blue-50 text-blue-700 border border-blue-250' :
                              claim.status === 'denied' ? 'bg-red-50 text-red-700 border border-red-250' : 'bg-amber-50 text-amber-700 border border-amber-250'
                          }`}>{claim.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                        <div><strong className="text-slate-600">Incident Date:</strong> {new Date(claim.incident_date).toLocaleDateString()}</div>
                        <div><strong className="text-slate-600">Amount:</strong> ₱{Number(claim.claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <strong className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Description:</strong>
                        {claim.incident_description || 'No description provided.'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}
