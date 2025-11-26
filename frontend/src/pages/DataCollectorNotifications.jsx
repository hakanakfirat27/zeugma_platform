// frontend/src/pages/DataCollectorNotifications.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../utils/breadcrumbConfig';
import axios from 'axios';
import { Bell, Check, X, Trash2, CheckCheck, Search } from 'lucide-react';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';

const DataCollectorNotifications = () => {
  const { user } = useAuth();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);    
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Get CSRF token from cookie
  const getCSRFToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/notifications/', {
        withCredentials: true,
      });

      setNotifications(response.data.notifications || []);
      setFilteredNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // WebSocket for instant updates
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => {
      console.log('✅ Data Collector Notifications: WebSocket connected');
    };

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        fetchNotifications(); // Update instantly
      }
    };

    notifWs.onerror = (error) => {
      console.error('❌ Data Collector Notifications: WebSocket error:', error);
    };

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) {
        notifWs.close();
      }
    };
  }, []);

  useEffect(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'unread') {
        filtered = filtered.filter(n => !n.is_read);
      } else {
        filtered = filtered.filter(n => n.notification_type === filterType);
      }
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  }, [filterType, searchQuery, notifications]);

  const markAsRead = async (id) => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post(
        `http://localhost:8000/api/notifications/${id}/mark_as_read/`,
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrfToken }
        }
      );

      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post(
        'http://localhost:8000/api/notifications/mark_all_as_read/',
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrfToken }
        }
      );

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const csrfToken = getCSRFToken();
      await axios.delete(
        `http://localhost:8000/api/notifications/${id}/delete_notification/`,
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrfToken }
        }
      );

      const notification = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;

    try {
      const csrfToken = getCSRFToken();
      await axios.delete(
        'http://localhost:8000/api/notifications/clear_all/',
        {
          withCredentials: true,
          headers: { 'X-CSRFToken': csrfToken }
        }
      );

      setNotifications([]);
      setFilteredNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing all:', error);
      alert('Failed to clear notifications. Please try again.');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      PROJECT_ASSIGNED: '📁',
      TASK_UPDATE: '📋',
      message: '💬',
      announcement: '📢',
      SYSTEM: '⚙️'
    };
    return icons[type] || '🔔';
  };

  const getTypeColor = (type) => {
    const colors = {
      PROJECT_ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-200',
      TASK_UPDATE: 'bg-orange-100 text-orange-700 border-orange-200',
      message: 'bg-purple-100 text-purple-700 border-purple-200',
      announcement: 'bg-pink-100 text-pink-700 border-pink-200',
      SYSTEM: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <DataCollectorLayout 
    pageTitle="Notifications"
    breadcrumbs={breadcrumbs}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Notifications</h1>
          <p className="text-gray-600">Manage all your notifications in one place</p>
        </div>

        {/* Stats & Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'unread'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterType('PROJECT_ASSIGNED')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'PROJECT_ASSIGNED'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setFilterType('message')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'message'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setFilterType('announcement')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'announcement'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Announcements
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No notifications found</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-l-purple-500' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full ${getTypeColor(notification.notification_type)} border flex items-center justify-center text-2xl`}>
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{notification.time}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.notification_type)}`}>
                            {notification.notification_type}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DataCollectorLayout>
  );
};

export default DataCollectorNotifications;
