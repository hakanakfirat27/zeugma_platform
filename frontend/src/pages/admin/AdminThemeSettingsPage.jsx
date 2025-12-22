// frontend/src/pages/admin/AdminThemeSettingsPage.jsx
// Admin page to configure theme settings for all layouts

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Palette, Sun, Moon, Monitor, Save, RefreshCw, 
  Check, AlertCircle, Eye, EyeOff, ToggleLeft, 
  Layout, Sidebar, ChevronDown, Settings
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

// Toggle Preview Components (simplified versions)
const TogglePreviews = {
  minimal: ({ isDark }) => (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`}>
      {isDark ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-blue-600" />}
    </div>
  ),
  pill: ({ isDark }) => (
    <div className={`w-12 h-6 rounded-full relative ${isDark ? 'bg-indigo-900' : 'bg-sky-400'}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${isDark ? 'left-0.5 bg-gray-200' : 'left-6 bg-yellow-300'}`} />
    </div>
  ),
  scene: ({ isDark }) => (
    <div className={`w-14 h-7 rounded-full relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-sky-400'}`}>
      <div className={`absolute top-0.5 w-6 h-6 rounded-full transition-all ${isDark ? 'left-0.5 bg-gray-200' : 'left-7 bg-yellow-300'}`} />
    </div>
  ),
  glow: ({ isDark }) => (
    <div className={`w-12 h-6 rounded-full relative ${isDark ? 'bg-slate-800' : 'bg-amber-100'}`} 
      style={{ boxShadow: isDark ? '0 0 8px rgba(139, 92, 246, 0.5)' : '0 0 8px rgba(251, 191, 36, 0.5)' }}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full ${isDark ? 'left-6 bg-purple-500' : 'left-0.5 bg-amber-400'}`} />
    </div>
  ),
  ios: ({ isDark }) => (
    <div className={`w-10 h-6 rounded-full relative ${isDark ? 'bg-green-500' : 'bg-gray-300'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow ${isDark ? 'left-4' : 'left-0.5'}`} />
    </div>
  ),
  neumorphic: ({ isDark }) => (
    <div className={`w-12 h-6 rounded-full relative ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full ${isDark ? 'left-6 bg-gray-700' : 'left-0.5 bg-gray-100'}`} />
    </div>
  ),
  eclipse: ({ isDark }) => (
    <div className={`w-8 h-8 rounded-full relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-sky-400'}`}>
      <div className="absolute w-5 h-5 rounded-full bg-yellow-400 top-1.5 left-1.5" />
      {isDark && <div className="absolute w-5 h-5 rounded-full bg-gray-300 top-1.5 left-1.5" />}
    </div>
  ),
  neon: ({ isDark }) => (
    <div className={`w-12 h-6 rounded-full relative border-2 ${isDark ? 'bg-slate-900 border-cyan-400' : 'bg-gray-100 border-orange-400'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full ${isDark ? 'left-6 bg-cyan-400' : 'left-0.5 bg-orange-400'}`} />
    </div>
  ),
  liquid: ({ isDark }) => (
    <div className={`w-12 h-6 rounded-full relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-sky-200'}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full ${isDark ? 'left-6 bg-indigo-300' : 'left-0.5 bg-yellow-300'}`} />
    </div>
  ),
  rocker: ({ isDark }) => (
    <div className="w-6 h-10 rounded bg-gray-700 flex flex-col items-center justify-between py-1">
      <div className={`w-2 h-2 rounded-full ${!isDark ? 'bg-amber-400' : 'bg-gray-600'}`} />
      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-gray-600'}`} />
    </div>
  ),
  text: ({ isDark }) => (
    <div className={`w-14 h-6 rounded-full relative ${isDark ? 'bg-gray-800' : 'bg-amber-400'}`}>
      <span className={`absolute top-1 text-[8px] font-bold ${isDark ? 'left-1 text-gray-400' : 'right-1 text-amber-800'}`}>
        {isDark ? 'DARK' : 'LIGHT'}
      </span>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full ${isDark ? 'left-8 bg-indigo-500' : 'left-0.5 bg-white'}`} />
    </div>
  ),
  bouncy: ({ isDark }) => (
    <div className={`w-12 h-6 rounded-full relative ${isDark ? 'bg-indigo-900' : 'bg-sky-400'}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full ${isDark ? 'left-0.5 bg-gray-200' : 'left-6 bg-yellow-300'}`} />
    </div>
  ),
};

const AdminThemeSettingsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [settings, setSettings] = useState([]);
  const [choices, setChoices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [expandedLayout, setExpandedLayout] = useState('client');
  const [previewDark, setPreviewDark] = useState(false);

  // Fetch settings and choices
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsRes, choicesRes] = await Promise.all([
          api.get('/dashboard/api/admin/theme-settings/'),
          api.get('/dashboard/api/admin/theme-choices/')
        ]);
        setSettings(settingsRes.data);
        setChoices(choicesRes.data);
      } catch (error) {
        console.error('Error fetching theme settings:', error);
        toast.error('Failed to load theme settings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update a setting
  const updateSetting = async (layoutType, field, value) => {
    // Update local state immediately for responsiveness
    setSettings(prev => prev.map(s => 
      s.layout_type === layoutType ? { ...s, [field]: value } : s
    ));

    // Save to backend
    setSaving(prev => ({ ...prev, [layoutType]: true }));
    try {
      await api.patch(`/dashboard/api/admin/theme-settings/${layoutType}/`, {
        [field]: value
      });
      toast.success(`Updated ${field.replace(/_/g, ' ')} for ${layoutType}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
      // Revert on error
      const settingsRes = await api.get('/dashboard/api/admin/theme-settings/');
      setSettings(settingsRes.data);
    } finally {
      setSaving(prev => ({ ...prev, [layoutType]: false }));
    }
  };

  // Get setting by layout type
  const getSettingByLayout = (layoutType) => {
    return settings.find(s => s.layout_type === layoutType) || {};
  };

  // Get icon for theme
  const getThemeIcon = (theme) => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Theme Settings</h1>
              <p className="text-gray-500 dark:text-gray-400">Configure theme appearance for each portal</p>
            </div>
          </div>
        </div>

        {/* Preview Toggle */}
        <div className="mb-6 flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview Mode:</span>
          <button
            onClick={() => setPreviewDark(false)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              !previewDark ? 'bg-white dark:bg-gray-700 shadow-md' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-sm">Light</span>
          </button>
          <button
            onClick={() => setPreviewDark(true)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              previewDark ? 'bg-white dark:bg-gray-700 shadow-md' : 'hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-sm">Dark</span>
          </button>
        </div>

        {/* Settings Cards */}
        <div className="space-y-4">
          {choices?.layout_types.map(({ value: layoutType, label }) => {
            const setting = getSettingByLayout(layoutType);
            const isExpanded = expandedLayout === layoutType;
            const isSaving = saving[layoutType];

            return (
              <div 
                key={layoutType}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedLayout(isExpanded ? null : layoutType)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      layoutType === 'client' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                      layoutType === 'data_collector' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      layoutType === 'guest' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    }`}>
                      <Layout className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {setting.default_theme_display} theme • Toggle {setting.allow_user_toggle ? 'enabled' : 'disabled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
                      
                      {/* Default Theme */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Default Theme
                        </label>
                        <div className="flex gap-2">
                          {choices?.default_themes.map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => updateSetting(layoutType, 'default_theme', value)}
                              className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                                setting.default_theme === value
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                            >
                              {getThemeIcon(value)}
                              <span className="text-sm font-medium">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Toggle Options */}
                      <div className="space-y-4">
                        {/* Allow User Toggle */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <ToggleLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow User Toggle</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Let users change their theme</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSetting(layoutType, 'allow_user_toggle', !setting.allow_user_toggle)}
                            className={`w-12 h-7 rounded-full transition-colors ${
                              setting.allow_user_toggle ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                              setting.allow_user_toggle ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* Show Toggle in Header */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            {setting.show_toggle_in_header ? <Eye className="w-5 h-5 text-gray-500" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Show in Header</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Display toggle button</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSetting(layoutType, 'show_toggle_in_header', !setting.show_toggle_in_header)}
                            className={`w-12 h-7 rounded-full transition-colors ${
                              setting.show_toggle_in_header ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                              setting.show_toggle_in_header ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Toggle Variant */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Toggle Button Style
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {choices?.toggle_variants.map(({ value, label }) => {
                            const PreviewComponent = TogglePreviews[value];
                            return (
                              <button
                                key={value}
                                onClick={() => updateSetting(layoutType, 'toggle_variant', value)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                  setting.toggle_variant === value
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                                }`}
                              >
                                <div className="h-10 flex items-center justify-center">
                                  {PreviewComponent && <PreviewComponent isDark={previewDark} />}
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                                  {value}
                                </span>
                                {setting.toggle_variant === value && (
                                  <Check className="w-4 h-4 text-purple-600 absolute top-2 right-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sidebar Variant */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Sidebar Style
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                          {choices?.sidebar_variants.map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => updateSetting(layoutType, 'sidebar_variant', value)}
                              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                setting.sidebar_variant === value
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                            >
                              <Sidebar className={`w-6 h-6 ${
                                setting.sidebar_variant === value ? 'text-purple-600' : 'text-gray-400'
                              }`} />
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                                {label.split('(')[0].trim()}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Remember Preference */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Remember User Preference</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Save user's theme choice in browser storage for future visits
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSetting(layoutType, 'remember_user_preference', !setting.remember_user_preference)}
                            className={`w-12 h-7 rounded-full transition-colors ${
                              setting.remember_user_preference ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${
                              setting.remember_user_preference ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Last Updated Info */}
                      {setting.updated_at && (
                        <div className="md:col-span-2 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" />
                          Last updated: {new Date(setting.updated_at).toLocaleString()}
                          {setting.updated_by_name && ` by ${setting.updated_by_name}`}
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
    </DashboardLayout>
  );
};

export default AdminThemeSettingsPage;
