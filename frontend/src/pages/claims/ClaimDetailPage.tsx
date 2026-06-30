import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Loader2, User, DollarSign,
  Calendar, ShieldAlert, Link2, CheckCircle, XCircle, Banknote,
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import AttachmentPanel from '../../components/ui/AttachmentPanel';
import { getClaim, reviewClaim, settleClaim } from '../../services/claimApi';

export default function ClaimDetailPage({ id: propId, onClose, onEdit }: { id?: number; onClose?: () => void; onEdit?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  // Review form
  const [showReview, setShowReview] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [adjusterRemarks, setAdjusterRemarks] = useState('');

  // Settle form
  const [showSettle, setShowSettle] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleRemarks, setSettleRemarks] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => getClaim(Number(id)),
    enabled: !!id,
  });
  const claim = response?.data;

  const reviewMut = useMutation({
    mutationFn: () => reviewClaim(Number(id), reviewAction, reviewAction === 'approve' ? approvedAmount : undefined, adjusterRemarks || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      showToast(reviewAction === 'approve' ? 'Claim approved.' : 'Claim denied.');
      setShowReview(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed.', 'error'),
  });

  const settleMut = useMutation({
    mutationFn: () => settleClaim(Number(id), settlementAmount, settlementDate, settleRemarks || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      showToast('Claim settled.');
      setShowSettle(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed.', 'error'),
  });

  if (isLoading || !claim) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const canReview = ['filed', 'under_investigation'].includes(claim.status);
  const canSettle = claim.status === 'approved';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => onClose ? onClose() : navigate('/dashboard/claims')} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{claim.claim_number}</h1>
            <StatusBadge status={claim.status} size="md" />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Filed {new Date(claim.created_at).toLocaleDateString()}</p>
        </div>
        {roles.includes('Claims Officer') && (
          <div className="flex items-center gap-2">
            {claim.status === 'filed' && (
              <button onClick={() => onEdit ? onEdit() : navigate(`/dashboard/claims/${id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition">
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
            {canReview && (
              <>
                <button onClick={() => { setReviewAction('approve'); setApprovedAmount(Number(claim.claim_amount)); setShowReview(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition">
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => { setReviewAction('deny'); setShowReview(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition">
                  <XCircle className="h-4 w-4" /> Deny
                </button>
              </>
            )}
            {canSettle && (
              <button onClick={() => { setSettlementAmount(Number(claim.approved_amount ?? claim.claim_amount)); setShowSettle(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition">
                <Banknote className="h-4 w-4" /> Settle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-xl"><User className="h-5 w-5 text-blue-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Customer</p>
          </div>
          <p className="text-sm font-medium text-slate-800">{claim.customer?.first_name} {claim.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{claim.customer?.customer_code}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 rounded-xl"><DollarSign className="h-5 w-5 text-red-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Claim Amount</p>
          </div>
          <p className="text-xl font-bold text-slate-800">₱{Number(claim.claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><Banknote className="h-5 w-5 text-emerald-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">{claim.settlement_amount ? 'Settled' : 'Approved'}</p>
          </div>
          <p className="text-xl font-bold text-emerald-700">
            ₱{Number(claim.settlement_amount ?? claim.approved_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-50 rounded-xl"><Calendar className="h-5 w-5 text-violet-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Incident Date</p>
          </div>
          <p className="text-sm font-medium text-slate-800">{new Date(claim.incident_date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Incident Description */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Incident Description</h3>
        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">{claim.incident_description}</p>
      </div>

      {/* Adjuster Remarks */}
      {claim.adjuster_remarks && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Adjuster Remarks</h3>
          <p className="text-sm text-slate-600 bg-amber-50 p-4 rounded-xl border border-amber-100">{claim.adjuster_remarks}</p>
        </div>
      )}

      {/* Settlement Info */}
      {claim.settlement_date && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200/80 p-6">
          <h3 className="text-sm font-semibold text-emerald-800 mb-2">Settlement</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-emerald-600 font-semibold">Amount</p>
              <p className="text-emerald-800 font-bold">₱{Number(claim.settlement_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-semibold">Date</p>
              <p className="text-emerald-800">{new Date(claim.settlement_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Linked Policy + Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Linked Policy</h3>
          <button onClick={() => navigate(`/dashboard/policies/${claim.policy_id}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition">
            <Link2 className="h-4 w-4" /> {claim.policy?.policy_number}
          </button>
          {claim.policy?.insurance_product && (
            <p className="text-xs text-slate-500 mt-2">{claim.policy.insurance_product.name}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">People</h3>
          <div className="space-y-2 text-sm">
            {typeof claim.filed_by === 'object' && claim.filed_by && (
              <p className="text-slate-600">Filed by: <span className="font-medium">{claim.filed_by.name}</span></p>
            )}
            {typeof claim.assigned_to === 'object' && claim.assigned_to && (
              <p className="text-slate-600">Adjuster: <span className="font-medium">{claim.assigned_to.name}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <AttachmentPanel type="claim" id={claim.id} />

      {/* Review Panel */}
      {showReview && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">
            {reviewAction === 'approve' ? '✅ Approve Claim' : '❌ Deny Claim'}
          </h3>
          {reviewAction === 'approve' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Approved Amount *</label>
              <input type="number" step="0.01" value={approvedAmount || ''} onChange={(e) => setApprovedAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Adjuster Remarks</label>
            <textarea value={adjusterRemarks} onChange={(e) => setAdjusterRemarks(e.target.value)} rows={3}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => reviewMut.mutate()} disabled={reviewMut.isPending}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 shadow-sm transition ${
                reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              }`}>
              {reviewMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Denial'}
            </button>
            <button onClick={() => setShowReview(false)}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Settlement Panel */}
      {showSettle && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">💰 Settle Claim</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Settlement Amount *</label>
              <input type="number" step="0.01" value={settlementAmount || ''} onChange={(e) => setSettlementAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Settlement Date *</label>
              <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <textarea value={settleRemarks} onChange={(e) => setSettleRemarks(e.target.value)} rows={2}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => settleMut.mutate()} disabled={settleMut.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-600/20 transition">
              {settleMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Settlement
            </button>
            <button onClick={() => setShowSettle(false)}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
