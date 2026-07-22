import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet, Search, Eye, Printer, Loader2, ArrowLeft,
  RefreshCw, X
} from 'lucide-react';

import { getQuotations } from '../../services/quotationApi';
import type { Quotation } from '../../types/SalesTypes';
import logoImg from '../../assets/image/supremogen_logo.jpg';

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

export default function PolicyStatementsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'ALL' | 'ALPHA' | 'CBIC'>('ALL');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Fetch approved Policy Issuance Requests
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['quotations', 'approved-statements'],
    queryFn: () => getQuotations({ per_page: 100 }),
  });

  const allQuotations = response?.data?.data ?? [];
  const approvedQuotations = useMemo(() => {
    return allQuotations.filter((q) => {
      const isApproved = q.status === 'approved' || q.status === 'submitted' || q.status === 'under_review';
      if (!isApproved) return false;

      const firstItem = q.items?.[0];
      const cov = firstItem?.coverage_details || {};
      const provider = (cov.insurance_provider || cov.provider || q.customer?.insurance_provider || 'ALPHA').toUpperCase();

      if (selectedProvider === 'ALPHA' && !provider.includes('ALPHA')) return false;
      if (selectedProvider === 'CBIC' && !provider.includes('CBIC')) return false;

      if (!searchInput) return true;
      const query = searchInput.toLowerCase();
      const ref = (q.quotation_number || q.ir_number || '').toLowerCase();
      const customer = (getAssuredName(q) || '').toLowerCase();
      const policy = (q.or_number || '').toLowerCase();
      const agent = (typeof q.prepared_by === 'object' ? q.prepared_by?.name : '')?.toLowerCase() || '';
      return ref.includes(query) || customer.includes(query) || policy.includes(query) || agent.includes(query);
    });
  }, [allQuotations, searchInput, selectedProvider]);

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

  return (
    <div className="space-y-4">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Policy Statements</h1>
          <p className="text-sm text-slate-500">Auto-generated tariff, commission, remittance, and company income statements</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-medium rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Refresh List
        </button>
      </div>

      {/* Filter and Search Bar Container */}
      {!selectedQuotation && (
        <div className="flex flex-col lg:flex-row items-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-4">
          {/* Search Input */}
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search policy request number, customer, policy, agent..."
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

          {/* Insurance Provider Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full lg:w-auto shrink-0">
            {(['ALL', 'ALPHA', 'CBIC'] as const).map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvider(prov)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition uppercase cursor-pointer ${
                  selectedProvider === prov
                    ? 'bg-[#4A0E17] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          {/* Summary Stat Pills */}
          <div className="flex items-center gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0 text-xs font-medium text-slate-600 w-full lg:w-auto justify-between sm:justify-start">
            <div>
              Approved: <span className="font-bold text-slate-800">{overallTotals.count}</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              Total Volume: <span className="font-bold text-emerald-700">₱{overallTotals.totalPrem.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {selectedQuotation ? (
        <StatementDetailView
          quotation={selectedQuotation}
          onBack={() => setSelectedQuotation(null)}
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Ref / IR No.</th>
                    <th className="px-5 py-3.5">Assured Name</th>
                    <th className="px-5 py-3.5">Insurance Provider</th>
                    <th className="px-5 py-3.5">Total Premium</th>
                    <th className="px-5 py-3.5">Agent</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvedQuotations.map((q) => {
                    const firstItem = q.items?.[0];
                    const cov = firstItem?.coverage_details || {};
                    const provider = cov.insurance_provider || cov.provider || q.customer?.insurance_provider || 'ALPHA';
                    const isCBIC = provider.toUpperCase().includes('CBIC');
                    const agentName = typeof q.prepared_by === 'object' ? q.prepared_by?.name : 'Sales Agent';
                    return (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4 font-bold text-slate-800">
                          {q.quotation_number || q.ir_number || `IR-${q.id}`}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {getAssuredName(q)}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase border ${
                            isCBIC
                              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                              : 'bg-blue-50 text-blue-800 border-blue-200/80'
                          }`}>
                            {provider}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-700">
                          ₱{formatCurrency(q.total_premium)}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600 text-xs">
                          {agentName}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {new Date(q.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedQuotation(q)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Statement
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatementDetailView({ quotation, onBack }: { quotation: Quotation; onBack: () => void }) {
  const firstItem = quotation.items?.[0];
  const cov = firstItem?.coverage_details || {};
  const custAny = (quotation.customer || {}) as any;

  // Detect default provider mode and CBIC type (PRIVATE vs TNVS)
  const initialProvider = (cov.insurance_provider || cov.provider || custAny.insurance_provider || 'ALPHA').toUpperCase();
  const [providerMode, setProviderMode] = useState<'ALPHA' | 'CBIC'>(initialProvider.includes('CBIC') ? 'CBIC' : 'ALPHA');
  
  const initialUsage = ((custAny.usage || '') + ' ' + (custAny.quotation_used || '') + ' ' + (cov.usage || '')).toUpperCase();
  const [cbicType, setCbicType] = useState<'PRIVATE' | 'TNVS'>(initialUsage.includes('TNVS') || initialUsage.includes('HIRE') || initialUsage.includes('YELLOW') ? 'TNVS' : 'PRIVATE');

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

  const subAgentMarkup = Number(cov.calculator?.sub_agent_markup || cov.sub_agent_markup || custAny.sub_agent_markup || 0);
  const freebieCashback = Number(cov.calculator?.freebie_cashback || cov.freebie_cashback || cov.freebie || custAny.freebie || 0);

  // ─── ALPHA Calculations ───────────────────────────────────────────────────
  const premOD = roundTwo(sumInsured * (rateOD / 100));
  const premAON = roundTwo(sumInsured * (rateAON / 100));

  const commBI = roundTwo(premBIVal * (commBIPct / 100));
  const commPD = roundTwo(premPDVal * (commPDPct / 100));

  const subtotalPremium = roundTwo(premOD + premAON + premBIVal + premPDVal + premPAVal);
  const chargesAmount = roundTwo(subtotalPremium * chargesRate);
  const grossTotal = roundTwo(subtotalPremium + chargesAmount + towingFee);

  const commOnTariff = roundTwo(commBI + commPD);
  const withholdingTax = roundTwo(commOnTariff * (wHTaxPct / 100));
  const totalCommOnTariff = roundTwo(commOnTariff - withholdingTax);

  const alphaRemittanceToProvider = roundTwo(grossTotal - totalCommOnTariff);
  const alphaCompanyIncome = roundTwo(totalPolicyPremium - alphaRemittanceToProvider);
  const alphaNetIncome = roundTwo(alphaCompanyIncome - subAgentMarkup - freebieCashback);

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
  const cbicNetIncome = roundTwo(cbicCompanyIncome - subAgentMarkup - freebieCashback);

  const handlePrint = () => {
    window.print();
  };

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

        {/* Provider Mode Selector Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Provider Template:</span>
            <select
              value={providerMode}
              onChange={(e) => setProviderMode(e.target.value as 'ALPHA' | 'CBIC')}
              className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20"
            >
              <option value="ALPHA">ALPHA PROVIDER</option>
              <option value="CBIC">CBIC PROVIDER</option>
            </select>
          </div>

          {providerMode === 'CBIC' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Type:</span>
              <select
                value={cbicType}
                onChange={(e) => setCbicType(e.target.value as 'PRIVATE' | 'TNVS')}
                className="px-3 py-1.5 bg-yellow-100 border border-yellow-400 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
              >
                <option value="PRIVATE">PRIVATE USE (TABLE A)</option>
                <option value="TNVS">TNVS / CV (TABLE B)</option>
              </select>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Accounting Statement
          </button>
        </div>
      </div>

      {/* Spreadsheet Billing Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 space-y-6 print:p-0 print:border-none print:shadow-none font-mono">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="Supremogen" className="h-12 w-auto object-contain" />
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-wider">
                {providerMode === 'CBIC' ? 'COUNTRY BANKERS INSURANCE CORPORATION' : 'SUPREMOGEN INSURANCE SERVICES'}
              </h2>
              <p className="text-xs text-slate-600 font-sans">
                {providerMode === 'CBIC' ? `CBIC POLICY STATEMENT (${cbicType})` : 'POLICY BILLING & ACCOUNTING STATEMENT'}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-700 font-sans">
            <p className="font-bold text-slate-900">REF: {quotation.quotation_number || quotation.ir_number || `IR-${quotation.id}`}</p>
            <p>Date: {new Date(quotation.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Dynamic Provider Layout Rendering */}
        {providerMode === 'CBIC' ? (
          /* ─── CBIC STATEMENT LAYOUT ─────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs border border-slate-300 rounded-xl overflow-hidden print:grid-cols-2">
            {/* PAGE 1: Policy Info & Perils Table */}
            <div className="p-5 space-y-5 border-r border-slate-300 bg-white">
              <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-800 text-center border border-slate-300">
                PAGE 1 — POLICY & VEHICLE DETAILS ({cbicType})
              </div>

              <div className="space-y-1 divide-y divide-slate-200 text-slate-800">
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">ASSURED:</span>
                  <span className="font-bold uppercase text-right flex-1">{assuredName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">ADDRESS:</span>
                  <span className="font-semibold text-right flex-1">{address}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">MODEL/MAKE/BODY:</span>
                  <span className="font-semibold text-right flex-1">{vehicleUnit}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">PLATE NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{plateNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">SERIAL/CHASSIS NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{chassisNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">MOTOR NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{engineNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">COLOR:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{color}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">EFFECTIVITY DATE:</span>
                  <span className="font-semibold text-right flex-1">{new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">MORTGAGEE:</span>
                  <span className="font-semibold text-right flex-1">{mortgagee}</span>
                </div>
              </div>

              {/* CBIC Perils Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-pink-100/80 text-slate-900 font-bold border-b border-slate-300">
                      <th className="p-1.5 text-left border-r border-slate-300">Perils</th>
                      <th className="p-1.5 text-right border-r border-slate-300">Sum Insured</th>
                      <th className="p-1.5 text-center border-r border-slate-300" colSpan={2}>Writing - CBIC</th>
                      <th className="p-1.5 text-center" colSpan={2}>Net Rate</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-1 text-left border-r border-slate-300"></th>
                      <th className="p-1 text-right border-r border-slate-300"></th>
                      <th className="p-1 text-center border-r border-slate-300">Rate</th>
                      <th className="p-1 text-right border-r border-slate-300">Premium</th>
                      <th className="p-1 text-center border-r border-slate-300">Rate</th>
                      <th className="p-1 text-right">Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 font-bold border-r border-slate-300">I/D</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(sumInsured)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">1.424584%</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingODPrem)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">{cbicNetODRate.toFixed(2)}%</td>
                      <td className="p-1.5 text-right font-semibold">{formatCurrency(cbicNetODPrem)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold border-r border-slate-300">AON</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(sumInsured)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">{cbicWritingAONRate.toFixed(2)}%</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingAONPrem)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">{cbicNetAONRate.toFixed(2)}%</td>
                      <td className="p-1.5 text-right font-semibold">{formatCurrency(cbicNetAONPrem)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold border-r border-slate-300">EBI</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(covBIVal)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">Tariff</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicEBI)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">Tariff</td>
                      <td className="p-1.5 text-right font-semibold">{formatCurrency(cbicEBI)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold border-r border-slate-300">TPPD</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(covPDVal)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">Tariff</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicTPPD)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">Tariff</td>
                      <td className="p-1.5 text-right font-semibold">{formatCurrency(cbicTPPD)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold border-r border-slate-300">PA</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(covPAVal)}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">free</td>
                      <td className="p-1.5 text-right border-r border-slate-300">0.00</td>
                      <td className="p-1.5 text-center border-r border-slate-300">free</td>
                      <td className="p-1.5 text-right font-semibold">0.00</td>
                    </tr>
                    <tr className="bg-pink-50/60 font-bold border-t-2 border-slate-400">
                      <td className="p-1.5 border-r border-slate-300" colSpan={3}>Basic Premium</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingBasicPrem)}</td>
                      <td className="p-1.5 border-r border-slate-300"></td>
                      <td className="p-1.5 text-right">{formatCurrency(cbicNetBasicPrem)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300" colSpan={3}>Documentary Stamp (12.50%)</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingDocStamp)}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center">"</td>
                      <td className="p-1.5 text-right">{formatCurrency(cbicNetDocStamp)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300" colSpan={3}>E-VAT (12.00%)</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingEVat)}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center">"</td>
                      <td className="p-1.5 text-right">{formatCurrency(cbicNetEVat)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300" colSpan={3}>Local Gov't Tax (0.11%)</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingLGT)}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center">"</td>
                      <td className="p-1.5 text-right">{formatCurrency(cbicNetLGT)}</td>
                    </tr>
                    <tr className="bg-pink-100 font-black border-t-2 border-slate-800 text-slate-900">
                      <td className="p-1.5 border-r border-slate-300" colSpan={3}>GROSS PREMIUM</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{formatCurrency(cbicWritingGrossPrem)}</td>
                      <td className="p-1.5 border-r border-slate-300"></td>
                      <td className="p-1.5 text-right">₱{formatCurrency(cbicNetGrossPrem)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGE 2: CBIC Commissions & Accounting Breakdown */}
            <div className="p-5 space-y-5 bg-white">
              <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-800 text-center border border-slate-300">
                PAGE 2 — CBIC REMITTANCE & COMPANY INCOME
              </div>

              {/* Tariff Commissions Block */}
              <div className="space-y-2 border border-slate-300 p-3.5 rounded-lg bg-slate-50">
                <p className="font-bold text-slate-800 uppercase text-[11px] border-b border-slate-200 pb-1.5">
                  Tariff Commission Deductions
                </p>
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>EBI Commission (30%)</span>
                  <span>₱{formatCurrency(cbicEBIComm)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>TPPD Commission (20%)</span>
                  <span>₱{formatCurrency(cbicTPPDComm)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>Total Tariff Commission</span>
                  <span>₱{formatCurrency(cbicTotalTariffComm)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Less Withholding Tax (10%)</span>
                  <span>₱{formatCurrency(cbicWHTax)}</span>
                </div>
                <div className="flex justify-between font-black text-xs bg-yellow-200/80 p-2 rounded border border-yellow-300 text-slate-900">
                  <span>NET TARIFF COMMISSION</span>
                  <span>₱{formatCurrency(cbicNetTariffComm)}</span>
                </div>
              </div>

              {/* Final CBIC Remittance & Income Summary */}
              <div className="space-y-2.5 border-t-2 border-slate-800 pt-4 text-xs">
                <div className="flex justify-between font-black p-3 bg-red-700 text-white rounded-lg shadow-2xs">
                  <span>NET REMITTANCE TO CBIC</span>
                  <span>₱{formatCurrency(cbicNetRemittance)}</span>
                </div>

                <div className="flex justify-between font-bold p-2.5 bg-lime-500 text-slate-950 rounded-lg shadow-2xs">
                  <span>TOTAL PREMIUM ON POLICY</span>
                  <span>₱{formatCurrency(totalPolicyPremium)}</span>
                </div>

                <div className="flex justify-between font-black text-sm p-3 bg-yellow-300 text-slate-950 rounded-lg border border-yellow-400 shadow-2xs">
                  <span>COMPANY INCOME</span>
                  <span>₱{formatCurrency(cbicCompanyIncome)}</span>
                </div>

                <div className="flex justify-between text-slate-700 text-[11px] px-1 font-semibold pt-1">
                  <span>LESS SUB-AGENT MARK UP</span>
                  <span>₱{formatCurrency(subAgentMarkup)}</span>
                </div>

                <div className="flex justify-between text-slate-700 text-[11px] px-1 font-semibold">
                  <span>LESS FREEBIE & CASHBACK</span>
                  <span>₱{formatCurrency(freebieCashback)}</span>
                </div>

                <div className="flex justify-between font-black text-sm p-3 bg-emerald-400 text-slate-950 rounded-lg border border-emerald-500 shadow-2xs">
                  <span>NET INCOME</span>
                  <span>₱{formatCurrency(cbicNetIncome)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── ALPHA STATEMENT LAYOUT ────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs border border-slate-300 rounded-xl overflow-hidden print:grid-cols-2">
            {/* PAGE 1: Policy & Customer Info + Primary Tariffs */}
            <div className="p-5 space-y-5 border-r border-slate-300 bg-white">
              <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-800 text-center border border-slate-300">
                Page 1 — Policy & Vehicle Details (ALPHA)
              </div>

              {/* Basic Info Key-Value Table */}
              <div className="space-y-1 divide-y divide-slate-200 text-slate-800">
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">TERM:</span>
                  <span className="font-semibold text-right flex-1">
                    {quotation.valid_until ? new Date(quotation.created_at).toLocaleDateString() + ' to ' + new Date(quotation.valid_until).toLocaleDateString() : '1 YEAR'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">DATE OF ISSUANCE:</span>
                  <span className="font-semibold text-right flex-1">{new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">ASSURED:</span>
                  <span className="font-bold uppercase text-right flex-1">{assuredName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">ADDRESS:</span>
                  <span className="font-semibold text-right flex-1">{address}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">DETAILS:</span>
                  <span className="font-semibold text-right flex-1">{vehicleUnit}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">MORTGAGEE:</span>
                  <span className="font-semibold text-right flex-1">{mortgagee}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">AGENT:</span>
                  <span className="font-bold uppercase text-right flex-1">{agentName}</span>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-3 space-y-1 divide-y divide-slate-200">
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">VEHICLE:</span>
                  <span className="font-semibold text-right flex-1">{vehicleUnit}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">PLATE NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{plateNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">ENGINE NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{engineNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">CHASSIS NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{chassisNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">MV FILE NO.:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{mvFileNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-slate-600 w-36">COLOR:</span>
                  <span className="font-semibold text-right flex-1 uppercase">{color}</span>
                </div>
              </div>

              {/* Coverage Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 text-left">Coverage</th>
                      <th className="p-2 text-right">Sum Insured</th>
                      <th className="p-2 text-center">Rate</th>
                      <th className="p-2 text-right">Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-lime-50/60">
                      <td className="p-2 font-bold text-slate-900">Own Damage/Theft</td>
                      <td className="p-2 text-right">{formatCurrency(sumInsured)}</td>
                      <td className="p-2 text-center">{rateOD.toFixed(2)}%</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(premOD)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-900">Acts of Nature</td>
                      <td className="p-2 text-right">{formatCurrency(sumInsured)}</td>
                      <td className="p-2 text-center">{rateAON.toFixed(2)}%</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(premAON)}</td>
                    </tr>
                    <tr className="bg-lime-50/60">
                      <td className="p-2 font-bold text-slate-900">Excess Bodily Injury</td>
                      <td className="p-2 text-right">{formatCurrency(covBIVal)}</td>
                      <td className="p-2 text-center">—</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(premBIVal)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-900">Property Damage</td>
                      <td className="p-2 text-right">{formatCurrency(covPDVal)}</td>
                      <td className="p-2 text-center">—</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(premPDVal)}</td>
                    </tr>
                    <tr className="bg-lime-50/60">
                      <td className="p-2 font-bold text-slate-900">APA (for 10 Passengers)</td>
                      <td className="p-2 text-right">{formatCurrency(covPAVal)}</td>
                      <td className="p-2 text-center">—</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(premPAVal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Premium Charges Subtotal */}
              <div className="space-y-1.5 border-t-2 border-slate-800 pt-3 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>PREMIUM</span>
                  <span>{formatCurrency(subtotalPremium)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>CHARGES ({(chargesRate * 100).toFixed(2)}%)</span>
                  <span>{formatCurrency(chargesAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>TOWING (Auto Assist)</span>
                  <span>{formatCurrency(towingFee)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                  <span>TOTAL</span>
                  <span>₱{formatCurrency(grossTotal)}</span>
                </div>
              </div>
            </div>

            {/* PAGE 2: Commission, Remittance & Company Income Calculations */}
            <div className="p-5 space-y-5 bg-white">
              <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-800 text-center border border-slate-300">
                Page 2 — Tariff Commissions & Company Remittance (ALPHA)
              </div>

              {/* Commissions Breakdown Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 text-left">Tariff Item</th>
                      <th className="p-2 text-center">Comm %</th>
                      <th className="p-2 text-right">Comm Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 font-medium">Acts of Nature (30% comm on TARIFF)</td>
                      <td className="p-2 text-center">—</td>
                      <td className="p-2 text-right font-medium">—</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Excess Bodily Injury</td>
                      <td className="p-2 text-center font-bold">{commBIPct}%</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(commBI)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-900">Property Damage</td>
                      <td className="p-2 text-center font-bold">{commPDPct}%</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(commPD)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Commission Totals Block */}
              <div className="space-y-2 border border-slate-300 p-3 rounded-lg bg-slate-50/50">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>COMM ON TARIFF</span>
                  <span>{formatCurrency(commOnTariff)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>LESS WITHHOLDING TAX ({wHTaxPct}%)</span>
                  <span>{formatCurrency(withholdingTax)}</span>
                </div>
                <div className="flex justify-between font-black text-sm bg-yellow-200/80 p-2 rounded border border-yellow-300 text-slate-900">
                  <span>TOTAL COMM ON TARIFF</span>
                  <span>₱{formatCurrency(totalCommOnTariff)}</span>
                </div>
              </div>

              {/* Final Accounting Breakdown */}
              <div className="space-y-2 border-t-2 border-slate-800 pt-4 text-xs">
                <div className="flex justify-between font-bold p-2.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                  <span>REMITTANCE TO ALPHA</span>
                  <span>₱{formatCurrency(alphaRemittanceToProvider)}</span>
                </div>

                <div className="flex justify-between font-bold p-2.5 bg-lime-500 text-slate-950 rounded-lg shadow-2xs">
                  <span>TOTAL PREMIUM ON POLICY</span>
                  <span>₱{formatCurrency(totalPolicyPremium)}</span>
                </div>

                <div className="flex justify-between font-black text-sm p-3 bg-yellow-300 text-slate-950 rounded-lg border border-yellow-400 shadow-2xs">
                  <span>COMPANY INCOME</span>
                  <span>₱{formatCurrency(alphaCompanyIncome)}</span>
                </div>

                <div className="flex justify-between text-slate-700 text-[11px] px-1 font-semibold pt-1">
                  <span>LESS SUB-AGENT MARK UP</span>
                  <span>₱{formatCurrency(subAgentMarkup)}</span>
                </div>

                <div className="flex justify-between text-slate-700 text-[11px] px-1 font-semibold">
                  <span>LESS FREEBIE & CASHBACK</span>
                  <span>₱{formatCurrency(freebieCashback)}</span>
                </div>

                <div className="flex justify-between font-black text-sm p-3 bg-emerald-400 text-slate-950 rounded-lg border border-emerald-500 shadow-2xs">
                  <span>NET INCOME</span>
                  <span>₱{formatCurrency(alphaNetIncome)}</span>
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
