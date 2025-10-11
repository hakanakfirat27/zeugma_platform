// frontend/src/pages/dashboards/StaffDashboard.jsx
// POWER BI STYLE with Drag & Drop

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Lock, Unlock, Plus, Download } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import WidgetRenderer from '../../components/widgets/WidgetRenderer';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(true); // Locked by default
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [widgetsResponse, statsResponse] = await Promise.all([
        api.get('/api/enabled-widgets/'),
        api.get('/api/dashboard-stats/')
      ]);

      setWidgets(widgetsResponse.data);
      setStats(statsResponse.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Generate layout from widgets
  const generateLayout = () => {
    return widgets.map((widget, index) => ({
      i: widget.id.toString(),
      x: (index % 4) * 3,
      y: Math.floor(index / 4) * 2,
      w: widget.width || 3,
      h: widget.height || 2,
      minW: 1,
      minH: 1,
    }));
  };

  const [layout, setLayout] = useState([]);

  useEffect(() => {
    if (widgets.length > 0) {
      setLayout(generateLayout());
    }
  }, [widgets]);

  const onLayoutChange = (newLayout) => {
    if (!isLocked) {
      setLayout(newLayout);
      // TODO: Save layout to backend/localStorage
      console.log('Layout changed:', newLayout);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white px-8 py-4 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-indigo-100'} mt-1 text-sm`}>
              Real-time insights and metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Lock/Unlock Layout */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title={isLocked ? 'Unlock Layout' : 'Lock Layout'}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isLocked ? 'Locked' : 'Unlocked'}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {/* Add Widget */}
            <button
              onClick={() => navigate('/widget-management')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Add Widget"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>

            {/* Widget Settings */}
            <button
              onClick={() => navigate('/widget-management')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Manage Widgets"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            {/* Export */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Export Dashboard"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-auto p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {widgets.length === 0 ? (
          <div className="text-center py-12 card">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Widgets Enabled</h3>
            <p className="text-gray-600 mb-4">
              Enable widgets to customize your dashboard
            </p>
            <button
              onClick={() => navigate('/widget-management')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Manage Widgets
            </button>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            {!isLocked && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                <Unlock className="w-5 h-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Dashboard Unlocked - Drag widgets to rearrange
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Click "Lock" to save your layout
                  </p>
                </div>
              </div>
            )}

            {/* Grid Layout */}
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={150}
              width={1200}
              isDraggable={!isLocked}
              isResizable={!isLocked}
              onLayoutChange={onLayoutChange}
              draggableHandle=".drag-handle"
            >
              {widgets.map(widget => (
                <div
                  key={widget.id}
                  className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}
                >
                  {/* Drag Handle */}
                  {!isLocked && (
                    <div className="drag-handle bg-gray-100 border-b px-4 py-2 cursor-move hover:bg-gray-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          ⋮⋮ {widget.title}
                        </span>
                        <span className="text-xs text-gray-500">Drag to move</span>
                      </div>
                    </div>
                  )}

                  {/* Widget Content */}
                  <div className={`${!isLocked ? 'h-[calc(100%-48px)]' : 'h-full'} overflow-auto`}>
                    <WidgetRenderer
                      widget={widget}
                      stats={stats}
                      onRefresh={fetchDashboardData}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              ))}
            </GridLayout>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;