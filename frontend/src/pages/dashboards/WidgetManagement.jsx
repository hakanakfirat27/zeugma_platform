// frontend/src/pages/dashboards/WidgetManagement.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  Settings, Save, RefreshCw, Eye, EyeOff, GripVertical,
  ArrowLeft, Check, X, BarChart3, Activity, AlertTriangle,
  TrendingUp, FileText, Users, Database, FolderKanban
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';

// --- Stat Card Component ---
const StatCard = ({ label, value, subtitle, icon, color = 'gray' }) => {
  const IconComponent = icon;

  const colorClasses = {
    green: {
      icon: 'text-green-500',
      subtitle: 'text-green-600',
      bg: 'bg-green-100',
    },
    red: {
      icon: 'text-red-500',
      subtitle: 'text-red-600',
      bg: 'bg-red-100',
    },
    indigo: {
      icon: 'text-indigo-500',
      subtitle: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    gray: {
      icon: 'text-gray-500',
      subtitle: 'text-gray-500',
      bg: 'bg-gray-100',
    },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-start">
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        <p className={`text-xs font-medium mt-2 ${colors.subtitle}`}>
          {subtitle}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${colors.bg}`}>
        <IconComponent className={`w-6 h-6 ${colors.icon}`} />
      </div>
    </div>
  );
};

const WidgetManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);    
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/widgets/');
      setWidgets(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching widgets:', err);
      setError('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = async (widgetId) => {
    try {
      const response = await api.post(`/api/widgets/${widgetId}/toggle_enabled/`);
      setWidgets(widgets.map(w =>
        w.id === widgetId ? { ...w, is_enabled: !w.is_enabled } : w
      ));
      showSuccess('Widget status updated');
    } catch (err) {
      console.error('Error toggling widget:', err);
      setError('Failed to update widget status');
    }
  };

  const bulkToggle = async (enable) => {
    const filteredIds = getFilteredWidgets().map(w => w.id);

    try {
      setSaving(true);
      await api.post('/api/widgets/bulk_toggle/', {
        widget_ids: filteredIds,
        enabled: enable
      });

      setWidgets(widgets.map(w =>
        filteredIds.includes(w.id) ? { ...w, is_enabled: enable } : w
      ));

      showSuccess(`${filteredIds.length} widgets ${enable ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Error in bulk toggle:', err);
      setError('Failed to update widgets');
    } finally {
      setSaving(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getFilteredWidgets = () => {
    if (filter === 'ALL') return widgets;
    return widgets.filter(w => w.category === filter);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'USERS': Users,
      'REPORTS': FileText,
      'DATABASE': Database,
      'ACTIVITY': Activity,
      'PROJECTS': FolderKanban,
      'SYSTEM': Settings,
      'ANALYTICS': TrendingUp,
    };
    const Icon = icons[category] || BarChart3;
    return <Icon className="w-4 h-4" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'USERS': 'bg-violet-100 text-violet-600',
      'REPORTS': 'bg-indigo-100 text-indigo-600',
      'DATABASE': 'bg-emerald-100 text-emerald-600',
      'ACTIVITY': 'bg-cyan-100 text-cyan-600',
      'PROJECTS': 'bg-orange-100 text-orange-600',
      'SYSTEM': 'bg-slate-100 text-slate-600',
      'ANALYTICS': 'bg-amber-100 text-amber-600',
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  // Updated categories to match new widget registry
  const categories = [
    { key: 'ALL', label: 'All Widgets', icon: Settings },
    { key: 'USERS', label: 'Users', icon: Users },
    { key: 'REPORTS', label: 'Reports', icon: FileText },
    { key: 'DATABASE', label: 'Database', icon: Database },
    { key: 'ACTIVITY', label: 'Activity', icon: Activity },
    { key: 'PROJECTS', label: 'Projects', icon: FolderKanban },
    { key: 'SYSTEM', label: 'System', icon: Settings },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const filteredWidgets = getFilteredWidgets();
  const enabledCount = filteredWidgets.filter(w => w.is_enabled).length;

  const pageSubtitle = (
    <p className="text-sm mt-1">Configure which widgets appear on your dashboard</p>
  );

  const headerActions = (
    <button
      onClick={fetchWidgets}
      className="px-4 py-2 text-white-700 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-sm"
    >
      <RefreshCw className="w-4 h-4" />
      Refresh
    </button>
  );

  return (
    <DashboardLayout
      pageTitle="Widget Management"
      pageSubtitleBottom={pageSubtitle}
      headerActions={headerActions}
      breadcrumbs={breadcrumbs}
    >
      <div className="flex-1 overflow-auto p-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            icon={Settings}
            label="Total Widgets"
            value={filteredWidgets.length}
            subtitle={filter === 'ALL' ? 'All widgets in system' : `In '${filter}' category`}
            color="indigo"
          />
          <StatCard
            icon={Eye}
            label="Enabled"
            value={enabledCount}
            subtitle="Visible on dashboard"
            color="green"
          />
          <StatCard
            icon={EyeOff}
            label="Disabled"
            value={filteredWidgets.length - enabledCount}
            subtitle="Hidden from dashboard"
            color="red"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => bulkToggle(true)}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Enable All
          </button>
          <button
            onClick={() => bulkToggle(false)}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <EyeOff className="w-4 h-4" />
            Disable All
          </button>
        </div>

        {/* Category Filter - Updated with icons */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            const count = cat.key === 'ALL' 
              ? widgets.length 
              : widgets.filter(w => w.category === cat.key).length;
            
            return (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                  filter === cat.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === cat.key
                    ? 'bg-white/20'
                    : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Widgets Grid - Grouped by Category when showing all */}
        {filter === 'ALL' ? (
          <div className="space-y-8">
            {categories.filter(c => c.key !== 'ALL').map(cat => {
              const categoryWidgets = widgets.filter(w => w.category === cat.key);
              if (categoryWidgets.length === 0) return null;
              
              const Icon = cat.icon;
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${getCategoryColor(cat.key)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">{cat.label}</h2>
                    <span className="text-sm text-gray-500">
                      ({categoryWidgets.filter(w => w.is_enabled).length}/{categoryWidgets.length} enabled)
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {categoryWidgets.map(widget => (
                      <WidgetCard
                        key={widget.id}
                        widget={widget}
                        onToggle={toggleWidget}
                        getCategoryIcon={getCategoryIcon}
                        getCategoryColor={getCategoryColor}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWidgets.map(widget => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                onToggle={toggleWidget}
                getCategoryIcon={getCategoryIcon}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredWidgets.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No widgets found in this category</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Widget Card Component
const WidgetCard = ({ widget, onToggle, getCategoryIcon, getCategoryColor }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all ${
        widget.is_enabled ? 'border-l-4 border-l-green-500' : 'opacity-60'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Widget Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getCategoryColor(widget.category)}`}>
                {getCategoryIcon(widget.category)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{widget.title}</h3>
                <p className="text-sm text-gray-500">{widget.description}</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => onToggle(widget.id)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                widget.is_enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  widget.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Widget Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className={`px-2 py-1 rounded ${getCategoryColor(widget.category)}`}>
              {widget.category}
            </span>
            <span>Size: {widget.width}x{widget.height}</span>
            <span>Order: {widget.display_order}</span>
            <span className={widget.is_enabled ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {widget.is_enabled ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetManagement;
