import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet, Search, Eye, Printer, Loader2, ArrowLeft,
  RefreshCw, X, Calendar, CheckCircle2, Clock, Gift, Paperclip, Upload
} from 'lucide-react';

import { getQuotations, toggleQuotationRemittance } from '../../services/quotationApi';
import type { Quotation } from '../../types/SalesTypes';
import Pagination from '../../components/ui/Pagination';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import { useToast } from '../../components/ui/Toast';
import FreebieAttachmentModal from '../../components/modals/FreebieAttachmentModal';

const roundTwo = (num: number): number => Math.round(num * 100 + 1e-9) / 100;
const formatCurrency = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getAssuredName = (q: Quotation): string => {
  const firstItem = q.items?.[0];
  const cov = firstItem?.coverage_details || {};
  if (cov.full_name) return cov.full_name;
  if (cov.assured_name) return cov.assured_name;
  if (cov.client_name) return cov.client_name;
  if (q.customer) {
    if (q.customer.customer_type === 'corporate' && q.customer.company_name) {
      return q.customer.company_name;
    }
    const nameParts = [q.customer.first_name, q.customer.middle_name, q.customer.last_name, q.customer.suffix].filter(Boolean).join(' ');
    if (nameParts) return nameParts;
    if (q.customer.full_name) return q.customer.full_name;
  }
  return 'N/A';
};

// ─── CBIC Tariff Guide Tables (Private Use vs Commercial / TNVS) ───────────────────
const TABLE_A_PC: Record<number, { ebi: number; tppd: number }> = {
  100000: { ebi: 270, tppd: 1095 },
  200000: { ebi: 420, tppd: 1245 },
  300000: { ebi: 585, tppd: 1395 },
  400000: { ebi: 675, tppd: 1515 },
  500000: { ebi: 780, tppd: 1635 },
};

const TABLE_B_CV: Record<number, { ebi: number; tppd: number }> = {
  100000: { ebi: 465, tppd: 1290 },
  200000: { ebi: 660, tppd: 1395 },
  300000: { ebi: 855, tppd: 1515 },
  400000: { ebi: 975, tppd: 1590 },
  500000: { ebi: 1095, tppd: 1680 },
};

const getCbicTariffPremiums = (coverageAmt: number, isCV: boolean) => {
  const table = isCV ? TABLE_B_CV : TABLE_A_PC;
  const amounts = [100000, 200000, 300000, 400000, 500000];
  const closest = amounts.reduce((prev, curr) => Math.abs(curr - coverageAmt) < Math.abs(prev - coverageAmt) ? curr : prev, 200000);
  return table[closest] || (isCV ? { ebi: 660, tppd: 1395 } : { ebi: 420, tppd: 1245 });
};

import { useAuth } from '../../context/AuthContext';

export default function PolicyStatementsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles = [] } = useAuth();
  const [searchParams] = useSearchParams();

  const isAccountingOrAdmin = roles.some((r: string) =>
    ['Accounting Officer', 'Administrator', 'Owner', 'Super Admin'].includes(r)
  );
  const urlSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [selectedProvider, setSelectedProvider] = useState<'ALL' | 'ALPHA' | 'CBIC'>('ALL');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [freebieModalTarget, setFreebieModalTarget] = useState<Quotation | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const remittanceMutation = useMutation({
    mutationFn: (quotationId: number) => toggleQuotationRemittance(quotationId),
    onSuccess: (res) => {
      showToast(res.message || 'Remittance status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (selectedQuotation && selectedQuotation.id === res.data.id) {
        setSelectedQuotation(res.data);
      }
    },
    onError: () => {
      showToast('Failed to update remittance status', 'error');
    },
  });

  useEffect(() => {
    if (urlSearch) {
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, selectedProvider, dateFrom, dateTo]);

  // Fetch approved Policy Issuance Requests
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['quotations', 'approved-statements'],
    queryFn: () => getQuotations({ per_page: 500 }),
  });

  const allQuotations = response?.data?.data ?? [];

  const approvedQuotations = useMemo(() => {
    return allQuotations.filter((q) => {
      const isRelevant = q.status === 'approved' || q.status === 'submitted' || q.status === 'under_review' || q.status === 'cancelled' || q.status === 'cancellation_requested';
      if (!isRelevant) return false;

      const firstItem = q.items?.[0];
      const cov = firstItem?.coverage_details || {};
      const provider = (cov.insurance_provider || cov.provider || q.customer?.insurance_provider || 'ALPHA').toUpperCase();

      if (selectedProvider === 'ALPHA' && !provider.includes('ALPHA')) return false;
      if (selectedProvider === 'CBIC' && !provider.includes('CBIC')) return false;

      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        const qDate = new Date(q.created_at);
        if (qDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        const qDate = new Date(q.created_at);
        if (qDate > to) return false;
      }

      if (!searchInput) return true;
      const query = searchInput.toLowerCase();
      const ref = (q.quotation_number || q.ir_number || '').toLowerCase();
      const customer = (getAssuredName(q) || '').toLowerCase();
      const policy = (q.or_number || '').toLowerCase();
      const agent = (typeof q.prepared_by === 'object' ? q.prepared_by?.name : '')?.toLowerCase() || '';
      return ref.includes(query) || customer.includes(query) || policy.includes(query) || agent.includes(query);
    });
  }, [allQuotations, searchInput, selectedProvider, dateFrom, dateTo]);

  // Overall financial totals
  const overallTotals = useMemo(() => {
    let totalPrem = 0;
    approvedQuotations.forEach((q) => {
      totalPrem += Number(q.total_premium || 0);
    });
    return {
      count: approvedQuotations.length,
      totalPrem: Math.round(totalPrem),
    };
  }, [approvedQuotations]);

  const total = approvedQuotations.length;
  const lastPage = Math.ceil(total / perPage) || 1;
  const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const to = Math.min(currentPage * perPage, total);

  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return approvedQuotations.slice(start, start + perPage);
  }, [approvedQuotations, currentPage, perPage]);

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex items-center justify-between print:hidden no-print">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">Policy Statements</h1>
            {!isAccountingOrAdmin && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                <Eye className="h-3 w-3 text-amber-600" /> Viewing Mode (Read-Only)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">Auto-generated tariff, commission, remittance, and company income statements</p>
        </div>
      </div>

      {/* Refined Aligned Filter and Search Bar Container */}
      {!selectedQuotation && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 print:hidden no-print">
          {/* Search Input */}
          <div className="relative flex-grow min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search policy request number, customer, policy, agent..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
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

          {/* Insurance Provider Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Providers</option>
              <option value="ALPHA">ALPHA Insurance</option>
              <option value="CBIC">CBIC Insurance</option>
            </select>
          </div>

          {/* Aligned Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-[#4A0E17]" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition cursor-pointer text-xs"
                title="Clear date filter"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {selectedQuotation ? (
        <StatementDetailView
          quotation={selectedQuotation}
          onBack={() => setSelectedQuotation(null)}
          onOpenFreebieModal={(q) => setFreebieModalTarget(q)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
            </div>
          ) : approvedQuotations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold text-base">No policy requests found</p>
              <p className="text-slate-400 text-xs mt-1">Approved policy issuance requests will automatically appear here.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Ref / IR No.</th>
                      <th className="px-5 py-3.5">Assured Name</th>
                      <th className="px-5 py-3.5">Insurance Provider</th>
                      <th className="px-5 py-3.5">Total Premium</th>
                      <th className="px-5 py-3.5">Net Remittance</th>
                      <th className="px-5 py-3.5">Company Income</th>
                      <th className="px-5 py-3.5">Net Income</th>
                      <th className="px-5 py-3.5">Remittance Status</th>
                      <th className="px-5 py-3.5">Freebies & Delivery</th>
                      <th className="px-5 py-3.5">Agent</th>
                      <th className="px-5 py-3.5">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedQuotations.map((q) => {
                      const firstItem = q.items?.[0];
                      const cov = firstItem?.coverage_details || {};
                      const custAny = (q.customer || {}) as any;
                      const provider = cov.insurance_provider || cov.provider || custAny.insurance_provider || 'ALPHA';
                      const isCBIC = provider.toUpperCase().includes('CBIC');
                      const agentName = typeof q.prepared_by === 'object' ? q.prepared_by?.name : 'Sales Agent';
                      const createdDate = new Date(q.created_at);
                      const formattedDateStr = createdDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                      const formattedTimeStr = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                      // Compute metrics for the table row
                      const totalPolicyPremium = Number(q.total_premium || cov.net_premium || custAny.policy_premium || 0);
                      const subAgentMarkup = Number(cov.calculator?.sub_agent_markup || cov.sub_agent_markup || custAny.sub_agent_markup || 0);
                      const agentMarkup = Number(cov.calculator?.agent_markup || cov.agent_markup || custAny.agent_markup || 0);
                      const freebie = Number(cov.calculator?.freebie_amount ?? (cov.calculator?.freebie_cashback || cov.freebie || custAny.freebie || 0));
                      const cashback = Number(cov.calculator?.cashback_amount || 0);
                      const totalDeductions = agentMarkup + subAgentMarkup + freebie + cashback;

                      const itemSumInsured = Number(firstItem?.sum_insured || 0);
                      const covSumInsured = Number(cov.sum_insured || cov.coverages?.own_damage || cov.own_damage_coverage || custAny.own_damage_coverage || 0);
                      const sumInsured = itemSumInsured > 0 ? itemSumInsured : (covSumInsured > 0 ? covSumInsured : 430000);

                      let netRemittance = 0;
                      let companyIncome = 0;
                      let netIncome = 0;

                      if (isCBIC) {
                        const usageStr = ((custAny.usage || '') + ' ' + (custAny.quotation_used || '') + ' ' + (cov.usage || '')).toUpperCase();
                        const isTNVS = usageStr.includes('TNVS') || usageStr.includes('HIRE') || usageStr.includes('YELLOW');
                        const covBIVal = Number(cov.coverages?.bi || cov.cov_bi || custAny.bi_coverage || 200000);
                        const cbicTariff = getCbicTariffPremiums(covBIVal, isTNVS);
                        const cbicNetBasicPrem = Math.round((sumInsured * 0.0065 + sumInsured * 0.0030 + cbicTariff.ebi + cbicTariff.tppd) * 100) / 100;
                        const cbicNetGrossPrem = Math.round((cbicNetBasicPrem + (cbicNetBasicPrem * 0.125) + (cbicNetBasicPrem * 0.12) + (cbicNetBasicPrem * 0.0011)) * 100) / 100;
                        const cbicNetTariffComm = Math.round(((cbicTariff.ebi * 0.30 + cbicTariff.tppd * 0.20) * 0.90) * 100) / 100;

                        netRemittance = Math.round((cbicNetGrossPrem - cbicNetTariffComm) * 100) / 100;
                        companyIncome = Math.round((totalPolicyPremium - netRemittance) * 100) / 100;
                        netIncome = Math.round((companyIncome - totalDeductions) * 100) / 100;
                      } else {
                        const premOD = Math.round(sumInsured * 0.0070 * 100) / 100;
                        const premAON = Math.round(sumInsured * 0.0020 * 100) / 100;
                        const premBIVal = Number(cov.premiums?.bi || cov.prem_bi || 420);
                        const premPDVal = Number(cov.premiums?.pd || cov.prem_pd || 1245);
                        const premPAVal = Number(cov.premiums?.pa || cov.prem_pa || 0);

                        const subtotalPremium = Math.round((premOD + premAON + premBIVal + premPDVal + premPAVal) * 100) / 100;
                        const chargesAmount = Math.round(subtotalPremium * 0.2461 * 100) / 100;
                        const towingFee = Number(cov.calculator?.towing_fee || cov.towing_fee || 100);
                        const grossTotal = Math.round((subtotalPremium + chargesAmount + towingFee) * 100) / 100;

                        const commOnTariff = Math.round((premBIVal * 0.30 + premPDVal * 0.30) * 100) / 100;
                        const totalCommOnTariff = Math.round((commOnTariff - (commOnTariff * 0.10)) * 100) / 100;

                        netRemittance = Math.round((grossTotal - totalCommOnTariff) * 100) / 100;
                        companyIncome = Math.round((totalPolicyPremium - netRemittance) * 100) / 100;
                        netIncome = Math.round((companyIncome - totalDeductions) * 100) / 100;
                      }

                      return (
                        <tr
                          key={q.id}
                          onClick={() => setSelectedQuotation(q)}
                          className={`cursor-pointer transition group ${
                            (q.status === 'cancellation_requested' || (q.notes && q.notes.includes('Notice for Cancellation')) || (q.policy?.invoice?.notes && q.policy.invoice.notes.includes('Notice for Cancellation')))
                              ? 'bg-amber-500/20 dark:bg-amber-950/50 hover:bg-amber-500/30 border-l-4 border-l-amber-600 text-slate-900 font-bold shadow-2xs'
                              : q.status === 'cancelled'
                                ? 'bg-rose-50/30 hover:bg-rose-50'
                                : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-5 py-4 font-bold text-slate-800 group-hover:text-[#4A0E17] transition">
                            <div>{q.quotation_number || q.ir_number || `IR-${q.id}`}</div>
                            {q.status === 'cancelled' && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider">
                                CANCELLED
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {getAssuredName(q)}
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase border ${isCBIC
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : 'bg-blue-50 text-blue-800 border-blue-200/80'
                              }`}>
                              {provider}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-800">
                            ₱{formatCurrency(q.total_premium)}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-700 font-mono text-xs">
                            ₱{formatCurrency(netRemittance)}
                          </td>
                          <td className="px-5 py-4 font-bold text-amber-700 font-mono text-xs">
                            ₱{formatCurrency(companyIncome)}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-emerald-700 font-mono text-xs">
                            ₱{formatCurrency(netIncome)}
                          </td>
                          <td className="px-5 py-4 text-xs" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => remittanceMutation.mutate(q.id)}
                              disabled={remittanceMutation.isPending}
                              title="Click to toggle remittance status"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide border transition-all active:scale-95 cursor-pointer ${
                                q.is_remitted
                                  ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100/90'
                                  : 'bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${q.is_remitted ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{q.is_remitted ? 'Remitted' : 'Unremitted'}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4 text-xs" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const invoice = q.policy?.invoice;
                              const terms = Number(q.customer?.payment_terms || custAny.payment_terms || 1);
                              const verifiedPayments = (invoice?.payments || []).filter(
                                (p: any) => p.verification_status === 'verified' || (p.verification_status as string)?.toUpperCase() === 'VERIFIED' || (p.verification_status as string)?.toUpperCase() === 'REFLECTED PBCOM'
                              );
                              const invBalance = invoice ? Number(invoice.balance ?? (Number(invoice.total_amount) - Number(invoice.amount_paid))) : null;
                              const invAmountPaid = invoice ? Number(invoice.amount_paid || 0) : 0;
                              const invTotalAmount = invoice ? Number(invoice.total_amount || 0) : Number(q.total_premium || 0);

                              const isFullyPaid = Boolean(
                                (invoice && (invoice.status === 'paid' || invoice.status === 'overpaid')) ||
                                (invBalance !== null && invBalance <= 0 && invTotalAmount > 0) ||
                                (invAmountPaid >= invTotalAmount && invTotalAmount > 0) ||
                                (verifiedPayments.length >= terms && terms > 0)
                              );

                              const freebieAttCount = (q.attachments || []).filter(
                                att => att.document_type === 'freebie_proof' || att.document_type?.toLowerCase().includes('freebie') || att.file_name.toLowerCase().includes('freebie')
                              ).length;

                              if (!isFullyPaid) {
                                return <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap italic">Pending Paid</span>;
                              }

                              return (
                                <button
                                  onClick={() => setFreebieModalTarget(q)}
                                  title={freebieAttCount > 0 ? `${freebieAttCount} Freebie Proof Attachment(s) Uploaded` : 'Upload Freebie Delivery Proof'}
                                  className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer shadow-2xs ${
                                    freebieAttCount > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80'
                                      : 'bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100/80'
                                  }`}
                                >
                                  <Gift className={`h-3.5 w-3.5 shrink-0 ${freebieAttCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                                  <span>{freebieAttCount > 0 ? `Attached (${freebieAttCount})` : 'Upload Freebie'}</span>
                                </button>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-600 text-xs">
                            {agentName}
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                            <span>{formattedDateStr}</span>
                            <span className="text-[11px] font-mono text-slate-400 ml-1.5">{formattedTimeStr}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  lastPage={lastPage}
                  perPage={perPage}
                  total={total}
                  from={from}
                  to={to}
                  onPageChange={(p) => setCurrentPage(p)}
                  onPerPageChange={(n) => {
                    setPerPage(n);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Freebie Delivery Attachment Modal */}
      {freebieModalTarget && (
        <FreebieAttachmentModal
          isOpen={Boolean(freebieModalTarget)}
          onClose={() => setFreebieModalTarget(null)}
          attachableType="quotation"
          attachableId={freebieModalTarget.id}
          title={freebieModalTarget.quotation_number || freebieModalTarget.ir_number || `IR-${freebieModalTarget.id}`}
          customerName={getAssuredName(freebieModalTarget)}
          isCancelled={Boolean(
            freebieModalTarget.status === 'cancelled' ||
            (freebieModalTarget as any).cancellation_reason ||
            freebieModalTarget.policy?.status === 'cancelled'
          )}
          freebieInfo={
            Number(
              freebieModalTarget.items?.[0]?.coverage_details?.calculator?.freebie_amount ??
              (freebieModalTarget.items?.[0]?.coverage_details?.calculator?.freebie_cashback || (freebieModalTarget.customer as any)?.freebie || 0)
            )
          }
          onAttachmentUploaded={() => refetch()}
        />
      )}
    </div>
  );
}

function StatementDetailView({ quotation, onBack, onOpenFreebieModal }: { quotation: Quotation; onBack: () => void; onOpenFreebieModal: (q: Quotation) => void }) {
  const firstItem = quotation.items?.[0];
  const cov = firstItem?.coverage_details || {};
  const custAny = (quotation.customer || {}) as any;

  // Detect default provider mode and CBIC type (PRIVATE vs TNVS)
  const initialProvider = (cov.insurance_provider || cov.provider || custAny.insurance_provider || 'ALPHA').toUpperCase();
  const providerMode: 'ALPHA' | 'CBIC' = initialProvider.includes('CBIC') ? 'CBIC' : 'ALPHA';

  const initialUsage = ((custAny.usage || '') + ' ' + (custAny.quotation_used || '') + ' ' + (cov.usage || '')).toUpperCase();
  const cbicType: 'PRIVATE' | 'TNVS' = initialUsage.includes('TNVS') || initialUsage.includes('HIRE') || initialUsage.includes('YELLOW') ? 'TNVS' : 'PRIVATE';

  const detailInvoice = quotation.policy?.invoice;
  const detailTerms = Number(quotation.customer?.payment_terms || custAny.payment_terms || 1);
  const detailVerifiedPayments = (detailInvoice?.payments || []).filter(
    (p: any) => p.verification_status === 'verified' || (p.verification_status as string)?.toUpperCase() === 'VERIFIED' || (p.verification_status as string)?.toUpperCase() === 'REFLECTED PBCOM'
  );
  const detailInvBalance = detailInvoice ? Number(detailInvoice.balance ?? (Number(detailInvoice.total_amount) - Number(detailInvoice.amount_paid))) : null;
  const detailInvAmountPaid = detailInvoice ? Number(detailInvoice.amount_paid || 0) : 0;
  const detailInvTotalAmount = detailInvoice ? Number(detailInvoice.total_amount || 0) : Number(quotation.total_premium || 0);

  const isFullyPaidDetail = Boolean(
    (detailInvoice && (detailInvoice.status === 'paid' || detailInvoice.status === 'overpaid')) ||
    (detailInvBalance !== null && detailInvBalance <= 0 && detailInvTotalAmount > 0) ||
    (detailInvAmountPaid >= detailInvTotalAmount && detailInvTotalAmount > 0) ||
    (detailVerifiedPayments.length >= detailTerms && detailTerms > 0)
  );

  // Extract initial parameters or set smart defaults matching Excel calculations
  const assuredName = getAssuredName(quotation);
  const address = quotation.customer
    ? [quotation.customer.address_line_1, quotation.customer.city, quotation.customer.province].filter(Boolean).join(', ') || 'Metro Manila, Philippines'
    : 'Metro Manila, Philippines';
  const vehicleUnit = cov.vehicle_make_model || cov.unit || custAny.unit || custAny.vehicle_make_model || 'SEDAN / SUV';
  const mortgagee = cov.mortgage || cov.mortgagee || custAny.mortgage || 'N/A';
  const agentName = typeof quotation.prepared_by === 'object' ? quotation.prepared_by?.name : (cov.agent || custAny.agent || 'SALES AGENT');

  const plateNo = cov.plate_no || cov.plate_number || custAny.plate_no || '—';
  const engineNo = cov.engine_no || cov.engine_number || custAny.engine_no || custAny.engine_number || '—';
  const chassisNo = cov.chassis_no || cov.chassis_number || custAny.chassis_no || custAny.chassis_number || '—';
  const mvFileNo = cov.mv_file_no || custAny.mv_file_no || '—';
  const color = cov.color || custAny.color || '—';

  // Coverage Insured Values & Premiums
  const itemSumInsured = Number(firstItem?.sum_insured || 0);
  const covSumInsured = Number(cov.sum_insured || cov.coverages?.own_damage || cov.own_damage_coverage || custAny.own_damage_coverage || 0);
  const initialSumInsured = itemSumInsured > 0 ? itemSumInsured : (covSumInsured > 0 ? covSumInsured : 430000);
  const [sumInsured, setSumInsured] = useState<number>(initialSumInsured);

  // ALPHA Rates
  const [rateOD, setRateOD] = useState<number>(0.70); // 0.70%
  const [rateAON, setRateAON] = useState<number>(0.20); // 0.20%

  const initialCovBI = Number(cov.coverages?.bi || cov.cov_bi || custAny.bi_coverage || 200000);
  const initialPremBI = Number(cov.premiums?.bi || cov.prem_bi || 420);
  const [covBIVal, setCovBIVal] = useState<number>(initialCovBI);
  const [premBIVal, setPremBIVal] = useState<number>(initialPremBI);
  const [commBIPct, setCommBIPct] = useState<number>(30); // 30%

  const initialCovPD = Number(cov.coverages?.pd || cov.cov_pd || custAny.pd_coverage || 200000);
  const initialPremPD = Number(cov.premiums?.pd || cov.prem_pd || 1245);
  const [covPDVal, setCovPDVal] = useState<number>(initialCovPD);
  const [premPDVal, setPremPDVal] = useState<number>(initialPremPD);
  const [commPDPct, setCommPDPct] = useState<number>(30); // 30%

  const initialCovPA = Number(cov.coverages?.pa || cov.cov_pa || custAny.pa || 250000);
  const initialPremPA = Number(cov.premiums?.pa || cov.prem_pa || 0);
  const [covPAVal, setCovPAVal] = useState<number>(initialCovPA);
  const [premPAVal, setPremPAVal] = useState<number>(initialPremPA);

  const [chargesRate, setChargesRate] = useState<number>(0.2461); // 24.61% for ALPHA
  const [towingFee, setTowingFee] = useState<number>(Number(cov.calculator?.towing_fee || cov.towing_fee || 100));
  const [wHTaxPct, setWHTaxPct] = useState<number>(10); // 10% Withholding Tax

  const initialTotalPremium = Number(quotation.total_premium || cov.net_premium || custAny.policy_premium || 15000);
  const [totalPolicyPremium, setTotalPolicyPremium] = useState<number>(initialTotalPremium);

  const agentMarkup = Number(cov.calculator?.agent_markup || cov.agent_markup || custAny.agent_markup || 0);
  const subAgentMarkup = Number(cov.calculator?.sub_agent_markup || cov.sub_agent_markup || custAny.sub_agent_markup || 0);
  const freebie = Number(cov.calculator?.freebie_amount ?? (cov.calculator?.freebie_cashback || cov.freebie || custAny.freebie || 0));
  const cashback = Number(cov.calculator?.cashback_amount || cov.cashback || custAny.cashback || 0);
  const totalDeductions = agentMarkup + subAgentMarkup + freebie + cashback;

  // ─── ALPHA Calculations ───────────────────────────────────────────────────
  const premOD = roundTwo(sumInsured * (rateOD / 100));
  const premAON = roundTwo(sumInsured * (rateAON / 100));

  const commBI = roundTwo(premBIVal * (commBIPct / 100));
  const commPD = roundTwo(premPDVal * (commPDPct / 100));

  const subtotalPremium = roundTwo(premOD + premAON + premBIVal + premPDVal);
  const chargesAmount = roundTwo(subtotalPremium * chargesRate);
  const grossTotal = roundTwo(subtotalPremium + chargesAmount + towingFee);

  const commOnTariff = roundTwo(commBI + commPD);
  const withholdingTax = roundTwo(commOnTariff * (wHTaxPct / 100));
  const totalCommOnTariff = roundTwo(commOnTariff - withholdingTax);

  const alphaRemittanceToProvider = roundTwo(grossTotal - totalCommOnTariff);
  const alphaCompanyIncome = roundTwo(totalPolicyPremium - alphaRemittanceToProvider);
  const alphaNetIncome = roundTwo(alphaCompanyIncome - totalDeductions);

  // ─── CBIC Calculations ────────────────────────────────────────────────────
  const isTNVS = cbicType === 'TNVS';
  const cbicTariff = getCbicTariffPremiums(covBIVal, isTNVS);
  const cbicEBI = cbicTariff.ebi;
  const cbicTPPD = cbicTariff.tppd;

  // CBIC Writing Premium
  const cbicWritingODRate = 1.424584; // %
  const cbicWritingODPrem = roundTwo(sumInsured * (cbicWritingODRate / 100));
  const cbicWritingAONRate = 0.50; // %
  const cbicWritingAONPrem = roundTwo(sumInsured * (cbicWritingAONRate / 100));
  const cbicWritingBasicPrem = roundTwo(cbicWritingODPrem + cbicWritingAONPrem + cbicEBI + cbicTPPD);

  const cbicWritingDocStamp = roundTwo(cbicWritingBasicPrem * 0.125);
  const cbicWritingEVat = roundTwo(cbicWritingBasicPrem * 0.12);
  const cbicWritingLGT = roundTwo(cbicWritingBasicPrem * 0.0011);
  const cbicWritingGrossPrem = roundTwo(cbicWritingBasicPrem + cbicWritingDocStamp + cbicWritingEVat + cbicWritingLGT);

  // CBIC Net Premium
  const cbicNetODRate = 0.65; // %
  const cbicNetODPrem = roundTwo(sumInsured * (cbicNetODRate / 100));
  const cbicNetAONRate = 0.30; // %
  const cbicNetAONPrem = roundTwo(sumInsured * (cbicNetAONRate / 100));
  const cbicNetBasicPrem = roundTwo(cbicNetODPrem + cbicNetAONPrem + cbicEBI + cbicTPPD);

  const cbicNetDocStamp = roundTwo(cbicNetBasicPrem * 0.125);
  const cbicNetEVat = roundTwo(cbicNetBasicPrem * 0.12);
  const cbicNetLGT = roundTwo(cbicNetBasicPrem * 0.0011);
  const cbicNetGrossPrem = roundTwo(cbicNetBasicPrem + cbicNetDocStamp + cbicNetEVat + cbicNetLGT);

  // CBIC Tariff Commission
  const cbicEBIComm = roundTwo(cbicEBI * 0.30); // 30%
  const cbicTPPDComm = roundTwo(cbicTPPD * 0.20); // 20%
  const cbicTotalTariffComm = roundTwo(cbicEBIComm + cbicTPPDComm);
  const cbicWHTax = roundTwo(cbicTotalTariffComm * 0.10); // 10%
  const cbicNetTariffComm = roundTwo(cbicTotalTariffComm - cbicWHTax);

  // CBIC Net Remittance & Income
  const cbicNetRemittance = roundTwo(cbicNetGrossPrem - cbicNetTariffComm);
  const cbicCompanyIncome = roundTwo(totalPolicyPremium - cbicNetRemittance);
  const cbicNetIncome = roundTwo(cbicCompanyIncome - totalDeductions);

  const handlePrint = () => {
    window.print();
  };

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const remittanceMutation = useMutation({
    mutationFn: (quotationId: number) => toggleQuotationRemittance(quotationId),
    onSuccess: (res) => {
      showToast(res.message || 'Remittance status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: () => {
      showToast('Failed to update remittance status', 'error');
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Screen only) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Statements List
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => remittanceMutation.mutate(quotation.id)}
            disabled={remittanceMutation.isPending}
            title="Click to toggle remittance status"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all active:scale-95 cursor-pointer ${
              quotation.is_remitted
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100/90'
                : 'bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${quotation.is_remitted ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{quotation.is_remitted ? 'Remitted' : 'Unremitted'}</span>
          </button>

          {isFullyPaidDetail && (
            <button
              onClick={() => onOpenFreebieModal(quotation)}
              title="Upload proof of delivered freebie for this policy statement"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide border bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 transition cursor-pointer shadow-2xs"
            >
              <Gift className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Upload Freebie Proof</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Accounting Statement
          </button>
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {quotation.status === 'cancelled' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center justify-between text-rose-900 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <X className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-wide text-rose-900">CANCELLED POLICY STATEMENT</h4>
              <p className="text-xs text-rose-700 font-medium mt-0.5">This policy issuance request has been cancelled upon Underwriter approval. Associated billing schedules and remittances are voided.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-xs">
            CANCELLED
          </span>
        </div>
      )}

      {/* Spreadsheet Billing Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 sm:p-10 space-y-6 print:p-2 print:m-0 print:border-none print:shadow-none print:space-y-4 font-sans printable-document">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-5 gap-4">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="Supremogen" className="h-12 w-auto object-contain" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {providerMode === 'CBIC' ? 'COUNTRY BANKERS INSURANCE CORPORATION' : 'SUPREMOGEN INSURANCE SERVICES'}
                </h2>
                <span className={`px-2.5 py-0.5 text-[11px] font-black rounded-md uppercase tracking-wider border ${
                  providerMode === 'CBIC'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}>
                  {providerMode} PROVIDER
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                {providerMode === 'CBIC' ? `CBIC POLICY STATEMENT (${cbicType})` : 'POLICY BILLING & ACCOUNTING STATEMENT (ALPHA)'}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
            <div className="inline-block px-2.5 py-1 bg-slate-100 rounded-md font-mono font-bold text-slate-800 border border-slate-200/80">
              REF: {quotation.quotation_number || quotation.ir_number || `IR-${quotation.id}`}
            </div>
            <p className="text-slate-500">Date: <span className="font-semibold text-slate-700">{new Date(quotation.created_at).toLocaleDateString()}</span></p>
          </div>
        </div>

        {/* Dynamic Provider Layout Rendering */}
        {providerMode === 'CBIC' ? (
          /* ─── CBIC STATEMENT LAYOUT ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs print:grid-cols-2 print:gap-4 print:border-none print:shadow-none">
            {/* PAGE 1: Policy Info & Perils Table */}
            <div className="p-6 space-y-5 border-r border-slate-200/80 bg-white print:p-2 print:space-y-3 print:border-r">
              <div className="bg-[#4A0E17] text-white px-4 py-2 font-bold uppercase tracking-wider text-center rounded-xl text-[11px] shadow-xs">
                PAGE 1 — POLICY & VEHICLE DETAILS ({cbicType})
              </div>

              <div className="space-y-1.5 divide-y divide-slate-100 text-slate-700 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">ASSURED:</span>
                  <span className="font-bold text-slate-900 uppercase text-right flex-1">{assuredName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">ADDRESS:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{address}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">MODEL/MAKE/BODY:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{vehicleUnit}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">PLATE NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{plateNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">SERIAL/CHASSIS NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{chassisNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">MOTOR NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{engineNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">COLOR:</span>
                  <span className="font-medium text-slate-800 text-right flex-1 uppercase">{color}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">EFFECTIVITY DATE:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">MORTGAGEE:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{mortgagee}</span>
                </div>
              </div>

              {/* CBIC Perils Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#4A0E17] text-white font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-2.5 text-left border-r border-slate-700">Perils</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-700">Sum Insured</th>
                      <th className="py-2 px-2.5 text-center border-r border-slate-700" colSpan={2}>Writing — CBIC</th>
                      <th className="py-2 px-2.5 text-center" colSpan={2}>Net Rate</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-600 font-semibold text-[10px] border-b border-slate-200 uppercase tracking-wider">
                      <th className="py-1 px-2.5 text-left border-r border-slate-200"></th>
                      <th className="py-1 px-2.5 text-right border-r border-slate-200"></th>
                      <th className="py-1 px-2.5 text-center border-r border-slate-200">Rate</th>
                      <th className="py-1 px-2.5 text-right border-r border-slate-200">Premium</th>
                      <th className="py-1 px-2.5 text-center border-r border-slate-200">Rate</th>
                      <th className="py-1 px-2.5 text-right">Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-100">I/D</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(sumInsured)}</td>
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-100">1.424584%</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(cbicWritingODPrem)}</td>
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-100">{cbicNetODRate.toFixed(2)}%</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(cbicNetODPrem)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-100">AON</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(sumInsured)}</td>
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-100">{cbicWritingAONRate.toFixed(2)}%</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(cbicWritingAONPrem)}</td>
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-100">{cbicNetAONRate.toFixed(2)}%</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(cbicNetAONPrem)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-100">EBI</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(covBIVal)}</td>
                      <td className="py-1.5 px-2.5 text-center text-slate-500 border-r border-slate-100">Tariff</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(cbicEBI)}</td>
                      <td className="py-1.5 px-2.5 text-center text-slate-500 border-r border-slate-100">Tariff</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(cbicEBI)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-100">TPPD</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(covPDVal)}</td>
                      <td className="py-1.5 px-2.5 text-center text-slate-500 border-r border-slate-100">Tariff</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(cbicTPPD)}</td>
                      <td className="py-1.5 px-2.5 text-center text-slate-500 border-r border-slate-100">Tariff</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">{formatCurrency(cbicTPPD)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-100">PA</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">{formatCurrency(covPAVal)}</td>
                      <td className="py-1.5 px-2.5 text-center text-slate-400 border-r border-slate-100">free</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-400 border-r border-slate-100">0.00</td>
                      <td className="py-1.5 px-2.5 text-center text-slate-400 border-r border-slate-100">free</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-400">0.00</td>
                    </tr>
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td className="py-1.5 px-2.5 border-r border-slate-200 uppercase text-[10px] tracking-wider" colSpan={3}>Basic Premium</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-200">{formatCurrency(cbicWritingBasicPrem)}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(cbicNetBasicPrem)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 border-r border-slate-100 text-slate-600" colSpan={3}>Documentary Stamp (12.50%)</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100 text-slate-600">{formatCurrency(cbicWritingDocStamp)}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-100 text-center text-slate-400">"</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">{formatCurrency(cbicNetDocStamp)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 border-r border-slate-100 text-slate-600" colSpan={3}>E-VAT (12.00%)</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100 text-slate-600">{formatCurrency(cbicWritingEVat)}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-100 text-center text-slate-400">"</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">{formatCurrency(cbicNetEVat)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 border-r border-slate-100 text-slate-600" colSpan={3}>Local Gov't Tax (0.11%)</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100 text-slate-600">{formatCurrency(cbicWritingLGT)}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-100 text-center text-slate-400">"</td>
                      <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">{formatCurrency(cbicNetLGT)}</td>
                    </tr>
                    <tr className="bg-slate-900 font-bold text-white">
                      <td className="py-2 px-2.5 border-r border-slate-800 uppercase text-[10px] tracking-wider" colSpan={3}>GROSS PREMIUM</td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums border-r border-slate-800">{formatCurrency(cbicWritingGrossPrem)}</td>
                      <td className="py-2 px-2.5 border-r border-slate-800"></td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-400 font-extrabold">₱{formatCurrency(cbicNetGrossPrem)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGE 2: CBIC Commissions & Accounting Breakdown */}
            <div className="p-6 space-y-5 bg-white print:p-2 print:space-y-3">
              <div className="bg-[#4A0E17] text-white px-4 py-2 font-bold uppercase tracking-wider text-center rounded-xl text-[11px] shadow-xs">
                PAGE 2 — CBIC REMITTANCE & COMPANY INCOME
              </div>

              {/* Tariff Commissions Block */}
              <div className="space-y-2.5 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-200/80 pb-2">
                  Tariff Commission Deductions
                </p>
                <div className="flex justify-between text-slate-600 font-medium text-xs">
                  <span>EBI Commission (30%)</span>
                  <span className="font-mono tabular-nums text-slate-900">₱{formatCurrency(cbicEBIComm)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium text-xs">
                  <span>TPPD Commission (20%)</span>
                  <span className="font-mono tabular-nums text-slate-900">₱{formatCurrency(cbicTPPDComm)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-xs border-t border-slate-200 pt-2">
                  <span>Total Tariff Commission</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(cbicTotalTariffComm)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Less Withholding Tax (10%)</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(cbicWHTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs bg-amber-50/90 p-2.5 rounded-lg border border-amber-200/80 text-amber-950 mt-1">
                  <span className="uppercase tracking-wider">NET TARIFF COMMISSION</span>
                  <span className="font-mono tabular-nums font-extrabold text-amber-900">₱{formatCurrency(cbicNetTariffComm)}</span>
                </div>
              </div>

              {/* Final CBIC Remittance & Income Summary */}
              <div className="space-y-2.5 border-t border-slate-200 pt-4 text-xs">
                <div className="flex justify-between font-bold p-3 bg-[#4A0E17] text-white rounded-xl shadow-2xs">
                  <span className="uppercase tracking-wider text-[11px]">NET REMITTANCE TO CBIC</span>
                  <span className="font-mono tabular-nums text-sm">₱{formatCurrency(cbicNetRemittance)}</span>
                </div>

                <div className="flex justify-between font-semibold p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  <span className="uppercase tracking-wider text-[11px]">TOTAL PREMIUM ON POLICY</span>
                  <span className="font-mono tabular-nums font-bold">₱{formatCurrency(totalPolicyPremium)}</span>
                </div>

                <div className="flex justify-between font-bold p-3 bg-amber-50 text-amber-950 rounded-xl border border-amber-200/80">
                  <span className="uppercase tracking-wider text-xs">COMPANY INCOME</span>
                  <span className="font-mono tabular-nums text-sm font-black text-amber-900">₱{formatCurrency(cbicCompanyIncome)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS AGENT MARK UP</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(agentMarkup)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS SUB-AGENT MARK UP</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(subAgentMarkup)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS FREEBIE</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(freebie)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS CASHBACK</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(cashback)}</span>
                </div>

                <div className="flex justify-between font-extrabold text-sm p-3.5 bg-[#064e3b] text-white rounded-xl shadow-xs border border-emerald-800">
                  <span className="uppercase tracking-wider text-xs">NET INCOME</span>
                  <span className="font-mono tabular-nums text-base">₱{formatCurrency(cbicNetIncome)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── ALPHA STATEMENT LAYOUT ────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs print:grid-cols-2 print:gap-4 print:border-none print:shadow-none">
            {/* PAGE 1: Policy & Customer Info + Primary Tariffs */}
            <div className="p-6 space-y-5 border-r border-slate-200/80 bg-white print:p-2 print:space-y-3 print:border-r">
              <div className="bg-[#4A0E17] text-white px-4 py-2 font-bold uppercase tracking-wider text-center rounded-xl text-[11px] shadow-xs">
                Page 1 — Policy & Vehicle Details (ALPHA)
              </div>

              {/* Basic Info Key-Value Table */}
              <div className="space-y-1.5 divide-y divide-slate-100 text-slate-700 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">TERM:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">
                    {quotation.valid_until ? new Date(quotation.created_at).toLocaleDateString() + ' to ' + new Date(quotation.valid_until).toLocaleDateString() : '1 YEAR'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">DATE OF ISSUANCE:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">ASSURED:</span>
                  <span className="font-bold text-slate-900 uppercase text-right flex-1">{assuredName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">ADDRESS:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{address}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">DETAILS:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{vehicleUnit}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">MORTGAGEE:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{mortgagee}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">AGENT:</span>
                  <span className="font-bold text-slate-900 uppercase text-right flex-1">{agentName}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1.5 divide-y divide-slate-100 text-slate-700 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">VEHICLE:</span>
                  <span className="font-medium text-slate-800 text-right flex-1">{vehicleUnit}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">PLATE NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{plateNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">ENGINE NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{engineNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">CHASSIS NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{chassisNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">MV FILE NO.:</span>
                  <span className="font-semibold text-slate-900 text-right flex-1 uppercase font-mono">{mvFileNo}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-bold text-slate-500 w-36 uppercase text-[11px]">COLOR:</span>
                  <span className="font-medium text-slate-800 text-right flex-1 uppercase">{color}</span>
                </div>
              </div>

              {/* Coverage Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#4A0E17] text-white font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-left">Coverage</th>
                      <th className="py-2.5 px-3 text-right">Sum Insured</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">Own Damage/Theft</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(sumInsured)}</td>
                      <td className="py-2 px-3 text-center">{rateOD.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatCurrency(premOD)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">Acts of Nature</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(sumInsured)}</td>
                      <td className="py-2 px-3 text-center">{rateAON.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatCurrency(premAON)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">Excess Bodily Injury</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(covBIVal)}</td>
                      <td className="py-2 px-3 text-center text-slate-400">—</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatCurrency(premBIVal)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">Property Damage</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(covPDVal)}</td>
                      <td className="py-2 px-3 text-center text-slate-400">—</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatCurrency(premPDVal)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">APA (for 10 Passengers)</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(covPAVal)}</td>
                      <td className="py-2 px-3 text-center text-slate-400">—</td>
                      <td className="py-2 px-3 text-right text-slate-400 font-medium">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Premium Charges Subtotal */}
              <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>PREMIUM</span>
                  <span className="font-mono tabular-nums">{formatCurrency(subtotalPremium)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>CHARGES ({(chargesRate * 100).toFixed(2)}%)</span>
                  <span className="font-mono tabular-nums">{formatCurrency(chargesAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>TOWING (Auto Assist)</span>
                  <span className="font-mono tabular-nums">{formatCurrency(towingFee)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-200 pt-2">
                  <span className="uppercase tracking-wider">TOTAL</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(grossTotal)}</span>
                </div>
              </div>
            </div>

            {/* PAGE 2: Commission, Remittance & Company Income Calculations */}
            <div className="p-6 space-y-5 bg-white print:p-2 print:space-y-3">
              <div className="bg-[#4A0E17] text-white px-4 py-2 font-bold uppercase tracking-wider text-center rounded-xl text-[11px] shadow-xs">
                Page 2 — Tariff Commissions & Company Remittance (ALPHA)
              </div>

              {/* Commissions Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#4A0E17] text-white font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-left">Tariff Item</th>
                      <th className="py-2.5 px-3 text-center">Comm %</th>
                      <th className="py-2.5 px-3 text-right">Comm Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-medium text-slate-500">Acts of Nature (30% comm on TARIFF)</td>
                      <td className="py-2 px-3 text-center text-slate-400">—</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-400">—</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">Excess Bodily Injury</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-700">{commBIPct}%</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatCurrency(commBI)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-bold text-slate-900">Property Damage</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-700">{commPDPct}%</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatCurrency(commPD)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Commission Totals Block */}
              <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <div className="flex justify-between font-bold text-slate-800 text-xs">
                  <span>COMM ON TARIFF</span>
                  <span className="font-mono tabular-nums">{formatCurrency(commOnTariff)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>LESS WITHHOLDING TAX ({wHTaxPct}%)</span>
                  <span className="font-mono tabular-nums">{formatCurrency(withholdingTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs bg-amber-50/90 p-2.5 rounded-lg border border-amber-200/80 text-amber-950 mt-1">
                  <span className="uppercase tracking-wider">TOTAL COMM ON TARIFF</span>
                  <span className="font-mono tabular-nums font-extrabold text-amber-900">₱{formatCurrency(totalCommOnTariff)}</span>
                </div>
              </div>

              {/* Final Accounting Breakdown */}
              <div className="space-y-2.5 border-t border-slate-200 pt-4 text-xs">
                <div className="flex justify-between font-bold p-3 bg-[#4A0E17] text-white rounded-xl shadow-2xs">
                  <span className="uppercase tracking-wider text-[11px]">REMITTANCE TO ALPHA</span>
                  <span className="font-mono tabular-nums text-sm">₱{formatCurrency(alphaRemittanceToProvider)}</span>
                </div>

                <div className="flex justify-between font-semibold p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  <span className="uppercase tracking-wider text-[11px]">TOTAL PREMIUM ON POLICY</span>
                  <span className="font-mono tabular-nums font-bold">₱{formatCurrency(totalPolicyPremium)}</span>
                </div>

                <div className="flex justify-between font-bold p-3 bg-amber-50 text-amber-950 rounded-xl border border-amber-200/80">
                  <span className="uppercase tracking-wider text-xs">COMPANY INCOME</span>
                  <span className="font-mono tabular-nums text-sm font-black text-amber-900">₱{formatCurrency(alphaCompanyIncome)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS AGENT MARK UP</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(agentMarkup)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS SUB-AGENT MARK UP</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(subAgentMarkup)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS FREEBIE</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(freebie)}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px] px-2 font-medium">
                  <span>LESS CASHBACK</span>
                  <span className="font-mono tabular-nums">₱{formatCurrency(cashback)}</span>
                </div>

                <div className="flex justify-between font-extrabold text-sm p-3.5 bg-[#064e3b] text-white rounded-xl shadow-xs border border-emerald-800">
                  <span className="uppercase tracking-wider text-xs">NET INCOME</span>
                  <span className="font-mono tabular-nums text-base">₱{formatCurrency(alphaNetIncome)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center print:pt-2">
          <p>Generated by Supremogen Accounting Officer System</p>
          <p className="font-semibold text-slate-700">Official Policy Accounting Record ({providerMode})</p>
        </div>
      </div>
    </div>
  );
}
