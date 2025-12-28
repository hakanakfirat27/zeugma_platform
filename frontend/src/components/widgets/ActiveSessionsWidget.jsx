// frontend/src/components/widgets/ActiveSessionsWidget.jsx
import { useState, useEffect } from 'react';
import { Users, Monitor, Smartphone, Clock, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const ActiveSessionsWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await api.get('/api/dashboard/widgets/active-sessions/');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center relative">
            <Users className="w-5 h-5 text-cyan-600" />
            {data?.active_count > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Active Sessions</h3>
            <p className="text-xs text-gray-500">Currently connected users</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Count */}
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-cyan-600">
              <AnimatedCounter value={data?.active_count || 0} duration={800} />
            </p>
            <p className="text-sm text-gray-500 mt-1">active sessions</p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <Monitor className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-700">
                <AnimatedCounter value={data?.desktop_count || 0} duration={600} />
              </p>
              <p className="text-xs text-gray-500">Desktop</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <Smartphone className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-700">
                <AnimatedCounter value={data?.mobile_count || 0} duration={600} />
              </p>
              <p className="text-xs text-gray-500">Mobile</p>
            </div>
          </div>

          {/* Session Info */}
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Avg. Duration
              </span>
              <span className="font-medium text-gray-700">{data?.avg_duration || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Peak Today</span>
              <span className="font-medium text-gray-700">{data?.peak_today || 0} sessions</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">New Today</span>
              <span className="font-medium text-green-600">+{data?.new_today || 0}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActiveSessionsWidget;
