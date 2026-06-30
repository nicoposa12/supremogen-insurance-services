import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, CheckCircle2, XCircle, Send, ShieldCheck,
  Loader2, Clock, User, FileText, DollarSign, ShieldAlert, Shield, Link2, Calculator
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { getQuotation, submitQuotation, reviewQuotation } from '../../services/quotationApi';
import { useAuth } from '../../context/AuthContext';
import AttachmentPanel from '../../components/ui/AttachmentPanel';

export default function QuotationDetailPage({ id: propId, onClose, onEdit }: { id?: number; onClose?: () => void; onEdit?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { permissions, roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [reviewRemarks, setReviewRemarks] = useState('');
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotation(Number(id)),
    enabled: !!id,
  });
  const quotation = response?.data;

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

  if (isLoading || !quotation) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" /></div>;
  }

  const firstItem = quotation.items?.[0];
  const hasCoverageDetails = firstItem && firstItem.coverage_details;
  const details = hasCoverageDetails ? firstItem.coverage_details : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => onClose ? onClose() : navigate('/dashboard/quotations')} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{quotation.quotation_number}</h1>
            <StatusBadge status={quotation.status} size="md" />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Prepared {new Date(quotation.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {roles.includes('Sales Agent') && quotation.status === 'draft' && (
            <>
              <button onClick={() => onEdit ? onEdit() : navigate(`/dashboard/quotations/${id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] text-white text-sm font-medium rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
                <Send className="h-4 w-4" /> Submit for Review
              </button>
            </>
          )}
          {!isAdmin && canIssuePolicy && (
            <button onClick={() => navigate(`/dashboard/policies/issue/${quotation.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition cursor-pointer">
              <ShieldCheck className="h-4 w-4" /> Issue Policy
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-[#4A0E17]/5 rounded-xl"><User className="h-5 w-5 text-[#4A0E17]" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Customer</p>
          </div>
          <p className="text-sm font-medium text-slate-800">{quotation.customer?.first_name} {quotation.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{quotation.customer?.customer_code}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Premium</p>
          </div>
          <p className="text-xl font-extrabold text-emerald-700 font-mono">₱{Number(quotation.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-50 rounded-xl"><Clock className="h-5 w-5 text-violet-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Valid Until</p>
          </div>
          <p className="text-sm font-medium text-slate-800">
            {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'Not set'}
          </p>
        </div>
      </div>

      {/* Detailed Coverage View (If custom details exist) */}
      {details ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Coverages and Policy Info */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Policy Information */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Policy Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Agent</span>
                  <span className="font-semibold text-slate-800">{details.agent || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Insurance Provider</span>
                  <span className="font-semibold text-slate-800">{details.insurance_provider || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Assured Value</span>
                  <span className="font-bold text-slate-800 font-mono">₱{Number(firstItem.sum_insured).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Seater</span>
                  <span className="font-semibold text-slate-800">{details.seater ? `${details.seater} Seater` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Coverage Grid */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-6 mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider">Coverage</h3>
                <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider text-right">Premium</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-6 py-1 border-b border-slate-50">
                  <div>
                    <span className="font-medium text-slate-800 block">Own Damage</span>
                    <span className="text-xs text-slate-400 font-mono">₱{Number(details.coverages?.own_damage || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right font-mono text-slate-800 font-medium">
                    ₱{Number(details.premiums?.od || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-1 border-b border-slate-50">
                  <div>
                    <span className="font-medium text-slate-800 block">Theft and Loss</span>
                    <span className="text-xs text-slate-400 font-mono">₱{Number(details.coverages?.theft_loss || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right text-xs text-slate-400 italic font-mono">
                    Included in OD
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-1 border-b border-slate-50">
                  <div>
                    <span className="font-medium text-slate-800 block">Acts of Nature (AON)</span>
                    <span className="text-xs text-slate-400 font-mono">₱{Number(details.coverages?.aon || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right font-mono text-slate-800 font-medium">
                    ₱{Number(details.premiums?.aon || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-1 border-b border-slate-50">
                  <div>
                    <span className="font-medium text-slate-800 block">Bodily Injury (BI)</span>
                    <span className="text-xs text-slate-400 font-mono">₱{Number(details.coverages?.bi || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right font-mono text-slate-800 font-medium">
                    ₱{Number(details.premiums?.bi || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-1 border-b border-slate-50">
                  <div>
                    <span className="font-medium text-slate-800 block">Property Damage (PD)</span>
                    <span className="text-xs text-slate-400 font-mono">₱{Number(details.coverages?.pd || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right font-mono text-slate-800 font-medium">
                    ₱{Number(details.premiums?.pd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-1">
                  <div>
                    <span className="font-medium text-slate-800 block">Auto Passenger (PA)</span>
                    <span className="text-xs text-slate-400 font-mono">₱{Number(details.coverages?.pa || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right font-mono text-slate-800 font-medium">
                    ₱{Number(details.premiums?.pa || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Summary Column */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Pricing Details</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Selling Rate (OD)</span>
                <span className="font-semibold text-slate-800 font-mono">{Number(details.calculator?.selling_rate_od || 0).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Selling Rate (AON)</span>
                <span className="font-semibold text-slate-800 font-mono">{Number(details.calculator?.selling_rate_aon || 0).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-50">
                <span className="text-slate-500">Basic Premium</span>
                <span className="font-semibold text-slate-800 font-mono">₱{Number(details.premiums?.od + details.premiums?.aon + details.premiums?.bi + details.premiums?.pd + details.premiums?.pa).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GP * 1.2525</span>
                <span className="font-semibold text-slate-800 font-mono">₱{Number((details.premiums?.od + details.premiums?.aon + details.premiums?.bi + details.premiums?.pd + details.premiums?.pa) * 1.2525).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Towing Fee</span>
                <span className="font-semibold text-slate-800 font-mono">₱{Number(details.calculator?.towing_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-50">
                <span className="font-bold text-slate-700">Gross Premium</span>
                <span className="font-bold text-slate-800 font-mono">₱{Number(((details.premiums?.od + details.premiums?.aon + details.premiums?.bi + details.premiums?.pd + details.premiums?.pa) * 1.2525) + (details.calculator?.towing_fee || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sub-Agent Mark Up</span>
                <span className="font-semibold text-slate-800 font-mono">₱{Number(details.calculator?.sub_agent_markup || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Freebie & Cashback</span>
                <span className="font-semibold text-slate-800 font-mono">₱{Number(details.calculator?.freebie_cashback || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-[#4A0E17]/10">
                <span className="font-bold text-slate-700">Policy Premium</span>
                <span className="font-extrabold text-[#4A0E17] font-mono text-base">₱{Number(quotation.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Discount</span>
                <span className="font-mono">-₱{Number(details.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200">
                <span className="font-extrabold text-slate-800">NET Premium</span>
                <span className="font-extrabold text-emerald-700 font-mono text-lg">₱{Number(details.net_premium || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback Items Table for Legacy Quotations */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Quotation Items</h3>
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
                {quotation.items?.map((item, i) => (
                  <tr key={item.id ?? i} className="border-b border-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{item.insurance_product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">₱{Number(item.sum_insured).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{Number(item.premium_rate).toFixed(4)}%</td>
                    <td className="px-6 py-3 text-right font-medium text-slate-800">₱{Number(item.premium_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={4} className="px-6 py-3 text-right text-sm font-semibold text-slate-600">Total</td>
                  <td className="px-6 py-3 text-right text-lg font-bold text-slate-800">₱{Number(quotation.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Notes & Remarks */}
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

      {/* Underwriter Review Panel */}
      {!isAdmin && canReview && isReviewable && (
        <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl border border-violet-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-violet-800 mb-1">Underwriter Review</h3>
          <p className="text-xs text-violet-600 mb-4">Review this quotation and approve or reject it.</p>

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

      {/* Attachments Section */}
      <AttachmentPanel type="quotation" id={quotation.id} />

      {/* Prepared By / Reviewed By Info */}
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
    </div>
  );
}
