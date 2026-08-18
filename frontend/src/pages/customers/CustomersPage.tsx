import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Users,
  FileText,
  X,
  Save,
  Loader2,
  UploadCloud,
  Paperclip,
  ChevronDown,
  Calendar,
  MapPin,
} from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getCustomers, deleteCustomer, createCustomer, updateCustomer } from '../../services/customerApi';
import { getPayments } from '../../services/paymentApi';
import { getClaims } from '../../services/claimApi';
import { uploadAttachment, getAttachments, downloadAttachment } from '../../services/attachmentApi';
import type { Customer, CustomerListParams, CustomerFormData } from '../../types/CustomerTypes';
import AttachmentPanel from '../../components/ui/AttachmentPanel';

export function parseFullName(fullName: string) {
  const name = (fullName || '').trim();
  const parts = name.split(/\s+/);
  
  let firstName = '';
  let middleName = '';
  let lastName = '';
  let suffix = '';

  if (parts.length === 0 || name === '') {
    return { firstName, middleName, lastName, suffix };
  }

  const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'esq', 'esq.'];
  const workingParts = [...parts];
  
  const lastPartLower = workingParts[workingParts.length - 1].toLowerCase();
  if (workingParts.length > 1 && suffixes.includes(lastPartLower)) {
    suffix = workingParts.pop() || '';
  }

  if (workingParts.length === 1) {
    firstName = workingParts[0];
    lastName = '';
  } else if (workingParts.length === 2) {
    firstName = workingParts[0];
    lastName = workingParts[1];
  } else if (workingParts.length === 3) {
    firstName = workingParts[0];
    middleName = workingParts[1];
    lastName = workingParts[2];
  } else {
    lastName = workingParts.pop() || '';
    middleName = workingParts.pop() || '';
    firstName = workingParts.join(' ');
  }

  return { firstName, middleName, lastName, suffix };
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { permissions, roles, token } = useAuth();
  const isUnderwriter = roles?.includes('Underwriter') || false;
  const canCreate = permissions.includes('customers.create');
  const canEdit = permissions.includes('customers.update');
  const canDelete = permissions.includes('customers.delete');
  const cannotEdit = !canEdit;

  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  // ─── Filters / Sort / Pagination ─────
  const [params, setParams] = useState<CustomerListParams>({
    page: 1,
    per_page: 15,
    search: querySearch,
    status: 'all',
    type: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const [searchInput, setSearchInput] = useState(querySearch);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  useEffect(() => {
    if (querySearch) {
      setSearchInput(querySearch);
      setParams((p) => ({ ...p, search: querySearch, page: 1 }));
    }
  }, [querySearch]);
  
  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'payment' | 'claims' | 'documents'>('info');


  
  // Form Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Customer | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'payment' | 'claims'>('info');

  // File Upload states for modal form
  const [orcrFile, setOrcrFile] = useState<File | null>(null);
  const [ellaScreenshotFile, setEllaScreenshotFile] = useState<File | null>(null);
  const [deedOfSaleFile, setDeedOfSaleFile] = useState<File | null>(null);
  const [termApprovalFile, setTermApprovalFile] = useState<File | null>(null);

  // Fetch attachments for selected customer details view
  const { data: selectedAttachmentsRes } = useQuery({
    queryKey: ['attachments', 'customer', selectedCustomer?.id],
    queryFn: () => getAttachments('customer', selectedCustomer?.id || 0),
    enabled: !!selectedCustomer?.id,
  });
  const selectedAttachments = selectedAttachmentsRes?.data ?? [];

  const activeCustomerId = selectedCustomer?.id || formEditTarget?.id;

  // Fetch payments for selected customer/form edit target
  const { data: customerPaymentsRes, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['customer-payments', activeCustomerId],
    queryFn: () => getPayments({ customer_id: activeCustomerId!, per_page: 50 }),
    enabled: !!activeCustomerId,
  });

  // Fetch claims for selected customer/form edit target
  const { data: customerClaimsRes, isLoading: isLoadingClaims } = useQuery({
    queryKey: ['customer-claims', activeCustomerId],
    queryFn: () => getClaims({ customer_id: activeCustomerId!, per_page: 50 }),
    enabled: !!activeCustomerId,
  });

  // ─── React Hook Form ─────────────────
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    defaultValues: {
      full_name: '',
      customer_type: 'individual',
      status: 'active',
      policy_status: 'ACTIVE',
      assured_value: 0,
      gross_premium: 0,
      policy_premium: 0,
      discount: 0,
      bi_pd: 0,
      pa: 0,
      aog: 0,
      policy_rate: 0,
      discount_rate: 0,
      
      request_type: '',
      activity: '',
      quotation_used: '',
      usage: '',
      chassis_no: '',
      engine_no: '',
      color: '',
      ownership: '',
      own_damage_coverage: 0,
      bi_coverage: 0,
      pd_coverage: 0,
      payment_terms: '',
      agent_markup: 0,
      sub_agent_markup: 0,
      sub_agent_name: '',
      freebie: 0,
      receiver_name: '',
      delivery_address: '',
      landmark: '',
      backup_phone: '',
      fb_link: '',
      used_rate_type: '',
      used_rate: '',
    },
  });

  const usedRateType = watch('used_rate_type');
  const isPartnerRate = usedRateType === 'partner_rate' || usedRateType === 'Partner Rate';

  // Reset form when opening/closing or changing edit target
  useEffect(() => {
    if (isFormOpen) {
      setActiveFormTab('info');
      setOrcrFile(null);
      setEllaScreenshotFile(null);
      setDeedOfSaleFile(null);
      setTermApprovalFile(null);
      if (formEditTarget) {
        const nameParts = [formEditTarget.first_name, formEditTarget.middle_name, formEditTarget.last_name, formEditTarget.suffix].filter(Boolean).join(' ');
        reset({
          full_name: nameParts,
          customer_type: formEditTarget.customer_type ?? 'individual',
          first_name: formEditTarget.first_name,
          last_name: formEditTarget.last_name,
          middle_name: formEditTarget.middle_name ?? '',
          suffix: formEditTarget.suffix ?? '',
          date_of_birth: formEditTarget.date_of_birth?.split('T')[0] ?? '',
          gender: formEditTarget.gender ?? '',
          email: formEditTarget.email,
          phone: formEditTarget.phone ?? '',
          mobile: formEditTarget.mobile ?? '',
          plate_no: formEditTarget.plate_no ?? '',
          unit: formEditTarget.unit ?? '',
          mortgage: formEditTarget.mortgage ?? '',
          agent: formEditTarget.agent ?? '',
          insurance_provider: formEditTarget.insurance_provider ?? '',
          policy_status: formEditTarget.policy_status ?? 'ACTIVE',
          policy_no: formEditTarget.policy_no ?? '',
          assured_value: formEditTarget.assured_value ?? 0,
          gross_premium: formEditTarget.gross_premium ?? 0,
          policy_premium: formEditTarget.policy_premium ?? 0,
          discount: formEditTarget.discount ?? 0,
          bi_pd: formEditTarget.bi_pd ?? 0,
          pa: formEditTarget.pa ?? 0,
          aog: formEditTarget.aog ?? 0,
          policy_rate: formEditTarget.policy_rate ?? 0,
          discount_rate: formEditTarget.discount_rate ?? 0,
          writing_date: formEditTarget.writing_date?.split('T')[0] ?? '',
          date_issued: formEditTarget.date_issued?.split('T')[0] ?? '',
          inception_date: formEditTarget.inception_date?.split('T')[0] ?? '',
          expiry_date: formEditTarget.expiry_date?.split('T')[0] ?? '',
          delivery_date: formEditTarget.delivery_date?.split('T')[0] ?? '',
          date_delivered: formEditTarget.date_delivered?.split('T')[0] ?? '',
          
          request_type: formEditTarget.request_type ?? '',
          activity: formEditTarget.activity ?? '',
          quotation_used: formEditTarget.quotation_used ?? '',
          usage: formEditTarget.usage ?? '',
          chassis_no: formEditTarget.chassis_no ?? '',
          engine_no: formEditTarget.engine_no ?? '',
          color: formEditTarget.color ?? '',
          ownership: formEditTarget.ownership ?? '',
          own_damage_coverage: formEditTarget.own_damage_coverage ?? 0,
          bi_coverage: formEditTarget.bi_coverage ?? 0,
          pd_coverage: formEditTarget.pd_coverage ?? 0,
          payment_terms: formEditTarget.payment_terms ?? '',
          agent_markup: formEditTarget.agent_markup ?? 0,
          sub_agent_markup: formEditTarget.sub_agent_markup ?? 0,
          sub_agent_name: formEditTarget.sub_agent_name ?? '',
          freebie: formEditTarget.freebie ?? 0,
          receiver_name: formEditTarget.receiver_name ?? '',
          delivery_address: formEditTarget.delivery_address ?? '',
          landmark: formEditTarget.landmark ?? '',
          backup_phone: formEditTarget.backup_phone ?? '',
          fb_link: formEditTarget.fb_link ?? '',
          used_rate_type: formEditTarget.used_rate_type ?? '',
          used_rate: formEditTarget.used_rate ?? '',
        });
      } else {
        reset({
          full_name: '',
          customer_type: 'individual',
          status: 'active',
          policy_status: 'ACTIVE',
          first_name: '',
          last_name: '',
          middle_name: '',
          suffix: '',
          date_of_birth: '',
          gender: '',
          email: '',
          phone: '',
          mobile: '',
          plate_no: '',
          unit: '',
          mortgage: '',
          agent: '',
          insurance_provider: '',
          policy_no: '',
          assured_value: 0,
          gross_premium: 0,
          policy_premium: 0,
          discount: 0,
          bi_pd: 0,
          pa: 0,
          aog: 0,
          policy_rate: 0,
          discount_rate: 0,
          writing_date: '',
          date_issued: '',
          inception_date: '',
          expiry_date: '',
          delivery_date: '',
          date_delivered: '',
          
          request_type: '',
          activity: '',
          quotation_used: '',
          usage: '',
          chassis_no: '',
          engine_no: '',
          color: '',
          ownership: '',
          own_damage_coverage: 0,
          bi_coverage: 0,
          pd_coverage: 0,
          payment_terms: '',
          agent_markup: 0,
          sub_agent_markup: 0,
          sub_agent_name: '',
          freebie: 0,
          receiver_name: '',
          delivery_address: '',
          landmark: '',
          backup_phone: '',
          fb_link: '',
          used_rate_type: '',
          used_rate: '',
        });
      }
    }
  }, [formEditTarget, isFormOpen, reset]);

  // ─── Query ───────────────────────────
  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
    placeholderData: (previousData) => previousData,
  });

  const pagination = response?.data;
  const customers = pagination?.data ?? [];

  // Helper function for sequential uploads
  const uploadFormFiles = async (customerId: number) => {
    if (orcrFile) {
      try {
        await uploadAttachment('customer', customerId, orcrFile, 'orcr_ndos_4sides');
      } catch (e: any) {
        console.error('Failed to upload ORCR attachment', e);
        showToast('Failed to upload ORCR file: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    if (ellaScreenshotFile) {
      try {
        await uploadAttachment('customer', customerId, ellaScreenshotFile, 'ella_langrio_screenshot');
      } catch (e: any) {
        console.error('Failed to upload Ella Langrio screenshot', e);
        showToast('Failed to upload Ella Langrio screenshot: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    if (deedOfSaleFile) {
      try {
        await uploadAttachment('customer', customerId, deedOfSaleFile, 'deed_of_sale_ndos');
      } catch (e: any) {
        console.error('Failed to upload Deed of Sale attachment', e);
        showToast('Failed to upload Deed of Sale: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    if (termApprovalFile) {
      try {
        await uploadAttachment('customer', customerId, termApprovalFile, 'term_approval');
      } catch (e: any) {
        console.error('Failed to upload Term Approval attachment', e);
        showToast('Failed to upload Term Approval: ' + (e.response?.data?.message ?? e.message), 'error');
      }
    }
    setOrcrFile(null);
    setEllaScreenshotFile(null);
    setDeedOfSaleFile(null);
    setTermApprovalFile(null);
  };

  // ─── Mutations ──────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Customer record deleted successfully.');
      setDeleteTarget(null);
      setSelectedCustomer(null);
    },
    onError: () => {
      showToast('Failed to delete customer record.', 'error');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) => createCustomer(data),
    onSuccess: async (res) => {
      if (res.data?.id) {
        await uploadFormFiles(res.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Transaction record created successfully.');
      setIsFormOpen(false);
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const msg = errors 
        ? Object.values(errors).flat().join(' ') 
        : (err.response?.data?.message ?? 'Failed to create record.');
      showToast(msg, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CustomerFormData) => updateCustomer(Number(formEditTarget?.id), data),
    onSuccess: async () => {
      const customerId = formEditTarget?.id;
      if (customerId) {
        await uploadFormFiles(customerId);
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Transaction record updated successfully.');
      setIsFormOpen(false);
      if (selectedCustomer && selectedCustomer.id === formEditTarget?.id) {
        setSelectedCustomer(null);
      }
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const msg = errors 
        ? Object.values(errors).flat().join(' ') 
        : (err.response?.data?.message ?? 'Failed to update record.');
      showToast(msg, 'error');
    },
  });

  // ─── Handlers ────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setParams((p) => ({ ...p, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleSort = (key: string) => {
    setParams((p) => ({
      ...p,
      sort_by: key,
      sort_dir: p.sort_by === key && p.sort_dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const onFormSubmit = (data: CustomerFormData) => {
    const parsed = parseFullName(data.full_name || '');
    data.first_name = parsed.firstName;
    data.middle_name = parsed.middleName;
    data.last_name = parsed.lastName;
    data.suffix = parsed.suffix;

    if (!data.landmark || !data.landmark.trim()) {
      data.landmark = 'N/A';
    }

    const usedRateTypeValue = watch('used_rate_type');
    const isPartnerRate = (usedRateTypeValue || '').toUpperCase().includes('PARTNER') || (usedRateTypeValue || '').toUpperCase().includes('SIR JESS');

    if (!formEditTarget && (!orcrFile || (isPartnerRate && !ellaScreenshotFile))) {
      showToast(isPartnerRate ? 'Please upload all required attachments (ORCR and Ella Langrio Screenshot).' : 'Please upload required ORCR attachment.', 'error');
      return;
    }

    const ownershipValue = watch('ownership');
    const needsDeedOfSale = ['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(ownershipValue || '');
    if (needsDeedOfSale && !deedOfSaleFile && !formEditTarget) {
      showToast('Please upload Deed of Sale / NDOS for 2nd-4th owners.', 'error');
      return;
    }

    const paymentTermsValue = watch('payment_terms');
    const needsTermApproval = ['5', '6'].includes(String(paymentTermsValue || ''));
    if (needsTermApproval && !termApprovalFile && !formEditTarget) {
      showToast('Please upload the Term Approval Attachment for 5-6 month terms.', 'error');
      return;
    }

    if (formEditTarget) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const getPolicyStatusBadge = (policyStatus: string | null | undefined) => {
    const status = (policyStatus || '').toUpperCase().trim();
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase">
            ACTIVE
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 uppercase">
            INACTIVE
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 uppercase">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-500/20 uppercase">
            {status || 'DRAFT'}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return '₱ 0.00';
    return `₱ ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // ─── Table Columns ──────────────────
  const columns = [
    {
      key: 'index',
      label: 'No',
      render: (_row: Customer, idx: number) => (
        <span className="text-slate-500 text-sm">
          {idx + 1 + ((params.page ?? 1) - 1) * (params.per_page ?? 10)}
        </span>
      ),
    },
    {
      key: 'record_no',
      label: 'Record No',
      sortable: true,
      render: (row: Customer) => (
        <span className="font-mono text-xs text-[#4A0E17] font-bold">
          {row.record_no || '—'}
        </span>
      ),
    },
    {
      key: 'last_name',
      label: "Client's Name",
      sortable: true,
      render: (row: Customer) => (
        <span className="font-medium text-slate-800 uppercase">
          {row.first_name} {row.last_name}
        </span>
      ),
    },
    ...(isUnderwriter ? [{
      key: 'created_by',
      label: 'Agent',
      sortable: false,
      render: (row: Customer) => {
        const creator = (row as any).created_by;
        const creatorName = (typeof creator === 'object' && creator) ? creator.name : '—';
        const role = (typeof creator === 'object' && creator) ? creator.role_name : '';
        const displayText = role && role !== 'None' ? `${creatorName} - ${role}` : creatorName;
        return (
          <span className="inline-flex items-center rounded-full bg-[#8A1C2E]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#8A1C2E] ring-1 ring-inset ring-[#8A1C2E]/10 uppercase tracking-wider">
            {displayText}
          </span>
        );
      }
    }] : []),
    {
      key: 'plate_no',
      label: 'Plate No',
      sortable: true,
      render: (row: Customer) => (
        <span className="font-mono text-xs text-slate-600 uppercase">
          {row.plate_no || '—'}
        </span>
      ),
    },
    {
      key: 'policy_status',
      label: 'Policy Status',
      sortable: true,
      render: (row: Customer) => getPolicyStatusBadge(row.policy_status),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row: Customer) => (
        <div className="flex items-center justify-end gap-1">
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ].filter((col) => !(col.key === 'actions' && !canDelete));

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const inputClass = (error?: any) =>
    `w-full px-3.5 py-2 bg-white border rounded-xl text-sm text-slate-700 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] ${
      error ? 'border-red-400' : 'border-slate-200'
    }`;
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Customer Record Management</h1>
          <p className="text-sm text-slate-500">
            Manage insurance transaction records and client portfolios
          </p>
        </div>

      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-4">
        {/* Search field */}
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, record number, plate number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
          />
          {searchInput && (
            <button 
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer flex items-center justify-center"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group (Dates & Status) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
          {/* Start Date */}
          <div className="relative w-full sm:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={params.start_date || ''}
              onChange={(e) => setParams((p) => ({ ...p, start_date: e.target.value || undefined, page: 1 }))}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="relative w-full sm:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={params.end_date || ''}
              onChange={(e) => setParams((p) => ({ ...p, end_date: e.target.value || undefined, page: 1 }))}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
              title="End Date"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative w-full sm:w-48">
            <select
              value={params.status}
              onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Active with Balance</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        {customers.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Users className="h-10 w-10 text-slate-400" />}
            title="No records found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={customers}
              sortBy={params.sort_by}
              sortDir={params.sort_dir}
              onSort={handleSort}
              loading={isLoading}
              onRowClick={(row) => {
                setSelectedCustomer(row);
                setActiveModalTab('info');
              }}
            />
            {pagination && (
              <div className="border-t border-slate-100">
                <Pagination
                  currentPage={pagination.current_page}
                  lastPage={pagination.last_page}
                  perPage={pagination.per_page}
                  total={pagination.total}
                  from={pagination.from}
                  to={pagination.to}
                  onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                  onPerPageChange={(per_page) =>
                    setParams((p) => ({ ...p, per_page, page: 1 }))
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Transaction Details Modal ─────────── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">Transaction - {selectedCustomer.record_no}</h3>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="bg-slate-50 px-6 border-b border-slate-200/60 flex gap-2 pt-3">
              <button
                onClick={() => setActiveModalTab('info')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeModalTab === 'info'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Information
              </button>
              <button
                onClick={() => setActiveModalTab('payment')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeModalTab === 'payment'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Payment
              </button>
              <button
                onClick={() => setActiveModalTab('claims')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeModalTab === 'claims'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Claims
              </button>
              <button
                onClick={() => setActiveModalTab('documents')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeModalTab === 'documents'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Documents
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeModalTab === 'info' && (() => {
                const orcrAttachment = selectedAttachments.find(a => a.document_type === 'orcr_ndos_4sides');
                const ellaAttachment = selectedAttachments.find(a => a.document_type === 'ella_langrio_screenshot');
                const deedOfSaleAttachment = selectedAttachments.find(a => a.document_type === 'deed_of_sale_ndos');
                const termApprovalAttachment = selectedAttachments.find(a => a.document_type === 'term_approval');

                return (
                  <div className="space-y-6">
                    {/* Record No & Status Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
                      <div>
                        <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Record No.</span>
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono font-bold text-[#4A0E17] text-sm shadow-sm">
                          {selectedCustomer.record_no || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Status</span>
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-[#4A0E17] text-sm shadow-sm uppercase">
                          {selectedCustomer.status === 'inactive' ? 'DRAFT' : selectedCustomer.status === 'blacklisted' ? 'ACTIVE WITH BALANCE' : 'ACTIVE'}
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Date Request</span>
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 text-sm shadow-sm">
                          {formatDate(selectedCustomer.writing_date)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* Request & Activity Details */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Request & Activity Details</h4>
                          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                            <span className="text-slate-500 font-semibold text-xs">Type</span>
                            <span className="col-span-2 text-slate-800 font-bold">{selectedCustomer.request_type || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Activity</span>
                            <span className="col-span-2 text-slate-800 font-bold">{selectedCustomer.activity || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Provider</span>
                            <span className="col-span-2 text-slate-800 font-bold">{selectedCustomer.insurance_provider || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Quotation Used</span>
                            <span className="col-span-2 text-slate-800 font-bold">{selectedCustomer.quotation_used || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Usage</span>
                            <span className="col-span-2 text-slate-800 font-bold">{selectedCustomer.usage || '—'}</span>
                          </div>
                        </div>

                        {/* Assured Personal & Contact Info */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Assured Personal & Contact</h4>
                          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                            <span className="text-slate-500 font-semibold text-xs">Assured Name</span>
                            <span className="col-span-2 text-slate-800 font-bold uppercase">
                              {[
                                selectedCustomer.first_name,
                                selectedCustomer.middle_name,
                                selectedCustomer.last_name,
                                selectedCustomer.suffix
                              ].filter(Boolean).join(' ')}
                            </span>
                            
                            <span className="text-slate-500 font-semibold text-xs">Contact No.#</span>
                            <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.mobile || '—'}</span>
                            
                            <span className="text-slate-500 font-semibold text-xs">Back Up No.#</span>
                            <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.backup_phone || '—'}</span>
                            
                            <span className="text-slate-500 font-semibold text-xs">Email Add</span>
                            <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.email}</span>

                            <span className="text-slate-500 font-semibold text-xs">FB Link</span>
                            <span className="col-span-2 text-slate-800 font-medium truncate">
                              {selectedCustomer.fb_link ? (
                                <a href={selectedCustomer.fb_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {selectedCustomer.fb_link}
                                </a>
                              ) : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Assured Address */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Assured Address</h4>
                          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                            <span className="text-slate-500 font-semibold text-xs">Address</span>
                            <span className="col-span-2 text-slate-800 font-medium">
                              {[
                                selectedCustomer.address_line_1,
                                selectedCustomer.address_line_2,
                                selectedCustomer.city,
                                selectedCustomer.province,
                                selectedCustomer.zip_code
                              ].filter(Boolean).join(', ') || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Delivery Details</h4>
                          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                            <span className="text-slate-500 font-semibold text-xs">Receiver's Name</span>
                            <span className="col-span-2 text-slate-800 font-bold uppercase">{selectedCustomer.receiver_name || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Delivery Address</span>
                            <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.delivery_address || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Landmark</span>
                            <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.landmark || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {/* Vehicle Information */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Vehicle Information</h4>
                          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                            <span className="text-slate-500 font-semibold text-xs">Year Model & Make</span>
                            <span className="col-span-2 text-slate-800 font-bold uppercase">{selectedCustomer.unit || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Chassis #</span>
                            <span className="col-span-2 text-slate-800 font-mono font-semibold uppercase">{selectedCustomer.chassis_no || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Engine #</span>
                            <span className="col-span-2 text-slate-800 font-mono font-semibold uppercase">{selectedCustomer.engine_no || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Color</span>
                            <span className="col-span-2 text-slate-800 font-medium capitalize">{selectedCustomer.color || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Plate Number</span>
                            <span className="col-span-2 text-slate-800 font-mono font-bold uppercase">{selectedCustomer.plate_no || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Bank</span>
                            <span className="col-span-2 text-slate-800 font-bold uppercase">{selectedCustomer.mortgage || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Ownership</span>
                            <span className="col-span-2 text-slate-800 font-bold uppercase">{selectedCustomer.ownership || '—'}</span>
                          </div>
                        </div>

                        {/* Policy & Coverages */}
                        {(() => {
                          const cust: any = selectedCustomer || {};
                          const odCov = Number(cust.own_damage_coverage || cust.sum_insured || 430000);
                          const aonCov = Number(cust.aog || cust.aon_coverage || odCov || 430000);
                          const biCov = Number(cust.bi_coverage || 200000);
                          const pdCov = Number(cust.pd_coverage || 200000);
                          const paCov = Number(cust.pa || cust.pa_coverage || 250000);

                          const parseRate = (val: any, fallback: number) => {
                            if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
                            if (typeof val === 'string') {
                              const match = val.match(/(\d+(?:\.\d+)?)/);
                              if (match) {
                                const parsed = parseFloat(match[1]);
                                if (!isNaN(parsed) && parsed > 0) return parsed;
                              }
                            }
                            return fallback;
                          };

                          let odPrem = Number(cust.od_premium ?? cust.premiums?.od ?? 0);
                          let aonPrem = Number(cust.aon_premium ?? cust.premiums?.aon ?? 0);
                          let biPrem = Number(cust.bi_premium ?? cust.premiums?.bi ?? 0);
                          let pdPrem = Number(cust.pd_premium ?? cust.premiums?.pd ?? 0);
                          let paPrem = Number(cust.pa_premium ?? cust.premiums?.pa ?? 0);

                          if (isNaN(odPrem) || odPrem === 0) {
                            if (odCov > 0) {
                              const rateOD = parseRate(cust.selling_rate_od ?? cust.used_rate, 1.30);
                              odPrem = Math.round(odCov * (rateOD / 100) * 100) / 100;
                            } else {
                              odPrem = 0;
                            }
                          }
                          if (isNaN(aonPrem) || aonPrem === 0) {
                            if (aonCov > 0) {
                              const rateAON = parseRate(cust.selling_rate_aon, 0.10);
                              aonPrem = Math.round(aonCov * (rateAON / 100) * 100) / 100;
                            } else {
                              aonPrem = 0;
                            }
                          }
                          if (isNaN(biPrem) || biPrem === 0) {
                            biPrem = biCov > 0 ? 420 : 0;
                          }
                          if (isNaN(pdPrem) || pdPrem === 0) {
                            pdPrem = pdCov > 0 ? 1245 : 0;
                          }
                          if (isNaN(paPrem) || paPrem === 0) {
                            paPrem = paCov > 0 ? 700 : 0;
                          }

                          return (
                            <div className="space-y-3">
                              <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Policy & Coverages</h4>
                              <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 mb-2">
                                <span className="text-slate-500 font-semibold text-xs">Policy No.#</span>
                                <span className="col-span-2 text-slate-800 font-mono font-bold">{cust.policy_no || '—'}</span>

                                <span className="text-slate-500 font-semibold text-xs">Inception Date</span>
                                <span className="col-span-2 text-slate-800 font-medium">{formatDate(cust.inception_date)}</span>
                              </div>

                              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white text-xs">
                                <table className="w-full text-left text-slate-700 border-collapse">
                                  <thead>
                                    <tr className="bg-[#4A0E17] text-white font-bold uppercase text-[10px] tracking-wider">
                                      <th className="py-2 px-3 text-left">Peril</th>
                                      <th className="py-2 px-3 text-right">Coverage</th>
                                      {!(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') && (
                                        <th className="py-2 px-3 text-right">Premium</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    <tr className="hover:bg-slate-50/80 transition">
                                      <td className="py-1.5 px-3 font-semibold text-slate-800">Own Damage</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(odCov)}</td>
                                      {!(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') && (
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(odPrem)}</td>
                                      )}
                                    </tr>
                                    <tr className="hover:bg-slate-50/80 transition">
                                      <td className="py-1.5 px-3 font-semibold text-slate-800">Acts of Nature</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(aonCov)}</td>
                                      {!(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') && (
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(aonPrem)}</td>
                                      )}
                                    </tr>
                                    <tr className="hover:bg-slate-50/80 transition">
                                      <td className="py-1.5 px-3 font-semibold text-slate-800">Bodily Injury</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(biCov)}</td>
                                      {!(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') && (
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(biPrem)}</td>
                                      )}
                                    </tr>
                                    <tr className="hover:bg-slate-50/80 transition">
                                      <td className="py-1.5 px-3 font-semibold text-slate-800">Property Damage</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(pdCov)}</td>
                                      {!(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') && (
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(pdPrem)}</td>
                                      )}
                                    </tr>
                                    <tr className="hover:bg-slate-50/80 transition">
                                      <td className="py-1.5 px-3 font-semibold text-slate-800">Personal Accident</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{formatCurrency(paCov)}</td>
                                      {!(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') && (
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(paPrem)}</td>
                                      )}
                                    </tr>
                                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                      <td className="py-2 px-3 text-slate-900 uppercase text-[10px] tracking-wider" colSpan={(selectedCustomer?.used_rate_type || '').toUpperCase().includes('SIR JESS') ? 1 : 2}>Total Premium</td>
                                      <td className="py-2 px-3 text-right font-mono text-[#4A0E17] font-black text-sm">{formatCurrency(cust.policy_premium)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Terms, Rates & Markup */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Terms, Rates & Markup</h4>
                          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                            <span className="text-slate-500 font-semibold text-xs">Payment Terms</span>
                            <span className="col-span-2 text-slate-800 font-medium">
                              {selectedCustomer.payment_terms ? `${selectedCustomer.payment_terms} Month(s)` : '—'}
                            </span>

                            <span className="text-slate-500 font-semibold text-xs">Agent's Markup</span>
                            <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(selectedCustomer.agent_markup)}</span>

                            <span className="text-slate-500 font-semibold text-xs">Sub-Agent's Markup</span>
                            <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(selectedCustomer.sub_agent_markup)}</span>

                            <span className="text-slate-500 font-semibold text-xs">Sub-Agent's Name</span>
                            <span className="col-span-2 text-slate-800 font-medium capitalize">{selectedCustomer.sub_agent_name || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Freebie</span>
                            <span className="col-span-2 text-slate-800 font-semibold font-mono">{formatCurrency(selectedCustomer.freebie)}</span>

                            <span className="text-slate-500 font-semibold text-xs">Used Rate Type</span>
                            <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.used_rate_type || '—'}</span>

                            <span className="text-slate-500 font-semibold text-xs">Used Rate</span>
                            <span className="col-span-2 text-slate-800 font-mono font-medium">
                              {(selectedCustomer.used_rate_type || '').toUpperCase().includes('SIR JESS') ? '—' : (selectedCustomer.used_rate || '—')}
                            </span>

                            <span className="text-slate-500 font-semibold text-xs">Remarks / Notes</span>
                            <span className="col-span-2 text-slate-800 font-medium block whitespace-pre-wrap">{selectedCustomer.notes || '—'}</span>
                          </div>
                        </div>

                        {/* Document Attachments */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider">Document Attachments</h4>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 rounded-full">
                              {selectedAttachments.length} {selectedAttachments.length === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {(() => {
                              const orcrFiles = selectedAttachments.filter(a => a.document_type === 'orcr_ndos_4sides');
                              const screenshotFiles = selectedAttachments.filter(a => a.document_type === 'ella_langrio_screenshot');
                              const bankFiles = selectedAttachments.filter(a => a.document_type === 'bank');
                              const deedOfSaleFiles = selectedAttachments.filter(a => a.document_type === 'deed_of_sale_ndos');
                              const termApprovalFiles = selectedAttachments.filter(a => a.document_type === 'term_approval');
                              const otherFiles = selectedAttachments.filter(a => !['orcr_ndos_4sides', 'ella_langrio_screenshot', 'bank', 'deed_of_sale_ndos', 'term_approval'].includes(a.document_type || ''));
                              const needsDeedOfSale = ['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(selectedCustomer.ownership || '');
                              const needsTermApproval = ['5', '6'].includes(String(selectedCustomer.payment_terms || ''));

                              const renderCategoryRow = (files: any[], categoryLabel: string, keyPrefix: string, showIfEmpty: boolean = true) => {
                                if (files.length === 0) {
                                  if (!showIfEmpty) return null;
                                  return (
                                    <div key={keyPrefix} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-700 block truncate">{categoryLabel}</span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">Not Uploaded</span>
                                    </div>
                                  );
                                }

                                if (files.length === 1) {
                                  const file = files[0];
                                  return (
                                    <div key={`${keyPrefix}-${file.id}`} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                          <span className="text-xs font-semibold text-slate-700 block truncate">{categoryLabel}</span>
                                          <span className="text-[10px] text-slate-500 block truncate" title={file.file_name}>{file.file_name}</span>
                                        </div>
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => downloadAttachment(file.id, file.file_name)}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4A0E17] hover:underline shrink-0 bg-[#4A0E17]/5 px-2.5 py-1 rounded-lg cursor-pointer"
                                      >
                                        Download File
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={`${keyPrefix}-multi`} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                      <div className="flex items-center gap-2">
                                        <Paperclip className="h-4 w-4 text-[#4A0E17] shrink-0" />
                                        <span className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">{categoryLabel} ({files.length})</span>
                                      </div>
                                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                        {files.length} files
                                      </span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {files.map((file: any, index: number) => (
                                        <div key={file.id || index} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-100">
                                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                            <span className="text-[10px] font-mono font-bold text-slate-400">#{index + 1}</span>
                                            <span className="text-xs font-semibold text-slate-700 truncate" title={file.file_name}>{file.file_name}</span>
                                          </div>
                                          <button 
                                            type="button"
                                            onClick={() => downloadAttachment(file.id, file.file_name)}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4A0E17] hover:underline shrink-0 bg-[#4A0E17]/5 px-2 py-0.5 rounded cursor-pointer"
                                          >
                                            Download
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              };

                              const items: React.ReactNode[] = [];
                              items.push(renderCategoryRow(orcrFiles, 'ORCR / NDOS / 4 SIDES', 'orcr', true));
                              items.push(renderCategoryRow(screenshotFiles, 'Ella Langrio Screenshot', 'screenshot', true));
                              items.push(renderCategoryRow(bankFiles, 'Bank Attachment', 'bank', true));
                              if (deedOfSaleFiles.length > 0 || needsDeedOfSale) {
                                items.push(renderCategoryRow(deedOfSaleFiles, 'Deed of Sale / NDOS', 'deed', true));
                              }
                              if (termApprovalFiles.length > 0 || needsTermApproval) {
                                items.push(renderCategoryRow(termApprovalFiles, 'Term Approval Attachment', 'term', true));
                              }
                              if (otherFiles.length > 0) {
                                items.push(renderCategoryRow(otherFiles, 'Attachment / Document', 'other', false));
                              }

                              return items.filter(Boolean);
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeModalTab === 'payment' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Payment History</h4>
                  {isLoadingPayments ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#4A0E17]" />
                    </div>
                  ) : !customerPaymentsRes?.data?.data || customerPaymentsRes.data.data.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                      No payment transactions recorded for this record.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <table className="min-w-full divide-y divide-slate-200/85 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Payment No.</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Method</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/85 bg-white">
                          {customerPaymentsRes.data.data.map((p) => (
                            <tr key={p.id}>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-750 text-slate-700">{p.payment_number}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-650 capitalize">{p.payment_method?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2.5 text-slate-500">{formatDate(p.payment_date)}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{formatCurrency(p.amount)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                                  p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                                  p.status === 'voided' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' :
                                  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'claims' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Claims Record</h4>
                  {isLoadingClaims ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#4A0E17]" />
                    </div>
                  ) : !customerClaimsRes?.data?.data || customerClaimsRes.data.data.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                      No claims filed against this policy.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <table className="min-w-full divide-y divide-slate-200/85 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Claim No.</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Incident Date</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/85 bg-white">
                          {customerClaimsRes.data.data.map((c) => (
                            <tr key={c.id}>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-750 text-slate-700">{c.claim_number}</td>
                              <td className="px-4 py-2.5 text-slate-500">{formatDate(c.incident_date)}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{formatCurrency(c.claim_amount)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                                  c.status === 'settled' || c.status === 'approved' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                                  c.status === 'denied' || c.status === 'closed' ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-650/20' :
                                  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                }`}>
                                  {c.status?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={c.adjuster_remarks || c.incident_description}>
                                {c.adjuster_remarks || c.incident_description || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'documents' && (
                <div className="space-y-4">
                  <AttachmentPanel type="customer" id={selectedCustomer.id} readOnly={cannotEdit} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
              {!cannotEdit && (
                <button 
                  onClick={() => {
                    setFormEditTarget(selectedCustomer);
                    setSelectedCustomer(null);
                    setIsFormOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Edit Details
                </button>
              )}
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#4A0E17] hover:bg-[#3D0B12] rounded-xl transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Transaction Form Modal ───────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  {formEditTarget ? `Edit Transaction - ${formEditTarget.record_no}` : 'Create New Record'}
                </h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="bg-slate-50 px-6 border-b border-slate-200/60 flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveFormTab('info')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeFormTab === 'info'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Information
              </button>
              <button
                type="button"
                onClick={() => formEditTarget && setActiveFormTab('payment')}
                disabled={!formEditTarget}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  !formEditTarget ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  activeFormTab === 'payment'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Payment
              </button>
              <button
                type="button"
                onClick={() => formEditTarget && setActiveFormTab('claims')}
                disabled={!formEditTarget}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  !formEditTarget ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  activeFormTab === 'claims'
                    ? 'bg-white border-slate-200/80 text-[#4A0E17] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Claims
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-slate-50/50">
              {activeFormTab === 'info' && (
                <div className="space-y-6 flex-1">
                  {/* Record No & Status Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-200/60">
                    <div>
                      <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Record No.</span>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono font-bold text-[#4A0E17] text-sm shadow-sm">
                        {formEditTarget ? (formEditTarget.record_no || '—') : 'Auto-Generated'}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Status</span>
                      {formEditTarget ? (
                        <select 
                          {...register('status')} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-[#4A0E17] text-sm shadow-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
                        >
                          <option value="inactive">DRAFT</option>
                          <option value="active">ACTIVE</option>
                          <option value="blacklisted">ACTIVE WITH BALANCE</option>
                        </select>
                      ) : (
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-[#4A0E17] text-sm shadow-sm uppercase">
                          DRAFT
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Date Request *</label>
                      <input
                        type="date"
                        {...register('writing_date', { required: 'Date request is required' })}
                        className={inputClass(errors.writing_date)}
                      />
                      {errors.writing_date && <p className="text-xs text-red-500 mt-1">{errors.writing_date.message}</p>}
                    </div>
                  </div>

                  {/* Section 1: Request & Activity Details */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Request & Activity Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className={labelClass}>Type *</label>
                        <select {...register('request_type', { required: 'Request type is required' })} className={inputClass(errors.request_type)}>
                          <option value="">Select Type</option>
                          <option value="NEW ACCOUNT">NEW ACCOUNT</option>
                          <option value="RENEWAL CLIENT">RENEWAL CLIENT</option>
                        </select>
                        {errors.request_type && <p className="text-xs text-red-500 mt-1">{errors.request_type.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Activity *</label>
                        <select {...register('activity', { required: 'Activity is required' })} className={inputClass(errors.activity)}>
                          <option value="">Select Activity</option>
                          <option value="POSTING">POSTING</option>
                          <option value="SNIPING">SNIPING</option>
                          <option value="SUB-AGENT">SUB-AGENT</option>
                          <option value="RENEWAL">RENEWAL</option>
                          <option value="REFERRAL">REFERRAL</option>
                          <option value="NETWORK / EXISTING CLIENT">NETWORK / EXISTING CLIENT</option>
                          <option value="KKK">KKK</option>
                          <option value="FLYERS">FLYERS</option>
                          <option value="FIELD">FIELD</option>
                          <option value="PARTNERS">PARTNERS</option>
                          <option value="SUPREMO MAIN PAGE">SUPREMO MAIN PAGE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                        {errors.activity && <p className="text-xs text-red-500 mt-1">{errors.activity.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Provider *</label>
                        <select {...register('insurance_provider', { required: 'Provider is required' })} className={inputClass(errors.insurance_provider)}>
                          <option value="">Select Provider</option>
                          <option value="ALPHA">ALPHA</option>
                          <option value="CBIC">CBIC</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                        {errors.insurance_provider && <p className="text-xs text-red-500 mt-1">{errors.insurance_provider.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Quotation Used *</label>
                        <select {...register('quotation_used', { required: 'Quotation type is required' })} className={inputClass(errors.quotation_used)}>
                          <option value="">Select Quotation</option>
                          <option value="SUV">SUV</option>
                          <option value="SEDAN">SEDAN</option>
                          <option value="TNVS">TNVS</option>
                          <option value="TRUCKS">TRUCKS</option>
                          <option value="MOTOR">MOTOR</option>
                          <option value="OLD CAR">OLD CAR</option>
                          <option value="L300/H100">L300/H100</option>
                          <option value="FOR HIRE">FOR HIRE</option>
                          <option value="YELLOW PLATE">YELLOW PLATE</option>
                          <option value="LALAMOVE">LALAMOVE</option>
                          <option value="EV/HYBRID">EV/HYBRID</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                        {errors.quotation_used && <p className="text-xs text-red-500 mt-1">{errors.quotation_used.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Usage *</label>
                        <select {...register('usage', { required: 'Usage is required' })} className={inputClass(errors.usage)}>
                          <option value="">Select Usage</option>
                          <option value="PRIVATE">PRIVATE</option>
                          <option value="TNVS USE">TNVS USE</option>
                          <option value="YELLOW PLATE">YELLOW PLATE</option>
                          <option value="FOR HIRE">FOR HIRE</option>
                          <option value="MOTORCYCLE PRIVATE">MOTORCYCLE PRIVATE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                        {errors.usage && <p className="text-xs text-red-500 mt-1">{errors.usage.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Assured Personal & Contact Info */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Assured Personal & Contact Information</h4>
                    
                    {/* Balanced Name & Contact Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Assured Full Name *</label>
                        <input
                          {...register('full_name', { required: 'Full name is required' })}
                          className={inputClass(errors.full_name)}
                          placeholder="Enter full name (First Middle Last Suffix)"
                        />
                        {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Email Address *</label>
                        <input
                          type="email"
                          {...register('email', {
                            required: 'Email is required',
                            pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' },
                          })}
                          className={inputClass(errors.email)}
                          placeholder="email@example.com"
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                      </div>

                      <div>
                        <label className={labelClass}>Contact No.# *</label>
                        <input
                          {...register('mobile', { required: 'Contact number is required' })}
                          className={inputClass(errors.mobile)}
                          placeholder="Mobile number"
                        />
                        {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Back Up No.#</label>
                        <input
                          {...register('backup_phone')}
                          className={inputClass()}
                          placeholder="Backup contact number"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>FB Link</label>
                        <input
                          {...register('fb_link')}
                          className={inputClass()}
                          placeholder="https://facebook.com/username"
                        />
                      </div>
                    </div>

                    {/* Address row */}
                    <div className="space-y-1">
                      <label className={labelClass}>Complete Address *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <MapPin className="w-4.5 h-4.5" />
                        </div>
                        <input
                          {...register('address_line_1', { required: 'Address is required' })}
                          className={`${inputClass(errors.address_line_1)} pl-10 text-slate-800 placeholder:text-slate-400 font-medium`}
                          placeholder="e.g. Unit 12B High Street Bldg., Brgy. Fort Bonifacio, Taguig City, Metro Manila 1634"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        Format: House/Unit No., Street Name, Barangay, City/Municipality, Province, Zip Code
                      </p>
                      {errors.address_line_1 && <p className="text-xs text-red-500 mt-1">{errors.address_line_1.message}</p>}
                    </div>
                  </div>

                  {/* Section 3: Vehicle Information */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Vehicle Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className={labelClass}>Year Model & Make *</label>
                        <input
                          {...register('unit', { required: 'Year Model & Make is required' })}
                          className={inputClass(errors.unit)}
                          placeholder="e.g. 2024 TOYOTA FORTUNER"
                        />
                        {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Chassis # *</label>
                        <input
                          {...register('chassis_no', { required: 'Chassis number is required' })}
                          className={inputClass(errors.chassis_no)}
                          placeholder="Enter chassis number"
                        />
                        {errors.chassis_no && <p className="text-xs text-red-500 mt-1">{errors.chassis_no.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Engine # *</label>
                        <input
                          {...register('engine_no', { required: 'Engine number is required' })}
                          className={inputClass(errors.engine_no)}
                          placeholder="Enter engine number"
                        />
                        {errors.engine_no && <p className="text-xs text-red-500 mt-1">{errors.engine_no.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Color *</label>
                        <input
                          {...register('color', { required: 'Color is required' })}
                          className={inputClass(errors.color)}
                          placeholder="e.g. Red, Pearl White"
                        />
                        {errors.color && <p className="text-xs text-red-500 mt-1">{errors.color.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Plate Number *</label>
                        <input
                          {...register('plate_no', { required: 'Plate number is required' })}
                          className={inputClass(errors.plate_no)}
                          placeholder="e.g. ABC1234 or MV File No."
                        />
                        {errors.plate_no && <p className="text-xs text-red-500 mt-1">{errors.plate_no.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Bank *</label>
                        <select {...register('mortgage', { required: 'Bank is required' })} className={inputClass(errors.mortgage)}>
                          <option value="">Select Bank</option>
                          <option value="TFSPH">TFSPH</option>
                          <option value="EASTWEST">EASTWEST</option>
                          <option value="MAYBANK">MAYBANK</option>
                          <option value="BPI">BPI</option>
                          <option value="BDO UNIBANK INC.">BDO UNIBANK INC.</option>
                          <option value="PS BANK">PS BANK</option>
                          <option value="SECURITY BANK">SECURITY BANK</option>
                          <option value="MALAYAN SAVINGS BANK">MALAYAN SAVINGS BANK</option>
                          <option value="METROBANK">METROBANK</option>
                          <option value="UCPB SAVINGS">UCPB SAVINGS</option>
                          <option value="LUZON DEVELOPMENT BANK">LUZON DEVELOPMENT BANK</option>
                          <option value="PHILIPPINE BANK OF COMMUNICATION (PBCOM)">PHILIPPINE BANK OF COMMUNICATION (PBCOM)</option>
                          <option value="RCBC">RCBC</option>
                          <option value="PHILIPPINE BUSINESS BANK (PBB)">PHILIPPINE BUSINESS BANK (PBB)</option>
                          <option value="SOUTH ASIALINK FINANCING CORP">SOUTH ASIALINK FINANCING CORP</option>
                          <option value="N/A">N/A</option>
                          <option value="ASIALINK">ASIALINK</option>
                          <option value="CHINA BANK SAVINGS">CHINA BANK SAVINGS</option>
                          <option value="CHINA BANK">CHINA BANK</option>
                          <option value="GLOBAL DOMINION FINANCING INC">GLOBAL DOMINION FINANCING INC</option>
                          <option value="LANDBANK">LANDBANK</option>
                          <option value="ORICO AUTO FINANCE PHILIPPINES">ORICO AUTO FINANCE PHILIPPINES</option>
                          <option value="BANK OF COMMERCE">BANK OF COMMERCE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                        {errors.mortgage && <p className="text-xs text-red-500 mt-1">{errors.mortgage.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Ownership *</label>
                        <select {...register('ownership', { required: 'Ownership status is required' })} className={inputClass(errors.ownership)}>
                          <option value="">Select Ownership</option>
                          <option value="1ST OWNER">1ST OWNER</option>
                          <option value="2ND OWNER">2ND OWNER</option>
                          <option value="3RD OWNER">3RD OWNER</option>
                          <option value="4TH OWNER">4TH OWNER</option>
                        </select>
                        {errors.ownership && <p className="text-xs text-red-500 mt-1">{errors.ownership.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Policy & Coverages */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Policy & Coverage details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Policy No.# *</label>
                        <input
                          {...register('policy_no', { required: 'Policy number is required' })}
                          className={inputClass(errors.policy_no)}
                          placeholder="e.g. MOP-123-1234-12"
                        />
                        {errors.policy_no && <p className="text-xs text-red-500 mt-1">{errors.policy_no.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Inception Date *</label>
                        <input
                          type="date"
                          {...register('inception_date', { required: 'Inception date is required' })}
                          className={inputClass(errors.inception_date)}
                        />
                        {errors.inception_date && <p className="text-xs text-red-500 mt-1">{errors.inception_date.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Expiry Date *</label>
                        <input
                          type="date"
                          {...register('expiry_date', { required: 'Expiry date is required' })}
                          className={inputClass(errors.expiry_date)}
                        />
                        {errors.expiry_date && <p className="text-xs text-red-500 mt-1">{errors.expiry_date.message}</p>}
                      </div>
                      
                      <div>
                        <label className={labelClass}>Own Damage Coverage (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('own_damage_coverage', { required: 'Own Damage Coverage is required' })}
                          className={inputClass(errors.own_damage_coverage)}
                        />
                        {errors.own_damage_coverage && <p className="text-xs text-red-500 mt-1">{errors.own_damage_coverage.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Acts of Nature Coverage (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('aog', { required: 'Acts of Nature Coverage is required' })}
                          className={inputClass(errors.aog)}
                        />
                        {errors.aog && <p className="text-xs text-red-500 mt-1">{errors.aog.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Bodily Injury (₱) *</label>
                        <input
                          type="number"
                          step="0.01;;"
                          {...register('bi_coverage', { required: 'Bodily Injury is required' })}
                          className={inputClass(errors.bi_coverage)}
                        />
                        {errors.bi_coverage && <p className="text-xs text-red-500 mt-1">{errors.bi_coverage.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Property Damage (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('pd_coverage', { required: 'Property Damage is required' })}
                          className={inputClass(errors.pd_coverage)}
                        />
                        {errors.pd_coverage && <p className="text-xs text-red-500 mt-1">{errors.pd_coverage.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Personal Accident (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('pa', { required: 'Personal Accident is required' })}
                          className={inputClass(errors.pa)}
                        />
                        {errors.pa && <p className="text-xs text-red-500 mt-1">{errors.pa.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Total Premium (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('policy_premium', { required: 'Total Premium is required' })}
                          className={inputClass(errors.policy_premium)}
                        />
                        {errors.policy_premium && <p className="text-xs text-red-500 mt-1">{errors.policy_premium.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Terms, Rates & Markup */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Terms, Rates & Markup</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className={labelClass}>Payment Terms *</label>
                        <select {...register('payment_terms', { required: 'Payment terms are required' })} className={inputClass(errors.payment_terms)}>
                          <option value="">Select Terms</option>
                          <option value="1">1 Month</option>
                          <option value="2">2 Months</option>
                          <option value="3">3 Months</option>
                          <option value="4">4 Months</option>
                          <option value="5">5 Months</option>
                          <option value="6">6 Months</option>
                        </select>
                        {errors.payment_terms && <p className="text-xs text-red-500 mt-1">{errors.payment_terms.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Agent's Mark Up / Comm (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('agent_markup', { required: 'Agent markup is required' })}
                          className={inputClass(errors.agent_markup)}
                        />
                        {errors.agent_markup && <p className="text-xs text-red-500 mt-1">{errors.agent_markup.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Sub-Agent's Mark Up (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('sub_agent_markup', { required: 'Sub-agent markup is required' })}
                          className={inputClass(errors.sub_agent_markup)}
                        />
                        {errors.sub_agent_markup && <p className="text-xs text-red-500 mt-1">{errors.sub_agent_markup.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Sub-Agent's Name</label>
                        <input
                          {...register('sub_agent_name')}
                          className={inputClass()}
                          placeholder="Sub-agent full name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Freebie *</label>
                        <select {...register('freebie', { required: 'Freebie field is required' })} className={inputClass(errors.freebie)}>
                          <option value="0">₱ 0 (None)</option>
                          <option value="1000">₱ 1,000</option>
                        </select>
                        {errors.freebie && <p className="text-xs text-red-500 mt-1">{errors.freebie.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Used Rate Type *</label>
                        <select {...register('used_rate_type', { required: 'Used rate type is required' })} className={inputClass(errors.used_rate_type)}>
                          <option value="">Select Rate Type</option>
                          <option value="REGULAR QUOTA RATE">REGULAR QUOTA RATE</option>
                          <option value="APPROVED RATE BY SIR JESS">APPROVED RATE BY SIR JESS</option>
                          <option value="PARTNER'S RATE">PARTNER'S RATE</option>
                          <option value="OLD CAR QUOTATION">OLD CAR QUOTATION</option>
                        </select>
                        {errors.used_rate_type && <p className="text-xs text-red-500 mt-1">{errors.used_rate_type.message}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Used Rate (Example: 1.30% - .10%) *</label>
                        <input
                          {...register('used_rate', { required: 'Used rate representation is required' })}
                          readOnly
                          disabled
                          className={`${inputClass(errors.used_rate)} bg-slate-100/80 cursor-not-allowed`}
                          placeholder="e.g. 1.30% - .10%"
                        />
                        {errors.used_rate && <p className="text-xs text-red-500 mt-1">{errors.used_rate.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Remarks / Notes</label>
                      <textarea
                        {...register('notes')}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] h-20"
                        placeholder="Any additional remarks..."
                      />
                    </div>
                  </div>

                  {/* Section 6: Delivery Details */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Delivery Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Receiver's Name *</label>
                        <input
                          {...register('receiver_name', { required: 'Receiver name is required' })}
                          className={inputClass(errors.receiver_name)}
                          placeholder="Receiver full name"
                        />
                        {errors.receiver_name && <p className="text-xs text-red-500 mt-1">{errors.receiver_name.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Delivery Address *</label>
                        <input
                          {...register('delivery_address', { required: 'Delivery address is required' })}
                          className={inputClass(errors.delivery_address)}
                          placeholder="Complete delivery address"
                        />
                        {errors.delivery_address && <p className="text-xs text-red-500 mt-1">{errors.delivery_address.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Landmark</label>
                        <input
                          {...register('landmark')}
                          className={inputClass(errors.landmark)}
                          placeholder="Nearby landmark description"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 7: File Uploads */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-2">Document Attachments</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                          ORCR / NDOS / 4 SIDES (Upload) <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                          orcrFile 
                            ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
                        }`}>
                          {orcrFile ? (
                            <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                              <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={orcrFile.name}>
                                {orcrFile.name}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                                {(orcrFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                              </span>
                              <button 
                                type="button" 
                                onClick={() => setOrcrFile(null)} 
                                className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                                title="Remove file"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                              <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                                <UploadCloud className="h-5 w-5" />
                              </div>
                              <span className="text-xs text-slate-700 font-bold">
                                Click to select file
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                Upload ORCR / NDOS / 4 Sides (max 10MB)
                              </span>
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) setOrcrFile(e.target.files[0]);
                                }} 
                                accept="image/*,application/pdf" 
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {isPartnerRate && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                            Ella Langrio Convo Screenshot (Upload) <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                            ellaScreenshotFile 
                              ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
                          }`}>
                            {ellaScreenshotFile ? (
                              <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                                <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={ellaScreenshotFile.name}>
                                  {ellaScreenshotFile.name}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                                  {(ellaScreenshotFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                                </span>
                                <button 
                                  type="button" 
                                  onClick={() => setEllaScreenshotFile(null)} 
                                  className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                                  title="Remove file"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                                  <UploadCloud className="h-5 w-5" />
                                </div>
                                <span className="text-xs text-slate-700 font-bold">
                                  Click to select file
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  Upload Convo Screenshot (max 10MB)
                                </span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) setEllaScreenshotFile(e.target.files[0]);
                                  }} 
                                  accept="image/*,application/pdf" 
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(watch('ownership') || '') && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                            Deed of Sale / NDOS (Upload) <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                            deedOfSaleFile 
                              ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
                          }`}>
                            {deedOfSaleFile ? (
                              <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                                <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={deedOfSaleFile.name}>
                                  {deedOfSaleFile.name}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                                  {(deedOfSaleFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                                </span>
                                <button 
                                  type="button" 
                                  onClick={() => setDeedOfSaleFile(null)} 
                                  className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                                  title="Remove file"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                                  <UploadCloud className="h-5 w-5" />
                                </div>
                                <span className="text-xs text-slate-700 font-bold">
                                  Click to select file
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  Upload Deed of Sale / NDOS (max 10MB)
                                </span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) setDeedOfSaleFile(e.target.files[0]);
                                  }} 
                                  accept="image/*,application/pdf" 
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {['5', '6'].includes(String(watch('payment_terms') || '')) && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 mb-2">
                            Term Approval Attachment (Upload) <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 p-4 ${
                            termApprovalFile 
                              ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60 shadow-sm shadow-emerald-100/50' 
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400/80 hover:shadow-sm'
                          }`}>
                            {termApprovalFile ? (
                              <div className="flex flex-col items-center justify-center space-y-1 w-full max-w-[90%] text-center">
                                <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-xs text-emerald-900 font-bold truncate max-w-full" title={termApprovalFile.name}>
                                  {termApprovalFile.name}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase font-mono">
                                  {(termApprovalFile.size / 1024 / 1024).toFixed(2)} MB • Ready
                                </span>
                                <button 
                                  type="button" 
                                  onClick={() => setTermApprovalFile(null)} 
                                  className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-slate-200/50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                                  title="Remove file"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                <div className="h-9 w-9 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center shadow-sm mb-1.5 transition-colors hover:border-slate-300">
                                  <UploadCloud className="h-5 w-5" />
                                </div>
                                <span className="text-xs text-slate-700 font-bold">
                                  Click to select file
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  Upload Term Approval (max 10MB)
                                </span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) setTermApprovalFile(e.target.files[0]);
                                  }} 
                                  accept="image/*,application/pdf" 
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'payment' && (
                <div className="space-y-4 flex-1">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Payment History</h4>
                  {isLoadingPayments ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#4A0E17]" />
                    </div>
                  ) : !customerPaymentsRes?.data?.data || customerPaymentsRes.data.data.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                      No payment transactions recorded for this record.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <table className="min-w-full divide-y divide-slate-200/85 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Payment No.</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Method</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/85 bg-white">
                          {customerPaymentsRes.data.data.map((p) => (
                            <tr key={p.id}>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{p.payment_number}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-650 capitalize">{p.payment_method?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2.5 text-slate-500">{formatDate(p.payment_date)}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{formatCurrency(p.amount)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                                  p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                                  p.status === 'voided' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' :
                                  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeFormTab === 'claims' && (
                <div className="space-y-4 flex-1">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Claims Record</h4>
                  {isLoadingClaims ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#4A0E17]" />
                    </div>
                  ) : !customerClaimsRes?.data?.data || customerClaimsRes.data.data.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                      No claims filed against this policy.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <table className="min-w-full divide-y divide-slate-200/85 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Claim No.</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Incident Date</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/85 bg-white">
                          {customerClaimsRes.data.data.map((c) => (
                            <tr key={c.id}>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{c.claim_number}</td>
                              <td className="px-4 py-2.5 text-slate-500">{formatDate(c.incident_date)}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{formatCurrency(c.claim_amount)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                                  c.status === 'settled' || c.status === 'approved' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                                  c.status === 'denied' || c.status === 'closed' ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-650/20' :
                                  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                }`}>
                                  {c.status?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={c.adjuster_remarks || c.incident_description}>
                                {c.adjuster_remarks || c.incident_description || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Form Footer */}
              <div className="bg-slate-50 px-6 py-4 -mx-6 -mb-6 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
                {activeFormTab === 'info' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {formEditTarget ? 'Update Record' : 'Create Record'}
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#4A0E17] hover:bg-[#3D0B12] rounded-xl transition"
                  >
                    Close Window
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Record"
        message={`Are you sure you want to delete the transaction record ${deleteTarget?.record_no}?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
