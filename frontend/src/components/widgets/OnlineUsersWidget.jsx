// frontend/src/components/widgets/OnlineUsersWidget.jsx
import { useState, useEffect } from 'react';
import { Wifi, User, Circle } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const OnlineUsersWidget = () => {
  const [data, setData] = useState({ count: 0, users: [], by_role: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/online-users/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching online users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadgeColor = (role) => {
    const colors = {
      'SUPERADMIN': 'bg-red-100 text-red-700 border-red-200',
      'STAFF_ADMIN': 'bg-purple-100 text-purple-700 border-purple-200',
      'CLIENT': 'bg-blue-100 text-blue-700 border-blue-200',
      'DATA_COLLECTOR': 'bg-green-100 text-green-700 border-green-200',
      'GUEST': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center relative">
            <Wifi className="w-5 h-5 text-cyan-600" />
            {data.count > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Online Users</h3>
            <p className="text-xs text-gray-500">
              <AnimatedCounter value={data.count} duration={600} /> currently online
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">
            <AnimatedCounter value={data.count} duration={800} />
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Role breakdown badges */}
          {Object.keys(data.by_role || {}).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(data.by_role).map(([role, count]) => (
                <span
                  key={role}
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(role)}`}
                >
                  {role.replace('_', ' ')}: {count}
                </span>
              ))}
            </div>
          )}

          {/* Online users list */}
          {data.users && data.users.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.users.slice(0, 8).map((user, index) => (
                <div
                  key={user.id || index}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {getInitials(user.name)}
                    </div>
                    <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute -bottom-0.5 -right-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role_display}
                  </span>
                </div>
              ))}
              {data.users.length > 8 && (
                <p className="text-xs text-center text-gray-500 pt-2">
                  +{data.users.length - 8} more users online
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users currently online</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OnlineUsersWidget;
