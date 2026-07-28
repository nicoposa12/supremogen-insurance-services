import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { getInvoices } from '../../services/invoiceApi';
import type { Invoice } from '../../types/AccountingTypes';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';

export default function SummaryCommissionPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // e.g. "2026-06"
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const formatAmount = (val: number): string => {
    return Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Fetch invoices for live real-time commission tracking
  const { data: invoicesRes, isLoading } = useQuery({
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
  const pagination = invoicesRes?.data;

  // Extract unique agents from raw invoices
  const availableAgents = useMemo(() => {
    const agents = new Set<string>();
    rawInvoices.forEach((inv) => {
      const cust = inv.customer;
      const policy = (inv as any).policy;
      const quotation = policy?.quotation;
      const agentName =
        cust?.agent ||
        (typeof inv.created_by === 'object' ? inv.created_by?.name : null) ||
        (typeof quotation?.prepared_by === 'object' ? quotation.prepared_by?.name : null) ||
        (typeof quotation?.reviewed_by === 'object' ? quotation.reviewed_by?.name : null) ||
        (typeof policy?.issued_by === 'object' ? policy.issued_by?.name : null);
      if (agentName && agentName.trim()) agents.add(agentName.trim());
    });
    return Array.from(agents).sort();
  }, [rawInvoices]);

  // Compute items dynamically from actual system records
  const commissionRows = useMemo(() => {
    return rawInvoices.map((inv: Invoice) => {
      const cust = inv.customer;
      const policy = (inv as any).policy;
      const quotation = policy?.quotation;
      const cov = quotation?.items?.[0]?.coverage_details || {};

      const agentName =
        cust?.agent ||
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
        ? new Date(cust.writing_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
        : inv.created_at
        ? new Date(inv.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
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

      let paymentStatus = 'UNPAID';
      let remarks = '—';

      if (isCancelled) {
        paymentStatus = 'CANCELLED';
        remarks = 'CANCELLED POLICY';
      } else if (Number(inv.balance) <= 0 || inv.status === 'paid') {
        paymentStatus = 'FULLY PAID';
        remarks = 'ALREADY RELEASED ONE TIME PAYMENT COMM';
      } else if (verifiedPaymentsCount === 1) {
        paymentStatus = '1ST PAYMENT';
        remarks = '1st Installment Verified';
      } else if (verifiedPaymentsCount === 2) {
        paymentStatus = '2ND PAYMENT';
        remarks = '2nd Installment Verified';
      } else if (verifiedPaymentsCount === 3) {
        paymentStatus = '3RD PAYMENT';
        remarks = '3rd Installment Verified';
      } else if (verifiedPaymentsCount > 3) {
        paymentStatus = `${verifiedPaymentsCount}TH PAYMENT`;
        remarks = `${verifiedPaymentsCount}th Installment Verified`;
      }

      const agentMarkup = Number(
        cov.calculator?.agent_markup ||
        cov.agent_markup ||
        (cust as any)?.agent_markup ||
        (cust as any)?.commission ||
        0
      );

      const estComm = agentMarkup;
      const estIncentive = Number((cust as any)?.incentive || 1000);

      let rawNotes = (inv as any)?.notes || cust?.notes || '';
      if (rawNotes.includes('Automatically generated invoice')) {
        rawNotes = cust?.notes || '';
      }
      const remarksNotes = rawNotes.trim() ? rawNotes : '—';

      return {
        id: inv.id,
        agentName,
        dateRequestRaw,
        dateRequest,
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
        incentive: estIncentive,
        comm: estComm,
        paymentStatus,
        remarks,
        isCancelled,
      };
    });
  }, [rawInvoices]);

  // Filter rows by user selections
  const filteredRows = useMemo(() => {
    return commissionRows.filter((row) => {
      // Apply month filter only if user is NOT searching globally and NOT selecting a specific agent
      if (selectedMonth && !searchQuery && selectedAgent === 'all' && row.dateRequestRaw) {
        if (row.dateRequestRaw !== selectedMonth) {
          return false;
        }
      }
      if (selectedAgent !== 'all') {
        const selLower = selectedAgent.trim().toLowerCase();
        const rowAgentLower = row.agentName.trim().toLowerCase();
        if (rowAgentLower !== selLower && !rowAgentLower.includes(selLower)) {
          return false;
        }
      }
      if (
        selectedProvider !== 'all' &&
        !row.provider.includes(selectedProvider.toUpperCase())
      ) {
        return false;
      }
      if (
        selectedStatus !== 'all' &&
        row.paymentStatus.toUpperCase() !== selectedStatus.toUpperCase()
      ) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          row.assuredName.toLowerCase().includes(q) ||
          row.agentName.toLowerCase().includes(q) ||
          row.plateNumber.toLowerCase().includes(q) ||
          row.provider.toLowerCase().includes(q) ||
          row.quotationUsed.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [commissionRows, selectedMonth, selectedAgent, selectedProvider, selectedStatus, searchQuery]);

  // Calculate totals
  const totalPremiumSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.totalPremium), 0),
    [filteredRows]
  );

  const totalCommSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.comm), 0),
    [filteredRows]
  );

  const totalIncentiveSum = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (r.isCancelled ? 0 : r.incentive), 0),
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

  // Table Columns
  const columns = [
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
      className: 'max-w-[60px] truncate',
      render: (row: any) => (
        <span className="text-slate-400 text-[10px] italic truncate block" title={row.remarksNotes}>{row.remarksNotes}</span>
      ),
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
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              CANCELLED
            </span>
          );
        }
        if (row.paymentStatus === 'FULLY PAID') {
          return (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              FULLY PAID
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase">
            {row.paymentStatus}
          </span>
        );
      },
    },
    {
      key: 'remarks',
      label: 'REMARKS',
      className: 'max-w-[90px] truncate',
      render: (row: any) => {
        const isHighlight = row.remarks.includes('ALREADY RELEASED');
        return (
          <span
            title={row.remarks}
            className={`text-[9.5px] font-medium px-1 py-0.5 rounded truncate block ${
              isHighlight
                ? 'bg-amber-100 text-amber-950 font-bold border border-amber-200'
                : row.isCancelled
                ? 'text-rose-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            {row.remarks}
          </span>
        );
      },
    },
  ];

  function roundTwo(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Sleek Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Summary Commission
          </h1>
          <p className="text-xs text-slate-500">
            Agent commission tracking & tariff breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" /> Print Statement
          </button>
        </div>
      </div>

      {/* Clean KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Premium</p>
            <p className="text-lg font-black text-slate-900 font-mono mt-0.5">₱{formatAmount(totalPremiumSum)}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Commission</p>
            <p className="text-lg font-black text-[#4A0E17] font-mono mt-0.5">
              {totalCommSum > 0 ? `₱${formatAmount(totalCommSum)}` : '₱0.00'}
            </p>
          </div>
          <div className="p-2.5 bg-[#4A0E17]/10 rounded-xl text-[#4A0E17]">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Incentive</p>
            <p className="text-lg font-black text-amber-700 font-mono mt-0.5">
              {totalIncentiveSum > 0 ? `₱${formatAmount(totalIncentiveSum)}` : '₱0.00'}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-700">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Accounts</p>
            <p className="text-lg font-black text-slate-800 font-mono mt-0.5">{filteredRows.filter((r) => !r.isCancelled).length}</p>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 no-print">
        <div className="flex flex-col md:flex-row items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-grow w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search assured name, agent, plate, provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shrink-0">
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
                className="text-[10px] font-extrabold text-[#4A0E17] hover:bg-[#4A0E17]/10 px-1.5 py-0.5 rounded transition cursor-pointer"
                title="Show All Months"
              >
                ALL
              </button>
            )}
          </div>

          {/* Agent Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shrink-0">
            <Briefcase className="h-3.5 w-3.5 text-[#4A0E17]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Agents</option>
              {availableAgents.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shrink-0">
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
        </div>
      </div>

      {/* Main Spreadsheet Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-[#4A0E17]/5 border-b border-[#4A0E17]/10 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#4A0E17]" />
            <span className="font-extrabold text-xs text-[#4A0E17] uppercase tracking-wider">
              Commission Ledger Statement — {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase() : 'ALL MONTHS'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 font-mono">
            {filteredRows.length} RECORDS
          </span>
        </div>

        <DataTable
          dense
          columns={columns}
          data={paginatedRows}
          loading={isLoading}
        />

        {totalFilteredCount > 0 && (
          <div className="p-3 border-t border-slate-100 no-print">
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
      </div>
    </div>
  );
}
