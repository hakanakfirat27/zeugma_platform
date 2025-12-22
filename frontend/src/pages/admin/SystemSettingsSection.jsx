// frontend/src/pages/admin/SystemSettingsSection.jsx
// Comprehensive System Settings Section for Admin Settings Page

import { useState, useEffect, useCallback } from 'react';
import {
  Server, Database, HardDrive, Cpu, Zap, Clock, Activity,
  RefreshCw, Check, AlertTriangle, AlertCircle, XCircle,
  Settings, ChevronDown, ChevronRight, Trash2, Play,
  Info, Terminal, FileText, Mail, Globe, Shield,
  BarChart3, PieChart, TrendingUp, Gauge, Layers,
  CheckCircle, Monitor, Cloud, Box, Package
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

// ============================================
// ICON MAPPING
// ============================================
const iconMap = {
  'database': Database,
  'zap': Zap,
  'clock': Clock,
  'mail': Mail,
  'hard-drive': HardDrive,
  'cpu': Cpu,
  'server': Server,
  'activity': Activity,
  'shield': Shield,
  'globe': Globe,
};

const getIcon = (iconName) => iconMap[iconName] || Server;

// ============================================
// STATUS COLORS
// ============================================
const statusColors = {
  healthy: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
  warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
  error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  unknown: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

const colorMap = {
  green: statusColors.healthy,
  yellow: statusColors.warning,
  red: statusColors.error,
  gray: statusColors.unknown,
};

// ============================================
// SYSTEM SETTINGS SECTION
// ============================================
const SystemSettingsSection = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overview, setOverview] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [perfStats, setPerfStats] = useState(null);
  const [envInfo, setEnvInfo] = useState(null);

  const fetchAllData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, dbRes, cacheRes, perfRes, envRes] = await Promise.all([
        api.get('/dashboard/api/admin/system/overview/'),
        api.get('/dashboard/api/admin/system/database/'),
        api.get('/dashboard/api/admin/system/cache/'),
        api.get('/dashboard/api/admin/system/performance/'),
        api.get('/dashboard/api/admin/system/environment/')
      ]);

      setOverview(overviewRes.data);
      setDbStats(dbRes.data);
      setCacheStats(cacheRes.data);
      setPerfStats(perfRes.data);
      setEnvInfo(envRes.data);
    } catch (error) {
      console.error('Error fetching system data:', error);
      toast.error('Failed to load system information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'cache', name: 'Cache', icon: Zap },
    { id: 'performance', name: 'Performance', icon: Gauge },
    { id: 'maintenance', name: 'Maintenance', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Dashboard */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {overview.components.map((component, index) => {
            const Icon = getIcon(component.icon);
            const colors = colorMap[component.color] || statusColors.unknown;

            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                        {component.name}
                      </p>
                    </div>
                    <p className={`text-xs mt-0.5 ${colors.text} truncate`}>
                      {component.status === 'healthy' ? 'Healthy' : component.status === 'warning' ? 'Warning' : component.status === 'error' ? 'Error' : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        <button
          onClick={() => fetchAllData(true)}
          disabled={refreshing}
          className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
          title="Refresh all data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          overview={overview}
          dbStats={dbStats}
          cacheStats={cacheStats}
          perfStats={perfStats}
          envInfo={envInfo}
        />
      )}
      {activeTab === 'database' && <DatabaseTab dbStats={dbStats} onRefresh={() => fetchAllData(true)} />}
      {activeTab === 'cache' && <CacheTab cacheStats={cacheStats} toast={toast} onRefresh={() => fetchAllData(true)} />}
      {activeTab === 'performance' && <PerformanceTab perfStats={perfStats} />}
      {activeTab === 'maintenance' && <MaintenanceTab toast={toast} onRefresh={() => fetchAllData(true)} />}
    </div>
  );
};

// ============================================
// OVERVIEW TAB
// ============================================
const OverviewTab = ({ overview, dbStats, cacheStats, perfStats, envInfo }) => {
  return (
    <div className="space-y-6">
      {/* Health Components Detail */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          System Health Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overview?.components.map((component, index) => {
            const Icon = getIcon(component.icon);
            const colors = colorMap[component.color] || statusColors.unknown;

            return (
              <div
                key={index}
                className={`p-4 rounded-xl border ${
                  component.color === 'green' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' :
                  component.color === 'yellow' ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' :
                  component.color === 'red' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
                  'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">{component.name}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                        {component.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{component.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Database</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Size</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {dbStats?.size?.display || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tables</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {dbStats?.tables_count || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Migrations</span>
              <span className={`text-sm font-medium ${
                dbStats?.migrations?.pending > 0 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {dbStats?.migrations?.pending > 0 
                  ? `${dbStats.migrations.pending} pending` 
                  : 'Up to date'}
              </span>
            </div>
          </div>
        </div>

        {/* Cache Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Cache</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {cacheStats?.type || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
              <span className={`text-sm font-medium ${
                cacheStats?.status === 'operational' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {cacheStats?.status === 'operational' ? 'Operational' : cacheStats?.status || 'Unknown'}
              </span>
            </div>
            {cacheStats?.hit_rate !== null && cacheStats?.hit_rate !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Hit Rate</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {cacheStats.hit_rate}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Performance Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">CPU Usage</span>
              <span className={`text-sm font-medium ${
                (perfStats?.system?.cpu_percent || 0) > 80 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {perfStats?.system?.cpu_percent?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Memory</span>
              <span className={`text-sm font-medium ${
                (perfStats?.system?.memory?.percent || 0) > 80 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {perfStats?.system?.memory?.percent?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Disk</span>
              <span className={`text-sm font-medium ${
                (perfStats?.system?.disk?.percent || 0) > 80 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {perfStats?.system?.disk?.percent?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      {envInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Environment Configuration
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Debug Mode</p>
              <p className={`text-sm font-medium mt-1 ${envInfo.debug_mode ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                {envInfo.debug_mode ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Database</p>
              <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{envInfo.database_engine}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Cache</p>
              <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{envInfo.cache_backend}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Timezone</p>
              <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{envInfo.timezone}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Installed Apps</p>
              <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{envInfo.installed_apps}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Celery</p>
              <p className={`text-sm font-medium mt-1 ${envInfo.celery_broker === 'configured' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {envInfo.celery_broker}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Channels</p>
              <p className={`text-sm font-medium mt-1 ${envInfo.channels_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {envInfo.channels_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">CORS</p>
              <p className={`text-sm font-medium mt-1 ${envInfo.cors_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {envInfo.cors_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// DATABASE TAB
// ============================================
const DatabaseTab = ({ dbStats, onRefresh }) => {
  if (!dbStats) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          Connection Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Engine</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{dbStats.connection?.engine}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Database Name</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white truncate" title={dbStats.connection?.name}>
              {dbStats.connection?.name}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Host</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{dbStats.connection?.host}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Port</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{dbStats.connection?.port}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <p className="text-sm font-medium mt-1 text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {dbStats.connection?.status}
            </p>
          </div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dbStats.size?.display || 'N/A'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Database Size</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dbStats.tables_count || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tables</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dbStats.indexes_count || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Indexes</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              dbStats.migrations?.pending > 0 
                ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              <FileText className={`w-5 h-5 ${
                dbStats.migrations?.pending > 0 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-green-600 dark:text-green-400'
              }`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dbStats.migrations?.applied || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Migrations {dbStats.migrations?.pending > 0 && `(${dbStats.migrations.pending} pending)`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tables */}
      {dbStats.top_tables && dbStats.top_tables.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Largest Tables
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Table Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {dbStats.top_tables.map((table, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {table.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {table.size}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {table.rows?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// CACHE TAB
// ============================================
const CacheTab = ({ cacheStats, toast, onRefresh }) => {
  const [clearing, setClearing] = useState(false);

  const handleClearCache = async (type = 'all') => {
    if (!confirm(`Are you sure you want to clear ${type === 'all' ? 'all cache' : type}?`)) {
      return;
    }

    setClearing(true);
    try {
      const response = await api.post('/dashboard/api/admin/system/cache/clear/', { type });
      if (response.data.success) {
        toast.success(response.data.message);
        onRefresh();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  if (!cacheStats) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cache Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Cache Configuration
          </h3>
          <button
            onClick={() => handleClearCache('all')}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
          >
            {clearing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear All Cache
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Backend</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{cacheStats.backend}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white">{cacheStats.type}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <p className={`text-sm font-medium mt-1 flex items-center gap-1 ${
              cacheStats.status === 'operational' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                cacheStats.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></span>
              {cacheStats.status}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
            <p className="text-sm font-medium mt-1 text-gray-900 dark:text-white truncate" title={cacheStats.location}>
              {cacheStats.location}
            </p>
          </div>
        </div>
      </div>

      {/* Redis-specific stats */}
      {cacheStats.type === 'Redis' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{cacheStats.keys_count || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cached Keys</p>
              </div>
            </div>
          </div>
          {cacheStats.memory_used && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{cacheStats.memory_used}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Memory Used</p>
                </div>
              </div>
            </div>
          )}
          {cacheStats.hit_rate !== null && cacheStats.hit_rate !== undefined && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{cacheStats.hit_rate}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hit Rate</p>
                </div>
              </div>
            </div>
          )}
          {cacheStats.connected_clients !== undefined && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{cacheStats.connected_clients}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Connected Clients</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cache Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">About Cache</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Caching improves application performance by storing frequently accessed data in memory. 
              Clearing the cache will force the application to regenerate cached data, which may temporarily 
              impact performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PERFORMANCE TAB
// ============================================
const PerformanceTab = ({ perfStats }) => {
  if (!perfStats) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* System Resources */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-orange-500" />
          System Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Usage</span>
              <span className={`text-sm font-bold ${
                perfStats.system.cpu_percent >= 90 ? 'text-red-600' :
                perfStats.system.cpu_percent >= 70 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {perfStats.system.cpu_percent?.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getUsageColor(perfStats.system.cpu_percent)}`}
                style={{ width: `${perfStats.system.cpu_percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {perfStats.system.cpu_count} CPU cores
            </p>
          </div>

          {/* Memory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory Usage</span>
              <span className={`text-sm font-bold ${
                perfStats.system.memory.percent >= 90 ? 'text-red-600' :
                perfStats.system.memory.percent >= 70 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {perfStats.system.memory.percent?.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getUsageColor(perfStats.system.memory.percent)}`}
                style={{ width: `${perfStats.system.memory.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {perfStats.system.memory.available_display} available of {perfStats.system.memory.total_display}
            </p>
          </div>

          {/* Disk */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disk Usage</span>
              <span className={`text-sm font-bold ${
                perfStats.system.disk.percent >= 90 ? 'text-red-600' :
                perfStats.system.disk.percent >= 70 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {perfStats.system.disk.percent?.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getUsageColor(perfStats.system.disk.percent)}`}
                style={{ width: `${perfStats.system.disk.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {perfStats.system.disk.free_display} free of {perfStats.system.disk.total_display}
            </p>
          </div>
        </div>
      </div>

      {/* Process & Python Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Process */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Application Process
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Memory Usage</p>
              <p className="text-lg font-bold mt-1 text-gray-900 dark:text-white">
                {perfStats.process.memory_mb} MB
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">CPU Usage</p>
              <p className="text-lg font-bold mt-1 text-gray-900 dark:text-white">
                {perfStats.process.cpu_percent}%
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Threads</p>
              <p className="text-lg font-bold mt-1 text-gray-900 dark:text-white">
                {perfStats.process.threads}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Connections</p>
              <p className="text-lg font-bold mt-1 text-gray-900 dark:text-white">
                {perfStats.process.connections}
              </p>
            </div>
          </div>
        </div>

        {/* Python & System Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-500" />
            Runtime Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">Python Version</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {perfStats.python.version}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">Django Version</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {perfStats.python.django_version}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">Platform</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-48" title={perfStats.system.platform}>
                {perfStats.system.platform}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">Hostname</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {perfStats.system.hostname}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAINTENANCE TAB
// ============================================
const MaintenanceTab = ({ toast, onRefresh }) => {
  const [runningTask, setRunningTask] = useState(null);
  const [taskResults, setTaskResults] = useState({});

  const maintenanceTasks = [
    {
      id: 'clear_sessions',
      name: 'Clear Expired Sessions',
      description: 'Remove all expired session records from the database',
      icon: Clock,
      color: 'blue',
      warning: false
    },
    {
      id: 'clear_cache',
      name: 'Clear Application Cache',
      description: 'Clear all cached data to force fresh data retrieval',
      icon: Zap,
      color: 'purple',
      warning: true
    },
    {
      id: 'vacuum_db',
      name: 'Vacuum Database',
      description: 'Reclaim storage and update statistics (PostgreSQL only)',
      icon: Database,
      color: 'green',
      warning: false
    },
    {
      id: 'check_migrations',
      name: 'Check Migrations',
      description: 'Verify database migration status',
      icon: FileText,
      color: 'orange',
      warning: false
    },
    {
      id: 'collect_static',
      name: 'Collect Static Files',
      description: 'Collect all static files to the static directory',
      icon: Package,
      color: 'teal',
      warning: false
    }
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', button: 'bg-blue-600 hover:bg-blue-700' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', button: 'bg-purple-600 hover:bg-purple-700' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', button: 'bg-green-600 hover:bg-green-700' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', button: 'bg-orange-600 hover:bg-orange-700' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', button: 'bg-teal-600 hover:bg-teal-700' },
  };

  const runTask = async (taskId) => {
    const task = maintenanceTasks.find(t => t.id === taskId);
    if (task?.warning) {
      if (!confirm(`Are you sure you want to ${task.name.toLowerCase()}? This action may affect system performance temporarily.`)) {
        return;
      }
    }

    setRunningTask(taskId);
    setTaskResults(prev => ({ ...prev, [taskId]: null }));

    try {
      const response = await api.post('/dashboard/api/admin/system/maintenance/', { task: taskId });
      setTaskResults(prev => ({ ...prev, [taskId]: response.data }));
      
      if (response.data.success) {
        toast.success(response.data.message);
        onRefresh();
      } else {
        toast.error(response.data.message || 'Task failed');
      }
    } catch (error) {
      console.error('Error running maintenance task:', error);
      toast.error('Failed to run maintenance task');
      setTaskResults(prev => ({ ...prev, [taskId]: { success: false, message: 'Failed to execute task' } }));
    } finally {
      setRunningTask(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Maintenance Tasks</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              These tasks help maintain optimal system performance. Some tasks may temporarily impact 
              performance while running. It's recommended to run these during low-traffic periods.
            </p>
          </div>
        </div>
      </div>

      {/* Task Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {maintenanceTasks.map((task) => {
          const Icon = task.icon;
          const colors = colorClasses[task.color];
          const result = taskResults[task.id];
          const isRunning = runningTask === task.id;

          return (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{task.name}</h4>
                    {task.warning && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" title="May affect performance" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                  
                  {/* Result Display */}
                  {result && (
                    <div className={`mt-3 p-2 rounded-lg text-sm ${
                      result.success 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {result.message}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => runTask(task.id)}
                  disabled={isRunning || runningTask !== null}
                  className={`px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm ${colors.button}`}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          System Information
        </h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Database Vacuum:</strong> Reclaims disk space and updates query planner statistics. 
            PostgreSQL-only feature that helps maintain optimal query performance.
          </p>
          <p>
            <strong>Clear Sessions:</strong> Removes expired user sessions from the database. 
            This doesn't affect currently logged-in users with valid sessions.
          </p>
          <p>
            <strong>Clear Cache:</strong> Removes all cached data. The cache will be rebuilt automatically 
            as users access the application, which may cause temporary slowdowns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsSection;
