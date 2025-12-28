// frontend/src/components/widgets/InactiveUsersWidget.jsx
import { useState, useEffect } from 'react';
import { UserX, Clock, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import AnimatedCounter from './AnimatedCounter';

const InactiveUsersWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/dashboard/widgets/inactive-users/');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching inactive users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getInactivityColor = (days) => {
    if (days >= 90) return 'text-red-600 bg-red-50';
    if (days >= 30) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <UserX className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Inactive Users</h3>
            <p className="text-xs text-gray-500">Users not logged in recently</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-yellow-700">
                <AnimatedCounter value={data?.inactive_7_days || 0} duration={800} />
              </p>
              <p className="text-xs text-yellow-600">7+ days</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-orange-700">
                <AnimatedCounter value={data?.inactive_30_days || 0} duration={800} />
              </p>
              <p className="text-xs text-orange-600">30+ days</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-700">
                <AnimatedCounter value={data?.inactive_90_days || 0} duration={800} />
              </p>
              <p className="text-xs text-red-600">90+ days</p>
            </div>
          </div>

          {/* Inactive Users List */}
          {data?.users && data.users.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.users.slice(0, 5).map((user, index) => (
                <div
                  key={user.id || index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                      {user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getInactivityColor(user.days_inactive)}`}>
                    <Clock className="w-3 h-3" />
                    {user.days_inactive}d
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">All users are active! 🎉</p>
            </div>
          )}

          {data?.never_logged_in > 0 && (
            <div className="mt-3 p-2 bg-amber-50 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700">
                {data.never_logged_in} user(s) never logged in
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InactiveUsersWidget;
