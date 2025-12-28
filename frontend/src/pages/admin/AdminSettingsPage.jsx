// frontend/src/pages/admin/AdminSettingsPage.jsx
// Admin Settings Hub with sidebar navigation for all settings sections

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Settings, Bell, Shield, Database, Mail,
  Users, CreditCard, FileText, ChevronRight, Search,
  Check, RefreshCw, AlertCircle, ChevronDown,
  Webhook, Server,
  Zap, Clock, Megaphone, MessageSquare,
  Volume2, VolumeX, Send, Clock3,
  XCircle, Info, Smartphone, Laptop, Trash2,
  BellRing, BellOff, Activity, CheckCircle,
  Plus, Copy, Download, UserCog
} from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';
import SecuritySettingsSection from './SecuritySettingsSection';
import EmailTemplatesSection from './EmailTemplatesSection';
import IntegrationsSection from './IntegrationsSection';
import SystemSettingsSection from './SystemSettingsSection';

// ============================================
// ICON MAPPING FOR NOTIFICATION TYPES
// ============================================
const notificationIcons = {
  'file-text': FileText,
  'credit-card': CreditCard,
  'message-square': MessageSquare,
  'megaphone': Megaphone,
  'settings': Settings,
  'database': Database,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'bell': Bell,
};

const getNotificationIcon = (iconName) => {
  return notificationIcons[iconName] || Bell;
};

const colorClasses = {
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
};

// ============================================
// SETTINGS SECTIONS CONFIGURATION
// ============================================
const settingsSections = [
  { 
    id: 'notifications', 
    name: 'Notifications', 
    icon: Bell, 
    description: 'Email alerts, push notifications, preferences',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    keywords: ['email', 'push', 'in-app', 'inapp', 'alert', 'sound', 'daily summary', 'browser', 'subscribe', 'bell', 'notify', 'message']
  },
  { 
    id: 'security', 
    name: 'Security', 
    icon: Shield, 
    description: 'Two-factor auth, session management, API keys',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    keywords: ['2fa', 'two-factor', 'password', 'session', 'api key', 'authentication', 'login', 'protect']
  },
  { 
    id: 'email', 
    name: 'Email Templates', 
    icon: Mail, 
    description: 'Customize email templates and branding',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    keywords: ['template', 'branding', 'logo', 'footer', 'header', 'design', 'mail']
  },
  { 
    id: 'integrations', 
    name: 'Integrations', 
    icon: Webhook, 
    description: 'Slack, webhooks, Google Analytics',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    keywords: ['webhook', 'api', 'third-party', 'connect', 'external', 'service', 'integration', 'slack', 'google analytics', 'ga']
  },
  { 
    id: 'system', 
    name: 'System', 
    icon: Server, 
    description: 'Database, cache, performance settings',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    keywords: ['database', 'cache', 'performance', 'server', 'memory', 'storage', 'backup', 'maintenance', 'health']
  },
];

// ============================================
// NOTIFICATION SETTINGS SECTION COMPONENT
// ============================================
const NotificationSettingsSection = () => {
  const toast = useToast();
  const [globalSettings, setGlobalSettings] = useState(null);
  const [typeConfigs, setTypeConfigs] = useState([]);
  const [choices, setChoices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('global');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, configsRes, choicesRes] = await Promise.all([
        api.get('/dashboard/api/admin/notification-settings/'),
        api.get('/dashboard/api/admin/notification-type-configs/'),
        api.get('/dashboard/api/admin/notification-choices/')
      ]);
      setGlobalSettings(settingsRes.data);
      setTypeConfigs(configsRes.data);
      setChoices(choicesRes.data);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateGlobalSetting = async (field, value) => {
    setGlobalSettings(prev => ({ ...prev, [field]: value }));
    setSaving(true);
    try {
      await api.patch('/dashboard/api/admin/notification-settings/update/', { [field]: value });
      toast.success(`Updated ${field.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const updateTypeConfig = async (notificationType, field, value) => {
    setTypeConfigs(prev => prev.map(c => 
      c.notification_type === notificationType ? { ...c, [field]: value } : c
    ));
    try {
      await api.patch(`/dashboard/api/admin/notification-type-configs/${notificationType}/`, { [field]: value });
      toast.success(`Updated ${field.replace(/_/g, ' ')} for ${notificationType}`);
    } catch (error) {
      console.error('Error updating type config:', error);
      toast.error('Failed to update setting');
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'global'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Global Settings
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'types'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notification Types
        </button>
        <button
          onClick={() => setActiveTab('push')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'push'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Push Setup
        </button>
      </div>

      {/* Global Settings Tab */}
      {activeTab === 'global' && globalSettings && (
        <div className="space-y-6">
          {/* Master Switch */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  globalSettings.notifications_enabled 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Bell className={`w-6 h-6 ${
                    globalSettings.notifications_enabled 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Master Switch</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enable or disable all notifications platform-wide
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateGlobalSetting('notifications_enabled', !globalSettings.notifications_enabled)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  globalSettings.notifications_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform mx-1 ${
                  globalSettings.notifications_enabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Enable Email */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Email Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications via email</p>
                  </div>
                </div>
                <button
                  onClick={() => updateGlobalSetting('email_notifications_enabled', !globalSettings.email_notifications_enabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    globalSettings.email_notifications_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    globalSettings.email_notifications_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Email From Name */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={globalSettings.email_from_name || ''}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, email_from_name: e.target.value }))}
                  onBlur={(e) => updateGlobalSetting('email_from_name', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Zeugma Platform"
                />
              </div>

              {/* Reply-To Email */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reply-To Email
                </label>
                <input
                  type="email"
                  value={globalSettings.email_reply_to || ''}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, email_reply_to: e.target.value }))}
                  onBlur={(e) => updateGlobalSetting('email_reply_to', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="support@example.com"
                />
              </div>

              {/* Email Frequency */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Email Frequency
                </label>
                <div className="flex flex-wrap gap-2">
                  {choices?.email_frequencies.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => updateGlobalSetting('email_frequency', value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        globalSettings.email_frequency === value
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Footer */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Email Footer</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Add unsubscribe link to emails</p>
                  </div>
                </div>
                <button
                  onClick={() => updateGlobalSetting('include_email_footer', !globalSettings.include_email_footer)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    globalSettings.include_email_footer ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    globalSettings.include_email_footer ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* In-App Notification Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">In-App Notifications</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Enable In-App */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable In-App Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Show notifications in the app</p>
                  </div>
                </div>
                <button
                  onClick={() => updateGlobalSetting('inapp_notifications_enabled', !globalSettings.inapp_notifications_enabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    globalSettings.inapp_notifications_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    globalSettings.inapp_notifications_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {globalSettings.notification_sound_enabled ? (
                    <Volume2 className="w-5 h-5 text-gray-500" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notification Sound</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Play sound for new notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => updateGlobalSetting('notification_sound_enabled', !globalSettings.notification_sound_enabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    globalSettings.notification_sound_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    globalSettings.notification_sound_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Auto Dismiss */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto-dismiss after (seconds)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={globalSettings.auto_dismiss_seconds}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, auto_dismiss_seconds: parseInt(e.target.value) }))}
                    onMouseUp={(e) => updateGlobalSetting('auto_dismiss_seconds', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16 text-right">
                    {globalSettings.auto_dismiss_seconds === 0 ? 'Never' : `${globalSettings.auto_dismiss_seconds}s`}
                  </span>
                </div>
              </div>

              {/* Max Notifications */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Notifications in History
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={globalSettings.max_notifications_shown}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, max_notifications_shown: parseInt(e.target.value) }))}
                  onBlur={(e) => updateGlobalSetting('max_notifications_shown', parseInt(e.target.value))}
                  className="w-32 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Push Notifications Settings - NEW SECTION */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Enable Push */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Push Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Send browser/device push notifications to users</p>
                  </div>
                </div>
                <button
                  onClick={() => updateGlobalSetting('push_notifications_enabled', !globalSettings.push_notifications_enabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    globalSettings.push_notifications_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    globalSettings.push_notifications_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Info box about push */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">About Push Notifications</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Push notifications allow users to receive alerts even when they're not actively using the platform. 
                      Users must subscribe to push notifications from their Profile Settings or the Push Setup tab. 
                      You can also enable/disable push per notification type in the "Notification Types" tab.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Clock3 className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Daily Summary</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Daily Summary</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Send daily summary email to staff</p>
                  </div>
                </div>
                <button
                  onClick={() => updateGlobalSetting('daily_summary_enabled', !globalSettings.daily_summary_enabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    globalSettings.daily_summary_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                    globalSettings.daily_summary_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Time (UTC)
                </label>
                <input
                  type="time"
                  value={globalSettings.daily_summary_time || '09:00'}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, daily_summary_time: e.target.value }))}
                  onBlur={(e) => updateGlobalSetting('daily_summary_time', e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* User Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Allow User Preferences</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Let users customize their own notification preferences
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateGlobalSetting('allow_user_preferences', !globalSettings.allow_user_preferences)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  globalSettings.allow_user_preferences ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform mx-1 ${
                  globalSettings.allow_user_preferences ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Last Updated */}
          {globalSettings.updated_at && (
            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <Info className="w-3 h-3" />
              Last updated: {new Date(globalSettings.updated_at).toLocaleString()}
              {globalSettings.updated_by_name && ` by ${globalSettings.updated_by_name}`}
            </div>
          )}
        </div>
      )}

      {/* Notification Types Tab */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure which channels are enabled for each notification type.
          </p>
          
          {typeConfigs.map((config) => {
            const IconComponent = getNotificationIcon(config.icon);
            const colors = colorClasses[config.color] || colorClasses.gray;
            
            return (
              <div
                key={config.notification_type}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {config.display_name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          config.is_active 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {config.description}
                      </p>
                      
                      {/* Channels */}
                      <div className="flex flex-wrap gap-3">
                        {/* Email Channel */}
                        <button
                          onClick={() => updateTypeConfig(config.notification_type, 'email_enabled', !config.email_enabled)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            config.email_enabled
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <Mail className="w-4 h-4" />
                          Email
                          {config.email_enabled && <Check className="w-3 h-3" />}
                        </button>
                        
                        {/* In-App Channel */}
                        <button
                          onClick={() => updateTypeConfig(config.notification_type, 'inapp_enabled', !config.inapp_enabled)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            config.inapp_enabled
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <Bell className="w-4 h-4" />
                          In-App
                          {config.inapp_enabled && <Check className="w-3 h-3" />}
                        </button>
                        
                        {/* Push Channel */}
                        <button
                          onClick={() => updateTypeConfig(config.notification_type, 'push_enabled', !config.push_enabled)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            config.push_enabled
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <Megaphone className="w-4 h-4" />
                          Push
                          {config.push_enabled && <Check className="w-3 h-3" />}
                        </button>
                      </div>
                      
                      {/* Target Roles */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Recipients:</span>
                        {config.target_roles?.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Active Toggle */}
                    <button
                      onClick={() => updateTypeConfig(config.notification_type, 'is_active', !config.is_active)}
                      className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                        config.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                        config.is_active ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Push Setup Tab */}
      {activeTab === 'push' && (
        <PushSetupTab toast={toast} />
      )}
    </div>
  );
};

// ============================================
// PUSH SETUP TAB COMPONENT
// ============================================
const PushSetupTab = ({ toast }) => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    getSubscriptions,
    deleteSubscription
  } = usePushNotifications();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const subs = await getSubscriptions();
      setSubscriptions(subs || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Subscribe button clicked');
    
    if (subscribing) {
      console.log('Already subscribing, ignoring click');
      return;
    }
    
    setSubscribing(true);
    try {
      console.log('Calling subscribe...');
      await subscribe();
      toast.success('Successfully subscribed to push notifications!');
      loadSubscriptions();
    } catch (err) {
      console.error('Subscribe error:', err);
      toast.error(err.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Unsubscribe button clicked');
    
    try {
      await unsubscribe();
      toast.success('Unsubscribed from push notifications');
      loadSubscriptions();
    } catch (err) {
      console.error('Unsubscribe error:', err);
      toast.error(err.message || 'Failed to unsubscribe');
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Send test button clicked');
    
    if (sendingTest) {
      console.log('Already sending, ignoring click');
      return;
    }
    
    setSendingTest(true);
    try {
      console.log('Sending test notification...');
      await sendTestNotification();
      toast.success('Test notification sent! Check your notifications.');
    } catch (err) {
      console.error('Send test error:', err);
      toast.error(err.message || 'Failed to send test notification');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteSubscription = async (id) => {
    try {
      await deleteSubscription(id);
      toast.success('Subscription removed');
      loadSubscriptions();
    } catch (err) {
      toast.error('Failed to remove subscription');
    }
  };

  const getDeviceIcon = (deviceName) => {
    const name = (deviceName || '').toLowerCase();
    if (name.includes('mobile') || name.includes('android') || name.includes('iphone')) {
      return Smartphone;
    }
    return Laptop;
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Granted' };
      case 'denied':
        return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Denied' };
      default:
        return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Not Set' };
    }
  };

  const permissionStatus = getPermissionStatus();

  return (
    <div className="space-y-6">
      {/* Browser Support Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isSupported ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {isSupported ? (
                <BellRing className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <BellOff className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Push Notification Support</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isSupported 
                  ? 'Your browser supports push notifications' 
                  : 'Push notifications are not supported in this browser'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isSupported 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {isSupported ? 'Supported' : 'Not Supported'}
          </span>
        </div>

        {isSupported && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Permission Status */}
            <div className={`p-4 rounded-xl ${permissionStatus.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className={`w-4 h-4 ${permissionStatus.color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Permission</span>
              </div>
              <p className={`text-lg font-semibold ${permissionStatus.color}`}>{permissionStatus.label}</p>
            </div>

            {/* Subscription Status */}
            <div className={`p-4 rounded-xl ${
              isSubscribed 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-gray-100 dark:bg-gray-700/50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Bell className={`w-4 h-4 ${isSubscribed ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">This Device</span>
              </div>
              <p className={`text-lg font-semibold ${
                isSubscribed ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
              </p>
            </div>

            {/* Active Subscriptions Count */}
            <div className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">All Devices</span>
              </div>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {subscriptions.length} Active
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {isSupported && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {!isSubscribed ? (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={subscribing || permission === 'denied'}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors cursor-pointer"
              >
                {subscribing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                Enable Push Notifications
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                Disable Push Notifications
              </button>
            )}

            <button
              type="button"
              onClick={handleSendTest}
              disabled={!isSubscribed || sendingTest}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors cursor-pointer"
            >
              {sendingTest ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Test Notification
            </button>

            <button
              type="button"
              onClick={loadSubscriptions}
              disabled={loadingSubscriptions}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSubscriptions ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {permission === 'denied' && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Permission Denied</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    You've blocked push notifications. To enable them, click the lock icon in your browser's address bar and allow notifications for this site.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscribed Devices */}
      {isSupported && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Subscribed Devices</h3>
              </div>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                {subscriptions.length} device{subscriptions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {loadingSubscriptions ? (
            <div className="p-8 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No devices subscribed</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Enable push notifications to receive alerts on this device
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {subscriptions.map((sub) => {
                const DeviceIcon = getDeviceIcon(sub.device_name);
                return (
                  <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <DeviceIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {sub.device_name || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Added {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove device"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Setup Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">How Push Notifications Work</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>Push notifications allow you to receive alerts even when the app is closed or you're on a different tab.</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Notifications are sent to all your subscribed devices</li>
            <li>You can subscribe from multiple browsers/devices</li>
            <li>Each notification type can be configured in the "Notification Types" tab</li>
            <li>Push notifications require browser permission to work</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMING SOON PLACEHOLDER
// ============================================
const ComingSoonSection = ({ section }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className={`w-20 h-20 rounded-2xl ${section.bgColor} flex items-center justify-center mb-6`}>
      <section.icon className={`w-10 h-10 ${section.color}`} />
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{section.name}</h3>
    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">{section.description}</p>
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
      <Clock className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Coming Soon</span>
    </div>
  </div>
);

// ============================================
// MAIN ADMIN SETTINGS PAGE
// ============================================
const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get active section from URL or default to 'notifications'
  const activeSection = searchParams.get('section') || 'notifications';
  
  const setActiveSection = (section) => {
    setSearchParams({ section });
  };

  // Filter sections based on search query
  const filteredSections = settingsSections.filter(section => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.name.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.id.toLowerCase().includes(query) ||
      (section.keywords && section.keywords.some(keyword => keyword.toLowerCase().includes(query)))
    );
  });

  const currentSection = settingsSections.find(s => s.id === activeSection) || settingsSections[0];

  return (
    <DashboardLayout 
      pageTitle="Settings"
      pageSubtitleBottom="Manage platform settings and configurations"
    >
      <div className="flex h-[calc(100vh-73px)]">
        {/* Settings Sidebar - Stunning Design */}
        <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Sidebar Header with Search */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3">
            <div className="space-y-1">
              {filteredSections.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No settings found</p>
                </div>
              ) : (
                filteredSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left relative overflow-hidden group ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/20 shadow-sm border border-purple-100 dark:border-purple-800/50'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                    }`}
                  >
                    {/* Icon Container */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      isActive 
                        ? `${section.bgColor} shadow-sm`
                        : 'bg-gray-100 dark:bg-gray-700 group-hover:scale-105'
                    }`}>
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? section.color : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold transition-colors ${
                          isActive 
                            ? 'text-purple-700 dark:text-purple-300' 
                            : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                        }`}>
                          {section.name}
                        </span>
                        {section.comingSoon && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 leading-snug transition-colors ${
                        isActive 
                          ? 'text-purple-600/70 dark:text-purple-400/70' 
                          : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {section.description}
                      </p>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <ChevronRight className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      </div>
                    )}

                    {/* Subtle gradient overlay for active state */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
                    )}
                  </button>
                );
              })
            )}
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            {/* Section Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-12 h-12 rounded-xl ${currentSection.bgColor} flex items-center justify-center shadow-sm`}>
                  <currentSection.icon className={`w-6 h-6 ${currentSection.color}`} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentSection.name}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{currentSection.description}</p>
                </div>
              </div>
            </div>

            {/* Section Content */}
            {activeSection === 'notifications' && <NotificationSettingsSection />}
            {activeSection === 'security' && <SecuritySettingsSection />}
            {activeSection === 'email' && <EmailTemplatesSection />}
            {activeSection === 'integrations' && <IntegrationsSection />}
            {activeSection === 'system' && <SystemSettingsSection />}
            {activeSection !== 'notifications' && activeSection !== 'security' && activeSection !== 'email' && activeSection !== 'integrations' && activeSection !== 'system' && (
              <ComingSoonSection section={currentSection} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettingsPage;
