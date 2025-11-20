// frontend/src/pages/ProfileSettingsPage.jsx
// MODIFIED: Merged header by removing secondary header and adding props to LayoutComponent

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Building, Shield, Key, Save, ArrowLeft,
  CheckCircle, AlertCircle, Eye, EyeOff, Download, Copy, Check,
  Trash2, RefreshCw
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import EmailTwoFactorSetupModal from '../../components/auth/EmailTwoFactorSetupModal';
import api from '../../utils/api';

const ProfileSettingsPage = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();

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
    if (passwordData.new_password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(passwordData.new_password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(passwordData.new_password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(passwordData.new_password)) {
      return 'Password must contain at least one number';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
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
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/accounts/2fa/regenerate-backup-codes/');
      setBackupCodes(response.data.backup_codes);
      setMessage({ type: 'success', text: 'Backup codes regenerated successfully' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to regenerate backup codes'
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

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Password Requirements:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• Contains uppercase and lowercase letters</li>
                      <li>• Contains at least one number</li>
                    </ul>
                  </div>

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
        </div>

        {/* 2FA Setup Modal */}
        <EmailTwoFactorSetupModal
          isOpen={showSetup2FA}
          onClose={() => setShowSetup2FA(false)}
          onComplete={async () => {
            setTwoFactorEnabled(true);
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
      </div>
    </LayoutComponent>
  );
};

export default ProfileSettingsPage;