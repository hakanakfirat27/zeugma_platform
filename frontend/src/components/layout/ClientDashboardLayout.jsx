// frontend/src/components/layout/ClientDashboardLayout.jsx

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';
import axios from 'axios';
import {
  LayoutDashboard, FileText, CreditCard, MessageSquare, HelpCircle,
  LogOut, Menu, Bell, Maximize, Settings, ChevronRight,
  Database, ArrowRight, Check, X, Trash2, CheckCheck,
  User, Shield, ChevronDown, Megaphone, FolderHeart
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import useChatUnreadCount from '../../hooks/useChatUnreadCount';
import useAnnouncementBadge from '../../hooks/useAnnouncementBadge';
import FloatingHelpButton from '../help/FloatingHelpButton';
import ProductTour from '../help/ProductTour';
import { clientDashboardTourSteps } from '../help/tourSteps';
import { useTour } from '../../contexts/TourContext';

const ClientDashboardLayout = ({ children, pageTitle, pageSubtitleTop, pageSubtitleBottom, breadcrumbs }) => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarVariant, isDarkMode } = useTheme();

  const getSavedSidebarState = () => {
    const saved = localStorage.getItem('clientSidebarLocked');
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
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const { unreadCount: chatUnreadCount, clearCount: clearChatBadge } = useChatUnreadCount();

  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  const { startTour } = useTour();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('clientTourCompleted');
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        navigate('/client/help-center');
      }
    };
    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [navigate]);

  const handleStartTour = () => {
    startTour();
  };

  const handleTourComplete = () => {
    localStorage.setItem('clientTourCompleted', 'true');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard, color: 'text-blue-500', accentColor: 'blue' },
    { name: 'Reports', path: '/client/reports', icon: FileText, color: 'text-purple-500', accentColor: 'purple' },
    { name: 'Collections', path: '/client/collections', icon: FolderHeart, color: 'text-rose-500', accentColor: 'rose' },
    { name: 'Subscriptions', path: '/client/subscriptions', icon: CreditCard, color: 'text-green-500', accentColor: 'green' },
    { name: 'Chat', path: '/client/chat', icon: MessageSquare, color: 'text-orange-500', accentColor: 'orange' },
    { name: 'Announcements', path: '/client/announcements', icon: Megaphone, color: 'text-pink-500', accentColor: 'pink', badge: unreadAnnouncementsCount },
    { name: 'Help Center', path: '/client/help-center', icon: HelpCircle, color: 'text-cyan-500', accentColor: 'cyan' },
  ];

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

  useEffect(() => {
    localStorage.setItem('clientSidebarLocked', isSidebarLocked.toString());
  }, [isSidebarLocked]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
  }, []);

  const fetchAnnouncementsCount = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/announcements/unread_count/', { withCredentials: true });
      setUnreadAnnouncementsCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching announcements count:', error);
    }
  };

  const fetchUnreadAnnouncements = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/announcements/my_announcements/', { withCredentials: true });
      console.log('📢 Announcements fetched:', response.data);
      const unreadAnnouncements = response.data.filter(a => !a.has_viewed);
      if (unreadAnnouncements.length > 0) {
        console.log('📢 Current announcement:', unreadAnnouncements[0]);
        setCurrentAnnouncement(unreadAnnouncements[0]);
        setShowAnnouncementPopup(true);
      }
    } catch (error) {
      console.error('Error fetching unread announcements:', error);
    }
  };

  const markAnnouncementAsViewed = async (announcementId) => {
    try {
      await axios.get(`http://localhost:8000/api/announcements/${announcementId}/`, { withCredentials: true });
      fetchAnnouncementsCount();
    } catch (error) {
      console.error('Error marking announcement as viewed:', error);
    }
  };

  const handleCloseAnnouncementPopup = () => {
    if (currentAnnouncement) {
      markAnnouncementAsViewed(currentAnnouncement.id);
    }
    setShowAnnouncementPopup(false);
    setCurrentAnnouncement(null);
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:8000/api/notifications/', { withCredentials: true });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchAnnouncementsCount();
    fetchUnreadAnnouncements();

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;
    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => console.log('✅ Notification Bell: WebSocket connected');
    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        fetchNotifications();
        if (data.notification && data.notification.notification_type === 'announcement') {
          fetchAnnouncementsCount();
          fetchUnreadAnnouncements();
        }
      }
    };
    notifWs.onerror = (error) => console.error('❌ Notification Bell: WebSocket error:', error);
    notifWs.onclose = () => console.log('🔴 Notification Bell: WebSocket disconnected');

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) notifWs.close();
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

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) await markAsRead(notification.id);
      switch (notification.notification_type) {
        case 'report':
          navigate(notification.related_report_id ? `/client/reports?report_id=${notification.related_report_id}` : '/client/reports');
          break;
        case 'subscription':
          navigate(notification.related_subscription_id ? `/client/subscriptions?subscription_id=${notification.related_subscription_id}` : '/client/subscriptions');
          break;
        case 'message':
          navigate(notification.related_message_id ? `/client/chat?message_id=${notification.related_message_id}` : '/client/chat');
          break;
        case 'announcement':
          navigate(notification.related_announcement_id ? `/client/announcements?announcement_id=${notification.related_announcement_id}` : '/client/announcements');
          break;
        case 'payment':
          navigate('/client/subscriptions');
          break;
        default:
          navigate('/client/dashboard');
      }
      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post(`http://localhost:8000/api/notifications/${id}/mark_as_read/`, {}, {
        withCredentials: true,
        headers: { 'X-CSRFToken': csrfToken }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const csrfToken = getCSRFToken();
      await axios.post('http://localhost:8000/api/notifications/mark_all_as_read/', {}, {
        withCredentials: true,
        headers: { 'X-CSRFToken': csrfToken }
      });
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
      await axios.delete(`http://localhost:8000/api/notifications/${id}/delete_notification/`, {
        withCredentials: true,
        headers: { 'X-CSRFToken': csrfToken }
      });
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
      await axios.delete('http://localhost:8000/api/notifications/clear_all/', {
        withCredentials: true,
        headers: { 'X-CSRFToken': csrfToken }
      });
      setNotifications([]);
      setUnreadCount(0);
      fetchNotifications();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
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

  const handleLogout = async () => {
    await logout();
  };

  // Get current variant (with fallback)
  const currentVariant = sidebarVariant || 'default';

  // ============================================
  // RENDER SIDEBAR BASED ON VARIANT
  // ============================================
  
  const renderSidebar = () => {
    switch (currentVariant) {
      case 'glass':
        return renderGlassSidebar();
      case 'gradient':
        return renderGradientSidebar();
      case 'minimal':
        return renderMinimalSidebar();
      case 'accent':
        return renderAccentSidebar();
      case 'floating':
        return renderFloatingSidebar();
      case 'default':
      default:
        return renderDefaultSidebar();
    }
  };

  // ============================================
  // DEFAULT SIDEBAR
  // ============================================
  const renderDefaultSidebar = () => (
    <aside
      data-tour="sidebar"
      className={`${sidebarWidth} transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-800 via-slate-900 to-slate-900 text-white flex flex-col shadow-2xl relative z-50`}
    >
      {/* Logo Section - Fixed height to align with header */}
      <div className="h-[73px] px-6 border-b border-slate-700/50 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="transition-opacity duration-200">
              <h2 className="text-lg font-bold text-white">A Data</h2>
              <p className="text-xs text-slate-400">Client Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
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
                title={link.name}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                  active
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : link.color}`} />
                {isSidebarOpen && <span className="text-sm">{link.name}</span>}
                {isChatLink && chatUnreadCount > 0 && (
                  <span className={`absolute min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold ${
                    active ? 'bg-white text-purple-600' : 'bg-red-500 text-white'
                  } ${isSidebarOpen ? 'right-3' : 'top-0.5 right-0.5 scale-75'}`}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
                {active && isSidebarOpen && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-slate-700/50">
        <div className={`flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 ${!isSidebarOpen && 'justify-center'}`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xs font-bold shadow-lg">
              {getUserInitials()}
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-slate-800"></div>
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-slate-400">Premium Account</p>
            </div>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-red-600/10 hover:text-red-400 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  // ============================================
  // GLASS MORPHISM SIDEBAR
  // ============================================
  const renderGlassSidebar = () => (
    <aside
      data-tour="sidebar"
      className={`${sidebarWidth} transition-all duration-300 ease-in-out text-white flex flex-col shadow-2xl relative z-50`}
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.85) 50%, rgba(67, 56, 202, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {/* Logo Section - Fixed height to align with header */}
      <div className="h-[73px] px-6 border-b border-white/20 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
            <Database className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="transition-opacity duration-200">
              <h2 className="text-lg font-bold text-white">A Data</h2>
              <p className="text-xs text-white/70">Client Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
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
                title={link.name}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                  active
                    ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm border border-white/40'
                    : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-white" />
                {isSidebarOpen && <span className="text-sm">{link.name}</span>}
                {isChatLink && chatUnreadCount > 0 && (
                  <span className={`absolute min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold bg-red-500 text-white ${
                    isSidebarOpen ? 'right-3' : 'top-0.5 right-0.5 scale-75'
                  }`}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
                {active && isSidebarOpen && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-white/20">
        <div className={`flex items-center gap-2 p-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 ${!isSidebarOpen && 'justify-center'}`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-xs font-bold shadow-lg border border-white/30">
              {getUserInitials()}
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border-2 border-white/30"></div>
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-white/70">Premium Account</p>
            </div>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:bg-red-500/30 hover:text-white transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  // ============================================
  // GRADIENT FLOW SIDEBAR
  // ============================================
  const renderGradientSidebar = () => (
    <aside
      data-tour="sidebar"
      className={`${sidebarWidth} transition-all duration-300 ease-in-out text-white flex flex-col shadow-2xl relative z-50 overflow-hidden`}
      style={{
        background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Logo Section - Fixed height to align with header */}
      <div className="relative h-[73px] px-6 border-b border-white/20 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/25 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="transition-opacity duration-200">
              <h2 className="text-lg font-bold text-white">A Data</h2>
              <p className="text-xs text-white/80">Client Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
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
                title={link.name}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                  active
                    ? 'bg-white/35 text-white shadow-xl'
                    : 'text-white/90 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-white" />
                {isSidebarOpen && <span className="text-sm">{link.name}</span>}
                {isChatLink && chatUnreadCount > 0 && (
                  <span className={`absolute min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold bg-yellow-400 text-gray-900 ${
                    isSidebarOpen ? 'right-3' : 'top-0.5 right-0.5 scale-75'
                  }`}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
                {active && isSidebarOpen && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="relative p-3 border-t border-white/20">
        <div className={`flex items-center gap-2 p-2 rounded-lg bg-white/20 ${!isSidebarOpen && 'justify-center'}`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold shadow-lg">
              {getUserInitials()}
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border-2 border-white/50"></div>
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-white/80">Premium Account</p>
            </div>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:bg-red-500/40 hover:text-white transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  // ============================================
  // MINIMAL DARK SIDEBAR
  // ============================================
  const renderMinimalSidebar = () => (
    <aside
      data-tour="sidebar"
      className={`${sidebarWidth} transition-all duration-300 ease-in-out bg-black text-white flex flex-col shadow-xl relative z-50`}
    >
      {/* Logo Section - Fixed height to align with header */}
      <div className="h-[73px] px-6 border-b border-gray-800 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-gray-400" />
          </div>
          {isSidebarOpen && (
            <div className="transition-opacity duration-200">
              <h2 className="text-base font-semibold text-gray-200">A Data</h2>
              <p className="text-xs text-gray-600">Client Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
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
                title={link.name}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                  active
                    ? 'bg-gray-800 text-white border-l-2 border-white'
                    : 'text-gray-500 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-600'}`} />
                {isSidebarOpen && <span className={`text-sm ${active ? 'text-white' : 'text-gray-400'}`}>{link.name}</span>}
                {isChatLink && chatUnreadCount > 0 && (
                  <span className={`absolute min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold bg-white text-black ${
                    isSidebarOpen ? 'right-3' : 'top-0.5 right-0.5 scale-75'
                  }`}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-800">
        <div className={`flex items-center gap-2 p-2 rounded-lg bg-gray-900 border border-gray-800 ${!isSidebarOpen && 'justify-center'}`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-medium text-gray-400">
              {getUserInitials()}
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-black"></div>
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-300 truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-gray-600">Premium Account</p>
            </div>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-900 hover:text-red-500 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  // ============================================
  // ACCENT LINE SIDEBAR
  // ============================================
  const renderAccentSidebar = () => {
    const getAccentColor = (accentColor, isActive) => {
      const colors = {
        blue: { border: 'border-l-blue-500', bg: 'bg-blue-500/15', text: 'text-blue-400' },
        purple: { border: 'border-l-purple-500', bg: 'bg-purple-500/15', text: 'text-purple-400' },
        rose: { border: 'border-l-rose-500', bg: 'bg-rose-500/15', text: 'text-rose-400' },
        green: { border: 'border-l-green-500', bg: 'bg-green-500/15', text: 'text-green-400' },
        orange: { border: 'border-l-orange-500', bg: 'bg-orange-500/15', text: 'text-orange-400' },
        pink: { border: 'border-l-pink-500', bg: 'bg-pink-500/15', text: 'text-pink-400' },
        cyan: { border: 'border-l-cyan-500', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
      };
      return colors[accentColor] || colors.blue;
    };

    return (
      <aside
        data-tour="sidebar"
        className={`${sidebarWidth} transition-all duration-300 ease-in-out bg-gray-950 text-white flex flex-col shadow-2xl relative z-50`}
      >
        {/* Logo Section - Fixed height to align with header */}
        <div className="h-[73px] px-6 border-b border-gray-800 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="transition-opacity duration-200">
                <h2 className="text-lg font-bold text-white">A Data</h2>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              const isChatLink = link.name === 'Chat';
              const accentStyles = getAccentColor(link.accentColor, active);
              
              return (
                <button
                  key={link.name}
                  onClick={() => {
                    navigate(link.path);
                    if (isChatLink) clearChatBadge();
                  }}
                  title={link.name}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-r-lg transition-all group relative border-l-4 ${
                    active
                      ? `${accentStyles.border} ${accentStyles.bg} text-white`
                      : 'border-l-transparent text-gray-400 hover:bg-gray-900 hover:text-gray-200 hover:border-l-gray-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? accentStyles.text : link.color}`} />
                  {isSidebarOpen && <span className="text-sm">{link.name}</span>}
                  {isChatLink && chatUnreadCount > 0 && (
                    <span className={`absolute min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold bg-red-500 text-white ${
                      isSidebarOpen ? 'right-3' : 'top-0.5 right-0.5 scale-75'
                    }`}>
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-800">
          <div className={`flex items-center gap-2 p-2 rounded-lg bg-gray-900 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xs font-bold shadow-lg">
                {getUserInitials()}
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-gray-950"></div>
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-xs text-gray-500">Premium Account</p>
              </div>
            )}
          </div>
          <div className="mt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all border-l-4 border-transparent hover:border-l-red-500 text-sm"
            >
              <LogOut className="w-4 h-4" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    );
  };

  // ============================================
  // FLOATING CARDS SIDEBAR
  // ============================================
  const renderFloatingSidebar = () => (
    <aside
      data-tour="sidebar"
      className={`${sidebarWidth} transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col shadow-2xl relative z-50`}
    >
      {/* Logo Section - Fixed height to align with header */}
      <div className="h-[73px] px-5 border-b border-slate-800/50 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <div className="transition-opacity duration-200">
              <h2 className="text-lg font-bold text-white">A Data</h2>
              <p className="text-xs text-slate-500">Client Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
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
                title={link.name}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative ${
                  active
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl shadow-purple-500/30 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 hover:shadow-lg'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : link.color}`} />
                {isSidebarOpen && <span className="text-sm">{link.name}</span>}
                {isChatLink && chatUnreadCount > 0 && (
                  <span className={`absolute min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-xs font-bold ${
                    active ? 'bg-white text-purple-600' : 'bg-red-500 text-white'
                  } ${isSidebarOpen ? 'right-3' : 'top-0.5 right-0.5 scale-75'}`}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
                {active && isSidebarOpen && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-slate-800/50">
        <div className={`flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 shadow-lg ${!isSidebarOpen && 'justify-center'}`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-purple-500/20">
              {getUserInitials()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900 shadow-lg"></div>
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-slate-500">Premium Account</p>
            </div>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:shadow-lg transition-all duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      {/* CSS Animations */}
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
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInFromBottomRight {
          0% {
            transform: translateX(120%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-in.slide-in-from-right-full {
          animation: slideInFromRight 0.3s ease-out forwards;
        }
        
        .announcement-slide-in {
          animation: slideInFromBottomRight 0.6s ease-out forwards;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      {/* SIDEBAR - Rendered based on variant */}
      {renderSidebar()}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER - Fixed height to align with sidebar logo section */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-40 transition-colors duration-300 h-[73px] flex-shrink-0">
          <div className="flex items-center justify-between px-6 h-full">
            {/* Left Section */}
            <div className="flex items-center gap-4">
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title={isSidebarOpen ? "Close and lock sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? (
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {pageSubtitleTop && (
                    <div className="mb-1 text-gray-400 dark:text-gray-500">{pageSubtitleTop}</div>
                  )}
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                    {pageTitle || navLinks.find(link => isActive(link.path))?.name || 'Dashboard'}
                  </h1>
                  {pageSubtitleBottom && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{pageSubtitleBottom}</p>
                  )}
                  {isSidebarLocked && !pageSubtitleBottom && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Sidebar locked - Click arrow to open</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <ThemeToggle size="md" />

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Notifications */}
              <div className="relative" ref={notificationRef} data-tour="notifications">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) fetchNotifications();
                  }}
                  className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  title="Notifications"
                >
                  <Bell className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${unreadCount > 0 ? 'bell-ring' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1 shadow-md">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{unreadCount} unread messages</p>
                        </div>
                        <div className="flex gap-2">
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1" title="Mark all as read">
                              <CheckCheck className="w-4 h-4" />Mark all
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1" title="Clear all">
                              <Trash2 className="w-4 h-4" />Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {loading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading...</p>
                        </div>
                      ) : error ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-red-300 dark:text-red-400 mx-auto mb-3" />
                          <p className="text-red-500 dark:text-red-400 font-medium">Error loading notifications</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
                          <button onClick={fetchNotifications} className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Retry</button>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.notification_type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className={`font-semibold text-sm ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{notification.title}</h4>
                                  {!notification.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-500">{notification.time}</span>
                                  <div className="flex gap-2">
                                    {!notification.is_read && (
                                      <button onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1" title="Mark as read">
                                        <Check className="w-3 h-3" />Mark read
                                      </button>
                                    )}
                                    <button onClick={(e) => deleteNotification(notification.id, e)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1" title="Delete">
                                      <X className="w-3 h-3" />Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <button onClick={() => { navigate('/client/notifications'); setShowNotifications(false); }} className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={avatarMenuRef} data-tour="profile-menu">
                <button onClick={() => setShowAvatarMenu(!showAvatarMenu)} className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md ring-2 ring-white dark:ring-gray-700">{getUserInitials()}</div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{user?.full_name || user?.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Premium Account</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showAvatarMenu ? 'rotate-180' : ''}`} />
                </button>

                {showAvatarMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-lg font-bold text-white shadow-lg ring-2 ring-white/30">{getUserInitials()}</div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{user?.full_name || user?.username}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button onClick={() => { navigate('/client/reports'); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left group">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors"><FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-900 dark:text-white">My Reports</p><p className="text-xs text-gray-500 dark:text-gray-400">Access and manage your reports</p></div>
                      </button>
                      <button onClick={() => { navigate('/client/subscriptions'); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left group">
                        <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors"><CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-900 dark:text-white">My Subscriptions</p><p className="text-xs text-gray-500 dark:text-gray-400">Manage your subscriptions</p></div>
                      </button>
                      <button onClick={() => { navigate('/my-profile'); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left group">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors"><User className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-900 dark:text-white">My Profile</p><p className="text-xs text-gray-500 dark:text-gray-400">View and edit your profile</p></div>
                      </button>
                      <button onClick={() => { navigate('/profile-settings'); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left group">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors"><Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-900 dark:text-white">Profile Settings</p><p className="text-xs text-gray-500 dark:text-gray-400">Account preferences</p></div>
                      </button>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>

                    <div className="p-2">
                      <button onClick={() => { handleLogout(); setShowAvatarMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-left group">
                        <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors"><LogOut className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
                        <div className="flex-1"><p className="text-sm font-semibold text-red-600 dark:text-red-400">Logout</p><p className="text-xs text-red-400 dark:text-red-500">Sign out of your account</p></div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 shadow-sm transition-colors duration-300">
              <Breadcrumb items={breadcrumbs} showHome={true} />
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Announcement Slide-in Notification - Gradient Wave Style */}
      {showAnnouncementPopup && currentAnnouncement && (
        <div className="fixed bottom-6 right-6 z-50 announcement-slide-in">
          <div className="w-[380px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Gradient Header with Wave */}
            <div className="relative h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none">
                <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-white dark:fill-gray-800"/>
              </svg>
              
              {/* Close button */}
              <button 
                onClick={handleCloseAnnouncementPopup} 
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>

              {/* Floating icon */}
              <div className="absolute -bottom-5 left-5 w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 pt-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-md">NEW</span>
                <span className="text-xs text-gray-400">Just now</span>
              </div>
              
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {currentAnnouncement.title}
              </h3>
              
              {/* Content area */}
              {(currentAnnouncement.content || currentAnnouncement.summary) && (
                <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {currentAnnouncement.content || currentAnnouncement.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-2">
              <button 
                onClick={() => { navigate('/client/announcements'); handleCloseAnnouncementPopup(); }} 
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                View All
              </button>
              <button 
                onClick={handleCloseAnnouncementPopup} 
                className="flex-1 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all shadow-md"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingHelpButton onStartTour={handleStartTour} />
      <ProductTour steps={clientDashboardTourSteps} onComplete={handleTourComplete} />
    </div>
  );
};

export default ClientDashboardLayout;
