import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Check, X, Loader2 } from 'lucide-react';
import type { Quotation } from '../../types/SalesTypes';
import { updateQuotationMetadata } from '../../services/quotationApi';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';

interface InlinePolicyNoCellProps {
  quotation: Quotation;
  onUpdated?: () => void;
}

export default function InlinePolicyNoCell({ quotation, onUpdated }: InlinePolicyNoCellProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles = [] } = useAuth();

  const canEdit = roles.some((r: string) =>
    ['Underwriter', 'Administrator', 'Owner', 'Super Admin'].includes(r)
  );

  const isAssignableStatus = !['rejected', 'cancelled', 'draft', 'expired'].includes(quotation.status);
  const canEditPolicy = canEdit && isAssignableStatus;

  const policyNo = quotation.policy_number || quotation.customer?.policy_no || quotation.policy?.policy_number || '';

  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(policyNo);

  const saveMutation = useMutation({
    mutationFn: (newPolicyNo: string) =>
      updateQuotationMetadata(quotation.id, { policyNumber: newPolicyNo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', quotation.id] });
      showToast('Policy number updated successfully!');
      setIsEditing(false);
      if (onUpdated) onUpdated();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to update policy number.', 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(inputVal.trim());
  };

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-1 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="POL-2026-XXXXX"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="w-36 px-2 py-1 text-xs font-mono bg-white border border-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase shadow-2xs"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-2xs"
          title="Save Policy Number"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          disabled={saveMutation.isPending}
          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (policyNo) {
    return (
      <div className="flex items-center gap-1.5 group/cell">
        <span className="font-mono text-xs font-semibold text-slate-800 uppercase tracking-tight">
          {policyNo}
        </span>
        {canEditPolicy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInputVal(policyNo);
              setIsEditing(true);
            }}
            className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-all"
            title="Edit Policy Number"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {canEditPolicy ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInputVal('');
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-lg text-xs font-semibold transition-all shadow-2xs group active:scale-95"
          title="Assign Policy Number"
        >
          <Plus className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span>Assign Policy No.</span>
        </button>
      ) : (
        <span className="text-xs text-slate-400 font-medium">—</span>
      )}
    </div>
  );
}
