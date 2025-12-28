// frontend/src/pages/dashboards/StaffDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { 
  Settings, RefreshCw, Lock, Unlock, GripVertical,
  Users, FileText, Database, Activity, 
  FolderKanban, Sparkles
} from 'lucide-react';
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

// Category configuration with icons, colors and gradients
const CATEGORY_CONFIG = {
  USERS: {
    name: 'Users',
    icon: Users,
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    lightGradient: 'from-violet-50 to-fuchsia-50',
    shadowColor: 'shadow-violet-500/25',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-600',
    bgHover: 'hover:bg-violet-50',
    order: 1,
  },
  REPORTS: {
    name: 'Reports',
    icon: FileText,
    gradient: 'from-indigo-500 via-indigo-600 to-blue-600',
    lightGradient: 'from-indigo-50 to-blue-50',
    shadowColor: 'shadow-indigo-500/25',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-600',
    bgHover: 'hover:bg-indigo-50',
    order: 2,
  },
  DATABASE: {
    name: 'Database',
    icon: Database,
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    lightGradient: 'from-emerald-50 to-teal-50',
    shadowColor: 'shadow-emerald-500/25',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-600',
    bgHover: 'hover:bg-emerald-50',
    order: 3,
  },
  ACTIVITY: {
    name: 'Activity',
    icon: Activity,
    gradient: 'from-cyan-500 via-sky-500 to-blue-500',
    lightGradient: 'from-cyan-50 to-blue-50',
    shadowColor: 'shadow-cyan-500/25',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-600',
    bgHover: 'hover:bg-cyan-50',
    order: 4,
  },
  PROJECTS: {
    name: 'Projects',
    icon: FolderKanban,
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    lightGradient: 'from-orange-50 to-yellow-50',
    shadowColor: 'shadow-orange-500/25',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-600',
    bgHover: 'hover:bg-orange-50',
    order: 5,
  },
  SYSTEM: {
    name: 'System',
    icon: Settings,
    gradient: 'from-slate-500 via-gray-500 to-zinc-600',
    lightGradient: 'from-slate-50 to-zinc-50',
    shadowColor: 'shadow-slate-500/25',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-600',
    bgHover: 'hover:bg-slate-50',
    order: 6,
  },
  ANALYTICS: {
    name: 'Analytics',
    icon: Activity,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    lightGradient: 'from-amber-50 to-red-50',
    shadowColor: 'shadow-amber-500/25',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-600',
    bgHover: 'hover:bg-amber-50',
    order: 7,
  },
};

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
      className={`${isDragging ? 'z-50 cursor-grabbing' : ''} ${!isLocked ? 'cursor-grab' : ''}`}
    >
      <div className="relative group h-full">
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
        <div className={`h-full ${!isLocked ? 'pointer-events-none' : ''}`}>
          <WidgetRenderer widget={widget} stats={stats} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
};

// Stunning Tab Card Component
const TabCard = ({ category, config, isActive, count, onClick, index }) => {
  const Icon = config.icon;
  
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex flex-col items-center justify-center p-4 rounded-2xl
        transition-all duration-300 ease-out transform min-h-[100px]
        ${isActive 
          ? `bg-gradient-to-br ${config.gradient} text-white shadow-xl ${config.shadowColor} scale-[1.02]` 
          : `bg-white text-gray-600 hover:shadow-lg ${config.bgHover} border-2 ${config.borderColor} hover:scale-[1.02]`
        }
      `}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Animated glow effect for active tab */}
      {isActive && (
        <>
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradient} blur-xl opacity-30 -z-10`} />
          <div className="absolute top-2 right-2">
            <Sparkles className="w-4 h-4 text-white/70 animate-pulse" />
          </div>
        </>
      )}
      
      {/* Icon */}
      <div className={`
        relative mb-2 p-3 rounded-xl transition-all duration-300
        ${isActive 
          ? 'bg-white/20' 
          : `bg-gradient-to-br ${config.lightGradient}`
        }
      `}>
        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : config.textColor}`} />
      </div>
      
      {/* Tab name */}
      <span className={`
        font-semibold text-sm tracking-wide transition-all duration-300 mb-1
        ${isActive ? 'text-white' : 'text-gray-700'}
      `}>
        {config.name}
      </span>
      
      {/* Badge count */}
      <span className={`
        px-2.5 py-0.5 rounded-full text-xs font-bold transition-all duration-300
        ${isActive 
          ? 'bg-white/25 text-white' 
          : `bg-gradient-to-r ${config.lightGradient} ${config.textColor}`
        }
      `}>
        {count} widgets
      </span>

      {/* Bottom indicator line for active */}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white/50 rounded-full" />
      )}
    </button>
  );
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [widgets, setWidgets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

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
      
      // Set initial active tab to first category with widgets
      if (enabledWidgets.length > 0 && !activeTab) {
        const categories = [...new Set(enabledWidgets.map(w => w.category || 'ANALYTICS'))];
        const sortedCats = categories.sort((a, b) => {
          const orderA = CATEGORY_CONFIG[a]?.order || 99;
          const orderB = CATEGORY_CONFIG[b]?.order || 99;
          return orderA - orderB;
        });
        setActiveTab(sortedCats[0]);
      }
      
      try {
        const statsResponse = await api.get('/api/dashboard/comprehensive/');
        setStats(statsResponse.data);
      } catch (statsError) {
        console.log('Comprehensive stats not available, trying legacy endpoint');
        try {
          const legacyStats = await api.get('/api/dashboard/');
          setStats(legacyStats.data);
        } catch {
          setStats({
            total_companies: 0,
            total_records: 0,
            total_clients: 0,
            staff_members: 0,
            guest_users: 0,
            total_users: 0,
            data_collectors: 0,
            active_subscriptions: 0,
            custom_reports: 0,
          });
        }
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

  // Group widgets by category
  const groupedWidgets = widgets.reduce((acc, widget) => {
    const category = widget.category || 'ANALYTICS';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(widget);
    return acc;
  }, {});

  // Sort categories by their configured order
  const sortedCategories = Object.keys(groupedWidgets).sort((a, b) => {
    const orderA = CATEGORY_CONFIG[a]?.order || 99;
    const orderB = CATEGORY_CONFIG[b]?.order || 99;
    return orderA - orderB;
  });

  // Get widgets for active tab
  const activeWidgets = activeTab ? (groupedWidgets[activeTab] || []) : [];

  // Organize widgets into rows based on their width
  const organizeWidgetsIntoRows = (categoryWidgets) => {
    const rows = [];
    let currentRow = [];
    let currentRowWidth = 0;
    const maxRowWidth = 4;

    categoryWidgets.forEach((widget) => {
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

  const widgetRows = organizeWidgetsIntoRows(activeWidgets);

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
  const activeConfig = CATEGORY_CONFIG[activeTab] || CATEGORY_CONFIG.OVERVIEW;

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

  const dashboardSubtitleBottom = (
    <p className="text-sm">
      {isLocked ? 'Real-time insights and metrics' : '🎯 Drag widgets to reorder'}
    </p>
  );

  return (
    <DashboardLayout
      pageTitle="Analytics Dashboard"
      headerActions={dashboardHeaderActions}
      pageSubtitleBottom={dashboardSubtitleBottom}
      breadcrumbs={breadcrumbs}
    >
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        @keyframes slide-in {
          from { 
            opacity: 0; 
            transform: translateX(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>

      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-gray-100">
        <div className="p-6">
          {isSaving && (
            <div className="mb-6 flex items-center gap-2 text-indigo-600 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving widget order...</span>
            </div>
          )}

          {!isLocked && widgets.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg animate-fade-in-up">
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

          {/* Stunning Tab Cards Grid */}
          <div className="mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {sortedCategories.map((category, index) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.ANALYTICS;
                const count = groupedWidgets[category]?.length || 0;
                
                return (
                  <TabCard
                    key={category}
                    category={category}
                    config={config}
                    isActive={activeTab === category}
                    count={count}
                    onClick={() => setActiveTab(category)}
                    index={index}
                  />
                );
              })}
            </div>
          </div>

          {/* Widgets Grid with DnD */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeWidgets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {widgetRows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up"
                    style={{ animationDelay: `${rowIndex * 100}ms` }}
                  >
                    {row.map((widget, widgetIndex) => (
                      <div
                        key={widget.id}
                        className={`
                          ${widget.width === 2 ? 'md:col-span-2' : ''}
                          ${widget.height === 2 ? 'row-span-2' : ''}
                          animate-slide-in
                        `}
                        style={{ animationDelay: `${(rowIndex * row.length + widgetIndex) * 50}ms` }}
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
              </div>
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

          {/* Empty State for Active Tab */}
          {activeWidgets.length === 0 && activeTab && (
            <div className="text-center py-16 animate-fade-in-up">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${activeConfig.gradient} ${activeConfig.shadowColor} shadow-lg flex items-center justify-center`}>
                {(() => {
                  const Icon = activeConfig.icon;
                  return <Icon className="w-10 h-10 text-white" />;
                })()}
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No {activeConfig.name} Widgets Enabled
              </h3>
              <p className="text-gray-500 mb-6">
                Enable widgets in this category to see them here
              </p>
              <button
                onClick={() => navigate('/widget-management')}
                className={`px-6 py-3 bg-gradient-to-r ${activeConfig.gradient} text-white rounded-xl font-semibold transition-all hover:shadow-lg ${activeConfig.shadowColor} hover:scale-105`}
              >
                Configure Widgets
              </button>
            </div>
          )}

          {/* Global Empty State */}
          {widgets.length === 0 && (
            <div className="text-center py-16 animate-fade-in-up">
              <Settings className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Widgets Enabled
              </h3>
              <p className="text-gray-500 mb-6">
                Enable widgets to start seeing your analytics
              </p>
              <button
                onClick={() => navigate('/widget-management')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold transition-all hover:shadow-lg shadow-indigo-500/25 hover:scale-105"
              >
                Configure Widgets
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
