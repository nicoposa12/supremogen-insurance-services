import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, XCircle, FileText, Loader2,
  User, Car, Upload, History, Link2, Save
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { getQuotation, reviewQuotation } from '../../services/quotationApi';
import { updateCustomer } from '../../services/customerApi';
import { getAttachments, uploadAttachment } from '../../services/attachmentApi';
import { getClaims } from '../../services/claimApi';
import { useAuth } from '../../context/AuthContext';

const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100 + 1e-9) / 100;
};

export default function InsuranceRequestDetailPage({ id, onClose }: { id: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { permissions } = useAuth();

  // Review state
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const [showClaimsModal, setShowClaimsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bankFileInputRef = useRef<HTMLInputElement>(null);

  // Editable customer fields
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
    mutationFn: ({ action, remarks }: { action: 'approve' | 'reject'; remarks: string }) =>
      reviewQuotation(id, action, remarks),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['insurance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast(vars.action === 'approve' ? 'Insurance request approved!' : 'Insurance request rejected.');
      setShowReviewPanel(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Review failed.', 'error'),
  });

  const uploadAttachmentMut = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) =>
      uploadAttachment('customer', quotation?.customer_id || 0, file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', 'customer', quotation?.customer_id] });
      showToast('Attachment uploaded successfully.');
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      showToast('Customer and quotation details saved successfully.');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Save failed.', 'error'),
  });

  const canReview = permissions.includes('quotations.approve') || permissions.includes('quotations.reject');
  const isReviewable = quotation && ['submitted', 'under_review'].includes(quotation.status);
  const isEditable = canReview;

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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">IR NO. :</span>
            <span className="inline-flex items-center px-4 py-1.5 bg-amber-400 text-slate-900 font-mono text-base font-extrabold rounded-lg shadow-sm tracking-wider border border-amber-500">
              {quotation.ir_number || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── CLIENT INFORMATION ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <User className="h-4 w-4 text-[#4A0E17]" />
          <h3 className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Client Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3.5 gap-x-6 text-xs mt-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/50">
          <div className="md:col-span-3 flex items-baseline">
            <span className="text-slate-400 font-bold uppercase tracking-wider w-28 shrink-0">Assured Client</span>
            <span className="text-slate-850 font-extrabold uppercase text-sm">{assuredClient || '—'}</span>
          </div>
          <div className="md:col-span-3 flex items-baseline border-t border-slate-100 pt-3">
            <span className="text-slate-400 font-bold uppercase tracking-wider w-28 shrink-0">Address</span>
            <span className="text-slate-800 font-bold">{[addressLine1, city, province, zipCode].filter(Boolean).join(', ') || '—'}</span>
          </div>
          <div className="flex items-baseline border-t border-slate-100 pt-3 md:col-span-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider w-28 shrink-0">Contact</span>
            <span className="text-slate-800 font-bold font-mono">{contact || '—'}</span>
          </div>
          <div className="flex items-baseline border-t border-slate-100 pt-3 md:col-span-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider w-28 shrink-0">Email</span>
            <span className="text-slate-800 font-bold">{email || '—'}</span>
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
                <span className="col-span-2 text-slate-800 font-bold">{customer?.writing_date ? new Date(customer.writing_date).toLocaleDateString() : '—'}</span>

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

            {/* Premiums Panel */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Premiums</h4>
              <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 text-xs">
                <span className="text-slate-500 font-semibold">Own Damage Premium</span>
                <span className="col-span-2 text-slate-800 font-semibold font-mono">₱{Number(details.premiums?.od || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>

                <span className="text-slate-500 font-semibold">Acts of Nature (AON) Premium</span>
                <span className="col-span-2 text-slate-800 font-semibold font-mono">₱{Number(details.premiums?.aon || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>

                <span className="text-slate-500 font-semibold">Bodily Injury (BI) Premium</span>
                <span className="col-span-2 text-slate-800 font-semibold font-mono">₱{Number(details.premiums?.bi || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>

                <span className="text-slate-500 font-semibold">Property Damage (PD) Premium</span>
                <span className="col-span-2 text-slate-800 font-semibold font-mono">₱{Number(details.premiums?.pd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>

                <span className="text-slate-500 font-semibold">Auto Passenger (PA) Premium</span>
                <span className="col-span-2 text-slate-800 font-semibold font-mono">₱{Number(details.premiums?.pa || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Policy Request Attachments</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const orcr = customerAttachments.find((a: any) => a.document_type === 'orcr_ndos_4sides');
                  const screenshot = customerAttachments.find((a: any) => a.document_type === 'ella_langrio_screenshot');
                  const bankAttachment = customerAttachments.find((a: any) => a.document_type === 'bank');
                  return (
                    <>
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ORCR / NDOS / 4 SIDES</p>
                          <p className="text-xs font-medium text-slate-650 truncate">{orcr ? orcr.file_name : 'No file uploaded'}</p>
                        </div>
                        {orcr && (
                          <a href={`/api/v1/attachments/${orcr.id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A0E17] hover:underline bg-[#4A0E17]/5 px-3 py-2 rounded-xl shrink-0 transition hover:bg-[#4A0E17]/10">
                            <Link2 className="h-3.5 w-3.5" /> Download
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ella Langrio Screenshot</p>
                          <p className="text-xs font-medium text-slate-655 truncate">{screenshot ? screenshot.file_name : 'No file uploaded'}</p>
                        </div>
                        {screenshot && (
                          <a href={`/api/v1/attachments/${screenshot.id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A0E17] hover:underline bg-[#4A0E17]/5 px-3 py-2 rounded-xl shrink-0 transition hover:bg-[#4A0E17]/10">
                            <Link2 className="h-3.5 w-3.5" /> Download
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bank Attachment</p>
                          <p className="text-xs font-medium text-slate-655 truncate">{bankAttachment ? bankAttachment.file_name : 'No file uploaded'}</p>
                        </div>
                        {bankAttachment && (
                          <a href={`/api/v1/attachments/${bankAttachment.id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A0E17] hover:underline bg-[#4A0E17]/5 px-3 py-2 rounded-xl shrink-0 transition hover:bg-[#4A0E17]/10">
                            <Link2 className="h-3.5 w-3.5" /> Download
                          </a>
                        )}
                      </div>
                    </>
                  );
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
                const grossPremium = totalTaxAndPremium + 3500 + Number(details.calculator?.towing_fee || 0);

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
                      <span className="font-medium">Sub-Agent Mark Up</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.sub_agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Freebie & Cashback</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.freebie_cashback || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                const gpMultiplier = roundToTwoDecimals((basicPremiumSum * 1.2525) + 1500);
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
                      <span className="font-medium">Sub-Agent Mark Up</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.sub_agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Freebie & Cashback</span>
                      <span className="font-semibold text-slate-805 font-mono text-sm">₱{Number(details.calculator?.freebie_cashback || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
        <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl border border-violet-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-violet-800 mb-1">Underwriter Review</h3>
          <p className="text-xs text-violet-600 mb-4">Review this insurance request and approve or reject it.</p>

          {!showReviewPanel ? (
            <button onClick={() => setShowReviewPanel(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition cursor-pointer">
              <FileText className="h-4 w-4" /> Start Review
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-violet-700 mb-1.5">Remarks</label>
                <textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3} placeholder="Add your review remarks..."
                  className="w-full px-3.5 py-2.5 bg-white border border-violet-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => reviewMut.mutate({ action: 'approve', remarks: reviewRemarks })}
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-600/20 transition cursor-pointer">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => reviewMut.mutate({ action: 'reject', remarks: reviewRemarks })}
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition cursor-pointer">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button onClick={() => setShowReviewPanel(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
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
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadAttachmentMut.mutate({ file: e.target.files[0], type: 'other' });
          }
        }}
        className="hidden"
        accept="image/*,application/pdf"
      />
      <input
        type="file"
        ref={bankFileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadAttachmentMut.mutate({ file: e.target.files[0], type: 'bank' });
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
    </div>
  );
}
