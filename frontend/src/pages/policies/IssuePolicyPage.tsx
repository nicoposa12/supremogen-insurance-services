import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, Loader2, Plus, Trash2 } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getQuotation } from '../../services/quotationApi';
import { issuePolicy } from '../../services/policyApi';
import type { PolicyFormData, PolicyCoverage } from '../../types/SalesTypes';

export default function IssuePolicyPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [terms, setTerms] = useState('Standard terms and conditions apply. Subject to policy wordings and endorsements.');
  const [coverages, setCoverages] = useState<Omit<PolicyCoverage, 'id' | 'policy_id'>[]>([]);

  // Fetch quotation data
  const { data: quotRes, isLoading } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => getQuotation(Number(quotationId)),
    enabled: !!quotationId,
  });
  const quotation = quotRes?.data;

  // Pre-fill from quotation
  useEffect(() => {
    if (quotation) {
      const today = new Date();
      setEffectiveDate(today.toISOString().split('T')[0]);
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split('T')[0]);

      if (quotation.items && quotation.items.length > 0) {
        setCoverages(quotation.items.map((item) => ({
          coverage_name: item.insurance_product?.name ?? item.description,
          coverage_description: item.description,
          sum_insured: Number(item.sum_insured),
          premium_amount: Number(item.premium_amount),
          deductible: 5000,
        })));
      }
    }
  }, [quotation]);

  const totalPremium = coverages.reduce((sum, c) => sum + (Number(c.premium_amount) || 0), 0);
  const totalSumInsured = coverages.reduce((sum, c) => sum + (Number(c.sum_insured) || 0), 0);

  const updateCov = (i: number, field: string, value: any) => {
    const updated = [...coverages];
    (updated[i] as any)[field] = value;
    setCoverages(updated);
  };
  const removeCov = (i: number) => {
    if (coverages.length <= 1) return;
    setCoverages(coverages.filter((_, idx) => idx !== i));
  };
  const addCov = () => {
    setCoverages([...coverages, {
      coverage_name: '', coverage_description: null, sum_insured: 0, premium_amount: 0, deductible: 0,
    }]);
  };

  const issueMut = useMutation({
    mutationFn: (data: PolicyFormData) => issuePolicy(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      showToast('Policy issued successfully!');
      navigate(`/dashboard/policies/${res.data.id}`);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to issue policy.', 'error'),
  });

  const handleIssue = () => {
    if (!quotation) return;
    if (!effectiveDate || !expiryDate) {
      showToast('Please set effective and expiry dates.', 'error');
      return;
    }

    const primaryProductId = quotation.items?.[0]?.insurance_product_id;
    if (!primaryProductId) {
      showToast('No product found on quotation.', 'error');
      return;
    }

    const data: PolicyFormData = {
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      insurance_product_id: primaryProductId,
      effective_date: effectiveDate,
      expiry_date: expiryDate,
      total_premium: totalPremium,
      sum_insured: totalSumInsured,
      terms_and_conditions: terms,
      coverages,
    };

    issueMut.mutate(data);
  };

  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition';

  if (isLoading || !quotation) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (quotation.status !== 'approved') {
    return (
      <div className="text-center py-20">
        <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Cannot Issue Policy</h2>
        <p className="text-sm text-slate-500 mt-1">This quotation has not been approved yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Issue Policy</h1>
          <p className="text-sm text-slate-500">From quotation {quotation.quotation_number}</p>
        </div>
      </div>

      {/* Source Info */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200/80 p-5 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase">Quotation</p>
          <p className="text-blue-800 font-medium">{quotation.quotation_number}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase">Customer</p>
          <p className="text-blue-800 font-medium">{quotation.customer?.first_name} {quotation.customer?.last_name}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase">Total Premium</p>
          <p className="text-blue-800 font-bold">₱{totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Policy Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Policy Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Effective Date *</label>
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expiry Date *</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Terms & Conditions</label>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Coverages */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Coverages</h3>
          <button onClick={addCov} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition">
            <Plus className="h-3.5 w-3.5" /> Add Coverage
          </button>
        </div>
        <div className="space-y-3">
          {coverages.map((cov, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-xl">
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Coverage Name</label>
                <input type="text" value={cov.coverage_name} onChange={(e) => updateCov(i, 'coverage_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <input type="text" value={cov.coverage_description ?? ''} onChange={(e) => updateCov(i, 'coverage_description', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sum Insured</label>
                <input type="number" value={cov.sum_insured || ''} onChange={(e) => updateCov(i, 'sum_insured', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Premium</label>
                <input type="number" value={cov.premium_amount || ''} onChange={(e) => updateCov(i, 'premium_amount', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-4 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deductible</label>
                <input type="number" value={cov.deductible || ''} onChange={(e) => updateCov(i, 'deductible', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeCov(i)} disabled={coverages.length <= 1}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Premium</p>
            <p className="text-2xl font-bold text-slate-800">₱{totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={() => navigate(-1)}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
          Cancel
        </button>
        <button onClick={handleIssue} disabled={issueMut.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-600/20 transition">
          {issueMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Issue Policy
        </button>
      </div>
    </div>
  );
}
