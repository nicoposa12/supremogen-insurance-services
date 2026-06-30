import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Filter,
  Users,
  FileText,
  X,
  Save,
  Loader2,
} from 'lucide-react';

import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getCustomers, deleteCustomer, createCustomer, updateCustomer } from '../../services/customerApi';
import type { Customer, CustomerListParams, CustomerFormData } from '../../types/CustomerTypes';
import AttachmentPanel from '../../components/ui/AttachmentPanel';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  const isAgent = roles.includes('Sales Agent');
  const isAdmin = roles.includes('Administrator');
  const isAccounting = roles.includes('Accounting Officer');
  const cannotEdit = isAgent || isAdmin || isAccounting;

  // ─── Filters / Sort / Pagination ─────
  const [params, setParams] = useState<CustomerListParams>({
    page: 1,
    per_page: 15,
    search: '',
    status: 'all',
    type: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  
  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'payment' | 'claims' | 'documents'>('info');
  
  // Form Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEditTarget, setFormEditTarget] = useState<Customer | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'payment' | 'claims'>('info');

  // ─── React Hook Form ─────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    defaultValues: {
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
    },
  });

  // Reset form when opening/closing or changing edit target
  useEffect(() => {
    if (isFormOpen) {
      setActiveFormTab('info');
      if (formEditTarget) {
        reset({
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
        });
      } else {
        reset({
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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Transaction record updated successfully.');
      setIsFormOpen(false);
      // If the currently viewed customer details modal is open, refresh its data
      if (selectedCustomer && selectedCustomer.id === formEditTarget?.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, ...updateMutation.data?.data } : null));
        // Simple way is to just close the view modal and let user reopen
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
    if (formEditTarget) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const getRecordStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase">
            INSURED
          </span>
        );
      case 'blacklisted':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 uppercase">
            INSURED WITH BALANCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-500/20 uppercase">
            DRAFT
          </span>
        );
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
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
          {idx + 1 + (params.page - 1) * params.per_page}
        </span>
      ),
    },
    {
      key: 'view',
      label: 'VIEW',
      className: 'text-center w-12',
      render: (row: Customer) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCustomer(row);
            setActiveModalTab('info');
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center mx-auto"
          title="View Transaction Details"
        >
          <FileText className="h-4 w-4 text-[#4A0E17]" />
        </button>
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
        <span className="font-medium text-slate-800">
          {row.first_name} {row.last_name}
        </span>
      ),
    },
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
      key: 'status',
      label: 'Record Status',
      sortable: true,
      render: (row: Customer) => getRecordStatusBadge(row.status),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row: Customer) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFormEditTarget(row);
              setIsFormOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
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
        </div>
      ),
    },
  ].filter((col) => !(cannotEdit && col.key === 'actions'));

  const statusFilters = ['all', 'active', 'inactive', 'blacklisted'];

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
        {!cannotEdit && (
          <button
            onClick={() => {
              setFormEditTarget(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Create New Record
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, record number, plate number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase">Status:</span>
            <div className="flex gap-1">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setParams((p) => ({ ...p, status: s, page: 1 }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                    params.status === s
                      ? 'bg-[#4A0E17] text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'active' ? 'Insured' : s === 'blacklisted' ? 'Insured with Balance' : s}
                </button>
              ))}
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
            description="Try adjusting your search or filters, or create a new record."
            action={
              !cannotEdit ? (
                <button
                  onClick={() => {
                    setFormEditTarget(null);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] text-white text-sm font-medium rounded-xl hover:bg-[#3D0B12] transition"
                >
                  <UserPlus className="h-4 w-4" />
                  Create New Record
                </button>
              ) : undefined
            }
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
              {activeModalTab === 'info' && (
                <div className="space-y-6">
                  {/* Record No & Status Row */}
                  <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                    <div>
                      <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Record No.</span>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono font-bold text-[#4A0E17] text-sm shadow-sm">
                        {selectedCustomer.record_no || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Status</span>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-[#4A0E17] text-sm shadow-sm uppercase">
                        {selectedCustomer.status === 'inactive' ? 'DRAFT' : selectedCustomer.status === 'blacklisted' ? 'INSURED WITH BALANCE' : 'INSURED'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Customer Information */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Customer Information</h4>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                          <span className="text-slate-500 font-semibold text-xs">Client's Name</span>
                          <span className="col-span-2 text-slate-800 font-bold uppercase">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                          
                          <span className="text-slate-500 font-semibold text-xs">Contact No</span>
                          <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.mobile || selectedCustomer.phone || '—'}</span>
                          
                          <span className="text-slate-500 font-semibold text-xs">Email</span>
                          <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.email}</span>
                        </div>
                      </div>

                      {/* Policy Information */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Policy Information</h4>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                          <span className="text-slate-500 font-semibold text-xs">Agent</span>
                          <span className="col-span-2 text-slate-800 font-bold">{selectedCustomer.agent || '—'}</span>

                          <span className="text-slate-500 font-semibold text-xs">Insurance Provider</span>
                          <span className="col-span-2 text-slate-800 font-medium capitalize">{selectedCustomer.insurance_provider || '—'}</span>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Financial Details</h4>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                          <span className="text-slate-500 font-semibold text-xs">Assured Value</span>
                          <span className="col-span-2 text-[#4A0E17] font-bold">{formatCurrency(selectedCustomer.assured_value)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Gross Premium</span>
                          <span className="col-span-2 text-slate-800 font-semibold">{formatCurrency(selectedCustomer.gross_premium)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Policy Premium</span>
                          <span className="col-span-2 text-slate-800 font-semibold">{formatCurrency(selectedCustomer.policy_premium)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Discount</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatCurrency(selectedCustomer.discount)}</span>

                          <span className="text-slate-500 font-semibold text-xs">BI / PD</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatCurrency(selectedCustomer.bi_pd)}</span>

                          <span className="text-slate-500 font-semibold text-xs">PA</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatCurrency(selectedCustomer.pa)}</span>

                          <span className="text-slate-500 font-semibold text-xs">AOG</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatCurrency(selectedCustomer.aog)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Policy Rate</span>
                          <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.policy_rate ? `${selectedCustomer.policy_rate}%` : '—'}</span>

                          <span className="text-slate-500 font-semibold text-xs">Discount Rate</span>
                          <span className="col-span-2 text-slate-800 font-medium">{selectedCustomer.discount_rate ? `${selectedCustomer.discount_rate}%` : '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Vehicle Information */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Vehicle Information</h4>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                          <span className="text-slate-500 font-semibold text-xs">Plate No</span>
                          <span className="col-span-2 text-slate-800 font-mono font-bold uppercase">{selectedCustomer.plate_no || '—'}</span>

                          <span className="text-slate-500 font-semibold text-xs">Unit</span>
                          <span className="col-span-2 text-slate-800 font-bold uppercase">{selectedCustomer.unit || '—'}</span>

                          <span className="text-slate-500 font-semibold text-xs">Mortgage</span>
                          <span className="col-span-2 text-slate-800 font-medium capitalize">{selectedCustomer.mortgage || '—'}</span>
                        </div>
                      </div>

                      {/* Policy Status */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Policy Status</h4>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                          <span className="text-slate-500 font-semibold text-xs">Status</span>
                          <span className="col-span-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${
                              selectedCustomer.policy_status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                                : 'bg-slate-50 text-slate-600 ring-slate-500/20'
                            }`}>
                              {selectedCustomer.policy_status || 'INACTIVE'}
                            </span>
                          </span>

                          <span className="text-slate-500 font-semibold text-xs">Policy No</span>
                          <span className="col-span-2 text-slate-800 font-mono font-medium">{selectedCustomer.policy_no || '—'}</span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-100 pb-1.5">Dates</h4>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                          <span className="text-slate-500 font-semibold text-xs">Writing Date</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatDate(selectedCustomer.writing_date)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Date Issued</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatDate(selectedCustomer.date_issued)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Inception Date</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatDate(selectedCustomer.inception_date)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Expiry Date</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatDate(selectedCustomer.expiry_date)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Delivery Date</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatDate(selectedCustomer.delivery_date)}</span>

                          <span className="text-slate-500 font-semibold text-xs">Date Delivered</span>
                          <span className="col-span-2 text-slate-800 font-medium">{formatDate(selectedCustomer.date_delivered)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'payment' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Payment History</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                    No payment transactions recorded for this record.
                  </div>
                </div>
              )}

              {activeModalTab === 'claims' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Claims Record</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                    No claims filed against this policy.
                  </div>
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
            <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {activeFormTab === 'info' && (
                <div className="space-y-6 flex-1">
                  {/* Record No & Status Row */}
                  <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-200/60">
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
                          <option value="active">INSURED</option>
                          <option value="blacklisted">INSURED WITH BALANCE</option>
                        </select>
                      ) : (
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-[#4A0E17] text-sm shadow-sm uppercase">
                          DRAFT
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-200/50 p-4 space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>First Name *</label>
                        <input
                          {...register('first_name', { required: 'First name is required' })}
                          className={inputClass(errors.first_name)}
                          placeholder="First name"
                        />
                        {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Last Name *</label>
                        <input
                          {...register('last_name', { required: 'Last name is required' })}
                          className={inputClass(errors.last_name)}
                          placeholder="Last name"
                        />
                        {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Middle Name</label>
                        <input
                          {...register('middle_name')}
                          className={inputClass()}
                          placeholder="Middle name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Suffix</label>
                        <input
                          {...register('suffix')}
                          className={inputClass()}
                          placeholder="Jr., Sr., III"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Date of Birth</label>
                        <input
                          type="date"
                          {...register('date_of_birth')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Gender</label>
                        <select {...register('gender')} className={inputClass()}>
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-200/50 p-4 space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
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
                        <label className={labelClass}>Phone</label>
                        <input
                          {...register('phone')}
                          className={inputClass()}
                          placeholder="Landline"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Mobile</label>
                        <input
                          {...register('mobile')}
                          className={inputClass()}
                          placeholder="Mobile number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-200/50 p-4 space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Vehicle Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Plate No</label>
                        <input
                          {...register('plate_no')}
                          className={inputClass()}
                          placeholder="e.g. NCB8050"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Unit</label>
                        <input
                          {...register('unit')}
                          className={inputClass()}
                          placeholder="e.g. TOYOTA VIOS"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Mortgage</label>
                        <input
                          {...register('mortgage')}
                          className={inputClass()}
                          placeholder="e.g. BDO UNIBANK"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Policy Information */}
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-200/50 p-4 space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Policy Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Agent</label>
                        <input
                          {...register('agent')}
                          className={inputClass()}
                          placeholder="Agent name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Insurance Provider</label>
                        <input
                          {...register('insurance_provider')}
                          className={inputClass()}
                          placeholder="Insurance company"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Policy Status</label>
                        <select {...register('policy_status')} className={inputClass()}>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Policy No</label>
                        <input
                          {...register('policy_no')}
                          className={inputClass()}
                          placeholder="e.g. MOP-123-1234-1202"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-200/50 p-4 space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Financial Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Assured Value (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('assured_value')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Gross Premium (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('gross_premium')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Policy Premium (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('policy_premium')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Discount (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('discount')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>BI / PD (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('bi_pd')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>PA (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('pa')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>AOG (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('aog')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Policy Rate (%)</label>
                        <input
                          type="number"
                          step="0.0001"
                          {...register('policy_rate')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Discount Rate (%)</label>
                        <input
                          type="number"
                          step="0.0001"
                          {...register('discount_rate')}
                          className={inputClass()}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-200/50 p-4 space-y-4">
                    <h4 className="font-bold text-xs text-[#4A0E17] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">Dates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Writing Date</label>
                        <input
                          type="date"
                          {...register('writing_date')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Date Issued</label>
                        <input
                          type="date"
                          {...register('date_issued')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Inception Date</label>
                        <input
                          type="date"
                          {...register('inception_date')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Expiry Date</label>
                        <input
                          type="date"
                          {...register('expiry_date')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Delivery Date</label>
                        <input
                          type="date"
                          {...register('delivery_date')}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Date Delivered</label>
                        <input
                          type="date"
                          {...register('date_delivered')}
                          className={inputClass()}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'payment' && (
                <div className="space-y-4 flex-1">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Payment History</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                    No payment transactions recorded for this record.
                  </div>
                </div>
              )}

              {activeFormTab === 'claims' && (
                <div className="space-y-4 flex-1">
                  <h4 className="font-bold text-sm text-[#4A0E17]">Claims Record</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden p-6 text-center text-slate-500 text-xs">
                    No claims filed against this policy.
                  </div>
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
