// frontend/src/components/layout/ClientDashboardLayout.jsx

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';
import axios from 'axios';
import {
  LayoutDashboard, FileText, CreditCard, MessageSquare, HelpCircle,
  LogOut, Menu, Bell, Maximize, Settings, ChevronRight,
  Database, ArrowRight, Check, X, Trash2, CheckCheck,
  User, Shield, ChevronDown, Megaphone
} from 'lucide-react';
import useChatUnreadCount from '../../hooks/useChatUnreadCount';
import useAnnouncementBadge from '../../hooks/useAnnouncementBadge';

const ClientDashboardLayout = ({ children, pageTitle, pageSubtitleTop, pageSubtitleBottom, breadcrumbs }) => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const getSavedSidebarState = () => {
    const saved = localStorage.getItem('clientSidebarLocked');
    return saved === 'true'; // Returns true if locked (closed)
  };

  const [isSidebarLocked, setIsSidebarLocked] = useState(getSavedSidebarState());
  const [isSidebarOpen, setIsSidebarOpen] = useState(!getSavedSidebarState());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const { unreadCount: chatUnreadCount, clearCount: clearChatBadge } = useChatUnreadCount();


  // Announcement states
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  const navLinks = [
    { name: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'Reports', path: '/client/reports', icon: FileText, color: 'text-purple-500' },
    { name: 'Subscriptions', path: '/client/subscriptions', icon: CreditCard, color: 'text-green-500' },
    { name: 'Chat', path: '/client/chat', icon: MessageSquare, color: 'text-orange-500' },
    { name: 'Announcements', path: '/client/announcements', icon: Megaphone, color: 'text-pink-500', badge: unreadAnnouncementsCount },
    { name: 'FAQ', path: '/client/faq', icon: HelpCircle, color: 'text-pink-500' },
  ];

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


  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef(null);


  // ============= NEW: Save sidebar lock state =============
  useEffect(() => {
    localStorage.setItem('clientSidebarLocked', isSidebarLocked.toString());
  }, [isSidebarLocked]);
  // ========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setShowAvatarMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
  }, []);

  // Fetch announcements count
  const fetchAnnouncementsCount = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/announcements/unread_count/', {
        withCredentials: true,
      });
      setUnreadAnnouncementsCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching announcements count:', error);
    }
  };

  // Fetch unread announcements for popup
  const fetchUnreadAnnouncements = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/announcements/my_announcements/', {
        withCredentials: true,
      });

      const unreadAnnouncements = response.data.filter(a => !a.has_viewed);

      if (unreadAnnouncements.length > 0) {
        // Show the first unread announcement
        setCurrentAnnouncement(unreadAnnouncements[0]);
        setShowAnnouncementPopup(true);
      }
    } catch (error) {
      console.error('Error fetching unread announcements:', error);
    }
  };

  // Mark announcement as viewed
  const markAnnouncementAsViewed = async (announcementId) => {
    try {
      await axios.get(`http://localhost:8000/api/announcements/${announcementId}/`, {
        withCredentials: true,
      });
      fetchAnnouncementsCount();
    } catch (error) {
      console.error('Error marking announcement as viewed:', error);
    }
  };

  // Handle announcement popup close
  const handleCloseAnnouncementPopup = () => {
    if (currentAnnouncement) {
      markAnnouncementAsViewed(currentAnnouncement.id);
    }
    setShowAnnouncementPopup(false);
    setCurrentAnnouncement(null);
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching notifications...');

      const response = await axios.get('http://localhost:8000/api/notifications/', {
        withCredentials: true,
      });

      console.log('Notifications response:', response.data);

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications and announcements on component mount
  useEffect(() => {
    fetchNotifications();
    fetchAnnouncementsCount();
    fetchUnreadAnnouncements();

    // Connect to notification WebSocket for INSTANT updates
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => {
      console.log('✅ Notification Bell: WebSocket connected');
    };

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Refresh notification bell when any notification arrives
      if (data.type === 'notification') {
        fetchNotifications();

        // If it's an announcement notification, refresh announcement count
        if (data.notification && data.notification.notification_type === 'announcement') {
          fetchAnnouncementsCount();
          fetchUnreadAnnouncements();
        }

        // Also refresh chat badge if it's a chat message notification
        if (data.notification && data.notification.notification_type === 'message') {
          // The hook will handle this via its own WebSocket connection
        }
      }
    };

    notifWs.onerror = (error) => {
      console.error('❌ Notification Bell: WebSocket error:', error);
    };

    notifWs.onclose = () => {
      console.log('🔴 Notification Bell: WebSocket disconnected');
    };

    // No polling needed - WebSocket handles everything instantly!

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) {
        notifWs.close();
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    }
    return user?.username?.[0].toUpperCase() || 'U';
  };

  // Handle notification click - navigate to relevant page
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // Navigate based on notification type
      switch (notification.notification_type) {
        case 'report':
          // Navigate to reports page, optionally with report ID
          if (notification.related_report_id) {
            navigate(`/client/reports?report_id=${notification.related_report_id}`);
          } else {
            navigate('/client/reports');
          }
          break;

        case 'subscription':
          // Navigate to subscriptions page
          if (notification.related_subscription_id) {
            navigate(`/client/subscriptions?subscription_id=${notification.related_subscription_id}`);
          } else {
            navigate('/client/subscriptions');
          }
          break;

        case 'message':
          // Navigate to chat page
          if (notification.related_message_id) {
            navigate(`/client/chat?message_id=${notification.related_message_id}`);
          } else {
            navigate('/client/chat');
          }
          break;

        case 'announcement':
          // Navigate to dashboard or announcements page
          if (notification.related_announcement_id) {
            navigate(`/client/announcements?announcement_id=${notification.related_announcement_id}`);
          } else {
            navigate('/client/announcements');
          }
          break;

        case 'payment':
          // Navigate to subscriptions or billing page
          navigate('/client/subscriptions');
          break;

        default:
          // Default to dashboard
          navigate('/client/dashboard');
          break;
      }

      // Close the notification dropdown
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const csrfToken = getCSRFToken();

      await axios.post(
        `http://localhost:8000/api/notifications/${id}/mark_as_read/`,
        {},
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          }
        }
      );

      // Update local state
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      console.error('Error response:', error.response);
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
          headers: {
            'X-CSRFToken': csrfToken,
          }
        }
      );

      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      console.error('Error response:', error.response);
    }
  };

  const deleteNotification = async (id, event) => {
    // Prevent navigation when deleting
    event?.stopPropagation();

    try {
      const csrfToken = getCSRFToken();

      await axios.delete(
        `http://localhost:8000/api/notifications/${id}/delete_notification/`,
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': csrfToken,
          }
        }
      );

      // Update local state
      const notification = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      console.error('Error response:', error.response);
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
          headers: {
            'X-CSRFToken': csrfToken,
          }
        }
      );

      // Update local state
      setNotifications([]);
      setUnreadCount(0);
      fetchNotifications(); // Refresh to confirm
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      console.error('Error response:', error.response);
      alert('Failed to clear notifications. Please try again.');
    }
  };

  const getAnnouncementTypeIcon = (type) => {
    const icons = {
      general: <Bell className="w-5 h-5" />,
      maintenance: <Settings className="w-5 h-5" />,
      feature: <Megaphone className="w-5 h-5" />,
      update: <Bell className="w-5 h-5" />,
      event: <Bell className="w-5 h-5" />,
      alert: <Bell className="w-5 h-5" />,
    };
    return icons[type] || icons.general;
  };

  const getAnnouncementTypeColor = (type) => {
    const colors = {
      general: 'from-blue-500 to-blue-600',
      maintenance: 'from-orange-500 to-orange-600',
      feature: 'from-green-500 to-green-600',
      update: 'from-purple-500 to-purple-600',
      event: 'from-pink-500 to-pink-600',
      alert: 'from-red-500 to-red-600',
    };
    return colors[type] || colors.general;
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'report': return <FileText className="w-5 h-5 text-purple-500" />;
      case 'subscription': return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-orange-500" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'announcement': return <Bell className="w-5 h-5 text-pink-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const sidebarWidth = isSidebarOpen ? 'w-64' : 'w-20';

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Add bell ring animation */}
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
                  <h2 className="text-lg font-bold text-white">A Data</h2>
                  <p className="text-xs text-slate-400">Client Portal</p>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : link.color}`} />
                  {(isSidebarOpen) && (
                    <span className="font-medium transition-opacity duration-200">{link.name}</span>
                  )}
                   {/* --- 3. Add Badge (CORRECTED) --- */}
                   {isChatLink && chatUnreadCount > 0 && (
                      <span className={`absolute min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        active ? 'bg-white text-purple-600' : 'bg-red-500 text-white'
                      } ${
                        isSidebarOpen
                          ? 'right-4 top-1/2 -translate-y-1/2' // Centered when open
                          : 'scale-75 top-1 right-1' // Top-right corner when collapsed
                      }`}>
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </span>
                    )}
                    {/* --- End Badge --- */}
                  {active && (isSidebarOpen) && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
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
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-xs text-slate-400">Premium Account</p>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-red-600/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              {(isSidebarOpen) && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <header className="bg-white border-b border-gray-200 shadow-sm z-40">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (isSidebarOpen) {
                    // Closing sidebar - lock it
                    setIsSidebarOpen(false);
                    setIsSidebarLocked(true);
                  } else {
                    // Opening sidebar - unlock it
                    setIsSidebarOpen(true);
                    setIsSidebarLocked(false);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title={isSidebarOpen ? "Close and lock sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? (
                  <Menu className="w-5 h-5 text-gray-600" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Page Title & Subtitle Area */}
              <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* --- MODIFIED: Top subtitle color --- */}
                    {pageSubtitleTop && (
                      <div className="mb-1 text-gray-300">
                        {pageSubtitleTop}
                      </div>
                    )}
                    {/* --- MODIFIED: Page title color --- */}
                    <h1 className="text-xl font-bold text-gray truncate">
                      {pageTitle || navLinks.find(link => isActive(link.path))?.name || 'Dashboard'}
                    </h1>
                    {/* --- MODIFIED: Bottom subtitle color --- */}
                    {pageSubtitleBottom && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {pageSubtitleBottom}
                      </p>
                    )}
                    {/* ============= NEW: Show lock status ============= */}
                    {isSidebarLocked && !pageSubtitleBottom && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sidebar locked - Click arrow to open
                      </p>
                    )}
                    {/* ================================================= */}
                  </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize className="w-5 h-5 text-gray-600" />
              </button>

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) fetchNotifications();
                  }}
                  className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  title="Notifications"
                >
                  <Bell className={`w-5 h-5 text-gray-600 ${unreadCount > 0 ? 'bell-ring' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1 shadow-md">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
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

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={() => {
                            navigate('/client/notifications');
                            setShowNotifications(false);
                          }}
                          className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

                {/* User Avatar Dropdown */}
                <div className="relative" ref={avatarMenuRef}>
                  <button
                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                    className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md ring-2 ring-white">
                      {getUserInitials()}
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900 leading-none">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="text-xs text-gray-500">Premium Account</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAvatarMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showAvatarMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-gray-900">
                      {/* User Info Header */}
                      <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-lg font-bold text-white shadow-lg ring-2 ring-white/30">
                            {getUserInitials()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white">
                              {user?.full_name || user?.username}
                            </p>
                            <p className="text-xs text-purple-100">
                              {user?.email}
                            </p>
                          </div>
                        </div>

                        {/* Premium Badge */}
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                          <Shield className="w-3.5 h-3.5 text-white" />
                          <span className="text-xs font-semibold text-white">Premium Member</span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        {/* My Reports */}
                        <button
                          onClick={() => {
                            navigate('/client/reports');
                            setShowAvatarMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <FileText className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">My Reports</p>
                            <p className="text-xs text-gray-500">Access and manage your reports</p>
                          </div>
                        </button>

                        {/* My Subscriptions */}
                        <button
                          onClick={() => {
                            navigate('/client/subscriptions');
                            setShowAvatarMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                            <CreditCard className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">My Subscriptions</p>
                            <p className="text-xs text-gray-500">Manage your subscriptions</p>
                          </div>
                        </button>

                        {/* My Profile */}
                        <button
                          onClick={() => {
                            navigate('/my-profile');
                            setShowAvatarMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">My Profile</p>
                            <p className="text-xs text-gray-500">View and edit your profile</p>
                          </div>
                        </button>

                        {/* Account Settings */}
                        <button
                          onClick={() => {
                            navigate('/profile-settings');
                            setShowAvatarMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <Settings className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">Profile Settings</p>
                            <p className="text-xs text-gray-500">Account preferences</p>
                          </div>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-100 my-2"></div>

                      {/* Logout */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleLogout();
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
          {/* Breadcrumb Section - Just below header */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
              <Breadcrumb items={breadcrumbs} showHome={true} />
            </div>
          )}
          
          {/* Page Content */}          
          {children}
        </main>
      </div>
      {/* Announcement Popup Modal */}
      {showAnnouncementPopup && currentAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-5 duration-300">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${getAnnouncementTypeColor(currentAnnouncement.announcement_type)} text-white p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    {getAnnouncementTypeIcon(currentAnnouncement.announcement_type)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentAnnouncement.title}</h2>
                    <p className="text-sm text-white/90 mt-1">New Announcement</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseAnnouncementPopup}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {currentAnnouncement.summary && (
                <p className="text-gray-700 font-medium mb-4">{currentAnnouncement.summary}</p>
              )}
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                {currentAnnouncement.content}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  navigate('/client/announcements');
                  handleCloseAnnouncementPopup();
                }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                View All Announcements
              </button>
              <button
                onClick={handleCloseAnnouncementPopup}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboardLayout;