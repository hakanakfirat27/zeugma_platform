// frontend/src/components/widgets/IPBlockedWidget.jsx
import { useState, useEffect } from 'react';
import { Ban, Shield, Clock, MapPin, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const IPBlockedWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/blocked-ips/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching blocked IPs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${data?.active_blocks > 0 ? 'bg-red-50' : 'bg-green-50'} rounded-lg flex items-center justify-center`}>
            <Ban className={`w-5 h-5 ${data?.active_blocks > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Blocked IPs</h3>
            <p className="text-xs text-gray-500">Currently blocked addresses</p>
          </div>
        </div>
        {data?.active_blocks === 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <Shield className="w-3 h-3" />
            All Clear
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`${data?.active_blocks > 0 ? 'bg-red-50' : 'bg-green-50'} rounded-lg p-3 text-center`}>
              <p className={`text-2xl font-bold ${data?.active_blocks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <AnimatedCounter value={data?.active_blocks || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">
                <AnimatedCounter value={data?.total_blocked || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                <AnimatedCounter value={data?.blocked_24h || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
          </div>

          {/* Recently Blocked List */}
          {data?.recent_blocks && data.recent_blocks.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Recently Blocked</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {data.recent_blocks.slice(0, 4).map((block, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span className="font-mono font-medium text-gray-700">{block.ip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{block.attempts} attempts</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{formatTimeAgo(block.blocked_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 bg-green-50 rounded-lg">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-1" />
              <p className="text-sm text-green-700">No blocked IPs</p>
              <p className="text-xs text-green-600">System is secure</p>
            </div>
          )}

          {/* Auto-unblock Info */}
          {data?.auto_unblock_enabled && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Auto-unblock after {data.block_duration || '30 minutes'}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IPBlockedWidget;
