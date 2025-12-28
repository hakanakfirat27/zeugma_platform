// frontend/src/components/widgets/FailedLoginsWidget.jsx
import { useState, useEffect } from 'react';
import { ShieldX, TrendingUp, TrendingDown, AlertCircle, User, MapPin } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const FailedLoginsWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/failed-logins-detail/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching failed logins:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAlertLevel = (count) => {
    if (count === 0) return { color: 'text-green-600', bg: 'bg-green-50', icon: 'text-green-500' };
    if (count <= 10) return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'text-yellow-500' };
    return { color: 'text-red-600', bg: 'bg-red-50', icon: 'text-red-500' };
  };

  const alertLevel = data ? getAlertLevel(data.count_24h) : { color: 'text-gray-600', bg: 'bg-gray-50', icon: 'text-gray-500' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${alertLevel.bg} rounded-lg flex items-center justify-center`}>
            <ShieldX className={`w-5 h-5 ${alertLevel.icon}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Failed Logins</h3>
            <p className="text-xs text-gray-500">Last 24 hours</p>
          </div>
        </div>
        {data?.count_24h > 0 && (
          <div className={`w-10 h-10 ${alertLevel.bg} rounded-full flex items-center justify-center`}>
            <AlertCircle className={`w-5 h-5 ${alertLevel.icon}`} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <p className={`text-3xl font-bold ${alertLevel.color}`}>
              <AnimatedCounter value={data?.count_24h || 0} duration={1000} />
            </p>
            {data?.change_percent !== undefined && (
              <div className={`flex items-center gap-1 mt-1 ${
                data.change_percent <= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.change_percent <= 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {data.change_percent > 0 ? '+' : ''}{data.change_percent}% vs yesterday
                </span>
              </div>
            )}
          </div>

          {/* Recent Failed Attempts */}
          {data?.recent_attempts && data.recent_attempts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Recent Attempts</p>
              <div className="space-y-2 max-h-28 overflow-y-auto">
                {data.recent_attempts.slice(0, 3).map((attempt, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-red-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-red-500" />
                      <span className="font-medium text-gray-700 truncate max-w-20">
                        {attempt.username || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{attempt.ip || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-gray-700">
                <AnimatedCounter value={data?.count_7d || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Last 7 days</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-700">
                <AnimatedCounter value={data?.unique_ips || 0} duration={800} />
              </p>
              <p className="text-xs text-gray-500">Unique IPs</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FailedLoginsWidget;
