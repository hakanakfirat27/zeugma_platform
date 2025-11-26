// frontend/src/pages/WidgetManagement.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  Settings, Save, RefreshCw, Eye, EyeOff, GripVertical,
  ArrowLeft, Check, X, BarChart3, Activity, AlertTriangle,
  TrendingUp, FileText
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';

// --- NEW: Stat Card Component (Adapted for this page) ---
const StatCard = ({ label, value, subtitle, icon, color = 'gray' }) => {
  const IconComponent = icon;

  // Define color themes for the card
  const colorClasses = {
    green: {
      icon: 'text-green-500',
      subtitle: 'text-green-600',
      bg: 'bg-green-100',
    },
    red: { // Added red for disabled
      icon: 'text-red-500',
      subtitle: 'text-red-600',
      bg: 'bg-red-100',
    },
    indigo: { // Using indigo for total
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

  // No isLoading prop is needed here, as the main page `loading`
  // state already handles this before the component is rendered.

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-start">
      {/* Left side: Text content */}
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        <p className={`text-xs font-medium mt-2 ${colors.subtitle}`}>
          {subtitle}
        </p>
      </div>
      {/* Right side: Icon */}
      <div className={`p-3 rounded-lg ${colors.bg}`}>
        <IconComponent className={`w-6 h-6 ${colors.icon}`} />
      </div>
    </div>
  );
};
// --- END: Stat Card Component ---


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
    // ... (Existing code - no changes)
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
    // ... (Existing code - no changes)
    try {
      const response = await api.post(`/api/widgets/${widgetId}/toggle_enabled/`);

      // Update local state
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
    // ... (Existing code - no changes)
    const filteredIds = getFilteredWidgets().map(w => w.id);

    try {
      setSaving(true);
      await api.post('/api/widgets/bulk_toggle/', {
        widget_ids: filteredIds,
        enabled: enable
      });

      // Update local state
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
    // ... (Existing code - no changes)
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getFilteredWidgets = () => {
    // ... (Existing code - no changes)
    if (filter === 'ALL') return widgets;
    return widgets.filter(w => w.category === filter);
  };

  const getCategoryIcon = (category) => {
    // ... (Existing code - no changes)
    const icons = {
      'OVERVIEW': BarChart3,
      'ANALYTICS': TrendingUp,
      'ACTIVITY': Activity,
      'ALERTS': AlertTriangle,
      'REPORTS': FileText,
    };
    const Icon = icons[category] || BarChart3;
    return <Icon className="w-4 h-4" />;
  };

  const categories = [
    // ... (Existing code - no changes)
    { key: 'ALL', label: 'All Widgets' },
    { key: 'OVERVIEW', label: 'Overview' },
    { key: 'ANALYTICS', label: 'Analytics' },
    { key: 'ACTIVITY', label: 'Activity' },
    { key: 'ALERTS', label: 'Alerts' },
    { key: 'REPORTS', label: 'Reports' },
  ];

  if (loading) {
    // ... (Existing code - no changes)
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

  // --- NEW: Define page subtitle ---
  const pageSubtitle = (
    <p className="text-sm text-white-500 mt-1">Customize your dashboard</p> // Color for white header
  );

  // --- NEW: Define header actions (Refresh button) ---
  const headerActions = (
      <button
        onClick={fetchWidgets}
        className="px-4 py-2 text-white-700 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-sm" // Style for white header
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>
  );

  return (
    // --- MODIFIED: Pass pageTitle, pageSubtitleBottom, and headerActions ---
    <DashboardLayout
      pageTitle="Widget Management"
      pageSubtitleBottom={pageSubtitle}
      headerActions={headerActions}
      breadcrumbs={breadcrumbs}
    >
      {/* --- REMOVED: The secondary gradient header div --- */}

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Success Message */}
        {successMessage && (
          // ... (Existing code - no changes)
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          // ... (Existing code - no changes)
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* --- MODIFIED: Stats Grid --- */}
        {/* The parent flex-row div was removed to stack these blocks */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard
              icon={Settings}
              label="Total Widgets"
              value={filteredWidgets.length}
              // The subtitle dynamically changes based on the filter
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
        {/* --- END MODIFIED STATS GRID --- */}


        {/* --- MODIFIED: Action Buttons --- */}
        {/* Moved here to be on their own line, above the category filter */}
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
        {/* --- END MODIFIED ACTION BUTTONS --- */}


        {/* Category Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {/* ... (Existing code - no changes) ... */}
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === cat.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat.label}
              {cat.key !== 'ALL' && (
                <span className="ml-2 text-xs opacity-75">
                  ({widgets.filter(w => w.category === cat.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Widgets Grid */}
        <div className="grid gap-4">
          {/* ... (Existing code - no changes) ... */}
          {filteredWidgets.map(widget => (
            <div
              key={widget.id}
              className={`card hover:shadow-md transition-all ${ // Note: 'card' class might need definition if not global
                widget.is_enabled ? 'border-l-4 border-l-green-500' : 'opacity-60'
              }`} style={{
                 backgroundColor: 'white',
                 borderRadius: '0.75rem', /* rounded-xl */
                 border: '1px solid #e5e7eb', /* border-gray-200 */
                 padding: '1rem' /* p-4 equivalent */
              }}
            >
              <div className="flex items-start gap-4">
                {/* Drag Handle */}
                <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1"> {/* Adjusted padding */}
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Widget Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        widget.is_enabled ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        {getCategoryIcon(widget.category)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{widget.title}</h3>
                        <p className="text-sm text-gray-500">{widget.description}</p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        widget.is_enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          widget.is_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Widget Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {widget.category}
                    </span>
                    <span>Size: {widget.width}x{widget.height}</span>
                    <span>Order: {widget.display_order}</span>
                    <span className={widget.is_enabled ? 'text-green-600' : 'text-gray-400'}>
                      {widget.is_enabled ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredWidgets.length === 0 && (
          // ... (Existing code - no changes)
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No widgets found in this category</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WidgetManagement;