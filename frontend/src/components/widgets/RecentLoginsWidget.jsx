// frontend/src/components/widgets/RecentLoginsWidget.jsx
import { LogIn, Clock, Globe } from 'lucide-react';

const RecentLoginsWidget = ({ stats }) => {
  const logins = stats?.recent_logins || [];

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

  if (logins.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <LogIn className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Recent Logins</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 text-sm">No recent login activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <LogIn className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Recent Logins</h3>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {logins.slice(0, 6).map((login, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">
                  {login.user?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{login.user}</p>
                <p className="text-xs text-gray-500">{login.email}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatTime(login.timestamp)}</span>
              </div>
              {login.ip_address && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Globe className="w-3 h-3" />
                  <span>{login.ip_address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentLoginsWidget;
