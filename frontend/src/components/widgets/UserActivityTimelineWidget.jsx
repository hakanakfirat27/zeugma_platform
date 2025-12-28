// frontend/src/components/widgets/UserActivityTimelineWidget.jsx
import { useState, useEffect } from 'react';
import { 
  Activity, LogIn, LogOut, Eye, Edit, Trash2, Plus, 
  Download, Upload, Search, Settings, UserPlus, Key
} from 'lucide-react';
import api from '../../utils/api';

const UserActivityTimelineWidget = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/user-activity-timeline/');
        setActivities(response.data || []);
      } catch (error) {
        console.error('Error fetching user activity:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getActionIcon = (action) => {
    const icons = {
      'LOGIN': LogIn,
      'LOGOUT': LogOut,
      'VIEW': Eye,
      'EDIT': Edit,
      'DELETE': Trash2,
      'CREATE': Plus,
      'DOWNLOAD': Download,
      'UPLOAD': Upload,
      'SEARCH': Search,
      'SETTINGS': Settings,
      'REGISTER': UserPlus,
      'PASSWORD_CHANGE': Key,
    };
    return icons[action] || Activity;
  };

  const getActionColor = (action) => {
    const colors = {
      'LOGIN': 'bg-green-100 text-green-600',
      'LOGOUT': 'bg-gray-100 text-gray-600',
      'VIEW': 'bg-blue-100 text-blue-600',
      'EDIT': 'bg-yellow-100 text-yellow-600',
      'DELETE': 'bg-red-100 text-red-600',
      'CREATE': 'bg-purple-100 text-purple-600',
      'DOWNLOAD': 'bg-cyan-100 text-cyan-600',
      'UPLOAD': 'bg-indigo-100 text-indigo-600',
      'SEARCH': 'bg-orange-100 text-orange-600',
      'SETTINGS': 'bg-slate-100 text-slate-600',
      'REGISTER': 'bg-emerald-100 text-emerald-600',
      'PASSWORD_CHANGE': 'bg-amber-100 text-amber-600',
    };
    return colors[action] || 'bg-gray-100 text-gray-600';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">User Activity</h3>
            <p className="text-xs text-gray-500">Recent user actions</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-4">
            {activities.slice(0, 10).map((activity, index) => {
              const Icon = getActionIcon(activity.action);
              const colorClass = getActionColor(activity.action);
              
              return (
                <div key={activity.id || index} className="relative flex gap-4 pl-2">
                  {/* Icon */}
                  <div className={`relative z-10 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                      <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                    {activity.details && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{activity.details}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivityTimelineWidget;
