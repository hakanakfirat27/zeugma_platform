// frontend/src/pages/ProfileSettingsPage.jsx
// MODIFIED: Merged header by removing secondary header and adding props to LayoutComponent

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  User, Mail, Phone, Building, Shield, Key, Save, ArrowLeft,
  CheckCircle, AlertCircle, Eye, EyeOff, Download, Copy, 
  Trash2, RefreshCw, Bell, BellRing, BellOff, Smartphone, Laptop, Send
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import EmailTwoFactorSetupModal from '../../components/auth/EmailTwoFactorSetupModal';
import usePushNotifications from '../../hooks/usePushNotifications';
import api from '../../utils/api';
import { Check, X } from 'lucide-react';

const ProfileSettingsPage = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);    

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile form data
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    company_name: '',
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [showRegenerateCodesModal, setShowRegenerateCodesModal] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');

  // Password policy state
  const [passwordPolicy, setPasswordPolicy] = useState(null);
  const [passwordRequirements, setPasswordRequirements] = useState({});

  // Push notifications
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
    sendTestNotification,
    getSubscriptions,
    deleteSubscription
  } = usePushNotifications();
  
  const [pushSubscriptions, setPushSubscriptions] = useState([]);
  const [loadingPush, setLoadingPush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        company_name: user.company_name || '',
      });
      setTwoFactorEnabled(user.two_factor_enabled || false);
    }
  }, [user]);

  // Fetch password policy from API
  useEffect(() => {
    const fetchPasswordPolicy = async () => {
      try {
        const response = await api.get('/accounts/security/password-policy/');
        // API returns { policy: {...}, requirements: [...] }
        setPasswordPolicy(response.data.policy || response.data);
      } catch (err) {
        // Use default policy if API fails
        setPasswordPolicy({
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: false,
        });
      }
    };
    fetchPasswordPolicy();
  }, []);

  // Update password requirements dynamically based on password input
  useEffect(() => {
    if (passwordPolicy && passwordData.new_password) {
      const newPassword = passwordData.new_password;
      setPasswordRequirements({
        minLength: newPassword.length >= passwordPolicy.min_length,
        hasUppercase: !passwordPolicy.require_uppercase || /[A-Z]/.test(newPassword),
        hasLowercase: !passwordPolicy.require_lowercase || /[a-z]/.test(newPassword),
        hasNumber: !passwordPolicy.require_numbers || /[0-9]/.test(newPassword),
        hasSpecialChar: !passwordPolicy.require_special_chars || /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(newPassword),
      });
    }
  }, [passwordData.new_password, passwordPolicy]);

  // Load push subscriptions when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications' && pushSupported) {
      loadPushSubscriptions();
    }
  }, [activeTab, pushSupported]);

  const loadPushSubscriptions = async () => {
    try {
      const subs = await getSubscriptions();
      setPushSubscriptions(subs || []);
    } catch (err) {
      console.error('Failed to load push subscriptions:', err);
    }
  };

  const handlePushSubscribe = async () => {
    setLoadingPush(true);
    try {
      await pushSubscribe();
      setMessage({ type: 'success', text: 'Successfully subscribed to push notifications!' });
      loadPushSubscriptions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to subscribe' });
    } finally {
      setLoadingPush(false);
    }
  };

  const handlePushUnsubscribe = async () => {
    setLoadingPush(true);
    try {
      await pushUnsubscribe();
      setMessage({ type: 'success', text: 'Unsubscribed from push notifications' });
      loadPushSubscriptions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to unsubscribe' });
    } finally {
      setLoadingPush(false);
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      await sendTestNotification();
      setMessage({ type: 'success', text: 'Test notification sent! Check your notifications.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to send test notification' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeletePushSubscription = async (id) => {
    try {
      await deleteSubscription(id);
      setMessage({ type: 'success', text: 'Device removed from push notifications' });
      loadPushSubscriptions();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove device' });
    }
  };

  const getDeviceIcon = (deviceName) => {
    const name = (deviceName || '').toLowerCase();
    if (name.includes('mobile') || name.includes('android') || name.includes('iphone')) {
      return Smartphone;
    }
    return Laptop;
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.patch('/accounts/user/', profileData);
      await checkAuth(); // Refresh user data
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    if (!passwordPolicy) return 'Loading password policy...';
    
    const password = passwordData.new_password;
    
    if (password.length < passwordPolicy.min_length) {
      return `Password must be at least ${passwordPolicy.min_length} characters`;
    }
    if (passwordPolicy.require_uppercase && !/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (passwordPolicy.require_lowercase && !/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (passwordPolicy.require_numbers && !/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (passwordPolicy.require_special_chars && !/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    if (password !== passwordData.confirm_password) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const validationError = validatePassword();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      setLoading(false);
      return;
    }

    try {
      await api.post('/accounts/change-password/', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password. Please check your current password.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/accounts/2fa/disable/', {
        password: disablePassword
      });

      setTwoFactorEnabled(false);
      setShowDisable2FA(false);
      setDisablePassword('');
      await checkAuth();
      setMessage({ type: 'success', text: '2FA disabled successfully' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to disable 2FA. Please check your password.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    // Show password confirmation modal
    setShowRegenerateCodesModal(true);
  };

  const confirmRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      setMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/accounts/2fa/regenerate-backup-codes/', {
        password: regeneratePassword
      });
      setBackupCodes(response.data.backup_codes);
      setShowRegenerateCodesModal(false);
      setRegeneratePassword('');
      setMessage({ type: 'success', text: 'Backup codes regenerated successfully. Save them now!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to regenerate backup codes'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadBackupCodes = () => {
    const text = `Zeugma Platform - 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeugma-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDashboardPath = () => {
    if (user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN') {
      return '/staff-dashboard';
    } else if (user?.role === 'DATA_COLLECTOR') {
      return '/data-collector-dashboard';      
    } else if (user?.role === 'CLIENT') {
      return '/client-dashboard';
    } else if (user?.role === 'GUEST') {
      return '/guest-dashboard';
    }
    return '/';
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  // FIXED: Now checks for DATA_COLLECTOR role as well
  const getLayoutComponent = () => {
    if (user?.role === 'CLIENT') {
      return ClientDashboardLayout;
    } else if (user?.role === 'DATA_COLLECTOR') {
      return DataCollectorLayout;
    } else {
      return DashboardLayout; // For STAFF and other roles
    }
  };

  const LayoutComponent = getLayoutComponent();

  // --- NEW: Define the header subtitle ---
  const pageSubtitle = (
      <p className="text-sm text-white-500">Manage your account settings and preferences</p> // Color for white header
  );

  return (
    // --- MODIFIED: Pass pageTitle and potentially subtitle props ---
    <LayoutComponent
      pageTitle="Profile Settings"
      breadcrumbs={breadcrumbs}
      // Conditionally pass subtitles only if it's DashboardLayout
      {...(LayoutComponent === DashboardLayout && { pageSubtitleBottom: pageSubtitle })}
    >
      <div className="min-h-screen bg-gray-50">
        {/* --- REMOVED: The secondary gradient header div --- */}

        {/* Content */}
        <div className="max-w-7xl mx-auto p-8">
          {/* Message Alert */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMessage({ type: '', text: '' });
                    }}
                    className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* User Info Display */}
                <div className="pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                      {user?.initials || 'U'}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user?.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="first_name"
                        value={profileData.first_name}
                        onChange={handleProfileChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="John"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="last_name"
                        value={profileData.last_name}
                        onChange={handleProfileChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone_number"
                        value={profileData.phone_number}
                        onChange={handleProfileChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="company_name"
                        value={profileData.company_name}
                        onChange={handleProfileChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Company Inc."
                      />
                    </div>
                  </div>
                </div>

                {/* Email Display (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact support to change your email address
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Change Password Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Key className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {passwordPolicy && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-sm font-semibold text-slate-900 mb-3">Password Requirements:</p>
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 text-sm ${passwordRequirements.minLength ? 'text-green-600' : 'text-slate-600'}`}>
                          {passwordRequirements.minLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-400" />}
                          <span>At least {passwordPolicy.min_length} characters long</span>
                        </div>
                        {passwordPolicy.require_uppercase && (
                          <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-slate-600'}`}>
                            {passwordRequirements.hasUppercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-400" />}
                            <span>Contains uppercase letter</span>
                          </div>
                        )}
                        {passwordPolicy.require_lowercase && (
                          <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-slate-600'}`}>
                            {passwordRequirements.hasLowercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-400" />}
                            <span>Contains lowercase letter</span>
                          </div>
                        )}
                        {passwordPolicy.require_numbers && (
                          <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-slate-600'}`}>
                            {passwordRequirements.hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-400" />}
                            <span>Contains at least one number</span>
                          </div>
                        )}
                        {passwordPolicy.require_special_chars && (
                          <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-slate-600'}`}>
                            {passwordRequirements.hasSpecialChar ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-slate-400" />}
                            <span>Contains at least one special character</span>
                          </div>
                        )}
                      </div>
                      {passwordData.confirm_password && (
                        <div className={`mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-sm font-medium ${passwordData.new_password === passwordData.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                          {passwordData.new_password === passwordData.confirm_password ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          <span>{passwordData.new_password === passwordData.confirm_password ? 'Passwords match' : 'Passwords do not match'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Changing...
                        </>
                      ) : (
                        <>
                          <Key className="w-5 h-5" />
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2FA Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-indigo-600" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-medium ${
                    twoFactorEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                {!twoFactorEnabled ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Protect your account with an authenticator app. You'll need to enter a code from the app whenever you sign in.
                    </p>
                    <button
                      onClick={() => setShowSetup2FA(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Shield className="w-5 h-5" />
                      Enable 2FA
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        Two-factor authentication is active on your account. You'll be asked for a verification code when you sign in.
                      </p>
                    </div>

                    {backupCodes.length > 0 && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-900">Your Backup Codes:</p>
                          <div className="flex gap-2">
                            <button
                              onClick={copyBackupCodes}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Copy codes"
                            >
                              {copiedBackup ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={downloadBackupCodes}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Download codes"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {backupCodes.map((code, index) => (
                            <code key={index} className="text-xs bg-white border border-gray-200 rounded px-2 py-1">
                              {code}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleRegenerateBackupCodes}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate Backup Codes
                      </button>
                      <button
                        onClick={() => setShowDisable2FA(true)}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Disable 2FA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Push Notifications Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-indigo-600" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Push Notifications</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Receive alerts even when the app is closed
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-medium ${
                    pushSubscribed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {pushSubscribed ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                {!pushSupported ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Browser Not Supported</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : pushPermission === 'denied' ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <BellOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Notifications Blocked</p>
                        <p className="text-xs text-red-700 mt-1">
                          You've blocked notifications for this site. Click the lock icon in your browser's address bar to allow notifications.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Get notified about new reports, messages, and important updates even when you're not using the platform.
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      {!pushSubscribed ? (
                        <button
                          onClick={handlePushSubscribe}
                          disabled={loadingPush}
                          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {loadingPush ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <BellRing className="w-4 h-4" />
                          )}
                          Enable Push Notifications
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handlePushUnsubscribe}
                            disabled={loadingPush}
                            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {loadingPush ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <BellOff className="w-4 h-4" />
                            )}
                            Disable Push Notifications
                          </button>
                          <button
                            onClick={handleSendTestNotification}
                            disabled={sendingTest}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {sendingTest ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Send Test Notification
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Subscribed Devices */}
              {pushSupported && pushSubscriptions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">Your Subscribed Devices</h3>
                      </div>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        {pushSubscriptions.length} device{pushSubscriptions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {pushSubscriptions.map((sub) => {
                      const DeviceIcon = getDeviceIcon(sub.device_name);
                      return (
                        <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                              <DeviceIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {sub.device_name || 'Unknown Device'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Added {new Date(sub.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePushSubscription(sub.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove device"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">About Push Notifications</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Push notifications let you receive alerts about new reports, messages, and important updates even when you're not actively using the platform. You can subscribe on multiple devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2FA Setup Modal */}
        <EmailTwoFactorSetupModal
          isOpen={showSetup2FA}
          onClose={() => setShowSetup2FA(false)}
          onComplete={async (codes) => {
            setTwoFactorEnabled(true);
            if (codes && codes.length > 0) {
              setBackupCodes(codes);
            }
            await checkAuth();
            setMessage({ type: 'success', text: '2FA enabled successfully!' });
          }}
          isRequired={false}
        />

        {/* Disable 2FA Confirmation Modal */}
        {showDisable2FA && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Disable Two-Factor Authentication</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Disabling 2FA will make your account less secure. You'll only need your password to sign in.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                    autoFocus
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDisable2FA(false);
                    setDisablePassword('');
                  }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={loading || !disablePassword}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regenerate Backup Codes Modal */}
        {showRegenerateCodesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Regenerate Backup Codes</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> This will invalidate all your existing backup codes. Make sure to save the new codes.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={regeneratePassword}
                    onChange={(e) => setRegeneratePassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your password"
                    autoFocus
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRegenerateCodesModal(false);
                    setRegeneratePassword('');
                  }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRegenerateBackupCodes}
                  disabled={loading || !regeneratePassword}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Regenerate Codes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
};

export default ProfileSettingsPage;