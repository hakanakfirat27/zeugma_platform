// frontend/src/pages/admin/SecuritySettingsSection.jsx
// Comprehensive Security Settings Section for Admin Settings Page

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, Key, Lock, Users, Clock, AlertTriangle, Check,
  RefreshCw, Settings, ChevronDown, ChevronRight, Eye, EyeOff,
  Info, Plus, Trash2, Copy, Hash, Timer, Ban, Activity,
  Smartphone, Laptop, Monitor, MapPin, LogIn, LogOut,
  AlertCircle, ShieldCheck, ShieldOff, KeyRound, Network,
  FileWarning, ClipboardList, Download, Filter, Search,
  MoreVertical, Edit2, Power, XCircle, Globe
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

// ============================================
// SECURITY SETTINGS SECTION
// ============================================
const SecuritySettingsSection = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('global');
  const [settings, setSettings] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, dashboardRes] = await Promise.all([
        api.get('/accounts/security/settings/'),
        api.get('/accounts/security/dashboard/')
      ]);
      setSettings(settingsRes.data);
      setDashboard(dashboardRes.data);
    } catch (error) {
      console.error('Error fetching security settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field, value) => {
    const oldValue = settings[field];
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaving(true);
    
    try {
      await api.patch('/accounts/security/settings/update/', { [field]: value });
      toast.success(`Updated ${field.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
      setSettings(prev => ({ ...prev, [field]: oldValue }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'global', name: 'Global Settings', icon: Settings },
    { id: 'sessions', name: 'Sessions', icon: Monitor },
    { id: 'api-keys', name: 'API Keys', icon: Key },
    { id: 'audit', name: 'Audit Logs', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      {/* Security Dashboard Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.users_with_2fa || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Users with 2FA</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.active_sessions || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Sessions</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.active_api_keys || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active API Keys</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.failed_logins_24h || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed Logins (24h)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'global' && (
        <GlobalSecuritySettings 
          settings={settings} 
          updateSetting={updateSetting}
          saving={saving}
          toast={toast}
        />
      )}
      {activeTab === 'sessions' && <SessionManagement toast={toast} />}
      {activeTab === 'api-keys' && <APIKeysManagement toast={toast} />}
      {activeTab === 'audit' && <AuditLogsSection toast={toast} />}
    </div>
  );
};

// ============================================
// GLOBAL SECURITY SETTINGS
// ============================================
const GlobalSecuritySettings = ({ settings, updateSetting, saving, toast }) => {
  const [expandedSection, setExpandedSection] = useState('2fa');
  
  // IP Lists state
  const [whitelist, setWhitelist] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [ipListsLoading, setIpListsLoading] = useState(false);
  const [showAddIPModal, setShowAddIPModal] = useState(null); // 'whitelist' or 'blacklist'
  const [newIP, setNewIP] = useState({ ip_address: '', description: '', reason: '' });
  const [deleteIPConfirm, setDeleteIPConfirm] = useState(null); // { listType: 'whitelist'|'blacklist', ip: {...} }
  const [deletingIP, setDeletingIP] = useState(false);

  // Fetch IP lists when Login Security section is expanded
  useEffect(() => {
    if (expandedSection === 'login') {
      fetchIPLists();
    }
  }, [expandedSection]);

  const fetchIPLists = async () => {
    try {
      setIpListsLoading(true);
      const [whitelistRes, blacklistRes] = await Promise.all([
        api.get('/accounts/security/ip-whitelist/'),
        api.get('/accounts/security/ip-blacklist/')
      ]);
      setWhitelist(whitelistRes.data);
      setBlacklist(blacklistRes.data);
    } catch (error) {
      console.error('Error fetching IP lists:', error);
    } finally {
      setIpListsLoading(false);
    }
  };

  const addToIPList = async (listType) => {
    if (!newIP.ip_address.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    try {
      const endpoint = listType === 'whitelist' 
        ? '/accounts/security/ip-whitelist/add/'
        : '/accounts/security/ip-blacklist/add/';
      
      const data = listType === 'whitelist'
        ? { ip_address: newIP.ip_address, description: newIP.description }
        : { ip_address: newIP.ip_address, reason: newIP.reason };

      await api.post(endpoint, data);
      toast.success(`IP added to ${listType}`);
      setShowAddIPModal(null);
      setNewIP({ ip_address: '', description: '', reason: '' });
      fetchIPLists();
    } catch (error) {
      console.error('Error adding IP:', error);
      toast.error(`Failed to add IP to ${listType}`);
    }
  };

  const removeFromIPList = async (listType, id) => {
    setDeletingIP(true);
    try {
      const endpoint = listType === 'whitelist'
        ? `/accounts/security/ip-whitelist/${id}/remove/`
        : `/accounts/security/ip-blacklist/${id}/remove/`;
      
      await api.delete(endpoint);
      toast.success(`IP removed from ${listType}`);
      setDeleteIPConfirm(null);
      fetchIPLists();
    } catch (error) {
      console.error('Error removing IP:', error);
      toast.error(`Failed to remove IP from ${listType}`);
    } finally {
      setDeletingIP(false);
    }
  };

  const sections = [
    {
      id: '2fa',
      title: 'Two-Factor Authentication',
      icon: ShieldCheck,
      color: 'green',
      description: 'Configure 2FA requirements for your organization'
    },
    {
      id: 'password',
      title: 'Password Policy',
      icon: Lock,
      color: 'blue',
      description: 'Set password requirements and expiration rules'
    },
    {
      id: 'session',
      title: 'Session Settings',
      icon: Clock,
      color: 'purple',
      description: 'Configure session timeout and concurrent sessions'
    },
    {
      id: 'login',
      title: 'Login Security',
      icon: AlertTriangle,
      color: 'orange',
      description: 'Failed login limits and account lockout'
    },
    {
      id: 'audit-settings',
      title: 'Audit Settings',
      icon: ClipboardList,
      color: 'gray',
      description: 'Configure what events to log'
    }
  ];

  const colorClasses = {
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    gray: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const Icon = section.icon;
        const colors = colorClasses[section.color];
        const isExpanded = expandedSection === section.id;

        return (
          <div
            key={section.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Section Header */}
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saving && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
                <div className="pt-5 space-y-4">
                  {section.id === '2fa' && (
                    <>
                      <ToggleSetting
                        label="Enforce 2FA at First Login"
                        description="Require all users to set up 2FA on first login (users can disable later in profile settings)"
                        value={settings?.enforce_2fa_first_login}
                        onChange={(v) => updateSetting('enforce_2fa_first_login', v)}
                      />
                      <ToggleSetting
                        label="Enable Email 2FA"
                        description="Allow users to receive verification codes via email"
                        value={settings?.email_2fa_enabled}
                        onChange={(v) => updateSetting('email_2fa_enabled', v)}
                      />
                      <NumberSetting
                        label="Backup Codes Count"
                        description="Number of one-time recovery codes to generate (used if user can't receive email)"
                        value={settings?.backup_codes_count}
                        onChange={(v) => updateSetting('backup_codes_count', v)}
                        min={3}
                        max={10}
                      />
                    </>
                  )}

                  {section.id === 'password' && (
                    <>
                      <NumberSetting
                        label="Minimum Password Length"
                        description="Minimum characters required"
                        value={settings?.min_password_length}
                        onChange={(v) => updateSetting('min_password_length', v)}
                        min={6}
                        max={32}
                      />
                      <ToggleSetting
                        label="Require Uppercase"
                        description="At least one uppercase letter"
                        value={settings?.require_uppercase}
                        onChange={(v) => updateSetting('require_uppercase', v)}
                      />
                      <ToggleSetting
                        label="Require Lowercase"
                        description="At least one lowercase letter"
                        value={settings?.require_lowercase}
                        onChange={(v) => updateSetting('require_lowercase', v)}
                      />
                      <ToggleSetting
                        label="Require Numbers"
                        description="At least one number"
                        value={settings?.require_numbers}
                        onChange={(v) => updateSetting('require_numbers', v)}
                      />
                      <ToggleSetting
                        label="Require Special Characters"
                        description="At least one special character (!@#$%...)"
                        value={settings?.require_special_chars}
                        onChange={(v) => updateSetting('require_special_chars', v)}
                      />
                      <NumberSetting
                        label="Password Expiry (Days)"
                        description="Days until password expires (0 = never)"
                        value={settings?.password_expiry_days}
                        onChange={(v) => updateSetting('password_expiry_days', v)}
                        min={0}
                        max={365}
                      />
                      <NumberSetting
                        label="Password History"
                        description="Number of previous passwords to remember"
                        value={settings?.password_history_count}
                        onChange={(v) => updateSetting('password_history_count', v)}
                        min={0}
                        max={24}
                      />
                    </>
                  )}

                  {section.id === 'session' && (
                    <>
                      <NumberSetting
                        label="Session Timeout (Minutes)"
                        description="Inactivity timeout (0 = no timeout)"
                        value={settings?.session_timeout_minutes}
                        onChange={(v) => updateSetting('session_timeout_minutes', v)}
                        min={0}
                        max={480}
                      />
                      <NumberSetting
                        label="Max Concurrent Sessions"
                        description="Maximum sessions per user (0 = unlimited)"
                        value={settings?.max_concurrent_sessions}
                        onChange={(v) => updateSetting('max_concurrent_sessions', v)}
                        min={0}
                        max={10}
                      />
                      <ToggleSetting
                        label="Single Session Mode"
                        description="Allow only one active session per user"
                        value={settings?.single_session_mode}
                        onChange={(v) => updateSetting('single_session_mode', v)}
                      />
                    </>
                  )}

                  {section.id === 'login' && (
                    <>
                      <NumberSetting
                        label="Max Failed Attempts"
                        description="Failed attempts before lockout"
                        value={settings?.max_failed_attempts}
                        onChange={(v) => updateSetting('max_failed_attempts', v)}
                        min={3}
                        max={20}
                      />
                      <NumberSetting
                        label="Lockout Duration (Minutes)"
                        description="Account lockout duration"
                        value={settings?.lockout_duration_minutes}
                        onChange={(v) => updateSetting('lockout_duration_minutes', v)}
                        min={5}
                        max={120}
                      />
                      
                      {/* IP Whitelist Section */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <ToggleSetting
                            label="Enable IP Whitelist"
                            description="Only allow logins from whitelisted IPs"
                            value={settings?.enable_ip_whitelist}
                            onChange={(v) => updateSetting('enable_ip_whitelist', v)}
                          />
                        </div>
                        
                        {settings?.enable_ip_whitelist && (
                          <div className="ml-0 mt-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800 dark:text-green-300">Whitelisted IPs</span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-300 rounded-full">
                                  {whitelist.length}
                                </span>
                              </div>
                              <button
                                onClick={() => setShowAddIPModal('whitelist')}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 rounded-lg hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Add IP
                              </button>
                            </div>
                            
                            {ipListsLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
                              </div>
                            ) : whitelist.length === 0 ? (
                              <p className="text-xs text-green-700 dark:text-green-400 text-center py-2">
                                No IPs whitelisted. Add your current IP to avoid being locked out.
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {whitelist.map((ip) => (
                                  <div key={ip.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                                    <div>
                                      <p className="font-mono text-sm text-gray-900 dark:text-white">{ip.ip_address}</p>
                                      {ip.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{ip.description}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setDeleteIPConfirm({ listType: 'whitelist', ip })}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Remove IP"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* IP Blacklist Section */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <ToggleSetting
                            label="Enable IP Blacklist"
                            description="Block logins from blacklisted IPs"
                            value={settings?.enable_ip_blacklist}
                            onChange={(v) => updateSetting('enable_ip_blacklist', v)}
                          />
                        </div>
                        
                        {settings?.enable_ip_blacklist && (
                          <div className="ml-0 mt-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Ban className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800 dark:text-red-300">Blacklisted IPs</span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-300 rounded-full">
                                  {blacklist.length}
                                </span>
                              </div>
                              <button
                                onClick={() => setShowAddIPModal('blacklist')}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-800 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Add IP
                              </button>
                            </div>
                            
                            {ipListsLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                              </div>
                            ) : blacklist.length === 0 ? (
                              <p className="text-xs text-red-700 dark:text-red-400 text-center py-2">
                                No IPs blacklisted.
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {blacklist.map((ip) => (
                                  <div key={ip.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                                    <div>
                                      <p className="font-mono text-sm text-gray-900 dark:text-white">{ip.ip_address}</p>
                                      {ip.reason && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{ip.reason}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setDeleteIPConfirm({ listType: 'blacklist', ip })}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Remove IP"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {section.id === 'audit-settings' && (
                    <>
                      <ToggleSetting
                        label="Log All Logins"
                        description="Record all successful login attempts"
                        value={settings?.log_all_logins}
                        onChange={(v) => updateSetting('log_all_logins', v)}
                      />
                      <ToggleSetting
                        label="Log Failed Logins"
                        description="Record all failed login attempts"
                        value={settings?.log_failed_logins}
                        onChange={(v) => updateSetting('log_failed_logins', v)}
                      />
                      <ToggleSetting
                        label="Log Admin Actions"
                        description="Record administrative actions"
                        value={settings?.log_admin_actions}
                        onChange={(v) => updateSetting('log_admin_actions', v)}
                      />
                      <NumberSetting
                        label="Audit Log Retention (Days)"
                        description="Days to keep audit logs (0 = keep forever)"
                        value={settings?.audit_retention_days}
                        onChange={(v) => updateSetting('audit_retention_days', v)}
                        min={0}
                        max={365}
                      />
                      <AuditCleanupSection retentionDays={settings?.audit_retention_days} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add IP Modal */}
      {showAddIPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {showAddIPModal === 'whitelist' ? (
                  <><Check className="w-5 h-5 text-green-500" /> Add to Whitelist</>
                ) : (
                  <><Ban className="w-5 h-5 text-red-500" /> Add to Blacklist</>
                )}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IP Address
                </label>
                <input
                  type="text"
                  value={newIP.ip_address}
                  onChange={(e) => setNewIP({ ...newIP, ip_address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 192.168.1.1 or 192.168.1.0/24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {showAddIPModal === 'whitelist' ? 'Description' : 'Reason'}
                </label>
                <input
                  type="text"
                  value={showAddIPModal === 'whitelist' ? newIP.description : newIP.reason}
                  onChange={(e) => setNewIP({ 
                    ...newIP, 
                    [showAddIPModal === 'whitelist' ? 'description' : 'reason']: e.target.value 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={showAddIPModal === 'whitelist' ? 'e.g., Office IP' : 'e.g., Suspicious activity'}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddIPModal(null);
                  setNewIP({ ip_address: '', description: '', reason: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => addToIPList(showAddIPModal)}
                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  showAddIPModal === 'whitelist' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add to {showAddIPModal === 'whitelist' ? 'Whitelist' : 'Blacklist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete IP Confirmation Modal */}
      {deleteIPConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Remove IP Address
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to remove this IP address from the {deleteIPConfirm.listType}?
              </p>
              
              <div className={`p-4 rounded-lg border ${
                deleteIPConfirm.listType === 'whitelist'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {deleteIPConfirm.listType === 'whitelist' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Ban className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    deleteIPConfirm.listType === 'whitelist'
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {deleteIPConfirm.listType === 'whitelist' ? 'Whitelisted IP' : 'Blacklisted IP'}
                  </span>
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {deleteIPConfirm.ip.ip_address}
                </p>
                {(deleteIPConfirm.ip.description || deleteIPConfirm.ip.reason) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {deleteIPConfirm.ip.description || deleteIPConfirm.ip.reason}
                  </p>
                )}
              </div>

              {deleteIPConfirm.listType === 'whitelist' && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warning: Removing this IP may block access for users from this address.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setDeleteIPConfirm(null)}
                disabled={deletingIP}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => removeFromIPList(deleteIPConfirm.listType, deleteIPConfirm.ip.id)}
                disabled={deletingIP}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deletingIP ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove IP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SESSION MANAGEMENT
// ============================================
const SessionManagement = ({ toast }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(null); // session to terminate

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/security/sessions/all/');
      setSessions(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionKey) => {
    setTerminating(sessionKey);
    try {
      await api.post(`/accounts/security/sessions/admin/${sessionKey}/terminate/`);
      toast.success('Session terminated successfully');
      setShowTerminateModal(null);
      fetchSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast.error('Failed to terminate session');
    } finally {
      setTerminating(null);
    }
  };

  const cleanupStaleSessions = async () => {
    setCleaningUp(true);
    try {
      const response = await api.post('/accounts/security/sessions/cleanup-stale/');
      if (response.data.stale_sessions_removed > 0) {
        toast.success(response.data.message);
        fetchSessions();
      } else {
        toast.info('No stale sessions found');
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      toast.error('Failed to clean up sessions');
    } finally {
      setCleaningUp(false);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Monitor;
      default: return Laptop;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View and manage all active user sessions across the platform.
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <strong>Current</strong> = Your active session
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <strong>Active</strong> = Other user/browser session
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <strong>Expired</strong> = Session timed out
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cleanupStaleSessions}
            disabled={cleaningUp}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50"
            title="Remove orphaned sessions that no longer have valid Django sessions"
          >
            {cleaningUp ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clean Stale
          </button>
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <Monitor className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No active sessions found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.device_type);
                  return (
                    <tr key={session.session_key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {(session.user_name || session.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {session.user_name || session.username || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              @{session.username || 'unknown'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <DeviceIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {session.device_name || 'Unknown Device'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {session.browser || 'Unknown Browser'} • {session.os || 'Unknown OS'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{session.ip_address || 'N/A'}</span>
                        </div>
                        {session.location && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.location}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {session.time_since_activity || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {session.is_current ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" title="This is your current session">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Current
                          </span>
                        ) : session.is_expired ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" title="This session has expired">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" title="Active session from another browser/device">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setShowTerminateModal(session)}
                          disabled={terminating === session.session_key}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Terminate this session"
                        >
                          {terminating === session.session_key ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Terminate Session Confirmation Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Power className="w-5 h-5 text-red-500" />
                Terminate Session
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to terminate this session?
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {showTerminateModal.user_name || showTerminateModal.username}
                  </span>
                  <span className="text-xs text-gray-500">@{showTerminateModal.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {showTerminateModal.device_name || 'Unknown Device'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {showTerminateModal.ip_address || 'N/A'}
                  </span>
                </div>
              </div>

              {showTerminateModal.is_current && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warning: This is your current session. Terminating it will log you out.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowTerminateModal(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => terminateSession(showTerminateModal.session_key)}
                disabled={terminating === showTerminateModal.session_key}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {terminating === showTerminateModal.session_key ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Terminating...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Terminate Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// API KEYS MANAGEMENT
// ============================================
const APIKeysManagement = ({ toast }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', scopes: [] });

  const availableScopes = [
    { id: 'read:users', label: 'Read Users' },
    { id: 'write:users', label: 'Write Users' },
    { id: 'read:reports', label: 'Read Reports' },
    { id: 'write:reports', label: 'Write Reports' },
    { id: 'read:companies', label: 'Read Companies' },
    { id: 'write:companies', label: 'Write Companies' },
    { id: 'admin', label: 'Full Admin Access' },
  ];

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/security/api-keys/all/');
      setApiKeys(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/accounts/security/api-keys/create/', formData);
      setNewKey(response.data.key);
      toast.success('API key created successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/accounts/security/api-keys/${keyId}/revoke/`);
      toast.success('API key revoked');
      fetchApiKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage API keys for programmatic access to the platform.
        </p>
        <button
          onClick={() => {
            setFormData({ name: '', scopes: [] });
            setNewKey(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No API keys found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first API key to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    key.is_valid 
                      ? 'bg-purple-100 dark:bg-purple-900/30' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <KeyRound className={`w-5 h-5 ${
                      key.is_valid 
                        ? 'text-purple-600 dark:text-purple-400' 
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{key.name}</p>
                      {!key.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                        {key.masked_key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key_prefix)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Copy prefix"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Created by {key.created_by_name}</span>
                      {key.last_used_at && (
                        <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                      <span>{key.usage_count} uses</span>
                    </div>
                    {key.scopes && key.scopes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => revokeApiKey(key.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Revoke key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {newKey ? 'API Key Created' : 'Create API Key'}
              </h3>
            </div>
            <div className="p-6">
              {newKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                      Your API key has been created. Copy it now - you won't be able to see it again!
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all">
                    {newKey}
                  </div>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy API Key
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Production API Key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableScopes.map((scope) => (
                        <label
                          key={scope.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.scopes.includes(scope.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, scopes: [...formData.scopes, scope.id] });
                              } else {
                                setFormData({ ...formData, scopes: formData.scopes.filter(s => s !== scope.id) });
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{scope.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                {newKey ? 'Done' : 'Cancel'}
              </button>
              {!newKey && (
                <button
                  onClick={createApiKey}
                  disabled={creating || !formData.name.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Key
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// AUDIT LOGS SECTION
// ============================================
const AuditLogsSection = ({ toast }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    event_type: '',
    severity: '',
    date_from: '',
    date_to: ''
  });
  const [eventTypes, setEventTypes] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchEventTypes();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, page]);

  const fetchEventTypes = async () => {
    try {
      const response = await api.get('/accounts/security/audit-logs/event-types/');
      setEventTypes(response.data.event_types || []);
      setSeverityLevels(response.data.severity_levels || []);
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      if (filters.event_type) params.append('event_type', filters.event_type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await api.get(`/accounts/security/audit-logs/?${params.toString()}`);
      setLogs(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    }
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes('login')) return LogIn;
    if (eventType.includes('logout')) return LogOut;
    if (eventType.includes('2fa')) return ShieldCheck;
    if (eventType.includes('password')) return Lock;
    if (eventType.includes('session')) return Monitor;
    if (eventType.includes('api_key')) return Key;
    if (eventType.includes('user')) return Users;
    if (eventType.includes('ip')) return Network;
    return Activity;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Event Type</label>
            <select
              value={filters.event_type}
              onChange={(e) => {
                setFilters({ ...filters, event_type: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => {
                setFilters({ ...filters, severity: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {severityLevels.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => {
                setFilters({ ...filters, date_from: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => {
                setFilters({ ...filters, date_to: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ event_type: '', severity: '', date_from: '', date_to: '' });
                setPage(1);
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {logs.map((log) => {
              const EventIcon = getEventIcon(log.event_type);
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <EventIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {log.event_type_display}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity_display}
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {log.user_name && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {log.user_name}
                          </span>
                        )}
                        {log.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {log.ip_address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= totalCount}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================
// REUSABLE SETTING COMPONENTS
// ============================================
const ToggleSetting = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
    <div className="pr-8">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`flex-shrink-0 w-12 h-7 rounded-full transition-colors ${
        value ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
        value ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  </div>
);

// ============================================
// AUDIT CLEANUP SECTION
// ============================================
const AuditCleanupSection = ({ retentionDays }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/security/audit-logs/cleanup/preview/');
      setPreview(response.data);
    } catch (error) {
      console.error('Error fetching cleanup preview:', error);
      toast.error('Failed to fetch cleanup preview');
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    try {
      setLoading(true);
      const response = await api.post('/accounts/security/audit-logs/cleanup/run/');
      toast.success(response.data.message);
      setPreview(null);
      setShowConfirm(false);
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Failed to run cleanup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Manual Cleanup</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Delete audit logs older than {retentionDays || 0} days
          </p>
        </div>
        <button
          onClick={() => {
            fetchPreview();
            setShowConfirm(true);
          }}
          disabled={loading || retentionDays === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Run Cleanup
        </button>
      </div>

      {retentionDays === 0 && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Retention is set to 0 (keep forever). Set a retention period to enable cleanup.
        </p>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Confirm Cleanup
              </h3>
            </div>
            <div className="p-6">
              {loading && !preview ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will permanently delete records older than <strong>{preview.retention_days} days</strong>.
                  </p>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Records to be deleted:</p>
                    <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                      <li className="flex justify-between">
                        <span>Audit Logs:</span>
                        <span className="font-mono">{preview.audit_logs_count.toLocaleString()}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Failed Login Attempts:</span>
                        <span className="font-mono">{preview.failed_logins_count.toLocaleString()}</span>
                      </li>
                      <li className="flex justify-between border-t border-red-200 dark:border-red-700 pt-1 mt-1 font-medium">
                        <span>Total:</span>
                        <span className="font-mono">{preview.total_count.toLocaleString()}</span>
                      </li>
                    </ul>
                  </div>

                  {preview.total_count === 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      No records to delete. Everything is within the retention period.
                    </p>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cutoff date: {new Date(preview.cutoff_date).toLocaleDateString()}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPreview(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runCleanup}
                disabled={loading || !preview || preview.total_count === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete {preview?.total_count?.toLocaleString() || 0} Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NumberSetting = ({ label, description, value, onChange, min, max }) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef(null);

  // Sync local value when prop changes (e.g., initial load)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced save - only triggers API call after 500ms of no changes
  const debouncedOnChange = useCallback((newValue) => {
    setLocalValue(newValue);
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout - save after 500ms
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 750);
  }, [onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
        <input
          type="number"
          value={localValue}
          onChange={(e) => debouncedOnChange(parseInt(e.target.value) || 0)}
          min={min}
          max={max}
          className="w-20 px-3 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <input
        type="range"
        value={localValue}
        onChange={(e) => debouncedOnChange(parseInt(e.target.value))}
        min={min}
        max={max}
        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
};

export default SecuritySettingsSection;
