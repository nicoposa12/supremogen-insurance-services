import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

  Briefcase,
  Search,
  RotateCcw,
  DollarSign,
  Shield,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationApi';
import { useToast } from '../../components/ui/Toast';
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
  { label: 'Insurance Requests', path: '/dashboard/insurance-requests', icon: ClipboardList },
  { label: 'Accounting', path: '/dashboard/invoices', icon: Receipt },
  { label: 'Claims', path: '/dashboard/claims', icon: ShieldHalf },
  { label: 'Renewals', path: '/dashboard/renewals', icon: RefreshCw },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { label: 'Summary', path: '/dashboard/summary', icon: FileSpreadsheet },
];

// Role-grouped nav (used by Administrator / Owner)
const adminNavGroups: NavGroup[] = [
  {
    roleLabel: 'Sales Agent',
    icon: Briefcase,
    accent: '#3b82f6', // blue
    children: [
      { label: 'Policy Issuance Request', path: '/dashboard/quotations?role=Sales Agent', icon: FileText },
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
    ],
  },
  {
    roleLabel: 'Accounting Officer',
    icon: DollarSign,
    accent: '#f59e0b', // amber
    children: [
      { label: 'Accounting', path: '/dashboard/invoices', icon: Receipt },
    ],
  },
  {
    roleLabel: 'Claims Officer',
    icon: Shield,
    accent: '#ef4444', // red
    children: [
      { label: 'Claims', path: '/dashboard/claims', icon: ShieldHalf },
    ],
  },
];

// General items visible to admin at the bottom
const adminGeneralItems: NavItem[] = [
  { label: 'Customer Records', path: '/dashboard/customers', icon: Users },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { label: 'Summary', path: '/dashboard/summary', icon: FileSpreadsheet },
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
  const roleMatch = !itemParams.has('role') || itemParams.get('role') === currentParams.get('role');
  const isActive = (cleanPath === '/dashboard'
    ? location.pathname === '/dashboard'
    : location.pathname.startsWith(cleanPath)) && roleMatch;

  return (
    <NavLink
      to={item.path}
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
  );
}

// ─── Sidebar Nav Group (collapsible role section) ──

function SidebarNavGroup({
  group,
  collapsed,
  isOpen,
  onToggle,
}: {
  group: NavGroup;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);

  const hasActiveChild = group.children.some((child) => {
    const cleanPath = child.path.split('?')[0];
    const childParams = new URLSearchParams(child.path.split('?')[1] || '');
    const roleMatch = !childParams.has('role') || childParams.get('role') === currentParams.get('role');
    
    return location.pathname.startsWith(cleanPath) && roleMatch;
  });

  // Calculate max-height for animation (each item ~44px + padding)
  const maxHeight = group.children.length * 52 + 16;

  if (collapsed) {
    // When sidebar is collapsed, show only the group icon, children accessible via tooltip/expand
    return (
      <div className="relative group/grp">
        <div
          className="flex items-center justify-center p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-zinc-800/40"
          title={group.roleLabel}
          style={{ color: hasActiveChild ? group.accent : undefined }}
        >
          <group.icon className="h-5 w-5 shrink-0" />
        </div>
        {/* Tooltip on hover showing children */}
        <div className="absolute left-full top-0 ml-2 hidden group-hover/grp:block z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-2 min-w-[200px]">
            <div className="text-xs font-bold text-zinc-400 px-2 py-1 mb-1 uppercase tracking-wider">
              {group.roleLabel}
            </div>
            {group.children.map((child) => (
              <SidebarSubItem key={child.path} item={child} collapsed={false} />
            ))}
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
          style={{ color: hasActiveChild ? group.accent : undefined }}
        />
        <span className="truncate">{group.roleLabel}</span>
        <ChevronDown
          className={`group-chevron h-3.5 w-3.5 ${isOpen ? 'rotated' : ''}`}
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

// ─── Sidebar Item (flat, for non-admin roles) ─

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { roles } = useAuth();
  const isAgent = roles.includes('Sales Agent') || roles.includes('Team Renewal');
  const isUnderwriter = roles.includes('Underwriter');

  let isForbidden = false;

  if (isAgent) {
    isForbidden = !['Customer Records', 'Policy Issuance Request'].includes(item.label);
  } else if (isUnderwriter) {
    isForbidden = !['Dashboard', 'Insurance Requests', 'Customer Records', 'Summary', 'Reports'].includes(item.label);
  }

  if (isForbidden) {
    return null;
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
          ? 'bg-gradient-to-r from-[#8A1C2E] to-[#5C0612] text-white shadow-md shadow-[#8A1C2E]/20 active-nav-item'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      <item.icon className="h-5 w-5 shrink-0 text-zinc-400 group-hover:text-zinc-200 group-[.active-nav-item]:text-white transition-colors" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

// ─── Main Layout ──────────────────────────────

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Track which role groups are open (all expanded by default)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(adminNavGroups.map((g) => [g.roleLabel, true]))
  );

  const toggleGroup = (roleLabel: string) => {
    setOpenGroups((prev) => ({ ...prev, [roleLabel]: !prev[roleLabel] }));
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

  // Redirect Sales Agents and Team Renewal away from /dashboard to Customer Records
  useEffect(() => {
    const isAgent = roles?.includes('Sales Agent') || roles?.includes('Team Renewal');
    if (isAgent && location.pathname === '/dashboard') {
      navigate('/dashboard/customers', { replace: true });
    }
  }, [roles, location.pathname, navigate]);

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const knownNotificationIds = useRef<Set<number>>(new Set());

  // Fetch notifications (include user?.id in queryKey to reset cache on login/logout)
  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: getNotifications,
    refetchInterval: false, // Disable polling in favor of real-time SSE
    enabled: !!user,
  });

  // Populate known notification IDs on initial fetch
  useEffect(() => {
    if (notificationsRes?.data) {
      notificationsRes.data.forEach((n) => {
        knownNotificationIds.current.add(n.id);
      });
    }
  }, [notificationsRes]);

  // Listen for real-time notifications via SSE
  useEffect(() => {
    if (!user || !token) return;

    // Use query parameter to pass auth token to EventSource
    const url = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SystemNotification[];

        // Find new notifications that we haven't seen before and are unread
        const newNotifications = data.filter(
          (n) => !knownNotificationIds.current.has(n.id) && !n.read_at
        );

        if (newNotifications.length > 0) {
          newNotifications.forEach((n) => {
            // Map notification type to toast variant: 'success' | 'error' | 'info'
            let variant: 'success' | 'error' | 'info' = 'info';
            if (n.type === 'success') variant = 'success';
            if (n.type === 'error') variant = 'error';

            showToast(`${n.title}: ${n.message}`, variant);
            knownNotificationIds.current.add(n.id);
          });
        }

        // Direct cache update in TanStack Query
        queryClient.setQueryData(['notifications', user.id], { data });
      } catch (error) {
        console.error('Error parsing SSE notifications:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Connection Error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [user, token, queryClient, showToast]);

  const notifications = notificationsRes?.data ?? [];
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

  const isAdmin = roles.includes('Administrator');

  // Get current page title from navigation
  const titleLookup = isAdmin ? allAdminNavItems : navItems;
  const currentTitle = titleLookup
    .find((item) => {
      const cleanPath = item.path.split('?')[0];
      if (cleanPath === '/dashboard') return location.pathname === '/dashboard';
      return location.pathname.startsWith(cleanPath);
    })?.label ?? 'Dashboard';

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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 sidebar-scrollbar">
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
          navItems.map((item) => (
            <SidebarNavItem key={item.path} item={item} collapsed={sidebarCollapsed} />
          ))
        )}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:block px-3 py-3 border-t border-[#8A1C2E]/20">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100/50 flex">
      {/* ─── Desktop Sidebar ───────────────── */}
      <aside
        className={`hidden lg:flex flex-col bg-zinc-950 border-r border-zinc-900 transition-all duration-300 shrink-0 ${sidebarCollapsed ? 'w-[72px]' : 'w-64'
          }`}
        style={{ position: 'sticky', top: 0, height: '100vh' }}
      >
        {sidebarContent}
      </aside>

      {/* ─── Mobile Sidebar Drawer ─────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 bg-zinc-950 flex flex-col animate-slide-in-left">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
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
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Left: hamburger + title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{currentTitle}</h2>
              </div>
            </div>

            {/* Right: search + notifications + user */}
            <div className="flex items-center gap-2">
              {/* Real-time Date & Time */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-medium select-none">
                <Clock className="h-4 w-4 text-[#8A1C2E] dark:text-[#a82c40]" />
                <span className="tabular-nums">
                  {formattedDate} • {formattedTime}
                </span>
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
              <div className="relative">
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
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200/80 shadow-xl z-50 overflow-hidden">
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
                              
                              const matchQuotation = message.match(/QUO-\d{4}-\d{5}/) || message.match(/QUO \d{4} \d{5}/);
                              const matchInvoice = message.match(/INV-\d{4}-\d{5}/);
                              const matchClaim = message.match(/CLM-\d{4}-\d{5}/);
                              const matchPolicy = message.match(/POL-\d{4}-\d{5}/);

                              if (matchQuotation) {
                                const code = matchQuotation[0];
                                if (roles.includes('Underwriter')) {
                                  navigate(`/dashboard/insurance-requests?search=${code}`);
                                } else {
                                  navigate(`/dashboard/quotations?search=${code}`);
                                }
                              } else if (matchInvoice) {
                                const code = matchInvoice[0];
                                navigate(`/dashboard/invoices?search=${code}`);
                              } else if (matchClaim) {
                                const code = matchClaim[0];
                                navigate(`/dashboard/claims?search=${code}`);
                              } else if (matchPolicy) {
                                const code = matchPolicy[0];
                                navigate(`/dashboard/renewals?search=${code}`);
                              } else if (title.toLowerCase().includes('quotation')) {
                                if (roles.includes('Underwriter')) {
                                  navigate('/dashboard/insurance-requests');
                                } else {
                                  navigate('/dashboard/quotations');
                                }
                              } else if (title.toLowerCase().includes('claim')) {
                                navigate('/dashboard/claims');
                              } else if (title.toLowerCase().includes('invoice') || title.toLowerCase().includes('payment')) {
                                navigate('/dashboard/invoices');
                              } else if (title.toLowerCase().includes('policy')) {
                                navigate('/dashboard/renewals');
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
              <div className="relative ml-1">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
                >
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
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                      {user?.name ?? 'User'}
                    </p>
                    <p className="text-[11px] text-slate-400">{roles[0] ?? 'Staff'}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-scale-in">
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
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-slate-50 transition"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
