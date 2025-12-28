// frontend/src/pages/admin/IntegrationsSection.jsx
// Integrations settings section for Slack, Webhooks, and Google Analytics

import { useState, useEffect } from 'react';
import {
  Webhook, MessageSquare, BarChart3, RefreshCw, Check, X,
  Plus, Trash2, Edit2, Eye, EyeOff, Copy, TestTube, Power,
  ChevronDown, ChevronRight, ExternalLink, AlertCircle,
  CheckCircle, XCircle, Clock, Send, Settings, Filter,
  Hash, Globe, Shield, Zap, Activity, Info, HelpCircle,
  MoreVertical, Play, Pause, RotateCcw, History, Search
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

// ============================================
// SLACK INTEGRATION SECTION
// ============================================
const SlackIntegrationCard = () => {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/integrations/slack/');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching Slack settings:', error);
      toast.error('Failed to load Slack settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      setSaving(true);
      const response = await api.patch('/api/auth/integrations/slack/', updates);
      setSettings(response.data);
      toast.success('Slack settings updated');
    } catch (error) {
      console.error('Error updating Slack settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings?.webhook_url) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    try {
      setTesting(true);
      const response = await api.post('/api/auth/integrations/slack/test/', {
        webhook_url: settings.webhook_url
      });
      if (response.data.success) {
        toast.success('Connection test successful! Check your Slack channel.');
        fetchSettings(); // Refresh to get updated test status
      } else {
        toast.error(response.data.message || 'Connection test failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTesting(true);
      const response = await api.post('/api/auth/integrations/slack/send-test/');
      if (response.data.success) {
        toast.success('Test notification sent!');
      } else {
        toast.error(response.data.message || 'Failed to send test notification');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  const notificationEvents = [
    { key: 'notify_user_created', label: 'User Created', description: 'When a new user is created' },
    { key: 'notify_user_invited', label: 'User Invited', description: 'When a user is invited' },
    { key: 'notify_user_login', label: 'User Login', description: 'When a user logs in (high volume)', warning: true },
    { key: 'notify_report_published', label: 'Report Published', description: 'When a report is published' },
    { key: 'notify_report_updated', label: 'Report Updated', description: 'When a report is updated' },
    { key: 'notify_data_imported', label: 'Data Import Complete', description: 'When data import finishes' },
    { key: 'notify_data_import_failed', label: 'Data Import Failed', description: 'When data import fails' },
    { key: 'notify_security_alerts', label: 'Security Alerts', description: 'Failed logins, 2FA changes, etc.' },
    { key: 'notify_system_announcements', label: 'System Announcements', description: 'Platform announcements' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Slack</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications to your Slack workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings?.is_enabled && settings?.webhook_url && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Connected
              </span>
            )}
            <button
              onClick={() => updateSettings({ is_enabled: !settings?.is_enabled })}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings?.is_enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                settings?.is_enabled ? 'left-6' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook URL
          </label>
          <div className="relative">
            <input
              type={showWebhookUrl ? 'text' : 'password'}
              value={settings?.webhook_url || ''}
              onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
              onBlur={() => settings?.webhook_url && updateSettings({ webhook_url: settings.webhook_url })}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-2.5 pr-20 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showWebhookUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {settings?.webhook_url && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(settings.webhook_url);
                    toast.success('Copied to clipboard');
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Get your webhook URL from{' '}
            <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-600">
              Slack App Settings <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
        </div>

        {/* Bot Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bot Name
            </label>
            <input
              type="text"
              value={settings?.bot_name || ''}
              onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
              onBlur={() => updateSettings({ bot_name: settings?.bot_name })}
              placeholder="Zeugma Bot"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={settings?.channel_name || ''}
              onChange={(e) => setSettings({ ...settings, channel_name: e.target.value })}
              onBlur={() => updateSettings({ channel_name: settings?.channel_name })}
              placeholder="#general"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Notification Events */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Notification Events
          </button>
          
          {expanded && (
            <div className="space-y-2 pl-2">
              {notificationEvents.map((event) => (
                <label
                  key={event.key}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings?.[event.key] || false}
                      onChange={(e) => updateSettings({ [event.key]: e.target.checked })}
                      className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{event.label}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                    </div>
                  </div>
                  {event.warning && (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                      High Volume
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={testConnection}
            disabled={testing || !settings?.webhook_url}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Test Connection
          </button>
          <button
            onClick={sendTestNotification}
            disabled={testing || !settings?.is_enabled || !settings?.webhook_url}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            Send Test
          </button>
        </div>

        {/* Stats */}
        {settings?.notification_count > 0 && (
          <div className="flex items-center gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Total sent: {settings.notification_count}</span>
            {settings.last_notification_at && (
              <span>Last: {new Date(settings.last_notification_at).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// WEBHOOKS SECTION
// ============================================
const WebhooksSection = () => {
  const toast = useToast();
  const [webhooks, setWebhooks] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchWebhooks();
    fetchAvailableEvents();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/integrations/webhooks/');
      setWebhooks(response.data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      const response = await api.get('/api/auth/integrations/webhooks/available_events/');
      setAvailableEvents(response.data);
    } catch (error) {
      console.error('Error fetching available events:', error);
    }
  };

  const fetchLogs = async (webhookId) => {
    try {
      setLogsLoading(true);
      const response = await api.get(`/api/auth/integrations/webhooks/${webhookId}/logs/`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load delivery logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const deleteWebhook = async (id) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await api.delete(`/api/auth/integrations/webhooks/${id}/`);
      toast.success('Webhook deleted');
      fetchWebhooks();
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const testWebhook = async (id) => {
    try {
      const response = await api.post(`/api/auth/integrations/webhooks/${id}/test/`);
      if (response.data.success) {
        toast.success('Test webhook sent successfully!');
      } else {
        toast.error(response.data.message || 'Test failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Test failed');
    }
  };

  const toggleWebhook = async (webhook) => {
    try {
      await api.post(`/api/auth/integrations/webhooks/${webhook.id}/toggle_status/`);
      toast.success(webhook.is_active ? 'Webhook paused' : 'Webhook activated');
      fetchWebhooks();
    } catch (error) {
      toast.error('Failed to toggle webhook');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'paused': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Webhooks</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Send events to external URLs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Webhook className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No webhooks configured</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create a webhook to send platform events to external services
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    webhook.is_active ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Webhook className={`w-5 h-5 ${
                      webhook.is_active ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{webhook.name}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(webhook.status)}`}>
                        {webhook.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate max-w-md">
                      {webhook.url}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{webhook.events?.length || 0} events</span>
                      {webhook.success_rate !== null && (
                        <span className={webhook.success_rate >= 90 ? 'text-green-500' : webhook.success_rate >= 50 ? 'text-yellow-500' : 'text-red-500'}>
                          {webhook.success_rate}% success
                        </span>
                      )}
                      <span>{webhook.total_deliveries} deliveries</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testWebhook(webhook.id)}
                    className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Test webhook"
                  >
                    <TestTube className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWebhook(webhook);
                      fetchLogs(webhook.id);
                      setShowLogs(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="View logs"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleWebhook(webhook)}
                    className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                    title={webhook.is_active ? 'Pause' : 'Activate'}
                  >
                    {webhook.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingWebhook(webhook)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWebhook) && (
        <WebhookModal
          webhook={editingWebhook}
          availableEvents={availableEvents}
          onClose={() => {
            setShowCreateModal(false);
            setEditingWebhook(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingWebhook(null);
            fetchWebhooks();
          }}
        />
      )}

      {/* Logs Modal */}
      {showLogs && selectedWebhook && (
        <WebhookLogsModal
          webhook={selectedWebhook}
          logs={logs}
          loading={logsLoading}
          onClose={() => {
            setShowLogs(false);
            setSelectedWebhook(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================
// WEBHOOK CREATE/EDIT MODAL
// ============================================
const WebhookModal = ({ webhook, availableEvents, onClose, onSave }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: webhook?.name || '',
    description: webhook?.description || '',
    url: webhook?.url || '',
    events: webhook?.events || [],
    is_active: webhook?.is_active ?? true,
    timeout_seconds: webhook?.timeout_seconds || 30,
    max_retries: webhook?.max_retries || 3,
  });
  const [showSecret, setShowSecret] = useState(false);

  // Group events by category
  const eventsByCategory = availableEvents.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Please fill in all required fields and select at least one event');
      return;
    }

    try {
      setSaving(true);
      if (webhook) {
        await api.patch(`/api/auth/integrations/webhooks/${webhook.id}/`, formData);
        toast.success('Webhook updated');
      } else {
        await api.post('/api/auth/integrations/webhooks/', formData);
        toast.success('Webhook created');
      }
      onSave();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error(error.response?.data?.message || 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (eventValue) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const toggleCategory = (category) => {
    const categoryEvents = eventsByCategory[category].map(e => e.value);
    const allSelected = categoryEvents.every(e => formData.events.includes(e));
    
    setFormData(prev => ({
      ...prev,
      events: allSelected
        ? prev.events.filter(e => !categoryEvents.includes(e))
        : [...new Set([...prev.events, ...categoryEvents])]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {webhook ? 'Edit Webhook' : 'Create Webhook'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Name & URL */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Webhook"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Endpoint URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://your-server.com/webhook"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Secret (show only when editing) */}
          {webhook && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Signing Secret
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={webhook.secret}
                    readOnly
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhook.secret);
                    toast.success('Secret copied');
                  }}
                  className="p-2.5 text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Use this secret to verify webhook signatures (X-Webhook-Signature header)
              </p>
            </div>
          )}

          {/* Events */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Events * <span className="text-gray-400">({formData.events.length} selected)</span>
            </label>
            <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-3">
              {Object.entries(eventsByCategory).map(([category, events]) => {
                const allSelected = events.every(e => formData.events.includes(e.value));
                const someSelected = events.some(e => formData.events.includes(e.value));
                
                return (
                  <div key={category}>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category}</span>
                    </label>
                    <div className="ml-6 mt-1 space-y-1">
                      {events.map((event) => (
                        <label
                          key={event.value}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/20 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event.value)}
                            onChange={() => toggleEvent(event.value)}
                            className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={formData.timeout_seconds}
                onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 30 })}
                min="5"
                max="120"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Retries
              </label>
              <input
                type="number"
                value={formData.max_retries}
                onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) || 3 })}
                min="0"
                max="10"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {webhook ? 'Update' : 'Create'} Webhook
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// WEBHOOK LOGS MODAL
// ============================================
const WebhookLogsModal = ({ webhook, logs, loading, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Logs</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{webhook.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No delivery logs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        log.success 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {log.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.event_type}
                          </span>
                          {log.response_status_code && (
                            <span className={`px-1.5 py-0.5 text-xs font-mono rounded ${
                              log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.response_status_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(log.created_at).toLocaleString()}
                          {log.duration_ms && ` • ${log.duration_ms}ms`}
                          {log.attempt_number > 1 && ` • Attempt #${log.attempt_number}`}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// GOOGLE ANALYTICS SECTION
// ============================================
const GoogleAnalyticsCard = () => {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/integrations/google-analytics/');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching GA settings:', error);
      toast.error('Failed to load Google Analytics settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      setSaving(true);
      const response = await api.patch('/api/auth/integrations/google-analytics/', updates);
      setSettings(response.data);
      toast.success('Google Analytics settings updated');
    } catch (error) {
      console.error('Error updating GA settings:', error);
      toast.error(error.response?.data?.measurement_id?.[0] || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  const trackingOptions = [
    { key: 'track_page_views', label: 'Page Views', description: 'Track when users navigate pages' },
    { key: 'track_report_downloads', label: 'Report Downloads', description: 'Track report download events' },
    { key: 'track_search_queries', label: 'Search Queries', description: 'Track search usage' },
    { key: 'track_filter_usage', label: 'Filter Usage', description: 'Track filter interactions' },
    { key: 'track_user_actions', label: 'User Actions', description: 'Track detailed user behavior (requires consent)', warning: true },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Google Analytics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track user behavior and platform usage</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings?.is_enabled && settings?.measurement_id && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Active
              </span>
            )}
            <button
              onClick={() => updateSettings({ is_enabled: !settings?.is_enabled })}
              disabled={saving || !settings?.measurement_id}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings?.is_enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${!settings?.measurement_id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                settings?.is_enabled ? 'left-6' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Measurement ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Measurement ID (GA4)
          </label>
          <input
            type="text"
            value={settings?.measurement_id || ''}
            onChange={(e) => setSettings({ ...settings, measurement_id: e.target.value })}
            onBlur={() => settings?.measurement_id && updateSettings({ measurement_id: settings.measurement_id })}
            placeholder="G-XXXXXXXXXX"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Find your Measurement ID in{' '}
            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-600">
              Google Analytics <ExternalLink className="w-3 h-3 inline" />
            </a>
            {' '}→ Admin → Data Streams
          </p>
        </div>

        {/* Tracking Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Tracking Options
          </label>
          <div className="space-y-2">
            {trackingOptions.map((option) => (
              <label
                key={option.key}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings?.[option.key] || false}
                    onChange={(e) => updateSettings({ [option.key]: e.target.checked })}
                    className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{option.label}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                  </div>
                </div>
                {option.warning && (
                  <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                    Consent
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.anonymize_ip || false}
              onChange={(e) => updateSettings({ anonymize_ip: e.target.checked })}
              className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Anonymize IP addresses</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.debug_mode || false}
              onChange={(e) => updateSettings({ debug_mode: e.target.checked })}
              className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Debug mode</span>
          </label>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Privacy Note</p>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              Google Analytics collects usage data to help improve the platform. IP anonymization is recommended for GDPR compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN INTEGRATIONS SECTION
// ============================================
const IntegrationsSection = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'slack', label: 'Slack', icon: MessageSquare },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <SlackIntegrationCard />
          <GoogleAnalyticsCard />
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <WebhooksSection />
          </div>
        </div>
      )}

      {activeTab === 'slack' && <SlackIntegrationCard />}
      
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <WebhooksSection />
        </div>
      )}
      
      {activeTab === 'analytics' && <GoogleAnalyticsCard />}
    </div>
  );
};

export default IntegrationsSection;
