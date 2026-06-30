import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Calendar, DollarSign, ShieldCheck, User,
  Clock, XCircle, Loader2, FileText, Link2,
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import AttachmentPanel from '../../components/ui/AttachmentPanel';
import { getPolicy, cancelPolicy } from '../../services/policyApi';

export default function PolicyDetailPage({ id: propId, onClose }: { id?: number; onClose?: () => void }) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? (routeId ? Number(routeId) : undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicy(Number(id)),
    enabled: !!id,
  });
  const policy = response?.data;

  const cancelMut = useMutation({
    mutationFn: () => cancelPolicy(Number(id), cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      showToast('Policy cancelled.');
      setShowCancel(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to cancel.', 'error'),
  });

  if (isLoading || !policy) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const daysLeft = Math.ceil(
    (new Date(policy.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => onClose ? onClose() : navigate('/dashboard/policies')} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{policy.policy_number}</h1>
            <StatusBadge status={policy.status} size="md" />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{policy.insurance_product?.name}</p>
        </div>
        {!isAdmin && !roles.includes('Accounting Officer') && policy.status === 'active' && (
          <button onClick={() => setShowCancel(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition">
            <XCircle className="h-4 w-4" /> Cancel Policy
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-xl"><User className="h-5 w-5 text-blue-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Customer</p>
          </div>
          <p className="text-sm font-medium text-slate-800">{policy.customer?.first_name} {policy.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{policy.customer?.customer_code}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Premium</p>
          </div>
          <p className="text-xl font-bold text-slate-800">₱{Number(policy.total_premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-50 rounded-xl"><ShieldCheck className="h-5 w-5 text-violet-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Sum Insured</p>
          </div>
          <p className="text-xl font-bold text-slate-800">₱{Number(policy.sum_insured).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-xl"><Calendar className="h-5 w-5 text-amber-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Period</p>
          </div>
          <p className="text-sm font-medium text-slate-800">{new Date(policy.effective_date).toLocaleDateString()}</p>
          <p className="text-xs text-slate-500">to {new Date(policy.expiry_date).toLocaleDateString()}</p>
          {policy.status === 'active' && (
            <p className={`text-xs mt-1 font-medium ${daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
            </p>
          )}
        </div>
      </div>

      {/* Coverages Table */}
      {policy.coverages && policy.coverages.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Coverage Breakdown</h3>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase">Coverage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Sum Insured</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Premium</th>
                  <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase">Deductible</th>
                </tr>
              </thead>
              <tbody>
                {policy.coverages.map((cov) => (
                  <tr key={cov.id} className="border-b border-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{cov.coverage_name}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{cov.coverage_description || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">₱{Number(cov.sum_insured).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">₱{Number(cov.premium_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right text-slate-700">₱{Number(cov.deductible).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Source Quotation Link + Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policy.quotation && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Source Quotation</h3>
            <button onClick={() => navigate(`/dashboard/quotations/${policy.quotation?.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition">
              <Link2 className="h-4 w-4" /> {policy.quotation.quotation_number}
            </button>
          </div>
        )}
        {policy.terms_and_conditions && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Terms & Conditions</h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{policy.terms_and_conditions}</p>
          </div>
        )}
      </div>

      {/* Cancellation Info */}
      {policy.status === 'cancelled' && (
        <div className="bg-red-50 rounded-2xl border border-red-200/80 p-6">
          <h3 className="text-sm font-semibold text-red-800 mb-2">Cancellation Details</h3>
          <p className="text-sm text-red-700">{policy.cancellation_reason}</p>
          {policy.cancelled_at && (
            <p className="text-xs text-red-500 mt-2">Cancelled on {new Date(policy.cancelled_at).toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Attachments Section */}
      <AttachmentPanel type="policy" id={policy.id} />

      {/* Footer Info */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {typeof policy.issued_by === 'object' && policy.issued_by && <span>Issued by: <span className="text-slate-600">{policy.issued_by.name}</span></span>}
        <span>Created: <span className="text-slate-600">{new Date(policy.created_at).toLocaleString()}</span></span>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowCancel(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Cancel Policy</h3>
            <p className="text-sm text-slate-500 mb-4">This action cannot be undone. Please provide a reason.</p>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              rows={3} placeholder="Reason for cancellation..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCancel(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                Keep Policy
              </button>
              <button onClick={() => cancelMut.mutate()} disabled={!cancelReason.trim() || cancelMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
                {cancelMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
