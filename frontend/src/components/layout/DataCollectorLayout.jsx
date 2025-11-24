// frontend/src/components/layout/DataCollectorLayout.jsx

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useChatUnreadCount from '../../hooks/useChatUnreadCount';
import {
  LayoutDashboard, FolderOpen, AlertCircle, Plus, LogOut, ChevronDown, 
  Menu, X, User, Settings, Bell, Calendar, MapPin, Phone, Mail, Building,
  Shield, Clock, RefreshCw, Lock, Unlock, Database, ArrowRight, Maximize,
  Minimize, CheckCheck, Trash2, Check, ChevronRight, MessageCircle
} from 'lucide-react';

const DataCollectorLayout = ({ children, pageTitle, headerActions, pageSubtitleTop, pageSubtitleBottom }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
    
  const getSavedSidebarState = () => {
    const saved = localStorage.getItem('dataCollectorSidebarLocked');
    return saved === 'true';
  };

  const [isSidebarLocked, setIsSidebarLocked] = useState(getSavedSidebarState());
  const [isSidebarOpen, setIsSidebarOpen] = useState(!getSavedSidebarState());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const notificationRef = useRef(null);
  const { unreadCount: chatUnreadCount, clearCount: clearChatBadge } = useChatUnreadCount();

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef(null);

  // DATA COLLECTOR NAVIGATION
  const navLinks = [
    { name: 'Dashboard', path: '/data-collector-dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'My Projects', path: '/projects', icon: FolderOpen, color: 'text-teal-500' },
    { name: 'My Tasks', path: '/my-tasks', icon: AlertCircle, color: 'text-orange-500' },
    { name: 'Company Research', path: '/company-research', icon: AlertCircle, color: 'text-orange-500' },
    { name: 'Chat', path: '/data-collector-chat', icon: MessageCircle, color: 'text-purple-500' },    
  ];

  // Dropdown menu links
  const dropdownLinks = [
    { name: 'My Profile', path: '/my-profile', icon: User, color: 'text-blue-600', bg: 'bg-blue-50', description: 'View your profile'},
    { name: 'Profile Settings', path: '/profile-settings', icon: Settings, color: 'text-pink-600', bg: 'bg-pink-50', description: 'Update your settings'}
  ];

  // CSRF token helper
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

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('dataCollectorSidebarLocked', isSidebarLocked.toString());
  }, [isSidebarLocked]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setShowAvatarMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Configure axios
  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
  }, []);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:8000/api/notifications/', {
        withCredentials: true,
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on component mount and set up WebSocket
  useEffect(() => {
    fetchNotifications();

    // Connect to notification WebSocket for INSTANT updates
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => {
      console.log('✅ Notification WebSocket connected');
    };

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'notification') {
        fetchNotifications();
      }
    };

    notifWs.onerror = (error) => {
      console.error('❌ Notification WebSocket error:', error);
    };

    notifWs.onclose = () => {
      console.log('🔴 Notification WebSocket disconnected');
    };

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) {
        notifWs.close();
      }
    };
  }, []);


  const markAsRead = async (id) => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post(
        `http://localhost:8000/api/notifications/${id}/mark_as_read/`,
        {},
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } }
      );
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post(
        'http://localhost:8000/api/notifications/mark_all_as_read/',
        {},
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } }
      );
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
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
      setUnreadCount(0);
      fetchNotifications();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      alert('Failed to clear notifications. Please try again.');
    }
  };

  const deleteNotification = async (id, event) => {
    event?.stopPropagation();
    try {
      const csrfToken = getCSRFToken();
      await axios.delete(
        `http://localhost:8000/api/notifications/${id}/delete_notification/`,
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } }
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


  // Notification handler functions
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      switch (notification.notification_type) {
        case 'PROJECT_ASSIGNED':
          navigate('/projects');
          break;
        case 'message':
          navigate(notification.related_message_id ? `/data-collector-chat?message_id=${notification.related_message_id}` : '/data-collector-chat');
          break;
        case 'announcement':
          navigate(notification.related_announcement_id ? `/data-collector-dashboard?announcement_id=${notification.related_announcement_id}` : '/data-collector-dashboard');
          break;
        default:
          navigate('/data-collector-dashboard');
          break;
      }
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };


  const getNotificationIcon = (type) => {
    const iconProps = { className: "w-5 h-5" };
    switch (type) {
      case 'PROJECT_ASSIGNED':
        return <FolderOpen {...iconProps} className="w-5 h-5 text-blue-600" />;
      case 'TASK_UPDATE':
        return <AlertCircle {...iconProps} className="w-5 h-5 text-orange-600" />;
      case 'SYSTEM':
        return <Settings {...iconProps} className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell {...iconProps} className="w-5 h-5 text-purple-600" />;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const isActive = (path) => {
    // For paths like /projects, also match child routes like /projects/123
    if (path === '/projects') {
      return location.pathname === path || location.pathname.startsWith('/projects/');
    }
    return location.pathname === path;
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.username?.substring(0, 2).toUpperCase() || 'DC';
  };

  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.username || 'Data Collector';
  };

  const getUserRole = () => {
    return 'Data Collector';
  };

  const sidebarWidth = isSidebarOpen ? 'w-64' : 'w-20';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Bell animation CSS */}
      <style>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          1% { transform: rotate(30deg); }
          3% { transform: rotate(-28deg); }
          5% { transform: rotate(34deg); }
          7% { transform: rotate(-32deg); }
          9% { transform: rotate(30deg); }
          11% { transform: rotate(-28deg); }
          13% { transform: rotate(26deg); }
          15% { transform: rotate(-24deg); }
          17% { transform: rotate(22deg); }
          19% { transform: rotate(-20deg); }
          21% { transform: rotate(18deg); }
          23% { transform: rotate(-16deg); }
          25% { transform: rotate(14deg); }
          27% { transform: rotate(-12deg); }
          29% { transform: rotate(10deg); }
          31% { transform: rotate(-8deg); }
          33% { transform: rotate(6deg); }
          35% { transform: rotate(-4deg); }
          37% { transform: rotate(2deg); }
          39% { transform: rotate(-1deg); }
          41% { transform: rotate(1deg); }
          43% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }

        .bell-ring {
          animation: ring 4s ease-in-out infinite;
          transform-origin: 50% 4px;
        }
      `}</style>

      <aside
        className={`${sidebarWidth} transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-800 via-slate-900 to-slate-900 text-white flex flex-col shadow-2xl relative z-50`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              {(isSidebarOpen) && (
                <div className="transition-opacity duration-200">
                  <h2 className="text-lg font-bold text-white">Zeugma</h2>
                  <p className="text-xs text-slate-400">Data Collector Portal</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              const isChatLink = link.name === 'Chat';
              return (
                <button
                  key={link.name}
                  onClick={() => {
                    navigate(link.path);
                    // Clear chat badge immediately when clicking Chat
                    if (isChatLink) {
                      clearChatBadge();
                    }
                  }}
                  title={link.name}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : link.color}`} />
                  {(isSidebarOpen) && (
                    <span className="font-medium text-sm transition-opacity duration-200 truncate">{link.name}</span>
                  )}
                  {/* Chat Badge */}
                  {isChatLink && chatUnreadCount > 0 && (
                    <span className={`absolute min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      active ? 'bg-white text-purple-600' : 'bg-red-500 text-white'
                    } ${
                      isSidebarOpen
                        ? 'right-3 top-1/2 -translate-y-1/2' // Centered when open
                        : 'scale-75 top-1 right-1' // Top-right corner when collapsed
                    }`}>
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  )}
                  {active && (isSidebarOpen) && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section (Sidebar bottom) */}
        <div className="p-4 border-t border-slate-700/50">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 ${!(isSidebarOpen) && 'justify-center'}`}>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold shadow-lg">
                {getUserInitials()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
            </div>
            {(isSidebarOpen) && (
              <div className="flex-1 transition-opacity duration-200">
                <p className="text-sm font-semibold text-white truncate">{getUserDisplayName()}</p>
                <p className="text-xs text-slate-400">{getUserRole()}</p>
              </div>
            )}
          </div>
          <div className="mt-3 space-y-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-red-600/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              {(isSidebarOpen) && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* --- TOP HEADER --- */}
        <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
          <div className="flex items-center px-6 py-4">
            {/* Left Section */}
            <div className="flex flex-shrink-0 items-center gap-4">
              <button
                onClick={() => {
                  if (isSidebarOpen) {
                    setIsSidebarOpen(false);
                    setIsSidebarLocked(true);
                  } else {
                    setIsSidebarOpen(true);
                    setIsSidebarLocked(false);
                  }
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                title={isSidebarOpen ? "Close and lock sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? (
                  <Menu className="w-5 h-5 text-white" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-white" />
                )}
              </button>
              {/* Page Title & Subtitle Area */}
              <div className="min-w-0">
                {pageSubtitleTop && (
                  <div className="mb-1 text-white/80">
                    {pageSubtitleTop}
                  </div>
                )}
                <h1 className="text-xl font-bold text-white">
                  {pageTitle || navLinks.find(link => isActive(link.path))?.name || 'Dashboard'}
                </h1>
                {pageSubtitleBottom && (
                  <div className="mt-1 text-white/90">
                    {pageSubtitleBottom}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 ml-auto">
              {/* --- Action Slot Divider --- */}
              {headerActions && (
                <div className="flex items-center gap-2 border-r border-white/30 pr-5 mr-1">
                  {headerActions}
                </div>
              )}

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) fetchNotifications();
                  }}
                  className="relative p-2 hover:bg-white/20 rounded-xl transition-colors"
                  title="Notifications"
                >
                  <Bell className={`w-5 h-5 text-white ${unreadCount > 0 ? 'bell-ring' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1 shadow-md">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 text-gray-900">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">Notifications</h3>
                          <p className="text-xs text-gray-600">{unreadCount} unread messages</p>
                        </div>
                        <div className="flex gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                              title="Mark all as read"
                            >
                              <CheckCheck className="w-4 h-4" />
                              Mark all
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={clearAll}
                              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                              title="Clear all"
                            >
                              <Trash2 className="w-4 h-4" />
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {loading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading...</p>
                        </div>
                      ) : error ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-red-300 mx-auto mb-3" />
                          <p className="text-red-500 font-medium">Error loading notifications</p>
                          <p className="text-xs text-gray-500 mt-1">{error}</p>
                          <button
                            onClick={fetchNotifications}
                            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                          >
                            Retry
                          </button>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No notifications</p>
                          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                              !notification.is_read ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.notification_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className={`font-semibold text-sm ${
                                    !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                  }`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.is_read && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">{notification.time}</span>
                                  <div className="flex gap-2">
                                    {!notification.is_read && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        title="Mark as read"
                                      >
                                        <Check className="w-3 h-3" />
                                        Mark read
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => deleteNotification(notification.id, e)}
                                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                      title="Delete"
                                    >
                                      <X className="w-3 h-3" />
                                      Delete
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
                )}
              </div>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={avatarMenuRef}>
                <button
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                  className="flex items-center gap-2 p-1 pr-3 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md ring-2 ring-white/30">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform ${showAvatarMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showAvatarMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-gray-900">
                    {/* Menu Items */}
                    <div className="p-2">
                      {dropdownLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <button
                            key={link.name}
                            onClick={() => {
                              navigate(link.path);
                              setShowAvatarMenu(false);
                            }}
                            title={link.name}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                          >
                            <div className={`w-9 h-9 rounded-lg ${link.bg} flex items-center justify-center group-hover:bg-gray-100 transition-colors`}>
                              <Icon className={`w-4 h-4 ${link.color}`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{link.name}</p>
                              <p className="text-xs text-gray-500">{link.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-2"></div>

                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          logout();
                          setShowAvatarMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-600">Logout</p>
                          <p className="text-xs text-red-400">Sign out of your account</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DataCollectorLayout;
