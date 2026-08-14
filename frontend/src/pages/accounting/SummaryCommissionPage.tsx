import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Search,
  Printer,
  DollarSign,
  Briefcase,
  Layers,
  Calendar,
  UserCheck,
  TrendingUp,
  Filter,
  Gift,
  Users,
  Edit2,
  X,
  Loader2,
  CheckCircle2,
  CreditCard,
  Building2,
  Paperclip,
  Eye,
  Download,
  Trash2,
  Upload,
  FileText,
  RotateCcw,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import { getInvoices, updateSubagentCommission, updateMainAgentCommission } from '../../services/invoiceApi';
import { getAttachments, uploadAttachment, deleteAttachment, downloadAttachment, getAttachmentPreview, type Attachment } from '../../services/attachmentApi';
import type { Invoice } from '../../types/AccountingTypes';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import FreebieAttachmentModal from '../../components/modals/FreebieAttachmentModal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';

export default function SummaryCommissionPage() {
  const { roles } = useAuth();
  const { showToast } = useToast();

  const isAccountingOrAdmin = useMemo(() => {
    return roles.some((r) =>
      ['Accounting Officer', 'Accounting', 'Team Support Operation', 'Administrator', 'Owner', 'Super Admin'].includes(r)
    );
  }, [roles]);

  const [activeTab, setActiveTab] = useState<'main' | 'subagent'>('main');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBalanceStatus, setSelectedBalanceStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // e.g. "2026-06"
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [showManageCommissionMain, setShowManageCommissionMain] = useState(false);
  const [freebieModalTarget, setFreebieModalTarget] = useState<any | null>(null);
  const [editingSubagentRecord, setEditingSubagentRecord] = useState<any | null>(null);
  const [selectedNotesModal, setSelectedNotesModal] = useState<{
    title: string;
    author?: string;
    notes: string;
    quotationNotes?: string;
    underwriterRemarks?: string;
    customerNotes?: string;
  } | null>(null);

  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const handleOpenPreview = async (att: Attachment) => {
    setPreviewAttachment(att);
    setPreviewLoading(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const blob = await getAttachmentPreview(att.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      showToast('Failed to load attachment preview.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewAttachment(null);
  };

  const formatAmount = (val: number): string => {
    return Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Fetch invoices for live real-time commission tracking
  const { data: invoicesRes, isLoading, refetch } = useQuery({
    queryKey: ['invoices-summary-commission', selectedMonth, searchQuery, currentPage, perPage],
    queryFn: () =>
      getInvoices({
        page: 1,
        per_page: 100,
        search: searchQuery || undefined,
        sort_by: 'created_at',
        sort_dir: 'desc',
      }),
    refetchInterval: 3000,
  });

  const rawInvoices = invoicesRes?.data?.data || [];

  // Fetch all registered Sales Agents and Team Renewals from database API
  const { data: dbAgentsRes } = useQuery({
    queryKey: ['registered-agents-list'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/agents');
      return res.data;
    },
  });

  const dbAgents: Array<{ id: number; name: string; role_name: string }> = useMemo(
    () => dbAgentsRes?.data || [],
    [dbAgentsRes]
  );

  // Extract unique agents combining DB agents and invoice records
  const availableAgents = useMemo(() => {
    const agentsMap = new Map<string, { name: string; role: string }>();

    // Registered DB agents (Sales Agent / Team Renewal)
    dbAgents.forEach((ag) => {
      const clean = ag.name.trim();
      agentsMap.set(clean.toLowerCase(), {
        name: clean,
        role: ag.role_name || 'Agent',
      });
    });

    // Invoice agents
    rawInvoices.forEach((inv) => {
      const cust = inv.customer;
      const policy = (inv as any).policy;
      const quotation = policy?.quotation;
      const agentName =
        cust?.agent ||
        (typeof (cust as any)?.created_by === 'object' ? (cust as any)?.created_by?.name : null) ||
        (typeof inv.created_by === 'object' ? inv.created_by?.name : null) ||
        (typeof quotation?.prepared_by === 'object' ? quotation.prepared_by?.name : null) ||
        (typeof policy?.issued_by === 'object' ? policy.issued_by?.name : null);

      if (agentName && agentName.trim()) {
        const clean = agentName.trim();
        if (!agentsMap.has(clean.toLowerCase())) {
          agentsMap.set(clean.toLowerCase(), { name: clean, role: 'Agent' });
        }
      }
    });

    return Array.from(agentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbAgents, rawInvoices]);

  // Compute main commission rows dynamically
  const commissionRows = useMemo(() => {
    return rawInvoices.map((inv: Invoice) => {
      const cust = inv.customer;
      const policy = (inv as any).policy;
      const quotation = policy?.quotation;
      const cov = quotation?.items?.[0]?.coverage_details || {};

      const agentName =
        cust?.agent ||
        (typeof (cust as any)?.created_by === 'object' ? (cust as any)?.created_by?.name : null) ||
        (typeof inv.created_by === 'object' ? inv.created_by?.name : null) ||
        (typeof quotation?.prepared_by === 'object' ? quotation.prepared_by?.name : null) ||
        (typeof quotation?.reviewed_by === 'object' ? quotation.reviewed_by?.name : null) ||
        (typeof policy?.issued_by === 'object' ? policy.issued_by?.name : null) ||
        'SALES AGENT';

      const dateRequestRaw = cust?.writing_date
        ? cust.writing_date.slice(0, 7)
        : inv.created_at
        ? inv.created_at.slice(0, 7)
        : '';

      const dateRequest = cust?.writing_date
        ? new Date(cust.writing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : inv.created_at
        ? new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';

      const monthName = cust?.writing_date
        ? new Date(cust.writing_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : inv.created_at
        ? new Date(inv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

      const accountType = (cust as any)?.account_type || (cust as any)?.request_type || 'NEW ACCOUNT';

      const activity =
        (cust as any)?.source_activity ||
        (cust as any)?.channel ||
        (cust as any)?.activity ||
        'SUPREMO MAIN PAGE';

      const provider = (
        (cust as any)?.insurance_provider ||
        policy?.insurance_provider ||
        quotation?.insurance_provider ||
        cov?.provider ||
        cov?.insurance_provider ||
        'CBIC'
      ).toUpperCase();

      const quotationUsed = (
        cust?.quotation_used ||
        quotation?.quotation_type ||
        quotation?.quotation_used ||
        cov?.used_rate_type ||
        cov?.vehicle_type ||
        'SUV'
      ).toUpperCase();

      const usage = (
        cust?.usage ||
        quotation?.usage ||
        cov?.usage ||
        cov?.vehicle_usage ||
        'PRIVATE'
      ).toUpperCase();

      const assuredName = cust
        ? `${cust.first_name} ${cust.last_name}`.trim().toUpperCase()
        : '—';

      const plateNumber = (
        cust?.plate_no ||
        quotation?.plate_no ||
        cov?.plate_no ||
        '—'
      ).toUpperCase();

      const totalPremium = Number((cust as any)?.total_premium || cust?.policy_premium || inv.total_amount || 0);
      const terms = Number(cust?.payment_terms || quotation?.payment_terms || 1);

      const verifiedPaymentsCount = (inv.payments || []).filter(
        (p) => p.verification_status === 'verified' || (p.verification_status as string)?.startsWith('REFLECTED')
      ).length;

      const invStatus = inv.status as string;
      const isCancelled =
        invStatus === 'cancelled' ||
        invStatus === 'voided' ||
        policy?.status?.toLowerCase() === 'cancelled' ||
        quotation?.status?.toLowerCase() === 'cancelled' ||
        cust?.policy_status?.toLowerCase() === 'cancelled' ||
        (cust as any)?.status?.toLowerCase() === 'cancelled';

      const agentMarkup = Number(
        cov.calculator?.agent_markup ||
        cov.agent_markup ||
        (cust as any)?.agent_markup ||
        (cust as any)?.commission ||
        0
      );

      const rawSubAgentMarkupVal = (cust as any)?.sub_agent_markup ?? cov.sub_agent_markup ?? cov.calculator?.sub_agent_markup;
      const subAgentMarkup = rawSubAgentMarkupVal !== undefined && rawSubAgentMarkupVal !== null && rawSubAgentMarkupVal !== ''
        ? Number(rawSubAgentMarkupVal)
        : 0;

      const rawSubAgentName = ((cust as any)?.sub_agent_name || cov.sub_agent_name || (cov as any)?.subAgentName || '').trim();
      const subAgentName = rawSubAgentName ? rawSubAgentName.toUpperCase() : (agentName ? agentName.toUpperCase() : '—');

      // ── Main Agent Commission Data & Releases ──
      const mainComm = (inv as any).main_agent_commission || (inv as any).mainAgentCommission || {};
      const mainTransac = mainComm.transac || '—';
      const mainReleasedTo = mainComm.released_to || agentName || '—';
      const mainAccountNumber = mainComm.account_number || '—';
      const mainRelDate1 = mainComm.released_date_1 || null;
      const mainAmt1 = Number(mainComm.amount_1 || 0);
      const mainRelDate2 = mainComm.released_date_2 || null;
      const mainAmt2 = Number(mainComm.amount_2 || 0);
      const mainRelDate3 = mainComm.released_date_3 || null;
      const mainAmt3 = Number(mainComm.amount_3 || 0);
      const mainRelDate4 = mainComm.released_date_4 || null;
      const mainAmt4 = Number(mainComm.amount_4 || 0);
      const mainRefundDate = mainComm.refund_date || null;
      const mainRefundAmount = Number(mainComm.refund_amount || 0);
      const mainRefundNotes = mainComm.refund_notes || '';
      const mainTotalReleased = mainAmt1 + mainAmt2 + mainAmt3 + mainAmt4;
      const mainNetReleased = mainTotalReleased - mainRefundAmount;
      const mainRemaining = Math.max(0, agentMarkup - mainNetReleased);
      const mainIsOverpaid = mainTotalReleased > agentMarkup && agentMarkup > 0;
      const mainOverpaidAmount = Math.max(0, mainTotalReleased - agentMarkup);
      const mainActiveReleasesCount = [mainAmt1 > 0, mainAmt2 > 0, mainAmt3 > 0, mainAmt4 > 0].filter(Boolean).length;

      let mainPaymentStatus = 'UNPAID';
      let mainRemarks = '—';

      if (isCancelled) {
        mainPaymentStatus = 'CANCELLED';
        mainRemarks = 'CANCELLED POLICY';
      } else if (mainTotalReleased > 0) {
        if (mainIsOverpaid && mainRefundAmount < mainOverpaidAmount) {
          mainPaymentStatus = 'OVERPAID';
          mainRemarks = `Overpaid ₱${mainOverpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Refund Due)`;
        } else if (mainRefundAmount > 0) {
          mainPaymentStatus = 'REFUNDED';
          mainRemarks = `Refunded ₱${mainRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        } else if (mainNetReleased >= agentMarkup && agentMarkup > 0) {
          mainPaymentStatus = 'FULLY RELEASED';
          mainRemarks = 'ALREADY RELEASED TOTAL COMM';
        } else {
          mainPaymentStatus = mainActiveReleasesCount === 1 ? '1ST REL' : mainActiveReleasesCount === 2 ? '2ND REL' : mainActiveReleasesCount === 3 ? '3RD REL' : `${mainActiveReleasesCount}TH REL`;
          mainRemarks = `Released ₱${mainNetReleased.toLocaleString(undefined, { minimumFractionDigits: 2 })} (₱${mainRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} rem)`;
        }
      } else if (Number(inv.balance) <= 0 || inv.status === 'paid') {
        mainPaymentStatus = 'FULLY PAID';
        mainRemarks = 'Fully Paid • Ready for Release';
      } else if (verifiedPaymentsCount === 1) {
        mainPaymentStatus = '1ST PAYMENT';
        mainRemarks = '1st Installment Verified';
      } else if (verifiedPaymentsCount === 2) {
        mainPaymentStatus = '2ND PAYMENT';
        mainRemarks = '2nd Installment Verified';
      } else if (verifiedPaymentsCount === 3) {
        mainPaymentStatus = '3RD PAYMENT';
        mainRemarks = '3rd Installment Verified';
      } else if (verifiedPaymentsCount > 3) {
        mainPaymentStatus = `${verifiedPaymentsCount}TH PAYMENT`;
        mainRemarks = `${verifiedPaymentsCount}th Installment Verified`;
      }

      // ── Sub Agent Commission Data & Releases ──
      const subComm = (inv as any).subagent_commission || (inv as any).subagentCommission || {};
      const subTransac = subComm.transac || '—';
      const subReleasedTo = subComm.released_to || rawSubAgentName || '—';
      const subAccountNumber = subComm.account_number || '—';
      const subRelDate1 = subComm.released_date_1 || null;
      const subAmt1 = Number(subComm.amount_1 || 0);
      const subRelDate2 = subComm.released_date_2 || null;
      const subAmt2 = Number(subComm.amount_2 || 0);
      const subRelDate3 = subComm.released_date_3 || null;
      const subAmt3 = Number(subComm.amount_3 || 0);
      const subRelDate4 = subComm.released_date_4 || null;
      const subAmt4 = Number(subComm.amount_4 || 0);
      const subRefundDate = subComm.refund_date || null;
      const subRefundAmount = Number(subComm.refund_amount || 0);
      const subRefundNotes = subComm.refund_notes || '';
      const subTotalReleased = subAmt1 + subAmt2 + subAmt3 + subAmt4;
      const subNetReleased = subTotalReleased - subRefundAmount;
      const subRemaining = Math.max(0, subAgentMarkup - subNetReleased);
      const subIsOverpaid = subTotalReleased > subAgentMarkup && subAgentMarkup > 0;
      const subOverpaidAmount = Math.max(0, subTotalReleased - subAgentMarkup);
      const subActiveReleasesCount = [subAmt1 > 0, subAmt2 > 0, subAmt3 > 0, subAmt4 > 0].filter(Boolean).length;

      let subPaymentStatus = 'UNPAID';
      let subRemarks = '—';

      if (isCancelled) {
        subPaymentStatus = 'CANCELLED';
        subRemarks = 'CANCELLED POLICY';
      } else if (subTotalReleased > 0) {
        if (subIsOverpaid && subRefundAmount < subOverpaidAmount) {
          subPaymentStatus = 'OVERPAID';
          subRemarks = `Overpaid ₱${subOverpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Refund Due)`;
        } else if (subRefundAmount > 0) {
          subPaymentStatus = 'REFUNDED';
          subRemarks = `Refunded ₱${subRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        } else if (subNetReleased >= subAgentMarkup && subAgentMarkup > 0) {
          subPaymentStatus = 'FULLY RELEASED';
          subRemarks = 'ALREADY RELEASED TOTAL COMM';
        } else {
          subPaymentStatus = subActiveReleasesCount === 1 ? '1ST REL' : subActiveReleasesCount === 2 ? '2ND REL' : subActiveReleasesCount === 3 ? '3RD REL' : `${subActiveReleasesCount}TH REL`;
          subRemarks = `Released ₱${subNetReleased.toLocaleString(undefined, { minimumFractionDigits: 2 })} (₱${subRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} rem)`;
        }
      } else if (Number(inv.balance) <= 0 || inv.status === 'paid') {
        subPaymentStatus = 'FULLY PAID';
        subRemarks = 'Fully Paid • Ready for Release';
      } else if (verifiedPaymentsCount === 1) {
        subPaymentStatus = '1ST PAYMENT';
        subRemarks = '1st Installment Verified';
      } else if (verifiedPaymentsCount === 2) {
        subPaymentStatus = '2ND PAYMENT';
        subRemarks = '2nd Installment Verified';
      } else if (verifiedPaymentsCount === 3) {
        subPaymentStatus = '3RD PAYMENT';
        subRemarks = '3rd Installment Verified';
      } else if (verifiedPaymentsCount > 3) {
        subPaymentStatus = `${verifiedPaymentsCount}TH PAYMENT`;
        subRemarks = `${verifiedPaymentsCount}th Installment Verified`;
      }

      const estComm = agentMarkup;
      const estIncentive = Number((cust as any)?.incentive || 1000);

      const quotationNotes = (inv.policy as any)?.quotation?.notes || (inv as any).quotation?.notes || '';
      const underwriterRemarks = (inv.policy as any)?.quotation?.reviewer_remarks || (inv as any).quotation?.reviewer_remarks || '';
      const customerNotes = cust?.notes || '';
      const policyNotes = (inv.policy as any)?.notes || '';
      const invoiceNotes = (inv as any)?.notes && !(inv as any).notes.includes('Automatically generated invoice') ? (inv as any).notes : '';

      // Prioritize notes entered by Sales Agent / Team Renewal when preparing the quotation or customer record
      const notesCandidates = [
        quotationNotes,
        customerNotes,
        policyNotes,
        invoiceNotes,
        underwriterRemarks
      ].filter((n) => Boolean(n && typeof n === 'string' && n.trim() && n.trim() !== '—' && !n.includes('Automatically generated invoice')));

      const rawNotes = notesCandidates.length > 0 ? notesCandidates[0].trim() : '';
      const remarksNotes = rawNotes ? rawNotes : '—';
      const preparedByName = (inv.policy as any)?.quotation?.preparedBy?.name || (cust as any)?.createdBy?.name || agentName || '';

      // Find proof attachments from invoice attachments
      const allAtts: Attachment[] = (inv as any).attachments || [];
      const mainProofAtt1 = allAtts.find((att) => att.document_type === 'main_agent_release_proof_1');
      const mainProofAtt2 = allAtts.find((att) => att.document_type === 'main_agent_release_proof_2');
      const mainProofAtt3 = allAtts.find((att) => att.document_type === 'main_agent_release_proof_3');
      const mainProofAtt4 = allAtts.find((att) => att.document_type === 'main_agent_release_proof_4');
      const mainProofRefund = allAtts.find((att) => att.document_type === 'main_agent_refund_proof');

      const subProofAtt1 = allAtts.find((att) => att.document_type === 'subagent_release_proof_1');
      const subProofAtt2 = allAtts.find((att) => att.document_type === 'subagent_release_proof_2');
      const subProofAtt3 = allAtts.find((att) => att.document_type === 'subagent_release_proof_3');
      const subProofAtt4 = allAtts.find((att) => att.document_type === 'subagent_release_proof_4');
      const subProofRefund = allAtts.find((att) => att.document_type === 'subagent_refund_proof');

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        agentName,
        rawSubAgentName,
        subAgentName,
        dateRequestRaw,
        dateRequest,
        monthName,
        type: accountType,
        activity,
        provider,
        quotationUsed,
        usage,
        assuredName,
        plateNumber,
        totalPremium,
        terms,
        remarksNotes,
        quotationNotes,
        underwriterRemarks,
        customerNotes,
        policyNotes,
        preparedByName,
        incentive: estIncentive,
        comm: estComm,
        subAgentMarkup,
        isCancelled,

        // Main agent specific properties
        paymentStatus: mainPaymentStatus,
        remarks: mainRemarks,
        mainPaymentStatus,
        mainRemarks,
        mainTransac,
        mainReleasedTo,
        mainAccountNumber,
        mainRelDate1,
        mainAmt1,
        mainRelDate2,
        mainAmt2,
        mainRelDate3,
        mainAmt3,
        mainRelDate4,
        mainAmt4,
        mainRefundDate,
        mainRefundAmount,
        mainRefundNotes,
        mainProofAtt1,
        mainProofAtt2,
        mainProofAtt3,
        mainProofAtt4,
        mainProofRefund,
        mainTotalReleased,
        mainNetReleased,
        mainRemaining,
        mainIsOverpaid,
        mainOverpaidAmount,
        mainCommData: mainComm,

        // Sub agent specific properties
        subPaymentStatus,
        subRemarks,
        subTransac,
        subReleasedTo,
        subAccountNumber,
        subRelDate1,
        subAmt1,
        subRelDate2,
        subAmt2,
        subRelDate3,
        subAmt3,
        subRelDate4,
        subAmt4,
        subRefundDate,
        subRefundAmount,
        subRefundNotes,
        subProofAtt1,
        subProofAtt2,
        subProofAtt3,
        subProofAtt4,
        subProofRefund,
        subTotalReleased,
        subNetReleased,
        subRemaining,
        subIsOverpaid,
        subOverpaidAmount,
        subCommData: subComm,
      };
    });
  }, [rawInvoices]);

  // Filter rows by user selections
  const filteredRows = useMemo(() => {
    return commissionRows.filter((row) => {
      // In Sub-Agent tab: only include records that have a sub-agent name OR a sub-agent mark up inputted (> 0) OR recorded releases
      if (activeTab === 'subagent') {
        const hasSubAgentName = Boolean(row.rawSubAgentName && row.rawSubAgentName.trim());
        const hasSubAgentMarkup = Boolean(row.subAgentMarkup && row.subAgentMarkup > 0);
        const hasSubAgentReleases = Boolean(row.subTotalReleased && row.subTotalReleased > 0);

        if (!hasSubAgentName && !hasSubAgentMarkup && !hasSubAgentReleases) {
          return false;
        }
      }

      if (selectedMonth && !searchQuery && selectedAgent === 'all' && row.dateRequestRaw) {
        if (row.dateRequestRaw !== selectedMonth) {
          return false;
        }
      }
      if (selectedAgent !== 'all') {
        const selLower = selectedAgent.trim().toLowerCase();
        const rowAgentLower = row.agentName.trim().toLowerCase();
        const rowSubAgentLower = row.subAgentName.trim().toLowerCase();
        if (
          rowAgentLower !== selLower &&
          !rowAgentLower.includes(selLower) &&
          rowSubAgentLower !== selLower &&
          !rowSubAgentLower.includes(selLower)
        ) {
          return false;
        }
      }
      if (
        selectedProvider !== 'all' &&
        !row.provider.includes(selectedProvider.toUpperCase())
      ) {
        return false;
      }
      const currentStatus = activeTab === 'main' ? row.mainPaymentStatus : row.subPaymentStatus;
      if (
        selectedStatus !== 'all' &&
        currentStatus.toUpperCase() !== selectedStatus.toUpperCase()
      ) {
        return false;
      }
      if (selectedBalanceStatus !== 'all') {
        const isMain = activeTab === 'main';
        const targetVal = isMain ? row.comm : row.subAgentMarkup;
        const totalRel = isMain ? row.mainTotalReleased : row.subTotalReleased;
        const refAmt = isMain ? (row.mainRefundAmount || 0) : (row.subRefundAmount || 0);
        const remVal = isMain ? row.mainRemaining : row.subRemaining;

        const isExcessOverpaid = totalRel > targetVal && refAmt < (totalRel - targetVal);
        const hasRefund = refAmt > 0;
        const hasPendingBalance = !isExcessOverpaid && remVal > 0;
        const isSettled = !isExcessOverpaid && remVal === 0 && totalRel > 0;
        const isUnreleased = totalRel === 0;

        if (selectedBalanceStatus === 'overpaid' && !isExcessOverpaid) {
          return false;
        }
        if (selectedBalanceStatus === 'refunded' && !hasRefund) {
          return false;
        }
        if (selectedBalanceStatus === 'pending' && !hasPendingBalance) {
          return false;
        }
        if (selectedBalanceStatus === 'settled' && !isSettled) {
          return false;
        }
        if (selectedBalanceStatus === 'unreleased' && !isUnreleased) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          row.assuredName.toLowerCase().includes(q) ||
          row.agentName.toLowerCase().includes(q) ||
          row.subAgentName.toLowerCase().includes(q) ||
          row.plateNumber.toLowerCase().includes(q) ||
          row.provider.toLowerCase().includes(q) ||
          row.quotationUsed.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [commissionRows, selectedMonth, selectedAgent, selectedProvider, selectedStatus, selectedBalanceStatus, searchQuery, activeTab]);

  // Calculate totals
  const totalPremiumSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.totalPremium), 0),
    [filteredRows]
  );

  const totalCommSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.comm), 0),
    [filteredRows]
  );

  const totalMainAgentReleasedSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.mainTotalReleased), 0),
    [filteredRows]
  );

  const totalSubAgentMarkupSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.subAgentMarkup), 0),
    [filteredRows]
  );

  const totalSubAgentReleasedSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.subTotalReleased), 0),
    [filteredRows]
  );

  // Client-side pagination for table display
  const totalFilteredCount = filteredRows.length;
  const lastPage = Math.max(1, Math.ceil(totalFilteredCount / perPage));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, currentPage, perPage]);

  const fromIndex = totalFilteredCount > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const toIndex = Math.min(currentPage * perPage, totalFilteredCount);

  // Main Commission Table Columns
  const mainColumns = [
    {
      key: 'agentName',
      label: 'AGENT',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-bold text-slate-800 uppercase text-[10px]">
          {row.agentName}
        </span>
      ),
    },
    {
      key: 'dateRequest',
      label: 'DATE',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="text-slate-600 text-[10px] font-mono">{row.dateRequest}</span>
      ),
    },
    {
      key: 'type',
      label: 'TYPE',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {row.type}
        </span>
      ),
    },
    {
      key: 'activity',
      label: 'ACTIVITY',
      className: 'max-w-[90px] truncate',
      render: (row: any) => (
        <span className="text-slate-600 text-[10px] font-medium truncate block" title={row.activity}>{row.activity}</span>
      ),
    },
    {
      key: 'provider',
      label: 'PROVIDER',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span
          className={`inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
            row.provider.includes('CBIC')
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-[#4A0E17]/10 text-[#4A0E17] border border-[#4A0E17]/20'
          }`}
        >
          {row.provider}
        </span>
      ),
    },
    {
      key: 'quotationUsed',
      label: 'QUOTATION',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-bold text-slate-800 text-[10px]">{row.quotationUsed}</span>
      ),
    },
    {
      key: 'usage',
      label: 'USAGE',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="text-slate-600 text-[10px]">{row.usage}</span>
      ),
    },
    {
      key: 'assuredName',
      label: 'ASSURED NAME',
      className: 'max-w-[100px] truncate',
      render: (row: any) => (
        <span className="font-bold text-slate-900 text-[10px] uppercase truncate block" title={row.assuredName}>
          {row.assuredName}
        </span>
      ),
    },
    {
      key: 'plateNumber',
      label: 'PLATE NO.',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[10px] font-semibold text-slate-700">
          {row.plateNumber}
        </span>
      ),
    },
    {
      key: 'totalPremium',
      label: 'PREMIUM',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[10px] font-bold text-emerald-700">
          ₱{formatAmount(row.totalPremium)}
        </span>
      ),
    },
    {
      key: 'terms',
      label: 'TERMS',
      className: 'text-center whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[10px] font-bold text-slate-700">
          {row.terms}
        </span>
      ),
    },
    {
      key: 'remarksNotes',
      label: 'NOTES',
      className: 'text-center whitespace-nowrap w-12',
      render: (row: any) => {
        if (!row.remarksNotes || row.remarksNotes === '—') {
          return <span className="text-slate-350 text-[10px]">—</span>;
        }

        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedNotesModal({
                title: `${row.assuredName} (${row.plateNumber || 'No Plate'})`,
                author: row.preparedByName,
                notes: row.remarksNotes,
                quotationNotes: row.quotationNotes,
                underwriterRemarks: row.underwriterRemarks,
                customerNotes: row.customerNotes,
              })}
              className="p-1 text-[#4A0E17] hover:bg-[#4A0E17]/10 rounded-lg transition cursor-pointer hover:scale-110"
              title={`View Notes: ${row.remarksNotes}`}
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      key: 'incentive',
      label: 'INCENTIVE',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[10px] font-bold text-amber-700">
          {!row.isCancelled && row.incentive > 0
            ? `₱${formatAmount(row.incentive)}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'comm',
      label: 'COMM',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[10px] font-bold text-[#4A0E17]">
          {!row.isCancelled && row.comm > 0
            ? `₱${formatAmount(row.comm)}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'STATUS',
      className: 'whitespace-nowrap',
      render: (row: any) => {
        if (row.isCancelled) {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              CANCELLED
            </span>
          );
        }
        if (row.paymentStatus === 'OVERPAID') {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
              🚨 OVERPAID
            </span>
          );
        }
        if (row.paymentStatus === 'REFUNDED') {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
              💜 REFUNDED
            </span>
          );
        }
        if (row.paymentStatus === 'FULLY RELEASED' || row.paymentStatus === 'FULLY PAID') {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              {row.paymentStatus}
            </span>
          );
        }
        if (row.paymentStatus.includes('REL')) {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              {row.paymentStatus}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase">
            {row.paymentStatus}
          </span>
        );
      },
    },
    {
      key: 'remarks',
      label: 'REMARKS',
      className: 'max-w-[120px] truncate',
      render: (row: any) => {
        const isHighlight = row.remarks.includes('ALREADY RELEASED') || row.remarks.includes('Total Comm');
        const isOverpaid = row.remarks.includes('Overpaid');
        const isRefund = row.remarks.includes('Refund');
        return (
          <span
            title={row.remarks}
            className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded truncate block ${
              isHighlight
                ? 'bg-amber-100 text-amber-950 font-bold border border-amber-200'
                : isOverpaid
                ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                : isRefund
                ? 'bg-purple-50 text-purple-700 font-bold border border-purple-200'
                : row.isCancelled
                ? 'text-rose-700 font-bold'
                : 'text-slate-600'
            }`}
          >
            {row.remarks}
          </span>
        );
      },
    },
  ];

  // Main Agent Manage Commission Table Columns (mirrors Sub-Agent structure for releases & management)
  const mainManageColumns = [
    {
      key: 'dateRequest',
      label: 'REQUEST',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="text-slate-600 text-[9.5px] font-mono">{row.dateRequest}</span>
      ),
    },
    {
      key: 'monthName',
      label: 'MONTH',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="text-slate-700 text-[9.5px] font-semibold">{row.monthName}</span>
      ),
    },
    {
      key: 'agentName',
      label: 'AGENT',
      className: 'whitespace-nowrap max-w-[95px] truncate',
      render: (row: any) => (
        <span className="font-bold text-slate-800 uppercase text-[9.5px] truncate block" title={row.agentName}>
          {row.agentName}
        </span>
      ),
    },
    {
      key: 'assuredName',
      label: 'ASSURED NAME',
      className: 'max-w-[110px] truncate',
      render: (row: any) => (
        <span className="font-bold text-slate-900 text-[9.5px] uppercase truncate block" title={row.assuredName}>
          {row.assuredName}
        </span>
      ),
    },
    {
      key: 'plateNumber',
      label: 'PLATE NO.',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-semibold text-slate-700">
          {row.plateNumber}
        </span>
      ),
    },
    {
      key: 'comm',
      label: 'COMMISSION',
      className: 'whitespace-nowrap bg-amber-50/50',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-extrabold text-[#4A0E17]">
          ₱{formatAmount(row.comm)}
        </span>
      ),
    },
    {
      key: 'totalPremium',
      label: 'PREMIUM',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-bold text-emerald-700">
          ₱{formatAmount(row.totalPremium)}
        </span>
      ),
    },
    {
      key: 'terms',
      label: 'TERMS',
      className: 'text-center whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-bold text-slate-700">
          {row.terms}
        </span>
      ),
    },
    {
      key: 'remarksNotes',
      label: 'NOTES',
      className: 'text-center whitespace-nowrap w-12',
      render: (row: any) => {
        if (!row.remarksNotes || row.remarksNotes === '—') {
          return <span className="text-slate-350 text-[10px]">—</span>;
        }

        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedNotesModal({
                title: `${row.assuredName} (${row.plateNumber || 'No Plate'})`,
                author: row.preparedByName,
                notes: row.remarksNotes,
                quotationNotes: row.quotationNotes,
                underwriterRemarks: row.underwriterRemarks,
                customerNotes: row.customerNotes,
              })}
              className="p-1 text-[#4A0E17] hover:bg-[#4A0E17]/10 rounded-lg transition cursor-pointer hover:scale-110"
              title={`View Notes: ${row.remarksNotes}`}
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      key: 'transac',
      label: 'TRANSAC',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-bold text-[9px] text-slate-800 uppercase px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
          {row.mainTransac}
        </span>
      ),
    },
    {
      key: 'releasedTo',
      label: 'RELEASED TO',
      className: 'max-w-[90px] truncate',
      render: (row: any) => (
        <span className="text-slate-800 text-[9.5px] font-semibold uppercase truncate block" title={row.mainReleasedTo}>
          {row.mainReleasedTo}
        </span>
      ),
    },
    {
      key: 'accountNumber',
      label: 'ACCOUNT NO.',
      className: 'whitespace-nowrap font-mono max-w-[85px] truncate',
      render: (row: any) => (
        <span className="text-slate-600 text-[9.5px] truncate block" title={row.mainAccountNumber}>{row.mainAccountNumber}</span>
      ),
    },
    {
      key: 'rel1',
      label: 'REL 1',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.mainRelDate1 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.mainRelDate1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.mainAmt1 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.mainAmt1 > 0 ? `₱${formatAmount(row.mainAmt1)}` : '—'}
            </span>
            {row.mainProofAtt1 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.mainProofAtt1)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 1 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'rel2',
      label: 'REL 2',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.mainRelDate2 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.mainRelDate2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.mainAmt2 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.mainAmt2 > 0 ? `₱${formatAmount(row.mainAmt2)}` : '—'}
            </span>
            {row.mainProofAtt2 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.mainProofAtt2)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 2 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'rel3',
      label: 'REL 3',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.mainRelDate3 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.mainRelDate3).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.mainAmt3 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.mainAmt3 > 0 ? `₱${formatAmount(row.mainAmt3)}` : '—'}
            </span>
            {row.mainProofAtt3 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.mainProofAtt3)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 3 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'rel4',
      label: 'REL 4',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.mainRelDate4 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.mainRelDate4).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.mainAmt4 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.mainAmt4 > 0 ? `₱${formatAmount(row.mainAmt4)}` : '—'}
            </span>
            {row.mainProofAtt4 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.mainProofAtt4)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 4 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'remaining',
      label: 'REMAINING',
      className: 'whitespace-nowrap font-mono',
      render: (row: any) => {
        const targetMarkup = row.comm || 0;
        const netReleased = row.mainTotalReleased - (row.mainRefundAmount || 0);
        const diff = targetMarkup - netReleased;
        const isExcess = row.mainTotalReleased > targetMarkup;
        const overpaidAmt = row.mainTotalReleased - targetMarkup;

        if (row.mainRefundAmount > 0) {
          const isFullySettled = netReleased <= targetMarkup;
          return (
            <div className="flex flex-col items-center leading-tight">
              <span className={`text-[9.5px] font-black ${isFullySettled ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isFullySettled ? '₱0.00' : `OVER: ₱${formatAmount(Math.abs(diff))}`}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1 py-0.5 rounded" title={`Refunded: ₱${formatAmount(row.mainRefundAmount)} on ${row.mainRefundDate || 'N/A'}`}>
                  ↩ ₱${formatAmount(row.mainRefundAmount)}
                </span>
                {row.mainProofRefund && (
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(row.mainProofRefund)}
                    className="p-0.5 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded transition cursor-pointer"
                    title="View Refund Proof Attachment"
                  >
                    <Upload className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (isExcess) {
          return (
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                OVERPAID ₱{formatAmount(overpaidAmt)}
              </span>
              <span className="text-[8px] font-extrabold text-rose-600 mt-0.5 flex items-center gap-0.5">
                <RotateCcw className="h-2.5 w-2.5" /> Refund Due
              </span>
            </div>
          );
        }

        const rem = Math.max(0, targetMarkup - row.mainTotalReleased);
        return (
          <span className={`text-[9.5px] font-black ${rem > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
            {rem > 0 ? `₱${formatAmount(rem)}` : '—'}
          </span>
        );
      },
    },
    ...(isAccountingOrAdmin
      ? [
          {
            key: 'action',
            label: 'ACTION',
            className: 'whitespace-nowrap text-center no-print',
            render: (row: any) => {
              if (row.isCancelled) {
                return (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed uppercase"
                    title="Cancelled policy cannot manage commission"
                  >
                    Cancelled
                  </span>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => setEditingSubagentRecord({ ...row, isMainAgent: true, targetComm: row.comm, titleLabel: 'Main Agent Commission' })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[9px] font-bold transition cursor-pointer"
                  title="Edit Release"
                >
                  <Edit2 className="h-2.5 w-2.5 text-amber-700" /> Edit
                </button>
              );
            },
          },
        ]
      : []),
  ];

  // Sub-Agent Commission Table Columns with Proof attachment preview support
  const subAgentColumns = [
    {
      key: 'dateRequest',
      label: 'REQUEST',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="text-slate-600 text-[9.5px] font-mono">{row.dateRequest}</span>
      ),
    },
    {
      key: 'monthName',
      label: 'MONTH',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="text-slate-700 text-[9.5px] font-semibold">{row.monthName}</span>
      ),
    },
    {
      key: 'subAgentName',
      label: 'SUB-AGENT',
      className: 'whitespace-nowrap max-w-[95px] truncate',
      render: (row: any) => (
        <div>
          <span className="font-bold text-slate-800 uppercase text-[9.5px] truncate block" title={row.rawSubAgentName || row.subAgentName}>
            {row.rawSubAgentName ? row.rawSubAgentName.toUpperCase() : row.agentName}
          </span>
          {row.rawSubAgentName && row.agentName && (
            <span className="text-[8px] text-slate-400 font-medium block truncate" title={`Agent: ${row.agentName}`}>
              By: {row.agentName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'assuredName',
      label: 'ASSURED NAME',
      className: 'max-w-[110px] truncate',
      render: (row: any) => (
        <span className="font-bold text-slate-900 text-[9.5px] uppercase truncate block" title={row.assuredName}>
          {row.assuredName}
        </span>
      ),
    },
    {
      key: 'plateNumber',
      label: 'PLATE NO.',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-semibold text-slate-700">
          {row.plateNumber}
        </span>
      ),
    },
    {
      key: 'subAgentMarkup',
      label: 'MARK UP',
      className: 'whitespace-nowrap bg-amber-50/50',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-extrabold text-amber-900">
          ₱{formatAmount(row.subAgentMarkup)}
        </span>
      ),
    },
    {
      key: 'totalPremium',
      label: 'PREMIUM',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-bold text-emerald-700">
          ₱{formatAmount(row.totalPremium)}
        </span>
      ),
    },
    {
      key: 'terms',
      label: 'TERMS',
      className: 'text-center whitespace-nowrap',
      render: (row: any) => (
        <span className="font-mono text-[9.5px] font-bold text-slate-700">
          {row.terms}
        </span>
      ),
    },
    {
      key: 'remarksNotes',
      label: 'NOTES',
      className: 'text-center whitespace-nowrap w-12',
      render: (row: any) => {
        if (!row.remarksNotes || row.remarksNotes === '—') {
          return <span className="text-slate-350 text-[10px]">—</span>;
        }

        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedNotesModal({
                title: `${row.assuredName} (${row.plateNumber || 'No Plate'})`,
                author: row.preparedByName,
                notes: row.remarksNotes,
                quotationNotes: row.quotationNotes,
                underwriterRemarks: row.underwriterRemarks,
                customerNotes: row.customerNotes,
              })}
              className="p-1 text-[#4A0E17] hover:bg-[#4A0E17]/10 rounded-lg transition cursor-pointer hover:scale-110"
              title={`View Notes: ${row.remarksNotes}`}
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      key: 'transac',
      label: 'TRANSAC',
      className: 'whitespace-nowrap',
      render: (row: any) => (
        <span className="font-bold text-[9px] text-slate-800 uppercase px-1 py-0.5 rounded bg-slate-100 border border-slate-200">
          {row.subTransac}
        </span>
      ),
    },
    {
      key: 'releasedTo',
      label: 'RELEASED TO',
      className: 'max-w-[90px] truncate',
      render: (row: any) => (
        <span className="text-slate-800 text-[9.5px] font-semibold uppercase truncate block" title={row.subReleasedTo}>
          {row.subReleasedTo}
        </span>
      ),
    },
    {
      key: 'accountNumber',
      label: 'ACCOUNT NO.',
      className: 'whitespace-nowrap font-mono max-w-[85px] truncate',
      render: (row: any) => (
        <span className="text-slate-600 text-[9.5px] truncate block" title={row.subAccountNumber}>{row.subAccountNumber}</span>
      ),
    },
    {
      key: 'rel1',
      label: 'REL 1',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.subRelDate1 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.subRelDate1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.subAmt1 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.subAmt1 > 0 ? `₱${formatAmount(row.subAmt1)}` : '—'}
            </span>
            {row.subProofAtt1 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.subProofAtt1)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 1 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'rel2',
      label: 'REL 2',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.subRelDate2 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.subRelDate2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.subAmt2 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.subAmt2 > 0 ? `₱${formatAmount(row.subAmt2)}` : '—'}
            </span>
            {row.subProofAtt2 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.subProofAtt2)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 2 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'rel3',
      label: 'REL 3',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.subRelDate3 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.subRelDate3).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.subAmt3 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.subAmt3 > 0 ? `₱${formatAmount(row.subAmt3)}` : '—'}
            </span>
            {row.subProofAtt3 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.subProofAtt3)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 3 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'rel4',
      label: 'REL 4',
      className: 'whitespace-nowrap text-center',
      render: (row: any) => (
        <div className="flex flex-col items-center leading-tight">
          {row.subRelDate4 ? (
            <span className="text-[8.5px] text-slate-500 font-mono">{new Date(row.subRelDate4).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ) : (
            <span className="text-[8.5px] text-slate-350">—</span>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`font-mono text-[9.5px] font-bold ${row.subAmt4 > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {row.subAmt4 > 0 ? `₱${formatAmount(row.subAmt4)}` : '—'}
            </span>
            {row.subProofAtt4 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(row.subProofAtt4)}
                className="p-0.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition cursor-pointer"
                title="View Release 4 Proof Attachment"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'remaining',
      label: 'REMAINING',
      className: 'whitespace-nowrap font-mono',
      render: (row: any) => {
        const netReleased = row.subTotalReleased - (row.subRefundAmount || 0);
        const diff = row.subAgentMarkup - netReleased;
        const isExcess = row.subTotalReleased > row.subAgentMarkup;
        const overpaidAmt = row.subTotalReleased - row.subAgentMarkup;

        if (row.subRefundAmount > 0) {
          const isFullySettled = netReleased <= row.subAgentMarkup;
          return (
            <div className="flex flex-col items-center leading-tight">
              <span className={`text-[9.5px] font-black ${isFullySettled ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isFullySettled ? '₱0.00' : `OVER: ₱${formatAmount(Math.abs(diff))}`}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1 py-0.5 rounded" title={`Refunded: ₱${formatAmount(row.subRefundAmount)} on ${row.subRefundDate || 'N/A'}`}>
                  ↩ ₱${formatAmount(row.subRefundAmount)}
                </span>
                {row.subProofRefund && (
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(row.subProofRefund)}
                    className="p-0.5 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded transition cursor-pointer"
                    title="View Refund Proof Attachment"
                  >
                    <Upload className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (isExcess) {
          return (
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                OVERPAID ₱{formatAmount(overpaidAmt)}
              </span>
              <span className="text-[8px] font-extrabold text-rose-600 mt-0.5 flex items-center gap-0.5">
                <RotateCcw className="h-2.5 w-2.5" /> Refund Due
              </span>
            </div>
          );
        }

        return (
          <span className={`text-[9.5px] font-black ${row.subRemaining > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
            {row.subRemaining > 0 ? `₱${formatAmount(row.subRemaining)}` : '—'}
          </span>
        );
      },
    },
    ...(isAccountingOrAdmin
      ? [
          {
            key: 'action',
            label: 'ACTION',
            className: 'whitespace-nowrap text-center no-print',
            render: (row: any) => {
              if (row.isCancelled) {
                return (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed uppercase"
                    title="Cancelled policy cannot manage commission"
                  >
                    Cancelled
                  </span>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => setEditingSubagentRecord({ ...row, isMainAgent: false, targetComm: row.subAgentMarkup, titleLabel: 'Sub-Agent & Referral Commission' })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[9px] font-bold transition cursor-pointer"
                  title="Edit Release"
                >
                  <Edit2 className="h-2.5 w-2.5 text-amber-700" /> Edit
                </button>
              );
            },
          },
        ]
      : []),
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3">
      {/* Sleek Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Summary Commission
            </h1>
            {!isAccountingOrAdmin && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                <Eye className="h-3 w-3 text-amber-600" /> Viewing Mode (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Agent & Sub-Agent commission tracking & tariff breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" /> Print Statement
          </button>
        </div>
      </div>

      {/* Sleek Segmented Tab Control */}
      <div className="inline-flex items-center p-1 bg-slate-200/60 border border-slate-200/90 rounded-2xl no-print shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('main');
            setCurrentPage(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            activeTab === 'main'
              ? 'bg-white text-[#4A0E17] shadow-sm border border-slate-200/60 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Briefcase className={`h-4 w-4 ${activeTab === 'main' ? 'text-[#4A0E17]' : 'text-slate-400'}`} />
          Main Agent Commission
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('subagent');
            setCurrentPage(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            activeTab === 'subagent'
              ? 'bg-white text-[#4A0E17] shadow-sm border border-slate-200/60 ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Users className={`h-4 w-4 ${activeTab === 'subagent' ? 'text-[#4A0E17]' : 'text-slate-400'}`} />
          Sub-Agent & Referral Commission
        </button>
      </div>

      {/* Clean KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 no-print">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Premium</p>
            <p className="text-base font-black text-slate-900 font-mono mt-0.5">₱{formatAmount(totalPremiumSum)}</p>
          </div>
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>

        {activeTab === 'main' ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Agent Comm</p>
                <p className="text-base font-black text-[#4A0E17] font-mono mt-0.5">
                  {totalCommSum > 0 ? `₱${formatAmount(totalCommSum)}` : '₱0.00'}
                </p>
              </div>
              <div className="p-2 bg-[#4A0E17]/10 rounded-xl text-[#4A0E17]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Incentive</p>
                <p className="text-base font-black text-amber-700 font-mono mt-0.5">
                  {filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.incentive), 0) > 0
                    ? `₱${formatAmount(filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.incentive), 0))}`
                    : '₱0.00'}
                </p>
              </div>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sub-Agent Markup</p>
                <p className="text-base font-black text-amber-900 font-mono mt-0.5">
                  {totalSubAgentMarkupSum > 0 ? `₱${formatAmount(totalSubAgentMarkupSum)}` : '₱0.00'}
                </p>
              </div>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-800">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Released</p>
                <p className="text-base font-black text-emerald-800 font-mono mt-0.5">
                  {totalSubAgentReleasedSum > 0 ? `₱${formatAmount(totalSubAgentReleasedSum)}` : '₱0.00'}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Accounts</p>
            <p className="text-base font-black text-slate-800 font-mono mt-0.5">{filteredRows.filter((r) => !r.isCancelled).length}</p>
          </div>
          <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
            <Layers className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 no-print shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search assured, agent, plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-[#4A0E17]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                className="text-[10px] font-extrabold text-[#4A0E17] hover:bg-[#4A0E17]/10 px-1 py-0.5 rounded transition cursor-pointer"
                title="Show All Months"
              >
                ALL
              </button>
            )}
          </div>

          {/* Agent Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shrink-0">
            <Briefcase className="h-3.5 w-3.5 text-[#4A0E17]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer max-w-[130px]"
            >
              <option value="all">All Agents</option>
              {availableAgents.map((ag) => (
                <option key={ag.name} value={ag.name}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shrink-0">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Providers</option>
              <option value="ALPHA">ALPHA Insurance</option>
              <option value="CBIC">CBIC Insurance</option>
            </select>
          </div>

          {/* Balance / Overpayment / Refund Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shrink-0">
            <DollarSign className="h-3.5 w-3.5 text-[#4A0E17]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Balance:</span>
            <select
              value={selectedBalanceStatus}
              onChange={(e) => setSelectedBalanceStatus(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Balances</option>
              <option value="overpaid">🚨 Overpaid (Refund Due)</option>
              <option value="refunded">💜 Refunded</option>
              <option value="pending">⏳ With Balance</option>
              <option value="settled">✅ Settled</option>
              <option value="unreleased">⚪ Unreleased</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Spreadsheet Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-3.5 py-2.5 bg-[#4A0E17]/5 border-b border-[#4A0E17]/10 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#4A0E17]" />
            <span className="font-extrabold text-xs text-[#4A0E17] uppercase tracking-wider">
              {activeTab === 'main' 
                ? (showManageCommissionMain ? 'MAIN AGENT COMMISSION MANAGEMENT' : 'MAIN AGENT COMMISSION LEDGER') 
                : 'SUB-AGENT COMMISSION AND REFERRAL STATEMENT'} — {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase() : 'ALL MONTHS'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'main' && (
              <button
                type="button"
                onClick={() => setShowManageCommissionMain(!showManageCommissionMain)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs ${
                  showManageCommissionMain
                    ? 'bg-[#4A0E17] text-white hover:bg-[#5A121D] ring-2 ring-[#4A0E17]/30'
                    : 'bg-white text-[#4A0E17] hover:bg-[#4A0E17]/10 border border-[#4A0E17]/30'
                }`}
                title={showManageCommissionMain ? 'Switch to Standard Overview' : 'Switch to Manage Commission Release View'}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{showManageCommissionMain ? 'Standard Overview' : 'Manage Commission'}</span>
              </button>
            )}

            <span className="text-[11px] font-bold text-slate-500 font-mono bg-white/80 border border-slate-200/80 px-2 py-0.5 rounded-lg">
              {filteredRows.length} RECORDS
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <DataTable
            dense
            columns={
              activeTab === 'subagent'
                ? subAgentColumns
                : showManageCommissionMain
                ? mainManageColumns
                : mainColumns
            }
            data={paginatedRows}
            loading={isLoading}
          />
        </div>

        {totalFilteredCount > 0 && (
          <div className="p-2.5 border-t border-slate-100 no-print">
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              perPage={perPage}
              total={totalFilteredCount}
              from={fromIndex}
              to={toIndex}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        {/* Freebie Attachment Modal */}
        {freebieModalTarget && (
          <FreebieAttachmentModal
            isOpen={Boolean(freebieModalTarget)}
            onClose={() => setFreebieModalTarget(null)}
            attachableType="invoice"
            attachableId={freebieModalTarget.invoiceId || freebieModalTarget.id}
            title={freebieModalTarget.quotationNo || freebieModalTarget.refNo || `RECORD-${freebieModalTarget.id}`}
            customerName={freebieModalTarget.customerName}
            isCancelled={Boolean(
              freebieModalTarget.status === 'cancelled' ||
              freebieModalTarget.status === 'voided'
            )}
            onAttachmentUploaded={() => refetch()}
          />
        )}

        {/* Sub-Agent Commission Edit Modal (Accounting & Admin Only) */}
        {editingSubagentRecord && (
          <SubagentCommissionModal
            record={editingSubagentRecord}
            onClose={() => setEditingSubagentRecord(null)}
            onSuccess={() => {
              setEditingSubagentRecord(null);
              refetch();
            }}
          />
        )}

        {/* Notes Viewer Modal */}
        {selectedNotesModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
            onClick={() => setSelectedNotesModal(null)}
          >
            <div
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4A0E17] to-[#5A121D] text-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <FileText className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Policy Notes & Remarks</h3>
                    <p className="text-xs text-amber-100/80 font-medium">{selectedNotesModal.title}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotesModal(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {selectedNotesModal.author && (
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Prepared By:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedNotesModal.author}</span>
                  </div>
                )}

                {selectedNotesModal.quotationNotes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-[#4A0E17] uppercase tracking-wider block">
                      Sales / Renewal Notes
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                      {selectedNotesModal.quotationNotes}
                    </p>
                  </div>
                )}

                {selectedNotesModal.customerNotes && selectedNotesModal.customerNotes !== selectedNotesModal.quotationNotes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                      Customer Profile Notes
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                      {selectedNotesModal.customerNotes}
                    </p>
                  </div>
                )}

                {selectedNotesModal.underwriterRemarks && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">
                      Underwriter Review Remarks
                    </span>
                    <p className="text-xs text-blue-900 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/80 whitespace-pre-wrap leading-relaxed">
                      {selectedNotesModal.underwriterRemarks}
                    </p>
                  </div>
                )}

                {!selectedNotesModal.quotationNotes && !selectedNotesModal.customerNotes && !selectedNotesModal.underwriterRemarks && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                      Notes
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                      {selectedNotesModal.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedNotesModal(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewAttachment && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-6 py-4 bg-[#4A0E17] text-white">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-5 w-5 text-amber-300 shrink-0" />
                  <span className="font-extrabold text-sm truncate">{previewAttachment.file_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadAttachment(previewAttachment.id, previewAttachment.file_name)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-grow flex items-center justify-center bg-slate-100 min-h-[300px]">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <Loader2 className="h-8 w-8 text-[#4A0E17] animate-spin" />
                    <span className="text-xs font-bold text-slate-600">Loading document preview...</span>
                  </div>
                ) : previewUrl ? (
                  previewAttachment.mime_type?.startsWith('image/') || previewAttachment.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={previewUrl}
                      alt={previewAttachment.file_name}
                      className="max-h-[65vh] max-w-full rounded-2xl shadow-md object-contain"
                    />
                  ) : previewAttachment.mime_type === 'application/pdf' || previewAttachment.file_name?.endsWith('.pdf') ? (
                    <iframe
                      src={previewUrl}
                      title={previewAttachment.file_name}
                      className="w-full h-[65vh] rounded-2xl shadow-md border border-slate-200"
                    />
                  ) : (
                    <div className="text-center py-12 px-6">
                      <FileText className="h-16 w-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-700">Preview not directly available for this file type</p>
                      <p className="text-xs text-slate-500 mt-1">Please click Download to save and view the file.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-rose-600 text-xs font-bold">
                    Failed to load file preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SubagentCommissionModalProps {
  record: any;
  onClose: () => void;
  onSuccess: () => void;
}

function SubagentCommissionModal({ record, onClose, onSuccess }: SubagentCommissionModalProps) {
  const { roles } = useAuth();
  const { showToast } = useToast();
  const isMainAgent = Boolean(record.isMainAgent || record.titleLabel === 'Main Agent Commission');
  const commData = isMainAgent ? (record.mainCommData || {}) : (record.subCommData || {});

  const isAccountingOrAdmin = useMemo(() => {
    return roles.some((r) =>
      ['Accounting Officer', 'Accounting', 'Team Support Operation', 'Administrator', 'Owner', 'Super Admin'].includes(r)
    );
  }, [roles]);

  const [transac, setTransac] = useState<string>(commData.transac || 'CASH');
  const [releasedTo, setReleasedTo] = useState<string>(
    commData.released_to || (isMainAgent ? record.agentName : (record.rawSubAgentName || record.subAgentName)) || ''
  );
  const [accountNumber, setAccountNumber] = useState<string>(commData.account_number || '');

  const [relDate1, setRelDate1] = useState<string>(commData.released_date_1 || '');
  const [amt1, setAmt1] = useState<string>(commData.amount_1 !== undefined ? String(commData.amount_1) : '');

  const [relDate2, setRelDate2] = useState<string>(commData.released_date_2 || '');
  const [amt2, setAmt2] = useState<string>(commData.amount_2 !== undefined ? String(commData.amount_2) : '');

  const [relDate3, setRelDate3] = useState<string>(commData.released_date_3 || '');
  const [amt3, setAmt3] = useState<string>(commData.amount_3 !== undefined ? String(commData.amount_3) : '');

  const [relDate4, setRelDate4] = useState<string>(commData.released_date_4 || '');
  const [amt4, setAmt4] = useState<string>(commData.amount_4 !== undefined ? String(commData.amount_4) : '');

  const [refundDate, setRefundDate] = useState<string>(commData.refund_date || '');
  const [refundAmount, setRefundAmount] = useState<string>(commData.refund_amount !== undefined && Number(commData.refund_amount) > 0 ? String(commData.refund_amount) : '');
  const [refundNotes, setRefundNotes] = useState<string>(commData.refund_notes || '');
  const [uploadingRefundProof, setUploadingRefundProof] = useState<boolean>(false);

  const [notes, setNotes] = useState<string>(commData.notes || '');

  const [uploadingReleaseNum, setUploadingReleaseNum] = useState<number | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const handleOpenPreview = async (att: Attachment) => {
    setPreviewAttachment(att);
    setPreviewLoading(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const blob = await getAttachmentPreview(att.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      showToast('Failed to load attachment preview.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewAttachment(null);
  };

  // Fetch attachments for this invoice
  const { data: attachmentsRes, refetch: refetchAttachments } = useQuery({
    queryKey: ['attachments-invoice-comm', record.id],
    queryFn: () => getAttachments('invoice', record.id),
  });

  const attachments = attachmentsRes?.data || [];

  const getProofAttachment = (releaseNum: number) => {
    const docTypeKey = isMainAgent ? `main_agent_release_proof_${releaseNum}` : `subagent_release_proof_${releaseNum}`;
    return attachments.find(
      (att) => att.document_type === docTypeKey || (!isMainAgent && att.file_name?.toLowerCase().includes(`release_${releaseNum}`))
    );
  };

  const getRefundProofAttachment = () => {
    const docTypeKey = isMainAgent ? 'main_agent_refund_proof' : 'subagent_refund_proof';
    return attachments.find(
      (att) => att.document_type === docTypeKey || (!isMainAgent && att.file_name?.toLowerCase().includes('refund_proof'))
    );
  };

  const handleUploadProof = async (releaseNum: number, file: File) => {
    setUploadingReleaseNum(releaseNum);
    const docTypeKey = isMainAgent ? `main_agent_release_proof_${releaseNum}` : `subagent_release_proof_${releaseNum}`;
    try {
      await uploadAttachment('invoice', record.id, file, docTypeKey);
      showToast(`Proof attachment for Release ${releaseNum} uploaded successfully.`, 'success');
      refetchAttachments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload proof attachment.', 'error');
    } finally {
      setUploadingReleaseNum(null);
    }
  };

  const handleUploadRefundProof = async (file: File) => {
    setUploadingRefundProof(true);
    const docTypeKey = isMainAgent ? 'main_agent_refund_proof' : 'subagent_refund_proof';
    try {
      await uploadAttachment('invoice', record.id, file, docTypeKey);
      showToast('Refund proof attachment uploaded successfully.', 'success');
      refetchAttachments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload refund proof.', 'error');
    } finally {
      setUploadingRefundProof(false);
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeletingProof, setIsDeletingProof] = useState<boolean>(false);

  const handleConfirmDeleteProof = async () => {
    if (!deleteTargetId) return;
    setIsDeletingProof(true);
    try {
      await deleteAttachment(deleteTargetId);
      showToast('Proof attachment deleted.', 'info');
      refetchAttachments();
    } catch (err: any) {
      showToast('Failed to delete proof attachment.', 'error');
    } finally {
      setIsDeletingProof(false);
      setDeleteTargetId(null);
    }
  };

  const updateMut = useMutation({
    mutationFn: async () => {
      const payload = {
        transac,
        released_to: releasedTo,
        account_number: accountNumber,
        released_date_1: relDate1 || null,
        amount_1: amt1 ? parseFloat(amt1) : 0,
        released_date_2: relDate2 || null,
        amount_2: amt2 ? parseFloat(amt2) : 0,
        released_date_3: relDate3 || null,
        amount_3: amt3 ? parseFloat(amt3) : 0,
        released_date_4: relDate4 || null,
        amount_4: amt4 ? parseFloat(amt4) : 0,
        refund_date: refundDate || null,
        refund_amount: refundAmount ? parseFloat(refundAmount) : 0,
        refund_notes: refundNotes || null,
        notes: notes || null,
      };

      if (isMainAgent) {
        return await updateMainAgentCommission(record.id, payload);
      } else {
        return await updateSubagentCommission(record.id, payload);
      }
    },
    onSuccess: () => {
      showToast(`${record.titleLabel || (isMainAgent ? 'Main Agent' : 'Sub-Agent')} commission details saved successfully.`, 'success');
      onSuccess();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to update commission details.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate();
  };

  const calculatedTotalReleased =
    (parseFloat(amt1) || 0) +
    (parseFloat(amt2) || 0) +
    (parseFloat(amt3) || 0) +
    (parseFloat(amt4) || 0);

  const targetMarkup = record.targetComm !== undefined ? Number(record.targetComm) : Number(record.subAgentMarkup || record.comm || 0);
  const parsedRefundAmount = parseFloat(refundAmount) || 0;
  const calculatedNetReleased = calculatedTotalReleased - parsedRefundAmount;
  const isOverpaid = calculatedTotalReleased > targetMarkup;
  const overpaidAmount = Math.max(0, calculatedTotalReleased - targetMarkup);
  const remainingAfterRefund = targetMarkup - calculatedNetReleased;

  const renderReleaseCard = (
    releaseNum: number,
    label: string,
    relDate: string,
    setRelDate: (val: string) => void,
    amt: string,
    setAmt: (val: string) => void
  ) => {
    const proofAtt = getProofAttachment(releaseNum);

    return (
      <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">{label}</span>
          {proofAtt && (
            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Proof Attached
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">RELEASED DATE</label>
            <input
              type="date"
              value={relDate}
              onChange={(e) => setRelDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">AMOUNT (₱)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition"
            />
          </div>
        </div>

        {/* Clean Minimal Proof Attachment Section */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Proof Attachment
          </div>

          {proofAtt ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg truncate max-w-[110px]" title={proofAtt.file_name}>
                {proofAtt.file_name}
              </span>
              <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(proofAtt)}
                  className="p-1 hover:bg-white rounded text-slate-600 hover:text-blue-600 transition cursor-pointer"
                  title="Preview Document"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadAttachment(proofAtt.id, proofAtt.file_name)}
                  className="p-1 hover:bg-white rounded text-slate-600 hover:text-emerald-600 transition cursor-pointer"
                  title="Download Document"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {isAccountingOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(proofAtt.id)}
                    className="p-1 hover:bg-white rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : isAccountingOrAdmin ? (
            <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold cursor-pointer transition shadow-2xs">
              {uploadingReleaseNum === releaseNum ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4A0E17]" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{uploadingReleaseNum === releaseNum ? 'Uploading...' : 'Upload Proof'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadProof(releaseNum, e.target.files[0]);
                }}
              />
            </label>
          ) : (
            <span className="text-[10px] text-slate-400 italic">No proof attached</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Sleek Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4A0E17] via-[#5A121D] to-[#4A0E17] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 shadow-inner">
              {isMainAgent ? (
                <Briefcase className="h-5 w-5 text-amber-300" />
              ) : (
                <Users className="h-5 w-5 text-amber-300" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {record.titleLabel || (isMainAgent ? 'Main Agent Commission Settlement' : 'Sub-Agent Commission & Referral Details')}
              </h2>
              <p className="text-xs text-amber-100/85 font-medium">
                {record.assuredName} • Plate: {record.plateNumber} • Invoice #{record.invoiceNumber || record.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full hover:bg-white/10 text-amber-100 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {record.isCancelled && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>This policy is CANCELLED. Commission releases cannot be recorded or edited.</span>
            </div>
          )}

          {/* Refined Financial KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{record.titleLabel || 'Mark Up / Referral'}</span>
              <span className="text-sm font-black text-slate-900 font-mono">₱{targetMarkup.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Released</span>
              <span className="text-sm font-black text-emerald-800 font-mono">₱{calculatedTotalReleased.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Total Refunded</span>
              <span className="text-sm font-black text-purple-800 font-mono">₱{parsedRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isOverpaid && parsedRefundAmount < overpaidAmount ? 'text-rose-600' : 'text-slate-700'}`}>
                {isOverpaid && parsedRefundAmount < overpaidAmount ? 'Excess Overpayment' : 'Net Remaining'}
              </span>
              <span className={`text-sm font-black font-mono ${isOverpaid && parsedRefundAmount < overpaidAmount ? 'text-rose-700' : 'text-slate-900'}`}>
                ₱{Math.abs(remainingAfterRefund).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Overpayment Alert & Refund Section */}
          {(isOverpaid || parsedRefundAmount > 0) && (
            <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 text-purple-800 rounded-xl">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-purple-950 uppercase tracking-wide">
                      Overpayment & Refund Settlement
                    </h4>
                    <p className="text-[11px] text-purple-800 font-medium">
                      Total released (₱{calculatedTotalReleased.toLocaleString(undefined, { minimumFractionDigits: 2 })}) exceeds {record.titleLabel || 'Mark Up'} (₱{targetMarkup.toLocaleString(undefined, { minimumFractionDigits: 2 })}) by <strong className="text-rose-700">₱{overpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                </div>

                {overpaidAmount > 0 && parsedRefundAmount === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefundAmount(String(overpaidAmount));
                      if (!refundDate) {
                        setRefundDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10.5px] rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                  >
                    <RotateCcw className="h-3 w-3" /> Auto-fill Refund (₱{overpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-200/60">
                <div>
                  <label className="block text-[10px] font-bold text-purple-900 mb-1">
                    REFUND / RETURN DATE
                  </label>
                  <input
                    type="date"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-purple-900 mb-1">
                    REFUND AMOUNT (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-purple-900 mb-1">
                  REFUND NOTES & REMARKS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Returned excess release via GCash / Bank Deposit"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                />
              </div>

              {/* Refund Proof Attachment */}
              <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                  <Paperclip className="h-3.5 w-3.5 text-purple-600 shrink-0" /> Refund Proof Attachment
                </div>

                {getRefundProofAttachment() ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-semibold text-purple-900 bg-white border border-purple-200 px-2 py-0.5 rounded-lg truncate max-w-[120px]" title={getRefundProofAttachment()?.file_name}>
                      {getRefundProofAttachment()?.file_name}
                    </span>
                    <div className="flex items-center gap-0.5 bg-white border border-purple-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(getRefundProofAttachment()!)}
                        className="p-1 hover:bg-purple-100 rounded text-purple-800 transition cursor-pointer"
                        title="Preview Refund Proof"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAttachment(getRefundProofAttachment()!.id, getRefundProofAttachment()!.file_name)}
                        className="p-1 hover:bg-purple-100 rounded text-emerald-700 transition cursor-pointer"
                        title="Download Refund Proof"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {isAccountingOrAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(getRefundProofAttachment()!.id)}
                          className="p-1 hover:bg-purple-100 rounded text-rose-600 transition cursor-pointer"
                          title="Delete Refund Proof"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : isAccountingOrAdmin ? (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-purple-100/70 text-purple-900 border border-purple-300 rounded-xl text-[11px] font-bold cursor-pointer transition shadow-2xs">
                    {uploadingRefundProof ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-700" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-purple-700" />
                    )}
                    <span>{uploadingRefundProof ? 'Uploading...' : 'Upload Refund Proof'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadRefundProof(e.target.files[0]);
                      }}
                    />
                  </label>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No refund proof attached</span>
                )}
              </div>
            </div>
          )}

          {/* Account Details Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#4A0E17]" /> Account & Transaction Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  TRANSAC <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transac}
                  onChange={(e) => setTransac(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition cursor-pointer"
                >
                  <option value="CASH">CASH</option>
                  <option value="GCASH">GCASH</option>
                  <option value="BANK TRANSFER">BANK TRANSFER</option>
                  <option value="CHECK">CHECK</option>
                  <option value="ONLINE">ONLINE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  RELEASED TO
                </label>
                <input
                  type="text"
                  placeholder="e.g. JOHN MACALALAD"
                  value={releasedTo}
                  onChange={(e) => setReleasedTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ACCOUNT NUMBER
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9399628619"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/10 focus:border-[#4A0E17] transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Release Installments Grid */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-[#4A0E17]" /> Release Schedule & Proof Attachments (1st to 4th)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderReleaseCard(1, '1ST RELEASE', relDate1, setRelDate1, amt1, setAmt1)}
              {renderReleaseCard(2, '2ND RELEASE', relDate2, setRelDate2, amt2, setAmt2)}
              {renderReleaseCard(3, '3RD RELEASE', relDate3, setRelDate3, amt3, setAmt3)}
              {renderReleaseCard(4, '4TH RELEASE', relDate4, setRelDate4, amt4, setAmt4)}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMut.isPending || record.isCancelled}
              className="px-5 py-2 bg-[#4A0E17] hover:bg-[#3A0A12] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updateMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" /> {record.isCancelled ? 'Policy Cancelled' : (isMainAgent ? 'Save Main Agent Release' : 'Save Sub-Agent Release')}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal Document Preview overlay */}
        {previewAttachment && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-6 py-4 bg-[#4A0E17] text-white">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-5 w-5 text-amber-300 shrink-0" />
                  <span className="font-extrabold text-sm truncate">{previewAttachment.file_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadAttachment(previewAttachment.id, previewAttachment.file_name)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-grow flex items-center justify-center bg-slate-100 min-h-[300px]">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <Loader2 className="h-8 w-8 text-[#4A0E17] animate-spin" />
                    <span className="text-xs font-bold text-slate-600">Loading document preview...</span>
                  </div>
                ) : previewUrl ? (
                  previewAttachment.mime_type?.startsWith('image/') || previewAttachment.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={previewUrl}
                      alt={previewAttachment.file_name}
                      className="max-h-[60vh] max-w-full rounded-2xl shadow-md object-contain"
                    />
                  ) : previewAttachment.mime_type === 'application/pdf' || previewAttachment.file_name?.endsWith('.pdf') ? (
                    <iframe
                      src={previewUrl}
                      title={previewAttachment.file_name}
                      className="w-full h-[60vh] rounded-2xl shadow-md border border-slate-200"
                    />
                  ) : (
                    <div className="text-center py-12 px-6">
                      <FileText className="h-16 w-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-700">Preview not directly available for this file type</p>
                      <p className="text-xs text-slate-500 mt-1">Please click Download to save and view the file.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-rose-600 text-xs font-bold">
                    Failed to load file preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Proof Modal */}
        <ConfirmModal
          open={Boolean(deleteTargetId)}
          title="Delete Proof Attachment"
          message="Are you sure you want to delete this release proof attachment? This action cannot be undone."
          confirmLabel="Delete Proof"
          cancelLabel="Cancel"
          variant="danger"
          loading={isDeletingProof}
          onConfirm={handleConfirmDeleteProof}
          onCancel={() => setDeleteTargetId(null)}
        />
      </div>
    </div>
  );
}
