import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, UploadCloud, MapPin } from 'lucide-react';

import { useToast } from '../../components/ui/Toast';
import { getCustomer, createCustomer, updateCustomer } from '../../services/customerApi';
import { uploadAttachment } from '../../services/attachmentApi';
import type { CustomerFormData } from '../../types/CustomerTypes';
import { parseFullName } from './CustomersPage';
import { useAuth } from '../../context/AuthContext';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, roles = [] } = useAuth();

  // File Upload states
  const [orcrFile, setOrcrFile] = useState<File | null>(null);
  const [ellaScreenshotFile, setEllaScreenshotFile] = useState<File | null>(null);
  const [deedOfSaleFile, setDeedOfSaleFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  const isSalesOrRenewal = roles?.some((r) => r === 'Sales Agent' || r === 'Team Renewal');
  const isUnderwriterOrAdmin = roles?.some((r) => r === 'Underwriter' || r === 'Admin' || r === 'Super Admin');
  const canEditPolicyNo = isUnderwriterOrAdmin || !isSalesOrRenewal;

  // ─── Fetch for Edit Mode ────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(Number(id)),
    enabled: isEdit,
  });

  // Set default request type based on user role when creating
  useEffect(() => {
    if (!isEdit && roles) {
      if (roles.includes('Sales Agent')) {
        setValue('request_type', 'NEW ACCOUNT');
      } else if (roles.includes('Team Renewal')) {
        setValue('request_type', 'RENEWAL CLIENT');
      }
    }
  }, [isEdit, roles, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (existing?.data) {
      const c = existing.data;
      const nameParts = [c.first_name, c.middle_name, c.last_name, c.suffix].filter(Boolean).join(' ');
      reset({
        full_name: nameParts,
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
        customer_type: c.customer_type ?? 'individual',
        company_name: c.company_name ?? '',
        tin: c.tin ?? '',
        status: c.status ?? 'active',
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
        
        request_type: c.request_type ?? '',
        activity: c.activity ?? '',
        quotation_used: c.quotation_used ?? '',
        usage: c.usage ?? '',
        chassis_no: c.chassis_no ?? '',
        engine_no: c.engine_no ?? '',
        color: c.color ?? '',
        ownership: c.ownership ?? '',
        own_damage_coverage: c.own_damage_coverage ?? 0,
        bi_coverage: c.bi_coverage ?? 0,
        pd_coverage: c.pd_coverage ?? 0,
        payment_terms: c.payment_terms ?? '',
        agent_markup: c.agent_markup ?? 0,
        sub_agent_markup: c.sub_agent_markup ?? 0,
        sub_agent_name: c.sub_agent_name ?? '',
        freebie: c.freebie ?? 0,
        receiver_name: c.receiver_name ?? '',
        delivery_address: c.delivery_address ?? '',
        landmark: c.landmark ?? '',
        backup_phone: c.backup_phone ?? '',
        fb_link: c.fb_link ?? '',
        used_rate_type: c.used_rate_type ?? '',
        used_rate: c.used_rate ?? '',
      });
    }
  }, [existing, reset]);

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
    setOrcrFile(null);
    setEllaScreenshotFile(null);
    setDeedOfSaleFile(null);
  };

  // ─── Mutations ──────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) => createCustomer(data),
    onSuccess: async (res) => {
      if (res.data?.id) {
        await uploadFormFiles(res.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Record created successfully.');
      navigate('/dashboard/customers');
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
    mutationFn: (data: CustomerFormData) => updateCustomer(Number(id), data),
    onSuccess: async () => {
      await uploadFormFiles(Number(id));
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      showToast('Record updated successfully.');
      navigate('/dashboard/customers');
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const msg = errors 
        ? Object.values(errors).flat().join(' ') 
        : (err.response?.data?.message ?? 'Failed to update record.');
      showToast(msg, 'error');
    },
  });

  const onSubmit = (data: CustomerFormData) => {
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

    if (!isEdit && (!orcrFile || (isPartnerRate && !ellaScreenshotFile))) {
      showToast(isPartnerRate ? 'Please upload all required attachments (ORCR and Ella Langrio Screenshot).' : 'Please upload required ORCR attachment.', 'error');
      return;
    }

    const ownershipValue = watch('ownership');
    const needsDeedOfSale = ['2ND OWNER', '3RD OWNER', '4TH OWNER'].includes(ownershipValue || '');
    if (needsDeedOfSale && !deedOfSaleFile && !isEdit) {
      showToast('Please upload Deed of Sale / NDOS for 2nd-4th owners.', 'error');
      return;
    }

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

        {/* Section 1: Request & Activity Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Request & Activity Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className={labelClass}>Date Request *</label>
              <input
                type="date"
                {...register('writing_date', { required: 'Date request is required' })}
                className={inputClass(errors.writing_date)}
              />
              {errors.writing_date && <p className="text-xs text-red-500 mt-1">{errors.writing_date.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <select 
                {...register('request_type', { required: 'Request type is required' })} 
                className={inputClass(errors.request_type)}
              >
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Assured Personal & Contact Information</h3>
          
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
        </div>

        {/* Section 3: Assured Address */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#8B1D2C]" />
            Assured Address
          </h3>
          <div>
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
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              Format: House/Unit No., Street Name, Barangay, City/Municipality, Province, Zip Code
            </p>
            {errors.address_line_1 && <p className="text-xs text-red-500 mt-1">{errors.address_line_1.message}</p>}
          </div>
        </div>

        {/* Section 4: Vehicle Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Vehicle Information</h3>
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

        {/* Section 5: Policy & Coverages */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Policy & Coverage details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Policy No.# {canEditPolicyNo ? '*' : ''}</label>
              <input
                {...register('policy_no', { required: canEditPolicyNo ? 'Policy number is required' : false })}
                readOnly={!canEditPolicyNo}
                disabled={!canEditPolicyNo}
                className={`${inputClass(errors.policy_no)} ${!canEditPolicyNo ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed' : ''}`}
                placeholder={canEditPolicyNo ? 'e.g. MOP-123-1234-12' : 'To be assigned by Underwriter'}
              />
              {canEditPolicyNo && errors.policy_no && <p className="text-xs text-red-500 mt-1">{errors.policy_no.message}</p>}
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
                step="0.01"
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

        {/* Section 6: Terms, Rates & Markup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Terms, Rates & Markup</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Payment Terms *</label>
              <select {...register('payment_terms', { required: 'Payment terms are required' })} className={inputClass(errors.payment_terms)}>
                <option value="">Select Terms</option>
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="4">4 Months</option>
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
                className={inputClass(errors.used_rate)}
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

        {/* Section 7: Delivery Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Delivery Details</h3>
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

        {/* Section 8: File Uploads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#4A0E17] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Document Attachments</h3>
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
