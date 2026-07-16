import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Eye, CheckCircle2, Filter, Loader2, X,
  Send, FileText, Phone, Mail, Car, Shield, Calendar,
  AlertTriangle, User, ChevronLeft, Printer, RotateCcw, ChevronDown,
  Paperclip, Download,
} from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import {
  getClaimNotifications,
  createClaimNotification,
  acknowledgeClaimNotification,
  returnClaimNotification,
  getClaimNotification,
} from '../../services/claimNotificationApi';
import { uploadAttachment } from '../../services/attachmentApi';
import type {
  ClaimNotification,
  ClaimNotificationFormData,
  ClaimNotificationListParams,
} from '../../types/ClaimsTypes';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import { getCustomers } from '../../services/customerApi';
import type { Customer } from '../../types/CustomerTypes';

const OWN_DAMAGE_REQUIREMENTS = [
  { key: 'req_1', label: '1. Original Police Report OR Notarized Affidavit' },
  { key: 'req_2', label: '2. Readable copy of ORCR' },
  { key: 'req_3', label: '3. Clear copy of Drivers license (Back and Front) with copy of OR' },
  { key: 'req_4', label: '4. Clear Pictures of Damages of the vehicle' },
  { key: 'req_5', label: '5. (4 Sides) Clear Pictures of the Vehicle Isometric View' },
  { key: 'req_6', label: '6. Repair Estimate with Contact number' },
  { key: 'req_7', label: '7. Picture of Odometer Reading' },
  { key: 'req_8', label: '8. Picture of Stencil or Vin plate' },
  { key: 'req_9', label: '• Authorization letter and valid ID from assured (if driven by authorized driver)' },
];

const TTPD_REQUIREMENTS = [
  { key: 'tppd_1', label: '1. Police report/Affidavit' },
  { key: 'tppd_2', label: '2. Adverse Official Receipt and Certificate of Registration (ORCR)' },
  { key: 'tppd_3', label: '3. Adverse Driver’s license' },
  { key: 'tppd_4', label: '4. Adverse Repair Estimate' },
  { key: 'tppd_5', label: '5. Adverse Certificate of no claim from his/her insurance provider' },
  { key: 'tppd_6', label: '6. Adverse photos of damaged unit showing the plate number' },
];

interface CustomAttachmentInput {
  id: string;
  label: string;
  file: File | null;
  note: string;
}

export default function ClaimNotificationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles, user, token } = useAuth();
  const isClaimsOfficer = roles.includes('Claims Officer');
  const isAdmin = roles.includes('Administrator');
  const canSubmit = roles.includes('Sales Agent') || roles.includes('Team Renewal') || isAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  // ─── List State ─────────────────────────────
  const [params, setParams] = useState<ClaimNotificationListParams>({
    page: Number(searchParams.get('page')) || 1,
    per_page: 15,
    search: querySearch,
    status: searchParams.get('status') || 'all',
    claim_count: searchParams.get('claim_count') || undefined,
    created_date: searchParams.get('created_date') || undefined,
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_dir: (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc',
  });
  const [searchInput, setSearchInput] = useState(querySearch);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setParams((p) => ({ ...p, search: searchInput, page: 1 }));
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput) {
          next.set('search', searchInput);
        } else {
          next.delete('search');
        }
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, setSearchParams]);

  // ─── View Modes ─────────────────────────────
  const [activeView, setActiveView] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedRecord, setSelectedRecord] = useState<ClaimNotification | null>(null);
  const [acknowledgeTarget, setAcknowledgeTarget] = useState<ClaimNotification | null>(null);
  const [returnTarget, setReturnTarget] = useState<ClaimNotification | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [claimType, setClaimType] = useState('');
  const [requirementFiles, setRequirementFiles] = useState<Record<string, File>>({});
  const [requirementNotes, setRequirementNotes] = useState<Record<string, string>>({});
  const [customAttachments, setCustomAttachments] = useState<CustomAttachmentInput[]>([]);
  const [viewAttachment, setViewAttachment] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ─── Form State ─────────────────────────────
  const [form, setForm] = useState<ClaimNotificationFormData>({
    assured_name: '',
    contact_number: '',
    email_address: '',
    insurance_provider: '',
    plate_number: '',
    policy_number: '',
    inception_date: '',
    accident_date: '',
    nature_of_claims: '',
    notes: '',
    claim_count: '',
  });

  const [nameSuggestions, setNameSuggestions] = useState<Customer[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [plateSuggestions, setPlateSuggestions] = useState<Customer[]>([]);
  const [showPlateSuggestions, setShowPlateSuggestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setForm({
      assured_name: '',
      contact_number: '',
      email_address: '',
      insurance_provider: '',
      plate_number: '',
      policy_number: '',
      inception_date: '',
      accident_date: '',
      nature_of_claims: '',
      notes: '',
      claim_count: '',
    });
    setNameSuggestions([]);
    setPlateSuggestions([]);
    setShowNameSuggestions(false);
    setShowPlateSuggestions(false);
    setValidationErrors({});
    setClaimType('');
    setRequirementFiles({});
    setRequirementNotes({});
    setCustomAttachments([]);
  };

  // Fetch suggestions for assured name
  useEffect(() => {
    if (activeView !== 'form' || form.assured_name.length < 2) {
      setNameSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await getCustomers({ search: form.assured_name, no_paginate: true });
        setNameSuggestions(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch name suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [form.assured_name, activeView]);

  // Fetch suggestions for plate number
  useEffect(() => {
    if (activeView !== 'form' || !form.plate_number || form.plate_number.length < 2) {
      setPlateSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await getCustomers({ search: form.plate_number, no_paginate: true });
        setPlateSuggestions(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch plate suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [form.plate_number, activeView]);

  const handleSelectCustomer = (customer: Customer) => {
    const fullName = customer.customer_type === 'corporate' && customer.company_name
      ? customer.company_name
      : `${customer.first_name} ${customer.last_name}`.trim();

    const rawProvider = customer.insurance_provider || '';
    let matchedProvider = '';
    const provUpper = rawProvider.toUpperCase();
    if (provUpper.includes('ALPHA')) matchedProvider = 'ALPHA';
    else if (provUpper.includes('MILESTONE')) matchedProvider = 'MILESTONE';
    else if (provUpper.includes('CBIC')) matchedProvider = 'CBIC';
    else if (provUpper.includes('BETHEL')) matchedProvider = 'BETHEL';
    else if (provUpper.includes('METROPOLITAN')) matchedProvider = 'METROPOLITAN';
    else if (provUpper.includes('BRITISH') || provUpper.includes('PHILIPPINE BRITISH')) matchedProvider = 'PHILIPPINE BRITISH';

    const formatInputDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0];
    };

    setForm({
      assured_name: fullName,
      contact_number: customer.mobile || customer.phone || '',
      email_address: customer.email || '',
      insurance_provider: matchedProvider,
      plate_number: customer.plate_no || '',
      policy_number: customer.policy_no || '',
      inception_date: formatInputDate(customer.inception_date),
      accident_date: form.accident_date,
      nature_of_claims: form.nature_of_claims,
      notes: form.notes,
      claim_count: form.claim_count,
    });

    setNameSuggestions([]);
    setPlateSuggestions([]);
    setShowNameSuggestions(false);
    setShowPlateSuggestions(false);
    setValidationErrors({});
  };

  // ─── Queries & Mutations ────────────────────
  const { data: response, isLoading } = useQuery({
    queryKey: ['claim-notifications', params],
    queryFn: () => getClaimNotifications({
      ...params,
      status: params.status === 'all' ? undefined : params.status,
    }),
    placeholderData: (prev) => prev,
  });

  const records = response?.data?.data ?? [];
  const pagination = response?.data;

  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ['claim-notification', selectedRecord?.id],
    queryFn: () => getClaimNotification(selectedRecord!.id),
    enabled: !!selectedRecord?.id,
  });

  const detailRecord = detailResponse?.data ?? selectedRecord;

  const submitMut = useMutation({
    mutationFn: (data: ClaimNotificationFormData) => createClaimNotification(data),
    onSuccess: async (res) => {
      const standardCount = Object.keys(requirementFiles).length;
      const customCount = customAttachments.filter((c) => c.file).length;
      const totalCount = standardCount + customCount;
      if (totalCount > 0) {
        setIsUploading(true);
        showToast(`Uploading ${totalCount} attachment(s)...`, 'info');
        try {
          const promises = [
            ...Object.entries(requirementFiles).map(([key, file]) => {
              let label = 'Requirement Document';
              if (key.startsWith('req_')) {
                const req = OWN_DAMAGE_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              } else if (key.startsWith('tppd_')) {
                const req = TTPD_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              }
              const note = requirementNotes[key];
              const docType = note ? `${label} | Note: ${note}` : label;
              return uploadAttachment('claim_notification', res.data.id, file, docType);
            }),
            ...customAttachments
              .filter((c) => c.file)
              .map((c) => {
                const label = c.label.trim() || 'Additional Document';
                const docType = c.note.trim() ? `${label} | Note: ${c.note.trim()}` : label;
                return uploadAttachment('claim_notification', res.data.id, c.file!, docType);
              })
          ];
          await Promise.all(promises);
          showToast('Attachments uploaded successfully!');
        } catch (err) {
          console.error(err);
          showToast('Failed to upload some attachments, but notification was submitted.', 'error');
        } finally {
          setIsUploading(false);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['claim-notifications'] });
      showToast('Claim notification submitted successfully.');
      resetForm();
      setActiveView('list');
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to submit.', 'error'),
  });

  const acknowledgeMut = useMutation({
    mutationFn: (id: number) => acknowledgeClaimNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-notifications'] });
      showToast('Claim notification acknowledged.');
      setAcknowledgeTarget(null);
      if (selectedRecord) {
        setSelectedRecord({ ...selectedRecord, status: 'acknowledged' });
      }
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to acknowledge.', 'error'),
  });

  const returnMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => returnClaimNotification(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-notifications'] });
      showToast('Claim notification returned to agent.');
      setReturnTarget(null);
      setReturnReason('');
      if (selectedRecord) {
        setSelectedRecord({ ...selectedRecord, status: 'returned' });
      }
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to return notification.', 'error'),
  });

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.assured_name.trim()) newErrors.assured_name = true;
    if (!form.insurance_provider.trim()) newErrors.insurance_provider = true;
    if (!form.policy_number.trim()) newErrors.policy_number = true;
    if (!form.accident_date) newErrors.accident_date = true;
    if (!form.nature_of_claims.trim()) newErrors.nature_of_claims = true;

    setValidationErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.assured_name) { showToast('Please enter the Assured Name.', 'error'); }
      else if (newErrors.insurance_provider) { showToast('Please select the Insurance Provider.', 'error'); }
      else if (newErrors.policy_number) { showToast('Please enter the Policy Number.', 'error'); }
      else if (newErrors.accident_date) { showToast('Please set the Accident Date.', 'error'); }
      else if (newErrors.nature_of_claims) { showToast('Please describe the Nature of Claims.', 'error'); }
      return;
    }

    submitMut.mutate(form);
  };

  const getDetailClaimType = (nature: string | undefined): string => {
    if (!nature) return '';
    const upper = nature.toUpperCase();
    if (upper.includes('OWN DAMAGE CLAIM REQUIREMENTS') && upper.includes('THIRD PARTY (TTPD) CLAIM - REQUIREMENTS')) {
      return 'OWN DAMAGE & TTPD';
    }
    if (upper.includes('OWN DAMAGE CLAIM REQUIREMENTS')) {
      return 'OWN DAMAGE';
    }
    if (upper.includes('THIRD PARTY (TTPD) CLAIM - REQUIREMENTS')) {
      return 'TPPD';
    }
    return '';
  };

  const handleDetailUpload = async () => {
    if (!detailRecord) return;
    const standardCount = Object.keys(requirementFiles).length;
    const customCount = customAttachments.filter((c) => c.file).length;
    const totalCount = standardCount + customCount;
    if (totalCount === 0) return;

    setIsUploading(true);
    showToast(`Uploading ${totalCount} attachment(s)...`, 'info');
    try {
      const promises = [
        ...Object.entries(requirementFiles).map(([key, file]) => {
          let label = 'Requirement Document';
          if (key.startsWith('req_')) {
            const req = OWN_DAMAGE_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          } else if (key.startsWith('tppd_')) {
            const req = TTPD_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          }
          const note = requirementNotes[key];
          const docType = note ? `${label} | Note: ${note}` : label;
          return uploadAttachment('claim_notification', detailRecord.id, file, docType);
        }),
        ...customAttachments
          .filter((c) => c.file)
          .map((c) => {
            const label = c.label.trim() || 'Additional Document';
            const docType = c.note.trim() ? `${label} | Note: ${c.note.trim()}` : label;
            return uploadAttachment('claim_notification', detailRecord.id, c.file!, docType);
          })
      ];
      await Promise.all(promises);
      showToast('Attachments uploaded successfully!');
      setRequirementFiles({});
      setRequirementNotes({});
      setCustomAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['claim-notification', detailRecord.id] });
      queryClient.invalidateQueries({ queryKey: ['claim-notifications'] });
    } catch (err) {
      console.error(err);
      showToast('Failed to upload some attachments.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSort = (key: string) => {
    setParams((p) => ({
      ...p, sort_by: key,
      sort_dir: p.sort_by === key && p.sort_dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const statusFilters = ['all', 'pending', 'returned', 'acknowledged'];
  const getInputClass = (fieldName: string) => {
    const hasError = validationErrors[fieldName];
    return `w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none transition ${
      hasError
        ? 'border-red-500 focus:ring-2 focus:ring-red-200/50 focus:border-red-500 shadow-sm shadow-red-500/10'
        : 'border-slate-200 focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]'
    }`;
  };

  // ─── Detail View ────────────────────────────
  if (activeView === 'detail' && selectedRecord) {
    const submitter = typeof selectedRecord.submitted_by === 'object'
      ? selectedRecord.submitted_by.name
      : 'Unknown';
    const acknowledger = selectedRecord.acknowledged_by && typeof selectedRecord.acknowledged_by === 'object'
      ? selectedRecord.acknowledged_by.name
      : null;

    return (
      <div className="space-y-4">
        {/* Detail page controls */}
        <div className="flex items-center gap-3 no-print">
          <button onClick={() => { setActiveView('list'); setSelectedRecord(null); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{selectedRecord.reference_number}</h1>
            <p className="text-sm text-slate-500">Claim Notification Detail</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 shadow-sm transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Notification</span>
            </button>
            <StatusBadge status={selectedRecord.status} />
          </div>
        </div>

        {/* Printable Official Document Layout */}
        <div className="printable-document bg-white rounded-2xl border border-slate-200/80 shadow-md p-8 md:p-12 max-w-3xl mx-auto">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-[#4A0E17] gap-4">
            <div className="flex items-center gap-3.5">
              <img src={logoImg} alt="Logo" className="h-16 w-16 rounded-xl border border-slate-100 object-cover" />
              <div>
                <h2 className="text-[#4A0E17] font-black text-2xl tracking-wider">SUPREMOGEN</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Insurance Services</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Document</p>
              <p className="text-lg font-black text-slate-800 mt-1">{selectedRecord.reference_number}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date Filed: {new Date(selectedRecord.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {/* Subject lines */}
            <div className="space-y-1 border-l-4 border-[#4A0E17] pl-4 py-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attention: Claims Department</p>
              <h3 className="text-base font-bold text-[#4A0E17] uppercase tracking-wide">
                SUBJECT: CLAIM NOTIFICATION - {selectedRecord.assured_name}
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Good day, <br />
              Kindly find below the official details and information of our Assured for the submitted claim notification.
            </p>

            {/* Document Details Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <table className="min-w-full divide-y divide-slate-200/85 text-sm">
                <tbody className="divide-y divide-slate-200/85 bg-white">
                  {[
                    { label: 'Assured Name', value: selectedRecord.assured_name },
                    { label: 'Contact Number', value: selectedRecord.contact_number || '—' },
                    { label: 'Email Address', value: selectedRecord.email_address || '—' },
                    { label: 'Insurance Provider', value: selectedRecord.insurance_provider },
                    { label: 'Plate Number', value: selectedRecord.plate_number || '—' },
                    { label: 'Policy Number', value: selectedRecord.policy_number },
                    { label: 'Inception Date', value: selectedRecord.inception_date ? new Date(selectedRecord.inception_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                    { label: 'Accident Date', value: new Date(selectedRecord.accident_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) },
                    { label: 'Claim Count', value: selectedRecord.claim_count || '—' },
                  ].map((row, idx) => (
                    <tr key={row.label} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                      <td className="px-5 py-3 font-semibold text-slate-500 w-1/3">{row.label}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nature of claims */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nature of Claims</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedRecord.nature_of_claims}
              </div>
            </div>

            {/* Notes */}
            {selectedRecord.notes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Notes</h4>
                <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                  {selectedRecord.notes}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-12 grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Submitted By</p>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">{submitter}</p>
                  <p className="text-xs text-slate-500">Sales Agent / Representative</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Acknowledged By</p>
                {acknowledger ? (
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{acknowledger}</p>
                    <p className="text-xs text-slate-500">
                      Claims Officer
                      {selectedRecord.acknowledged_at && ` (on ${new Date(selectedRecord.acknowledged_at).toLocaleDateString()})`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-400 italic">Pending Acknowledgment</p>
                    <p className="text-xs text-slate-500">Claims Department</p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Attachments / Requirements */}
            {detailRecord && detailRecord.attachments && detailRecord.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100 no-print">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Uploaded Requirements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detailRecord.attachments.map((att: any) => {
                    const [docTitle, docNote] = att.document_type ? att.document_type.split(' | Note: ') : [att.file_name, ''];
                    return (
                      <div key={att.id} className="flex flex-col p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-5 w-5 text-[#4A0E17] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{docTitle}</p>
                              <p className="text-[10px] text-slate-450 mt-0.5 truncate">
                                {att.file_name} ({(att.file_size / 1024).toFixed(1)} KB)
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                Uploaded: {new Date(att.created_at).toLocaleDateString()} {new Date(att.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setViewAttachment(att)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-slate-150 transition cursor-pointer"
                              title="View Attachment"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <a
                              href={`/api/v1/attachments/${att.id}/download?token=${token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-150 transition"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                        {docNote && (
                          <div className="pl-7 pr-3 py-1.5 bg-amber-50/40 border-l-2 border-amber-400 rounded-r-lg">
                            <p className="text-[11px] text-amber-800 leading-tight font-medium">Note: {docNote}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload form in Detail View for Acknowledged status and non-Claims-Officer */}
            {selectedRecord && selectedRecord.status === 'acknowledged' && !isClaimsOfficer && (() => {
              const detailClaimType = getDetailClaimType(detailRecord?.nature_of_claims);
              return (
                <div className="mt-8 pt-6 border-t border-slate-150 no-print space-y-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#4A0E17]" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload Claim Requirements</h4>
                  </div>
                  
                  {/* Own Damage Requirements */}
                  {(detailClaimType === 'OWN DAMAGE' || detailClaimType === 'OWN DAMAGE & TTPD') && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                      <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Own Damage Claim Requirements (Upload Attachments)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {OWN_DAMAGE_REQUIREMENTS.map((req) => (
                          <div key={req.key} className="space-y-1">
                            <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                id={`detail-file-${req.key}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setRequirementFiles((prev) => ({ ...prev, [req.key]: file }));
                                  }
                                }}
                                className="hidden"
                              />
                              <label
                                htmlFor={`detail-file-${req.key}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                <span>Choose File</span>
                              </label>
                              <span className="text-xs text-slate-500 truncate max-w-[150px]">
                                {requirementFiles[req.key]?.name || 'No file selected'}
                              </span>
                              {requirementFiles[req.key] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequirementFiles((prev) => {
                                      const copy = { ...prev };
                                      delete copy[req.key];
                                      return copy;
                                    });
                                    setRequirementNotes((prev) => {
                                      const copy = { ...prev };
                                      delete copy[req.key];
                                      return copy;
                                    });
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            {requirementFiles[req.key] && (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  placeholder="Add a brief note for this file..."
                                  value={requirementNotes[req.key] || ''}
                                  onChange={(e) => {
                                    setRequirementNotes((prev) => ({ ...prev, [req.key]: e.target.value }));
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-650 focus:outline-none focus:ring-1 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Third Party (TTPD) Requirements */}
                  {(detailClaimType === 'TPPD' || detailClaimType === 'OWN DAMAGE & TTPD') && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                      <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Third Party (TTPD) Claim Requirements (Upload Attachments)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TTPD_REQUIREMENTS.map((req) => (
                          <div key={req.key} className="space-y-1">
                            <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                id={`detail-file-${req.key}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setRequirementFiles((prev) => ({ ...prev, [req.key]: file }));
                                  }
                                }}
                                className="hidden"
                              />
                              <label
                                htmlFor={`detail-file-${req.key}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                <span>Choose File</span>
                              </label>
                              <span className="text-xs text-slate-500 truncate max-w-[150px]">
                                {requirementFiles[req.key]?.name || 'No file selected'}
                              </span>
                              {requirementFiles[req.key] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequirementFiles((prev) => {
                                      const copy = { ...prev };
                                      delete copy[req.key];
                                      return copy;
                                    });
                                    setRequirementNotes((prev) => {
                                      const copy = { ...prev };
                                      delete copy[req.key];
                                      return copy;
                                    });
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            {requirementFiles[req.key] && (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  placeholder="Add a brief note for this file..."
                                  value={requirementNotes[req.key] || ''}
                                  onChange={(e) => {
                                    setRequirementNotes((prev) => ({ ...prev, [req.key]: e.target.value }));
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-650 focus:outline-none focus:ring-1 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Custom Attachments */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-[#4A0E17]" />
                        <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Additional Attachments</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAttachments((prev) => [
                            ...prev,
                            {
                              id: Math.random().toString(36).substring(2, 9),
                              label: '',
                              file: null,
                              note: '',
                            },
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#4A0E17]/30 hover:bg-[#4A0E17]/5 text-[#4A0E17] text-xs font-semibold rounded-xl shadow-sm cursor-pointer transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Attachment</span>
                      </button>
                    </div>

                    {customAttachments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customAttachments.map((att) => (
                          <div key={att.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomAttachments((prev) => prev.filter((c) => c.id !== att.id));
                              }}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500">Document Label</label>
                              <input
                                type="text"
                                placeholder="e.g. Excess Liability, Owner Photo..."
                                value={att.label}
                                onChange={(e) => {
                                  setCustomAttachments((prev) =>
                                    prev.map((c) => (c.id === att.id ? { ...c, label: e.target.value } : c))
                                  );
                                }}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500">File Attachment</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  id={`detail-custom-file-${att.id}`}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setCustomAttachments((prev) =>
                                      prev.map((c) => (c.id === att.id ? { ...c, file } : c))
                                    );
                                  }}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`detail-custom-file-${att.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                >
                                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Choose File</span>
                                </label>
                                <span className="text-xs text-slate-500 truncate max-w-[150px]">
                                  {att.file?.name || 'No file selected'}
                                </span>
                              </div>
                            </div>

                            {att.file && (
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500">Attachment Note</label>
                                <input
                                  type="text"
                                  placeholder="Add a brief note for this file..."
                                  value={att.note}
                                  onChange={(e) => {
                                    setCustomAttachments((prev) =>
                                      prev.map((c) => (c.id === att.id ? { ...c, note: e.target.value } : c))
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-650 focus:outline-none focus:ring-1 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No additional attachments added. Click the button above to upload extra files.</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleDetailUpload}
                      disabled={isUploading || (Object.keys(requirementFiles).length === 0 && customAttachments.filter(c => c.file).length === 0)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Uploading Files...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Upload Attachments</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action buttons */}
        {isClaimsOfficer && selectedRecord.status === 'pending' && (
          <div className="flex justify-end gap-3 pt-4 no-print">
            <button
              onClick={() => setReturnTarget(selectedRecord)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100/80 text-sm font-medium rounded-xl shadow-sm transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Return to Agent
            </button>
            <button
              onClick={() => setAcknowledgeTarget(selectedRecord)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-sm transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" /> Acknowledge Notification
            </button>
          </div>
        )}

        {acknowledgeTarget && (
          <ConfirmModal
            open={!!acknowledgeTarget}
            title="Acknowledge Claim Notification"
            message={`Are you sure you want to acknowledge claim notification ${acknowledgeTarget.reference_number}?`}
            confirmLabel="Acknowledge"
            onConfirm={() => acknowledgeMut.mutate(acknowledgeTarget.id)}
            onCancel={() => setAcknowledgeTarget(null)}
            loading={acknowledgeMut.isPending}
          />
        )}

        {viewAttachment && (() => {
          const [docTitle, docNote] = viewAttachment.document_type ? viewAttachment.document_type.split(' | Note: ') : [viewAttachment.file_name, ''];
          return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
              <div className="bg-white rounded-2xl border border-slate-205 shadow-2xl max-w-3xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
                <div className="bg-[#4A0E17] px-6 py-4 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-white font-bold text-base">{docTitle}</h3>
                    <p className="text-[11px] text-white/70 mt-0.5 truncate max-w-[550px]">
                      {viewAttachment.file_name} ({(viewAttachment.file_size / 1024).toFixed(1)} KB) | Uploaded: {new Date(viewAttachment.created_at).toLocaleDateString()} {new Date(viewAttachment.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })} {docNote ? ` | Note: ${docNote}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewAttachment(null)}
                    className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex items-center justify-center min-h-[300px]">
                  {viewAttachment.mime_type.startsWith('image/') ? (
                    <img
                      src={`/api/v1/attachments/${viewAttachment.id}/preview?token=${token}`}
                      alt={docTitle}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                    />
                  ) : viewAttachment.mime_type === 'application/pdf' ? (
                    <iframe
                      src={`/api/v1/attachments/${viewAttachment.id}/preview?token=${token}`}
                      title={docTitle}
                      className="w-full h-[60vh] rounded-lg border border-slate-200"
                    />
                  ) : (
                  <div className="text-center space-y-4 p-8">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Preview not available for this file type</p>
                      <p className="text-xs text-slate-500 mt-1">This file can be downloaded for viewing.</p>
                    </div>
                    <a
                      href={`/api/v1/attachments/${viewAttachment.id}/download?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl transition"
                    >
                      <Download className="h-4 w-4" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    );
  }

  // ─── Form View ──────────────────────────────
  if (activeView === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveView('list'); resetForm(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Submit Claim Notification</h1>
            <p className="text-sm text-slate-500">Send a claim notification to the Claims Officer</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#4A0E17] to-[#7A1C2E] px-5 py-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-white/80" />
              <h3 className="text-sm font-bold text-white">Notification Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assured Name *</label>
                  <input type="text" value={form.assured_name}
                    onChange={(e) => {
                      setForm({ ...form, assured_name: e.target.value });
                      setShowNameSuggestions(true);
                      if (validationErrors.assured_name) {
                        setValidationErrors((prev) => ({ ...prev, assured_name: false }));
                      }
                    }}
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                    className={getInputClass('assured_name')} placeholder="Full name of the assured" />
                  
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {nameSuggestions.map((cust) => {
                        const name = cust.customer_type === 'corporate' && cust.company_name
                          ? cust.company_name
                          : `${cust.first_name} ${cust.last_name}`;
                        return (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                          >
                            <p className="text-sm font-semibold text-slate-800">{name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {cust.policy_no ? `Policy: ${cust.policy_no}` : 'No Policy'} 
                              {cust.plate_no ? ` | Plate: ${cust.plate_no}` : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Number</label>
                  <input type="text" value={form.contact_number}
                    onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                    className={getInputClass('contact_number')} placeholder="e.g. 0917-XXX-XXXX" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                  <input type="email" value={form.email_address}
                    onChange={(e) => setForm({ ...form, email_address: e.target.value })}
                    className={getInputClass('email_address')} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Insurance Provider *</label>
                  <select value={form.insurance_provider}
                    onChange={(e) => {
                      setForm({ ...form, insurance_provider: e.target.value });
                      if (validationErrors.insurance_provider) {
                        setValidationErrors((prev) => ({ ...prev, insurance_provider: false }));
                      }
                    }}
                    className={getInputClass('insurance_provider')}>
                    <option value="">Select Insurance Provider</option>
                    <option value="ALPHA">ALPHA</option>
                    <option value="MILESTONE">MILESTONE</option>
                    <option value="CBIC">CBIC</option>
                    <option value="BETHEL">BETHEL</option>
                    <option value="PHILIPPINE BRITISH">PHILIPPINE BRITISH</option>
                    <option value="METROPOLITAN">METROPOLITAN</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Plate Number</label>
                  <input type="text" value={form.plate_number || ''}
                    onChange={(e) => {
                      setForm({ ...form, plate_number: e.target.value });
                      setShowPlateSuggestions(true);
                      if (validationErrors.plate_number) {
                        setValidationErrors((prev) => ({ ...prev, plate_number: false }));
                      }
                    }}
                    onFocus={() => setShowPlateSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPlateSuggestions(false), 200)}
                    className={getInputClass('plate_number')} placeholder="e.g. ABC 1234" />
                  
                  {showPlateSuggestions && plateSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {plateSuggestions.map((cust) => {
                        const name = cust.customer_type === 'corporate' && cust.company_name
                          ? cust.company_name
                          : `${cust.first_name} ${cust.last_name}`;
                        return (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                          >
                            <p className="text-sm font-semibold text-slate-800">{cust.plate_no}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {name} {cust.policy_no ? ` | Policy: ${cust.policy_no}` : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy Number *</label>
                  <input type="text" value={form.policy_number}
                    onChange={(e) => {
                      setForm({ ...form, policy_number: e.target.value });
                      if (validationErrors.policy_number) {
                        setValidationErrors((prev) => ({ ...prev, policy_number: false }));
                      }
                    }}
                    className={getInputClass('policy_number')} placeholder="e.g. POL-2026-00001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Inception Date</label>
                  <input type="date" value={form.inception_date}
                    onChange={(e) => setForm({ ...form, inception_date: e.target.value })}
                    className={getInputClass('inception_date')} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Accident Date *</label>
                  <input type="date" value={form.accident_date}
                    onChange={(e) => {
                      setForm({ ...form, accident_date: e.target.value });
                      if (validationErrors.accident_date) {
                        setValidationErrors((prev) => ({ ...prev, accident_date: false }));
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className={getInputClass('accident_date')} />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type of Claim *</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        setClaimType(val);
                        if (val === 'OWN DAMAGE') {
                          const reqs = `OWN DAMAGE CLAIM REQUIREMENTS\n\n1. Original Police Report OR Notarized Affidavit\n2. Readable copy of ORCR\n3. Clear copy of Drivers license (Back and Front) with copy of OR\n4. Clear Pictures of Damages of the vehicle\n5. (4 Sides) Clear Pictures of the Vehicle Isometric View\n6. Repair Estimate with Contact number\n7. Picture of Odometer Reading\n8. Picture of Stencil or Vin plate\n• Authorization letter and valid ID from assured (if driven by authorized driver)\n\nTo proceed with the processing of this claim, kindly ensure that the full payment has been settled.`;
                          setForm((prev) => ({ ...prev, nature_of_claims: reqs }));
                          if (validationErrors.nature_of_claims) {
                            setValidationErrors((prev) => ({ ...prev, nature_of_claims: false }));
                          }
                        } else if (val === 'OWN DAMAGE & TTPD') {
                          const reqs = `OWN DAMAGE & TPPD REQUIREMENTS\n\n1. Original Police Report OR Notarized Affidavit\n2. Readable copy of ORCR\n3. Clear copy of Drivers license (Back and Front) with copy of OR\n4. Clear Pictures of Damages of the vehicle\n5. (4 Sides) Clear Pictures of the Vehicle Isometric View\n6. Repair Estimate with Contact number\n7. Picture of Odometer Reading\n8. Picture of Stencil or Vin plate\n• Authorization letter and valid ID from assured (if driven by authorized driver)\n\nTo proceed with the processing of this claim, kindly ensure that the full payment has been settled.\n\n--------------------------------------------------\n\nTHIRD PARTY (TTPD) CLAIM - REQUIREMENTS\n\n• Police report/Affidavit\n• Adverse Official Receipt and Certificate of Registration (ORCR)\n• Adverse Driver’s license\n• Adverse Repair Estimate\n• Adverse Certificate of no claim from his/her insurance provider\n• Adverse photos of damaged unit showing the plate number`;
                          setForm((prev) => ({ ...prev, nature_of_claims: reqs }));
                          if (validationErrors.nature_of_claims) {
                            setValidationErrors((prev) => ({ ...prev, nature_of_claims: false }));
                          }
                        } else if (val === 'TPPD') {
                          const reqs = `THIRD PARTY (TTPD) CLAIM - REQUIREMENTS\n\n• Police report/Affidavit\n• Adverse Official Receipt and Certificate of Registration (ORCR)\n• Adverse Driver’s license\n• Adverse Repair Estimate\n• Adverse Certificate of no claim from his/her insurance provider\n• Adverse photos of damaged unit showing the plate number`;
                          setForm((prev) => ({ ...prev, nature_of_claims: reqs }));
                          if (validationErrors.nature_of_claims) {
                            setValidationErrors((prev) => ({ ...prev, nature_of_claims: false }));
                          }
                        } else if (val === 'ACT OF NATURE') {
                          setForm((prev) => ({ ...prev, nature_of_claims: 'ACT OF NATURE CLAIM' }));
                        } else if (val === 'THEFT AND LOSS') {
                          setForm((prev) => ({ ...prev, nature_of_claims: 'THEFT AND LOSS CLAIM' }));
                        } else if (val === 'CNC (CERTIFICATE OF NO CLAIM)') {
                          setForm((prev) => ({ ...prev, nature_of_claims: 'CNC (CERTIFICATE OF NO CLAIM)' }));
                        } else {
                          setForm((prev) => ({ ...prev, nature_of_claims: '' }));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
                    >
                      <option value="">Select Type of Claim</option>
                      <option value="OWN DAMAGE">OWN DAMAGE</option>
                      <option value="TPPD">TPPD</option>
                      <option value="OWN DAMAGE & TTPD">OWN DAMAGE & TTPD</option>
                      <option value="ACT OF NATURE">ACT OF NATURE</option>
                      <option value="THEFT AND LOSS">THEFT AND LOSS</option>
                      <option value="CNC (CERTIFICATE OF NO CLAIM)">CNC (CERTIFICATE OF NO CLAIM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Claim Count</label>
                    <select
                      value={form.claim_count}
                      onChange={(e) => setForm({ ...form, claim_count: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
                    >
                      <option value="">Select Claim Count (e.g. 1st, 2nd...)</option>
                      <option value="1st Claim">1st Claim</option>
                      <option value="2nd Claim">2nd Claim</option>
                      <option value="3rd Claim">3rd Claim</option>
                      <option value="4th Claim">4th Claim</option>
                      <option value="5th Claim">5th Claim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nature of Claims / Details *</label>
                    <textarea value={form.nature_of_claims}
                      onChange={(e) => {
                        setForm({ ...form, nature_of_claims: e.target.value });
                        if (validationErrors.nature_of_claims) {
                          setValidationErrors((prev) => ({ ...prev, nature_of_claims: false }));
                        }
                      }}
                      rows={8} className={getInputClass('nature_of_claims')}
                      placeholder="Describe the nature of the claim or requirements..." />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">NOTE:</label>
                  <textarea value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3} className={getInputClass('notes')}
                    placeholder="Additional notes or remarks..." />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => { setActiveView('list'); resetForm(); }}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} disabled={submitMut.isPending || isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
                  {submitMut.isPending || isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isUploading ? 'Uploading Files...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Notification</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Letter Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-white/80" />
              <h3 className="text-sm font-bold text-white">Live Document Preview</h3>
            </div>
            
            {/* Simulating Paper Page */}
            <div className="p-6 md:p-8 flex-1 bg-white">
              <div className="border border-slate-150 rounded-2xl shadow-inner p-6 space-y-6">
                {/* Header section */}
                <div className="flex justify-between items-center pb-4 border-b border-[#4A0E17]">
                  <div className="flex items-center gap-2">
                    <img src={logoImg} alt="Logo" className="h-10 w-10 rounded-lg border border-slate-100 object-cover" />
                    <div>
                      <h4 className="text-[#4A0E17] font-black text-sm tracking-wider">SUPREMOGEN</h4>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Insurance Services</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Draft Preview</p>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">CLN-2026-XXXXX</p>
                  </div>
                </div>

                {/* Subject */}
                <div className="border-l-2 border-[#4A0E17] pl-3 py-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attention: Claims Department</p>
                  <h5 className="text-xs font-bold text-[#4A0E17] uppercase tracking-wide mt-0.5">
                    SUBJECT: CLAIM NOTIFICATION - {form.assured_name || 'DRAFT ASSURED'}
                  </h5>
                </div>

                {/* Details Table */}
                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-150 text-xs">
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {[
                        { label: 'Assured Name', value: form.assured_name || '—' },
                        { label: 'Contact Number', value: form.contact_number || '—' },
                        { label: 'Email Address', value: form.email_address || '—' },
                        { label: 'Insurance Provider', value: form.insurance_provider || '—' },
                        { label: 'Plate Number', value: form.plate_number || '—' },
                        { label: 'Policy Number', value: form.policy_number || '—' },
                        { label: 'Inception Date', value: form.inception_date ? new Date(form.inception_date + 'T00:00:00').toLocaleDateString() : '—' },
                        { label: 'Accident Date', value: form.accident_date ? new Date(form.accident_date + 'T00:00:00').toLocaleDateString() : '—' },
                      ].map((row, idx) => (
                        <tr key={row.label} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}>
                          <td className="px-4 py-2 font-semibold text-slate-400 w-1/3">{row.label}</td>
                          <td className="px-4 py-2 font-medium text-slate-700">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Nature of claims */}
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nature of Claims</h5>
                  <div className="bg-slate-50/80 border border-slate-150 rounded-xl p-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                    {form.nature_of_claims || 'No nature of claims described yet...'}
                  </div>
                </div>

                {/* Notes */}
                {form.notes && (
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Additional Notes</h5>
                    <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">
                      {form.notes}
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-2 gap-4 text-[10px] border-t border-slate-100">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider mb-4">Submitted By</p>
                    <p className="font-bold text-slate-700">{user?.name ?? 'Current User'}</p>
                    <p className="text-[9px] text-slate-400">Sales Agent / Representative</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider mb-4">Acknowledged By</p>
                    <p className="font-semibold text-slate-300 italic">Pending Acknowledgment</p>
                    <p className="text-[9px] text-slate-400">Claims Department</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View (default) ────────────────────
  const columns = [
    {
      key: 'reference_number', label: 'Ref No.', sortable: true,
      render: (r: ClaimNotification) => (
        <span className="font-mono text-xs text-[#4A0E17] font-bold">{r.reference_number}</span>
      ),
    },
    {
      key: 'assured_name', label: 'Assured Name', sortable: true,
      render: (r: ClaimNotification) => (
        <div>
          <p className="font-medium text-slate-800">{r.assured_name}</p>
          <p className="text-xs text-slate-500">{r.policy_number}</p>
        </div>
      ),
    },
    {
      key: 'insurance_provider', label: 'Provider', className: 'hidden lg:table-cell',
      render: (r: ClaimNotification) => (
        <span className="text-sm text-slate-600">{r.insurance_provider}</span>
      ),
    },
    {
      key: 'claim_count', label: 'Claim Count', className: 'hidden xl:table-cell',
      render: (r: ClaimNotification) => (
        <span className="text-xs text-slate-605">{r.claim_count || '—'}</span>
      ),
    },
    {
      key: 'accident_date', label: 'Accident Date', sortable: true,
      render: (r: ClaimNotification) => (
        <span className="text-xs text-slate-500">{new Date(r.accident_date).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: ClaimNotification) => <StatusBadge status={r.status} />,
    },
    {
      key: 'submitted_by', label: 'Submitted By', className: 'hidden lg:table-cell',
      render: (r: ClaimNotification) => {
        const name = typeof r.submitted_by === 'object' ? r.submitted_by.name : '—';
        return <span className="text-xs text-slate-600">{name}</span>;
      },
    },
    {
      key: 'created_at', label: 'Date', sortable: true,
      render: (r: ClaimNotification) => (
        <span className="text-xs text-slate-500">
          {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
      ),
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (r: ClaimNotification) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedRecord(r); setActiveView('detail'); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View">
            <Eye className="h-4 w-4 text-[#4A0E17]" />
          </button>
          {isClaimsOfficer && r.status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setReturnTarget(r); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Return to Agent">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setAcknowledgeTarget(r); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition" title="Acknowledge">
                <CheckCircle2 className="h-4 w-4" />
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
          <h1 className="text-xl font-bold text-slate-800">Claim Notifications</h1>
          <p className="text-sm text-slate-500">
            {canSubmit ? 'Submit claim notifications to the Claims Officer' : 'Review incoming claim notifications'}
          </p>
        </div>
        {canSubmit && (
          <button onClick={() => setActiveView('form')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer">
            <Plus className="h-4 w-4" /> New Notification
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search reference no., assured name, policy..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition" />
            {searchInput && (
              <button onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <select
              value={params.status || 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setParams((p) => ({ ...p, status: val === 'all' ? undefined : val, page: 1 }));
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (val && val !== 'all') {
                    next.set('status', val);
                  } else {
                    next.delete('status');
                  }
                  next.set('page', '1');
                  return next;
                }, { replace: true });
              }}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="returned">Returned</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-505">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <select
              value={params.claim_count || ''}
              onChange={(e) => {
                const val = e.target.value;
                setParams((p) => ({ ...p, claim_count: val || undefined, page: 1 }));
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (val) {
                    next.set('claim_count', val);
                  } else {
                    next.delete('claim_count');
                  }
                  next.set('page', '1');
                  return next;
                }, { replace: true });
              }}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition appearance-none cursor-pointer font-medium"
            >
              <option value="">All Claims</option>
              <option value="1st Claim">1st Claim</option>
              <option value="2nd Claim">2nd Claim</option>
              <option value="3rd Claim">3rd Claim</option>
              <option value="4th Claim">4th Claim</option>
              <option value="5th Claim">5th Claim</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-505">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <input
              type="date"
              value={params.created_date || ''}
              onChange={(e) => {
                const val = e.target.value;
                setParams((p) => ({ ...p, created_date: val || undefined, page: 1 }));
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (val) {
                    next.set('created_date', val);
                  } else {
                    next.delete('created_date');
                  }
                  next.set('page', '1');
                  return next;
                }, { replace: true });
              }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer font-medium"
              title="Filter by Date"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10 text-slate-400" />}
            title="No claim notifications found"
            description={searchInput ? 'Try a different search term.' : 'No claim notifications have been submitted yet.'}
          />
        ) : (
          <>
            <DataTable columns={columns} data={records} sortBy={params.sort_by} sortDir={params.sort_dir}
              onSort={handleSort}
              onRowClick={(r: ClaimNotification) => { setSelectedRecord(r); setActiveView('detail'); }} />

            {pagination && (
              <Pagination
                currentPage={pagination.current_page}
                lastPage={pagination.last_page}
                perPage={pagination.per_page}
                total={pagination.total}
                from={pagination.from}
                to={pagination.to}
                onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                onPerPageChange={(pp) => setParams((p) => ({ ...p, per_page: pp, page: 1 }))}
              />
            )}
          </>
        )}
      </div>

      {acknowledgeTarget && (
        <ConfirmModal
          open={!!acknowledgeTarget}
          title="Acknowledge Claim Notification"
          message={`Are you sure you want to acknowledge claim notification ${acknowledgeTarget.reference_number} for assured "${acknowledgeTarget.assured_name}"?`}
          confirmLabel="Acknowledge"
          onConfirm={() => acknowledgeMut.mutate(acknowledgeTarget.id)}
          onCancel={() => setAcknowledgeTarget(null)}
          loading={acknowledgeMut.isPending}
        />
      )}

      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="bg-[#4A0E17] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-base">Return Claim Notification</h3>
              <button onClick={() => { setReturnTarget(null); setReturnReason(''); }} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-650">
                Provide an explanation/reason for returning claim notification <span className="font-semibold text-slate-800">{returnTarget.reference_number}</span> back to the agent.
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Return Reason *</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition resize-none"
                  placeholder="Enter the reason why this claim is being returned..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => { setReturnTarget(null); setReturnReason(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => returnMut.mutate({ id: returnTarget.id, reason: returnReason })}
                disabled={returnMut.isPending || !returnReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
              >
                {returnMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                <span>Return Claim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {viewAttachment && (() => {
        const [docTitle, docNote] = viewAttachment.document_type ? viewAttachment.document_type.split(' | Note: ') : [viewAttachment.file_name, ''];
        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
              <div className="bg-[#4A0E17] px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-white font-bold text-base">{docTitle}</h3>
                  <p className="text-[11px] text-white/70 mt-0.5 truncate max-w-[550px]">
                    {viewAttachment.file_name} ({(viewAttachment.file_size / 1024).toFixed(1)} KB) | Uploaded: {new Date(viewAttachment.created_at).toLocaleDateString()} {new Date(viewAttachment.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })} {docNote ? ` | Note: ${docNote}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setViewAttachment(null)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex items-center justify-center min-h-[300px]">
                {viewAttachment.mime_type.startsWith('image/') ? (
                  <img
                    src={`/api/v1/attachments/${viewAttachment.id}/preview?token=${token}`}
                    alt={docTitle}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                  />
                ) : viewAttachment.mime_type === 'application/pdf' ? (
                  <iframe
                    src={`/api/v1/attachments/${viewAttachment.id}/preview?token=${token}`}
                    title={docTitle}
                    className="w-full h-[60vh] rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Preview not available for this file type</p>
                      <p className="text-xs text-slate-500 mt-1">This file can be downloaded for viewing.</p>
                    </div>
                    <a
                      href={`/api/v1/attachments/${viewAttachment.id}/download?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl transition"
                    >
                      <Download className="h-4 w-4" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
