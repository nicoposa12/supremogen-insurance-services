import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Eye, CheckCircle2, Filter, Loader2, X,
  Send, FileText, Phone, Mail, Car, Shield, Calendar,
  AlertTriangle, User, ChevronLeft, Printer, RotateCcw, ChevronDown,
  Paperclip, Download, Edit,
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
  completeClaimNotificationRequirements,
  returnClaimNotification,
  getClaimNotification,
  updateClaimNotification,
  sendEmailToInsuranceProvider,
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

const PROVIDER_EMAILS: Record<string, { to: string[]; cc: string[] }> = {
  'CBIC': {
    to: [
      'roselyncbic@gmail.com',
      'enricomendoza8971@yahoo.com',
      'dave.cbic@gmail.com',
      'claims@countrybankers.com',
      'jcdeguzman.cbic@gmail.com',
      'casurban@yahoo.com'
    ],
    cc: [
      'catalankarlamaysalestl@gmail.com',
      'jccristobal@supremogen.com',
      'jmozar.supremogen@gmail.com'
    ]
  },
  'METROPOLITAN': {
    to: [
      'claims@miciph.com',
      'mcamtan@miciph.com',
      'csantos@miciph.com'
    ],
    cc: [
      'catalankarlamaysalestl@gmail.com',
      'jccristobal@supremogen.com',
      'jmozar.supremogen@gmail.com'
    ]
  },
  'BETHEL': {
    to: [
      'jfvanguardia@bethelgen.com',
      'dbendozo@bethelgen.com',
      'rsvelasquez@bethelgen.com'
    ],
    cc: [
      'catalankarlamaysalestl@gmail.com',
      'jccristobal@supremogen.com',
      'jmozar.supremogen@gmail.com'
    ]
  },
  'MILESTONE': {
    to: [
      'lowella.nipales@milestoneguaranty.com',
      'Jvillanueva@milestoneguaranty.com',
      'jesus.salcedo@milestoneguaranty.com'
    ],
    cc: [
      'catalankarlamaysalestl@gmail.com',
      'jccristobal@supremogen.com',
      'jmozar.supremogen@gmail.com'
    ]
  },
  'ALPHA': {
    to: [
      'nicoposa8@gmail.com'
    ],
    cc: []
  },
  'PHILIPPINE BRITISH': {
    to: [
      'catalankarlamaysalestl@gmail.com',
      'sales@supremogen.com'
    ],
    cc: [
      'jccristobal@supremogen.com'
    ]
  }
};

const getProviderConfig = (providerName: string): { to: string[]; cc: string[] } => {
  const norm = (providerName || '').toUpperCase();
  if (norm.includes('CBIC')) return PROVIDER_EMAILS['CBIC'];
  if (norm.includes('METROPOLITAN')) return PROVIDER_EMAILS['METROPOLITAN'];
  if (norm.includes('BETHEL')) return PROVIDER_EMAILS['BETHEL'];
  if (norm.includes('MILESTONE')) return PROVIDER_EMAILS['MILESTONE'];
  if (norm.includes('ALPHA')) return PROVIDER_EMAILS['ALPHA'];
  if (norm.includes('PHILIPPINE BRITISH') || norm.includes('BRITISH')) return PROVIDER_EMAILS['PHILIPPINE BRITISH'];
  return { to: [], cc: [] };
};

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

const ACT_OF_NATURE_REQUIREMENTS = [
  { key: 'aon_1', label: '1. Original Police Report OR Notarized Affidavit' },
  { key: 'aon_2', label: '2. Readable copy of ORCR' },
  { key: 'aon_3', label: '3. Clear copy of Drivers license (Back and Front) with copy of OR' },
  { key: 'aon_4', label: '4. Clear Pictures of Damages of the vehicle' },
  { key: 'aon_5', label: '5. (4 Sides) Clear Pictures of the Vehicle Isometric View' },
  { key: 'aon_6', label: '6. Repair Estimate with Contact number' },
  { key: 'aon_7', label: '7. Barangay certificate proof na nagkaroon ng baha or etc.' },
];

const THEFT_AND_LOSS_REQUIREMENTS = [
  { key: 'tal_1', label: '1. Original Police Report OR Notarized Affidavit' },
  { key: 'tal_2', label: '2. Readable copy of ORCR' },
  { key: 'tal_3', label: '3. Clear copy of Drivers license (Back and Front) with copy of OR' },
  { key: 'tal_4', label: '4. Clear Pictures of Damages of the vehicle' },
  { key: 'tal_5', label: '5. (4 Sides) Clear Pictures of the Vehicle Isometric View' },
  { key: 'tal_6', label: '6. Repair Estimate with Contact number' },
  { key: 'tal_7', label: '7. CCTV or proof na ninakaw' },
];

const CNC_REQUIREMENTS = [
  { key: 'cnc_1', label: '1. READABLE ORCR of both parties.' },
  { key: 'cnc_2', label: '2. READABLE DRIVERS LICENSE of both parties. (FRONT & BACK).' },
  { key: 'cnc_3', label: '3. Pictures of vehicle showing plate no and damages parts' },
  { key: 'cnc_4', label: '4. Affidavit or Police Report.' },
];

const COMPLETED_REQUIREMENTS = [
  { key: 'comp_1', label: 'EVALUATION LETTER' },
  { key: 'comp_2', label: 'LOA' },
  { key: 'comp_3', label: 'OFFER LETTER' },
  { key: 'comp_4', label: 'DENIED CLAIM' },
];

interface CustomAttachmentInput {
  id: string;
  label: string;
  file: File | null;
  note: string;
}

interface ClaimNotificationsPageProps {
  completedOnly?: boolean;
}

export default function ClaimNotificationsPage({ completedOnly = false }: ClaimNotificationsPageProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles, user, token } = useAuth();
  const isClaimsOfficer = roles.some((r: string) =>
    ['Claims Officer', 'Administrator', 'Owner', 'Super Admin'].includes(r)
  );
  const isAdmin = roles.some((r: string) =>
    ['Administrator', 'Owner', 'Super Admin'].includes(r)
  );
  const canSubmit = roles.includes('Sales Agent') || roles.includes('Team Renewal') || isAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';

  // ─── List State ─────────────────────────────
  const [params, setParams] = useState<ClaimNotificationListParams>({
    page: Number(searchParams.get('page')) || 1,
    per_page: 15,
    search: querySearch,
    status: completedOnly ? 'completed' : (searchParams.get('status') || 'all'),
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
  const [paymentStatus, setPaymentStatus] = useState('');
  const [requirementFiles, setRequirementFiles] = useState<Record<string, File[]>>({});
  const [requirementNotes, setRequirementNotes] = useState<Record<string, string>>({});
  const [customAttachments, setCustomAttachments] = useState<CustomAttachmentInput[]>([]);
  const [viewAttachment, setViewAttachment] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClaimNotification | null>(null);

  // Email Dispatch Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalProvider, setEmailModalProvider] = useState('');
  const [availableTo, setAvailableTo] = useState<string[]>([]);
  const [availableCc, setAvailableCc] = useState<string[]>([]);
  const [selectedTo, setSelectedTo] = useState<string[]>([]);
  const [selectedCc, setSelectedCc] = useState<string[]>([]);

  // Listen to Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEmailModalOpen(false);
        setReturnTarget(null);
        setAcknowledgeTarget(null);
        setViewAttachment(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to determine claim type from nature_of_claims on edit
  const determineClaimType = (nature: string | undefined): string => {
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
    if (upper.includes('ACT OF NATURE CLAIM') || upper.includes('[ACT OF NATURE CLAIM]')) {
      return 'ACT OF NATURE';
    }
    if (upper.includes('THEFT AND LOSS CLAIM') || upper.includes('[THEFT AND LOSS CLAIM]')) {
      return 'THEFT AND LOSS';
    }
    if (upper.includes('CNC (CERTIFICATE OF NO CLAIM)') || upper.includes('[CNC (CERTIFICATE OF NO CLAIM)]')) {
      return 'CNC (CERTIFICATE OF NO CLAIM)';
    }
    return '';
  };

  const parsePaymentStatus = (nature: string | undefined): string => {
    if (!nature) return '';
    if (nature.includes('NOT YET PAID TO SUPREMO')) return 'NOT YET PAID TO SUPREMO';
    if (nature.includes('FULLY PAID')) return 'FULLY PAID';
    return '';
  };

  const getClaimTypePrefix = (type: string): string => {
    switch (type) {
      case 'OWN DAMAGE':
        return '[OWN DAMAGE CLAIM REQUIREMENTS]\n\n';
      case 'OWN DAMAGE & TTPD':
        return '[OWN DAMAGE CLAIM REQUIREMENTS & THIRD PARTY (TTPD) CLAIM - REQUIREMENTS]\n\n';
      case 'TPPD':
        return '[THIRD PARTY (TTPD) CLAIM - REQUIREMENTS]\n\n';
      case 'ACT OF NATURE':
        return '[ACT OF NATURE CLAIM]\n\n';
      case 'THEFT AND LOSS':
        return '[THEFT AND LOSS CLAIM]\n\n';
      case 'CNC (CERTIFICATE OF NO CLAIM)':
        return '[CNC (CERTIFICATE OF NO CLAIM)]\n\n';
      default:
        return '';
    }
  };

  const stripRequirementsPrefix = (text: string | undefined): string => {
    if (!text) return '';

    // 1. Clean up new bracketed headers
    const bracketRegex = /^\[(OWN DAMAGE CLAIM REQUIREMENTS & THIRD PARTY \(TTPD\) CLAIM - REQUIREMENTS|OWN DAMAGE CLAIM REQUIREMENTS|THIRD PARTY \(TTPD\) CLAIM - REQUIREMENTS|ACT OF NATURE CLAIM|THEFT AND LOSS CLAIM|CNC \(CERTIFICATE OF NO CLAIM\))\]\n?\n?/;
    if (bracketRegex.test(text)) {
      return text.replace(bracketRegex, '').trim();
    }

    // 2. Clean up old giant requirement lists
    const oldOwnDamageTtpd = `OWN DAMAGE & TPPD REQUIREMENTS\n\n1. Original Police Report OR Notarized Affidavit\n2. Readable copy of ORCR\n3. Clear copy of Drivers license (Back and Front) with copy of OR\n4. Clear Pictures of Damages of the vehicle\n5. (4 Sides) Clear Pictures of the Vehicle Isometric View\n6. Repair Estimate with Contact number\n7. Picture of Odometer Reading\n8. Picture of Stencil or Vin plate\n• Authorization letter and valid ID from assured (if driven by authorized driver)\n\nTo proceed with the processing of this claim, kindly ensure that the full payment has been settled.\n\n--------------------------------------------------\n\nTHIRD PARTY (TTPD) CLAIM - REQUIREMENTS\n\n• Police report/Affidavit\n• Adverse Official Receipt and Certificate of Registration (ORCR)\n• Adverse Driver’s license\n• Adverse Repair Estimate\n• Adverse Certificate of no claim from his/her insurance provider\n• Adverse photos of damaged unit showing the plate number`;

    const oldOwnDamage = `OWN DAMAGE CLAIM REQUIREMENTS\n\n1. Original Police Report OR Notarized Affidavit\n2. Readable copy of ORCR\n3. Clear copy of Drivers license (Back and Front) with copy of OR\n4. Clear Pictures of Damages of the vehicle\n5. (4 Sides) Clear Pictures of the Vehicle Isometric View\n6. Repair Estimate with Contact number\n7. Picture of Odometer Reading\n8. Picture of Stencil or Vin plate\n• Authorization letter and valid ID from assured (if driven by authorized driver)\n\nTo proceed with the processing of this claim, kindly ensure that the full payment has been settled.`;

    const oldTtpd = `THIRD PARTY (TTPD) CLAIM - REQUIREMENTS\n\n• Police report/Affidavit\n• Adverse Official Receipt and Certificate of Registration (ORCR)\n• Adverse Driver’s license\n• Adverse Repair Estimate\n• Adverse Certificate of no claim from his/her insurance provider\n• Adverse photos of damaged unit showing the plate number`;

    // Standardize newlines before checking startsWith
    const normalizedText = text.replace(/\\r\\n/g, '\\n').replace(/\r\n/g, '\n');
    const normalizedOwnDamageTtpd = oldOwnDamageTtpd.replace(/\r\n/g, '\n');
    const normalizedOwnDamage = oldOwnDamage.replace(/\r\n/g, '\n');
    const normalizedTtpd = oldTtpd.replace(/\r\n/g, '\n');

    if (normalizedText.startsWith(normalizedOwnDamageTtpd)) {
      return normalizedText.slice(normalizedOwnDamageTtpd.length).trim();
    }
    if (normalizedText.startsWith(normalizedOwnDamage)) {
      return normalizedText.slice(normalizedOwnDamage.length).trim();
    }
    if (normalizedText.startsWith(normalizedTtpd)) {
      return normalizedText.slice(normalizedTtpd.length).trim();
    }

    // Old simple ones
    if (text.trim() === 'ACT OF NATURE CLAIM') return '';
    if (text.trim() === 'THEFT AND LOSS CLAIM') return '';
    if (text.trim() === 'CNC (CERTIFICATE OF NO CLAIM)') return '';

    return text;
  };

  const handleEdit = (record: ClaimNotification) => {
    setEditingRecord(record);
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0].split(' ')[0];
    };
    setForm({
      assured_name: record.assured_name,
      contact_number: record.contact_number || '',
      email_address: record.email_address || '',
      insurance_provider: record.insurance_provider,
      plate_number: record.plate_number || '',
      policy_number: record.policy_number,
      inception_date: formatDate(record.inception_date),
      accident_date: formatDate(record.accident_date),
      accident_reason: record.accident_reason || '',
      nature_of_claims: stripRequirementsPrefix(record.nature_of_claims),
      notes: record.notes || '',
      claim_count: record.claim_count || '',
    });
    setClaimType(determineClaimType(record.nature_of_claims));
    if (record.nature_of_claims?.includes('NOT YET PAID TO SUPREMO')) {
      setPaymentStatus('NOT YET PAID TO SUPREMO');
    } else if (record.nature_of_claims?.includes('FULLY PAID')) {
      setPaymentStatus('FULLY PAID');
    } else {
      setPaymentStatus('');
    }
    setActiveView('form');
  };

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
    accident_reason: '',
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
      accident_reason: '',
      nature_of_claims: '',
      notes: '',
      claim_count: '',
    });
    setEditingRecord(null);
    setNameSuggestions([]);
    setPlateSuggestions([]);
    setShowNameSuggestions(false);
    setShowPlateSuggestions(false);
    setValidationErrors({});
    setClaimType('');
    setPaymentStatus('');
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
      accident_reason: form.accident_reason,
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
  const roleParam = searchParams.get('role') || undefined;
  const effectiveStatus = completedOnly
    ? 'completed'
    : (params.status === 'all' ? undefined : params.status);

  const { data: response, isLoading } = useQuery({
    queryKey: ['claim-notifications', params, completedOnly, roleParam],
    queryFn: () => getClaimNotifications({
      ...params,
      status: effectiveStatus,
      role: roleParam,
    }),
    placeholderData: (prev) => prev,
  });

  const [completedDocFilter, setCompletedDocFilter] = useState<string>('all');

  const rawRecords = response?.data?.data ?? [];
  const records = rawRecords
    .filter((r) => {
      if (completedOnly) return r.status === 'completed';
      if (params.status === 'completed') return r.status === 'completed';
      if (!params.status || params.status === 'all') return r.status !== 'completed';
      return r.status === params.status;
    })
    .filter((r) => {
      if ((completedOnly || params.status === 'completed') && completedDocFilter && completedDocFilter !== 'all') {
        const atts = r.attachments || [];
        const target = completedDocFilter.trim().toUpperCase();
        return atts.some((att: any) => {
          if (!att.document_type) return false;
          const [docTitle] = att.document_type.split(' | Note: ');
          const clean = docTitle.trim().toUpperCase();
          if (target === 'EVALUATION LETTER') return clean.includes('EVALUATION');
          if (target === 'LOA') return clean.includes('LOA') || clean.includes('LETTER OF AUTHORITY');
          if (target === 'OFFER LETTER') return clean.includes('OFFER');
          if (target === 'DENIED CLAIM') return clean.includes('DENIED');
          return clean.includes(target);
        });
      }
      return true;
    });
  const pagination = response?.data;

  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ['claim-notification', selectedRecord?.id],
    queryFn: () => getClaimNotification(selectedRecord!.id),
    enabled: !!selectedRecord?.id,
  });

  const detailRecord = detailResponse?.data ?? selectedRecord;

  // Auto-open record when search parameter matches a claim notification (e.g. from notification clicks)
  useEffect(() => {
    if (querySearch && rawRecords.length > 0 && !selectedRecord) {
      const qLower = querySearch.trim().toLowerCase();
      const match = rawRecords.find((r: any) =>
        (r.reference_number && r.reference_number.toLowerCase() === qLower) ||
        (r.ir_number && r.ir_number.toLowerCase() === qLower) ||
        (r.id && r.id.toString() === qLower) ||
        (rawRecords.length === 1 && (r.reference_number?.toLowerCase().includes(qLower) || r.ir_number?.toLowerCase().includes(qLower)))
      );

      if (match) {
        setSelectedRecord(match);
        setActiveView('detail');
      }
    }
  }, [querySearch, rawRecords, selectedRecord]);

  const submitMut = useMutation({
    mutationFn: (data: ClaimNotificationFormData) =>
      editingRecord
        ? updateClaimNotification(editingRecord.id, data)
        : createClaimNotification(data),
    onSuccess: async (res) => {
      const standardCount = Object.values(requirementFiles).reduce((acc, list) => acc + list.length, 0);
      const customCount = customAttachments.filter((c) => c.file).length;
      const totalCount = standardCount + customCount;
      if (totalCount > 0) {
        setIsUploading(true);
        showToast(`Uploading ${totalCount} attachment(s)...`, 'info');
        try {
          const promises = [
            ...Object.entries(requirementFiles).flatMap(([key, files]) => {
              let label = 'Requirement Document';
              if (key.startsWith('req_')) {
                const req = OWN_DAMAGE_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              } else if (key.startsWith('tppd_')) {
                const req = TTPD_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              } else if (key.startsWith('aon_')) {
                const req = ACT_OF_NATURE_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              } else if (key.startsWith('tal_')) {
                const req = THEFT_AND_LOSS_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              } else if (key.startsWith('cnc_')) {
                const req = CNC_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              } else if (key.startsWith('comp_')) {
                const req = COMPLETED_REQUIREMENTS.find((r) => r.key === key);
                label = req ? req.label : 'Requirement Document';
              }
              const note = requirementNotes[key];
              const docType = note ? `${label} | Note: ${note}` : label;
              return files.map((file) => uploadAttachment('claim_notification', res.data.id, file, docType));
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
      showToast(editingRecord ? 'Claim notification resubmitted successfully.' : 'Claim notification submitted successfully.');
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

  const completeMut = useMutation({
    mutationFn: (id: number) => completeClaimNotificationRequirements(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['claim-notifications'] });
      showToast(res.message || 'Requirements marked as completed successfully.');
      if (selectedRecord) {
        setSelectedRecord(res.data);
      }
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to mark requirements completed.', 'error'),
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

  const sendEmailMut = useMutation({
    mutationFn: ({ id, to, cc }: { id: number; to: string[]; cc: string[] }) =>
      sendEmailToInsuranceProvider(id, { to, cc }),
    onSuccess: (res) => {
      showToast(res.message || 'Email sent to insurance provider successfully.');
      setIsEmailModalOpen(false);
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Failed to send email.', 'error'),
  });

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.assured_name.trim()) newErrors.assured_name = true;
    if (!form.insurance_provider.trim()) newErrors.insurance_provider = true;
    if (!form.policy_number.trim()) newErrors.policy_number = true;
    if (!form.accident_date) newErrors.accident_date = true;
    if (!form.claim_count) newErrors.claim_count = true;
    if (!paymentStatus) newErrors.payment_status = true;
    if (!claimType) newErrors.claim_type = true;

    setValidationErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.assured_name) { showToast('Please enter the Assured Name.', 'error'); }
      else if (newErrors.insurance_provider) { showToast('Please select the Insurance Provider.', 'error'); }
      else if (newErrors.policy_number) { showToast('Please enter the Policy Number.', 'error'); }
      else if (newErrors.accident_date) { showToast('Please set the Accident Date.', 'error'); }
      else if (newErrors.claim_count) { showToast('Please select the Claim Count.', 'error'); }
      else if (newErrors.payment_status) { showToast('Please select the Payment Status.', 'error'); }
      else if (newErrors.claim_type) { showToast('Please select the Type of Claim.', 'error'); }
      return;
    }

    const prefix = getClaimTypePrefix(claimType);
    const payload = {
      ...form,
      assured_name: form.assured_name.toUpperCase(),
      policy_number: form.policy_number.toUpperCase(),
      plate_number: (form.plate_number || '').toUpperCase(),
      nature_of_claims: `${prefix}[Payment Status: ${paymentStatus}]`,
    };
    submitMut.mutate(payload);
  };

  const getDetailClaimType = (nature: string | undefined): string => {
    return determineClaimType(nature);
  };

  const handleDetailUpload = async () => {
    if (!detailRecord) return;
    const standardCount = Object.values(requirementFiles).reduce((acc, list) => acc + list.length, 0);
    const customCount = customAttachments.filter((c) => c.file).length;
    const totalCount = standardCount + customCount;
    if (totalCount === 0) return;

    setIsUploading(true);
    showToast(`Uploading ${totalCount} attachment(s)...`, 'info');
    try {
      const promises = [
        ...Object.entries(requirementFiles).flatMap(([key, files]) => {
          let label = 'Requirement Document';
          if (key.startsWith('req_')) {
            const req = OWN_DAMAGE_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          } else if (key.startsWith('tppd_')) {
            const req = TTPD_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          } else if (key.startsWith('aon_')) {
            const req = ACT_OF_NATURE_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          } else if (key.startsWith('tal_')) {
            const req = THEFT_AND_LOSS_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          } else if (key.startsWith('cnc_')) {
            const req = CNC_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          } else if (key.startsWith('comp_')) {
            const req = COMPLETED_REQUIREMENTS.find((r) => r.key === key);
            label = req ? req.label : 'Requirement Document';
          }
          const note = requirementNotes[key];
          const docType = note ? `${label} | Note: ${note}` : label;
          return files.map((file) => uploadAttachment('claim_notification', detailRecord.id, file, docType));
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
    return `w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none transition ${hasError
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

    // Helper to calculate whether an attachment is the NEW FILE (latest) or OLD FILE (previous version)
    const getFileAgeBadge = (att: any, allAtts: any[] = []) => {
      const [docTitle] = (att.document_type || '').split(' | Note: ');
      const titleClean = docTitle.trim().toLowerCase();

      const sameTypeAtts = (allAtts || [])
        .filter((a) => {
          const [t] = (a.document_type || '').split(' | Note: ');
          return t.trim().toLowerCase() === titleClean;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (sameTypeAtts.length === 0) return null;
      const isLatest = sameTypeAtts[0].id === att.id;

      if (isLatest) {
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shrink-0 shadow-2xs">
            NEW FILE
          </span>
        );
      }
      return (
        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wider shrink-0">
          OLD FILE
        </span>
      );
    };

    // Filter out official completed claim documents so they don't appear in standard uploaded requirements box
    const officialDocLabels = (COMPLETED_REQUIREMENTS || []).map((r) => r.label.trim().toLowerCase());
    const nonOfficialAttachments = (detailRecord?.attachments || []).filter((att: any) => {
      const [docTitle] = (att.document_type || '').split(' | Note: ');
      const titleClean = docTitle.trim().toLowerCase();
      return !officialDocLabels.some((label) => titleClean === label || titleClean.includes(label));
    });

    // Define the upload list section
    const uploadedRequirementsSection = detailRecord && nonOfficialAttachments.length > 0 && (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Uploaded Requirements ({nonOfficialAttachments.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Submitted Claim Documents
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nonOfficialAttachments.map((att: any) => {
            const [docTitle, docNote] = att.document_type ? att.document_type.split(' | Note: ') : [att.file_name, ''];
            const badge = getFileAgeBadge(att, nonOfficialAttachments);
            return (
              <div
                key={att.id}
                className="flex flex-col justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 transition shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-[#4A0E17]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-800 truncate" title={docTitle}>{docTitle}</p>
                        {badge}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={att.file_name}>
                        {att.file_name} <span className="text-slate-400">({(att.file_size / 1024).toFixed(1)} KB)</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Uploaded: {new Date(att.created_at).toLocaleDateString()} {new Date(att.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewAttachment(att)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-white transition cursor-pointer border border-transparent hover:border-slate-200"
                      title="View Attachment"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={`/api/v1/attachments/${att.id}/download?token=${token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition border border-transparent hover:border-slate-200"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {docNote && (
                  <div className="px-2.5 py-1.5 bg-amber-50/60 border-l-2 border-amber-400 rounded-r-lg text-[11px] text-amber-900 font-medium">
                    Note: {docNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    // Define the upload form section
    const uploadFormSection = selectedRecord && (
      (selectedRecord.status as string) === 'completed' ||
      completedOnly
    ) && (() => {
      const detailClaimType = getDetailClaimType(detailRecord?.nature_of_claims);

      const renderUploadedRequirementFiles = (reqLabel: string) => {
        if (!detailRecord?.attachments || detailRecord.attachments.length === 0) return null;
        const reqClean = reqLabel.trim().toLowerCase();

        const matchingAttachments = detailRecord.attachments
          .filter((att: any) => {
            if (!att.document_type) return false;
            const [docTitle] = att.document_type.split(' | Note: ');
            const titleClean = docTitle.trim().toLowerCase();
            const titleNoNum = titleClean.replace(/^[0-[#\.\s]+/, '').trim();
            const reqNoNum = reqClean.replace(/^[0-[#\.\s]+/, '').trim();
            return (
              titleClean === reqClean ||
              titleClean.includes(reqClean) ||
              reqClean.includes(titleClean) ||
              (titleNoNum.length > 3 && reqNoNum.length > 3 && (titleNoNum.includes(reqNoNum) || reqNoNum.includes(titleNoNum)))
            );
          })
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (matchingAttachments.length === 0) return null;

        return (
          <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Already Uploaded ({matchingAttachments.length}):
            </span>
            <div className="space-y-1.5">
              {matchingAttachments.map((att: any, idx: number) => {
                const [docTitle, docNote] = att.document_type
                  ? att.document_type.split(' | Note: ')
                  : [att.file_name, ''];
                const isNew = idx === 0;
                return (
                  <div
                    key={att.id}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs border transition-all ${isNew
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-200 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${isNew ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[150px]" title={att.file_name}>
                          {att.file_name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({(att.file_size / 1024).toFixed(1)} KB)
                        </span>
                        {isNew ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                            NEW FILE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                            OLD FILE
                          </span>
                        )}
                        {docNote && (
                          <span className="text-[10px] text-amber-700 italic truncate max-w-[120px]" title={`Note: ${docNote}`}>
                            Note: {docNote}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">
                        {new Date(att.created_at).toLocaleDateString()} {new Date(att.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewAttachment(att)}
                        className="p-1 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-white transition cursor-pointer"
                        title="View Attachment"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={`/api/v1/attachments/${att.id}/download?token=${token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-6 no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#4A0E17]" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload Claim Requirements</h4>
          </div>

          {/* Own Damage Requirements */}
          {!completedOnly && (selectedRecord.status as string) !== 'completed' && (detailClaimType === 'OWN DAMAGE' || detailClaimType === 'OWN DAMAGE & TTPD') && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Own Damage Claim Requirements (Upload Attachments)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OWN_DAMAGE_REQUIREMENTS.map((req) => (
                  <div key={req.key} className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`detail-file-${req.key}`}
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setRequirementFiles((prev) => ({
                                ...prev,
                                [req.key]: [...(prev[req.key] || []), ...files],
                              }));
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
                        {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                          <span className="text-xs text-slate-400 italic">No files selected</span>
                        )}
                      </div>

                      {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {requirementFiles[req.key].map((file, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded-lg text-xs text-slate-700">
                              <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRequirementFiles((prev) => {
                                    const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                    const copy = { ...prev };
                                    if (list.length === 0) {
                                      delete copy[req.key];
                                    } else {
                                      copy[req.key] = list;
                                    }
                                    return copy;
                                  });
                                }}
                                className="text-slate-455 hover:text-red-500 transition cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                    {renderUploadedRequirementFiles(req.label)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Third Party (TTPD) Requirements */}
          {!completedOnly && (selectedRecord.status as string) !== 'completed' && (detailClaimType === 'TPPD' || detailClaimType === 'OWN DAMAGE & TTPD') && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Third Party (TTPD) Claim Requirements (Upload Attachments)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TTPD_REQUIREMENTS.map((req) => (
                  <div key={req.key} className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`detail-file-${req.key}`}
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setRequirementFiles((prev) => ({
                                ...prev,
                                [req.key]: [...(prev[req.key] || []), ...files],
                              }));
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
                        {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                          <span className="text-xs text-slate-400 italic">No files selected</span>
                        )}
                      </div>

                      {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {requirementFiles[req.key].map((file, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded-lg text-xs text-slate-700">
                              <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRequirementFiles((prev) => {
                                    const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                    const copy = { ...prev };
                                    if (list.length === 0) {
                                      delete copy[req.key];
                                    } else {
                                      copy[req.key] = list;
                                    }
                                    return copy;
                                  });
                                }}
                                className="text-slate-455 hover:text-red-500 transition cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                    {renderUploadedRequirementFiles(req.label)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Act of Nature Requirements */}
          {!completedOnly && (selectedRecord.status as string) !== 'completed' && detailClaimType === 'ACT OF NATURE' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Act of Nature Claim Requirements (Upload Attachments)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ACT_OF_NATURE_REQUIREMENTS.map((req) => (
                  <div key={req.key} className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`detail-file-${req.key}`}
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setRequirementFiles((prev) => ({
                                ...prev,
                                [req.key]: [...(prev[req.key] || []), ...files],
                              }));
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
                        {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                          <span className="text-xs text-slate-400 italic">No files selected</span>
                        )}
                      </div>

                      {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {requirementFiles[req.key].map((file, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded-lg text-xs text-slate-700">
                              <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRequirementFiles((prev) => {
                                    const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                    const copy = { ...prev };
                                    if (list.length === 0) {
                                      delete copy[req.key];
                                    } else {
                                      copy[req.key] = list;
                                    }
                                    return copy;
                                  });
                                }}
                                className="text-slate-455 hover:text-red-500 transition cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                    {renderUploadedRequirementFiles(req.label)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theft and Loss Requirements */}
          {!completedOnly && (selectedRecord.status as string) !== 'completed' && detailClaimType === 'THEFT AND LOSS' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">Theft and Loss Claim Requirements (Upload Attachments)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {THEFT_AND_LOSS_REQUIREMENTS.map((req) => (
                  <div key={req.key} className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`detail-file-${req.key}`}
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setRequirementFiles((prev) => ({
                                ...prev,
                                [req.key]: [...(prev[req.key] || []), ...files],
                              }));
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor={`detail-file-${req.key}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          <span>Choose File</span>
                        </label>
                        {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                          <span className="text-xs text-slate-400 italic">No files selected</span>
                        )}
                      </div>

                      {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {requirementFiles[req.key].map((file, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded-lg text-xs text-slate-700">
                              <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRequirementFiles((prev) => {
                                    const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                    const copy = { ...prev };
                                    if (list.length === 0) {
                                      delete copy[req.key];
                                    } else {
                                      copy[req.key] = list;
                                    }
                                    return copy;
                                  });
                                }}
                                className="text-slate-455 hover:text-red-500 transition cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                    {renderUploadedRequirementFiles(req.label)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CNC Requirements */}
          {!completedOnly && (selectedRecord.status as string) !== 'completed' && detailClaimType === 'CNC (CERTIFICATE OF NO CLAIM)' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">CNC Requirements (Upload Attachments)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CNC_REQUIREMENTS.map((req) => (
                  <div key={req.key} className="space-y-1">
                    <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`detail-file-${req.key}`}
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setRequirementFiles((prev) => ({
                                ...prev,
                                [req.key]: [...(prev[req.key] || []), ...files],
                              }));
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
                        {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                          <span className="text-xs text-slate-400 italic">No files selected</span>
                        )}
                      </div>

                      {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {requirementFiles[req.key].map((file, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded-lg text-xs text-slate-700">
                              <Paperclip className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRequirementFiles((prev) => {
                                    const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                    const copy = { ...prev };
                                    if (list.length === 0) {
                                      delete copy[req.key];
                                    } else {
                                      copy[req.key] = list;
                                    }
                                    return copy;
                                  });
                                }}
                                className="text-slate-455 hover:text-red-500 transition cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                    {renderUploadedRequirementFiles(req.label)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Claim Requirements (Evaluation Letter, LOA, Offer Letter, Denied Claim) */}
          {((selectedRecord.status as string) === 'completed' || completedOnly) && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  {isClaimsOfficer || isAdmin ? 'Official Completed Claim Documents (Upload Attachments)' : 'Official Completed Claim Documents'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMPLETED_REQUIREMENTS.map((req) => (
                  <div key={req.key} className="space-y-1 bg-white p-3.5 rounded-xl border border-emerald-150 shadow-2xs">
                    <span className="block text-xs font-bold text-emerald-950 uppercase tracking-wide">{req.label}</span>
                    
                    {/* Only Claims Officers and Administrators can choose/upload files */}
                    {(isClaimsOfficer || isAdmin) && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`detail-file-${req.key}`}
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                setRequirementFiles((prev) => ({
                                  ...prev,
                                  [req.key]: [...(prev[req.key] || []), ...files],
                                }));
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor={`detail-file-${req.key}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                            <span>Choose File</span>
                          </label>
                          {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                            <span className="text-xs text-slate-400 italic">No files selected</span>
                          )}
                        </div>

                        {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {requirementFiles[req.key].map((file, idx) => (
                              <div key={idx} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs text-emerald-900">
                                <Paperclip className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequirementFiles((prev) => {
                                      const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                      const copy = { ...prev };
                                      if (list.length === 0) {
                                        delete copy[req.key];
                                      } else {
                                        copy[req.key] = list;
                                      }
                                      return copy;
                                    });
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(isClaimsOfficer || isAdmin) && requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                      <div className="mt-1">
                        <input
                          type="text"
                          placeholder="Add a brief note for this document..."
                          value={requirementNotes[req.key] || ''}
                          onChange={(e) => {
                            setRequirementNotes((prev) => ({ ...prev, [req.key]: e.target.value }));
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-650 focus:outline-none focus:ring-1 focus:ring-emerald-600/20 focus:border-emerald-600"
                        />
                      </div>
                    )}

                    {/* Always display uploaded requirement files for viewing and downloading */}
                    {renderUploadedRequirementFiles(req.label)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Custom Attachments */}
          {!completedOnly && (selectedRecord.status as string) !== 'completed' && (
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
                        <label className="block text-[10px] font-bold text-slate-500">Choose File</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`custom-file-${att.id}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setCustomAttachments((prev) =>
                                prev.map((c) => (c.id === att.id ? { ...c, file } : c))
                              );
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor={`custom-file-${att.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                          >
                            <Paperclip className="h-3 w-3 text-slate-400" />
                            <span>Choose File</span>
                          </label>
                          <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                            {att.file ? att.file.name : 'No file selected'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500">Notes (Optional)</label>
                        <input
                          type="text"
                          placeholder="Add a brief note..."
                          value={att.note}
                          onChange={(e) => {
                            setCustomAttachments((prev) =>
                              prev.map((c) => (c.id === att.id ? { ...c, note: e.target.value } : c))
                            );
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-650 focus:outline-none focus:ring-1 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No additional attachments added. Click the button above to upload extra files.</p>
              )}
            </div>
          )}

          {(isClaimsOfficer || isAdmin || (!completedOnly && (selectedRecord.status as string) !== 'completed')) && (
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
          )}
        </div>
      );
    })();

    // Render original printable document
    const renderPrintableDocument = (hideOnScreen: boolean) => (
      <div className={`printable-document bg-white rounded-2xl border border-slate-200/90 shadow-xl p-8 md:p-10 max-w-4xl mx-auto space-y-6 print:space-y-3.5 print:p-4 print:max-w-full print:shadow-none print:border-none print:rounded-none ${hideOnScreen ? 'hidden print:block' : ''}`}>
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 print:pb-3 border-b-2 border-[#4A0E17] gap-4">
          <div className="flex items-center gap-3.5">
            <img src={logoImg} alt="Supremogen Logo" className="h-14 w-14 print:h-11 print:w-11 rounded-xl border border-slate-200/80 shadow-xs object-cover shrink-0" />
            <div>
              <h2 className="text-[#4A0E17] font-black text-2xl print:text-xl tracking-wider leading-none">SUPREMOGEN</h2>
              <p className="text-[#4A0E17]/80 text-xs print:text-[10px] font-bold uppercase tracking-widest mt-1">Insurance Services</p>
            </div>
          </div>
          <div className="text-left sm:text-right bg-slate-50 border border-slate-200/80 px-4 py-2 print:py-1.5 print:px-3 rounded-xl shadow-2xs">
            <p className="text-[10px] print:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official Document</p>
            <p className="text-base print:text-sm font-black text-[#4A0E17] tracking-tight">{selectedRecord.reference_number}</p>
            <p className="text-xs print:text-[10px] font-medium text-slate-500 mt-0.5">
              Date Filed: {new Date(selectedRecord.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} <span className="font-mono text-[11px] print:text-[10px] text-slate-400">{new Date(selectedRecord.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </p>
          </div>
        </div>

        <div className="space-y-5 print:space-y-3">
          {/* Subject lines */}
          <div className="bg-slate-50/80 border-l-4 border-[#4A0E17] p-3.5 print:p-2.5 rounded-r-xl space-y-0.5">
            <p className="text-xs print:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attention: Claims Department</p>
            <h3 className="text-base print:text-sm font-bold text-[#4A0E17] uppercase tracking-wide">
              SUBJECT: CLAIM NOTIFICATION — {selectedRecord.assured_name}
            </h3>
          </div>

          <p className="text-sm print:text-xs text-slate-600 leading-relaxed font-medium">
            Good day, <br />
            Kindly find below the official details and information of our Assured for the submitted claim notification.
          </p>

          {/* Document Details Table Header */}
          <div className="border border-slate-200/90 rounded-2xl print:rounded-xl overflow-hidden shadow-2xs bg-white">
            <div className="bg-[#4A0E17] text-white px-4 py-2.5 print:py-1.5 flex items-center justify-between">
              <h4 className="text-xs print:text-[11px] font-bold uppercase tracking-wider">Official Claim & Policy Information</h4>
              <span className="text-[11px] print:text-[10px] text-white/80 font-mono font-medium">{selectedRecord.reference_number}</span>
            </div>
            <table className="min-w-full divide-y divide-slate-200/80 text-sm print:text-xs">
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {[
                  { label: 'Assured Name', value: selectedRecord.assured_name },
                  { label: 'Contact Number', value: selectedRecord.contact_number || '—' },
                  { label: 'Email Address', value: selectedRecord.email_address || '—' },
                  { label: 'Insurance Provider', value: selectedRecord.insurance_provider },
                  { label: 'Plate Number', value: selectedRecord.plate_number || '—' },
                  { label: 'Policy Number', value: selectedRecord.policy_number },
                  ...(selectedRecord.policy?.quotation ? [{
                    label: 'Remittance Status',
                    value: (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                        selectedRecord.policy.quotation.is_remitted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedRecord.policy.quotation.is_remitted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {selectedRecord.policy.quotation.is_remitted ? 'Remitted to Provider' : 'Unremitted'}
                      </span>
                    ) as any
                  }] : []),
                  {
                    label: 'Inception Date',
                    value: selectedRecord.inception_date
                      ? `${new Date(selectedRecord.inception_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`
                      : '—',
                  },
                  {
                    label: 'Accident Date',
                    value: `${new Date(selectedRecord.accident_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`,
                  },
                  { label: 'Reason of Accident', value: selectedRecord.accident_reason || '—' },
                  { label: 'Claim Count', value: selectedRecord.claim_count || '—' },
                ].map((row, idx) => (
                  <tr key={row.label} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/50 transition' : 'bg-slate-50/40 hover:bg-slate-50 transition'}>
                    <td className="px-4 py-2.5 print:py-1 print:px-3 font-bold text-slate-500 w-2/5 border-r border-slate-100 text-xs print:text-[10px] uppercase tracking-wider">{row.label}</td>
                    <td className="px-4 py-2.5 print:py-1 print:px-3 font-semibold text-slate-900 uppercase text-xs sm:text-sm print:text-xs">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>



          {/* Notes */}
          {selectedRecord.notes && (
            <div className="space-y-1.5 print:space-y-1">
              <h4 className="text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Additional Notes</h4>
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 print:p-2 text-sm print:text-xs text-amber-900 leading-relaxed font-medium whitespace-pre-wrap">
                {selectedRecord.notes}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 print:pt-4 border-t border-slate-200/80 grid grid-cols-2 gap-8 text-sm print:text-xs">
            <div>
              <p className="text-xs print:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6 print:mb-4">Submitted By</p>
              <div className="space-y-0.5 border-t border-slate-300 pt-1.5">
                <p className="font-bold text-slate-900 uppercase">{submitter}</p>
                <p className="text-xs print:text-[10px] text-slate-500 font-medium">Sales Agent / Representative</p>
              </div>
            </div>
            <div>
              <p className="text-xs print:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6 print:mb-4">Acknowledged By</p>
              {acknowledger ? (
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 uppercase">{acknowledger}</p>
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
          {uploadedRequirementsSection}

          {/* Upload Form Section */}
          {uploadFormSection}
        </div>
      </div>
    );

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
            {isClaimsOfficer && selectedRecord.status === 'acknowledged' && (
              <button
                onClick={() => completeMut.mutate(selectedRecord.id)}
                disabled={completeMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-700/20 transition cursor-pointer"
              >
                {completeMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Completing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <span>Mark Requirements Completed</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 shadow-sm transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Notification</span>
            </button>
            {selectedRecord.policy?.quotation && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs ${
                  selectedRecord.policy.quotation.is_remitted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
                title={
                  selectedRecord.policy.quotation.is_remitted
                    ? `Remitted ${selectedRecord.policy.quotation.remitted_at ? 'on ' + new Date(selectedRecord.policy.quotation.remitted_at).toLocaleDateString() : ''}`
                    : 'Premium has not yet been remitted to provider'
                }
              >
                <span className={`w-2 h-2 rounded-full ${selectedRecord.policy.quotation.is_remitted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{selectedRecord.policy.quotation.is_remitted ? 'Remitted' : 'Unremitted'}</span>
              </span>
            )}
            <StatusBadge status={selectedRecord.status} />
          </div>
        </div>
        {renderPrintableDocument(false)}

        {/* Action buttons */}
        {isClaimsOfficer && (selectedRecord.status === 'pending' || selectedRecord.status === 'resubmitted') && (
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

        {canSubmit && selectedRecord.status === 'returned' && (
          <div className="flex justify-end gap-3 pt-4 no-print">
            <button
              onClick={() => handleEdit(selectedRecord)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
            >
              <Edit className="h-4 w-4" /> Edit & Resubmit
            </button>
          </div>
        )}

        {acknowledgeTarget && (
          <ConfirmModal
            open={!!acknowledgeTarget}
            title="Acknowledge Claim Notification"
            message={`Are you sure you want to acknowledge claim notification ${acknowledgeTarget.reference_number}?`}
            confirmLabel="Acknowledge"
            variant="success"
            onConfirm={() => acknowledgeMut.mutate(acknowledgeTarget.id)}
            onCancel={() => setAcknowledgeTarget(null)}
            loading={acknowledgeMut.isPending}
          />
        )}

        {returnTarget && (
          <div
            onClick={() => { setReturnTarget(null); setReturnReason(''); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-scale-in cursor-default"
            >
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
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition resize-none"
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
            <div
              onClick={() => setViewAttachment(null)}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-slate-205 shadow-2xl max-w-3xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[85vh] cursor-default"
              >
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
            <h1 className="text-xl font-bold text-slate-800">
              {editingRecord ? `Edit Claim Notification ${editingRecord.reference_number}` : 'Submit Claim Notification'}
            </h1>
            <p className="text-sm text-slate-500">
              {editingRecord ? 'Modify and resubmit the returned claim notification' : 'Send a claim notification to the Claims Officer'}
            </p>
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
                      setForm({ ...form, assured_name: e.target.value.toUpperCase() });
                      setShowNameSuggestions(true);
                      if (validationErrors.assured_name) {
                        setValidationErrors((prev) => ({ ...prev, assured_name: false }));
                      }
                    }}
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                    className={`${getInputClass('assured_name')} uppercase`} placeholder="Full name of the assured" />

                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {nameSuggestions.map((cust) => {
                        const name = cust.customer_type === 'corporate' && cust.company_name
                          ? cust.company_name
                          : `${cust.first_name} ${cust.last_name}`;
                        return (
                          <div
                            key={cust.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCustomer(cust);
                            }}
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
                      setForm({ ...form, plate_number: e.target.value.toUpperCase() });
                      setShowPlateSuggestions(true);
                      if (validationErrors.plate_number) {
                        setValidationErrors((prev) => ({ ...prev, plate_number: false }));
                      }
                    }}
                    onFocus={() => setShowPlateSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPlateSuggestions(false), 200)}
                    className={`${getInputClass('plate_number')} uppercase`} placeholder="e.g. ABC 1234" />

                  {showPlateSuggestions && plateSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {plateSuggestions.map((cust) => {
                        const name = cust.customer_type === 'corporate' && cust.company_name
                          ? cust.company_name
                          : `${cust.first_name} ${cust.last_name}`;
                        return (
                          <div
                            key={cust.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCustomer(cust);
                            }}
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
                      setForm({ ...form, policy_number: e.target.value.toUpperCase() });
                      if (validationErrors.policy_number) {
                        setValidationErrors((prev) => ({ ...prev, policy_number: false }));
                      }
                    }}
                    className={`${getInputClass('policy_number')} uppercase`} placeholder="e.g. POL-2026-00001" />
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
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason / Cause of Accident</label>
                  <textarea value={form.accident_reason || ''} rows={3}
                    placeholder="Describe what happened or the reason/cause of the accident..."
                    onChange={(e) => setForm({ ...form, accident_reason: e.target.value })}
                    className={getInputClass('accident_reason')} />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Claim Count *</label>
                    <select
                      value={form.claim_count}
                      onChange={(e) => {
                        setForm({ ...form, claim_count: e.target.value });
                        if (validationErrors.claim_count) {
                          setValidationErrors((prev) => ({ ...prev, claim_count: false }));
                        }
                      }}
                      className={getInputClass('claim_count') + " cursor-pointer"}
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Status *</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => {
                        setPaymentStatus(e.target.value);
                        if (validationErrors.payment_status) {
                          setValidationErrors((prev) => ({ ...prev, payment_status: false }));
                        }
                      }}
                      className={getInputClass('payment_status') + " cursor-pointer"}
                    >
                      <option value="">Select Payment Status</option>
                      <option value="FULLY PAID">FULLY PAID</option>
                      <option value="NOT YET PAID TO SUPREMO">NOT YET PAID TO SUPREMO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type of Claim *</label>
                    <select
                      value={claimType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClaimType(val);
                        if (validationErrors.claim_type) {
                          setValidationErrors((prev) => ({ ...prev, claim_type: false }));
                        }
                      }}
                      className={getInputClass('claim_type') + " cursor-pointer"}
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
                </div>

                {/* Claim Requirements Upload Section when submitting notification */}
                {claimType && (
                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#4A0E17]" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Upload Claim Requirements ({claimType})
                      </h4>
                    </div>

                    {/* Own Damage Requirements */}
                    {(claimType === 'OWN DAMAGE' || claimType === 'OWN DAMAGE & TTPD') && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">
                          Own Damage Claim Requirements (Upload Attachments)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {OWN_DAMAGE_REQUIREMENTS.map((req) => (
                            <div key={req.key} className="space-y-1">
                              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id={`form-file-${req.key}`}
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setRequirementFiles((prev) => ({
                                          ...prev,
                                          [req.key]: [...(prev[req.key] || []), ...files],
                                        }));
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`form-file-${req.key}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Choose File</span>
                                  </label>
                                  {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                                    <span className="text-xs text-slate-400 italic">No files selected</span>
                                  )}
                                </div>

                                {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {requirementFiles[req.key].map((file, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs text-emerald-900 shadow-2xs">
                                        <Paperclip className="h-3 w-3 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequirementFiles((prev) => {
                                              const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                              const copy = { ...prev };
                                              if (list.length === 0) {
                                                delete copy[req.key];
                                              } else {
                                                copy[req.key] = list;
                                              }
                                              return copy;
                                            });
                                          }}
                                          className="text-emerald-700 hover:text-red-500 transition cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                    {(claimType === 'TPPD' || claimType === 'OWN DAMAGE & TTPD') && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">
                          Third Party (TTPD) Claim Requirements (Upload Attachments)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {TTPD_REQUIREMENTS.map((req) => (
                            <div key={req.key} className="space-y-1">
                              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id={`form-file-${req.key}`}
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setRequirementFiles((prev) => ({
                                          ...prev,
                                          [req.key]: [...(prev[req.key] || []), ...files],
                                        }));
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`form-file-${req.key}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Choose File</span>
                                  </label>
                                  {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                                    <span className="text-xs text-slate-400 italic">No files selected</span>
                                  )}
                                </div>

                                {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {requirementFiles[req.key].map((file, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs text-emerald-900 shadow-2xs">
                                        <Paperclip className="h-3 w-3 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequirementFiles((prev) => {
                                              const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                              const copy = { ...prev };
                                              if (list.length === 0) {
                                                delete copy[req.key];
                                              } else {
                                                copy[req.key] = list;
                                              }
                                              return copy;
                                            });
                                          }}
                                          className="text-emerald-700 hover:text-red-500 transition cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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

                    {/* Act of Nature Requirements */}
                    {claimType === 'ACT OF NATURE' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">
                          Act of Nature Claim Requirements (Upload Attachments)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ACT_OF_NATURE_REQUIREMENTS.map((req) => (
                            <div key={req.key} className="space-y-1">
                              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id={`form-file-${req.key}`}
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setRequirementFiles((prev) => ({
                                          ...prev,
                                          [req.key]: [...(prev[req.key] || []), ...files],
                                        }));
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`form-file-${req.key}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Choose File</span>
                                  </label>
                                  {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                                    <span className="text-xs text-slate-400 italic">No files selected</span>
                                  )}
                                </div>

                                {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {requirementFiles[req.key].map((file, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs text-emerald-900 shadow-2xs">
                                        <Paperclip className="h-3 w-3 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequirementFiles((prev) => {
                                              const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                              const copy = { ...prev };
                                              if (list.length === 0) {
                                                delete copy[req.key];
                                              } else {
                                                copy[req.key] = list;
                                              }
                                              return copy;
                                            });
                                          }}
                                          className="text-emerald-700 hover:text-red-500 transition cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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

                    {/* Theft and Loss Requirements */}
                    {claimType === 'THEFT AND LOSS' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">
                          Theft and Loss Claim Requirements (Upload Attachments)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {THEFT_AND_LOSS_REQUIREMENTS.map((req) => (
                            <div key={req.key} className="space-y-1">
                              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id={`form-file-${req.key}`}
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setRequirementFiles((prev) => ({
                                          ...prev,
                                          [req.key]: [...(prev[req.key] || []), ...files],
                                        }));
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`form-file-${req.key}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Choose File</span>
                                  </label>
                                  {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                                    <span className="text-xs text-slate-400 italic">No files selected</span>
                                  )}
                                </div>

                                {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {requirementFiles[req.key].map((file, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs text-emerald-900 shadow-2xs">
                                        <Paperclip className="h-3 w-3 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequirementFiles((prev) => {
                                              const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                              const copy = { ...prev };
                                              if (list.length === 0) {
                                                delete copy[req.key];
                                              } else {
                                                copy[req.key] = list;
                                              }
                                              return copy;
                                            });
                                          }}
                                          className="text-emerald-700 hover:text-red-500 transition cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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

                    {/* CNC Requirements */}
                    {claimType === 'CNC (CERTIFICATE OF NO CLAIM)' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <p className="text-xs font-bold text-[#4A0E17] uppercase tracking-wider">
                          CNC Requirements (Upload Attachments)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {CNC_REQUIREMENTS.map((req) => (
                            <div key={req.key} className="space-y-1">
                              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">{req.label}</span>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id={`form-file-${req.key}`}
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setRequirementFiles((prev) => ({
                                          ...prev,
                                          [req.key]: [...(prev[req.key] || []), ...files],
                                        }));
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`form-file-${req.key}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Choose File</span>
                                  </label>
                                  {(!requirementFiles[req.key] || requirementFiles[req.key].length === 0) && (
                                    <span className="text-xs text-slate-400 italic">No files selected</span>
                                  )}
                                </div>

                                {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {requirementFiles[req.key].map((file, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs text-emerald-900 shadow-2xs">
                                        <Paperclip className="h-3 w-3 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequirementFiles((prev) => {
                                              const list = (prev[req.key] || []).filter((_, i) => i !== idx);
                                              const copy = { ...prev };
                                              if (list.length === 0) {
                                                delete copy[req.key];
                                              } else {
                                                copy[req.key] = list;
                                              }
                                              return copy;
                                            });
                                          }}
                                          className="text-emerald-700 hover:text-red-500 transition cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {requirementFiles[req.key] && requirementFiles[req.key].length > 0 && (
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
                                <label className="block text-[10px] font-bold text-slate-500">File</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id={`custom-file-form-${att.id}`}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setCustomAttachments((prev) =>
                                        prev.map((c) => (c.id === att.id ? { ...c, file } : c))
                                      );
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`custom-file-form-${att.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm cursor-pointer transition shrink-0"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Choose File</span>
                                  </label>
                                  <span className="text-xs text-slate-500 truncate max-w-[150px]">
                                    {att.file ? att.file.name : 'No file chosen'}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500">Note / Remarks (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="Additional details..."
                                  value={att.note}
                                  onChange={(e) => {
                                    setCustomAttachments((prev) =>
                                      prev.map((c) => (c.id === att.id ? { ...c, note: e.target.value } : c))
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No additional custom attachments added yet.</p>
                      )}
                    </div>
                  </div>
                )}
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
                      <span>{editingRecord ? 'Resubmit Notification' : 'Submit Notification'}</span>
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
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                      {editingRecord ? 'Revision Preview' : 'Draft Preview'}
                    </p>
                    <p className="text-xs font-bold text-slate-650 mt-0.5">
                      {editingRecord ? editingRecord.reference_number : 'CLN-2026-XXXXX'}
                    </p>
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
                          <td className="px-4 py-2 font-medium text-slate-700 uppercase">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment Status */}
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</h5>
                  <div className="bg-slate-50/80 border border-slate-150 rounded-xl p-3 text-xs font-bold uppercase tracking-wide">
                    {paymentStatus ? (
                      <span className={paymentStatus === 'FULLY PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                        {paymentStatus}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Select payment status above...</span>
                    )}
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
        <span className="font-mono text-xs text-[#4A0E17] font-bold uppercase">{r.reference_number}</span>
      ),
    },
    {
      key: 'assured_name', label: 'Assured Name', sortable: true,
      render: (r: ClaimNotification) => (
        <div>
          <p className="font-medium text-slate-800 uppercase">{r.assured_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-500 uppercase">{r.policy_number}</span>
            {r.policy?.quotation && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                r.policy.quotation.is_remitted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                <span className={`w-1 h-1 rounded-full ${r.policy.quotation.is_remitted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {r.policy.quotation.is_remitted ? 'Remitted' : 'Unremitted'}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'insurance_provider', label: 'Provider', className: 'hidden lg:table-cell',
      render: (r: ClaimNotification) => (
        <span className="text-sm text-slate-600 uppercase">{r.insurance_provider}</span>
      ),
    },
    {
      key: 'claim_count', label: 'Claim Count', className: 'hidden xl:table-cell',
      render: (r: ClaimNotification) => (
        <span className="text-xs text-slate-605 uppercase">{r.claim_count || '—'}</span>
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
        return <span className="text-xs text-slate-600 uppercase">{name}</span>;
      },
    },
    {
      key: 'created_at', label: 'Date & Time', sortable: true,
      render: (r: ClaimNotification) => {
        const d = new Date(r.created_at);
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
      key: 'actions', label: '', className: 'text-right',
      render: (r: ClaimNotification) => (
        <div className="flex items-center justify-end gap-1">
          {isClaimsOfficer && (r.status === 'pending' || r.status === 'resubmitted') && (
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">
              {completedOnly ? 'Completed Requirements' : 'Claim Notifications'}
            </h1>
            {!isClaimsOfficer && !canSubmit && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                <Eye className="h-3 w-3 text-amber-600" /> Viewing Mode (Read-Only)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {completedOnly
              ? 'View and audit all completed claim notifications & requirement files'
              : (canSubmit ? 'Submit claim notifications to the Claims Officer' : 'Review incoming claim notifications')}
          </p>
        </div>
        {canSubmit && !completedOnly && (
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
              value={completedOnly ? completedDocFilter : (params.status || 'all')}
              onChange={(e) => {
                const val = e.target.value;
                if (completedOnly) {
                  setCompletedDocFilter(val);
                } else {
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
                }
              }}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition appearance-none cursor-pointer font-medium"
            >
              {completedOnly ? (
                <>
                  <option value="all">All Completed Documents</option>
                  <option value="EVALUATION LETTER">Evaluation Letter</option>
                  <option value="LOA">LOA</option>
                  <option value="OFFER LETTER">Offer Letter</option>
                  <option value="DENIED CLAIM">Denied Claim</option>
                </>
              ) : (
                <>
                  <option value="all">Active Notifications</option>
                  <option value="pending">Pending</option>
                  <option value="resubmitted">Resubmitted</option>
                  <option value="returned">Returned</option>
                  <option value="acknowledged">Acknowledged</option>
                  {!isClaimsOfficer && <option value="completed">Completed</option>}
                </>
              )}
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
          variant="success"
          onConfirm={() => acknowledgeMut.mutate(acknowledgeTarget.id)}
          onCancel={() => setAcknowledgeTarget(null)}
          loading={acknowledgeMut.isPending}
        />
      )}

      {returnTarget && (
        <div
          onClick={() => { setReturnTarget(null); setReturnReason(''); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-scale-in cursor-default"
          >
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
          <div
            onClick={() => setViewAttachment(null)}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[85vh] cursor-default"
            >
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
