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
    queryKey: ['invoices-summary-commission', selectedMonth, currentPage, perPage],
    queryFn: () =>
      getInvoices({
        page: currentPage,
        per_page: perPage,
        sort_by: 'created_at',
        sort_dir: 'desc',
      }),
    refetchInterval: 5000,
  });

  const rawInvoices = invoicesRes?.data?.data || [];
  const pagination = invoicesRes?.data;

  // Extract unique agents from raw invoices
  const availableAgents = useMemo(() => {
    const agents = new Set<string>();
    rawInvoices.forEach((inv) => {
      const agentName =
        inv.customer?.agent ||
        (typeof inv.created_by === 'object' ? inv.created_by?.name : null);
      if (agentName) agents.add(agentName);
    });
    return Array.from(agents);
  }, [rawInvoices]);

  // Compute items dynamically from actual system records
  const commissionRows = useMemo(() => {
    return rawInvoices.map((inv: Invoice) => {
      const cust = inv.customer;
      const cov = (inv.policy as any)?.quotation?.items?.[0]?.coverage_details || {};
      const agentName =
        cust?.agent ||
        (typeof inv.created_by === 'object' ? inv.created_by?.name : 'SALES AGENT');

      const dateRequest = inv.created_at
        ? new Date(inv.created_at).toLocaleDateString()
        : '—';

      const accountType = (cust as any)?.account_type || 'NEW ACCOUNT';

      const activity =
        (cust as any)?.source_activity ||
        (cust as any)?.channel ||
        'SUPREMO MAIN PAGE';

      const provider =
        (cust as any)?.insurance_provider ||
        cov?.provider ||
        cov?.insurance_provider ||
        'ALPHA';

      const quotationUsed =
        cust?.quotation_used || cov?.vehicle_type || 'SEDAN';

      const usage = cust?.usage || cov?.usage || 'PRIVATE';

      const assuredName = cust
        ? `${cust.first_name} ${cust.last_name}`.trim().toUpperCase() +
          (cust.mortgage ? ` LEASED TO ${cust.mortgage.toUpperCase()}` : '')
        : '—';

      const plateNumber = cust?.plate_no || cov?.plate_no || '—';

      const totalPremium = Number(inv.total_amount || 0);
      const terms = Number(cust?.payment_terms || 1);

      const verifiedPaymentsCount = (inv.payments || []).filter(
        (p) => p.verification_status === 'verified'
      ).length;

      const invStatus = inv.status as string;
      const isCancelled =
        invStatus === 'cancelled' ||
        invStatus === 'voided' ||
        (inv.policy as any)?.status?.toLowerCase() === 'cancelled' ||
        cust?.policy_status?.toUpperCase() === 'CANCELLED';

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

      // Estimate Commission & Incentive based on tariff
      const estComm = roundTwo(totalPremium * 0.10); // Standard 10% estimation
      const estIncentive = terms === 1 ? 500 : 0; // ₱500 incentive for 1-term spot cash

      return {
        id: inv.id,
        agentName,
        dateRequest,
        type: accountType,
        activity,
        provider: provider.toUpperCase(),
        quotationUsed: quotationUsed.toUpperCase(),
        usage: usage.toUpperCase(),
        assuredName,
        plateNumber: plateNumber.toUpperCase(),
        totalPremium,
        terms,
        remarksNotes: (inv as any)?.remarks || '—',
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
      if (
        selectedAgent !== 'all' &&
        row.agentName.toLowerCase() !== selectedAgent.toLowerCase()
      ) {
        return false;
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
  }, [commissionRows, selectedAgent, selectedProvider, selectedStatus, searchQuery]);

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

  // Table Columns
  const columns = [
    {
      key: 'agentName',
      label: "AGENT'S NAME",
      render: (row: any) => (
        <span className="font-bold text-slate-800 uppercase text-xs">
          {row.agentName}
        </span>
      ),
    },
    {
      key: 'dateRequest',
      label: 'DATE REQUEST',
      render: (row: any) => (
        <span className="text-slate-600 text-xs font-mono">{row.dateRequest}</span>
      ),
    },
    {
      key: 'type',
      label: 'TYPE',
      render: (row: any) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {row.type}
        </span>
      ),
    },
    {
      key: 'activity',
      label: 'ACTIVITY',
      render: (row: any) => (
        <span className="text-slate-600 text-xs font-medium">{row.activity}</span>
      ),
    },
    {
      key: 'provider',
      label: 'PROVIDER',
      render: (row: any) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
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
      label: 'QUOTATION USED',
      render: (row: any) => (
        <span className="font-bold text-slate-800 text-xs">{row.quotationUsed}</span>
      ),
    },
    {
      key: 'usage',
      label: 'USAGE',
      render: (row: any) => (
        <span className="text-slate-600 text-xs">{row.usage}</span>
      ),
    },
    {
      key: 'assuredName',
      label: 'ASSURED NAME',
      render: (row: any) => (
        <span className="font-bold text-slate-900 text-xs uppercase">
          {row.assuredName}
        </span>
      ),
    },
    {
      key: 'plateNumber',
      label: 'PLATE NUMBER',
      render: (row: any) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {row.plateNumber}
        </span>
      ),
    },
    {
      key: 'totalPremium',
      label: 'TOTAL PREMIUM',
      render: (row: any) => (
        <span className="font-mono text-xs font-bold text-emerald-700">
          ₱{formatAmount(row.totalPremium)}
        </span>
      ),
    },
    {
      key: 'terms',
      label: 'TERMS',
      render: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          {row.terms}
        </span>
      ),
    },
    {
      key: 'remarksNotes',
      label: 'REMARKS / NOTES',
      render: (row: any) => (
        <span className="text-slate-400 text-xs italic">{row.remarksNotes}</span>
      ),
    },
    {
      key: 'incentive',
      label: 'INCENTIVE',
      render: (row: any) => (
        <span className="font-mono text-xs font-bold text-amber-700">
          {row.incentive > 0 ? `₱${formatAmount(row.incentive)}` : '—'}
        </span>
      ),
    },
    {
      key: 'comm',
      label: 'COMM',
      render: (row: any) => (
        <span className="font-mono text-xs font-bold text-[#4A0E17]">
          ₱{formatAmount(row.comm)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'PAYMENT STATUS',
      render: (row: any) => {
        if (row.isCancelled) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              CANCELLED
            </span>
          );
        }
        if (row.paymentStatus === 'FULLY PAID') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              FULLY PAID
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase">
            {row.paymentStatus}
          </span>
        );
      },
    },
    {
      key: 'remarks',
      label: 'REMARKS',
      render: (row: any) => {
        const isHighlight = row.remarks.includes('ALREADY RELEASED');
        return (
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded ${
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
            <p className="text-lg font-black text-[#4A0E17] font-mono mt-0.5">₱{formatAmount(totalCommSum)}</p>
          </div>
          <div className="p-2.5 bg-[#4A0E17]/10 rounded-xl text-[#4A0E17]">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Incentive</p>
            <p className="text-lg font-black text-amber-700 font-mono mt-0.5">₱{formatAmount(totalIncentiveSum)}</p>
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
          columns={columns}
          data={filteredRows}
          loading={isLoading}
        />

        {pagination && (
          <div className="p-3 border-t border-slate-100 no-print">
            <Pagination
              currentPage={pagination.current_page}
              lastPage={pagination.last_page}
              perPage={pagination.per_page}
              total={pagination.total}
              from={pagination.from}
              to={pagination.to}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(per_page) => {
                setPerPage(per_page);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
