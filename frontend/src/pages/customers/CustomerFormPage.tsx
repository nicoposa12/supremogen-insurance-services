import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getCustomer, createCustomer, updateCustomer } from '../../services/customerApi';
import type { CustomerFormData } from '../../types/CustomerTypes';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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

  // ─── Fetch for Edit Mode ────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(Number(id)),
    enabled: isEdit,
  });

  // Populate form when editing
  useEffect(() => {
    if (existing?.data) {
      const c = existing.data;
      reset({
        first_name: c.first_name,
        last_name: c.last_name,
        middle_name: c.middle_name ?? '',
        suffix: c.suffix ?? '',
        date_of_birth: c.date_of_birth?.split('T')[0] ?? '',
        gender: c.gender ?? '',
        email: c.email,
        phone: c.phone ?? '',
        mobile: c.mobile ?? '',
        address_line_1: c.address_line_1 ?? '',
        address_line_2: c.address_line_2 ?? '',
        city: c.city ?? '',
        province: c.province ?? '',
        zip_code: c.zip_code ?? '',
        customer_type: c.customer_type,
        company_name: c.company_name ?? '',
        tin: c.tin ?? '',
        status: c.status,
        notes: c.notes ?? '',
        
        // Transaction fields
        plate_no: c.plate_no ?? '',
        unit: c.unit ?? '',
        mortgage: c.mortgage ?? '',
        agent: c.agent ?? '',
        insurance_provider: c.insurance_provider ?? '',
        policy_status: c.policy_status ?? 'ACTIVE',
        policy_no: c.policy_no ?? '',
        
        // Financial
        assured_value: c.assured_value ?? 0,
        gross_premium: c.gross_premium ?? 0,
        policy_premium: c.policy_premium ?? 0,
        discount: c.discount ?? 0,
        bi_pd: c.bi_pd ?? 0,
        pa: c.pa ?? 0,
        aog: c.aog ?? 0,
        policy_rate: c.policy_rate ?? 0,
        discount_rate: c.discount_rate ?? 0,
        
        // Dates
        writing_date: c.writing_date?.split('T')[0] ?? '',
        date_issued: c.date_issued?.split('T')[0] ?? '',
        inception_date: c.inception_date?.split('T')[0] ?? '',
        expiry_date: c.expiry_date?.split('T')[0] ?? '',
        delivery_date: c.delivery_date?.split('T')[0] ?? '',
        date_delivered: c.date_delivered?.split('T')[0] ?? '',
      });
    }
  }, [existing, reset]);

  // ─── Mutations ──────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Record created successfully.');
      navigate('/dashboard/customers');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Failed to create record.';
      showToast(msg, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CustomerFormData) => updateCustomer(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      showToast('Record updated successfully.');
      navigate('/dashboard/customers');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Failed to update record.';
      showToast(msg, 'error');
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
      </div>
    );
  }

  const inputClass = (error?: any) =>
    `w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-700 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] ${
      error ? 'border-red-400' : 'border-slate-200'
    }`;

  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isEdit ? 'Edit Transaction Record' : 'Create New Record'}
          </h1>
          <p className="text-sm text-slate-500">
            {isEdit ? 'Update transaction details' : 'Register a new transaction and customer profile'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Customer Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Customer Information</h3>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Vehicle Information</h3>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Policy Information</h3>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Financial Details</h3>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Dates</h3>
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


        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? 'Update Record' : 'Create Record'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
