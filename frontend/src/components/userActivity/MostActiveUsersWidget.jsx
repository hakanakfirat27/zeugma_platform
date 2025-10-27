// frontend/src/components/userActivity/MostActiveUsersWidget.jsx

import { useState, useEffect } from 'react';
import { TrendingUp, User as UserIcon, Calendar, MapPin } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import api from '../../utils/api';

const MostActiveUsersWidget = ({ onUserClick }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  const fetchActiveUsers = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/auth/activity/stats/');
      setActiveUsers(data.most_active_users || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching active users:', err);
      setError('Failed to load active users');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      SUPERADMIN: 'bg-red-100 text-red-800 border-red-200',
      STAFF_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
      CLIENT: 'bg-green-100 text-green-800 border-green-200',
      GUEST: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[role] || colors.GUEST;
  };

  const getAvatarColor = (role) => {
    const colors = {
      SUPERADMIN: 'bg-red-500',
      STAFF_ADMIN: 'bg-purple-500',
      CLIENT: 'bg-green-500',
      GUEST: 'bg-gray-500',
    };
    return colors[role] || colors.GUEST;
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Most Active Users</h3>
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Most Active Users</h3>
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="text-center py-8 text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Most Active Users</h3>
          <p className="text-sm text-gray-500 mt-1">Top users by login frequency</p>
        </div>
        <TrendingUp className="w-5 h-5 text-indigo-600" />
      </div>

      <div className="space-y-3">
        {activeUsers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No activity data available</p>
        ) : (
          activeUsers.map((user, index) => (
            <div
              key={user.id}
              onClick={() => onUserClick && onUserClick(user)}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 transition-all cursor-pointer"
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0 text-base">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {index + 1}
                </div>
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(user.role)}`}>
                {user.initials}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {user.full_name || user.username}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {user.login_count} logins
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatLastLogin(user.last_login)}
                  </span>
                  {user.last_login_ip && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" />
                      {user.last_login_ip}
                    </span>
                  )}
                </div>
              </div>

              {/* Login Count Badge */}
              <div className="flex-shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">{user.login_count}</div>
                  <div className="text-xs text-gray-500">logins</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MostActiveUsersWidget;