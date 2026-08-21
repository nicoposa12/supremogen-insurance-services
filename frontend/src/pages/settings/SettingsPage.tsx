import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { User as UserIcon, Shield, Bell, Save, Loader2, Settings, Key, Users, Plus, Pencil, Trash2, X, LogIn, Search, Filter, Eye, EyeOff, Camera, Mail, Archive, RotateCcw, UserCheck, UserX } from 'lucide-react';
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
  is_archived?: boolean;
  archived_at?: string | null;
  archive_reason?: string | null;
  profile_photo_url?: string | null;
  is_online?: boolean;
  last_seen_at?: string | null;
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
  const [defaultCurrency, setDefaultCurrency] = useState('PHP');
  const [companyName, setCompanyName] = useState('SUPREMOGEN INSURANCE SERVICES');

  // Preference state
  const [emailAlerts, setEmailAlerts] = useState(true);
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
  const [accountSubTab, setAccountSubTab] = useState<'active' | 'archived'>('active');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState('Sales Agent');
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<UserAccount | null>(null);
  const [archiveReason, setArchiveReason] = useState('Employee Resigned');
  const [restoreTarget, setRestoreTarget] = useState<UserAccount | null>(null);
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
    
    const storedCompany = localStorage.getItem('sys_company_name');
    if (storedCompany) setCompanyName(storedCompany);
  }, [user]);

  // Fetch users for account management
  const { data: usersRes, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/users', {
        params: { no_paginate: true, status: 'all' },
      });
      return res.data;
    },
    enabled: isAdmin && activeTab === 'accounts',
    refetchInterval: 3000,
  });
  const isAdministratorRole = roles?.includes('Administrator');

  const allUserAccounts: UserAccount[] = (usersRes?.data?.data ?? []).filter((u: UserAccount) => {
    if (!isAdministratorRole) {
      return u.role_name !== 'Administrator' && u.email !== 'admin@supremogen.com' && u.email !== 'owner@supremogen.com';
    }
    return true;
  });

  const activeAccounts = useMemo(() => allUserAccounts.filter((u) => !u.is_archived), [allUserAccounts]);
  const archivedAccounts = useMemo(() => allUserAccounts.filter((u) => u.is_archived), [allUserAccounts]);
  const onlineAccountsCount = useMemo(() => {
    return activeAccounts.filter((u) => u.is_online || u.id === user?.id).length;
  }, [activeAccounts, user?.id]);

  const currentList = accountSubTab === 'active' ? activeAccounts : archivedAccounts;

  const filteredUserAccounts = useMemo(() => {
    return currentList.filter((u) => {
      const matchesSearch = 
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      const matchesRole = 
        userRoleFilter === 'All' || 
        u.role_name === userRoleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [currentList, userSearchQuery, userRoleFilter]);

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

  const archiveUserMut = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await axios.post(`/api/v1/users/${id}/archive`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showToast(data.message || 'Account archived successfully.');
      setArchiveTarget(null);
      setArchiveReason('Employee Resigned');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to archive account.', 'error');
    },
  });

  const restoreUserMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.post(`/api/v1/users/${id}/restore`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showToast(data.message || 'Account restored successfully.');
      setRestoreTarget(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to restore account.', 'error');
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
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-slate-700">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Manage your user profile, security settings, and system configurations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start w-full min-w-0">
        {/* Tabs sidebar — horizontal scroll on mobile, vertical on md+ */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-2 sm:p-4 shadow-sm min-w-0">
          <div className="hidden md:block px-3 py-2 border-b border-slate-50 mb-2">
            <h3 className="font-extrabold text-[#4A0E17] text-xs uppercase tracking-wider">Account Settings</h3>
          </div>
          <div className="flex md:flex-col gap-1.5 sm:gap-2 overflow-x-auto md:overflow-x-visible p-1 md:p-0 bg-slate-50/80 md:bg-transparent rounded-xl md:rounded-none no-scrollbar touch-pan-x">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer md:w-full ${
                activeTab === 'profile' ? 'bg-[#4A0E17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <UserIcon className="h-4 w-4 shrink-0" /> <span>Profile Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer md:w-full ${
                activeTab === 'security' ? 'bg-[#4A0E17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" /> <span>Security & Password</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('system')}
                className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer md:w-full ${
                  activeTab === 'system' ? 'bg-[#4A0E17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" /> <span>System Configuration</span>
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer md:w-full ${
                  activeTab === 'accounts' ? 'bg-[#4A0E17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <Users className="h-4 w-4 shrink-0" /> <span>Manage Accounts</span>
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer md:w-full ${
                  activeTab === 'preferences' ? 'bg-[#4A0E17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <Bell className="h-4 w-4 shrink-0" /> <span>Preferences</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Panel */}
        <div className="w-full min-w-0 flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-3 sm:p-6 shadow-sm min-h-[400px]">
          
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
            <div className="space-y-5 animate-scale-in">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Manage Accounts</h3>
                  <p className="text-xs text-slate-400">Create, manage, and archive access for employees</p>
                </div>
                {accountSubTab === 'active' && (
                  <button 
                    onClick={() => { resetUserForm(); setIsUserModalOpen(true); }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#4A0E17] hover:bg-[#3D0B12] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="h-4 w-4" /> <span>Create Account</span>
                  </button>
                )}
              </div>

              {/* Sub-tabs: Active vs Archived Accounts */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl sm:flex sm:bg-transparent sm:p-0 sm:border-b sm:border-slate-100 sm:pb-2">
                <button
                  type="button"
                  onClick={() => setAccountSubTab('active')}
                  className={`inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    accountSubTab === 'active'
                      ? 'bg-[#4A0E17] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Active Accounts</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    accountSubTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {activeAccounts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountSubTab('archived')}
                  className={`inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    accountSubTab === 'archived'
                      ? 'bg-[#4A0E17] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archived / Resigned</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    accountSubTab === 'archived' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {archivedAccounts.length}
                  </span>
                </button>

                {roles?.includes('Administrator') && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>{onlineAccountsCount} Online</span>
                  </div>
                )}
              </div>

              {accountSubTab === 'archived' && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                  <Archive className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Archived Accounts (Resigned / Inactive Staff)</p>
                    <p className="text-amber-800/90 text-[11px] mt-0.5 leading-relaxed">
                      Archived users cannot log into the system or be assigned new quotes/policies. All historical quotes, policies, and commission records remain securely intact.
                    </p>
                  </div>
                </div>
              )}
 
              {/* Compact Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-slate-50/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1 min-w-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder={`Search ${accountSubTab === 'active' ? 'active' : 'archived'} accounts...`}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                <div className="relative w-full sm:w-44 shrink-0">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition-all cursor-pointer truncate"
                  >
                    <option value="All">All Roles</option>
                    {Object.entries(roleLabels)
                      .filter(([val]) => !(!isAdministratorRole && val === 'Administrator'))
                      .map(([val]) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Mobile View: Executive Card Layout */}
              <div className="md:hidden space-y-3 w-full min-w-0">
                {loadingUsers ? (
                  <div className="flex justify-center py-12 bg-white rounded-2xl border border-slate-100">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" />
                  </div>
                ) : filteredUserAccounts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-100">
                    No {accountSubTab === 'active' ? 'active' : 'archived'} agent accounts found matching your search or filters.
                  </div>
                ) : (
                  <div className="space-y-3 w-full min-w-0">
                    {filteredUserAccounts.map((u) => (
                      <div key={u.id} className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3 w-full min-w-0 overflow-hidden">
                        {/* Top: Avatar, Name, Role */}
                        <div className="flex items-start gap-3 w-full min-w-0">
                          <div className="relative shrink-0">
                            {u.profile_photo_url ? (
                              <img
                                src={getFileUrl(u.profile_photo_url)}
                                alt={u.name}
                                className={`h-11 w-11 rounded-full object-cover border border-slate-100 shrink-0 ${u.is_archived ? 'grayscale opacity-75' : ''}`}
                              />
                            ) : (
                              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                                u.is_archived 
                                  ? 'bg-slate-100 text-slate-500 border-slate-200' 
                                  : 'bg-gradient-to-tr from-[#4A0E17] to-[#7D1E2B] text-white shadow-xs'
                              }`}>
                                {u.name?.charAt(0)?.toUpperCase() ?? 'U'}
                              </div>
                            )}
                            {(u.is_online || u.id === user?.id) && !u.is_archived && (
                              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-[#10b981] ring-2 ring-white" title="Online" />
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <h4 className={`font-bold text-sm truncate flex-1 min-w-0 ${u.is_archived ? 'text-slate-600 line-through' : 'text-slate-800'}`}>
                                {u.name}
                              </h4>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                                u.role_name === 'Administrator' ? 'bg-red-50 text-red-700 border border-red-100' :
                                u.role_name === 'General Manager' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                u.role_name === 'Operational Manager' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                                u.role_name === 'Team Support Operation' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                                u.role_name === 'Underwriter' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                u.role_name === 'Accounting Officer' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                u.role_name === 'Claims Officer' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                u.role_name === 'Collection' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {u.role_name}
                              </span>
                            </div>
                            <p className="text-slate-400 font-mono text-xs truncate mt-0.5">{u.email}</p>
                            
                            {u.is_archived && (
                              <div className="mt-2 p-2 bg-amber-50/80 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 space-y-0.5">
                                <div className="flex items-center gap-1 font-semibold text-amber-950 truncate">
                                  <Archive className="h-3 w-3 text-amber-700 shrink-0" />
                                  <span className="truncate">Reason: {u.archive_reason || 'Resigned'}</span>
                                </div>
                                {u.archived_at && (
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    Archived on {new Date(u.archived_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons Toolbar at Bottom of Card */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 w-full min-w-0">
                          {accountSubTab === 'active' ? (
                            <div className="grid grid-cols-4 gap-1.5 w-full">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-[#4A0E17] transition cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5 shrink-0" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => { setResetPasswordTarget(u); setResetPasswordValue(''); }}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50/80 hover:bg-amber-100 transition cursor-pointer"
                              >
                                <Key className="h-3.5 w-3.5 shrink-0" />
                                <span>Pass</span>
                              </button>
                              <button
                                onClick={() => { setArchiveTarget(u); setArchiveReason('Employee Resigned'); }}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer"
                              >
                                <Archive className="h-3.5 w-3.5 shrink-0" />
                                <span>Archive</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="flex items-center justify-center py-1.5 px-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 w-full">
                              <button
                                onClick={() => setRestoreTarget(u)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restore Account</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Delete Permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop View: Full Data Table */}
              <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-2xs responsive-table-wrap">
                {loadingUsers ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" /></div>
                ) : (
                  <table className="w-full min-w-[580px] text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Agent Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Role / Department</th>
                        {accountSubTab === 'archived' && (
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Archive Reason / Date</th>
                        )}
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUserAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={accountSubTab === 'archived' ? 5 : 4} className="px-4 py-8 text-center text-slate-400 text-xs bg-white">
                            No {accountSubTab === 'active' ? 'active' : 'archived'} agent accounts found matching your search or filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUserAccounts.map((u) => (
                          <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3 font-semibold text-slate-800 bg-white">
                              <div className="flex items-center gap-2.5">
                                <div className="relative shrink-0">
                                  {u.profile_photo_url ? (
                                    <img
                                      src={getFileUrl(u.profile_photo_url)}
                                      alt={u.name}
                                      className={`h-8 w-8 rounded-full object-cover border border-slate-100 shadow-sm shrink-0 ${u.is_archived ? 'grayscale opacity-75' : ''}`}
                                    />
                                  ) : (
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                      u.is_archived 
                                        ? 'bg-slate-200 text-slate-600' 
                                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                    }`}>
                                      {u.name?.charAt(0)?.toUpperCase() ?? 'U'}
                                    </div>
                                  )}
                                  {(u.is_online || u.id === user?.id) && !u.is_archived && (
                                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-white" title="Online" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className={`truncate block ${u.is_archived ? 'text-slate-600 line-through' : ''}`}>{u.name}</span>
                                  {u.is_archived && (
                                    <span className="text-[10px] text-amber-700 font-semibold inline-flex items-center gap-0.5">
                                      <Archive className="h-2.5 w-2.5" /> Archived
                                    </span>
                                  )}
                                </div>
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
                            {accountSubTab === 'archived' && (
                              <td className="px-4 py-3 bg-white text-xs text-slate-600">
                                <span className="font-semibold text-amber-900 block">{u.archive_reason || 'Resigned'}</span>
                                {u.archived_at && (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {new Date(u.archived_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3 text-right bg-white">
                              <div className="flex items-center justify-end gap-1.5">
                                {accountSubTab === 'active' ? (
                                  <>
                                    <button onClick={() => handleOpenEditUser(u)} className="p-1 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-slate-50 transition cursor-pointer" title="Edit">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setResetPasswordTarget(u); setResetPasswordValue(''); }} className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer" title="Reset Password">
                                      <Key className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setArchiveTarget(u); setArchiveReason('Employee Resigned'); }} className="p-1 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer" title="Archive / Mark as Resigned">
                                      <Archive className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setDeleteTarget(u)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer" title="Delete">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => setRestoreTarget(u)} 
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer" 
                                      title="Restore Account"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      <span>Restore</span>
                                    </button>
                                    <button onClick={() => setDeleteTarget(u)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer" title="Delete Permanently">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            
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
                      .filter(([val]) => !(!isAdministratorRole && val === 'Administrator'))
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

      {/* Archive Account Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            {/* Modal Header */}
            <div className="bg-[#4A0E17] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Archive className="h-5 w-5" />
                <h3 className="font-bold text-base tracking-tight">Archive Employee Account</h3>
              </div>
              <button 
                onClick={() => setArchiveTarget(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                archiveUserMut.mutate({ id: archiveTarget.id, reason: archiveReason });
              }}
              className="p-6 space-y-4"
            >
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-950">
                  <Archive className="h-3.5 w-3.5" /> Deactivating Resigned Account:
                </p>
                <p>Archiving <span className="font-bold text-slate-800">{archiveTarget.name}</span> ({archiveTarget.email}) will immediately log them out and block future logins. Historical customer records, quotations, and commissions remain preserved.</p>
              </div>

              <div>
                <label className={labelClass}>Reason for Archiving *</label>
                <select
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className={inputClass}
                >
                  <option value="Employee Resigned">Employee Resigned</option>
                  <option value="Contract Ended">Contract Ended</option>
                  <option value="Transferred Department">Transferred Department</option>
                  <option value="Account Deactivated">Account Deactivated</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setArchiveTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={archiveUserMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-xl disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  {archiveUserMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  Archive Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore User Confirmation */}
      <ConfirmModal 
        open={!!restoreTarget} 
        title="Restore Employee Account"
        message={`Are you sure you want to restore and reactivate the account for ${restoreTarget?.name}? They will be able to log in and be assigned policies again.`}
        confirmLabel="Restore Account" 
        variant="primary" 
        loading={restoreUserMut.isPending}
        onConfirm={() => restoreTarget && restoreUserMut.mutate(restoreTarget.id)}
        onCancel={() => setRestoreTarget(null)} 
      />

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
            
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
