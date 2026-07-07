import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationApi';
import logoImg from '../../assets/image/supremogen_logo.jpg';

// ─── Navigation Config ────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

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

// ─── Sidebar Item ─────────────────────────────

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { roles } = useAuth();
  const { showToast } = useToast();
  const isAgent = roles.includes('Sales Agent') || roles.includes('Team Renewal');
  const isUnderwriter = roles.includes('Underwriter');

  let isForbidden = false;
  let forbiddenMessage = '';

  if (isAgent) {
    isForbidden = !['Customer Records', 'Policy Issuance Request'].includes(item.label);
    forbiddenMessage = `Access Denied: The ${item.label} module is restricted for Sales Agents.`;
  } else if (isUnderwriter) {
    isForbidden = !['Dashboard', 'Insurance Requests', 'Customer Records', 'Summary', 'Reports'].includes(item.label);
    forbiddenMessage = `Access Denied: The ${item.label} module is restricted for Underwriters.`;
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

  const { user, roles, permissions, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect Sales Agents away from /dashboard to Customer Records
  useEffect(() => {
    if (roles?.includes('Sales Agent') && location.pathname === '/dashboard') {
      navigate('/dashboard/customers', { replace: true });
    }
  }, [roles, location.pathname, navigate]);

  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30000,
    enabled: !!user,
  });

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

  // Get current page title from navigation
  const currentTitle = navItems
    .find((item) => {
      if (item.path === '/dashboard') return location.pathname === '/dashboard';
      return location.pathname.startsWith(item.path);
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
        {navItems.map((item) => (
          <SidebarNavItem key={item.path} item={item} collapsed={sidebarCollapsed} />
        ))}
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
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.charAt(0) ?? 'U'}
                  </div>
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
                        {(permissions.includes('settings.view') || roles.includes('Underwriter') || roles.includes('Administrator')) && (
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
                        )}
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
