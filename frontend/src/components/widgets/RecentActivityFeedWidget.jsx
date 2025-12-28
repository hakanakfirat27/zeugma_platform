// frontend/src/components/widgets/RecentActivityFeedWidget.jsx
import { useState, useEffect } from 'react';
import { 
  Activity, UserPlus, FileText, Database, Settings as SettingsIcon,
  Building, LogIn, Eye, Edit, Trash2, Check, Clock
} from 'lucide-react';
import api from '../../utils/api';

const RecentActivityFeedWidget = ({ stats }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await api.get('/api/dashboard/widgets/recent-activity/?limit=10');
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Fallback to comprehensive stats
      if (stats?.recent_logins) {
        const loginActivities = stats.recent_logins.map(login => ({
          id: login.timestamp,
          action: 'LOGIN',
          user: login.user,
          created_at: login.timestamp,
          description: `User logged in from ${login.ip_address || 'unknown location'}`
        }));
        setActivities(loginActivities);
      } else {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getActivityStyle = (action) => {
    const styles = {
      'LOGIN': { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100' },
      'LOGOUT': { icon: LogIn, color: 'text-gray-600', bg: 'bg-gray-100' },
      'COMPANY_VIEWED': { icon: Eye, color: 'text-purple-600', bg: 'bg-purple-100' },
      'COMPANY_CREATED': { icon: Building, color: 'text-green-600', bg: 'bg-green-100' },
      'COMPANY_UPDATED': { icon: Edit, color: 'text-amber-600', bg: 'bg-amber-100' },
      'REPORT_VIEWED': { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
      'REPORT_CREATED': { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-100' },
      'USER_REGISTERED': { icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-100' },
      'SETTINGS_CHANGED': { icon: SettingsIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
      'VERIFICATION_COMPLETED': { icon: Check, color: 'text-green-600', bg: 'bg-green-100' },
    };
    return styles[action] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <p className="text-sm text-gray-500">Real-time system activity</p>
          </div>
          <Activity className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <p className="text-sm text-gray-500">Real-time system activity</p>
          </div>
          <Activity className="w-6 h-6 text-gray-400" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Clock className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No recent activity</p>
          <p className="text-gray-400 text-xs">Activities will appear here as users interact with the system</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
          <p className="text-sm text-gray-500">Real-time system activity</p>
        </div>
        <Activity className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto max-h-80">
        {activities.map((activity, index) => {
          const style = getActivityStyle(activity.action);
          const Icon = style.icon;
          return (
            <div key={activity.id || index} className="flex items-start gap-3 group">
              <div className={`${style.bg} p-2 rounded-lg shrink-0`}>
                <Icon className={`w-4 h-4 ${style.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {activity.description || activity.action?.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{activity.user}</span>
                  {activity.company_name && (
                    <>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-500 truncate">{activity.company_name}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                {formatTime(activity.created_at)}
              </span>
            </div>
          );
        })}
      </div>

      {activities.length >= 10 && (
        <button className="mt-4 w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
          View All Activity
        </button>
      )}
    </div>
  );
};

export default RecentActivityFeedWidget;
