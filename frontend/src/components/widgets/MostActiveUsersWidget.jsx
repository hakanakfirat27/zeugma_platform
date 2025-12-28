// frontend/src/components/widgets/MostActiveUsersWidget.jsx
import { useState, useEffect } from 'react';
import { TrendingUp, User, Calendar, MapPin } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const MostActiveUsersWidget = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/most-active-users/');
        setUsers(response.data || []);
      } catch (error) {
        console.error('Error fetching most active users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRoleBadgeColor = (role) => {
    const colors = {
      'SUPERADMIN': 'bg-red-100 text-red-700',
      'STAFF_ADMIN': 'bg-purple-100 text-purple-700',
      'CLIENT': 'bg-blue-100 text-blue-700',
      'DATA_COLLECTOR': 'bg-green-100 text-green-700',
      'GUEST': 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (index) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Most Active Users</h3>
            <p className="text-xs text-gray-500">Top users by login frequency</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No activity data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.slice(0, 5).map((user, index) => (
            <div
              key={user.id || index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Rank */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-gray-200 text-gray-600' :
                index === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {index + 1}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white font-medium text-sm`}>
                {getInitials(user.name)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{user.name}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role_display}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {user.login_count} logins
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {user.last_login_display}
                  </span>
                  {user.last_ip && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {user.last_ip}
                    </span>
                  )}
                </div>
              </div>

              {/* Login Count */}
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">
                  <AnimatedCounter value={user.login_count} duration={800} />
                </p>
                <p className="text-xs text-gray-500">logins</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MostActiveUsersWidget;
