// frontend/src/components/layout/DataCollectorLayout.jsx
// Data Collector layout using unified design from ClientDashboardLayout

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useChatUnreadCount from '../../hooks/useChatUnreadCount';
import Breadcrumb from '../Breadcrumb';
import ThemeToggle from '../common/ThemeToggle';
import {
  LayoutDashboard, FolderOpen, AlertCircle, LogOut, ChevronDown, 
  User, Settings, Bell, Database, Maximize, ChevronRight,
  MessageCircle, Check, X, Trash2, CheckCheck, Search
} from 'lucide-react';

const DataCollectorLayout = ({ children, pageTitle, headerActions, pageSubtitleTop, pageSubtitleBottom, breadcrumbs }) => {
  const { user, logout } = useAuth();
  const { 
    sidebarGradient, 
    headerGradient,
    headerIsLight,
    sidebarIsLight,
    isDarkMode,
    sidebarCollapsed: savedCollapsed,
    updateSetting,
    initialized: userSettingsLoaded
  } = useUserSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount: chatUnreadCount, clearCount: clearChatBadge } = useChatUnreadCount();

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  
  // User menu and fullscreen state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // DATA COLLECTOR NAVIGATION
  const navLinks = [
    { name: 'Dashboard', path: '/data-collector-dashboard', icon: LayoutDashboard },
    { name: 'My Projects', path: '/projects', icon: FolderOpen },
    { name: 'My Tasks', path: '/my-tasks', icon: AlertCircle },
    { name: 'Company Research', path: '/company-research', icon: Search },
    { name: 'Chat', path: '/data-collector-chat', icon: MessageCircle, badge: chatUnreadCount },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Sync sidebar state with settings when loaded
  useEffect(() => {
    if (userSettingsLoaded) {
      setIsSidebarCollapsed(savedCollapsed);
    }
  }, [savedCollapsed, userSettingsLoaded]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Configure axios
  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
  }, []);

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

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const response = await axios.get('http://localhost:8000/api/notifications/', { withCredentials: true });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // WebSocket for real-time notifications
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;
    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        fetchNotifications();
      }
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
      await axios.post(`http://localhost:8000/api/notifications/${id}/mark_as_read/`, {}, 
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post('http://localhost:8000/api/notifications/mark_all_as_read/', {},
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id, event) => {
    event?.stopPropagation();
    try {
      const csrfToken = getCSRFToken();
      await axios.delete(`http://localhost:8000/api/notifications/${id}/delete_notification/`,
        { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } });
      const notification = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) await markAsRead(notification.id);
      switch (notification.notification_type) {
        case 'PROJECT_ASSIGNED': navigate('/projects'); break;
        case 'message': navigate(notification.related_message_id ? `/data-collector-chat?message_id=${notification.related_message_id}` : '/data-collector-chat'); break;
        case 'announcement': navigate(notification.related_announcement_id ? `/data-collector-dashboard?announcement_id=${notification.related_announcement_id}` : '/data-collector-dashboard'); break;
        default: navigate('/data-collector-dashboard'); break;
      }
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    updateSetting('sidebar_collapsed', newState);
  };

  const isActive = (path) => {
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

  const handleLogout = async () => {
    await logout();
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'PROJECT_ASSIGNED': return <FolderOpen className="w-4 h-4 text-blue-500" />;
      case 'TASK_UPDATE': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'message': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const showExpanded = !isSidebarCollapsed;
  
  // Header text color logic: in dark mode, always use light text
  const headerTextIsLight = isDarkMode ? false : headerIsLight;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      {/* CSS for animations */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>

      {/* Sidebar */}
      <aside
        className={`${showExpanded ? 'w-56' : 'w-16'} flex flex-col shadow-xl relative z-50 transition-all duration-300 ease-in-out`}
        style={{ background: sidebarGradient }}
      >
        {/* Logo Section */}
        <div className="h-16 px-4 flex items-center">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-10 h-10 ${sidebarIsLight ? 'bg-black/10' : 'bg-white/20'} rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm`}>
              <Database className={`w-6 h-6 ${sidebarIsLight ? 'text-gray-800' : 'text-white'}`} />
            </div>
            <div className={`transition-all duration-300 ${showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'} overflow-hidden`}>
              <h2 className={`text-lg font-bold whitespace-nowrap ${sidebarIsLight ? 'text-gray-900' : 'text-white'}`}>A Data</h2>
              <p className={`text-xs whitespace-nowrap ${sidebarIsLight ? 'text-gray-600' : 'text-white/60'}`}>Data Collector</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
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
                    if (isChatLink) clearChatBadge();
                  }}
                  title={!showExpanded ? link.name : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    active
                      ? sidebarIsLight 
                        ? 'bg-black/20 text-gray-900 shadow-lg'
                        : 'bg-white/25 text-white shadow-lg'
                      : sidebarIsLight
                        ? 'text-gray-700 hover:bg-black/10 hover:text-gray-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                    active ? 'scale-110' : 'group-hover:scale-110'
                  }`} />
                  
                  <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                  } overflow-hidden`}>
                    {link.name}
                  </span>
                  
                  {/* Badge */}
                  {link.badge > 0 && (
                    <span className={`absolute flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full text-xs font-bold ${
                      active 
                        ? sidebarIsLight ? 'bg-gray-800 text-white' : 'bg-white text-gray-800' 
                        : 'bg-red-500 text-white'
                    } ${showExpanded ? 'right-3' : 'top-0 right-0 scale-75'}`}>
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                  
                  {active && showExpanded && !link.badge && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className={`p-3 border-t ${sidebarIsLight ? 'border-black/10' : 'border-white/10'}`}>
          <div className={`flex items-center gap-3 p-2 rounded-xl ${sidebarIsLight ? 'bg-black/10' : 'bg-white/10'} backdrop-blur-sm ${!showExpanded && 'justify-center'}`}>
            <div className="relative flex-shrink-0">
              <div className={`w-9 h-9 rounded-full ${sidebarIsLight ? 'bg-black/20' : 'bg-white/20'} flex items-center justify-center text-sm font-bold ${sidebarIsLight ? 'text-gray-800' : 'text-white'}`}>
                {getUserInitials()}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 ${sidebarIsLight ? 'border-black/20' : 'border-white/20'}`} />
            </div>
            
            <div className={`flex-1 min-w-0 transition-all duration-300 ${showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'} overflow-hidden`}>
              <p className={`text-sm font-medium truncate ${sidebarIsLight ? 'text-gray-900' : 'text-white'}`}>
                {getUserDisplayName()}
              </p>
              <p className={`text-xs truncate ${sidebarIsLight ? 'text-gray-600' : 'text-white/60'}`}>Data Collector</p>
            </div>
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-xl transition-all ${
              sidebarIsLight 
                ? 'text-gray-600 hover:bg-red-100 hover:text-red-600'
                : 'text-white/70 hover:bg-red-500/20 hover:text-red-300'
            } ${!showExpanded && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`text-sm transition-all duration-300 ${showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'} overflow-hidden whitespace-nowrap`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header 
          className={`h-16 border-b shadow-sm flex items-center justify-between px-6 flex-shrink-0 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'border-white/10'
          }`}
          style={isDarkMode ? {} : { background: headerGradient }}
        >
          {/* Left: Menu toggle + Title */}
          <div className="flex items-center gap-4">
            {/* Hamburger to X animated button */}
            <button
              onClick={toggleSidebar}
              className={`w-8 h-8 rounded-lg transition-all duration-300 flex items-center justify-center ${headerTextIsLight ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'}`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="relative w-4 h-4 flex items-center justify-center">
                <span className={`absolute h-0.5 ${headerTextIsLight ? 'bg-gray-800' : 'bg-white'} rounded-full transition-all duration-300 ease-in-out ${
                  isSidebarCollapsed ? 'w-4 rotate-45 translate-y-0' : 'w-4 -translate-y-1.5 rotate-0'
                }`} />
                <span className={`absolute h-0.5 w-4 ${headerTextIsLight ? 'bg-gray-800' : 'bg-white'} rounded-full transition-all duration-300 ease-in-out ${
                  isSidebarCollapsed ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                }`} />
                <span className={`absolute h-0.5 ${headerTextIsLight ? 'bg-gray-800' : 'bg-white'} rounded-full transition-all duration-300 ease-in-out ${
                  isSidebarCollapsed ? 'w-4 -rotate-45 translate-y-0' : 'w-4 translate-y-1.5 rotate-0'
                }`} />
              </div>
            </button>
            
            <div>
              {pageSubtitleTop && (
                <p className={`text-xs ${headerTextIsLight ? 'text-gray-600' : 'text-white/60'}`}>{pageSubtitleTop}</p>
              )}
              <h1 className={`text-base font-semibold ${headerTextIsLight ? 'text-gray-900' : 'text-white'}`}>
                {pageTitle || navLinks.find(link => isActive(link.path))?.name || 'Dashboard'}
              </h1>
              {pageSubtitleBottom && (
                <p className={`text-xs ${headerTextIsLight ? 'text-gray-600' : 'text-white/70'}`}>{pageSubtitleBottom}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Header Actions */}
            {headerActions && (
              <div className={`flex items-center gap-2 border-r pr-3 mr-1 ${headerTextIsLight ? 'border-black/20' : 'border-white/20'}`}>
                {headerActions}
              </div>
            )}

            <ThemeToggle />
            
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition-colors hidden sm:flex ${headerTextIsLight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
              title="Toggle Fullscreen"
            >
              <Maximize className={`w-5 h-5 ${headerTextIsLight ? 'text-gray-800' : 'text-white'}`} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                className={`relative p-2 rounded-xl transition-colors ${headerTextIsLight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
              >
                <Bell className={`w-5 h-5 ${headerTextIsLight ? 'text-gray-800' : 'text-white'} ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                        <p className="text-xs text-gray-500">{unreadCount} unread</p>
                      </div>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            <CheckCheck className="w-3 h-3" /> Mark all
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                            !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            {getNotificationIcon(notif.notification_type)}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                            </div>
                            <button onClick={(e) => deleteNotification(notif.id, e)} className="text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                      className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium py-2"
                    >
                      View All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1 pr-3 rounded-xl transition-colors ${headerTextIsLight ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
              >
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 ${
                    headerTextIsLight ? 'bg-gray-700 text-white ring-gray-400/50' : 'ring-white/30 text-white'
                  }`}
                  style={!headerTextIsLight ? { background: isDarkMode ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : headerGradient } : undefined}
                >
                  {getUserInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <p className={`text-sm font-semibold leading-none ${headerTextIsLight ? 'text-gray-900' : 'text-white'}`}>
                    {getUserDisplayName()}
                  </p>
                  <p className={`text-xs ${headerTextIsLight ? 'text-gray-600' : 'text-white/60'}`}>Data Collector</p>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${headerTextIsLight ? 'text-gray-600' : 'text-white/70'} ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <div className="p-4" style={{ background: isDarkMode ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' : headerGradient }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${isDarkMode ? 'bg-white/20' : headerIsLight ? 'bg-black/10' : 'bg-white/20'} flex items-center justify-center text-lg font-bold ${isDarkMode ? 'text-white' : headerIsLight ? 'text-gray-800' : 'text-white'}`}>
                        {getUserInitials()}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : headerIsLight ? 'text-gray-900' : 'text-white'}`}>{getUserDisplayName()}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-white/70' : headerIsLight ? 'text-gray-600' : 'text-white/70'}`}>{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { navigate('/settings?section=profile'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">My Profile</span>
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2 transition-colors duration-300">
            <Breadcrumb items={breadcrumbs} showHome={true} />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DataCollectorLayout;
