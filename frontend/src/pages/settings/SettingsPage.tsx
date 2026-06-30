import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { User as UserIcon, Shield, Bell, Save, Loader2, Settings, Key, Users, Plus, Pencil, Trash2, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface UserAccount {
  id: number;
  name: string;
  email: string;
  role_name: string;
  created_at: string;
}

export default function SettingsPage() {
  const { user, updateUser, permissions } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = permissions.includes('users.view');

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system' | 'accounts' | 'preferences'>('profile');

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [isUserFormPasswordFocused, setIsUserFormPasswordFocused] = useState(false);

  // Password strength requirements check
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const transitionHasNumber = /[0-9]/.test(newPassword); // Using distinct names to avoid conflicts if any
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

  // System settings state (persisted locally)
  const [taxRate, setTaxRate] = useState<number>(12);
  const [quotationValidityDays, setQuotationValidityDays] = useState<number>(30);
  const [defaultCurrency, setDefaultCurrency] = useState('PHP');
  const [companyName, setCompanyName] = useState('SUPREMOGEN INSURANCE SERVICES');

  // Preference state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
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

  // Account Management States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState('Sales Agent');
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);

  const modalHasMinLength = userFormPassword.length >= 8;
  const modalHasUppercase = /[A-Z]/.test(userFormPassword);
  const modalHasLowercase = /[a-z]/.test(userFormPassword);
  const modalHasNumber = /[0-9]/.test(userFormPassword);
  const modalHasSpecialChar = /[^A-Za-z0-9]/.test(userFormPassword);

  // Load profile and local system settings
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
    
    const storedTax = localStorage.getItem('sys_tax_rate');
    const storedVal = localStorage.getItem('sys_quote_val_days');
    const storedCompany = localStorage.getItem('sys_company_name');
    
    if (storedTax) setTaxRate(Number(storedTax));
    if (storedVal) setQuotationValidityDays(Number(storedVal));
    if (storedCompany) setCompanyName(storedCompany);
  }, [user]);

  // Fetch users for account management
  const { data: usersRes, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/users');
      return res.data;
    },
    enabled: isAdmin && activeTab === 'accounts',
  });
  const userAccounts: UserAccount[] = usersRes?.data?.data ?? [];

  // Mutations
  const updateProfileMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.put('/api/v1/auth/profile', data);
      return res.data;
    },
    onSuccess: (res) => {
      showToast('Profile updated successfully.');
      if (res.data) {
        updateUser(res.data);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to update profile.', 'error');
    },
  });

  const createUserMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/v1/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showToast('User account created successfully.');
      setIsUserModalOpen(false);
      resetUserForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to create user.', 'error');
    },
  });

  const updateUserMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`/api/v1/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showToast('User account updated successfully.');
      setIsUserModalOpen(false);
      resetUserForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to update user.', 'error');
    },
  });

  const deleteUserMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.delete(`/api/v1/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showToast('User account deleted.');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to delete user.', 'error');
    },
  });

  const resetUserForm = () => {
    setSelectedUser(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormPassword('');
    setUserFormRole('Sales Agent');
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setSelectedUser(u);
    setUserFormName(u.name);
    setUserFormEmail(u.email);
    setUserFormPassword('');
    setUserFormRole(u.role_name);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim()) { showToast('Name is required.', 'error'); return; }
    if (!userFormEmail.trim()) { showToast('Email is required.', 'error'); return; }
    
    const payload: any = {
      name: userFormName,
      email: userFormEmail,
      role: userFormRole,
    };

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (selectedUser) {
      if (userFormPassword) {
        if (!strongPasswordRegex.test(userFormPassword)) {
          showToast('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.', 'error');
          return;
        }
        payload.password = userFormPassword;
      }
      updateUserMut.mutate({ id: selectedUser.id, data: payload });
    } else {
      if (!userFormPassword) { showToast('Password is required for new users.', 'error'); return; }
      if (!strongPasswordRegex.test(userFormPassword)) {
        showToast('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.', 'error');
        return;
      }
      payload.password = userFormPassword;
      createUserMut.mutate(payload);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Name is required.', 'error'); return; }
    if (!email.trim()) { showToast('Email is required.', 'error'); return; }
    updateProfileMut.mutate({ name, email });
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { showToast('Current password is required.', 'error'); return; }
    
    // Strong password validation
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      showToast('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) { showToast('Passwords do not match.', 'error'); return; }
    updateProfileMut.mutate({
      name,
      email,
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmPassword,
    });
  };

  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sys_tax_rate', String(taxRate));
    localStorage.setItem('sys_quote_val_days', String(quotationValidityDays));
    localStorage.setItem('sys_company_name', companyName);
    showToast('System settings saved successfully.');
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Preferences saved successfully.');
  };

  const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all';
  const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider';

  const roleLabels: Record<string, string> = {
    'Administrator': 'Administrator / Full Access',
    'Sales Agent': 'Sales Agent (Sales / Customer Records)',
    'Underwriter': 'Underwriter (Quotations / Policies)',
    'Accounting Officer': 'Accounting Officer (Billing / Payments)',
    'Claims Officer': 'Claims Officer (Claims filing / Settle)',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-700">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Manage your user profile, security settings, and system configurations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Tabs sidebar */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm space-y-1">
          <div className="px-3 py-2 border-b border-slate-50 mb-2">
            <h3 className="font-extrabold text-[#4A0E17] text-xs uppercase tracking-wider">Account Settings</h3>
          </div>
          
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'profile' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <UserIcon className="h-4 w-4" /> Profile Settings
          </button>
          <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'security' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Shield className="h-4 w-4" /> Security & Password
          </button>
          <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'system' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Settings className="h-4 w-4" /> System Configuration
          </button>
          
          {isAdmin && (
            <button onClick={() => setActiveTab('accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'accounts' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users className="h-4 w-4" /> Manage Accounts
            </button>
          )}

          <button onClick={() => setActiveTab('preferences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'preferences' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Bell className="h-4 w-4" /> Preferences
          </button>
        </div>

        {/* Tab Panel */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Edit Profile Details</h3>
                <p className="text-xs text-slate-400">Update your personal account credentials.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={updateProfileMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-sm font-semibold rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 transition cursor-pointer">
                  {updateProfileMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Change Password</h3>
                <p className="text-xs text-slate-400">Ensure your account is secure by using a strong password.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Current Password *</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>New Password *</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      onFocus={() => setIsNewPasswordFocused(true)}
                      onBlur={() => setIsNewPasswordFocused(false)}
                      className={inputClass} 
                      placeholder="e.g. P@ssword123!" 
                    />
                    {isNewPasswordFocused && (
                      <div className="mt-2.5 space-y-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 animate-scale-in">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password Requirements</p>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          <div className={`flex items-center gap-2 transition-all duration-200 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${hasMinLength ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                            <span>At least 8 characters</span>
                          </div>
                          <div className={`flex items-center gap-2 transition-all duration-200 ${hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${hasUppercase ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                            <span>One uppercase letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-2 transition-all duration-200 ${hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${hasLowercase ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                            <span>One lowercase letter (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-2 transition-all duration-200 ${transitionHasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${transitionHasNumber ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                            <span>One number (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-2 transition-all duration-200 ${hasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${hasSpecialChar ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                            <span>One special character (e.g. !@#$)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Confirm New Password *</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={updateProfileMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-sm font-semibold rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 transition cursor-pointer">
                  {updateProfileMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update Password
                </button>
              </div>
            </form>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <form onSubmit={handleSaveSystemSettings} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">System Configuration</h3>
                <p className="text-xs text-slate-400">Configure global settings and defaults for calculations and billing.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Default Tax Rate (%)</label>
                  <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Quotation Validity Period (Days)</label>
                  <input type="number" value={quotationValidityDays} onChange={(e) => setQuotationValidityDays(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Currency Code</label>
                  <select value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} className={inputClass}>
                    <option value="PHP">PHP (₱)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Company Name</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-sm font-semibold rounded-xl hover:bg-[#3D0B12] transition cursor-pointer">
                  <Save className="h-4 w-4" /> Save System Settings
                </button>
              </div>
            </form>
          )}


          {/* Manage Accounts Tab */}
          {activeTab === 'accounts' && isAdmin && (
            <div className="space-y-6 animate-scale-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Manage Agent Accounts</h3>
                  <p className="text-xs text-slate-400">Create and manage accounts for Sales Agents, Underwriters, and Accountants.</p>
                </div>
                <button 
                  onClick={() => { resetUserForm(); setIsUserModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Account
                </button>
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                {loadingUsers ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" /></div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Agent Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Role / Department</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userAccounts.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                              u.role_name === 'Administrator' ? 'bg-red-50 text-red-700' :
                              u.role_name === 'Underwriter' ? 'bg-blue-50 text-blue-700' :
                              u.role_name === 'Accounting Officer' ? 'bg-emerald-50 text-emerald-700' :
                              u.role_name === 'Claims Officer' ? 'bg-purple-50 text-purple-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleOpenEditUser(u)} className="p-1 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-slate-50 transition" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(u)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <form onSubmit={handleSavePreferences} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Notification Preferences</h3>
                <p className="text-xs text-slate-400">Configure how you receive alerts and system updates.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/55">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                    <p className="text-xs text-slate-500">Receive a copy of invoices, renewals, and claims via email.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4A0E17]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/55">
                  <div>
                    <p className="text-sm font-bold text-slate-800">SMS Alerts</p>
                    <p className="text-xs text-slate-500">Send instant policy renewal reminders to clients via SMS.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4A0E17]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/55">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Dark Mode</p>
                    <p className="text-xs text-slate-500">Enable a dark appearance to reduce eye strain in low-light environments.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4A0E17]"></div>
                  </label>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-sm font-semibold rounded-xl hover:bg-[#3D0B12] shadow-sm transition cursor-pointer">
                  <Save className="h-4 w-4" /> Save Preferences
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ─── Create/Edit User Modal ───────────── */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Supremogen" className="h-7 w-7 rounded-md object-contain bg-white p-0.5" />
                <h3 className="font-bold text-base tracking-tight">
                  {selectedUser ? `Edit Account` : 'Create Agent Account'}
                </h3>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input 
                  type="text" 
                  value={userFormName} 
                  onChange={(e) => setUserFormName(e.target.value)} 
                  className={inputClass}
                  placeholder="Enter full name..."
                />
              </div>
              <div>
                <label className={labelClass}>Email Address *</label>
                <input 
                  type="email" 
                  value={userFormEmail} 
                  onChange={(e) => setUserFormEmail(e.target.value)} 
                  className={inputClass}
                  placeholder="e.g. agent.name@supremogen.com"
                />
              </div>
              <div>
                <label className={labelClass}>
                  {selectedUser ? 'Password (Leave blank to keep current)' : 'Temporary Password *'}
                </label>
                <input 
                  type="password" 
                  value={userFormPassword} 
                  onChange={(e) => setUserFormPassword(e.target.value)} 
                  onFocus={() => setIsUserFormPasswordFocused(true)}
                  onBlur={() => setIsUserFormPasswordFocused(false)}
                  className={inputClass}
                  placeholder="e.g. P@ssword123!"
                />
                {isUserFormPasswordFocused && (
                  <div className="mt-2.5 space-y-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 animate-scale-in">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password Requirements</p>
                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                      <div className={`flex items-center gap-2 transition-all duration-200 ${modalHasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${modalHasMinLength ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${modalHasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${modalHasUppercase ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${modalHasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${modalHasLowercase ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${modalHasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${modalHasNumber ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${modalHasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${modalHasSpecialChar ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One special character (e.g. !@#$)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Role / Department *</label>
                <select 
                  value={userFormRole} 
                  onChange={(e) => setUserFormRole(e.target.value)} 
                  className={inputClass}
                >
                  {Object.entries(roleLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMut.isPending || updateUserMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 transition cursor-pointer shadow-sm shadow-[#4A0E17]/20"
                >
                  {(createUserMut.isPending || updateUserMut.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedUser ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      <ConfirmModal 
        open={!!deleteTarget} 
        title="Delete Agent Account"
        message={`Are you sure you want to delete the account for ${deleteTarget?.name}? This action cannot be undone and they will lose access immediately.`}
        confirmLabel="Delete Account" 
        variant="danger" 
        loading={deleteUserMut.isPending}
        onConfirm={() => deleteTarget && deleteUserMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)} 
      />
    </div>
  );
}
