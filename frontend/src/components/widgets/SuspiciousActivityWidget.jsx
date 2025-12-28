// frontend/src/components/widgets/SuspiciousActivityWidget.jsx
import { useState, useEffect } from 'react';
import { 
  AlertOctagon, ShieldAlert, Eye, MapPin, Clock, 
  User, Globe, Smartphone, AlertTriangle, CheckCircle 
} from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const SuspiciousActivityWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/suspicious-activity/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching suspicious activity:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-500' };
      case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-500' };
      case 'medium': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'text-yellow-500' };
      default: return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500' };
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'brute_force': return ShieldAlert;
      case 'location_change': return Globe;
      case 'multiple_devices': return Smartphone;
      case 'unusual_time': return Clock;
      case 'rate_limit': return AlertTriangle;
      default: return AlertOctagon;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const alertCount = data?.total_alerts || 0;
  const hasAlerts = alertCount > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${hasAlerts ? 'bg-red-50' : 'bg-green-50'} rounded-lg flex items-center justify-center`}>
            <AlertOctagon className={`w-5 h-5 ${hasAlerts ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Suspicious Activity</h3>
            <p className="text-xs text-gray-500">Security alerts & anomalies</p>
          </div>
        </div>
        {!hasAlerts && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Secure
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      ) : hasAlerts ? (
        <>
          {/* Alert Summary */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-600">
                <AnimatedCounter value={data?.critical_count || 0} duration={600} />
              </p>
              <p className="text-xs text-red-600">Critical</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-orange-600">
                <AnimatedCounter value={data?.high_count || 0} duration={600} />
              </p>
              <p className="text-xs text-orange-600">High</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-yellow-600">
                <AnimatedCounter value={data?.medium_count || 0} duration={600} />
              </p>
              <p className="text-xs text-yellow-600">Medium</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-600">
                <AnimatedCounter value={data?.low_count || 0} duration={600} />
              </p>
              <p className="text-xs text-blue-600">Low</p>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data?.recent_alerts?.slice(0, 5).map((alert, index) => {
              const Icon = getActivityIcon(alert.type);
              const colors = getSeverityColor(alert.severity);
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-2 rounded-lg ${colors.bg}`}
                >
                  <Icon className={`w-4 h-4 ${colors.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-medium ${colors.text} truncate`}>
                        {alert.title}
                      </p>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTimeAgo(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      {alert.description}
                    </p>
                    {alert.user && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{alert.user}</span>
                        {alert.ip && (
                          <>
                            <span>•</span>
                            <MapPin className="w-3 h-3" />
                            <span>{alert.ip}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* View All Link */}
          {data?.total_alerts > 5 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-center">
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                View all {data.total_alerts} alerts →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm font-medium text-green-700">No Suspicious Activity</p>
          <p className="text-xs text-gray-500 mt-1">System is operating normally</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-sm font-bold text-gray-700">
                <AnimatedCounter value={data?.resolved_24h || 0} duration={600} />
              </p>
              <p className="text-xs text-gray-500">Resolved (24h)</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-sm font-bold text-gray-700">
                <AnimatedCounter value={data?.total_checked || 0} duration={600} />
              </p>
              <p className="text-xs text-gray-500">Events Checked</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuspiciousActivityWidget;
