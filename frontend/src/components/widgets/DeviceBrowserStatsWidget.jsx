// frontend/src/components/widgets/DeviceBrowserStatsWidget.jsx
import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, Globe, Chrome, Apple } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const DeviceBrowserStatsWidget = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('devices');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/device-browser-stats/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching device/browser data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDeviceIcon = (device) => {
    const deviceLower = device?.toLowerCase() || '';
    if (deviceLower.includes('mobile') || deviceLower.includes('phone')) return Smartphone;
    if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) return Tablet;
    return Monitor;
  };

  const getBrowserIcon = (browser) => {
    const browserLower = browser?.toLowerCase() || '';
    if (browserLower.includes('chrome')) return Chrome;
    if (browserLower.includes('safari')) return Apple;
    return Globe;
  };

  const getDeviceColor = (index) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  const getBrowserColor = (index) => {
    const colors = ['bg-cyan-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
    return colors[index % colors.length];
  };

  const renderBarChart = (items, getIcon, getColor) => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 text-sm">
          No data available
        </div>
      );
    }

    const maxCount = items[0]?.count || 1;

    return (
      <div className="space-y-3">
        {items.slice(0, 5).map((item, index) => {
          const Icon = getIcon(item.name);
          const percentage = (item.count / maxCount) * 100;
          
          return (
            <div key={item.name || index}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 truncate max-w-32">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getColor(index)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Device & Browser</h3>
            <p className="text-xs text-gray-500">User access patterns</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab('devices')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'devices' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Devices
        </button>
        <button
          onClick={() => setActiveTab('browsers')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'browsers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Browsers
        </button>
        <button
          onClick={() => setActiveTab('os')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'os' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Apple className="w-3.5 h-3.5" />
          OS
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="min-h-40">
          {activeTab === 'devices' && renderBarChart(data?.devices, getDeviceIcon, getDeviceColor)}
          {activeTab === 'browsers' && renderBarChart(data?.browsers, getBrowserIcon, getBrowserColor)}
          {activeTab === 'os' && renderBarChart(data?.operating_systems, getDeviceIcon, getDeviceColor)}
        </div>
      )}

      {/* Total Sessions */}
      {data?.total_sessions && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Based on <span className="font-medium text-gray-700">{data.total_sessions.toLocaleString()}</span> sessions
          </p>
        </div>
      )}
    </div>
  );
};

export default DeviceBrowserStatsWidget;
