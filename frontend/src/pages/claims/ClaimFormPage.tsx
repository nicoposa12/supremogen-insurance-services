import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getClaim, fileClaim, updateClaim } from '../../services/claimApi';
import { getPolicies } from '../../services/policyApi';
import type { ClaimFormData } from '../../types/ClaimsTypes';

export default function ClaimFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [policyId, setPolicyId] = useState<number>(0);
  const [customerId, setCustomerId] = useState<number>(0);
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [claimAmount, setClaimAmount] = useState<number>(0);

  // Fetch active policies for dropdown
  const { data: policiesRes } = useQuery({
    queryKey: ['policies-active'],
    queryFn: () => getPolicies({ per_page: 100, status: 'active' }),
  });
  const policyOptions = policiesRes?.data?.data ?? [];

  // Fetch existing for edit
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => getClaim(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.data) {
      const c = existing.data;
      setPolicyId(c.policy_id);
      setCustomerId(c.customer_id);
      setIncidentDate(c.incident_date?.split('T')[0] ?? '');
      setIncidentDescription(c.incident_description);
      setClaimAmount(Number(c.claim_amount));
    }
  }, [existing]);

  // When policy is selected, auto-fill customer
  const handlePolicyChange = (pid: number) => {
    setPolicyId(pid);
    const pol = policyOptions.find((p) => p.id === pid);
    if (pol) setCustomerId(pol.customer_id);
  };

  const createMut = useMutation({
    mutationFn: (data: ClaimFormData) => fileClaim(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      showToast('Claim filed successfully.');
      navigate(`/dashboard/claims/${res.data.id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to file claim.', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<ClaimFormData>) => updateClaim(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      showToast('Claim updated.');
      navigate(`/dashboard/claims/${id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to update.', 'error'),
  });

  const handleSave = () => {
    if (!policyId) { showToast('Please select a policy.', 'error'); return; }
    if (!incidentDate) { showToast('Please set the incident date.', 'error'); return; }
    if (!incidentDescription.trim()) { showToast('Please describe the incident.', 'error'); return; }
    if (claimAmount <= 0) { showToast('Please enter a valid claim amount.', 'error'); return; }

    const data: ClaimFormData = {
      policy_id: policyId,
      customer_id: customerId,
      incident_date: incidentDate,
      incident_description: incidentDescription,
      claim_amount: claimAmount,
    };

    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition';

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Claim' : 'File a Claim'}</h1>
          <p className="text-sm text-slate-500">{isEdit ? 'Update claim details' : 'Submit a new insurance claim'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Policy & Incident</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy *</label>
            <select value={policyId} onChange={(e) => handlePolicyChange(Number(e.target.value))} className={inputClass} disabled={isEdit}>
              <option value={0}>Select a policy...</option>
              {policyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.policy_number} — {p.customer?.first_name} {p.customer?.last_name} {p.insurance_product ? `(${p.insurance_product.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Incident Date *</label>
            <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Claim Amount *</label>
            <input type="number" step="0.01" value={claimAmount || ''} onChange={(e) => setClaimAmount(Number(e.target.value))} className={inputClass} placeholder="0.00" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Incident Description *</label>
            <textarea value={incidentDescription} onChange={(e) => setIncidentDescription(e.target.value)} rows={4} className={inputClass}
              placeholder="Describe the incident in detail: what happened, where, estimated damage..." />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={() => navigate(-1)}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
        <button onClick={handleSave} disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-600/20 transition">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Update Claim' : 'File Claim'}
        </button>
      </div>
    </div>
  );
}
