// frontend/src/components/widgets/SystemResourcesWidget.jsx
import { useState, useEffect } from 'react';
import { Cpu, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import api from '../../utils/api';

const SystemResourcesWidget = () => {
  const [resources, setResources] = useState({
    cpu: null,
    ram: null,
    disk: null,
    loading: true,
    error: false
  });

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/system-health/');
        setResources({
          cpu: response.data?.cpu_usage,
          ram: response.data?.memory_usage,
          disk: response.data?.disk_usage,
          loading: false,
          error: false
        });
      } catch (error) {
        setResources({
          cpu: null,
          ram: null,
          disk: null,
          loading: false,
          error: true
        });
      }
    };
    fetchResources();
  }, []);

  const getUsageColor = (value) => {
    if (value === null) return 'bg-gray-200';
    if (value < 60) return 'bg-green-500';
    if (value < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (value) => {
    if (value === null) return 'text-gray-500';
    if (value < 60) return 'text-green-600';
    if (value < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallStatus = () => {
    if (resources.error) return 'error';
    if (resources.cpu === null && resources.ram === null && resources.disk === null) return 'unavailable';
    const maxUsage = Math.max(resources.cpu || 0, resources.ram || 0, resources.disk || 0);
    if (maxUsage >= 90) return 'critical';
    if (maxUsage >= 75) return 'warning';
    return 'healthy';
  };

  const getStatusDisplay = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle, text: 'Healthy', color: 'text-green-600', bg: 'bg-green-50' };
      case 'warning':
        return { icon: AlertTriangle, text: 'Warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'critical':
        return { icon: XCircle, text: 'Critical', color: 'text-red-600', bg: 'bg-red-50' };
      case 'error':
        return { icon: XCircle, text: 'Error', color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { icon: AlertTriangle, text: 'N/A', color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  const ResourceBar = ({ label, value }) => (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-xs font-bold ${getTextColor(value)}`}>
          {value !== null ? `${value.toFixed(1)}%` : 'N/A'}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getUsageColor(value)}`}
          style={{ width: `${value || 0}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">System Resources</h3>
            <p className="text-xs text-gray-500">CPU, RAM, and disk usage</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 ${statusDisplay.bg} rounded-full`}>
          <StatusIcon className={`w-3 h-3 ${statusDisplay.color}`} />
          <span className={`text-xs font-medium ${statusDisplay.color}`}>{statusDisplay.text}</span>
        </div>
      </div>

      {resources.loading ? (
        <div className="flex items-center justify-center h-16">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : resources.error ? (
        <div className="text-center py-4">
          <p className="text-sm text-red-500">Unable to fetch resource data</p>
        </div>
      ) : (
        <div className="flex gap-4">
          <ResourceBar label="CPU" value={resources.cpu} />
          <ResourceBar label="RAM" value={resources.ram} />
          <ResourceBar label="Disk" value={resources.disk} />
        </div>
      )}
    </div>
  );
};

export default SystemResourcesWidget;
