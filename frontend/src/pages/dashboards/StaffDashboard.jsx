// frontend/src/pages/dashboards/StaffDashboard.jsx
// MODIFIED: Removed text-indigo-100 from subtitle props to fix visibility on white header.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { Settings, RefreshCw, Lock, Unlock, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DashboardLayout from '../../components/layout/DashboardLayout';
import WidgetRenderer from '../../components/widgets/WidgetRenderer';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

// Sortable Widget Wrapper Component
const SortableWidget = ({ widget, stats, onRefresh, isLocked }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-6 ${isDragging ? 'z-50 cursor-grabbing' : ''} ${!isLocked ? 'cursor-grab' : ''}`}
    >
      <div className="relative group">
        {!isLocked && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing border border-gray-200"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-gray-600" />
          </div>
        )}
        <div className={!isLocked ? 'pointer-events-none' : ''}>
          <WidgetRenderer widget={widget} stats={stats} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();  // ADD THIS
  const breadcrumbs = getBreadcrumbs(location.pathname);  // ADD THIS  
  const [widgets, setWidgets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const widgetsResponse = await api.get('/api/widgets/');
      const enabledWidgets = widgetsResponse.data
        .filter(w => w.is_enabled)
        .sort((a, b) => a.display_order - b.display_order);
      setWidgets(enabledWidgets);
      try {
        const statsResponse = await api.get('/api/dashboard/');
        setStats(statsResponse.data);
      } catch (statsError) {
        console.log('Stats endpoint not available, using default data');
        setStats({
          total_records: 0,
          total_clients: 0,
          staff_members: 0,
          guest_users: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = widgets.findIndex(w => w.id === active.id);
    const newIndex = widgets.findIndex(w => w.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      const updatedWidgets = newWidgets.map((widget, index) => ({
        ...widget,
        display_order: index + 1
      }));
      setWidgets(updatedWidgets);
      await saveWidgetOrder(updatedWidgets);
    }
  };

  const saveWidgetOrder = async (updatedWidgets) => {
    try {
      setIsSaving(true);
      const orderData = updatedWidgets.map(w => ({ id: w.id, display_order: w.display_order }));
      await api.post('/api/widgets/update_order/', { widgets: orderData });
      console.log('Widget order saved successfully');
    } catch (error) {
      console.error('Error saving widget order:', error);
      await fetchDashboardData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading...">
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const activeWidget = widgets.find(w => w.id === activeId);

  const organizeWidgetsIntoRows = () => {
    // ... (This function is unchanged)
    const rows = [];
    let currentRow = [];
    let currentRowWidth = 0;
    const maxRowWidth = 4;
    widgets.forEach((widget) => {
      const widgetWidth = widget.width || 1;
      if (currentRowWidth + widgetWidth <= maxRowWidth) {
        currentRow.push(widget);
        currentRowWidth += widgetWidth;
      } else {
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [widget];
        currentRowWidth = widgetWidth;
      }
    });
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    return rows;
  };

  const widgetRows = organizeWidgetsIntoRows();

  const dashboardHeaderActions = (
    <>
      <button
        onClick={toggleLock}
        className={`px-4 py-2.5 backdrop-blur-sm rounded-lg transition-all flex items-center gap-2 font-medium ${
          isLocked
            ? 'bg-white/10 hover:bg-white/20'
            : 'bg-yellow-500/20 hover:bg-yellow-500/30 border-2 border-yellow-400'
        }`}
        title={isLocked ? 'Unlock to reorder widgets' : 'Lock dashboard'}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Lock'}</span>
      </button>
      <button
        onClick={handleRefresh}
        disabled={refreshing || isSaving}
        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all flex items-center gap-2 font-medium disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
      <button
        onClick={() => navigate('/widget-management')}
        className="px-4 py-2.5 bg-white/90 hover:bg-white text-indigo-600 rounded-lg transition-all flex items-center gap-2 font-semibold shadow-lg"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </button>
    </>
  );

  // --- MODIFIED: Define the header TOP subtitle (Time) ---
  const dashboardSubtitleTop = (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
      {/* --- MODIFIED: Removed 'text-indigo-100' --- */}
      <span className="text-sm font-medium">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </span>
    </div>
  );

  // --- MODIFIED: Define the header BOTTOM subtitle (Insights) ---
  const dashboardSubtitleBottom = (
    // --- MODIFIED: Removed 'text-indigo-100' ---
    <p className="text-sm">
      {isLocked ? 'Real-time insights and metrics' : '🎯 Drag widgets to reorder'}
    </p>
  );

  return (
    <DashboardLayout
      pageTitle="Analytics Dashboard"
      headerActions={dashboardHeaderActions}
      //pageSubtitleTop={dashboardSubtitleTop}
      pageSubtitleBottom={dashboardSubtitleBottom}
      breadcrumbs={breadcrumbs}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">

          {/* The 'isSaving' message remains, with its own margin */}
          {isSaving && (
            <div className="mb-6 flex items-center gap-2 text-indigo-600 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving widget order...</span>
            </div>
          )}

          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {!isLocked && widgets.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">Edit Mode Active</p>
                  <p className="text-sm text-yellow-700">
                    Hover over any widget and drag the grip handle to reorder. Click "Lock" when done.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {widgetRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
                >
                  {row.map((widget) => (
                    <div
                      key={widget.id}
                      className={`
                        ${widget.width === 2 ? 'md:col-span-2' : ''}
                        ${widget.height === 2 ? 'md:row-span-2' : ''}
                      `}
                    >
                      <SortableWidget
                        widget={widget}
                        stats={stats}
                        onRefresh={handleRefresh}
                        isLocked={isLocked}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </SortableContext>
            <DragOverlay>
              {activeWidget ? (
                <div className="opacity-90 cursor-grabbing max-w-md">
                  <WidgetRenderer
                    widget={activeWidget}
                    stats={stats}
                    onRefresh={handleRefresh}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {widgets.length === 0 && (
            <div className="text-center py-16">
              <Settings className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Widgets Enabled
              </h3>
              <p className="text-gray-500 mb-6">
                Enable widgets to start seeing your analytics
              </p>
              <button
                onClick={() => navigate('/widget-management')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
              >
                Configure Widgets
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* All dark mode styles have been removed */
      `}</style>
    </DashboardLayout>
  );
};

export default StaffDashboard;