// frontend/src/pages/settings/UserSettingsPage.jsx
// Comprehensive User Settings Page - Available to ALL users

import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  User, Palette, Bell, Shield, ChevronRight,
  Save, Eye, EyeOff, Key, AlertCircle, CheckCircle,
  Copy, Download, RefreshCw, Trash2, BellRing, BellOff,
  Smartphone, Laptop, Send, Mail, Phone, Building,
  Moon, Sun, Monitor, Check, X, Edit,
  Activity, Clock, Globe, MapPin, LogIn, LogOut, Calendar
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import EmailTwoFactorSetupModal from '../../components/auth/EmailTwoFactorSetupModal';
import usePushNotifications from '../../hooks/usePushNotifications';
import api from '../../utils/api';

// ============================================
// EXPANDED COLOR PALETTE (matching Architect UI)
// ============================================
const colorPalette = [
  // Row 1 - Primary solid colors
  { id: 'default', color: 'linear-gradient(to bottom right, #6366F1, #9333EA)', name: 'Default (Indigo-Purple)', isGradient: true },
  { id: 'dark', color: '#000000', name: 'Dark' },
  { id: 'forest', color: '#059669', name: 'Forest' },
  { id: 'ocean', color: '#0EA5E9', name: 'Ocean' },
  { id: 'amber', color: '#F59E0B', name: 'Amber' },
  { id: 'rose', color: '#F43F5E', name: 'Rose' },
  { id: 'lavender', color: '#C4B5FD', name: 'Lavender' },
  { id: 'slate', color: '#64748B', name: 'Slate' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  // Row 2 - More solid colors
  { id: 'midnight', color: '#1E3A5F', name: 'Midnight' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'cyan', color: '#06B6D4', name: 'Cyan' },
  { id: 'teal', color: '#14B8A6', name: 'Teal' },
  { id: 'lime', color: '#84CC16', name: 'Lime' },
  { id: 'sunset', color: '#F97316', name: 'Sunset' },
  { id: 'stone', color: '#78716C', name: 'Stone' },
  // Row 3 - Additional colors
  { id: 'emerald', color: '#10B981', name: 'Emerald' },
  { id: 'sky', color: '#38BDF8', name: 'Sky' },
  { id: 'violet', color: '#7C3AED', name: 'Violet' },
  { id: 'fuchsia', color: '#D946EF', name: 'Fuchsia' },
  { id: 'coral', color: '#FF6B6B', name: 'Coral' },
  { id: 'gold', color: '#EAB308', name: 'Gold' },
  { id: 'navy', color: '#1E40AF', name: 'Navy' },
  { id: 'charcoal', color: '#374151', name: 'Charcoal' },
  // Row 4 - Pastel/Light colors
  { id: 'lightblue', color: '#93C5FD', name: 'Light Blue' },
  { id: 'lightgreen', color: '#86EFAC', name: 'Light Green' },
  { id: 'lightpink', color: '#FBCFE8', name: 'Light Pink' },
  { id: 'lightyellow', color: '#FDE68A', name: 'Light Yellow' },
  { id: 'lightpurple', color: '#DDD6FE', name: 'Light Purple' },
  { id: 'lightcyan', color: '#A5F3FC', name: 'Light Cyan' },
  { id: 'lightorange', color: '#FED7AA', name: 'Light Orange' },
  { id: 'lightgray', color: '#E5E7EB', name: 'Light Gray' },
  // Row 5 - Deep/Rich colors
  { id: 'crimson', color: '#DC2626', name: 'Crimson' },
  { id: 'indigo', color: '#4F46E5', name: 'Deep Indigo' },
  { id: 'deepblue', color: '#1D4ED8', name: 'Deep Blue' },
  { id: 'deeppurple', color: '#7E22CE', name: 'Deep Purple' },
  { id: 'deepteal', color: '#0D9488', name: 'Deep Teal' },
  { id: 'deepgreen', color: '#15803D', name: 'Deep Green' },
  { id: 'bronze', color: '#A16207', name: 'Bronze' },
  { id: 'maroon', color: '#881337', name: 'Maroon' },
  // Row 6 - Gradient-like/Unique colors
  { id: 'royalblue', color: '#4169E1', name: 'Royal Blue' },
  { id: 'hotpink', color: '#FF69B4', name: 'Hot Pink' },
  { id: 'turquoise', color: '#40E0D0', name: 'Turquoise' },
  { id: 'salmon', color: '#FA8072', name: 'Salmon' },
  { id: 'orchid', color: '#DA70D6', name: 'Orchid' },
  { id: 'seagreen', color: '#2E8B57', name: 'Sea Green' },
  { id: 'steelblue', color: '#4682B4', name: 'Steel Blue' },
  { id: 'tomato', color: '#FF6347', name: 'Tomato' },
  // Row 7 - Multi-color gradients (displayed as gradient circles)
  { id: 'aurora', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)', name: 'Aurora', isGradient: true },
  { id: 'sunset_glow', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', name: 'Sunset Glow', isGradient: true },
  { id: 'ocean_breeze', color: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)', name: 'Ocean Breeze', isGradient: true },
  { id: 'purple_haze', color: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)', name: 'Purple Haze', isGradient: true },
  { id: 'fresh_mint', color: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', name: 'Fresh Mint', isGradient: true },
  { id: 'warm_flame', color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', name: 'Warm Flame', isGradient: true },
  { id: 'cool_blues', color: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)', name: 'Cool Blues', isGradient: true },
  { id: 'night_fade', color: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', name: 'Night Fade', isGradient: true },
];

// ============================================
// SETTINGS SECTIONS
// ============================================
const settingsSections = [
  { 
    id: 'profile', 
    name: 'Profile', 
    icon: User, 
    description: 'Personal information and account details',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  { 
    id: 'theme', 
    name: 'Theme', 
    icon: Palette, 
    description: 'Header and sidebar color preferences',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
  { 
    id: 'notifications', 
    name: 'Notifications', 
    icon: Bell, 
    description: 'Email, push, and in-app notifications',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  { 
    id: 'security', 
    name: 'Security', 
    icon: Shield, 
    description: '2FA, password, and activity log',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20'
  },
];

// ============================================
// PROFILE SECTION - Full Profile View with Edit Modal
// ============================================
const ProfileSection = ({ user, checkAuth }) => {
  const toast = useToast();
  const { headerGradient } = useUserSettings();
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    company_name: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        company_name: user.company_name || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/accounts/user/', profileData);
      await checkAuth();
      toast.success('Profile updated successfully!');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = () => {
    if (!user?.role) return 'User';
    return user.role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Profile Header Card with Gradient Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Gradient Banner */}
        <div 
          className="h-28 w-full relative"
          style={{ background: headerGradient }}
        />
        
        {/* Avatar & Name Section */}
        <div className="px-6 pb-5 -mt-12">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-800"
                style={{ background: headerGradient }}
              >
                {user?.initials || 'U'}
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white dark:border-gray-800" />
            </div>
            
            {/* Name & Role */}
            <div className="pt-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.full_name || user?.username}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getUserRole()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            Contact Information
          </h3>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Email Address</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{user?.email || 'Not provided'}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                  {user?.phone_number || 'Not provided'}
                </p>
              </div>
            </div>

            {/* Company */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Company</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                  {user?.company_name || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            Account Information
          </h3>

          <div className="space-y-4">
            {/* Username */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Username</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{user?.username || 'Not available'}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Role</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{getUserRole()}</p>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                  {formatDate(user?.date_joined)}
                </p>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Two-Factor Authentication</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {user?.two_factor_enabled ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Profile CTA */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800 p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Keep Your Profile Up to Date
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your contact information and personal details.
            </p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md whitespace-nowrap text-sm font-medium"
          >
            <Edit className="w-4 h-4" />
            Update Profile
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <Edit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Update your personal information</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone_number"
                    value={profileData.phone_number}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="company_name"
                    value={profileData.company_name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Company Inc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contact support to change your email address</p>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// THEME SECTION - Circular Color Picker Style (Architect UI)
// ============================================
const ThemeSection = ({ settings, updateSettings, loading }) => {
  // Get context values for real-time sync between header toggle and settings page
  const { 
    updateSetting: updateContextSetting,
    themeMode: contextThemeMode,
    headerColorScheme: contextHeaderColorScheme,
    sidebarColorScheme: contextSidebarColorScheme
  } = useUserSettings();

  // Use context values as source of truth
  const currentThemeMode = contextThemeMode || settings?.theme_mode || 'system';
  const currentHeaderScheme = contextHeaderColorScheme || settings?.header_color_scheme || 'purple_haze';
  const currentSidebarScheme = contextSidebarColorScheme || settings?.sidebar_color_scheme || 'dark';

  const handleThemeModeChange = (mode) => {
    updateSettings({ theme_mode: mode });
    updateContextSetting('theme_mode', mode);
  };

  const handleHeaderColorChange = (scheme) => {
    updateSettings({ header_color_scheme: scheme });
    updateContextSetting('header_color_scheme', scheme);
  };

  const handleSidebarColorChange = (scheme) => {
    updateSettings({ sidebar_color_scheme: scheme });
    updateContextSetting('sidebar_color_scheme', scheme);
  };

  const handleRestoreHeaderDefault = () => {
    handleHeaderColorChange('purple_haze');
  };

  const handleRestoreSidebarDefault = () => {
    handleSidebarColorChange('dark');
  };

  return (
    <div className="space-y-4">
      {/* Theme Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Theme Mode</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred color scheme</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light', icon: Sun, color: 'text-amber-500' },
            { value: 'dark', label: 'Dark', icon: Moon, color: 'text-indigo-500' },
            { value: 'system', label: 'System', icon: Monitor, color: 'text-gray-500' },
          ].map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => handleThemeModeChange(value)}
              disabled={loading}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                currentThemeMode === value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className={`w-6 h-6 ${currentThemeMode === value ? 'text-indigo-600' : color}`} />
              <span className={`text-sm font-medium ${currentThemeMode === value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {label}
              </span>
              {currentThemeMode === value && (
                <Check className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Header Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Header Options</h3>
          <button
            onClick={handleRestoreHeaderDefault}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restore Default
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Choose Color Scheme</p>
          
          <div className="flex flex-wrap gap-2">
            {colorPalette.map((item) => (
              <button
                key={item.id}
                onClick={() => handleHeaderColorChange(item.id)}
                disabled={loading}
                title={item.name}
                className={`w-8 h-8 rounded-full transition-all duration-200 ${
                  currentHeaderScheme === item.id
                    ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800 scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ background: item.isGradient ? item.color : item.color }}
              >
                {currentHeaderScheme === item.id && (
                  <Check className="w-4 h-4 text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sidebar Options</h3>
          <button
            onClick={handleRestoreSidebarDefault}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restore Default
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Choose Color Scheme</p>
          
          <div className="flex flex-wrap gap-2">
            {colorPalette.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSidebarColorChange(item.id)}
                disabled={loading}
                title={item.name}
                className={`w-8 h-8 rounded-full transition-all duration-200 ${
                  currentSidebarScheme === item.id
                    ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800 scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ background: item.isGradient ? item.color : item.color }}
              >
                {currentSidebarScheme === item.id && (
                  <Check className="w-4 h-4 text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NOTIFICATIONS SECTION
// ============================================
const NotificationsSection = ({ settings, updateSettings, loading }) => {
  const toast = useToast();
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
    if (pushSupported) {
      loadPushSubscriptions();
    }
  }, [pushSupported]);

  const loadPushSubscriptions = async () => {
    try {
      const subs = await getSubscriptions();
      setPushSubscriptions(subs || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    }
  };

  const handlePushSubscribe = async () => {
    setLoadingPush(true);
    try {
      await pushSubscribe();
      toast.success('Subscribed to push notifications!');
      loadPushSubscriptions();
    } catch (err) {
      toast.error(err.message || 'Failed to subscribe');
    } finally {
      setLoadingPush(false);
    }
  };

  const handlePushUnsubscribe = async () => {
    setLoadingPush(true);
    try {
      await pushUnsubscribe();
      toast.success('Unsubscribed from push notifications');
      loadPushSubscriptions();
    } catch (err) {
      toast.error(err.message || 'Failed to unsubscribe');
    } finally {
      setLoadingPush(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      await sendTestNotification();
      toast.success('Test notification sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to send test');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteSubscription = async (id) => {
    try {
      await deleteSubscription(id);
      toast.success('Device removed');
      loadPushSubscriptions();
    } catch (err) {
      toast.error('Failed to remove device');
    }
  };

  const getDeviceIcon = (deviceName) => {
    const name = (deviceName || '').toLowerCase();
    if (name.includes('mobile') || name.includes('android') || name.includes('iphone')) {
      return Smartphone;
    }
    return Laptop;
  };

  return (
    <div className="space-y-4">
      {/* Email Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Receive email notifications for important updates</p>
            </div>
            <button
              onClick={() => updateSettings({ email_notifications: !settings?.email_notifications })}
              disabled={loading}
              className={`w-11 h-6 rounded-full transition-colors ${
                settings?.email_notifications ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                settings?.email_notifications ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">In-App Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Notifications within the platform</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">In-App Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Show notifications in the notification panel</p>
            </div>
            <button
              onClick={() => updateSettings({ inapp_notifications: !settings?.inapp_notifications })}
              disabled={loading}
              className={`w-11 h-6 rounded-full transition-colors ${
                settings?.inapp_notifications ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                settings?.inapp_notifications ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Notification Sound</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Play a sound when new notifications arrive</p>
            </div>
            <button
              onClick={() => updateSettings({ notification_sound: !settings?.notification_sound })}
              disabled={loading}
              className={`w-11 h-6 rounded-full transition-colors ${
                settings?.notification_sound ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                settings?.notification_sound ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <BellRing className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Browser and device notifications</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            pushSubscribed
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {pushSubscribed ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!pushSupported ? (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Browser Not Supported</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                  Push notifications aren't supported in this browser. Try Chrome, Firefox, or Edge.
                </p>
              </div>
            </div>
          </div>
        ) : pushPermission === 'denied' ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <BellOff className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Notifications Blocked</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Click the lock icon in your browser's address bar to allow notifications.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {!pushSubscribed ? (
                <button
                  onClick={handlePushSubscribe}
                  disabled={loadingPush}
                  className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingPush ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  Enable on This Device
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePushUnsubscribe}
                    disabled={loadingPush}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingPush ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                    Disable on This Device
                  </button>
                  <button
                    onClick={handleSendTest}
                    disabled={sendingTest}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Subscribed Devices */}
        {pushSupported && pushSubscriptions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Your Devices</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">{pushSubscriptions.length} device(s)</span>
            </div>
            <div className="space-y-2">
              {pushSubscriptions.map((sub) => {
                const DeviceIcon = getDeviceIcon(sub.device_name);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-500">
                        <DeviceIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.device_name || 'Unknown Device'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Added {new Date(sub.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SECURITY SECTION
// ============================================
const SecuritySection = ({ user, checkAuth }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [activeSecurityTab, setActiveSecurityTab] = useState('2fa');

  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordPolicy, setPasswordPolicy] = useState(null);
  const [passwordRequirements, setPasswordRequirements] = useState({});

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');

  // Activity state
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(user.two_factor_enabled || false);
    }
  }, [user]);

  useEffect(() => {
    const fetchPasswordPolicy = async () => {
      try {
        const response = await api.get('/accounts/password-policy/');
        setPasswordPolicy(response.data.policy || response.data);
      } catch {
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

  useEffect(() => {
    if (activeSecurityTab === 'activity') {
      fetchActivityLog();
    }
  }, [activeSecurityTab]);

  useEffect(() => {
    if (passwordPolicy && passwordData.new_password) {
      const p = passwordData.new_password;
      setPasswordRequirements({
        minLength: p.length >= passwordPolicy.min_length,
        hasUppercase: !passwordPolicy.require_uppercase || /[A-Z]/.test(p),
        hasLowercase: !passwordPolicy.require_lowercase || /[a-z]/.test(p),
        hasNumber: !passwordPolicy.require_numbers || /[0-9]/.test(p),
        hasSpecialChar: !passwordPolicy.require_special_chars || /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(p),
      });
    }
  }, [passwordData.new_password, passwordPolicy]);

  const fetchActivityLog = async () => {
    setLoadingActivity(true);
    try {
      const response = await api.get('/accounts/user/activity/');
      setActivityLog(response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const validatePassword = () => {
    if (!passwordPolicy) return 'Loading...';
    const p = passwordData.new_password;
    if (p.length < passwordPolicy.min_length) return `At least ${passwordPolicy.min_length} characters required`;
    if (passwordPolicy.require_uppercase && !/[A-Z]/.test(p)) return 'Uppercase letter required';
    if (passwordPolicy.require_lowercase && !/[a-z]/.test(p)) return 'Lowercase letter required';
    if (passwordPolicy.require_numbers && !/[0-9]/.test(p)) return 'Number required';
    if (passwordPolicy.require_special_chars && !/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(p)) return 'Special character required';
    if (p !== passwordData.confirm_password) return 'Passwords do not match';
    return null;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const error = validatePassword();
    if (error) {
      toast.error(error);
      return;
    }
    setLoading(true);
    try {
      await api.post('/accounts/change-password/', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password');
      return;
    }
    setLoading(true);
    try {
      await api.post('/accounts/2fa/disable/', { password: disablePassword });
      setTwoFactorEnabled(false);
      setShowDisable2FA(false);
      setDisablePassword('');
      await checkAuth();
      toast.success('2FA disabled successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      toast.error('Please enter your password');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/accounts/2fa/regenerate-backup-codes/', { password: regeneratePassword });
      setBackupCodes(response.data.backup_codes);
      setShowRegenerateModal(false);
      setRegeneratePassword('');
      toast.success('Backup codes regenerated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate codes');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    } catch {}
  };

  const downloadBackupCodes = () => {
    const text = `Zeugma Platform - 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nKeep these codes safe. Each can only be used once.`;
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

  const securityTabs = [
    { id: '2fa', label: 'Two-Factor Auth', icon: Shield },
    { id: 'password', label: 'Change Password', icon: Key },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];

  return (
    <div className="space-y-4">
      {/* Security Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1.5">
        <div className="flex gap-1">
          {securityTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSecurityTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSecurityTab === id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 2FA Section */}
      {activeSecurityTab === '2fa' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                twoFactorEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <Shield className={`w-5 h-5 ${twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              twoFactorEnabled 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {!twoFactorEnabled ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Protect your account with an authenticator app. You'll need a code whenever you sign in.
              </p>
              <button
                onClick={() => setShowSetup2FA(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Enable 2FA
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300">
                  2FA is active. A verification code is required when you sign in.
                </p>
              </div>

              {backupCodes.length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Backup Codes</p>
                    <div className="flex gap-2">
                      <button onClick={copyBackupCodes} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                        {copiedBackup ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                      </button>
                      <button onClick={downloadBackupCodes} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-3 py-1.5 font-mono text-gray-900 dark:text-gray-100">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Backup Codes
                </button>
                <button
                  onClick={() => setShowDisable2FA(true)}
                  className="px-3 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Disable 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Password Section */}
      {activeSecurityTab === 'password' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Change Password</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordPolicy && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Password Requirements</p>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${passwordRequirements.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {passwordRequirements.minLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    At least {passwordPolicy.min_length} characters
                  </div>
                  {passwordPolicy.require_uppercase && (
                    <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordRequirements.hasUppercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      Contains uppercase letter
                    </div>
                  )}
                  {passwordPolicy.require_lowercase && (
                    <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordRequirements.hasLowercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      Contains lowercase letter
                    </div>
                  )}
                  {passwordPolicy.require_numbers && (
                    <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordRequirements.hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      Contains a number
                    </div>
                  )}
                  {passwordPolicy.require_special_chars && (
                    <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordRequirements.hasSpecialChar ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      Contains special character
                    </div>
                  )}
                </div>
                {passwordData.confirm_password && (
                  <div className={`mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center gap-2 text-sm font-medium ${
                    passwordData.new_password === passwordData.confirm_password ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                  }`}>
                    {passwordData.new_password === passwordData.confirm_password ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {passwordData.new_password === passwordData.confirm_password ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activity Log Section */}
      {activeSecurityTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Activity Log</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your recent account activity</p>
                </div>
              </div>
              <button
                onClick={fetchActivityLog}
                disabled={loadingActivity}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {loadingActivity ? (
            <div className="p-6 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : activityLog.length === 0 ? (
            <div className="p-6 text-center">
              <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No activity logged yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activityLog.map((item, index) => (
                <div key={index} className="p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.action_type === 'login' ? 'bg-green-100 dark:bg-green-900/30' :
                    item.action_type === 'logout' ? 'bg-gray-100 dark:bg-gray-700' :
                    item.action_type === 'password_change' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    item.action_type === '2fa_enabled' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {item.action_type === 'login' && <LogIn className="w-4 h-4 text-green-600 dark:text-green-400" />}
                    {item.action_type === 'logout' && <LogOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                    {item.action_type === 'password_change' && <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    {item.action_type === '2fa_enabled' && <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                    {!['login', 'logout', 'password_change', '2fa_enabled'].includes(item.action_type) && (
                      <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description || item.action_type}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp || item.created_at).toLocaleString()}
                      </span>
                      {item.ip_address && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {item.ip_address}
                        </span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2FA Setup Modal */}
      <EmailTwoFactorSetupModal
        isOpen={showSetup2FA}
        onClose={() => setShowSetup2FA(false)}
        onComplete={async (codes) => {
          setTwoFactorEnabled(true);
          if (codes?.length > 0) setBackupCodes(codes);
          await checkAuth();
          toast.success('2FA enabled successfully!');
        }}
        isRequired={false}
      />

      {/* Disable 2FA Modal */}
      {showDisable2FA && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Disable 2FA</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  This will make your account less secure. You'll only need your password to sign in.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Enter your password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  placeholder="Password"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2 rounded-b-lg">
              <button
                onClick={() => { setShowDisable2FA(false); setDisablePassword(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={loading || !disablePassword}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Codes Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Regenerate Backup Codes</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Warning:</strong> This will invalidate all existing backup codes.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Enter your password</label>
                <input
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Password"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2 rounded-b-lg">
              <button
                onClick={() => { setShowRegenerateModal(false); setRegeneratePassword(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateBackupCodes}
                disabled={loading || !regeneratePassword}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN USER SETTINGS PAGE
// ============================================
const UserSettingsPage = () => {
  const { user, checkAuth } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // User settings state
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeSection = searchParams.get('section') || 'profile';
  
  const setActiveSection = (section) => {
    setSearchParams({ section });
  };

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/accounts/user/settings/');
        setSettings(response.data);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setSettings({
          theme_mode: 'system',
          header_color_scheme: 'default',
          sidebar_color_scheme: 'default',
          email_notifications: true,
          push_notifications: true,
          inapp_notifications: true,
          notification_sound: false,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Update settings
  const updateSettings = async (updates) => {
    setSaving(true);
    const optimisticSettings = { ...settings, ...updates };
    setSettings(optimisticSettings);

    try {
      const response = await api.patch('/accounts/user/settings/', updates);
      setSettings(response.data);
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
      const response = await api.get('/accounts/user/settings/');
      setSettings(response.data);
    } finally {
      setSaving(false);
    }
  };

  const currentSection = settingsSections.find(s => s.id === activeSection) || settingsSections[0];

  // Get layout component based on user role
  const getLayoutComponent = () => {
    if (user?.role === 'CLIENT') return ClientDashboardLayout;
    if (user?.role === 'DATA_COLLECTOR') return DataCollectorLayout;
    return DashboardLayout;
  };

  const LayoutComponent = getLayoutComponent();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  if (loading) {
    return (
      <LayoutComponent pageTitle="Settings" breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent 
      pageTitle="Settings"
      pageSubtitleBottom="Manage your account settings and preferences"
      breadcrumbs={breadcrumbs}
      fullHeight={true}
    >
      <div className="flex h-full overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Navigation */}
          <nav className="flex-1 p-3 pt-4 space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left relative ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 shadow-md border-2 border-indigo-300 dark:border-indigo-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                  )}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold ${
                      isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {section.name}
                    </span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </nav>

          {/* Saving Indicator */}
          {saving && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 min-h-0">
          <div className="p-6">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentSection.bgColor}`}>
                <currentSection.icon className={`w-5 h-5 ${currentSection.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{currentSection.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentSection.description}</p>
              </div>
            </div>

            {/* Section Content */}
            {activeSection === 'profile' && (
              <ProfileSection user={user} checkAuth={checkAuth} />
            )}
            {activeSection === 'theme' && (
              <ThemeSection 
                settings={settings} 
                updateSettings={updateSettings} 
                loading={saving}
              />
            )}
            {activeSection === 'notifications' && (
              <NotificationsSection 
                settings={settings} 
                updateSettings={updateSettings} 
                loading={saving}
              />
            )}
            {activeSection === 'security' && (
              <SecuritySection user={user} checkAuth={checkAuth} />
            )}
          </div>
        </div>
      </div>
    </LayoutComponent>
  );
};

export default UserSettingsPage;
