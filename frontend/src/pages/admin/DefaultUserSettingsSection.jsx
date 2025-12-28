// frontend/src/pages/admin/DefaultUserSettingsSection.jsx
// Admin component for managing default settings per user role

import { useState, useEffect } from 'react';
import {
  Users, RefreshCw, ChevronDown, Check, Sun, Moon, Monitor,
  Palette, Bell, Mail, BellRing, Info, Sidebar,
  AlertCircle, Send, Zap
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import api from '../../utils/api';

const DefaultUserSettingsSection = () => {
  const toast = useToast();
  const [defaults, setDefaults] = useState([]);
  const [choices, setChoices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [expandedRole, setExpandedRole] = useState(null);
  const [applyingToAll, setApplyingToAll] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [defaultsRes, choicesRes] = await Promise.all([
        api.get('/accounts/admin/default-settings/'),
        api.get('/accounts/user/settings/choices/')
      ]);
      setDefaults(defaultsRes.data);
      setChoices(choicesRes.data);
    } catch (error) {
      console.error('Error fetching default settings:', error);
      toast.error('Failed to load default settings');
    } finally {
      setLoading(false);
    }
  };

  const updateDefault = async (role, field, value) => {
    // Optimistic update
    setDefaults(prev => prev.map(d => 
      d.role === role ? { ...d, [field]: value } : d
    ));

    setSaving(prev => ({ ...prev, [role]: true }));
    try {
      await api.patch(`/accounts/admin/default-settings/${role}/`, {
        [field]: value
      });
      toast.success(`Updated default ${field.replace(/_/g, ' ')} for ${role.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating default:', error);
      toast.error('Failed to update default setting');
      // Revert on error
      fetchData();
    } finally {
      setSaving(prev => ({ ...prev, [role]: false }));
    }
  };

  const applyToAllUsers = async (role) => {
    if (!window.confirm(`Apply default settings to ALL ${role.replace('_', ' ')} users? This will overwrite their current settings.`)) {
      return;
    }

    setApplyingToAll(prev => ({ ...prev, [role]: true }));
    try {
      const response = await api.post(`/accounts/admin/default-settings/${role}/apply-all/`);
      toast.success(`Applied defaults to ${response.data.users_updated} users`);
    } catch (error) {
      console.error('Error applying defaults:', error);
      toast.error('Failed to apply defaults to users');
    } finally {
      setApplyingToAll(prev => ({ ...prev, [role]: false }));
    }
  };

  const getRoleConfig = (role) => {
    const configs = {
      CLIENT: { 
        icon: Users, 
        color: 'text-purple-600', 
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        label: 'Client',
        description: 'External users who access reports and data'
      },
      DATA_COLLECTOR: { 
        icon: Users, 
        color: 'text-blue-600', 
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        label: 'Data Collector',
        description: 'Users who gather and input data'
      },
      GUEST: { 
        icon: Users, 
        color: 'text-green-600', 
        bg: 'bg-green-100 dark:bg-green-900/30',
        label: 'Guest',
        description: 'Limited access users'
      },
      STAFF_ADMIN: { 
        icon: Users, 
        color: 'text-orange-600', 
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        label: 'Staff Admin',
        description: 'Administrative staff members'
      },
      SUPERADMIN: { 
        icon: Users, 
        color: 'text-red-600', 
        bg: 'bg-red-100 dark:bg-red-900/30',
        label: 'Super Admin',
        description: 'Full system access'
      },
    };
    return configs[role] || configs.CLIENT;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">About Default Settings</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Configure default theme mode and notification settings for each user role. 
              New users will inherit these settings when their account is created. 
              Users can customize their individual appearance settings (header/sidebar colors) from their personal Settings page.
              Use "Apply to All" to reset existing users to these defaults.
            </p>
          </div>
        </div>
      </div>

      {/* Role Cards */}
      <div className="space-y-4">
        {defaults.map((defaultSetting) => {
          const role = defaultSetting.role;
          const config = getRoleConfig(role);
          const isExpanded = expandedRole === role;
          const isSaving = saving[role];
          const isApplying = applyingToAll[role];
          const Icon = config.icon;

          return (
            <div 
              key={role}
              className={`rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${
                isExpanded 
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-300 dark:border-indigo-700' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedRole(isExpanded ? null : role)}
                className={`w-full p-5 flex items-center justify-between transition-colors ${
                  isExpanded 
                    ? 'bg-white/60 dark:bg-gray-800/60' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{config.label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
                  <div className="pt-5 space-y-8">
                    
                    {/* Theme Settings Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Palette className="w-4 h-4 text-indigo-500" />
                        Appearance Defaults
                      </h4>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Default Theme Mode */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                            Default Theme Mode
                          </label>
                          <div className="flex gap-2">
                            {choices?.theme_modes?.map((mode) => (
                              <button
                                key={mode.value}
                                onClick={() => updateDefault(role, 'default_theme_mode', mode.value)}
                                className={`flex-1 px-3 py-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                                  defaultSetting.default_theme_mode === mode.value
                                    ? 'border-indigo-500 bg-white dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300'
                                }`}
                              >
                                {mode.value === 'light' && <Sun className="w-4 h-4" />}
                                {mode.value === 'dark' && <Moon className="w-4 h-4" />}
                                {mode.value === 'system' && <Monitor className="w-4 h-4" />}
                                <span className="text-xs font-medium">{mode.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* UI Preferences */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-3">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            UI Preferences
                          </label>
                          
                          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Sidebar className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Sidebar Collapsed</span>
                            </div>
                            <button
                              onClick={() => updateDefault(role, 'default_sidebar_collapsed', !defaultSetting.default_sidebar_collapsed)}
                              className={`w-11 h-6 rounded-full transition-colors ${
                                defaultSetting.default_sidebar_collapsed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                                defaultSetting.default_sidebar_collapsed ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Animations</span>
                            </div>
                            <button
                              onClick={() => updateDefault(role, 'default_animation_enabled', !defaultSetting.default_animation_enabled)}
                              className={`w-11 h-6 rounded-full transition-colors ${
                                defaultSetting.default_animation_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                                defaultSetting.default_animation_enabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Info about header/sidebar colors */}
                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <Info className="w-3 h-3 inline mr-1" />
                          Header and sidebar colors are set to platform defaults (Indigo-Purple header, Dark sidebar). 
                          Users can customize these from their personal Settings page.
                        </p>
                      </div>
                    </div>

                    {/* Notification Defaults Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Bell className="w-4 h-4 text-indigo-500" />
                        Notification Defaults
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Email Notifications */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Notifications</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateDefault(role, 'default_email_notifications', !defaultSetting.default_email_notifications)}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              defaultSetting.default_email_notifications ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                              defaultSetting.default_email_notifications ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* Push Notifications */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                              <BellRing className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Push</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Notifications</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateDefault(role, 'default_push_notifications', !defaultSetting.default_push_notifications)}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              defaultSetting.default_push_notifications ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                              defaultSetting.default_push_notifications ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* In-App Notifications */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">In-App</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Notifications</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateDefault(role, 'default_inapp_notifications', !defaultSetting.default_inapp_notifications)}
                            className={`w-11 h-6 rounded-full transition-colors ${
                              defaultSetting.default_inapp_notifications ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                              defaultSetting.default_inapp_notifications ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Apply to All Users */}
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Apply to Existing Users</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Overwrite individual user settings with these defaults (theme mode and notifications only)
                          </p>
                        </div>
                        <button
                          onClick={() => applyToAllUsers(role)}
                          disabled={isApplying}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25"
                        >
                          {isApplying ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Apply to All {config.label}s
                        </button>
                      </div>
                    </div>

                    {/* Last Updated */}
                    {defaultSetting.updated_at && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2 pt-2">
                        <AlertCircle className="w-3 h-3" />
                        Last updated: {new Date(defaultSetting.updated_at).toLocaleString()}
                        {defaultSetting.updated_by_name && ` by ${defaultSetting.updated_by_name}`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DefaultUserSettingsSection;
