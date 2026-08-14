import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { User as UserIcon, Shield, Bell, Save, Loader2, Settings, Key, Users, Plus, Pencil, Trash2, X, LogIn, Search, Filter, Eye, EyeOff, Camera, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import logoImg from '../../assets/image/supremogen_logo.jpg';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { getFileUrl } from '../../utils/url';

interface UserAccount {
  id: number;
  name: string;
  email: string;
  role_name: string;
  created_at: string;
  profile_photo_url?: string | null;
}

export default function SettingsPage() {
  const { user, updateUser, impersonateUser, permissions, roles } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isAdmin = permissions.includes('users.view') || roles.includes('Underwriter') || roles.includes('Administrator');

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system' | 'accounts' | 'preferences'>('profile');

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);

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
  const [userFormRole, setUserFormRole] = useState('Sales Agent');
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResetPasswordFocused, setIsResetPasswordFocused] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const resetHasMinLength = resetPasswordValue.length >= 8;
  const resetHasUppercase = /[A-Z]/.test(resetPasswordValue);
  const resetHasLowercase = /[a-z]/.test(resetPasswordValue);
  const resetHasNumber = /[0-9]/.test(resetPasswordValue);
  const resetHasSpecialChar = /[^A-Za-z0-9]/.test(resetPasswordValue);
  
  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

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
      const res = await axios.get('/api/v1/users', {
        params: { no_paginate: true },
      });
      return res.data;
    },
    enabled: isAdmin && activeTab === 'accounts',
  });
  const userAccounts: UserAccount[] = (usersRes?.data?.data ?? []).filter((u: UserAccount) => {
    if (roles?.includes('Underwriter')) {
      return u.email !== 'admin@supremogen.com' && u.email !== 'owner@supremogen.com';
    }
    return true;
  });

  const filteredUserAccounts = useMemo(() => {
    return userAccounts.filter((u) => {
      const matchesSearch = 
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      const matchesRole = 
        userRoleFilter === 'All' || 
        u.role_name === userRoleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [userAccounts, userSearchQuery, userRoleFilter]);

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

  const uploadPhotoMut = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await axios.post('/api/v1/auth/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: (res) => {
      showToast('Profile photo updated successfully.');
      if (res.data) {
        updateUser(res.data);
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to upload photo.', 'error');
    },
  });

  const deletePhotoMut = useMutation({
    mutationFn: async () => {
      const res = await axios.delete('/api/v1/auth/profile/photo');
      return res.data;
    },
    onSuccess: (res) => {
      showToast('Profile photo removed successfully.');
      if (res.data) {
        updateUser(res.data);
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to remove photo.', 'error');
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
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) {
        const messages = Object.values(backendErrors).flat().join(' ');
        showToast(messages, 'error');
      } else {
        showToast(err.response?.data?.message ?? 'Failed to create user.', 'error');
      }
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
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) {
        const messages = Object.values(backendErrors).flat().join(' ');
        showToast(messages, 'error');
      } else {
        showToast(err.response?.data?.message ?? 'Failed to update user.', 'error');
      }
    },
  });

  const resetUserPasswordMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`/api/v1/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showToast('Password reset successfully.');
      setResetPasswordTarget(null);
      setResetPasswordValue('');
      setShowResetPassword(false);
    },
    onError: (err: any) => {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) {
        const messages = Object.values(backendErrors).flat().join(' ');
        showToast(messages, 'error');
      } else {
        showToast(err.response?.data?.message ?? 'Failed to reset password.', 'error');
      }
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

  const impersonateUserMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.post(`/api/v1/users/${id}/impersonate`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        impersonateUser(data.data);
        showToast(`Logged in as ${data.data.user.name}.`);
        navigate('/dashboard');
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to access user account.', 'error');
    },
  });

  const resetUserForm = () => {
    setSelectedUser(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormRole('Sales Agent');
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setSelectedUser(u);
    setUserFormName(u.name);
    setUserFormEmail(u.email);
    setUserFormRole(u.role_name);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    if (!userFormEmail.trim()) {
      showToast('Email is required.', 'error');
      return;
    }
    
    const payload: any = {
      name: userFormName,
      email: userFormEmail,
      role: userFormRole,
    };

    if (selectedUser) {
      updateUserMut.mutate({ id: selectedUser.id, data: payload });
    } else {
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
    'General Manager': 'General Manager (Full Access / View Only)',
    'Operational Manager': 'Operational Manager (Full Access / View Only)',
    'Team Support Operation': 'Team Support Operation (View All / Edit Accounting)',
    'Sales Agent': 'Sales Agent (Sales / Customer Records)',
    'Underwriter': 'Underwriter (Quotations / Policies)',
    'Accounting Officer': 'Accounting Officer (Billing / Payments)',
    'Claims Officer': 'Claims Officer (Claims filing / Settle)',
    'Team Renewal': 'Team Renewal (Renewal Accounts)',
    'Collection': 'Collection Department (Billing / Payments)',
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
          {isAdmin && (
            <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'system' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Settings className="h-4 w-4" /> System Configuration
            </button>
          )}
          
          {isAdmin && (
            <button onClick={() => setActiveTab('accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'accounts' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users className="h-4 w-4" /> Manage Accounts
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setActiveTab('preferences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'preferences' ? 'bg-[#4A0E17] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Bell className="h-4 w-4" /> Preferences
            </button>
          )}
        </div>

        {/* Tab Panel */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Header card info */}
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar with Camera badge */}
                <div className="relative group shrink-0">
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-md ring-4 ring-slate-100/60 transition-all duration-300 hover:ring-[#4A0E17]/20">
                    {user?.profile_photo_url ? (
                      <img
                        src={getFileUrl(user.profile_photo_url)}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-tr from-[#4A0E17] via-[#7D1E2B] to-[#B03A48] flex items-center justify-center text-white text-3xl font-extrabold">
                        {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <label className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer select-none">
                      <Camera className="h-5 w-5 mb-1 animate-pulse" />
                      <span>UPLOAD</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadPhotoMut.mutate(file);
                          }
                        }}
                        className="hidden"
                        disabled={uploadPhotoMut.isPending}
                      />
                    </label>
                  </div>

                  {/* Camera overlay icon badge */}
                  <label className="absolute bottom-0 right-0 h-8 w-8 bg-[#4A0E17] hover:bg-[#3D0B12] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all hover:scale-110 duration-200 cursor-pointer select-none">
                    <Camera className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadPhotoMut.mutate(file);
                        }
                      }}
                      className="hidden"
                      disabled={uploadPhotoMut.isPending}
                    />
                  </label>

                  {/* Loading spinner */}
                  {(uploadPhotoMut.isPending || deletePhotoMut.isPending) && (
                    <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center z-10 border-4 border-white">
                      <Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" />
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-800 leading-tight">{user?.name}</h4>
                    <span className="self-center sm:self-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#4A0E17]/10 text-[#4A0E17] border border-[#4A0E17]/20 uppercase tracking-wide">
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
                  <p className="text-xs text-slate-400 font-medium">PNG, JPG, or GIF. Max 2MB.</p>
                  
                  <div className="flex items-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm hover:shadow cursor-pointer select-none">
                      <Pencil className="h-3.5 w-3.5 text-slate-500" /> Update Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadPhotoMut.mutate(file);
                          }
                        }}
                        className="hidden"
                        disabled={uploadPhotoMut.isPending}
                      />
                    </label>

                    {user?.profile_photo_url && (
                      <button
                        onClick={() => deletePhotoMut.mutate()}
                        disabled={deletePhotoMut.isPending || uploadPhotoMut.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Details section */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Account Credentials</h3>
                  <p className="text-xs text-slate-400 font-medium">Ensure your primary email and display name are up to date.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Full Name field with icon */}
                    <div className="space-y-1.5">
                      <label className={labelClass}>Full Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4A0E17]">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={`${inputClass} pl-10`}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>

                    {/* Email Address field with icon */}
                    <div className="space-y-1.5">
                      <label className={labelClass}>Email Address *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4A0E17]">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`${inputClass} pl-10`}
                          placeholder="johndoe@example.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-end">
                    <button
                      type="submit"
                      disabled={updateProfileMut.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A0E17] text-white text-sm font-semibold rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 shadow-sm hover:shadow transition cursor-pointer"
                    >
                      {updateProfileMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
          {activeTab === 'system' && isAdmin && (
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
 
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-200/55">
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-450 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="relative w-full sm:w-48">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all appearance-none cursor-pointer"
                  >
                    <option value="All">All Roles</option>
                    {Object.entries(roleLabels).map(([val, label]) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white">
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
                      {filteredUserAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs bg-white">
                            No agent accounts found matching your search or filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUserAccounts.map((u) => (
                          <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3 font-semibold text-slate-800 bg-white">
                              <div className="flex items-center gap-2.5">
                                {u.profile_photo_url ? (
                                  <img
                                    src={getFileUrl(u.profile_photo_url)}
                                    alt={u.name}
                                    className="h-8 w-8 rounded-full object-cover border border-slate-100 shadow-sm shrink-0"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {u.name?.charAt(0)?.toUpperCase() ?? 'U'}
                                  </div>
                                )}
                                <span className="truncate">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs bg-white">{u.email}</td>
                            <td className="px-4 py-3 bg-white">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                                u.role_name === 'Administrator' ? 'bg-red-50 text-red-700' :
                                u.role_name === 'General Manager' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                u.role_name === 'Operational Manager' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                                u.role_name === 'Team Support Operation' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                                u.role_name === 'Underwriter' ? 'bg-blue-50 text-blue-700' :
                                u.role_name === 'Accounting Officer' ? 'bg-emerald-50 text-emerald-700' :
                                u.role_name === 'Claims Officer' ? 'bg-purple-50 text-purple-700' :
                                u.role_name === 'Collection' ? 'bg-cyan-50 text-cyan-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {u.role_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right bg-white">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleOpenEditUser(u)} className="p-1 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-slate-50 transition" title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => { setResetPasswordTarget(u); setResetPasswordValue(''); }} className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition" title="Reset Password">
                                  <Key className="h-4 w-4" />
                                </button>
                                <button onClick={() => setDeleteTarget(u)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && isAdmin && (
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
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6" autoComplete="off">
              <div className="space-y-4 animate-scale-in">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input 
                    type="text" 
                    value={userFormName} 
                    onChange={(e) => setUserFormName(e.target.value)} 
                    className={inputClass}
                    placeholder="Enter full name..."
                    autoComplete="new-user-name"
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
                    autoComplete="new-user-email"
                  />
                </div>
                <div>
                  <label className={labelClass}>Role / Department *</label>
                  <select 
                    value={userFormRole} 
                    onChange={(e) => setUserFormRole(e.target.value)} 
                    className={`${inputClass} ${selectedUser?.email === 'admin@supremogen.com' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    disabled={selectedUser?.email === 'admin@supremogen.com'}
                  >
                    {Object.entries(roleLabels)
                      .filter(([val]) => !(roles?.includes('Underwriter') && val === 'Administrator'))
                      .map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                  </select>
                  {selectedUser?.email === 'admin@supremogen.com' && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1.5">
                      The primary administrator's role cannot be changed.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
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

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setResetPasswordTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5" />
                <h3 className="font-bold text-base tracking-tight">Reset Password</h3>
              </div>
              <button 
                onClick={() => { setResetPasswordTarget(null); setShowResetPassword(false); }}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
                if (!strongPasswordRegex.test(resetPasswordValue)) {
                  showToast('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.', 'error');
                  return;
                }
                resetUserPasswordMut.mutate({
                  id: resetPasswordTarget.id,
                  data: {
                    name: resetPasswordTarget.name,
                    email: resetPasswordTarget.email,
                    role: resetPasswordTarget.role_name,
                    password: resetPasswordValue
                  }
                });
              }} 
              className="flex-1 overflow-y-auto p-6 space-y-4" 
              autoComplete="off"
            >
              <div className="text-slate-600 text-sm">
                Set a new password for <span className="font-bold text-slate-800">{resetPasswordTarget.name}</span>.
              </div>

              <div>
                <label className={labelClass}>New Password *</label>
                <div className="relative">
                  <input 
                    type={showResetPassword ? 'text' : 'password'} 
                    value={resetPasswordValue} 
                    onChange={(e) => setResetPasswordValue(e.target.value)} 
                    onFocus={() => setIsResetPasswordFocused(true)}
                    onBlur={() => setIsResetPasswordFocused(false)}
                    className={inputClass}
                    style={{ paddingRight: '2.5rem' }}
                    placeholder="e.g. P@ssword123!"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {isResetPasswordFocused && (
                  <div className="mt-2.5 space-y-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 animate-scale-in">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password Requirements</p>
                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                      <div className={`flex items-center gap-2 transition-all duration-200 ${resetHasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${resetHasMinLength ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${resetHasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${resetHasUppercase ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${resetHasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${resetHasLowercase ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${resetHasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${resetHasNumber ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-all duration-200 ${resetHasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${resetHasSpecialChar ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`} />
                        <span>One special character (e.g. !@#$)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordValue('Password123!')}
                  className="text-xs font-bold text-[#4A0E17] hover:text-[#3D0B12] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ⚡ Set to Default (Password123!)
                </button>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setResetPasswordTarget(null); setShowResetPassword(false); }}
                  className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetUserPasswordMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#4A0E17] rounded-xl hover:bg-[#3D0B12] disabled:opacity-50 transition cursor-pointer shadow-sm shadow-[#4A0E17]/20"
                >
                  {resetUserPasswordMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
