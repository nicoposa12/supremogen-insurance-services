import { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getFileUrl } from '../../utils/url';

import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  RefreshCw,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Bell,
  Clock,
  ChevronDown,
  ShieldHalf,
  MailOpen,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  ClipboardList,
  FileSpreadsheet,
  FileSearch,

  Briefcase,
  Search,
  RotateCcw,
  DollarSign,
  Shield,
  AlertTriangle,
  CreditCard,
  Eye,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationApi';
import { useToast } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import type { SystemNotification } from '../../types/NotificationTypes';
import logoImg from '../../assets/image/supremogen_logo.jpg';

// ─── Navigation Config ────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  roleLabel: string;
  icon: typeof LayoutDashboard;
  accent: string;
  children: NavItem[];
}

// Flat nav items (used by non-admin roles)
const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Customer Records', path: '/dashboard/customers', icon: Users },
  { label: 'Policy Issuance Request', path: '/dashboard/quotations', icon: FileText },
  { label: 'Accounting', path: '/dashboard/invoices', icon: Receipt },
  { label: 'Policy Statements', path: '/dashboard/policy-statements', icon: FileSpreadsheet },
  { label: 'Review Collection Payment', path: '/dashboard/review-collection-payment', icon: CreditCard },
  { label: 'Summary Commission', path: '/dashboard/summary-commission', icon: FileSpreadsheet },
  { label: 'Claims', path: '/dashboard/claims', icon: ShieldHalf },
  { label: 'Claim Notifications', path: '/dashboard/claim-notifications', icon: AlertTriangle },
  { label: 'Completed Requirements', path: '/dashboard/completed-requirements', icon: CheckCircle2 },
  { label: 'Renewals', path: '/dashboard/renewals', icon: RefreshCw },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { label: 'Summary', path: '/dashboard/summary', icon: FileSpreadsheet },
  { label: 'Collection Module', path: '/dashboard/collection', icon: DollarSign },
  { label: 'Collection Ledger', path: '/dashboard/collection/ledger', icon: FileSpreadsheet },
  { label: 'Insurance Requests', path: '/dashboard/insurance-requests', icon: ClipboardList },
];

// Role-grouped nav (used by Administrator / Owner)
const adminNavGroups: NavGroup[] = [
  {
    roleLabel: 'Sales Agent',
    icon: Briefcase,
    accent: '#3b82f6', // blue
    children: [
      { label: 'Policy Issuance Request', path: '/dashboard/quotations?role=Sales Agent', icon: FileText },
      { label: 'Claim Notifications', path: '/dashboard/claim-notifications?role=Sales Agent', icon: AlertTriangle },
    ],
  },
  {
    roleLabel: 'Underwriter',
    icon: Search,
    accent: '#8b5cf6', // violet
    children: [
      { label: 'Insurance Requests', path: '/dashboard/insurance-requests', icon: ClipboardList },
    ],
  },
  {
    roleLabel: 'Team Renewals',
    icon: RotateCcw,
    accent: '#10b981', // emerald
    children: [
      { label: 'Policy Issuance Request', path: '/dashboard/quotations?role=Team Renewal', icon: FileText },
      { label: 'Claim Notifications', path: '/dashboard/claim-notifications?role=Team Renewal', icon: AlertTriangle },
    ],
  },
  {
    roleLabel: 'Accounting Officer',
    icon: DollarSign,
    accent: '#f59e0b', // amber
    children: [
      { label: 'Policy Statements', path: '/dashboard/policy-statements', icon: FileSpreadsheet },
      { label: 'Review Collection Payment', path: '/dashboard/review-collection-payment', icon: CreditCard },
      { label: 'Summary Commission', path: '/dashboard/summary-commission', icon: FileSpreadsheet },
    ],
  },
  {
    roleLabel: 'Claims Officer',
    icon: Shield,
    accent: '#ef4444', // red
    children: [
      { label: 'Claim Notifications', path: '/dashboard/claim-notifications', icon: AlertTriangle },
      { label: 'Completed Requirements', path: '/dashboard/completed-requirements', icon: CheckCircle2 },
    ],
  },
  {
    roleLabel: 'Collection',
    icon: DollarSign,
    accent: '#06b6d4', // cyan
    children: [
      { label: 'Collection Module', path: '/dashboard/collection', icon: DollarSign },
      { label: 'Collection Ledger', path: '/dashboard/collection/ledger', icon: FileSpreadsheet },
    ],
  },
];

// General items visible to admin at the bottom
const adminGeneralItems: NavItem[] = [
  { label: 'Customer Records', path: '/dashboard/customers', icon: Users },
  { label: 'Collection Module', path: '/dashboard/collection', icon: DollarSign },
  { label: 'Collection Ledger', path: '/dashboard/collection/ledger', icon: FileSpreadsheet },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { label: 'Summary', path: '/dashboard/summary', icon: FileSpreadsheet },
  { label: 'Audit Logs', path: '/dashboard/audit-logs', icon: FileSearch },
];

// All admin nav items flattened (for currentTitle lookup)
const allAdminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  ...adminNavGroups.flatMap((g) => g.children),
  ...adminGeneralItems,
];

// ─── Sidebar Sub-Item ─────────────────────────

function SidebarSubItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const cleanPath = item.path.split('?')[0];
  const itemParams = new URLSearchParams(item.path.split('?')[1] || '');
  const currentParams = new URLSearchParams(location.search);

  // If item path specifies a role parameter, it must match the current URL parameter
  const itemRole = itemParams.get('role');
  const currentRole = currentParams.get('role');
  const roleMatch = itemRole ? itemRole === currentRole : !currentRole;

  const isActive = (cleanPath === '/dashboard'
    ? location.pathname === '/dashboard'
    : (cleanPath === '/dashboard/collection'
        ? location.pathname === '/dashboard/collection'
        : location.pathname.startsWith(cleanPath))) && roleMatch;

  return (
    <div className="relative group/navitem">
      <NavLink
        to={item.path}
        end={item.path === '/dashboard' || item.path === '/dashboard/collection'}
        title={collapsed ? item.label : undefined}
        className={
          `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
            ? 'bg-gradient-to-r from-[#8A1C2E] to-[#5C0612] text-white shadow-md shadow-[#8A1C2E]/20 active-nav-item'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          } ${collapsed ? 'justify-center' : ''}`
        }
      >
        <item.icon className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-200 group-[.active-nav-item]:text-white transition-colors" />
        {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
      </NavLink>

      {/* Floating tooltip label on hover when sidebar is collapsed */}
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover/navitem:flex items-center z-50 pointer-events-none">
          <div className="relative bg-zinc-900 border border-zinc-700/80 text-zinc-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-fade-in flex items-center gap-1.5 before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-zinc-900">
            <span>{item.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Nav Group (collapsible role section) ──

function SidebarNavGroup({
  group,
  collapsed,
  isOpen: isOpenProp,
  onToggle,
}: {
  group: NavGroup;
  collapsed: boolean;
  isOpen?: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  const { roles = [] } = useAuth();

  const isExecutiveAdmin = roles.some((r: string) =>
    ['Administrator', 'Owner', 'Super Admin', 'Operational Manager', 'General Manager'].includes(r)
  );

  const userHasGroupRole = roles.some((r: string) => {
    if (group.roleLabel === 'Accounting Officer' && (r === 'Accounting Officer' || r === 'Accounting' || r === 'Team Support Operation')) return true;
    if (group.roleLabel === 'Underwriter' && r === 'Underwriter') return true;
    if (group.roleLabel === 'Collection' && r === 'Collection') return true;
    if (group.roleLabel === 'Claims Officer' && r === 'Claims Officer') return true;
    if (group.roleLabel === 'Sales Agent' && r === 'Sales Agent') return true;
    if (group.roleLabel === 'Team Renewals' && (r === 'Team Renewal' || r === 'Sales Agent')) return true;
    return false;
  });

  const isViewOnly = !isExecutiveAdmin && !userHasGroupRole;

  const hasActiveChild = group.children.some((child) => {
    const cleanPath = child.path.split('?')[0];
    const childParams = new URLSearchParams(child.path.split('?')[1] || '');
    const childRole = childParams.get('role');
    const roleMatch = childRole ? childRole === currentParams.get('role') : !currentParams.get('role');
    
    return location.pathname.startsWith(cleanPath) && roleMatch;
  });

  const isOpen = isOpenProp !== undefined ? isOpenProp : hasActiveChild;

  // Calculate max-height for animation (each item ~44px + padding)
  const maxHeight = group.children.length * 52 + 36;

  if (collapsed) {
    // When sidebar is collapsed, show only the group icon, children accessible via tooltip/expand
    return (
      <div className="relative group/grp">
        <div
          className={`flex items-center justify-center p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
            hasActiveChild || isOpen
              ? 'bg-zinc-800/60 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
          }`}
          title={`${group.roleLabel}${isViewOnly ? ' (View Only)' : ''}`}
          style={{ color: (hasActiveChild || isOpen) ? group.accent : undefined }}
        >
          <group.icon className="h-5 w-5 shrink-0 text-zinc-400 group-hover/grp:text-zinc-100 transition-colors" style={{ color: (hasActiveChild || isOpen) ? group.accent : undefined }} />
        </div>
        {/* Tooltip / Flyout Menu on hover showing children with contiguous hover bridge */}
        <div className="absolute left-full top-0 -mt-1 pl-2.5 hidden group-hover/grp:block z-50 pointer-events-auto">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 min-w-[220px] animate-fade-in">
            <div className="text-xs font-bold text-zinc-300 px-2 py-1 mb-1.5 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="flex items-center gap-1.5" style={{ color: group.accent }}>
                <group.icon className="h-3.5 w-3.5" />
                {group.roleLabel}
              </span>
              {isViewOnly && <span className="text-[9px] text-amber-400 font-bold uppercase bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">View Only</span>}
            </div>
            <div className="space-y-0.5">
              {group.children.map((child) => (
                <SidebarSubItem key={child.path} item={child} collapsed={false} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      {/* Group Header */}
      <div
        className={`sidebar-group-header ${hasActiveChild ? 'active' : ''}`}
        style={{ '--group-accent': group.accent } as React.CSSProperties}
        onClick={onToggle}
      >
        <group.icon
          className="h-[18px] w-[18px] shrink-0 transition-colors"
          style={{ color: (hasActiveChild || isOpen) ? group.accent : undefined }}
        />
        <span className={`truncate ${isOpen ? 'text-zinc-200 font-medium' : ''}`}>{group.roleLabel}</span>
        <ChevronDown
          className={`group-chevron h-3.5 w-3.5 ${isOpen ? 'rotated' : ''}`}
          style={{ color: isOpen ? group.accent : undefined }}
        />
      </div>

      {/* Submenu */}
      <div
        className={`sidebar-submenu ${isOpen ? 'expanded' : 'collapsed'}`}
        style={{ maxHeight: isOpen ? `${maxHeight}px` : '0px' }}
      >
        <div className="sidebar-submenu-items space-y-0.5">
          {group.children.map((child) => (
            <SidebarSubItem key={child.path} item={child} collapsed={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Section Divider ──────────────────

function SidebarDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 mx-3 border-t border-zinc-800/60" />;
  }
  return (
    <div className="sidebar-divider">
      <span>{label}</span>
    </div>
  );
}

// ─── Sidebar Nav for Non-Admin Roles ───────────

function NonAdminSidebarNav({
  collapsed,
  openGroups,
  onToggleGroup,
}: {
  collapsed: boolean;
  openGroups: Record<string, boolean>;
  onToggleGroup: (roleLabel: string) => void;
}) {
  const { roles = [] } = useAuth();

  const isUnderwriter = roles.includes('Underwriter');
  const isAccounting = roles.includes('Accounting Officer');
  const isCollection = roles.includes('Collection');
  const isClaimsOfficer = roles.includes('Claims Officer');
  const isAgent = roles.includes('Sales Agent') || roles.includes('Team Renewal');

  const accountingGroup: NavGroup = {
    roleLabel: 'Accounting Officer',
    icon: DollarSign,
    accent: '#f59e0b',
    children: [
      { label: 'Policy Statements', path: '/dashboard/policy-statements', icon: FileText },
      { label: 'Review Collection Payment', path: '/dashboard/review-collection-payment', icon: CheckCircle2 },
      { label: 'Summary Commission', path: '/dashboard/summary-commission', icon: BarChart3 },
    ],
  };

  const collectionGroup: NavGroup = {
    roleLabel: 'Collection',
    icon: DollarSign,
    accent: '#06b6d4',
    children: [
      { label: 'Collection Module', path: '/dashboard/collection', icon: DollarSign },
      { label: 'Collection Ledger', path: '/dashboard/collection/ledger', icon: FileSpreadsheet },
    ],
  };

  const claimsGroup: NavGroup = {
    roleLabel: 'Claims Officer',
    icon: Shield,
    accent: '#ef4444',
    children: [
      { label: 'Claim Notifications', path: '/dashboard/claim-notifications', icon: AlertTriangle },
      { label: 'Completed Requirements', path: '/dashboard/completed-requirements', icon: CheckCircle2 },
    ],
  };

  const underwriterGroup: NavGroup = {
    roleLabel: 'Underwriter',
    icon: Search,
    accent: '#8b5cf6',
    children: [
      { label: 'Insurance Requests', path: '/dashboard/insurance-requests', icon: ClipboardList },
    ],
  };

  let nativeItems: NavItem[] = [];
  let viewOnlyGroups: NavGroup[] = [];

  if (isUnderwriter) {
    nativeItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Insurance Requests', path: '/dashboard/insurance-requests', icon: ClipboardList },
      { label: 'Customer Records', path: '/dashboard/customers', icon: Users },
      { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
      { label: 'Summary', path: '/dashboard/summary', icon: FileSpreadsheet },
    ];
    viewOnlyGroups = [accountingGroup, collectionGroup, claimsGroup];
  } else if (isAccounting) {
    nativeItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Policy Statements', path: '/dashboard/policy-statements', icon: FileSpreadsheet },
      { label: 'Review Collection Payment', path: '/dashboard/review-collection-payment', icon: CreditCard },
      { label: 'Summary Commission', path: '/dashboard/summary-commission', icon: FileSpreadsheet },
    ];
    viewOnlyGroups = [underwriterGroup, collectionGroup, claimsGroup];
  } else if (isCollection) {
    nativeItems = [
      { label: 'Collection Module', path: '/dashboard/collection', icon: DollarSign },
      { label: 'Collection Ledger', path: '/dashboard/collection/ledger', icon: FileSpreadsheet },
    ];
    viewOnlyGroups = [underwriterGroup];
  } else if (isClaimsOfficer) {
    nativeItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Claim Notifications', path: '/dashboard/claim-notifications', icon: AlertTriangle },
      { label: 'Completed Requirements', path: '/dashboard/completed-requirements', icon: CheckCircle2 },
    ];
    viewOnlyGroups = [];
  } else if (isAgent) {
    nativeItems = [
      { label: 'Customer Records', path: '/dashboard/customers', icon: Users },
      { label: 'Policy Issuance Request', path: '/dashboard/quotations', icon: FileText },
      { label: 'Claim Notifications', path: '/dashboard/claim-notifications', icon: AlertTriangle },
    ];
    viewOnlyGroups = [];
  } else {
    nativeItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ];
    viewOnlyGroups = [];
  }

  return (
    <div className="space-y-1">
      {/* Native Flat Work Items */}
      {nativeItems.map((item) => (
        <SidebarSubItem key={item.path} item={item} collapsed={collapsed} />
      ))}

      {/* View Only Other Roles Work at the VERY LAST position */}
      {viewOnlyGroups.length > 0 && (
        <div className="pt-3 mt-3 border-t border-zinc-800/60 space-y-1">
          {!collapsed && (
            <div className="px-3 py-1 space-y-0.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Other Department Work
              </div>
              <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Eye className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                <span>(View Only)</span>
              </div>
            </div>
          )}
          {viewOnlyGroups.map((group) => (
            <SidebarNavGroup
              key={group.roleLabel}
              group={group}
              collapsed={collapsed}
              isOpen={openGroups[group.roleLabel]}
              onToggle={() => onToggleGroup(group.roleLabel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Layout ──────────────────────────────

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Track which role groups are open (closed by default)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (roleLabel: string) => {
    setOpenGroups((prev) => {
      // Find current isOpen state or default to false
      const isCurrentlyOpen = prev[roleLabel];
      return { ...prev, [roleLabel]: !isCurrentlyOpen };
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme((localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  const { user, token, roles, permissions, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect Sales Agents, Team Renewal, Collection and Claims Officer away from /dashboard to their specific landing pages
  useEffect(() => {
    const isAgent = roles?.includes('Sales Agent') || roles?.includes('Team Renewal');
    const isCollection = roles?.includes('Collection');
    const isClaimsOfficer = roles?.includes('Claims Officer');
    const isAdministrator = roles?.includes('Administrator');
    const isAccounting = roles?.includes('Accounting Officer');

    if (!isAdministrator && !isAccounting) {
      if (isAgent && location.pathname === '/dashboard') {
        navigate('/dashboard/customers', { replace: true });
      } else if (isCollection && location.pathname === '/dashboard') {
        navigate('/dashboard/collection', { replace: true });
      }
    }
  }, [roles, location.pathname, navigate]);

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const knownNotificationIds = useRef<Set<number>>(new Set());
  const [sseActive, setSseActive] = useState(true);
  const isFirstLoad = useRef(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isAdministrator = roles?.includes('Administrator');

  // Real-time live online users query for Administrator only
  const { data: onlineUsersRes } = useQuery({
    queryKey: ['online-users-count'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/users', {
        params: { no_paginate: true, status: 'active' },
      });
      return res.data;
    },
    enabled: !!isAdministrator,
    refetchInterval: 5000,
  });

  const onlineUserCount = useMemo(() => {
    if (!isAdministrator) return 0;
    const list: any[] = onlineUsersRes?.data?.data ?? [];
    if (list.length === 0) return 1;
    const count = list.filter((u) => u.is_online || u.id === user?.id).length;
    return Math.max(1, count);
  }, [onlineUsersRes, user?.id, isAdministrator]);

  // Fetch notifications (include user?.id in queryKey to reset cache on login/logout)
  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: getNotifications,
    refetchInterval: sseActive ? false : 3000, // 3s fast polling for real-time notifications
    enabled: !!user,
  });

  // Monitor notifications change (handles both SSE cache updates and polling refetches)
  useEffect(() => {
    if (!notificationsRes?.data) return;

    const data = notificationsRes.data;

    if (isFirstLoad.current) {
      // On first load, just remember existing notifications without showing toasts
      data.forEach((n) => {
        knownNotificationIds.current.add(n.id);
      });
      isFirstLoad.current = false;
      return;
    }

    // On subsequent updates, find new unread notifications
    const newNotifications = data.filter(
      (n) => !knownNotificationIds.current.has(n.id) && !n.read_at
    );

    if (newNotifications.length > 0) {
      newNotifications.forEach((n) => {
        let variant: 'success' | 'error' | 'info' = 'info';
        if (n.type === 'success') variant = 'success';
        if (n.type === 'error') variant = 'error';

        showToast(`${n.title}: ${n.message}`, variant);
        knownNotificationIds.current.add(n.id);
      });

      // Automatically refresh active queries in real-time
      queryClient.invalidateQueries({ queryKey: ['claim-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['claim-notification'] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['insurance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-collections'] });
      queryClient.invalidateQueries({ queryKey: ['payments-collections'] });
      queryClient.invalidateQueries({ queryKey: ['approved-statements'] });
    }
  }, [notificationsRes, showToast, queryClient]);

  // Listen for real-time notifications via SSE
  useEffect(() => {
    if (!user || !token || !sseActive) return;

    // Use query parameter to pass auth token to EventSource
    const url = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SystemNotification[];
        // Direct cache update in TanStack Query
        queryClient.setQueryData(['notifications', user.id], { data });
      } catch (error) {
        console.error('Error parsing SSE notifications:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Connection Error, falling back to polling:', error);
      setSseActive(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, token, sseActive, queryClient]);

  const isSalesAgentOrRenewalUser = roles.some((r) => ['Sales Agent', 'Sales', 'Team Renewal', 'Renewal'].includes(r));
  const rawNotifications = notificationsRes?.data ?? [];
  const notifications = rawNotifications.filter((n) => {
    const title = (n.title || '').toLowerCase();
    const message = (n.message || '').toLowerCase();
    const isNoticeForCancellation = title.includes('notice for cancellation') || message.includes('notice for cancellation');
    if (isNoticeForCancellation && !isSalesAgentOrRenewalUser) {
      return false; // Notice for cancellation is only for Sales Agent / Team Renewals
    }
    return true;
  });
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markReadMut = useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/agentportal');
  };

  const isAdmin = roles.includes('Administrator') || roles.includes('Owner') || roles.includes('General Manager') || roles.includes('Operational Manager') || roles.includes('Team Support Operation');

  // Get current page title from navigation
  const titleLookup = isAdmin ? allAdminNavItems : navItems;
  const currentTitle = (() => {
    const exact = titleLookup.find((item) => item.path.split('?')[0] === location.pathname);
    if (exact) return exact.label;
    
    const prefix = [...titleLookup]
      .sort((a, b) => b.path.split('?')[0].length - a.path.split('?')[0].length)
      .find((item) => {
        const cleanPath = item.path.split('?')[0];
        if (cleanPath === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(cleanPath);
      });
    return prefix?.label ?? 'Dashboard';
  })();

  // Sidebar content (reused for mobile drawer and desktop sidebar)
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3.5 px-4 py-5 border-b border-[#8A1C2E]/20 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <img src={logoImg} alt="Supremogen Logo" className="h-14 w-14 object-cover rounded-2xl shrink-0 border border-zinc-700/50" />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white tracking-wider truncate">SUPREMOGEN</h1>
            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Insurance Services</p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className={`flex-1 ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'} px-3 py-4 space-y-1 sidebar-scrollbar`}>
        {isAdmin ? (
          <>
            {/* Dashboard top-level item */}
            <SidebarSubItem
              item={{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }}
              collapsed={sidebarCollapsed}
            />

            {/* Role-grouped sections */}
            <div className="mt-2 space-y-0.5">
              {adminNavGroups.map((group) => (
                <SidebarNavGroup
                  key={group.roleLabel}
                  group={group}
                  collapsed={sidebarCollapsed}
                  isOpen={!!openGroups[group.roleLabel]}
                  onToggle={() => toggleGroup(group.roleLabel)}
                />
              ))}
            </div>

            {/* General section divider */}
            <SidebarDivider label="General" collapsed={sidebarCollapsed} />

            {/* General items */}
            <div className="space-y-0.5">
              {adminGeneralItems.map((item) => (
                <SidebarSubItem key={item.path} item={item} collapsed={sidebarCollapsed} />
              ))}
            </div>
          </>
        ) : (
          <NonAdminSidebarNav
            collapsed={sidebarCollapsed}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
          />
        )}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:block px-3 py-3 border-t border-[#8A1C2E]/20 relative group/collapse">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
        {sidebarCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover/collapse:flex items-center z-50 pointer-events-none">
            <div className="relative bg-zinc-900 border border-zinc-700/80 text-zinc-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-4 before:border-transparent before:border-r-zinc-900">
              <span>Expand Sidebar</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100/50 flex">
      {/* ─── Desktop Sidebar ───────────────── */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 h-screen bg-zinc-950 border-r border-zinc-900 transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar Spacer to maintain layout flow */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
        aria-hidden="true"
      />

      {/* ─── Mobile Sidebar Drawer ─────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-zinc-950 flex flex-col animate-slide-in-left" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ─── Main Content Area ─────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
          <div className="flex items-center justify-between px-2 sm:px-4 lg:px-6 h-14 sm:h-16 gap-2">
            {/* Left: hamburger + title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-semibold text-slate-800 truncate">{currentTitle}</h2>
              </div>
            </div>

            {/* Right: search + notifications + user */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Real-time Online Counter, Role / Dept Badge & Clock */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Administrator Only: Clean & Professional Total Online Users Pill (Before Role) */}
                {isAdministrator && (
                  <div
                    onClick={() => navigate('/dashboard/settings')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs hover:bg-emerald-100/70 transition cursor-pointer select-none"
                    title={`${onlineUserCount} user${onlineUserCount === 1 ? '' : 's'} currently online. Click to manage accounts.`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-emerald-950 dark:text-emerald-100 tabular-nums">{onlineUserCount}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Online</span>
                  </div>
                )}

                {/* Active Role / Department Pill */}
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#8A1C2E]/10 border border-[#8A1C2E]/20 dark:bg-[#8A1C2E]/25 dark:border-[#8A1C2E]/40 rounded-xl text-xs font-semibold text-[#8A1C2E] dark:text-red-300">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {roles?.includes('Administrator')
                      ? 'Administrator'
                      : (roles?.includes('General Manager')
                        ? 'General Manager'
                        : (roles?.includes('Operational Manager')
                          ? 'Operational Manager'
                          : (roles?.includes('Team Support Operation')
                            ? 'Team Support Operation'
                            : (roles?.includes('Accounting Officer')
                              ? 'Accounting Officer'
                              : (roles?.[0] ?? 'Staff')))))}
                  </span>
                </div>

                {/* Real-time Date & Time Clock */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-[10px] sm:text-xs text-slate-700 dark:text-slate-200 font-medium select-none shadow-xs">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#8A1C2E] dark:text-red-400 shrink-0" />
                  <span className="tabular-nums">
                    <span className="hidden lg:inline">{formattedDate} • </span>
                    <span>{formattedTime}</span>
                  </span>
                </div>
              </div>

              {/* Dark/Light Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-850 transition"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setUserMenuOpen(false);
                  }}
                  className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="fixed left-3 right-3 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white rounded-2xl border border-slate-200/80 shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <span className="text-sm font-semibold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMut.mutate()}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <MailOpen className="h-3 w-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.read_at) markReadMut.mutate(n.id);
                              setNotificationsOpen(false);

                              // Resolve navigation dynamically based on message contents
                              const message = n.message || '';
                              const title = n.title || '';
                              
                              const matchQuotation = message.match(/QUO-[A-Z0-9-]+/i) || message.match(/QUO \d{4} \d{5}/i);
                              const matchIR = message.match(/IR-\d{2}-\d{5}/i) || message.match(/IR-[A-Z0-9-]+/i);
                              const matchInvoice = message.match(/INV-[A-Z0-9-]+/i);
                              const matchPayment = message.match(/PAY-\d{4}-\d{5}/i) || message.match(/PAY-[A-Z0-9-]+/i) || title.match(/PAY-[A-Z0-9-]+/i);
                              const matchClaimNotification = message.match(/CLN-[A-Z0-9-]+/i) || title.match(/CLN-[A-Z0-9-]+/i);
                              const matchClaim = message.match(/CLM-[A-Z0-9-]+/i);

                              // Safe Policy extraction (ignoring N/A, NA, etc.)
                              const getPolicyCode = (msg: string): string | null => {
                                const direct = msg.match(/POL-[A-Za-z0-9-]+/i);
                                if (direct) return direct[0];
                                const labeled = msg.match(/Policy:?\s*([A-Za-z0-9\/-]+)/i);
                                if (labeled && labeled[1]) {
                                  const clean = labeled[1].trim();
                                  if (!['N/A', 'NA', 'NONE', 'NULL', 'N'].includes(clean.toUpperCase()) && clean.length >= 2) {
                                    return clean;
                                  }
                                }
                                return null;
                              };
                              const policyCode = getPolicyCode(message);

                              // Safe Assured extraction
                              const getAssuredName = (msg: string): string | null => {
                                const colonMatch = msg.match(/Assured:?\s*([A-Za-z0-9\s\.\-]+?)(?=[,\)\(\]]|\s+is|\s+has|\s+with|\s+due|$)/i);
                                if (colonMatch && colonMatch[1]) {
                                  const clean = colonMatch[1].trim();
                                  if (clean && !['N/A', 'NONE', 'NULL'].includes(clean.toUpperCase()) && clean.length >= 2) {
                                    return clean;
                                  }
                                }
                                const directMatch = msg.match(/Assured\s+([A-Za-z0-9\s\.\-]+?)(?=\s+is|\s+\(|\s+has|\s+with|$)/i);
                                if (directMatch && directMatch[1]) {
                                  const clean = directMatch[1].trim();
                                  if (clean && !['N/A', 'NONE', 'NULL'].includes(clean.toUpperCase()) && clean.length >= 2) {
                                    return clean;
                                  }
                                }
                                const parenMatch = msg.match(/\(([A-Za-z0-9\s\.\-]+?)\)/);
                                if (parenMatch && parenMatch[1]) {
                                  const candidate = parenMatch[1].trim();
                                  if (!candidate.toLowerCase().startsWith('assured:') && !candidate.toLowerCase().startsWith('agent:') && candidate.length >= 2) {
                                    return candidate;
                                  }
                                }
                                return null;
                              };
                              const assuredName = getAssuredName(message);

                              // Roles checks
                              const isClaimsOfficer = roles.includes('Claims Officer');
                              const isAccounting = roles.includes('Accounting Officer') || roles.includes('Accounting');
                              const isCollection = roles.includes('Collection') || roles.includes('Collection Officer') || roles.includes('Collector');
                              const isSalesAgent = roles.includes('Sales Agent');
                              const isRenewal = roles.includes('Team Renewal') || roles.includes('Renewal');
                              const isUnderwriter = roles.includes('Underwriter');

                              // Remittance Status notifications
                              const isRemittance = title.toLowerCase().includes('remittance') || message.toLowerCase().includes('remitted');

                              // Regular Claim Document Uploaded by Agent (should NOT go to Completed Requirements)
                              const isRegularAgentUploadNotice = 
                                title.toLowerCase().includes('claim document uploaded') ||
                                (title.toLowerCase().includes('document uploaded') && !title.toLowerCase().includes('official'));

                              // Completed Claim Requirements / Official Documents notifications (Evaluation Letter, LOA, Offer Letter, Denied Claim, Deposit Slip, Billing Casa/Shop, or Requirements Completed)
                              const isCompletedRequirementNotice = 
                                !isRegularAgentUploadNotice && (
                                  title.toLowerCase().includes('official claim document') ||
                                  title.toLowerCase().includes('claim requirements completed') ||
                                  message.toLowerCase().includes('requirements completed') ||
                                  /\b(evaluation letter|offer letter|denied claim|deposit slip|billing casa|billing shop)\b/i.test(message) ||
                                  /\b(loa|letter of authority|letter of approval)\b/i.test(message)
                                );

                              const isCancellationNotice = title.toLowerCase().includes('cancellation') || message.toLowerCase().includes('cancellation');

                              if (isCompletedRequirementNotice && (matchClaimNotification || matchClaim || message.toLowerCase().includes('claim notification'))) {
                                const code = matchClaimNotification?.[0] || matchClaim?.[0] || assuredName || '';
                                if (isSalesAgent || isRenewal) {
                                  const searchQ = code ? `&search=${encodeURIComponent(code)}` : '';
                                  navigate(`/dashboard/claim-notifications?status=completed${searchQ}`);
                                } else {
                                  const searchQ = code ? `?search=${encodeURIComponent(code)}` : '';
                                  navigate(`/dashboard/completed-requirements${searchQ}`);
                                }
                              } else if (isRemittance) {
                                const code = matchQuotation?.[0] || policyCode || assuredName || '';
                                const searchQ = code ? `?search=${encodeURIComponent(code)}` : '';
                                if (isClaimsOfficer) {
                                  navigate(`/dashboard/claim-notifications${searchQ}`);
                                } else if (isAccounting) {
                                  navigate(`/dashboard/policy-statements${searchQ}`);
                                } else if (isCollection) {
                                  navigate(`/dashboard/collection/ledger${searchQ}`);
                                } else {
                                  navigate(`/dashboard/claim-notifications${searchQ}`);
                                }
                              } else if (isClaimsOfficer) {
                                // Claims Officers are routed to claim-notifications for any policy, claim, or customer notice
                                const searchCode = matchClaimNotification?.[0] || matchClaim?.[0] || assuredName || policyCode || matchQuotation?.[0] || '';
                                const searchQ = searchCode ? `?search=${encodeURIComponent(searchCode)}` : '';
                                navigate(`/dashboard/claim-notifications${searchQ}`);
                              } else if (isCancellationNotice) {
                                const code = matchQuotation?.[0] || matchIR?.[0] || policyCode || assuredName || '';
                                const searchQ = code ? `?search=${encodeURIComponent(code)}` : '';
                                if (isUnderwriter) {
                                  navigate(`/dashboard/insurance-requests${searchQ}`);
                                } else if (isCollection) {
                                  navigate(`/dashboard/collection/ledger${searchQ}`);
                                } else if (isAccounting) {
                                  navigate(`/dashboard/policy-statements${searchQ}`);
                                } else if (isRenewal) {
                                  navigate(`/dashboard/renewals${searchQ}`);
                                } else {
                                  navigate(`/dashboard/quotations${searchQ}`);
                                }
                              } else if (matchPayment) {
                                const code = matchPayment[0];
                                if (isAccounting) {
                                  navigate(`/dashboard/review-collection-payment?search=${encodeURIComponent(code)}`);
                                } else if (isCollection) {
                                  navigate(`/dashboard/collection/ledger?search=${encodeURIComponent(code)}`);
                                } else {
                                  navigate(`/dashboard/review-collection-payment?search=${encodeURIComponent(code)}`);
                                }
                              } else if (matchQuotation) {
                                const code = matchQuotation[0];
                                if (isAccounting) {
                                  navigate(`/dashboard/policy-statements?search=${encodeURIComponent(code)}`);
                                } else if (isCollection) {
                                  navigate(`/dashboard/collection/ledger?search=${encodeURIComponent(code)}`);
                                } else if (roles.includes('Underwriter')) {
                                  navigate(`/dashboard/insurance-requests?search=${encodeURIComponent(code)}`);
                                } else {
                                  navigate(`/dashboard/quotations?search=${encodeURIComponent(code)}`);
                                }
                              } else if (matchInvoice) {
                                const code = matchInvoice[0];
                                if (isCollection) {
                                  navigate(`/dashboard/collection/ledger?search=${encodeURIComponent(code)}`);
                                } else {
                                  navigate(`/dashboard/invoices?search=${encodeURIComponent(code)}`);
                                }
                              } else if (matchClaimNotification) {
                                const code = matchClaimNotification[0];
                                navigate(`/dashboard/claim-notifications?search=${encodeURIComponent(code)}`);
                              } else if (matchClaim) {
                                const code = matchClaim[0];
                                navigate(`/dashboard/claim-notifications?search=${encodeURIComponent(code)}`);
                              } else if (policyCode) {
                                if (isUnderwriter) {
                                  navigate(`/dashboard/insurance-requests?search=${encodeURIComponent(policyCode)}`);
                                } else if (isAccounting) {
                                  navigate(`/dashboard/policy-statements?search=${encodeURIComponent(policyCode)}`);
                                } else if (isCollection) {
                                  navigate(`/dashboard/collection/ledger?search=${encodeURIComponent(policyCode)}`);
                                } else if (isRenewal) {
                                  navigate(`/dashboard/renewals?search=${encodeURIComponent(policyCode)}`);
                                } else {
                                  navigate(`/dashboard/quotations?search=${encodeURIComponent(policyCode)}`);
                                }
                              } else if (assuredName) {
                                if (isUnderwriter) {
                                  navigate(`/dashboard/insurance-requests?search=${encodeURIComponent(assuredName)}`);
                                } else if (isCollection) {
                                  navigate(`/dashboard/collection/ledger?search=${encodeURIComponent(assuredName)}`);
                                } else if (isAccounting) {
                                  navigate(`/dashboard/review-collection-payment?search=${encodeURIComponent(assuredName)}`);
                                } else if (isRenewal) {
                                  navigate(`/dashboard/renewals?search=${encodeURIComponent(assuredName)}`);
                                } else {
                                  navigate(`/dashboard/customers?search=${encodeURIComponent(assuredName)}`);
                                }
                              } else if (title.toLowerCase().includes('collection payment') || title.toLowerCase().includes('payment') || title.toLowerCase().includes('dst warning') || title.toLowerCase().includes('1st payment')) {
                                if (isAccounting) {
                                  navigate('/dashboard/review-collection-payment');
                                } else if (isCollection) {
                                  navigate('/dashboard/collection/ledger');
                                } else {
                                  navigate('/dashboard/review-collection-payment');
                                }
                              } else if (title.toLowerCase().includes('quotation') || title.toLowerCase().includes('statement') || title.toLowerCase().includes('policy') || title.toLowerCase().includes('freebie')) {
                                if (isAccounting) {
                                  navigate('/dashboard/policy-statements');
                                } else if (isCollection) {
                                  navigate('/dashboard/collection/ledger');
                                } else if (roles.includes('Underwriter')) {
                                  navigate('/dashboard/insurance-requests');
                                } else {
                                  navigate('/dashboard/quotations');
                                }
                              } else if (title.toLowerCase().includes('claim notification') || title.toLowerCase().includes('claim')) {
                                navigate('/dashboard/claim-notifications');
                              } else if (title.toLowerCase().includes('invoice')) {
                                if (isCollection) {
                                  navigate('/dashboard/collection/ledger');
                                } else {
                                  navigate('/dashboard/invoices');
                                }
                              } else if (title.toLowerCase().includes('policy')) {
                                if (isCollection) {
                                  navigate('/dashboard/collection/ledger');
                                } else {
                                  navigate('/dashboard/renewals');
                                }
                              } else if (isCollection) {
                                navigate('/dashboard/collection/ledger');
                              }
                            }}
                            className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition ${!n.read_at ? 'bg-blue-50/20' : ''
                              }`}
                          >
                            <div className="flex gap-2.5">
                              <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                                <p className="text-[9px] text-slate-400 mt-1">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!n.read_at && (
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="relative shrink-0">
                    {user?.profile_photo_url ? (
                      <img
                        src={getFileUrl(user.profile_photo_url)}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.charAt(0) ?? 'U'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-white" title="Online" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                      {user?.name ?? 'User'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {roles?.includes('Administrator')
                        ? 'Administrator'
                        : (roles?.includes('General Manager')
                          ? 'General Manager'
                          : (roles?.includes('Operational Manager')
                            ? 'Operational Manager'
                            : (roles?.includes('Team Support Operation')
                              ? 'Team Support Operation'
                              : (roles?.includes('Accounting Officer')
                                ? 'Accounting Officer'
                                : (roles?.[0] ?? 'Staff')))))}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-56 max-w-[14rem] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-scale-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-slate-50 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      {/* Sign Out Confirmation Modal */}
      <ConfirmModal
        open={showLogoutConfirm}
        title="Sign Out"
        message={`Are you sure you want to sign out${user?.name ? `, ${user.name}` : ''}? You will need to log in again to access the dashboard.`}
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
