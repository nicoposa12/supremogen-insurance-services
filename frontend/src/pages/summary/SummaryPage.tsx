import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronDown, Printer, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { getCustomers } from '../../services/customerApi';
import type { CustomerListParams } from '../../types/CustomerTypes';
import logoImg from '../../assets/image/supremogen_logo.jpg';

// ─── Helpers ───────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Get ISO week number of a date */
function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/** Get the Monday of a given ISO week number in a given year */
function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

/** Get total ISO weeks in a given year */
function getWeeksInYear(year: number): number {
  const dec28 = new Date(year, 11, 28);
  return getISOWeek(dec28);
}



// ─── Component ─────────────────────────────────
export default function SummaryPage() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentWeek = getISOWeek(today);

  const [activeTab, setActiveTab] = useState<'premium' | 'bookings' | 'sales'>('premium');

  // Period type selector
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Contextual selectors
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0-indexed
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState(formatDateStr(today));


  // Generate available years (2020 to current + 1)
  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = 2020; y <= currentYear + 1; y++) result.push(y);
    return result;
  }, [currentYear]);

  // Available weeks for the selected year
  const weeksInSelectedYear = useMemo(() => getWeeksInYear(selectedYear), [selectedYear]);

  // Compute start_date and end_date from selections
  const { start_date, end_date } = useMemo(() => {
    let start: string;
    let end: string;

    if (periodType === 'day') {
      start = selectedDay;
      end = selectedDay;
    } else if (periodType === 'week') {
      const monday = getMondayOfWeek(selectedYear, selectedWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = formatDateStr(monday);
      end = formatDateStr(sunday);
    } else if (periodType === 'month') {
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      start = formatDateStr(firstDay);
      end = formatDateStr(lastDay);
    } else {
      // year
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
    }

    return { start_date: start, end_date: end };
  }, [periodType, selectedDay, selectedWeek, selectedMonth, selectedYear]);

  // Search & Filter parameters
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'new' | 'renewal'>('all');

  const params: CustomerListParams = useMemo(() => ({
    page: 1,
    per_page: 15,
    search: '',
    status: 'all',
    type: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
    no_paginate: true,
    include_cancelled: true,
    start_date,
    end_date,
  }), [start_date, end_date]);

  const queryParams = useMemo(() => ({
    ...params,
    search: '',
  }), [params]);

  // Fetch the data
  const { data: response, isLoading } = useQuery({
    queryKey: ['customers-summary', queryParams],
    queryFn: () => getCustomers(queryParams),
  });

  const list = response?.data?.data || [];

  // Fetch all sales agents to dynamically display their names in the summary tables
  const { data: agentsRes } = useQuery({
    queryKey: ['sales-agents-list'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/agents');
      return res.data;
    },
  });

  const dbAgents = useMemo(() => agentsRes?.data || [], [agentsRes]);

  // Construct dynamic teams based on the loaded dbAgents list, fallback to seeded defaults
  const dynamicTeams = useMemo(() => {
    const salesAgents = dbAgents
      .filter((a: any) => a.role_name === 'Sales Agent')
      .map((a: any) => a.name.toUpperCase().trim());

    const renewalAgents = dbAgents
      .filter((a: any) => a.role_name === 'Team Renewal')
      .map((a: any) => a.name.toUpperCase().trim());

    return {
      'NEW ACCOUNT': salesAgents.length > 0 ? salesAgents : ['ELLA LANGRIO', 'JM CAMINGUE'],
      'TEAM RENEWAL': renewalAgents.length > 0 ? renewalAgents : ['NIC MATULAC'],
      'PARTNERS': ['ARCHIE', 'ARIS', 'AUTORELIABLE INSURANCE', 'ACTIVE BEST', 'F1 INSURANCE SERVICES', 'F1S', 'PAMPANGA', 'PRIME', 'REEL DRIVE'],
      'TEAM SUPPORT': ['AIZA', 'ANGELICA', 'FROILAN', 'JELLAN', 'JESSROME', 'JHOY', 'KHEL', 'MICO', 'RONALYNE']
    };
  }, [dbAgents]);

  const matchAgentToPredefined = (dbName: string): string | null => {
    const name = dbName.toUpperCase().trim();
    if (!name) return null;

    for (const team of Object.keys(dynamicTeams)) {
      for (const agent of dynamicTeams[team as keyof typeof dynamicTeams]) {
        if (name.includes(agent) || agent.includes(name)) {
          return agent;
        }
      }
    }

    // Fuzzy mappings for seeded data:
    if (name.includes('JUAN') || name.includes('DELA CRUZ')) return 'ELLA LANGRIO';
    if (name.includes('MARIA') || name.includes('SANTOS')) return 'JM CAMINGUE';
    if (name.includes('NIC') || name.includes('MATULAC')) return 'NIC MATULAC';
    if (name.includes('NICS') || name.includes('NICO')) return 'MICO';
    if (name.includes('ELLA')) return 'ELLA LANGRIO';
    if (name.includes('JM') || name.includes('CAMINGUE')) return 'JM CAMINGUE';

    return null;
  };

  // Map predefined agent keys to their updated names from the database
  const agentNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbAgents.forEach((agent: any) => {
      const email = (agent.email || '').toLowerCase().trim();
      const name = (agent.name || '').toUpperCase().trim();

      if (email === 'agent@supremogen.com' || name.includes('ELLA') || name.includes('LANGRIO')) {
        map['ELLA LANGRIO'] = agent.name;
      } else if (email === 'accounting@supremogen.com' || name.includes('JM') || name.includes('CAMINGUE')) {
        map['JM CAMINGUE'] = agent.name;
      } else if (email === 'nico@supremogen.com' || name.includes('NICO') || name.includes('OPOSA') || name.includes('MICO')) {
        map['MICO'] = agent.name;
      } else if (email === 'renewal@supremogen.com' || name.includes('NIC') || name.includes('MATULAC')) {
        map['NIC MATULAC'] = agent.name;
      } else {
        map[name] = agent.name;
      }
    });
    return map;
  }, [dbAgents]);

  // Helper to identify if a row was created by a sales agent (NEW ACCOUNT team)
  const isSalesAgentRow = (row: any): boolean => {
    const agentObj = row.created_by;
    const dbName = agentObj && typeof agentObj === 'object' ? (agentObj.name || '') : '';
    const predefinedKey = matchAgentToPredefined(dbName);
    return predefinedKey ? dynamicTeams['NEW ACCOUNT'].includes(predefinedKey) : false;
  };

  // Group into New and Renewal Accounts
  const newAccounts = list.filter((row) => 
    row.request_type === 'NEW ACCOUNT' || 
    (row.request_type === 'RENEWAL CLIENT' && isSalesAgentRow(row))
  );
  const renewalAccounts = list.filter((row) => 
    row.request_type === 'RENEWAL CLIENT' && !isSalesAgentRow(row)
  );

  const showNew = accountTypeFilter === 'all' || accountTypeFilter === 'new';
  const showRenewal = accountTypeFilter === 'all' || accountTypeFilter === 'renewal';

  // Calculate totals
  const totalNew = newAccounts.reduce((sum, row) => sum + parseFloat(row.policy_premium as string || '0'), 0);
  const totalRenewal = renewalAccounts.reduce((sum, row) => sum + parseFloat(row.policy_premium as string || '0'), 0);
  const grandTotal = (showNew ? totalNew : 0) + (showRenewal ? totalRenewal : 0);

  const formatNum = (val: number) =>
    val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── Bookings Summary Specifics ──────────────────
  const bookingList = useMemo(() => {
    let filtered = list.filter(row => {
      const provider = (row.insurance_provider || '').toUpperCase().trim();
      return provider === 'ALPHA' || provider === 'CBIC';
    });

    return filtered;
  }, [list]);

  // Compute counts per agent
  const agentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(dynamicTeams).flat().forEach(agent => {
      counts[agent] = 0;
    });

    bookingList.forEach(row => {
      let matchedAgent: string | null = null;

      // 1. Try matching by creator's email first (most accurate for DB users)
      if (row.created_by && typeof row.created_by === 'object') {
        const email = ((row.created_by as any).email || '').toLowerCase().trim();
        const found = dbAgents.find((a: any) => (a.email || '').toLowerCase().trim() === email);
        if (found) {
          matchedAgent = found.name.toUpperCase().trim();
        }
      }

      // 2. Fallback to name-based matching
      if (!matchedAgent) {
        const dbAgentName = row.agent || (row.created_by && typeof row.created_by === 'object' ? (row.created_by as any).name : '') || '';
        matchedAgent = matchAgentToPredefined(dbAgentName);
      }

      if (matchedAgent) {
        counts[matchedAgent] = (counts[matchedAgent] || 0) + 1;
      }
    });

    return counts;
  }, [bookingList, dynamicTeams, dbAgents]);

  // Compute counts per team
  const teamCounts = useMemo(() => {
    return {
      'NEW ACCOUNT': dynamicTeams['NEW ACCOUNT'].reduce((sum: number, agent: string) => sum + (agentCounts[agent] || 0), 0),
      'TEAM RENEWAL': dynamicTeams['TEAM RENEWAL'].reduce((sum: number, agent: string) => sum + (agentCounts[agent] || 0), 0),
      'PARTNERS': dynamicTeams['PARTNERS'].reduce((sum: number, agent: string) => sum + (agentCounts[agent] || 0), 0),
      'TEAM SUPPORT': dynamicTeams['TEAM SUPPORT'].reduce((sum: number, agent: string) => sum + (agentCounts[agent] || 0), 0),
    };
  }, [agentCounts, dynamicTeams]);

  // Motorcar vs Otherline
  const motorcarCount = useMemo(() => {
    return bookingList.filter(row => !!(row.plate_no || row.engine_no || row.chassis_no || row.unit)).length;
  }, [bookingList]);

  const otherlineCount = useMemo(() => {
    return bookingList.length - motorcarCount;
  }, [bookingList, motorcarCount]);

  // Provider counts
  const providerCounts = useMemo(() => {
    return {
      'ALPHA': bookingList.filter(row => (row.insurance_provider || '').toUpperCase().trim() === 'ALPHA').length,
      'CBIC': bookingList.filter(row => (row.insurance_provider || '').toUpperCase().trim() === 'CBIC').length,
    };
  }, [bookingList]);

  const totalProviderCount = useMemo(() => {
    return providerCounts['ALPHA'] + providerCounts['CBIC'];
  }, [providerCounts]);

  // Total premium for bookings (Alpha and CBIC only)
  const totalBookingPremium = useMemo(() => {
    return bookingList.reduce((sum, row) => sum + parseFloat(row.policy_premium as string || '0'), 0);
  }, [bookingList]);

  // Helper to categorize providers for the Sales Summary
  const getProviderCategory = (provider: string): string => {
    const p = (provider || '').toUpperCase().trim();
    if (p.includes('ALPHA')) return 'ALPHA GREENHILLS';
    if (p.includes('BETHEL')) return 'BETHEL DIRECT';
    if (p.includes('CBIC')) return 'CBIC';
    if (p.includes('PBAC')) return 'PBAC';
    if (p.includes('STANDARD') || p.includes('CARMOR')) return 'STANDARD CARMOR';
    if (p.includes('COMPRELINE')) return 'COMPRELINE';
    return 'OTHERLINE';
  };

  // Compute counts/cancels/totals per agent for the Number of Sales report
  const salesAgentStats = useMemo(() => {
    const stats: Record<string, { bookings: number; cancelled: number; total: number }> = {};
    Object.values(dynamicTeams).flat().forEach(agent => {
      stats[agent] = { bookings: 0, cancelled: 0, total: 0 };
    });

    bookingList.forEach(row => {
      let matchedAgent: string | null = null;
      if (row.created_by && typeof row.created_by === 'object') {
        const email = ((row.created_by as any).email || '').toLowerCase().trim();
        const found = dbAgents.find((a: any) => (a.email || '').toLowerCase().trim() === email);
        if (found) {
          matchedAgent = found.name.toUpperCase().trim();
        }
      }
      if (!matchedAgent) {
        const dbAgentName = row.agent || (row.created_by && typeof row.created_by === 'object' ? (row.created_by as any).name : '') || '';
        matchedAgent = matchAgentToPredefined(dbAgentName);
      }

      if (matchedAgent) {
        const policyStatus = (row.policy_status || '').toUpperCase().trim();
        const customerStatus = (row.status || '').toLowerCase().trim();
        const hasCancelledQuotation = row.quotations && Array.isArray(row.quotations) && row.quotations.some((q: any) => (q.status || '').toLowerCase() === 'cancelled');

        const isCancelled = policyStatus === 'CANCELLED' || customerStatus === 'cancelled' || hasCancelledQuotation;
        
        stats[matchedAgent].bookings += 1;
        if (isCancelled) {
          stats[matchedAgent].cancelled += 1;
        }
        stats[matchedAgent].total = stats[matchedAgent].bookings - stats[matchedAgent].cancelled;
      }
    });

    return stats;
  }, [bookingList, dynamicTeams, dbAgents]);

  // Compute team totals for the Number of Sales report
  const salesTeamStats = useMemo(() => {
    const teamTotals: Record<string, { bookings: number; cancelled: number; total: number }> = {};
    Object.keys(dynamicTeams).forEach(team => {
      let bookings = 0;
      let cancelled = 0;
      let total = 0;
      dynamicTeams[team as keyof typeof dynamicTeams].forEach((agent: string) => {
        const s = salesAgentStats[agent];
        if (s) {
          bookings += s.bookings;
          cancelled += s.cancelled;
          total += s.total;
        }
      });
      teamTotals[team] = { bookings, cancelled, total };
    });
    return teamTotals;
  }, [salesAgentStats, dynamicTeams]);

  // Compute grand totals for the Number of Sales report
  const salesGrandTotals = useMemo(() => {
    let bookings = 0;
    let cancelled = 0;
    let total = 0;
    Object.values(salesAgentStats).forEach(s => {
      bookings += s.bookings;
      cancelled += s.cancelled;
      total += s.total;
    });
    return { bookings, cancelled, total };
  }, [salesAgentStats]);

  // Compute provider counts for the Number of Sales report (ALPHA and CBIC only)
  const salesProviderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'ALPHA GREENHILLS': 0,
      'CBIC': 0
    };
    bookingList.forEach(row => {
      const cat = getProviderCategory(row.insurance_provider || '');
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    });
    return counts;
  }, [bookingList]);

  const salesTotalProviderCount = useMemo(() => {
    return Object.values(salesProviderCounts).reduce((sum, val) => sum + val, 0);
  }, [salesProviderCounts]);

  // Compute total active premium for the Number of Sales report
  const salesTotalPremium = useMemo(() => {
    return bookingList.reduce((sum, row) => {
      const isCancelled = (row.policy_status || '').toUpperCase().trim() === 'CANCELLED';
      if (!isCancelled) {
        return sum + parseFloat(row.policy_premium as string || '0');
      }
      return sum;
    }, 0);
  }, [bookingList]);

  // Formatted date label for headings
  const formattedPeriodLabel = useMemo(() => {
    if (periodType === 'day') {
      const d = new Date(selectedDay);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (periodType === 'week') {
      const monday = getMondayOfWeek(selectedYear, selectedWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const s = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `Week ${selectedWeek} (${s} – ${e})`;
    } else if (periodType === 'month') {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    } else {
      return `Year ${selectedYear}`;
    }
  }, [periodType, selectedDay, selectedWeek, selectedMonth, selectedYear]);

  // Generate date titles
  const dateStr = useMemo(() => {
    if (periodType === 'day') {
      const d = new Date(selectedDay);
      const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
      return `${label} | DAILY SUMMARY`;
    } else if (periodType === 'week') {
      const monday = getMondayOfWeek(selectedYear, selectedWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const s = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      const e = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      return `WEEK ${selectedWeek}: ${s} – ${e} | WEEKLY SUMMARY`;
    } else if (periodType === 'month') {
      return `${MONTH_NAMES[selectedMonth].toUpperCase()} ${selectedYear} | MONTHLY SUMMARY`;
    } else {
      return `YEAR ${selectedYear} | YEARLY SUMMARY`;
    }
  }, [periodType, selectedDay, selectedWeek, selectedMonth, selectedYear]);

  // Navigation handlers
  const handlePrev = () => {
    if (periodType === 'day') {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() - 1);
      setSelectedDay(formatDateStr(d));
    } else if (periodType === 'week') {
      if (selectedWeek <= 1) {
        const prevYear = selectedYear - 1;
        setSelectedYear(prevYear);
        setSelectedWeek(getWeeksInYear(prevYear));
      } else {
        setSelectedWeek(selectedWeek - 1);
      }
    } else if (periodType === 'month') {
      if (selectedMonth <= 0) {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(11);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNext = () => {
    if (periodType === 'day') {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() + 1);
      setSelectedDay(formatDateStr(d));
    } else if (periodType === 'week') {
      if (selectedWeek >= weeksInSelectedYear) {
        setSelectedYear(selectedYear + 1);
        setSelectedWeek(1);
      } else {
        setSelectedWeek(selectedWeek + 1);
      }
    } else if (periodType === 'month') {
      if (selectedMonth >= 11) {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(0);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  // Export current summary tab to Excel
  const exportToExcel = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    // Create Excel XML / HTML wrapper with basic styles for gridlines and formatting
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Summary Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          td, th { border: 1px solid #cbd5e1; padding: 6px; font-family: sans-serif; font-size: 11px; }
          th { font-weight: bold; background-color: #1e293b; color: #ffffff; }
          .bg-slate-800 { background-color: #1e293b !important; color: #ffffff !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; color: #0f172a !important; }
          .bg-\[\#4A0E17\] { background-color: #4a0e17 !important; color: #ffffff !important; }
          .font-bold { font-weight: bold; }
          .font-mono { font-family: monospace; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    
    const tabName = activeTab === 'premium' ? 'Premium_Summary' : activeTab === 'bookings' ? 'Bookings_Summary' : 'Number_of_Sales';
    const periodLabel = formattedPeriodLabel.replace(/[\s,]+/g, '_');
    const filename = `${tabName}_${periodLabel}.xls`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dropdown styling
  const selectClass = "w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer font-medium";
  const chevronOverlay = (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      <ChevronDown className="h-4 w-4" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: 100% !important;
            margin: 0 !important; padding: 0 !important;
            box-shadow: none !important; border: none !important;
            background: white !important; color: black !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col gap-1 no-print">
        <h1 className="text-xl font-bold text-slate-800">Financial Summary Report</h1>
        <p className="text-sm text-slate-500 font-medium">
          Generate and print accounts premium summary sorted by type
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 no-print">
        <button
          onClick={() => setActiveTab('premium')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'premium'
              ? 'border-[#4A0E17] text-[#4A0E17]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Premium Summary
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'bookings'
              ? 'border-[#4A0E17] text-[#4A0E17]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Bookings Summary
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'sales'
              ? 'border-[#4A0E17] text-[#4A0E17]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Number of Sales
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-3 no-print">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Period Type */}
          <div className="relative w-full sm:w-28 shrink-0">
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className={selectClass}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
            {chevronOverlay}
          </div>

          {/* Contextual selectors */}
          {periodType === 'day' && (
            <div className="relative w-full sm:w-36 shrink-0">
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value || formatDateStr(today))}
                className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition cursor-pointer font-medium"
              />
            </div>
          )}

          {periodType === 'week' && (
            <>
              <div className="relative w-full sm:w-20 shrink-0">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value);
                    setSelectedYear(yr);
                    const maxWeeks = getWeeksInYear(yr);
                    if (selectedWeek > maxWeeks) setSelectedWeek(maxWeeks);
                  }}
                  className={selectClass}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {chevronOverlay}
              </div>
              <div className="relative w-full sm:w-28 shrink-0">
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                  className={selectClass}
                >
                  {Array.from({ length: weeksInSelectedYear }, (_, i) => i + 1).map((w) => {
                    const mon = getMondayOfWeek(selectedYear, w);
                    const sun = new Date(mon);
                    sun.setDate(mon.getDate() + 6);
                    const label = `Wk ${w} (${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
                    return <option key={w} value={w}>{label}</option>;
                  })}
                </select>
                {chevronOverlay}
              </div>
            </>
          )}

          {periodType === 'month' && (
            <>
              <div className="relative w-full sm:w-20 shrink-0">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className={selectClass}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {chevronOverlay}
              </div>
              <div className="relative w-full sm:w-28 shrink-0">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className={selectClass}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
                {chevronOverlay}
              </div>
            </>
          )}

          {periodType === 'year' && (
            <div className="relative w-full sm:w-20 shrink-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={selectClass}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {chevronOverlay}
            </div>
          )}

          {/* Prev / Next navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-[#4A0E17] transition cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-[#4A0E17] transition cursor-pointer"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Account Type */}
          {activeTab === 'premium' && (
            <div className="relative w-full sm:w-32 shrink-0">
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value as any)}
                className={selectClass}
              >
                <option value="all">All Types</option>
                <option value="new">New Account</option>
                <option value="renewal">Renewal Client</option>
              </select>
              {chevronOverlay}
            </div>
          )}
        </div>

        {/* Print & Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-700/20 transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#4A0E17]/20 transition cursor-pointer shrink-0"
          >
            <Printer className="h-4 w-4" />
            Print Summary Report
          </button>
        </div>
      </div>

      {/* Preview Card / Print Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 overflow-hidden max-w-4xl mx-auto" id="print-area">
        {/* Professional Print Header */}
        {!isLoading && (
          <div className="flex flex-col items-center border-b-2 border-[#4A0E17] pb-4 mb-6 bg-white">
            <div className="flex items-center justify-between w-full gap-6">
              {/* Logo */}
              <div className="shrink-0">
                <img
                  src={logoImg}
                  alt="SUPREMOGEN Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
              
              {/* Company Info */}
              <div className="flex-grow text-right space-y-0.5">
                <h2 className="text-lg font-black text-[#4A0E17] tracking-tight uppercase leading-none mb-1">
                  SUPREMOGEN INSURANCE SERVICES
                </h2>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
                  VILL STATE CORP BUILDING, 2ND FLR UNIT F&H BRGY. COMMONWEALTH, QUEZON CITY, PHILIPPINES, 1121
                </p>
                <div className="flex justify-end gap-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>PHONE: 0994-364-2241 / 027-091-5125</span>
                  <span className="text-[#4A0E17]">•</span>
                  <span>EMAIL: sales@supremogen.com</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3 bg-white">
            <div className="w-10 h-10 border-4 border-[#4A0E17]/20 border-t-[#4A0E17] rounded-full animate-spin"></div>
            <span className="text-sm font-semibold tracking-wide">Loading report data...</span>
          </div>
        ) : activeTab === 'premium' ? (
          <div className="space-y-6 bg-white">
            {/* NEW ACCOUNTS TABLE */}
            {showNew && <div>
              <div className="text-center font-bold text-xs border-b border-slate-200 pb-2 mb-3 tracking-wider text-slate-700 uppercase">
                {dateStr} | NEW ACCOUNTS
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-slate-800 font-medium">
                  <thead>
                    <tr className="border border-slate-300 bg-slate-800 text-white font-bold">
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider w-1/4">Agent's Name</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider w-5/12">Assured Name</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider w-1/6">Payment Terms</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-right uppercase tracking-wider w-1/6">Total Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide">NEW ACCOUNT</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-[13px] font-semibold">{formatNum(totalNew)}</td>
                    </tr>
                    {newAccounts.length === 0 ? (
                      <tr className="border border-slate-300">
                        <td colSpan={4} className="px-3 py-5 text-center text-slate-400 font-medium bg-slate-50/50">
                          No new accounts recorded
                        </td>
                      </tr>
                    ) : (
                      newAccounts.map((row) => {
                        const agentName = (row.created_by && typeof row.created_by === 'object' ? (row.created_by as any).name : '—').toUpperCase();
                        const assuredName = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ').toUpperCase();
                        return (
                          <tr key={row.id} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                            <td className="border border-slate-300 px-3 py-2">{agentName}</td>
                            <td className="border border-slate-300 px-3 py-2">{assuredName}</td>
                            <td className="border border-slate-300 px-3 py-2 text-center">{row.payment_terms || '—'}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono">{formatNum(parseFloat(row.policy_premium as string || '0'))}</td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide">PARTNERS</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-[13px] font-semibold">0.00</td>
                    </tr>
                    <tr className="border border-slate-300 h-6">
                      <td className="border border-slate-300 px-3 py-2 bg-white">&nbsp;</td>
                      <td className="border border-slate-300 px-3 py-2 bg-white">&nbsp;</td>
                      <td className="border border-slate-300 px-3 py-2 bg-white">&nbsp;</td>
                      <td className="border border-slate-300 px-3 py-2 bg-white">&nbsp;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>}

            {/* RENEWAL ACCOUNTS TABLE */}
            {showRenewal && <div>
              <div className="text-center font-bold text-xs border-b border-slate-200 pb-2 mb-3 tracking-wider text-slate-700 uppercase">
                {dateStr} | RENEWAL ACCOUNTS
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-slate-800 font-medium">
                  <thead>
                    <tr className="border border-slate-300 bg-slate-800 text-white font-bold">
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider w-1/4">Agent's Name</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider w-5/12">Assured Name</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider w-1/6">Payment Terms</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-right uppercase tracking-wider w-1/6">Total Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewalAccounts.length === 0 ? (
                      <tr className="border border-slate-300">
                        <td colSpan={4} className="px-3 py-5 text-center text-slate-400 font-medium bg-slate-50/50">
                          No renewal accounts recorded
                        </td>
                      </tr>
                    ) : (
                      renewalAccounts.map((row) => {
                        const agentName = (row.created_by && typeof row.created_by === 'object' ? (row.created_by as any).name : '—').toUpperCase();
                        const assuredName = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ').toUpperCase();
                        return (
                          <tr key={row.id} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                            <td className="border border-slate-300 px-3 py-2">{agentName}</td>
                            <td className="border border-slate-300 px-3 py-2">{assuredName}</td>
                            <td className="border border-slate-300 px-3 py-2 text-center">{row.payment_terms || '—'}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono">{formatNum(parseFloat(row.policy_premium as string || '0'))}</td>
                          </tr>
                        );
                      })
                    )}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide">TOTAL PREMIUM:</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-[13px] font-semibold">{formatNum(totalRenewal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>}

            {/* GRAND TOTAL */}
            <div className="flex border border-[#4A0E17] text-sm font-bold bg-[#4A0E17] text-white uppercase rounded-xl overflow-hidden shadow-sm">
              <div className="flex-1 px-5 py-3 tracking-wider flex items-center">GRAND TOTAL PREMIUM</div>
              <div className="px-5 py-3 text-right font-mono text-base border-l border-white/20 tracking-wider font-bold bg-[#3A0B12] flex items-center">
                {formatNum(grandTotal)}
              </div>
            </div>
          </div>
        ) : activeTab === 'bookings' ? (
          /* BOOKINGS SUMMARY VIEW */
          <div className="space-y-6 bg-white">
            <div className="text-center font-bold text-xs border-b border-slate-200 pb-2 mb-3 tracking-wider text-slate-700 font-sans uppercase">
              {formattedPeriodLabel} BOOKING SUMMARY
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Bookings by Team & Agent */}
              <div className="md:col-span-7 overflow-x-auto">
                <table className="w-full border-collapse text-xs border border-slate-300 text-slate-800 font-medium">
                  <thead>
                    <tr className="border border-slate-300 bg-slate-800 text-white font-bold">
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider font-sans">&nbsp;</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider font-sans w-1/3">NO. OF BOOKINGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* NEW ACCOUNT */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">NEW ACCOUNT</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{teamCounts['NEW ACCOUNT']}</td>
                    </tr>
                    {dynamicTeams['NEW ACCOUNT'].map((agent: string) => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{agentCounts[agent]}</td>
                      </tr>
                    ))}

                    {/* TEAM RENEWAL */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">TEAM RENEWAL</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{teamCounts['TEAM RENEWAL']}</td>
                    </tr>
                    {dynamicTeams['TEAM RENEWAL'].map((agent: string) => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{agentCounts[agent]}</td>
                      </tr>
                    ))}

                    {/* PARTNERS */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">PARTNERS</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{teamCounts['PARTNERS']}</td>
                    </tr>
                    {dynamicTeams['PARTNERS'].map(agent => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{agentCounts[agent]}</td>
                      </tr>
                    ))}

                    {/* TEAM SUPPORT */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">TEAM SUPPORT</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{teamCounts['TEAM SUPPORT']}</td>
                    </tr>
                    {dynamicTeams['TEAM SUPPORT'].map(agent => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{agentCounts[agent]}</td>
                      </tr>
                    ))}

                    {/* Footer rows */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">
                        TOTAL NO. OF ISSUANCE AS OF TODAY FOR MOTORCAR
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono font-bold text-[13px]">{motorcarCount}</td>
                    </tr>
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">TOTAL NO. OF ISSUANCE AS OF TODAY FOR OTHERLINE</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono font-bold text-[13px]">{otherlineCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column: Providers Table & Total Premium Box */}
              <div className="md:col-span-5 space-y-6">
                <table className="w-full border-collapse text-xs border border-slate-300 text-slate-800 font-medium">
                  <thead>
                    <tr className="border border-slate-300 bg-slate-800 text-white font-bold">
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider font-sans">PROVIDERS</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider font-sans w-1/3">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border border-slate-300 hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 px-3 py-2 font-sans font-bold">ALPHA GREENHILLS</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono">{providerCounts['ALPHA']}</td>
                    </tr>
                    <tr className="border border-slate-300 hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 px-3 py-2 font-sans font-bold">CBIC</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono">{providerCounts['CBIC']}</td>
                    </tr>
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans text-xs">TOTAL NO. OF ACCOUNT PER PROVIDER</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono font-bold text-[13px]">{totalProviderCount}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total Premium Box */}
                <div className="border border-[#4A0E17] flex text-sm font-bold bg-[#4A0E17] text-white uppercase font-sans rounded-xl overflow-hidden shadow-sm">
                  <div className="flex-1 px-4 py-3 tracking-wider text-center border-r border-white/20 flex items-center justify-center font-bold">
                    TOTAL PREMIUM FOR {formattedPeriodLabel.toUpperCase()}
                  </div>
                  <div className="px-6 py-3 text-right font-mono text-lg font-bold text-white bg-[#3A0B12] flex items-center justify-end">
                    {formatNum(totalBookingPremium)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* NUMBER OF SALES VIEW */
          <div className="space-y-6 bg-white">
            <div className="text-center font-bold text-xs border-b border-slate-200 pb-2 mb-3 tracking-wider text-slate-700 font-sans uppercase">
              NUMBER OF SALES FOR THE {formattedPeriodLabel.toUpperCase()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Sales Table */}
              <div className="md:col-span-7 overflow-x-auto">
                <table className="w-full border-collapse text-xs border border-slate-300 text-slate-800 font-medium">
                  <thead>
                    <tr className="border border-slate-300 bg-slate-800 text-white font-bold">
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider font-sans">AGENT'S NAME</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider font-sans w-[22%]">NO. OF BOOKING</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider font-sans w-[22%]">NO. OF CANCEL ACC.</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider font-sans w-[18%]">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* TEAM SALES */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">TEAM SALES</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{salesTeamStats['NEW ACCOUNT'].total}</td>
                    </tr>
                    {dynamicTeams['NEW ACCOUNT'].map((agent: string) => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].bookings}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].cancelled || ''}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-semibold">{salesAgentStats[agent].total}</td>
                      </tr>
                    ))}

                    {/* TEAM RENEWAL */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">TEAM RENEWAL</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{salesTeamStats['TEAM RENEWAL'].total}</td>
                    </tr>
                    {dynamicTeams['TEAM RENEWAL'].map((agent: string) => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].bookings}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].cancelled || ''}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-semibold">{salesAgentStats[agent].total}</td>
                      </tr>
                    ))}

                    {/* PARTNERS */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">PARTNERS</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{salesTeamStats['PARTNERS'].total}</td>
                    </tr>
                    {dynamicTeams['PARTNERS'].map(agent => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].bookings}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].cancelled || ''}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-semibold">{salesAgentStats[agent].total}</td>
                      </tr>
                    ))}

                    {/* TEAM SUPPORT */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 uppercase tracking-wide font-sans">TEAM SUPPORT</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono text-[13px] font-semibold">{salesTeamStats['TEAM SUPPORT'].total}</td>
                    </tr>
                    {dynamicTeams['TEAM SUPPORT'].map(agent => (
                      <tr key={agent} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-1.5 font-sans pl-6">{(agentNamesMap[agent] || agent)?.toUpperCase()}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].bookings}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{salesAgentStats[agent].cancelled || ''}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-semibold">{salesAgentStats[agent].total}</td>
                      </tr>
                    ))}

                    {/* Footer Row */}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold text-[11px]">
                      <td className="border border-slate-300 px-3 py-2.5 uppercase tracking-wide font-sans">
                        TOTAL NUMBER OF ISSUANCE AS OF TODAY
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-mono font-bold text-[13px]">{salesGrandTotals.bookings}</td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-mono font-bold text-[13px]">{salesGrandTotals.cancelled}</td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-mono font-bold text-[13px]">{salesGrandTotals.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column: Providers & Account/Premium summary */}
              <div className="md:col-span-5 space-y-6">
                <table className="w-full border-collapse text-xs border border-slate-300 text-slate-800 font-medium">
                  <thead>
                    <tr className="border border-slate-300 bg-slate-800 text-white font-bold">
                      <th className="border border-slate-300 px-3 py-2.5 text-left uppercase tracking-wider font-sans">PROVIDERS</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center uppercase tracking-wider font-sans w-1/3">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(salesProviderCounts).map(providerName => (
                      <tr key={providerName} className="border border-slate-300 hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-300 px-3 py-2 font-sans font-bold">{providerName}</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono">{salesProviderCounts[providerName]}</td>
                      </tr>
                    ))}
                    <tr className="border border-slate-300 bg-slate-100 text-slate-900 font-bold">
                      <td className="border border-slate-300 px-3 py-2.5 uppercase tracking-wide font-sans text-xs">TOTAL NO. OF ACCOUNT PER PROVIDER</td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-mono font-bold text-[13px]">{salesTotalProviderCount}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total Account & Premium Box */}
                <div className="border border-[#4A0E17] grid grid-cols-12 text-xs bg-[#4A0E17] text-white font-bold font-sans rounded-xl overflow-hidden shadow-sm">
                  <div className="col-span-6 border-r border-white/20 px-3 py-3 text-center flex items-center justify-center font-bold">
                    TOTAL ACCOUNT & PREMIUM
                  </div>
                  <div className="col-span-2 border-r border-white/20 px-2 py-3 text-center font-mono text-[13px] flex items-center justify-center font-bold bg-[#3A0B12]">
                    {salesGrandTotals.total}
                  </div>
                  <div className="col-span-4 px-3 py-3 text-right font-mono text-[13px] flex items-center justify-end font-bold bg-[#3A0B12]">
                    {formatNum(salesTotalPremium)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
