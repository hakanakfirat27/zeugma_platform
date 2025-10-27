// frontend/src/components/userActivity/UserLoginHistoryModal.jsx

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Monitor, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import api from '../../utils/api';

const UserLoginHistoryModal = ({ user, onClose }) => {
  const [loginHistory, setLoginHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (user?.id) {
      fetchLoginHistory();
    }
  }, [user?.id, page]);

  const fetchLoginHistory = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/api/auth/activity/user/${user.id}/history/`, {
        params: { page, page_size: pageSize }
      });
      setLoginHistory(data.results);
      setTotalCount(data.count);
      setError(null);
    } catch (err) {
      console.error('Error fetching login history:', err);
      setError('Failed to load login history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDateTime(dateString);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Login History</h2>
              <p className="text-sm text-gray-600 mt-1">
                {user?.full_name || user?.username} - {totalCount} total logins
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              <div className="text-xs text-indigo-600 font-medium mb-1">Total Logins</div>
              <div className="text-2xl font-bold text-indigo-900">{user?.login_count || 0}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="text-xs text-green-600 font-medium mb-1">Last Login</div>
              <div className="text-sm font-semibold text-green-900">
                {user?.last_login ? formatRelativeTime(user.last_login) : 'Never'}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="text-xs text-purple-600 font-medium mb-1">Last IP</div>
              <div className="text-sm font-semibold text-purple-900">
                {user?.last_login_ip || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No login history available
            </div>
          ) : (
            <div className="space-y-3">
              {loginHistory.map((login) => (
                <div
                  key={login.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          login.success
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {login.success ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {login.success ? 'Successful Login' : 'Failed Login'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(login.login_time)}
                          </div>
                        </div>
                        <div className="ml-auto text-xs text-gray-500">
                          {formatRelativeTime(login.login_time)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3 pl-12">
                        {login.ip_address && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{login.ip_address}</span>
                          </div>
                        )}
                        {login.user_agent && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 col-span-2">
                            <Monitor className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="line-clamp-2">{login.user_agent}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserLoginHistoryModal;