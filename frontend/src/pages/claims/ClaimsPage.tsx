import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Eye, Pencil, Trash2, Filter, ShieldAlert, Loader2, Save, X } from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getClaims, deleteClaim, fileClaim, updateClaim } from '../../services/claimApi';
import { getPolicies } from '../../services/policyApi';
import type { Claim, ClaimListParams, ClaimFormData } from '../../types/ClaimsTypes';
import ClaimDetailPage from './ClaimDetailPage';
import logoImg from '../../assets/image/supremogen_logo.jpg';

export default function ClaimsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes('Administrator');
  const isClaimsOfficer = roles.includes('Claims Officer');
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  const [params, setParams] = useState<ClaimListParams>({
    page: 1, per_page: 15, search: querySearch, status: 'all',
    sort_by: 'created_at', sort_dir: 'desc',
  });
  const [searchInput, setSearchInput] = useState(querySearch);
  const [deleteTarget, setDeleteTarget] = useState<Claim | null>(null);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);

  // Modal Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Claim | null>(null);

  // Modal View States
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);

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

  // Sync form states on edit target change
  useEffect(() => {
    if (isFormOpen) {
      if (formEditTarget) {
        setPolicyId(formEditTarget.policy_id);
        setCustomerId(formEditTarget.customer_id);
        setIncidentDate(formEditTarget.incident_date?.split('T')[0] ?? '');
        setIncidentDescription(formEditTarget.incident_description);
        setClaimAmount(Number(formEditTarget.claim_amount));
      } else {
        setPolicyId(0);
        setCustomerId(0);
        setIncidentDate('');
        setIncidentDescription('');
        setClaimAmount(0);
      }
    }
  }, [formEditTarget, isFormOpen]);

  const handlePolicyChange = (pid: number) => {
    setPolicyId(pid);
    const pol = policyOptions.find((p) => p.id === pid);
    if (pol) setCustomerId(pol.customer_id);
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['claims', params],
    queryFn: () => getClaims(params),
    placeholderData: (prev) => prev,
  });

  const claims = response?.data?.data ?? [];
  const pagination = response?.data;

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      showToast('Claim deleted.');
      setDeleteTarget(null);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to delete.', 'error'),
  });

  const createMut = useMutation({
    mutationFn: (data: ClaimFormData) => fileClaim(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      showToast('Claim filed successfully.');
      setIsFormOpen(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to file claim.', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<ClaimFormData>) => updateClaim(Number(formEditTarget?.id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      showToast('Claim updated.');
      setIsFormOpen(false);
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

    if (formEditTarget) updateMut.mutate(data);
    else createMut.mutate(data);
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition';

  useEffect(() => {
    const handler = setTimeout(() => {
      setParams((p) => ({ ...p, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleSort = (key: string) => {
    setParams((p) => ({
      ...p, sort_by: key,
      sort_dir: p.sort_by === key && p.sort_dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const statusFilters = ['all', 'filed', 'under_investigation', 'approved', 'denied', 'settled', 'closed'];

  const columns = [
    {
      key: 'claim_number', label: 'Claim No.', sortable: true,
      render: (r: Claim) => (
        <span className="font-mono text-xs text-[#4A0E17] font-bold">{r.claim_number}</span>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (r: Claim) => (
        <div>
          <p className="font-medium text-slate-800">{r.customer?.first_name} {r.customer?.last_name}</p>
          <p className="text-xs text-slate-500">{r.policy?.policy_number}</p>
        </div>
      ),
    },
    {
      key: 'claim_amount', label: 'Claim Amount', sortable: true,
      render: (r: Claim) => (
        <span className="font-medium text-slate-800">₱{Number(r.claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'incident_date', label: 'Incident Date', sortable: true,
      render: (r: Claim) => {
        const d = new Date(r.incident_date || (r as any).created_at);
        const dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return (
          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
            <span>{dateStr}</span>
            <span className="text-[11px] font-mono text-slate-400 ml-1.5">{timeStr}</span>
          </span>
        );
      },
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: Claim) => <StatusBadge status={r.status} />,
    },
    {
      key: 'assigned_to', label: 'Adjuster', className: 'hidden lg:table-cell',
      render: (r: Claim) => {
        if (typeof r.assigned_to === 'object' && r.assigned_to) {
          return <span className="text-xs text-slate-600">{r.assigned_to.name}</span>;
        }
        return <span className="text-xs text-slate-400">Unassigned</span>;
      },
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (r: Claim) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedClaimId(r.id); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center mx-auto" title="View">
            <Eye className="h-4 w-4 text-[#4A0E17]" />
          </button>
          {isClaimsOfficer && r.status === 'filed' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setFormEditTarget(r); setIsFormOpen(true); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition" title="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Claims</h1>
          <p className="text-sm text-slate-500">Manage insurance claims and investigations</p>
        </div>
        {isClaimsOfficer && (
          <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
            <Plus className="h-4 w-4" /> File Claim
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search claim no., customer, policy..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition" />
          {searchInput && (
            <button 
              onClick={() => {
                setSearchInput('');
                setSearchParams({});
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer flex items-center justify-center"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase">Status:</span>
          <div className="flex flex-wrap gap-1">
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setParams((p) => ({ ...p, status: s, page: 1 }))}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  params.status === s ? 'bg-[#4A0E17] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{s === 'under_investigation' ? 'Investigating' : s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {claims.length === 0 && !isLoading ? (
          <EmptyState icon={<ShieldAlert className="h-10 w-10 text-slate-400" />}
            title="No claims found" description="Try adjusting your search or file a new claim."
            action={
              isClaimsOfficer ? (
                <button onClick={() => { setFormEditTarget(null); setIsFormOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl transition cursor-pointer">
                  <Plus className="h-4 w-4" /> File Claim
                </button>
              ) : undefined
            } />
        ) : (
          <>
            <DataTable columns={columns} data={claims} sortBy={params.sort_by}
              sortDir={params.sort_dir} onSort={handleSort} loading={isLoading}
              onRowClick={(r) => setSelectedClaimId(r.id)} />
            {pagination && (
              <div className="border-t border-slate-100">
                <Pagination currentPage={pagination.current_page} lastPage={pagination.last_page}
                  perPage={pagination.per_page} total={pagination.total}
                  from={pagination.from} to={pagination.to}
                  onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                  onPerPageChange={(pp) => setParams((p) => ({ ...p, per_page: pp, page: 1 }))} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Claim Form Modal ───────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  {formEditTarget ? `Edit Claim - ${formEditTarget.claim_number}` : 'File a New Claim'}
                </h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Policy & Incident</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy *</label>
                  <select value={policyId} onChange={(e) => handlePolicyChange(Number(e.target.value))} className={inputClass} disabled={!!formEditTarget}>
                    <option value={0}>Select a policy...</option>
                    {policyOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.policy_number} — {p.customer?.first_name} {p.customer?.last_name} {p.insurance_product ? `(${p.insurance_product.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Incident Date *</label>
                    <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Claim Amount *</label>
                    <input type="number" step="0.01" value={claimAmount || ''} onChange={(e) => setClaimAmount(Number(e.target.value))} className={inputClass} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Incident Description *</label>
                  <textarea value={incidentDescription} onChange={(e) => setIncidentDescription(e.target.value)} rows={4} className={inputClass}
                    placeholder="Describe the incident in detail: what happened, where, estimated damage..." />
                </div>
              </div>
            </div>

            {/* Modal Form Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {formEditTarget ? 'Update Claim' : 'File Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Claim Details Modal ───────────── */}
      {selectedClaimId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex-grow overflow-y-auto p-6">
              <ClaimDetailPage 
                id={selectedClaimId} 
                onClose={() => setSelectedClaimId(null)} 
                onEdit={() => {
                  const target = claims.find((c) => c.id === selectedClaimId);
                  setSelectedClaimId(null);
                  setFormEditTarget(target || null);
                  setIsFormOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Claim"
        message={`Delete claim ${deleteTarget?.claim_number}? Only filed claims can be deleted.`}
        confirmLabel="Delete" variant="danger" loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
