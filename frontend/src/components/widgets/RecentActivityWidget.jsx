// frontend/src/components/widgets/RecentActivityWidget.jsx
import { useState, useEffect } from 'react';
import { Activity, Building, User, FileText, Clock } from 'lucide-react';
import api from '../../utils/api';

const RecentActivityWidget = ({ stats }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await api.get('/api/dashboard/widgets/recent-activity/');
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
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
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (action) => {
    if (action?.includes('Company') || action?.includes('COMPANY')) return Building;
    if (action?.includes('Report') || action?.includes('REPORT')) return FileText;
    if (action?.includes('Login') || action?.includes('LOGIN')) return User;
    return Activity;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Clock className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
      </div>

      <div className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => {
          const Icon = getActivityIcon(activity.action);
          return (
            <div
              key={activity.id || index}
              className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.action}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {activity.company_name || activity.description || activity.user}
                </p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatTime(activity.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
