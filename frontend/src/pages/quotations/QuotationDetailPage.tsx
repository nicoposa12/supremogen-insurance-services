import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, CheckCircle2, XCircle, Send, ShieldCheck,
  Loader2, User, FileText, X, Calendar, Link2
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { getQuotation, submitQuotation, reviewQuotation } from '../../services/quotationApi';
import { useAuth } from '../../context/AuthContext';
import { getAttachments } from '../../services/attachmentApi';
import AttachmentPanel from '../../components/ui/AttachmentPanel';
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
  const { permissions, roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [activeTab, setActiveTab] = useState<'info' | 'payment' | 'claims' | 'documents'>('info');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showReviewPanel, setShowReviewPanel] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast('Quotation submitted for review.');
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
  const isReviewable = quotation && ['submitted', 'under_review'].includes(quotation.status);
  const canIssuePolicy = quotation?.status === 'approved' && permissions.includes('policies.create');
  const canEdit = (roles.includes('Sales Agent') || roles.includes('Team Renewal')) && quotation?.status === 'draft';

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
                  <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit Draft
                </button>
                <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-xs font-bold rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-md shadow-[#4A0E17]/20 transition-all cursor-pointer">
                  <Send className="h-3.5 w-3.5" /> Submit for Review
                </button>
              </>
            )}
            {!isAdmin && canIssuePolicy && (
              <button onClick={() => navigate(`/dashboard/policies/issue/${quotation.id}`)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
                <ShieldCheck className="h-3.5 w-3.5" /> Issue Policy
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

                    <span className="text-slate-500 font-semibold text-xs">Bank</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.mortgage || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Ownership</span>
                    <span className="col-span-2 text-slate-800 font-bold uppercase">{quotation.customer?.ownership || '—'}</span>
                  </div>
                </div>

                {/* POLICY & COVERAGES */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Policy & Coverages</h4>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                    <span className="text-slate-500 font-semibold text-xs">Policy No.#</span>
                    <span className="col-span-2 text-slate-800 font-mono font-bold">{quotation.customer?.policy_no || '—'}</span>

                    <span className="text-slate-500 font-semibold text-xs">Inception Date</span>
                    <span className="col-span-2 text-slate-800 font-medium">{formatDate(quotation.customer?.inception_date)}</span>

                    <span className="text-slate-500 font-semibold text-xs">Own Damage</span>
                    <span className="col-span-2 text-slate-800 font-semibold font-mono">
                      {details ? formatCurrency(details.premiums?.od) : formatCurrency(quotation.customer?.own_damage_coverage)}
                    </span>

                    <span className="text-slate-500 font-semibold text-xs">Acts of Nature</span>
                    <span className="col-span-2 text-slate-800 font-semibold font-mono">
                      {details ? formatCurrency(details.premiums?.aon) : formatCurrency(quotation.customer?.aog)}
                    </span>

                    {details ? (
                      <>
                        <span className="text-slate-500 font-semibold text-xs">Bodily Injury</span>
                        <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(details.premiums?.bi)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Property Damage</span>
                        <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(details.premiums?.pd)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Personal Accident</span>
                        <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(details.premiums?.pa)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500 font-semibold text-xs">Bodily Injury</span>
                        <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(quotation.customer?.bi_coverage)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Property Damage</span>
                        <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(quotation.customer?.pd_coverage)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Personal Accident</span>
                        <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(quotation.customer?.pa)}</span>
                      </>
                    )}

                    <span className="text-slate-500 font-semibold text-xs">Total Premium</span>
                    <span className="col-span-2 text-[#4A0E17] font-extrabold font-mono">{formatCurrency(quotation.total_premium)}</span>
                  </div>
                </div>

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
                    <span className="col-span-2 text-slate-800 font-semibold">{quotation.customer?.used_rate || '—'}</span>

                    {details && (
                      <>
                        <span className="text-slate-500 font-semibold text-xs">Sub-Agent Mark Up</span>
                        <span className="col-span-2 text-slate-800 font-medium font-mono">{formatCurrency(details.calculator?.sub_agent_markup)}</span>

                        <span className="text-slate-500 font-semibold text-xs">Freebie & Cashback</span>
                        <span className="col-span-2 text-slate-800 font-medium font-mono">{formatCurrency(details.calculator?.freebie_cashback)}</span>
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
                          const grossPremium = totalTaxAndPremium + 3500 + Number(details.calculator?.towing_fee || 0);

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
                          const gpMultiplier = roundToTwoDecimals((basicPremiumSum * 1.2525) + 1500);
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

                  {/* Prepared & Reviewed info */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-3 shadow-sm">
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
            Edit Details
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
