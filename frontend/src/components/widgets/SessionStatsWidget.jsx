// frontend/src/components/widgets/SessionStatsWidget.jsx
import { useState, useEffect } from 'react';
import { Timer, Users, Clock, Smartphone, Monitor, Tablet } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const SessionStatsWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/session-stats/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching session stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDeviceIcon = (device) => {
    if (device?.toLowerCase().includes('mobile')) return Smartphone;
    if (device?.toLowerCase().includes('tablet')) return Tablet;
    return Monitor;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Timer className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Session Stats</h3>
            <p className="text-xs text-gray-500">User session analytics</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Active Sessions</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={data?.active_sessions || 0} duration={800} />
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {data?.avg_duration || 'N/A'}
              </p>
            </div>
          </div>

          {/* Device Breakdown */}
          {data?.by_device && Object.keys(data.by_device).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">By Device</p>
              <div className="space-y-2">
                {Object.entries(data.by_device).map(([device, count]) => {
                  const Icon = getDeviceIcon(device);
                  const total = Object.values(data.by_device).reduce((a, b) => a + b, 0);
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  
                  return (
                    <div key={device} className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600 w-16 truncate">{device}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-900">{data?.total_today || 0}</p>
              <p className="text-xs text-gray-500">Sessions Today</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-900">{data?.peak_hour || 'N/A'}</p>
              <p className="text-xs text-gray-500">Peak Hour</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SessionStatsWidget;
