// frontend/src/pages/admin/EmailTemplatesSection.jsx
// Email Templates and Branding Management Section

import { useState, useEffect, useRef } from 'react';
import {
  Mail, Palette, Eye, Edit2, RotateCcw, Send, Check, X,
  RefreshCw, ChevronDown, ChevronRight, Save, AlertTriangle,
  FileText, Globe, AtSign, Link, Image, Type, Code, Plus,
  Copy, Download, Trash2
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

const EmailTemplatesSection = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSendTestModal, setShowSendTestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, brandingRes] = await Promise.all([
        api.get('/accounts/security/email/templates/'),
        api.get('/accounts/security/email/branding/')
      ]);
      
      // If no templates exist, create defaults
      if (!templatesRes.data || templatesRes.data.length === 0) {
        await createDefaultTemplates();
      } else {
        setTemplates(templatesRes.data);
      }
      
      setBranding(brandingRes.data);
    } catch (error) {
      console.error('Error fetching email data:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const response = await api.post('/accounts/security/email/templates/create-defaults/');
      setTemplates(response.data.templates);
      toast.success(`Created ${response.data.created_count} default templates`);
    } catch (error) {
      console.error('Error creating default templates:', error);
    }
  };

  const handleRecreateAllTemplates = async () => {
    if (!confirm('This will delete all templates and recreate them with the latest defaults. Any customizations will be lost. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/accounts/security/email/templates/recreate-all/');
      setTemplates(response.data.templates);
      toast.success(`Recreated ${response.data.created_count} templates`);
    } catch (error) {
      console.error('Error recreating templates:', error);
      toast.error('Failed to recreate templates');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full template details for editing
  const handleEditTemplate = async (template) => {
    try {
      const response = await api.get(`/accounts/security/email/templates/${template.id}/`);
      setSelectedTemplate(response.data);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Failed to load template details');
    }
  };

  const tabs = [
    { id: 'templates', name: 'Templates', icon: FileText },
    { id: 'branding', name: 'Branding', icon: Palette },
  ];

  // Group templates by category - ordered list
  const templateCategories = {
    'Account & Security': [
      'user_invited',           // User Creation
      '2fa_setup_code',         // Two-Factor Authentication Setup
      'welcome',                // Welcome Email
      '2fa_disabled',           // 2FA Disabled Confirmation
      '2fa_enabled_notification', // 2FA Enabled Notification
      '2fa_enabled',            // 2FA Enabled Confirmation
      'password_reset',         // Password Reset Request
      'password_reset_success', // Password Reset Confirmation
      '2fa_code',               // 2FA Verification Code
      'password_changed',       // Password Changed Confirmation
    ],
    'Login Alerts': [
      'account_locked',         // Account Locked Notification
      'new_device_login',       // New Device Login Alert
      'suspicious_login',       // Suspicious Login Activity
    ],
    'Reports': ['report_ready'],
    'Announcements': ['announcement_info', 'announcement_warning', 'announcement_success', 'announcement_urgent'],
    'Custom': [], // For user-created templates
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Templates</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.filter(t => t.is_active).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.filter(t => !t.is_active).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${branding?.primary_color}20` }}>
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: branding?.primary_color }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{branding?.primary_color}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Brand Color</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <TemplatesList
          templates={templates}
          setTemplates={setTemplates}
          templateCategories={templateCategories}
          setSelectedTemplate={setSelectedTemplate}
          setShowPreviewModal={setShowPreviewModal}
          setShowEditModal={setShowEditModal}
          setShowSendTestModal={setShowSendTestModal}
          setShowCreateModal={setShowCreateModal}
          setPreviewHtml={setPreviewHtml}
          setPreviewSubject={setPreviewSubject}
          onRecreateAll={handleRecreateAllTemplates}
          onEditTemplate={handleEditTemplate}
          toast={toast}
        />
      )}
      
      {activeTab === 'branding' && (
        <BrandingSettings
          branding={branding}
          setBranding={setBranding}
          toast={toast}
        />
      )}

      {/* Preview Modal - Shows Rendered Email */}
      {showPreviewModal && selectedTemplate && (
        <PreviewModal
          template={selectedTemplate}
          previewHtml={previewHtml}
          previewSubject={previewSubject}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
            setPreviewHtml('');
            setPreviewSubject('');
          }}
          onEdit={() => {
            setShowPreviewModal(false);
            handleEditTemplate(selectedTemplate);
          }}
          onSendTest={() => {
            setShowPreviewModal(false);
            setShowSendTestModal(true);
          }}
        />
      )}

      {/* Edit Modal - Shows HTML/Text Editors */}
      {showEditModal && selectedTemplate && (
        <EditTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSave={(updatedTemplate) => {
            setTemplates(templates.map(t => 
              t.id === updatedTemplate.id ? updatedTemplate : t
            ));
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          toast={toast}
        />
      )}

      {/* Create New Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newTemplate) => {
            setTemplates([...templates, newTemplate]);
            setShowCreateModal(false);
          }}
          existingTypes={templates.map(t => t.template_type)}
          toast={toast}
        />
      )}

      {/* Send Test Modal */}
      {showSendTestModal && selectedTemplate && (
        <SendTestModal
          template={selectedTemplate}
          onClose={() => {
            setShowSendTestModal(false);
            setSelectedTemplate(null);
          }}
          toast={toast}
        />
      )}
    </div>
  );
};

// ============================================
// TEMPLATES LIST
// ============================================
const TemplatesList = ({ 
  templates, setTemplates, templateCategories, setSelectedTemplate, 
  setShowPreviewModal, setShowEditModal, setShowSendTestModal, setShowCreateModal,
  setPreviewHtml, setPreviewSubject, onRecreateAll, onEditTemplate, toast 
}) => {
  const [toggling, setToggling] = useState(null);
  const categoryRefs = useRef({});
  // Start with first category open (Account & Security)
  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(templateCategories).reduce((acc, key, index) => ({ ...acc, [key]: index === 0 }), {})
  );

  const handlePreview = async (template) => {
    try {
      const response = await api.post('/accounts/security/email/templates/preview/', {
        template_id: template.id
      });
      setPreviewHtml(response.data.html_content);
      setPreviewSubject(response.data.subject);
      setSelectedTemplate(template);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error previewing template:', error);
      toast.error('Failed to preview template');
    }
  };

  const handleToggle = async (template) => {
    setToggling(template.id);
    try {
      const response = await api.post(`/accounts/security/email/templates/${template.id}/toggle/`);
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_active: response.data.is_active } : t
      ));
      toast.success(response.data.message);
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to toggle template');
    } finally {
      setToggling(null);
    }
  };

  const handleReset = async (template) => {
    if (!confirm(`Reset "${template.name}" to default? This will overwrite your customizations.`)) {
      return;
    }

    try {
      const response = await api.post(`/accounts/security/email/templates/${template.id}/reset/`);
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? response.data.template : t
      ));
      toast.success('Template reset to default');
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error('Failed to reset template');
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/accounts/security/email/templates/${template.id}/delete/`);
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.error || 'Failed to delete template');
    }
  };

  const getTemplateIcon = (type) => {
    const icons = {
      'user_invited': '✉️',
      '2fa_setup_code': '🔐',
      'welcome': '🎉',
      '2fa_disabled': '⚠️',
      '2fa_enabled_notification': '🔔',
      '2fa_enabled': '✅',
      'password_reset': '🔑',
      'password_reset_success': '✅',
      '2fa_code': '🔢',
      'password_changed': '🔒',
      'account_locked': '🔒',
      'new_device_login': '📱',
      'suspicious_login': '🚨',
      'report_ready': '📊',
      'announcement_info': 'ℹ️',
      'announcement_warning': '⚠️',
      'announcement_success': '✅',
      'announcement_urgent': '🚨',
    };
    return icons[type] || '📧';
  };

  // Accordion behavior - when one opens, others close
  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const isCurrentlyOpen = prev[category];
      // Close all categories, then open the clicked one (if it was closed)
      const newState = Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {});
      if (!isCurrentlyOpen) {
        newState[category] = true;
        // Scroll to the beginning of the category when expanding
        setTimeout(() => {
          categoryRefs.current[category]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      }
      return newState;
    });
  };

  // Get templates by category - maintaining the order defined in templateCategories
  const getTemplatesByCategory = (categoryTypes) => {
    if (categoryTypes.length === 0) {
      // Custom category - get templates not in any predefined category
      const allPredefinedTypes = Object.values(templateCategories).flat();
      return templates.filter(t => !allPredefinedTypes.includes(t.template_type));
    }
    // Sort templates according to the order in categoryTypes
    return categoryTypes
      .map(type => templates.find(t => t.template_type === type))
      .filter(Boolean); // Remove undefined (templates that don't exist yet)
  };

  // Check if template is a default type (can be reset)
  const isDefaultType = (templateType) => {
    const defaultTypes = Object.values(templateCategories).flat().filter(t => t);
    return defaultTypes.includes(templateType);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Customize email templates sent to users. Click <Eye className="w-4 h-4 inline" /> to preview or <Edit2 className="w-4 h-4 inline" /> to edit.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
          <button
            onClick={onRecreateAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recreate Defaults
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Templates Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create default email templates to start customizing your platform's email communications.
          </p>
          <button
            onClick={async () => {
              try {
                const response = await api.post('/accounts/security/email/templates/create-defaults/');
                setTemplates(response.data.templates);
                toast.success(`Created ${response.data.created_count} default templates`);
              } catch (error) {
                console.error('Error creating templates:', error);
                toast.error('Failed to create templates');
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Default Templates
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(templateCategories).map(([category, types]) => {
            const categoryTemplates = getTemplatesByCategory(types);
            if (categoryTemplates.length === 0) return null;

            return (
              <div 
                key={category} 
                ref={el => categoryRefs.current[category] = el}
                className={`rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${
                  expandedCategories[category]
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 ring-2 ring-green-200 dark:ring-green-800/50'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                    expandedCategories[category]
                      ? 'bg-white/60 dark:bg-gray-800/60'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      category.includes('Security') ? 'bg-purple-100 dark:bg-purple-900/30' :
                      category.includes('Login') ? 'bg-blue-100 dark:bg-blue-900/30' :
                      category.includes('Report') ? 'bg-green-100 dark:bg-green-900/30' :
                      category === 'Custom' ? 'bg-gray-100 dark:bg-gray-700' :
                      'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      {category.includes('Security') ? '🔐' :
                       category.includes('Login') ? '🔔' :
                       category.includes('Report') ? '📊' : 
                       category === 'Custom' ? '✨' : '📢'}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{category}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({categoryTemplates.length} templates)
                    </span>
                  </div>
                  {expandedCategories[category] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Category Templates */}
                {expandedCategories[category] && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {categoryTemplates.map((template) => (
                      <div key={template.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
                              {getTemplateIcon(template.template_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                                {template.is_active ? (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                    Inactive
                                  </span>
                                )}
                                {!isDefaultType(template.template_type) && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md truncate">
                                {template.subject}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePreview(template)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Preview Email"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEditTemplate(template)}
                              className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              title="Edit HTML/Text"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowSendTestModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Send Test Email"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            {isDefaultType(template.template_type) ? (
                              <button
                                onClick={() => handleReset(template)}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Reset to Default"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(template)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggle(template)}
                              disabled={toggling === template.id}
                              className={`w-12 h-7 rounded-full transition-colors ${
                                template.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              {toggling === template.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-white mx-auto" />
                              ) : (
                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                                  template.is_active ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// BRANDING SETTINGS
// ============================================
const BrandingSettings = ({ branding, setBranding, toast }) => {
  const [formData, setFormData] = useState(branding || {});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(branding || {});
  }, [branding]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch('/accounts/security/email/branding/update/', formData);
      setBranding(response.data);
      setHasChanges(false);
      toast.success('Branding settings saved');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  // Default colors from template
  const defaultPrimary = '#8b5cf6';
  const defaultSecondary = '#7c3aed';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-500" />
          Email Branding
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Type className="w-4 h-4 inline mr-2" />
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name || ''}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Image className="w-4 h-4 inline mr-2" />
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logo_url || ''}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Color
              <button
                onClick={() => handleChange('primary_color', defaultPrimary)}
                className="ml-2 text-xs text-purple-600 hover:text-purple-700"
              >
                (Reset to default)
              </button>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primary_color || defaultPrimary}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={formData.primary_color || defaultPrimary}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Secondary Color
              <button
                onClick={() => handleChange('secondary_color', defaultSecondary)}
                className="ml-2 text-xs text-purple-600 hover:text-purple-700"
              >
                (Reset to default)
              </button>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.secondary_color || defaultSecondary}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={formData.secondary_color || defaultSecondary}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <AtSign className="w-4 h-4 inline mr-2" />
              Support Email
            </label>
            <input
              type="email"
              value={formData.support_email || ''}
              onChange={(e) => handleChange('support_email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Globe className="w-4 h-4 inline mr-2" />
              Website URL
            </label>
            <input
              type="url"
              value={formData.website_url || ''}
              onChange={(e) => handleChange('website_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Footer Text */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Footer Text
            </label>
            <textarea
              value={formData.footer_text || ''}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Header Preview</h3>
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <div 
            className="rounded-t-lg p-6 text-center"
            style={{ background: `linear-gradient(135deg, ${formData.primary_color || defaultPrimary} 0%, ${formData.secondary_color || defaultSecondary} 100%)` }}
          >
            {formData.logo_url ? (
              <img 
                src={formData.logo_url} 
                alt="Logo" 
                className="max-h-12 mx-auto"
                onError={(e) => e.target.style.display = 'none'}
              />
            ) : (
              <h1 className="text-xl font-semibold text-white">{formData.company_name || 'Your Company'}</h1>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Email content will appear here with your branding applied...
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-b-lg p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {formData.footer_text || '© 2025 Your Company. All rights reserved.'}
            {formData.support_email && (
              <p className="mt-1">
                Contact us at <span style={{ color: formData.primary_color || defaultPrimary }}>{formData.support_email}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PREVIEW MODAL - Shows Rendered Email
// ============================================
const PreviewModal = ({ template, previewHtml, previewSubject, onClose, onEdit, onSendTest }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Email Preview
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {template.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit HTML
            </button>
            <button
              onClick={onSendTest}
              className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Test
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subject Preview */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Subject:</strong> {previewSubject}
          </p>
        </div>

        {/* Email Preview */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-180px)]">
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[600px] bg-white rounded-lg border-0"
              title="Email Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// EDIT TEMPLATE MODAL - Shows HTML/Text Editors
// ============================================
const EditTemplateModal = ({ template, onClose, onSave, toast }) => {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('html');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);

  // Branding variables that are always available
  const brandingVariables = ['company_name', 'primary_color', 'secondary_color', 'footer_text', 'support_email', 'current_year'];

  // Combine template-specific variables with branding variables
  const allVariables = [
    ...(template.available_variables || []),
    ...brandingVariables.filter(v => !(template.available_variables || []).includes(v))
  ];

  // Load template content and preview on mount
  useEffect(() => {
    loadTemplateContent();
    loadPreview();
  }, [template.id]);

  const loadTemplateContent = async () => {
    try {
      setLoadingContent(true);
      // Fetch full template details including html_content and text_content
      const response = await api.get(`/accounts/security/email/templates/${template.id}/`);
      setFormData({
        name: response.data.name || '',
        subject: response.data.subject || '',
        html_content: response.data.html_content || '',
        text_content: response.data.text_content || '',
      });
    } catch (error) {
      console.error('Error loading template content:', error);
      // Fallback to template prop data
      setFormData({
        name: template.name || '',
        subject: template.subject || '',
        html_content: template.html_content || '',
        text_content: template.text_content || '',
      });
    } finally {
      setLoadingContent(false);
    }
  };

  const loadPreview = async () => {
    try {
      setLoadingPreview(true);
      const response = await api.post('/accounts/security/email/templates/preview/', {
        template_id: template.id
      });
      setPreviewHtml(response.data.html_content);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch(
        `/accounts/security/email/templates/${template.id}/update/`,
        formData
      );
      onSave(response.data);
      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-500" />
            Edit Template: {template.name}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex h-[calc(90vh-140px)]">
          {/* Editor Panel */}
          <div className={`${showLivePreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200 dark:border-gray-700`}>
            <div className="p-4 space-y-4 overflow-auto flex-1">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Available Variables */}
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                  Available Variables (click to copy):
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* Template-specific variables */}
                  {(template.available_variables || []).map((variable) => (
                    <code
                      key={variable}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
                      onClick={() => copyToClipboard(`{{${variable}}}`)}
                      title="Click to copy"
                    >
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
                {/* Branding variables section */}
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-3 mb-2">
                  Branding Variables:
                </p>
                <div className="flex flex-wrap gap-2">
                  {brandingVariables.map((variable) => (
                    <code
                      key={variable}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                      onClick={() => copyToClipboard(`{{${variable}}}`)}
                      title="Click to copy"
                    >
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
              </div>

              {/* Editor Tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveEditorTab('html')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeEditorTab === 'html'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Code className="w-4 h-4 inline mr-2" />
                  HTML Content
                </button>
                <button
                  onClick={() => setActiveEditorTab('text')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeEditorTab === 'text'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Plain Text
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    showLivePreview
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Eye className="w-4 h-4 inline mr-2" />
                  {showLivePreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              {/* Content Editor */}
              {loadingContent ? (
                <div className="w-full h-96 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading template content...</span>
                  </div>
                </div>
              ) : (
                <>
                  {activeEditorTab === 'html' && (
                    <textarea
                      value={formData.html_content}
                      onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                      className="w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none"
                      placeholder="HTML content..."
                      spellCheck={false}
                    />
                  )}

                  {activeEditorTab === 'text' && (
                    <textarea
                      value={formData.text_content}
                      onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                      className="w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none"
                      placeholder="Plain text fallback content..."
                      spellCheck={false}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Live Preview Panel */}
          {showLivePreview && (
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Preview</p>
              </div>
              <div className="flex-1 p-4 overflow-auto bg-gray-100 dark:bg-gray-900">
                {loadingPreview ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full bg-white rounded-lg border-0"
                    title="Live Preview"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingContent}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CREATE TEMPLATE MODAL
// ============================================
const CreateTemplateModal = ({ onClose, onCreated, existingTypes, toast }) => {
  const [formData, setFormData] = useState({
    template_type: '',
    name: '',
    subject: '',
    html_content: getDefaultHtmlTemplate(),
    text_content: getDefaultTextTemplate(),
    available_variables: ['user_name', 'user_email'],
  });
  const [saving, setSaving] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('html');

  // Branding variables that are always available
  const brandingVariables = ['company_name', 'primary_color', 'secondary_color', 'footer_text', 'support_email', 'current_year'];

  const handleCreate = async () => {
    if (!formData.template_type.trim()) {
      toast.error('Please enter a template type (e.g., "custom_notification")');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject line');
      return;
    }

    // Check if type already exists
    if (existingTypes.includes(formData.template_type)) {
      toast.error('A template with this type already exists');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/accounts/security/email/templates/create/', formData);
      onCreated(response.data);
      toast.success('Template created successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error(error.response?.data?.error || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const addVariable = () => {
    const newVar = prompt('Enter variable name (without brackets):');
    if (newVar && !formData.available_variables.includes(newVar)) {
      setFormData({
        ...formData,
        available_variables: [...formData.available_variables, newVar.toLowerCase().replace(/\s+/g, '_')]
      });
    }
  };

  const removeVariable = (varToRemove) => {
    setFormData({
      ...formData,
      available_variables: formData.available_variables.filter(v => v !== varToRemove)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-500" />
            Create New Email Template
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* Template Type Explanation */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <span className="text-lg">💡</span>
              <span>
                <strong>Template Type</strong> is a unique system identifier (e.g., "2fa_enabled", "order_confirmation"). 
                It's used internally to trigger the correct email template. <strong>Template Name</strong> is the display name shown in this admin panel.
              </span>
            </p>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Type * <span className="text-xs text-gray-500">(system identifier)</span>
              </label>
              <input
                type="text"
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., order_confirmation"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase letters and underscores only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Name * <span className="text-xs text-gray-500">(display name)</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Order Confirmation"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Line *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="{{company_name}} - Your notification"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Available Variables */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Template Variables (click to copy):
              </p>
              <button
                onClick={addVariable}
                className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-700"
              >
                + Add Variable
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.available_variables.map((variable) => (
                <div key={variable} className="flex items-center gap-1">
                  <code
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
                    onClick={() => copyToClipboard(`{{${variable}}}`)}
                    title="Click to copy"
                  >
                    {`{{${variable}}}`}
                  </code>
                  {!['user_name', 'user_email'].includes(variable) && (
                    <button
                      onClick={() => removeVariable(variable)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Branding variables section */}
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-3 mb-2">
              Branding Variables (always available):
            </p>
            <div className="flex flex-wrap gap-2">
              {brandingVariables.map((variable) => (
                <code
                  key={variable}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                  onClick={() => copyToClipboard(`{{${variable}}}`)}
                  title="Click to copy"
                >
                  {`{{${variable}}}`}
                </code>
              ))}
            </div>
          </div>

          {/* Editor Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveEditorTab('html')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeEditorTab === 'html'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Code className="w-4 h-4 inline mr-2" />
              HTML Content
            </button>
            <button
              onClick={() => setActiveEditorTab('text')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeEditorTab === 'text'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Plain Text
            </button>
          </div>

          {/* Content Editor */}
          {activeEditorTab === 'html' && (
            <textarea
              value={formData.html_content}
              onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
              className="w-full h-80 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none"
              placeholder="HTML content..."
              spellCheck={false}
            />
          )}

          {activeEditorTab === 'text' && (
            <textarea
              value={formData.text_content}
              onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
              className="w-full h-80 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none"
              placeholder="Plain text fallback content..."
              spellCheck={false}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Default plain text template for new templates
function getDefaultTextTemplate() {
  return `Hello {{user_name}},

Your message content goes here. You can customize this template with your own content.

---
{{company_name}}
© {{current_year}} {{company_name}}. All rights reserved.`;
}

// Default HTML template for new templates
function getDefaultHtmlTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                📧 Your Title Here
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {{primary_color}}; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your message content goes here. You can customize this template with your own content and styling.
                            </p>

                            <!-- Add your content here -->

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ============================================
// SEND TEST MODAL
// ============================================
const SendTestModal = ({ template, onClose, toast }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setSending(true);
    try {
      await api.post('/accounts/security/email/templates/send-test/', {
        template_id: template.id,
        to_email: email
      });
      toast.success(`Test email sent to ${email}`);
      onClose();
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-green-500" />
            Send Test Email
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send a test email for <strong>"{template.name}"</strong> with realistic sample data.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipient Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              The test email will use realistic sample data (e.g., "John Doe" as user name).
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatesSection;
